---
title: "Product Brief: ShopLite Ops — Vận hành đơn hàng & Tồn kho thực tế"
status: draft
created: 2026-11-21
updated: 2026-11-21
stakes: internal
form_factor: web-responsive
---

# Product Brief: ShopLite Ops

## Executive Summary

ShopLite hiện mới hoàn thiện nửa trải nghiệm mua hàng của khách: xem danh mục, thêm giỏ, thanh toán và xem danh sách đơn. Tuy nhiên phía vận hành hoàn toàn trống — mọi đơn hàng đặt xong nằm mãi ở trạng thái **"Chờ xác nhận"**, nhân viên không có giao diện để duyệt hay cập nhật tiến độ giao hàng, còn tồn kho trên web là dữ liệu tĩnh không bao giờ giảm dù đã bán hết hàng.

**ShopLite Ops** bổ sung mảnh ghép vận hành cốt lõi ngay trên nền tảng Next.js 16 hiện có mà **không thêm cơ sở dữ liệu hay dịch vụ bên ngoài**: một trang quản trị đơn hàng gọn nhẹ (`/admin/orders`) được bảo vệ bằng mật khẩu quản trị, máy trạng thái đơn hàng chặt chẽ kèm lịch sử biến động, cơ chế tồn kho thực tế chống bán vượt số lượng khi đặt đồng thời, và thanh tiến trình 4 bước giúp khách hàng theo dõi đơn trên `/orders/[id]`.

## The Problem

Vận hành ShopLite hiện đối mặt 4 điểm nghẽn trực tiếp làm mất doanh thu và trải nghiệm:
1. **Đơn hàng "đóng băng":** `ORDER_STATUSES` đã có đủ 5 trạng thái (`pending`, `confirmed`, `shipping`, `delivered`, `cancelled`) nhưng hệ thống chỉ hỗ trợ khách tự hủy đơn `pending`; nhân viên không có cách nào xác nhận, giao hàng hay hoàn tất đơn.
2. **Bán vượt tồn kho (Overselling) và mất đơn:** `placeOrder()` chỉ kiểm tra số tồn tĩnh trong `src/data/products.ts` mà không trừ kho. Hai khách cùng đặt chiếc cuối cùng đều thành công, thậm chí ghi đè làm mất đơn do cơ chế lưu file JSON dùng chung một file `.tmp` chưa có khóa tuần tự.
3. **Khách hàng mù thông tin sau khi đặt:** Khách mở `/orders/[id]` chỉ thấy badge `Chờ xác nhận` trơ trọi, không biết đơn đã được duyệt, đã bàn giao vận chuyển hay vì sao bị hủy.
4. **Rủi ro tồn kho ảo và ngõ cụt hàng hoàn:** Khi đơn đang giao bị khách bom hàng, nếu tự cộng kho ngay sẽ tạo tồn kho ảo; ngược lại nếu không có bước xác nhận hàng hoàn về kệ thì hàng bị kẹt vĩnh viễn không thể bán lại.

## The Solution

Xây dựng **ShopLite Ops** theo đúng 5 năng lực MVP đã qua phản biện Party Mode và đóng dấu `HARDENED` tại Forge Idea:
- **Máy trạng thái & lịch sử đơn hàng:** Kiểm soát chặt chẽ vòng đời `pending → confirmed → shipping → delivered` và `cancelled`, phân tách rõ quyền khách (chỉ hủy `pending`) và quyền nhân viên (hủy `pending`/`confirmed` tự hoàn kho idempotent; hủy `shipping` bắt buộc lý do, không tự hoàn kho, kèm thao tác **"Xác nhận đã nhận hàng hoàn (+kho)"** đúng 1 lần khi hàng về kệ). Mọi thay đổi đều lưu vào `statusHistory` và tương thích ngược 100% với đơn cũ.
- **Cổng vận hành `/admin/orders`:** Responsive trên cả desktop và điện thoại kho 390px, lọc trạng thái trên URL, tìm kiếm theo mã/SĐT/tên khách, hiển thị tồn kho rõ ràng (`Đã giữ X cho đơn này · Còn cho đơn mới: Y`) chống ảo giác hết hàng, nút chuyển đúng 1 bước hợp lệ.
- **Bảo vệ quản trị Fail-Closed:** Đăng nhập tại `/admin/login` bằng `ADMIN_PASSCODE` từ biến môi trường (trả `503` nếu chưa cấu hình), phát cookie `HttpOnly; SameSite=Lax` ký `HMAC-SHA256` có hạn 8 giờ kèm nút Đăng xuất, kiểm tra hai lớp tại `src/proxy.ts` và mọi `/api/admin/*`.
- **Tồn kho thực tế an toàn đồng thời:** Lưu trữ tại `storage/inventory.json`, trừ kho ngay khi khách đặt (`pending`) trong khóa tuần tự nguyên tử (all-or-nothing + rollback nếu lưu đơn lỗi) với file tạm UUID; đồng bộ tồn kho động lên toàn bộ mặt tiền bán hàng (trang chủ `/`, `/products`, `/products/[slug]`).
- **Timeline tiến trình cho khách:** Hiển thị 4 bước kèm mốc thời gian, lý do hủy (nếu có) và nút làm mới trạng thái thủ công tại `/orders/[id]`.

## What Makes This Different

Lợi thế của hướng tiếp cận này không nằm ở công nghệ cầu kỳ mà ở **tốc độ triển khai và kỷ luật kiến trúc brownfield**: tái sử dụng 100% stack hiện tại (Next.js 16 App Router, TypeScript strict, Zod 4, JSON file repository), không kéo theo chi phí vận hành DB/dịch vụ ngoài, nhưng vẫn giải quyết triệt để các bài toán sản xuất thật (concurrency overselling, idempotent restock, fail-closed auth, backward compatibility đơn cũ và không làm gãy bộ test E2E hiện có).

## Who This Serves

- **Nhân viên vận hành / kho (Primary):** Cần xem nhanh hàng đợi đơn mới, biết chắc đơn đã giữ chỗ và tồn kho còn lại để duyệt dưới 30 giây trên máy tính hoặc điện thoại 390px, cập nhật giao hàng, hủy đơn có lý do và xác nhận nhập lại hàng hoàn.
- **Khách hàng ShopLite (Secondary):** Cần theo dõi rõ đơn đang ở chặng nào, mốc thời gian từng bước và lý do nếu đơn bị hủy, đồng thời giữ nguyên quyền tự hủy khi đơn còn `pending`.
- **Chủ cửa hàng (Stakeholder):** Cần đảm bảo 0 đơn bán vượt tồn kho, minh bạch lịch sử thao tác trên mọi đơn hàng và không phải can thiệp sửa file JSON bằng tay.

## Success Criteria

- **0 đơn bán vượt tồn kho** khi nhiều khách đặt đồng thời món chỉ còn 1 chiếc (kiểm chứng bằng test song song `Promise.allSettled`).
- **Thời gian duyệt 1 đơn hàng < 30 giây** trên cả desktop lẫn mobile 390px.
- **100% đơn hàng lịch sử** (chưa có `statusHistory`) vẫn mở bình thường và toàn bộ `npm run check` + `e2e/shopping-flow.spec.ts` giữ nguyên pass.
- **100% endpoint `/api/admin/*`** từ chối truy cập không có cookie HMAC hợp lệ (`401`) và trả `503` khi thiếu `ADMIN_PASSCODE`.
- **Chỉ số đối trọng (Counter-metric):** Không làm tăng tỉ lệ nhân viên hủy oan đơn hợp lệ (nhờ hiển thị rõ *"Đã giữ X cho đơn này"*).

## Scope

### Trong phạm vi (MVP)
1. Máy trạng thái đơn hàng + `statusHistory` + tương thích ngược đơn cũ.
2. Trang `/admin/orders` (lọc URL, tìm kiếm, tồn kho giữ chỗ inline, chuyển 1 bước, hủy có lý do, xác nhận nhận hàng hoàn `+kho` cho đơn hủy từ `shipping`).
3. Bảo mật `/admin/*` và `/api/admin/*` bằng `ADMIN_PASSCODE` + cookie HMAC fail-closed (`503` / `401`), thời hạn 8 giờ + Đăng xuất.
4. Tồn kho thực tế tại `storage/inventory.json` + khóa tuần tự + file tạm UUID + đọc động trên catalog.
5. Timeline 4 bước đơn giản + nút "Làm mới trạng thái" tại `/orders/[id]`.

### Ngoài phạm vi (Explicitly Out of Scope)
- Phân quyền đa vai trò (RBAC), quản lý nhiều tài khoản nhân viên.
- Polling tự động 30 giây trên `/orders/[id]` (tránh tranh chấp I/O JSON và flaky test).
- Tra cứu đơn theo SĐT + rate-limit RAM và việc khóa danh sách công khai `/orders` (tách sang initiative riêng tư hóa đơn hàng sau MVP để không vỡ E2E hiện tại).
- Gửi SMS / Email / Zalo tự động, tích hợp hãng vận chuyển ngoài (GHN, GHTK), CAPTCHA/OTP chống đơn COD ảo, hay chuyển sang cơ sở dữ liệu ngoài.

## Vision

Khi vận hành cốt lõi trên ShopLite Ops ổn định, các giai đoạn kế tiếp có thể nâng cấp mượt mà mà không đập bỏ kiến trúc nhờ tách biệt interface `OrderRepository` & `InventoryRepository`: thay lớp lưu JSON bằng PostgreSQL/Prisma để hỗ trợ đa instance, bổ sung riêng tư hóa tra cứu đơn hàng cho khách, bảng điều khiển KPI doanh thu/nhập kho toàn diện và tích hợp webhook đối tác giao hàng.
