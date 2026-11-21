# Đối chiếu PRD với brainstorm-intent.md

Đầu vào: `_bmad-output/brainstorming/brainstorm-shoplite-ops-stakeholders-2026-11-21/brainstorm-intent.md`
PRD: `prd.md` và `addendum.md`. Các quyết định trong `.memlog.md` không tính là lỗ hổng.

## Kết luận

5 Must, nguyên tắc thiết kế, luật nghiệp vụ mục 6, P1-P7 mục 8, R1, R4, R6 đều có trong PRD (FR-1 đến FR-21, mục 4.9, 4.8, addendum). Chỉ có vài rủi ro và một ca test bị bỏ hoặc yếu đi.

## Lỗ hổng

### G1. R2 (lộ thông tin qua nhãn gói hàng) bị bỏ hoàn toàn - mức: trung bình
- Intent mục 7 R2: nhãn in cả mã đơn và số điện thoại nên người nhặt được vẫn tra được đơn. Hướng xử lý: luật tra đơn, che số trên nhãn nếu đơn vị vận chuyển hỗ trợ, OTP để sau MVP. Rủi ro còn lại được chấp nhận (người đó vẫn biết trạng thái đơn).
- PRD: không có ở mục 4, 5, 8 hay addendum. Mục 5 chỉ nói "không OTP" mà không nêu lý do. Hệ quả: rủi ro còn lại đã được chấp nhận không còn dấu vết, và việc che số trên nhãn không đi vào câu hỏi mở hay ghi chú vận hành.
- Đề xuất: thêm vào mục 8 (Open Questions) hoặc một mục rủi ro, nêu rõ rủi ro được chấp nhận và OTP hoãn sau MVP.

### G2. Ca test bắt buộc số 4 chỉ phủ phía đặt đơn - mức: trung bình
- Intent: "Lỗi giữa transaction khi đặt hoặc hủy: tồn kho và lịch sử giữ nguyên."
- PRD: FR-16 có consequence lỗi giữa giao dịch cho phía đặt. FR-12 và FR-17 (hủy) chỉ nói "cùng một giao dịch" và không có tiêu chí kiểm thử cho trường hợp lỗi giữa giao dịch khi hủy. FR-14 chỉ nói đổi Trạng thái thất bại không để lại dòng Lịch sử.
- Đề xuất: thêm consequence cho FR-12 hoặc FR-17: lỗi giữa giao dịch hủy thì Trạng thái, Tồn kho, Lịch sử giữ nguyên.

### G3. Rủi ro còn lại R3 chưa được nêu - mức: thấp
- Intent R3: khách vẫn có thể thấy "Đã giao" sai trong khoảng trước khi quản lý sửa, vì mục 8 (trễ 10 giây) vẫn ở Could.
- PRD: mục 6.2 chỉ ghi trễ 10 giây hoặc 10 phút là Out of Scope. Không nói rõ cửa sổ khách thấy trạng thái sai là rủi ro đã biết và được chấp nhận. UJ-3 mô tả đúng tình huống nhưng không gọi tên là rủi ro còn lại. Còn lệch nhỏ: PRD ghi "10 giây hoặc 10 phút" trong khi intent chỉ ghi 10 giây.

### G4. R5 (đợt 1 lớn, chưa có ước lượng) không có - mức: thấp
- Intent R5: đợt 1 gồm 5 Must cộng Postgres, đăng nhập, hạ tầng test, chưa có ước lượng.
- PRD: mục 4.9 "Phát hành" yêu cầu đủ chuỗi mới được phát hành, nhưng không nêu rủi ro quy mô hay việc thiếu ước lượng. Không có trong Open Questions.

### G5. "Không dùng chung tài khoản" chưa là tiêu chí kiểm thử rõ - mức: thấp
- Intent mục 6 và P5: mỗi người một tài khoản, không dùng chung, vì tài khoản dùng chung làm lịch sử "ai làm gì" mất giá trị.
- PRD: FR-8 và Glossary nói "Tài khoản riêng", "đúng một người", hash. Không có ràng buộc hay ghi chú rằng một cặp đăng nhập không được chia cho nhiều người. Ý định ở mức định tính (nỗi sợ "bị đổ lỗi") vẫn được phủ bởi FR-14, nên chỉ ghi nhận như điểm yếu nhẹ.

## Đã đối chiếu và đủ
- Nguyên tắc 1 (một đường duy nhất có ghi vết): mục 4.9 Toàn vẹn. Nguyên tắc 2 (sửa sai là thêm thao tác): FR-13, FR-15, Glossary "Lịch sử".
- Nỗi sợ khách, nhân viên, quản lý: Vision, 2.1, FR-7 (câu cho đơn chuyển khoản đã hủy), FR-14/15, UJ-3.
- Chống dò (5 lần, 15 phút, bộ đếm trong DB, hạn mức theo IP, IP giả): FR-3, bảng `rate_limits`, Open Question 5.
- Câu hỏi mở của intent: Q1, Q2, Q3 ở mục 8 PRD; Q4 ở mục 7; Q5, Q6 là Out of Scope (6.2); Q7 và Q8 chốt bằng ASSUMPTION ở FR-9, FR-3, FR-20.
- Won't/Should/Could: mục 5 và 6.2 khớp.
