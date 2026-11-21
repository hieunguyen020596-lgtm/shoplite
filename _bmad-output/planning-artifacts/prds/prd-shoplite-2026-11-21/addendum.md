# Addendum: PRD ShopLite - Vận hành và theo dõi đơn hàng

Chi tiết cho kiến trúc và phát triển. Lý do chọn và phương án đã loại nằm trong `../../briefs/brief-shoplite-2026-11-21/addendum.md`.

## Lựa chọn kỹ thuật

- PostgreSQL, Drizzle với `node-postgres`. Story đầu tiên nâng `next` và `eslint-config-next` lên 16.4.6, đặt `engines.node` thành `>=22.18.0`, rồi chạy thử một đơn trừ kho thật trên Next 16.4.6 trước khi chốt ORM.
- PostgreSQL cài sẵn trên máy. Dev dùng `shoplite_dev`; race test và E2E dùng `shoplite_test`, seed lại mỗi lần chạy.
- Biến theo AD-31 nằm ở `.env`, mẫu ở `.env.example`: `DATABASE_URL`, `TEST_DATABASE_URL`, `ORDER_ACCESS_SECRET`, `SHOP_CONTACT_PHONE`, `BANK_NAME`, `BANK_ACCOUNT_NUMBER`, `TRUSTED_PROXY_HOPS` (production bắt buộc số nguyên ≥ 1), `STAFF_ACCOUNTS` (chỉ dùng cho `staff:seed`).
- `.env.local` là file của khóa học và được theo dõi trong git. Bản làm việc dùng giá trị placeholder; lịch sử đã commit có một giá trị không phải placeholder của `PAYMENT_API_KEY`, chủ dự án cần xác nhận đây là key mẫu hay key thật. Không khai báo biến mới ở đây vì Next ưu tiên file này hơn `.env`.
- Bỏ `OrderRepository.save` để không còn đường ghi đè. Trừ kho bằng `UPDATE ... SET stock = stock - $n WHERE product_id = $id AND stock >= $n`; chuyển trạng thái bằng `UPDATE ... WHERE id = $id AND status = $from AND version = $expectedVersion`.
- Hợp đồng `version`: `orders.version` bắt đầu từ 0 và chỉ tăng khi đổi Trạng thái. `PATCH /api/staff/orders/:id` gửi `from` và `expectedVersion` lấy từ `StaffOrderDetail`; lệch một trong hai, kể cả khi Trạng thái đã quay lại sau Lùi đơn, nhận `INVALID_STATUS_TRANSITION` và không ghi Lịch sử. Ghi kết quả hoàn tiền không tăng `version`, không đổi `updated_at`; không dùng `updated_at` làm token chống cũ.
- Bỏ `stock` khỏi `Product` tĩnh để compiler chỉ ra mọi chỗ đọc.

## Dữ liệu

| Bảng | Nội dung |
|---|---|
| `orders` | `id`, `status`, `version`, `customer_name`, `phone_normalized`, `email`, `address`, `note`, `shipping_method`, `payment_method`, `refund_required` (Cờ cần hoàn tiền), bản chụp `subtotal`, `shipping_fee`, `total`, `created_at`, `updated_at` |
| `order_items` | `order_id`, `product_id` và bản chụp lúc đặt: `name`, `slug`, `image`, `unit_price`, `quantity`, `line_total` |
| `order_status_history` | `id`, `order_id`, `event_type` (`order_created`, `status_changed`, `refund_outcome_recorded`), `from_status`, `to_status`, `reason_code`, `reason_text`, `refund_outcome`, `actor_type`, `actor_staff_id`, `actor_name`, `created_at`; chỉ thêm, không sửa hoặc xóa |
| `inventory` | `product_id`, `stock`, `CHECK (stock >= 0)`, seed từ `src/data/inventory-seed.ts` |
| `staff_accounts` | `id`, `username` (unique, chữ thường), `display_name`, `role` (`staff`, `manager`), `password_hash` |
| `staff_sessions` | `token_hash`, `account_id`, `created_at`, `expires_at`, `revoked_at` |
| `rate_limits` | `key`, `window_started_at`, `count`: bộ đếm Tra đơn, đăng nhập và đặt đơn |

- **Mã lý do Hủy:** lưu ở `reason_code`: `customer_changed_mind` (`Khách đổi ý`), `unreachable` (`Không liên lạc được`), `duplicate` (`Đơn trùng`), `out_of_stock` (`Hết hàng`), `other` (`Khác`, kèm chữ đã nhập).
- **Mã lý do Lùi đơn:** `mistaken_delivery` (`Bấm nhầm, hàng còn trên xe`), `customer_not_received` (`Khách báo chưa nhận hàng`), `other` (`Khác`, kèm chữ đã nhập).
- **Chữ lý do:** `other` và đính chính hoàn tiền bắt buộc có chữ sau `trim`, tối đa 200 ký tự; mã khác không kèm chữ.
- **Dòng kết quả xử lý hoàn tiền:** dùng `event_type = refund_outcome_recorded` với `refund_outcome`; `from_status`, `to_status` để trống, không ghi Trạng thái cũ và mới giống nhau. Mốc Khách hàng thấy chỉ đọc dòng `status_changed` (FR-7).

## Bản đồ route

| Route | Sau thay đổi |
|---|---|
| `POST /api/orders` | Giữ, thêm giới hạn và cấp Quyền xem đơn |
| `GET /api/orders` | Luôn trả 401, không đọc database |
| `GET /api/orders/:id` | Chỉ theo Quyền xem đơn, trả Dữ liệu tối thiểu; không có quyền thì 401 |
| `PATCH /api/orders/:id` | Luôn trả 401, không đọc database |
| `GET /api/staff/orders` | Mới. Nhân viên và Quản lý, danh sách theo tab của FR-9, có `refundPendingCount` |
| `POST /api/staff/orders/search` | Mới. Nhân viên và Quản lý, tìm theo Mã đơn hoặc số điện thoại; từ khóa nằm trong body, không lên URL |
| `GET /api/staff/orders/:id` | Mới. Nhân viên và Quản lý, Chi tiết đơn |
| `PATCH /api/staff/orders/:id` | Mới. Đổi Trạng thái theo FR-10, FR-12 và FR-13, gửi `from` và `expectedVersion` |
| `POST /api/staff/orders/:id/refund-outcomes` | Mới. Chỉ Quản lý, gồm `Đã xử lý hoàn tiền` và ghi thêm `Đã hoàn tiền`, đính chính về `Khách chưa chuyển tiền` kèm lý do (FR-21). Mỗi thao tác chỉ hợp lệ theo kết quả mới nhất; lần ghi trùng nhận lỗi xung đột, không dùng `INVALID_STATUS_TRANSITION` vì Trạng thái không đổi |
| `POST /api/staff/login`, `POST /api/staff/logout` | Mới, đăng nhập và đăng xuất |
| `POST /api/orders/lookup` | Mới, Tra đơn |
| `GET /api/inventory?ids=a,b` | Mới. Tồn kho cho `/cart` và `/checkout`, tối đa 50 id, `Cache-Control: no-store` |
| `/orders` | Trang Tra đơn |
| `/orders/:id` | Trang xác nhận khi có Quyền xem đơn; nếu không thì chuyển tới Tra đơn |
| `/staff`, `/staff/login` | Mới, Danh sách đơn và đăng nhập |
| `/staff/orders/:id` | Mới, Chi tiết đơn: thông tin đơn, thao tác và Lịch sử |

Giữ URL `/orders/:id?placed=1` giúp giảm thay đổi ở checkout và e2e.

## Điểm chạm trong code

| Vị trí | Hiện trạng | Việc cần làm |
|---|---|---|
| `src/features/orders/order-service.ts:70` | Kiểm tồn từ catalog tĩnh | Thay bằng trừ kho nguyên tử |
| `src/features/orders/order-service.ts:70-75` | Dừng ở dòng thiếu đầu tiên | `INSUFFICIENT_STOCK` trả mọi dòng thiếu kèm `productId`, số yêu cầu, số còn lại (FR-19) |
| `src/features/orders/order-service.ts:108` | Lưu đơn tách khỏi kiểm tồn | Gộp vào một giao dịch |
| `src/features/orders/order-service.ts:121` | Hủy chỉ từ `pending`, không hoàn kho | Thay bằng chuyển trạng thái, hoàn kho theo mã lý do: `out_of_stock` không hoàn, mọi mã khác hoàn đúng một lần |
| `src/features/orders/order-repository.ts:6` | `findAll/findById/save` | Thay `save` bằng thao tác nguyên tử |
| `src/features/orders/order-errors.ts:1` | 5 mã lỗi, `details` là `Record<string, string>` | Thêm `UNAUTHORIZED` 401, `FORBIDDEN` 403, `RATE_LIMITED` 429, `LOOKUP_FAILED` 404, `REFUND_OUTCOME_CONFLICT` 409; `details` dùng `OrderErrorDetails` = `FieldErrorDetails` hoặc `InsufficientStockDetails` theo AD-3 |
| `src/app/api/orders/route.ts:6` | `GET` không kiểm tra quyền | Luôn trả 401; vai chỉ kiểm ở `/api/staff/*` |
| `src/app/api/orders/[id]/route.ts:6` | `GET` và `PATCH` không kiểm tra quyền | `GET` theo Quyền xem đơn; `PATCH` luôn trả 401; vai chỉ kiểm ở `/api/staff/*` |
| `src/app/orders/[id]/page.tsx:69` | Nút hủy của khách | Gỡ |
| `src/app/orders/[id]/page.tsx:111` | Hiện đủ thông tin người nhận | Chỉ hiện Dữ liệu tối thiểu |
| `src/app/orders/[id]/page.tsx:129` | Thông tin chuyển khoản khi `pending` | Giữ điều kiện |
| `src/app/orders/[id]/page.tsx:132` | Số tài khoản hard-code | Bỏ, lấy từ `bankTransfer` |
| `src/lib/http.ts:22` | `console.error(error)` | Bỏ, log qua `logServerError` |
| `package.json` | `next`, `eslint-config-next` 16.4.2, `engines` cũ | Nâng lên 16.4.6, `engines.node` `>=22.18.0`, thêm script theo AD-30, AD-31 |
| `src/components/layout/nav-links.tsx:10` | Menu "Đơn hàng" tới `/orders` | Trỏ tới Tra đơn |
| `src/features/catalog/catalog-service.ts:71` | Trạng thái tồn từ số tĩnh | Giữ thuần, nhận `stock` từ `StockedProduct` |
| `src/features/catalog/catalog-service.ts:150` | Bộ lọc `inStock` từ số tĩnh | Giữ thuần, `queryProducts` nhận `source: StockedProduct[]`; đọc `inventory` ở `features/catalog/server.ts` |
| `src/features/catalog/components/stock-badge.tsx`, `product-card.tsx` | Hiển thị theo `product.stock` | Nhận `stock` từ `StockedProduct` |
| `src/app/products/[slug]/page.tsx:21` | Sinh tĩnh tham số route | Xóa hàm này, đặt `export const dynamic = "force-dynamic"` |
| `src/features/cart/cart-reducer.ts:10` | Giới hạn theo `stock` đã lưu trong giỏ | Giỏ không còn `stock`; chặn tăng theo `min(Tồn kho, 10)`, lấy tồn qua `/api/inventory`, làm sạch giỏ cũ khi đọc từ localStorage |

## Test bị ảnh hưởng

- `src/app/api/orders/route.test.ts:59`: `GET` luôn trả 401. File chuyển sang `*.db.test.ts`.
- Bỏ test dùng repository trong bộ nhớ; service, adapter, route có database và mọi ca race dùng `*.db.test.ts` trên `shoplite_test`.
- `e2e/shopping-flow.spec.ts:33`: luồng sau đặt hàng và bước "Tất cả đơn hàng" phải viết lại.
- `src/features/checkout/components/checkout-form.test.tsx:69`: giữ được nếu vẫn dùng URL `/orders/{id}?placed=1`.
- `playwright.config.ts` theo AD-30: `next dev -p 3100`, `NEXT_DIST_DIR=.next-e2e`, `reuseExistingServer: false`, `workers: 1`, `DATABASE_URL` của `shoplite_test`, `TRUSTED_PROXY_HOPS=1`.
- Repo chưa có `.github/workflows`, nên chưa có CI.
