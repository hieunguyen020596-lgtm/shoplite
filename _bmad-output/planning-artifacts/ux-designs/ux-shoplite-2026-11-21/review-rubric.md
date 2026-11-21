# Spine Pair Review — shoplite

## Overall verdict

Cặp spine đủ tốt để làm hợp đồng cho kiến trúc sau khi chốt 3 điểm high: toàn bộ 34 mục memlog đã vào spine, token và link resolve sạch, không có finding critical. Hai điểm high là lỗ hổng nghiệp vụ nằm ngay trong quyết định đã chốt (hủy vì `Hết hàng` vẫn hoàn kho; `Đánh dấu đã hoàn tiền` ghi sai sự thật khi khách chưa hề chuyển tiền), điểm còn lại là Cờ cần hoàn tiền chưa có biểu hiện hình ảnh. Các finding medium chủ yếu là chỗ story-dev phải tự đoán: bề mặt báo lỗi ở Chi tiết đơn, vùng thao tác có hai nút, và vài mâu thuẫn giữa quy tắc chung với đặc tả component.

**Số lượng:** 0 critical, 3 high, 13 medium, 17 low (tổng 33).

**Cách kiểm chứng:** script đối chiếu token, tham chiếu, link, anchor và bảng component; tính lại tương phản WCAG; quy đổi OKLCH từ `node_modules/tailwindcss/theme.css` v4.3.3 sang hex; đo mock bằng Chromium headless; đọc code tại các vị trí spine gọi là "Hiện có". Theo phạm vi được giao, không đánh giá việc không thiết kế lại và không có dark mode.

## 1. Flow coverage — adequate

Đã kiểm UJ-1, UJ-2, UJ-3: tên đúng nguyên văn PRD, có nhân vật, bước đánh số, cao trào; UJ-1 và UJ-2 có đường lỗi. Luồng phụ FR-21 có mặt nhưng thiếu nhánh rẽ quan trọng.

### Findings

- **[high]** Lý do Hủy `Hết hàng` vẫn hoàn Tồn kho. Tồn kho đã trừ lúc đặt, nên hủy vì hết hàng chỉ xảy ra khi hàng thực tế thiếu (đếm sai, hỏng, thất lạc). Khi đó quy tắc "Hoàn đúng một lần" và câu `Tồn kho được hoàn ngay` cộng lại số hàng không tồn tại, sản phẩm hiện còn hàng và khách kế tiếp đặt được: bán quá tồn thực tế mà SM-2 vẫn báo 0 (EXPERIENCE.md:107, 109, 145; .memlog.md:35; PRD FR-17, SM-2). *Fix:* chốt quy tắc riêng cho lý do này, ví dụ không hoàn kho (cần thêm ngoại lệ FR-17 vào bảng thay đổi PRD) hoặc vẫn hoàn nhưng có bước điều chỉnh tồn; đổi câu ghi chú trong hộp thoại theo lý do.
- **[high]** `Đánh dấu đã hoàn tiền` không có nhánh "khách chưa chuyển tiền". Cờ bật cho mọi đơn chuyển khoản bị hủy, trong khi hệ thống không biết khách đã trả hay chưa (FR-21). Nếu đối soát sao kê không thấy tiền, Quản lý chỉ có một cách gỡ đơn khỏi tab là ghi vào Lịch sử rằng đã hoàn tiền, tức tạo dấu vết sai trong chính nguồn dữ liệu sản phẩm dùng làm bằng chứng. PRD dùng từ trung tính hơn là "đánh dấu đã xử lý" (EXPERIENCE.md:119-122, 159, 271, 361, 372; .memlog.md:29; PRD FR-21). *Fix:* đổi thành `Đánh dấu đã xử lý` kèm kết quả (`Đã hoàn tiền` / `Không nhận được tiền`), hoặc thêm thao tác thứ hai; bổ sung nhánh này vào luồng phụ.
- **[low]** UJ-3 có edge case nhưng không có đường lỗi khi Lùi đơn thất bại; hành vi chỉ suy ra được từ State Patterns (EXPERIENCE.md:357, 261). *Fix:* thêm một dòng **Lỗi** như UJ-1.

## 2. Token completeness — adequate

Đã kiểm 80 tham chiếu `{path.to.token}` trong hai spine: 0 không resolve. 46 màu đều có hex hợp lệ và khớp giá trị quy đổi từ OKLCH (sai lệch tối đa 2/255 mỗi kênh). 14 tỷ lệ tương phản công bố đều tính lại đúng. Chỉ có giao diện sáng và tài liệu nói rõ, nên không cần cặp sáng/tối.

### Findings

- **[medium]** Mục tiêu WCAG 2.2 AA không đạt được với token focus đang giữ. `{colors.focus-neutral}` trên nền trắng chỉ 2.63:1, dưới ngưỡng 3:1 của SC 1.4.11, và đây là viền focus thật của `button-secondary`, `button-ghost` (`src/components/ui/button.tsx:11-12`), tức các nút `Sao chép`, `Quay lại`, `Bỏ`, `Đăng xuất` trên màn hình mới. Viền `form-field` `{colors.border-control}` chỉ 1.49:1. Sửa thì phá câu "delta duy nhất", không sửa thì không đạt A3 (DESIGN.md:26-27, 354, 372; EXPERIENCE.md:286). *Fix:* thêm delta focus cho màn hình mới (ví dụ `{colors.ink-muted}` hoặc `{colors.primary}`) hoặc thu hẹp A3 và ghi rõ ngoại lệ.
- **[medium]** Cỡ chữ delta trái với quy tắc của chính tài liệu. Dòng mở đầu nói delta "chỉ được lắp từ palette, cỡ chữ, bo góc sẵn có", nhưng `order-code` 22px, `order-code-lg` 26px, `tab-label` 13px không thuộc thang Tailwind và phải dùng giá trị tùy ý, trong khi Do's yêu cầu "dùng class Tailwind đúng như bảng token" (DESIGN.md:336, 116-137, 490). *Fix:* đổi sang `text-xl`/`text-2xl`/`text-xs`, hoặc ghi đây là ngoại lệ có chủ đích kèm class cụ thể.
- **[low]** Frontmatter chưa đều: `masked-recipient` là component delta nhưng không có entry; `order-code-block` chỉ trỏ `order-code`, thiếu biến thể desktop; `order-code`, `order-code-lg` không có `lineHeight`; `rounded.DEFAULT`, `rounded.3xl` không được dùng (DESIGN.md:116-127, 145, 150, 294-297, 479). *Fix:* bổ sung hoặc bỏ.

## 3. Component coverage — adequate

Tên component khớp hoàn toàn giữa DESIGN.md.Components và EXPERIENCE.md.Component Patterns (0 thiếu mỗi chiều), quy tắc hành vi đều thực chất. Khoảng trống nằm ở những thứ chưa thành component.

### Findings

- **[high]** Cờ cần hoàn tiền không có biểu hiện hình ảnh. DESIGN.md chỉ nhắc hoàn tiền ở `tab-count`; `order-row`, `order-table` và Chi tiết đơn không có nhãn nào. Ở tab Đã hủy không phân biệt được đơn cần hoàn, đơn đã xử lý và đơn COD; Nhân viên mở đơn có cờ cũng không thấy gì vì nút bị ẩn (DESIGN.md:359, 470-473; EXPERIENCE.md:63, 159-160, 216-218). *Fix:* thêm component `refund-flag-label` với hai trạng thái (cần hoàn, đã xử lý), đặt ở dòng, cột Nhãn và đầu Chi tiết đơn.
- **[medium]** Không có bề mặt cho lỗi ở Chi tiết đơn. `error-banner` chỉ khai báo cho Đặt hàng, Tra đơn, Đăng nhập; `toast` là `role="status"` cho báo ngắn. Các câu xung đột đồng thời, 403 và lỗi mạng chỉ ghi là "báo" (EXPERIENCE.md:203, 228, 250, 260-261, 292). *Fix:* chỉ định: lỗi trong hộp thoại dùng `error-banner`, xung đột sau khi đóng hộp thoại dùng `error-banner` đầu trang hoặc toast biến thể `role="alert"`.
- **[medium]** Vùng thao tác có hai nút chưa được đặc tả. Chờ xác nhận và Đã xác nhận có hai nút (`Xác nhận đơn` + `Hủy đơn`), nhưng biến thể của nút mở hộp thoại `Hủy đơn` không được chốt: `button-danger` "chỉ cho xác nhận hủy", còn `button-secondary` được mô tả cho thao tác không đổi dữ liệu. Mock chỉ vẽ đơn Đã giao có một nút (EXPERIENCE.md:32, 154-155, 196-199; DESIGN.md:496). *Fix:* chốt biến thể và thứ tự hai nút ở 390px và desktop.
- **[medium]** `stock-conflict-row` và `staff-header` trái quy tắc vùng bấm. `Lấy N`, `Bỏ` cỡ `sm` (32px) ở `/checkout` trên điện thoại, trong khi A1 yêu cầu 44px cho điều khiển mới và Don't cấm nút thao tác chính cỡ `sm` ở 390px. `Đăng xuất` đo được 32px trong mock (DESIGN.md:416, 467, 480, 494; EXPERIENCE.md:295, 387). *Fix:* dùng `lg` hoặc thêm vùng bấm 44px quanh nút.
- **[medium]** `history-list` chưa đặc tả các dòng không phải chuyển Trạng thái. Đặc tả là "hai `order-status-badge` nối bằng mũi tên", nhưng dòng tạo đơn không có Trạng thái cũ và dòng hoàn tiền không đổi Trạng thái. Mock tự thêm nhãn `Tạo đơn` ở cột Trạng thái cũ, spine không ghi (DESIGN.md:484; EXPERIENCE.md:122, 229, 421; mockups/key-staff-order-detail.html). *Fix:* định nghĩa cách hiển thị hai loại dòng này, độc lập với cách lưu mà kiến trúc sẽ chốt.
- **[medium]** `order-search` lệch giữa hai spine: EXPERIENCE ghi "Gửi bằng Enter hoặc nút tìm", DESIGN không có nút và mock chỉ có icon trang trí `aria-hidden` (EXPERIENCE.md:213; DESIGN.md:468; mockups/key-staff-queue.html). *Fix:* thêm nút tìm vào DESIGN và mock, hoặc bỏ khỏi EXPERIENCE.
- **[low]** `empty-state` bắt buộc prop `emoji` (`src/components/ui/empty-state.tsx:4`) nhưng tab trống và không có kết quả chưa chọn emoji (EXPERIENCE.md:134, 204). *Fix:* chốt emoji hoặc cho prop tùy chọn, và tính đó là thay đổi component.
- **[low]** DESIGN liệt kê `form-field` và `card` là thứ "dùng lại", nhưng trong code chúng không phải component: `form-field` là hằng cục bộ `inputClass` (`checkout-form.tsx:50`), `card` là chuỗi class lặp lại (DESIGN.md:450-451, 491). *Fix:* ghi rõ cần tách dùng chung khi build.
- **[low]** `overdue-label` được dùng ở Chi tiết đơn nhưng chỉ có câu chữ cho dòng và cột bảng (EXPERIENCE.md:106, 218; DESIGN.md:473). *Fix:* chốt câu cho Chi tiết đơn.
- **[low]** Link quay lại `Danh sách` có trong mock nhưng không có trong component hoặc microcopy của luồng thường (mockups/key-staff-order-detail.html; EXPERIENCE.md:131). *Fix:* thêm vào `/staff/orders/:id`.

## 4. State coverage — adequate

Đã đi qua 7 surface trong IA. Trạng thái nghiệp vụ được phủ tốt (thiếu hàng, xung đột, 403, hết phiên, không có kết quả). Thiếu chủ yếu ở lỗi khi tải và trạng thái đang gửi.

### Findings

- **[medium]** Thiếu trạng thái lỗi tải và đang gửi: `/staff` và `/staff/orders/:id` không có lỗi khi tải dữ liệu (dòng hiện có chỉ nói lỗi khi gửi thao tác); `/orders/:id` không có đang tải hay lỗi tải; `/orders` và `/staff/login` không có đang gửi, nên bấm đúp có thể đếm hai lần vào giới hạn FR-3, FR-8; tìm kiếm không có đang tải, lỗi, hay quy tắc khi gửi ô rỗng (EXPERIENCE.md:233-262). *Fix:* thêm các dòng này vào State Patterns.
- **[medium]** Quy tắc trả focus không thực hiện được sau thao tác thành công. Spine yêu cầu focus về nút đã mở, nhưng nút đó biến mất khi Trạng thái đổi (`Đánh dấu Đã giao`, `Lùi đơn`, `Đánh dấu đã hoàn tiền`) hoặc khi về danh sách sau Hủy (EXPERIENCE.md:226, 268-271, 289). *Fix:* quy định đích focus dự phòng, ví dụ tiêu đề đơn hoặc Trạng thái.
- **[medium]** "Không tab nào được chọn" khi xem kết quả tìm kiếm mâu thuẫn với mẫu `tablist` đã chọn: không có tab nào giữ `tabindex="0"`, bàn phím không vào được nhóm tab và `tabpanel` mất nhãn (EXPERIENCE.md:214, 276, 291, 391). *Fix:* giữ tab cũ ở `aria-selected="true"` và hiển thị vùng kết quả riêng, hoặc quy định tab đầu nhận focus.
- **[low]** Sau Hủy, `toast` phải sống qua lần chuyển route về danh sách, chưa có quy định (EXPERIENCE.md:268, 323). *Fix:* ghi cơ chế.
- **[low]** Chưa quy định: đã đăng nhập mà vào `/staff/login`; sau hết phiên đăng nhập lại có về đúng đơn đang xem không (EXPERIENCE.md:249). *Fix:* chốt đích chuyển hướng.
- **[low]** `Esc` đóng hộp thoại kể cả khi đã nhập lý do, trong khi bấm nền được bảo vệ (EXPERIENCE.md:226). *Fix:* thống nhất hai đường đóng.
- **[low]** A5 giữ từ khóa bằng trạng thái client qua hai route nhưng không nói nơi lưu. Từ khóa có thể là số điện thoại, nên cần tránh lưu bền (EXPERIENCE.md:279, 391). *Fix:* ghi "chỉ giữ trong bộ nhớ", tải lại trang thì mất.

## 5. Visual reference coverage — adequate

Cả 6 file trong `mockups/`, `wireframes/` đều được link, có mô tả, và câu "spine thắng" xuất hiện một lần (EXPERIENCE.md:27). Không có `imports/`. Mock đúng token: 0 hex ngoài bảng, không tràn ngang ở 390px, 4 tab vừa một hàng (90×44px), `order-table` không tràn ở khung 736px, không có chữ nào dưới 4.5:1.

### Mock so với spine

| Mức | Mock | Spine | Vị trí |
|---|---|---|---|
| medium | Radio lý do đầu tiên được chọn sẵn | Lý do bắt buộc, có trạng thái "Thiếu lý do" | key-staff-order-detail.html:83, 91; EXPERIENCE.md:227, 262 |
| medium | Mã đơn trong bảng là chữ thường, dòng không có link | "Mã đơn là link thật để dùng bàn phím" | key-staff-queue.html:78; EXPERIENCE.md:217 |
| medium | Không có nút tìm | "Enter hoặc nút tìm" (tính ở mục 3) | key-staff-queue.html; EXPERIENCE.md:213 |
| medium | `Đăng xuất` 32px | Vùng bấm 44px (tính ở mục 3) | key-staff-queue.html, key-staff-order-detail.html; DESIGN.md:416 |
| low | Dòng quá hạn tô nền rose | Chỉ đặc tả `overdue-label` | key-staff-queue.html `.over`; DESIGN.md:472-473 |
| low | Ô `Nhập lý do` luôn hiện ở dạng disabled, nhãn "Khi chọn Khác: bắt buộc nhập" | "Chọn `Khác` thì mở ô nhập" | key-staff-order-detail.html; EXPERIENCE.md:227 |

### Findings

- **[medium]** Radio được chọn sẵn trong hộp thoại Lùi đơn. Nếu làm theo mock, lý do đầu tiên sẽ được ghi vào Lịch sử khi người dùng bấm thẳng, làm mất ý nghĩa của lý do bắt buộc (bảng trên). *Fix:* bỏ `checked`, ghi rõ trong spine "không chọn sẵn".
- **[medium]** Mã đơn trong `order-table` của mock không phải link, trái spine và không dùng được bằng bàn phím (bảng trên). *Fix:* sửa mock.
- **[low]** Dòng quá hạn tô nền trong mock chưa được spine quyết định (bảng trên). *Fix:* đưa vào DESIGN hoặc bỏ khỏi mock.
- **[low]** Ô `Nhập lý do` trong mock khác cách spine mô tả (bảng trên). *Fix:* ẩn đến khi chọn `Khác`.
- **[low]** Tham chiếu hình ảnh gom ở Foundation, không gắn tại Key Flows hay Component Patterns; 12 ghi chú `Chưa chốt` trong wireframe đã lỗi thời và câu `Đơn đã đổi trạng thái` trong wireframe khác câu đã chốt. Spine đã cảnh báo chung nên tác động thấp (EXPERIENCE.md:29-38). *Fix:* link tại từng flow; dọn wireframe nếu còn dùng.
- **[low]** Ở 390px, Trạng thái nằm sau khối Đơn hàng, trong khi đây là câu trả lời chính của UJ-2 khi quay lại xem đơn. Người dùng đã duyệt bố cục, nên chỉ ghi nhận (EXPERIENCE.md:308, 340; key-order-confirmation.html). *Fix:* cân nhắc đặt badge Trạng thái cạnh Mã đơn.

## 6. Bloat & overspecification — adequate

EXPERIENCE.md dài (38 KB) nhưng phần lớn là microcopy và bảng quy tắc mà story-dev dùng trực tiếp. Các mục tự thêm đều có giá trị.

### Findings

- **[low]** Lặp nội dung: câu bước kế tiếp nằm ở cả hai bảng; delta badge Đã hủy được kể ở 4 nơi; `quantity-input` ghi `40px` dù đã có `{spacing.control-md}` (EXPERIENCE.md:86-91, 168-173, 416; DESIGN.md:56, 370-372, 455, 460). *Fix:* giữ một nguồn, nơi khác trỏ tới.

## 7. Inheritance discipline — adequate

`sources` resolve đủ 4 file ở cả hai spine. UJ đúng nguyên văn. Token EXPERIENCE dùng đều resolve về DESIGN. **Memlog: 34/34 mục đã được phản ánh** (29 decision, 2 override, 1 assumption, 2 event), gồm danh sách lý do, câu bước kế tiếp, dạng che, quy tắc mốc sau Lùi đơn và ngoại lệ badge. Các điểm lệch PRD có chủ đích được ghi ở bảng "Thay đổi cần cập nhật ở PRD".

### Findings

- **[medium]** Bảng Responsive gán sai điểm chuyển cho trang hiện có. Cột "Từ `md` (768px)" gồm `/orders/:id` và `/checkout` với chú thích "như hiện có", nhưng code dùng `sm:grid-cols-2` (640px) và `lg:grid-cols-[1fr_380px]` (1024px). A2 cũng chỉ áp dụng cho danh sách, chi tiết, Lịch sử (EXPERIENCE.md:302, 308-309, 388; `src/app/orders/[id]/page.tsx:108`; `checkout-form.tsx:140`). *Fix:* ghi đúng breakpoint từng dòng.
- **[low]** Thuật ngữ mới `Danh sách đơn`, `Chi tiết đơn` và tên 4 tab chưa có trong Glossary hoặc bảng thay đổi PRD (EXPERIENCE.md:49-50, 54-61, 368). *Fix:* thêm vào dòng 2 của bảng.
- **[low]** Quy tắc che chưa phủ biên: tên 1-2 ký tự sẽ lộ toàn bộ (`An***`), và chưa nói che trên dạng số nào, nên nếu lưu dạng `+84...` thì "3 số đầu" thành `+84` (EXPERIENCE.md:188, 397; PRD addendum). *Fix:* quy định che trên dạng `0...` và xử lý tên ngắn.

## 8. Shape fit — strong

DESIGN.md đủ 8 mục đúng thứ tự chuẩn. EXPERIENCE.md đủ các mục mặc định. Responsive có mặt vì có nhiều khổ màn hình. Không có Inspiration là hợp lý vì nguồn và memlog không nêu sản phẩm tham chiếu. Ba mục tự thêm (`Trạng thái, chuyển đổi và quyền`, `Thay đổi cần cập nhật ở PRD`, `Assumptions`/`Open Questions`) đều phục vụ trực tiếp kiến trúc và story.

Không có finding.

## Mechanical notes

- **Token:** 80/80 tham chiếu resolve; 46/46 hex khớp OKLCH của Tailwind 4.3.3; 14/14 tỷ lệ tương phản đúng.
- **Link:** mọi link tương đối và anchor trong hai spine đều resolve; 4 `sources` mỗi file đều tồn tại.
- **Assumption:** thẻ A1-A19 đều có trong bảng Assumptions, không thiếu số.
- **Component:** bảng DESIGN và EXPERIENCE khớp tên 100%. Frontmatter dùng 5 khóa `order-status-badge-*` cho một component `order-status-badge`, chấp nhận được.
- **Frontmatter:** cả hai spine còn `status: draft`, dù memlog đã chấp nhận giả định và chuyển sang validate.
- **Mermaid:** không có sơ đồ Mermaid.
- **Workspace:** `.working/` còn bản mock cũ khác `mockups/` (excalidraw thì giống hệt), và có `.DS_Store`. Không spine nào link tới, nhưng nên dọn trước khi commit để tránh mở nhầm.
