---
name: ShopLite Ops
description: Delta visual design system cho phân hệ vận hành đơn hàng và tồn kho thực tế, kế thừa trực tiếp hệ thống Tailwind CSS v4 + Be Vietnam Pro đang chạy của ShopLite.
status: final
updated: 2026-11-21
colors:
  primary: '#4F39F6'
  primary-hover: '#615FFF'
  primary-soft: '#EEF2FF'
  primary-text: '#432DD7'
  primary-ring: '#C6D2FF'
  primary-foreground: '#FFFFFF'
  bg-page: '#F8FAFC'
  bg-surface: '#FFFFFF'
  bg-subtle: '#F1F5F9'
  border-default: '#E2E8F0'
  border-strong: '#CAD5E2'
  text-primary: '#0F172B'
  text-secondary: '#45556C'
  text-muted: '#62748E'
  danger: '#EC003F'
  danger-hover: '#FF2056'
  danger-soft: '#FFF1F2'
  danger-text: '#C70036'
  danger-ring: '#FFCCD3'
  danger-foreground: '#FFFFFF'
  success: '#009966'
  success-soft: '#ECFDF5'
  success-text: '#007A55'
  success-ring: '#A4F4CF'
  warning-soft: '#FFFBEB'
  warning-text: '#BB4D00'
  warning-strong: '#973C00'
  warning-ring: '#FEE685'
  info-soft: '#F0F9FF'
  info-text: '#0069A8'
  info-ring: '#B8E6FE'
typography:
  heading-page:
    fontFamily: 'Be Vietnam Pro, ui-sans-serif, system-ui, sans-serif'
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.33'
  heading-card:
    fontFamily: 'Be Vietnam Pro, ui-sans-serif, system-ui, sans-serif'
    fontSize: 16px
    fontWeight: '600'
    lineHeight: '1.5'
  body:
    fontFamily: 'Be Vietnam Pro, ui-sans-serif, system-ui, sans-serif'
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label:
    fontFamily: 'Be Vietnam Pro, ui-sans-serif, system-ui, sans-serif'
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.43'
  caption:
    fontFamily: 'Be Vietnam Pro, ui-sans-serif, system-ui, sans-serif'
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.33'
rounded:
  lg: 8px
  xl: 12px
  2xl: 16px
  full: 9999px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 20px
  '6': 24px
  '8': 32px
  touch-target: 44px
  container-customer: 896px
  container-admin: 1152px
components:
  admin-header-bar:
    background: '{colors.bg-surface}'
    border: '{colors.border-default}'
    brand-background: '{colors.primary}'
    brand-foreground: '{colors.primary-foreground}'
  admin-login-card:
    background: '{colors.bg-surface}'
    border: '{colors.border-default}'
    radius: '{rounded.2xl}'
    padding: '{spacing.6}'
  order-filter-tabs:
    active-background: '{colors.primary}'
    active-foreground: '{colors.primary-foreground}'
    idle-background: '{colors.bg-surface}'
    idle-foreground: '{colors.text-secondary}'
    border: '{colors.border-default}'
    radius: '{rounded.xl}'
    min-height: '{spacing.touch-target}'
  admin-order-search-bar:
    background: '{colors.bg-surface}'
    border: '{colors.border-strong}'
    radius: '{rounded.xl}'
    min-height: '{spacing.touch-target}'
  admin-order-card:
    background: '{colors.bg-surface}'
    border: '{colors.border-default}'
    radius: '{rounded.2xl}'
    padding: '{spacing.4}'
    skeleton-bar: '{colors.bg-subtle}'
  reserved-stock-indicator:
    reserved-chip-background: '{colors.bg-surface}'
    reserved-chip-foreground: '{colors.text-primary}'
    ok-background: '{colors.success-soft}'
    ok-foreground: '{colors.success-text}'
    ok-ring: '{colors.success-ring}'
    low-background: '{colors.warning-soft}'
    low-foreground: '{colors.warning-strong}'
    low-ring: '{colors.warning-ring}'
    zero-background: '{colors.danger-soft}'
    zero-foreground: '{colors.danger-text}'
    zero-ring: '{colors.danger-ring}'
    radius: '{rounded.lg}'
  restock-status-badge:
    pending-background: '{colors.warning-soft}'
    pending-foreground: '{colors.warning-strong}'
    pending-ring: '{colors.warning-ring}'
    done-background: '{colors.success-soft}'
    done-foreground: '{colors.success-text}'
    done-ring: '{colors.success-ring}'
    radius: '{rounded.full}'
  cancel-order-dialog:
    background: '{colors.bg-surface}'
    radius: '{rounded.2xl}'
    padding: '{spacing.5}'
    warning-background: '{colors.warning-soft}'
    warning-foreground: '{colors.warning-strong}'
    chip-selected-background: '{colors.primary-soft}'
    chip-selected-foreground: '{colors.primary-text}'
    chip-selected-ring: '{colors.primary-ring}'
    confirm-background: '{colors.danger}'
    confirm-hover: '{colors.danger-hover}'
    confirm-foreground: '{colors.danger-foreground}'
  order-progress-timeline:
    done-accent: '{colors.success}'
    done-background: '{colors.success-soft}'
    done-foreground: '{colors.success-text}'
    current-background: '{colors.primary}'
    current-foreground: '{colors.primary-foreground}'
    current-halo: '{colors.primary-soft}'
    upcoming-border: '{colors.border-strong}'
    upcoming-foreground: '{colors.text-muted}'
    cancelled-background: '{colors.danger-soft}'
    cancelled-foreground: '{colors.danger-text}'
    cancelled-ring: '{colors.danger-ring}'
  refresh-status-button:
    background: '{colors.bg-surface}'
    foreground: '{colors.text-primary}'
    border: '{colors.border-strong}'
    radius: '{rounded.xl}'
    min-height: '{spacing.touch-target}'
---

# ShopLite Ops — Design System (Delta)

## Brand & Style

ShopLite Ops mở rộng trực tiếp sản phẩm **ShopLite** đang chạy mà **không thiết kế lại nhận diện**. Phong cách thị giác giữ sự sạch sẽ, sáng rõ và thực dụng của một cửa hàng đồ công nghệ hiện đại: nền trang xám lạnh nhẹ (`{colors.bg-page}`), các thẻ trắng bo góc thoáng (`{rounded.2xl}`) viền mảnh 1px, điểm nhấn duy nhất bằng màu chàm đậm (`{colors.primary}`) cho hành động chính, và màu ngữ nghĩa kỷ luật cho Trạng thái đơn hàng cũng như Tồn kho khả dụng.

Toàn bộ phần vận hành (`/admin/login`, `/admin/orders`) và nâng cấp theo dõi đơn (`/orders/[id]`) kế thừa hệ thống Tailwind CSS v4 + font **Be Vietnam Pro** + bộ icon `lucide-react` hiện có của ShopLite. Tài liệu này chỉ định nghĩa các token đang dùng trong codebase cùng phần mở rộng (**delta**) cho ShopLite Ops. Nếu mockup HTML khác với tài liệu này, `DESIGN.md` và `EXPERIENCE.md` luôn giữ quyền ưu tiên.

## Colors

ShopLite chạy ở chế độ sáng duy nhất (`color-scheme: light` tại `src/app/globals.css`). Mọi giá trị hex trong frontmatter được quy đổi chính xác từ bảng màu **OKLCH của Tailwind CSS v4** (`node_modules/tailwindcss/theme.css`), **không dùng mã hex của Tailwind v3**.

| Token | Hex | Tailwind v4 Class & OKLCH | Tỉ lệ tương phản (WCAG 2.2 AA) | Dùng cho / Không dùng cho |
| :--- | :--- | :--- | :--- | :--- |
| `{colors.primary}` / `{colors.primary-foreground}` | `#4F39F6` / `#FFFFFF` | `indigo-600` · `oklch(51.1% 0.262 276.966)` | `6.46:1` | Nút hành động chính 1 bước (`Xác nhận đơn`, `Bàn giao giao hàng`, `Đánh dấu đã giao`, `Xác nhận đã nhận hàng hoàn (+kho)`), tab lọc đang chọn, bước hiện tại trên Timeline tiến trình. Không dùng cho cảnh báo tồn kho hay nút Hủy. |
| `{colors.primary-hover}` | `#615FFF` | `indigo-500` · `oklch(58.5% 0.233 277.117)` | `4.72:1` với `#FFFFFF` | Trạng thái hover của nút `primary`. |
| `{colors.primary-soft}` / `{colors.primary-text}` / `{colors.primary-ring}` | `#EEF2FF` / `#432DD7` / `#C6D2FF` | `indigo-50` / `indigo-700` / `indigo-200` | `7.24:1` | Nhãn `Đang giao`, chip lý do đã chọn, khung ghi chú mã vận đơn trên Timeline, quầng sáng bước hiện tại. |
| `{colors.bg-page}` / `{colors.bg-surface}` / `{colors.bg-subtle}` | `#F8FAFC` / `#FFFFFF` / `#F1F5F9` | `slate-50` / `white` / `slate-100` | `17.83:1` (`{colors.text-primary}` trên `#FFFFFF`) | Nền trang (`bg-slate-50`), bề mặt thẻ/hộp thoại (`bg-white`), và nền trung tính cho thanh skeleton, bộ đếm tab, nhãn `Đã hủy`. |
| `{colors.border-default}` / `{colors.border-strong}` | `#E2E8F0` / `#CAD5E2` | `slate-200` / `slate-300` | — | Viền thẻ (`ring-slate-200`) và viền ô nhập/nút phụ (`ring-slate-300`). |
| `{colors.text-primary}` / `{colors.text-secondary}` / `{colors.text-muted}` | `#0F172B` / `#45556C` / `#62748E` | `slate-900` / `slate-600` / `slate-500` | `17.83:1` / `7.58:1` / `4.76:1` trên `#FFFFFF` | Tiêu đề & nội dung chính / văn bản phụ / ghi chú thời gian. Lưu ý: mọi nhãn nền `{colors.bg-subtle}` (`#F1F5F9`), bao gồm `OrderStatusBadge` trạng thái `cancelled`, bắt buộc dùng `{colors.text-secondary}` (`6.92:1`), không dùng `{colors.text-muted}` (`4.35:1 < 4.5:1`). |
| `{colors.success-soft}` / `{colors.success-text}` / `{colors.success}` / `{colors.success-ring}` | `#ECFDF5` / `#007A55` / `#009966` / `#A4F4CF` | `emerald-50` / `emerald-700` / `emerald-600` / `emerald-200` | `5.09:1` (`emerald-700` trên `emerald-50`) | Trạng thái `Đã giao`, bước đã hoàn thành trên Timeline, `Tồn kho khả dụng > 5`, nhãn `Đã hoàn kho`. |
| `{colors.warning-soft}` / `{colors.warning-text}` / `{colors.warning-strong}` / `{colors.warning-ring}` | `#FFFBEB` / `#BB4D00` / `#973C00` / `#FEE685` | `amber-50` / `amber-700` / `amber-800` / `amber-200` | `4.85:1` (`amber-700`), `6.84:1` (`amber-800`) trên `amber-50` | Trạng thái `Chờ xác nhận` (`warning-text`), cảnh báo `Tồn kho khả dụng 1–5`, nhãn `Chờ nhận hàng hoàn`, cảnh báo hủy đơn `shipping` không tự hoàn kho, thông báo phiên hết hạn (`warning-strong`). |
| `{colors.danger}` / `{colors.danger-hover}` / `{colors.danger-foreground}` | `#EC003F` / `#FF2056` / `#FFFFFF` | `rose-600` / `rose-500` / `white` | `4.53:1` (`#FFFFFF` trên `rose-600`) | Nút `danger` xác nhận hủy đơn (`Xác nhận hủy đơn`) và trạng thái hover của nút `danger`. |
| `{colors.danger-soft}` / `{colors.danger-text}` / `{colors.danger-ring}` | `#FFF1F2` / `#C70036` / `#FFCCD3` | `rose-50` / `rose-700` / `rose-200` | `5.49:1` (`rose-700` trên `rose-50`) | Khung lỗi `role="alert"` (`401`/`409`/`503`/validation), cảnh báo `Còn cho đơn mới: 0`, viền/chữ nút `Hủy đơn` dạng `secondary`, khối thông báo Đơn hàng đã hủy trên `/orders/[id]`. |
| `{colors.info-soft}` / `{colors.info-text}` / `{colors.info-ring}` | `#F0F9FF` / `#0069A8` / `#B8E6FE` | `sky-50` / `sky-700` / `sky-200` | `5.49:1` | Trạng thái `Đã xác nhận` trên `OrderStatusBadge`. |

**Kỷ luật màu chống "ảo giác hết hàng":** Trong `ReservedStockIndicator`, phần **`✓ Đã giữ X cho đơn này`** luôn nằm trong chip nền trắng `{colors.bg-surface}` chữ đậm `{colors.text-primary}` để Nhân viên vận hành nhận diện ngay đơn này đã có hàng, tách biệt thị giác với phần **`Còn cho đơn mới: Y`** đổi màu theo 3 ngưỡng (xanh lá `> 5`, vàng cam `1–5`, đỏ `0`). Mọi tín hiệu màu bắt buộc đi kèm biểu tượng (`lucide-react`) và văn bản tường minh.

## Typography

Kế thừa hoàn toàn font **Be Vietnam Pro** (`subsets: ["latin", "vietnamese"]`, weights `400`, `500`, `600`, `700`) đã khai báo tại `src/app/layout.tsx` và `--font-sans` trong `src/app/globals.css`.

- **`{typography.heading-page}` (`24px / 700` — `text-2xl font-bold`):** Tiêu đề trang (`Đơn hàng SL-...`, `Vận hành đơn hàng`, `Đăng nhập quản trị`).
- **`{typography.heading-card}` (`16px / 600` — `text-base font-semibold`):** Tiêu đề thẻ (`Tiến trình đơn hàng`), mã đơn hàng trên thẻ quản trị.
- **`{typography.body}` (`14px / 400` — `text-sm`):** Tên sản phẩm, thông tin người nhận, mô tả lỗi, ô nhập liệu.
- **`{typography.label}` (`14px / 600` — `text-sm font-semibold`):** Nhãn nút hành động, nhãn form `<label>`, tab lọc trạng thái.
- **`{typography.caption}` (`12px / 500–600` — `text-xs`):** Badge trạng thái, mốc thời gian Timeline, bộ đếm ký tự `0/200`, nhãn Hàng giữ chỗ & Tồn kho khả dụng.

Số tiền và số lượng áp dụng `tabular-nums` để căn thẳng hàng khi quét nhanh danh sách đơn.

## Layout & Spacing

Kế thừa thang khoảng cách bội số `4px` của Tailwind CSS v4 (`{spacing.1}` → `{spacing.8}`).

- **Độ rộng khung chứa:** Trang quản trị `/admin/orders` dùng `max-w-6xl` (`{spacing.container-admin}` = `1152px`, khớp header hiện tại của ShopLite); trang chi tiết đơn `/orders/[id]` giữ nguyên `max-w-4xl` (`{spacing.container-customer}` = `896px`); trang `/admin/login` căn giữa thẻ đơn rộng tối đa `400px`.
- **Đệm ngang & nhịp dọc:** Đệm ngang khung trang `px-4` (`{spacing.4}` = `16px`); khoảng cách giữa các nút/chip dùng `gap-2` (`{spacing.2}` = `8px`); nhịp giữa các phần tử trong thẻ mobile `390px` dùng `gap-3` (`{spacing.3}` = `12px`); khoảng cách giữa các khối chính `gap-4` (`{spacing.4}`) trên mobile và `gap-6` (`{spacing.6}`) trên desktop; đệm trong thẻ `p-4` (`{spacing.4}`).
- **Vùng chạm tối thiểu (`{spacing.touch-target}` = `44px`):** Toàn bộ nút hành động chính, nút hủy, nút Đăng xuất, tab lọc, chip chọn nhanh lý do hủy, ô tìm kiếm, ô nhập mã vận đơn, ô nhập passcode và nút Làm mới trạng thái có chiều cao tối thiểu `min-h-11` (`44px`).
- **Không dùng bảng HTML rộng nhiều cột trên `/admin/orders`:** Hiển thị danh sách thẻ (`AdminOrderCard`) 1 cột xếp dọc giúp đọc đầy đủ mã đơn, khách hàng, sản phẩm, `ReservedStockIndicator` và nút hành động trên cả desktop lẫn `390px` mà không bao giờ tràn ngang (`scrollWidth <= innerWidth`).

## Elevation & Depth

Kế thừa ngôn ngữ phẳng của ShopLite — phân tầng bằng **viền mảnh 1px (`ring-1 ring-slate-200`) + nền tương phản (`{colors.bg-surface}` trên `{colors.bg-page}`)** kết hợp bóng rất nhẹ (`shadow-sm`).

- **Mặt nền trang:** `{colors.bg-page}`, không bóng.
- **Thẻ đơn hàng & thẻ Timeline:** `{colors.bg-surface}` + `ring-1` `{colors.border-default}` + `shadow-sm`.
- **Header dính (`sticky top-0 z-30`):** `{colors.bg-surface}` độ mờ 90% + `backdrop-blur` + viền đáy 1px `{colors.border-default}`.
- **Hộp thoại (`CancelOrderDialog`):** Lớp phủ nền `rgba(15, 23, 43, 0.45)`, hộp trắng `{colors.bg-surface}` + `shadow-xl`, tối đa 1 tầng modal.

## Shapes

Tên token trong `rounded` khớp **1–1 với class Tailwind CSS v4** (`node_modules/tailwindcss/theme.css`) để lập trình viên áp dụng trực tiếp không lệch bậc:

- **`{rounded.2xl}` (`16px` — `rounded-2xl`):** Thẻ đơn hàng (`AdminOrderCard`), thẻ Timeline, thẻ đăng nhập (`AdminLoginCard`), hộp thoại hủy (`CancelOrderDialog`).
- **`{rounded.xl}` (`12px` — `rounded-xl`):** Nút (`Button`), ô nhập liệu, ô ghi chú mã vận đơn, thanh tìm kiếm, tab lọc trạng thái, khung cảnh báo `role="alert"`.
- **`{rounded.lg}` (`8px` — `rounded-lg`):** Logo icon, dải `ReservedStockIndicator`, khung ghi chú mã vận đơn trên Timeline.
- **`{rounded.full}` (`9999px` — `rounded-full`):** Badge trạng thái (`OrderStatusBadge`, `RestockStatusBadge`, `StockBadge`), chip lý do hủy nhanh, nút tròn trên đường trục Timeline, bộ đếm số lượng trên tab.

## Components

### Thành phần kế thừa nguyên trạng từ ShopLite
- **`Button`** (`src/components/ui/button.tsx`) — Giữ nguyên 4 biến thể `primary` (`{colors.primary}` / `{colors.primary-hover}`), `secondary` (`{colors.bg-surface}` + `{colors.border-strong}`), `ghost`, `danger` (`{colors.danger}` / `{colors.danger-hover}`), bo `{rounded.xl}`. Delta kích thước trên bề mặt vận hành (`/admin/orders`, `/admin/login`, nút làm mới `/orders/[id]`): truyền `className="min-h-11"` (`{spacing.touch-target}`) để đạt chuẩn vùng chạm `>= 44px` trên mobile `390px`.
- **`StockBadge`** (`src/features/catalog/components/stock-badge.tsx`) — Giữ nguyên thị giác trên `/`, `/products`, `/products/[slug]`; chỉ thay đổi nguồn dữ liệu đọc động từ `InventoryRepository`.
- **`EmptyState`** (`src/components/ui/empty-state.tsx`) — Tái sử dụng nguyên trạng cho danh sách đơn rỗng hoặc không có kết quả tìm kiếm tại `/admin/orders` (và trạng thái không tìm thấy đơn nếu cần).
- **`CancelOrderButton`** (`src/features/orders/components/cancel-order-button.tsx`) — Giữ nguyên thị giác trên `/orders/[id]` khi `order.status === "pending"`.

### Thành phần kế thừa có nâng cấp nhẹ (Delta)
- **`OrderStatusBadge`** (`src/features/orders/components/order-status-badge.tsx`) — Giữ nguyên 4 bảng màu `pending` (`{colors.warning-soft}`/`{colors.warning-text}`/`{colors.warning-ring}`), `confirmed` (`{colors.info-soft}`/`{colors.info-text}`/`{colors.info-ring}`), `shipping` (`{colors.primary-soft}`/`{colors.primary-text}`/`{colors.primary-ring}`), `delivered` (`{colors.success-soft}`/`{colors.success-text}`/`{colors.success-ring}`); **2 nâng cấp delta bắt buộc cho WCAG 2.2 AA:**
  1. Đổi màu chữ trạng thái `cancelled` từ `text-slate-500` (`4.35:1`) sang `text-slate-600` (`{colors.text-secondary}`, `6.92:1`) trên nền `{colors.bg-subtle}`.
  2. Gắn thêm icon `lucide-react` kích thước `12px` (`size-3`, `aria-hidden="true"`) trước nhãn để không phụ thuộc chỉ màu sắc: `pending` → `Clock`, `confirmed` → `CheckCircle2`, `shipping` → `Truck`, `delivered` → `PackageCheck`, `cancelled` → `XCircle`.

### Thành phần mới của ShopLite Ops
- **`AdminHeaderBar`** — Thanh đỉnh dính (`sticky top-0`) dành riêng cho `/admin/*`, hiển thị logo ShopLite (`{colors.primary}`), nhãn *"Vận hành đơn hàng"* (`{colors.primary-soft}` / `{colors.primary-text}`) và nút **"Đăng xuất"** (`secondary`, `min-h-11`). Tham chiếu bố cục: `mockups/admin-orders.html`.
- **`AdminLoginCard`** — Thẻ đơn căn giữa tối đa `400px` (`{colors.bg-surface}`, `{rounded.2xl}`, `{spacing.6}`), gồm biểu tượng ổ khóa (`{colors.primary}`), tiêu đề, khung thông báo tùy trạng thái (`{colors.warning-soft}`/`{colors.warning-strong}` khi phiên hết hạn, `{colors.danger-soft}`/`{colors.danger-text}` khi sai mật khẩu hoặc `503`), ô nhập mật khẩu (`{spacing.touch-target}`, `{rounded.xl}`) có `<label>` rõ ràng và nút đăng nhập toàn chiều rộng (`min-h-11`). Tham chiếu bố cục: `mockups/admin-login.html`.
- **`OrderFilterTabs`** — Dải tab lọc 6 mục (`Tất cả`, `Chờ xác nhận`, `Đã xác nhận`, `Đang giao`, `Đã giao`, `Đã hủy`), cuộn ngang mượt trên `390px`, chiều cao mỗi tab `min-h-11` (`{spacing.touch-target}`), tab đang chọn nền `{colors.primary}` chữ trắng, mỗi tab gắn pill đếm số lượng đơn (`tabular-nums`). Tham chiếu bố cục: `mockups/admin-orders.html`.
- **`AdminOrderSearchBar`** — Ô tìm kiếm bo `{rounded.xl}`, chiều cao tối thiểu `{spacing.touch-target}`, viền `{colors.border-strong}`, icon kính lúp `Search`, kèm nút xóa nhanh (`min-h-11 min-w-11`) khi có từ khóa. Tham chiếu bố cục: `mockups/admin-orders.html`.
- **`AdminOrderCard`** — Thẻ đơn hàng (`{colors.bg-surface}`, `{rounded.2xl}`, viền `{colors.border-default}`) gồm 3 vùng rõ ràng:
  1. *Đầu thẻ:* mã đơn + `OrderStatusBadge` + `RestockStatusBadge` (nếu `cancelled`) + tổng tiền (`{colors.primary-text}`), cùng dòng thông tin khách (tên · SĐT · thời gian đặt · phương thức thanh toán).
  2. *Thân thẻ:* danh sách sản phẩm + `ReservedStockIndicator` (chỉ hiện với `pending`/`confirmed`/`shipping`).
  3. *Chân thẻ:* 1 nút hành động chính duy nhất (`primary`, `min-h-11`) + nút **"Hủy đơn"** (`secondary` với viền `{colors.danger-ring}` và chữ `{colors.danger-text}`, `min-h-11`) tách biệt về thị giác; trên `390px` xếp dọc toàn chiều rộng. Riêng thẻ ở trạng thái `confirmed` bổ sung **ô nhập ghi chú vận chuyển tùy chọn** (`<input>` bo `{rounded.xl}`, chiều cao `{spacing.touch-target}`, viền `{colors.border-strong}`, `<label>` *"Ghi chú vận chuyển / mã vận đơn (tùy chọn)"*, placeholder `"VD: Mã vận đơn GHN-882910"`, `maxLength={200}`) đặt ngay trước nút **"Bàn giao giao hàng"** để nhân viên gõ nhanh hoặc bỏ trống bấm bàn giao luôn.
  - *Trạng thái đang tải (Skeleton):* Thẻ `{colors.bg-surface}` bo `{rounded.2xl}` viền `{colors.border-default}` chứa các thanh `animate-pulse` màu `{colors.bg-subtle}` bo `{rounded.lg}` mô phỏng đầu thẻ, 1 dòng sản phẩm và hàng nút.
  - Tham chiếu bố cục: `mockups/admin-orders.html`.
- **`ReservedStockIndicator`** — Khối inline bo `{rounded.lg}` đặt ngay cạnh từng món trên `AdminOrderCard`, cấu trúc 2 phần liền nhau: chip trắng `{colors.bg-surface}` ghi **`✓ Đã giữ {quantity} cho đơn này`** + phần cảnh báo `Còn cho đơn mới: {availableStock}` dùng 3 bậc ngữ nghĩa: xanh lá (`> 5`, icon `CheckCircle2`, `{colors.success-soft}`/`{colors.success-text}`/`{colors.success-ring}`), vàng cam (`1–5`, icon `AlertTriangle`, `{colors.warning-soft}`/`{colors.warning-strong}`/`{colors.warning-ring}`), đỏ (`0`, icon `XCircle`, `{colors.danger-soft}`/`{colors.danger-text}`/`{colors.danger-ring}`). Tham chiếu bố cục: `mockups/admin-orders.html`.
- **`RestockStatusBadge`** — Badge bo `{rounded.full}` hiển thị cạnh `OrderStatusBadge` cho đơn `cancelled`: khi `inventoryRestocked === false` dùng nền `{colors.warning-soft}` chữ `{colors.warning-strong}` viền `{colors.warning-ring}` kèm icon `Clock` và nhãn **"Chờ nhận hàng hoàn"** (`data-testid="restock-pending-badge"`); khi `inventoryRestocked === true` dùng nền `{colors.success-soft}` chữ `{colors.success-text}` viền `{colors.success-ring}` kèm icon `PackageCheck` và nhãn **"Đã hoàn kho"** (`data-testid="restocked-badge"`). Tham chiếu bố cục: `mockups/admin-orders.html`.
- **`CancelOrderDialog`** — Hộp thoại căn giữa (`{colors.bg-surface}`, `{rounded.2xl}`, tối đa `440px`), có cảnh báo `{colors.warning-soft}`/`{colors.warning-strong}` khi hủy đơn `shipping`, hàng 3 chip chọn nhanh bo `{rounded.full}` chiều cao `min-h-11` (trạng thái chọn dùng `{colors.primary-soft}`/`{colors.primary-text}`/`{colors.primary-ring}`), ô `<textarea>` bo `{rounded.xl}` có `<label>` và bộ đếm `{len}/200`, thông báo lỗi inline `role="alert"` (`{colors.danger-text}`), cùng 2 nút `Quay lại` (`secondary`, `min-h-11`) và `Xác nhận hủy đơn` (`danger`, `min-h-11`). Tham chiếu bố cục: `mockups/admin-orders.html`.
- **`OrderProgressTimeline`** — Thẻ trắng (`{colors.bg-surface}`, `{rounded.2xl}`) trên `/orders/[id]` hiển thị danh sách có thứ tự (`<ol>`) 4 bước dọc: nút tròn đã xong (`{colors.success-soft}` + viền `{colors.success}` + icon `Check`), nút bước hiện tại (`{colors.primary}` + chữ trắng + vòng halo `{colors.primary-soft}`), nút chưa tới (viền `{colors.border-strong}` + chữ `{colors.text-muted}`), thanh nối `2px` (`{colors.success}` cho đoạn đã qua, `{colors.border-default}` cho đoạn còn lại), kèm mốc giờ và khung ghi chú vận đơn (`{colors.primary-soft}`/`{colors.primary-text}`, `{rounded.lg}`). Khi đơn `cancelled`, hiển thị hộp trạng thái hủy `{colors.danger-soft}`/`{colors.danger-text}`/`{colors.danger-ring}` bo `{rounded.xl}` kèm tác nhân, thời điểm và lý do. Tham chiếu bố cục: `mockups/order-detail-timeline.html`.
- **`RefreshStatusButton`** — Nút `secondary` bo `{rounded.xl}`, chiều cao tối thiểu `{spacing.touch-target}`, icon `RefreshCw` xoay khi đang tải (`animate-spin`), nhãn **"Làm mới trạng thái"** đặt ở phần đầu trang `/orders/[id]`. Tham chiếu bố cục: `mockups/order-detail-timeline.html`.

## Do's and Don'ts

| Nên làm (Do) | Không được làm (Don't) |
| :--- | :--- |
| Dùng đúng mã hex Tailwind v4 (`#4F39F6`, `#EC003F`, `#007A55`, `#BB4D00`) và class Tailwind gốc của ShopLite | Bịa bảng màu mới, thêm dark mode, hay dùng nhầm mã hex Tailwind v3 (`#4F46E5`) |
| Luôn ghép **màu + icon + văn bản** cho mọi trạng thái tồn kho, đơn hàng (`OrderStatusBadge`) và hoàn kho | Dùng mỗi chấm màu hoặc đổi màu chữ đơn thuần để báo sắp hết hàng / chờ hàng hoàn |
| Giữ tách biệt thị giác giữa chip trắng `Đã giữ X cho đơn này` và nhãn màu `Còn cho đơn mới: Y` | Tô đỏ toàn bộ dòng sản phẩm khi `Còn cho đơn mới: 0` gây ảo giác đơn này hết hàng |
| Dùng danh sách thẻ 1 cột (`AdminOrderCard`) và vùng chạm `>= 44px` cho nút, tab lọc, chip trên mobile `390px` | Dùng bảng `<table>` nhiều cột gây cuộn ngang hoặc nút/tab/chip nhỏ `< 44px` trên điện thoại kho |
| Giữ nút chuyển 1 bước (`primary`) tách biệt rõ ràng với nút `Hủy đơn` (`secondary` viền `{colors.danger-ring}` chữ `{colors.danger-text}` / xác nhận bằng `danger`) | Dùng `<select>` dropdown cho phép nhân viên chọn tùy ý mọi trạng thái đơn |
