---
name: shoplite
description: Design system ngầm đang có của ShopLite (Tailwind CSS v4.3.3, Be Vietnam Pro, indigo/slate/rose/emerald) cộng phần delta cho Trang xác nhận, Tra đơn và Trang nhân viên. Không thiết kế lại.
status: final
created: 2026-11-21
updated: 2026-11-21
sources:
  - ../../prds/prd-shoplite-2026-11-21/prd.md
  - ../../prds/prd-shoplite-2026-11-21/addendum.md
  - ../../briefs/brief-shoplite-2026-11-21/brief.md
  - ../../briefs/brief-shoplite-2026-11-21/addendum.md
colors:
  # HIỆN CÓ. Hex là giá trị sRGB quy đổi từ OKLCH trong tailwindcss/theme.css v4.3.3.
  surface-page: '#f8fafc' # slate-50
  surface-card: '#ffffff' # white
  surface-muted: '#f1f5f9' # slate-100
  surface-skeleton: '#e2e8f099' # slate-200/60
  ink-primary: '#0f172b' # slate-900
  ink-strong: '#314158' # slate-700
  ink-secondary: '#45556c' # slate-600
  ink-muted: '#62748e' # slate-500
  ink-placeholder: '#90a1b9' # slate-400
  ink-inverse: '#ffffff' # white
  border-hairline: '#f1f5f9' # slate-100
  border-default: '#e2e8f0' # slate-200
  border-control: '#cad5e2' # slate-300
  focus-neutral: '#90a1b9' # slate-400
  primary: '#4f39f6' # indigo-600
  primary-hover: '#615fff' # indigo-500
  primary-soft: '#eef2ff' # indigo-50
  primary-ink: '#432dd7' # indigo-700
  danger: '#ec003f' # rose-600
  danger-hover: '#ff2056' # rose-500
  danger-soft: '#fff1f2' # rose-50
  danger-ink: '#c70036' # rose-700
  danger-ink-strong: '#8b0836' # rose-900
  danger-border: '#ff637e' # rose-400
  success-soft: '#ecfdf5' # emerald-50
  success-icon: '#009966' # emerald-600
  success-border: '#a4f4cf' # emerald-200
  success-ink: '#004f3b' # emerald-900
  rating: '#ffb900' # amber-400
  status-pending-bg: '#fffbeb' # amber-50
  status-pending-fg: '#bb4d00' # amber-700
  status-pending-ring: '#fee685' # amber-200
  status-confirmed-bg: '#f0f9ff' # sky-50
  status-confirmed-fg: '#0069a8' # sky-700
  status-confirmed-ring: '#b8e6fe' # sky-200
  status-shipping-bg: '#eef2ff' # indigo-50
  status-shipping-fg: '#432dd7' # indigo-700
  status-shipping-ring: '#c6d2ff' # indigo-200
  status-delivered-bg: '#ecfdf5' # emerald-50
  status-delivered-fg: '#007a55' # emerald-700
  status-delivered-ring: '#a4f4cf' # emerald-200
  status-cancelled-bg: '#f1f5f9' # slate-100
  status-cancelled-fg: '#45556c' # slate-600. Delta, xem mục Colors
  status-cancelled-ring: '#e2e8f0' # slate-200
  # DELTA. Vẫn là màu trong palette Tailwind, chỉ thêm vai trò mới.
  flag-bg: '#fff1f2' # rose-50
  flag-fg: '#c70036' # rose-700
  flag-ring: '#ffccd3' # rose-200
  scrim: '#0f172b8c' # slate-900/55
typography:
  # HIỆN CÓ
  page-title:
    fontFamily: Be Vietnam Pro
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.333'
  section-title:
    fontFamily: Be Vietnam Pro
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.556'
  card-title:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '600'
    lineHeight: '1.5'
  body:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.429'
  label:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.429'
  button:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.429'
  button-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '600'
    lineHeight: '1.5'
  caption:
    fontFamily: Be Vietnam Pro
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.333'
  badge:
    fontFamily: Be Vietnam Pro
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.333'
  price-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 30px
    fontWeight: '700'
    lineHeight: '1.2'
  # DELTA
  order-code:
    fontFamily: Be Vietnam Pro
    fontSize: 20px
    fontWeight: '700'
    lineHeight: '1.4'
    letterSpacing: 0.01em
    note: 'Màn hẹp, class text-xl. Dùng tabular-nums'
  order-code-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.333'
    letterSpacing: 0.01em
    note: 'Desktop, class text-2xl. Dùng tabular-nums'
  tab-label:
    fontFamily: Be Vietnam Pro
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.333'
    note: 'Class text-xs'
  tab-label-active:
    fontFamily: Be Vietnam Pro
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1.333'
    note: 'Class text-xs'
  flag-label:
    fontFamily: Be Vietnam Pro
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1.333'
rounded:
  # HIỆN CÓ, trừ md là delta cho overdue-label và refund-flag-label. DEFAULT và 3xl đang dùng ở trang cửa hàng, giữ để đủ kiểm kê
  DEFAULT: 4px
  md: 6px
  lg: 8px
  xl: 12px
  2xl: 16px
  3xl: 24px
  full: 9999px
spacing:
  # HIỆN CÓ: thang 4px của Tailwind
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 20px
  '6': 24px
  '8': 32px
  '16': 64px
  page-gutter: 16px
  card-padding: 20px
  container-max: 1152px
  content-max: 896px
  control-sm: 32px
  control-md: 40px
  control-input: 44px
  control-lg: 48px
  header-height: 64px
  # DELTA
  tap-min: 44px
  dialog-max: 448px
  viewport-min: 390px
components:
  # HIỆN CÓ
  button-primary:
    background: '{colors.primary}'
    hover: '{colors.primary-hover}'
    foreground: '{colors.ink-inverse}'
    radius: '{rounded.xl}'
    typography: '{typography.button}'
  button-secondary:
    background: '{colors.surface-card}'
    hover: '{colors.surface-page}'
    foreground: '{colors.ink-primary}'
    ring: '{colors.border-control}'
    radius: '{rounded.xl}'
  button-ghost:
    hover: '{colors.surface-muted}'
    foreground: '{colors.ink-strong}'
    radius: '{rounded.xl}'
  button-danger:
    background: '{colors.danger}'
    hover: '{colors.danger-hover}'
    foreground: '{colors.ink-inverse}'
    radius: '{rounded.xl}'
  form-field:
    height: '{spacing.control-input}'
    background: '{colors.surface-card}'
    ring: '{colors.border-control}'
    ring-new-screens: '{colors.ink-muted}'
    ring-focus: '{colors.primary}'
    ring-error: '{colors.danger-border}'
    ring-error-new-screens: '{colors.danger}'
    error-text: '{colors.danger}'
    radius: '{rounded.xl}'
  card:
    background: '{colors.surface-card}'
    ring: '{colors.border-default}'
    radius: '{rounded.2xl}'
    padding: '{spacing.card-padding}'
  success-banner:
    background: '{colors.success-soft}'
    foreground: '{colors.success-ink}'
    icon: '{colors.success-icon}'
    ring: '{colors.success-border}'
    radius: '{rounded.2xl}'
  error-banner:
    background: '{colors.danger-soft}'
    foreground: '{colors.danger-ink}'
    radius: '{rounded.xl}'
  empty-state:
    background: '{colors.surface-card}'
    border: '{colors.border-control}'
    radius: '{rounded.2xl}'
  order-status-badge-pending:
    background: '{colors.status-pending-bg}'
    foreground: '{colors.status-pending-fg}'
    ring: '{colors.status-pending-ring}'
    radius: '{rounded.full}'
    typography: '{typography.badge}'
  order-status-badge-confirmed:
    background: '{colors.status-confirmed-bg}'
    foreground: '{colors.status-confirmed-fg}'
    ring: '{colors.status-confirmed-ring}'
    radius: '{rounded.full}'
    typography: '{typography.badge}'
  order-status-badge-shipping:
    background: '{colors.status-shipping-bg}'
    foreground: '{colors.status-shipping-fg}'
    ring: '{colors.status-shipping-ring}'
    radius: '{rounded.full}'
    typography: '{typography.badge}'
  order-status-badge-delivered:
    background: '{colors.status-delivered-bg}'
    foreground: '{colors.status-delivered-fg}'
    ring: '{colors.status-delivered-ring}'
    radius: '{rounded.full}'
    typography: '{typography.badge}'
  order-status-badge-cancelled:
    background: '{colors.status-cancelled-bg}'
    foreground: '{colors.status-cancelled-fg}'
    ring: '{colors.status-cancelled-ring}'
    radius: '{rounded.full}'
    typography: '{typography.badge}'
  # DELTA
  staff-header:
    height: '{spacing.header-height}'
    background: '{colors.surface-card}'
    border: '{colors.border-default}'
  order-search:
    height: '{spacing.control-input}'
    ring: '{colors.ink-muted}'
    ring-focus: '{colors.primary}'
    radius: '{rounded.xl}'
  order-tabs:
    min-height: '{spacing.tap-min}'
    foreground: '{colors.ink-secondary}'
    active-foreground: '{colors.primary-ink}'
    active-indicator: '{colors.primary}'
    typography: '{typography.tab-label}'
    active-typography: '{typography.tab-label-active}'
  tab-count:
    background: '{colors.flag-bg}'
    foreground: '{colors.flag-fg}'
    ring: '{colors.flag-ring}'
    radius: '{rounded.full}'
    typography: '{typography.badge}'
  order-row:
    background: '{colors.surface-card}'
    ring: '{colors.border-default}'
    radius: '{rounded.2xl}'
  order-table:
    background: '{colors.surface-card}'
    divider: '{colors.border-hairline}'
    radius: '{rounded.2xl}'
  overdue-label:
    background: '{colors.flag-bg}'
    foreground: '{colors.flag-fg}'
    ring: '{colors.flag-ring}'
    radius: '{rounded.md}'
    typography: '{typography.flag-label}'
  refund-flag-label-needed:
    background: '{colors.flag-bg}'
    foreground: '{colors.flag-fg}'
    ring: '{colors.flag-ring}'
    radius: '{rounded.md}'
    typography: '{typography.flag-label}'
  refund-flag-label-processed:
    background: '{colors.surface-muted}'
    foreground: '{colors.ink-secondary}'
    ring: '{colors.border-default}'
    radius: '{rounded.md}'
    typography: '{typography.flag-label}'
  tel-link:
    foreground: '{colors.primary-ink}'
    min-height: '{spacing.tap-min}'
  order-code-block:
    typography: '{typography.order-code}'
    desktop-typography: '{typography.order-code-lg}'
    background: '{colors.surface-card}'
    radius: '{rounded.2xl}'
  bank-transfer-card:
    background: '{colors.surface-card}'
    ring: '{colors.border-default}'
    radius: '{rounded.2xl}'
  status-timeline:
    current: '{colors.primary}'
    done: '{colors.ink-secondary}'
    upcoming: '{colors.ink-muted}'
  next-step-block:
    background: '{colors.surface-page}'
    foreground: '{colors.ink-primary}'
    radius: '{rounded.xl}'
  masked-recipient:
    typography: '{typography.body}'
  stock-conflict-row:
    background: '{colors.danger-soft}'
    foreground: '{colors.danger-ink}'
    radius: '{rounded.xl}'
  action-dialog:
    background: '{colors.surface-card}'
    scrim: '{colors.scrim}'
    max-width: '{spacing.dialog-max}'
    radius: '{rounded.2xl}'
    padding: '{spacing.card-padding}'
  reason-option:
    min-height: '{spacing.tap-min}'
    ring: '{colors.border-default}'
    selected-ring: '{colors.primary}'
    radius: '{rounded.xl}'
  toast:
    background: '{colors.ink-primary}'
    foreground: '{colors.ink-inverse}'
    radius: '{rounded.xl}'
  history-list:
    divider: '{colors.border-hairline}'
    meta: '{colors.ink-secondary}'
---

# ShopLite: DESIGN

> Tài liệu này ghi lại hệ thống đang chạy trong code và phần **delta** cho màn hình mới. Nhãn **Hiện có** nghĩa là đã có trong `src/`. Nhãn **Delta** nghĩa là cần thêm, và chỉ được lắp từ palette, cỡ chữ, bo góc sẵn có. Hành vi nằm ở [EXPERIENCE.md](EXPERIENCE.md).

## Brand & Style

ShopLite là cửa hàng đồ công nghệ mini: sáng, gọn, tin cậy. Nền xám rất nhạt, thẻ trắng bo tròn, một màu indigo cho hành động chính, chữ Be Vietnam Pro đọc tốt tiếng Việt có dấu.

Khu vận hành dùng đúng ngôn ngữ đó nhưng tiết chế hơn: không gì trang trí, mọi pixel phục vụ câu hỏi "đơn này đang ở đâu, tôi làm gì tiếp". Màu chỉ để nhấn trạng thái và cảnh báo, luôn đi kèm chữ.

Hệ thống chỉ có giao diện sáng (`color-scheme: light`). Không có dark mode và phạm vi này không thêm.

## Colors

Code dùng class Tailwind, ví dụ `bg-indigo-600`. Tailwind v4 định nghĩa màu bằng OKLCH; hex trong frontmatter là giá trị sRGB quy đổi để tài liệu và công cụ đọc được. Khi triển khai, **dùng class Tailwind, không chép hex vào code**.

| Nhóm | Token | Vai trò | Nguồn |
|---|---|---|---|
| Nền | `{colors.surface-page}`, `{colors.surface-card}`, `{colors.surface-muted}`, `{colors.surface-skeleton}` | Nền trang, thẻ, vùng phụ, khung chờ | Hiện có |
| Chữ | `{colors.ink-primary}`, `{colors.ink-strong}`, `{colors.ink-secondary}`, `{colors.ink-muted}`, `{colors.ink-placeholder}`, `{colors.ink-inverse}` | Từ chính đến phụ; placeholder chỉ dùng trong ô nhập | Hiện có |
| Viền | `{colors.border-hairline}`, `{colors.border-default}`, `{colors.border-control}`, `{colors.focus-neutral}` | Đường chia, viền thẻ, viền điều khiển, viền focus trung tính của màn hình hiện có | Hiện có |
| Chính | `{colors.primary}`, `{colors.primary-hover}`, `{colors.primary-soft}`, `{colors.primary-ink}` | Hành động chính, mục đang chọn, viền focus của màn hình mới | Hiện có |
| Nguy hiểm | `{colors.danger}`, `{colors.danger-hover}`, `{colors.danger-soft}`, `{colors.danger-ink}`, `{colors.danger-ink-strong}`, `{colors.danger-border}` | Hủy, lỗi | Hiện có |
| Thành công | `{colors.success-soft}`, `{colors.success-icon}`, `{colors.success-border}`, `{colors.success-ink}` | Banner đặt hàng thành công | Hiện có |
| Đánh giá | `{colors.rating}` | Sao đánh giá, không dùng cho trạng thái | Hiện có |
| Cảnh báo vận hành | `{colors.flag-bg}`, `{colors.flag-fg}`, `{colors.flag-ring}` | Nhãn chờ quá 24 giờ, số đếm Cần hoàn tiền, nhãn `Cần hoàn tiền` | **Delta** |
| Lớp phủ | `{colors.scrim}` | Nền sau `action-dialog` | **Delta** |

### Màu Trạng thái (Hiện có, từ `order-status-badge.tsx`, trừ chữ Đã hủy)

| Trạng thái | Nền | Chữ | Viền | Tương phản chữ/nền |
|---|---|---|---|---|
| Chờ xác nhận | `{colors.status-pending-bg}` `#fffbeb` | `{colors.status-pending-fg}` `#bb4d00` | `{colors.status-pending-ring}` `#fee685` | 4.85:1 |
| Đã xác nhận | `{colors.status-confirmed-bg}` `#f0f9ff` | `{colors.status-confirmed-fg}` `#0069a8` | `{colors.status-confirmed-ring}` `#b8e6fe` | 5.49:1 |
| Đang giao | `{colors.status-shipping-bg}` `#eef2ff` | `{colors.status-shipping-fg}` `#432dd7` | `{colors.status-shipping-ring}` `#c6d2ff` | 7.24:1 |
| Đã giao | `{colors.status-delivered-bg}` `#ecfdf5` | `{colors.status-delivered-fg}` `#007a55` | `{colors.status-delivered-ring}` `#a4f4cf` | 5.09:1 |
| Đã hủy | `{colors.status-cancelled-bg}` `#f1f5f9` | `{colors.status-cancelled-fg}` `#45556c` | `{colors.status-cancelled-ring}` `#e2e8f0` | 6.92:1 (**Delta**) |

**Delta ở `order-status-badge`:** chữ badge Đã hủy đổi từ slate-500 (`#62748e`, 4.35:1, dưới AA) sang slate-600 (`#45556c`, 6.92:1). Khi build, đổi `text-slate-500` thành `text-slate-600` ở biến thể `cancelled` trong `src/features/orders/components/order-status-badge.tsx`.

### Phạm vi màn hình mới

Mọi quy tắc ghi "màn hình mới" áp dụng cho `/orders`, `/orders/:id`, `/staff/login`, `/staff`, `/staff/orders/:id` và mọi component Delta dù đặt trong trang cũ, ví dụ `stock-conflict-row` trong `/checkout`. Phần còn lại của `/checkout` và các trang cửa hàng giữ nguyên.

### Viền focus trên màn hình mới (Delta)

Mọi điều khiển trên màn hình mới dùng viền focus 2px `{colors.primary}`, cách 2px, kể cả `button-secondary`, `button-ghost` và `button-danger`. Tỷ lệ trên `{colors.surface-card}` là 6.46:1. `{colors.focus-neutral}` (2.63:1) chỉ còn ở màn hình hiện có.

`cn()` chỉ ghép class, không gộp class trùng. Khi build, truyền `focus-visible:outline-indigo-600!` qua `className` ở màn hình mới, không sửa biến thể trong `button.tsx`.

### Tương phản các cặp quan trọng

| Cặp | Tỷ lệ | Kết quả với chữ thường |
|---|---|---|
| `{colors.ink-inverse}` trên `{colors.primary}` | 6.46:1 | Đạt AA |
| `{colors.ink-inverse}` trên `{colors.danger}` | 4.53:1 | Đạt AA |
| `{colors.ink-primary}` trên `{colors.surface-page}` | 17.04:1 | Đạt AA |
| `{colors.ink-secondary}` trên `{colors.surface-card}` | 7.58:1 | Đạt AA |
| `{colors.ink-muted}` trên `{colors.surface-card}` | 4.76:1 | Đạt AA |
| `{colors.ink-muted}` trên `{colors.surface-page}` | 4.55:1 | Đạt AA |
| `{colors.danger}` trên `{colors.surface-card}` | 4.53:1 | Đạt AA |
| `{colors.flag-fg}` trên `{colors.flag-bg}` | 5.49:1 | Đạt AA |
| `{colors.primary-ink}` trên `{colors.surface-card}` | 8.09:1 | Đạt AA |
| `{colors.ink-secondary}` trên `{colors.surface-muted}` | 6.92:1 | Đạt AA |
| `{colors.ink-placeholder}` trên `{colors.surface-card}` | 2.63:1 | Không đạt, nên **không dùng cho nội dung cần đọc** |

## Typography

**Hiện có.** Be Vietnam Pro nạp qua `next/font` với subset `latin` và `vietnamese`, các độ đậm 400, 500, 600, 700; fallback `ui-sans-serif, system-ui, sans-serif`.

| Vai trò | Token | Dùng cho | Nguồn |
|---|---|---|---|
| Tiêu đề trang | `{typography.page-title}` | H1 | Hiện có |
| Tiêu đề khối | `{typography.section-title}` | H2 trong trang | Hiện có |
| Tiêu đề thẻ | `{typography.card-title}` | Thẻ phụ, tiêu đề hộp thoại | Hiện có |
| Nội dung | `{typography.body}` | Văn bản, dòng bảng | Hiện có |
| Nhãn | `{typography.label}` | Nhãn form | Hiện có |
| Nút | `{typography.button}`, `{typography.button-lg}` | Nút `md`, nút `lg` | Hiện có |
| Chú thích | `{typography.caption}` | Thời gian, lỗi trường | Hiện có |
| Badge | `{typography.badge}` | Badge Trạng thái, tồn kho | Hiện có |
| Giá lớn | `{typography.price-lg}` | Giá trang sản phẩm | Hiện có |
| Mã đơn | `{typography.order-code}`, `{typography.order-code-lg}` | `order-code-block` ở màn hẹp, desktop | **Delta** |
| Nhãn tab | `{typography.tab-label}`, `{typography.tab-label-active}` | `order-tabs`, cho vừa 4 cột ở 390px | **Delta** |
| Nhãn cảnh báo | `{typography.flag-label}` | `overdue-label`, `refund-flag-label` | **Delta** |

Mã đơn và số tiền dùng `tabular-nums` khi xếp thành cột. Không dùng chữ dưới 12px.

## Layout & Spacing

**Hiện có.** Thang 4px của Tailwind. Khung trang `max-w-6xl` (`{spacing.container-max}`), trang đơn `max-w-4xl` (`{spacing.content-max}`), lề `{spacing.page-gutter}`, đệm thẻ `{spacing.card-padding}`, header cao `{spacing.header-height}`.

**Delta.**

- Chiều rộng tối thiểu được thiết kế là `{spacing.viewport-min}`, không cuộn ngang ở mọi trang mới.
- **Vùng bấm:** mọi nút và điều khiển mới cao `{spacing.tap-min}` dưới `md`, kể cả `Đăng xuất`, `Lấy N`, `Bỏ`. Từ `md` chấp nhận `{spacing.control-md}`. Khi build dùng `size="md"` kèm `max-md:min-h-11`, không thêm cỡ nút mới. Riêng nút `Tìm` giữ `{spacing.control-input}` ở mọi khổ để thẳng hàng với ô nhập.
- Khu nhân viên dùng khung `{spacing.container-max}` và **không** có footer cửa hàng. `app/layout.tsx` hiện gắn cứng `Header` và `Footer` cho mọi route, nên cần tách layout khi triển khai.

| Màn hình | 390px | Desktop `[ASSUMPTION: A2]` |
|---|---|---|
| `/staff` | Tìm kiếm, `order-tabs` 4 cột, danh sách `order-row` | Tìm kiếm, `order-tabs`, `order-table` 5 cột: Mã đơn, Khách, Thanh toán, Trạng thái, Nhãn |
| `/staff/orders/:id` | Một cột: đầu đơn (Mã đơn, `order-status-badge`, `refund-flag-label` nếu có), Người nhận, Đơn hàng, thao tác, Lịch sử | Đầu đơn và thao tác ở đầu trang, 2 thẻ thông tin, bảng Lịch sử toàn chiều rộng |
| `/orders/:id` | Một cột | Lưới 2 cột từ `sm` (640px) theo trang đơn hiện có, không thuộc A2 |

Bố cục tham chiếu: [Hàng đợi](mockups/key-staff-queue.html), [Chi tiết đơn nhân viên](mockups/key-staff-order-detail.html), [Trang xác nhận](mockups/key-order-confirmation.html).

## Elevation & Depth

**Hiện có.** Thẻ dùng viền 1px `{colors.border-default}` với `shadow-sm`; thẻ bấm được nâng lên `shadow-md` khi hover. Header cửa hàng dính trên cùng, nền trắng 90% có `backdrop-blur`.

**Delta.** `action-dialog` là lớp nổi duy nhất, trên nền `{colors.scrim}`. `toast` nổi trên nội dung.

## Shapes

**Hiện có.** `{rounded.xl}` cho nút và ô nhập, `{rounded.2xl}` cho thẻ, `{rounded.lg}` cho logo và mục menu, `{rounded.full}` cho badge.

**Delta.** `{rounded.md}` chỉ dùng cho `overdue-label` và `refund-flag-label`, để nhãn vận hành khác hình với badge Trạng thái dạng viên thuốc. `action-dialog` dùng `{rounded.2xl}`.

## Components

### Hiện có

Giữ nguyên, trừ hai delta: chữ badge Đã hủy và viền `form-field` ở màn hình mới.

| Component | Vị trí | Đặc tả hình ảnh |
|---|---|---|
| `button-primary` | `ui/button.tsx` | Nền `{colors.primary}`, chữ `{colors.ink-inverse}`, `shadow-sm` |
| `button-secondary` | `ui/button.tsx` | Nền trắng, viền `{colors.border-control}` |
| `button-ghost` | `ui/button.tsx` | Không nền, hover `{colors.surface-muted}` |
| `button-danger` | `ui/button.tsx` | Nền `{colors.danger}`, chữ trắng |
| Cỡ nút | `ui/button.tsx` | `sm` `{spacing.control-sm}`, `md` `{spacing.control-md}`, `lg` `{spacing.control-lg}`; disabled mờ 50% |
| `form-field` | `checkout-form.tsx` | Cao `{spacing.control-input}`. Trang cũ: viền `{colors.border-control}`, viền lỗi `{colors.danger-border}`. **Delta** ở [màn hình mới](#phạm-vi-màn-hình-mới): viền `{colors.ink-muted}` (4.76:1), viền lỗi `{colors.danger}` (4.53:1), đều đạt WCAG 1.4.11; focus viền 2px `{colors.primary}`. Chữ lỗi `{typography.caption}` màu `{colors.danger}`. Hiện là hằng cục bộ `inputClass`, cần tách dùng chung khi build |
| `card` | Nhiều trang | `{rounded.2xl}`, `{colors.surface-card}`, viền, `shadow-sm`. Hiện là chuỗi class lặp lại, cần tách dùng chung khi build |
| `success-banner` | `orders/[id]/page.tsx` | Nền `{colors.success-soft}`, icon `{colors.success-icon}` |
| `error-banner` | `checkout-form.tsx` | Nền `{colors.danger-soft}`, chữ `{colors.danger-ink}` |
| `empty-state` | `ui/empty-state.tsx` | Viền đứt, canh giữa, có emoji (prop bắt buộc), tiêu đề, mô tả, hành động. Emoji cho màn hình mới ở [Nội dung `empty-state`](#nội-dung-empty-state) |
| `order-status-badge` | `order-status-badge.tsx` | Viên thuốc, `{typography.badge}`, 5 biến thể theo bảng màu Trạng thái. **Delta** ở biến thể `cancelled`, xem [Màu Trạng thái](#màu-trạng-thái-hiện-có-từ-order-status-badgetsx-trừ-chữ-đã-hủy) |
| `stock-badge` | `stock-badge.tsx` | Viên thuốc: Còn hàng, Chỉ còn N sản phẩm, Hết hàng |
| `store-header` | `layout/header.tsx` | Logo, menu, giỏ hàng; dính trên cùng |
| `store-footer` | `layout/footer.tsx` | Ba cam kết và bản quyền |
| `price-tag` | `ui/price-tag.tsx` | Giá đậm, giá gốc gạch ngang |
| `quantity-input` | `ui/quantity-input.tsx` | Cao `{spacing.control-md}`, nút giảm, ô số, nút tăng |
| `rating-stars` | `ui/rating-stars.tsx` | 5 sao `{colors.rating}` |

### Delta, cần thêm

| Component | Đặc tả hình ảnh |
|---|---|
| `staff-header` | Cao `{spacing.header-height}`, nền trắng, viền dưới. Logo ShopLite, bên phải là tên người đăng nhập và `button-ghost` "Đăng xuất" theo quy tắc vùng bấm. Không menu mua sắm, không giỏ hàng |
| `order-search` | Dùng `form-field` theo quy tắc màn hình mới, có nhãn "Tìm đơn", icon tìm kiếm từ `lucide-react` và `button-secondary` "Tìm" cùng hàng, cao `{spacing.control-input}` |
| `order-tabs` | Lưới 4 cột bằng nhau, cao tối thiểu `{spacing.tap-min}`, chữ `{typography.tab-label}`, cho xuống 2 dòng. Tab chọn dùng `{typography.tab-label-active}`, chữ `{colors.primary-ink}`, gạch dưới 3px `{colors.primary}` |
| `tab-count` | Viên thuốc nhỏ màu `{colors.flag-bg}` và `{colors.flag-fg}` trong tab Cần hoàn tiền. `[ASSUMPTION: A7]` |
| `order-row` | Thẻ một đơn ở màn hẹp: Mã đơn dạng link có gạch chân, `order-status-badge`, phương thức thanh toán, tên khách, `tel-link`, và `overdue-label` hoặc `refund-flag-label` nếu có |
| `order-table` | Bảng ở màn rộng, dòng chia bằng `{colors.border-hairline}`, hover `{colors.surface-page}`. Mã đơn dạng link có gạch chân. Cột Nhãn chứa `overdue-label` hoặc `refund-flag-label` |
| `overdue-label` | Chữ "CHUYỂN KHOẢN CHỜ QUÁ 24 GIỜ" ở `order-row` và Chi tiết đơn, "CHỜ QUÁ 24 GIỜ" ở cột Nhãn của `order-table`. Bo `{rounded.md}`, màu `{colors.flag-fg}` trên `{colors.flag-bg}` |
| `refund-flag-label` | Nhãn chữ `{typography.flag-label}`, bo `{rounded.md}`, ở `order-row`, cột Nhãn của `order-table` và đầu Chi tiết đơn. `Cần hoàn tiền`: `{colors.flag-fg}` trên `{colors.flag-bg}`, viền `{colors.flag-ring}`. `Đã xử lý hoàn tiền`: `{colors.ink-secondary}` trên `{colors.surface-muted}`, viền `{colors.border-default}`. Đơn COD không có nhãn |
| `tel-link` | Số điện thoại màu `{colors.primary-ink}`, có gạch chân, vùng bấm tối thiểu `{spacing.tap-min}` |
| `order-code-block` | Thẻ có nhãn "Mã đơn", mã ở `{typography.order-code}` (desktop `{typography.order-code-lg}`), được xuống dòng khi thiếu chỗ, `button-secondary` "Sao chép Mã đơn" và lời nhắc lưu mã |
| `bank-transfer-card` | `card` với danh sách nhãn và giá trị: Số tiền, Số tài khoản, Ngân hàng, Nội dung |
| `status-timeline` | Danh sách dọc các mốc. Mốc hiện tại đậm, có chữ "(hiện tại)", màu `{colors.primary}`; mốc đã qua `{colors.ink-secondary}`; mốc chưa tới `{colors.ink-muted}` với chữ "chưa tới" |
| `next-step-block` | Khối `{colors.surface-page}`, tiêu đề "Bước kế tiếp" và một câu hướng dẫn |
| `masked-recipient` | Một dòng `{typography.body}`, dạng `Ng*** · 090****001`, không có địa chỉ |
| `stock-conflict-row` | Dòng nền `{colors.danger-soft}`: tên sản phẩm, "Bạn chọn X · Chỉ còn N", `button-primary` "Lấy N", `button-ghost` "Bỏ", cả hai theo quy tắc vùng bấm |
| `action-dialog` | Thẻ tối đa `{spacing.dialog-max}`, canh giữa, lề `{spacing.page-gutter}` ở 390px. Cặp nút ở cuối theo [Vùng hai nút](#vùng-hai-nút) |
| `reason-option` | Dòng radio cao tối thiểu `{spacing.tap-min}`, viền `{colors.border-default}`, khi chọn viền `{colors.primary}`. Ghi chú và câu nhắc dưới danh sách dùng `{typography.caption}`, màu `{colors.ink-secondary}` |
| `toast` | Nền `{colors.ink-primary}`, chữ `{colors.ink-inverse}`, `{rounded.xl}`, `shadow-md` |
| `history-list` | Màn hẹp: danh sách dòng, gồm người thực hiện, thời gian, hai `order-status-badge` nối bằng mũi tên, lý do. Màn rộng: bảng Thời gian, Tài khoản, Trạng thái cũ, Trạng thái mới, Lý do. Dòng tạo đơn: chữ `Tạo đơn` thay Trạng thái cũ. Dòng hoàn tiền: một dòng chữ kết quả thay cho hai badge, ở màn rộng chiếm cả hai cột Trạng thái |

### Vùng hai nút

Áp dụng cho `action-dialog` và vùng thao tác ở Chi tiết đơn.

| Khổ | Bố cục |
|---|---|
| Dưới `md` | Xếp dọc, nút chính ở trên, mỗi nút toàn chiều rộng |
| Từ `md` | Xếp ngang, nút chính bên phải |

`Hủy đơn` dùng `button-danger` ở cả nút mở hộp thoại và nút xác nhận. Khi đứng cạnh `Xác nhận đơn` hoặc `Chuyển Đang giao`, nút chính là nút tiến Trạng thái. Khi build, DOM đặt nút phụ trước nút chính và dùng `flex flex-col-reverse gap-2 md:flex-row md:justify-end`, để thứ tự `Tab` trên desktop khớp thứ tự nhìn.

### Nội dung `empty-state`

Delta nội dung, không sửa component. Câu chữ nằm ở [EXPERIENCE.md](EXPERIENCE.md#microcopy-theo-giả-định-đã-chấp-nhận).

| Trường hợp | Prop `emoji` |
|---|---|
| Tab Cần xử lý trống | ✅ |
| Tab Đã giao trống | 📦 |
| Tab Đã hủy trống | 🚫 |
| Tab Cần hoàn tiền trống | 💸 |
| Không tìm thấy đơn | 🔍 |

## Do's and Don'ts

| Nên | Không nên |
|---|---|
| Dùng class Tailwind đúng như bảng token | Chép hex vào code hoặc thêm palette mới |
| Dùng lại `buttonStyles`, `card`, `form-field`, `empty-state` | Tạo biến thể nút mới cho màn hình nhân viên |
| Luôn kèm chữ cho Trạng thái và cảnh báo | Truyền đạt trạng thái chỉ bằng màu |
| Dùng `{colors.flag-fg}` cho cảnh báo vận hành | Dùng `{colors.rating}` hoặc màu Trạng thái cho cảnh báo |
| Theo [quy tắc vùng bấm](#layout--spacing) cho mọi nút mới, gồm ngoại lệ `Tìm` | Để nút mới thấp hơn `{spacing.tap-min}` dưới `md` |
| Giữ 4 tab trên một hàng ở 390px | Cuộn ngang tab hoặc bảng |
| Dùng `button-danger` chỉ cho `Hủy đơn` (nút mở và nút xác nhận) | Tô đỏ các thao tác không phá hủy |
| Giữ khu nhân viên tách khỏi menu cửa hàng | Đặt link sang `/staff` ở cửa hàng |
