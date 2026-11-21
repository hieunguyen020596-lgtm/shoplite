import { StorageLock } from "@/lib/storage-lock";
import {
  createJsonFileInventoryRepository,
  DEFAULT_INVENTORY_FILE,
} from "./inventory-repository";
import {
  createJsonFileOrderRepository,
  DEFAULT_ORDERS_FILE,
} from "./order-repository";
import { createOrderService } from "./order-service";

/**
 * Các singleton chạy trên server dùng chung một StorageLock (AD-6).
 * Chỉ import file này từ code chạy trên server (Server Component, Route Handler) vì nó đọc/ghi file hệ thống.
 *
 * Đổi nơi lưu bằng biến môi trường ORDERS_FILE (mặc định: storage/orders.json)
 * và INVENTORY_FILE (mặc định: storage/inventory.json).
 */
export const storageLock = new StorageLock();

export const inventoryRepository = createJsonFileInventoryRepository(
  process.env.INVENTORY_FILE ?? DEFAULT_INVENTORY_FILE,
  storageLock,
);

export const orderRepository = createJsonFileOrderRepository(
  process.env.ORDERS_FILE ?? DEFAULT_ORDERS_FILE,
  storageLock,
);

export const orderService = createOrderService({
  repository: orderRepository,
  inventoryRepository,
  storageLock,
});
