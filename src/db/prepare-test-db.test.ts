import type pg from "pg";
import { describe, expect, it, vi } from "vitest";
import { prepareTestDb } from "../../scripts/db-test-lib";

describe("prepareTestDb guard", () => {
  it("từ chối database không phải shoplite_test và không chạy query nào khác", async () => {
    const query = vi
      .fn()
      .mockResolvedValue({ rows: [{ name: "shoplite_dev" }] });
    const client = { query } as unknown as pg.Client;

    await expect(prepareTestDb(client)).rejects.toThrow("TEST_DATABASE_URL");
    expect(query).toHaveBeenCalledTimes(1);
  });
});
