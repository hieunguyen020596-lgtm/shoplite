// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ADMIN_COOKIE_NAME,
  createAdminSessionToken,
} from "@/features/orders/admin-auth";
import type { OrderRepository } from "@/features/orders/order-repository";
import type { Order } from "@/features/orders/types";

const testState = vi.hoisted(() => ({
  repository: undefined as unknown as OrderRepository,
  nowMs: new Date("2026-11-21T08:00:00.000Z").getTime(),
}));

vi.mock("@/features/orders/server", async () => {
  const { createOrderService } =
    await import("@/features/orders/order-service");
  const { createInMemoryOrderRepository } =
    await import("@/features/orders/order-repository");

  testState.repository = createInMemoryOrderRepository();
  const proxyRepository: OrderRepository = {
    findAll: () => testState.repository.findAll(),
    findById: (id) => testState.repository.findById(id),
    save: (order) => testState.repository.save(order),
  };

  return {
    orderService: createOrderService({
      repository: proxyRepository,
      now: () => new Date(testState.nowMs),
    }),
  };
});

import { GET as getOrderById } from "@/app/api/orders/[id]/route";
import { POST as createOrderPost } from "@/app/api/orders/route";
import { PATCH } from "./route";

const env = process.env as Record<string, string | undefined>;
const TEST_PASSCODE = "staff-secret-2026";

const validOrderPayload = {
  customer: {
    fullName: "Lê Văn E",
    phone: "0912345678",
    address: "12 Nguyễn Huệ, Quận 1, TP.HCM",
  },
  shippingMethod: "standard",
  paymentMethod: "cod",
  items: [{ productId: "p006", quantity: 1 }],
};

async function createSampleOrder(): Promise<Order> {
  const response = await createOrderPost(
    new Request("http://localhost/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validOrderPayload),
    }),
  );
  expect(response.status).toBe(201);
  return (await response.json()) as Order;
}

function validAdminCookie(): string {
  const token = createAdminSessionToken();
  return `${ADMIN_COOKIE_NAME}=${token}`;
}

function patchAdminOrderStatus(
  id: string,
  body: unknown,
  options: { cookie?: string; raw?: boolean } = {},
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.cookie !== undefined) {
    headers.cookie = options.cookie;
  }

  return PATCH(
    new Request(`http://localhost/api/admin/orders/${id}/status`, {
      method: "PATCH",
      headers,
      body: options.raw ? String(body) : JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
}

describe("PATCH /api/admin/orders/:id/status", () => {
  let savedAdminPasscode: string | undefined;

  beforeEach(async () => {
    savedAdminPasscode = env.ADMIN_PASSCODE;
    env.ADMIN_PASSCODE = TEST_PASSCODE;

    const { createInMemoryOrderRepository } =
      await import("@/features/orders/order-repository");
    testState.repository = createInMemoryOrderRepository();
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
    it("503 ADMIN_NOT_CONFIGURED khi thiếu/rỗng ADMIN_PASSCODE trước cả parse body & đọc repo", async () => {
      const validCookie = validAdminCookie();

      for (const envValue of [undefined, "", "   "]) {
        if (envValue === undefined) {
          delete env.ADMIN_PASSCODE;
        } else {
          env.ADMIN_PASSCODE = envValue;
        }

        const resInvalidJson = await patchAdminOrderStatus(
          "SL-KHONG-CO",
          "{not-json",
          { raw: true },
        );
        expect(resInvalidJson.status).toBe(503);
        expect((await resInvalidJson.json()).error.code).toBe(
          "ADMIN_NOT_CONFIGURED",
        );

        const resWithCookie = await patchAdminOrderStatus(
          "SL-KHONG-CO",
          { status: "confirmed" },
          { cookie: validCookie },
        );
        expect(resWithCookie.status).toBe(503);
        expect((await resWithCookie.json()).error.code).toBe(
          "ADMIN_NOT_CONFIGURED",
        );
      }
    });

    it("401 UNAUTHORIZED khi thiếu, sai chữ ký hoặc hết hạn cookie (trước parse body & repo)", async () => {
      const created = await createSampleOrder();
      const expiredToken = createAdminSessionToken(Date.now() - 28_801 * 1000);
      const validToken = createAdminSessionToken();
      const tamperedToken = `${validToken.slice(0, -1)}${validToken.endsWith("0") ? "1" : "0"}`;

      for (const cookie of [
        undefined,
        "",
        `${ADMIN_COOKIE_NAME}=invalid-format`,
        `${ADMIN_COOKIE_NAME}=${expiredToken}`,
        `${ADMIN_COOKIE_NAME}=${tamperedToken}`,
      ]) {
        const res = await patchAdminOrderStatus(created.id, "{not-json", {
          cookie,
          raw: true,
        });
        expect(res.status).toBe(401);
        expect((await res.json()).error.code).toBe("UNAUTHORIZED");
      }

      expect((await testState.repository.findById(created.id))?.status).toBe(
        "pending",
      );
    });
  });

  describe("Validate body (400 VALIDATION_ERROR)", () => {
    it("400 khi body không phải JSON hoặc không phải object hợp lệ", async () => {
      const cookie = validAdminCookie();

      for (const rawBody of ["{oops", ""]) {
        const nonJson = await patchAdminOrderStatus("SL-KHONG-CO", rawBody, {
          cookie,
          raw: true,
        });
        expect(nonJson.status).toBe(400);
        expect((await nonJson.json()).error.code).toBe("VALIDATION_ERROR");
      }

      for (const payload of [[], true, "confirmed", null]) {
        const res = await patchAdminOrderStatus("SL-KHONG-CO", payload, {
          cookie,
        });
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error.code).toBe("VALIDATION_ERROR");
        expect(json.error.details._form).toBe(
          "Dữ liệu cập nhật trạng thái phải là một đối tượng JSON",
        );
      }
    });

    it("400 khi status/expectedStatus sai enum, note không phải string, staff hủy thiếu/rỗng note, hoặc note > 200", async () => {
      const created = await createSampleOrder();
      const cookie = validAdminCookie();

      const invalidCases: Array<{
        payload: Record<string, unknown>;
        detailKey: string;
        targetId?: string;
      }> = [
        { payload: {}, detailKey: "status" },
        { payload: { status: "unknown" }, detailKey: "status" },
        {
          payload: { status: "confirmed", expectedStatus: "unknown" },
          detailKey: "expectedStatus",
        },
        {
          payload: { status: "confirmed", expectedStatus: null },
          detailKey: "expectedStatus",
        },
        { payload: { status: "confirmed", note: 123 }, detailKey: "note" },
        { payload: { status: "confirmed", note: null }, detailKey: "note" },
        { payload: { status: "cancelled" }, detailKey: "note" },
        { payload: { status: "cancelled", note: "" }, detailKey: "note" },
        {
          payload: { status: "cancelled", note: "   " },
          detailKey: "note",
          targetId: "SL-KHONG-CO",
        },
        {
          payload: { status: "confirmed", note: "a".repeat(201) },
          detailKey: "note",
        },
        {
          payload: { status: "cancelled", note: "a".repeat(201) },
          detailKey: "note",
        },
      ];

      for (const { payload, detailKey, targetId } of invalidCases) {
        const res = await patchAdminOrderStatus(
          targetId ?? created.id,
          payload,
          { cookie },
        );
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error.code).toBe("VALIDATION_ERROR");
        expect(json.error.details).toHaveProperty(detailKey);
      }

      expect((await testState.repository.findById(created.id))?.status).toBe(
        "pending",
      );
    });
  });

  describe("Not found (404 ORDER_NOT_FOUND)", () => {
    it("404 khi cookie & body hợp lệ nhưng :id không tồn tại", async () => {
      const res = await patchAdminOrderStatus(
        "SL-KHONG-CO",
        { status: "confirmed" },
        { cookie: validAdminCookie() },
      );

      expect(res.status).toBe(404);
      expect((await res.json()).error.code).toBe("ORDER_NOT_FOUND");
      expect(await testState.repository.findAll()).toHaveLength(0);
    });
  });

  describe("Chuyển trạng thái & hủy đơn hợp lệ (200)", () => {
    it("đi qua trọn vòng đời pending -> confirmed -> shipping (có note & expectedStatus) -> delivered và GET /api/orders/:id đủ 4 mốc", async () => {
      const cookie = validAdminCookie();
      const created = await createSampleOrder();

      testState.nowMs += 60_000;
      const confirmedRes = await patchAdminOrderStatus(
        created.id,
        { status: "confirmed" },
        { cookie },
      );
      expect(confirmedRes.status).toBe(200);
      expect(confirmedRes.headers.get("cache-control")).toBe("no-store");
      const confirmedBody = (await confirmedRes.json()) as { order: Order };
      expect(confirmedBody.order.status).toBe("confirmed");

      testState.nowMs += 60_000;
      const shippingRes = await patchAdminOrderStatus(
        created.id,
        {
          status: "shipping",
          expectedStatus: "confirmed",
          note: "  Đã bàn giao cho đơn vị vận chuyển  ",
        },
        { cookie },
      );
      expect(shippingRes.status).toBe(200);
      expect(shippingRes.headers.get("cache-control")).toBe("no-store");
      const shippingBody = (await shippingRes.json()) as { order: Order };
      expect(shippingBody.order.status).toBe("shipping");

      testState.nowMs += 60_000;
      const deliveredRes = await patchAdminOrderStatus(
        created.id,
        {
          status: "delivered",
          expectedStatus: "shipping",
        },
        { cookie },
      );
      expect(deliveredRes.status).toBe(200);
      expect(deliveredRes.headers.get("cache-control")).toBe("no-store");

      const getRes = await getOrderById(
        new Request(`http://localhost/api/orders/${created.id}`),
        { params: Promise.resolve({ id: created.id }) },
      );
      expect(getRes.status).toBe(200);
      const fetchedOrder = (await getRes.json()) as Order;

      expect(fetchedOrder.status).toBe("delivered");
      expect(fetchedOrder.statusHistory).toEqual([
        {
          status: "pending",
          at: created.createdAt,
          actor: "customer",
          action: "transition",
        },
        {
          status: "confirmed",
          at: new Date(
            new Date(created.createdAt).getTime() + 60_000,
          ).toISOString(),
          actor: "staff",
          action: "transition",
        },
        {
          status: "shipping",
          at: new Date(
            new Date(created.createdAt).getTime() + 120_000,
          ).toISOString(),
          actor: "staff",
          action: "transition",
          note: "Đã bàn giao cho đơn vị vận chuyển",
        },
        {
          status: "delivered",
          at: new Date(
            new Date(created.createdAt).getTime() + 180_000,
          ).toISOString(),
          actor: "staff",
          action: "transition",
        },
      ]);
    });

    it("gán cứng actor = staff từ server bất chấp client gửi actor = customer hoặc giả mạo inventoryRestocked/statusHistory", async () => {
      const cookie = validAdminCookie();
      const created = await createSampleOrder();

      const res = await patchAdminOrderStatus(
        created.id,
        {
          status: "confirmed",
          actor: "customer",
          inventoryRestocked: true,
          statusHistory: [],
        },
        { cookie },
      );
      expect(res.status).toBe(200);
      const { order } = (await res.json()) as { order: Order };
      expect(order.statusHistory).toHaveLength(2);
      expect(order.statusHistory?.at(-1)?.actor).toBe("staff");
      expect(order.inventoryRestocked).toBeUndefined();

      const missingNoteCancel = await patchAdminOrderStatus(
        created.id,
        { status: "cancelled", actor: "customer" },
        { cookie },
      );
      expect(missingNoteCancel.status).toBe(400);
      expect((await missingNoteCancel.json()).error.code).toBe(
        "VALIDATION_ERROR",
      );

      const spoofedCancel = await patchAdminOrderStatus(
        created.id,
        {
          status: "cancelled",
          note: "Hủy đơn",
          inventoryRestocked: false,
          statusHistory: [],
        },
        { cookie },
      );
      expect(spoofedCancel.status).toBe(200);
      const cancelledBody = (await spoofedCancel.json()) as { order: Order };
      expect(cancelledBody.order.inventoryRestocked).toBe(true);
      expect(cancelledBody.order.statusHistory).toHaveLength(3);
    });

    it("staff hủy pending/confirmed đặt inventoryRestocked = true; hủy shipping đặt inventoryRestocked = false", async () => {
      const cookie = validAdminCookie();

      const pendingOrder = await createSampleOrder();
      const cancelPending = await patchAdminOrderStatus(
        pendingOrder.id,
        { status: "cancelled", note: "  Khách đổi ý  " },
        { cookie },
      );
      expect(cancelPending.status).toBe(200);
      const pendingBody = (await cancelPending.json()) as { order: Order };
      expect(pendingBody.order.inventoryRestocked).toBe(true);
      expect(pendingBody.order.statusHistory?.at(-1)).toMatchObject({
        status: "cancelled",
        actor: "staff",
        action: "transition",
        note: "Khách đổi ý",
      });

      const confirmedOrder = await createSampleOrder();
      await patchAdminOrderStatus(
        confirmedOrder.id,
        { status: "confirmed" },
        { cookie },
      );
      const cancelConfirmed = await patchAdminOrderStatus(
        confirmedOrder.id,
        { status: "cancelled", note: "Hết hàng" },
        { cookie },
      );
      expect(cancelConfirmed.status).toBe(200);
      expect(
        ((await cancelConfirmed.json()) as { order: Order }).order
          .inventoryRestocked,
      ).toBe(true);

      const shippingOrder = await createSampleOrder();
      await patchAdminOrderStatus(
        shippingOrder.id,
        { status: "confirmed" },
        { cookie },
      );
      await patchAdminOrderStatus(
        shippingOrder.id,
        { status: "shipping" },
        { cookie },
      );
      const cancelShipping = await patchAdminOrderStatus(
        shippingOrder.id,
        { status: "cancelled", note: "Không liên lạc được người nhận" },
        { cookie },
      );
      expect(cancelShipping.status).toBe(200);
      expect(
        ((await cancelShipping.json()) as { order: Order }).order
          .inventoryRestocked,
      ).toBe(false);
    });

    it("chấp nhận note đúng 200 ký tự (sau trim) và bỏ qua note toàn khoảng trắng khi không hủy", async () => {
      const cookie = validAdminCookie();
      const created = await createSampleOrder();
      const exact200 = "a".repeat(200);

      const confirmRes = await patchAdminOrderStatus(
        created.id,
        { status: "confirmed", note: "   " },
        { cookie },
      );
      expect(confirmRes.status).toBe(200);
      const confirmed = ((await confirmRes.json()) as { order: Order }).order;
      expect(confirmed.statusHistory?.at(-1)).not.toHaveProperty("note");

      const shippingRes = await patchAdminOrderStatus(
        created.id,
        { status: "shipping", note: `  ${exact200}  ` },
        { cookie },
      );
      expect(shippingRes.status).toBe(200);
      const shipping = ((await shippingRes.json()) as { order: Order }).order;
      expect(shipping.statusHistory?.at(-1)?.note).toBe(exact200);
    });
  });

  describe("Sai ma trận hoặc xung đột expectedStatus (409 INVALID_STATUS_TRANSITION)", () => {
    it("409 và không ghi đè khi nhảy cóc pending -> delivered, lùi confirmed -> pending hoặc từ trạng thái kết thúc", async () => {
      const cookie = validAdminCookie();
      const created = await createSampleOrder();

      const jumpRes = await patchAdminOrderStatus(
        created.id,
        { status: "delivered" },
        { cookie },
      );
      expect(jumpRes.status).toBe(409);
      expect((await jumpRes.json()).error.code).toBe(
        "INVALID_STATUS_TRANSITION",
      );
      expect((await testState.repository.findById(created.id))?.status).toBe(
        "pending",
      );

      await testState.repository.save({ ...created, status: "confirmed" });
      const backwardRes = await patchAdminOrderStatus(
        created.id,
        { status: "pending" },
        { cookie },
      );
      expect(backwardRes.status).toBe(409);
      expect((await backwardRes.json()).error.code).toBe(
        "INVALID_STATUS_TRANSITION",
      );
      expect((await testState.repository.findById(created.id))?.status).toBe(
        "confirmed",
      );

      await testState.repository.save({ ...created, status: "delivered" });
      const cancelDeliveredRes = await patchAdminOrderStatus(
        created.id,
        { status: "cancelled", note: "Thử hủy đơn đã giao" },
        { cookie },
      );
      expect(cancelDeliveredRes.status).toBe(409);
      expect((await cancelDeliveredRes.json()).error.code).toBe(
        "INVALID_STATUS_TRANSITION",
      );
      expect((await testState.repository.findById(created.id))?.status).toBe(
        "delivered",
      );

      await testState.repository.save({ ...created, status: "cancelled" });
      const reopenCancelledRes = await patchAdminOrderStatus(
        created.id,
        { status: "confirmed" },
        { cookie },
      );
      expect(reopenCancelledRes.status).toBe(409);
      expect((await reopenCancelledRes.json()).error.code).toBe(
        "INVALID_STATUS_TRANSITION",
      );
      expect((await testState.repository.findById(created.id))?.status).toBe(
        "cancelled",
      );
    });

    it("409 và không ghi đè khi expectedStatus xung đột với trạng thái hiện tại", async () => {
      const cookie = validAdminCookie();
      const created = await createSampleOrder();

      await patchAdminOrderStatus(
        created.id,
        { status: "confirmed" },
        { cookie },
      );

      const conflictRes = await patchAdminOrderStatus(
        created.id,
        { status: "shipping", expectedStatus: "pending" },
        { cookie },
      );
      expect(conflictRes.status).toBe(409);
      expect((await conflictRes.json()).error.code).toBe(
        "INVALID_STATUS_TRANSITION",
      );

      const stored = await testState.repository.findById(created.id);
      expect(stored?.status).toBe("confirmed");
      expect(stored?.statusHistory).toHaveLength(2);
    });
  });
});
