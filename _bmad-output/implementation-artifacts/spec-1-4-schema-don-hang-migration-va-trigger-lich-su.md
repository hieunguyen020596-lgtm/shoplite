---
title: 'Story 1.4: Schema đơn hàng, migration và trigger Lịch sử'
type: 'feature'
created: '2026-11-21'
status: 'done'
route: 'dispatch'
baseline_commit: '9766185c2a56cb1bb795460db43f85b3b957dab2'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-shoplite-2026-11-21/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** PostgreSQL mới có bảng `inventory`, chưa có nơi lưu đơn, dòng hàng và Lịch sử không sửa được.

**Approach:** Mở rộng `src/db/schema.ts` theo ERD và AD-12, tạo migration chỉ đi tiến kèm trigger append-only, thêm `npm run db:migrate` và `scripts/schema-smoke.ts` chạy bằng `scripts/ts-hooks.mjs`.

## Boundaries & Constraints

**Always:** Thời gian là `timestamptz(3)`, tiền là `integer` VND, ID nội bộ `bigint` identity `mode: "number"`. `orders.version integer NOT NULL DEFAULT 0`. `order_status_history.created_at` mặc định `clock_timestamp()`. CHECK theo từng `event_type` đúng AD-12. CHECK `NOT refund_required OR (status = 'cancelled' AND payment_method = 'bank_transfer')`. Migration tạo bằng `drizzle-kit generate`, trigger bằng `drizzle-kit generate --custom`. Script tự tạo `pg.Client`, không qua `getServerEnv()`.

**Never:** Không dùng `drizzle-kit push`, không sửa migration `0000`. Không đổi `tsconfig.json`, không thêm dependency. Không sửa `.env`, `.env.example`, không tạo lại `.env.local`. Không chuyển code đơn sang PostgreSQL. Không chạm `shoplite_test` hay `storage/orders.json`. Script kiểm không để lại dữ liệu.

**Quyết định (landv ủy quyền chọn phương án bảo thủ, 2026-11-21):**
- Chưa tạo `staff_accounts`, `staff_sessions`, `rate_limits`. `actor_staff_id` là `bigint` chưa có khóa ngoại; Story 4.1 thêm khóa ngoại và index `staff_sessions(account_id)` bằng migration mới.
- `order_items.product_id` có khóa ngoại tới `inventory` với `ON DELETE RESTRICT`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Migrate | Database chưa áp dụng migration mới | Tạo đủ bảng, index, trigger | N/A |
| Migrate lần hai | Không có migration mới | Không đổi gì, exit 0 | N/A |
| Thiếu `DATABASE_URL` | Biến rỗng hoặc không có | Log tên biến, exit 1 | Không in giá trị |
| Sửa Lịch sử | `UPDATE` hoặc `DELETE` trên `order_status_history` | Bị từ chối | Lỗi từ trigger |
| `refund_required` sai | `true` với đơn không phải `cancelled` + `bank_transfer` | Bị CHECK từ chối | N/A |
| Tồn âm | `stock = -1` | Bị CHECK từ chối | N/A |
| Sự kiện sai loại | `order_created` có `from_status` hoặc actor `staff` | Bị CHECK từ chối | N/A |

</frozen-after-approval>

## Code Map

- `src/db/schema.ts` -- thêm `orders`, `order_items`, `order_status_history`, index tối thiểu ở ERD (trừ `staff_sessions`). File không có `server-only`, theo ngoại lệ ở Story 1.3.
- `src/features/orders/types.ts`, `src/features/checkout/checkout-schema.ts`, `src/features/checkout/pricing.ts` -- nguồn giá trị `status`, `payment_method`, `shipping_method`. Chỉ đọc.
- `drizzle/` -- thêm migration mới; `0000_fancy_quicksilver.sql` đã áp dụng trên `shoplite_dev`.
- `scripts/ts-hooks.mjs` (mới) -- `module.registerHooks` theo AD-31.
- `scripts/db-migrate.ts` (mới) -- migrator `drizzle-orm/node-postgres`.
- `scripts/schema-smoke.ts` (mới) -- từ chối nếu `current_database()` khác `shoplite_dev`; mọi ca chạy trong transaction và `ROLLBACK`.
- `package.json` -- script `db:migrate`.

## Tasks & Acceptance

**Execution:**
- [x] `src/db/schema.ts`, `drizzle/` -- thêm schema và chạy `drizzle-kit generate` -- ERD, AD-12.
- [x] `drizzle/` -- tạo custom migration trigger `BEFORE UPDATE OR DELETE` -- Lịch sử append-only.
- [x] `scripts/ts-hooks.mjs`, `scripts/db-migrate.ts`, `package.json` -- thêm `db:migrate` -- AD-31.
- [x] `scripts/schema-smoke.ts` -- phủ các dòng ma trận về trigger và CHECK -- chứng minh schema.

**Acceptance Criteria:**
- Given migration đã áp dụng, when đọc catalog PostgreSQL, then có đủ bảng, index, CHECK, trigger và các cột thời gian đều có precision 3.
- Given smoke script chạy xong, when đếm `orders`, `order_items`, `order_status_history`, `inventory`, then số dòng không đổi.

### Review Findings

Code review Epic 1, 2026-11-21, đối chiếu tại `8a722dc`.

- [x] [Review][Patch] P4. [medium] `osh_event_shape` nhận `order_created` có `to_status = NULL`, đã tái hiện trên shoplite_test; sửa bằng migration mới [drizzle/0003_order_created_reason_null.sql:5]
- [x] [Review][Patch] P13. Hai ca smoke vẫn truyền reason nên pass sai lý do [scripts/schema-smoke.ts:291]
- [x] [Review][Patch] P16. Ma trận CHECK/FK chỉ nằm trong script thủ công, chưa chạy trong `test:db` [scripts/schema-smoke.ts:1]
- [x] [Review][Defer] Chưa có cổng phát hiện `schema.ts` lệch migration [src/db/schema.ts:1] — deferred: cần thiết kế bước kiểm `drizzle-kit` không để lại file trong repo

**Rejected**

- low: CHECK công thức tiền — đã có trong deferred-work.
- low: nhiều dòng `order_created` — writer duy nhất chèn đúng một dòng.
- low: `TRUNCATE` qua append-only — spec chỉ yêu cầu UPDATE, DELETE.
- low: nhánh refund và status_changed còn lỏng — chưa có writer đến Epic 4.
- false: migration 0003 kẹt vì dòng cũ — chưa có writer trước Story 1.7.
- low: catalog smoke chỉ kiểm tên index — định nghĩa hiện đúng.
- low: lỗi kết nối thô trong script dev — chỉ xuất hiện trên máy dev.
- low: URL hỏng ném trước `try` — chỉ ảnh hưởng script dev.
- low: `--env-file-if-exists` khác AD-31 — cách sửa là sửa tài liệu.
- low: lặp helper trong `db-migrate.ts` — chưa gây lệch.

## Implementation Notes

- Bản đầu của `0001` bắt `reason_code`, `reason_text` của `order_created` là NOT NULL, trái AD-12. Vì `0001` đã áp dụng trên `shoplite_dev`, lỗi được sửa bằng migration tiến `0003`.
- Danh sách `status`, `payment_method`, `shipping_method` trong CHECK được ghi cứng vì `drizzle-kit` không resolve alias `@/`.
- Kết quả trên Node 22.23.4: `npm run check` xanh (114/114). `db:migrate` hai lần exit 0, số migration giữ ở 4. Smoke đạt mọi ca, số dòng bốn bảng không đổi. Database tạm trống migrate từ đầu thành công và đã xóa. `DATABASE_URL` rỗng thoát mã 1, chỉ log tên biến. `drizzle-kit generate` báo không có thay đổi.

## Spec Change Log

## Review Triage Log

| Phát hiện | Verdict | Route | Bằng chứng |
|---|---|---|---|
| `order_created` bắt buộc `reason_*` trái AD-12 | high | patch | Đã sửa bằng migration `0003`, smoke có ca phủ |
| Lỗi kết nối bị in thành `sqlState` | low | patch | Chỉ nhận lỗi có `severity` |
| Thiếu `.env` làm Node dừng trước thông báo tên biến | medium | patch | Dùng `--env-file-if-exists` |
| Smoke đếm cứng số cột thời gian | low | patch | Đã đổi cách kiểm |
| Smoke chưa phủ hết constraint | medium | patch | Thêm 13 ca |
| CHECK và hằng TypeScript có thể lệch nhau | medium | defer | Chưa có test so hai nguồn |
| Không có CHECK cho công thức tiền | medium | defer | AD không yêu cầu; server đang tự tính tiền |
| Smoke không nằm trong `npm run check` | medium | defer | Test DB thật đến ở Story 1.5 |
| Trigger không chặn `TRUNCATE` | false | reject | AD-12 chỉ yêu cầu UPDATE, DELETE; AD-31 cần truncate cho `db:test:prepare` |
| Thiếu trigger `updated_at` | false | reject | AD-8 yêu cầu ghi hoàn tiền không đổi `updated_at` |
| `0003` lỗi khi có dữ liệu cũ | false | reject | `0001` chưa từng có dòng dữ liệu |
| `db:migrate` thiếu guard tên database | low | reject | AD-31 cho script chạy theo `DATABASE_URL` |
| Thiếu index `order_items.product_id` | low | reject | Ngoài index tối thiểu của AD; không có luồng xóa tồn |
| `osh_event_shape` chưa ràng buộc `from <> to` | low | reject | AD-12 không yêu cầu; máy trạng thái ở Epic 3 giữ quy tắc này |
| `ts-hooks.mjs` chưa dùng alias, thiếu map `.js` | false | reject | AC yêu cầu; repo không import đuôi `.js` |
| Smoke làm tăng sequence | low | reject | Không ảnh hưởng dữ liệu hay thứ tự |
| Fixture trùng id | false | reject | Mọi ca chạy trong transaction rồi rollback |

## Verification

**Commands:**
- `npm run check` -- expected: xanh.
- `npm run db:migrate` hai lần trên `shoplite_dev` -- expected: exit 0, lần hai không đổi số migration.
- `node --env-file=.env --import ./scripts/ts-hooks.mjs scripts/schema-smoke.ts` -- expected: mọi ca đạt.
- Chạy `db:migrate` với `DATABASE_URL` trỏ một database tạm trống, rồi xóa database tạm -- expected: toàn bộ migration áp dụng từ đầu.
- Chạy script migrate với `DATABASE_URL=` rỗng -- expected: exit 1, chỉ log tên biến.
