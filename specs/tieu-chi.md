# Bộ tiêu chí chấp nhận - Giỏ hàng và Đặt hàng

> **Trạng thái:** đã được landv duyệt ngày 2026-11-21, gồm cả các điểm chỉ có nguồn từ code.

**Nguồn sự thật** theo thứ tự ưu tiên: `README.md` mục _Quy tắc nghiệp vụ chính_, rồi
`_bmad-output/planning-artifacts/epics.md` (Story 1.6 - 1.9). Code chỉ dùng để lấy tên sản phẩm, giá và nhãn
đang hiển thị, không dùng để quyết định app _phải_ làm gì.

**Dữ liệu mẫu:** tên và giá từ `src/data/products.ts`, Tồn kho từ `src/data/inventory-seed.ts`.

## Luồng A - Giỏ hàng và phí giao hàng

| Mã   | Tiêu chí                                                                                                                                                                            | Dữ liệu mẫu                                                                      | Nguồn                                      |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------ |
| GH-1 | **Cho** sản phẩm còn hàng, **khi** khách chọn số lượng rồi bấm _Thêm vào giỏ_, **thì** biểu tượng giỏ báo đúng tổng số lượng. Sản phẩm hết hàng **không có cách nào** thêm vào giỏ. | 3 × Chuột không dây SwiftClick (kho 60); Micro thu âm PodCast USB (kho 0)        | README                                     |
| GH-2 | Khách **không** chọn được nhiều hơn số còn trong kho, ở **cả** trang sản phẩm **và** trang giỏ hàng, và **không quá 10** sản phẩm mỗi loại dù kho còn nhiều.                        | Giá đỡ laptop nhôm (kho 3): dừng ở 3; Cáp USB-C bện dù 2m (kho 200): gõ 15 về 10 | README, Story 1.6                          |
| GH-3 | **Cho** tạm tính **dưới** 500.000 ₫, **thì** phí giao tiêu chuẩn là 30.000 ₫. Giỏ hàng gợi ý _"Mua thêm 350.000 ₫ để được miễn phí giao hàng"_.                                     | 1 × Cáp USB-C = 150.000 ₫, tổng 180.000 ₫                                        | README; câu gợi ý: code, người đã xác nhận |
| GH-4 | **Cho** tạm tính **đúng bằng** 500.000 ₫, **thì** được miễn phí giao tiêu chuẩn **ở cả** giỏ hàng **và** trang thanh toán.                                                          | 2 × Bàn di chuột cỡ lớn DeskMat XL (250.000 ₫), tổng 500.000 ₫                   | README ("từ 500.000 ₫")                    |

## Luồng B - Thanh toán và đơn hàng

| Mã   | Tiêu chí                                                                                                                                                                                                                                                                                | Dữ liệu mẫu                                                                                                        | Nguồn                                                                    |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| DH-1 | **Khi** gửi form thiếu hoặc sai, **thì** lỗi hiện dưới từng ô sai, **không** tạo đơn, khách vẫn ở trang thanh toán.                                                                                                                                                                     | Form trống; số điện thoại `0123456789`                                                                             | Code và màn hình, người đã xác nhận                                      |
| DH-2 | **Khi** đặt hàng hợp lệ, **thì** khách sang trang đơn, thấy _Đặt hàng thành công!_, trạng thái _Chờ xác nhận_, giỏ trống, đơn có trong trang _Đơn hàng_. Giao nhanh tính 60.000 ₫. Số tiền lưu lại do **server** tính. Mã đơn có dạng `SL-YYYYMMDD-XXXXXX`.                             | 1 × SwiftClick (450.000 ₫) + giao nhanh, tổng 510.000 ₫                                                            | README, Story 1.7; dạng mã đơn và câu thông báo: code, người đã xác nhận |
| DH-3 | **Khi** kho không đủ lúc bấm _Đặt hàng_, **thì** không tạo đơn, không trừ kho, **form giữ nguyên**, mỗi dòng thiếu hiện `Bạn chọn X · Chỉ còn N`, nút _Đặt hàng_ khóa. Sau khi _Lấy N_ hoặc _Bỏ_, giỏ và tổng tiền cập nhật và đặt tiếp được. Dòng còn 0 **chỉ** có _Hết hàng_ và _Bỏ_. | Giá đỡ laptop: chọn 3, kho còn 1, lấy 1, tổng 420.000 ₫. Giá đỡ + Cáp USB-C, Giá đỡ còn 0, bỏ dòng, tổng 180.000 ₫ | README, Story 1.7, 1.9                                                   |

## Cố ý không đưa vào E2E

| Hành vi                                                | Tầng lo                                                                        |
| ------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Tìm kiếm không dấu, lọc danh mục, sắp xếp              | 2 test có sẵn trong `e2e/shopping-flow.spec.ts` và unit test `catalog-service` |
| Làm sạch giỏ cũ, đồng bộ giỏ giữa các tab              | Unit test `cart-store.test.ts`                                                 |
| Server không tin giá client gửi lên                    | Unit test `order-service.test.ts`                                              |
| Nhiều yêu cầu cùng tranh món cuối, rollback khi lỗi DB | Test DB trên PostgreSQL thật; bài 6.6 thêm một ca hai khách                    |
| Giới hạn đơn theo SĐT và IP, khách không tự hủy đơn    | Test DB; bài 6.6 thêm test custom VH                                           |
