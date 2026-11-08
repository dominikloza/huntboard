// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { OFFER_MAX_LENGTH } from "@/features/board/constants";

import { evalCasesSchema } from "./score-extraction";

const DIR = path.join(process.cwd(), "evals", "extract");

describe("eval cases (evals/extract)", () => {
  const cases = evalCasesSchema.parse(
    JSON.parse(readFileSync(path.join(DIR, "cases.json"), "utf8")),
  );

  it("has a file for every case and a case for every file", () => {
    for (const c of cases) expect(existsSync(path.join(DIR, c.file)), c.file).toBe(true);
    expect(new Set(cases.map((c) => c.file)).size).toBe(cases.length);
  });

  it("keeps every offer within the length the app accepts", () => {
    for (const c of cases) {
      const length = readFileSync(path.join(DIR, c.file), "utf8").trim().length;
      expect(length, c.file).toBeLessThanOrEqual(OFFER_MAX_LENGTH);
    }
  });

  it("covers prompt injection", () => {
    expect(cases.some((c) => (c.expected.forbidden ?? []).length > 0)).toBe(true);
  });
});
