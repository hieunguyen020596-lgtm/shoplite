import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { CART_STORAGE_KEY, cartStore } from "@/features/cart/cart-store";
import { MAX_WISHLIST_ITEMS } from "../wishlist-reducer";
import { WISHLIST_STORAGE_KEY, wishlistStore } from "../wishlist-store";
import { WishlistButton } from "./wishlist-button";

const product = { id: "p007", name: "Bàn phím cơ KeyPro 75%" };
const LABEL = "Yêu thích Bàn phím cơ KeyPro 75%";

function seed(productIds: string[]) {
  window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify({ productIds }));
  wishlistStore.reset();
}

describe("<WishlistButton />", () => {
  beforeEach(() => {
    wishlistStore.reset();
    cartStore.reset();
  });

  it("bấm để thích rồi bấm lần nữa để bỏ thích; nhãn giữ nguyên, chỉ aria-pressed đổi", async () => {
    const user = userEvent.setup();
    render(<WishlistButton product={product} />);
    const button = screen.getByRole("button", { name: LABEL });
    expect(button).toHaveAttribute("aria-pressed", "false");

    await user.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveAccessibleName(LABEL);
    expect(wishlistStore.getSnapshot().productIds).toEqual(["p007"]);

    await user.click(button);
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button).toHaveAccessibleName(LABEL);
    expect(wishlistStore.getSnapshot().productIds).toEqual([]);
  });

  it("thao tác được bằng bàn phím (Enter và Space)", async () => {
    const user = userEvent.setup();
    render(<WishlistButton product={product} />);

    await user.tab();
    expect(screen.getByRole("button", { name: LABEL })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: LABEL })).toHaveAttribute("aria-pressed", "true");
    await user.keyboard(" ");
    expect(screen.getByRole("button", { name: LABEL })).toHaveAttribute("aria-pressed", "false");
  });

  it("hiển thị trạng thái đã thích từ dữ liệu đã lưu", () => {
    seed(["p007"]);
    render(<WishlistButton product={product} variant="inline" />);
    expect(screen.getByRole("button", { name: LABEL })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Đã thích")).toBeInTheDocument();
  });

  it("vùng thông báo có sẵn và báo đầy khi đã có 50 sản phẩm", async () => {
    const user = userEvent.setup();
    const ids = Array.from({ length: MAX_WISHLIST_ITEMS }, (_, index) => `x${index}`);
    seed(ids);
    render(<WishlistButton product={product} knownIds={ids} />);

    const status = screen.getByRole("status");
    expect(status).toBeEmptyDOMElement();

    await user.click(screen.getByRole("button", { name: LABEL }));
    expect(status).toHaveTextContent(`Danh sách yêu thích đã đầy (tối đa ${MAX_WISHLIST_ITEMS}`);
    expect(screen.getByRole("button", { name: LABEL })).toHaveAttribute("aria-pressed", "false");
    expect(wishlistStore.getSnapshot().productIds).toHaveLength(MAX_WISHLIST_ITEMS);
  });

  it("khi đầy nhưng có id không còn trong catalog thì vẫn thích được", async () => {
    const user = userEvent.setup();
    const ids = ["ghost", ...Array.from({ length: MAX_WISHLIST_ITEMS - 1 }, (_, i) => `x${i}`)];
    seed(ids);
    render(<WishlistButton product={product} knownIds={[...ids.slice(1), product.id]} />);

    await user.click(screen.getByRole("button", { name: LABEL }));
    expect(screen.getByRole("button", { name: LABEL })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("thích / bỏ thích không làm thay đổi giỏ hàng", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(CART_STORAGE_KEY, '{"items":[]}');
    render(<WishlistButton product={product} />);
    await user.click(screen.getByRole("button", { name: LABEL }));
    expect(window.localStorage.getItem(CART_STORAGE_KEY)).toBe('{"items":[]}');
    expect(cartStore.getSnapshot().items).toEqual([]);
  });

  it("HTML render phía server luôn ở trạng thái chưa thích dù đã lưu sẵn dữ liệu", () => {
    seed(["p007"]);
    const html = renderToString(<WishlistButton product={product} variant="inline" />);
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain("Yêu thích");
    expect(html).not.toContain("Đã thích");
  });
});
