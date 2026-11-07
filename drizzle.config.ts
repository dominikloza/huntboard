import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// Same env files as Next.js (.env.local etc.).
loadEnvConfig(process.cwd());

// Migrations use the direct (unpooled) connection when available.
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is missing. Copy .env.example to .env.local.");

export default defineConfig({
  schema: "./src/lib/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
