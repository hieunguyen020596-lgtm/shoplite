import { promises as fs } from "node:fs";
import path from "node:path";
import { writeJsonFileAtomic } from "@/lib/atomic-json";
import { StorageLock } from "@/lib/storage-lock";
import type { Order } from "./types";

/** Nơi lưu trữ đơn hàng. Có thể thay bằng database thật mà không đổi order-service. */
export interface OrderRepository {
  findAll(): Promise<Order[]>;
  findById(id: string): Promise<Order | null>;
  /** Thêm mới hoặc cập nhật (theo id). */
  save(order: Order): Promise<void>;
}

export const DEFAULT_ORDERS_FILE = path.join(
  process.cwd(),
  "storage",
  "orders.json",
);

/** Lưu đơn hàng vào một file JSON - tuần tự hóa qua StorageLock và ghi nguyên tử bằng file tạm UUID. */
export function createJsonFileOrderRepository(
  filePath: string,
  storageLock: StorageLock = new StorageLock(),
): OrderRepository {
  async function readAll(): Promise<Order[]> {
    try {
      const raw = await fs.readFile(filePath, "utf8");
      const data: unknown = JSON.parse(raw);
      return Array.isArray(data) ? (data as Order[]) : [];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }

  return {
    findAll: () => storageLock.runExclusive(() => readAll()),

    async findById(id) {
      return storageLock.runExclusive(async () => {
        const orders = await readAll();
        return orders.find((order) => order.id === id) ?? null;
      });
    },

    async save(order) {
      await storageLock.runExclusive(async () => {
        const orders = await readAll();
        const index = orders.findIndex((item) => item.id === order.id);
        if (index >= 0) {
          orders[index] = order;
        } else {
          orders.push(order);
        }
        await writeJsonFileAtomic(filePath, orders);
      });
    },
  };
}

/** Repository trong bộ nhớ - dùng cho unit test. */
export function createInMemoryOrderRepository(
  seed: Order[] = [],
): OrderRepository {
  const orders = new Map(
    seed.map((order) => [order.id, structuredClone(order)]),
  );

  return {
    async findAll() {
      return [...orders.values()].map((order) => structuredClone(order));
    },
    async findById(id) {
      const order = orders.get(id);
      return order ? structuredClone(order) : null;
    },
    async save(order) {
      orders.set(order.id, structuredClone(order));
    },
  };
}
