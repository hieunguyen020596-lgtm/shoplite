import pg from "pg";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { assertTestDatabase } from "../../scripts/db-test-lib";
import { getDb } from "./client";

let admin: pg.Client | undefined;

const pool = () => {
  getDb();
  return (globalThis as unknown as { __shopliteDb: { pool: pg.Pool } })
    .__shopliteDb.pool;
};

beforeAll(async () => {
  admin = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await admin.connect();
  await assertTestDatabase(admin);
});

afterEach(() => vi.restoreAllMocks());

afterAll(async () => {
  await admin?.end().catch(() => {});
});

describe("pool PostgreSQL", () => {
  it("mỗi connection có đủ ba timeout", async () => {
    const client = await pool().connect();
    try {
      const show = async (name: string) =>
        (await client.query(`SHOW ${name}`)).rows[0][name];
      expect(await show("lock_timeout")).toBe("3s");
      expect(await show("statement_timeout")).toBe("5s");
      expect(await show("idle_in_transaction_session_timeout")).toBe("10s");
    } finally {
      client.release();
    }
  });

  it("mất kết nối khi client đang được mượn: chỉ ghi log đã làm sạch", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const client = await pool().connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query("SELECT pg_backend_pid() AS pid");
      await admin!.query("SELECT pg_terminate_backend($1)", [rows[0].pid]);
      await vi.waitFor(() => expect(spy).toHaveBeenCalled());
      expect(JSON.parse(String(spy.mock.calls[0][0]))).toEqual({
        scope: "db.pool",
        name: "DbFailure",
        sqlState: "57P01",
      });
    } finally {
      client.release(true);
    }
  });
});
