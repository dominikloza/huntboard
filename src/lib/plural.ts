/**
 * Polish plural forms: [1, 2-4, 5+] e.g. ["aplikacja", "aplikacje", "aplikacji"].
 * 12-14 take the "many" form; 22-24, 32-34... take the "few" form.
 */
export function pluralPl(count: number, [one, few, many]: readonly [string, string, string]) {
  const abs = Math.abs(count);
  if (abs === 1) return one;
  const lastDigit = abs % 10;
  const lastTwo = abs % 100;
  if (lastDigit >= 2 && lastDigit <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return few;
  return many;
}
