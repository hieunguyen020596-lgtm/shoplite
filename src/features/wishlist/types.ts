/** Danh sách yêu thích: chỉ lưu id sản phẩm theo thứ tự đã thích (giá/tồn kho luôn lấy từ catalog). */
export interface WishlistState {
  productIds: string[];
}

/** Kết quả của thao tác thích/bỏ thích, dùng để UI biết khi nào báo "danh sách đã đầy". */
export type WishlistToggleResult = "added" | "removed" | "full";
