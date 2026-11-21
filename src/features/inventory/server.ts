import "server-only";
import { selectStockRows } from "./inventory-reader.pg";
import { pgStockLedger } from "./stock-ledger.pg";

/** Cổng ghi Tồn kho duy nhất, nối vào `createOrderService`. */
export const stockLedger = pgStockLedger;

/**
 * Nơi duy nhất đọc Tồn kho (AD-27). Id không có dòng `inventory` trả 0.
 * Lỗi DB là `DbFailure` đã làm sạch, người gọi tự quyết định xử lý.
 */
export async function readStock(
  ids: readonly string[],
): Promise<Record<string, number>> {
  const unique = [...new Set(ids)];
  const stock: Record<string, number> = Object.fromEntries(
    unique.map((id) => [id, 0]),
  );
  for (const row of await selectStockRows(unique)) {
    stock[row.productId] = row.stock;
  }
  return stock;
}
