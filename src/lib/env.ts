import "server-only";

import { z } from "zod";

/**
 * Server-side environment, validated once on first use (not at import time, so `next build`
 * does not need production secrets). Never import this file from a Client Component.
 */
const serverEnvSchema = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  BETTER_AUTH_SECRET: z.string().min(32, "Generate it with: openssl rand -base64 32"),
  BETTER_AUTH_URL: z.url(),
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`);
    throw new Error(
      `Invalid or missing environment variables (see .env.example):\n${fields.join("\n")}`,
    );
  }
  cached = parsed.data;
  return cached;
}
