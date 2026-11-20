# Tasks

## 1. Đối chiếu requirement với test hiện có

- [x] 1.1 Đối chiếu "Thêm sản phẩm vào giỏ" và "Giới hạn số lượng mỗi sản phẩm" với `cart-reducer.test.ts` (thêm mới, cộng dồn, giới hạn 10, giới hạn tồn kho, cập nhật trong khoảng [1, max]). Kiểm tra: mỗi scenario chỉ ra được tên test tương ứng.
- [x] 1.2 Đối chiếu "Sản phẩm hết hàng" với `cart-reducer.test.ts` ("bỏ qua sản phẩm hết hàng") và `product-card.test.tsx` ("vô hiệu hóa nút mua khi sản phẩm hết hàng"). Kiểm tra: như trên.
- [x] 1.3 Đối chiếu "Cập nhật và xóa sản phẩm trong giỏ" với `cart-view.test.tsx` (giỏ trống, cập nhật số lượng và tổng tiền, xóa sản phẩm). Kiểm tra: như trên.
- [x] 1.4 Đối chiếu "Lưu giỏ hàng trên trình duyệt" với `cart-store.test.ts` (lưu, đọc lại, dữ liệu hỏng) và e2e `shopping-flow.spec.ts`. Kiểm tra: như trên.

## 2. Bổ sung test cho scenario chưa có test (không sửa code sản phẩm)

- [x] 2.1 Thêm vào `cart-store.test.ts`:
  - sự kiện `storage` đúng key `shoplite:cart` thì đọc lại giỏ và báo cho subscriber
  - sự kiện `storage` key khác thì bỏ qua

  Kiểm tra: `npx vitest run src/features/cart` pass.

- [x] 2.2 Thêm vào `cart-view.test.tsx`: tạm tính đúng 500.000đ (2 × `p007`) thì hiện "được miễn phí giao hàng tiêu chuẩn" và tổng tiền bằng tạm tính. Kiểm tra: vitest pass.

## 3. Kiểm tra tích hợp

- [x] 3.1 Chạy `npm run format` và `npm run check`. Kiểm tra: pass toàn bộ, `git diff src/` chỉ có file `*.test.*`.

## Workflow follow-up

- `openspec validate baseline-cart --strict`, rồi `openspec archive baseline-cart -y` để tạo `openspec/specs/cart/spec.md`.
