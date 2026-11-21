# Product Brief Addendum: ShopLite Ops

Tài liệu này lưu các chi tiết kỹ thuật, đối chiếu codebase, phương án đã loại bỏ và rủi ro đã chấp nhận từ quá trình Brainstorm (4.2), Party Mode & Pre-mortem (4.3) và Forge Idea (`HARDENED`) để bàn giao trực tiếp cho PRD (4.4) và Architecture (4.6).

## 1. Bản đồ Codebase hiện có (đã kiểm chứng trên nhánh `binhna/module-4`)
- `src/features/orders/types.ts`: Đã định nghĩa `ORDER_STATUSES = ["pending", "confirmed", "shipping", "delivered", "cancelled"]` và `ORDER_STATUS_LABELS`; `Order` chưa có `statusHistory` và `inventoryRestocked`.
- `src/features/orders/order-errors.ts`: Đã có sẵn `VALIDATION_ERROR` (400), `PRODUCT_NOT_FOUND` (422), `INSUFFICIENT_STOCK` (409), `ORDER_NOT_FOUND` (404), `INVALID_STATUS_TRANSITION` (409).
- `src/features/orders/order-service.ts`: `placeOrder()` đọc tồn kho từ `getProductById` (`src/data/products.ts`) nhưng không trừ kho; `cancelOrder()` chỉ cho hủy khi `pending`.
- `src/features/orders/order-repository.ts`: `writeAll()` dùng chung `${filePath}.tmp` không có khóa tuần tự.
- `src/features/orders/server.ts`: Đọc `process.env.ORDERS_FILE ?? DEFAULT_ORDERS_FILE`.
- `src/app/api/orders/[id]/route.ts`: `PATCH` hiện chỉ nhận `{ "status": "cancelled" }`.
- `src/app/products/page.tsx`, `src/app/products/[slug]/page.tsx`, `src/app/api/products/route.ts`, `src/app/api/products/[slug]/route.ts`: Đang đọc tồn kho tĩnh từ `src/data/products.ts`; đặc biệt `[slug]/page.tsx` dùng `generateStaticParams()`.
- `e2e/shopping-flow.spec.ts`: Dòng 38–39 phụ thuộc vào việc nhìn thấy `order-row` tại `/orders` ngay sau khi đặt hàng.

## 2. Phương án đã cân nhắc & loại bỏ (Rejected Alternatives)
| Phương án loại bỏ | Lý do loại bỏ |
| :--- | :--- |
| Trừ kho ở bước `confirmed` | Không chặn được bán vượt tồn kho khi 2 khách cùng đặt sản phẩm `stock = 1`. |
| Tự động hoàn kho khi hủy `shipping` | Tạo tồn kho ảo trước khi hàng hoàn thực tế về kho. |
| Đẩy thao tác hoàn kho tay sang COULD | Tạo ngõ cụt kẹt hàng hoàn vĩnh viễn sau khi hủy đơn `shipping` (phát hiện ở Forge Idea). |
| Polling 30s trên `/orders/[id]` | Tranh chấp I/O file JSON và làm chập chờn test E2E. |
| Tra cứu đơn bằng SĐT + rate-limit RAM | Rate-limit RAM mất khi restart và mâu thuẫn với `/orders` công khai. |
| Fallback passcode mặc định khi thiếu `ADMIN_PASSCODE` | Nguy cơ lộ quyền quản trị nếu quên biến môi trường. |

## 3. Rủi ro chấp nhận có kiểm soát (Known Limits)
- **Single-node async mutex:** Chỉ an toàn trong 1 tiến trình Node.js; đủ cho ShopLite, không áp dụng cho triển khai đa instance.
- **Đơn COD ảo:** Chấp nhận không thêm CAPTCHA/OTP trong MVP; xử lý vận hành bằng hủy nhanh trên hàng chờ `pending`.
- **Công khai `/orders`:** Giữ nguyên trong MVP để đảm bảo tương thích E2E, tách sang initiative bảo mật sau MVP.
