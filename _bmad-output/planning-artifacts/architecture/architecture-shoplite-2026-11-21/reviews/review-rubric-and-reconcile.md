# Good-Spine Rubric & Input Reconciliation Review — ShopLite Ops

- **Ngày review:** 2026-11-21
- **Tài liệu đối chiếu:** `ARCHITECTURE-SPINE.md` vs `prd.md`, `addendum.md`, `DESIGN.md`, `EXPERIENCE.md`, `reviewer-gate.md`.

## 1. Overall Verdict
`ARCHITECTURE-SPINE.md` tuân thủ đúng triết lý *terse build-substrate* của BMAD v6.12: có 3 quyết định `[ADOPTED]` phê chuẩn quy ước brownfield (`AD-1..AD-3`) và các quyết định kiến trúc mới (`AD-4..AD-9`) đều gắn `Binds / Prevents / Rule` kiểm chứng được khi đọc PR. Mọi yêu cầu chức năng `FR-1..FR-15` đều được ánh xạ trong `Capability → Architecture Map` và không có lỗi từ `lint_spine.py`. Cần bổ sung một số ràng buộc giao diện chi tiết từ UX/PRD để không rơi yêu cầu khi chia Story ở Bài 4.7.

---

## 2. Good-Spine Checklist Evaluation

| Tiêu chí (`reviewer-gate.md`) | Đánh giá | Nhận xét |
| --- | --- | --- |
| Khóa đủ các điểm phân kỳ cho tầng dưới (Stories) | **Adequate → Strong sau khi thêm AD-10** | Đã khóa state machine, kho JSON phẳng, mutex re-entrant, overlay catalog, auth 2 lớp và API queue; cần khóa thêm chữ ký TypeScript chính xác giữa các module (`AD-10`). |
| Mỗi `AD` có `Rule` kiểm chứng được (enforceable) | **Strong** | Tất cả `AD` đều nêu rõ tên file, tên hàm, mã lỗi, thứ tự ưu tiên `503 → 401`, không có câu chữ chung chung. |
| Mục `Deferred` không để lọt quyết định gây phân kỳ | **Strong** | 4 mục hoãn (DB thật/multi-node lock, server session revocation/RBAC, khóa `/orders` công khai + SĐT lookup, phân trang/KPI v1.1) đều đã chốt phương án v1 trong các `AD`. |
| Phê chuẩn đúng codebase brownfield (`[ADOPTED]`) | **Strong** | `AD-1`, `AD-2`, `AD-3` bảo vệ nguyên vẹn cấu trúc `src/features/`, `OrderRepository`, `OrderError`, `handleRouteError` và 83 unit tests hiện có. |
| Bao phủ Operational / Environmental Envelope | **Strong** | Đã khóa runtime Node.js single-node, biến môi trường (`ORDERS_FILE`, `INVENTORY_FILE`, `ADMIN_PASSCODE`), và cô lập dữ liệu test (`InMemory*` / `os.tmpdir()`). |

---

## 3. Input Reconciliation Matrix (`prd.md` + `DESIGN.md` + `EXPERIENCE.md`)

| Nguồn | Yêu cầu / Ràng buộc | Hiện diện trong `ARCHITECTURE-SPINE.md` | Trạng thái |
| --- | --- | --- | --- |
| `prd.md` FR-1..FR-4 | Ma trận 5×5, `expectedStatus`, hủy bắt buộc lý do `1..200` ký tự, `statusHistory` + fallback đơn cũ, khách chỉ hủy `pending` | `AD-4`, `AD-9`, `Consistency Conventions`, `Capability → Architecture Map` | **Đầy đủ** |
| `prd.md` FR-5..FR-7 | `storage/inventory.json`, trừ kho ở `pending` all-or-nothing + rollback, hoàn kho idempotent + `POST /api/admin/orders/:id/restock` | `AD-2`, `AD-5`, `AD-6` | **Đầy đủ** |
| `prd.md` FR-8 | Đọc tồn kho động `force-dynamic` trên `/`, `/products`, `/products/[slug]`, `/api/products*`; giữ form + giỏ ở `/checkout` khi `409` | `AD-7`, `Capability → Architecture Map` *(cần ghi rõ bảo toàn state form `/checkout` khi nhận `409`)* | **Bổ sung nhỏ** |
| `prd.md` FR-9..FR-11 | Fail-closed `503` trước `401`, `SHA-256` + `timingSafeEqual`, cookie `shoplite_admin` 8h HMAC, `src/proxy.ts` + `/api/admin/*`, logout `200` | `AD-8`, Sequence Diagram | **Đầy đủ** |
| `prd.md` FR-12..FR-15 & `EXPERIENCE.md` | URL query `?status=&q=`, `counts` từng tab, FIFO cho `pending`, `ReservedStockIndicator` 3 bậc, `RestockStatusBadge`, `CancelOrderDialog` 3 chip điền vào textarea, xử lý `401` (`?expired=1`) & `409` (auto-refresh), `OrderProgressTimeline` 4 bước + `RefreshStatusButton` | `AD-4`, `AD-9`, `Structural Seed` | **Đầy đủ** |
| `DESIGN.md` | Token màu Tailwind v4 hex, `OrderStatusBadge` `cancelled` dùng `text-slate-600` + icon `lucide-react`, vùng chạm `min-h-11` (`44px`), không tràn ngang `390px` | `Structural Seed` (`order-status-badge.tsx`, `admin-orders-view.tsx`) — nên thêm 1 dòng quy ước UI & Accessibility vào `Consistency Conventions` để Story UI không quên tham chiếu `DESIGN.md` & `EXPERIENCE.md`. | **Bổ sung nhỏ** |

---

## 4. Findings cần cập nhật vào `ARCHITECTURE-SPINE.md`
1. **[medium]** Bổ sung dòng quy ước **UI, Trợ năng & Xử lý lỗi Client** vào bảng `Consistency Conventions` (ràng buộc các Story UI tuân thủ token `DESIGN.md`, `min-h-11` `44px`, giữ state form `/checkout` khi `409`, tự điều hướng `/admin/login?expired=1` khi `401` và tự tải lại danh sách khi `409`).
