import type { ToggleResult, WishlistAction, WishlistState } from "./types";

/** Số sản phẩm tối đa trong danh sách yêu thích. */
export const WISHLIST_MAX_ITEMS = 50;

export const EMPTY_WISHLIST: WishlistState = { productIds: [] };

export function isInWishlist(state: WishlistState, productId: string): boolean {
  return state.productIds.includes(productId);
}

export function getWishlistCount(state: WishlistState): number {
  return state.productIds.length;
}

/** Kết quả nếu toggle `productId` trên `state` hiện tại. */
export function getToggleResult(state: WishlistState, productId: string): ToggleResult {
  if (isInWishlist(state, productId)) return "removed";
  return getWishlistCount(state) >= WISHLIST_MAX_ITEMS ? "full" : "added";
}

/**
 * Hàm thuần cập nhật danh sách yêu thích.
 * Không có gì thay đổi thì trả lại đúng `state` cũ (cùng tham chiếu) để store không ghi/emit thừa.
 */
export function wishlistReducer(state: WishlistState, action: WishlistAction): WishlistState {
  switch (action.type) {
    case "toggle": {
      const result = getToggleResult(state, action.productId);
      if (result === "full") return state;
      if (result === "removed") {
        return { productIds: state.productIds.filter((id) => id !== action.productId) };
      }
      return { productIds: [...state.productIds, action.productId] };
    }

    case "remove":
      if (!isInWishlist(state, action.productId)) return state;
      return { productIds: state.productIds.filter((id) => id !== action.productId) };

    case "prune": {
      const known = new Set(action.knownIds);
      const productIds = state.productIds.filter((id) => known.has(id));
      return productIds.length === state.productIds.length ? state : { productIds };
    }

    case "clear":
      return state.productIds.length === 0 ? state : EMPTY_WISHLIST;
  }
}

/**
 * Làm sạch dữ liệu đọc từ localStorage, không bao giờ ném lỗi:
 * sai cấu trúc → rỗng; bỏ từng phần tử không phải chuỗi/chuỗi rỗng, bỏ trùng, giữ tối đa 50 mã đầu.
 */
export function sanitizeWishlist(value: unknown): WishlistState {
  if (typeof value !== "object" || value === null) return EMPTY_WISHLIST;
  const raw = (value as { productIds?: unknown }).productIds;
  if (!Array.isArray(raw)) return EMPTY_WISHLIST;

  const productIds = [
    ...new Set(raw.filter((id): id is string => typeof id === "string" && id.trim() !== "")),
  ].slice(0, WISHLIST_MAX_ITEMS);
  return { productIds };
}
