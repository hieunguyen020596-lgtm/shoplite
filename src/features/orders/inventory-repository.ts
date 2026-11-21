import { promises as fs } from "node:fs";
import path from "node:path";
import { products } from "@/data/products";
import { writeJsonFileAtomic } from "@/lib/atomic-json";
import { StorageLock } from "@/lib/storage-lock";
import { OrderError } from "./order-errors";

export interface StockAdjustmentItem {
  productId: string;
  quantity: number;
}

/** Giao diện kho lưu trữ tồn kho khả dụng (AD-2, AD-10). */
export interface InventoryRepository {
  getStockMap(): Promise<Record<string, number>>;
  getStock(productId: string): Promise<number>;
  deduct(items: StockAdjustmentItem[]): Promise<void>;
  restock(items: StockAdjustmentItem[]): Promise<void>;
}

export const DEFAULT_INVENTORY_FILE = path.join(
  process.cwd(),
  "storage",
  "inventory.json",
);

const PRODUCT_NAME_BY_ID = new Map(
  products.map((product) => [product.id, product.name]),
);

function buildDefaultStockMap(): Record<string, number> {
  const stockMap: Record<string, number> = {};
  for (const product of products) {
    stockMap[product.id] = Math.max(0, Math.trunc(product.stock));
  }
  return stockMap;
}

function getProductDisplayName(productId: string): string {
  return PRODUCT_NAME_BY_ID.get(productId) ?? productId;
}

function aggregateQuantities(
  items: readonly StockAdjustmentItem[],
): Array<[string, number]> {
  const aggregated = new Map<string, number>();
  for (const item of items) {
    if (
      !item.productId ||
      !Number.isInteger(item.quantity) ||
      item.quantity <= 0
    ) {
      throw new OrderError(
        "VALIDATION_ERROR",
        "Số lượng điều chỉnh tồn kho không hợp lệ",
      );
    }
    aggregated.set(
      item.productId,
      (aggregated.get(item.productId) ?? 0) + item.quantity,
    );
  }
  return [...aggregated.entries()];
}

function deductFromStockMap(
  stockMap: Record<string, number>,
  items: readonly StockAdjustmentItem[],
): boolean {
  const merged = aggregateQuantities(items);
  if (merged.length === 0) {
    return false;
  }

  for (const [productId, quantity] of merged) {
    const available = stockMap[productId] ?? 0;
    if (quantity > available) {
      const name = getProductDisplayName(productId);
      throw new OrderError(
        "INSUFFICIENT_STOCK",
        available === 0
          ? `Sản phẩm "${name}" đã hết hàng`
          : `Sản phẩm "${name}" chỉ còn ${available} sản phẩm`,
        {
          productId,
          available: String(available),
          requested: String(quantity),
        },
      );
    }
  }

  for (const [productId, quantity] of merged) {
    stockMap[productId] = (stockMap[productId] ?? 0) - quantity;
  }

  return true;
}

function restockOnStockMap(
  stockMap: Record<string, number>,
  items: readonly StockAdjustmentItem[],
): boolean {
  const merged = aggregateQuantities(items);
  if (merged.length === 0) {
    return false;
  }

  for (const [productId, quantity] of merged) {
    stockMap[productId] = (stockMap[productId] ?? 0) + quantity;
  }

  return true;
}

function normalizeSeedEntries(
  stockMap: Record<string, number>,
  entries: unknown,
): Record<string, number> {
  if (
    typeof entries === "object" &&
    entries !== null &&
    !Array.isArray(entries)
  ) {
    for (const [productId, value] of Object.entries(entries)) {
      if (typeof value === "number" && Number.isFinite(value)) {
        stockMap[productId] = Math.max(0, Math.trunc(value));
      }
    }
  }
  return stockMap;
}

/** Kho tồn kho bền vững lưu dạng JSON phẳng `Record<productId, number>` qua StorageLock và file tạm UUID. */
export function createJsonFileInventoryRepository(
  filePath: string,
  storageLock: StorageLock = new StorageLock(),
): InventoryRepository {
  async function readOrSeedStockMap(): Promise<Record<string, number>> {
    try {
      const raw = await fs.readFile(filePath, "utf8");
      const parsed: unknown = JSON.parse(raw);
      return normalizeSeedEntries(buildDefaultStockMap(), parsed);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        const seeded = buildDefaultStockMap();
        await writeJsonFileAtomic(filePath, seeded);
        return seeded;
      }
      throw error;
    }
  }

  return {
    async getStockMap() {
      return storageLock.runExclusive(() => readOrSeedStockMap());
    },

    async getStock(productId) {
      return storageLock.runExclusive(async () => {
        const stockMap = await readOrSeedStockMap();
        return stockMap[productId] ?? 0;
      });
    },

    async deduct(items) {
      await storageLock.runExclusive(async () => {
        const stockMap = await readOrSeedStockMap();
        if (deductFromStockMap(stockMap, items)) {
          await writeJsonFileAtomic(filePath, stockMap);
        }
      });
    },

    async restock(items) {
      await storageLock.runExclusive(async () => {
        const stockMap = await readOrSeedStockMap();
        if (restockOnStockMap(stockMap, items)) {
          await writeJsonFileAtomic(filePath, stockMap);
        }
      });
    },
  };
}

/** Kho tồn kho trong bộ nhớ - dùng cho unit/route test và tương thích ngược OrderService. */
export function createInMemoryInventoryRepository(
  seed?: Record<string, number>,
): InventoryRepository {
  const stockMap = normalizeSeedEntries(buildDefaultStockMap(), seed);

  return {
    async getStockMap() {
      return { ...stockMap };
    },

    async getStock(productId) {
      return stockMap[productId] ?? 0;
    },

    async deduct(items) {
      deductFromStockMap(stockMap, items);
    },

    async restock(items) {
      restockOnStockMap(stockMap, items);
    },
  };
}
