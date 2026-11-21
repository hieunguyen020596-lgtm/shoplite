import type { InventoryRepository } from "@/features/orders/inventory-repository";
import { inventoryRepository as defaultInventoryRepository } from "@/features/orders/server";
import {
  getAllProducts,
  getFeaturedProducts,
  getProductById,
  getProductBySlug,
  getRelatedProducts,
  PAGE_SIZE,
  queryProducts,
} from "./catalog-service";
import type { CatalogQuery, CatalogResult, Product } from "./types";

/**
 * Lớp phủ tồn kho động (AD-7): kết hợp dữ liệu catalog tĩnh (`catalog-service.ts`, đồng bộ thuần)
 * với tồn kho khả dụng thực tế từ `InventoryRepository.getStockMap()`.
 *
 * - Không bao giờ đột biến mảng `products` gốc: mỗi sản phẩm trả về là một bản sao nông.
 * - Mọi hàm nhận `inventoryRepo` tùy chọn để unit test không phải đụng `storage/inventory.json` thật.
 * - Chỉ dùng từ code chạy trên server (Server Component, Route Handler).
 */
export type StockSource = Pick<InventoryRepository, "getStockMap">;

function withStock(
  product: Product,
  stockMap: Record<string, number>,
): Product {
  const raw =
    typeof stockMap[product.id] === "number"
      ? stockMap[product.id]
      : product.stock;
  const stock = Number.isFinite(raw) ? Math.max(0, Math.trunc(raw)) : 0;
  return {
    ...product,
    stock,
  };
}

function overlay(
  source: readonly Product[],
  stockMap: Record<string, number>,
): Product[] {
  return source.map((product) => withStock(product, stockMap));
}

export async function getAllProductsWithStock(
  inventoryRepo: StockSource = defaultInventoryRepository,
): Promise<Product[]> {
  const stockMap = await inventoryRepo.getStockMap();
  return overlay(getAllProducts(), stockMap);
}

export async function getFeaturedProductsWithStock(
  limit = 4,
  inventoryRepo: StockSource = defaultInventoryRepository,
): Promise<Product[]> {
  if (!Number.isFinite(limit) || limit <= 0) return [];
  const stockMap = await inventoryRepo.getStockMap();
  return overlay(getFeaturedProducts(limit), stockMap);
}

/** Lọc/sắp xếp/phân trang trên tồn kho thực tế (lọc `inStock` và `total` theo stock động). */
export async function queryProductsWithStock(
  query: CatalogQuery,
  inventoryRepo: StockSource = defaultInventoryRepository,
  pageSize = PAGE_SIZE,
): Promise<CatalogResult> {
  const safePageSize =
    Number.isInteger(pageSize) && pageSize > 0 ? pageSize : PAGE_SIZE;
  const stockMap = await inventoryRepo.getStockMap();
  return queryProducts(
    query,
    overlay(getAllProducts(), stockMap),
    safePageSize,
  );
}

export async function getProductBySlugWithStock(
  slug: string,
  inventoryRepo: StockSource = defaultInventoryRepository,
): Promise<Product | undefined> {
  const product = getProductBySlug(slug);
  if (!product) return undefined;
  const stockMap = await inventoryRepo.getStockMap();
  return withStock(product, stockMap);
}

export async function getProductByIdWithStock(
  id: string,
  inventoryRepo: StockSource = defaultInventoryRepository,
): Promise<Product | undefined> {
  const product = getProductById(id);
  if (!product) return undefined;
  const stockMap = await inventoryRepo.getStockMap();
  return withStock(product, stockMap);
}

export async function getRelatedProductsWithStock(
  product: Product,
  limit = 4,
  inventoryRepo: StockSource = defaultInventoryRepository,
): Promise<Product[]> {
  if (!Number.isFinite(limit) || limit <= 0) return [];
  const stockMap = await inventoryRepo.getStockMap();
  return overlay(getRelatedProducts(product, limit), stockMap);
}

export async function getProductDetailWithStock(
  slug: string,
  relatedLimit = 4,
  inventoryRepo: StockSource = defaultInventoryRepository,
): Promise<{ product: Product; related: Product[] } | undefined> {
  const product = getProductBySlug(slug);
  if (!product) return undefined;
  const stockMap = await inventoryRepo.getStockMap();
  return {
    product: withStock(product, stockMap),
    related:
      relatedLimit > 0 && Number.isFinite(relatedLimit)
        ? overlay(getRelatedProducts(product, relatedLimit), stockMap)
        : [],
  };
}
