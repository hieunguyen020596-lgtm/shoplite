---
status: final
stepsCompleted: [1, 2, 3, 4]
date: 2026-11-21
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-shoplite-2026-11-21/prd.md
  - _bmad-output/planning-artifacts/prds/prd-shoplite-2026-11-21/addendum.md
  - _bmad-output/planning-artifacts/architecture/architecture-shoplite-2026-11-21/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-shoplite-2026-11-21/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-shoplite-2026-11-21/EXPERIENCE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-shoplite-2026-11-21/mockups/key-staff-queue.html
  - _bmad-output/planning-artifacts/ux-designs/ux-shoplite-2026-11-21/mockups/key-staff-order-detail.html
  - _bmad-output/planning-artifacts/ux-designs/ux-shoplite-2026-11-21/mockups/key-order-confirmation.html
---

# ShopLite - Epic Breakdown

## Overview

Tài liệu này cung cấp bản phân rã epic và story đầy đủ cho ShopLite (vận hành và theo dõi đơn hàng), phân tách các yêu cầu từ PRD, thiết kế UX và kiến trúc thành các story có thể triển khai.

Thứ tự ưu tiên khi các tài liệu mâu thuẫn: Architecture Spine > memlog UX > PRD. Các mock HTML chỉ là tham chiếu hình ảnh; DESIGN.md và EXPERIENCE.md thắng mock khi có mâu thuẫn.

## Requirements Inventory

### Functional Requirements

Nguồn: `prd.md` mục 4.1 đến 4.7. Giữ nguyên mã FR-n gốc.

- FR-1: Tra đơn bằng Mã đơn và số điện thoại. Khách hàng Tra đơn được khi cung cấp đúng cả Mã đơn và số điện thoại.
  - Số điện thoại gửi qua `POST`, không xuất hiện trong URL.
  - Sai Mã đơn, sai số điện thoại hoặc đơn không tồn tại đều trả cùng thông báo "Thông tin không đúng".
  - Đơn đặt bằng `0912345678` tra được bằng `+84912345678` và ngược lại.
  - Chỉ có Mã đơn thì không xem được dữ liệu nào, kể cả Trạng thái.
  - Tra đơn thành công cấp Quyền xem đơn cho đúng đơn đó và chuyển tới `/orders/:id`, không đưa số điện thoại lên URL.
- FR-2: Chỉ trả Dữ liệu tối thiểu. Khách hàng chỉ thấy Dữ liệu tối thiểu khi Tra đơn và trên Trang xác nhận; hai đường vào dùng chung một trang.
  - Phản hồi không chứa địa chỉ đầy đủ, email hoặc ghi chú.
  - Tên và số điện thoại được che ở phía server trước khi trả về, dạng `Ng***` và `090****001`.
  - Tên từ 3 ký tự giữ 2 ký tự đầu; tên 1-2 ký tự chỉ giữ ký tự đầu (`An` thành `A***`).
  - Số điện thoại chuẩn hóa về `0...` trước khi che, rồi giữ 3 số đầu và 3 số cuối.
  - Trang Tra đơn và Trang xác nhận không có thao tác hủy hoặc sửa.
- FR-3: Chống dò Mã đơn. Hệ thống giới hạn số lần Tra đơn sai.
  - Cùng một IP và Mã đơn bị chặn sau 5 lần sai trong 15 phút `[ASSUMPTION]`.
  - Một IP bị chặn sau 20 lần sai trong 15 phút trên mọi Mã đơn `[ASSUMPTION]`.
  - Chỉ có hai giới hạn trên; không có giới hạn theo Mã đơn bất kể IP (để người khác không khóa được đơn của Khách hàng thật).
  - Cửa sổ giới hạn neo tại lần đếm đầu của mỗi khóa `[ASSUMPTION]`.
  - Khi bị chặn vẫn hiển thị "Thông tin không đúng", không cho biết Mã đơn có tồn tại hay không.
  - Một IP bị chặn không làm Khách hàng ở IP khác mất quyền Tra đơn (áp dụng khi `TRUSTED_PROXY_HOPS >= 1`; ở local mọi request dùng chung bucket `direct`).
  - Chỉ đọc IP từ header khi proxy tin cậy đã cấu hình. Production từ chối khởi động nếu `TRUSTED_PROXY_HOPS` chưa khai báo hợp lệ (số nguyên >= 1, không nhận `0`); local không đọc header và dùng bucket `direct`. IP giả trong header không vượt được giới hạn.
  - Bộ đếm vẫn còn sau khi server khởi động lại.
- FR-4: Đóng các đường truy cập không kiểm tra quyền. Chỉ người có quyền mới đọc hoặc đổi được Đơn hàng.
  - `GET /api/orders` luôn trả 401. `GET /api/orders/:id` chỉ trả dữ liệu theo Quyền xem đơn, không có quyền trả 401. Nhân viên đọc đơn qua `/api/staff/orders*`.
  - `PATCH /api/orders/:id` luôn trả 401, không còn cho Khách hàng hủy đơn; đổi Trạng thái qua `PATCH /api/staff/orders/:id`.
  - `/orders` không còn liệt kê đơn; mục "Đơn hàng" trên menu dẫn tới trang Tra đơn.
  - `/orders/:id` không có Quyền xem đơn thì chuyển tới trang Tra đơn với Mã đơn điền sẵn; trang Tra đơn không tự chuyển ngược lại nếu chưa Tra đơn thành công.
- FR-5: Xem lại Trang xác nhận. Khách hàng vừa đặt xem lại được Trang xác nhận trên cùng trình duyệt.
  - Đặt đơn thành công cấp Quyền xem đơn dạng cookie `HttpOnly` có ký; mỗi Mã đơn hiệu lực 7 ngày từ lần cấp `[ASSUMPTION]`.
  - Đặt đơn và Tra đơn thành công dẫn tới cùng một Trang xác nhận.
  - Tải lại trang vẫn thấy Trang xác nhận.
  - Cookie bị sửa, Mã đơn hết hạn hoặc không có trong cookie đều bị từ chối.
  - Trang chỉ hiện nội dung đã định nghĩa cho Trang xác nhận.
  - Trang có lối "Tra đơn" với Mã đơn điền sẵn.
- FR-6: Thông tin chuyển khoản. Khách hàng chọn chuyển khoản thấy số tiền, số tài khoản và nội dung chuyển khoản trên Trang xác nhận khi đơn còn Chờ xác nhận.
  - Không hiện khi đơn đã rời Chờ xác nhận.
  - Nội dung chuyển khoản là Mã đơn.
  - Hiện như nhau khi vào từ đặt đơn hoặc Tra đơn.
  - Có thêm hàng Ngân hàng `[ASSUMPTION: A6]`.
- FR-7: Xem Trạng thái, mốc thời gian và bước kế tiếp. Khách hàng xem được Trạng thái hiện tại, các mốc đã qua và bước kế tiếp.
  - Mỗi mốc lấy thời gian từ dòng Lịch sử mới nhất của Trạng thái đó, không tính dòng đã bị Lùi đơn thay thế và dòng kết quả xử lý hoàn tiền.
  - Ngoại lệ: mốc Đang giao luôn giữ giờ của dòng Đã xác nhận → Đang giao ban đầu; dòng Lùi đơn không đổi mốc này.
  - Mỗi Trạng thái có một câu mô tả bước kế tiếp theo `EXPERIENCE.md`.
  - Khách hàng không thấy tên Nhân viên hoặc lý do nội bộ `[ASSUMPTION]`.
  - Khách hàng không thấy kết quả xử lý hoàn tiền; dòng này, kể cả dòng ghi thêm, không đổi mốc nào.
  - Sau Lùi đơn, Khách hàng thấy Đang giao và không thấy mốc Đã giao đã bị sửa; khi giao lại, mốc Đã giao dùng thời gian của lần giao mới nhất `[ASSUMPTION]`.
  - Số điện thoại shop từ `SHOP_CONTACT_PHONE` hiện ở mọi Trạng thái, câu hướng dẫn đổi theo Trạng thái (Chờ xác nhận, Đã xác nhận: `Muốn hủy đơn, liên hệ shop:` {số}; Đang giao: câu theo EXPERIENCE `[ASSUMPTION: A13]`; Đã giao: `Chưa nhận được hàng? Gọi shop qua {số}.`; Đã hủy COD: `Đơn đã hủy. Cần hỗ trợ, vui lòng liên hệ shop qua {số}.`; Đã hủy chuyển khoản: `Đơn đã hủy. Nếu bạn đã chuyển khoản, vui lòng liên hệ shop qua {số}.`).
- FR-8: Đăng nhập bằng Tài khoản riêng. Nhân viên và Quản lý đăng nhập bằng Tài khoản riêng.
  - Tài khoản khai báo qua `STAFF_ACCOUNTS` (chỉ chứa hash scrypt), nạp vào `staff_accounts` bằng `npm run staff:seed`; cấu hình không chứa mật khẩu rõ.
  - Không có quyền thì mọi trang và API nhân viên trả 401 hoặc chuyển tới đăng nhập.
  - Đăng nhập lại đưa người dùng về đúng trang đang xem; chỉ nhận đích nội bộ trong `/staff`.
  - Người đã đăng nhập vào `/staff/login` được chuyển về `/staff`.
  - Vai Nhân viên gọi thao tác của Quản lý nhận 403.
  - Phiên lưu trong database, cookie chỉ chứa token ngẫu nhiên; hết hạn cố định sau 8 giờ, không gia hạn trượt `[ASSUMPTION]`.
  - Mỗi người một Tài khoản riêng; không có Tài khoản dùng chung.
  - Đăng xuất được và phiên cũ không dùng được nữa. Nạp lại làm đổi hash mật khẩu thì mọi phiên của Tài khoản đó bị thu hồi.
  - Đăng nhập sai 5 lần trong 15 phút theo cặp IP và tên đăng nhập thì bị chặn tạm thời; ở local bucket `direct` làm giới hạn này thực chất theo tên đăng nhập `[ASSUMPTION]`.
- FR-9: Hàng đợi và Danh sách đơn. Nhân viên xem các đơn cần xử lý, xem đơn theo nhóm và tìm đơn.
  - Danh sách đơn có 4 tab: Cần xử lý (Hàng đợi, mở mặc định), Đã giao, Đã hủy, Cần hoàn tiền.
  - Một đơn có thể nằm ở cả tab Đã hủy và Cần hoàn tiền.
  - Ô tìm nhận Mã đơn hoặc số điện thoại, tìm trên mọi tab; cách khớp và thứ tự theo `EXPERIENCE.md`.
  - Từ khóa tìm kiếm, gồm số điện thoại, không xuất hiện trong URL.
  - Mở một đơn dẫn tới Chi tiết đơn.
  - Hàng đợi gồm đơn Chờ xác nhận, Đã xác nhận, Đang giao, đơn cũ nhất lên trước.
  - Đơn chuyển khoản Chờ xác nhận quá 24 giờ nằm trên cùng và có nhãn nổi bật.
  - Không có đơn nào bị tự động hủy.
  - Nhân viên xem được tên, số điện thoại và địa chỉ để giao hàng `[ASSUMPTION]`.
  - Số điện thoại Khách hàng trên Trang nhân viên bấm để gọi được.
  - Nhân viên thao tác được ở chiều rộng 390px.
  - MVP không phân trang Hàng đợi `[ASSUMPTION]`.
- FR-10: Đổi Trạng thái đúng thứ tự. Nhân viên chuyển đơn: Chờ xác nhận → Đã xác nhận → Đang giao → Đã giao.
  - Mọi chuyển đổi khác trả `INVALID_STATUS_TRANSITION` (ví dụ `pending` → `delivered`).
  - Hai thao tác đồng thời trên cùng đơn: đúng một thành công, bên còn lại nhận `INVALID_STATUS_TRANSITION`; giao diện báo `Đơn vừa được người khác cập nhật` và tải lại Trạng thái mới nhất.
  - Thao tác từ màn hình cũ (sai `expectedVersion`, kể cả khi Trạng thái đã quay lại sau Lùi đơn) cũng nhận `INVALID_STATUS_TRANSITION`.
  - Đã hủy không chuyển tiếp được. Đã giao chỉ chuyển được theo FR-13.
- FR-11: Xác nhận hai lần cho Đã giao. Nhân viên phải xác nhận lần hai trước khi chuyển Đang giao → Đã giao.
  - Bấm một lần không đổi Trạng thái.
  - Hộp xác nhận hiện Mã đơn và tên người nhận.
- FR-12: Hủy đơn. Nhân viên hủy được đơn Chờ xác nhận hoặc Đã xác nhận, bắt buộc có lý do.
  - Hủy từ Đang giao, Đã giao hoặc Đã hủy bị từ chối.
  - Lý do chọn từ danh sách: `Khách đổi ý`, `Không liên lạc được`, `Đơn trùng`, `Hết hàng`, `Khác`. Chọn `Khác` thì bắt buộc nhập chữ, tối đa 200 ký tự: ô nhập chặn bằng `maxlength="200"`, luôn hiện bộ đếm `x/200`; đếm theo `.length` JavaScript (UTF-16) sau `trim` ở cả bộ đếm và server; vượt 200 thì server trả `VALIDATION_ERROR`.
  - Lý do lưu bằng mã cố định: `Hết hàng` là `out_of_stock`, `Khác` là `other` kèm chữ đã nhập.
  - Thiếu lý do, hoặc `Khác` để trống / chỉ có khoảng trắng, trả `VALIDATION_ERROR`.
  - Trạng thái, Lịch sử và thay đổi Tồn kho theo FR-17 diễn ra trong cùng một giao dịch; với `out_of_stock`, Tồn kho không đổi.
  - Lỗi giữa giao dịch hủy khiến Trạng thái, Tồn kho và Lịch sử giữ nguyên.
  - Ngoài phạm vi: giao thất bại và trả hàng.
- FR-13: Lùi đơn. Quản lý Lùi đơn được (Đã giao → Đang giao), bắt buộc có lý do.
  - Lý do chọn từ danh sách: `Bấm nhầm, hàng còn trên xe`, `Khách báo chưa nhận hàng`, `Khác`. Chọn `Khác` thì bắt buộc nhập chữ, tối đa 200 ký tự: ô nhập chặn bằng `maxlength="200"`, luôn hiện bộ đếm `x/200`; đếm theo `.length` JavaScript (UTF-16) sau `trim` ở cả bộ đếm và server; vượt 200 thì server trả `VALIDATION_ERROR`.
  - Nhân viên không thấy nút Lùi đơn, kể cả dạng vô hiệu; gọi thẳng thao tác này nhận 403. Vai được kiểm trước tính hợp lệ của chuyển Trạng thái: Nhân viên gọi Lùi đơn luôn nhận 403, kể cả khi đơn không ở Đã giao.
  - Lùi đơn thêm dòng Lịch sử mới và không đổi Tồn kho.
  - Sau Lùi đơn, đơn chuyển Đã giao lại được theo FR-10 và FR-11.
- FR-14: Ghi Lịch sử. Hệ thống ghi một dòng Lịch sử cho mỗi thay đổi của Đơn hàng.
  - Mỗi dòng đổi Trạng thái gồm Tài khoản thực hiện, thời gian, Trạng thái cũ, Trạng thái mới và lý do nếu có.
  - Dòng kết quả xử lý hoàn tiền gồm Tài khoản thực hiện, thời gian và kết quả, không đổi Trạng thái của đơn.
  - Việc tạo đơn cũng có một dòng Lịch sử, người thực hiện là "Khách hàng".
  - Không có API sửa hoặc xóa Lịch sử.
  - Đổi Trạng thái thất bại hoặc ghi trùng kết quả xử lý hoàn tiền không để lại dòng Lịch sử.
- FR-15: Xem Lịch sử. Nhân viên và Quản lý xem toàn bộ Lịch sử của một đơn.
  - Lịch sử xếp theo thời gian và giữ cả dòng đã bị Lùi đơn sửa.
  - Dòng kết quả xử lý hoàn tiền hiện `Đã xử lý hoàn tiền: {kết quả}` thay cho cặp Trạng thái; ghi thêm kết quả là một dòng mới và giữ dòng cũ.
- FR-16: Trừ Tồn kho khi đặt. Hệ thống trừ Tồn kho ngay khi Khách hàng đặt đơn thành công.
  - Khi Tồn kho là 1 và có N yêu cầu đồng thời: đúng 1 đơn thành công, N-1 nhận `INSUFFICIENT_STOCK`, Tồn kho cuối bằng 0.
  - Đơn nhiều dòng thiếu một dòng thì không tạo đơn và không trừ dòng nào.
  - Lỗi giữa giao dịch khiến Tồn kho, đơn và Lịch sử giữ nguyên.
- FR-17: Hoàn Tồn kho khi hủy. Hệ thống hoàn Tồn kho đúng một lần khi đơn bị hủy, trừ khi lý do hủy có mã `out_of_stock`.
  - Hai người cùng hủy hoặc bấm đúp chỉ cộng Tồn kho một lần.
  - Với mọi mã khác `out_of_stock`, Tồn kho sau khi hoàn đúng bằng số trước khi đặt (nếu không có giao dịch khác).
  - Hủy với mã `out_of_stock` không hoàn Tồn kho cho toàn bộ đơn: Tồn kho của mọi sản phẩm trong đơn giữ nguyên, kể cả đơn nhiều dòng.
  - Mã `other` vẫn hoàn Tồn kho, kể cả khi chữ đã nhập là "hết hàng".
- FR-18: Hiển thị Tồn kho thực tế. Khách hàng thấy trạng thái còn hàng theo Tồn kho hiện tại.
  - Nhãn tồn kho, bộ lọc `inStock` và giới hạn số lượng đọc từ Tồn kho, không đọc số tĩnh trong code.
  - Khi đã biết Tồn kho, trang sản phẩm và giỏ chặn tăng vượt `min(Tồn kho, 10)`, tính cả số đã có trong giỏ; không tự giảm số đã có. Lỗi tải Tồn kho thì giới hạn 10. Server kiểm tra lần cuối khi đặt.
  - Sau khi đơn cuối được đặt, trang sản phẩm tải lại hiện "Hết hàng".
- FR-19: Giữ form khi hết hàng. Khách hàng thiếu hàng lúc đặt vẫn giữ thông tin đã nhập và xử lý ngay tại form.
  - Phản hồi `INSUFFICIENT_STOCK` trả mọi dòng thiếu, mỗi dòng có `productId`, số yêu cầu và số còn lại.
  - Form giữ nguyên dữ liệu và đánh dấu mọi dòng thiếu.
  - Dòng còn N sản phẩm (N > 0) có `Lấy N` (giảm số lượng về N) và `Bỏ` (xóa dòng).
  - Dòng có N = 0 chỉ hiện `Hết hàng` và `Bỏ`.
  - Giỏ hàng và tổng tiền cập nhật theo lựa chọn; Khách hàng không phải quay lại giỏ.
- FR-20: Chống đơn ảo. Hệ thống giới hạn việc tạo đơn để bảo vệ Tồn kho.
  - Một IP bị chặn sau 10 đơn trong 1 giờ; ở local bucket `direct` làm ngưỡng này áp dụng cho cả shop `[ASSUMPTION]`.
  - Một số điện thoại có tối đa 3 đơn Chờ xác nhận cùng lúc `[ASSUMPTION]`.
  - Yêu cầu bị chặn trả HTTP 429 mã `RATE_LIMITED`, không tạo đơn, không trừ Tồn kho.
  - Số `0...` và `+84...` của cùng một thuê bao được tính chung.
- FR-21: Cờ cần hoàn tiền. Khi đơn chuyển khoản bị hủy, hệ thống bật Cờ cần hoàn tiền để Quản lý xử lý ngoài hệ thống và ghi lại kết quả.
  - Đơn COD không có cờ và không có nhãn.
  - Chỉ Quản lý thực hiện `Đã xử lý hoàn tiền`, tại Chi tiết đơn, qua hộp xác nhận, với đúng một kết quả: `Đã hoàn tiền` hoặc `Khách chưa chuyển tiền`; ghi một dòng Lịch sử; Nhân viên gọi thao tác này nhận 403.
  - Nhãn `Cần hoàn tiền` hoặc `Đã xử lý hoàn tiền` hiện trên dòng đơn, bảng và Chi tiết đơn.
  - Kết quả chỉ quyết định việc đơn rời tab Cần hoàn tiền và việc có được ghi thêm hay không.
  - Sau `Khách chưa chuyển tiền`, Quản lý được ghi thêm `Đã hoàn tiền`; dòng cũ vẫn giữ trong Lịch sử.
  - `Ghi thêm: Đã hoàn tiền` chỉ đi từ `Khách chưa chuyển tiền` sang `Đã hoàn tiền`; đơn không quay lại tab Cần hoàn tiền.
  - Nếu ghi nhầm `Đã hoàn tiền`, Quản lý ghi thêm dòng đính chính về `Khách chưa chuyển tiền`, bắt buộc có lý do, tối đa 200 ký tự (cùng quy tắc `maxlength="200"`, bộ đếm `x/200`, đếm `.length` sau `trim`, `VALIDATION_ERROR` khi vượt như FR-12); dòng cũ giữ trong Lịch sử và Khách hàng không thấy.
  - Mỗi thao tác chỉ hợp lệ theo kết quả mới nhất; lần ghi trùng nhận lỗi xung đột.
  - Quản lý kiêm chủ shop đối soát sao kê và hoàn tay trong 3 ngày làm việc, không thu phí `[ASSUMPTION]`.
  - Hệ thống không lưu trạng thái thanh toán và không chuyển tiền; kết quả xử lý hoàn tiền chỉ là ghi chú của Quản lý trong Lịch sử.
  - `Đã hoàn tiền` và `Khách chưa chuyển tiền` không phải xác nhận của hệ thống rằng Khách hàng đã hoặc chưa trả tiền.
  - Trang xác nhận không khẳng định Khách hàng đã trả tiền hoặc sẽ được hoàn, và không hiện Cờ cần hoàn tiền hay kết quả xử lý.

### NonFunctional Requirements

Nguồn: PRD mục 4.9 (NFR chéo), mục 4.8 (hành vi phải giữ), mục 5 (non-goals), mục 6.3 (rủi ro đã chấp nhận), mục 7 (chỉ số kiểm chứng bằng test) và các ràng buộc chất lượng trong EXPERIENCE/DESIGN.

- NFR1: Toàn vẹn. Mọi thay đổi Trạng thái và Tồn kho đi qua một đường duy nhất trong một giao dịch. Trang xác nhận, Trang nhân viên và Lịch sử đọc cùng một bản ghi Đơn hàng (PRD 4.9).
- NFR2: Sửa sai là thêm thao tác mới, không xóa dấu vết. Ngoại lệ đã chấp nhận: Tồn kho sai được sửa tay trong database (PRD 6.3), nằm ngoài đường ghi này và không có dấu vết trong Lịch sử.
- NFR3: Bảo mật dữ liệu khách. Dữ liệu khách (gồm số điện thoại và từ khóa tìm kiếm) không xuất hiện trong URL hoặc log ứng dụng (PRD 4.9, EXPERIENCE Interaction Primitives).
- NFR4: Bí mật chỉ nằm trong biến môi trường (PRD 4.9).
- NFR5: Cấu hình. Giá trị thật ở `.env`, mẫu ở `.env.example`. Production bắt buộc `TRUSTED_PROXY_HOPS` là số nguyên >= 1 (PRD 4.9).
- NFR6: Kiểm thử. Các ca đồng thời chạy trên PostgreSQL thật, không mock cơ sở dữ liệu. Cổng `npm run check:full` gồm test DB và race (PRD 4.9).
- NFR7: Tiếng Việt. Toàn bộ nội dung giao diện và thông báo lỗi viết bằng tiếng Việt có dấu (PRD 4.9).
- NFR8: Khả năng tiếp cận cơ bản. Trạng thái không truyền đạt chỉ bằng màu sắc; form và hộp xác nhận dùng được hoàn toàn bằng bàn phím (PRD 4.9).
- NFR9: Mục tiêu WCAG 2.2 AA cho màn hình mới `[ASSUMPTION: A3]` (EXPERIENCE Accessibility Floor).
- NFR10: Phát hành. Chỉ phát hành khi đủ DB, Tồn kho, Trang xác nhận, Tra đơn và Trang nhân viên; đóng nốt route đọc cũ (`GET /api/orders`, kiểm quyền `GET /api/orders/:id`) sau cùng; `PATCH /api/orders/:id` và nút hủy của Khách hàng đóng sớm ở Story 1.7 (PRD 4.9).
- NFR11: Giữ nguyên: server luôn tính lại giá, phí giao hàng và tổng tiền (`calculateOrderTotals`), không tin dữ liệu giá từ client (PRD 4.8).
- NFR12: Giữ nguyên: mỗi sản phẩm tối đa `MAX_QUANTITY_PER_ITEM` = 10 trong một đơn (PRD 4.8).
- NFR13: Giữ nguyên: miễn phí giao hàng tiêu chuẩn từ `FREE_SHIPPING_THRESHOLD` = 500.000đ (PRD 4.8).
- NFR14: Giữ nguyên: định dạng số điện thoại đầu vào theo `VN_PHONE_REGEX` (PRD 4.8).
- NFR15: Giữ nguyên: lỗi API có dạng `{ error: { code, message, details? } }` (PRD 4.8).
- NFR16: Giữ nguyên: giỏ hàng vẫn lưu ở trình duyệt (PRD 4.8).
- NFR17: Thay đổi có chủ đích (PRD 4.8): đơn lưu trong PostgreSQL thay `storage/orders.json`; 11 đơn thử hiện có không được chuyển, link cũ dẫn tới Tra đơn và báo "Thông tin không đúng" (PRD 6.2).
- NFR18: Responsive. Web responsive desktop và mobile ngang nhau, chiều rộng tối thiểu 390px, không cuộn ngang ở mọi trang mới; không hỗ trợ ngoại tuyến, mất mạng xử lý như lỗi gửi (EXPERIENCE Responsive, DESIGN).
- NFR19: Chỉ giao diện sáng (`color-scheme: light`), không dark mode (DESIGN Brand & Style).
- NFR20: Không polling, không realtime; dữ liệu làm mới theo thao tác, khi đổi tab và khi tải trang (EXPERIENCE Interaction Primitives; Spine Consistency Conventions).
- NFR21: Non-goals ràng buộc phạm vi (PRD 5): không cổng thanh toán, đối soát hay hoàn tiền tự động; không lưu trạng thái thanh toán; không công cụ chỉnh Tồn kho; không tài khoản Khách hàng; Khách hàng không tự hủy đơn; không giao thất bại, trả hàng, hủy khi Đang giao; không tích hợp vận chuyển hay dự báo ngày giao; không thông báo chủ động hoặc OTP; không hệ thống quản lý người dùng.
- NFR22: Không có hành vi hàng loạt thao tác, sửa Lịch sử, tự động hủy đơn (EXPERIENCE Interaction Primitives).
- NFR23: Chỉ số kiểm chứng bằng test trong khóa học (PRD 7): SM-2 (0 đơn bán quá Tồn kho trong hệ thống), SM-3 (100% lần đổi Trạng thái có dòng Lịch sử đầy đủ), SM-4 (0 route đọc hoặc đổi Đơn hàng mà không kiểm tra quyền). Counter-metric: SM-C1 chỉ đếm đơn hủy mã `out_of_stock`; SM-C2 không siết giới hạn đến mức chặn người mua thật.
- NFR24: Rủi ro đã chấp nhận cần phản ánh trong hành vi và tài liệu (PRD 6.3): hủy `out_of_stock` không hoàn Tồn kho cho cả đơn; SM-2 không phát hiện lệch hàng thực tế; không giới hạn theo Mã đơn bất kể IP; local dùng chung bucket `direct`; nhãn gói hàng có thể lộ Mã đơn và số điện thoại (OTP để sau MVP).
- NFR25: Ràng buộc trước đơn thật (PRD 6.3, Spine Deferred): PostgreSQL 14 đã hết hỗ trợ, phải nâng lên bản còn hỗ trợ trước đơn thật đầu tiên rồi chạy lại `check:full`.

### Additional Requirements

Brownfield: không có starter template. Dự án Next.js đang chạy nên không có "story tạo dự án từ template"; story đầu tiên là nâng phiên bản và spike Drizzle (xem bên dưới). Nguồn: ARCHITECTURE-SPINE.md (đánh dấu AD-n) và `addendum.md`.

- Không có starter template (brownfield, Stack: ứng dụng Next.js hiện có). Epic 1 Story 1 là nâng phiên bản + spike, không phải khởi tạo từ template (AD-6).
- Story đầu tiên: nâng `next` và `eslint-config-next` lên đúng 16.4.6 (từ 16.4.2), đặt `engines.node` thành `>=22.18.0` (AD-6).
- Cổng spike Drizzle: story đầu merge một spike chạy thật gồm một đơn trừ kho qua route handler, dùng đúng `runInTransaction` và `DbTx` của AD-10, trên Next 16.4.6. Chưa đạt thì chưa story nào khác được phụ thuộc vào Drizzle (AD-6).
- Drizzle với `node-postgres`: pool `pg` là singleton lazy trên `globalThis` trong `src/db/client.ts`, không kết nối lúc import; transaction READ COMMITTED; `drizzle-orm` 0.45.4 và `drizzle-kit` 0.31.11 pin chính xác, nâng cùng nhau (AD-6).
- PostgreSQL cài sẵn trên máy, không Docker: không thêm `docker-compose*`, `Dockerfile` hay script gọi Docker; dev dùng `shoplite_dev`, test và E2E dùng `shoplite_test` trên PostgreSQL 14.18 (Consistency Conventions: Môi trường; quy tắc AD-5 đã rút nay nằm ở đây).
- Biến môi trường (AD-31): `DATABASE_URL`, `TEST_DATABASE_URL` (chỉ `test:db`, `db:test:prepare`), `ORDER_ACCESS_SECRET` (>= 32 byte), `SHOP_CONTACT_PHONE`, `BANK_NAME`, `BANK_ACCOUNT_NUMBER`, `TRUSTED_PROXY_HOPS` (production số nguyên >= 1, local mặc định `0`), `STAFF_ACCOUNTS` (chỉ `staff:seed`). Khai báo ở `.env` (gitignored) và `.env.example`, không bao giờ ở `.env.local` (Next ưu tiên file này). Trong `src/` chỉ `src/lib/env.ts` đọc `process.env` qua `getServerEnv()` lazy parse bằng Zod (ngoại lệ `NODE_ENV`, `NEXT_RUNTIME`); `replace_me` ở production bị coi là thiếu (AD-31).
- Chặn khởi động: `src/instrumentation.ts#register` (runtime `nodejs`) gọi `getServerEnv()`; thiếu hoặc sai thì log tên biến (không in giá trị) rồi `process.exit(1)`, không dùng `throw`. Production không khởi động khi `TRUSTED_PROXY_HOPS` thiếu, `0` hoặc sai định dạng (AD-31).
- `.env.local` là file của khóa học, được theo dõi trong git; không khai báo biến mới ở đây. `PAYMENT_API_KEY` trong lịch sử git là code mẫu, landv đã xác nhận (addendum; AD-31).
- Script TypeScript: không thêm dependency; chạy bằng `node --env-file=.env --import ./scripts/ts-hooks.mjs scripts/<tên>.ts` trên Node >= 22.18.0. `scripts/ts-hooks.mjs` dùng `module.registerHooks` để đổi `@/x` thành `src/x`, thử `.ts` và `/index.ts`, đổi `server-only` thành module rỗng; không đổi `tsconfig.json`; đồ thị import chỉ TS xóa được kiểu (không `enum`, `namespace`, parameter property, `.tsx`), kiểu dùng `import type`; script chỉ import `src/db/schema.ts`, `src/data/**`, hàm thuần và `staff-auth/password.ts`, tự tạo `pg.Client` từ URL (AD-31).
- Migration và seed: schema ở `src/db/schema.ts`; migration SQL do `drizzle-kit generate` tạo, commit trong `drizzle/`, chỉ đi tiến; không dùng `drizzle-kit push`. Script `db:migrate` (migrator `drizzle-orm/node-postgres`), `db:seed` (chèn tồn bằng `ON CONFLICT DO NOTHING`), `db:test:prepare` (dùng `TEST_DATABASE_URL`, từ chối nếu `current_database()` khác `shoplite_test`, rồi migrate, truncate, seed), `staff:seed`, `staff:hash`. Thứ tự setup local: tạo hai database, `.env`, `db:migrate`, `db:seed`, `staff:seed` (AD-31).
- Schema đầy đủ (Structural Seed): bảng `orders`, `order_items`, `order_status_history`, `inventory`, `staff_accounts`, `staff_sessions`, `rate_limits`; mọi cột thời gian `timestamptz(3)`, tiền là `integer` VND, ID nội bộ `bigint` identity `mode: "number"`; index tối thiểu `orders(phone_normalized, status)`, `orders(status, created_at)`, `orders(status, updated_at DESC, id DESC)`, `orders(created_at) WHERE refund_required`, `order_status_history(order_id, id)`, `staff_sessions(account_id)` (Structural Seed; AD-8, AD-12).
- Kiến trúc phân lớp: Delivery, Layout, UI feature, Domain thuần, Application, Port, Adapter, Composition, Shared; `src/app/**` không chứa SQL và không import `src/db` hay `*.pg.ts`; file `"use client"` không kéo `src/db`, `*.pg.ts`, `server.ts`; `server.ts`, `*.pg.ts`, `src/db/**`, `lib/env.ts` mở đầu bằng `import "server-only"`; ESLint thực thi bằng `no-restricted-imports` và `no-restricted-syntax` (AD-1).
- Repository async và DI: service nhận port và `runInTransaction` qua `createOrderService(deps)`; singleton chỉ ở `features/orders/server.ts`; xóa `OrderRepository.save`, `createJsonFileOrderRepository`, `createInMemoryOrderRepository`, `DEFAULT_ORDERS_FILE`, `ORDERS_FILE`; app không đọc, ghi, xóa `storage/orders.json` (AD-2).
- Xử lý lỗi (AD-3): mọi route API bọc bằng `handleRouteError`; thêm `OrderErrorCode`: `UNAUTHORIZED` 401, `FORBIDDEN` 403, `RATE_LIMITED` 429, `LOOKUP_FAILED` 404, `REFUND_OUTCOME_CONFLICT` 409; không tạo class lỗi nghiệp vụ thứ hai; `FieldErrorDetails`, `InsufficientStockDetails`, `OrderErrorDetails`; client chỉ đọc `details.lines` sau khi kiểm `code === "INSUFFICIENT_STOCK"`.
- Làm sạch lỗi DB và log an toàn: `runInTransaction`/`withDb` ném lại `DbFailure` chỉ có `sqlState`, message cố định `Database operation failed`, không `cause`; pool có `on("error")` chỉ log `sqlState`; `lib/safe-log.ts#logServerError(scope, error)` là đường log lỗi server duy nhất (chỉ `scope`, `name`, `code`/`sqlState`); xóa `console.error(error)` trong `lib/http.ts` (AD-3).
- Hợp đồng transaction (AD-10): `src/lib/db-tx.ts` chỉ chứa kiểu (`DbTx` branded opaque, `RunInTransaction`); `src/db/transaction.ts` cài `runInTransaction`, `withDb`, `toDrizzleTx` (chỉ `*.pg.ts` gọi). Chỉ service của use case mở transaction, đúng một lần, ở ngoài cùng, không lồng; mọi hàm port ghi và đọc-để-quyết-định nhận `tx: DbTx` làm tham số đầu bắt buộc; không chạy scrypt, mạng hay việc chậm trong transaction; không tự retry khi lỗi DB.
- Quy tắc snapshot và thứ tự khóa (AD-10): ở READ COMMITTED, đọc để quyết định phải là câu lệnh riêng sau câu lấy khóa, cấm gộp bằng subquery/CTE; thứ tự khóa toàn hệ thống: `rate_limits` theo `key` tăng dần, advisory lock theo số điện thoại, dòng `orders`, `inventory` theo `productId` tăng dần (`placeOrder` dùng 1, 2, 4; chuyển trạng thái 3, 4; hoàn tiền chỉ 3).
- Luồng `placeOrder` (AD-10): Zod, gộp dòng, kiểm tối đa 10, tính tiền xong trước khi mở transaction; trong transaction: `consume(orderKey(ip))`, `lockPhone` bằng `pg_advisory_xact_lock`, `countPendingByPhone` (câu riêng; từ 3 trở lên thì `RATE_LIMITED`), `reserveStock`, `insertOrder` kèm dòng `order_created`; mọi lỗi rollback toàn bộ kể cả bộ đếm IP nên chỉ đơn thành công được đếm.
- Máy trạng thái thuần (AD-8): `features/orders/order-state-machine.ts` export `decideTransition({ from, to, role, paymentMethod, reasonCode, reasonText })` không I/O, trả `{ restoreStock, setRefundRequired }` hoặc lỗi; thứ tự kiểm: sai vai (`FORBIDDEN`, xét theo cạnh `from`/`to` request gửi; Nhân viên gọi Lùi đơn luôn 403), cạnh sai (`INVALID_STATUS_TRANSITION`), lý do sai (`VALIDATION_ERROR`); `other` tối đa 200 ký tự đếm bằng `.length` JavaScript sau `trim`; `CANCEL_REASONS`, `REVERT_REASONS` ở `order-reasons.ts`; `restoreStock = reasonCode !== "out_of_stock"` trên cạnh Hủy; `setRefundRequired = paymentMethod === "bank_transfer"` trên cạnh Hủy; test phủ toàn bộ tích `from x to x role`; xác nhận hai lần của FR-11 là việc của UI.
- Một đường ghi Trạng thái (AD-8): sau khi tạo đơn, `orders.status`, `version`, `updated_at`, `refund_required` chỉ được ghi bởi `casOrderStatus` trong `order-repository.pg.ts` (một câu UPDATE), chỉ gọi từ `orderService.transitionOrder`; quy trình 6 bước trong một transaction (SELECT ... FOR UPDATE; `decideTransition`; kiểm `status`/`version`; UPDATE có điều kiện `status` và `version` với `clock_timestamp()`; hoàn kho; ghi một dòng Lịch sử); `PATCH /api/staff/orders/:id` gửi `from` và `expectedVersion`.
- Bất biến cột (AD-8): `version integer NOT NULL DEFAULT 0` chỉ tăng khi đổi Trạng thái; ghi kết quả hoàn tiền không tăng `version`, không đổi `updated_at`; `refund_required` chỉ bật trên cạnh Hủy, không bao giờ tắt; `CHECK (NOT refund_required OR (status = 'cancelled' AND payment_method = 'bank_transfer'))`; không dùng `updated_at` làm token chống cũ.
- Một đường ghi Tồn kho (AD-9): `inventory.stock` chỉ ghi bởi `reserveStock(tx, lines)` và `restoreStock(tx, lines)` trong `features/inventory/stock-ledger.pg.ts`; trừ kho bằng `UPDATE ... SET stock = stock - $n WHERE product_id = $id AND stock >= $n`; cập nhật nhiều sản phẩm tuần tự theo `productId` tăng dần; `restoreStock` chỉ gọi sau khi `casOrderStatus` thắng trên cạnh Hủy với `restoreStock = true`; hoàn kho ảnh hưởng 0 hàng thì ném lỗi để rollback; `CHECK (stock >= 0)`.
- Thiếu hàng (AD-9): `reserveStock` đi hết mọi dòng; dòng thiếu đọc `stock` bằng câu riêng (không có hàng `inventory` tính là 0) và báo `available = max(0, min(stockĐọcĐược, requested - 1))`; hết vòng, nếu có dòng thiếu thì ném `INSUFFICIENT_STOCK` với `details.lines` để rollback.
- Lịch sử append-only (AD-12): `order_status_history.event_type` thuộc `order_created`, `status_changed`, `refund_outcome_recorded` với CHECK theo loại; `actor_type` thuộc `customer`, `staff`; trigger `BEFORE UPDATE OR DELETE` từ chối mọi sửa, xóa, nằm trong custom migration (`drizzle-kit generate --custom`) và có test khẳng định tồn tại sau `db:migrate`; `created_at` do database cấp bằng `clock_timestamp()`; thứ tự chuẩn theo `id`; mốc khách chỉ đọc dòng `status_changed`.
- Kết quả hoàn tiền (AD-14): `orders` có `payment_method` và `refund_required`, không có `payment_status` hay cột kết quả hoàn tiền; kết quả mới nhất suy ra qua `findLatestRefundOutcome(tx, orderId)` (`ORDER BY id DESC LIMIT 1`); mã `refunded`, `customer_not_transferred`; hàm thuần `decideRefundOutcome({ latest, requested, reasonText })` trong `features/orders/refund-outcomes.ts`; `POST /api/staff/orders/:id/refund-outcomes` chỉ vai `manager`, quy trình 6 bước trong một transaction; lỗi: `VALIDATION_ERROR`, `ORDER_NOT_FOUND`, `REFUND_OUTCOME_CONFLICT`.
- Xác thực nhân viên (AD-16): `staff_accounts` với `username` unique `CHECK (username = lower(username))`; không có API tạo hoặc sửa tài khoản; `normalizeUsername = trim + toLowerCase`, quá 64 ký tự bị từ chối trước `consume`; scrypt bất đồng bộ `N=32768, r=8, p=3, keylen=32`, salt 16 byte, `maxmem=67108864`, lưu dạng `scrypt:32768:8:3:<salt>:<hash>` (không dùng `$`), so khớp `timingSafeEqual`, username không tồn tại vẫn chạy scrypt trên hash giả, mật khẩu quá 256 ký tự bị từ chối; `staff:hash` đọc mật khẩu từ stdin; phiên: cookie `shoplite_staff_session` (token 32 byte, `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` ở production), lưu `token_hash = SHA-256(token)`, hạn cố định 8 giờ, vai đọc từ `staff_accounts` mỗi request, logout idempotent trả 204; seed làm đổi hash thì thu hồi phiên.
- Guard (AD-18): `src/proxy.ts` chỉ match `/staff/:path*`, chỉ kiểm cookie phiên có tồn tại (không truy cập database, không đọc vai), không bao giờ chuyển hướng khỏi `/staff/login`; `features/staff-auth/guard.ts` là nơi duy nhất xác thực phiên (`withStaff`, `requireStaffPage`, `getOptionalStaff`); mọi `route.ts` dưới `api/staff/` (trừ `login`, `logout`) export qua `withStaff`; mọi `page.tsx` dưới `app/staff/` (trừ `login`) gọi `requireStaffPage`; actor lấy từ phiên, không từ body.
- CSRF và điều hướng (AD-18): `assertSameOrigin(request)` cho mọi request ghi của `withStaff`, `login`, `logout` (`Sec-Fetch-Site` khác `same-origin` thì 403; thiếu thì so `Origin`); thứ tự same-origin, phiên (401), vai (403); `sanitizeStaffNext` là validator duy nhất (chỉ pathname `/staff` hoặc `/staff/...`, bỏ query, từ chối `//`, `\`, dot-segment, `%2f`, `%5c`, `%2e`, `/staff/login`); phiên chết thì `/staff/login?next=<đích>&expired=1`; `staffFetch` là client helper duy nhất gọi `/api/staff/*` và chuyển hướng khi 401; hai test duyệt toàn bộ route và page nhân viên.
- Hợp đồng API và DTO nhân viên (AD-19): `features/orders/staff-order-view.ts` định nghĩa DTO camelCase, thời gian ISO, không lộ `actor_staff_id` hay hàng DB; endpoint `GET /api/staff/orders?tab=queue|delivered|cancelled|refund&cursor=`, `POST /api/staff/orders/search`, `GET`/`PATCH /api/staff/orders/:id`, `POST .../refund-outcomes`, `POST /api/staff/login`, `POST /api/staff/logout`; `StaffOrderRow`, `StaffHistoryEntry`, `StaffOrderDetail`; `queue` không phân trang (đơn `isOverdue` lên đầu rồi `created_at` tăng dần), `delivered`/`cancelled` 50 đơn mỗi lần keyset `(updated_at, id)` cursor base64url (cursor sai là `VALIDATION_ERROR`), `refund` không phân trang; `isOverdue`, `refundState`, `refundPendingCount` tính ở server; tìm kiếm chỉ qua body, khớp chính xác `normalizeOrderId` hoặc `normalizePhone`.
- Quyền xem đơn (AD-20): cookie `shoplite_order_access`, `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` ở production; giá trị `v1.<payload>.<HMAC-SHA256>` ký bằng `ORDER_ACCESS_SECRET`, `timingSafeEqual`; payload `[orderId, expEpochSeconds]`, mỗi mã hạn 7 ngày, tối đa 20 mã `[ASSUMPTION]`, loại mã hết hạn rồi mã sớm nhất; giá trị > 2048 byte, sai chữ ký/version/schema là không có quyền; `readOrderAccess`/`grantOrderAccess` là hai hàm duy nhất; trang và `GET /api/orders/:id` kiểm cookie trước khi đọc database; không có quyền hoặc đơn không còn: trang `redirect("/orders?orderId=<id>")` (khi `normalizeOrderId` hợp lệ) hoặc `/orders`, API trả cùng một body 401; không gọi `notFound()` cho đơn khách.
- Projection cho khách (AD-22): `toCustomerOrderView(order, statusRows, shopConfig)` trong `features/orders/customer-order-view.ts` là hàm thuần và đường duy nhất tạo dữ liệu cho khách (`/orders/:id`, `GET /api/orders/:id`, `POST /api/orders`, `POST /api/orders/lookup`); tập khóa cố định (`id`, `status`, `createdAt`, `milestones`, `items`, `subtotal`, `shippingFee`, `total`, `shippingMethod`, `paymentMethod`, `recipient`, `shopPhone`, `bankTransfer`) có test; che tên và số ở server (tên theo code point sau NFC); bản chụp `order_items` và tổng tiền, không join catalog, không gọi `calculateOrderTotals` khi đọc; UI khách chỉ `import type { CustomerOrderView }`.
- Rate limit (AD-25): chỉ `src/lib/client-ip.ts#getClientIp` đọc header IP (`TRUSTED_PROXY_HOPS = 0`: bucket `direct`; `n > 0`: phần tử thứ n từ phải, thiếu/không hợp lệ là `unknown`; IPv4-mapped về IPv4; IPv6 gom `/64`); chỉ `features/rate-limit` ghi `rate_limits`; `policies.ts` dựng khóa và ngưỡng (`lookup:ip-order:<ip>:<orderId>` 5/15 phút, `lookup:ip:<ip>` 20/15 phút, `login:<ip>:<username>` 5/15 phút, `order:ip:<ip>` 10/1 giờ); `consume(tx, requests)` upsert theo `key` tăng dần dùng `now()` của database, cửa sổ neo tại lần đếm đầu, vượt ngưỡng ném `RATE_LIMITED`; `release(tx, receipts)` chỉ hoàn đúng lượt vừa `consume` (`GREATEST(count - 1, 0)` theo `window_started_at`), lỗi `release` log qua `logServerError` và không làm hỏng lần tra đúng; test bắt buộc chuỗi sai-đúng-sai và ca đồng thời.
- Tra đơn (AD-25): mọi thất bại nghiệp vụ của `POST /api/orders/lookup` (JSON hỏng, sai định dạng, sai thông tin, không tồn tại, bị chặn) trả cùng HTTP 404 và body `{ error: { code: "LOOKUP_FAILED", message: "Thông tin không đúng" } }`, không `details`, không dùng 429; Mã đơn hoặc số sai định dạng thất bại ngay không tạo bộ đếm; so khớp một query `WHERE id = $id AND phone_normalized = $phone`.
- Tồn kho một chủ đọc và giỏ (AD-27): xóa `stock` khỏi `Product` và `src/data/products.ts`; số ban đầu ở `src/data/inventory-seed.ts` (chỉ script seed import); mọi đọc tồn qua `features/inventory/server.ts#readStock`; `features/catalog/server.ts` ghép `StockedProduct = Product & { stock: number }`; `queryProducts` bắt buộc nhận `source: StockedProduct[]`; `getStockStatus`, `StockBadge`, `ProductCard`, `AddToCartButton`, `ProductPurchasePanel` nhận `stock` từ `StockedProduct`; `GET /api/products*` giữ field `stock` từ `inventory`; sản phẩm thiếu dòng `inventory` tính 0; xóa `stock` khỏi `CartItem`; `capQuantity(current, requested, stock?)` trong `cart-reducer.ts`; `GET /api/inventory?ids=a,b` (tối đa 50 id, `Cache-Control: no-store`, trả `{ stock: Record<productId, number> }`, id không có dòng trả 0); lỗi tải tồn thì `cap = 10` và không chặn đặt hàng.
- Render Tồn kho (Consistency Conventions; quy tắc AD-28 đã rút): `/`, `/products`, `/products/[slug]`, `/api/products`, `/api/products/[slug]`, `/api/inventory` khai báo `export const dynamic = "force-dynamic"`; xóa `generateStaticParams` khỏi `/products/[slug]`; không bật `cacheComponents`, không dùng `use cache`, `unstable_cache`, `revalidate` cho tồn; `generateMetadata` chỉ đọc catalog tĩnh.
- Chiến lược test (AD-30): không viết fake mô phỏng transaction; hàm thuần dùng `*.test.ts`; service, adapter, route có database và mọi ca race dùng `*.db.test.ts` trên PostgreSQL thật nhiều kết nối; `vitest.config.mts` loại `**/*.db.test.*`; `vitest.db.config.mts` (môi trường node, `fileParallelism: false`, alias `server-only` sang stub rỗng, nạp `.env` bằng `process.loadEnvFile`, `test.env.DATABASE_URL = TEST_DATABASE_URL`); global setup dừng nếu `current_database()` khác `shoplite_test`; reset bằng `TRUNCATE ... RESTART IDENTITY CASCADE`.
- Cổng test (AD-30): `npm run check:full` = `npm run check && npm run db:test:prepare && npm run test:db`; mọi PR chạm `orders`, `inventory`, `rate-limit`, `staff-auth`, `order-access`, `src/db`, `drizzle/` hoặc route liên quan phải chạy và ghi kết quả vào PR; PR đóng route cũ chạy thêm `npm run test:e2e`. Race bắt buộc: bán quá tồn; hai người cùng hủy; ABA sau Lùi đơn; vượt 3 đơn chờ; ghi trùng kết quả hoàn tiền; chuỗi `consume`/`release`; đặt đơn xen hủy đơn không deadlock.
- E2E (AD-30): Playwright chạy `next dev -p 3100` với `NEXT_DIST_DIR=.next-e2e`, `reuseExistingServer: false`, `workers: 1`, `DATABASE_URL` của `shoplite_test`, `TRUSTED_PROXY_HOPS=1`, mỗi test gửi `x-forwarded-for` riêng, reset và seed trước mỗi lần chạy; `next.config.ts` đặt `distDir: process.env.NEXT_DIST_DIR ?? ".next"`; `.next-e2e/` vào `.gitignore` và ignore của ESLint; không test nào đọc hoặc ghi `storage/orders.json`.
- Quy ước nhất quán (Consistency Conventions): `normalizePhone` trong `features/checkout/phone.ts` là hàm duy nhất đổi `+84...` thành `0...` (quy tắc AD-26 đã rút), `orders.phone_normalized` là cột số điện thoại duy nhất; `normalizeOrderId` trong `features/orders/order-id.ts` (`^SL-\d{8}-[0-9A-F]{6}$`); Mã đơn `SL-YYYYMMDD-XXXXXX` giữ `generateOrderId`; mã lý do Hủy `customer_changed_mind`, `unreachable`, `duplicate`, `out_of_stock`, `other`; mã lý do Lùi đơn `mistaken_delivery`, `customer_not_received`, `other`; chữ lý do `other` và đính chính bắt buộc sau `trim`, tối đa 200 ký tự, mã khác không kèm chữ, UI xóa chữ khi đổi lựa chọn; tên file `kebab-case`, adapter `*.pg.ts`, test DB `*.db.test.ts`, bảng/cột `snake_case`, identifier tiếng Anh; thời gian hiển thị `Asia/Ho_Chi_Minh`.
- Giá và đầu vào (Consistency Conventions; quy tắc AD-4 đã rút): service parse `unknown` bằng Zod rồi tính bằng `calculateOrderTotals` từ catalog server, không tin giá từ client; sau `mergeItems`, số lượng mỗi `productId` kiểm lại với `MAX_QUANTITY_PER_ITEM`, vượt thì `VALIDATION_ERROR`.
- Ghi chú cho story (Spine): FR-7 dùng `deriveMilestones(status, createdAt, statusRows)` trong `order-milestones.ts` (hàm thuần; Đang giao lấy dòng sớm nhất `confirmed → shipping`; Đã giao chỉ khi đơn đang `delivered`); FR-9 `StaffUiProvider` (client) ở `app/staff/layout.tsx` giữ tab, từ khóa, toast trong bộ nhớ, tải lại về tab mặc định; FR-18 `readFromStorage` làm sạch giỏ cũ (bỏ `stock`, loại dòng thiếu field, kẹp 1..10, khóa `shoplite:cart`) và `quantity-input` ở `/cart` có `max = max(quantity, cap)`; FR-20 service dựng sẵn `message` `RATE_LIMITED` từ `shopConfig.shopPhone`, `CheckoutForm` hiện `error.message`; FR-6 xóa số tài khoản hard-code ở `src/app/orders/[id]/page.tsx:132`; dọn repo: thêm `storage/` vào `.gitignore` (không xóa file), cập nhật câu nhắc `storage/orders.json` trong `src/data/products.ts`.
- Điểm chạm code và test bị ảnh hưởng (addendum): `order-service.ts` (trừ kho nguyên tử, `INSUFFICIENT_STOCK` trả mọi dòng thiếu, gộp một giao dịch, hủy theo mã lý do), `order-repository.ts`, `order-errors.ts`, route `api/orders/**` (GET luôn 401, PATCH luôn 401), `app/orders/[id]/page.tsx` (gỡ nút hủy, chỉ Dữ liệu tối thiểu), `lib/http.ts`, `package.json` (script theo AD-30, AD-31), `nav-links.tsx` (menu "Đơn hàng" tới Tra đơn), catalog-service/stock-badge/product-card, `app/products/[slug]/page.tsx`, `cart-reducer.ts`; test: `src/app/api/orders/route.test.ts` chuyển sang `*.db.test.ts` (GET luôn 401), bỏ test repository trong bộ nhớ, viết lại `e2e/shopping-flow.spec.ts` (luồng sau đặt hàng, bước "Tất cả đơn hàng"), giữ `checkout-form.test.tsx` nếu còn URL `/orders/{id}?placed=1`, `playwright.config.ts` theo AD-30; giữ URL `/orders/:id?placed=1`; repo chưa có `.github/workflows` nên chưa có CI.
- Thứ tự phát hành: `PATCH /api/orders/:id` và nút hủy của Khách hàng đóng ở Story 1.7; `/orders` thành trang Tra đơn ở Story 3.2; PR đóng nốt route đọc cũ (`GET /api/orders`, kiểm quyền `GET /api/orders/:id`) merge sau cùng, khi DB, Tồn kho, Trang xác nhận, Tra đơn và Trang nhân viên đã xong (AD-31; NFR10).
- Quy tắc ID đã rút: không dùng lại ID AD đã rút (AD-4, AD-5, AD-7, AD-11, AD-13, AD-15, AD-17, AD-21, AD-23, AD-24, AD-26, AD-28, AD-29, AD-32); mỗi story tham chiếu quy tắc tại vị trí mới (bảng "AD đã rút" của Spine): AD-7 nay ở AD-8, AD-11 ở AD-9 và AD-3, AD-13 ở AD-12, AD-15 ở AD-16, AD-17 ở AD-18, AD-21 ở AD-20, AD-23 và AD-24 ở AD-25, AD-29 ở AD-27, AD-32 ở AD-31.
- Stack cố định (Spine Stack): Node >= 22.18.0, Next.js và eslint-config-next 16.4.6, React 19.3.0, TypeScript 5.9.3, Zod 4.6.7, Tailwind CSS 4.3.3, Vitest 5.0.5, Playwright 1.64.1, PostgreSQL 14.18, drizzle-orm 0.45.4, drizzle-kit 0.31.11, pg 8.23.1, @types/pg 8.23.1; hash mật khẩu bằng `node:crypto` scrypt và chạy script TS bằng Node type stripping, không thêm package (AD-6, AD-16, AD-31).
- Hạng mục hoãn có điều kiện trước đơn thật (Spine Deferred, không thuộc MVP story nhưng là ràng buộc phát hành): nâng PostgreSQL lên major còn hỗ trợ; backup (`pg_dump` định kỳ, thử khôi phục); thời hạn lưu và xóa dữ liệu cá nhân (chủ shop quyết định); topo proxy để đặt `TRUSTED_PROXY_HOPS`; giá trị thật `SHOP_CONTACT_PHONE` và số tài khoản; CI, giám sát, dọn `rate_limits`/`staff_sessions`, Node 24 trước 2027-04-30 đều hoãn (AD-31).

### UX Design Requirements

Nguồn: `DESIGN.md` và `EXPERIENCE.md` (spine pair), cộng ba mock tham chiếu. Câu chữ trong dấu backtick là câu đã chốt, dùng nguyên văn trong AC.

**Token và nền tảng thiết kế**

- UX-DR1: Dùng class Tailwind đúng như bảng token DESIGN.md, không chép hex vào code, không thêm palette mới. Thêm các vai trò delta `flag-bg` (rose-50), `flag-fg` (rose-700), `flag-ring` (rose-200) cho cảnh báo vận hành và `scrim` (slate-900/55) cho nền sau `action-dialog`; không dùng `rating` hay màu Trạng thái cho cảnh báo.
- UX-DR2: Đổi chữ badge Đã hủy từ `text-slate-500` sang `text-slate-600` ở biến thể `cancelled` trong `src/features/orders/components/order-status-badge.tsx` (tương phản 4.35:1 lên 6.92:1); giữ nguyên bốn biến thể còn lại (pending amber, confirmed sky, shipping indigo, delivered emerald).
- UX-DR3: Viền focus trên mọi điều khiển ở màn hình mới (`/orders`, `/orders/:id`, `/staff/login`, `/staff`, `/staff/orders/:id` và component Delta đặt trong trang cũ như `stock-conflict-row` ở `/checkout`) là 2px `primary` cách 2px, kể cả `button-secondary`, `button-ghost`, `button-danger`; truyền `focus-visible:outline-indigo-600!` qua `className`, không sửa biến thể trong `button.tsx`. Phần còn lại của `/checkout` và trang cửa hàng giữ nguyên focus hiện có.
- UX-DR4: Typography delta: `order-code` 20px/700/1.4 letter-spacing 0.01em (`text-xl`) ở màn hẹp và `order-code-lg` 24px (`text-2xl`) ở desktop, cả hai `tabular-nums`; `tab-label` 12px/500 và `tab-label-active` 12px/700 (`text-xs`); `flag-label` 12px/700; mã đơn và số tiền xếp cột dùng `tabular-nums`; không dùng chữ dưới 12px; font Be Vietnam Pro, subset `latin` và `vietnamese`, độ đậm 400/500/600/700.
- UX-DR5: Spacing và vùng bấm delta: `tap-min` 44px cho mọi nút và điều khiển mới dưới `md` (kể cả `Đăng xuất`, `Lấy N`, `Bỏ`), từ `md` chấp nhận 40px; dùng `size="md"` kèm `max-md:min-h-11`, không thêm cỡ nút mới; nút `Tìm` giữ 44px ở mọi khổ; `dialog-max` 448px; `viewport-min` 390px; lề trang 16px, đệm thẻ 20px, khung trang 1152px, trang đơn 896px.
- UX-DR6: Bo góc delta: `rounded-md` (6px) chỉ dùng cho `overdue-label` và `refund-flag-label` để khác hình với badge Trạng thái dạng viên thuốc; `action-dialog` dùng `rounded-2xl`; nút và ô nhập `rounded-xl`, thẻ `rounded-2xl`, badge `rounded-full`.
- UX-DR7: Tách layout khu nhân viên khỏi khu cửa hàng: `app/layout.tsx` hiện gắn cứng `Header` và `Footer` cho mọi route, cần tách để khu nhân viên dùng khung 1152px và không có footer cửa hàng, không có menu mua sắm hay giỏ hàng; lối vào duy nhất là gõ `/staff`, không đặt link sang `/staff` ở cửa hàng.
- UX-DR8: Chỉ giao diện sáng (`color-scheme: light`); không thêm dark mode.
- UX-DR9: Tương phản tối thiểu đã đo, phải giữ: chữ trắng trên `primary` 6.46:1, trên `danger` 4.53:1, `flag-fg` trên `flag-bg` 5.49:1, `ink-muted` trên thẻ 4.76:1; `ink-placeholder` (2.63:1) không dùng cho nội dung cần đọc, chỉ trong ô nhập.
- UX-DR10: Đặt tên thành phần dùng chung khi build: tách `inputClass` cục bộ của `checkout-form.tsx` thành `form-field` dùng chung và tách chuỗi class lặp lại của `card` thành component/hằng dùng chung.

**Component hiện có (giữ nguyên, kèm quy tắc hành vi)**

- UX-DR11: `button-primary`, `button-secondary`, `button-ghost`, `button-danger`: mỗi vùng chỉ một `button-primary`; disabled khi đang gửi; `button-secondary` dùng cho Sao chép, Quay lại, Tra đơn, Tìm và không đổi dữ liệu đơn; `button-ghost` cho `Đăng xuất`, `Bỏ`; `button-danger` chỉ cho `Hủy đơn` (cả nút mở hộp thoại và nút xác nhận; nút mở không đổi dữ liệu ngay); không tạo biến thể nút mới; cỡ `sm` 32px, `md` 40px, `lg` 48px, disabled mờ 50%.
- UX-DR12: `form-field` ở màn hình mới: cao 44px, viền `ink-muted` (4.76:1), viền lỗi `danger` (4.53:1), focus viền 2px `primary`, chữ lỗi `caption` màu `danger` đặt dưới trường, giữ nguyên giá trị đã nhập; dùng cho Đặt hàng, Tra đơn, Đăng nhập, lý do `Khác` và `order-search`; trang cũ giữ viền `border-control` và viền lỗi `danger-border`.
- UX-DR13: `card`: `rounded-2xl`, nền trắng, viền `border-default`, `shadow-sm`, đệm 20px; gom thông tin, không bấm được trừ khi là `order-row`.
- UX-DR14: `success-banner`: nền `success-soft`, icon `success-icon`; chỉ hiện khi `?placed=1` và đơn còn Chờ xác nhận, với tiêu đề `Đặt hàng thành công`.
- UX-DR15: `error-banner`: nền `danger-soft`, chữ `danger-ink`, `role="alert"`, biến mất khi gửi lại; dùng ở Đặt hàng, Tra đơn, Đăng nhập, trong `action-dialog` và đầu trang khu nhân viên; lỗi khi hộp thoại còn mở hiện trong hộp thoại, xung đột sau khi đóng hộp thoại hiện ở đầu trang.
- UX-DR16: `empty-state`: viền đứt, canh giữa, prop `emoji` bắt buộc; tab trống dùng câu của Voice and Tone và không có nút; không có kết quả tìm kiếm có nút `Xóa tìm kiếm`. Emoji: Cần xử lý trống ✅, Đã giao trống 📦, Đã hủy trống 🚫, Cần hoàn tiền trống 💸, không tìm thấy đơn 🔍. Câu chữ: Cần xử lý `Không còn đơn cần xử lý`; Đã giao `Chưa có đơn đã giao`; Đã hủy `Chưa có đơn đã hủy`; Cần hoàn tiền `Không có đơn cần hoàn tiền` `[ASSUMPTION: A15]`.
- UX-DR17: `order-status-badge`: viên thuốc, `badge` 12px/600, 5 biến thể theo bảng màu Trạng thái, luôn có chữ, không bấm được, dùng ở mọi nơi có Trạng thái; `stock-badge` giữ nguyên (Còn hàng, Chỉ còn N sản phẩm, Hết hàng) nhưng đọc từ Tồn kho thực tế (FR-18).
- UX-DR18: `store-header` (Logo, menu, giỏ; mục "Đơn hàng" dẫn tới Tra đơn), `store-footer` (ba cam kết và bản quyền; không xuất hiện ở khu nhân viên), `price-tag` và `rating-stars` (chỉ hiển thị) giữ nguyên.
- UX-DR19: `quantity-input`: giữ hình thức (cao 40px, nút giảm, ô số, nút tăng); khi đã biết Tồn kho chặn tăng vượt `min(Tồn kho, 10)` tính cả số đã có trong giỏ, không tự giảm số đã có; lỗi tải Tồn kho thì giới hạn 10; ở `/cart` có `max = max(quantity, cap)`.

**Component Delta (khu nhân viên)**

- UX-DR20: `staff-header`: cao 64px, nền trắng, viền dưới; Logo ShopLite, bên phải tên người đăng nhập và `button-ghost` `Đăng xuất` theo quy tắc vùng bấm; ở 390px Logo, tên, Đăng xuất trên một hàng; `Đăng xuất` hủy phiên và về `/staff/login`.
- UX-DR21: `order-search`: dùng `form-field`, nhãn `Tìm đơn`, placeholder `Mã đơn hoặc số điện thoại`, icon tìm kiếm `lucide-react`, `button-secondary` `Tìm` cùng hàng cao 44px; tìm trên mọi tab, gửi bằng Enter hoặc nút `Tìm`; gửi ô rỗng thì trở về tab trước đó; từ khóa chỉ giữ trong bộ nhớ, không lên URL, không lưu bền, mất khi tải lại; khớp chính xác sau chuẩn hóa `0...` và `+84...` `[ASSUMPTION: A5]`.
- UX-DR22: `order-tabs`: lưới 4 cột bằng nhau trên một hàng ở 390px, không cuộn ngang, cao tối thiểu 44px, cho xuống 2 dòng; tab chọn dùng `tab-label-active`, chữ `primary-ink`, gạch dưới 3px `primary`; mẫu `tablist` kích hoạt thủ công (phím mũi tên chỉ di chuyển focus, `Enter` hoặc `Space` mới đổi tab); đổi tab tải lại dữ liệu nhóm đó; khi xem kết quả tìm kiếm tab trước đó vẫn đánh dấu (`aria-selected="true"`, `tabindex="0"`) và kết quả nằm trong vùng riêng có nhãn `Kết quả tìm kiếm`; kích hoạt tab khác hoặc chính tab đang đánh dấu thì rời kết quả và xóa từ khóa `[ASSUMPTION: A21]`.
- UX-DR23: `tab-count`: viên thuốc nhỏ `flag-bg`/`flag-fg` trong tab Cần hoàn tiền, đếm đơn có cờ chưa xử lý, không phụ thuộc từ khóa tìm kiếm, ẩn khi bằng 0, cập nhật sau thao tác hoặc khi tải trang, nguồn `refundPendingCount` của danh sách và tìm kiếm; có tên đọc được, ví dụ "Cần hoàn tiền, 3 đơn" `[ASSUMPTION: A7]`.
- UX-DR24: `order-row` (màn hẹp): thẻ một đơn gồm Mã đơn dạng link có gạch chân, `order-status-badge`, phương thức thanh toán, tên khách, `tel-link`, và `overdue-label` hoặc `refund-flag-label` nếu có; vùng bấm mở rộng ra cả thẻ bằng lớp phủ; `tel-link` nằm trên lớp phủ và là vùng bấm riêng, không mở Chi tiết đơn; không có nút đổi Trạng thái trên dòng.
- UX-DR25: `order-table` (từ `md`): bảng 5 cột Mã đơn, Khách, Thanh toán, Trạng thái, Nhãn; dòng chia `border-hairline`, hover `surface-page`, Mã đơn là link có gạch chân, lớp phủ tính trên cả dòng; cột Nhãn chứa `overdue-label` hoặc `refund-flag-label`, trống hiện `—`.
- UX-DR26: `overdue-label`: chỉ cho đơn chuyển khoản Chờ xác nhận quá 24 giờ; chữ `CHUYỂN KHOẢN CHỜ QUÁ 24 GIỜ` ở `order-row` và Chi tiết đơn, `CHỜ QUÁ 24 GIỜ` ở cột Nhãn của `order-table`; `flag-fg` trên `flag-bg`, `rounded-md`; không tự hủy đơn; mất nhãn khi đơn rời Chờ xác nhận.
- UX-DR27: `refund-flag-label`: ở `order-row`, `order-table` và đầu Chi tiết đơn; `Cần hoàn tiền` (`flag-fg` trên `flag-bg`, viền `flag-ring`) và `Đã xử lý hoàn tiền` (`ink-secondary` trên `surface-muted`, viền `border-default`); đơn COD không có nhãn; Nhân viên và Quản lý đều thấy, chỉ đọc; không xuất hiện ở khu Khách hàng.
- UX-DR28: `tel-link`: liên kết `tel:` màu `primary-ink` có gạch chân, vùng bấm tối thiểu 44px, có nhãn đọc được ("Gọi khách {tên}"); số shop trên Trang xác nhận cũng dùng `tel-link` `[ASSUMPTION: A13]`; trên desktop `tel:` tùy trình duyệt, số vẫn đọc và chép được.
- UX-DR29: `history-list`: chỉ đọc, theo thời gian cũ trước, giữ cả dòng đã bị Lùi đơn sửa; hiện người thực hiện, thời gian, Trạng thái cũ, Trạng thái mới, lý do; dòng tạo đơn hiện `Tạo đơn` thay Trạng thái cũ; dòng hoàn tiền hiện `Đã xử lý hoàn tiền: {kết quả}` thay cho cặp Trạng thái (ở màn rộng chiếm cả hai cột Trạng thái); màn hẹp là danh sách dòng với hai `order-status-badge` nối bằng mũi tên, màn rộng là bảng Thời gian, Tài khoản, Trạng thái cũ, Trạng thái mới, Lý do.
- UX-DR30: `toast`: nền `ink-primary`, chữ `ink-inverse`, `rounded-xl`, `shadow-md`; báo ngắn sau thao tác, tự ẩn, không chặn thao tác, `role="status"` (đọc qua `aria-live`); vẫn hiện sau khi chuyển trang sau Hủy đơn; thời lượng và vị trí do triển khai chọn `[ASSUMPTION: A19]`.

**Component Delta (khu Khách hàng và checkout)**

- UX-DR31: `order-code-block`: thẻ có nhãn `Mã đơn`, mã ở `order-code` (desktop `order-code-lg`, `tabular-nums`), được xuống dòng khi thiếu chỗ, `button-secondary` `Sao chép Mã đơn` và lời nhắc `Hãy lưu lại Mã đơn để tra cứu sau. Mất mã thì gọi shop.`; luôn hiện ở Trang xác nhận; không có danh sách đơn gần đây; sao chép thành công thì nút đổi thành `Đã sao chép` trong 2 giây, thất bại hiện `Không sao chép được. Hãy ghi lại Mã đơn.` `[ASSUMPTION: A12]`.
- UX-DR32: `bank-transfer-card`: `card` với danh sách nhãn và giá trị Số tiền, Số tài khoản, Ngân hàng, Nội dung (Nội dung là Mã đơn); chỉ hiện khi đơn chuyển khoản còn Chờ xác nhận `[ASSUMPTION: A6]`; số tài khoản và tên ngân hàng lấy từ `bankTransfer`, không hard-code.
- UX-DR33: `status-timeline`: danh sách có thứ tự dọc; mốc hiện tại đậm, có chữ `(hiện tại)`, màu `primary`, `aria-current="step"`; mốc đã qua `ink-secondary` kèm giờ; mốc chưa tới `ink-muted` với chữ `chưa tới`; không hiện tên Nhân viên hay lý do; theo quy tắc mốc (Đang giao giữ giờ ban đầu; sau Lùi đơn mốc Đã giao là `chưa tới`; đơn Đã hủy chỉ hiện các mốc đã qua và mốc Đã hủy `[ASSUMPTION: A16]`).
- UX-DR34: `next-step-block`: khối `surface-page`, `rounded-xl`, tiêu đề `Bước kế tiếp` và đúng một câu theo Trạng thái và phương thức thanh toán, không hứa ngày giao. Câu theo Trạng thái: Chờ xác nhận `Shop sẽ kiểm tra và xác nhận đơn của bạn.`; Đã xác nhận `Shop đang chuẩn bị hàng để giao.`; Đang giao `Đơn đang trên đường giao đến bạn.`; Đã giao `Chưa nhận được hàng? Gọi shop qua {số}.`; Đã hủy COD `Đơn đã hủy. Cần hỗ trợ, vui lòng liên hệ shop qua {số}.`; Đã hủy chuyển khoản `Đơn đã hủy. Nếu bạn đã chuyển khoản, vui lòng liên hệ shop qua {số}.`. Dòng liên hệ: Chờ xác nhận và Đã xác nhận `Muốn hủy đơn, liên hệ shop:` {số}; Đang giao `Cần hỗ trợ, gọi shop:` {số} `[ASSUMPTION: A13]`.
- UX-DR35: `masked-recipient`: một dòng `body`, dạng `Ng*** · 090****001`, không có địa chỉ; chỉ nhận dữ liệu đã che từ server (tên từ 3 ký tự giữ 2 ký tự đầu, tên 1-2 ký tự giữ ký tự đầu, số chuẩn hóa `0...` rồi giữ 3 đầu và 3 cuối).
- UX-DR36: `stock-conflict-row` ở `/checkout`: nền `danger-soft`, chữ `danger-ink`, `rounded-xl`; hiện tên sản phẩm, `Bạn chọn {X} · Chỉ còn {N}`, `button-primary` `Lấy {N}` và `button-ghost` `Bỏ` theo quy tắc vùng bấm; `Lấy N` đặt số lượng về N, `Bỏ` xóa dòng; giỏ và tổng tiền (gồm phí giao nếu xuống dưới ngưỡng miễn phí) cập nhật ngay, Khách không phải quay lại giỏ; N = 0 chỉ hiện `Hết hàng` và `Bỏ`; khu vực có tiêu đề `Một số sản phẩm không đủ hàng` và mô tả `Chọn cách xử lý để đặt tiếp.`
- UX-DR37: Nội dung Trang xác nhận. Có: Mã đơn, giờ đặt, Trạng thái, mốc thời gian, bước kế tiếp, sản phẩm (ảnh `ProductImage` cỡ `sm`, tên, số lượng, đơn giá × số lượng, thành tiền), Tạm tính, Phí giao hàng (`Miễn phí` khi bằng 0), Tổng cộng, phương thức giao hàng và thanh toán, tên và số đã che, số shop ở mọi Trạng thái, lối `Tra đơn` với Mã đơn điền sẵn, thông tin chuyển khoản khi chuyển khoản còn Chờ xác nhận. Không có: địa chỉ đầy đủ, email, ghi chú, tên Nhân viên, lý do nội bộ, thao tác hủy hoặc sửa, câu khẳng định đã trả tiền hay sẽ được hoàn, `refund-flag-label`, kết quả xử lý hoàn tiền, ngày giao dự kiến. Thứ tự một cột ở 390px: Mã đơn, chuyển khoản, đơn hàng, Trạng thái, liên hệ; lưới 2 cột từ `sm` (640px) với cùng nội dung.

**Hộp thoại và lý do**

- UX-DR38: `action-dialog`: thẻ tối đa 448px canh giữa, lề 16px ở 390px, nền `scrim`, `rounded-2xl`, đệm 20px; bẫy focus; chỉ một lớp, không chồng hộp thoại; `Quay lại` đóng ngay; `Esc` đóng ngay khi chưa nhập, nếu đã chọn lý do, chọn kết quả hoặc gõ chữ thì hỏi lại trong hộp thoại `Bỏ nội dung đã nhập?` với nút `Tiếp tục nhập` và `Bỏ` (`Esc` lần hai tương đương `Tiếp tục nhập`) `[ASSUMPTION: A22]`; khi đang gửi khóa mọi cách đóng; bấm nền không đóng khi đã nhập dữ liệu `[ASSUMPTION: A9]`.
- UX-DR39: `reason-option`: dòng radio cao tối thiểu 44px, viền `border-default`, khi chọn viền `primary`; không chọn sẵn khi mở hộp thoại; chọn đúng một; lý do là `fieldset` có `legend`, lỗi nối bằng `aria-describedby`; ghi chú dưới danh sách dùng `caption` màu `ink-secondary` và thay đổi đọc qua `aria-live`; dùng ở hộp thoại Hủy, Lùi đơn, Đã xử lý hoàn tiền; đổi lựa chọn thì xóa chữ đã nhập.
- UX-DR40: Quy tắc `Khác` (quyết định mới của landv): ô `Nhập lý do` chỉ hiện khi chọn `Khác`, bắt buộc có chữ sau `trim`, chuỗi chỉ có khoảng trắng không hợp lệ; ô nhập chặn ở 200 ký tự bằng thuộc tính `maxlength="200"`, luôn hiện bộ đếm `x/200`; server vẫn trả `VALIDATION_ERROR` nếu vượt 200 (server là rào cuối). Đếm 200 theo `.length` JavaScript (UTF-16, cùng đơn vị với `maxlength`) sau `trim`, ở cả bộ đếm và server. Áp dụng cho `Khác` ở hộp thoại Hủy và Lùi đơn và cho ô lý do của hộp thoại đính chính hoàn tiền.
- UX-DR41: Hộp thoại Hủy: tiêu đề `Hủy đơn?`, nhãn `Chọn lý do (bắt buộc)`, danh sách `Khách đổi ý`, `Không liên lạc được`, `Đơn trùng`, `Hết hàng`, `Khác`; ô `Nhập lý do` khi chọn `Khác`; nút `Quay lại` và `Hủy đơn` (`button-danger`). Ghi chú Tồn kho hiện sau khi chọn lý do: khác `Hết hàng` thì `Tồn kho được hoàn ngay.`; `Hết hàng` thì `Không hoàn Tồn kho cho toàn bộ đơn.`; chọn `Khác` hiện thêm `Nếu hết hàng, hãy chọn lý do Hết hàng` (Tồn kho vẫn hoàn). Chỉ với đơn chuyển khoản thêm `Đơn chuyển khoản sẽ bật Cờ cần hoàn tiền.`; đơn COD không hiện câu này. Thiếu lý do báo `Vui lòng chọn lý do.` hoặc `Vui lòng nhập lý do.` tại trường, không gửi.
- UX-DR42: Hộp thoại Lùi đơn (chỉ Quản lý): tiêu đề `Lùi đơn về Đang giao?`, hiện Mã đơn, nhãn `Chọn lý do (bắt buộc)`, danh sách `Bấm nhầm, hàng còn trên xe`, `Khách báo chưa nhận hàng`, `Khác` (kèm ô `Nhập lý do`), ghi chú `Tồn kho không đổi. Lịch sử giữ cả dòng cũ.`, nút `Quay lại` và `Lùi đơn`; lúc mở không có lựa chọn nào chọn sẵn.
- UX-DR43: Hộp thoại Đã giao: tiêu đề `Xác nhận đã giao?`, nội dung Mã đơn và tên người nhận, nút `Quay lại` và `Đã giao` `[ASSUMPTION: A9]`; các nút chuyển bước là `Xác nhận đơn`, `Chuyển Đang giao`, `Đánh dấu Đã giao`; chỉ bước Đã giao đi qua hộp thoại, các bước tiến còn lại một lần bấm.
- UX-DR44: Hộp thoại hoàn tiền (chỉ Quản lý): (a) `Đã xử lý hoàn tiền?` với Mã đơn, nhãn `Chọn kết quả (bắt buộc)`, hai kết quả `Đã hoàn tiền` và `Khách chưa chuyển tiền`, câu `Thao tác này được ghi vào Lịch sử. Hệ thống không chuyển tiền.`, nút `Quay lại`, `Xác nhận`, thiếu kết quả báo `Vui lòng chọn kết quả.`; (b) `Ghi thêm kết quả Đã hoàn tiền?` với Mã đơn và `Dòng Khách chưa chuyển tiền vẫn giữ trong Lịch sử. Hệ thống không chuyển tiền.`, không cần chọn kết quả, nút `Ghi thêm: Đã hoàn tiền` dùng `button-primary` `[ASSUMPTION: A23]`; (c) đính chính: nút `Đính chính: Khách chưa chuyển tiền` dùng `button-secondary`, hộp thoại có Mã đơn, ô `Nhập lý do` bắt buộc (`maxlength="200"`, bộ đếm `x/200`, đếm `.length` sau `trim`), `Dòng Đã hoàn tiền vẫn giữ trong Lịch sử.`, nút `Quay lại`, `Xác nhận`; thiếu lý do báo lỗi tại trường, giữ hộp thoại và dữ liệu, không coi là xung đột `[ASSUMPTION: A24]`. Toast `Đã xử lý hoàn tiền đơn #{Mã đơn}: {kết quả}`.
- UX-DR45: Vùng hai nút (action-dialog và vùng thao tác ở Chi tiết đơn): dưới `md` xếp dọc, nút chính ở trên, mỗi nút toàn chiều rộng; từ `md` xếp ngang, nút chính bên phải; trong DOM nút phụ đứng trước nút chính với `flex flex-col-reverse gap-2 md:flex-row md:justify-end` để thứ tự `Tab` khớp thứ tự nhìn; khi `Hủy đơn` đứng cạnh `Xác nhận đơn` hoặc `Chuyển Đang giao` thì nút chính là nút tiến Trạng thái.
- UX-DR46: Thao tác hiển thị theo Trạng thái và vai: Chờ xác nhận `Xác nhận đơn`, `Hủy đơn`; Đã xác nhận `Chuyển Đang giao`, `Hủy đơn`; Đang giao `Đánh dấu Đã giao`; Đã giao Nhân viên không có nút, Quản lý `Lùi đơn về Đang giao (Quản lý)`; Đã hủy không cờ không có nút; Đã hủy cờ bật Quản lý `Đã xử lý hoàn tiền`; kết quả mới nhất `Khách chưa chuyển tiền` Quản lý `Ghi thêm: Đã hoàn tiền`; kết quả mới nhất `Đã hoàn tiền` Quản lý `Đính chính: Khách chưa chuyển tiền`; Nhân viên không bao giờ thấy nút Lùi đơn hoặc nút hoàn tiền (kể cả dạng vô hiệu), server vẫn trả 403.

**State Patterns**

- UX-DR47: `/checkout`: đang gửi thì `Đặt hàng` disabled `[ASSUMPTION: A18]`; thiếu hàng giữ form, hiện `stock-conflict-row` và `Đặt hàng` disabled đến khi mọi dòng được xử lý `[ASSUMPTION: A17]`; tồn kho đổi tiếp khi đặt lại thì hiện lại `stock-conflict-row` với N mới, form giữ nguyên; bỏ hết mọi dòng thì hiện trạng thái giỏ trống hiện có; `RATE_LIMITED` hiện `error-banner` với `Bạn đã đặt quá nhiều đơn. Vui lòng thử lại sau hoặc liên hệ shop qua {số}.`, form giữ nguyên, không tạo đơn, không trừ kho `[ASSUMPTION: A14]`.
- UX-DR48: `/orders` (Tra đơn): mặc định form trống hoặc Mã đơn điền sẵn qua `/orders?orderId=<Mã đơn>`; đang gửi nút gửi disabled `[ASSUMPTION: A18]`; sai thông tin, bị chặn và đơn cũ không chuyển sang DB cùng một câu `Thông tin không đúng`, giữ Mã đơn; thiếu trường `Vui lòng nhập Mã đơn.`, `Vui lòng nhập số điện thoại.`; lỗi mạng hoặc máy chủ hiện `error-banner` `Chưa thực hiện được. Vui lòng thử lại.`, giữ dữ liệu, không dùng `Thông tin không đúng`.
- UX-DR49: `/orders/:id`: đang tải hiện khung chờ `surface-skeleton` (mẫu `animate-pulse`); lỗi tải `Chưa thực hiện được. Vui lòng thử lại.` cho thử lại; không có quyền, cookie sai hoặc hết hạn thì chuyển tới `/orders?orderId=<Mã đơn>` (Mã đơn điền sẵn), không tự chuyển ngược lại; vừa đặt hiện `success-banner`; tải lại giữ nguyên nội dung; hiển thị đủ 5 Trạng thái theo bảng của Khách hàng; sau Lùi đơn hiện Đang giao với giờ ban đầu và mốc Đã giao `chưa tới`.
- UX-DR50: `/staff/login`: đang gửi nút disabled; đã đăng nhập chuyển về `/staff`; sai hoặc bị chặn hiện `error-banner` giữ tên đăng nhập, xóa mật khẩu: `Tên đăng nhập hoặc mật khẩu không đúng` và `Đăng nhập sai quá nhiều lần. Vui lòng thử lại sau.`; lỗi mạng `Chưa thực hiện được. Vui lòng thử lại.` giữ tên đăng nhập; câu hết phiên `Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.` chỉ hiện khi có `expired=1` `[ASSUMPTION: A14]`.
- UX-DR51: Khu nhân viên chung: chưa đăng nhập hoặc hết phiên thì về `/staff/login` (hết phiên dùng `?next=<đích>&expired=1`), đăng nhập lại về đúng trang đang xem kể cả `/staff/orders/:id`, chỉ nhận đích nội bộ trong `/staff`; 403 (hiếm vì nút đã ẩn): đóng hộp thoại nếu đang mở, hiện `error-banner` đầu trang `Bạn không có quyền thực hiện thao tác này.` và tải lại đơn.
- UX-DR52: `/staff`: đang tải và đang tìm hiện khung chờ; lỗi tải danh sách hoặc kết quả tìm hiện `error-banner` `Chưa thực hiện được. Vui lòng thử lại.` cho thử lại; đang xem kết quả tìm thì tab trước đó vẫn đánh dấu và kết quả ở vùng riêng; gửi ô tìm rỗng thì bỏ kết quả về tab trước đó; tải lại trang mất từ khóa và về tab mặc định; tab trống dùng `empty-state`; tìm không kết quả hiện `Không tìm thấy đơn` và `Xóa tìm kiếm` (bấm thì quay về tab trước đó); đơn quá 24 giờ ở đầu danh sách kèm `overdue-label`; dữ liệu không tự làm mới theo thời gian thực, chỉ cập nhật sau thao tác, khi đổi tab hoặc tải lại.
- UX-DR53: `/staff/orders/:id`: đang tải hiện khung chờ; lỗi tải `error-banner` `Chưa thực hiện được. Vui lòng thử lại.`; không tồn tại hiện `Không tìm thấy đơn` và link `Danh sách`; đang gửi thao tác thì nút disabled; thành công hiện `toast` `Đã chuyển đơn #{Mã đơn} sang {Trạng thái}` và dữ liệu cập nhật ngay; lỗi mạng trong hộp thoại thì giữ hộp thoại và lý do đã chọn, hiện `error-banner` trong hộp thoại cho thử lại, thao tác một lần bấm thì hiện `error-banner` đầu trang; xung đột đồng thời (và lần ghi hoàn tiền trùng, lệch kết quả mới nhất hoặc đơn không đủ điều kiện, lỗi xung đột không phải `INVALID_STATUS_TRANSITION`) đóng hộp thoại nếu đang mở, hiện `error-banner` đầu trang `Đơn vừa được người khác cập nhật`, tải lại Trạng thái mới nhất, không ghi dòng Lịch sử cho bên thua.
- UX-DR54: Sau thao tác: Hủy đơn về danh sách giữ tab trước đó, `toast` vẫn hiện `[ASSUMPTION: A8, A19]`; Lùi đơn ở lại Chi tiết đơn và thấy dòng Lịch sử mới; Xác nhận đơn, Chuyển Đang giao, Đánh dấu Đã giao ở lại Chi tiết đơn `[ASSUMPTION: A8]`; Đã xử lý hoàn tiền ở lại Chi tiết đơn, đơn rời tab Cần hoàn tiền nhưng vẫn ở tab Đã hủy với cả hai kết quả `[ASSUMPTION: A10]`; ghi thêm kết quả ở lại Chi tiết đơn, nhãn giữ `Đã xử lý hoàn tiền`, nút đổi thành `Đính chính: Khách chưa chuyển tiền`; đính chính xong nút đổi thành `Ghi thêm: Đã hoàn tiền` `[ASSUMPTION: A23, A24]`.

**Tiếp cận, responsive và nguyên tắc**

- UX-DR55: Accessibility Floor: `action-dialog` dùng `role="dialog"`, `aria-modal`, `aria-labelledby`, focus vào phần tử đầu tiên khi mở và trả về nút đã mở khi đóng; nếu nút vừa bấm biến mất thì focus về tiêu đề đơn (`h1` có `tabindex="-1"`); sau Hủy đơn focus chuyển vào tab đang chọn ở danh sách; hỏi lại `Bỏ nội dung đã nhập?` dùng `role="alertdialog"` với focus vào `Tiếp tục nhập`; `toast` `role="status"`, lỗi `role="alert"`; không truyền đạt Trạng thái hay cảnh báo chỉ bằng màu; mọi form và hộp thoại dùng được hoàn toàn bằng bàn phím (`Tab` theo thứ tự đọc, `Enter` gửi form, `Esc` theo `action-dialog`, mũi tên cho radio và `order-tabs`).
- UX-DR56: Responsive: `/staff` ở 390px dùng ô tìm và `Tìm` một hàng, 4 tab một hàng, `order-row` xếp dọc; từ `md` (768px) `[ASSUMPTION: A2]` dùng `order-table` 5 cột; `/staff/orders/:id` ở 390px một cột (đầu đơn gồm Mã đơn, `order-status-badge`, `refund-flag-label`; Người nhận; Đơn hàng; thao tác; Lịch sử), từ `md` thao tác ở đầu trang, 2 thẻ thông tin, Lịch sử dạng bảng toàn chiều rộng; `staff-header` như mobile trong khung 1152px; `/checkout` lưới `1fr 380px` từ `lg` (1024px); không cuộn ngang ở mọi trang mới.
- UX-DR57: Chi tiết đơn nhân viên: có link quay lại `Danh sách` (giữ tab và từ khóa trong bộ nhớ `[ASSUMPTION: A5]`); hiện Mã đơn, `order-status-badge`, `refund-flag-label` nếu có, `overdue-label` nếu có, Người nhận (tên, `tel-link`, địa chỉ đầy đủ), Đơn hàng (sản phẩm, số lượng, thành tiền), Giao hàng, Thanh toán, Tổng tiền, vùng thao tác theo UX-DR46, và `history-list`.
- UX-DR58: Nguyên tắc tương tác: không có hành vi chỉ xuất hiện khi hover; không vuốt hay kéo thả; thao tác khó đảo ngược (Đã giao, Hủy, Lùi đơn, Đã xử lý hoàn tiền, ghi thêm kết quả) đi qua `action-dialog`; số điện thoại không bao giờ lên URL, kể cả ô tìm của nhân viên; Voice and Tone: tiếng Việt có dấu, ngắn, nói rõ việc tiếp theo, không hứa điều hệ thống không biết (ví dụ dùng `Thông tin không đúng` thay vì "Không tìm thấy Mã đơn này", `Đơn vừa được người khác cập nhật` thay vì mã lỗi).
- UX-DR59: Tham chiếu hình ảnh bắt buộc đối chiếu khi build và review (DESIGN.md và EXPERIENCE.md thắng mock khi mâu thuẫn): `mockups/key-staff-queue.html` (Hàng đợi 390px và desktop, nhãn cờ hoàn tiền tab Đã hủy), `mockups/key-staff-order-detail.html` (Chi tiết đơn Đã giao, vùng hai nút, Lịch sử, hộp thoại Lùi đơn), `mockups/key-order-confirmation.html` (Trang xác nhận Chờ xác nhận chuyển khoản và Đang giao).

### FR Coverage Map

FR-1: Epic 3 - Tra đơn bằng Mã đơn và số điện thoại
FR-2: Epic 2 - Chỉ trả Dữ liệu tối thiểu (một trang dùng chung cho Trang xác nhận và Tra đơn)
FR-3: Epic 3 - Chống dò Mã đơn
FR-4: Epic 7 - Đóng route cũ không kiểm tra quyền (đóng nốt `GET` ở Story 7.1; `PATCH /api/orders/:id` và nút hủy của Khách hàng đóng sớm ở Story 1.7, `/orders` thành Tra đơn ở Story 3.2)
FR-5: Epic 2 - Xem lại Trang xác nhận
FR-6: Epic 2 - Thông tin chuyển khoản
FR-7: Epic 2 - Trạng thái, mốc thời gian, bước kế tiếp
FR-8: Epic 4 - Đăng nhập bằng Tài khoản riêng
FR-9: Epic 4 - Hàng đợi, Danh sách đơn, tìm đơn
FR-10: Epic 5 - Đổi Trạng thái đúng thứ tự
FR-11: Epic 5 - Xác nhận hai lần cho Đã giao
FR-12: Epic 5 - Hủy đơn
FR-13: Epic 5 - Lùi đơn
FR-14: Epic 5 - Ghi Lịch sử (dòng `order_created` do Epic 1 ghi khi đặt đơn)
FR-15: Epic 4 - Xem Lịch sử
FR-16: Epic 1 - Trừ Tồn kho khi đặt
FR-17: Epic 5 - Hoàn Tồn kho khi hủy
FR-18: Epic 1 - Hiển thị Tồn kho thực tế
FR-19: Epic 1 - Giữ form khi hết hàng
FR-20: Epic 1 - Chống đơn ảo
FR-21: Epic 6 - Cờ cần hoàn tiền, kết quả, ghi thêm, đính chính (cạnh Hủy bật cờ ở Epic 5, Epic 6 xử lý kết quả)

Phân bổ nhóm yêu cầu khác: NFR3-NFR6 và NFR11-NFR17 ở Epic 1; NFR1, NFR2 ở Epic 1 và Epic 5; NFR7-NFR9, NFR18-NFR22 là điều kiện chung của mọi epic có giao diện; NFR10, NFR23-NFR25 ở Epic 7. AD-6, AD-1, AD-2, AD-3, AD-9, AD-10, AD-27, AD-30, AD-31 ở Epic 1; AD-20, AD-22 ở Epic 2; AD-25 (Tra đơn) ở Epic 3; AD-16, AD-18, AD-19 ở Epic 4; AD-8, AD-12 ở Epic 5; AD-14 ở Epic 6. Chi tiết UX-DR theo từng story nằm ở dòng "Yêu cầu" của story.

## Epic List

### Epic 1: Đặt hàng đúng Tồn kho thật
Khách hàng thấy Tồn kho thật, đặt hàng không bao giờ bán quá số hàng còn, nếu thiếu hàng vẫn giữ form và xử lý ngay tại đó, và người gian không đặt hàng loạt đơn ảo được. Gồm phần nền brownfield: nâng Next 16.4.6, engines >=22.18.0, cổng spike Drizzle (AD-6), PostgreSQL, đơn ghi vào database thay cho `storage/orders.json`.
**FRs covered:** FR-16, FR-18, FR-19, FR-20

### Epic 2: Trang xác nhận đơn
Khách hàng vừa đặt xem lại được đơn của mình trên cùng trình duyệt: Mã đơn, Trạng thái, mốc thời gian, bước kế tiếp, thông tin chuyển khoản khi cần; chỉ thấy Dữ liệu tối thiểu.
**FRs covered:** FR-2, FR-5, FR-6, FR-7

### Epic 3: Tra đơn bằng Mã đơn và số điện thoại
Khách hàng không còn trình duyệt cũ vẫn tra được đơn bằng Mã đơn và số điện thoại (không lộ số trên URL), vào đúng Trang xác nhận; người dò Mã đơn bị chặn.
**FRs covered:** FR-1, FR-3

### Epic 4: Nhân viên đăng nhập, xem Hàng đợi và Chi tiết đơn
Nhân viên và Quản lý đăng nhập bằng Tài khoản riêng, thấy Hàng đợi và 4 tab, tìm đơn bằng Mã đơn hoặc số điện thoại, mở Chi tiết đơn và đọc toàn bộ Lịch sử (chỉ đọc), dùng được ở 390px.
**FRs covered:** FR-8, FR-9, FR-15

### Epic 5: Nhân viên xử lý đơn
Nhân viên chuyển đơn đúng thứ tự, xác nhận hai lần khi Đã giao, Hủy kèm lý do (hoàn Tồn kho đúng một lần), Quản lý Lùi đơn; mọi thay đổi ghi Lịch sử trong cùng giao dịch. Cạnh Hủy đơn chuyển khoản bật cờ hoàn tiền ở tầng dữ liệu (phục vụ Epic 6).
**FRs covered:** FR-10, FR-11, FR-12, FR-13, FR-14, FR-17

### Epic 6: Quản lý xử lý hoàn tiền
Quản lý thấy đơn chuyển khoản bị hủy cần hoàn tiền, ghi kết quả `Đã hoàn tiền` hoặc `Khách chưa chuyển tiền`, ghi thêm hoặc đính chính khi ghi nhầm (có lý do, tối đa 200 ký tự); hệ thống không lưu trạng thái thanh toán và không chuyển tiền.
**FRs covered:** FR-21

### Epic 7: Đóng đường truy cập cũ
Không ai xem hay đổi được đơn của người khác qua route cũ: `GET /api/orders` trả 401 và `GET /api/orders/:id` kiểm Quyền xem đơn (`PATCH /api/orders/:id` đã đóng ở Story 1.7, `/orders` đã là Tra đơn từ Story 3.2). Đóng nốt route đọc cũ sau cùng, chạy E2E toàn tuyến và chốt điều kiện phát hành.
**FRs covered:** FR-4

## Epic 1: Đặt hàng đúng Tồn kho thật

Khách hàng thấy Tồn kho thật, đặt hàng không bán quá số còn, thiếu hàng vẫn giữ form và xử lý ngay, và không ai đặt hàng loạt đơn ảo. Epic 1 chạy sau cổng nâng phiên bản (Story 1.1) và cổng spike Drizzle (Story 1.2); chưa story nào dùng Drizzle trước Story 1.2. Bảng chỉ được tạo ở story cần dùng nó. `PATCH /api/orders/:id` và nút hủy của Khách hàng đóng ở Story 1.7 (đường hủy mới của nhân viên đến ở Epic 5); `GET /api/orders*` và trang `/orders/:id` cũ vẫn chạy đến Epic 7 (`/orders` thành Tra đơn ở Story 3.2).

### Story 1.1: Nâng Next 16.4.6 và engines Node 22.18

As a nhà phát triển ShopLite,
I want nâng `next` và `eslint-config-next` lên đúng 16.4.6 và đặt `engines.node` thành `>=22.18.0`,
So that mọi story sau chạy trên nền đã chốt trước khi chạm vào database.

**Yêu cầu:** Additional Requirements (Story đầu tiên, Stack cố định); NFR6.
**AD liên quan:** AD-6
**Phụ thuộc:** không.

**Acceptance Criteria:**

**Given** `package.json` đang ở `next` 16.4.2 và `engines.node` `>=22.12.0`
**When** nâng `next` và `eslint-config-next` lên đúng 16.4.6 (không dùng range) và đặt `engines.node` thành `>=22.18.0`
**Then** `npm run check` chạy xanh và các trang hiện có (`/`, `/products`, `/cart`, `/checkout`, `/orders`) vẫn dựng được
**And** không thêm dependency nào khác và không sửa `.env.local`.

**Given** Node cục bộ thấp hơn 22.18.0
**When** chạy `npm install` hoặc script của dự án
**Then** [Lỗi/biên] `engines` báo phiên bản không đạt thay vì chạy tiếp âm thầm
**And** README hoặc ghi chú PR nêu rõ phiên bản Node yêu cầu.

**Given** bản nâng đã merge
**When** chạy bộ test hiện có
**Then** [Lỗi/biên] mọi test cũ vẫn xanh, nếu có test vỡ vì bản Next mới thì sửa ngay trong story này, không để lại test bị bỏ qua.

### Story 1.2: Cổng spike Drizzle trên Next 16.4.6

As a nhà phát triển ShopLite,
I want một spike chạy thật gồm một đơn trừ kho qua route handler bằng đúng `runInTransaction` và `DbTx` của AD-10,
So that Drizzle được chứng minh chạy được trên Next 16.4.6 trước khi bất kỳ story nào phụ thuộc vào nó.

**Yêu cầu:** Additional Requirements (Cổng spike Drizzle, Drizzle với `node-postgres`, PostgreSQL cài sẵn không Docker); NFR1, NFR6.
**AD liên quan:** AD-6, AD-10, AD-31
**Phụ thuộc:** Story 1.1.

**Acceptance Criteria:**

**Given** `drizzle-orm` 0.45.4, `drizzle-kit` 0.31.11, `pg` 8.23.1 và `@types/pg` 8.23.1 được pin chính xác, `DATABASE_URL` trỏ `shoplite_dev` khai báo trong `.env`
**When** thêm `src/db/client.ts` (pool `pg` singleton lazy trên `globalThis`, không kết nối lúc import), `src/lib/db-tx.ts` (chỉ kiểu `DbTx` branded và `RunInTransaction`), `src/db/transaction.ts` (`runInTransaction`, READ COMMITTED) và bảng `inventory` đầu tiên bằng migration `drizzle-kit generate` (áp dụng bằng `drizzle-kit migrate` tạm thời; script `db:migrate` chính thức đến ở Story 1.4)
**Then** một route handler spike mở đúng một transaction, trừ kho bằng `UPDATE ... SET stock = stock - $n WHERE product_id = $id AND stock >= $n` và trả kết quả
**And** `DATABASE_URL` được đọc qua một `src/lib/env.ts` tối thiểu (chỉ biến này), không đọc `process.env` ở nơi khác.

**Given** tồn của một sản phẩm là 1 và nhiều request spike chạy đồng thời trên PostgreSQL thật
**When** một script Node thuần `.mjs` (không cần Vitest DB, vốn đến ở Story 1.5) bắn các request đồng thời tới route spike trên `shoplite_dev`
**Then** đúng một request thành công, các request còn lại bị từ chối, tồn cuối bằng 0
**And** lỗi giữa chừng rollback và tồn giữ nguyên.

**Given** PostgreSQL không chạy hoặc `DATABASE_URL` sai
**When** route spike được gọi
**Then** [Lỗi/biên] lỗi trả ra chỉ có `sqlState`, không lộ chuỗi kết nối hay `cause`, và không treo kết nối.

**Given** spike chưa đạt
**When** mở PR của bất kỳ story sau 1.2
**Then** [Lỗi/biên] story đó không được dùng Drizzle; PR 1.2 ghi rõ kết quả cổng đạt hay chưa và ghi lệnh đã chạy để kiểm spike (chưa có `check:full`, nó đến ở Story 1.5).

### Story 1.3: Nền cấu hình, log an toàn và ranh giới lớp

As a nhà phát triển ShopLite,
I want biến môi trường được kiểm khi khởi động, log lỗi không lộ dữ liệu và ESLint giữ đúng ranh giới lớp,
So that các story sau không làm lộ bí mật hay trộn lớp.

**Yêu cầu:** NFR3, NFR4, NFR5, NFR15; Additional Requirements (Biến môi trường, Chặn khởi động, Kiến trúc phân lớp, Làm sạch lỗi DB và log an toàn).
**AD liên quan:** AD-1, AD-3, AD-31
**Phụ thuộc:** Story 1.2.

**Acceptance Criteria:**

**Given** `src/lib/env.ts` là nơi duy nhất đọc `process.env` (trừ `NODE_ENV`, `NEXT_RUNTIME`)
**When** mở rộng thành `getServerEnv()` lazy, parse bằng Zod cho `DATABASE_URL`, `TEST_DATABASE_URL`, `ORDER_ACCESS_SECRET` (>= 32 byte), `SHOP_CONTACT_PHONE`, `BANK_NAME`, `BANK_ACCOUNT_NUMBER`, `TRUSTED_PROXY_HOPS`, `STAFF_ACCOUNTS`
**Then** `.env.example` liệt kê đủ biến với giá trị mẫu `replace_me`, `.env` gitignored giữ giá trị thật, và không biến mới nào ở `.env.local`
**And** khi `NODE_ENV=production`, giá trị `replace_me` bị coi là thiếu.

**Given** `src/instrumentation.ts#register` (runtime `nodejs`) gọi `getServerEnv()`
**When** thiếu hoặc sai biến bắt buộc, hoặc production có `TRUSTED_PROXY_HOPS` thiếu, bằng `0` hay sai định dạng
**Then** [Lỗi/biên] tiến trình log chỉ tên biến (không in giá trị) rồi `process.exit(1)`, không dùng `throw`
**And** ngoài production, thiếu `TRUSTED_PROXY_HOPS` nghĩa là `0`.

**Given** `lib/safe-log.ts#logServerError(scope, error)` là đường log lỗi server duy nhất
**When** `runInTransaction`/`withDb` ném lỗi DB
**Then** nó được làm sạch thành `DbFailure` chỉ có `sqlState`, message `Database operation failed`, không `cause`; pool có `on("error")` chỉ log `sqlState`
**And** `console.error(error)` trong `lib/http.ts` bị xóa, và `handleRouteError` trả `{ error: { code, message, details? } }` với `OrderErrorCode` mở rộng (`UNAUTHORIZED` 401, `FORBIDDEN` 403, `RATE_LIMITED` 429, `LOOKUP_FAILED` 404, `REFUND_OUTCOME_CONFLICT` 409).

**Given** quy tắc phân lớp của AD-1
**When** thêm `no-restricted-imports` và `no-restricted-syntax` vào ESLint
**Then** `src/app/**` không import `src/db` hay `*.pg.ts`, file `"use client"` không kéo `src/db`, `*.pg.ts`, `server.ts`
**And** [Lỗi/biên] một import sai lớp làm `npm run lint` đỏ, có test hoặc fixture chứng minh; `server.ts`, `*.pg.ts`, `src/db/**`, `lib/env.ts` mở đầu bằng `import "server-only"`.

### Story 1.4: Schema đơn hàng, migration và trigger Lịch sử

As a nhà phát triển ShopLite,
I want bảng đơn, dòng hàng, Lịch sử và tồn kho trong PostgreSQL cùng quy trình migrate chạy được,
So that đơn và Tồn kho có một nguồn dữ liệu duy nhất và Lịch sử không sửa được.

**Yêu cầu:** NFR1, NFR2, NFR17; Additional Requirements (Migration và seed, Schema đầy đủ, PostgreSQL cài sẵn).
**AD liên quan:** AD-6, AD-12, AD-31
**Phụ thuộc:** Story 1.3.

**Acceptance Criteria:**

**Given** `src/db/schema.ts` mở rộng bảng `inventory` của spike
**When** thêm `orders` (có `payment_method`, `refund_required`, `version integer NOT NULL DEFAULT 0`, `phone_normalized`, CHECK `NOT refund_required OR (status = 'cancelled' AND payment_method = 'bank_transfer')`), `order_items`, `order_status_history` (`event_type` thuộc `order_created`, `status_changed`, `refund_outcome_recorded` với CHECK theo loại, `actor_type` thuộc `customer`, `staff`) và các index tối thiểu của AD-12
**Then** mọi cột thời gian là `timestamptz(3)`, tiền là `integer` VND, ID nội bộ `bigint` identity `mode: "number"`
**And** migration chỉ đi tiến bằng `drizzle-kit generate`, commit trong `drizzle/`, không dùng `drizzle-kit push`.

**Given** Lịch sử phải append-only
**When** thêm custom migration (`drizzle-kit generate --custom`) với trigger `BEFORE UPDATE OR DELETE` trên `order_status_history`
**Then** `created_at` do database cấp bằng `clock_timestamp()`
**And** [Lỗi/biên] một lệnh `UPDATE` hoặc `DELETE` trên bảng này bị từ chối.

**Given** script `db:migrate` (migrator `drizzle-orm/node-postgres`) chạy bằng `node --env-file=.env --import ./scripts/ts-hooks.mjs`, và `scripts/ts-hooks.mjs` dùng `module.registerHooks` đổi `@/x` thành `src/x`, thử `.ts` và `/index.ts`, đổi `server-only` thành module rỗng, không đổi `tsconfig.json`
**When** chạy `npm run db:migrate` trên `shoplite_dev` trống, rồi chạy một script kiểm nhanh `scripts/schema-smoke.ts` bằng cùng cách
**Then** migration áp dụng thành công và script khẳng định trigger tồn tại, CHECK của `refund_required` và `CHECK (stock >= 0)` từ chối dữ liệu sai
**And** việc xác minh story này chỉ cần `npm run check`, `db:migrate` và script kiểm nhanh, không cần `check:full`.

**Given** `db:migrate` chạy lần hai
**When** không có migration mới
**Then** [Lỗi/biên] không đổi gì và không lỗi
**And** script từ chối chạy khi thiếu `DATABASE_URL`, chỉ log tên biến.

### Story 1.5: Seed Tồn kho và cổng test DB trên PostgreSQL thật

As a nhà phát triển ShopLite,
I want seed tồn kho an toàn và bộ test chạy trên PostgreSQL thật qua `check:full`,
So that mọi ca đồng thời về sau kiểm được trên database thật.

**Yêu cầu:** NFR6, NFR1; Additional Requirements (Migration và seed, Chiến lược test, Cổng test).
**AD liên quan:** AD-30, AD-31, AD-12, AD-6
**Phụ thuộc:** Story 1.4.

**Acceptance Criteria:**

**Given** `src/data/inventory-seed.ts` giữ số tồn ban đầu
**When** chạy `npm run db:seed` hai lần
**Then** tồn được chèn bằng `ON CONFLICT DO NOTHING`, lần hai không ghi đè tồn đã đổi
**And** `db:seed` chạy cùng cách với `db:migrate` (ts-hooks).

**Given** `vitest.db.config.mts` (môi trường node, `fileParallelism: false`, alias `server-only` sang stub rỗng, nạp `.env` bằng `process.loadEnvFile`, `test.env.DATABASE_URL = TEST_DATABASE_URL`) và `vitest.config.mts` loại `**/*.db.test.*`
**When** chạy `npm run db:test:prepare` rồi `npm run test:db`
**Then** global setup query `current_database()` và dừng nếu khác `shoplite_test`, reset bằng `TRUNCATE ... RESTART IDENTITY CASCADE`, rồi migrate và seed
**And** một `*.db.test.ts` khẳng định trigger append-only của Story 1.4 tồn tại sau `db:migrate` và từ chối `UPDATE`/`DELETE`.

**Given** `TEST_DATABASE_URL` trỏ `shoplite_dev` hoặc database khác `shoplite_test`
**When** chạy `db:test:prepare` hoặc `test:db`
**Then** [Lỗi/biên] từ chối chạy, không truncate gì, chỉ log tên biến
**And** `.env.example` có `TEST_DATABASE_URL`.

**Given** `npm run check:full` (= `npm run check && npm run db:test:prepare && npm run test:db`)
**When** chạy từ trạng thái sạch
**Then** cả ba bước xanh
**And** [Lỗi/biên] một bước đỏ thì `check:full` dừng với mã lỗi khác 0; từ Story 1.6 trở đi mọi PR chạm `orders`, `inventory`, `rate-limit`, `src/db`, `drizzle/` phải chạy lệnh này và ghi kết quả vào PR.

### Story 1.6: Tồn kho một chủ đọc và giỏ hàng theo Tồn kho thật

As a Khách hàng,
I want thấy nhãn tồn kho và giới hạn số lượng theo Tồn kho hiện tại,
So that tôi không chọn hàng đã hết và thấy "Hết hàng" ngay khi đơn cuối được đặt.

**Yêu cầu:** FR-18; UX-DR19; NFR12, NFR16, NFR20.
**AD liên quan:** AD-27, AD-1, AD-30
**Phụ thuộc:** Story 1.5.

**Acceptance Criteria:**

**Given** `stock` bị xóa khỏi `Product` và `src/data/products.ts`, số ban đầu ở `src/data/inventory-seed.ts` (chỉ script seed import)
**When** mọi đọc tồn đi qua `features/inventory/server.ts#readStock` và `features/catalog/server.ts` ghép `StockedProduct = Product & { stock: number }`
**Then** `queryProducts` bắt buộc nhận `source: StockedProduct[]`, `getStockStatus`, `StockBadge`, `ProductCard`, `AddToCartButton` đọc tồn từ nguồn này
**And** bộ lọc `inStock` dùng cùng nguồn.

**Given** các trang `/`, `/products`, `/products/[slug]` và route `/api/products`, `/api/products/[slug]`, `/api/inventory`
**When** khai báo `export const dynamic = "force-dynamic"` và xóa `generateStaticParams` khỏi `/products/[slug]`
**Then** không dùng `cacheComponents`, `use cache`, `unstable_cache`, `revalidate` cho tồn, `generateMetadata` chỉ đọc catalog tĩnh
**And** đơn cuối vừa đặt thì tải lại trang sản phẩm hiện "Hết hàng".

**Given** giỏ cũ trong `shoplite:cart` có field `stock` hoặc dòng thiếu field
**When** `readFromStorage` làm sạch giỏ
**Then** bỏ field `stock`, loại dòng thiếu field bắt buộc, kẹp số lượng về 1..10, giữ dòng hợp lệ và khóa `shoplite:cart`
**And** `quantity-input` chặn tăng vượt `min(Tồn kho, 10)` tính cả số đã có trong giỏ, không tự giảm số đã có, `/cart` dùng `max = max(quantity, cap)`.

**Given** việc tải Tồn kho thất bại
**When** Khách hàng bấm tăng số lượng
**Then** [Lỗi/biên] giới hạn là 10 và server vẫn kiểm lần cuối khi đặt
**And** một test khẳng định không file nào ngoài script seed import `inventory-seed.ts`.

### Story 1.7: Đặt hàng trừ Tồn kho nguyên tử trong PostgreSQL

As a Khách hàng,
I want đơn của tôi được ghi vào cơ sở dữ liệu và trừ Tồn kho đúng một lần,
So that không bao giờ có hai người cùng mua món hàng cuối.

**Yêu cầu:** FR-16; FR-14 (dòng `order_created`); FR-4 (phần `PATCH /api/orders/:id` và nút hủy của Khách hàng); NFR1, NFR11, NFR12, NFR13, NFR14, NFR17.
**AD liên quan:** AD-2, AD-3, AD-9, AD-10, AD-12, AD-20, AD-30
**Phụ thuộc:** Story 1.5, Story 1.6.

**Acceptance Criteria:**

**Given** `OrderRepository` async trên PostgreSQL (`order-repository.pg.ts`), `createOrderService(deps)` nhận `runInTransaction`, `OrderRepository`, `StockLedger` và singleton chỉ ở `features/orders/server.ts`
**When** xóa `OrderRepository.save`, `createJsonFileOrderRepository`, `createInMemoryOrderRepository`, `DEFAULT_ORDERS_FILE`, `ORDERS_FILE`
**Then** app không đọc, ghi, xóa `storage/orders.json`; route và trang cũ vẫn đọc đơn qua repository mới
**And** 11 đơn thử cũ không được chuyển.

**Given** Khách hàng đặt đơn hợp lệ
**When** `placeOrder` parse bằng Zod, gộp dòng, kiểm tối đa 10 mỗi sản phẩm và tính tiền bằng `calculateOrderTotals` từ catalog server trước khi mở transaction
**Then** trong một transaction, `reserveStock(tx, lines)` trừ kho theo `productId` tăng dần rồi `insertOrder` ghi đơn kèm một dòng `order_created` với `actor_type = customer`
**And** `orders.phone_normalized` lưu số đã qua `normalizePhone`.

**Given** tồn là 1 và N yêu cầu cùng đặt đồng thời
**When** chạy ca race "bán quá tồn" trong `*.db.test.ts`
**Then** đúng 1 đơn thành công, N-1 nhận `INSUFFICIENT_STOCK`, tồn cuối bằng 0
**And** [Lỗi/biên] đơn nhiều dòng thiếu một dòng thì không tạo đơn, không trừ dòng nào.

**Given** `reserveStock` gặp dòng thiếu
**When** đi hết mọi dòng
**Then** dòng thiếu đọc `stock` bằng câu riêng (không có hàng `inventory` tính là 0) và báo `available = max(0, min(stockĐọcĐược, requested - 1))`, ném `INSUFFICIENT_STOCK` với `details.lines` để rollback
**And** [Lỗi/biên] lỗi DB giữa transaction rollback toàn bộ: đơn, Tồn kho và Lịch sử giữ nguyên.

**Given** `OrderRepository.save` bị xóa nên đường hủy cũ `orderService.cancelOrder` (ghi qua `save`, không hoàn kho) không còn chạy được, và đường hủy mới của nhân viên chỉ đến ở Epic 5
**When** đóng luồng Khách hàng tự hủy: `PATCH /api/orders/:id` luôn trả 401 mã `UNAUTHORIZED` (mã đã thêm ở Story 1.3), không đọc database, không gọi service; xóa `cancelOrder` khỏi service, xóa `cancel-order-button.tsx` và chỗ dùng nó ở `app/orders/[id]/page.tsx`
**Then** không đường nào còn đổi Trạng thái hay hủy đơn trước Epic 5, và Tồn kho không bị lệch bởi đường hủy không hoàn kho
**And** [Lỗi/biên] `GET /api/orders`, `GET /api/orders/:id` và trang `/orders/:id` cũ vẫn chạy bằng repository mới (đến Story 2.x và 7.1), mọi test của chúng không bị skip.

**Given** test cũ phụ thuộc `save`, `cancelOrder` hoặc kho lưu trong bộ nhớ (`order-service.test.ts`, `order-repository.test.ts`, `src/app/api/orders/route.test.ts`)
**When** story này xóa các đường đó
**Then** test hủy cũ được thay bằng test `PATCH /api/orders/:id` trả 401 mà không chạm database (dạng `*.db.test.ts` nếu cần database), test repository trong bộ nhớ bị bỏ kèm lý do ghi trong PR, phần test còn lại chuyển sang PostgreSQL thật
**And** [Lỗi/biên] `npm run check` và `npm run check:full` xanh, không test nào bị `skip` chỉ để qua cổng.

### Story 1.8: Chống đơn ảo theo IP và số điện thoại

As a chủ shop,
I want giới hạn việc tạo đơn theo IP và theo số điện thoại,
So that đơn ảo không giữ hết Tồn kho.

**Yêu cầu:** FR-20; NFR3, NFR5.
**AD liên quan:** AD-10, AD-25, AD-30, AD-31, AD-3
**Phụ thuộc:** Story 1.7.

**Acceptance Criteria:**

**Given** bảng `rate_limits` và `features/rate-limit` là nơi duy nhất ghi nó, `src/lib/client-ip.ts#getClientIp` là nơi duy nhất đọc header IP
**When** `TRUSTED_PROXY_HOPS = 0` thì bucket `direct`, `n > 0` thì phần tử thứ n từ phải, thiếu hoặc không hợp lệ là `unknown`, IPv4-mapped về IPv4, IPv6 gom `/64`
**Then** `policies.ts` dựng khóa và ngưỡng (`order:ip:<ip>` 10 đơn mỗi giờ)
**And** `consume`/`release` chạy trong transaction với khóa `rate_limits` theo `key` tăng dần.

**Given** `placeOrder` theo đúng thứ tự khóa của AD-10
**When** đặt đơn: `consume(orderKey(ip))`, `lockPhone` bằng `pg_advisory_xact_lock`, `countPendingByPhone` (câu riêng; từ 3 đơn Chờ xác nhận trở lên thì chặn), rồi `reserveStock`, `insertOrder`
**Then** `0912345678` và `+84912345678` tính chung một số
**And** mọi lỗi rollback toàn bộ kể cả bộ đếm IP nên chỉ đơn thành công được đếm.

**Given** IP đã đặt 10 đơn trong 1 giờ hoặc số điện thoại đã có 3 đơn Chờ xác nhận
**When** có yêu cầu đặt tiếp
**Then** [Lỗi/biên] trả HTTP 429 mã `RATE_LIMITED`, không tạo đơn, không trừ Tồn kho
**And** `message` do service dựng sẵn từ `shopConfig.shopPhone` theo EXPERIENCE, `CheckoutForm` chỉ hiện `error.message`, không đọc env.

**Given** race "vượt 3 đơn chờ" và chuỗi `consume`/`release`
**When** chạy nhiều yêu cầu đồng thời trên PostgreSQL thật
**Then** đúng tối đa 3 đơn Chờ xác nhận tồn tại cho một số điện thoại
**And** [Lỗi/biên] một test đặt đơn song song với `consume`/`release` không bỏ sót hay đếm đôi bộ đếm.

### Story 1.9: Giữ form khi hết hàng

As a Khách hàng,
I want khi thiếu hàng lúc đặt thì form vẫn giữ thông tin và cho tôi xử lý ngay,
So that tôi không phải nhập lại hay quay về giỏ.

**Yêu cầu:** FR-19; UX-DR10, UX-DR36, UX-DR47; NFR8, NFR18.
**AD liên quan:** AD-3, AD-9
**Phụ thuộc:** Story 1.7.

**Acceptance Criteria:**

**Given** `inputClass` cục bộ của `checkout-form.tsx` được tách thành `form-field` dùng chung và chuỗi class `card` lặp lại thành component hoặc hằng dùng chung
**When** Khách hàng đặt đơn và nhận `INSUFFICIENT_STOCK` với `details.lines`
**Then** form giữ nguyên dữ liệu và đánh dấu mọi dòng thiếu bằng `stock-conflict-row` (nền `danger-soft`, chữ `danger-ink`, `rounded-xl`), hiện tên sản phẩm và `Bạn chọn {X} · Chỉ còn {N}`
**And** client chỉ đọc `details.lines` sau khi kiểm `code === "INSUFFICIENT_STOCK"`.

**Given** dòng thiếu còn N > 0
**When** Khách hàng bấm `Lấy N` hoặc `Bỏ`
**Then** `Lấy N` giảm số lượng về N, `Bỏ` xóa dòng, giỏ và tổng tiền cập nhật tại form
**And** `Đặt hàng` disabled cho đến khi mọi dòng được xử lý.

**Given** dòng thiếu có N = 0
**When** hiển thị
**Then** [Lỗi/biên] chỉ có chữ `Hết hàng` và nút `Bỏ`, không có `Lấy N`.

**Given** đang gửi đơn
**When** Khách hàng bấm `Đặt hàng` lần nữa
**Then** [Lỗi/biên] nút disabled và không gửi đôi; vùng bấm của `Lấy N` và `Bỏ` tối thiểu 44px ở 390px; trạng thái thiếu hàng không truyền đạt chỉ bằng màu.

## Epic 2: Trang xác nhận đơn

Khách hàng vừa đặt xem lại được đơn trên cùng trình duyệt, chỉ với Dữ liệu tối thiểu. Epic dùng đơn ghi ở Epic 1. **Cảnh báo triển khai:** `GET /api/orders` vẫn liệt kê toàn bộ đơn và `GET /api/orders/:id` chưa kiểm Quyền xem đơn cho đến Story 7.1 (`/orders` còn liệt kê đơn đến Story 3.2), nên không được triển khai ra ngoài trước khi Epic 7 xong. Lịch sử cho các Trạng thái sau Chờ xác nhận được dựng bằng dữ liệu test cho tới khi Epic 5 có.

### Story 2.1: Quyền xem đơn bằng cookie ký

As a Khách hàng vừa đặt hàng,
I want trình duyệt của tôi được cấp quyền xem đúng đơn tôi vừa đặt,
So that tôi xem lại được đơn mà không cần đăng nhập và người khác không xem được.

**Yêu cầu:** FR-5; NFR3, NFR4, NFR5.
**AD liên quan:** AD-20, AD-31
**Phụ thuộc:** Story 1.8.

**Acceptance Criteria:**

**Given** `ORDER_ACCESS_SECRET` (>= 32 byte) đã khai báo
**When** `placeOrder` thành công
**Then** phản hồi đặt cookie `shoplite_order_access` (`HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` ở production) có giá trị `v1.<payload>.<HMAC-SHA256>`, payload `[orderId, expEpochSeconds]`, hạn 7 ngày mỗi mã
**And** cookie chứa tối đa 20 mã `[ASSUMPTION]`, mã hết hạn bị loại trước rồi đến mã sớm nhất.

**Given** `readOrderAccess`/`grantOrderAccess` là đường duy nhất đọc và ghi cookie
**When** kiểm quyền với cookie hợp lệ cho đúng Mã đơn
**Then** có quyền xem đơn đó và không có quyền xem đơn khác
**And** so khớp chữ ký bằng `timingSafeEqual`.

**Given** cookie bị sửa, sai version, sai schema, quá 2048 byte, hết hạn hoặc thiếu
**When** kiểm quyền
**Then** [Lỗi/biên] kết quả là không có quyền và không lộ đơn có tồn tại hay không
**And** đổi `ORDER_ACCESS_SECRET` làm mất mọi Quyền xem đơn, có test.

### Story 2.2: Projection cho khách và mốc thời gian

As a Khách hàng,
I want chỉ thấy Dữ liệu tối thiểu và đúng các mốc thời gian của đơn,
So that thông tin cá nhân không bị lộ và tôi hiểu đơn đang ở đâu.

**Yêu cầu:** FR-2, FR-7; UX-DR35.
**AD liên quan:** AD-22, AD-12, AD-30
**Phụ thuộc:** Story 2.1.

**Acceptance Criteria:**

**Given** `toCustomerOrderView(order, statusRows, shopConfig)` là hàm thuần và đường duy nhất tạo dữ liệu cho khách
**When** dựng view
**Then** tập khóa cố định (`id`, `status`, `createdAt`, `milestones`, `items`, `subtotal`, `shippingFee`, `total`, `shippingMethod`, `paymentMethod`, `recipient` đã che, `shopPhone`, `bankTransfer` khi áp dụng) và không có địa chỉ, email, ghi chú, tên Nhân viên, lý do nội bộ, cờ hay kết quả hoàn tiền
**And** `GET /api/orders/:id`, `POST /api/orders` và `/orders/:id` đều dùng hàm này.

**Given** `masked-recipient`
**When** che tên và số
**Then** tên từ 3 ký tự giữ 2 ký tự đầu, tên 1-2 ký tự giữ ký tự đầu, số chuẩn hóa `0...` hiện dạng `090****001`; máy chủ che trước khi gửi, client không nhận dữ liệu thô
**And** [Lỗi/biên] test khẳng định mọi khóa ngoài danh sách cho phép bị loại.

**Given** `deriveMilestones(status, createdAt, statusRows)` trong `order-milestones.ts`, kiểu đầu vào chỉ gồm dòng `status_changed`
**When** dựng mốc
**Then** Chờ xác nhận lấy `orders.created_at`; Đã xác nhận và Đã hủy lấy dòng chuyển sang Trạng thái đó; Đang giao lấy dòng sớm nhất `confirmed → shipping`; Đã giao chỉ có khi đơn đang `delivered`
**And** [Lỗi/biên] đơn Đã hủy chỉ có mốc đã qua và mốc Đã hủy; đơn sau Lùi đơn là Đang giao với giờ ban đầu và mốc Đã giao `chưa tới`.

### Story 2.3: Trang xác nhận: Trạng thái, mốc và bước kế tiếp

As a Khách hàng,
I want mở `/orders/:id` thấy Mã đơn, Trạng thái, mốc thời gian, bước kế tiếp và nội dung đơn,
So that tôi biết đơn của mình đang ở đâu và cần làm gì tiếp.

**Yêu cầu:** FR-5, FR-7, FR-2; UX-DR1, UX-DR2, UX-DR3, UX-DR4, UX-DR5, UX-DR6, UX-DR8, UX-DR9, UX-DR13, UX-DR14, UX-DR17, UX-DR33, UX-DR34, UX-DR37; NFR7, NFR9, NFR18, NFR19.
**AD liên quan:** AD-20, AD-22
**Phụ thuộc:** Story 2.1, Story 2.2.

**Acceptance Criteria:**

**Given** token màu, chữ, khoảng cách và bo góc delta của DESIGN.md (`flag-bg`, `flag-fg`, `flag-ring`, `scrim`, `order-code`, `tap-min`)
**When** dựng `/orders/:id` bằng `card`, `order-status-badge` (5 biến thể luôn có chữ) và `status-timeline`
**Then** không chép hex vào code, không thêm palette, chỉ giao diện sáng, badge Đã hủy dùng `text-slate-600`
**And** viền focus theo UX-DR3 và tương phản theo UX-DR9.

**Given** đơn của Khách hàng ở một trong 5 Trạng thái
**When** mở trang
**Then** hiện `status-timeline` (mốc hiện tại đậm, `(hiện tại)`, `aria-current="step"`, mốc chưa tới `chưa tới`) và `next-step-block` với đúng một câu theo Trạng thái và phương thức thanh toán, kèm số shop, không hứa ngày giao
**And** nội dung và thứ tự theo UX-DR37: một cột ở 390px, lưới 2 cột từ `sm`.

**Given** đơn vừa đặt có `?placed=1` và còn Chờ xác nhận
**When** mở trang
**Then** hiện `success-banner` `Đặt hàng thành công`
**And** [Lỗi/biên] `?placed=1` với đơn đã sang Trạng thái khác thì không hiện banner; tải lại trang giữ nguyên nội dung.

**Given** trang không được hiện địa chỉ đầy đủ, email, ghi chú, tên Nhân viên, nhãn hoàn tiền hay thao tác hủy
**When** kiểm bằng test
**Then** [Lỗi/biên] không có nút hủy hay sửa nào, và không có câu khẳng định đã trả tiền hay sẽ được hoàn
**And** trang không cuộn ngang ở 390px.

### Story 2.4: Thông tin chuyển khoản và Mã đơn

As a Khách hàng chọn chuyển khoản,
I want thấy số tiền, số tài khoản và nội dung chuyển khoản khi đơn còn Chờ xác nhận, và sao chép được Mã đơn,
So that tôi chuyển khoản đúng và lưu được Mã đơn để Tra đơn sau.

**Yêu cầu:** FR-6; UX-DR11, UX-DR28 (số shop), UX-DR31, UX-DR32; NFR4.
**AD liên quan:** AD-22, AD-31
**Phụ thuộc:** Story 2.3.

**Acceptance Criteria:**

**Given** đơn chuyển khoản còn Chờ xác nhận
**When** mở trang
**Then** `bank-transfer-card` hiện Số tiền, Số tài khoản, Ngân hàng, Nội dung (là Mã đơn) lấy từ `bankTransfer` (cấu hình `BANK_NAME`, `BANK_ACCOUNT_NUMBER`), số tài khoản hard-code ở `src/app/orders/[id]/page.tsx` bị xóa
**And** số shop dùng `tel-link` có nhãn đọc được.

**Given** đơn COD hoặc đơn chuyển khoản đã rời Chờ xác nhận
**When** mở trang
**Then** [Lỗi/biên] không có `bank-transfer-card`
**And** [Lỗi/biên] không có số tài khoản trong HTML hay JSON của trang.

**Given** `order-code-block` có nhãn `Mã đơn`, mã ở `order-code` (`tabular-nums`, xuống dòng khi thiếu chỗ) và `button-secondary` `Sao chép Mã đơn`
**When** Khách hàng bấm sao chép
**Then** Mã đơn vào clipboard và có phản hồi đọc được qua `aria-live`, kèm lời nhắc lưu Mã đơn
**And** [Lỗi/biên] trình duyệt chặn clipboard thì hiện thông báo thân thiện, không lỗi trống.

### Story 2.5: Trạng thái tải, lỗi và không có quyền của Trang xác nhận

As a Khách hàng,
I want trang xác nhận xử lý đúng khi đang tải, lỗi mạng hoặc tôi không có quyền xem,
So that tôi luôn biết bước tiếp theo mà không lộ đơn của người khác.

**Yêu cầu:** FR-2, FR-5; UX-DR49, UX-DR55 (phần Trang xác nhận), UX-DR56 (phần Trang xác nhận); NFR8, NFR18.
**AD liên quan:** AD-20, AD-22
**Phụ thuộc:** Story 2.3.

**Acceptance Criteria:**

**Given** dữ liệu đang tải
**When** mở `/orders/:id`
**Then** hiện khung chờ `surface-skeleton` (`animate-pulse`)
**And** lỗi tải hiện `Chưa thực hiện được. Vui lòng thử lại.` có thao tác thử lại.

**Given** không có quyền, cookie sai hoặc hết hạn
**When** mở `/orders/:id`
**Then** [Lỗi/biên] chuyển tới `/orders?orderId=<Mã đơn>` (chỉ Mã đơn, số điện thoại không bao giờ nằm trong URL), không lộ đơn có tồn tại hay không và không tự chuyển ngược lại
**And** Mã đơn không hợp lệ về định dạng cũng chuyển cùng cách.

**Given** đơn cũ trong `storage/orders.json` hoặc link cũ
**When** mở link
**Then** [Lỗi/biên] chuyển tới Tra đơn và không hiện dữ liệu (11 đơn thử không chuyển sang DB)
**And** trang dùng được hoàn toàn bằng bàn phím, không truyền đạt Trạng thái chỉ bằng màu, không cuộn ngang ở 390px.

## Epic 3: Tra đơn bằng Mã đơn và số điện thoại

Khách hàng tra được đơn bằng Mã đơn và số điện thoại mà số không lên URL, vào đúng Trang xác nhận; người dò Mã đơn bị chặn.

### Story 3.1: Dịch vụ và API Tra đơn có giới hạn

As a Khách hàng,
I want gửi Mã đơn và số điện thoại qua `POST` và nhận quyền xem đúng đơn đó,
So that tôi tra lại được đơn mà không lộ số điện thoại hay xác nhận đơn người khác.

**Yêu cầu:** FR-1, FR-3, FR-2; NFR3, NFR14.
**AD liên quan:** AD-25, AD-20, AD-22, AD-3
**Phụ thuộc:** Story 1.8, Story 2.1, Story 2.2.

**Acceptance Criteria:**

**Given** `normalizeOrderId` (`trim`, viết hoa, kiểm `^SL-\d{8}-[0-9A-F]{6}$`) và `normalizePhone` là hàm chuẩn hóa duy nhất
**When** `POST /api/orders/lookup` nhận Mã đơn và số đúng của một đơn
**Then** một query `WHERE id = $id AND phone_normalized = $phone` khớp, cấp Quyền xem đơn (cookie) và trả dữ liệu từ `toCustomerOrderView`
**And** đơn đặt bằng `0912345678` tra được bằng `+84912345678` và ngược lại.

**Given** mọi thất bại nghiệp vụ: JSON hỏng, sai định dạng, sai số, sai Mã đơn, đơn không tồn tại, bị chặn
**When** gọi API
**Then** [Lỗi/biên] trả cùng HTTP 404 và body `{ error: { code: "LOOKUP_FAILED", message: "Thông tin không đúng" } }`, không `details`, không dùng 429
**And** chỉ có Mã đơn thì không lộ dữ liệu nào, kể cả Trạng thái.

**Given** chính sách `lookup:ip-order:<ip>:<orderId>` 5 lần mỗi 15 phút và `lookup:ip:<ip>` 20 lần mỗi 15 phút
**When** có lần tra
**Then** `consume` commit trước khi so khớp, tra đúng thì `release` bộ đếm theo Mã đơn
**And** [Lỗi/biên] Mã đơn hoặc số sai định dạng thất bại ngay và không tạo bộ đếm.

### Story 3.2: Trang Tra đơn và lối vào từ menu

As a Khách hàng,
I want một trang `/orders` để nhập Mã đơn và số điện thoại,
So that tôi xem lại đơn từ bất kỳ trình duyệt nào.

**Yêu cầu:** FR-1; FR-4 (phần `/orders` không còn liệt kê đơn); UX-DR12, UX-DR15, UX-DR18, UX-DR48; NFR7, NFR8, NFR18.
**AD liên quan:** AD-25, AD-20
**Phụ thuộc:** Story 3.1.

**Acceptance Criteria:**

**Given** `form-field` (cao 44px, viền lỗi `danger`, focus viền 2px `primary`) và `button-primary` `Tra đơn`
**When** Khách hàng mở `/orders` (form trống, hoặc `/orders?orderId=<Mã đơn>` điền sẵn trường Mã đơn từ Story 2.5) và gửi thông tin đúng
**Then** chuyển tới `/orders/:id` mà không đưa số điện thoại lên URL
**And** menu "Đơn hàng" ở `store-header` dẫn tới trang Tra đơn.

**Given** `app/orders/page.tsx` hiện liệt kê toàn bộ đơn bằng `orderService.listOrders()`
**When** thay bằng trang Tra đơn trong story này
**Then** UI liệt kê đơn và lời gọi đọc danh sách đơn bị xóa khỏi trang, `/orders` chỉ còn form Tra đơn
**And** [Lỗi/biên] một test khẳng định `/orders` không render Mã đơn hay tên của bất kỳ đơn nào kể cả khi database có đơn; `GET /api/orders` không thuộc story này và vẫn mở đến Story 7.1. Test hoặc bước E2E cũ dựa vào danh sách đơn (ví dụ bước "Tất cả đơn hàng" ở `e2e/shopping-flow.spec.ts`) được cập nhật trong story này hoặc ghi lý do trong PR; không test nào bị `skip` chỉ để qua cổng.

**Given** URL `/orders?orderId=<giá trị>`
**When** trang mở
**Then** trường Mã đơn được điền sẵn qua `normalizeOrderId`, trường số điện thoại luôn trống và không có tham số số điện thoại nào được đọc hay ghi lên URL
**And** [Lỗi/biên] giá trị `orderId` sai định dạng thì form trống, không báo lỗi.

**Given** thiếu trường
**When** gửi form
**Then** [Lỗi/biên] hiện `Vui lòng nhập Mã đơn.` hoặc `Vui lòng nhập số điện thoại.` tại trường, không gửi
**And** giữ giá trị đã nhập.

**Given** sai thông tin, bị chặn
**When** nhận `LOOKUP_FAILED`
**Then** [Lỗi/biên] hiện cùng một câu `Thông tin không đúng`, giữ Mã đơn, `error-banner` có `role="alert"` và biến mất khi gửi lại
**And** lỗi mạng hoặc máy chủ hiện `Chưa thực hiện được. Vui lòng thử lại.` và giữ dữ liệu, không dùng `Thông tin không đúng`.

**Given** đang gửi
**When** bấm lại
**Then** nút gửi disabled, không gửi đôi
**And** form dùng được bằng bàn phím và không cuộn ngang ở 390px.

### Story 3.3: Chặn dò Mã đơn và link đơn cũ

As a chủ shop,
I want người dò Mã đơn bị chặn tạm thời và link đơn cũ không lộ gì,
So that đơn của khách không bị dò ra.

**Yêu cầu:** FR-3, FR-1; NFR17, NFR24.
**AD liên quan:** AD-25, AD-30
**Phụ thuộc:** Story 3.1, Story 3.2.

**Acceptance Criteria:**

**Given** cùng IP và cùng Mã đơn
**When** gửi sai số điện thoại 5 lần trong 15 phút rồi gửi lần thứ 6 với số đúng
**Then** lần thứ 6 vẫn trả `Thông tin không đúng` (bị chặn, không phân biệt với sai)
**And** hết 15 phút thì tra đúng lại được.

**Given** chuỗi `consume`/`release` và nhiều yêu cầu đồng thời trên PostgreSQL thật
**When** chạy `*.db.test.ts`
**Then** [Lỗi/biên] không có cách dò bằng song song vượt ngưỡng 5, và tra đúng `release` không làm mất bộ đếm của các lần sai trước
**And** giới hạn `lookup:ip:<ip>` 20 mỗi 15 phút chặn dò nhiều Mã đơn từ một IP.

**Given** link `/orders/:id` cũ hoặc Mã đơn đã xóa khỏi `storage/orders.json`
**When** Khách hàng Tra đơn
**Then** [Lỗi/biên] nhận `Thông tin không đúng`, không có dữ liệu nào bị chuyển sang DB
**And** ở local bucket IP `direct` làm giới hạn áp dụng cho cả shop, ghi nhận trong test là `[ASSUMPTION]`.

## Epic 4: Nhân viên đăng nhập, xem Hàng đợi và Chi tiết đơn

Nhân viên và Quản lý đăng nhập bằng Tài khoản riêng, xem Hàng đợi, 4 tab, tìm đơn, mở Chi tiết đơn và đọc Lịch sử, dùng được ở 390px. Epic chỉ đọc; thao tác ghi thuộc Epic 5 và Epic 6.

### Story 4.1: Tài khoản nhân viên, phiên và API đăng nhập

As a Nhân viên hoặc Quản lý,
I want đăng nhập bằng Tài khoản riêng và đăng xuất được,
So that mọi thao tác trên đơn gắn đúng người.

**Yêu cầu:** FR-8; NFR4, NFR5.
**AD liên quan:** AD-16, AD-25, AD-31, AD-30
**Phụ thuộc:** Story 1.8.

**Acceptance Criteria:**

**Given** bảng `staff_accounts` (`username` unique, `CHECK (username = lower(username))`, vai `staff` hoặc `manager`) và `staff_sessions`
**When** chạy `npm run staff:seed` với `STAFF_ACCOUNTS` chỉ chứa hash scrypt (`scrypt:32768:8:3:<salt>:<hash>`, không dùng `$`)
**Then** tài khoản được nạp, cấu hình không chứa mật khẩu rõ, không có API tạo hay sửa tài khoản
**And** nạp lại làm đổi hash thì mọi phiên của tài khoản đó bị thu hồi.

**Given** `POST /api/staff/login` với `normalizeUsername = trim + toLowerCase`
**When** đăng nhập đúng
**Then** tạo phiên trong database, cookie chỉ chứa token ngẫu nhiên, hết hạn cố định 8 giờ không gia hạn trượt, scrypt bất đồng bộ (`N=32768, r=8, p=3, keylen=32`, `maxmem=67108864`), so khớp `timingSafeEqual`
**And** `POST /api/staff/logout` trả 204 và phiên cũ không dùng lại được.

**Given** sai mật khẩu, username không tồn tại hoặc username quá 64 ký tự
**When** đăng nhập
**Then** [Lỗi/biên] username quá 64 ký tự bị từ chối trước `consume`, username không tồn tại vẫn chạy scrypt trên hash giả cùng tham số, mật khẩu quá 256 ký tự bị từ chối trước scrypt, đều trả cùng lỗi
**And** sai 5 lần trong 15 phút theo cặp IP và tên đăng nhập (`login:<ip>:<username>`) thì bị chặn tạm thời.

**Given** hash scrypt không chạy trong transaction giữ khóa
**When** đăng nhập
**Then** [Lỗi/biên] không có việc chậm nào nằm trong transaction giữ khóa
**And** không có tài khoản dùng chung trong seed mẫu.

### Story 4.2: Guard, CSRF và chuyển hướng cho khu nhân viên

As a chủ shop,
I want mọi trang và API nhân viên chỉ mở cho người đã đăng nhập đúng vai,
So that đơn của khách không bị đọc hay đổi trái phép.

**Yêu cầu:** FR-8; NFR3.
**AD liên quan:** AD-18, AD-19, AD-16, AD-30
**Phụ thuộc:** Story 4.1.

**Acceptance Criteria:**

**Given** `src/proxy.ts` chỉ match `/staff/:path*`
**When** có request tới trang nhân viên
**Then** nó chỉ kiểm cookie phiên có tồn tại (không truy cập database, không đọc vai), không bao giờ chuyển hướng khỏi `/staff/login`
**And** `features/staff-auth/guard.ts` là nơi duy nhất xác thực phiên (`withStaff`, `requireStaffPage`, `getOptionalStaff`).

**Given** `assertSameOrigin(request)` dùng cho mọi request ghi của `withStaff`, `login`, `logout`
**When** request có `Sec-Fetch-Site` khác `same-origin`, hoặc thiếu header mà `Origin` khác
**Then** [Lỗi/biên] trả 403; thứ tự kiểm là same-origin, phiên (401), vai (403)
**And** Nhân viên gọi thao tác của Quản lý nhận 403.

**Given** phiên chết hoặc chưa đăng nhập
**When** vào trang nhân viên
**Then** chuyển tới `/staff/login?next=<đích>&expired=1` (hết phiên) và đăng nhập lại về đúng trang đang xem
**And** [Lỗi/biên] `sanitizeStaffNext` chỉ nhận pathname `/staff` hoặc `/staff/...`, bỏ query, từ chối `//`, `\`, dot-segment, `%2f`, `%5c`, `%2e` và `/staff/login`.

**Given** test duyệt cây route
**When** chạy một test duyệt mọi `route.ts` dưới `api/staff/` (trừ `login`, `logout`) với `Sec-Fetch-Site: same-origin` và không cookie
**Then** [Lỗi/biên] mọi route trả 401
**And** một test duyệt mọi `page.tsx` dưới `app/staff/` (trừ `login`) khẳng định có gọi `requireStaffPage`.

### Story 4.3: Khung khu nhân viên và trang đăng nhập

As a Nhân viên,
I want một trang đăng nhập và khung riêng cho khu nhân viên,
So that tôi vào làm việc nhanh và không thấy giao diện cửa hàng.

**Yêu cầu:** FR-8; UX-DR7, UX-DR20, UX-DR30, UX-DR50, UX-DR51, UX-DR15; NFR8, NFR18.
**AD liên quan:** AD-18, AD-16
**Phụ thuộc:** Story 4.2.

**Acceptance Criteria:**

**Given** `app/layout.tsx` đang gắn cứng `Header` và `Footer` cho mọi route
**When** tách layout để khu nhân viên dùng khung 1152px, không có footer cửa hàng và không có menu cửa hàng
**Then** `staff-header` cao 64px có Logo ShopLite, tên người đăng nhập và `button-ghost` `Đăng xuất` (một hàng ở 390px), `Đăng xuất` hủy phiên về `/staff/login`
**And** `StaffUiProvider` (client) ở `app/staff/layout.tsx` giữ tab, từ khóa, `toast` trong bộ nhớ (tải lại về tab mặc định, không thay guard).

**Given** `/staff/login`
**When** đăng nhập đúng
**Then** chuyển về `next` hợp lệ hoặc `/staff`, người đã đăng nhập vào `/staff/login` được chuyển về `/staff`
**And** đang gửi thì nút disabled.

**Given** sai thông tin hoặc bị chặn
**When** gửi form
**Then** [Lỗi/biên] `error-banner` `Tên đăng nhập hoặc mật khẩu không đúng` hoặc `Đăng nhập sai quá nhiều lần. Vui lòng thử lại sau.`, giữ tên đăng nhập, xóa mật khẩu
**And** lỗi mạng hiện `Chưa thực hiện được. Vui lòng thử lại.` giữ tên đăng nhập; câu `Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.` chỉ hiện khi có `expired=1`.

**Given** `toast` (`role="status"`, tự ẩn, không chặn thao tác) và 403 từ server
**When** nhận 403
**Then** [Lỗi/biên] hiện `error-banner` đầu trang `Bạn không có quyền thực hiện thao tác này.` và tải lại đơn
**And** `toast` vẫn hiện sau khi chuyển trang.

### Story 4.4: API danh sách, tìm kiếm và Chi tiết đơn cho nhân viên

As a Nhân viên,
I want dữ liệu Hàng đợi, các tab, kết quả tìm và Chi tiết đơn từ API an toàn,
So that giao diện có đúng dữ liệu và số điện thoại không lên URL.

**Yêu cầu:** FR-9, FR-15; NFR3, NFR20.
**AD liên quan:** AD-19, AD-12, AD-18, AD-30
**Phụ thuộc:** Story 4.2.

**Acceptance Criteria:**

**Given** `features/orders/staff-order-view.ts` định nghĩa DTO camelCase, thời gian ISO, không lộ `actor_staff_id` hay hàng DB
**When** gọi `GET /api/staff/orders?tab=queue|delivered|cancelled|refund&cursor=`
**Then** `queue` gồm `pending`, `confirmed`, `shipping`, không phân trang, đơn `isOverdue` lên đầu rồi `created_at` tăng dần
**And** `isOverdue` do SQL tính (`bank_transfer`, `pending`, quá 24 giờ).

**Given** tab `delivered`, `cancelled`, `refund`
**When** tải
**Then** `delivered` và `cancelled` sắp `updated_at DESC, id DESC`, 50 đơn mỗi lần, keyset `(updated_at, id)` với cursor base64url `[updatedAtIso, id]`; `refund` là `refund_required` chưa có dòng `refund_outcome_recorded`, `created_at` tăng dần, không phân trang
**And** `refundState` là `none`, `required` hoặc `processed`, `refundPendingCount` không phụ thuộc tab hay từ khóa.

**Given** `POST /api/staff/orders/search` nhận `{ query }`
**When** từ khóa là Mã đơn hoặc số điện thoại hợp lệ
**Then** khớp chính xác sau `normalizeOrderId` hoặc `normalizePhone`, mới nhất trước, từ khóa nằm trong body chứ không lên URL
**And** [Lỗi/biên] từ khóa không hợp lệ trả danh sách rỗng; cursor sai là `VALIDATION_ERROR`.

**Given** `GET /api/staff/orders/:id`
**When** gọi với đơn có Lịch sử
**Then** trả `StaffOrderDetail` với `history` theo `id` tăng dần gồm cả dòng đã bị Lùi đơn sửa và dòng hoàn tiền
**And** [Lỗi/biên] đơn không tồn tại trả `ORDER_NOT_FOUND`, không có đường sửa hay xóa Lịch sử.

### Story 4.5: Trang Hàng đợi và Danh sách đơn

As a Nhân viên,
I want thấy Hàng đợi, 4 tab và tìm đơn ngay trên trang `/staff`,
So that tôi biết cần xử lý đơn nào trước, kể cả khi dùng điện thoại.

**Yêu cầu:** FR-9; UX-DR16, UX-DR21, UX-DR22, UX-DR24, UX-DR25, UX-DR26, UX-DR28, UX-DR52, UX-DR56 (phần `/staff`); NFR8, NFR18, NFR20, NFR22.
**AD liên quan:** AD-19, AD-18
**Phụ thuộc:** Story 4.3, Story 4.4.

**Acceptance Criteria:**

**Given** `/staff` mở mặc định ở tab Cần xử lý
**When** tải
**Then** `order-tabs` (lưới 4 cột một hàng ở 390px, cao tối thiểu 44px, `tablist` kích hoạt thủ công) và đơn chuyển khoản Chờ xác nhận quá 24 giờ lên đầu kèm `overdue-label` `CHUYỂN KHOẢN CHỜ QUÁ 24 GIỜ`
**And** ở 390px là `order-row` xếp dọc (Mã đơn link gạch chân, `order-status-badge`, thanh toán, tên khách, `tel-link`), từ `md` là `order-table` 5 cột (cột Nhãn ghi `CHỜ QUÁ 24 GIỜ`).

**Given** `tel-link` trong `order-row`
**When** Nhân viên bấm số điện thoại
**Then** mở cuộc gọi `tel:`, không mở Chi tiết đơn, vùng bấm tối thiểu 44px, có nhãn "Gọi khách {tên}"
**And** không có nút đổi Trạng thái trên dòng.

**Given** `order-search` (nhãn `Tìm đơn`, placeholder `Mã đơn hoặc số điện thoại`, `button-secondary` `Tìm`)
**When** gửi từ khóa bằng Enter hoặc nút
**Then** kết quả hiện ở vùng có nhãn `Kết quả tìm kiếm`, tab trước đó vẫn đánh dấu, từ khóa chỉ ở bộ nhớ, không lên URL
**And** [Lỗi/biên] gửi ô rỗng quay về tab trước; không có kết quả hiện `Không tìm thấy đơn` và `Xóa tìm kiếm`; tab trống dùng `empty-state` có emoji.

**Given** lỗi tải
**When** danh sách hoặc kết quả không tải được
**Then** [Lỗi/biên] `error-banner` `Chưa thực hiện được. Vui lòng thử lại.` có thao tác thử lại
**And** dữ liệu không tự làm mới theo thời gian, chỉ cập nhật sau thao tác, khi đổi tab hoặc tải lại.

### Story 4.6: Chi tiết đơn nhân viên và Lịch sử chỉ đọc

As a Nhân viên hoặc Quản lý,
I want mở Chi tiết đơn xem đầy đủ thông tin giao hàng và toàn bộ Lịch sử,
So that tôi xử lý và giải thích đúng cho khách.

**Yêu cầu:** FR-15, FR-9; UX-DR29, UX-DR53, UX-DR57, UX-DR56 (phần `/staff/orders/:id`); NFR8, NFR18.
**AD liên quan:** AD-19, AD-12, AD-18
**Phụ thuộc:** Story 4.4, Story 4.5.

**Acceptance Criteria:**

**Given** `/staff/orders/:id`
**When** tải đơn
**Then** hiện link `Danh sách` (giữ tab và từ khóa trong bộ nhớ), Mã đơn, `order-status-badge`, `overdue-label` nếu có, Người nhận (tên, `tel-link`, địa chỉ đầy đủ), Đơn hàng, Giao hàng, Thanh toán, Tổng tiền
**And** chưa có vùng thao tác (thêm ở Epic 5).

**Given** `history-list`
**When** hiển thị Lịch sử
**Then** cũ trước, giữ cả dòng đã bị Lùi đơn sửa; mỗi dòng có người thực hiện, thời gian, Trạng thái cũ, Trạng thái mới, lý do; dòng tạo đơn hiện `Tạo đơn` và người thực hiện `Khách hàng`
**And** dòng hoàn tiền hiện `Đã xử lý hoàn tiền: {kết quả}` thay cặp Trạng thái; màn hẹp là danh sách dòng, màn rộng là bảng.

**Given** đơn không tồn tại hoặc lỗi tải
**When** mở trang
**Then** [Lỗi/biên] hiện `Không tìm thấy đơn` và link `Danh sách`, hoặc `error-banner` `Chưa thực hiện được. Vui lòng thử lại.`
**And** đang tải hiện khung chờ.

**Given** ở 390px
**When** xem Chi tiết đơn
**Then** một cột, không cuộn ngang
**And** [Lỗi/biên] không hiện thông tin chỉ bằng màu.

## Epic 5: Nhân viên xử lý đơn

Nhân viên chuyển đơn đúng thứ tự, xác nhận hai lần khi Đã giao, Hủy kèm lý do, Quản lý Lùi đơn; mọi thay đổi ghi Lịch sử và Tồn kho trong cùng một giao dịch. Cạnh Hủy đơn chuyển khoản bật `refund_required` ở tầng dữ liệu; xử lý kết quả hoàn tiền thuộc Epic 6.

### Story 5.1: Máy trạng thái thuần và mã lý do

As a nhà phát triển ShopLite,
I want một hàm thuần quyết định chuyển Trạng thái theo vai, cạnh và lý do,
So that mọi quy tắc chuyển đơn nằm ở một nơi và test phủ được toàn bộ tổ hợp.

**Yêu cầu:** FR-10, FR-12, FR-13; UX-DR40 (phần server); NFR1.
**AD liên quan:** AD-8, AD-30
**Phụ thuộc:** Story 1.7.

**Acceptance Criteria:**

**Given** `features/orders/order-state-machine.ts` export `decideTransition({ from, to, role, paymentMethod, reasonCode, reasonText })`, không I/O
**When** gọi với cạnh tiến hợp lệ (Chờ xác nhận → Đã xác nhận → Đang giao → Đã giao), Hủy (từ Chờ xác nhận hoặc Đã xác nhận) hoặc Lùi (Đã giao → Đang giao)
**Then** trả `{ restoreStock, setRefundRequired }` với `restoreStock = reasonCode !== "out_of_stock"` trên cạnh Hủy và `false` ở cạnh khác, `setRefundRequired = paymentMethod === "bank_transfer"` trên cạnh Hủy
**And** cạnh tiến không nhận lý do; cạnh Hủy chỉ nhận `CANCEL_REASONS` và cạnh Lùi chỉ nhận `REVERT_REASONS` ở `features/orders/order-reasons.ts` kèm nhãn tiếng Việt.

**Given** thứ tự kiểm: sai vai (`FORBIDDEN`), cạnh sai (`INVALID_STATUS_TRANSITION`), lý do sai (`VALIDATION_ERROR`)
**When** Nhân viên gửi cạnh `from = delivered, to = shipping` (Lùi đơn), kể cả khi đơn hiện không ở Đã giao
**Then** [Lỗi/biên] luôn nhận `FORBIDDEN` (403), vì vai được xét theo cạnh `from`/`to` của request trước khi so với Trạng thái hiện tại
**And** Quản lý gửi cạnh Lùi hợp lệ qua bước vai rồi mới bị kiểm cạnh.

**Given** `other` kèm chữ
**When** chữ sau `trim` rỗng, hoặc dài hơn 200 theo `.length` JavaScript (UTF-16, cùng đơn vị với `maxlength`)
**Then** [Lỗi/biên] trả `VALIDATION_ERROR`; chữ đúng 200 ký tự sau `trim` được chấp nhận
**And** mã khác `other` gửi kèm chữ là `VALIDATION_ERROR`, thiếu lý do ở cạnh Hủy hoặc Lùi là `VALIDATION_ERROR`.

**Given** bảng cạnh của EXPERIENCE
**When** chạy test phủ toàn bộ tích `from × to × role`
**Then** [Lỗi/biên] mọi cạnh ngoài bảng (ví dụ `pending → delivered`, Hủy từ Đang giao, Đã giao hoặc Đã hủy, mọi cạnh ra khỏi Đã hủy) trả `INVALID_STATUS_TRANSITION`
**And** Đã giao chỉ chuyển được theo Lùi đơn.

### Story 5.2: Ghi chuyển Trạng thái nguyên tử và API PATCH nhân viên

As a Nhân viên,
I want đổi Trạng thái đơn qua một API ghi Trạng thái, Lịch sử và Tồn kho trong cùng một giao dịch,
So that không bao giờ có đơn đổi Trạng thái mà thiếu dòng Lịch sử hoặc lệch Tồn kho.

**Yêu cầu:** FR-10, FR-12, FR-13, FR-14, FR-17, FR-21 (bật cờ trên cạnh Hủy); NFR1, NFR2, NFR24.
**AD liên quan:** AD-8, AD-9, AD-10, AD-12, AD-18, AD-19, AD-30
**Phụ thuộc:** Story 5.1, Story 4.4.

**Acceptance Criteria:**

**Given** `casOrderStatus` trong `order-repository.pg.ts` là nơi duy nhất ghi `orders.status`, `version`, `updated_at`, `refund_required` sau khi tạo đơn, chỉ gọi từ `orderService.transitionOrder`
**When** `PATCH /api/staff/orders/:id` gửi `{ from, to, expectedVersion, reasonCode?, reasonText? }`
**Then** trong một transaction: `SELECT ... FOR UPDATE` dòng `orders` (không có thì `ORDER_NOT_FOUND`), `decideTransition`, kiểm `status`/`version`, một câu `UPDATE` có điều kiện `status` và `version` với `clock_timestamp()`, hoàn kho nếu có, ghi một dòng Lịch sử `status_changed` với `actor_type = staff`
**And** `version` tăng một, `refund_required = refund_required OR $setRefund`.

**Given** cạnh Hủy với `restoreStock = true`
**When** `casOrderStatus` thắng
**Then** `restoreStock(tx, lines)` hoàn kho theo `productId` tăng dần, đúng một lần; với `out_of_stock` không dòng tồn nào của đơn đổi, kể cả đơn nhiều dòng; mã `other` vẫn hoàn kho kể cả chữ là "hết hàng"
**And** [Lỗi/biên] dòng hoàn kho ảnh hưởng 0 hàng thì ném lỗi và rollback cả đơn, Lịch sử, Tồn kho.

**Given** hai người cùng Hủy một đơn, hoặc bấm đúp
**When** chạy race "hai người cùng hủy" trên PostgreSQL thật
**Then** [Lỗi/biên] đúng một bên thành công, bên thua nhận `INVALID_STATUS_TRANSITION` và không để lại dòng Lịch sử, Tồn kho chỉ được cộng một lần
**And** thao tác từ màn hình cũ (sai `expectedVersion`) cũng nhận `INVALID_STATUS_TRANSITION`.

**Given** `placeOrder` và Hủy cùng lúc trên cùng sản phẩm
**When** chạy race "đặt đơn xen hủy đơn" theo thứ tự khóa `rate_limits` → advisory theo SĐT → `orders` → `inventory`
**Then** [Lỗi/biên] không deadlock và Tồn kho cuối đúng
**And** đơn chuyển khoản bị Hủy có `refund_required = true`, đơn COD thì không; `CHECK` của cột không bị vi phạm; Nhân viên gửi cạnh Lùi nhận 403 trước khi chạm Trạng thái hiện tại.

### Story 5.3: Hộp thoại thao tác và quy tắc lý do `Khác`

As a Nhân viên,
I want một hộp thoại xác nhận chuẩn có chọn lý do và ô nhập `Khác` có đếm ký tự,
So that thao tác khó đảo ngược luôn có lý do rõ và không nhập quá dài.

**Yêu cầu:** UX-DR38, UX-DR39, UX-DR40, UX-DR45, UX-DR55, UX-DR58; NFR7, NFR8, NFR9, NFR22.
**AD liên quan:** AD-8, AD-19
**Phụ thuộc:** Story 5.1, Story 4.6.

**Acceptance Criteria:**

**Given** `action-dialog` (thẻ tối đa 448px, lề 16px ở 390px, nền `scrim`, `rounded-2xl`, `role="dialog"`, `aria-modal`, `aria-labelledby`)
**When** mở hộp thoại
**Then** focus vào phần tử đầu tiên và bẫy focus, chỉ một lớp; `Quay lại` đóng ngay; khi đóng focus về nút đã mở (nếu nút biến mất thì về `h1` có `tabindex="-1"`)
**And** vùng hai nút xếp dọc dưới `md` (nút chính trên), ngang từ `md` (nút chính bên phải), trong DOM nút phụ đứng trước nút chính.

**Given** đã chọn lý do, chọn kết quả hoặc gõ chữ
**When** nhấn `Esc`
**Then** hộp thoại hỏi lại `Bỏ nội dung đã nhập?` (`role="alertdialog"`, focus vào `Tiếp tục nhập`, nút `Tiếp tục nhập` và `Bỏ`, `Esc` lần hai là `Tiếp tục nhập`)
**And** [Lỗi/biên] khi đang gửi mọi cách đóng bị khóa và bấm nền không đóng khi đã nhập dữ liệu.

**Given** `reason-option` là `fieldset` có `legend`, radio cao tối thiểu 44px, không chọn sẵn khi mở
**When** chọn `Khác`
**Then** ô `Nhập lý do` hiện với `maxlength="200"` và bộ đếm `x/200` luôn hiện, đếm theo `.length` JavaScript sau `trim`
**And** đổi lựa chọn thì xóa chữ đã nhập; thay đổi đọc qua `aria-live`.

**Given** `Khác` để trống hoặc chỉ có khoảng trắng
**When** bấm xác nhận
**Then** [Lỗi/biên] báo lỗi tại trường nối bằng `aria-describedby`, giữ hộp thoại và dữ liệu, không gửi
**And** nếu chữ vượt 200 (ví dụ dán vào) thì client chặn và server vẫn trả `VALIDATION_ERROR` giữ nguyên hộp thoại; hộp thoại dùng được hoàn toàn bằng bàn phím và không truyền đạt chỉ bằng màu.

### Story 5.4: Xác nhận đơn, Chuyển Đang giao và Đã giao hai lần

As a Nhân viên,
I want các nút chuyển bước theo Trạng thái, và xác nhận lần hai trước khi Đã giao,
So that tôi đi đúng thứ tự và không bấm nhầm Đã giao.

**Yêu cầu:** FR-10, FR-11; UX-DR43, UX-DR45, UX-DR46 (nút tiến Trạng thái; nút `Hủy đơn` ở Story 5.5), UX-DR53, UX-DR54; NFR8, NFR18.
**AD liên quan:** AD-8, AD-18, AD-19
**Phụ thuộc:** Story 5.2, Story 5.3.

**Acceptance Criteria:**

**Given** vùng thao tác ở Chi tiết đơn theo Trạng thái và vai
**When** đơn Chờ xác nhận thì hiện `Xác nhận đơn`, Đã xác nhận hiện `Chuyển Đang giao`, Đang giao hiện `Đánh dấu Đã giao` (nút `Hủy đơn` chưa có, thêm ở Story 5.5)
**Then** nút chính là nút tiến Trạng thái, Nhân viên không thấy nút nào ở Đã giao và Đã hủy
**And** nút disabled khi đang gửi.

**Given** Đang giao
**When** bấm `Đánh dấu Đã giao`
**Then** hộp thoại `Xác nhận đã giao?` hiện Mã đơn và tên người nhận, nút `Quay lại` và `Đã giao`, chỉ gửi sau lần xác nhận thứ hai
**And** thành công hiện `toast` `Đã chuyển đơn #{Mã đơn} sang {Trạng thái}`, ở lại Chi tiết đơn và Lịch sử có dòng mới.

**Given** hai người cùng thao tác một đơn
**When** bên thua nhận `INVALID_STATUS_TRANSITION`
**Then** [Lỗi/biên] đóng hộp thoại nếu đang mở, hiện `error-banner` đầu trang `Đơn vừa được người khác cập nhật`, tải lại Trạng thái mới nhất, không ghi Lịch sử cho bên thua
**And** lỗi mạng trong hộp thoại giữ hộp thoại và hiện `error-banner` trong hộp thoại cho thử lại.

**Given** vùng thao tác sau khi Trạng thái đổi
**When** nút vừa bấm biến mất
**Then** focus về `h1` của Chi tiết đơn
**And** [Lỗi/biên] không có đường nhảy cóc Trạng thái từ giao diện (ví dụ Chờ xác nhận thẳng Đã giao).

### Story 5.5: Hủy đơn kèm lý do

As a Nhân viên,
I want hủy được đơn Chờ xác nhận hoặc Đã xác nhận với lý do bắt buộc,
So that đơn không còn hiệu lực và Tồn kho được hoàn đúng.

**Yêu cầu:** FR-12, FR-17; UX-DR41, UX-DR45, UX-DR46 (nút `Hủy đơn`), UX-DR54, UX-DR55; NFR24.
**AD liên quan:** AD-8, AD-9, AD-19
**Phụ thuộc:** Story 5.4.

**Acceptance Criteria:**

**Given** đơn Chờ xác nhận hoặc Đã xác nhận ở Chi tiết đơn
**When** hiển thị vùng thao tác
**Then** thêm nút `Hủy đơn` (`button-danger`, nút mở hộp thoại, không đổi dữ liệu ngay) cạnh nút tiến Trạng thái của Story 5.4, nút chính vẫn là nút tiến Trạng thái, thứ tự DOM và `Tab` theo UX-DR45
**And** [Lỗi/biên] Đang giao, Đã giao và Đã hủy không có nút `Hủy đơn`.

**Given** hộp thoại `Hủy đơn?` với nhãn `Chọn lý do (bắt buộc)` và danh sách `Khách đổi ý`, `Không liên lạc được`, `Đơn trùng`, `Hết hàng`, `Khác`
**When** chọn một lý do
**Then** ghi chú Tồn kho hiện sau khi chọn: khác `Hết hàng` thì `Tồn kho được hoàn ngay.`, `Hết hàng` thì `Không hoàn Tồn kho cho toàn bộ đơn.`, `Khác` thêm `Nếu hết hàng, hãy chọn lý do Hết hàng`
**And** đơn chuyển khoản thêm `Đơn chuyển khoản sẽ bật Cờ cần hoàn tiền.`, đơn COD không có câu này.

**Given** Hủy thành công
**When** server hoàn tất
**Then** về danh sách giữ tab trước đó, `toast` vẫn hiện và focus vào tab đang chọn; lý do lưu bằng mã cố định (`out_of_stock`, `other` kèm chữ)
**And** Tồn kho hoàn theo Story 5.2.

**Given** thiếu lý do
**When** bấm `Hủy đơn`
**Then** [Lỗi/biên] báo `Vui lòng chọn lý do.` hoặc `Vui lòng nhập lý do.` tại trường, không gửi
**And** Hủy từ Đang giao, Đã giao hoặc Đã hủy không có nút và nếu gọi API thì bị `INVALID_STATUS_TRANSITION`.

**Given** `Khác` vượt 200 ký tự
**When** gửi thẳng lên API
**Then** [Lỗi/biên] `VALIDATION_ERROR`, đơn, Tồn kho, Lịch sử giữ nguyên
**And** Hủy `out_of_stock` không đổi Tồn kho của bất kỳ sản phẩm nào trong đơn.

### Story 5.6: Lùi đơn của Quản lý

As a Quản lý,
I want Lùi đơn Đã giao về Đang giao kèm lý do,
So that sửa được trường hợp bấm Đã giao nhầm mà không xóa dấu vết.

**Yêu cầu:** FR-13, FR-14; UX-DR42, UX-DR46, UX-DR54; NFR2.
**AD liên quan:** AD-8, AD-12, AD-18, AD-19, AD-30
**Phụ thuộc:** Story 5.4.

**Acceptance Criteria:**

**Given** đơn Đã giao và người dùng là Quản lý
**When** mở Chi tiết đơn
**Then** hiện nút `Lùi đơn về Đang giao (Quản lý)` và hộp thoại `Lùi đơn về Đang giao?` với Mã đơn, danh sách `Bấm nhầm, hàng còn trên xe`, `Khách báo chưa nhận hàng`, `Khác`, ghi chú `Tồn kho không đổi. Lịch sử giữ cả dòng cũ.`
**And** không có lựa chọn nào chọn sẵn.

**Given** Lùi đơn thành công
**When** server hoàn tất
**Then** thêm một dòng Lịch sử mới, giữ dòng cũ, không đổi Tồn kho, ở lại Chi tiết đơn
**And** sau đó đơn chuyển Đã giao lại được theo FR-10 và FR-11.

**Given** người dùng là Nhân viên
**When** mở Chi tiết đơn hoặc gọi trực tiếp `PATCH` với `from = delivered, to = shipping`
**Then** [Lỗi/biên] không thấy nút Lùi đơn, kể cả dạng vô hiệu, và API trả 403 ngay cả khi đơn không ở Đã giao
**And** UI hiện `Bạn không có quyền thực hiện thao tác này.` nếu 403 xảy ra.

**Given** race ABA sau Lùi đơn
**When** màn hình cũ giữ `expectedVersion` trước Lùi đơn và gửi lại thao tác khi Trạng thái đã quay lại giá trị cũ
**Then** [Lỗi/biên] thao tác bị `INVALID_STATUS_TRANSITION` vì `version` đã tăng và không để lại dòng Lịch sử
**And** race này chạy trong `*.db.test.ts` trên PostgreSQL thật.

## Epic 6: Quản lý xử lý hoàn tiền

Quản lý thấy đơn chuyển khoản bị hủy cần hoàn tiền, ghi kết quả, ghi thêm và đính chính. Hệ thống không lưu trạng thái thanh toán và không chuyển tiền.

### Story 6.1: Ghi kết quả hoàn tiền theo kết quả mới nhất

As a Quản lý,
I want ghi lại kết quả xử lý hoàn tiền của đơn chuyển khoản đã hủy, ghi thêm và đính chính được,
So that có dấu vết đối soát mà hệ thống không giả vờ biết tiền đã chuyển.

**Yêu cầu:** FR-21, FR-14; UX-DR40 (phần đính chính); NFR2, NFR21.
**AD liên quan:** AD-14, AD-12, AD-18, AD-19, AD-30
**Phụ thuộc:** Story 5.2.

**Acceptance Criteria:**

**Given** `decideRefundOutcome({ latest, requested, reasonText })` trong `features/orders/refund-outcomes.ts` và helper `findLatestRefundOutcome(tx, orderId)` (`ORDER BY id DESC LIMIT 1`)
**When** chưa có kết quả
**Then** được ghi `refunded` hoặc `customer_not_transferred`; `customer_not_transferred` chuyển được sang `refunded`; `refunded` chỉ chuyển được về `customer_not_transferred` và bắt buộc lý do
**And** chỉ đính chính có chữ, tối đa 200 ký tự theo `.length` JavaScript sau `trim`.

**Given** `POST /api/staff/orders/:id/refund-outcomes` với `{ outcome, expectedLatest, reasonText? }`, chỉ vai `manager`
**When** ghi trong một transaction: khóa dòng `orders`, kiểm `status = cancelled` và `refund_required`, đọc kết quả mới nhất bằng câu riêng, so `expectedLatest`, quyết định, chèn dòng `refund_outcome_recorded`
**Then** dòng chèn không đổi Trạng thái, không tăng `version`, không đổi `updated_at`
**And** không có cột `payment_status` hay cột kết quả hoàn tiền trong `orders`.

**Given** Nhân viên gọi API này
**When** gửi request
**Then** [Lỗi/biên] nhận 403
**And** đơn COD hoặc đơn không có cờ trả `REFUND_OUTCOME_CONFLICT`.

**Given** ghi trùng, lệch `expectedLatest`, chuyển kết quả không hợp lệ, hoặc đính chính thiếu lý do hay lý do vượt 200
**When** gọi API
**Then** [Lỗi/biên] trùng hoặc lệch hoặc không hợp lệ trả `REFUND_OUTCOME_CONFLICT` (409), thiếu hoặc quá dài lý do trả `VALIDATION_ERROR`, không để lại dòng Lịch sử
**And** race "ghi trùng kết quả hoàn tiền" trên PostgreSQL thật cho đúng một bên thắng.

### Story 6.2: Nhãn hoàn tiền và tab Cần hoàn tiền

As a Quản lý,
I want thấy nhãn và số đơn Cần hoàn tiền trên danh sách và Chi tiết đơn,
So that tôi không bỏ sót đơn cần xử lý.

**Yêu cầu:** FR-21, FR-9; UX-DR23, UX-DR27; NFR8.
**AD liên quan:** AD-14, AD-19
**Phụ thuộc:** Story 6.1, Story 4.5, Story 4.6.

**Acceptance Criteria:**

**Given** đơn có `refundState`
**When** hiển thị ở `order-row`, `order-table` hoặc đầu Chi tiết đơn
**Then** `refund-flag-label` hiện `Cần hoàn tiền` (`flag-fg` trên `flag-bg`, viền `flag-ring`) khi `required`, `Đã xử lý hoàn tiền` (`ink-secondary` trên `surface-muted`) khi `processed`
**And** nhãn luôn có chữ, không chỉ màu; đơn COD không có cờ và không có nhãn.

**Given** `tab-count` trong tab Cần hoàn tiền
**When** tải danh sách hoặc tìm kiếm, hoặc sau thao tác
**Then** hiện số đơn có cờ chưa xử lý từ `refundPendingCount`, không phụ thuộc từ khóa, có tên đọc được "Cần hoàn tiền, N đơn"
**And** [Lỗi/biên] bằng 0 thì ẩn.

**Given** đơn đã ghi kết quả bất kỳ
**When** xem các tab
**Then** đơn rời tab Cần hoàn tiền nhưng vẫn ở tab Đã hủy
**And** [Lỗi/biên] sau `Ghi thêm: Đã hoàn tiền` hoặc đính chính đơn không quay lại tab Cần hoàn tiền.

### Story 6.3: Hộp thoại hoàn tiền, ghi thêm và đính chính

As a Quản lý,
I want các hộp thoại `Đã xử lý hoàn tiền`, `Ghi thêm: Đã hoàn tiền` và `Đính chính: Khách chưa chuyển tiền`,
So that ghi đúng kết quả và sửa được khi ghi nhầm mà không xóa dòng cũ.

**Yêu cầu:** FR-21; UX-DR44, UX-DR46, UX-DR54, UX-DR39, UX-DR40; NFR8.
**AD liên quan:** AD-14, AD-18, AD-19
**Phụ thuộc:** Story 6.1, Story 6.2, Story 5.3.

**Acceptance Criteria:**

**Given** Đã hủy có cờ, chưa có kết quả, người dùng là Quản lý
**When** bấm `Đã xử lý hoàn tiền`
**Then** hộp thoại `Đã xử lý hoàn tiền?` có Mã đơn, nhãn `Chọn kết quả (bắt buộc)`, hai kết quả `Đã hoàn tiền` và `Khách chưa chuyển tiền`, câu `Thao tác này được ghi vào Lịch sử. Hệ thống không chuyển tiền.`, nút `Quay lại` và `Xác nhận`
**And** thành công hiện toast `Đã xử lý hoàn tiền đơn #{Mã đơn}: {kết quả}`, ở lại Chi tiết đơn.

**Given** kết quả mới nhất là `Khách chưa chuyển tiền`
**When** bấm `Ghi thêm: Đã hoàn tiền` (`button-primary`)
**Then** hộp thoại `Ghi thêm kết quả Đã hoàn tiền?` có Mã đơn và `Dòng Khách chưa chuyển tiền vẫn giữ trong Lịch sử. Hệ thống không chuyển tiền.`, không cần chọn kết quả
**And** sau đó nhãn giữ `Đã xử lý hoàn tiền` và nút đổi thành `Đính chính: Khách chưa chuyển tiền`.

**Given** kết quả mới nhất là `Đã hoàn tiền`
**When** bấm `Đính chính: Khách chưa chuyển tiền` (`button-secondary`)
**Then** hộp thoại có Mã đơn, ô `Nhập lý do` bắt buộc (`maxlength="200"`, bộ đếm `x/200`, đếm `.length` sau `trim`), `Dòng Đã hoàn tiền vẫn giữ trong Lịch sử.`, nút `Quay lại` và `Xác nhận`
**And** sau đó nút đổi thành `Ghi thêm: Đã hoàn tiền`.

**Given** thiếu kết quả, thiếu lý do đính chính, hoặc xung đột
**When** gửi
**Then** [Lỗi/biên] thiếu kết quả báo `Vui lòng chọn kết quả.`; thiếu lý do báo lỗi tại trường, giữ hộp thoại và dữ liệu, không coi là xung đột
**And** xung đột (ghi trùng, lệch kết quả mới nhất) đóng hộp thoại, hiện `Đơn vừa được người khác cập nhật`, tải lại; Nhân viên không bao giờ thấy các nút này, kể cả dạng vô hiệu.

## Epic 7: Đóng đường truy cập cũ

**Không được triển khai ra ngoài trước khi Epic 7 xong:** cho tới Story 7.1, `GET /api/orders` vẫn liệt kê toàn bộ đơn và `GET /api/orders/:id` chưa kiểm Quyền xem đơn (`PATCH /api/orders/:id` đã đóng ở Story 1.7, `/orders` đã là Tra đơn từ Story 3.2). Route đọc cũ được đóng nốt sau cùng, chỉ khi DB, Tồn kho, Trang xác nhận, Tra đơn và Trang nhân viên (Epic 1-6) đã sẵn sàng, đúng thứ tự phát hành của PRD 4.9.

### Story 7.1: Đóng nốt route đọc đơn cũ

As a Khách hàng,
I want đơn của tôi không đọc hay đổi được nếu không có quyền,
So that người lạ không xem hay hủy đơn của tôi.

**Yêu cầu:** FR-4 (phần còn lại: `GET /api/orders`, kiểm quyền `GET /api/orders/:id`; `PATCH /api/orders/:id` đã đóng ở Story 1.7, `/orders` đã là Tra đơn từ Story 3.2); NFR10, NFR23 (SM-4).
**AD liên quan:** AD-20, AD-18, AD-30, AD-31
**Phụ thuộc:** Story 2.5, Story 3.2, Story 5.4, Story 6.3.

**Acceptance Criteria:**

**Given** Epic 1 đến Epic 6 đã xong, và cho đến lúc này `GET /api/orders` vẫn liệt kê toàn bộ đơn và `GET /api/orders/:id` chưa kiểm Quyền xem đơn nên ứng dụng chưa được triển khai ra ngoài
**When** đóng nốt các route đọc cũ
**Then** `GET /api/orders` luôn trả 401 mã `UNAUTHORIZED`, không đọc database; `listOrders` bị xóa nếu không còn chỗ dùng
**And** `GET /api/orders/:id` chỉ trả dữ liệu theo Quyền xem đơn, không có quyền trả 401.

**Given** các đường đã đóng sớm (Story 1.7: `PATCH /api/orders/:id` trả 401 và không còn nút hủy của Khách hàng; Story 3.2: `/orders` chỉ có form Tra đơn)
**When** rà lại ở story này
**Then** một test xác nhận cả hai vẫn đúng, mục "Đơn hàng" trên menu dẫn tới Tra đơn
**And** `/orders/:id` không có Quyền xem đơn chuyển tới `/orders?orderId=<Mã đơn>` (Tra đơn với Mã đơn điền sẵn) và không tự chuyển ngược lại.

**Given** Nhân viên đọc hoặc đổi đơn
**When** dùng giao diện hoặc API
**Then** [Lỗi/biên] chỉ đi qua `/api/staff/orders*`, và một test khẳng định không route công khai nào trả danh sách hay đổi Trạng thái mà thiếu quyền
**And** sau story này mới được xét triển khai ra ngoài (khi 7.3 đạt).

### Story 7.2: Dọn lưu trữ cũ và viết lại test bị ảnh hưởng

As a nhà phát triển ShopLite,
I want không còn dấu vết `storage/orders.json` và mọi test cũ chạy trên nền mới,
So that cổng `check:full` phản ánh đúng hệ thống đã đóng route.

**Yêu cầu:** FR-4; NFR6, NFR17.
**AD liên quan:** AD-2, AD-30
**Phụ thuộc:** Story 7.1.

**Acceptance Criteria:**

**Given** tài liệu và code cũ
**When** rà `DEFAULT_ORDERS_FILE`, `ORDERS_FILE`, `createJsonFileOrderRepository`, `createInMemoryOrderRepository`, `storage/orders.json`
**Then** không còn tham chiếu trong `src/`, `scripts/` và test
**And** app không đọc, ghi, xóa `storage/orders.json`.

**Given** các test của route đã đóng
**When** viết lại test theo hành vi 401 và quyền
**Then** test cũ ở `src/lib` và `src/features` bị ảnh hưởng chạy lại xanh trong `npm run check`
**And** [Lỗi/biên] không test nào được `skip` hoặc xóa chỉ để qua cổng; test nào bị bỏ phải có lý do ghi trong PR.

**Given** `npm run check:full`
**When** chạy sau khi dọn
**Then** `check`, `db:test:prepare`, `test:db` đều xanh
**And** [Lỗi/biên] kết quả được ghi vào mô tả PR.

### Story 7.3: E2E toàn tuyến và chốt điều kiện phát hành

As a chủ shop,
I want chạy thử trọn đường đi từ đặt hàng đến xử lý và hoàn tiền trên trình duyệt thật,
So that tôi biết đủ DB, Tồn kho, Trang xác nhận, Tra đơn và Trang nhân viên trước khi phát hành.

**Yêu cầu:** FR-4; UX-DR59, UX-DR55; NFR10, NFR23, NFR24, NFR25.
**AD liên quan:** AD-30, AD-31
**Phụ thuộc:** Story 7.2.

**Acceptance Criteria:**

**Given** Playwright chạy `next dev -p 3100` với `NEXT_DIST_DIR=.next-e2e`, `reuseExistingServer: false`, `workers: 1`, `DATABASE_URL` của `shoplite_test`, `TRUSTED_PROXY_HOPS=1`, mỗi test gửi `x-forwarded-for` riêng, reset và seed trước mỗi lần chạy
**When** chạy `npm run test:e2e`
**Then** `next.config.ts` đặt `distDir: process.env.NEXT_DIST_DIR ?? ".next"`, `.next-e2e/` có trong `.gitignore` và ignore của ESLint
**And** không test nào đọc hoặc ghi `storage/orders.json`.

**Given** các hành trình UJ chính
**When** E2E chạy: đặt hàng, xem Trang xác nhận, Tra đơn, đăng nhập nhân viên, đổi Trạng thái, Hủy chuyển khoản, ghi kết quả hoàn tiền, Lùi đơn bởi Quản lý
**Then** các màn hình khớp `mockups/key-staff-queue.html`, `key-staff-order-detail.html`, `key-order-confirmation.html` ở 390px và desktop, DESIGN.md và EXPERIENCE.md thắng khi mâu thuẫn
**And** hộp thoại và form dùng được bằng bàn phím, không cuộn ngang ở 390px.

**Given** các chỉ số SM-2, SM-3, SM-4 và rủi ro đã chấp nhận
**When** rà checklist phát hành
**Then** [Lỗi/biên] mục "không triển khai ra ngoài trước Epic 7" được xác nhận đã thỏa; mỗi hạng mục hoãn có điều kiện trước đơn thật (nâng PostgreSQL, backup, thời hạn lưu dữ liệu, topo proxy cho `TRUSTED_PROXY_HOPS`, giá trị thật `SHOP_CONTACT_PHONE` và số tài khoản) được ghi trạng thái; chưa xong thì không đánh dấu sẵn sàng phát hành
**And** PR đóng route chạy `check:full` và `test:e2e`, kết quả ghi trong PR.
