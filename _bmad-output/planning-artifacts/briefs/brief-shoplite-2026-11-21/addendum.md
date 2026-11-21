# Addendum: ShopLite - Vận hành và theo dõi đơn hàng

Chi tiết dành cho PRD và kiến trúc, không đưa vào brief.

## Lựa chọn kỹ thuật

- PostgreSQL, Drizzle với `node-postgres`. Cần chạy thử một đơn trừ kho thật trên Next 16.4.2 trước khi chốt ORM.
- Docker Compose cho local và test race condition (xung đột đồng thời). E2E dùng DB riêng, seed lại mỗi lần chạy.
- Giá trị thật ở `.env`, mẫu ở `.env.example`.
- `.env.local` là file mẫu của khóa học, giữ trong git với giá trị `replace_me`. Không khai báo `DATABASE_URL` ở đây vì Next ưu tiên file này hơn `.env`.
- Danh mục sản phẩm giữ trong code. Bảng số lượng tồn được seed từ `src/data/products.ts`.
- Bỏ `stock` khỏi `Product` tĩnh để compiler chỉ ra mọi chỗ đọc: `catalog-service.ts`, `stock-badge.tsx`, `product-card.tsx`, `cart-reducer.ts`. Trang sản phẩm chuyển sang đọc động, bỏ `generateStaticParams` nếu hàm này còn giữ số tồn cũ.
- Tài khoản nhân viên cấu hình qua env: mỗi người một tài khoản, mật khẩu lưu dạng hash.
- Thứ tự làm: DB → tồn kho → trang xác nhận và tra đơn → trang nhân viên → đóng route cũ. Chỉ phát hành khi đủ cả chuỗi.

## Phương án đã loại hoặc hoãn

- **Giữ file JSON (loại):** không có cơ chế khóa đồng thời, không kiểm chứng được "không bán quá tồn".
- **Đợt đầu chỉ có tra đơn (loại):** đơn vẫn kẹt và không có đường hủy hay hoàn kho.
- **Thêm `payment_status` (loại):** cần quy trình đối soát; cờ bấm tay sai còn tệ hơn không có.
- **Cho hủy khi Đang giao (hoãn):** thuộc luồng giao thất bại, cần thiết kế riêng.
- **Trễ 10 phút mới hiện "Đã giao" (hoãn):** giữ ở mức Could (làm nếu còn thời gian) để không làm khách thấy trạng thái chậm hơn thực tế.

## Thao tác dữ liệu

- Thay `OrderRepository.save` bằng thao tác nguyên tử cho đặt hàng và chuyển trạng thái.
- Trừ kho bằng `UPDATE ... SET stock = stock - $n WHERE id = $id AND stock >= $n`, kèm `CHECK (stock >= 0)`.
- Chuyển trạng thái bằng `UPDATE ... WHERE status = $from`, để chỉ một thao tác đồng thời thắng.
- Trừ kho hoặc hoàn kho, đổi đơn và ghi lịch sử nằm trong một transaction.
- Bộ đếm chống dò mã đơn lưu trong PostgreSQL, khóa theo cặp IP và mã đơn, kèm hạn mức tổng theo IP. Chỉ đọc IP từ proxy đã cấu hình; chưa xác định proxy khi triển khai.
- `POST /api/orders` có giới hạn tần suất theo IP và số đơn đang mở theo số điện thoại.
- Số điện thoại được chuẩn hóa `0...` và `+84...` về một dạng khi lưu và khi tra.

## Bảng chuyển trạng thái

| Từ | Sang | Ai | Kho | Điều kiện |
|---|---|---|---|---|
| Chờ xác nhận | Đã xác nhận | Nhân viên | Không đổi | |
| Đã xác nhận | Đang giao | Nhân viên | Không đổi | |
| Đang giao | Đã giao | Nhân viên | Không đổi | Xác nhận hai lần |
| Chờ xác nhận, Đã xác nhận | Đã hủy | Nhân viên | Hoàn một lần | Bắt buộc có lý do |
| Đã giao | Đang giao | Quản lý | Không đổi | Bắt buộc có lý do |

## Ca bắt buộc có test

1. Mua đồng thời sản phẩm cuối cùng: đúng một đơn thành công, tồn không âm.
2. Hai người cùng hủy hoặc bấm đúp: chỉ hoàn kho một lần.
3. Hai nhân viên cùng đổi trạng thái: một bên thắng, không có dòng lịch sử mồ côi.
4. Lỗi giữa transaction khi đặt hoặc hủy: tồn kho và lịch sử giữ nguyên.
5. Chuyển sai thứ tự hoặc từ trạng thái cuối: bị từ chối, trừ thao tác lùi của quản lý.
6. Cookie bị sửa, hết hạn hoặc của đơn khác: bị từ chối.
7. Đặt đơn vượt giới hạn tần suất hoặc số đơn đang mở: bị từ chối và không trừ kho.
8. Một IP dò nhiều mã đơn: bị chặn theo hạn mức tổng; IP giả trong header không vượt được giới hạn.
9. Đặt bằng `0...` rồi tra bằng `+84...` và ngược lại: đều tìm thấy đơn.

## Ảnh hưởng tới code và test hiện có

- `PATCH /api/orders/:id` không còn mở cho khách, nên gỡ `cancel-order-button.tsx` khỏi trang khách.
- `checkout-form.tsx:132` đang chuyển tới `/orders/{id}?placed=1`, phải đổi sang trang xác nhận mới.
- Phải viết lại `src/app/api/orders/route.test.ts`, `e2e/shopping-flow.spec.ts` và `checkout-form.test.tsx`.
- Repo chưa có `.github/workflows`, nên chưa có CI để chạy Postgres.

## Câu hỏi còn mở cho PRD

- Xác nhận các thẻ `[ASSUMPTION]` và `[SĐT_SHOP]` trong brief.
- Ngưỡng "quá hạn" theo từng trạng thái và nguồn dữ liệu "khi nào giao", nếu các mục này được đưa vào.
- Nhân viên nào được xem thông tin khách hàng đầy đủ.
- Ngưỡng giới hạn đặt đơn, số đơn đang mở và hạn mức dò theo IP.
