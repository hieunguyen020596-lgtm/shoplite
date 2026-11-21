import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { cartStore } from "@/features/cart/cart-store";
import { wishlistStore } from "@/features/wishlist/wishlist-store";
import { WishlistView } from "./wishlist-view";

function seed(ids: string[]) {
  for (const productId of ids) wishlistStore.dispatch({ type: "toggle", productId });
}

describe("<WishlistView />", () => {
  beforeEach(() => {
    wishlistStore.reset();
    cartStore.reset();
  });

  it("hiển thị trạng thái trống với liên kết khám phá sản phẩm", () => {
    render(<WishlistView />);

    expect(screen.getByText("Danh sách yêu thích đang trống")).toBeVisible();
    expect(screen.getByRole("link", { name: "Khám phá sản phẩm" })).toHaveAttribute(
      "href",
      "/products",
    );
  });

  it("liệt kê sản phẩm đã thích và bỏ qua mã không còn trong catalog", () => {
    seed(["p006", "p010", "khong-ton-tai"]);
    render(<WishlistView />);

    expect(screen.getAllByTestId("wishlist-item")).toHaveLength(2);
  });

  it("thêm vào giỏ từ wishlist", async () => {
    const user = userEvent.setup();
    seed(["p006"]);
    render(<WishlistView />);

    await user.click(screen.getByRole("button", { name: /Thêm vào giỏ/ }));

    expect(cartStore.getSnapshot().items).toEqual([
      expect.objectContaining({ productId: "p006", quantity: 1 }),
    ]);
  });

  it("giữ sản phẩm hết hàng trong danh sách và không cho thêm vào giỏ", () => {
    seed(["p004"]);
    render(<WishlistView />);

    const item = screen.getByTestId("wishlist-item");
    expect(within(item).getByRole("button", { name: "Hết hàng" })).toBeDisabled();
  });

  it("bỏ thích ngay trên trang", async () => {
    const user = userEvent.setup();
    seed(["p006", "p010"]);
    render(<WishlistView />);

    await user.click(
      screen.getByRole("button", { name: /Bỏ Cáp USB-C.* khỏi danh sách yêu thích/ }),
    );

    expect(screen.getAllByTestId("wishlist-item")).toHaveLength(1);
    expect(wishlistStore.getSnapshot().productIds).toEqual(["p006"]);
  });
});
