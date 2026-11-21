# Forged Idea: ShopLite Ops (HARDENED)

- **Phán quyết:** `HARDENED` (2026-11-21)
- **Hệ thống đích:** ShopLite (Next.js 16, file JSON `storage/`, không DB/dịch vụ ngoài)

## Quyết định đã khóa (Locks)
1. **Trừ kho lúc đặt (`pending`):** Kiểm tra all-or-nothing và trừ ngay trong `placeOrder()` qua async mutex dùng chung + file tạm UUID (`storage/inventory.json` + `storage/orders.json`); rollback kho nếu lưu đơn lỗi.
2. **Chống ảo giác hết hàng khi duyệt:** `/admin/orders` hiện rõ `"Đã giữ X cho đơn này · Còn cho đơn mới: Y"` cạnh từng món; catalog (`/products`, `/products/[slug]`) đọc động tồn kho từ `inventoryRepository`.
3. **Hủy đơn & hoàn kho phân tách:**
   - Khách: chỉ hủy khi `pending` → tự động hoàn kho idempotent.
   - Nhân viên: hủy `pending`/`confirmed` → tự động hoàn kho idempotent; hủy `shipping` (giao thất bại) → **không** tự hoàn kho (`inventoryRestocked = false`), bắt buộc nhập lý do.
   - Không cho hủy `delivered`.
4. **Đóng ngõ cụt hàng hoàn (từ Forge):** Bổ sung vào MVP nút **"Xác nhận đã nhận hàng hoàn (+kho)"** cho đơn hủy từ `shipping` có `inventoryRestocked = false` (chạy idempotent đúng 1 lần, ghi mốc mới vào `statusHistory`, chuyển `inventoryRestocked = true`).
5. **Bảo mật admin Fail-Closed:** Thiếu `ADMIN_PASSCODE` → trả `503` (cấm fallback). Cookie `HttpOnly; SameSite=Lax; Path=/; Max-Age=28800` (+ `Secure` ở production) ký `HMAC-SHA256`, so sánh `timingSafeEqual`; xác thực ở `src/proxy.ts` và bắt buộc verify lại ở mọi route `/api/admin/*`.
6. **Timeline khách & tương thích ngược:** `/orders/[id]` hiển thị tiến trình 4 bước + nút "Làm mới trạng thái" thủ công; `statusHistory` optional để đơn cũ không crash; giữ nguyên `/orders` công khai và `PATCH /api/orders/:id` để pass `e2e/shopping-flow.spec.ts`.

## Phương án đã loại bỏ & Lý do (Rejected)
- **Trừ kho lúc `confirmed`:** Bị loại vì không chặn được overselling khi 2 khách đặt cùng lúc món `stock = 1`.
- **Tự động hoàn kho khi hủy `shipping`:** Bị loại vì tạo tồn kho ảo trước khi hàng hoàn thực tế về kệ.
- **Đẩy xác nhận hoàn kho tay sang COULD:** Bị loại trong Forge vì tạo ngõ cụt kẹt hàng hoàn vĩnh viễn.
- **Polling 30s trên `/orders/[id]`:** Bị loại vì gây tranh chấp I/O file JSON và flaky E2E.
- **Tra cứu SĐT + rate-limit RAM / CAPTCHA / OTP:** Bị loại khỏi MVP vì rate-limit RAM mất khi restart, mâu thuẫn với `/orders` đang công khai, và kéo theo độ phức tạp không cần thiết.
- **Passcode dev mặc định:** Bị loại vì rủi ro quên env lộ quyền quản trị.

## Điểm yếu còn tồn tại được chấp nhận có kiểm soát (Known Limits)
- **Single-node mutex:** Chỉ bảo vệ đồng thời trên 1 tiến trình Node.js (đủ cho ShopLite, cần DB transaction nếu scale multi-node).
- **Đơn COD ảo khóa kho tạm thời:** Xử lý vận hành bằng hủy nhanh trên hàng chờ `pending` (chấp nhận không dùng CAPTCHA/OTP trong MVP).
- **Mâu thuẫn riêng tư `/orders` công khai:** Để riêng sang initiative bảo mật sau MVP để không phá hợp đồng E2E hiện có.
