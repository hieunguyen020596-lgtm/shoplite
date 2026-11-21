const SQL_STATE = /^[0-9A-Z]{5}$/;
const SAFE_TOKEN = /^[A-Za-z0-9_.$-]{1,64}$/;

function readField(value: unknown, key: string): unknown {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)[key]
    : undefined;
}

/** Chỉ lỗi kiểu `DatabaseError` của pg (có `severity` dạng chuỗi) mới có `code` là SQLSTATE. */
function sqlStateOf(error: unknown): string | undefined {
  if (typeof readField(error, "severity") !== "string") return undefined;
  const code = readField(error, "code");
  return typeof code === "string" && SQL_STATE.test(code) ? code : undefined;
}

/** Lấy SQLSTATE từ lỗi driver, kể cả khi Drizzle bọc trong `cause`. Không trả gì khác. */
export function extractSqlState(error: unknown): string | undefined {
  return sqlStateOf(error) ?? sqlStateOf(readField(error, "cause"));
}

/**
 * Đường log lỗi server duy nhất. Chỉ ghi `scope`, `name`, và `code` hoặc `sqlState`.
 * Không bao giờ ghi message, stack hay object lỗi gốc.
 */
export function logServerError(scope: string, error: unknown): void {
  const rawName = readField(error, "name");
  const name =
    typeof rawName === "string" && SAFE_TOKEN.test(rawName)
      ? rawName
      : "UnknownError";
  const entry: Record<string, string> = { scope, name };
  if (name === "DbFailure") {
    const sqlState = readField(error, "sqlState");
    if (typeof sqlState === "string" && SQL_STATE.test(sqlState))
      entry.sqlState = sqlState;
  } else {
    const code = readField(error, "code");
    if (typeof code === "string" && SAFE_TOKEN.test(code)) entry.code = code;
  }
  console.error(JSON.stringify(entry));
}
