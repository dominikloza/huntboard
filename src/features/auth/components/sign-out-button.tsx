import { SignOut } from "@phosphor-icons/react/ssr";

import { Button } from "@/components/ui/button";

import { signOut } from "../actions";

export function SignOutButton({ isGuest }: { isGuest: boolean }) {
  return (
    <form action={signOut}>
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        title={isGuest ? "Po wylogowaniu nie wrócisz do konta gościa" : undefined}
      >
        <SignOut aria-hidden weight="bold" />
        Wyloguj
      </Button>
    </form>
  );
}
