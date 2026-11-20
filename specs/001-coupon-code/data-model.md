# Data Model & Validation Schemas: Mã giảm giá (Coupon Code)

**Feature**: `001-coupon-code`
**Created**: 2026-11-08

## 1. Thực thể Coupon (Mã giảm giá)

```typescript
export type CouponType = "percent" | "fixed";

export interface Coupon {
  /** Mã coupon duy nhất, viết hoa, ví dụ: "SHOPLITE10" */
  code: string;
  /** Loại giảm giá: theo phần trăm hoặc số tiền cố định */
  type: CouponType;
  /** Giá trị: phần trăm (1-100) hoặc số tiền cố định (VND) */
  value: number;
  /** Mức giảm tối đa (áp dụng cho loại "percent", đơn vị VND) */
  maxDiscount?: number;
  /** Giá trị đơn hàng tối thiểu để được áp dụng (đơn vị VND) */
  minOrderValue?: number;
  /** Ngày hết hạn định dạng YYYY-MM-DD (hết hạn vào 23:59:59 của ngày này) */
  expiresAt?: string;
  /** Mô tả ngắn hiển thị cho khách hàng */
  description: string;
}
```

---

## 2. Kết quả kiểm tra mã (Validation Result)

```typescript
export type CouponErrorCode =
  "COUPON_NOT_FOUND" | "COUPON_EXPIRED" | "MIN_ORDER_VALUE_NOT_MET";

export type CouponValidationResult =
  | {
      valid: true;
      coupon: Coupon;
      discountAmount: number;
    }
  | {
      valid: false;
      code: CouponErrorCode;
      message: string;
      /** Số tiền cần mua thêm để đạt giá trị tối thiểu (nếu lỗi MIN_ORDER_VALUE_NOT_MET) */
      amountNeeded?: number;
    };
```

---

## 3. Mở rộng tính tiền (OrderTotals trong pricing.ts)

```typescript
export interface OrderTotals {
  subtotal: number;
  shippingFee: number;
  /** Số tiền giảm giá được áp dụng (mặc định 0đ) */
  discount: number;
  /** Tổng tiền sau khi trừ giảm giá và cộng phí ship (tối thiểu 0đ) */
  total: number;
}
```

---

## 4. Mở rộng Schema đặt hàng (checkout-schema.ts)

```typescript
export const checkoutSchema = z.object({
  fullName: z.string().trim().min(2, "Vui lòng nhập họ và tên đầy đủ"),
  phone: z
    .string()
    .trim()
    .regex(/^(0|\+84)[3|5|7|8|9][0-9]{8}$/, "Số điện thoại không hợp lệ"),
  email: z
    .string()
    .trim()
    .email("Email không hợp lệ")
    .optional()
    .or(z.literal("")),
  address: z.string().trim().min(5, "Vui lòng nhập địa chỉ giao hàng cụ thể"),
  note: z.string().trim().max(500, "Ghi chú không quá 500 ký tự").optional(),
  shippingMethod: z.enum(["standard", "express"]),
  paymentMethod: z.enum(["cod", "banking"]),
  /** Mã giảm giá khách hàng nhập vào (tùy chọn) */
  couponCode: z.string().trim().optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
```

---

## 5. Mở rộng Thực thể Đơn hàng (Order trong orders/types.ts)

```typescript
export interface Order {
  id: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  customer: OrderCustomer;
  shippingMethod: ShippingMethod;
  paymentMethod: PaymentMethod;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  /** Mã giảm giá đã áp dụng (nếu có) */
  couponCode?: string;
  /** Số tiền được giảm giá thực tế (mặc định 0) */
  discountAmount?: number;
  total: number;
}
```
