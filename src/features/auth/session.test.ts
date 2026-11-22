import { describe, expect, it } from "vitest";
import {
  signOrderIds,
  signSession,
  verifyOrderIds,
  verifySession,
} from "./session";

const secret = "test-secret";
const now = 1_000_000;

describe("session", () => {
  it("ký rồi xác thực lại được", () => {
    const token = signSession({ username: "lan", exp: now + 1000 }, secret);
    expect(verifySession(token, secret, now)).toEqual({
      username: "lan",
      exp: now + 1000,
    });
  });

  it("từ chối khi sai secret", () => {
    const token = signSession({ username: "lan", exp: now + 1000 }, secret);
    expect(verifySession(token, "other", now)).toBeNull();
    expect(verifySession(token, "", now)).toBeNull();
  });

  it("từ chối khi bị sửa một ký tự", () => {
    const token = signSession({ username: "lan", exp: now + 1000 }, secret);
    const last = token.slice(-1) === "A" ? "B" : "A";
    expect(verifySession(token.slice(0, -1) + last, secret, now)).toBeNull();
    const [payload, sig] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify({ username: "admin", exp: now + 1000 }),
    ).toString("base64url");
    expect(forged).not.toBe(payload);
    expect(verifySession(`${forged}.${sig}`, secret, now)).toBeNull();
  });

  it("từ chối khi hết hạn", () => {
    const token = signSession({ username: "lan", exp: now }, secret);
    expect(verifySession(token, secret, now)).toBeNull();
  });

  it("từ chối định dạng hỏng", () => {
    for (const bad of ["", "abc", "a.b.c", ".", "x."]) {
      expect(verifySession(bad, secret, now)).toBeNull();
    }
  });

  it("từ chối payload hợp lệ chữ ký nhưng sai cấu trúc", () => {
    const payload = Buffer.from(
      JSON.stringify({ username: 1, exp: "x" }),
    ).toString("base64url");
    const token = signSession({ username: "a", exp: 1 }, secret);
    expect(
      verifySession(`${payload}.${token.split(".")[1]}`, secret, now),
    ).toBeNull();
  });
});

describe("sl_orders", () => {
  it("ký rồi đọc lại được danh sách Mã đơn", () => {
    expect(
      verifyOrderIds(signOrderIds(["SL-1", "SL-2"], secret), secret),
    ).toEqual(["SL-1", "SL-2"]);
  });

  it("sai secret, bị sửa hoặc hỏng định dạng thì trả mảng rỗng", () => {
    const token = signOrderIds(["SL-1"], secret);
    expect(verifyOrderIds(token, "other")).toEqual([]);
    expect(verifyOrderIds(token, "")).toEqual([]);
    expect(
      verifyOrderIds(
        token.slice(0, -1) + (token.endsWith("A") ? "B" : "A"),
        secret,
      ),
    ).toEqual([]);
    for (const bad of ["", "abc", "a.b.c", "."])
      expect(verifyOrderIds(bad, secret)).toEqual([]);
  });

  it("bỏ phần tử không phải chuỗi", () => {
    const token = signOrderIds(
      [1, "SL-1", null] as unknown as string[],
      secret,
    );
    expect(verifyOrderIds(token, secret)).toEqual(["SL-1"]);
  });
});
