import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Thieu bien moi truong: DATABASE_URL");
  process.exit(1);
}

function describeSqlState(error: unknown): string {
  for (const candidate of [
    error,
    (error as { cause?: unknown } | null)?.cause,
  ]) {
    const { severity, code } = (candidate ?? {}) as {
      severity?: unknown;
      code?: unknown;
    };
    if (
      typeof severity === "string" &&
      typeof code === "string" &&
      /^[0-9A-Z]{5}$/.test(code)
    ) {
      return ` (sqlState ${code})`;
    }
  }
  return "";
}

const client = new pg.Client({ connectionString: url });
try {
  await client.connect();
  await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
  console.log("Migration xong.");
} catch (error) {
  console.error(`Migration that bai${describeSqlState(error)}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
