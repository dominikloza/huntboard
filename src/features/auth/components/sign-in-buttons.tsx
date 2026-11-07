"use client";

import { GithubLogo } from "@phosphor-icons/react/ssr";
import { type ReactNode, useActionState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { signIn, type SignInState } from "../actions";

const initialState: SignInState = { error: null };

/**
 * One form, two submit buttons. Works without JavaScript; with JS it shows pending labels.
 * `hiddenFields` lets a page stream in extra inputs (e.g. the `next` path) without blocking the form.
 */
export function SignInButtons({
  hiddenFields,
  className,
}: {
  hiddenFields?: ReactNode;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <form action={formAction} className={cn("flex flex-col gap-3", className)}>
      {hiddenFields}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" name="method" value="guest" disabled={pending}>
          Wejdź jako gość
        </Button>
        <Button type="submit" name="method" value="github" variant="secondary" disabled={pending}>
          <GithubLogo aria-hidden weight="bold" />
          Zaloguj przez GitHub
        </Button>
      </div>
      <p role="status" aria-live="polite" className="min-h-5 text-sm">
        {pending ? (
          <span className="text-muted-foreground">Otwieram kartotekę...</span>
        ) : (
          state.error && <span className="text-pen">{state.error}</span>
        )}
      </p>
    </form>
  );
}
