/** Danh sách yêu thích chỉ lưu mã sản phẩm; tên, giá, tồn kho luôn lấy từ catalog khi hiển thị. */
export interface WishlistState {
  productIds: string[];
}

export type WishlistAction =
  | { type: "toggle"; productId: string }
  | { type: "remove"; productId: string }
  /** Loại các mã không còn trong catalog. */
  | { type: "prune"; knownIds: readonly string[] }
  | { type: "clear" };

/** Kết quả khi bấm nút trái tim - UI dùng để báo "danh sách đã đầy". */
export type ToggleResult = "added" | "removed" | "full";
