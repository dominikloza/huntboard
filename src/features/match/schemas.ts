import { z } from "zod";

import { applicationIdSchema } from "@/features/board/schemas";

export const MATCH_TONES = ["coach", "roast"] as const;
export type MatchTone = (typeof MATCH_TONES)[number];

/** POST /api/match */
export const matchRequestSchema = z.object({
  applicationId: applicationIdSchema,
  tone: z.enum(MATCH_TONES),
});

/**
 * What the model writes about a match. The score is NOT here: it is computed in code
 * (scoreMatch) and the model only comments on it. All keys required (strict structured output).
 */
export const matchCommentSchema = z.object({
  verdict: z.string().describe("One or two sentences: the overall verdict, in Polish."),
  strengths: z.array(z.string()).describe("Up to 3 concrete strengths of this match, in Polish."),
  gaps: z.array(z.string()).describe("Up to 3 concrete gaps or risks, in Polish."),
  advice: z.string().describe("One concrete next step for the candidate, in Polish."),
});

export type MatchComment = z.infer<typeof matchCommentSchema>;

/** Saved with the card: the comment plus what it was based on. */
export type StoredMatchComment = MatchComment & {
  score: number;
  model: string;
  createdAt: string;
};
