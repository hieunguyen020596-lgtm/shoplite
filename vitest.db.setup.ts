import pg from "pg";
import { describeSqlState, prepareTestDb } from "./scripts/db-test-lib";

export default async function setup(): Promise<void> {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("Thieu bien moi truong: TEST_DATABASE_URL");
  const client = new pg.Client({ connectionString: url });
  try {
    await client.connect();
    await prepareTestDb(client);
  } catch (error) {
    // Không để lỗi gốc ra output: có thể chứa host và cổng.
    if (
      error instanceof Error &&
      error.message.startsWith("TEST_DATABASE_URL")
    ) {
      throw new Error(error.message);
    }
    throw new Error(
      `Chuan bi database test that bai${describeSqlState(error)}`,
    );
  } finally {
    await client.end().catch(() => {});
  }
}
