import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assertTestDatabase } from "../../../scripts/db-test-lib";
import { readStock } from "./server";

let client: pg.Client | undefined;
let guardPassed = false;

beforeAll(async () => {
  client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await assertTestDatabase(client);
  guardPassed = true;
  await client.query("DELETE FROM inventory WHERE product_id LIKE 'r-%'");
  await client.query(
    "INSERT INTO inventory (product_id, stock) VALUES ('r-a', 7), ('r-zero', 0)",
  );
});

afterAll(async () => {
  try {
    if (guardPassed) {
      await client?.query("DELETE FROM inventory WHERE product_id LIKE 'r-%'");
    }
  } finally {
    await client?.end().catch(() => {});
  }
});

describe("readStock", () => {
  it("trả tồn thật, dòng 0 là 0, id thiếu dòng cũng là 0", async () => {
    expect(await readStock(["r-a", "r-zero", "r-missing"])).toEqual({
      "r-a": 7,
      "r-zero": 0,
      "r-missing": 0,
    });
  });

  it("đọc lại thấy tồn mới trong database", async () => {
    await client!.query(
      "UPDATE inventory SET stock = 0 WHERE product_id = 'r-a'",
    );
    expect((await readStock(["r-a"]))["r-a"]).toBe(0);
  });

  it("danh sách rỗng trả object rỗng", async () => {
    expect(await readStock([])).toEqual({});
  });
});
