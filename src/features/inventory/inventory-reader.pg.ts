import { inArray } from "drizzle-orm";
import { withDb } from "@/db/transaction";
import { inventory } from "@/db/schema";

/** Đọc Tồn kho theo id. Chỉ trả các dòng có trong bảng; id thiếu dòng do `readStock` bù 0. */
export async function selectStockRows(
  ids: readonly string[],
): Promise<Array<{ productId: string; stock: number }>> {
  if (ids.length === 0) return [];
  return withDb((db) =>
    db
      .select({ productId: inventory.productId, stock: inventory.stock })
      .from(inventory)
      .where(inArray(inventory.productId, [...ids])),
  );
}
