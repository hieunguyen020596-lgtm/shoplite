# Design

## Context

Lý do làm tính năng: xem proposal.md, mục Why. Hành vi cần đạt: xem `specs/wishlist/spec.md`.

Hiện trạng liên quan:

- **Giỏ hàng** dùng pattern state chỉ có ở trình duyệt:
  - `cart-reducer.ts` là hàm thuần.
  - `cart-store.ts`: `cartStore` có `getSnapshot` / `getServerSnapshot` / `subscribe` / `dispatch`, đọc/ghi `localStorage["shoplite:cart"]`, nghe sự kiện `storage` để đồng bộ tab.
  - `use-cart.ts` dùng `useSyncExternalStore` và `useHydrated()` (`src/lib/use-hydrated.ts`).
- **`ProductCard`** (`src/features/catalog/components/product-card.tsx`) là Server Component. Link ảnh có `aria-hidden` + `tabIndex={-1}`, nên phần tử tương tác không được đặt trong link đó.
- **Trang chi tiết** `src/app/products/[slug]/page.tsx` là Server Component, đã nhúng client component `ProductPurchasePanel`.
- **Header** (`src/components/layout/header.tsx`) đặt `CartBadge` trong khối `ml-auto`.
- **Catalog** là dữ liệu tĩnh (16 sản phẩm) qua `getAllProducts()` / `getProductById()` trong `catalog-service.ts`.
- **Các component tái sử dụng được:** `AddToCartButton` (đã xử lý hết hàng và giới hạn giỏ), `PriceTag`, `StockBadge`, `ProductImage`, `EmptyState`, `Button`.

## Goals / Non-Goals

**Goals:**

- Dùng lại đúng pattern giỏ hàng: hàm thuần + store + `useSyncExternalStore` + `localStorage` + sự kiện `storage` + `useHydrated`.
- Logic thuần (toggle, giới hạn, làm sạch dữ liệu) test được mà không cần DOM.
- Không thêm dependency, API hay route handler nào.

**Non-Goals:**

- Không gộp chung store với giỏ hàng, không tạo store generic dùng chung. Hai store giống nhau về cấu trúc nhưng tách riêng cho dễ đọc. Có thể refactor sau khi có store thứ ba.
- Không có toast/notification toàn cục. Thông báo "đầy" hiển thị cục bộ ở nút.

## Decisions

### 1. Chỉ lưu `productId`, không lưu snapshot sản phẩm

- **Cách làm:** trạng thái lưu là `{ productIds: string[] }`, theo thứ tự thêm vào.
- **Lý do:** spec yêu cầu giá và tồn kho luôn mới nhất. Snapshot như giỏ hàng sẽ hiển thị giá cũ.
- **Phương án đã cân nhắc:**
  - Lưu snapshot rồi làm mới khi hiển thị: phức tạp hơn, dữ liệu thừa.
  - Lưu snapshot như giỏ hàng: sai yêu cầu.

### 2. Logic thuần `wishlist-reducer.ts`

- **Hằng số:** `WISHLIST_MAX_ITEMS = 50`, `EMPTY_WISHLIST`.
- **`wishlistReducer(state, action)`**, với các action:
  - `toggle { productId }`
  - `remove { productId }`
  - `prune { knownIds }`: loại id không còn trong catalog
  - `clear`
- **`getToggleResult(state, productId)`** trả về `"added" | "removed" | "full"`, để UI biết khi nào báo "đầy".
  - Khi đầy, reducer trả lại **đúng state cũ** (cùng tham chiếu), giống `cartReducer`, để store không ghi lại và không emit.
- **`sanitizeWishlist(value: unknown)`:** làm sạch theo từng phần tử, không bỏ cả danh sách chỉ vì một phần tử lỗi:
  - `value` không phải object hoặc không có mảng `productIds` (ví dụ `null`, `{"foo":1}`) → `EMPTY_WISHLIST`.
  - Trong mảng: bỏ phần tử không phải chuỗi hoặc là chuỗi rỗng, bỏ trùng (giữ lần xuất hiện đầu), cắt còn 50 mã đầu.
  - Hàm không bao giờ ném lỗi. `JSON.parse` lỗi thì `readFromStorage` bắt và trả `EMPTY_WISHLIST`.
  - Mã không còn trong catalog **không** xử lý ở đây (store không biết catalog), mà xử lý bằng action `prune` (xem mục 5).
- **Hàm tiện ích:** `isInWishlist(state, id)`, `getWishlistCount(state)`.

### 3. Store `wishlist-store.ts`

- **Cấu trúc:** sao theo `cart-store.ts`. Key `WISHLIST_STORAGE_KEY = "shoplite:wishlist"`.
- **Đọc dữ liệu:** `readFromStorage` bọc `JSON.parse` trong try/catch rồi qua `sanitizeWishlist`.
- **Ghi dữ liệu:** `writeToStorage` nuốt lỗi khi trình duyệt chặn lưu trữ.
- **Đồng bộ tab:** `handleStorageEvent` lọc theo key.
- **Server render:** `getServerSnapshot()` trả `EMPTY_WISHLIST`.
- **Trong test:** `reset()` buộc đọc lại `localStorage`.

### 4. Hook `use-wishlist.ts`

- **Cách đọc state:** `useSyncExternalStore(wishlistStore.subscribe, getSnapshot, getServerSnapshot)` + `useHydrated()`.
- **Trả về:** `productIds`, `count`, `hydrated`, `isWishlisted(id)`, `toggle(id) → ToggleResult`, `remove(id)`, `prune(knownIds)`.

### 5. Components (`src/features/wishlist/components/`, đều `"use client"`)

- **`wishlist-button.tsx`**: props `product`, `variant: "icon" | "full"`.
  - Phần tử là `<button type="button">` với:
    - `aria-pressed={hydrated && liked}`
    - `aria-label` thay đổi theo trạng thái: "Thêm <tên> vào danh sách yêu thích" / "Bỏ <tên> khỏi danh sách yêu thích"
  - Icon `Heart` của `lucide-react`, có sẵn trong dự án. Khi đã thích thì tô đầy (`fill-current text-rose-600`).
  - Trước khi hydrate, luôn render trạng thái chưa thích để server và client khớp nhau.
  - Khi `toggle` trả `"full"`:
    - hiện thông báo nhỏ trong một vùng `role="status"` (aria-live polite)
    - tự ẩn sau khoảng 3 giây, dùng timer giống `AddToCartButton`
- **`wishlist-badge.tsx`**: sao theo `CartBadge`.
  - `Link href="/wishlist"`, icon `Heart`.
  - Chỉ hiện số khi `hydrated && count > 0`, `>99` thì hiện `99+`.
  - `aria-label` là "Danh sách yêu thích (n sản phẩm)" hoặc "Danh sách yêu thích".
  - `data-testid="wishlist-count"`.
- **`wishlist-view.tsx`**: nhận `products: Product[]` (toàn bộ catalog) từ server.
  - Lọc theo `productIds`, giữ thứ tự thêm vào.
  - Sau khi hydrate, nếu có id không khớp catalog thì gọi `prune(knownIds)` trong `useEffect`, để badge khớp với danh sách hiển thị.
  - Chưa hydrate thì hiện skeleton. Danh sách rỗng thì hiện `EmptyState` với link "Khám phá sản phẩm" tới `/products`.
  - Mỗi dòng gồm:
    - `ProductImage` và tên sản phẩm có link tới trang chi tiết
    - `PriceTag` và `StockBadge`
    - `AddToCartButton`, đã tự hiển thị "Hết hàng" và vô hiệu hóa khi `stock = 0`
    - `WishlistButton` dạng full ("Bỏ thích")

### 6. Vị trí nút trái tim

- **`ProductCard`:** `<WishlistButton variant="icon">` đặt `absolute top-2 right-2` trong `<article>`, là **anh em** của link ảnh chứ không lồng bên trong.
  - `<article>` đã có `relative`.
  - Badge giảm giá nằm ở `top-2 left-2`, nên không đè nhau.
- **Trang chi tiết:** `<WishlistButton variant="full">` đặt cạnh `RatingStars` / `StockBadge`, hoặc dưới `ProductPurchasePanel`. Nút vẫn hiện với sản phẩm hết hàng.

### 7. Trang `/wishlist`

- `src/app/wishlist/page.tsx` là Server Component mỏng: `metadata = { title: "Danh sách yêu thích" }`, gọi `getAllProducts()` rồi truyền vào `WishlistView`.
- **Lý do:** catalog nhỏ (16 sản phẩm) và tĩnh, truyền xuống client đơn giản hơn tạo API mới.
- **Phương án đã cân nhắc:** gọi `GET /api/products?ids=` từ client. Bị loại vì thêm API, thêm trạng thái loading/lỗi, và vi phạm quy ước "trang gọi thẳng service".

### Luồng tham chiếu

```text
WishlistButton.onClick ─► useWishlist().toggle(id) ─► wishlistStore.dispatch({type:"toggle"})
                                                         │
                                       wishlistReducer (giới hạn 50, bỏ trùng)
                                                         │ state mới?
                                         writeToStorage → localStorage["shoplite:wishlist"]
                                                         ▼
                                    emit() → WishlistButton / WishlistBadge / WishlistView render lại
Tab khác: sự kiện "storage" (key shoplite:wishlist) → readFromStorage + sanitize → emit()
```

### File tạo mới / file sửa

| Loại | File                                                                           |
| ---- | ------------------------------------------------------------------------------ |
| Mới  | `src/features/wishlist/types.ts`                                               |
| Mới  | `src/features/wishlist/wishlist-reducer.ts` + `wishlist-reducer.test.ts`       |
| Mới  | `src/features/wishlist/wishlist-store.ts` + `wishlist-store.test.ts`           |
| Mới  | `src/features/wishlist/use-wishlist.ts`                                        |
| Mới  | `src/features/wishlist/components/wishlist-button.tsx` + `.test.tsx`           |
| Mới  | `src/features/wishlist/components/wishlist-badge.tsx` + `.test.tsx`            |
| Mới  | `src/features/wishlist/components/wishlist-view.tsx` + `.test.tsx`             |
| Mới  | `src/app/wishlist/page.tsx`                                                    |
| Mới  | `e2e/wishlist.spec.ts`                                                         |
| Sửa  | `src/features/catalog/components/product-card.tsx` (+ `product-card.test.tsx`) |
| Sửa  | `src/app/products/[slug]/page.tsx`                                             |
| Sửa  | `src/components/layout/header.tsx`                                             |
| Sửa  | `AGENTS.md` (Codemap thêm dòng Wishlist)                                       |

## Risks / Trade-offs

- **[Lệch hydrate ở nút và badge]** → Trước khi `hydrated` thì luôn render trạng thái chưa thích / không có số. Có component test cho trạng thái ban đầu.
- **[Header chật ở 390px khi thêm icon]** → Badge dùng cùng kích thước `size-10` với giỏ hàng, khoảng cách `gap-1`. Kiểm tra thủ công ở 390px.
- **[`prune` chạy trên dữ liệu tab khác đang ghi]** → `prune` chỉ loại id không có trong catalog tĩnh. Kết quả là như nhau dù tab nào chạy, nên không mất dữ liệu hợp lệ.
- **[Id không còn trong catalog vẫn được đếm ở badge cho tới khi khách mở `/wishlist`]** → Chấp nhận được: dữ liệu catalog tĩnh, id lạ chỉ xuất hiện khi sản phẩm bị gỡ khỏi `src/data/products.ts`. Ở các trang khác, id lạ không gây lỗi vì không có nút trái tim nào tham chiếu tới nó. `/wishlist` sẽ `prune` và đồng bộ lại badge.
- **[Truyền toàn bộ catalog xuống `/wishlist`]** → Hiện có 16 sản phẩm, chấp nhận được. Khi catalog lớn thì chuyển sang chỉ truyền các trường cần hiển thị.
- **[Hai store gần giống nhau]** → Chấp nhận lặp code có chủ đích (xem Non-Goals).
