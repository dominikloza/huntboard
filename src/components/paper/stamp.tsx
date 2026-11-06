import { cva, type VariantProps } from "class-variance-authority";
import { type ComponentProps } from "react";

import { cn } from "@/lib/utils";

const stampVariants = cva(
  "inline-block -rotate-[4deg] rounded-lg border-2 px-2 py-px font-mono text-[11px] leading-5 font-semibold tracking-[0.06em] whitespace-nowrap uppercase",
  {
    variants: {
      tone: {
        primary: "border-primary-ink text-primary-ink",
        pen: "border-[3px] border-pen px-3.5 py-1 text-base text-pen",
      },
      animate: {
        true: "animate-stamp",
        false: "",
      },
    },
    defaultVariants: { tone: "primary", animate: false },
  },
);

type StampProps = ComponentProps<"span"> & VariantProps<typeof stampVariants>;

/**
 * A rubber stamp. Use only where it carries information (status, date).
 * At most one stamp per card.
 */
function Stamp({ className, tone, animate, ...props }: StampProps) {
  return (
    <span
      data-slot="stamp"
      className={cn(stampVariants({ tone, animate }), className)}
      {...props}
    />
  );
}

export { Stamp, stampVariants };
