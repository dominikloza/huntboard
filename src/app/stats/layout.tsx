import { AppHeader } from "@/components/layout/app-header";
import { QueryProvider } from "@/components/providers/query-provider";

/** Same shell as the board and the profile. */
export default function StatsLayout({ children }: LayoutProps<"/stats">) {
  return (
    <QueryProvider>
      <AppHeader />
      {children}
    </QueryProvider>
  );
}
