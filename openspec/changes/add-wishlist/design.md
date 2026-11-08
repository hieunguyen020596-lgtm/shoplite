# Design: Danh sách yêu thích (Wishlist)

## Context

ShopLite là ứng dụng Next.js 16 App Router không có cơ sở dữ liệu bên ngoài. Dữ liệu catalog sản phẩm là tĩnh trong `src/data/products.ts`. Hiện tại, tính năng giỏ hàng (`src/features/cart/`) đã triển khai rất thành công kiến trúc quản lý trạng thái trình duyệt với: hàm thuần reducer + store độc lập + `useSyncExternalStore` + `localStorage` + đồng bộ liên tab qua sự kiện `storage`. Tính năng wishlist sẽ kế thừa toàn bộ pattern này để bảo đảm tính nhất quán trong kiến trúc mã nguồn.

Xem thêm động lực tại `proposal.md`.

## Goals / Non-Goals

**Goals:**
- Tái sử dụng pattern kiến trúc `useSyncExternalStore` + `localStorage` của feature cart.
- Chỉ lưu trữ mảng `productId[]` trong `localStorage["shoplite:wishlist"]` để bảo đảm thông tin giá bán và số lượng tồn kho luôn được tra cứu tươi mới từ catalog.
- Ngăn ngừa lỗi hydration mismatch giữa server render và client storage bằng `useHydrated()`.
- Bảo đảm chuẩn accessibility: Nút trái tim có `aria-pressed`, `aria-label` động và không lồng trong thẻ `<Link>` của ảnh sản phẩm.
- Xử lý mượt mà các trường hợp biên: danh sách đầy 50 sản phẩm, sản phẩm hết hàng (`stock === 0`), và dữ liệu localStorage bị lỗi định dạng.

**Non-Goals:**
- Không tạo API backend hoặc cơ sở dữ liệu server để lưu trữ wishlist.
- Không xây dựng tính năng chia sẻ wishlist qua mạng xã hội hoặc gửi email thông báo tồn kho.

## Luồng tham chiếu từ Giỏ hàng (Cart Flow Reference)

Sơ đồ ASCII luồng hoạt động của Giỏ hàng mà Wishlist kế thừa trực tiếp:

```text
ProductCard (src/features/catalog/components/product-card.tsx:44)
    │
    ▼
AddToCartButton.handleClick (src/features/cart/components/add-to-cart-button.tsx:25)
    │
    ▼
useCart().addItem(product, 1) (src/features/cart/use-cart.ts:22)
    │
    ▼
cartStore.dispatch({ type: "add", item, quantity }) (src/features/cart/cart-store.ts:84)
    ├──► cartReducer(state, action) (src/features/cart/cart-reducer.ts:34)
    │      └── Kiểm tra giới hạn 10 sản phẩm (MAX_QUANTITY_PER_ITEM) & tồn kho (stock)
    ├──► writeToStorage(next) (src/features/cart/cart-store.ts:34)
    │      └── localStorage.setItem("shoplite:cart", JSON.stringify(next))
    └──► emit() (src/features/cart/cart-store.ts:47)
           └── Kích hoạt tất cả subscriber dùng useSyncExternalStore (use-cart.ts:8)
                 └── CartBadge, CartView, CheckoutSummary tự động re-render đồng bộ!

[Đồng bộ liên tab]:
Tab 1 thao tác ──► localStorage["shoplite:cart"] thay đổi
                         │
                         ▼ (sự kiện "storage" trên Window)
Tab 2: handleStorageEvent (src/features/cart/cart-store.ts:52) ──► readFromStorage() ──► emit() ──► Re-render!
```

### Các nguyên tắc kỹ thuật rút ra từ luồng giỏ hàng:
1. **useSyncExternalStore & getServerSnapshot**: `getServerSnapshot()` luôn trả về mảng rỗng `EMPTY_STATE` khi Next.js render trên server. Điều này ngăn ngừa hoàn toàn lỗi Hydration Mismatch vì server không truy cập được `window.localStorage`.
2. **Cờ hydrated (`useHydrated`)**: Badge số lượng chỉ render sau khi component đã mount trên client (`hydrated = true`), tránh hiện tượng nhấp nháy từ số 0 lên số lượng thật.
3. **So sánh lưu Snapshot vs. lưu Product ID**:
   - Giỏ hàng lưu snapshot (tên, giá) để cố định giao dịch mua sắm.
   - Ngược lại, **Wishlist chỉ lưu `productId: string[]`** để giá bán và số lượng tồn kho luôn phản ánh đúng thực tế khi truy cập lại danh sách sau thời gian dài.

## Decisions

### 1. Lưu mảng `productId[]` thay vì lưu snapshot sản phẩm
- **Quyết định:** Chỉ lưu trữ mảng các ID sản phẩm `string[]` (tối đa 50 ID) trong `localStorage["shoplite:wishlist"]`.
- **Lý do:** Khác với giỏ hàng cần chốt snapshot giá tại thời điểm thêm hàng, wishlist là nơi khách lưu trữ dài hạn để so sánh. Việc lưu `productId` giúp hệ thống luôn hiển thị giá mới nhất, số tồn kho mới nhất, và tự động bỏ qua nếu sản phẩm bị xóa khỏi catalog.
- **Phương án thay thế đã cân nhắc:** Lưu toàn bộ đối tượng `Product` trong localStorage $\rightarrow$ Bị loại bỏ vì gây dư thừa dung lượng localStorage và hiển thị sai giá khi catalog cập nhật.

### 2. Tái sử dụng pattern `useSyncExternalStore` và đồng bộ liên tab
- **Quyết định:** Tạo `wishlistStore` với các hàm `getSnapshot()`, `subscribe()`, `dispatch()` và listener `window.addEventListener("storage", handleStorageEvent)`.
- **Lý do:** Đây là chuẩn khuyến nghị của React 18/19 để đồng bộ dữ liệu ngoài React, ngăn lỗi tearing và tự động đồng bộ tức thì khi khách thao tác ở nhiều tab khác nhau.
- **Phương án thay thế đã cân nhắc:** Sử dụng React Context Provider bọc quanh app $\rightarrow$ Bị loại bỏ vì gây re-render không cần thiết toàn app và phức tạp hơn khi xử lý event storage từ tab khác.

### 3. Vị trí đặt component nút trái tim trên ProductCard
- **Quyết định:** Đặt `WishlistButton` ở góc trên bên phải của `ProductCard` với vị trí `absolute z-10`, nằm ngoài thẻ `<Link>` dẫn đến trang chi tiết.
- **Lý do:** Thẻ `<Link>` trong HTML5 không được chứa các phần tử tương tác như `<button>`. Việc đặt ngoài thẻ `<Link>` giúp click event không bị nổi bọt gây kích hoạt chuyển trang ngoài ý muốn và bảo đảm khả năng điều hướng bằng bàn phím (Tab/Enter).

### 4. Danh mục file thay đổi theo Codemap

#### File tạo mới:
- `src/features/wishlist/types.ts`: Định nghĩa kiểu dữ liệu `WishlistState`, `WishlistAction`.
- `src/features/wishlist/wishlist-reducer.ts`: Reducer hàm thuần kiểm soát việc toggle, giới hạn 50 sản phẩm.
- `src/features/wishlist/wishlist-store.ts`: Store đọc/ghi localStorage và phát sự kiện đồng bộ.
- `src/features/wishlist/use-wishlist.ts`: Custom hook cung cấp trạng thái và các action cho UI.
- `src/features/wishlist/components/wishlist-button.tsx`: Nút trái tim hiển thị trên thẻ và chi tiết sản phẩm.
- `src/features/wishlist/components/wishlist-badge.tsx`: Biểu tượng trái tim kèm badge số lượng trên Header.
- `src/features/wishlist/components/wishlist-item-row.tsx`: Dòng hiển thị sản phẩm trên trang `/wishlist`.
- `src/app/wishlist/page.tsx`: Route trang danh sách yêu thích.

#### File sửa đổi:
- `src/features/catalog/components/product-card.tsx`: Nhúng `WishlistButton`.
- `src/app/products/[slug]/page.tsx` (hoặc `product-purchase-panel.tsx`): Nhúng `WishlistButton`.
- `src/components/layout/header.tsx`: Nhúng `WishlistBadge` cạnh giỏ hàng.

## Risks / Trade-offs

- **[Risk] Hydration Mismatch:** Server render luôn thấy wishlist rỗng, trong khi client có thể đã lưu 5 sản phẩm trong localStorage $\rightarrow$ **Mitigation:** Dùng cờ `useHydrated()` giống như `cart-badge.tsx`, chỉ hiển thị số lượng badge và màu nút trái tim sau khi client đã hydrate xong.
- **[Risk] Dữ liệu localStorage bị hỏng:** Người dùng hoặc extension chỉnh sửa `localStorage["shoplite:wishlist"]` thành chuỗi JSON không hợp lệ $\rightarrow$ **Mitigation:** Khối `try/catch` an toàn trong hàm `readFromStorage()`, nếu parse lỗi sẽ trả về mảng rỗng `[]` và không làm crash ứng dụng.
- **[Risk] Sản phẩm trong wishlist không còn trong catalog:** Mã sản phẩm cũ bị gỡ bỏ $\rightarrow$ **Mitigation:** Khi trang `/wishlist` tải, lọc danh sách qua hàm `getProductById(id)` và tự động loại bỏ các id trả về `undefined`.
