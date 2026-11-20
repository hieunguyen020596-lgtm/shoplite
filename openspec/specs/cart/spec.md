# cart Specification

## Purpose
Giỏ hàng phía trình duyệt cho phép khách gom sản phẩm định mua (không cần đăng nhập) trước khi thanh toán, với số lượng luôn nằm trong giới hạn cho phép và gợi ý để được miễn phí giao hàng.

## Requirements

### Requirement: Thêm sản phẩm vào giỏ

The system SHALL cho phép khách thêm một sản phẩm còn hàng vào giỏ với số lượng chọn được. Thêm lại sản phẩm đã có trong giỏ MUST cộng dồn vào dòng hiện có thay vì tạo dòng mới.

#### Scenario: Thêm sản phẩm mới

- **WHEN** khách thêm 2 đơn vị một sản phẩm chưa có trong giỏ
- **THEN** giỏ có một dòng mới cho sản phẩm đó với số lượng 2

#### Scenario: Thêm lại sản phẩm đã có

- **WHEN** giỏ đã có 1 đơn vị sản phẩm A và khách thêm 2 đơn vị sản phẩm A
- **THEN** giỏ vẫn chỉ có một dòng cho A với số lượng 3

### Requirement: Giới hạn số lượng mỗi sản phẩm

The system SHALL giới hạn số lượng mỗi sản phẩm trong giỏ không vượt quá giá trị nhỏ hơn giữa 10 và tồn kho của sản phẩm. Thêm hoặc cập nhật vượt giới hạn MUST bị kẹp về giới hạn; số lượng MUST NOT nhỏ hơn 1.

#### Scenario: Vượt giới hạn 10 sản phẩm

- **WHEN** khách thêm tổng cộng hơn 10 đơn vị một sản phẩm có tồn kho lớn hơn 10
- **THEN** số lượng trong giỏ dừng ở 10

#### Scenario: Vượt tồn kho

- **WHEN** khách thêm nhiều hơn số tồn kho (nhỏ hơn 10) của một sản phẩm
- **THEN** số lượng trong giỏ bằng đúng số tồn kho

#### Scenario: Cập nhật số lượng ngoài khoảng cho phép

- **WHEN** khách đặt số lượng một dòng về 0 hoặc lớn hơn giới hạn
- **THEN** số lượng được kẹp về khoảng từ 1 tới giới hạn của sản phẩm

### Requirement: Sản phẩm hết hàng

The system SHALL NOT cho thêm sản phẩm có tồn kho bằng 0 vào giỏ; nút mua của sản phẩm đó MUST hiển thị "Hết hàng" và bị vô hiệu hóa.

#### Scenario: Thêm sản phẩm hết hàng

- **WHEN** có yêu cầu thêm một sản phẩm tồn kho bằng 0 vào giỏ
- **THEN** giỏ hàng không thay đổi

#### Scenario: Nút mua của sản phẩm hết hàng

- **WHEN** khách xem thẻ một sản phẩm hết hàng
- **THEN** nút mua hiển thị "Hết hàng" và không bấm được

### Requirement: Cập nhật và xóa sản phẩm trong giỏ

The system SHALL cho phép khách thay đổi số lượng, xóa từng sản phẩm hoặc xóa toàn bộ giỏ; tạm tính và tổng tiền MUST cập nhật ngay theo giỏ mới.

#### Scenario: Tăng số lượng

- **WHEN** khách tăng số lượng một dòng từ 1 lên 2
- **THEN** tạm tính và tổng tiền được tính lại theo số lượng mới

#### Scenario: Xóa một sản phẩm

- **WHEN** khách xóa một sản phẩm khỏi giỏ có hai sản phẩm
- **THEN** giỏ chỉ còn sản phẩm còn lại

#### Scenario: Giỏ hàng trống

- **WHEN** khách mở trang giỏ hàng khi giỏ không có sản phẩm
- **THEN** trang hiển thị trạng thái "Giỏ hàng của bạn đang trống" với lời mời mua sắm

### Requirement: Lưu giỏ hàng trên trình duyệt

The system SHALL lưu giỏ hàng trên trình duyệt sau mỗi thay đổi để giữ nguyên khi tải lại trang. Dữ liệu đã lưu bị hỏng MUST được bỏ qua (coi như giỏ trống) mà không làm crash trang.

#### Scenario: Tải lại trang

- **WHEN** khách thêm sản phẩm rồi tải lại trang
- **THEN** giỏ hàng vẫn còn sản phẩm với đúng số lượng

#### Scenario: Dữ liệu đã lưu bị hỏng

- **WHEN** dữ liệu giỏ hàng đã lưu không phải JSON hợp lệ
- **THEN** giỏ hàng được coi là trống và trang không bị lỗi

### Requirement: Đồng bộ giỏ hàng giữa các tab

The system SHALL cập nhật giỏ hàng ở các tab khác đang mở trên cùng trình duyệt khi giỏ thay đổi ở một tab, và MUST bỏ qua thay đổi lưu trữ không liên quan tới giỏ hàng.

#### Scenario: Thêm sản phẩm ở tab khác

- **WHEN** giỏ hàng được thay đổi ở tab khác
- **THEN** tab hiện tại đọc lại giỏ hàng mới và cập nhật giao diện mà không cần tải lại

#### Scenario: Thay đổi lưu trữ không liên quan

- **WHEN** một dữ liệu khác (không phải giỏ hàng) thay đổi ở tab khác
- **THEN** giỏ hàng ở tab hiện tại không bị đọc lại

### Requirement: Gợi ý miễn phí giao hàng

The system SHALL hiển thị trong tóm tắt giỏ hàng số tiền còn thiếu để được miễn phí giao hàng tiêu chuẩn khi tạm tính dưới ngưỡng 500.000đ, và MUST thông báo đơn đã được miễn phí giao hàng khi tạm tính đạt hoặc vượt ngưỡng.

#### Scenario: Dưới ngưỡng

- **WHEN** tạm tính là 150.000đ
- **THEN** tóm tắt hiển thị "Mua thêm 350.000đ để được miễn phí giao hàng" và phí giao hàng tiêu chuẩn được cộng vào tổng

#### Scenario: Đạt đúng ngưỡng

- **WHEN** tạm tính bằng đúng 500.000đ
- **THEN** tóm tắt thông báo đơn được miễn phí giao hàng tiêu chuẩn và tổng tiền bằng tạm tính
