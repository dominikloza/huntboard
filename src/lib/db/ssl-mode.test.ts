import { describe, expect, it } from "vitest";

import { withExplicitSslMode } from "./ssl-mode";

describe("withExplicitSslMode", () => {
  it("turns the aliases into the mode pg already uses", () => {
    expect(
      withExplicitSslMode(
        "postgresql://u:p@ep-x-pooler.neon.tech/db?sslmode=require&channel_binding=require",
      ),
    ).toBe("postgresql://u:p@ep-x-pooler.neon.tech/db?sslmode=verify-full&channel_binding=require");
  });

  it("leaves other URLs alone", () => {
    const local = "postgresql://huntboard:secret@127.0.0.1:5433/huntboard";
    expect(withExplicitSslMode(local)).toBe(local);
    const libpq = "postgresql://u:p@h/db?sslmode=require&uselibpqcompat=true";
    expect(withExplicitSslMode(libpq)).toBe(libpq);
    expect(withExplicitSslMode("not a url")).toBe("not a url");
  });
});
