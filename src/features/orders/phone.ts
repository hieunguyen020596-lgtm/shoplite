/** Chuẩn hóa SĐT về dạng `0xxxxxxxxx`: bỏ khoảng trắng, dấu chấm, gạch, ngoặc; `+84`/`84` đầu số đổi thành `0`. */
export function normalizePhone(phone: string): string {
  const compact = phone.replace(/[\s.\-()]/g, "");
  return compact.replace(/^\+?84(?=\d{9}$)/, "0");
}

/** Hai SĐT có cùng số sau khi chuẩn hóa hay không. */
export function phonesMatch(a: string, b: string): boolean {
  const left = normalizePhone(a);
  return left.length > 0 && left === normalizePhone(b);
}
