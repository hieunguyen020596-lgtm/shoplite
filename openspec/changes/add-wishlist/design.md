# Design

## Context

Xem `proposal.md` (Why) và `specs/wishlist/spec.md` (hành vi). Hiện trạng liên quan:

- Giỏ hàng đã có pattern client-side hoàn chỉnh: hàm thuần `cartReducer` (`src/features/cart/cart-reducer.ts`) → `cartStore` module-level (`cart-store.ts`: `readFromStorage` có type guard, `writeToStorage` nuốt lỗi, `emit()`, nghe sự kiện `storage` để đồng bộ tab, `reset()` cho test) → hook `useCart` (`use-cart.ts`) dùng `useSyncExternalStore` với `getServerSnapshot` trả state rỗng + cờ `hydrated` từ `useHydrated()` (`src/lib/use-hydrated.ts`).
- `ProductCard` (`src/features/catalog/components/product-card.tsx`) là Server-compatible component (không `"use client"`), ảnh bọc trong `<Link tabIndex={-1} aria-hidden>`, nút `AddToCartButton` là client island.
- `Header` (`src/components/layout/header.tsx`) là Server Component, chèn client island `CartBadge`.
- Catalog là dữ liệu tĩnh trong `src/data/products.ts`. Client component duy nhất đang import `catalog-service` là `catalog-filters.tsx`, chỉ có trên trang `/products` — dữ liệu catalog **không** nằm trong bundle chung của mọi trang. Quy ước AGENTS.md: Server Component gọi thẳng service, client nhận dữ liệu qua prop/API.

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
- **Hệ quả:** id không còn trong catalog bị lọc khi hiển thị (`resolveWishlistProducts`) và khi đếm badge. Bình thường id vẫn được giữ trong storage (không tự xóa khi chỉ đọc). Riêng khi khách thích sản phẩm mới mà danh sách đã đủ `MAX_WISHLIST_ITEMS`, các id không còn trong catalog được dọn trước rồi mới xét giới hạn — tránh tình huống khách thấy 49 sản phẩm mà vẫn bị báo "đầy" (spec: "Danh sách đầy nhưng có sản phẩm không còn trong catalog").

### D2. Hàm thuần `wishlist-reducer.ts`

- `MAX_WISHLIST_ITEMS = 50`, `EMPTY_WISHLIST`.
- `toggleWishlist(state, productId, knownIds?: ReadonlySet<string>): { state; result: "added" | "removed" | "full" }` — trả về kết quả để UI biết khi nào báo "đầy". Khi thêm mà đã đầy và có `knownIds`, lọc bỏ id không thuộc `knownIds` trước khi xét giới hạn. Khi vẫn `full` trả nguyên `state` (cùng tham chiếu) để store bỏ qua ghi/emit.
- `sanitizeWishlist(value: unknown): WishlistState` — chấp nhận object có `productIds` là mảng; giữ phần tử là chuỗi khác rỗng, bỏ trùng (giữ lần xuất hiện đầu), cắt còn tối đa `MAX_WISHLIST_ITEMS`. Mọi trường hợp khác → `EMPTY_WISHLIST`.
- `resolveWishlistProducts(ids, products: Product[]): Product[]` — tra theo map id → sản phẩm, giữ thứ tự `ids`, bỏ id không tìm thấy. Nhận danh sách sản phẩm qua tham số (không import `catalog-service`) để file dùng được ở client mà không kéo dữ liệu catalog vào bundle.
- **Thay thế:** dùng reducer dạng `action` như `cartReducer`. Chọn hàm toggle trả `result` vì chỉ có 2 thao tác (toggle, remove) và UI cần tín hiệu "full"; `remove(state, id)` tách riêng cho nút bỏ thích ở trang `/wishlist`.

### D3. `wishlist-store.ts` sao chép cấu trúc `cart-store.ts`

`getSnapshot` / `getServerSnapshot` (→ `EMPTY_WISHLIST`) / `subscribe` (gắn listener `storage` khi có subscriber đầu tiên) / `toggle(id, knownIds?)` trả `result` / `remove(id)` / `reset()`. `readFromStorage` = `JSON.parse` trong `try/catch` + `sanitizeWishlist`; `writeToStorage` nuốt lỗi (chế độ ẩn danh). Sự kiện `storage` với key khác bị bỏ qua.

### D4. Hook `useWishlist()`

Trả `{ productIds, hydrated, isInWishlist(id), toggle(id, knownIds?), remove(id) }`. Dùng `useSyncExternalStore(wishlistStore.subscribe, getSnapshot, getServerSnapshot)` + `useHydrated()`.

Phân vai cho đúng (rút ra từ explore luồng giỏ hàng):

- **`getServerSnapshot` → `EMPTY_WISHLIST`** là thứ chống hydration mismatch: khi render server và trong lần hydrate đầu, React dùng snapshot này nên HTML hai phía giống nhau; sau hydrate React tự render lại với dữ liệu `localStorage`.
- **`hydrated`** dùng để phân biệt "chưa đọc dữ liệu" với "danh sách rỗng thật". Bắt buộc ở `WishlistView` (skeleton thay vì nháy trạng thái trống). Ở `WishlistButton`/`WishlistBadge` nó chỉ là phòng hờ (giống `CartBadge`) — giữ để đọc code nhất quán.

### D5. Nút trái tim `WishlistButton` (client)

- `<button type="button" aria-pressed={liked} aria-label={`Yêu thích ${product.name}`}>` với icon `Heart` của `lucide-react` (đã là dependency), `fill-current` + màu rose khi đã thích, có `focus-visible:ring`.
- **Nhãn cố định, chỉ đổi `aria-pressed`** (theo mẫu toggle button của WAI-ARIA). **Thay thế đã cân nhắc:** đổi nhãn "Thêm…/Bỏ…" theo trạng thái — bị loại vì kết hợp với `aria-pressed` khiến screen reader đọc mâu thuẫn ("Bỏ … khỏi yêu thích, đã bấm").
- **Tránh va chạm selector:** nhãn không được chứa "Thêm vào giỏ" hay "Giỏ hàng" — Playwright mặc định khớp tên theo chuỗi con (`e2e/shopping-flow.spec.ts:18,22,61`).
- Nhận prop `knownIds` (truyền từ server, xem D6/D7) để chuyển cho `toggle` khi thêm.
- Khi `toggle` trả `"full"`: đặt nội dung `"Danh sách yêu thích đã đầy (tối đa {MAX_WISHLIST_ITEMS} sản phẩm)"` vào vùng `role="status"` cạnh nút, tự xóa nội dung sau vài giây (timer như `AddToCartButton`). **Vùng `role="status"` luôn được render (rỗng)** — nếu chỉ chèn vào DOM cùng lúc với nội dung, nhiều screen reader bỏ qua thông báo. Không dùng `alert()`.
- Hai biến thể: `variant="overlay"` (nút tròn nhỏ góc phải ảnh trên thẻ) và `variant="inline"` (nút có chữ hiển thị "Yêu thích"/"Đã thích" ở trang chi tiết; chữ hiển thị chỉ là phụ, tên trợ năng vẫn theo `aria-label` cố định). Ở trang chi tiết, nút đặt **ngoài** `data-testid="purchase-panel"` (cạnh tiêu đề/khối giá) để không ảnh hưởng selector e2e hiện có.
- **Trợ năng trên `ProductCard`:** nút được đặt là **anh em** của `<Link aria-hidden>` bên trong một wrapper `relative`, định vị `absolute top-2 right-2` — **không** lồng trong `<Link>` (lồng phần tử tương tác trong link là HTML không hợp lệ, và `aria-hidden` sẽ ẩn nút khỏi screen reader, click còn kích hoạt điều hướng). Badge `-x%` vẫn ở góc trái nên không đè.

### D6. Badge header `WishlistBadge` (client)

Sao chép `CartBadge`: `<Link href="/wishlist">` + icon `Heart`. Nhận prop `knownProductIds: string[]` do `Header` (Server Component) truyền vào từ `getAllProducts().map((p) => p.id)`; đếm `productIds.filter((id) => known.has(id)).length` (spec: chỉ đếm sản phẩm còn trong catalog). **Thay thế đã cân nhắc:** badge tự import `catalog-service` — bị loại vì header có trên mọi trang, sẽ đưa toàn bộ `data/products.ts` vào bundle chung và trái quy ước Server Component gọi service. hiển thị khi `hydrated && count > 0`, `99+` khi lớn, `aria-label` "Yêu thích ({n} sản phẩm)". Header đặt `WishlistBadge` và `CartBadge` trong cùng `div.ml-auto flex gap-1` để màn 390px không vỡ (mỗi nút `size-10`).

### D7. Trang `/wishlist`

`src/app/wishlist/page.tsx` (Server Component mỏng, `metadata.title = "Yêu thích"`) gọi `getAllProducts()` và render `<WishlistView products={products} />` (client). Dữ liệu chỉ nằm trong RSC payload của trang này, giá/tồn kho là của catalog tại lúc request. `WishlistView`:

- `!hydrated` → skeleton `aria-busy` (giống `CartView`).
- Không có sản phẩm hiển thị → `EmptyState` với link `/products` ("Khám phá sản phẩm").
- Ngược lại → danh sách `WishlistItemRow`: ảnh + tên link `/products/{slug}`, `PriceTag`, `StockBadge`, nút "Bỏ thích" (`remove`) và `AddToCartButton` dùng lại nguyên (đã xử lý "Hết hàng" disabled và giới hạn `getMaxQuantity`) → không hard-code quy tắc giỏ hàng.
- **Thay thế đã cân nhắc:** (a) `WishlistView` tự import `getProductById` — bị loại (kéo catalog vào bundle client, trái quy ước); (b) client gọi API `GET /api/products?ids=` — thêm route và trạng thái loading/lỗi không cần thiết khi catalog còn tĩnh. Nếu sau này catalog lên DB và lớn, chuyển sang (b) mà không đổi spec.

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

- Sửa `src/features/catalog/components/product-card.tsx` — thêm `WishlistButton variant="overlay"` cạnh (không lồng trong) Link ảnh. `ProductCard` không phải client component (chỉ được render từ Server Component qua `ProductGrid`) nên truyền `knownIds={getAllProducts().map((p) => p.id)}` trực tiếp; không thêm `"use client"` vào `ProductCard`. Trang chi tiết làm tương tự.
- Sửa `src/features/catalog/components/product-card.test.tsx` — test nút trái tim không nằm trong link ẩn.
- Sửa `src/app/products/[slug]/page.tsx` — thêm `WishlistButton variant="inline"` cạnh tiêu đề/khối mua.

**layout** (sửa)

- Sửa `src/components/layout/header.tsx` — gọi `getAllProducts()` lấy id, thêm `<WishlistBadge knownProductIds={...} />` trước `CartBadge` trong cùng nhóm `ml-auto flex`.

**e2e**

- Tạo `e2e/wishlist.spec.ts` — thích trên thẻ → badge → `/wishlist` → thêm vào giỏ; tải lại vẫn còn.

## Risks / Trade-offs

- [Id hết hiệu lực chiếm chỗ trong giới hạn 50] → dọn id không còn trong catalog ngay lúc thêm mà danh sách đầy (D1, D2); lúc chỉ đọc thì không dọn để không mất dữ liệu khi catalog tạm thiếu.
- [Truyền `knownIds` (16 id, sau này có thể nhiều hơn) qua prop ở mọi trang] → chỉ là mảng chuỗi ngắn, rẻ hơn nhiều so với đưa cả catalog vào bundle; nếu catalog lớn thì chuyển sang API.
- [Hai tab thao tác gần như đồng thời ghi đè nhau] → chấp nhận như giỏ hàng (last-write-wins qua sự kiện `storage`).
- [Hydration mismatch nếu đọc localStorage khi render server] → `getServerSnapshot` trả rỗng (đây là cơ chế chính); `hydrated` dùng để hiện skeleton thay vì nháy trạng thái trống.
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

## Bài học từ explore (luồng giỏ hàng)

- `cartStore.dispatch` bỏ qua ghi/emit khi reducer trả **cùng tham chiếu** (`cart-store.ts:86`) → `toggleWishlist` phải trả nguyên `state` khi `full` để giữ tính chất này.
- Sự kiện `storage` không bắn ở chính tab vừa ghi, chỉ ở tab khác; listener chỉ gắn khi có subscriber (`cart-store.ts:73`).
- `getServerSnapshot` mới là cơ chế chống hydration mismatch; `hydrated` chủ yếu để phân biệt "đang tải" với "rỗng" (quan trọng ở `CartView`, phòng hờ ở `CartBadge`).
- Giỏ lưu snapshot nên `getCartSubtotal` dùng giá cũ trong khi server tính lại theo catalog → wishlist chọn lưu id để tránh lệch giá.
