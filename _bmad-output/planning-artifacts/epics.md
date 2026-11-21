---
status: final
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-shoplite-2026-11-21/prd.md
  - _bmad-output/planning-artifacts/prds/prd-shoplite-2026-11-21/addendum.md
  - _bmad-output/planning-artifacts/ux-designs/ux-shoplite-2026-11-21/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-shoplite-2026-11-21/EXPERIENCE.md
  - _bmad-output/planning-artifacts/architecture/architecture-shoplite-2026-11-21/ARCHITECTURE-SPINE.md
---

# ShopLite Ops - Epic Breakdown

## Overview

Tài liệu này phân rã toàn bộ yêu cầu của **ShopLite Ops** từ PRD (`FR-1..FR-15`), UX Spine (`DESIGN.md`, `EXPERIENCE.md`) và Architecture Spine (`AD-1..AD-10`) thành 4 Epic theo giá trị người dùng và 8 Story có thể triển khai độc lập (mỗi Story vừa 1 phiên dev ~1–2 giờ, có Acceptance Criteria dạng Given/When/Then phủ đầy đủ trường hợp biên/lỗi). Toàn bộ hệ thống chạy độc lập 100% trên máy local bằng Node.js 22.23.4 & Next.js 16.4.2, lưu file JSON trong `storage/`, không dùng cơ sở dữ liệu hay dịch vụ bên thứ ba.

## Requirements Inventory

### Functional Requirements

- **FR-1:** Chuyển Trạng thái đơn hàng theo ma trận 5×5 (`pending → confirmed → shipping → delivered`) qua `PATCH /api/admin/orders/:id/status`, hỗ trợ `note` tùy chọn (`<= 200` ký tự) và khóa lạc quan `expectedStatus`.
- **FR-2:** Nhân viên vận hành hủy Đơn hàng ở `pending`, `confirmed` hoặc `shipping` kèm lý do `note` bắt buộc (`1..200` ký tự); hủy `pending`/`confirmed` tự hoàn kho (`inventoryRestocked = true`), hủy `shipping` không tự hoàn kho (`inventoryRestocked = false`).
- **FR-3:** Ghi nhận `statusHistory` bất biến (`status`, `at`, `actor`, `action`, `note?`) và tương thích ngược đơn cũ (`statusHistory === undefined`, `inventoryRestocked === undefined`, giữ nguyên trường thừa `discount`/`couponCode`).
- **FR-4:** Bảo toàn quy tắc Khách hàng tự hủy đơn khi còn `pending` qua `PATCH /api/orders/:id` (`{ "status": "cancelled" }`), tự hoàn kho cho đơn mới và chặn chuyển sang trạng thái khác.
- **FR-5:** Khởi tạo và lưu trữ Tồn kho khả dụng bền vững tại `storage/inventory.json` (`INVENTORY_FILE`), tự seed từ `src/data/products.ts`, đảm bảo mọi tồn kho `>= 0`.
- **FR-6:** Trừ kho nguyên tử lúc đặt hàng (`pending`) trong vùng khóa tuần tự: *all-or-nothing*, rollback khi lưu đơn lỗi, file tạm `<filePath>.<uuid>.tmp` → `fs.rename`, chống bán vượt tồn kho khi đặt song song (`Promise.allSettled` trên `stock = 1`).
- **FR-7:** Hoàn kho idempotent khi hủy đơn `pending`/`confirmed` và cung cấp `POST /api/admin/orders/:id/restock` xác nhận nhận hàng hoàn (`+kho`) đúng 1 lần cho đơn hủy từ `shipping` (`inventoryRestocked === false`).
- **FR-8:** Đồng bộ Tồn kho khả dụng động (`force-dynamic`) lên trang chủ `/`, `/products`, `/products/[slug]`, `GET /api/products`, `GET /api/products/[slug]`, và giữ nguyên form + giỏ hàng trên `/checkout` khi gặp `409 INSUFFICIENT_STOCK`.
- **FR-9:** Đăng nhập quản trị tại `/admin/login` (`POST /api/admin/auth/login`) bằng `ADMIN_PASSCODE` Fail-Closed (`503 ADMIN_NOT_CONFIGURED` nếu thiếu env), so sánh `SHA-256` + `crypto.timingSafeEqual`, phát cookie `shoplite_admin` (`HttpOnly; SameSite=Lax; Path=/; Max-Age=28800`, ký `HMAC-SHA256`).
- **FR-10:** Xác thực hai lớp theo thứ tự `503 → 401` tại Next.js 16 `src/proxy.ts` cho `/admin/*` và `assertAdminRequest()` ở mọi `/api/admin/*` (trừ `/logout`).
- **FR-11:** Đăng xuất Phiên quản trị qua `POST /api/admin/auth/logout` (luôn trả `200` xóa cookie `Max-Age=0` kể cả khi phiên đã hết hạn) và chuyển về `/admin/login`.
- **FR-12:** Danh sách đơn hàng tại `/admin/orders` (`GET /api/admin/orders?status=&q=`): lọc URL query kèm bộ đếm tab (`counts`), tab `pending` sắp xếp FIFO, tìm kiếm không dấu theo mã/SĐT/tên khách, trạng thái rỗng `EmptyState`.
- **FR-13:** Hiển thị `ReservedStockIndicator` inline (`✓ Đã giữ X cho đơn này · Còn cho đơn mới: Y`) 3 bậc màu + icon trên đơn `pending`/`confirmed`/`shipping` (ẩn trên `delivered`/`cancelled`).
- **FR-14:** Thao tác chuyển 1 bước kèm `expectedStatus`, ô ghi chú vận đơn tùy chọn ở `confirmed`, hộp thoại `CancelOrderDialog` (3 chip chọn nhanh điền vào textarea, cảnh báo `shipping`), `RestockStatusBadge` + nút `+kho`, xử lý `401` (`?expired=1`) & `409` (auto-refresh), responsive `390px` (`min-h-11` `44px`).
- **FR-15:** `OrderProgressTimeline` 4 bước (có fallback đủ 4 bước cho đơn cũ) và `RefreshStatusButton` (`router.refresh()`, không polling 30s) tại `/orders/[id]`.

### NonFunctional Requirements

- **NFR-1 (Bảo mật Fail-Closed):** `SHA-256` + `crypto.timingSafeEqual`, cookie `HMAC-SHA256`, ưu tiên kiểm tra `503` trước `401`, không lộ `ADMIN_PASSCODE` ra client.
- **NFR-2 (Độ tin cậy dữ liệu Single-Node):** Mọi đọc–sửa–ghi `storage/orders.json` và `storage/inventory.json` đi qua `StorageLock` re-entrant + file tạm UUID + `fs.rename()`.
- **NFR-3 (Hiệu năng & Quy mô Local):** Hỗ trợ `<= 500` đơn hàng không phân trang, API cục bộ p95 `< 200ms`, chạy độc lập 100% trên `localhost:3000`.
- **NFR-4 (Trợ năng WCAG 2.2 AA & Mobile 390px):** Đầy đủ `<label>`, `role="alert"`, điều khiển bàn phím, không dùng chỉ màu sắc, vùng chạm `>= 44px`, `scrollWidth <= 390px`.
- **NFR-5 (Không hồi quy Brownfield):** Toàn bộ `npm run check` (83 unit tests hiện có + test mới) và `e2e/shopping-flow.spec.ts` pass 100%.

### Additional Requirements

- **Architecture Spine (`AD-1..AD-10`):**
  - `AD-1 [ADOPTED]` lõi nghiệp vụ thuần trong `src/features/*` không import `next/*` hay `react`.
  - `AD-2 [ADOPTED]` Repository interface `JsonFile*` / `InMemory*`, mặc định in-memory cho `inventoryRepository` trong `createOrderService`.
  - `AD-3 [ADOPTED]` `new OrderError(code, message, details?)` với 7 mã lỗi trong `HTTP_STATUS_BY_CODE` + `handleRouteError`.
  - `AD-4` máy trạng thái hàm thuần `order-state-machine.ts`.
  - `AD-5` tồn kho phẳng `Record<string, number>` tại `storage/inventory.json`, trừ kho ở `pending` kèm rollback, hoàn kho idempotent.
  - `AD-6` `StorageLock` re-entrant (`AsyncLocalStorage`) dùng chung + file tạm UUID.
  - `AD-7` giữ nguyên hàm sync thuần trong `catalog-service.ts`, tạo `catalog-inventory.ts` async cho trang `force-dynamic`.
  - `AD-8` `admin-auth.ts` dùng chung cho Next.js 16 `src/proxy.ts` (`export function proxy`, cấm `export const runtime`) và `/api/admin/*`.
  - `AD-9` `GET /api/admin/orders` trả `{ orders, counts, availableStockByProductId }`, FIFO cho `pending`, bắt buộc `expectedStatus` từ UI.
  - `AD-10` tuân thủ đúng khối TypeScript Seam Contracts tại `ARCHITECTURE-SPINE.md` Structural Seed §3.

### UX Design Requirements

- **UX-DR1:** Sử dụng chính xác bảng màu hex Tailwind v4 từ `DESIGN.md` (`#4F39F6`, `#EC003F`, `#007A55`, `#BB4D00`, `#45556C`); nâng `OrderStatusBadge` trạng thái `cancelled` lên `text-slate-600` (`6.92:1`) và gắn icon `lucide-react` cho cả 5 trạng thái.
- **UX-DR2:** Mọi trạng thái đơn, tồn kho giữ chỗ (`ReservedStockIndicator`), hoàn kho (`RestockStatusBadge`) và Timeline (`OrderProgressTimeline`) luôn ghép 3 tín hiệu **màu + icon + văn bản**.
- **UX-DR3:** Nút hành động chính 1 bước tách biệt với nút Hủy đơn; hủy đơn luôn mở `CancelOrderDialog` có 3 chip điền vào `<textarea>` chỉnh sửa được; mọi nút/tab/chip/input đạt chiều cao tối thiểu `min-h-11` (`44px`) trên mobile `390px`.
- **UX-DR4:** Xử lý đầy đủ các trạng thái trong `EXPERIENCE.md#State Patterns`: skeleton loading, `EmptyState` + nút `Xóa bộ lọc`, `503` khóa form trên `/admin/login`, `401` chuyển `/admin/login?expired=1`, `409` banner `role="alert"` + tự làm mới danh sách, và giữ nguyên form `/checkout` khi `409 INSUFFICIENT_STOCK`.

### FR Coverage Map

- **FR-1:** Epic 1 — Story 1.1, Story 1.3
- **FR-2:** Epic 1 — Story 1.1, Story 1.3
- **FR-3:** Epic 1 — Story 1.1, Story 1.3; Epic 4 — Story 4.1
- **FR-4:** Epic 1 — Story 1.1, Story 1.3; Epic 4 — Story 4.1
- **FR-5:** Epic 2 — Story 2.1
- **FR-6:** Epic 2 — Story 2.1
- **FR-7:** Epic 2 — Story 2.1
- **FR-8:** Epic 2 — Story 2.2
- **FR-9:** Epic 1 — Story 1.2; Epic 3 — Story 3.1
- **FR-10:** Epic 1 — Story 1.2, Story 1.3
- **FR-11:** Epic 1 — Story 1.2; Epic 3 — Story 3.1
- **FR-12:** Epic 3 — Story 3.1, Story 3.2
- **FR-13:** Epic 3 — Story 3.1, Story 3.2
- **FR-14:** Epic 3 — Story 3.2
- **FR-15:** Epic 4 — Story 4.1

## Epic List

### Epic 1: Vòng đời đơn hàng có kiểm soát & An toàn truy cập API
**FRs covered:** FR-1, FR-2, FR-3, FR-4, FR-9, FR-10, FR-11

### Epic 2: Tồn kho thực tế & An toàn đặt hàng đồng thời
**FRs covered:** FR-5, FR-6, FR-7, FR-8

### Epic 3: Cổng vận hành đơn hàng `/admin/orders` (Desktop & Mobile 390px)
**FRs covered:** FR-9, FR-11, FR-12, FR-13, FR-14

### Epic 4: Khách hàng theo dõi tiến trình đơn hàng
**FRs covered:** FR-3, FR-4, FR-15

---

## Epic 1: Vòng đời đơn hàng có kiểm soát & An toàn truy cập API

Mục tiêu: Đơn hàng chỉ chuyển qua các trạng thái hợp lệ kèm lịch sử bất biến tương thích đơn cũ, đồng thời mọi API và tuyến quản trị được khóa Fail-Closed (`503 → 401`) trước khi xây giao diện. Không phụ thuộc bất kỳ Epic nào phía sau.

### Story 1.1: Máy trạng thái đơn hàng & Lịch sử trạng thái

As a Nhân viên vận hành,
I want hệ thống kiểm soát chặt ma trận chuyển trạng thái 5×5 và tự động ghi lịch sử trạng thái tương thích đơn cũ,
So that đơn hàng không bao giờ bị nhảy cóc, quay ngược hoặc lỗi runtime khi mở dữ liệu lịch sử.

**Ràng buộc kiến trúc:** `AD-1`, `AD-3`, `AD-4`, `AD-10`, `NFR-5`. Triển khai `src/features/orders/types.ts` (thêm `OrderActor`, `OrderHistoryAction`, `OrderStatusEvent`, `statusHistory?`, `inventoryRestocked?`), `src/features/orders/order-errors.ts` (bổ sung `UNAUTHORIZED: 401` và `ADMIN_NOT_CONFIGURED: 503` vào `HTTP_STATUS_BY_CODE`, giữ nguyên chữ ký `new OrderError(code, message, details?)`), và hàm thuần trong `src/features/orders/order-state-machine.ts` (`canTransition`, `getAllowedNextStatuses`, `transitionOrder`, `markOrderRestocked`, `synthesizeStatusHistory`).

**Acceptance Criteria:**

**Given** một đơn hàng ở trạng thái `pending`
**When** nhân viên chuyển sang `confirmed` (hoặc `confirmed → shipping` có `note` tối đa 200 ký tự, hoặc `shipping → delivered`)
**Then** `transitionOrder()` trả về đơn mới có `status` và `updatedAt` được cập nhật
**And** nối thêm đúng 1 `OrderStatusEvent` (`status`, `at`, `actor: "staff"`, `action: "transition"`, `note?`) vào cuối `statusHistory`

**Given** bất kỳ cặp chuyển trạng thái không hợp lệ nào trong ma trận 5×5 (nhảy cóc `pending → shipping`/`delivered`, đi lùi `confirmed → pending`, chuyển từ `delivered`/`cancelled`, hoặc khách hàng hủy đơn `confirmed`)
**When** gọi `transitionOrder()`
**Then** ném `OrderError("INVALID_STATUS_TRANSITION", ...)` (HTTP `409`)
**And** đối tượng đơn hàng đầu vào không bị đột biến (immutable)

**Given** một yêu cầu chuyển trạng thái gửi kèm `expectedStatus` khác với `order.status` hiện tại
**When** gọi `transitionOrder()`
**Then** ném `OrderError("INVALID_STATUS_TRANSITION", ...)`

**Given** nhân viên hủy đơn ở `pending`, `confirmed` hoặc `shipping`
**When** `note` bị thiếu, chỉ có khoảng trắng hoặc `note.trim().length > 200`
**Then** ném `OrderError("VALIDATION_ERROR", ...)` (HTTP `400`)

**Given** đơn mới có `statusHistory` bị hủy từ `pending` hoặc `confirmed`
**When** gọi `transitionOrder()`
**Then** trả về `shouldRestock: true` và đặt `order.inventoryRestocked = true`
**And** khi hủy từ `shipping`, trả về `shouldRestock: false` và đặt `order.inventoryRestocked = false`

**Given** đơn cũ trong `storage/orders.json` có `statusHistory === undefined`
**When** hủy đơn ở `pending` hoặc gọi `synthesizeStatusHistory(order)`
**Then** khi hủy đặt `inventoryRestocked = true` nhưng `shouldRestock: false` (không cộng khống tồn kho)
**And** `synthesizeStatusHistory(order)` tổng hợp được các mốc fallback từ `createdAt` và `updatedAt` mà không ném lỗi
**And** gọi `markOrderRestocked()` trên đơn `cancelled` có `inventoryRestocked !== false` (cả `true` lẫn `undefined`) bị từ chối với `OrderError("INVALID_STATUS_TRANSITION", ...)`

**Given** bộ unit test `src/features/orders/order-state-machine.test.ts`
**When** chạy `npm run check`
**Then** phủ đủ toàn bộ 25 cặp chuyển đổi (5×5) cho cả `staff` và `customer`, biên độ dài `note` (0, 200, 201 ký tự), `markOrderRestocked` và đơn cũ fallback

---

### Story 1.2: Xác thực quản trị Fail-Closed & Bảo vệ tuyến `/admin/*`

As a Chủ cửa hàng / Nhân viên vận hành,
I want cổng `/admin/*` và mọi API `/api/admin/*` bị khóa tuyệt đối khi chưa cấu hình `ADMIN_PASSCODE` hoặc chưa có Phiên quản trị hợp lệ,
So that người ngoài không thể truy cập hoặc gọi trực tiếp API duyệt/hủy đơn.

**Ràng buộc kiến trúc:** `AD-3`, `AD-8`, `AD-10`, `NFR-1`. Triển khai `src/features/orders/admin-auth.ts`, `src/proxy.ts` (Next.js 16 `export function proxy`, `matcher: ["/admin/:path*"]`, cấm khai báo `export const runtime`), `src/app/api/admin/auth/login/route.ts`, và `src/app/api/admin/auth/logout/route.ts`.

**Acceptance Criteria:**

**Given** biến môi trường `ADMIN_PASSCODE` chưa được thiết lập hoặc chỉ chứa khoảng trắng
**When** gọi `POST /api/admin/auth/login` hoặc gọi `assertAdminRequest(request)`
**Then** trả về HTTP `503` với `ApiErrorBody` có `error.code === "ADMIN_NOT_CONFIGURED"` (kiểm tra trước cả cookie `401`)
**And** không chấp nhận bất kỳ mật khẩu mặc định nào

**Given** `ADMIN_PASSCODE` đã cấu hình và client gửi `POST /api/admin/auth/login`
**When** body không phải JSON hoặc thiếu/rỗng `passcode`
**Then** trả về HTTP `400` (`VALIDATION_ERROR`)
**When** mật khẩu sai (kể cả khác độ dài byte so với `ADMIN_PASSCODE`)
**Then** so sánh bằng băm `SHA-256` + `crypto.timingSafeEqual` không ném `RangeError` và trả về HTTP `401` (`UNAUTHORIZED`)
**When** mật khẩu đúng
**Then** trả về HTTP `200` kèm header `Set-Cookie` đặt `shoplite_admin=<expiresAtEpochMs>.<hmacSha256Hex>; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800` (thêm `Secure` khi `NODE_ENV === "production"`)

**Given** người dùng truy cập `/admin/orders` (hoặc bất kỳ `/admin/*` nào khác `/admin/login`) qua `src/proxy.ts`
**When** thiếu `ADMIN_PASSCODE` hoặc không có cookie `shoplite_admin`
**Then** chuyển hướng `307` về `/admin/login`
**When** đã có cookie `shoplite_admin` nhưng đã hết hạn 8 giờ hoặc bị sửa chữ ký (trong khi `ADMIN_PASSCODE` đã cấu hình)
**Then** chuyển hướng `307` về `/admin/login?expired=1`

**Given** người dùng gọi `POST /api/admin/auth/logout` (kể cả khi phiên đã hết hạn hoặc không có cookie)
**When** endpoint xử lý
**Then** luôn trả về HTTP `200` kèm `Set-Cookie` xóa `shoplite_admin` (`Max-Age=0; HttpOnly; SameSite=Lax; Path=/`)

---

### Story 1.3: API vận hành chuyển trạng thái & Hủy đơn cho nhân viên

As a Nhân viên vận hành,
I want gọi API được bảo vệ để chuyển trạng thái hoặc hủy đơn hàng kèm lý do và kiểm tra phiên bản trạng thái,
So that giao diện quản trị và công cụ kiểm thử dùng chung một hợp đồng nghiệp vụ an toàn.

**Ràng buộc kiến trúc:** `AD-1`, `AD-3`, `AD-4`, `AD-8`, `AD-9`, `AD-10`, `NFR-5`. Cập nhật `src/features/orders/order-service.ts` (khởi tạo `statusHistory` trong `placeOrder()`, cho `cancelOrder()` dùng `transitionOrder()`, thêm `transitionOrderStatus()`), và tạo `src/app/api/admin/orders/[id]/status/route.ts`.

**Acceptance Criteria:**

**Given** khách hàng tạo đơn mới qua `orderService.placeOrder()`
**When** đơn được lưu thành công
**Then** `order.statusHistory` có đúng 1 phần tử `{ status: "pending", at: order.createdAt, actor: "customer", action: "transition" }`
**And** toàn bộ 13 unit tests hiện có trong `order-service.test.ts` và 5 route tests trong `src/app/api/orders/route.test.ts` tiếp tục pass 100%

**Given** nhân viên gửi `PATCH /api/admin/orders/:id/status` với cookie `shoplite_admin` hợp lệ
**When** chuyển hợp lệ (`pending → confirmed`, `confirmed → shipping` có `note?`, `shipping → delivered`, hoặc hủy `pending`/`confirmed`/`shipping` có `note` 1..200 ký tự)
**Then** trả về HTTP `200` với `{ order }` đã cập nhật `status`, `updatedAt`, `statusHistory`, và `inventoryRestocked` (nếu hủy)

**Given** request `PATCH /api/admin/orders/:id/status` thiếu cấu hình `ADMIN_PASSCODE` hoặc thiếu/sai cookie
**When** handler chạy `assertAdminRequest(request)` ở dòng đầu tiên
**Then** trả về `503` (`ADMIN_NOT_CONFIGURED`) hoặc `401` (`UNAUTHORIZED`) mà không đọc/ghi dữ liệu đơn

**Given** request `PATCH /api/admin/orders/:id/status` có body không phải JSON, `status` sai enum, `note` > 200 ký tự, hoặc hủy thiếu `note`
**Then** trả về HTTP `400` (`VALIDATION_ERROR`)
**Given** mã đơn `:id` không tồn tại
**Then** trả về HTTP `404` (`ORDER_NOT_FOUND`)
**Given** chuyển trạng thái trái ma trận hoặc `expectedStatus !== order.status`
**Then** trả về HTTP `409` (`INVALID_STATUS_TRANSITION`)

**Given** khách hàng gọi `PATCH /api/orders/:id` hiện có
**When** gửi `{ "status": "cancelled" }` khi đơn ở `pending`
**Then** trả về `200`, ghi `actor: "customer"` vào `statusHistory`, đặt `inventoryRestocked = true`
**And** từ chối `409` nếu đơn khác `pending`, từ chối `400` nếu gửi trạng thái khác `"cancelled"`

---

## Epic 2: Tồn kho thực tế & An toàn đặt hàng đồng thời

Mục tiêu: Tồn kho khả dụng được lưu bền vững tại `storage/inventory.json`, trừ ngay lúc đặt hàng trong khóa tuần tự chống bán vượt số lượng khi đặt đồng thời, hoàn kho idempotent kèm bước xác nhận nhận hàng hoàn từ `shipping`, và đồng bộ số tồn thật lên toàn bộ mặt tiền bán hàng.

### Story 2.1: Khóa tuần tự re-entrant, Kho `storage/inventory.json` & Trừ/Hoàn kho nguyên tử

As a Chủ cửa hàng,
I want mọi thao tác trừ kho, lưu đơn và hoàn kho chạy tuần tự nguyên tử và chống bán vượt tồn kho,
So that hai khách đặt cùng lúc chiếc sản phẩm cuối cùng chỉ có đúng 1 đơn thành công và tồn kho không bao giờ âm hoặc cộng đúp.

**Ràng buộc kiến trúc:** `AD-2`, `AD-5`, `AD-6`, `AD-10`, `NFR-2`, `NFR-5`. Triển khai `src/lib/storage-lock.ts` (`StorageLock` re-entrant dùng `AsyncLocalStorage`), `src/features/orders/inventory-repository.ts` (`JsonFileInventoryRepository` + `InMemoryInventoryRepository`), cập nhật `src/features/orders/order-repository.ts` (dùng `StorageLock` + file tạm `<filePath>.<crypto.randomUUID()>.tmp` + bảo toàn trường thừa đơn cũ), cập nhật `src/features/orders/order-service.ts` (`placeOrder` all-or-nothing + rollback trong `catch`, hoàn kho tự động khi hủy `pending`/`confirmed`, thêm `restockCancelledOrder()`), lắp ráp singleton tại `src/features/orders/server.ts`, và tạo `src/app/api/admin/orders/[id]/restock/route.ts`.

**Acceptance Criteria:**

**Given** `storage/inventory.json` chưa tồn tại (hoặc thiếu key của một `productId` mới trong `src/data/products.ts`)
**When** đọc tồn kho qua `InventoryRepository`
**Then** tự động khởi tạo/fallback từ trường `stock` của `src/data/products.ts` dưới dạng `Record<string, number>` với mọi giá trị `>= 0`

**Given** sản phẩm có Tồn kho khả dụng = `1`
**When** bắn song song 5 yêu cầu `placeOrder()` cùng lúc bằng `Promise.allSettled()` (mỗi đơn mua `1`)
**Then** **đúng 1 đơn thành công** (`status: "pending"`), 4 đơn còn lại thất bại với `OrderError("INSUFFICIENT_STOCK")` (HTTP `409`), và Tồn kho khả dụng cuối cùng bằng đúng `0`

**Given** đơn hàng có 2 sản phẩm mà sản phẩm thứ nhất đủ kho nhưng sản phẩm thứ hai không đủ kho
**When** gọi `placeOrder()`
**Then** toàn bộ đơn bị từ chối với `INSUFFICIENT_STOCK` và tồn kho sản phẩm thứ nhất **không bị trừ** (*all-or-nothing*)

**Given** bước trừ kho đã thành công nhưng `orderRepository.save()` ném lỗi I/O
**When** `placeOrder()` xử lý ngoại lệ trong khối `catch`
**Then** tự động gọi `inventoryRepository.restock()` hoàn trả đúng số lượng vừa trừ trước khi ném tiếp lỗi (HTTP `500`)

**Given** đơn mới (có `statusHistory`) bị hủy từ `pending` (khách hoặc nhân viên) hoặc `confirmed` (nhân viên)
**When** giao dịch hoàn tất
**Then** cộng trả đúng số lượng `order.items` về `storage/inventory.json` trong `StorageLock` và đặt `inventoryRestocked = true`

**Given** đơn bị nhân viên hủy từ `shipping` (`status === "cancelled"`, `inventoryRestocked === false`)
**When** nhân viên gọi `POST /api/admin/orders/:id/restock` (chấp nhận body rỗng **hoặc** JSON tùy chọn `{ note?: string }` `<= 200` ký tự) với cookie hợp lệ
**Then** trả về HTTP `200` với `{ order }` có `inventoryRestocked: true`, cộng đúng số lượng về Tồn kho khả dụng, và nối `{ status: "cancelled", at, actor: "staff", action: "restock", note? }` vào `statusHistory`
**When** gọi lại `POST /api/admin/orders/:id/restock` lần thứ 2 (hoặc gọi trên đơn không ở `cancelled` / đơn cũ `inventoryRestocked === undefined`)
**Then** từ chối với HTTP `409` (`INVALID_STATUS_TRANSITION`) và tồn kho không thay đổi
**When** thiếu `ADMIN_PASSCODE` hoặc cookie không hợp lệ
**Then** trả `503` hoặc `401` theo đúng thứ tự `AD-8`

**Given** các file test hiện có (`order-service.test.ts`, `order-repository.test.ts`, `src/app/api/orders/route.test.ts`) chỉ truyền `{ repository }` hoặc `filePath`
**When** chạy `npm run check`
**Then** toàn bộ 83 unit tests cũ và các test đồng thời/rollback/restock mới đều pass 100%

---

### Story 2.2: Đồng bộ tồn kho động lên mặt tiền bán hàng & xử lý hết hàng tại `/checkout`

As a Khách hàng,
I want nhìn thấy số lượng tồn kho chính xác mới nhất trên trang chủ, danh mục, chi tiết sản phẩm và không bị mất dữ liệu form khi món hàng vừa hết lúc đặt,
So that tôi không mất công đặt mua sản phẩm đã bán hết.

**Ràng buộc kiến trúc:** `AD-1`, `AD-7`, `AD-10`, `UX-DR4`, `NFR-5`. Tạo `src/features/catalog/catalog-inventory.ts` (giữ nguyên 100% chữ ký đồng bộ của `src/features/catalog/catalog-service.ts`), cập nhật `src/app/page.tsx`, `src/app/products/page.tsx`, `src/app/products/[slug]/page.tsx` (thêm `export const dynamic = "force-dynamic"`, gỡ `generateStaticParams`), `src/app/api/products/route.ts`, `src/app/api/products/[slug]/route.ts`, và kiểm chứng/cập nhật `CheckoutForm` khi gặp `409 INSUFFICIENT_STOCK`.

**Acceptance Criteria:**

**Given** Tồn kho khả dụng của một sản phẩm thay đổi trong `storage/inventory.json` (giảm về `0` sau khi đặt hàng, hoặc tăng lại sau khi hủy/nhận hàng hoàn)
**When** truy cập trang chủ `/`, `/products`, `/products/[slug]`, `GET /api/products` hoặc `GET /api/products/[slug]`
**Then** toàn bộ trả về và hiển thị đúng số `stock` thực tế từ `InventoryRepository`
**And** khi `stock === 0`, `StockBadge` hiển thị **"Hết hàng"** và nút thêm vào giỏ bị vô hiệu hóa

**Given** Khách hàng điền đầy đủ thông tin giao hàng tại `/checkout` và bấm **"Đặt hàng"** đúng lúc sản phẩm vừa hết hàng (`409 INSUFFICIENT_STOCK`)
**When** `CheckoutForm` nhận lỗi `409`
**Then** hiển thị thông báo `role="alert"` nêu rõ tên sản phẩm không đủ tồn kho
**And** giữ nguyên toàn bộ thông tin họ tên, SĐT, địa chỉ, ghi chú đã điền trên form và danh sách giỏ hàng hiện tại (không xóa trắng)

**Given** bộ test `src/features/catalog/catalog-service.test.ts` (18 unit tests đồng bộ)
**When** chạy `npm run check`
**Then** pass 100% không cần sửa chữ ký của `catalog-service.ts`

---

## Epic 3: Cổng vận hành đơn hàng `/admin/orders` (Desktop & Mobile 390px)

Mục tiêu: Nhân viên vận hành đăng nhập an toàn tại `/admin/login`, lọc/tìm kiếm đơn hàng, nhìn rõ hàng đã giữ chỗ và tồn kho còn lại để duyệt/bàn giao/hủy có lý do/xác nhận hàng hoàn trong `< 30 giây` trên cả desktop và điện thoại kho `390px`.

### Story 3.1: Trang đăng nhập `/admin/login`, Nâng cấp `OrderStatusBadge` & API danh sách hàng chờ quản trị

As a Nhân viên vận hành,
I want đăng nhập qua trang quản trị thân thiện và tải danh sách đơn kèm bộ đếm từng trạng thái cùng tồn kho giữ chỗ trong một lượt,
So that tôi vào ca làm việc nhanh chóng và nhìn ngay thấy bao nhiêu đơn đang chờ xử lý.

**Ràng buộc kiến trúc:** `AD-8`, `AD-9`, `AD-10`, `UX-DR1`, `UX-DR2`, `UX-DR3`, `UX-DR4`, `DESIGN.md`, `EXPERIENCE.md`. Triển khai `src/app/admin/login/page.tsx` (Server Component kiểm tra sẵn `isAdminConfigured()`), `src/features/orders/components/admin-login-card.tsx`, `src/features/orders/components/admin-header-bar.tsx`, nâng cấp `src/features/orders/components/order-status-badge.tsx` (màu `cancelled` dùng `text-slate-600` + gắn icon `lucide-react` cho cả 5 trạng thái), thêm `orderService.listAdminOrders(filter)` và `src/app/api/admin/orders/route.ts`.

**Acceptance Criteria:**

**Given** biến môi trường `ADMIN_PASSCODE` chưa được thiết lập
**When** mở `/admin/login`
**Then** trang hiển thị ngay khung cảnh báo `role="alert"` *"Hệ thống chưa cấu hình mật khẩu quản trị (`ADMIN_PASSCODE`)"* và vô hiệu hóa ô nhập cùng nút gửi mà không cần bấm đăng nhập

**Given** `ADMIN_PASSCODE` đã cấu hình và nhân viên mở `/admin/login?expired=1`
**When** trang hiển thị
**Then** hiện thông báo `role="status"` màu vàng nhắc phiên làm việc 8 giờ đã hết hạn
**When** nhập đúng mật khẩu và bấm **"Đăng nhập vận hành"** (hoặc nhấn `Enter`)
**Then** nhận cookie `shoplite_admin` và chuyển hướng sang `/admin/orders`
**When** nhập sai mật khẩu
**Then** hiện lỗi `role="alert"` tiếng Việt và giữ focus tại ô nhập

**Given** nhân viên đã đăng nhập gọi `GET /api/admin/orders?status=pending&q=minh`
**When** API xử lý qua `orderService.listAdminOrders()`
**Then** trả về HTTP `200` với `{ orders, counts, availableStockByProductId }`, trong đó:
- `orders` chỉ gồm các đơn khớp `q` (tìm không dấu qua `normalizeText` trên mã đơn, SĐT, tên khách) và `status === "pending"`, sắp xếp **FIFO (`createdAt` tăng dần)**
- `counts` chứa số lượng đơn của cả 5 trạng thái cộng `"all"` tính trên tập đơn khớp `q`
- `availableStockByProductId` chứa snapshot tồn kho hiện tại từ `InventoryRepository`
- nếu `status` ngoài danh sách hợp lệ thì tự fallback về `"all"` (sắp xếp `createdAt` giảm dần)

**Given** component `OrderStatusBadge` render 5 trạng thái (`pending`, `confirmed`, `shipping`, `delivered`, `cancelled`)
**Then** mỗi trạng thái hiển thị đồng thời **màu nền/chữ + icon `lucide-react` + nhãn tiếng Việt**
**And** trạng thái `cancelled` dùng `text-slate-600` trên `bg-slate-100` (đạt tương phản WCAG 2.2 AA `6.92:1`)

---

### Story 3.2: Giao diện hàng chờ `/admin/orders`, tồn kho giữ chỗ inline & thao tác đơn hàng

As a Nhân viên vận hành,
I want lọc/tìm đơn, xem rõ hàng đã giữ chỗ cho từng món, chuyển trạng thái 1 bước, hủy có lý do và xác nhận hàng hoàn trên cả desktop lẫn điện thoại 390px,
So that tôi xử lý mỗi đơn dưới 30 giây mà không hủy oan đơn hợp lệ hay gặp lỗi tràn màn hình.

**Ràng buộc kiến trúc:** `AD-1`, `AD-4`, `AD-8`, `AD-9`, `UX-DR2`, `UX-DR3`, `UX-DR4`, `NFR-4`, `DESIGN.md`, `EXPERIENCE.md`, `mockups/admin-orders.html`. Triển khai `src/app/admin/orders/page.tsx` và `src/features/orders/components/admin-orders-view.tsx` (gồm `AdminHeaderBar`, `OrderFilterTabs`, `AdminOrderSearchBar`, `AdminOrderCard`, `ReservedStockIndicator`, `RestockStatusBadge`, `CancelOrderDialog`).

**Acceptance Criteria:**

**Given** nhân viên mở `/admin/orders` trên desktop hoặc mobile `390px`
**When** chọn tab lọc trạng thái hoặc nhập từ khóa tìm kiếm
**Then** URL đồng bộ `?status=...&q=...` (tải lại trang F5 giữ nguyên kết quả), hiển thị skeleton khi đang tải, và hiển thị `EmptyState` kèm nút **"Xóa bộ lọc"** khi 0 kết quả khớp

**Given** một đơn hàng đang giữ hàng (`pending`, `confirmed`, `shipping`) trên `AdminOrderCard`
**Then** mỗi dòng sản phẩm hiển thị `ReservedStockIndicator` dạng **`✓ Đã giữ {quantity} cho đơn này · Còn cho đơn mới: {availableStock}`** với 3 bậc màu + icon (`> 5` xanh lá `CheckCircle2`, `1–5` vàng cam `AlertTriangle`, `0` đỏ `XCircle`)
**And** đơn `delivered` và `cancelled` **không** hiển thị dòng *"Đã giữ X cho đơn này"*

**Given** nhân viên thao tác chuyển bước trên `AdminOrderCard`
**Then** chỉ hiển thị đúng 1 nút chính ứng với bước hợp lệ kế tiếp (`Xác nhận đơn`, `Bàn giao giao hàng` kèm ô nhập ghi chú mã vận đơn tùy chọn `<= 200` ký tự cho đơn `confirmed`, `Đánh dấu đã giao`) — không có dropdown chọn trạng thái tự do
**And** mọi lệnh `PATCH /api/admin/orders/:id/status` luôn gửi kèm `expectedStatus: order.status`

**Given** nhân viên bấm **"Hủy đơn"** trên đơn `pending`, `confirmed` hoặc `shipping`
**When** `CancelOrderDialog` mở ra
**Then** hiển thị 3 chip lý do chọn nhanh (*"Hết hàng thực tế"*, *"Khách yêu cầu hủy qua điện thoại"*, *"Giao hàng thất bại / Khách không nhận"*) — chạm chip điền văn bản vào `<textarea>` chỉnh sửa được (không tự submit), hiện bộ đếm `{len}/200`, chặn gửi và hiện `role="alert"` nếu rỗng hoặc `> 200` ký tự, hỗ trợ `Escape` để đóng
**And** riêng đơn `shipping` hiển thị khung cảnh báo vàng `role="alert"` *"Hủy đơn đang giao sẽ không tự động cộng lại tồn kho"*

**Given** một đơn `cancelled` có `inventoryRestocked === false`
**Then** hiển thị badge vàng cam `data-testid="restock-pending-badge"` (**"Chờ nhận hàng hoàn"**) và nút **"Xác nhận đã nhận hàng hoàn (+kho)"**
**When** nhân viên bấm xác nhận hoàn kho thành công
**Then** nút biến mất và đổi thành badge xanh `data-testid="restocked-badge"` (**"Đã hoàn kho"**)
**And** đơn `cancelled` cũ (`inventoryRestocked === undefined`) ẩn cả nút hoàn kho lẫn badge chờ hàng hoàn

**Given** API trả về `401` (hết phiên 8 giờ) hoặc `409` (tab khác vừa cập nhật đơn)
**When** `/admin/orders` nhận phản hồi lỗi
**Then** với `401` chuyển hướng ngay sang `/admin/login?expired=1`; với `409` hiển thị banner `role="alert"` *"Đơn hàng vừa được cập nhật bởi thao tác khác. Danh sách đã được làm mới."* và tự tải lại danh sách đơn

**Given** mở `/admin/orders` ở độ rộng viewport `390px`
**Then** không có tràn ngang (`scrollWidth <= innerWidth`), mọi nút hành động chính, nút hủy, nút Đăng xuất, tab lọc và chip lý do có chiều cao `>= 44px` (`min-h-11`), và bấm **"Đăng xuất"** gọi `POST /api/admin/auth/logout` rồi đưa về `/admin/login`

---

## Epic 4: Khách hàng theo dõi tiến trình đơn hàng

Mục tiêu: Khách hàng xem được Timeline tiến trình 4 bước rõ ràng (kèm mốc giờ, ghi chú vận đơn, lý do hủy và fallback an toàn cho đơn cũ) ngay trên `/orders/[id]` mà không phá vỡ bất kỳ luồng mua sắm hiện có nào.

### Story 4.1: Timeline tiến trình 4 bước & Làm mới trạng thái tại `/orders/[id]`

As a Khách hàng,
I want xem tiến trình 4 bước của đơn hàng, lý do hủy (nếu có) và tự bấm làm mới trạng thái tại `/orders/[id]`,
So that tôi biết rõ đơn đang ở chặng nào và yên tâm đợi nhận hàng mà không cần gọi điện hỏi cửa hàng.

**Ràng buộc kiến trúc:** `AD-1`, `AD-4`, `UX-DR2`, `UX-DR4`, `NFR-4`, `NFR-5`, `DESIGN.md`, `EXPERIENCE.md`, `mockups/order-detail-timeline.html`. Tạo `src/features/orders/components/order-progress-timeline.tsx` và `src/features/orders/components/refresh-status-button.tsx`, cập nhật `src/features/orders/components/cancel-order-button.tsx` (tự gọi `router.refresh()` khi gặp `409`) và `src/app/orders/[id]/page.tsx`.

**Acceptance Criteria:**

**Given** Khách hàng mở `/orders/[id]` của một đơn hàng chưa hủy (`pending`, `confirmed`, `shipping`, `delivered`)
**Then** `OrderProgressTimeline` hiển thị đủ 4 bước theo thứ tự (`Chờ xác nhận` → `Đã xác nhận` → `Đang giao` → `Đã giao`) bằng màu + biểu tượng + nhãn tiếng Việt
**And** các bước đã hoàn thành hiển thị thời điểm định dạng qua `formatDateTime()` và khung ghi chú vận đơn (nếu có)

**Given** Khách hàng mở `/orders/[id]` của một đơn mới đã `cancelled` (có `statusHistory`)
**Then** hiển thị hộp trạng thái hủy màu `{colors.danger-soft}` nêu rõ tác nhân hủy (*"Khách hàng"* hoặc *"Cửa hàng"*), thời điểm hủy và lý do hủy (nếu do cửa hàng hủy)

**Given** Khách hàng mở `/orders/[id]` của một đơn cũ trong `storage/orders.json` chưa có `statusHistory`
**Then** không ném lỗi runtime; với đơn chưa hủy hiển thị đủ 4 bước (bước 1 dùng `createdAt`, bước hiện tại dùng `updatedAt`, các bước trung gian suy luận hiển thị `"—"`); với đơn hủy cũ hiển thị *"Đơn đã hủy"* kèm `updatedAt`

**Given** Khách hàng bấm nút **"Làm mới trạng thái"** (`RefreshStatusButton`, `min-h-11`)
**Then** gọi `router.refresh()` tải lại trạng thái mới nhất từ server mà **không** chạy polling tự động 30 giây

**Given** đơn hàng đang ở trạng thái `pending` vs đã chuyển sang `confirmed`/`shipping`/`delivered`/`cancelled`
**Then** `CancelOrderButton` chỉ hiển thị khi `order.status === "pending"`; khi đơn chuyển sang `confirmed` hoặc `shipping`, ẩn nút hủy và hiển thị dòng giải thích *"Đơn hàng đã được xác nhận — vui lòng liên hệ cửa hàng nếu cần hỗ trợ"*
**And** nếu khách bấm hủy đúng lúc nhân viên vừa xác nhận đơn (`409`), `CancelOrderButton` hiển thị `role="alert"` và tự gọi `router.refresh()` để đồng bộ giao diện

**Given** bộ kiểm thử tự động `npm run check` và `npm run test:e2e` (`e2e/shopping-flow.spec.ts`)
**When** chạy toàn bộ test sau khi hoàn tất
**Then** `e2e/shopping-flow.spec.ts` (bao gồm `order-row` tại `/orders` và banner `?placed=1`) pass 100% và không bị tràn ngang trên viewport `390px`
