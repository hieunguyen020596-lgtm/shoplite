// @vitest-environment node
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { products } from "@/data/products";
import {
  createInMemoryInventoryRepository,
  createJsonFileInventoryRepository,
} from "@/features/orders/inventory-repository";
import {
  getAllProductsWithStock,
  getFeaturedProductsWithStock,
  getProductByIdWithStock,
  getProductBySlugWithStock,
  getProductDetailWithStock,
  getRelatedProductsWithStock,
  queryProductsWithStock,
  type StockSource,
} from "./catalog-inventory";
import {
  DEFAULT_CATALOG_QUERY,
  getProductById,
  PAGE_SIZE,
} from "./catalog-service";

describe("catalog-inventory (lớp phủ tồn kho động)", () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs
        .splice(0)
        .map((dir) => rm(dir, { recursive: true, force: true })),
    );
  });

  it("phủ tồn kho từ inventory.json lên 6 hàm *WithStock khi giảm về 0 và hoàn kho lại mà không đột biến products gốc", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "shoplite-catalog-inv-"));
    tempDirs.push(dir);
    const inventoryFile = path.join(dir, "inventory.json");
    const repo = createJsonFileInventoryRepository(inventoryFile);

    const staticP011Stock = products.find((p) => p.id === "p011")!.stock;
    const staticP003Stock = products.find((p) => p.id === "p003")!.stock;
    expect(staticP011Stock).toBe(3);

    // Giảm p011 từ 3 -> 0 và p003 (featured, cùng danh mục am-thanh với p001) từ 8 -> 0
    await repo.deduct([
      { productId: "p011", quantity: 3 },
      { productId: "p003", quantity: staticP003Stock },
    ]);

    const allAfterDeduct = await getAllProductsWithStock(repo);
    expect(allAfterDeduct.find((p) => p.id === "p011")?.stock).toBe(0);
    expect((await getProductByIdWithStock("p011", repo))?.stock).toBe(0);
    expect(
      (await getProductBySlugWithStock("gia-do-laptop-nhom", repo))?.stock,
    ).toBe(0);

    const featuredAfterDeduct = await getFeaturedProductsWithStock(4, repo);
    expect(featuredAfterDeduct.find((p) => p.id === "p003")?.stock).toBe(0);

    const p001 = getProductById("p001")!;
    const relatedAfterDeduct = await getRelatedProductsWithStock(p001, 4, repo);
    expect(relatedAfterDeduct.find((p) => p.id === "p003")?.stock).toBe(0);

    // Dữ liệu gốc trong src/data/products.ts tuyệt đối không bị đột biến
    expect(getProductById("p011")?.stock).toBe(3);
    expect(getProductById("p003")?.stock).toBe(staticP003Stock);

    // Hoàn kho p011: 0 -> 2, p003: 0 -> 5
    await repo.restock([
      { productId: "p011", quantity: 2 },
      { productId: "p003", quantity: 5 },
    ]);

    const allAfterRestock = await getAllProductsWithStock(repo);
    expect(allAfterRestock.find((p) => p.id === "p011")?.stock).toBe(2);
    expect((await getProductByIdWithStock("p011", repo))?.stock).toBe(2);
    expect(
      (await getProductBySlugWithStock("gia-do-laptop-nhom", repo))?.stock,
    ).toBe(2);
    expect(
      (await getFeaturedProductsWithStock(4, repo)).find((p) => p.id === "p003")
        ?.stock,
    ).toBe(5);
    expect(
      (await getRelatedProductsWithStock(p001, 4, repo)).find(
        (p) => p.id === "p003",
      )?.stock,
    ).toBe(5);
    expect(getProductById("p011")?.stock).toBe(3);
  });

  it("lọc inStock=true và tính total trong queryProductsWithStock theo tồn kho thực tế", async () => {
    const repo = createInMemoryInventoryRepository();
    const initial = await queryProductsWithStock(
      { ...DEFAULT_CATALOG_QUERY, inStock: true },
      repo,
      100,
    );
    expect(initial.items.some((p) => p.id === "p006")).toBe(true);

    // Đưa p006 về hết hàng (stock: 60 -> 0)
    await repo.deduct([{ productId: "p006", quantity: 60 }]);

    const outOfStockResult = await queryProductsWithStock(
      { ...DEFAULT_CATALOG_QUERY, inStock: true },
      repo,
      100,
    );
    expect(outOfStockResult.items.some((p) => p.id === "p006")).toBe(false);
    expect(outOfStockResult.total).toBe(initial.total - 1);

    // Khi restock lại > 0 thì p006 xuất hiện trở lại
    await repo.restock([{ productId: "p006", quantity: 4 }]);

    const restockedResult = await queryProductsWithStock(
      { ...DEFAULT_CATALOG_QUERY, inStock: true },
      repo,
      100,
    );
    const p006 = restockedResult.items.find((p) => p.id === "p006");
    expect(p006?.stock).toBe(4);
    expect(restockedResult.total).toBe(initial.total);
  });

  it("trả về undefined khi slug hoặc id không tồn tại", async () => {
    const repo = createInMemoryInventoryRepository();
    expect(
      await getProductBySlugWithStock("khong-ton-tai", repo),
    ).toBeUndefined();
    expect(await getProductByIdWithStock("p999", repo)).toBeUndefined();
  });

  it("getProductDetailWithStock chỉ đọc getStockMap() đúng 1 lần cho cả product và related, hoặc trả về undefined nếu slug không tồn tại", async () => {
    const getStockMap = vi.fn(async () => ({
      p001: 2,
      p003: 0,
    }));
    const spySource: StockSource = { getStockMap };

    const missing = await getProductDetailWithStock(
      "khong-ton-tai",
      4,
      spySource,
    );
    expect(missing).toBeUndefined();
    expect(getStockMap).not.toHaveBeenCalled();

    const detail = await getProductDetailWithStock(
      "tai-nghe-khong-day-soundmax-pro",
      4,
      spySource,
    );
    expect(getStockMap).toHaveBeenCalledTimes(1);
    expect(detail?.product.id).toBe("p001");
    expect(detail?.product.stock).toBe(2);
    expect(detail?.related.find((p) => p.id === "p003")?.stock).toBe(0);
  });

  it("chuẩn hóa giá trị tồn kho bất thường (-5 -> 0, 3.9 -> 3, NaN -> 0) và fallback sang product.stock khi thiếu key trong stockMap", async () => {
    const customSource: StockSource = {
      getStockMap: async () => ({
        p001: -5,
        p002: 3.9,
        p003: Number.NaN,
      }),
    };

    const all = await getAllProductsWithStock(customSource);
    expect(all.find((p) => p.id === "p001")?.stock).toBe(0);
    expect(all.find((p) => p.id === "p002")?.stock).toBe(3);
    expect(all.find((p) => p.id === "p003")?.stock).toBe(0);
    expect(all.find((p) => p.id === "p011")?.stock).toBe(
      getProductById("p011")?.stock,
    );
  });

  it("chặn sớm limit <= 0 và chuẩn hóa pageSize <= 0 về PAGE_SIZE mặc định", async () => {
    const getStockMap = vi.fn(async () => ({}));
    const spySource: StockSource = { getStockMap };
    const p001 = getProductById("p001")!;

    expect(await getFeaturedProductsWithStock(0, spySource)).toEqual([]);
    expect(await getFeaturedProductsWithStock(-2, spySource)).toEqual([]);
    expect(await getRelatedProductsWithStock(p001, 0, spySource)).toEqual([]);
    expect(await getRelatedProductsWithStock(p001, -3, spySource)).toEqual([]);
    expect(getStockMap).not.toHaveBeenCalled();

    const repo = createInMemoryInventoryRepository();
    const resZeroPage = await queryProductsWithStock(
      DEFAULT_CATALOG_QUERY,
      repo,
      0,
    );
    const resNegativePage = await queryProductsWithStock(
      DEFAULT_CATALOG_QUERY,
      repo,
      -5,
    );
    expect(resZeroPage.pageSize).toBe(PAGE_SIZE);
    expect(resZeroPage.items.length).toBeLessThanOrEqual(PAGE_SIZE);
    expect(resNegativePage.pageSize).toBe(PAGE_SIZE);
  });
});
