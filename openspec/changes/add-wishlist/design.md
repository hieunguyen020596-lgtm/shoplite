# Design

## Context

Xem `proposal.md` (Why) và `specs/wishlist/spec.md` (hành vi). Hiện trạng liên quan:

- Giỏ hàng đã có pattern client-side hoàn chỉnh: hàm thuần `cartReducer` (`src/features/cart/cart-reducer.ts`) → `cartStore` module-level (`cart-store.ts`: `readFromStorage` có type guard, `writeToStorage` nuốt lỗi, `emit()`, nghe sự kiện `storage` để đồng bộ tab, `reset()` cho test) → hook `useCart` (`use-cart.ts`) dùng `useSyncExternalStore` với `getServerSnapshot` trả state rỗng + cờ `hydrated` từ `useHydrated()` (`src/lib/use-hydrated.ts`).
- `ProductCard` (`src/features/catalog/components/product-card.tsx`) là Server-compatible component (không `"use client"`), ảnh bọc trong `<Link tabIndex={-1} aria-hidden>`, nút `AddToCartButton` là client island.
- `Header` (`src/components/layout/header.tsx`) là Server Component, chèn client island `CartBadge`.
- Catalog là dữ liệu tĩnh; `getProductById` thuần và đã có mặt trong bundle client (`catalog-filters.tsx` là client component import `catalog-service`).

## Goals / Non-Goals

**Goals:**

- Tái sử dụng đúng pattern giỏ hàng (hàm thuần + store + `useSyncExternalStore` + localStorage + sự kiện `storage`) để code wishlist dễ đọc với người đã biết giỏ hàng.
- Logic nghiệp vụ (toggle, giới hạn 50, làm sạch dữ liệu) nằm trong hàm thuần, test được không cần DOM.
- Không thay đổi hành vi/markup hiện có của giỏ hàng; thêm nút trái tim không phá cấu trúc trợ năng của `ProductCard`.

**Non-Goals:**

- Không tạo API route mới, không đụng server/`orders`.
- Không trừu tượng hóa chung "localStorage store" cho cả cart và wishlist (giữ phạm vi nhỏ; có thể refactor sau).

## Decisions

### D1. Lưu `productId[]` thay vì snapshot sản phẩm

Giá trị lưu: `{ productIds: string[] }` dưới key `WISHLIST_STORAGE_KEY = "shoplite:wishlist"`, thứ tự = thứ tự đã thích.

- **Vì sao:** spec yêu cầu giá và tồn kho luôn mới nhất; chỉ lưu id thì mỗi lần render tra `getProductById` lấy dữ liệu catalog hiện tại. Dữ liệu nhỏ, không cần migration khi schema `Product` đổi.
- **Thay thế đã cân nhắc:** snapshot như `CartItem` — hiển thị được khi catalog mất sản phẩm, nhưng giá/tồn kho cũ, phải đồng bộ lại; không phù hợp yêu cầu.
- **Hệ quả:** id không còn trong catalog bị lọc khi hiển thị (`resolveWishlistProducts`) và khi đếm badge; id vẫn được giữ trong storage (không tự xóa) để không ghi đè dữ liệu khi catalog tạm thiếu. Giới hạn 50 tính trên số id lưu.

### D2. Hàm thuần `wishlist-reducer.ts`

- `MAX_WISHLIST_ITEMS = 50`, `EMPTY_WISHLIST`.
- `toggleWishlist(state, productId): { state; result: "added" | "removed" | "full" }` — trả về kết quả để UI biết khi nào báo "đầy"; khi `full` trả nguyên `state` (cùng tham chiếu) để store bỏ qua ghi/emit.
- `sanitizeWishlist(value: unknown): WishlistState` — chấp nhận object có `productIds` là mảng; giữ phần tử là chuỗi khác rỗng, bỏ trùng (giữ lần xuất hiện đầu), cắt còn tối đa `MAX_WISHLIST_ITEMS`. Mọi trường hợp khác → `EMPTY_WISHLIST`.
- `resolveWishlistProducts(ids, findProduct = getProductById): Product[]` — bỏ id không tìm thấy.
- **Thay thế:** dùng reducer dạng `action` như `cartReducer`. Chọn hàm toggle trả `result` vì chỉ có 2 thao tác (toggle, remove) và UI cần tín hiệu "full"; `remove(state, id)` tách riêng cho nút bỏ thích ở trang `/wishlist`.

### D3. `wishlist-store.ts` sao chép cấu trúc `cart-store.ts`

`getSnapshot` / `getServerSnapshot` (→ `EMPTY_WISHLIST`) / `subscribe` (gắn listener `storage` khi có subscriber đầu tiên) / `toggle(id)` trả `result` / `remove(id)` / `reset()`. `readFromStorage` = `JSON.parse` trong `try/catch` + `sanitizeWishlist`; `writeToStorage` nuốt lỗi (chế độ ẩn danh). Sự kiện `storage` với key khác bị bỏ qua.

### D4. Hook `useWishlist()`

Trả `{ productIds, hydrated, isInWishlist(id), toggle(id), remove(id) }`. Dùng `useSyncExternalStore(wishlistStore.subscribe, getSnapshot, getServerSnapshot)` + `useHydrated()`. Component chỉ hiển thị trạng thái đã thích/badge khi `hydrated` → server render và lần hydrate đầu luôn là "chưa thích", tránh lỗi hydration mismatch và nháy (spec: "Trước khi đọc xong dữ liệu trình duyệt").

### D5. Nút trái tim `WishlistButton` (client)

- `<button type="button" aria-pressed={liked} aria-label={liked ? "Bỏ {tên} khỏi yêu thích" : "Thêm {tên} vào yêu thích"}>` với icon `Heart` của `lucide-react` (đã là dependency), `fill-current` + màu rose khi đã thích.
- Khi `toggle` trả `"full"`: hiển thị thông báo `"Danh sách yêu thích đã đầy (tối đa {MAX_WISHLIST_ITEMS} sản phẩm)"` trong vùng `role="status"` (aria-live) cạnh nút, tự ẩn sau vài giây (cùng kiểu timer như `AddToCartButton`). Không dùng `alert()`.
- Hai biến thể: `variant="overlay"` (nút tròn nhỏ góc phải ảnh trên thẻ) và `variant="inline"` (nút có chữ "Yêu thích"/"Đã thích" ở trang chi tiết).
- **Trợ năng trên `ProductCard`:** nút được đặt là **anh em** của `<Link aria-hidden>` bên trong một wrapper `relative`, định vị `absolute top-2 right-2` — **không** lồng trong `<Link>` (lồng phần tử tương tác trong link là HTML không hợp lệ, và `aria-hidden` sẽ ẩn nút khỏi screen reader, click còn kích hoạt điều hướng). Badge `-x%` vẫn ở góc trái nên không đè.

### D6. Badge header `WishlistBadge` (client)

Sao chép `CartBadge`: `<Link href="/wishlist">` + icon `Heart`, đếm `resolveWishlistProducts(productIds).length` (spec: chỉ đếm sản phẩm còn trong catalog), hiển thị khi `hydrated && count > 0`, `99+` khi lớn, `aria-label` "Yêu thích ({n} sản phẩm)". Header đặt `WishlistBadge` và `CartBadge` trong cùng `div.ml-auto flex gap-1` để màn 390px không vỡ (mỗi nút `size-10`).

### D7. Trang `/wishlist`

`src/app/wishlist/page.tsx` (Server Component mỏng, `metadata.title = "Yêu thích"`) render `<WishlistView />` (client). `WishlistView`:

- `!hydrated` → skeleton `aria-busy` (giống `CartView`).
- Không có sản phẩm hiển thị → `EmptyState` với link `/products` ("Khám phá sản phẩm").
- Ngược lại → danh sách `WishlistItemRow`: ảnh + tên link `/products/{slug}`, `PriceTag`, `StockBadge`, nút "Bỏ thích" (`remove`) và `AddToCartButton` dùng lại nguyên (đã xử lý "Hết hàng" disabled và giới hạn `getMaxQuantity`) → không hard-code quy tắc giỏ hàng.
- **Thay thế đã cân nhắc:** server page truyền `getAllProducts()` làm prop cho client. Không cần vì `catalog-service` đã có trong bundle client; tra trực tiếp `getProductById` giữ một nguồn sự thật cho cả badge và trang. Nếu sau này catalog chuyển lên DB, đổi `resolveWishlistProducts` sang gọi API (`GET /api/products?ids=`) mà không đổi spec.

### Danh sách file

**wishlist** (mới — `src/features/wishlist/`)

- Tạo `src/features/wishlist/types.ts` — `WishlistState`, `WishlistToggleResult`.
- Tạo `src/features/wishlist/wishlist-reducer.ts` (+ `wishlist-reducer.test.ts`).
- Tạo `src/features/wishlist/wishlist-store.ts` (+ `wishlist-store.test.ts`).
- Tạo `src/features/wishlist/use-wishlist.ts`.
- Tạo `src/features/wishlist/components/wishlist-button.tsx` (+ `wishlist-button.test.tsx`).
- Tạo `src/features/wishlist/components/wishlist-badge.tsx` (+ `wishlist-badge.test.tsx`).
- Tạo `src/features/wishlist/components/wishlist-view.tsx`, `wishlist-item-row.tsx` (+ `wishlist-view.test.tsx`).
- Tạo `src/app/wishlist/page.tsx`.

**catalog** (sửa)

- Sửa `src/features/catalog/components/product-card.tsx` — thêm `WishlistButton variant="overlay"` cạnh Link ảnh.
- Sửa `src/features/catalog/components/product-card.test.tsx` — test nút trái tim không nằm trong link ẩn.
- Sửa `src/app/products/[slug]/page.tsx` — thêm `WishlistButton variant="inline"` cạnh tiêu đề/khối mua.

**layout** (sửa)

- Sửa `src/components/layout/header.tsx` — thêm `WishlistBadge` trước `CartBadge`.

**e2e**

- Tạo `e2e/wishlist.spec.ts` — thích trên thẻ → badge → `/wishlist` → thêm vào giỏ; tải lại vẫn còn.

## Risks / Trade-offs

- [Id hết hiệu lực chiếm chỗ trong giới hạn 50] → hiếm (catalog tĩnh); khách có thể bỏ thích sản phẩm khác. Không tự dọn để tránh mất dữ liệu khi catalog tạm thiếu.
- [Hai tab thao tác gần như đồng thời ghi đè nhau] → chấp nhận như giỏ hàng (last-write-wins qua sự kiện `storage`).
- [Hydration mismatch nếu đọc localStorage khi render server] → `getServerSnapshot` trả rỗng + chỉ hiển thị trạng thái khi `hydrated`.
- [Header chật ở 390px khi thêm một icon] → hai icon `size-10` cạnh nhau, kiểm tra thủ công ở viewport 390px.
- [Nhân bản code store giữa cart và wishlist] → chấp nhận để giữ phạm vi; ghi nhận cơ hội refactor sau.

## Migration Plan

Không cần migration: key `localStorage` mới, chưa có dữ liệu cũ. Rollback = revert commit; key `shoplite:wishlist` còn sót trên trình duyệt không ảnh hưởng tính năng khác.

## Luồng tham chiếu (giỏ hàng — wishlist làm theo)

```text
ProductCard ─► AddToCartButton.handleClick ─► useCart().addItem(product)       (use-cart.ts)
                                               │
                                               ▼
                             cartStore.dispatch({type:"add"})                   (cart-store.ts)
                                   │                      │
                       cartReducer(state, action)    writeToStorage → localStorage["shoplite:cart"]
                       (giới hạn 10 & tồn kho)            │
                                                          ▼
                                       emit() → useSyncExternalStore → CartBadge, CartView...
Tab khác: sự kiện "storage" → handleStorageEvent → readFromStorage → emit()

Wishlist:
WishlistButton ─► useWishlist().toggle(id) ─► wishlistStore.toggle(id)
                                               ├─ toggleWishlist(state, id) → added | removed | full
                                               ├─ (khác "full") writeToStorage → localStorage["shoplite:wishlist"]
                                               └─ emit() → WishlistButton, WishlistBadge, WishlistView
```
