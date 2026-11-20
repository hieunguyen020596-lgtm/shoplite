# order-cancellation Specification

## Purpose
Cho phép khách tự hủy đơn hàng của mình khi đơn còn đang chờ xác nhận, với phản hồi rõ ràng trên giao diện trong mọi trường hợp: thành công, lỗi nghiệp vụ hoặc mất kết nối.

## Requirements

### Requirement: Chỉ hủy được đơn đang chờ xác nhận

The system SHALL chỉ cho phép hủy đơn hàng có trạng thái "Chờ xác nhận" (`pending`). Hủy đơn ở trạng thái khác MUST bị từ chối với mã lỗi `INVALID_STATUS_TRANSITION` (HTTP 409) và đơn MUST giữ nguyên.

#### Scenario: Hủy đơn đang chờ xác nhận

- **WHEN** khách hủy một đơn đang ở trạng thái `pending`
- **THEN** đơn chuyển sang `cancelled`, thời điểm cập nhật được ghi lại
- **AND** các thông tin khác của đơn (sản phẩm, mã giảm giá, tổng tiền) giữ nguyên

#### Scenario: Hủy đơn đã xác nhận hoặc đã hủy

- **WHEN** khách gửi yêu cầu hủy một đơn đang ở trạng thái `confirmed` hoặc `cancelled`
- **THEN** hệ thống trả 409 với mã `INVALID_STATUS_TRANSITION` và trạng thái đơn không đổi

#### Scenario: Đơn không tồn tại

- **WHEN** khách gửi yêu cầu hủy một mã đơn không tồn tại
- **THEN** hệ thống trả 404 với mã `ORDER_NOT_FOUND`

### Requirement: API hủy đơn chỉ nhận đúng một dạng yêu cầu

The system SHALL chỉ chấp nhận yêu cầu cập nhật đơn hàng có nội dung đúng là `{ "status": "cancelled" }`. Mọi nội dung khác MUST bị từ chối với mã lỗi `VALIDATION_ERROR` (HTTP 400) theo định dạng lỗi chung `{ error: { code, message } }`.

#### Scenario: Yêu cầu chuyển sang trạng thái khác

- **WHEN** client gửi `{ "status": "confirmed" }` tới API cập nhật đơn
- **THEN** hệ thống trả 400 `VALIDATION_ERROR` và đơn không đổi

#### Scenario: Nội dung không phải JSON

- **WHEN** client gửi nội dung không phải JSON hợp lệ
- **THEN** hệ thống trả 400 `VALIDATION_ERROR`

### Requirement: Xác nhận trước khi hủy

The system SHALL yêu cầu khách xác nhận trong một hộp thoại modal trước khi gửi yêu cầu hủy. Hộp thoại MUST có tiêu đề và mô tả đọc được bằng screen reader, focus MUST chuyển vào nút "Không" khi mở, và quay về nút "Hủy đơn hàng" khi đóng. Nút hủy MUST chỉ hiển thị với đơn đang chờ xác nhận.

#### Scenario: Mở hộp thoại xác nhận

- **WHEN** khách bấm "Hủy đơn hàng"
- **THEN** một hộp thoại modal "Hủy đơn hàng?" mở ra, nêu mã đơn và cảnh báo không thể hoàn tác
- **AND** focus nằm ở nút "Không" và chưa có yêu cầu nào được gửi

#### Scenario: Bấm hủy rồi đổi ý

- **WHEN** khách mở hộp thoại rồi bấm "Không"
- **THEN** hộp thoại đóng, không có yêu cầu nào được gửi lên server và đơn giữ nguyên
- **AND** focus quay về nút "Hủy đơn hàng"

#### Scenario: Đóng bằng phím Esc

- **WHEN** khách mở hộp thoại rồi nhấn Esc
- **THEN** hộp thoại đóng và không có yêu cầu nào được gửi

#### Scenario: Không đóng được khi đang gửi yêu cầu

- **WHEN** khách đã bấm "Xác nhận hủy" và yêu cầu đang được xử lý
- **THEN** hai nút trong hộp thoại bị vô hiệu hóa và nhấn Esc không đóng hộp thoại

#### Scenario: Đơn không còn chờ xác nhận

- **WHEN** khách xem đơn đã xác nhận hoặc đã hủy
- **THEN** trang không hiển thị nút "Hủy đơn hàng"

### Requirement: Phản hồi khi hủy thành công

The system SHALL hiển thị trạng thái mới của đơn ngay sau khi hủy thành công, lấy từ dữ liệu trên server, và MUST ẩn nút hủy.

#### Scenario: Hủy thành công

- **WHEN** khách xác nhận hủy và server chấp nhận
- **THEN** trang hiển thị trạng thái "Đã hủy" và không còn nút hủy

### Requirement: Phản hồi khi trạng thái đơn đã thay đổi

The system SHALL tải lại dữ liệu đơn từ server khi yêu cầu hủy bị từ chối vì đơn không còn hủy được hoặc không còn tồn tại, để trang MUST NOT tiếp tục hiển thị trạng thái cũ.

#### Scenario: Đơn đã bị hủy ở tab khác

- **WHEN** khách xác nhận hủy ở một tab trong khi đơn đã được hủy ở tab khác (server trả 409)
- **THEN** trang tải lại và hiển thị trạng thái thật của đơn, không còn nút hủy

#### Scenario: Lỗi kiểm tra dữ liệu không tải lại trang

- **WHEN** server trả lỗi 400 hoặc 500
- **THEN** trang không tải lại, khách thấy thông báo lỗi từ server (hoặc "Không thể hủy đơn hàng" khi không đọc được nội dung lỗi) và có thể thử lại

### Requirement: Phản hồi khi mất kết nối

The system SHALL xử lý trường hợp không gửi được yêu cầu hủy (mất mạng, server không phản hồi): nút MUST thoát trạng thái đang xử lý và khách MUST thấy thông báo "Không kết nối được máy chủ, vui lòng thử lại." cùng khả năng bấm lại.

#### Scenario: Mất mạng khi xác nhận hủy

- **WHEN** khách bấm "Xác nhận hủy" nhưng yêu cầu không gửi được tới server
- **THEN** nút không còn hiển thị "Đang hủy…" và được bật lại
- **AND** khách thấy thông báo "Không kết nối được máy chủ, vui lòng thử lại."

#### Scenario: Thử lại sau khi có mạng

- **WHEN** sau lần lỗi mạng, khách bấm "Xác nhận hủy" lần nữa và server chấp nhận
- **THEN** thông báo lỗi cũ biến mất và đơn được hủy như bình thường
