import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { getProductById } from "@/features/catalog/catalog-service";
import { MAX_WISHLIST_ITEMS } from "@/features/wishlist/wishlist-reducer";
import { wishlistStore } from "@/features/wishlist/wishlist-store";
import { WishlistButton } from "./wishlist-button";

const product = getProductById("p001")!;
const soldOut = getProductById("p004")!;

describe("<WishlistButton />", () => {
  beforeEach(() => wishlistStore.reset());

  it("thêm rồi bỏ thích, cập nhật aria-pressed và aria-label", async () => {
    const user = userEvent.setup();
    render(<WishlistButton product={product} />);

    const add = screen.getByRole("button", {
      name: `Thêm ${product.name} vào danh sách yêu thích`,
    });
    expect(add).toHaveAttribute("aria-pressed", "false");

    await user.click(add);
    const remove = screen.getByRole("button", {
      name: `Bỏ ${product.name} khỏi danh sách yêu thích`,
    });
    expect(remove).toHaveAttribute("aria-pressed", "true");
    expect(wishlistStore.getSnapshot().productIds).toEqual([product.id]);

    await user.click(remove);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
    expect(wishlistStore.getSnapshot().productIds).toEqual([]);
  });

  it("thích được sản phẩm hết hàng", async () => {
    const user = userEvent.setup();
    render(<WishlistButton product={soldOut} />);

    await user.click(screen.getByRole("button"));

    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
    expect(wishlistStore.getSnapshot().productIds).toEqual([soldOut.id]);
  });

  it("báo danh sách đầy khi đã có 50 sản phẩm và không thêm mới", async () => {
    const user = userEvent.setup();
    const ids = Array.from({ length: MAX_WISHLIST_ITEMS }, (_, i) => `x${i}`);
    window.localStorage.setItem("shoplite:wishlist", JSON.stringify({ productIds: ids }));
    wishlistStore.reset();
    render(<WishlistButton product={product} />);

    await user.click(screen.getByRole("button"));

    expect(screen.getByRole("status")).toHaveTextContent(/đã đầy/);
    expect(wishlistStore.getSnapshot().productIds).toHaveLength(MAX_WISHLIST_ITEMS);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
  });
});
