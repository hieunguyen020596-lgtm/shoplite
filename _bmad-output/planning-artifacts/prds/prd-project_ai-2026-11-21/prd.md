---
title: "PRD — Vận hành đơn hàng ShopLite & theo dõi đơn cho khách"
status: final
created: 2026-11-21
updated: 2026-11-21
inputs:
  - _bmad-output/planning-artifacts/briefs/brief-project_ai-2026-11-21/brief.md
  - _bmad-output/planning-artifacts/briefs/brief-project_ai-2026-11-21/addendum.md
  - README.md và mã nguồn src/ (đã đọc để kiểm chứng, 2026-11-21)
---

# PRD: Vận hành đơn hàng ShopLite & theo dõi đơn cho khách

_Tên làm việc. Cần xác nhận._

## 0. Document Purpose

PRD này dành cho người phụ trách sản phẩm, nhóm phát triển ShopLite và các workflow tiếp theo (`bmad-ux`, `bmad-architecture`, `bmad-create-epics-and-stories`). Nó xây trên product brief `brief-project_ai-2026-11-21` và không lặp lại phần lập luận "vì sao" của brief.

ShopLite đang chạy, nên PRD tách hai loại yêu cầu. **§4.0 Baseline** liệt kê hành vi hiện có phải giữ nguyên (ID `BL-n`). **§4.1–4.8** là hành vi mới hoặc thay đổi (ID `FR-n`). Mỗi FR mang một nhãn:

- **[MỚI]**: chưa tồn tại trong code.
- **[THAY ĐỔI]**: sửa một hành vi đang có. FR nêu rõ hành vi cũ.

Mọi tham chiếu tới code (file, hàm, hằng số) đã được đối chiếu với nhánh `bmad/module4_NamttAcbs` ngày 2026-11-21. Thuật ngữ dùng đúng như §3 Glossary. Giả định được gắn `[ASSUMPTION]` tại chỗ và gom ở §9. Cách hiện thực (cấu trúc file, cơ chế phiên, khóa ghi) nằm trong `addendum.md`, không nằm trong PRD.

## 1. Vision

ShopLite đã có đủ nửa đầu của việc bán hàng: khách xem sản phẩm, đặt đơn, và server tự tính lại giá. Nửa sau thì chưa có. Mọi đơn mới dừng ở _Chờ xác nhận_, vì hệ thống không có thao tác nào đưa đơn sang `confirmed`, `shipping` hay `delivered`. Trong khi đó, ai cũng xem được dữ liệu cá nhân của mọi khách.

Tính năng này đưa toàn bộ vòng đời đơn vào hệ thống. Nhân viên đăng nhập bằng tài khoản riêng và làm việc trên một hàng đợi. Mỗi bước chuyển trạng thái đều được kiểm tra và ghi lại ai làm, lúc nào. Hàng được giữ ngay khi khách đặt, nên cửa hàng không bán vượt kho. Khách không cần tài khoản: họ xem tiến trình đơn qua timeline, và chỉ người có mã đơn cùng SĐT mới thấy thông tin cá nhân.

Thành công nghĩa là: không đơn nào bị bỏ quên, không đơn nào bán vượt kho, không thông tin khách nào bị lộ, và khi có khiếu nại thì luôn trả lời được "ai đã làm gì với đơn này".

## 2. Target User

### 2.1 Jobs To Be Done

**Nhân viên**

- Mở ca làm và biết ngay đơn nào đang chờ mình, đơn nào sắp quá hạn.
- Chuyển đơn sang bước tiếp theo bằng một thao tác, và không thể bấm nhầm sang trạng thái sai.
- Khi phải hủy đơn hoặc giao thất bại, ghi lại lý do một lần để khách và đồng nghiệp đều thấy, không phải kể lại qua Zalo.

**Khách**

- Sau khi đặt, biết đơn đã được nhận chưa, đang giao chưa, hoặc vì sao bị hủy, mà không phải gọi điện hỏi.
- Yên tâm rằng người lạ không xem được địa chỉ và SĐT của mình.

**Chủ cửa hàng** (gián tiếp)

- Khi có khiếu nại, tra ra được ai đã đổi trạng thái đơn, lúc nào, và vì sao.

### 2.2 Non-Users (v1)

- **Shipper và đơn vị vận chuyển:** không có tài khoản. Nhân viên cập nhật trạng thái giao hàng thay cho họ.
- **Kế toán và quản lý duyệt hoàn tiền:** vai trò này thuộc giai đoạn 2.
- **Khách có tài khoản:** ShopLite không có tài khoản khách.

### 2.3 Key User Journeys

- **UJ-1. Lan mở ca sáng và xử lý xong hàng đợi trước 9 giờ.**
  Lan là nhân viên bán hàng. Trước đây Lan nhận đơn qua tin nhắn Zalo của chủ shop. Lan mở `/staff` và đăng nhập bằng tài khoản riêng. Hàng đợi hiện 6 đơn _Chờ xác nhận_, cũ nhất ở trên cùng, và có một đơn bị đánh dấu sắp quá hạn. Lan mở đơn đầu tiên, gọi số điện thoại hiển thị trên đơn, khách đồng ý, Lan bấm **Xác nhận**. Đơn rời hàng đợi, lịch sử ghi "Lan, 08:12, Chờ xác nhận → Đã xác nhận". Với đơn khách không nghe máy, Lan để nguyên. Lan biết nếu không ai xử lý thì hệ thống sẽ tự hủy khi quá hạn. **Edge case:** Huy, một đồng nghiệp, vừa xác nhận đúng đơn đó trước Lan vài giây. Thao tác của Lan bị từ chối với thông báo "Đơn đã được xác nhận bởi Huy". Không có bản ghi trùng.

- **UJ-2. Minh đặt tai nghe trên laptop, theo dõi đơn trên điện thoại.**
  Minh đặt hàng ở `/checkout` trên laptop, được chuyển tới trang đơn và thấy đầy đủ thông tin mà không phải nhập gì thêm. Hôm sau, trên điện thoại, Minh mở `/orders/SL-20261121-4F9A2C` từ tin nhắn đã lưu. Trang hiện timeline (Đã đặt → Đã xác nhận → Đang giao) nhưng ẩn tên, SĐT và địa chỉ. Minh nhập SĐT đặt hàng, và lúc này thông tin đầy đủ hiện ra. **Edge case:** một người khác dò mã đơn và đoán SĐT sai 5 lần, sau đó bị tạm khóa tra đơn đó trong 15 phút.

- **UJ-3. Hai khách cùng mua chiếc loa cuối cùng.**
  Chiếc loa BeatBox Mini còn 1 chiếc khả dụng. Thảo và Khoa bấm đặt gần như cùng lúc. Đơn của Thảo được tạo và giữ chiếc loa. Khoa nhận lỗi "Sản phẩm đã hết hàng" và đơn của Khoa không được tạo. Trang sản phẩm chuyển sang _Hết hàng_. Thảo hủy đơn trong vòng 10 phút, và trang sản phẩm lại hiện còn 1 chiếc.

- **UJ-4. Giao thất bại và báo khách.**
  Lan đã chuyển đơn sang _Đang giao_. Shipper báo khách không nhận hàng. Lan bấm **Giao thất bại**, chọn lý do "Khách từ chối nhận", gọi điện cho khách và ghi chú "Đã gọi 14:05, khách đổi ý". Hàng quay về tồn khả dụng. Khi khách mở trang đơn, timeline hiện _Giao thất bại: Khách từ chối nhận_.

- **UJ-5. Chủ shop xử lý khiếu nại "tôi không hủy đơn".**
  Một khách khiếu nại vì đơn bị hủy. Chủ shop mở đơn trong `/staff` và xem lịch sử trạng thái: "Hệ thống, 21/11 09:00, Quá hạn xác nhận". Lịch sử cho thấy không nhân viên nào xác nhận đơn trong 24 giờ. Vấn đề nằm ở vận hành, không phải do ai đó bấm nhầm.

## 3. Glossary

- **Đơn hàng**: một bản ghi `Order` trong `storage/orders.json`. Mỗi đơn có đúng một Trạng thái đơn tại một thời điểm và một Lịch sử trạng thái.
- **Mã đơn**: `Order.id`, dạng `SL-YYYYMMDD-XXXXXX` (`generateOrderId` trong `src/features/orders/order-service.ts`).
- **Trạng thái đơn**: một trong `pending` (Chờ xác nhận), `confirmed` (Đã xác nhận), `shipping` (Đang giao), `delivered` (Đã giao), `failed` (Giao thất bại, **mới**), `cancelled` (Đã hủy). Ba trạng thái `delivered`, `failed`, `cancelled` là **trạng thái kết thúc**.
- **Sơ đồ chuyển trạng thái**: tập các bước chuyển hợp lệ, định nghĩa ở FR-11.
- **Nhân viên**: người có tài khoản trong Danh sách nhân viên, vai trò duy nhất là `staff`.
- **Danh sách nhân viên**: danh sách tài khoản khai báo tĩnh trong cấu hình máy chủ. Không có màn hình quản lý.
- **Hệ thống**: tác nhân thực hiện thao tác tự động (Quá hạn xác nhận). Được ghi trong lịch sử như một người thao tác.
- **Khách**: người đặt đơn, không có tài khoản.
- **Xác minh đơn**: bằng chứng rằng người xem có quyền với một Đơn hàng. Có hai cách: Thiết bị đã đặt, hoặc nhập đúng Mã đơn + SĐT.
- **Thiết bị đã đặt**: trình duyệt đã tạo đơn đó. Trình duyệt này được xác minh tự động cho đơn đó.
- **Hàng đợi**: danh sách đơn nhân viên cần xử lý tại `/staff`.
- **Tồn thực**: số lượng hàng đang có trong kho của một sản phẩm.
- **Hàng đang giữ**: tổng số lượng của sản phẩm nằm trong các đơn ở `pending`, `confirmed` hoặc `shipping`.
- **Tồn khả dụng**: Tồn thực − Hàng đang giữ. Đây là số lượng khách có thể đặt thêm.
- **Lịch sử trạng thái**: chuỗi Sự kiện trạng thái của một đơn, chỉ được thêm vào, không được sửa.
- **Sự kiện trạng thái**: gồm trạng thái trước, trạng thái sau, thời điểm, người thao tác (Nhân viên, Khách hoặc Hệ thống) và Lý do (nếu có).
- **Lý do**: văn bản giải thích một bước chuyển sang `cancelled` hoặc `failed`. Khách nhìn thấy Lý do.
- **Ghi chú nội bộ**: văn bản nhân viên ghi vào đơn (ví dụ kết quả cuộc gọi). Khách **không** nhìn thấy.
- **Timeline**: phần trang đơn hiển thị Lịch sử trạng thái cho khách.
- **Quá hạn xác nhận**: đơn `pending` lâu hơn N giờ (mặc định 24) kể từ `createdAt`.

## 4. Features

### 4.0 Baseline — hành vi hiện có phải giữ nguyên

Các hành vi dưới đây đang chạy đúng. Mọi thay đổi trong PRD này không được làm hỏng chúng, và mỗi mục cần ít nhất một test hồi quy.

- **BL-1. Server tính lại giá.** `placeOrder` lấy `unitPrice` từ catalog và bỏ qua mọi giá client gửi lên. Tổng tiền tính bằng `calculateOrderTotals` (`src/features/checkout/pricing.ts`).
- **BL-2. Phí giao hàng.** Giao tiêu chuẩn 30.000 ₫, miễn phí khi tạm tính ≥ `FREE_SHIPPING_THRESHOLD` (500.000 ₫). Giao nhanh 60.000 ₫.
- **BL-3. Validate đơn.** `placeOrderSchema` (`src/features/checkout/checkout-schema.ts`): SĐT khớp `VN_PHONE_REGEX`, tối đa `MAX_QUANTITY_PER_ITEM` (10) mỗi dòng, giỏ hàng không rỗng. Các dòng trùng `productId` được gộp (`mergeItems`).
- **BL-4. Khách chỉ hủy được đơn ở `pending`.** Ở mọi trạng thái khác, thao tác hủy trả `INVALID_STATUS_TRANSITION` (HTTP 409) với thông báo "Chỉ có thể hủy đơn hàng đang ở trạng thái Chờ xác nhận". FR-8 thêm điều kiện xác minh nhưng **không** mở rộng phạm vi trạng thái.
- **BL-5. Định dạng lỗi API.** `{ "error": { "code", "message", "details?" } }` qua `handleRouteError`/`jsonError` (`src/lib/http.ts`). Các mã hiện có giữ nguyên HTTP status: `VALIDATION_ERROR` 400, `PRODUCT_NOT_FOUND` 422, `INSUFFICIENT_STOCK` 409, `ORDER_NOT_FOUND` 404, `INVALID_STATUS_TRANSITION` 409.
- **BL-6. Thông báo hết hàng khi đặt.** Thiếu hàng thì trả `INSUFFICIENT_STOCK` với thông báo "đã hết hàng" hoặc "chỉ còn N sản phẩm". FR-20 đổi nguồn số liệu sang Tồn khả dụng nhưng giữ nguyên câu chữ.
- **BL-7. Mã đơn.** Định dạng `SL-YYYYMMDD-XXXXXX`.
- **BL-8. Lưu trữ.** Đơn lưu trong file JSON (`ORDERS_FILE`, mặc định `storage/orders.json`) và ghi atomic (file `.tmp` rồi rename) trong `createJsonFileOrderRepository`. Đơn tạo trước khi nâng cấp phải đọc và hiển thị được (xem FR-26).
- **BL-9. Hướng dẫn chuyển khoản.** Đơn `bank_transfer` ở `pending` hiện STK và nội dung chuyển khoản trên trang đơn.
- **BL-10. Giỏ hàng.** Giỏ hàng lưu trong localStorage, tối đa 10 mỗi sản phẩm, không thêm được sản phẩm hết hàng. FR-23 chỉ đổi nguồn của số "tồn".

### 4.1 Danh tính nhân viên & phân quyền

**Description:** Hiện tại ShopLite không có khái niệm đăng nhập. Feature này thêm tài khoản riêng cho từng Nhân viên và khóa mọi bề mặt có dữ liệu của nhiều khách. Đây là nền cho mọi feature khác, vì Lịch sử trạng thái chỉ có ý nghĩa khi biết đúng ai đã thao tác. Realizes UJ-1, UJ-5.

**Functional Requirements:**

#### FR-1: Nhân viên đăng nhập bằng tài khoản riêng [MỚI]

Nhân viên trong Danh sách nhân viên đăng nhập tại `/staff/login` bằng tên đăng nhập và mật khẩu. Realizes UJ-1.

**Consequences (testable):**

- Đúng thông tin thì hệ thống tạo phiên và chuyển tới `/staff`. Sai thì hiện "Tên đăng nhập hoặc mật khẩu không đúng", không cho biết sai ở trường nào.
- Mật khẩu không được lưu dạng rõ trong cấu hình hay mã nguồn.
- Phiên hết hạn sau 12 giờ `[ASSUMPTION]`. Có nút Đăng xuất để kết thúc phiên ngay.
- Thêm hoặc bỏ Nhân viên bằng cách sửa cấu hình rồi khởi động lại. Không có giao diện quản lý.

**Out of Scope:** quên mật khẩu, đổi mật khẩu trên giao diện, nhiều vai trò, đăng nhập bằng dịch vụ ngoài.

#### FR-2: Bảo vệ bề mặt nhân viên [MỚI]

Mọi trang dưới `/staff` (trừ `/staff/login`) và mọi API thao tác của nhân viên chỉ dùng được khi có phiên Nhân viên hợp lệ.

**Consequences (testable):**

- Gọi trang `/staff` khi chưa đăng nhập thì bị chuyển tới `/staff/login`.
- Gọi API nhân viên khi chưa đăng nhập thì nhận HTTP 401 với `code: "UNAUTHENTICATED"`, đúng định dạng BL-5.

#### FR-3: Khóa danh sách tất cả đơn [THAY ĐỔI]

**Hiện tại:** `GET /api/orders` và trang `/orders` (`orderService.listOrders()` trong `src/app/orders/page.tsx`) trả về mọi đơn cho bất kỳ ai.
**Mới:** chỉ Nhân viên xem được danh sách tất cả đơn.

**Consequences (testable):**

- `GET /api/orders` không có phiên Nhân viên thì trả 401. Có phiên thì trả danh sách như cũ (mới nhất trước).
- Trang `/orders` không còn đọc danh sách tất cả đơn phía server (xem FR-4).
- `POST /api/orders` (đặt đơn) vẫn mở cho khách.

### 4.2 Quyền xem đơn của khách

**Description:** Khách không có tài khoản, nên quyền với một đơn dựa vào Xác minh đơn. Trình duyệt vừa đặt đơn được xác minh tự động. Thiết bị khác phải nhập SĐT đặt hàng. Khi chưa xác minh, khách vẫn xem được tiến trình đơn nhưng không thấy dữ liệu cá nhân. Realizes UJ-2.

**Functional Requirements:**

#### FR-4: "Đơn hàng của bạn" chỉ hiện đơn của thiết bị này [THAY ĐỔI]

**Hiện tại:** `/orders` liệt kê mọi đơn trong hệ thống.
**Mới:** `/orders` liệt kê các đơn mà trình duyệt hiện tại là Thiết bị đã đặt, hoặc đã Xác minh đơn. Kèm theo là một ô "Tra cứu đơn" (Mã đơn + SĐT).

**Consequences (testable):**

- Hai trình duyệt khác nhau đặt hai đơn. Mỗi trình duyệt chỉ thấy đơn của mình trong `/orders`.
- Xóa dữ liệu trình duyệt thì danh sách trống, nhưng vẫn tra được bằng Mã đơn + SĐT.
- Trạng thái trống giữ thông điệp hiện có ("Bạn chưa có đơn hàng nào").

#### FR-5: Thiết bị đã đặt được xác minh tự động [MỚI]

Khi `POST /api/orders` thành công, trình duyệt đã gửi yêu cầu được xác minh cho đơn vừa tạo. Realizes UJ-2.

**Consequences (testable):**

- Sau khi đặt, trang `/orders/[id]?placed=1` hiện đầy đủ thông tin và thông báo "Đặt hàng thành công!" như hiện nay, không hỏi SĐT.
- Quyền này chỉ áp dụng cho đúng đơn đó. Nó không cho xem đơn khác.

#### FR-6: Trang đơn ẩn dữ liệu cá nhân khi chưa xác minh [THAY ĐỔI]

**Hiện tại:** `/orders/[id]` và `GET /api/orders/:id` hiện họ tên, SĐT, email, địa chỉ và ghi chú cho bất kỳ ai biết Mã đơn.
**Mới:** khi chưa xác minh, chỉ hiện Mã đơn, Trạng thái đơn, Timeline, danh sách sản phẩm và tổng tiền.

**Consequences (testable):**

- Chưa xác minh: phản hồi HTML lẫn JSON không chứa giá trị rõ của `fullName`, `phone`, `email`, `address`, `note`. Chỉ được trả SĐT đã che (ví dụ `09****678`) để khách nhận ra đơn của mình `[ASSUMPTION]`.
- Nhập đúng SĐT đặt hàng thì trình duyệt được xác minh cho đơn đó, và trang hiện đầy đủ như hiện nay.
- So khớp SĐT phải chuẩn hóa `0xxxxxxxxx` và `+84xxxxxxxxx` thành cùng một số.
- Mã đơn không tồn tại vẫn trả 404 như hiện nay (`ORDER_NOT_FOUND`).

#### FR-7: Giới hạn số lần tra sai [MỚI]

**Consequences (testable):**

- Nhập sai SĐT 5 lần trong 15 phút cho cùng một Mã đơn thì tạm khóa tra cứu đơn đó trong 15 phút, với thông báo "Bạn đã thử quá nhiều lần, vui lòng thử lại sau 15 phút" (HTTP 429, `code: "TOO_MANY_ATTEMPTS"`).
- Khóa không ảnh hưởng tới Thiết bị đã đặt hay đến Nhân viên.
- Ngoài giới hạn theo Mã đơn, mỗi nguồn yêu cầu bị giới hạn 20 lần tra sai mỗi 15 phút trên mọi Mã đơn. Mục đích là chặn việc dò hàng loạt `[ASSUMPTION]`.

#### FR-8: Khách tự hủy phải được xác minh [THAY ĐỔI]

**Hiện tại:** `PATCH /api/orders/:id` với `{ "status": "cancelled" }` hủy được đơn `pending` của bất kỳ ai biết Mã đơn.
**Mới:** chỉ người đã xác minh đơn mới hủy được. Quy tắc trạng thái của BL-4 giữ nguyên.

**Consequences (testable):**

- Chưa xác minh thì nhận HTTP 403 (`code: "FORBIDDEN"`), đơn không đổi.
- Đã xác minh, đơn `pending`: hủy thành công. Lịch sử ghi người thao tác "Khách", Lý do "Khách tự hủy". Hàng đang giữ được nhả (FR-21).
- Đã xác minh, đơn không ở `pending`: trả 409 `INVALID_STATUS_TRANSITION` với thông báo như BL-4.
- Nút "Hủy đơn hàng" (`CancelOrderButton`) chỉ hiện khi đơn ở `pending` **và** người xem đã xác minh.

### 4.3 Hàng đợi đơn cho nhân viên

**Description:** Đây là màn hình chính của Nhân viên tại `/staff`. Màn hình phải tối giản: mở ra là thấy ngay việc cần làm, vì nếu chậm hơn Zalo thì nhân viên sẽ không dùng (R6). Realizes UJ-1.

**Functional Requirements:**

#### FR-9: Hàng đợi đơn [MỚI]

**Consequences (testable):**

- Mặc định hiện các đơn `pending`, cũ nhất trước. Mỗi dòng có Mã đơn, thời gian đặt, tên khách, SĐT, số sản phẩm, tổng tiền và phương thức thanh toán.
- Đơn còn dưới 2 giờ trước khi Quá hạn xác nhận được đánh dấu "Sắp quá hạn" `[ASSUMPTION]`.
- Có bộ lọc theo Trạng thái đơn (`pending`, `confirmed`, `shipping`, đơn kết thúc) kèm số đếm cho từng trạng thái.
- Đơn Quá hạn xác nhận không xuất hiện ở `pending`. Chúng đã bị hủy theo FR-17.

#### FR-10: Chi tiết đơn cho nhân viên [MỚI]

**Consequences (testable):**

- Hiện đầy đủ thông tin đơn, Lịch sử trạng thái (FR-25), Ghi chú nội bộ, và chỉ những nút thao tác hợp lệ với Trạng thái đơn hiện tại theo FR-11.
- Nhân viên thêm được Ghi chú nội bộ (tối đa 500 ký tự). Mỗi ghi chú lưu người viết và thời điểm. Realizes UJ-4.

#### FR-33: Tìm đơn theo Mã đơn trong Hàng đợi [MỚI]

Nhân viên nhập Mã đơn (đủ mã, hoặc 6 ký tự cuối) để mở đơn ở mọi Trạng thái đơn, không cần chọn bộ lọc. Realizes UJ-5.

_(ID đánh số sau FR-32 vì được bổ sung sau khi PRD đã chốt, theo yêu cầu từ UX; vẫn thuộc nhóm Must.)_

**Consequences (testable):**

- Nhập đủ mã đúng thì chuyển thẳng tới Chi tiết đơn. Nhập 6 ký tự cuối khớp đúng một đơn thì cũng chuyển thẳng. Khớp nhiều đơn thì liệt kê các đơn khớp.
- Không phân biệt hoa thường, bỏ qua khoảng trắng. Không tìm thấy thì hiện "Không có đơn nào có mã này".
- Chỉ dùng được khi có phiên Nhân viên (FR-2).

### 4.4 Vòng đời đơn & quy tắc chuyển trạng thái

**Description:** Đơn chỉ được đi theo Sơ đồ chuyển trạng thái. Mọi bước chuyển, dù từ giao diện hay gọi thẳng API, đều được kiểm tra ở server, ghi một Sự kiện trạng thái, và cập nhật Hàng đang giữ khi cần. Realizes UJ-1, UJ-4.

**Functional Requirements:**

#### FR-11: Sơ đồ chuyển trạng thái [MỚI]

| Từ          | Sang        | Ai được làm                  | Lý do bắt buộc |
| ----------- | ----------- | ---------------------------- | -------------- |
| `pending`   | `confirmed` | Nhân viên                    | Không          |
| `pending`   | `cancelled` | Khách đã xác minh, Nhân viên | Có\*           |
| `pending`   | `cancelled` | Hệ thống (Quá hạn xác nhận)  | Tự động        |
| `confirmed` | `shipping`  | Nhân viên                    | Không          |
| `confirmed` | `cancelled` | Nhân viên                    | Có             |
| `shipping`  | `delivered` | Nhân viên                    | Không          |
| `shipping`  | `failed`    | Nhân viên                    | Có             |

\*Khi Khách tự hủy, Lý do được gán tự động là "Khách tự hủy".

**Consequences (testable):**

- Mọi bước chuyển không có trong bảng (ví dụ `pending → delivered`, `delivered → cancelled`, đi lùi, hay chuyển từ trạng thái kết thúc) trả 409 `INVALID_STATUS_TRANSITION`, và đơn không đổi.
- Mỗi bước chuyển thành công cập nhật `updatedAt` và thêm đúng một Sự kiện trạng thái.
- `ORDER_STATUS_LABELS` có thêm `failed: "Giao thất bại"`. `OrderStatusBadge` có màu riêng cho `failed`.

#### FR-12: Xác nhận đơn [MỚI]

Nhân viên chuyển đơn `pending → confirmed`. Realizes UJ-1.

**Consequences (testable):**

- Thao tác thành công: đơn rời bộ lọc `pending` của Hàng đợi, và Lịch sử có sự kiện `pending → confirmed` mang tên đăng nhập của Nhân viên.
- Từ Hàng đợi, xác nhận một đơn mất tối đa 2 thao tác (mở đơn hoặc chọn dòng → Xác nhận).
- Hàng đang giữ không đổi.

#### FR-13: Bắt đầu giao [MỚI]

Nhân viên chuyển đơn `confirmed → shipping`.

**Consequences (testable):**

- Lịch sử có sự kiện `confirmed → shipping` kèm người thao tác. Từ lúc này đơn không còn hủy được (FR-11). Khách thấy bước "Đang giao" trên Timeline.

#### FR-14: Đã giao [MỚI]

Nhân viên chuyển đơn `shipping → delivered`. Tồn thực của từng sản phẩm giảm đúng số lượng trong đơn, và Hàng đang giữ của đơn được nhả cùng lúc. Tồn khả dụng vì thế không đổi.

**Consequences (testable):**

- Sản phẩm có Tồn thực 5 và một đơn 2 chiếc đang `shipping`: sau khi chuyển sang `delivered`, Tồn thực = 3, Hàng đang giữ của đơn = 0, Tồn khả dụng giữ nguyên 3.
- `delivered` là trạng thái kết thúc. Khách thấy bước "Đã giao" trên Timeline.

#### FR-15: Giao thất bại [MỚI]

Nhân viên chuyển đơn `shipping → failed`, chọn một Lý do có sẵn ("Khách không nhận máy", "Khách từ chối nhận", "Sai địa chỉ") hoặc nhập Lý do khác. Realizes UJ-4.

**Consequences (testable):**

- Hàng đang giữ của đơn được nhả và Tồn thực không giảm (hàng quay về cửa hàng). Tồn khả dụng tăng đúng bằng số lượng trong đơn.
- Đơn `failed` là trạng thái kết thúc. MVP không có giao lại.
- Sau khi chuyển thành công, màn hình nhắc Nhân viên gọi khách và thêm Ghi chú nội bộ. Lời nhắc không bắt buộc. Quy tắc này cũng áp dụng cho FR-16.

#### FR-16: Nhân viên hủy đơn [MỚI]

Nhân viên hủy đơn ở `pending` hoặc `confirmed`, Lý do bắt buộc (ví dụ "Thiếu hàng"). Thiếu hàng thì hủy cả đơn. Không có giao một phần. Hàng đang giữ được nhả.

**Consequences (testable):**

- Hủy không có Lý do thì bị từ chối với `VALIDATION_ERROR` (400). Hủy đơn ở `shipping` thì nhận 409 `INVALID_STATUS_TRANSITION`.
- Lý do hiện cho khách trên Timeline (FR-27). Lịch sử ghi tên đăng nhập của Nhân viên.

#### FR-17: Tự hủy khi Quá hạn xác nhận [MỚI]

Đơn `pending` quá N giờ kể từ `createdAt` bị Hệ thống hủy với Lý do "Quá hạn xác nhận". N cấu hình được, mặc định 24. Ngoại lệ: đơn tạo trước khi nâng cấp tính hạn từ thời điểm nâng cấp (FR-26). Ở mọi chỗ dưới đây, "`createdAt` + N" được hiểu theo ngoại lệ đó.

**Consequences (testable):**

- Đơn Quá hạn xác nhận **không bao giờ** được tính vào Hàng đang giữ, kể cả khi chưa ai đọc lại đơn. Tồn khả dụng luôn đúng mà không cần tác vụ chạy nền.
- Lần đầu đơn được đọc hoặc ghi sau khi quá hạn, trạng thái `cancelled` cùng Sự kiện trạng thái của Hệ thống được lưu lại. Thời điểm ghi trong sự kiện là thời điểm hết hạn (`createdAt` + N), không phải thời điểm phát hiện.
- Nhân viên xác nhận một đơn đã quá hạn thì nhận 409 `INVALID_STATUS_TRANSITION`.

#### FR-18: Chống thao tác chồng nhau [MỚI]

Hai thao tác trên cùng một đơn được xử lý tuần tự. Thao tác đến sau được kiểm tra với trạng thái **mới nhất**. Realizes edge case của UJ-1.

**Consequences (testable):**

- Hai Nhân viên cùng bấm Xác nhận một đơn: một người thành công, người kia nhận 409 với thông báo cho biết trạng thái hiện tại và ai đã thao tác. Lịch sử có đúng một sự kiện.

### 4.5 Tồn kho & giữ hàng

**Description:** Tồn kho chuyển từ hằng số `stock` trong `src/data/products.ts` sang dữ liệu ghi được. Khách đặt thì giữ hàng ngay; đơn kết thúc mà không giao thành công thì nhả hàng. Mọi nơi hiển thị "còn hàng" cho khách đều dùng Tồn khả dụng. Realizes UJ-3.

**Functional Requirements:**

#### FR-19: Tồn thực lưu được và khởi tạo từ dữ liệu sản phẩm [THAY ĐỔI]

**Hiện tại:** `Product.stock` là hằng số trong `src/data/products.ts` và không bao giờ thay đổi.
**Mới:** Tồn thực được lưu riêng, ngoài mã nguồn. Lần chạy đầu tiên, nó được khởi tạo từ `Product.stock`.

**Consequences (testable):**

- Lần chạy đầu không có dữ liệu tồn kho: Tồn thực của mỗi sản phẩm bằng `Product.stock`.
- Khởi động lại máy chủ không làm mất Tồn thực đã thay đổi.
- Thêm sản phẩm mới vào `products.ts` thì sản phẩm đó được khởi tạo Tồn thực từ `stock`. Sản phẩm đã có thì giữ nguyên Tồn thực.

#### FR-20: Giữ hàng khi đặt [THAY ĐỔI]

**Hiện tại:** `placeOrder` so `quantity > product.stock` với hằng số và không trừ gì.
**Mới:** `placeOrder` so với Tồn khả dụng. Nếu đủ, đơn được tạo và hàng được giữ trong **cùng một** thao tác không thể chia cắt. Realizes UJ-3.

**Consequences (testable):**

- Tồn khả dụng = 1, hai yêu cầu đặt 1 sản phẩm gửi đồng thời: đúng một đơn được tạo, yêu cầu còn lại nhận 409 `INSUFFICIENT_STOCK` "đã hết hàng" (BL-6).
- Đơn nhiều sản phẩm mà một sản phẩm thiếu: không tạo đơn và không giữ sản phẩm nào.
- Thứ tự kiểm tra của BL-3 và BL-1 (validate, tìm sản phẩm, tính giá) giữ nguyên.

#### FR-21: Nhả hàng [MỚI]

Hàng đang giữ của một đơn được nhả khi đơn chuyển sang `cancelled` (mọi nguồn: Khách, Nhân viên, Hệ thống) hoặc `failed`. Khi đơn sang `delivered`, hàng được nhả đồng thời với việc trừ Tồn thực (FR-14).

**Consequences (testable):**

- Với mỗi lối kết thúc (Khách hủy, Nhân viên hủy, Quá hạn xác nhận, `failed`), Tồn khả dụng sau thao tác bằng Tồn khả dụng trước thao tác cộng số lượng trong đơn.
- Với `delivered`, Tồn khả dụng không đổi và Tồn thực giảm đúng số lượng trong đơn.

#### FR-22: Tồn kho không bao giờ âm [MỚI]

**Consequences (testable):**

- Không thao tác nào làm Tồn thực < 0 hoặc Tồn khả dụng < 0. Một thao tác vi phạm sẽ bị từ chối toàn bộ và không ghi gì.
- Bộ test chạy đủ kịch bản UJ-3 cùng một chuỗi đặt, hủy, giao ngẫu nhiên, và kiểm tra bất biến này sau mỗi bước.

#### FR-23: Hiển thị Tồn khả dụng cho khách [THAY ĐỔI]

**Hiện tại:** `getStockStatus`, bộ lọc `inStock` (`src/features/catalog/catalog-service.ts`), trang chi tiết sản phẩm và giỏ hàng (`stock` lưu trong `cart-reducer.ts` lúc thêm vào giỏ) đều đọc `Product.stock`.
**Mới:** tất cả đều dùng Tồn khả dụng.

**Consequences (testable):**

- Sau UJ-3, trang sản phẩm hiện _Hết hàng_ và bộ lọc "còn hàng" không còn trả sản phẩm đó.
- `LOW_STOCK_THRESHOLD` áp dụng trên Tồn khả dụng.
- Giỏ hàng đã lưu từ trước với số lượng lớn hơn Tồn khả dụng hiện tại: khi đặt, server vẫn từ chối theo FR-20. Giỏ hàng không cần tự đồng bộ theo thời gian thực `[ASSUMPTION]`.

### 4.6 Lịch sử trạng thái

**Description:** Một nguồn dữ liệu duy nhất phục vụ ba việc: nhật ký kiểm tra nội bộ (UJ-5), Timeline cho khách (UJ-2, UJ-4), và kênh báo khách khi chưa có email/SMS.

**Functional Requirements:**

#### FR-24: Ghi Sự kiện trạng thái [MỚI]

Mỗi bước chuyển trạng thái, kể cả lúc tạo đơn (`→ pending`), ghi một Sự kiện trạng thái. Sự kiện gồm trạng thái trước, trạng thái sau, thời điểm, người thao tác (tên đăng nhập của Nhân viên, "Khách" hoặc "Hệ thống") và Lý do.

**Consequences (testable):**

- Không có bước chuyển nào thiếu người thao tác hoặc thời điểm (SM-4).
- Không có API hay giao diện nào sửa hoặc xóa Sự kiện trạng thái.

#### FR-25: Nhân viên xem đầy đủ lịch sử [MỚI]

Chi tiết đơn ở `/staff` hiện toàn bộ Lịch sử trạng thái và Ghi chú nội bộ theo thời gian. Realizes UJ-5.

**Consequences (testable):**

- Mỗi dòng hiện thời điểm (đến phút), người thao tác (tên hiển thị của Nhân viên, "Khách" hoặc "Hệ thống"), bước chuyển và Lý do. Sắp theo thời gian tăng dần.

#### FR-26: Tương thích đơn cũ [MỚI]

Đơn tạo trước khi nâng cấp không có Lịch sử trạng thái.

**Consequences (testable):**

- Đơn cũ vẫn mở được ở mọi trang. Timeline hiện một sự kiện suy ra "Đã đặt" tại `createdAt`, và sự kiện trạng thái hiện tại tại `updatedAt` nếu khác `pending`.
- Đơn cũ đang ở `pending` **không** giữ hàng `[ASSUMPTION]`. Thời hạn Quá hạn xác nhận của chúng tính từ thời điểm nâng cấp, không tính từ `createdAt` `[ASSUMPTION]`.

### 4.7 Timeline & báo khách

**Description:** Khách tự xem tiến trình đơn. Chỉ trường hợp ngoại lệ (shop hủy, giao thất bại) mới cần Nhân viên gọi điện. Realizes UJ-2, UJ-4.

**Functional Requirements:**

#### FR-27: Timeline trên trang đơn [MỚI]

**Consequences (testable):**

- Trang `/orders/[id]` hiện các bước Đã đặt → Đã xác nhận → Đang giao → Đã giao, kèm thời điểm của những bước đã qua. Các bước chưa tới hiện mờ.
- Đơn `cancelled` hoặc `failed` thì Timeline dừng ở bước đó và hiện Lý do.
- Timeline **không** hiện tên Nhân viên. Người thao tác hiện là "Cửa hàng" `[ASSUMPTION]`.
- Timeline hiện cả khi chưa xác minh (FR-6).

#### FR-28: Không lộ Ghi chú nội bộ [MỚI]

Ghi chú nội bộ không xuất hiện trong bất kỳ phản hồi nào cho khách (HTML hay JSON).

**Consequences (testable):**

- Một đơn có Ghi chú nội bộ chứa chuỗi đánh dấu. Phản hồi của `/orders/[id]` và `GET /api/orders/:id` không chứa chuỗi đó, dù người xem đã xác minh hay chưa.

#### FR-29: Thông điệp sau đặt hàng khớp với quy trình [THAY ĐỔI]

Thông báo hiện tại "Chúng tôi sẽ gọi xác nhận qua số … trong thời gian sớm nhất" được bổ sung: đơn sẽ tự hủy nếu chưa được xác nhận trong N giờ, và khách theo dõi tiến trình ngay trên trang này.

**Consequences (testable):**

- Thông báo hiện giá trị N đang cấu hình (ví dụ "24 giờ"), không phải số viết cứng.
- Thông báo chỉ hiện khi `placed=1` và đơn đang ở `pending`, giống điều kiện hiện tại.

### 4.8 Tiện ích vận hành (Should — làm nếu kịp)

#### FR-30: Xác nhận nhiều đơn cùng lúc [MỚI]

Nhân viên chọn nhiều đơn `pending` trong Hàng đợi và xác nhận cùng lúc.

**Consequences (testable):**

- Mỗi đơn được kiểm tra theo FR-11 và ghi Sự kiện trạng thái riêng. Một đơn thất bại (ví dụ đã Quá hạn xác nhận) không chặn các đơn còn lại.
- Kết quả hiện số đơn thành công, số đơn thất bại, và lý do cho từng đơn thất bại.

#### FR-31: In phiếu giao hàng [MỚI]

Nhân viên in được phiếu cho đơn `confirmed` hoặc `shipping`: Mã đơn, người nhận, SĐT, địa chỉ, sản phẩm, số tiền cần thu (COD) hoặc "Chuyển khoản", và ghi chú của khách. Dùng chức năng in của trình duyệt.

**Consequences (testable):**

- Đơn COD in số tiền cần thu bằng `total`. Đơn `bank_transfer` không in số tiền cần thu.
- Phiếu không chứa Ghi chú nội bộ. Nút in không xuất hiện ở các trạng thái khác `confirmed` và `shipping`.

#### FR-32: Cờ "Đã nhận tiền chuyển khoản" [MỚI]

Với đơn `bank_transfer`, Nhân viên đánh dấu hoặc bỏ đánh dấu đã nhận tiền, kèm mã giao dịch (tùy chọn). Mỗi lần đổi được ghi vào Ghi chú nội bộ có người thao tác. Cờ này không chặn bước chuyển trạng thái nào `[ASSUMPTION]`. Hệ thống không bao giờ tự đặt cờ.

**Consequences (testable):**

- Không có nút đặt cờ cho đơn COD. Mỗi lần bật hoặc tắt cờ thêm một Ghi chú nội bộ ghi người thao tác và mã giao dịch nếu có.

## 5. Non-Goals (Explicit)

- Không phải hệ thống quản lý kho: MVP không có nhập kho, kiểm kê hay điều chỉnh tồn trên giao diện.
- Không có tài khoản khách, email, SMS, thông báo đẩy, cổng thanh toán, hay tích hợp đơn vị vận chuyển.
- Không có giao một phần, tách đơn, giao lại sau khi giao thất bại, hay đổi trả.
- Không có quy trình hoàn tiền. Đơn cần hoàn được xử lý ngoài hệ thống (thiết kế giai đoạn 2 nằm trong addendum của brief).
- Không có nhiều vai trò hay phân quyền chi tiết. Mọi Nhân viên có quyền như nhau.
- AI không tự xác nhận đơn, thanh toán, hoàn tiền, và không sửa giá hay tồn kho.
- Không thêm database hay dịch vụ trả phí.

## 6. MVP Scope

### 6.1 In Scope

- Baseline BL-1 → BL-10 giữ nguyên và có test hồi quy.
- Must: FR-1 → FR-29 và FR-33.
- Bộ test kịch bản vận hành: tranh món cuối, khách hủy, nhân viên hủy, giao thất bại, quá hạn, cập nhật nhầm hoặc chồng nhau, gọi API không quyền, tra đơn sai SĐT.

### 6.2 Out of Scope for MVP

- FR-30 → FR-32 (Should): làm nếu kịp, không chặn việc phát hành.
- Could (để dành): tạm hoãn đơn; ghi kết quả cuộc gọi dạng có cấu trúc (hiện dùng Ghi chú nội bộ); mốc "chuẩn bị hàng / bàn giao vận chuyển" riêng; đánh dấu đơn cần hoàn tiền.
- Điều chỉnh tồn kho trên giao diện. Lý do: chưa có quy trình nhập kho. `[NOTE FOR PM]` Nếu chạy thật lâu ngày thì đây là thiếu hụt đầu tiên nhân viên gặp (xem Câu hỏi mở 1).

## 7. Success Metrics

Đo bằng script đọc `orders.json` và dữ liệu tồn kho, cùng bộ test tự động. Không cần công cụ analytics ngoài.

**Primary**

- **SM-1**: Rò rỉ dữ liệu khách. Số yêu cầu không có phiên Nhân viên và không xác minh đơn mà nhận được dữ liệu cá nhân của khách. Mục tiêu: 0, kiểm bằng test cho từng bề mặt (`/orders`, `/orders/[id]`, `GET /api/orders`, `GET /api/orders/:id`). Validates FR-2, FR-3, FR-4, FR-6, FR-8.
- **SM-2**: Đơn bị bỏ quên. Số đơn `pending` quá N giờ mà chưa chuyển trạng thái. Mục tiêu: 0. Validates FR-9, FR-17.
- **SM-3**: Bán vượt kho. Số lần Tồn thực hoặc Tồn khả dụng < 0, hoặc số đơn được tạo vượt Tồn khả dụng. Mục tiêu: 0. Validates FR-20, FR-21, FR-22.
- **SM-4**: Truy vết được. Tỷ lệ Sự kiện trạng thái có đủ người thao tác và thời điểm. Mục tiêu: 100%. Validates FR-24.

**Secondary**

- **SM-5**: Nhân viên thực sự dùng hệ thống. Tỷ lệ đơn đi tới trạng thái kết thúc trong hệ thống, thay vì kẹt ở `confirmed`/`shipping` quá 7 ngày. Mục tiêu: ≥ 90% sau 2 tuần chạy thật. Validates FR-9 → FR-16.
- **SM-6**: Bảo vệ bằng test. Mọi kịch bản trong §6.1 và mọi BL có test tự động, và `npm run check` cùng `npm run test:e2e` đều qua. Validates §4.0, FR-11, FR-18, FR-20.

**Counter-metrics (do not optimize)**

- **SM-C1**: Thời gian từ lúc đặt tới lúc xác nhận. Không đẩy chỉ số này xuống bằng cách xác nhận mà không gọi khách. Counterbalances SM-2.
- **SM-C2**: Tỷ lệ đơn tự hủy do Quá hạn xác nhận. Không giảm tỷ lệ này bằng cách tăng N. Tỷ lệ cao là tín hiệu thiếu người, không phải lỗi cấu hình. Counterbalances SM-2.
- **SM-C3**: Số lần khóa tra đơn (FR-7). Không siết giới hạn đến mức khách thật bị khóa. Counterbalances SM-1.

## 8. Open Questions

1. **Nhập kho:** khi hàng về thì ai cập nhật Tồn thực, và bằng cách nào? MVP giả định sửa trực tiếp file dữ liệu tồn kho khi máy chủ đang dừng. Câu hỏi này ảnh hưởng trực tiếp tới SM-5: chạy thật 2 tuần mà không nhập được kho thì Tồn khả dụng chỉ giảm dần. Người phụ trách: PM. Xem lại trước khi bắt đầu đo SM-5.
2. **N = 24 giờ** có phù hợp với giờ làm việc của shop không (đơn đặt tối thứ Bảy, Chủ nhật nghỉ)? Có cần tính theo giờ làm việc không?
3. **Đơn `pending` cũ lúc nâng cấp:** giữ hàng hồi tố hay không (hiện giả định là không, theo FR-26)?
4. **Số lần tra sai** được đếm trong bộ nhớ của process, nên bộ đếm mất khi khởi động lại. Như vậy có chấp nhận được không?
5. **Quy trình cấp và thu hồi tài khoản Nhân viên** (ai sửa cấu hình, ai biết mật khẩu ban đầu) chưa được mô tả.

## 9. Assumptions Index

- §4.1 FR-1: phiên Nhân viên hết hạn sau 12 giờ.
- §4.2 FR-6: SĐT hiển thị khi chưa xác minh được che (`09****678`).
- §4.2 FR-7: mỗi nguồn yêu cầu được tra sai tối đa 20 lần mỗi 15 phút trên mọi Mã đơn.
- §4.3 FR-9: đơn được đánh dấu "Sắp quá hạn" khi còn dưới 2 giờ.
- §4.5 FR-23: giỏ hàng không tự đồng bộ Tồn khả dụng theo thời gian thực; server chặn khi đặt.
- §4.6 FR-26: đơn `pending` cũ không giữ hàng; thời hạn tính từ lúc nâng cấp.
- §4.7 FR-27: Timeline cho khách hiện người thao tác là "Cửa hàng", không hiện tên Nhân viên.
- §4.8 FR-32: cờ "Đã nhận tiền chuyển khoản" không chặn bước chuyển trạng thái nào.
- §10 Hiệu năng: Hàng đợi và trang đơn phản hồi dưới 1 giây với 1.000 đơn.

## 10. Cross-Cutting NFRs

- **Bảo mật:** cookie phiên và cookie xác minh là `HttpOnly`, `SameSite=Lax`, và `Secure` khi chạy production. Mọi API thay đổi dữ liệu kiểm tra quyền ở server, không dựa vào việc giao diện ẩn nút. Bí mật ký phiên nằm trong biến môi trường, không commit.
- **Toàn vẹn dữ liệu:** mọi thao tác ghi (đơn, tồn kho, lịch sử) được tuần tự hóa trong process và ghi atomic. Một thao tác hoặc thành công trọn vẹn (đơn + tồn kho + sự kiện), hoặc không ghi gì.
- **Triển khai:** chỉ hỗ trợ **một instance**. Ràng buộc này phải được ghi trong README.
- **Hiệu năng:** với 1.000 đơn trong file, Hàng đợi và trang đơn phản hồi dưới 1 giây trên máy phát triển `[ASSUMPTION]`.
- **Khả năng tiếp cận:** thông báo kết quả thao tác (xác nhận, lỗi 409, khóa tra cứu) dùng `role="status"`/`role="alert"` như các màn hiện có. Mọi nút thao tác dùng được bằng bàn phím.
- **Chất lượng:** `npm run check` (lint + typecheck + test) phải qua trước mỗi commit, và có E2E Playwright cho UJ-1 → UJ-4.

## 11. Constraints and Guardrails

- **Chi phí:** không có ngân sách cho dịch vụ ngoài. Không thêm database. Chỉ dùng thư viện chuẩn của Node và các dependency đã có, trừ khi được duyệt riêng.
- **Quyền riêng tư:** dữ liệu cá nhân của khách (tên, SĐT, email, địa chỉ, ghi chú) chỉ hiện cho Nhân viên hoặc người đã xác minh đơn. Log máy chủ không ghi SĐT hay địa chỉ dạng rõ.
- **An toàn nghiệp vụ:** xác nhận đơn, thanh toán, giá và tồn kho luôn do Nhân viên thao tác, có người chịu trách nhiệm trong Lịch sử trạng thái.
- **Tương thích:** biến môi trường hiện có `ORDERS_FILE` giữ nguyên ý nghĩa. Các biến mới được ghi vào bảng "Biến môi trường" trong README.
