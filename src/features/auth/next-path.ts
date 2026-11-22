/** Đường dẫn mặc định sau khi đăng nhập. */
export const STAFF_HOME = "/staff";

/** Header do src/proxy.ts gắn vào để page biết đường dẫn gốc của yêu cầu. */
export const STAFF_PATH_HEADER = "x-staff-path";

/**
 * Chỉ nhận đường dẫn nội bộ thuộc `/staff` (chặn open redirect); ngược lại về `/staff`.
 * Trang `/staff/login` cũng bị loại để tránh vòng lặp.
 */
export function safeStaffNext(next: string | null | undefined): string {
  if (!next || next.includes("\\") || /[\u0000-\u001f]/.test(next))
    return STAFF_HOME;
  if (!/^\/staff(?:[/?#]|$)/.test(next)) return STAFF_HOME;
  if (/^\/staff\/login(?:[/?#]|$)/.test(next)) return STAFF_HOME;
  return next;
}
