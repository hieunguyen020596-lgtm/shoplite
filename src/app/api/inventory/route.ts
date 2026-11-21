import { NextResponse, type NextRequest } from "next/server";
import { readStock } from "@/features/inventory/server";
import { handleRouteError, jsonError } from "@/lib/http";

export const dynamic = "force-dynamic";

const MAX_IDS = 50;
const MAX_ID_LENGTH = 64;

/** GET /api/inventory?ids=a,b -> { stock: { a: 3, b: 0 } } */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("ids") ?? "";
  const parts = raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const ids = [...new Set(parts)];
  if (
    parts.length === 0 ||
    parts.length > MAX_IDS ||
    ids.some(
      (id) => id.length > MAX_ID_LENGTH || id.includes(String.fromCharCode(0)),
    )
  ) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      `ids phải có từ 1 đến ${MAX_IDS} mã sản phẩm, mỗi mã tối đa ${MAX_ID_LENGTH} ký tự`,
    );
  }
  try {
    const stock = await readStock(ids);
    return NextResponse.json(
      { stock },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
