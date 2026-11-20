import type { WishlistAction, WishlistState } from "./types";

/** Số lượng sản phẩm tối đa được lưu trong danh sách yêu thích. */
export const MAX_WISHLIST_ITEMS = 50;

export const EMPTY_WISHLIST: WishlistState = { productIds: [] };

export function wishlistReducer(
  state: WishlistState,
  action: WishlistAction,
): WishlistState {
  switch (action.type) {
    case "toggle": {
      const exists = state.productIds.includes(action.productId);
      if (exists) {
        return {
          productIds: state.productIds.filter((id) => id !== action.productId),
        };
      }
      if (state.productIds.length >= MAX_WISHLIST_ITEMS) {
        return state;
      }
      return {
        productIds: [...state.productIds, action.productId],
      };
    }

    case "add": {
      if (state.productIds.includes(action.productId)) return state;
      if (state.productIds.length >= MAX_WISHLIST_ITEMS) return state;
      return {
        productIds: [...state.productIds, action.productId],
      };
    }

    case "remove": {
      if (!state.productIds.includes(action.productId)) return state;
      return {
        productIds: state.productIds.filter((id) => id !== action.productId),
      };
    }

    case "clear":
      return EMPTY_WISHLIST;
  }
}

export function getWishlistItemCount(state: WishlistState): number {
  return state.productIds.length;
}

export function isWishlisted(state: WishlistState, productId: string): boolean {
  return state.productIds.includes(productId);
}
