import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { getMaxQuantity, toCartItem } from "@/features/cart/cart-reducer";
import { CART_STORAGE_KEY, cartStore } from "@/features/cart/cart-store";
import { getAllProducts, getProductById } from "@/features/catalog/catalog-service";
import { WISHLIST_STORAGE_KEY, wishlistStore } from "../wishlist-store";
import { WishlistView } from "./wishlist-view";

const products = getAllProducts();

function seed(productIds: string[]) {
  window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify({ productIds }));
  wishlistStore.reset();
}

describe("<WishlistView />", () => {
  beforeEach(() => {
    wishlistStore.reset();
    cartStore.reset();
  });

  it("hiển thị trạng thái trống kèm liên kết khám phá sản phẩm", () => {
    render(<WishlistView products={products} />);
    expect(screen.getByText("Bạn chưa có sản phẩm yêu thích nào")).toBeVisible();
    expect(screen.getByRole("link", { name: "Khám phá sản phẩm" })).toHaveAttribute(
      "href",
      "/products",
    );
  });

  it("hiển thị trạng thái trống khi mọi id đều không còn trong catalog", () => {
    seed(["ghost-1", "ghost-2"]);
    render(<WishlistView products={products} />);
    expect(screen.getByText("Bạn chưa có sản phẩm yêu thích nào")).toBeVisible();
  });

  it("liệt kê theo thứ tự đã thích, bỏ id không tồn tại, dùng giá hiện tại của catalog", () => {
    seed(["p003", "ghost", "p001"]);
    const repriced = products.map((product) =>
      product.id === "p001" ? { ...product, price: 999_000, originalPrice: undefined } : product,
    );
    render(<WishlistView products={repriced} />);

    const rows = screen.getAllByTestId("wishlist-item");
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByRole("link", { name: getProductById("p003")!.name })).toBeVisible();
    expect(within(rows[1]).getByTestId("price")).toHaveTextContent(/999\.000/);
  });

  it("bỏ thích làm sản phẩm biến mất khỏi trang", async () => {
    const user = userEvent.setup();
    seed(["p001"]);
    const name = getProductById("p001")!.name;
    render(<WishlistView products={products} />);

    await user.click(screen.getByRole("button", { name: `Bỏ thích ${name}` }));
    expect(screen.queryByTestId("wishlist-item")).not.toBeInTheDocument();
    expect(wishlistStore.getSnapshot().productIds).toEqual([]);
  });

  it("thêm vào giỏ nhưng sản phẩm vẫn nằm trong danh sách yêu thích", async () => {
    const user = userEvent.setup();
    seed(["p006"]);
    render(<WishlistView products={products} />);

    await user.click(screen.getByRole("button", { name: /Thêm vào giỏ/ }));
    expect(cartStore.getSnapshot().items).toEqual([
      expect.objectContaining({ productId: "p006", quantity: 1 }),
    ]);
    expect(wishlistStore.getSnapshot().productIds).toEqual(["p006"]);
    expect(screen.getByTestId("wishlist-item")).toBeVisible();
  });

  it("sản phẩm hết hàng hiển thị nhãn Hết hàng và không thêm vào giỏ được", () => {
    seed(["p004"]);
    render(<WishlistView products={products} />);
    const row = screen.getByTestId("wishlist-item");
    expect(within(row).getByRole("button", { name: "Hết hàng" })).toBeDisabled();
    expect(within(row).getAllByText("Hết hàng")).toHaveLength(2); // nhãn + nút
  });

  it("vô hiệu hóa nút thêm vào giỏ khi đã đạt số lượng tối đa trong giỏ", () => {
    const product = getProductById("p006")!;
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({
        items: [{ ...toCartItem(product), quantity: getMaxQuantity(product.stock) }],
      }),
    );
    cartStore.reset();
    seed(["p006"]);
    render(<WishlistView products={products} />);
    expect(screen.getByRole("button", { name: /Tối đa/ })).toBeDisabled();
  });

  it("trước khi đọc dữ liệu trình duyệt hiển thị trạng thái đang tải, không phải trạng thái trống", () => {
    seed(["p001"]);
    const html = renderToString(<WishlistView products={products} />);
    expect(html).toContain("aria-busy");
    expect(html).not.toContain("Bạn chưa có sản phẩm yêu thích nào");
    expect(html).not.toContain('data-testid="wishlist-item"');
  });
});
