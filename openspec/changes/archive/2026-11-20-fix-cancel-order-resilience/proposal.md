# Proposal

## Why

Khi explore luồng hủy đơn (bài 3.3, Bài C), mình tìm thấy 4 vấn đề:

- Nút hủy đơn bị kẹt ở trạng thái "Đang hủy…" vĩnh viễn khi mất mạng.
- Khi server báo đơn không còn hủy được (409), trang vẫn hiển thị trạng thái cũ và vẫn còn nút hủy.
- API `PATCH /api/orders/:id` chưa có route test, trái với Definition of Done.
- Hộp xác nhận hủy hiện ngay trong trang (inline), dễ bị bỏ qua với một thao tác không hoàn tác được, và focus bàn phím không chuyển vào hộp xác nhận.

Đây là lỗi trải nghiệm thật ở một luồng đã chạy, nên sửa sớm trước khi thêm tính năng mới.

## What Changes

- **Lỗi mạng khi hủy đơn:** nút thoát trạng thái "Đang hủy…", hiện thông báo "Không kết nối được máy chủ, vui lòng thử lại." và cho phép bấm lại.
- **Lỗi do trạng thái đơn đã thay đổi:** khi server trả `INVALID_STATUS_TRANSITION` (409) hoặc `ORDER_NOT_FOUND` (404), trang tự tải lại dữ liệu từ server để hiển thị trạng thái thật.
- **Xác nhận bằng dialog:** bấm "Hủy đơn hàng" mở hộp thoại modal (thẻ `<dialog>` của trình duyệt, không thêm thư viện): focus vào nút an toàn "Không", Esc hoặc "Không" thì đóng mà không gửi yêu cầu, đóng xong focus quay về nút "Hủy đơn hàng".
- **Ghi lại thành spec:** hành vi hủy đơn hiện có (chỉ hủy khi đang chờ xác nhận, API chỉ nhận `{ "status": "cancelled" }`), để từ nay có spec sống cho capability này.
- **Test bổ sung:**
  - route test cho `PATCH /api/orders/[id]`
  - component test cho `CancelOrderButton`

## Ngoài phạm vi

- Xác thực/phân quyền người hủy đơn (hệ thống chưa có đăng nhập).
- Khóa ghi đồng thời cho `storage/orders.json` (rủi ro đọc-sửa-ghi khi nhiều request cùng lúc).
- Lỗi vượt giới hạn 10 sản phẩm khi gửi dòng trùng `productId` ở luồng đặt hàng: tách thành change riêng.
- Đổi quy tắc nghiệp vụ hủy đơn (vẫn chỉ hủy được khi `pending`).
- Component dialog dùng chung cho cả dự án (chỉ làm cho hủy đơn; tách ra khi có nơi thứ hai cần).
- Đóng dialog khi bấm ra ngoài vùng nền (backdrop).

## Capabilities

### New Capabilities

- `order-cancellation`: khách tự hủy đơn hàng đang chờ xác nhận. Bao gồm điều kiện được hủy, định dạng API, cách giao diện phản hồi khi thành công, khi lỗi nghiệp vụ và khi lỗi mạng.

### Modified Capabilities

(Không có: `openspec/specs/` hiện chưa có capability nào.)

## Impact

- **Code sửa:** `src/features/orders/components/cancel-order-button.tsx`.
- **Test mới:**
  - `src/features/orders/components/cancel-order-button.test.tsx`
  - `src/app/api/orders/[id]/route.test.ts`
- **Không đổi:**
  - `order-service.ts`, `route.ts`, định dạng `ApiErrorBody`
  - dữ liệu `orders.json`
  - quy tắc nghiệp vụ ở mục 5 AGENTS.md
