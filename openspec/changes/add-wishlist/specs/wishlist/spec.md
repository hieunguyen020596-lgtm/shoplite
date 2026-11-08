## ADDED Requirements

### Requirement: Toggle sản phẩm yêu thích

The system SHALL cho phép khách thêm hoặc bỏ một sản phẩm khỏi danh sách yêu thích bằng nút trái tim trên thẻ sản phẩm và trên trang chi tiết sản phẩm. Nút MUST thể hiện trạng thái "đã thích" bằng hình ảnh và bằng thuộc tính đọc được bởi screen reader.

#### Scenario: Thêm sản phẩm chưa có

- **WHEN** khách bấm nút trái tim của sản phẩm chưa có trong danh sách
- **THEN** sản phẩm được thêm vào danh sách
- **AND** nút chuyển sang trạng thái đã thích (`aria-pressed="true"`) và nhãn đọc được cập nhật

#### Scenario: Bỏ sản phẩm đã thích

- **WHEN** khách bấm nút trái tim của sản phẩm đã có trong danh sách
- **THEN** sản phẩm bị bỏ khỏi danh sách
- **AND** nút trở về trạng thái chưa thích (`aria-pressed="false"`)

#### Scenario: Danh sách đã đủ 50 sản phẩm

- **WHEN** khách thích thêm một sản phẩm khi danh sách đã có 50 sản phẩm
- **THEN** sản phẩm không được thêm
- **AND** khách nhận thông báo danh sách đã đầy

#### Scenario: Bỏ thích khi danh sách đã đầy

- **WHEN** danh sách có 50 sản phẩm và khách bấm trái tim của một sản phẩm đã có trong đó
- **THEN** sản phẩm được bỏ khỏi danh sách bình thường

### Requirement: Huy hiệu số lượng trên header

The system SHALL hiển thị biểu tượng trái tim trên header, kèm số lượng sản phẩm yêu thích khi số lượng lớn hơn 0; bấm vào MUST mở trang `/wishlist`.

#### Scenario: Có sản phẩm yêu thích

- **WHEN** danh sách có 3 sản phẩm
- **THEN** header hiển thị số 3 cạnh biểu tượng trái tim
- **AND** nhãn đọc được của liên kết nêu số lượng

#### Scenario: Danh sách trống

- **WHEN** danh sách không có sản phẩm nào
- **THEN** header chỉ hiển thị biểu tượng trái tim, không có số

#### Scenario: Số lượng lớn

- **WHEN** danh sách có 50 sản phẩm
- **THEN** số hiển thị là 50, không bị cắt hay tràn khỏi huy hiệu

### Requirement: Trang danh sách yêu thích

The system SHALL cung cấp trang `/wishlist` liệt kê các sản phẩm đã thích, hiển thị giá và tồn kho hiện tại của catalog, mỗi sản phẩm có nút bỏ thích và nút thêm vào giỏ.

#### Scenario: Có sản phẩm

- **WHEN** khách mở `/wishlist` khi danh sách có sản phẩm
- **THEN** mỗi sản phẩm hiển thị tên, ảnh, giá và tình trạng tồn kho theo dữ liệu catalog hiện tại
- **AND** khách bấm "Thêm vào giỏ" thì sản phẩm vào giỏ hàng và huy hiệu giỏ tăng

#### Scenario: Danh sách trống

- **WHEN** khách mở `/wishlist` khi danh sách trống
- **THEN** trang hiển thị trạng thái trống với lời mời khám phá sản phẩm và liên kết tới `/products`

#### Scenario: Bỏ thích ngay trên trang

- **WHEN** khách bấm nút bỏ thích của một sản phẩm trên `/wishlist`
- **THEN** sản phẩm biến mất khỏi trang và số trên header giảm tương ứng

#### Scenario: Tải trang lần đầu

- **WHEN** trang được tải và dữ liệu trình duyệt chưa đọc xong
- **THEN** trang không hiển thị trạng thái trống sai lệch mà hiển thị trạng thái chờ cho tới khi đọc xong

### Requirement: Sản phẩm hết hàng

The system SHALL giữ sản phẩm hết hàng trong danh sách yêu thích, hiển thị "Hết hàng" và MUST NOT cho thêm sản phẩm đó vào giỏ.

#### Scenario: Thích sản phẩm hết hàng

- **WHEN** khách thích một sản phẩm có tồn kho bằng 0
- **THEN** sản phẩm nằm trong danh sách và hiển thị "Hết hàng"
- **AND** nút thêm vào giỏ bị vô hiệu

#### Scenario: Sản phẩm có hàng trở lại

- **WHEN** tồn kho của sản phẩm trong danh sách lớn hơn 0 ở dữ liệu catalog hiện tại
- **THEN** nút thêm vào giỏ hoạt động bình thường theo giới hạn của giỏ hàng

### Requirement: Lưu trữ và đồng bộ giữa các tab

The system SHALL lưu danh sách yêu thích trên trình duyệt của khách, không cần đăng nhập, giữ nguyên sau khi tải lại trang và đồng bộ giữa các tab đang mở. Hệ thống MUST chỉ lưu mã sản phẩm, không lưu giá hay tồn kho.

#### Scenario: Tải lại trang

- **WHEN** khách thích 3 sản phẩm rồi tải lại trang
- **THEN** danh sách vẫn còn 3 sản phẩm

#### Scenario: Đồng bộ giữa tab

- **WHEN** khách thích một sản phẩm ở tab 1 trong khi tab 2 đang mở
- **THEN** huy hiệu và trạng thái trái tim ở tab 2 được cập nhật mà không cần tải lại

#### Scenario: Trình duyệt chặn lưu trữ

- **WHEN** trình duyệt không cho ghi dữ liệu (ví dụ chế độ ẩn danh)
- **THEN** danh sách vẫn hoạt động trong phiên hiện tại và trang không lỗi

### Requirement: Chịu lỗi dữ liệu không hợp lệ

The system SHALL bỏ qua dữ liệu wishlist bị hỏng hoặc chứa mã sản phẩm không còn trong catalog, và MUST NOT làm hỏng trang.

#### Scenario: Dữ liệu không phải JSON hợp lệ

- **WHEN** giá trị lưu trên trình duyệt là chuỗi không phân tích được (ví dụ `abc`)
- **THEN** danh sách được coi là rỗng và trang vẫn hiển thị bình thường

#### Scenario: Sai cấu trúc

- **WHEN** giá trị lưu là JSON hợp lệ nhưng không đúng dạng danh sách mã sản phẩm
- **THEN** danh sách được coi là rỗng

#### Scenario: Mã sản phẩm không còn tồn tại

- **WHEN** danh sách chứa mã sản phẩm không có trong catalog
- **THEN** mã đó không hiển thị trên `/wishlist` và không được tính vào số trên header
