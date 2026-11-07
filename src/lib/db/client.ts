import "server-only";

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { serverEnv } from "@/lib/env";

import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

// Reuse one pool across hot reloads in development (each reload would otherwise open a new one).
const globalForDb = globalThis as unknown as { huntboardPool?: Pool; huntboardDb?: Database };

/** Lazily created Drizzle client. Uses the pooled Neon URL (or a local Postgres in dev/tests). */
export function getDb(): Database {
  if (globalForDb.huntboardDb) return globalForDb.huntboardDb;

  const pool =
    globalForDb.huntboardPool ??
    new Pool({ connectionString: serverEnv().DATABASE_URL, max: 5, idleTimeoutMillis: 10_000 });
  const db = drizzle(pool, { schema });

  globalForDb.huntboardPool = pool;
  globalForDb.huntboardDb = db;
  return db;
}
