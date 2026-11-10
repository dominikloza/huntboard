import { z } from "zod";

import { applicationIdSchema } from "@/features/board/schemas";

/** POST /api/questions */
export const questionsRequestSchema = z.object({ applicationId: applicationIdSchema });

export const QUESTION_COUNT = 6;
export const ASK_THEM_COUNT = 2;

/**
 * Interview prep for one offer: flashcards the candidate can practise with, and questions worth
 * asking the employer. All keys required (strict structured output).
 */
export const interviewQuestionsSchema = z.object({
  questions: z
    .array(
      z.object({
        topic: z
          .string()
          .describe(
            "One technology from the offer's stack (spelled as in the stack), or 'Praca w zespole' for the behavioural question.",
          ),
        question: z.string().describe("The interview question, in Polish, max 25 words."),
        hint: z
          .string()
          .describe("What a good answer should cover, in Polish, 1-2 sentences, max 35 words."),
      }),
    )
    .describe(`Exactly ${QUESTION_COUNT} questions.`),
  askThem: z
    .array(z.string())
    .describe(
      `Exactly ${ASK_THEM_COUNT} questions the candidate should ask the employer, in Polish, based on what the offer leaves unclear.`,
    ),
});

export type InterviewQuestions = z.infer<typeof interviewQuestionsSchema>;

/** Saved with the card: the set plus the model and date. */
export type StoredInterviewQuestions = InterviewQuestions & { model: string; createdAt: string };
