// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ADMIN_COOKIE_NAME,
  createAdminSessionToken,
} from "@/features/orders/admin-auth";
import * as proxyModule from "./proxy";
import { config, proxy } from "./proxy";

const env = process.env as Record<string, string | undefined>;

function makeAdminRequest(path: string, cookieToken?: string): NextRequest {
  const headers = new Headers();
  if (cookieToken !== undefined) {
    headers.set("cookie", `${ADMIN_COOKIE_NAME}=${cookieToken}`);
  }
  return new NextRequest(`http://localhost:3000${path}`, { headers });
}

describe("Next.js 16 src/proxy.ts", () => {
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

  it("khai báo đúng matcher /admin/:path* và không export runtime", () => {
    expect(config).toEqual({ matcher: ["/admin/:path*"] });
    expect("runtime" in proxyModule).toBe(false);
  });

  it("không chặn /admin/login và /admin/login/ kể cả khi thiếu env, thiếu cookie, hoặc cookie hỏng", () => {
    const resNoEnv = proxy(makeAdminRequest("/admin/login"));
    expect(resNoEnv.status).toBe(200);
    expect(resNoEnv.headers.get("location")).toBeNull();
    expect(resNoEnv.headers.get("cache-control")).toBe("no-store");

    env.ADMIN_PASSCODE = "secret-pass";
    const resBadCookie = proxy(makeAdminRequest("/admin/login", "bad.token"));
    expect(resBadCookie.status).toBe(200);
    expect(resBadCookie.headers.get("location")).toBeNull();
    expect(resBadCookie.headers.get("cache-control")).toBe("no-store");

    const resTrailingSlash = proxy(
      makeAdminRequest("/admin/login/", "bad.token"),
    );
    expect(resTrailingSlash.status).toBe(200);
    expect(resTrailingSlash.headers.get("location")).toBeNull();
    expect(resTrailingSlash.headers.get("cache-control")).toBe("no-store");
  });

  it("chuyển hướng 307 về /admin/login khi thiếu ADMIN_PASSCODE (kể cả /admin và route con kèm query)", () => {
    for (const path of [
      "/admin",
      "/admin/orders",
      "/admin/orders/123?status=pending",
    ]) {
      const res = proxy(makeAdminRequest(path));
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe(
        "http://localhost:3000/admin/login",
      );
      expect(res.headers.get("cache-control")).toBe("no-store");
    }
  });

  it("chuyển hướng 307 về /admin/login khi thiếu cookie", () => {
    env.ADMIN_PASSCODE = "secret-pass";
    const res = proxy(makeAdminRequest("/admin/orders/123?status=pending"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/admin/login",
    );
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("chuyển hướng 307 về /admin/login?expired=1 khi cookie hết hạn hoặc sai chữ ký", () => {
    env.ADMIN_PASSCODE = "secret-pass";
    const expiredToken = createAdminSessionToken(Date.now() - 30_000_000);

    const resExpired = proxy(
      makeAdminRequest("/admin/orders/123?status=pending", expiredToken),
    );
    expect(resExpired.status).toBe(307);
    expect(resExpired.headers.get("location")).toBe(
      "http://localhost:3000/admin/login?expired=1",
    );
    expect(resExpired.headers.get("cache-control")).toBe("no-store");

    const resForged = proxy(
      makeAdminRequest("/admin/orders", "1999999999999.forged"),
    );
    expect(resForged.status).toBe(307);
    expect(resForged.headers.get("location")).toBe(
      "http://localhost:3000/admin/login?expired=1",
    );
    expect(resForged.headers.get("cache-control")).toBe("no-store");
  });

  it("cho phép đi tiếp khi có cookie hợp lệ và gắn Cache-Control: no-store", () => {
    env.ADMIN_PASSCODE = "secret-pass";
    const validToken = createAdminSessionToken();
    for (const path of [
      "/admin",
      "/admin/orders",
      "/admin/orders/123?status=pending",
    ]) {
      const res = proxy(makeAdminRequest(path, validToken));
      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
      expect(res.headers.get("x-middleware-next")).toBe("1");
      expect(res.headers.get("cache-control")).toBe("no-store");
    }
  });
});
