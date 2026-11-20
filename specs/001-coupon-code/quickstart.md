# Quickstart: Hướng dẫn kiểm thử thủ công tính năng Mã giảm giá

**Feature**: `001-coupon-code`
**Created**: 2026-11-08

Tài liệu này cung cấp các kịch bản kiểm thử nhanh bằng tay trên trình duyệt sau khi hoàn thành tính năng.

---

## Chuẩn bị

Khởi động dev server:

```bash
npm run dev
```

Mở trình duyệt truy cập: `http://localhost:3000`

---

## Kịch bản 1: Áp dụng mã giảm theo phần trăm có trần (SHOPLITE10)

1. Thêm sản phẩm vào giỏ hàng sao cho tạm tính đạt **1.200.000đ** (ví dụ: 1 Bàn phím cơ Keychron K2).
2. Đi tới trang thanh toán: `/checkout`.
3. Tìm ô **Mã giảm giá**, nhập chính xác: `SHOPLITE10` và bấm **Áp dụng**.
4. **Kết quả mong đợi**:
   - Dòng "Mã giảm giá SHOPLITE10" hiển thị thẻ tag xanh có nút "Gỡ".
   - Dòng giảm giá trong tóm tắt hiển thị: `-100.000đ` (vì 10% của 1.200.000đ là 120.000đ nhưng bị giới hạn trần 100.000đ).
   - Tổng tiền giảm đúng 100.000đ.
5. Bấm nút **Gỡ mã** → Dòng giảm giá biến mất, tổng tiền trở về mức ban đầu.

---

## Kịch bản 2: Áp dụng mã giảm số tiền cố định (GIAM50K)

1. Chọn sản phẩm có giá từ **500.000đ** trở lên vào giỏ hàng.
2. Tại trang thanh toán, nhập mã: `GIAM50K` và bấm **Áp dụng**.
3. **Kết quả mong đợi**:
   - Tóm tắt đơn hàng hiển thị: `Giảm giá: -50.000đ`.
   - Tổng thanh toán được giảm đúng 50.000đ.

---

## Kịch bản 3: Kiểm thử các trường hợp báo lỗi

1. **Mã không tồn tại**:
   - Nhập `MAGIADAU` → Báo lỗi: _"Mã giảm giá không tồn tại."_
2. **Mã hết hạn**:
   - Nhập `TET2026` (hết hạn ngày 28/02/2026) → Báo lỗi: _"Mã giảm giá đã hết hạn sử dụng."_
3. **Chưa đủ giá trị tối thiểu**:
   - Chọn sản phẩm chỉ có giá **200.000đ** vào giỏ hàng.
   - Nhập mã `SHOPLITE10` (yêu cầu đơn từ 300.000đ).
   - Báo lỗi: _"Đơn hàng chưa đạt giá trị tối thiểu 300.000đ. Vui lòng mua thêm 100.000đ để áp dụng mã này."_
4. **Nhập chữ thường**:
   - Nhập `shoplite10` → Báo lỗi không tồn tại (do hệ thống phân biệt hoa/thường).

---

## Kịch bản 4: Đặt hàng và kiểm tra trang chi tiết (/orders/[id])

1. Đặt hàng thành công với mã `SHOPLITE10`.
2. Trình duyệt tự động chuyển hướng đến trang `/orders/[id]?placed=1`.
3. **Kết quả mong đợi**:
   - Trong bảng tổng kết đơn hàng hiển thị dòng `Mã giảm giá (SHOPLITE10)` kèm số tiền `-100.000đ`.
   - Tổng tiền khớp chính xác với số tiền đã hiển thị ở bước thanh toán.
4. Mở lại một đơn hàng cũ trong lịch sử → Trang hiển thị bình thường, không bị lỗi.
