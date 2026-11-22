import { describe, expect, it } from "vitest";
import { safeStaffNext } from "./next-path";

describe("safeStaffNext", () => {
  it("giữ đường dẫn nội bộ dưới /staff", () => {
    expect(safeStaffNext("/staff")).toBe("/staff");
    expect(safeStaffNext("/staff/orders/SL-1?status=pending")).toBe(
      "/staff/orders/SL-1?status=pending",
    );
    expect(safeStaffNext("/staff?status=shipping")).toBe(
      "/staff?status=shipping",
    );
  });

  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/staffx",
    "/orders",
    "/staff/login",
    "staff",
    "",
  ])("về /staff với %j", (value) => {
    expect(safeStaffNext(value)).toBe("/staff");
  });

  it("về /staff khi thiếu giá trị", () => {
    expect(safeStaffNext(undefined)).toBe("/staff");
    expect(safeStaffNext(null)).toBe("/staff");
  });
});
