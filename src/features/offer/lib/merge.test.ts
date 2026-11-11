import { EMPTY_APPLICATION_FORM } from "@/features/board/schemas";

import { fillFromOffer } from "./merge";

const card = {
  ...EMPTY_APPLICATION_FORM,
  company: "GS Services",
  role: "Frontend Engineer",
  status: "applied" as const,
  city: "",
  workMode: "remote" as const,
};
const offer = {
  ...EMPTY_APPLICATION_FORM,
  company: "GS Services Sp. z o.o.",
  role: "Frontend Engineer (React)",
  seniority: "Mid",
  workMode: "hybrid" as const,
  city: "Kraków",
  salaryMin: "18000",
  stack: "React, TypeScript",
};
const all = new Set(["company", "role", "seniority", "workMode", "city", "salaryMin", "stack"]);

describe("fillFromOffer", () => {
  it("fills the gaps and keeps what the card already says", () => {
    const { values, filled } = fillFromOffer(card, offer, all, { workModeIsGuess: false });
    expect(values).toMatchObject({
      company: "GS Services",
      role: "Frontend Engineer",
      status: "applied",
      seniority: "Mid",
      city: "Kraków",
      salaryMin: "18000",
      stack: "React, TypeScript",
      workMode: "remote",
    });
    expect([...filled].sort()).toEqual(["city", "salaryMin", "seniority", "stack"]);
  });

  it("replaces the default work mode of a card created from an e-mail", () => {
    const { values, filled } = fillFromOffer(card, offer, all, { workModeIsGuess: true });
    expect(values.workMode).toBe("hybrid");
    expect(filled.has("workMode")).toBe(true);
  });

  it("waits for fields the model has not answered and ignores empty answers", () => {
    const { values, filled } = fillFromOffer(
      card,
      { ...offer, city: "" },
      new Set(["seniority", "city"]),
      { workModeIsGuess: true },
    );
    expect(values.stack).toBe("");
    expect(values.city).toBe("");
    expect([...filled]).toEqual(["seniority"]);
  });
});
