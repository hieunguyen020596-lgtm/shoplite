// @vitest-environment node
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OrderError as OrderErrorType } from "./order-errors";

const validInput = (productId: string, quantity: number) => ({
  customer: {
    fullName: "Trần Thị B",
    phone: "0987654321",
    email: "",
    address: "45 Lê Lợi, Hải Châu, Đà Nẵng",
  },
  shippingMethod: "standard",
  paymentMethod: "cod",
  items: [{ productId, quantity }],
});

describe("orders/server (singleton thật dùng ORDERS_FILE & INVENTORY_FILE)", () => {
  const originalOrdersFile = process.env.ORDERS_FILE;
  const originalInventoryFile = process.env.INVENTORY_FILE;
  let dir: string;
  let ordersFile: string;
  let inventoryFile: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "shoplite-server-"));
    ordersFile = path.join(dir, "orders.json");
    inventoryFile = path.join(dir, "inventory.json");
    process.env.ORDERS_FILE = ordersFile;
    process.env.INVENTORY_FILE = inventoryFile;
    vi.resetModules();
  });

  afterEach(async () => {
    if (originalOrdersFile === undefined) {
      delete process.env.ORDERS_FILE;
    } else {
      process.env.ORDERS_FILE = originalOrdersFile;
    }
    if (originalInventoryFile === undefined) {
      delete process.env.INVENTORY_FILE;
    } else {
      process.env.INVENTORY_FILE = originalInventoryFile;
    }
    vi.resetModules();
    await rm(dir, { recursive: true, force: true });
  });

  it("placeOrder p011 (stock 3 -> 2) ghi cả orders.json và inventory.json", async () => {
    const { orderService } = await import("./server");

    const order = await orderService.placeOrder(validInput("p011", 1));

    const persistedOrders = JSON.parse(
      await readFile(ordersFile, "utf8"),
    ) as Array<{ id: string }>;
    const persistedInventory = JSON.parse(
      await readFile(inventoryFile, "utf8"),
    ) as Record<string, number>;

    expect(persistedOrders).toHaveLength(1);
    expect(persistedOrders[0].id).toBe(order.id);
    expect(persistedInventory.p011).toBe(2);
  });

  it("5 placeOrder song song trên p011 (tồn kho = 1): 1 thành công, 4 INSUFFICIENT_STOCK, kho cuối = 0", async () => {
    await writeFile(inventoryFile, JSON.stringify({ p011: 1 }), "utf8");
    const { orderService } = await import("./server");
    // vi.resetModules() tạo lại module graph nên phải import OrderError từ cùng graph với ./server
    const { OrderError } = await import("./order-errors");

    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        orderService.placeOrder(validInput("p011", 1)),
      ),
    );

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.filter(
      (r): r is PromiseRejectedResult => r.status === "rejected",
    );
    expect(rejected).toHaveLength(4);
    for (const failure of rejected) {
      expect(failure.reason).toBeInstanceOf(OrderError);
      expect((failure.reason as OrderErrorType).code).toBe(
        "INSUFFICIENT_STOCK",
      );
    }

    const persistedOrders = JSON.parse(
      await readFile(ordersFile, "utf8"),
    ) as unknown[];
    const persistedInventory = JSON.parse(
      await readFile(inventoryFile, "utf8"),
    ) as Record<string, number>;
    expect(persistedOrders).toHaveLength(1);
    expect(persistedInventory.p011).toBe(0);
  });
});
