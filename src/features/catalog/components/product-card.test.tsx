import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { getProductById } from "@/features/catalog/catalog-service";
import { cartStore } from "@/features/cart/cart-store";
import { wishlistStore } from "@/features/wishlist/wishlist-store";
import { ProductCard } from "./product-card";

describe("<ProductCard />", () => {
  beforeEach(() => {
    cartStore.reset();
    wishlistStore.reset();
  });

  it("hiển thị tên, giá, giá gốc và % giảm giá", () => {
    render(<ProductCard product={getProductById("p001")!} />);

    expect(screen.getByRole("heading", { name: "Tai nghe không dây SoundMax Pro" })).toBeVisible();
    expect(screen.getByTestId("price")).toHaveTextContent(/1\.290\.000/);
    expect(screen.getByText(/1\.590\.000/)).toHaveClass("line-through");
    expect(screen.getByText("-19%")).toBeVisible();
  });

  it("vô hiệu hóa nút mua khi sản phẩm hết hàng", () => {
    render(<ProductCard product={getProductById("p004")!} />);

    expect(screen.getByRole("button", { name: "Hết hàng" })).toBeDisabled();
    expect(screen.getAllByText("Hết hàng")).toHaveLength(2); // badge + nút
  });

  it("thêm sản phẩm vào giỏ khi bấm nút", async () => {
    const user = userEvent.setup();
    render(<ProductCard product={getProductById("p006")!} />);

    await user.click(screen.getByRole("button", { name: /Thêm vào giỏ/ }));

    expect(screen.getByRole("button", { name: /Đã thêm/ })).toBeVisible();
    expect(cartStore.getSnapshot().items).toEqual([
      expect.objectContaining({ productId: "p006", quantity: 1 }),
    ]);
  });

  it("có nút trái tim nằm ngoài mọi liên kết và đứng sau nút mua trong thứ tự Tab", () => {
    const product = getProductById("p006")!;
    render(<ProductCard product={product} />);

    const heart = screen.getByRole("button", {
      name: `Thêm ${product.name} vào danh sách yêu thích`,
    });
    expect(heart.closest("a")).toBeNull();

    const addToCart = screen.getByRole("button", { name: /Thêm vào giỏ/ });
    expect(
      addToCart.compareDocumentPosition(heart) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("sản phẩm hết hàng vẫn thích được", async () => {
    const user = userEvent.setup();
    const product = getProductById("p004")!;
    render(<ProductCard product={product} />);

    await user.click(
      screen.getByRole("button", { name: `Thêm ${product.name} vào danh sách yêu thích` }),
    );

    expect(wishlistStore.getSnapshot().productIds).toEqual(["p004"]);
  });
});
