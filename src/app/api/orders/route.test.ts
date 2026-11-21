// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const orderService = vi.hoisted(() => ({
  placeOrder: vi.fn(),
  listOrders: vi.fn(),
  getOrder: vi.fn(),
}));
vi.mock("@/features/orders/server", () => ({ orderService }));

vi.mock("@/lib/env", () => ({
  getServerEnv: () => ({ TRUSTED_PROXY_HOPS: 1 }),
}));

import { PATCH } from "./[id]/route";
import { POST } from "./route";

beforeEach(() => vi.clearAllMocks());

describe("POST /api/orders (không chạm DB)", () => {
  it("400 - body không phải JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/orders", {
        method: "POST",
        body: "{oops",
      }),
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
    expect(orderService.placeOrder).not.toHaveBeenCalled();
  });
});

describe("POST /api/orders: IP", () => {
  it("truyền IP theo hops vào service", async () => {
    orderService.placeOrder.mockResolvedValue({ id: "x" });
    await POST(
      new Request("http://localhost/api/orders", {
        method: "POST",
        headers: { "x-forwarded-for": "9.9.9.9, 1.2.3.4" },
        body: "{}",
      }),
    );
    expect(orderService.placeOrder).toHaveBeenCalledWith({}, { ip: "1.2.3.4" });
  });
});

describe("PATCH /api/orders/:id", () => {
  it("luôn 401 UNAUTHORIZED, không gọi service", async () => {
    const response = await PATCH();
    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe("UNAUTHORIZED");
    expect(
      Object.values(orderService).every((fn) => fn.mock.calls.length === 0),
    ).toBe(true);
  });
});
