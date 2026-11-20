import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { getProductById } from "@/features/catalog/catalog-service";
import { WISHLIST_MAX_ITEMS } from "../wishlist-reducer";
import { WISHLIST_STORAGE_KEY, wishlistStore } from "../wishlist-store";
import { WISHLIST_FULL_MESSAGE, WishlistButton } from "./wishlist-button";

const product = getProductById("p001")!;
const addLabel = `Thêm ${product.name} vào danh sách yêu thích`;
const removeLabel = `Bỏ ${product.name} khỏi danh sách yêu thích`;

function seed(productIds: string[]) {
  window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify({ productIds }));
  wishlistStore.reset();
}

describe("<WishlistButton />", () => {
  beforeEach(() => {
    window.localStorage.clear();
    wishlistStore.reset();
  });

  it("bấm để thích rồi bấm lần nữa để bỏ, aria-pressed và nhãn đổi theo", async () => {
    const user = userEvent.setup();
    render(<WishlistButton product={product} />);

    const button = screen.getByRole("button", { name: addLabel });
    expect(button).toHaveAttribute("aria-pressed", "false");

    await user.click(button);
    expect(screen.getByRole("button", { name: removeLabel })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(wishlistStore.getSnapshot().productIds).toEqual(["p001"]);

    await user.click(screen.getByRole("button", { name: removeLabel }));
    expect(screen.getByRole("button", { name: addLabel })).toHaveAttribute("aria-pressed", "false");
    expect(wishlistStore.getSnapshot().productIds).toEqual([]);
  });

  it("hiển thị đúng trạng thái đã thích từ dữ liệu đã lưu", () => {
    seed(["p001"]);
    render(<WishlistButton product={product} />);
    expect(screen.getByRole("button", { name: removeLabel })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("thao tác được bằng bàn phím (Enter và Space)", async () => {
    const user = userEvent.setup();
    render(<WishlistButton product={product} />);

    await user.tab();
    expect(screen.getByRole("button", { name: addLabel })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(wishlistStore.getSnapshot().productIds).toEqual(["p001"]);
    await user.keyboard(" ");
    expect(wishlistStore.getSnapshot().productIds).toEqual([]);
  });

  it("variant full hiển thị chữ Yêu thích / Đã thích", async () => {
    const user = userEvent.setup();
    render(<WishlistButton product={product} variant="full" />);

    expect(screen.getByRole("button", { name: addLabel })).toHaveTextContent("Yêu thích");
    await user.click(screen.getByRole("button", { name: addLabel }));
    expect(screen.getByRole("button", { name: removeLabel })).toHaveTextContent("Đã thích");
  });

  it("render phía server luôn ở trạng thái chưa thích dù đã lưu (tránh lệch hydrate)", () => {
    seed(["p001"]);
    const html = renderToString(<WishlistButton product={product} />);
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain(`aria-label="${addLabel}"`);
  });

  it("vùng thông báo có sẵn và rỗng từ lần render đầu", () => {
    render(<WishlistButton product={product} />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("danh sách đủ 50 thì báo đầy cho screen reader và không thêm", async () => {
    seed(Array.from({ length: WISHLIST_MAX_ITEMS }, (_, index) => `id-${index}`));
    const user = userEvent.setup();
    render(<WishlistButton product={product} />);

    await user.click(screen.getByRole("button", { name: addLabel }));

    expect(screen.getByRole("status")).toHaveTextContent(WISHLIST_FULL_MESSAGE);
    expect(screen.getByRole("button", { name: addLabel })).toHaveAttribute("aria-pressed", "false");
    expect(wishlistStore.getSnapshot().productIds).not.toContain("p001");
  });

  it("đồng bộ khi tab khác thay đổi danh sách", () => {
    render(<WishlistButton product={product} />);

    act(() => {
      window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify({ productIds: ["p001"] }));
      window.dispatchEvent(new StorageEvent("storage", { key: WISHLIST_STORAGE_KEY }));
    });

    expect(screen.getByRole("button", { name: removeLabel })).toBeInTheDocument();
  });
});
