import { NextResponse } from "next/server";

import { readKnownSender } from "@/features/mail/lib/known-senders";
import { bearerToken } from "@/features/mail/lib/token";
import { type IncomingMail, type MailReading } from "@/features/mail/lib/types";
import { mailBatchSchema } from "@/features/mail/schemas";
import { streamMailReadings } from "@/features/mail/server/read-mail";
import { settleWithin } from "@/lib/ai/http";
import { AiNotConfiguredError, getModel, modelLabel } from "@/lib/ai/model";
import { classifyProviderError } from "@/lib/ai/provider-error";
import { reserveAiCallForMailUser } from "@/lib/db/queries/ai-usage";
import { applyMailReadings, mailUserForToken, unseenMessageIds } from "@/lib/db/queries/mail";

export const maxDuration = 30;

/** Job boards whose other e-mails (newsletters, "similar offers") mean nothing for a card. */
const PLATFORM_SENDERS = /@([a-z0-9-]+\.)*(justjoin\.it|nofluffjobs\.com)>?\s*$/i;

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

/**
 * The Gmail script (ADR 017) posts recruitment e-mails here with the user's personal token.
 * Known senders are read with rules; the rest go to the AI in one call (limits as usual).
 * E-mails the AI could not read are not stored, so the next run tries them again.
 */
export async function POST(request: Request) {
  const token = bearerToken(request.headers.get("authorization"));
  const owner = token ? await mailUserForToken(token) : null;
  if (!owner) return json({ error: "Nieprawidłowy token. Wygeneruj nowy w profilu." }, 401);

  const parsed = mailBatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "Nieprawidłowe dane." }, 400);

  const { userId } = owner;
  const unseen = await unseenMessageIds(
    userId,
    parsed.data.messages.map((m) => m.messageId),
  );
  const mails: IncomingMail[] = parsed.data.messages.filter((m) => unseen.has(m.messageId));

  const read: { mail: IncomingMail; reading: MailReading }[] = [];
  const forAi: IncomingMail[] = [];
  for (const mail of mails) {
    const known = readKnownSender(mail);
    if (known) read.push({ mail, reading: known });
    else if (PLATFORM_SENDERS.test(mail.from)) {
      read.push({
        mail,
        reading: { kind: "other", company: null, role: null, city: null, sure: true },
      });
    } else forAi.push(mail);
  }

  let aiError: string | null = null;
  if (forAi.length > 0) {
    try {
      const model = getModel();
      const reservation = await reserveAiCallForMailUser(owner, modelLabel(model));
      if (!reservation.ok) {
        aiError = reservation.message;
      } else {
        const result = streamMailReadings({
          model,
          mails: forAi.map((mail, index) => ({ index, ...mail })),
        });
        const [output, usage] = await Promise.all([
          settleWithin(result.output, 25_000),
          settleWithin(result.totalUsage, 25_000),
        ]);
        if (usage) await reservation.record(usage);
        if (!output) {
          await reservation.refund();
          aiError =
            "AI nie odpowiedziało. Te maile zostaną sprawdzone przy następnym uruchomieniu.";
        } else {
          for (const result of output.results) {
            const mail = forAi[result.index];
            if (mail) read.push({ mail, reading: { ...result } });
          }
        }
      }
    } catch (error) {
      aiError =
        error instanceof AiNotConfiguredError
          ? "AI nie jest skonfigurowane na tym serwerze."
          : `AI: ${classifyProviderError(error)}`;
      console.error("Mail triage failed", error);
    }
  }

  const summary = await applyMailReadings(userId, read);
  return json({
    received: parsed.data.messages.length,
    processed: read.length,
    skipped: parsed.data.messages.length - mails.length,
    ...summary,
    aiError,
  });
}
