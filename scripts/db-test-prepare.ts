import pg from "pg";
import { describeSqlState, prepareTestDb } from "./db-test-lib";

const url = process.env.TEST_DATABASE_URL;
if (!url) {
  console.error("Thieu bien moi truong: TEST_DATABASE_URL");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
try {
  await client.connect();
  await prepareTestDb(client);
  console.log("Database test san sang.");
} catch (error) {
  const message =
    error instanceof Error && error.message.startsWith("TEST_DATABASE_URL")
      ? error.message
      : `Chuan bi database test that bai${describeSqlState(error)}`;
  console.error(message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
