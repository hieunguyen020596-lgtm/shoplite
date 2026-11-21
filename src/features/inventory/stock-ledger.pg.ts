import { eq, sql } from "drizzle-orm";
import { inventory } from "@/db/schema";
import { toDrizzleTx } from "@/db/transaction";
import {
  OrderError,
  type OrderLineShortage,
} from "@/features/orders/order-errors";
import type { DbTx } from "@/lib/db-tx";
import {
  compareProductId,
  type StockLine,
  type StockLedger,
} from "./stock-ledger";

export async function reserveStock(
  tx: DbTx,
  lines: readonly StockLine[],
): Promise<void> {
  const db = toDrizzleTx(tx);
  const sorted = [...lines].sort((a, b) =>
    compareProductId(a.productId, b.productId),
  );
  const shortages: OrderLineShortage[] = [];

  for (const { productId, quantity } of sorted) {
    const updated = await db
      .update(inventory)
      .set({ stock: sql`${inventory.stock} - ${quantity}` })
      .where(
        sql`${inventory.productId} = ${productId} AND ${inventory.stock} >= ${quantity}`,
      )
      .returning({ productId: inventory.productId });
    if (updated.length > 0) continue;

    // Câu đọc riêng sau khi UPDATE không khớp dòng nào.
    const rows = await db
      .select({ stock: inventory.stock })
      .from(inventory)
      .where(eq(inventory.productId, productId));
    const readable = rows[0]?.stock ?? 0;
    shortages.push({
      productId,
      requested: quantity,
      available: Math.max(0, Math.min(readable, quantity - 1)),
    });
  }

  if (shortages.length > 0) {
    throw new OrderError(
      "INSUFFICIENT_STOCK",
      "Một số sản phẩm không đủ hàng",
      { lines: shortages },
    );
  }
}

export const pgStockLedger: StockLedger = { reserveStock };
