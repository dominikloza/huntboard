"use client";

import { DotsSixVertical } from "@phosphor-icons/react/ssr";
import { type ComponentProps, type Ref } from "react";

import { cn } from "@/lib/utils";

/**
 * The keyboard / screen reader way to move a card: focus, Space to lift, arrows to move,
 * Space to drop, Escape to cancel. Sits above the card's stretched link.
 */
export function DragHandle({
  label,
  className,
  ref,
  ...props
}: ComponentProps<"button"> & { label: string; ref?: Ref<HTMLButtonElement> }) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      className={cn(
        "relative z-10 -ml-1 flex size-6 shrink-0 cursor-grab items-center justify-center text-muted-foreground hover:text-foreground active:cursor-grabbing",
        className,
      )}
      {...props}
    >
      <DotsSixVertical aria-hidden weight="bold" className="size-4" />
    </button>
  );
}
