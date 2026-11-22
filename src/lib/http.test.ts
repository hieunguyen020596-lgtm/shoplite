// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { AccessError } from "@/features/auth/access-errors";
import { OrderError, type OrderErrorCode } from "@/features/orders/order-errors";
import { handleRouteError } from "./http";

describe("handleRouteError", () => {
  it.each<[OrderErrorCode, number]>([
    ["VALIDATION_ERROR", 400],
    ["PRODUCT_NOT_FOUND", 422],
    ["INSUFFICIENT_STOCK", 409],
    ["ORDER_NOT_FOUND", 404],
    ["INVALID_STATUS_TRANSITION", 409],
  ])("OrderError %s giữ HTTP %i", async (code, status) => {
    const response = handleRouteError(new OrderError(code, "msg", { a: "b" }));
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error: { code, message: "msg", details: { a: "b" } } });
  });

  it.each([
    ["UNAUTHENTICATED", 401],
    ["FORBIDDEN", 403],
    ["TOO_MANY_ATTEMPTS", 429],
  ] as const)("AccessError %s trả HTTP %i", async (code, status) => {
    const response = handleRouteError(new AccessError(code, "msg"));
    expect(response.status).toBe(status);
    expect((await response.json()).error).toMatchObject({ code, message: "msg" });
  });

  it("lỗi khác trả 500 INTERNAL_ERROR", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = handleRouteError(new Error("boom"));
    expect(response.status).toBe(500);
    expect((await response.json()).error.code).toBe("INTERNAL_ERROR");
  });
});
