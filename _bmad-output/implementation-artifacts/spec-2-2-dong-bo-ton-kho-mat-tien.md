---
title: 'Story 2.2: Đồng bộ tồn kho động lên mặt tiền bán hàng & Xử lý hết hàng tại /checkout'
type: 'feature'
created: '2026-11-21'
status: 'done'
baseline_revision: '3e3d30d7af5d2144395d9468526f59e6869c3bfb'
review_loop_iteration: 1
followup_review_recommended: false
context:
  - '{project-root}/README.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-shoplite-2026-11-21/ARCHITECTURE-SPINE.md'
warnings: []
deferred:
  - 'cart-store-reconciliation: Client cartStore snapshots product.stock in localStorage without re-syncing against /api/products until POST /api/orders returns 409; out of Story 2.2 scope.'
  - 'checkout-409-inline-recovery-controls: CheckoutForm preserves form inputs and cartStore on 409 INSUFFICIENT_STOCK per Story 2.2 AC; inline cart link or item adjustment UI is deferred.'
  - 'product-purchase-panel-over-cart-edge: When 0 < dynamicStock < quantityInCart, AddToCartButton disables cleanly with max-in-cart notice; disabling QuantityInput control is minor UI polish.'
  - 'product-detail-generate-metadata: generateMetadata uses static getProductBySlug for title/description only, avoiding extra storageLock read on metadata.'
---

# Story 2.2: Đồng bộ tồn kho động lên mặt tiền bán hàng & Xử lý hết hàng tại `/checkout`

<intent-contract>

## Intent

**Problem:** Các trang bán hàng (`/`, `/products`, `/products/[slug]`) và API `/api/products`, `/api/products/[slug]` vẫn đọc `stock` tĩnh từ `src/features/catalog/catalog-service.ts`, đồng thời `/products/[slug]` còn `generateStaticParams()`. Vì vậy khi đơn hàng trừ kho hoặc hoàn kho trong `storage/inventory.json`, mặt tiền vẫn hiện số tồn cũ và chưa có kiểm thử chứng minh `CheckoutForm` giữ nguyên toàn bộ form và giỏ hàng khi gặp `409 INSUFFICIENT_STOCK`.

**Approach:** Tạo lớp phủ tồn kho bất đồng bộ `src/features/catalog/catalog-inventory.ts` giữ nguyên 100% chữ ký đồng bộ của `catalog-service.ts`, chuyển `/`, `/products`, `/products/[slug]` sang `force-dynamic` (gỡ `generateStaticParams()`), nối `GET /api/products` và `GET /api/products/[slug]` vào lớp phủ động, và kiểm chứng giữ nguyên state `/checkout` khi gặp `409`.

## Boundaries & Constraints

**Always:**
- Tuân thủ tuyệt đối `AD-1`, `AD-5`, `AD-7`, `AD-10`: cấm sửa đổi chữ ký đồng bộ của `src/features/catalog/catalog-service.ts` hay làm gãy 18 unit tests trong `catalog-service.test.ts`; `catalog-inventory.ts` không import `next/*` hay `react`.
- Khai báo `export const dynamic = "force-dynamic"` trên `src/app/page.tsx`, `src/app/products/page.tsx` và `src/app/products/[slug]/page.tsx`, đồng thời gỡ `generateStaticParams()` khỏi `src/app/products/[slug]/page.tsx`.
- Khi tồn kho thực tế về `0`, `ProductCard` / `ProductDetailPage` hiển thị `StockBadge` nhãn `"Hết hàng"` và vô hiệu hóa nút thêm vào giỏ; `queryProductsWithStock` lọc `inStock` và trả `total`/`items` theo tồn kho thực tế.
- Khi `/checkout` nhận `409 INSUFFICIENT_STOCK`, `CheckoutForm` hiện `role="alert"` nêu rõ thông báo lỗi và giữ nguyên toàn bộ các trường form (`fullName`, `phone`, `email`, `address`, `note`) lẫn `cartStore.getSnapshot().items`.

**Never:**
- Không đụng UI `/admin/*` (thuộc Epic 3) hoặc `/orders/[id]` timeline (thuộc Epic 4).
- Không ghi dữ liệu vào `storage/orders.json` hoặc `storage/inventory.json` thật trong unit/route test.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| :--- | :--- | :--- | :--- |
| Overlay tồn kho trên `catalog-inventory.ts` | `inventory.json` giảm `p011` từ `3 → 0`, tăng lại `0 → 2` | `getAllProductsWithStock`, `getFeaturedProductsWithStock`, `getProductBySlugWithStock`, `getProductByIdWithStock`, `getRelatedProductsWithStock` phản ánh đúng `0` rồi `2`; không đột biến `products` gốc | Không có |
| Lọc `inStock=1` trong `queryProductsWithStock` | `p006` có stock động `0`, gọi `queryProductsWithStock({ inStock: true, ... })` | `p006` bị loại khỏi `items` và `total` giảm tương ứng; khi `restock` lại `> 0` thì xuất hiện lại | Không có |
| API `/api/products` & `/api/products/[slug]` | `inventoryRepository` trả stock động (`0` vs `5`) | `GET /api/products` và `GET /api/products/[slug]` trả JSON mang `stock` mới nhất | Slug không có → `404 PRODUCT_NOT_FOUND` |
| Mặt tiền `force-dynamic` hết hàng | Sản phẩm có `stock === 0` tại `/` / `/products` / `/products/[slug]` | `StockBadge` hiện `"Hết hàng"`, `AddToCartButton` bị disabled; `/products/[slug]` không còn `generateStaticParams` | Không có |
| `CheckoutForm` gặp `409 INSUFFICIENT_STOCK` | Khách điền đủ form (kèm `email`, `note`) và bấm **Đặt hàng** khi API trả `409` | Hiện `role="alert"`, không chuyển trang, giữ nguyên toàn bộ giá trị input và giỏ hàng `cartStore` | Giữ trạng thái `"idle"` để sửa/thử lại |

</intent-contract>

## Code Map

- `src/features/catalog/catalog-service.ts` -- Giữ nguyên trạng (100% synchronous); tái sử dụng `getAllProducts`, `getFeaturedProducts`, `getProductBySlug`, `getProductById`, `getRelatedProducts`, `queryProducts`.
- `src/features/catalog/catalog-inventory.ts` -- *[Tạo mới]* Overlay bất đồng bộ từ `inventoryRepository.getStockMap()` cung cấp `getAllProductsWithStock`, `getFeaturedProductsWithStock`, `queryProductsWithStock`, `getProductBySlugWithStock`, `getProductByIdWithStock`, `getRelatedProductsWithStock` (nhận tham số `inventoryRepo` tùy chọn để test sạch không cần đụng file thật).
- `src/app/page.tsx`, `src/app/products/page.tsx`, `src/app/products/[slug]/page.tsx` -- Thêm `export const dynamic = "force-dynamic"`, gỡ `generateStaticParams` ở `[slug]/page.tsx`, đổi sang gọi `*WithStock`.
- `src/app/api/products/route.ts`, `src/app/api/products/[slug]/route.ts` -- Chuyển `GET` sang `async` dùng `queryProductsWithStock` và `getProductBySlugWithStock`.
- `src/features/catalog/catalog-inventory.test.ts`, `src/app/api/products/route.test.ts`, `src/features/checkout/components/checkout-form.test.tsx`, `src/features/catalog/components/product-card.test.tsx` -- Kiểm thử đồng bộ tồn kho động, lọc `inStock`, route API, hết hàng trên UI và giữ nguyên state `/checkout` khi `409`.

## Tasks & Acceptance

**Execution:**
- `src/features/catalog/catalog-inventory.ts` & `src/features/catalog/catalog-inventory.test.ts` -- Cài đặt đủ 6 hàm `*WithStock` không làm biến đổi mảng `products` gốc và test đủ trường hợp giảm/hết/hoàn kho + lọc `inStock` -- Thực thi `AD-7` và `AD-10`.
- `src/app/api/products/route.ts`, `src/app/api/products/[slug]/route.ts` & `src/app/api/products/route.test.ts` -- Nối API catalog sang `catalog-inventory.ts` và viết route tests (`@vitest-environment node`) phủ tồn kho động + `404` -- Bảo đảm JSON API trả tồn kho thực.
- `src/app/page.tsx`, `src/app/products/page.tsx`, `src/app/products/[slug]/page.tsx` -- Chuyển cả 3 trang sang `export const dynamic = "force-dynamic"`, gỡ `generateStaticParams` ở `[slug]/page.tsx` và dùng `*WithStock` -- Triệt tiêu HTML/cache tồn kho tĩnh.
- `src/features/checkout/components/checkout-form.test.tsx` & `src/features/catalog/components/product-card.test.tsx` -- Khẳng định `CheckoutForm` giữ nguyên toàn bộ trường nhập liệu (`fullName`, `phone`, `email`, `address`, `note`) và `cartStore` khi gặp `409 INSUFFICIENT_STOCK`, cùng UI hết hàng (`StockBadge` `"Hết hàng"` + nút bị khóa) -- Đóng vòng kiểm chứng UX Story 2.2.

**Acceptance Criteria:**
- Given tồn kho trong `inventory.json` đổi về `0` hoặc tăng lại, when gọi `GET /api/products`, `GET /api/products/:slug` hoặc render `/`, `/products`, `/products/[slug]`, then mọi nơi hiển thị đúng tồn kho mới nhất không cần rebuild.
- Given toàn bộ `catalog-service.test.ts` (18 tests cũ) và test mới của Story 2.2, when chạy `npm run check`, then ESLint, `next typegen && tsc --noEmit`, và Vitest suite pass 100%.

## Spec Change Log
- `2026-11-21`: Bổ sung `getProductDetailWithStock` trong `catalog-inventory.ts` để `/products/[slug]` đọc `inventoryRepo.getStockMap()` một lần nguyên tử cho cả sản phẩm chính và sản phẩm liên quan; thêm boundary guard cho `limit <= 0` và `pageSize <= 0`, thống nhất xử lý query lặp ở `/api/products` theo giá trị đầu tiên (`getAll`).

## Review Triage Log
- **Pass 1 (`bh-2-2`, `ec-2-2`, `vg-2-2`, `ia-2-2`):**
  - `[patch]` Đọc tồn kho 2 lần không nguyên tử ở `src/app/products/[slug]/page.tsx` → đã gộp qua `getProductDetailWithStock`.
  - `[patch]` Chuẩn hóa `withStock` fallback và thêm boundary guard `limit <= 0` / `pageSize <= 0` ở `catalog-inventory.ts`.
  - `[patch]` Thống nhất duplicate query params (`getAll`) giữa `GET /api/products` và `ProductsPage`.
  - `[patch]` Bổ sung test server component cho `/`, `/products`, `/products/[slug]` (`src/app/storefront-dynamic.test.tsx`), `ProductPurchasePanel` (`product-purchase-panel.test.tsx`), `withStock` clamping/partial map (`catalog-inventory.test.ts`), và `500 INTERNAL_ERROR` / query lặp (`route.test.ts`).
  - `[defer]` Reconcile `cartStore` ở client, link/chỉnh số lượng inline tại `/checkout` khi `409`, `QuantityInput` khi `stock < quantityInCart`, và `generateMetadata` dùng `getProductBySlug` tĩnh (đã ghi vào `deferred`).
  - `[dismiss]` Sản phẩm hết hàng vẫn hiển thị trong Featured/Related với nhãn `"Hết hàng"` trừ khi lọc `inStock=1` (đúng yêu cầu AC).

## Verification

**Commands:**
- `npm run check` (`eslint`, `next typegen && tsc --noEmit`, `vitest run`): 26 test files / 271 tests passed.

## Auto Run Result
- **Trạng thái:** `done` (Epic 2 hoàn tất).
- **Review loop:** Pass 1 hoàn tất, mọi phát hiện `patch` đã được sửa và xác minh sạch (`followup_review_recommended: false`).
