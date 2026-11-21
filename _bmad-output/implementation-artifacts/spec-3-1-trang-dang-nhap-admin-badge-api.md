---
title: 'Story 3.1: Trang đăng nhập /admin/login, Nâng cấp OrderStatusBadge & API danh sách hàng chờ quản trị'
type: 'feature'
created: '2026-11-21'
status: 'done'
baseline_revision: '94e954271c9d6213b0c9cd22c1b77d51b4ee95ab'
review_loop_iteration: 1
followup_review_recommended: false
context:
  - '{project-root}/README.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-shoplite-2026-11-21/ARCHITECTURE-SPINE.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
warnings: []
deferred:
  - 'inventory-read-side-effect-enoent: getStockMap() tự seed storage/inventory.json khi ENOENT; giữ nguyên cơ chế lazy seed từ Epic 2.'
  - 'admin-auth-header-minor-test-cases: một số kiểm tra phụ như aria-hidden trên header Store/LogOut hay non-JSON 500 trong AdminHeaderBar đã an toàn theo code review và để nhẹ bộ test.'
---

# Story 3.1: Trang đăng nhập `/admin/login`, Nâng cấp `OrderStatusBadge` & API danh sách hàng chờ quản trị

<intent-contract>

## Intent

**Problem:** Hệ thống đã có cơ chế xác thực API (`admin-auth.ts`, `src/proxy.ts`, `/api/admin/auth/*`), nhưng chưa có trang đăng nhập `/admin/login` (Fail-Closed khi thiếu `ADMIN_PASSCODE`, cảnh báo `?expired=1`), `OrderStatusBadge` chưa có icon `lucide-react` và trạng thái `cancelled` mới đạt `text-slate-500` (chưa đạt WCAG 2.2 AA `6.92:1`), và chưa có `orderService.listAdminOrders()` + `GET /api/admin/orders` trả danh sách lọc/FIFO/counts/tồn kho khả dụng trong 1 lượt.

**Approach:** Triển khai đồng bộ 3 mảnh nền của Epic 3: (1) `/admin/login` Server Component + `AdminLoginCard` (Client) + `AdminHeaderBar` (Client, sẵn dùng cho `/admin/orders`), (2) nâng cấp `OrderStatusBadge` với `text-slate-600` cho `cancelled` và `lucide-react` icons trên cả 5 trạng thái, và (3) `orderService.listAdminOrders(filter)` cùng `GET /api/admin/orders` bảo vệ bằng `assertAdminRequest()`.

## Boundaries & Constraints

**Always:**
- `/admin/login` (`src/app/admin/login/page.tsx`) dùng `export const dynamic = "force-dynamic"`, kiểm tra `isAdminConfigured()` trên server và truyền `configured`, `expired` xuống `AdminLoginCard`.
- Khi `!configured`, `AdminLoginCard` hiển thị ngay `role="alert"` nêu rõ `"Hệ thống chưa cấu hình mật khẩu quản trị (ADMIN_PASSCODE)"` và đặt `disabled` cho cả ô nhập passcode lẫn nút `"Đăng nhập vận hành"`.
- Khi `expired` là `true`, `AdminLoginCard` hiển thị `role="status"` màu vàng nhắc phiên 8 giờ hết hạn; khi `400`/`401` giữ focus tại ô nhập mật khẩu và báo `role="alert"`; khi `POST /api/admin/auth/login` trả `200`, điều hướng `/admin/orders`.
- `OrderStatusBadge` hiển thị `size-3` icon `lucide-react` (`Clock`, `CheckCircle2`, `Truck`, `PackageCheck`, `XCircle`) + nhãn tiếng Việt từ `ORDER_STATUS_LABELS`; `cancelled` bắt buộc dùng `bg-slate-100 text-slate-600 ring-slate-200`.
- `orderService.listAdminOrders(filter)` đọc `repository.findAll()` và `inventoryRepository.getStockMap()` trong `storageLock.runExclusive`, tìm `q` không dấu qua `normalizeText` trên `id`, `customer.phone`, `customer.fullName`, tính `counts` cho cả 5 trạng thái + `"all"` trên tập khớp `q`, fallback `status` không hợp lệ về `"all"`, và sắp xếp tab `pending` theo FIFO (`createdAt` tăng dần), các tab khác `createdAt` giảm dần.
- `GET /api/admin/orders` gọi `assertAdminRequest(request)` ở đầu handler (`503` trước `401`).

**Never:**
- Không import `next/*` hay `react` trong `src/features/orders/order-service.ts`.
- Không dựng sẵn `/admin/orders` UI đầy đủ trong story này (thuộc Story 3.2).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| :--- | :--- | :--- | :--- |
| `/admin/login` Fail-Closed | `ADMIN_PASSCODE` chưa cấu hình | `role="alert"` nêu rõ `ADMIN_PASSCODE`, input + nút submit `disabled` | Không gọi API |
| `/admin/login?expired=1` | `ADMIN_PASSCODE` có sẵn, `?expired=1` | Hiện `role="status"` màu vàng nhắc hết phiên; nhập đúng + Enter/`click` → `/admin/orders` | Sai passcode (`401`) / rỗng (`400`) → `role="alert"` + giữ focus tại input |
| `OrderStatusBadge` | Render 5 `OrderStatus` | Đủ icon `lucide-react` + text tiếng Việt; `cancelled` có `bg-slate-100 text-slate-600` | Không có |
| `listAdminOrders` & `GET /api/admin/orders` | `?status=pending&q=minh` hoặc `?status=invalid&q=...` | Lọc không dấu; `counts` đủ 6 khóa tính trên tập khớp `q`; `pending` FIFO, tab khác mới nhất trước | `503 ADMIN_NOT_CONFIGURED`, `401 UNAUTHORIZED` |
| `AdminHeaderBar` | Bấm `"Đăng xuất"` | Gọi `POST /api/admin/auth/logout`, chuyển hướng `/admin/login` | Lỗi mạng → `role="alert"` |

</intent-contract>

## Code Map

- `src/app/admin/login/page.tsx` -- *[Tạo mới]* Server Component `force-dynamic` kiểm tra `isAdminConfigured()` và `?expired=1`.
- `src/features/orders/components/admin-login-card.tsx` -- *[Tạo mới]* Form đăng nhập quản trị (`min-h-11`, Fail-Closed, `?expired=1`, giữ focus khi lỗi, Enter submit).
- `src/features/orders/components/admin-header-bar.tsx` -- *[Tạo mới]* Header vận hành `sticky`, nút `"Đăng xuất"` (`min-h-11`).
- `src/features/orders/components/order-status-badge.tsx` -- Nâng cấp màu `cancelled` (`text-slate-600`) và gắn icon `lucide-react` cho cả 5 trạng thái.
- `src/features/orders/order-service.ts` -- Thêm `AdminOrderListFilter`, `AdminOrderListResult`, và `listAdminOrders()`.
- `src/app/api/admin/orders/route.ts` -- *[Tạo mới]* `GET /api/admin/orders?status=&q=` với `assertAdminRequest()`.

## Tasks & Acceptance

**Execution:**
- Triển khai `listAdminOrders` trong `src/features/orders/order-service.ts` và route `GET /api/admin/orders` trong `src/app/api/admin/orders/route.ts`, kèm unit + route tests.
- Nâng cấp `OrderStatusBadge` và viết component test kiểm chứng cả 5 trạng thái (icon + nhãn + `text-slate-600` cho `cancelled`).
- Triển khai `/admin/login`, `AdminLoginCard`, `AdminHeaderBar` và component tests phủ Fail-Closed `503`, `?expired=1`, sai mật khẩu `401` giữ focus, đăng nhập thành công, và đăng xuất.

**Acceptance Criteria:**
- Pass 100% `npm run check` (`eslint`, `next typegen && tsc --noEmit`, `vitest run`).

## Spec Change Log
- `2026-11-21`: Bổ sung chuẩn hóa phone `+84`/`0` và dải ký tự vô hình trong `listAdminOrders`, thêm `export const dynamic = "force-dynamic"` + `Cache-Control: no-store` cả ở nhánh lỗi `GET /api/admin/orders`, nâng cấp `AdminLoginCard` khóa form Fail-Closed ngay khi API trả runtime `503`, phân biệt lỗi HTTP `5xx` và lỗi mạng offline.

## Review Triage Log
- **Pass 1 (`bh-3-1`, `ec-3-1`, `vg-3-1`, `ia-3-1`):**
  - `[patch]` Đọc tuần tự `repository.findAll()` và `inventoryRepository.getStockMap()` trong `storageLock.runExclusive`, bọc `safeNorm`/`isOrderStatus`/`compareCreatedAt`, chuẩn hóa `status` (`trim().toLowerCase()`) và tìm SĐT `+84`/khoảng trắng trong `order-service.ts`.
  - `[patch]` Thêm `dynamic = "force-dynamic"`, URL base fallback và `Cache-Control: no-store` trên response lỗi của `GET /api/admin/orders`.
  - `[patch]` Bổ sung fallback phòng thủ trong `OrderStatusBadge`.
  - `[patch]` Chống bấm đúp qua ref, giữ `pending` khi điều hướng, chuyển Fail-Closed khi `503` runtime, phân biệt lỗi `5xx` vs mất mạng, thêm `aria-invalid`/`aria-describedby`, dời alert lỗi sát nút gửi và gửi passcode đã `trim()` ở `AdminLoginCard` & `AdminHeaderBar`.
  - `[patch]` Mở rộng test cho các tab `confirmed`/`shipping`/`delivered`/`cancelled` (đa đơn sort giảm dần), `+84` SĐT, malformed order, `?status=bogus`/`500` route, `500`/`503`/double-submit ở `AdminLoginCard` và `AdminLoginPage`.
  - `[defer]` Ghi lazy-seed `ENOENT` của `getStockMap()` và chi tiết test phụ của `AdminHeaderBar` vào `deferred`.

## Verification

**Commands:**
- `npm run check` (`eslint`, `next typegen && tsc --noEmit`, `vitest run`): 29 test files / 303 tests passed.

## Auto Run Result
- **Trạng thái:** `done` (Story 3.1 hoàn tất).
- **Review loop:** Pass 1 hoàn tất, đã sửa và xác minh toàn bộ phát hiện (`followup_review_recommended: false`).
