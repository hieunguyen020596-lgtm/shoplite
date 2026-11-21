// @vitest-environment node
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { writeJsonFileAtomic } from "@/lib/atomic-json";
import { StorageLock } from "@/lib/storage-lock";
import { createJsonFileOrderRepository } from "./order-repository";
import type { Order } from "./types";

const sampleOrder = (id: string): Order => ({
  id,
  status: "pending",
  createdAt: "2026-10-21T03:00:00.000Z",
  updatedAt: "2026-10-21T03:00:00.000Z",
  customer: {
    fullName: "Lê Văn C",
    phone: "0901234567",
    address: "1 Trần Phú, Hà Đông, Hà Nội",
  },
  shippingMethod: "standard",
  paymentMethod: "cod",
  items: [],
  subtotal: 0,
  shippingFee: 0,
  total: 0,
});

describe("createJsonFileOrderRepository", () => {
  let dir: string;
  let file: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "shoplite-orders-"));
    file = path.join(dir, "nested", "orders.json");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("trả về danh sách rỗng khi file chưa tồn tại", async () => {
    const repository = createJsonFileOrderRepository(file);
    expect(await repository.findAll()).toEqual([]);
    expect(await repository.findById("SL-1")).toBeNull();
  });

  it("tạo thư mục, ghi file và đọc lại được", async () => {
    const repository = createJsonFileOrderRepository(file);
    await repository.save(sampleOrder("SL-1"));

    const raw = JSON.parse(await readFile(file, "utf8"));
    expect(raw).toHaveLength(1);
    expect(await repository.findById("SL-1")).toMatchObject({ id: "SL-1" });
  });

  it("cập nhật đơn hàng đã tồn tại thay vì thêm bản sao", async () => {
    const repository = createJsonFileOrderRepository(file);
    await repository.save(sampleOrder("SL-1"));
    await repository.save({ ...sampleOrder("SL-1"), status: "cancelled" });

    const orders = await repository.findAll();
    expect(orders).toHaveLength(1);
    expect(orders[0].status).toBe("cancelled");
  });

  it("tuần tự hóa các lệnh ghi đồng thời không làm mất đơn hoặc hỏng JSON", async () => {
    const lock = new StorageLock();
    const repository = createJsonFileOrderRepository(file, lock);

    await Promise.all(
      Array.from({ length: 10 }, (_, index) =>
        repository.save(sampleOrder(`SL-CONCURRENT-${index + 1}`)),
      ),
    );

    const orders = await repository.findAll();
    expect(orders).toHaveLength(10);
    expect(new Set(orders.map((order) => order.id)).size).toBe(10);

    const files = await readdir(path.dirname(file));
    expect(files.some((name) => name.endsWith(".tmp"))).toBe(false);
  });

  it("giữ nguyên các trường thừa của đơn lịch sử (discount, couponCode) khi đọc và ghi đơn khác", async () => {
    await mkdir(path.dirname(file), { recursive: true });
    const legacyOrder = {
      ...sampleOrder("SL-LEGACY-1"),
      discount: 50_000,
      couponCode: "VIP50",
    };
    await writeFile(file, JSON.stringify([legacyOrder], null, 2), "utf8");

    const repository = createJsonFileOrderRepository(file);
    await repository.save(sampleOrder("SL-NEW-2"));

    const persisted = JSON.parse(await readFile(file, "utf8")) as Array<
      Record<string, unknown>
    >;
    expect(persisted).toHaveLength(2);
    expect(persisted[0]).toMatchObject({
      id: "SL-LEGACY-1",
      discount: 50_000,
      couponCode: "VIP50",
    });
  });

  it("dọn sạch file tạm UUID khi bước đổi tên (rename) thất bại", async () => {
    const dirAsTarget = path.join(dir, "conflict-target");
    await mkdir(dirAsTarget, { recursive: true });

    await expect(writeJsonFileAtomic(dirAsTarget, [])).rejects.toThrow();

    const files = await readdir(dir);
    expect(files.some((name) => name.endsWith(".tmp"))).toBe(false);
  });
});
