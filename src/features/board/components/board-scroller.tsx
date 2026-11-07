import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Horizontally scrollable board area. It is focusable so keyboard users can scroll it
 * with arrow keys (axe: scrollable-region-focusable, WCAG 2.1.1).
 */
export function BoardScroller({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      // relative: absolutely positioned descendants (e.g. sr-only text in the folder tabs) must
      // use this box as their containing block, or they escape the scroll area and widen the
      // whole page on phones (the browser then zooms the page out).
      className={cn("relative overflow-x-auto pb-2", className)}
    >
      <div className="grid min-w-[1060px] grid-cols-5 gap-3.5">{children}</div>
    </div>
  );
}
