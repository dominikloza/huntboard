import type { Metadata } from "next";
import { preload } from "react-dom";

import "./fonts.css";
import "@fontsource-variable/caveat/index.css";
import "./globals.css";

import { THEME_SCRIPT } from "@/lib/theme";

/** Fonts on every first paint: headings and Polish body text (src/app/fonts.css). */
const FIRST_PAINT_FONTS = [
  "bricolage-grotesque-latin-wght-normal",
  "ibm-plex-sans-latin-400-normal",
  "ibm-plex-sans-latin-ext-400-normal",
];

export const metadata: Metadata = {
  title: {
    default: "Huntboard",
    template: "%s | Huntboard",
  },
  description: "Kartoteka Twoich rekrutacji. AI czyta oferty, Ty decydujesz.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // The page headings (the LCP element) use this file: start the download with the HTML,
  // not after the CSS has been parsed.
  for (const font of FIRST_PAINT_FONTS) {
    preload(`/fonts/${font}.woff2`, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  }
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
