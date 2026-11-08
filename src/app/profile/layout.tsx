import { AppHeader } from "@/components/layout/app-header";
import { QueryProvider } from "@/components/providers/query-provider";

/** Same shell as the board; the browser shares one query client, so saving here refreshes it. */
export default function ProfileLayout({ children }: LayoutProps<"/profile">) {
  return (
    <QueryProvider>
      <AppHeader />
      {children}
    </QueryProvider>
  );
}
