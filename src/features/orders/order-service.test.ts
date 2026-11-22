import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { SHIPPING_OPTIONS } from "@/features/checkout/pricing";
import { StorageLock } from "@/lib/storage-lock";
import {
  createInMemoryInventoryRepository,
  createJsonFileInventoryRepository,
  type InventoryRepository,
} from "./inventory-repository";
import { OrderError } from "./order-errors";
import {
  createInMemoryOrderRepository,
  createJsonFileOrderRepository,
  type OrderRepository,
} from "./order-repository";
import {
  createOrderService,
  generateOrderId,
  type OrderService,
} from "./order-service";

const FIXED_DATE = new Date("2026-10-21T03:00:00.000Z");

const validInput = (overrides: Record<string, unknown> = {}) => ({
  customer: {
    fullName: "Trần Thị B",
    phone: "0987654321",
    email: "",
    address: "45 Lê Lợi, Hải Châu, Đà Nẵng",
  },
  shippingMethod: "standard",
  paymentMethod: "cod",
  items: [{ productId: "p010", quantity: 2 }], // Cáp USB-C 150.000đ
  ...overrides,
});

async function expectOrderError(
  promise: Promise<unknown>,
  code: OrderError["code"],
) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(OrderError);
  expect((error as OrderError).code).toBe(code);
  return error as OrderError;
}

describe("orderService", () => {
  let repository: OrderRepository;
  let service: OrderService;

  beforeEach(() => {
    repository = createInMemoryOrderRepository();
    let counter = 0;
    service = createOrderService({
      repository,
      now: () => FIXED_DATE,
      generateId: () => `SL-TEST-${++counter}`,
    });
  });

  describe("placeOrder", () => {
    it("tạo đơn hàng với giá lấy từ catalog và lưu vào repository", async () => {
      const order = await service.placeOrder(validInput());

      expect(order).toMatchObject({
        id: "SL-TEST-1",
        status: "pending",
        createdAt: FIXED_DATE.toISOString(),
        subtotal: 300_000,
        shippingFee: SHIPPING_OPTIONS.standard.fee,
        total: 330_000,
      });
      expect(order.items[0]).toMatchObject({
        productId: "p010",
        unitPrice: 150_000,
        lineTotal: 300_000,
      });
      expect(order.customer.email).toBeUndefined();
      expect(await repository.findById(order.id)).toEqual(order);
    });

    it("khởi tạo statusHistory gồm 1 mục pending với actor customer", async () => {
      const order = await service.placeOrder(validInput());

      expect(order.statusHistory).toEqual([
        {
          status: "pending",
          at: order.createdAt,
          actor: "customer",
          action: "transition",
        },
      ]);
      expect((await repository.findById(order.id))?.statusHistory).toEqual(
        order.statusHistory,
      );
    });

    it("bỏ qua giá do client gửi lên", async () => {
      const order = await service.placeOrder(
        validInput({ items: [{ productId: "p010", quantity: 1, price: 1 }] }),
      );
      expect(order.items[0].unitPrice).toBe(150_000);
    });

    it("gộp các dòng trùng sản phẩm", async () => {
      const order = await service.placeOrder(
        validInput({
          items: [
            { productId: "p010", quantity: 1 },
            { productId: "p010", quantity: 2 },
          ],
        }),
      );
      expect(order.items).toHaveLength(1);
      expect(order.items[0].quantity).toBe(3);
    });

    it("miễn phí giao hàng tiêu chuẩn cho đơn từ 500.000đ", async () => {
      const order = await service.placeOrder(
        validInput({ items: [{ productId: "p001", quantity: 1 }] }),
      );
      expect(order.shippingFee).toBe(0);
    });

    it("trả lỗi VALIDATION_ERROR kèm chi tiết từng field", async () => {
      const error = await expectOrderError(
        service.placeOrder(
          validInput({ customer: { fullName: "", phone: "123", address: "" } }),
        ),
        "VALIDATION_ERROR",
      );
      expect(error.details).toHaveProperty(["customer.phone"]);
      expect(error.httpStatus).toBe(400);
    });

    it("từ chối giỏ hàng trống", async () => {
      await expectOrderError(
        service.placeOrder(validInput({ items: [] })),
        "VALIDATION_ERROR",
      );
    });

    it("trả lỗi PRODUCT_NOT_FOUND khi sản phẩm không tồn tại", async () => {
      await expectOrderError(
        service.placeOrder(
          validInput({ items: [{ productId: "p999", quantity: 1 }] }),
        ),
        "PRODUCT_NOT_FOUND",
      );
    });

    it("trả lỗi INSUFFICIENT_STOCK khi vượt tồn kho hoặc hết hàng", async () => {
      // Giá đỡ laptop (p011) chỉ còn 3 sản phẩm, micro (p004) đã hết hàng
      const partialErr = await expectOrderError(
        service.placeOrder(
          validInput({ items: [{ productId: "p011", quantity: 4 }] }),
        ),
        "INSUFFICIENT_STOCK",
      );
      expect(partialErr.details).toEqual({
        productId: "p011",
        available: "3",
        requested: "4",
      });
      const outErr = await expectOrderError(
        service.placeOrder(
          validInput({ items: [{ productId: "p004", quantity: 1 }] }),
        ),
        "INSUFFICIENT_STOCK",
      );
      expect(outErr.details).toEqual({
        productId: "p004",
        available: "0",
        requested: "1",
      });
    });
  });

  describe("listOrders / getOrder", () => {
    it("liệt kê đơn hàng mới nhất trước", async () => {
      let time = FIXED_DATE.getTime();
      const timedService = createOrderService({
        repository,
        now: () => new Date((time += 60_000)),
      });
      const first = await timedService.placeOrder(validInput());
      const second = await timedService.placeOrder(validInput());

      const orders = await timedService.listOrders();
      expect(orders.map((order) => order.id)).toEqual([second.id, first.id]);
    });

    it("trả lỗi ORDER_NOT_FOUND với mã đơn không tồn tại", async () => {
      await expectOrderError(
        service.getOrder("SL-KHONG-CO"),
        "ORDER_NOT_FOUND",
      );
    });
  });

  describe("cancelOrder", () => {
    it("hủy đơn đang chờ xác nhận", async () => {
      const order = await service.placeOrder(validInput());
      const cancelled = await service.cancelOrder(order.id);
      expect(cancelled.status).toBe("cancelled");
      expect((await service.getOrder(order.id)).status).toBe("cancelled");
    });

    it("không cho hủy đơn đã hủy hoặc đã xác nhận", async () => {
      const order = await service.placeOrder(validInput());
      await repository.save({ ...order, status: "confirmed" });
      await expectOrderError(
        service.cancelOrder(order.id),
        "INVALID_STATUS_TRANSITION",
      );
    });

    it("ghi nhận statusHistory và đặt inventoryRestocked = true khi khách hủy đơn mới", async () => {
      let currentMs = FIXED_DATE.getTime();
      const timedService = createOrderService({
        repository,
        now: () => new Date(currentMs),
        generateId: () => "SL-CANCEL-NEW",
      });

      const created = await timedService.placeOrder(validInput());
      currentMs += 120_000;
      const cancelled = await timedService.cancelOrder(created.id);

      expect(cancelled.status).toBe("cancelled");
      expect(cancelled.updatedAt).toBe(new Date(currentMs).toISOString());
      expect(cancelled.inventoryRestocked).toBe(true);
      expect(cancelled.statusHistory).toEqual([
        {
          status: "pending",
          at: created.createdAt,
          actor: "customer",
          action: "transition",
        },
        {
          status: "cancelled",
          at: new Date(currentMs).toISOString(),
          actor: "customer",
          action: "transition",
        },
      ]);
    });

    it("hỗ trợ khách hủy đơn cũ thiếu statusHistory: tổng hợp lịch sử và đặt inventoryRestocked = true", async () => {
      let currentMs = FIXED_DATE.getTime();
      const timedService = createOrderService({
        repository,
        now: () => new Date(currentMs),
        generateId: () => "SL-LEGACY-CANCEL",
      });

      const created = await timedService.placeOrder(validInput());
      const legacyOrder = { ...created };
      delete legacyOrder.statusHistory;
      await repository.save(legacyOrder);

      currentMs += 300_000;
      const cancelled = await timedService.cancelOrder(created.id);

      expect(cancelled.status).toBe("cancelled");
      expect(cancelled.inventoryRestocked).toBe(true);
      expect(cancelled.statusHistory).toEqual([
        {
          status: "pending",
          at: created.createdAt,
          actor: "customer",
          action: "transition",
        },
        {
          status: "cancelled",
          at: new Date(currentMs).toISOString(),
          actor: "customer",
          action: "transition",
        },
      ]);
    });

    it("trả lỗi ORDER_NOT_FOUND khi hủy mã đơn không tồn tại", async () => {
      await expectOrderError(
        service.cancelOrder("SL-KHONG-CO"),
        "ORDER_NOT_FOUND",
      );
    });
  });

  describe("transitionOrderStatus", () => {
    it("chuyển tuần tự pending -> confirmed -> shipping (có note & expectedStatus) -> delivered và lưu đủ 4 mốc", async () => {
      let currentMs = FIXED_DATE.getTime();
      const timedService = createOrderService({
        repository,
        now: () => new Date(currentMs),
        generateId: () => "SL-FLOW-1",
      });

      const created = await timedService.placeOrder(validInput());

      currentMs += 60_000;
      const confirmed = await timedService.transitionOrderStatus(created.id, {
        status: "confirmed",
        actor: "staff",
      });
      expect(confirmed.status).toBe("confirmed");

      currentMs += 60_000;
      const shipping = await timedService.transitionOrderStatus(created.id, {
        status: "shipping",
        actor: "staff",
        note: "  Giao qua GHN - mã vận đơn 123  ",
        expectedStatus: "confirmed",
      });
      expect(shipping.status).toBe("shipping");

      currentMs += 60_000;
      const delivered = await timedService.transitionOrderStatus(created.id, {
        status: "delivered",
        actor: "staff",
        expectedStatus: "shipping",
      });
      expect(delivered.status).toBe("delivered");
      expect(delivered.updatedAt).toBe(new Date(currentMs).toISOString());
      expect(delivered.statusHistory).toEqual([
        {
          status: "pending",
          at: created.createdAt,
          actor: "customer",
          action: "transition",
        },
        {
          status: "confirmed",
          at: new Date(FIXED_DATE.getTime() + 60_000).toISOString(),
          actor: "staff",
          action: "transition",
        },
        {
          status: "shipping",
          at: new Date(FIXED_DATE.getTime() + 120_000).toISOString(),
          actor: "staff",
          action: "transition",
          note: "Giao qua GHN - mã vận đơn 123",
        },
        {
          status: "delivered",
          at: new Date(FIXED_DATE.getTime() + 180_000).toISOString(),
          actor: "staff",
          action: "transition",
        },
      ]);
      expect(await timedService.getOrder(created.id)).toEqual(delivered);
    });

    it("đặt inventoryRestocked = true khi staff hủy đơn pending/confirmed và false khi hủy từ shipping", async () => {
      const pendingOrder = await service.placeOrder(validInput());
      const cancelledPending = await service.transitionOrderStatus(
        pendingOrder.id,
        {
          status: "cancelled",
          actor: "staff",
          note: "  Khách yêu cầu hủy qua hotline ",
        },
      );
      expect(cancelledPending.inventoryRestocked).toBe(true);
      expect(cancelledPending.statusHistory?.at(-1)).toMatchObject({
        status: "cancelled",
        actor: "staff",
        action: "transition",
        note: "Khách yêu cầu hủy qua hotline",
      });

      const confirmedOrder = await service.placeOrder(validInput());
      await service.transitionOrderStatus(confirmedOrder.id, {
        status: "confirmed",
        actor: "staff",
      });
      const cancelledConfirmed = await service.transitionOrderStatus(
        confirmedOrder.id,
        {
          status: "cancelled",
          actor: "staff",
          note: "Hết hàng kiểm đếm",
        },
      );
      expect(cancelledConfirmed.inventoryRestocked).toBe(true);

      const shippingOrder = await service.placeOrder(validInput());
      await service.transitionOrderStatus(shippingOrder.id, {
        status: "confirmed",
        actor: "staff",
      });
      await service.transitionOrderStatus(shippingOrder.id, {
        status: "shipping",
        actor: "staff",
      });
      const cancelledShipping = await service.transitionOrderStatus(
        shippingOrder.id,
        {
          status: "cancelled",
          actor: "staff",
          note: "Khách bom hàng",
        },
      );
      expect(cancelledShipping.inventoryRestocked).toBe(false);
    });

    it("đơn cũ thiếu statusHistory ở trạng thái shipping khi staff hủy vẫn đặt inventoryRestocked = true", async () => {
      const created = await service.placeOrder(validInput());
      const legacyShipping = { ...created, status: "shipping" as const };
      delete legacyShipping.statusHistory;
      await repository.save(legacyShipping);

      const cancelled = await service.transitionOrderStatus(created.id, {
        status: "cancelled",
        actor: "staff",
        note: "Đơn cũ thất lạc",
      });
      expect(cancelled.inventoryRestocked).toBe(true);
      expect(cancelled.statusHistory).toHaveLength(3);
      expect(cancelled.statusHistory?.at(-1)).toMatchObject({
        status: "cancelled",
        actor: "staff",
        note: "Đơn cũ thất lạc",
      });
    });

    it("ném INVALID_STATUS_TRANSITION và không ghi đè khi expectedStatus lệch hoặc sai ma trận", async () => {
      const created = await service.placeOrder(validInput());
      await service.transitionOrderStatus(created.id, {
        status: "confirmed",
        actor: "staff",
      });

      await expectOrderError(
        service.transitionOrderStatus(created.id, {
          status: "shipping",
          actor: "staff",
          expectedStatus: "pending",
        }),
        "INVALID_STATUS_TRANSITION",
      );
      expect((await service.getOrder(created.id)).status).toBe("confirmed");

      await expectOrderError(
        service.transitionOrderStatus(created.id, {
          status: "pending",
          actor: "staff",
        }),
        "INVALID_STATUS_TRANSITION",
      );
      expect((await service.getOrder(created.id)).status).toBe("confirmed");
    });

    it("ném VALIDATION_ERROR khi staff hủy thiếu/rỗng note hoặc note > 200 ký tự và giữ nguyên đơn", async () => {
      const created = await service.placeOrder(validInput());

      await expectOrderError(
        service.transitionOrderStatus(created.id, {
          status: "cancelled",
          actor: "staff",
          note: "   ",
        }),
        "VALIDATION_ERROR",
      );

      await expectOrderError(
        service.transitionOrderStatus(created.id, {
          status: "confirmed",
          actor: "staff",
          note: "a".repeat(201),
        }),
        "VALIDATION_ERROR",
      );

      expect((await service.getOrder(created.id)).status).toBe("pending");
    });

    it("ném ORDER_NOT_FOUND với mã đơn không tồn tại", async () => {
      await expectOrderError(
        service.transitionOrderStatus("SL-KHONG-CO", {
          status: "confirmed",
          actor: "staff",
        }),
        "ORDER_NOT_FOUND",
      );
    });
  });

  describe("Tích hợp tồn kho nguyên tử, rollback & hoàn kho", () => {
    it("all-or-nothing: đơn có món 1 đủ kho nhưng món 2 thiếu kho thì không trừ kho món 1", async () => {
      const inventoryRepository = createInMemoryInventoryRepository({
        p006: 10,
        p011: 1,
      });
      const stockService = createOrderService({
        repository,
        inventoryRepository,
        storageLock: new StorageLock(),
        now: () => FIXED_DATE,
      });

      await expectOrderError(
        stockService.placeOrder(
          validInput({
            items: [
              { productId: "p006", quantity: 3 },
              { productId: "p011", quantity: 2 },
            ],
          }),
        ),
        "INSUFFICIENT_STOCK",
      );

      expect(await inventoryRepository.getStock("p006")).toBe(10);
      expect(await inventoryRepository.getStock("p011")).toBe(1);
      expect(await repository.findAll()).toHaveLength(0);
    });

    it("tự động rollback hoàn trả tồn kho khi repository.save() ném lỗi I/O", async () => {
      const inventoryRepository = createInMemoryInventoryRepository({
        p006: 5,
        p011: 3,
      });
      const failingRepository: OrderRepository = {
        findAll: () => repository.findAll(),
        findById: (id) => repository.findById(id),
        save: async () => {
          throw new Error("EIO: disk write failed");
        },
      };
      const failingService = createOrderService({
        repository: failingRepository,
        inventoryRepository,
        storageLock: new StorageLock(),
        now: () => FIXED_DATE,
      });

      await expect(
        failingService.placeOrder(
          validInput({
            items: [
              { productId: "p006", quantity: 2 },
              { productId: "p011", quantity: 1 },
            ],
          }),
        ),
      ).rejects.toThrow("EIO: disk write failed");

      expect(await inventoryRepository.getStock("p006")).toBe(5);
      expect(await inventoryRepository.getStock("p011")).toBe(3);
    });

    it("hủy đơn mới từ pending/confirmed hoàn kho thật; hủy đơn cũ thiếu statusHistory không cộng khống kho", async () => {
      const inventoryRepository = createInMemoryInventoryRepository({
        p006: 10,
      });
      const stockService = createOrderService({
        repository,
        inventoryRepository,
        storageLock: new StorageLock(),
        now: () => FIXED_DATE,
      });

      // Đơn mới hủy từ pending -> trừ 2 rồi hoàn 2 -> về 10
      const pendingOrder = await stockService.placeOrder(
        validInput({ items: [{ productId: "p006", quantity: 2 }] }),
      );
      expect(await inventoryRepository.getStock("p006")).toBe(8);
      await stockService.cancelOrder(pendingOrder.id);
      expect(await inventoryRepository.getStock("p006")).toBe(10);

      // Đơn mới hủy từ confirmed -> trừ 3 rồi hoàn 3 -> về 10
      const confirmedOrder = await stockService.placeOrder(
        validInput({ items: [{ productId: "p006", quantity: 3 }] }),
      );
      expect(await inventoryRepository.getStock("p006")).toBe(7);
      await stockService.transitionOrderStatus(confirmedOrder.id, {
        status: "confirmed",
        actor: "staff",
      });
      await stockService.transitionOrderStatus(confirmedOrder.id, {
        status: "cancelled",
        actor: "staff",
        note: "Hủy từ confirmed",
      });
      expect(await inventoryRepository.getStock("p006")).toBe(10);

      // Đơn lịch sử (statusHistory === undefined) hủy từ pending -> đặt inventoryRestocked = true nhưng KHÔNG cộng kho
      const legacyOrder = {
        ...pendingOrder,
        id: "SL-LEGACY-NO-RESTOCK",
        status: "pending" as const,
      };
      delete legacyOrder.statusHistory;
      delete legacyOrder.inventoryRestocked;
      await repository.save(legacyOrder);

      const cancelledLegacy = await stockService.cancelOrder(legacyOrder.id);
      expect(cancelledLegacy.inventoryRestocked).toBe(true);
      expect(await inventoryRepository.getStock("p006")).toBe(10);
    });

    it("restockCancelledOrder hoàn kho đúng 1 lần cho đơn hủy từ shipping, chặn gọi đúp & validate", async () => {
      let currentMs = FIXED_DATE.getTime();
      const inventoryRepository = createInMemoryInventoryRepository({
        p011: 3,
      });
      const stockService = createOrderService({
        repository,
        inventoryRepository,
        storageLock: new StorageLock(),
        now: () => new Date(currentMs),
      });

      const order = await stockService.placeOrder(
        validInput({ items: [{ productId: "p011", quantity: 2 }] }),
      );
      expect(await inventoryRepository.getStock("p011")).toBe(1);

      await stockService.transitionOrderStatus(order.id, {
        status: "confirmed",
        actor: "staff",
      });
      await stockService.transitionOrderStatus(order.id, {
        status: "shipping",
        actor: "staff",
      });
      const cancelled = await stockService.transitionOrderStatus(order.id, {
        status: "cancelled",
        actor: "staff",
        note: "Khách từ chối nhận",
      });
      expect(cancelled.inventoryRestocked).toBe(false);
      expect(await inventoryRepository.getStock("p011")).toBe(1);

      currentMs += 60_000;
      const restocked = await stockService.restockCancelledOrder(
        order.id,
        "  Đã nhận lại đủ 2 giá đỡ nguyên vẹn  ",
      );
      expect(restocked.inventoryRestocked).toBe(true);
      expect(restocked.updatedAt).toBe(new Date(currentMs).toISOString());
      expect(restocked.statusHistory?.at(-1)).toEqual({
        status: "cancelled",
        at: new Date(currentMs).toISOString(),
        actor: "staff",
        action: "restock",
        note: "Đã nhận lại đủ 2 giá đỡ nguyên vẹn",
      });
      expect(await inventoryRepository.getStock("p011")).toBe(3);

      // Gọi lần 2 -> 409 INVALID_STATUS_TRANSITION, không cộng thêm kho
      await expectOrderError(
        stockService.restockCancelledOrder(order.id),
        "INVALID_STATUS_TRANSITION",
      );
      expect(await inventoryRepository.getStock("p011")).toBe(3);

      // Đơn lịch sử cancelled có inventoryRestocked === undefined -> 409 INVALID_STATUS_TRANSITION
      await repository.save({
        ...cancelled,
        id: "SL-LEGACY-CANCELLED",
        inventoryRestocked: undefined,
      });
      await expectOrderError(
        stockService.restockCancelledOrder("SL-LEGACY-CANCELLED"),
        "INVALID_STATUS_TRANSITION",
      );
      expect(await inventoryRepository.getStock("p011")).toBe(3);

      // Đơn chưa hủy -> 409 INVALID_STATUS_TRANSITION
      const activeOrder = await stockService.placeOrder(
        validInput({ items: [{ productId: "p011", quantity: 1 }] }),
      );
      expect(await inventoryRepository.getStock("p011")).toBe(2);
      await expectOrderError(
        stockService.restockCancelledOrder(activeOrder.id),
        "INVALID_STATUS_TRANSITION",
      );
      expect(await inventoryRepository.getStock("p011")).toBe(2);

      // Mã đơn không tồn tại -> 404 ORDER_NOT_FOUND
      await expectOrderError(
        stockService.restockCancelledOrder("SL-KHONG-CO"),
        "ORDER_NOT_FOUND",
      );

      // Note > 200 ký tự -> 400 VALIDATION_ERROR
      await stockService.transitionOrderStatus(activeOrder.id, {
        status: "confirmed",
        actor: "staff",
      });
      await stockService.transitionOrderStatus(activeOrder.id, {
        status: "shipping",
        actor: "staff",
      });
      await stockService.transitionOrderStatus(activeOrder.id, {
        status: "cancelled",
        actor: "staff",
        note: "Hoàn về kho",
      });
      await expectOrderError(
        stockService.restockCancelledOrder(activeOrder.id, "a".repeat(201)),
        "VALIDATION_ERROR",
      );
      expect(await inventoryRepository.getStock("p011")).toBe(2);
    });

    it("đặt hàng song song qua file JSON thật (Promise.allSettled): p011 stock=1, 5 request chỉ 1 đơn thành công và kho cuối = 0", async () => {
      const dir = await mkdtemp(path.join(tmpdir(), "shoplite-concurrent-"));
      try {
        const ordersFile = path.join(dir, "orders.json");
        const inventoryFile = path.join(dir, "inventory.json");
        await writeFile(inventoryFile, JSON.stringify({ p011: 1 }), "utf8");

        const sharedLock = new StorageLock();
        const fileOrderRepo = createJsonFileOrderRepository(
          ordersFile,
          sharedLock,
        );
        const fileInventoryRepo = createJsonFileInventoryRepository(
          inventoryFile,
          sharedLock,
        );
        const fileService = createOrderService({
          repository: fileOrderRepo,
          inventoryRepository: fileInventoryRepo,
          storageLock: sharedLock,
          now: () => FIXED_DATE,
        });

        const results = await Promise.allSettled(
          Array.from({ length: 5 }, () =>
            fileService.placeOrder(
              validInput({ items: [{ productId: "p011", quantity: 1 }] }),
            ),
          ),
        );

        const fulfilled = results.filter((r) => r.status === "fulfilled");
        const rejected = results.filter((r) => r.status === "rejected");

        expect(fulfilled).toHaveLength(1);
        expect(rejected).toHaveLength(4);
        for (const failure of rejected) {
          const reason = (failure as PromiseRejectedResult).reason;
          expect(reason).toBeInstanceOf(OrderError);
          expect((reason as OrderError).code).toBe("INSUFFICIENT_STOCK");
        }

        const persistedOrders = JSON.parse(
          await readFile(ordersFile, "utf8"),
        ) as unknown[];
        const persistedInventory = JSON.parse(
          await readFile(inventoryFile, "utf8"),
        ) as Record<string, number>;

        expect(persistedOrders).toHaveLength(1);
        expect(persistedInventory.p011).toBe(0);
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    });

    it("rethrow lỗi và rollback đơn về đúng previousOrder khi inventoryRepository.restock ném lỗi (cancelOrder & restockCancelledOrder)", async () => {
      const baseInventory = createInMemoryInventoryRepository({ p011: 5 });
      let failRestock = false;
      const inventoryRepository: InventoryRepository = {
        ...baseInventory,
        restock: async (items) => {
          if (failRestock) {
            throw new Error("EIO: restock failed");
          }
          return baseInventory.restock(items);
        },
      };
      const stockService = createOrderService({
        repository,
        inventoryRepository,
        storageLock: new StorageLock(),
        now: () => FIXED_DATE,
      });

      // (1) cancelOrder trên đơn pending
      const pendingOrder = await stockService.placeOrder(
        validInput({ items: [{ productId: "p011", quantity: 2 }] }),
      );
      expect(await inventoryRepository.getStock("p011")).toBe(3);
      const previousPending = structuredClone(
        await repository.findById(pendingOrder.id),
      );

      failRestock = true;
      await expect(stockService.cancelOrder(pendingOrder.id)).rejects.toThrow(
        "EIO: restock failed",
      );

      const afterPending = await repository.findById(pendingOrder.id);
      expect(afterPending?.status).toBe(previousPending?.status);
      expect(afterPending?.inventoryRestocked).toBe(
        previousPending?.inventoryRestocked,
      );
      expect(afterPending?.statusHistory).toEqual(
        previousPending?.statusHistory,
      );
      expect(afterPending).toEqual(previousPending);
      expect(await inventoryRepository.getStock("p011")).toBe(3);

      // (2) restockCancelledOrder trên đơn hủy từ shipping
      failRestock = false;
      const shippingOrder = await stockService.placeOrder(
        validInput({ items: [{ productId: "p011", quantity: 1 }] }),
      );
      await stockService.transitionOrderStatus(shippingOrder.id, {
        status: "confirmed",
        actor: "staff",
      });
      await stockService.transitionOrderStatus(shippingOrder.id, {
        status: "shipping",
        actor: "staff",
      });
      const shippingCancelled = await stockService.transitionOrderStatus(
        shippingOrder.id,
        { status: "cancelled", actor: "staff", note: "Khách từ chối nhận" },
      );
      expect(shippingCancelled.inventoryRestocked).toBe(false);
      expect(await inventoryRepository.getStock("p011")).toBe(2);
      const previousShipping = structuredClone(
        await repository.findById(shippingOrder.id),
      );

      failRestock = true;
      await expect(
        stockService.restockCancelledOrder(shippingOrder.id, "Nhận lại hàng"),
      ).rejects.toThrow("EIO: restock failed");

      const afterShipping = await repository.findById(shippingOrder.id);
      expect(afterShipping?.status).toBe(previousShipping?.status);
      expect(afterShipping?.inventoryRestocked).toBe(false);
      expect(afterShipping?.statusHistory).toEqual(
        previousShipping?.statusHistory,
      );
      expect(afterShipping).toEqual(previousShipping);
      expect(await inventoryRepository.getStock("p011")).toBe(2);
    });

    it("hủy / hoàn kho song song cùng 1 đơn: 1 fulfilled, 1 INVALID_STATUS_TRANSITION và kho chỉ cộng đúng 1 lần", async () => {
      const inventoryRepository = createInMemoryInventoryRepository({
        p011: 5,
      });
      const stockService = createOrderService({
        repository,
        inventoryRepository,
        storageLock: new StorageLock(),
        now: () => FIXED_DATE,
      });

      const expectOneWinner = (
        results: PromiseSettledResult<unknown>[],
      ): void => {
        expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
        const rejected = results.filter(
          (r): r is PromiseRejectedResult => r.status === "rejected",
        );
        expect(rejected).toHaveLength(1);
        expect(rejected[0].reason).toBeInstanceOf(OrderError);
        expect((rejected[0].reason as OrderError).code).toBe(
          "INVALID_STATUS_TRANSITION",
        );
      };

      // (1) cancelOrder song song trên đơn pending
      const pendingOrder = await stockService.placeOrder(
        validInput({ items: [{ productId: "p011", quantity: 2 }] }),
      );
      expect(await inventoryRepository.getStock("p011")).toBe(3);

      expectOneWinner(
        await Promise.allSettled([
          stockService.cancelOrder(pendingOrder.id),
          stockService.cancelOrder(pendingOrder.id),
        ]),
      );
      expect(await inventoryRepository.getStock("p011")).toBe(5);

      // (2) restockCancelledOrder song song trên đơn hủy từ shipping
      const shippingOrder = await stockService.placeOrder(
        validInput({ items: [{ productId: "p011", quantity: 2 }] }),
      );
      await stockService.transitionOrderStatus(shippingOrder.id, {
        status: "confirmed",
        actor: "staff",
      });
      await stockService.transitionOrderStatus(shippingOrder.id, {
        status: "shipping",
        actor: "staff",
      });
      await stockService.transitionOrderStatus(shippingOrder.id, {
        status: "cancelled",
        actor: "staff",
        note: "Khách từ chối nhận",
      });
      expect(await inventoryRepository.getStock("p011")).toBe(3);

      expectOneWinner(
        await Promise.allSettled([
          stockService.restockCancelledOrder(shippingOrder.id),
          stockService.restockCancelledOrder(shippingOrder.id),
        ]),
      );
      expect(await inventoryRepository.getStock("p011")).toBe(5);
    });
  });

  describe("listAdminOrders", () => {
    async function seedAdminOrdersFixture() {
      const inventoryRepository = createInMemoryInventoryRepository({
        p006: 12,
        p010: 5,
        p011: 3,
      });
      let currentMs = FIXED_DATE.getTime();
      let seq = 0;
      const ids = [
        "SL-20261021-AAAA01",
        "SL-20261021-BBBB02",
        "SL-20261021-CCCC03",
        "SL-20261021-DDDD04",
        "SL-20261021-EEEE05",
        "SL-20261021-FFFF06",
      ];
      const adminService = createOrderService({
        repository,
        inventoryRepository,
        storageLock: new StorageLock(),
        now: () => new Date(currentMs),
        generateId: () => ids[seq++] ?? `SL-EXTRA-${seq}`,
      });

      // 1. pending (cũ nhất: t + 0)
      const pendingOld = await adminService.placeOrder(
        validInput({
          customer: {
            fullName: "Nguyễn Văn Minh",
            phone: "0911222333",
            address: "10 Lê Lợi, Quận 1",
          },
          items: [{ productId: "p010", quantity: 1 }],
        }),
      );

      // 2. confirmed (t + 60s)
      currentMs += 60_000;
      const confirmedOrder = await adminService.placeOrder(
        validInput({
          customer: {
            fullName: "Đặng Quốc Minh",
            phone: "0922333444",
            address: "20 Nguyễn Huệ, Quận 1",
          },
          items: [{ productId: "p006", quantity: 2 }],
        }),
      );
      await adminService.transitionOrderStatus(confirmedOrder.id, {
        status: "confirmed",
        actor: "staff",
      });

      // 3. shipping (t + 120s)
      currentMs += 60_000;
      const shippingOrder = await adminService.placeOrder(
        validInput({
          customer: {
            fullName: "Trần Thị Hương",
            phone: "0933444555",
            address: "30 Hai Bà Trưng, Quận 3",
          },
          items: [{ productId: "p011", quantity: 1 }],
        }),
      );
      await adminService.transitionOrderStatus(shippingOrder.id, {
        status: "confirmed",
        actor: "staff",
      });
      await adminService.transitionOrderStatus(shippingOrder.id, {
        status: "shipping",
        actor: "staff",
      });

      // 4. delivered (t + 180s)
      currentMs += 60_000;
      const deliveredOrder = await adminService.placeOrder(
        validInput({
          customer: {
            fullName: "Lê Hoàng Nam",
            phone: "0944555666",
            address: "40 Điện Biên Phủ, Bình Thạnh",
          },
          items: [{ productId: "p010", quantity: 1 }],
        }),
      );
      await adminService.transitionOrderStatus(deliveredOrder.id, {
        status: "confirmed",
        actor: "staff",
      });
      await adminService.transitionOrderStatus(deliveredOrder.id, {
        status: "shipping",
        actor: "staff",
      });
      await adminService.transitionOrderStatus(deliveredOrder.id, {
        status: "delivered",
        actor: "staff",
      });

      // 5. cancelled (t + 240s)
      currentMs += 60_000;
      const cancelledOrder = await adminService.placeOrder(
        validInput({
          customer: {
            fullName: "Phạm Minh Châu",
            phone: "0955666777",
            address: "50 Cách Mạng Tháng 8, Quận 10",
          },
          items: [{ productId: "p010", quantity: 1 }],
        }),
      );
      await adminService.cancelOrder(cancelledOrder.id);

      // 6. pending mới hơn (t + 300s)
      currentMs += 60_000;
      const pendingNew = await adminService.placeOrder(
        validInput({
          customer: {
            fullName: "Võ Thành Đạt",
            phone: "0966777888",
            address: "60 Võ Văn Tần, Quận 3",
          },
          items: [{ productId: "p006", quantity: 1 }],
        }),
      );

      return {
        adminService,
        inventoryRepository,
        orders: {
          pendingOld,
          confirmedOrder,
          shippingOrder,
          deliveredOrder,
          cancelledOrder,
          pendingNew,
        },
      };
    }

    it("trả về toàn bộ đơn mới nhất trước, counts đủ 6 khóa và snapshot availableStockByProductId khi không truyền filter", async () => {
      const { adminService, orders } = await seedAdminOrdersFixture();

      const result = await adminService.listAdminOrders();

      expect(result.orders.map((o) => o.id)).toEqual([
        orders.pendingNew.id,
        orders.cancelledOrder.id,
        orders.deliveredOrder.id,
        orders.shippingOrder.id,
        orders.confirmedOrder.id,
        orders.pendingOld.id,
      ]);
      expect(result.counts).toEqual({
        all: 6,
        pending: 2,
        confirmed: 1,
        shipping: 1,
        delivered: 1,
        cancelled: 1,
      });
      // p006: 12 - 2 - 1 = 9; p010: 5 - 1 - 1 - 1 + 1 (cancelled) = 3; p011: 3 - 1 = 2
      expect(result.availableStockByProductId).toMatchObject({
        p006: 9,
        p010: 3,
        p011: 2,
      });
    });

    it("sắp xếp tab pending theo FIFO (createdAt tăng dần, tie-break theo id), còn các tab khác theo createdAt giảm dần", async () => {
      const { adminService, orders } = await seedAdminOrdersFixture();

      // Thêm 1 đơn pending cùng timestamp với pendingOld để kiểm tra tie-break theo id
      const tieOrder = {
        ...orders.pendingOld,
        id: "SL-20261021-AAAA00",
      };
      await repository.save(tieOrder);

      const pendingResult = await adminService.listAdminOrders({
        status: "pending",
      });
      expect(pendingResult.orders.map((o) => o.id)).toEqual([
        "SL-20261021-AAAA00",
        orders.pendingOld.id,
        orders.pendingNew.id,
      ]);
      expect(pendingResult.counts).toEqual({
        all: 7,
        pending: 3,
        confirmed: 1,
        shipping: 1,
        delivered: 1,
        cancelled: 1,
      });

      const allResult = await adminService.listAdminOrders({ status: "all" });
      expect(allResult.orders.map((o) => o.id)).toEqual([
        orders.pendingNew.id,
        orders.cancelledOrder.id,
        orders.deliveredOrder.id,
        orders.shippingOrder.id,
        orders.confirmedOrder.id,
        "SL-20261021-AAAA00",
        orders.pendingOld.id,
      ]);
    });

    it("tìm kiếm q không phân biệt hoa thường và dấu trên id, phone, fullName; tính counts trên tập khớp q trước khi lọc status", async () => {
      const { adminService, orders } = await seedAdminOrdersFixture();

      // Tìm theo tên không dấu "minh" -> khớp 3 đơn (pendingOld, confirmedOrder, cancelledOrder)
      const byNameAndPending = await adminService.listAdminOrders({
        status: "pending",
        q: "  MÌNH  ",
      });
      expect(byNameAndPending.orders.map((o) => o.id)).toEqual([
        orders.pendingOld.id,
      ]);
      expect(byNameAndPending.counts).toEqual({
        all: 3,
        pending: 1,
        confirmed: 1,
        shipping: 0,
        delivered: 0,
        cancelled: 1,
      });

      // Tìm theo chữ "đặng quốc" không dấu "dang quoc"
      const byDiacriticName = await adminService.listAdminOrders({
        q: "dang quoc",
      });
      expect(byDiacriticName.orders.map((o) => o.id)).toEqual([
        orders.confirmedOrder.id,
      ]);

      // Tìm theo SĐT
      const byPhone = await adminService.listAdminOrders({
        q: "0933444",
      });
      expect(byPhone.orders.map((o) => o.id)).toEqual([
        orders.shippingOrder.id,
      ]);

      // Tìm theo mã đơn chữ thường
      const byId = await adminService.listAdminOrders({
        q: "dddd04",
      });
      expect(byId.orders.map((o) => o.id)).toEqual([orders.deliveredOrder.id]);
    });

    it("fallback status không hợp lệ (rỗng, all, bogus) về all", async () => {
      const { adminService, orders } = await seedAdminOrdersFixture();
      const expectedIds = [
        orders.pendingNew.id,
        orders.cancelledOrder.id,
        orders.deliveredOrder.id,
        orders.shippingOrder.id,
        orders.confirmedOrder.id,
        orders.pendingOld.id,
      ];

      for (const invalidStatus of [undefined, "", "all", "bogus", "UNKNOWN"]) {
        const res = await adminService.listAdminOrders({
          status: invalidStatus,
        });
        expect(res.orders.map((o) => o.id)).toEqual(expectedIds);
        expect(res.counts.all).toBe(6);
      }
    });

    it("chuẩn hóa status có khoảng trắng hoặc chữ hoa và sắp xếp giảm dần theo createdAt cho các tab confirmed, shipping, delivered, cancelled", async () => {
      const { adminService, orders } = await seedAdminOrdersFixture();

      // Thêm 1 đơn thứ 2 cho mỗi tab non-pending với timestamp mới hơn (+600s) để kiểm chứng sắp xếp giảm dần
      const laterIso = new Date(FIXED_DATE.getTime() + 600_000).toISOString();
      const extraByStatus = [
        {
          ...orders.confirmedOrder,
          id: "SL-20261021-CONF02",
          status: "confirmed" as const,
          createdAt: laterIso,
        },
        {
          ...orders.shippingOrder,
          id: "SL-20261021-SHIP02",
          status: "shipping" as const,
          createdAt: laterIso,
        },
        {
          ...orders.deliveredOrder,
          id: "SL-20261021-DELV02",
          status: "delivered" as const,
          createdAt: laterIso,
        },
        {
          ...orders.cancelledOrder,
          id: "SL-20261021-CANC02",
          status: "cancelled" as const,
          createdAt: laterIso,
        },
      ];
      for (const extra of extraByStatus) {
        await repository.save(extra);
      }

      const pendingUpper = await adminService.listAdminOrders({
        status: "  PENDING  ",
      });
      expect(pendingUpper.orders.map((o) => o.id)).toEqual([
        orders.pendingOld.id,
        orders.pendingNew.id,
      ]);

      const confirmedRes = await adminService.listAdminOrders({
        status: " CONFIRMED ",
      });
      expect(confirmedRes.orders.map((o) => o.id)).toEqual([
        "SL-20261021-CONF02",
        orders.confirmedOrder.id,
      ]);

      const shippingRes = await adminService.listAdminOrders({
        status: "shipping",
      });
      expect(shippingRes.orders.map((o) => o.id)).toEqual([
        "SL-20261021-SHIP02",
        orders.shippingOrder.id,
      ]);

      const deliveredRes = await adminService.listAdminOrders({
        status: "delivered",
      });
      expect(deliveredRes.orders.map((o) => o.id)).toEqual([
        "SL-20261021-DELV02",
        orders.deliveredOrder.id,
      ]);

      const cancelledRes = await adminService.listAdminOrders({
        status: "cancelled",
      });
      expect(cancelledRes.orders.map((o) => o.id)).toEqual([
        "SL-20261021-CANC02",
        orders.cancelledOrder.id,
      ]);
    });

    it("hỗ trợ tìm SĐT có khoảng trắng/dấu gạch/+84, ký tự zero-width, trả mảng rỗng khi q không khớp hoặc kho đơn trống và chịu lỗi dữ liệu bẩn", async () => {
      // 1. Repository trống
      const emptyRes = await service.listAdminOrders();
      expect(emptyRes.orders).toEqual([]);
      expect(emptyRes.counts).toEqual({
        all: 0,
        pending: 0,
        confirmed: 0,
        shipping: 0,
        delivered: 0,
        cancelled: 0,
      });

      const { adminService, orders } = await seedAdminOrdersFixture();

      // Lưu thêm 1 đơn có SĐT dạng +84912345678 và 1 bản ghi dữ liệu cũ bất thường
      const plus84Order = {
        ...orders.pendingOld,
        id: "SL-20261021-PLUS84",
        customer: {
          ...orders.pendingOld.customer,
          fullName: "Hoàng Văn Phúc",
          phone: "+84912345678",
        },
      };
      await repository.save(plus84Order);

      // 2. Tìm "0912 345 678" khớp với đơn lưu "+84912345678" và ngược lại "+84 933-444-555" khớp với "0933444555"
      const bySpacedDomesticPhone = await adminService.listAdminOrders({
        q: "0912 345 678",
      });
      expect(bySpacedDomesticPhone.orders.map((o) => o.id)).toEqual([
        "SL-20261021-PLUS84",
      ]);

      const byFormattedIntlPhone = await adminService.listAdminOrders({
        q: "+84 (933) 444-555",
      });
      expect(byFormattedIntlPhone.orders.map((o) => o.id)).toEqual([
        orders.shippingOrder.id,
      ]);

      // 3. Ký tự zero-width trong q được loại bỏ trước khi so khớp
      const byZeroWidthQuery = await adminService.listAdminOrders({
        q: "Đặng\u200B Quốc\uFEFF Minh",
      });
      expect(byZeroWidthQuery.orders.map((o) => o.id)).toEqual([
        orders.confirmedOrder.id,
      ]);

      // 4. q không khớp đơn nào -> orders rỗng, toàn bộ counts = 0
      const zeroMatch = await adminService.listAdminOrders({
        status: "pending",
        q: "khong-ton-tai-999999",
      });
      expect(zeroMatch.orders).toEqual([]);
      expect(zeroMatch.counts).toEqual({
        all: 0,
        pending: 0,
        confirmed: 0,
        shipping: 0,
        delivered: 0,
        cancelled: 0,
      });

      // 5. Chịu lỗi bản ghi có status lạ hoặc createdAt không phải ngày hợp lệ mà không làm hỏng counts/sort
      const malformedOrder = {
        ...orders.pendingOld,
        id: "SL-20261021-MALFORMED",
        status: "archived" as unknown as typeof orders.pendingOld.status,
        createdAt: "not-a-valid-date",
      };
      await repository.save(malformedOrder);

      const resilientRes = await adminService.listAdminOrders();
      expect(resilientRes.counts.all).toBe(8);
      expect(resilientRes.orders).toHaveLength(8);
    });
  });
});

describe("generateOrderId", () => {
  it("có dạng SL-YYYYMMDD-XXXXXX", () => {
    expect(generateOrderId(FIXED_DATE)).toMatch(/^SL-20261021-[0-9A-F]{6}$/);
  });
});
