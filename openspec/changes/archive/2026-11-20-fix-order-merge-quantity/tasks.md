# Tasks

## 1. Validate tổng số lượng theo sản phẩm

- [x] 1.1 Thêm `.superRefine` cho `items` trong `placeOrderSchema` (`checkout-schema.ts`): cộng số lượng theo `productId`; vượt `MAX_QUANTITY_PER_ITEM` thì thêm issue `path: ["items"]` với message tiếng Việt có mã sản phẩm. Kiểm tra: typecheck pass.
- [x] 1.2 Thêm test vào `checkout-schema.test.ts`, cần cover:
  - 10 + 10 cùng sản phẩm thì lỗi ở key `items`
  - 4 + 6 (đúng 10) thì hợp lệ
  - 5 + 6 (11) thì lỗi
  - hai sản phẩm khác nhau mỗi cái 10 thì hợp lệ

  Kiểm tra: `npx vitest run src/features/checkout` pass.

## 2. Service và API

- [x] 2.1 Thêm test vào `order-service.test.ts`:
  - dòng trùng vượt giới hạn thì ném `VALIDATION_ERROR` và repository không có đơn nào
  - dòng trùng có tổng đúng 10 thì đơn có một dòng số lượng 10

  Kiểm tra: vitest pass.

- [x] 2.2 Thêm test vào `app/api/orders/route.test.ts`: dòng trùng vượt giới hạn thì trả 400 `VALIDATION_ERROR` có `details.items`. Kiểm tra: vitest pass.

## 3. Kiểm tra tích hợp

- [x] 3.1 Chạy `npm run format` và `npm run check`. Kiểm tra: pass toàn bộ.
- [x] 3.2 Chạy `npm run test:e2e` (đặt hàng qua giao diện vẫn thành công). Kiểm tra: pass.

## Workflow follow-up

- `/opsx:verify fix-order-merge-quantity`, rồi archive.
