import { describe, expect, it } from "vitest";

import { levelOf, type MatchOffer, type MatchProfile, scoreMatch } from "./score";

const profile: MatchProfile = {
  skills: ["React", "TypeScript", "Next.js", "Tailwind CSS"],
  yearsExperience: 3,
  salaryMin: 18000,
  remotePreference: "remote",
};

const offer: MatchOffer = {
  stack: ["React", "TypeScript", "Next.js"],
  salaryMin: 16000,
  salaryMax: 22000,
  workMode: "remote",
  seniority: "Mid",
};

const partScore = (o: MatchOffer, p: MatchProfile = profile) =>
  Object.fromEntries((scoreMatch(p, o)?.parts ?? []).map((part) => [part.key, part.score]));

describe("scoreMatch", () => {
  it("gives 100 for an offer that fits on every count", () => {
    const result = scoreMatch(profile, offer);
    expect(result?.score).toBe(100);
    expect(result?.missingSkills).toEqual([]);
  });

  it("returns null until the profile has skills", () => {
    expect(scoreMatch(null, offer)).toBeNull();
    expect(scoreMatch({ ...profile, skills: [] }, offer)).toBeNull();
  });

  it("weights the first three technologies double", () => {
    const topMiss = partScore({ ...offer, stack: ["Angular", "React", "TypeScript", "Jest"] });
    const tailMiss = partScore({ ...offer, stack: ["React", "TypeScript", "Next.js", "Jest"] });
    expect(topMiss.stack).toBeLessThan(tailMiss.stack ?? 0);
  });

  it("does not treat React as React Native", () => {
    expect(scoreMatch(profile, { ...offer, stack: ["React Native"] })?.missingSkills).toEqual([
      "React Native",
    ]);
  });

  it("matches technologies however they are spelled", () => {
    const result = scoreMatch({ ...profile, skills: ["react", "Typescript", "NextJS"] }, offer);
    expect(result?.missingSkills).toEqual([]);
  });

  it("scores salary by the top of the range against your minimum", () => {
    expect(partScore({ ...offer, salaryMax: 18000 }).salary).toBe(1);
    expect(partScore({ ...offer, salaryMin: 9000, salaryMax: 15300 }).salary).toBeCloseTo(0.5);
    expect(partScore({ ...offer, salaryMin: 9000, salaryMax: 12000 }).salary).toBe(0);
    expect(partScore({ ...offer, salaryMin: null, salaryMax: null }).salary).toBe(0.6);
  });

  it("scores the work mode against the preference", () => {
    expect(partScore({ ...offer, workMode: "hybrid" }).workMode).toBe(0.5);
    expect(partScore({ ...offer, workMode: "office" }).workMode).toBe(0);
    expect(
      partScore({ ...offer, workMode: "office" }, { ...profile, remotePreference: "any" }).workMode,
    ).toBe(1);
  });

  it("compares the level with years of experience", () => {
    expect(partScore({ ...offer, seniority: "Senior" }).seniority).toBe(0.5);
    expect(partScore({ ...offer, seniority: "Lead" }).seniority).toBe(0);
    expect(partScore({ ...offer, seniority: null }).seniority).toBe(0.6);
  });

  it("explains every part in Polish", () => {
    const result = scoreMatch(profile, { ...offer, stack: ["React", "Vue"], workMode: "office" });
    const summaries = Object.fromEntries((result?.parts ?? []).map((p) => [p.key, p.summary]));
    expect(summaries.stack).toBe("Znasz 1 z 2. Brakuje: Vue.");
    expect(summaries.workMode).toBe("Praca stacjonarna, a wolisz zdalną.");
    expect(summaries.salary).toBe("Do 22 000 zł, Twoje minimum to 18 000 zł.");
  });
});

describe("levelOf", () => {
  it.each([
    ["Junior", 0],
    ["Regular", 1],
    ["Mid / Senior", 1],
    ["Senior", 2],
    ["Tech Lead", 3],
    ["Principal Engineer", 3],
    [null, null],
    ["Specjalista", null],
  ] as const)("%s -> %s", (input, level) => {
    expect(levelOf(input)).toBe(level);
  });
});
