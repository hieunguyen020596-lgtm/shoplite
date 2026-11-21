---
type: brainstorm-intent
topic: Công cụ nhân viên vận hành đơn hàng ShopLite và theo dõi đơn cho khách
date: 2026-11-21
source: .memlog.md
intended_for: bmad-product-brief, bmad-prd
---

# Intent: Vận hành và theo dõi đơn hàng ShopLite

> **Nguồn gốc quyết định:** Người dùng chọn 5 Must. Các gợi ý Spark, luận điểm cốt lõi, nguyên tắc thiết kế, việc gộp mục 11 vào Must 10 và phần xếp Should/Could/Won't do coach đưa ra theo yêu cầu của người dùng. Cách xử lý R1 và R2 do coach đề xuất sau khi đối chiếu code, người dùng duyệt đưa vào tài liệu.
>
> Số mục (1, 2, 6...) là mã ứng viên trong phiên brainstorm, giữ lại để truy vết.

## 1. Vấn đề

- Đơn nằm mãi ở Chờ xác nhận vì cửa hàng không có chỗ xác nhận, giao hoặc đánh dấu đã giao.
- Tồn kho trên web không giảm dù đã bán.
- Khách không thấy đơn đang đi tới đâu.

## 2. Người dùng và nỗi sợ

| Vai | Nỗi sợ | Cần |
|---|---|---|
| Khách hàng | Mất tiền khi đơn không có tín hiệu gì | Biết shop đã nhận đơn chưa và đơn đang ở đâu |
| Nhân viên vận hành | Bị đổ lỗi vì việc mình không gây ra | Làm đúng quy trình, có bằng chứng ai làm gì, lúc nào |
| Quản lý/chủ shop | Mất uy tín | Biết chuyện gì đã xảy ra, giữ uy tín cả khi đơn gặp sự cố |

## 3. Luận điểm cốt lõi

**Công cụ bán một sự thật chung về đơn hàng.** Cùng một bản ghi trạng thái và lịch sử trả lời khách (đơn ở đâu), bảo vệ nhân viên (ai làm gì, lúc nào) và giúp chủ shop giữ uy tín (biết chuyện gì đã xảy ra).

Điểm đòn bẩy là nhân viên: nhân viên cập nhật đúng thì khách mới thấy đúng trạng thái và shop mới giữ được uy tín.

## 4. Nguyên tắc thiết kế

1. Mọi thay đổi trạng thái và tồn kho đi qua **một đường duy nhất có ghi vết**.
2. Sửa sai là **thêm một thao tác mới có ghi lịch sử**, không xóa dấu vết cũ.

## 5. Phạm vi MVP

### Must (5)

| # | Mục | Tiêu chí đã chốt |
|---|---|---|
| 1 | Tra đơn an toàn | Bắt buộc có cả mã đơn và số điện thoại; chỉ trả dữ liệu tối thiểu; đóng mọi đường xem hoặc sửa đơn không kiểm tra quyền |
| 2 | Thấy trạng thái đơn | Khách tra đơn hợp lệ thì thấy trạng thái hiện tại |
| 6 | Nhân viên đổi trạng thái | Phải đăng nhập; chỉ đổi theo đúng thứ tự |
| 7 | Lịch sử trạng thái | Ghi ai đổi, lúc nào |
| 10 | Tồn kho đúng | Trừ khi mua, hoàn khi hủy, không bán quá tồn (đã gộp mục 11) |

### Should

| # | Mục | Lý do |
|---|---|---|
| 9 | Quản lý sửa/Undo muộn, kèm hoàn kho và báo khách | Luồng một chiều cần đường sửa sai |
| 13 | Cảnh báo đơn đứng yên quá hạn, kèm mã đơn, đã kẹt bao lâu, ai thao tác cuối | Xử lý đúng tình trạng đơn nằm mãi một chỗ |
| 3 | Khách biết khi nào đơn được giao | Nhu cầu trực tiếp của khách |

### Could

| # | Mục | Lý do |
|---|---|---|
| 8 | Đã giao chờ 10 giây mới hiện cho khách, trong lúc đó nhân viên Undo được | Giảm hậu quả khi bấm nhầm |
| 12 | Công cụ liên hệ, xin lỗi khách | Giữ uy tín khi có sự cố |

### Won't (lần này)

| # | Mục | Lý do |
|---|---|---|
| 4 | Khách tự hủy đơn | Dễ đụng lúc nhân viên đang đóng gói; MVP do nhân viên thực hiện hủy |

> Memlog chỉ ghi lý do xếp hạng cho mục 9 và 4. Lý do của 13, 3, 8, 12 là nhu cầu gốc của mục đó.

## 6. Luật nghiệp vụ đã chốt

- **Tra đơn:** phải có cả mã đơn và số điện thoại. Chỉ có mã đơn thì không xem được gì, kể cả trạng thái.
- **Dữ liệu khi tra đơn:** chỉ hiện trạng thái, mốc thời gian, tên sản phẩm, tên và số điện thoại đã che. Không hiện địa chỉ đầy đủ, email hay ghi chú.
- **Trang tra đơn:** chỉ để xem, không có thao tác hủy hoặc sửa.
- **Chống dò:** giới hạn khoảng 5 lần sai trong 15 phút, chỉ báo lỗi chung "Thông tin không đúng".
- **Truyền số điện thoại:** gửi qua `POST`, không đưa lên URL.
- **Thứ tự trạng thái:** Chờ xác nhận → Đã xác nhận → Đang giao → Đã giao.
- **Quyền đổi trạng thái:** chỉ nhân viên đã đăng nhập.
- **Trừ kho:** ngay khi khách bấm mua.
- **Hoàn kho:** khi hủy đơn.
- **Món cuối:** thuộc về người mua trước; người mua sau thấy thông báo hết hàng.
- **Tồn kho:** không bao giờ âm.
- **Hủy đơn trong MVP:** do nhân viên thực hiện.

## 7. Rủi ro và câu hỏi mở

**Rủi ro**

- **R1. Route đơn hàng chưa kiểm tra quyền (đã xác nhận trong code, phải xử lý trong Must 1):**
  - `GET /api/orders` trả toàn bộ đơn kèm tên, số điện thoại, email, địa chỉ; trang `/orders` liệt kê mọi đơn.
  - `GET /api/orders/:id` và `/orders/:id` chỉ cần mã đơn là xem được đầy đủ.
  - `PATCH /api/orders/:id` cho ai có mã đơn cũng hủy được đơn đang chờ xác nhận.
- **R2. Lộ thông tin qua nhãn gói hàng:** nhãn thường in cả mã đơn và số điện thoại, nên người nhặt được vẫn tra được đơn. Hướng xử lý là các luật tra đơn ở mục 6, kèm che số trên nhãn nếu đơn vị vận chuyển hỗ trợ. OTP để sau MVP. Rủi ro còn lại được chấp nhận: người đó vẫn biết trạng thái đơn.
- **R3. MVP chưa có đường sửa sai:** Must chỉ cho đổi trạng thái một chiều, còn sửa/Undo nằm ở Should (9). Nếu cắt mục 9, thao tác bấm nhầm không có cách sửa.

**Câu hỏi cho PRD**

1. Hủy đơn nằm ở đâu trong luồng trạng thái, được hủy từ những trạng thái nào và ai được hủy?
2. Undo muộn khi nào mới phải hoàn kho? Kho đã trừ lúc mua, nên lùi trạng thái mà đơn vẫn tiếp tục thì hoàn kho sẽ làm sai số tồn.
3. "Muộn" được tính thế nào nếu mục 8 (Undo 10 giây) không được làm?
4. Ngưỡng "quá hạn" của từng trạng thái là bao lâu (mục 13)?
5. Thông tin "khi nào giao" lấy từ đâu (mục 3)?
6. Nhân viên nào được xem thông tin khách hàng? Bẫy "ai cũng lấy được thông tin khách" mới được xử lý ở phía tra đơn.
7. Khách đã trả tiền mà đơn bị hủy thì xử lý tiền thế nào? Phiên brainstorm chưa bàn.
8. Khi đóng `/orders/:id`, khách xem xác nhận đặt hàng và thông tin chuyển khoản ở đâu? Luồng hiện tại đang dựa vào trang này.
