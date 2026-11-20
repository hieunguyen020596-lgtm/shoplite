import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CART_STORAGE_KEY } from "@/features/cart/cart-store";
import { MAX_WISHLIST_ITEMS } from "./wishlist-reducer";
import { WISHLIST_STORAGE_KEY, wishlistStore } from "./wishlist-store";

function dispatchStorage(key: string, newValue: string | null) {
  window.dispatchEvent(new StorageEvent("storage", { key, newValue }));
}

describe("wishlistStore", () => {
  beforeEach(() => {
    window.localStorage.clear();
    wishlistStore.reset();
  });

  afterEach(() => vi.restoreAllMocks());

  it("lưu danh sách vào localStorage và đọc lại sau khi tải trang", () => {
    wishlistStore.toggle("p001");
    wishlistStore.toggle("p002");
    expect(JSON.parse(window.localStorage.getItem(WISHLIST_STORAGE_KEY)!)).toEqual({
      productIds: ["p001", "p002"],
    });

    wishlistStore.reset();
    expect(wishlistStore.getSnapshot().productIds).toEqual(["p001", "p002"]);
  });

  it("dữ liệu hỏng (abc) được coi là danh sách rỗng, không throw", () => {
    window.localStorage.setItem(WISHLIST_STORAGE_KEY, "abc");
    expect(() => wishlistStore.getSnapshot()).not.toThrow();
    expect(wishlistStore.getSnapshot().productIds).toEqual([]);
  });

  it("vẫn hoạt động trong phiên khi localStorage chặn ghi", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(wishlistStore.toggle("p001")).toBe("added");
    expect(wishlistStore.getSnapshot().productIds).toEqual(["p001"]);
  });

  it("không ghi và không thông báo khi danh sách đã đầy", () => {
    const productIds = Array.from({ length: MAX_WISHLIST_ITEMS }, (_, index) => `x${index}`);
    window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify({ productIds }));
    const listener = vi.fn();
    const unsubscribe = wishlistStore.subscribe(listener);
    const setItem = vi.spyOn(Storage.prototype, "setItem");

    expect(wishlistStore.toggle("new")).toBe("full");
    expect(listener).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("thông báo cho subscriber khi danh sách thay đổi", () => {
    const listener = vi.fn();
    const unsubscribe = wishlistStore.subscribe(listener);
    wishlistStore.toggle("p001");
    wishlistStore.remove("p001");
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it("đồng bộ khi tab khác thay đổi danh sách", () => {
    const listener = vi.fn();
    const unsubscribe = wishlistStore.subscribe(listener);
    wishlistStore.getSnapshot();

    window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify({ productIds: ["p003"] }));
    dispatchStorage(WISHLIST_STORAGE_KEY, '{"productIds":["p003"]}');

    expect(listener).toHaveBeenCalledTimes(1);
    expect(wishlistStore.getSnapshot().productIds).toEqual(["p003"]);
    unsubscribe();
  });

  it("bỏ qua sự kiện storage của key khác", () => {
    const listener = vi.fn();
    const unsubscribe = wishlistStore.subscribe(listener);
    dispatchStorage(CART_STORAGE_KEY, "{}");
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("tab khác ghi dữ liệu hỏng → danh sách rỗng", () => {
    wishlistStore.toggle("p001");
    const unsubscribe = wishlistStore.subscribe(() => {});
    window.localStorage.setItem(WISHLIST_STORAGE_KEY, "abc");
    dispatchStorage(WISHLIST_STORAGE_KEY, "abc");
    expect(wishlistStore.getSnapshot().productIds).toEqual([]);
    unsubscribe();
  });

  it("không đụng tới dữ liệu giỏ hàng", () => {
    window.localStorage.setItem(CART_STORAGE_KEY, '{"items":[]}');
    wishlistStore.toggle("p001");
    expect(window.localStorage.getItem(CART_STORAGE_KEY)).toBe('{"items":[]}');
  });
});
