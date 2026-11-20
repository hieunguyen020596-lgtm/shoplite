import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WISHLIST_MAX_ITEMS } from "./wishlist-reducer";
import { WISHLIST_STORAGE_KEY, wishlistStore } from "./wishlist-store";

const saved = () => JSON.parse(window.localStorage.getItem(WISHLIST_STORAGE_KEY)!);

describe("wishlistStore", () => {
  beforeEach(() => {
    window.localStorage.clear();
    wishlistStore.reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lưu danh sách vào localStorage sau mỗi thay đổi", () => {
    wishlistStore.dispatch({ type: "toggle", productId: "p001" });
    expect(saved()).toEqual({ productIds: ["p001"] });
  });

  it("đọc lại danh sách đã lưu khi tải trang", () => {
    window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify({ productIds: ["p002"] }));
    expect(wishlistStore.getSnapshot().productIds).toEqual(["p002"]);
  });

  it("dữ liệu hỏng (abc) thì coi là rỗng, không ném lỗi", () => {
    window.localStorage.setItem(WISHLIST_STORAGE_KEY, "abc");
    expect(() => wishlistStore.getSnapshot()).not.toThrow();
    expect(wishlistStore.getSnapshot().productIds).toEqual([]);
  });

  it("dữ liệu hỏng một phần thì chỉ giữ mã hợp lệ", () => {
    window.localStorage.setItem(WISHLIST_STORAGE_KEY, '{"productIds":["p001",123,null]}');
    expect(wishlistStore.getSnapshot().productIds).toEqual(["p001"]);
  });

  it("server snapshot luôn rỗng", () => {
    window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify({ productIds: ["p001"] }));
    expect(wishlistStore.getServerSnapshot().productIds).toEqual([]);
  });

  it("thông báo cho subscriber khi danh sách thay đổi", () => {
    const listener = vi.fn();
    const unsubscribe = wishlistStore.subscribe(listener);
    wishlistStore.dispatch({ type: "toggle", productId: "p001" });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("danh sách đầy thì không ghi lại và không thông báo", () => {
    const full = Array.from({ length: WISHLIST_MAX_ITEMS }, (_, index) => `id-${index}`);
    window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify({ productIds: full }));
    const listener = vi.fn();
    const unsubscribe = wishlistStore.subscribe(listener);
    const setItem = vi.spyOn(Storage.prototype, "setItem");

    wishlistStore.dispatch({ type: "toggle", productId: "p001" });

    expect(setItem).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("đồng bộ khi tab khác ghi đúng key, bỏ qua key khác", () => {
    const listener = vi.fn();
    const unsubscribe = wishlistStore.subscribe(listener);
    wishlistStore.getSnapshot();

    window.localStorage.setItem("shoplite:cart", "{}");
    window.dispatchEvent(new StorageEvent("storage", { key: "shoplite:cart" }));
    expect(listener).not.toHaveBeenCalled();

    window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify({ productIds: ["p003"] }));
    window.dispatchEvent(new StorageEvent("storage", { key: WISHLIST_STORAGE_KEY }));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(wishlistStore.getSnapshot().productIds).toEqual(["p003"]);
    unsubscribe();
  });

  it("localStorage chặn ghi thì vẫn cập nhật danh sách trong phiên", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(() => wishlistStore.dispatch({ type: "toggle", productId: "p001" })).not.toThrow();
    expect(wishlistStore.getSnapshot().productIds).toEqual(["p001"]);
  });
});
