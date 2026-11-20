import type { Product } from "@/features/catalog/types";
import type { WishlistState, WishlistToggleResult } from "./types";

/** Số sản phẩm tối đa trong danh sách yêu thích. */
export const MAX_WISHLIST_ITEMS = 50;

export const EMPTY_WISHLIST: WishlistState = { productIds: [] };

export function isInWishlist(state: WishlistState, productId: string): boolean {
  return state.productIds.includes(productId);
}

/**
 * Thích hoặc bỏ thích một sản phẩm.
 * Khi danh sách đã đầy và có `knownIds`, các id không còn trong catalog được dọn trước khi xét giới hạn.
 * Nếu vẫn đầy thì trả về nguyên `state` (cùng tham chiếu) để store bỏ qua ghi/emit.
 */
export function toggleWishlist(
  state: WishlistState,
  productId: string,
  knownIds?: ReadonlySet<string>,
): { state: WishlistState; result: WishlistToggleResult } {
  if (isInWishlist(state, productId)) {
    return { state: removeFromWishlist(state, productId), result: "removed" };
  }

  let productIds = state.productIds;
  if (productIds.length >= MAX_WISHLIST_ITEMS && knownIds) {
    productIds = productIds.filter((id) => knownIds.has(id));
  }
  if (productIds.length >= MAX_WISHLIST_ITEMS) {
    return { state, result: "full" };
  }
  return { state: { productIds: [...productIds, productId] }, result: "added" };
}

export function removeFromWishlist(state: WishlistState, productId: string): WishlistState {
  if (!isInWishlist(state, productId)) return state;
  return { productIds: state.productIds.filter((id) => id !== productId) };
}

/**
 * Làm sạch dữ liệu đọc từ localStorage: giữ id dạng chuỗi khác rỗng, bỏ trùng,
 * cắt còn tối đa MAX_WISHLIST_ITEMS. Dữ liệu sai định dạng → danh sách rỗng.
 */
export function sanitizeWishlist(value: unknown): WishlistState {
  if (typeof value !== "object" || value === null) return EMPTY_WISHLIST;
  const raw = (value as { productIds?: unknown }).productIds;
  if (!Array.isArray(raw)) return EMPTY_WISHLIST;

  const productIds = [
    ...new Set(raw.filter((id): id is string => typeof id === "string" && id.length > 0)),
  ].slice(0, MAX_WISHLIST_ITEMS);
  return productIds.length === 0 ? EMPTY_WISHLIST : { productIds };
}

/** Tra id sang sản phẩm trong catalog, giữ thứ tự đã thích và bỏ id không còn tồn tại. */
export function resolveWishlistProducts(
  productIds: readonly string[],
  products: readonly Product[],
): Product[] {
  const byId = new Map(products.map((product) => [product.id, product]));
  return productIds.flatMap((id) => {
    const product = byId.get(id);
    return product ? [product] : [];
  });
}
