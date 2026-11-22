# Tiêu chí chấp nhận: Giỏ hàng & Thanh toán

Phạm vi: hai luồng khách hàng.

- **(A) Giỏ hàng và phí giao hàng**: mã `GH-*`
- **(B) Thanh toán và đơn hàng**: mã `DH-*`

Số liệu sản phẩm lấy từ dữ liệu mẫu của cửa hàng. Số tiền hiển thị theo định dạng `500.000 ₫`.

**Quy ước cột "Nguồn"**

| Nguồn     | Nghĩa                                                                     |
| --------- | ------------------------------------------------------------------------- |
| README    | Có trong mục "Quy tắc nghiệp vụ chính" của README.md                      |
| AGENTS.md | Có trong mục "Quy tắc nghiệp vụ không được phá vỡ" của AGENTS.md          |
| code      | Chỉ suy ra từ hành vi hiện tại của ứng dụng, chưa có tài liệu nào ghi lại |

> **Lưu ý về AGENTS.md:** nhánh `bmad/module4_NamttAcbs` (và `main`) **không có** file AGENTS.md.
> Cột "Nguồn" dùng bản AGENTS.md trên nhánh `origin/module3/DatNT` (commit `5eb3b7d`), mục 5
> "Quy tắc nghiệp vụ không được phá vỡ". Cần xác nhận bản đó vẫn còn hiệu lực cho nhánh này.

Câu chữ trên giao diện (thông báo, nhãn nút) luôn lấy từ ứng dụng hiện tại. Cột "Nguồn" nói về
**quy tắc nghiệp vụ** mà tiêu chí kiểm tra, không nói về câu chữ.

## Dữ liệu dùng trong tiêu chí

| Sản phẩm                       |        Giá | Tồn kho | Dùng cho         |
| ------------------------------ | ---------: | ------: | ---------------- |
| Bàn di chuột cỡ lớn DeskMat XL |   250.000₫ |     100 | GH-1, DH-2       |
| Chuột không dây SwiftClick     |   450.000₫ |      60 | GH-2, GH-4       |
| Micro thu âm PodCast USB       | 1.150.000₫ |       0 | GH-3             |
| Giá đỡ laptop nhôm             |   390.000₫ |       3 | GH-4             |
| Cáp USB-C bện dù 2m            |   150.000₫ |     200 | DH-1, DH-3, DH-4 |

---

## Bảng tổng hợp

| Mã   | Tiêu chí                                                         | Loại               | Nguồn                      |
| ---- | ---------------------------------------------------------------- | ------------------ | -------------------------- |
| GH-1 | Tạm tính đúng 500.000 ₫ thì miễn phí giao hàng tiêu chuẩn        | Biên (đúng ngưỡng) | README, AGENTS.md          |
| GH-2 | Tạm tính dưới 500.000 ₫ thì tính phí 30.000 ₫ và gợi ý mua thêm  | Thường             | README, AGENTS.md          |
| GH-3 | Không thêm được sản phẩm hết hàng vào giỏ                        | Từ chối            | README                     |
| GH-4 | Số lượng mỗi sản phẩm không vượt tồn kho và không vượt 10        | Biên (đúng ngưỡng) | README, AGENTS.md          |
| DH-1 | Đặt hàng thành công thì thấy trang đơn "Chờ xác nhận", giỏ trống | Thường             | README, AGENTS.md          |
| DH-2 | Đơn đã đặt giữ đúng ngưỡng miễn phí theo phương thức giao        | Biên (đúng ngưỡng) | README, AGENTS.md          |
| DH-3 | Form thanh toán sai thông tin thì không tạo đơn                  | Từ chối            | code ⚠️ CẦN NGƯỜI XÁC NHẬN |
| DH-4 | Chỉ hủy được đơn đang "Chờ xác nhận"                             | Từ chối            | README, AGENTS.md          |

---

## (A) Giỏ hàng và phí giao hàng

### GH-1: Tạm tính đúng 500.000 ₫ thì miễn phí giao hàng tiêu chuẩn _(biên, đúng ngưỡng)_

**Nguồn:** README, AGENTS.md

- **Cho** giỏ hàng có 2 × "Bàn di chuột cỡ lớn DeskMat XL" (250.000 ₫), tạm tính đúng 500.000 ₫
- **Khi** khách mở trang Giỏ hàng
- **Thì**
  - khung gợi ý hiện "Đơn hàng của bạn được miễn phí giao hàng tiêu chuẩn 🎉", thanh tiến độ đầy
  - dòng "Phí giao hàng (tiêu chuẩn)" hiện "Miễn phí"
  - "Tổng cộng" là **500.000 ₫**
- **Và khi** khách sang trang Thanh toán rồi chọn "Giao hàng nhanh"
- **Thì** "Phí giao hàng" đổi thành **60.000 ₫** và "Tổng thanh toán" là **560.000 ₫**, vì giao
  nhanh không bao giờ được miễn phí

### GH-2: Tạm tính dưới 500.000 ₫ thì tính phí 30.000 ₫ và gợi ý mua thêm

**Nguồn:** README, AGENTS.md (câu gợi ý "Mua thêm…" chỉ có trong code)

- **Cho** giỏ hàng có 1 × "Chuột không dây SwiftClick" (450.000 ₫)
- **Khi** khách mở trang Giỏ hàng
- **Thì**
  - khung gợi ý hiện "Mua thêm 50.000 ₫ để được miễn phí giao hàng"
  - "Phí giao hàng (tiêu chuẩn)" là **30.000 ₫**
  - "Tổng cộng" là **480.000 ₫**
- **Và khi** khách tăng số lượng lên 2 (tạm tính 900.000 ₫)
- **Thì** phí giao hàng đổi thành "Miễn phí" và "Tổng cộng" là **900.000 ₫**

### GH-3: Không thêm được sản phẩm hết hàng vào giỏ _(từ chối)_

**Nguồn:** README

- **Cho** "Micro thu âm PodCast USB" có tồn kho 0
- **Khi** khách xem sản phẩm này ở trang danh sách và ở trang chi tiết
- **Thì**
  - ở trang danh sách, nút của sản phẩm ghi "Hết hàng" và không bấm được
  - ở trang chi tiết, khách thấy "Sản phẩm tạm hết hàng. Vui lòng quay lại sau.", không có ô chọn
    số lượng, không có nút "Thêm vào giỏ" hay "Mua ngay"
  - số trên biểu tượng giỏ hàng ở đầu trang không thay đổi

### GH-4: Số lượng mỗi sản phẩm không vượt tồn kho và không vượt 10 _(biên, đúng ngưỡng)_

**Nguồn:** README, AGENTS.md

- **Cho** sản phẩm trong bảng dưới
- **Khi** khách thêm sản phẩm vào giỏ đến đúng số lượng tối đa
- **Thì**
  - nút "Thêm vào giỏ" đổi thành "Tối đa" và không bấm được
  - ở trang chi tiết hiện "Bạn đã có số lượng tối đa của sản phẩm này trong giỏ." và nút "Mua
    ngay" không bấm được
  - trong giỏ, nút "Tăng số lượng" của dòng đó không bấm được, số lượng dừng ở mức tối đa

| Sản phẩm                   | Tồn kho | Tối đa trong giỏ | Giới hạn bởi           | Tạm tính khi đạt tối đa |
| -------------------------- | ------: | ---------------: | ---------------------- | ----------------------: |
| Giá đỡ laptop nhôm         |       3 |                3 | tồn kho                |             1.170.000 ₫ |
| Chuột không dây SwiftClick |      60 |               10 | tối đa 10 mỗi sản phẩm |             4.500.000 ₫ |

---

## (B) Thanh toán và đơn hàng

### DH-1: Đặt hàng thành công thì thấy trang đơn "Chờ xác nhận", giỏ trống

**Nguồn:** README, AGENTS.md (giá và tổng do cửa hàng tự tính). Màn hình sau khi đặt là theo code.

- **Cho** giỏ hàng có 2 × "Cáp USB-C bện dù 2m" (150.000 ₫), trang Thanh toán hiện tạm tính
  300.000 ₫, phí giao hàng 30.000 ₫, tổng thanh toán 330.000 ₫
- **Khi** khách nhập Họ và tên "Nguyễn Văn A", Số điện thoại "0912345678", Địa chỉ giao hàng
  "12 Nguyễn Huệ, Quận 1, TP.HCM", giữ "Giao hàng tiêu chuẩn" và "Thanh toán khi nhận hàng (COD)",
  rồi bấm "Đặt hàng"
- **Thì**
  - khách được chuyển tới trang đơn hàng, thấy "Đặt hàng thành công!" kèm lời cảm ơn có tên
    "Nguyễn Văn A" và số "0912345678"
  - tiêu đề hiện mã đơn dạng `SL-YYYYMMDD-XXXXXX` và nhãn trạng thái "Chờ xác nhận"
  - phần Sản phẩm hiện "150.000 ₫ × 2", tạm tính 300.000 ₫, phí giao hàng 30.000 ₫, tổng cộng
    **330.000 ₫**
  - biểu tượng giỏ hàng không còn số, trang Giỏ hàng hiện "Giỏ hàng của bạn đang trống"
  - đơn mới xuất hiện ở trang "Đơn hàng của bạn"

### DH-2: Đơn đã đặt giữ đúng ngưỡng miễn phí theo phương thức giao _(biên, đúng ngưỡng)_

**Nguồn:** README, AGENTS.md

- **Cho** giỏ hàng có 2 × "Bàn di chuột cỡ lớn DeskMat XL" (tạm tính đúng 500.000 ₫)
- **Khi** khách đặt hàng với phương thức giao trong bảng dưới
- **Thì** trang đơn hàng vừa tạo hiện phí giao hàng và tổng cộng đúng như bảng, khớp với số đã
  thấy ở trang Thanh toán trước khi bấm "Đặt hàng"

| Phương thức giao     | Phí giao hàng | Tổng cộng |
| -------------------- | ------------- | --------- |
| Giao hàng tiêu chuẩn | Miễn phí      | 500.000 ₫ |
| Giao hàng nhanh      | 60.000 ₫      | 560.000 ₫ |

### DH-3: Form thanh toán sai thông tin thì không tạo đơn _(từ chối)_

**Nguồn:** code. ⚠️ **CẦN NGƯỜI XÁC NHẬN**: README và AGENTS.md không ghi quy tắc nhập liệu
(độ dài họ tên/địa chỉ, đầu số điện thoại hợp lệ).

- **Cho** giỏ hàng có 1 × "Cáp USB-C bện dù 2m"
- **Khi** khách để trống Họ và tên, nhập Số điện thoại "0212345678", nhập Địa chỉ "Q1" rồi bấm
  "Đặt hàng"
- **Thì**
  - khách vẫn ở trang Thanh toán, không có đơn nào được tạo
  - dưới từng ô hiện lỗi: "Họ tên phải có ít nhất 2 ký tự", "Số điện thoại không hợp lệ (ví dụ:
    0912345678)", "Địa chỉ phải có ít nhất 10 ký tự"
  - giỏ hàng vẫn còn nguyên sản phẩm
- **Và khi** khách sửa lại ô có lỗi
- **Thì** dòng lỗi của ô đó biến mất ngay khi khách gõ

### DH-4: Chỉ hủy được đơn đang "Chờ xác nhận" _(từ chối)_

**Nguồn:** README, AGENTS.md. Bước hỏi lại "Bạn chắc chắn…" và việc chỉ thiết bị đã đặt hoặc đã
xác minh mới thấy nút hủy là theo code.

- **Cho** khách vừa đặt một đơn 1 × "Cáp USB-C bện dù 2m" trên chính thiết bị này, đơn đang ở
  trạng thái trong bảng dưới
- **Khi** khách mở trang chi tiết đơn
- **Thì** kết quả như bảng

| Trạng thái đơn | Khách thấy                                                                                                                                                                          |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chờ xác nhận   | Có nút "Hủy đơn hàng". Bấm vào thì hiện "Bạn chắc chắn muốn hủy đơn hàng này?". Bấm "Xác nhận hủy" thì nhãn đổi thành "Đã hủy" và nút hủy biến mất. Bấm "Không" thì đơn giữ nguyên. |
| Đã xác nhận    | Không có nút "Hủy đơn hàng".                                                                                                                                                        |
| Đã hủy         | Không có nút "Hủy đơn hàng".                                                                                                                                                        |

- **Và cho** khách đang mở trang đơn "Chờ xác nhận" thì nhân viên chuyển đơn sang "Đã xác nhận"
- **Khi** khách bấm "Hủy đơn hàng" rồi "Xác nhận hủy"
- **Thì** hiện "Chỉ có thể hủy đơn hàng đang ở trạng thái Chờ xác nhận" và đơn không bị hủy

---

## Cố ý không đưa vào E2E

Những quy tắc sau vẫn cần kiểm tra nhưng không làm qua trình duyệt. Lý do: khách không tự tạo
được tình huống đó bằng giao diện, hoặc có quá nhiều tổ hợp để chạy E2E, hoặc tầng dưới kiểm tra
nhanh và chắc hơn.

| Quy tắc / tình huống                                                                                  | Lý do không làm E2E                                         | Tầng lo                                                       |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------- |
| Cửa hàng tự tính lại giá, **không tin giá/tổng/phí** client gửi lên (README)                          | Giao diện không cho sửa giá, phải gửi yêu cầu giả mạo       | Test API tạo đơn (route handler) + unit test dịch vụ đơn hàng |
| Tồn kho giảm giữa lúc thêm vào giỏ và lúc đặt → "Sản phẩm … chỉ còn N sản phẩm" / "… đã hết hàng"     | Dữ liệu sản phẩm là cố định, không dựng được bằng giao diện | Unit test dịch vụ đơn hàng (giả lập dữ liệu sản phẩm)         |
| Mã sản phẩm không tồn tại, số lượng > 10 hoặc < 1 trong yêu cầu đặt hàng, gộp các dòng trùng sản phẩm | Chỉ xảy ra khi gửi yêu cầu trực tiếp                        | Test API tạo đơn + unit test dịch vụ đơn hàng                 |
| Mọi ngưỡng nhập liệu: họ tên 2/50 ký tự, địa chỉ 10/200, ghi chú 200, email, các đầu số và dạng `+84` | Nhiều tổ hợp; DH-3 đã phủ đường đi chính                    | Unit test schema thanh toán                                   |
| Công thức phí: tạm tính 0 → phí 0, số tiền còn thiếu để miễn phí, ngưỡng 499.999 / 500.000 / 500.001  | Giá mẫu không tạo được mọi mốc; công thức thuần             | Unit test quy tắc tính tiền                                   |
| Chặn số lượng khi gõ tay số âm, số thập phân, chữ                                                     | Chi tiết của ô nhập, nhiều tổ hợp                           | Unit test xử lý giỏ hàng + component test ô số lượng          |
| Hủy đơn qua API khi không còn "Chờ xác nhận"; API hủy chỉ nhận trạng thái "cancelled"                 | DH-4 đã phủ phần khách thấy; phần còn lại là hợp đồng API   | Test API đơn hàng + unit test dịch vụ đơn hàng                |
| Mất kết nối khi đặt hàng/hủy đơn ("Không kết nối được máy chủ…"), lỗi lạ từ máy chủ                   | Phải giả lập lỗi mạng                                       | Component test form thanh toán / nút hủy (giả lập fetch)      |
| Biểu tượng giỏ hiện "99+", giỏ còn nguyên sau khi tải lại trang                                       | Hiển thị/lưu trữ cục bộ, không phải quy tắc nghiệp vụ       | Component test biểu tượng giỏ + unit test kho giỏ hàng        |
| Xem đơn từ máy khác: che số điện thoại, xác minh bằng SĐT, khóa 15 phút sau nhiều lần thử sai         | Ngoài phạm vi hai luồng này; cần tài liệu riêng             | Unit test + test API xác minh đơn                             |
| Màu nhãn trạng thái đơn                                                                               | Chỉ là giao diện                                            | Component test / kiểm tra bằng mắt                            |
