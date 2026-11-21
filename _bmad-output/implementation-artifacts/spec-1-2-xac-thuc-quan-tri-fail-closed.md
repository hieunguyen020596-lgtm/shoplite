---
title: 'Story 1.2: Xác thực quản trị Fail-Closed & Bảo vệ tuyến /admin/*'
type: 'feature'
created: '2026-11-21'
status: 'done'
baseline_commit: '8bc8ec2a8e3ec27ce842527757ca256f4db72df4'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/README.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-shoplite-2026-11-21/ARCHITECTURE-SPINE.md'
---

# Story 1.2: Xác thực quản trị Fail-Closed & Bảo vệ tuyến `/admin/*`

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** ShopLite hiện chưa có bất kỳ cơ chế xác thực nào cho khu vực vận hành `/admin/*` và `/api/admin/*`, đồng thời Next.js 16 sử dụng quy ước `src/proxy.ts` thay cho `middleware.ts`. Nếu không khóa Fail-Closed ngay ở lớp auth và proxy, mọi tuyến quản trị có nguy cơ bị truy cập trái phép hoặc lộ lỗi cấu hình khi thiếu `ADMIN_PASSCODE`.

**Approach:** Xây dựng module dùng chung `src/features/orders/admin-auth.ts` (kiểm tra cấu hình `ADMIN_PASSCODE`, băm `SHA-256` + `crypto.timingSafeEqual`, ký/xác thực cookie `HMAC-SHA256` 8 giờ), gắn `src/proxy.ts` (Next.js 16 Node runtime, không dùng `export const runtime`) để chuyển hướng `/admin/*`, và tạo cặp endpoint `POST /api/admin/auth/login` + `POST /api/admin/auth/logout` theo chuẩn `ApiErrorBody`.

## Boundaries & Constraints

**Always:**
- Tuân thủ tuyệt đối `AD-3`, `AD-8`, `AD-10`: ưu tiên kiểm tra `isAdminConfigured()` trả `503` (`ADMIN_NOT_CONFIGURED`) trước mọi kiểm tra `401` (`UNAUTHORIZED`) hoặc `400` (`VALIDATION_ERROR`) (ngoại trừ `/logout`).
- Luôn băm `SHA-256` (32 byte) hai vế trước khi gọi `crypto.timingSafeEqual` cho cả so sánh mật khẩu và xác thực chữ ký `HMAC-SHA256` để không bao giờ ném `RangeError` (`500`).
- Sử dụng đúng quy ước Next.js 16 (`src/proxy.ts` xuất `export function proxy(request: NextRequest)` và `export const config = { matcher: ["/admin/:path*"] }`, tuyệt đối không tạo `middleware.ts` hay khai báo `export const runtime`).
- Mọi thông báo lỗi bằng tiếng Việt có dấu, không bao giờ làm lộ giá trị `ADMIN_PASSCODE` ra response hay log.

**Never:**
- Không đặt bất kỳ mật khẩu mặc định hay fallback nào khi `ADMIN_PASSCODE` trống hoặc chỉ có khoảng trắng.
- Không chặn `/admin/login` trong `src/proxy.ts` (tránh vòng lặp redirect vô hạn) và không yêu cầu cookie còn hạn khi gọi `POST /api/admin/auth/logout`.
- Không tạo UI `/admin/login` hoặc `/admin/orders` trong Story 1.2 (thuộc Epic 3); không đọc hay sửa `.env.local` trong repo.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| :--- | :--- | :--- | :--- |
| Thiếu `ADMIN_PASSCODE` (`undefined` / `""` / `"   "`) | Gọi `POST /api/admin/auth/login` (kể cả body sai/rỗng) hoặc `assertAdminRequest(req)` | Không chấp nhận đăng nhập hay xác thực | HTTP `503`, `error.code = "ADMIN_NOT_CONFIGURED"` |
| Body login không hợp lệ | `ADMIN_PASSCODE` đã đặt; body không phải JSON, thiếu `passcode`, không phải string, hoặc `"   "` | Từ chối đầu vào | HTTP `400`, `error.code = "VALIDATION_ERROR"` |
| Sai mật khẩu (khác hoặc cùng độ dài byte) | `ADMIN_PASSCODE="alpha-123"`; gửi `{ passcode: "wrong" }` hoặc `{ passcode: "alpha-123 " }` | Từ chối không ném `RangeError` | HTTP `401`, `error.code = "UNAUTHORIZED"` |
| Đăng nhập thành công | `ADMIN_PASSCODE="  secret-pass  "`; gửi `{ passcode: "secret-pass" }` | HTTP `200 { ok: true }`; `Set-Cookie: shoplite_admin=<expMs>.<hmac>; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800` (+ `; Secure` khi `NODE_ENV==="production"`) | N/A |
| `verifyAdminSessionToken` & `assertAdminRequest` | Token hợp lệ vs hết hạn (`nowMs > exp`) vs sai chữ ký / sai định dạng vs thiếu token | Hợp lệ → `"valid"` / không ném lỗi; hết hạn/giả mạo → `"expired"`; thiếu → `"missing"`; thiếu env → `"unconfigured"` | `assertAdminRequest` ném `OrderError` `503` (`unconfigured`) hoặc `401` (`missing`/`expired`) |
| `src/proxy.ts` bảo vệ `/admin/*` | Request `/admin/login` vs `/admin/orders` (thiếu env / thiếu cookie / cookie hết hạn hoặc giả mạo / cookie hợp lệ) | `/admin/login` và cookie hợp lệ → `NextResponse.next()`; thiếu env hoặc thiếu cookie → `307` `/admin/login`; có cookie nhưng hết hạn/sai chữ ký → `307` `/admin/login?expired=1` | N/A |
| Đăng xuất `POST /api/admin/auth/logout` | Không cookie, cookie hết hạn, hoặc thiếu `ADMIN_PASSCODE` | Luôn trả HTTP `200 { ok: true }`, `Set-Cookie: shoplite_admin=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0` | N/A |

</frozen-after-approval>

## Code Map

- `src/features/orders/order-errors.ts` -- Đã bổ sung sẵn `UNAUTHORIZED` (`401`) và `ADMIN_NOT_CONFIGURED` (`503`) từ Story 1.1; tái sử dụng nguyên trạng `new OrderError(code, message, details?)`.
- `src/lib/http.ts` -- Tái sử dụng `handleRouteError`, `jsonError`, `readJsonBody`.
- `src/features/orders/admin-auth.ts` -- *[Tạo mới]* Chứa `ADMIN_COOKIE_NAME`, `ADMIN_SESSION_TTL_SECONDS`, `isAdminConfigured`, `verifyAdminPasscode`, `createAdminSessionToken`, `verifyAdminSessionToken`, `assertAdminRequest`, và helper tạo cookie `Set-Cookie` (không import `next/*` hay `react`).
- `src/proxy.ts` -- *[Tạo mới]* Next.js 16 Proxy (`export function proxy`, `config.matcher = ["/admin/:path*"]`) gọi `verifyAdminSessionToken` từ `admin-auth.ts`.
- `src/app/api/admin/auth/login/route.ts` -- *[Tạo mới]* `POST` handler kiểm tra `isAdminConfigured()` (`503`) → JSON/Zod (`400`) → `verifyAdminPasscode` (`401`) → phát cookie `shoplite_admin` (`200`).
- `src/app/api/admin/auth/logout/route.ts` -- *[Tạo mới]* `POST` handler luôn trả `200 { ok: true }` + xóa cookie `Max-Age=0`.
- `src/features/orders/admin-auth.test.ts`, `src/proxy.test.ts`, `src/app/api/admin/auth/route.test.ts` -- *[Tạo mới]* Bộ unit & route test chạy dưới `@vitest-environment node`, tự lưu/khôi phục `process.env.ADMIN_PASSCODE` và `NODE_ENV` sau mỗi ca test.

## Tasks & Acceptance

**Execution:**
- [x] `src/features/orders/admin-auth.ts` -- Cài đặt logic mật khẩu `ADMIN_PASSCODE`, `SHA-256` + `crypto.timingSafeEqual`, token `<expiresAtEpochMs>.<hmacSha256Hex>`, `verifyAdminSessionToken`, `assertAdminRequest`, và tạo chuỗi `Set-Cookie` -- Cung cấp nguồn chân lý xác thực duy nhất theo `AD-8` / `AD-10`.
- [x] `src/proxy.ts` -- Cài đặt Next.js 16 Proxy bảo vệ `/admin/:path*` (bỏ qua `/admin/login`, redirect `307` về `/admin/login` hoặc `/admin/login?expired=1`) -- Bảo vệ tầng trang mà không vi phạm quy định Next.js 16 runtime.
- [x] `src/app/api/admin/auth/login/route.ts` và `src/app/api/admin/auth/logout/route.ts` -- Tạo 2 route handler `POST` đăng nhập fail-closed (`503 → 400 → 401 → 200`) và đăng xuất (`200`) -- Hoàn thiện API phiên quản trị cho Story 1.3 và Epic 3.
- [x] `src/features/orders/admin-auth.test.ts`, `src/proxy.test.ts`, `src/app/api/admin/auth/route.test.ts` -- Viết unit/route test (`@vitest-environment node`) phủ 100% I/O & Edge-Case Matrix -- Kiểm chứng fail-closed `503`/`401`, cookie flags, timing-safe và redirect `307`.

**Acceptance Criteria:**
- Given `npm run check` chạy sau khi hoàn tất 4 task trên, when ESLint, `next typegen && tsc --noEmit`, và Vitest chạy xong, then toàn bộ 159 tests trước đó và tất cả test mới của Story 1.2 pass 100%, không còn file `next-env.d.ts` bẩn ngoài phạm vi.

## Implementation Notes

- Hoàn thành triển khai `admin-auth.ts`, `src/proxy.ts` (Next.js 16), `/api/admin/auth/login`, `/api/admin/auth/logout` và 3 file test Node.
- `npm run check` (gồm `eslint`, `next typegen && tsc --noEmit`, `vitest run`) pass 100%: 16 test files, 186/186 tests (159 cũ + 27 mới), đã hoàn tác `next-env.d.ts`.
- Sau vòng review 3 lớp (`step-04-review`), đã vá: `extractAdminSessionToken` bỏ qua cookie rỗng đứng trước & bóc ngoặc kép RFC 6265, kiểm tra `Number.isFinite(nowMs)` & hex 64 ký tự trong `verifyAdminSessionToken`/`createAdminSessionToken`, chặn `;`/`\r`/`\n` trong cookie header, chuẩn hóa `/admin/login/` trên `src/proxy.ts`, gắn `Cache-Control: no-store`, và bổ sung các ca test biên (gồm kiểm tra `error.details` ở `POST /api/admin/auth/login`); chạy lại `npm run check` pass 100% (`16/16` files, `189/189` tests).

## Spec Change Log

## Review Triage Log

| Layer | Location | Verdict & Route | Evidence / Note |
| :--- | :--- | :--- | :--- |
| `blind-hunter` | `admin-auth.ts:562-600`, `proxy.ts:808-812` | **false** *(reject)* | `AD-10` khóa kiểu trả về của `verifyAdminSessionToken` đúng 4 giá trị `"valid" \| "expired" \| "missing" \| "unconfigured"`, và `AD-8` quy định cookie hết hạn hoặc sai chữ ký đều chuyển hướng `/admin/login?expired=1`. |
| `blind-hunter` | `proxy.ts:796-813` | **false** *(reject, trừ `/`)* | Không tự chuyển hướng khi đã login ở `/admin/login` hay thêm `?next=`/`unconfigured` vì trái I/O Matrix đã khóa (`"307 /admin/login"`) và `/admin/login` tự kiểm tra `isAdminConfigured()` ở Server Component; riêng trailing slash `/admin/login/` gộp sửa cùng `edge-case-hunter #2`. |
| `blind-hunter` | `admin-auth.ts:507-511` | **false** *(reject)* | Đánh đổi HMAC không trạng thái dùng trực tiếp `ADMIN_PASSCODE` đã được PM chốt tại `PRD §4.3 FR-11` và `AD-8` / `Deferred #2`. |
| `blind-hunter` | `admin-auth.ts:524-536,670-672` | **false** *(reject)* | Thuộc tính `Secure` khi `NODE_ENV === "production"` nằm trong yêu cầu bắt buộc của `PRD FR-9`, `AD-8` và I/O Matrix; local dev chạy `npm run dev` (`development`) hoạt động bình thường trên HTTP. |
| `blind-hunter` | `admin-auth.ts:603-635` | **low** → `patch` | Đúng: `extractAdminSessionToken` dừng sớm nếu gặp `shoplite_admin=` rỗng đứng trước và chưa xử lý bỏ ngoặc kép RFC 6265. Sửa `continue` khi rỗng và bỏ ngoặc kép bao ngoài. |
| `blind-hunter` | `login/route.ts:19-61`, `logout/route.ts:72-76` | **false** *(reject)* | Rate-limit RAM bị loại ở `PRD §5 #4`; kiểm tra `Origin`/`Referer` trên `/logout` sẽ phá vỡ quy tắc luôn trả `200` khi gọi bằng CLI/test không kèm `Origin`. |
| `blind-hunter` | `login/route.ts`, `logout/route.ts`, `proxy.ts` | **low** → `patch` | Đúng: thêm `Cache-Control: no-store` cho phản hồi login, logout và chuyển hướng auth của `proxy.ts` để tránh cache trạng thái phiên. |
| `blind-hunter` | `admin-auth.ts:552-559,580-598` | **medium** → `patch` | Đúng: nếu truyền `nowMs = NaN`/`Infinity` vào `verifyAdminSessionToken`, phép so sánh `NaN > expiresAtEpochMs` trả `false` làm vượt qua kiểm tra hết hạn; kiểm tra `!Number.isFinite(nowMs)` và `/^[0-9a-f]{64}$/i.test(signatureHex)`. |
| `blind-hunter` | Tests & chưa gắn `/api/admin/orders/*` | **low** → `patch` / `defer` | Bổ sung unit test cho `extractAdminSessionToken`, `expiresAtEpochMs` tràn `MAX_SAFE_INTEGER`, payload không phải object ở `/login`, `/admin` & `/admin/orders/123` ở `proxy.test.ts`; phần gắn lên `/api/admin/orders/*` defer sang Story 1.3/3.1. |
| `edge-case-hunter` | `admin-auth.ts:141-143` | **low** → `patch` | Trùng nguyên nhân gốc với `blind-hunter #5`: bỏ qua cookie rỗng thay vì `return undefined` sớm. |
| `edge-case-hunter` | `proxy.ts:9` | **low** → `patch` | Đúng: chuẩn hóa bỏ dấu `/` cuối trước khi so sánh `/admin/login` để phòng vòng lặp redirect nếu bật `trailingSlash`. |
| `edge-case-hunter` | `admin-auth.ts:112` | **medium** → `patch` | Trùng nguyên nhân gốc với `blind-hunter #8`: chặn `nowMs` không hữu hạn (`!Number.isFinite(nowMs)`). |
| `edge-case-hunter` | `admin-auth.ts:41-53` | **low** → `patch` | Đúng: thêm kiểm tra chặn `;`, `\r`, `\n` trong `buildAdminCookieHeader` phòng cookie/header injection. |
| `verification-gap` | `src/app/api/admin/auth/route.test.ts:70-87` | **low** → `patch` | Đúng (pre-verified): thiếu assertion kiểm tra `error.details.passcode` cho các payload sai schema ở `POST /api/admin/auth/login`. Đã gộp vào danh sách patch test cùng `blind-hunter #9`. |
| `verification-gap` *(scope)* | `/api/admin/orders/*`, `/admin/login` | **medium** → `defer` | `assertAdminRequest` chưa gắn lên `/api/admin/orders/*` và chưa có UI `/admin/login` vì thuộc Story 1.3, 2.1 và Epic 3 theo `epics.md`. Ghi vào `deferred-work.md`. |

## Verification

**Commands:**
- `npm run check` -- expected: ESLint, `next typegen && tsc --noEmit`, và toàn bộ Vitest suite (cũ + mới) pass 100%.
