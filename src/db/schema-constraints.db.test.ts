import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assertTestDatabase } from "../../scripts/db-test-lib";
import { ORDER_STATUSES } from "@/features/orders/types";

let client: pg.Client | undefined;

async function attempt(sql: string, params: unknown[] = []) {
  await client!.query("SAVEPOINT s");
  try {
    await client!.query(sql, params);
    return null;
  } catch (error) {
    return error as { code?: string; constraint?: string };
  } finally {
    await client!.query("ROLLBACK TO SAVEPOINT s");
  }
}

const ORDER_SQL = `INSERT INTO orders (id, status, customer_name, phone_normalized, address, shipping_method, payment_method, subtotal, shipping_fee, total)
  VALUES ($1, $2, 'A', '0900000000', 'B', $3, $4, 1, 0, 1)`;
const ITEM_SQL = `INSERT INTO order_items (order_id, product_id, name, slug, image, unit_price, quantity, line_total)
  VALUES ('c-base', $1, 'N', 's', '{}', 1, $2, 1)`;

interface HistoryRow {
  event: string;
  from?: string | null;
  to?: string | null;
  reason?: string | null;
  refund?: string | null;
  actor?: string;
  staffId?: number | null;
  name?: string;
}

const history = ({
  event,
  from = null,
  to = null,
  reason = null,
  refund = null,
  actor = "staff",
  staffId = 1,
  name = "NV",
}: HistoryRow) =>
  attempt(
    `INSERT INTO order_status_history (order_id, event_type, from_status, to_status, reason_code, reason_text, refund_outcome, actor_type, actor_staff_id, actor_name)
     VALUES ('c-base', $1, $2, $3, $4, $4, $5, $6, $7, $8)`,
    [event, from, to, reason, refund, actor, staffId, name],
  );

const created: HistoryRow = {
  event: "order_created",
  to: "pending",
  actor: "customer",
  staffId: null,
  name: "Khách hàng",
};
const changed: HistoryRow = {
  event: "status_changed",
  from: "pending",
  to: "confirmed",
};

beforeAll(async () => {
  client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await assertTestDatabase(client);
  await client.query("BEGIN");
  await client.query(ORDER_SQL, ["c-base", "pending", "standard", "cod"]);
});

afterAll(async () => {
  await client?.query("ROLLBACK").catch(() => {});
  await client?.end().catch(() => {});
});

describe("CHECK và FK của đơn hàng", () => {
  it.each(ORDER_STATUSES)("nhận trạng thái %s", async (status) => {
    expect(
      await attempt(ORDER_SQL, [`c-${status}`, status, "standard", "cod"]),
    ).toBeNull();
  });

  it.each([
    ["orders_status_valid", "x", "standard", "cod"],
    ["orders_shipping_method_valid", "pending", "x", "cod"],
    ["orders_payment_method_valid", "pending", "standard", "x"],
  ])("%s từ chối giá trị lạ", async (constraint, status, ship, pay) => {
    expect(
      await attempt(ORDER_SQL, ["c-bad", status, ship, pay]),
    ).toMatchObject({ code: "23514", constraint });
  });

  it("đơn COD không được cần hoàn tiền", async () => {
    expect(
      await attempt(
        "UPDATE orders SET refund_required = true WHERE id = 'c-base'",
      ),
    ).toMatchObject({ constraint: "orders_refund_required_valid" });
  });

  it("số lượng phải dương, sản phẩm phải có trong inventory, tồn không âm", async () => {
    expect(await attempt(ITEM_SQL, ["p001", 0])).toMatchObject({
      constraint: "order_items_quantity_positive",
    });
    expect(await attempt(ITEM_SQL, ["khong-co", 1])).toMatchObject({
      code: "23503",
      constraint: "order_items_product_id_fk",
    });
    expect(
      await attempt(
        "UPDATE inventory SET stock = -1 WHERE product_id = 'p001'",
      ),
    ).toMatchObject({ constraint: "inventory_stock_non_negative" });
  });
});

describe("hình dạng sự kiện Lịch sử", () => {
  it("nhận order_created và status_changed hợp lệ", async () => {
    expect(await history(created)).toBeNull();
    expect(await history(changed)).toBeNull();
  });

  it.each<[string, HistoryRow, string]>([
    [
      "order_created thiếu to_status",
      { ...created, to: null },
      "osh_event_shape",
    ],
    [
      "order_created có from_status",
      { ...created, from: "pending" },
      "osh_event_shape",
    ],
    ["order_created có lý do", { ...created, reason: "c" }, "osh_event_shape"],
    [
      "order_created do staff",
      { ...created, actor: "staff", staffId: 1, name: "NV" },
      "osh_event_shape",
    ],
    [
      "status_changed do khách",
      { ...changed, actor: "customer", staffId: null },
      "osh_event_shape",
    ],
    [
      "status_changed thiếu from_status",
      { ...changed, from: null },
      "osh_event_shape",
    ],
    ["event_type lạ", { ...changed, event: "x" }, "osh_event_shape"],
    [
      "staff thiếu id",
      { ...changed, staffId: null },
      "osh_staff_actor_required",
    ],
    ["from_status lạ", { ...changed, from: "x" }, "osh_from_status_valid"],
    ["to_status lạ", { ...changed, to: "x" }, "osh_to_status_valid"],
    [
      "refund_outcome lạ",
      {
        event: "refund_outcome_recorded",
        from: "cancelled",
        to: "cancelled",
        refund: "x",
      },
      "osh_refund_outcome_valid",
    ],
  ])("từ chối %s", async (_name, row, constraint) => {
    expect(await history(row)).toMatchObject({ code: "23514", constraint });
  });
});
