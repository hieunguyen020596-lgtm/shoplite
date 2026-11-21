import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// File này không import từ features/ vì drizzle-kit không resolve alias `@/`.
// Giá trị trong CHECK phải khớp: ORDER_STATUSES (orders/types.ts),
// PAYMENT_METHODS (checkout/checkout-schema.ts), SHIPPING_METHODS (checkout/pricing.ts).

const timestamptz3 = (name: string) =>
  timestamp(name, { withTimezone: true, precision: 3 });

export const inventory = pgTable(
  "inventory",
  {
    productId: text("product_id").primaryKey(),
    stock: integer("stock").notNull(),
  },
  (table) => [check("inventory_stock_non_negative", sql`${table.stock} >= 0`)],
);

export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(),
    status: text("status").notNull(),
    version: integer("version").notNull().default(0),
    customerName: text("customer_name").notNull(),
    phoneNormalized: text("phone_normalized").notNull(),
    email: text("email"),
    address: text("address").notNull(),
    note: text("note"),
    shippingMethod: text("shipping_method").notNull(),
    paymentMethod: text("payment_method").notNull(),
    subtotal: integer("subtotal").notNull(),
    shippingFee: integer("shipping_fee").notNull(),
    total: integer("total").notNull(),
    refundRequired: boolean("refund_required").notNull().default(false),
    createdAt: timestamptz3("created_at").notNull().defaultNow(),
    updatedAt: timestamptz3("updated_at").notNull().defaultNow(),
  },
  (table) => [
    check(
      "orders_status_valid",
      sql`${table.status} IN ('pending', 'confirmed', 'shipping', 'delivered', 'cancelled')`,
    ),
    check(
      "orders_shipping_method_valid",
      sql`${table.shippingMethod} IN ('standard', 'express')`,
    ),
    check(
      "orders_payment_method_valid",
      sql`${table.paymentMethod} IN ('cod', 'bank_transfer')`,
    ),
    check(
      "orders_refund_required_valid",
      sql`NOT ${table.refundRequired} OR (${table.status} = 'cancelled' AND ${table.paymentMethod} = 'bank_transfer')`,
    ),
    index("orders_phone_status_idx").on(table.phoneNormalized, table.status),
    index("orders_status_created_idx").on(table.status, table.createdAt),
    index("orders_status_updated_id_idx").on(
      table.status,
      table.updatedAt.desc(),
      table.id.desc(),
    ),
    index("orders_refund_created_idx")
      .on(table.createdAt)
      .where(sql`${table.refundRequired}`),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    orderId: text("order_id").notNull(),
    productId: text("product_id").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    image: jsonb("image").notNull(),
    unitPrice: integer("unit_price").notNull(),
    quantity: integer("quantity").notNull(),
    lineTotal: integer("line_total").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.orderId, table.productId] }),
    foreignKey({
      name: "order_items_order_id_fk",
      columns: [table.orderId],
      foreignColumns: [orders.id],
    }),
    foreignKey({
      name: "order_items_product_id_fk",
      columns: [table.productId],
      foreignColumns: [inventory.productId],
    }).onDelete("restrict"),
    check("order_items_quantity_positive", sql`${table.quantity} > 0`),
  ],
);

export const orderStatusHistory = pgTable(
  "order_status_history",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id),
    eventType: text("event_type").notNull(),
    fromStatus: text("from_status"),
    toStatus: text("to_status"),
    reasonCode: text("reason_code"),
    reasonText: text("reason_text"),
    refundOutcome: text("refund_outcome"),
    actorType: text("actor_type").notNull(),
    // Khóa ngoại tới staff_accounts do Story 4.1 thêm bằng migration mới.
    actorStaffId: bigint("actor_staff_id", { mode: "number" }),
    actorName: text("actor_name").notNull(),
    createdAt: timestamptz3("created_at")
      .notNull()
      .default(sql`clock_timestamp()`),
  },
  (table) => [
    index("order_status_history_order_id_idx").on(table.orderId, table.id),
    check(
      "osh_event_type_valid",
      sql`${table.eventType} IN ('order_created', 'status_changed', 'refund_outcome_recorded')`,
    ),
    check(
      "osh_actor_type_valid",
      sql`${table.actorType} IN ('customer', 'staff')`,
    ),
    check(
      "osh_from_status_valid",
      sql`${table.fromStatus} IS NULL OR ${table.fromStatus} IN ('pending', 'confirmed', 'shipping', 'delivered', 'cancelled')`,
    ),
    check(
      "osh_to_status_valid",
      sql`${table.toStatus} IS NULL OR ${table.toStatus} IN ('pending', 'confirmed', 'shipping', 'delivered', 'cancelled')`,
    ),
    check(
      "osh_refund_outcome_valid",
      sql`${table.refundOutcome} IS NULL OR ${table.refundOutcome} IN ('refunded', 'customer_not_transferred')`,
    ),
    check(
      "osh_staff_actor_required",
      sql`${table.actorType} <> 'staff' OR ${table.actorStaffId} IS NOT NULL`,
    ),
    check(
      "osh_event_shape",
      sql`(
        ${table.eventType} = 'order_created'
        AND ${table.fromStatus} IS NULL
        AND ${table.toStatus} IS NOT DISTINCT FROM 'pending'
        AND ${table.reasonCode} IS NULL
        AND ${table.reasonText} IS NULL
        AND ${table.refundOutcome} IS NULL
        AND ${table.actorType} = 'customer'
        AND ${table.actorStaffId} IS NULL
        AND ${table.actorName} = 'Khách hàng'
      ) OR (
        ${table.eventType} = 'status_changed'
        AND ${table.fromStatus} IS NOT NULL
        AND ${table.toStatus} IS NOT NULL
        AND ${table.refundOutcome} IS NULL
        AND ${table.actorType} = 'staff'
      ) OR (
        ${table.eventType} = 'refund_outcome_recorded'
        AND ${table.refundOutcome} IS NOT NULL
        AND ${table.fromStatus} IS NOT NULL
        AND ${table.toStatus} IS NOT NULL
        AND ${table.reasonCode} IS NULL
        AND ${table.actorType} = 'staff'
      )`,
    ),
  ],
);

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStartedAt: timestamptz3("window_started_at").notNull(),
  count: integer("count").notNull(),
});
