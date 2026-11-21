# Brainstorm Intent: ShopLite Ops — Vận hành đơn hàng & Tiến trình đơn

- **Ngày:** 2026-11-21
- **Chế độ:** Autonomous (`bmad-brainstorming` v6.12.4)
- **Nguồn:** `.memlog.md` (**54 ý tưởng** qua 5 kỹ thuật: *Role Playing*, *How Might We*, *Reverse Brainstorming*, *SCAMPER Method*, *Assumption Reversal*)
- **Mục tiêu:** Xác định phạm vi MVP khả thi trên codebase ShopLite (Next.js 16, không dịch vụ ngoài) và nhận diện rủi ro/câu hỏi mở trước khi bước sang Party Mode (4.3), Product Brief & PRD (4.4).

---

## 1. Hiện trạng đọc trực tiếp từ codebase ShopLite (Brownfield)

| Phát hiện trong code thật | Vị trí file | Tác động tới thiết kế |
| :--- | :--- | :--- |
| `ORDER_STATUSES` đã có đủ `pending`, `confirmed`, `shipping`, `delivered`, `cancelled` nhưng chưa có luồng chuyển trạng thái | `src/features/orders/types.ts` | Cần máy trạng thái thuần túy kiểm soát hợp lệ các bước chuyển. |
| `PATCH /api/orders/:id` hiện chỉ chấp nhận `{ "status": "cancelled" }` | `src/app/api/orders/[id]/route.ts` | Giữ nguyên cho khách hủy `pending`; cần API có xác thực riêng cho nhân viên. |
| `placeOrder()` kiểm tra `quantity > product.stock` từ `products.ts` tĩnh nhưng **không trừ tồn kho** | `src/features/orders/order-service.ts`, `src/data/products.ts` | Cần lớp lưu tồn kho ghi được (`storage/inventory.json`) và thống nhất nguồn đọc với catalog. |
| `createJsonFileOrderRepository` dùng chung một file `${filePath}.tmp` không có khóa tuần tự | `src/features/orders/order-repository.ts` | Ghi đồng thời có thể gây mất đơn hoặc bán vượt tồn kho → cần mutex + tên file `.tmp` theo UUID. |
| `Order` chỉ có `createdAt`, `updatedAt`, chưa có `statusHistory` và chưa có bảo vệ route admin | `src/features/orders/types.ts`, `src/app/orders/` | Thêm `statusHistory?: OrderStatusEvent[]` (tương thích ngược đơn cũ) và bảo vệ `/admin/*` + `/api/admin/*`. |

---

## 2. Phạm vi MVP hội tụ theo MoSCoW

### MUST (Tối đa 5 mục — triển khai được ngay trên stack hiện có)
1. **Máy trạng thái & lịch sử đơn hàng**: Hàm thuần quản lý vòng đời `pending → confirmed → shipping → delivered` (và `cancelled` có điều kiện) kèm `statusHistory` (trạng thái, thời gian, người thực hiện `customer`/`staff`, ghi chú/mã vận đơn), tương thích ngược 100% với đơn cũ trong `storage/orders.json`.
2. **Trang vận hành `/admin/orders`**: Danh sách đơn ưu tiên hàng chờ cần xử lý, lọc theo trạng thái (lưu trên URL query để F5 không mất), tìm kiếm theo mã đơn/SĐT/tên khách, nút chuyển đúng 1 bước kế tiếp hợp lệ, bắt buộc nhập lý do (kèm chip chọn nhanh) khi nhân viên hủy đơn, responsive tốt trên mobile 390px.
3. **Bảo vệ truy cập quản trị (không dịch vụ ngoài)**: Trang `/admin/login` với mật khẩu quản trị từ biến môi trường (`ADMIN_PASSCODE`) + cookie `HttpOnly` ký `HMAC-SHA256` (so sánh `timingSafeEqual`, thời hạn 1 ca 8 giờ, có nút Đăng xuất), kiểm tra tại `src/proxy.ts` và bắt buộc kiểm tra lại ở mọi API `/api/admin/*`.
4. **Tồn kho thực tế & an toàn đồng thời**: Lưu tồn kho tại `storage/inventory.json` (khởi tạo từ `products.ts`), trừ kho khi đặt và hoàn kho idempotent khi hủy; bổ sung khóa tuần tự + file tạm duy nhất theo UUID cho cả order và inventory repository; đồng bộ tồn kho hiển thị lên catalog (`ProductCard`, chi tiết sản phẩm).
5. **Timeline tiến trình đơn hàng cho khách**: Nâng cấp `/orders/[id]` hiển thị tiến trình 4 bước kèm mốc thời gian (và lý do nếu bị hủy); giữ nguyên quy tắc khách chỉ tự hủy được khi trạng thái là `pending`.

### SHOULD (Ưu tiên ngay sau Must)
- Thẻ KPI nhanh đầu trang `/admin/orders` (số đơn từng trạng thái, tổng doanh thu đơn đã giao).
- Cảnh báo đơn chờ xác nhận quá lâu (SLA > 2 giờ), badge nổi bật đơn giao nhanh (`express`) và cảnh báo sản phẩm sắp hết hàng (`stock <= 5`).
- Kiểm tra xung đột cập nhật đồng thời (`expectedStatus` → trả `409 Conflict` nếu 2 nhân viên thao tác cùng lúc).
- Cho phép gắn ghi chú tùy chọn (ví dụ mã vận đơn) khi chuyển sang `shipping` và dùng `statusHistory` làm audit log kiểm toán đơn hủy.

### COULD (Mở rộng nếu còn thời gian)
- Xác nhận hàng loạt nhiều đơn `pending` (Bulk Confirm) vào giờ cao điểm.
- Nút "Làm mới trạng thái" (hoặc polling nhẹ) và nút "Đặt lại các sản phẩm này" cho đơn đã hủy trên `/orders/[id]`.
- Tab "Tồn kho" trong `/admin` cho phép xem biến động và nhập thêm hàng (`+N`).
- Lọc theo phương thức thanh toán (`cod` / `bank_transfer`) và xem nhanh phiếu nhặt hàng (packing slip).

### WON'T (Ngoài phạm vi MVP)
- Phân quyền đa vai trò phức tạp (RBAC), quản lý nhiều tài khoản nhân viên.
- Gửi email/SMS/Zalo tự động khi đổi trạng thái đơn.
- Tích hợp API hãng vận chuyển ngoài (GHN, GHTK, Viettel Post).
- Chuyển sang cơ sở dữ liệu ngoài (PostgreSQL/MongoDB).

---

## 3. Rủi ro trọng yếu cần phòng thủ (từ Reverse Brainstorming & Assumption Reversal)

1. **Bán vượt tồn kho (Overselling):** Hai đơn đặt cùng lúc cho sản phẩm chỉ còn 1 cái → kiểm tra & trừ kho nguyên tử trong khóa tuần tự.
2. **Nhảy bước / đi lùi trạng thái / hoàn kho đúp:** Chặn hoàn toàn ở máy trạng thái server; chỉ hoàn kho một lần duy nhất khi chuyển sang `cancelled`.
3. **Lỗ hổng chỉ chặn UI mà quên chặn API:** Mọi route `/api/admin/*` phải kiểm tra cookie HMAC phía server (`401 Unauthorized`) và có hạn phiên rõ ràng + nút đăng xuất.
4. **Vỡ dữ liệu cũ & test hiện có:** Đơn cũ không có `statusHistory` vẫn mở bình thường; `e2e/shopping-flow.spec.ts` và hợp đồng khách hàng ở `/orders` không bị phá vỡ.

---

## 4. Câu hỏi mở cần chốt ở Bài 4.3 (Party Mode) & Bài 4.4 (Brief / PRD)

1. **Thời điểm trừ tồn kho:** Trừ ngay khi khách đặt (`pending` — giữ hàng) hay chỉ trừ khi nhân viên xác nhận (`confirmed`)?
2. **Phạm vi hủy của nhân viên:** Nhân viên được hủy đơn ở `pending` + `confirmed`, hay được hủy cả khi đang `shipping` (giao thất bại / khách bom hàng)?
3. **Chính sách `ADMIN_PASSCODE` ở local dev:** Nếu chưa cấu hình biến môi trường thì khóa cứng trang admin hay dùng mã dev mặc định kèm cảnh báo rõ?
4. **Cập nhật hiển thị tồn kho trên Catalog:** Trang `/products` và `/products/[slug]` hiện dùng static/server rendering cần cơ chế đọc động (`force-dynamic` hoặc đọc qua inventory repository) như thế nào để khách thấy số lượng tồn giảm ngay?
