## 1. Lõi dữ liệu wishlist

- [ ] 1.1 Tạo `src/features/wishlist/types.ts` và `wishlist-reducer.ts` (toggle, remove, clear, `MAX_WISHLIST_ITEMS = 50`)
- [ ] 1.2 Tạo `wishlist-store.ts` (localStorage `shoplite:wishlist`, `storage` event, chịu dữ liệu hỏng)
- [ ] 1.3 Tạo `use-wishlist.ts` (có cờ `hydrated`)
- [ ] 1.4 Viết test reducer và store (toggle, giới hạn 50, dữ liệu hỏng, persist, đồng bộ tab)

## 2. Giao diện

- [ ] 2.1 Tạo `WishlistButton` (`aria-pressed`, `aria-label`) và gắn vào `ProductCard` và `ProductPurchasePanel`
- [ ] 2.2 Tạo `WishlistBadge` và gắn vào `header.tsx`
- [ ] 2.3 Tạo `WishlistView` và trang `src/app/wishlist/page.tsx` (trạng thái trống, hết hàng, thêm vào giỏ, bỏ thích)
- [ ] 2.4 Viết test component cho nút, trang wishlist và thông báo đầy 50

## 3. Hoàn tất

- [ ] 3.1 Chạy `npm run check`, `npm run format` và kiểm tra giao diện trên trình duyệt
