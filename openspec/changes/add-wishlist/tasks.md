# Tasks

## 1. Logic thuần wishlist

- [ ] 1.1 Tạo `src/features/wishlist/types.ts` (`WishlistState`, `WishlistToggleResult`) — kiểm chứng: `npx tsc --noEmit` không lỗi
- [ ] 1.2 Tạo `src/features/wishlist/wishlist-reducer.ts` với `MAX_WISHLIST_ITEMS = 50`, `EMPTY_WISHLIST`, `toggleWishlist`, `removeFromWishlist`, `sanitizeWishlist`, `resolveWishlistProducts` theo design D2 — kiểm chứng: test 1.3 pass
- [ ] 1.3 Viết `src/features/wishlist/wishlist-reducer.test.ts`: thêm/bỏ, thêm sản phẩm hết hàng, thêm thứ 50 thành công, thứ 51 trả `full` và giữ nguyên tham chiếu state, bỏ khi đầy, sanitize (không phải object, `productIds` không phải mảng, phần tử sai kiểu/rỗng, trùng lặp, quá 50), resolve bỏ id không tồn tại và giữ thứ tự — kiểm chứng: `npx vitest run src/features/wishlist` pass

## 2. Store và hook

- [ ] 2.1 Tạo `src/features/wishlist/wishlist-store.ts` theo cấu trúc `cart-store.ts` (key `WISHLIST_STORAGE_KEY = "shoplite:wishlist"`, đọc bằng `sanitizeWishlist` trong `try/catch`, ghi nuốt lỗi, `storage` event, `toggle` trả kết quả, `remove`, `reset`) — kiểm chứng: test 2.3 pass
- [ ] 2.2 Tạo `src/features/wishlist/use-wishlist.ts` (`useSyncExternalStore` + `useHydrated`, trả `productIds`, `hydrated`, `isInWishlist`, `toggle`, `remove`) — kiểm chứng: dùng được trong test component nhóm 3
- [ ] 2.3 Viết `src/features/wishlist/wishlist-store.test.ts`: persist vào localStorage và đọc lại sau `reset()`, giá trị `abc` → rỗng không throw, `setItem` throw vẫn cập nhật state trong phiên, `full` không ghi/không emit, sự kiện `storage` cùng key cập nhật + emit, key khác bị bỏ qua, dữ liệu hỏng từ tab khác → rỗng; không đụng `shoplite:cart` — kiểm chứng: `npx vitest run src/features/wishlist` pass

## 3. Nút trái tim và badge header

- [ ] 3.1 Tạo `src/features/wishlist/components/wishlist-button.tsx` (`"use client"`, `aria-pressed`, `aria-label` theo tên sản phẩm, icon `Heart` tô đầy khi đã thích, thông báo đầy trong `role="status"` dùng `MAX_WISHLIST_ITEMS`, biến thể `overlay`/`inline`, chỉ hiện trạng thái thích khi `hydrated`) — kiểm chứng: test 3.5 pass
- [ ] 3.2 Tạo `src/features/wishlist/components/wishlist-badge.tsx` (link `/wishlist`, đếm sản phẩm còn trong catalog, ẩn số khi 0 hoặc chưa hydrated, `99+`, `aria-label` tiếng Việt) — kiểm chứng: test 3.5 pass
- [ ] 3.3 Sửa `src/features/catalog/components/product-card.tsx`: đặt `WishlistButton variant="overlay"` là anh em (không lồng) của `<Link aria-hidden>` ảnh, góc phải trên; sửa `src/app/products/[slug]/page.tsx` thêm `WishlistButton variant="inline"` — kiểm chứng: test 3.5 và xem thủ công trang `/products`, `/products/[slug]`
- [ ] 3.4 Sửa `src/components/layout/header.tsx`: thêm `WishlistBadge` trước `CartBadge` trong cùng nhóm `ml-auto flex` — kiểm chứng: xem thủ công ở viewport 390px không vỡ
- [ ] 3.5 Viết `wishlist-button.test.tsx`, `wishlist-badge.test.tsx` và cập nhật `src/features/catalog/components/product-card.test.tsx`: toggle bằng click và bàn phím (Enter/Space), `aria-pressed`/`aria-label` đổi đúng, thông báo đầy khi đã có 50 id, badge đếm đúng và bỏ id không tồn tại, nút trái tim trên thẻ không nằm trong link `aria-hidden` và bấm không điều hướng, giỏ hàng không đổi khi toggle — kiểm chứng: `npx vitest run src/features/wishlist src/features/catalog` pass

## 4. Trang /wishlist

- [ ] 4.1 Tạo `src/features/wishlist/components/wishlist-item-row.tsx` (ảnh, tên link `/products/{slug}`, `PriceTag`, `StockBadge`, nút "Bỏ thích", `AddToCartButton` dùng lại) — kiểm chứng: test 4.4 pass
- [ ] 4.2 Tạo `src/features/wishlist/components/wishlist-view.tsx` (skeleton `aria-busy` khi chưa hydrated, `EmptyState` + link `/products` khi không có sản phẩm hiển thị, danh sách theo thứ tự đã thích) — kiểm chứng: test 4.4 pass
- [ ] 4.3 Tạo `src/app/wishlist/page.tsx` (Server Component mỏng, `metadata.title = "Yêu thích"`, render `WishlistView`) — kiểm chứng: `npm run dev` mở `/wishlist` hiển thị đúng
- [ ] 4.4 Viết `src/features/wishlist/components/wishlist-view.test.tsx`: trạng thái trống, toàn id không tồn tại → trống, hiển thị giá/tồn kho từ catalog, bỏ thích làm sản phẩm biến mất, thêm vào giỏ vẫn giữ trong wishlist, sản phẩm hết hàng (p004) hiển thị "Hết hàng" và nút giỏ disabled, sản phẩm đã đạt tối đa trong giỏ → nút disabled — kiểm chứng: `npx vitest run src/features/wishlist` pass

## 5. Tích hợp và kiểm tra cuối

- [ ] 5.1 Tạo `e2e/wishlist.spec.ts`: thích "Bàn phím cơ KeyPro 75%" trên thẻ → badge = 1 → tải lại vẫn còn → vào `/wishlist` → "Thêm vào giỏ" làm tăng badge giỏ; bỏ thích → trạng thái trống — kiểm chứng: `npm run test:e2e` pass (gồm cả `shopping-flow.spec.ts`)
- [ ] 5.2 Chạy `npm run format` và kiểm tra thủ công 9 kịch bản của bài 3.4 (đồng bộ 2 tab, dữ liệu `abc`, bàn phím, 390px) — kiểm chứng: không có lỗi console, kịch bản đều đúng
- [ ] 5.3 Chạy `npm run check` (lint + typecheck + test) và đảm bảo pass

## Workflow follow-up

- Chạy `/opsx:verify add-wishlist`, xử lý hết CRITICAL trước khi archive.
- Archive bằng `/opsx:archive add-wishlist` để tạo `openspec/specs/wishlist/spec.md`.
