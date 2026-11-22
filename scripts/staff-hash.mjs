// In hash scrypt của mật khẩu truyền vào, cùng định dạng với hashPassword
// trong src/features/auth/staff-accounts.ts: scrypt$<saltHex>$<hashHex>
// Thêm `--env` để thoát dấu `$` thành `\$`, dùng khi dán vào .env.local
// (Next.js sẽ xóa phần sau `$` nếu không thoát).
import { randomBytes, scryptSync } from "node:crypto";

const args = process.argv.slice(2);
const forEnv = args.includes("--env");
const password = args.find((arg) => arg !== "--env");
if (!password) {
  console.error("Cách dùng: npm run staff:hash -- <mat-khau> [--env]");
  process.exit(1);
}

const salt = randomBytes(16);
const hash = scryptSync(password, salt, 64);
const result = `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
console.log(forEnv ? result.replaceAll("$", "\\$") : result);
