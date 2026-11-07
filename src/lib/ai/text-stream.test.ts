// @vitest-environment node
import { Output, streamText } from "ai";
import { describe, expect, it, vi } from "vitest";

import { offerExtractionSchema } from "@/features/extract/schemas";

import { textStreamAfterFirstChunk } from "./text-stream";

vi.mock("server-only", () => ({}));
const { createDemoModel, DEMO_EXTRACTION } = await import("./demo-model");

type Part = { type: string; text?: string; error?: unknown };

const source = (parts: Part[]) =>
  new ReadableStream<Part>({
    start(controller) {
      for (const part of parts) controller.enqueue(part);
      controller.close();
    },
  });

async function readAll(stream: ReadableStream<string>) {
  let text = "";
  const reader = stream.getReader();
  for (let r = await reader.read(); !r.done; r = await reader.read()) text += r.value;
  return text;
}

describe("textStreamAfterFirstChunk", () => {
  it("streams the whole JSON of a real streamText call", async () => {
    const result = streamText({
      model: createDemoModel(),
      output: Output.object({ schema: offerExtractionSchema }),
      prompt: "offer",
    });
    const first = await textStreamAfterFirstChunk(result.stream);
    if (!first.ok) throw new Error("expected a stream");
    expect(JSON.parse(await readAll(first.stream))).toEqual(DEMO_EXTRACTION);
  });

  it("skips non-text parts between text parts", async () => {
    const first = await textStreamAfterFirstChunk(
      source([
        { type: "start" },
        { type: "text-delta", text: '{"a"' },
        { type: "finish-step" },
        { type: "start-step" },
        { type: "text-delta", text: ":1}" },
        { type: "finish" },
      ]),
    );
    if (!first.ok) throw new Error("expected a stream");
    expect(await readAll(first.stream)).toBe('{"a":1}');
  });

  it("reports an error that happens before any text", async () => {
    const boom = new Error("401 invalid key");
    const first = await textStreamAfterFirstChunk(
      source([{ type: "start" }, { type: "error", error: boom }]),
    );
    expect(first).toEqual({ ok: false, error: boom });
  });

  it("reports a stream that ends without text", async () => {
    const first = await textStreamAfterFirstChunk(source([{ type: "start" }, { type: "finish" }]));
    expect(first.ok).toBe(false);
  });

  it("ends early but keeps the text when the model fails mid-way", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const first = await textStreamAfterFirstChunk(
      source([
        { type: "text-delta", text: '{"company":"Kre' },
        { type: "error", error: new Error("overloaded") },
        { type: "text-delta", text: "never" },
      ]),
    );
    if (!first.ok) throw new Error("expected a stream");
    expect(await readAll(first.stream)).toBe('{"company":"Kre');
    spy.mockRestore();
  });

  it("fails a demo call that asks for a failure", async () => {
    const result = streamText({
      model: createDemoModel(),
      output: Output.object({ schema: offerExtractionSchema }),
      prompt: "offer [demo:fail]",
    });
    expect((await textStreamAfterFirstChunk(result.stream)).ok).toBe(false);
  });
});

describe("textStreamAfterFirstChunk cancel", () => {
  it("stops quietly when the client cancels while a read is pending", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    let sourceCancelled = false;
    const slow = new ReadableStream<Part>({
      start(controller) {
        controller.enqueue({ type: "text-delta", text: "{" });
      },
      cancel() {
        sourceCancelled = true;
      },
    });
    const first = await textStreamAfterFirstChunk(slow);
    if (!first.ok) throw new Error("expected a stream");
    const reader = first.stream.getReader();
    expect((await reader.read()).value).toBe("{");
    const pending = reader.read();
    await reader.cancel("user pressed stop");
    expect((await pending).done).toBe(true);
    expect(sourceCancelled).toBe(true); // the model call is cancelled too
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
