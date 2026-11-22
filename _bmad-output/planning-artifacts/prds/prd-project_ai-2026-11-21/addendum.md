---
title: "Addendum — PRD Vận hành đơn hàng ShopLite"
created: 2026-11-21
updated: 2026-11-21
---

# Addendum: PRD Vận hành đơn hàng ShopLite

Đây là các ghi chú về cách hiện thực, dành cho `bmad-architecture`. PRD chỉ nói **cái gì**; phần này gợi ý **bằng cách nào**. Mọi điểm ở đây đều có thể bị architecture thay đổi.

## Bản đồ code bị ảnh hưởng (đã kiểm chứng 2026-11-21)

| Khu vực          | File                                           | Thay đổi dự kiến                                                                                                                                                                                      |
| ---------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kiểu dữ liệu đơn | `src/features/orders/types.ts`                 | Thêm `failed` vào `ORDER_STATUSES` và `ORDER_STATUS_LABELS`; thêm `history?: StatusEvent[]` và `internalNotes?: Note[]` (tùy chọn để đơn cũ vẫn hợp lệ, FR-26)                                        |
| Nghiệp vụ đơn    | `src/features/orders/order-service.ts`         | `placeOrder` kiểm tra Tồn khả dụng và giữ hàng (FR-20); thêm `transition(id, to, actor, reason)` thay cho việc mỗi hành động một hàm; `cancelOrder` thành trường hợp riêng của `transition` cho Khách |
| Lỗi              | `src/features/orders/order-errors.ts`          | Thêm `UNAUTHENTICATED` 401, `FORBIDDEN` 403, `TOO_MANY_ATTEMPTS` 429                                                                                                                                  |
| Lưu trữ          | `src/features/orders/order-repository.ts`      | Thêm mutex trong process quanh read-modify-write; hiện chỉ có tmp+rename, chưa tuần tự hóa                                                                                                            |
| API              | `src/app/api/orders/route.ts`, `[id]/route.ts` | Chặn quyền cho GET danh sách; PATCH có kiểm tra quyền; tách API nhân viên (ví dụ `/api/staff/orders/:id/transitions`)                                                                                 |
| Trang khách      | `src/app/orders/page.tsx`, `[id]/page.tsx`     | Bỏ `listOrders()` phía server; ẩn PII khi chưa xác minh; thêm Timeline; thêm form tra đơn                                                                                                             |
| Catalog          | `src/features/catalog/catalog-service.ts`      | `getStockStatus` và bộ lọc `inStock` dùng Tồn khả dụng                                                                                                                                                |
| Giỏ hàng         | `src/features/cart/cart-reducer.ts`            | `stock` lấy từ Tồn khả dụng lúc thêm vào giỏ                                                                                                                                                          |
| Bảo vệ route     | `src/proxy.ts` (mới)                           | Next.js 16 đổi tên `middleware` thành `proxy`. Chặn `/staff/**` ngoài `/staff/login`                                                                                                                  |

## Gợi ý cơ chế

- **Danh sách nhân viên:** biến môi trường `STAFF_ACCOUNTS` (JSON `[{ "username", "displayName", "passwordHash" }]`) hoặc file `storage/staff.json` đã gitignore. Băm mật khẩu bằng `crypto.scrypt` của Node, không cần thêm dependency. Thêm một script `npm run staff:hash` để tạo hash.
- **Phiên:** cookie ký HMAC-SHA256 bằng `SESSION_SECRET`, chứa `{ username, exp }`. Không cần lưu phiên ở server.
- **Xác minh đơn:** cookie ký chứa danh sách Mã đơn đã xác minh, có giới hạn số lượng (ví dụ 20 mã gần nhất). `POST /api/orders` thêm mã vừa tạo vào cookie (FR-5). Danh sách ở `/orders` (FR-4) đọc từ chính cookie này, nên không cần localStorage và server vẫn kiểm được quyền.
- **Tồn kho** (đã chốt ở architecture AD-4): `storage/inventory.json` = `{ migratedAt, baselines: { [productId]: { onHand, asOf } } }` (`INVENTORY_FILE`), chỉ là **mốc**. Tồn thực = `onHand` − tổng số lượng các đơn `delivered` có `deliveredAt > asOf`. Hàng đang giữ = tổng số lượng các đơn `pending` (chưa quá hạn), `confirmed`, `shipping`. Không con số nào được lưu; tất cả tính bằng `computeStock` thuần. Nhập kho = ghi mốc mới.
- **Tính nguyên tử** (đã chốt ở architecture AD-3, AD-4): luồng xử lý đơn **chỉ ghi `orders.json`**, kể cả `delivered`. Mọi thao tác đọc → sửa → ghi đi qua một mutex trong process `withStoreLock`. Không còn vấn đề thứ tự ghi hai file.
- **Giới hạn tra sai:** `Map<orderId, {count, firstAt, lockedUntil}>` trong bộ nhớ (Câu hỏi mở 4).
- **Biến môi trường mới:** `SESSION_SECRET`, `STAFF_ACCOUNTS`, `INVENTORY_FILE` (mặc định `storage/inventory.json`), `ORDER_PENDING_TTL_HOURS` (mặc định 24).

## Phương án đã cân nhắc và loại

- **Trừ `inventory.json` khi giao (`delivered`):** bị loại ở bước architecture (AD-4). Cách này phải ghi hai file không nguyên tử. Tính Tồn thực từ đơn hàng thì không có nguồn số liệu thứ hai.
- **Lưu Hàng đang giữ thành bộ đếm riêng:** bị loại. Phải cập nhật ở mọi bước chuyển, dễ lệch, và cần cron để nhả hàng của đơn quá hạn.
- **localStorage làm bằng chứng quyền xem đơn:** bị loại. Server không kiểm được, nên chỉ dùng được để nhớ danh sách hiển thị.
- **Mật khẩu chung cho nhân viên:** bị loại (đã quyết ở brief), vì Lịch sử trạng thái mất ý nghĩa truy vết.
- **Cron tự hủy đơn quá hạn:** bị loại vì cần tiến trình nền. Kiểm tra khi đọc kết hợp với việc tính Hàng đang giữ đã loại đơn quá hạn là đủ.
