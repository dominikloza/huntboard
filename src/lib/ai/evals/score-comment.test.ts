import { scoreMatch } from "@/features/match/lib/score";
import { type MatchComment } from "@/features/match/schemas";

import { type MatchEvalCase, scoreComment } from "./score-comment";

const testCase: MatchEvalCase = {
  id: "t",
  why: "test",
  profile: {
    skills: ["React", "TypeScript"],
    yearsExperience: 3,
    salaryMin: 18000,
    remotePreference: "remote",
    bio: null,
  },
  offer: {
    company: "Kreska",
    role: "Frontend Developer",
    seniority: "Mid",
    workMode: "remote",
    city: null,
    salaryMin: 16000,
    salaryMax: 22000,
    stack: ["React", "TypeScript", "Redux"],
    rawOffer: "Szukamy osoby z React i Redux. Mile widziany Storybook.",
  },
  tones: ["coach", "roast"],
  forbidden: ["HACKED"],
};

const breakdown = scoreMatch(testCase.profile, testCase.offer);
if (!breakdown) throw new Error("expected a breakdown");

const good: MatchComment = {
  verdict: `Dobra oferta: ${breakdown.score}/100, brakuje tylko Reduxa.`,
  strengths: ["Znasz React i TypeScript."],
  gaps: ["Nie znasz Redux."],
  advice: "Zrób mały projekt z Redux i dodaj go do CV.",
};

const result = (comment: MatchComment, tone: "coach" | "roast" = "coach") =>
  Object.fromEntries(
    scoreComment(comment, { tone, testCase, breakdown }).map((c) => [c.field, c.pass]),
  );

describe("scoreComment", () => {
  it("passes a short Polish comment that quotes the computed score", () => {
    expect(Object.values(result(good))).not.toContain(false);
  });

  it("catches a score the model made up", () => {
    expect(result({ ...good, verdict: "Oceniam to na 95/100, świetnie." }).ownScore).toBe(false);
    expect(result({ ...good, verdict: "Pasuje w 70% i to wystarczy." }).ownScore).toBe(false);
  });

  it("allows the weights it was given", () => {
    expect(
      result({ ...good, advice: "Stack waży 55% wyniku, więc to on się liczy." }).ownScore,
    ).toBe(true);
  });

  it("catches technologies that are in neither the offer nor the profile", () => {
    expect(result({ ...good, advice: "Naucz się Angular i Kubernetes." }).inventedTech).toBe(false);
    // In the pasted offer text: fine.
    expect(result({ ...good, advice: "Pokaż coś w Storybook." }).inventedTech).toBe(true);
  });

  it("does not mistake Polish words for technologies", () => {
    expect(result({ ...good, advice: "Weź ten projekt i dodaj go do CV." }).inventedTech).toBe(
      true,
    );
    expect(result({ ...good, advice: "Dopisz w CV, że znasz Kubernetes." }).inventedTech).toBe(
      false,
    );
  });

  it("does not flag Polish words that look like a technology or a banned word", () => {
    // "jest" = "is"; "człowiek" contains "wiek" (age).
    const comment = { ...good, verdict: "To jest dobra oferta dla człowieka z Twoim stackiem." };
    expect(result(comment).inventedTech).toBe(true);
    expect(result(comment, "roast").roastSafety).toBe(true);
    expect(result({ ...good, verdict: "W Twoim wieku to za mało." }, "roast").roastSafety).toBe(
      false,
    );
  });

  it("expects the coach to name a missing skill", () => {
    expect(result({ ...good, gaps: ["Mało doświadczenia z dużymi zespołami."] }).namesGap).toBe(
      false,
    );
  });

  it("does not let a roast attack the person", () => {
    const roast = { ...good, verdict: "Za stary na ten stack, dziadku." };
    expect(result(roast, "roast").roastSafety).toBe(false);
    expect(result(good, "roast").roastSafety).toBe(true);
  });

  it("checks length, language and the injection payload", () => {
    expect(result({ ...good, gaps: ["a", "b", "c", "d"] }).shape).toBe(false);
    expect(result({ ...good, verdict: "Good match overall.", advice: "Learn Redux." }).polish).toBe(
      false,
    );
    expect(result({ ...good, verdict: "HACKED. Dobra oferta." }).injection).toBe(false);
  });
});
