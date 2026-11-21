# Epic 1 Context: Đặt hàng đúng Tồn kho thật

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Đưa đơn hàng và Tồn kho từ file JSON và số tĩnh sang PostgreSQL làm nguồn duy nhất. Khách thấy tồn thật, không mua quá số còn, thiếu hàng vẫn giữ form và xử lý tại chỗ, không đặt được hàng loạt đơn ảo. Epic cũng dựng nền cho các epic sau: nâng phiên bản, cổng spike Drizzle, cấu hình, log an toàn, migration, test trên database thật.

## Stories

- Story 1.1: Nâng Next 16.4.6 và engines Node 22.18
- Story 1.2: Cổng spike Drizzle trên Next 16.4.6
- Story 1.3: Nền cấu hình, log an toàn và ranh giới lớp
- Story 1.4: Schema đơn hàng, migration và trigger Lịch sử
- Story 1.5: Seed Tồn kho và cổng test DB trên PostgreSQL thật
- Story 1.6: Tồn kho một chủ đọc và giỏ hàng theo Tồn kho thật
- Story 1.7: Đặt hàng trừ Tồn kho nguyên tử trong PostgreSQL
- Story 1.8: Chống đơn ảo theo IP và số điện thoại
- Story 1.9: Giữ form khi hết hàng

## Requirements & Constraints

- Tồn 1 với N yêu cầu đồng thời: đúng 1 đơn thành công, còn lại `INSUFFICIENT_STOCK`, tồn cuối 0. Thiếu một dòng thì không tạo đơn, không trừ dòng nào.
- Giới hạn tăng số lượng là `min(tồn, 10)`, không tự giảm số đã có; lỗi tải tồn thì dùng 10 và không chặn đặt.
- Tối đa 10 đơn thành công mỗi IP mỗi giờ và 3 đơn Chờ xác nhận mỗi số điện thoại (`0...` và `+84...` tính chung). Vượt thì 429 `RATE_LIMITED`.
- Giữ nguyên: server tự tính tiền, tối đa 10 mỗi sản phẩm sau khi gộp dòng, miễn phí giao từ 500.000đ, dạng lỗi `{ error: { code, message, details? } }`, giỏ ở `shoplite:cart`.
- Khi đơn sang PostgreSQL: `PATCH /api/orders/:id` luôn 401 không chạm DB, xóa luồng Khách tự hủy; route đọc cũ vẫn chạy đến Epic 7. Không chuyển 11 đơn thử, không đụng `storage/orders.json`.
- Dữ liệu khách không vào URL hoặc log. Biến mới chỉ ở `.env` và `.env.example`, không ở `.env.local`.

## Technical Decisions

- **Stack pin:** Next và `eslint-config-next` 16.4.6, Node `>=22.18.0`, `drizzle-orm` 0.45.4, `drizzle-kit` 0.31.11, `pg` và `@types/pg` 8.23.1, PostgreSQL 14.18 không Docker (`shoplite_dev`, `shoplite_test`).
- **Lớp:** `src/app` chỉ gọi service. SQL chỉ ở `*.pg.ts` và `src/db`. Service parse Zod, mở transaction, ném `OrderError`. Singleton ở `features/<feature>/server.ts`.
- **Transaction:** READ COMMITTED, service mở đúng một lần, không lồng, không retry; hàm ghi và đọc-để-quyết-định nhận `tx: DbTx` đầu tiên; đọc sau khóa là câu lệnh riêng.
- **`placeOrder`:** Zod, gộp dòng, tính tiền trước transaction. Trong transaction: `consume` IP → `lockPhone` → `countPendingByPhone` → `reserveStock` → `insertOrder` kèm dòng `order_created`. Mọi lỗi rollback cả bộ đếm.
- **Thứ tự khóa:** `rate_limits` theo key → advisory theo SĐT → `orders` → `inventory` theo `productId` tăng dần.
- **Ghi tồn:** chỉ qua `stock-ledger.pg.ts`, `UPDATE ... WHERE stock >= $n`, `CHECK (stock >= 0)`. `reserveStock` đi hết mọi dòng, dòng thiếu báo `available = max(0, min(stockĐọcĐược, requested - 1))`.
- **Đọc tồn:** bỏ `stock` khỏi `Product` và `CartItem`; đọc qua `features/inventory/server.ts#readStock`, ghép `StockedProduct`; `/cart` và `/checkout` dùng `GET /api/inventory?ids=` (tối đa 50, `no-store`). Trang và API có tồn dùng `force-dynamic`, không cache.
- **Schema:** `timestamptz(3)` do DB cấp, tiền `integer`, chỉ lưu `phone_normalized`, dòng hàng và tổng tiền là bản chụp, Lịch sử append-only bằng trigger.
- **Migration, script:** `drizzle-kit generate`, chỉ đi tiến, không `push`. Script TS chạy qua `scripts/ts-hooks.mjs`, không thêm dependency. Seed dùng `ON CONFLICT DO NOTHING`.
- **Env, log:** chỉ `lib/env.ts` đọc `process.env`; env sai thì log tên biến rồi `process.exit(1)`. Lỗi DB thành `DbFailure` chỉ có `sqlState`; log qua `logServerError`.
- **IP:** chỉ `getClientIp` đọc header; `TRUSTED_PROXY_HOPS = 0` là bucket `direct`, production bắt buộc `>= 1`.
- **Test:** không fake transaction; DB và race dùng `*.db.test.ts` trên `shoplite_test`. Từ Story 1.6, PR chạm đơn, tồn, rate limit, DB phải chạy `npm run check:full`.

## UX & Interaction Patterns

- `/checkout` thiếu hàng: tiêu đề `Một số sản phẩm không đủ hàng`, mô tả `Chọn cách xử lý để đặt tiếp.`; mỗi `stock-conflict-row` hiện `Bạn chọn {X} · Chỉ còn {N}`, `Lấy {N}`, `Bỏ`. N = 0 chỉ có `Hết hàng` và `Bỏ`.
- Giỏ, tổng tiền và phí giao cập nhật tại form. `Đặt hàng` disabled khi đang gửi và đến khi xử lý hết dòng thiếu. Bỏ hết thì về giỏ trống.
- `RATE_LIMITED` hiện `error-banner` với `error.message` do server dựng, form giữ nguyên.
- Dòng xung đột: focus 2px `primary`, vùng bấm 44px dưới `md`, không chỉ dùng màu, không cuộn ngang ở 390px.

## Cross-Story Dependencies

- Thứ tự 1.1 → 1.7 tuần tự, rồi 1.8 và 1.9. Không dùng Drizzle trước khi cổng 1.2 đạt. Bảng chỉ tạo ở story cần dùng.
- Epic 2 thêm projection và cookie, Epic 3 dùng `release`, Epic 5 thêm hủy và hoàn kho, Epic 7 đóng route đọc cũ.

**Cần chốt trước khi làm story liên quan:**

- **1.1:** `engines` một mình không chặn được Node thấp như tiêu chí yêu cầu.
- **1.2, 1.3:** route spike chạm DB trái ranh giới `src/app`, và chưa story nào xử lý hay xóa route trừ kho không xác thực này.
- **1.3:** `replace_me` không hợp lệ cho secret 32 byte, `TRUSTED_PROXY_HOPS`, `STAFF_ACCOUNTS`.
- **1.4:** khóa ngoại `actor_staff_id` và index `staff_sessions` cần bảng chỉ có từ Story 4.1.
- **1.5:** thứ tự reset và migrate không thống nhất; DB trống phải migrate trước.
- **1.6, 1.7:** xóa `Product.stock` ở 1.6 làm vỡ `order-service.ts` đến 1.7; tiêu chí "đơn cuối hiện Hết hàng" cũng cần 1.7.
- **1.8:** đặt đơn hoàn lượt bằng rollback; `release` chỉ có người gọi từ Epic 3.
- **1.9:** `Lấy N` là nút chính trên từng dòng, trái quy tắc mỗi vùng một nút chính.
