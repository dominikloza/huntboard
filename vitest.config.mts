import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "json-summary", "html"],
      // Unit-test coverage of logic and client components. Route Handlers, Server Actions,
      // database queries and auth run against a real Postgres in the e2e suite instead.
      include: ["src/lib/**", "src/features/**", "src/components/**"],
      exclude: [
        "**/*.test.{ts,tsx}",
        "src/test/**",
        "src/lib/db/**",
        "src/lib/auth/**",
        "src/lib/env.ts",
        "src/features/*/actions.ts",
        "src/features/*/server/**",
        "src/features/*/queries.ts",
        "src/components/providers/**",
        "src/lib/query-client.ts",
      ],
      thresholds: {
        // Floor for everything measured: a PR may not lower coverage much.
        lines: 65,
        statements: 65,
        functions: 60,
        branches: 60,
        // Pure logic is cheap to test and is where bugs hide: keep it near complete.
        "src/**/lib/**": { lines: 90, statements: 90, functions: 90, branches: 80 },
        "src/features/*/schemas.ts": { lines: 90, statements: 90 },
      },
    },
  },
});
