# Proposal

## Why

Khách của ShopLite thường xem nhiều sản phẩm nhưng chưa mua ngay; hiện họ chỉ có cách bỏ tạm vào giỏ hàng, làm giỏ hàng lẫn lộn giữa "định mua" và "muốn xem lại". Một danh sách yêu thích lưu ngay trên trình duyệt giúp khách quay lại so sánh và mua sau mà không cần đăng nhập.

## What Changes

- Thêm nút trái tim (toggle thích / bỏ thích) trên thẻ sản phẩm (`ProductCard`) và ở trang chi tiết sản phẩm; trạng thái "đã thích" nhìn thấy rõ và đọc được bằng screen reader.
- Thêm biểu tượng trái tim kèm số lượng sản phẩm yêu thích ở header; bấm vào mở trang `/wishlist`.
- Thêm trang `/wishlist` liệt kê sản phẩm đã thích với giá và tồn kho lấy từ catalog hiện tại; mỗi sản phẩm có nút bỏ thích và nút thêm vào giỏ; có trạng thái trống mời khám phá sản phẩm.
- Danh sách lưu trong `localStorage` của trình duyệt, giữ nguyên khi tải lại trang và đồng bộ giữa các tab đang mở.
- Giới hạn tối đa 50 sản phẩm; khi đầy, khách được thông báo và sản phẩm không được thêm.
- Sản phẩm hết hàng vẫn nằm trong danh sách, hiển thị "Hết hàng" và không thêm vào giỏ được.
- Dữ liệu lưu bị hỏng hoặc chứa sản phẩm không còn trong catalog được bỏ qua, không làm crash trang.

## Ngoài phạm vi

- Lưu wishlist lên server / đồng bộ giữa các thiết bị hoặc theo tài khoản.
- Chia sẻ wishlist (link, mạng xã hội).
- Thông báo khi sản phẩm có hàng trở lại hoặc giảm giá.
- Thay đổi hành vi giỏ hàng, thanh toán, đơn hàng hay API hiện có.
- Sắp xếp / lọc trong trang `/wishlist`, thao tác "thêm tất cả vào giỏ".

## Capabilities

### New Capabilities

- `wishlist`: Danh sách sản phẩm yêu thích phía client — toggle thích/bỏ thích, giới hạn số lượng, lưu và đồng bộ trên trình duyệt, badge ở header và trang `/wishlist`.

### Modified Capabilities

<!-- Không có: openspec/specs/ đang trống; giỏ hàng chỉ được dùng lại (addItem), không đổi requirement. -->

## Impact

- **Code mới:** `src/features/wishlist/` (hàm thuần, store, hook, component), `src/app/wishlist/page.tsx`.
- **Code sửa:** `src/features/catalog/components/product-card.tsx`, `src/app/products/[slug]/page.tsx`, `src/components/layout/header.tsx`.
- **Lưu trữ trình duyệt:** key `localStorage` mới cho wishlist (tách biệt `shoplite:cart`).
- **API / server / dữ liệu đơn hàng:** không thay đổi. Không thêm dependency.
- **Test:** unit test hàm thuần + store, component test cho nút trái tim, badge, trang wishlist; bổ sung e2e cho luồng thích → `/wishlist` → thêm vào giỏ.
