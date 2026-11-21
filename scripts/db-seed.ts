import pg from "pg";
import { describeSqlState, seedInventory } from "./db-test-lib";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Thieu bien moi truong: DATABASE_URL");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
try {
  await client.connect();
  await seedInventory(client);
  console.log("Seed xong.");
} catch (error) {
  console.error(`Seed that bai${describeSqlState(error)}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
