import { describe, expect, it } from "vitest";
import type { WishlistState } from "./types";
import {
  EMPTY_WISHLIST,
  getToggleResult,
  getWishlistCount,
  isInWishlist,
  sanitizeWishlist,
  WISHLIST_MAX_ITEMS,
  wishlistReducer,
} from "./wishlist-reducer";

/** Danh sách có `count` mã giả: id-1, id-2, ... */
function wishlistOf(count: number): WishlistState {
  return { productIds: Array.from({ length: count }, (_, index) => `id-${index + 1}`) };
}

describe("wishlistReducer - toggle", () => {
  it("thêm sản phẩm chưa có vào cuối danh sách", () => {
    const state = wishlistReducer({ productIds: ["p001"] }, { type: "toggle", productId: "p002" });
    expect(state.productIds).toEqual(["p001", "p002"]);
  });

  it("bỏ sản phẩm đã có khỏi danh sách", () => {
    const state = wishlistReducer(
      { productIds: ["p001", "p002"] },
      { type: "toggle", productId: "p001" },
    );
    expect(state.productIds).toEqual(["p002"]);
  });

  it("bấm hai lần liên tiếp thì trở về như cũ và không trùng lặp", () => {
    const once = wishlistReducer(EMPTY_WISHLIST, { type: "toggle", productId: "p001" });
    const twice = wishlistReducer(once, { type: "toggle", productId: "p001" });
    expect(twice.productIds).toEqual([]);
  });

  it("còn 1 chỗ (49 sản phẩm) thì vẫn thêm được", () => {
    const state = wishlistReducer(wishlistOf(WISHLIST_MAX_ITEMS - 1), {
      type: "toggle",
      productId: "p001",
    });
    expect(getWishlistCount(state)).toBe(WISHLIST_MAX_ITEMS);
  });

  it("đủ 50 sản phẩm thì không thêm và giữ nguyên tham chiếu state", () => {
    const full = wishlistOf(WISHLIST_MAX_ITEMS);
    expect(getToggleResult(full, "p001")).toBe("full");
    expect(wishlistReducer(full, { type: "toggle", productId: "p001" })).toBe(full);
  });

  it("đủ 50 sản phẩm vẫn bỏ thích được, sau đó thích sản phẩm khác được", () => {
    const full = wishlistOf(WISHLIST_MAX_ITEMS);
    const removed = wishlistReducer(full, { type: "toggle", productId: "id-1" });
    expect(getToggleResult(removed, "p001")).toBe("added");
    const added = wishlistReducer(removed, { type: "toggle", productId: "p001" });
    expect(isInWishlist(added, "p001")).toBe(true);
    expect(getWishlistCount(added)).toBe(WISHLIST_MAX_ITEMS);
  });
});

describe("wishlistReducer - remove, prune, clear", () => {
  it("remove bỏ sản phẩm; mã không có thì giữ nguyên tham chiếu", () => {
    const state = { productIds: ["p001", "p002"] };
    expect(wishlistReducer(state, { type: "remove", productId: "p001" }).productIds).toEqual([
      "p002",
    ]);
    expect(wishlistReducer(state, { type: "remove", productId: "p999" })).toBe(state);
  });

  it("prune loại mã không còn trong catalog, giữ thứ tự", () => {
    const state = { productIds: ["p003", "khong-ton-tai", "p001"] };
    const pruned = wishlistReducer(state, { type: "prune", knownIds: ["p001", "p003"] });
    expect(pruned.productIds).toEqual(["p003", "p001"]);
  });

  it("prune không có mã lạ thì giữ nguyên tham chiếu", () => {
    const state = { productIds: ["p001"] };
    expect(wishlistReducer(state, { type: "prune", knownIds: ["p001", "p002"] })).toBe(state);
  });

  it("clear làm rỗng danh sách", () => {
    expect(wishlistReducer({ productIds: ["p001"] }, { type: "clear" })).toEqual(EMPTY_WISHLIST);
  });
});

describe("sanitizeWishlist", () => {
  it.each([null, undefined, "abc", 42, [], { foo: 1 }, { productIds: "p001" }])(
    "dữ liệu sai cấu trúc %j thì coi là rỗng",
    (value) => {
      expect(sanitizeWishlist(value)).toEqual(EMPTY_WISHLIST);
    },
  );

  it("chỉ bỏ phần tử lỗi (số, null, chuỗi rỗng), giữ mã hợp lệ", () => {
    expect(sanitizeWishlist({ productIds: ["p001", 123, null, "", "  ", "p002"] })).toEqual({
      productIds: ["p001", "p002"],
    });
  });

  it("bỏ mã trùng, giữ lần xuất hiện đầu", () => {
    expect(sanitizeWishlist({ productIds: ["p002", "p001", "p002"] }).productIds).toEqual([
      "p002",
      "p001",
    ]);
  });

  it("đúng 50 mã thì giữ đủ, 51 mã thì chỉ giữ 50 mã đầu", () => {
    expect(getWishlistCount(sanitizeWishlist(wishlistOf(WISHLIST_MAX_ITEMS)))).toBe(50);
    const over = sanitizeWishlist(wishlistOf(WISHLIST_MAX_ITEMS + 1));
    expect(getWishlistCount(over)).toBe(WISHLIST_MAX_ITEMS);
    expect(over.productIds.at(-1)).toBe(`id-${WISHLIST_MAX_ITEMS}`);
  });
});
