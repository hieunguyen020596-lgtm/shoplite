# Epic 1 Context: Vòng đời đơn hàng có kiểm soát & An toàn truy cập API

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Epic 1 thiết lập máy trạng thái đơn hàng thuần túy ở server kèm lịch sử biến động bất biến tương thích ngược với dữ liệu đơn cũ, đồng thời khóa chặt toàn bộ tuyến `/admin/*` và API `/api/admin/*` theo cơ chế fail-closed (`503 → 401`) trước khi xây dựng tầng tồn kho thực tế hay giao diện quản trị. Kết quả bảo đảm đơn hàng không thể nhảy cóc hoặc quay lùi trạng thái, phân tách rạch ròi quyền thao tác của khách hàng và nhân viên vận hành, và ngăn chặn hoàn toàn truy cập trái phép vào nghiệp vụ xử lý đơn.

## Stories

- Story 1.1: Máy trạng thái đơn hàng & Lịch sử trạng thái
- Story 1.2: Xác thực quản trị Fail-Closed & Bảo vệ tuyến `/admin/*`
- Story 1.3: API vận hành chuyển trạng thái & Hủy đơn cho nhân viên

## Requirements & Constraints

- **Ma trận chuyển trạng thái 5×5 & Quyền tác nhân:**
  - Chuyển tiến hợp lệ cho `staff`: `pending → confirmed`, `confirmed → shipping` (hỗ trợ `note` tùy chọn `<= 200` ký tự), và `shipping → delivered`.
  - Hủy đơn (`cancelled`): `customer` chỉ được hủy từ `pending`; `staff` được hủy từ `pending`, `confirmed` hoặc `shipping` kèm `note` bắt buộc (`note.trim().length` từ `1..200` ký tự). `delivered` và `cancelled` là trạng thái kết thúc.
  - Mọi chuyển đổi trái ma trận, từ trạng thái kết thúc, khách hủy đơn khác `pending`, hoặc `expectedStatus` (nếu gửi kèm) khác `order.status` hiện tại đều bị từ chối với lỗi `INVALID_STATUS_TRANSITION` (`409`).
  - Lỗi định dạng JSON, `status` ngoài enum, `note` của `staff` khi hủy bị thiếu/rỗng hoặc `note.trim().length > 200`, hay khách gửi trạng thái khác `"cancelled"` qua `PATCH /api/orders/:id` đều trả `VALIDATION_ERROR` (`400`).
- **Lịch sử trạng thái bất biến & Tín hiệu hoàn kho:**
  - `placeOrder()` khởi tạo `statusHistory` gồm 1 phần tử `{ status: "pending", at: order.createdAt, actor: "customer", action: "transition" }`.
  - Mọi lần chuyển trạng thái hợp lệ trả về bản ghi `Order` mới (không đột biến đầu vào), cập nhật `updatedAt` (ISO 8601 UTC) và nối thêm 1 `OrderStatusEvent` (`status`, `at`, `actor`, `action: "transition"`, và `note?` đã `.trim()` khi khác rỗng) vào cuối `statusHistory`.
  - Hủy đơn mới (có `statusHistory`) từ `pending` hoặc `confirmed` đặt `inventoryRestocked = true` và trả `shouldRestock: true`; hủy từ `shipping` đặt `inventoryRestocked = false` và trả `shouldRestock: false`.
- **Tương thích ngược đơn hàng lịch sử:**
  - Đọc/ghi `storage/orders.json` không được ném lỗi hoặc làm mất dữ liệu khi đơn cũ thiếu `statusHistory`/`inventoryRestocked` hoặc chứa các trường phụ (như `discount`, `couponCode`).
  - Khi hủy đơn cũ ở `pending` (`statusHistory === undefined`), đặt `inventoryRestocked = true` nhưng trả `shouldRestock: false` để tránh cộng khống tồn kho chưa từng bị trừ.
  - `markOrderRestocked()` chỉ chấp nhận đơn `cancelled` có `inventoryRestocked === false`; mọi trường hợp khác (cả `true` lẫn `undefined`) bị từ chối với `INVALID_STATUS_TRANSITION` (`409`).
  - `synthesizeStatusHistory(order)` tổng hợp danh sách mốc fallback an toàn từ `createdAt` và `updatedAt` mà không bịa mốc thời gian trung gian.
- **Bảo vệ quản trị Fail-Closed (`503 → 401`):**
  - Không dùng mật khẩu mặc định; khi `ADMIN_PASSCODE` chưa thiết lập hoặc chỉ chứa khoảng trắng, mọi xác thực (trừ `POST /api/admin/auth/logout`) phải trả `503` (`ADMIN_NOT_CONFIGURED`) trước khi kiểm tra cookie hay payload.
  - Kiểm tra mật khẩu đăng nhập bằng băm `SHA-256` cả hai chuỗi rồi so sánh qua `crypto.timingSafeEqual` để tránh lỗi `RangeError` (`500`) khi khác độ dài byte; sai mật khẩu trả `401` (`UNAUTHORIZED`).
  - Cookie phiên `shoplite_admin` có hạn `28800` giây (8 giờ), thuộc tính `HttpOnly; SameSite=Lax; Path=/` (thêm `Secure` khi `NODE_ENV === "production"`), giá trị `<expiresAtEpochMs>.<hmacSha256Hex>` ký `HMAC-SHA256` trên `"shoplite_admin:" + expiresAtEpochMs` bằng khóa `ADMIN_PASSCODE.trim()`.
  - Bảo vệ trang `/admin/*` (trừ `/admin/login`): chuyển hướng `307` về `/admin/login` khi thiếu `ADMIN_PASSCODE` hoặc thiếu cookie; chuyển hướng `307` về `/admin/login?expired=1` khi cookie hết hạn hoặc sai chữ ký.
  - `POST /api/admin/auth/logout` luôn trả `200` kèm `Set-Cookie` xóa cookie (`Max-Age=0; HttpOnly; SameSite=Lax; Path=/`), kể cả khi phiên đã hết hạn hoặc không có cookie.
- **Chất lượng, Ngôn ngữ & Không hồi quy:**
  - Toàn bộ thông báo lỗi API dùng tiếng Việt có dấu, không bao giờ lộ `ADMIN_PASSCODE`.
  - Giữ nguyên pass 100% các test hiện có; bổ sung unit test phủ đủ 25 cặp chuyển đổi (5×5) cho cả `staff` và `customer`, biên độ dài `note` (0, 200, 201 ký tự), `markOrderRestocked`, fallback đơn cũ, và kiểm thử `503`/`401`/body không hợp lệ.

## Technical Decisions

- **Tách lõi nghiệp vụ thuần khỏi framework:** Các module nghiệp vụ (`order-state-machine.ts`, `order-service.ts`) không được import `next/*` hay `react`. Route Handlers chỉ parse/validate request qua `readJsonBody(request)`, gọi `assertAdminRequest(request)` ở dòng đầu tiên (với `/api/admin/*`), gọi service và trả kết quả qua `NextResponse` hoặc `handleRouteError(error)`.
- **Mô hình lỗi chuẩn hóa:** Giữ nguyên chữ ký `new OrderError(code, message, details?: Record<string, string>)` tự tra `httpStatus` qua `HTTP_STATUS_BY_CODE` gồm 7 mã: `VALIDATION_ERROR` (`400`), `UNAUTHORIZED` (`401`), `ORDER_NOT_FOUND` (`404`), `INSUFFICIENT_STOCK` (`409`), `INVALID_STATUS_TRANSITION` (`409`), `PRODUCT_NOT_FOUND` (`422`), và `ADMIN_NOT_CONFIGURED` (`503`).
- **Next.js 16 Proxy:** Chặn truy cập trang quản trị bằng `src/proxy.ts` xuất `export function proxy(request: NextRequest)` và `export const config = { matcher: ["/admin/:path*"] }` (tuyệt đối không khai báo `export const runtime`, không tạo `middleware.ts`), dùng chung logic xác thực từ `src/features/orders/admin-auth.ts`.
- **Quy ước parse body API:** `POST /api/admin/auth/login` (`{ passcode: string }`) và `PATCH /api/admin/orders/:id/status` (`{ status, note?, expectedStatus? }`) bắt buộc có JSON body hợp lệ (`400 VALIDATION_ERROR` nếu thiếu/sai); `POST /api/admin/auth/logout` không đọc body.
- **Hợp đồng ranh giới TypeScript cố định:**
  - `src/features/orders/types.ts`: bổ sung `OrderActor` (`"customer" | "staff"`), `OrderHistoryAction` (`"transition" | "restock"`), `OrderStatusEvent` (`status`, `at`, `actor`, `action`, `note?`), và hai trường tùy chọn `statusHistory?`, `inventoryRestocked?` trên `Order`.
  - `src/features/orders/order-state-machine.ts`: cung cấp `canTransition`, `getAllowedNextStatuses`, `transitionOrder` (trả `{ order, shouldRestock }`), `markOrderRestocked`, `synthesizeStatusHistory`.
  - `src/features/orders/admin-auth.ts`: cung cấp `ADMIN_COOKIE_NAME`, `ADMIN_SESSION_TTL_SECONDS`, `isAdminConfigured`, `verifyAdminPasscode`, `createAdminSessionToken`, `verifyAdminSessionToken` (trả `"valid" | "expired" | "missing" | "unconfigured"`), `assertAdminRequest`.
  - `src/features/orders/order-service.ts`: bảo toàn tương thích ngược cho caller/test chỉ truyền `{ repository }`, nâng cấp `placeOrder()` và `cancelOrder()`, bổ sung `transitionOrderStatus(id, { status, actor, note?, expectedStatus? })`.
- **Cô lập kiểm thử:** Unit test cho state machine/service dùng `InMemoryOrderRepository`; route test không ghi bẩn vào thư mục `storage/` thật.

## Cross-Story Dependencies

- **Trong nội bộ Epic 1:**
  - Story 1.3 phụ thuộc Story 1.1 (`types.ts`, `order-errors.ts`, `order-state-machine.ts`) để kiểm tra chuyển đổi trạng thái, `expectedStatus`, validation `note` và ghi `statusHistory`.
  - Story 1.3 phụ thuộc Story 1.2 (`assertAdminRequest` và mã lỗi `503`/`401`) để bảo vệ `PATCH /api/admin/orders/:id/status`.
- **Với các Epic khác:**
  - Epic 1 không phụ thuộc bất kỳ Epic nào phía sau.
  - Epic 2 sẽ gắn `InventoryRepository` và `StorageLock` vào `OrderService` dựa trên `shouldRestock` từ `transitionOrder()` và tái sử dụng `markOrderRestocked()` + `assertAdminRequest()`.
  - Epic 3 sẽ tiêu thụ `src/proxy.ts`, `isAdminConfigured()`, `/api/admin/auth/*`, và `PATCH /api/admin/orders/:id/status` (luôn gửi kèm `expectedStatus`).
  - Epic 4 sẽ tiêu thụ `order.statusHistory` và `synthesizeStatusHistory()` để hiển thị Timeline tiến trình cho khách hàng.
