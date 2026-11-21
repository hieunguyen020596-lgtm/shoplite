# PRD Quality Review — ShopLite: Vận hành và theo dõi đơn hàng

## Overall verdict

PRD này chắc tay: có một luận điểm rõ ("một nguồn dữ liệu duy nhất về đơn hàng"), FR nào cũng có Consequences kiểm thử được, phần Non-Goals và "Thay đổi có chủ đích" trung thực, và các tham chiếu code trong addendum đều khớp với repo (đã đối chiếu từng file:dòng, sai lệch tối đa 1 dòng). Rủi ro nằm ở vài chỗ hành vi chưa chốt (Lùi đơn so với mốc thời gian phía khách, Tra đơn thành công trả gì, đăng nhập nhân viên không có chống dò), phần Success Metrics khó đo thật trong bối cảnh khóa học, và vài tham chiếu chéo/placeholder còn treo. Không có vấn đề critical; PRD đủ để chuyển sang kiến trúc và tạo story sau khi sửa các mục high.

## Decision-readiness — strong

Các quyết định được nêu như quyết định: khách không còn tự hủy (§4.8 bảng "Thay đổi có chủ đích"), không tự động hủy đơn (FR-9 "Không có đơn nào bị tự động hủy"), không chuyển 11 đơn thử, đóng route cũ sau cùng (§4.9 "Phát hành"). Cái bị bỏ đi được nêu rõ (Non-Goals, §6.2 kèm lý do FR-9 chỉ xử lý đơn chuyển khoản quá 24 giờ). Open Questions là câu hỏi thật, không tự trả lời (đặc biệt câu 5 về proxy và câu 6 về "Bài 4.4").

Điểm yếu: có hai câu hỏi mở làm FR hiện tại không kiểm thử được hoàn toàn (xem Findings), và Open Question 3 ("Thực tế có bao nhiêu Nhân viên") mâu thuẫn nhẹ với assumption "2 Nhân viên và 1 Quản lý" ở §9.

### Findings
- **medium** Open Question đang chặn một FR (§8 câu 5 so với FR-3) — FR-3 yêu cầu "Giá trị IP giả trong header không vượt được giới hạn" trong khi chưa biết ứng dụng đứng sau proxy nào. Bullet này không kiểm thử được cho tới khi câu 5 có đáp án. *Fix:* đánh dấu bullet đó phụ thuộc Open Question 5 (hoặc chốt giả định "tin IP từ socket, không tin `X-Forwarded-For`" bằng `[ASSUMPTION]`).
- **low** Mâu thuẫn nhẹ giữa §8 câu 3 và §9 dòng cuối — một bên hỏi số Nhân viên, bên kia coi 2+1 là giả định từ brief. *Fix:* chọn một; nếu giả định thì bỏ câu hỏi hoặc ghi rõ câu hỏi chỉ để xác nhận.

## Substance over theater — strong

Không có persona theater: ba vai (Khách hàng, Nhân viên, Quản lý) đều làm thay đổi FR cụ thể (che dữ liệu FR-2, 403 của Nhân viên ở FR-13, Hàng đợi FR-9). Vision (§1) nói đúng bốn sự cố cụ thể của sản phẩm này ("tồn kho không giảm khi bán", "ai cũng xem được dữ liệu cá nhân") nên không thể thay vào PRD khác. NFR (§4.9) chủ yếu có ràng buộc riêng sản phẩm ("các ca đồng thời chạy trên PostgreSQL thật, không mock"). Không có phần "đổi mới" gượng ép.

### Findings
- **low** NFR "Khả năng tiếp cận" thiên về tuyên bố (§4.9 "form và hộp xác nhận dùng được bằng bàn phím") — chưa có bound kiểm thử được (ví dụ độ tương phản, thứ tự focus). Chấp nhận được cho dự án khóa học. *Fix:* thêm một tiêu chí đo được hoặc bỏ qua có chủ đích.

## Strategic coherence — adequate

Luận điểm nhất quán và các FR bám theo nó: một bản ghi trạng thái + Lịch sử phục vụ khách, nhân viên, quản lý; thứ tự ưu tiên theo "chặn rò dữ liệu và bán quá tồn" trước. Loại MVP là problem-solving, phạm vi khớp. Counter-metrics có (SM-C1, SM-C2) và đúng chỗ.

Điểm yếu nằm ở Success Metrics. SM-3 ("100% lần đổi Trạng thái có dòng Lịch sử") và SM-4 ("0 route ... không kiểm tra quyền") là kiểm tra tính đúng của FR, không phải bằng chứng cho luận điểm. Metric thực sự đo luận điểm ("khách không phải hỏi đơn đâu", SM-5) lại là cái yếu nhất vì chưa có số nền.

### Findings
- **medium** Metric khó đo trong bối cảnh thật (§7) — "Đo trong 4 tuần đầu sau khi phát hành" và SM-1 "dưới 5%" giả định có lưu lượng đơn thật; repo hiện chỉ có 11 đơn thử và dự án là bài khóa học. SM-1, SM-5 sẽ không có mẫu. *Fix:* ghi rõ cách đo trong bối cảnh khóa học (ví dụ kịch bản demo/seed) hoặc đặt ngưỡng tuyệt đối thay vì tỷ lệ.
- **medium** SM-5 thiếu cách đo (§7) — "Số lượt Khách hàng hỏi 'đơn đâu'" không nói nguồn đếm (cuộc gọi? tin nhắn? ai ghi?). Không có FR nào ghi nhận số này. *Fix:* chỉ định nguồn dữ liệu và người ghi, hoặc thay bằng chỉ số đo được từ hệ thống (số lượt Tra đơn thành công).
- **low** SM-3 và SM-4 gần như trùng với Consequences của FR-14 và FR-4 (§7) — là bằng chứng nghiệm thu chứ không phải thước đo thành công. *Fix:* chuyển thành tiêu chí release, giữ SM cho kết quả người dùng.

## Done-ness clarity — adequate

Điểm mạnh nhất của PRD: hầu hết FR có Consequences là điều kiện kiểm thử được với số cụ thể (FR-3 "5 lần sai trong 15 phút", FR-16 "Tồn kho 1, N yêu cầu đồng thời: đúng 1 đơn thành công", FR-10 mã lỗi `INVALID_STATUS_TRANSITION`). Chỗ tối nghĩa còn lại tập trung ở vài hành vi chưa định nghĩa.

### Findings
- **high** FR-1/FR-4 không nói Tra đơn thành công thì hiển thị thế nào (§4.1) — FR-1 chỉ liệt kê các trường hợp từ chối. Addendum chỉ nói "có thể cấp Quyền xem đơn" (§Bản đồ route). Không rõ kết quả là trang riêng, chuyển tới `/orders/:id`, hay trả JSON; cũng không rõ cookie có được cấp không, nên FR-1 và FR-4 ("`/orders/:id` không có Quyền xem đơn thì chuyển tới Tra đơn") có thể dẫn tới vòng lặp. *Fix:* thêm Consequence: Tra đơn đúng thì cấp Quyền xem đơn và chuyển tới `/orders/:id` (hoặc quyết định ngược lại), kèm thời hạn cookie.
- **high** Hành vi phía khách sau Lùi đơn chưa đủ xác định (FR-7, FR-13, FR-15) — FR-7 nói "Mỗi mốc lấy thời gian từ Lịch sử" và "không thấy dòng Đã giao đã bị sửa", nhưng không nêu mốc "Đã giao" hiển thị ra sao khi đơn được giao lại lần hai (hai dòng Đã giao trong Lịch sử, một dòng bị lùi). Đây là chính tình huống của UJ-3. *Fix:* định nghĩa quy tắc chọn mốc (ví dụ "mỗi Trạng thái hiển thị dòng Lịch sử gần nhất chưa bị Lùi đơn") và thêm một ca test.
- **medium** Đăng nhập nhân viên thiếu hành vi (FR-8) — chỉ có 401/403, hash, phiên 8 giờ. Không có đăng xuất, không giới hạn thử mật khẩu sai (trong khi Tra đơn có FR-3), không nói hash bằng gì. Với một trang cho phép đổi trạng thái đơn, đây là bề mặt tấn công chính còn lại. *Fix:* thêm giới hạn thử sai cho đăng nhập (hoặc ghi vào Non-Goals) và tiêu chí đăng xuất.
- **medium** "HTTP 429 hoặc lỗi nghiệp vụ tương ứng" (FR-20) — hai lựa chọn tương đương cho kiểm thử, không rõ mã lỗi. Story sẽ phải tự chọn. *Fix:* chốt 429 với mã lỗi cụ thể theo định dạng `{ error: { code, message } }` (addendum đã nhắc thêm lỗi 401/403/429).
- **medium** Placeholder `[SĐT_SHOP]` nằm trong chuỗi cần kiểm thử (FR-7, thông báo đơn chuyển khoản đã hủy) — Open Question 1 chưa đóng, nên test không thể viết cố định. *Fix:* quy định lấy từ biến cấu hình (kèm tên biến) trong lúc chờ số thật.
- **low** FR-9 không nêu hành vi khi số đơn lớn (phân trang, giới hạn) — chấp nhận được với 11 đơn nhưng là câu hỏi đầu tiên của kỹ sư. *Fix:* một dòng "không phân trang trong MVP" nếu đó là quyết định.

## Scope honesty — strong

Non-Goals (§5) và §6.2 liệt kê rõ và dẫn nguồn lý do hoãn; ba FR có thêm `Out of Scope` cục bộ (FR-12). Các giá trị tự đặt (20 lần sai/IP, 7 ngày, 8 giờ, 10 đơn/giờ, 3 đơn chờ) đều gắn `[ASSUMPTION]` và có Open Question 4 để xác nhận ngưỡng. Mật độ mục mở (6 Open Questions, ~11 assumption) cao nhưng hợp lý cho bản draft, phần nhiều là ngưỡng cấu hình chứ không phải chặn thiết kế.

### Findings
- **low** Một số con số tự đặt chưa được gắn `[ASSUMPTION]` — FR-3 "5 lần sai trong 15 phút" (khóa theo IP + Mã đơn), FR-9 ngưỡng "24 giờ", FR-7 đặc tả câu "bước kế tiếp". Cùng bản chất với các giá trị đã gắn thẻ. *Fix:* gắn thẻ nhất quán hoặc ghi rõ 5/15/24 đến từ brief.
- **low** Điều "11 đơn thử không được chuyển sang" xuất hiện ở §4.8 và §6.2 nhưng không có người chịu trách nhiệm xác nhận (người dùng URL cũ sẽ gặp gì). *Fix:* thêm một dòng hành vi cho Mã đơn cũ (rơi về Tra đơn, "Thông tin không đúng").

## Downstream usability — adequate

Glossary đầy đủ và thuật ngữ nhìn chung dùng nhất quán (Đơn hàng, Trạng thái, Dữ liệu tối thiểu, Quyền xem đơn). ID FR-1 đến FR-21 liên tục, mỗi FR đều có "Realizes UJ-n" trừ FR-4 và FR-20 (hợp lý vì là ràng buộc hệ thống). UJ có người dẫn chuyện tên cụ thể (Thảo, Nam, Khoa) và đã được đánh dấu là bản nháp coach (§2.3), nên không trừ điểm vì chất lượng văn phong.

### Findings
- **medium** Tham chiếu chéo trỏ tới tài liệu khác nhưng trông như trỏ nội bộ (§6.2) — "mục 8, Could", "mục 13, Should", "mục 3, Should", "mục 12, Could" là số mục của brainstorm/brief, trong khi §8 và §3 của chính PRD là Open Questions và Glossary. Story creation đọc §6.2 độc lập sẽ hiểu sai. *Fix:* ghi tên tài liệu nguồn (ví dụ "brainstorm-intent.md, mục 8") hoặc bỏ số mục.
- **low** Thuật ngữ code lẫn với thuật ngữ miền (FR-10 `pending` → `delivered`, FR-18 `inStock`) — không có bảng ánh xạ Trạng thái tiếng Việt sang giá trị enum trong Glossary. *Fix:* thêm ánh xạ vào Glossary hoặc addendum.
- **low** Dữ liệu tối thiểu chưa khớp với Trang xác nhận (§3 so với FR-5) — Glossary liệt kê Trạng thái, mốc, tên sản phẩm, tên/SĐT đã che; FR-5 thêm tổng tiền, phương thức giao và thanh toán. *Fix:* nêu rõ Trang xác nhận là tập con hay tập mở rộng.

## Shape fit — strong

Brownfield được xử lý đúng: §4.8 tách "Phải giữ nguyên" và "Thay đổi có chủ đích", và addendum liệt kê điểm chạm code. Em đã đối chiếu với `/src`: `calculateOrderTotals`, `MAX_QUANTITY_PER_ITEM` (=10), `FREE_SHIPPING_THRESHOLD` (=500_000), `VN_PHONE_REGEX`, 5 mã lỗi trong `order-errors.ts`, `findAll/findById/save` trong `order-repository.ts`, nút hủy khách ở `orders/[id]/page.tsx:69`, `generateStaticParams` ở `products/[slug]/page.tsx`, các test bị ảnh hưởng, Next 16.4.2, không có `.github`, `storage/orders.json` có 11 đơn — tất cả tồn tại và khớp (lệch dòng tối đa khoảng 1). UJ cho một sản phẩm có cả khách và vận hành là đúng hình dạng; ba UJ là vừa đủ, không thừa.

### Findings
- **low** UJ-3 không có edge case, khác UJ-1 và UJ-2 (§2.3) — ví dụ Quản lý Lùi đơn khi đơn đã bị hủy hoặc khách đang xem trang. Dù đã đánh dấu bản nháp, đây là hành trình mang rủi ro cao nhất (đổi lịch sử). *Fix:* thêm một edge case khi landv sửa lại UJ.

## Mechanical notes

- **Glossary drift:** nhẹ. "Đơn chuyển khoản", "đơn COD" dùng ở FR-9, FR-21 nhưng không có trong Glossary (là cách gọi thuộc phương thức thanh toán). "Tên người nhận" (FR-11) và "tên khách" cùng chỉ một dữ liệu nhưng không thống nhất.
- **ID continuity:** FR-1 đến FR-21, UJ-1 đến UJ-3, SM-1 đến SM-5 và SM-C1, SM-C2 liên tục, không trùng. Mọi "Realizes UJ-n" và "Validates FR-n" đều trỏ tới ID tồn tại. Cross-ref "FR-10 và FR-11" trong FR-13 đúng.
- **Assumptions Index roundtrip:** các tag inline (§2.3, FR-3, FR-5, FR-7 x2, FR-8, FR-9, FR-20 x2, FR-21, §7, SM-1, SM-5) đều có trong §9. Ngược lại mục "Từ brief: 2 Nhân viên và 1 Quản lý... hoàn tay trong 3 ngày làm việc, không thu phí" nằm trong index nhưng không có tag inline ở đâu trong PRD, và nội dung "hoàn tay trong 3 ngày" không xuất hiện ở bất kỳ FR nào.
- **UJ protagonist:** cả ba UJ có nhân vật tên và vai (Thảo, Nam, Khoa); "Nam" không nêu vai nhưng là Khách hàng rõ ràng.
- **Required sections:** đủ (Vision, Target User, Glossary, Features, Non-Goals, MVP, SM, Open Questions, Assumptions). Addendum tách riêng tốt, trỏ về addendum của brief; đường dẫn `../../briefs/brief-shoplite-2026-11-21/addendum.md` tồn tại.
- **Addendum:** quyết định ORM còn mở ("Chạy thử một đơn trừ kho thật trên Next 16.4.2 trước khi chốt ORM") — hợp lý nhưng nên gắn thẻ là việc mở để kiến trúc nhặt. Lưu ý `.env.local` đang bị sửa trong git status; addendum cảnh báo đúng không khai báo `DATABASE_URL` ở đó (không đọc giá trị).
