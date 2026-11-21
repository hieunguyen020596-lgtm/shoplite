# Đối chiếu độc lập: Architecture Spine với PRD và UX

- **Ngày:** 2026-11-21
- **Spine:** `ARCHITECTURE-SPINE.md`, `.memlog.md`
- **Đầu vào:** `prd.md`, `addendum.md`, `EXPERIENCE.md`
- **Phạm vi:** FR-1 đến FR-21, NFR §4.9, hành vi giữ nguyên §4.8, quy tắc trạng thái và quyền trong UX
- **Tiêu chí giữ phát hiện:** hai đơn vị build độc lập có thể làm khác nhau, hoặc spine trái đầu vào mà danh sách "Upstream Edits Required" chưa ghi nhận
- **Báo cáo này không sửa tài liệu nào.**

## Kết luận

**CHƯA ĐẠT, cần sửa spine trước khi chia story.** Bộ khung vững: máy trạng thái, CAS, thứ tự khóa, hoàn kho, mốc thời gian, projection cho khách và Tra đơn đều khớp đầu vào. Các lỗ hổng tập trung ở giới hạn theo IP, ngữ nghĩa `release`, giới hạn số lượng theo Tồn kho và các hợp đồng dữ liệu của khu nhân viên.

| Mức | Số lượng |
| --- | --- |
| Critical | 0 |
| High | 3 |
| Medium | 11 |
| Low | 6 |

## High

### H1. Bucket `direct` biến giới hạn theo IP của FR-8 và FR-20 thành giới hạn toàn shop

- **Vị trí:** AD-24 (dòng 199), AD-25 (dòng 205), AD-31 (dòng 251), Upstream Edits (dòng 406)
- **Đầu vào bị trái:** `prd.md:187` (FR-8), `prd.md:319` (FR-20), `prd.md:443` (SM-C2)
- **Vấn đề:** Khi `TRUSTED_PROXY_HOPS = 0`, mọi khách có cùng IP `direct`. Upstream Edits chỉ ghi nhận hệ quả với FR-3. Hai hệ quả chưa được ghi nhận:
  - `order:ip` thành **10 đơn thành công mỗi giờ cho cả shop**. Khách thứ 11 nhận `Bạn đã đặt quá nhiều đơn`.
  - `login:<ip>:<username>` thực chất chỉ còn theo username. **Người ẩn danh gửi 5 lần sai là khóa được tài khoản của Thảo hoặc Khoa**, và lặp lại được sau mỗi 15 phút.
- **Vì sao dễ lọt:** mặc định là `0`, AD-31 không chặn giá trị này ở production, mục Deferred chỉ nhắc "phải đặt". E2E đặt `TRUSTED_PROXY_HOPS=1` (AD-30) nên không chạy qua chế độ mặc định.
- **Đã kiểm chứng:** `node_modules/next/dist/server/base-server.js:567` dùng `??=` cho `x-forwarded-for`, nên tiền đề của AD-24 là đúng. Vấn đề nằm ở hệ quả, không nằm ở tiền đề.
- **Cần quyết định:** xem [Quyết định 1](#cần-quyết-định-của-con-người).

### H2. `release` chưa định nghĩa, cách hiểu tự nhiên làm vượt được giới hạn FR-3

- **Vị trí:** AD-25 (dòng 205)
- **Đầu vào bị trái:** `prd.md:107-108`
- **Vấn đề:** Spine ghi "thành công thì `release` các khóa đó" nhưng không nói `release` là giảm 1 hay xóa bộ đếm. Nếu xóa hoặc đặt lại, kẻ dò chỉ cần có một đơn thật của mình: cứ vài lần đoán sai lại Tra đơn đúng một lần để xóa `lookup:ip`, nên ngưỡng 20 lần sai mỗi IP không còn tác dụng. Khóa `lookup:order` cũng bị xóa khi chủ đơn tra đúng, làm mất dấu vết dò trên đơn đó.
- **Hướng sửa:** `release` chỉ hoàn lại đúng 1 lượt vừa `consume`, cùng cửa sổ, không xuống dưới 0, không đổi `window_started_at`. Thêm race test cho ca xen kẽ đúng và sai.

### H3. AD-29 bỏ giới hạn số lượng theo Tồn kho mà FR-18 và UX còn yêu cầu

- **Vị trí:** AD-29 (dòng 229), Upstream Edits (dòng 413)
- **Đầu vào bị trái:** `prd.md:298` ("giới hạn số lượng đọc từ Tồn kho"), `EXPERIENCE.md:165` (`quantity-input` "giới hạn theo Tồn kho và `MAX_QUANTITY_PER_ITEM`")
- **Vấn đề:** Reducer chỉ còn kẹp theo 10. Upstream Edits chỉ sửa `addendum.md:65`, không sửa FR-18 hay `quantity-input`. Spine không nói ai giới hạn:
  - Trang sản phẩm còn 3, giỏ đã có 3, bấm thêm thì lên 4 trở đi.
  - `/cart` có thể chặn nút `+` theo tồn hoặc không, tùy người build.
  - Khi số trong giỏ đã lớn hơn tồn, `quantity-input` chưa có hành vi được chốt.
- Server vẫn chặn bán quá tồn, nên đây là lệch yêu cầu và trải nghiệm, không phải lỗi toàn vẹn.
- **Cần quyết định:** xem [Quyết định 2](#cần-quyết-định-của-con-người).

## Medium

### M1. Bước ghi `refund_required` không có trong đường chuyển Trạng thái

- **Vị trí:** AD-7 (dòng 97), AD-8 (dòng 103), AD-14 (dòng 139)
- **Đầu vào:** FR-21, `EXPERIENCE.md:366-367`
- AD-7 trả `setRefundRequired`, nhưng chuỗi bước của AD-8 chỉ có CAS, hoàn kho, ghi Lịch sử. Spine cũng không nêu `updated_at` do ai ghi. Cần chốt: `casOrderStatus` ghi `status`, `updated_at`, `refund_required` trong cùng một `UPDATE`, và là đường duy nhất ghi cờ.

### M2. `decideTransition` chưa ràng buộc mã lý do theo từng cạnh

- **Vị trí:** AD-7 (dòng 97), Consistency Conventions (dòng 265-267)
- **Đầu vào:** FR-12, FR-13
- Chữ ký nhận `reason`, quy tắc lại dùng `reasonCode`. Spine không bắt buộc cạnh Hủy chỉ nhận mã Hủy, cạnh Lùi đơn chỉ nhận mã Lùi, cạnh tiến không nhận lý do. Hủy với `mistaken_delivery` sẽ khớp `reasonCode !== "out_of_stock"` và **được hoàn kho**. Cũng cần chốt mã lỗi: thiếu hoặc sai lý do là `VALIDATION_ERROR` (`prd.md:232`), sai vai là `FORBIDDEN`.

### M3. AD-14 gộp mọi lỗi hoàn tiền thành `REFUND_OUTCOME_CONFLICT`

- **Vị trí:** AD-14 (dòng 139)
- **Đầu vào:** `EXPERIENCE.md:226`, `:233-236`
- "Sai ở bất kỳ bước nào" bao gồm cả đơn không tồn tại và đính chính thiếu lý do. UX xử lý xung đột bằng cách **đóng hộp thoại** và báo `Đơn vừa được người khác cập nhật`, nên người dùng mất lý do đang nhập và thấy câu sai. Cần tách: không có đơn là `ORDER_NOT_FOUND`, thiếu hoặc sai body là `VALIDATION_ERROR`, chỉ lệch kết quả mới nhất hoặc đơn không đủ điều kiện mới là xung đột.

### M4. Hợp đồng dòng Lịch sử còn thiếu

- **Vị trí:** AD-12 (dòng 127), ER (dòng 317-327)
- **Đầu vào:** `prd.md:258`, `EXPERIENCE.md:185`
- Chưa chốt:
  - Dòng `order_created` có `to_status = pending` hay không. UX hiện `Tạo đơn` thay Trạng thái cũ, tức vẫn có Trạng thái mới.
  - Tập giá trị `actor_type` và CHECK giữa `actor_type` với `actor_staff_id`.
  - Đính chính hoàn tiền lưu `reason_code` thế nào, vì quy ước chỉ nói có chữ.
- ER cũng thiếu `created_at`, `actor_type`, `actor_name` dù AD-12 yêu cầu.

### M5. Schema `orders` và `order_items` chưa chốt phần bản chụp

- **Vị trí:** ER (dòng 303-316), AD-22 (dòng 187), AD-26 (dòng 211)
- **Đầu vào:** `addendum.md:18-19`, FR-2, FR-9, `src/features/orders/types.ts`
- ER không có tên, địa chỉ, email, ghi chú, `payment_method`, `shipping_method`, `subtotal`, `shipping_fee`, `total`, `line_total`, tên và ảnh sản phẩm. `Order` hiện tại lưu các bản chụp này. Nếu một đơn vị đọc tên hoặc tính lại tiền từ catalog, đơn cũ sẽ đổi khi catalog đổi. Cần ghi rõ những field nào là bản chụp lúc đặt.

### M6. Cookie Quyền xem đơn không có `Max-Age`

- **Vị trí:** AD-20 (dòng 175)
- **Đầu vào:** `prd.md:133`, `:135`
- Payload có hạn từng mã nhưng thuộc tính cookie không có `Max-Age` hay `Expires`. Thiếu thuộc tính này, đóng trình duyệt là mất quyền, trái hiệu lực 7 ngày. Cần chốt `Max-Age` bằng hạn xa nhất trong payload.

### M7. Thiếu hợp đồng dữ liệu cho danh sách và Chi tiết đơn nhân viên

- **Vị trí:** AD-19 (dòng 169)
- **Đầu vào:** `EXPERIENCE.md:170`, `:173-174`, `:404-408`, `prd.md:331`
- Chưa có nguồn cho:
  - `tab-count`, phải hiện ở mọi tab và không phụ thuộc tìm kiếm. API theo tab không trả được số này.
  - Tình trạng nhãn hoàn tiền trên từng dòng, kể cả kết quả tìm kiếm.
  - Cờ quá 24 giờ, cần tính bằng giờ server để khớp thứ tự.
  - `latestRefundOutcome` ở Chi tiết đơn, là nguồn của `expectedLatest` mà AD-14 bắt buộc gửi.

### M8. Chưa có chủ sở hữu trạng thái tab, từ khóa và toast giữa hai trang

- **Vị trí:** AD-18 (dòng 163), AD-19 (dòng 169)
- **Đầu vào:** `EXPERIENCE.md:168`, `:219`, `:247`, A5
- UX yêu cầu quay lại từ Chi tiết đơn giữ tab và từ khóa, toast sống qua chuyển trang, nhưng **tải lại thì về tab mặc định**. Vậy tab cũng không thể nằm trên URL, và từ khóa chắc chắn không được. Cần chốt một client provider ở layout `/staff` giữ các trạng thái này. Provider chỉ giữ UI, không thay thế guard của AD-18.

### M9. Chưa có tín hiệu hết phiên và cách client xử lý 401

- **Vị trí:** AD-17 (dòng 157), AD-18 (dòng 163)
- **Đầu vào:** `EXPERIENCE.md:131`, `:212`
- Trang login không phân biệt được "chưa đăng nhập" với "hết phiên" để hiện `Phiên đăng nhập đã hết hạn...`. Spine cũng chưa nói khi API trả 401 giữa thao tác thì client chuyển về `/staff/login?next=<trang hiện tại>` thế nào. Mỗi màn có thể tự làm một kiểu.

### M10. `/checkout` không có nguồn số shop cho câu `RATE_LIMITED`

- **Vị trí:** AD-22 (dòng 187), AD-31 (dòng 241)
- **Đầu vào:** `EXPERIENCE.md:134`
- Câu lỗi cần `{số}`, nhưng `SHOP_CONTACT_PHONE` chỉ đọc được ở server và `CheckoutForm` là client. `OrderErrorDetails` không có chỗ chứa số này. Cần chốt server dựng sẵn `message`, hoặc trang `/checkout` truyền prop.

### M11. Projection bỏ phí giao hàng nên dòng sản phẩm có thể không cộng ra tổng tiền

- **Vị trí:** AD-22 (dòng 187)
- **Đầu vào:** `prd.md:61`, `prd.md:348`, mock `key-order-confirmation.html`, `src/app/orders/[id]/page.tsx:95-99`
- Trang hiện tại có Tạm tính và Phí giao. Định nghĩa Dữ liệu tối thiểu và mock chỉ có tổng tiền, còn AD-22 khóa cứng tập khóa bằng test. Với đơn dưới 500.000đ giao tiêu chuẩn, khách thấy tổng và **số tiền phải chuyển khoản** lớn hơn tổng các dòng mà không có giải thích. Mock không lộ lỗi vì ví dụ của nó được miễn phí giao hàng.
- **Cần quyết định:** xem [Quyết định 3](#cần-quyết-định-của-con-người).

## Low

| ID | Vị trí | Vấn đề |
| --- | --- | --- |
| L1 | AD-18 (dòng 163) | Kiểm `Sec-Fetch-Site` nằm trong `withStaff`, mà `login` được miễn nên không có kiểm tra này. `logout` qua `withStaff` nên phiên đã hết hạn nhận 401 và cookie không được xóa. Test "mọi route trả 401 khi không có cookie" cần ghi rõ loại trừ `login`. |
| L2 | AD-15, AD-25 | Khóa rate limit viết thường username, nhưng chưa chốt username có so khớp không phân biệt hoa thường khi đăng nhập và khi seed. |
| L3 | AD-14, AD-19 | Ghi kết quả hoàn tiền không đổi `updated_at`, nên không đẩy đơn lên đầu tab Đã hủy, trong khi UX ghi "Thay đổi mới nhất trước" (A4). Có thể chấp nhận, nhưng nên ghi rõ "thay đổi" chỉ là đổi Trạng thái. |
| L4 | AD-25, AD-30 | E2E chạy từ một địa chỉ và chỉ reset trước mỗi lần chạy, nên bộ test tạo trên 10 đơn sẽ tự dính `order:ip`. Cần chốt cách cấp IP test qua header. |
| L5 | Upstream Edits (dòng 399-416) | Thiếu các dòng cũ: `addendum.md:55-56` (còn "chặn theo vai" ở route khách), `addendum.md:61-62` (catalog-service đọc `inventory`, trái AD-27), `prd.md:453` (còn "dùng địa chỉ kết nối"). |
| L6 | `.memlog.md` | Memlog cập nhật 12:45, spine 12:55. Chưa có dấu vết cho bucket `direct`, giới hạn 20 mã trong cookie và quy tắc `updated_at` của hoàn tiền. Riêng bucket `direct` là quyết định có hệ quả sản phẩm (H1). |

## Cần quyết định của con người

1. **Giới hạn IP khi chưa có proxy tin cậy (H1).** Chọn một:
   - **A (khuyến nghị):** giữ `direct` cho local, server **từ chối khởi động ở production** khi `TRUSTED_PROXY_HOPS = 0`. Ghi nhận vào FR-3, FR-8, FR-20.
   - **B:** ở chế độ `direct`, tắt `order:ip` và bỏ thành phần IP của khóa đăng nhập theo một ngưỡng riêng. Chấp nhận bảo vệ yếu hơn.
   - **C:** làm custom server để lấy địa chỉ socket thật. Tốn công và đang bị Deferred.
2. **Giới hạn số lượng theo Tồn kho ở client (H3).** Chọn một:
   - **A (khuyến nghị):** khi đã biết tồn, trang sản phẩm và `/cart` chặn tăng vượt `min(tồn, 10)`, tính cả số đã có trong giỏ. Không tự giảm số đã có; xung đột xử lý tại form theo FR-19. Giữ nguyên FR-18.
   - **B:** giữ AD-29, chỉ kẹp theo 10, và **sửa FR-18 cùng `quantity-input`** để nói rõ giới hạn theo tồn chỉ kiểm lúc đặt.
3. **Hiện phí giao hàng trên Trang xác nhận (M11).** Chọn một:
   - **A (khuyến nghị):** thêm `shippingFee` vào Dữ liệu tối thiểu và AD-22, cập nhật PRD, UX, mock. Khách hiểu vì sao số tiền chuyển khoản khác tổng các dòng.
   - **B:** giữ nguyên, chấp nhận khách chỉ thấy tổng tiền.

## Đối chiếu theo yêu cầu

| Mục | Kết quả | Phát hiện |
| --- | --- | --- |
| FR-1 Tra đơn | Khớp | |
| FR-2 Dữ liệu tối thiểu | Khớp, còn câu hỏi về phí giao | M11 |
| FR-3 Chống dò | Lệch | H2 |
| FR-4 Đóng đường cũ | Khớp | L5 |
| FR-5 Trang xác nhận | Thiếu | M6 |
| FR-6 Chuyển khoản | Khớp, số tiền liên quan phí giao | M11 |
| FR-7 Mốc thời gian | Khớp | |
| FR-8 Đăng nhập | Lệch | H1, M9, L1, L2 |
| FR-9 Danh sách đơn | Thiếu | M7, M8 |
| FR-10 Đổi Trạng thái | Khớp | |
| FR-11 Xác nhận hai lần | Khớp | |
| FR-12 Hủy đơn | Thiếu | M1, M2 |
| FR-13 Lùi đơn | Thiếu | M2 |
| FR-14 Ghi Lịch sử | Thiếu | M4 |
| FR-15 Xem Lịch sử | Khớp, phụ thuộc M4 | M4 |
| FR-16 Trừ kho | Khớp | M5 |
| FR-17 Hoàn kho | Khớp, phụ thuộc M2 | M2 |
| FR-18 Tồn thực tế | Trái | H3 |
| FR-19 Giữ form | Khớp, phụ thuộc H3 | H3 |
| FR-20 Chống đơn ảo | Lệch | H1, M10 |
| FR-21 Hoàn tiền | Thiếu | M1, M3, M7, L3 |
| NFR Toàn vẹn | Khớp, phụ thuộc M1 | M1 |
| NFR Bảo mật | Lệch | H1, H2 |
| NFR Cấu hình | Khớp | |
| NFR Kiểm thử | Khớp | L4 |
| NFR Tiếng Việt | Khớp | |
| NFR Khả năng tiếp cận | Khớp, thuộc tầng triển khai theo UX | |
| NFR Phát hành | Khớp (AD-32) | |
| §4.8 Giá, phí, tổng | Khớp (AD-4) | |
| §4.8 Tối đa 10 mỗi sản phẩm | Khớp (AD-4) | |
| §4.8 Miễn phí giao từ 500.000đ | Khớp qua `calculateOrderTotals` | |
| §4.8 `VN_PHONE_REGEX` | Khớp; regex Mã đơn của AD-23 cũng khớp `generateOrderId` | |
| §4.8 Dạng lỗi API | Khớp (AD-3, AD-11) | M3 |
| §4.8 Giỏ ở trình duyệt | Khớp (AD-29) | |
| UX bảng chuyển Trạng thái | Khớp (AD-7) | M2 |
| UX thao tác theo vai | Khớp (AD-14, AD-18) | M7 |
| UX trạng thái hoàn tiền | Khớp về luồng, lệch về lỗi | M3 |
| UX trạng thái khu nhân viên | Thiếu | M8, M9 |
