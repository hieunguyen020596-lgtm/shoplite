## Why

Khách thường xem nhiều sản phẩm nhưng chưa mua ngay. Họ cần một chỗ lưu lại để quay lại so sánh và mua sau, thay vì bỏ tạm vào giỏ hàng (làm sai lệch ý nghĩa giỏ hàng và tổng tiền dự kiến).

## What Changes

- Thêm nút trái tim trên thẻ sản phẩm (`ProductCard`) và ở trang chi tiết sản phẩm để thêm/bỏ sản phẩm khỏi danh sách yêu thích.
- Thêm biểu tượng trái tim kèm số lượng trên header; bấm vào mở trang `/wishlist`.
- Thêm trang `/wishlist` liệt kê sản phẩm đã thích với giá và tồn kho mới nhất, nút bỏ thích, nút thêm vào giỏ và trạng thái trống.
- Danh sách lưu trên trình duyệt (localStorage), không cần đăng nhập, giữ nguyên khi tải lại và đồng bộ giữa các tab.
- Giới hạn tối đa 50 sản phẩm; khi đầy thì báo cho khách.
- Sản phẩm hết hàng vẫn nằm trong danh sách, hiển thị "Hết hàng" và không thêm vào giỏ được.

## Capabilities

### New Capabilities

- `wishlist`: danh sách yêu thích phía trình duyệt (toggle, header badge, trang `/wishlist`, lưu trữ và đồng bộ tab, giới hạn 50, xử lý hết hàng và dữ liệu hỏng).

### Modified Capabilities

(không có - `openspec/specs/` hiện đang trống; giỏ hàng chỉ được tái sử dụng, không đổi hành vi)

## Ngoài phạm vi

- Lưu wishlist lên server hoặc tài khoản người dùng.
- Chia sẻ wishlist cho người khác.
- Thông báo khi sản phẩm có hàng trở lại.
- Thêm tất cả sản phẩm yêu thích vào giỏ trong một lần bấm.
- Thay đổi hành vi giỏ hàng, API, đơn hàng hay luật tính tiền.

## Impact

- Code mới: `src/features/wishlist/` (reducer, store, hook, component), `src/app/wishlist/page.tsx`.
- Code sửa: `src/features/catalog/components/product-card.tsx`, `src/app/products/[slug]/page.tsx` (hoặc `ProductPurchasePanel`), `src/components/layout/header.tsx`.
- Không đổi API, không thêm dependency, không đụng `storage/`.
- Dữ liệu trình duyệt mới: khóa localStorage `shoplite:wishlist`.
