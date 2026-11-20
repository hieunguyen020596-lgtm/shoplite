import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { WISHLIST_MAX_ITEMS } from "../wishlist-reducer";
import { WISHLIST_STORAGE_KEY, wishlistStore } from "../wishlist-store";
import { WishlistBadge } from "./wishlist-badge";

function seed(productIds: string[]) {
  window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify({ productIds }));
  wishlistStore.reset();
}

const ids = (count: number) => Array.from({ length: count }, (_, index) => `id-${index}`);

describe("<WishlistBadge />", () => {
  beforeEach(() => {
    window.localStorage.clear();
    wishlistStore.reset();
  });

  it("danh sách rỗng thì vẫn có biểu tượng dẫn tới /wishlist nhưng không có số", () => {
    render(<WishlistBadge />);
    expect(screen.getByRole("link", { name: "Danh sách yêu thích" })).toHaveAttribute(
      "href",
      "/wishlist",
    );
    expect(screen.queryByTestId("wishlist-count")).not.toBeInTheDocument();
  });

  it("có 2 sản phẩm thì hiện số 2 và nhãn nêu số lượng", () => {
    seed(["p001", "p002"]);
    render(<WishlistBadge />);
    expect(
      screen.getByRole("link", { name: "Danh sách yêu thích (2 sản phẩm)" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("wishlist-count")).toHaveTextContent("2");
  });

  it("danh sách đầy thì hiện đúng số tối đa", () => {
    seed(ids(WISHLIST_MAX_ITEMS));
    render(<WishlistBadge />);
    expect(screen.getByTestId("wishlist-count")).toHaveTextContent(String(WISHLIST_MAX_ITEMS));
  });

  it("cập nhật khi danh sách thay đổi", () => {
    render(<WishlistBadge />);
    act(() => wishlistStore.dispatch({ type: "toggle", productId: "p001" }));
    expect(screen.getByTestId("wishlist-count")).toHaveTextContent("1");
  });
});
