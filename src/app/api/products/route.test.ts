// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InventoryRepository } from "@/features/orders/inventory-repository";
import type { CatalogResult, Product } from "@/features/catalog/types";

const testState = vi.hoisted(() => ({
  inventoryRepository: undefined as unknown as InventoryRepository,
}));

vi.mock("@/features/orders/server", async () => {
  const { createInMemoryInventoryRepository } =
    await import("@/features/orders/inventory-repository");
  testState.inventoryRepository = createInMemoryInventoryRepository({
    p011: 0,
  });
  const proxyRepo: InventoryRepository = {
    getStockMap: () => testState.inventoryRepository.getStockMap(),
    getStock: (productId) => testState.inventoryRepository.getStock(productId),
    deduct: (items) => testState.inventoryRepository.deduct(items),
    restock: (items) => testState.inventoryRepository.restock(items),
  };
  return { inventoryRepository: proxyRepo };
});

import { GET as getProducts } from "./route";
import { GET as getProductBySlug } from "./[slug]/route";

describe("GET /api/products & GET /api/products/[slug]", () => {
  beforeEach(async () => {
    const { createInMemoryInventoryRepository } =
      await import("@/features/orders/inventory-repository");
    testState.inventoryRepository = createInMemoryInventoryRepository({
      p011: 0,
    });
  });

  it("trả về tồn kho động mới nhất (0 rồi 5) và lọc inStock=1 đúng theo inventoryRepository", async () => {
    // p011 đang có stock động = 0
    const resZero = await getProducts(
      new NextRequest("http://localhost/api/products?q=gia%20do%20laptop"),
    );
    expect(resZero.status).toBe(200);
    expect(resZero.headers.get("cache-control")).toBe("no-store");
    const bodyZero = (await resZero.json()) as CatalogResult;
    expect(bodyZero.items.find((p) => p.id === "p011")?.stock).toBe(0);

    const resInStockExcluded = await getProducts(
      new NextRequest(
        "http://localhost/api/products?q=gia%20do%20laptop&inStock=1",
      ),
    );
    expect(resInStockExcluded.status).toBe(200);
    expect(resInStockExcluded.headers.get("cache-control")).toBe("no-store");
    const bodyExcluded = (await resInStockExcluded.json()) as CatalogResult;
    expect(bodyExcluded.total).toBe(0);
    expect(bodyExcluded.items).toHaveLength(0);

    const slugResZero = await getProductBySlug(
      new Request("http://localhost/api/products/gia-do-laptop-nhom"),
      { params: Promise.resolve({ slug: "gia-do-laptop-nhom" }) },
    );
    expect(slugResZero.status).toBe(200);
    expect(slugResZero.headers.get("cache-control")).toBe("no-store");
    expect(((await slugResZero.json()) as Product).stock).toBe(0);

    // Hoàn kho p011 lên 5
    await testState.inventoryRepository.restock([
      { productId: "p011", quantity: 5 },
    ]);

    const resFive = await getProducts(
      new NextRequest(
        "http://localhost/api/products?q=gia%20do%20laptop&inStock=1",
      ),
    );
    expect(resFive.status).toBe(200);
    const bodyFive = (await resFive.json()) as CatalogResult;
    expect(bodyFive.total).toBe(1);
    expect(bodyFive.items[0].stock).toBe(5);

    const slugResFive = await getProductBySlug(
      new Request("http://localhost/api/products/gia-do-laptop-nhom"),
      { params: Promise.resolve({ slug: "gia-do-laptop-nhom" }) },
    );
    expect(slugResFive.status).toBe(200);
    expect(((await slugResFive.json()) as Product).stock).toBe(5);
  });

  it("trả về 404 PRODUCT_NOT_FOUND khi slug không tồn tại", async () => {
    const response = await getProductBySlug(
      new Request("http://localhost/api/products/khong-ton-tai"),
      { params: Promise.resolve({ slug: "khong-ton-tai" }) },
    );
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe("PRODUCT_NOT_FOUND");
  });

  it("ưu tiên giá trị đầu tiên khi URL có tham số truy vấn trùng lặp", async () => {
    const categoryRes = await getProducts(
      new NextRequest(
        "http://localhost/api/products?category=ban-phim-chuot&category=am-thanh",
      ),
    );
    expect(categoryRes.status).toBe(200);
    const categoryBody = (await categoryRes.json()) as CatalogResult;
    expect(categoryBody.items.length).toBeGreaterThan(0);
    expect(
      categoryBody.items.every((p) => p.categorySlug === "ban-phim-chuot"),
    ).toBe(true);

    const queryRes = await getProducts(
      new NextRequest("http://localhost/api/products?q=KeyPro&q=SwiftClick"),
    );
    expect(queryRes.status).toBe(200);
    const queryBody = (await queryRes.json()) as CatalogResult;
    expect(queryBody.items.some((p) => p.id === "p005")).toBe(true);
    expect(queryBody.items.some((p) => p.id === "p006")).toBe(false);
  });

  it("trả về 500 INTERNAL_ERROR khi inventoryRepository.getStockMap() gặp lỗi", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    testState.inventoryRepository = {
      ...testState.inventoryRepository,
      getStockMap: async () => {
        throw new Error("disk failure");
      },
    };

    try {
      const listRes = await getProducts(
        new NextRequest("http://localhost/api/products"),
      );
      expect(listRes.status).toBe(500);
      expect(
        ((await listRes.json()) as { error: { code: string } }).error.code,
      ).toBe("INTERNAL_ERROR");

      const detailRes = await getProductBySlug(
        new Request("http://localhost/api/products/gia-do-laptop-nhom"),
        { params: Promise.resolve({ slug: "gia-do-laptop-nhom" }) },
      );
      expect(detailRes.status).toBe(500);
      expect(
        ((await detailRes.json()) as { error: { code: string } }).error.code,
      ).toBe("INTERNAL_ERROR");
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});
