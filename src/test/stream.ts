/**
 * Test helpers for components that read AI streams (useObject): a fetch that answers with a text
 * stream split into small chunks, the way /api/extract and /api/match do.
 */
export function streamedResponse(text: string, { chunkSize = 7 } = {}): Response {
  const encoder = new TextEncoder();
  const chunks = text.match(new RegExp(`[\\s\\S]{1,${chunkSize}}`, "g")) ?? [];
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const next = chunks.shift();
      if (next === undefined) return controller.close();
      await new Promise((resolve) => setTimeout(resolve, 1));
      controller.enqueue(encoder.encode(next));
    },
  });
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

export const textErrorResponse = (message: string, status: number) =>
  new Response(message, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });

/** The JSON body of the n-th call to a mocked fetch. */
export function requestBody(fetchMock: { mock: { calls: unknown[][] } }, n = 0): unknown {
  const init = fetchMock.mock.calls[n]?.[1] as RequestInit | undefined;
  return JSON.parse(String(init?.body));
}
