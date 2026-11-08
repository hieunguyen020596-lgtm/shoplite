# Proposal: Danh sách yêu thích (Wishlist)

## Why

Khách hàng thường xem nhiều sản phẩm khi mua sắm nhưng chưa có ý định đặt hàng ngay lập tức; họ cần một nơi thuận tiện để lưu lại nhằm so sánh và quay lại mua sau, thay vì tạm thời đưa vào giỏ hàng làm sai lệch số liệu giỏ hàng và trải nghiệm thanh toán. Tính năng Danh sách yêu thích giải quyết bài toán này mà không yêu cầu khách phải đăng nhập tài khoản.

## What Changes

- Thêm nút trái tim tương tác (`WishlistButton`) trên thẻ sản phẩm (`ProductCard`) và trang chi tiết sản phẩm (`/products/[slug]`) cho phép khách bấm để thêm hoặc bỏ thích sản phẩm (toggle).
- Hiển thị rõ ràng trạng thái "đã thích" về mặt thị giác (icon tim đầy màu đỏ/hồng) và hỗ trợ công nghệ trợ năng cho screen reader (`aria-pressed="true/false"`).
- Thêm biểu tượng trái tim kèm huy hiệu số lượng sản phẩm yêu thích (`WishlistBadge`) trên Header cạnh giỏ hàng, bấm vào sẽ điều hướng đến trang `/wishlist`.
- Thêm trang mới `/wishlist` liệt kê các sản phẩm đã lưu với giá và tồn kho luôn được cập nhật mới nhất từ catalog, kèm nút "Thêm vào giỏ" và nút "Bỏ thích".
- Hiển thị trạng thái rỗng (`EmptyState`) thân thiện khi chưa có sản phẩm nào trong danh sách kèm nút khám phá sản phẩm.
- Lưu trữ danh sách yêu thích ngay tại trình duyệt thông qua `localStorage["shoplite:wishlist"]`, tự động đồng bộ tức thì giữa các tab trình duyệt đang mở.
- Giới hạn danh sách tối đa 50 sản phẩm; hiển thị thông báo khi đạt giới hạn.
- Sản phẩm hết hàng (`stock === 0`) vẫn được lưu trong danh sách nhưng hiển thị nhãn "Hết hàng" và vô hiệu hóa nút "Thêm vào giỏ".

## Capabilities

### New Capabilities
- `wishlist`: Quản lý danh sách sản phẩm yêu thích phía client, lưu trữ localStorage, đồng bộ tab, hiển thị nút trái tim trên card/chi tiết và trang danh sách yêu thích `/wishlist`.

### Modified Capabilities
<!-- Không có capability nào bị sửa đổi yêu cầu spec vì đây là hệ thống khởi tạo -->

## Impact

- **Mã nguồn ảnh hưởng:**
  - Tạo mới feature `src/features/wishlist/` (types, reducer, store, hook, components).
  - Tạo mới route `src/app/wishlist/page.tsx`.
  - Cập nhật `src/features/catalog/components/product-card.tsx` để bổ sung nút trái tim.
  - Cập nhật `src/app/products/[slug]/page.tsx` (hoặc purchase panel) để bổ sung nút trái tim.
  - Cập nhật `src/components/layout/header.tsx` để hiển thị biểu tượng wishlist và badge số lượng.
- **API & Dependencies:** Không thêm API backend, không thêm dependency ngoài, không thêm database.

## Ngoài phạm vi

- Không lưu trữ danh sách yêu thích lên cơ sở dữ liệu server hoặc yêu cầu đăng nhập tài khoản người dùng.
- Không hỗ trợ chia sẻ danh sách yêu thích công khai qua URL hoặc mạng xã hội.
- Không gửi thông báo qua email hoặc push notification khi sản phẩm trong danh sách có hàng trở lại hoặc giảm giá.
