# Design: Danh sách yêu thích (Wishlist)

## Context

Xem proposal.md và specs/wishlist/spec.md để biết động lực và yêu cầu chi tiết.
Hệ thống ShopLite hoạt động hoàn toàn không có database phía server; giỏ hàng hiện tại lưu trong `localStorage` và sử dụng mô hình store đồng bộ qua `useSyncExternalStore`. Tính năng wishlist sẽ kế thừa kiến trúc này.

## Goals / Non-Goals

**Goals:**

- Triển khai danh sách yêu thích client-side ổn định, hiệu năng cao, không gây hydration mismatch.
- Đồng bộ tức thì giữa các tab trình duyệt khi danh sách yêu thích thay đổi.
- Tuân thủ chuẩn accessibility (ARIA attributes, keyboard navigation).
- Đảm bảo giá và số lượng tồn kho của sản phẩm trong wishlist luôn phản ánh trạng thái mới nhất từ catalog.

**Non-Goals:**

- Không lưu trữ dữ liệu wishlist lên máy chủ hoặc đồng bộ qua tài khoản.
- Không triển khai chia sẻ wishlist.

## Luồng tham chiếu

Luồng tham chiếu từ kiến trúc giỏ hàng hiện tại của ShopLite:

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
```

Wishlist sẽ áp dụng tương tự:

```text
ProductCard / DetailPage ─► WishlistButton.handleClick ─► useWishlist().toggleItem(productId)
                                                           │  (src/features/wishlist/use-wishlist.ts)
                                                           ▼
                                         wishlistStore.dispatch({type:"toggle", productId})
                                               │                      │
                                   wishlistReducer(state, action)  writeToStorage → localStorage["shoplite:wishlist"]
                                     (giới hạn tối đa 50 sp)          │
                                                                      ▼
                                                               emit() → WishlistBadge, WishlistButton, WishlistView render lại
Tab khác: sự kiện "storage" → handleStorageEvent → đọc lại → emit()
```

## Decisions

### 1. Chỉ lưu `productId` thay vì snapshot sản phẩm

- **Quyết định**: Wishlist chỉ lưu danh sách các `productId` (`string[]`) trong `localStorage["shoplite:wishlist"]`.
- **Lý do**: Khác với giỏ hàng cần chốt giá và snapshot tại thời điểm mua, wishlist là danh sách lưu trữ dài hạn; giá và số lượng tồn kho phải luôn được cập nhật mới nhất từ `catalog-service` khi khách hàng xem lại. Ngoài ra, việc chỉ lưu id giúp giảm kích thước lưu trữ và tránh lệch dữ liệu với catalog. Khi hiển thị ở trang `/wishlist`, dữ liệu sản phẩm đầy đủ được lấy qua `getProductById(id)`.
- **Phương án thay thế**: Lưu toàn bộ snapshot sản phẩm như giỏ hàng. Nhược điểm: giá và tồn kho bị lỗi thời nếu dữ liệu catalog thay đổi.

### 2. Mô hình Store + Reducer + useSyncExternalStore

- **Quyết định**: Tái sử dụng pattern đã được chuẩn hóa ở feature cart:
  - `wishlistReducer` là pure function nhận state và action (`toggle`, `add`, `remove`, `clear`).
  - `wishlistStore` đóng gói subscription, persist `localStorage`, và lắng nghe `window.addEventListener("storage", ...)` để đồng bộ giữa các tab.
  - `useWishlist` cung cấp API tiện lợi cho UI component qua `useSyncExternalStore`.
- **Lý do**: Đảm bảo tính nhất quán trong toàn bộ codebase, dễ kiểm thử đơn vị độc lập và hoạt động trơn tru với React 19 concurrent rendering.

### 3. Tránh Hydration Mismatch

- **Quyết định**: `wishlistStore.getServerSnapshot()` luôn trả về state rỗng. Hook `useWishlist` sử dụng `useHydrated()` để kiểm soát việc render huy hiệu trên Header và trạng thái nút trái tim.
- **Lý do**: Ngăn chặn lỗi hydration warning giữa HTML render trên server (chưa có `localStorage`) và client sau khi nạp dữ liệu.

### 4. Accessibility và cấu trúc DOM

- **Quyết định**: Nút trái tim trên `ProductCard` được đặt ở vị trí `absolute top-2 right-2 z-10` và hoàn toàn nằm ngoài thẻ `<Link>`.
- **Lý do**: Không vi phạm quy chuẩn HTML (không lồng phần tử tương tác bên trong thẻ anchor), tránh bị ảnh hưởng bởi thuộc tính `aria-hidden` của link ảnh, và cho phép screen reader đọc đúng trạng thái thông qua `aria-pressed` cùng `aria-label`.

## Danh sách file thay đổi và tạo mới (Codemap)

Bám sát Codemap trong AGENTS.md:

### File tạo mới

- `src/features/wishlist/types.ts`: Định nghĩa `WishlistState`, `WishlistAction`.
- `src/features/wishlist/wishlist-reducer.ts`: Hàm thuần `wishlistReducer`, hằng số `MAX_WISHLIST_ITEMS = 50`, `EMPTY_WISHLIST`.
- `src/features/wishlist/wishlist-store.ts`: Store client-side, quản lý subscriber, đọc/ghi `localStorage["shoplite:wishlist"]`, đồng bộ sự kiện `storage`.
- `src/features/wishlist/use-wishlist.ts`: Hook React tích hợp `useSyncExternalStore` và `useHydrated`.
- `src/features/wishlist/components/wishlist-button.tsx`: Nút bấm hình trái tim toggle trạng thái yêu thích với đầy đủ ARIA attributes.
- `src/features/wishlist/components/wishlist-badge.tsx`: Biểu tượng trái tim kèm huy hiệu số lượng trên thanh Header.
- `src/features/wishlist/components/wishlist-view.tsx`: Giao diện danh sách sản phẩm yêu thích, hỗ trợ xóa và thêm vào giỏ.
- `src/app/wishlist/page.tsx`: Route mỏng cho trang `/wishlist`.
- `src/features/wishlist/wishlist-reducer.test.ts`: Unit tests cho reducer và hàm tiện ích.
- `src/features/wishlist/wishlist-store.test.ts`: Unit tests cho store và localStorage.
- `src/features/wishlist/components/wishlist-button.test.tsx`: Component tests cho nút trái tim.
- `src/features/wishlist/components/wishlist-view.test.tsx`: Component tests cho trang danh sách yêu thích.

### File chỉnh sửa

- `src/features/catalog/components/product-card.tsx`: Đặt `WishlistButton` ở góc trên phải thẻ sản phẩm.
- `src/app/products/[slug]/page.tsx`: Thêm `WishlistButton` vào giao diện chi tiết sản phẩm.
- `src/components/layout/header.tsx`: Thêm `WishlistBadge` cạnh `CartBadge`.

## Risks / Trade-offs

- **[Dữ liệu localStorage bị hỏng hoặc định dạng sai]** → _Mitigation_: Sử dụng hàm kiểm tra type guard `isWishlistState(value)`; nếu dữ liệu không hợp lệ tự động fallback về `EMPTY_WISHLIST`.
- **[Sản phẩm trong wishlist đã bị xóa khỏi catalog tĩnh]** → _Mitigation_: Khi render ở `WishlistView`, lọc bỏ các ID không tìm thấy qua `getProductById(id)`.
- **[Khách hàng thêm quá 50 sản phẩm]** → _Mitigation_: Chặn thêm mới ở cấp độ reducer và hiển thị thông báo alert/toast khi chạm ngưỡng 50 sản phẩm.
