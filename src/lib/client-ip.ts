import { isIP } from "node:net";

const DIRECT = "direct";
const UNKNOWN = "unknown";

/** Mở rộng IPv6 hợp lệ thành đúng 8 nhóm 16 bit, hoặc null. */
function expandIpv6(ip: string): number[] | null {
  let text = ip;
  // Đuôi dạng IPv4 (::ffff:1.2.3.4) đổi thành 2 nhóm hex.
  const lastColon = text.lastIndexOf(":");
  const tail = text.slice(lastColon + 1);
  if (tail.includes(".")) {
    const parts = tail.split(".").map(Number);
    const hi = ((parts[0] << 8) | parts[1]).toString(16);
    const lo = ((parts[2] << 8) | parts[3]).toString(16);
    text = `${text.slice(0, lastColon + 1)}${hi}:${lo}`;
  }
  const halves = text.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] === "" ? [] : halves[0].split(":");
  const rest =
    halves.length === 2 ? (halves[1] === "" ? [] : halves[1].split(":")) : [];
  const missing = 8 - head.length - rest.length;
  if (halves.length === 2 ? missing < 1 : missing !== 0) return null;
  const groups = [
    ...head,
    ...Array(halves.length === 2 ? missing : 0).fill("0"),
    ...rest,
  ];
  if (groups.length !== 8) return null;
  const values = groups.map((g) => parseInt(g, 16));
  return values.some((v) => Number.isNaN(v)) ? null : values;
}

function normalizeIp(raw: string): string {
  const value = raw.trim();
  if (value.includes("%")) return UNKNOWN;
  const version = isIP(value);
  if (version === 4) return value;
  if (version !== 6) return UNKNOWN;
  const groups = expandIpv6(value);
  if (!groups) return UNKNOWN;
  // IPv4-mapped (::ffff:a.b.c.d) về IPv4.
  if (groups.slice(0, 5).every((g) => g === 0) && groups[5] === 0xffff) {
    return `${groups[6] >> 8}.${groups[6] & 0xff}.${groups[7] >> 8}.${groups[7] & 0xff}`;
  }
  // IPv6 thường: gom theo /64.
  return `${groups
    .slice(0, 4)
    .map((g) => g.toString(16))
    .join(":")}::/64`;
}

/**
 * Nơi duy nhất đọc header IP (AD-10). `hops` là số proxy tin cậy trước app:
 * 0 -> bucket `direct` (không đọc header); n -> phần tử thứ n tính từ phải của `x-forwarded-for`.
 * Thiếu phần tử hoặc không phải IP thì `unknown`. IPv4-mapped về IPv4, IPv6 gom `/64`.
 */
export function getClientIp(headers: Headers, hops: number): string {
  if (hops <= 0) return DIRECT;
  const chain = (headers.get("x-forwarded-for") ?? "").split(",");
  const entry = chain[chain.length - hops];
  if (entry === undefined || chain.length < hops) return UNKNOWN;
  return normalizeIp(entry);
}
