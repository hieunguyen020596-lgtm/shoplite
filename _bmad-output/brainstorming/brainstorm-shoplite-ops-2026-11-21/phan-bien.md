# Báo cáo Phản biện Party Mode: ShopLite Ops

- **Ngày:** 2026-11-21
- **Chế độ:** `/bmad-party-mode --mode subagent` (5 subagent chạy độc lập trên Antigravity)
- **Hội đồng tham gia:** 📋 John (PM) · 🎨 Sally (UX) · 🏗️ Winston (Architect) · 💻 Amelia (Dev) · 📊 Mary (Analyst)
- **Tài liệu đầu vào:** `brainstorm-intent.md` + mã nguồn thật của ShopLite (`src/features/orders/`, `src/app/products/[slug]/page.tsx`, `src/app/api/orders/`, `e2e/shopping-flow.spec.ts`)

---

## 1. Top 8 Rủi ro trọng yếu (kèm Agent nêu ra)

| # | Rủi ro | Agent nêu ra | Bằng chứng từ code / phân tích |
| :---: | :--- | :--- | :--- |
| **1** | **Bán vượt tồn kho & mất đơn khi ghi đồng thời** | 🏗️ Winston & 💻 Amelia | `src/features/orders/order-service.ts` chỉ kiểm tra `quantity > product.stock` tĩnh không trừ kho; `order-repository.ts` dùng chung một file `${filePath}.tmp` không có khóa tuần tự → 2 khách đặt cùng lúc món `stock = 1` có thể cùng thành công `201` hoặc đè mất đơn. |
| **2** | **Tồn kho đóng băng lúc build trên trang sản phẩm** | 🏗️ Winston | `src/app/products/[slug]/page.tsx` dùng `generateStaticParams()` và đọc `src/data/products.ts` tĩnh → dù `storage/inventory.json` đã giảm tồn kho về `0`, trang sản phẩm vẫn hiển thị còn hàng nếu không chuyển sang đọc động. |
| **3** | **Tồn kho ảo khi tự động hoàn kho đơn đang `shipping`** | 📊 Mary | Hàng đã rời kho đi giao, nếu nhân viên hủy đơn `shipping` mà hệ thống tự cộng tồn kho ngay lập tức thì khách mới sẽ mua phải phần hàng chưa hoàn vật lý về kệ. |
| **4** | **Ảo giác hết hàng trên màn hình duyệt đơn** | 🎨 Sally | Khi trừ kho ngay lúc khách đặt (`pending`), nếu màn duyệt chỉ hiển thị `Đặt: 2 · Còn kho: 0`, nhân viên dễ hiểu nhầm là hết hàng và bấm hủy oan đơn hợp lệ đã được giữ chỗ. |
| **5** | **Hoàn kho kép & crash đơn hàng cũ thiếu `statusHistory`** | 💻 Amelia | Bấm hủy đúp/retry có thể cộng tồn kho 2 lần nếu thiếu cơ chế idempotent; đơn cũ trong `storage/orders.json` chưa có trường `statusHistory` sẽ làm vỡ trang `/orders/[id]` nếu không có fallback. |
| **6** | **Phình phạm vi MVP & bẫy I/O từ polling 30s / rate-limit RAM** | 📋 John & 💻 Amelia | Đưa thêm polling 30s gây tranh chấp đọc/ghi file JSON và làm E2E chập chờn (flaky); rate-limit in-memory mất sạch khi restart; nhồi quá nhiều tiện ích phụ vào MUST làm chậm nhịp ship. |
| **7** | **Lộ quyền quản trị nếu chỉ chặn ở UI hoặc fallback passcode** | 🏗️ Winston | Next.js 16 `src/proxy.ts` chỉ là lớp chắn phía UI; nếu quên verify cookie HMAC trong từng route `/api/admin/*` hoặc để fallback mật khẩu mặc định khi thiếu `ADMIN_PASSCODE`, kẻ xấu có thể gọi thẳng API duyệt/hủy đơn. |
| **8** | **Mâu thuẫn bảo mật công khai tại `/orders` & vỡ E2E cũ** | 📊 Mary & 💻 Amelia | `/orders` và `GET /api/orders` hiện công khai toàn bộ đơn hàng (kèm SĐT, địa chỉ), trong khi `e2e/shopping-flow.spec.ts` (dòng 38–39) phụ thuộc vào việc thấy `order-row` tại `/orders` ngay sau khi đặt. |

---

## 2. Các điểm bất đồng & vấn đề để mở sau MVP

1. **Quyền riêng tư tại `/orders` (📊 Mary vs. 💻 Amelia):** Mary chỉ ra mâu thuẫn bảo mật khi `/orders` công khai thông tin mọi khách hàng, nhưng khóa `/orders` ngay lúc này sẽ phá vỡ hợp đồng hiện tại và `e2e/shopping-flow.spec.ts`. *Hướng theo dõi:* Giữ nguyên `/orders` cho MVP ShopLite Ops, tách bài toán bảo vệ riêng tư đơn hàng sang một initiative/epic độc lập sau này.
2. **Độ trễ đồng bộ khi không có polling (🎨 Sally vs. 💻 Amelia):** Sally muốn khách biết trạng thái mới ngay không cần F5, nhưng Amelia cảnh báo polling 30s tranh chấp I/O JSON và làm flaky test. *Hướng theo dõi:* Dùng tải trang server động (`force-dynamic`) kèm nút "Làm mới trạng thái" thủ công trong MVP; cân nhắc cập nhật tự động sau khi chuyển sang DB thật.
3. **Lệch tồn kho vật lý vs. `inventory.json` (📊 Mary):** Khi hàng trên kệ bị hỏng/thất thoát ngoài hệ thống, chưa có màn hình kiểm kê điều chỉnh trong MVP — nhân viên tạm xử lý bằng cách hủy đơn kèm lý do `"Hết hàng thực tế"`; tính năng nhập/điều chỉnh tồn kho (`+N/-N`) đặt ở COULD.
4. **Giới hạn mở rộng của Mutex trên file JSON (🏗️ Winston):** Khóa tuần tự in-process chỉ an toàn khi chạy 1 tiến trình Node.js (phù hợp môi trường ShopLite), không dùng cho triển khai đa instance (multi-node).

---

## 3. Các quyết định đã được Chủ sản phẩm (`nab`) chốt

| # | Quyết định đã chốt | Lý do & Hệ quả thiết kế |
| :---: | :--- | :--- |
| **Q1** | **Trừ tồn kho ngay khi khách đặt hàng (`pending`)** | Chặn tuyệt đối tình trạng bán lố ngay trong `placeOrder()` bằng khóa tuần tự nguyên tử. Để tránh *"Ảo giác hết hàng"* của Sally, màn hình duyệt đơn `/admin/orders` bắt buộc hiển thị rõ trạng thái giữ chỗ (VD: `Đã giữ 2 cho đơn này · Còn cho đơn mới: 0`). |
| **Q2** | **Nhân viên được hủy ở `pending`, `confirmed` VÀ `shipping`, nhưng tách biệt quy tắc hoàn kho** | • Hủy từ `pending` / `confirmed` $\rightarrow$ **Tự động hoàn kho idempotent** (1 lần duy nhất).<br>• Hủy từ `shipping` (giao thất bại / bom hàng) $\rightarrow$ **KHÔNG tự động cộng lại kho** (ghi rõ cờ `restocked: false` trong `statusHistory` để chờ kiểm kê hàng hoàn thực tế, tránh tồn kho ảo theo cảnh báo của Mary). |
| **Q3** | **Giữ đủ 5 mục MUST (có Timeline đơn giản), cắt `polling 30s` & `tra cứu SĐT + rate-limit` khỏi MVP** | Cân bằng giữa UX của Sally (khách vẫn thấy tiến trình 4 bước rõ ràng) và độ tin cậy/gọn nhẹ của John & Amelia; giữ nguyên `/orders` công khai để không làm gãy `e2e/shopping-flow.spec.ts`. |
| **Q4** | **Khóa cứng trang/API quản trị (trả `503`) khi thiếu biến môi trường `ADMIN_PASSCODE`** | Tuyệt đối không dùng passcode fallback mặc định theo yêu cầu bảo mật của Winston; mọi `/api/admin/*` đều phải verify chữ ký HMAC-SHA256 bằng `timingSafeEqual`. |
