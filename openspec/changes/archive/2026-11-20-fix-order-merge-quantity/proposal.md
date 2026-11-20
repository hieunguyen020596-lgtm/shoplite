# Proposal

## Why

Quy tắc nghiệp vụ: mỗi sản phẩm trong một đơn tối đa 10 đơn vị (`MAX_QUANTITY_PER_ITEM`). Server chỉ kiểm tra giới hạn này **từng dòng** trong `placeOrderSchema`, rồi mới gộp các dòng trùng `productId` trong `placeOrder`. Vì vậy gọi thẳng `POST /api/orders` với `[{p010, 10}, {p010, 10}]` sẽ tạo được đơn 20 đơn vị (đã tái hiện khi explore luồng đặt hàng). Giao diện không gặp lỗi này vì giỏ hàng đã gộp sẵn, nhưng server không được tin dữ liệu client.

## What Changes

- Server kiểm tra **tổng số lượng theo từng sản phẩm** (sau khi cộng các dòng trùng) không vượt 10. Vượt thì từ chối với `VALIDATION_ERROR` (400), không lưu đơn.
- Dòng trùng có tổng trong giới hạn vẫn được chấp nhận và gộp như hiện nay.
- Test cho schema, service và route.

## Ngoài phạm vi

- Thay đổi giới hạn 10 hay cách giỏ hàng ở client gộp dòng.
- Trừ tồn kho khi đặt hàng (catalog là dữ liệu tĩnh).
- Các lỗi khác của luồng đặt hàng.

## Capabilities

### New Capabilities

- `order-placement`: server tiếp nhận đơn hàng. Change này chỉ ghi requirement về giới hạn số lượng mỗi sản phẩm trong một đơn; các hành vi đặt hàng khác có thể được bổ sung bằng baseline sau.

### Modified Capabilities

(Không có: `cart` mô tả giới hạn trong giỏ ở trình duyệt, không đổi.)

## Impact

- **Code sửa:** `src/features/checkout/checkout-schema.ts` (`placeOrderSchema`).
- **Test:** `checkout-schema.test.ts`, `order-service.test.ts`, `app/api/orders/route.test.ts`.
- **API:** `POST /api/orders` có thêm một trường hợp trả 400. Client hiện tại không bị ảnh hưởng vì luôn gửi mỗi sản phẩm một dòng.
