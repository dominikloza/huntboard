import { CaretDown } from "@phosphor-icons/react/ssr";
import { type ComponentProps } from "react";

import { cn } from "@/lib/utils";

/** Native select styled as a form line: accessible and mobile-friendly out of the box. */
function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        data-slot="select"
        className={cn(
          // The open list is drawn by the OS/browser: give options explicit theme colors,
          // otherwise Chrome on Windows shows light text on a white list in dark mode.
          "h-10 w-full appearance-none border-0 border-b-[1.5px] border-input bg-transparent pr-7 pl-0.5 text-sm text-foreground outline-none focus-visible:border-primary-ink focus-visible:outline-none disabled:opacity-50 aria-invalid:border-pen [&_option]:bg-card [&_option]:text-foreground",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <CaretDown
        aria-hidden
        weight="bold"
        className="pointer-events-none absolute top-1/2 right-1 size-3.5 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}

export { Select };
