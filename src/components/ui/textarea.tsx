import { type ComponentProps } from "react";

import { cn } from "@/lib/utils";

/** Multi-line field in the same "line to write on" style as Input. */
function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-20 w-full resize-y border-0 border-b-[1.5px] border-input bg-transparent px-0.5 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-primary-ink disabled:opacity-50 aria-invalid:border-pen",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
