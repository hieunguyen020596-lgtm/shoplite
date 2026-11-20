# Technical Research & Architecture Decisions: Mã giảm giá (Coupon Code)

**Feature**: `001-coupon-code`
**Created**: 2026-11-08

## Decision 1: Nơi lưu trữ danh sách mã giảm giá

- **Bối cảnh**: Cần lưu trữ các mã khuyến mãi ban đầu (`SHOPLITE10`, `GIAM50K`, `TET2026`).
- **Quyết định**: Lưu dữ liệu tĩnh trong file `src/data/coupons.ts`, tương tự như `products.ts` và `categories.ts`.
- **Lý do**:
  - Tuân thủ nguyên tắc YAGNI và Constitution (không cài database mới).
  - Vì phạm vi chưa cần màn hình Admin để tạo/sửa mã động nên mảng tĩnh là giải pháp đơn giản, an toàn và có type-safety tuyệt đối với TypeScript.
- **Phương án thay thế đã loại bỏ**:
  - _Lưu file `storage/coupons.json`_: Không cần thiết vì hiện tại chưa có nhu cầu ghi dữ liệu mới cho coupon.

---

## Decision 2: Cơ chế xác thực mã giảm giá (Client vs Server)

- **Bối cảnh**: Khách hàng muốn thấy ngay số tiền giảm ở client trước khi bấm đặt hàng, nhưng server bắt buộc phải là nguồn sự thật duy nhất (Single Source of Truth).
- **Quyết định**:
  - Logic xác thực và tính toán giảm giá được viết thành **hàm thuần (pure functions)** trong `src/features/coupons/coupon-service.ts`.
  - Client gọi trực tiếp hàm thuần này để hiển thị ngay lập tức (zero network latency, phản hồi < 10ms).
  - Khi submit `POST /api/orders`, server tái sử dụng chính hàm thuần này để kiểm tra lại toàn bộ và tính toán số tiền giảm cuối cùng trước khi ghi vào đơn hàng.
- **Lý do**:
  - Loại bỏ hoàn toàn sự trùng lặp code (DRY - Don't Repeat Yourself).
  - Không cần tạo thêm endpoint API `/api/coupons/validate`, giảm thiểu số lượng roundtrip HTTP.
  - Vẫn đảm bảo tính toàn vẹn 100% vì server không tin bất kỳ con số giảm giá nào do client gửi lên.

---

## Decision 3: Tương thích ngược với đơn hàng cũ (Backward Compatibility)

- **Bối cảnh**: Các đơn hàng đã lưu trong `storage/orders.json` không có trường `couponCode` và `discountAmount`.
- **Quyết định**:
  - Mở rộng interface `Order`:
    ```typescript
    couponCode?: string;
    discountAmount?: number; // khi đọc đơn cũ không có trường này, mặc định fallback là 0
    ```
  - Trong UI chi tiết đơn hàng (`src/app/orders/[id]/page.tsx`), chỉ hiển thị dòng giảm giá nếu `discountAmount > 0`.
- **Lý do**: Đảm bảo không làm crash trang xem đơn hàng cũ và không cần viết script migration phức tạp.

---

## Decision 4: Phân biệt hoa thường và xử lý ngày hết hạn

- **Bối cảnh**: Quyết định trong bản spec yêu cầu phân biệt hoa/thường (case-sensitive) và hết hạn cuối ngày theo giờ Việt Nam.
- **Quyết định**:
  - So sánh mã: `coupon.code === inputCode.trim()`.
  - Kiểm tra hết hạn: Chuyển ngày hết hạn về `23:59:59.999` (UTC+7) rồi so sánh với thời điểm hiện tại `new Date()`.
