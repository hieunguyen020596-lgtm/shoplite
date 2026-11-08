import { beforeEach, describe, expect, it } from "vitest";
import { WISHLIST_STORAGE_KEY } from "./types";
import { wishlistStore } from "./wishlist-store";

describe("wishlistStore", () => {
  beforeEach(() => {
    window.localStorage.clear();
    wishlistStore.reset();
  });

  it("khởi tạo danh sách rỗng khi chưa có dữ liệu trong localStorage", () => {
    expect(wishlistStore.getSnapshot().productIds).toEqual([]);
    expect(wishlistStore.getServerSnapshot().productIds).toEqual([]);
  });

  it("ghi dữ liệu vào localStorage khi dispatch toggle", () => {
    wishlistStore.dispatch({ type: "toggle", productId: "p001" });
    expect(wishlistStore.getSnapshot().productIds).toEqual(["p001"]);

    const stored = JSON.parse(window.localStorage.getItem(WISHLIST_STORAGE_KEY) || "{}");
    expect(stored.productIds).toEqual(["p001"]);
  });

  it("xử lý an toàn không crash khi localStorage chứa chuỗi JSON bị hỏng", () => {
    window.localStorage.setItem(WISHLIST_STORAGE_KEY, "invalid-json-content{");
    wishlistStore.reset();

    expect(wishlistStore.getSnapshot().productIds).toEqual([]);
  });

  it("tự động đọc và hỗ trợ định dạng mảng thô trong localStorage", () => {
    window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(["p001", "p002"]));
    wishlistStore.reset();

    expect(wishlistStore.getSnapshot().productIds).toEqual(["p001", "p002"]);
  });

  it("lắng nghe sự kiện storage để đồng bộ từ tab khác", () => {
    let notified = false;
    const unsubscribe = wishlistStore.subscribe(() => {
      notified = true;
    });

    // Giả lập tab khác cập nhật localStorage và bắn event
    window.localStorage.setItem(
      WISHLIST_STORAGE_KEY,
      JSON.stringify({ productIds: ["p003"] }),
    );
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: WISHLIST_STORAGE_KEY,
      }),
    );

    expect(notified).toBe(true);
    expect(wishlistStore.getSnapshot().productIds).toEqual(["p003"]);
    unsubscribe();
  });
});
