---
title: 'Story 1.7: Đặt hàng trừ Tồn kho nguyên tử trong PostgreSQL'
type: 'feature'
created: '2026-11-21'
status: 'done'
route: 'dispatch'
baseline_commit: 'eb1feffebab457891ccab671cc95bfef2818471f'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Đơn vẫn nằm trong file JSON và không trừ Tồn kho, nên hai người có thể cùng mua món cuối.

**Approach:** Chuyển đơn sang PostgreSQL theo AD-2, AD-9, AD-10, AD-12: `placeOrder` tính xong dữ liệu trước transaction, rồi trong đúng một transaction gọi `reserveStock` và `insertOrder` kèm dòng `order_created`. Đóng luồng Khách hàng tự hủy.

## Boundaries & Constraints

**Always:** `createOrderService(deps)` nhận `runInTransaction`, `OrderRepository`, `StockLedger`; singleton chỉ ở `orders/server.ts`. Service không import Drizzle hay `pg`. SQL chỉ ở `*.pg.ts`; chỉ `*.pg.ts` gọi `toDrizzleTx`. Hàm ghi nhận `tx: DbTx` là tham số đầu. Zod, gộp dòng, kiểm tối đa 10 mỗi sản phẩm và tính tiền xong trước khi mở transaction. Trừ kho đúng `UPDATE inventory SET stock = stock - $n WHERE product_id = $id AND stock >= $n`, tuần tự theo `productId` tăng dần (so sánh code unit). `reserveStock` đi hết mọi dòng; dòng thiếu đọc `stock` bằng câu riêng và báo `available = max(0, min(stockĐọcĐược, requested - 1))`, rồi ném `INSUFFICIENT_STOCK` với `details.lines`. `orders.phone_normalized` lưu kết quả `normalizePhone` trong `features/checkout/phone.ts`. Dòng `order_created` đúng CHECK của AD-12: `reason_code`, `reason_text`, `refund_outcome`, `from_status`, `actor_staff_id` đều NULL.

**Never:** Không đọc, ghi, xóa `storage/orders.json`, không chuyển 11 đơn thử. Không tự retry. Không lồng transaction. Không fake transaction trong test. Không `skip` test. Không thêm dependency, bảng hay migration. Không sửa `.env`, không tạo lại `.env.local`. Không chạy `git stash`, `git checkout`, `git restore` hay lệnh đổi index. Không chạy prettier trên cả thư mục. Test chỉ ghi vào `shoplite_test`.

**Quyết định (landv ủy quyền chọn phương án bảo thủ, 2026-11-21):**
- `OrderError.details` được mở rộng để chứa `lines: { productId, requested, available }[]`, vẫn giữ dạng lỗi field hiện có. Form checkout không được vỡ khi nhận `details.lines`; giao diện xử lý từng dòng thuộc Story 1.9.
- `customer.phone` trong `Order` đọc từ `phone_normalized`, vì database chỉ lưu số đã chuẩn hóa.
- Chưa đổi cấu hình Playwright. Không chạy e2e trong story này vì nó sẽ ghi vào `shoplite_dev`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Đặt đơn hợp lệ | Đủ tồn | 201, trừ tồn, có đơn, dòng hàng, đúng một dòng `order_created` | N/A |
| SĐT `+84...` | `+84912345678` | Lưu `0912345678` | N/A |
| Race | Tồn 1, N request đồng thời | Đúng 1 thành công, N-1 `INSUFFICIENT_STOCK`, tồn cuối 0 | Rollback |
| Thiếu một dòng | Đơn nhiều dòng, một dòng thiếu | Không tạo đơn, không trừ dòng nào, `details.lines` đủ dòng thiếu | Rollback |
| Không có dòng tồn | Sản phẩm thiếu `inventory` | `available = 0` | Rollback |
| Quá 10 sau gộp | Hai dòng cùng sản phẩm tổng hơn 10 | 400, chưa mở transaction | N/A |
| Lỗi DB giữa transaction | `insertOrder` lỗi | Đơn, Tồn kho, Lịch sử giữ nguyên | `DbFailure`, 500 đã làm sạch |
| Đơn cuối | Đặt hết tồn rồi đọc catalog | Tồn 0, trang hiện hết hàng | N/A |
| Khách tự hủy | `PATCH /api/orders/:id` bất kỳ | 401 `UNAUTHORIZED`, không đọc DB, không gọi service | N/A |
| Route đọc cũ | `GET /api/orders`, `GET /api/orders/:id`, `/orders/:id` | Đọc từ PostgreSQL | N/A |

</frozen-after-approval>

## Code Map

- `src/features/inventory/stock-ledger.ts`, `stock-ledger.pg.ts`, `server.ts` -- port và `reserveStock`.
- `src/features/orders/order-repository.ts` -- chỉ còn interface async, bỏ `save` và hai repository cũ.
- `src/features/orders/order-repository.pg.ts` (mới) -- `insertOrder(tx, ...)`, `findById`, `findAll` qua `withDb`.
- `src/features/orders/order-service.ts`, `server.ts` -- deps mới, bỏ `readStock`, `cancelOrder`.
- `src/features/orders/order-errors.ts`, `src/lib/http.ts` -- kiểu `details`.
- `src/features/checkout/phone.ts` (mới) -- `normalizePhone(raw): string | null`, idempotent.
- `src/features/checkout/components/*` -- kiểm nơi đọc `error.details`.
- `src/app/api/orders/[id]/route.ts` -- `PATCH` luôn 401, không đọc body.
- `src/app/orders/[id]/page.tsx`, `src/features/orders/components/cancel-order-button.tsx` -- xóa nút hủy.
- `src/lib/env.ts` -- xóa `getOrdersFile`.
- `README.md` -- bỏ mô tả tự hủy đơn và lưu đơn trong JSON nếu có.
- Test: `order-service.test.ts`, `order-repository.test.ts`, `src/app/api/orders/route.test.ts` -- chuyển sang `*.db.test.ts` hoặc thay theo AC.

## Tasks & Acceptance

**Execution:**
- [x] `src/features/checkout/phone.ts` và test -- chuẩn hóa SĐT.
- [x] `src/features/inventory/stock-ledger*` -- `reserveStock` và test DB.
- [x] `src/features/orders/order-repository*` -- repository PostgreSQL và test DB.
- [x] `src/features/orders/order-service.ts`, `server.ts`, `order-errors.ts`, `src/lib/http.ts` -- `placeOrder` trong transaction.
- [x] `src/app/api/orders/[id]/route.ts`, trang đơn, nút hủy, `src/lib/env.ts`, `README.md` -- đóng tự hủy, bỏ kho JSON.
- [x] `*.db.test.ts` -- phủ toàn bộ ma trận, gồm race nhiều kết nối thật.

**Acceptance Criteria:**
- Given mã nguồn, when grep `save(`, `createJsonFileOrderRepository`, `createInMemoryOrderRepository`, `DEFAULT_ORDERS_FILE`, `ORDERS_FILE`, `cancelOrder`, `CancelOrderButton`, then không còn trong `src`.
- Given bộ test, when grep `.skip`, then không có test nào bị skip.

### Review Findings

Code review Epic 1, 2026-11-21, đối chiếu tại `8a722dc`.

- [x] [Review][Patch] P3. [medium] Byte NUL trong id hoặc text làm API trả 500 thay vì 400/404 [src/features/orders/order-repository.pg.ts:123]
- [x] [Review][Patch] P5. [medium] README không còn chạy được trên máy mới, thiếu PostgreSQL, env, migrate, seed, lệnh DB và hợp đồng 409 [README.md:26]
- [x] [Review][Patch] P22. Mất test `ORDER_NOT_FOUND` và 404 của `GET /api/orders/:id` [src/features/orders/order-service.ts:180]
- [x] [Review][Patch] P23. Chưa ghim biên hợp lệ đúng 10 sản phẩm sau gộp dòng [src/features/orders/order-service.ts:107]
- [x] [Review][Patch] P24. Chưa có test thứ tự dòng hàng khi đọc từ DB [src/features/orders/order-repository.pg.ts:46]
- [x] [Review][Patch] P29. Chưa có test đơn cuối làm trang sản phẩm hiện Hết hàng [src/features/orders/order-service.db.test.ts:1]

**Rejected**

- false: `GET /api/orders` lộ dữ liệu là lỗi mới — đã có kế hoạch đóng ở Story 7.1 và cấm triển khai trước đó.
- low: `findAll` không giới hạn — đã có trong deferred-work.
- low: trùng mã đơn 24 bit — khoảng 3% mỗi ngày ở 1.000 đơn, rollback an toàn, khách thử lại được.
- false: `reserveStock` với dòng trùng — service luôn gộp dòng trước.
- false: đơn cũ trong `orders.json` biến mất — spec cấm chuyển dữ liệu này.
- low: chưa test route 500 — `handleRouteError` được test riêng.
- low: CI chưa chạy `check:full` — đã có trong deferred-work.

## Implementation Notes

- Kết quả trên Node 22.23.4: `npm run check:full` exit 0 (127/127 test thường, 25/25 test DB), build đạt, không còn tham chiếu kho JSON hay luồng tự hủy, không có test bị skip.
- Chạy thật trên `shoplite_test`: đặt hết 3 sản phẩm `p011` trả 201, tồn về 0, trang sản phẩm hiện hết hàng, SĐT `+84...` lưu `0912345678`, có đúng một dòng `order_created`. Đặt lại trả 409 kèm `details.lines`. `PATCH` trả 401 và đơn giữ `pending`. Đã kiểm xong tiêu chí "đơn cuối" còn lại từ Story 1.6.
- `storage/orders.json` và dữ liệu `shoplite_dev` không đổi. 11 đơn thử cũ không còn hiện trong app, đúng AD-2.
- E2E chưa chạy vì cấu hình Playwright hiện vẫn dùng `shoplite_dev`.

## Spec Change Log

## Review Triage Log

| Phát hiện | Verdict | Route | Bằng chứng |
|---|---|---|---|
| Thứ tự dòng hàng khác nhau giữa các đường đọc | medium | patch | Dùng `compareProductId` ở `toOrder` |
| Test DB để bẩn tồn | medium | patch | Khôi phục trong `afterAll` |
| Thiếu ca nhiều sản phẩm, danh sách nhiều đơn | medium | patch | Đã thêm test |
| Mất test bỏ qua giá client, round-trip `email`, `note` | medium | patch | Đã thêm test |
| Chưa chứng minh thứ tự khóa chống deadlock | medium | patch | 8 đơn đồng thời đảo thứ tự, không có `40P01` |
| Cấu hình E2E vẫn ghi vào `shoplite_dev` | medium | defer | AD-30 có cấu hình riêng, chưa thuộc story này |
| `findAll` không giới hạn số đơn | low | defer | Route đọc cũ được đóng ở Epic 7 |
| Thông báo thiếu hàng chung chung | medium | defer | Story 1.9 xử lý từng dòng bằng `details.lines` |
| Va chạm mã đơn thành 500 | low | reject | Rất hiếm, AD-10 cấm tự retry, rollback an toàn |
| `reserveStock` không tự kiểm số lượng dương | low | reject | Đường duy nhất đã qua Zod, không tái hiện được |
| `available` có vẻ lạ | false | reject | Đúng công thức AD-9 |
| `PATCH` nên là 403 hoặc 405 | false | reject | AC yêu cầu 401 `UNAUTHORIZED` |
| `inventory` import lỗi từ `orders` | false | reject | AD-1 cho `order-errors.ts` là module không import gì |
| `INVALID_STATUS_TRANSITION` chưa dùng | false | reject | Dành cho luồng nhân viên ở các epic sau |
| Đọc đơn không cùng snapshot | low | reject | Dòng hàng là bản chụp, không đổi sau khi tạo |
| Chuẩn hóa SĐT hai lần | low | reject | Idempotent, không đổi hành vi |

## Verification

**Commands:**
- `npm run check:full` -- expected: xanh.
- `npm run build` -- expected: thành công; báo lại nếu `next-env.d.ts` tự đổi, không tự khôi phục bằng git.
- Chạy app với `DATABASE_URL` của `shoplite_test`, đặt đơn thật qua `POST /api/orders` -- expected: đặt hết tồn thì trang sản phẩm hiện hết hàng, `PATCH` trả 401.
- Checksum `storage/orders.json` trước và sau -- expected: không đổi.
