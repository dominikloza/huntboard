import { NuqsAdapter } from "nuqs/adapters/next/app";

import { AppHeader } from "@/components/layout/app-header";
import { QueryProvider } from "@/components/providers/query-provider";

/**
 * Board area: URL state (nuqs), one TanStack Query client, shared header,
 * and the @modal slot for the sheet.
 */
export default function BoardLayout({ children, modal }: LayoutProps<"/board">) {
  return (
    <NuqsAdapter>
      <QueryProvider>
        <AppHeader />
        {children}
        {modal}
      </QueryProvider>
    </NuqsAdapter>
  );
}
