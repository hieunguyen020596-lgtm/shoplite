import { getProductById } from "@/features/catalog/catalog-service";
import type { Product } from "@/features/catalog/types";
import {
  placeOrderSchema,
  toFieldErrors,
} from "@/features/checkout/checkout-schema";
import { MAX_QUANTITY_PER_ITEM } from "@/features/cart/cart-reducer";
import { calculateOrderTotals } from "@/features/checkout/pricing";
import { normalizePhone } from "@/features/checkout/phone";
import {
  compareProductId,
  type StockLedger,
} from "@/features/inventory/stock-ledger";
import type { RunInTransaction } from "@/lib/db-tx";
import { OrderError } from "./order-errors";
import type { NewOrder, OrderRepository } from "./order-repository";
import type { Order, OrderItem } from "./types";

export interface OrderServiceDeps {
  runInTransaction: RunInTransaction;
  repository: OrderRepository;
  stockLedger: StockLedger;
  findProduct?: (id: string) => Product | undefined;
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
function mergeItems(items: { productId: string; quantity: number }[]) {
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
  runInTransaction,
  repository,
  stockLedger,
  findProduct = getProductById,
  generateId = generateOrderId,
}: OrderServiceDeps) {
  return {
    /**
     * Tạo đơn hàng mới từ payload của client.
     * Zod, gộp dòng, kiểm giới hạn và tính tiền xong trước khi mở transaction.
     * Trong đúng một transaction: `reserveStock` rồi `insertOrder` (kèm Lịch sử `order_created`).
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

      const phone = normalizePhone(customer.phone);
      if (phone === null) {
        throw new OrderError(
          "VALIDATION_ERROR",
          "Thông tin đơn hàng không hợp lệ",
          { "customer.phone": "Số điện thoại không hợp lệ" },
        );
      }

      const merged = mergeItems(items).sort((a, b) =>
        compareProductId(a.productId, b.productId),
      );
      if (merged.some((item) => item.quantity > MAX_QUANTITY_PER_ITEM)) {
        throw new OrderError(
          "VALIDATION_ERROR",
          "Thông tin đơn hàng không hợp lệ",
          {
            items: `Mỗi sản phẩm tối đa ${MAX_QUANTITY_PER_ITEM} sản phẩm mỗi đơn`,
          },
        );
      }

      const orderItems: OrderItem[] = merged.map(({ productId, quantity }) => {
        const product = findProduct(productId);
        if (!product) {
          throw new OrderError(
            "PRODUCT_NOT_FOUND",
            `Không tìm thấy sản phẩm "${productId}"`,
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
      });

      const order: NewOrder = {
        id: generateId(new Date()),
        status: "pending",
        customer: {
          fullName: customer.fullName,
          phone,
          email: customer.email || undefined,
          address: customer.address,
          note: customer.note || undefined,
        },
        shippingMethod,
        paymentMethod,
        items: orderItems,
        ...calculateOrderTotals(orderItems, shippingMethod),
      };

      return runInTransaction(async (tx) => {
        await stockLedger.reserveStock(
          tx,
          orderItems.map(({ productId, quantity }) => ({
            productId,
            quantity,
          })),
        );
        return repository.insertOrder(tx, order);
      });
    },

    /** Danh sách đơn hàng, mới nhất trước. */
    listOrders(): Promise<Order[]> {
      return repository.findAll();
    },

    async getOrder(id: string): Promise<Order> {
      const order = await repository.findById(id);
      if (!order) {
        throw new OrderError(
          "ORDER_NOT_FOUND",
          `Không tìm thấy đơn hàng "${id}"`,
        );
      }
      return order;
    },
  };
}

export type OrderService = ReturnType<typeof createOrderService>;
