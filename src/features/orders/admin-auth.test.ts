// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_TTL_SECONDS,
  assertAdminRequest,
  createAdminLogoutCookieHeader,
  createAdminSessionCookieHeader,
  createAdminSessionToken,
  extractAdminSessionToken,
  isAdminConfigured,
  verifyAdminPasscode,
  verifyAdminSessionToken,
} from "./admin-auth";
import { OrderError } from "./order-errors";

const env = process.env as Record<string, string | undefined>;

describe("admin-auth", () => {
  let savedAdminPasscode: string | undefined;
  let savedNodeEnv: string | undefined;

  beforeEach(() => {
    savedAdminPasscode = env.ADMIN_PASSCODE;
    savedNodeEnv = env.NODE_ENV;
    delete env.ADMIN_PASSCODE;
  });

  afterEach(() => {
    if (savedAdminPasscode === undefined) {
      delete env.ADMIN_PASSCODE;
    } else {
      env.ADMIN_PASSCODE = savedAdminPasscode;
    }
    if (savedNodeEnv === undefined) {
      delete env.NODE_ENV;
    } else {
      env.NODE_ENV = savedNodeEnv;
    }
  });

  describe("isAdminConfigured", () => {
    it("trả về false khi thiếu hoặc chỉ có khoảng trắng", () => {
      expect(isAdminConfigured()).toBe(false);
      env.ADMIN_PASSCODE = "";
      expect(isAdminConfigured()).toBe(false);
      env.ADMIN_PASSCODE = "   \t\n ";
      expect(isAdminConfigured()).toBe(false);
    });

    it("trả về true khi ADMIN_PASSCODE có giá trị khác rỗng", () => {
      env.ADMIN_PASSCODE = "  secret-pass  ";
      expect(isAdminConfigured()).toBe(true);
    });
  });

  describe("verifyAdminPasscode", () => {
    it("ném OrderError 503 ADMIN_NOT_CONFIGURED khi chưa cấu hình", () => {
      try {
        verifyAdminPasscode("any");
        expect.fail("Phải ném OrderError");
      } catch (error) {
        expect(error).toBeInstanceOf(OrderError);
        expect((error as OrderError).code).toBe("ADMIN_NOT_CONFIGURED");
        expect((error as OrderError).httpStatus).toBe(503);
      }
    });

    it("ném OrderError 401 UNAUTHORIZED khi sai mật khẩu (khác hoặc cùng độ dài byte) và không ném RangeError", () => {
      env.ADMIN_PASSCODE = "alpha-123";

      for (const candidate of [
        "wrong",
        "alpha-123 ",
        "ALPHA-123",
        "alpha-124",
        "",
      ]) {
        try {
          verifyAdminPasscode(candidate);
          expect.fail(`Phải từ chối "${candidate}"`);
        } catch (error) {
          expect(error).toBeInstanceOf(OrderError);
          const orderError = error as OrderError;
          expect(orderError.code).toBe("UNAUTHORIZED");
          expect(orderError.httpStatus).toBe(401);
          expect(orderError.message).not.toContain("alpha-123");
        }
      }
    });

    it("chấp nhận mật khẩu khớp với ADMIN_PASSCODE đã trim", () => {
      env.ADMIN_PASSCODE = "  secret-pass  ";
      expect(() => verifyAdminPasscode("secret-pass")).not.toThrow();
    });
  });

  describe("createAdminSessionToken & verifyAdminSessionToken", () => {
    it("ném 503 khi tạo token lúc chưa cấu hình ADMIN_PASSCODE", () => {
      expect(() => createAdminSessionToken(1_000_000)).toThrowError(OrderError);
      try {
        createAdminSessionToken(1_000_000);
      } catch (error) {
        expect((error as OrderError).code).toBe("ADMIN_NOT_CONFIGURED");
      }
    });

    it("trả về unconfigured khi thiếu ADMIN_PASSCODE dù có hay không có token", () => {
      expect(verifyAdminSessionToken(undefined)).toBe("unconfigured");
      expect(verifyAdminSessionToken("12345.abcdef")).toBe("unconfigured");
    });

    it("trả về missing khi token rỗng hoặc không tồn tại", () => {
      env.ADMIN_PASSCODE = "secret-pass";
      expect(verifyAdminSessionToken(undefined)).toBe("missing");
      expect(verifyAdminSessionToken("")).toBe("missing");
      expect(verifyAdminSessionToken("   ")).toBe("missing");
    });

    it("trả về valid trong thời hạn 8 giờ và expired khi nowMs > exp", () => {
      env.ADMIN_PASSCODE = "  secret-pass  ";
      const issuedAt = 1_700_000_000_000;
      const expectedExp = issuedAt + ADMIN_SESSION_TTL_SECONDS * 1000;
      const token = createAdminSessionToken(issuedAt);

      expect(token).toMatch(/^\d+\.[0-9a-f]{64}$/);
      expect(token.startsWith(`${expectedExp}.`)).toBe(true);

      expect(verifyAdminSessionToken(token, issuedAt)).toBe("valid");
      expect(verifyAdminSessionToken(token, expectedExp)).toBe("valid");
      expect(verifyAdminSessionToken(token, expectedExp + 1)).toBe("expired");
    });

    it("trả về expired khi sai chữ ký, đổi secret, hoặc sai định dạng (không ném RangeError)", () => {
      env.ADMIN_PASSCODE = "secret-pass";
      const now = 1_700_000_000_000;
      const token = createAdminSessionToken(now);
      const [exp, sig] = token.split(".");
      const tamperedLastChar = sig.endsWith("a")
        ? `${sig.slice(0, -1)}b`
        : `${sig.slice(0, -1)}a`;

      expect(verifyAdminSessionToken(`${exp}.${tamperedLastChar}`, now)).toBe(
        "expired",
      );
      expect(verifyAdminSessionToken(`${exp}.short`, now)).toBe("expired");
      expect(verifyAdminSessionToken(`${exp}.${"a".repeat(63)}`, now)).toBe(
        "expired",
      );
      expect(verifyAdminSessionToken(`${exp}.${"a".repeat(65)}`, now)).toBe(
        "expired",
      );
      expect(verifyAdminSessionToken(`${exp}.${"g".repeat(64)}`, now)).toBe(
        "expired",
      );
      expect(verifyAdminSessionToken("invalid-token", now)).toBe("expired");
      expect(verifyAdminSessionToken("123.456.789", now)).toBe("expired");
      expect(verifyAdminSessionToken("abc.deadbeef", now)).toBe("expired");
      expect(verifyAdminSessionToken("-100.deadbeef", now)).toBe("expired");
      expect(verifyAdminSessionToken(`${exp}.`, now)).toBe("expired");
      expect(
        verifyAdminSessionToken(`9007199254740992.${"a".repeat(64)}`, now),
      ).toBe("expired");

      const upperHexToken = `${exp}.${sig.toUpperCase()}`;
      expect(verifyAdminSessionToken(upperHexToken, now)).toBe("expired");

      env.ADMIN_PASSCODE = "rotated-pass";
      expect(verifyAdminSessionToken(token, now)).toBe("expired");
    });

    it("xử lý an toàn nowMs = NaN / Infinity / âm / vượt MAX_SAFE_INTEGER", () => {
      env.ADMIN_PASSCODE = "secret-pass";
      const validToken = createAdminSessionToken(1_700_000_000_000);

      for (const badNow of [
        Number.NaN,
        Number.POSITIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
        -1,
        -30_000_000,
        Number.MAX_SAFE_INTEGER,
      ]) {
        expect(() => createAdminSessionToken(badNow)).toThrowError(OrderError);
        try {
          createAdminSessionToken(badNow);
        } catch (error) {
          expect((error as OrderError).code).toBe("VALIDATION_ERROR");
          expect((error as OrderError).httpStatus).toBe(400);
        }
      }

      expect(verifyAdminSessionToken(validToken, Number.NaN)).toBe("expired");
      expect(
        verifyAdminSessionToken(validToken, Number.POSITIVE_INFINITY),
      ).toBe("expired");
      expect(
        verifyAdminSessionToken(validToken, Number.NEGATIVE_INFINITY),
      ).toBe("expired");
      expect(verifyAdminSessionToken(validToken, -1)).toBe("expired");
    });
  });

  describe("extractAdminSessionToken", () => {
    it("bỏ qua cặp rỗng đứng trước, hỗ trợ dấu ngoặc kép RFC 6265, URL-encoded và không ném URIError", () => {
      expect(
        extractAdminSessionToken(
          `${ADMIN_COOKIE_NAME}=; ${ADMIN_COOKIE_NAME}=123.abc`,
        ),
      ).toBe("123.abc");
      expect(
        extractAdminSessionToken(
          `${ADMIN_COOKIE_NAME}=""; ${ADMIN_COOKIE_NAME}="123.abc"`,
        ),
      ).toBe("123.abc");
      expect(
        extractAdminSessionToken(
          `${ADMIN_COOKIE_NAME}=${encodeURIComponent("123.abc")}`,
        ),
      ).toBe("123.abc");
      expect(extractAdminSessionToken(`${ADMIN_COOKIE_NAME}=%E0%A4%A`)).toBe(
        "%E0%A4%A",
      );
      expect(extractAdminSessionToken(`${ADMIN_COOKIE_NAME}=`)).toBeUndefined();
    });
  });

  describe("assertAdminRequest", () => {
    it("ưu tiên 503 trước 401 khi thiếu hoặc rỗng ADMIN_PASSCODE dù có cookie", () => {
      env.ADMIN_PASSCODE = "secret-pass";
      const validToken = createAdminSessionToken();

      for (const envValue of [undefined, "", "   "]) {
        if (envValue === undefined) {
          delete env.ADMIN_PASSCODE;
        } else {
          env.ADMIN_PASSCODE = envValue;
        }
        const req = new Request("http://localhost/api/admin/orders", {
          headers: { cookie: `${ADMIN_COOKIE_NAME}=${validToken}` },
        });
        try {
          assertAdminRequest(req);
          expect.fail("Phải ném OrderError 503");
        } catch (error) {
          expect(error).toBeInstanceOf(OrderError);
          expect((error as OrderError).code).toBe("ADMIN_NOT_CONFIGURED");
          expect((error as OrderError).httpStatus).toBe(503);
        }
      }
    });

    it("ném 401 khi thiếu cookie hoặc cookie giả mạo/hết hạn", () => {
      env.ADMIN_PASSCODE = "secret-pass";
      const expiredToken = createAdminSessionToken(Date.now() - 30_000_000);
      const validToken = createAdminSessionToken();
      const [exp, sig] = validToken.split(".");
      const forgedToken = `${exp}.${sig.endsWith("0") ? `${sig.slice(0, -1)}1` : `${sig.slice(0, -1)}0`}`;

      for (const cookieHeader of [
        undefined,
        "other=1",
        `${ADMIN_COOKIE_NAME}=`,
        `${ADMIN_COOKIE_NAME}=tampered`,
        `${ADMIN_COOKIE_NAME}=${expiredToken}`,
        `${ADMIN_COOKIE_NAME}=${forgedToken}`,
      ]) {
        const req = new Request("http://localhost/api/admin/orders", {
          headers: cookieHeader ? { cookie: cookieHeader } : undefined,
        });
        try {
          assertAdminRequest(req);
          expect.fail("Phải ném OrderError 401");
        } catch (error) {
          expect(error).toBeInstanceOf(OrderError);
          expect((error as OrderError).code).toBe("UNAUTHORIZED");
          expect((error as OrderError).httpStatus).toBe(401);
        }
      }
    });

    it("cho phép request có cookie hợp lệ đi qua", () => {
      env.ADMIN_PASSCODE = "secret-pass";
      const token = createAdminSessionToken();
      const req = new Request("http://localhost/api/admin/orders", {
        headers: {
          cookie: `theme=light; ${ADMIN_COOKIE_NAME}=${token}; lang=vi`,
        },
      });
      expect(() => assertAdminRequest(req)).not.toThrow();
    });
  });

  describe("Set-Cookie helpers", () => {
    it("tạo cookie session đúng thuộc tính và thêm Secure ở production", () => {
      env.NODE_ENV = "test";
      expect(createAdminSessionCookieHeader("123.abc")).toBe(
        `${ADMIN_COOKIE_NAME}=123.abc; HttpOnly; SameSite=Lax; Path=/; Max-Age=${ADMIN_SESSION_TTL_SECONDS}`,
      );

      env.NODE_ENV = "production";
      expect(createAdminSessionCookieHeader("123.abc")).toBe(
        `${ADMIN_COOKIE_NAME}=123.abc; HttpOnly; SameSite=Lax; Path=/; Max-Age=${ADMIN_SESSION_TTL_SECONDS}; Secure`,
      );
    });

    it("tạo cookie đăng xuất Max-Age=0 và thêm Secure ở production", () => {
      env.NODE_ENV = "test";
      expect(createAdminLogoutCookieHeader()).toBe(
        `${ADMIN_COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`,
      );

      env.NODE_ENV = "production";
      expect(createAdminLogoutCookieHeader()).toBe(
        `${ADMIN_COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0; Secure`,
      );
    });

    it("chặn ký tự ;, \\r, \\n trong giá trị cookie", () => {
      for (const badValue of [
        "123.abc; Admin=1",
        "123.abc\r\nX-Test: 1",
        "123\nabc",
      ]) {
        expect(() => createAdminSessionCookieHeader(badValue)).toThrowError(
          OrderError,
        );
        try {
          createAdminSessionCookieHeader(badValue);
        } catch (error) {
          expect((error as OrderError).code).toBe("VALIDATION_ERROR");
          expect((error as OrderError).httpStatus).toBe(400);
        }
      }
    });
  });
});
