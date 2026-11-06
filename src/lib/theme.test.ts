import { parseThemePreference, resolveTheme } from "./theme";

describe("theme", () => {
  it("falls back to system for unknown stored values", () => {
    expect(parseThemePreference("purple")).toBe("system");
    expect(parseThemePreference(null)).toBe("system");
    expect(parseThemePreference("dark")).toBe("dark");
  });

  it("resolves system preference using the OS setting", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
  });
});
