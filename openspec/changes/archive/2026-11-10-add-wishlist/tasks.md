## 1. Lõi dữ liệu wishlist

- [x] 1.1 Tạo `src/features/wishlist/types.ts` và `wishlist-reducer.ts` (toggle, remove, clear, `MAX_WISHLIST_ITEMS = 50`)
- [x] 1.2 Tạo `wishlist-store.ts` (localStorage `shoplite:wishlist`, `storage` event, chịu dữ liệu hỏng)
- [x] 1.3 Tạo `use-wishlist.ts` (có cờ `hydrated`)
- [x] 1.4 Viết test reducer và store (toggle, giới hạn 50, dữ liệu hỏng, persist, đồng bộ tab)

## 2. Giao diện

- [x] 2.1 Tạo `WishlistButton` (`aria-pressed`, `aria-label`, thông báo `role="status"` khi đầy) và gắn vào `ProductCard` (anh em của Link ảnh, không lồng trong `<Link>`) và trang `products/[slug]/page.tsx` (không đặt trong `ProductPurchasePanel`)
- [x] 2.2 Tạo `WishlistBadge` (dùng `hydrated`, chỉ đếm id còn trong catalog) và gắn vào `header.tsx`
- [x] 2.3 Tạo `WishlistView` và trang `src/app/wishlist/page.tsx` (skeleton khi chưa hydrate, trạng thái trống, hết hàng, thêm vào giỏ bằng `AddToCartButton`, bỏ thích, lọc id không còn trong catalog)
- [x] 2.4 Viết test component cho nút (kể cả sản phẩm hết hàng), trang wishlist, thông báo đầy 50 và đảm bảo test `ProductCard` hiện có vẫn pass

## 3. Hoàn tất

- [x] 3.1 Chạy `npm run check`, `npm run format` và kiểm tra giao diện trên trình duyệt
