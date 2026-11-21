import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { cartStore } from "@/features/cart/cart-store";
import { wishlistStore } from "@/features/wishlist/wishlist-store";
import WishlistPage from "./page";

describe("<WishlistPage />", () => {
  beforeEach(() => {
    window.localStorage.clear();
    wishlistStore.reset();
    cartStore.reset();
  });

  it("hiển thị trạng thái rỗng khi không có sản phẩm yêu thích", () => {
    render(<WishlistPage />);

    expect(screen.getByText("Danh sách yêu thích trống")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Khám phá sản phẩm" }),
    ).toHaveAttribute("href", "/products");
  });

  it("hiển thị các sản phẩm đã lưu và cho phép xóa khỏi danh sách", async () => {
    const user = userEvent.setup();
    wishlistStore.dispatch({ type: "add", productId: "p001" });

    render(<WishlistPage />);

    expect(
      screen.getByText("Tai nghe không dây SoundMax Pro"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("wishlist-item")).toBeInTheDocument();

    const removeBtn = screen.getByRole("button", {
      name: "Xóa Tai nghe không dây SoundMax Pro khỏi danh sách yêu thích",
    });
    await user.click(removeBtn);

    expect(screen.getByText("Danh sách yêu thích trống")).toBeInTheDocument();
  });

  it("cho phép thêm sản phẩm còn hàng vào giỏ từ trang yêu thích", async () => {
    const user = userEvent.setup();
    wishlistStore.dispatch({ type: "add", productId: "p001" });

    render(<WishlistPage />);

    const addToCartBtn = screen.getByRole("button", { name: "Thêm vào giỏ" });
    await user.click(addToCartBtn);

    expect(cartStore.getSnapshot().items).toHaveLength(1);
    expect(cartStore.getSnapshot().items[0]?.productId).toBe("p001");
  });

  it("tự động bỏ qua mã sản phẩm không tồn tại trong catalog", () => {
    wishlistStore.dispatch({ type: "add", productId: "non-existent-id" });

    render(<WishlistPage />);

    expect(screen.getByText("Danh sách yêu thích trống")).toBeInTheDocument();
  });

  it("hiển thị nhãn Hết hàng và vô hiệu hóa nút thêm vào giỏ cho sản phẩm hết hàng", () => {
    wishlistStore.dispatch({ type: "add", productId: "p004" });

    render(<WishlistPage />);

    expect(screen.getByText("Micro thu âm PodCast USB")).toBeInTheDocument();
    const disabledBtn = screen.getByRole("button", { name: "Hết hàng" });
    expect(disabledBtn).toBeDisabled();
  });
});
