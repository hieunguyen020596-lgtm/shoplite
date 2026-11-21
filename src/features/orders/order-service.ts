import { getProductById } from "@/features/catalog/catalog-service";
import type { Product } from "@/features/catalog/types";
import {
  placeOrderSchema,
  toFieldErrors,
} from "@/features/checkout/checkout-schema";
import { calculateOrderTotals } from "@/features/checkout/pricing";
import { StorageLock } from "@/lib/storage-lock";
import {
  createInMemoryInventoryRepository,
  type InventoryRepository,
  type StockAdjustmentItem,
} from "./inventory-repository";
import { OrderError } from "./order-errors";
import type { OrderRepository } from "./order-repository";
import { markOrderRestocked, transitionOrder } from "./order-state-machine";
import type { Order, OrderActor, OrderItem, OrderStatus } from "./types";

export interface TransitionOrderStatusInput {
  status: OrderStatus;
  actor: OrderActor;
  note?: string;
  expectedStatus?: OrderStatus;
}

export interface OrderServiceDeps {
  repository: OrderRepository;
  inventoryRepository?: InventoryRepository;
  storageLock?: StorageLock;
  findProduct?: (id: string) => Product | undefined;
  now?: () => Date;
  generateId?: (date: Date) => string;
}

/** Mã đơn hàng dạng SL-20261021-4F9A2C */
export function generateOrderId(date: Date): string {
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, "");
  const random = crypto
    .randomUUID()
    .replace(/-/g, "")
    .slice(0, 6)
    .toUpperCase();
  return `SL-${ymd}-${random}`;
}

/** Gộp các dòng trùng productId: [{p1, 2}, {p1, 1}] -> [{p1, 3}] */
function mergeItems(
  items: readonly StockAdjustmentItem[],
): StockAdjustmentItem[] {
  const merged = new Map<string, number>();
  for (const item of items) {
    merged.set(
      item.productId,
      (merged.get(item.productId) ?? 0) + item.quantity,
    );
  }
  return [...merged.entries()].map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

export function createOrderService({
  repository,
  inventoryRepository = createInMemoryInventoryRepository(),
  storageLock = new StorageLock(),
  findProduct = getProductById,
  now = () => new Date(),
  generateId = generateOrderId,
}: OrderServiceDeps) {
  async function findOrderOrThrow(id: string): Promise<Order> {
    const order = await repository.findById(id);
    if (!order) {
      throw new OrderError(
        "ORDER_NOT_FOUND",
        `Không tìm thấy đơn hàng "${id}"`,
      );
    }
    return order;
  }

  async function saveOrderAndRestockIfNeeded(
    previousOrder: Order,
    nextOrder: Order,
    shouldRestock: boolean,
  ): Promise<Order> {
    await repository.save(nextOrder);
    if (shouldRestock && nextOrder.items.length > 0) {
      const restockItems = mergeItems(nextOrder.items);
      try {
        await inventoryRepository.restock(restockItems);
      } catch (error) {
        try {
          await repository.save(previousOrder);
        } catch (rollbackError) {
          console.error(
            "Không thể hoàn tác đơn hàng sau khi hoàn kho thất bại:",
            rollbackError,
          );
        }
        throw error;
      }
    }
    return nextOrder;
  }

  async function getOrder(id: string): Promise<Order> {
    return storageLock.runExclusive(() => findOrderOrThrow(id));
  }

  async function transitionOrderStatus(
    id: string,
    input: TransitionOrderStatusInput,
  ): Promise<Order> {
    return storageLock.runExclusive(async () => {
      const order = await findOrderOrThrow(id);
      const { order: nextOrder, shouldRestock } = transitionOrder(order, {
        to: input.status,
        actor: input.actor,
        now: now(),
        note: input.note,
        expectedStatus: input.expectedStatus,
      });
      return saveOrderAndRestockIfNeeded(order, nextOrder, shouldRestock);
    });
  }

  async function restockCancelledOrder(
    id: string,
    note?: string,
  ): Promise<Order> {
    return storageLock.runExclusive(async () => {
      const order = await findOrderOrThrow(id);
      const nextOrder = markOrderRestocked(order, {
        now: now(),
        note,
      });
      return saveOrderAndRestockIfNeeded(order, nextOrder, true);
    });
  }

  return {
    /**
     * Tạo đơn hàng mới từ payload của client.
     * - Validate dữ liệu bằng placeOrderSchema
     * - Lấy giá từ catalog (bỏ qua mọi giá client gửi lên)
     * - Kiểm tra & trừ kho all-or-nothing trong StorageLock, tự rollback nếu lưu đơn lỗi
     */
    async placeOrder(input: unknown): Promise<Order> {
      const parsed = placeOrderSchema.safeParse(input);
      if (!parsed.success) {
        throw new OrderError(
          "VALIDATION_ERROR",
          "Thông tin đơn hàng không hợp lệ",
          toFieldErrors(parsed.error),
        );
      }

      const { customer, items, shippingMethod, paymentMethod } = parsed.data;
      const mergedItems = mergeItems(items);

      return storageLock.runExclusive(async () => {
        const stockMap = await inventoryRepository.getStockMap();
        const orderItems: OrderItem[] = mergedItems.map(
          ({ productId, quantity }) => {
            const product = findProduct(productId);
            if (!product) {
              throw new OrderError(
                "PRODUCT_NOT_FOUND",
                `Không tìm thấy sản phẩm "${productId}"`,
              );
            }
            const availableStock = stockMap[productId] ?? 0;
            if (quantity > availableStock) {
              throw new OrderError(
                "INSUFFICIENT_STOCK",
                availableStock === 0
                  ? `Sản phẩm "${product.name}" đã hết hàng`
                  : `Sản phẩm "${product.name}" chỉ còn ${availableStock} sản phẩm`,
                {
                  productId,
                  available: String(availableStock),
                  requested: String(quantity),
                },
              );
            }
            return {
              productId: product.id,
              slug: product.slug,
              name: product.name,
              image: product.image,
              unitPrice: product.price,
              quantity,
              lineTotal: product.price * quantity,
            };
          },
        );

        const createdAt = now();
        const createdAtIso = createdAt.toISOString();
        const order: Order = {
          id: generateId(createdAt),
          status: "pending",
          createdAt: createdAtIso,
          updatedAt: createdAtIso,
          customer: {
            fullName: customer.fullName,
            phone: customer.phone,
            email: customer.email || undefined,
            address: customer.address,
            note: customer.note || undefined,
          },
          shippingMethod,
          paymentMethod,
          items: orderItems,
          ...calculateOrderTotals(orderItems, shippingMethod),
          statusHistory: [
            {
              status: "pending",
              at: createdAtIso,
              actor: "customer",
              action: "transition",
            },
          ],
        };

        await inventoryRepository.deduct(mergedItems);
        try {
          await repository.save(order);
        } catch (error) {
          try {
            await inventoryRepository.restock(mergedItems);
          } catch (rollbackError) {
            console.error(
              "Không thể hoàn kho sau khi lưu đơn hàng thất bại:",
              rollbackError,
            );
          }
          throw error;
        }
        return order;
      });
    },

    /** Danh sách đơn hàng, mới nhất trước. */
    async listOrders(): Promise<Order[]> {
      return storageLock.runExclusive(async () => {
        const orders = await repository.findAll();
        return orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      });
    },

    getOrder,

    /** Chuyển trạng thái đơn hàng qua máy trạng thái thuần túy (AD-4, AD-10). */
    transitionOrderStatus,

    /** Xác nhận nhận hàng hoàn kho 1 lần (idempotent) cho đơn đã hủy khi đang giao. */
    restockCancelledOrder,

    /** Khách hàng chỉ được hủy đơn khi đơn còn ở trạng thái "Chờ xác nhận". */
    async cancelOrder(id: string): Promise<Order> {
      return transitionOrderStatus(id, {
        status: "cancelled",
        actor: "customer",
      });
    },
  };
}

export type OrderService = ReturnType<typeof createOrderService>;
