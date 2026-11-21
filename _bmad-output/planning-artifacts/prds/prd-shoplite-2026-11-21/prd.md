---
title: "PRD: ShopLite Ops — Vận hành đơn hàng & Tồn kho thực tế"
status: final
created: 2026-11-21
updated: 2026-11-21
stakes: internal
form_factor: web-responsive
---

# PRD: ShopLite Ops — Vận hành đơn hàng & Tồn kho thực tế

## 0. Document Purpose

Tài liệu PRD này định nghĩa đầy đủ yêu cầu chức năng, hành trình người dùng, tiêu chí nghiệm thu kiểm thử được và giới hạn phạm vi cho **ShopLite Ops** — phân hệ vận hành đơn hàng và Tồn kho khả dụng xây dựng trên nền tảng web **ShopLite** đang chạy (Next.js 16 App Router, TypeScript strict, Tailwind CSS v4, Zod 4, lưu trữ file JSON cục bộ, không cơ sở dữ liệu hay dịch vụ ngoài).

PRD phục vụ trực tiếp cho các bước tiếp theo: thiết kế UX (`bmad-ux`), kiến trúc hệ thống (`bmad-architecture`), tách Epic/Story (`bmad-create-epics-and-stories`), phát triển và kiểm thử. Mọi quyết định sản phẩm kế thừa và thống nhất từ:
- Product Brief: `_bmad-output/planning-artifacts/briefs/brief-shoplite-2026-11-21/brief.md`
- Phản biện Party Mode: `_bmad-output/brainstorming/brainstorm-shoplite-ops-2026-11-21/phan-bien.md`
- Bản tôi cứng Forge Idea (`HARDENED`): `_bmad-output/forge/shoplite-ops/forged-idea.md`
- Hiện trạng codebase: `README.md` và mã nguồn tại `src/features/orders/`, `src/features/catalog/`, `src/app/`.

Để đảm bảo bước tách Story có thể đọc độc lập không phải đoán hợp đồng, thân PRD neo rõ các bất biến brownfield, đường dẫn endpoint và mã trạng thái HTTP cốt lõi; chi tiết schema TypeScript request/response, bản đồ file mã nguồn, lưu ý bẫy triển khai cho `bmad-architecture` và các phương án đã loại bỏ nằm tại `addendum.md` cùng thư mục. Toàn bộ danh từ miền tuân thủ mục **3. Glossary**.

---

## 1. Vision

ShopLite hiện mới hoàn thành nửa trải nghiệm mua hàng của Khách hàng, trong khi phía vận hành cửa hàng hoàn toàn bỏ trống: mọi Đơn hàng đặt xong nằm mãi ở trạng thái `pending` ("Chờ xác nhận"), Tồn kho khả dụng là dữ liệu tĩnh không bao giờ giảm khi đã bán, và cơ chế ghi file JSON hiện tại dễ gây mất Đơn hàng khi nhiều Khách hàng đặt đồng thời.

**ShopLite Ops** khép kín vòng đời Đơn hàng ngay trên codebase hiện có với luận điểm rõ ràng: *giữ kiến trúc file JSON đơn giản không dịch vụ ngoài, nhưng không thỏa hiệp về tính đúng đắn của Tồn kho khả dụng và an toàn Trạng thái đơn hàng*. Khi hoàn tất, Nhân viên vận hành có thể xử lý trọn quy trình từ duyệt đơn, bàn giao vận chuyển, hủy đơn đến xác nhận nhập lại hàng hoàn trong vài chạm trên cả máy tính lẫn điện thoại `390px`; Khách hàng nhìn thấy rõ Đơn hàng của mình đang ở chặng nào qua Timeline tiến trình; và hệ thống đảm bảo 0 Đơn hàng bán vượt Tồn kho khả dụng ngay cả khi nhiều người cùng đặt chiếc sản phẩm cuối cùng.

---

## 2. Target User

### 2.1 Jobs To Be Done
- **Nhân viên vận hành (xử lý hàng chờ):** Khi mở ca làm việc, tôi muốn thấy ngay các Đơn hàng đang chờ duyệt cùng số lượng Hàng giữ chỗ và Tồn kho khả dụng ngay bên cạnh từng món, để xác nhận hoặc bàn giao vận chuyển trong dưới 30 giây mà không sợ duyệt nhầm vượt kho hay hủy oan đơn của Khách hàng.
- **Nhân viên vận hành (xử lý đơn giao thất bại):** Khi Đơn hàng đang giao bị Khách hàng từ chối nhận, tôi muốn hủy đơn kèm lý do mà không tự cộng kho ảo, và chỉ bấm cộng lại Tồn kho khả dụng một lần duy nhất khi shipper thực sự trả hàng về kệ.
- **Nhân viên vận hành (vai trò chủ cửa hàng, dùng chung Phiên quản trị ở v1):** Tôi muốn đảm bảo tuyệt đối không bán vượt Tồn kho khả dụng, mọi thao tác trên Đơn hàng đều có dấu vết trong Lịch sử trạng thái, và cổng quản trị không bị truy cập trái phép.
- **Khách hàng:** Sau khi đặt hàng, tôi muốn mở trang chi tiết Đơn hàng để biết chính xác đơn đã được cửa hàng xác nhận, đang giao hay bị hủy vì lý do gì, đồng thời vẫn tự hủy được ngay nếu đơn còn ở `pending`.

### 2.2 Non-Users (v1)
- Chuỗi bán lẻ nhiều chi nhánh cần phân tách Tồn kho khả dụng theo từng kho vùng (multi-warehouse).
- Doanh nghiệp cần hệ thống phân quyền nhiều vai trò (RBAC) và nhiều tài khoản Nhân viên vận hành riêng biệt.
- Đội vận hành cần gửi tin nhắn SMS/Zalo/Email tự động hoặc đồng bộ trực tiếp với hãng vận chuyển ngoài (GHN, GHTK).

### 2.3 Key User Journeys

- **UJ-1. Chị Hoa (Nhân viên vận hành) duyệt và bàn giao hàng chờ đơn buổi sáng.**
  - **Persona + context:** Chị Hoa phụ trách nhận đơn và đóng gói tại cửa hàng ShopLite, thường thao tác trên điện thoại (`390px`) khi đi lại ở kệ hàng và máy tính tại quầy đóng gói.
  - **Entry state:** Chị Hoa chưa đăng nhập, mở `/admin/orders` lúc 8h sáng. Hệ thống chuyển hướng sang `/admin/login`. Chị nhập `ADMIN_PASSCODE`, nhận Phiên quản trị có hạn 8 giờ và được đưa lại `/admin/orders`.
  - **Path:**
    1. Chị chọn tab trạng thái `pending` (bộ lọc lưu trên URL `?status=pending`, mặc định hiển thị đơn chờ cũ nhất ở trên theo giả định FIFO ở FR-12), thấy 12 Đơn hàng đang chờ.
    2. Chị mở đơn `SL-20261121-A1B2C3` mua 2 chiếc "Bàn phím cơ KeyPro 75%". Ngay cạnh dòng sản phẩm hiển thị rõ: `Đã giữ 2 cho đơn này · Còn cho đơn mới: 3` (màu vàng cảnh báo sắp hết).
    3. Kiểm tra kệ hàng đúng có hàng, chị bấm nút chính **"Xác nhận đơn"** → Trạng thái đơn hàng chuyển sang `confirmed`, nối mốc mới vào Lịch sử trạng thái.
    4. Với Đơn hàng khác đặt "Tai nghe SoundMax Pro" nhưng hộp cuối trên kệ bị móp không thể giao, chị bấm **"Hủy đơn"**, chạm chip lý do *"Hết hàng thực tế"* (điền sẵn vào ô lý do để xác nhận) → Đơn hàng chuyển sang `cancelled` và hệ thống tự động hoàn trả Hàng giữ chỗ về Tồn kho khả dụng.
    5. Cuối ca chiều, khi shipper tới lấy hàng, chị lọc các đơn `confirmed` và bấm **"Bàn giao giao hàng"** chuyển sang `shipping` (tùy chọn nhập mã vận đơn vào ô ghi chú).
  - **Climax:** Toàn bộ Đơn hàng hợp lệ được duyệt và bàn giao trong vài phút, Tồn kho khả dụng trên cửa hàng phản ánh chính xác số lượng còn lại.
  - **Resolution:** Các Đơn hàng chuyển sang `shipping`, chị Hoa bấm **"Đăng xuất"** cuối ca để xóa Phiên quản trị trên trình duyệt.
  - **Edge case:** Nếu có một yêu cầu API cố tình chuyển thẳng đơn từ `pending` sang `delivered` hoặc quay ngược từ `delivered` về `confirmed`, server từ chối ngay với lỗi `INVALID_STATUS_TRANSITION` (HTTP `409`).

- **UJ-2. Anh Minh (Khách hàng) đặt bàn phím và theo dõi tiến trình Đơn hàng.**
  - **Persona + context:** Anh Minh mua sắm trên web ShopLite mà không cần tạo tài khoản, muốn yên tâm Đơn hàng không bị "im bặt" sau khi bấm đặt.
  - **Entry state:** Anh Minh xem sản phẩm từ trang chủ `/` hoặc `/products/ban-phim-co-keypro-75` (hiển thị Tồn kho khả dụng cập nhật động từ hệ thống), thêm 1 chiếc vào giỏ và hoàn tất thanh toán tại `/checkout`.
  - **Path:**
    1. Khi bấm "Đặt hàng", server trừ ngay 1 chiếc khỏi Tồn kho khả dụng trong Khóa tuần tự và chuyển anh sang `/orders/SL-...?placed=1`. Trên trang này anh thấy Timeline tiến trình 4 bước đang sáng ở bước 1 (`Chờ xác nhận`) kèm nút "Hủy đơn hàng".
    2. Hôm sau, anh Minh mở lại đường dẫn `/orders/SL-...` (hoặc bấm nút **"Làm mới trạng thái"**). Timeline tiến trình hiển thị bước 1 (`Chờ xác nhận`), bước 2 (`Đã xác nhận` lúc 08:15) và bước 3 (`Đang giao` lúc 14:20 — kèm ghi chú mã vận đơn nếu có).
    3. Nút "Hủy đơn hàng" đã tự động ẩn đi kèm ghi chú *"Đơn hàng đã được xác nhận — vui lòng liên hệ cửa hàng nếu cần hỗ trợ"*.
  - **Climax:** Anh Minh biết chính xác Đơn hàng đang trên đường giao và yên tâm đợi nhận hàng mà không cần gọi điện hỏi cửa hàng.
  - **Resolution:** Khi nhận xong hàng và Nhân viên vận hành cập nhật `delivered`, toàn bộ 4 bước trên Timeline tiến trình hoàn tất.
  - **Edge case:** Giả sử chiếc bàn phím chỉ còn đúng 1 chiếc (`Tồn kho khả dụng = 1`) và anh Minh cùng một Khách hàng khác bấm "Đặt hàng" cùng một thời điểm: chỉ đúng 1 người đặt thành công (`201 Created`, Tồn kho khả dụng về `0`), người đến sau nhận thông báo rõ tên sản phẩm vừa hết (`INSUFFICIENT_STOCK`, HTTP `409`) mà không bị mất thông tin địa chỉ vừa điền trên form `/checkout` hay giỏ hàng hiện tại.

- **UJ-3. Chị Hoa xử lý Đơn hàng giao thất bại (bom hàng) và xác nhận hàng hoàn về kệ.**
  - **Persona + context:** Một Đơn hàng đang ở trạng thái `shipping` nhưng shipper gọi báo Khách hàng không nghe máy nhiều lần và trả hàng về kho.
  - **Entry state:** Chị Hoa đang đăng nhập Phiên quản trị tại `/admin/orders`, tìm Đơn hàng bằng số điện thoại Khách hàng trên thanh tìm kiếm.
  - **Path:**
    1. Chị bấm **"Hủy đơn"** trên đơn đang `shipping`, chọn chip lý do *"Giao hàng thất bại / Khách không nhận"* (hiển thị cảnh báo không tự hoàn kho) và xác nhận.
    2. Hệ thống chuyển Đơn hàng sang `cancelled`, đặt `Cờ hoàn kho (inventoryRestocked) = false`, **không tự động cộng lại Tồn kho khả dụng** và hiển thị nhãn cảnh báo **"Chờ nhận hàng hoàn"**.
    3. Hai ngày sau, shipper mang kiện hàng nguyên vẹn trả tại cửa hàng. Chị Hoa mở lại đơn hủy đó, bấm nút **"Xác nhận đã nhận hàng hoàn (+kho)"**.
  - **Climax:** Hệ thống cộng trả đúng số lượng sản phẩm của Đơn hàng về Tồn kho khả dụng, đổi `inventoryRestocked = true`, ẩn nút xác nhận (chặn bấm lại 2 lần), đổi sang nhãn **"Đã hoàn kho"** và nối mốc mới vào Lịch sử trạng thái.
  - **Resolution:** Sản phẩm lập tức mở bán trở lại trên trang chủ `/`, `/products` và `/products/[slug]` với Tồn kho khả dụng chính xác.
  - **Edge case:** Nếu request xác nhận hoàn kho bị gửi đúp 2 lần liên tiếp (double-click hoặc retry mạng), yêu cầu thứ hai bị server từ chối (`409 INVALID_STATUS_TRANSITION`) — tuyệt đối không cộng Tồn kho khả dụng 2 lần.

---

## 3. Glossary

- **Đơn hàng (`Order`)** — Bản ghi giao dịch mua hàng lưu trong `storage/orders.json`, gồm thông tin Khách hàng, danh sách mặt hàng đã chốt giá từ server, tổng tiền, Trạng thái đơn hàng hiện tại, Lịch sử trạng thái và Cờ hoàn kho.
- **Trạng thái đơn hàng (`OrderStatus`)** — Một trong 5 giá trị cố định tại `src/features/orders/types.ts`: `pending` (Chờ xác nhận), `confirmed` (Đã xác nhận), `shipping` (Đang giao), `delivered` (Đã giao), `cancelled` (Đã hủy).
- **Lịch sử trạng thái (`statusHistory`)** — Mảng tùy chọn (`OrderStatusEvent[]`) ghi bất biến mọi sự kiện chuyển Trạng thái đơn hàng hoặc xác nhận hoàn kho, gồm `status` (`OrderStatus`), `at` (ISO 8601), `actor` (`customer` | `staff`), `action` (`transition` | `restock`), và `note?` (lý do/ghi chú, tối đa 200 ký tự).
- **Tồn kho khả dụng (`Available Stock`)** — Số lượng sản phẩm còn lại có thể bán cho Đơn hàng mới, lưu trữ động trong `storage/inventory.json` (khởi tạo mặc định từ `stock` trong `src/data/products.ts` nếu chưa tồn tại).
- **Hàng giữ chỗ (`Reserved Stock`)** — Số lượng sản phẩm đã được trừ khỏi Tồn kho khả dụng ngay tại thời điểm Đơn hàng được tạo ở trạng thái `pending` để dành riêng cho Đơn hàng đó (áp dụng khi Đơn hàng đang ở `pending`, `confirmed`, `shipping`).
- **Cờ hoàn kho (`inventoryRestocked`)** — Trường boolean tùy chọn trên Đơn hàng bị hủy (`cancelled`): `true` nếu Hàng giữ chỗ đã được hoàn trả (hoặc đóng cờ an toàn cho đơn cũ tiền tồn kho); `false` nếu hủy từ `shipping` và đang chờ nhận hàng hoàn về kệ; `undefined` đối với Đơn hàng cũ tạo trước ShopLite Ops.
- **Khóa tuần tự (`Storage Lock`)** — Async mutex dùng chung trên single-node để tuần tự hóa toàn bộ thao tác đọc–sửa–ghi trên cả `storage/orders.json` và `storage/inventory.json`, ngăn điều kiện tranh chấp (race condition) và hỏng tệp.
- **Timeline tiến trình (`Order Timeline`)** — Thành phần hiển thị 4 chặng tiến trình Đơn hàng (`Chờ xác nhận → Đã xác nhận → Đang giao → Đã giao`) hoặc trạng thái hủy kèm mốc thời gian cho Khách hàng tại `/orders/[id]`.
- **Phiên quản trị (`Admin Session`)** — Cookie `HttpOnly` ký `HMAC-SHA256` phát hành sau khi Nhân viên vận hành đăng nhập đúng `ADMIN_PASSCODE`, có thời hạn 8 giờ.
- **Khách hàng (`Customer`)** — Người mua hàng công khai trên web ShopLite, không cần đăng nhập tài khoản.
- **Nhân viên vận hành (`Staff`)** — Người vận hành cửa hàng (nhân viên kho, CSKH, chủ cửa hàng) truy cập `/admin/*` sau khi xác thực Phiên quản trị.

---

## 4. Features

### 4.1 Máy trạng thái đơn hàng & Lịch sử trạng thái (Hành vi MỚI)

**Description:** Kiểm soát toàn bộ vòng đời Đơn hàng bằng máy trạng thái thuần túy phía server (`canTransition`, `getAllowedNextStatuses`) nhằm ngăn chặn tuyệt đối nhảy bước, quay lùi hoặc hủy sai thẩm quyền. Mọi thao tác chuyển Trạng thái đơn hàng hợp lệ đều nối thêm 1 bản ghi bất biến vào Lịch sử trạng thái (`statusHistory`) và cập nhật `updatedAt`. Thực hiện hóa UJ-1, UJ-2, UJ-3.

**Ma trận chuyển trạng thái hợp lệ:**
| Từ trạng thái | Sang trạng thái | Tác nhân được phép | Ghi chú / Điều kiện |
| :--- | :--- | :--- | :--- |
| `pending` | `confirmed` | `staff` | Xác nhận Đơn hàng |
| `pending` | `cancelled` | `customer`, `staff` | `staff` bắt buộc có `note`; tự động hoàn kho (`inventoryRestocked = true`) |
| `confirmed` | `shipping` | `staff` | Tùy chọn `note` (VD: mã vận đơn, `<= 200` ký tự) |
| `confirmed` | `cancelled` | `staff` | Bắt buộc có `note`; tự động hoàn kho (`inventoryRestocked = true`) |
| `shipping` | `delivered` | `staff` | Hoàn tất giao hàng |
| `shipping` | `cancelled` | `staff` | Bắt buộc có `note`; **không** tự động hoàn kho (`inventoryRestocked = false`) |
| `delivered` | *(không có)* | — | Trạng thái kết thúc |
| `cancelled` | *(không có)* | — | Trạng thái kết thúc (chỉ cho phép thao tác xác nhận hoàn kho nếu `inventoryRestocked === false`) |

**Functional Requirements:**

#### FR-1: Chuyển Trạng thái đơn hàng theo máy trạng thái
Nhân viên vận hành có thể chuyển Trạng thái đơn hàng sang đúng bước kế tiếp hợp lệ (`pending → confirmed → shipping → delivered`) qua `PATCH /api/admin/orders/:id/status`. Realizes UJ-1.

**Consequences (testable):**
- Chuyển hợp lệ `pending → confirmed`, `confirmed → shipping` (hỗ trợ `note` tùy chọn tối đa 200 ký tự, VD: mã vận đơn), `shipping → delivered` trả về HTTP `200` với `Order` đã cập nhật `status`, `updatedAt` và nối mới vào `statusHistory`.
- Request có body không phải JSON hợp lệ, `status` nằm ngoài enum `OrderStatus`, hoặc `note` vượt quá 200 ký tự bị từ chối với HTTP `400` (`VALIDATION_ERROR`).
- Nếu `:id` không tồn tại trong `storage/orders.json`, trả về HTTP `404` (`ORDER_NOT_FOUND`).
- Mọi chuyển đổi nhảy bước (`pending → shipping`, `pending → delivered`), đi lùi (`confirmed → pending`, `delivered → shipping`), chuyển từ trạng thái kết thúc (`delivered → cancelled`, `cancelled → pending`), hoặc khi `expectedStatus` gửi kèm khác `order.status` hiện tại đều bị từ chối với HTTP `409` (`INVALID_STATUS_TRANSITION`).

- **Quyết định đã chốt (Optimistic Locking):** Trường `expectedStatus` là tùy chọn ở tầng API để dễ tích hợp/kiểm thử trực tiếp, nhưng giao diện `/admin/orders` (FR-14) **bắt buộc luôn gửi kèm `expectedStatus`** nhằm ngăn hai tab Nhân viên vận hành ghi đè trạng thái của nhau trong im lặng.

#### FR-2: Nhân viên vận hành hủy Đơn hàng kèm lý do bắt buộc
Nhân viên vận hành có thể hủy Đơn hàng đang ở `pending`, `confirmed` hoặc `shipping` qua `PATCH /api/admin/orders/:id/status` với `{ status: "cancelled", note }` có lý do hủy hợp lệ. Realizes UJ-1, UJ-3.

**Consequences (testable):**
- `[ASSUMPTION: Giới hạn độ dài tối đa 200 ký tự cho trường note (lý do hủy hoặc ghi chú vận đơn).]` Request hủy từ Nhân viên vận hành thiếu `note`, chỉ chứa khoảng trắng, hoặc `note.trim().length > 200` bị từ chối với HTTP `400` (`VALIDATION_ERROR`).
- Nếu `:id` không tồn tại, trả về HTTP `404` (`ORDER_NOT_FOUND`).
- Hủy từ `pending` hoặc `confirmed` trả HTTP `200`, đặt `status = "cancelled"`, `inventoryRestocked = true`, và tự động hoàn Hàng giữ chỗ về Tồn kho khả dụng (ngoại trừ đơn cũ tiền tồn kho theo quy tắc FR-3).
- Hủy từ `shipping` trả HTTP `200`, đặt `status = "cancelled"`, `inventoryRestocked = false`, và giữ nguyên Tồn kho khả dụng (không cộng kho ảo).
- Hủy Đơn hàng đã `delivered` hoặc đã `cancelled` bị từ chối với HTTP `409` (`INVALID_STATUS_TRANSITION`).

#### FR-3: Ghi nhận Lịch sử trạng thái (`statusHistory`) và tương thích ngược đơn cũ
Hệ thống tự động ghi nhận từng sự kiện thay đổi Trạng thái đơn hàng hoặc xác nhận hoàn kho vào Lịch sử trạng thái và xử lý an toàn toàn bộ Đơn hàng cũ đang có trong `storage/orders.json`. Realizes UJ-1, UJ-2, UJ-3.

**Consequences (testable):**
- Khi Đơn hàng mới được tạo bởi Khách hàng, `statusHistory` được khởi tạo với đúng 1 phần tử: `{ status: "pending", at: order.createdAt, actor: "customer", action: "transition" }`.
- Mỗi lần chuyển Trạng thái đơn hàng (`action: "transition"`) hoặc xác nhận nhận hàng hoàn (`action: "restock"`) đều nối thêm đúng 1 phần tử mới vào cuối `statusHistory` với đầy đủ `status`, `at` (ISO 8601), `actor` (`customer` | `staff`), `action` và `note` (nếu có), tuyệt đối không ghi đè các phần tử trước đó.
- Khi đọc một Đơn hàng cũ trong `storage/orders.json` không có `statusHistory` (`undefined`) hoặc chứa các trường lịch sử thừa (VD: `discount`, `couponCode`), hệ thống không ném lỗi và bảo toàn đọc/ghi an toàn.
- Quy tắc fallback cho Đơn hàng cũ (`statusHistory === undefined`):
  - **Hiển thị Timeline tiến trình:** Bước 1 (`Chờ xác nhận`) dùng `createdAt`; bước hiện tại (nếu khác `pending`) dùng `updatedAt`; các bước trung gian suy luận hiển thị `"—"` (không bịa mốc thời gian); đơn cũ `cancelled` hiển thị *"Đơn đã hủy"* kèm `updatedAt` và ẩn phần tác nhân/lý do.
  - **Hoàn kho an toàn:** Đơn cũ ở `pending` được tạo trước khi tồn tại `storage/inventory.json` (nhận diện qua `statusHistory === undefined`) chưa từng trừ Tồn kho khả dụng — khi bị hủy sẽ đặt `inventoryRestocked = true` mà **không** cộng khống vào Tồn kho khả dụng; đơn cũ đã `cancelled` có `inventoryRestocked === undefined` không được coi là chờ hàng hoàn.

#### FR-4: Bảo toàn quy tắc Khách hàng tự hủy Đơn hàng
Khách hàng chỉ có thể tự hủy Đơn hàng của mình khi đơn còn ở `pending` thông qua hợp đồng API hiện có (`PATCH /api/orders/:id` với `{ "status": "cancelled" }`). Realizes UJ-2.

**Consequences (testable):**
- Gửi `PATCH /api/orders/:id` với `{ "status": "cancelled" }` khi đơn ở `pending` trả về HTTP `200`, đổi `status = "cancelled"`, nối `{ status: "cancelled", at, actor: "customer", action: "transition" }` vào `statusHistory`, đặt `inventoryRestocked = true`, và tự động hoàn Hàng giữ chỗ về Tồn kho khả dụng (tuân thủ quy tắc đơn cũ tại FR-3).
- Nếu `:id` không tồn tại, trả về HTTP `404` (`ORDER_NOT_FOUND`).
- Gửi `PATCH /api/orders/:id` với `{ "status": "cancelled" }` khi đơn ở `confirmed`, `shipping`, `delivered`, hoặc `cancelled` bị từ chối với HTTP `409` (`INVALID_STATUS_TRANSITION`).
- Gửi `PATCH /api/orders/:id` với body không phải JSON hoặc bất kỳ trạng thái nào khác `"cancelled"` (VD: `"confirmed"`, `"delivered"`) bị từ chối với HTTP `400` (`VALIDATION_ERROR`), ngăn Khách hàng tự duyệt đơn qua endpoint công khai.

---

### 4.2 Tồn kho khả dụng thực tế & An toàn đồng thời (Hành vi MỚI)

**Description:** Chuyển Tồn kho khả dụng từ hằng số tĩnh trong `src/data/products.ts` sang dữ liệu ghi được tại `storage/inventory.json` (có bản in-memory cho unit test), trừ kho ngay lúc Khách hàng đặt hàng bên trong Khóa tuần tự để chống bán vượt Tồn kho khả dụng, và đồng bộ Tồn kho khả dụng động lên toàn bộ trang bán hàng. Thực hiện hóa UJ-1, UJ-2, UJ-3.

**Functional Requirements:**

#### FR-5: Khởi tạo và lưu trữ Tồn kho khả dụng (`storage/inventory.json`)
Hệ thống duy trì Tồn kho khả dụng bền vững trong file JSON cục bộ (`storage/inventory.json`, có thể đổi đường dẫn qua biến môi trường `INVENTORY_FILE` để phục vụ kiểm thử) và tự động đồng bộ với danh mục gốc. Realizes UJ-1, UJ-2.

**Consequences (testable):**
- Khi `storage/inventory.json` chưa tồn tại, hệ thống tự động khởi tạo Tồn kho khả dụng cho từng `productId` từ trường `stock` của `src/data/products.ts`.
- Nếu một `productId` có trong `src/data/products.ts` nhưng chưa có key trong `storage/inventory.json`, hệ thống tự fallback lấy `product.stock` mặc định, không báo lỗi `undefined`.
- Tồn kho khả dụng của mọi sản phẩm luôn thỏa điều kiện `>= 0`; không thao tác nào được phép ghi số âm xuống file.

#### FR-6: Trừ kho nguyên tử lúc đặt hàng và chống bán vượt Tồn kho khả dụng
Khi Khách hàng đặt hàng qua `POST /api/orders`, hệ thống kiểm tra đủ Tồn kho khả dụng cho toàn bộ sản phẩm trong đơn, trừ kho và lưu Đơn hàng trong cùng một vùng Khóa tuần tự nguyên tử. Realizes UJ-2.

**Consequences (testable):**
- `[ASSUMPTION: ShopLite chạy trên 1 tiến trình Node.js duy nhất (single-node) nên Khóa tuần tự bất đồng bộ trong RAM bảo đảm an toàn đồng thời cho file JSON.]`
- Dữ liệu đầu vào không hợp lệ trả HTTP `400` (`VALIDATION_ERROR`); mã sản phẩm không tồn tại trả HTTP `422` (`PRODUCT_NOT_FOUND`).
- Khi bắn song song nhiều lời gọi `placeOrder()` (`Promise.allSettled()`) vào sản phẩm có Tồn kho khả dụng = `1` (mỗi đơn mua `1`), **đúng 1 đơn thành công** (HTTP `201`), toàn bộ các đơn còn lại thất bại với HTTP `409` (`INSUFFICIENT_STOCK`), và Tồn kho khả dụng cuối cùng bằng đúng `0`.
- Với Đơn hàng có nhiều sản phẩm, nếu bất kỳ sản phẩm nào không đủ Tồn kho khả dụng, toàn bộ đơn bị từ chối (HTTP `409`, `INSUFFICIENT_STOCK`) và Tồn kho khả dụng của các sản phẩm còn lại trong đơn **không bị trừ** (*all-or-nothing*).
- Nếu bước lưu `OrderRepository.save()` thất bại sau khi đã trừ kho, hệ thống tự động hoàn trả lại chính xác phần Tồn kho khả dụng vừa trừ (*rollback*) trước khi trả về HTTP `500` (`INTERNAL_ERROR`).
- Mọi thao tác ghi `storage/orders.json` và `storage/inventory.json` đều chạy trong Khóa tuần tự dùng chung với file tạm riêng theo `crypto.randomUUID()` trước khi `fs.rename()`.

#### FR-7: Hoàn kho idempotent khi hủy đơn & Xác nhận nhận hàng hoàn từ `shipping`
Hệ thống hoàn trả Hàng giữ chỗ về Tồn kho khả dụng đúng 1 lần duy nhất cho mỗi Đơn hàng hủy hợp lệ, và cung cấp endpoint `POST /api/admin/orders/:id/restock` để Nhân viên vận hành xác nhận nhận hàng hoàn cho các đơn bị hủy từ `shipping`. Realizes UJ-1, UJ-3.

**Consequences (testable):**
- Khi Đơn hàng (có `statusHistory`) bị hủy từ `pending` hoặc `confirmed`, số lượng từng món trong `order.items` được cộng trả lại vào `storage/inventory.json` trong cùng Khóa tuần tự và đặt `inventoryRestocked = true`.
- Với Đơn hàng đã hủy từ `shipping` (`status === "cancelled"` và `inventoryRestocked === false`), Nhân viên vận hành gọi `POST /api/admin/orders/:id/restock` (chấp nhận body rỗng **hoặc** JSON tùy chọn `{ note?: string }` tối đa 200 ký tự): trả HTTP `200`, cộng trả chính xác `order.items` về Tồn kho khả dụng, đặt `inventoryRestocked = true`, và nối `{ status: "cancelled", at, actor: "staff", action: "restock", note? }` vào `statusHistory`.
- Nếu `:id` không tồn tại, trả HTTP `404` (`ORDER_NOT_FOUND`); nếu có body không rỗng nhưng không phải JSON hợp lệ hoặc `note.trim().length > 200`, trả HTTP `400` (`VALIDATION_ERROR`).
- Gọi `POST /api/admin/orders/:id/restock` khi `order.status !== "cancelled"` hoặc `order.inventoryRestocked !== false` (bao gồm cả `true` và đơn cũ `undefined`) bị từ chối với HTTP `409` (`INVALID_STATUS_TRANSITION`) và Tồn kho khả dụng không đổi.

#### FR-8: Đồng bộ Tồn kho khả dụng lên toàn bộ mặt tiền bán hàng và trải nghiệm giỏ/checkout
Khách hàng nhìn thấy Tồn kho khả dụng mới nhất trên toàn bộ giao diện mua sắm và API sản phẩm ngay sau khi Đơn hàng được đặt hoặc hoàn kho. Realizes UJ-2, UJ-3.

**Consequences (testable):**
- Trang chủ `/` (`src/app/page.tsx` — sản phẩm nổi bật), `/products`, `/products/[slug]` (gỡ static prerender, dùng `export const dynamic = "force-dynamic"`), `GET /api/products`, và `GET /api/products/[slug]` đều trả về `stock` phản ánh Tồn kho khả dụng hiện tại từ `InventoryRepository` thay vì giá trị đóng băng trong `src/data/products.ts`.
- Khi Tồn kho khả dụng của sản phẩm về `0` sau khi Khách hàng khác đặt mua, tải lại `/`, `/products` hoặc `/products/[slug]` hiển thị nhãn **"Hết hàng"** và vô hiệu hóa nút thêm vào giỏ.
- Khi Khách hàng bấm "Đặt hàng" tại `/checkout` đúng lúc sản phẩm vừa hết hàng (`409 INSUFFICIENT_STOCK` — server fail-fast ở sản phẩm đầu tiên không đủ Tồn kho khả dụng), giao diện hiển thị thông báo `role="alert"` nêu rõ tên sản phẩm hết hàng, đồng thời **giữ nguyên toàn bộ thông tin form giao hàng đã nhập và danh sách giỏ hàng hiện tại** (không xóa trắng).

**Out of Scope:**
- Màn hình nhập/chỉnh kho thủ công tự do (`+N/-N` cho mọi SKU bất kỳ) nằm ngoài MVP.

---

### 4.3 Bảo vệ truy cập quản trị — Fail-Closed (Hành vi MỚI)

**Description:** Bảo vệ toàn bộ trang quản trị `/admin/*` và API quản trị `/api/admin/*` bằng mật khẩu biến môi trường kết hợp cookie `HttpOnly` ký `HMAC-SHA256`, không cần cơ sở dữ liệu hay dịch vụ xác thực ngoài. Thực hiện hóa UJ-1, UJ-3.

**Functional Requirements:**

#### FR-9: Đăng nhập quản trị bằng `ADMIN_PASSCODE` (Fail-Closed)
Nhân viên vận hành có thể đăng nhập tại `/admin/login` qua `POST /api/admin/auth/login` bằng mật khẩu quản trị cấu hình trong biến môi trường `ADMIN_PASSCODE`. Realizes UJ-1.

**Consequences (testable):**
- `[ASSUMPTION: Thời hạn Phiên quản trị mặc định là 8 giờ (1 ca làm việc, Max-Age=28800).]`
- **Ưu tiên kiểm tra cấu hình trước hết:** Khi `ADMIN_PASSCODE` chưa được thiết lập hoặc rỗng (hoặc toàn khoảng trắng), `POST /api/admin/auth/login` trả HTTP `503` (`ADMIN_NOT_CONFIGURED`); trang Server Component `/admin/login` kiểm tra ngay khi render để hiển thị cảnh báo `role="alert"` *"Hệ thống chưa cấu hình mật khẩu quản trị (`ADMIN_PASSCODE`)"* và vô hiệu hóa form đăng nhập — tuyệt đối không có mật khẩu mặc định cho môi trường dev.
- Khi body không phải JSON hợp lệ hoặc thiếu/rỗng `passcode`, `POST /api/admin/auth/login` trả HTTP `400` (`VALIDATION_ERROR`).
- Khi nhập sai mật khẩu, server so sánh an toàn thời gian hằng (hash `SHA-256` trước rồi dùng `crypto.timingSafeEqual`) và trả về HTTP `401` (`UNAUTHORIZED`) kèm thông báo lỗi tiếng Việt.
- Khi nhập đúng mật khẩu, `POST /api/admin/auth/login` trả HTTP `200` kèm header `Set-Cookie` chứa Phiên quản trị với đầy đủ thuộc tính `HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age=28800`, thêm `Secure` khi `NODE_ENV === "production"`, và chữ ký `HMAC-SHA256` kèm dấu thời gian hết hạn.

#### FR-10: Xác thực hai lớp cho trang `/admin/*` và mọi API `/api/admin/*`
Hệ thống chặn mọi truy cập chưa có Phiên quản trị hợp lệ ở cả tầng điều hướng trang (`src/proxy.ts`) lẫn tầng API route handler theo thứ tự ưu tiên chặt chẽ `503 → 401`. Realizes UJ-1, UJ-3.

**Consequences (testable):**
- **Thứ tự ưu tiên trên mọi `/api/admin/*` (trừ `POST /api/admin/auth/logout`):** Kiểm tra `ADMIN_PASSCODE` trước — nếu thiếu trả HTTP `503` (`ADMIN_NOT_CONFIGURED`); sau đó mới kiểm tra cookie Phiên quản trị (trừ `POST /api/admin/auth/login`) — nếu thiếu cookie, sai chữ ký hoặc đã hết hạn trả HTTP `401` (`UNAUTHORIZED`).
- Trên tầng trang `/admin/*` (trừ `/admin/login`), `src/proxy.ts` chuyển hướng (`307`) sang `/admin/login` nếu chưa cấu hình `ADMIN_PASSCODE` (để hiển thị cảnh báo chưa cấu hình) hoặc nếu không có cookie Phiên quản trị hợp lệ.
- Quy định parse body nhất quán: `POST /api/admin/auth/login` và `PATCH /api/admin/orders/:id/status` bắt buộc nhận JSON hợp lệ (`400 VALIDATION_ERROR` nếu sai); `POST /api/admin/orders/:id/restock` chấp nhận body rỗng hoặc JSON tùy chọn `{ note?: string }`; `POST /api/admin/auth/logout` không yêu cầu body và không yêu cầu cookie còn hạn.

#### FR-11: Đăng xuất Phiên quản trị
Nhân viên vận hành có thể đăng xuất khỏi `/admin/orders` qua `POST /api/admin/auth/logout` để xóa Phiên quản trị trên trình duyệt và quay về trang đăng nhập. Realizes UJ-1.

**Consequences (testable):**
- Bấm nút **"Đăng xuất"** gọi `POST /api/admin/auth/logout`: endpoint luôn trả HTTP `200` kèm `Set-Cookie` xóa cookie (`Max-Age=0; HttpOnly; SameSite=Lax; Path=/`, kể cả khi phiên đã hết hạn trước đó), sau đó chuyển hướng trình duyệt về `/admin/login`.
- Ngay sau khi đăng xuất, trình duyệt không còn lưu hay gửi cookie Phiên quản trị nữa; mọi lượt mở lại `/admin/orders` từ trình duyệt đều bị chuyển hướng (`307`) về `/admin/login` và mọi yêu cầu từ trình duyệt tới `/api/admin/orders` nhận HTTP `401` (`UNAUTHORIZED`).

- **Quyết định đã chốt (Stateless HMAC Trade-off):** Chấp nhận mô hình cookie `HMAC-SHA256` không trạng thái cho MVP nội bộ 1 cửa hàng — đổi `ADMIN_PASSCODE` làm hết hiệu lực ngay mọi phiên đang mở, còn thao tác Đăng xuất xóa cookie phía trình duyệt (không xây bảng thu hồi phiên phía server cho tới khi nâng cấp cơ sở dữ liệu ở v2).

---

### 4.4 Cổng vận hành đơn hàng `/admin/orders` (Hành vi MỚI)

**Description:** Giao diện làm việc chính của Nhân viên vận hành, tối ưu cho cả màn hình máy tính lẫn điện thoại kho `390px`, tập trung vào xử lý hàng chờ nhanh, hiển thị Hàng giữ chỗ và Tồn kho khả dụng minh bạch để tránh hủy oan, và đồng bộ bộ lọc trên URL query. Thực hiện hóa UJ-1, UJ-3.

**Functional Requirements:**

#### FR-12: Danh sách Đơn hàng, bộ đếm tab trạng thái trên URL và tìm kiếm
Nhân viên vận hành có thể xem danh sách Đơn hàng tại `/admin/orders` (tải dữ liệu qua `GET /api/admin/orders?status=&q=`), lọc theo từng Trạng thái đơn hàng và tìm kiếm theo mã đơn, số điện thoại hoặc tên Khách hàng. Realizes UJ-1, UJ-3.

**Consequences (testable):**
- Bộ lọc trạng thái (`?status=all|pending|confirmed|shipping|delivered|cancelled`) và từ khóa tìm kiếm (`?q=...`) được đồng bộ trên URL query; tải lại trang (F5) giữ nguyên đúng bộ lọc; giá trị `?status=` không hợp lệ tự động fallback về `all`.
- `[ASSUMPTION: Tab mặc định (?status=all hoặc không có query) sắp xếp mới nhất trước, tab pending sắp xếp FIFO (đơn cũ nhất ở trên), và không phân trang ở v1 với quy mô dưới 500 đơn — cần bmad-ux xác nhận.]`
- `GET /api/admin/orders` trả về danh sách Đơn hàng đã lọc, bộ đếm số lượng Đơn hàng theo từng Trạng thái đơn hàng (để hiển thị badge số lượng trên các tab lọc ngay cả khi đang lọc 1 trạng thái), và snapshot Tồn kho khả dụng hiện tại của các sản phẩm xuất hiện trong danh sách.
- Tìm kiếm không phân biệt hoa/thường và hỗ trợ tiếng Việt không dấu (tái sử dụng `normalizeText` từ `src/lib/format.ts`) trên mã đơn (`SL-...`), số điện thoại và tên Khách hàng; khi không có kết quả khớp, hiển thị trạng thái rỗng (`EmptyState`) rõ ràng kèm nút xóa bộ lọc.

#### FR-13: Hiển thị Hàng giữ chỗ & Tồn kho khả dụng inline chống "ảo giác hết hàng"
Nhân viên vận hành nhìn thấy rõ số lượng Hàng giữ chỗ và Tồn kho khả dụng ngay bên cạnh từng sản phẩm trong Đơn hàng đang xử lý mà không phải mở trang khác. Realizes UJ-1.

**Consequences (testable):**
- Với Đơn hàng đang giữ hàng (`pending`, `confirmed`, `shipping`), mỗi dòng sản phẩm hiển thị rõ định dạng: `Đã giữ {quantity} cho đơn này · Còn cho đơn mới: {availableStock}`.
- Với Đơn hàng đã kết thúc (`delivered`, `cancelled`), **không** hiển thị dòng *"Đã giữ X cho đơn này"* để tránh gây hiểu nhầm hàng vẫn đang bị giữ chỗ.
- Áp dụng mã màu trạng thái Tồn kho khả dụng: xanh lá (`> 5`), vàng cam (`1–5`, cảnh báo sắp hết), đỏ (`0`, hết hàng cho đơn mới — đồng thời vẫn ghi rõ đơn hiện tại đã được giữ chỗ).

#### FR-14: Thao tác chuyển trạng thái 1 bước, hủy có lý do, xác nhận hàng hoàn và xử lý lỗi phiên/xung đột
Nhân viên vận hành có thể thực hiện đúng các hành động hợp lệ cho từng Đơn hàng ngay trên `/admin/orders` ở cả màn hình desktop và mobile `390px`. Realizes UJ-1, UJ-3.

**Consequences (testable):**
- Mỗi Đơn hàng chỉ hiển thị nút hành động chính ứng với đúng 1 bước kế tiếp hợp lệ (`Xác nhận đơn`, `Bàn giao giao hàng`, `Đánh dấu đã giao`) và luôn gửi kèm `expectedStatus` — không dùng dropdown cho phép chọn Trạng thái đơn hàng tự do.
- Bấm nút **"Hủy đơn"** (chỉ hiện với `pending`, `confirmed`, `shipping`) mở hộp thoại xác nhận chứa ô nhập lý do bắt buộc (`<= 200` ký tự) và ít nhất 3 chip lý do chọn nhanh (*"Hết hàng thực tế"*, *"Khách yêu cầu hủy qua điện thoại"*, *"Giao hàng thất bại / Khách không nhận"*); chạm chip sẽ điền văn bản vào ô nhập (cho phép chỉnh sửa trước khi xác nhận, không tự submit). Nếu lý do rỗng hoặc vượt 200 ký tự, hiển thị lỗi `role="alert"` ngay trong hộp thoại. Với đơn `shipping`, hiển thị rõ cảnh báo *"Hủy đơn đang giao sẽ không tự động cộng lại tồn kho"*.
- Nhãn và nút hoàn kho trên Đơn hàng `cancelled`:
  - Khi `inventoryRestocked === false`: hiển thị badge màu vàng cam **"Chờ nhận hàng hoàn"** (`data-testid="restock-pending-badge"`) và nút **"Xác nhận đã nhận hàng hoàn (+kho)"**; sau khi xác nhận thành công, nút ẩn đi và đổi sang badge **"Đã hoàn kho"**.
  - Khi `inventoryRestocked === true`: hiển thị badge **"Đã hoàn kho"** (`data-testid="restocked-badge"`) và ẩn nút hoàn kho.
  - Khi `inventoryRestocked === undefined` (đơn hủy cũ trước ShopLite Ops): ẩn cả nút hoàn kho lẫn badge chờ hàng hoàn.
- Xử lý lỗi trên `/admin/orders`: nếu API trả HTTP `401`, giao diện chuyển hướng ngay sang `/admin/login?expired=1` (hiển thị thông báo phiên hết hạn); nếu API trả HTTP `409` (xung đột cập nhật từ tab khác), hiển thị thông báo `role="alert"` *"Đơn hàng vừa được cập nhật bởi thao tác khác"* và tự động tải lại danh sách đơn mới nhất.
- Tại độ rộng viewport `390px`, trang `/admin/orders` không bị tràn ngang (`scrollWidth <= innerWidth`) và mọi nút hành động chính có chiều cao vùng chạm `>= 44px`.

---

### 4.5 Timeline tiến trình cho Khách hàng tại `/orders/[id]` (Hành vi MỚI)

**Description:** Nâng cấp trang chi tiết Đơn hàng của Khách hàng để hiển thị minh bạch Timeline tiến trình 4 bước, mốc thời gian cập nhật, lý do hủy (nếu có) và nút làm mới trạng thái thủ công. Thực hiện hóa UJ-2.

**Functional Requirements:**

#### FR-15: Hiển thị Timeline tiến trình 4 bước và nút Làm mới trạng thái
Khách hàng có thể xem Timeline tiến trình theo từng chặng (`Chờ xác nhận → Đã xác nhận → Đang giao → Đã giao`) hoặc trạng thái hủy kèm mốc thời gian và lý do tại `/orders/[id]`. Realizes UJ-2.

**Consequences (testable):**
- Với Đơn hàng đang tiến triển hoặc đã giao, giao diện hiển thị đủ 4 bước theo thứ tự; các bước đã hoàn thành hiển thị mốc thời gian định dạng tiếng Việt qua `formatDateTime()` (`src/lib/format.ts`) và ghi chú kèm theo (nếu có).
- Với Đơn hàng mới đã `cancelled` (có `statusHistory`), giao diện hiển thị rõ tác nhân hủy (*"Khách hàng"* hoặc *"Cửa hàng"*), thời điểm hủy và lý do hủy (nếu do Nhân viên vận hành hủy).
- Với Đơn hàng cũ trong `storage/orders.json` chưa có `statusHistory`, áp dụng đúng quy tắc fallback tại FR-3 (bước 1 dùng `createdAt`, bước hiện tại dùng `updatedAt`, bước trung gian hiển thị `"—"`, đơn hủy cũ hiển thị *"Đơn đã hủy"* + `updatedAt`) và không ném lỗi runtime.
- Có nút **"Làm mới trạng thái"** giúp Khách hàng tải lại dữ liệu mới nhất từ server (`router.refresh()`); **không** chạy polling 30 giây tự động.
- Nút "Hủy đơn hàng" (`CancelOrderButton`) chỉ hiển thị khi `order.status === "pending"`; khi đơn chuyển sang `confirmed` hoặc `shipping`, nút bị ẩn và hiển thị dòng hướng dẫn liên hệ cửa hàng.

---

### 4.6 Hành vi hiện có bắt buộc bảo toàn (Brownfield Invariants)

Các quy tắc nghiệp vụ hiện đang chạy trong ShopLite (`README.md` và mã nguồn `src/features/`) **bắt buộc không được phá vỡ**:
1. **Giỏ hàng (`src/features/cart/cart-reducer.ts`):** Tối đa `MAX_QUANTITY_PER_ITEM = 10` sản phẩm mỗi loại và không vượt quá Tồn kho khả dụng; sản phẩm hết hàng không thêm được vào giỏ.
2. **Tính tiền & Phí ship (`src/features/checkout/pricing.ts`):** Giao tiêu chuẩn `30.000 ₫` (miễn phí khi tạm tính `>= 500.000 ₫`), giao nhanh `60.000 ₫`; server luôn tự tính lại giá từ catalog, không tin giá client gửi lên.
3. **Hợp đồng Đơn hàng công khai (`src/app/orders/`, `src/app/api/orders/`):** `GET /api/orders`, `POST /api/orders`, `GET /api/orders/:id`, `PATCH /api/orders/:id` giữ nguyên cấu trúc tương thích ngược; toàn bộ `e2e/shopping-flow.spec.ts` (kể cả assert `order-row` tại `/orders`) phải pass 100%.
4. **Ngôn ngữ & Định dạng:** Toàn bộ văn bản giao diện bằng tiếng Việt có dấu; định dạng tiền tệ qua `formatCurrency()` và ngày giờ qua `formatDateTime()` (`src/lib/format.ts`).

---

### 4.7 Cross-Cutting NFRs

- **Bảo mật:** So sánh `ADMIN_PASSCODE` bằng hash `SHA-256` kết hợp `crypto.timingSafeEqual` (tránh lỗi khác độ dài byte); chữ ký cookie dùng `HMAC-SHA256`; fail-closed HTTP `503` khi thiếu `ADMIN_PASSCODE` chạy trước mọi kiểm tra `401`; không bao giờ lộ giá trị `ADMIN_PASSCODE` trong client bundle hoặc response lỗi.
- **Độ tin cậy dữ liệu (Single-Node):** Mọi ghi đĩa xuống `storage/orders.json` và `storage/inventory.json` đi qua Khóa tuần tự chung + file tạm UUID + `fs.rename()` nguyên tử. Interface Repository tách biệt để sẵn sàng nâng cấp cơ sở dữ liệu thật.
- **Hiệu năng & Quy mô dữ liệu (Single-Node):** Quy mô MVP nội bộ mục tiêu `<= 500` Đơn hàng trong `storage/orders.json` (không phân trang), độ trễ phản hồi API cục bộ p95 `< 200ms`; kích hoạt phân trang ở v1.1 và chuyển cơ sở dữ liệu ở v2 khi vượt ngưỡng 500 Đơn hàng.
- **Trải nghiệm & Trợ năng (Accessibility):** Mọi form (đăng nhập `/admin/login`, hộp thoại lý do hủy) đều có `<label>` gắn đúng `id`, thông báo lỗi dùng `role="alert"`, hỗ trợ bàn phím (Tab/Enter/Escape), vùng chạm nút hành động chính `>= 44px`, hiển thị không tràn ngang trên mobile `390px`.
- **Kiểm thử (Definition of Done):** `npm run check` (`lint` + `typecheck` + `vitest run`) và `npm run test:e2e` pass 100%; có unit test phủ đủ ma trận chuyển trạng thái 5×5, test đồng thời `Promise.allSettled` trên `stock = 1`, test idempotent restock, test đọc đơn cũ thiếu `statusHistory`, và test route bảo vệ `503`/`401` của `/api/admin/*`.

---

## 5. Non-Goals (Explicit)

1. **Không xây dựng hệ thống tài khoản / phân quyền nhiều vai trò (RBAC):** v1 chỉ có một cổng mật khẩu quản trị chung (`ADMIN_PASSCODE`).
2. **Không thêm cơ sở dữ liệu ngoài hoặc dịch vụ bên thứ ba:** Toàn bộ lưu trữ dùng file JSON trong `storage/` và thư viện chuẩn Node.js (`node:crypto`, `node:fs`).
3. **Không chạy polling tự động 30 giây hay WebSocket/SSE trên `/orders/[id]`:** Tránh tranh chấp đọc/ghi file JSON và gây flaky E2E test.
4. **Không khóa danh sách công khai `/orders` và không xây tra cứu bằng SĐT + rate-limit RAM trong v1:** Tách sang một initiative riêng tư hóa Đơn hàng độc lập sau MVP để không phá vỡ `e2e/shopping-flow.spec.ts` và tránh rate-limit giả mất khi restart *(Quyết định đã chốt: chấp nhận giữ hành vi công khai gốc của `/orders` và `GET /api/orders` cho phạm vi nội bộ/demo ở v1; bảo mật PII khách hàng được xử lý trong initiative riêng tư hóa đơn hàng sau MVP)*.
5. **Không gửi thông báo SMS/Email/Zalo tự động, không tích hợp hãng vận chuyển ngoài (GHN/GHTK), và không thêm CAPTCHA/OTP chống đơn COD ảo.** `[ASSUMPTION: Ở quy mô MVP nội bộ, Nhân viên vận hành xử lý đơn COD ảo bằng hủy thủ công trên hàng chờ pending mà chưa cần CAPTCHA/OTP.]`

---

## 6. MVP Scope

### 6.1 In Scope
- Máy trạng thái đơn hàng thuần túy (ma trận 5×5) + Lịch sử trạng thái (`statusHistory`) + tương thích ngược đơn cũ (**FR-1 → FR-4**).
- Tồn kho khả dụng thực tế tại `storage/inventory.json` + Khóa tuần tự nguyên tử + rollback + file tạm UUID + hoàn kho idempotent + thao tác xác nhận nhận hàng hoàn (`+kho`) cho đơn hủy từ `shipping` + đồng bộ đọc động lên trang chủ `/`, `/products`, `/products/[slug]` và API sản phẩm (**FR-5 → FR-8**).
- Bảo mật Fail-Closed (`503` trước `401`) bằng `ADMIN_PASSCODE` + cookie `HttpOnly; SameSite=Lax` ký `HMAC-SHA256` tại `src/proxy.ts` và mọi `/api/admin/*` + Đăng xuất (**FR-9 → FR-11**).
- Cổng vận hành `/admin/orders` responsive `390px` & desktop: lọc URL query + bộ đếm tab, tìm kiếm mã/SĐT/tên, Hàng giữ chỗ & Tồn kho khả dụng inline (`Đã giữ X · Còn cho đơn mới: Y`), chuyển 1 bước kèm `expectedStatus`, hộp thoại hủy bắt buộc lý do kèm chip chọn nhanh, nút xác nhận hàng hoàn, xử lý lỗi `401`/`409` (**FR-12 → FR-14**).
- Timeline tiến trình 4 bước + nút Làm mới thủ công trên `/orders/[id]`, bảo toàn toàn bộ hành vi Khách hàng hiện có (**FR-15** & **§4.6**).

### 6.2 Out of Scope for MVP
- **Thẻ KPI tổng quan & cảnh báo đơn chờ quá 2 giờ trên `/admin/orders`** *(chuyển sang v1.1 — đã chốt: chỉ kích hoạt khi lượng đơn chờ vượt ~30 đơn/ngày khiến Nhân viên vận hành khó quét bằng mắt)*.
- **Nút "Copy mẫu tin nhắn báo khách" & lưu `localStorage["shoplite:my-orders"]`** *(chuyển sang v1.1)* — tiện ích phụ trợ giao tiếp, tách khỏi lõi MVP để giữ phạm vi tinh gọn.
- **Xác nhận hàng loạt (Bulk Confirm), phân trang danh sách đơn (`> 500` đơn) & màn hình nhập kho tự do (`+N`)** *(chuyển sang v1.1/v2)* — chưa cần ở quy mô cửa hàng hiện tại.
- **Bảo mật riêng tư `/orders` & tra cứu đơn khi quên mã** *(chuyển sang initiative riêng sau MVP)* — cần thiết kế độc lập cùng cập nhật hợp đồng E2E.

---

## 7. Success Metrics

**Primary**
- **SM-1 (An toàn Tồn kho khả dụng tuyệt đối):** `0` trường hợp bán vượt Tồn kho khả dụng hoặc ghi số âm trong kịch bản kiểm thử đồng thời (`Promise.allSettled` với `stock = 1`) và vận hành thực tế. Validates **FR-5, FR-6, FR-7**.
- **SM-2 (Tốc độ xử lý đơn vận hành):** Nhân viên vận hành duyệt hoặc chuyển Trạng thái đơn hàng trên `/admin/orders` trong **< 30 giây** với **tối đa 2 thao tác bấm** trên cả desktop và mobile `390px` *(cách đo: E2E tự động assert `<= 2` lần bấm cho mỗi bước chuyển; thời lượng `< 30 giây` đo bằng bấm giờ UAT trên mẫu 5–10 Đơn hàng thật)*. Validates **FR-1, FR-12, FR-13, FR-14**.
- **SM-3 (Khép kín kiểm soát truy cập quản trị):** `100%` endpoint `/api/admin/*` (trừ `/logout`) trả `503` khi thiếu `ADMIN_PASSCODE` và trả `401` khi thiếu/sai cookie HMAC. Validates **FR-9, FR-10, FR-11**.

**Secondary**
- **SM-4 (Minh bạch tiến trình cho Khách hàng):** `100%` Đơn hàng mới và Đơn hàng cũ trong `storage/orders.json` hiển thị đầy đủ Timeline tiến trình không lỗi runtime tại `/orders/[id]` sau mỗi bước chuyển Trạng thái đơn hàng. Validates **FR-3, FR-15**.

**Counter-metrics (ngưỡng không được xấu đi)**
- **SM-C1 (Tỉ lệ hủy oan đơn hợp lệ do nhầm Tồn kho khả dụng):** Phải giữ ở mức **`<= 1%`** (mục tiêu `0%`). Counterbalances **SM-2** (tránh việc Nhân viên vận hành bấm nhanh mà hiểu nhầm `Còn cho đơn mới: 0` là hết hàng rồi hủy oan Đơn hàng đã có Hàng giữ chỗ).
- **SM-C2 (Tỉ lệ hồi quy tính năng Khách hàng hiện có):** **`0` lỗi hồi quy** — toàn bộ bộ kiểm thử hiện có (`npm run check` và `e2e/shopping-flow.spec.ts`) phải tiếp tục pass 100%. Counterbalances **SM-1, SM-4**.

---

## 8. Open Questions (Resolved)

1. **Hiển thị tên riêng của Nhân viên vận hành trong Lịch sử trạng thái** *(Đã chốt cho MVP)*: Giữ `actor: "staff"` và **không thêm ô nhập tên nhân viên ở v1** để bảo toàn mục tiêu tốc độ `SM-2` (`<= 2` thao tác bấm, `< 30 giây`). Chỉ bổ sung trường tùy chọn `actorName?` ở v1.1 nếu cửa hàng tách nhiều ca nhân viên cần truy vết từng cá nhân.
2. **Ngưỡng cảnh báo đơn COD chờ lâu ở v1.1** *(Đã chốt mặc định cho v1.1 — không chặn MVP)*: Đặt ngưỡng mặc định **`2 giờ`** cho cảnh báo đơn `pending` quá hạn khi triển khai v1.1 (cấu hình được theo khung giờ hoạt động cửa hàng).

---

## 9. Assumptions Index

Toàn bộ giả định đánh dấu `[ASSUMPTION: ...]` trong thân PRD (khớp 1–1):

- **§4.1 (FR-2):** `[ASSUMPTION: Giới hạn độ dài tối đa 200 ký tự cho trường note (lý do hủy hoặc ghi chú vận đơn).]`
- **§4.2 (FR-6):** `[ASSUMPTION: ShopLite chạy trên 1 tiến trình Node.js duy nhất (single-node) nên Khóa tuần tự bất đồng bộ trong RAM bảo đảm an toàn đồng thời cho file JSON.]`
- **§4.3 (FR-9):** `[ASSUMPTION: Thời hạn Phiên quản trị mặc định là 8 giờ (1 ca làm việc, Max-Age=28800).]`
- **§4.4 (FR-12):** `[ASSUMPTION: Tab mặc định (?status=all hoặc không có query) sắp xếp mới nhất trước, tab pending sắp xếp FIFO (đơn cũ nhất ở trên), và không phân trang ở v1 với quy mô dưới 500 đơn — cần bmad-ux xác nhận.]`
- **§5 (#5):** `[ASSUMPTION: Ở quy mô MVP nội bộ, Nhân viên vận hành xử lý đơn COD ảo bằng hủy thủ công trên hàng chờ pending mà chưa cần CAPTCHA/OTP.]`
