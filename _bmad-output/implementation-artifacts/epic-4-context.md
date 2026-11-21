# Epic 4 Context: Khách hàng theo dõi tiến trình đơn hàng

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Khách hàng xem được Timeline tiến trình 4 bước rõ ràng (kèm mốc thời gian, ghi chú vận chuyển, lý do hủy và fallback an toàn cho đơn cũ thiếu `statusHistory`) và tự làm mới trạng thái ngay trên `/orders/[id]`, đồng thời bảo toàn quyền tự hủy khi đơn còn `pending` mà không làm hồi quy bất kỳ luồng mua sắm hay kiểm thử hiện có nào.

## Stories

- Story 4.1: Timeline tiến trình 4 bước & Làm mới trạng thái tại `/orders/[id]`

## Requirements & Constraints

- **Timeline 4 bước (`OrderProgressTimeline`):** Với đơn chưa hủy (`pending`, `confirmed`, `shipping`, `delivered`), hiển thị đủ 4 bước theo thứ tự `Chờ xác nhận` → `Đã xác nhận` → `Đang giao` → `Đã giao`. Các bước đã hoàn thành hiển thị mốc thời gian định dạng tiếng Việt qua `formatDateTime()` và khung ghi chú vận chuyển (`note`, nếu có).
- **Trạng thái hủy (`cancelled`):** Với đơn mới có `statusHistory`, hiển thị hộp trạng thái hủy nêu rõ tác nhân hủy (`"Khách hàng"` hoặc `"Cửa hàng"`), thời điểm hủy và lý do hủy (nếu do cửa hàng hủy).
- **Tương thích ngược đơn cũ:** Đơn lịch sử trong `storage/orders.json` thiếu `statusHistory` (`undefined`) hoặc có trường thừa (`discount`, `couponCode`) tuyệt đối không được gây lỗi runtime:
  - Đơn chưa hủy: vẫn hiển thị đủ 4 bước — bước 1 dùng `createdAt`, bước hiện tại (nếu khác `pending`) dùng `updatedAt`, các bước trung gian suy luận hiển thị `"—"` (không bịa mốc thời gian).
  - Đơn hủy cũ: hiển thị `"Đơn đã hủy"` kèm `updatedAt` và ẩn phần tác nhân/lý do.
- **Làm mới thủ công (`RefreshStatusButton`):** Cung cấp nút **"Làm mới trạng thái"** kích hoạt `router.refresh()` để tải dữ liệu server mới nhất. Cấm chạy polling tự động 30 giây hay WebSocket/SSE (tránh tranh chấp I/O file JSON và flaky E2E).
- **Quy tắc tự hủy đơn (`CancelOrderButton`):** Chỉ render khi `order.status === "pending"` (gọi `PATCH /api/orders/:id` với `{ "status": "cancelled" }`). Khi đơn chuyển sang `confirmed`, `shipping` hoặc trạng thái kết thúc, ẩn nút hủy và hiển thị dòng giải thích: *"Đơn hàng đã được xác nhận — vui lòng liên hệ cửa hàng nếu cần hỗ trợ."* Nếu khách bấm hủy đúng lúc nhân viên vừa xác nhận (`409 INVALID_STATUS_TRANSITION`), hiển thị lỗi `role="alert"` và tự gọi `router.refresh()` để đồng bộ UI.
- **Bảo toàn hành vi hiện có & Kiểm thử:** Giữ nguyên banner `role="status"` *"Đặt hàng thành công!"* khi URL có `?placed=1` và `order.status === "pending"`, trang `404` qua `notFound()`, cùng toàn bộ hợp đồng `/orders`. Phải pass 100% `npm run check` và `e2e/shopping-flow.spec.ts` (gồm `order-row` tại `/orders`).
- **Trợ năng & Responsive `390px`:** Đạt WCAG 2.2 AA; không tràn ngang trên viewport `390px` (`scrollWidth <= innerWidth`); mọi nút hành động đạt chiều cao vùng chạm tối thiểu `min-h-11` (`44px`).

## Technical Decisions

- **Tách lõi nghiệp vụ thuần & suy luận fallback:** Lõi miền không import `next/*` hay `react`. Sử dụng hàm thuần `synthesizeStatusHistory(order)` từ `src/features/orders/order-state-machine.ts` và kiểu `OrderStatusEvent` (`status`, `at` ISO 8601, `actor: "customer" | "staff"`, `action: "transition" | "restock"`, `note?` `<= 200` ký tự) từ `src/features/orders/types.ts`.
- **Kiến trúc component tại `/orders/[id]`:** Server Component `src/app/orders/[id]/page.tsx` giữ khung `max-w-4xl` (`896px`), truyền dữ liệu đơn hàng xuống các component trong `src/features/orders/components/`: tạo mới `order-progress-timeline.tsx` và `refresh-status-button.tsx`, cập nhật `cancel-order-button.tsx`.
- **Định dạng & Nền tảng:** Dùng `formatDateTime()` và `formatCurrency()` từ `src/lib/format.ts`; ứng dụng chạy chế độ sáng duy nhất (`color-scheme: light`), font **Be Vietnam Pro** và icon `lucide-react`.

## UX & Interaction Patterns

- **Quy tắc 3 tín hiệu (không chỉ dùng màu):** Mọi bước Timeline, hộp trạng thái hủy và `OrderStatusBadge` phải kết hợp đồng thời **màu sắc + icon `lucide-react` / ký hiệu + văn bản tiếng Việt**.
- **Tokens thị giác `OrderProgressTimeline` (Tailwind v4):**
  - Thẻ bao: `{colors.bg-surface}` (`#FFFFFF`) trên nền trang `{colors.bg-page}` (`#F8FAFC`), `{rounded.2xl}`, `ring-1` `{colors.border-default}` (`#E2E8F0`), `shadow-sm`.
  - Danh sách có thứ tự `<ol>` 4 bước dọc:
    - *Đã hoàn thành:* nút tròn `{colors.success-soft}` (`#ECFDF5`), viền `{colors.success}` (`#009966`), chữ/icon `Check` `{colors.success-text}` (`#007A55`); thanh nối `2px` màu `{colors.success}`.
    - *Bước hiện tại:* nút tròn nền `{colors.primary}` (`#4F39F6`), chữ `{colors.primary-foreground}` (`#FFFFFF`), vòng halo `{colors.primary-soft}` (`#EEF2FF`).
    - *Bước chưa tới:* viền `{colors.border-strong}` (`#CAD5E2`), chữ `{colors.text-muted}` (`#62748E`), thanh nối `{colors.border-default}` (`#E2E8F0`).
    - *Ghi chú vận đơn:* khối `{rounded.lg}`, nền `{colors.primary-soft}` (`#EEF2FF`), chữ `{colors.primary-text}` (`#432DD7`).
  - *Hộp đơn `cancelled`:* bo `{rounded.xl}`, nền `{colors.danger-soft}` (`#FFF1F2`), viền `{colors.danger-ring}` (`#FFCCD3`), chữ `{colors.danger-text}` (`#C70036`).
- **Tokens thị giác `RefreshStatusButton`:** Nút `secondary` bo `{rounded.xl}`, nền `{colors.bg-surface}`, viền `{colors.border-strong}`, chữ `{colors.text-primary}` (`#0F172B`), chiều cao `min-h-11` (`44px`), icon `RefreshCw` xoay (`animate-spin`) kèm nhãn `"Đang làm mới…"` khi đang tải, nhãn mặc định `"Làm mới trạng thái"`.
- **Xử lý lỗi & Focus:** Lỗi `409`, `500` hoặc mất mạng khi hủy đơn phải hiển thị `role="alert"` *"Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại."* hoặc thông báo lỗi phù hợp, giữ nguyên trạng thái hiện tại; thông báo `?placed=1` dùng `role="status"` (`aria-live="polite"`). Mọi nút dùng `focus-visible:outline-2 focus-visible:outline-offset-2`.

## Cross-Story Dependencies

- **Epic 1 (Story 1.1 & 1.3):** Cung cấp cấu trúc `statusHistory` (`OrderStatusEvent[]`), hàm thuần `synthesizeStatusHistory(order)` trong `order-state-machine.ts`, và hành vi `409` của `PATCH /api/orders/:id` khi nhân viên đã xác nhận đơn trước đó.
- **Epic 3 (Story 3.1):** Dùng chung `OrderStatusBadge` đã nâng cấp icon `lucide-react` (`Clock`, `CheckCircle2`, `Truck`, `PackageCheck`, `XCircle`, `size-3`, `aria-hidden="true"`) và màu chữ `text-slate-600` (`#45556C`) trên nền `bg-slate-100` (`#F1F5F9`) cho trạng thái `cancelled`.
