import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { type ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * Paper-style button. The primary variant is the only place (besides the offer sheet)
 * that uses the hard shadow. On press it "sinks" into the paper.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md border-[1.5px] font-sans font-semibold whitespace-nowrap transition-[translate,box-shadow,background-color] duration-100 select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "border-ink bg-primary text-primary-foreground shadow-hard active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
        secondary: "border-ink bg-transparent text-foreground hover:bg-folder",
        pen: "border-pen bg-transparent text-pen hover:bg-pen hover:text-pen-foreground aria-pressed:bg-pen aria-pressed:text-pen-foreground",
        ghost: "border-transparent bg-transparent text-foreground hover:bg-folder",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 text-sm",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Render the child element (e.g. a Next.js Link) with button styles. */
    asChild?: boolean;
  };

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
