// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_TTL_SECONDS,
  createAdminSessionToken,
} from "@/features/orders/admin-auth";
import type { InventoryRepository } from "@/features/orders/inventory-repository";
import type { OrderRepository } from "@/features/orders/order-repository";
import type { Order } from "@/features/orders/types";

const testState = vi.hoisted(() => ({
  orderRepository: undefined as unknown as OrderRepository,
  inventoryRepository: undefined as unknown as InventoryRepository,
  nowMs: new Date("2026-11-21T08:00:00.000Z").getTime(),
}));

vi.mock("@/features/orders/server", async () => {
  const { StorageLock } = await import("@/lib/storage-lock");
  const { createOrderService } =
    await import("@/features/orders/order-service");
  const { createInMemoryOrderRepository } =
    await import("@/features/orders/order-repository");
  const { createInMemoryInventoryRepository } =
    await import("@/features/orders/inventory-repository");

  const lock = new StorageLock();
  testState.orderRepository = createInMemoryOrderRepository();
  testState.inventoryRepository = createInMemoryInventoryRepository();

  const proxyOrderRepository: OrderRepository = {
    findAll: () => testState.orderRepository.findAll(),
    findById: (id) => testState.orderRepository.findById(id),
    save: (order) => testState.orderRepository.save(order),
  };

  const proxyInventoryRepository: InventoryRepository = {
    getStockMap: () => testState.inventoryRepository.getStockMap(),
    getStock: (productId) => testState.inventoryRepository.getStock(productId),
    deduct: (items) => testState.inventoryRepository.deduct(items),
    restock: (items) => testState.inventoryRepository.restock(items),
  };

  return {
    storageLock: lock,
    orderRepository: proxyOrderRepository,
    inventoryRepository: proxyInventoryRepository,
    orderService: createOrderService({
      repository: proxyOrderRepository,
      inventoryRepository: proxyInventoryRepository,
      storageLock: lock,
      now: () => new Date(testState.nowMs),
    }),
  };
});

import { PATCH as patchAdminOrderStatus } from "@/app/api/admin/orders/[id]/status/route";
import { POST as createOrderPost } from "@/app/api/orders/route";
import { POST } from "./route";

const env = process.env as Record<string, string | undefined>;
const TEST_PASSCODE = "staff-secret-2026";

function validAdminCookie(): string {
  return `${ADMIN_COOKIE_NAME}=${createAdminSessionToken()}`;
}

async function createShippingCancelledOrder(quantity = 2): Promise<Order> {
  const cookie = validAdminCookie();
  const createRes = await createOrderPost(
    new Request("http://localhost/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer: {
          fullName: "Nguyễn Văn Hoàn",
          phone: "0912345678",
          address: "12 Nguyễn Huệ, Quận 1, TP.HCM",
        },
        shippingMethod: "standard",
        paymentMethod: "cod",
        items: [{ productId: "p011", quantity }],
      }),
    }),
  );
  expect(createRes.status).toBe(201);
  const created = (await createRes.json()) as Order;

  for (const payload of [
    { status: "confirmed" },
    { status: "shipping" },
    { status: "cancelled", note: "Khách từ chối nhận hàng" },
  ]) {
    const res = await patchAdminOrderStatus(
      new Request(`http://localhost/api/admin/orders/${created.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", cookie },
        body: JSON.stringify(payload),
      }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(res.status).toBe(200);
  }

  return (await testState.orderRepository.findById(created.id)) as Order;
}

function postRestock(
  id: string,
  options: {
    cookie?: string;
    body?: unknown;
    raw?: boolean;
    omitBody?: boolean;
  } = {},
) {
  const headers: Record<string, string> = {};
  if (options.cookie !== undefined) {
    headers.cookie = options.cookie;
  }
  if (!options.omitBody && !options.raw) {
    headers["Content-Type"] = "application/json";
  }

  const init: RequestInit = { method: "POST", headers };
  if (!options.omitBody) {
    init.body = options.raw
      ? String(options.body)
      : JSON.stringify(options.body);
  }

  return POST(
    new Request(`http://localhost/api/admin/orders/${id}/restock`, init),
    { params: Promise.resolve({ id }) },
  );
}

describe("POST /api/admin/orders/:id/restock", () => {
  let savedAdminPasscode: string | undefined;

  beforeEach(async () => {
    savedAdminPasscode = env.ADMIN_PASSCODE;
    env.ADMIN_PASSCODE = TEST_PASSCODE;

    const { createInMemoryOrderRepository } =
      await import("@/features/orders/order-repository");
    const { createInMemoryInventoryRepository } =
      await import("@/features/orders/inventory-repository");

    testState.orderRepository = createInMemoryOrderRepository();
    testState.inventoryRepository = createInMemoryInventoryRepository({
      p011: 3,
    });
    testState.nowMs = new Date("2026-11-21T08:00:00.000Z").getTime();
  });

  afterEach(() => {
    if (savedAdminPasscode === undefined) {
      delete env.ADMIN_PASSCODE;
    } else {
      env.ADMIN_PASSCODE = savedAdminPasscode;
    }
  });

  describe("Auth fail-closed (503 -> 401)", () => {
    it("503 ADMIN_NOT_CONFIGURED khi thiếu/rỗng ADMIN_PASSCODE trước đọc body & repo", async () => {
      const order = await createShippingCancelledOrder(2);
      const cookie = validAdminCookie();

      for (const envValue of [undefined, "", "   "]) {
        if (envValue === undefined) {
          delete env.ADMIN_PASSCODE;
        } else {
          env.ADMIN_PASSCODE = envValue;
        }

        const resBadJson = await postRestock(order.id, {
          body: "{not-json",
          raw: true,
        });
        expect(resBadJson.status).toBe(503);
        expect((await resBadJson.json()).error.code).toBe(
          "ADMIN_NOT_CONFIGURED",
        );

        const resWithCookie = await postRestock(order.id, {
          cookie,
          omitBody: true,
        });
        expect(resWithCookie.status).toBe(503);
        expect((await resWithCookie.json()).error.code).toBe(
          "ADMIN_NOT_CONFIGURED",
        );
      }

      expect(await testState.inventoryRepository.getStock("p011")).toBe(1);
    });

    it("401 UNAUTHORIZED khi thiếu, sai chữ ký hoặc hết hạn cookie trước đọc body & repo", async () => {
      const order = await createShippingCancelledOrder(2);
      const expiredToken = createAdminSessionToken(
        Date.now() - (ADMIN_SESSION_TTL_SECONDS + 1) * 1000,
      );
      const validToken = createAdminSessionToken();
      const tamperedToken = `${validToken.slice(0, -1)}${validToken.endsWith("0") ? "1" : "0"}`;

      for (const cookie of [
        undefined,
        "",
        `${ADMIN_COOKIE_NAME}=invalid`,
        `${ADMIN_COOKIE_NAME}=${expiredToken}`,
        `${ADMIN_COOKIE_NAME}=${tamperedToken}`,
      ]) {
        const res = await postRestock(order.id, {
          cookie,
          body: "{not-json",
          raw: true,
        });
        expect(res.status).toBe(401);
        expect((await res.json()).error.code).toBe("UNAUTHORIZED");
      }

      expect(await testState.inventoryRepository.getStock("p011")).toBe(1);
    });
  });

  describe("Validation (400 VALIDATION_ERROR)", () => {
    it("400 khi body JSON hỏng, không phải object, hoặc note không hợp lệ / > 200 ký tự", async () => {
      const order = await createShippingCancelledOrder(2);
      const cookie = validAdminCookie();

      const badJsonRes = await postRestock(order.id, {
        cookie,
        body: "{oops",
        raw: true,
      });
      expect(badJsonRes.status).toBe(400);
      expect((await badJsonRes.json()).error.code).toBe("VALIDATION_ERROR");

      for (const nonObject of [[], true, "note", null]) {
        const res = await postRestock(order.id, { cookie, body: nonObject });
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error.code).toBe("VALIDATION_ERROR");
        expect(json.error.details._form).toBe(
          "Dữ liệu hoàn kho phải là một đối tượng JSON",
        );
      }

      for (const invalidBody of [
        { note: 123 },
        { note: null },
        { note: "a".repeat(201) },
      ]) {
        const res = await postRestock(order.id, { cookie, body: invalidBody });
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error.code).toBe("VALIDATION_ERROR");
        expect(json.error.details).toHaveProperty("note");
      }

      expect(await testState.inventoryRepository.getStock("p011")).toBe(1);
    });
  });

  describe("Hoàn kho hợp lệ & Idempotency", () => {
    it("200 với body rỗng: cộng trả kho 1 lần, inventoryRestocked=true, nối event restock, Cache-Control: no-store", async () => {
      const order = await createShippingCancelledOrder(2);
      expect(order.inventoryRestocked).toBe(false);
      expect(await testState.inventoryRepository.getStock("p011")).toBe(1);

      testState.nowMs += 60_000;
      const cookie = validAdminCookie();
      const res = await postRestock(order.id, { cookie, omitBody: true });

      expect(res.status).toBe(200);
      expect(res.headers.get("cache-control")).toBe("no-store");
      const json = (await res.json()) as { order: Order };
      expect(json.order.inventoryRestocked).toBe(true);
      expect(json.order.statusHistory?.at(-1)).toEqual({
        status: "cancelled",
        at: new Date(testState.nowMs).toISOString(),
        actor: "staff",
        action: "restock",
      });
      expect(await testState.inventoryRepository.getStock("p011")).toBe(3);

      // Gọi lần 2 -> 409 INVALID_STATUS_TRANSITION, không cộng thêm kho
      const secondRes = await postRestock(order.id, { cookie, omitBody: true });
      expect(secondRes.status).toBe(409);
      expect((await secondRes.json()).error.code).toBe(
        "INVALID_STATUS_TRANSITION",
      );
      expect(await testState.inventoryRepository.getStock("p011")).toBe(3);
    });

    it("200 với { note }: trim ghi chú <= 200 ký tự và bỏ qua note toàn khoảng trắng", async () => {
      const cookie = validAdminCookie();
      const first = await createShippingCancelledOrder(1);
      expect(await testState.inventoryRepository.getStock("p011")).toBe(2);

      const resWithNote = await postRestock(first.id, {
        cookie,
        body: { note: "  Hàng hoàn nguyên vẹn  " },
      });
      expect(resWithNote.status).toBe(200);
      const firstJson = (await resWithNote.json()) as { order: Order };
      expect(firstJson.order.statusHistory?.at(-1)).toMatchObject({
        actor: "staff",
        action: "restock",
        note: "Hàng hoàn nguyên vẹn",
      });
      expect(await testState.inventoryRepository.getStock("p011")).toBe(3);

      const second = await createShippingCancelledOrder(1);
      const resBlankNote = await postRestock(second.id, {
        cookie,
        body: { note: "   " },
      });
      expect(resBlankNote.status).toBe(200);
      const secondJson = (await resBlankNote.json()) as { order: Order };
      expect(secondJson.order.statusHistory?.at(-1)).not.toHaveProperty("note");
      expect(await testState.inventoryRepository.getStock("p011")).toBe(3);
    });

    it("404 ORDER_NOT_FOUND khi :id không tồn tại; 409 với đơn chưa hủy hoặc đơn cũ inventoryRestocked=undefined", async () => {
      const cookie = validAdminCookie();

      const missingRes = await postRestock("SL-KHONG-CO", {
        cookie,
        omitBody: true,
      });
      expect(missingRes.status).toBe(404);
      expect((await missingRes.json()).error.code).toBe("ORDER_NOT_FOUND");

      const base = await createShippingCancelledOrder(1);
      await testState.orderRepository.save({
        ...base,
        id: "SL-ACTIVE",
        status: "shipping",
        inventoryRestocked: undefined,
      });
      const activeRes = await postRestock("SL-ACTIVE", {
        cookie,
        omitBody: true,
      });
      expect(activeRes.status).toBe(409);
      expect((await activeRes.json()).error.code).toBe(
        "INVALID_STATUS_TRANSITION",
      );

      await testState.orderRepository.save({
        ...base,
        id: "SL-LEGACY-CANCELLED",
        status: "cancelled",
        inventoryRestocked: undefined,
      });
      const legacyRes = await postRestock("SL-LEGACY-CANCELLED", {
        cookie,
        omitBody: true,
      });
      expect(legacyRes.status).toBe(409);
      expect((await legacyRes.json()).error.code).toBe(
        "INVALID_STATUS_TRANSITION",
      );
      expect(await testState.inventoryRepository.getStock("p011")).toBe(2);
    });
  });
});
