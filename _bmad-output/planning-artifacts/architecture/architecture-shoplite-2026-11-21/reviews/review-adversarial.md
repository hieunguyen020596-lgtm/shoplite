# Adversarial Divergence Review — ShopLite Ops (`ARCHITECTURE-SPINE.md`)

- **Ngày tấn công kiểm định:** 2026-11-21
- **Phương pháp:** Giả lập 2 lập trình viên (hoặc 2 AI agent ở Bài 4.8) nhận 2 Story độc lập, mỗi bên tuân thủ đúng từng chữ của `AD-1..AD-9` trong bản nháp nhưng cố tình chọn tên hàm, chữ ký hoặc kiểu dữ liệu theo cách hiểu riêng để tìm điểm gãy khi tích hợp.

---

## Các cặp "Tuân thủ AD nhưng Không khớp nhau" (Divergence Pairs) đã phát hiện

### Cặp xung đột #1 (High) — Chữ ký constructor `OrderError` giữa `order-errors.ts` và các module gọi lỗi
- **Unit A (cập nhật `src/features/orders/order-errors.ts`):** Giữ nguyên constructor gốc của ShopLite `new OrderError(code, message, details?: Record<string, string>)` và thêm `UNAUTHORIZED: 401`, `ADMIN_NOT_CONFIGURED: 503` vào `HTTP_STATUS_BY_CODE`.
- **Unit B (viết `order-state-machine.ts` và `admin-auth.ts` theo chữ của bản nháp `AD-4` / `AD-8`):** Gọi `new OrderError("INVALID_STATUS_TRANSITION", "Không thể chuyển", 409)` vì bản nháp viết `OrderError("INVALID_STATUS_TRANSITION", ..., 409)`.
- **Hậu quả khi ghép:** Lỗi biên dịch TypeScript (`TS2345: Argument of type 'number' is not assignable to parameter of type 'Record<string, string> | undefined'`).
- **Cách khóa trong Spine (`Fix`):** Sửa `AD-3`, `AD-4`, `AD-5`, `AD-8` theo đúng chữ ký 3 tham số `new OrderError(code, message, details?)` (không truyền số `httpStatus` vào constructor).

### Cặp xung đột #2 (High) — Tham số bắt buộc vs tùy chọn trên `createOrderService` và `createJsonFileOrderRepository` làm gãy 83 unit tests hiện có
- **Unit A (sửa `order-service.ts` và `order-repository.ts`):** Đặt `inventoryRepository: InventoryRepository` và `storageLock: StorageLock` làm tham số **bắt buộc** theo `AD-2` và `AD-6`.
- **Unit B (bộ test hiện có `order-service.test.ts`, `order-repository.test.ts`, `src/app/api/orders/route.test.ts`):** Đang gọi `createOrderService({ repository })` và `createJsonFileOrderRepository(filePath)` không truyền `inventoryRepository` hay `storageLock`.
- **Hậu quả khi ghép:** Gãy toàn bộ `npm run check` trên các file test hiện có.
- **Cách khóa trong Spine (`Fix`):** Ràng buộc trong `AD-2`/`AD-6` và `AD-10`: trong `OrderServiceDeps`, `inventoryRepository` và `storageLock` phải là **optional** với giá trị mặc định `inventoryRepository = createInMemoryInventoryRepository()` (seed từ `PRODUCTS`) và `storageLock = new StorageLock()`; tương tự `createJsonFileOrderRepository(filePath, storageLock = new StorageLock())`.

### Cặp xung đột #3 (High) — Tên method và kiểu trả về của `InventoryRepository`, `order-state-machine.ts`, `OrderService`, và `admin-auth.ts`
- **Unit A (Story làm `InventoryRepository` & `order-state-machine.ts`):**
  - Đặt tên hàm `inventoryRepo.getAvailableStock(id)`, `inventoryRepo.decrement(items)`.
  - Đặt `transitionOrder(order, to, actor, note)` nhận 4 tham số rời và trả về `Order`.
- **Unit B (Story làm `OrderService`, `catalog-inventory.ts` và Route Handlers `/api/admin/*`):**
  - Gọi `inventoryRepo.getStockMap()`, `inventoryRepo.deduct(items)`, `inventoryRepo.restock(items)`.
  - Gọi `transitionOrder(order, { to, actor, note, expectedStatus, now })` và chờ kết quả `{ order: Order; shouldRestock: boolean }`.
  - Route `/api/admin/orders/[id]/status` gọi `orderService.updateStatus(...)` thay vì `orderService.transitionOrderStatus(...)`.
- **Hậu quả khi ghép:** Không khớp tên hàm và kiểu dữ liệu trả về giữa các Story.
- **Cách khóa trong Spine (`Fix`):** Thêm **`AD-10 — Khóa cứng hợp đồng chữ ký TypeScript tại ranh giới giữa các module (`StorageLock`, `InventoryRepository`, `order-state-machine`, `OrderService`, `admin-auth`)`** kèm khối khai báo `interface` TypeScript chuẩn trong `Structural Seed`.

### Cặp xung đột #4 (Medium) — Quy ước chuyển hướng `src/proxy.ts` khi cookie hết hạn vs chưa đăng nhập lần đầu
- **Unit A (viết `src/proxy.ts`):** Khi có cookie `shoplite_admin` nhưng đã quá hạn `expiresAtEpochMs` hoặc sai chữ ký, chỉ redirect về `/admin/login` (không có `?expired=1`).
- **Unit B (viết UI `/admin/login` và test E2E theo `EXPERIENCE.md`):** Trông đợi khi cookie đã tồn tại nhưng hết hạn thì chuyển hướng về `/admin/login?expired=1` để hiện banner vàng *"Phiên làm việc đã hết hạn"*, còn khi chưa có cookie mới chuyển về `/admin/login`.
- **Hậu quả khi ghép:** Trạng thái hết phiên 8 giờ khi tải lại trang `/admin/orders` không hiển thị banner `?expired=1` như đặc tả UX.
- **Cách khóa trong Spine (`Fix`):** Ghi rõ trong `AD-8` mục 4: trên `src/proxy.ts`, nếu request đã có cookie `shoplite_admin` nhưng hết hạn/không hợp lệ (trong khi `ADMIN_PASSCODE` đã cấu hình) thì redirect `307` về `/admin/login?expired=1`; nếu không có cookie hoặc chưa cấu hình `ADMIN_PASSCODE` thì redirect `307` về `/admin/login`.

---

## Kết luận
Sau khi bổ sung **AD-10** (khóa chữ ký TypeScript liên module) và siết `AD-2`, `AD-3`, `AD-4`, `AD-5`, `AD-6`, `AD-8` theo 4 phát hiện trên, hai Story bất kỳ được phát triển độc lập ở Bài 4.7/4.8 sẽ khớp hoàn toàn ở mức kiểu biên dịch TypeScript lẫn hợp đồng runtime.
