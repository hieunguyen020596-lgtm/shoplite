# Spine Pair Review — shoplite (lần 2)

## Overall verdict

Cặp spine đã tiến bộ rõ: 27/33 finding cũ đã đóng, 6 finding còn dư một phần, và 52/53 mục memlog vào spine đúng. Chưa nên chuyển sang kiến trúc ngay vì còn 3 điểm high, đều nhỏ khi sửa nhưng ảnh hưởng trực tiếp tới hợp đồng: lý do `Hết hàng` điều khiển Tồn kho mà chưa có mã máy đọc, kết quả hoàn tiền va vào câu "không lưu trạng thái đã thanh toán" của FR-21, và token `order-search` còn giữ viền cũ trái override. Hai điểm medium cần người dùng quyết định (M1, M2).

**Số lượng:** 0 critical, 3 high, 11 medium, 10 low (tổng 24).

**Cách kiểm chứng:** script đối chiếu token, tham chiếu, thẻ Assumption, link, anchor và bảng component; tính lại tương phản WCAG từ hex; đo mock bằng Chromium headless ở khung điện thoại và desktop; đọc code tại các vị trí spine viện dẫn. Theo phạm vi được giao, không nêu lại: wireframe cũ, giá trị thật của `SHOP_CONTACT_PHONE` và tài khoản ngân hàng, câu hỏi kỹ thuật đã chuyển sang kiến trúc, việc PRD chưa được cập nhật.

## Đối chiếu finding của review-rubric.md

Đánh số theo thứ tự xuất hiện trong bản review trước.

| # | Mức cũ | Finding | Kết quả | Bằng chứng hoặc phần còn lại |
|---|---|---|---|---|
| 1 | high | Hủy `Hết hàng` vẫn hoàn kho | Đã sửa | EXPERIENCE.md:106, 149-155, 287, 357, 416. Hệ quả mới ở H1, M1, M3 |
| 2 | high | Hoàn tiền thiếu nhánh chưa chuyển tiền | Đã sửa | EXPERIENCE.md:109-115, 397. Hệ quả mới ở H2, M2 |
| 3 | low | UJ-3 thiếu đường lỗi | Đã sửa | EXPERIENCE.md:393 |
| 4 | medium | Focus và viền ô nhập chưa đạt WCAG | **Một phần** | Focus đã đạt 6.46:1. Viền còn dư ở H3, M6, M7 |
| 5 | medium | Cỡ chữ delta ngoài thang | Đã sửa | DESIGN.md:116-141 |
| 6 | low | Frontmatter chưa đều | Đã sửa | DESIGN.md:120, 127, 148, 313, 328 |
| 7 | high | Cờ hoàn tiền không có hình ảnh | Đã sửa | DESIGN.md:296-307, 501; mock Hàng đợi có đủ hai nhãn |
| 8 | medium | Không có bề mặt lỗi ở Chi tiết đơn | Đã sửa | EXPERIENCE.md:213, 283-284 |
| 9 | medium | Vùng hai nút chưa đặc tả | Đã sửa | DESIGN.md:514-523 |
| 10 | medium | Vùng bấm `stock-conflict-row`, `staff-header` | Đã sửa | DESIGN.md:443, 494, 508; mock đo 44px và 40px |
| 11 | medium | `history-list` thiếu dòng đặc biệt | Đã sửa | DESIGN.md:512; EXPERIENCE.md:240 |
| 12 | medium | `order-search` lệch nút tìm | Đã sửa | DESIGN.md:495; EXPERIENCE.md:223; mock có nút `Tìm` 44px |
| 13 | low | Emoji `empty-state` | Đã sửa | DESIGN.md:525-535 |
| 14 | low | `form-field`, `card` chưa là component | Đã sửa | DESIGN.md:477-478 |
| 15 | low | Câu `overdue-label` ở Chi tiết đơn | Đã sửa | DESIGN.md:500; EXPERIENCE.md:101 |
| 16 | low | Link `Danh sách` | Đã sửa | EXPERIENCE.md:116 |
| 17 | medium | Thiếu lỗi tải, đang gửi | **Một phần** | Đã thêm phần lớn. `/orders`, `/staff/login` còn thiếu lỗi mạng (L4) |
| 18 | medium | Trả focus khi nút biến mất | **Một phần** | Đã có cho nút mở hộp thoại. Nút một lần bấm chưa có (M8) |
| 19 | medium | Không tab nào được chọn | **Một phần** | Đã giữ `aria-selected`. Phím mũi tên xung đột với A21 (M9) |
| 20 | low | Toast qua lần chuyển route | Đã sửa | EXPERIENCE.md:294 |
| 21 | low | Đích sau đăng nhập | Đã sửa | EXPERIENCE.md:263, 265 |
| 22 | low | `Esc` khi đã nhập | Đã sửa | EXPERIENCE.md:237, 286 |
| 23 | low | Nơi giữ từ khóa | Đã sửa | EXPERIENCE.md:223 |
| 24 | medium | Radio chọn sẵn trong mock | Đã sửa | 0 thuộc tính `checked`; EXPERIENCE.md:238 |
| 25 | medium | Mã đơn trong bảng không phải link | **Một phần** | `order-table` đã có link. `order-row` vẫn 0 link (M10) |
| 26 | low | Dòng quá hạn tô nền | Đã sửa | Mock không còn lớp `.over` |
| 27 | low | Ô `Nhập lý do` luôn hiện | Đã sửa | Mock chỉ còn câu mô tả |
| 28 | low | Tham chiếu hình ảnh chưa gắn flow | Đã sửa | EXPERIENCE.md:345, 365, 382 |
| 29 | low | Trạng thái nằm sau Đơn hàng ở 390px | Đóng theo quyết định | .memlog.md:54 giữ bố cục đã duyệt |
| 30 | low | Lặp nội dung | **Một phần** | Bảng câu bước kế tiếp đã gộp. Quy tắc mới lại lặp (L8) |
| 31 | medium | Điểm chuyển bố cục sai | Đã sửa | EXPERIENCE.md:334-335 khớp `page.tsx:108`, `checkout-form.tsx:140` |
| 32 | low | Thuật ngữ mới chưa vào Glossary | Đã sửa | EXPERIENCE.md:404 |
| 33 | low | Biên của quy tắc che | Đã sửa | EXPERIENCE.md:197-198; khớp `VN_PHONE_REGEX` |

**Tổng:** 26 đã sửa, 1 đóng theo quyết định, 6 còn một phần, 0 chưa xử lý.

## 1. Flow coverage — adequate

UJ-1, UJ-2, UJ-3 đúng tên PRD, có nhân vật, bước đánh số, cao trào và đường lỗi. Luồng phụ FR-21 đã có hai nhánh. Điểm yếu nằm ở hai nhánh nghiệp vụ mới sinh ra từ override.

### Findings

- **[high] H1.** Lý do `Hết hàng` điều khiển Tồn kho nhưng chưa có giá trị máy đọc được. Spine rẽ nhánh giao dịch theo một nhãn tiếng Việt, còn addendum chỉ có cột `lý do` dạng chữ. Nếu nhập `Hết hàng` qua `Khác`, đơn vẫn được hoàn kho và SM-C1 không đếm. Nếu ai đó đổi câu chữ của nhãn, nhánh không hoàn kho có thể mất. Dòng 8 và 14 của bảng thay đổi PRD chưa yêu cầu mã lý do, và mục chuyển sang kiến trúc không nêu (EXPERIENCE.md:102, 149-150, 238, 410, 416, 454; addendum.md:20). *Fix:* quy định server nhận mã lý do cố định (ví dụ `out_of_stock`, `other`), chỉ mã này quyết định việc hoàn kho và SM-C1, nhãn chỉ để hiển thị; thêm vào dòng 8 hoặc 14.
- **[medium] M1. Cần người dùng quyết định.** Không hoàn kho chỉ tránh cộng thêm, không gỡ được số ảo đã có. Ví dụ hệ thống ghi 3, thực tế 1. Đơn 1 cái làm hệ thống còn 2; phát hiện hàng hỏng hết nên hủy `Hết hàng`, hệ thống vẫn 2 trong khi thực tế 0, nên hai khách kế tiếp vẫn đặt được. Ngược lại, sản phẩm còn thật trong cùng đơn bị giảm vĩnh viễn. PRD không có thao tác chỉnh Tồn kho, nên câu "(SM-2)" ở spine hứa nhiều hơn thực tế, và SM-2 vẫn báo 0 vì đo trên số hệ thống (EXPERIENCE.md:155; PRD:388; addendum.md, bảng `inventory`). *Fix:* chọn một: thêm thao tác chỉnh Tồn kho cho Quản lý; hoặc chấp nhận chỉnh tay trong DB và ghi vào rủi ro §6.3; đồng thời sửa câu "(SM-2)" cho đúng phạm vi.
- **[medium] M2. Cần người dùng quyết định.** Khách có thể chuyển khoản muộn sau khi đơn đã ghi `Khách chưa chuyển tiền`. Đơn khi đó không có nút, không quay lại tab Cần hoàn tiền, dù trang khách vẫn bảo liên hệ shop nếu đã chuyển. Open Question về hoàn tác chỉ nói trường hợp bấm nhầm và đang xếp vào kỹ thuật, trong khi đây là quyết định nghiệp vụ (EXPERIENCE.md:167, 180, 397, 462). *Fix:* chọn một: cho Quản lý ghi thêm một kết quả mới (chỉ thêm dòng Lịch sử), hoặc chấp nhận xử lý ngoài hệ thống và ghi rõ vào luồng phụ.

## 2. Token completeness — adequate

326 tham chiếu `{path.to.token}` trong hai spine: 0 không resolve. 48 màu đều có hex. Mọi tỷ lệ tương phản công bố tính lại đều đúng. Chỉ có giao diện sáng, đã nói rõ.

### Findings

- **[high] H3.** Token `components.order-search.ring` vẫn là `{colors.border-control}` (1.49:1), trái override ở .memlog.md:56 và trái chính `form-field.ring-new-screens`. Đây là ô nhập quan trọng nhất của màn hình mới; ai sinh code từ frontmatter sẽ làm sai quyết định WCAG 1.4.11. Mock đúng (`#62748e`), nên chỉ token sai (DESIGN.md:206, 267, 477, 495). *Fix:* đổi thành `{colors.ink-muted}`, thêm `ring-focus: {colors.primary}`.
- **[medium] M6.** Viền lỗi `{colors.danger-border}` trên nền trắng chỉ đạt **2.86:1**, dưới 3:1. Khi ô nhập ở màn hình mới báo lỗi, viền 4.76:1 bị thay bằng viền không đạt, ngay tại dòng khẳng định đạt WCAG 1.4.11 (DESIGN.md:208, 477; EXPERIENCE.md:312). *Fix:* màn hình mới dùng `{colors.danger}` (4.53:1) cho viền lỗi.
- **[medium] M7.** A3 vẫn ghi "riêng viền ô nhập còn mở", trong khi memlog đã chốt và chính tài liệu xếp mục này vào "Đã giải quyết" (EXPERIENCE.md:312, 425, 453; .memlog.md:56). *Fix:* sửa A3 theo quyết định đã chốt.

## 3. Component coverage — adequate

Bảng DESIGN và EXPERIENCE khớp tên 100%, 0 thiếu mỗi chiều. Component delta đều có entry frontmatter (`refund-flag-label` chia theo hai biến thể).

### Findings

- **[medium] M10.** `order-row` chưa có cơ chế mở đơn dùng được bằng bàn phím. Spine nói "bấm vào thẻ", còn "link thật" chỉ nằm ở `order-table`. Mock đo được **0 link mở đơn trên cả 7 `order-row`**. Bọc cả thẻ bằng `<a>` thì lại lồng với `tel-link`, là HTML không hợp lệ (EXPERIENCE.md:226-227, 314; mockups/key-staff-queue.html). *Fix:* quy định Mã đơn là link thật, mở rộng vùng bấm ra cả thẻ bằng lớp phủ, `tel-link` nằm trên lớp đó.
- **[low] L2.** Chưa chốt biến thể cho `Lùi đơn`, `Đã xử lý hoàn tiền`, nút `Xác nhận` của hộp thoại hoàn tiền, `Tiếp tục nhập`, `Xóa tìm kiếm`; nút thử lại chưa có nhãn. Mock dùng primary cho `Lùi đơn` (EXPERIENCE.md:107-111, 138, 206-209, 256, 268, 278). *Fix:* thêm một dòng ánh xạ nút với biến thể và chốt nhãn `Thử lại`.
- **[low] L9.** Cột "Dùng ở" của `form-field` thiếu `order-search` (EXPERIENCE.md:210; DESIGN.md:495). *Fix:* thêm vào.

## 4. State coverage — adequate

Đã đi qua 7 surface. Trạng thái tải, gửi, lỗi, xung đột, 403, hết phiên đều đã có. Khoảng trống còn lại tập trung ở focus và các tương tác mới thêm.

### Findings

- **[medium] M8.** Nút một lần bấm không có đích focus. `Xác nhận đơn` và `Chuyển Đang giao` biến mất sau khi thành công, nhưng quy tắc dự phòng chỉ nói "nút đã mở hộp thoại". Người dùng bàn phím rơi về đầu trang đúng ở thao tác lặp lại nhiều nhất của UJ-1 (EXPERIENCE.md:237, 281, 296, 315, 352). *Fix:* đổi thành "nút vừa bấm hoặc nút đã mở hộp thoại biến mất thì focus về tiêu đề đơn".
- **[medium] M9.** Phím mũi tên trong `tablist` xung đột với A21. Spine dùng mũi tên để chuyển tab và "bấm sang tab khác thì xóa từ khóa", nhưng không nói tab kích hoạt tự động hay thủ công. Với kích hoạt tự động, chỉ cần nhấn mũi tên là mất kết quả tìm và tải lại dữ liệu. Sau Hủy, focus lại đặt đúng vào tab nên rủi ro càng cao. Bấm lại chính tab đang đánh dấu khi xem kết quả cũng chưa có quy tắc (EXPERIENCE.md:224, 302, 315, 317, 441). *Fix:* chốt kích hoạt thủ công (mũi tên chỉ di chuyển focus, `Enter` hoặc `Space` mới đổi tab) và quy định bấm lại tab đang chọn thì rời kết quả.
- **[medium] M11.** Lời hỏi lại của A22 chưa có quy tắc focus và trạng thái. Chưa nói focus chuyển tới đâu khi lời hỏi hiện ra, lời hỏi được đọc thế nào, nhấn `Esc` lần hai làm gì, và `Esc` trong lúc đang gửi có đóng hộp thoại không. Nếu đóng lúc đang gửi, đơn vẫn đổi Trạng thái sau khi người dùng tưởng đã bỏ (EXPERIENCE.md:138, 237, 286, 442). *Fix:* focus vào `Tiếp tục nhập`, nội dung đọc qua `role="alertdialog"` hoặc `aria-live`, `Esc` lần hai tương đương `Tiếp tục nhập`, và khóa đóng hộp thoại khi đang gửi.
- **[medium] M5.** "Màn hình mới" quyết định viền ô nhập, màu focus và phạm vi WCAG nhưng chưa được liệt kê. Ba chỗ không rõ: `/orders` và `/orders/:id` là route cũ được viết lại; `stock-conflict-row` là component mới nằm trong `/checkout` cũ, nên `Bỏ` (`button-ghost`) có thể giữ focus 2.63:1 (DESIGN.md:396-398, 477, 508; EXPERIENCE.md:312, 453). *Fix:* liệt kê route được tính là màn hình mới và ghi rằng component delta đặt trong trang cũ vẫn theo quy tắc mới.
- **[low] L3.** Sau khi Hủy một đơn mở từ kết quả tìm kiếm, spine chưa nói về lại kết quả hay về tab: dòng điều hướng ghi "giữ tab trước đó", A5 ghi giữ cả từ khóa. Nếu giữ kết quả thì cần tìm lại để không hiện Trạng thái cũ (EXPERIENCE.md:294, 315, 427). *Fix:* chốt một đích và ghi việc tải lại.
- **[low] L4.** `/orders` và `/staff/login` chưa có dòng lỗi mạng hoặc máy chủ. Cần nói rõ để `/orders` không dùng nhầm `Thông tin không đúng` khi server lỗi (EXPERIENCE.md:131, 251-254, 262-264, 337). *Fix:* thêm dòng dùng `Chưa thực hiện được. Vui lòng thử lại.`.
- **[low] L7.** Ghi chú trong hộp thoại Hủy luôn nhắc "Đơn chuyển khoản sẽ bật Cờ cần hoàn tiền", kể cả khi đang hủy đơn COD (EXPERIENCE.md:105-106). *Fix:* chỉ hiện vế sau với đơn chuyển khoản.
- **[low] L10.** Xử lý hoàn tiền trùng được xếp vào "Xung đột đồng thời", nhưng mã `INVALID_STATUS_TRANSITION` không áp dụng vì Trạng thái không đổi. Chưa nói lần ghi thứ hai bị từ chối thế nào (EXPERIENCE.md:283, 413, 415). *Fix:* thêm vào dòng 13 yêu cầu ghi đúng một lần và trả lỗi xung đột.

## 5. Visual reference coverage — adequate

Cả 6 file trong `mockups/`, `wireframes/` được link và có mô tả, câu "spine thắng" xuất hiện một lần, `imports/` trống. Mock đo bằng Chromium: nút mới 44px ở khung điện thoại, 40px ở desktop, `Tìm` 44px, 4 tab 90×44px, không tràn trong khung màn hình, viền ô tìm đúng `#62748e`, không có `checked`. Độ rộng tài liệu 434px khi mở mock ở 390px đến từ khung điện thoại trang trí, không phải giao diện.

### Findings

Không có finding riêng. Điểm lệch duy nhất của mock so với spine là `order-row` không có link, đã tính ở M10. Tab trong mock là `span` tĩnh nên không dùng để kiểm chứng hành vi bàn phím.

## 6. Bloat & overspecification — adequate

EXPERIENCE.md tăng từ 38 KB lên 47.5 KB, chủ yếu là microcopy và quy tắc có giá trị.

### Findings

- **[low] L8.** Quy tắc mới được chép ở nhiều nơi, đúng kiểu đã sinh ra các lệch như H3 và M7: `Esc` ở 5 chỗ (EXPERIENCE.md:138, 237, 286, 302, 442), vùng bấm 44/40px ở 5 chỗ (DESIGN.md:443, 545; EXPERIENCE.md:321, 332, 333), đích focus ở 3 chỗ (EXPERIENCE.md:237, 281, 315). *Fix:* giữ một nguồn cho mỗi quy tắc, nơi khác trỏ tới.

## 7. Inheritance discipline — thin

`sources` resolve đủ 4 file ở cả hai spine; UJ đúng nguyên văn; token và tên component nhất quán. **Memlog: 52/53 mục vào spine đúng** (45 decision, 5 override, 1 assumption, 2 event), riêng override viền ô nhập (dòng 56) mới vào một phần (H3, M7). Xếp thin vì bảng "Thay đổi cần cập nhật ở PRD" là đầu vào trực tiếp cho bước cập nhật PRD nhưng còn thiếu các điểm mang tải.

### Findings

- **[high] H2.** Hai kết quả hoàn tiền va vào FR-21: "Hệ thống không lưu trạng thái đã thanh toán". `Đã hoàn tiền` và `Khách chưa chuyển tiền` lưu chính sự thật về việc khách đã trả hay chưa, trong khi PRD đã giữ `payment_status` là ý kiến thiểu số chưa được chấp nhận. Dòng 6 của bảng thay đổi yêu cầu sửa FR-21 nhưng không nhắc câu này, nên kiến trúc sẽ gặp hai yêu cầu trái nhau khi thiết kế dữ liệu (EXPERIENCE.md:110, 408, 461; PRD:300, 336, 374; .memlog.md:41). *Fix:* thêm vào dòng 6: kết quả là bản ghi đối soát thủ công chỉ nằm trong Lịch sử, không phải trạng thái thanh toán, không điều khiển logic nào ngoài việc rời tab; sửa câu FR-21 tương ứng.
- **[medium] M3.** Bảng thay đổi PRD chưa đủ cho override `Hết hàng` và hoàn tiền. Còn thiếu: PRD:245 ("hoàn khi hủy"), PRD:322 (bảng thay đổi có chủ đích), FR-12 PRD:209 (Tồn kho "đổi" trong giao dịch), §6.3 PRD:362 (rủi ro bán thiếu đã chấp nhận), addendum.md:45 ("chuyển trạng thái có hoàn kho"), Glossary PRD:58 (quyền Quản lý chưa có `Đã xử lý hoàn tiền`), PRD:69 (định nghĩa Cờ), FR-6 PRD:134 (hàng Ngân hàng theo A6), FR-8 (đăng nhập lại về đúng trang). Dòng 14 còn trỏ tới "bảng chuyển Trạng thái", nhưng PRD không có bảng này (EXPERIENCE.md:399-416). *Fix:* bổ sung các vị trí trên.
- **[medium] M4.** FR-19 chưa ghi rằng phản hồi phải liệt kê **mọi** dòng thiếu. Memlog yêu cầu "moi dong thieu hien so con lai", nhưng code hiện dừng ở dòng thiếu đầu tiên và không trả dữ liệu có cấu trúc. Làm theo code, khách phải sửa từng dòng qua nhiều lần đặt (.memlog.md:18; EXPERIENCE.md:236, 247, 407; PRD:277; `src/features/orders/order-service.ts:70-75`). *Fix:* thêm vào dòng 5: `INSUFFICIENT_STOCK` trả toàn bộ dòng thiếu kèm `productId`, số yêu cầu và số còn lại.
- **[low] L5.** Hai tiêu đề cũ không còn đúng: "Delta duy nhất trong file component hiện có" và "Hiện có, giữ nguyên (trừ chữ badge Đã hủy)", trong khi `form-field` ngay bảng đó đã có delta thứ hai theo memlog (DESIGN.md:392, 468, 477; .memlog.md:56). *Fix:* sửa hai tiêu đề.
- **[low] L6.** Do's ghi "`size="md"` kèm `max-md:min-h-11` cho mọi nút mới", không chừa ngoại lệ nút `Tìm` cao 44px ở mọi khổ (DESIGN.md:443, 545). *Fix:* thêm "trừ `Tìm`".

## 8. Shape fit — strong

DESIGN.md đủ 8 mục đúng thứ tự chuẩn. EXPERIENCE.md đủ các mục mặc định. Responsive có mặt vì có nhiều khổ màn hình. Không có Inspiration là hợp lý. Các mục tự thêm đều phục vụ trực tiếp kiến trúc và story.

### Findings

- **[low] L1.** Dưới `md`, DOM đặt nút phụ trước nhưng `flex-col-reverse` đưa nút chính lên trên, nên thứ tự `Tab` ngược thứ tự nhìn, trái "`Tab` theo thứ tự đọc". Ảnh hưởng người dùng bàn phím ở cửa sổ hẹp hoặc zoom lớn. Spine chỉ nói khớp trên desktop (DESIGN.md:523; EXPERIENCE.md:302). *Fix:* ghi nhận là đánh đổi có chủ đích, hoặc đổi cách sắp xếp.

## Mechanical notes

- **Token:** 326/326 tham chiếu resolve; 48/48 màu có hex. `rounded.DEFAULT`, `rounded.3xl` không được tham chiếu nhưng đã có ghi chú giữ để kiểm kê.
- **Tương phản:** mọi tỷ lệ công bố đều đúng. Ngoài bảng: `danger-border` 2.86:1 (M6), `border-control` 1.49:1 (H3).
- **Link:** mọi link tương đối và anchor trong hai spine đều resolve; 4 `sources` mỗi file đều tồn tại.
- **Assumption:** 19 thẻ khớp 19 dòng bảng (A2-A10, A12-A19, A21, A22); không thẻ mồ côi. Bỏ A1, A11, A20 đúng như EXPERIENCE.md:420 giải thích. Nội dung A3 đã cũ (M7).
- **Component:** DESIGN và EXPERIENCE khớp tên 100%.
- **Frontmatter:** cả hai spine còn `status: draft`.
- **Mermaid:** không có sơ đồ Mermaid.
- **Workspace:** `.working/` vẫn còn bản mock cũ khác `mockups/`, và có `.DS_Store`. Nên dọn trước khi commit.
