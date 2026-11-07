/** The parts of `streamText(...).stream` this helper looks at. */
type StreamPart =
  { type: "text-delta"; text: string } | { type: "error"; error: unknown } | { type: string };

export type FirstChunk =
  { ok: true; stream: ReadableStream<string> } | { ok: false; error: unknown };

/**
 * Turns the model's full stream into a plain text stream, but only after the first text
 * arrives. If the provider fails before that (bad key, quota, outage), we can still answer
 * with a proper HTTP error instead of a 200 with an empty body.
 *
 * Errors after the first text end the stream early; the client sees an incomplete object
 * and keeps what it already has.
 */
export async function textStreamAfterFirstChunk(
  source: ReadableStream<StreamPart>,
): Promise<FirstChunk> {
  const reader = source.getReader();
  let first: string | undefined;

  try {
    while (first === undefined) {
      const { done, value } = await reader.read();
      if (done) return { ok: false, error: new Error("The model returned no text") };
      if (value.type === "error" && "error" in value) {
        void reader.cancel();
        return { ok: false, error: value.error };
      }
      if (value.type === "text-delta" && "text" in value && value.text) first = value.text;
    }
  } catch (error) {
    return { ok: false, error };
  }

  const head = first;
  // Set when the client goes away (e.g. "Stop"): the pending read then ends, and the
  // controller must not be touched any more.
  let cancelled = false;
  return {
    ok: true,
    stream: new ReadableStream<string>({
      start(controller) {
        controller.enqueue(head);
      },
      // A pull must enqueue or close before returning, otherwise the stream stalls: skip
      // non-text parts (step markers, finish) inside the loop.
      async pull(controller) {
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (cancelled) return;
            if (done) return controller.close();
            if (value.type === "text-delta" && "text" in value && value.text) {
              return controller.enqueue(value.text);
            }
            if (value.type === "error" && "error" in value) {
              console.error("AI stream failed mid-way", value.error);
              controller.close();
              return void reader.cancel();
            }
          }
        } catch (error) {
          if (cancelled) return;
          console.error("AI stream failed mid-way", error);
          controller.close();
        }
      },
      cancel(reason) {
        cancelled = true;
        return reader.cancel(reason);
      },
    }),
  };
}
