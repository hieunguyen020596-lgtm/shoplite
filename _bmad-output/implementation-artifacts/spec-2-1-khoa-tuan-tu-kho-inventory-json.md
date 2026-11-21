---
title: 'Story 2.1: Khóa tuần tự re-entrant, Kho storage/inventory.json & Trừ/Hoàn kho nguyên tử'
type: 'feature'
created: '2026-11-21'
status: 'done'
baseline_revision: 'd53187deff39db17a3cad53474bb8c7f40c4a1cd'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/README.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-shoplite-2026-11-21/ARCHITECTURE-SPINE.md'
warnings: []
deferred: []
---

# Story 2.1: Khóa tuần tự re-entrant, Kho `storage/inventory.json` & Trừ/Hoàn kho nguyên tử

<intent-contract>

## Intent

**Problem:** Tồn kho hiện chỉ là hằng số tĩnh trên `src/data/products.ts`, `JsonFileOrderRepository` ghi đè qua file tạm cố định `${filePath}.tmp` không có khóa tuần tự, `OrderService.placeOrder()` chưa trừ kho thật hay rollback khi lỗi ghi, và `shouldRestock` / `markOrderRestocked()` từ Story 1.1 chưa được nối vào kho lưu trữ bền vững hoặc API hoàn kho `POST /api/admin/orders/:id/restock`.

**Approach:** Xây dựng `StorageLock` re-entrant dùng `AsyncLocalStorage`, cặp `InventoryRepository` (`JsonFile` + `InMemory`), nâng cấp `OrderRepository` ghi nguyên tử qua file tạm UUID trong lock, tích hợp trừ kho *all-or-nothing* + rollback + hoàn kho idempotent vào `OrderService` và singleton `server.ts`, cùng Route Handler `POST /api/admin/orders/:id/restock` bảo vệ fail-closed `503 → 401`.

## Boundaries & Constraints

**Always:**
- Tuân thủ tuyệt đối `AD-1`, `AD-2`, `AD-3`, `AD-4`, `AD-5`, `AD-6`, `AD-8`, `AD-10`: `src/features/orders/*` không import `next/*` hay `react`; mọi chữ ký trong `StorageLock`, `InventoryRepository`, `OrderService` và `server.ts` khớp đúng `ARCHITECTURE-SPINE.md §3`.
- Mọi đọc–sửa–ghi trong `OrderService` (`placeOrder`, `transitionOrderStatus`, `cancelOrder`, `restockCancelledOrder`) và các `JsonFile*Repository` chạy trong `StorageLock.runExclusive()` (FIFO + `AsyncLocalStorage` re-entrant) và ghi đĩa bằng `<filePath>.<crypto.randomUUID()>.tmp` → `fs.rename` (+ `fs.unlink` khi lỗi).
- Bảo toàn 100% tương thích ngược cho `createOrderService({ repository })`, `createJsonFileOrderRepository(filePath)`, mọi test cũ, và giữ nguyên trường thừa (`discount`, `couponCode`) của đơn lịch sử trong `orders.json`.
- `POST /api/admin/orders/:id/restock` gọi `assertAdminRequest(request)` ở dòng đầu tiên (`503 → 401` trước khi đọc body/repo), trả `{ order }` (`200`) kèm `Cache-Control: no-store`.

**Never:**
- Không sửa đổi `src/features/catalog/*`, mặt tiền `/`, `/products`, `/checkout` UI, hay trang `/admin/*` UI trong Story 2.1 (thuộc Story 2.2 và Epic 3).
- Không ghi số âm xuống `storage/inventory.json` và không ghi bẩn vào `storage/orders.json` hoặc `storage/inventory.json` thật khi chạy unit/route test.
- Không tự ý hoàn kho cho đơn lịch sử (`statusHistory === undefined`) khi hủy từ `pending` hay đơn `cancelled` có `inventoryRestocked === undefined`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| :--- | :--- | :--- | :--- |
| Khởi tạo / fallback `InventoryRepository` | `storage/inventory.json` chưa có hoặc thiếu key sản phẩm trong `products.ts` | Tự seed/fallback từ `product.stock` (`>= 0`) | Không trả `undefined` |
| Đặt hàng song song `Promise.allSettled()` | `p011` còn `stock = 1`, bắn 5 `placeOrder()` song song (mỗi đơn mua `1`) | Đúng 1 đơn thành công (`pending`), 4 đơn bị từ chối, kho cuối bằng `0` | 4 đơn thất bại ném `OrderError("INSUFFICIENT_STOCK")` (`409`) |
| Trừ kho *all-or-nothing* | Đơn có 2 món: món 1 đủ kho, món 2 vượt tồn kho | Toàn đơn bị từ chối, kho món 1 không bị trừ | Ném `OrderError("INSUFFICIENT_STOCK")` (`409`) |
| Rollback khi `repository.save` lỗi | Trừ kho thành công, `orderRepository.save()` ném lỗi I/O | Tự động `inventoryRepository.restock()` hoàn trả đúng số lượng trước khi ném lỗi | Ném tiếp lỗi gốc (HTTP `500`) |
| Hủy đơn tự động hoàn kho vs đơn cũ | Đơn mới hủy từ `pending`/`confirmed` vs đơn cũ `statusHistory === undefined` | Đơn mới cộng trả kho + `inventoryRestocked: true`; đơn cũ `inventoryRestocked: true` nhưng **không** cộng kho | Khóa bởi `StorageLock` |
| `POST /api/admin/orders/:id/restock` hợp lệ | Đơn `cancelled` với `inventoryRestocked === false`; body rỗng hoặc `{ note?: string }` (`<= 200`) | HTTP `200 { order }`, cộng trả kho 1 lần, `inventoryRestocked: true`, nối event `action: "restock"` | Thiếu env → `503`; thiếu/sai cookie → `401` |
| Idempotent & validation `/restock` | Gọi lần 2 (`inventoryRestocked: true`), đơn chưa hủy, đơn cũ `undefined`, hoặc JSON hỏng/`note > 200` | Không cộng kho thêm hay sửa đơn | Gọi đúp/sai trạng thái → `409 INVALID_STATUS_TRANSITION`; sai body/`note` → `400 VALIDATION_ERROR`; thiếu `:id` → `404` |

</intent-contract>

## Code Map

- `src/lib/storage-lock.ts` -- *[Tạo mới]* `StorageLock`: hàng đợi FIFO bất đồng bộ + `AsyncLocalStorage` bảo đảm re-entrant khi `OrderService` gọi xuống repository.
- `src/features/orders/inventory-repository.ts` -- *[Tạo mới]* Interface `InventoryRepository`, `DEFAULT_INVENTORY_FILE`, `createJsonFileInventoryRepository(filePath, storageLock?)` (file tạm UUID) và `createInMemoryInventoryRepository(seed?)` fallback `products`.
- `src/features/orders/order-repository.ts` -- Thêm tham số tùy chọn `storageLock?: StorageLock`, bọc đọc/ghi vào lock và đổi file tạm thành `${filePath}.${crypto.randomUUID()}.tmp`.
- `src/features/orders/order-service.ts` -- Thêm tùy chọn `inventoryRepository` & `storageLock`; cập nhật `placeOrder` (kiểm tra + trừ all-or-nothing + rollback), `transitionOrderStatus`/`cancelOrder` (bọc lock + nối `shouldRestock`), thêm `restockCancelledOrder(id, note?)`.
- `src/features/orders/server.ts` -- Khởi tạo 1 `storageLock`, `inventoryRepository`, `orderRepository` dùng chung cho `orderService`; export thêm `inventoryRepository` và `storageLock`.
- `src/app/api/admin/orders/[id]/restock/route.ts` -- *[Tạo mới]* `POST` handler: `assertAdminRequest` (`503 → 401`) → đọc body rỗng hoặc JSON Zod (`400`) → `orderService.restockCancelledOrder` (`404`/`409`/`200 { order }`, `Cache-Control: no-store`).
- `src/lib/storage-lock.test.ts`, `src/features/orders/inventory-repository.test.ts`, `src/features/orders/order-repository.test.ts`, `src/features/orders/order-service.test.ts`, `src/app/api/admin/orders/[id]/restock/route.test.ts` -- Bộ unit/integration/route test phủ đủ 7 dòng I/O Matrix.

## Tasks & Acceptance

**Execution:**
- `src/lib/storage-lock.ts` & `src/lib/storage-lock.test.ts` -- Cài đặt `StorageLock` re-entrant FIFO dùng `AsyncLocalStorage` và test tuần tự, lồng nhau (re-entrant) và nhả lock khi ném lỗi -- Ngăn deadlock và race condition.
- `src/features/orders/inventory-repository.ts` & `src/features/orders/inventory-repository.test.ts` -- Cài đặt `InventoryRepository` (`JsonFile` + `InMemory`) tự khởi tạo/fallback từ `src/data/products.ts`, trừ all-or-nothing `>= 0` và file tạm UUID -- Bền vững hóa Tồn kho khả dụng tại `storage/inventory.json`.
- `src/features/orders/order-repository.ts` & `src/features/orders/order-repository.test.ts` -- Tích hợp `storageLock` tùy chọn và file tạm UUID vào `JsonFileOrderRepository`, kiểm thử ghi đồng thời và bảo toàn trường đơn cũ (`discount`, `couponCode`) -- Loại bỏ ghi đè `.tmp` cố định.
- `src/features/orders/order-service.ts`, `src/features/orders/server.ts` & `src/features/orders/order-service.test.ts` -- Nối `inventoryRepository` & `storageLock` vào `placeOrder`, `transitionOrderStatus`, `cancelOrder`, thêm `restockCancelledOrder`, giữ tương thích ngược DI và test đồng thời/rollback/idempotent restock -- Hoàn thiện giao dịch kho nguyên tử `AD-5`, `AD-6`.
- `src/app/api/admin/orders/[id]/restock/route.ts` & `src/app/api/admin/orders/[id]/restock/route.test.ts` -- Cài đặt & kiểm thử `POST /api/admin/orders/:id/restock` (`503 → 401 → 400 → 404/409/200`) trong `@vitest-environment node` -- Đóng vòng API hoàn kho quản trị.

**Acceptance Criteria:**
- Given file tạm JSON cho cả `orders.json` và `inventory.json` với sản phẩm `stock = 1`, when bắn đồng thời 5 `placeOrder()` qua singleton cùng `StorageLock`, then đúng 1 đơn được lưu, 4 đơn nhận `INSUFFICIENT_STOCK`, file JSON không hỏng cú pháp và tồn kho cuối bằng `0`.
- Given toàn bộ code mới và code cũ sau khi hoàn tất 5 task, when chạy `npm run check`, then ESLint, `next typegen && tsc --noEmit`, và toàn bộ Vitest suite (cũ + mới) pass 100%.

## Spec Change Log

## Review Triage Log

### 2026-11-21 — Review pass
- verdicts: 15 findings — high 0, medium 4, low 2, false 9, maybe-false 0
- findings:
  - `[false]` `[reject]` (`blind-hunter`) Storefront vẫn đọc stock từ `products.ts` — Bị loại trừ bởi `<intent-contract>` `Never` (thuộc Story 2.2).
  - `[false]` `[reject]` (`blind-hunter`) Thiếu `order-state-machine.ts` và `types.ts` trong diff — Đã hoàn tất và commit ở Epic 1 (`06bb75f`), Story 2.1 chỉ tái sử dụng.
  - `[medium]` `[patch]` (`blind-hunter`) Test dọn file tạm UUID trong `order-repository.test.ts` thất bại ở `readAll` trước khi gọi `writeJsonFileAtomic` — Đã sửa gọi trực tiếp `writeJsonFileAtomic(dirAsTarget, [])` để kiểm chứng thật lỗi `rename` và dọn sạch `.tmp`.
  - `[false]` `[reject]` (`blind-hunter`) `normalizeSeedEntries` fallback giá trị hỏng về `products.ts` — File `inventory.json` chỉ được ghi bởi `writeJsonFileAtomic` với giá trị nguyên hợp lệ; JSON lỗi cú pháp ném `SyntaxError` rõ ràng; hành vi fallback đúng yêu cầu `AD-5`.
  - `[false]` `[reject]` (`blind-hunter`) `StorageLock` đơn tiến trình / không cache trên `globalThis` — Đa tiến trình nằm ngoài kiến trúc single-node (`Deferred #1`), và bỏ cache `globalThis` giúp `vi.resetModules()` kiểm thử `ORDERS_FILE`/`INVENTORY_FILE` cô lập.
  - `[false]` `[reject]` (`blind-hunter`) `AsyncLocalStorage` bỏ qua hàng đợi nếu gọi song song bên trong `runExclusive` — Tất cả caller trong `OrderService` đều `await` tuần tự bên trong khóa theo thiết kế re-entrant (`AD-6`).
  - `[false]` `[reject]` (`blind-hunter`) Crash giữa hai lần ghi JSON để lại lệch tạm thời — Giao dịch bù trừ single-node đúng `AD-5`; CSDL ACID/WAL thuộc v2 (`Deferred #1`).
  - `[low]` `[patch]` (`blind-hunter`) Thiếu kiểm thử đồng thời `/restock`, rollback `restock`, và input âm/`0`/lẻ ở `aggregateQuantities` — Đã bổ sung đủ trong `order-service.test.ts` và `inventory-repository.test.ts`.
  - `[false]` `[reject]` (`blind-hunter`) `createOrderService` có mặc định cho `inventoryRepository` & `storageLock` — Bắt buộc theo `AD-2` để bảo toàn 100% test/caller cũ.
  - `[low]` `[patch]` (`blind-hunter`) `parseOptionalRestockBody` tạo `Request` thứ hai dư thừa để gọi `readJsonBody` — Đã đơn giản hóa bằng `JSON.parse(rawText)` trực tiếp trong `try/catch`.
  - `[false]` `[reject]` (`blind-hunter`) Mọi từ chối `/restock` cùng mã `409 INVALID_STATUS_TRANSITION` — Khóa cứng bởi `AD-3`/`AD-4` và I/O Matrix với 7 `OrderErrorCode` chuẩn.
  - `[false]` `[reject]` (`blind-hunter`) Thiếu admin UI, `.env.example`, `.gitignore` — Admin UI thuộc Epic 3 (`Never`), `.env.example` đã defer sang Story 3.1, `storage/` đã có trong `.gitignore`, và `handleRouteError` dùng chung toàn API.
  - `[medium]` `[patch]` (`verification-gap`) `src/features/orders/server.ts` chưa có test kiểm chứng nối singleton & biến `ORDERS_FILE`/`INVENTORY_FILE` — Đã tạo mới `src/features/orders/server.test.ts` dùng `vi.resetModules()`.
  - `[medium]` `[patch]` (`verification-gap`) Thiếu test rollback khi `inventoryRepository.restock()` ném lỗi trong `saveOrderAndRestockIfNeeded` — Đã bổ sung ca test lỗi cho cả `cancelOrder` và `restockCancelledOrder` trong `order-service.test.ts`.
  - `[medium]` `[patch]` (`verification-gap`) Thiếu test gọi song song `restockCancelledOrder` & `cancelOrder` bằng `Promise.allSettled` — Đã bổ sung ca test đua song song trong `order-service.test.ts`.

## Auto Run Result

- **Tóm tắt:** Hoàn thành Story 2.1 với `StorageLock` re-entrant (`src/lib/storage-lock.ts`), `writeJsonFileAtomic` (`src/lib/atomic-json.ts`), `InventoryRepository` (`src/features/orders/inventory-repository.ts`), `OrderRepository` dùng lock + file tạm UUID, tích hợp trừ kho *all-or-nothing*, rollback và hoàn kho idempotent trong `OrderService` + `server.ts`, và endpoint `POST /api/admin/orders/:id/restock`.
- **Files thay đổi / thêm mới:** `src/lib/storage-lock.ts`, `src/lib/storage-lock.test.ts`, `src/lib/atomic-json.ts`, `src/features/orders/inventory-repository.ts`, `src/features/orders/inventory-repository.test.ts`, `src/features/orders/order-repository.ts`, `src/features/orders/order-repository.test.ts`, `src/features/orders/order-service.ts`, `src/features/orders/order-service.test.ts`, `src/features/orders/server.ts`, `src/features/orders/server.test.ts`, `src/app/api/admin/orders/[id]/restock/route.ts`, `src/app/api/admin/orders/[id]/restock/route.test.ts`.
- **Tổng hợp Review (Claude Opus 5.5, Claude Sonnet 5.5, GPT-OSS 120B):** 15 findings (`4` medium patch, `2` low patch, `9` false rejected, `0` defer; `edge-case-hunter` & `intent-alignment`: 0 phát hiện sai lệch). Đã áp dụng toàn bộ `6` patch về test & đơn giản hóa parse JSON ở route `/restock`.
- **Follow-up review recommended:** `false` (các phát hiện `medium` đều là thiếu test kiểm chứng và đã được phủ xanh 100% trong `npm run check`).
- **Verification:** `npm run check` (`eslint`, `next typegen && tsc --noEmit`, `vitest run`).
- **Rủi ro tồn dư:** Khóa `StorageLock` áp dụng cho mô hình single-node theo `ARCHITECTURE-SPINE.md`.

## Verification

**Commands:**
- `npm run check` -- expected: ESLint, `next typegen && tsc --noEmit`, và toàn bộ Vitest suite (223 test hiện có + tất cả test mới Story 2.1) pass 100%.
