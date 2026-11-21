---
title: "PRD: ShopLite - Vận hành và theo dõi đơn hàng"
status: final
created: 2026-11-21
updated: 2026-11-21
---

# PRD: ShopLite - Vận hành và theo dõi đơn hàng

## 0. Document Purpose

PRD này dành cho người làm UX, kiến trúc, phát triển và kiểm thử của ShopLite. Tài liệu xây trên `brief.md`, `brainstorm-intent.md` và `phan-bien.md`, không lặp lại phần lập luận ở đó. Thuật ngữ được định nghĩa ở mục 3. Yêu cầu được đánh số FR-n, hành trình UJ-n, chỉ số SM-n. Mọi suy luận chưa được kiểm chứng bằng dữ liệu thật được gắn `[ASSUMPTION]` và tổng hợp ở mục 9. Lựa chọn kỹ thuật nằm trong `addendum.md`.

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
Thảo là nhân viên vận hành, vào ca lúc 8 giờ và mở trang nhân viên trên điện thoại. Sau khi đăng nhập bằng Tài khoản riêng, Thảo thấy Hàng đợi với đơn cũ nhất ở trên và một đơn chuyển khoản đã chờ hơn 24 giờ được đưa lên đầu. Thảo gọi Khách hàng của đơn đó, được báo không mua nữa, nên hủy đơn với lý do "Khách đổi ý"; Tồn kho được hoàn ngay và Cờ cần hoàn tiền được bật. Các đơn còn lại được xác nhận rồi chuyển Đang giao. **Cao trào:** không còn đơn nào ở Chờ xác nhận hay Đã xác nhận, và mỗi thao tác đều có tên Thảo trong Lịch sử. **Edge case:** Thảo và một đồng nghiệp cùng bấm xác nhận một đơn; một người thành công, người kia được báo đơn đã đổi trạng thái.

**UJ-2. Nam chuyển khoản rồi tự theo dõi đơn.**
Nam đặt một bàn phím, chọn chuyển khoản và thấy Trang xác nhận có số tiền, số tài khoản và nội dung chuyển khoản. Nam tải lại trang và thông tin vẫn còn. Hôm sau, trên máy khác, Nam vào trang Tra đơn, nhập Mã đơn và số điện thoại ở dạng `+84...` dù lúc đặt đã nhập `0...`. **Cao trào:** Nam thấy đơn đã chuyển Đang giao kèm mốc thời gian và bước kế tiếp, nên không cần gọi shop. **Edge case:** nếu bàn phím vừa hết lúc Nam bấm Đặt, form vẫn giữ nguyên thông tin, dòng hết hàng được đánh dấu và Nam có thể bỏ dòng đó để đặt tiếp.

**UJ-3. Khoa sửa một đơn bị bấm nhầm "Đã giao".**
Khoa là quản lý kiêm chủ shop. Khách hàng gọi báo chưa nhận được hàng dù Trang xác nhận ghi Đã giao. Khoa mở Lịch sử của đơn và thấy Nhân viên nào đã bấm, lúc nào. Khoa Lùi đơn về Đang giao với lý do "Bấm nhầm, hàng còn trên xe". **Cao trào:** Khách hàng thấy lại Trạng thái đúng, Lịch sử giữ cả dòng cũ và dòng sửa, Tồn kho không đổi.

## 3. Glossary

- **Đơn hàng:** bản ghi một lần mua, có đúng một Trạng thái hiện tại.
- **Mã đơn:** định danh dạng `SL-YYYYMMDD-XXXXXX`.
- **Trạng thái:** một trong Chờ xác nhận (`pending`), Đã xác nhận (`confirmed`), Đang giao (`shipping`), Đã giao (`delivered`), Đã hủy (`cancelled`).
- **Khách hàng:** người đặt đơn, không có tài khoản.
- **Nhân viên:** người có Tài khoản vai nhân viên.
- **Quản lý:** người có Tài khoản vai quản lý, làm được mọi việc của Nhân viên và thao tác Lùi đơn.
- **Tài khoản:** thông tin đăng nhập riêng của đúng một người.
- **Tra đơn:** Khách hàng dùng Mã đơn và số điện thoại để xem Dữ liệu tối thiểu.
- **Dữ liệu tối thiểu:** Trạng thái, mốc thời gian, tên sản phẩm, tên và số điện thoại đã che.
- **Trang xác nhận:** trang Khách hàng thấy sau khi đặt hoặc Tra đơn thành công, gồm Dữ liệu tối thiểu, Mã đơn, tổng tiền, phương thức giao hàng và thanh toán.
- **Quyền xem đơn:** cookie có ký, gắn với đúng một Đơn hàng và trình duyệt.
- **Hàng đợi:** danh sách Đơn hàng còn cần Nhân viên xử lý.
- **Trang nhân viên:** khu vực đăng nhập nơi Nhân viên và Quản lý xem Hàng đợi, Lịch sử và thao tác trên Đơn hàng.
- **Lịch sử:** các dòng ghi thay đổi của Đơn hàng, chỉ thêm, không sửa hoặc xóa.
- **Tồn kho:** số lượng có thể bán của một sản phẩm, không bao giờ âm.
- **Lùi đơn:** Quản lý chuyển Đơn hàng từ Đã giao về Đang giao.
- **Cờ cần hoàn tiền:** đánh dấu đơn chuyển khoản đã hủy cần người kiểm tra và xử lý tiền ngoài hệ thống.

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

Khách hàng chỉ thấy Dữ liệu tối thiểu khi Tra đơn. Realizes UJ-2.

**Consequences (testable):**
- Phản hồi không chứa địa chỉ đầy đủ, email hoặc ghi chú.
- Tên và số điện thoại được che ở phía server trước khi trả về.
- Trang Tra đơn và Trang xác nhận không có thao tác hủy hoặc sửa.

#### FR-3: Chống dò Mã đơn

Hệ thống giới hạn số lần Tra đơn sai. Realizes UJ-2.

**Consequences (testable):**
- Cùng một IP và Mã đơn bị chặn sau 5 lần sai trong 15 phút. `[ASSUMPTION]`
- Một IP bị chặn sau 20 lần sai trong 15 phút trên mọi Mã đơn. `[ASSUMPTION]`
- Khi bị chặn, hệ thống vẫn hiển thị "Thông tin không đúng", không cho biết Mã đơn có tồn tại hay không.
- Một IP bị chặn không làm Khách hàng ở IP khác mất quyền Tra đơn.
- Hệ thống chỉ đọc IP từ header khi proxy tin cậy đã được cấu hình; nếu chưa cấu hình thì dùng địa chỉ kết nối. Giá trị IP giả trong header không vượt được giới hạn.
- Bộ đếm vẫn còn sau khi server khởi động lại.

#### FR-4: Đóng các đường truy cập không kiểm tra quyền

Chỉ người có quyền mới đọc hoặc đổi được Đơn hàng.

**Consequences (testable):**
- `GET /api/orders` và `GET /api/orders/:id` trả 401 khi không có quyền phù hợp.
- `PATCH /api/orders/:id` không còn cho Khách hàng hủy đơn.
- `/orders` không còn liệt kê đơn; mục "Đơn hàng" trên menu dẫn tới trang Tra đơn.
- `/orders/:id` không có Quyền xem đơn thì chuyển tới trang Tra đơn với Mã đơn điền sẵn, và trang Tra đơn không tự chuyển ngược lại nếu chưa Tra đơn thành công.

### 4.2 Trang xác nhận

**Description:** Sau khi đặt, Khách hàng vẫn có thông tin cần thiết mà không còn dựa vào việc ai có Mã đơn cũng xem được đơn. Realizes UJ-2.

#### FR-5: Xem lại Trang xác nhận

Khách hàng vừa đặt có thể xem lại Trang xác nhận trên cùng trình duyệt. Realizes UJ-2.

**Consequences (testable):**
- Đặt đơn thành công cấp Quyền xem đơn dạng cookie `HttpOnly` có ký, hiệu lực 7 ngày. `[ASSUMPTION]`
- Tải lại trang vẫn thấy Trang xác nhận.
- Cookie bị sửa, hết hạn hoặc của đơn khác đều bị từ chối.
- Trang chỉ hiện nội dung đã định nghĩa cho Trang xác nhận ở mục 3.
- Trang có lối "Tra đơn" với Mã đơn điền sẵn.

#### FR-6: Thông tin chuyển khoản

Khách hàng chọn chuyển khoản thấy số tiền, số tài khoản và nội dung chuyển khoản trên Trang xác nhận khi đơn còn Chờ xác nhận. Realizes UJ-2.

**Consequences (testable):**
- Thông tin chuyển khoản không hiện khi đơn đã rời Chờ xác nhận.
- Nội dung chuyển khoản là Mã đơn.

### 4.3 Theo dõi trạng thái

#### FR-7: Xem Trạng thái, mốc thời gian và bước kế tiếp

Khách hàng có thể xem Trạng thái hiện tại, các mốc đã qua và bước kế tiếp. Realizes UJ-2.

**Consequences (testable):**
- Mỗi mốc lấy thời gian từ dòng Lịch sử mới nhất của Trạng thái đó, không tính dòng đã bị Lùi đơn thay thế.
- Mỗi Trạng thái có một câu mô tả bước kế tiếp.
- Khách hàng không thấy tên Nhân viên hoặc lý do nội bộ. `[ASSUMPTION]`
- Sau khi Lùi đơn, Khách hàng thấy Đang giao và không thấy mốc Đã giao đã bị sửa. Khi đơn được giao lại, mốc Đã giao dùng thời gian của lần giao mới nhất. `[ASSUMPTION]`
- Đơn Chờ xác nhận hoặc Đã xác nhận hiện hướng dẫn: muốn hủy đơn, Khách hàng liên hệ shop qua số trong cấu hình `SHOP_CONTACT_PHONE`.
- Đơn chuyển khoản đã hủy hiện: "Đơn đã hủy. Nếu bạn đã chuyển khoản, vui lòng liên hệ shop qua {SHOP_CONTACT_PHONE}."

### 4.4 Trang nhân viên

**Description:** Nhân viên làm việc từ một Hàng đợi, trên desktop hoặc điện thoại. Realizes UJ-1, UJ-3.

#### FR-8: Đăng nhập bằng Tài khoản riêng

Nhân viên và Quản lý có thể đăng nhập bằng Tài khoản riêng. Realizes UJ-1.

**Consequences (testable):**
- Tài khoản cấu hình qua biến môi trường, mật khẩu lưu dạng hash.
- Không có quyền thì mọi trang và API nhân viên trả 401 hoặc chuyển tới đăng nhập.
- Vai Nhân viên gọi thao tác của Quản lý nhận 403.
- Phiên đăng nhập hết hạn sau 8 giờ. `[ASSUMPTION]`
- Mỗi người có một Tài khoản riêng; cấu hình không có Tài khoản dùng chung.
- Người dùng có thể đăng xuất, và phiên cũ không còn dùng được.
- Đăng nhập sai 5 lần trong 15 phút theo cặp IP và tên đăng nhập thì bị chặn tạm thời. `[ASSUMPTION]`

#### FR-9: Hàng đợi

Nhân viên có thể xem các đơn cần xử lý. Realizes UJ-1.

**Consequences (testable):**
- Hàng đợi mặc định gồm đơn Chờ xác nhận, Đã xác nhận và Đang giao, đơn cũ nhất lên trước.
- Đơn chuyển khoản Chờ xác nhận quá 24 giờ nằm trên cùng và có nhãn nổi bật.
- Không có đơn nào bị tự động hủy.
- Nhân viên xem được tên, số điện thoại và địa chỉ để giao hàng. `[ASSUMPTION]`
- Nhân viên thao tác được ở chiều rộng 390px.
- MVP không phân trang Hàng đợi. `[ASSUMPTION]`

#### FR-10: Đổi Trạng thái đúng thứ tự

Nhân viên có thể chuyển đơn: Chờ xác nhận → Đã xác nhận → Đang giao → Đã giao. Realizes UJ-1.

**Consequences (testable):**
- Mọi chuyển đổi khác trả `INVALID_STATUS_TRANSITION`, ví dụ `pending` → `delivered`.
- Hai thao tác đồng thời trên cùng đơn: đúng một thành công, bên còn lại nhận `INVALID_STATUS_TRANSITION`.
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
- Thiếu lý do trả `VALIDATION_ERROR`.
- Trạng thái, Tồn kho và Lịch sử đổi trong cùng một giao dịch.
- Lỗi giữa giao dịch hủy khiến Trạng thái, Tồn kho và Lịch sử giữ nguyên.

**Out of Scope:**
- Giao thất bại và trả hàng.

#### FR-13: Lùi đơn

Quản lý có thể Lùi đơn, bắt buộc có lý do. Realizes UJ-3.

**Consequences (testable):**
- Nhân viên gọi thao tác này nhận 403.
- Lùi đơn thêm dòng Lịch sử mới và không đổi Tồn kho.
- Sau khi Lùi đơn, đơn có thể chuyển Đã giao lại theo FR-10 và FR-11.

### 4.5 Lịch sử

#### FR-14: Ghi Lịch sử

Hệ thống ghi một dòng Lịch sử cho mỗi thay đổi của Đơn hàng. Realizes UJ-1, UJ-3.

**Consequences (testable):**
- Mỗi dòng gồm Tài khoản thực hiện, thời gian, Trạng thái cũ, Trạng thái mới và lý do nếu có.
- Việc tạo đơn cũng có một dòng Lịch sử, người thực hiện là "Khách hàng".
- Không có API sửa hoặc xóa Lịch sử.
- Đổi Trạng thái thất bại không để lại dòng Lịch sử.

#### FR-15: Xem Lịch sử

Nhân viên và Quản lý có thể xem toàn bộ Lịch sử của một đơn. Realizes UJ-3.

**Consequences (testable):**
- Lịch sử xếp theo thời gian và giữ cả dòng đã bị Lùi đơn sửa.

### 4.6 Tồn kho

**Description:** Tồn kho trừ khi đặt, hoàn khi hủy và là nguồn duy nhất cho mọi hiển thị. Realizes UJ-1, UJ-2.

#### FR-16: Trừ Tồn kho khi đặt

Hệ thống trừ Tồn kho ngay khi Khách hàng đặt đơn thành công. Realizes UJ-2.

**Consequences (testable):**
- Khi Tồn kho là 1 và có N yêu cầu đồng thời: đúng 1 đơn thành công, N-1 yêu cầu nhận `INSUFFICIENT_STOCK`, Tồn kho cuối bằng 0.
- Đơn nhiều dòng thiếu một dòng thì không tạo đơn và không trừ dòng nào.
- Lỗi giữa giao dịch khiến Tồn kho, đơn và Lịch sử giữ nguyên.

#### FR-17: Hoàn Tồn kho khi hủy

Hệ thống hoàn Tồn kho đúng một lần khi đơn bị hủy. Realizes UJ-1.

**Consequences (testable):**
- Hai người cùng hủy hoặc bấm đúp chỉ cộng Tồn kho một lần.
- Tồn kho sau khi hoàn đúng bằng số trước khi đặt, nếu không có giao dịch khác.

#### FR-18: Hiển thị Tồn kho thực tế

Khách hàng thấy trạng thái còn hàng theo Tồn kho hiện tại. Realizes UJ-2.

**Consequences (testable):**
- Nhãn tồn kho, bộ lọc `inStock` và giới hạn số lượng đọc từ Tồn kho, không đọc số tĩnh trong code.
- Sau khi đơn cuối được đặt, trang sản phẩm tải lại hiện "Hết hàng".

#### FR-19: Giữ form khi hết hàng

Khách hàng bị thiếu hàng lúc đặt vẫn giữ được thông tin đã nhập. Realizes UJ-2.

**Consequences (testable):**
- Phản hồi `INSUFFICIENT_STOCK` cho biết sản phẩm nào thiếu và số còn lại.
- Form giữ nguyên dữ liệu, đánh dấu dòng thiếu và cho bỏ dòng đó để đặt tiếp.

### 4.7 Chống đơn ảo và xử lý hoàn tiền

#### FR-20: Chống đơn ảo

Hệ thống giới hạn việc tạo đơn để bảo vệ Tồn kho.

**Consequences (testable):**
- Một IP bị chặn sau 10 đơn trong 1 giờ. `[ASSUMPTION]`
- Một số điện thoại có tối đa 3 đơn Chờ xác nhận cùng lúc. `[ASSUMPTION]`
- Yêu cầu bị chặn trả HTTP 429 với mã lỗi `RATE_LIMITED`, không tạo đơn và không trừ Tồn kho.
- Số `0...` và `+84...` của cùng một thuê bao được tính chung.

#### FR-21: Cờ cần hoàn tiền

Khi đơn chuyển khoản bị hủy, hệ thống bật Cờ cần hoàn tiền. Realizes UJ-1.

**Consequences (testable):**
- Đơn COD không có cờ.
- Quản lý có thể đánh dấu đã xử lý, thao tác này ghi Lịch sử. `[ASSUMPTION]`
- Quản lý kiêm chủ shop đối soát sao kê và hoàn tay trong 3 ngày làm việc, không thu phí. `[ASSUMPTION]`
- Hệ thống không lưu trạng thái "đã thanh toán" và không chuyển tiền.
- Trang xác nhận không khẳng định Khách hàng đã trả tiền hoặc sẽ được hoàn.

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
| Tồn kho là số tĩnh, không giảm | Tồn kho trừ khi đặt và hoàn khi hủy |

### 4.9 Cross-Cutting NFRs

- **Toàn vẹn:** mọi thay đổi Trạng thái và Tồn kho đi qua một đường duy nhất trong một giao dịch. Trang xác nhận, Trang nhân viên và Lịch sử đọc cùng một bản ghi Đơn hàng. Sửa sai là thêm thao tác mới, không xóa dấu vết.
- **Bảo mật:** dữ liệu khách không xuất hiện trong URL hoặc log ứng dụng. Bí mật chỉ nằm trong biến môi trường.
- **Cấu hình:** giá trị thật ở `.env`, mẫu ở `.env.example`.
- **Kiểm thử:** các ca đồng thời chạy trên PostgreSQL thật, không mock cơ sở dữ liệu.
- **Tiếng Việt:** toàn bộ nội dung giao diện và thông báo lỗi viết bằng tiếng Việt.
- **Khả năng tiếp cận:** trạng thái không truyền đạt chỉ bằng màu sắc; form và hộp xác nhận dùng được bằng bàn phím.
- **Phát hành:** chỉ phát hành khi đủ DB, Tồn kho, Trang xác nhận, Tra đơn và Trang nhân viên; đóng route cũ sau cùng.

## 5. Non-Goals (Explicit)

- Không xây cổng thanh toán, đối soát hoặc hoàn tiền tự động.
- Không có tài khoản Khách hàng.
- Không cho Khách hàng tự hủy đơn.
- Không xử lý giao thất bại, trả hàng hoặc hủy khi Đang giao.
- Không tích hợp đơn vị vận chuyển hay dự báo ngày giao.
- Không gửi thông báo chủ động hoặc OTP.
- Không xây hệ thống quản lý người dùng; Tài khoản cấu hình qua biến môi trường.

## 6. MVP Scope

### 6.1 In Scope

- FR-1 đến FR-21.
- PostgreSQL và Docker Compose cho local; DB riêng cho e2e.
- Viết lại test hiện có bị ảnh hưởng bởi việc đóng route.

### 6.2 Out of Scope for MVP

Mã trong ngoặc là mã ứng viên trong `brainstorm-intent.md`.

- Trễ 10 giây hoặc 10 phút trước khi "Đã giao" hiện cho Khách hàng (#8, Could).
- Cảnh báo đơn quá hạn theo từng Trạng thái (#13, Should). FR-9 chỉ xử lý đơn chuyển khoản chờ quá 24 giờ.
- Thông tin dự kiến ngày giao (#3, Should).
- Công cụ liên hệ hoặc xin lỗi khách (#12, Could).
- Chuyển 11 đơn thử hiện có sang PostgreSQL. Link cũ của các đơn này sẽ dẫn tới trang Tra đơn và báo "Thông tin không đúng".

### 6.3 Rủi ro đã chấp nhận

- Đợt đầu lớn hơn phạm vi ban đầu và chưa có ước lượng.
- Khách hàng có thể thấy "Đã giao" sai cho đến khi Quản lý Lùi đơn.
- Hoàn tiền phụ thuộc quy trình thủ công ngoài hệ thống.
- Đơn ảo hoặc đơn chuyển khoản bỏ dở có thể giữ Tồn kho nếu ngưỡng sai hoặc Hàng đợi không được xử lý.
- Nhãn gói hàng có thể lộ Mã đơn và số điện thoại, nên người nhặt được vẫn biết Trạng thái đơn. OTP để sau MVP.

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
- **SM-2:** Số đơn bán quá Tồn kho bằng 0. Validates FR-16, FR-17.

**Secondary**

- **SM-3:** 100% lần đổi Trạng thái có dòng Lịch sử đầy đủ. Validates FR-14.
- **SM-4:** 0 route đọc hoặc đổi Đơn hàng mà không kiểm tra quyền. Validates FR-4, FR-8.
- **SM-5:** Số lượt Khách hàng hỏi "đơn đâu" giảm so với số nền. Nguồn đếm là sổ ghi tay của Quản lý cho cuộc gọi và tin nhắn; cần ghi số nền trong tuần đầu. `[ASSUMPTION]` Validates FR-1, FR-7.

**Counter-metrics (do not optimize)**

- **SM-C1:** Tỷ lệ đơn bị hủy do hết hàng không được tăng so với số nền của tuần đầu. Không đạt SM-2 bằng cách hủy đơn hàng loạt. Counterbalances SM-1, SM-2.
- **SM-C2:** Số lần Khách hàng thật bị chặn nhầm khi Tra đơn hoặc đặt đơn. Không siết giới hạn đến mức chặn người mua thật. Counterbalances FR-3, FR-20.

## 8. Open Questions

Không câu nào dưới đây chặn UX, kiến trúc hoặc chia story.

1. Giá trị thật của `SHOP_CONTACT_PHONE` là gì? Chủ shop trả lời trước khi phát hành.
2. Ai đối soát chuyển khoản và thời hạn hoàn tiền thực tế là bao lâu? Chủ shop trả lời trước khi có đơn thật.
3. Giả định 2 Nhân viên và 1 Quản lý có đúng không, và họ đang xử lý đơn thế nào? Chủ shop trả lời trước khi có đơn thật.
4. Các ngưỡng ở FR-3, FR-8 và FR-20 có phù hợp với lượng đơn thật không? Xem lại sau 4 tuần có đơn thật.
5. Khi triển khai, ứng dụng đứng sau proxy nào? Quyết định ở bước triển khai; trước đó dùng địa chỉ kết nối.
6. Đã từng có sự cố mất tiền thật chưa? Chủ shop trả lời để xác nhận mức ưu tiên của tính năng.
7. (Ràng buộc khóa học) Bài 4.4 ghi "không thêm database", trong khi dự án dùng PostgreSQL theo quyết định của landv. landv cần báo giảng viên nếu bài bị chấm theo ràng buộc đó.

## 9. Assumptions Index

landv đã xác nhận các mặc định về ngưỡng, thời hạn, route, dữ liệu ẩn với Khách hàng, quyền xem của Nhân viên và thao tác đánh dấu hoàn tiền. Các mục vẫn được giữ ở đây vì chưa có dữ liệu thật.

- §2.3: UJ-1, UJ-2, UJ-3 do coach viết nháp.
- FR-3: 5 lần sai theo IP và Mã đơn; 20 lần sai mỗi IP; cùng trong 15 phút.
- FR-5: Quyền xem đơn hiệu lực 7 ngày.
- FR-7: Khách hàng không thấy tên Nhân viên, lý do nội bộ hoặc mốc Đã giao đã bị sửa.
- FR-8: phiên đăng nhập 8 giờ; chặn tạm sau 5 lần đăng nhập sai trong 15 phút.
- FR-9: mọi Nhân viên được xem tên, số điện thoại và địa chỉ; Hàng đợi không phân trang.
- FR-20: 10 đơn mỗi IP trong 1 giờ; 3 đơn Chờ xác nhận mỗi số điện thoại.
- FR-21: Quản lý kiêm chủ shop đánh dấu đã xử lý, đối soát sao kê và hoàn tay trong 3 ngày làm việc, không thu phí.
- §7: đo trong 4 tuần khi có đơn thật; SM-1 dưới 5%; SM-5 đếm bằng sổ ghi tay và lấy số nền trong tuần đầu.
- Từ brief: 2 Nhân viên và 1 Quản lý kiêm chủ shop.
