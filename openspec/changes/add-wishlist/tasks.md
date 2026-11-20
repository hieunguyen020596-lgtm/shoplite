# Tasks

## 1. Logic thuần

- [ ] 1.1 Tạo `src/features/wishlist/types.ts` gồm `WishlistState`, `WishlistAction`, `ToggleResult`. Kiểm tra: `npm run typecheck` pass.
- [ ] 1.2 Tạo `wishlist-reducer.ts` gồm:
  - `WISHLIST_MAX_ITEMS = 50`, `EMPTY_WISHLIST`
  - `wishlistReducer` với các action `toggle` / `remove` / `prune` / `clear`
  - `getToggleResult`, `sanitizeWishlist`, `isInWishlist`, `getWishlistCount`

  Kiểm tra: typecheck pass.

- [ ] 1.3 Viết `wishlist-reducer.test.ts`, cần cover:
  - toggle thêm rồi bỏ
  - bấm hai lần trở về như cũ
  - đủ 50 thì trả `"full"` và giữ nguyên tham chiếu state
  - bỏ thích khi đầy
  - `prune` loại id lạ
  - `sanitizeWishlist` với `null`, `{"foo":1}`, trùng lặp, hơn 50 mã
  - `sanitizeWishlist` với mảng lẫn phần tử lỗi (số, `null`, `""`): chỉ bỏ phần tử lỗi, giữ mã hợp lệ

  Kiểm tra: `npx vitest run src/features/wishlist` pass.

## 2. Store và hook

- [ ] 2.1 Tạo `wishlist-store.ts` theo pattern `cart-store.ts`:
  - key `shoplite:wishlist`
  - đọc qua `sanitizeWishlist`, có try/catch khi `JSON.parse`
  - nuốt lỗi khi ghi
  - nghe sự kiện `storage` để đồng bộ tab
  - có `getServerSnapshot` và `reset()`

  Kiểm tra: typecheck pass.

- [ ] 2.2 Tạo `use-wishlist.ts`, dùng `useSyncExternalStore` + `useHydrated`. Trả về `productIds`, `count`, `hydrated`, `isWishlisted`, `toggle`, `remove`, `prune`. Kiểm tra: typecheck pass.
- [ ] 2.3 Viết `wishlist-store.test.ts`, gọi `wishlistStore.reset()` trong `beforeEach`. Cần cover:
  - dispatch thì ghi `localStorage`
  - đọc lại khi khởi tạo
  - giá trị `abc` thì thành rỗng, không ném lỗi
  - giá trị `{"productIds":["p1",123,null]}` thì đọc ra `["p1"]`
  - sự kiện `storage` đúng key thì emit, sai key thì bỏ qua
  - `setItem` ném lỗi thì vẫn cập nhật state
  - trạng thái đầy không ghi lại

  Kiểm tra: vitest pass.

## 3. Nút trái tim trên thẻ và trang chi tiết

- [ ] 3.1 Tạo `components/wishlist-button.tsx` (`"use client"`):
  - variant `icon` (nút `size-10`, nền trắng mờ) và `full` (`Button` secondary "Yêu thích" / "Đã thích")
  - `aria-pressed` và `aria-label` theo trạng thái, có tên sản phẩm
  - icon `Heart` tô đầy khi đã thích
  - chưa hydrate thì hiện trạng thái chưa thích (giữ cờ `hydrated`, xem design mục "Vì sao vẫn dùng cờ hydrated")
  - `toggle` tính kết quả từ `wishlistStore.getSnapshot()` lúc bấm
  - `<span role="status">` luôn render sẵn và rỗng; khi đầy thì đặt text "Danh sách yêu thích đã đầy (tối đa 50 sản phẩm)", tự xóa sau khoảng 3 giây, dọn timer khi unmount

  Kiểm tra: render được trong component test ở 3.4.

- [ ] 3.2 Sửa `product-card.tsx`:
  - đặt `<WishlistButton variant="icon">` ở **cuối** `<article>` trong DOM (sau hàng nút mua)
  - hiển thị ở góc bằng `absolute top-2 right-2 z-10`
  - là anh em của link ảnh `aria-hidden`, không lồng trong `<Link>`

  Kiểm tra: khi chạy `npm run dev`, nút ♡ nằm ở góc trên phải của ảnh, và Tab đi theo thứ tự tên sản phẩm → Thêm vào giỏ → ♡.

- [ ] 3.3 Sửa `src/app/products/[slug]/page.tsx`: thêm `<WishlistButton variant="full">` **ngay dưới `ProductPurchasePanel`**. Kiểm tra: trang chi tiết của `p004` (hết hàng) vẫn có nút ♡.
- [ ] 3.4 Viết `wishlist-button.test.tsx` và cập nhật `product-card.test.tsx`, cần cover:
  - click đảo `aria-pressed` và đổi `aria-label`
  - nhấn Enter/Space trên nút cũng toggle
  - đã có 50 sản phẩm thì hiện thông báo đầy trong vùng `role="status"` (vùng này có sẵn từ lần render đầu) và không thêm
  - nút trái tim không nằm trong phần tử `a`, và đứng sau nút "Thêm vào giỏ" trong DOM
  - `product-card.test.tsx` gọi thêm `wishlistStore.reset()` trong `beforeEach`; các test cũ dùng `/Thêm vào giỏ/` vẫn pass

  Kiểm tra: `npx vitest run src/features/wishlist src/features/catalog` pass.

## 4. Badge ở header

- [ ] 4.1 Tạo `components/wishlist-badge.tsx` theo pattern `CartBadge`:
  - link tới `/wishlist`
  - chỉ hiện số khi `hydrated && count > 0`, `99+` khi lớn hơn 99
  - `aria-label` có số lượng
  - `data-testid="wishlist-count"`

  Kiểm tra: test ở 4.3.

- [ ] 4.2 Sửa `header.tsx`: đặt `WishlistBadge` cạnh `CartBadge` trong khối `ml-auto`, dùng `flex gap-1`. Kiểm tra ở 390px (DevTools mobile):
  - header không tràn ngang (không có thanh cuộn ngang)
  - cả 3 link nav, nút ♡ và giỏ hàng đều bấm được
  - nếu tràn thì giảm padding link nav ở mobile, không ẩn nút ♡
- [ ] 4.3 Viết `wishlist-badge.test.tsx`, cần cover:
  - rỗng thì không có số
  - 2 sản phẩm thì hiện "2" với nhãn đúng
  - lớn hơn 99 thì hiện "99+"

  Kiểm tra: vitest pass.

## 5. Trang /wishlist

- [ ] 5.1 Tạo `components/wishlist-view.tsx` (`"use client"`):
  - nhận `products`, lọc theo `productIds` và giữ thứ tự thêm vào
  - `prune` id không có trong catalog sau khi hydrate
  - chưa hydrate thì hiện skeleton
  - rỗng thì hiện `EmptyState` với link tới `/products`
  - mỗi dòng: ảnh, tên có link, `PriceTag`, `StockBadge`, `AddToCartButton`, nút "Bỏ thích"

  Kiểm tra: test ở 5.3.

- [ ] 5.2 Tạo `src/app/wishlist/page.tsx`: Server Component mỏng, có `metadata` tiêu đề "Danh sách yêu thích", truyền `getAllProducts()` vào `WishlistView`. Kiểm tra: `npm run typecheck` (gồm `next typegen`) pass và `/wishlist` mở được.
- [ ] 5.3 Viết `wishlist-view.test.tsx`, cần cover:
  - trạng thái trống có link khám phá
  - liệt kê đúng sản phẩm, giá lấy từ prop `products`
  - bỏ thích thì sản phẩm biến mất
  - thêm vào giỏ thì `cartStore` có sản phẩm và wishlist vẫn còn
  - sản phẩm `stock = 0` có nút "Hết hàng" bị disabled
  - id lạ bị loại khỏi `localStorage`

  Kiểm tra: vitest pass.

## 6. E2E và tài liệu

- [ ] 6.1 Viết `e2e/wishlist.spec.ts`, cần cover:
  - thích trên thẻ thì badge = 1
  - tải lại vẫn còn
  - vào `/wishlist` thêm vào giỏ thì badge giỏ tăng
  - bỏ thích thì hiện trạng thái trống
  - sửa `localStorage` thành `abc` rồi tải lại thì trang không lỗi

  Kiểm tra: `npm run test:e2e` pass, gồm cả `e2e/shopping-flow.spec.ts` cũ (không bị nút ♡ làm hỏng selector).

- [ ] 6.2 Cập nhật `AGENTS.md`: thêm dòng Wishlist vào bảng Codemap (`src/features/wishlist/`, các file chính) và ghi key `localStorage` `shoplite:wishlist` ở mục Tổng quan. Kiểm tra: đọc lại diff.

## 7. Kiểm tra tích hợp

- [ ] 7.1 Chạy `npm run format` và kiểm tra thủ công 9 kịch bản ở bài 3.4 trên `npm run dev`:
  - toggle, bỏ thích
  - tải lại, đồng bộ 2 tab
  - thêm vào giỏ từ `/wishlist`, sản phẩm hết hàng
  - dữ liệu hỏng, bàn phím, màn hình 390px

  Kiểm tra: tất cả đúng như mong đợi.

- [ ] 7.2 Chạy `npm run check` (lint + typecheck + test). Kiểm tra: pass toàn bộ.

## Workflow follow-up

- Chạy `/opsx:verify add-wishlist` và xử lý hết CRITICAL.
- Archive change bằng `/opsx:archive add-wishlist` sau khi review xong.
