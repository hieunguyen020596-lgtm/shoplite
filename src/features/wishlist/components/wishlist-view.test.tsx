import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { cartStore } from "@/features/cart/cart-store";
import { wishlistStore } from "@/features/wishlist/wishlist-store";
import { WishlistView } from "./wishlist-view";

describe("<WishlistView />", () => {
  beforeEach(() => {
    window.localStorage.clear();
    cartStore.reset();
    wishlistStore.reset();
  });

  it("hiển thị trạng thái rỗng khi chưa có sản phẩm nào", () => {
    render(<WishlistView />);
    expect(
      screen.getByText("Danh sách yêu thích của bạn đang trống"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Khám phá sản phẩm" }),
    ).toHaveAttribute("href", "/products");
  });

  it("hiển thị danh sách các sản phẩm đã yêu thích", () => {
    window.localStorage.setItem(
      "shoplite:wishlist",
      JSON.stringify({ productIds: ["p001", "p002"] }),
    );
    wishlistStore.reset();

    render(<WishlistView />);
    expect(screen.getAllByTestId("wishlist-item")).toHaveLength(2);
    expect(
      screen.getByText("Tai nghe không dây SoundMax Pro"),
    ).toBeInTheDocument();
    expect(screen.getByText("Loa Bluetooth BeatBox Mini")).toBeInTheDocument();
  });

  it("bỏ qua các id sản phẩm không tồn tại trong catalog", () => {
    window.localStorage.setItem(
      "shoplite:wishlist",
      JSON.stringify({ productIds: ["p001", "p_non_existent"] }),
    );
    wishlistStore.reset();

    render(<WishlistView />);
    expect(screen.getAllByTestId("wishlist-item")).toHaveLength(1);
    expect(
      screen.getByText("Tai nghe không dây SoundMax Pro"),
    ).toBeInTheDocument();
  });

  it("hiển thị trạng thái Hết hàng và vô hiệu hóa nút Thêm vào giỏ cho sản phẩm hết tồn kho", () => {
    window.localStorage.setItem(
      "shoplite:wishlist",
      JSON.stringify({ productIds: ["p004"] }), // Micro thu âm PodCast USB (stock = 0)
    );
    wishlistStore.reset();

    render(<WishlistView />);
    expect(screen.getByText("Micro thu âm PodCast USB")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hết hàng" })).toBeDisabled();
  });

  it("thêm sản phẩm vào giỏ hàng khi bấm Thêm vào giỏ", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      "shoplite:wishlist",
      JSON.stringify({ productIds: ["p001"] }),
    );
    wishlistStore.reset();
    render(<WishlistView />);
    const addButton = screen.getByRole("button", { name: /Thêm vào giỏ/ });
    await user.click(addButton);

    expect(cartStore.getSnapshot().items).toEqual([
      expect.objectContaining({ productId: "p001", quantity: 1 }),
    ]);
  });

  it("xóa sản phẩm khỏi danh sách khi bấm nút xóa", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      "shoplite:wishlist",
      JSON.stringify({ productIds: ["p001", "p002"] }),
    );
    wishlistStore.reset();

    render(<WishlistView />);
    const removeButtons = screen.getAllByTitle("Bỏ thích");
    await user.click(removeButtons[0]);

    expect(wishlistStore.getSnapshot().productIds).toEqual(["p002"]);
  });

  it("xóa toàn bộ danh sách khi bấm Xóa tất cả", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      "shoplite:wishlist",
      JSON.stringify({ productIds: ["p001", "p002"] }),
    );
    wishlistStore.reset();

    render(<WishlistView />);
    await user.click(screen.getByRole("button", { name: "Xóa tất cả" }));

    expect(wishlistStore.getSnapshot().productIds).toEqual([]);
    expect(
      screen.getByText("Danh sách yêu thích của bạn đang trống"),
    ).toBeInTheDocument();
  });
});
