// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccessError } from "./access-errors";
import { createAuthService } from "./auth-service";
import { isOrderVerified, rememberOrder, requireStaff } from "./guards";
import {
  ORDERS_COOKIE,
  signOrderIds,
  signSession,
  STAFF_COOKIE,
} from "./session";
import { hashPassword } from "./staff-accounts";

const state = vi.hoisted(() => ({
  token: undefined as string | undefined,
  orders: undefined as string | undefined,
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value =
        name === "sl_staff"
          ? state.token
          : name === "sl_orders"
            ? state.orders
            : undefined;
      return value !== undefined ? { name, value } : undefined;
    },
  }),
}));

vi.mock("./server", async () => {
  const { createAuthService } = await import("./auth-service");
  const { hashPassword } = await import("./staff-accounts");
  return {
    authService: createAuthService({
      accounts: [
        {
          username: "lan",
          displayName: "Chị Lan",
          passwordHash: hashPassword("pw"),
        },
      ],
      secret: "s3cret",
    }),
  };
});

void createAuthService;
void hashPassword;

describe("requireStaff", () => {
  beforeEach(() => {
    state.token = undefined;
  });

  it("trả nhân viên khi cookie hợp lệ", async () => {
    expect(STAFF_COOKIE).toBe("sl_staff");
    state.token = signSession(
      { username: "lan", exp: Date.now() + 60_000 },
      "s3cret",
    );
    await expect(requireStaff()).resolves.toEqual({
      username: "lan",
      displayName: "Chị Lan",
    });
  });

  it("ném UNAUTHENTICATED khi không có cookie", async () => {
    await expect(requireStaff()).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
  });

  it("ném UNAUTHENTICATED khi cookie bị sửa", async () => {
    const token = signSession(
      { username: "lan", exp: Date.now() + 60_000 },
      "s3cret",
    );
    state.token = token.slice(0, -1) + (token.endsWith("A") ? "B" : "A");
    await expect(requireStaff()).rejects.toBeInstanceOf(AccessError);
  });

  it("ném UNAUTHENTICATED khi cookie quá hạn", async () => {
    state.token = signSession(
      { username: "lan", exp: Date.now() - 1 },
      "s3cret",
    );
    await expect(requireStaff()).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
  });
});

describe("isOrderVerified / rememberOrder", () => {
  beforeEach(() => {
    state.orders = undefined;
  });

  it("false khi không có cookie hoặc cookie bị sửa", async () => {
    await expect(isOrderVerified("SL-1")).resolves.toBe(false);
    const token = signOrderIds(["SL-1"], "s3cret");
    state.orders = token.slice(0, -1) + (token.endsWith("A") ? "B" : "A");
    await expect(isOrderVerified("SL-1")).resolves.toBe(false);
  });

  it("true khi Mã đơn nằm trong cookie hợp lệ", async () => {
    state.orders = signOrderIds(["SL-1", "SL-2"], "s3cret");
    await expect(isOrderVerified("SL-2")).resolves.toBe(true);
    await expect(isOrderVerified("SL-3")).resolves.toBe(false);
  });

  it("rememberOrder đặt cookie HttpOnly và giữ các mã cũ", async () => {
    state.orders = signOrderIds(["SL-1"], "s3cret");
    const set = vi.fn();
    await rememberOrder({ cookies: { set } }, "SL-2");
    expect(set).toHaveBeenCalledOnce();
    const [name, value, options] = set.mock.calls[0];
    expect(name).toBe(ORDERS_COOKIE);
    expect(options).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
    state.orders = value;
    await expect(isOrderVerified("SL-1")).resolves.toBe(true);
    await expect(isOrderVerified("SL-2")).resolves.toBe(true);
  });
});
