# Đối chiếu: addendum của brief so với PRD và addendum của PRD

Đầu vào: `_bmad-output/planning-artifacts/briefs/brief-shoplite-2026-11-21/addendum.md`

Phạm vi: chỉ ghi quyết định kỹ thuật, quy tắc chuyển trạng thái, ca test bắt buộc, ảnh hưởng tới code và phương án bị loại mà PRD hoặc addendum của PRD đã bỏ, làm yếu hoặc mâu thuẫn. Không ghi khác biệt về cách diễn đạt. Mục "Phương án đã loại hoặc hoãn" được PRD addendum trỏ về brief nên không tính là thiếu. Các quyết định đã chốt trong `.memlog.md` (giữ URL `/orders/{id}?placed=1`, ngưỡng 20/10/3, cookie 7 ngày, phiên 8 giờ) không tính là thiếu.

## Đã phủ đủ (không cần xử lý)

- Bảng chuyển trạng thái: FR-10 đến FR-13 và Glossary phủ đủ. Đó là các quy tắc: hủy hoàn kho một lần, bắt buộc lý do, xác nhận hai lần, Lùi đơn do Quản lý thực hiện.
- 8 trong 9 ca test bắt buộc có FR tương ứng: ca 1 (FR-16), ca 2 (FR-17), ca 3 (FR-10, FR-14), ca 5 (FR-10, FR-12, FR-13), ca 6 (FR-5), ca 7 (FR-20), ca 8 (FR-3), ca 9 (FR-1, FR-20). Ca 4 phủ một phần, xem gap 2.
- Tài khoản nhân nhân viên qua env với mật khẩu hash, `CHECK (stock >= 0)`, bảng `rate_limits` lưu trong PostgreSQL, danh mục giữ trong code, seed tồn kho từ `src/data/products.ts`, thứ tự làm và chỉ phát hành khi đủ chuỗi: đều có trong PRD hoặc addendum.

## Khoảng trống

### 1. Thao tác nguyên tử bị làm yếu: "thay `save`" thành "thêm thao tác"
- Brief addendum, mục "Thao tác dữ liệu": "Thay `OrderRepository.save` bằng thao tác nguyên tử cho đặt hàng và chuyển trạng thái."
- PRD addendum, mục "Điểm chạm trong code", dòng `order-repository.ts:6`: chỉ ghi "Thêm thao tác nguyên tử". Nếu `save` còn tồn tại thì vẫn có đường ghi đè trạng thái không qua điều kiện `WHERE status = $from`, và điều đó làm yếu NFR "một đường duy nhất" ở mục 4.9.
- Đề xuất: ghi rõ `save` bị thay hoặc bị cấm dùng cho đổi trạng thái và đặt hàng.

### 2. Ca test 4 chỉ phủ phía đặt đơn, thiếu phía hủy
- Brief: "Lỗi giữa transaction khi đặt hoặc hủy: tồn kho và lịch sử giữ nguyên."
- PRD: FR-16 phủ lỗi giữa giao dịch khi đặt. FR-12 chỉ nói "cùng một giao dịch", không có hệ quả kiểm thử được cho lỗi giữa chừng khi hủy (tồn kho không đổi, trạng thái không đổi, không có dòng lịch sử). FR-14 chỉ nói chung "Đổi Trạng thái thất bại không để lại dòng Lịch sử".
- Đề xuất: thêm một Consequence vào FR-12 hoặc FR-17 cho ca lỗi giữa chừng khi hủy.

### 3. Mẫu SQL điều kiện bị bỏ khỏi addendum của PRD
- Brief: trừ kho bằng `UPDATE ... SET stock = stock - $n WHERE id = $id AND stock >= $n`; chuyển trạng thái bằng `UPDATE ... WHERE status = $from` để chỉ một thao tác đồng thời thắng.
- PRD addendum chỉ giữ `CHECK (stock >= 0)` ở bảng `inventory`, không có hai mẫu cập nhật có điều kiện. Chỉ dựa vào CHECK thì đồng thời vẫn có thể gây lỗi ràng buộc thay vì trả `INSUFFICIENT_STOCK` sạch.
- Đề xuất: chép hai mẫu này vào mục "Lựa chọn kỹ thuật" của PRD addendum.

### 4. Bỏ `stock` khỏi `Product` tĩnh và danh sách file bị compiler chỉ ra chưa đủ
- Brief: bỏ `stock` khỏi `Product` tĩnh để compiler chỉ mọi chỗ đọc; liệt kê `catalog-service.ts`, `stock-badge.tsx`, `product-card.tsx`, `cart-reducer.ts`. Brief cũng nói bỏ `generateStaticParams` nếu hàm này còn giữ số tồn cũ.
- PRD addendum: có `catalog-service.ts`, `cart-reducer.ts` và `generateStaticParams` (nhưng chỉ ghi "Bảo đảm tồn kho được đọc động"). Thiếu `stock-badge.tsx` và `product-card.tsx`, và không nêu việc xóa trường `stock` khỏi kiểu `Product`.
- Đề xuất: thêm hai file vào bảng "Điểm chạm trong code" và ghi việc gỡ trường `stock` làm cơ chế phát hiện.

### 5. Quy tắc nguồn IP và `.env.local`
- Brief: "Chỉ đọc IP từ proxy đã cấu hình; chưa xác định proxy khi triển khai." Đây là ràng buộc thiết kế cho FR-3 (IP giả trong header không vượt được giới hạn). PRD chỉ giữ câu hỏi mở số 5 và Consequence của FR-3, không có quy tắc "chỉ tin IP từ proxy đã cấu hình" và cấu hình mặc định khi chưa có proxy.
- Brief: `.env.local` là file mẫu của khóa học, giữ trong git với giá trị `replace_me`. PRD addendum chỉ nói "không khai báo trong `.env.local`" và bỏ ý "giữ trong git với `replace_me`". Git status hiện có `.env.local` đang bị sửa, nên rủi ro lộ giá trị thật là có thực.
- Đề xuất: thêm một dòng cho mỗi mục vào PRD addendum.

### 6. Ghi chú thêm (mức thấp)
- Brief yêu cầu "viết lại" `checkout-form.test.tsx`. PRD addendum cho phép giữ nếu dùng URL `/orders/{id}?placed=1`. Đây là hệ quả của quyết định đã chốt trong memlog nên không tính là gap.
- Brief nêu "số đơn đang mở theo số điện thoại"; PRD FR-20 đếm đơn Chờ xác nhận. Memlog đã chốt "3 đơn chờ/SĐT" nên không tính là gap.
