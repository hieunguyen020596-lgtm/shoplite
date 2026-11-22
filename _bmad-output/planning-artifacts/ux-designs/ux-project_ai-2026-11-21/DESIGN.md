---
name: ShopLite
description: Cửa hàng đồ công nghệ mini (Next.js 16 + Tailwind CSS v4). File ghi lại design system ngầm định đang chạy và phần bổ sung (delta) cho vận hành đơn hàng.
status: final
sources:
  - _bmad-output/planning-artifacts/prds/prd-project_ai-2026-11-21/prd.md
created: 2026-11-21
updated: 2026-11-21
colors:
  # Palette mặc định của Tailwind v4 (giá trị gốc là oklch; hex dưới đây là giá trị tương đương để tham chiếu).
  # Code dùng utility class trực tiếp (bg-indigo-600...), không có @theme màu riêng. KHÔNG thêm token màu mới.
  primary: "#4F46E5" # indigo-600: nút primary, focus ring, link hover, bước timeline đã qua
  primary-hover: "#6366F1" # indigo-500
  primary-soft: "#EEF2FF" # indigo-50: nav đang chọn, OptionCard được chọn
  primary-strong: "#4338CA" # indigo-700: chữ trên primary-soft, tổng tiền
  page: "#F8FAFC" # slate-50: nền body
  surface: "#FFFFFF" # nền thẻ, header (90% + blur)
  border: "#E2E8F0" # slate-200: ring của thẻ, viền header
  border-input: "#CBD5E1" # slate-300: ring của input, nút secondary, viền EmptyState
  text: "#0F172A" # slate-900
  text-body: "#475569" # slate-600
  text-muted: "#64748B" # slate-500
  text-placeholder: "#94A3B8" # slate-400
  danger: "#E11D48" # rose-600: nút danger, chữ lỗi field, dấu *
  danger-ring: "#FB7185" # rose-400: input lỗi
  danger-soft: "#FFF1F2" # rose-50: ô alert
  danger-strong: "#BE123C" # rose-700: chữ trong ô alert
  success: "#059669" # emerald-600: icon thành công
  success-soft: "#ECFDF5" # emerald-50
  success-strong: "#047857" # emerald-700
  # Badge trạng thái đơn (order-status-badge.tsx): nền -50 / chữ -700 / ring -200
  status-pending: "#B45309" # amber-700 trên amber-50 #FFFBEB
  status-confirmed: "#0369A1" # sky-700 trên sky-50 #F0F9FF
  status-shipping: "#4338CA" # indigo-700 trên indigo-50
  status-delivered: "#047857" # emerald-700 trên emerald-50
  status-cancelled: "#64748B" # slate-500 trên slate-100 #F1F5F9
  status-failed: "#BE123C" # MỚI: rose-700 trên rose-50, ring rose-200 #FECDD3
typography:
  # Be Vietnam Pro (next/font/google, subsets latin + vietnamese, weight 400/500/600/700) qua --font-sans.
  page-title: {
      fontFamily: "Be Vietnam Pro",
      fontSize: 24px,
      fontWeight: "700",
    } # text-2xl font-bold
  section-title: {
      fontFamily: "Be Vietnam Pro",
      fontSize: 18px,
      fontWeight: "600",
    } # text-lg font-semibold
  body: { fontFamily: "Be Vietnam Pro", fontSize: 14px, fontWeight: "400" } # text-sm
  body-strong:
    { fontFamily: "Be Vietnam Pro", fontSize: 14px, fontWeight: "600" }
  label: { fontFamily: "Be Vietnam Pro", fontSize: 14px, fontWeight: "500" } # label của field
  caption: { fontFamily: "Be Vietnam Pro", fontSize: 12px, fontWeight: "400" } # text-xs: lỗi field, mô tả phụ
  badge: { fontFamily: "Be Vietnam Pro", fontSize: 12px, fontWeight: "600" }
  order-id:
    {
      fontFamily: "Be Vietnam Pro",
      fontSize: 14px,
      fontWeight: "600",
      note: "MỚI: tabular-nums cho Mã đơn và giờ",
    }
rounded:
  md: 8px # rounded-lg: logo, mục nav
  xl: 12px # rounded-xl: nút, input, OptionCard, alert
  2xl: 16px # rounded-2xl: thẻ, EmptyState, khung ảnh lớn
  sheet: 16px # MỚI: chỉ bo hai góc trên của bottom sheet (rounded-t-2xl)
  full: 9999px # badge, chip lọc, chấm timeline
spacing:
  # Thang 4px mặc định của Tailwind.
  gutter: 16px # px-4: lề ngang trang ở mọi breakpoint
  card-padding: 20px # p-5
  section-gap: 24px # gap-6
  page-y: 32px # py-8
  container: 1152px # max-w-6xl (header, catalog, checkout)
  container-narrow: 896px # max-w-4xl (trang đơn); /staff dùng cùng mức này
components:
  button-primary:
    {
      background: "{colors.primary}",
      foreground: "#FFFFFF",
      hover: "{colors.primary-hover}",
      radius: "{rounded.xl}",
    }
  button-secondary:
    {
      background: "{colors.surface}",
      foreground: "{colors.text}",
      ring: "{colors.border-input}",
      radius: "{rounded.xl}",
    }
  button-ghost:
    {
      background: transparent,
      foreground: "#334155",
      hover: "#F1F5F9",
      radius: "{rounded.xl}",
    }
  button-danger:
    {
      background: "{colors.danger}",
      foreground: "#FFFFFF",
      radius: "{rounded.xl}",
    }
  button-size: { sm: 32px, md: 40px, lg: 48px }
  card:
    {
      background: "{colors.surface}",
      ring: "{colors.border}",
      shadow: shadow-sm,
      radius: "{rounded.2xl}",
      padding: "{spacing.card-padding}",
    }
  input:
    {
      height: 44px,
      ring: "{colors.border-input}",
      focus-ring: "2px {colors.primary}",
      error-ring: "{colors.danger-ring}",
      radius: "{rounded.xl}",
    }
  alert-error:
    {
      background: "{colors.danger-soft}",
      foreground: "{colors.danger-strong}",
      radius: "{rounded.xl}",
    }
  alert-success:
    {
      background: "{colors.success-soft}",
      foreground: "#064E3B",
      ring: "#A7F3D0",
      radius: "{rounded.2xl}",
    }
  status-badge:
    {
      radius: "{rounded.full}",
      typography: "{typography.badge}",
      padding: "2px 10px",
    }
  # --- MỚI ---
  staff-header:
    {
      background: "{colors.surface}",
      border-bottom: "{colors.border}",
      height: 56px,
    }
  filter-chip:
    {
      radius: "{rounded.full}",
      height: 36px,
      active-background: "{colors.primary-soft}",
      active-foreground: "{colors.primary-strong}",
      idle-ring: "{colors.border}",
    }
  order-queue-card: { extends: card, padding: 16px }
  timeline-dot:
    {
      size: 12px,
      done: "{colors.primary}",
      current-ring: "2px {colors.primary}",
      upcoming: "{colors.border-input}",
      failed: "{colors.danger}",
      cancelled: "{colors.text-muted}",
    }
  action-bar:
    {
      background: "{colors.surface}",
      border-top: "{colors.border}",
      padding: "12px {spacing.gutter}",
      button: "{components.button-size.lg}",
    }
  bottom-sheet:
    {
      background: "{colors.surface}",
      radius: "{rounded.sheet}",
      scrim: "slate-900 / 40%",
    }
  masked-field:
    { foreground: "{colors.text-muted}", note: "SĐT đã che, ví dụ 09****678" }
---

## Brand & Style

ShopLite là một cửa hàng đồ công nghệ nhỏ. Giao diện sạch, sáng và thân thiện: nền xám rất nhạt, nội dung đặt trong thẻ trắng bo tròn lớn. Indigo là màu duy nhất mang tính thương hiệu. Sản phẩm không dùng ảnh chụp mà hiển thị bằng emoji trên nền gradient pastel, tạo cảm giác vui và nhẹ.

**File này ghi lại hệ đang chạy, không thiết kế lại.** Các màn mới (`/staff`, tra đơn, Timeline) phải trông như cùng một sản phẩm. Phần **MỚI** trong file chỉ bổ sung những gì code chưa có. Mọi giá trị khác lấy từ code hiện tại; nếu code và file này lệch nhau thì sửa file này cho khớp code.

Màn nhân viên giữ nguyên ngôn ngữ thị giác của phía khách. Nó chỉ dày thông tin hơn: thẻ có padding 16px thay vì 20px, và không có emoji trang trí ngoài ảnh sản phẩm.

## Colors

- **Indigo (`{colors.primary}`)** là màu duy nhất cho hành động chính, focus, mục đang chọn, và bước Timeline đã qua. Mỗi màn hình chỉ có **một** nút primary.
- **Slate** dùng cho mọi thứ trung tính: nền trang `{colors.page}`, viền `{colors.border}`, chữ `{colors.text}`/`{colors.text-body}`/`{colors.text-muted}`.
- **Rose (`{colors.danger}`)** chỉ dành cho hành động phá hủy (hủy đơn, Giao thất bại), lỗi, và trạng thái `failed`. Không dùng rose để trang trí.
- **Emerald** chỉ dùng để báo thành công ("Đặt hàng thành công!", thông báo sau khi chuyển trạng thái).
- **Màu trạng thái đơn** giữ nguyên bộ của `OrderStatusBadge`, theo mẫu nền `-50`, chữ `-700`, ring `-200`. **MỚI:** `failed` dùng rose. Giao thất bại là một kết cục xấu, cần phân biệt với `cancelled` màu xám trung tính.
- Không thêm màu nào khác. Riêng amber hiện chỉ dùng cho badge `pending` và sao đánh giá; **MỚI:** amber được dùng thêm cho nhãn "Sắp quá hạn" (`bg-amber-50 text-amber-700`), vì nhãn này là cảnh báo gắn với chính đơn `pending`.

## Typography

Toàn bộ dùng Be Vietnam Pro, vì font này hiển thị dấu tiếng Việt tốt. Thang chữ có sẵn: `page-title` (24/700), `section-title` (18/600), `body` (14), `caption` (12). Không có chữ display hay serif.

**MỚI:** Mã đơn, giờ đặt và số tiền trong Hàng đợi dùng `tabular-nums` để các cột số thẳng hàng khi lướt nhanh.

## Layout & Spacing

- Lề ngang `{spacing.gutter}` (16px) ở mọi breakpoint. Trang đơn và `/staff` rộng tối đa `{spacing.container-narrow}`.
- Thiết kế từ **390px** trở lên, và phải dùng được ở **360px** (màn ngoài của iPhone gập, xem EXPERIENCE.md mục Responsive). Breakpoint chính là `sm` (640px) và `md` (768px).
- **MỚI:** Hàng đợi ở 390px là một cột thẻ, từ `md` thành lưới hai cột. Chi tiết đơn của nhân viên ở 390px dành 72px cộng vùng an toàn đáy (`env(safe-area-inset-bottom)`, 34pt trên iPhone có Face ID) cho `action-bar` sticky, để nội dung không bị che.
- **MỚI (desktop ≥ md):** Chi tiết đơn của nhân viên xếp thẻ thành lưới 2 cột, khoảng cách 16px; nút thao tác cỡ `md` nằm ở dòng tiêu đề. Timeline của khách nằm ngang. Bottom sheet hiển thị thành dialog rộng 448px, padding 24px, `shadow-xl`.

## Elevation & Depth

Chỉ có hai mức nổi: thẻ dùng `shadow-sm` cộng ring, thẻ có link thì hover lên `shadow-md`. Header có blur trên nền trắng 90%.

**MỚI:** `bottom-sheet` là lớp duy nhất nằm trên nội dung, có scrim `slate-900/40`. `action-bar` không đổ bóng, chỉ có viền trên `{colors.border}`.

## Shapes

Mọi phần tử tương tác (nút, input, OptionCard, alert) bo `{rounded.xl}`. Thẻ và vùng chứa bo `{rounded.2xl}`. Badge, chip và chấm Timeline bo tròn hẳn (`{rounded.full}`). **MỚI:** bottom sheet chỉ bo hai góc trên.

## Components

**Có sẵn, dùng nguyên không sửa:** `Button`/`buttonStyles` (primary, secondary, ghost, danger; sm, md, lg), `EmptyState`, `OrderStatusBadge`, `ProductImage`, `PriceTag`, `QuantityInput`, `Field` cùng `inputClass` (ở checkout-form), `OptionCard`. Icon lấy từ `lucide-react`, cỡ `size-4` hoặc `size-5`.

**Mở rộng:**

- **OrderStatusBadge:** thêm `failed` với màu `{colors.status-failed}`.
- **Field/inputClass:** nên tách ra `components/ui` để form đăng nhập và form tra đơn dùng chung `[ASSUMPTION]`.

**MỚI:**

- **Staff header:** cao 56px, nền trắng, viền dưới. Bên trái là logo (ô indigo `size-8` với icon `Store`) kèm chữ "Nhân viên" màu `{colors.text-muted}`. Bên phải là tên hiển thị (ẩn khi màn hình dưới `sm`) và nút ghost `sm` "Đăng xuất" có icon `LogOut`.
- **Filter chip:** chiều cao 36px, bo tròn hẳn. Chip đang chọn dùng `{colors.primary-soft}`/`{colors.primary-strong}`. Chip không chọn có nền trắng và ring `{colors.border}`. Số đếm là chữ `caption` đặt sau nhãn.
- **Order queue card:** gồm 3 dòng. Dòng 1: Mã đơn (`order-id`) và badge, kèm nhãn "Sắp quá hạn" nếu có. Dòng 2: tên khách và SĐT. Dòng 3: thời gian đặt, số sản phẩm, phương thức thanh toán (icon `Banknote`/`CreditCard` như ở checkout), tổng tiền đặt bên phải dùng `body-strong`.
- **Timeline:** danh sách dọc. Mỗi bước có chấm 12px nối bằng đường dọc 2px. Bước đã qua: chấm `{colors.primary}`, đường indigo. Bước hiện tại: chấm có viền indigo, nhãn `body-strong`. Bước chưa tới: chấm và chữ `{colors.border-input}`. Bước `failed`: chấm rose, Lý do hiện trong ô `alert-error`. Bước `cancelled`: chấm `{colors.text-muted}`, Lý do hiện trong ô nền `slate-50`.
- **Action bar** (chỉ dưới `md`): sticky ở đáy, nền trắng, chứa một nút primary `lg` rộng toàn phần. Nếu bước có kết cục xấu thì thêm một nút secondary hoặc danger `lg` bên cạnh. Từ `md` trở lên, các nút nằm trong header của thẻ chi tiết.
- **Bottom sheet:** trên mobile trượt lên từ đáy; từ `md` hiển thị thành dialog ở giữa, rộng tối đa 448px. Gồm tiêu đề `section-title`, danh sách Lý do có sẵn dạng `OptionCard`, ô "Lý do khác", nút danger `lg` để xác nhận và nút ghost "Không".
- **Masked field:** SĐT đã che hiển thị bằng `{colors.text-muted}`, kèm icon `Lock` cỡ `size-4`.

→ Mockup tham chiếu: `mockups/staff-queue.html`, `mockups/staff-order-detail.html`, `mockups/order-unverified.html`. Nếu mockup và file này mâu thuẫn, file này thắng.

## Do's and Don'ts

| Nên                                                              | Không nên                                                                     |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Dùng utility Tailwind mặc định giống code hiện có                | Thêm `@theme` màu riêng, CSS module, hay thư viện UI mới                      |
| Một nút primary mỗi màn, nằm ở chỗ dễ với tới trên mobile        | Đặt "Xác nhận" và "Hủy đơn" cùng màu, cùng cỡ cạnh nhau                       |
| Dùng rose cho hành động phá hủy và `failed`                      | Dùng rose cho `cancelled` (cancelled là xám)                                  |
| Trên nền `-50`, dùng chữ `-700` cho mọi badge và nhãn trạng thái | Phân biệt trạng thái chỉ bằng màu, không có chữ                               |
| Lấy icon từ `lucide-react`                                       | Dùng emoji trên màn nhân viên (emoji chỉ dành cho ảnh sản phẩm và EmptyState) |
