/** A note as the UI sees it. `createdAt` is an ISO string (crosses the server/client boundary). */
export type Note = {
  id: string;
  body: string;
  createdAt: string;
};
