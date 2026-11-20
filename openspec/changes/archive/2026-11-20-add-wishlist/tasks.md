# Tasks

## 1. Khởi tạo Wishlist Core Logic và Store

- [x] 1.1 Định nghĩa kiểu dữ liệu WishlistState và WishlistAction trong src/features/wishlist/types.ts
- [x] 1.2 Triển khai hàm thuần wishlistReducer với giới hạn tối đa 50 sản phẩm trong src/features/wishlist/wishlist-reducer.ts
- [x] 1.3 Triển khai wishlistStore với localStorage và đồng bộ đa tab qua sự kiện storage trong src/features/wishlist/wishlist-store.ts
- [x] 1.4 Tạo custom hook useWishlist kết nối store qua useSyncExternalStore và useHydrated trong src/features/wishlist/use-wishlist.ts
- [x] 1.5 Viết unit test cho wishlistReducer và wishlistStore trong src/features/wishlist/wishlist-reducer.test.ts và wishlist-store.test.ts

## 2. Giao diện người dùng và Tích hợp Wishlist

- [x] 2.1 Xây dựng component WishlistButton với icon trái tim, aria-pressed và aria-label trong src/features/wishlist/components/wishlist-button.tsx
- [x] 2.2 Xây dựng component WishlistBadge hiển thị số lượng sản phẩm trên header trong src/features/wishlist/components/wishlist-badge.tsx
- [x] 2.3 Xây dựng component WishlistView hiển thị danh sách sản phẩm yêu thích và nút chuyển giỏ hàng trong src/features/wishlist/components/wishlist-view.tsx
- [x] 2.4 Tạo route hiển thị trang danh sách yêu thích trong src/app/wishlist/page.tsx
- [x] 2.5 Tích hợp WishlistButton vào thẻ sản phẩm src/features/catalog/components/product-card.tsx và trang chi tiết src/app/products/[slug]/page.tsx
- [x] 2.6 Tích hợp WishlistBadge vào thanh điều hướng trong src/components/layout/header.tsx
- [x] 2.7 Viết component test cho WishlistButton và WishlistView trong src/features/wishlist/components/

## 3. Hoàn thiện và Kiểm thử tích hợp

- [x] 3.1 Kiểm thử các trường hợp biên: sản phẩm hết hàng, id không tồn tại trong catalog, localStorage lỗi và vượt quá 50 sản phẩm
- [x] 3.2 Chạy npm run check và kiểm tra giao diện trên trình duyệt
