import { APPLICATION_STATUSES, type ApplicationStatus } from "../constants";
import { type Application } from "../types";

/** Splits cards into board columns. Keeps the incoming order (the query sorts by position). */
export function groupByStatus<T extends Pick<Application, "status">>(
  items: readonly T[],
): Record<ApplicationStatus, T[]> {
  const columns = Object.fromEntries(APPLICATION_STATUSES.map((s) => [s, [] as T[]])) as Record<
    ApplicationStatus,
    T[]
  >;
  for (const item of items) columns[item.status].push(item);
  return columns;
}
