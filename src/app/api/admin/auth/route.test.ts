// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ADMIN_COOKIE_NAME,
  assertAdminRequest,
} from "@/features/orders/admin-auth";
import { POST as loginPost } from "./login/route";
import { POST as logoutPost } from "./logout/route";

const env = process.env as Record<string, string | undefined>;

function makeLoginRequest(body: unknown, raw = false): Request {
  return new Request("http://localhost/api/admin/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw ? String(body) : JSON.stringify(body),
  });
}

describe("POST /api/admin/auth/login & /logout", () => {
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

  describe("POST /api/admin/auth/login", () => {
    it("503 ADMIN_NOT_CONFIGURED khi thiếu hoặc rỗng ADMIN_PASSCODE (kể cả body sai/rỗng)", async () => {
      for (const envValue of [undefined, "", "   "]) {
        if (envValue === undefined) {
          delete env.ADMIN_PASSCODE;
        } else {
          env.ADMIN_PASSCODE = envValue;
        }

        const resInvalidJson = await loginPost(
          makeLoginRequest("{not-json", true),
        );
        expect(resInvalidJson.status).toBe(503);
        expect((await resInvalidJson.json()).error.code).toBe(
          "ADMIN_NOT_CONFIGURED",
        );

        const resWithPasscode = await loginPost(
          makeLoginRequest({ passcode: "anything" }),
        );
        expect(resWithPasscode.status).toBe(503);
        expect((await resWithPasscode.json()).error.code).toBe(
          "ADMIN_NOT_CONFIGURED",
        );
      }
    });

    it("400 VALIDATION_ERROR khi body không hợp lệ hoặc passcode rỗng/khoảng trắng", async () => {
      env.ADMIN_PASSCODE = "alpha-123";

      const invalidJsonRes = await loginPost(makeLoginRequest("{oops", true));
      expect(invalidJsonRes.status).toBe(400);
      expect((await invalidJsonRes.json()).error.code).toBe("VALIDATION_ERROR");

      for (const payload of [[], true, "secret-string"]) {
        const res = await loginPost(makeLoginRequest(payload));
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error.code).toBe("VALIDATION_ERROR");
        expect(json.error.details).toHaveProperty("_form");
      }

      for (const payload of [
        {},
        { passcode: 12345 },
        { passcode: null },
        { passcode: "   " },
      ]) {
        const res = await loginPost(makeLoginRequest(payload));
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error.code).toBe("VALIDATION_ERROR");
        expect(json.error.details).toHaveProperty("passcode");
      }
    });

    it("401 UNAUTHORIZED khi sai mật khẩu (kể cả dư khoảng trắng cuối) và không lộ ADMIN_PASSCODE", async () => {
      env.ADMIN_PASSCODE = "alpha-123";

      for (const candidate of ["wrong", "alpha-123 "]) {
        const res = await loginPost(makeLoginRequest({ passcode: candidate }));
        expect(res.status).toBe(401);
        const text = await res.text();
        expect(text).not.toContain("alpha-123");
        const json = JSON.parse(text);
        expect(json.error.code).toBe("UNAUTHORIZED");
      }
    });

    it("200 { ok: true } + Set-Cookie hợp lệ khi đăng nhập thành công (trim ADMIN_PASSCODE)", async () => {
      env.ADMIN_PASSCODE = "  secret-pass  ";
      env.NODE_ENV = "test";

      const res = await loginPost(
        makeLoginRequest({ passcode: "secret-pass" }),
      );
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
      expect(res.headers.get("cache-control")).toBe("no-store");

      const setCookie = res.headers.get("set-cookie");
      expect(setCookie).toBeTruthy();
      expect(setCookie).toMatch(
        new RegExp(
          `^${ADMIN_COOKIE_NAME}=\\d+\\.[0-9a-f]{64}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800$`,
        ),
      );

      // Cookie cấp ra phải vượt qua assertAdminRequest
      const cookiePair = setCookie!.split(";")[0];
      expect(() =>
        assertAdminRequest(
          new Request("http://localhost/api/admin/orders", {
            headers: { cookie: cookiePair },
          }),
        ),
      ).not.toThrow();
    });

    it("gắn thêm thuộc tính Secure khi NODE_ENV === production", async () => {
      env.ADMIN_PASSCODE = "secret-pass";
      env.NODE_ENV = "production";

      const res = await loginPost(
        makeLoginRequest({ passcode: "secret-pass" }),
      );
      expect(res.status).toBe(200);
      const setCookie = res.headers.get("set-cookie");
      expect(setCookie).toContain("; Secure");
    });
  });

  describe("POST /api/admin/auth/logout", () => {
    it("luôn trả 200 { ok: true } và xóa cookie khi không cookie, cookie hết hạn, hoặc thiếu ADMIN_PASSCODE", async () => {
      env.NODE_ENV = "test";

      const resNoEnv = await logoutPost();
      expect(resNoEnv.status).toBe(200);
      expect(await resNoEnv.json()).toEqual({ ok: true });
      expect(resNoEnv.headers.get("cache-control")).toBe("no-store");
      expect(resNoEnv.headers.get("set-cookie")).toBe(
        `${ADMIN_COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`,
      );

      env.ADMIN_PASSCODE = "secret-pass";
      const resWithEnv = await logoutPost();
      expect(resWithEnv.status).toBe(200);
      expect(await resWithEnv.json()).toEqual({ ok: true });
      expect(resWithEnv.headers.get("cache-control")).toBe("no-store");
      expect(resWithEnv.headers.get("set-cookie")).toBe(
        `${ADMIN_COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`,
      );
    });
  });
});
