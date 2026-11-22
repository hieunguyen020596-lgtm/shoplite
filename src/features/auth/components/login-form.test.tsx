import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "./login-form";

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Tên đăng nhập"), "lan");
  await user.type(screen.getByLabelText("Mật khẩu"), "sai-mat-khau");
  await user.click(screen.getByRole("button", { name: "Đăng nhập" }));
}

describe("<LoginForm />", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    push.mockReset();
    refresh.mockReset();
  });

  it("ô mật khẩu có autoComplete current-password", () => {
    render(<LoginForm next="/staff" />);
    expect(screen.getByLabelText("Mật khẩu")).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
  });

  it("đăng nhập đúng thì chuyển tới next", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(200, { username: "lan", displayName: "Lan" }),
        ),
    );
    render(<LoginForm next="/staff/orders/SL-1" />);
    await fillAndSubmit(userEvent.setup());

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/staff/orders/SL-1"),
    );
  });

  it("sai mật khẩu: báo lỗi, giữ tên đăng nhập, xóa mật khẩu, không chuyển trang", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(401, {
          error: {
            code: "UNAUTHENTICATED",
            message: "Tên đăng nhập hoặc mật khẩu không đúng",
          },
        }),
      ),
    );
    render(<LoginForm next="/staff" />);
    await fillAndSubmit(userEvent.setup());

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Tên đăng nhập hoặc mật khẩu không đúng");
    expect(alert).toHaveClass("bg-rose-50", "text-rose-700");
    expect(screen.getByLabelText("Tên đăng nhập")).toHaveValue("lan");
    expect(screen.getByLabelText("Mật khẩu")).toHaveValue("");
    expect(push).not.toHaveBeenCalled();
  });

  it("khóa nút và hiện 'Đang đăng nhập…' trong lúc chờ", async () => {
    let resolve!: (value: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(new Promise<Response>((r) => (resolve = r))),
    );
    render(<LoginForm next="/staff" />);
    await fillAndSubmit(userEvent.setup());

    expect(
      screen.getByRole("button", { name: "Đang đăng nhập…" }),
    ).toBeDisabled();
    resolve(jsonResponse(200, {}));
    await waitFor(() => expect(push).toHaveBeenCalled());
  });
});
