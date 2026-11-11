/**
 * `pnpm eval`: runs the AI eval suites against the configured model (AI_PROVIDER from
 * .env.local), scores every answer with rules in code and writes evals/report.md.
 *
 *   pnpm eval                    all suites (extraction, match comments, questions, mail)
 *   pnpm eval --suite extract    offer extraction only (evals/extract)
 *   pnpm eval --suite match      coach and roast comments only (evals/match)
 *   pnpm eval --suite questions  interview prep for the same cases (evals/match)
 *   pnpm eval --suite mail       recruitment e-mails: rules first, the AI for the rest (evals/mail)
 *   pnpm eval --only 08          cases whose file name or id contains "08"
 *   pnpm eval --min 0.85         exit with code 1 below 85% passed checks (for CI)
 *   pnpm eval --rpm 30           requests per minute (default 12: Gemini's free tier allows 15)
 *
 * Calls are spaced to stay under the rate limit; a 429 or 503 from the provider is retried after
 * the delay it asks for, so a temporary overload does not count as a wrong answer.
 *
 * Uses the same prompts, schemas and settings as the app, so the numbers describe what users
 * get. Costs real tokens with a real provider (about 20 small calls; free on Gemini's free tier).
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

import { loadEnvConfig } from "@next/env";
import { format, resolveConfig } from "prettier";

import { streamOfferExtraction } from "@/features/extract/server/stream-extraction";
import { streamInterviewQuestions } from "@/features/interview/server/stream-questions";
import { readKnownSender } from "@/features/mail/lib/known-senders";
import { mailCasesSchema } from "@/features/mail/lib/mail-cases";
import { plainMailText, sanitizeReading } from "@/features/mail/lib/sanitize";
import { streamMailReadings } from "@/features/mail/server/read-mail";
import { scoreMatch } from "@/features/match/lib/score";
import { type MatchTone } from "@/features/match/schemas";
import { streamMatchComment } from "@/features/match/server/stream-comment";
import { matchEvalCasesSchema, scoreComment } from "@/lib/ai/evals/score-comment";
import {
  type Check,
  evalCasesSchema,
  scoreExtraction,
  summarize,
} from "@/lib/ai/evals/score-extraction";
import { createPacer, retryAfterMs, sleep } from "@/lib/ai/evals/retry";
import { scoreMailReading } from "@/lib/ai/evals/score-mail";
import { scoreQuestions } from "@/lib/ai/evals/score-questions";
import { getModel, modelLabel } from "@/lib/ai/model";

loadEnvConfig(process.cwd(), true);

const EVALS = path.join(process.cwd(), "evals");
const REPORT = path.join(EVALS, "report.md");

type Model = ReturnType<typeof getModel>;
type CaseResult = {
  name: string;
  why: string;
  checks: Check[];
  error?: string;
  ms: number;
  tokens: number;
};
type Suite = { title: string; source: string; results: CaseResult[] };

let pace: () => Promise<void> = async () => {};

/** Runs one model call (with retries), times it and turns a final error into a reported one. */
async function measure(
  name: string,
  why: string,
  run: (onError: (error: unknown) => void) => Promise<{ checks: Check[]; tokens: number }>,
): Promise<CaseResult> {
  const started = performance.now();
  for (let attempt = 1; ; attempt++) {
    await pace();
    let streamError: unknown;
    try {
      const { checks, tokens } = await run((error) => (streamError = error));
      return { name, why, checks, tokens, ms: performance.now() - started };
    } catch (error) {
      const cause = streamError ?? error;
      const wait = attempt < 4 ? retryAfterMs(cause) : null;
      if (wait !== null) {
        console.log(`wait ${name}: provider busy, retrying in ${Math.round(wait / 1000)} s`);
        await sleep(wait);
        continue;
      }
      const message = (cause instanceof Error ? cause.message : String(cause)).split("\n")[0];
      return { name, why, checks: [], tokens: 0, error: message, ms: performance.now() - started };
    }
  }
}

const tokensOf = (usage: { inputTokens?: number; outputTokens?: number }) =>
  (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0);

async function extractSuite(model: Model, only?: string): Promise<Suite> {
  const dir = path.join(EVALS, "extract");
  const cases = evalCasesSchema
    .parse(JSON.parse(await readFile(path.join(dir, "cases.json"), "utf8")))
    .filter((c) => !only || c.file.includes(only));

  const results = await mapWithLimit(cases, 2, async (c) => {
    const offer = await readFile(path.join(dir, c.file), "utf8");
    return log(
      await measure(c.file.replace(/\.txt$/, ""), c.why, async (onError) => {
        const result = streamOfferExtraction({ model, offer, onError });
        const [output, usage] = await Promise.all([result.output, result.totalUsage]);
        return { checks: scoreExtraction(output, c.expected), tokens: tokensOf(usage) };
      }),
    );
  });
  return { title: "Offer extraction", source: "evals/extract/", results };
}

async function matchSuite(model: Model, only?: string): Promise<Suite> {
  const cases = matchEvalCasesSchema
    .parse(JSON.parse(await readFile(path.join(EVALS, "match", "cases.json"), "utf8")))
    .filter((c) => !only || c.id.includes(only));
  const runs = cases.flatMap((c) => c.tones.map((tone) => ({ c, tone })));

  const results = await mapWithLimit(
    runs,
    2,
    async ({ c, tone }: { c: (typeof cases)[number]; tone: MatchTone }) => {
      const breakdown = scoreMatch(c.profile, c.offer);
      if (!breakdown) throw new Error(`Case ${c.id}: the profile needs skills`);
      return log(
        await measure(`${c.id} (${tone})`, c.why, async (onError) => {
          const result = streamMatchComment({
            model,
            tone,
            input: { profile: c.profile, offer: c.offer, breakdown },
            onError,
          });
          const [output, usage] = await Promise.all([result.output, result.totalUsage]);
          return {
            checks: scoreComment(output, { tone, testCase: c, breakdown }),
            tokens: tokensOf(usage),
          };
        }),
      );
    },
  );
  return { title: "Match comments (coach and roast)", source: "evals/match/", results };
}

async function questionsSuite(model: Model, only?: string): Promise<Suite> {
  const cases = matchEvalCasesSchema
    .parse(JSON.parse(await readFile(path.join(EVALS, "match", "cases.json"), "utf8")))
    .filter((c) => !only || c.id.includes(only));

  const results = await mapWithLimit(cases, 2, async (c) => {
    const breakdown = scoreMatch(c.profile, c.offer);
    if (!breakdown) throw new Error(`Case ${c.id}: the profile needs skills`);
    return log(
      await measure(c.id, c.why, async (onError) => {
        const result = streamInterviewQuestions({
          model,
          input: {
            offer: c.offer,
            focus: { skills: c.profile.skills, missingSkills: breakdown.missingSkills },
          },
          onError,
        });
        const [output, usage] = await Promise.all([result.output, result.totalUsage]);
        return {
          checks: scoreQuestions(output, { testCase: c, breakdown }),
          tokens: tokensOf(usage),
        };
      }),
    );
  });
  return { title: "Interview questions", source: "evals/match/", results };
}

/** Same path as /api/mail/messages: known senders by rules, the rest in one AI call. */
async function mailSuite(model: Model, only?: string): Promise<Suite> {
  const cases = mailCasesSchema
    .parse(JSON.parse(await readFile(path.join(EVALS, "mail", "cases.json"), "utf8")))
    .filter((c) => !only || c.id.includes(only));

  const results: CaseResult[] = [];
  const forAi = cases.filter((c) => !readKnownSender(c));
  for (const c of cases) {
    const known = readKnownSender(c);
    if (known) {
      results.push(
        log({
          name: `${c.id} (reguły)`,
          why: c.why,
          checks: scoreMailReading(sanitizeReading(known), c),
          ms: 0,
          tokens: 0,
        }),
      );
    }
  }

  let readings = new Map<number, Parameters<typeof scoreMailReading>[0]>();
  const batch = await measure(
    "mail-batch",
    "one AI call for the e-mails rules do not know",
    async (onError) => {
      const result = streamMailReadings({
        model,
        mails: forAi.map((c, index) => ({
          index,
          from: c.from,
          subject: c.subject,
          body: plainMailText(c.body),
        })),
        onError,
      });
      const [output, usage] = await Promise.all([result.output, result.totalUsage]);
      readings = new Map(output.results.map((r) => [r.index, sanitizeReading(r)]));
      return { checks: [], tokens: tokensOf(usage) };
    },
  );
  forAi.forEach((c, index) => {
    const reading = readings.get(index);
    results.push(
      log(
        reading
          ? {
              name: `${c.id} (AI)`,
              why: c.why,
              checks: scoreMailReading(reading, c),
              ms: batch.ms,
              tokens: 0,
            }
          : {
              name: `${c.id} (AI)`,
              why: c.why,
              checks: [],
              ms: batch.ms,
              tokens: 0,
              error: batch.error ?? "brak wyniku",
            },
      ),
    );
  });
  if (results[0]) results[0].tokens = batch.tokens;
  return { title: "Recruitment e-mails", source: "evals/mail/", results };
}

function log(r: CaseResult): CaseResult {
  const failed = r.checks.filter((check) => !check.pass).map((check) => check.field);
  console.log(
    `${r.error ? "ERR " : failed.length ? "FAIL" : "ok  "} ${r.name}` +
      (r.error ? `  ${r.error}` : failed.length ? `  (${failed.join(", ")})` : ""),
  );
  return r;
}

const pct = (passed: number, total: number) =>
  total === 0 ? "-" : `${Math.round((passed / total) * 100)}%`;

const totals = (results: CaseResult[]) => {
  const stats = summarize(results.map((r) => r.checks));
  return {
    stats,
    passed: stats.reduce((sum, s) => sum + s.passed, 0),
    total: stats.reduce((sum, s) => sum + s.total, 0),
  };
};

function suiteMarkdown({ title, source, results }: Suite): string[] {
  const { stats, passed, total } = totals(results);
  const errors = results.filter((r) => r.error).length;
  const tokens = results.reduce((sum, r) => sum + r.tokens, 0);
  const avgMs = results.reduce((sum, r) => sum + r.ms, 0) / Math.max(1, results.length);
  return [
    `## ${title}`,
    "",
    `${results.length} cases · ${errors} errors · ${tokens} tokens · ` +
      `${(avgMs / 1000).toFixed(1)} s per case · **${pct(passed, total)} of checks passed** ` +
      `(${passed}/${total}). Cases: \`${source}\`.`,
    "",
    "| Check | Passed |",
    "| --- | --- |",
    ...stats.map((s) => `| ${s.field} | ${pct(s.passed, s.total)} (${s.passed}/${s.total}) |`),
    "",
    "| Case | What it tests | Result |",
    "| --- | --- | --- |",
    ...results.map((r) => {
      const failed = r.checks.filter((c) => !c.pass);
      const result = r.error
        ? `error: ${r.error}`
        : failed.length === 0
          ? "ok"
          : failed.map((c) => `${c.field}: got ${c.got}, want ${c.want}`).join("<br>");
      return `| ${r.name} | ${r.why} | ${result.replace(/\|/g, "\\|")} |`;
    }),
    "",
  ];
}

/** Run with a small pool: free tiers allow only a few requests per minute. */
async function mapWithLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>) {
  const results: R[] = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        const item = items[index];
        if (item !== undefined) results[index] = await fn(item);
      }
    }),
  );
  return results;
}

async function main() {
  const { values } = parseArgs({
    options: {
      suite: { type: "string" },
      only: { type: "string" },
      min: { type: "string" },
      rpm: { type: "string" },
    },
    allowPositionals: true, // pnpm may pass a literal "--" through
  });
  const which = values.suite ?? "all";
  if (!["all", "extract", "match", "questions", "mail"].includes(which)) {
    throw new Error(
      `Unknown suite "${which}". Use extract, match, questions, mail or leave it out.`,
    );
  }

  const rpm = Number(values.rpm ?? process.env.EVAL_RPM ?? 12);
  if (!(rpm > 0)) throw new Error("--rpm must be a positive number.");
  pace = createPacer(60_000 / rpm);

  const model = getModel();
  const label = modelLabel(model);
  console.log(`Model: ${label} · up to ${rpm} requests per minute`);

  const suites: Suite[] = [];
  const run = (suite: string) => which === "all" || which === suite;
  if (run("extract")) suites.push(await extractSuite(model, values.only));
  if (run("match")) suites.push(await matchSuite(model, values.only));
  if (run("questions")) suites.push(await questionsSuite(model, values.only));
  if (run("mail")) suites.push(await mailSuite(model, values.only));

  const all = totals(suites.flatMap((s) => s.results));
  const summary = `**Overall: ${pct(all.passed, all.total)} of checks passed** (${all.passed}/${all.total}).`;
  const markdown = [
    "# AI evals",
    "",
    `Model: \`${label}\` · ${new Date().toISOString().slice(0, 10)} · ${summary}`,
    "",
    ...suites.flatMap(suiteMarkdown),
    "Generated by `pnpm eval`. Every check is a rule in code (`src/lib/ai/evals`), not a second model.",
    "",
  ].join("\n");

  // Same formatting as `pnpm format`, so the committed report passes `format:check` in CI.
  const options = (await resolveConfig(REPORT)) ?? {};
  await writeFile(REPORT, await format(markdown, { ...options, filepath: REPORT }));
  console.log(`\n${summary}\nReport: evals/report.md`);

  const min = values.min ? Number(values.min) : undefined;
  if (min !== undefined && all.total > 0 && all.passed / all.total < min) {
    console.error(`Below the required ${Math.round(min * 100)}%.`);
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
