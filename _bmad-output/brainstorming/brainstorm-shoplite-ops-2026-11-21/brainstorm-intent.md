# Brainstorm Intent: ShopLite Ops — Vận hành đơn hàng & Tiến trình đơn

- **Ngày:** 2026-11-21
- **Trạng thái:** Đã qua phản biện Party Mode (`--mode subagent`, 5 vai trò) & Pre-mortem / Assumption Audit (`bmad-advanced-elicitation`)
- **Nguồn:** `.memlog.md` (**73 ý tưởng**) + `phan-bien.md` (4 quyết định chốt từ chủ sản phẩm `nab`)
- **Mục tiêu:** Chốt phạm vi MVP sắc nét trên codebase ShopLite (Next.js 16, không dịch vụ ngoài) cùng danh mục rủi ro & biện pháp phòng ngừa sẵn sàng cho Product Brief & PRD (Bài 4.4).

---

## 1. Hiện trạng đọc trực tiếp từ codebase ShopLite (Brownfield)

| Phát hiện trong code thật | Vị trí file | Tác động tới thiết kế |
| :--- | :--- | :--- |
| `ORDER_STATUSES` đã có đủ `pending`, `confirmed`, `shipping`, `delivered`, `cancelled` nhưng chưa có luồng chuyển trạng thái | `src/features/orders/types.ts` | Cần máy trạng thái thuần túy kiểm soát ma trận chuyển đổi 5×5. |
| `PATCH /api/orders/:id` hiện chỉ chấp nhận `{ "status": "cancelled" }` | `src/app/api/orders/[id]/route.ts` | Giữ nguyên hợp đồng khách hủy `pending` để không vỡ E2E; tách API `/api/admin/orders/:id/status` cho nhân viên. |
| `placeOrder()` kiểm tra `quantity > product.stock` từ `products.ts` tĩnh nhưng **không trừ tồn kho** | `src/features/orders/order-service.ts`, `src/data/products.ts` | Cần `storage/inventory.json` (khởi tạo từ `products.ts`), trừ ngay khi đặt (`pending`) trong khóa tuần tự. |
| `/products/[slug]/page.tsx` dùng `generateStaticParams()` đọc dữ liệu tĩnh lúc build | `src/app/products/[slug]/page.tsx` | Phải chuyển sang đọc động (`force-dynamic`) tồn kho thực từ `inventoryRepository` để hết hàng hiển thị ngay. |
| `createJsonFileOrderRepository` dùng chung một file `${filePath}.tmp` không có khóa tuần tự | `src/features/orders/order-repository.ts` | Ghi đồng thời dễ mất đơn hoặc lỗi `ENOENT` → cần in-process async mutex + tên file tạm theo UUID. |
| `Order` chỉ có `createdAt`, `updatedAt`, chưa có `statusHistory` và chưa có bảo vệ route admin | `src/features/orders/types.ts`, `src/app/orders/` | Thêm `statusHistory?: OrderStatusEvent[]` (tương thích ngược đơn cũ) và dựng `src/proxy.ts` + xác thực HMAC cho `/admin/*` & `/api/admin/*`. |

---

## 2. Quyết định nghiệp vụ đã chốt (từ Party Mode — `nab`)

1. **Trừ tồn kho ngay khi khách đặt (`pending`)**: Chống bán lố tuyệt đối ngay trong `placeOrder()`. Màn duyệt `/admin/orders` hiển thị rõ `"Đã giữ X cho đơn này · Còn cho đơn mới: Y"` để tránh ảo giác hết hàng.
2. **Phạm vi hủy & hoàn kho của nhân viên**:
   - Khách hàng: chỉ được hủy khi `pending` (giữ nguyên quy tắc cũ) $\rightarrow$ tự động hoàn kho.
   - Nhân viên: được hủy ở `pending`, `confirmed` (**tự động hoàn kho idempotent**) VÀ `shipping` (giao thất bại — **KHÔNG tự động hoàn kho**, ghi cờ `restocked: false` trong `statusHistory` chờ kiểm kê hàng hoàn thực tế). Không được hủy `delivered`.
3. **Phạm vi MVP tinh gọn**: Giữ đủ 5 mục MUST (bao gồm Timeline 4 bước đơn giản cho khách, **không polling 30s**), đẩy `"tra cứu SĐT + rate limit"` và `"polling 30s"` ra ngoài MVP, giữ nguyên `/orders` công khai để không gãy `e2e/shopping-flow.spec.ts`.
4. **Bảo vệ `/admin` nghiêm ngặt (Fail-Closed)**: Khi thiếu biến môi trường `ADMIN_PASSCODE`, khóa cứng truy cập và trả `503 Service Unavailable` (tuyệt đối không fallback passcode mặc định).

---

## 3. Phạm vi MVP hội tụ theo MoSCoW

### MUST (5 mục cốt lõi — triển khai 100% trên stack hiện có, không dịch vụ ngoài)
1. **Máy trạng thái & lịch sử đơn hàng**: Hàm thuần kiểm soát vòng đời `pending → confirmed → shipping → delivered` và `cancelled` (phân biệt `customer` vs `staff`, cờ hoàn kho `restocked`), lưu `statusHistory?: OrderStatusEvent[]` tương thích ngược 100% với đơn cũ trong `storage/orders.json`.
2. **Trang vận hành `/admin/orders` kèm tồn kho inline rõ ràng**: Danh sách ưu tiên hàng chờ xử lý, lọc theo trạng thái (lưu trên URL query), tìm kiếm theo mã đơn/SĐT/tên khách, hiển thị rõ tồn kho giữ chỗ (`Đã giữ X · Còn cho đơn mới: Y`) kèm mã màu cảnh báo, nút chuyển đúng 1 bước hợp lệ, bắt buộc nhập lý do (có chip chọn nhanh) khi nhân viên hủy, responsive mobile 390px.
3. **Bảo vệ truy cập quản trị (Fail-Closed)**: Trang `/admin/login` xác thực `ADMIN_PASSCODE` từ biến môi trường (trả `503` nếu chưa cấu hình), phát cookie `HttpOnly` ký `HMAC-SHA256` (so sánh `timingSafeEqual`, thời hạn 8 giờ + nút Đăng xuất), kiểm tra ở `src/proxy.ts` và bắt buộc kiểm tra lại ở mọi route `/api/admin/*`.
4. **Tồn kho thực tế & an toàn đồng thời**: Lưu tồn kho tại `storage/inventory.json`, bọc chuỗi *đọc kho → kiểm tra all-or-nothing → trừ kho → lưu đơn* trong async mutex (kèm rollback nếu lưu đơn lỗi) và file tạm UUID; hoàn kho idempotent khi hủy `pending`/`confirmed` (không hoàn khi hủy `shipping`); đồng bộ hiển thị động lên catalog (`/products`, `/products/[slug]`).
5. **Timeline tiến trình đơn hàng cho khách (đơn giản, không polling)**: Nâng cấp `/orders/[id]` hiển thị tiến trình 4 bước kèm mốc thời gian, lý do hủy (nếu có) và nút "Làm mới trạng thái" thủ công; giữ nguyên quy tắc khách chỉ tự hủy được khi `pending`.

### SHOULD (Ưu tiên ngay sau Must)
- Thẻ KPI nhanh đầu trang `/admin/orders` (số đơn từng trạng thái, doanh thu đơn đã giao) & cảnh báo đơn chờ quá 2 giờ.
- Kiểm tra xung đột cập nhật đồng thời (`expectedStatus` → trả `409 Conflict` nếu 2 nhân viên thao tác cùng lúc).
- Cho phép gắn ghi chú tùy chọn (VD: mã vận đơn) khi chuyển `shipping` và nút "Copy mẫu tin nhắn báo khách" cho nhân viên dán vào Zalo/SMS.
- Tự lưu mã đơn gần đây vào `localStorage["shoplite:my-orders"]` + nút "Sao chép link theo dõi" trên màn đặt hàng thành công.

### COULD (Mở rộng về sau)
- Xác nhận hàng loạt nhiều đơn `pending` (Bulk Confirm).
- Tab "Tồn kho" trong `/admin` cho phép xem biến động & nhập thêm kho (`+N`) hoặc xác nhận hoàn kho tay cho đơn hủy từ `shipping`.
- Nút "Đặt lại các sản phẩm này" cho đơn hủy; in phiếu nhặt hàng.

### WON'T (Ngoài phạm vi MVP)
- Polling 30s tự động trên `/orders/[id]` (tránh tranh chấp I/O JSON & flaky E2E).
- Tra cứu đơn theo SĐT + rate-limit trong RAM & khóa danh sách công khai `/orders` (tách sang initiative bảo mật riêng để giữ nguyên `e2e/shopping-flow.spec.ts`).
- Phân quyền đa vai trò (RBAC), gửi email/SMS/Zalo tự động, tích hợp hãng vận chuyển ngoài, cơ sở dữ liệu ngoài.

---

## 4. Rủi ro đã nhận diện (Pre-mortem Analysis & Assumption Audit)

### A. Pre-mortem Analysis (*"6 tháng sau ShopLite Ops thất bại — vì sao?"*)

| # | Kịch bản thất bại (6 tháng sau) | Nguyên nhân gốc | Biện pháp phòng ngừa bắt buộc |
| :---: | :--- | :--- | :--- |
| **PM-1** | **Kho bị lệch/âm số lượng không thể đối soát** | Trừ kho xong nhưng `orderRepository.save()` lỗi không rollback; hoặc retry API hủy cộng tồn kho 2 lần; hoặc hủy `shipping` cộng nhầm kho ảo. | (1) Kiểm tra đủ tất cả món trước khi trừ (*all-or-nothing*) + rollback kho trong `catch`; (2) Ghi cờ `inventoryRestocked?: boolean` trên `Order` để hoàn kho tuyệt đối idempotent; (3) Hủy từ `shipping` giữ `inventoryRestocked = false` và hiển thị nhãn *"Chờ kiểm kê hàng hoàn"*. |
| **PM-2** | **Mất đơn hàng giờ cao điểm / hỏng file JSON** | `order-repository.ts` và `inventory-repository.ts` ghi đồng thời bằng tên file `.tmp` cố định hoặc không chung một hàng đợi khóa. | Dùng 1 bộ khóa tuần tự dùng chung (`storage-lock.ts`) cho toàn bộ thao tác ghi `orders.json` + `inventory.json`, kết hợp tên file tạm duy nhất theo `crypto.randomUUID()` trước khi `fs.rename()` và test song song bằng `Promise.allSettled()`. |
| **PM-3** | **Khách đặt hết hàng nhưng web vẫn cho bấm "Thêm vào giỏ" rồi báo lỗi ở bước cuối** | `/products` và `/products/[slug]` vẫn dùng `generateStaticParams()` / dữ liệu `products.ts` đóng băng lúc build thay vì đọc tồn kho thực. | Gỡ prerender tĩnh phụ thuộc tồn kho (chuyển `force-dynamic`), hợp nhất hàm `catalog-service` đọc tồn kho động từ `inventoryRepository`, và giữ nguyên form `/checkout` kèm thông báo đúng món vừa hết nếu có race ở giây cuối. |
| **PM-4** | **Nhân viên hủy oan đơn của khách hoặc nhầm trạng thái** | Màn duyệt hiển thị `Còn kho: 0` sau khi đã trừ lúc `pending` (ảo giác hết hàng), hoặc bấm nhầm nút Hủy không có xác nhận. | Ghi rõ nhãn `"Đã giữ X cho đơn này · Còn cho đơn mới: Y"` trên từng dòng đơn; tách riêng nút chuyển trạng thái chính với nút Hủy (bắt buộc mở hộp xác nhận + nhập lý do). |
| **PM-5** | **Lỗ hổng bảo mật: khách tự duyệt/hủy đơn người khác qua API** | Chỉ chặn truy cập trang `/admin/orders` ở `src/proxy.ts` nhưng quên kiểm tra cookie HMAC trong route handler `/api/admin/*`, hoặc để passcode mặc định khi deploy quên env. | Tạo helper `requireAdminSession(request)` bắt buộc gọi ở đầu mọi route `/api/admin/*` (trả `401`), kiểm tra chữ ký HMAC bằng `crypto.timingSafeEqual`, trả `503` khi thiếu `ADMIN_PASSCODE`, và viết route test xác nhận request không cookie luôn bị chặn `401`. |
| **PM-6** | **Vỡ đơn hàng lịch sử & gãy bộ test E2E hiện có** | Code mới giả định mọi `Order` đều có `statusHistory` mảng khác rỗng, hoặc đổi cấu trúc response của `/api/orders`. | Khai báo `statusHistory?: OrderStatusEvent[]` là optional + hàm helper `getOrderTimeline(order)` tự tổng hợp fallback cho đơn cũ; giữ nguyên hợp đồng `POST/GET /api/orders` và `PATCH /api/orders/:id` phía khách; kiểm chứng `npm run check` & `npm run test:e2e`. |

### B. Assumption Audit (Kiểm toán các giả định cốt lõi)

| Giả định | Độ tin cậy | Tác động nếu sai | Biện pháp gia cố (Shore Up) |
| :--- | :---: | :---: | :--- |
| **A1:** ShopLite chỉ chạy **1 tiến trình Node.js** (single-instance) nên async mutex trong RAM đủ chống race condition. | Cao *(môi trường học tập/shop nhỏ)* | **Cao** *(nếu chạy đa instance sẽ vẫn race)* | Ghi rõ giới hạn single-node vào Architecture; thiết kế interface `OrderRepository` & `InventoryRepository` tách biệt để dễ thay bằng DB transaction khi mở rộng. |
| **A2:** Chỉ cần **1 mật khẩu quản trị chung (`ADMIN_PASSCODE`)** là đủ, chưa cần phân biệt nhân viên A hay B bấm duyệt. | Trung bình | **Trung bình** | Cho phép tùy chọn nhập tên ngắn/ghi chú trong `statusHistory` khi cần, giữ kiến trúc session tách riêng (`admin-auth.ts`) để dễ nâng lên tài khoản cá nhân sau này. |
| **A3:** Khách hàng đặt COD ảo/không nghe máy sẽ được nhân viên chủ động hủy thủ công thay vì tự động hết hạn đơn `pending`. | Trung bình | **Trung bình** *(có thể giữ hàng tạm thời)* | Hiển thị rõ thời gian đơn đã chờ (cảnh báo > 2 giờ ở SHOULD) giúp nhân viên phát hiện sớm và hủy đơn ảo để giải phóng tồn kho. |
| **A4:** File `storage/inventory.json` luôn khớp danh sách 16 sản phẩm trong `src/data/products.ts`. | Cao | **Trung bình** *(thêm sản phẩm mới bị thiếu key)* | Khi đọc tồn kho cho một `productId`, nếu chưa có key trong `inventory.json` thì tự fallback lấy `product.stock` mặc định từ `products.ts`. |
