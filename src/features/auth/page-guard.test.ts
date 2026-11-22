import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccessError } from "./access-errors";

const requireStaff = vi.fn();
const headerGet = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

vi.mock("./guards", () => ({ requireStaff: () => requireStaff() }));
vi.mock("next/headers", () => ({ headers: async () => ({ get: headerGet }) }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirect(url),
}));

import { requireStaffPage } from "./page-guard";

describe("requireStaffPage", () => {
  beforeEach(() => {
    requireStaff.mockReset();
    headerGet.mockReset();
    redirect.mockClear();
  });

  it("trả nhân viên khi có phiên", async () => {
    requireStaff.mockResolvedValue({ username: "lan", displayName: "Lan" });
    await expect(requireStaffPage()).resolves.toEqual({
      username: "lan",
      displayName: "Lan",
    });
  });

  it("cookie hỏng/hết hạn: chuyển về login kèm đường dẫn gốc", async () => {
    requireStaff.mockRejectedValue(new AccessError("UNAUTHENTICATED", "x"));
    headerGet.mockReturnValue("/staff/orders/SL-1?status=pending");
    await expect(requireStaffPage()).rejects.toThrow(
      `REDIRECT:/staff/login?next=${encodeURIComponent("/staff/orders/SL-1?status=pending")}`,
    );
  });

  it("thiếu header thì next=/staff", async () => {
    requireStaff.mockRejectedValue(new AccessError("UNAUTHENTICATED", "x"));
    headerGet.mockReturnValue(null);
    await expect(requireStaffPage()).rejects.toThrow(
      "REDIRECT:/staff/login?next=%2Fstaff",
    );
  });

  it("lỗi khác được ném lại", async () => {
    requireStaff.mockRejectedValue(new Error("boom"));
    await expect(requireStaffPage()).rejects.toThrow("boom");
    expect(redirect).not.toHaveBeenCalled();
  });
});
