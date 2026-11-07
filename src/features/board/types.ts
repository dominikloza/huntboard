import { type ApplicationRow } from "@/lib/db/schema";

export {
  APPLICATION_STATUSES,
  STATUS_LABELS,
  type ApplicationStatus,
  type WorkMode,
} from "./constants";

/** What a board card needs. Derived from the database row, not hand-written. */
export type Application = Pick<
  ApplicationRow,
  | "id"
  | "status"
  | "company"
  | "role"
  | "seniority"
  | "salaryMin"
  | "salaryMax"
  | "workMode"
  | "city"
  | "stack"
  | "matchScore"
> & {
  /** Short stamp text, e.g. "Wysłano 04.11". Only when it carries information. */
  stamp?: string;
};
