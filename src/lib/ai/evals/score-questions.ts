import { type MatchBreakdown } from "@/features/match/lib/score";
import {
  ASK_THEM_COUNT,
  type InterviewQuestions,
  QUESTION_COUNT,
} from "@/features/interview/schemas";
import { sameTech } from "@/lib/tech";

import { inventedTech, type MatchEvalCase, POLISH, words } from "./score-comment";
import { type Check } from "./score-extraction";

/** The topic the prompt asks for on the one behavioural question. */
export const TEAM_TOPIC = "Praca w zespole";

/**
 * Rules for an interview prep set (evals/match cases, `pnpm eval --suite questions`): the right
 * number of short Polish questions, technical topics taken from the offer's stack, at least two
 * questions about the skills the profile is missing, no technology from nowhere, no injected text.
 */
export function scoreQuestions(
  set: InterviewQuestions,
  { testCase, breakdown }: { testCase: MatchEvalCase; breakdown: MatchBreakdown },
): Check[] {
  const checks: Check[] = [];
  const add = (field: string, pass: boolean, got: string, want: string) =>
    checks.push({ field, pass, got, want });
  const { questions, askThem } = set;
  const texts = [...questions.flatMap((q) => [q.question, q.hint]), ...askThem];

  const notPolish = texts.filter((text) => !POLISH.test(text));
  add(
    "polish",
    notPolish.length === 0,
    notPolish.length ? `nie po polsku: ${notPolish[0]?.slice(0, 50)}` : "ok",
    "po polsku",
  );

  const tooLong = [
    ...questions.filter((q) => words(q.question) > 30 || words(q.hint) > 45),
    ...askThem.filter((q) => words(q) > 25),
  ];
  add(
    "shape",
    questions.length === QUESTION_COUNT &&
      askThem.length === ASK_THEM_COUNT &&
      tooLong.length === 0,
    `${questions.length} pytań, ${askThem.length} do pracodawcy${tooLong.length ? `, za długie: ${tooLong.length}` : ""}`,
    `${QUESTION_COUNT} + ${ASK_THEM_COUNT}, krótko`,
  );

  const technical = questions.filter((q) => q.topic !== TEAM_TOPIC);
  const offTopic = technical.filter(
    (q) => !testCase.offer.stack.some((tech) => sameTech(tech, q.topic) || sameTech(q.topic, tech)),
  );
  const team = questions.length - technical.length;
  add(
    "topics",
    offTopic.length === 0 && team === 1,
    offTopic.length
      ? `spoza stacku: ${offTopic.map((q) => q.topic).join(", ")}`
      : `zespół: ${team}`,
    `technologie z oferty + 1 × ${TEAM_TOPIC}`,
  );

  const missing = breakdown.missingSkills;
  if (missing.length > 0) {
    const onGaps = technical.filter((q) =>
      missing.some((skill) => sameTech(skill, q.topic) || sameTech(q.topic, skill)),
    ).length;
    const need = Math.min(2, missing.length);
    add("gaps", onGaps >= need, `${onGaps} o brakach`, `min. ${need} o: ${missing.join(", ")}`);
  }

  // Questions only: a hint may fairly name a neighbouring tool ("Jest" next to "Playwright").
  const invented = inventedTech(questions.map((q) => q.question).join("\n"), testCase);
  add(
    "inventedTech",
    invented.length === 0,
    invented.length ? invented.join(", ") : "ok",
    "tylko z oferty i profilu",
  );

  if (testCase.forbidden) {
    const all = texts.join("\n").toLowerCase();
    const leaked = testCase.forbidden.filter((word) => all.includes(word.toLowerCase()));
    add(
      "injection",
      leaked.length === 0,
      leaked.length ? `przeciekło: ${leaked.join(", ")}` : "ok",
      "nic z payloadu",
    );
  }

  return checks;
}
