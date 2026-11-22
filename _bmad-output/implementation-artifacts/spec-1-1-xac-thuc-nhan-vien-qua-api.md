---
title: "Story 1.1: Xác thực nhân viên qua API"
type: "feature"
created: "2026-11-21"
status: "done"
baseline_commit: "b8e90789a10daaf18b6030ba1bd766ed61ef78c1"
route: "dispatch"
review_loop_iteration: 0
context:
  - "{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md"
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** ShopLite chưa có đăng nhập; không thể gắn thao tác với đúng nhân viên và không có cách bảo vệ API nhân viên (FR-1, FR-2 phần API).

**Approach:** Thêm `features/auth` dùng `node:crypto` (không thêm dependency): cookie phiên `sl_staff` ký HMAC-SHA256, tài khoản đọc từ `STAFF_ACCOUNTS` (scrypt), guard `requireStaff()`, `AccessError` cùng shape với `OrderError`, và hai endpoint `POST /api/staff/login`, `POST /api/staff/logout`.

## Boundaries & Constraints

**Always:**

- Cookie `sl_staff` giá trị `{ username, exp }` ký HMAC-SHA256 bằng `SESSION_SECRET`; `HttpOnly`, `SameSite=Lax`, hết hạn 12 giờ, `Secure` khi `NODE_ENV=production`.
- So khớp chữ ký và hash bằng `timingSafeEqual`. Sai mật khẩu và sai username trả cùng một thông báo, và vẫn chạy một lần so khớp scrypt giả khi username không tồn tại.
- Lỗi theo định dạng BL-5 `{ error: { code, message, details? } }`; `handleRouteError` xử lý cả `OrderError` lẫn `AccessError`; mã `OrderError` giữ nguyên HTTP status.
- Biến môi trường chỉ đọc trong `features/auth/server.ts`; không có giá trị mặc định viết cứng cho bí mật. Log không chứa mật khẩu, hash, cookie.
- Hàm thuần có `*.test.ts` cạnh file; route test theo mẫu `src/app/api/orders/route.test.ts`.

**Never:**

- Không thêm dependency; không dùng Server Actions; không tạo cookie nào khác ngoài `sl_staff` (`sl_orders` thuộc story 1.6).
- Không làm trang login, `proxy.ts`, `canViewOrder`, `attempt-limiter` (story 1.2+); không sửa các route `/api/orders`.

## I/O & Edge-Case Matrix

| Scenario                   | Input / State                                           | Expected Output / Behavior                                                   | Error Handling            |
| -------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------- |
| Login đúng                 | `{username:"lan",password:"<đúng>"}`, env hợp lệ        | 200 `{ username, displayName }` + Set-Cookie `sl_staff`                      | N/A                       |
| Sai mật khẩu / username lạ | Thông tin sai                                           | 401 `UNAUTHENTICATED` "Tên đăng nhập hoặc mật khẩu không đúng", không cookie | Cùng thông báo cho cả hai |
| Body sai                   | Thiếu trường / không phải JSON                          | 400 `VALIDATION_ERROR` kèm `details` qua `toFieldErrors`                     | Zod schema                |
| Thiếu cấu hình             | Thiếu `SESSION_SECRET`/`STAFF_ACCOUNTS`, hoặc JSON hỏng | 401 mọi lần thử; `console.error` nêu tên biến (không in giá trị)             | Không throw 500           |
| Cookie bị sửa              | Đổi 1 ký tự                                             | `requireStaff()` ném `AccessError("UNAUTHENTICATED")` → 401                  | N/A                       |
| Cookie quá 12 giờ          | `exp` < now                                             | `requireStaff()` ném `UNAUTHENTICATED`                                       | N/A                       |
| Logout                     | Có phiên                                                | 204, `sl_staff` `Max-Age=0`                                                  | N/A                       |

</frozen-after-approval>

## Code Map

- `src/lib/http.ts` -- `handleRouteError` chỉ nhận `OrderError`; mở rộng nhận `AccessError`. Reuse `jsonError`, `readJsonBody`.
- `src/features/orders/order-errors.ts` -- mẫu cho `AccessError` (class + `httpStatus` getter). Không sửa.
- `src/features/orders/server.ts` -- mẫu đọc env trong `server.ts`.
- `src/features/checkout/checkout-schema.ts` -- `toFieldErrors(error)` để reuse cho login schema.
- `src/app/api/orders/route.test.ts` -- mẫu route test (`// @vitest-environment node`, `vi.mock` server module).
- `README.md:106` -- bảng biến môi trường cần bổ sung.
- `package.json` -- thêm script `staff:hash`.

## Tasks & Acceptance

**Execution:**

- [x] `src/features/auth/access-errors.ts` -- `AccessError` với mã `UNAUTHENTICATED` 401, `FORBIDDEN` 403, `TOO_MANY_ATTEMPTS` 429 và getter `httpStatus` -- AD-10
- [x] `src/lib/http.ts` -- `handleRouteError` xử lý thêm `AccessError`; thêm test hồi quy cho 5 mã `OrderError` giữ nguyên status (`src/lib/http.test.ts`) -- BL-5
- [x] `src/features/auth/session.ts` + `session.test.ts` -- `signSession`/`verifySession(token, secret, now)`: base64url payload + HMAC; từ chối chữ ký sai, hết hạn, định dạng hỏng -- AD-9
- [x] `src/features/auth/staff-accounts.ts` + `.test.ts` -- `hashPassword` (định dạng `scrypt$<saltHex>$<hashHex>`), `verifyPassword`, `parseStaffAccounts(raw)` (Zod; lỗi → trả `null` kèm lý do để log) -- AD-9
- [x] `src/features/auth/staff-schema.ts` -- `loginSchema` `{ username, password }` không rỗng -- AD-11
- [x] `src/features/auth/auth-service.ts` + `.test.ts` -- factory `createAuthService({ accounts, secret, now })`: `login()` trả `{ staff, token }` hoặc ném `AccessError`; `readSession(token)` -- AD-1
- [x] `src/features/auth/guards.ts` + `.test.ts` -- `requireStaff()` đọc cookie `sl_staff` qua `next/headers`, trả `{ username, displayName }` hoặc ném `AccessError("UNAUTHENTICATED")` -- AD-9
- [x] `src/features/auth/server.ts` -- đọc `SESSION_SECRET`, `STAFF_ACCOUNTS`, tạo `authService`; thiếu/hỏng → `console.error` tên biến, login luôn 401 -- AD-14
- [x] `src/app/api/staff/login/route.ts` + `route.test.ts` -- POST: parse body, Zod, đặt cookie với cờ bảo mật -- AC login
- [x] `src/app/api/staff/logout/route.ts` + test -- POST: xóa cookie, 204 -- AC logout
- [x] `scripts/staff-hash.mjs` + `package.json` -- script `staff:hash` in hash scrypt của mật khẩu truyền vào (dùng cùng định dạng `hashPassword`) -- hỗ trợ cấu hình
- [x] `README.md` -- thêm `SESSION_SECRET`, `STAFF_ACCOUNTS` vào bảng biến môi trường, hướng dẫn `staff:hash`, ràng buộc một instance (AD-14) -- NFR3, NFR10

**Acceptance Criteria:**

- Given env hợp lệ, when login đúng, then 200 và cookie `sl_staff` có `HttpOnly`, `SameSite=Lax`, `Max-Age=43200`, và `Secure` chỉ khi production.
- Given cookie hợp lệ, when sửa một ký tự hoặc quá 12 giờ, then `requireStaff()` ném `AccessError("UNAUTHENTICATED")` và `handleRouteError` trả 401 đúng BL-5.
- Given thiếu cấu hình, when login, then 401 và log chỉ chứa tên biến.
- Given `npm run check`, then lint, typecheck và toàn bộ test qua.

## Implementation Notes

- Triển khai bởi subagent; session chính kiểm lại diff, `npm run check` qua (20 file, 120 test).
- Bổ sung `src/features/auth/server.test.ts` để phủ dòng ma trận "Thiếu cấu hình" (401 + log tên biến, không log giá trị).
- Chưa kiểm chứng với server chạy thật hay `.env.local` thật.
- Repo không có `.prettierrc` (bị revert ở b8e9078), nên định dạng file mới chưa đối chiếu cấu hình chuẩn.

## Spec Change Log

## Review Triage Log

## Design Notes

`requireStaff()` trả `{ username, displayName }` (kiểu cục bộ của auth); kiểu `Actor` thuộc `features/orders` được thêm ở Epic 2 (AD-7). Khóa lập trình để tránh dùng thư viện cookie: đọc qua `cookies()` của `next/headers`, ghi qua `NextResponse.cookies.set`.

## Verification

**Commands:**

- `npm run check` -- expected: lint, typecheck, vitest đều qua
- `npm run staff:hash -- matkhau123` -- expected: in chuỗi `scrypt$...` có thể dán vào `STAFF_ACCOUNTS`
