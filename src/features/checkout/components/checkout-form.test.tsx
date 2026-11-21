import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getProductById } from "@/features/catalog/catalog-service";
import { toCartItem } from "@/features/cart/cart-reducer";
import { cartStore } from "@/features/cart/cart-store";
import { CheckoutForm } from "./checkout-form";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
}));

describe("<CheckoutForm />", () => {
  beforeEach(() => {
    cartStore.reset();
    cartStore.dispatch({
      type: "add",
      item: toCartItem(getProductById("p010")!),
      quantity: 2,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    push.mockReset();
  });

  it("hiển thị lỗi validate khi gửi form trống và không gọi API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<CheckoutForm />);

    await user.click(screen.getByRole("button", { name: "Đặt hàng" }));

    expect(screen.getByTestId("error-fullName")).toBeVisible();
    expect(screen.getByTestId("error-phone")).toHaveTextContent(
      /Số điện thoại không hợp lệ/,
    );
    expect(screen.getByTestId("error-address")).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("cập nhật phí giao hàng khi đổi phương thức giao hàng", async () => {
    const user = userEvent.setup();
    render(<CheckoutForm />);

    expect(screen.getByTestId("shipping-fee")).toHaveTextContent(/30\.000/);
    await user.click(screen.getByText("Giao hàng nhanh"));
    expect(screen.getByTestId("shipping-fee")).toHaveTextContent(/60\.000/);
  });

  it("gửi đơn hàng, xóa giỏ và chuyển tới trang đơn hàng", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ id: "SL-20261021-ABC123" }), {
          status: 201,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<CheckoutForm />);

    await user.type(screen.getByLabelText(/Họ và tên/), "Nguyễn Văn A");
    await user.type(screen.getByLabelText(/Số điện thoại/), "0912345678");
    await user.type(
      screen.getByLabelText(/Địa chỉ giao hàng/),
      "12 Nguyễn Huệ, Quận 1, TP.HCM",
    );
    await user.click(screen.getByRole("button", { name: "Đặt hàng" }));

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/orders");
    expect(JSON.parse(init.body)).toMatchObject({
      shippingMethod: "standard",
      paymentMethod: "cod",
      items: [{ productId: "p010", quantity: 2 }],
      customer: { fullName: "Nguyễn Văn A", phone: "0912345678" },
    });
    expect(push).toHaveBeenCalledWith("/orders/SL-20261021-ABC123?placed=1");
    expect(cartStore.getSnapshot().items).toEqual([]);
  });

  it("hiển thị thông báo lỗi từ server và giữ nguyên toàn bộ form cùng giỏ hàng khi gặp 409 INSUFFICIENT_STOCK", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: "INSUFFICIENT_STOCK",
              message: "Sản phẩm đã hết hàng",
              details: { productId: "p010", available: "0", requested: "2" },
            },
          }),
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();
    render(<CheckoutForm />);

    const fullNameInput = screen.getByLabelText(/Họ và tên/);
    const phoneInput = screen.getByLabelText(/Số điện thoại/);
    const emailInput = screen.getByLabelText(/Email/);
    const addressInput = screen.getByLabelText(/Địa chỉ giao hàng/);
    const noteInput = screen.getByLabelText(/Ghi chú/);

    await user.type(fullNameInput, "Nguyễn Văn A");
    await user.type(phoneInput, "0912345678");
    await user.type(emailInput, "vana@example.com");
    await user.type(addressInput, "12 Nguyễn Huệ, Quận 1, TP.HCM");
    await user.type(noteInput, "Giao giờ hành chính");
    await user.click(screen.getByRole("button", { name: "Đặt hàng" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Sản phẩm đã hết hàng",
    );
    expect(push).not.toHaveBeenCalled();

    // Giữ nguyên toàn bộ trường đã nhập để khách sửa/thử lại
    expect(fullNameInput).toHaveValue("Nguyễn Văn A");
    expect(phoneInput).toHaveValue("0912345678");
    expect(emailInput).toHaveValue("vana@example.com");
    expect(addressInput).toHaveValue("12 Nguyễn Huệ, Quận 1, TP.HCM");
    expect(noteInput).toHaveValue("Giao giờ hành chính");

    // Giữ nguyên giỏ hàng và mở lại nút Đặt hàng (status === "idle")
    expect(cartStore.getSnapshot().items).toEqual([
      expect.objectContaining({ productId: "p010", quantity: 2 }),
    ]);
    expect(screen.getByRole("button", { name: "Đặt hàng" })).toBeEnabled();
  });
});
