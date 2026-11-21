# Đối chiếu PRD với phan-bien.md

Đầu vào: `_bmad-output/brainstorming/brainstorm-shoplite-ops-stakeholders-2026-11-21/phan-bien.md`
PRD: `prd.md` và `addendum.md`. Quyết định đã xác nhận trong `.memlog.md` không tính là lỗ hổng.

## Đã được xử lý đầy đủ (không cần làm gì)

- Phản biện theo vai: John (SM-1 đến SM-5, đổi trạng thái nằm trong đợt 1 qua FR-8 đến FR-13), Sally (FR-7, FR-11, FR-5, FR-19), Winston (addendum "Điểm chạm trong code", FR-3 bộ đếm bền, FR-18 nguồn tồn kho duy nhất), Amelia (§4.9 Kiểm thử trên Postgres thật, FR-16, addendum "Test bị ảnh hưởng", gỡ nút hủy), Mary (FR-21, §4.9 Phát hành "đóng route cũ sau cùng").
- Quyết định người dùng: Postgres/Drizzle, Docker Compose, bỏ 11 đơn, bảng inventory, cookie ký kèm tra đơn khi mất cookie, E2E DB riêng, đủ 5 Must.
- Luật theo đa số: FR-12, FR-17 (hủy), FR-21 (cờ hoàn tiền), FR-11, FR-13 (xác nhận hai bước, quản lý lùi, không đụng kho); trễ 10 phút nằm ở §6.2 (Could).
- Top 5 rủi ro: đều có FR tương ứng (FR-16, FR-9 đến FR-13, FR-5, FR-18, FR-11/13/14).

## Lỗ hổng

1. **Bất đồng chưa giải quyết bị coi như đã chốt (§5 Non-Goals, FR-12, FR-21, §6.2).** phan-bien.md mục 6 nói người phản đối chưa đổi ý, nhưng PRD không ghi nhận điều đó ở chỗ nào.
   - Winston vẫn muốn `payment_status`.
   - Sally vẫn muốn hứa hoàn tiền trên trang khách.
   - Winston vẫn muốn cho hủy khi Đang giao.
   - Sally vẫn muốn trễ 10 phút hiện "Đã giao" (chỉ có dòng Could ở §6.2).
   - Mục 3 đã giao cho đa số chốt luật, nhưng PRD không nói đây là ý kiến thiểu số chưa được thuyết phục, nên người đọc sau sẽ hiểu là đồng thuận. Nên thêm vào §8 Open Questions hoặc một mục "Bất đồng còn mở".

2. **Mục "Rủi ro còn lại" (mục 4) gần như không có chỗ trong PRD.** PRD không có mục rủi ro.
   - Rủi ro 1 (đợt 1 lớn, chưa ước lượng): không được nhắc. §4.9 Phát hành chỉ yêu cầu phát hành đủ, không nói rủi ro quy mô.
   - Rủi ro 3 (khách vẫn thấy "Đã giao" sai cho tới khi quản lý sửa): không được nêu. FR-7 và UJ-3 chỉ mô tả cách sửa.
   - Rủi ro 4 (khách không tự hủy được, phải liên hệ shop): chỉ có lời nhắn cho đơn đã hủy ở FR-7. Đơn Chờ xác nhận không có chỉ dẫn liên hệ nào cho khách muốn hủy.
   - Các rủi ro còn lại được mang theo ở mức một phần: Drizzle trên Next 16.4.2 (addendum), hoàn tiền thủ công (§8 câu 2), Bài 4.4 (§8 câu 6).

3. **Quyết định `.env.local` bị bỏ (addendum "Lựa chọn kỹ thuật").** Người dùng quyết định giữ `.env.local` trong git làm mẫu cho khóa học, giá trị đổi thành `replace_me`. PRD chỉ nói "không khai báo trong `.env.local`" và không đề cập `replace_me`. Cũng không thấy memlog xác nhận việc này. git status hiện cho thấy `.env.local` đang bị sửa, nên cần nhắc rõ để tránh lộ giá trị thật.

4. **Giả định của Mary chưa được đánh dấu hết (FR-3, FR-20).** Mary nói ngưỡng 5 lần/15 phút, che số và dời OTP là đề xuất của coach, chưa phải nhu cầu xác nhận. FR-3 chỉ gắn `[ASSUMPTION]` ở ngưỡng 20 lần/IP, không gắn ở ngưỡng 5 lần. §8 câu 4 có hỏi về các ngưỡng nên phần này được mang theo một phần.

5. **Thiếu bằng chứng về sự cố mất tiền thật (Mary) chưa được nêu.** §1 Vision và §2.1 JTBD ("không lo mất tiền") coi nỗi sợ này là sự thật đã có. §8 câu 3 hỏi về nhân viên, nhưng không hỏi về bằng chứng sự cố mất tiền. Mức độ thấp.
