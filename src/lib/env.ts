import "server-only";

const PLACEHOLDER = "replace_me";
const MIN_SECRET_BYTES = 32;

export interface ServerEnv {
  DATABASE_URL: string;
  TEST_DATABASE_URL?: string;
  ORDER_ACCESS_SECRET: string;
  SHOP_CONTACT_PHONE: string;
  BANK_NAME: string;
  BANK_ACCOUNT_NUMBER: string;
  TRUSTED_PROXY_HOPS: number;
  /** Giữ nguyên dạng chuỗi, `staff:seed` tự parse và kiểm ở Epic 4. */
  STAFF_ACCOUNTS?: string;
}

export type EnvSource = Record<string, string | undefined>;

export type ParseEnvResult =
  { ok: true; env: ServerEnv } | { ok: false; names: string[] };

const REQUIRED = [
  "DATABASE_URL",
  "ORDER_ACCESS_SECRET",
  "SHOP_CONTACT_PHONE",
  "BANK_NAME",
  "BANK_ACCOUNT_NUMBER",
] as const;

/**
 * Hàm thuần: kiểm và parse env. Chỉ trả về tên biến lỗi, không bao giờ trả giá trị.
 * Ở production, giá trị chứa `replace_me` bị coi là thiếu.
 */
export function parseServerEnv(
  source: EnvSource,
  nodeEnv: string | undefined,
): ParseEnvResult {
  const isProd = nodeEnv === "production";
  const read = (name: string): string | undefined => {
    const value = source[name];
    if (value === undefined || value.trim() === "") return undefined;
    if (isProd && value.includes(PLACEHOLDER)) return undefined;
    return value;
  };

  const names: string[] = [];
  const values: Record<string, string> = {};
  for (const name of REQUIRED) {
    const value = read(name);
    if (value === undefined) names.push(name);
    else values[name] = value;
  }

  const secret = values.ORDER_ACCESS_SECRET;
  if (
    secret !== undefined &&
    Buffer.byteLength(secret, "utf8") < MIN_SECRET_BYTES
  ) {
    names.push("ORDER_ACCESS_SECRET");
  }

  let hops = 0;
  const rawHops = read("TRUSTED_PROXY_HOPS");
  if (rawHops === undefined) {
    if (isProd) names.push("TRUSTED_PROXY_HOPS");
  } else if (
    (isProd
      ? /^[1-9]\d*$/.test(rawHops.trim())
      : /^\d+$/.test(rawHops.trim())) &&
    Number.isSafeInteger(Number(rawHops.trim()))
  ) {
    hops = Number(rawHops.trim());
  } else {
    names.push("TRUSTED_PROXY_HOPS");
  }

  if (names.length > 0) return { ok: false, names: [...new Set(names)] };

  return {
    ok: true,
    env: {
      DATABASE_URL: values.DATABASE_URL,
      TEST_DATABASE_URL: read("TEST_DATABASE_URL"),
      ORDER_ACCESS_SECRET: values.ORDER_ACCESS_SECRET,
      SHOP_CONTACT_PHONE: values.SHOP_CONTACT_PHONE,
      BANK_NAME: values.BANK_NAME,
      BANK_ACCOUNT_NUMBER: values.BANK_ACCOUNT_NUMBER,
      TRUSTED_PROXY_HOPS: hops,
      STAFF_ACCOUNTS: read("STAFF_ACCOUNTS"),
    },
  };
}

let cached: ServerEnv | undefined;

/** Đọc và cache cấu hình server khi gọi lần đầu, không đọc lúc import. */
export function getServerEnv(): ServerEnv {
  if (cached) return cached;
  const result = parseServerEnv(process.env, process.env.NODE_ENV);
  if (!result.ok) {
    throw new Error(
      `Thiếu hoặc sai biến môi trường: ${result.names.join(", ")}`,
    );
  }
  cached = result.env;
  return cached;
}

/**
 * Kiểm env khi server khởi động. Env sai thì log tên biến rồi thoát mã 1.
 * Bỏ qua khi `next build` để build không cần env thật.
 */
export function exitIfEnvInvalid(): void {
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const result = parseServerEnv(process.env, process.env.NODE_ENV);
  if (result.ok) return;
  console.error(
    `[env] Thiếu hoặc sai biến môi trường: ${result.names.join(", ")}`,
  );
  process.exit(1);
}
