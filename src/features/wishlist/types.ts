/** Danh sách yêu thích chỉ lưu mã sản phẩm; giá và tồn kho luôn lấy từ catalog hiện tại. */
export interface WishlistState {
  productIds: string[];
}

export type WishlistAction =
  { type: "toggle"; productId: string } | { type: "remove"; productId: string } | { type: "clear" };

/** Kết quả của thao tác bấm trái tim. */
export type WishlistToggleResult = "added" | "removed" | "full";
