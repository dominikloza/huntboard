import { type ApplicationRow } from "@/lib/db/schema";

export {
  APPLICATION_STATUSES,
  STATUS_LABELS,
  type ApplicationStatus,
  type WorkMode,
} from "./constants";

/** A board card as the client holds it. Derived from the database row, not hand-written. */
export type Application = Pick<
  ApplicationRow,
  | "id"
  | "status"
  | "position"
  | "version"
  | "company"
  | "role"
  | "seniority"
  | "salaryMin"
  | "salaryMax"
  | "workMode"
  | "city"
  | "stack"
  | "matchScore"
>;

/** What a card needs to be drawn (no ordering/version data), e.g. styleguide demo cards. */
export type ApplicationCard = Omit<Application, "position" | "version"> & {
  /** Short stamp text, e.g. "Wysłano 04.11". Only when it carries information. */
  stamp?: string;
};
