"use client";

import { MagnifyingGlass, X } from "@phosphor-icons/react/ssr";
import { debounce, useQueryStates } from "nuqs";
import { useId } from "react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { WORK_MODES, type WorkMode } from "../constants";
import { boardFilterParsers } from "../filters";

const MODE_LABELS: Record<WorkMode, string> = {
  remote: "Zdalnie",
  hybrid: "Hybrydowo",
  office: "Stacjonarnie",
};

const SALARY_OPTIONS = [10000, 15000, 20000, 25000] as const;
const plnFormatter = new Intl.NumberFormat("pl-PL");

/**
 * Search and filters, stored in the URL (nuqs). The state updates at once; the URL follows
 * (search is debounced, so typing does not flood the browser history API).
 */
export function FilterBar({ className }: { className?: string }) {
  const id = useId();
  const [filters, setFilters] = useQueryStates(boardFilterParsers);
  const filtering = filters.q !== "" || filters.mode.length > 0 || filters.min != null;

  const toggleMode = (mode: WorkMode) =>
    setFilters({
      mode: filters.mode.includes(mode)
        ? filters.mode.filter((m) => m !== mode)
        : WORK_MODES.filter((m) => m === mode || filters.mode.includes(m)),
    });

  return (
    <search
      aria-label="Filtry kartoteki"
      className={cn("flex flex-wrap items-end gap-x-5 gap-y-3", className)}
    >
      <div className="relative w-full max-w-xs">
        <label htmlFor={`${id}-q`} className="sr-only">
          Szukaj w kartotece
        </label>
        <MagnifyingGlass
          aria-hidden
          weight="bold"
          className="pointer-events-none absolute top-1/2 left-0.5 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          id={`${id}-q`}
          type="search"
          value={filters.q}
          onChange={(e) =>
            setFilters(
              { q: e.target.value || null },
              { limitUrlUpdates: e.target.value ? debounce(300) : undefined },
            )
          }
          placeholder="Firma, stanowisko, miasto, technologia..."
          className="h-10 w-full border-0 border-b-[1.5px] border-input bg-transparent pr-1 pl-7 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-primary-ink"
        />
      </div>

      <fieldset className="flex items-center gap-2">
        <legend className="sr-only">Tryb pracy</legend>
        {WORK_MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={filters.mode.includes(mode)}
            onClick={() => toggleMode(mode)}
            className="h-8 border-[1.5px] border-border px-3 text-xs font-medium text-muted-foreground hover:border-ink hover:text-foreground aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-background"
          >
            {MODE_LABELS[mode]}
          </button>
        ))}
      </fieldset>

      <div className="flex items-center gap-2">
        <label htmlFor={`${id}-min`} className="text-xs text-muted-foreground">
          Widełki od
        </label>
        <Select
          id={`${id}-min`}
          value={filters.min ?? ""}
          onChange={(e) => setFilters({ min: e.target.value ? Number(e.target.value) : null })}
          className="h-8 w-32 font-mono text-xs"
        >
          <option value="">dowolne</option>
          {SALARY_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {plnFormatter.format(value)} zł
            </option>
          ))}
        </Select>
      </div>

      {filtering && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setFilters({ q: null, mode: null, min: null })}
        >
          <X aria-hidden weight="bold" />
          Wyczyść filtry
        </Button>
      )}
    </search>
  );
}
