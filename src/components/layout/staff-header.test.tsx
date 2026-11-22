import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StaffHeader } from "./staff-header";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

describe("<StaffHeader />", () => {
  it("có logo, chữ Nhân viên, tên hiển thị, nút Đăng xuất; không có giỏ hàng", () => {
    render(<StaffHeader displayName="Lan Nguyễn" />);

    expect(screen.getByText("Nhân viên")).toBeInTheDocument();
    expect(screen.getByText("Lan Nguyễn")).toHaveClass("hidden", "sm:inline");
    expect(
      screen.getByRole("button", { name: "Đăng xuất" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /giỏ hàng/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("banner")).toHaveClass("border-b");
  });
});
