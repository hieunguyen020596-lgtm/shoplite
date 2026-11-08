## Context

Giỏ hàng đã có pattern phía client: `cart-reducer.ts` (hàm thuần) + `cart-store.ts` (localStorage + `useSyncExternalStore` + sự kiện `storage`) + `use-cart.ts`. Wishlist cũng là trạng thái chỉ tồn tại ở trình duyệt nên phải dùng lại đúng pattern này (ràng buộc trong `openspec/config.yaml`). Sản phẩm là dữ liệu tĩnh trong `src/data/products.ts`, truy cập qua `getProductById` (`catalog-service.ts`).

## Luồng tham chiếu

Luồng "Thêm vào giỏ" hiện có - wishlist lặp lại đúng hình dạng này:

```text
ProductCard ─► AddToCartButton.handleClick ─► useCart().addItem(product)
                                               │  (src/features/cart/use-cart.ts)
                                               ▼
                             cartStore.dispatch({type:"add"})        (cart-store.ts)
                                   │                      │
                       cartReducer(state, action)    writeToStorage → localStorage["shoplite:cart"]
                         (cart-reducer.ts: giới hạn       │
                          10 sp & tồn kho)                ▼
                                                   emit() → mọi component dùng useCart() render lại
                                                          → CartBadge, CartView, CheckoutForm
Tab khác: sự kiện "storage" → handleStorageEvent → đọc lại → emit()
Server render: getServerSnapshot = EMPTY_CART → useHydrated() = false → UI chưa hiện số/trạng thái
```

Wishlist: `WishlistButton` ─► `useWishlist().toggle(id)` ─► `wishlistStore.dispatch` ─► `wishlistReducer` ─► `localStorage["shoplite:wishlist"]` ─► `emit()` ─► `WishlistBadge`, `WishlistView`, mọi `WishlistButton`.

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
4. **Component `WishlistButton`** (`"use client"`): `aria-pressed`, `aria-label` đổi theo trạng thái ("Thêm … vào danh sách yêu thích" / "Bỏ … khỏi danh sách yêu thích"). Không dùng thêm chữ "Hết hàng" hay "Thêm vào giỏ" trong nhãn để không phá test hiện có của `ProductCard`.
   - **Trong `ProductCard`**: đặt nút tuyệt đối ở góc phải trên của ảnh, là **anh em** của `<Link>` ảnh (Link đang `aria-hidden` + `tabIndex={-1}`), tuyệt đối không lồng trong `<Link>` hay trong phần tử `aria-hidden`; `article` đã có `relative`.
   - **Trong trang chi tiết**: đặt ở `src/app/products/[slug]/page.tsx` cạnh tiêu đề/giá, **không** đặt trong `ProductPurchasePanel` vì panel trả về sớm khi `stock <= 0` (sản phẩm hết hàng vẫn phải thích được).
5. **`WishlistBadge`** trong `header.tsx`, cạnh `CartBadge`; dùng `hydrated` giống `CartBadge` để không nháy số khi hydrate. Số đếm chỉ tính các id còn tồn tại trong catalog.
6. **Trang `/wishlist`** là Server Component mỏng chỉ render `WishlistView` (client) - view đọc id từ store rồi tra `getProductById` để lấy dữ liệu mới nhất.
7. **Lưu `productId`, không lưu snapshot** (khác giỏ hàng). Giỏ hàng lưu snapshot (tên, giá, tồn kho) vì cần tính tiền và đã chốt giá lúc thêm; wishlist chỉ để xem lại nên giá/tồn kho phải luôn mới → lưu id, tra `getProductById` khi render. Hệ quả: id không còn trong catalog bị lọc ra ở tầng hiển thị/đếm (không xóa khỏi storage để tránh ghi bất ngờ).
8. **Hydration**: mọi UI phụ thuộc store (nút, badge, view) kiểm tra `hydrated` từ `useHydrated()`. Trước khi hydrate, nút ở trạng thái "chưa thích" nhưng không cho bấm sai lệch, `WishlistView` hiển thị skeleton thay vì trạng thái trống (tránh nháy "chưa có sản phẩm").
9. **Thông báo đầy 50**: `toggle` trả về kết quả `"added" | "removed" | "full"`; `WishlistButton` hiển thị thông báo `role="status"` ("Danh sách yêu thích đã đầy (tối đa 50 sản phẩm)") tự tắt sau vài giây, theo cách `AddToCartButton` dùng `justAdded` + timer.
10. **Thêm vào giỏ từ wishlist** tái sử dụng `AddToCartButton` (đã xử lý hết hàng và giới hạn 10), không viết lại logic.

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
- `src/app/products/[slug]/page.tsx` - thêm `WishlistButton` ở trang chi tiết (không sửa `ProductPurchasePanel`).
- `src/features/catalog/components/product-card.test.tsx` - thêm ca kiểm thử nút ♡.
- `src/components/layout/header.tsx` - thêm `WishlistBadge`.
- `README.md` - mô tả tính năng nếu cần.
