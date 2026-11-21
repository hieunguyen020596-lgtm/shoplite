---
title: "Product Brief: ShopLite - Vận hành và theo dõi đơn hàng"
status: draft
created: 2026-11-21
updated: 2026-11-21
---

# Product Brief: ShopLite - Vận hành và theo dõi đơn hàng

## Tóm tắt

ShopLite nhận được đơn, nhưng đơn dừng lại ngay sau đó: cửa hàng không có công cụ xử lý, còn khách không biết đơn đang ở đâu.

Sản phẩm này tạo **một nguồn dữ liệu duy nhất về đơn hàng**. Cùng một bản ghi trạng thái và lịch sử sẽ trả lời khách "đơn của tôi đang ở đâu", bảo vệ nhân viên nhờ bằng chứng "ai làm gì, lúc nào", và giúp chủ shop giữ uy tín khi có sự cố.

Đợt đầu gồm tra đơn có chống dò mã đơn, trang nhân viên tối thiểu, lịch sử trạng thái và tồn kho chính xác trên PostgreSQL. Đây là dự án nội bộ cho khóa học, nhưng được thiết kế như sản phẩm thật.

## Vấn đề

- **Đơn kẹt:** mọi đơn nằm mãi ở Chờ xác nhận vì không có công cụ để chuyển bước.
- **Tồn kho sai:** số tồn là dữ liệu tĩnh trong code, nên web vẫn báo còn hàng sau khi đã bán.
- **Khách mù thông tin:** sau khi đặt, nhất là khi đã chuyển khoản, khách không có tín hiệu nào về đơn.
- **Dữ liệu khách bị lộ:** danh sách đơn và chi tiết đơn không kiểm tra quyền; ai có mã đơn cũng hủy được đơn đang chờ.
- **Không có dấu vết:** khi có sự cố, không ai biết ai đã làm gì, nên nhân viên dễ bị đổ lỗi.

## Giải pháp

**Khách hàng** nhập mã đơn và số điện thoại, ở dạng `0...` hoặc `+84...`, để xem trạng thái, các mốc thời gian và sản phẩm. Thông tin cá nhân được che và trang này chỉ để xem. Ngay sau khi đặt, khách vẫn thấy trang xác nhận và thông tin chuyển khoản, kể cả khi tải lại trang.

**Nhân viên** đăng nhập bằng tài khoản riêng, làm việc từ hàng đợi đơn cần xử lý (đơn cũ nhất lên trước, dùng được trên điện thoại) và chuyển đơn theo đúng thứ tự: Chờ xác nhận → Đã xác nhận → Đang giao → Đã giao. Họ có thể hủy đơn chưa rời kho kèm lý do. Bước "Đã giao" cần xác nhận hai lần để tránh bấm nhầm.

**Quản lý** có thể lùi một đơn bị đánh dấu "Đã giao" nhầm về "Đang giao". Mỗi lần lùi là một dòng lịch sử mới, không xóa dấu vết cũ.

**Tồn kho** được trừ ngay khi khách đặt, hoàn khi hủy và không bao giờ âm. Sản phẩm cuối cùng trong kho thuộc về người đặt trước. Người đặt sau được báo hết hàng mà không mất thông tin đã điền. Việc đặt đơn có giới hạn để đơn ảo không rút cạn kho. Đơn chuyển khoản chờ quá 24 giờ được đưa lên đầu hàng đợi để nhân viên liên hệ, không tự động hủy.

Bảng chuyển trạng thái và các ca bắt buộc có test nằm trong `addendum.md`.

## Điểm khác biệt

Mọi thay đổi trạng thái và tồn kho đi qua **một đường duy nhất có ghi vết**, và sửa sai là thêm thao tác mới chứ không xóa lịch sử.

## Phục vụ ai

- **Khách hàng:** sợ mất tiền khi đơn im lặng. Thành công là tự biết đơn đang ở đâu mà không phải hỏi shop.
- **Nhân viên vận hành:** sợ bị đổ lỗi vì việc mình không làm. Thành công là xử lý đơn đúng quy trình và có bằng chứng. `[ASSUMPTION: 2 nhân viên, hiện chưa có công cụ nên đơn không được cập nhật]`
- **Quản lý kiêm chủ shop:** sợ mất uy tín. Thành công là biết chuyện gì đã xảy ra và sửa được sai sót. `[ASSUMPTION: 1 người giữ cả hai vai, đồng thời đối soát sao kê và hoàn tiền]`

## Tiêu chí thành công

| Chỉ số | Mục tiêu |
|---|---|
| Đơn bán quá tồn | 0 |
| Lần đổi trạng thái có lịch sử đầy đủ | 100% |
| Đơn nằm ở Chờ xác nhận quá 24 giờ | Dưới 5% `[ASSUMPTION]` |
| Truy cập dữ liệu đơn không qua kiểm tra quyền | 0 route |
| **Không được xấu đi:** tỷ lệ đơn bị hủy do hết hàng | Theo dõi sau khi có số nền `[ASSUMPTION]` |

## Phạm vi

**Trong đợt đầu**

- Tra đơn có chống dò mã đơn (chặn thử mã hàng loạt) và trang xác nhận sau khi đặt.
- Trang nhân viên, lịch sử trạng thái và thao tác lùi đơn của quản lý.
- Tồn kho trên PostgreSQL, hiển thị theo số thực tế, có chống đơn ảo.
- Đơn chuyển khoản bị hủy được đánh dấu cần hoàn tiền. `[ASSUMPTION: chủ shop hoàn tay trong 3 ngày làm việc, không thu phí]`

**Ngoài phạm vi**

- Khách tự hủy đơn. Khách cần hủy sẽ liên hệ shop qua `[SĐT_SHOP]`.
- Giao thất bại, trả hàng và hủy khi đơn đang giao.
- Cổng thanh toán, trạng thái "đã thanh toán", hoàn tiền tự động.
- OTP, thông báo chủ động cho khách, dự kiến ngày giao.
- Cảnh báo đơn quá hạn và công cụ liên hệ khách.
- Chuyển 11 đơn thử hiện có sang hệ thống mới.

## Rủi ro

- Đợt đầu lớn hơn phạm vi ban đầu và chưa có ước lượng.
- Khách có thể thấy "Đã giao" sai cho đến khi quản lý sửa.
- Hoàn tiền vẫn phụ thuộc quy trình thủ công.
- Đơn ảo hoặc đơn chuyển khoản bỏ dở có thể giữ kho nếu ngưỡng giới hạn đặt sai hoặc nhân viên không xử lý hàng đợi.
- Làm dở đợt đầu có thể khiến khách mất đường xem đơn, nên chỉ phát hành khi đủ cả chuỗi.

## Tầm nhìn

Các tính năng sau đợt đầu, từ cảnh báo đơn kẹt đến đối soát thanh toán, đều dựa trên cùng một bản ghi đơn hàng.
