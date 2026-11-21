import type { DbTx } from "@/lib/db-tx";

export interface StockLine {
  productId: string;
  quantity: number;
}

/** Cổng ghi Tồn kho. Cài đặt SQL ở `stock-ledger.pg.ts`. */
export interface StockLedger {
  /**
   * Trừ tồn cho mọi dòng, tuần tự theo `productId` tăng dần, trong transaction của người gọi.
   * Thiếu hàng ở bất kỳ dòng nào thì ném `OrderError` `INSUFFICIENT_STOCK` kèm `details.lines`.
   */
  reserveStock(tx: DbTx, lines: readonly StockLine[]): Promise<void>;
}

/** So sánh code unit (không theo locale), dùng để khóa dòng theo thứ tự ổn định. */
export function compareProductId(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
