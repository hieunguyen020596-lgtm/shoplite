import { NextResponse } from "next/server";
import { getStockedProductBySlug } from "@/features/catalog/server";
import { handleRouteError, jsonError } from "@/lib/http";

export const dynamic = "force-dynamic";

/** GET /api/products/:slug */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/products/[slug]">,
) {
  const { slug } = await ctx.params;
  try {
    const product = await getStockedProductBySlug(slug);
    if (!product) {
      return jsonError(
        404,
        "PRODUCT_NOT_FOUND",
        `Không tìm thấy sản phẩm "${slug}"`,
      );
    }
    return NextResponse.json(product);
  } catch (error) {
    return handleRouteError(error);
  }
}
