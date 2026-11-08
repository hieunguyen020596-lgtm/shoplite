## Context

Giỏ hàng đã có pattern phía client: `cart-reducer.ts` (hàm thuần) + `cart-store.ts` (localStorage + `useSyncExternalStore` + sự kiện `storage`) + `use-cart.ts`. Wishlist cũng là trạng thái chỉ tồn tại ở trình duyệt nên phải dùng lại đúng pattern này (ràng buộc trong `openspec/config.yaml`). Sản phẩm là dữ liệu tĩnh trong `src/data/products.ts`, truy cập qua `getProductById` (`catalog-service.ts`).

## Goals / Non-Goals

**Goals:**

- Toggle yêu thích từ `ProductCard` và trang chi tiết; badge trên header; trang `/wishlist`.
- Lưu bền, đồng bộ tab, chịu lỗi dữ liệu hỏng.

**Non-Goals:**

- Server, tài khoản, chia sẻ, thông báo có hàng lại (xem proposal - Ngoài phạm vi).

## Decisions

1. **Tách `features/wishlist/` song song `features/cart/`.** Gồm `wishlist-reducer.ts` (hàm thuần), `wishlist-store.ts`, `use-wishlist.ts`, `components/`. Lý do: đúng quy ước feature-based, dễ test độc lập, không làm phình cart.
2. **State là mảng `productIds: string[]`** theo thứ tự thêm, lưu ở khóa `shoplite:wishlist` dạng `{ "productIds": [...] }`. Hàm thuần: `toggle`, `remove`, `clear`; `MAX_WISHLIST_ITEMS = 50`. Khi `toggle` thêm mà đã đủ 50 thì trả về state cũ (cùng tham chiếu) và hook báo "đầy".
3. **Store dùng `useSyncExternalStore`** với `getServerSnapshot` trả danh sách rỗng, `readFromStorage` có `try/catch` + kiểm tra kiểu, lắng nghe sự kiện `storage` để đồng bộ tab.
4. **Component `WishlistButton`** (`"use client"`): `aria-pressed`, `aria-label` đổi theo trạng thái, đặt cạnh `AddToCartButton` trong `ProductCard` và trong `ProductPurchasePanel`.
5. **`WishlistBadge`** trong `header.tsx`, cạnh `CartBadge`.
6. **Trang `/wishlist`** là Server Component mỏng chỉ render `WishlistView` (client) - view đọc id từ store rồi tra `getProductById` để lấy dữ liệu mới nhất.

## Risks / Trade-offs

- Lưu chỉ `productId` nên giá/tồn kho luôn mới nhưng cần tra catalog ở client; đổi lại dữ liệu nhỏ và không bị lỗi thời.
- Thêm một khóa localStorage mới; không ảnh hưởng giỏ hàng.

## Danh sách file

**Tạo mới**

- `src/features/wishlist/types.ts`
- `src/features/wishlist/wishlist-reducer.ts` (+ `.test.ts`)
- `src/features/wishlist/wishlist-store.ts` (+ `.test.ts`)
- `src/features/wishlist/use-wishlist.ts`
- `src/features/wishlist/components/wishlist-button.tsx` (+ test)
- `src/features/wishlist/components/wishlist-badge.tsx`
- `src/features/wishlist/components/wishlist-view.tsx` (+ test)
- `src/app/wishlist/page.tsx`

**Sửa**

- `src/features/catalog/components/product-card.tsx` - thêm `WishlistButton`.
- `src/features/cart/components/product-purchase-panel.tsx` - thêm `WishlistButton` ở trang chi tiết.
- `src/components/layout/header.tsx` - thêm `WishlistBadge`.
- `README.md` - mô tả tính năng nếu cần.
