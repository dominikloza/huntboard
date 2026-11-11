import { z } from "zod";

import { MAIL_KINDS } from "@/features/board/constants";

/** One batch from the Gmail script: POST /api/mail/messages with the personal token. */
export const MAIL_BATCH_MAX = 20;
export const MAIL_BODY_MAX = 6000;

export const mailBatchSchema = z.object({
  messages: z
    .array(
      z.object({
        messageId: z.string().min(1).max(200),
        from: z.string().min(1).max(300),
        subject: z.string().max(500),
        date: z.coerce.date(),
        // Longer bodies are cut, not refused: the answer is near the top of an e-mail.
        body: z.string().transform((body) => body.slice(0, MAIL_BODY_MAX)),
      }),
    )
    .max(MAIL_BATCH_MAX),
});

/** What the AI reads from e-mails the rules do not know. All keys required (strict output). */
export const mailReadingsSchema = z.object({
  results: z.array(
    z.object({
      index: z.number().int().describe("The index of the <email> block this result is for."),
      kind: z
        .enum(MAIL_KINDS)
        .describe(
          "applied = confirmation that an application arrived; interview = invitation to a call, test or meeting; offer = job offer; rejected = no (also polite or 'we keep your CV'); progress = status update without a decision; other = not about an application the candidate sent (cold outreach, newsletters).",
        ),
      company: z.string().nullable().describe("The employer's name, or null if unknown."),
      role: z.string().nullable().describe("The job title as written, or null if not named."),
      city: z.string().nullable(),
      sure: z.boolean().describe("false when the e-mail could reasonably mean another kind."),
    }),
  ),
});
export type MailReadings = z.infer<typeof mailReadingsSchema>;

/** Auto-reject options in the settings ("off" or days without an answer). */
export const AUTO_REJECT_CHOICES = ["off", "14", "21", "30", "45"] as const;
export type AutoRejectChoice = (typeof AUTO_REJECT_CHOICES)[number];
