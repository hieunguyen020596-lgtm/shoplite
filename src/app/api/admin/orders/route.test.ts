// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_TTL_SECONDS,
  createAdminSessionToken,
} from "@/features/orders/admin-auth";
import type { InventoryRepository } from "@/features/orders/inventory-repository";
import type { OrderRepository } from "@/features/orders/order-repository";
import { StorageLock } from "@/lib/storage-lock";

const testState = vi.hoisted(() => ({
  repository: undefined as unknown as OrderRepository,
  inventoryRepository: undefined as unknown as InventoryRepository,
  nowMs: new Date("2026-11-21T08:00:00.000Z").getTime(),
  idCounter: 0,
}));

vi.mock("@/features/orders/server", async () => {
  const { createOrderService } =
    await import("@/features/orders/order-service");
  const { createInMemoryOrderRepository } =
    await import("@/features/orders/order-repository");
  const { createInMemoryInventoryRepository } =
    await import("@/features/orders/inventory-repository");

  const sharedLock = new StorageLock();
  testState.repository = createInMemoryOrderRepository();
  testState.inventoryRepository = createInMemoryInventoryRepository({
    p006: 10,
    p010: 5,
  });

  const proxyRepository: OrderRepository = {
    findAll: () => testState.repository.findAll(),
    findById: (id) => testState.repository.findById(id),
    save: (order) => testState.repository.save(order),
  };

  const proxyInventory: InventoryRepository = {
    getStockMap: () => testState.inventoryRepository.getStockMap(),
    getStock: (productId) => testState.inventoryRepository.getStock(productId),
    deduct: (items) => testState.inventoryRepository.deduct(items),
    restock: (items) => testState.inventoryRepository.restock(items),
  };

  return {
    orderService: createOrderService({
      repository: proxyRepository,
      inventoryRepository: proxyInventory,
      storageLock: sharedLock,
      now: () => new Date(testState.nowMs),
      generateId: () =>
        `SL-20261121-${String(++testState.idCounter).padStart(6, "0")}`,
    }),
  };
});

import { orderService } from "@/features/orders/server";
import type { AdminOrderListResult } from "@/features/orders/order-service";
import { GET } from "./route";

const env = process.env as Record<string, string | undefined>;
const TEST_PASSCODE = "staff-secret-2026";

function validAdminCookie(): string {
  const token = createAdminSessionToken();
  return `${ADMIN_COOKIE_NAME}=${token}`;
}

function getAdminOrders(query = "", options: { cookie?: string } = {}) {
  const headers: Record<string, string> = {};
  if (options.cookie !== undefined) {
    headers.cookie = options.cookie;
  }
  const url = `http://localhost/api/admin/orders${query}`;
  return GET(new NextRequest(url, { method: "GET", headers }));
}

describe("GET /api/admin/orders", () => {
  let savedAdminPasscode: string | undefined;

  beforeEach(async () => {
    savedAdminPasscode = env.ADMIN_PASSCODE;
    env.ADMIN_PASSCODE = TEST_PASSCODE;

    const { createInMemoryOrderRepository } =
      await import("@/features/orders/order-repository");
    const { createInMemoryInventoryRepository } =
      await import("@/features/orders/inventory-repository");

    testState.repository = createInMemoryOrderRepository();
    testState.inventoryRepository = createInMemoryInventoryRepository({
      p006: 10,
      p010: 5,
    });
    testState.nowMs = new Date("2026-11-21T08:00:00.000Z").getTime();
    testState.idCounter = 0;
  });

  afterEach(() => {
    if (savedAdminPasscode === undefined) {
      delete env.ADMIN_PASSCODE;
    } else {
      env.ADMIN_PASSCODE = savedAdminPasscode;
    }
  });

  it("trả 503 ADMIN_NOT_CONFIGURED khi thiếu hoặc rỗng ADMIN_PASSCODE", async () => {
    const cookie = validAdminCookie();

    for (const value of [undefined, "", "   "]) {
      if (value === undefined) {
        delete env.ADMIN_PASSCODE;
      } else {
        env.ADMIN_PASSCODE = value;
      }

      const res = await getAdminOrders("?status=pending", { cookie });
      expect(res.status).toBe(503);
      expect(res.headers.get("cache-control")).toBe("no-store");
      const body = await res.json();
      expect(body.error.code).toBe("ADMIN_NOT_CONFIGURED");
    }
  });

  it("trả 401 UNAUTHORIZED khi thiếu cookie, sai chữ ký hoặc phiên đã hết hạn", async () => {
    const expiredToken = createAdminSessionToken(
      Date.now() - (ADMIN_SESSION_TTL_SECONDS + 1) * 1000,
    );
    const validToken = createAdminSessionToken();
    const tamperedToken = `${validToken.slice(0, -1)}${validToken.endsWith("0") ? "1" : "0"}`;

    for (const cookie of [
      undefined,
      "",
      `${ADMIN_COOKIE_NAME}=bad-token`,
      `${ADMIN_COOKIE_NAME}=${expiredToken}`,
      `${ADMIN_COOKIE_NAME}=${tamperedToken}`,
    ]) {
      const res = await getAdminOrders("?status=pending", { cookie });
      expect(res.status).toBe(401);
      expect(res.headers.get("cache-control")).toBe("no-store");
      const body = await res.json();
      expect(body.error.code).toBe("UNAUTHORIZED");
    }
  });

  it("trả 200 kèm { orders, counts, availableStockByProductId } theo query ?status=pending&q=minh và Cache-Control: no-store", async () => {
    const firstPending = await orderService.placeOrder({
      customer: {
        fullName: "Nguyễn Văn Minh",
        phone: "0912345678",
        address: "12 Nguyễn Huệ, Quận 1",
      },
      shippingMethod: "standard",
      paymentMethod: "cod",
      items: [{ productId: "p006", quantity: 2 }],
    });

    testState.nowMs += 60_000;
    const confirmedMinh = await orderService.placeOrder({
      customer: {
        fullName: "Đặng Quốc Minh",
        phone: "0987654321",
        address: "34 Lê Lợi, Quận 1",
      },
      shippingMethod: "standard",
      paymentMethod: "cod",
      items: [{ productId: "p010", quantity: 1 }],
    });
    await orderService.transitionOrderStatus(confirmedMinh.id, {
      status: "confirmed",
      actor: "staff",
    });

    testState.nowMs += 60_000;
    const secondPendingMinh = await orderService.placeOrder({
      customer: {
        fullName: "Trần Minh Tâm",
        phone: "0933444555",
        address: "56 Hai Bà Trưng, Quận 3",
      },
      shippingMethod: "standard",
      paymentMethod: "cod",
      items: [{ productId: "p006", quantity: 1 }],
    });

    testState.nowMs += 60_000;
    await orderService.placeOrder({
      customer: {
        fullName: "Lê Thị Lan",
        phone: "0977888999",
        address: "78 Võ Văn Tần, Quận 3",
      },
      shippingMethod: "standard",
      paymentMethod: "cod",
      items: [{ productId: "p010", quantity: 1 }],
    });

    const cookie = validAdminCookie();
    const res = await getAdminOrders("?status=pending&q=minh", { cookie });

    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");

    const data = (await res.json()) as AdminOrderListResult;
    // FIFO cho pending: firstPending (08:00) trước secondPendingMinh (08:02)
    expect(data.orders.map((o) => o.id)).toEqual([
      firstPending.id,
      secondPendingMinh.id,
    ]);
    // counts tính trên 3 đơn khớp "minh" trước khi lọc status=pending
    expect(data.counts).toEqual({
      all: 3,
      pending: 2,
      confirmed: 1,
      shipping: 0,
      delivered: 0,
      cancelled: 0,
    });
    // p006: 10 - 2 - 1 = 7; p010: 5 - 1 - 1 = 3
    expect(data.availableStockByProductId).toMatchObject({
      p006: 7,
      p010: 3,
    });
  });

  it("trả 200 kèm toàn bộ đơn mới nhất trước khi không truyền query hoặc ?status=bogus", async () => {
    const older = await orderService.placeOrder({
      customer: {
        fullName: "Nguyễn Văn A",
        phone: "0912345678",
        address: "12 Nguyễn Huệ, Quận 1",
      },
      shippingMethod: "standard",
      paymentMethod: "cod",
      items: [{ productId: "p006", quantity: 1 }],
    });

    testState.nowMs += 60_000;
    const newer = await orderService.placeOrder({
      customer: {
        fullName: "Trần Thị B",
        phone: "0987654321",
        address: "34 Lê Lợi, Quận 1",
      },
      shippingMethod: "standard",
      paymentMethod: "cod",
      items: [{ productId: "p010", quantity: 1 }],
    });
    await orderService.transitionOrderStatus(newer.id, {
      status: "confirmed",
      actor: "staff",
    });

    const cookie = validAdminCookie();

    for (const query of ["", "?status=bogus"]) {
      const res = await getAdminOrders(query, { cookie });
      expect(res.status).toBe(200);
      expect(res.headers.get("cache-control")).toBe("no-store");

      const data = (await res.json()) as AdminOrderListResult;
      expect(data.orders.map((o) => o.id)).toEqual([newer.id, older.id]);
      expect(data.counts).toEqual({
        all: 2,
        pending: 1,
        confirmed: 1,
        shipping: 0,
        delivered: 0,
        cancelled: 0,
      });
    }
  });

  it("trả 500 INTERNAL_ERROR kèm Cache-Control: no-store khi repository hoặc inventoryRepository ném lỗi bất ngờ", async () => {
    const cookie = validAdminCookie();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      testState.repository = {
        ...testState.repository,
        findAll: async () => {
          throw new Error("EIO: orders.json corrupted");
        },
      };

      const res = await getAdminOrders("", { cookie });
      expect(res.status).toBe(500);
      expect(res.headers.get("cache-control")).toBe("no-store");
      const body = await res.json();
      expect(body.error.code).toBe("INTERNAL_ERROR");
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
