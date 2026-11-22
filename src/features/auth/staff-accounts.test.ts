import { describe, expect, it } from "vitest";
import { hashPassword, parseStaffAccounts, verifyPassword } from "./staff-accounts";

describe("hashPassword / verifyPassword", () => {
  it("băm theo định dạng scrypt$salt$hash và xác thực đúng", () => {
    const hash = hashPassword("matkhau123");
    expect(hash).toMatch(/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    expect(verifyPassword("matkhau123", hash)).toBe(true);
    expect(verifyPassword("sai", hash)).toBe(false);
  });

  it("salt khác nhau cho hash khác nhau", () => {
    expect(hashPassword("a")).not.toBe(hashPassword("a"));
  });

  it("từ chối hash sai định dạng thay vì ném lỗi", () => {
    for (const bad of ["", "plain", "scrypt$zz$zz", "scrypt$ab$cd", "bcrypt$a$b", "scrypt$a$b$c"]) {
      expect(verifyPassword("x", bad)).toBe(false);
    }
  });
});

describe("parseStaffAccounts", () => {
  const valid = [{ username: "lan", displayName: "Lan", passwordHash: "scrypt$a$b" }];

  it("đọc JSON hợp lệ", () => {
    expect(parseStaffAccounts(JSON.stringify(valid)).accounts).toEqual(valid);
  });

  it("trả null kèm lý do khi thiếu, hỏng JSON hoặc sai cấu trúc", () => {
    for (const raw of [undefined, "", "{oops", "{}", "[]", '[{"username":"a"}]']) {
      const result = parseStaffAccounts(raw);
      expect(result.accounts).toBeNull();
      expect(result.reason).toBeTruthy();
    }
  });
});
