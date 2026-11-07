import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { anonymous } from "better-auth/plugins";

import { getDb } from "@/lib/db/client";
import { moveWorkspace, seedGuestWorkspace } from "@/lib/db/queries/workspace";
import * as schema from "@/lib/db/schema";
import { serverEnv } from "@/lib/env";

/**
 * Better Auth configuration (ADR 004).
 * Created lazily so that importing this module never needs secrets (e.g. during `next build`).
 * When you change plugins, update scripts/better-auth.config.ts and run `pnpm auth:schema`.
 */
function createAuth() {
  const env = serverEnv();
  const db = getDb();

  return betterAuth({
    appName: "Huntboard",
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, { provider: "pg", schema }),
    socialProviders: {
      github: {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
      },
    },
    session: {
      // Signed session data in a short-lived cookie: most requests skip the database lookup.
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            if ("isAnonymous" in user && user.isAnonymous === true) {
              await seedGuestWorkspace(db, user.id);
            }
          },
        },
      },
    },
    plugins: [
      anonymous({
        emailDomainName: "guest.huntboard.invalid",
        generateName: () => "Gość",
        onLinkAccount: async ({ anonymousUser, newUser }) => {
          await moveWorkspace(db, anonymousUser.user.id, newUser.user.id);
        },
      }),
      nextCookies(), // must stay last: lets Server Actions set auth cookies
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;

let instance: Auth | undefined;

export function getAuth(): Auth {
  instance ??= createAuth();
  return instance;
}
