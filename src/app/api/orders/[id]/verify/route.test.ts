// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccessError } from "@/features/auth/access-errors";
import { POST } from "./route";

vi.mock("@/features/orders/server", async () => {
  const { createOrderService } =
    await import("@/features/orders/order-service");
  const { createInMemoryOrderRepository } =
    await import("@/features/orders/order-repository");
  return {
    orderService: createOrderService({
      repository: createInMemoryOrderRepository(),
    }),
  };
});

const guards = vi.hoisted(() => ({
  isOrderVerified: vi.fn(),
  rememberOrder: vi.fn(),
  requireStaff: vi.fn(),
}));
vi.mock("@/features/auth/guards", () => guards);

vi.mock("@/features/auth/server", async () => {
  const { createAttemptLimiter } =
    await import("@/features/auth/attempt-limiter");
  return { attemptLimiter: createAttemptLimiter() };
});

const validBody = {
  customer: {
    fullName: "Phạm Minh D",
    phone: "0356789012",
    email: "d@example.com",
    address: "99 Hai Bà Trưng, Huế",
  },
  shippingMethod: "express",
  paymentMethod: "cod",
  items: [{ productId: "p006", quantity: 1 }],
};

const ctx = (id: string) => ({ params: Promise.resolve({ id }) }) as never;
const post = (id: string, body: unknown, ip = "1.1.1.1") =>
  POST(
    new Request(`http://localhost/api/orders/${id}/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": `${ip}, 10.0.0.1`,
      },
      body: JSON.stringify(body),
    }),
    ctx(id),
  );

async function createOrderId() {
  const { orderService } = await import("@/features/orders/server");
  return (await orderService.placeOrder(validBody)).id;
}

beforeEach(() => {
  guards.isOrderVerified.mockResolvedValue(false);
  guards.rememberOrder.mockReset();
  guards.requireStaff.mockRejectedValue(
    new AccessError("UNAUTHENTICATED", "x"),
  );
});

describe("POST /api/orders/:id/verify", () => {
  it("SĐT đúng (dạng +84) trả 200 và ghi nhớ đơn", async () => {
    const id = await createOrderId();
    const response = await post(id, { phone: "+84356789012" }, "2.2.2.2");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ verified: true });
    expect(guards.rememberOrder).toHaveBeenCalledWith(expect.anything(), id);
  });

  it("SĐT sai trả 403 kèm số lần còn lại, không ghi nhớ đơn", async () => {
    const id = await createOrderId();
    const response = await post(id, { phone: "0900000000" }, "3.3.3.3");
    expect(response.status).toBe(403);
    expect((await response.json()).error).toMatchObject({
      code: "FORBIDDEN",
      details: { remaining: "4" },
    });
    expect(guards.rememberOrder).not.toHaveBeenCalled();
  });

  it("sai 5 lần thì lần 6 trả 429 TOO_MANY_ATTEMPTS dù SĐT đúng", async () => {
    const id = await createOrderId();
    for (let i = 0; i < 5; i++)
      await post(id, { phone: "0900000000" }, "4.4.4.4");
    const response = await post(id, { phone: "0356789012" }, "5.5.5.5");
    expect(response.status).toBe(429);
    expect((await response.json()).error).toMatchObject({
      code: "TOO_MANY_ATTEMPTS",
      message: "Bạn đã thử quá nhiều lần, vui lòng thử lại sau 15 phút",
    });
    expect(response.headers.get("Retry-After")).toBeTruthy();
  });

  it("Mã đơn không tồn tại trả cùng phản hồi như sai SĐT", async () => {
    const id = await createOrderId();
    const wrong = await post(id, { phone: "0900000000" }, "6.6.6.6");
    const missing = await post(
      "SL-00000000-ZZZZZZ",
      { phone: "0900000000" },
      "7.7.7.7",
    );
    expect(missing.status).toBe(wrong.status);
    expect(await missing.json()).toEqual(await wrong.json());
  });

  it("thiết bị đã xác minh không bị giới hạn", async () => {
    const id = await createOrderId();
    guards.isOrderVerified.mockResolvedValue(true);
    for (let i = 0; i < 8; i++)
      await post(id, { phone: "0900000000" }, "8.8.8.8");
    const response = await post(id, { phone: "0356789012" }, "8.8.8.8");
    expect(response.status).toBe(200);
  });

  it("body thiếu SĐT trả 400", async () => {
    const response = await post("SL-1", {});
    expect(response.status).toBe(400);
  });
});
