import { beforeEach, describe, expect, it, vi } from "vitest";
import { WISHLIST_STORAGE_KEY, wishlistStore } from "./wishlist-store";

describe("wishlistStore", () => {
  beforeEach(() => {
    window.localStorage.clear();
    wishlistStore.reset();
  });

  it("lưu danh sách vào localStorage sau mỗi thay đổi", () => {
    wishlistStore.dispatch({ type: "toggle", productId: "p001" });
    const saved = JSON.parse(window.localStorage.getItem(WISHLIST_STORAGE_KEY)!);
    expect(saved).toEqual({ productIds: ["p001"] });
  });

  it("đọc lại danh sách đã lưu khi tải trang", () => {
    window.localStorage.setItem(
      WISHLIST_STORAGE_KEY,
      JSON.stringify({ productIds: ["p001", "p002", "p003"] }),
    );
    expect(wishlistStore.getSnapshot().productIds).toEqual(["p001", "p002", "p003"]);
  });

  it("coi dữ liệu không phải JSON là danh sách rỗng", () => {
    window.localStorage.setItem(WISHLIST_STORAGE_KEY, "abc");
    expect(wishlistStore.getSnapshot().productIds).toEqual([]);
  });

  it("coi dữ liệu sai cấu trúc là danh sách rỗng", () => {
    for (const bad of ['{"productIds":"p001"}', '{"productIds":[1,2]}', "[]", "null", '"x"']) {
      window.localStorage.setItem(WISHLIST_STORAGE_KEY, bad);
      wishlistStore.reset();
      expect(wishlistStore.getSnapshot().productIds).toEqual([]);
    }
  });

  it("coi dữ liệu trùng id hoặc vượt 50 phần tử là không hợp lệ", () => {
    window.localStorage.setItem(WISHLIST_STORAGE_KEY, '{"productIds":["p001","p001"]}');
    expect(wishlistStore.getSnapshot().productIds).toEqual([]);

    wishlistStore.reset();
    const tooMany = Array.from({ length: 51 }, (_, index) => `x${index}`);
    window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify({ productIds: tooMany }));
    expect(wishlistStore.getSnapshot().productIds).toEqual([]);
  });

  it("thông báo cho subscriber khi danh sách thay đổi, không thông báo khi không đổi", () => {
    const listener = vi.fn();
    const unsubscribe = wishlistStore.subscribe(listener);
    wishlistStore.dispatch({ type: "toggle", productId: "p001" });
    expect(listener).toHaveBeenCalledTimes(1);
    wishlistStore.dispatch({ type: "remove", productId: "khong-co" });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("đồng bộ khi tab khác thay đổi localStorage (sự kiện storage)", () => {
    const listener = vi.fn();
    const unsubscribe = wishlistStore.subscribe(listener);
    expect(wishlistStore.getSnapshot().productIds).toEqual([]);

    window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify({ productIds: ["p002"] }));
    window.dispatchEvent(new StorageEvent("storage", { key: WISHLIST_STORAGE_KEY }));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(wishlistStore.getSnapshot().productIds).toEqual(["p002"]);
    unsubscribe();
  });

  it("bỏ qua sự kiện storage của khóa khác", () => {
    const listener = vi.fn();
    const unsubscribe = wishlistStore.subscribe(listener);
    window.dispatchEvent(new StorageEvent("storage", { key: "shoplite:cart" }));
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("vẫn hoạt động trong phiên khi localStorage không ghi được", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(() => wishlistStore.dispatch({ type: "toggle", productId: "p001" })).not.toThrow();
    expect(wishlistStore.getSnapshot().productIds).toEqual(["p001"]);
    spy.mockRestore();
  });
});
