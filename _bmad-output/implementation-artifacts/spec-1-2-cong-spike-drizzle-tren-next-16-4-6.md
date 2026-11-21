---
title: 'Story 1.2: Cổng spike Drizzle trên Next 16.4.6'
type: 'feature'
created: '2026-11-21'
status: 'done'
route: 'dispatch'
baseline_commit: 'aaf00b1f479ad55a88fe53b567065ae9550637ba'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Chưa có bằng chứng Drizzle với `node-postgres` chạy được trên Next 16.4.6, nên chưa story nào được phụ thuộc vào Drizzle (AD-6).

**Approach:** Thêm nền DB tối thiểu theo AD-6 và AD-10, bảng `inventory` đầu tiên bằng migration, một route spike trừ kho trong đúng một transaction, và một script `.mjs` chứng minh race, rollback và lỗi kết nối trên `shoplite_dev`.

## Boundaries & Constraints

**Always:** Pin chính xác `drizzle-orm` 0.45.4, `pg` 8.23.1 (dependencies), `drizzle-kit` 0.31.11, `@types/pg` 8.23.1 (devDependencies). Pool là singleton lazy trên `globalThis`, không kết nối lúc import, có timeout kết nối. Transaction READ COMMITTED. Trừ kho đúng dạng `UPDATE ... SET stock = stock - $n WHERE product_id = $id AND stock >= $n`. Trong `src/`, chỉ `src/lib/env.ts` đọc `DATABASE_URL`. Lỗi API giữ dạng `{ error: { code, message, details? } }`.

**Never:** Không dùng `drizzle-kit push`. Không sửa `.env`, `.env.local` hay `.env.example`. Không in chuỗi kết nối, `cause` hoặc giá trị env. Không chuyển đơn hàng sang PostgreSQL, không thêm bảng khác, không thêm script `db:migrate`, Vitest DB hay ESLint ranh giới. Không để lại dòng dữ liệu spike trong `shoplite_dev`. Không chạm `shoplite_test` hay `storage/orders.json`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Trừ kho đủ | Tồn 2, yêu cầu 1 | 200, tồn còn 1 | N/A |
| Thiếu hàng | Tồn 0, yêu cầu 1 | 409 `INSUFFICIENT_STOCK`, tồn giữ nguyên | Rollback |
| Race | Tồn 1, 20 request đồng thời | Đúng 1 request 200, 19 request 409, tồn cuối 0 | N/A |
| Lỗi giữa chừng | Tồn 1, `failAfterUpdate: true` | 500, tồn vẫn 1 | Rollback |
| Input sai | Thiếu `productId` hoặc `quantity < 1` | 400 `VALIDATION_ERROR`, không chạm DB | N/A |
| DB không kết nối được | `DATABASE_URL` sai cổng | 500 `DB_ERROR` trong thời gian timeout, chỉ có `sqlState` nếu có, không lộ URL hay `cause` | Không treo kết nối |
| Production | `NODE_ENV=production`, gọi route spike | 404, không chạm DB | N/A |

**Quyết định (landv, 2026-11-21):** Giữ route spike khi merge, trả 404 khi `NODE_ENV=production`, và xóa route ở đầu Story 1.3.

</frozen-after-approval>

## Code Map

- `package.json` -- thêm bốn package pin chính xác.
- `src/lib/env.ts` (mới) -- `getServerEnv()` lazy, Zod, chỉ `DATABASE_URL`.
- `src/lib/db-tx.ts` (mới) -- chỉ kiểu `DbTx` branded và `RunInTransaction`.
- `src/db/client.ts` (mới) -- pool singleton lazy, `on("error")` không log URL.
- `src/db/schema.ts` (mới) -- `inventory(product_id text PK, stock integer NOT NULL, CHECK stock >= 0)`. Story 1.4 mở rộng file này.
- `src/db/transaction.ts` (mới) -- `runInTransaction`, `toDrizzleTx`.
- `drizzle.config.ts`, `drizzle/` (mới) -- migration do `drizzle-kit generate` tạo.
- `src/app/api/spike/reserve/route.ts` (mới) -- route spike. Tái dùng `jsonError`, `readJsonBody` ở `src/lib/http.ts`.
- `scripts/spike-race.mjs` (mới) -- Node thuần, từ chối chạy nếu `current_database()` khác `shoplite_dev`, dùng `product_id` riêng `__spike__` và xóa dòng này khi kết thúc, kể cả khi lỗi.
- `shoplite_dev` đã tồn tại và chưa có bảng. PostgreSQL 14.18 đang chạy.

## Tasks & Acceptance

**Execution:**
- [x] `package.json`, `package-lock.json` -- cài bốn package với `--save-exact` -- nền Drizzle đã chốt.
- [x] `src/lib/env.ts`, `src/lib/db-tx.ts`, `src/db/client.ts`, `src/db/transaction.ts` -- tạo theo Code Map -- hợp đồng AD-6, AD-10.
- [x] `src/db/schema.ts`, `drizzle.config.ts`, `drizzle/` -- tạo schema, chạy `drizzle-kit generate`, áp dụng bằng `node --env-file=.env node_modules/.bin/drizzle-kit migrate` -- bảng đầu tiên.
- [x] `src/app/api/spike/reserve/route.ts` -- `POST { productId, quantity, failAfterUpdate? }`, mở đúng một transaction -- route spike.
- [x] `scripts/spike-race.mjs` -- phủ các dòng ma trận trừ dòng DB không kết nối -- chứng minh cổng.

**Acceptance Criteria:**
- Given import `src/db/client.ts`, when DB chưa được gọi, then không có kết nối nào được mở.
- Given spike đã chạy, when xem Implementation Notes, then có kết luận cổng đạt hay chưa và đúng các lệnh đã chạy.

### Review Findings

Code review Epic 1, 2026-11-21, đối chiếu tại `8a722dc`.

- [x] [Review][Patch] D1. [medium] Thêm `lock_timeout` 3s, `statement_timeout` 5s, `idle_in_transaction_session_timeout` 10s; hết giờ trả 503 để khách thử lại (landv chốt D1A, 2026-11-21) [src/db/client.ts:18]
- [x] [Review][Patch] P1. [medium] Mất kết nối khi client đang được mượn gây uncaught error; Node thuần chết tiến trình, Next ghi lỗi thô và bỏ qua log an toàn [src/db/client.ts:23]

**Rejected**

- low: chặn `runInTransaction` lồng nhau — không có caller nào lồng.

## Implementation Notes

**Kết luận: cổng ĐẠT.** Drizzle 0.45.4 + `pg` 8.23.1 chạy được trên Next 16.4.6.

Lệnh đã chạy:
- `npm i --save-exact drizzle-orm@0.45.4 pg@8.23.1` và `npm i -D --save-exact drizzle-kit@0.31.11 @types/pg@8.23.1`
- `npx drizzle-kit generate` rồi `node --env-file=.env node_modules/.bin/drizzle-kit migrate` (bảng `inventory`)
- `npm run check` xanh (83 test); `npm run build` thành công, đã khôi phục `next-env.d.ts`
- `npm run dev -- -p 3100` + `node --env-file=.env scripts/spike-race.mjs`: đạt cả 6 dòng (đủ, thiếu, race 200=1/409=19, rollback, 2 input sai), không còn dòng `__spike__`
- `DATABASE_URL` trỏ cổng 5999 + `npm run dev`: 500 `DB_ERROR`, không lộ URL, phản hồi dưới 1 giây
- `npm run build`, `npm run start -- -p 3102`: route trả 404

Ghi chú: `route.ts` chạm `src/db` trái ranh giới `src/app`, đã được chấp nhận cho spike và xóa ở đầu Story 1.3.

Kiểm chứng lại sau bản sửa review, trên Node 22.23.4: `npm run check` xanh (83/83), race đạt cả 6 dòng, `quantity` vượt phạm vi trả 400, cổng đóng trả 500 không lộ URL trong 0,2 giây, database không tồn tại trả `sqlState` `3D000`, build đạt, production trả 404, năm trang trả 200, `inventory` còn 0 dòng.

## Spec Change Log

## Review Triage Log

| Phát hiện | Verdict | Route | Bằng chứng |
|---|---|---|---|
| `quantity` vượt `integer` trả 500 | medium | patch | Đã thêm `.max(2147483647)`; chạy lại trả 400 |
| Mã Node như `EPIPE` lọt thành `sqlState` | medium | patch | Chỉ nhận `DatabaseError`; cổng đóng không có `details`, DB không tồn tại trả `3D000` |
| `getServerEnv` chưa có unit test | medium | defer | Story 1.3 mở rộng file này và thêm kiểm tra khởi động |
| Pool thiếu `statement_timeout`, `idle_in_transaction_session_timeout` | maybe-false | defer | Chưa tái hiện được treo; cần thử một transaction treo để kết luận |
| Pool 10 kết nối làm race chập chờn | maybe-false | reject | Race 20 request đạt ở cả hai lần chạy; nếu đúng chỉ ảnh hưởng script spike |
| Cổng spike không nằm trong `npm run check` | low | reject | AC yêu cầu script `.mjs` chạy tay; test DB đến ở Story 1.5 |
| Route mở ở môi trường không phải production | low | reject | Dự án chưa có staging; landv đã chốt chặn theo `NODE_ENV=production` và xóa ở 1.3 |
| Route không log lỗi DB | low | reject | Route tạm; log an toàn thuộc Story 1.3 |
| `drizzle.config.ts` fallback chuỗi rỗng | low | reject | Ném lỗi sẽ làm `drizzle-kit generate` cần env dù không kết nối DB |
| Script thiếu timeout và ca kiểm mạnh hơn | low | reject | Chỉ ảnh hưởng script tạm, cổng theo AC đã đạt |
| Sản phẩm không tồn tại trả 409 | false | reject | AD quy định không có hàng `inventory` tính là tồn 0 |
| `rowCount` có thể null | false | reject | Câu `UPDATE` của `pg` luôn trả số dòng |
| Không xử lý `40001`, `40P01` | false | reject | AD-10 cấm tự retry; READ COMMITTED và một dòng cập nhật |
| Trả `sqlState` cho client | false | reject | AC của story yêu cầu lỗi chỉ có `sqlState` |
| Input sai có thể chạm DB | false | reject | Route trả 400 trước khi mở transaction |
| `toDrizzleTx` bị route gọi trực tiếp | low | reject | Ngoại lệ đã chấp nhận cho spike, route xóa ở 1.3 |
| Việc xóa route chưa được theo dõi | false | reject | Đã có trong `deferred-work.md` |
| `@types/pg` 8.23.1 có thể không tồn tại | false | reject | `npm view` trả đúng phiên bản |
| Lockfile không có trong diff review | false | reject | Đã so riêng: thêm 101 package, không package cũ nào đổi phiên bản |
| `.env.local` bị xóa | false | reject | landv tự xóa, không thuộc commit của story |

## Verification

**Commands:**
- `npm run check` -- expected: xanh.
- `npm run build` -- expected: thành công; khôi phục `next-env.d.ts` nếu build tự đổi.
- `npm run dev` ở cổng riêng rồi `node --env-file=.env scripts/spike-race.mjs` -- expected: mọi dòng ma trận đạt, không còn dòng `__spike__`. Dùng `dev` vì route trả 404 ở production.
- Chạy `npm run dev` với `DATABASE_URL` trỏ cổng đóng rồi gọi route -- expected: 500 `DB_ERROR`, không lộ URL, phản hồi trong thời gian timeout.
- `npm run build`, `npm run start` rồi gọi route -- expected: 404.
