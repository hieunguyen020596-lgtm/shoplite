import { describe, expect, it } from "vitest";
import { normalizePhone, phonesMatch } from "./phone";

describe("normalizePhone", () => {
  it.each([
    ["0912 345 678", "0912345678"],
    ["+84912345678", "0912345678"],
    ["+84 912 345 678", "0912345678"],
    ["84912345678", "0912345678"],
    ["0912.345.678", "0912345678"],
    ["0912-345-678", "0912345678"],
  ])("%s -> %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });
});

describe("phonesMatch", () => {
  it("khớp giữa các dạng viết khác nhau", () => {
    expect(phonesMatch("0912 345 678", "+84912345678")).toBe(true);
  });
  it("không khớp khi khác số hoặc rỗng", () => {
    expect(phonesMatch("0912345678", "0912345679")).toBe(false);
    expect(phonesMatch("", "")).toBe(false);
  });
});
