/**
 * Định nghĩa kiểu dữ liệu cho tính năng Danh sách yêu thích (Wishlist).
 */

export const MAX_WISHLIST_ITEMS = 50;
export const WISHLIST_STORAGE_KEY = "shoplite:wishlist";

export interface WishlistState {
  productIds: string[];
}

export type WishlistAction =
  | { type: "toggle"; productId: string }
  | { type: "add"; productId: string }
  | { type: "remove"; productId: string }
  | { type: "clear" };
