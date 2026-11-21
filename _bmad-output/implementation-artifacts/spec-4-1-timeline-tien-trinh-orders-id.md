---
title: 'Story 4.1: Timeline tiến trình 4 bước & Làm mới trạng thái tại /orders/[id]'
type: 'feature'
created: '2026-11-21'
status: 'done'
baseline_revision: 'd793ef612f45c49376493389c468d3c51af2abd0'
review_loop_iteration: 1
followup_review_recommended: false
context:
  - '{project-root}/README.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-shoplite-2026-11-21/ARCHITECTURE-SPINE.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
warnings: []
deferred:
  - 'refresh-status-button-transition-observation: React 19 useTransition settles synchronous mocked router.refresh() in one tick in JSDOM; real UI renders animate-spin / "Đang làm mới…" while RSC refreshes.'
  - 'order-detail-page-non-404-rethrow: giữ nguyên hành vi findOrder ném tiếp lỗi I/O ngoài ORDER_NOT_FOUND.'
---

# Story 4.1: Timeline tiến trình 4 bước & Làm mới trạng thái tại `/orders/[id]`

<intent-contract>

## Intent

**Problem:** Trang chi tiết đơn hàng `/orders/[id]` hiện mới hiển thị `OrderStatusBadge` tĩnh và nút `CancelOrderButton`, chưa có Timeline 4 bước cho khách theo dõi hành trình xử lý, chưa hiển thị tác nhân/lý do hủy đơn mới hoặc fallback an toàn cho đơn lịch sử thiếu `statusHistory`, chưa có nút làm mới trạng thái thủ công và chưa tự `router.refresh()` đồng bộ lại giao diện khi gặp lỗi `409` lúc hủy đơn.

**Approach:** Bổ sung `OrderProgressTimeline` (dùng `synthesizeStatusHistory` thuần từ `order-state-machine.ts`) và `RefreshStatusButton` (`router.refresh()`, `min-h-11`, không polling), nâng cấp `CancelOrderButton` xử lý `409`/lỗi mạng kèm `role="alert"` + `router.refresh()`, và ghép vào Server Component `src/app/orders/[id]/page.tsx` (`force-dynamic`, `max-w-4xl`) mà giữ nguyên banner `?placed=1`, `404` và hợp đồng `/orders`.

## Boundaries & Constraints

**Always:**
- Đơn chưa hủy (`pending`, `confirmed`, `shipping`, `delivered`) hiển thị đủ 4 bước (`Chờ xác nhận` → `Đã xác nhận` → `Đang giao` → `Đã giao`) kết hợp đồng thời màu + icon `lucide-react` + chữ tiếng Việt.
- Các bước đã có sự kiện hiển thị thời điểm `formatDateTime()` và ghi chú vận chuyển (`note`, nếu có). Đơn cũ thiếu `statusHistory` hiển thị đủ 4 bước với bước 1 dùng `createdAt`, bước hiện tại (nếu khác `pending`) dùng `updatedAt`, bước trung gian suy luận dùng `"—"`.
- Đơn hủy mới (có `statusHistory`) hiển thị hộp `rose-50/rose-200/rose-700` nêu tác nhân hủy (`"Khách hàng"` hoặc `"Cửa hàng"`), thời điểm và lý do hủy (lọc đúng event hủy `action: "transition" && status: "cancelled"`, không lấy nhầm ghi chú `"restock"`); đơn hủy cũ thiếu `statusHistory` hiện *"Đơn đã hủy"* kèm `updatedAt`.
- `RefreshStatusButton` (`min-h-11`) gọi `router.refresh()`, tuyệt đối không dùng polling 30 giây / SSE / WebSocket.
- `CancelOrderButton` chỉ hiện khi `order.status === "pending"`; khi nhận `409`, hiển thị `role="alert"` và tự gọi `router.refresh()`; khi đơn chuyển `confirmed` hoặc `shipping`, ẩn nút hủy và hiển thị *"Đơn hàng đã được xác nhận — vui lòng liên hệ cửa hàng nếu cần hỗ trợ."*
- Không tràn ngang ở `390px`; mọi nút chạm đạt `min-h-11`; giữ nguyên `e2e/shopping-flow.spec.ts` (`?placed=1`, `Tất cả đơn hàng`, `order-row`).

**Never:**
- Không dùng `setInterval` polling trên `/orders/[id]`.
- Không sửa đổi dữ liệu hay làm vỡ các đơn hàng cũ trong `storage/orders.json`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| :--- | :--- | :--- | :--- |
| Đơn chưa hủy (`statusHistory` đầy đủ) | `shipping` có `note` vận chuyển | Hiện 4 bước (`pending`/`confirmed` done `✓`, `shipping` current, `delivered` `"Chưa hoàn tất"`), đủ giờ + khung ghi chú vận chuyển | Không có |
| Đơn hủy mới (có `statusHistory`) | `cancelled` bởi `staff` kèm `note` / hoặc `customer` | Hộp `danger-soft` ghi rõ *"Cửa hàng"* / *"Khách hàng"*, giờ hủy và lý do (nếu có) | Không có |
| Đơn lịch sử thiếu `statusHistory` | `status: "delivered"` hoặc `"cancelled"` với `statusHistory: undefined` | Không lỗi runtime; `delivered` đủ 4 bước (`createdAt`, `"—"`, `"—"`, `updatedAt`); `cancelled` hiện *"Đơn đã hủy"* + `updatedAt` | Ngày lỗi → fallback an toàn |
| `RefreshStatusButton` | Bấm `"Làm mới trạng thái"` | Gọi `router.refresh()`, icon quay trong transition | Không có polling |
| `CancelOrderButton` xung đột `409` / đơn đã xác nhận | Bấm `"Xác nhận hủy"` nhận `409` hoặc tải trang ở `confirmed`/`shipping` | `409` → `role="alert"` + `router.refresh()`; `confirmed`/`shipping` → ẩn nút hủy + hiện *"Đơn hàng đã được xác nhận — vui lòng liên hệ cửa hàng nếu cần hỗ trợ."* | Lỗi mạng/`500` → `role="alert"` tiếng Việt |

</intent-contract>

## Code Map

- `src/features/orders/components/order-progress-timeline.tsx` -- *[Tạo mới]* Component Timeline 4 bước & hộp hủy dùng `synthesizeStatusHistory()`.
- `src/features/orders/components/refresh-status-button.tsx` -- *[Tạo mới]* Nút làm mới thủ công (`min-h-11`, `router.refresh()`).
- `src/features/orders/components/cancel-order-button.tsx` -- Cập nhật xử lý `409` (tự `router.refresh()`), lỗi mạng/`500` với `role="alert"`, `min-h-11` và chống bấm đúp.
- `src/app/orders/[id]/page.tsx` -- Gắn `OrderProgressTimeline`, `RefreshStatusButton`, ghi chú liên hệ cửa hàng khi `confirmed`/`shipping`, giữ nguyên `?placed=1` và `404`.
- `src/features/orders/components/order-detail-timeline.test.tsx` -- *[Tạo mới]* Kiểm thử toàn diện Story 4.1 (mọi trạng thái, legacy fallback, `RefreshStatusButton`, `CancelOrderButton` `409`, `OrderDetailPage`).

## Tasks & Acceptance

**Execution:**
- Cài đặt `OrderProgressTimeline`, `RefreshStatusButton`, cập nhật `CancelOrderButton` và `src/app/orders/[id]/page.tsx`.
- Viết unit/component/RSC tests đầy đủ trong `src/features/orders/components/order-detail-timeline.test.tsx`.

**Acceptance Criteria:**
- Pass 100% `npm run check` và giữ nguyên tương thích 100% với `e2e/shopping-flow.spec.ts`.

## Spec Change Log
- `2026-11-21`: Chặt chẽ hóa kiểm tra định dạng ISO-8601 trong `safeFormatDateTime`, bổ sung fallback `createdAt`/`updatedAt` cho `statusHistory` bán phần hoặc mốc giờ lỗi, thêm `max-w-full` cho badge ghi chú ở 390px, chống double-click bằng `useRef`/`submitted` ở `RefreshStatusButton` & `CancelOrderButton`, thêm phím `Escape` + `conflictDetected` và guard `customer`/`items` trong `OrderDetailPage`.

## Review Triage Log
- **Pass 1 (`bh-4-1`, `ec-4-1`, `vg-4-1`, `ia-4-1`):**
  - `[patch]` Siết `safeFormatDateTime` yêu cầu prefix `YYYY-MM-DD`, xử lý `statusHistory` thiếu bước/ngày lỗi bằng fallback `createdAt`/`updatedAt`, kiểm tra rõ `actor` `"staff"`/`"customer"`, và thêm `max-w-full` cho badge ghi chú.
  - `[patch]` Thêm `refreshingRef` trong `RefreshStatusButton`; khóa nút `conflictDetected`/`submitted` + `Escape` + quản lý focus khi bật/tắt khung xác nhận ở `CancelOrderButton`.
  - `[patch]` Bổ sung `min-h-11` cho link `"Tất cả đơn hàng"` và guard `items`/`customer` trên `OrderDetailPage`.
  - `[patch]` Mở rộng lên 20 tests trong `order-detail-timeline.test.tsx` (bao phủ `delivered`/`cancelled` page, legacy `pending`/`confirmed`/`shipping`, `409` fallback, non-JSON `500`, double-click refresh, `Escape`).
  - `[defer]` Ghi quan sát `useTransition` đồng bộ ở JSDOM và rethrow ngoài 404 vào `deferred`.

## Verification

**Commands:**
- `npm run check` (`eslint`, `next typegen && tsc --noEmit`, `vitest run`): 31 test files / 344 tests passed.

## Auto Run Result
- **Trạng thái:** `done` (Story 4.1 & Epic 4 hoàn tất).
- **Review loop:** Pass 1 hoàn tất, mọi phát hiện `patch` đã được sửa và xác minh sạch (`followup_review_recommended: false`).
