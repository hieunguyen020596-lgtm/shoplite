import { describe, expect, it } from "vitest";
import { getAllProducts } from "@/features/catalog/catalog-service";
import {
  EMPTY_WISHLIST,
  MAX_WISHLIST_ITEMS,
  removeFromWishlist,
  resolveWishlistProducts,
  sanitizeWishlist,
  toggleWishlist,
} from "./wishlist-reducer";

const ids = (count: number, prefix = "x") =>
  Array.from({ length: count }, (_, index) => `${prefix}${index}`);

describe("toggleWishlist", () => {
  it("thêm sản phẩm chưa có vào cuối danh sách", () => {
    const { state, result } = toggleWishlist({ productIds: ["p001"] }, "p002");
    expect(result).toBe("added");
    expect(state.productIds).toEqual(["p001", "p002"]);
  });

  it("bỏ sản phẩm đã có", () => {
    const { state, result } = toggleWishlist({ productIds: ["p001", "p002"] }, "p001");
    expect(result).toBe("removed");
    expect(state.productIds).toEqual(["p002"]);
  });

  it("vẫn thêm được sản phẩm hết hàng (p004)", () => {
    expect(toggleWishlist(EMPTY_WISHLIST, "p004").state.productIds).toEqual(["p004"]);
  });

  it("thêm được sản phẩm thứ 50", () => {
    const { state, result } = toggleWishlist({ productIds: ids(MAX_WISHLIST_ITEMS - 1) }, "new");
    expect(result).toBe("added");
    expect(state.productIds).toHaveLength(MAX_WISHLIST_ITEMS);
  });

  it("từ chối sản phẩm thứ 51 và giữ nguyên tham chiếu state", () => {
    const full = { productIds: ids(MAX_WISHLIST_ITEMS) };
    const { state, result } = toggleWishlist(full, "new");
    expect(result).toBe("full");
    expect(state).toBe(full);
  });

  it("khi đầy, dọn id không còn trong catalog rồi thêm sản phẩm mới", () => {
    const full = { productIds: ["ghost", ...ids(MAX_WISHLIST_ITEMS - 1)] };
    const known = new Set([...ids(MAX_WISHLIST_ITEMS - 1), "new"]);
    const { state, result } = toggleWishlist(full, "new", known);
    expect(result).toBe("added");
    expect(state.productIds).not.toContain("ghost");
    expect(state.productIds.at(-1)).toBe("new");
    expect(state.productIds).toHaveLength(MAX_WISHLIST_ITEMS);
  });

  it("khi đầy và mọi id đều còn trong catalog thì vẫn báo đầy", () => {
    const full = { productIds: ids(MAX_WISHLIST_ITEMS) };
    const { state, result } = toggleWishlist(full, "new", new Set(full.productIds));
    expect(result).toBe("full");
    expect(state).toBe(full);
  });

  it("bỏ thích được khi danh sách đầy", () => {
    const full = { productIds: ids(MAX_WISHLIST_ITEMS) };
    const { state, result } = toggleWishlist(full, "x0");
    expect(result).toBe("removed");
    expect(state.productIds).toHaveLength(MAX_WISHLIST_ITEMS - 1);
  });
});

describe("removeFromWishlist", () => {
  it("trả về nguyên state khi id không có trong danh sách", () => {
    const state = { productIds: ["p001"] };
    expect(removeFromWishlist(state, "p999")).toBe(state);
  });
});

describe("sanitizeWishlist", () => {
  it.each([null, undefined, "abc", 42, [], { productIds: "p001" }, { items: [] }])(
    "trả về danh sách rỗng với dữ liệu sai định dạng: %j",
    (value) => {
      expect(sanitizeWishlist(value)).toEqual(EMPTY_WISHLIST);
    },
  );

  it("bỏ phần tử sai kiểu, chuỗi rỗng và id trùng (giữ lần đầu)", () => {
    expect(sanitizeWishlist({ productIds: ["p002", 1, null, "", "p001", "p002"] })).toEqual({
      productIds: ["p002", "p001"],
    });
  });

  it("cắt còn tối đa MAX_WISHLIST_ITEMS", () => {
    const result = sanitizeWishlist({ productIds: ids(MAX_WISHLIST_ITEMS + 5) });
    expect(result.productIds).toHaveLength(MAX_WISHLIST_ITEMS);
  });
});

describe("resolveWishlistProducts", () => {
  const products = getAllProducts();

  it("giữ thứ tự đã thích và bỏ id không tồn tại", () => {
    const resolved = resolveWishlistProducts(["p003", "ghost", "p001"], products);
    expect(resolved.map((product) => product.id)).toEqual(["p003", "p001"]);
  });

  it("trả về mảng rỗng khi mọi id đều không tồn tại", () => {
    expect(resolveWishlistProducts(["ghost"], products)).toEqual([]);
  });
});
