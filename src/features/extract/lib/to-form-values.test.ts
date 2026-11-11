import { describe, expect, it } from "vitest";

import { EMPTY_APPLICATION_FORM } from "@/features/board/schemas";

import {
  answeredFields,
  extractionRedFlags,
  extractionToFormValues,
  looksEmpty,
  salaryCanBePln,
} from "./to-form-values";

describe("salary currency guard", () => {
  const usd = { salaryMin: 3064, salaryMax: 3639 };

  it("drops a salary the model made from another currency", () => {
    const values = extractionToFormValues(usd, "21,41 - 25,42 USD Net per hour - B2B");
    expect([values.salaryMin, values.salaryMax]).toEqual(["", ""]);
  });

  it("keeps it when the offer gives an amount in złoty", () => {
    expect(extractionToFormValues(usd, "Opis strony: 80 - 95 PLN Net/h (b2b)").salaryMin).toBe(
      "3064",
    );
    expect(salaryCanBePln("16 000 - 22 000 zł netto, czyli ok. 4000 EUR")).toBe(true);
    expect(salaryCanBePln("Widełki: 16-22k B2B")).toBe(true); // no currency: Polish habit
    expect(salaryCanBePln("Złota 44, Warszawa, 5000 EUR")).toBe(false);
    expect(salaryCanBePln("$40-50/h, remote")).toBe(false);
  });
});

describe("extractionToFormValues", () => {
  it("returns the empty form before anything arrives", () => {
    expect(extractionToFormValues(undefined)).toEqual(EMPTY_APPLICATION_FORM);
  });

  it("maps a full extraction onto form strings", () => {
    expect(
      extractionToFormValues({
        company: " Kreska Software ",
        role: "Frontend Developer",
        seniority: "Mid",
        workMode: "hybrid",
        city: "Wrocław",
        salaryMin: 16000,
        salaryMax: 22000,
        stack: ["React", "TypeScript"],
        redFlags: ["x"],
      }),
    ).toEqual({
      ...EMPTY_APPLICATION_FORM,
      company: "Kreska Software",
      role: "Frontend Developer",
      seniority: "Mid",
      workMode: "hybrid",
      city: "Wrocław",
      salaryMin: "16000",
      salaryMax: "22000",
      stack: "React, TypeScript",
    });
  });

  it("rounds a salary computed from an hourly rate", () => {
    expect(extractionToFormValues({ salaryMin: 120 * 168.4 }).salaryMin).toBe("20208");
  });

  it("keeps a half-streamed value and leaves the rest empty", () => {
    const values = extractionToFormValues({ company: "Kreska Soft", stack: ["Rea"] });
    expect(values.company).toBe("Kreska Soft");
    expect(values.stack).toBe("Rea");
    expect(values.role).toBe("");
    expect(values.workMode).toBe("remote");
  });

  it("drops values the form would reject instead of guessing", () => {
    const values = extractionToFormValues({
      salaryMin: -5,
      salaryMax: 250_000,
      // @ts-expect-error: the model can return anything
      workMode: "moon",
      city: null,
      stack: ["React", "", "x".repeat(41), ...Array.from({ length: 20 }, (_, i) => `T${i}`)],
    });
    expect(values.salaryMin).toBe("");
    expect(values.salaryMax).toBe("");
    expect(values.workMode).toBe("remote");
    expect(values.city).toBe("");
    expect(String(values.stack).split(", ")).toHaveLength(12);
    expect(String(values.stack)).toMatch(/^React, T0, /);
  });
});

describe("answeredFields", () => {
  it("counts null as answered and missing keys as pending", () => {
    const answered = answeredFields({ company: "K", city: null });
    expect([...answered].sort()).toEqual(["city", "company"]);
  });
});

describe("extractionRedFlags", () => {
  it("keeps at most five non-empty warnings", () => {
    const flags = extractionRedFlags({ redFlags: ["a", " ", "b", "c", "d", "e", "f"] });
    expect(flags).toEqual(["a", "b", "c", "d", "e"]);
  });
});

describe("looksEmpty", () => {
  it("is true when neither company nor role was found", () => {
    expect(looksEmpty({ company: "", role: " ", stack: [] })).toBe(true);
    expect(looksEmpty({ company: "", role: "Frontend" })).toBe(false);
  });
});
