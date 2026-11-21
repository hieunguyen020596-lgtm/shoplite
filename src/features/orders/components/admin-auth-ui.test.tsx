import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminLoginPage from "@/app/admin/login/page";
import { AdminHeaderBar } from "./admin-header-bar";
import { AdminLoginCard } from "./admin-login-card";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

const env = process.env as Record<string, string | undefined>;

describe("AdminLoginPage & AdminLoginCard & AdminHeaderBar", () => {
  let savedAdminPasscode: string | undefined;

  beforeEach(() => {
    savedAdminPasscode = env.ADMIN_PASSCODE;
    push.mockReset();
    refresh.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (savedAdminPasscode === undefined) {
      delete env.ADMIN_PASSCODE;
    } else {
      env.ADMIN_PASSCODE = savedAdminPasscode;
    }
  });

  describe("<AdminLoginPage /> (Server Component)", () => {
    it("hiển thị trạng thái Fail-Closed với role=alert và khóa form khi chưa cấu hình ADMIN_PASSCODE", async () => {
      delete env.ADMIN_PASSCODE;

      const ui = await AdminLoginPage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({}),
      });
      render(ui);

      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent(
        /Hệ thống chưa cấu hình mật khẩu quản trị \(ADMIN_PASSCODE\)/,
      );
      expect(screen.getByLabelText("Mật khẩu quản trị")).toBeDisabled();
      expect(
        screen.getByRole("button", { name: "Đăng nhập vận hành" }),
      ).toBeDisabled();
    });

    it("hiển thị thông báo hết phiên role=status khi ADMIN_PASSCODE đã cấu hình và có ?expired=1", async () => {
      env.ADMIN_PASSCODE = "secret-passcode";

      const ui = await AdminLoginPage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({ expired: "1" }),
      });
      render(ui);

      const statusBanner = screen.getByRole("status");
      expect(statusBanner).toHaveTextContent(
        "Phiên làm việc 8 giờ đã hết hạn. Vui lòng đăng nhập lại để tiếp tục xử lý đơn.",
      );
      expect(screen.getByLabelText("Mật khẩu quản trị")).toBeEnabled();
      expect(
        screen.getByRole("button", { name: "Đăng nhập vận hành" }),
      ).toBeEnabled();
    });

    it("hiển thị form đăng nhập sạch (không alert, không status) khi đã cấu hình ADMIN_PASSCODE và không có ?expired=1", async () => {
      env.ADMIN_PASSCODE = "secret-passcode";

      const ui = await AdminLoginPage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({}),
      });
      render(ui);

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      expect(screen.getByLabelText("Mật khẩu quản trị")).toBeEnabled();
      expect(
        screen.getByRole("button", { name: "Đăng nhập vận hành" }),
      ).toBeEnabled();
    });

    it("hỗ trợ searchParams.expired dạng mảng và ưu tiên trạng thái Fail-Closed khi thiếu ADMIN_PASSCODE dù có ?expired=1", async () => {
      env.ADMIN_PASSCODE = "secret-passcode";

      const arrayUi = await AdminLoginPage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({ expired: ["1", "0"] }),
      });
      const { unmount } = render(arrayUi);
      expect(screen.getByRole("status")).toHaveTextContent(
        "Phiên làm việc 8 giờ đã hết hạn. Vui lòng đăng nhập lại để tiếp tục xử lý đơn.",
      );
      unmount();

      delete env.ADMIN_PASSCODE;
      const unconfiguredExpiredUi = await AdminLoginPage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({ expired: "1" }),
      });
      render(unconfiguredExpiredUi);

      expect(screen.getByRole("alert")).toHaveTextContent(
        /Hệ thống chưa cấu hình mật khẩu quản trị \(ADMIN_PASSCODE\)/,
      );
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      expect(screen.getByLabelText("Mật khẩu quản trị")).toBeDisabled();
    });
  });

  describe("<AdminLoginCard />", () => {
    it("chế độ Fail-Closed (configured=false): hiện role=alert nêu rõ ADMIN_PASSCODE và vô hiệu hóa input lẫn nút gửi", () => {
      render(<AdminLoginCard configured={false} />);

      expect(
        screen.getByRole("heading", { name: "Đăng nhập quản trị" }),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Dành cho Nhân viên vận hành cửa hàng ShopLite."),
      ).toBeInTheDocument();

      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent(
        "Hệ thống chưa cấu hình mật khẩu quản trị (ADMIN_PASSCODE). Vui lòng thiết lập biến môi trường trên máy chủ trước khi truy cập.",
      );

      expect(screen.getByLabelText("Mật khẩu quản trị")).toBeDisabled();
      expect(
        screen.getByRole("button", { name: "Đăng nhập vận hành" }),
      ).toBeDisabled();
    });

    it("từ chối mật khẩu rỗng phía client với role=alert, giữ focus tại ô nhập và không gọi API", async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      const user = userEvent.setup();

      render(<AdminLoginCard configured={true} />);

      const input = screen.getByLabelText("Mật khẩu quản trị");
      const button = screen.getByRole("button", { name: "Đăng nhập vận hành" });

      await user.click(button);

      expect(screen.getByRole("alert")).toHaveTextContent(
        "Vui lòng nhập mật khẩu quản trị",
      );
      expect(input).toHaveFocus();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("khi sai mật khẩu (401): hiện role=alert từ server, đặt aria-invalid, giữ focus tại ô nhập và tự xóa lỗi khi gõ lại", async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: "UNAUTHORIZED",
              message: "Mật khẩu quản trị không đúng",
            },
          }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        ),
      );
      vi.stubGlobal("fetch", fetchMock);
      const user = userEvent.setup();

      render(<AdminLoginCard configured={true} />);

      const input = screen.getByLabelText("Mật khẩu quản trị");
      expect(input).toHaveAttribute("aria-invalid", "false");

      await user.type(input, "sai-mat-khau");
      await user.click(
        screen.getByRole("button", { name: "Đăng nhập vận hành" }),
      );

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Mật khẩu quản trị không đúng",
      );
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input).toHaveFocus();
      expect(push).not.toHaveBeenCalled();

      await user.type(input, "x");
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(input).toHaveAttribute("aria-invalid", "false");
    });

    it("khi server trả 500 không phải JSON hợp lệ: hiện thông báo lỗi hệ thống thay vì lỗi kết nối mạng", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            new Response("Internal Server Error", { status: 500 }),
          ),
      );
      const user = userEvent.setup();

      render(<AdminLoginCard configured={true} />);

      const input = screen.getByLabelText("Mật khẩu quản trị");
      await user.type(input, "secret{Enter}");

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Có lỗi hệ thống xảy ra. Vui lòng thử lại sau.",
      );
      expect(input).toHaveFocus();
      expect(push).not.toHaveBeenCalled();
    });

    it("khi server trả 503 ADMIN_NOT_CONFIGURED lúc đăng nhập: chuyển ngay sang trạng thái khóa Fail-Closed", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              error: {
                code: "ADMIN_NOT_CONFIGURED",
                message: "Hệ thống chưa cấu hình mật khẩu quản trị",
              },
            }),
            { status: 503, headers: { "Content-Type": "application/json" } },
          ),
        ),
      );
      const user = userEvent.setup();

      render(<AdminLoginCard configured={true} expired={true} />);

      const input = screen.getByLabelText("Mật khẩu quản trị");
      await user.type(input, "secret{Enter}");

      expect(await screen.findByRole("alert")).toHaveTextContent(
        /Hệ thống chưa cấu hình mật khẩu quản trị \(ADMIN_PASSCODE\)/,
      );
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      expect(input).toBeDisabled();
      expect(
        screen.getByRole("button", { name: "Đăng nhập vận hành" }),
      ).toBeDisabled();
    });

    it("hiển thị Đang đăng nhập…, khóa nút gửi và chặn gửi trùng khi đang chờ phản hồi", async () => {
      let resolveLogin!: (value: Response) => void;
      const fetchMock = vi.fn().mockImplementation(
        () =>
          new Promise<Response>((resolve) => {
            resolveLogin = resolve;
          }),
      );
      vi.stubGlobal("fetch", fetchMock);
      const user = userEvent.setup();

      render(<AdminLoginCard configured={true} />);

      const input = screen.getByLabelText("Mật khẩu quản trị");
      await user.type(input, "  staff-secret-2026  ");

      const submitBtn = screen.getByRole("button", {
        name: "Đăng nhập vận hành",
      });
      await user.click(submitBtn);

      const pendingBtn = screen.getByRole("button", {
        name: "Đang đăng nhập…",
      });
      expect(pendingBtn).toBeDisabled();
      expect(pendingBtn).toHaveAttribute("aria-busy", "true");
      expect(input).toHaveAttribute("readonly");

      // Thử submit form lần nữa khi đang pending -> không gọi fetch lần 2
      pendingBtn
        .closest("form")
        ?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: "staff-secret-2026" }),
      });

      resolveLogin(new Response(JSON.stringify({ ok: true }), { status: 200 }));

      await vi.waitFor(() => {
        expect(push).toHaveBeenCalledWith("/admin/orders");
        expect(refresh).toHaveBeenCalled();
      });
    });

    it("khi lỗi mạng (fetch reject): hiện role=alert thông báo kết nối và giữ focus tại ô nhập", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new Error("Network offline")),
      );
      const user = userEvent.setup();

      render(<AdminLoginCard configured={true} />);

      const input = screen.getByLabelText("Mật khẩu quản trị");
      await user.type(input, "secret{Enter}");

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.",
      );
      expect(input).toHaveFocus();
      expect(push).not.toHaveBeenCalled();
    });

    it("đăng nhập thành công bằng phím Enter hoặc bấm nút chuyển hướng sang /admin/orders", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ ok: true }), { status: 200 }),
        );
      vi.stubGlobal("fetch", fetchMock);
      const user = userEvent.setup();

      render(<AdminLoginCard configured={true} expired={true} />);

      expect(screen.getByRole("status")).toHaveTextContent(
        "Phiên làm việc 8 giờ đã hết hạn. Vui lòng đăng nhập lại để tiếp tục xử lý đơn.",
      );

      const input = screen.getByLabelText("Mật khẩu quản trị");
      await user.type(input, "staff-secret-2026{Enter}");

      expect(fetchMock).toHaveBeenCalledWith("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: "staff-secret-2026" }),
      });
      expect(push).toHaveBeenCalledWith("/admin/orders");
      expect(refresh).toHaveBeenCalled();
    });
  });

  describe("<AdminHeaderBar />", () => {
    it("hiển thị thương hiệu ShopLite, nhãn Vận hành đơn hàng và gọi POST /api/admin/auth/logout chuyển về /admin/login", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ ok: true }), { status: 200 }),
        );
      vi.stubGlobal("fetch", fetchMock);
      const user = userEvent.setup();

      render(<AdminHeaderBar />);

      expect(screen.getByText("ShopLite")).toBeInTheDocument();
      expect(screen.getByText("Vận hành đơn hàng")).toBeInTheDocument();
      expect(screen.getByText("Vận hành")).toBeInTheDocument();

      const logoutButton = screen.getByRole("button", { name: "Đăng xuất" });
      expect(logoutButton).toHaveClass("min-h-11");

      await user.click(logoutButton);

      expect(fetchMock).toHaveBeenCalledWith("/api/admin/auth/logout", {
        method: "POST",
      });
      expect(push).toHaveBeenCalledWith("/admin/login");
      expect(refresh).toHaveBeenCalled();
    });

    it("hiển thị trạng thái Đang đăng xuất… khi đang chờ phản hồi và hiện role=alert khi server trả lỗi HTTP", async () => {
      let resolveLogout!: (value: Response) => void;
      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation(
          () =>
            new Promise<Response>((resolve) => {
              resolveLogout = resolve;
            }),
        ),
      );
      const user = userEvent.setup();

      render(<AdminHeaderBar />);

      await user.click(screen.getByRole("button", { name: "Đăng xuất" }));

      const pendingBtn = screen.getByRole("button", {
        name: "Đang đăng xuất…",
      });
      expect(pendingBtn).toBeDisabled();

      resolveLogout(
        new Response(
          JSON.stringify({
            error: {
              code: "INTERNAL_ERROR",
              message: "Không thể xóa phiên lúc này",
            },
          }),
          { status: 500 },
        ),
      );

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Không thể xóa phiên lúc này",
      );
      expect(screen.getByRole("button", { name: "Đăng xuất" })).toBeEnabled();
      expect(push).not.toHaveBeenCalled();
    });

    it("hiển thị role=alert khi đăng xuất gặp lỗi mạng và không chuyển trang", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new Error("Network error")),
      );
      const user = userEvent.setup();

      render(<AdminHeaderBar />);

      await user.click(screen.getByRole("button", { name: "Đăng xuất" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.",
      );
      expect(push).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: "Đăng xuất" })).toBeEnabled();
    });
  });
});
