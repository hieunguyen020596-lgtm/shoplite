# Đối chiếu: PRD (prd-project_ai-2026-11-21) → DESIGN.md + EXPERIENCE.md

## Mỗi FR có giao diện đều có bề mặt hiển thị

- **Đã bao phủ:** FR-1, 2, 4–18, 23, 25–27, 29–33. Các FR này đều có dòng trong IA, Component Patterns hoặc State Patterns.
- **FR-28** (không lộ Ghi chú nội bộ): bao phủ qua UJ-4 bước 5 và DESIGN.md (phiếu in không chứa ghi chú).
- **FR-3, FR-19 → FR-22, FR-24** là yêu cầu phía server, không có giao diện riêng. FR-20 và FR-22 lộ ra giao diện qua UJ-3 (thông báo hết hàng hiện có, BL-6).

## Khoảng trống đã xử lý

1. **FR-32 thiếu component pattern.** Đã thêm dòng "Cờ Đã nhận tiền chuyển khoản".
2. **FR-15 và FR-16:** sheet chưa liệt kê Lý do có sẵn. Đã thêm. Danh sách cho Hủy đơn là `[ASSUMPTION]`, vì PRD chỉ có ví dụ "Thiếu hàng" (UX gọi là "Hết hàng", để khách dễ hiểu).
3. **UJ-5 cần tìm theo Mã đơn.** PRD đã có thêm FR-33 (người dùng chọn phương án a).

## Giữ nguyên ý định qualitative của PRD và brief

- "Màn hình tối giản, nhanh hơn Zalo" (R6) → không có dashboard; xác nhận một đơn mất 2 thao tác; Hàng đợi là trang chủ của `/staff`.
- "Timeline kiểu Shopee" → Timeline dọc kèm Lý do.
