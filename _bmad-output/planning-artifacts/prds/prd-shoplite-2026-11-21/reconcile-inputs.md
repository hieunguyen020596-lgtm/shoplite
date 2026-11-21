# Báo cáo Đối chiếu Đầu vào PRD (`reconcile-inputs.md`)

- **Ngày đối chiếu:** 2026-11-21
- **Tài liệu đầu vào:** `brief.md`, `phan-bien.md`, `forged-idea.md`, `brainstorm-intent.md`
- **Tài liệu đích:** `prd.md`, `addendum.md`
- **Codebase đối chiếu trực tiếp:** `/Users/nab99/Documents/AI Agent training course/shoplite/`

---

## 1. Bảng đối chiếu các quyết định đã khóa

### 1.1 Quyết định từ Party Mode (Q1–Q4)

| Mã | Quyết định đã khóa | Hiện diện trong `prd.md` | Hiện diện trong `addendum.md` | Trạng thái |
| :---: | :--- | :--- | :--- | :---: |
| **Q1** | Trừ tồn kho ngay khi đặt (`pending`) bằng khóa tuần tự nguyên tử; `/admin/orders` hiển thị rõ `"Đã giữ X cho đơn này · Còn cho đơn mới: Y"` chống ảo giác hết hàng. | UJ-1, UJ-2, §3 Glossary, **FR-6**, **FR-13**, **SM-C1** | §1 (`order-service.ts`, `order-repository.ts`, `server.ts`), §2 (`GET /api/admin/orders`), §3 (#1) | **Đầy đủ** |
| **Q2** | Nhân viên hủy được `pending`/`confirmed` (hoàn kho tự động idempotent) và `shipping` (không tự hoàn kho, bắt buộc lý do, kèm bước xác nhận nhận hàng hoàn); không hủy `delivered`; khách chỉ hủy `pending`. | §4.1 Ma trận, **FR-2**, **FR-4**, **FR-7**, UJ-1, UJ-3 | §1 (`types.ts`, `order-service.ts`), §2 (`PATCH .../status`, `POST .../restock`), §3 (#2) | **Đầy đủ** *(đã thống nhất tên cờ thành `inventoryRestocked` thay cho `restocked` ở `phan-bien.md`)* |
| **Q3** | Giữ đủ 5 mục MUST (Timeline 4 bước + nút "Làm mới trạng thái"), cắt `polling 30s` và `tra cứu SĐT + rate-limit RAM`, giữ nguyên `/orders` công khai để không vỡ `e2e/shopping-flow.spec.ts`. | **FR-15**, §4.6 (#3), §5 Non-Goals (#3, #4), §6.1, §6.2, **SM-C2** | §1 (`e2e/shopping-flow.spec.ts`), §3 (#4, #5) | **Đầy đủ** |
| **Q4** | Bảo vệ `/admin/*` & `/api/admin/*` Fail-Closed: trả `503` khi thiếu `ADMIN_PASSCODE` (cấm fallback mặc định); verify `HMAC-SHA256` + `timingSafeEqual` tại `src/proxy.ts` và mọi `/api/admin/*`; cookie 8h + Đăng xuất. | **FR-9**, **FR-10**, **FR-11**, Cross-Cutting NFRs, **SM-3** | §1 (`src/proxy.ts`), §2 (`/api/admin/auth/*` và `401`/`503`), §3 (#6) | **Đầy đủ** |

### 1.2 Quyết định đã khóa tại Forge Idea (Locks 1–6)

| Lock | Nội dung khóa (`forged-idea.md`) | Hiện diện trong `prd.md` / `addendum.md` | Trạng thái |
| :---: | :--- | :--- | :---: |
| **Lock 1** | Trừ kho lúc đặt (`pending`): all-or-nothing, async mutex dùng chung, file tạm UUID (`storage/inventory.json` + `storage/orders.json`), rollback kho nếu lưu đơn lỗi. | `prd.md` **FR-5, FR-6**, NFRs; `addendum.md` §1 (`order-service.ts`, `order-repository.ts`, `server.ts`) | **Đầy đủ** |
| **Lock 2** | Chống ảo giác hết hàng khi duyệt + đọc động catalog (`/products`, `/products/[slug]`) từ `inventoryRepository`. | `prd.md` **FR-8, FR-13**; `addendum.md` §1 (Catalog & Sản phẩm), §2 (`GET /api/admin/orders`) | **Có điểm sót nhỏ** *(xem Gap #1 về trang chủ `/`)* |
| **Lock 3** | Hủy đơn & hoàn kho phân tách: khách chỉ hủy `pending`; nhân viên hủy `pending`/`confirmed` (tự hoàn kho idempotent) & `shipping` (`inventoryRestocked = false`, bắt buộc lý do); cấm hủy `delivered`. | `prd.md` §4.1, **FR-1, FR-2, FR-4, FR-7**; `addendum.md` §2, §3 (#2) | **Đầy đủ** |
| **Lock 4** | Đóng ngõ cụt hàng hoàn (từ Forge): nút **"Xác nhận đã nhận hàng hoàn (+kho)"** cho đơn hủy từ `shipping` có `inventoryRestocked = false`, idempotent 1 lần, ghi `statusHistory`, chuyển `inventoryRestocked = true`. | `prd.md` UJ-3, §3 Glossary, **FR-3, FR-7, FR-14**, §6.1; `addendum.md` §2 (`POST /api/admin/orders/:id/restock`), §3 (#3) | **Đầy đủ** |
| **Lock 5** | Bảo mật admin Fail-Closed (`503` khi thiếu env, `401` khi thiếu/sai cookie, `HttpOnly; SameSite=Lax; Path=/; Max-Age=28800` + `Secure` prod, `HMAC-SHA256`, `timingSafeEqual`, 2 lớp `src/proxy.ts` + `/api/admin/*`). | `prd.md` **FR-9, FR-10, FR-11**, NFRs; `addendum.md` §1, §2, §3 (#6) | **Đầy đủ** |
| **Lock 6** | Timeline 4 bước + nút "Làm mới trạng thái" tại `/orders/[id]`; `statusHistory` optional; giữ nguyên `/orders` công khai & `PATCH /api/orders/:id` cho `e2e/shopping-flow.spec.ts`. | `prd.md` **FR-3, FR-4, FR-15**, §4.6; `addendum.md` §1, §3 (#4, #5) | **Đầy đủ** |

### 1.3 Biện pháp phòng ngừa Pre-mortem (PM-1..PM-6)

| Mã | Rủi ro & Biện pháp phòng ngừa (`brainstorm-intent.md`) | Phủ trong `prd.md` / `addendum.md` | Trạng thái |
| :---: | :--- | :--- | :---: |
| **PM-1** | **Kho lệch/âm:** All-or-nothing + rollback trong `catch`; `inventoryRestocked?: boolean` idempotent; hủy `shipping` giữ `false` + nhãn chờ kiểm kê/nhận hàng hoàn. | `prd.md` **FR-5, FR-6, FR-7, FR-14**; `addendum.md` §1, §2 | **Đầy đủ** *(lệch chữ nhỏ: `"Chờ kiểm kê hàng hoàn"` vs `"Chờ nhận hàng hoàn"`)* |
| **PM-2** | **Mất đơn / hỏng JSON:** 1 khóa tuần tự dùng chung cho `orders.json` + `inventory.json`, file tạm `crypto.randomUUID()` + `fs.rename()`, test `Promise.allSettled()`. | `prd.md` **FR-6**, NFRs; `addendum.md` §1 (`order-repository.ts`, `server.ts`) | **Đầy đủ** |
| **PM-3** | **Bán khi đã hết do static prerender:** Gỡ `generateStaticParams()`, chuyển `force-dynamic`, hợp nhất `catalog-service` đọc động từ `inventoryRepository`, giữ form `/checkout` khi dính `409`. | `prd.md` **FR-8**; `addendum.md` §1 (Catalog & Sản phẩm) | **Có điểm sót nhỏ** *(chưa liệt kê trang chủ `src/app/page.tsx`)* |
| **PM-4** | **Hủy oan đơn / nhầm trạng thái:** Nhãn `"Đã giữ X cho đơn này · Còn cho đơn mới: Y"` (có mã màu), tách nút chính 1 bước với nút Hủy (hộp xác nhận + lý do bắt buộc). | `prd.md` **FR-13, FR-14**, **SM-C1**; `addendum.md` §2 | **Đầy đủ** |
| **PM-5** | **Lỗ hổng API admin / thiếu env:** Helper verify cookie HMAC ở đầu mọi `/api/admin/*` (`401`), `timingSafeEqual`, `503` khi thiếu `ADMIN_PASSCODE`, viết route test `401`/`503`. | `prd.md` **FR-9, FR-10**, NFRs, **SM-3**; `addendum.md` §1, §2 | **Đầy đủ** |
| **PM-6** | **Vỡ đơn cũ & gãy E2E:** `statusHistory?: OrderStatusEvent[]` optional + fallback cho đơn cũ; giữ hợp đồng `POST/GET /api/orders`, `PATCH /api/orders/:id`; giữ xanh `npm run check` & `npm run test:e2e`. | `prd.md` **FR-3, FR-4, FR-15**, §4.6, **SM-4, SM-C2**; `addendum.md` §1 | **Đầy đủ** |

---

## 2. Các khoảng trống (Gaps) & điểm lệch nhỏ cần lưu ý trước khi sang UX / Architecture

1. **Bỏ sót trang chủ `src/app/page.tsx` (`/`) trong phạm vi đồng bộ tồn kho động (`FR-8` & `addendum.md` §1):**
   - Trong code thật, `src/app/page.tsx` gọi `getFeaturedProducts(4)` (đọc tĩnh từ `src/data/products.ts`, không có `force-dynamic`) và render `<ProductGrid />` kèm `<StockBadge />` và `<AddToCartButton />`.
   - Cả `prd.md` (FR-8) và `addendum.md` (§1) mới chỉ liệt kê `/products`, `/products/[slug]`, `/api/products`, `/api/products/[slug]`. Nếu không đưa `src/app/page.tsx` vào danh sách cập nhật (`force-dynamic` + đọc tồn kho động), 4 sản phẩm nổi bật ở trang chủ vẫn hiển thị tồn kho đóng băng lúc build và cho phép bấm "Thêm vào giỏ" dù đã bán hết.

2. **Chưa khớp chi tiết hợp đồng API `GET /api/admin/orders` ở `addendum.md` với yêu cầu UX `FR-12` (tab đếm số lượng & thứ tự FIFO):**
   - `prd.md` (UJ-1 bước 1, FR-12 ASSUMPTION) yêu cầu có tab đếm số lượng từng trạng thái và tab `pending` sắp xếp **FIFO (đơn cũ nhất ở trên)**, trong khi mặc định (`all`) là mới nhất trước.
   - Tuy nhiên `addendum.md` §2 chỉ ghi `GET /api/admin/orders?status=&q=` *"trả danh sách đơn kèm snapshot tồn kho"* mà chưa nêu: (a) response có trả kèm `counts` theo từng trạng thái hay không (nếu lọc server `?status=pending` thì client không thể tự đếm các tab khác), và (b) quy tắc `sort` (FIFO khi `status=pending` vs mới nhất trước). Ngoài ra `orderService.listOrders()` hiện tại đang hardcode `b.createdAt.localeCompare(a.createdAt)` (mới nhất trước).

3. **Thiếu mô tả UX xử lý lỗi phiên hết hạn (`401`) và xung đột đồng thời (`409`) trên giao diện `/admin/orders`:**
   - `prd.md` FR-1 có `expectedStatus` trả `409`, FR-10 có cookie hết hạn sau 8h trả `401`, nhưng §4.4 (FR-12..FR-14) chưa chốt trải nghiệm khi nhân viên đang mở `/admin/orders` và gặp 2 tình huống này (ví dụ: tự chuyển hướng `/admin/login` khi `401`, hay hiển thị banner *"Đơn hàng vừa được cập nhật bởi thao tác khác"* và tự refresh danh sách khi `409`).
   - Tương tự ở FR-9: nếu triển khai `/admin/login` thuần client, nhân viên phải gõ mật khẩu bấm gửi mới thấy `503`; nên làm rõ ở UX/Architecture việc kiểm tra cấu hình `ADMIN_PASSCODE` ngay khi render trang `/admin/login` (hoặc qua `proxy.ts`) để báo `503` / cảnh báo tức thì.

4. **Lưu ý chữ ký hàm đồng bộ trong `src/features/catalog/catalog-service.ts` & tồn kho cũ trong `localStorage` giỏ hàng:**
   - `catalog-service.ts` hiện toàn bộ hàm (`getAllProducts`, `getProductBySlug`, `getProductById`, `getFeaturedProducts`, `queryProducts`) là đồng bộ và đang được test trực tiếp trong `src/features/catalog/catalog-service.test.ts`, đồng thời `order-service.ts` tiêm `findProduct = getProductById` đồng bộ. `addendum.md` §1 đề nghị hợp nhất đọc từ `inventoryRepository` (I/O async) — cần giữ các hàm pure/sync cho unit test catalog và bổ sung hàm async riêng cho server pages/routes để không gãy `catalog-service.test.ts`.
   - Phía UX khách: `src/features/cart/cart-store.ts` lưu `item.stock` trong `localStorage["shoplite:cart"]` tại lúc thêm vào giỏ; nếu tồn kho giảm sau đó, trang `/cart` chưa có đồng bộ lại tồn kho thực (khách chỉ phát hiện khi bấm đặt hàng ở `/checkout` nhận `409 INSUFFICIENT_STOCK`).

5. **Dữ liệu thực tế trong `storage/orders.json` có đơn cũ chứa field thừa (`discount`, `couponCode`) và 17 đơn `pending` tiền tồn kho:**
   - Đọc trực tiếp `storage/orders.json` (18 đơn): đúng là toàn bộ đều thiếu `statusHistory` và `inventoryRestocked` như PRD nhận định, nhưng một số đơn lịch sử (VD: `SL-20261108-8E4C24`, `SL-20261108-8C9DBF`) có thêm trường `discount` và `couponCode` không nằm trong `Order` interface ở `src/features/orders/types.ts`. Khi parser/repository đọc-ghi lại `storage/orders.json`, cần bảo toàn hoặc bỏ qua an toàn các trường thừa này và lưu ý 17 đơn `pending` cũ chưa từng trừ kho trước khi `storage/inventory.json` ra đời.

---

## 3. Xác nhận tồn tại đường dẫn file ShopLite trong `prd.md` & `addendum.md`

Đã kiểm tra đọc trực tiếp từng đường dẫn dưới gốc `/Users/nab99/Documents/AI Agent training course/shoplite/`:

| Đường dẫn nhắc trong `prd.md` / `addendum.md` | Trạng thái thực tế | Ghi chú đối chiếu |
| :--- | :---: | :--- |
| `README.md` | **Tồn tại** | Khớp cấu trúc & quy tắc nghiệp vụ Brownfield |
| `src/features/orders/types.ts` | **Tồn tại** | Có `ORDER_STATUSES` 5 trạng thái; chưa có `statusHistory`, `inventoryRestocked` |
| `src/features/orders/order-errors.ts` | **Tồn tại** | Có đủ 5 mã lỗi (`VALIDATION_ERROR`, `PRODUCT_NOT_FOUND`, `INSUFFICIENT_STOCK`, `ORDER_NOT_FOUND`, `INVALID_STATUS_TRANSITION`) |
| `src/features/orders/order-service.ts` | **Tồn tại** | Đúng như mô tả (`placeOrder()` check `product.stock` không trừ kho) |
| `src/features/orders/order-repository.ts` | **Tồn tại** | Đúng như mô tả (`writeAll()` dùng `${filePath}.tmp` cố định không lock) |
| `src/features/orders/server.ts` | **Tồn tại** | Khởi tạo singleton `orderService` dùng `ORDERS_FILE` |
| `src/features/orders/order-service.test.ts` | **Tồn tại** | Tồn tại và đúng phạm vi kiểm thử đơn hàng hiện có |
| `src/features/orders/order-repository.test.ts` | **Tồn tại** | Tồn tại |
| `src/features/orders/components/cancel-order-button.tsx` | **Tồn tại** | Khớp component `CancelOrderButton` nhắc ở FR-15 |
| `src/features/catalog/catalog-service.ts` | **Tồn tại** | Hiện đọc đồng bộ từ `src/data/products.ts` |
| `src/features/cart/cart-reducer.ts` | **Tồn tại** | Có `MAX_QUANTITY_PER_ITEM = 10` như §4.6 |
| `src/features/checkout/pricing.ts` | **Tồn tại** | Phí ship `30.000`/`60.000`, miễn phí `>= 500.000` như §4.6 |
| `src/data/products.ts` | **Tồn tại** | Nguồn sản phẩm tĩnh ban đầu |
| `src/lib/format.ts` | **Tồn tại** | Có `formatCurrency`, `formatDateTime`, `normalizeText` như FR-12, FR-15, §4.6 |
| `src/app/products/page.tsx` | **Tồn tại** | Đọc `queryProducts(query)` đồng bộ |
| `src/app/products/[slug]/page.tsx` | **Tồn tại** | Đúng như mô tả: đang có `generateStaticParams()` |
| `src/app/api/products/route.ts` | **Tồn tại** | Đúng như mô tả |
| `src/app/api/products/[slug]/route.ts` | **Tồn tại** | Đúng như mô tả |
| `src/app/api/orders/route.ts` | **Tồn tại** | `GET` / `POST` đúng như §4.6 |
| `src/app/api/orders/[id]/route.ts` | **Tồn tại** | `GET` / `PATCH` chỉ nhận `{ "status": "cancelled" }` |
| `src/app/orders/page.tsx` | **Tồn tại** | Đọc `orderService.listOrders()`, có `data-testid="order-row"` |
| `src/app/orders/[id]/page.tsx` | **Tồn tại** | Render `CancelOrderButton` khi `order.status === "pending"` |
| `src/app/checkout/page.tsx` | **Tồn tại** | Render `CheckoutForm` |
| `e2e/shopping-flow.spec.ts` | **Tồn tại** | Có assert `order-row` tại `/orders` (dòng 38–39) |
| `storage/orders.json` | **Tồn tại** | Có 18 đơn lịch sử chưa có `statusHistory` |
| `src/proxy.ts` | **Chưa tồn tại** | Đúng ghi chú `*(tạo mới)*` trong `addendum.md` (Next.js `16.4.2`) |
| `src/features/orders/order-state-machine.ts` | **Chưa tồn tại** | File mới dự kiến tạo theo `addendum.md` |
| `storage/inventory.json` | **Chưa tồn tại** | File mới khởi tạo lúc chạy theo FR-5 |

> *Ghi chú xử lý sau đối chiếu:* Toàn bộ Gap #1–#5 đã được rà soát và phản ánh vào bản `prd.md` (status: `final`) & `addendum.md` trước khi chốt bàn giao cho UX (Bài 4.5) và Architecture (Bài 4.6).
