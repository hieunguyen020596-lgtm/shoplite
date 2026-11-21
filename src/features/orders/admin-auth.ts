import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { OrderError } from "./order-errors";

export const ADMIN_COOKIE_NAME = "shoplite_admin";
export const ADMIN_SESSION_TTL_SECONDS = 28_800;

export type AdminSessionTokenStatus =
  "valid" | "expired" | "missing" | "unconfigured";

function getConfiguredPasscode(): string | undefined {
  const raw = process.env.ADMIN_PASSCODE?.trim();
  return raw && raw.length > 0 ? raw : undefined;
}

function sha256Digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

function timingSafeEqualStrings(a: string, b: string): boolean {
  // Băm SHA-256 hai vế thành đúng 32 byte để timingSafeEqual không bao giờ ném RangeError.
  return timingSafeEqual(sha256Digest(a), sha256Digest(b));
}

function signExpiry(expiresAtEpochMs: string, passcode: string): string {
  return createHmac("sha256", passcode)
    .update(`${ADMIN_COOKIE_NAME}:${expiresAtEpochMs}`, "utf8")
    .digest("hex");
}

function requireConfiguredPasscode(): string {
  const passcode = getConfiguredPasscode();
  if (!passcode) {
    throw new OrderError(
      "ADMIN_NOT_CONFIGURED",
      "Hệ thống chưa cấu hình mật khẩu quản trị",
    );
  }
  return passcode;
}

function buildAdminCookieHeader(value: string, maxAgeSeconds: number): string {
  if (/[;\r\n]/.test(value)) {
    throw new OrderError(
      "VALIDATION_ERROR",
      "Giá trị cookie quản trị không hợp lệ",
    );
  }

  const parts = [
    `${ADMIN_COOKIE_NAME}=${value}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (process.env.NODE_ENV === "production") {
    parts.push("Secure");
  }
  return parts.join("; ");
}

/** Kiểm tra biến môi trường ADMIN_PASSCODE đã được cấu hình hợp lệ hay chưa. */
export function isAdminConfigured(): boolean {
  return getConfiguredPasscode() !== undefined;
}

/** Xác thực mật khẩu quản trị theo chế độ fail-closed (503 trước, 401 sau). */
export function verifyAdminPasscode(inputPasscode: string): void {
  const configured = requireConfiguredPasscode();
  if (!timingSafeEqualStrings(inputPasscode, configured)) {
    throw new OrderError("UNAUTHORIZED", "Mật khẩu quản trị không đúng");
  }
}

/** Tạo token phiên quản trị dạng `<expiresAtEpochMs>.<hmacSha256Hex>` có hạn 8 giờ. */
export function createAdminSessionToken(nowMs = Date.now()): string {
  const configured = requireConfiguredPasscode();
  if (!Number.isFinite(nowMs) || nowMs < 0) {
    throw new OrderError(
      "VALIDATION_ERROR",
      "Thời gian tạo phiên quản trị không hợp lệ",
    );
  }
  const expiresAtNumber = Math.trunc(nowMs) + ADMIN_SESSION_TTL_SECONDS * 1000;
  if (!Number.isSafeInteger(expiresAtNumber)) {
    throw new OrderError(
      "VALIDATION_ERROR",
      "Thời gian tạo phiên quản trị không hợp lệ",
    );
  }
  const expiresAtEpochMs = String(expiresAtNumber);
  const signatureHex = signExpiry(expiresAtEpochMs, configured);
  return `${expiresAtEpochMs}.${signatureHex}`;
}

/** Kiểm tra trạng thái token phiên quản trị mà không ném lỗi. */
export function verifyAdminSessionToken(
  token: string | undefined,
  nowMs = Date.now(),
): AdminSessionTokenStatus {
  const configured = getConfiguredPasscode();
  if (!configured) {
    return "unconfigured";
  }

  if (!token || token.trim() === "") {
    return "missing";
  }

  if (!Number.isFinite(nowMs) || nowMs < 0) {
    return "expired";
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return "expired";
  }

  const [expiresAtStr, signatureHex] = parts;
  if (!/^\d+$/.test(expiresAtStr) || !/^[0-9a-f]{64}$/.test(signatureHex)) {
    return "expired";
  }

  const expiresAtEpochMs = Number(expiresAtStr);
  if (!Number.isSafeInteger(expiresAtEpochMs)) {
    return "expired";
  }

  const expectedSignatureHex = signExpiry(expiresAtStr, configured);
  if (!timingSafeEqualStrings(signatureHex, expectedSignatureHex)) {
    return "expired";
  }

  if (nowMs > expiresAtEpochMs) {
    return "expired";
  }

  return "valid";
}

/** Trích xuất giá trị cookie `shoplite_admin` từ header `Cookie` của Request. */
export function extractAdminSessionToken(
  cookieHeader: string | null,
): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }

  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) {
      continue;
    }
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) {
      continue;
    }
    const name = trimmed.slice(0, eqIndex).trim();
    if (name !== ADMIN_COOKIE_NAME) {
      continue;
    }
    let rawValue = trimmed.slice(eqIndex + 1).trim();
    if (
      rawValue.length >= 2 &&
      rawValue.startsWith('"') &&
      rawValue.endsWith('"')
    ) {
      rawValue = rawValue.slice(1, -1);
    }
    if (!rawValue) {
      continue;
    }
    try {
      const decoded = decodeURIComponent(rawValue);
      if (!decoded.trim()) {
        continue;
      }
      return decoded;
    } catch {
      return rawValue;
    }
  }

  return undefined;
}

/** Bảo vệ các Route Handler `/api/admin/*` theo thứ tự fail-closed: 503 trước, 401 sau. */
export function assertAdminRequest(request: Request): void {
  const token = extractAdminSessionToken(request.headers.get("cookie"));
  const status = verifyAdminSessionToken(token);

  if (status === "unconfigured") {
    throw new OrderError(
      "ADMIN_NOT_CONFIGURED",
      "Hệ thống chưa cấu hình mật khẩu quản trị",
    );
  }

  if (status === "missing") {
    throw new OrderError(
      "UNAUTHORIZED",
      "Vui lòng đăng nhập quản trị để tiếp tục",
    );
  }

  if (status === "expired") {
    throw new OrderError(
      "UNAUTHORIZED",
      "Phiên đăng nhập quản trị đã hết hạn hoặc không hợp lệ",
    );
  }
}

/** Tạo giá trị header `Set-Cookie` cấp phiên quản trị 8 giờ. */
export function createAdminSessionCookieHeader(token: string): string {
  return buildAdminCookieHeader(token, ADMIN_SESSION_TTL_SECONDS);
}

/** Tạo giá trị header `Set-Cookie` xóa phiên quản trị (`Max-Age=0`). */
export function createAdminLogoutCookieHeader(): string {
  return buildAdminCookieHeader("", 0);
}
