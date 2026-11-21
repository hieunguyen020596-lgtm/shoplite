import type { Product } from "@/features/catalog/types";
import type { CartAction, CartItem, CartState } from "./types";

/** Số lượng tối đa của một sản phẩm trong một đơn hàng. */
export const MAX_QUANTITY_PER_ITEM = 10;

export const EMPTY_CART: CartState = { items: [] };

/** Số lượng tối đa được phép mua, giới hạn bởi tồn kho và MAX_QUANTITY_PER_ITEM. */
export function getMaxQuantity(stock: number): number {
  if (!Number.isFinite(stock)) return MAX_QUANTITY_PER_ITEM;
  return Math.max(0, Math.min(stock, MAX_QUANTITY_PER_ITEM));
}

/**
 * Số lượng mới của một dòng giỏ.
 * - Tăng: tối đa `max(current, min(stock, 10))`, không tự giảm số đã có.
 * - Giảm: tối thiểu 1.
 * - `stock` không biết (lỗi tải tồn) thì giới hạn 10; server kiểm lần cuối.
 */
export function capQuantity(
  current: number,
  requested: number,
  stock: number = MAX_QUANTITY_PER_ITEM,
): number {
  const whole = Math.floor(requested);
  if (!Number.isFinite(whole)) return Math.max(1, current);
  if (whole <= current) return Math.max(1, whole);
  return Math.min(whole, Math.max(current, getMaxQuantity(stock)));
}

export function toCartItem(product: Product): Omit<CartItem, "quantity"> {
  return {
    productId: product.id,
    slug: product.slug,
    name: product.name,
    price: product.price,
    image: product.image,
  };
}

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "add": {
      const { item, quantity } = action;
      const stock = Number.isFinite(action.stock) ? action.stock : undefined;
      if (!Number.isFinite(quantity) || quantity < 1) return state;
      if (stock !== undefined && getMaxQuantity(stock) === 0) return state;

      const existing = state.items.find(
        (line) => line.productId === item.productId,
      );
      if (!existing) {
        return {
          items: [
            ...state.items,
            { ...item, quantity: Math.max(1, capQuantity(0, quantity, stock)) },
          ],
        };
      }
      return {
        items: state.items.map((line) =>
          line.productId === item.productId
            ? {
                ...line,
                ...item,
                quantity: capQuantity(
                  line.quantity,
                  line.quantity + quantity,
                  stock,
                ),
              }
            : line,
        ),
      };
    }

    case "update-quantity":
      return {
        items: state.items.map((line) =>
          line.productId === action.productId
            ? {
                ...line,
                quantity: capQuantity(
                  line.quantity,
                  action.quantity,
                  action.stock,
                ),
              }
            : line,
        ),
      };

    case "remove":
      return {
        items: state.items.filter(
          (line) => line.productId !== action.productId,
        ),
      };

    case "clear":
      return EMPTY_CART;
  }
}

export function getCartItemCount(state: CartState): number {
  return state.items.reduce((sum, line) => sum + line.quantity, 0);
}

export function getCartSubtotal(state: CartState): number {
  return state.items.reduce((sum, line) => sum + line.price * line.quantity, 0);
}
