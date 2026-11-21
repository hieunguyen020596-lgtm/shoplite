import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { orderItems, orders, orderStatusHistory } from "@/db/schema";
import { toDrizzleTx, withDb } from "@/db/transaction";
import type { ProductImage } from "@/features/catalog/types";
import type { PaymentMethod } from "@/features/checkout/checkout-schema";
import { normalizePhone } from "@/features/checkout/phone";
import type { ShippingMethod } from "@/features/checkout/pricing";
import { compareProductId } from "@/features/inventory/stock-ledger";
import type { DbTx } from "@/lib/db-tx";
import type { NewOrder, OrderRepository } from "./order-repository";
import type { Order, OrderItem, OrderStatus } from "./types";

type OrderRow = typeof orders.$inferSelect;
type ItemRow = typeof orderItems.$inferSelect;

function toItem(row: ItemRow): OrderItem {
  return {
    productId: row.productId,
    slug: row.slug,
    name: row.name,
    image: row.image as ProductImage,
    unitPrice: row.unitPrice,
    quantity: row.quantity,
    lineTotal: row.lineTotal,
  };
}

function toOrder(row: OrderRow, items: ItemRow[]): Order {
  return {
    id: row.id,
    status: row.status as OrderStatus,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    customer: {
      fullName: row.customerName,
      // Database chỉ lưu số đã chuẩn hóa.
      phone: row.phoneNormalized,
      email: row.email ?? undefined,
      address: row.address,
      note: row.note ?? undefined,
    },
    shippingMethod: row.shippingMethod as ShippingMethod,
    paymentMethod: row.paymentMethod as PaymentMethod,
    // Một thứ tự duy nhất cho cả ba đường (không phụ thuộc collation của DB).
    items: [...items]
      .sort((a, b) => compareProductId(a.productId, b.productId))
      .map(toItem),
    subtotal: row.subtotal,
    shippingFee: row.shippingFee,
    total: row.total,
  };
}

export async function lockPhone(tx: DbTx, phone: string): Promise<void> {
  await toDrizzleTx(tx).execute(
    sql`SELECT pg_advisory_xact_lock(hashtextextended(${`shoplite:phone:${phone}`}, 0))`,
  );
}

export async function countPendingByPhone(
  tx: DbTx,
  phone: string,
): Promise<number> {
  const [row] = await toDrizzleTx(tx)
    .select({ n: count() })
    .from(orders)
    .where(
      and(eq(orders.phoneNormalized, phone), eq(orders.status, "pending")),
    );
  return row.n;
}

export async function insertOrder(tx: DbTx, order: NewOrder): Promise<Order> {
  const db = toDrizzleTx(tx);
  const phone = normalizePhone(order.customer.phone);
  if (phone === null) throw new Error("Invalid phone for insertOrder");

  const [row] = await db
    .insert(orders)
    .values({
      id: order.id,
      status: order.status,
      customerName: order.customer.fullName,
      phoneNormalized: phone,
      email: order.customer.email ?? null,
      address: order.customer.address,
      note: order.customer.note ?? null,
      shippingMethod: order.shippingMethod,
      paymentMethod: order.paymentMethod,
      subtotal: order.subtotal,
      shippingFee: order.shippingFee,
      total: order.total,
    })
    .returning();

  const itemRows = await db
    .insert(orderItems)
    .values(
      order.items.map((item) => ({
        orderId: order.id,
        productId: item.productId,
        name: item.name,
        slug: item.slug,
        image: item.image,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        lineTotal: item.lineTotal,
      })),
    )
    .returning();

  await db.insert(orderStatusHistory).values({
    orderId: order.id,
    eventType: "order_created",
    toStatus: "pending",
    actorType: "customer",
    actorName: "Khách hàng",
  });

  return toOrder(row, itemRows);
}

async function findById(id: string): Promise<Order | null> {
  return withDb(async (db) => {
    const [row] = await db.select().from(orders).where(eq(orders.id, id));
    if (!row) return null;
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, id));
    return toOrder(row, items);
  });
}

async function findAll(): Promise<Order[]> {
  return withDb(async (db) => {
    const rows = await db
      .select()
      .from(orders)
      .orderBy(desc(orders.createdAt), desc(orders.id));
    if (rows.length === 0) return [];
    const items = await db
      .select()
      .from(orderItems)
      .where(
        inArray(
          orderItems.orderId,
          rows.map((row) => row.id),
        ),
      );
    const byOrder = new Map<string, ItemRow[]>();
    for (const item of items) {
      const list = byOrder.get(item.orderId) ?? [];
      list.push(item);
      byOrder.set(item.orderId, list);
    }
    return rows.map((row) => toOrder(row, byOrder.get(row.id) ?? []));
  });
}

export const pgOrderRepository: OrderRepository = {
  lockPhone,
  countPendingByPhone,
  insertOrder,
  findById,
  findAll,
};
