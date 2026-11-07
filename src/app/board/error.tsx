"use client";

import { Button } from "@/components/ui/button";

/** Shown when the board cannot be rendered on the server (e.g. the database is unreachable). */
export default function BoardError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main className="mx-auto flex max-w-[1400px] flex-col items-start gap-4 px-4 py-16 sm:px-7">
      <h1 className="font-display text-[44px] leading-none font-extrabold tracking-[-0.035em]">
        Kartoteka chwilowo zamknięta
      </h1>
      <p className="max-w-[55ch] text-muted-foreground">
        Nie udało się wczytać Twoich aplikacji. To zwykle chwilowy problem z połączeniem z bazą.
      </p>
      {error.digest && (
        <p className="font-mono text-xs text-muted-foreground">Kod błędu: {error.digest}</p>
      )}
      <Button onClick={() => retry()}>Spróbuj ponownie</Button>
    </main>
  );
}
