---
source: .memlog.md (brainstorm 2026-11-21, status: complete)
downstream: bmad-prd / bmad-spec
---

# Intent: Vận hành đơn hàng ShopLite + khách theo dõi đơn

## Bài toán & mục tiêu

- Nhân viên chưa có công cụ xử lý đơn. Hiện chỉ có `cancelOrder`, chưa có luồng xác nhận → giao → đã giao.
- Mục tiêu: chốt phạm vi MVP trên codebase hiện có, ưu tiên luồng bán hàng chính từ đầu đến cuối trước các ngoại lệ, và nêu rõ rủi ro cùng câu hỏi cần trả lời trước khi viết PRD.

## Người dùng

- **Nhân viên cửa hàng**: xử lý hàng đợi đơn, xác nhận, giao hàng, hủy đơn.
- **Khách hàng không có tài khoản**: tự theo dõi trạng thái đơn tại `/orders/[id]`.

## Bối cảnh codebase (sự thật đã ghi nhận)

- Các trạng thái `pending/confirmed/shipping/delivered/cancelled` đã được định nghĩa nhưng mới có `cancelOrder`.
- Tồn kho là hằng số trong `src/data/products.ts` và không bị trừ khi khách đặt.
- Không có auth. `GET /api/orders` trả về mọi đơn, gồm tên, SĐT và địa chỉ khách.
- Dữ liệu lưu bằng file JSON. Repo không có AGENTS.md.
- Trạng thái `confirmed` có thể đóng vai "chờ lấy hàng".

## Phạm vi MVP (MoSCoW, người dùng chốt theo đề xuất của coach)

**Must**

- 1 Hàng đợi đơn cần xử lý (đơn chờ xác nhận).
- 2 Nhân viên xác nhận đơn.
- 10 Chuyển từ Đang giao sang Đã giao.
- 11 Kết quả "Giao thất bại", bên cạnh "Đã giao".
- 12 Quy tắc chuyển trạng thái chặt, không cho cập nhật tùy ý.
- 14 Giữ hàng khi khách đặt và nhả hàng khi đơn bị hủy. Mục này thay cho phương án trừ kho khi xác nhận.
- 15 Chặn tồn kho âm.
- 16 Danh tính nhân viên.
- 17 Khóa API đơn hàng và giới hạn quyền xem.
- 18 Lịch sử trạng thái đơn, kèm người thao tác.
- 19 Timeline tiến trình đơn cho khách (kiểu Shopee).

**Should**

- 3 Xác nhận đơn hàng loạt.
- 4 In phiếu giao hàng.
- 8 Hiện cho khách lý do hủy hoặc điều chỉnh đơn.
- 20 Cờ "đã nhận tiền chuyển khoản".
- 24 Bộ test kịch bản vận hành: 2 khách tranh món cuối, hủy đơn, giao thất bại, nhân viên cập nhật nhầm, gọi API không có quyền.

**Could**

- 5 Tạm hoãn đơn.
- 6 Ghi kết quả cuộc gọi xác nhận với khách.
- 9 Mốc "chuẩn bị hàng / bàn giao vận chuyển" riêng.
- 21 Đánh dấu đơn cần hoàn tiền để xử lý thủ công ngoài hệ thống.

**Won't (MVP)**

- 7 Hủy phần hàng thiếu. Thay bằng: hủy cả đơn kèm lý do. Không giao một phần, không tách đơn; chỉ giao khi đủ và đúng hàng.
- 13 Trừ kho khi xác nhận.
- 22 Đổi trả.
- 23 Quy trình hoàn tiền 5 trạng thái.

## Rủi ro đã xếp hạng (S×L, người dùng đồng ý với điểm coach đề xuất)

1. R1 Lộ dữ liệu khách qua API đơn công khai: 25
2. R3 Đơn bị bỏ quên hoặc chuyển trạng thái tùy tiện: 20
3. R2 Bán vượt kho: 12 (đồng hạng với R5)
4. R5 Không truy vết được ai làm gì, khi nào: 12
5. R7 Phạm vi lan man (AI, chatbot, analytics trước khi luồng chính hoàn chỉnh): 9
6. R4 Sai thanh toán (đánh dấu không có bằng chứng, không phân biệt COD/bank_transfer): 8 (đồng hạng với R6)
7. R6 Nhân viên không dùng, quay về Excel/Zalo: 8

## Insight thiết kế then chốt

- R1 và R5 cùng một gốc là chưa có danh tính nhân viên. Giải quyết mục 16 là tiền đề cho cả API ghi an toàn lẫn audit log.
- Audit log chỉ có giá trị khi mỗi nhân viên có danh tính riêng. Nếu dùng mật khẩu chung thì mục 18 mất ý nghĩa truy vết.
- Mục 18 (lịch sử trạng thái) đảm nhận ba vai: audit log nội bộ (R5), timeline cho khách (19) và kênh "báo khách" khi chưa có email/SMS (8). Xây một lần, dùng ở ba chỗ.
- Mục 14 (giữ hàng khi đặt) gắn chặt với việc tự hủy đơn quá hạn. Không có timeout thì đơn bị bỏ rơi sẽ khóa tồn kho mãi mãi, tức vấn đề "đơn nằm mãi ở Chờ xác nhận" chỉ chuyển sang tồn kho.
- SĐT khách vừa là kênh liên hệ, vừa là ứng viên làm khóa xác minh để khách tra đơn khi không có tài khoản.
- Màn hình nhân viên nên tối giản, xoay quanh danh sách đơn cần xử lý (để giảm R6).
- Tận dụng cấu trúc `Order` hiện có, dùng mô hình dữ liệu tối giản thay vì nhiều bảng.

## Câu hỏi mở (phải trả lời trước PRD)

1. Khách không có tài khoản xem đơn của mình thế nào khi API đã khóa? Dùng mã đơn + SĐT?
2. Danh tính nhân viên tối giản đến mức nào: mật khẩu chung hay tài khoản riêng? (Xem insight về audit log.)
3. Tồn kho lưu ở đâu, khi hiện đang là hằng số `.ts`? Ghi file JSON có an toàn khi 2 khách tranh món cuối không?
4. Đơn Chờ xác nhận giữ hàng bao lâu? Có tự hủy sau N giờ để nhả hàng không?
5. Ai giao hàng, shipper của cửa hàng hay đơn vị vận chuyển? Từ đó, ai được bấm Đã giao / Giao thất bại?
6. Ai chịu trách nhiệm báo khách, và qua kênh nào khi chưa có email/SMS?

## Đề xuất trả lời câu hỏi mở (coach đề xuất theo cách Shopee, chờ nhóm xác nhận trong PRD)

1. **Khách tra đơn:** Shopee dùng tài khoản. ShopLite không có tài khoản nên dùng **mã đơn + SĐT đặt hàng** để xem chi tiết. Trình duyệt nhớ các mã đơn đã đặt (localStorage) để `/orders` chỉ hiện đơn của chính máy đó. `GET /api/orders` (danh sách tất cả đơn) chỉ dành cho nhân viên.
2. **Danh tính nhân viên:** Shopee có tài khoản chủ shop và tài khoản phụ cho từng nhân viên. ShopLite dùng **tài khoản riêng cho mỗi nhân viên**, khai báo tĩnh trong cấu hình, chỉ một vai trò `staff`, đăng nhập bằng session cookie. Không có màn hình quản lý người dùng.
3. **Lưu tồn kho:** chuyển `stock` sang file ghi được (ví dụ `storage/inventory.json`), khởi tạo từ `products.ts`. Ghi tuần tự trong process (mutex) và ghi atomic (file tạm rồi rename). Giới hạn đã biết: chỉ an toàn khi chạy 1 instance.
4. **Thời hạn giữ hàng:** Shopee tự hủy đơn nếu người bán không xử lý đúng hạn. ShopLite tự hủy đơn `pending` sau **N giờ** (cấu hình được, mặc định 24h) với lý do "Quá hạn xác nhận" và nhả tồn kho. Có thể kiểm tra khi đọc đơn, không cần cron.
5. **Người giao hàng:** Shopee để đơn vị vận chuyển cập nhật trạng thái qua tích hợp. ShopLite chưa có tích hợp nên **nhân viên cập nhật thay** (Đang giao, Đã giao, Giao thất bại), lịch sử ghi lại ai bấm. Giao thất bại thì đơn kết thúc kèm lý do và cộng lại tồn kho.
6. **Báo khách:** Shopee đẩy thông báo tự động. ShopLite dùng **timeline + lý do** ở trang đơn làm kênh chính, khách tự xem. Chỉ các ngoại lệ (shop hủy đơn, giao thất bại) mới cần nhân viên đang xử lý đơn gọi điện và ghi chú vào đơn. MVP không có email/SMS.

## Ngoài phạm vi / giai đoạn 2

- Hoàn tiền đầy đủ và đổi trả. MVP chỉ ghi nhận trường hợp phát sinh (mục 21), xử lý thủ công ngoài hệ thống: không refund tự động, không phê duyệt nhiều cấp. Lý do: hoàn tiền chủ yếu chỉ phát sinh với bank_transfer, và luồng chính cần làm trước.
- Đầu vào cho PRD giai đoạn 2, theo thiết kế hoàn tiền người dùng đã dán:
  - Các vai: khách hàng, CSKH, quản lý (duyệt), kế toán (chuyển tiền). Người duyệt khác người chuyển tiền.
  - bank_transfer: khách cung cấp STK → đối chiếu giao dịch gốc → người có thẩm quyền duyệt → kế toán chuyển khoản thủ công → cập nhật kết quả vào hệ thống, có lưu bằng chứng (ảnh hoặc mã giao dịch).
  - COD: không tạo refund khi chưa thu tiền. Nếu khách đã trả tiền cho đơn vị vận chuyển thì đối soát trước khi hoàn.
  - Trạng thái: `refund_requested/approved/processing/completed/failed`.
  - Lịch sử liên hệ/thông báo khách: ai báo, qua kênh nào, nội dung gì.
  - Mục 20 là hạt giống của luồng này.

## Ràng buộc / nguyên tắc

- Không để AI tự xác nhận thanh toán hay hoàn tiền, cũng không để AI tự sửa giá, tồn kho hay xác nhận đơn. Các nghiệp vụ quan trọng luôn cần người có quyền thao tác.
- Không giả định có tài khoản khách, email, SMS hay payment gateway.
- Tránh over-engineering: hoàn thiện luồng chính trước, mỗi chức năng có tiêu chí nghiệm thu, làm sạch dữ liệu sản phẩm và tồn kho trước khi đưa AI vào.
