import { describe, expect, it } from "vitest";
import {
  EMPTY_WISHLIST,
  getWishlistItemCount,
  isWishlisted,
  MAX_WISHLIST_ITEMS,
  wishlistReducer,
} from "./wishlist-reducer";

describe("wishlistReducer - toggle", () => {
  it("thêm sản phẩm vào danh sách khi chưa có", () => {
    const state = wishlistReducer(EMPTY_WISHLIST, {
      type: "toggle",
      productId: "p001",
    });
    expect(state.productIds).toEqual(["p001"]);
    expect(isWishlisted(state, "p001")).toBe(true);
  });

  it("xóa sản phẩm khỏi danh sách khi đã có", () => {
    const state1 = wishlistReducer(EMPTY_WISHLIST, {
      type: "toggle",
      productId: "p001",
    });
    const state2 = wishlistReducer(state1, {
      type: "toggle",
      productId: "p001",
    });
    expect(state2.productIds).toEqual([]);
    expect(isWishlisted(state2, "p001")).toBe(false);
  });

  it("không vượt quá giới hạn tối đa 50 sản phẩm", () => {
    const fullIds = Array.from(
      { length: MAX_WISHLIST_ITEMS },
      (_, i) => `p${i + 1}`,
    );
    const fullState = { productIds: fullIds };

    const nextState = wishlistReducer(fullState, {
      type: "toggle",
      productId: "p_extra",
    });
    expect(nextState.productIds).toHaveLength(MAX_WISHLIST_ITEMS);
    expect(nextState.productIds).not.toContain("p_extra");
  });
});

describe("wishlistReducer - add / remove / clear", () => {
  it("thêm sản phẩm mới và bỏ qua nếu đã tồn tại", () => {
    const state1 = wishlistReducer(EMPTY_WISHLIST, {
      type: "add",
      productId: "p001",
    });
    expect(state1.productIds).toEqual(["p001"]);

    const state2 = wishlistReducer(state1, { type: "add", productId: "p001" });
    expect(state2.productIds).toEqual(["p001"]);
  });

  it("không thêm sản phẩm khi đã đủ 50 sản phẩm", () => {
    const fullIds = Array.from({ length: 50 }, (_, i) => `p${i + 1}`);
    const fullState = { productIds: fullIds };

    const nextState = wishlistReducer(fullState, {
      type: "add",
      productId: "p_extra",
    });
    expect(nextState.productIds).toHaveLength(50);
  });

  it("xóa sản phẩm có trong danh sách", () => {
    const initialState = { productIds: ["p001", "p002"] };
    const state = wishlistReducer(initialState, {
      type: "remove",
      productId: "p001",
    });
    expect(state.productIds).toEqual(["p002"]);
  });

  it("bỏ qua khi xóa sản phẩm không tồn tại", () => {
    const initialState = { productIds: ["p001"] };
    const state = wishlistReducer(initialState, {
      type: "remove",
      productId: "p999",
    });
    expect(state.productIds).toEqual(["p001"]);
  });

  it("xóa sạch toàn bộ danh sách", () => {
    const initialState = { productIds: ["p001", "p002"] };
    const state = wishlistReducer(initialState, { type: "clear" });
    expect(state).toEqual(EMPTY_WISHLIST);
  });

  it("đếm chính xác số lượng sản phẩm", () => {
    expect(getWishlistItemCount(EMPTY_WISHLIST)).toBe(0);
    expect(getWishlistItemCount({ productIds: ["p001", "p002"] })).toBe(2);
  });
});
