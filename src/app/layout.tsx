import type { Metadata } from "next";

import "@fontsource-variable/bricolage-grotesque/index.css";
import "@fontsource-variable/caveat/index.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/600.css";
import "./globals.css";

import { THEME_SCRIPT } from "@/lib/theme";

export const metadata: Metadata = {
  title: {
    default: "Huntboard",
    template: "%s | Huntboard",
  },
  description: "Kartoteka Twoich rekrutacji. AI czyta oferty, Ty decydujesz.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <head>
        {/* Sets the theme class before first paint, so there is no light/dark flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
