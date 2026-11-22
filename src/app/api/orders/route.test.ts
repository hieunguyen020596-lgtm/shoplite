// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccessError } from "@/features/auth/access-errors";
import { GET, POST } from "./route";

// Thay orderService (ghi file) bằng bản dùng repository trong bộ nhớ.
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

// Mặc định có phiên nhân viên; test 401 đổi sang ném UNAUTHENTICATED.
const requireStaff = vi.hoisted(() => vi.fn());
const rememberOrder = vi.hoisted(() => vi.fn());
vi.mock("@/features/auth/guards", () => ({ requireStaff, rememberOrder }));
beforeEach(() => {
  requireStaff.mockResolvedValue({ username: "lan", displayName: "Chị Lan" });
  rememberOrder.mockReset();
});

const postOrder = (body: unknown) =>
  POST(
    new Request("http://localhost/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

const validBody = {
  customer: {
    fullName: "Phạm Minh D",
    phone: "0356789012",
    address: "99 Hai Bà Trưng, Huế",
  },
  shippingMethod: "express",
  paymentMethod: "bank_transfer",
  items: [{ productId: "p006", quantity: 1 }],
};

describe("POST /api/orders", () => {
  it("201 - tạo đơn hàng thành công", async () => {
    const response = await postOrder(validBody);
    expect(response.status).toBe(201);
    const order = await response.json();
    expect(order).toMatchObject({
      status: "pending",
      subtotal: 450_000,
      shippingFee: 60_000,
    });
  });

  it("201 - trả view verified qua toCustomerOrderView và ghi nhớ đơn vào cookie", async () => {
    const order = await (await postOrder(validBody)).json();
    expect(order.verified).toBe(true);
    expect(order.customer).toMatchObject({
      fullName: "Phạm Minh D",
      phone: "0356789012",
    });
    expect(order).not.toHaveProperty("maskedPhone");
    expect(rememberOrder).toHaveBeenCalledWith(expect.anything(), order.id);
  });

  it("400 - body không phải JSON", async () => {
    const response = await postOrder("{oops");
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("400 - dữ liệu không hợp lệ kèm details", async () => {
    const response = await postOrder({
      ...validBody,
      customer: { ...validBody.customer, phone: "1" },
    });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.details).toHaveProperty(["customer.phone"]);
  });

  it("409 - vượt quá tồn kho", async () => {
    const response = await postOrder({
      ...validBody,
      items: [{ productId: "p004", quantity: 1 }],
    });
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("INSUFFICIENT_STOCK");
  });
});

const getOrders = (query = "") =>
  GET(new Request(`http://localhost/api/orders${query}`));

describe("GET /api/orders", () => {
  it("401 - không có phiên nhân viên, không trả đơn nào", async () => {
    await postOrder(validBody);
    requireStaff.mockImplementation(() => {
      throw new AccessError("UNAUTHENTICATED", "Bạn cần đăng nhập");
    });
    const response = await getOrders();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe("UNAUTHENTICATED");
    expect(body).not.toHaveProperty("orders");
  });

  it("POST vẫn tạo đơn (201) khi không có phiên nhân viên", async () => {
    requireStaff.mockImplementation(() => {
      throw new AccessError("UNAUTHENTICATED", "Bạn cần đăng nhập");
    });
    expect((await postOrder(validBody)).status).toBe(201);
  });

  it("200 - nhân viên xem được danh sách đơn đầy đủ", async () => {
    await postOrder(validBody);
    const response = await getOrders();
    const { orders } = await response.json();
    expect(response.status).toBe(200);
    expect(orders.length).toBeGreaterThan(0);
    expect(orders[0].customer.phone).toBe("0356789012");
  });

  it("200 - lọc theo status", async () => {
    await postOrder(validBody);
    const { orders } = await (await getOrders("?status=pending")).json();
    expect(
      orders.every((o: { status: string }) => o.status === "pending"),
    ).toBe(true);
    const none = await (await getOrders("?status=shipping")).json();
    expect(none.orders).toEqual([]);
  });

  it("400 - status ngoài tập hợp lệ", async () => {
    const response = await getOrders("?status=bogus");
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
  });
});
