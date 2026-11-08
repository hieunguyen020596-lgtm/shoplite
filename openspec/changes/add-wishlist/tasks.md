# Tasks

## 1. Setup & Core Logic

- [ ] 1.1 Khởi tạo kiểu dữ liệu `WishlistState`, `WishlistAction` trong `src/features/wishlist/types.ts` và xác nhận file hợp lệ qua typecheck
- [ ] 1.2 Viết pure reducer `wishlistReducer` xử lý các action toggle (thêm/bỏ thích), giới hạn tối đa 50 sản phẩm, và lọc bỏ id rỗng trong `src/features/wishlist/wishlist-reducer.ts`
- [ ] 1.3 Viết bộ unit test cho `wishlistReducer` bao phủ các trường hợp: thêm sản phẩm mới, bỏ thích sản phẩm đã có, chặn khi danh sách đạt 50 sản phẩm trong `src/features/wishlist/wishlist-reducer.test.ts` và chạy `npx vitest run src/features/wishlist/wishlist-reducer.test.ts`

## 2. Store & React Hook

- [ ] 2.1 Xây dựng `wishlistStore` với `localStorage["shoplite:wishlist"]`, xử lý an toàn khi JSON hỏng, hỗ trợ lắng nghe sự kiện `storage` để đồng bộ liên tab trong `src/features/wishlist/wishlist-store.ts`
- [ ] 2.2 Xây dựng custom hook `useWishlist` sử dụng `useSyncExternalStore` và cờ `useHydrated` để tránh mismatch SSR trong `src/features/wishlist/use-wishlist.ts`
- [ ] 2.3 Viết unit test cho `wishlistStore` và `useWishlist` kiểm thử lưu trữ, khôi phục dữ liệu, xử lý chuỗi hỏng trong `src/features/wishlist/wishlist-store.test.ts` và chạy `npx vitest run src/features/wishlist/wishlist-store.test.ts`

## 3. UI Components

- [ ] 3.1 Xây dựng component `WishlistButton` có biểu tượng trái tim (Lucide Heart), thuộc tính `aria-pressed`, `aria-label` động và hiệu ứng chuyển màu khi active trong `src/features/wishlist/components/wishlist-button.tsx`
- [ ] 3.2 Xây dựng component `WishlistBadge` hiển thị biểu tượng trái tim và số lượng sản phẩm trên Header, liên kết tới `/wishlist` trong `src/features/wishlist/components/wishlist-badge.tsx`
- [ ] 3.3 Viết component test cho `WishlistButton` và `WishlistBadge` (kiểm tra trạng thái aria, sự kiện click, ẩn hiện badge khi rỗng) trong `src/features/wishlist/components/wishlist-button.test.tsx` và chạy `npx vitest run src/features/wishlist/components/wishlist-button.test.tsx`

## 4. Wishlist Page & Routing

- [ ] 4.1 Xây dựng component `WishlistItemRow` hiển thị thông tin sản phẩm từ catalog, nút bỏ thích, nút thêm vào giỏ, và nhãn vô hiệu hóa khi hết hàng trong `src/features/wishlist/components/wishlist-item-row.tsx`
- [ ] 4.2 Xây dựng trang `/wishlist` (`src/app/wishlist/page.tsx`) hiển thị danh sách các sản phẩm đã thích và hiển thị `EmptyState` khi danh sách trống
- [ ] 4.3 Viết component test cho trang `/wishlist` và `WishlistItemRow` kiểm thử thêm vào giỏ, bỏ thích, trạng thái rỗng trong `src/app/wishlist/page.test.tsx` và chạy `npx vitest run src/app/wishlist/page.test.tsx`

## 5. Integration & Final Quality Gate

- [ ] 5.1 Tích hợp `WishlistButton` vào `ProductCard` (`src/features/catalog/components/product-card.tsx`) đặt ngoài thẻ `<Link>` và trang chi tiết sản phẩm (`src/app/products/[slug]/page.tsx`)
- [ ] 5.2 Tích hợp `WishlistBadge` vào thanh điều hướng Header (`src/components/layout/header.tsx`) đặt cạnh CartBadge
- [ ] 5.3 Thêm kịch bản E2E kiểm thử toàn diện luồng wishlist (thích từ card, xem badge, vào `/wishlist`, thêm vào giỏ) trong `e2e/wishlist-flow.spec.ts` và chạy `npx playwright test e2e/wishlist-flow.spec.ts`
- [ ] 5.4 Chạy `npm run check` và kiểm tra giao diện trên trình duyệt
