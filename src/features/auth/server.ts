import { createAuthService } from "./auth-service";
import { createAttemptLimiter } from "./attempt-limiter";
import { parseStaffAccounts } from "./staff-accounts";

/**
 * Instance dùng chung của AuthService. Chỉ import từ code chạy trên server.
 *
 * Đọc SESSION_SECRET và STAFF_ACCOUNTS; thiếu hoặc hỏng thì ghi log tên biến
 * (không in giá trị) và từ chối mọi lần đăng nhập. Chỉ hỗ trợ một instance (AD-14).
 */
function buildAuthService() {
  const secret = process.env.SESSION_SECRET ?? "";
  const parsed = parseStaffAccounts(process.env.STAFF_ACCOUNTS);

  if (!secret) console.error("[auth] Thiếu biến môi trường SESSION_SECRET");
  if (!parsed.accounts) console.error(`[auth] STAFF_ACCOUNTS không dùng được: ${parsed.reason}`);

  if (!secret || !parsed.accounts) return createAuthService({ accounts: [], secret: "" });
  return createAuthService({ accounts: parsed.accounts, secret });
}

export const authService = buildAuthService();

/** Bộ đếm lần xác minh sai dùng chung (trong bộ nhớ, AD-9). */
export const attemptLimiter = createAttemptLimiter();
