// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAuthService } from "@/features/auth/auth-service";
import { hashPassword } from "@/features/auth/staff-accounts";
import { POST } from "./route";

vi.mock("@/features/auth/server", () => ({
  authService: createAuthService({
    accounts: [
      {
        username: "lan",
        displayName: "Chị Lan",
        passwordHash: hashPassword("pw-dung"),
      },
    ],
    secret: "s3cret",
  }),
}));

const login = (body: unknown) =>
  POST(
    new Request("http://localhost/api/staff/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

afterEach(() => vi.unstubAllEnvs());

describe("POST /api/staff/login", () => {
  it("200 - đúng thông tin, đặt cookie an toàn", async () => {
    const response = await login({ username: "lan", password: "pw-dung" });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      username: "lan",
      displayName: "Chị Lan",
    });
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("sl_staff=");
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=lax/i);
    expect(cookie).toContain("Max-Age=43200");
    expect(cookie).not.toMatch(/Secure/i);
  });

  it("có Secure khi production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const response = await login({ username: "lan", password: "pw-dung" });
    expect(response.headers.get("set-cookie")).toMatch(/Secure/i);
  });

  it("401 - sai mật khẩu và username lạ cùng thông báo, không cookie", async () => {
    const wrongPassword = await login({ username: "lan", password: "sai" });
    const unknownUser = await login({ username: "ghost", password: "sai" });
    for (const response of [wrongPassword, unknownUser]) {
      expect(response.status).toBe(401);
      expect(response.headers.get("set-cookie")).toBeNull();
    }
    const [a, b] = [await wrongPassword.json(), await unknownUser.json()];
    expect(a.error.code).toBe("UNAUTHENTICATED");
    expect(a.error.message).toBe("Tên đăng nhập hoặc mật khẩu không đúng");
    expect(b).toEqual(a);
  });

  it("400 - body không phải JSON hoặc thiếu trường", async () => {
    const notJson = await login("{oops");
    expect(notJson.status).toBe(400);
    expect((await notJson.json()).error.code).toBe("VALIDATION_ERROR");

    const missing = await login({ username: "lan" });
    expect(missing.status).toBe(400);
    expect((await missing.json()).error.details).toHaveProperty("password");
  });
});
