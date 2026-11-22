// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccessError } from "@/features/auth/access-errors";
import { GET } from "./route";

const requireStaff = vi.hoisted(() => vi.fn());
vi.mock("@/features/auth/guards", () => ({ requireStaff }));

vi.mock("@/features/orders/server", async () => {
  const { createOrderService } =
    await import("@/features/orders/order-service");
  const { createInMemoryOrderRepository } =
    await import("@/features/orders/order-repository");
  const base = {
    status: "pending",
    updatedAt: "",
    customer: { fullName: "A", phone: "0901234567", address: "x" },
    shippingMethod: "standard",
    paymentMethod: "cod",
    items: [],
    subtotal: 0,
    shippingFee: 0,
    total: 0,
  };
  const seed = [
    {
      ...base,
      id: "SL-20261021-AAAAAA",
      createdAt: "2026-10-21T01:00:00.000Z",
    },
    {
      ...base,
      id: "SL-20261021-4F9A2C",
      createdAt: "2026-10-21T02:00:00.000Z",
    },
    {
      ...base,
      id: "SL-20261021-CCCCCC",
      createdAt: "2026-10-21T03:00:00.000Z",
      status: "delivered",
    },
  ];
  return {
    orderService: createOrderService({
      repository: createInMemoryOrderRepository(seed as never),
    }),
  };
});

const get = (query = "") =>
  GET(new Request(`http://localhost/api/staff/orders${query}`));

describe("GET /api/staff/orders", () => {
  beforeEach(() => {
  requireStaff.mockResolvedValue({ username: "lan", displayName: "Chị Lan" });
});

  it("401 - không có phiên nhân viên", async () => {
    requireStaff.mockImplementation(() => {
      throw new AccessError("UNAUTHENTICATED", "Bạn cần đăng nhập");
    });
    const response = await get("?status=pending");
    expect(response.status).toBe(401);
    expect(await response.json()).not.toHaveProperty("orders");
  });

  it("status=pending xếp cũ nhất trước", async () => {
    const { orders } = await (await get("?status=pending")).json();
    expect(orders.map((o: { id: string }) => o.id)).toEqual([
      "SL-20261021-AAAAAA",
      "SL-20261021-4F9A2C",
    ]);
  });

  it("không lọc thì mới nhất trước", async () => {
    const { orders } = await (await get()).json();
    expect(orders[0].id).toBe("SL-20261021-CCCCCC");
  });

  it("status=finished gộp đã giao và đã hủy", async () => {
    const { orders } = await (await get("?status=finished")).json();
    expect(orders).toHaveLength(1);
  });

  it("q khớp 6 ký tự cuối, không phân biệt hoa thường", async () => {
    const { orders } = await (await get("?q=4f9a2c%20")).json();
    expect(orders.map((o: { id: string }) => o.id)).toEqual([
      "SL-20261021-4F9A2C",
    ]);
  });

  it("400 - status không hợp lệ", async () => {
    const response = await get("?status=nope");
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
  });
});
