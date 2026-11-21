---
title: 'Story 1.8: Chống đơn ảo theo IP và số điện thoại'
type: 'feature'
created: '2026-11-21'
status: 'done'
route: 'dispatch'
baseline_commit: '2c086badbd1db4012cded81d0c0924018e694c36'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Không có giới hạn tạo đơn, nên một người có thể đặt hàng loạt đơn ảo và giữ hết Tồn kho.

**Approach:** Thêm bảng `rate_limits`, `features/rate-limit`, `getClientIp`, và đưa giới hạn IP cùng giới hạn đơn chờ theo số điện thoại vào transaction của `placeOrder` theo AD-10, AD-25.

## Boundaries & Constraints

**Always:** Chỉ `features/rate-limit` ghi `rate_limits(key, window_started_at, count)`. Chỉ `src/lib/client-ip.ts#getClientIp` đọc header IP. `policies.ts` là nơi duy nhất dựng khóa và ngưỡng, trả `{ key, limit, windowSeconds }`, thành phần người dùng nhập qua `encodeURIComponent`; `order:ip:<ip>` là 10 đơn mỗi giờ. `consume(tx, requests)` upsert theo `key` tăng dần bằng `INSERT ... ON CONFLICT DO UPDATE ... RETURNING`, dùng `now()` của database, cửa sổ neo tại lần đếm đầu, hết cửa sổ thì `count = 1`, trả `receipts[{ key, windowStartedAt }]`, vượt ngưỡng ném `RATE_LIMITED`. `release(tx, receipts)` đúng câu `UPDATE ... SET count = GREATEST(count - 1, 0) WHERE key = $key AND window_started_at = $windowStartedAt`, theo `key` tăng dần. Thứ tự trong transaction: `consume` → `lockPhone` (`pg_advisory_xact_lock`) → `countPendingByPhone` (câu riêng) → `reserveStock` → `insertOrder`. Từ 3 đơn `pending` trở lên thì `RATE_LIMITED`. Mọi lỗi rollback cả bộ đếm. Message `RATE_LIMITED` do service dựng đúng: `Bạn đã đặt quá nhiều đơn. Vui lòng thử lại sau hoặc liên hệ shop qua {số}.`, với số lấy từ `SHOP_CONTACT_PHONE` qua `getServerEnv()` ở `orders/server.ts`. `CheckoutForm` chỉ hiện `error.message`, không đọc env.

**Never:** Không tự retry. Không fake transaction. Không lưu hay log IP, số điện thoại ngoài cột và khóa đã quy định. Không thêm dependency. Không sửa migration cũ, không `drizzle-kit push`. Không sửa `.env`, không tạo lại `.env.local`, không chạm `storage/orders.json`. Test chỉ ghi vào `shoplite_test`. Không chạy `git stash`, `git checkout`, `git restore`, `git rm`, `git reset` hay lệnh đổi index. Không chạy prettier trên cả thư mục.

**Quyết định (landv ủy quyền chọn phương án bảo thủ, 2026-11-21):**
- `release` được cài và test ở story này nhưng `placeOrder` không gọi, vì rollback đã hoàn lượt đếm. Người gọi thật đến ở luồng Tra đơn.
- Migration mới được áp dụng lên `shoplite_dev` bằng `npm run db:migrate`. `shoplite_test` được cập nhật qua `db:test:prepare`.
- `truncateAll` trong `scripts/db-test-lib.ts` thêm `rate_limits`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Hops 0 | Có `x-forwarded-for` | Bucket `direct`, không đọc header | N/A |
| Hops n | Chuỗi đủ phần tử | Phần tử thứ n từ phải | N/A |
| IP lỗi | Thiếu phần tử hoặc không phải IP | `unknown` | N/A |
| IPv4-mapped, IPv6 | `::ffff:1.2.3.4`, IPv6 đầy đủ hoặc rút gọn | `1.2.3.4`, gom `/64` | N/A |
| Ngưỡng IP | Đơn thành công thứ 11 trong 1 giờ | 429 `RATE_LIMITED`, không tạo đơn, không trừ kho | Rollback |
| Hết cửa sổ | Cửa sổ đã quá 1 giờ | Đếm lại từ 1 | N/A |
| Đơn lỗi | Thiếu hàng hoặc lỗi DB | Bộ đếm IP không tăng | Rollback |
| Ngưỡng SĐT | Đã có 3 đơn `pending`, kể cả dạng `+84` | 429, không tạo đơn, không trừ kho | Rollback |
| Race SĐT | Nhiều request cùng số, khác IP | Tối đa 3 đơn `pending` | Rollback |
| Race `consume`/`release` | Chạy song song với đặt đơn | Bộ đếm không sót, không đếm đôi | N/A |

</frozen-after-approval>

## Code Map

- `src/db/schema.ts`, `drizzle/` -- bảng `rate_limits(key text PK, window_started_at timestamptz(3) NOT NULL, count integer NOT NULL)`, tạo bằng `drizzle-kit generate`.
- `src/features/rate-limit/policies.ts`, `rate-limiter.ts`, `rate-limiter.pg.ts`, `server.ts` (mới).
- `src/lib/client-ip.ts` (mới) -- hàm thuần nhận `Headers` và số hops; đọc hops từ `getServerEnv()` ở tầng server.
- `src/features/orders/order-repository.ts`, `order-repository.pg.ts` -- `lockPhone`, `countPendingByPhone`, cùng nhận `tx` đầu tiên.
- `src/features/orders/order-service.ts`, `server.ts` -- `placeOrder(input, { ip })`, deps `rateLimiter`, số shop lazy.
- `src/app/api/orders/route.ts` -- lấy IP rồi gọi service.
- `scripts/db-test-lib.ts` -- truncate thêm `rate_limits`.
- Test DB hiện có -- dùng IP riêng hoặc reset `rate_limits` để không chạm ngưỡng.

## Tasks & Acceptance

**Execution:**
- [x] `src/db/schema.ts`, `drizzle/`, `scripts/db-test-lib.ts` -- bảng và migration.
- [x] `src/lib/client-ip.ts` và test -- nguồn IP.
- [x] `src/features/rate-limit/*` và `*.db.test.ts` -- `consume`, `release`.
- [x] `src/features/orders/*`, `src/app/api/orders/route.ts` -- tích hợp theo thứ tự khóa.
- [x] `*.db.test.ts` -- phủ ngưỡng, rollback và hai ca race.

**Acceptance Criteria:**
- Given mã nguồn, when grep `x-forwarded-for`, then trong code không phải test chỉ có `src/lib/client-ip.ts`.
- Given mã nguồn, when grep `rate_limits` hoặc bảng `rateLimits`, then chỉ `features/rate-limit`, schema, migration và script test chạm vào.

### Review Findings

Code review Epic 1, 2026-11-21, đối chiếu tại `8a722dc`.

- [x] [Review][Patch] D3. [medium] Giữ bucket `unknown` và ghi log cảnh báo an toàn khi không xác định được IP (landv chốt D3A, 2026-11-21) [src/lib/client-ip.ts:63]
- [x] [Review][Patch] P25. Chưa ghim quy tắc chỉ đếm đơn `pending` theo SĐT [src/features/orders/order-repository.pg.ts:68]
- [x] [Review][Patch] P26. Chưa ghim cửa sổ 1 giờ của giới hạn IP [src/features/rate-limit/policies.ts:10]

**Rejected**

- low: dùng SĐT người khác để chặn — quy tắc 3 đơn pending do spec định; đổi cần sửa spec.
- false: request lỗi không bị đếm — spec yêu cầu rollback cả bộ đếm.
- low: dọn `rate_limits` — đã có trong deferred-work.
- low: thiếu CHECK `count >= 0` — chỉ `GREATEST` ghi giảm.
- false: `release` là code chết — spec yêu cầu có sẵn cho luồng sau.
- false: rate-limit import `OrderError` — AD-1 cho phép.
- low: 429 thiếu `Retry-After` — thêm bề mặt API mới.
- low: test DB chạm `rate_limits` — chỉ là fixture.

## Implementation Notes

- Migration `0004_rate_limits` đã áp dụng trên `shoplite_dev`; bảng còn 0 dòng.
- Chạy thật trên `shoplite_test` với `TRUSTED_PROXY_HOPS=1`: cùng số ở dạng `0...` và `+84...` được 3 đơn, đơn thứ 4 trả 429 đúng message và không trừ kho. Một IP được 10 đơn, đơn thứ 11 trả 429 và bộ đếm giữ ở 10; IP khác vẫn đặt được.
- Với `TRUSTED_PROXY_HOPS=0` ở local, mọi khách dùng chung bucket `direct`, nên cả shop chỉ đặt được 10 đơn mỗi giờ khi chạy dev. Đây là thiết kế của AD-25.
- `release` đã cài và test nhưng `placeOrder` không gọi, vì rollback đã hoàn lượt đếm.

## Spec Change Log

## Review Triage Log

| Phát hiện | Verdict | Route | Bằng chứng |
|---|---|---|---|
| Chưa test route truyền IP vào service | medium | patch | Đã thêm test |
| Thông báo 429 chưa kiểm đúng số shop | medium | patch | Assert đúng toàn câu |
| Test route phụ thuộc thứ tự và làm bẩn tồn `p006` | medium | patch | Tự chuẩn bị dữ liệu, khôi phục tồn trong `afterAll` |
| Doc comment `insertOrder` đặt sai chỗ | low | patch | Đã chuyển lại |
| IPv6 có zone id bị parse lỏng | low | patch | Trả `unknown`, có test |
| Ca "đơn lỗi" có thể đạt vô nghĩa | medium | patch | Assert `DbFailure` `23505` và bộ đếm không tăng |
| Tên test giới hạn không đúng nội dung | low | patch | Đã đổi tên |
| `rate_limits` không được dọn | low | defer | AD ghi Deferred đến khi bảng vượt 100.000 dòng hoặc deploy công khai |
| Bucket `direct` dùng chung | false | reject | AD-25 quy định; production bắt buộc hops từ 1 |
| `consume` nên chạy sau cùng | false | reject | Trái thứ tự khóa của AD-10 |
| `release` chưa có người gọi | false | reject | Đã chốt trong spec, luồng Tra đơn sẽ dùng |
| Rate limiter import `OrderError` | false | reject | AD-25 yêu cầu ném `RATE_LIMITED` để rollback |
| Thiếu `Retry-After` và log khi bị chặn | low | reject | AC không yêu cầu; message theo EXPERIENCE |
| NAT64 chưa quy về IPv4 | low | reject | AD chỉ yêu cầu IPv4-mapped |
| `placeOrder` thiếu tham số thứ hai | false | reject | TypeScript bắt buộc; route là người gọi duy nhất |

## Verification

**Commands:**
- `npm run db:migrate` -- expected: áp dụng migration mới trên `shoplite_dev`.
- `npm run check:full` -- expected: xanh.
- `npm run build` -- expected: thành công; báo lại nếu `next-env.d.ts` tự đổi, không tự khôi phục bằng git.
- Chạy app với `DATABASE_URL` của `shoplite_test`, `TRUSTED_PROXY_HOPS=1`, đặt đơn quá ngưỡng -- expected: 429 đúng message.
