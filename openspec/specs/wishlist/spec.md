# wishlist Specification

## Purpose
Cung cấp tính năng danh sách yêu thích phía client cho khách hàng lưu và quản lý các sản phẩm quan tâm trên trình duyệt mà không cần đăng nhập.

## Requirements

### Requirement: Toggle sản phẩm yêu thích

The system SHALL cho phép khách hàng thêm hoặc xóa một sản phẩm khỏi danh sách yêu thích bằng nút trái tim trên thẻ sản phẩm và trang chi tiết sản phẩm.

#### Scenario: Thêm sản phẩm chưa có vào danh sách

- **WHEN** khách bấm nút trái tim của sản phẩm chưa có trong danh sách yêu thích
- **THEN** sản phẩm được thêm vào danh sách yêu thích
- **AND** nút chuyển sang trạng thái đã thích với aria-pressed="true"

#### Scenario: Bỏ sản phẩm đã có khỏi danh sách

- **WHEN** khách bấm lại nút trái tim của sản phẩm đã có trong danh sách yêu thích
- **THEN** sản phẩm được xóa khỏi danh sách yêu thích
- **AND** nút chuyển sang trạng thái chưa thích với aria-pressed="false"

#### Scenario: Thêm khi danh sách đã đạt giới hạn tối đa 50 sản phẩm

- **WHEN** khách cố thêm sản phẩm mới khi danh sách yêu thích đã có đủ 50 sản phẩm
- **THEN** hệ thống không thêm sản phẩm mới vào danh sách
- **AND** hiển thị thông báo cho khách biết danh sách yêu thích đã đạt tối đa 50 sản phẩm

### Requirement: Lưu trữ và đồng bộ danh sách yêu thích

The system SHALL lưu trữ danh sách mã sản phẩm yêu thích trong localStorage và tự động đồng bộ giữa các tab trình duyệt khi có sự kiện thay đổi.

#### Scenario: Đồng bộ tức thì giữa các tab trình duyệt

- **WHEN** khách thêm hoặc xóa sản phẩm yêu thích ở tab 1
- **THEN** tab 2 tự động cập nhật số lượng và trạng thái yêu thích tương ứng mà không cần tải lại trang

#### Scenario: Khôi phục dữ liệu hợp lệ khi localStorage bị lỗi

- **WHEN** dữ liệu trong localStorage bị hỏng không đúng định dạng JSON hoặc chứa cấu trúc không hợp lệ
- **THEN** hệ thống tự động khởi tạo lại danh sách rỗng mà không gây lỗi crash trang ứng dụng

### Requirement: Hiển thị huy hiệu số lượng yêu thích trên thanh điều hướng

The system SHALL hiển thị biểu tượng trái tim kèm huy hiệu số lượng sản phẩm yêu thích trên Header khi số lượng lớn hơn 0 và hỗ trợ điều hướng tới trang /wishlist.

#### Scenario: Hiển thị số lượng sản phẩm yêu thích

- **WHEN** danh sách yêu thích có từ 1 sản phẩm trở lên và trang đã hydrate thành công
- **THEN** huy hiệu hiển thị đúng tổng số lượng sản phẩm yêu thích trên Header

#### Scenario: Ẩn huy hiệu khi danh sách rỗng hoặc chưa hydrate

- **WHEN** danh sách yêu thích rỗng hoặc giao diện đang trong quá trình render phía server
- **THEN** huy hiệu số lượng được ẩn để tránh sai lệch hiển thị

### Requirement: Trang danh sách yêu thích

The system SHALL cung cấp trang /wishlist hiển thị danh sách sản phẩm đã lưu với thông tin giá và tồn kho mới nhất từ catalog, cho phép xóa hoặc thêm vào giỏ hàng.

#### Scenario: Thêm sản phẩm còn hàng vào giỏ hàng từ trang wishlist

- **WHEN** khách bấm "Thêm vào giỏ" cho một sản phẩm còn hàng trên trang wishlist
- **THEN** sản phẩm được thêm vào giỏ hàng và huy hiệu giỏ hàng tăng số lượng tương ứng

#### Scenario: Sản phẩm trong danh sách đã hết hàng

- **WHEN** sản phẩm trong danh sách yêu thích có tồn kho bằng 0 trong catalog
- **THEN** sản phẩm hiển thị nhãn "Hết hàng" và nút "Thêm vào giỏ" bị vô hiệu hóa

#### Scenario: Sản phẩm bị xóa khỏi catalog hoặc không tồn tại

- **WHEN** mã sản phẩm trong danh sách yêu thích không còn tồn tại trong catalog
- **THEN** hệ thống bỏ qua sản phẩm đó mà không làm lỗi giao diện trang wishlist

#### Scenario: Hiển thị trạng thái rỗng khi chưa có sản phẩm

- **WHEN** khách truy cập trang /wishlist khi chưa lưu sản phẩm nào
- **THEN** hiển thị thông báo danh sách yêu thích đang trống kèm liên kết quay lại khám phá sản phẩm
