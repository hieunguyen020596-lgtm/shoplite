# Brainstorm Intent: ShopLite Ops — Vận hành đơn hàng & Tiến trình đơn

- **Ngày:** 2026-11-21
- **Chế độ:** Creative Partner (`bmad-brainstorming` v6.12.4)
- **Nguồn:** `.memlog.md` (**68 ý tưởng** qua 6 nhóm: *Role Playing*, *How Might We*, *Reverse Brainstorming*, *SCAMPER Method*, *Assumption Reversal*, và *3 Câu hỏi trọng tâm từ người dùng*)
- **Mục tiêu:** Xác định phạm vi MVP khả thi trên codebase ShopLite (Next.js 16, không dịch vụ ngoài) và nhận diện rủi ro/câu hỏi mở trước khi bước sang Party Mode (4.3), Product Brief & PRD (4.4).

---

## 1. Hiện trạng đọc trực tiếp từ codebase ShopLite (Brownfield)

| Phát hiện trong code thật | Vị trí file | Tác động tới thiết kế |
| :--- | :--- | :--- |
| `ORDER_STATUSES` đã có đủ `pending`, `confirmed`, `shipping`, `delivered`, `cancelled` nhưng chưa có luồng chuyển trạng thái | `src/features/orders/types.ts` | Cần máy trạng thái thuần túy kiểm soát hợp lệ các bước chuyển. |
| `PATCH /api/orders/:id` hiện chỉ chấp nhận `{ "status": "cancelled" }` | `src/app/api/orders/[id]/route.ts` | Giữ nguyên cho khách hủy `pending`; cần API có xác thực riêng cho nhân viên. |
| `placeOrder()` kiểm tra `quantity > product.stock` từ `products.ts` tĩnh nhưng **không trừ tồn kho** | `src/features/orders/order-service.ts`, `src/data/products.ts` | Cần lớp lưu tồn kho ghi được (`storage/inventory.json`) và thống nhất nguồn đọc với catalog & màn hình duyệt đơn. |
| `createJsonFileOrderRepository` dùng chung một file `${filePath}.tmp` không có khóa tuần tự | `src/features/orders/order-repository.ts` | Ghi đồng thời có thể gây mất đơn hoặc bán vượt tồn kho → cần mutex + tên file `.tmp` theo UUID. |
| `Order` chỉ có `createdAt`, `updatedAt`, chưa có `statusHistory` và chưa có bảo vệ route admin | `src/features/orders/types.ts`, `src/app/orders/` | Thêm `statusHistory?: OrderStatusEvent[]` (tương thích ngược đơn cũ) và bảo vệ `/admin/*` + `/api/admin/*`. |

---

## 2. Phạm vi MVP hội tụ theo MoSCoW

### MUST (Tối đa 5 mục — triển khai được ngay trên stack hiện có)
1. **Máy trạng thái & lịch sử đơn hàng**: Hàm thuần quản lý vòng đời `pending → confirmed → shipping → delivered` (và `cancelled` có điều kiện) kèm `statusHistory` (trạng thái, thời gian, người thực hiện `customer`/`staff`, ghi chú/mã vận đơn), tương thích ngược 100% với đơn cũ trong `storage/orders.json`.
2. **Trang vận hành `/admin/orders` kèm tồn kho inline khi duyệt**: Danh sách đơn ưu tiên hàng chờ cần xử lý, lọc theo trạng thái (lưu trên URL query), tìm kiếm theo mã đơn/SĐT/tên khách, **hiển thị số lượng tồn kho thực tế inline kèm cảnh báo màu ngay cạnh từng món hàng** để nhân viên quyết định duyệt, nút chuyển đúng 1 bước kế tiếp hợp lệ, bắt buộc nhập lý do (kèm chip chọn nhanh) khi nhân viên hủy đơn, responsive tốt trên mobile 390px.
3. **Bảo vệ truy cập quản trị (không dịch vụ ngoài)**: Trang `/admin/login` với mật khẩu quản trị từ biến môi trường (`ADMIN_PASSCODE`) + cookie `HttpOnly` ký `HMAC-SHA256` (so sánh `timingSafeEqual`, thời hạn 1 ca 8 giờ, có nút Đăng xuất), kiểm tra tại `src/proxy.ts` và bắt buộc kiểm tra lại ở mọi API `/api/admin/*`.
4. **Tồn kho thực tế & an toàn đồng thời**: Lưu tồn kho tại `storage/inventory.json` (khởi tạo từ `products.ts`), trừ kho khi đặt và hoàn kho idempotent khi hủy; bổ sung khóa tuần tự + file tạm duy nhất theo UUID cho cả order và inventory repository; đồng bộ tồn kho hiển thị lên catalog (`ProductCard`, chi tiết sản phẩm) và màn hình duyệt đơn.
5. **Timeline tiến trình & cập nhật trạng thái cho khách**: Nâng cấp `/orders/[id]` hiển thị tiến trình 4 bước kèm mốc thời gian (và lý do nếu bị hủy), tự động làm mới nhẹ (`visibilitychange` / nút Làm mới) để khách thấy trạng thái mới ngay; giữ nguyên quy tắc khách chỉ tự hủy được khi trạng thái là `pending`.

### SHOULD (Ưu tiên ngay sau Must)
- **Hỗ trợ khách quên mã đơn**: Tự lưu danh sách mã đơn gần đây vào `localStorage["shoplite:my-orders"]`, thêm nút "Sao chép link theo dõi" trên màn hình đặt hàng thành công, và cân nhắc tra cứu bằng SĐT (che mờ thông tin nhạy cảm + rate limit + thông báo trung lập chống dò).
- **Thông báo cập nhật trạng thái không cần SMS/Email**: Chấm đỏ / badge "Cập nhật mới" trên mục "Đơn hàng" ở Header khi trạng thái đơn trên thiết bị thay đổi so với lần xem gần nhất; nút "Copy mẫu tin nhắn báo khách" cho nhân viên dán vào Zalo/SMS sau khi đổi trạng thái.
- **Hỗ trợ duyệt đơn & quản trị nhanh**: Thẻ KPI đầu trang `/admin/orders`, cảnh báo đơn chờ quá 2 giờ, hiển thị tách `Tồn thực tế / Đang chờ duyệt / Còn khả dụng`, tab xem nhanh tồn kho 16 sản phẩm, và chống xung đột `expectedStatus` (`409 Conflict`).

### COULD (Mở rộng nếu còn thời gian)
- Xác nhận hàng loạt nhiều đơn `pending` (Bulk Confirm) vào giờ cao điểm.
- Tùy chọn **Browser Notification API** khi tab `/orders/[id]` đang mở và phát hiện trạng thái thay đổi.
- Nút "Đặt lại các sản phẩm này" trên đơn đã hủy; thao tác "Nhập thêm kho (`+N`)" trong `/admin`; in phiếu nhặt hàng.

### WON'T (Ngoài phạm vi MVP)
- Phân quyền đa vai trò phức tạp (RBAC), quản lý nhiều tài khoản nhân viên.
- Gửi email/SMS/Zalo tự động qua dịch vụ bên thứ ba.
- Tích hợp API hãng vận chuyển ngoài (GHN, GHTK, Viettel Post).
- Chuyển sang cơ sở dữ liệu ngoài (PostgreSQL/MongoDB).

---

## 3. Giải pháp chốt sơ bộ cho 3 câu hỏi trọng tâm người dùng đặt ra

| Bài toán | Hướng giải quyết khả thi không cần dịch vụ ngoài |
| :--- | :--- |
| **1. Khách tra cứu đơn khi quên mã?** | (a) Tự lưu lịch sử mã đơn trên trình duyệt (`localStorage`) để mở `/orders` thấy ngay; (b) Nút copy link / in phiếu ở màn hình đặt hàng thành công; (c) Tra cứu theo SĐT + xác minh phụ kèm che thông tin (`091****678`) & rate limit; (d) Dự phòng gọi CSKH tra cứu theo SĐT trên `/admin/orders`. |
| **2. Nhân viên biết tồn kho của món để duyệt đơn?** | (a) Hiện tồn kho thực tế inline ngay cạnh từng dòng sản phẩm trong đơn (`Đặt: 2 · Còn kho: 5`) đọc từ `storage/inventory.json`; (b) Mã màu cảnh báo (xanh > 5, vàng 1–5, đỏ = 0 / thiếu hàng); (c) Hiển thị số lượng đang chờ duyệt ở các đơn `pending` khác; (d) Ngăn kéo/tab xem nhanh tồn kho toàn bộ 16 sản phẩm. |
| **3. Khách biết đơn đã đổi trạng thái?** | (a) Chấm thông báo trên mục "Đơn hàng" ở Header so sánh `updatedAt`/`status` với lần xem cuối; (b) Auto-refresh nhẹ trên `/orders/[id]` (`visibilitychange` + polling 30s) kèm highlight mốc vừa cập nhật; (c) Tùy chọn Browser Notification API miễn phí; (d) Nút "Copy mẫu tin nhắn" để nhân viên gửi nhanh qua Zalo/SMS. |

---

## 4. Rủi ro trọng yếu cần phòng thủ & Câu hỏi mở cần chốt ở 4.3 / 4.4

1. **Thời điểm trừ tồn kho:** Trừ ngay khi khách đặt (`pending` — giữ hàng) hay chỉ trừ khi nhân viên xác nhận (`confirmed`)? *(Quyết định này ảnh hưởng trực tiếp tới việc màn hình duyệt đơn hiển thị "Còn kho" trước hay sau khi trừ đơn đang duyệt!)*
2. **Phạm vi hủy của nhân viên:** Nhân viên được hủy đơn ở `pending` + `confirmed`, hay được hủy cả khi đang `shipping`?
3. **Tra cứu bằng SĐT vs. Quyền riêng tư:** Nếu thêm tra cứu khi quên mã bằng SĐT, cần yêu cầu xác minh thêm gì (4 số cuối, email hay ngày đặt) để không lộ dữ liệu khách hàng khác?
4. **Chính sách `ADMIN_PASSCODE` ở local dev & đọc động Catalog:** Cách khóa mặc định khi thiếu biến môi trường và cách đồng bộ tồn kho từ `storage/inventory.json` lên `/products` & `/products/[slug]`.
