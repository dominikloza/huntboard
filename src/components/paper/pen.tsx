import { type ComponentProps } from "react";

import { cn } from "@/lib/utils";

/*
 * Red pen primitives for roast mode. The red pen is reserved for roast mode and errors.
 * Caveat (font-pen) is used ONLY here.
 */

/** A handwritten margin note. `delay` staggers notes while a roast streams in. */
function PenNote({
  className,
  delay = 0,
  style,
  ...props
}: ComponentProps<"span"> & { delay?: number }) {
  return (
    <span
      data-slot="pen-note"
      className={cn(
        "inline-block animate-pen font-pen text-[22px] leading-tight font-bold text-pen",
        className,
      )}
      style={{ animationDelay: `${delay}ms`, ...style }}
      {...props}
    />
  );
}

/** Crossed-out phrase from the offer. Semantically a deletion. */
function PenStrike({ className, ...props }: ComponentProps<"del">) {
  return (
    <del
      data-slot="pen-strike"
      className={cn("decoration-pen decoration-2 [text-decoration-skip-ink:none]", className)}
      {...props}
    />
  );
}

/** Circled phrase from the offer. Semantically a highlight. */
function PenCircle({ className, ...props }: ComponentProps<"mark">) {
  return (
    <mark
      data-slot="pen-circle"
      className={cn(
        "rounded-[50%] border-2 border-pen bg-transparent [box-decoration-break:clone] px-1.5 text-inherit",
        className,
      )}
      {...props}
    />
  );
}

/** Underlined phrase from the offer. */
function PenUnderline({ className, ...props }: ComponentProps<"mark">) {
  return (
    <mark
      data-slot="pen-underline"
      className={cn("border-b-2 border-pen bg-transparent text-inherit", className)}
      {...props}
    />
  );
}

export { PenCircle, PenNote, PenStrike, PenUnderline };
