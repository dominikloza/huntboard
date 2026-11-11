import { z } from "zod";

import { MAIL_KINDS } from "@/features/board/constants";

/** evals/mail/cases.json: e-mails (real formats, names replaced) and what they say. */
export const mailCasesSchema = z.array(
  z.object({
    id: z.string(),
    why: z.string(),
    from: z.string(),
    subject: z.string(),
    body: z.string(),
    expected: z.object({
      kind: z.enum(MAIL_KINDS),
      company: z.string().nullable(),
      role: z.string().nullable(),
    }),
    forbidden: z.array(z.string()).optional(),
  }),
);
export type MailCase = z.infer<typeof mailCasesSchema>[number];
