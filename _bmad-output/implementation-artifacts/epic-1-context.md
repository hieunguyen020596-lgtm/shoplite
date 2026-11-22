# Epic 1 Context: Khóa dữ liệu khách & cửa vào cho nhân viên

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

ShopLite hiện không có đăng nhập. Ai có link cũng xem được mọi đơn kèm dữ liệu cá nhân của khách. Epic này đóng lỗ hổng đó. Khách chỉ thấy đơn của mình: trình duyệt đã đặt đơn được xác minh tự động, còn thiết bị khác phải nhập Mã đơn + SĐT. Người lạ chỉ thấy trạng thái, sản phẩm, tổng tiền và SĐT đã che. Cùng lúc, nhân viên có tài khoản riêng, khu vực `/staff` riêng, Danh sách đơn có lọc và tìm theo Mã đơn, và trang chi tiết đơn. Ở epic này các màn nhân viên **chỉ để xem**, chưa có nút đổi trạng thái. Đây là nền cho Epic 2: lịch sử trạng thái chỉ có ý nghĩa khi biết đúng ai đã thao tác. Mục tiêu đo được: không có yêu cầu nào (không phiên nhân viên, không xác minh) nhận được dữ liệu cá nhân, kiểm bằng test cho từng bề mặt `/orders`, `/orders/[id]`, `GET /api/orders`, `GET /api/orders/:id`.

## Stories

- Story 1.1: Xác thực nhân viên qua API
- Story 1.2: Trang đăng nhập và khung trang nhân viên
- Story 1.3: Khóa danh sách đơn và Danh sách đơn cho nhân viên
- Story 1.4: Xem chi tiết đơn cho nhân viên
- Story 1.5: Che dữ liệu cá nhân trên trang đơn của khách
- Story 1.6: Xác minh bằng SĐT và giới hạn tra sai
- Story 1.7: "Đơn hàng của bạn" và Tra cứu đơn
- Story 1.8: Khách tự hủy đơn phải được xác minh

## Requirements & Constraints

- **Đăng nhập nhân viên:** dùng tài khoản riêng tại `/staff/login`. Sai tên đăng nhập hay sai mật khẩu đều trả cùng một câu "Tên đăng nhập hoặc mật khẩu không đúng". Mật khẩu không lưu dạng rõ. Phiên hết hạn sau 12 giờ, có nút Đăng xuất.
- **Bảo vệ khu vực nhân viên:** `/staff/**` (trừ trang login) và API nhân viên đòi phiên hợp lệ. Trang thì chuyển về `/staff/login?next=…`, API thì trả 401 `UNAUTHENTICATED`. `next` chỉ được nhận đường dẫn nội bộ bắt đầu bằng `/staff`, để chặn open redirect.
- **Danh sách tất cả đơn:** `GET /api/orders` chỉ dành cho nhân viên. `POST /api/orders` vẫn mở và giữ nguyên hành vi.
- **`/orders` của khách:** chỉ liệt kê đơn mà thiết bị đã đặt hoặc đã xác minh, kèm form Tra cứu đơn (Mã đơn + SĐT). Mã đơn không còn tồn tại thì bỏ qua, không báo lỗi.
- **Khi chưa xác minh:** HTML và JSON không được chứa họ tên, SĐT rõ, email, địa chỉ hay ghi chú; chỉ có SĐT đã che. Nhập đúng SĐT thì được xác minh. SĐT được chuẩn hóa `+84…` thành `0…` trước khi so khớp.
- **Giới hạn tra sai:** cùng một Mã đơn sai 5 lần trong 15 phút thì khóa 15 phút, trả 429 `TOO_MANY_ATTEMPTS`. Mỗi IP bị giới hạn 20 lần sai trong 15 phút trên mọi mã. Mã không tồn tại trả đúng phản hồi như sai SĐT. Thiết bị đã đặt và nhân viên không bị giới hạn.
- **Khách tự hủy:** chưa xác minh thì trả 403 `FORBIDDEN`. Vẫn chỉ hủy được đơn `pending`; trạng thái khác trả 409 `INVALID_STATUS_TRANSITION` với thông báo hiện có. Contract `PATCH /api/orders/:id` giữ nguyên.
- **Hành vi cũ phải giữ (có test hồi quy):** định dạng lỗi `{ error: { code, message, details? } }` với HTTP status cũ của các mã hiện có; đơn `bank_transfer` ở `pending` vẫn hiện hướng dẫn chuyển khoản cho người đã xác minh.
- **Hiệu năng:** lọc và đếm 1.000 đơn xong dưới 1 giây.
- **Bảo mật và riêng tư:** cookie `HttpOnly`, `SameSite=Lax`, `Secure` khi production. Mọi quyền được kiểm ở server. Bí mật chỉ nằm trong biến môi trường, không có giá trị mặc định viết cứng. Log không chứa SĐT, địa chỉ, mật khẩu hay cookie.
- **Chất lượng và phạm vi:** `npm run check` phải qua. Không dùng dịch vụ ngoài, không thêm database, không thêm dependency. README ghi các biến môi trường mới và ràng buộc chỉ chạy một instance.

## Technical Decisions

- **Cấu trúc theo feature:** thêm feature mới `src/features/auth` (`staff-accounts.ts`, `session.ts`, `guards.ts`, `attempt-limiter.ts`, `access-errors.ts`) và mở rộng `features/orders`. Service tạo bằng factory `create<X>Service(deps)`, nhận `repository`, `now` và config qua tham số. Biến môi trường chỉ được đọc trong `server.ts` của feature. Route handler và page chỉ gọi service hoặc guard.
- **Hai cookie ký HMAC-SHA256 bằng `SESSION_SECRET`, dùng `node:crypto`:**
  - `sl_staff = { username, exp }`, hết hạn sau 12 giờ.
  - `sl_orders` chứa danh sách Mã đơn đã xác minh, giữ tối đa 20 mã mới nhất.
  - Cookie bị sửa thì coi như không tồn tại, không trả 500. Không tạo thêm cookie nào khác.
- **Tài khoản nhân viên:** `STAFF_ACCOUNTS` là JSON `[{ username, displayName, passwordHash }]`, băm bằng scrypt, so khớp bằng `timingSafeEqual`. Có script `npm run staff:hash`. Thiếu `SESSION_SECRET` hoặc `STAFF_ACCOUNTS`, hoặc `STAFF_ACCOUNTS` sai JSON, thì từ chối mọi lần đăng nhập và `console.error` nêu tên biến bị thiếu (không in giá trị).
- **Guard ở DAL:** mọi handler và page có dữ liệu được bảo vệ phải tự gọi `requireStaff()` (trả `Actor`, hoặc ném `AccessError("UNAUTHENTICATED")`) hoặc `canViewOrder(orderId, phone?)`. `src/proxy.ts` chỉ redirect lạc quan khi thiếu cookie, không thay cho guard.
- **Lỗi:** `AccessError` gồm `UNAUTHENTICATED` 401, `FORBIDDEN` 403, `TOO_MANY_ATTEMPTS` 429, cùng shape và getter `httpStatus` với `OrderError`. `handleRouteError` trong `src/lib/http.ts` xử lý cả hai loại; lỗi khác trả 500 `INTERNAL_ERROR`.
- **Hàm chiếu cho khách:** mọi bề mặt của khách (`/orders`, `/orders/[id]`, `GET /api/orders/:id`, phản hồi `POST`/`PATCH /api/orders`) chỉ trả kết quả của hàm thuần `toCustomerOrderView(order, { verified }, now)` trong `features/orders/customer-view.ts`.
  - Hàm dựng đối tượng **mới** theo whitelist field, không copy rồi xóa bớt.
  - Hàm luôn bỏ `notes` và `payment.ref`.
  - Khi `verified=false`, hàm bỏ `fullName`, `email`, `address`, `note` và che SĐT theo dạng `09****678`.
  - Chỉ `/staff/**` và `/api/staff/**` được trả nguyên `Order`.
- **Đếm tra sai:** `features/auth/attempt-limiter.ts` là module duy nhất làm việc này. Nó dùng hai `Map` trong bộ nhớ, một theo Mã đơn và một theo IP (lấy từ `x-forwarded-for` hoặc địa chỉ socket), và nhận `now` qua tham số. Khởi động lại thì bộ đếm reset; chấp nhận được vì chỉ chạy một instance.
- **Endpoint:**
  - `POST /api/staff/login`, `POST /api/staff/logout` (trả 204, `Max-Age=0`)
  - `GET /api/staff/orders?status=&q=`
  - `POST /api/orders/:id/verify` `{ phone }`

  Input được validate bằng Zod (`*-schema.ts`), lỗi đổi qua `toFieldErrors`. Mọi thao tác ghi đi qua Route Handler, gọi từ client bằng `fetch` theo mẫu `CancelOrderButton`. **Không dùng Server Actions.**

- **Kiểu dữ liệu chỉ được mở rộng thêm:** Story 1.4 thêm `failed` vào `ORDER_STATUSES` và `ORDER_STATUS_LABELS` ("Giao thất bại"). Đơn cũ không có `history` hay `notes` vẫn phải render được.
- **Mã đơn:** dạng `SL-YYYYMMDD-XXXXXX`. Tìm theo mã đầy đủ (khớp chính xác) hoặc 6 ký tự cuối, không phân biệt hoa thường, bỏ khoảng trắng.
- **Thứ tự danh sách:** `status=pending` xếp cũ nhất trước; không lọc thì mới nhất trước (giữ hành vi cũ). `status` ngoài tập hợp lệ trả 400.
- **Test:** hàm thuần có unit test cạnh file. Service test bằng repository in-memory và `now` cố định. Route test theo mẫu `route.test.ts` hiện có, kiểm rằng không route nào của khách trả nguyên `Order`.

## UX & Interaction Patterns

- **Staff header:** cao 56px, gồm logo, chữ "Nhân viên", tên hiển thị (ẩn dưới `sm`) và nút ghost "Đăng xuất" (icon `LogOut`). Không có giỏ hàng hay nav của khách. Footer giữ nguyên. Phía khách không có link nào dẫn sang `/staff`.
- **Login:**
  - Sai thông tin thì hiện `role="alert"` (`bg-rose-50 text-rose-700`), giữ tên đăng nhập, xóa mật khẩu.
  - Nút bị khóa và hiện "Đang đăng nhập…" khi chờ phản hồi.
  - Ô mật khẩu có `autoComplete="current-password"`.
  - Tách `Field` và `inputClass` từ `checkout-form.tsx` ra `src/components/ui`; giao diện checkout không đổi.
- **Danh sách đơn (`/staff`):**
  - Tiêu đề "Danh sách đơn".
  - Filter chip cao 36px, bo tròn hẳn: Chờ xác nhận (mặc định), Đã xác nhận, Đang giao, Đã kết thúc. Mỗi chip có số đếm và lưu vào `?status=`. Dưới `md` chip cuộn ngang.
  - Ô tìm có icon `Search`, placeholder "Tìm mã đơn (VD: 4F9A2C)". Dưới `md` ô nằm trên hàng chip; từ `md` nằm bên phải, rộng 300px.
  - Thẻ đơn có 3 dòng: Mã đơn `tabular-nums` + badge; tên + SĐT; giờ, số sản phẩm, icon phương thức thanh toán, tổng tiền. Dưới 390px viết tắt "SP". Một cột dưới `md`, lưới 2 cột từ `md`.
  - Tìm khớp nhiều đơn thì danh sách kết quả thay chỗ danh sách đơn, kèm nút "Xóa tìm kiếm".
  - Trạng thái màn hình: skeleton 4 thẻ `animate-pulse`. Danh sách trống thì hiện `EmptyState` ✅ "Không còn đơn chờ xác nhận" với chip Chờ xác nhận, hoặc 📦 "Không có đơn nào ở trạng thái này" với chip khác.
- **Chi tiết đơn (nhân viên):** link "← Danh sách đơn" giữ nguyên `?status=` trước đó. Mã không tồn tại thì dùng `notFound()`. Badge `failed` dùng `bg-rose-50 text-rose-700 ring-rose-200`; `cancelled` giữ màu xám.
- **Trang đơn của khách khi chưa xác minh:**
  - Khối Người nhận chỉ có SĐT đã che, màu slate-500, icon `Lock`, nhãn cho trình đọc màn hình "Số điện thoại đã được ẩn".
  - Form xác minh: ô SĐT `inputMode="tel"`, `autoComplete="tel"`, nút secondary "Xem đầy đủ" (dưới 390px là "Xem").
  - Sai SĐT thì báo lỗi ngay dưới ô, không xóa ô. Khi còn ≤ 2 lần thử thì hiện "Còn N lần thử".
  - Bị 429 thì khóa form và hiện giờ có thể thử lại.
  - Xác minh thành công thì hiện đầy đủ thông tin mà không cần tải lại thủ công.
  - Không có nút Hủy. Nút "Hủy đơn hàng" chỉ hiện khi đơn `pending` **và** người xem đã xác minh.
- **`/orders`:** giữ `EmptyState` "Bạn chưa có đơn hàng nào", với form Tra cứu đơn ngay bên dưới. Ô Mã đơn tự viết hoa và bỏ khoảng trắng. Mọi lỗi tra cứu dùng chung một câu "Không tìm thấy đơn với mã và số điện thoại này." Vừa đặt xong (`?placed=1`) thì giữ ô emerald "Đặt hàng thành công!" và không hỏi SĐT.
- **Câu chữ:** nói với khách thì xưng "bạn", lịch sự và ngắn. Lỗi viết bằng lời thường, không hiện mã kỹ thuật.
- **Tiếp cận:** kết quả thao tác dùng `role="status"`, lỗi dùng `role="alert"`, và lỗi không tự biến mất. Vùng chạm ≥ 44px. Dùng được hoàn toàn bằng bàn phím, `Tab` theo thứ tự đọc. Thiết kế từ 390px, mức sàn 360px.

## Cross-Story Dependencies

- **Trong epic:**
  - Story 1.1 (session, guard, `AccessError`, `handleRouteError`) là nền cho mọi story còn lại.
  - Story 1.2 cần 1.1. Stories 1.3 và 1.4 cần 1.1 và 1.2.
  - Story 1.5 (`toCustomerOrderView`, cookie `sl_orders`) là nền cho 1.6, 1.7 và 1.8.
  - Story 1.7 dùng lại endpoint verify và giới hạn tra sai của 1.6.
  - Story 1.8 dùng trạng thái xác minh từ 1.5 và 1.6.
- **Với Epic 2:**
  - Danh sách đơn và Chi tiết đơn sẽ được nâng thành Hàng đợi có nút thao tác, nhãn "Sắp quá hạn" và Ghi chú nội bộ.
  - Trạng thái `failed` thêm ở 1.4 được Epic 2 dùng để tạo luồng thật.
  - `cancelOrder` phải được giữ nguyên để Epic 2 chuyển sang `applyTransition`.
  - `toCustomerOrderView` sẽ được mở rộng cho Timeline: đổi actor nhân viên thành "Cửa hàng" và luôn bỏ `notes`.
