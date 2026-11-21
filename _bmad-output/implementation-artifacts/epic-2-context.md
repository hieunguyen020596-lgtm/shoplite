# Epic 2 Context: Tồn kho thực tế & An toàn đặt hàng đồng thời

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Epic 2 chuyển tồn kho khả dụng từ hằng số tĩnh sang lưu trữ bền vững tại `storage/inventory.json`, thực hiện trừ kho nguyên tử ngay tại thời điểm đặt hàng (`pending`) bên trong vùng khóa tuần tự re-entrant để triệt tiêu bán vượt tồn kho hoặc hỏng tệp khi có nhiều yêu cầu đồng thời. Đồng thời, epic này hoàn thiện cơ chế hoàn kho idempotent (tự động khi hủy `pending`/`confirmed`, xác nhận một lần cho đơn hủy từ `shipping`) và đồng bộ tồn kho thực tế lên toàn bộ mặt tiền bán hàng cũng như giữ nguyên dữ liệu giỏ hàng và biểu mẫu `/checkout` khi xảy ra hết hàng.

## Stories

- Story 2.1: Khóa tuần tự re-entrant, Kho `storage/inventory.json` & Trừ/Hoàn kho nguyên tử
- Story 2.2: Đồng bộ tồn kho động lên mặt tiền bán hàng & xử lý hết hàng tại `/checkout`

## Requirements & Constraints

- **Lưu trữ & Khởi tạo tồn kho (`storage/inventory.json`):**
  - Duy trì tồn kho khả dụng bền vững dạng bản đồ phẳng `Record<string, number>` (có thể đổi đường dẫn qua biến môi trường `INVENTORY_FILE` cho kiểm thử).
  - Khi `storage/inventory.json` chưa tồn tại hoặc thiếu key của một `productId` trong `src/data/products.ts`, tự động khởi tạo/fallback từ trường `stock` gốc mà không báo lỗi `undefined`.
  - Mọi giá trị tồn kho khả dụng phải luôn `>= 0`; không thao tác nào được ghi số âm xuống file.
- **Trừ kho nguyên tử lúc đặt hàng & Chống bán vượt tồn kho:**
  - Khi đặt hàng (`placeOrder()`), kiểm tra đủ tồn kho thực tế cho toàn bộ mặt hàng trước khi trừ (*all-or-nothing*, fail-fast ở mặt hàng thiếu đầu tiên với `OrderError("INSUFFICIENT_STOCK")` / HTTP `409`). Nếu đơn có nhiều sản phẩm mà sản phẩm sau thiếu kho, sản phẩm trước đó tuyệt đối không bị trừ.
  - Khi gửi song song nhiều yêu cầu `placeOrder()` qua `Promise.allSettled()` vào sản phẩm có tồn kho `= 1` (mỗi đơn mua `1`), chỉ đúng `1` đơn thành công (`201 Created`, `status: "pending"`), các đơn còn lại thất bại với `INSUFFICIENT_STOCK` (`409`), và tồn kho cuối cùng bằng đúng `0`.
  - Nếu đã trừ kho thành công nhưng `OrderRepository.save()` ném lỗi I/O, khối `catch` bắt buộc gọi `inventoryRepository.restock()` hoàn trả đúng số lượng vừa trừ trước khi ném tiếp lỗi (`500`).
- **Hoàn kho idempotent & Xác nhận nhận hàng hoàn từ `shipping`:**
  - Khi đơn mới (có `statusHistory`) bị hủy từ `pending` (khách hoặc nhân viên) hoặc `confirmed` (nhân viên), dựa vào `shouldRestock` để cộng trả đúng `order.items` về tồn kho khả dụng trong cùng vùng khóa tuần tự và đặt `inventoryRestocked = true`. Đơn cũ tiền tồn kho (`statusHistory === undefined`) có `shouldRestock: false`, không cộng khống tồn kho.
  - Đơn bị nhân viên hủy từ `shipping` (`status === "cancelled"`, `inventoryRestocked === false`) không tự động hoàn kho. Endpoint `POST /api/admin/orders/:id/restock` (kiểm tra fail-closed `503 ADMIN_NOT_CONFIGURED` trước `401 UNAUTHORIZED`) chấp nhận body rỗng hoặc JSON tùy chọn `{ note?: string }` (`<= 200` ký tự), cộng đúng `order.items` về tồn kho khả dụng 1 lần duy nhất, đặt `inventoryRestocked = true`, và nối `{ status: "cancelled", at, actor: "staff", action: "restock", note? }` vào `statusHistory`.
  - Gọi lại `POST /api/admin/orders/:id/restock` lần thứ 2, hoặc gọi trên đơn không ở `cancelled` / đơn cũ (`inventoryRestocked === undefined`), phải từ chối với `INVALID_STATUS_TRANSITION` (`409`) và giữ nguyên tồn kho. Body không rỗng sai JSON hoặc `note.trim().length > 200` trả `VALIDATION_ERROR` (`400`); không tìm thấy đơn trả `ORDER_NOT_FOUND` (`404`).
- **Đồng bộ tồn kho động & Không hồi quy Brownfield:**
  - Trang chủ `/`, `/products`, `/products/[slug]`, `GET /api/products` và `GET /api/products/[slug]` phải phản ánh đúng số `stock` thực tế từ `InventoryRepository`.
  - Giữ nguyên quy tắc giỏ hàng (`MAX_QUANTITY_PER_ITEM = 10`, không vượt tồn kho khả dụng), quy tắc tính giá/phí ship từ server, và toàn bộ thông báo lỗi API bằng tiếng Việt có dấu.
  - Toàn bộ bộ test hiện có (gồm 18 unit tests đồng bộ của `catalog-service.ts`, `order-service.test.ts`, `order-repository.test.ts`, `src/app/api/orders/route.test.ts`, và `e2e/shopping-flow.spec.ts`) phải pass 100%, bổ sung test cho đồng thời `Promise.allSettled()`, all-or-nothing, rollback, restock idempotent, bảo vệ `503`/`401`, và hiển thị tồn kho động. Test phải cô lập dữ liệu qua `InMemoryInventoryRepository` hoặc thư mục tạm `os.tmpdir()` / `ORDERS_FILE` / `INVENTORY_FILE`, không ghi bẩn vào `storage/` thật.

## Technical Decisions

- **Khóa tuần tự re-entrant & Ghi file nguyên tử:**
  - Triển khai `StorageLock` (`src/lib/storage-lock.ts`) dùng hàng đợi FIFO bất đồng bộ kết hợp `AsyncLocalStorage` (`node:async_hooks`) để các lời gọi `storageLock.runExclusive()` lồng nhau giữa `OrderService` và repository chạy thẳng mà không deadlock.
  - Khởi tạo một instance `storageLock` duy nhất tại `src/features/orders/server.ts` và truyền chung cho `OrderService`, `JsonFileOrderRepository` và `JsonFileInventoryRepository`. Bọc mọi thao tác đọc–sửa–ghi (đặt hàng, hủy đơn, chuyển trạng thái kiểm tra `expectedStatus`, hoàn kho) bên trong `storageLock.runExclusive()`.
  - Mọi thao tác ghi của `JsonFileOrderRepository` và `JsonFileInventoryRepository` phải ghi vào file tạm duy nhất `<filePath>.<crypto.randomUUID()>.tmp` rồi `fs.rename(tmpPath, filePath)` (dọn `fs.unlink` trong `catch` nếu lỗi). Khi đọc/ghi `storage/orders.json`, bảo toàn nguyên vẹn các trường thừa từ đơn cũ (`discount`, `couponCode`).
- **Repository Seam & Tương thích ngược DI:**
  - Tạo `src/features/orders/inventory-repository.ts` với interface `InventoryRepository` (`getStockMap`, `getStock`, `deduct`, `restock`) cùng hai cài đặt `createJsonFileInventoryRepository(filePath, storageLock?)` và `createInMemoryInventoryRepository(seed?)`.
  - Trong `createOrderService`, các dependency `inventoryRepository` và `storageLock` phải là tùy chọn (mặc định lần lượt là `createInMemoryInventoryRepository()` seed từ `PRODUCTS` và `new StorageLock()`); tương tự `storageLock` mặc định `new StorageLock()` ở hai hàm `createJsonFile*Repository` để không phá vỡ caller/test cũ chỉ truyền `{ repository }` hoặc `filePath`.
- **Phân tách tầng nghiệp vụ & Mặt tiền `force-dynamic`:**
  - Các module trong `src/features/*` không được import `next/*` hay `react`.
  - Giữ nguyên toàn bộ chữ ký đồng bộ của các hàm thuần trong `src/features/catalog/catalog-service.ts`. Tạo `src/features/catalog/catalog-inventory.ts` cung cấp các hàm `async` (`getAllProductsWithStock`, `getFeaturedProductsWithStock`, `queryProductsWithStock`, `getProductBySlugWithStock`, `getProductByIdWithStock`) phủ số tồn động từ `inventoryRepository.getStockMap()`.
  - Khai báo `export const dynamic = "force-dynamic"` trên `src/app/page.tsx`, `src/app/products/page.tsx`, `src/app/products/[slug]/page.tsx` (đồng thời gỡ `generateStaticParams()` khỏi `src/app/products/[slug]/page.tsx`) và chuyển các trang này cùng `GET /api/products`, `GET /api/products/[slug]` sang dùng `*WithStock`.
- **Hợp đồng Route Handler hoàn kho:**
  - `src/app/api/admin/orders/[id]/restock/route.ts` gọi `assertAdminRequest(request)` ở dòng đầu tiên, đọc body bằng kiểm tra `request.text()` rỗng hoặc `readJsonBody`/parse JSON hợp lệ có `note?: string` (`<= 200` ký tự), gọi `orderService.restockCancelledOrder(id, note?)`, và chuẩn hóa lỗi qua `handleRouteError(error)`.

## UX & Interaction Patterns

- **Trạng thái hết hàng trên mặt tiền:** Khi tồn kho khả dụng của sản phẩm về `0`, tải lại `/`, `/products` hoặc `/products/[slug]` phải hiển thị `StockBadge` nhãn **"Hết hàng"** và vô hiệu hóa nút thêm vào giỏ (giữ nguyên bố cục UI ShopLite hiện có).
- **Xử lý `409 INSUFFICIENT_STOCK` tại `/checkout`:** Vì `localStorage["shoplite:cart"]` có thể lưu `stock` trễ so với thực tế, `POST /api/orders` là nguồn chân lý cuối cùng. Khi `CheckoutForm` nhận HTTP `409` (`INSUFFICIENT_STOCK`), giao diện phải hiển thị thông báo `role="alert"` nêu rõ tên sản phẩm không đủ tồn kho và giữ nguyên toàn bộ thông tin họ tên, SĐT, địa chỉ, ghi chú đã điền cùng danh sách giỏ hàng hiện tại (tuyệt đối không xóa trắng form hoặc giỏ).

## Cross-Story Dependencies

- **Kế thừa & hoàn tất các mục chuyển giao từ Epic 1:**
  - Story 2.1 tiêu thụ kết quả `shouldRestock` từ `transitionOrder()`, hàm `markOrderRestocked()` (`src/features/orders/order-state-machine.ts`) và `assertAdminRequest()` (`src/features/orders/admin-auth.ts`) đã tạo ở Epic 1.
  - Story 2.1 hoàn tất việc nối `shouldRestock` vào `InventoryRepository` trong `OrderService` (`transitionOrderStatus` và `cancelOrder`) và bọc toàn bộ chu trình đọc–sửa–ghi (bao gồm kiểm tra `expectedStatus`) của `OrderService` và `JsonFileOrderRepository` trong `StorageLock` re-entrant.
- **Phụ thuộc nội bộ Epic 2:** Story 2.2 phụ thuộc Story 2.1 ở `inventoryRepository` singleton trong `src/features/orders/server.ts` và phản hồi `409 INSUFFICIENT_STOCK` từ `POST /api/orders`.
- **Cung cấp đầu vào cho Epic 3:** Epic 3 (`/admin/orders` và `GET /api/admin/orders`) sẽ tiêu thụ `inventoryRepository.getStockMap()` cho `availableStockByProductId` và gọi endpoint `POST /api/admin/orders/:id/restock` từ Story 2.1.
