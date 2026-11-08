import {
  MAX_WISHLIST_ITEMS,
  type WishlistAction,
  type WishlistState,
} from "./types";

export const EMPTY_WISHLIST: WishlistState = {
  productIds: [],
};

/**
 * Kiểm tra xem một sản phẩm đã có trong danh sách yêu thích hay chưa.
 */
export function isInWishlist(state: WishlistState, productId: string): boolean {
  if (!productId) return false;
  return state.productIds.includes(productId);
}

/**
 * Reducer thuần túy quản lý trạng thái danh sách yêu thích.
 * - Giới hạn tối đa 50 sản phẩm.
 * - Toggle thêm/bỏ thích an toàn.
 * - Tự động loại bỏ id không hợp lệ.
 */
export function wishlistReducer(
  state: WishlistState = EMPTY_WISHLIST,
  action: WishlistAction,
): WishlistState {
  switch (action.type) {
    case "toggle": {
      const { productId } = action;
      if (!productId || typeof productId !== "string") {
        return state;
      }
      const trimmedId = productId.trim();
      if (!trimmedId) return state;

      if (state.productIds.includes(trimmedId)) {
        return {
          productIds: state.productIds.filter((id) => id !== trimmedId),
        };
      }

      if (state.productIds.length >= MAX_WISHLIST_ITEMS) {
        return state;
      }

      return {
        productIds: [...state.productIds, trimmedId],
      };
    }

    case "add": {
      const { productId } = action;
      if (!productId || typeof productId !== "string") {
        return state;
      }
      const trimmedId = productId.trim();
      if (!trimmedId || state.productIds.includes(trimmedId)) {
        return state;
      }

      if (state.productIds.length >= MAX_WISHLIST_ITEMS) {
        return state;
      }

      return {
        productIds: [...state.productIds, trimmedId],
      };
    }

    case "remove": {
      const { productId } = action;
      return {
        productIds: state.productIds.filter((id) => id !== productId),
      };
    }

    case "clear":
      return EMPTY_WISHLIST;

    default:
      return state;
  }
}
