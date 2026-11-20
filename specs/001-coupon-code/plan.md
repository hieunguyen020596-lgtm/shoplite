# Technical Implementation Plan: Mã giảm giá khi thanh toán (Coupon Code)

**Feature Branch**: `001-coupon-code`
**Spec Reference**: `specs/001-coupon-code/spec.md`
**Created**: 2026-11-08
**Status**: Ready for Review

## Technical Context

- **Framework**: Next.js 16 (App Router), React 19, TypeScript (strict mode).
- **Styling**: Tailwind CSS v4.
- **Validation**: Zod 4.
- **Testing**: Vitest + React Testing Library (unit/component), Playwright (E2E).
- **Data Storage**: Dữ liệu tĩnh `src/data/coupons.ts` (không thêm database ngoài).
- **Backward Compatibility**: Tương thích hoàn toàn với các đơn hàng cũ trong `storage/orders.json` (chưa có trường giảm giá).

---

## Constitution Check

| Nguyên tắc                        | Đánh giá | Chi tiết tuân thủ                                                                                                                                                                                  |
| :-------------------------------- | :------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **I. Kiến trúc theo tính năng**   | **ĐẠT**  | Toàn bộ logic thuần của coupon nằm trong `src/features/coupons/`. Tích hợp tính tiền vào `src/features/checkout/pricing.ts`. `src/app/api/` chỉ đóng vai trò route mỏng.                           |
| **II. Test trước cho nghiệp vụ**  | **ĐẠT**  | Viết unit test trước cho `coupon-service.test.ts` và `pricing.test.ts` bao gồm các trường hợp biên: giảm phần trăm có trần, giảm cố định, hết hạn, chưa đủ giá trị tối thiểu, cấn trừ phí ship.    |
| **III. Server là nguồn sự thật**  | **ĐẠT**  | API `POST /api/orders` độc lập xác thực mã và tự tính lại `discountAmount` phía server, không tin số liệu từ client gửi lên.                                                                       |
| **IV. Đơn giản trước (YAGNI)**    | **ĐẠT**  | Không cài thêm bất kỳ dependency nào. Dữ liệu coupon lưu tĩnh trong `src/data/coupons.ts`. Không tạo endpoint API validate riêng nếu có thể tái sử dụng logic thuần chia sẻ giữa client và server. |
| **V. Tiếng Việt & Accessibility** | **ĐẠT**  | 100% thông báo lỗi tiếng Việt cụ thể (cho biết số tiền cần mua thêm). Hiển thị tiền tệ VND qua `formatCurrency`. Input có label rõ ràng, phím Enter kích hoạt áp dụng.                             |

---

## Cấu trúc thư mục & File dự kiến

```text
src/
├── data/
│   └── coupons.ts                      # [MỚI] 3 mã mẫu ban đầu (SHOPLITE10, GIAM50K, TET2026)
├── features/
│   ├── coupons/                        # [MỚI] Feature mã giảm giá
│   │   ├── types.ts                    # [MỚI] Schema Zod và Types cho Coupon, AppliedCoupon
│   │   ├── coupon-service.ts           # [MỚI] Hàm thuần: validateCoupon, calculateDiscount
│   │   ├── coupon-service.test.ts      # [MỚI] Unit tests nghiệp vụ cho coupon (TDD)
│   │   └── components/
│   │       ├── coupon-input.tsx        # [MỚI] UI ô nhập mã, nút Áp dụng, nút Gỡ mã, thông báo lỗi
│   │       └── coupon-input.test.tsx   # [MỚI] Component tests cho tương tác nhập mã
│   ├── checkout/
│   │   ├── pricing.ts                  # [SỬA] Mở rộng calculateOrderTotals nhận thêm coupon
│   │   ├── pricing.test.ts             # [SỬA] Bổ sung test tính tiền khi có giảm giá
│   │   ├── checkout-schema.ts          # [SỬA] Thêm trường couponCode (optional) vào payload đặt hàng
│   │   └── components/
│   │       ├── checkout-form.tsx       # [SỬA] Nhúng CouponInput vào form thanh toán
│   │       └── checkout-summary.tsx    # [SỬA] Hiển thị dòng "Giảm giá" trong tóm tắt đơn
│   └── orders/
│       ├── types.ts                    # [SỬA] Mở rộng Order: couponCode?: string, discountAmount: number
│       └── order-service.ts            # [SỬA] Xử lý xác thực mã và tính lại tiền trước khi lưu đơn
└── app/
    └── orders/
        └── [id]/
            └── page.tsx                # [SỬA] Hiển thị mã đã dùng và số tiền giảm trong chi tiết đơn
```

---

## Complexity Tracking

Không có vi phạm hay ngoại lệ nào so với Constitution. Hệ thống hoàn toàn tái sử dụng kiến trúc hiện tại của ShopLite.
