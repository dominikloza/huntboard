import { type ComponentProps } from "react";

import { cn } from "@/lib/utils";

/** Form-style input: a line to write on, not a box. */
function Input({ className, type = "text", ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 border-0 border-b-[1.5px] border-input bg-transparent px-0.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-primary-ink focus-visible:outline-none disabled:opacity-50 aria-invalid:border-pen",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
