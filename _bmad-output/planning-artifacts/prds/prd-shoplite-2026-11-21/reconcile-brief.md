# Đối chiếu PRD với brief.md

Đầu vào: `briefs/brief-shoplite-2026-11-21/brief.md`. Đối chiếu với `prd.md` và `addendum.md`. Không tính các quyết định đã chốt trong `.memlog.md` và phần kỹ thuật đã chuyển sang addendum.

Nhận định chung: phần lớn nội dung brief (giải pháp, phạm vi, tiêu chí thành công, ba nỗi sợ của người dùng) đã có trong PRD. Các khoảng trống dưới đây là phần định tính và phần cảnh báo mà cấu trúc FR làm mất.

## Khoảng trống quan trọng

### 1. Mất toàn bộ mục "Rủi ro" của brief (mức: cao)
Brief có mục **Rủi ro** gồm 5 ý. PRD không có mục tương ứng, và không ý nào được ghi ở chỗ khác:
- "Đợt đầu lớn hơn phạm vi ban đầu và chưa có ước lượng." PRD không nhắc tới. §6.1 chỉ liệt kê FR-1 đến FR-21 như thể đã cam kết xong.
- "Khách có thể thấy 'Đã giao' sai cho đến khi quản lý sửa." PRD chỉ ghi việc trễ 10 giây hoặc 10 phút là Could (§6.2), không giữ lại rủi ro đó. UJ-3 mô tả đúng tình huống này nhưng không gọi nó là rủi ro chấp nhận.
- "Hoàn tiền vẫn phụ thuộc quy trình thủ công." Chỉ còn thấp thoáng trong FR-21 và Open Question 2, không được nêu thành rủi ro.
- "Đơn ảo hoặc đơn chuyển khoản bỏ dở có thể giữ kho nếu ngưỡng sai hoặc nhân viên không xử lý hàng đợi." PRD chỉ giữ phần ngưỡng (SM-C2, Open Question 4). Phần "nhân viên không xử lý hàng đợi thì kho bị giữ", vì không có tự động hủy, không được nêu.
- "Làm dở đợt đầu có thể khiến khách mất đường xem đơn." NFR Phát hành (§4.9) giữ quy tắc nhưng mất lý do. Người đọc sau sẽ không biết vì sao không được phát hành từng phần.

### 2. Luận đề "một nguồn dữ liệu duy nhất" chỉ nằm ở Vision, không thành ràng buộc kiểm chứng được (mức: cao)
Brief nêu luận đề này ở Tóm tắt và nhắc lại ở "Điểm khác biệt" và "Tầm nhìn". PRD giữ câu ở §1 Vision, nhưng:
- Không có FR hay NFR nào buộc Trang xác nhận, Tra đơn, Hàng đợi và Lịch sử cùng đọc một bản ghi. Chỉ Tồn kho được gọi là "nguồn duy nhất" (§4.6) và FR-7 lấy mốc từ Lịch sử. Với trạng thái, đây là ý đồ kiến trúc mà người thiết kế có thể bỏ qua, ví dụ làm bảng hoặc cache riêng cho phía khách.
- "Điểm khác biệt" của brief nói sửa sai là thêm thao tác mới chứ không xóa lịch sử. PRD có điều này ở FR-13, FR-14 và FR-15, nhưng không nêu như nguyên tắc sản phẩm. Hệ quả: FR-7 có thể gây hiểu nhầm, vì khách không thấy dòng "Đã giao" đã bị sửa. Đó là quyết định đã xác nhận, nhưng PRD nên nói rõ rằng "một nguồn" nghĩa là nguồn đầy đủ, còn khách chỉ thấy một phép chiếu của nó.
- "Tầm nhìn" của brief (các tính năng sau như cảnh báo đơn kẹt và đối soát thanh toán đều dựa trên cùng bản ghi đơn) không có trong PRD. §6.2 chỉ liệt kê mục bị hoãn mà không nói chúng tồn tại nhờ bản ghi này. Đây là lý do để giữ mô hình dữ liệu mở rộng được.

### 3. Mất lối liên hệ shop cho khách muốn hủy (mức: trung bình)
Brief ghi phạm vi ngoài: "Khách cần hủy sẽ liên hệ shop qua `[SĐT_SHOP]`". PRD §5 và §4.8 chỉ nói khách không còn tự hủy. Chỉ đơn chuyển khoản đã hủy mới có dòng hướng dẫn liên hệ (FR-7). Khách còn đơn Chờ xác nhận muốn hủy không có đường nào trong yêu cầu. Việc bỏ quyền tự hủy thành một lỗ hổng trải nghiệm. Với đối tượng "sợ mất tiền khi đơn im lặng" thì lỗ hổng này đáng kể.

### 4. Giả định về vai quản lý và đối soát bị rơi (mức: thấp đến trung bình)
Brief ghi giả định Quản lý kiêm chủ shop "đồng thời đối soát sao kê và hoàn tiền". PRD §9 chỉ giữ "hoàn tay trong 3 ngày làm việc". §2.2 lại xếp "kế toán đối soát thanh toán" vào Non-Users, và Open Question 2 hỏi lại "ai đối soát". Cần nêu rõ rằng việc đối soát do chủ shop làm ngoài hệ thống, để FR-21 không bị hiểu là hệ thống phải hỗ trợ đối soát.

### 5. Chỉ số "không được xấu đi" thiếu điều kiện số nền (mức: thấp)
Brief: tỷ lệ đơn hủy do hết hàng "theo dõi sau khi có số nền". SM-C1 chỉ nói "không được tăng" mà không nói phải ghi số nền trước khi phát hành, trong khi SM-5 thì có. Không có số nền thì SM-C1 không đo được.

## Đã đối chiếu, không phải khoảng trống
Ba nỗi sợ và tiêu chí thành công của từng nhóm (JTBD §2.1, SM-1 đến SM-4), luồng nhân viên và quản lý, quy tắc tồn kho và ưu tiên người đặt trước (FR-16), giữ form khi hết hàng (FR-19), đưa đơn chuyển khoản quá 24 giờ lên đầu và không tự hủy (FR-9), đánh dấu hoàn tiền (FR-21), tính chất dự án khóa học "như sản phẩm thật" (§1). Các mục này đều khớp với brief.
