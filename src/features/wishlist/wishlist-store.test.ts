import { beforeEach, describe, expect, it, vi } from "vitest";
import { WISHLIST_STORAGE_KEY, wishlistStore } from "./wishlist-store";

describe("wishlistStore", () => {
  beforeEach(() => {
    window.localStorage.clear();
    wishlistStore.reset();
  });

  it("lưu danh sách yêu thích vào localStorage sau mỗi thay đổi", () => {
    wishlistStore.dispatch({ type: "toggle", productId: "p001" });
    const saved = JSON.parse(
      window.localStorage.getItem(WISHLIST_STORAGE_KEY)!,
    );
    expect(saved.productIds).toEqual(["p001"]);
  });

  it("đọc lại danh sách đã lưu khi khởi tạo", () => {
    window.localStorage.setItem(
      WISHLIST_STORAGE_KEY,
      JSON.stringify({ productIds: ["p001", "p002"] }),
    );
    expect(wishlistStore.getSnapshot().productIds).toEqual(["p001", "p002"]);
  });

  it("bỏ qua dữ liệu hỏng trong localStorage", () => {
    window.localStorage.setItem(WISHLIST_STORAGE_KEY, "{invalid-json");
    expect(wishlistStore.getSnapshot().productIds).toEqual([]);
  });

  it("bỏ qua dữ liệu sai cấu trúc trong localStorage", () => {
    window.localStorage.setItem(
      WISHLIST_STORAGE_KEY,
      JSON.stringify({ productIds: [123, null] }),
    );
    expect(wishlistStore.getSnapshot().productIds).toEqual([]);
  });

  it("thông báo cho subscriber khi wishlist thay đổi", () => {
    const listener = vi.fn();
    const unsubscribe = wishlistStore.subscribe(listener);
    wishlistStore.dispatch({ type: "toggle", productId: "p001" });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("báo lỗi limit_reached khi thêm vượt quá 50 sản phẩm", () => {
    const fullIds = Array.from({ length: 50 }, (_, i) => `p${i + 1}`);
    window.localStorage.setItem(
      WISHLIST_STORAGE_KEY,
      JSON.stringify({ productIds: fullIds }),
    );

    const result = wishlistStore.dispatch({
      type: "add",
      productId: "p_extra",
    });
    expect(result.success).toBe(false);
    expect(result.reason).toBe("limit_reached");
    expect(wishlistStore.getSnapshot().productIds).toHaveLength(50);
  });

  it("đồng bộ giữa các tab qua sự kiện storage", () => {
    const listener = vi.fn();
    const unsubscribe = wishlistStore.subscribe(listener);

    window.localStorage.setItem(
      WISHLIST_STORAGE_KEY,
      JSON.stringify({ productIds: ["p005"] }),
    );

    window.dispatchEvent(
      new StorageEvent("storage", {
        key: WISHLIST_STORAGE_KEY,
      }),
    );

    expect(listener).toHaveBeenCalled();
    expect(wishlistStore.getSnapshot().productIds).toEqual(["p005"]);
    unsubscribe();
  });
});
