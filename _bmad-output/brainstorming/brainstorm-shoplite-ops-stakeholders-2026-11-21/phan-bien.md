---
type: critique
topic: Phản biện ý tưởng vận hành và theo dõi đơn hàng ShopLite
date: 2026-11-21
source: _bmad-output/party-mode/memories/installed/.memlog.md
input: brainstorm-intent.md
intended_for: bmad-product-brief, bmad-prd
---

# Phản biện: Vận hành và theo dõi đơn hàng ShopLite

> Tổng hợp bốn vòng party mode với John (PM), Sally (UX), Winston (Architect), Amelia (Dev) và Mary (Analyst). Quyết định của người dùng và đề xuất của phòng được ghi tách riêng. `AGENTS.md` không còn ở HEAD, nên phòng lấy code hiện tại làm chuẩn.

## 1. Phản biện theo vai

### John (PM): giá trị và độ lớn của MVP

- Bản intent không có chỉ số thành công nào.
- "5 Must" thực chất là dựng mới đăng nhập, máy trạng thái, nhật ký và sổ kho.
- Chưa có bằng chứng về nhân viên thật đang chờ công cụ này.
- Nếu đợt 1 không có đổi trạng thái thì đơn vẫn kẹt ở Chờ xác nhận, tức vấn đề gốc chưa được giải.

### Sally (UX): thao tác và chỗ dễ nhầm

- Một nhãn trạng thái đơn lẻ không xoa được nỗi sợ mất tiền. Khách cần mốc thời gian và biết bước kế tiếp.
- "Đã giao" bấm nhầm sẽ báo sai cho khách thật.
- Đóng `/orders/:id` làm vỡ màn cảm ơn và thông tin chuyển khoản ngay sau khi đặt.
- Khi hết hàng lúc đặt, phải giữ nguyên form đã điền và cho bỏ dòng hết hàng để đặt tiếp.

### Winston (Architect): ràng buộc của codebase

- `save` đọc cả file, sửa rồi ghi đè, không có khóa hay phiên bản.
- `stock` là số tĩnh trong `src/data/products.ts`; không có code nào ghi lại số này.
- Thêm bảng tồn kho mà không đổi chỗ đọc sẽ tạo hai nguồn sự thật.
- `OrderRepository` cần thao tác nguyên tử thay cho `findAll/findById/save`.
- Bộ đếm chống dò phải bền qua khởi động lại và khóa theo cặp IP và mã đơn.

### Amelia (Dev): phần khó test và dễ sinh bug

- `placeOrder` kiểm tồn rồi mới lưu, nên chuyển sang Postgres mà giữ cách này vẫn bán đôi món cuối.
- Test đơn luồng trên repository in-memory sẽ xanh dù bug tranh chấp vẫn còn.
- Đóng route làm đỏ `src/app/api/orders/route.test.ts`, `e2e/shopping-flow.spec.ts` và `checkout-form.test.tsx`.
- Nút hủy hiện có sẽ thành nút chết nếu không gỡ cùng lúc với `PATCH`.

### Mary (Analyst): giả định chưa kiểm chứng

- Ngưỡng 5 lần sai trong 15 phút, che số và dời OTP là đề xuất của coach, không phải nhu cầu đã xác nhận.
- Chưa có bằng chứng về sự cố mất tiền thật.
- Hệ thống không biết khách đã trả tiền chưa.
- Đóng đường hủy mà chưa có nhân viên sẽ khiến kho chỉ giảm và các món hết hàng giả.

## 2. Quyết định của người dùng

| Chủ đề | Quyết định |
|---|---|
| Dữ liệu | Postgres thật, Drizzle với `node-postgres` |
| Cấu hình | Giá trị thật ở `.env`, mẫu ở `.env.example` |
| Phạm vi đợt 1 | Đủ 5 Must, gồm trang nhân viên tối thiểu với tài khoản cấu hình qua env |
| Môi trường | Docker Compose ở local, dùng cho cả test race |
| Dữ liệu cũ | Bỏ 11 đơn trong `storage/orders.json` |
| Tồn kho | Giữ danh mục trong code, thêm bảng số lượng tồn và đọc động |
| Trang xác nhận | Cookie `HttpOnly` có ký; mất cookie thì tra bằng mã đơn và số điện thoại |
| E2E | DB riêng, seed lại mỗi lần chạy |
| `.env.local` | Giữ trong git làm mẫu của khóa học, giá trị đổi thành `replace_me` |

## 3. Luật do phòng đề xuất, người dùng ủy quyền chốt theo đa số

| Câu hỏi | Kết luận | Ý kiến không được chọn |
|---|---|---|
| Hủy từ trạng thái nào? | Chờ xác nhận hoặc Đã xác nhận, bắt buộc có lý do, hoàn kho một lần | Winston muốn cho hủy cả khi Đang giao |
| Hoàn tiền thế nào? | Không có trạng thái "đã thanh toán"; đơn chuyển khoản bị hủy bật cờ "cần hoàn tiền thủ công" | Winston muốn thêm `payment_status`; Sally muốn hiện cam kết hoàn tiền cho khách |
| Sửa "Đã giao" bấm nhầm? | Xác nhận hai bước; chỉ quản lý lùi về Đang giao, có lý do, không đụng kho | Sally muốn trễ 10 phút mới hiện cho khách (giữ ở Could) |

## 4. Rủi ro còn lại

1. Đợt 1 lớn và chưa có ước lượng.
2. Drizzle chưa được chạy thử trên Next 16.4.2.
3. Khách vẫn có thể thấy "Đã giao" sai cho đến khi quản lý sửa.
4. Khách không còn tự hủy được đơn, nên phải liên hệ shop.
5. Hoàn tiền phụ thuộc quy trình thủ công ngoài hệ thống.
6. Bài 4.4 của khóa học ghi "không thêm database", khác với quyết định dùng Postgres.

## 5. Top 5 rủi ro kèm agent nêu ra

| # | Rủi ro | Agent nêu ra | Hướng xử lý |
|---|---|---|---|
| 1 | Bán quá tồn vì kiểm tồn rồi mới lưu, test đơn luồng vẫn xanh | Amelia, Winston | Trừ kho nguyên tử trong transaction, test race trên Postgres thật |
| 2 | Đóng đường hủy khiến kho chỉ giảm và đơn vẫn kẹt | Mary, John | Đưa trang nhân viên có hủy và đổi trạng thái vào đợt 1 |
| 3 | Đóng `/orders/:id` làm mất màn cảm ơn và thông tin chuyển khoản | Sally | Trang xác nhận dùng cookie có ký, mất cookie thì tra đơn |
| 4 | `stock` có hai nguồn sự thật, khách thấy còn hàng rồi bị từ chối | Winston | Bỏ `stock` tĩnh, đọc tồn kho động từ Postgres |
| 5 | Bấm nhầm "Đã giao" báo sai cho khách thật | Sally | Xác nhận hai lần, quản lý lùi được và có ghi lịch sử |

Pre-mortem bổ sung 7 nguyên nhân thất bại do coach đề xuất, xem mục 8 của `brainstorm-intent.md`.

## 6. Điểm bất đồng chưa giải quyết

Các điểm dưới đây đã có hướng làm cho MVP, nhưng người phản đối chưa đổi ý.

1. **Có nhân viên thật đang chờ công cụ không?** John cho rằng chưa có bằng chứng. Phạm vi đợt 1 vẫn giữ trang nhân viên, dựa trên giả định 2 nhân viên và 1 quản lý.
2. **Có lưu trạng thái thanh toán không?** Winston muốn có `payment_status`; Mary, John và Amelia muốn tránh vì chưa có quy trình đối soát.
3. **Có hứa hoàn tiền trên trang khách không?** Sally muốn hiện số tiền và thời hạn; Mary phản đối khi chưa có người xác nhận khách đã trả tiền.
4. **Có cho hủy khi Đang giao không?** Winston muốn cho hủy kèm lý do; Sally, John và Amelia muốn để cho luồng giao thất bại.
5. **Có trễ hiển thị "Đã giao" không?** Sally muốn trễ 10 phút để không báo nhầm; John giữ ở Could, Amelia chỉ cần xác nhận hai lần.
