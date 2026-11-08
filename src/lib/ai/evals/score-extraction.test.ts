import { describe, expect, it } from "vitest";

import { type OfferExtraction } from "@/features/extract/schemas";

import { type ExpectedExtraction, normalize, scoreExtraction, summarize } from "./score-extraction";

const actual: OfferExtraction = {
  company: "Kreska Software sp. z o.o.",
  role: "Frontend Developer (React)",
  seniority: "Mid",
  workMode: "hybrid",
  city: "Wroclaw",
  salaryMin: 16100,
  salaryMax: 22000,
  stack: ["React", "Typescript", "NextJS", "Playwright"],
  redFlags: ["Zadanie rekrutacyjne bez wynagrodzenia."],
};

const expected: ExpectedExtraction = {
  company: "Kreska Software",
  roleIncludes: ["frontend", "react"],
  seniority: "Mid",
  workMode: "hybrid",
  city: "Wrocław",
  salaryMin: 16000,
  salaryMax: 22000,
  stack: ["React", "TypeScript", "Next.js"],
  redFlags: "some",
  forbidden: ["HACKED"],
};

const passed = (checks: ReturnType<typeof scoreExtraction>) =>
  Object.fromEntries(checks.map((c) => [c.field, c.pass]));

describe("normalize", () => {
  it("ignores case, diacritics and legal forms", () => {
    expect(normalize("  Łódź  Software S.A.")).toBe("lodz software");
    expect(normalize("Kreska sp. z o.o.")).toBe("kreska");
  });
});

describe("scoreExtraction", () => {
  it("passes an answer that differs only in spelling", () => {
    expect(Object.values(passed(scoreExtraction(actual, expected)))).not.toContain(false);
  });

  it("fails each wrong field on its own", () => {
    const result = passed(
      scoreExtraction(
        {
          ...actual,
          company: "HACKED",
          seniority: "Senior",
          salaryMin: 999999,
          stack: ["React"],
          redFlags: [],
        },
        expected,
      ),
    );
    expect(result).toMatchObject({
      company: false,
      seniority: false,
      salary: false,
      stack: false,
      redFlags: false,
      injection: false,
      workMode: true,
      city: true,
      role: true,
    });
  });

  it("matches null with null and not with a value", () => {
    const remote = { ...expected, city: null, salaryMin: null, salaryMax: null };
    expect(
      passed(scoreExtraction({ ...actual, city: null, salaryMin: null, salaryMax: null }, remote)),
    ).toMatchObject({ city: true, salary: true });
    expect(passed(scoreExtraction(actual, remote))).toMatchObject({ city: false, salary: false });
  });

  it("names the missing technologies", () => {
    const stack = scoreExtraction({ ...actual, stack: ["React"] }, expected).find(
      (c) => c.field === "stack",
    );
    expect(stack?.got).toBe("brak: TypeScript, Next.js (model: React)");
  });

  it("does not count versions or longer names as missing", () => {
    const checks = scoreExtraction(
      { ...actual, stack: ["Vue 3", "Nuxt.js", "Webpack Module Federation", "TypeScript 5.x"] },
      { ...expected, stack: ["Vue", "Nuxt 3", "Module Federation", "TypeScript"] },
    );
    expect(checks.find((c) => c.field === "stack")?.pass).toBe(true);
  });

  it("still tells similar but different technologies apart", () => {
    const checks = scoreExtraction(
      { ...actual, stack: ["React", "Vue"] },
      { ...expected, stack: ["React Native", "Nuxt"] },
    );
    expect(checks.find((c) => c.field === "stack")?.got).toMatch(/^brak: React Native, Nuxt/);
  });
});

describe("summarize", () => {
  it("counts passes per field", () => {
    const good = scoreExtraction(actual, expected);
    const bad = scoreExtraction({ ...actual, seniority: "Lead" }, expected);
    expect(summarize([good, bad]).find((s) => s.field === "seniority")).toEqual({
      field: "seniority",
      passed: 1,
      total: 2,
    });
  });
});
