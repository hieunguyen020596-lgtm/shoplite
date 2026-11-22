import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LookupOrderForm } from "./lookup-order-form";

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Mã đơn"), " sl-20261121-4f9a2c ");
  await user.type(
    screen.getByLabelText("Số điện thoại đặt hàng"),
    "0912345678",
  );
  await user.click(screen.getByRole("button", { name: "Tra cứu" }));
}

describe("<LookupOrderForm />", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    push.mockReset();
    refresh.mockReset();
  });

  it("chuẩn hóa Mã đơn, gọi endpoint verify rồi chuyển tới đơn", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { verified: true }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<LookupOrderForm />);
    await fillAndSubmit(user);

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/orders/SL-20261121-4F9A2C"),
    );
    expect(fetchMock.mock.calls[0][0]).toBe(
      "/api/orders/SL-20261121-4F9A2C/verify",
    );
  });

  it("403 hiện cùng một câu không tìm thấy", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(403, { error: { code: "FORBIDDEN", message: "x" } }),
        ),
    );
    const user = userEvent.setup();
    render(<LookupOrderForm />);
    await fillAndSubmit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Không tìm thấy đơn với mã và số điện thoại này.",
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("429 khóa form và báo thời điểm thử lại", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(429, {
          error: {
            code: "TOO_MANY_ATTEMPTS",
            message: "Bạn đã thử quá nhiều lần, vui lòng thử lại sau 15 phút",
            details: { retryAt: new Date(Date.now() + 900000).toISOString() },
          },
        }),
      ),
    );
    const user = userEvent.setup();
    render(<LookupOrderForm />);
    await fillAndSubmit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent("thử lại lúc");
    expect(screen.getByRole("button", { name: "Tra cứu" })).toBeDisabled();
  });
});
