---
title: 'Story 1.1: Máy trạng thái đơn hàng & Lịch sử trạng thái'
type: 'feature'
created: '2026-11-21'
status: 'done'
baseline_commit: '5f7435d9b502aa05e08e0a391646e608d2ee9487'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/README.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-shoplite-2026-11-21/ARCHITECTURE-SPINE.md'
---

# Story 1.1: Máy trạng thái đơn hàng & Lịch sử trạng thái

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** ShopLite hiện mới có danh sách 5 giá trị `ORDER_STATUSES` trong `src/features/orders/types.ts`, chưa có máy trạng thái kiểm soát chuyển bước, chưa lưu `statusHistory`, chưa có cờ `inventoryRestocked` và thiếu mã lỗi xác thực `UNAUTHORIZED` / `ADMIN_NOT_CONFIGURED`. Điều này khiến việc chuyển trạng thái dễ nhảy cóc/quay lùi và chưa chuẩn bị hợp đồng an toàn cho dữ liệu đơn hàng cũ trong `storage/orders.json`.

**Approach:** Bổ sung kiểu `OrderStatusEvent` cùng hai trường tùy chọn `statusHistory?`, `inventoryRestocked?` vào `types.ts`, mở rộng `OrderErrorCode` trong `order-errors.ts` (giữ nguyên chữ ký constructor 3 tham số), và xây dựng module hàm thuần `src/features/orders/order-state-machine.ts` phủ đủ ma trận 5×5, validation `note`, khóa lạc quan `expectedStatus`, đánh dấu hoàn kho idempotent và fallback đơn lịch sử.

## Boundaries & Constraints

**Always:**
- Tuân thủ tuyệt đối `AD-1`, `AD-3`, `AD-4`, `AD-10`: `order-state-machine.ts` là hàm thuần không import `next/*` hay `react`, không đột biến đối tượng `Order` đầu vào.
- Giữ nguyên chữ ký `new OrderError(code, message, details?: Record<string, string>)` tự tra `httpStatus` qua `HTTP_STATUS_BY_CODE`; mọi thông báo lỗi bằng tiếng Việt có dấu.
- Đảm bảo tương thích ngược 100% với 18 đơn cũ trong `storage/orders.json` (`statusHistory === undefined`, `inventoryRestocked === undefined`, có trường phụ `discount`, `couponCode`) và giữ `npm run check` (83 unit tests hiện có) pass 100%.

**Never:**
- Không sửa đổi `src/features/orders/order-service.ts`, `order-repository.ts`, hay bất kỳ API route hoặc UI component nào trong Story 1.1 (thuộc Story 1.3 và Epic 2–4).
- Không tự chế mốc thời gian giả cho các bước trung gian trong `synthesizeStatusHistory(order)` khi đọc đơn cũ thiếu `statusHistory`.
- Không ghi lại file `storage/orders.json` chỉ vì thao tác đọc hoặc tổng hợp lịch sử fallback.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| :--- | :--- | :--- | :--- |
| Chuyển tiến hợp lệ (`staff`) | `pending→confirmed`, `confirmed→shipping` (không `note` hoặc `note` `<= 200`), `shipping→delivered` | Trả `{ order, shouldRestock: false }`; `order.status` & `updatedAt` mới; nối 1 `OrderStatusEvent` (`action: "transition"`, `actor: "staff"`, `note?` đã trim) vào cuối `statusHistory` | N/A |
| Chuyển bước sai ma trận 5×5 | `pending→shipping`/`delivered`, `confirmed→pending`, `delivered→*`, `cancelled→*`, giữ nguyên trạng thái (`pending→pending`) | Không trả về `Order` sửa đổi | Ném `OrderError("INVALID_STATUS_TRANSITION", ...)` (`409`) |
| Quyền hủy của `customer` | `actor: "customer"`, `pending→cancelled` vs (`confirmed`/`shipping`/`delivered`/`cancelled`→`cancelled`, hoặc →`confirmed`) | Nếu từ `pending` & có `statusHistory`: `status: "cancelled"`, `inventoryRestocked: true`, `shouldRestock: true`. Ngoài `pending` hoặc khác `cancelled`: từ chối | Ném `OrderError("INVALID_STATUS_TRANSITION", ...)` (`409`) |
| `expectedStatus` không khớp | `expectedStatus: "pending"` khi `order.status === "confirmed"` | Từ chối ghi đè | Ném `OrderError("INVALID_STATUS_TRANSITION", ...)` (`409`) |
| Validation `note` (`staff`) | Hủy đơn (`to: "cancelled"`) với `note` thiếu / `"   "` / dài 201 ký tự; hoặc chuyển `confirmed→shipping` có `note` dài 201 ký tự | Từ chối; nếu `confirmed→shipping` truyền `"   "` thì bỏ qua không gắn `note` | Ném `OrderError("VALIDATION_ERROR", ...)` (`400`) |
| Hủy đơn từ `pending` / `confirmed` vs `shipping` (`staff`) | Đơn có `statusHistory`, `note: "Hết hàng"` (`1..200` ký tự) | Hủy `pending`/`confirmed` → `inventoryRestocked: true`, `shouldRestock: true`; hủy `shipping` → `inventoryRestocked: false`, `shouldRestock: false` | N/A |
| Đơn cũ không có `statusHistory` | `order.statusHistory === undefined`, `order.status === "pending"`, hủy đơn | `inventoryRestocked: true`, `shouldRestock: false` (chống cộng khống kho chưa từng trừ), nối event hủy | N/A |
| `markOrderRestocked()` hợp lệ & idempotent | `cancelled` + `inventoryRestocked === false` vs (`true`, `undefined`, hoặc `status !== "cancelled"`) | Với `false`: đặt `inventoryRestocked: true`, nối event `{ status: "cancelled", at, actor: "staff", action: "restock", note? }` | Còn lại ném `OrderError("INVALID_STATUS_TRANSITION", ...)` (`409`); `note > 200` ném `VALIDATION_ERROR` (`400`) |
| `synthesizeStatusHistory()` | Đơn cũ thiếu `statusHistory` ở `pending` vs `delivered` / `cancelled` | Trả về mốc `pending` (`createdAt`) và nếu `status !== "pending"` thêm mốc `status` hiện tại (`updatedAt`), không bịa giờ bước giữa | N/A |

</frozen-after-approval>

## Code Map

- `src/features/orders/types.ts` -- Hiện có `ORDER_STATUSES` (5 trạng thái), `ORDER_STATUS_LABELS`, `OrderCustomer`, `OrderItem`, `Order` (dòng 5–54). Bổ sung `OrderActor`, `OrderHistoryAction`, `OrderStatusEvent`, và `statusHistory?`, `inventoryRestocked?` trên `Order`. Không đổi các field sẵn có.
- `src/features/orders/order-errors.ts` -- Hiện có 5 mã `OrderErrorCode`, `HTTP_STATUS_BY_CODE`, và class `OrderError(code, message, details?)` (dòng 1–31). Bổ sung `UNAUTHORIZED` (`401`) và `ADMIN_NOT_CONFIGURED` (`503`).
- `src/features/orders/order-state-machine.ts` -- *[Tạo mới]* Chứa ma trận chuyển trạng thái 5×5 và 5 hàm thuần theo `AD-10`: `canTransition`, `getAllowedNextStatuses`, `transitionOrder`, `markOrderRestocked`, `synthesizeStatusHistory`.
- `src/features/orders/order-state-machine.test.ts` -- *[Tạo mới]* Bộ unit test Vitest phủ đủ 25 cặp chuyển đổi 5×5 cho `staff` & `customer`, biên `note` (0, 200, 201), `expectedStatus`, hoàn kho từ `pending`/`confirmed`/`shipping`, `markOrderRestocked`, `synthesizeStatusHistory` và đơn cũ `statusHistory === undefined`.
- `src/lib/http.ts` -- `handleRouteError` tự đọc `error.httpStatus` và `error.code` từ `OrderError`, không cần sửa.

## Tasks & Acceptance

**Execution:**
- [x] `src/features/orders/types.ts` -- Bổ sung `OrderActor`, `OrderHistoryAction`, `OrderStatusEvent`, và 2 trường tùy chọn `statusHistory?: OrderStatusEvent[]`, `inventoryRestocked?: boolean` trên `Order` -- Tuân thủ hợp đồng dữ liệu `AD-4` / `AD-10` và tương thích đơn cũ.
- [x] `src/features/orders/order-errors.ts` -- Thêm `UNAUTHORIZED: 401` và `ADMIN_NOT_CONFIGURED: 503` vào `OrderErrorCode` và `HTTP_STATUS_BY_CODE` -- Hoàn tất tập 7 mã lỗi `AD-3` mà không phá vỡ constructor 3 tham số.
- [x] `src/features/orders/order-state-machine.ts` -- Cài đặt đủ 5 hàm thuần (`canTransition`, `getAllowedNextStatuses`, `transitionOrder`, `markOrderRestocked`, `synthesizeStatusHistory`) với ma trận 5×5, trim & giới hạn `note <= 200`, `expectedStatus`, logic hoàn kho và fallback đơn cũ -- Làm cổng duy nhất đổi trạng thái đơn theo `AD-4` / `AD-10`.
- [x] `src/features/orders/order-state-machine.test.ts` -- Viết unit test bao phủ 100% các dòng trong I/O & Edge-Case Matrix (cả 25 cặp 5×5 cho 2 actor, tính bất biến của object đầu vào và hành vi fallback đơn cũ) -- Đáp ứng `AD-1` và yêu cầu kiểm thử Sprint 1.

**Acceptance Criteria:**
- Given `storage/orders.json` chứa đơn hàng lịch sử không có `statusHistory` / `inventoryRestocked`, when gọi `synthesizeStatusHistory(legacyOrder)` hoặc hủy đơn `legacyPendingOrder`, then không xảy ra lỗi runtime, không tạo mốc thời gian giả, và hủy đơn `pending` cũ trả `shouldRestock: false`.
- Given toàn bộ mã nguồn dự án sau khi hoàn thành 4 task trên, when chạy `npm run check`, then ESLint, `next typegen && tsc --noEmit`, 83 unit tests hiện có và toàn bộ unit tests mới trong `order-state-machine.test.ts` pass 100%.

### Review Findings

- [x] [Review][Patch] Kiểm tra `Array.isArray(order.statusHistory)` trong `hasStatusHistory` để tránh `TypeError` khi dữ liệu JSON lỗi kiểu [src/features/orders/order-state-machine.ts:45-49]
- [x] [Review][Patch] Dùng `now === undefined ? new Date() : now` trong `normalizeNow` để từ chối `now: null` bằng `VALIDATION_ERROR` [src/features/orders/order-state-machine.ts:63-65]
- [x] [Review][Patch] Bổ sung test giữ nguyên `discount`/`couponCode`, gọi đúp tuần tự `markOrderRestocked`, `note` 1 ký tự sau trim, và `now: null` [src/features/orders/order-state-machine.test.ts:765-1020]

#### Rejected
- **BH-2** (`blind-hunter`, `order-state-machine.ts:229-239`) — `rejected` *(quyết định kiến trúc ở bước 4)*: Giữ quy ước đặt `inventoryRestocked: true` khi đơn lịch sử chuyển tiếp làm cờ chống cộng khống kho theo `AD-4` / `AD-5`, và chỉ diễn giải/hiển thị `inventoryRestocked` trên đơn `status === "cancelled"`, tránh thay đổi schema `Order`.
- **EC-1** (`edge-case-hunter`, `order-state-machine.ts:120-134`) — `false`: Zod (`z.enum(ORDER_STATUSES)`) và TypeScript union chặn key từ `Object.prototype` tại mọi caller hợp lệ.
- **EC-2** (`edge-case-hunter`, `order-state-machine.ts:181-194`) — `false`: `ORDER_STATUSES` và TypeScript union ngăn chuỗi prototype đi vào `ORDER_STATUS_LABELS`.
- **EC-4** (`edge-case-hunter`, `order-state-machine.ts:177-190`) — `false`: Route API validate `expectedStatus` bằng Zod trả `400`; caller typed không truyền được `null`; gọi trực tiếp vẫn từ chối `409` an toàn.
- **BH-1** (`blind-hunter`, `order-state-machine.ts`) — `false`: Trùng luận điểm prototype key với EC-1/EC-2; không có luồng caller nào tạo key `Object.prototype`.
- **BH-5** (`blind-hunter`, `order-state-machine.ts:177-208,255-274`) — `false`: Tầng HTTP đã validate field (`400`) bằng Zod; kiểm tra điều kiện chuyển trạng thái trước format `note`/`now` trong domain là fail-fast có chủ đích.
- **BH-6** (`blind-hunter`, `order-state-machine.ts:142-166`) — `false`: Đơn tiền Epic 1 chỉ hỗ trợ khách hủy nên đơn lịch sử ở `cancelled` mặc định có `actor: "customer"`; `updatedAt` là trường bắt buộc trên `Order`.
- **BH-7** (`blind-hunter`, `order-state-machine.ts:263-271`) — `false`: `transitionOrder` luôn gán boolean cho `inventoryRestocked` khi hủy, nên `inventoryRestocked === undefined` chỉ xuất hiện ở đơn lịch sử cũ và phải ném `409` theo `AD-4`.
- **BH-8** (`blind-hunter`, `order-state-machine.ts` vs `spec-1-1`) — `false`: Xử lý `[]` thống nhất với `undefined` đã được ghi nhận khi triage build; `placeOrder` luôn tạo `[pending]`; không sửa ngược spec trong code review.
- **BH-9** (`blind-hunter`, `order-errors.ts:36-38`) — `false`: `Record<OrderErrorCode, number>` ép đủ mã lỗi ở compile-time; test `OrderError` chạy bình thường trong `order-state-machine.test.ts`.
- **BH-10** (`blind-hunter`, `order-state-machine.ts:10`, `types.ts`) — `false`: Tập export công khai bị khóa theo hợp đồng `AD-10`, không thêm export mới ngoài spec.
- **BH-12** (`blind-hunter`, `spec-1-1`, `sprint-status.yaml`, `deferred-work.md`) — `false`: `spec` ở `done` và `sprint-status` ở `review` là quy ước chuyển giao sang code review; `154/154` vs `159/159` là mốc trước/sau patch; triage loại bỏ finding chỉ nhằm sửa văn bản spec.

## Implementation Notes

- Hoàn thành triển khai 4 file thuộc Story 1.1; giữ nguyên không đụng `order-service.ts`, `order-repository.ts`, route API hay UI.
- Khi chuyển trạng thái một đơn hàng cũ (`statusHistory === undefined`), `transitionOrder()` kiểm tra `isLegacyOrder` trước khi ghép `synthesizeStatusHistory(order)` nên vẫn bảo đảm `shouldRestock = false, inventoryRestocked = true` cho đơn `pending` tiền tồn kho mà vẫn giữ lại mốc `pending` (`createdAt`) trước mốc `cancelled`.
- `npm run check` sau lần sửa cuối: 13 test files pass (154/154 tests: 83 cũ + 71 mới), ESLint và `tsc --noEmit` đều pass 0 lỗi.
- Sau vòng review 3 lớp (`step-04-review`), đã vá: bảo toàn cờ không hoàn kho cho đơn lịch sử kể cả khi chuyển tiếp `pending -> confirmed/shipping` trước khi hủy, chuẩn hóa kiểm tra `statusHistory: []` thống nhất, kiểm tra runtime `Invalid Date` và kiểu `note`, thêm `?.` cho ma trận chuyển đổi, sửa 3 lỗi type `as const` trong test, và chạy lại `npm run check` pass 100% (`13/13` files, `159/159` tests).

## Spec Change Log

## Review Triage Log

| Layer | Location | Verdict & Route | Evidence / Note |
| :--- | :--- | :--- | :--- |
| `blind-hunter` | `order-state-machine.ts:929-957` | **high** → `patch` | Đúng: đơn cũ (`statusHistory === undefined`) chuyển `pending → confirmed` rồi mới hủy sẽ mất `isLegacyOrder` và trả `shouldRestock = true`, cộng khống kho chưa từng trừ. Đặt `inventoryRestocked = true` khi đơn cũ chuyển tiếp. |
| `blind-hunter` | `order-state-machine.ts:865,930-934` | **low** → `patch` | Đúng: `synthesizeStatusHistory` kiểm tra `length > 0` nhưng `transitionOrder`/`markOrderRestocked` chỉ kiểm tra `!== undefined`. Chuẩn hóa `hasHistory` chung. |
| `blind-hunter` | `order-state-machine.ts:805-832,928,992` | **low** → `patch` | Đúng: `normalizeNote` âm thầm biến `note` sai kiểu (số/object) khi không bắt buộc thành `""` và `toISOString()` ném `RangeError` nếu `now` là `Invalid Date`. |
| `blind-hunter` | `order-state-machine.ts:842-856,905` | **low** → `patch` | Đúng: truy cập `ALLOWED_TRANSITIONS[actor][from]` trực tiếp dễ gây `TypeError` nếu gặp input lỗi tại runtime; thêm `?.` trả `false`/`[]` và fallback nhãn. |
| `blind-hunter` | `order-state-machine.ts:951-957` | **medium** → `patch` | Đúng: khi `order.inventoryRestocked === true` sẵn, hủy đơn vẫn tính `shouldRestock = true`. Khóa `shouldRestock` khi `order.inventoryRestocked === true`. |
| `blind-hunter` | `order-state-machine.test.ts:108-124,312-325` | **low** → `patch` | Đúng: `expectOrderError` chưa assert `details` (`expectedStatus`, `from`/`to`, `note`) và 2 thông điệp lỗi của `markOrderRestocked`. Bổ sung assert. |
| `blind-hunter` | `order-state-machine.test.ts:146-165,614-704` | **low** → `patch` | Đúng: thiếu ca test `synthesizeStatusHistory` cho `confirmed`/`shipping`/`[]`, mặc định `now`, và `instanceof Error` / `name` / no-`details` của `OrderError`. |
| `blind-hunter` | `types.ts:1021-1023`, `order-state-machine.ts:969-972` | **false** *(reject)* | `AD-10` khóa cứng chữ ký `markOrderRestocked(order, { now?, note? })` với `actor: "staff"` và khóa idempotent bằng `inventoryRestocked !== false`; API luôn gán `actor` từ tầng route nên không cần mảng hằng số runtime thừa. |
| `edge-case-hunter` | `order-state-machine.ts:176-203` *(legacy)* | **high** → `patch` | Trùng nguyên nhân gốc với `blind-hunter #1`: mất cờ đơn cũ khi chuyển `pending → confirmed` rồi hủy; vá bằng giữ `inventoryRestocked = true` cho đơn cũ chuyển tiếp. |
| `edge-case-hunter` | `order-state-machine.ts:176-180` *(`[]`)* | **low** → `patch` | Trùng nguyên nhân gốc với `blind-hunter #2`: chuẩn hóa `hasHistory` khi `statusHistory: []` trong `transitionOrder`. |
| `edge-case-hunter` | `order-state-machine.ts:239-242` *(`[]`)* | **low** → `patch` | Trùng nguyên nhân gốc với `blind-hunter #2`: chuẩn hóa `hasHistory` khi `statusHistory: []` trong `markOrderRestocked`. |
| `edge-case-hunter` | `order-state-machine.ts:198-203` *(`restocked`)* | **medium** → `patch` | Trùng nguyên nhân gốc với `blind-hunter #5`: chặn `shouldRestock` nếu `order.inventoryRestocked === true`. |
| `edge-case-hunter` | `order-state-machine.ts:174` *(`Invalid Date`)* | **low** → `patch` | Trùng nguyên nhân gốc với `blind-hunter #3`: kiểm tra `Number.isNaN(now.getTime())` trong `transitionOrder`. |
| `edge-case-hunter` | `order-state-machine.ts:238` *(`Invalid Date`)* | **low** → `patch` | Trùng nguyên nhân gốc với `blind-hunter #3`: kiểm tra `Number.isNaN(now.getTime())` trong `markOrderRestocked`. |
| `edge-case-hunter` | `order-state-machine.ts:88-102` *(runtime guard)* | **low** → `patch` | Trùng nguyên nhân gốc với `blind-hunter #4`: dùng `?.` trong `canTransition` và `getAllowedNextStatuses`. |
| `edge-case-hunter` | `order-state-machine.ts:55` *(type `note`)* | **low** → `patch` | Trùng nguyên nhân gốc với `blind-hunter #3`: từ chối `note` khác `undefined` và khác `string` với `VALIDATION_ERROR`. |
| `verification-gap` | `src/features/orders/order-service.ts:121-132` | **medium** → `defer` | Xác nhận đúng `orderService.cancelOrder` và `placeOrder` chưa dùng `transitionOrder`/`statusHistory` vì việc tích hợp `order-service.ts` thuộc **Story 1.3** theo `epics.md` và bị cấm sửa trong Story 1.1. Ghi vào `deferred-work.md`. |

## Verification

**Commands:**
- `npm run check` -- expected: lint sạch, `tsc --noEmit` không lỗi, tất cả file test cũ và `src/features/orders/order-state-machine.test.ts` pass 100%.
