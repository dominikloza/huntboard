/**
 * Used ONLY by the Better Auth CLI to generate `src/lib/db/schema/auth.ts`
 * (`pnpm auth:schema`). Keep the plugin list in sync with `src/lib/auth/server.ts`:
 * plugins add columns and tables.
 */
import { betterAuth } from "better-auth";
import { anonymous } from "better-auth/plugins";

export const auth = betterAuth({
  plugins: [anonymous()],
});
