---
title: 'Story 1.5: Seed Tồn kho và cổng test DB trên PostgreSQL thật'
type: 'feature'
created: '2026-11-21'
status: 'done'
route: 'dispatch'
baseline_commit: 'abc866357c55976aa7e2b5a1b1ee09634f2a5f8e'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Chưa có tồn kho ban đầu trong PostgreSQL và chưa có cách chạy test trên database thật, nên các ca đồng thời ở story sau không kiểm được.

**Approach:** Thêm dữ liệu seed và `db:seed`, bộ test `*.db.test.ts` trên `shoplite_test` với guard tên database, và cổng `npm run check:full`.

## Boundaries & Constraints

**Always:** Seed dùng `ON CONFLICT DO NOTHING`. Script chạy bằng `scripts/ts-hooks.mjs` như `db:migrate`, tự tạo `pg.Client`. Mọi đường test DB query `current_database()` và dừng nếu khác `shoplite_test` trước khi truncate. Reset bằng `TRUNCATE ... RESTART IDENTITY CASCADE`. `vitest.db.config.mts`: môi trường node, `fileParallelism: false`, alias `server-only` sang stub, nạp `.env` bằng `process.loadEnvFile`, `test.env.DATABASE_URL = TEST_DATABASE_URL`. `vitest.config.mts` loại `**/*.db.test.*`. `check:full` = `npm run check && npm run db:test:prepare && npm run test:db`.

**Never:** Không truncate hay ghi test vào `shoplite_dev`. Không in chuỗi kết nối hay giá trị env. Không thêm dependency. Không sửa `.env`, không tạo lại `.env.local`. Không xóa `stock` khỏi `Product` (Story 1.6). Không chạm `storage/orders.json`. Không viết fake transaction.

**Quyết định (landv ủy quyền chọn phương án bảo thủ, 2026-11-21):** Thứ tự chuẩn bị database test theo AD-31 là guard → migrate → truncate → seed, vì database trống chưa có bảng để truncate.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Seed lần đầu | `inventory` trống | Chèn đủ 16 sản phẩm | N/A |
| Seed lần hai | Tồn đã đổi | Giữ nguyên tồn đã đổi | N/A |
| Chuẩn bị DB test | `shoplite_test` trống hoặc đã có dữ liệu | Đã migrate, sạch, có seed | N/A |
| Sai database test | `TEST_DATABASE_URL` trỏ `shoplite_dev` hoặc tên khác | Từ chối, không truncate, exit khác 0 | Chỉ log tên biến |
| Thiếu URL test | `TEST_DATABASE_URL` rỗng | Từ chối, exit khác 0 | Chỉ log tên biến |
| Trigger Lịch sử | `UPDATE`, `DELETE` trên DB test | Trigger tồn tại và từ chối | N/A |
| Cổng đỏ | Một bước của `check:full` lỗi | Dừng, mã thoát khác 0 | N/A |

</frozen-after-approval>

## Code Map

- `src/data/inventory-seed.ts` (mới) -- `productId` và `stock`, đúng số đang ở `src/data/products.ts`. Không import `products`.
- `scripts/db-seed.ts` (mới), `scripts/db-test-prepare.ts` (mới) -- `db:seed`, `db:test:prepare`. Tái dùng cách xử lý lỗi của `scripts/db-migrate.ts`.
- `scripts/db-test-lib.ts` (mới) -- guard, migrate, truncate, seed dùng chung cho script và global setup.
- `vitest.db.config.mts`, `vitest.db.setup.ts` (mới) -- cấu hình và global setup.
- `vitest.config.mts` -- loại `**/*.db.test.*`.
- `src/db/history-trigger.db.test.ts` (mới) -- test trigger.
- `package.json` -- `db:seed`, `db:test:prepare`, `test:db`, `check:full`.
- `.env.example` -- đã có `TEST_DATABASE_URL`, không cần sửa.

## Tasks & Acceptance

**Execution:**
- [x] `src/data/inventory-seed.ts`, `scripts/db-seed.ts` -- seed idempotent.
- [x] `scripts/db-test-lib.ts`, `scripts/db-test-prepare.ts` -- chuẩn bị DB test có guard.
- [x] `vitest.db.config.mts`, `vitest.db.setup.ts`, `vitest.config.mts` -- tách tầng test.
- [x] `src/db/history-trigger.db.test.ts` -- test trigger trên DB thật.
- [x] `package.json` -- thêm bốn script.

**Acceptance Criteria:**
- Given `inventory-seed.ts`, when so với `products.ts`, then cùng 16 `productId` và cùng số tồn.
- Given `npm run test`, when chạy, then không có file `*.db.test.*` nào được chạy.

### Review Findings

Code review Epic 1, 2026-11-21, đối chiếu tại `8a722dc`.

- [x] [Review][Patch] P17. Thiếu test chạy lại seed không ghi đè tồn [scripts/db-test-lib.ts:40]
- [x] [Review][Patch] P18. Thiếu test tập id seed khớp catalog [src/data/inventory-seed.test.ts:1]
- [x] [Review][Patch] P28. Comment nói số tồn khớp `products.ts` đã sai [src/data/inventory-seed.ts:1]

**Rejected**

- low: guard chỉ kiểm tên database — cần trỏ nhầm URL tới máy từ xa có cùng tên.

## Implementation Notes

- Kết quả trên Node 22.23.4: `npm run check:full` exit 0 (115/115 test thường, 3/3 test DB).
- `TEST_DATABASE_URL` trỏ `shoplite_dev` làm `db:test:prepare`, `test:db`, `check:full` đều exit 1. Dấu vân dữ liệu `inventory` của `shoplite_dev` không đổi (16 dòng, tổng 550), log không có URL.
- Seed không ghi đè tồn đã đổi, kiểm trên `shoplite_test`. `inventory-seed.ts` khớp `products.ts` ở cả 16 sản phẩm.
- Trong lúc làm, subagent chạy `git stash` và `stash pop` làm mất trạng thái staged của thao tác xóa `.env.local`. Index đã được đưa về như cũ, không còn stash.
- Khi guard từ chối, vitest 5.0.5 in thêm lỗi dựng stack trace `code.charCodeAt is not a function`. Mã thoát và việc từ chối vẫn đúng.

## Spec Change Log

## Review Triage Log

| Phát hiện | Verdict | Route | Bằng chứng |
|---|---|---|---|
| `afterAll` truncate cả khi guard sai database | high | patch | Chỉ truncate sau khi guard đạt |
| Lỗi global setup có thể lộ host, cổng | medium | patch | Đã làm sạch lỗi |
| Guard chống truncate nhầm chưa có test | medium | patch | Thêm `prepare-test-db.test.ts` |
| Seed có thể lệch `products.ts` | low | reject | Đã so 16 dòng khớp; Story 1.6 xóa `stock` khỏi `products.ts` nên test so hai nguồn sẽ bỏ đi ngay |
| `check:full` chuẩn bị DB hai lần | low | reject | AC yêu cầu cả hai bước |
| Không có CI chạy `check:full` | medium | defer | Repo chưa có CI |
| Chuẩn bị DB không nằm trong một transaction | low | reject | Chạy lại `db:test:prepare` là phục hồi được |
| Guard không kiểm host | low | reject | AD-30 quy định guard theo tên database |
| `db:seed` thiếu guard môi trường | false | reject | Seed chỉ chèn `ON CONFLICT DO NOTHING`, không ghi đè |
| Alias `@/` không chạy trong script hoặc global setup | false | reject | `check:full` và `db:seed` đều chạy được |
| `exclude` thay default của vitest | false | reject | `include` chỉ gồm `src/**` |
| Test trigger chỉ assert mã lỗi | low | reject | Mã `23000` đúng ERRCODE của trigger, bảng có dòng từ `beforeAll` |
| Trigger không chặn `TRUNCATE` | false | reject | AD-31 cần truncate cho DB test |

## Verification

**Commands:**
- `npm run check:full` -- expected: cả ba bước xanh.
- `npm run db:seed` hai lần trên `shoplite_dev`, đổi tạm một dòng tồn giữa hai lần rồi trả lại -- expected: lần hai không ghi đè.
- `TEST_DATABASE_URL` trỏ `shoplite_dev` rồi chạy `db:test:prepare` và `test:db` -- expected: từ chối, số dòng `shoplite_dev` không đổi, log không có URL.
- Tạm cho một bước của `check:full` đỏ bằng `TEST_DATABASE_URL` sai -- expected: mã thoát khác 0.
