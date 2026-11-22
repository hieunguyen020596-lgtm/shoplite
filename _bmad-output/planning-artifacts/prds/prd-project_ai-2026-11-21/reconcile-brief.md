# Đối chiếu đầu vào: brief + addendum của brief + brainstorm-intent → PRD

Nguồn: `briefs/brief-project_ai-2026-11-21/brief.md`, `addendum.md`; `brainstorm-shoplite-order-ops-2026-11-21/brainstorm-intent.md`.

## Đã bao phủ

- Toàn bộ mục Must trong brief → FR-1 → FR-29.
- Mục Should → FR-30 → FR-32. "Hiện lý do hủy cho khách" được nâng lên Must (FR-27).
- Mục Could và Won't → §5, §6.2.
- Ràng buộc không thêm DB, không dịch vụ ngoài, chỉ chạy 1 instance, không để AI tự làm nghiệp vụ → §10, §11.
- Tiêu chí thành công trong brief → SM-1 → SM-6, có thêm counter-metrics.

## Khoảng trống

1. **Chất lượng "màn hình tối giản để nhân viên không quay về Zalo" (R6) chưa đo được.** FR-9 chỉ mô tả bằng tính từ. → Thêm tiêu chí đo được: xác nhận một đơn từ Hàng đợi không quá 2 thao tác.
2. **Quy trình "shop hủy hoặc giao thất bại thì gọi khách" mới chỉ có ở UJ-4.** Không FR nào nhắc nhân viên làm việc này. → FR-15 và FR-16 nên nhắc nhân viên ghi Ghi chú nội bộ sau khi gọi khách.
3. **Brief ghi "trình duyệt nhớ mã đơn (localStorage)", còn PRD dùng khái niệm Thiết bị đã đặt** và addendum gợi ý cookie ký. Không mâu thuẫn ở mức yêu cầu. Thay đổi đã được ghi lý do trong addendum (phương án đã loại).
4. **Brief nêu R4 "không phân biệt COD và bank_transfer".** PRD chỉ xử lý gián tiếp qua FR-31 và FR-32, đều ở mức Should. Chấp nhận được, vì brief cũng xếp mục này là Should.
