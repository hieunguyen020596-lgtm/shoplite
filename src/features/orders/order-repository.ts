import type { DbTx } from "@/lib/db-tx";
import type { Order } from "./types";

/** Đơn chưa ghi: `createdAt` và `updatedAt` do database cấp. */
export type NewOrder = Omit<Order, "createdAt" | "updatedAt">;

/** Nơi lưu đơn hàng. Cài đặt PostgreSQL ở `order-repository.pg.ts`. */
export interface OrderRepository {
  /** Ghi đơn, dòng hàng và đúng một dòng Lịch sử `order_created` trong transaction của người gọi. */
  insertOrder(tx: DbTx, order: NewOrder): Promise<Order>;
  findAll(): Promise<Order[]>;
  findById(id: string): Promise<Order | null>;
}
