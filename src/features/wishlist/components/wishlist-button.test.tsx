import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { wishlistStore } from "@/features/wishlist/wishlist-store";
import { WishlistButton } from "./wishlist-button";

describe("<WishlistButton />", () => {
  beforeEach(() => {
    window.localStorage.clear();
    wishlistStore.reset();
  });

  it("hiển thị trạng thái chưa thích ban đầu với aria-pressed=false", () => {
    render(<WishlistButton productId="p001" productName="Tai nghe SoundMax" />);

    const button = screen.getByRole("button", {
      name: "Thêm Tai nghe SoundMax vào danh sách yêu thích",
    });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("toggle trạng thái yêu thích khi bấm nút", async () => {
    const user = userEvent.setup();
    render(<WishlistButton productId="p001" productName="Tai nghe SoundMax" />);

    const button = screen.getByRole("button", {
      name: "Thêm Tai nghe SoundMax vào danh sách yêu thích",
    });
    await user.click(button);

    expect(wishlistStore.getSnapshot().productIds).toContain("p001");
    expect(
      screen.getByRole("button", {
        name: "Xóa Tai nghe SoundMax khỏi danh sách yêu thích",
      }),
    ).toHaveAttribute("aria-pressed", "true");

    await user.click(button);
    expect(wishlistStore.getSnapshot().productIds).not.toContain("p001");
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("báo lỗi khi danh sách đã đầy 50 sản phẩm", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const fullIds = Array.from({ length: 50 }, (_, i) => `p${i + 1}`);
    window.localStorage.setItem(
      "shoplite:wishlist",
      JSON.stringify({ productIds: fullIds }),
    );
    wishlistStore.reset();

    const user = userEvent.setup();
    render(<WishlistButton productId="p_new" productName="Sản phẩm mới" />);

    await user.click(
      screen.getByRole("button", {
        name: "Thêm Sản phẩm mới vào danh sách yêu thích",
      }),
    );

    expect(alertSpy).toHaveBeenCalledWith(
      "Danh sách yêu thích đã đầy (tối đa 50 sản phẩm).",
    );
    expect(wishlistStore.getSnapshot().productIds).not.toContain("p_new");
    alertSpy.mockRestore();
  });

  it("hỗ trợ điều khiển bằng bàn phím qua phím Enter", async () => {
    const user = userEvent.setup();
    render(<WishlistButton productId="p001" productName="Tai nghe SoundMax" />);

    const button = screen.getByRole("button");
    button.focus();
    expect(button).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(wishlistStore.getSnapshot().productIds).toContain("p001");
  });
});
