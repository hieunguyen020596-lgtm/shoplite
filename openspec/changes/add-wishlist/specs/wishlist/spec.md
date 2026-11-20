# Spec Delta

## Purpose

Cho phép khách lưu lại các sản phẩm quan tâm ngay trên trình duyệt (không cần đăng nhập) để quay lại so sánh và mua sau, tách biệt với giỏ hàng.

## ADDED Requirements

### Requirement: Toggle sản phẩm yêu thích

The system SHALL hiển thị nút trái tim trên mỗi thẻ sản phẩm và ở trang chi tiết sản phẩm. Bấm nút khi sản phẩm chưa có trong danh sách yêu thích thì thêm vào. Bấm khi đã có thì bỏ khỏi danh sách.

#### Scenario: Thêm sản phẩm chưa có

- **WHEN** khách bấm nút trái tim của một sản phẩm chưa có trong danh sách yêu thích
- **THEN** sản phẩm được thêm vào danh sách
- **AND** mọi nút trái tim của sản phẩm đó chuyển sang trạng thái đã thích

#### Scenario: Bỏ sản phẩm đã có

- **WHEN** khách bấm nút trái tim của một sản phẩm đã có trong danh sách
- **THEN** sản phẩm bị bỏ khỏi danh sách
- **AND** nút trở về trạng thái chưa thích

#### Scenario: Bấm nhiều lần liên tiếp

- **WHEN** khách bấm cùng một nút trái tim hai lần liên tiếp
- **THEN** danh sách trở về như trước lần bấm đầu tiên và không có sản phẩm trùng lặp

### Requirement: Trạng thái nút trái tim dễ nhận biết và truy cập được

The system SHALL thể hiện trạng thái "đã thích" bằng cả hình ảnh (trái tim tô đầy) lẫn thông tin cho công nghệ hỗ trợ: nút có trạng thái nhấn (`aria-pressed`) và nhãn mô tả hành động kèm tên sản phẩm. Nút MUST thao tác được bằng bàn phím, và MUST NOT nằm bên trong một liên kết.

#### Scenario: Screen reader đọc trạng thái

- **WHEN** khách dùng screen reader focus vào nút trái tim của sản phẩm đã thích
- **THEN** nút được đọc là đang nhấn (`aria-pressed="true"`) với nhãn dạng "Bỏ <tên sản phẩm> khỏi danh sách yêu thích"

#### Scenario: Thao tác bằng bàn phím

- **WHEN** khách dùng phím Tab tới nút trái tim và nhấn Enter hoặc Space
- **THEN** trạng thái yêu thích của sản phẩm được đảo như khi bấm chuột

#### Scenario: Trước khi trình duyệt đọc dữ liệu đã lưu

- **WHEN** trang được render lần đầu (server render, chưa đọc dữ liệu đã lưu)
- **THEN** nút hiển thị trạng thái chưa thích và không gây lỗi lệch hydrate
- **AND** sau khi hydrate, nút hiển thị đúng trạng thái theo dữ liệu đã lưu

### Requirement: Giới hạn 50 sản phẩm

The system SHALL giới hạn danh sách yêu thích tối đa 50 sản phẩm. Khi danh sách đã đủ 50, việc thích thêm sản phẩm mới MUST bị từ chối và khách MUST nhận được thông báo danh sách đã đầy.

#### Scenario: Danh sách đã đủ 50 sản phẩm

- **WHEN** khách bấm thích một sản phẩm mới khi danh sách đã có 50 sản phẩm
- **THEN** sản phẩm không được thêm và nút vẫn ở trạng thái chưa thích
- **AND** khách thấy thông báo "Danh sách yêu thích đã đầy (tối đa 50 sản phẩm)" được công bố cho screen reader

#### Scenario: Bỏ thích khi danh sách đầy

- **WHEN** danh sách có 50 sản phẩm và khách bỏ thích một sản phẩm trong đó
- **THEN** sản phẩm bị bỏ bình thường và khách có thể thích một sản phẩm khác

### Requirement: Lưu trên trình duyệt và đồng bộ giữa các tab

The system SHALL lưu danh sách yêu thích trên trình duyệt, không cần đăng nhập. Danh sách MUST được giữ nguyên sau khi tải lại trang và MUST đồng bộ sang các tab khác đang mở trên cùng trình duyệt. Chỉ lưu mã sản phẩm, không lưu giá hay tồn kho.

#### Scenario: Tải lại trang

- **WHEN** khách thích 3 sản phẩm rồi tải lại trang
- **THEN** cả 3 sản phẩm vẫn ở trạng thái đã thích và badge header hiển thị 3

#### Scenario: Đồng bộ giữa hai tab

- **WHEN** khách mở hai tab và thích một sản phẩm ở tab thứ nhất
- **THEN** tab thứ hai cập nhật badge và trạng thái nút trái tim mà không cần tải lại

#### Scenario: Trình duyệt chặn lưu trữ

- **WHEN** trình duyệt không cho ghi dữ liệu (ví dụ chế độ chặn lưu trữ)
- **THEN** wishlist vẫn hoạt động trong phiên hiện tại và trang không bị lỗi

### Requirement: Bỏ qua dữ liệu đã lưu không hợp lệ

The system SHALL bỏ qua các phần dữ liệu wishlist đã lưu bị hỏng, sai định dạng, trùng lặp hoặc chứa mã sản phẩm không còn trong catalog, và MUST NOT làm crash trang.

#### Scenario: Dữ liệu hỏng hoàn toàn

- **WHEN** dữ liệu wishlist đã lưu không phải JSON hợp lệ (ví dụ chuỗi `abc`) và khách tải trang
- **THEN** trang hiển thị bình thường và wishlist được coi là rỗng

#### Scenario: Dữ liệu đúng JSON nhưng sai cấu trúc

- **WHEN** dữ liệu đã lưu là JSON hợp lệ nhưng không có danh sách mã sản phẩm (ví dụ `{"foo":1}` hoặc `null`)
- **THEN** wishlist được coi là rỗng và trang không bị lỗi

#### Scenario: Một phần dữ liệu bị hỏng

- **WHEN** danh sách mã đã lưu có lẫn phần tử không phải mã hợp lệ (số, `null`, chuỗi rỗng) cùng với mã hợp lệ
- **THEN** chỉ các phần tử lỗi bị bỏ qua, các mã hợp lệ vẫn được giữ và hiển thị ở trạng thái đã thích

#### Scenario: Có mã sản phẩm không còn tồn tại

- **WHEN** dữ liệu đã lưu chứa mã sản phẩm không có trong catalog cùng với mã hợp lệ
- **THEN** trang `/wishlist` chỉ hiển thị các sản phẩm hợp lệ
- **AND** mã không hợp lệ bị loại khỏi danh sách đã lưu nên badge header khớp với số sản phẩm hiển thị

#### Scenario: Dữ liệu vượt quá giới hạn hoặc trùng lặp

- **WHEN** dữ liệu đã lưu chứa mã trùng lặp hoặc nhiều hơn 50 mã
- **THEN** danh sách chỉ giữ các mã không trùng, tối đa 50 mã đầu tiên

### Requirement: Badge yêu thích ở header

The system SHALL hiển thị ở header một liên kết hình trái tim dẫn tới `/wishlist`, kèm số sản phẩm yêu thích khi số đó lớn hơn 0. Nhãn truy cập MUST nêu số sản phẩm.

#### Scenario: Có sản phẩm yêu thích

- **WHEN** danh sách có 2 sản phẩm
- **THEN** badge hiển thị "2" và nhãn liên kết là "Danh sách yêu thích (2 sản phẩm)"

#### Scenario: Danh sách rỗng

- **WHEN** danh sách không có sản phẩm nào
- **THEN** biểu tượng trái tim vẫn hiển thị nhưng không có con số

#### Scenario: Màn hình hẹp

- **WHEN** khách xem trang ở chiều rộng 390px
- **THEN** header không bị tràn hay vỡ bố cục và biểu tượng trái tim vẫn bấm được

### Requirement: Trang danh sách yêu thích

The system SHALL cung cấp trang `/wishlist` liệt kê các sản phẩm đã thích. Tên, giá và tồn kho MUST lấy từ catalog hiện tại tại thời điểm hiển thị. Mỗi sản phẩm MUST có nút bỏ thích và nút thêm vào giỏ.

#### Scenario: Hiển thị giá mới nhất

- **WHEN** giá của một sản phẩm trong catalog thay đổi sau khi khách đã thích sản phẩm đó
- **THEN** trang `/wishlist` hiển thị giá mới

#### Scenario: Bỏ thích từ trang wishlist

- **WHEN** khách bấm nút bỏ thích của một sản phẩm trên trang `/wishlist`
- **THEN** sản phẩm biến mất khỏi trang và badge header giảm tương ứng

#### Scenario: Thêm vào giỏ từ trang wishlist

- **WHEN** khách bấm "Thêm vào giỏ" của một sản phẩm còn hàng trên trang `/wishlist`
- **THEN** sản phẩm được thêm vào giỏ theo đúng quy tắc giỏ hàng hiện có (giới hạn số lượng theo tồn kho và tối đa mỗi sản phẩm)
- **AND** sản phẩm vẫn còn trong danh sách yêu thích

#### Scenario: Danh sách trống

- **WHEN** khách mở `/wishlist` khi chưa thích sản phẩm nào
- **THEN** trang hiển thị trạng thái trống với lời mời và liên kết tới trang sản phẩm

### Requirement: Sản phẩm hết hàng trong wishlist

The system SHALL giữ sản phẩm hết hàng (tồn kho bằng 0) trong danh sách yêu thích, hiển thị nhãn "Hết hàng" và MUST NOT cho thêm sản phẩm đó vào giỏ.

#### Scenario: Thích sản phẩm hết hàng

- **WHEN** khách thích một sản phẩm có tồn kho bằng 0
- **THEN** sản phẩm được thêm vào danh sách yêu thích như sản phẩm bình thường

#### Scenario: Hiển thị trên trang wishlist

- **WHEN** khách mở `/wishlist` có một sản phẩm hết hàng
- **THEN** sản phẩm hiển thị nhãn "Hết hàng"
- **AND** nút thêm vào giỏ bị vô hiệu hóa
