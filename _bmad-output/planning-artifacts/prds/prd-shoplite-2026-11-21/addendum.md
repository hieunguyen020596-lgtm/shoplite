# PRD Addendum: ShopLite Ops (Bàn giao cho `bmad-ux` & `bmad-architecture`)

Tài liệu bổ trợ cho `prd.md`, chứa bản đồ mã nguồn thực tế, chi tiết payload TypeScript đề xuất cho API, các bẫy triển khai brownfield đã phát hiện khi đối chiếu code thật, và danh sách phương án đã loại bỏ.

---

## 1. Bản đồ mã nguồn hiện có cần chạm tới (Đã đối chiếu trực tiếp)

| Thành phần | Đường dẫn thực tế | Hiện trạng | Yêu cầu thay đổi |
| :--- | :--- | :--- | :--- |
| Kiểu dữ liệu đơn | `src/features/orders/types.ts` | Đã có `ORDER_STATUSES` 5 trạng thái; chưa có `statusHistory`, `inventoryRestocked` | Bổ sung `OrderStatusEvent` (`status`, `at`, `actor`, `action`, `note?`), `statusHistory?: OrderStatusEvent[]`, `inventoryRestocked?: boolean` |
| Mã lỗi đơn hàng | `src/features/orders/order-errors.ts` | Đã có `VALIDATION_ERROR` (400), `PRODUCT_NOT_FOUND` (422), `INSUFFICIENT_STOCK` (409), `ORDER_NOT_FOUND` (404), `INVALID_STATUS_TRANSITION` (409) | Tái sử dụng nguyên trạng; bổ sung mã lỗi auth ở module admin auth (`UNAUTHORIZED` 401, `ADMIN_NOT_CONFIGURED` 503) |
| Nghiệp vụ đơn hàng | `src/features/orders/order-service.ts` | `placeOrder()` không trừ kho; `cancelOrder()` chỉ xử lý khách hủy `pending`; `listOrders()` cố định mới nhất trước | Tích hợp `InventoryRepository` + Khóa tuần tự + `order-state-machine.ts`; thêm `transitionOrderStatus()`, `restockCancelledOrder()`, `listAdminOrders()` (lọc + đếm tab + FIFO cho `pending`) |
| Lưu trữ đơn hàng | `src/features/orders/order-repository.ts` | `writeAll()` ghi vào `${filePath}.tmp` cố định không lock | Đổi sang file tạm `${filePath}.${crypto.randomUUID()}.tmp` + Khóa tuần tự chung; giữ tương thích đọc/ghi an toàn với trường thừa (`discount`, `couponCode`) của đơn cũ |
| Khởi tạo server | `src/features/orders/server.ts` | Khởi tạo singleton `orderService` dùng `ORDERS_FILE` | Bổ sung khởi tạo `inventoryRepository` dùng `INVENTORY_FILE` (mặc định `storage/inventory.json`) và dùng chung một Khóa tuần tự |
| API đơn khách | `src/app/api/orders/[id]/route.ts` | `PATCH` chỉ nhận `{ "status": "cancelled" }` | Giữ nguyên hợp đồng Khách hàng; hoàn kho idempotent khi khách hủy `pending` (chỉ hoàn cho đơn có `statusHistory`) |
| Mặt tiền bán hàng & Catalog | `src/app/page.tsx`, `src/app/products/page.tsx`, `src/app/products/[slug]/page.tsx`, `src/app/api/products/route.ts`, `src/app/api/products/[slug]/route.ts`, `src/features/catalog/catalog-service.ts` | Đọc `stock` tĩnh đồng bộ từ `src/data/products.ts`; `src/app/page.tsx` gọi `getFeaturedProducts(4)` không có `force-dynamic`; `[slug]/page.tsx` dùng `generateStaticParams()` | Giữ nguyên các hàm sync thuần trong `catalog-service.ts` (để không vỡ `catalog-service.test.ts`); tạo lớp helper async gắn `stock` động từ `inventoryRepository`; chuyển `/`, `/products`, `/products/[slug]` sang `export const dynamic = "force-dynamic"` và gỡ `generateStaticParams()` |
| Chi tiết đơn khách | `src/app/orders/[id]/page.tsx`, `src/features/orders/components/cancel-order-button.tsx` | Hiện badge trạng thái và `CancelOrderButton` khi `pending`, chưa có Timeline tiến trình | Bổ sung component Timeline tiến trình 4 bước (có fallback cho đơn cũ thiếu `statusHistory`) + nút "Làm mới trạng thái" (`router.refresh()`) + hướng dẫn liên hệ khi đơn không còn `pending` |
| Bảo vệ tuyến (Next 16) | `src/proxy.ts` *(tạo mới)* | Chưa tồn tại (Next.js `16.4.2`) | Next.js 16 dùng `src/proxy.ts` thay `middleware.ts` để chuyển hướng `/admin/*` (trừ `/admin/login`) sang `/admin/login` khi thiếu `ADMIN_PASSCODE` hoặc cookie HMAC không hợp lệ |
| Test hiện có cần giữ xanh | `e2e/shopping-flow.spec.ts`, `src/features/orders/order-service.test.ts`, `src/features/orders/order-repository.test.ts`, `src/features/catalog/catalog-service.test.ts` | Đều đang pass (12 test files, 83 unit tests) | Bắt buộc giữ nguyên pass 100%, bổ sung test ma trận 5×5, test song song `Promise.allSettled`, test đơn cũ, test `503`/`401` |

---

## 2. Chi tiết Schema API đề xuất cho `bmad-architecture`

Mọi endpoint `/api/admin/*` (trừ `POST /api/admin/auth/logout`) chạy kiểm tra theo đúng thứ tự: **`503 ADMIN_NOT_CONFIGURED` → `401 UNAUTHORIZED` → validate đầu vào (`400`) → nghiệp vụ (`404`/`409`/`200`)**.

- `POST /api/admin/auth/login`
  - Request: `{ passcode: string }`
  - Responses: `200 { ok: true }` + `Set-Cookie: shoplite_admin=<payload>.<hmac>; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800` (thêm `; Secure` khi `NODE_ENV === "production"`); `400 VALIDATION_ERROR`; `401 UNAUTHORIZED`; `503 ADMIN_NOT_CONFIGURED`.
- `POST /api/admin/auth/logout`
  - Request: Không yêu cầu body và không yêu cầu cookie còn hạn.
  - Responses: `200 { ok: true }` + `Set-Cookie: shoplite_admin=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`.
- `GET /api/admin/orders?status=all|pending|confirmed|shipping|delivered|cancelled&q=<keyword>`
  - Responses: `200 { orders: Order[], counts: Record<OrderStatus | "all", number>, availableStockByProductId: Record<string, number> }` (`counts` tính trên toàn bộ đơn trước khi lọc theo `status`; `status=pending` sắp xếp `createdAt` tăng dần FIFO, các tab khác giảm dần mới nhất trước; `?status=` không hợp lệ fallback về `all`); `401 UNAUTHORIZED`; `503 ADMIN_NOT_CONFIGURED`.
- `PATCH /api/admin/orders/:id/status`
  - Request (JSON bắt buộc): `{ status: OrderStatus, note?: string, expectedStatus?: OrderStatus }` (giao diện `/admin/orders` luôn gửi `expectedStatus`; khi `status === "cancelled"` bắt buộc `note.trim().length` từ `1..200`; các bước khác `note` tùy chọn `<= 200`).
  - Responses: `200 { order: Order }`; `400 VALIDATION_ERROR`; `401 UNAUTHORIZED`; `404 ORDER_NOT_FOUND`; `409 INVALID_STATUS_TRANSITION`; `503 ADMIN_NOT_CONFIGURED`.
- `POST /api/admin/orders/:id/restock`
  - Request: Chấp nhận body rỗng **hoặc** JSON tùy chọn `{ note?: string }` (`<= 200` ký tự).
  - Responses: `200 { order: Order }` (với `inventoryRestocked = true` và phần tử `statusHistory` mới `{ status: "cancelled", at, actor: "staff", action: "restock", note? }`); `400 VALIDATION_ERROR` (chỉ khi body không rỗng bị sai JSON hoặc `note > 200`); `401 UNAUTHORIZED`; `404 ORDER_NOT_FOUND`; `409 INVALID_STATUS_TRANSITION` (nếu `status !== "cancelled"` hoặc `inventoryRestocked !== false`); `503 ADMIN_NOT_CONFIGURED`.

---

## 3. Lưu ý bẫy triển khai Brownfield (dành cho `bmad-architecture` & Dev)

1. **`crypto.timingSafeEqual` và lỗi lệch độ dài byte:** Nếu so sánh trực tiếp `Buffer.from(input)` với `Buffer.from(ADMIN_PASSCODE)`, Node.js sẽ ném `RangeError` (gây `500`) khi độ dài khác nhau. Luôn băm cả hai chuỗi bằng `crypto.createHash("sha256").update(...).digest()` (đều dài 32 byte) trước khi gọi `timingSafeEqual`.
2. **Bảo toàn hàm sync trong `catalog-service.ts`:** Các bài test hiện có trong `src/features/catalog/catalog-service.test.ts` và DI mặc định `findProduct = getProductById` gọi đồng bộ. Do đó không đổi chữ ký sync hiện có; bổ sung hàm async chuyên biệt đọc chồng `InventoryRepository` cho Server Components (`/`, `/products`, `/products/[slug]`) và API `/api/products/*`.
3. **Dữ liệu thực tế trong `storage/orders.json`:** Tập dữ liệu lịch sử hiện có chứa các đơn thiếu `statusHistory`, thiếu `inventoryRestocked`, một số đơn có thêm trường lịch sử như `discount`/`couponCode`, và nhiều đơn `pending` tạo trước khi có `storage/inventory.json`. Parser cần giữ nguyên/bỏ qua an toàn các trường thừa, không cộng khống tồn kho khi hủy đơn `pending` tiền tồn kho (`statusHistory === undefined`), và không hiển thị nút restock cho đơn `cancelled` cũ (`inventoryRestocked === undefined`).
4. **Tồn kho lưu đệm trong `localStorage["shoplite:cart"]`:** Giỏ hàng phía trình duyệt lưu `item.stock` tại thời điểm thêm vào giỏ nên có thể trễ so với Tồn kho khả dụng thực tế. Server `POST /api/orders` luôn là nguồn chân lý cuối cùng (`409 INSUFFICIENT_STOCK`), và form `/checkout` phải giữ nguyên dữ liệu đã điền + giỏ hàng khi gặp `409`.

---

## 4. Tóm tắt các phương án đã loại bỏ (từ Party Mode & Forge Idea)

1. **Trừ kho ở `confirmed`:** Loại vì không ngăn được bán vượt Tồn kho khả dụng khi 2 Khách hàng đặt đồng thời món còn 1 chiếc.
2. **Tự hoàn kho khi hủy `shipping`:** Loại vì tạo tồn kho ảo trước khi hàng hoàn thực tế về kho.
3. **Đẩy xác nhận hoàn kho tay sang COULD:** Loại vì tạo ngõ cụt kẹt hàng hoàn vĩnh viễn sau khi hủy đơn `shipping`.
4. **Polling 30s trên `/orders/[id]`:** Loại khỏi MVP vì tranh chấp I/O file JSON & flaky E2E.
5. **Tra cứu SĐT + rate-limit RAM & khóa `/orders` công khai:** Loại khỏi MVP vì rate-limit RAM mất khi restart và phá vỡ `e2e/shopping-flow.spec.ts`.
6. **Passcode dev mặc định:** Loại hoàn toàn theo nguyên tắc Fail-Closed `503`.
