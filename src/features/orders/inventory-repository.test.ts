// @vitest-environment node
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { products } from "@/data/products";
import { StorageLock } from "@/lib/storage-lock";
import {
  createInMemoryInventoryRepository,
  createJsonFileInventoryRepository,
} from "./inventory-repository";
import { OrderError } from "./order-errors";

describe("InventoryRepository", () => {
  let dir: string;
  let file: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "shoplite-inventory-"));
    file = path.join(dir, "nested", "inventory.json");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  describe("createJsonFileInventoryRepository", () => {
    it("tự seed từ src/data/products.ts khi file chưa tồn tại và không trả undefined", async () => {
      const repo = createJsonFileInventoryRepository(file, new StorageLock());

      const stockMap = await repo.getStockMap();
      for (const product of products) {
        expect(stockMap[product.id]).toBe(product.stock);
        expect(await repo.getStock(product.id)).toBe(product.stock);
      }
      expect(await repo.getStock("unknown-product")).toBe(0);

      const persisted = JSON.parse(await readFile(file, "utf8")) as Record<
        string,
        number
      >;
      expect(persisted.p011).toBe(3);
      expect(persisted.p004).toBe(0);
    });

    it("fallback từ products.ts cho các key còn thiếu trong inventory.json hiện có", async () => {
      const partialFile = path.join(dir, "partial-inventory.json");
      await writeFile(partialFile, JSON.stringify({ p011: 1 }), "utf8");

      const repo = createJsonFileInventoryRepository(partialFile);
      expect(await repo.getStock("p011")).toBe(1);
      expect(await repo.getStock("p010")).toBe(200);
      expect(await repo.getStock("p004")).toBe(0);
    });

    it("trừ kho all-or-nothing: món thứ 2 thiếu thì món thứ 1 không bị trừ và không ghi số âm", async () => {
      const repo = createJsonFileInventoryRepository(file);
      const initialP006 = await repo.getStock("p006");
      const initialP011 = await repo.getStock("p011");

      const error = await repo
        .deduct([
          { productId: "p006", quantity: 2 },
          { productId: "p011", quantity: initialP011 + 1 },
        ])
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(OrderError);
      expect((error as OrderError).code).toBe("INSUFFICIENT_STOCK");
      expect(await repo.getStock("p006")).toBe(initialP006);
      expect(await repo.getStock("p011")).toBe(initialP011);
    });

    it("gộp các dòng trùng productId trước khi trừ để không vượt quá tồn kho", async () => {
      const repo = createJsonFileInventoryRepository(file);
      // p011 có stock = 3
      const error = await repo
        .deduct([
          { productId: "p011", quantity: 2 },
          { productId: "p011", quantity: 2 },
        ])
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(OrderError);
      expect((error as OrderError).code).toBe("INSUFFICIENT_STOCK");
      expect(await repo.getStock("p011")).toBe(3);
    });

    it("tuần tự hóa các lần trừ kho song song qua StorageLock và ghi nguyên tử bằng file tạm UUID", async () => {
      const partialFile = path.join(dir, "concurrent-inventory.json");
      await writeFile(partialFile, JSON.stringify({ p011: 1 }), "utf8");
      const lock = new StorageLock();
      const repo = createJsonFileInventoryRepository(partialFile, lock);

      const results = await Promise.allSettled(
        Array.from({ length: 5 }, () =>
          repo.deduct([{ productId: "p011", quantity: 1 }]),
        ),
      );

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(4);
      for (const failure of rejected) {
        expect((failure as PromiseRejectedResult).reason).toBeInstanceOf(
          OrderError,
        );
        expect(
          ((failure as PromiseRejectedResult).reason as OrderError).code,
        ).toBe("INSUFFICIENT_STOCK");
      }

      expect(await repo.getStock("p011")).toBe(0);
      const parsed = JSON.parse(await readFile(partialFile, "utf8")) as Record<
        string,
        number
      >;
      expect(parsed.p011).toBe(0);

      const files = await readdir(dir);
      expect(files.some((name) => name.endsWith(".tmp"))).toBe(false);
    });

    it("hoàn kho cộng dồn chính xác và không lưu số âm", async () => {
      const repo = createJsonFileInventoryRepository(file);
      await repo.deduct([{ productId: "p011", quantity: 3 }]);
      expect(await repo.getStock("p011")).toBe(0);

      await repo.restock([{ productId: "p011", quantity: 2 }]);
      expect(await repo.getStock("p011")).toBe(2);
    });
  });

  describe("validation số lượng điều chỉnh", () => {
    const invalidItems = [
      { productId: "", quantity: 1 },
      { productId: "p011", quantity: 0 },
      { productId: "p011", quantity: -1 },
      { productId: "p011", quantity: 1.5 },
    ];

    it("deduct và restock từ chối đầu vào không hợp lệ bằng VALIDATION_ERROR và không đổi tồn kho", async () => {
      const repo = createJsonFileInventoryRepository(file);
      const before = await repo.getStockMap();

      for (const item of invalidItems) {
        for (const action of ["deduct", "restock"] as const) {
          const error = await repo[action]([item]).catch((e: unknown) => e);
          expect(error).toBeInstanceOf(OrderError);
          expect((error as OrderError).code).toBe("VALIDATION_ERROR");
        }
      }

      expect(await repo.getStockMap()).toEqual(before);
      expect(await repo.getStock("p011")).toBe(3);
    });
  });

  describe("createInMemoryInventoryRepository", () => {
    it("seed từ products.ts và cho phép ghi đè từng key trong seed", async () => {
      const repo = createInMemoryInventoryRepository({ p011: 1 });
      expect(await repo.getStock("p011")).toBe(1);
      expect(await repo.getStock("p010")).toBe(200);
      expect(await repo.getStock("missing")).toBe(0);

      await repo.deduct([{ productId: "p011", quantity: 1 }]);
      expect(await repo.getStock("p011")).toBe(0);

      await repo.restock([{ productId: "p011", quantity: 1 }]);
      expect(await repo.getStock("p011")).toBe(1);
    });

    it("trả về bản sao getStockMap() để tránh bị sửa từ bên ngoài", async () => {
      const repo = createInMemoryInventoryRepository({ p011: 2 });
      const snapshot = await repo.getStockMap();
      snapshot.p011 = 999;
      expect(await repo.getStock("p011")).toBe(2);
    });
  });
});
