---
title: 'Story 3.2: Giao diện hàng chờ /admin/orders, tồn kho giữ chỗ inline & thao tác đơn hàng'
type: 'feature'
created: '2026-11-21'
status: 'done'
baseline_revision: '912dd72f103fad189697d1719db5b06e41c66075'
review_loop_iteration: 1
followup_review_recommended: false
context:
  - '{project-root}/README.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-shoplite-2026-11-21/ARCHITECTURE-SPINE.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
warnings: []
deferred:
  - 'order-detail-badge-normalization: chuan hoa fallback chi tiet availableStockByProductId am/NaN va JSON null edge cases.'
  - 'cancel-dialog-raw-counter: giữ bộ đếm theo ký tự thực tế gõ `note.length` và validate `note.trim()` `1..200` ký tự khớp với test hành vi.'
---

# Story 3.2: Giao diện hàng chờ `/admin/orders`, tồn kho giữ chỗ inline & thao tác đơn hàng

<intent-contract>

## Intent

**Problem:** Sau Story 3.1, hệ thống đã có `/admin/login`, `AdminHeaderBar`, `OrderStatusBadge` chuẩn WCAG AA và `GET /api/admin/orders`, nhưng chưa có giao diện điều phối `/admin/orders` để nhân viên vận hành lọc/tìm kiếm đơn, phân biệt hàng đã giữ chỗ với tồn kho cho đơn mới, chuyển trạng thái 1 bước kèm khóa lạc quan, hủy đơn có lý do và xác nhận hàng hoàn từ `shipping` trên cả desktop lẫn mobile `390px`.

**Approach:** Triển khai Server Component `src/app/admin/orders/page.tsx` (`force-dynamic`) nạp snapshot ban đầu từ `orderService.listAdminOrders()` và truyền vào Client Component `src/features/orders/components/admin-orders-view.tsx` (gồm `AdminHeaderBar`, `OrderFilterTabs`, `AdminOrderSearchBar`, `AdminOrderCard`, `ReservedStockIndicator`, `RestockStatusBadge`, `CancelOrderDialog`), kèm component layout nhận diện `/admin/*` để không chồng Header công khai trên mobile `390px`.

## Boundaries & Constraints

**Always:**
- `/admin/orders` dùng danh sách thẻ 1 cột (`AdminOrderCard`), tuyệt đối không dùng `<table>` nhiều cột và không tràn ngang ở `390px`.
- Mọi nút thao tác chính, nút hủy đơn, nút `"Đăng xuất"`, tab lọc trạng thái, chip chọn nhanh, nút `"Xóa bộ lọc"` và input tìm kiếm/mã vận đơn đạt `min-h-11` (`>= 44px`).
- `OrderFilterTabs` và `AdminOrderSearchBar` đồng bộ 2 chiều với URL (`?status=...&q=...`), nút xóa nhanh (`✕`) xóa `?q=` mà giữ nguyên `?status=`, hiện 3 skeleton card khi tải và `EmptyState` + nút `"Xóa bộ lọc"` (`/admin/orders?status=all`) khi 0 kết quả.
- `ReservedStockIndicator` chỉ render trên đơn `pending`, `confirmed`, `shipping` (ẩn trên `delivered`, `cancelled`) với 2 vế tách biệt `✓ Đã giữ {quantity} cho đơn này · Còn cho đơn mới: {availableStock}` cùng 3 bậc màu + icon (`> 5` xanh `CheckCircle2`, `1–5` vàng cam `AlertTriangle`, `0` đỏ `XCircle`).
- Mọi `AdminOrderCard` chỉ có đúng 1 nút chuyển bước hợp lệ (`"Xác nhận đơn"`, `"Bàn giao giao hàng"` kèm ô ghi chú mã vận đơn tùy chọn `<= 200` ký tự khi `confirmed`, `"Đánh dấu đã giao"`), luôn gửi `expectedStatus: order.status`; không dùng `<select>` chuyển trạng thái tự do.
- `CancelOrderDialog` (`role="dialog"`, `aria-modal="true"`, `max-w-[440px]`) hiển thị 3 chip chọn nhanh điền vào `<textarea>` (không tự submit), bộ đếm `{len}/200`, validate `1..200` ký tự bằng `role="alert"` giữ nguyên nội dung, cảnh báo vàng `role="alert"` `"Hủy đơn đang giao sẽ không tự động cộng lại tồn kho"` khi `order.status === "shipping"`, đóng bằng `Escape` hoặc `"Quay lại"` và trả focus về nút mở.
- `RestockStatusBadge` + nút `"Xác nhận đã nhận hàng hoàn (+kho)"`: chỉ hiện nút khi `status === "cancelled" && inventoryRestocked === false`; thành công đổi sang `data-testid="restocked-badge"`; đơn hủy cũ (`inventoryRestocked === undefined`) ẩn cả nút lẫn badge.
- Xử lý lỗi đồng bộ: `401` → chuyển hướng `/admin/login?expired=1`; `409` → banner `role="alert"` *"Đơn hàng vừa được cập nhật bởi thao tác khác. Danh sách đã được làm mới."* + tự tải lại `GET /api/admin/orders`; `500`/offline → giữ nguyên dialog/form và hiện `role="alert"`.

**Never:**
- Không dùng `<select>` chọn trạng thái tự do hay thao tác ẩn chỉ hiện khi hover.
- Không gọi API sửa tồn kho trực tiếp từ UI ngoại trừ `POST /api/admin/orders/:id/restock` cho đơn hủy từ `shipping`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| :--- | :--- | :--- | :--- |
| Lọc & tìm kiếm + F5 | Chọn tab `pending`, nhập `q=minh` | URL cập nhật `?status=pending&q=minh`, hiện 3 skeleton khi fetch, hiển thị đúng đơn khớp + gợi ý FIFO | 0 kết quả → `EmptyState` + nút `"Xóa bộ lọc"` về `/admin/orders?status=all` |
| Tồn kho giữ chỗ inline | Đơn `pending` có 1 món (`availableStock = 0`) vs đơn `delivered` | Đơn `pending` hiện `✓ Đã giữ X cho đơn này` + `· Còn cho đơn mới: 0` (`XCircle` đỏ); đơn `delivered` / `cancelled` không render | Không có |
| Chuyển 1 bước & hủy đơn | Bấm `"Xác nhận đơn"` / `"Bàn giao giao hàng"` (+note) / `"Đánh dấu đã giao"` / `"Hủy đơn"` | `PATCH /api/admin/orders/:id/status` gửi `expectedStatus: order.status`; `CancelOrderDialog` có 3 chip, đếm `/200`, cảnh báo `shipping`, `Escape` đóng + trả focus | `400` inline; `409` → banner + auto reload; `401` → `/admin/login?expired=1` |
| Hoàn kho từ `shipping` | Đơn `cancelled` với `inventoryRestocked: false` vs `undefined` | `false` hiện `restock-pending-badge` + nút hoàn kho → bấm gọi `POST .../restock` đổi sang `restocked-badge`; `undefined` ẩn cả hai | `409` / `401` / `500` xử lý đồng bộ |

</intent-contract>

## Code Map

- `src/components/layout/storefront-chrome.tsx` & `src/app/layout.tsx` -- *[Tạo mới / Cập nhật]* Ẩn Header/Footer mặt tiền công khai trên các route `/admin/*` để không chồng sticky bar trên `390px`.
- `src/app/admin/orders/page.tsx` -- *[Tạo mới]* Server Component `force-dynamic` tải dữ liệu ban đầu qua `orderService.listAdminOrders()` và render `<AdminHeaderBar />` + `<AdminOrdersView />`.
- `src/features/orders/components/admin-orders-view.tsx` -- *[Tạo mới]* Tổ hợp `OrderFilterTabs`, `AdminOrderSearchBar`, `AdminOrderCard`, `ReservedStockIndicator`, `RestockStatusBadge`, `CancelOrderDialog` và state fetch/mutation/skeleton/empty/error.
- `src/features/orders/components/admin-orders-view.test.tsx` -- *[Tạo mới]* Kiểm thử toàn diện tương tác, accessibility (`Escape`, focus return, labels), skeleton, empty state, `ReservedStockIndicator`, `RestockStatusBadge`, `CancelOrderDialog`, `401`/`409`/`500` và `AdminOrdersPage`.

## Tasks & Acceptance

**Execution:**
- Tách Header/Footer mặt tiền qua wrapper `/admin/*`-aware để mặt tiền giữ nguyên 100% và `/admin/*` sạch sẽ trên mobile `390px`.
- Xây dựng `src/features/orders/components/admin-orders-view.tsx` và `src/app/admin/orders/page.tsx`.
- Viết component & server-page tests (`admin-orders-view.test.tsx`), chạy Prettier + `npm run check`.

**Acceptance Criteria:**
- Pass 100% `npm run check` (`eslint`, `next typegen && tsc --noEmit`, `vitest run`).

## Spec Change Log
- `2026-11-21`: Bổ sung bảo vệ `pathname: string | null` tại `NavLinks`, giữ landmark `<main>` trên `/admin/login`, đồng bộ ngược `initialData`/`initialStatus`/`initialQuery` cho điều hướng Back/Forward, cô lập `shippingNotes` và hoàn thiện focus-trap + cuộn mobile `390px` trong `CancelOrderDialog`.

## Review Triage Log
- **Pass 1 (`bh-3-2`, `ec-3-2`, `vg-3-2`, `ia-3-2`):**
  - `[patch]` Loại bỏ race condition giữa debounce/in-flight `GET` và mutation `PATCH`/`POST`; lọc đơn rời tab trạng thái khi chuyển bước và cập nhật đồng bộ `availableStockByProductId` tại client sau khi hủy/hoàn kho.
  - `[patch]` Thêm đồng bộ prop khi Back/Forward (`prevSyncedProps` + `useEffect`), bỏ qua debounce chỉ có khoảng trắng, nâng `shippingNotesByOrderId` lên cấp `AdminOrdersView`.
  - `[patch]` Khắc phục xung đột utility Tailwind v4 trên nút `"Hủy đơn"` và `"Xóa bộ lọc"`, ẩn nút `✕` mặc định WebKit search, bổ sung `<main>` cho `/admin/login` và xử lý an toàn `pathname === null` ở `StorefrontChrome` + `NavLinks`.
  - `[patch]` Hoàn thiện focus trap `Tab`/`Shift+Tab`, focus ban đầu, khóa `Escape` khi đang gửi qua ref trong `useEffect`, cuộn modal mobile `390px`, bảo vệ dữ liệu đơn thiếu/lệch ngày và lọc tách ghi chú `"restock"` khỏi `"Lý do hủy:"`.
  - `[patch]` Mở rộng kiểm thử lên 21 tests trong `admin-orders-view.test.tsx` (bao phủ `401`/`409`/`500`/offline trên mọi API, hủy debounce, giới hạn 200/201 ký tự, focus trap, `EmptyState` titles, `min-h-11`, `AdminOrdersPage` & `StorefrontChrome`/`NavLinks`).
  - `[defer]` Ghi các biên kiểm phòng thủ phụ vào `deferred`.

## Verification

**Commands:**
- `npm run check` (`eslint`, `next typegen && tsc --noEmit`, `vitest run`): 30 test files / 324 tests passed.

## Auto Run Result
- **Trạng thái:** `done` (Story 3.2 & Epic 3 hoàn tất).
- **Review loop:** Pass 1 hoàn tất, mọi phát hiện `patch` đã được sửa và xác minh sạch (`followup_review_recommended: false`).
