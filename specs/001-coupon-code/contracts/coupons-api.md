# API Contract: Tạo đơn hàng với Mã giảm giá (POST /api/orders)

**Feature**: `001-coupon-code`
**Endpoint**: `POST /api/orders`
**Created**: 2026-11-08

## 1. Request Payload

Client gửi payload đặt hàng kèm mã coupon (tùy chọn) qua body:

```json
{
  "fullName": "Nguyễn Văn A",
  "phone": "0987654321",
  "email": "vana@example.com",
  "address": "123 Đường Lê Lợi, Quận 1, TP.HCM",
  "note": "Giao giờ hành chính",
  "shippingMethod": "standard",
  "paymentMethod": "cod",
  "couponCode": "SHOPLITE10",
  "items": [
    {
      "productId": "prod-1",
      "quantity": 2
    }
  ]
}
```

> **Lưu ý chống gian lận:** Client **không** được gửi số tiền giảm (`discountAmount`) hay tổng tiền (`total`) lên server. Server sẽ tự tìm sản phẩm trong catalog, kiểm tra tồn kho, lấy mã coupon từ `couponCode`, tự tính toán lại số tiền giảm và lưu tổng tiền thực tế.

---

## 2. Success Response (HTTP 201 Created)

```json
{
  "order": {
    "id": "ord-1731053400000",
    "status": "pending",
    "createdAt": "2026-11-08T15:00:00.000Z",
    "updatedAt": "2026-11-08T15:00:00.000Z",
    "customer": {
      "fullName": "Nguyễn Văn A",
      "phone": "0987654321",
      "email": "vana@example.com",
      "address": "123 Đường Lê Lợi, Quận 1, TP.HCM"
    },
    "shippingMethod": "standard",
    "paymentMethod": "cod",
    "items": [...],
    "subtotal": 600000,
    "shippingFee": 0,
    "couponCode": "SHOPLITE10",
    "discountAmount": 60000,
    "total": 540000
  }
}
```

---

## 3. Error Responses (HTTP 400 Bad Request)

Theo chuẩn định dạng lỗi nhất quán của ShopLite: `{ error: { code, message, details? } }`.

### 3.1. Mã giảm giá không tồn tại

```json
{
  "error": {
    "code": "COUPON_NOT_FOUND",
    "message": "Mã giảm giá không tồn tại."
  }
}
```

### 3.2. Mã giảm giá đã hết hạn

```json
{
  "error": {
    "code": "COUPON_EXPIRED",
    "message": "Mã giảm giá đã hết hạn sử dụng."
  }
}
```

### 3.3. Chưa đạt giá trị đơn hàng tối thiểu

```json
{
  "error": {
    "code": "COUPON_MIN_ORDER_NOT_MET",
    "message": "Đơn hàng chưa đạt giá trị tối thiểu 300.000đ. Vui lòng mua thêm 100.000đ để áp dụng mã này.",
    "details": {
      "minOrderValue": 300000,
      "amountNeeded": 100000
    }
  }
}
```
