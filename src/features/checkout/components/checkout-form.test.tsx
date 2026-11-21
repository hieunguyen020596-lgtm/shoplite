import { act, render, screen, waitFor, within } from "@testing-library/react";
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
    const fetchMock = vi.fn().mockResolvedValue(
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

  it("hiển thị thông báo lỗi từ server", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: "INSUFFICIENT_STOCK",
              message: "Sản phẩm đã hết hàng",
            },
          }),
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();
    render(<CheckoutForm />);

    await user.type(screen.getByLabelText(/Họ và tên/), "Nguyễn Văn A");
    await user.type(screen.getByLabelText(/Số điện thoại/), "0912345678");
    await user.type(
      screen.getByLabelText(/Địa chỉ giao hàng/),
      "12 Nguyễn Huệ, Quận 1, TP.HCM",
    );
    await user.click(screen.getByRole("button", { name: "Đặt hàng" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Sản phẩm đã hết hàng",
    );
    expect(push).not.toHaveBeenCalled();
  });
  describe("thiếu hàng", () => {
    function conflict(
      lines: unknown,
      code = "INSUFFICIENT_STOCK",
      status = 409,
    ) {
      return new Response(
        JSON.stringify({
          error: { code, message: "Lỗi từ server", details: { lines } },
        }),
        { status },
      );
    }

    async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
      await user.type(screen.getByLabelText(/Họ và tên/), "Nguyễn Văn A");
      await user.type(screen.getByLabelText(/Số điện thoại/), "0912345678");
      await user.type(
        screen.getByLabelText(/Địa chỉ giao hàng/),
        "12 Nguyễn Huệ, Quận 1, TP.HCM",
      );
      await user.click(screen.getByRole("button", { name: "Đặt hàng" }));
    }

    function addSecond() {
      cartStore.dispatch({
        type: "add",
        item: toCartItem(getProductById("p011")!),
        quantity: 3,
      });
    }

    it("giữ form, hiện dòng thiếu, khóa Đặt hàng; Lấy N rồi đặt lại gửi đúng số lượng", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          conflict([{ productId: "p010", requested: 2, available: 1 }]),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ id: "SL-1" }), { status: 201 }),
        );
      vi.stubGlobal("fetch", fetchMock);
      const user = userEvent.setup();
      render(<CheckoutForm />);
      await fillAndSubmit(user);

      expect(
        await screen.findByText("Một số sản phẩm không đủ hàng"),
      ).toBeVisible();
      expect(screen.getByText("Chọn cách xử lý để đặt tiếp.")).toBeVisible();
      expect(screen.getByText("Bạn chọn 2 · Chỉ còn 1")).toBeVisible();
      expect(screen.getByRole("button", { name: "Đặt hàng" })).toBeDisabled();
      expect(screen.getByLabelText(/Họ và tên/)).toHaveValue("Nguyễn Văn A");

      await user.click(screen.getByRole("button", { name: /^Lấy 1/ }));
      expect(screen.queryAllByTestId("stock-conflict-row")).toHaveLength(0);
      expect(cartStore.getSnapshot().items[0].quantity).toBe(1);
      expect(screen.getByRole("button", { name: "Đặt hàng" })).toBeEnabled();

      await user.click(screen.getByRole("button", { name: "Đặt hàng" }));
      expect(JSON.parse(fetchMock.mock.calls[1][1].body).items).toEqual([
        { productId: "p010", quantity: 1 },
      ]);
      expect(push).toHaveBeenCalled();
    });

    it("nhiều dòng: xử lý hết mới mở Đặt hàng; Bỏ xóa khỏi giỏ", async () => {
      addSecond();
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          conflict([
            { productId: "p010", requested: 2, available: 1 },
            { productId: "p011", requested: 3, available: 0 },
          ]),
        ),
      );
      const user = userEvent.setup();
      render(<CheckoutForm />);
      await fillAndSubmit(user);

      const rows = await screen.findAllByTestId("stock-conflict-row");
      expect(rows).toHaveLength(2);
      expect(within(rows[1]).getByText("Hết hàng")).toBeVisible();
      expect(
        within(rows[1]).queryByRole("button", { name: /^Lấy/ }),
      ).toBeNull();

      await user.click(within(rows[1]).getByRole("button", { name: /^Bỏ/ }));
      expect(cartStore.getSnapshot().items.map((i) => i.productId)).toEqual([
        "p010",
      ]);
      expect(screen.getByRole("button", { name: "Đặt hàng" })).toBeDisabled();

      await user.click(screen.getByRole("button", { name: /^Lấy 1/ }));
      expect(screen.getByRole("button", { name: "Đặt hàng" })).toBeEnabled();
    });

    it("bỏ hết thì hiện giỏ trống", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            conflict([{ productId: "p010", requested: 2, available: 0 }]),
          ),
      );
      const user = userEvent.setup();
      render(<CheckoutForm />);
      await fillAndSubmit(user);
      await user.click(await screen.findByRole("button", { name: /^Bỏ/ }));
      expect(screen.getByText("Chưa có sản phẩm để thanh toán")).toBeVisible();
    });

    it("gửi lại bị thiếu dòng mới thì thay danh sách, form giữ dữ liệu", async () => {
      addSecond();
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce(
            conflict([{ productId: "p010", requested: 2, available: 1 }]),
          )
          .mockResolvedValueOnce(
            conflict([{ productId: "p011", requested: 3, available: 2 }]),
          ),
      );
      const user = userEvent.setup();
      render(<CheckoutForm />);
      await fillAndSubmit(user);
      await user.click(await screen.findByRole("button", { name: /^Lấy 1/ }));
      await user.click(screen.getByRole("button", { name: "Đặt hàng" }));

      expect(await screen.findByText("Bạn chọn 3 · Chỉ còn 2")).toBeVisible();
      expect(screen.getAllByTestId("stock-conflict-row")).toHaveLength(1);
      expect(screen.getByLabelText(/Họ và tên/)).toHaveValue("Nguyễn Văn A");
    });

    it("bấm Đặt hàng liên tiếp chỉ gửi một request", async () => {
      let resolve!: (r: Response) => void;
      const fetchMock = vi
        .fn()
        .mockReturnValue(new Promise<Response>((r) => (resolve = r)));
      vi.stubGlobal("fetch", fetchMock);
      const user = userEvent.setup();
      render(<CheckoutForm />);
      await fillAndSubmit(user);
      const form = screen
        .getByRole("button", { name: /Đang đặt hàng/ })
        .closest("form")!;
      form.requestSubmit();
      form.requestSubmit();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      resolve(new Response(JSON.stringify({ id: "SL-1" }), { status: 201 }));
      await waitFor(() => expect(push).toHaveBeenCalled());
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("giỏ giảm xuống bằng available thì dòng tự hết, số lượng không tăng", async () => {
      cartStore.dispatch({
        type: "update-quantity",
        productId: "p010",
        quantity: 5,
      });
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            conflict([{ productId: "p010", requested: 5, available: 3 }]),
          ),
      );
      const user = userEvent.setup();
      render(<CheckoutForm />);
      await fillAndSubmit(user);
      expect(await screen.findByText("Bạn chọn 5 · Chỉ còn 3")).toBeVisible();

      act(() => {
        cartStore.dispatch({
          type: "update-quantity",
          productId: "p010",
          quantity: 2,
        });
      });
      expect(screen.queryByTestId("stock-conflict-row")).toBeNull();
      expect(cartStore.getSnapshot().items[0].quantity).toBe(2);
      expect(screen.getByRole("button", { name: "Đặt hàng" })).toBeEnabled();
    });

    it("chỉ có productId lạ thì hiện error.message, không có dòng thiếu", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            conflict([{ productId: "zzz", requested: 2, available: 1 }]),
          ),
      );
      const user = userEvent.setup();
      render(<CheckoutForm />);
      await fillAndSubmit(user);
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Lỗi từ server",
      );
      expect(screen.queryByTestId("stock-conflict-row")).toBeNull();
    });

    it("trộn id đúng và id lạ thì hiện đúng một dòng", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          conflict([
            { productId: "zzz", requested: 2, available: 1 },
            { productId: "p010", requested: 2, available: 1 },
          ]),
        ),
      );
      const user = userEvent.setup();
      render(<CheckoutForm />);
      await fillAndSubmit(user);
      expect(await screen.findAllByTestId("stock-conflict-row")).toHaveLength(
        1,
      );
    });

    it("dòng có available >= requested không phải thiếu hàng: hiện error.message", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            conflict([{ productId: "p010", requested: 2, available: 2 }]),
          ),
      );
      const user = userEvent.setup();
      render(<CheckoutForm />);
      await fillAndSubmit(user);
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Lỗi từ server",
      );
      expect(screen.queryByTestId("stock-conflict-row")).toBeNull();
    });

    it("lỗi mạng xóa danh sách thiếu cũ", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce(
            conflict([{ productId: "p010", requested: 2, available: 1 }]),
          )
          .mockRejectedValueOnce(new Error("net")),
      );
      const user = userEvent.setup();
      render(<CheckoutForm />);
      await fillAndSubmit(user);
      await screen.findAllByTestId("stock-conflict-row");
      // Tab khác giảm giỏ về 1: dòng ẩn đi, gửi lại gặp lỗi mạng.
      act(() => {
        cartStore.dispatch({
          type: "update-quantity",
          productId: "p010",
          quantity: 1,
        });
      });
      await user.click(screen.getByRole("button", { name: "Đặt hàng" }));
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Không kết nối được máy chủ",
      );
      // Giỏ tăng lại 2: dòng thiếu cũ không được quay lại.
      act(() => {
        cartStore.dispatch({
          type: "update-quantity",
          productId: "p010",
          quantity: 2,
        });
      });
      expect(screen.queryByTestId("stock-conflict-row")).toBeNull();
    });

    it("focus: tiêu đề khi hiện và còn dòng, nút Đặt hàng khi xử lý hết", async () => {
      addSecond();
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          conflict([
            { productId: "p010", requested: 2, available: 1 },
            { productId: "p011", requested: 3, available: 0 },
          ]),
        ),
      );
      const user = userEvent.setup();
      render(<CheckoutForm />);
      await fillAndSubmit(user);
      const heading = await screen.findByText("Một số sản phẩm không đủ hàng");
      await waitFor(() => expect(heading).toHaveFocus());

      await user.click(screen.getAllByRole("button", { name: /^Bỏ/ })[1]);
      await waitFor(() =>
        expect(screen.getByText("Một số sản phẩm không đủ hàng")).toHaveFocus(),
      );
      await user.click(screen.getByRole("button", { name: /^Lấy 1/ }));
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Đặt hàng" })).toHaveFocus(),
      );
    });

    it.each([
      [
        "details.lines sai dạng",
        [{ productId: "p010", requested: "2", available: 1 }],
        "INSUFFICIENT_STOCK",
      ],
      ["lines rỗng", [], "INSUFFICIENT_STOCK"],
      [
        "mã lỗi khác",
        [{ productId: "p010", requested: 2, available: 1 }],
        "VALIDATION_FAILED",
      ],
    ])("%s: hiện error.message, không khóa nút", async (_name, lines, code) => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(conflict(lines, code)));
      const user = userEvent.setup();
      render(<CheckoutForm />);
      await fillAndSubmit(user);

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Lỗi từ server",
      );
      expect(screen.queryByTestId("stock-conflict-row")).toBeNull();
      expect(screen.getByRole("button", { name: "Đặt hàng" })).toBeEnabled();
    });

    it("RATE_LIMITED hiện error.message, form giữ nguyên", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(conflict(undefined, "RATE_LIMITED", 429)),
      );
      const user = userEvent.setup();
      render(<CheckoutForm />);
      await fillAndSubmit(user);
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Lỗi từ server",
      );
      expect(screen.getByLabelText(/Họ và tên/)).toHaveValue("Nguyễn Văn A");
    });
  });
});
