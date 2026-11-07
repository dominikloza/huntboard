import { queryOptions } from "@tanstack/react-query";

import { applicationKeys } from "./query-keys";
import { type Application } from "./types";

export class SessionExpiredError extends Error {}

/** Client-side board query. On the server the same key is prefetched straight from the DAL. */
export const applicationsQuery = queryOptions({
  queryKey: applicationKeys.all,
  queryFn: async ({ signal }): Promise<Application[]> => {
    const response = await fetch("/api/applications", { signal });
    if (response.status === 401) throw new SessionExpiredError("Sesja wygasła.");
    if (!response.ok) throw new Error(`Board request failed: ${response.status}`);
    return (await response.json()) as Application[];
  },
  retry: (failureCount, error) => !(error instanceof SessionExpiredError) && failureCount < 2,
});
