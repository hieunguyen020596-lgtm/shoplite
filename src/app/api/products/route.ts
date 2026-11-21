import { NextResponse, type NextRequest } from "next/server";
import { queryProductsWithStock } from "@/features/catalog/catalog-inventory";
import { parseCatalogQuery } from "@/features/catalog/catalog-service";
import { handleRouteError } from "@/lib/http";

/** GET /api/products?q=&category=&minPrice=&maxPrice=&inStock=1&sort=&page= */
export async function GET(request: NextRequest) {
  try {
    const rawParams: Record<string, string[]> = {};
    for (const key of new Set(request.nextUrl.searchParams.keys())) {
      rawParams[key] = request.nextUrl.searchParams.getAll(key);
    }
    const query = parseCatalogQuery(rawParams);
    return NextResponse.json(await queryProductsWithStock(query));
  } catch (error) {
    return handleRouteError(error);
  }
}
