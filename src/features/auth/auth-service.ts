import { AccessError } from "./access-errors";
import {
  ORDERS_COOKIE_MAX_IDS,
  signOrderIds,
  signSession,
  STAFF_SESSION_SECONDS,
  verifyOrderIds,
  verifySession,
} from "./session";
import {
  hashPassword,
  type StaffAccount,
  verifyPassword,
} from "./staff-accounts";

export const INVALID_CREDENTIALS_MESSAGE =
  "Tên đăng nhập hoặc mật khẩu không đúng";

export interface StaffIdentity {
  username: string;
  displayName: string;
}

export interface AuthServiceDeps {
  accounts: StaffAccount[];
  secret: string;
  now?: () => number;
}

let dummyHash: string | undefined;

export function createAuthService({
  accounts,
  secret,
  now = Date.now,
}: AuthServiceDeps) {
  return {
    /** Trả về { staff, token } hoặc ném AccessError("UNAUTHENTICATED") với cùng thông báo cho mọi lỗi. */
    login(
      username: string,
      password: string,
    ): { staff: StaffIdentity; token: string } {
      const account = accounts.find((a) => a.username === username);
      // Luôn chạy một lần scrypt để thời gian phản hồi không lộ username có tồn tại hay không.
      dummyHash ??= hashPassword("dummy-password");
      const passwordOk = verifyPassword(
        password,
        account?.passwordHash ?? dummyHash,
      );
      if (!account || !passwordOk || !secret) {
        throw new AccessError("UNAUTHENTICATED", INVALID_CREDENTIALS_MESSAGE);
      }
      const token = signSession(
        {
          username: account.username,
          exp: now() + STAFF_SESSION_SECONDS * 1000,
        },
        secret,
      );
      return {
        staff: { username: account.username, displayName: account.displayName },
        token,
      };
    },

    /** Trả về nhân viên của token hợp lệ, hoặc null. */
    readSession(token: string | undefined): StaffIdentity | null {
      if (!token) return null;
      const session = verifySession(token, secret, now());
      if (!session) return null;
      const account = accounts.find((a) => a.username === session.username);
      return account
        ? { username: account.username, displayName: account.displayName }
        : null;
    },

    /** Danh sách Mã đơn đã xác minh trong cookie; cookie thiếu hoặc bị sửa thì trả mảng rỗng. */
    readVerifiedOrders(token: string | undefined): string[] {
      return token ? verifyOrderIds(token, secret) : [];
    },

    /**
     * Thêm Mã đơn vào cookie hiện có, giữ tối đa 20 mã gần nhất.
     * Trả về token mới, hoặc null khi chưa cấu hình SESSION_SECRET (không thể ký).
     */
    addVerifiedOrder(
      token: string | undefined,
      orderId: string,
    ): string | null {
      if (!secret) return null;
      const ids = (token ? verifyOrderIds(token, secret) : []).filter(
        (id) => id !== orderId,
      );
      return signOrderIds(
        [...ids, orderId].slice(-ORDERS_COOKIE_MAX_IDS),
        secret,
      );
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
