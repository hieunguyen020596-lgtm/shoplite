import { afterEach, describe, expect, it, vi } from "vitest";
import { extractSqlState, logServerError } from "./safe-log";

afterEach(() => vi.restoreAllMocks());

function logged(error: unknown): string {
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  logServerError("test", error);
  return String(spy.mock.calls[0]?.[0]);
}

describe("logServerError", () => {
  it("chỉ ghi scope, name, code, không ghi message hay stack", () => {
    const err = Object.assign(new Error("password=hunter2 host=db"), {
      code: "ECONNREFUSED",
    });
    const out = logged(err);
    expect(JSON.parse(out)).toEqual({
      scope: "test",
      name: "Error",
      code: "ECONNREFUSED",
    });
    expect(out).not.toContain("hunter2");
  });

  it("DbFailure chỉ ghi sqlState", () => {
    expect(
      JSON.parse(
        logged({ name: "DbFailure", sqlState: "23514", message: "x" }),
      ),
    ).toEqual({
      scope: "test",
      name: "DbFailure",
      sqlState: "23514",
    });
  });

  it("giá trị lạ không lọt vào log", () => {
    const out = logged({
      name: "bad name with secret",
      code: "has spaces secret",
    });
    expect(JSON.parse(out)).toEqual({ scope: "test", name: "UnknownError" });
    expect(logged("chuỗi bí mật")).not.toContain("bí mật");
  });
});

describe("extractSqlState", () => {
  it("đọc code SQL trực tiếp hoặc trong cause, bỏ qua code không phải SQLSTATE", () => {
    const pgErr = (code: string) => ({ severity: "ERROR", code });
    expect(extractSqlState(pgErr("40001"))).toBe("40001");
    expect(extractSqlState(pgErr("P0001"))).toBe("P0001");
    expect(extractSqlState(pgErr("XX000"))).toBe("XX000");
    expect(extractSqlState({ cause: pgErr("23505") })).toBe("23505");
    expect(extractSqlState({ code: "EPIPE" })).toBeUndefined();
    expect(extractSqlState({ cause: { code: "EPIPE" } })).toBeUndefined();
    expect(extractSqlState({ code: "40001" })).toBeUndefined();
    expect(extractSqlState({ code: "ECONNREFUSED" })).toBeUndefined();
    expect(extractSqlState(null)).toBeUndefined();
  });
});
