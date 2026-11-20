import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { cartStore } from "@/features/cart/cart-store";
import { getAllProducts, getProductById } from "@/features/catalog/catalog-service";
import { WISHLIST_STORAGE_KEY, wishlistStore } from "../wishlist-store";
import { WishlistView } from "./wishlist-view";

const products = getAllProducts();
const inStock = getProductById("p006")!;
const outOfStock = getProductById("p004")!;

function seed(productIds: unknown[]) {
  window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify({ productIds }));
  wishlistStore.reset();
}

const savedIds = () =>
  JSON.parse(window.localStorage.getItem(WISHLIST_STORAGE_KEY) ?? '{"productIds":[]}').productIds;

describe("<WishlistView />", () => {
  beforeEach(() => {
    window.localStorage.clear();
    wishlistStore.reset();
    cartStore.reset();
  });

  it("danh sách trống thì hiện lời mời khám phá sản phẩm", () => {
    render(<WishlistView products={products} />);
    expect(screen.getByText("Danh sách yêu thích đang trống")).toBeVisible();
    expect(screen.getByRole("link", { name: "Khám phá sản phẩm" })).toHaveAttribute(
      "href",
      "/products",
    );
  });

  it("liệt kê sản phẩm đã thích theo thứ tự thêm vào", () => {
    seed(["p006", "p001"]);
    render(<WishlistView products={products} />);

    const rows = screen.getAllByTestId("wishlist-item");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent(inStock.name);
    expect(rows[1]).toHaveTextContent(getProductById("p001")!.name);
  });

  it("giá lấy từ catalog hiện tại chứ không phải lúc thích", () => {
    seed(["p006"]);
    const updated = products.map((product) =>
      product.id === "p006" ? { ...product, price: 123_000, originalPrice: undefined } : product,
    );
    render(<WishlistView products={updated} />);

    expect(screen.getByTestId("price")).toHaveTextContent(/123\.000/);
  });

  it("bỏ thích thì sản phẩm biến mất khỏi danh sách", async () => {
    const user = userEvent.setup();
    seed(["p006", "p001"]);
    render(<WishlistView products={products} />);

    await user.click(
      screen.getByRole("button", { name: `Bỏ ${inStock.name} khỏi danh sách yêu thích` }),
    );

    expect(screen.getAllByTestId("wishlist-item")).toHaveLength(1);
    expect(screen.queryByText(inStock.name)).not.toBeInTheDocument();
    expect(savedIds()).toEqual(["p001"]);
  });

  it("thêm vào giỏ theo quy tắc giỏ hàng và vẫn giữ trong danh sách yêu thích", async () => {
    const user = userEvent.setup();
    seed(["p006"]);
    render(<WishlistView products={products} />);

    await user.click(screen.getByRole("button", { name: /Thêm vào giỏ/ }));

    expect(cartStore.getSnapshot().items).toEqual([
      expect.objectContaining({ productId: "p006", quantity: 1 }),
    ]);
    expect(screen.getAllByTestId("wishlist-item")).toHaveLength(1);
    expect(savedIds()).toEqual(["p006"]);
  });

  it("sản phẩm hết hàng hiện nhãn Hết hàng và không thêm vào giỏ được", () => {
    seed(["p004"]);
    render(<WishlistView products={products} />);

    const row = screen.getByTestId("wishlist-item");
    expect(row).toHaveTextContent(outOfStock.name);
    expect(within(row).getByRole("button", { name: "Hết hàng" })).toBeDisabled();
  });

  it("bỏ qua và loại mã không còn trong catalog khỏi dữ liệu đã lưu", () => {
    seed(["khong-ton-tai", "p006"]);
    render(<WishlistView products={products} />);

    expect(screen.getAllByTestId("wishlist-item")).toHaveLength(1);
    expect(savedIds()).toEqual(["p006"]);
    expect(wishlistStore.getSnapshot().productIds).toEqual(["p006"]);
  });

  it("dữ liệu đã lưu hỏng thì hiện trạng thái trống, không lỗi", () => {
    window.localStorage.setItem(WISHLIST_STORAGE_KEY, "abc");
    wishlistStore.reset();
    render(<WishlistView products={products} />);

    expect(screen.getByText("Danh sách yêu thích đang trống")).toBeVisible();
  });
});
