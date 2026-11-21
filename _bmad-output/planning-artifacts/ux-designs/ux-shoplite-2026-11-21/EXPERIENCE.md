---
name: ShopLite Ops
status: final
sources:
  - _bmad-output/planning-artifacts/prds/prd-shoplite-2026-11-21/prd.md
updated: 2026-11-21
---

# ShopLite Ops — Experience Spine

## Foundation

Ứng dụng web đáp ứng đa màn hình (**web-responsive**: máy tính tại quầy đóng gói `>= 1024px` và điện thoại kho `390px`), stakes mức **internal** (vận hành nội bộ 1 cửa hàng kết hợp mặt tiền bán hàng công khai). Kế thừa hệ thống UI hiện có của **ShopLite** (Next.js 16 App Router, Tailwind CSS v4, font `Be Vietnam Pro`, icon `lucide-react`, các component sẵn có tại `src/components/ui/` và `src/features/orders/components/`).

`DESIGN.md` là tài liệu chuẩn về nhận diện thị giác (màu hex Tailwind v4, kiểu chữ, khoảng cách, hình khối, đặc tả thị giác từng component); tài liệu `EXPERIENCE.md` này quy định kiến trúc thông tin, hành vi, trạng thái, tương tác, trợ năng và hành trình người dùng. Khi có xung đột giữa hai tài liệu xương sống (`DESIGN.md`, `EXPERIENCE.md`) với bất kỳ mockup HTML nào trong `mockups/`, **hai tài liệu xương sống luôn giữ quyền ưu tiên**.

## Information Architecture

| Bề mặt (Surface) | Đường dẫn truy cập từ | Mục đích & Chức năng chính | Tham chiếu trực quan |
| :--- | :--- | :--- | :--- |
| `/admin/login` | Truy cập trực tiếp, chuyển hướng từ `src/proxy.ts`, hoặc sau khi bấm Đăng xuất / hết phiên `401` (`?expired=1`) | Cổng đăng nhập quản trị bằng `ADMIN_PASSCODE`; phát hiện và hiển thị ngay trạng thái Fail-Closed `503` nếu chưa cấu hình biến môi trường. | `mockups/admin-login.html` *(trạng thái chuẩn, hết phiên 8h và fail-closed 503)* |
| `/admin/orders` | Chuyển hướng sau đăng nhập thành công hoặc mở trực tiếp khi Phiên quản trị còn hạn | Hàng chờ vận hành đơn hàng: lọc trạng thái trên URL (`?status=&q=`) kèm bộ đếm tab, tìm kiếm không dấu, hiển thị Hàng giữ chỗ & Tồn kho khả dụng inline, chuyển 1 bước kèm `expectedStatus` (và ô ghi chú mã vận đơn tùy chọn ở bước `confirmed → shipping`), hủy đơn có lý do, xác nhận nhận hàng hoàn (`+kho`), Đăng xuất. | `mockups/admin-orders.html` *(Desktop 1024px+ gồm đơn pending, confirmed có ô mã vận đơn & đơn hủy chờ hoàn kho; Mobile 390px + banner 409; hộp thoại hủy đơn shipping)* |
| `/orders/[id]` | Trang `/orders`, chuyển hướng sau đặt hàng (`/checkout` → `?placed=1`), hoặc link Khách hàng tự mở lại | Theo dõi tiến trình Đơn hàng cho Khách hàng: Timeline tiến trình 4 bước (hoặc hộp trạng thái hủy có lý do), nút Làm mới trạng thái thủ công, nút Hủy đơn hàng chỉ hiện khi `pending`. | `mockups/order-detail-timeline.html` *(Desktop đang giao + Mobile 390px đơn hủy & đơn cũ fallback đủ 4 bước)* |
| `/`, `/products`, `/products/[slug]` *(cập nhật dữ liệu động — spine-only)* | Thanh điều hướng công khai ShopLite | Bảo đảm Tồn kho khả dụng hiển thị động từ `InventoryRepository` (`force-dynamic`); vô hiệu hóa thêm giỏ và hiện nhãn **"Hết hàng"** khi tồn kho về `0`. | *Spine-only (giữ nguyên bố cục ShopLite hiện có)* |
| `/checkout` *(xử lý xung đột tồn kho — spine-only)* | Từ `/cart` | Xử lý lỗi `409 INSUFFICIENT_STOCK` khi đặt hàng: báo rõ tên sản phẩm vừa hết trong `role="alert"`, giữ nguyên toàn bộ form địa chỉ đã điền và giỏ hàng hiện tại. | *Spine-only (giữ nguyên bố cục form ShopLite hiện có)* |

*Ghi chú phạm vi mockup:* Toàn bộ 3 bề mặt có giao diện mới hoặc thay đổi bố cục lớn (`/admin/login`, `/admin/orders`, `/orders/[id]`) đều có mockup 1:1 trong `mockups/`. Các bề mặt mua sắm sẵn có (`/`, `/products`, `/products/[slug]`, `/checkout`) giữ nguyên bố cục hiện hữu nên được xây dựng trực tiếp từ bảng spine.

## Voice and Tone

Ngôn ngữ giao diện **100% tiếng Việt có dấu**, rõ ràng, trực diện, hướng hành động và tuyệt đối không gây hiểu nhầm về số liệu tồn kho hay trạng thái đơn.

| Nên viết (Do) | Không nên viết (Don't) |
| :--- | :--- |
| `"Đã giữ 2 cho đơn này · Còn cho đơn mới: 0"` | `"Tồn kho: 0"` *(gây ảo giác hết hàng, dễ hủy oan đơn)* |
| `"Xác nhận đơn"` / `"Bàn giao giao hàng"` / `"Đánh dấu đã giao"` | `"Cập nhật trạng thái"` chung chung hoặc dropdown chọn tùy ý |
| `"Hủy đơn đang giao sẽ không tự động cộng lại tồn kho."` | `"Bạn có chắc muốn hủy?"` *(giấu mất hệ quả tồn kho)* |
| `"Xác nhận đã nhận hàng hoàn (+kho)"` | `"Hoàn kho"` *(mơ hồ, không nhắc điều kiện hàng phải về kệ)* |
| `"Đơn hàng vừa được cập nhật bởi thao tác khác."` | `"Error 409: Conflict"` hoặc thông báo kỹ thuật tiếng Anh |
| `"Hệ thống chưa cấu hình mật khẩu quản trị (ADMIN_PASSCODE)."` | `"Lỗi máy chủ 503"` *(không giúp chủ shop biết cách sửa)* |
| `"Đơn hàng đã được xác nhận — vui lòng liên hệ cửa hàng nếu cần hỗ trợ."` | Ẩn im nút hủy mà không giải thích vì sao khách không bấm hủy được nữa |

## Component Patterns

Mọi tên component dưới đây khớp 1–1 với đặc tả thị giác tại `DESIGN.md#Components`.

| Component | Dùng ở bề mặt | Quy tắc hành vi |
| :--- | :--- | :--- |
| `Button` *(kế thừa)* | Toàn hệ thống | Chống bấm đúp: chuyển sang `disabled` kèm nhãn tiến trình (`Đang xác nhận…`, `Đang hủy…`, `Đang xử lý…`) trong suốt thời gian chờ API. |
| `OrderStatusBadge` *(kế thừa + delta AA)* | `/orders`, `/orders/[id]`, `/admin/orders` | Hiển thị đúng nhãn tiếng Việt theo `ORDER_STATUS_LABELS` kèm icon `lucide-react` tương ứng từng trạng thái (`Clock`, `CheckCircle2`, `Truck`, `PackageCheck`, `XCircle`), và dùng `{colors.text-secondary}` cho `cancelled` để đạt tương phản AA. |
| `StockBadge` *(kế thừa)* | `/`, `/products`, `/products/[slug]` | Đọc `stock` động từ `InventoryRepository`; khi `stock === 0` hiển thị `"Hết hàng"` và khóa nút thêm giỏ đi kèm. |
| `EmptyState` *(kế thừa)* | `/admin/orders`, `/orders` | Khi danh sách lọc rỗng, hiển thị thông điệp rõ ngữ cảnh (trạng thái đang lọc / từ khóa tìm kiếm) cùng nút **"Xóa bộ lọc"** để quay về `Tất cả`. |
| `CancelOrderButton` *(kế thừa)* | `/orders/[id]` | Chỉ render khi `order.status === "pending"`. Bấm lần 1 mở khung xác nhận 2 bước; bấm `"Xác nhận hủy"` gọi `PATCH /api/orders/:id` và gọi `router.refresh()`. Nếu nhận `409` (nhân viên vừa xác nhận đơn), hiển thị `role="alert"` và tự gọi `router.refresh()` để đồng bộ ẩn nút hủy. Khi đơn không còn `pending`, ẩn component này và hiển thị ghi chú liên hệ cửa hàng. |
| `AdminHeaderBar` | `/admin/orders` | Luôn hiển thị trên cùng (`sticky`). Nút **"Đăng xuất"** gọi `POST /api/admin/auth/logout`, nhận `200` (kể cả khi phiên đã hết hạn) và điều hướng về `/admin/login`. |
| `AdminLoginCard` | `/admin/login` | Kiểm tra cấu hình `ADMIN_PASSCODE` ngay từ phía Server Component: nếu thiếu, hiển thị cảnh báo `role="alert"` và `disabled` cả ô nhập lẫn nút gửi. Khi đã cấu hình, hỗ trợ nhấn `Enter` để gửi `POST /api/admin/auth/login`; hiện thông báo `role="status"` khi URL có `?expired=1`; hiện `role="alert"` khi nhận `400`/`401`/`503`. |
| `OrderFilterTabs` | `/admin/orders` | Đồng bộ 2 chiều với query URL `?status=all|pending|confirmed|shipping|delivered|cancelled`; giá trị `?status=` không hợp lệ fallback về `all`. Tab `pending` sắp xếp **FIFO (đơn cũ nhất ở trên)**; các tab khác sắp xếp mới nhất trước. Mỗi tab luôn hiển thị số lượng đơn thực tế (`counts`) từ API. |
| `AdminOrderSearchBar` | `/admin/orders` | Tìm kiếm theo mã đơn (`SL-...`), SĐT hoặc tên Khách hàng không dấu (`normalizeText`), đồng bộ vào URL `?q=...` (giữ nguyên khi F5). Nút xóa nhanh (`✕`) đặt lại `?q=` về rỗng mà giữ nguyên tab `?status=` hiện tại. |
| `AdminOrderCard` | `/admin/orders` | Chỉ hiển thị đúng **1 nút hành động chính** tương ứng bước kế tiếp hợp lệ (`pending` → `"Xác nhận đơn"`, `confirmed` → ô nhập ghi chú mã vận đơn tùy chọn `<= 200` ký tự ngay cạnh nút `"Bàn giao giao hàng"`, `shipping` → `"Đánh dấu đã giao"`). Mọi lệnh gọi `PATCH /api/admin/orders/:id/status` **bắt buộc gửi kèm `expectedStatus: order.status`**. Đơn `delivered` không hiện nút hành động; đơn `cancelled` chỉ hiện nút **"Xác nhận đã nhận hàng hoàn (+kho)"** khi `inventoryRestocked === false`. |
| `ReservedStockIndicator` | `/admin/orders` (bên trong `AdminOrderCard`) | Chỉ render với đơn đang giữ hàng (`pending`, `confirmed`, `shipping`); **không render** với đơn `delivered` hoặc `cancelled`. Luôn hiển thị đủ 2 vế `Đã giữ {quantity} cho đơn này · Còn cho đơn mới: {availableStock}` kèm biểu tượng phân bậc (`✓`, `⚠`, `✕`) theo ngưỡng `> 5` / `1–5` / `0`. |
| `RestockStatusBadge` | `/admin/orders` (bên trong `AdminOrderCard`) | Chỉ render trên đơn `cancelled`: `inventoryRestocked === false` → badge vàng cam `"Chờ nhận hàng hoàn"` (`data-testid="restock-pending-badge"`); `inventoryRestocked === true` → badge xanh `"Đã hoàn kho"` (`data-testid="restocked-badge"`); `inventoryRestocked === undefined` (đơn hủy cũ) → không render badge hay nút hoàn kho. |
| `CancelOrderDialog` | `/admin/orders` (overlay) | Mở khi bấm **"Hủy đơn"** trên `pending`/`confirmed`/`shipping`. Gồm 3 chip chọn nhanh (*"Hết hàng thực tế"*, *"Khách yêu cầu hủy qua điện thoại"*, *"Giao hàng thất bại / Khách không nhận"*): chạm chip **điền nội dung vào `<textarea>` để nhân viên sửa thêm**, không tự submit. Chặn submit & hiện `role="alert"` nếu lý do trống hoặc `> 200` ký tự. Hiển thị cảnh báo không tự hoàn kho khi `order.status === "shipping"`. Bấm `Escape` hoặc nút `"Quay lại"` để đóng. |
| `OrderProgressTimeline` | `/orders/[id]` | Render đủ 4 bước theo thứ tự cho đơn chưa hủy (`Chờ xác nhận` → `Đã xác nhận` → `Đang giao` → `Đã giao`), hiện mốc thời gian qua `formatDateTime()` và ghi chú vận đơn (nếu có). Đơn mới `cancelled` (có `statusHistory`) hiện khối hủy gồm tác nhân (`Khách hàng` / `Cửa hàng`), thời điểm và lý do. Đơn cũ không có `statusHistory` áp dụng luật fallback đủ 4 bước: bước 1 dùng `createdAt`, bước hiện tại dùng `updatedAt`, các bước trung gian suy luận hiển thị `"—"`; đơn cũ `cancelled` hiện `"Đơn đã hủy"` + `updatedAt`. |
| `RefreshStatusButton` | `/orders/[id]` | Bấm nút kích hoạt `router.refresh()` để tải lại dữ liệu mới nhất từ server, hiển thị trạng thái đang tải ngắn (`Đang làm mới…`), không chạy polling tự động. |

## State Patterns

| Trạng thái (State) | Bề mặt áp dụng | Cách xử lý hành vi & hiển thị |
| :--- | :--- | :--- |
| **Cold load / Đang tải** | `/admin/orders` | Hiển thị 3 thẻ skeleton khớp cấu trúc `AdminOrderCard` khi chuyển tab lọc hoặc tải lại danh sách; vô hiệu hóa nút thao tác trên chính đơn đang gửi request (`pendingOrderId`) để chống bấm đúp. |
| **Đặt hàng thành công (`?placed=1`)** | `/orders/[id]` | Khi `placed === "1"` và `order.status === "pending"`, giữ nguyên banner `role="status"` *"Đặt hàng thành công!"* của ShopLite phía trên `OrderProgressTimeline`. |
| **Danh sách trống (0 đơn hệ thống)** | `/admin/orders` | Render `EmptyState` với thông điệp *"Chưa có đơn hàng nào trong hệ thống"*. |
| **Không khớp lọc / tìm kiếm** | `/admin/orders` | Render `EmptyState` ghi rõ trạng thái hoặc từ khóa tìm kiếm không có đơn khớp, kèm nút **"Xóa bộ lọc"** đặt lại về `/admin/orders?status=all`. |
| **Không tìm thấy đơn (`404 ORDER_NOT_FOUND`)** | `/orders/[id]` | Gọi `notFound()` của Next.js hiển thị trang 404 thân thiện kèm liên kết quay về `/orders` (giữ hành vi gốc của ShopLite). |
| **Chưa cấu hình hệ thống (`503 ADMIN_NOT_CONFIGURED`)** | `/admin/login`, mọi `/api/admin/*` | Trên `/admin/login`, Server Component hiển thị ngay khung `role="alert"` màu `{colors.danger-soft}` giải thích cần thiết lập `ADMIN_PASSCODE` và khóa toàn bộ form đăng nhập. |
| **Sai mật khẩu (`401`) / Thiếu input (`400`)** | `/admin/login` | Hiển thị lỗi `role="alert"` ngay trên nút đăng nhập (*"Mật khẩu quản trị không đúng"* hoặc *"Vui lòng nhập mật khẩu quản trị"*), giữ focus tại ô nhập để thử lại ngay. |
| **Phiên 8 giờ hết hạn (`401 UNAUTHORIZED`)** | `/admin/orders` | Bất kỳ thao tác tải/chuyển trạng thái/hủy/hoàn kho nào nhận `401` đều chuyển hướng ngay sang `/admin/login?expired=1` kèm khung thông báo vàng `{colors.warning-soft}` *"Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại."* |
| **Xung đột đồng thời (`409 INVALID_STATUS_TRANSITION`)** | `/admin/orders`, `/orders/[id]` | Trên `/admin/orders`: hiển thị banner `role="alert"` màu `{colors.danger-soft}` *"Đơn hàng vừa được cập nhật bởi thao tác khác. Danh sách đã được làm mới."* và tự gọi lại `GET /api/admin/orders`. Trên `/orders/[id]` (khi khách bấm `CancelOrderButton` đúng lúc nhân viên vừa xác nhận): hiển thị lỗi `role="alert"` và tự gọi `router.refresh()` để cập nhật Timeline và ẩn nút hủy. |
| **Lỗi máy chủ bất ngờ (`500 INTERNAL_ERROR`)** | `/admin/orders`, `/admin/login`, `/checkout` | Hiển thị `role="alert"` *"Có lỗi hệ thống xảy ra. Vui lòng thử lại sau."* và giữ nguyên trạng thái nhập liệu hiện tại để người dùng thử lại. |
| **Lỗi mạng / Mất kết nối (Offline)** | `/admin/orders`, `/admin/login`, `/orders/[id]` | Không âm thầm nuốt lỗi hay đổi trạng thái giả; giữ nguyên hộp thoại/form đang mở, hiển thị `role="alert"` *"Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại."* |
| **Lỗi nhập liệu lý do hủy (`400`)** | `CancelOrderDialog` | Validate ngay phía client và đồng bộ lỗi server trong `role="alert"` cạnh `<textarea>`, không đóng hộp thoại và không xóa nội dung nhân viên vừa gõ. |
| **Trạng thái kết thúc (`delivered` / `cancelled`)** | `/admin/orders`, `/orders/[id]` | Trên `/admin/orders`: `delivered` không có nút chuyển hay hủy, không hiện `ReservedStockIndicator`; `cancelled` chỉ cho phép bấm **"Xác nhận đã nhận hàng hoàn (+kho)"** đúng 1 lần khi `inventoryRestocked === false`. Trên `/orders/[id]`: ẩn `CancelOrderButton`. |
| **Đơn cũ thiếu `statusHistory` / `inventoryRestocked`** | `/orders/[id]`, `/admin/orders` | Không ném lỗi runtime; hiển thị Timeline fallback đủ 4 bước (`createdAt`, `updatedAt`, `"—"`), ẩn nút hoàn kho khi `inventoryRestocked === undefined`. |
| **Hết hàng lúc thanh toán (`409 INSUFFICIENT_STOCK`)** | `/checkout`, `/`, `/products`, `/products/[slug]` | Trên `/checkout`: hiện `role="alert"` nêu rõ tên sản phẩm vừa hết hàng, **giữ nguyên 100% thông tin giao hàng đã điền và giỏ hàng**. Trên `/`, `/products`, `/products/[slug]`: tải lại trang hiển thị `StockBadge` **"Hết hàng"** và vô hiệu hóa nút thêm giỏ. |

## Interaction Primitives

- **Thao tác 1 bước (Single-step progression):** Mỗi đơn đang xử lý chỉ có đúng 1 nút chính ứng với bước tiếp theo hợp lệ, bảo đảm hoàn thành duyệt đơn trong `<= 2` lần bấm (`SM-2`). Riêng bước `confirmed → shipping` có ô nhập ghi chú mã vận đơn tùy chọn hiển thị trực tiếp trên thẻ (nhân viên có thể bỏ trống và bấm **"Bàn giao giao hàng"** ngay trong 1 chạm).
- **Xác nhận có chủ đích cho hành động phá hủy:** Hủy đơn luôn mở `CancelOrderDialog` 1 tầng (không bao giờ hủy ngay 1 chạm) để bắt buộc ghi lý do; chạm chip nhanh chỉ điền vào `<textarea>` để nhân viên vẫn chỉnh sửa được.
- **Thao tác 1 lần bất biến (Idempotent restock):** Bấm **"Xác nhận đã nhận hàng hoàn (+kho)"** khóa nút ngay khi đang gửi; khi thành công nút biến mất và đổi thành `RestockStatusBadge` *"Đã hoàn kho"*.
- **Bàn phím & Điều hướng:** `Tab` di chuyển theo đúng thứ tự đọc; `Enter` gửi form đăng nhập hoặc tìm kiếm; `Escape` đóng `CancelOrderDialog` và trả focus về nút **"Hủy đơn"** vừa mở.
- **Làm mới thủ công:** Khách hàng chủ động bấm `RefreshStatusButton` (`router.refresh()`) trên `/orders/[id]`.
- **Các mẫu tương tác bị cấm (Banned everywhere):**
  - Cấm dùng `<select>` dropdown chọn Trạng thái đơn hàng tự do trên `/admin/orders`.
  - Cấm chạy polling 30 giây tự động trên `/orders/[id]`.
  - Cấm mở modal chồng modal (`> 1` tầng).
  - Cấm thao tác ẩn chỉ hiện khi hover (không dùng được trên điện thoại kho `390px`).

## Accessibility Floor

Mục tiêu tuân thủ **WCAG 2.2 AA** trên cả máy tính và điện thoại `390px` (tỉ lệ tương phản màu được kiểm chứng tại `DESIGN.md#Colors`).

- **Nhãn biểu mẫu tường minh:** Mọi `<input>` và `<textarea>` (ô mật khẩu `/admin/login`, ô tìm kiếm `/admin/orders`, ô ghi chú mã vận đơn trên thẻ `confirmed`, ô lý do hủy `CancelOrderDialog`) đều có `<label htmlFor="...">` gắn đúng `id` (hoặc `aria-label` rõ ràng cho ô tìm kiếm).
- **Tiêu điểm nhìn thấy được (`Focus visible`):** Kế thừa vòng tiêu điểm `focus-visible:outline-2 focus-visible:outline-offset-2` của ShopLite (`{colors.primary}` / `{colors.danger}` / `{colors.border-strong}`) trên mọi nút, liên kết, tab lọc và chip lý do.
- **Không bao giờ chỉ dùng màu sắc:** Mọi trạng thái tồn kho (`ReservedStockIndicator`), trạng thái đơn (`OrderStatusBadge`), trạng thái hoàn kho (`RestockStatusBadge`) và bước Timeline (`OrderProgressTimeline`) đều kết hợp **3 tín hiệu**: màu sắc + biểu tượng/ký hiệu (`Clock`, `CheckCircle2`, `Truck`, `PackageCheck`, `XCircle`, `AlertTriangle`, số bước) + văn bản tiếng Việt rõ nghĩa.
- **Thông báo cho trình đọc màn hình:** Lỗi xác thực, lỗi xung đột `409`, cảnh báo `503` và cảnh báo hủy đơn `shipping` dùng `role="alert"`; kết quả cập nhật trạng thái đơn, banner `?placed=1` và thông báo phiên hết hạn dùng `role="status"` (`aria-live="polite"`).
- **Quản lý hộp thoại:** `CancelOrderDialog` gắn `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, khóa cuộn nền, hỗ trợ `Escape` để đóng và trả lại focus sau khi đóng.
- **Kích thước vùng chạm:** Mọi nút hành động chính, nút hủy, nút Đăng xuất, tab lọc, chip chọn nhanh và ô nhập đạt chiều cao tối thiểu `{spacing.touch-target}` (`44px`) trên `390px`.

## Responsive & Platform

| Breakpoint | Bố cục & Hành vi thích ứng |
| :--- | :--- |
| **`< 640px` (mục tiêu chuẩn `390px` — điện thoại kho)** | `AdminHeaderBar` rút gọn tiêu đề còn *"Vận hành"* + nút *"Đăng xuất"* (`min-h-11`); `AdminOrderSearchBar` rộng `100%`; `OrderFilterTabs` cuộn ngang 1 hàng (`overflow-x-auto`) không xuống dòng vỡ khối; `AdminOrderCard` xếp dọc vùng nút hành động toàn chiều rộng (`w-full`, cao `>= 44px`); `OrderProgressTimeline` hiển thị dọc gọn gàng. Bắt buộc `scrollWidth <= innerWidth` (0 tràn ngang). |
| **`640px – 1023px` (tablet / cửa sổ hẹp)** | Thanh công cụ `/admin/orders` cho phép tab lọc và ô tìm kiếm tự xuống hàng gọn gàng; chân thẻ `AdminOrderCard` đặt nút ngang căn phải. |
| **`>= 1024px` (desktop quầy đóng gói)** | Khung tối đa `max-w-6xl` (`{spacing.container-admin}`); `OrderFilterTabs` và `AdminOrderSearchBar` nằm cùng 1 hàng ngang; mỗi dòng sản phẩm trong `AdminOrderCard` đặt tên món bên trái và `ReservedStockIndicator` thẳng hàng bên phải. |

## Inspiration & Anti-patterns

- **Kế thừa từ ShopLite hiện hữu:** Toàn bộ bộ thẻ `rounded-2xl`, nút `rounded-xl`, palette `indigo-600`/`slate`/`emerald`/`rose-600`, font `Be Vietnam Pro` và `OrderStatusBadge` — giữ cảm giác một sản phẩm liền mạch thay vì trang admin lạc tông.
- **Lấy cảm hứng từ quy trình xử lý hàng đợi (Linear / Shopify Order Queue):** Lọc theo tab gắn bộ đếm số lượng trên URL, sắp xếp FIFO cho hàng chờ `pending`, mỗi đơn có đúng 1 hành động chính không mơ hồ.
- **Anti-patterns đã loại bỏ rõ ràng:**
  - *Bảng dữ liệu 8–10 cột trên `/admin/orders`:* Gãy hoàn toàn trên điện thoại `390px` và không đủ chỗ hiển thị `ReservedStockIndicator` rõ nghĩa.
  - *Polling 30 giây trên `/orders/[id]`:* Gây tranh chấp đọc/ghi file JSON và làm flaky bộ test E2E.
  - *Chỉ hiển thị số `Tồn kho: 0` cạnh món trong đơn chờ duyệt:* Gây "ảo giác hết hàng" khiến nhân viên hủy oan đơn đã giữ chỗ.
  - *Hiển thị dropdown chọn 5 trạng thái tùy ý:* Dễ bấm nhầm nhảy cóc `pending → delivered` hoặc quay lùi trạng thái.

## Key Flows

### UJ-1 — Chị Hoa (Nhân viên vận hành) duyệt và bàn giao hàng chờ đơn buổi sáng

1. Chị Hoa mở `/admin/orders` lúc 8h sáng trên điện thoại `390px` khi chưa đăng nhập; `src/proxy.ts` chuyển hướng sang `/admin/login`.
2. Trên `AdminLoginCard`, chị nhập `ADMIN_PASSCODE` và bấm **"Đăng nhập vận hành"** → nhận Phiên quản trị 8 giờ và vào thẳng `/admin/orders`.
3. Chị chạm tab **"Chờ xác nhận (12)"** trên `OrderFilterTabs` (URL cập nhật `?status=pending`, sắp xếp FIFO đơn cũ nhất ở trên).
4. Ở thẻ đầu tiên `SL-20261121-A1B2C3` (`AdminOrderCard`), chị nhìn thấy ngay `ReservedStockIndicator`: **`✓ Đã giữ 2 cho đơn này · ⚠ Còn cho đơn mới: 3`**. Chị kiểm tra kệ đúng có hàng rồi bấm nút chính **"Xác nhận đơn"** (tổng 2 lần chạm từ lúc chọn tab).
5. Với đơn khác đặt "Tai nghe SoundMax Pro" bị móp hộp cuối trên kệ, chị bấm **"Hủy đơn"** → `CancelOrderDialog` mở ra, chị chạm chip *"Hết hàng thực tế"* (chữ tự điền vào `<textarea>`), bấm **"Xác nhận hủy đơn"** → đơn sang `cancelled`, hệ thống tự động hoàn kho và gắn `RestockStatusBadge` *"Đã hoàn kho"*.
6. Cuối ca chiều, khi shipper tới lấy hàng, chị chuyển sang tab **"Đã xác nhận"**, gõ mã vận đơn `GHN-882910` vào ô ghi chú vận chuyển tùy chọn trên thẻ và bấm **"Bàn giao giao hàng"** → đơn chuyển sang `shipping`.
7. **Climax:** Hôm sau khi shipper báo giao thành công, chị mở tab **"Đang giao"** và bấm **"Đánh dấu đã giao"** → đơn hoàn tất ở trạng thái `delivered` (ẩn toàn bộ nút chuyển/hủy và dòng giữ chỗ), khép kín trọn vòng đời đơn hàng. Cuối ca chị bấm **"Đăng xuất"** trên `AdminHeaderBar` để xóa cookie trên trình duyệt.

*Nhánh phụ & nhánh lỗi (Alternate & failure paths):*
- Tìm kiếm mã đơn không tồn tại trên `AdminOrderSearchBar` → hiện `EmptyState` kèm nút **"Xóa bộ lọc"** để quay lại danh sách đầy đủ.
- Phiên 8 giờ hết hạn khi chị bấm **"Xác nhận đơn"** (`401`) → tự chuyển sang `/admin/login?expired=1` hiện thông báo phiên hết hạn.
- Đồng nghiệp ở máy tính quầy đã duyệt đơn đó trước chị 5 giây (`409` lệch `expectedStatus`) → hiện banner `role="alert"` *"Đơn hàng vừa được cập nhật bởi thao tác khác. Danh sách đã được làm mới."* và tự đồng bộ lại danh sách.
- Máy chủ chưa thiết lập `ADMIN_PASSCODE` (`503`) → `/admin/login` báo lỗi đỏ ngay lúc tải trang và khóa form.

### UJ-2 — Anh Minh (Khách hàng) đặt bàn phím và theo dõi tiến trình Đơn hàng

1. Anh Minh xem sản phẩm "Bàn phím cơ KeyPro 75%" trên trang chủ `/` hoặc `/products/ban-phim-co-keypro-75` (thấy `StockBadge` đọc Tồn kho khả dụng động), thêm 1 chiếc vào giỏ và bấm **"Đặt hàng"** tại `/checkout`.
2. Server trừ kho nguyên tử trong Khóa tuần tự và chuyển anh sang `/orders/SL-20261121-A1B2C3?placed=1`: trang hiện banner `role="status"` *"Đặt hàng thành công!"*, `OrderProgressTimeline` sáng ở bước 1 (**Chờ xác nhận** kèm mốc `08:05`), kèm `CancelOrderButton` và `RefreshStatusButton`.
3. Hôm sau, anh mở lại `/orders/SL-20261121-A1B2C3` (hoặc bấm **"Làm mới trạng thái"**).
4. **Climax:** `OrderProgressTimeline` hiển thị rõ bước 1 (`Chờ xác nhận` ✓ 08:05), bước 2 (`Đã xác nhận` ✓ 08:15), và bước 3 hiện tại (`Đang giao` ● 14:20 — kèm thẻ ghi chú *"Mã vận đơn GHN-882910"*). `CancelOrderButton` đã tự ẩn và thay bằng dòng giải thích *"Đơn hàng đã được xác nhận — vui lòng liên hệ cửa hàng nếu cần hỗ trợ"*. Khi nhận xong hàng và cửa hàng chuyển `delivered`, cả 4/4 bước trên Timeline sáng xanh hoàn tất.

*Nhánh phụ & nhánh lỗi (Alternate & failure paths):*
- Nếu anh đổi ý khi đơn vẫn còn ở `pending`, anh bấm `CancelOrderButton` (xác nhận 2 bước) → đơn chuyển `cancelled` (`actor: "customer"`) và tự hoàn kho; nếu nhân viên vừa kịp xác nhận đơn sang `confirmed` ngay lúc anh bấm (`409`), UI báo lỗi `role="alert"` và tự gọi `router.refresh()` để đồng bộ trạng thái mới.
- Hai khách bấm **"Đặt hàng"** cùng lúc khi sản phẩm chỉ còn `1` chiếc: người thứ hai nhận `409 INSUFFICIENT_STOCK` trên `/checkout`, thấy khung `role="alert"` nêu rõ tên sản phẩm vừa hết nhưng **không bị mất thông tin họ tên, SĐT, địa chỉ đã điền và giỏ hàng hiện tại**.
- Anh Minh mở một Đơn hàng cũ trong `storage/orders.json` chưa có `statusHistory` → `OrderProgressTimeline` vẫn hiển thị đủ 4 bước theo luật fallback (`createdAt`, `updatedAt`, `"—"`), không lỗi runtime.

### UJ-3 — Chị Hoa xử lý Đơn hàng giao thất bại (bom hàng) và xác nhận hàng hoàn về kệ

1. Đang ở `/admin/orders`, chị Hoa gõ số điện thoại khách `0903444555` vào `AdminOrderSearchBar` để tìm đơn `SL-20261119-G7H8I9` đang ở trạng thái `shipping`.
2. Chị bấm **"Hủy đơn"** → `CancelOrderDialog` mở ra kèm khung cảnh báo vàng `role="alert"`: *"Hủy đơn đang giao sẽ không tự động cộng lại tồn kho."*
3. Chị chạm chip *"Giao hàng thất bại / Khách không nhận"*, bổ sung ghi chú shipper gọi 3 lần không nghe máy, rồi bấm **"Xác nhận hủy đơn"** → đơn chuyển sang `cancelled`, `inventoryRestocked = false`, Tồn kho khả dụng giữ nguyên, thẻ đơn hiển thị `RestockStatusBadge` màu vàng cam **"Chờ nhận hàng hoàn"** và nút **"Xác nhận đã nhận hàng hoàn (+kho)"**.
4. **Climax:** Hai ngày sau, shipper mang kiện hàng nguyên vẹn trả về cửa hàng. Chị Hoa lọc tab **"Đã hủy"**, mở đúng đơn có badge **"Chờ nhận hàng hoàn"** và bấm **"Xác nhận đã nhận hàng hoàn (+kho)"** → hệ thống cộng đúng số lượng hàng về `storage/inventory.json`, nút xác nhận biến mất, badge đổi thành màu xanh **"Đã hoàn kho"**, và sản phẩm lập tức mở bán trở lại trên `/`, `/products` và `/products/[slug]`.

*Nhánh lỗi (Failure paths):*
- Bấm đúp hoặc gửi trùng request xác nhận hoàn kho (`POST /api/admin/orders/:id/restock`) khi `inventoryRestocked` đã là `true` → server từ chối `409 INVALID_STATUS_TRANSITION`, tuyệt đối không cộng kho 2 lần; UI hiện banner `role="alert"` và làm mới thẻ về trạng thái **"Đã hoàn kho"**.
- Gõ lý do hủy bỏ trống hoặc quá 200 ký tự trong `CancelOrderDialog` → chặn gửi và hiện lỗi inline `role="alert"` ngay dưới ô `<textarea>`.
