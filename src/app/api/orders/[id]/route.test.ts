// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PATCH } from "./route";

const { orderService } = vi.hoisted(() => ({ orderService: {} as never }));
void orderService;

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

const isOrderVerified = vi.hoisted(() => vi.fn());
vi.mock("@/features/auth/guards", () => ({ isOrderVerified }));

const validBody = {
  customer: {
    fullName: "Phạm Minh D",
    phone: "0356789012",
    email: "d@example.com",
    address: "99 Hai Bà Trưng, Huế",
    note: "Gọi trước khi giao",
  },
  shippingMethod: "express",
  paymentMethod: "bank_transfer",
  items: [{ productId: "p006", quantity: 1 }],
};

async function createOrderId() {
  const { orderService } = await import("@/features/orders/server");
  return (await orderService.placeOrder(validBody)).id;
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) }) as never;

beforeEach(() => isOrderVerified.mockResolvedValue(false));

describe("GET /api/orders/:id", () => {
  it("chưa xác minh: JSON không chứa dữ liệu cá nhân, chỉ có SĐT che", async () => {
    const id = await createOrderId();
    const response = await GET(
      new Request(`http://localhost/api/orders/${id}`),
      ctx(id),
    );
    const text = await response.text();
    expect(response.status).toBe(200);
    for (const value of Object.values(validBody.customer))
      expect(text).not.toContain(value);
    const body = JSON.parse(text);
    expect(body).toMatchObject({
      id,
      status: "pending",
      total: 510_000,
      maskedPhone: "03****012",
    });
    expect(body.items).toHaveLength(1);
    expect(body).not.toHaveProperty("customer");
  });

  it("đã xác minh: có đầy đủ thông tin", async () => {
    isOrderVerified.mockResolvedValue(true);
    const id = await createOrderId();
    const body = await (
      await GET(new Request("http://localhost/x"), ctx(id))
    ).json();
    expect(body.customer).toMatchObject({
      fullName: "Phạm Minh D",
      phone: "0356789012",
    });
  });

  it("404 - đơn không tồn tại", async () => {
    const response = await GET(
      new Request("http://localhost/x"),
      ctx("SL-00000000-ZZZZZZ"),
    );
    expect(response.status).toBe(404);
  });
});

const patch = (id: string, body: unknown) =>
  PATCH(
    new Request("http://localhost/x", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    ctx(id),
  );

describe("PATCH /api/orders/:id", () => {
  it("chưa xác minh: 403 FORBIDDEN và đơn không đổi", async () => {
    const id = await createOrderId();
    const response = await patch(id, { status: "cancelled" });
    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("FORBIDDEN");
    const { orderService } = await import("@/features/orders/server");
    expect((await orderService.getOrder(id)).status).toBe("pending");
  });

  it("đã xác minh + pending: hủy được, phản hồi qua hàm chiếu cho khách", async () => {
    isOrderVerified.mockResolvedValue(true);
    const id = await createOrderId();
    const response = await patch(id, { status: "cancelled" });
    const text = await response.text();
    expect(response.status).toBe(200);
    expect(JSON.parse(text)).toMatchObject({ status: "cancelled" });
  });

  it("đã xác minh nhưng đơn không còn pending: 409 INVALID_STATUS_TRANSITION", async () => {
    isOrderVerified.mockResolvedValue(true);
    const id = await createOrderId();
    const { orderService } = await import("@/features/orders/server");
    await orderService.cancelOrder(id);
    const response = await patch(id, { status: "cancelled" });
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe(
      "INVALID_STATUS_TRANSITION",
    );
  });

  it("body sai: 400 VALIDATION_ERROR", async () => {
    isOrderVerified.mockResolvedValue(true);
    const id = await createOrderId();
    const response = await patch(id, { status: "confirmed" });
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
  });
});
