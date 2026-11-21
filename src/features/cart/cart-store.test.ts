import { beforeEach, describe, expect, it, vi } from "vitest";
import { getProductById } from "@/features/catalog/catalog-service";
import { toCartItem } from "./cart-reducer";
import { CART_STORAGE_KEY, cartStore } from "./cart-store";

const product = getProductById("p001")!;

describe("cartStore", () => {
  beforeEach(() => {
    window.localStorage.clear();
    cartStore.reset();
  });

  it("lưu giỏ hàng vào localStorage sau mỗi thay đổi", () => {
    cartStore.dispatch({ type: "add", item: toCartItem(product), quantity: 2 });
    const saved = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY)!);
    expect(saved.items[0]).toMatchObject({ productId: "p001", quantity: 2 });
  });

  it("đọc lại giỏ hàng đã lưu khi tải trang", () => {
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({ items: [{ ...toCartItem(product), quantity: 3 }] }),
    );
    expect(cartStore.getSnapshot().items[0].quantity).toBe(3);
  });

  it("bỏ qua dữ liệu hỏng trong localStorage", () => {
    window.localStorage.setItem(CART_STORAGE_KEY, "{not json");
    expect(cartStore.getSnapshot().items).toEqual([]);
  });

  it("thông báo cho subscriber khi giỏ hàng thay đổi", () => {
    const listener = vi.fn();
    const unsubscribe = cartStore.subscribe(listener);
    cartStore.dispatch({ type: "add", item: toCartItem(product), quantity: 1 });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("làm sạch giỏ cũ: bỏ stock, loại dòng thiếu field, kẹp số lượng 1..10", () => {
    const line = { ...toCartItem(product), quantity: 3 };
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({
        items: [
          { ...line, stock: 25 },
          { ...line, productId: "p002", quantity: 99 },
          { ...line, productId: "p003", quantity: 0 },
          { productId: "p004", quantity: 1 },
        ],
      }),
    );
    const items = cartStore.getSnapshot().items;
    expect(items.map((i) => [i.productId, i.quantity])).toEqual([
      ["p001", 3],
      ["p002", 10],
      ["p003", 1],
    ]);
    expect(items.every((i) => !("stock" in i))).toBe(true);
  });

  it("loại price không hợp lệ, image thiếu field, giữ dòng đầu khi trùng productId", () => {
    const line = { ...toCartItem(product), quantity: 1 };
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({
        items: [
          { ...line, productId: "a", price: -1 },
          { ...line, productId: "b", price: null },
          { ...line, productId: "c", image: { emoji: "x" } },
          { ...line, productId: "d" },
          { ...line, productId: "d", quantity: 5 },
        ],
      }),
    );
    const items = cartStore.getSnapshot().items;
    expect(items.map((i) => [i.productId, i.quantity])).toEqual([["d", 1]]);
  });
});
