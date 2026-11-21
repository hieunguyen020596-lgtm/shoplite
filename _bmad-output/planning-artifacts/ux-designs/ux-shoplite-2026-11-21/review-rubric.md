# Spine Pair Review — ShopLite Ops

- **Ngày review:** 2026-11-21
- **Chế độ:** Independent UX Spine Rubric Reviewer (`bmad-ux/references/validate.md` — 8 hạng mục)
- **Đánh giá trên bản:** `status: draft` (trước khi chỉnh sửa chốt `status: final`)

## Overall verdict

Cặp tài liệu xương sống `DESIGN.md` + `EXPERIENCE.md` đạt chất lượng tốt, gọn, bám sát PRD và codebase hiện hữu: toàn bộ token màu được quy đổi chính xác từ bảng màu OKLCH của Tailwind CSS v4, mọi tham chiếu `{path.to.token}` đều hợp lệ, 15/15 tên component khớp 1–1 giữa hai file, và cả 3 mockup HTML trong `mockups/` đều tồn tại, bám đúng bề mặt IA và không gây tràn ngang (`scrollWidth <= 390px`) trên khung mobile `390px`. Tuy nhiên, vẫn còn một số điểm lệch mức **high/medium** giữa mockup với spine và giữa đặc tả hành vi với đặc tả thị giác (đáng chú ý nhất là thiếu đặc tả thị giác cho ô nhập mã vận đơn tùy chọn ở bước `confirmed → shipping` trong `DESIGN.md`, xung đột độ tương phản/icon trên `OrderStatusBadge` trạng thái `cancelled`, và mockup fallback đơn cũ trong `order-detail-timeline.html` bị thiếu bước 3), cần chỉnh trước khi bàn giao sang `bmad-architecture` và phát triển Story.

---

## 1. Flow coverage — adequate

Đã trích xuất toàn bộ hành trình người dùng (`UJ-1`, `UJ-2`, `UJ-3`) và 15 yêu cầu chức năng (`FR-1` → `FR-15`) từ `sources` frontmatter (`prd.md`), đối chiếu với `EXPERIENCE.md#Key Flows` và `EXPERIENCE.md#Component Patterns`.

### Findings
- **[medium]** Bước chuyển trạng thái cuối cùng `shipping → delivered` (**"Đánh dấu đã giao"** thuộc `FR-1` và `Resolution` của `UJ-2`) chưa được đi qua trong Key Flows (`EXPERIENCE.md#Key Flows`). *Fix:* Bổ sung bước `shipping → delivered` vào `UJ-1` và bước hoàn tất 4/4 vào `UJ-2`.
- **[low]** Luồng Khách hàng tự hủy đơn ở trạng thái `pending` (`FR-4`) và trạng thái tìm kiếm không có kết quả (`FR-12`, nút **"Xóa bộ lọc"**) chưa được nhắc như nhánh phụ trong Key Flows. *Fix:* Thêm nhánh phụ ngắn ở `UJ-1` và `UJ-2`.

---

## 2. Token completeness — adequate

Mọi `{path.to.token}` đều phân giải đúng key trong frontmatter, mọi màu đều có hex 6 ký tự chuẩn Tailwind v4 (`color-scheme: light`), và tỉ lệ tương phản WCAG 2.2 AA được ghi rõ.

### Findings
- **[high]** Mâu thuẫn độ tương phản trên `OrderStatusBadge` trạng thái `cancelled` (`src/features/orders/components/order-status-badge.tsx` dùng `text-slate-500` đạt `4.35:1 < 4.5:1`). *Fix:* Chốt delta nâng class `cancelled` lên `text-slate-600` (`{colors.text-secondary}`, `6.92:1`).
- **[medium]** Tên thang bo góc `rounded.md/lg/xl` lệch 1 bậc so với tên class Tailwind v4 (`rounded-lg/xl/2xl`). *Fix:* Đổi key frontmatter sang `lg: 8px`, `xl: 12px`, `2xl: 16px`, `full: 9999px` khớp 1–1 với Tailwind v4.
- **[low]** Một số token frontmatter (`colors.danger-hover`, `colors.danger-foreground`, `colors.warning`, `colors.info-ring`, `spacing.2`, `spacing.3`) chưa được giải thích công dụng hoặc không dùng. *Fix:* Xóa token thừa (`colors.warning`) và tài liệu hóa đầy đủ các token còn lại.

---

## 3. Component coverage — adequate

15/15 tên component khớp 1–1 giữa `DESIGN.md#Components` và `EXPERIENCE.md#Component Patterns`.

### Findings
- **[high]** Thiếu đặc tả thị giác cho ô nhập ghi chú mã vận đơn tùy chọn (`confirmed → shipping`) của `AdminOrderCard` trong `DESIGN.md` và `mockups/admin-orders.html`. *Fix:* Bổ sung đặc tả thị giác chi tiết + minh họa trên `admin-orders.html`.
- **[medium]** `OrderStatusBadge` nằm ở nhóm *"Không thay đổi thị giác gốc"* nhưng lại yêu cầu bổ sung icon và sửa tương phản `cancelled`. *Fix:* Tách rõ `OrderStatusBadge` sang diện delta nhẹ có chủ đích và khóa bảng ánh xạ icon `lucide-react` cho cả 5 trạng thái.
- **[low]** Thiếu đặc tả thị giác ngắn cho trạng thái loading skeleton của `AdminOrderCard`. *Fix:* Bổ sung vào mục `AdminOrderCard` trong `DESIGN.md`.

---

## 4. State coverage — adequate

Phủ hầu hết trạng thái trên cả 5 bề mặt IA.

### Findings
- **[medium]** Bề mặt `/orders/[id]` thiếu đặc tả lỗi `404 ORDER_NOT_FOUND` và xung đột `409` trên `CancelOrderButton` (kèm `router.refresh()`). *Fix:* Bổ sung 2 hàng vào `State Patterns`.
- **[low]** Thiếu trạng thái `?placed=1` (`role="status"`) và lỗi máy chủ `500 INTERNAL_ERROR` trong `State Patterns`. *Fix:* Bổ sung vào `State Patterns`.

---

## 5. Visual reference coverage — adequate

3/3 mockup HTML trong `mockups/` tồn tại, không có file mồ côi, liên kết nội tuyến đúng ngữ cảnh, `scrollWidth <= 390px`.

### Findings
- **[high]** Khối Fallback đơn cũ trong `mockups/order-detail-timeline.html` chỉ render 3 bước (thiếu bước `3. Đang giao`) và gán `.current` cho `4. Đã giao`. *Fix:* Sửa thành đủ 4 bước với dấu `"—"` cho bước 2 & 3 và `.done` cho bước 4.
- **[medium]** `mockups/admin-orders.html` có nút `.btn-sm` (`36px`), `.tab` (`40px`), `.chip` (`~28px`) thấp hơn `44px`; mobile Card 1 rút gọn `Đã giữ 2`; Card 3 chứa chú thích meta trong dòng sản phẩm. *Fix:* Nâng chiều cao chạm lên `44px`, khôi phục đầy đủ `Đã giữ 2 cho đơn này`, bỏ chú thích meta.
- **[low]** Bổ sung thẻ `confirmed` có ô nhập mã vận đơn vào `admin-orders.html`; đồng bộ `max-width: 400px` và tên biến `--warning-strong` trong `admin-login.html`.

---

## 6. Bloat & overspecification — strong
Cô đọng, kỷ luật delta, không lặp PRD hay văn phong trang trí thừa.

## 7. Inheritance discipline — strong
`sources`, UJ names, Glossary và 15/15 component names nhất quán cao.
### Findings
- **[low]** Dòng 247 `DESIGN.md` gọi `danger-outline` không tồn tại trong `button.tsx`. *Fix:* Đổi thành `secondary` viền `{colors.danger-ring}` chữ `{colors.danger-text}`.

## 8. Shape fit — strong
Tuân thủ tuyệt đối thứ tự mục chuẩn của `DESIGN.md` và `EXPERIENCE.md`.

---

## Mechanical notes & Resolution Log
- **Số lượng Findings (trên bản draft):** Critical `0` · High `3` · Medium `5` · Low `6` (tổng 14 findings).
- **Trạng thái xử lý:** Toàn bộ **3 High**, **5 Medium** và **6 Low** đã được sửa triệt để trên `DESIGN.md`, `EXPERIENCE.md` và cả 3 mockup HTML trước khi chốt `status: final`.
