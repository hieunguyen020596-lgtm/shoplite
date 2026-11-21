- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-nang-next-16-4-6-va-engines-node-22-18.md`
  summary: Chốt lại dải Node vì `>=22.18.0` nhận các bản mà toolchain test không khai báo hỗ trợ.
  evidence: Lockfile cho thấy `jsdom@30.1.3` và các package đi kèm cần `^22.22.2 || ^24.15.0 || >=26.0.0`; `check` mới chỉ chạy trên Node 22.23.4.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-nang-next-16-4-6-va-engines-node-22-18.md`
  summary: Cập nhật AC Node thấp của Story 1.1 trong `epics.md` theo quyết định bỏ `engine-strict`.
  evidence: Epic yêu cầu báo phiên bản không đạt khi chạy `npm install` hoặc script, còn quyết định ngày 2026-11-21 chỉ giữ cảnh báo của npm.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-nang-next-16-4-6-va-engines-node-22-18.md`
  summary: Sửa AD-6 và `epics.md:203` để ghi Story 1.1 nâng nền, Story 1.2 merge spike Drizzle.
  evidence: Hai tài liệu đang ghi story đầu tiên phải merge spike, trong khi spike nằm ở Story 1.2.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-nang-next-16-4-6-va-engines-node-22-18.md`
  summary: Chạy e2e và kiểm tra luồng hủy đơn `PATCH /api/orders/[id]` trên Next 16.4.6 (medium, chưa xác minh).
  evidence: Chưa có test nào đi qua luồng hủy đơn và e2e chưa chạy sau nâng cấp; cần một lần chạy e2e và hủy đơn thật trên dữ liệu thử để kết luận.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-cong-spike-drizzle-tren-next-16-4-6.md`
  summary: Xóa `src/app/api/spike/reserve/route.ts` ở đầu Story 1.3.
  evidence: landv đã chốt ngày 2026-11-21; route trừ kho không xác thực và lint của Story 1.3 cấm `src/app` import `src/db`.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-cong-spike-drizzle-tren-next-16-4-6.md`
  summary: Thêm unit test cho `getServerEnv` khi Story 1.3 mở rộng `src/lib/env.ts`.
  evidence: Chưa có test nào phủ nhánh thiếu `DATABASE_URL` và phần cache.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-cong-spike-drizzle-tren-next-16-4-6.md`
  summary: Xem xét `statement_timeout` và `idle_in_transaction_session_timeout` cho pool (medium, chưa xác minh).
  evidence: Pool chỉ có timeout kết nối; cần thử một transaction treo để biết khóa dòng có bị giữ lâu hay không.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-3-nen-cau-hinh-log-an-toan-va-ranh-gioi-lop.md`
  summary: landv xác nhận ngoại lệ `src/db/schema.ts` không có `import "server-only"`.
  evidence: AC ghi `src/db/**`, nhưng `drizzle-kit` nạp file này ngoài Next và package `server-only` không được cài.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-3-nen-cau-hinh-log-an-toan-va-ranh-gioi-lop.md`
  summary: Mở rộng rule ranh giới cho `import()` động và `require`.
  evidence: Rule hiện chỉ phủ import và export tĩnh; repo chưa có cách dùng động.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-3-nen-cau-hinh-log-an-toan-va-ranh-gioi-lop.md`
  summary: Thêm test cho handler `pool.on("error")`.
  evidence: Handler chưa có test trực tiếp, dù hai hàm nó gọi đã được test.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-schema-don-hang-migration-va-trigger-lich-su.md`
  summary: Story 4.1 thêm khóa ngoại `order_status_history.actor_staff_id` và index `staff_sessions(account_id)` bằng migration mới.
  evidence: ERD yêu cầu hai mục này nhưng `staff_accounts` và `staff_sessions` chỉ được tạo ở Story 4.1.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-schema-don-hang-migration-va-trigger-lich-su.md`
  summary: Thêm test so danh sách trong CHECK với `ORDER_STATUSES`, `PAYMENT_METHODS`, `SHIPPING_METHODS`.
  evidence: `schema.ts` ghi cứng các giá trị vì `drizzle-kit` không resolve alias `@/`, nên hai nguồn có thể lệch mà `npm run check` không báo.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-schema-don-hang-migration-va-trigger-lich-su.md`
  summary: Cân nhắc CHECK công thức tiền cho `orders` và `order_items`.
  evidence: Database hiện chấp nhận tiền âm hoặc tổng không khớp; AD chưa yêu cầu và server đang tự tính tiền.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-5-seed-ton-kho-va-cong-test-db.md`
  summary: Thêm CI chạy `npm run check:full` trên PostgreSQL thật.
  evidence: Repo chưa có workflow CI nên test DB chỉ chạy khi có người gọi lệnh.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-6-ton-kho-mot-chu-doc-va-gio-hang.md`
  summary: Story 1.7 phải kiểm tiêu chí đơn cuối vừa đặt thì trang sản phẩm hiện Hết hàng.
  evidence: Story 1.6 mới chứng minh trang đọc đúng khi tồn trong database về 0, chưa có luồng trừ kho thật.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-7-dat-hang-tru-ton-kho-nguyen-tu.md`
  summary: Đổi Playwright sang cấu hình AD-30 (`shoplite_test`, cổng 3100, `.next-e2e`) trước khi chạy e2e.
  evidence: Từ Story 1.7, e2e đặt đơn thật; cấu hình hiện tại chạy `npm run dev` với `.env` nên sẽ ghi đơn và trừ tồn trong `shoplite_dev`.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-7-dat-hang-tru-ton-kho-nguyen-tu.md`
  summary: Giới hạn hoặc đóng `findAll` khi số đơn lớn.
  evidence: `findAll` đọc mọi đơn và truyền toàn bộ id vào `inArray`; route đọc cũ được đóng ở Epic 7.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-8-chong-don-ao-theo-ip-va-sdt.md`
  summary: Dọn các dòng `rate_limits` hết hạn.
  evidence: Dòng hết cửa sổ chỉ được đặt lại khi cùng khóa quay lại; architecture hoãn việc này đến khi bảng vượt 100.000 dòng hoặc deploy công khai.

## Deferred from: code review of spec-1-4-schema-don-hang-migration-va-trigger-lich-su.md (2026-11-21)

- Chưa có cổng phát hiện `schema.ts` lệch migration [src/db/schema.ts:1] — deferred: cần thiết kế bước kiểm `drizzle-kit` không để lại file trong repo

## Deferred from: code review of spec-1-6-ton-kho-mot-chu-doc-va-gio-hang.md (2026-11-21)

- Chưa ghim biên hợp lệ 50 id và id 64 ký tự [src/app/api/inventory/route.ts:23] — deferred: giỏ thực tế chưa chạm biên này, đóng khi sửa route lần tới

## Deferred from: code review of spec-1-9-giu-form-khi-het-hang.md (2026-11-21)

- Thử lại sau khi mất response có thể tạo đơn trùng, trừ kho hai lần [src/features/checkout/components/checkout-form.tsx:211] — deferred: landv chốt D2A ngày 2026-11-21, làm `Idempotency-Key` thành story riêng trước khi phát hành vì cần bảng hoặc cột mới
