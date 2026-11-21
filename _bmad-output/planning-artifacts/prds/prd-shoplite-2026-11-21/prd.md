---
title: "PRD: ShopLite - Vận hành và theo dõi đơn hàng"
status: final
created: 2026-11-21
updated: 2026-11-21
---

# PRD: ShopLite - Vận hành và theo dõi đơn hàng

## 0. Document Purpose

PRD này dành cho người làm UX, kiến trúc, phát triển và kiểm thử của ShopLite. Tài liệu xây trên `brief.md`, `brainstorm-intent.md`, `phan-bien.md` và hai tài liệu UX [`EXPERIENCE.md`](../../ux-designs/ux-shoplite-2026-11-21/EXPERIENCE.md), [`DESIGN.md`](../../ux-designs/ux-shoplite-2026-11-21/DESIGN.md), không lặp lại phần lập luận ở đó. Thuật ngữ được định nghĩa ở mục 3. Yêu cầu được đánh số FR-n, hành trình UJ-n, chỉ số SM-n. Mọi suy luận chưa được kiểm chứng bằng dữ liệu thật được gắn `[ASSUMPTION]` và tổng hợp ở mục 9; thẻ `[ASSUMPTION: A-n]` trỏ tới giả định cùng số trong `EXPERIENCE.md`. Lựa chọn kỹ thuật nằm trong `addendum.md`. Câu chữ giao diện đầy đủ nằm trong `EXPERIENCE.md`, nhận diện hình ảnh nằm trong `DESIGN.md`.

## 1. Vision

ShopLite nhận được đơn, nhưng đơn dừng lại ngay sau đó. Cửa hàng không có công cụ để xác nhận hay giao đơn, tồn kho không giảm khi bán, khách không biết đơn đang ở đâu, và ai cũng xem được dữ liệu cá nhân của khách.

Sản phẩm này tạo **một nguồn dữ liệu duy nhất về đơn hàng**. Cùng một bản ghi trạng thái và lịch sử trả lời khách "đơn của tôi đang ở đâu", bảo vệ nhân viên bằng dấu vết "ai làm gì, lúc nào", và giúp chủ shop giữ uy tín khi có sự cố.

MVP gồm 21 FR: đóng mọi đường xem đơn không kiểm tra quyền, cho Khách hàng tra đơn, cho Nhân viên xử lý đơn có ghi Lịch sử, và đưa Tồn kho về một nguồn duy nhất trên PostgreSQL.

Đây là dự án nội bộ cho khóa học, được viết như sản phẩm thật, chạy trên web responsive cho desktop và mobile.

## 2. Target User

### 2.1 Jobs To Be Done

- **Khách hàng:** khi đã đặt hoặc đã chuyển khoản, tôi muốn tự biết đơn đang ở đâu để không lo mất tiền và không phải gọi shop.
- **Nhân viên:** khi vào ca, tôi muốn biết ngay đơn nào cần xử lý và làm đúng quy trình, để không bị đổ lỗi cho việc mình không làm.
- **Quản lý:** khi có sự cố, tôi muốn biết chuyện gì đã xảy ra và sửa được sai sót mà không xóa dấu vết, để giữ uy tín của shop.

### 2.2 Non-Users (v1)

- Đơn vị vận chuyển và đối tác bên ngoài.
- Khách cần tài khoản hoặc lịch sử mua hàng dài hạn.
- Kế toán cần đối soát thanh toán trong hệ thống.

### 2.3 Key User Journeys

> `[ASSUMPTION: cả ba hành trình do coach viết nháp từ brief theo yêu cầu của landv, cần landv đọc và sửa thành lời của mình]`

**UJ-1. Thảo xử lý hàng đợi đầu ca.**
Thảo là nhân viên vận hành, vào ca lúc 8 giờ và mở trang nhân viên trên điện thoại. Sau khi đăng nhập bằng Tài khoản riêng, Thảo thấy Hàng đợi ở tab Cần xử lý với đơn cũ nhất ở trên và một đơn chuyển khoản đã chờ hơn 24 giờ được đưa lên đầu. Thảo gọi Khách hàng của đơn đó, được báo không mua nữa, nên hủy đơn với lý do "Khách đổi ý"; Tồn kho được hoàn ngay và Cờ cần hoàn tiền được bật. Các đơn còn lại được xác nhận rồi chuyển Đang giao. **Cao trào:** không còn đơn nào ở Chờ xác nhận hay Đã xác nhận, và mỗi thao tác đều có tên Thảo trong Lịch sử. **Edge case:** Thảo và một đồng nghiệp cùng bấm xác nhận một đơn; một người thành công, người kia được báo `Đơn vừa được người khác cập nhật` và thấy Trạng thái mới nhất. **Edge case:** nếu hủy với lý do `Hết hàng`, Tồn kho của mọi sản phẩm trong đơn giữ nguyên; đơn chuyển khoản vẫn bật Cờ cần hoàn tiền.

**UJ-2. Nam chuyển khoản rồi tự theo dõi đơn.**
Nam đặt một bàn phím, chọn chuyển khoản và thấy Trang xác nhận có số tiền, số tài khoản và nội dung chuyển khoản. Nam tải lại trang và thông tin vẫn còn. Hôm sau, trên máy khác, Nam vào trang Tra đơn, nhập Mã đơn và số điện thoại ở dạng `+84...` dù lúc đặt đã nhập `0...`. **Cao trào:** Nam thấy đơn đã chuyển Đang giao kèm mốc thời gian và bước kế tiếp, nên không cần gọi shop. **Edge case:** nếu bàn phím không còn đủ hàng lúc Nam bấm Đặt, form vẫn giữ nguyên thông tin, dòng thiếu hiện số còn lại và Nam chọn `Lấy N` hoặc `Bỏ` để đặt tiếp ngay tại đó; nếu đã hết sạch thì dòng hiện `Hết hàng` và chỉ có `Bỏ`.

**UJ-3. Khoa sửa một đơn bị bấm nhầm "Đã giao".**
Khoa là quản lý kiêm chủ shop. Khách hàng gọi báo chưa nhận được hàng dù Trang xác nhận ghi Đã giao. Khoa tìm đơn bằng số điện thoại trên Danh sách đơn, mở Chi tiết đơn và thấy trong Lịch sử Nhân viên nào đã bấm, lúc nào. Khoa Lùi đơn về Đang giao với lý do "Bấm nhầm, hàng còn trên xe". **Cao trào:** Khách hàng thấy lại Trạng thái đúng với giờ Đang giao ban đầu, Lịch sử giữ cả dòng cũ và dòng sửa, Tồn kho không đổi. **Luồng phụ (FR-21):** với đơn chuyển khoản đã hủy, Khoa đối soát sao kê, hoàn tay ngoài hệ thống nếu sao kê có khoản tiền, rồi ghi kết quả `Đã hoàn tiền` hoặc `Khách chưa chuyển tiền` vào Lịch sử.

## 3. Glossary

- **Đơn hàng:** bản ghi một lần mua, có đúng một Trạng thái hiện tại.
- **Mã đơn:** định danh dạng `SL-YYYYMMDD-XXXXXX`.
- **Trạng thái:** một trong Chờ xác nhận (`pending`), Đã xác nhận (`confirmed`), Đang giao (`shipping`), Đã giao (`delivered`), Đã hủy (`cancelled`).
- **Khách hàng:** người đặt đơn, không có tài khoản.
- **Nhân viên:** người có Tài khoản vai nhân viên.
- **Quản lý:** người có Tài khoản vai quản lý, làm được mọi việc của Nhân viên, thao tác Lùi đơn, `Đã xử lý hoàn tiền` và ghi thêm kết quả hoàn tiền.
- **Tài khoản:** thông tin đăng nhập riêng của đúng một người.
- **Tra đơn:** Khách hàng dùng Mã đơn và số điện thoại để xem Dữ liệu tối thiểu.
- **Dữ liệu tối thiểu:** Trạng thái, giờ đặt, mốc thời gian, sản phẩm (ảnh, tên, số lượng, đơn giá, thành tiền), tạm tính, phí giao hàng, tổng tiền, phương thức giao hàng và thanh toán, thông tin chuyển khoản khi đơn chuyển khoản còn Chờ xác nhận, tên và số điện thoại Khách hàng đã che, số điện thoại shop. Không gồm địa chỉ đầy đủ, email hoặc ghi chú.
- **Trang xác nhận:** trang chung Khách hàng thấy sau khi đặt hoặc Tra đơn thành công, gồm Dữ liệu tối thiểu, Mã đơn, bước kế tiếp và lối Tra đơn.
- **Quyền xem đơn:** một cookie có ký, gắn với trình duyệt, chứa tối đa 20 Mã đơn `[ASSUMPTION]`, mỗi mã có hạn riêng.
- **Hàng đợi:** tab Cần xử lý của Danh sách đơn, gồm các Đơn hàng còn cần Nhân viên xử lý.
- **Trang nhân viên:** khu vực đăng nhập nơi Nhân viên và Quản lý dùng Danh sách đơn và Chi tiết đơn để xem Hàng đợi, Lịch sử và thao tác trên Đơn hàng.
- **Danh sách đơn:** màn hình chính của Trang nhân viên, gồm ô tìm theo Mã đơn hoặc số điện thoại và 4 tab.
- **Tab của Danh sách đơn:** Cần xử lý (Hàng đợi), Đã giao, Đã hủy và Cần hoàn tiền (đơn có Cờ cần hoàn tiền, chưa qua `Đã xử lý hoàn tiền`).
- **Chi tiết đơn:** trang của một Đơn hàng trong Trang nhân viên, gồm thông tin đơn, thao tác và Lịch sử.
- **Lịch sử:** các dòng ghi thay đổi của Đơn hàng, chỉ thêm, không sửa hoặc xóa.
- **Tồn kho:** số lượng có thể bán của một sản phẩm, không bao giờ âm.
- **Lùi đơn:** Quản lý chuyển Đơn hàng từ Đã giao về Đang giao.
- **Cờ cần hoàn tiền:** đánh dấu đơn chuyển khoản đã hủy cần người kiểm tra và xử lý tiền ngoài hệ thống, có hai tình trạng `Cần hoàn tiền` và `Đã xử lý hoàn tiền`. Kết quả xử lý (`Đã hoàn tiền` hoặc `Khách chưa chuyển tiền`) là ghi chú của Quản lý trong Lịch sử, không phải trạng thái thanh toán.

## 4. Features

### 4.1 Tra đơn an toàn

**Description:** Khách hàng xem đơn bằng Mã đơn và số điện thoại. Không còn đường nào xem hoặc sửa đơn mà không kiểm tra quyền. Realizes UJ-2.

#### FR-1: Tra đơn bằng Mã đơn và số điện thoại

Khách hàng có thể Tra đơn khi cung cấp đúng cả Mã đơn và số điện thoại. Realizes UJ-2.

**Consequences (testable):**
- Số điện thoại được gửi qua `POST`, không xuất hiện trong URL.
- Sai Mã đơn, sai số điện thoại hoặc đơn không tồn tại đều trả cùng thông báo "Thông tin không đúng".
- Đơn đặt bằng `0912345678` tra được bằng `+84912345678` và ngược lại.
- Chỉ có Mã đơn thì không xem được dữ liệu nào, kể cả Trạng thái.
- Tra đơn thành công cấp Quyền xem đơn cho đúng đơn đó và chuyển tới `/orders/:id`, không đưa số điện thoại lên URL.

#### FR-2: Chỉ trả Dữ liệu tối thiểu

Khách hàng chỉ thấy Dữ liệu tối thiểu khi Tra đơn và trên Trang xác nhận; hai đường vào dùng chung một trang. Realizes UJ-2.

**Consequences (testable):**
- Phản hồi không chứa địa chỉ đầy đủ, email hoặc ghi chú.
- Tên và số điện thoại của Khách hàng được che ở phía server trước khi trả về, theo dạng `Ng***` và `090****001`.
- Tên từ 3 ký tự giữ 2 ký tự đầu; tên 1-2 ký tự chỉ giữ ký tự đầu, ví dụ `An` thành `A***`.
- Số điện thoại được chuẩn hóa về dạng `0...` trước khi che, rồi giữ 3 số đầu và 3 số cuối.
- Trang Tra đơn và Trang xác nhận không có thao tác hủy hoặc sửa.

#### FR-3: Chống dò Mã đơn

Hệ thống giới hạn số lần Tra đơn sai. Realizes UJ-2.

**Consequences (testable):**
- Cùng một IP và Mã đơn bị chặn sau 5 lần sai trong 15 phút. `[ASSUMPTION]`
- Một IP bị chặn sau 20 lần sai trong 15 phút trên mọi Mã đơn. `[ASSUMPTION]`
- Chỉ có hai giới hạn trên. Không có giới hạn theo Mã đơn bất kể IP, để người khác không khóa được đơn của Khách hàng thật (rủi ro ở mục 6.3).
- Cửa sổ giới hạn neo tại lần đếm đầu của mỗi khóa. `[ASSUMPTION]`
- Khi bị chặn, hệ thống vẫn hiển thị "Thông tin không đúng", không cho biết Mã đơn có tồn tại hay không.
- Một IP bị chặn không làm Khách hàng ở IP khác mất quyền Tra đơn. Tiêu chí này áp dụng khi `TRUSTED_PROXY_HOPS ≥ 1`; ở local mọi request dùng chung bucket `direct`.
- Hệ thống chỉ đọc IP từ header khi proxy tin cậy đã được cấu hình. Production từ chối khởi động nếu `TRUSTED_PROXY_HOPS` chưa khai báo hợp lệ (số nguyên ≥ 1, không nhận `0`); local không đọc header và dùng bucket `direct`. Giá trị IP giả trong header không vượt được giới hạn.
- Bộ đếm vẫn còn sau khi server khởi động lại.

#### FR-4: Đóng các đường truy cập không kiểm tra quyền

Chỉ người có quyền mới đọc hoặc đổi được Đơn hàng.

**Consequences (testable):**
- `GET /api/orders` luôn trả 401. `GET /api/orders/:id` chỉ trả dữ liệu theo Quyền xem đơn, không có quyền thì trả 401. Nhân viên đọc đơn qua `/api/staff/orders*`.
- `PATCH /api/orders/:id` luôn trả 401, không còn cho Khách hàng hủy đơn; đổi Trạng thái qua `PATCH /api/staff/orders/:id`.
- `/orders` không còn liệt kê đơn; mục "Đơn hàng" trên menu dẫn tới trang Tra đơn.
- `/orders/:id` không có Quyền xem đơn thì chuyển tới trang Tra đơn với Mã đơn điền sẵn, và trang Tra đơn không tự chuyển ngược lại nếu chưa Tra đơn thành công.

### 4.2 Trang xác nhận

**Description:** Sau khi đặt, Khách hàng vẫn có thông tin cần thiết mà không còn dựa vào việc ai có Mã đơn cũng xem được đơn. Realizes UJ-2.

#### FR-5: Xem lại Trang xác nhận

Khách hàng vừa đặt có thể xem lại Trang xác nhận trên cùng trình duyệt. Realizes UJ-2.

**Consequences (testable):**
- Đặt đơn thành công cấp Quyền xem đơn dạng cookie `HttpOnly` có ký; mỗi Mã đơn có hiệu lực 7 ngày từ lần cấp. `[ASSUMPTION]`
- Đặt đơn và Tra đơn thành công dẫn tới cùng một Trang xác nhận.
- Tải lại trang vẫn thấy Trang xác nhận.
- Cookie bị sửa, Mã đơn đã hết hạn hoặc không có trong cookie đều bị từ chối.
- Trang chỉ hiện nội dung đã định nghĩa cho Trang xác nhận ở mục 3.
- Trang có lối "Tra đơn" với Mã đơn điền sẵn.

#### FR-6: Thông tin chuyển khoản

Khách hàng chọn chuyển khoản thấy số tiền, số tài khoản và nội dung chuyển khoản trên Trang xác nhận khi đơn còn Chờ xác nhận. Realizes UJ-2.

**Consequences (testable):**
- Thông tin chuyển khoản không hiện khi đơn đã rời Chờ xác nhận.
- Nội dung chuyển khoản là Mã đơn.
- Thông tin chuyển khoản hiện như nhau khi vào từ đặt đơn hoặc Tra đơn.
- Thông tin chuyển khoản có thêm hàng Ngân hàng. `[ASSUMPTION: A6]`

### 4.3 Theo dõi trạng thái

#### FR-7: Xem Trạng thái, mốc thời gian và bước kế tiếp

Khách hàng có thể xem Trạng thái hiện tại, các mốc đã qua và bước kế tiếp. Realizes UJ-2.

**Consequences (testable):**
- Mỗi mốc lấy thời gian từ dòng Lịch sử mới nhất của Trạng thái đó, không tính dòng đã bị Lùi đơn thay thế và dòng kết quả xử lý hoàn tiền.
- Ngoại lệ: mốc Đang giao luôn giữ giờ của dòng Đã xác nhận → Đang giao ban đầu; dòng Lùi đơn không đổi mốc này.
- Mỗi Trạng thái có một câu mô tả bước kế tiếp, theo `EXPERIENCE.md`.
- Khách hàng không thấy tên Nhân viên hoặc lý do nội bộ. `[ASSUMPTION]`
- Khách hàng không thấy kết quả xử lý hoàn tiền; dòng này, kể cả dòng ghi thêm, không đổi mốc nào.
- Sau khi Lùi đơn, Khách hàng thấy Đang giao và không thấy mốc Đã giao đã bị sửa. Khi đơn được giao lại, mốc Đã giao dùng thời gian của lần giao mới nhất. `[ASSUMPTION]`
- Số điện thoại shop từ `SHOP_CONTACT_PHONE` (`{số}`) hiện ở mọi Trạng thái, câu hướng dẫn đổi theo Trạng thái:
  - Chờ xác nhận, Đã xác nhận: `Muốn hủy đơn, liên hệ shop:` {số}
  - Đang giao: câu liên hệ theo `EXPERIENCE.md` (giả định A13 ở đó).
  - Đã giao: `Chưa nhận được hàng? Gọi shop qua {số}.`
  - Đã hủy, COD: `Đơn đã hủy. Cần hỗ trợ, vui lòng liên hệ shop qua {số}.`
  - Đã hủy, chuyển khoản: `Đơn đã hủy. Nếu bạn đã chuyển khoản, vui lòng liên hệ shop qua {số}.`

### 4.4 Trang nhân viên

**Description:** Nhân viên làm việc từ Danh sách đơn, mặc định mở Hàng đợi, và thao tác tại Chi tiết đơn, trên desktop hoặc điện thoại. Realizes UJ-1, UJ-3.

#### FR-8: Đăng nhập bằng Tài khoản riêng

Nhân viên và Quản lý có thể đăng nhập bằng Tài khoản riêng. Realizes UJ-1.

**Consequences (testable):**
- Tài khoản khai báo qua `STAFF_ACCOUNTS` (chỉ chứa hash scrypt) và nạp vào `staff_accounts` bằng `npm run staff:seed`; cấu hình không chứa mật khẩu rõ.
- Không có quyền thì mọi trang và API nhân viên trả 401 hoặc chuyển tới đăng nhập.
- Đăng nhập lại đưa người dùng về đúng trang đang xem; hệ thống chỉ nhận đích nội bộ trong `/staff`.
- Người đã đăng nhập vào `/staff/login` được chuyển về `/staff`.
- Vai Nhân viên gọi thao tác của Quản lý nhận 403.
- Phiên đăng nhập lưu trong database, cookie chỉ chứa token ngẫu nhiên. Phiên hết hạn cố định sau 8 giờ, không gia hạn trượt. `[ASSUMPTION]`
- Mỗi người có một Tài khoản riêng; cấu hình không có Tài khoản dùng chung.
- Người dùng có thể đăng xuất, và phiên cũ không còn dùng được. Nạp lại làm đổi hash mật khẩu thì mọi phiên của Tài khoản đó bị thu hồi.
- Đăng nhập sai 5 lần trong 15 phút theo cặp IP và tên đăng nhập thì bị chặn tạm thời. Ở local, bucket `direct` làm giới hạn này thực chất theo tên đăng nhập. `[ASSUMPTION]`

#### FR-9: Hàng đợi và Danh sách đơn

Nhân viên có thể xem các đơn cần xử lý, xem đơn theo nhóm và tìm đơn. Realizes UJ-1, UJ-3.

**Consequences (testable):**
- Danh sách đơn có 4 tab: Cần xử lý, Đã giao, Đã hủy và Cần hoàn tiền. Cần xử lý là Hàng đợi và mở mặc định.
- Một đơn có thể nằm ở cả tab Đã hủy và Cần hoàn tiền.
- Ô tìm nhận Mã đơn hoặc số điện thoại và tìm trên mọi tab; cách khớp và thứ tự kết quả theo `EXPERIENCE.md`.
- Từ khóa tìm kiếm, gồm số điện thoại, không xuất hiện trong URL.
- Mở một đơn dẫn tới Chi tiết đơn.
- Hàng đợi gồm đơn Chờ xác nhận, Đã xác nhận và Đang giao, đơn cũ nhất lên trước.
- Đơn chuyển khoản Chờ xác nhận quá 24 giờ nằm trên cùng và có nhãn nổi bật.
- Không có đơn nào bị tự động hủy.
- Nhân viên xem được tên, số điện thoại và địa chỉ để giao hàng. `[ASSUMPTION]`
- Số điện thoại Khách hàng trên Trang nhân viên bấm để gọi được.
- Nhân viên thao tác được ở chiều rộng 390px.
- MVP không phân trang Hàng đợi. `[ASSUMPTION]`

#### FR-10: Đổi Trạng thái đúng thứ tự

Nhân viên có thể chuyển đơn: Chờ xác nhận → Đã xác nhận → Đang giao → Đã giao. Realizes UJ-1.

**Consequences (testable):**
- Mọi chuyển đổi khác trả `INVALID_STATUS_TRANSITION`, ví dụ `pending` → `delivered`.
- Hai thao tác đồng thời trên cùng đơn: đúng một thành công, bên còn lại nhận `INVALID_STATUS_TRANSITION`; giao diện báo `Đơn vừa được người khác cập nhật` và tải lại Trạng thái mới nhất.
- Thao tác từ màn hình cũ (sai `expectedVersion`, kể cả khi Trạng thái đã quay lại sau Lùi đơn) cũng nhận `INVALID_STATUS_TRANSITION`.
- Đã hủy không chuyển tiếp được. Đã giao chỉ chuyển được theo FR-13.

#### FR-11: Xác nhận hai lần cho Đã giao

Nhân viên phải xác nhận lần hai trước khi chuyển Đang giao → Đã giao. Realizes UJ-1.

**Consequences (testable):**
- Bấm một lần không đổi Trạng thái.
- Hộp xác nhận hiện Mã đơn và tên người nhận.

#### FR-12: Hủy đơn

Nhân viên có thể hủy đơn Chờ xác nhận hoặc Đã xác nhận, bắt buộc có lý do. Realizes UJ-1.

**Consequences (testable):**
- Hủy từ Đang giao, Đã giao hoặc Đã hủy bị từ chối.
- Lý do chọn từ danh sách: `Khách đổi ý`, `Không liên lạc được`, `Đơn trùng`, `Hết hàng`, `Khác`. Chọn `Khác` thì bắt buộc nhập chữ, tối đa 200 ký tự: ô nhập chặn bằng `maxlength="200"`, luôn hiện bộ đếm `x/200`; độ dài đếm theo `.length` của JavaScript (đơn vị UTF-16, cùng đơn vị với `maxlength`) sau `trim`, ở cả bộ đếm và server; vượt 200 thì server trả `VALIDATION_ERROR`.
- Lý do Hủy được lưu bằng mã cố định: `Hết hàng` là `out_of_stock`, `Khác` là `other` kèm chữ đã nhập.
- Thiếu lý do, hoặc chọn `Khác` mà để trống hay chỉ có khoảng trắng, trả `VALIDATION_ERROR`.
- Trạng thái, Lịch sử và thay đổi Tồn kho theo FR-17 diễn ra trong cùng một giao dịch; với `out_of_stock`, Tồn kho không đổi.
- Lỗi giữa giao dịch hủy khiến Trạng thái, Tồn kho và Lịch sử giữ nguyên.

**Out of Scope:**
- Giao thất bại và trả hàng.

#### FR-13: Lùi đơn

Quản lý có thể Lùi đơn, bắt buộc có lý do. Realizes UJ-3.

**Consequences (testable):**
- Lý do chọn từ danh sách: `Bấm nhầm, hàng còn trên xe`, `Khách báo chưa nhận hàng`, `Khác`. Chọn `Khác` thì bắt buộc nhập chữ, tối đa 200 ký tự: ô nhập chặn bằng `maxlength="200"`, luôn hiện bộ đếm `x/200`; độ dài đếm theo `.length` của JavaScript (đơn vị UTF-16, cùng đơn vị với `maxlength`) sau `trim`, ở cả bộ đếm và server; vượt 200 thì server trả `VALIDATION_ERROR`.
- Nhân viên không thấy nút Lùi đơn, kể cả ở dạng vô hiệu; gọi thẳng thao tác này nhận 403. Vai được kiểm trước tính hợp lệ của chuyển Trạng thái: Nhân viên gọi Lùi đơn luôn nhận 403, kể cả khi đơn không ở Đã giao.
- Lùi đơn thêm dòng Lịch sử mới và không đổi Tồn kho.
- Sau khi Lùi đơn, đơn có thể chuyển Đã giao lại theo FR-10 và FR-11.

### 4.5 Lịch sử

#### FR-14: Ghi Lịch sử

Hệ thống ghi một dòng Lịch sử cho mỗi thay đổi của Đơn hàng. Realizes UJ-1, UJ-3.

**Consequences (testable):**
- Mỗi dòng đổi Trạng thái gồm Tài khoản thực hiện, thời gian, Trạng thái cũ, Trạng thái mới và lý do nếu có.
- Dòng kết quả xử lý hoàn tiền gồm Tài khoản thực hiện, thời gian và kết quả, không đổi Trạng thái của đơn.
- Việc tạo đơn cũng có một dòng Lịch sử, người thực hiện là "Khách hàng".
- Không có API sửa hoặc xóa Lịch sử.
- Đổi Trạng thái thất bại hoặc ghi trùng kết quả xử lý hoàn tiền không để lại dòng Lịch sử.

#### FR-15: Xem Lịch sử

Nhân viên và Quản lý có thể xem toàn bộ Lịch sử của một đơn. Realizes UJ-3.

**Consequences (testable):**
- Lịch sử xếp theo thời gian và giữ cả dòng đã bị Lùi đơn sửa.
- Dòng kết quả xử lý hoàn tiền hiện `Đã xử lý hoàn tiền: {kết quả}` thay cho cặp Trạng thái; ghi thêm kết quả là một dòng mới và giữ dòng cũ.

### 4.6 Tồn kho

**Description:** Tồn kho trừ khi đặt, hoàn khi hủy (trừ lý do có mã `out_of_stock`) và là nguồn duy nhất cho mọi hiển thị. Realizes UJ-1, UJ-2.

#### FR-16: Trừ Tồn kho khi đặt

Hệ thống trừ Tồn kho ngay khi Khách hàng đặt đơn thành công. Realizes UJ-2.

**Consequences (testable):**
- Khi Tồn kho là 1 và có N yêu cầu đồng thời: đúng 1 đơn thành công, N-1 yêu cầu nhận `INSUFFICIENT_STOCK`, Tồn kho cuối bằng 0.
- Đơn nhiều dòng thiếu một dòng thì không tạo đơn và không trừ dòng nào.
- Lỗi giữa giao dịch khiến Tồn kho, đơn và Lịch sử giữ nguyên.

#### FR-17: Hoàn Tồn kho khi hủy

Hệ thống hoàn Tồn kho đúng một lần khi đơn bị hủy, trừ khi lý do hủy có mã `out_of_stock`. Realizes UJ-1.

**Consequences (testable):**
- Hai người cùng hủy hoặc bấm đúp chỉ cộng Tồn kho một lần.
- Với mọi mã khác `out_of_stock`, Tồn kho sau khi hoàn đúng bằng số trước khi đặt, nếu không có giao dịch khác.
- Hủy với mã `out_of_stock` không hoàn Tồn kho cho toàn bộ đơn: Tồn kho của mọi sản phẩm trong đơn giữ nguyên, kể cả đơn nhiều dòng.
- Mã `other` vẫn hoàn Tồn kho, kể cả khi chữ đã nhập là "hết hàng".

#### FR-18: Hiển thị Tồn kho thực tế

Khách hàng thấy trạng thái còn hàng theo Tồn kho hiện tại. Realizes UJ-2.

**Consequences (testable):**
- Nhãn tồn kho, bộ lọc `inStock` và giới hạn số lượng đọc từ Tồn kho, không đọc số tĩnh trong code.
- Khi đã biết Tồn kho, trang sản phẩm và giỏ chặn tăng vượt `min(Tồn kho, 10)`, tính cả số đã có trong giỏ; không tự giảm số đã có. Lỗi tải Tồn kho thì giới hạn 10. Server kiểm tra lần cuối khi đặt.
- Sau khi đơn cuối được đặt, trang sản phẩm tải lại hiện "Hết hàng".

#### FR-19: Giữ form khi hết hàng

Khách hàng bị thiếu hàng lúc đặt vẫn giữ được thông tin đã nhập và xử lý ngay tại form. Realizes UJ-2.

**Consequences (testable):**
- Phản hồi `INSUFFICIENT_STOCK` trả mọi dòng thiếu, mỗi dòng có `productId`, số yêu cầu và số còn lại.
- Form giữ nguyên dữ liệu và đánh dấu mọi dòng thiếu.
- Dòng còn N sản phẩm (N > 0) có `Lấy N` để giảm số lượng về N và `Bỏ` để xóa dòng.
- Dòng có N = 0 chỉ hiện `Hết hàng` và `Bỏ`.
- Giỏ hàng và tổng tiền cập nhật theo lựa chọn; Khách hàng không phải quay lại giỏ.

### 4.7 Chống đơn ảo và xử lý hoàn tiền

#### FR-20: Chống đơn ảo

Hệ thống giới hạn việc tạo đơn để bảo vệ Tồn kho.

**Consequences (testable):**
- Một IP bị chặn sau 10 đơn trong 1 giờ. Ở local, bucket `direct` làm ngưỡng này áp dụng cho cả shop. `[ASSUMPTION]`
- Một số điện thoại có tối đa 3 đơn Chờ xác nhận cùng lúc. `[ASSUMPTION]`
- Yêu cầu bị chặn trả HTTP 429 với mã lỗi `RATE_LIMITED`, không tạo đơn và không trừ Tồn kho.
- Số `0...` và `+84...` của cùng một thuê bao được tính chung.

#### FR-21: Cờ cần hoàn tiền

Khi đơn chuyển khoản bị hủy, hệ thống bật Cờ cần hoàn tiền để Quản lý xử lý ngoài hệ thống và ghi lại kết quả. Realizes UJ-1, UJ-3.

**Consequences (testable):**
- Đơn COD không có cờ và không có nhãn.
- Chỉ Quản lý thực hiện được `Đã xử lý hoàn tiền`, tại Chi tiết đơn, qua hộp xác nhận, với đúng một kết quả: `Đã hoàn tiền` hoặc `Khách chưa chuyển tiền`. Thao tác ghi một dòng Lịch sử; Nhân viên gọi thao tác này nhận 403.
- Nhãn `Cần hoàn tiền` hoặc `Đã xử lý hoàn tiền` hiện trên dòng đơn, bảng và Chi tiết đơn.
- Kết quả chỉ quyết định việc đơn rời tab Cần hoàn tiền và việc có được ghi thêm hay không.
- Sau `Khách chưa chuyển tiền`, Quản lý được ghi thêm `Đã hoàn tiền`; dòng cũ vẫn giữ trong Lịch sử.
- `Ghi thêm: Đã hoàn tiền` chỉ đi từ `Khách chưa chuyển tiền` sang `Đã hoàn tiền`; đơn không quay lại tab Cần hoàn tiền.
- Nếu ghi nhầm `Đã hoàn tiền`, Quản lý ghi thêm một dòng đính chính về `Khách chưa chuyển tiền`, bắt buộc có lý do, tối đa 200 ký tự (cùng quy tắc `maxlength="200"`, bộ đếm `x/200`, đếm `.length` sau `trim` và `VALIDATION_ERROR` khi vượt như FR-12); dòng cũ vẫn giữ trong Lịch sử và Khách hàng không thấy.
- Mỗi thao tác chỉ hợp lệ theo kết quả mới nhất; lần ghi trùng nhận lỗi xung đột.
- Quản lý kiêm chủ shop đối soát sao kê và hoàn tay trong 3 ngày làm việc, không thu phí. `[ASSUMPTION]`
- Hệ thống không lưu trạng thái thanh toán và không chuyển tiền; kết quả xử lý hoàn tiền chỉ là ghi chú của Quản lý trong Lịch sử.
- `Đã hoàn tiền` và `Khách chưa chuyển tiền` không phải xác nhận của hệ thống rằng Khách hàng đã hoặc chưa trả tiền.
- Trang xác nhận không khẳng định Khách hàng đã trả tiền hoặc sẽ được hoàn, và không hiện Cờ cần hoàn tiền hay kết quả xử lý.

### 4.8 Hành vi hiện có

**Phải giữ nguyên**

- Server luôn tính lại giá, phí giao hàng và tổng tiền; không tin dữ liệu giá từ client (`calculateOrderTotals`).
- Mỗi sản phẩm tối đa `MAX_QUANTITY_PER_ITEM` = 10 trong một đơn.
- Miễn phí giao hàng tiêu chuẩn từ `FREE_SHIPPING_THRESHOLD` = 500.000đ.
- Định dạng số điện thoại đầu vào theo `VN_PHONE_REGEX`.
- Lỗi API giữ dạng `{ error: { code, message, details? } }`.
- Giỏ hàng vẫn lưu ở trình duyệt.

**Thay đổi có chủ đích**

| Hiện tại | Sau thay đổi |
|---|---|
| Ai có Mã đơn cũng xem được đơn đầy đủ | Cần Quyền xem đơn hoặc Tra đơn, chỉ thấy Dữ liệu tối thiểu |
| `/orders` liệt kê mọi đơn | `/orders` là trang Tra đơn |
| Khách hàng tự hủy đơn Chờ xác nhận | Chỉ Nhân viên hủy, từ Chờ xác nhận hoặc Đã xác nhận |
| Đơn lưu trong `storage/orders.json` | Đơn lưu trong PostgreSQL (dữ liệu cũ: xem mục 6.2) |
| Tồn kho là số tĩnh, không giảm | Tồn kho trừ khi đặt và hoàn khi hủy, trừ lý do có mã `out_of_stock` |

### 4.9 Cross-Cutting NFRs

- **Toàn vẹn:** mọi thay đổi Trạng thái và Tồn kho đi qua một đường duy nhất trong một giao dịch. Trang xác nhận, Trang nhân viên và Lịch sử đọc cùng một bản ghi Đơn hàng. Sửa sai là thêm thao tác mới, không xóa dấu vết. Ngoại lệ đã chấp nhận: Tồn kho sai được sửa tay trong database (mục 6.3), nằm ngoài đường này và không có dấu vết trong Lịch sử.
- **Bảo mật:** dữ liệu khách không xuất hiện trong URL hoặc log ứng dụng. Bí mật chỉ nằm trong biến môi trường.
- **Cấu hình:** giá trị thật ở `.env`, mẫu ở `.env.example`. Production bắt buộc `TRUSTED_PROXY_HOPS` là số nguyên ≥ 1.
- **Kiểm thử:** các ca đồng thời chạy trên PostgreSQL thật, không mock cơ sở dữ liệu. Cổng `npm run check:full` gồm test DB và race.
- **Tiếng Việt:** toàn bộ nội dung giao diện và thông báo lỗi viết bằng tiếng Việt.
- **Khả năng tiếp cận:** trạng thái không truyền đạt chỉ bằng màu sắc; form và hộp xác nhận dùng được bằng bàn phím.
- **Phát hành:** chỉ phát hành khi đủ DB, Tồn kho, Trang xác nhận, Tra đơn và Trang nhân viên; đóng nốt route đọc cũ (`GET /api/orders`, kiểm quyền `GET /api/orders/:id`) sau cùng; `PATCH /api/orders/:id` và nút hủy của Khách hàng đóng sớm, ngay khi đơn chuyển sang PostgreSQL.

## 5. Non-Goals (Explicit)

- Không xây cổng thanh toán, đối soát hoặc hoàn tiền tự động.
- Không lưu trạng thái thanh toán; kết quả xử lý hoàn tiền chỉ là ghi chú của Quản lý trong Lịch sử.
- Không có công cụ chỉnh Tồn kho trong MVP.
- Không có tài khoản Khách hàng.
- Không cho Khách hàng tự hủy đơn.
- Không xử lý giao thất bại, trả hàng hoặc hủy khi Đang giao.
- Không tích hợp đơn vị vận chuyển hay dự báo ngày giao.
- Không gửi thông báo chủ động hoặc OTP.
- Không xây hệ thống quản lý người dùng; Tài khoản nạp bằng script seed từ biến môi trường.

## 6. MVP Scope

### 6.1 In Scope

- FR-1 đến FR-21.
- PostgreSQL cài sẵn trên máy, database `shoplite_dev` và `shoplite_test`.
- Viết lại test hiện có bị ảnh hưởng bởi việc đóng route.

### 6.2 Out of Scope for MVP

Mã trong ngoặc là mã ứng viên trong `brainstorm-intent.md`.

- Trễ 10 giây hoặc 10 phút trước khi "Đã giao" hiện cho Khách hàng (#8, Could).
- Cảnh báo đơn quá hạn theo từng Trạng thái (#13, Should). FR-9 chỉ xử lý đơn chuyển khoản chờ quá 24 giờ.
- Thông tin dự kiến ngày giao (#3, Should).
- Công cụ liên hệ hoặc xin lỗi khách (#12, Could). Số điện thoại bấm để gọi ở FR-9 chỉ là liên kết gọi điện, không thuộc mục này.
- Chuyển 11 đơn thử hiện có sang PostgreSQL. Link cũ của các đơn này sẽ dẫn tới trang Tra đơn và báo "Thông tin không đúng".

### 6.3 Rủi ro đã chấp nhận

- Đợt đầu lớn hơn phạm vi ban đầu và chưa có ước lượng.
- Khách hàng có thể thấy "Đã giao" sai cho đến khi Quản lý Lùi đơn.
- Hoàn tiền phụ thuộc quy trình thủ công ngoài hệ thống.
- Đơn ảo hoặc đơn chuyển khoản bỏ dở có thể giữ Tồn kho nếu ngưỡng sai hoặc Hàng đợi không được xử lý.
- Hủy với mã `out_of_stock` không hoàn Tồn kho cho mọi sản phẩm trong đơn, kể cả sản phẩm thực tế vẫn còn; các sản phẩm đó có thể bị bán thiếu.
- Không hoàn kho chỉ tránh cộng thêm, không gỡ được số ảo đã có. SM-2 đo trên số của hệ thống nên có thể vẫn bằng 0 khi hàng thực tế đã lệch.
- MVP không có công cụ chỉnh Tồn kho; Tồn kho sai được sửa tay trong database.
- Nhãn gói hàng có thể lộ Mã đơn và số điện thoại, nên người nhặt được vẫn Tra đơn và xem được Dữ liệu tối thiểu. OTP để sau MVP.
- Không có giới hạn theo Mã đơn bất kể IP, nên dò phân tán từ nhiều IP chỉ bị chặn bởi việc phải khớp cả số điện thoại.
- PostgreSQL 14 đã hết hỗ trợ; bắt buộc nâng lên bản còn hỗ trợ trước đơn thật đầu tiên.
- Local dùng chung bucket IP `direct`, nên giới hạn theo IP ở local không phân biệt người dùng.

### 6.4 Ý kiến thiểu số còn mở

MVP đi theo hướng đa số, nhưng các ý kiến sau chưa được thuyết phục và nên xem lại khi có dữ liệu thật:

- Winston muốn lưu `payment_status`.
- Winston muốn cho hủy khi Đang giao.
- Sally muốn hiện cam kết hoàn tiền cho Khách hàng.
- Sally muốn trễ hiển thị "Đã giao".
- John cho rằng chưa có bằng chứng về Nhân viên thật đang chờ công cụ.

## 7. Success Metrics

- **Khung đo:** 4 tuần đầu sau khi phát hành, nếu có đơn thật. `[ASSUMPTION]`
- **Trong khóa học:** SM-2, SM-3 và SM-4 được kiểm chứng bằng test. SM-1, SM-5 và các counter-metric chỉ đo khi có đơn thật.

**Primary**

- **SM-1:** Trong các đơn của mọi phương thức thanh toán, tỷ lệ đơn nằm ở Chờ xác nhận quá 24 giờ dưới 5%, đo vào cuối mỗi tuần. `[ASSUMPTION]` Validates FR-9, FR-10.
- **SM-2:** Số đơn bán quá Tồn kho trong hệ thống bằng 0; chỉ số này không phát hiện lệch với hàng thực tế (mục 6.3). Validates FR-16, FR-17.

**Secondary**

- **SM-3:** 100% lần đổi Trạng thái có dòng Lịch sử đầy đủ. Validates FR-14.
- **SM-4:** 0 route đọc hoặc đổi Đơn hàng mà không kiểm tra quyền. Validates FR-4, FR-8.
- **SM-5:** Số lượt Khách hàng hỏi "đơn đâu" giảm so với số nền. Nguồn đếm là sổ ghi tay của Quản lý cho cuộc gọi và tin nhắn; cần ghi số nền trong tuần đầu. `[ASSUMPTION]` Validates FR-1, FR-7.

**Counter-metrics (do not optimize)**

- **SM-C1:** Tỷ lệ đơn bị hủy với mã `out_of_stock` không được tăng so với số nền của tuần đầu. Chỉ đếm đơn có mã này; lý do `Khác` không được đếm, kể cả khi chữ đã nhập là "hết hàng". Không đạt SM-2 bằng cách hủy đơn hàng loạt. Counterbalances SM-1, SM-2.
- **SM-C2:** Số lần Khách hàng thật bị chặn nhầm khi Tra đơn hoặc đặt đơn. Không siết giới hạn đến mức chặn người mua thật. Counterbalances FR-3, FR-20.

## 8. Open Questions

Không câu nào dưới đây chặn UX, kiến trúc hoặc chia story.

1. Giá trị thật của `SHOP_CONTACT_PHONE` là gì? Chủ shop trả lời trước khi phát hành.
2. Ai đối soát chuyển khoản và thời hạn hoàn tiền thực tế là bao lâu? Chủ shop trả lời trước khi có đơn thật.
3. Giả định 2 Nhân viên và 1 Quản lý có đúng không, và họ đang xử lý đơn thế nào? Chủ shop trả lời trước khi có đơn thật.
4. Các ngưỡng ở FR-3, FR-8 và FR-20 có phù hợp với lượng đơn thật không? Xem lại sau 4 tuần có đơn thật.
5. Khi triển khai, ứng dụng đứng sau proxy nào? Quyết định ở bước triển khai. Trước đó local dùng bucket `direct`; production không khởi động nếu chưa khai báo `TRUSTED_PROXY_HOPS` hợp lệ.
6. Đã từng có sự cố mất tiền thật chưa? Chủ shop trả lời để xác nhận mức ưu tiên của tính năng.

## 9. Assumptions Index

landv đã xác nhận các mặc định về ngưỡng, thời hạn, route, dữ liệu ẩn với Khách hàng, quyền xem của Nhân viên và việc Quản lý xử lý hoàn tiền. Các mục vẫn được giữ ở đây vì chưa có dữ liệu thật. A6 đã được chấp nhận ở bước UX nhưng cần xem lại.

- §2.3: UJ-1, UJ-2, UJ-3 do coach viết nháp.
- FR-3: 5 lần sai theo IP và Mã đơn; 20 lần sai mỗi IP; cùng trong 15 phút.
- Mục 3: cookie Quyền xem đơn chứa tối đa 20 Mã đơn.
- FR-3, FR-8, FR-20: cửa sổ rate limit neo tại lần đếm đầu.
- FR-5: Quyền xem đơn hiệu lực 7 ngày.
- FR-6 (A6): giữ hàng Ngân hàng trong thông tin chuyển khoản.
- FR-7: Khách hàng không thấy tên Nhân viên, lý do nội bộ hoặc mốc Đã giao đã bị sửa.
- FR-8: phiên đăng nhập 8 giờ; chặn tạm sau 5 lần đăng nhập sai trong 15 phút.
- FR-9: mọi Nhân viên được xem tên, số điện thoại và địa chỉ; Hàng đợi không phân trang.
- FR-20: 10 đơn mỗi IP trong 1 giờ; 3 đơn Chờ xác nhận mỗi số điện thoại.
- FR-21: Quản lý kiêm chủ shop đối soát sao kê và hoàn tay trong 3 ngày làm việc, không thu phí.
- §7: đo trong 4 tuần khi có đơn thật; SM-1 dưới 5%; SM-5 đếm bằng sổ ghi tay và lấy số nền trong tuần đầu.
- Từ brief: 2 Nhân viên và 1 Quản lý kiêm chủ shop.
