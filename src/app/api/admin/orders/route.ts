import { NextResponse, type NextRequest } from "next/server";
import { assertAdminRequest } from "@/features/orders/admin-auth";
import { orderService } from "@/features/orders/server";
import { handleRouteError } from "@/lib/http";

export const dynamic = "force-dynamic";

/** GET /api/admin/orders?status=&q= */
export async function GET(request: NextRequest) {
  try {
    assertAdminRequest(request);

    const searchParams =
      request.nextUrl?.searchParams ??
      new URL(request.url, "http://localhost").searchParams;
    const status = searchParams.get("status") ?? undefined;
    const q = searchParams.get("q") ?? undefined;

    return NextResponse.json(
      await orderService.listAdminOrders({ status, q }),
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    const res = handleRouteError(error);
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
}
