import type { WishlistAction, WishlistState, WishlistToggleResult } from "./types";

/** Số sản phẩm tối đa trong danh sách yêu thích. */
export const MAX_WISHLIST_ITEMS = 50;

export const EMPTY_WISHLIST: WishlistState = { productIds: [] };

/** Cho biết bấm trái tim của `productId` sẽ thêm, bỏ hay bị từ chối vì danh sách đã đầy. */
export function getToggleResult(state: WishlistState, productId: string): WishlistToggleResult {
  if (state.productIds.includes(productId)) return "removed";
  return state.productIds.length >= MAX_WISHLIST_ITEMS ? "full" : "added";
}

export function wishlistReducer(state: WishlistState, action: WishlistAction): WishlistState {
  switch (action.type) {
    case "toggle": {
      const result = getToggleResult(state, action.productId);
      if (result === "full") return state;
      if (result === "removed") {
        return {
          productIds: state.productIds.filter((id) => id !== action.productId),
        };
      }
      return { productIds: [...state.productIds, action.productId] };
    }

    case "remove":
      if (!state.productIds.includes(action.productId)) return state;
      return {
        productIds: state.productIds.filter((id) => id !== action.productId),
      };

    case "clear":
      return state.productIds.length === 0 ? state : EMPTY_WISHLIST;
  }
}
