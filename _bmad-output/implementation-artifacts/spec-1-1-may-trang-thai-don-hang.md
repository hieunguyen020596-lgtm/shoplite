---
title: 'Story 1.1 - Máy trạng thái đơn hàng'
type: 'feature'
created: '2026-11-20'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '18f5635671f387f57386c5d6dc3913ca1c418b19'
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-shoplite-ops-2026-11-20/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Đơn hàng chỉ đổi trạng thái được ở một chỗ (`cancelOrder` tự gán `status: "cancelled"`), không có quy tắc chung nào ngăn chuyển nhảy cóc, quay ngược hay chuyển ra khỏi trạng thái cuối - nên chưa thể mở thao tác cho nhân viên một cách an toàn.

**Approach:** Thêm hàm thuần `transitionOrder` + bảng `ALLOWED_TRANSITIONS` là chỗ duy nhất tạo đơn có trạng thái mới, phân biệt người thực hiện `staff`/`customer`; chuyển `cancelOrder` hiện có sang dùng hàm này mà không đổi hành vi khách thấy.

## Boundaries & Constraints

**Always:**
- Đúng 5 bước hợp lệ cho `staff`: `pending → confirmed`, `pending → cancelled`, `confirmed → shipping`, `confirmed → cancelled`, `shipping → delivered`. `customer` chỉ được `pending → cancelled`.
- Từ chối bằng `OrderError("INVALID_STATUS_TRANSITION", message, { currentStatus: <trạng thái hiện tại> })`.
- Hành vi khách giữ nguyên hoàn toàn: khách bị từ chối thì message vẫn là "Chỉ có thể hủy đơn hàng đang ở trạng thái Chờ xác nhận" (nút Hủy đơn của khách hiển thị nguyên văn message server); nhân viên bị từ chối thì message dạng `Không thể chuyển đơn từ "Đã giao" sang "Đã hủy"` (dùng `ORDER_STATUS_LABELS`).
- `transitionOrder` thuần: không I/O, không đọc đồng hồ (nhận `at`), không mutate đơn đầu vào; trả đơn mới với `status` và `updatedAt = at.toISOString()`.
- Quyết định (Open Question đã trả lời): `OrderActor = "customer" | "staff"` đặt trong `types.ts` để component client dùng được sau này.

**Never:**
- Không thêm trạng thái mới, không đổi `ORDER_STATUSES` / `ORDER_STATUS_LABELS`.
- Không đổi `PATCH /api/orders/:id` hay `CancelOrderButton`.
- Không làm lịch sử trạng thái hay API nhân viên (Story 1.2, 1.3).
- Không viết test ma trận lấy `ALLOWED_TRANSITIONS` (hay `canTransition`) làm đáp án.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Bước hợp lệ (staff) | `pending` → `confirmed`, `at` cố định | đơn mới `status: confirmed`, `updatedAt = at`; đơn đầu vào không đổi | N/A |
| Đủ 5 bước hợp lệ | mỗi cặp hợp lệ, `staff` | thành công | N/A |
| Nhảy cóc | `pending` → `shipping` / `delivered`, `staff` | ném lỗi | `INVALID_STATUS_TRANSITION`, `details.currentStatus = "pending"` |
| Từ trạng thái cuối | `delivered` / `cancelled` → mọi trạng thái | ném lỗi | `INVALID_STATUS_TRANSITION` |
| Chuyển trùng | `confirmed` → `confirmed` | ném lỗi | `INVALID_STATUS_TRANSITION` |
| Khách hủy hợp lệ | `pending` → `cancelled`, `customer` | thành công | N/A |
| Khách vượt quyền | `confirmed` → `cancelled`, hoặc `pending` → `confirmed`, `customer` | ném lỗi | `INVALID_STATUS_TRANSITION` |
| `cancelOrder` qua service | đơn `pending` trong repository | lưu và trả đơn `cancelled` (qua `transitionOrder`) | N/A |
| `cancelOrder` đơn đã xác nhận | đơn `confirmed` | không lưu gì | `INVALID_STATUS_TRANSITION` (409) |

</frozen-after-approval>

## Code Map

- `src/features/orders/types.ts` -- `ORDER_STATUSES`, `OrderStatus`, `ORDER_STATUS_LABELS`, `Order`; thêm `OrderActor` ở đây.
- `src/features/orders/order-errors.ts` -- `OrderError(code, message, details?)`; `INVALID_STATUS_TRANSITION` đã map 409, không cần mã mới.
- `src/features/orders/order-service.ts:152-164` -- `cancelOrder` hiện tự kiểm `status !== "pending"` và tự gán `cancelled`; thay bằng `transitionOrder(order, "cancelled", { actor: "customer", at: now() })`. Giữ nguyên `getOrder`, `placeOrder`.
- `src/features/orders/order-service.test.ts:285-327` -- test `cancelOrder` hiện có (đơn `pending`, giữ mã giảm giá, đơn cũ, từ chối `confirmed`) phải tiếp tục pass.
- `src/app/api/orders/[id]/route.ts` -- PATCH của khách, gọi `orderService.cancelOrder`; không sửa.
- `src/features/orders/components/cancel-order-button.tsx` -- hiển thị `error.message` từ server; lý do message khách phải giữ nguyên.

## Tasks & Acceptance

**Execution:**
- [x] `src/features/orders/types.ts` -- thêm `export type OrderActor = "customer" | "staff"` -- người thực hiện dùng chung cho service và UI sau này.
- [x] `src/features/orders/order-state-machine.ts` -- tạo `ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]>`, `canTransition(from, to, actor)`, `transitionOrder(order, to, { actor, at })` theo Boundaries -- chỗ duy nhất đổi trạng thái (AD-4).
- [x] `src/features/orders/order-state-machine.test.ts` -- test toàn bộ ma trận 5 × 5 × 2 người thực hiện với bảng kỳ vọng viết tay trong file test; test `details.currentStatus` và đơn đầu vào không bị mutate -- phủ I/O Matrix.
- [x] `src/features/orders/order-service.ts` -- `cancelOrder` gọi `transitionOrder` với `actor: "customer"` -- bỏ logic trùng lặp.

**Acceptance Criteria:**
- Given `npm run check`, when chạy sau thay đổi, then lint, typecheck và toàn bộ test pass, kể cả test `cancelOrder` cũ không sửa.
- Given khách bấm "Hủy đơn hàng" từ trang đã mở trước khi đơn được xác nhận, when server từ chối, then giao diện hiện đúng câu "Chỉ có thể hủy đơn hàng đang ở trạng thái Chờ xác nhận".

## Implementation Notes

- `OrderActor` thêm vào `types.ts` (không phải `order-state-machine.ts`) để component client dùng được mà không kéo theo `order-errors`.
- `canTransition(from, to, actor)` được export riêng: Story 2.3 sẽ dùng để quyết định hiện nút nào.
- `cancelOrder` giờ chỉ còn: đọc đơn → `transitionOrder(..., { actor: "customer", at: now() })` → lưu. Mọi test `cancelOrder` cũ pass không sửa.
- Thêm test service: hủy lại đơn đã hủy bị từ chối và không ghi đè bản ghi (patch từ review, xem Triage Log #5).
- File chạm: `types.ts`, `order-state-machine.ts` (mới), `order-state-machine.test.ts` (mới), `order-service.ts`, `order-service.test.ts`.

## Spec Change Log

## Review Triage Log

| # | Layer | Finding | Verdict | Route | Evidence |
|---|-------|---------|---------|-------|----------|
| 1 | blind-hunter | `canTransition` nhận `actor` lạ sẽ rơi vào nhánh nhân viên | false | rejected | `OrderActor` là union kiểu TS; story này không có input từ ngoài, mọi nơi gọi đều truyền hằng `"customer"`/`"staff"`. |
| 2 | blind-hunter | `ALLOWED_TRANSITIONS` export ra ngoài có thể bị sửa lúc chạy | low | rejected | Mảng khai báo `readonly`; muốn sửa phải ép kiểu. Thêm `Object.freeze` là phức tạp hóa không cần thiết. |
| 3 | edge-case-hunter | `at` là `Invalid Date` thì `toISOString()` ném `RangeError` | low | rejected | `at` luôn đến từ `now()` của service; không có đường nào truyền ngày từ client. |
| 4 | edge-case-hunter | Đơn cũ thiếu `discount` bị mất trường khi hủy | false | rejected | `transitionOrder` spread toàn bộ đơn; test "đơn cũ không có thông tin giảm giá vẫn xem, liệt kê và hủy được" pass. |
| 5 | verification-gap | Không có test cho `cancelOrder` trên đơn đã hủy sau khi chuyển sang `transitionOrder` | medium | patch | Đã thêm test "không cho hủy lại đơn đã hủy và không ghi đè thời điểm hủy" trong `order-service.test.ts`. |

## Verification

**Commands:**
- `npx vitest run src/features/orders` -- expected: mọi test pass, có test cho từng dòng I/O Matrix.
- `npm run check` -- expected: pass.
- `npm run format:check` -- expected: pass.
- `PORT=3457 ORDERS_FILE=/tmp/shoplite-e2e-orders.json npm run test:e2e` -- expected: pass (luồng hủy đơn của khách không đổi).
