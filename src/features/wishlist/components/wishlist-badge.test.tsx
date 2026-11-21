import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { wishlistStore } from "@/features/wishlist/wishlist-store";
import { WishlistBadge } from "./wishlist-badge";

describe("<WishlistBadge />", () => {
  beforeEach(() => wishlistStore.reset());

  it("chỉ hiện biểu tượng, không có số khi danh sách trống", () => {
    render(<WishlistBadge />);

    expect(screen.getByRole("link", { name: "Yêu thích" })).toHaveAttribute("href", "/wishlist");
    expect(screen.queryByTestId("wishlist-count")).not.toBeInTheDocument();
  });

  it("hiện số lượng và nhãn đọc được khi có sản phẩm", () => {
    for (const productId of ["p001", "p006", "p010"]) {
      wishlistStore.dispatch({ type: "toggle", productId });
    }
    render(<WishlistBadge />);

    expect(screen.getByTestId("wishlist-count")).toHaveTextContent("3");
    expect(screen.getByRole("link", { name: "Yêu thích (3 sản phẩm)" })).toBeVisible();
  });

  it("không đếm mã sản phẩm không còn trong catalog", () => {
    wishlistStore.dispatch({ type: "toggle", productId: "p001" });
    wishlistStore.dispatch({ type: "toggle", productId: "khong-ton-tai" });
    render(<WishlistBadge />);

    expect(screen.getByTestId("wishlist-count")).toHaveTextContent("1");
  });
});
