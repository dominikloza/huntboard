"use client";

import Link from "next/link";
import { type ComponentProps, useState } from "react";

/**
 * A `Link` that prefetches only when the user shows intent (pointer over it, keyboard focus or a
 * touch), not when it scrolls into view. Use it for links to heavy routes that many visible links
 * point at: the board cards and "Dodaj ofertę" open modal routes with the form, Zod and the AI
 * code, which would otherwise download on every board visit (Lighthouse, Day 9).
 */
export function IntentLink({
  onPointerEnter,
  onFocus,
  onTouchStart,
  ...props
}: Omit<ComponentProps<typeof Link>, "prefetch">) {
  const [intent, setIntent] = useState(false);
  const show = () => setIntent(true);

  return (
    <Link
      {...props}
      prefetch={intent ? null : false}
      onPointerEnter={(event) => {
        show();
        onPointerEnter?.(event);
      }}
      onFocus={(event) => {
        show();
        onFocus?.(event);
      }}
      onTouchStart={(event) => {
        show();
        onTouchStart?.(event);
      }}
    />
  );
}
