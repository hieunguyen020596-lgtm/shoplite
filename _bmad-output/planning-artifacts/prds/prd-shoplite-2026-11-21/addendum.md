# Addendum: PRD ShopLite - Vận hành và theo dõi đơn hàng

Chi tiết cho kiến trúc và phát triển. Lý do chọn và phương án đã loại nằm trong `../../briefs/brief-shoplite-2026-11-21/addendum.md`.

## Lựa chọn kỹ thuật

- PostgreSQL, Drizzle với `node-postgres`. Chạy thử một đơn trừ kho thật trên Next 16.4.2 trước khi chốt ORM.
- Docker Compose cho local và test race condition. E2E dùng DB riêng, seed lại mỗi lần chạy.
- `DATABASE_URL`, `SHOP_CONTACT_PHONE` và các bí mật nằm ở `.env`, mẫu ở `.env.example`.
- `.env.local` là file mẫu của khóa học, giữ trong git với giá trị `replace_me`. Không khai báo biến mới ở đây vì Next ưu tiên file này hơn `.env`.
- Bỏ `OrderRepository.save` để không còn đường ghi đè. Trừ kho bằng `UPDATE ... SET stock = stock - $n WHERE product_id = $id AND stock >= $n`; chuyển trạng thái bằng `UPDATE ... WHERE id = $id AND status = $from`.
- Bỏ `stock` khỏi `Product` tĩnh để compiler chỉ ra mọi chỗ đọc.

## Dữ liệu dự kiến

| Bảng | Nội dung |
|---|---|
| `orders` | Thông tin đơn, Trạng thái, số điện thoại đã chuẩn hóa, Cờ cần hoàn tiền |
| `order_items` | Dòng sản phẩm với giá tại thời điểm đặt |
| `order_status_history` | Người thực hiện, thời gian, Trạng thái cũ, Trạng thái mới, mã lý do Hủy, lý do dạng chữ |
| `inventory` | `product_id`, `stock`, `CHECK (stock >= 0)`, seed từ `src/data/products.ts` |
| `rate_limits` | Bộ đếm tra đơn, đăng nhập và đặt đơn theo khóa và cửa sổ thời gian |

- **Mã lý do Hủy:** lưu ở cột riêng. Đã chốt `out_of_stock` (`Hết hàng`) và `other` (`Khác`, kèm chữ đã nhập). Tên mã của các lý do còn lại do bước kiến trúc chốt.
- **Dòng kết quả xử lý hoàn tiền:** bước kiến trúc chốt ghi Trạng thái cũ và mới giống nhau hay thêm loại sự kiện. Điều kiện: giữ được kết quả và không đổi mốc Khách hàng thấy (FR-7).

## Bản đồ route đề xuất

| Route | Sau thay đổi |
|---|---|
| `POST /api/orders` | Giữ, thêm giới hạn và cấp Quyền xem đơn |
| `GET /api/orders` | Chỉ Nhân viên và Quản lý, trả danh sách theo tab của FR-9 |
| `POST /api/orders/search` | Mới, đề xuất. Chỉ Nhân viên và Quản lý, tìm theo Mã đơn hoặc số điện thoại; từ khóa nằm trong body, không lên URL |
| `GET /api/orders/:id` | Nhân viên, Quản lý, hoặc Quyền xem đơn với Dữ liệu tối thiểu |
| `PATCH /api/orders/:id` | Chỉ Nhân viên và Quản lý, theo FR-10, FR-12 và FR-13 |
| Đường ghi kết quả xử lý hoàn tiền | Kiến trúc chốt. Chỉ Quản lý, gồm `Đã xử lý hoàn tiền` và ghi thêm `Đã hoàn tiền`, đính chính về `Khách chưa chuyển tiền` kèm lý do (FR-21). Mỗi thao tác chỉ hợp lệ theo kết quả mới nhất; lần ghi trùng nhận lỗi xung đột, không dùng `INVALID_STATUS_TRANSITION` vì Trạng thái không đổi |
| `POST /api/orders/lookup` | Mới, Tra đơn |
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
| `src/features/orders/order-errors.ts:1` | 5 mã lỗi, `details` là `Record<string, string>` | Thêm lỗi cho 401, 403, 429 và lỗi xung đột khi ghi trùng kết quả hoàn tiền; mở rộng kiểu `details` để chứa danh sách dòng thiếu |
| `src/app/api/orders/route.ts:6` | `GET` không kiểm tra quyền | Chặn theo vai |
| `src/app/api/orders/[id]/route.ts:6` | `GET` và `PATCH` không kiểm tra quyền | Chặn theo vai và Quyền xem đơn |
| `src/app/orders/[id]/page.tsx:69` | Nút hủy của khách | Gỡ |
| `src/app/orders/[id]/page.tsx:111` | Hiện đủ thông tin người nhận | Chỉ hiện Dữ liệu tối thiểu |
| `src/app/orders/[id]/page.tsx:129` | Thông tin chuyển khoản khi `pending` | Giữ điều kiện |
| `src/components/layout/nav-links.tsx:10` | Menu "Đơn hàng" tới `/orders` | Trỏ tới Tra đơn |
| `src/features/catalog/catalog-service.ts:71` | Trạng thái tồn từ số tĩnh | Đọc từ `inventory` |
| `src/features/catalog/catalog-service.ts:150` | Bộ lọc `inStock` từ số tĩnh | Đọc từ `inventory` |
| `src/features/catalog/components/stock-badge.tsx`, `product-card.tsx` | Hiển thị theo `product.stock` | Nhận Tồn kho từ dữ liệu động |
| `src/app/products/[slug]/page.tsx:21` | `generateStaticParams` | Bảo đảm tồn kho được đọc động |
| `src/features/cart/cart-reducer.ts:10` | Giới hạn theo `stock` đã lưu trong giỏ | Kiểm lại theo Tồn kho khi thanh toán |

## Test bị ảnh hưởng

- `src/app/api/orders/route.test.ts:59`: `GET` không còn trả 200 khi không có quyền.
- `e2e/shopping-flow.spec.ts:33`: luồng sau đặt hàng và bước "Tất cả đơn hàng" phải viết lại.
- `src/features/checkout/components/checkout-form.test.tsx:69`: giữ được nếu vẫn dùng URL `/orders/{id}?placed=1`.
- `playwright.config.ts`: `webServer` cần PostgreSQL và env của DB e2e.
- Repo chưa có `.github/workflows`, nên chưa có CI.
