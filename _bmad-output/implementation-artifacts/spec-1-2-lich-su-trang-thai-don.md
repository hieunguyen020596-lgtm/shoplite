---
title: 'Story 1.2 - Lịch sử trạng thái đơn'
type: 'feature'
created: '2026-11-21'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'c5580e601188ec8aa147ba4b86e07dbde7191a65'
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-shoplite-ops-2026-11-20/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Đơn chỉ có `updatedAt`; khi khách khiếu nại, cửa hàng không biết đơn đã đi qua những bước nào, lúc nào, do ai. Đơn cũ trong `storage/orders.json` lại không có dữ liệu này.

**Approach:** Lưu `statusHistory` chỉ ghi thêm trong bản ghi đơn: `placeOrder` tạo mục đầu, `transitionOrder` nối một mục cho mỗi lần chuyển (kèm ghi chú tùy chọn). Đơn cũ được suy ra lịch sử ở mọi đường đọc của service mà không ghi lại file.

## Boundaries & Constraints

**Always:**
- `OrderStatusEntry = { status, at, actor: OrderActor | "system", note? }`; `Order.statusHistory?` tùy chọn (giống `discount?` của đơn cũ).
- Một thao tác dùng một `at` cho cả `updatedAt` và `at` của mục mới. Mục cuối luôn trùng `order.status`.
- Ghi chú: bỏ khoảng trắng hai đầu; rỗng → không có trường `note`; tối đa 200 ký tự (đúng 200 hợp lệ); quá dài → `OrderError("VALIDATION_ERROR", ..., { note: "Ghi chú tối đa 200 ký tự" })`.
- `transitionOrder` vẫn thuần và không mutate đơn đầu vào, kể cả mảng `statusHistory` của nó.
- Đơn cũ (thiếu `statusHistory`) được chuẩn hóa bằng hàm thuần `withStatusHistory` thành `[{ status, at: updatedAt, actor: "system" }]` ở **mọi** đường đọc của service (`getOrder`, `listOrders`); không gọi `repository.save` khi chỉ đọc.
- Quyết định (Open Question đã trả lời): khách không gửi ghi chú khi tự hủy; `PATCH /api/orders/:id` giữ nguyên.

**Never:**
- Không tách lịch sử ra file hay repository riêng; không đổi interface `OrderRepository`.
- Không làm UI timeline (Story 4.1) hay API nhân viên (Story 1.3).
- Không viết script migrate `orders.json`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Đặt đơn | `placeOrder` hợp lệ | `statusHistory = [{ status: "pending", at: createdAt, actor: "customer" }]` | N/A |
| Chuyển có ghi chú | `pending → confirmed`, `staff`, note `"  Đã kiểm hàng "` | thêm đúng 1 mục `{ confirmed, at, staff, note: "Đã kiểm hàng" }`; mục cũ giữ nguyên | N/A |
| Ghi chú rỗng | note `"   "` | mục mới không có `note` | N/A |
| Ghi chú đúng giới hạn | note 200 ký tự | chấp nhận | N/A |
| Ghi chú quá dài | note 201 ký tự | không tạo đơn mới | `VALIDATION_ERROR`, `details.note` |
| Không mutate | đơn có `statusHistory` 1 mục | đơn đầu vào vẫn 1 mục sau khi chuyển | N/A |
| Khách hủy | `cancelOrder` đơn `pending` | mục cuối `{ cancelled, actor: "customer" }` | N/A |
| Đơn cũ - đọc | đơn thiếu `statusHistory`, đọc qua `getOrder` hoặc `listOrders` | trả về có lịch sử suy ra; repository không bị ghi | N/A |
| Đơn cũ - hủy | đơn cũ `pending`, khách hủy | lưu lịch sử = mục suy ra + mục `cancelled` | N/A |

</frozen-after-approval>

## Code Map

- `src/features/orders/types.ts` -- `Order`, `OrderActor` (Story 1.1); thêm `OrderStatusEntry` và `statusHistory?`.
- `src/features/orders/order-state-machine.ts` -- `transitionOrder(order, to, { actor, at })` từ Story 1.1; mở rộng `{ note? }` và nối mục lịch sử. Giữ nguyên `ALLOWED_TRANSITIONS`, `canTransition`.
- `src/features/orders/order-service.ts` -- `placeOrder` dựng `order` (tạo mục đầu tại `createdAt`); hàm nội bộ `getOrder` dùng chung cho `getOrder` và `cancelOrder`; `listOrders` sắp xếp mới nhất trước.
- `src/features/orders/order-repository.ts` -- `createInMemoryOrderRepository(seed)` dùng để test đơn cũ; không sửa repository.
- `src/features/orders/order-service.test.ts` -- test "đơn cũ không có thông tin giảm giá" là mẫu cho test đơn cũ thiếu lịch sử.

## Tasks & Acceptance

**Execution:**
- [x] `src/features/orders/types.ts` -- thêm `OrderStatusEntry`, `Order.statusHistory?` -- dữ liệu lịch sử nằm trong đơn (AD-5).
- [x] `src/features/orders/order-history.ts` -- tạo `MAX_NOTE_LENGTH`, `normalizeNote`, `withStatusHistory` (thuần) -- một chỗ duy nhất cho quy tắc ghi chú và suy ra lịch sử đơn cũ.
- [x] `src/features/orders/order-history.test.ts` -- test ghi chú (trim, rỗng, giới hạn) và suy ra lịch sử đơn cũ.
- [x] `src/features/orders/order-state-machine.ts` -- `transitionOrder` nhận `note`, nối mục lịch sử, không mutate đầu vào.
- [x] `src/features/orders/order-state-machine.test.ts` -- test mục lịch sử mới, ghi chú, không mutate.
- [x] `src/features/orders/order-service.ts` -- `placeOrder` tạo mục đầu; `getOrder`, `listOrders` trả đơn đã chuẩn hóa.
- [x] `src/features/orders/order-service.test.ts` -- test lịch sử khi đặt, khi khách hủy, đơn cũ (đọc không ghi, hủy lưu đủ lịch sử).

**Acceptance Criteria:**
- Given `npm run check`, when chạy sau thay đổi, then pass; test cũ của `placeOrder`, `cancelOrder` không cần sửa.
- Given một file `orders.json` có đơn cũ, when mở `/orders` và `/orders/[id]`, then trang không lỗi và file không đổi.

## Implementation Notes

- `withStatusHistory` trả kiểu `Order & { statusHistory: OrderStatusEntry[] }` để nơi gọi không phải xử lý `undefined`.
- `normalizeNote` ném `VALIDATION_ERROR` kèm `details.note`; Story 1.3 sẽ để Zod chặn sớm ở API nhưng vẫn giữ kiểm tra này trong lõi.
- `transitionOrder` kiểm tra bước chuyển trước, rồi mới kiểm tra ghi chú (bước chuyển sai luôn trả 409).
- Kiểm tra thủ công: `npm run dev`, đặt một đơn, hủy đơn → `storage/orders.json` có `statusHistory` 2 mục (`pending` customer, `cancelled` customer).
- File chạm: `types.ts`, `order-history.ts` (mới), `order-history.test.ts` (mới), `order-state-machine.ts`, `order-state-machine.test.ts`, `order-service.ts`, `order-service.test.ts`.

## Spec Change Log

## Review Triage Log

| # | Layer | Finding | Verdict | Route | Evidence |
|---|-------|---------|---------|-------|----------|
| 1 | blind-hunter | Ghi chú có thể chứa HTML, nguy cơ XSS khi hiển thị | false | rejected | Chưa có nơi hiển thị trong story này; React escape chuỗi khi render (Story 2.3, 4.1). |
| 2 | blind-hunter | `withStatusHistory` được gọi ở mọi lần đọc, tốn bộ nhớ khi nhiều đơn | low | rejected | Chỉ tạo mảng 1 phần tử cho đơn cũ; đơn mới trả nguyên đối tượng. |
| 3 | edge-case-hunter | Đơn cũ có `updatedAt` rỗng → mục suy ra có `at` rỗng | maybe-false | rejected | Mọi đơn do `placeOrder` tạo từ trước đều có `updatedAt` (test cũ khẳng định); chỉ xảy ra nếu sửa tay file - AGENTS.md cấm. |
| 4 | edge-case-hunter | `placeOrder` dùng hai lần `toISOString()` khác nhau cho `createdAt` và mục đầu | false | rejected | Cả hai cùng từ một biến `createdAt` (một lần `now()`), giá trị giống hệt. |
| 5 | verification-gap | Thiếu test khách hủy đơn cũ: lịch sử phải giữ mục suy ra + mục `cancelled` | medium | patch | Đã thêm test "đơn cũ: hủy lưu lịch sử gồm mục suy ra và mục hủy". |
| 6 | verification-gap | Thiếu test ghi chú chỉ có khoảng trắng | low | patch | Đã thêm test `normalizeNote("   ")` trả `undefined` và mục lịch sử không có `note`. |

## Verification

**Commands:**
- `npx vitest run src/features/orders` -- expected: mọi test pass, có test cho từng dòng I/O Matrix.
- `npm run check` -- expected: pass.
- `npm run format:check` -- expected: pass.
