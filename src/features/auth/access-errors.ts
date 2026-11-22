export type AccessErrorCode = "UNAUTHENTICATED" | "FORBIDDEN" | "TOO_MANY_ATTEMPTS";

const HTTP_STATUS_BY_CODE: Record<AccessErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  TOO_MANY_ATTEMPTS: 429,
};

/** Lỗi truy cập - cùng shape với OrderError để handleRouteError xử lý chung. */
export class AccessError extends Error {
  readonly code: AccessErrorCode;
  readonly details?: Record<string, string>;

  constructor(code: AccessErrorCode, message: string, details?: Record<string, string>) {
    super(message);
    this.name = "AccessError";
    this.code = code;
    this.details = details;
  }

  get httpStatus(): number {
    return HTTP_STATUS_BY_CODE[this.code];
  }
}
