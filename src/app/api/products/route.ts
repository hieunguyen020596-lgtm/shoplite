import { NextResponse, type NextRequest } from "next/server";
import { parseCatalogQuery } from "@/features/catalog/catalog-service";
import { queryStockedProducts } from "@/features/catalog/server";
import { handleRouteError } from "@/lib/http";

export const dynamic = "force-dynamic";

/** GET /api/products?q=&category=&minPrice=&maxPrice=&inStock=1&sort=&page= */
export async function GET(request: NextRequest) {
  const query = parseCatalogQuery(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  try {
    return NextResponse.json(await queryStockedProducts(query));
  } catch (error) {
    return handleRouteError(error);
  }
}
