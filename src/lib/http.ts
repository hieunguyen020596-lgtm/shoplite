import { NextResponse } from "next/server";
import { logServerError } from "@/lib/safe-log";
import {
  OrderError,
  type OrderErrorDetails,
} from "@/features/orders/order-errors";

export interface ApiErrorBody {
  error: { code: string; message: string; details?: OrderErrorDetails };
}

/** Hết `lock_timeout`, `statement_timeout` hoặc `idle_in_transaction_session_timeout`. */
const DB_TIMEOUT_STATES = new Set(["55P03", "57014", "25P03"]);

function isDbTimeout(error: unknown): boolean {
  const { name, sqlState } = (error ?? {}) as {
    name?: unknown;
    sqlState?: unknown;
  };
  return (
    name === "DbFailure" &&
    typeof sqlState === "string" &&
    DB_TIMEOUT_STATES.has(sqlState)
  );
}

export function jsonError(
  status: number,
  code: string,
  message: string,
  details?: OrderErrorDetails,
): NextResponse<ApiErrorBody> {
  return NextResponse.json({ error: { code, message, details } }, { status });
}

/** Chuyển lỗi thành response chuẩn { error: { code, message, details? } }. */
export function handleRouteError(error: unknown): NextResponse<ApiErrorBody> {
  if (error instanceof OrderError) {
    return jsonError(
      error.httpStatus,
      error.code,
      error.message,
      error.details,
    );
  }
  logServerError("route", error);
  if (isDbTimeout(error)) {
    return jsonError(
      503,
      "SERVICE_UNAVAILABLE",
      "Hệ thống đang bận, vui lòng thử lại sau ít phút",
    );
  }
  return jsonError(
    500,
    "INTERNAL_ERROR",
    "Đã có lỗi xảy ra, vui lòng thử lại sau",
  );
}

/** Đọc JSON body; trả về undefined nếu body không phải JSON hợp lệ. */
export async function readJsonBody(
  request: Request,
): Promise<unknown | undefined> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
