# Spec Delta

## Purpose

Cho phép khách lưu lại các sản phẩm muốn xem lại hoặc mua sau ngay trên trình duyệt, không cần đăng nhập, tách biệt với giỏ hàng.

## ADDED Requirements

### Requirement: Toggle sản phẩm yêu thích

The system SHALL hiển thị nút trái tim trên mỗi thẻ sản phẩm và ở trang chi tiết sản phẩm; bấm nút khi sản phẩm chưa có trong danh sách thì thêm vào, khi đã có thì bỏ ra.

#### Scenario: Thêm sản phẩm chưa có

- **WHEN** khách bấm nút trái tim của một sản phẩm chưa có trong danh sách yêu thích
- **THEN** sản phẩm được thêm vào cuối danh sách yêu thích
- **AND** nút chuyển sang trạng thái đã thích

#### Scenario: Bỏ sản phẩm đã có

- **WHEN** khách bấm nút trái tim của một sản phẩm đã có trong danh sách
- **THEN** sản phẩm bị bỏ khỏi danh sách
- **AND** nút trở về trạng thái chưa thích

#### Scenario: Thích sản phẩm hết hàng

- **WHEN** khách bấm nút trái tim của một sản phẩm có tồn kho bằng 0
- **THEN** sản phẩm vẫn được thêm vào danh sách yêu thích

#### Scenario: Toggle ở thẻ sản phẩm không mở trang chi tiết

- **WHEN** khách bấm nút trái tim trên thẻ sản phẩm trong lưới sản phẩm
- **THEN** trạng thái yêu thích thay đổi
- **AND** trình duyệt vẫn ở trang hiện tại, không điều hướng tới trang chi tiết

### Requirement: Trạng thái nút trái tim truy cập được

The system MUST thể hiện trạng thái đã thích / chưa thích của nút trái tim bằng cả hình ảnh (trái tim tô đầy hay rỗng) lẫn thuộc tính trợ năng (`aria-pressed` và nhãn tiếng Việt nêu tên sản phẩm), và nút MUST thao tác được bằng bàn phím.

#### Scenario: Screen reader đọc trạng thái

- **WHEN** sản phẩm "Bàn phím cơ KeyPro 75%" đang có trong danh sách yêu thích
- **THEN** nút trái tim của sản phẩm có `aria-pressed="true"` và nhãn cho biết bấm để bỏ "Bàn phím cơ KeyPro 75%" khỏi yêu thích

#### Scenario: Thao tác bằng bàn phím

- **WHEN** khách dùng phím Tab di chuyển tới nút trái tim và nhấn Enter hoặc Space
- **THEN** trạng thái yêu thích được toggle giống như khi bấm chuột

#### Scenario: Trước khi đọc xong dữ liệu trình duyệt

- **WHEN** trang được render lần đầu trên server hoặc trước khi dữ liệu yêu thích được đọc từ trình duyệt
- **THEN** nút trái tim hiển thị trạng thái chưa thích và không nháy sang trạng thái khác cho tới khi dữ liệu thật được nạp

### Requirement: Giới hạn số lượng danh sách yêu thích

The system MUST giới hạn danh sách yêu thích tối đa 50 sản phẩm; khi danh sách đã đủ 50, thao tác thích sản phẩm mới MUST bị từ chối và khách MUST nhận thông báo bằng tiếng Việt rằng danh sách đã đầy.

#### Scenario: Thêm sản phẩm thứ 50

- **WHEN** danh sách có 49 sản phẩm và khách thích thêm một sản phẩm khác
- **THEN** sản phẩm được thêm và danh sách có 50 sản phẩm

#### Scenario: Danh sách đã đủ 50 sản phẩm

- **WHEN** danh sách có 50 sản phẩm và khách bấm trái tim của một sản phẩm chưa có trong danh sách
- **THEN** sản phẩm không được thêm và danh sách vẫn có 50 sản phẩm
- **AND** khách nhận thông báo danh sách yêu thích đã đầy (được công bố cho screen reader)

#### Scenario: Bỏ thích khi danh sách đầy

- **WHEN** danh sách có 50 sản phẩm và khách bấm trái tim của một sản phẩm đã có
- **THEN** sản phẩm bị bỏ khỏi danh sách và danh sách còn 49 sản phẩm

### Requirement: Lưu danh sách yêu thích trên trình duyệt

The system SHALL lưu danh sách yêu thích trong bộ nhớ cục bộ của trình duyệt, tách biệt với giỏ hàng, chỉ gồm định danh sản phẩm theo thứ tự đã thích, và giữ nguyên danh sách khi khách tải lại trang mà không cần đăng nhập.

#### Scenario: Giữ danh sách khi tải lại trang

- **WHEN** khách thích 3 sản phẩm rồi tải lại trang
- **THEN** danh sách yêu thích vẫn có đúng 3 sản phẩm đó

#### Scenario: Không ảnh hưởng giỏ hàng

- **WHEN** khách thích hoặc bỏ thích một sản phẩm
- **THEN** nội dung giỏ hàng không thay đổi

#### Scenario: Bộ nhớ trình duyệt bị chặn

- **WHEN** trình duyệt không cho ghi bộ nhớ cục bộ (ví dụ chế độ ẩn danh hạn chế)
- **THEN** danh sách yêu thích vẫn hoạt động trong phiên hiện tại và trang không báo lỗi

### Requirement: Bỏ qua dữ liệu yêu thích không hợp lệ

The system MUST bỏ qua dữ liệu yêu thích đã lưu bị hỏng, sai định dạng, trùng lặp hoặc tham chiếu sản phẩm không còn trong catalog, mà không làm crash trang.

#### Scenario: Dữ liệu lưu không phải JSON hợp lệ

- **WHEN** giá trị yêu thích trong bộ nhớ trình duyệt là chuỗi `abc` và khách tải lại trang
- **THEN** trang hiển thị bình thường và danh sách yêu thích rỗng

#### Scenario: Dữ liệu chứa phần tử sai kiểu hoặc trùng

- **WHEN** dữ liệu lưu chứa cả định danh hợp lệ, giá trị không phải chuỗi và định danh lặp lại
- **THEN** chỉ các định danh hợp lệ được giữ lại, mỗi định danh một lần

#### Scenario: Sản phẩm không còn trong catalog

- **WHEN** danh sách yêu thích chứa định danh của sản phẩm không còn tồn tại trong catalog
- **THEN** sản phẩm đó không được hiển thị ở trang `/wishlist` và không được tính vào số lượng ở header

### Requirement: Đồng bộ danh sách yêu thích giữa các tab

The system SHALL cập nhật danh sách yêu thích (nút trái tim, badge header, trang `/wishlist`) ở mọi tab đang mở của cùng trình duyệt khi danh sách thay đổi ở một tab khác.

#### Scenario: Thích ở tab 1, tab 2 cập nhật

- **WHEN** khách mở 2 tab ShopLite và thích một sản phẩm ở tab 1
- **THEN** badge yêu thích ở tab 2 cập nhật số lượng mới mà không cần tải lại trang

#### Scenario: Tab khác ghi dữ liệu hỏng

- **WHEN** một tab khác ghi giá trị yêu thích không hợp lệ
- **THEN** tab hiện tại coi danh sách là rỗng và không crash

### Requirement: Biểu tượng yêu thích ở header

The system SHALL hiển thị ở header một liên kết hình trái tim tới trang `/wishlist`, kèm số lượng sản phẩm yêu thích còn trong catalog khi số này lớn hơn 0, với nhãn trợ năng tiếng Việt nêu số lượng.

#### Scenario: Có sản phẩm yêu thích

- **WHEN** danh sách yêu thích có 2 sản phẩm còn trong catalog
- **THEN** header hiển thị số 2 cạnh biểu tượng trái tim và nhãn trợ năng nêu "2 sản phẩm"

#### Scenario: Danh sách rỗng

- **WHEN** danh sách yêu thích rỗng
- **THEN** biểu tượng trái tim hiển thị không kèm số

#### Scenario: Bấm vào biểu tượng

- **WHEN** khách bấm biểu tượng trái tim ở header
- **THEN** trình duyệt mở trang `/wishlist`

#### Scenario: Màn hình hẹp

- **WHEN** khách xem trang ở chiều rộng 390px
- **THEN** header không bị vỡ bố cục và cả biểu tượng yêu thích lẫn giỏ hàng đều bấm được

### Requirement: Trang danh sách yêu thích

The system SHALL cung cấp trang `/wishlist` liệt kê các sản phẩm đã thích theo thứ tự đã thích, mỗi sản phẩm hiển thị tên (liên kết tới trang chi tiết), ảnh, giá và tình trạng tồn kho lấy từ catalog hiện tại, cùng nút bỏ thích và nút thêm vào giỏ.

#### Scenario: Hiển thị giá mới nhất

- **WHEN** giá của một sản phẩm trong catalog thay đổi sau khi khách đã thích sản phẩm đó
- **THEN** trang `/wishlist` hiển thị giá hiện tại trong catalog

#### Scenario: Bỏ thích ngay trên trang

- **WHEN** khách bấm nút bỏ thích của một sản phẩm trên trang `/wishlist`
- **THEN** sản phẩm biến mất khỏi trang và số lượng ở header giảm tương ứng

#### Scenario: Thêm vào giỏ từ trang yêu thích

- **WHEN** khách bấm "Thêm vào giỏ" của một sản phẩm còn hàng trên trang `/wishlist`
- **THEN** sản phẩm được thêm vào giỏ theo đúng quy tắc giỏ hàng hiện có (giới hạn số lượng và tồn kho)
- **AND** sản phẩm vẫn nằm trong danh sách yêu thích

#### Scenario: Sản phẩm đã đạt số lượng tối đa trong giỏ

- **WHEN** sản phẩm trên trang `/wishlist` đã có trong giỏ với số lượng tối đa cho phép
- **THEN** nút thêm vào giỏ bị vô hiệu hóa giống như ở thẻ sản phẩm

### Requirement: Sản phẩm hết hàng trong danh sách yêu thích

The system SHALL giữ sản phẩm hết hàng trong danh sách yêu thích, hiển thị nhãn "Hết hàng" trên trang `/wishlist` và MUST NOT cho phép thêm sản phẩm đó vào giỏ từ trang này.

#### Scenario: Sản phẩm hết hàng

- **WHEN** danh sách yêu thích chứa "Micro thu âm PodCast USB" có tồn kho bằng 0
- **THEN** trang `/wishlist` hiển thị sản phẩm kèm nhãn "Hết hàng"
- **AND** nút thêm vào giỏ của sản phẩm bị vô hiệu hóa

### Requirement: Trạng thái trống của trang yêu thích

The system SHALL hiển thị trạng thái trống bằng tiếng Việt kèm liên kết tới trang `/products` khi trang `/wishlist` không có sản phẩm nào để hiển thị.

#### Scenario: Chưa thích sản phẩm nào

- **WHEN** khách mở `/wishlist` khi danh sách yêu thích rỗng
- **THEN** trang hiển thị lời mời khám phá sản phẩm với liên kết tới `/products`

#### Scenario: Mọi sản phẩm đã thích đều không còn trong catalog

- **WHEN** danh sách yêu thích chỉ chứa định danh sản phẩm không còn tồn tại
- **THEN** trang `/wishlist` hiển thị trạng thái trống

#### Scenario: Trước khi đọc xong dữ liệu trình duyệt

- **WHEN** trang `/wishlist` đang render lần đầu, chưa đọc dữ liệu yêu thích từ trình duyệt
- **THEN** trang hiển thị trạng thái đang tải thay vì trạng thái trống
