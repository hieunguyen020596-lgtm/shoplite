import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MAX_WISHLIST_ITEMS } from "../types";
import { wishlistStore } from "../wishlist-store";
import { WishlistBadge } from "./wishlist-badge";
import { WishlistButton } from "./wishlist-button";

describe("Wishlist Components", () => {
  beforeEach(() => {
    window.localStorage.clear();
    wishlistStore.reset();
  });

  describe("<WishlistButton />", () => {
    it("hiển thị trạng thái chưa thích và toggle khi được bấm", async () => {
      const user = userEvent.setup();
      render(
        <WishlistButton productId="p001" productName="Tai nghe SoundMax" />,
      );

      const button = screen.getByRole("button", {
        name: "Thêm Tai nghe SoundMax vào danh sách yêu thích",
      });
      expect(button).toHaveAttribute("aria-pressed", "false");

      await user.click(button);
      expect(button).toHaveAttribute("aria-pressed", "true");
      expect(button).toHaveAttribute(
        "aria-label",
        "Bỏ thích Tai nghe SoundMax",
      );

      await user.click(button);
      expect(button).toHaveAttribute("aria-pressed", "false");
    });

    it("hiển thị thông báo khi danh sách đã đạt tối đa 50 sản phẩm", async () => {
      const user = userEvent.setup();
      for (let i = 1; i <= MAX_WISHLIST_ITEMS; i++) {
        wishlistStore.dispatch({ type: "add", productId: `item-${i}` });
      }

      render(<WishlistButton productId="p051" productName="Sản phẩm thứ 51" />);
      const button = screen.getByRole("button", {
        name: "Thêm Sản phẩm thứ 51 vào danh sách yêu thích",
      });

      await user.click(button);

      expect(screen.getByRole("status")).toHaveTextContent(
        "Danh sách đã đầy (tối đa 50 sản phẩm)",
      );
      expect(button).toHaveAttribute("aria-pressed", "false");
    });
  });

  describe("<WishlistBadge />", () => {
    it("không hiển thị số đếm khi danh sách rỗng", () => {
      render(<WishlistBadge />);
      expect(screen.queryByTestId("wishlist-count")).not.toBeInTheDocument();
    });

    it("hiển thị số đếm chính xác khi danh sách có sản phẩm", () => {
      wishlistStore.dispatch({ type: "add", productId: "p001" });
      wishlistStore.dispatch({ type: "add", productId: "p002" });

      render(<WishlistBadge />);
      const count = screen.getByTestId("wishlist-count");
      expect(count).toBeInTheDocument();
      expect(count).toHaveTextContent("2");
    });
  });
});
