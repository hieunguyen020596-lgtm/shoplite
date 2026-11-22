---
status: final
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-project_ai-2026-11-21/prd.md
  - _bmad-output/planning-artifacts/prds/prd-project_ai-2026-11-21/addendum.md
  - _bmad-output/planning-artifacts/architecture/architecture-project_ai-2026-11-21/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-project_ai-2026-11-21/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-project_ai-2026-11-21/EXPERIENCE.md
---

# ShopLite (vận hành đơn hàng) - Epic Breakdown

## Overview

File này chia các yêu cầu từ PRD, UX (DESIGN.md + EXPERIENCE.md) và Architecture Spine thành epic và story có thể triển khai cho tính năng vận hành đơn hàng của ShopLite. ID dùng nguyên như nguồn: `FR-n` và `BL-n` từ PRD, `AD-n` từ spine, `UX-DRn` đánh số tại đây.

## Requirements Inventory

### Functional Requirements

**Baseline: hành vi hiện có phải giữ nguyên, mỗi mục cần test hồi quy (PRD §4.0)**

- BL-1: Server tính lại giá bằng `calculateOrderTotals`, bỏ qua giá client gửi.
- BL-2: Phí giao tiêu chuẩn 30.000 ₫, miễn phí khi tạm tính ≥ 500.000 ₫; giao nhanh 60.000 ₫.
- BL-3: Validate bằng `placeOrderSchema` (SĐT `VN_PHONE_REGEX`, tối đa 10 mỗi dòng, giỏ không rỗng), gộp dòng trùng `productId`.
- BL-4: Khách chỉ hủy được đơn `pending`; trạng thái khác trả 409 `INVALID_STATUS_TRANSITION` với thông báo hiện có.
- BL-5: Định dạng lỗi `{ error: { code, message, details? } }`; 5 mã lỗi hiện có giữ nguyên HTTP status.
- BL-6: `INSUFFICIENT_STOCK` với câu "đã hết hàng" / "chỉ còn N sản phẩm".
- BL-7: Mã đơn có dạng `SL-YYYYMMDD-XXXXXX`.
- BL-8: Lưu file JSON (`ORDERS_FILE`), ghi atomic tmp+rename; đơn cũ vẫn đọc được.
- BL-9: Đơn `bank_transfer` ở `pending` hiện hướng dẫn chuyển khoản.
- BL-10: Giỏ hàng lưu trong localStorage, tối đa 10 mỗi sản phẩm, không thêm được hàng hết.

**Must**

- FR-1: Nhân viên đăng nhập tại `/staff/login` bằng tài khoản riêng. Sai thì báo lỗi chung. Mật khẩu không lưu dạng rõ. Phiên hết hạn sau 12 giờ, có nút Đăng xuất.
- FR-2: `/staff/**` (trừ login) và API nhân viên yêu cầu phiên hợp lệ. Trang thì redirect về login, API thì trả 401 `UNAUTHENTICATED`.
- FR-3: `GET /api/orders` chỉ dành cho Nhân viên (401 nếu không có phiên). `/orders` không còn liệt kê tất cả đơn. `POST /api/orders` vẫn mở.
- FR-4: `/orders` chỉ liệt kê đơn mà thiết bị đã đặt hoặc đã xác minh, kèm form Tra cứu đơn (Mã đơn + SĐT).
- FR-5: `POST /api/orders` thành công thì thiết bị tự được xác minh cho đúng đơn đó. `/orders/[id]?placed=1` hiện đầy đủ thông tin.
- FR-6: Khi chưa xác minh, `/orders/[id]` và `GET /api/orders/:id` không trả họ tên, SĐT rõ, email, địa chỉ, ghi chú; chỉ trả SĐT đã che. Nhập đúng SĐT (chuẩn hóa +84/0) thì được xác minh.
- FR-7: Sai 5 lần trong 15 phút cho cùng một Mã đơn thì khóa 15 phút (429 `TOO_MANY_ATTEMPTS`). Mỗi nguồn yêu cầu bị giới hạn 20 lần sai mỗi 15 phút. Thiết bị đã đặt và Nhân viên được miễn.
- FR-8: Khách tự hủy phải đã xác minh (nếu không thì 403 `FORBIDDEN`). Vẫn chỉ hủy được ở `pending` (BL-4). Lịch sử ghi "Khách" / "Khách tự hủy". Hàng được nhả. Nút Hủy chỉ hiện khi `pending` và đã xác minh.
- FR-9: Hàng đợi ở `/staff`: mặc định hiện `pending`, cũ nhất trước, nhãn "Sắp quá hạn" khi còn dưới 2 giờ, lọc theo trạng thái kèm số đếm.
- FR-10: Chi tiết đơn cho nhân viên gồm đủ thông tin, Lịch sử, chỉ các nút hợp lệ, và Ghi chú nội bộ (≤ 500 ký tự, lưu người viết và thời điểm).
- FR-11: Sơ đồ chuyển trạng thái cố định (bảng PRD), thêm trạng thái `failed` "Giao thất bại". Bước chuyển không hợp lệ trả 409. Mỗi bước chuyển ghi đúng một sự kiện.
- FR-12: Nhân viên xác nhận đơn `pending → confirmed`, tối đa 2 thao tác từ Hàng đợi.
- FR-13: Nhân viên chuyển `confirmed → shipping`.
- FR-14: Nhân viên chuyển `shipping → delivered`. Tồn thực giảm, hàng đang giữ được nhả, Tồn khả dụng không đổi.
- FR-15: Nhân viên chuyển `shipping → failed` với Lý do có sẵn hoặc tự nhập. Hàng được nhả. Màn hình nhắc gọi khách và ghi chú.
- FR-16: Nhân viên hủy đơn ở `pending`/`confirmed`, bắt buộc Lý do (thiếu thì 400). Hủy ở `shipping` thì 409.
- FR-17: Đơn `pending` quá N giờ (mặc định 24) bị Hệ thống tự hủy với Lý do "Quá hạn xác nhận". Đơn quá hạn không bao giờ tính vào hàng đang giữ. Thời điểm của sự kiện = hạn chót.
- FR-18: Hai thao tác trên cùng một đơn được xử lý tuần tự. Thao tác đến sau nhận 409 kèm trạng thái hiện tại và người đã thao tác.
- FR-19: Tồn thực được lưu ngoài mã nguồn, khởi tạo từ `Product.stock`, không mất khi khởi động lại. Sản phẩm mới được bổ sung mốc.
- FR-20: `placeOrder` kiểm tra Tồn khả dụng và giữ hàng một cách nguyên tử. Hai khách tranh món cuối thì đúng một người thành công. Đơn thiếu bất kỳ sản phẩm nào thì không giữ gì.
- FR-21: Nhả hàng khi đơn chuyển sang `cancelled` (mọi nguồn) hoặc `failed`. Khi `delivered` thì nhả đồng thời với việc trừ Tồn thực.
- FR-22: Tồn thực và Tồn khả dụng không bao giờ âm. Thao tác vi phạm bị từ chối toàn bộ.
- FR-23: Catalog, chi tiết sản phẩm, bộ lọc `inStock`, `LOW_STOCK_THRESHOLD` và giỏ hàng đều dùng Tồn khả dụng.
- FR-24: Mỗi bước chuyển, kể cả lúc tạo đơn, ghi một Sự kiện trạng thái (trước, sau, thời điểm, người thao tác, Lý do). Sự kiện không sửa hay xóa được.
- FR-25: Nhân viên xem toàn bộ Lịch sử và Ghi chú theo thời gian tăng dần.
- FR-26: Đơn cũ vẫn mở được. Timeline dùng sự kiện suy ra. Đơn `pending` cũ không giữ hàng, và hạn của chúng tính từ lúc nâng cấp.
- FR-27: `/orders/[id]` có Timeline (Đã đặt → Đã xác nhận → Đang giao → Đã giao). Đơn `cancelled`/`failed` thì dừng ở bước đó kèm Lý do. Người thao tác hiện là "Cửa hàng". Timeline hiện cả khi chưa xác minh.
- FR-28: Ghi chú nội bộ không bao giờ xuất hiện trong phản hồi cho khách.
- FR-29: Thông báo sau khi đặt nêu thời hạn N giờ (lấy từ cấu hình), chỉ hiện khi `placed=1` và đơn đang `pending`.
- FR-33: Nhân viên tìm đơn theo Mã đơn đầy đủ hoặc 6 ký tự cuối, ở mọi trạng thái. Khớp một đơn thì mở thẳng, khớp nhiều thì liệt kê, không khớp thì báo "Không có đơn nào có mã này".

**Should (làm nếu kịp)**

- FR-30: Xác nhận nhiều đơn `pending` cùng lúc. Kiểm tra và ghi sự kiện riêng cho từng đơn; một đơn lỗi không chặn các đơn khác; báo kết quả thành công / thất bại.
- FR-31: In phiếu giao hàng cho đơn `confirmed`/`shipping`. COD in số tiền cần thu; không in Ghi chú nội bộ.
- FR-32: Cờ "Đã nhận tiền chuyển khoản" chỉ cho đơn `bank_transfer`, kèm mã giao dịch tùy chọn. Mỗi lần đổi ghi một Ghi chú nội bộ. Cờ không chặn bước chuyển nào.

### NonFunctional Requirements

- NFR1 (Bảo mật): cookie `HttpOnly`, `SameSite=Lax`, `Secure` khi chạy production. Mọi API ghi dữ liệu kiểm tra quyền ở server. Bí mật nằm trong biến môi trường, không commit.
- NFR2 (Toàn vẹn): mọi thao tác ghi được tuần tự hóa trong process và ghi atomic, theo kiểu được hết hoặc không được gì.
- NFR3 (Triển khai): chỉ hỗ trợ một instance. README phải ghi ràng buộc này.
- NFR4 (Hiệu năng): với 1.000 đơn, Hàng đợi và trang đơn phản hồi dưới 1 giây trên máy phát triển.
- NFR5 (Khả năng tiếp cận): kết quả thao tác dùng `role="status"`, lỗi dùng `role="alert"`; mọi thao tác dùng được bằng bàn phím.
- NFR6 (Chất lượng): `npm run check` phải qua; có E2E Playwright cho UJ-1 → UJ-4.
- NFR7 (Chi phí): không dùng dịch vụ ngoài, không thêm database, không thêm dependency nếu chưa được duyệt.
- NFR8 (Quyền riêng tư): log không chứa SĐT, địa chỉ, mật khẩu hay cookie dạng rõ.
- NFR9 (An toàn nghiệp vụ): xác nhận đơn, thanh toán và tồn kho luôn do Nhân viên thao tác và có ghi trong lịch sử. Không có AI tự thao tác.
- NFR10 (Tương thích): `ORDERS_FILE` giữ nguyên ý nghĩa. Biến môi trường mới được ghi vào README.

### Additional Requirements

Từ Architecture Spine (không có starter template; đây là dự án brownfield):

- AD-1: Feature mới `features/auth` và `features/inventory`; mở rộng `features/orders`. Service tạo bằng factory `create<X>Service(deps)` nhận `repository`, `now`, config. Hàm thuần có test cạnh file.
- AD-2: Chỉ adapter repository được dùng `node:fs` trên `storage/`. `orders.json` thuộc orders, `inventory.json` thuộc inventory. Có adapter JSON và in-memory. Biến `INVENTORY_FILE`.
- AD-3: `withStoreLock` trong `src/lib/store-lock.ts`; mọi use case đọc → sửa → ghi chạy trọn bên trong, chỉ service được lấy khóa, thao tác hàng loạt dùng một khóa cho cả lô.
- AD-4: `inventory.json` = `{ migratedAt, baselines }`. Tồn thực, hàng đang giữ và Tồn khả dụng chỉ tính bằng `computeStock` thuần. Luồng xử lý đơn chỉ ghi `orders.json`.
- AD-5: `applyTransition(order, to, actor, reason, now)` trong `order-state.ts` là chỗ duy nhất được gán `status`, ghi `StatusEvent` và `deliveredAt`.
- AD-6: Hàm thuần `effectiveStatus(order, now, ttl, migratedAt)` áp dụng ở mọi lần đọc. Đơn quá hạn được ghi bù ở lần ghi đầu tiên chạm tới đơn đó, với thời điểm = hạn chót. Biến `ORDER_PENDING_TTL_HOURS`.
- AD-7: Kiểu dữ liệu chỉ được mở rộng thêm: `failed`, `Actor`, `StatusEvent`, `InternalNote`, cùng `history?`, `notes?`, `deliveredAt?`, `payment?`. Lưu username, không lưu tên hiển thị. Ghi chú thêm bằng `appendNote`.
- AD-8: Mọi bề mặt cho khách chỉ trả kết quả của `toCustomerOrderView(order, { verified }, now)`.
- AD-9: Cookie ký HMAC `sl_staff` (12 giờ) và `sl_orders` (tối đa 20 mã). `STAFF_ACCOUNTS` (scrypt), `SESSION_SECRET`, `timingSafeEqual`. Guard `requireStaff()`/`canViewOrder()` ở mọi handler và page. `src/proxy.ts` chỉ redirect lạc quan.
- AD-10: `AccessError` (401, 403, 429) cùng shape với `OrderError`; `handleRouteError` xử lý cả hai; lỗi 409 xung đột đưa trạng thái hiện tại và người thao tác vào `details`.
- AD-11: Validate bằng Zod (`*-schema.ts`), mọi thao tác ghi qua Route Handler, không dùng Server Actions. Danh sách endpoint mới theo AD-11; `PATCH /api/orders/:id` giữ nguyên contract.
- AD-12: `catalog-service` nhận `availability` qua tham số (mặc định `Product.stock`). Page hiển thị tồn kho dùng `force-dynamic`. `/products/[slug]` bỏ `generateStaticParams`. `/api/products` trả Tồn khả dụng.
- AD-13: `attempt-limiter.ts` duy nhất, đếm trong bộ nhớ theo Mã đơn và theo IP.
- AD-14: Chạy một process Node ≥ 22.12. `storage/` đã được gitignore. Thiếu `SESSION_SECRET` hoặc `STAFF_ACCOUNTS` thì login từ chối và ghi log. README liệt kê biến môi trường.
- Chuyển dữ liệu: đơn cũ không có `history`; lần chạy đầu tạo `inventory.json` từ `Product.stock` với `migratedAt`.

### UX Design Requirements

- UX-DR1: `OrderStatusBadge` thêm `failed` (`bg-rose-50 text-rose-700 ring-rose-200`). `cancelled` vẫn màu xám.
- UX-DR2: Tách `Field` và `inputClass` từ `checkout-form.tsx` ra `components/ui` để dùng chung; checkout không đổi giao diện.
- UX-DR3: Staff header cao 56px gồm logo, chữ "Nhân viên", tên hiển thị (ẩn dưới `sm`), nút ghost `sm` "Đăng xuất" (icon `LogOut`). Không có giỏ hàng hay nav của khách. Giữ footer.
- UX-DR4: Filter chip cao 36px, bo tròn hẳn, một chip được chọn tại một thời điểm, mặc định "Chờ xác nhận", có số đếm, lưu vào `?status=`. Chip cuộn ngang dưới `md`.
- UX-DR5: Ô tìm Mã đơn (icon `Search`): dưới `md` nằm trên hàng chip; từ `md` nằm bên phải, rộng 300px, cùng dòng với chip.
- UX-DR6: Thẻ đơn trong Hàng đợi có 3 dòng (Mã đơn `tabular-nums` + badge + "Sắp quá hạn" amber; tên + SĐT; giờ, số sản phẩm, icon phương thức thanh toán, tổng tiền). Dưới 390px viết tắt "SP". Một cột ở dưới `md`, lưới 2 cột từ `md`.
- UX-DR7: Action bar sticky ở đáy (dưới `md`), nút `lg`, padding dưới cộng `env(safe-area-inset-bottom)`; thêm `viewport-fit=cover`. Từ `md`, nút `md` nằm ở dòng tiêu đề theo thứ tự In phiếu (ghost), nút phụ, primary.
- UX-DR8: Bảng nút theo trạng thái (EXPERIENCE State Patterns). "Giao thất bại" và "Hủy đơn" dùng `secondary`; "Đã giao" xác nhận tại chỗ theo mẫu `CancelOrderButton`; đơn kết thúc thì ẩn action bar.
- UX-DR9: Bottom sheet hoặc dialog chọn Lý do: `OptionCard` với Lý do có sẵn (Giao thất bại: 3; Hủy: "Hết hàng", "Không liên lạc được khách", "Khách yêu cầu hủy") và "Khác" (≤ 200 ký tự). Nút danger bị khóa khi chưa có Lý do. Đóng bằng Esc, chạm scrim hoặc "Không". Giữ focus trong sheet và trả focus lại khi đóng. Từ `md` hiển thị thành dialog rộng 448px.
- UX-DR10: Timeline `<ol>` với `aria-current="step"`. Chấm 12px: đã qua màu indigo, hiện tại có viền indigo, chưa tới màu slate-300, `failed` màu rose kèm `alert-error` Lý do, `cancelled` màu slate-500. Dưới `md` dạng dọc, từ `md` dạng ngang. Bước sau điểm dừng bị ẩn.
- UX-DR11: Masked field: SĐT đã che màu slate-500, icon `Lock`, nhãn cho trình đọc màn hình "Số điện thoại đã được ẩn".
- UX-DR12: Form xác minh SĐT (`inputMode="tel"`, `autoComplete="tel"`, nút secondary "Xem đầy đủ"; dưới 390px là "Xem"). Hiện số lần còn lại khi ≤ 2.
- UX-DR13: Form Tra cứu đơn ở `/orders`: Mã đơn tự viết hoa và bỏ khoảng trắng. Lỗi dùng chung một câu "Không tìm thấy đơn với mã và số điện thoại này."
- UX-DR14: Ghi chú nội bộ: textarea, bộ đếm n/500, nút "Lưu ghi chú", hiển thị mới nhất trên cùng, không sửa hay xóa được.
- UX-DR15: Trạng thái màn hình: skeleton 4 thẻ `animate-pulse`; `EmptyState` (✅ "Không còn đơn chờ xác nhận" / 📦); 409 hiện `alert-error` rồi tải lại; 401 chuyển tới `/staff/login?next=`; banner amber "Sắp quá hạn, tự hủy lúc HH:mm".
- UX-DR16: Hàng đợi tự tải lại khi tab được focus, có nút ghost "Làm mới" (`RefreshCw`); không cập nhật lạc quan; lỗi không tự biến mất.
- UX-DR17: Câu chữ theo bảng Voice & Tone (nhãn nút là động từ, lỗi viết bằng lời thường, khách thấy "Cửa hàng").
- UX-DR18: Vùng chạm ≥ 44px; `Tab` theo thứ tự đọc; trên màn trong của máy gập không đặt nút vắt qua bản lề; gập hoặc mở không mất trạng thái (CSS breakpoint thuần).
- UX-DR19: Phiếu in `/staff/orders/[id]/print` dùng `@media print`: ẩn header, footer và nút; khổ A5 dọc.
- UX-DR20: Cờ chuyển khoản: checkbox kèm ô "Mã giao dịch (không bắt buộc)" và nút "Lưu"; thẻ trong Hàng đợi có nhãn emerald "Đã nhận CK".

### FR Coverage Map

**Baseline (test hồi quy):** BL-1, BL-3, BL-6, BL-10 → Epic 3 · BL-2, BL-7, BL-8 → Epic 2 (tương thích dữ liệu) · BL-4, BL-5, BL-9 → Epic 1

- FR-1: Epic 1 - Nhân viên đăng nhập
- FR-2: Epic 1 - Bảo vệ /staff và API nhân viên
- FR-3: Epic 1 - Khóa danh sách tất cả đơn
- FR-4: Epic 1 - /orders chỉ hiện đơn của thiết bị
- FR-5: Epic 1 - Thiết bị đã đặt được xác minh tự động
- FR-6: Epic 1 - Ẩn dữ liệu cá nhân khi chưa xác minh
- FR-7: Epic 1 - Giới hạn số lần tra sai
- FR-8: Epic 1 - Khách tự hủy phải được xác minh
- FR-9: Epic 1 (Danh sách đơn chỉ xem) → Epic 2 (Hàng đợi: nhãn Sắp quá hạn, hoạt động đầy đủ)
- FR-10: Epic 1 (xem chi tiết) → Epic 2 (nút thao tác, Ghi chú nội bộ)
- FR-11: Epic 2 - Sơ đồ chuyển trạng thái
- FR-12: Epic 2 - Xác nhận đơn
- FR-13: Epic 2 - Bắt đầu giao
- FR-14: Epic 2 (trạng thái, deliveredAt) → Epic 3 (trừ Tồn thực)
- FR-15: Epic 2 (trạng thái, Lý do) → Epic 3 (nhả hàng)
- FR-16: Epic 2 (trạng thái, Lý do) → Epic 3 (nhả hàng)
- FR-17: Epic 2 (tự hủy quá hạn) → Epic 3 (đơn quá hạn không tính vào hàng đang giữ)
- FR-18: Epic 2 - Chống thao tác chồng nhau
- FR-19: Epic 2 - Khởi tạo inventory.json và migratedAt
- FR-20: Epic 3 - Giữ hàng khi đặt
- FR-21: Epic 3 - Nhả hàng
- FR-22: Epic 3 - Tồn kho không âm
- FR-23: Epic 3 - Hiển thị Tồn khả dụng
- FR-24: Epic 2 - Ghi Sự kiện trạng thái (applyTransition)
- FR-25: Epic 2 - Nhân viên xem lịch sử
- FR-26: Epic 2 (lịch sử suy ra, hạn tính từ migratedAt) → Epic 3 (đơn pending cũ không giữ hàng)
- FR-27: Epic 2 - Timeline cho khách
- FR-28: Epic 2 - Không lộ Ghi chú nội bộ
- FR-29: Epic 2 - Thông điệp sau đặt hàng
- FR-30: Epic 4 - Xác nhận nhiều đơn
- FR-31: Epic 4 - In phiếu giao hàng
- FR-32: Epic 4 - Cờ đã nhận tiền chuyển khoản
- FR-33: Epic 1 - Tìm đơn theo Mã đơn

## Epic List

### Epic 1: Khóa dữ liệu khách & cửa vào cho nhân viên
Khách chỉ xem được đơn của mình (bằng thiết bị đã đặt hoặc Mã đơn + SĐT); người lạ không còn thấy dữ liệu cá nhân. Nhân viên đăng nhập bằng tài khoản riêng, xem Danh sách đơn và chi tiết đơn, tìm theo Mã đơn. Ở epic này các màn nhân viên chỉ để xem.
**FRs covered:** FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, FR-8, FR-9 (xem), FR-10 (xem), FR-33 · BL-4, BL-5, BL-9

### Epic 2: Nhân viên xử lý vòng đời đơn & khách theo dõi tiến trình
Nhân viên xác nhận đơn, bắt đầu giao, đánh dấu Đã giao hoặc Giao thất bại, hủy đơn kèm Lý do, ghi chú nội bộ. Thao tác chồng nhau bị chặn, mọi bước đều có lịch sử. Đơn quá hạn tự hủy. Khách thấy Timeline và Lý do. Story đầu tiên tạo `inventory.json` cùng `migratedAt`.
**FRs covered:** FR-9 (Hàng đợi), FR-10 (thao tác), FR-11, FR-12, FR-13, FR-14 (trạng thái), FR-15 (trạng thái), FR-16 (trạng thái), FR-17, FR-18, FR-19, FR-24, FR-25, FR-26 (lịch sử, hạn), FR-27, FR-28, FR-29 · BL-2, BL-7, BL-8

### Epic 3: Giữ hàng – không bán vượt kho
Hàng được giữ ngay khi khách đặt. Đơn bị hủy, quá hạn hoặc giao thất bại thì nhả hàng; đơn đã giao thì trừ Tồn thực. Catalog, trang sản phẩm và giỏ hàng hiện Tồn khả dụng. Hai khách tranh món cuối thì chỉ một người đặt được.
**FRs covered:** FR-14 (tồn), FR-15 (tồn), FR-16 (tồn), FR-17 (tồn), FR-20, FR-21, FR-22, FR-23, FR-26 (pending cũ) · BL-1, BL-3, BL-6, BL-10

### Epic 4: Tiện ích vận hành (Should)
Nhân viên xác nhận nhiều đơn cùng lúc, in phiếu giao hàng, đánh dấu đã nhận tiền chuyển khoản.
**FRs covered:** FR-30, FR-31, FR-32

## Epic 1: Khóa dữ liệu khách & cửa vào cho nhân viên

Khách chỉ xem được đơn của mình (bằng thiết bị đã đặt hoặc Mã đơn + SĐT); người lạ không còn thấy dữ liệu cá nhân. Nhân viên đăng nhập bằng tài khoản riêng, xem Danh sách đơn và chi tiết đơn, tìm theo Mã đơn. Ở epic này các màn nhân viên chỉ để xem.

### Story 1.1: Xác thực nhân viên qua API

Là nhân viên cửa hàng,
tôi muốn đăng nhập bằng tài khoản riêng của mình,
để mọi thao tác sau này đều gắn với đúng người đã làm.

**Yêu cầu:** FR-1, FR-2 (phần API), NFR1, NFR8 · **AD liên quan:** AD-1, AD-9, AD-10, AD-11, AD-14

**Acceptance Criteria:**

**Given** `STAFF_ACCOUNTS` chứa tài khoản `lan` với `passwordHash` băm bằng scrypt, và `SESSION_SECRET` đã được đặt
**When** gọi `POST /api/staff/login` với `{ "username": "lan", "password": "<đúng>" }`
**Then** trả 200 và đặt cookie `sl_staff` có `HttpOnly`, `SameSite=Lax`, hết hạn sau 12 giờ (`Secure` khi `NODE_ENV=production`)
**And** giá trị cookie được ký HMAC-SHA256; sửa một ký tự bất kỳ trong cookie thì `requireStaff()` ném `AccessError("UNAUTHENTICATED")`

**Given** sai mật khẩu, hoặc tên đăng nhập không tồn tại
**When** gọi `POST /api/staff/login`
**Then** trả 401 với `code: "UNAUTHENTICATED"`, thông báo "Tên đăng nhập hoặc mật khẩu không đúng" giống nhau cho cả hai trường hợp, và không đặt cookie
**And** so khớp dùng `timingSafeEqual`; log không chứa mật khẩu

**Given** body thiếu trường hoặc không phải JSON
**When** gọi `POST /api/staff/login`
**Then** trả 400 `VALIDATION_ERROR` qua Zod schema, theo định dạng BL-5

**Given** `SESSION_SECRET` hoặc `STAFF_ACCOUNTS` bị thiếu, hoặc `STAFF_ACCOUNTS` không phải JSON hợp lệ
**When** gọi `POST /api/staff/login`
**Then** trả 401 cho mọi lần thử, và ghi một dòng `console.error` nêu tên biến bị thiếu (không in giá trị)
**And** trong code không có giá trị mặc định nào được viết cứng cho bí mật

**Given** cookie `sl_staff` đã quá 12 giờ
**When** một handler gọi `requireStaff()`
**Then** ném `AccessError("UNAUTHENTICATED")`, và `handleRouteError` chuyển thành 401 đúng định dạng BL-5

**Given** nhân viên đang có phiên
**When** gọi `POST /api/staff/logout`
**Then** cookie `sl_staff` bị xóa (`Max-Age=0`) và trả 204

**And** `handleRouteError` xử lý cả `OrderError` lẫn `AccessError` (401/403/429). Các mã của `OrderError` giữ nguyên HTTP status (BL-5), có test hồi quy.
**And** có script `npm run staff:hash` để in hash scrypt của một mật khẩu. README có thêm `SESSION_SECRET`, `STAFF_ACCOUNTS` vào bảng biến môi trường, kèm ràng buộc chạy một instance (AD-14).

### Story 1.2: Trang đăng nhập và khung trang nhân viên

Là nhân viên cửa hàng,
tôi muốn có trang đăng nhập và một khu vực `/staff` riêng,
để làm việc mà không lẫn với giao diện của khách.

**Yêu cầu:** FR-1, FR-2 · UX-DR2, UX-DR3, UX-DR18 · **AD liên quan:** AD-9, AD-11

**Acceptance Criteria:**

**Given** chưa có phiên
**When** mở `/staff` hoặc bất kỳ trang `/staff/**` nào (trừ `/staff/login`)
**Then** `src/proxy.ts` chuyển về `/staff/login?next=<đường dẫn gốc>`
**And** page dưới `/staff` vẫn tự gọi `requireStaff()`; nếu cookie hỏng hoặc hết hạn, page tự chuyển hướng dù proxy đã cho qua

**Given** đang ở `/staff/login`
**When** nhập đúng thông tin và bấm "Đăng nhập"
**Then** chuyển tới `next` nếu `next` là đường dẫn nội bộ bắt đầu bằng `/staff`; ngược lại chuyển về `/staff`

**Given** `next=https://evil.example` hoặc `next=//evil.example`
**When** đăng nhập thành công
**Then** vẫn chuyển về `/staff`, không đi ra ngoài trang (chặn open redirect)

**Given** sai mật khẩu
**When** bấm "Đăng nhập"
**Then** hiện `role="alert"` (`bg-rose-50 text-rose-700`) với câu "Tên đăng nhập hoặc mật khẩu không đúng", giữ tên đăng nhập, xóa ô mật khẩu
**And** nút bị khóa và hiện "Đang đăng nhập…" trong lúc chờ phản hồi

**Given** đã đăng nhập
**When** mở bất kỳ trang `/staff/**` nào
**Then** thấy staff header cao 56px gồm logo, chữ "Nhân viên", tên hiển thị (ẩn dưới `sm`) và nút ghost "Đăng xuất" (icon `LogOut`); không có giỏ hàng hay nav của khách; footer giữ nguyên
**And** bấm "Đăng xuất" thì gọi API logout rồi chuyển về `/staff/login`

**And** `Field` và `inputClass` được tách từ `checkout-form.tsx` ra `src/components/ui`. Trang checkout không đổi giao diện; test checkout hiện có vẫn qua.
**And** ô mật khẩu có `autoComplete="current-password"`; mọi vùng chạm ≥ 44px; dùng được hoàn toàn bằng bàn phím.

### Story 1.3: Khóa danh sách đơn và Danh sách đơn cho nhân viên

Là nhân viên cửa hàng,
tôi muốn xem danh sách đơn sau khi đăng nhập, lọc theo trạng thái và tìm theo mã,
để biết có những đơn nào mà không phải mở trang dành cho khách.

**Yêu cầu:** FR-3 (API), FR-9 (chỉ xem), FR-33 · UX-DR4, UX-DR5, UX-DR6, UX-DR15 · NFR4 · **AD liên quan:** AD-9, AD-10, AD-11

**Acceptance Criteria:**

**Given** không có phiên nhân viên
**When** gọi `GET /api/orders`
**Then** trả 401 `UNAUTHENTICATED`, phản hồi không chứa đơn nào
**And** `POST /api/orders` vẫn tạo đơn như cũ (201), có test hồi quy

**Given** có phiên nhân viên
**When** gọi `GET /api/orders` hoặc `GET /api/staff/orders?status=pending`
**Then** trả danh sách đơn đầy đủ theo bộ lọc. Riêng `status=pending` xếp cũ nhất trước; không lọc thì mới nhất trước (giữ hành vi cũ)
**And** `status` ngoài tập hợp lệ trả 400 `VALIDATION_ERROR`

**Given** đã đăng nhập và mở `/staff`
**When** trang tải xong
**Then** tiêu đề là "Danh sách đơn"; chip "Chờ xác nhận" được chọn mặc định; mỗi chip (Chờ xác nhận, Đã xác nhận, Đang giao, Đã kết thúc) có số đếm; chip đổi `?status=`
**And** mỗi thẻ có 3 dòng: Mã đơn (`tabular-nums`) + badge; tên + SĐT; giờ đặt, số sản phẩm, icon phương thức thanh toán, tổng tiền. Một cột ở dưới `md`, lưới 2 cột từ `md`. Dưới 390px viết tắt "SP".
**And** thẻ chỉ để mở chi tiết; trang không có nút thay đổi trạng thái

**Given** không có đơn nào ở bộ lọc đang chọn
**When** trang tải xong
**Then** hiện `EmptyState` ✅ "Không còn đơn chờ xác nhận" (với chip Chờ xác nhận) hoặc 📦 "Không có đơn nào ở trạng thái này"

**Given** nhập `4f9a2c ` (chữ thường, có khoảng trắng) vào ô tìm
**When** bấm `Enter`
**Then** nếu đúng một đơn khớp 6 ký tự cuối thì chuyển thẳng tới `/staff/orders/<id>`; nhiều đơn khớp thì liệt kê chúng kèm nút "Xóa tìm kiếm"; không đơn nào khớp thì hiện "Không có đơn nào có mã này" dưới ô
**And** nhập đủ mã `SL-…` thì khớp chính xác; ô tìm rỗng thì không gửi

**And** có test với 1.000 đơn trong repository in-memory: lọc và đếm xong dưới 1 giây (NFR4).

### Story 1.4: Xem chi tiết đơn cho nhân viên

Là nhân viên cửa hàng,
tôi muốn mở một đơn để xem đầy đủ người nhận, sản phẩm và thanh toán,
để gọi xác nhận với khách mà không cần nguồn nào khác.

**Yêu cầu:** FR-10 (phần xem) · UX-DR1, UX-DR17 · **AD liên quan:** AD-8, AD-9

**Acceptance Criteria:**

**Given** đã đăng nhập
**When** mở `/staff/orders/<id>` của một đơn có tồn tại
**Then** thấy Mã đơn, badge trạng thái, người nhận (tên, SĐT rõ, email, địa chỉ, ghi chú của khách), sản phẩm, tạm tính, phí giao, tổng tiền, phương thức giao và thanh toán
**And** có link "← Danh sách đơn" quay lại `/staff` và giữ nguyên `?status=` trước đó

**Given** Mã đơn không tồn tại
**When** mở `/staff/orders/<id>`
**Then** hiện trang 404 hiện có (`notFound()`)

**Given** chưa đăng nhập, hoặc cookie đã hết hạn
**When** mở trực tiếp `/staff/orders/<id>`
**Then** chuyển về `/staff/login?next=…`, không có dữ liệu đơn nào được render

**Given** đơn được tạo trước khi nâng cấp (không có `history` hay `notes`)
**When** mở chi tiết
**Then** trang hiển thị bình thường, không lỗi runtime

**And** trang ở epic này **không** có nút thay đổi trạng thái.
**And** story này thêm `failed` vào `ORDER_STATUSES` và `ORDER_STATUS_LABELS` ("Giao thất bại"), và `OrderStatusBadge` có màu `bg-rose-50 text-rose-700 ring-rose-200` cho `failed`; `cancelled` vẫn màu xám. Chưa có luồng nào tạo ra `failed`. Có test component cho cả 6 trạng thái.

### Story 1.5: Che dữ liệu cá nhân trên trang đơn của khách

Là khách mua hàng,
tôi muốn người lạ có link đơn của tôi cũng không xem được tên, SĐT, địa chỉ,
còn tôi, trên trình duyệt đã đặt, vẫn thấy đầy đủ ngay sau khi đặt.

**Yêu cầu:** FR-5, FR-6 (che dữ liệu), FR-28 (nền tảng) · UX-DR11 · BL-9 · **AD liên quan:** AD-7, AD-8, AD-9

**Acceptance Criteria:**

**Given** khách vừa đặt đơn thành công qua `POST /api/orders`
**When** phản hồi 201 trả về
**Then** có `Set-Cookie: sl_orders` (ký HMAC, `HttpOnly`) chứa Mã đơn mới. Thân phản hồi là kết quả của `toCustomerOrderView(order, { verified: true })`.
**And** `/orders/<id>?placed=1` hiện đầy đủ thông tin và ô "Đặt hàng thành công!" như hiện nay, không hỏi SĐT

**Given** cookie `sl_orders` đã có 20 mã
**When** đặt đơn thứ 21
**Then** cookie giữ 20 mã gần nhất, mã cũ nhất bị bỏ

**Given** một trình duyệt khác (không có cookie) mở `/orders/<id>` hoặc gọi `GET /api/orders/<id>`
**When** trang hoặc phản hồi được trả về
**Then** HTML và JSON đều **không** chứa giá trị rõ của `fullName`, `phone`, `email`, `address`, `note`; chỉ có SĐT đã che `09****678` kèm icon `Lock` và nhãn cho trình đọc màn hình "Số điện thoại đã được ẩn"
**And** vẫn thấy Mã đơn, trạng thái, sản phẩm, tổng tiền

**Given** cookie `sl_orders` bị sửa
**When** mở `/orders/<id>`
**Then** cookie được coi như không tồn tại (chưa xác minh), không có lỗi 500

**Given** đơn `bank_transfer` ở trạng thái `pending` và người xem đã xác minh
**When** mở trang đơn
**Then** vẫn thấy hướng dẫn chuyển khoản như hiện nay (BL-9)

**And** `toCustomerOrderView` là hàm thuần trong `features/orders/customer-view.ts`, có unit test: SĐT `+84912345678` và `0912345678` che ra cùng một kết quả; khi `verified=false` thì không có field cá nhân nào; hàm dựng một đối tượng **mới** theo danh sách field được phép (whitelist) thay vì copy rồi xóa bớt, nên mọi field thêm vào `Order` về sau mặc định không lọt ra trang khách.
**And** không page hay handler nào cho khách trả nguyên đối tượng `Order`; test route kiểm tra điều này.

### Story 1.6: Xác minh bằng SĐT và giới hạn tra sai

Là khách mua hàng,
tôi muốn nhập SĐT đặt hàng để xem đầy đủ đơn của mình trên một thiết bị khác,
và yên tâm rằng không ai dò được SĐT của tôi bằng cách thử liên tục.

**Yêu cầu:** FR-6 (xác minh), FR-7 · UX-DR12 · **AD liên quan:** AD-9, AD-10, AD-11, AD-13

**Acceptance Criteria:**

**Given** đang xem `/orders/<id>` khi chưa xác minh
**When** nhập đúng SĐT đặt hàng (dạng `0912 345 678` hoặc `+84912345678`) rồi bấm "Xem đầy đủ"
**Then** `POST /api/orders/<id>/verify` trả 200 và thêm Mã đơn vào `sl_orders`; trang hiện đầy đủ thông tin mà không cần tải lại thủ công

**Given** nhập sai SĐT
**When** gửi
**Then** lỗi hiện ngay dưới ô (không xóa ô); từ khi chỉ còn ≤ 2 lần thử thì hiện thêm "Còn N lần thử"

**Given** đã sai 5 lần trong 15 phút cho cùng một Mã đơn
**When** gửi lần thứ 6, kể cả với SĐT đúng
**Then** trả 429 `TOO_MANY_ATTEMPTS` "Bạn đã thử quá nhiều lần, vui lòng thử lại sau 15 phút"; form bị khóa và hiện giờ có thể thử lại

**Given** một nguồn yêu cầu (cùng IP) đã sai 20 lần trên nhiều Mã đơn khác nhau trong 15 phút
**When** thử thêm một Mã đơn khác
**Then** trả 429, dù Mã đơn này chưa sai lần nào

**Given** Mã đơn không tồn tại
**When** gọi verify
**Then** trả cùng phản hồi lỗi như sai SĐT (không để lộ việc mã có tồn tại hay không) và vẫn tính vào giới hạn theo IP

**Given** trình duyệt đã đặt đơn đó (đã có trong `sl_orders`), hoặc đang có phiên nhân viên
**When** truy cập đơn
**Then** không bị giới hạn chặn

**And** ô SĐT có `inputMode="tel"`, `autoComplete="tel"`; dưới 390px nút rút thành "Xem".
**And** `attempt-limiter.ts` là module duy nhất đếm số lần sai, nhận `now` qua tham số, có unit test cho mốc 15 phút (chưa đủ 15 phút vẫn khóa, quá 15 phút thì mở).

### Story 1.7: "Đơn hàng của bạn" và Tra cứu đơn

Là khách mua hàng,
tôi muốn trang Đơn hàng chỉ hiện đơn của tôi và có chỗ tra cứu đơn đặt từ máy khác,
để không thấy đơn của người khác, và người khác cũng không thấy đơn của tôi.

**Yêu cầu:** FR-3 (giao diện), FR-4 · UX-DR13 · **AD liên quan:** AD-8, AD-9

**Acceptance Criteria:**

**Given** trình duyệt A đặt đơn X, trình duyệt B đặt đơn Y
**When** mỗi trình duyệt mở `/orders`
**Then** A chỉ thấy X, B chỉ thấy Y; trang không còn gọi `listOrders()` cho tất cả đơn
**And** mỗi dòng giữ giao diện hiện có (ảnh sản phẩm, Mã đơn, badge, thời gian, số sản phẩm, tổng tiền)

**Given** trình duyệt chưa có đơn nào (hoặc đã xóa cookie)
**When** mở `/orders`
**Then** thấy `EmptyState` hiện có "Bạn chưa có đơn hàng nào" và form "Tra cứu đơn" ngay bên dưới

**Given** cookie chứa một Mã đơn đã không còn trong `orders.json`
**When** mở `/orders`
**Then** mã đó bị bỏ qua, không lỗi

**Given** nhập Mã đơn `sl-20261121-4f9a2c` (chữ thường, có khoảng trắng) cùng SĐT đúng vào form Tra cứu
**When** bấm "Tra cứu"
**Then** Mã đơn được viết hoa và bỏ khoảng trắng, việc xác minh dùng chung endpoint và giới hạn của Story 1.6, rồi chuyển tới `/orders/<id>` ở trạng thái đã xác minh

**Given** Mã đơn hoặc SĐT sai
**When** tra cứu
**Then** hiện cùng một câu "Không tìm thấy đơn với mã và số điện thoại này." cho cả hai trường hợp

### Story 1.8: Khách tự hủy đơn phải được xác minh

Là khách mua hàng,
tôi muốn chỉ tôi mới hủy được đơn của mình,
để không ai biết Mã đơn mà phá được đơn của tôi.

**Yêu cầu:** FR-8 · BL-4, BL-5 · **AD liên quan:** AD-5 (giữ `cancelOrder`), AD-9, AD-10, AD-11

**Acceptance Criteria:**

**Given** người gọi chưa xác minh đơn `pending`
**When** gọi `PATCH /api/orders/<id>` với `{ "status": "cancelled" }`
**Then** trả 403 `FORBIDDEN`, đơn không đổi

**Given** người gọi đã xác minh và đơn đang `pending`
**When** gọi PATCH hủy
**Then** đơn chuyển sang `cancelled`, phản hồi là kết quả của `toCustomerOrderView`

**Given** người gọi đã xác minh nhưng đơn ở `confirmed` (hoặc bất kỳ trạng thái nào khác `pending`)
**When** gọi PATCH hủy
**Then** trả 409 `INVALID_STATUS_TRANSITION` với thông báo "Chỉ có thể hủy đơn hàng đang ở trạng thái Chờ xác nhận" (BL-4, không đổi)

**Given** body khác `{ "status": "cancelled" }`
**When** gọi PATCH
**Then** trả 400 `VALIDATION_ERROR` như hiện nay (contract giữ nguyên)

**Given** đang xem trang đơn
**When** đơn ở `pending` **và** người xem đã xác minh
**Then** mới hiện nút "Hủy đơn hàng" (`CancelOrderButton`); thiếu một trong hai điều kiện thì không hiện nút

**And** test hồi quy của `order-service.test.ts` về `cancelOrder` vẫn qua.

## Epic 2: Nhân viên xử lý vòng đời đơn & khách theo dõi tiến trình

Nhân viên xác nhận đơn, bắt đầu giao, đánh dấu Đã giao hoặc Giao thất bại, hủy đơn kèm Lý do, ghi chú nội bộ. Thao tác chồng nhau bị chặn, mọi bước đều có lịch sử. Đơn quá hạn tự hủy. Khách thấy Timeline và Lý do. Ở epic này chưa có giữ hàng: tự hủy hay giao thất bại chỉ đổi trạng thái.

### Story 2.1: Khởi tạo mốc tồn kho và thời điểm nâng cấp

Là chủ cửa hàng,
tôi muốn tồn thực được lưu ra file thay vì nằm cứng trong code, và hệ thống ghi nhớ thời điểm nâng cấp,
để số liệu tồn kho không mất khi khởi động lại và đơn cũ được tính hạn công bằng.

**Yêu cầu:** FR-19 · NFR10 · **AD liên quan:** AD-1, AD-2, AD-4, AD-14

**Acceptance Criteria:**

**Given** chưa có `storage/inventory.json`
**When** `inventoryService` được gọi lần đầu
**Then** file được tạo với `migratedAt = now` và mỗi sản phẩm trong `products.ts` có mốc `{ onHand: Product.stock, asOf: now }`
**And** ghi atomic (`.tmp` rồi `rename`), giống adapter của orders

**Given** file đã có, rồi một sản phẩm mới được thêm vào `products.ts`
**When** service đọc mốc
**Then** sản phẩm mới được bổ sung mốc từ `stock` của nó; mốc của các sản phẩm cũ và `migratedAt` không đổi

**Given** máy chủ khởi động lại
**When** đọc lại mốc
**Then** giá trị y hệt trước khi khởi động lại; `migratedAt` không bao giờ bị ghi đè

**Given** `inventory.json` hỏng (không phải JSON)
**When** service đọc
**Then** ném lỗi và ghi `console.error`; **không** tự ghi đè file (tránh mất dữ liệu)

**And** đường dẫn file lấy từ `INVENTORY_FILE`, mặc định `storage/inventory.json`; README có thêm biến này.
**And** có adapter in-memory cho test. Chỉ `inventory-repository.ts` dùng `node:fs` (AD-2).

### Story 2.2: Sơ đồ trạng thái và lịch sử sự kiện

Là chủ cửa hàng,
tôi muốn mọi thay đổi trạng thái đơn đều đi theo quy tắc cố định và để lại dấu vết ai làm, khi nào,
để khi có khiếu nại luôn trả lời được "ai đã làm gì với đơn này".

**Yêu cầu:** FR-11, FR-24, FR-26 (lịch sử suy ra) · BL-2, BL-7, BL-8 · **AD liên quan:** AD-3, AD-5, AD-7

**Acceptance Criteria:**

**Given** `features/orders/types.ts`
**When** mở rộng kiểu dữ liệu
**Then** có `Actor`, `StatusEvent`, `InternalNote` (`failed` đã có từ Story 1.4), và các field optional `history?`, `notes?`, `deliveredAt?`, `payment?`; không field cũ nào bị xóa hay đổi tên

**Given** hàm thuần `applyTransition(order, to, actor, reason, now)`
**When** gọi với mỗi cặp (từ, sang) trong bảng FR-11
**Then** trả về `Order` mới với `status = to`, thêm đúng **một** `StatusEvent`, cập nhật `updatedAt`, và đặt `deliveredAt` khi sang `delivered`
**And** mọi cặp **không** có trong bảng (ví dụ `pending → delivered`, `delivered → cancelled`, đi lùi, đi từ trạng thái kết thúc) ném `OrderError("INVALID_STATUS_TRANSITION")`; có test dạng bảng cho đủ 6 × 6 cặp
**And** sang `cancelled`/`failed` mà thiếu Lý do (rỗng hoặc chỉ có khoảng trắng) thì ném `VALIDATION_ERROR`

**Given** khách đặt đơn mới
**When** `placeOrder` thành công
**Then** `history` có một sự kiện `{ from: null, to: "pending", actor: { kind: "customer" } }`
**And** giá vẫn được server tính lại (BL-1), phí giao đúng BL-2, Mã đơn đúng BL-7; test cũ vẫn qua

**Given** khách đã xác minh hủy đơn `pending`
**When** `cancelOrder` chạy
**Then** đi qua `applyTransition` với actor `customer` và Lý do "Khách tự hủy"; thông báo lỗi của BL-4 giữ nguyên

**Given** đơn cũ không có `history`
**When** đọc đơn
**Then** lịch sử suy ra gồm "Đã đặt" tại `createdAt`, cộng thêm trạng thái hiện tại tại `updatedAt` nếu khác `pending`; dữ liệu trên đĩa không bị ghi lại chỉ vì một lần đọc (BL-8)

**And** `src/lib/store-lock.ts` có `withStoreLock`; `placeOrder` và `cancelOrder` chạy trọn bên trong khóa và đọc dữ liệu mới nhất bên trong khóa. Có test: hai `cancelOrder` chạy đồng thời thì chỉ một lần thành công, và chỉ có một sự kiện.

### Story 2.3: API chuyển trạng thái cho nhân viên

Là nhân viên cửa hàng,
tôi muốn hệ thống chấp nhận các bước xác nhận, giao, đã giao, giao thất bại, hủy kèm Lý do, và chặn khi đồng nghiệp đã thao tác trước,
để không có đơn nào bị xử lý hai lần hay sai bước.

**Yêu cầu:** FR-12 → FR-16 (trạng thái), FR-18 · NFR1, NFR2, NFR9 · **AD liên quan:** AD-3, AD-5, AD-9, AD-10, AD-11

**Acceptance Criteria:**

**Given** có phiên của `lan` và đơn đang `pending`
**When** gọi `POST /api/staff/orders/<id>/transitions` với `{ "to": "confirmed" }`
**Then** trả 200 cùng đơn đầy đủ; `history` có sự kiện `actor: { kind: "staff", username: "lan" }`

**Given** đơn `shipping`
**When** gọi với `{ "to": "failed", "reason": "Khách từ chối nhận" }`
**Then** đơn sang `failed` và Lý do được lưu trong sự kiện

**Given** đơn `confirmed`
**When** gọi `{ "to": "cancelled" }` mà không có `reason`
**Then** trả 400 `VALIDATION_ERROR`, đơn không đổi

**Given** đơn `shipping`
**When** gọi `{ "to": "cancelled", "reason": "Hết hàng" }`
**Then** trả 409 `INVALID_STATUS_TRANSITION`

**Given** `huy` đã xác nhận đơn X lúc 08:11
**When** `lan` gửi `{ "to": "confirmed" }` cho đơn X lúc 08:12
**Then** trả 409; `details` có `currentStatus: "confirmed"`, `lastActor: "huy"`, `at: "<ISO>"`; lịch sử chỉ có **một** sự kiện xác nhận

**Given** hai yêu cầu xác nhận cùng một đơn được gửi đồng thời
**When** cả hai chạy
**Then** đúng một yêu cầu thành công (test bằng `Promise.all`)

**Given** không có phiên, hoặc phiên hết hạn
**When** gọi endpoint
**Then** trả 401 `UNAUTHENTICATED`, đơn không đổi

**Given** `to` không thuộc tập trạng thái, `reason` dài hơn 200 ký tự, hoặc Mã đơn không tồn tại
**When** gọi
**Then** lần lượt trả 400 / 400 / 404, đúng định dạng BL-5

### Story 2.4: Hàng đợi có nút xác nhận, bắt đầu giao, đã giao

Là nhân viên cửa hàng,
tôi muốn xác nhận đơn, bắt đầu giao và đánh dấu đã giao ngay trên điện thoại,
để xử lý xong Hàng đợi mà không cần quay lại Zalo.

**Yêu cầu:** FR-9, FR-10 (thao tác), FR-12, FR-13, FR-14 (trạng thái) · UX-DR7, UX-DR8, UX-DR15, UX-DR16, UX-DR18 · NFR5 · **AD liên quan:** AD-5, AD-11

**Acceptance Criteria:**

**Given** đã đăng nhập
**When** mở `/staff`
**Then** tiêu đề là "Hàng đợi"; có nút ghost "Làm mới" (`RefreshCw`); danh sách tự tải lại khi tab được focus lại; không có realtime hay polling

**Given** mở chi tiết một đơn `pending` trên màn hình < `md`
**When** trang tải xong
**Then** có action bar sticky ở đáy với nút primary `lg` "Xác nhận đơn"; padding dưới cộng `env(safe-area-inset-bottom)`; layout có `viewport-fit=cover`
**And** từ `md` trở lên không có action bar; nút cỡ `md` nằm ở dòng tiêu đề

**Given** đơn `pending`
**When** bấm "Xác nhận đơn"
**Then** nút bị khóa và hiện "Đang xử lý…"; khi thành công thì badge đổi sang "Đã xác nhận", `role="status"` báo "Đã xác nhận đơn SL-…", và action bar chuyển sang "Bắt đầu giao"
**And** tính từ thẻ trong Hàng đợi, xác nhận một đơn mất đúng 2 thao tác (mở đơn → Xác nhận)

**Given** đơn `shipping`
**When** bấm "Đã giao"
**Then** hiện ô xác nhận tại chỗ "Xác nhận đã giao đơn này?" (theo mẫu `CancelOrderButton`); chỉ khi bấm "Xác nhận" mới gọi API

**Given** API trả 409
**When** đang ở chi tiết đơn
**Then** hiện `role="alert"` "Đơn đã được {hành động} bởi {tên} lúc {giờ}." rồi tải lại trạng thái; action bar cập nhật theo trạng thái mới; lỗi không tự biến mất

**Given** API trả 401
**When** bấm thao tác
**Then** chuyển tới `/staff/login?next=<trang hiện tại>` kèm câu "Phiên đăng nhập đã hết, vui lòng đăng nhập lại."; thao tác không được tự gửi lại

**Given** đơn ở `delivered`, `failed` hoặc `cancelled`
**When** mở chi tiết
**Then** không có action bar hay nút thao tác, chỉ có badge và dòng "Đơn đã kết thúc"

**And** giao diện không cập nhật lạc quan; mọi nút dùng được bằng bàn phím; vùng chạm ≥ 44px; trên màn trong của máy gập không có nút nằm vắt qua bản lề.

### Story 2.5: Hủy đơn và Giao thất bại kèm Lý do

Là nhân viên cửa hàng,
tôi muốn chọn nhanh một Lý do khi hủy đơn hay giao thất bại,
để khách thấy được lý do và đồng nghiệp không phải hỏi lại.

**Yêu cầu:** FR-15, FR-16 (trạng thái) · UX-DR8, UX-DR9, UX-DR17 · NFR5 · **AD liên quan:** AD-5, AD-11

**Acceptance Criteria:**

**Given** đơn `pending` hoặc `confirmed`
**When** bấm "Hủy đơn" (nút `secondary`)
**Then** mở bottom sheet (dưới `md`) hoặc dialog rộng 448px (từ `md`), gồm các `OptionCard` "Hết hàng", "Không liên lạc được khách", "Khách yêu cầu hủy", "Khác…"

**Given** đơn `shipping`
**When** bấm "Giao thất bại" (nút `secondary`)
**Then** sheet có các Lý do "Khách không nhận máy", "Khách từ chối nhận", "Sai địa chỉ", "Khác…"

**Given** sheet đang mở mà chưa chọn Lý do, hoặc đã chọn "Khác…" nhưng ô nhập còn trống
**When** nhìn nút danger xác nhận
**Then** nút bị khóa; ô "Khác" giới hạn 200 ký tự

**Given** sheet đang mở
**When** bấm `Esc`, chạm scrim, hoặc bấm "Không"
**Then** sheet đóng, không gửi gì; focus quay lại nút đã mở sheet

**Given** đã chọn "Khách từ chối nhận"
**When** bấm "Xác nhận giao thất bại"
**Then** sheet đóng; badge chuyển sang rose "Giao thất bại"; hiện lời nhắc `role="status"` "Hãy gọi cho khách và ghi chú kết quả."

**Given** gập hoặc mở máy gập khi sheet đang mở
**When** layout chuyển giữa sheet và dialog
**Then** sheet vẫn mở và lựa chọn vẫn giữ nguyên

**And** khi mở sheet, focus chuyển vào tiêu đề và bị giữ trong sheet; tiêu đề sheet có `aria-labelledby` đúng.

### Story 2.6: Tự hủy đơn quá hạn xác nhận

Là chủ cửa hàng,
tôi muốn đơn không được xác nhận trong N giờ tự hủy kèm lý do rõ ràng,
để không đơn nào nằm mãi ở "Chờ xác nhận".

**Yêu cầu:** FR-17 (trạng thái), FR-9 (nhãn Sắp quá hạn), FR-26 (hạn của đơn cũ) · UX-DR15 · **AD liên quan:** AD-3, AD-5, AD-6

**Acceptance Criteria:**

**Given** `ORDER_PENDING_TTL_HOURS` để trống
**When** tính hạn
**Then** dùng mặc định 24; giá trị không phải số dương thì báo lỗi cấu hình khi khởi động service

**Given** đơn `pending` tạo lúc 09:00 ngày 20/11, TTL = 24
**When** đọc đơn lúc 09:01 ngày 21/11 (danh sách, chi tiết, trang khách)
**Then** `effectiveStatus` trả `cancelled` với Lý do "Quá hạn xác nhận", actor "Hệ thống"; đơn không còn nằm ở chip "Chờ xác nhận"

**Given** đơn quá hạn chưa được ghi bù
**When** có một thao tác ghi chạm tới đơn đó (nhân viên bấm Xác nhận, hoặc khách hủy)
**Then** trong `withStoreLock`, đơn được ghi bù thành `cancelled` qua `applyTransition` với thời điểm sự kiện = 09:00 ngày 21/11 (hạn chót, không phải lúc phát hiện); thao tác của người dùng nhận 409 "Đơn đã tự hủy do Quá hạn xác nhận lúc {giờ}."

**Given** đơn tạo **trước** `migratedAt` và không có `history`
**When** tính hạn
**Then** mốc bắt đầu là `max(createdAt, migratedAt)`; đơn cũ không bị hủy hàng loạt ngay khi nâng cấp

**Given** đơn `pending` còn dưới 2 giờ trước hạn
**When** xem Hàng đợi và chi tiết đơn
**Then** thẻ có nhãn amber "Sắp quá hạn"; trang chi tiết có banner "Sắp quá hạn, tự hủy lúc HH:mm"

**And** `effectiveStatus` là hàm thuần nhận `now`, `ttlHours`, `migratedAt`; có test cho các mốc: đúng hạn chót, trước hạn 1 ms, sau hạn 1 ms, đơn cũ.

### Story 2.7: Lịch sử và Ghi chú nội bộ cho nhân viên

Là nhân viên cửa hàng,
tôi muốn xem đầy đủ lịch sử một đơn và ghi lại kết quả cuộc gọi,
để đồng nghiệp ca sau biết chuyện gì đã xảy ra.

**Yêu cầu:** FR-10 (ghi chú), FR-25 · UX-DR14 · **AD liên quan:** AD-3, AD-7, AD-11

**Acceptance Criteria:**

**Given** mở chi tiết đơn
**When** trang tải xong
**Then** thẻ "Lịch sử trạng thái" liệt kê sự kiện theo thời gian tăng dần, mỗi dòng gồm `dd/MM HH:mm`, người thao tác (tên hiển thị của nhân viên, "Khách", "Hệ thống" kèm icon `Clock`, hoặc "Không rõ" với đơn cũ), bước chuyển, Lý do

**Given** nhập "Đã gọi 14:05, khách đổi ý"
**When** bấm "Lưu ghi chú"
**Then** `POST /api/staff/orders/<id>/notes` lưu ghi chú qua `appendNote` trong `withStoreLock`, với `author` là **username**; ghi chú mới hiện ở đầu danh sách, kèm tên hiển thị và giờ

**Given** ghi chú rỗng (sau khi bỏ khoảng trắng) hoặc dài hơn 500 ký tự
**When** lưu
**Then** trả 400 `VALIDATION_ERROR`; bộ đếm "n/500" chuyển sang màu lỗi khi vượt giới hạn

**Given** đã có ghi chú
**When** tìm cách sửa hoặc xóa
**Then** giao diện không có thao tác đó và không có endpoint nào cho việc đó

**Given** ghi chú được thêm vào đơn ở **mọi** trạng thái, kể cả trạng thái kết thúc
**When** lưu
**Then** thành công; `status` và `history` không đổi

**And** lời nhắc sau khi hủy hoặc giao thất bại (Story 2.5) có thêm nút "Thêm ghi chú", bấm vào thì cuộn tới và focus ô ghi chú.

### Story 2.8: Timeline và Lý do trên trang đơn của khách

Là khách mua hàng,
tôi muốn thấy đơn của mình đang ở bước nào và nếu bị hủy thì vì sao,
để không phải gọi điện hỏi cửa hàng.

**Yêu cầu:** FR-27, FR-28, FR-29 · UX-DR10, UX-DR17 · NFR5 · **AD liên quan:** AD-6, AD-8

**Acceptance Criteria:**

**Given** đơn `shipping`
**When** mở `/orders/<id>`, kể cả khi chưa xác minh
**Then** thấy thẻ "Tiến trình đơn": `<ol>` gồm Đã đặt ✓, Đã xác nhận ✓ (kèm giờ, "Cửa hàng"), Đang giao (bước hiện tại, `aria-current="step"`, chấm có viền indigo), Đã giao (màu slate-300)
**And** dưới `md` Timeline dạng dọc, từ `md` dạng ngang

**Given** đơn `failed` với Lý do "Khách từ chối nhận"
**When** xem Timeline
**Then** dừng ở chấm rose "Giao thất bại", Lý do nằm trong ô `alert-error`; bước "Đã giao" bị ẩn, không hiện mờ

**Given** đơn bị Hệ thống tự hủy
**When** xem Timeline
**Then** dừng ở chấm slate-500 "Đã hủy" với Lý do "Quá hạn xác nhận"

**Given** đơn có Ghi chú nội bộ chứa chuỗi đánh dấu `NOTE-MARKER-123`
**When** gọi `GET /api/orders/<id>` hoặc tải `/orders/<id>`, dù đã xác minh hay chưa
**Then** phản hồi không chứa chuỗi đó; actor là nhân viên hiện "Cửa hàng", không bao giờ hiện username

**Given** vừa đặt xong (`?placed=1`, đơn `pending`)
**When** trang tải
**Then** ô emerald có thêm câu "Đơn sẽ tự hủy nếu cửa hàng chưa xác nhận trong {N} giờ.", với N lấy từ cấu hình chứ không viết cứng; với `placed=1` mà đơn không còn `pending` thì ô không hiện

**Given** đơn cũ không có `history`
**When** xem Timeline
**Then** hiện các sự kiện suy ra (FR-26), không lỗi

## Epic 3: Giữ hàng – không bán vượt kho

Hàng được giữ ngay khi khách đặt. Đơn bị hủy, quá hạn hoặc giao thất bại thì nhả hàng; đơn đã giao thì trừ Tồn thực. Catalog, trang sản phẩm và giỏ hàng hiện Tồn khả dụng. Hai khách tranh món cuối thì chỉ một người đặt được.

### Story 3.1: Tính Tồn thực, Hàng đang giữ và Tồn khả dụng

Là chủ cửa hàng,
tôi muốn hệ thống luôn biết chính xác còn bao nhiêu hàng có thể bán,
để số liệu tồn kho đúng mà không phải cập nhật tay sau mỗi đơn.

**Yêu cầu:** FR-14, FR-15, FR-16, FR-17, FR-21, FR-22 (hiệu ứng tồn kho), FR-26 (đơn `pending` cũ) · **AD liên quan:** AD-4, AD-6, AD-12

**Acceptance Criteria:**

**Given** hàm thuần `computeStock(baselines, orders, now, ttlHours, migratedAt)` trong `features/inventory/compute-stock.ts`
**When** gọi
**Then** trả về theo từng sản phẩm `{ onHand, reserved, available }`, trong đó `onHand = baseline.onHand − Σ số lượng các đơn có deliveredAt > asOf`, `reserved = Σ số lượng các đơn có effectiveStatus ∈ {pending, confirmed, shipping}`, và `available = onHand − reserved`
**And** hàm không đọc file, không gọi `Date.now()`

**Given** mốc của loa = 5 và một đơn 2 chiếc
**When** đơn lần lượt ở `pending` → `confirmed` → `shipping` → `delivered`
**Then** `available` lần lượt là 3 → 3 → 3 → 3; `onHand` là 5 → 5 → 5 → 3

**Given** cùng đơn đó
**When** đơn kết thúc ở `cancelled` (khách, nhân viên hoặc hệ thống hủy) hoặc ở `failed`
**Then** `reserved` về 0, `available` = 5, `onHand` = 5

**Given** một đơn `pending` đã quá hạn nhưng chưa được ghi bù
**When** tính tồn
**Then** đơn đó **không** được tính vào `reserved` (AD-6)

**Given** đơn `pending` tạo trước `migratedAt` (đơn cũ, không có `history`)
**When** tính tồn
**Then** đơn đó không được tính vào `reserved` (FR-26)

**Given** đơn `delivered` có `deliveredAt` ≤ `asOf` của mốc
**When** tính `onHand`
**Then** không bị trừ lần nữa (đơn đã giao trước khi đặt mốc)

**Given** dữ liệu khiến `available` < 0 (ví dụ có người sửa mốc tay)
**When** tính tồn
**Then** hàm trả đúng giá trị âm để phía gọi phát hiện, không âm thầm làm tròn về 0; phía gọi coi đây là hết hàng

**And** `inventoryService.getAvailability(now)` trả `ReadonlyMap<productId, number>` dựa trên `computeStock`, chỉ đọc nên không lấy khóa.
**And** có test bất biến dạng property: một chuỗi ngẫu nhiên các thao tác đặt, hủy, giao, giao thất bại và quá hạn không bao giờ làm `onHand` < 0, và luôn giữ `available = onHand − reserved`.

### Story 3.2: Giữ hàng khi đặt, hai khách tranh món cuối

Là khách mua hàng,
tôi muốn đặt được hàng nghĩa là hàng thật sự được giữ cho tôi,
để không bị cửa hàng gọi lại báo hết hàng sau khi đã đặt.

**Yêu cầu:** FR-20, FR-22 · BL-1, BL-3, BL-6 · NFR2 · **AD liên quan:** AD-3, AD-4

**Acceptance Criteria:**

**Given** `available` của loa = 1
**When** hai yêu cầu `POST /api/orders` đặt 1 loa được gửi đồng thời (`Promise.all`)
**Then** đúng một đơn được tạo (201); yêu cầu còn lại nhận 409 `INSUFFICIENT_STOCK` với câu "Sản phẩm "Loa Bluetooth BeatBox Mini" đã hết hàng" (BL-6)

**Given** `available` của tai nghe = 3
**When** đặt 5 chiếc
**Then** 409 với câu "chỉ còn 3 sản phẩm", không tạo đơn

**Given** đơn gồm loa (còn đủ) và tai nghe (thiếu)
**When** đặt
**Then** không đơn nào được tạo và `orders.json` không đổi

**Given** kiểm tra `placeOrder`
**When** chạy
**Then** thứ tự giữ nguyên: validate Zod (BL-3) → tìm sản phẩm (`PRODUCT_NOT_FOUND`) → tính lại giá (BL-1) → **trong `withStoreLock`**: đọc đơn mới nhất và mốc tồn → `computeStock` → kiểm tra `available` → lưu
**And** luồng đặt hàng **không** ghi `inventory.json` (AD-4)

**Given** khách hủy đơn vừa đặt
**When** đặt lại cùng số lượng
**Then** thành công, vì hàng đã được nhả

**And** test cũ của `order-service.test.ts` về giá, phí giao, gộp dòng trùng và mã lỗi vẫn qua.

### Story 3.3: Hiển thị Tồn khả dụng trên catalog, trang sản phẩm và giỏ hàng

Là khách mua hàng,
tôi muốn chữ "còn hàng" hay "hết hàng" trên trang phản ánh đúng thực tế,
để không cho vào giỏ một món đã có người giữ.

**Yêu cầu:** FR-23 · BL-10 · **AD liên quan:** AD-12

**Acceptance Criteria:**

**Given** `catalog-service`
**When** gọi `getStockStatus`, bộ lọc `inStock`, hoặc hàm tìm kiếm
**Then** các hàm nhận thêm `availability: ReadonlyMap<productId, number>`, mặc định là `Product.stock`; test catalog cũ vẫn qua mà không cần sửa
**And** `catalog-service` không import `orders`, `inventory` hay `node:fs`

**Given** loa đang có `available` = 0 vì một đơn đang giữ
**When** mở `/products`, `/products/<slug>`, trang chủ, hoặc gọi `GET /api/products?inStock=true`
**Then** loa hiện nhãn "Hết hàng", không có trong kết quả lọc "còn hàng", nút thêm vào giỏ bị khóa

**Given** `available` = 4 (≤ `LOW_STOCK_THRESHOLD` = 5)
**When** mở trang sản phẩm
**Then** hiện trạng thái sắp hết hàng như hiện có, tính theo `available`

**Given** khách hủy đơn đang giữ loa
**When** tải lại trang sản phẩm
**Then** hiện lại "còn 1" ngay, không phải build lại

**Given** `/products/[slug]`
**When** kiểm tra code
**Then** đã bỏ `generateStaticParams`; mọi page hiển thị tồn kho có `export const dynamic = "force-dynamic"`

**Given** thêm sản phẩm vào giỏ
**When** `cart-reducer` nhận `stock`
**Then** `stock` là `available` tại thời điểm thêm; vẫn giới hạn tối đa 10 mỗi sản phẩm (BL-10); giỏ lưu từ trước với số lượng lớn hơn `available` vẫn bị server từ chối khi đặt (Story 3.2)

**And** `GET /api/products/:slug` trả `stock` = `available`; các field khác của API giữ nguyên.

### Story 3.4: Bộ test kịch bản vận hành đầu–cuối

Là chủ cửa hàng,
tôi muốn có bộ test tự động chạy lại đúng các tình huống dễ hỏng nhất,
để mỗi lần sửa code không làm vỡ lại những gì đã chạy đúng.

**Yêu cầu:** NFR6, Should-24 của brief · UJ-1 → UJ-4 · **AD liên quan:** AD-2, AD-14

**Acceptance Criteria:**

**Given** Playwright chạy với `ORDERS_FILE` và `INVENTORY_FILE` trỏ vào thư mục tạm, cùng `STAFF_ACCOUNTS`/`SESSION_SECRET` dùng cho test
**When** chạy `npm run test:e2e`
**Then** không đụng tới `storage/` thật, và mỗi test dọn dẹp dữ liệu của chính nó

**Given** kịch bản UJ-1
**When** nhân viên đăng nhập, mở Hàng đợi, xác nhận một đơn
**Then** đơn rời chip "Chờ xác nhận"; lịch sử có tên nhân viên

**Given** kịch bản UJ-2
**When** đặt đơn ở context A, mở link đơn ở context B
**Then** B không thấy dữ liệu cá nhân; nhập đúng SĐT thì thấy đầy đủ; nhập sai 5 lần thì bị khóa

**Given** kịch bản UJ-3
**When** hai context cùng đặt món cuối
**Then** đúng một đơn thành công; trang sản phẩm hiện "Hết hàng"; hủy đơn đó thì sản phẩm hiện lại "còn 1"

**Given** kịch bản UJ-4
**When** nhân viên chuyển đơn `shipping` sang Giao thất bại với Lý do "Khách từ chối nhận" và thêm ghi chú
**Then** trang khách hiện Timeline dừng ở "Giao thất bại" kèm Lý do, không hiện ghi chú

**Given** kịch bản lỗi
**When** gọi API nhân viên mà không có phiên, và hai nhân viên cùng xác nhận một đơn
**Then** lần lượt nhận 401 và 409

**And** `e2e/shopping-flow.spec.ts` hiện có vẫn qua (đặt hàng của khách không bị ảnh hưởng).

## Epic 4: Tiện ích vận hành (Should)

Nhân viên xác nhận nhiều đơn cùng lúc, in phiếu giao hàng, đánh dấu đã nhận tiền chuyển khoản. Epic này làm nếu kịp và không chặn việc phát hành.

### Story 4.1: Xác nhận nhiều đơn cùng lúc

Là nhân viên cửa hàng,
tôi muốn chọn nhiều đơn đã gọi xác nhận xong rồi xác nhận một lần,
để không phải mở từng đơn khi buổi sáng có nhiều đơn.

**Yêu cầu:** FR-30 · UX-DR7 · NFR5 · **AD liên quan:** AD-3, AD-5, AD-9, AD-11

**Acceptance Criteria:**

**Given** đang ở chip "Chờ xác nhận" của Hàng đợi
**When** bấm "Chọn"
**Then** mỗi thẻ có checkbox; dưới `md` thì action bar đáy hiện "Xác nhận N đơn" (N cập nhật theo số đơn đã chọn); nút bị khóa khi N = 0; chip khác "Chờ xác nhận" thì không có nút "Chọn"

**Given** chọn 6 đơn, trong đó 1 đơn vừa quá hạn và 1 đơn vừa được đồng nghiệp xác nhận
**When** bấm "Xác nhận 6 đơn"
**Then** `POST /api/staff/orders/transitions` xử lý cả lô trong **một** lần `withStoreLock`, gọi `applyTransition` riêng cho từng đơn; 4 đơn thành công, 2 đơn thất bại mà không chặn các đơn còn lại
**And** `role="status"` báo "Đã xác nhận 4/6 đơn. 1 đơn đã quá hạn. 1 đơn đã được xác nhận bởi Huy."

**Given** danh sách Mã đơn trong body rỗng, có mã trùng, hoặc nhiều hơn 50 mã
**When** gọi API
**Then** lần lượt: rỗng thì 400; mã trùng được gộp lại; quá 50 thì 400 `VALIDATION_ERROR`

**Given** không có phiên
**When** gọi API
**Then** trả 401, không đơn nào thay đổi

**And** phản hồi gồm `{ succeeded: [id], failed: [{ id, code, message }] }`; mỗi đơn thành công có đúng một `StatusEvent` mang tên nhân viên đã thao tác.

### Story 4.2: In phiếu giao hàng

Là nhân viên cửa hàng,
tôi muốn in phiếu cho đơn sắp giao,
để shipper có đủ thông tin người nhận và số tiền cần thu.

**Yêu cầu:** FR-31 · UX-DR19 · **AD liên quan:** AD-8, AD-9

**Acceptance Criteria:**

**Given** đơn `confirmed` hoặc `shipping`
**When** bấm "In phiếu" (ghost, icon `Printer`) ở chi tiết đơn
**Then** mở `/staff/orders/<id>/print` gồm Mã đơn, người nhận, SĐT, địa chỉ, danh sách sản phẩm, ghi chú của khách, và dòng thanh toán

**Given** đơn COD
**When** xem phiếu
**Then** in "Số tiền cần thu: {total}" theo `formatCurrency`

**Given** đơn `bank_transfer`
**When** xem phiếu
**Then** in "Chuyển khoản", không có dòng số tiền cần thu

**Given** đơn có Ghi chú nội bộ
**When** xem phiếu
**Then** phiếu **không** chứa ghi chú nội bộ

**Given** đơn ở trạng thái khác `confirmed`/`shipping`
**When** mở trang chi tiết, hoặc truy cập thẳng URL `/print`
**Then** không có nút "In phiếu"; URL trả 404

**Given** chưa đăng nhập
**When** mở URL `/print`
**Then** chuyển về `/staff/login?next=…`

**And** `@media print` ẩn header, footer và nút; khổ A5 dọc; dùng chức năng in của trình duyệt (`window.print()`), không thêm thư viện.

### Story 4.3: Cờ "Đã nhận tiền chuyển khoản"

Là nhân viên cửa hàng,
tôi muốn đánh dấu đơn chuyển khoản đã nhận tiền, kèm mã giao dịch,
để không giao hàng cho đơn chưa thanh toán mà không ai hay biết.

**Yêu cầu:** FR-32 · UX-DR20 · NFR9 · **AD liên quan:** AD-3, AD-7, AD-8, AD-11

**Acceptance Criteria:**

**Given** đơn `bank_transfer`
**When** xem chi tiết
**Then** có checkbox "Đã nhận tiền chuyển khoản", ô "Mã giao dịch (không bắt buộc)" và nút "Lưu"; đơn COD không có khối này

**Given** tick checkbox, nhập `FT2611210001`
**When** bấm "Lưu"
**Then** `PUT /api/staff/orders/<id>/payment` lưu `payment: { received: true, ref }` trong `withStoreLock`, và thêm một Ghi chú nội bộ "Đã nhận tiền CK, mã FT2611210001" với `author` là username
**And** thẻ trong Hàng đợi có nhãn emerald "Đã nhận CK"

**Given** bỏ tick
**When** lưu
**Then** `received: false`, thêm một ghi chú "Bỏ đánh dấu đã nhận tiền"; nhãn biến mất

**Given** gọi API cho đơn COD
**When** gửi
**Then** trả 400 `VALIDATION_ERROR` "Chỉ đơn chuyển khoản mới có cờ này", đơn không đổi

**Given** mã giao dịch dài hơn 50 ký tự
**When** lưu
**Then** 400 `VALIDATION_ERROR`

**Given** cờ đang tắt
**When** nhân viên bấm "Bắt đầu giao"
**Then** vẫn chuyển trạng thái được (cờ không chặn bước chuyển nào)

**And** trang khách (`toCustomerOrderView`) không trả `payment.ref`; hệ thống không bao giờ tự đặt cờ (không có code nào gán `received: true` ngoài endpoint này).
