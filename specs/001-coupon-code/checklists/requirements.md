# Requirements Quality Checklist: Mã giảm giá (Coupon Code)

**Feature**: `001-coupon-code`
**Created**: 2026-11-08

## 1. Tính độc lập & Khả năng kiểm thử (Independence & Testability)

- [x] Mỗi User Story có độ ưu tiên rõ ràng (P1, P2, P3).
- [x] Mỗi Story có kịch bản Given / When / Then cụ thể, đo lường được.
- [x] Có đủ 3 kịch bản kiểm thử cho các mã ban đầu: `SHOPLITE10`, `GIAM50K`, `TET2026`.
- [x] Không trộn lẫn chi tiết kỹ thuật (tên file code, tên hàm, SQL, framework) vào spec.

## 2. Tính toàn vẹn nghiệp vụ (Business Completeness)

- [x] Quy định rõ 2 loại mã: phần trăm (kèm trần giảm tối đa) và số tiền cố định.
- [x] Quy định rõ điều kiện giá trị đơn hàng tối thiểu và ngày hết hạn.
- [x] Quy định thông báo lỗi chi tiết (mã không tồn tại, hết hạn, số tiền cần mua thêm).
- [x] Yêu cầu chống gian lận (Server tính toán lại tiền độc lập với client) được ghi rõ ràng (FR-008).
- [x] Phạm vi ngoài (Out of Scope) được định nghĩa đầy đủ.

## 3. Các điểm làm rõ (Clarifications)

- [x] [CLARIFIED 1] - Phân biệt chính xác chữ hoa/thường (case-sensitive) khi nhập mã.
- [x] [CLARIFIED 2] - Ngưỡng miễn phí giao hàng tính trên tạm tính TRƯỚC khi giảm giá.
- [x] [CLARIFIED 3] - Giảm giá được phép cấn trừ vào cả phí vận chuyển nếu vượt quá tiền hàng.
- [x] [CLARIFIED 4] - Mã áp dụng trước hạn vẫn được server chấp nhận khi bấm đặt hàng.
- [x] [CLARIFIED 5] - Chặn giảm số lượng sản phẩm dưới mức tối thiểu trừ khi khách tự gỡ mã trước.
