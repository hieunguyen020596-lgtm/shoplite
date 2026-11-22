import { NextResponse } from "next/server";
import { getProductBySlugWithStock } from "@/features/catalog/catalog-inventory";
import { handleRouteError, jsonError } from "@/lib/http";

/** GET /api/products/:slug */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/products/[slug]">,
) {
  try {
    const { slug } = await ctx.params;
    const product = await getProductBySlugWithStock(slug);
    if (!product) {
      const notFoundResponse = jsonError(
        404,
        "PRODUCT_NOT_FOUND",
        `Không tìm thấy sản phẩm "${slug}"`,
      );
      notFoundResponse.headers.set("Cache-Control", "no-store");
      return notFoundResponse;
    }
    const response = NextResponse.json(product);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    const response = handleRouteError(error);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
}
