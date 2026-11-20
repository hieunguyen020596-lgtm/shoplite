# Design

## Context

Xem proposal.md (Why) và `specs/order-placement/spec.md`.

Hiện trạng trong `order-service.ts` → `placeOrder`:

1. `placeOrderSchema.safeParse(input)`: mỗi dòng có `quantity` từ 1 tới `MAX_QUANTITY_PER_ITEM`.
2. `mergeItems(items)`: cộng các dòng trùng `productId`. **Không kiểm tra lại giới hạn.**
3. Kiểm tra `quantity > product.stock`. Bước này chỉ chặn được khi tồn kho nhỏ.

## Goals / Non-Goals

**Goals:** chặn tổng số lượng mỗi sản phẩm vượt 10 ngay ở bước validate, dùng lại định dạng lỗi hiện có.

**Non-Goals:** không đổi `mergeItems`, không đổi client.

## Decisions

### 1. Từ chối thay vì tự kẹp về 10

- **Cách làm:** trả `VALIDATION_ERROR`.
- **Lý do:** kẹp im lặng sẽ tạo đơn khác với yêu cầu của client mà không báo, sai nguyên tắc "server là nguồn sự thật nhưng không âm thầm sửa dữ liệu". Client hợp lệ không bao giờ gửi dòng trùng, nên chỉ request bất thường mới bị từ chối.

### 2. Kiểm tra trong `placeOrderSchema` bằng `superRefine`

- **Cách làm:** thêm `.superRefine` cho mảng `items`, cộng số lượng theo `productId`. Sản phẩm nào vượt `MAX_QUANTITY_PER_ITEM` thì thêm issue với `path: ["items"]` và message `Mỗi sản phẩm chỉ được đặt tối đa 10 (sản phẩm "<id>")`, dùng hằng số chứ không hard-code số 10.
- **Lý do:** đúng quy ước "schema đặt trong `checkout-schema.ts`". Lỗi đi qua `toFieldErrors` → `OrderError("VALIDATION_ERROR", ..., details)` sẵn có, nên không cần thêm mã lỗi mới.
- **Phương án đã cân nhắc:** kiểm tra sau `mergeItems` trong service. Bị loại vì tách quy tắc validate ra hai nơi.

### File sửa

| Loại | File                                                          |
| ---- | ------------------------------------------------------------- |
| Sửa  | `src/features/checkout/checkout-schema.ts`                    |
| Sửa  | `src/features/checkout/checkout-schema.test.ts` (test schema) |
| Sửa  | `src/features/orders/order-service.test.ts` (không lưu đơn)   |
| Sửa  | `src/app/api/orders/route.test.ts` (400)                      |

## Risks / Trade-offs

- **[Client cũ gửi dòng trùng sẽ bị từ chối]** → Client hiện tại luôn gộp trong giỏ hàng (`cartReducer` cộng dồn), nên không ảnh hưởng.
