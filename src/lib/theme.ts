export type ThemePreference = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "hb-theme";

/** Resolves a stored preference to the class that should be on <html>. */
export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean) {
  if (preference === "system") return systemPrefersDark ? "dark" : "light";
  return preference;
}

export function parseThemePreference(value: unknown): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}

/** Inline, dependency-free version of the logic above. Runs before React hydrates. */
export const THEME_SCRIPT = `(function(){try{var p=localStorage.getItem("${THEME_STORAGE_KEY}");var d=p==="dark"||(p!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;
