# Stack & Reality Verification Review — ShopLite Ops (`ARCHITECTURE-SPINE.md`)

- **Ngày kiểm chứng:** 2026-11-21
- **Nguồn đối chiếu:** `package.json`, `node_modules/*/package.json`, `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`, và mã nguồn thực tế trong `src/`.

## 1. Verdict
**PASS (với 1 phát hiện mức High về chữ ký `OrderError` và 1 phát hiện mức Medium về tham số mặc định của `createJsonFileOrderRepository` / `createOrderService`).** Toàn bộ phiên bản công nghệ trong `## Stack` khớp chính xác 100% với môi trường cài đặt thực tế; quy ước `src/proxy.ts` khớp tài liệu chính thức của Next.js `16.4.2`.

---

## 2. Đối chiếu bảng `## Stack` với `package.json` & `node_modules`

| Công nghệ trong Spine | Phiên bản trong Spine | `package.json` / `node_modules` thực tế | Kết quả |
| --- | --- | --- | --- |
| Node.js Runtime | `22.23.4` (`>=22.12.0`) | `engines.node: ">=22.12.0"`, runtime `v22.23.4` | **Khớp 100%** |
| TypeScript | `5.9.3` | `node_modules/typescript/package.json`: `5.9.3` | **Khớp 100%** |
| Next.js (App Router) | `16.4.2` | `package.json`: `"16.4.2"` | **Khớp 100%** |
| React / React DOM | `19.3.0` | `package.json`: `"19.3.0"` | **Khớp 100%** |
| Tailwind CSS | `4.3.3` | `node_modules/tailwindcss/package.json`: `4.3.3` | **Khớp 100%** |
| Zod | `4.6.7` | `package.json`: `"^4.6.7"` | **Khớp 100%** |
| Lucide React | `1.61.0` | `package.json`: `"^1.61.0"` | **Khớp 100%** |
| clsx | `2.1.1` | `package.json`: `"^2.1.1"` | **Khớp 100%** |
| Vitest / `@vitest/coverage-v8` | `5.0.5` | `package.json`: `"^5.0.5"` | **Khớp 100%** |
| `@testing-library/react` | `16.3.3` | `package.json`: `"^16.3.3"` | **Khớp 100%** |
| Playwright (`@playwright/test`) | `1.64.1` | `package.json`: `"^1.64.1"` | **Khớp 100%** |
| ESLint / `eslint-config-next` | `9.x` / `16.4.2` | `package.json`: `"^9"` / `"16.4.2"` | **Khớp 100%** |
| Prettier / `prettier-plugin-tailwindcss` | `3.9.10` / `0.8.1` | `package.json`: `"^3.9.10"` / `"^0.8.1"` | **Khớp 100%** |

---

## 3. Đối chiếu Next.js 16 `src/proxy.ts` (`node_modules/next/dist/docs/.../proxy.md`)
- Trong Next.js `16.4.2`, `middleware.ts` đã đổi tên thành `proxy.ts` (đặt tại `src/proxy.ts` cùng cấp với `src/app`).
- Xuất hàm `export function proxy(request: NextRequest)` kèm `export const config = { matcher: ["/admin/:path*"] }`.
- Tài liệu chính thức mục *Runtime* (dòng 253–255 của `proxy.md`) xác nhận: *"Proxy defaults to using the Node.js runtime. The `runtime` config option is not available in Proxy files. Setting the `runtime` config option in Proxy will throw an error."* Quy tắc cấm khai báo `export const runtime` trong `AD-8` hoàn toàn chính xác.

---

## 4. Findings khi đối chiếu mã nguồn Brownfield thực tế

- **[high]** **Chữ ký constructor `OrderError` trong `AD-3`, `AD-4`, `AD-5`, `AD-8` bị dư tham số `httpStatus`** (`src/features/orders/order-errors.ts` dòng 21 vs `ARCHITECTURE-SPINE.md` `AD-3..AD-8`):
  - Trong code thật, `constructor(code: OrderErrorCode, message: string, details?: Record<string, string>)` chỉ nhận 3 tham số với tham số thứ 3 là `details?`, còn `httpStatus` được suy tự động từ bảng hằng `HTTP_STATUS_BY_CODE[this.code]`. Bản nháp Spine viết `OrderError("INVALID_STATUS_TRANSITION", ..., 409)` sẽ gây lỗi biên dịch TypeScript.
  - *Fix:* Sửa mọi mô tả `OrderError` trong `AD-3`, `AD-4`, `AD-5`, `AD-8` về đúng chữ ký `new OrderError(code, message, details?)` và quy định bổ sung `UNAUTHORIZED: 401`, `ADMIN_NOT_CONFIGURED: 503` vào `HTTP_STATUS_BY_CODE`.
- **[medium]** **Bảo toàn tương thích ngược cho `order-service.test.ts`, `order-repository.test.ts` và `src/app/api/orders/route.test.ts`**:
  - Các file test hiện có gọi `createOrderService({ repository })` (không truyền `inventoryRepository`, `storageLock`) và `createJsonFileOrderRepository(filePath)` (1 tham số).
  - *Fix:* Quy định rõ trong `AD-2`/`AD-5`/`AD-6` rằng `inventoryRepository` trong `OrderServiceDeps` phải là tùy chọn và mặc định khởi tạo `createInMemoryInventoryRepository()` (seed từ `PRODUCTS`), còn `storageLock` mặc định là `new StorageLock()` ở cả `createOrderService` và `createJsonFile*Repository`.
