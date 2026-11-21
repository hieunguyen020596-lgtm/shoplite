---
name: shoplite
status: final
created: 2026-11-21
updated: 2026-11-21
sources:
  - ../../prds/prd-shoplite-2026-11-21/prd.md
  - ../../prds/prd-shoplite-2026-11-21/addendum.md
  - ../../briefs/brief-shoplite-2026-11-21/brief.md
  - ../../briefs/brief-shoplite-2026-11-21/addendum.md
---

# ShopLite: EXPERIENCE

## Foundation

- **Nền tảng:** web responsive trên Next.js. Desktop và mobile được thiết kế ngang nhau, kể cả khu nhân viên. Mọi thao tác dùng được ở 390px và tận dụng màn hình rộng trên desktop.
- **UI system:** design system ngầm đang có (Tailwind CSS v4, Be Vietnam Pro, component trong `src/components/ui`). [DESIGN.md](DESIGN.md) giữ nhận diện hình ảnh và đánh dấu phần hiện có, phần delta. Tài liệu này giữ hành vi.
- **Hai khu tách biệt:** khu Khách hàng dùng layout cửa hàng, không cần tài khoản. Khu nhân viên dùng layout riêng, lối vào duy nhất là gõ `/staff`.
- **Thuật ngữ:** theo mục 3 của PRD, trừ định nghĩa Dữ liệu tối thiểu đã đổi ở [Thay đổi cần cập nhật ở PRD](#thay-đổi-cần-cập-nhật-ở-prd).
- **Thứ tự ưu tiên nguồn:** memlog thắng PRD về quyết định UX; PRD thắng brief.

Giả định đã được chấp nhận nhưng cần xem lại mang thẻ `[ASSUMPTION: A-n]`, tổng hợp ở [Assumptions](#assumptions). Câu hỏi còn mở và phần chuyển sang kiến trúc nằm trong [Open Questions](#open-questions).

### Tham chiếu hình ảnh

DESIGN.md và EXPERIENCE.md thắng mọi mock và wireframe khi có mâu thuẫn.

| File | Minh họa |
|---|---|
| [mockups/key-staff-queue.html](mockups/key-staff-queue.html) | Hàng đợi `/staff`, tab Cần xử lý, 390px và desktop |
| [mockups/key-staff-order-detail.html](mockups/key-staff-order-detail.html) | Chi tiết đơn Đã giao, vùng hai nút, Lịch sử, hộp thoại Lùi đơn |
| [mockups/key-order-confirmation.html](mockups/key-order-confirmation.html) | Trang xác nhận ở Chờ xác nhận (chuyển khoản) và Đang giao |
| [wireframes/ia-2026-11-21.excalidraw](wireframes/ia-2026-11-21.excalidraw) | Kiến trúc thông tin hai khu |
| [wireframes/flow-customer-2026-11-21.excalidraw](wireframes/flow-customer-2026-11-21.excalidraw) | Luồng UJ-2, gồm thiếu hàng lúc đặt |
| [wireframes/flow-staff-2026-11-21.excalidraw](wireframes/flow-staff-2026-11-21.excalidraw) | Luồng UJ-1, UJ-3 và phác thảo desktop |

Wireframe là phác thảo ban đầu, giữ nguyên không dọn lại, có thể còn ghi chú cũ và chỉ dùng để xem. Bố cục Trang xác nhận theo mock.

## Information Architecture

| Surface | Route | Vào từ | Mục đích | Quyền |
|---|---|---|---|---|
| Cửa hàng | `/`, `/products`, `/products/[slug]`, `/cart` | Menu | Giữ nguyên | Công khai |
| Đặt hàng | `/checkout` | Giỏ hàng | Đặt đơn, xử lý thiếu hàng tại chỗ | Công khai |
| Tra đơn | `/orders` | Menu "Đơn hàng", lối "Tra đơn", link không có quyền | Nhập Mã đơn và số điện thoại | Công khai |
| Trang xác nhận | `/orders/:id` | Đặt thành công, Tra đơn thành công | Một trang chung cho cả hai đường vào | Quyền xem đơn |
| Đăng nhập | `/staff/login` | Gõ `/staff` khi chưa đăng nhập | Đăng nhập Tài khoản riêng | Công khai |
| Danh sách đơn | `/staff` | Sau đăng nhập | Ô tìm và 4 tab | Nhân viên, Quản lý |
| Chi tiết đơn | `/staff/orders/:id` | `order-row`, `order-table` | Thông tin đơn, thao tác, Lịch sử | Nhân viên, Quản lý |

Hộp thoại trên Chi tiết đơn: Xác nhận Đã giao, Hủy đơn, Lùi đơn (Quản lý), Đã xử lý hoàn tiền (Quản lý), Ghi thêm kết quả hoàn tiền (Quản lý). Chỉ mở một lớp, không chồng hộp thoại.

### Nội dung 4 tab

| Tab | Gồm | Thứ tự |
|---|---|---|
| Cần xử lý (Hàng đợi, mặc định) | Chờ xác nhận, Đã xác nhận, Đang giao | Đơn chuyển khoản Chờ xác nhận quá 24 giờ lên đầu, sau đó đơn cũ nhất trước |
| Đã giao | Đơn Đã giao | Thay đổi mới nhất trước `[ASSUMPTION: A4]` |
| Đã hủy | Đơn Đã hủy | Thay đổi mới nhất trước `[ASSUMPTION: A4]` |
| Cần hoàn tiền | Đơn có Cờ cần hoàn tiền, chưa qua `Đã xử lý hoàn tiền` | Đơn cũ nhất trước `[ASSUMPTION: A4]` |

Một đơn có thể nằm ở cả Đã hủy và Cần hoàn tiền. `refund-flag-label` phân biệt đơn cần hoàn, đơn đã xử lý và đơn COD (không có nhãn).

### Nội dung Trang xác nhận

**Có:** Mã đơn, Trạng thái, mốc thời gian, bước kế tiếp, sản phẩm, tổng tiền, phương thức giao hàng và thanh toán, tên và số điện thoại đã che, số điện thoại shop ở mọi Trạng thái, lối "Tra đơn". Thông tin chuyển khoản chỉ có khi đơn chuyển khoản còn Chờ xác nhận.

**Không có:** địa chỉ đầy đủ, email, ghi chú, tên Nhân viên, lý do nội bộ, thao tác hủy hoặc sửa, câu khẳng định đã trả tiền hay sẽ được hoàn, `refund-flag-label`, kết quả xử lý hoàn tiền, ngày giao dự kiến.

## Voice and Tone

Giọng thương hiệu nằm trong DESIGN.md. Câu chữ: tiếng Việt có dấu, ngắn, nói rõ việc tiếp theo, không hứa điều hệ thống không biết.

| Nên | Không nên |
|---|---|
| "Shop đang chuẩn bị hàng để giao." | "Đơn sẽ tới trong 2 ngày." |
| "Thông tin không đúng" | "Không tìm thấy Mã đơn này" |
| "Đơn vừa được người khác cập nhật" | "Lỗi INVALID_STATUS_TRANSITION" |
| "Đơn đã hủy. Nếu bạn đã chuyển khoản, vui lòng liên hệ shop qua {số}." | "Bạn sẽ được hoàn tiền." |

### Microcopy đã chốt

| Vị trí | Câu chữ chính xác | Nguồn |
|---|---|---|
| Bước kế tiếp theo Trạng thái | Xem [Những gì Khách hàng thấy theo Trạng thái](#những-gì-khách-hàng-thấy-theo-trạng-thái) | Memlog, FR-7 |
| Liên hệ, Chờ xác nhận và Đã xác nhận | `Muốn hủy đơn, liên hệ shop:` {số} | FR-7, mock |
| Liên hệ, Đang giao | `Cần hỗ trợ, gọi shop:` {số} `[ASSUMPTION: A13]` | Mock |
| Lưu Mã đơn | `Hãy lưu lại Mã đơn để tra cứu sau. Mất mã thì gọi shop.` | Mock |
| Nút sao chép | `Sao chép Mã đơn` | Mock |
| Tiêu đề khi vừa đặt | `Đặt hàng thành công` | Mock |
| Lỗi Tra đơn, kể cả khi bị chặn | `Thông tin không đúng` | FR-1, FR-3 |
| Thiếu hàng, tiêu đề | `Một số sản phẩm không đủ hàng` | Wireframe |
| Thiếu hàng, mô tả | `Chọn cách xử lý để đặt tiếp.` | Wireframe |
| Thiếu hàng, từng dòng | `Bạn chọn {X} · Chỉ còn {N}`, nút `Lấy {N}`, `Bỏ` | Memlog, wireframe |
| Hết sạch (N=0) | `Hết hàng`, chỉ có nút `Bỏ` | Memlog |
| Sau mỗi thao tác đổi Trạng thái | `Đã chuyển đơn #{Mã đơn} sang {Trạng thái}` | Memlog |
| Thao tác đồng thời | `Đơn vừa được người khác cập nhật` | Memlog |
| Tìm không có kết quả | `Không tìm thấy đơn`, nút `Xóa tìm kiếm` | Memlog |
| Nhãn tìm kiếm | `Tìm đơn`, placeholder `Mã đơn hoặc số điện thoại`, nút `Tìm` | Wireframe, memlog |
| Nhãn quá hạn | `CHUYỂN KHOẢN CHỜ QUÁ 24 GIỜ` (dòng và Chi tiết đơn), `CHỜ QUÁ 24 GIỜ` (cột bảng) | Mock, memlog |
| Lý do Hủy | `Khách đổi ý`, `Không liên lạc được`, `Đơn trùng`, `Hết hàng`, `Khác` | Memlog |
| Lý do Lùi đơn | `Bấm nhầm, hàng còn trên xe`, `Khách báo chưa nhận hàng`, `Khác` | Memlog |
| Hộp thoại Hủy | Tiêu đề `Hủy đơn?`, nhãn `Chọn lý do (bắt buộc)`, ô `Nhập lý do` (chỉ hiện khi chọn `Khác`), nút `Quay lại`, `Hủy đơn` | Wireframe |
| Hộp thoại Hủy, ghi chú Tồn kho khi chọn lý do khác `Hết hàng` | `Tồn kho được hoàn ngay.` | Wireframe |
| Hộp thoại Hủy, ghi chú Tồn kho khi chọn `Hết hàng` | `Không hoàn Tồn kho cho toàn bộ đơn.` | Memlog |
| Hộp thoại Hủy, ghi chú thêm, chỉ với đơn chuyển khoản | `Đơn chuyển khoản sẽ bật Cờ cần hoàn tiền.` | Wireframe |
| Hộp thoại Hủy, câu nhắc khi chọn `Khác` | `Nếu hết hàng, hãy chọn lý do Hết hàng` | Memlog |
| Hộp thoại Lùi đơn | Tiêu đề `Lùi đơn về Đang giao?`, Mã đơn, nhãn `Chọn lý do (bắt buộc)`, ô `Nhập lý do` (chỉ hiện khi chọn `Khác`), ghi chú `Tồn kho không đổi. Lịch sử giữ cả dòng cũ.`, nút `Quay lại`, `Lùi đơn` | Mock |
| Nút thao tác | `Xác nhận đơn`, `Hủy đơn`, `Lùi đơn về Đang giao (Quản lý)` | Wireframe, mock |
| Nút hoàn tiền | `Đã xử lý hoàn tiền` | Memlog |
| Kết quả xử lý hoàn tiền | `Đã hoàn tiền`, `Khách chưa chuyển tiền` | Memlog |
| Hộp thoại hoàn tiền | Tiêu đề `Đã xử lý hoàn tiền?`, nội dung Mã đơn, nhãn `Chọn kết quả (bắt buộc)`, hai kết quả đã chốt, `Thao tác này được ghi vào Lịch sử. Hệ thống không chuyển tiền.`, nút `Quay lại`, `Xác nhận` | Memlog |
| Toast hoàn tiền | `Đã xử lý hoàn tiền đơn #{Mã đơn}: {kết quả}` | Memlog |
| Dòng Lịch sử hoàn tiền | `Đã xử lý hoàn tiền: {kết quả}` | Memlog |
| Thiếu kết quả hoàn tiền | `Vui lòng chọn kết quả.` | Memlog |
| Nhãn cờ hoàn tiền | `Cần hoàn tiền`, `Đã xử lý hoàn tiền` | Memlog |
| Link quay lại ở Chi tiết đơn | `Danh sách` | Mock |
| Emoji `empty-state` | Xem [Nội dung `empty-state`](DESIGN.md#nội-dung-empty-state) | Memlog |

### Microcopy theo giả định đã chấp nhận

| Vị trí | Câu chữ đề xuất | Thẻ |
|---|---|---|
| Nút chuyển bước | `Chuyển Đang giao`, `Đánh dấu Đã giao` | `[ASSUMPTION: A9]` |
| Hộp thoại Đã giao | Tiêu đề `Xác nhận đã giao?`, nội dung Mã đơn và tên người nhận, nút `Quay lại`, `Đã giao` | `[ASSUMPTION: A9]` |
| Sao chép thành công | Nút đổi thành `Đã sao chép` trong 2 giây | `[ASSUMPTION: A12]` |
| Sao chép thất bại | `Không sao chép được. Hãy ghi lại Mã đơn.` | `[ASSUMPTION: A12]` |
| Đăng nhập sai | `Tên đăng nhập hoặc mật khẩu không đúng` | `[ASSUMPTION: A14]` |
| Đăng nhập bị chặn | `Đăng nhập sai quá nhiều lần. Vui lòng thử lại sau.` | `[ASSUMPTION: A14]` |
| Hết phiên | `Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.` | `[ASSUMPTION: A14]` |
| Không có quyền (403) | `Bạn không có quyền thực hiện thao tác này.` | `[ASSUMPTION: A14]` |
| Lỗi mạng hoặc máy chủ | `Chưa thực hiện được. Vui lòng thử lại.` | `[ASSUMPTION: A14]` |
| Đặt đơn bị giới hạn (`RATE_LIMITED`) | `Bạn đã đặt quá nhiều đơn. Vui lòng thử lại sau hoặc liên hệ shop qua {số}.` | `[ASSUMPTION: A14]` |
| Đơn nhân viên không tồn tại | `Không tìm thấy đơn`, link `Danh sách` | `[ASSUMPTION: A14]` |
| Thiếu lý do | `Vui lòng chọn lý do.` hoặc `Vui lòng nhập lý do.` | `[ASSUMPTION: A14]` |
| Thiếu trường Tra đơn | `Vui lòng nhập Mã đơn.`, `Vui lòng nhập số điện thoại.` | `[ASSUMPTION: A14]` |
| Tab trống | Cần xử lý: `Không còn đơn cần xử lý`; Đã giao: `Chưa có đơn đã giao`; Đã hủy: `Chưa có đơn đã hủy`; Cần hoàn tiền: `Không có đơn cần hoàn tiền` | `[ASSUMPTION: A15]` |
| Vùng kết quả tìm kiếm | Nhãn `Kết quả tìm kiếm` | `[ASSUMPTION: A21]` |
| Hỏi lại khi `Esc` | `Bỏ nội dung đã nhập?`, nút `Tiếp tục nhập`, `Bỏ` | `[ASSUMPTION: A22]` |
| Nút ghi thêm kết quả hoàn tiền | `Ghi thêm: Đã hoàn tiền` | `[ASSUMPTION: A23]` |
| Hộp thoại ghi thêm kết quả | Tiêu đề `Ghi thêm kết quả Đã hoàn tiền?`, Mã đơn, `Dòng Khách chưa chuyển tiền vẫn giữ trong Lịch sử. Hệ thống không chuyển tiền.`, nút `Quay lại`, `Xác nhận` | `[ASSUMPTION: A23]` |
| Nút và hộp thoại đính chính | Nút `Đính chính: Khách chưa chuyển tiền`; hộp thoại có Mã đơn, ô `Nhập lý do` bắt buộc, `Dòng Đã hoàn tiền vẫn giữ trong Lịch sử.`, nút `Quay lại`, `Xác nhận` | `[ASSUMPTION: A24]` |

## Component Patterns

Đặc tả hình ảnh nằm trong DESIGN.md, mục Components.

| Component | Dùng ở | Quy tắc hành vi |
|---|---|---|
| `button-primary` | Hành động chính | Mỗi vùng một nút chính. Disabled khi đang gửi. |
| `button-secondary` | Sao chép, Quay lại, Tra đơn, Tìm | Không đổi dữ liệu đơn. |
| `button-ghost` | Đăng xuất, Bỏ | Hành động phụ. |
| `button-danger` | `Hủy đơn`: nút mở hộp thoại và nút xác nhận | Chỉ dùng cho thao tác hủy. Nút mở hộp thoại không đổi dữ liệu ngay. |
| `form-field` | Đặt hàng, Tra đơn, Đăng nhập, lý do Khác, `order-search` | Lỗi hiện dưới trường, giữ nguyên giá trị đã nhập. |
| `card` | Mọi trang đơn | Gom thông tin, không bấm được trừ khi là `order-row`. |
| `success-banner` | Trang xác nhận | Chỉ hiện khi `?placed=1` và đơn còn Chờ xác nhận. |
| `error-banner` | Đặt hàng, Tra đơn, Đăng nhập, trong `action-dialog`, đầu trang khu nhân viên | Dùng `role="alert"`. Biến mất khi gửi lại. Lỗi khi hộp thoại còn mở hiện trong hộp thoại. Xung đột sau khi đóng hộp thoại hiện ở đầu trang. |
| `empty-state` | Tab trống, không có kết quả tìm | Truyền prop `emoji` bắt buộc theo [DESIGN.md](DESIGN.md#nội-dung-empty-state). Tab trống dùng câu ở Voice and Tone, không có nút. Không có kết quả tìm kiếm có nút `Xóa tìm kiếm`. |
| `order-status-badge` | Mọi nơi có Trạng thái | Luôn có chữ. Không bấm được. |
| `stock-badge` | Cửa hàng | Giữ nguyên, đọc từ Tồn kho thực tế (FR-18). |
| `store-header` | Khu Khách hàng | Giữ nguyên. Mục "Đơn hàng" dẫn tới Tra đơn. |
| `store-footer` | Khu Khách hàng | Giữ nguyên. Không xuất hiện ở khu nhân viên. |
| `price-tag` | Cửa hàng, đơn | Giữ nguyên. |
| `quantity-input` | Sản phẩm, giỏ hàng | Giữ nguyên, giới hạn theo Tồn kho và `MAX_QUANTITY_PER_ITEM`. |
| `rating-stars` | Cửa hàng | Giữ nguyên, chỉ hiển thị. |
| `staff-header` | Khu nhân viên | Hiện tên người đăng nhập. `Đăng xuất` hủy phiên và về `/staff/login`. |
| `order-search` | `/staff` | Tìm theo Mã đơn hoặc số điện thoại trên **mọi tab**. Gửi bằng Enter hoặc nút `Tìm`. Gửi ô rỗng thì trở về tab trước đó. Từ khóa chỉ giữ trong bộ nhớ, **không lên URL**, không lưu bền, mất khi tải lại trang. Khớp chính xác sau khi chuẩn hóa `0...` và `+84...`. `[ASSUMPTION: A5]` |
| `order-tabs` | `/staff` | 4 cột trên một hàng ở 390px, không cuộn ngang. Kích hoạt thủ công: phím mũi tên chỉ di chuyển focus, `Enter` hoặc `Space` mới đổi tab. Đổi tab tải lại dữ liệu nhóm đó. Khi xem kết quả tìm kiếm, tab trước đó vẫn được đánh dấu (`aria-selected="true"`, `tabindex="0"`) và kết quả nằm trong vùng riêng có nhãn. Kích hoạt tab khác hoặc chính tab đang đánh dấu thì rời kết quả và xóa từ khóa. `[ASSUMPTION: A21]` |
| `tab-count` | Tab Cần hoàn tiền | Đếm đơn có cờ chưa xử lý, không phụ thuộc từ khóa tìm kiếm, ẩn khi bằng 0, cập nhật sau thao tác hoặc khi tải trang. `[ASSUMPTION: A7]` |
| `order-row` | `/staff`, màn hẹp | Mã đơn là link thật, vùng bấm mở rộng ra cả thẻ bằng lớp phủ. `tel-link` nằm trên lớp phủ, là vùng bấm riêng, không mở Chi tiết đơn. Không đặt nút đổi Trạng thái trên dòng. |
| `order-table` | `/staff`, màn rộng | Như `order-row`, lớp phủ tính trên cả dòng. |
| `overdue-label` | Dòng, bảng, Chi tiết đơn | Chỉ cho đơn chuyển khoản Chờ xác nhận quá 24 giờ. Không tự hủy đơn. Mất nhãn khi đơn rời Chờ xác nhận. |
| `refund-flag-label` | `order-row`, `order-table`, Chi tiết đơn | Nội dung theo [Kết quả xử lý hoàn tiền](#kết-quả-xử-lý-hoàn-tiền). Đơn COD không có nhãn. Nhân viên và Quản lý đều thấy, chỉ đọc. Không xuất hiện ở khu Khách hàng. |
| `tel-link` | Số khách trên trang nhân viên | `tel:` bấm để gọi. Trên Trang xác nhận, số shop cũng dùng `tel-link`. `[ASSUMPTION: A13]` |
| `order-code-block` | Trang xác nhận | Luôn hiện Mã đơn, nút sao chép và lời nhắc lưu mã. Không có danh sách đơn gần đây. |
| `bank-transfer-card` | Trang xác nhận | Chỉ hiện khi đơn chuyển khoản còn Chờ xác nhận. Nội dung chuyển khoản là Mã đơn. Có hàng Ngân hàng. `[ASSUMPTION: A6]` |
| `status-timeline` | Trang xác nhận | Theo quy tắc mốc thời gian. Không hiện tên Nhân viên hay lý do. |
| `next-step-block` | Trang xác nhận | Đúng một câu theo Trạng thái và phương thức thanh toán. Không hứa ngày giao. |
| `masked-recipient` | Trang xác nhận | Chỉ nhận dữ liệu đã che từ server. |
| `stock-conflict-row` | `/checkout` | `Lấy N` đặt số lượng về N. `Bỏ` xóa dòng. Giỏ hàng và tổng tiền cập nhật ngay, gồm cả phí giao nếu đơn xuống dưới ngưỡng miễn phí. Khách không phải quay lại giỏ. N=0 chỉ có `Hết hàng` và `Bỏ`. |
| `action-dialog` | Chi tiết đơn | Bẫy focus. `Quay lại` đóng ngay. `Esc` đóng ngay khi chưa nhập; nếu đã chọn lý do, chọn kết quả hoặc gõ chữ thì hỏi lại ngay trong hộp thoại, không mở hộp thoại thứ hai `[ASSUMPTION: A22]`. `Esc` lần hai tương đương `Tiếp tục nhập`. Khi đang gửi, khóa mọi cách đóng hộp thoại. Bấm nền không đóng khi đã nhập dữ liệu `[ASSUMPTION: A9]`. Đích focus theo [Accessibility Floor](#accessibility-floor). |
| `reason-option` | Hộp thoại Hủy, Lùi đơn, Đã xử lý hoàn tiền | Không chọn sẵn khi mở hộp thoại. Chọn đúng một. Ô `Nhập lý do` chỉ hiện khi chọn `Khác`, bắt buộc có chữ; chuỗi chỉ có khoảng trắng không hợp lệ. Trong hộp thoại Hủy, ghi chú Tồn kho hiện sau khi chọn lý do và đổi theo lý do; chọn `Khác` hiện thêm câu nhắc chọn `Hết hàng`. Các thay đổi này đọc qua `aria-live`. |
| `toast` | Khu nhân viên | Báo ngắn sau thao tác, tự ẩn, không chặn thao tác, đọc qua `aria-live`. `[ASSUMPTION: A19]` |
| `history-list` | Chi tiết đơn | Theo thời gian, cũ trước. Chỉ đọc. Giữ cả dòng đã bị Lùi đơn sửa. Hiện người thực hiện, thời gian, Trạng thái cũ, Trạng thái mới, lý do. Dòng tạo đơn hiện `Tạo đơn` thay Trạng thái cũ. Dòng hoàn tiền hiện `Đã xử lý hoàn tiền: {kết quả}` thay cho cặp Trạng thái; ghi thêm kết quả là một dòng mới. |

## State Patterns

| Surface | Trạng thái | Xử lý |
|---|---|---|
| `/checkout` | Đang gửi | Nút `Đặt hàng` disabled. `[ASSUMPTION: A18]` |
| `/checkout` | Thiếu hàng | Giữ form, hiện `stock-conflict-row`. `Đặt hàng` disabled đến khi mọi dòng được xử lý. `[ASSUMPTION: A17]` |
| `/checkout` | Tồn kho đổi tiếp khi đặt lại | Hiện lại `stock-conflict-row` với N mới, form giữ nguyên. |
| `/checkout` | Bỏ hết mọi dòng | Hiện trạng thái giỏ trống hiện có. `[ASSUMPTION: A17]` |
| `/checkout` | `RATE_LIMITED` | `error-banner`, form giữ nguyên, không tạo đơn, không trừ kho. `[ASSUMPTION: A14]` |
| `/orders` | Mặc định | Form trống hoặc Mã đơn điền sẵn. |
| `/orders` | Đang gửi | Nút gửi disabled để chống bấm đúp. `[ASSUMPTION: A18]` |
| `/orders` | Sai thông tin hoặc bị chặn | Cùng một câu `Thông tin không đúng`. Giữ Mã đơn. |
| `/orders` | Đơn cũ không chuyển sang DB | Như sai thông tin. |
| `/orders` | Lỗi mạng hoặc máy chủ | `error-banner` `Chưa thực hiện được. Vui lòng thử lại.`, giữ dữ liệu đã nhập. Không dùng `Thông tin không đúng`. `[ASSUMPTION: A14]` |
| `/orders/:id` | Đang tải | Khung chờ `{colors.surface-skeleton}`. `[ASSUMPTION: A18]` |
| `/orders/:id` | Lỗi tải | Báo `Chưa thực hiện được. Vui lòng thử lại.`, cho thử lại. `[ASSUMPTION: A14]` |
| `/orders/:id` | Không có quyền, cookie sai hoặc hết hạn | Chuyển tới `/orders` với Mã đơn điền sẵn, không tự chuyển ngược lại. |
| `/orders/:id` | Vừa đặt | `success-banner` với `Đặt hàng thành công`. |
| `/orders/:id` | Tải lại | Giữ nguyên nội dung nhờ Quyền xem đơn. |
| `/orders/:id` | 5 Trạng thái | Theo bảng "Những gì Khách hàng thấy". |
| `/orders/:id` | Sau Lùi đơn | Đang giao, giờ Đang giao ban đầu, mốc Đã giao là `chưa tới`. |
| `/staff/login` | Đang gửi | Nút đăng nhập disabled để chống bấm đúp. `[ASSUMPTION: A18]` |
| `/staff/login` | Đã đăng nhập | Chuyển về `/staff`. |
| `/staff/login` | Sai, bị chặn | `error-banner`, giữ tên đăng nhập, xóa mật khẩu. `[ASSUMPTION: A14]` |
| `/staff/login` | Lỗi mạng hoặc máy chủ | `error-banner` `Chưa thực hiện được. Vui lòng thử lại.`, giữ tên đăng nhập. `[ASSUMPTION: A14]` |
| Khu nhân viên | Chưa đăng nhập, hết phiên | Về `/staff/login`. Đăng nhập lại thì về đúng trang đang xem, kể cả đơn ở `/staff/orders/:id`. Chỉ nhận đích nội bộ trong `/staff`. `[ASSUMPTION: A14]` cho câu báo |
| Khu nhân viên | Sai vai (403) | Nút đã ẩn. Nếu vẫn gặp 403: đóng hộp thoại nếu đang mở, hiện `error-banner` đầu trang, tải lại đơn. `[ASSUMPTION: A14]` |
| `/staff` | Đang tải | Khung chờ `{colors.surface-skeleton}`. `[ASSUMPTION: A18]` |
| `/staff` | Lỗi tải danh sách hoặc kết quả tìm | `error-banner` `Chưa thực hiện được. Vui lòng thử lại.`, cho thử lại. `[ASSUMPTION: A14]` |
| `/staff` | Đang tìm | Khung chờ `{colors.surface-skeleton}`. `[ASSUMPTION: A18]` |
| `/staff` | Đang xem kết quả tìm | Tab trước đó vẫn được đánh dấu, kết quả ở vùng riêng. |
| `/staff` | Gửi ô tìm rỗng | Bỏ kết quả, trở về tab trước đó. |
| `/staff` | Tải lại trang | Mất từ khóa, về tab mặc định. |
| `/staff` | Tab trống | `empty-state`. `[ASSUMPTION: A15]` |
| `/staff` | Tìm không có kết quả | `Không tìm thấy đơn` và `Xóa tìm kiếm`; bấm nút quay về tab trước đó. |
| `/staff` | Đơn quá 24 giờ | Đầu danh sách, có `overdue-label`. |
| `/staff` | Dữ liệu cũ | Không tự làm mới theo thời gian thực. Cập nhật sau thao tác, khi đổi tab hoặc tải lại trang. |
| `/staff/orders/:id` | Đang tải | Khung chờ. `[ASSUMPTION: A18]` |
| `/staff/orders/:id` | Lỗi tải | `error-banner` `Chưa thực hiện được. Vui lòng thử lại.`, cho thử lại. `[ASSUMPTION: A14]` |
| `/staff/orders/:id` | Không tồn tại | `Không tìm thấy đơn`, link `Danh sách`. `[ASSUMPTION: A14]` |
| `/staff/orders/:id` | Đang gửi thao tác | Nút disabled để chống bấm đúp. |
| `/staff/orders/:id` | Thành công | `toast` `Đã chuyển đơn #{Mã đơn} sang {Trạng thái}`, dữ liệu cập nhật ngay. |
| `/staff/orders/:id` | Thành công, `Đã xử lý hoàn tiền` | `toast` hoàn tiền, `refund-flag-label` đổi sang `Đã xử lý hoàn tiền`, Lịch sử có dòng kết quả. |
| `/staff/orders/:id` | Đã ghi `Khách chưa chuyển tiền`, vai Quản lý | Hiện `Ghi thêm: Đã hoàn tiền`; bấm mở `action-dialog` không cần chọn kết quả. `[ASSUMPTION: A23]` |
| `/staff/orders/:id` | Thành công, ghi thêm `Đã hoàn tiền` | `toast` hoàn tiền, Lịch sử thêm dòng mới và giữ dòng cũ, nhãn giữ `Đã xử lý hoàn tiền`, nút đổi thành `Đính chính: Khách chưa chuyển tiền`. `[ASSUMPTION: A23]` |
| `/staff/orders/:id` | Thành công, đính chính | Lịch sử thêm dòng đính chính kèm lý do và giữ dòng cũ, nhãn giữ `Đã xử lý hoàn tiền`, nút đổi thành `Ghi thêm: Đã hoàn tiền`. `[ASSUMPTION: A24]` |
| `/staff/orders/:id` | Ghi kết quả hoàn tiền trùng | Server chỉ nhận lần ghi đầu và trả lỗi xung đột (không dùng `INVALID_STATUS_TRANSITION` vì Trạng thái không đổi). Giao diện xử lý như Xung đột đồng thời. |
| `/staff/orders/:id` | Xung đột đồng thời | Đóng hộp thoại nếu đang mở, hiện `error-banner` đầu trang `Đơn vừa được người khác cập nhật`, tải lại Trạng thái mới nhất. Không ghi dòng Lịch sử cho bên thua. |
| `/staff/orders/:id` | Lỗi mạng hoặc máy chủ | Trong hộp thoại: giữ hộp thoại và lý do đã chọn, hiện `error-banner` trong hộp thoại, cho thử lại. Thao tác một lần bấm: hiện `error-banner` đầu trang. `[ASSUMPTION: A14]` |
| Hộp thoại lý do | Thiếu lý do | Báo lỗi tại trường, không gửi. `[ASSUMPTION: A14]` |
| Hộp thoại có dữ liệu đã nhập | Bấm `Esc` | Hỏi lại theo `action-dialog`. `Tiếp tục nhập` giữ nguyên dữ liệu, `Bỏ` đóng hộp thoại. `[ASSUMPTION: A22]` |
| Hộp thoại Hủy | Chọn `Hết hàng` | Ghi chú đổi sang câu không hoàn Tồn kho. Đổi sang lý do khác thì ghi chú trở lại. |
| Hộp thoại Hủy | Chọn `Khác` | Hiện ô `Nhập lý do` và câu nhắc `Nếu hết hàng, hãy chọn lý do Hết hàng`. Tồn kho vẫn được hoàn. |
| Hộp thoại Hủy | Đơn COD | Không hiện câu về Cờ cần hoàn tiền. |
| Hộp thoại hoàn tiền | Chưa chọn kết quả | Báo `Vui lòng chọn kết quả.` tại trường, không gửi. |

### Điều hướng sau thao tác

| Thao tác | Sau khi thành công |
|---|---|
| Hủy đơn | Về danh sách, giữ tab trước đó; `toast` vẫn hiện sau khi chuyển trang `[ASSUMPTION: A8]` `[ASSUMPTION: A19]` |
| Lùi đơn | Ở lại Chi tiết đơn, thấy dòng Lịch sử mới |
| Xác nhận đơn, Chuyển Đang giao, Đánh dấu Đã giao | Ở lại Chi tiết đơn `[ASSUMPTION: A8]` |
| Đã xử lý hoàn tiền | Ở lại Chi tiết đơn; đơn rời tab Cần hoàn tiền, vẫn ở tab Đã hủy, với cả hai kết quả `[ASSUMPTION: A10]` |
| Ghi thêm kết quả hoàn tiền | Ở lại Chi tiết đơn; đơn vẫn ở tab Đã hủy `[ASSUMPTION: A23]` |

## Interaction Primitives

- **Chuột và chạm:** bấm để thao tác. Không có hành vi chỉ xuất hiện khi hover. Không dùng vuốt hay kéo thả.
- **Bàn phím:** `Tab` theo thứ tự đọc, `Enter` gửi form, `Esc` theo `action-dialog`, phím mũi tên chọn radio và di chuyển focus trong `order-tabs`.
- **Xác nhận:** đổi Trạng thái tiến một bước dùng một lần bấm, trừ Đã giao. Thao tác khó đảo ngược (Đã giao, Hủy, Lùi đơn, Đã xử lý hoàn tiền, ghi thêm kết quả) đi qua `action-dialog`.
- **Cập nhật:** làm mới theo thao tác, không polling, không realtime.
- **Bảo mật URL:** số điện thoại không bao giờ lên URL, kể cả ô tìm của nhân viên.
- **Không làm:** hàng loạt thao tác, sửa Lịch sử, Khách hàng tự hủy đơn, tự động hủy đơn, cuộn ngang.

## Accessibility Floor

Tương phản màu nằm trong DESIGN.md.

- Mục tiêu WCAG 2.2 AA cho [màn hình mới](DESIGN.md#phạm-vi-màn-hình-mới). Màu viền focus, viền ô nhập và viền lỗi nằm trong DESIGN.md. `[ASSUMPTION: A3]`
- Trạng thái và cảnh báo luôn có chữ, không chỉ dựa vào màu (NFR của PRD).
- Mọi form và hộp thoại dùng được hoàn toàn bằng bàn phím (NFR của PRD).
- `action-dialog` dùng `role="dialog"`, `aria-modal`, `aria-labelledby`; focus vào phần tử đầu tiên, khi đóng trả về nút đã mở.
- Nút vừa bấm hoặc nút đã mở hộp thoại biến mất thì focus về tiêu đề đơn (`h1` có `tabindex="-1"`). Sau Hủy đơn, người dùng về danh sách và focus chuyển vào tab đang chọn.
- Lời hỏi `Bỏ nội dung đã nhập?` dùng `role="alertdialog"`, focus vào `Tiếp tục nhập`.
- Lý do là `fieldset` có `legend`; lỗi nối với trường bằng `aria-describedby`.
- `order-tabs` theo mẫu `tablist` kích hoạt thủ công; `tab-count` có tên đọc được, ví dụ "Cần hoàn tiền, 3 đơn".
- `toast` dùng `role="status"`; lỗi dùng `role="alert"`.
- `status-timeline` là danh sách có thứ tự; mốc hiện tại có `aria-current="step"`.
- `tel-link` có nhãn, ví dụ "Gọi khách {tên}".
- Vùng bấm theo DESIGN.md, mục [Layout & Spacing](DESIGN.md#layout--spacing).
- Không dùng `{colors.ink-placeholder}` cho nội dung cần đọc.

## Responsive & Platform

Desktop và mobile được thiết kế ngang nhau. Chiều rộng tối thiểu `{spacing.viewport-min}`.

| Surface | 390px đến dưới `md` | Từ `md` (768px) `[ASSUMPTION: A2]` |
|---|---|---|
| `staff-header` | Logo, tên, Đăng xuất trên một hàng | Như mobile, trong khung `{spacing.container-max}` |
| `/staff` | Ô tìm và nút `Tìm` trên một hàng, 4 tab một hàng, `order-row` xếp dọc | Ô tìm và nút `Tìm`, 4 tab, `order-table` 5 cột |
| `/staff/orders/:id` | Một cột, thao tác sau phần thông tin | Thao tác ở đầu trang, 2 thẻ thông tin, Lịch sử dạng bảng |
| `action-dialog` | Canh giữa, lề `{spacing.page-gutter}` | Rộng tối đa `{spacing.dialog-max}` |
| `/orders/:id` | Một cột: Mã đơn, chuyển khoản, đơn hàng, Trạng thái, liên hệ | Lưới 2 cột từ `sm` (640px) như trang đơn hiện có, không thuộc A2 |
| `/checkout` | Form và tóm tắt xếp dọc | Lưới `1fr 380px` từ `lg` (1024px) như hiện có, không thuộc A2 |

Cặp nút theo [Vùng hai nút](DESIGN.md#vùng-hai-nút). Chỉ có giao diện sáng. Không hỗ trợ ngoại tuyến; mất mạng được xử lý như lỗi gửi. `tel:` trên desktop tùy trình duyệt, số vẫn đọc và chép được.

## Key Flows

### UJ-1. Thảo xử lý hàng đợi đầu ca

Thảo là Nhân viên, vào ca lúc 8 giờ, dùng điện thoại.

Hình tham chiếu: [Hàng đợi](mockups/key-staff-queue.html), [luồng nhân viên](wireframes/flow-staff-2026-11-21.excalidraw).

1. Thảo gõ `/staff`, được đưa tới `/staff/login`, đăng nhập bằng Tài khoản riêng.
2. Tab Cần xử lý mở sẵn. Đơn chuyển khoản chờ quá 24 giờ nằm trên cùng với `overdue-label`.
3. Thảo mở đơn đó, bấm `tel-link` để gọi khách. Khách báo không mua nữa.
4. Thảo bấm `Hủy đơn`, chọn `Khách đổi ý`, bấm `Hủy đơn` trong hộp thoại.
5. Tồn kho được hoàn, Cờ cần hoàn tiền bật. Thảo về danh sách và thấy `Đã chuyển đơn #{Mã đơn} sang Đã hủy`. Số đếm ở tab Cần hoàn tiền tăng.
6. Thảo mở từng đơn còn lại, bấm `Xác nhận đơn`, rồi `Chuyển Đang giao`.
7. **Cao trào:** tab Cần xử lý không còn đơn Chờ xác nhận hay Đã xác nhận, chỉ còn đơn Đang giao. Lịch sử của mỗi đơn đều có tên Thảo.

**Edge case:** Thảo và đồng nghiệp cùng bấm `Xác nhận đơn`. Một người thành công. Người chậm hơn thấy `Đơn vừa được người khác cập nhật`, màn hình tải lại Trạng thái mới nhất, không có dòng Lịch sử thừa.

**Edge case, hủy vì hết hàng:** Thảo chọn `Hết hàng`, hộp thoại đổi ghi chú thành không hoàn Tồn kho cho toàn bộ đơn. Sau khi hủy, Tồn kho của mọi sản phẩm trong đơn giữ nguyên; đơn chuyển khoản vẫn bật Cờ cần hoàn tiền. Nếu Thảo chọn `Khác`, hộp thoại nhắc `Nếu hết hàng, hãy chọn lý do Hết hàng`; giữ `Khác` thì Tồn kho vẫn được hoàn và SM-C1 không đếm.

**Lỗi:** mất mạng khi hủy thì hộp thoại và lý do vẫn còn để Thảo thử lại; Trạng thái, Tồn kho và Lịch sử không đổi.

### UJ-2. Nam chuyển khoản rồi tự theo dõi đơn

Nam đặt một bàn phím trên điện thoại, chọn chuyển khoản.

Hình tham chiếu: [Trang xác nhận](mockups/key-order-confirmation.html), [luồng khách hàng](wireframes/flow-customer-2026-11-21.excalidraw).

1. Nam điền form ở `/checkout` với số `0...` và bấm `Đặt hàng`.
2. Trang xác nhận hiện `Đặt hàng thành công`, Mã đơn nổi bật với `Sao chép Mã đơn`, số tiền, số tài khoản và nội dung chuyển khoản.
3. Nam sao chép Mã đơn, chuyển khoản, tải lại trang và thông tin vẫn còn.
4. Hôm sau, trên máy khác, Nam vào "Đơn hàng", nhập Mã đơn và số ở dạng `+84...`.
5. Tra đơn thành công, Nam tới `/orders/:id`. Số điện thoại không lên URL.
6. **Cao trào:** Nam thấy Đang giao, các mốc thời gian và câu `Đơn đang trên đường giao đến bạn.`, nên không cần gọi shop.

**Edge case, thiếu hàng:** bàn phím vừa hết lúc Nam bấm `Đặt hàng`. Form giữ nguyên, dòng thiếu hiện `Bạn chọn 2 · Chỉ còn N` với `Lấy N` và `Bỏ`. N=0 thì chỉ có `Hết hàng` và `Bỏ`. Giỏ và tổng tiền cập nhật, Nam đặt tiếp ngay tại đó.

**Lỗi:** nhập sai thì thấy `Thông tin không đúng`. Mất Mã đơn thì gọi shop, vì không có danh sách đơn gần đây.

### UJ-3. Khoa sửa một đơn bị bấm nhầm "Đã giao"

Khoa là Quản lý kiêm chủ shop. Khách gọi báo chưa nhận được hàng dù trang ghi Đã giao.

Hình tham chiếu: [Chi tiết đơn nhân viên](mockups/key-staff-order-detail.html), [luồng nhân viên](wireframes/flow-staff-2026-11-21.excalidraw).

1. Khoa mở `/staff`, nhập số điện thoại khách vào `order-search`. Kết quả tìm trên mọi tab.
2. Khoa mở đơn. `history-list` cho biết Nhân viên nào đã bấm Đã giao, lúc nào.
3. Khoa bấm `Lùi đơn về Đang giao (Quản lý)`.
4. Khoa chọn `Bấm nhầm, hàng còn trên xe`, bấm `Lùi đơn`.
5. Khoa ở lại Chi tiết đơn, thấy `Đã chuyển đơn #{Mã đơn} sang Đang giao` và dòng Lịch sử mới kèm lý do.
6. **Cao trào:** Khách hàng thấy lại Đang giao với giờ Đang giao ban đầu và không thấy mốc Đã giao đã bị sửa. Lịch sử giữ cả dòng cũ và dòng sửa. Tồn kho không đổi.

**Edge case:** Nhân viên mở cùng đơn thì không thấy nút Lùi đơn. Gọi thẳng API nhận 403.

**Lỗi:** mất mạng khi Lùi đơn thì hộp thoại và lý do vẫn còn để Khoa thử lại; Trạng thái, Tồn kho và Lịch sử không đổi.

**Sau đó:** khi hàng tới nơi, đơn đi lại bước Đánh dấu Đã giao có hộp thoại; mốc Đã giao dùng giờ của lần giao mới nhất.

**Luồng phụ, hoàn tiền (FR-21):** Khoa mở tab Cần hoàn tiền, mở đơn có nhãn `Cần hoàn tiền` và đối soát sao kê. Nếu khách đã chuyển, Khoa hoàn tay ngoài hệ thống rồi bấm `Đã xử lý hoàn tiền`, chọn `Đã hoàn tiền`. Nếu sao kê không có khoản này, Khoa bấm `Đã xử lý hoàn tiền`, chọn `Khách chưa chuyển tiền`. Sau khi xác nhận, Lịch sử ghi kết quả, nhãn đổi thành `Đã xử lý hoàn tiền`, đơn rời tab Cần hoàn tiền; mốc thời gian khách thấy không đổi.

**Luồng phụ, khách chuyển khoản muộn:** đơn đã ghi `Khách chưa chuyển tiền`, sau đó sao kê có khoản tiền. Khoa tìm đơn ở tab Đã hủy hoặc `order-search`, hoàn tay ngoài hệ thống, bấm `Ghi thêm: Đã hoàn tiền` và xác nhận. Lịch sử có thêm dòng `Đã xử lý hoàn tiền: Đã hoàn tiền`, dòng cũ vẫn giữ. `[ASSUMPTION: A23]`

## Trạng thái, chuyển đổi và quyền

### Bảng chuyển Trạng thái

| Từ | Sang | Ai | Xác nhận | Lý do | Tồn kho | Cờ cần hoàn tiền |
|---|---|---|---|---|---|---|
| Chờ xác nhận | Đã xác nhận | Nhân viên, Quản lý | Một lần bấm | Không | Không đổi | Không đổi |
| Đã xác nhận | Đang giao | Nhân viên, Quản lý | Một lần bấm | Không | Không đổi | Không đổi |
| Đang giao | Đã giao | Nhân viên, Quản lý | Hộp thoại, hiện Mã đơn và tên người nhận | Không | Không đổi | Không đổi |
| Chờ xác nhận, Đã xác nhận | Đã hủy, mã lý do khác `out_of_stock` | Nhân viên, Quản lý | Hộp thoại | Bắt buộc | Hoàn đúng một lần | Bật nếu chuyển khoản |
| Chờ xác nhận, Đã xác nhận | Đã hủy, lý do `Hết hàng` (mã `out_of_stock`) | Nhân viên, Quản lý | Hộp thoại, nói rõ không hoàn Tồn kho | Bắt buộc | **Không hoàn cho toàn bộ đơn** | Bật nếu chuyển khoản |
| Đã giao | Đang giao (Lùi đơn) | Chỉ Quản lý | Hộp thoại | Bắt buộc | Không đổi | Không đổi |

Mọi chuyển đổi khác bị từ chối. Đã hủy là trạng thái cuối. Không có hủy từ Đang giao.

### Mã lý do Hủy

Server nhận mã lý do cố định; nhãn tiếng Việt chỉ để hiển thị.

- Chỉ lý do có sẵn `Hết hàng`, lưu bằng mã `out_of_stock`, mới bỏ qua việc hoàn Tồn kho và được SM-C1 đếm.
- `Khác` lưu mã `other` kèm chữ đã nhập. Gõ "hết hàng" vào ô này vẫn hoàn Tồn kho và không được SM-C1 đếm.

### Rủi ro đã chấp nhận

- Hủy với mã `out_of_stock` không hoàn Tồn kho cho mọi sản phẩm trong đơn, kể cả sản phẩm thực tế vẫn còn. Các sản phẩm đó có thể bị bán thiếu.
- Không hoàn kho chỉ tránh cộng thêm, không gỡ được số ảo đã có. SM-2 đo trên số của hệ thống nên có thể vẫn bằng 0 khi hàng thực tế đã lệch.
- MVP **không có công cụ chỉnh Tồn kho**. Tồn kho sai được sửa tay trong database.

### Thao tác hiển thị theo Trạng thái và vai

| Trạng thái | Nhân viên | Quản lý |
|---|---|---|
| Chờ xác nhận | `Xác nhận đơn`, `Hủy đơn` | Như Nhân viên |
| Đã xác nhận | `Chuyển Đang giao`, `Hủy đơn` | Như Nhân viên |
| Đang giao | `Đánh dấu Đã giao` | Như Nhân viên |
| Đã giao | Không có nút, chỉ xem | `Lùi đơn về Đang giao (Quản lý)` |
| Đã hủy, không có cờ | Không có nút | Không có nút |
| Đã hủy, cờ đang bật | Không có nút `[ASSUMPTION: A10]` | `Đã xử lý hoàn tiền` |
| Đã hủy, kết quả mới nhất `Khách chưa chuyển tiền` | Không có nút | `Ghi thêm: Đã hoàn tiền` `[ASSUMPTION: A23]` |
| Đã hủy, kết quả mới nhất `Đã hoàn tiền` | Không có nút | `Đính chính: Khách chưa chuyển tiền` `[ASSUMPTION: A24]` |

Nhân viên **không thấy** nút Lùi đơn, kể cả ở dạng vô hiệu. Server vẫn trả 403 nếu Nhân viên gọi thao tác của Quản lý.

### Kết quả xử lý hoàn tiền

`Đã hoàn tiền` và `Khách chưa chuyển tiền` là ghi chú xử lý của Quản lý trong Lịch sử, **không phải trạng thái thanh toán**, và Khách hàng không thấy. Ghi chú chỉ quyết định đơn có rời tab Cần hoàn tiền và có được ghi thêm kết quả hay không.

| Kết quả mới nhất | `refund-flag-label` | Trong tab Cần hoàn tiền | Thao tác của Quản lý |
|---|---|---|---|
| Chưa có | `Cần hoàn tiền` | Có | `Đã xử lý hoàn tiền` |
| `Khách chưa chuyển tiền` | `Đã xử lý hoàn tiền` | Không | `Ghi thêm: Đã hoàn tiền` |
| `Đã hoàn tiền` | `Đã xử lý hoàn tiền` | Không | `Đính chính: Khách chưa chuyển tiền` |

Ghi thêm và đính chính đều tạo một dòng Lịch sử mới, dòng cũ vẫn giữ. Đính chính bắt buộc có lý do. Đơn không quay lại tab Cần hoàn tiền, Khách hàng không thấy các dòng này.

### Những gì Khách hàng thấy theo Trạng thái

| Trạng thái | Bước kế tiếp | Liên hệ | Thông tin chuyển khoản |
|---|---|---|---|
| Chờ xác nhận | `Shop sẽ kiểm tra và xác nhận đơn của bạn.` | `Muốn hủy đơn, liên hệ shop:` {số} | Có, nếu chuyển khoản |
| Đã xác nhận | `Shop đang chuẩn bị hàng để giao.` | `Muốn hủy đơn, liên hệ shop:` {số} | Không |
| Đang giao | `Đơn đang trên đường giao đến bạn.` | `Cần hỗ trợ, gọi shop:` {số} `[ASSUMPTION: A13]` | Không |
| Đã giao | `Chưa nhận được hàng? Gọi shop qua {số}.` | Số nằm trong câu | Không |
| Đã hủy, COD | `Đơn đã hủy. Cần hỗ trợ, vui lòng liên hệ shop qua {số}.` | Số nằm trong câu | Không |
| Đã hủy, chuyển khoản | `Đơn đã hủy. Nếu bạn đã chuyển khoản, vui lòng liên hệ shop qua {số}.` | Số nằm trong câu | Không |

`{số}` lấy từ `SHOP_CONTACT_PHONE`. Số tài khoản cũng lấy từ biến cấu hình, giá trị thật chưa có và không chặn UX.

### Quy tắc mốc thời gian phía Khách hàng

- Chờ xác nhận: thời điểm tạo đơn.
- Đã xác nhận: dòng Lịch sử chuyển sang Đã xác nhận.
- **Đang giao: luôn là giờ của dòng `Đã xác nhận → Đang giao` ban đầu.** Dòng Lùi đơn không đổi mốc này.
- Đã giao: dòng chuyển sang Đã giao mới nhất, nếu đơn đang ở Đã giao. Sau Lùi đơn, mốc này trở về `chưa tới`. Khi giao lại, mốc dùng giờ của lần giao mới nhất.
- Đã hủy: dòng chuyển sang Đã hủy. Dòng kết quả xử lý hoàn tiền, kể cả dòng ghi thêm, **không** đổi mốc nào.
- Đơn Đã hủy chỉ hiện các mốc đã qua và mốc Đã hủy. `[ASSUMPTION: A16]`

### Che thông tin khách

Dạng hiển thị: `Ng***` và `090****001`. Việc che thực hiện ở server trước khi trả về.

- **Tên:** từ 3 ký tự giữ 2 ký tự đầu rồi thêm `***`. Tên 1-2 ký tự chỉ giữ ký tự đầu rồi thêm `***`, ví dụ `An` thành `A***`.
- **Số điện thoại:** chuẩn hóa về dạng `0...` trước khi che, rồi giữ 3 số đầu, `****`, 3 số cuối. Ví dụ `+84900000001` thành `090****001`.

## Thay đổi cần cập nhật ở PRD

| # | Vị trí trong PRD | PRD hiện ghi | Quyết định UX | Việc cần làm |
|---|---|---|---|---|
| 1 | Addendum, bản đồ route | Chỉ có `/staff`, `/staff/login` | Thêm **`/staff/orders/:id`** chứa thông tin đơn, thao tác, Lịch sử | Thêm route |
| 2 | FR-9, mục 3 (Hàng đợi, Trang nhân viên) | Chỉ có Hàng đợi | Thêm **ô tìm** theo Mã đơn hoặc số điện thoại trên mọi tab, và **4 tab**: Cần xử lý, Đã giao, Đã hủy, Cần hoàn tiền | Thêm FR hoặc mở rộng FR-9; thêm `Danh sách đơn`, `Chi tiết đơn` và tên 4 tab vào Glossary; bổ sung API danh sách và tìm kiếm không đưa số điện thoại lên URL |
| 3 | FR-7 | Số shop chỉ hiện ở Chờ xác nhận, Đã xác nhận, đơn chuyển khoản đã hủy | **Số shop hiện ở mọi Trạng thái**, câu hướng dẫn đổi theo Trạng thái | Sửa FR-7 và thêm câu chữ đã chốt |
| 4 | Mục 3, FR-2, FR-5, FR-6 | Dữ liệu tối thiểu chỉ gồm Trạng thái, mốc, tên sản phẩm, tên và số đã che; mâu thuẫn với Trang xác nhận | **Định nghĩa lại Dữ liệu tối thiểu:** Trạng thái, mốc thời gian, sản phẩm, tổng tiền, phương thức, thông tin chuyển khoản khi còn Chờ xác nhận, tên và số đã che, số shop; không có địa chỉ đầy đủ. Tra đơn và Trang xác nhận dùng chung một trang | Sửa glossary và FR-2 |
| 5 | FR-19 | Chỉ cho bỏ dòng thiếu | Thêm **giảm số lượng** bằng `Lấy N`; N=0 chỉ có `Hết hàng` và `Bỏ`; giỏ hàng cập nhật theo. **`INSUFFICIENT_STOCK` phải trả mọi dòng thiếu** kèm `productId`, số yêu cầu, số còn lại | **Bắt buộc** sửa FR-19. Code hiện dừng ở dòng thiếu đầu tiên (`src/features/orders/order-service.ts:70-75`), cần đổi khi build |
| 6 | FR-21, FR-14, FR-7, §9 | "Đánh dấu đã xử lý, ghi Lịch sử"; "Hệ thống không lưu trạng thái đã thanh toán"; mốc lấy dòng Lịch sử mới nhất của Trạng thái | Thao tác **`Đã xử lý hoàn tiền`** với hai kết quả `Đã hoàn tiền` / `Khách chưa chuyển tiền`; chỉ Quản lý, nút ở Chi tiết đơn, có hộp xác nhận. Kết quả là **ghi chú xử lý trong Lịch sử, không phải trạng thái thanh toán**, Khách hàng không thấy, chỉ quyết định việc rời tab Cần hoàn tiền và ghi thêm. Sau `Khách chưa chuyển tiền`, Quản lý được ghi thêm `Đã hoàn tiền`, dòng cũ vẫn giữ. Nhãn `Cần hoàn tiền` / `Đã xử lý hoàn tiền` trên dòng, bảng và Chi tiết đơn; COD không có nhãn. **Dòng hoàn tiền không đổi mốc khách thấy** | **Bắt buộc** sửa FR-21, gồm câu thành: "Hệ thống không lưu trạng thái thanh toán và không chuyển tiền; kết quả xử lý hoàn tiền chỉ là ghi chú của Quản lý trong Lịch sử". FR-7 loại dòng này khi tính mốc; FR-14 nêu cách ghi dòng không đổi Trạng thái; cập nhật §9 |
| 7 | FR-7 | Mỗi mốc lấy từ dòng Lịch sử mới nhất của Trạng thái đó | Sau Lùi đơn, **mốc Đang giao giữ giờ ban đầu**, không lấy giờ của dòng Lùi đơn | Thêm ngoại lệ vào FR-7 |
| 8 | FR-12, FR-13, addendum `order_status_history` | Bắt buộc có lý do, chưa có danh sách; cột `lý do` dạng chữ | Danh sách lý do có sẵn kèm `Khác` bắt buộc nhập. **Lý do Hủy lưu bằng mã cố định**: `Hết hàng` là `out_of_stock`, `Khác` là `other` kèm chữ | Bổ sung danh sách và cột mã lý do |
| 9 | FR-9 | Nhân viên xem được số điện thoại | Số khách trên trang nhân viên bấm để gọi | Bổ sung |
| 10 | FR-13 | Nhân viên gọi thao tác nhận 403 | Thêm: Nhân viên không thấy nút Lùi đơn | Bổ sung |
| 11 | FR-10 | Bên thua nhận `INVALID_STATUS_TRANSITION` | Giữ mã lỗi; giao diện báo `Đơn vừa được người khác cập nhật` và tải lại | Bổ sung câu chữ |
| 12 | FR-2 | Tên và số điện thoại được che | Chốt dạng `Ng***` và `090****001`; tên 1-2 ký tự giữ ký tự đầu; số chuẩn hóa về `0...` trước khi che | Bổ sung |
| 13 | Addendum, `PATCH /api/orders/:id` | Theo FR-10, FR-12, FR-13 | Cần thêm đường cho `Đã xử lý hoàn tiền` và ghi thêm `Đã hoàn tiền` của Quản lý. Đính chính về `Khách chưa chuyển tiền` kèm lý do. Mỗi thao tác chỉ hợp lệ theo kết quả mới nhất, lần ghi trùng nhận lỗi xung đột | Kiến trúc chốt |
| 14 | FR-17 | Luôn hoàn Tồn kho đúng một lần khi hủy; Tồn kho sau khi hoàn bằng số trước khi đặt | Hủy với mã **`out_of_stock` không hoàn Tồn kho cho toàn bộ đơn**; mọi mã khác, kể cả `other`, vẫn hoàn đúng một lần | **Bắt buộc** thêm ngoại lệ theo mã vào FR-17 và consequence kiểm thử tương ứng |
| 15 | §4.6, mô tả | Tồn kho "hoàn khi hủy" | Hoàn khi hủy, trừ mã `out_of_stock` | Sửa câu mô tả |
| 16 | §4.8, Thay đổi có chủ đích | "Tồn kho trừ khi đặt và hoàn khi hủy" | Như dòng 15 | Sửa dòng bảng |
| 17 | FR-12 | Trạng thái, Tồn kho và Lịch sử đổi trong cùng giao dịch | Với `out_of_stock`, Tồn kho không đổi; Trạng thái và Lịch sử vẫn trong cùng giao dịch | Sửa consequence |
| 18 | §6.3 | Chưa có rủi ro về Tồn kho khi hủy | Thêm các mục ở [Rủi ro đã chấp nhận](#rủi-ro-đã-chấp-nhận): bán thiếu sản phẩm khác trong đơn, số ảo không gỡ được, **không có công cụ chỉnh Tồn kho, sửa tay trong database** | **Bắt buộc** bổ sung §6.3 |
| 19 | Addendum, bảng thay đổi code (`order-service.ts:121`) | "Chuyển trạng thái có hoàn kho" | Hoàn kho theo mã lý do | Sửa dòng |
| 20 | Mục 3, Quản lý | Làm được việc của Nhân viên và Lùi đơn | Thêm `Đã xử lý hoàn tiền` và ghi thêm kết quả | Sửa Glossary |
| 21 | Mục 3, Cờ cần hoàn tiền | Đánh dấu đơn cần xử lý tiền ngoài hệ thống | Thêm tình trạng đã xử lý và hai kết quả là ghi chú trong Lịch sử | Sửa Glossary |
| 22 | FR-6 | Số tiền, số tài khoản, nội dung | Thêm hàng Ngân hàng `[ASSUMPTION: A6]` | Bổ sung |
| 23 | FR-8 | Không có quyền thì chuyển tới đăng nhập | Đăng nhập lại về đúng trang đang xem, chỉ nhận đích nội bộ trong `/staff`; đã đăng nhập vào `/staff/login` thì về `/staff` | Bổ sung |
| 24 | §7, SM-C1 | Tỷ lệ đơn hủy do hết hàng | Chỉ đếm đơn có mã `out_of_stock` | Sửa cách đo |

## Assumptions

Các giả định dưới đây giữ thẻ `[ASSUMPTION]` để xem lại ở bước sau. A1, A11, A20 và phần câu chữ của A10 đã thành quyết định nên không còn thẻ; số cũ không đánh lại. Người dùng đã duyệt A23 ngày 2026-11-21. A24 chỉ là câu chữ của thao tác đính chính đã được duyệt.

| ID | Giả định |
|---|---|
| A2 | Điểm chuyển bố cục danh sách, chi tiết và Lịch sử là `md` (768px) |
| A3 | Mục tiêu WCAG 2.2 AA cho màn hình mới |
| A4 | Thứ tự tab: Đã giao, Đã hủy theo thay đổi mới nhất trước; Cần hoàn tiền theo cũ nhất trước |
| A5 | Tìm khớp chính xác Mã đơn (không phân biệt hoa thường) hoặc số điện thoại đã chuẩn hóa; kết quả gộp mọi nhóm, mới nhất trước; quay lại từ Chi tiết đơn giữ tab và từ khóa trong bộ nhớ |
| A6 | Giữ hàng Ngân hàng trong `bank-transfer-card` như code và mock, dù FR-6 không liệt kê |
| A7 | `tab-count` dạng viên thuốc, đếm đơn có cờ chưa xử lý, độc lập với tìm kiếm, ẩn khi bằng 0 |
| A8 | Sau Hủy về danh sách (theo wireframe); sau Xác nhận, Chuyển Đang giao, Đánh dấu Đã giao ở lại Chi tiết đơn |
| A9 | Nhãn `Chuyển Đang giao`, `Đánh dấu Đã giao`, nội dung hộp thoại Đã giao; bấm nền không đóng hộp thoại khi đã nhập |
| A10 | Nhân viên xem được tab Cần hoàn tiền nhưng không thấy nút; đơn rời tab sau khi xử lý |
| A12 | Phản hồi sao chép Mã đơn |
| A13 | Câu liên hệ ở Đang giao lấy từ mock; số shop trên Trang xác nhận là `tel-link` |
| A14 | Câu lỗi đăng nhập, hết phiên, 403, lỗi mạng, `RATE_LIMITED`, không tìm thấy đơn, thiếu lý do, thiếu trường Tra đơn |
| A15 | Câu trạng thái trống của từng tab |
| A16 | Đơn Đã hủy chỉ hiện các mốc đã qua và mốc Đã hủy |
| A17 | `Đặt hàng` disabled đến khi xử lý hết dòng thiếu; bỏ hết thì về trạng thái giỏ trống hiện có |
| A18 | Khung chờ dùng mẫu `animate-pulse` hiện có; nút disabled khi đang gửi |
| A19 | Thời lượng và vị trí `toast` do triển khai chọn, không chặn thao tác |
| A21 | Khi xem kết quả tìm kiếm, kích hoạt tab khác hoặc chính tab đang đánh dấu thì rời kết quả và xóa từ khóa; vùng kết quả có nhãn `Kết quả tìm kiếm` |
| A22 | Cách hỏi lại khi `Esc`: hiện ngay trong hộp thoại với câu `Bỏ nội dung đã nhập?`, nút `Tiếp tục nhập`, `Bỏ` |
| A23 | Thao tác ghi thêm: nhãn `Ghi thêm: Đã hoàn tiền`, câu chữ hộp thoại, dùng `button-primary`, chỉ đi từ `Khách chưa chuyển tiền` sang `Đã hoàn tiền`, đơn không quay lại tab Cần hoàn tiền |
| A24 | Câu chữ thao tác đính chính: nút `Đính chính: Khách chưa chuyển tiền`, nội dung hộp thoại, dùng `button-secondary` |

Giả định từ memlog: số điện thoại shop và số tài khoản thật chưa có; dùng biến cấu hình, không chặn UX.

## Open Questions

1. **Giá trị cấu hình:** số thật của `SHOP_CONTACT_PHONE` và số tài khoản là gì, tên biến cấu hình cho tài khoản ngân hàng là gì, và trang hiển thị thế nào nếu biến chưa được đặt?

### Chuyển sang bước kiến trúc

- **Phân trang:** FR-9 chỉ nói Hàng đợi không phân trang. Tab Đã giao và Đã hủy sẽ dài dần; có cần giới hạn hoặc phân trang không?
- **Cách lưu dòng hoàn tiền:** dòng Lịch sử này không đổi Trạng thái và phải giữ được kết quả, nên ghi Trạng thái cũ và mới giống nhau hay thêm loại sự kiện? Điều kiện: không đổi mốc khách thấy.
- **Độ dài lý do `Khác`:** giới hạn bao nhiêu ký tự?
- **Mã lý do:** tên mã của các lý do ngoài `out_of_stock` và `other`.
