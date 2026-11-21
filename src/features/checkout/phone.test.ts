import { describe, expect, it } from "vitest";
import { normalizePhone } from "./phone";

describe("normalizePhone", () => {
  it("đổi +84 thành 0", () => {
    expect(normalizePhone("+84912345678")).toBe("0912345678");
  });
  it("giữ nguyên số dạng 0 và cắt khoảng trắng", () => {
    expect(normalizePhone("0912345678")).toBe("0912345678");
    expect(normalizePhone("  0912345678 ")).toBe("0912345678");
  });
  it("idempotent", () => {
    const once = normalizePhone("+84356789012");
    expect(normalizePhone(once!)).toBe(once);
  });
  it("số sai trả null", () => {
    for (const bad of [
      "",
      "123",
      "0212345678",
      "+8412345678",
      "84912345678",
      "09123456789",
    ]) {
      expect(normalizePhone(bad)).toBeNull();
    }
  });
});
