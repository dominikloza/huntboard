import { WarningIcon } from "@phosphor-icons/react/dist/ssr";

/** "Na co uważać": warnings the AI found in the offer. Ink, not red pen (pen = roast and errors). */
export function RedFlags({ flags }: { flags: readonly string[] }) {
  if (flags.length === 0) return null;
  return (
    <section aria-label="Na co uważać" className="border-l-[1.5px] border-ink pl-4">
      <h3 className="font-display text-sm font-bold">Na co uważać</h3>
      <ul className="mt-2 flex flex-col gap-1.5 text-sm">
        {flags.map((flag) => (
          <li key={flag} className="flex gap-2">
            <WarningIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
            {flag}
          </li>
        ))}
      </ul>
    </section>
  );
}
