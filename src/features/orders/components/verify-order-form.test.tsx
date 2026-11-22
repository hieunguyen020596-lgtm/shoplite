import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VerifyOrderForm } from "./verify-order-form";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

async function submit(phone = "0900000000") {
  const user = userEvent.setup();
  await user.type(
    screen.getByLabelText("Nhập SĐT đặt hàng để xem đầy đủ"),
    phone,
  );
  await user.click(screen.getByRole("button", { name: "Xem đầy đủ" }));
}

describe("<VerifyOrderForm />", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    refresh.mockReset();
  });

  it("ô SĐT có inputMode tel và autoComplete tel", () => {
    render(<VerifyOrderForm orderId="SL-1" />);
    const input = screen.getByLabelText("Nhập SĐT đặt hàng để xem đầy đủ");
    expect(input).toHaveAttribute("inputmode", "tel");
    expect(input).toHaveAttribute("autocomplete", "tel");
  });

  it("thành công thì làm mới trang", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, { verified: true }));
    vi.stubGlobal("fetch", fetchMock);
    render(<VerifyOrderForm orderId="SL-1" />);
    await submit();
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/orders/SL-1/verify",
      expect.anything(),
    );
  });

  it("sai SĐT: báo lỗi dưới ô, giữ giá trị, hiện 'Còn N lần thử' khi còn ≤ 2", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          json(403, {
            error: {
              code: "FORBIDDEN",
              message: "x",
              details: { remaining: "2" },
            },
          }),
        ),
    );
    render(<VerifyOrderForm orderId="SL-1" />);
    await submit();
    expect(await screen.findByRole("alert")).toHaveTextContent("Còn 2 lần thử");
    expect(
      screen.getByLabelText("Nhập SĐT đặt hàng để xem đầy đủ"),
    ).toHaveValue("0900000000");
  });

  it("còn nhiều lần thử thì không hiện số lần", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          json(403, {
            error: {
              code: "FORBIDDEN",
              message: "x",
              details: { remaining: "4" },
            },
          }),
        ),
    );
    render(<VerifyOrderForm orderId="SL-1" />);
    await submit();
    expect(await screen.findByRole("alert")).not.toHaveTextContent("lần thử");
  });

  it("429 thì khóa form và hiện giờ thử lại", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        json(429, {
          error: {
            code: "TOO_MANY_ATTEMPTS",
            message: "Bạn đã thử quá nhiều lần, vui lòng thử lại sau 15 phút",
            details: { retryAt: "2026-01-01T10:15:00.000Z" },
          },
        }),
      ),
    );
    render(<VerifyOrderForm orderId="SL-1" />);
    await submit();
    expect(await screen.findByRole("alert")).toHaveTextContent("thử lại lúc");
    expect(
      screen.getByLabelText("Nhập SĐT đặt hàng để xem đầy đủ"),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Xem đầy đủ" })).toBeDisabled();
  });
});
