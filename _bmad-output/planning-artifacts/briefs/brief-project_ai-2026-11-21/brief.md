---
title: "Product Brief — Vận hành đơn hàng ShopLite & theo dõi đơn cho khách"
status: final
created: 2026-11-21
updated: 2026-11-21
inputs:
  - _bmad-output/brainstorming/brainstorm-shoplite-order-ops-2026-11-21/brainstorm-intent.md
  - README.md
downstream: bmad-prd (_bmad-output/planning-artifacts/prds/prd-project_ai-2026-11-21/)
---

# Product Brief: Vận hành đơn hàng ShopLite

## Tóm tắt

ShopLite đã có đủ luồng mua hàng: xem sản phẩm, bỏ giỏ, thanh toán, tạo đơn. Phía sau thì chưa có gì. Đơn mới vào nằm ở trạng thái _Chờ xác nhận_ và không có công cụ nào để nhân viên xác nhận, giao hay đóng đơn. Hệ thống đã khai báo các trạng thái `confirmed`, `shipping`, `delivered` nhưng chưa thao tác nào dẫn đến chúng. Cùng lúc đó, bất kỳ ai cũng đọc được tên, số điện thoại và địa chỉ của mọi khách qua `GET /api/orders`.

Tính năng này hoàn thiện nửa sau của luồng bán hàng. Nhân viên có tài khoản riêng và một hàng đợi đơn cần xử lý. Họ chuyển đơn theo các bước cố định: xác nhận, giao, rồi kết thúc là đã giao hoặc giao thất bại. Mỗi lần chuyển đều được ghi lại người làm và thời điểm. Tồn kho được giữ ngay khi khách đặt và nhả ra khi đơn bị hủy, nên không bán vượt số hàng đang có. Khách không cần tài khoản: họ nhập mã đơn và số điện thoại để xem tiến trình đơn dạng timeline.

Vì sao làm bây giờ: mỗi tính năng mới ở phía khách (mã giảm giá, gợi ý, AI…) sẽ tạo thêm đơn mà cửa hàng chưa có cách xử lý. Lỗ hổng dữ liệu khách là rủi ro lớn nhất trong bảng xếp hạng (điểm 25/25) và tồn tại từ ngày đầu chạy.

## Vấn đề

**Phía cửa hàng.** Nhân viên không có màn hình nào để làm việc với đơn. Muốn biết có đơn mới phải mở trang `/orders`, vốn dành cho khách, hoặc đọc `storage/orders.json`. Sau đó họ theo dõi tiến độ ngoài hệ thống, bằng Excel hoặc Zalo. Hậu quả:

- Đơn có thể nằm mãi ở _Chờ xác nhận_ mà không ai để ý (R3).
- Tồn kho là hằng số trong code và không bị trừ khi khách đặt. Hai khách có thể cùng mua món cuối cùng, và cửa hàng chỉ phát hiện khi đi lấy hàng (R2).
- Khi có sai sót thì không truy được ai đã đổi trạng thái đơn, vào lúc nào (R5).

**Phía khách.** Sau khi đặt, khách chỉ thấy _Chờ xác nhận_ và không biết đơn đang ở đâu hay vì sao bị hủy. Shop không có email hay SMS để báo khách.

**Phía an toàn dữ liệu.** `GET /api/orders` và trang `/orders` trả về toàn bộ đơn cùng thông tin cá nhân của khách. Ai biết mã đơn đều có thể hủy đơn qua `PATCH /api/orders/:id`. Với một cửa hàng đang chạy, đây là sự cố đang diễn ra chứ không còn là rủi ro lý thuyết.

## Giải pháp

1. **Nhân viên đăng nhập bằng tài khoản riêng.** Danh sách tài khoản khai báo tĩnh trong cấu hình, chỉ có một vai trò `staff`, phiên đăng nhập lưu bằng session cookie. Không có màn hình quản lý người dùng. Tài khoản phải riêng cho từng người vì lịch sử thao tác chỉ có ý nghĩa khi biết đúng ai đã làm.
2. **Hàng đợi đơn cần xử lý.** Màn hình tối giản, mặc định hiện các đơn chờ xác nhận, cũ nhất lên đầu. Từ đây nhân viên xác nhận, chuyển sang giao, đánh dấu đã giao hoặc giao thất bại, hoặc hủy đơn kèm lý do.
3. **Quy tắc chuyển trạng thái cố định.** `pending → confirmed → shipping → delivered | failed`. `failed` là trạng thái mới, chưa có trong code. Khách chỉ tự hủy được khi đơn còn `pending`. Nhân viên hủy được ở `pending` hoặc `confirmed`, kèm lý do (để xử lý trường hợp thiếu hàng: hủy cả đơn). Hệ thống từ chối mọi bước chuyển nằm ngoài sơ đồ, kể cả khi gọi thẳng API.
4. **Giữ hàng khi đặt.** Tồn kho chuyển ra một file có thể ghi. Khi khách đặt, hệ thống giữ số hàng tương ứng. Khi đơn bị hủy, giao thất bại hoặc quá hạn, hệ thống nhả hàng ra. Tồn kho không bao giờ xuống âm. Đơn `pending` quá N giờ (mặc định 24h, cấu hình được) tự hủy với lý do "Quá hạn xác nhận".
5. **Lịch sử trạng thái.** Mỗi lần chuyển trạng thái ghi lại trạng thái mới, thời điểm, người thao tác và lý do nếu có. Một nguồn dữ liệu này phục vụ ba việc: nhật ký kiểm tra nội bộ, timeline cho khách, và nơi báo cho khách khi chưa có email/SMS.
6. **Khách tra đơn bằng mã đơn và số điện thoại.** Trang đơn hiện timeline tiến trình và lý do khi đơn bị hủy hoặc giao thất bại. Trình duyệt nhớ các mã đơn đã đặt trên máy đó. Chỉ nhân viên mới xem được danh sách tất cả đơn.

Khi shop hủy đơn hoặc giao thất bại, nhân viên đang xử lý đơn gọi điện cho khách và ghi chú vào đơn. Mọi trường hợp khác, khách tự xem trên timeline.

## Người dùng

- **Nhân viên cửa hàng** (2–5 người, chung một vai trò). Họ cần biết đơn nào đang chờ mình, xử lý nhanh mà không sợ bấm nhầm, và muốn nhìn vào một màn hình thay vì nhắn qua lại. Nếu công cụ chậm hơn Zalo, họ sẽ quay về Zalo (R6). Vì vậy độ gọn của màn hình là yêu cầu, không phải chuyện thẩm mỹ.
- **Khách mua không có tài khoản.** Họ muốn biết đơn đã được nhận chưa, đang giao chưa, và nếu bị hủy thì vì sao. Đổi lại, họ chỉ phải nhớ mã đơn và số điện thoại đã dùng khi đặt.
- **Chủ cửa hàng** (gián tiếp). Khi có khiếu nại, họ cần trả lời được câu hỏi "ai đã làm gì với đơn này".

## Tiêu chí thành công

| Mục tiêu                        | Chỉ số                                                                                   | Ngưỡng                                     |
| ------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------ |
| Khóa dữ liệu khách              | Gọi danh sách đơn hoặc API ghi khi chưa đăng nhập                                        | 100% bị từ chối (401/403)                  |
| Khách chỉ xem được đơn của mình | Tra đơn với SĐT sai                                                                      | Không lộ bất kỳ thông tin cá nhân nào      |
| Không bỏ quên đơn               | Đơn `pending` quá N giờ mà chưa được xử lý hoặc tự hủy                                   | 0                                          |
| Không bán vượt kho              | Đơn được tạo khi tồn khả dụng không đủ, kể cả hai khách tranh món cuối                   | 0; tồn kho không bao giờ âm                |
| Truy vết được                   | Lần chuyển trạng thái thiếu người thao tác hoặc thời điểm                                | 0                                          |
| Nhân viên thực sự dùng          | Đơn đi hết vòng đời (`delivered`/`failed`/`cancelled`) trong hệ thống                    | ≥ 90% sau 2 tuần chạy thật                 |
| Có test bảo vệ                  | Bộ test kịch bản: tranh món cuối, hủy, giao thất bại, cập nhật nhầm, gọi API không quyền | Đều có test tự động và qua `npm run check` |

## Phạm vi

**Có trong MVP:** hàng đợi đơn; xác nhận; chuyển sang giao; đã giao hoặc giao thất bại; quy tắc chuyển trạng thái cố định; giữ và nhả tồn kho, tự hủy khi quá hạn, chặn tồn âm; tài khoản nhân viên; khóa API đơn và giới hạn quyền xem; lịch sử trạng thái kèm người thao tác; timeline cho khách.

**Nên có nếu kịp:** xác nhận nhiều đơn cùng lúc; in phiếu giao hàng; hiện lý do hủy hoặc điều chỉnh cho khách; cờ "đã nhận tiền chuyển khoản" do nhân viên đánh dấu; bộ test kịch bản vận hành.

**Không làm trong MVP:** giao một phần hay tách đơn (thiếu hàng thì hủy cả đơn kèm lý do); trừ kho khi xác nhận (đã thay bằng giữ hàng khi đặt); đổi trả; quy trình hoàn tiền (MVP chỉ đánh dấu đơn cần hoàn để xử lý thủ công, xem addendum); email, SMS, payment gateway, tích hợp đơn vị vận chuyển; tài khoản khách; AI tự xác nhận đơn, thanh toán, giá hoặc tồn kho.

## Ràng buộc

- **Không có ngân sách cho dịch vụ ngoài, không thêm database.** Đơn và tồn kho lưu bằng file JSON, giữ cấu trúc `Order` hiện có. Hệ quả đã chấp nhận: thao tác ghi chỉ an toàn khi chạy **một instance**. Muốn mở rộng ngang thì phải đổi cách lưu trữ, và đó là quyết định của giai đoạn sau.
- Các nghiệp vụ quan trọng (xác nhận đơn, thanh toán, hoàn tiền, giá, tồn kho) luôn do người có quyền thực hiện.
- Không làm hỏng luồng mua hàng đang chạy. Đơn cũ trong `orders.json` phải đọc được sau khi nâng cấp.

## Rủi ro & câu hỏi còn mở

- **Khách tra đơn bằng mã đơn và SĐT có đủ an toàn không.** Mã đơn có thể đoán được (ví dụ `SL-…`), còn SĐT thì nhiều người biết. Mức này chấp nhận được cho MVP; PRD cân nhắc giới hạn số lần thử.
- **Tự hủy khi đọc đơn thay vì chạy cron.** Cách này đơn giản, nhưng nếu không ai mở hệ thống thì hàng vẫn bị giữ. Cần quyết định cụ thể trong PRD.
- **Nhân viên có chịu bỏ Zalo/Excel không (R6).** Chỉ biết được khi chạy thật, nên chỉ số "nhân viên thực sự dùng" ở trên cần người theo dõi.
- **Sáu câu trả lời cho câu hỏi mở được chấp nhận theo đề xuất của coach** (mô phỏng cách Shopee làm). Nhóm cần xác nhận lại trong PRD, nhất là N = 24h và việc nhân viên cập nhật trạng thái giao hàng thay cho đơn vị vận chuyển.

## Tầm nhìn

Khi luồng chính chạy ổn và dữ liệu đơn, tồn kho đã sạch, ShopLite có nền để làm tiếp: quy trình hoàn tiền có phân vai và lưu bằng chứng, nhật ký liên hệ với khách, tích hợp đơn vị vận chuyển để họ tự cập nhật trạng thái, và chỉ sau đó mới đến các trợ lý AI. Lịch sử trạng thái xây trong MVP là nguồn dữ liệu chung cho tất cả các bước này.
