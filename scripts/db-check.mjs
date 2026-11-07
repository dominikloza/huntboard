// Checks both database URLs from .env.local and prints the real error.
// drizzle-kit sometimes fails without a message; run this first: `node scripts/db-check.mjs`
import pg from "pg";

try {
  process.loadEnvFile(".env.local");
} catch {
  console.error("Brak pliku .env.local w tym folderze.");
  process.exit(1);
}

let failed = false;
for (const name of ["DATABASE_URL", "DATABASE_URL_UNPOOLED"]) {
  const url = process.env[name];
  if (!url) {
    console.log(`${name}: brak w .env.local`);
    continue;
  }
  const { hostname, searchParams } = new URL(url);
  const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 10_000 });
  try {
    await client.connect();
    const { rows } = await client.query(
      "select current_database() as db, to_regclass('public.applications') is not null as migrated",
    );
    console.log(
      `${name}: OK (host ${hostname}, sslmode=${searchParams.get("sslmode")}, baza ${rows[0].db}, ` +
        `tabele ${rows[0].migrated ? "są" : "BRAK, uruchom pnpm db:migrate"})`,
    );
  } catch (error) {
    failed = true;
    console.log(`${name}: BŁĄD (host ${hostname}, sslmode=${searchParams.get("sslmode")})`);
    console.log(`  ${error.code ?? ""} ${error.message}`);
  } finally {
    await client.end().catch(() => {});
  }
}
process.exit(failed ? 1 : 0);
