// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hashPassword } from "./staff-accounts";

const accountsJson = JSON.stringify([
  {
    username: "lan",
    displayName: "Lan",
    passwordHash: hashPassword("mat-khau-dung"),
  },
]);

async function loadServer(env: {
  SESSION_SECRET?: string;
  STAFF_ACCOUNTS?: string;
}) {
  vi.resetModules();
  vi.stubEnv("SESSION_SECRET", env.SESSION_SECRET ?? "");
  vi.stubEnv("STAFF_ACCOUNTS", env.STAFF_ACCOUNTS ?? "");
  return (await import("./server")).authService;
}

describe("authService (server.ts)", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    errorSpy.mockRestore();
  });

  it("đăng nhập được khi cấu hình đầy đủ và không ghi log lỗi", async () => {
    const service = await loadServer({
      SESSION_SECRET: "bi-mat",
      STAFF_ACCOUNTS: accountsJson,
    });
    expect(service.login("lan", "mat-khau-dung").staff.username).toBe("lan");
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("thiếu SESSION_SECRET: từ chối mọi lần thử, log tên biến", async () => {
    const service = await loadServer({ STAFF_ACCOUNTS: accountsJson });
    expect(() => service.login("lan", "mat-khau-dung")).toThrow(expect.objectContaining({ code: "UNAUTHENTICATED" }));
    const logged = errorSpy.mock.calls.flat().join(" ");
    expect(logged).toContain("SESSION_SECRET");
    expect(logged).not.toContain("mat-khau-dung");
  });

  it.each([
    ["thiếu", undefined],
    ["không phải JSON", "{oops"],
  ])(
    "STAFF_ACCOUNTS %s: từ chối mọi lần thử, log tên biến",
    async (_label, raw) => {
      const service = await loadServer({
        SESSION_SECRET: "bi-mat",
        STAFF_ACCOUNTS: raw,
      });
      expect(() => service.login("lan", "bat-ky")).toThrow(expect.objectContaining({ code: "UNAUTHENTICATED" }));
      const logged = errorSpy.mock.calls.flat().join(" ");
      expect(logged).toContain("STAFF_ACCOUNTS");
      if (raw) expect(logged).not.toContain(raw);
    },
  );
});
