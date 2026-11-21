---
title: 'Story 1.6: Tồn kho một chủ đọc và giỏ hàng theo Tồn kho thật'
type: 'feature'
created: '2026-11-21'
status: 'done'
route: 'dispatch'
baseline_commit: 'b99d53e07ec5ffafcdfae611417be5fc8cb915bb'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Trang, giỏ và kiểm tra đặt hàng đang đọc số `stock` tĩnh trong `products.ts`, còn giỏ giữ bản sao trong localStorage, nên Khách hàng có thể thấy và chọn theo số cũ.

**Approach:** Đưa mọi đọc tồn về `features/inventory/server.ts#readStock` trên PostgreSQL theo AD-27, ghép `StockedProduct` ở catalog server, bỏ `stock` khỏi `Product` và `CartItem`, thêm `GET /api/inventory` và giới hạn giỏ bằng `capQuantity`.

## Boundaries & Constraints

**Always:** Sản phẩm thiếu dòng `inventory` tính là 0. `catalog-service.ts` giữ thuần, `queryProducts` bắt buộc nhận `source: StockedProduct[]`. SQL chỉ ở `*.pg.ts`, đọc qua `withDb`. `src/app` chỉ gọi `server.ts`. `/`, `/products`, `/products/[slug]`, `/api/products`, `/api/products/[slug]`, `/api/inventory` có `export const dynamic = "force-dynamic"`. `generateMetadata` chỉ đọc catalog tĩnh. `GET /api/inventory?ids=a,b` tối đa 50 id, `Cache-Control: no-store`, trả `{ stock: Record<productId, number> }`, id không có dòng trả 0. Giữ khóa `shoplite:cart`.

**Never:** Không dùng `cacheComponents`, `use cache`, `unstable_cache`, `revalidate` cho tồn. Không thêm dependency, bảng hay migration. Không ghi `inventory` trong story này. Không chuyển đơn sang PostgreSQL. Không sửa `.env`, không tạo lại `.env.local`, không chạm `storage/orders.json`. Không chạy `git stash` hay lệnh đổi index.

**Quyết định (landv ủy quyền chọn phương án bảo thủ, 2026-11-21):**
- Để `check` xanh giữa 1.6 và 1.7, `createOrderService` nhận thêm dep đọc tồn, nối với `readStock` ở `orders/server.ts`, và giữ kiểm tra thiếu hàng hiện có. Story 1.7 thay bằng `reserveStock`.
- Tiêu chí "đơn cuối vừa đặt thì tải lại hiện Hết hàng" cần trừ kho thật nên được kiểm ở Story 1.7. Story này chứng minh trang đọc đúng khi tồn trong database về 0.
- Test "chỉ script seed import `inventory-seed.ts`" cho phép đúng `scripts/db-test-lib.ts`, nơi đang giữ hàm seed dùng chung.
- Lỗi đọc tồn ở trang server đi vào `error.tsx` với lỗi đã làm sạch. Lỗi tải tồn ở giỏ dùng giới hạn 10 và không chặn đặt hàng.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Trang sản phẩm | Tồn database về 0 | Tải lại hiện `Hết hàng`, không thêm được | N/A |
| Thiếu dòng tồn | Sản phẩm không có dòng `inventory` | Tính là 0 | N/A |
| `inStock` | Lọc danh sách | Dùng tồn PostgreSQL | N/A |
| API tồn | `ids` hợp lệ, có id lạ | Trả số tồn, id lạ là 0, `no-store` | N/A |
| API tồn sai | Thiếu `ids` hoặc quá 50 id | 400 `VALIDATION_ERROR`, không chạm DB | N/A |
| Giỏ cũ | Dòng có `stock`, thiếu field, số lượng ngoài 1..10 | Bỏ `stock`, loại dòng thiếu field, kẹp 1..10 | N/A |
| Tăng số lượng | `capQuantity(current, requested, stock)` | Tăng tới `max(current, min(stock, 10))`, không tự giảm, giảm tối thiểu 1 | N/A |
| Tải tồn lỗi | `stock` không biết | Giới hạn 10, vẫn đặt được | Server kiểm lần cuối |

</frozen-after-approval>

## Code Map

- `src/features/inventory/inventory-reader.pg.ts`, `src/features/inventory/server.ts` (mới) -- `readStock`.
- `src/features/catalog/server.ts` (mới), `types.ts`, `catalog-service.ts` -- `StockedProduct`, `queryProducts(source)`.
- `src/data/products.ts` -- xóa `stock`.
- `src/features/catalog/components/*`, `src/features/cart/components/*` -- nhận `stock` từ `StockedProduct` hoặc API.
- `src/features/cart/cart-reducer.ts`, `cart-store.ts`, `types.ts` -- `capQuantity`, làm sạch giỏ, bỏ `stock`.
- `src/app/api/inventory/route.ts` (mới), `src/app/api/products/**`, `src/app/page.tsx`, `src/app/products/**` -- đọc qua server, `force-dynamic`, xóa `generateStaticParams`.
- `src/features/orders/order-service.ts:70-75`, `src/features/orders/server.ts` -- dep đọc tồn tạm.
- `src/app/checkout/**`, `src/features/checkout/**` -- `/checkout` dùng cùng cách lấy tồn nếu có chỉnh số lượng.

## Tasks & Acceptance

**Execution:**
- [x] `src/features/inventory/*`, `src/app/api/inventory/route.ts` -- đọc tồn và API, kèm `*.db.test.ts`.
- [x] `src/features/catalog/*`, `src/data/products.ts`, các trang và route sản phẩm -- `StockedProduct`, `force-dynamic`.
- [x] `src/features/cart/*` -- `capQuantity`, làm sạch giỏ, lấy tồn cho `/cart`, cập nhật test.
- [x] `src/features/orders/order-service.ts`, `src/features/orders/server.ts` và test -- dep đọc tồn.
- [x] `src/data/inventory-seed.test.ts` -- khẳng định chỉ `scripts/db-test-lib.ts` import seed.

**Acceptance Criteria:**
- Given mã nguồn, when grep, then `Product` và `CartItem` không còn `stock`, không có `generateStaticParams` ở trang sản phẩm.
- Given client bundle, when build, then không file `"use client"` nào kéo `pg` hay `src/db`.

### Review Findings

Code review Epic 1, 2026-11-21, đối chiếu tại `8a722dc`.

- [x] [Review][Patch] P8. 51 id trùng nhau lọt giới hạn 50 id vì đếm sau khử trùng [src/app/api/inventory/route.ts:13]
- [x] [Review][Patch] P19. Test không phát hiện `addItem` bỏ truyền stock [src/features/cart/use-cart.ts:27]
- [x] [Review][Patch] P20. Không có kiểm chứng trang chủ giữ dynamic trên production build [src/app/page.tsx:14]
- [x] [Review][Patch] P21. Thiếu test route `/api/products` và `/api/products/[slug]` [src/app/api/products/route.ts:13]
- [x] [Review][Defer] Chưa ghim biên hợp lệ 50 id và id 64 ký tự [src/app/api/inventory/route.ts:23] — deferred: giỏ thực tế chưa chạm biên này, đóng khi sửa route lần tới

**Rejected**

- false: giới hạn 10 khi đang tải tồn — đúng quy tắc tồn không biết, server kiểm lần cuối.
- low: không làm mới tồn khi focus — server vẫn chặn khi đặt.
- low: productId xấu trong localStorage — cần tự sửa storage.
- low: chưa cảnh báo số lượng vượt tồn trong giỏ — checkout đã xử lý bằng 409.
- false: đọc tồn trước khi kiểm sản phẩm — ở HEAD `findProduct` chạy trước transaction.
- false: thiếu dòng inventory không báo — spec quy định trả 0.
- false: trang rơi vào `error.tsx` khi DB lỗi — đúng spec.
- low: `/api/products` thiếu `no-store` tường minh — route đã `force-dynamic`, chưa thấy cache sai.
- low: trang chi tiết đọc tồn hai lần — chỉ tốn thêm một truy vấn.
- low: `/api/inventory` chưa rate limit — chỉ đọc, tối đa 50 id.
- low: 400 và 500 thiếu `no-store` — không có dữ liệu tồn.
- low: `stock` cũ còn trong localStorage — không còn được đọc.
- low: test tải tồn lỗi chưa chờ fetch — hành vi đã đúng khi đọc code.

## Implementation Notes

- Kết quả trên Node 22.23.4: `npm run check:full` exit 0 (137/137 test thường, 6/6 test DB), build đạt, client bundle không có `pg` hay Drizzle.
- Trên `shoplite_test`: `/`, `/products`, trang sản phẩm, `/cart`, `/checkout`, `/orders` trả 200. Đặt tồn `p001` về 0 thì trang hiện `Sản phẩm tạm hết hàng`, trả lại tồn thì thông báo mất. Dữ liệu `shoplite_dev` không đổi.
- Từ story này, app cần PostgreSQL đang chạy để render trang danh mục.
- Tiêu chí "đơn cuối vừa đặt thì hiện Hết hàng" được kiểm ở Story 1.7, khi có trừ kho thật.

## Spec Change Log

## Review Triage Log

| Phát hiện | Verdict | Route | Bằng chứng |
|---|---|---|---|
| Giỏ giữ `price` sai, `image` thiếu field, dòng trùng | medium | patch | Đã làm sạch, có test |
| `quantity` hoặc `stock` `NaN` | medium | patch | Đã chặn, có test |
| Id quá dài ở `/api/inventory` | low | patch | Trả 400 trước khi chạm DB |
| Thiếu test route tồn, ghép tồn, truyền `stock` vào giỏ | medium | patch | Đã thêm test |
| Guard import seed bỏ sót dạng import khác | low | patch | Đã phủ mọi file chứa chuỗi `inventory-seed` |
| Giỏ không báo khi dòng vượt tồn | medium | defer | Xử lý xung đột tại form thuộc Story 1.9 |
| Tồn ở trang mở lâu có thể cũ | low | reject | Server kiểm lần cuối khi đặt theo AD-9 |
| Mọi trang danh mục query DB | false | reject | AD-27 yêu cầu `force-dynamic`, cấm cache tồn |
| DB lỗi làm trang danh mục lỗi | low | reject | Đi vào `error.tsx` với lỗi đã làm sạch theo quyết định của spec |
| Đặt đơn đồng thời có thể bán quá tồn | medium | defer | Story 1.7 thay bằng `reserveStock` |
| `/api/inventory` công khai, không rate limit | low | reject | AD-27 định nghĩa route công khai, tối đa 50 id |
| Tồn không biết dùng giới hạn 10 | false | reject | AD-27 quy định rõ |
| Dòng vượt tồn không tự giảm | false | reject | AD-27 yêu cầu không tự giảm số đã có |
| Định dạng làm diff dài | low | reject | Không đổi hành vi |

## Verification

**Commands:**
- `npm run check:full` -- expected: xanh.
- `npm run build` -- expected: thành công; khôi phục `next-env.d.ts` nếu lệnh tự đổi.
- Chạy app với `DATABASE_URL` của `shoplite_test`, đặt tồn một sản phẩm về 0 rồi tải lại trang -- expected: `Hết hàng`. Không đổi tồn trong `shoplite_dev`.
