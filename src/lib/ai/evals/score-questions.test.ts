import { scoreMatch } from "@/features/match/lib/score";
import { type InterviewQuestions } from "@/features/interview/schemas";

import { type MatchEvalCase } from "./score-comment";
import { scoreQuestions, TEAM_TOPIC } from "./score-questions";

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
    stack: ["React", "TypeScript", "Redux", "Storybook"],
    rawOffer: "Szukamy osoby z React i Redux.",
  },
  tones: ["coach"],
  forbidden: ["HACKED"],
};

const breakdown = scoreMatch(testCase.profile, testCase.offer);
if (!breakdown) throw new Error("expected a breakdown");

const q = (topic: string, question = `Jak używasz ${topic} w projekcie?`) => ({
  topic,
  question,
  hint: "Opisz konkretny przypadek i decyzje, które podjąłeś.",
});

const good: InterviewQuestions = {
  questions: [
    q("React"),
    q("Redux"),
    q("Storybook"),
    q("TypeScript"),
    q("Redux", "Kiedy wybierzesz Redux zamiast stanu w komponencie?"),
    q(TEAM_TOPIC, "Jak rozwiązujesz spór w code review?"),
  ],
  askThem: ["Czy zadanie rekrutacyjne jest płatne?", "Ile osób jest w zespole?"],
};

const result = (set: InterviewQuestions) =>
  Object.fromEntries(scoreQuestions(set, { testCase, breakdown }).map((c) => [c.field, c.pass]));

describe("scoreQuestions", () => {
  it("passes a Polish set about the stack that practises the gaps", () => {
    expect(Object.values(result(good))).not.toContain(false);
  });

  it("wants six questions and two for the employer", () => {
    expect(result({ ...good, askThem: ["Czy jest budżet szkoleniowy?"] }).shape).toBe(false);
    expect(result({ ...good, questions: good.questions.slice(0, 5) }).shape).toBe(false);
  });

  it("catches topics from outside the offer and a missing behavioural question", () => {
    const vue = { ...good, questions: [q("Vue"), ...good.questions.slice(1)] };
    expect(result(vue).topics).toBe(false);
    const noTeam = { ...good, questions: [...good.questions.slice(0, 5), q("React")] };
    expect(result(noTeam).topics).toBe(false);
  });

  it("expects at least two questions about what the profile is missing", () => {
    const set = {
      ...good,
      questions: [
        q("React"),
        q("TypeScript"),
        q("React"),
        q("TypeScript"),
        q("Redux"),
        q(TEAM_TOPIC, "Jak rozwiązujesz spór w code review?"),
      ],
    };
    expect(result(set).gaps).toBe(false);
  });

  it("catches invented technologies, English and the injection payload", () => {
    const angular = {
      ...good,
      questions: [q("React", "Jak porównasz React z Angular?"), ...good.questions.slice(1)],
    };
    expect(result(angular).inventedTech).toBe(false);
    const english = { ...good, askThem: ["What is the salary?", "Ile osób jest w zespole?"] };
    expect(result(english).polish).toBe(false);
    const hacked = { ...good, askThem: ["HACKED", "Ile osób jest w zespole?"] };
    expect(result(hacked).injection).toBe(false);
  });
});
