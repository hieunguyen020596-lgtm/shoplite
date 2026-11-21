import "server-only";
import { readStock } from "@/features/inventory/server";
import {
  attachStock,
  getAllProducts,
  getFeaturedProducts,
  getProductBySlug,
  getRelatedProducts,
  queryProducts,
} from "./catalog-service";
import type {
  CatalogQuery,
  CatalogResult,
  Product,
  StockedProduct,
} from "./types";

async function stocked(items: Product[]): Promise<StockedProduct[]> {
  const stock = await readStock(items.map((item) => item.id));
  return attachStock(items, stock);
}

export async function queryStockedProducts(
  query: CatalogQuery,
): Promise<CatalogResult> {
  return queryProducts(query, await stocked(getAllProducts()));
}

export async function getStockedProductBySlug(
  slug: string,
): Promise<StockedProduct | undefined> {
  const product = getProductBySlug(slug);
  return product ? (await stocked([product]))[0] : undefined;
}

export async function getStockedFeaturedProducts(
  limit = 4,
): Promise<StockedProduct[]> {
  return stocked(getFeaturedProducts(limit));
}

export async function getStockedRelatedProducts(
  product: Product,
  limit = 4,
): Promise<StockedProduct[]> {
  return stocked(getRelatedProducts(product, limit));
}
