---
name: ShopLite
status: final
sources:
  - _bmad-output/planning-artifacts/prds/prd-project_ai-2026-11-21/prd.md
  - _bmad-output/planning-artifacts/prds/prd-project_ai-2026-11-21/addendum.md
created: 2026-11-21
updated: 2026-11-21
---

# ShopLite: Experience Spine (vận hành đơn hàng)

## Foundation

ShopLite là web responsive viết bằng Next.js 16 App Router và Tailwind CSS v4, không dùng thư viện UI. Các component nội bộ nằm trong `src/components/ui` và `src/features/*/components`. Thiết kế bắt đầu từ **390px**. Phần nhìn nằm ở `DESIGN.md`; file này chỉ mô tả hành vi.

Sản phẩm có hai bề mặt dùng chung một hệ thị giác:

- **Phía khách** (header, nav, giỏ hàng hiện có): chỉ thay đổi ở `/orders`, `/orders/[id]`, và cách hiển thị tồn kho.
- **Phía nhân viên** (`/staff/**`, mới): header riêng, không có giỏ hàng hay nav của khách.

Thuật ngữ trong file này (Hàng đợi, Xác minh đơn, Thiết bị đã đặt, Lý do, Ghi chú nội bộ, Timeline, Tồn khả dụng, Quá hạn xác nhận) dùng đúng như Glossary của PRD.

## Information Architecture

| Bề mặt                    | Đường dẫn                  | Đến từ                                                     | Mục đích                                                                 | PRD                            |
| ------------------------- | -------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------ |
| Đơn hàng của bạn          | `/orders`                  | Nav "Đơn hàng"                                             | Liệt kê đơn của thiết bị này, kèm form Tra cứu đơn                       | FR-4                           |
| Trang đơn (đã xác minh)   | `/orders/[id]`             | Danh sách trên, sau khi đặt (`?placed=1`), sau khi tra cứu | Toàn bộ thông tin, Timeline, nút Hủy (khi `pending`)                     | FR-5, FR-6, FR-8, FR-27, FR-29 |
| Trang đơn (chưa xác minh) | `/orders/[id]`             | Link được chia sẻ, thiết bị khác                           | Trạng thái, Timeline, sản phẩm, tổng tiền, form "Nhập SĐT để xem đầy đủ" | FR-6, FR-7                     |
| Đăng nhập nhân viên       | `/staff/login`             | Gõ URL hoặc bị chuyển hướng từ `/staff/**`                 | Đăng nhập                                                                | FR-1, FR-2                     |
| Hàng đợi                  | `/staff`                   | Sau khi đăng nhập                                          | Danh sách đơn cần xử lý, lọc theo trạng thái, tìm theo Mã đơn            | FR-9, FR-30, FR-33             |
| Chi tiết đơn (nhân viên)  | `/staff/orders/[id]`       | Thẻ trong Hàng đợi                                         | Thông tin đầy đủ, nút chuyển trạng thái, Lịch sử, Ghi chú nội bộ         | FR-10 → FR-16, FR-25, FR-32    |
| Phiếu giao hàng           | `/staff/orders/[id]/print` | Nút "In phiếu"                                             | Trang tối giản dành cho in                                               | FR-31 (Should)                 |

- Không có link nào từ phía khách sang `/staff`. Nhân viên vào bằng cách gõ URL hoặc dùng bookmark.
- Hàng đợi và Chi tiết đơn là hai trang riêng, không dùng master–detail, vì 390px không đủ chỗ cho hai cột. Nút Quay lại ở Chi tiết đơn đưa về Hàng đợi và **giữ nguyên bộ lọc** (bộ lọc lưu trên query `?status=`).
- Trang danh mục, chi tiết sản phẩm và giỏ hàng không đổi bố cục. Chỉ số "còn N" và nhãn "Hết hàng" chuyển sang dùng Tồn khả dụng (FR-23).

→ Tham khảo bố cục: `mockups/staff-queue.html`, `mockups/staff-order-detail.html`, `mockups/order-unverified.html`. Nếu mockup và file này mâu thuẫn, file này thắng.

## Voice and Tone

Nói với khách thì xưng "bạn", lịch sự và ngắn, giống giọng hiện có ("Bạn chắc chắn muốn hủy đơn hàng này?"). Nói với nhân viên thì dùng động từ và con số, không cảm thán.

| Nên                                                                                                   | Không nên                                |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| "Đơn đã được xác nhận bởi Huy lúc 08:11."                                                             | "Lỗi 409: INVALID_STATUS_TRANSITION"     |
| "6 đơn chờ xác nhận"                                                                                  | "Bạn có 6 mục cần xử lý!"                |
| "Nhập số điện thoại đặt hàng để xem đầy đủ thông tin."                                                | "Bạn không có quyền truy cập."           |
| "Bạn đã thử quá nhiều lần, vui lòng thử lại sau 15 phút."                                             | "Tài khoản bị khóa."                     |
| "Đơn sẽ tự hủy nếu cửa hàng chưa xác nhận trong 24 giờ."                                              | "Đơn có thể bị hủy."                     |
| Nhãn nút là động từ rõ kết quả: "Xác nhận đơn", "Bắt đầu giao", "Đã giao", "Giao thất bại", "Hủy đơn" | "OK", "Tiếp tục", "Cập nhật trạng thái"  |
| Lý do viết cho khách đọc: "Hết hàng", "Khách từ chối nhận"                                            | Mã nội bộ hoặc tên nhân viên trong Lý do |

Timeline cho khách gọi người thao tác là "Cửa hàng", không hiện tên nhân viên (FR-27).

## Component Patterns

Đây là phần hành vi. Phần nhìn xem `DESIGN.md.Components`.

| Component                      | Dùng ở                                            | Quy tắc hành vi                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------ | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Ô tìm Mã đơn                   | Hàng đợi, trên hàng chip                          | Dùng input chuẩn kèm icon `Search`, `inputMode="text"`, placeholder "Tìm mã đơn (VD: 4F9A2C)". Bấm `Enter` hoặc nút tìm để gửi. Kết quả khớp một đơn thì mở thẳng Chi tiết đơn. Khớp nhiều đơn thì danh sách tạm thời thay chỗ Hàng đợi, kèm nút "Xóa tìm kiếm". Không khớp thì báo lỗi dưới ô (FR-33).                                                                                                                                                                                                                  |
| Filter chip                    | Hàng đợi                                          | Một chip được chọn tại một thời điểm. Mặc định chọn "Chờ xác nhận". Có các chip: Chờ xác nhận, Đã xác nhận, Đang giao, Đã kết thúc. Số đếm cập nhật mỗi khi tải lại. Chip đổi giá trị `?status=` và không làm mất vị trí cuộn.                                                                                                                                                                                                                                                                                           |
| Order queue card               | Hàng đợi                                          | Chạm vào bất kỳ đâu trên thẻ để mở Chi tiết đơn. Đơn còn dưới 2 giờ trước khi Quá hạn xác nhận có nhãn "Sắp quá hạn" và được giữ ở đầu danh sách (danh sách vốn đã xếp cũ nhất trước).                                                                                                                                                                                                                                                                                                                                   |
| Chọn nhiều                     | Hàng đợi, chip "Chờ xác nhận" (FR-30, Should)     | Nút "Chọn" ở đầu danh sách bật chế độ checkbox. Ở 390px, thanh hành động đáy hiện "Xác nhận N đơn". Kết quả báo qua `role="status"`: "Đã xác nhận 5/6 đơn. 1 đơn đã quá hạn."                                                                                                                                                                                                                                                                                                                                            |
| Action bar                     | Chi tiết đơn (nhân viên)                          | Chỉ hiện những thao tác hợp lệ với trạng thái hiện tại (bảng ở State Patterns). Nút primary luôn là bước tiến tiếp theo. Bấm xong thì nút bị khóa và hiện "Đang xử lý…" cho tới khi có phản hồi.                                                                                                                                                                                                                                                                                                                         |
| Xác nhận tại chỗ               | "Đã giao"                                         | Dùng lại mẫu của `CancelOrderButton`: bấm lần đầu thì mở ô xác nhận ngay tại chỗ ("Xác nhận đã giao đơn này?"). Lý do: đây là bước không quay lại được `[ASSUMPTION]`.                                                                                                                                                                                                                                                                                                                                                   |
| Bottom sheet chọn Lý do        | Hủy đơn, Giao thất bại                            | Lý do có sẵn hiển thị dạng `OptionCard`. Với Giao thất bại (FR-15): "Khách không nhận máy", "Khách từ chối nhận", "Sai địa chỉ". Với Hủy đơn (FR-16): "Hết hàng", "Không liên lạc được khách", "Khách yêu cầu hủy" `[ASSUMPTION]`. Chọn "Khác" thì mở ô nhập (tối đa 200 ký tự). Nút xác nhận bị khóa khi chưa có Lý do. Bấm `Esc`, chạm scrim, hoặc bấm "Không" đều đóng sheet mà không lưu gì. Sau khi thành công, sheet đóng và hiện lời nhắc "Hãy gọi cho khách và ghi chú kết quả." kèm nút "Thêm ghi chú" (FR-15). |
| Ghi chú nội bộ                 | Chi tiết đơn (nhân viên)                          | Textarea kèm nút "Lưu ghi chú". Bộ đếm hiện "n/500". Ghi chú mới xuất hiện ngay trên đầu danh sách, có tên người viết và giờ. Ghi chú không sửa hay xóa được.                                                                                                                                                                                                                                                                                                                                                            |
| Cờ "Đã nhận tiền chuyển khoản" | Chi tiết đơn (nhân viên), chỉ đơn `bank_transfer` | Dùng checkbox, không dùng toggle, kèm ô "Mã giao dịch (không bắt buộc)" và nút "Lưu". Mỗi lần lưu thêm một Ghi chú nội bộ. Cờ không khóa nút chuyển trạng thái nào. Thẻ trong Hàng đợi có nhãn nhỏ "Đã nhận CK" màu emerald khi cờ đang bật (FR-32, Should).                                                                                                                                                                                                                                                             |
| Lịch sử trạng thái             | Chi tiết đơn (nhân viên)                          | Danh sách theo thời gian tăng dần. Mỗi dòng gồm giờ (dd/MM HH:mm), người thao tác, bước chuyển, Lý do. Các sự kiện của Hệ thống có icon `Clock`.                                                                                                                                                                                                                                                                                                                                                                         |
| Timeline                       | Trang đơn của khách                               | Gồm các bước Đã đặt → Đã xác nhận → Đang giao → Đã giao. Bước nào đã qua thì hiện giờ. Đơn dừng ở `cancelled`/`failed` thì các bước sau bị ẩn, không hiện mờ, và Lý do hiện ngay dưới bước dừng.                                                                                                                                                                                                                                                                                                                         |
| Form Tra cứu đơn               | `/orders`                                         | Hai ô: Mã đơn và SĐT. Ô Mã đơn tự viết hoa và bỏ khoảng trắng. Thành công thì chuyển tới `/orders/[id]` ở trạng thái đã xác minh.                                                                                                                                                                                                                                                                                                                                                                                        |
| Form xác minh SĐT              | `/orders/[id]` khi chưa xác minh                  | Một ô SĐT (`inputMode="tel"`) và nút secondary "Xem đầy đủ". Sai thì báo lỗi ngay dưới ô và hiện số lần còn lại khi chỉ còn ≤ 2 lần.                                                                                                                                                                                                                                                                                                                                                                                     |
| Masked field                   | `/orders/[id]` khi chưa xác minh                  | Khối "Người nhận" chỉ hiện SĐT đã che kèm icon `Lock`. Tên, địa chỉ và ghi chú không hiện.                                                                                                                                                                                                                                                                                                                                                                                                                               |

## State Patterns

**Thao tác hợp lệ theo trạng thái (Chi tiết đơn của nhân viên):**

| Trạng thái                         | Nút primary                | Nút phụ                             | Ghi chú                                                              |
| ---------------------------------- | -------------------------- | ----------------------------------- | -------------------------------------------------------------------- |
| `pending`                          | Xác nhận đơn               | Hủy đơn (secondary, mở sheet)       | Còn dưới 2 giờ thì hiện banner amber "Sắp quá hạn, tự hủy lúc HH:mm" |
| `confirmed`                        | Bắt đầu giao               | Hủy đơn (secondary, mở sheet)       | Thêm "In phiếu" (ghost, Should)                                      |
| `shipping`                         | Đã giao (xác nhận tại chỗ) | Giao thất bại (secondary, mở sheet) | Thêm "In phiếu"                                                      |
| `delivered`, `failed`, `cancelled` | Không có                   | Không có                            | Action bar ẩn. Badge kèm dòng "Đơn đã kết thúc"                      |

**Các trạng thái khác:**

| Tình huống                               | Bề mặt                    | Cách hiển thị                                                                                                                                                                                           |
| ---------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Đang tải                                 | Hàng đợi                  | 4 thẻ khung xám `animate-pulse` (`rounded-2xl bg-slate-200/60`, giống skeleton ở checkout)                                                                                                              |
| Hàng đợi trống                           | Hàng đợi (Chờ xác nhận)   | `EmptyState` với emoji ✅: "Không còn đơn chờ xác nhận", mô tả "Đơn mới sẽ xuất hiện ở đây."                                                                                                            |
| Bộ lọc khác trống                        | Hàng đợi                  | `EmptyState` với emoji 📦: "Không có đơn nào ở trạng thái này"                                                                                                                                          |
| Chuyển trạng thái thành công             | Chi tiết đơn              | Badge đổi màu, Lịch sử có thêm một dòng, `role="status"`: "Đã xác nhận đơn SL-…". Màn hình vẫn ở Chi tiết đơn.                                                                                          |
| Xung đột 409 (người khác thao tác trước) | Chi tiết đơn              | `alert-error` với `role="alert"`: "Đơn đã được {hành động} bởi {tên} lúc {giờ}." Trang tự tải lại trạng thái mới, và action bar cập nhật theo bảng trên.                                                |
| Đơn quá hạn khi đang mở                  | Chi tiết đơn              | 409, rồi `alert-error`: "Đơn đã tự hủy do Quá hạn xác nhận lúc {giờ}."                                                                                                                                  |
| Phiên hết hạn (401)                      | Mọi thao tác ở `/staff`   | Chuyển tới `/staff/login?next={url}`, kèm thông báo "Phiên đăng nhập đã hết, vui lòng đăng nhập lại." Đăng nhập xong thì quay lại `next`. Thao tác đang dở không được tự gửi lại.                       |
| Sai mật khẩu                             | `/staff/login`            | `alert-error`: "Tên đăng nhập hoặc mật khẩu không đúng". Giữ tên đăng nhập, xóa mật khẩu.                                                                                                               |
| Chưa xác minh                            | `/orders/[id]`            | Hiện Timeline, sản phẩm, tổng tiền, khối Người nhận đã che, form xác minh. **Không** có nút Hủy.                                                                                                        |
| Tra sai lần thứ 5 (429)                  | `/orders/[id]`, `/orders` | `alert-error`, form bị khóa và hiện giờ có thể thử lại.                                                                                                                                                 |
| Không tìm thấy                           | `/orders/[id]`            | Giữ `notFound()` hiện có. Form Tra cứu báo "Không tìm thấy đơn với mã và số điện thoại này." Câu báo lỗi giống nhau cho cả trường hợp sai mã lẫn sai SĐT, để không lộ việc mã đơn có tồn tại hay không. |
| Thiết bị chưa có đơn                     | `/orders`                 | Giữ `EmptyState` hiện có ("Bạn chưa có đơn hàng nào"), đặt form Tra cứu đơn ngay bên dưới                                                                                                               |
| Vừa đặt xong                             | `/orders/[id]?placed=1`   | Giữ ô emerald hiện có, thêm một câu về N giờ (FR-29)                                                                                                                                                    |
| Đơn cũ (trước nâng cấp)                  | Timeline, Lịch sử         | Hiện các sự kiện suy ra (FR-26). Người thao tác hiện "Không rõ" trong Lịch sử của nhân viên `[ASSUMPTION]`                                                                                              |
| Sản phẩm vừa hết do giữ hàng             | Checkout                  | Giữ thông báo `INSUFFICIENT_STOCK` hiện có trong `alert-error` của checkout (BL-6)                                                                                                                      |

## Interaction Primitives

- **Ưu tiên chạm.** Mọi vùng chạm ≥ 44px: nút `md` cao 40px phải có padding bao quanh để đủ 44px; trên mobile, action bar dùng `lg` cao 48px.
- **Bước tiến không quay lại được thì phải chủ ý.** Xác nhận đơn và Bắt đầu giao chỉ cần một chạm, nên xác nhận một đơn từ Hàng đợi mất 2 thao tác (FR-12). Đã giao cần xác nhận tại chỗ. Hủy đơn và Giao thất bại phải đi qua sheet chọn Lý do.
- **Không cập nhật lạc quan.** Giao diện chỉ đổi trạng thái sau khi server trả thành công, vì server mới là nơi quyết định (FR-11, FR-18).
- **Làm mới.** Hàng đợi tự tải lại khi tab được focus lại, và có nút ghost "Làm mới" (icon `RefreshCw`). Không dùng realtime hay polling `[ASSUMPTION]`.
- **Không dùng:** vuốt để thao tác, kéo thả, menu chỉ hiện khi rê chuột, dialog lồng trong dialog, toast tự biến mất cho lỗi (lỗi phải ở lại cho tới khi người dùng thao tác tiếp).
- **Bàn phím** (từ `md`): `Enter` trên thẻ để mở đơn, `Esc` để đóng sheet. Không cần thêm phím tắt.

## Accessibility Floor

- WCAG 2.2 AA. Mọi cặp màu chữ trên nền trong `DESIGN.md` đã đạt AA: chữ `-700` trên nền `-50`, chữ trắng trên `indigo-600` và `rose-600`.
- Trạng thái không bao giờ chỉ được biểu thị bằng màu. Badge luôn có chữ. Chấm Timeline luôn đi kèm nhãn.
- Timeline là `<ol>`. Bước hiện tại có `aria-current="step"`. Bước dừng ở `failed`/`cancelled` được đọc kèm Lý do.
- Kết quả thao tác dùng `role="status"`, lỗi dùng `role="alert"`, như mẫu ở checkout và trang đơn hiện có.
- Mở bottom sheet thì focus chuyển vào tiêu đề và bị giữ trong sheet. Đóng sheet thì focus quay lại nút đã mở nó.
- SĐT đã che có nhãn ẩn cho trình đọc màn hình: "Số điện thoại đã được ẩn".
- Ô SĐT dùng `inputMode="tel"` và `autoComplete="tel"`. Ô mật khẩu dùng `autoComplete="current-password"`.
- Thứ tự `Tab` theo thứ tự đọc. Action bar sticky nằm cuối trong thứ tự `Tab`.

## Responsive & Platform

| Breakpoint         | Hành vi                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `< sm` (390–639px) | Hàng đợi một cột. Ô tìm nằm trên hàng chip, chip lọc cuộn ngang. Action bar sticky ở đáy. Lý do mở trong bottom sheet. Staff header ẩn tên nhân viên. Timeline của khách dạng dọc.                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `sm`–`md`          | Như trên. Staff header hiện tên nhân viên.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `≥ md` (768px+)    | Hàng đợi lưới 2 cột; chip lọc bên trái, ô tìm (rộng 300px) bên phải trên cùng một dòng. Chi tiết đơn của nhân viên: action bar ẩn; nút cỡ `md` nằm ở dòng tiêu đề, theo thứ tự In phiếu (ghost), nút phụ, nút primary ở ngoài cùng bên phải; các thẻ xếp lưới 2 cột (Người nhận · Sản phẩm & thanh toán · Lịch sử · Ghi chú nội bộ). Bottom sheet hiển thị thành dialog ở giữa, rộng 448px, nút đặt bên phải theo thứ tự "Không" rồi nút xác nhận. Trang đơn của khách: Timeline nằm ngang (4 bước trên một dòng); phần còn lại giữ bố cục hiện có (lưới 2 cột Người nhận / Giao hàng & thanh toán). |

**Thiết bị:** mockup điện thoại dùng khung 402×874 pt `[ASSUMPTION: kích thước iPhone 18 = iPhone 17/17 Pro 6,3"]`. Bố cục vẫn thiết kế từ 390px nên đúng cho cả 390 lẫn 402. Action bar sticky và bottom sheet phải cộng `env(safe-area-inset-bottom)` (34pt trên iPhone có Face ID) vào padding dưới, để nút không nằm đè lên thanh home. Cần thêm `viewport-fit=cover` vào thẻ meta viewport.

**iPhone gập** `[ASSUMPTION: chưa có thông số chính thức; màn ngoài 360×780 pt, màn trong 780×600 pt nằm ngang]`:

- **Màn ngoài (gập):** hẹp hơn 390px, nên **mức sàn thiết kế hạ xuống 360px**. Ở dưới 390px, dòng 3 của thẻ trong Hàng đợi viết tắt "sản phẩm" thành "SP" và được phép xuống dòng. Nút xác minh SĐT rút từ "Xem đầy đủ" thành "Xem", để ô nhập không bị bóp hẹp. Mã đơn và badge được phép xuống dòng.
- **Màn trong (mở):** rộng ≥ 768px nên tự dùng bố cục `≥ md`. Lưới 2 cột giữ khoảng cách giữa hai cột trùng với vệt bản lề, để không thẻ nào bị gãy đôi. Nút thao tác dồn về phía phải. Không đặt nút nào nằm vắt qua bản lề.
- **Chuyển giữa gập và mở:** không mất trạng thái. Sheet hoặc dialog đang mở vẫn mở, form giữ nguyên dữ liệu đã nhập, vị trí cuộn bám theo thẻ đang hiển thị. Bố cục đổi hoàn toàn theo CSS breakpoint, không cần JS riêng.

→ Mockup: `mockups/foldable.html`. Ba màn, mỗi màn có hai trạng thái gập và mở.

Trang phiếu giao hàng (`/print`) dùng `@media print`: ẩn header, footer và các nút; khổ A5 dọc `[ASSUMPTION]`.

## Inspiration & Anti-patterns

- **Lấy từ Shopee (đã chốt ở brainstorm):** Timeline dọc của đơn, và lý do hủy hiện cho khách.
- **Lấy từ chính ShopLite:** mẫu xác nhận tại chỗ của `CancelOrderButton`, `OptionCard` cho lựa chọn, `EmptyState` cho trạng thái trống.
- **Loại — bảng dữ liệu nhiều cột cho Hàng đợi:** không dùng được ở 390px, và nhân viên cần lướt rồi chạm, không cần so cột.
- **Loại — dashboard số liệu ở `/staff`:** Hàng đợi chính là trang chủ. Ngoài số đếm trên chip, không có biểu đồ hay KPI nào (R7: phạm vi lan man).
- **Loại — dropdown "Đổi trạng thái" tự do:** trái với FR-11. Nút chỉ hiện các bước hợp lệ.

## Key Flows

### UJ-1. Lan mở ca sáng và xử lý xong hàng đợi trước 9 giờ

1. Lan mở `/staff` trên điện thoại. Phiên đã hết hạn nên Lan bị chuyển tới `/staff/login`, đăng nhập lại, và được đưa về `/staff`.
2. Chip "Chờ xác nhận · 6" đang được chọn. Thẻ đầu tiên có nhãn amber "Sắp quá hạn".
3. Lan chạm vào thẻ, gọi số điện thoại hiện trên Chi tiết đơn, rồi bấm **Xác nhận đơn** ở action bar.
4. **Cao trào:** badge chuyển sang sky "Đã xác nhận", Lịch sử thêm dòng "Lan · 08:12 · Chờ xác nhận → Đã xác nhận", trình đọc màn hình báo "Đã xác nhận đơn SL-…". Lan bấm Quay lại, chip giờ hiện "Chờ xác nhận · 5".
5. Lan làm tiếp cho tới khi gặp `EmptyState` "Không còn đơn chờ xác nhận".

Thất bại: Huy đã xác nhận đơn đó trước. Thay vì thành công, Lan thấy `alert-error` "Đơn đã được xác nhận bởi Huy lúc 08:11.", và action bar chuyển sang "Bắt đầu giao". Lan quay lại Hàng đợi.

### UJ-2. Minh đặt tai nghe trên laptop, theo dõi đơn trên điện thoại

1. Minh đặt hàng xong trên laptop và được chuyển tới `/orders/[id]?placed=1`. Ô emerald hiện thông báo đặt hàng thành công và câu "Đơn sẽ tự hủy nếu cửa hàng chưa xác nhận trong 24 giờ."
2. Hôm sau, trên điện thoại, Minh mở link đơn. Trang hiện Timeline (Đã đặt ✓, Đã xác nhận ✓, **Đang giao** là bước hiện tại), khối Người nhận chỉ có `09****678` kèm icon `Lock`, và form "Nhập số điện thoại đặt hàng để xem đầy đủ thông tin."
3. Minh nhập SĐT rồi bấm "Xem đầy đủ".
4. **Cao trào:** tên, địa chỉ và ghi chú hiện ra ngay trên cùng trang. Từ giờ đơn này cũng xuất hiện trong "Đơn hàng của bạn" trên điện thoại.

Thất bại: nhập sai SĐT. Lỗi hiện dưới ô, và từ lần sai thứ 3 thì có thêm "Còn 2 lần thử".

### UJ-3. Hai khách cùng mua chiếc loa cuối cùng

1. Thảo và Khoa cùng có chiếc BeatBox Mini trong giỏ và cùng bấm "Đặt hàng".
2. Thảo được chuyển tới trang đơn. Khoa thấy `alert-error` của checkout: "Sản phẩm "Loa Bluetooth BeatBox Mini" đã hết hàng". Form của Khoa giữ nguyên dữ liệu đã nhập.
3. **Cao trào:** Khoa mở lại trang sản phẩm và thấy ngay nhãn "Hết hàng", nút thêm vào giỏ bị khóa. Hệ thống không hứa một thứ nó không có.
4. Mười phút sau Thảo hủy đơn (xác nhận tại chỗ). Trang sản phẩm lại hiện "Chỉ còn 1".

### UJ-4. Giao thất bại và báo khách

1. Lan mở một đơn `shipping` và bấm **Giao thất bại**.
2. Bottom sheet mở ra. Lan chọn `OptionCard` "Khách từ chối nhận" rồi bấm "Xác nhận giao thất bại" (nút danger).
3. Sheet đóng. Badge chuyển sang rose "Giao thất bại". Lời nhắc "Hãy gọi cho khách và ghi chú kết quả." hiện ra cùng nút "Thêm ghi chú".
4. Lan gọi khách, rồi ghi "Đã gọi 14:05, khách đổi ý" và bấm Lưu.
5. **Cao trào:** trên trang đơn của khách, Timeline dừng ở chấm rose "Giao thất bại", bên dưới là Lý do "Khách từ chối nhận". Ghi chú nội bộ của Lan không hiện cho khách.

### UJ-5. Chủ shop xử lý khiếu nại "tôi không hủy đơn"

1. Chủ shop đăng nhập, gõ 6 ký tự cuối của Mã đơn mà khách đọc qua điện thoại vào ô tìm ở đầu Hàng đợi (FR-33), rồi được đưa thẳng tới Chi tiết đơn. Không cần chọn chip.
2. **Cao trào:** Lịch sử trạng thái hiện (icon `Clock`) "Hệ thống · 21/11 09:00 · Chờ xác nhận → Đã hủy · Quá hạn xác nhận". Câu trả lời cho khách có ngay trên một màn hình.
