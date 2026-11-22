import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const KEY_LENGTH = 64;

export interface StaffAccount {
  username: string;
  displayName: string;
  passwordHash: string;
}

/** Băm mật khẩu: `scrypt$<saltHex>$<hashHex>`. */
export function hashPassword(password: string, salt: Buffer = randomBytes(16)): string {
  const hash = scryptSync(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex, ...rest] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex || rest.length > 0) return false;
  if (!/^[0-9a-f]+$/i.test(saltHex) || !/^[0-9a-f]+$/i.test(hashHex)) return false;
  const expected = Buffer.from(hashHex, "hex");
  if (expected.length !== KEY_LENGTH) return false;
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), KEY_LENGTH);
  return timingSafeEqual(actual, expected);
}

const accountsSchema = z
  .array(
    z.object({
      username: z.string().min(1),
      displayName: z.string().min(1),
      passwordHash: z.string().min(1),
    }),
  )
  .min(1);

export type ParsedStaffAccounts =
  { accounts: StaffAccount[]; reason?: undefined } | { accounts: null; reason: string };

/** Đọc JSON `STAFF_ACCOUNTS`; lỗi thì trả accounts null kèm lý do (không chứa giá trị). */
export function parseStaffAccounts(raw: string | undefined): ParsedStaffAccounts {
  if (!raw?.trim()) return { accounts: null, reason: "thiếu giá trị" };
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { accounts: null, reason: "không phải JSON hợp lệ" };
  }
  const result = accountsSchema.safeParse(json);
  if (!result.success) {
    return {
      accounts: null,
      reason: "sai cấu trúc [{ username, displayName, passwordHash }]",
    };
  }
  return { accounts: result.data };
}
