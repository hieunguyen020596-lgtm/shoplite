# wishlist Specification

## Purpose
Cung cấp khả năng lưu trữ và quản lý danh sách sản phẩm yêu thích (wishlist) cho khách hàng ngay trên trình duyệt mà không cần đăng nhập, hỗ trợ đồng bộ đa tab và bảo đảm dữ liệu giá/tồn kho luôn cập nhật mới nhất.

## Requirements

### Requirement: Toggle sản phẩm yêu thích
The system SHALL cho phép khách hàng thêm hoặc xóa một sản phẩm khỏi danh sách yêu thích bằng nút bấm trái tim trên thẻ sản phẩm và trang chi tiết sản phẩm.

#### Scenario: Thêm sản phẩm chưa có vào danh sách
- **WHEN** khách hàng bấm nút trái tim của một sản phẩm chưa nằm trong danh sách yêu thích
- **THEN** mã định danh của sản phẩm được lưu vào danh sách yêu thích
- **AND** nút trái tim chuyển sang trạng thái đã thích với thuộc tính aria-pressed="true"

#### Scenario: Bỏ thích sản phẩm đã có trong danh sách
- **WHEN** khách hàng bấm nút trái tim của một sản phẩm đã có trong danh sách yêu thích
- **THEN** mã định danh của sản phẩm bị xóa khỏi danh sách yêu thích
- **AND** nút trái tim chuyển về trạng thái chưa thích với thuộc tính aria-pressed="false"

#### Scenario: Danh sách đã đạt giới hạn tối đa 50 sản phẩm
- **WHEN** khách hàng bấm thích thêm sản phẩm khi danh sách đã có đủ 50 sản phẩm
- **THEN** hệ thống không thêm sản phẩm mới vào danh sách
- **AND** hệ thống hiển thị thông báo danh sách yêu thích đã đầy tối đa 50 sản phẩm

### Requirement: Biểu tượng và huy hiệu yêu thích trên Header
The system SHALL hiển thị biểu tượng trái tim kèm huy hiệu số lượng sản phẩm yêu thích trên thanh điều hướng đầu trang (Header).

#### Scenario: Danh sách yêu thích đang rỗng
- **WHEN** danh sách yêu thích chưa có sản phẩm nào
- **THEN** biểu tượng trái tim trên Header không hiển thị số đếm huy hiệu

#### Scenario: Danh sách yêu thích có sản phẩm
- **WHEN** danh sách yêu thích có từ 1 đến 50 sản phẩm
- **THEN** huy hiệu trên Header hiển thị chính xác tổng số sản phẩm đã thích

#### Scenario: Nhấp vào biểu tượng yêu thích trên Header
- **WHEN** khách hàng nhấp vào biểu tượng trái tim trên Header
- **THEN** hệ thống điều hướng người dùng tới trang /wishlist

### Requirement: Trang hiển thị danh sách yêu thích
The system SHALL cung cấp trang /wishlist hiển thị toàn bộ sản phẩm đã thích với dữ liệu giá và tồn kho mới nhất từ danh mục.

#### Scenario: Hiển thị các sản phẩm đã lưu
- **WHEN** khách hàng truy cập trang /wishlist và danh sách có sản phẩm
- **THEN** hệ thống hiển thị danh sách sản phẩm với hình ảnh, tên, giá bán và tình trạng tồn kho cập nhật từ catalog
- **AND** mỗi dòng sản phẩm có nút xóa khỏi yêu thích và nút thêm vào giỏ hàng

#### Scenario: Thêm sản phẩm còn hàng vào giỏ từ trang yêu thích
- **WHEN** khách hàng bấm nút "Thêm vào giỏ" của một sản phẩm còn hàng trên trang /wishlist
- **THEN** sản phẩm được thêm vào giỏ hàng với số lượng 1
- **AND** huy hiệu giỏ hàng trên Header tăng thêm 1

#### Scenario: Sản phẩm trong danh sách đã hết hàng
- **WHEN** một sản phẩm trong danh sách yêu thích có số lượng tồn kho bằng 0
- **THEN** hệ thống hiển thị nhãn "Hết hàng" tại dòng sản phẩm đó
- **AND** nút "Thêm vào giỏ" bị vô hiệu hóa

#### Scenario: Danh sách yêu thích không có sản phẩm
- **WHEN** khách hàng truy cập trang /wishlist khi chưa lưu sản phẩm nào hoặc đã xóa hết
- **THEN** hệ thống hiển thị khối thông báo rỗng thân thiện kèm liên kết mời khám phá sản phẩm

### Requirement: Lưu trữ trình duyệt và đồng bộ dữ liệu
The system SHALL lưu trữ danh sách yêu thích trong localStorage của trình duyệt và tự động đồng bộ giữa các tab đang mở.

#### Scenario: Lưu trữ và duy trì khi tải lại trang
- **WHEN** khách hàng thực hiện thay đổi danh sách yêu thích và tải lại trang trình duyệt
- **THEN** danh sách sản phẩm yêu thích và trạng thái các nút trái tim vẫn giữ nguyên

#### Scenario: Đồng bộ tức thì giữa các tab trình duyệt
- **WHEN** khách hàng thêm hoặc xóa sản phẩm yêu thích ở tab trình duyệt thứ nhất
- **THEN** tab trình duyệt thứ hai tự động cập nhật số lượng trên Header và danh sách hiển thị mà không cần tải lại

#### Scenario: Dữ liệu localStorage bị hỏng hoặc chứa mã sản phẩm không hợp lệ
- **WHEN** dữ liệu trong localStorage bị lỗi định dạng hoặc chứa id sản phẩm không còn tồn tại trong catalog
- **THEN** hệ thống tự động lọc bỏ các mã không hợp lệ, không gây crash ứng dụng và hiển thị các sản phẩm hợp lệ còn lại
