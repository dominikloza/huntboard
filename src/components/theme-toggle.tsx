"use client";

import { Desktop, Moon, Sun } from "@phosphor-icons/react/ssr";
import { useSyncExternalStore } from "react";

import {
  parseThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@/lib/theme";
import { cn } from "@/lib/utils";

const THEME_EVENT = "hb-theme-change";

function readPreference(): ThemePreference {
  try {
    return parseThemePreference(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(THEME_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(THEME_EVENT, onChange);
  };
}

function applyPreference(preference: ThemePreference) {
  try {
    if (preference === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Storage can be blocked (private mode); the class below still applies for this visit.
  }
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.classList.toggle(
    "dark",
    resolveTheme(preference, systemDark) === "dark",
  );
  window.dispatchEvent(new Event(THEME_EVENT));
}

const OPTIONS = [
  { value: "light", label: "Jasny", Icon: Sun },
  { value: "dark", label: "Ciemny", Icon: Moon },
  { value: "system", label: "Systemowy", Icon: Desktop },
] as const;

export function ThemeToggle({ className }: { className?: string }) {
  const preference = useSyncExternalStore(subscribe, readPreference, () => "system" as const);

  return (
    <div
      role="group"
      aria-label="Motyw"
      className={cn("inline-flex border-[1.5px] border-ink", className)}
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={preference === value}
          aria-label={label}
          title={label}
          onClick={() => applyPreference(value)}
          className="flex size-9 items-center justify-center text-muted-foreground not-last:border-r-[1.5px] not-last:border-ink hover:text-foreground aria-pressed:bg-ink aria-pressed:text-background"
        >
          <Icon aria-hidden weight="bold" className="size-4" />
        </button>
      ))}
    </div>
  );
}
