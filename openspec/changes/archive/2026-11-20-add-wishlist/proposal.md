# Proposal: Danh sách yêu thích (Wishlist)

## Why

Khách hàng thường xem nhiều sản phẩm nhưng chưa muốn mua ngay; họ cần một nơi lưu lại các sản phẩm quan tâm để so sánh và cân nhắc mua sau thay vì bỏ tạm vào giỏ hàng. Tính năng danh sách yêu thích giúp tăng tỷ lệ quay lại của khách hàng và cải thiện trải nghiệm mua sắm trên ShopLite.

## What Changes

- Thêm nút trái tim (toggle wishlist) trên thẻ sản phẩm (`ProductCard`) và trang chi tiết sản phẩm (`/products/[slug]`).
- Thêm biểu tượng trái tim kèm badge số lượng sản phẩm yêu thích trên `Header`, bấm vào chuyển hướng đến trang `/wishlist`.
- Tạo trang danh sách yêu thích `/wishlist` hiển thị các sản phẩm đã lưu với giá và trạng thái tồn kho cập nhật từ catalog, kèm nút xóa khỏi danh sách và nút thêm vào giỏ hàng.
- Lưu trữ danh sách yêu thích trong `localStorage` của trình duyệt, duy trì trạng thái khi tải lại trang và tự động đồng bộ giữa các tab đang mở.
- Giới hạn tối đa 50 sản phẩm trong danh sách; hiển thị thông báo khi khách hàng cố thêm sản phẩm thứ 51.
- Hiển thị rõ trạng thái "Hết hàng" cho các sản phẩm trong wishlist nếu kho hết hàng và vô hiệu hóa nút thêm vào giỏ đối với sản phẩm đó.
- Xử lý dữ liệu hỏng trong `localStorage` và id sản phẩm không còn trong catalog một cách an toàn, không làm ứng dụng bị lỗi.

## Capabilities

### New Capabilities

- `wishlist`: Quản lý danh sách sản phẩm yêu thích của khách hàng trên trình duyệt (thêm/bỏ sản phẩm, đếm số lượng, đồng bộ đa tab, trang hiển thị và thêm vào giỏ hàng).

### Modified Capabilities

## Impact

- **Mã nguồn bị ảnh hưởng**:
  - `src/features/catalog/components/product-card.tsx`: Thêm nút toggle yêu thích không lồng trong liên kết điều hướng.
  - `src/app/products/[slug]/page.tsx`: Thêm nút toggle yêu thích ở trang chi tiết sản phẩm.
  - `src/components/layout/header.tsx`: Thêm component `WishlistBadge` cạnh `CartBadge`.
- **Thư mục và file mới**:
  - `src/features/wishlist/`: reducer, store, hook và các component UI.
  - `src/app/wishlist/page.tsx`: Route hiển thị trang danh sách yêu thích.
- **Dependencies / Systems**: Không thêm thư viện phụ thuộc mới, không sửa database hay API server.

## Ngoài phạm vi

- Lưu trữ danh sách yêu thích lên máy chủ hoặc đồng bộ qua tài khoản người dùng.
- Tính năng chia sẻ danh sách yêu thích cho người khác qua link hoặc mạng xã hội.
- Gửi thông báo hoặc email khi sản phẩm yêu thích có hàng trở lại hoặc giảm giá.
