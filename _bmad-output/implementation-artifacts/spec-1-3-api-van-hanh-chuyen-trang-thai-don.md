---
title: 'Story 1.3: API vận hành chuyển trạng thái & Hủy đơn cho nhân viên'
type: 'feature'
created: '2026-11-21'
status: 'done'
route: 'dispatch'
baseline_commit: 'c257afbda16904016ece5781288e997fc782e161'
review_loop_iteration: 0
context:
  - '{project-root}/README.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-shoplite-2026-11-21/ARCHITECTURE-SPINE.md'
---

# Story 1.3: API vận hành chuyển trạng thái & Hủy đơn cho nhân viên

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `OrderService` hiện chưa sử dụng máy trạng thái `order-state-machine.ts`: `placeOrder()` chưa khởi tạo `statusHistory`, `cancelOrder()` vẫn tự kiểm tra `order.status !== "pending"` mà không ghi lịch sử hay `inventoryRestocked`, và chưa có endpoint bảo vệ `PATCH /api/admin/orders/:id/status` để nhân viên chuyển bước hoặc hủy đơn kèm lý do.

**Approach:** Tích hợp `transitionOrder()` vào `order-service.ts` (`placeOrder`, `cancelOrder`, và phương thức mới `transitionOrderStatus` theo đúng hợp đồng `AD-10`), tạo Route Handler `PATCH /api/admin/orders/:id/status` bảo vệ bởi `assertAdminRequest(request)` (`503 → 401 → 400 → 404/409/200`), và bổ sung test cho cả service, admin API và public customer cancel API.

## Boundaries & Constraints

**Always:**
- Tuân thủ `AD-1`, `AD-3`, `AD-4`, `AD-8`, `AD-9`, `AD-10`: `order-service.ts` không import `next/*`/`react`; mọi chuyển trạng thái đi qua `transitionOrder()` trong `order-state-machine.ts`; mọi lỗi qua `OrderError` + `handleRouteError`.
- Trong `PATCH /api/admin/orders/:id/status`, bắt buộc gọi `assertAdminRequest(request)` ở dòng đầu tiên (ưu tiên `503 ADMIN_NOT_CONFIGURED` trước `401 UNAUTHORIZED` và trước parse body), gán cứng `actor: "staff"` từ server, trả về `{ order }` (`200`) kèm `Cache-Control: no-store`.
- Giữ nguyên hợp đồng công khai của `PATCH /api/orders/:id` (chỉ nhận `{ "status": "cancelled" }` khi `pending`) và bảo toàn 100% pass cho `order-service.test.ts` & `src/app/api/orders/route.test.ts`.

**Never:**
- Không tích hợp `InventoryRepository`, `StorageLock` hoặc `storage/inventory.json` trong Story 1.3 (thuộc Story 2.1); giữ chữ ký `createOrderService({ repository, ... })` tương thích ngược.
- Không cho phép khách hàng gửi `note` hoặc chuyển sang trạng thái khác `"cancelled"` qua `PATCH /api/orders/:id`.
- Không ghi dữ liệu vào `storage/orders.json` thật khi chạy test (test dùng `InMemoryOrderRepository`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| :--- | :--- | :--- | :--- |
| Tạo đơn mới qua `placeOrder()` | Payload hợp lệ từ khách | `order.statusHistory` có đúng 1 mục `{ status: "pending", at: order.createdAt, actor: "customer", action: "transition" }` | Giữ nguyên `400`/`422`/`409` hiện có |
| Khách hủy đơn `PATCH /api/orders/:id` | `{ status: "cancelled" }` trên đơn `pending` (mới vs cũ thiếu `statusHistory`) | HTTP `200`, `status: "cancelled"`, nối event `actor: "customer"`, đặt `inventoryRestocked: true` | Đơn khác `pending` → `409`; `:id` không có → `404`; body không phải `"cancelled"` → `400 VALIDATION_ERROR` |
| Auth `PATCH /api/admin/orders/:id/status` | Thiếu `ADMIN_PASSCODE` (dù body/cookie thế nào) vs có env nhưng thiếu/sai/hết hạn cookie | Chặn trước khi parse body hay đọc repo | Thiếu env → `503 ADMIN_NOT_CONFIGURED`; thiếu/hỏng cookie → `401 UNAUTHORIZED` |
| Validate body `PATCH /api/admin/orders/:id/status` | Cookie hợp lệ; body không phải JSON, `status` sai enum, `note` không phải string, staff hủy thiếu/rỗng `note`, hoặc `note > 200` | Từ chối trước khi ghi đơn | HTTP `400`, `error.code = "VALIDATION_ERROR"` |
| `:id` không tồn tại trên admin route | Cookie & body hợp lệ, `:id = "SL-KHONG-CO"` | Không thay đổi dữ liệu | HTTP `404`, `error.code = "ORDER_NOT_FOUND"` |
| Chuyển bước hợp lệ (`staff`) | `pending→confirmed`, `confirmed→shipping` (kèm `note?` `<= 200` và `expectedStatus: "confirmed"`), `shipping→delivered`, hủy `pending`/`confirmed`/`shipping` kèm `note` | HTTP `200` `{ order }` với `status`, `updatedAt`, `statusHistory` nối mới, `inventoryRestocked` đúng quy tắc hủy (`true` hoặc `false`) | N/A |
| Sai ma trận hoặc xung đột `expectedStatus` | `pending→delivered`, `delivered→cancelled`, hoặc `expectedStatus: "pending"` khi đơn đang `"confirmed"` | Không ghi đè đơn | HTTP `409`, `error.code = "INVALID_STATUS_TRANSITION"` |

</frozen-after-approval>

## Code Map

- `src/features/orders/order-state-machine.ts` -- Đã có từ Story 1.1: cung cấp `transitionOrder(order, input)` và kiểu `TransitionOrderInput`.
- `src/features/orders/admin-auth.ts` -- Đã có từ Story 1.2: cung cấp `assertAdminRequest(request)` kiểm tra `503 → 401`.
- `src/features/orders/order-service.ts` -- Chứa `createOrderService`, `placeOrder` (dòng 53–110), `cancelOrder` (dòng 121–132). Cập nhật khởi tạo `statusHistory` trong `placeOrder`, chuyển `cancelOrder` sang dùng `transitionOrder()`, và thêm `transitionOrderStatus()`.
- `src/app/api/orders/[id]/route.ts` -- Giữ nguyên hợp đồng công khai `{ "status": "cancelled" }`, tự động hưởng `statusHistory` & `inventoryRestocked` thông qua `orderService.cancelOrder(id)`.
- `src/app/api/admin/orders/[id]/status/route.ts` -- *[Tạo mới]* Route Handler `PATCH`: `assertAdminRequest` → `readJsonBody` → Zod 4 validate → `orderService.transitionOrderStatus` → `200 { order }` (`Cache-Control: no-store`).
- `src/features/orders/order-service.test.ts` -- Mở rộng giữ nguyên 13 test cũ, thêm unit test cho `statusHistory` ở `placeOrder`/`cancelOrder`, `transitionOrderStatus`, `expectedStatus` và đơn cũ.
- `src/app/api/admin/orders/[id]/status/route.test.ts` & `src/app/api/orders/[id]/route.test.ts` -- *[Tạo mới]* Route tests (`@vitest-environment node`, mock `@/features/orders/server` bằng `InMemoryOrderRepository`).

## Tasks & Acceptance

**Execution:**
- [x] `src/features/orders/order-service.ts` -- Khởi tạo `statusHistory` trong `placeOrder()`, chuyển `cancelOrder()` sang gọi `transitionOrder()` (`actor: "customer"`), và bổ sung `transitionOrderStatus(id, input)` đúng chữ ký `AD-10` -- Thống nhất toàn bộ chuyển trạng thái đi qua máy trạng thái thuần túy.
- [x] `src/app/api/admin/orders/[id]/status/route.ts` -- Cài đặt `PATCH` handler với thứ tự `assertAdminRequest` (`503 → 401`) → `readJsonBody` + Zod (`400`) → `orderService.transitionOrderStatus` (`404`/`409`/`200`) -- Cung cấp API vận hành bảo vệ Fail-Closed cho nhân viên.
- [x] `src/features/orders/order-service.test.ts` -- Bổ sung unit test cho `placeOrder` (`statusHistory`), `cancelOrder` (`statusHistory`, `inventoryRestocked`, đơn cũ) và `transitionOrderStatus` -- Bảo đảm 100% tương thích ngược và đủ nhánh biên.
- [x] `src/app/api/admin/orders/[id]/status/route.test.ts` và `src/app/api/orders/[id]/route.test.ts` -- Viết route tests (`@vitest-environment node`) phủ đủ 7 dòng I/O & Edge-Case Matrix (gồm `503`, `401`, `400`, `404`, `409`, `200`) -- Đóng vòng kiểm chứng API Epic 1 và mục defer từ Story 1.1.

**Acceptance Criteria:**
- Given một đơn hàng mới đặt qua `POST /api/orders` rồi đi qua `PATCH /api/admin/orders/:id/status` (`confirmed` → `shipping` có `note` & `expectedStatus` → `delivered`), when kiểm tra đơn trả về qua `GET /api/orders/:id`, then `statusHistory` lưu đủ 4 mốc tuần tự theo thời gian với đúng `actor` và `note`.
- Given `npm run check` chạy sau khi hoàn tất 4 task trên, when ESLint, `next typegen && tsc --noEmit`, và Vitest hoàn thành, then toàn bộ 189 tests trước đó và tất cả test mới của Story 1.3 pass 100%.

## Implementation Notes

- Cập nhật `src/features/orders/order-service.ts`: `placeOrder()` khởi tạo `statusHistory` với 1 mục `pending` (`actor: "customer"`); bổ sung `transitionOrderStatus(id, input)` gọi `transitionOrder()` trong `order-state-machine.ts`; `cancelOrder(id)` ủy quyền về `transitionOrderStatus(id, { status: "cancelled", actor: "customer" })`.
- Tạo mới `src/app/api/admin/orders/[id]/status/route.ts`: cài đặt `PATCH` chạy `assertAdminRequest(request)` trước `readJsonBody` & Zod 4 (`updateAdminOrderStatusSchema`), gán cứng `actor: "staff"`, trả `200 { order }` kèm `Cache-Control: no-store`.
- Mở rộng `src/features/orders/order-service.test.ts` (+10 tests, tổng 23) và tạo mới `src/app/api/orders/[id]/route.test.ts` (8 tests) & `src/app/api/admin/orders/[id]/status/route.test.ts` (11 tests) trên `InMemoryOrderRepository`.
- Toàn bộ 7 dòng I/O & Edge-Case Matrix đều được phủ test; sau vòng rà soát 3 lớp đã vá 3 mục nhỏ (thông điệp tiếng Việt cho root `z.object` ở `details._form`, sửa `tamperedToken` trong test đảo ký tự hex để chạm `timingSafeEqualStrings`, bổ sung case biên body rỗng/`null`/`[]`, `expectedStatus: null`, chuyển lùi/từ `cancelled`, note 201 khi hủy, và kiểm tra chặn ghi đè field nội bộ) cùng ghi nhận 2 mục `defer` sang Story 2.1 vào `deferred-work.md`.
- Xác minh cuối cùng `npm run check` (`eslint`, `next typegen && tsc --noEmit`, `vitest run`): **18/18 file, 218/218 test pass** (0 failed, 0 skipped).

## Spec Change Log

## Review Triage Log

| ID | Nguồn | Vị trí & tóm tắt | Verdict | Route | Bằng chứng / Lý do |
| :--- | :--- | :--- | :--- | :--- | :--- |
| BH-1 | blind-hunter | `order-service.ts`: bỏ qua `shouldRestock` trả về từ `transitionOrder` | medium | defer | Hợp lệ nhưng bị `<frozen-after-approval>` (`Never`) loại trừ khỏi Story 1.3 vì `InventoryRepository` thuộc Story 2.1. |
| BH-2 | blind-hunter | `order-service.ts`: chưa expose `markOrderRestocked` trên service/API | false | reject | Không thuộc `AD-10` hay phạm vi Epic 1; `markOrderRestocked` là helper cho cơ chế hoàn kho ở Story 2.1. |
| BH-3 | blind-hunter | `order-service.ts` / `order-repository.ts`: read-modify-write không có lock làm yếu `expectedStatus` | medium | defer | Chung nguyên nhân với EC-1; `StorageLock` và lưu kho nguyên tử thuộc Story 2.1 theo `<frozen-after-approval>` (`Never`). |
| EC-1 | edge-case-hunter | `order-service.ts:70-84`: hai lệnh chuyển/hủy đồng thời cùng đơn có thể đọc cũ và ghi đè nhau | medium | defer | Chung nguyên nhân với BH-3; `StorageLock` bị loại trừ khỏi Story 1.3 bởi `<frozen-after-approval>` (`Never`), sẽ nối trong Story 2.1. |
| BH-4 | blind-hunter | `status/route.ts` & `orders/[id]/route.ts`: lỗi không có `Cache-Control: no-store` và route khách không thêm header | false | reject | `orders/[id]/route.ts` là code sẵn có ngoài diff; `PATCH` không cacheable theo HTTP và khớp mẫu `login/route.ts` (`no-store` trên `200`, `handleRouteError` khi lỗi). |
| BH-5 | blind-hunter | `status/route.ts`: root `z.object` thiếu message tiếng Việt nên trả tiếng Anh ở `details._form` khi body là `null`/`[]`/primitive | low | patch | Xác nhận thực tế trong diff: trường con có tiếng Việt nhưng `z.object` thiếu message tiếng Việt; thêm message và kiểm tra nội dung ở test. |
| BH-6 | blind-hunter | `status/route.ts`: không validate/trim param `:id` | false | reject | Next.js bảo đảm segment `[id]` tồn tại; chuỗi trắng/sai định dạng thất bại rõ ràng với `404 ORDER_NOT_FOUND` tại `getOrder(id)` không đổi dữ liệu, khớp `GET/PATCH /api/orders/[id]`. |
| BH-7 | blind-hunter | `status/route.ts`: `readJsonBody` không ép `Content-Type` và gộp body rỗng/JSON lỗi | false | reject | `readJsonBody` là helper chuẩn dự án trong `src/lib/http.ts`; cả body rỗng và JSON hỏng đều thất bại `400 VALIDATION_ERROR`. |
| BH-8 | blind-hunter | `orders/[id]/route.ts` vs `status/route.ts`: khác kiểu trả về (`Order` vs `{ order }`) và `cancelOrder` bỏ qua `note`/`expectedStatus` | false | reject | Cố ý theo `<frozen-after-approval>` (`Always`/`Never`) và `AD-10` để bảo toàn hợp đồng storefront hiện hữu. |
| BH-9 | blind-hunter | `order-service.ts`: thiếu runtime validate cho `status`/`actor` ngoài HTTP | false | reject | TS khóa kiểu `OrderStatus`/`OrderActor`, HTTP validate qua Zod 4 + gán cứng `actor`; dữ liệu sai vẫn bị `canTransition` chặn rõ với `INVALID_STATUS_TRANSITION`. |
| BH-10 | blind-hunter | `status/route.test.ts` & `orders/[id]/route.test.ts`: mock `createInMemoryOrderRepository` thay vì file JSON | false | reject | `<frozen-after-approval>` (`Never`) cấm tests ghi `storage/orders.json`; file repo đã được test riêng trong `order-repository.test.ts`. |
| BH-11 | blind-hunter | `status/route.test.ts:156`: `tamperedToken` thay ký tự cuối bằng `"x"` (không phải hex) nên không chạm `timingSafeEqualStrings` | low | patch | Xác nhận ở dòng 156: `"x"` bị regex 64-hex chặn trước bước so HMAC; đổi sang đảo 1 ký tự hex để test đi qua đường kiểm tra chữ ký thật. |
| BH-12 | blind-hunter | `status/route.test.ts` & `orders/[id]/route.test.ts`: thiếu vài case biên (body rỗng `""`, `expectedStatus: null`, từ `cancelled` / đi lùi, `cancelled` note 201, chặn ghi đè field nội bộ, body non-object ở route khách) | low | patch | Bổ sung các case biên nhỏ ngay trong 2 file route test để khóa chặt hồi quy HTTP. |
| VG-0 | verification-gap | Không phát hiện verification gap | false | reject | Reviewer trả kết quả trống ("No verification gaps found."). |

## Verification

**Commands:**
- `npm run check` -- expected: ESLint, `next typegen && tsc --noEmit`, và toàn bộ Vitest suite (cũ + mới) pass 100%.
