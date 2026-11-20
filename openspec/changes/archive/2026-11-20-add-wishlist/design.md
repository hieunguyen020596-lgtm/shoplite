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
- **`toggle` tính kết quả từ store, không từ state lúc render:** gọi `getToggleResult(wishlistStore.getSnapshot(), id)` ngay khi bấm, rồi mới `dispatch`. Nếu dùng `productIds` lấy lúc render thì kết quả có thể đã cũ, ví dụ khi khách bấm nhanh hai lần hoặc tab khác vừa đổi danh sách.

### Vì sao vẫn dùng cờ `hydrated`

- `useSyncExternalStore` + `getServerSnapshot()` đã đảm bảo lần hydrate đầu dùng state rỗng, nên **riêng nó đã không lệch hydrate**.
- Ở `WishlistButton` / `WishlistBadge`, `hydrated` là lớp an toàn có chủ đích, thống nhất với `CartBadge`. Nó chặn lỗi lệch hydrate nếu sau này store bị đổi sang đọc `localStorage` ngay khi render. Không được bỏ đi để "tối ưu".
- Ở `WishlistView`, `hydrated` là **bắt buộc**: phải phân biệt "chưa đọc dữ liệu" (skeleton) với "danh sách thật sự rỗng" (EmptyState), giống `CartView`. Nếu không thì trang sẽ nháy trạng thái trống rồi mới hiện sản phẩm.

### 5. Components (`src/features/wishlist/components/`, đều `"use client"`)

- **`wishlist-button.tsx`**: props `product`, `variant: "icon" | "full"`.
  - Phần tử là `<button type="button">` với:
    - `aria-pressed={hydrated && liked}`
    - `aria-label` thay đổi theo trạng thái: "Thêm <tên> vào danh sách yêu thích" / "Bỏ <tên> khỏi danh sách yêu thích"
  - Icon `Heart` của `lucide-react`, có sẵn trong dự án. Khi đã thích thì tô đầy (`fill-current text-rose-600`).
  - Trước khi hydrate, luôn render trạng thái chưa thích để server và client khớp nhau.
  - Khi `toggle` trả `"full"`:
    - Vùng `<span role="status">` (aria-live polite) **luôn được render sẵn, ban đầu rỗng**. Khi đầy thì chỉ đặt text "Danh sách yêu thích đã đầy (tối đa 50 sản phẩm)" vào trong. Vùng live được thêm vào DOM cùng lúc với nội dung thường không được screen reader đọc.
    - Text tự xóa sau khoảng 3 giây, dùng timer giống `AddToCartButton` (dọn timer khi unmount).
  - Variant `icon`: nút `size-10` (40px, đủ vùng bấm trên mobile), nền trắng mờ, bo tròn. Variant `full`: `Button` `variant="secondary"` với chữ "Yêu thích" / "Đã thích".
- **`wishlist-badge.tsx`**: sao theo `CartBadge`.
  - `Link href="/wishlist"`, icon `Heart`.
  - Chỉ hiện số khi `hydrated && count > 0`. Không cần định dạng `99+` như giỏ hàng vì danh sách tối đa 50.
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

- **`ProductCard`:** `<WishlistButton variant="icon">` hiển thị ở góc `absolute top-5 right-5 z-10` của `<article>` (bù `p-3` của thẻ để thẳng hàng với badge giảm giá `top-2 left-2` trong ảnh). Nó là **anh em** của link ảnh (`aria-hidden`, `tabIndex={-1}`), không lồng bên trong.
  - `<article>` đã có `relative`. Badge giảm giá nằm ở `top-2 left-2`, nên không đè nhau. `z-10` giữ nút nằm trên ảnh khi ảnh phóng to lúc hover.
  - **Thứ tự trong DOM:** đặt nút ở **cuối** `<article>`, sau hàng nút mua. Thứ tự Tab khi đó là: tên sản phẩm → Thêm vào giỏ → ♡. Khách nghe tên sản phẩm trước khi gặp nút yêu thích. Vị trí hiển thị do `absolute` quyết định, không phụ thuộc thứ tự DOM.
- **Trang chi tiết:** `<WishlistButton variant="full">` đặt **ngay dưới `ProductPurchasePanel`**. Panel đã tự xử lý trường hợp hết hàng (hiện thông báo thay cho nút mua), còn nút ♡ vẫn hiện cho sản phẩm hết hàng (ví dụ `p004`).

### 7. Trang `/wishlist`

- `src/app/wishlist/page.tsx` là Server Component mỏng: `metadata = { title: "Danh sách yêu thích" }`, gọi `getAllProducts()` rồi truyền vào `WishlistView`.
- **Lý do:** catalog nhỏ (16 sản phẩm) và tĩnh, truyền xuống client đơn giản hơn tạo API mới.
- **Phương án đã cân nhắc:** gọi `GET /api/products?ids=` từ client. Bị loại vì thêm API, thêm trạng thái loading/lỗi, và vi phạm quy ước "trang gọi thẳng service".

### Luồng tham chiếu

**Luồng "Thêm vào giỏ" hiện có** (mẫu để wishlist làm theo, số dòng tại thời điểm explore):

```text
[Khách bấm "Thêm vào giỏ" trên thẻ sản phẩm]
        |
        v
ProductCard (server)                   catalog/components/product-card.tsx:46
        |
        v
AddToCartButton ("use client")         cart/components/add-to-cart-button.tsx
  :18 useCart()   :25 reachedLimit   :27 stock<=0 -> "Het hang"   :36 addItem()
        |
        v
useCart().addItem                      cart/use-cart.ts:22
  dispatch({type:"add", item: toCartItem(product)})   <- snapshot (cart-reducer.ts:21)
        |
        v
cartStore.dispatch                     cart/cart-store.ts:84
  :85 next = cartReducer(...)          (cart-reducer.ts:34, clamp min(stock, 10))
  :86 next === state ? -> return       (khong ghi, khong render)
  :88 writeToStorage -> localStorage["shoplite:cart"]
  :89 emit()
        |
        v
useSyncExternalStore (use-cart.ts:8) -> getSnapshot() ref moi -> render lai
  +--> CartBadge  cart-badge.tsx:9  showCount = hydrated && itemCount > 0
  +--> AddToCartButton / CartView / CheckoutForm

Tab khac: event "storage" -> handleStorageEvent (cart-store.ts:52)
          -> readFromStorage() -> emit()
Server / lan hydrate dau: getServerSnapshot() (cart-store.ts:67) = EMPTY_CART
```

**Luồng wishlist tương ứng** (khác biệt: chỉ lưu id, có thể trả `"full"`, có `prune`):

```text
WishlistButton.onClick
  -> useWishlist().toggle(id)
       result = getToggleResult(wishlistStore.getSnapshot(), id)   "added"|"removed"|"full"
       wishlistStore.dispatch({type:"toggle", productId: id})
         -> wishlistReducer (gioi han 50, bo trung; "full" -> tra state cu)
         -> next === state ? return
         -> writeToStorage -> localStorage["shoplite:wishlist"]  ({ productIds: [...] })
         -> emit() -> WishlistButton / WishlistBadge / WishlistView render lai
  -> result === "full" ? dat text vao <span role="status"> co san

Tab khac: event "storage" (key shoplite:wishlist) -> readFromStorage + sanitize -> emit()
/wishlist: sau hydrate, id khong co trong catalog -> prune(knownIds) -> ghi lai + emit()
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
- **[Header chật ở 390px khi thêm icon]** → Ước tính: logo 32px + 3 link nav + giỏ 40px + ♡ 40px + padding, tổng khoảng 360/390px, rất sát. Badge dùng cùng kích thước `size-10` với giỏ hàng, khoảng cách `gap-1`. Kiểm tra ở 390px. Nếu tràn thì giảm padding link nav ở mobile (`px-1.5`) hoặc gap của header, không ẩn nút ♡.
- **[Test hiện có bắt nhầm nút ♡]** → `aria-label` của nút ♡ bắt đầu bằng "Thêm <tên>...", trong khi test cũ dùng regex `/Thêm vào giỏ/`. Hai chuỗi không trùng nhau vì có tên sản phẩm chen giữa, nhưng phải chạy lại `product-card.test.tsx` và `e2e/shopping-flow.spec.ts` để chắc chắn. Test nào render `ProductCard` thì gọi thêm `wishlistStore.reset()` trong `beforeEach`.
- **[`prune` chạy trên dữ liệu tab khác đang ghi]** → `prune` chỉ loại id không có trong catalog tĩnh. Kết quả là như nhau dù tab nào chạy, nên không mất dữ liệu hợp lệ.
- **[Id không còn trong catalog vẫn được đếm ở badge cho tới khi khách mở `/wishlist`]** → Chấp nhận được: dữ liệu catalog tĩnh, id lạ chỉ xuất hiện khi sản phẩm bị gỡ khỏi `src/data/products.ts`. Ở các trang khác, id lạ không gây lỗi vì không có nút trái tim nào tham chiếu tới nó. `/wishlist` sẽ `prune` và đồng bộ lại badge.
- **[Truyền toàn bộ catalog xuống `/wishlist`]** → Hiện có 16 sản phẩm, chấp nhận được. Khi catalog lớn thì chuyển sang chỉ truyền các trường cần hiển thị.
- **[Hai store gần giống nhau]** → Chấp nhận lặp code có chủ đích (xem Non-Goals).
