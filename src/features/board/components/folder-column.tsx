import { type ReactNode, type Ref } from "react";

import { cn } from "@/lib/utils";

type FolderColumnProps = {
  title: string;
  count: number;
  /** Highlights the tab (e.g. the "Rozmowa" column with an upcoming interview). */
  active?: boolean;
  emptyMessage?: string;
  children?: ReactNode;
  className?: string;
  /** Drop target for drag & drop (the folder body). */
  bodyRef?: Ref<HTMLDivElement>;
  /** A card is being dragged over this folder. */
  highlighted?: boolean;
};

/** A board column drawn as a folder: a tab on top, the folder body below. */
export function FolderColumn({
  title,
  count,
  active = false,
  emptyMessage = "Na razie pusta teczka.",
  children,
  className,
  bodyRef,
  highlighted = false,
}: FolderColumnProps) {
  const headingId = `folder-${title.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <section aria-labelledby={headingId} className={cn("flex min-w-0 flex-col", className)}>
      <h2
        id={headingId}
        className={cn(
          "flex gap-2.5 self-start rounded-t-tab border-[1.5px] border-b-0 border-ink px-3.5 pt-1.5 pb-1 text-[13px] font-semibold",
          active ? "bg-primary-soft" : "bg-card",
        )}
      >
        {title}
        <span className="font-mono font-normal text-muted-foreground">
          <span className="sr-only">, liczba aplikacji: </span>
          {count}
        </span>
      </h2>
      <div
        ref={bodyRef}
        className={cn(
          "flex min-h-[420px] flex-col gap-2.5 border-[1.5px] border-ink bg-folder p-2.5 transition-[outline-color] duration-100",
          "outline-2 -outline-offset-[5px] outline-transparent outline-dashed",
          highlighted && "outline-primary-ink",
        )}
      >
        {count === 0 ? (
          <p className="px-3 py-5 text-center text-[13px] text-muted-foreground">{emptyMessage}</p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
