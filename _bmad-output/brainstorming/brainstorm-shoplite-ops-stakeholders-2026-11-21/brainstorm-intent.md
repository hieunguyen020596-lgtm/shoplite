---
type: brainstorm-intent
topic: Công cụ nhân viên vận hành đơn hàng ShopLite và theo dõi đơn cho khách
date: 2026-11-21
source: .memlog.md
intended_for: bmad-product-brief, bmad-prd
---

# Intent: Vận hành và theo dõi đơn hàng ShopLite

> **Nguồn gốc quyết định:** Người dùng chọn 5 Must. Các gợi ý Spark, luận điểm cốt lõi, nguyên tắc thiết kế, việc gộp mục 11 vào Must 10 và phần xếp Should/Could/Won't do coach đưa ra theo yêu cầu của người dùng. Cách xử lý R1 và R2 do coach đề xuất sau khi đối chiếu code, người dùng duyệt đưa vào tài liệu.
>
> **Cập nhật sau phiên phản biện party mode (2026-11-21):** Người dùng chốt Postgres, cấu hình qua env, và chọn các đề xuất về phạm vi đợt 1, Docker Compose, bỏ đơn cũ, bảng tồn kho, trang nhân viên, cookie xác nhận, tồn kho động và DB riêng cho e2e. Luật hủy đơn, hoàn tiền và sửa "Đã giao" do phòng phản biện đề xuất theo ủy quyền của người dùng, lấy theo ý kiến đa số. Nhật ký: `_bmad-output/party-mode/memories/installed/.memlog.md`.
>
> **Cập nhật sau Pre-mortem (2026-11-21):** Coach đề xuất 7 cách phòng ngừa từ việc đọc code và các quyết định đã chốt; người dùng chấp nhận cả 7. Các nguyên nhân chưa được chạy thử để tái hiện. Chi tiết ở mục 8.
>
> Số mục (1, 2, 6...) là mã ứng viên trong phiên brainstorm, giữ lại để truy vết.

## 1. Vấn đề

- Đơn nằm mãi ở Chờ xác nhận vì cửa hàng không có chỗ xác nhận, giao hoặc đánh dấu đã giao.
- Tồn kho trên web không giảm dù đã bán.
- Khách không thấy đơn đang đi tới đâu.

## 2. Người dùng và nỗi sợ

| Vai | Nỗi sợ | Cần |
|---|---|---|
| Khách hàng | Mất tiền khi đơn không có tín hiệu gì | Biết shop đã nhận đơn chưa và đơn đang ở đâu |
| Nhân viên vận hành | Bị đổ lỗi vì việc mình không gây ra | Làm đúng quy trình, có bằng chứng ai làm gì, lúc nào |
| Quản lý/chủ shop | Mất uy tín | Biết chuyện gì đã xảy ra, giữ uy tín cả khi đơn gặp sự cố |

## 3. Luận điểm cốt lõi

**Công cụ bán một sự thật chung về đơn hàng.** Cùng một bản ghi trạng thái và lịch sử trả lời khách (đơn ở đâu), bảo vệ nhân viên (ai làm gì, lúc nào) và giúp chủ shop giữ uy tín (biết chuyện gì đã xảy ra).

Điểm đòn bẩy là nhân viên: nhân viên cập nhật đúng thì khách mới thấy đúng trạng thái và shop mới giữ được uy tín.

## 4. Nguyên tắc thiết kế

1. Mọi thay đổi trạng thái và tồn kho đi qua **một đường duy nhất có ghi vết**.
2. Sửa sai là **thêm một thao tác mới có ghi lịch sử**, không xóa dấu vết cũ.

## 5. Phạm vi MVP

### Must (5)

| # | Mục | Tiêu chí đã chốt |
|---|---|---|
| 1 | Tra đơn an toàn | Bắt buộc có cả mã đơn và số điện thoại; chỉ trả dữ liệu tối thiểu; đóng mọi đường xem hoặc sửa đơn không kiểm tra quyền |
| 2 | Thấy trạng thái đơn | Khách tra đơn hợp lệ thì thấy trạng thái hiện tại |
| 6 | Nhân viên đổi trạng thái | Trang nhân viên tối thiểu, mặc định là hàng đợi đơn cần xử lý và dùng được trên điện thoại; phải đăng nhập bằng tài khoản riêng cấu hình qua env; có vai nhân viên và quản lý; chỉ đổi theo đúng thứ tự |
| 7 | Lịch sử trạng thái | Ghi ai đổi, lúc nào, từ trạng thái nào sang trạng thái nào, lý do nếu có; không xóa dòng cũ |
| 10 | Tồn kho đúng | Trừ khi mua, hoàn khi hủy, không bán quá tồn (đã gộp mục 11); trừ kho, tạo đơn và ghi lịch sử trong một transaction |

Cả 5 Must nằm trong đợt 1.

### Nền móng bắt buộc của đợt 1

- **Dữ liệu:** PostgreSQL, Drizzle với `node-postgres`. Cần chạy thử một đơn trừ kho thật trên Next 16.4.2 trước khi chốt ORM.
- **Cấu hình:** giá trị thật ở `.env`, mẫu ở `.env.example`. Không đặt giá trị mẫu ở `.env.local` vì Next ưu tiên file này hơn `.env`.
- **Môi trường:** Docker Compose cho local và test race.
- **Dữ liệu cũ:** bỏ 11 đơn trong `storage/orders.json`, với giả định đây là dữ liệu thử.
- **Tồn kho:** giữ danh mục trong code, thêm bảng số lượng tồn seed từ `products.ts`. Bỏ `stock` khỏi `Product` tĩnh; trang danh sách, chi tiết và bộ lọc đọc tồn kho động.
- **Repository:** thay `save` bằng các thao tác nguyên tử cho đặt hàng và chuyển trạng thái.
- **Trang xác nhận:** xem lại bằng cookie `HttpOnly` có ký, gắn với đúng đơn và trình duyệt vừa đặt. Mất cookie thì tra bằng mã đơn và số điện thoại.
- **Kiểm thử:** test race trên Postgres thật; e2e dùng DB riêng và seed lại mỗi lần chạy.
- **Thứ tự làm:** DB → tồn kho → trang xác nhận và tra đơn → trang nhân viên → đóng route cũ. Chỉ phát hành khi đủ cả chuỗi.

### Should

| # | Mục | Lý do |
|---|---|---|
| 9 | Báo khách khi đơn được sửa và công cụ điều chỉnh mở rộng cho quản lý | Đường sửa "Đã giao" tối thiểu đã nằm trong luật ở mục 6 |
| 13 | Cảnh báo đơn đứng yên quá hạn, kèm mã đơn, đã kẹt bao lâu, ai thao tác cuối | Xử lý đúng tình trạng đơn nằm mãi một chỗ |
| 3 | Khách biết khi nào đơn được giao | Nhu cầu trực tiếp của khách |

### Could

| # | Mục | Lý do |
|---|---|---|
| 8 | Đã giao chờ 10 giây mới hiện cho khách, trong lúc đó nhân viên Undo được | Giảm hậu quả khi bấm nhầm |
| 12 | Công cụ liên hệ, xin lỗi khách | Giữ uy tín khi có sự cố |

### Won't (lần này)

| # | Mục | Lý do |
|---|---|---|
| 4 | Khách tự hủy đơn | Dễ đụng lúc nhân viên đang đóng gói; MVP do nhân viên thực hiện hủy |
| - | Giao thất bại, trả hàng | Hủy không áp dụng từ Đang giao trở đi; luồng này cần thiết kế riêng |
| - | Cổng thanh toán, trạng thái "đã thanh toán", hoàn tiền tự động | Hệ thống hiện không biết khách đã trả tiền chưa; cờ bấm tay dễ sai |

> Memlog chỉ ghi lý do xếp hạng cho mục 9 và 4. Lý do của 13, 3, 8, 12 là nhu cầu gốc của mục đó.

## 6. Luật nghiệp vụ đã chốt

- **Tra đơn:** phải có cả mã đơn và số điện thoại. Chỉ có mã đơn thì không xem được gì, kể cả trạng thái.
- **Dữ liệu khi tra đơn:** chỉ hiện trạng thái, mốc thời gian, tên sản phẩm, tên và số điện thoại đã che. Không hiện địa chỉ đầy đủ, email hay ghi chú.
- **Trang tra đơn:** chỉ để xem, không có thao tác hủy hoặc sửa.
- **Chống dò:** giới hạn khoảng 5 lần sai trong 15 phút, chỉ báo lỗi chung "Thông tin không đúng". Bộ đếm lưu trong Postgres, khóa theo cặp IP và mã đơn để kẻ xấu không khóa được đơn của nạn nhân, kèm hạn mức tổng theo IP để một IP không dò được nhiều mã đơn. Chỉ đọc IP từ proxy đã cấu hình.
- **Số điện thoại:** chuẩn hóa `0...` và `+84...` về một dạng khi lưu và khi tra.
- **Chống đơn ảo:** giới hạn tần suất đặt đơn theo IP và số đơn đang mở theo số điện thoại. Ngưỡng cụ thể chốt ở PRD.
- **Truyền số điện thoại:** gửi qua `POST`, không đưa lên URL.
- **Thứ tự trạng thái:** Chờ xác nhận → Đã xác nhận → Đang giao → Đã giao.
- **Quyền đổi trạng thái:** chỉ nhân viên đã đăng nhập.
- **Trừ kho:** ngay khi khách bấm mua.
- **Hoàn kho:** khi hủy đơn.
- **Món cuối:** thuộc về người mua trước; người mua sau thấy thông báo hết hàng.
- **Tồn kho:** không bao giờ âm.
- **Hủy đơn trong MVP:** do nhân viên thực hiện, chỉ từ Chờ xác nhận hoặc Đã xác nhận, bắt buộc có lý do. Hoàn kho đúng một lần trong cùng transaction.
- **Đơn chuyển khoản bị hủy:** bắt buộc có lý do và bật cờ "cần hoàn tiền thủ công"; việc hoàn tiền làm ngoài hệ thống. Trang tra đơn không khẳng định khách đã trả tiền hoặc sẽ được hoàn khi chưa có người xác nhận.
- **Thông tin chuyển khoản:** chỉ hiện khi đơn còn Chờ xác nhận.
- **Chống bấm nhầm "Đã giao":** bước Đang giao → Đã giao cần xác nhận hai bước trên giao diện.
- **Sửa "Đã giao":** chỉ quản lý được lùi về Đang giao, bắt buộc có lý do, ghi thành dòng lịch sử mới và không đụng tới kho.
- **Đơn chuyển khoản chờ lâu:** đơn chờ quá 24 giờ được đưa lên đầu hàng đợi để nhân viên liên hệ rồi mới hủy. Không tự động hủy vì khách có thể đã chuyển tiền.
- **Tài khoản nhân viên:** mỗi người một tài khoản, không dùng chung, mật khẩu lưu dạng hash.

## 7. Rủi ro và câu hỏi mở

**Rủi ro**

- **R1. Route đơn hàng chưa kiểm tra quyền (đã xác nhận trong code, phải xử lý trong Must 1):**
  - `GET /api/orders` trả toàn bộ đơn kèm tên, số điện thoại, email, địa chỉ; trang `/orders` liệt kê mọi đơn.
  - `GET /api/orders/:id` và `/orders/:id` chỉ cần mã đơn là xem được đầy đủ.
  - `PATCH /api/orders/:id` cho ai có mã đơn cũng hủy được đơn đang chờ xác nhận.
- **R2. Lộ thông tin qua nhãn gói hàng:** nhãn thường in cả mã đơn và số điện thoại, nên người nhặt được vẫn tra được đơn. Hướng xử lý là các luật tra đơn ở mục 6, kèm che số trên nhãn nếu đơn vị vận chuyển hỗ trợ. OTP để sau MVP. Rủi ro còn lại được chấp nhận: người đó vẫn biết trạng thái đơn.
- **R3. Sửa sai (đã xử lý ở mức tối thiểu):** MVP có xác nhận hai bước và đường lùi "Đã giao" cho quản lý. Khách vẫn có thể thấy "Đã giao" sai trong khoảng trước khi quản lý sửa, vì mục 8 vẫn ở Could.
- **R4. `.env.local` được giữ trong git làm file mẫu của khóa học:** người dùng xác nhận giá trị cũ chỉ là mẫu, và các giá trị đã đổi thành `replace_me`. Không thêm `DATABASE_URL` hay biến cấu hình thật vào file này, vì Next ưu tiên `.env.local` hơn `.env` nên giá trị mẫu sẽ đè giá trị thật.
- **R5. Đợt 1 lớn hơn phạm vi ban đầu:** gồm đủ 5 Must cộng Postgres, đăng nhập và hạ tầng test. Chưa có ước lượng.
- **R6. Test hiện có sẽ đỏ khi đóng route:** `src/app/api/orders/route.test.ts`, `e2e/shopping-flow.spec.ts` và `checkout-form.test.tsx` phải viết lại cùng thay đổi.

**Ca bắt buộc có test**

1. Mua đồng thời món cuối: đúng một đơn thành công, tồn không âm.
2. Hai người cùng hủy hoặc bấm đúp: chỉ hoàn kho một lần.
3. Hai nhân viên cùng đổi trạng thái: một bên thắng, không có dòng lịch sử mồ côi.
4. Lỗi giữa transaction khi đặt hoặc hủy: tồn kho và lịch sử giữ nguyên.
5. Chuyển sai thứ tự hoặc từ trạng thái cuối: bị từ chối, trừ thao tác lùi của quản lý.
6. Cookie bị sửa, hết hạn hoặc của đơn khác: bị từ chối.

**Câu hỏi cho PRD**

1. Ai đang đối soát chuyển khoản và hoàn tiền? Thời hạn hoàn tối đa là bao lâu, có thu phí không?
2. Số liên hệ của shop hiển thị cho khách là gì?
3. Hiện có bao nhiêu nhân viên và họ đang xử lý đơn thế nào?
4. Chỉ số nào xác định MVP thành công? Đề xuất: số đơn kẹt ở Chờ xác nhận quá X giờ và số lượt khách hỏi "đơn đâu".
5. Ngưỡng "quá hạn" của từng trạng thái là bao lâu (mục 13)?
6. Thông tin "khi nào giao" lấy từ đâu (mục 3)?
7. Nhân viên nào được xem thông tin khách hàng?
8. Ngưỡng giới hạn đặt đơn, số đơn đang mở và hạn mức dò theo IP là bao nhiêu?

## 8. Rủi ro đã nhận diện

Kịch bản Pre-mortem: tháng 5/2027 tính năng bị tắt vì web báo hết hàng dù kho còn đầy, nhân viên quay lại ghi sổ tay và không ai tin số trên hệ thống.

| # | Nguyên nhân thất bại | Cách phòng |
|---|---|---|
| P1 | Script gọi `POST /api/orders` không giới hạn, tạo đơn ảo rút cạn kho | Giới hạn tần suất theo IP và số đơn đang mở theo số điện thoại |
| P2 | Đơn chuyển khoản bỏ dở giữ kho mãi | Đưa đơn chờ quá 24 giờ lên đầu hàng đợi để liên hệ rồi hủy, không tự động hủy |
| P3 | Khóa theo cặp IP và mã đơn vẫn cho một IP dò nhiều mã; IP có thể bị giả | Thêm hạn mức tổng theo IP, chỉ đọc IP từ proxy đã cấu hình |
| P4 | Đặt bằng `0...` nhưng tra bằng `+84...` nên khách thật bị báo sai | Chuẩn hóa số điện thoại khi lưu và khi tra |
| P5 | Tài khoản dùng chung làm lịch sử "ai làm gì" mất giá trị | Mỗi người một tài khoản, mật khẩu lưu dạng hash |
| P6 | Nhân viên bỏ công cụ vì phải tự tìm việc | Mặc định là hàng đợi, đơn cũ nhất lên trước, dùng được trên điện thoại |
| P7 | Đợt 1 làm dở khiến khách mất đường xem đơn | Làm theo thứ tự ở mục 5, đóng route cũ sau cùng, chỉ phát hành khi đủ chuỗi |
