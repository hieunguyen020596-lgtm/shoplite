---
title: 'Story 1.3: Nền cấu hình, log an toàn và ranh giới lớp'
type: 'feature'
created: '2026-11-21'
status: 'done'
route: 'dispatch'
baseline_commit: '554715749cac7bbaedd508e513bf64d8de30220c'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Env chưa được kiểm khi khởi động, lỗi server có thể lộ dữ liệu qua log, và chưa có gì chặn import sai lớp. Route spike của Story 1.2 cũng đang trừ kho không xác thực.

**Approach:** Xóa spike, mở rộng `getServerEnv()`, chặn khởi động bằng `instrumentation`, làm sạch lỗi DB thành `DbFailure`, thêm một đường log an toàn và ESLint ranh giới lớp theo AD-1, AD-3, AD-31.

## Boundaries & Constraints

**Always:** Trong `src/`, chỉ `src/lib/env.ts` đọc `process.env`, trừ `NODE_ENV`, `NEXT_RUNTIME`. Log chỉ ghi `scope`, `name`, `code` hoặc `sqlState`. `server.ts`, `*.pg.ts`, `src/db/**`, `lib/env.ts` mở đầu bằng `import "server-only"`. `OrderError` đi qua `runInTransaction`/`withDb` nguyên vẹn.

**Never:** Không sửa `.env` và không tạo lại `.env.local`. Không in giá trị env, `message`, `stack` hay object lỗi DB. Không thêm dependency, kể cả package `server-only`. Không dùng `throw` để chặn khởi động. Không chuyển đơn sang PostgreSQL, không thêm bảng hay migration.

**Quyết định (landv ủy quyền chọn phương án bảo thủ, 2026-11-21):**
- Xóa cả `src/app/api/spike/` và `scripts/spike-race.mjs`, vì script chỉ phục vụ route này.
- `TEST_DATABASE_URL` và `STAFF_ACCOUNTS` là tùy chọn với app. `getServerEnv()` giữ `STAFF_ACCOUNTS` dạng chuỗi, không parse JSON; `staff:seed` tự kiểm ở Epic 4.
- `replace_me` ngoài production không hợp lệ cho `ORDER_ACCESS_SECRET` (dưới 32 byte) nên app báo đúng tên biến. Ở production, `replace_me` bị coi là thiếu với mọi biến.
- `ORDERS_FILE` của kho JSON cũ được đọc qua hàm riêng `getOrdersFile()` trong `env.ts`, không đi qua `getServerEnv()`, để import `orders/server.ts` không kiểm env.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Env hợp lệ | Đủ biến bắt buộc | `getServerEnv()` trả cấu hình đã parse và cache | N/A |
| Thiếu hoặc sai biến | Thiếu `BANK_NAME`, secret dưới 32 byte | `register` log chỉ tên biến rồi `process.exit(1)` | Không `throw`, không in giá trị |
| Placeholder production | `NODE_ENV=production`, một biến là `replace_me` | Bị coi là thiếu | Như trên |
| Hops production | Thiếu, `0` hoặc sai định dạng | Không khởi động | Như trên |
| Hops ngoài production | Thiếu | Giá trị là `0` | N/A |
| Lỗi DB | Driver ném lỗi có `code` SQL | `DbFailure` chỉ có `sqlState`, message `Database operation failed`, không `cause` | `handleRouteError` trả 500 đã làm sạch |
| `OrderError` trong transaction | Service ném `OrderError` | Đi qua nguyên vẹn, transaction rollback | N/A |
| Import sai lớp | `src/app` import `src/db`; `"use client"` import `*.pg.ts` hoặc `server.ts` | `npm run lint` đỏ | N/A |

</frozen-after-approval>

## Code Map

- `src/app/api/spike/`, `scripts/spike-race.mjs` -- xóa.
- `src/lib/env.ts` -- mở rộng, thêm `getOrdersFile()`, tách hàm parse thuần để test.
- `src/instrumentation.ts` (mới) -- `register` chỉ chạy khi `NEXT_RUNTIME === "nodejs"`. Không được làm `next build` thoát.
- `src/lib/safe-log.ts` (mới) -- `logServerError(scope, error)`.
- `src/db/transaction.ts` -- thêm `withDb`, `DbFailure`, làm sạch lỗi. `src/db/client.ts` -- `on("error")` chỉ log `sqlState`.
- `src/lib/http.ts:22` -- bỏ `console.error(error)`, dùng `logServerError`.
- `src/features/orders/order-errors.ts` -- thêm `UNAUTHORIZED` 401, `FORBIDDEN` 403, `RATE_LIMITED` 429, `LOOKUP_FAILED` 404, `REFUND_OUTCOME_CONFLICT` 409. File này không import gì.
- `src/features/orders/server.ts:11` -- dùng `getOrdersFile()`, thêm `import "server-only"`.
- `eslint.config.mjs` -- `no-restricted-imports`, `no-restricted-syntax`.
- `vitest.config.mts` -- alias `server-only` sang stub rỗng.
- `.env.example` -- đã đủ biến, chỉ sửa nếu thiếu.

## Tasks & Acceptance

**Execution:**
- [x] `src/app/api/spike/`, `scripts/spike-race.mjs` -- xóa -- quyết định ở Story 1.2.
- [x] `src/lib/env.ts`, `src/lib/env.test.ts`, `src/instrumentation.ts` -- parse, chặn khởi động, test ma trận env -- AD-31.
- [x] `src/lib/safe-log.ts`, `src/lib/safe-log.test.ts`, `src/lib/http.ts` -- log an toàn -- AD-3.
- [x] `src/db/transaction.ts`, `src/db/client.ts`, `src/db/transaction.test.ts` -- `DbFailure`, `withDb`; test phần làm sạch lỗi bằng hàm thuần, không fake transaction -- AD-3, AD-30.
- [x] `src/features/orders/order-errors.ts`, `src/features/orders/server.ts` -- mở rộng mã lỗi, đọc env đúng chỗ.
- [x] `eslint.config.mjs`, `src/lint-boundaries.test.ts`, `vitest.config.mts` -- rule và test bằng API `ESLint` chứng minh import sai làm lint đỏ -- AD-1.

**Acceptance Criteria:**
- Given mã nguồn sau story, when grep `process.env` trong `src`, then chỉ thấy `src/lib/env.ts` và các lần đọc `NODE_ENV`, `NEXT_RUNTIME`.
- Given một server thật, when thiếu biến bắt buộc, then tiến trình thoát mã 1 và log không chứa giá trị env.

### Review Findings

Code review Epic 1, 2026-11-21, đối chiếu tại `8a722dc`.

- [x] [Review][Patch] P7. Rule `src/app` không chặn import có đuôi `.pg.ts` [eslint.config.mjs:28]
- [x] [Review][Patch] P10. Test log chuỗi bí mật đọc nhầm log đầu tiên nên không kiểm gì [src/lib/safe-log.test.ts:6]
- [x] [Review][Patch] P11. Assertion `JSON.stringify(out)` không thấy message, stack, cause của Error [src/db/transaction.test.ts:31]
- [x] [Review][Patch] P12. Test tên `*.pg` thực tế lint `@/db/client` [src/lint-boundaries.test.ts:65]
- [x] [Review][Patch] P14. Thiếu test `register()` gọi kiểm env đúng runtime [src/instrumentation.ts:2]
- [x] [Review][Patch] P15. Thiếu test `handleRouteError` thật sự ghi log lỗi 500 [src/lib/http.ts:28]

**Rejected**

- low: `import()` động qua lint — đã có trong deferred-work.
- low: `schema.ts` thiếu `server-only` — đã có trong deferred-work, chờ landv xác nhận.
- false: mock transaction che rollback — rollback được chứng minh bằng test DB thật.
- false: mọi lỗi thành `DbFailure` — đúng hợp đồng của spec.
- low: `DbFailure` mất mã ECONN — spec chỉ cho giữ sqlState.
- low: `DATABASE_URL` sai định dạng — lỗi rõ ở truy vấn đầu.
- low: secret có khoảng trắng đệm — cấu hình cố ý sai, hiếm gặp.
- low: `TRUSTED_PROXY_HOPS` quá lớn — rơi về `unknown`, thuộc D3.
- low: placeholder ở biến tùy chọn — chưa có luồng dùng.
- false: `src/db` phụ thuộc `OrderError` — AD-1 cho phép `order-errors.ts`.

## Implementation Notes

- Đã xóa route spike và `scripts/spike-race.mjs`. Bằng chứng cổng spike nằm ở spec Story 1.2 và commit `5547157`.
- **Lệch có chủ ý so với phần frozen:** `src/db/schema.ts` không có `import "server-only"`, vì `drizzle-kit` nạp file này ngoài Next và package `server-only` không được cài. File chỉ chứa định nghĩa bảng. Cần landv xác nhận.
- `.env` đang có `TRUSTED_PROXY_HOPS=0`, nên `npm run start` ở production thoát mã 1 đúng theo AD-31. `npm run dev` không bị ảnh hưởng. Khi chạy production cục bộ cần đặt biến này từ 1 trở lên.
- Kết quả trên Node 22.23.4: `npm run check` xanh (114/114), build đạt, năm trang trả 200, route spike trả 404. Thiếu `BANK_NAME`, hops `0` hoặc `abc` đều thoát mã 1, log chỉ có tên biến, không có giá trị env.

## Spec Change Log

## Review Triage Log

| Phát hiện | Verdict | Route | Bằng chứng |
|---|---|---|---|
| File `"use client"` import được `src/db` | high | patch | Đã thêm selector và test |
| Rule `server` chặn nhầm `next/server`, bỏ sót `./server.ts` | medium | patch | Đã giới hạn đường dẫn, có test |
| `"use client"` kéo module server qua `export ... from` | medium | patch | Đã phủ, có test |
| Mã Node như `EPIPE` thành `sqlState` | medium | patch | Chỉ nhận lỗi có `severity`, có test |
| `TRUSTED_PROXY_HOPS` quá lớn được chấp nhận | medium | patch | Đã kiểm `Number.isSafeInteger` |
| Thiếu test wrapper transaction, `handleRouteError`, `exitIfEnvInvalid` | medium | patch | Đã thêm test |
| `schema.ts` thiếu `server-only` | medium | defer | Thêm sẽ làm `drizzle-kit` vỡ; cần landv xác nhận ngoại lệ |
| `import()` động và `require` qua được rule ranh giới | low | defer | Repo chưa có cách dùng này; `server-only` vẫn chặn khi build |
| Handler `pool.on("error")` chưa có test | low | defer | Lớp mỏng trên hai hàm đã test |
| Race và rollback không còn được kiểm sau khi xóa spike | medium | defer | Test DB thật đến ở Story 1.5 và 1.7 |
| `src/db` import `OrderError` | false | reject | AD-3 yêu cầu `OrderError` đi qua nguyên vẹn; `order-errors.ts` không import gì |
| `replace_me` so khớp chuỗi con | low | reject | Chủ đích chặn cả placeholder độn cho đủ độ dài |
| Lỗi lập trình bị gói thành `DbFailure` | low | reject | AD-3 ưu tiên không lộ lỗi thô |
| `getDb` cần đủ env | low | reject | App đã chặn khởi động khi thiếu env; script tự tạo `pg.Client` theo AD-31 |
| `ORDERS_FILE` rỗng | low | reject | Hành vi cũ, kho JSON sẽ bị thay ở Story 1.7 |
| Getter ném lỗi trong `logServerError` | low | reject | Không có đường tạo lỗi như vậy trong repo |
| Log env không đi qua `logServerError` | false | reject | AD-31 quy định log tên biến riêng khi chặn khởi động |
| `process.exit` làm chết `next dev` khi env sai | false | reject | Đúng hành vi chặn khởi động của AD-31 |
| `server-only` chưa khai báo trong `package.json` | false | reject | Next tự xử lý; build đạt và spec cấm thêm dependency |

## Verification

**Commands:**
- `npm run check` -- expected: xanh.
- `npm run build` -- expected: thành công; khôi phục `next-env.d.ts` nếu build tự đổi.
- `npm run start` với env đầy đủ -- expected: `/`, `/products`, `/cart`, `/checkout`, `/orders` trả 200.
- `npm run start` với `BANK_NAME=` rỗng -- expected: thoát mã 1, log có tên `BANK_NAME`, không có giá trị env.
