import { describe, expect, it } from "vitest";
import {
  EMPTY_WISHLIST,
  getToggleResult,
  MAX_WISHLIST_ITEMS,
  wishlistReducer,
} from "./wishlist-reducer";

const fullState = {
  productIds: Array.from({ length: MAX_WISHLIST_ITEMS }, (_, index) => `x${index}`),
};

describe("wishlistReducer", () => {
  it("thêm sản phẩm chưa có vào cuối danh sách", () => {
    const state = wishlistReducer({ productIds: ["p001"] }, { type: "toggle", productId: "p002" });
    expect(state.productIds).toEqual(["p001", "p002"]);
  });

  it("bỏ sản phẩm đã có khi toggle lần nữa", () => {
    const state = wishlistReducer(
      { productIds: ["p001", "p002"] },
      { type: "toggle", productId: "p001" },
    );
    expect(state.productIds).toEqual(["p002"]);
  });

  it("không thêm sản phẩm thứ 51 và giữ nguyên tham chiếu state", () => {
    const state = wishlistReducer(fullState, {
      type: "toggle",
      productId: "p001",
    });
    expect(state).toBe(fullState);
  });

  it("vẫn bỏ được sản phẩm khi danh sách đã đầy 50", () => {
    const state = wishlistReducer(fullState, {
      type: "toggle",
      productId: "x10",
    });
    expect(state.productIds).toHaveLength(MAX_WISHLIST_ITEMS - 1);
    expect(state.productIds).not.toContain("x10");
  });

  it("cho phép đúng 50 sản phẩm (giá trị biên)", () => {
    const almostFull = {
      productIds: fullState.productIds.slice(0, MAX_WISHLIST_ITEMS - 1),
    };
    const state = wishlistReducer(almostFull, {
      type: "toggle",
      productId: "p001",
    });
    expect(state.productIds).toHaveLength(MAX_WISHLIST_ITEMS);
  });

  it("remove một id không tồn tại thì không đổi state", () => {
    const state = { productIds: ["p001"] };
    expect(wishlistReducer(state, { type: "remove", productId: "khong-co" })).toBe(state);
  });

  it("remove xóa đúng sản phẩm", () => {
    const state = wishlistReducer(
      { productIds: ["p001", "p002"] },
      { type: "remove", productId: "p001" },
    );
    expect(state.productIds).toEqual(["p002"]);
  });

  it("clear đưa danh sách về rỗng", () => {
    expect(wishlistReducer({ productIds: ["p001"] }, { type: "clear" })).toBe(EMPTY_WISHLIST);
  });
});

describe("getToggleResult", () => {
  it("trả về added / removed / full đúng theo trạng thái", () => {
    expect(getToggleResult(EMPTY_WISHLIST, "p001")).toBe("added");
    expect(getToggleResult({ productIds: ["p001"] }, "p001")).toBe("removed");
    expect(getToggleResult(fullState, "p001")).toBe("full");
    expect(getToggleResult(fullState, "x0")).toBe("removed");
  });
});
