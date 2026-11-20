# Proposal

## Why

Giỏ hàng là tính năng đã chạy từ trước khi dự án dùng OpenSpec, nên `openspec/specs/` chưa mô tả hành vi của nó. Nếu không có baseline, change sau này đụng tới giỏ hàng chỉ có thể viết `ADDED` và không thể hiện rõ đang sửa requirement nào. Change này ghi lại hành vi **hiện có** của giỏ hàng thành spec sống.

## What Changes

- Ghi lại thành spec hành vi hiện có của giỏ hàng:
  - thêm sản phẩm và cộng dồn số lượng
  - giới hạn 10 sản phẩm mỗi loại và giới hạn theo tồn kho
  - sản phẩm hết hàng
  - cập nhật số lượng, xóa sản phẩm
  - lưu trên trình duyệt, đồng bộ giữa các tab
  - gợi ý miễn phí giao hàng
- Đối chiếu từng scenario với test hiện có. Scenario nào chưa có test thì bổ sung test, **không sửa code sản phẩm**.

## Ngoài phạm vi

- Thay đổi bất kỳ hành vi nào của giỏ hàng (chỉ mô tả hiện trạng).
- Sửa code trong `src/features/cart/` hay `pricing.ts`.
- Các vấn đề đã biết của thiết kế giỏ hàng: lưu snapshot nên giá có thể cũ, tồn kho trong snapshot có thể lệch. Ghi nhận ở đây, xử lý bằng change riêng nếu cần.
- Spec cho checkout, đặt hàng, mã giảm giá.

## Capabilities

### New Capabilities

- `cart`: giỏ hàng phía trình duyệt. Bao gồm thêm, cộng dồn, giới hạn số lượng, sản phẩm hết hàng, cập nhật và xóa, lưu và đồng bộ, gợi ý miễn phí giao hàng.

### Modified Capabilities

(Không có.)

## Impact

- **Code sản phẩm:** không đổi.
- **Test bổ sung:**
  - `src/features/cart/cart-store.test.ts`: đồng bộ giữa các tab
  - `src/features/cart/components/cart-view.test.tsx`: thông báo khi đạt ngưỡng miễn phí giao hàng
- **Sau khi archive:** có `openspec/specs/cart/spec.md`; change sau này sửa giỏ hàng dùng `## MODIFIED Requirements`.
