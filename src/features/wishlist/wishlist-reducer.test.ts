import { describe, expect, it } from "vitest";
import { MAX_WISHLIST_ITEMS } from "./types";
import { EMPTY_WISHLIST, isInWishlist, wishlistReducer } from "./wishlist-reducer";

describe("wishlistReducer", () => {
  it("thêm sản phẩm chưa có khi toggle", () => {
    const next = wishlistReducer(EMPTY_WISHLIST, { type: "toggle", productId: "p001" });
    expect(next.productIds).toEqual(["p001"]);
    expect(isInWishlist(next, "p001")).toBe(true);
  });

  it("xóa sản phẩm đã có khi toggle lại", () => {
    const state = { productIds: ["p001", "p002"] };
    const next = wishlistReducer(state, { type: "toggle", productId: "p001" });
    expect(next.productIds).toEqual(["p002"]);
    expect(isInWishlist(next, "p001")).toBe(false);
  });

  it("không thêm sản phẩm nếu danh sách đã đạt tối đa 50 sản phẩm", () => {
    const initialIds = Array.from({ length: MAX_WISHLIST_ITEMS }, (_, i) => `prod-${i}`);
    const state = { productIds: initialIds };
    expect(state.productIds.length).toBe(50);

    const next = wishlistReducer(state, { type: "toggle", productId: "new-prod" });
    expect(next.productIds.length).toBe(50);
    expect(next.productIds).not.toContain("new-prod");
  });

  it("thêm sản phẩm bằng action 'add' và bỏ qua nếu đã tồn tại", () => {
    const state1 = wishlistReducer(EMPTY_WISHLIST, { type: "add", productId: "p001" });
    expect(state1.productIds).toEqual(["p001"]);

    const state2 = wishlistReducer(state1, { type: "add", productId: "p001" });
    expect(state2.productIds).toEqual(["p001"]);
  });

  it("xóa sản phẩm bằng action 'remove'", () => {
    const state = { productIds: ["p001", "p002"] };
    const next = wishlistReducer(state, { type: "remove", productId: "p001" });
    expect(next.productIds).toEqual(["p002"]);
  });

  it("xóa toàn bộ sản phẩm bằng action 'clear'", () => {
    const state = { productIds: ["p001", "p002"] };
    const next = wishlistReducer(state, { type: "clear" });
    expect(next.productIds).toEqual([]);
  });

  it("bỏ qua productId rỗng hoặc không hợp lệ", () => {
    const next = wishlistReducer(EMPTY_WISHLIST, { type: "toggle", productId: "   " });
    expect(next.productIds).toEqual([]);
  });
});
