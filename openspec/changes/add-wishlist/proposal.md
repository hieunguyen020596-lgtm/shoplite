# Proposal

## Why

Khách thường xem nhiều sản phẩm nhưng chưa mua ngay, và hiện chỉ có cách bỏ tạm vào giỏ hàng để "nhớ" sản phẩm. Việc này làm giỏ hàng lẫn giữa món định mua và món đang cân nhắc. Danh sách yêu thích (wishlist) cho khách một chỗ riêng để lưu lại, quay lại so sánh và mua sau, không cần đăng nhập.

## What Changes

- Thêm nút trái tim trên thẻ sản phẩm và ở trang chi tiết sản phẩm. Bấm để thêm vào danh sách yêu thích, bấm lần nữa để bỏ. Trạng thái "đã thích" nhìn thấy rõ và đọc được bằng screen reader.
- Thêm biểu tượng trái tim ở header, kèm số lượng sản phẩm yêu thích. Bấm vào thì mở trang `/wishlist`.
- Thêm trang `/wishlist`:
  - Liệt kê sản phẩm đã thích, với giá và tồn kho lấy từ catalog hiện tại.
  - Mỗi sản phẩm có nút bỏ thích và nút thêm vào giỏ.
  - Khi danh sách trống thì hiện lời mời khám phá sản phẩm.
- Danh sách lưu trên trình duyệt:
  - Giữ nguyên khi tải lại trang và đồng bộ giữa các tab đang mở.
  - Dữ liệu lưu bị hỏng hoặc chứa sản phẩm không còn tồn tại thì được bỏ qua, trang không lỗi.
- Giới hạn tối đa 50 sản phẩm. Khi đầy, khách được báo và sản phẩm mới không được thêm.
- Sản phẩm hết hàng vẫn nằm trong danh sách nhưng hiển thị "Hết hàng" và không thêm vào giỏ được.

## Ngoài phạm vi

- Lưu wishlist lên server hoặc đồng bộ giữa các thiết bị/tài khoản.
- Chia sẻ wishlist (link, mạng xã hội).
- Thông báo khi sản phẩm có hàng trở lại hoặc giảm giá.
- Sắp xếp, lọc, ghi chú trong trang `/wishlist`; chuyển hàng loạt sản phẩm vào giỏ.
- Thay đổi hành vi giỏ hàng, giá, phí ship, mã giảm giá hay luồng đặt hàng.

## Capabilities

### New Capabilities

- `wishlist`: danh sách sản phẩm yêu thích phía trình duyệt. Bao gồm thêm/bỏ thích, giới hạn số lượng, lưu và đồng bộ, badge ở header, trang `/wishlist`.

### Modified Capabilities

(Không có: `openspec/specs/` hiện chưa có capability nào. Giỏ hàng chỉ được dùng lại qua hành vi "thêm vào giỏ" hiện có, không đổi requirement.)

## Impact

- **Code mới:**
  - `src/features/wishlist/`: logic thuần, store, hook, components, test.
  - Route `src/app/wishlist/page.tsx`.
  - E2E `e2e/wishlist.spec.ts`.
- **Code sửa:**
  - `src/features/catalog/components/product-card.tsx`: thêm nút trái tim.
  - `src/app/products/[slug]/page.tsx`: thêm nút trái tim.
  - `src/components/layout/header.tsx`: thêm badge trái tim.
  - `AGENTS.md`: thêm dòng codemap.
- **Dữ liệu:** thêm key `localStorage` `shoplite:wishlist`. Không có API, database hay dependency mới.
- **Không ảnh hưởng:** API đơn hàng, logic giá/ship/coupon ở server.
