import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { WISHLIST_STORAGE_KEY, wishlistStore } from "../wishlist-store";
import { WishlistBadge } from "./wishlist-badge";

const KNOWN = ["p001", "p002", "p003"];

function seed(productIds: string[]) {
  window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify({ productIds }));
  wishlistStore.reset();
}

describe("<WishlistBadge />", () => {
  beforeEach(() => wishlistStore.reset());

  it("không hiển thị số khi danh sách rỗng", () => {
    render(<WishlistBadge knownProductIds={KNOWN} />);
    expect(screen.getByRole("link", { name: "Yêu thích" })).toHaveAttribute("href", "/wishlist");
    expect(screen.queryByTestId("wishlist-count")).not.toBeInTheDocument();
  });

  it("đếm số sản phẩm yêu thích còn trong catalog", () => {
    seed(["p001", "ghost", "p002"]);
    render(<WishlistBadge knownProductIds={KNOWN} />);
    expect(screen.getByRole("link", { name: "Yêu thích (2 sản phẩm)" })).toBeVisible();
    expect(screen.getByTestId("wishlist-count")).toHaveTextContent("2");
  });

  it("không hiển thị số khi mọi id đều không còn trong catalog", () => {
    seed(["ghost"]);
    render(<WishlistBadge knownProductIds={KNOWN} />);
    expect(screen.queryByTestId("wishlist-count")).not.toBeInTheDocument();
  });

  it("cập nhật khi danh sách thay đổi", () => {
    render(<WishlistBadge knownProductIds={KNOWN} />);
    act(() => {
      wishlistStore.toggle("p003");
    });
    expect(screen.getByTestId("wishlist-count")).toHaveTextContent("1");
  });
});
