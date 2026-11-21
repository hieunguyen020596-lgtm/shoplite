export type OrderErrorCode =
  | "VALIDATION_ERROR"
  | "PRODUCT_NOT_FOUND"
  | "INSUFFICIENT_STOCK"
  | "ORDER_NOT_FOUND"
  | "INVALID_STATUS_TRANSITION"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "RATE_LIMITED"
  | "LOOKUP_FAILED"
  | "REFUND_OUTCOME_CONFLICT";

const HTTP_STATUS_BY_CODE: Record<OrderErrorCode, number> = {
  VALIDATION_ERROR: 400,
  PRODUCT_NOT_FOUND: 422,
  INSUFFICIENT_STOCK: 409,
  ORDER_NOT_FOUND: 404,
  INVALID_STATUS_TRANSITION: 409,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  RATE_LIMITED: 429,
  LOOKUP_FAILED: 404,
  REFUND_OUTCOME_CONFLICT: 409,
};

/** Dòng thiếu hàng của `INSUFFICIENT_STOCK`. */
export interface OrderLineShortage {
  productId: string;
  requested: number;
  available: number;
}

/** Lỗi theo field (`{ "customer.phone": "..." }`) hoặc `{ lines }` khi thiếu hàng. */
export type OrderErrorDetails = Record<string, string | OrderLineShortage[]>;

/** Lỗi nghiệp vụ của đơn hàng - route handler chuyển thành HTTP response tương ứng. */
export class OrderError extends Error {
  readonly code: OrderErrorCode;
  readonly details?: OrderErrorDetails;

  constructor(
    code: OrderErrorCode,
    message: string,
    details?: OrderErrorDetails,
  ) {
    super(message);
    this.name = "OrderError";
    this.code = code;
    this.details = details;
  }

  get httpStatus(): number {
    return HTTP_STATUS_BY_CODE[this.code];
  }
}
