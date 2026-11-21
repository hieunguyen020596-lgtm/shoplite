import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getProductById } from "@/features/catalog/catalog-service";
import { toCartItem } from "@/features/cart/cart-reducer";
import { cartStore } from "@/features/cart/cart-store";
import { CartView } from "./cart-view";

function seedCart(entries: [productId: string, quantity: number][]) {
  for (const [productId, quantity] of entries) {
    cartStore.dispatch({
      type: "add",
      item: toCartItem(getProductById(productId)!),
      quantity,
    });
  }
}

describe("<CartView />", () => {
  beforeEach(() => {
    cartStore.reset();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const ids = decodeURIComponent(url.split("ids=")[1] ?? "").split(",");
        return Response.json({
          stock: Object.fromEntries(ids.map((id) => [id, 100])),
        });
      }),
    );
  });

  it("hiển thị trạng thái giỏ hàng trống", () => {
    render(<CartView />);
    expect(screen.getByText("Giỏ hàng của bạn đang trống")).toBeVisible();
  });

  it("hiển thị gợi ý mua thêm để được miễn phí giao hàng", () => {
    seedCart([["p010", 1]]); // 150.000đ
    render(<CartView />);

    expect(screen.getAllByTestId("cart-item")).toHaveLength(1);
    expect(screen.getByText(/Mua thêm 350\.000/)).toBeVisible();
    expect(screen.getByTestId("cart-total")).toHaveTextContent(/180\.000/);
  });

  it("cập nhật số lượng và tổng tiền", async () => {
    const user = userEvent.setup();
    seedCart([["p010", 1]]);
    render(<CartView />);

    const row = screen.getByTestId("cart-item");
    await user.click(
      within(row).getByRole("button", { name: "Tăng số lượng" }),
    );

    expect(within(row).getByRole("spinbutton")).toHaveValue(2);
    expect(screen.getByTestId("cart-total")).toHaveTextContent(/330\.000/);
  });

  it("xóa sản phẩm khỏi giỏ", async () => {
    const user = userEvent.setup();
    seedCart([
      ["p010", 1],
      ["p006", 1],
    ]);
    render(<CartView />);

    await user.click(screen.getByRole("button", { name: /Xóa Cáp USB-C/ }));

    expect(screen.getAllByTestId("cart-item")).toHaveLength(1);
    expect(screen.queryByText("Cáp USB-C bện dù 2m")).not.toBeInTheDocument();
  });

  it("tồn thật thấp hơn thì khóa nút tăng, không tự giảm số đã có", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ stock: { p010: 2 } })),
    );
    seedCart([["p010", 2]]);
    render(<CartView />);
    const row = screen.getByTestId("cart-item");
    await waitFor(() =>
      expect(
        within(row).getByRole("button", { name: "Tăng số lượng" }),
      ).toBeDisabled(),
    );
    expect(within(row).getByRole("spinbutton")).toHaveValue(2);
  });

  it("tải tồn lỗi thì giới hạn 10", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({}, { status: 500 })),
    );
    seedCart([["p010", 9]]);
    render(<CartView />);
    const row = screen.getByTestId("cart-item");
    await userEvent
      .setup()
      .click(within(row).getByRole("button", { name: "Tăng số lượng" }));
    expect(within(row).getByRole("spinbutton")).toHaveValue(10);
  });
});
