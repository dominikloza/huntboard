import { AppHeader } from "@/components/layout/app-header";
import { QueryProvider } from "@/components/providers/query-provider";

/** Board area: shared header, one TanStack Query client, and the @modal slot for the sheet. */
export default function BoardLayout({ children, modal }: LayoutProps<"/board">) {
  return (
    <QueryProvider>
      <AppHeader />
      {children}
      {modal}
    </QueryProvider>
  );
}
