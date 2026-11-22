import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "./proxy";

const call = (path: string, cookie?: string) =>
  proxy(
    new NextRequest(`http://localhost:3000${path}`, {
      headers: cookie ? { cookie } : undefined,
    }),
  );

describe("proxy", () => {
  it("chuyển về đăng nhập kèm next khi chưa có cookie", () => {
    const response = call("/staff/orders/SL-1?status=pending");
    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/staff/login");
    expect(location.searchParams.get("next")).toBe(
      "/staff/orders/SL-1?status=pending",
    );
  });

  it("chuyển /staff về đăng nhập", () => {
    const location = new URL(call("/staff").headers.get("location")!);
    expect(location.searchParams.get("next")).toBe("/staff");
  });

  it("cho qua /staff/login khi chưa có cookie", () => {
    const response = call("/staff/login");
    expect(response.headers.get("location")).toBeNull();
  });

  it("cho qua khi có cookie, kèm đường dẫn gốc", () => {
    const response = call("/staff?status=shipping", "sl_staff=abc");
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-request-x-staff-path")).toBe(
      "/staff?status=shipping",
    );
  });
});
