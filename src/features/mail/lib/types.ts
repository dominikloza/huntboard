import { type ApplicationStatus, type MailKind } from "@/features/board/constants";

/** One e-mail as the Gmail script sends it (validated by mailBatchSchema). */
export type IncomingMail = {
  messageId: string;
  from: string;
  subject: string;
  date: Date;
  body: string;
};

/** What an e-mail says, from a rule (known platforms) or from the AI. */
export type MailReading = {
  kind: MailKind;
  company: string | null;
  role: string | null;
  city: string | null;
  /** Rules are always sure; the AI says when it is not. Unsure readings become proposals. */
  sure: boolean;
};

export type CardForMail = {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
};
