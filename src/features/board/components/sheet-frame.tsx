"use client";

import { X } from "@phosphor-icons/react/ssr";
import { Dialog } from "radix-ui";
import { useRouter } from "next/navigation";
import { createContext, type ReactNode, use } from "react";

import { cn } from "@/lib/utils";

/*
 * The offer sheet is shown two ways (ADR 006):
 * - as a modal over the board (intercepted route, soft navigation)
 * - as a full page (direct link or refresh)
 * Content inside calls useCloseSheet() and does not need to know which one it is.
 */

type Variant = "modal" | "page";
const VariantContext = createContext<Variant>("page");

export function useCloseSheet() {
  const router = useRouter();
  const variant = use(VariantContext);
  return () => (variant === "modal" ? router.back() : router.push("/board"));
}

const sheetClasses =
  "w-full max-w-2xl border-[1.5px] border-ink bg-card p-6 text-card-foreground shadow-hard sm:p-8";

export function SheetModal({ title, children }: { title: string; children: ReactNode }) {
  const router = useRouter();
  return (
    <VariantContext value="modal">
      <Dialog.Root open onOpenChange={(open) => !open && router.back()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed inset-x-0 top-0 z-50 flex max-h-dvh justify-center overflow-y-auto p-4 outline-none sm:top-[8vh] sm:max-h-[84vh]"
          >
            <div className={cn(sheetClasses, "relative h-fit")}>
              <Dialog.Title className="mb-6 pr-10 font-display text-[28px] leading-tight font-extrabold tracking-[-0.03em]">
                {title}
              </Dialog.Title>
              <Dialog.Close
                aria-label="Zamknij"
                className="absolute top-4 right-4 flex size-9 items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X aria-hidden weight="bold" className="size-5" />
              </Dialog.Close>
              {children}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </VariantContext>
  );
}

export function SheetPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <VariantContext value="page">
      <section aria-labelledby="sheet-title" className={cn(sheetClasses, "mx-auto my-8")}>
        <h1
          id="sheet-title"
          className="mb-6 font-display text-[28px] leading-tight font-extrabold tracking-[-0.03em]"
        >
          {title}
        </h1>
        {children}
      </section>
    </VariantContext>
  );
}

/** Same shape as the form, shown while the card loads. */
export function SheetSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <span className="sr-only">Wczytuję aplikację...</span>
      <div aria-hidden className="grid gap-5 sm:grid-cols-2">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="h-3 w-24 animate-pulse bg-folder" />
            <div className="h-10 animate-pulse border-b-[1.5px] border-border" />
          </div>
        ))}
      </div>
    </div>
  );
}
