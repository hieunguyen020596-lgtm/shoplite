# PRD Quality Review — ShopLite Ops (`prd-shoplite-2026-11-21`)

- **Ngày review:** 2026-11-21
- **Chế độ:** Independent Reviewer Gate (subagent đọc trực tiếp `prd.md`, `addendum.md`, `prd-validation-checklist.md` và mã nguồn ShopLite)
- **Đánh giá trên bản:** `status: draft` (trước khi chỉnh sửa chốt `status: final`)

## Overall verdict
PRD có luận điểm sản phẩm chặt chẽ, cấu trúc bám sát hiện trạng brownfield của ShopLite và không mắc lỗi "làm màu" (persona/vision/innovation theater). Tuy nhiên, tài liệu **chưa sẵn sàng để đẩy thẳng xuống tạo Epic/Story hay dev** vì còn một lỗi kỹ thuật tự mâu thuẫn ở mức chặn (stateless HMAC logout đòi chặn được replay cookie cũ), nhiều khoảng trống hợp đồng API/mã lỗi rải rác từ FR-1 đến FR-15 (bao gồm việc bỏ sót trang chủ `/` vẫn dùng tồn kho tĩnh và xung đột JSON body trên endpoint `/restock`), và bảng `Assumptions Index` bị lệch với các thẻ `[ASSUMPTION]` inline. Cần vá các điểm này trước khi chuyển `status: final`.

---

## Decision-readiness — adequate
PRD thể hiện được các quyết định thực chất thay vì né tránh: chọn trừ kho ngay tại `pending`, tách hoàn kho tự động (`pending`/`confirmed`) khỏi hoàn kho thủ công (`shipping`), giữ nguyên `/orders` công khai ở v1 để không vỡ E2E, và áp dụng fail-closed `503` khi thiếu `ADMIN_PASSCODE`. Các phương án bị loại bỏ được ghi lại rõ ràng trong `addendum.md §3`.

Tuy vậy, mức độ sẵn sàng ra quyết định chỉ dừng ở `adequate` vì tài liệu chỉ đặt đúng 1 callout `[NOTE FOR PM]` tại chỗ an toàn (`§6.2` dòng 319 về thẻ KPI v1.1), trong khi các căng thẳng thật sự về bảo mật, đồng thời và phạm vi lại được làm mượt đi mà không nêu rõ đánh đổi cho người duyệt ký.

### Findings
- **[high]** Thiếu `[NOTE FOR PM]` tại các điểm căng thẳng thật sự (`§4.1`, `§4.3`, `§5`) — Tài liệu né không nêu rủi ro của các quyết định đánh đổi: (1) dùng chung `ADMIN_PASSCODE` hay tách secret ký HMAC (nếu dùng chung, đổi passcode sẽ đá văng mọi phiên đang mở; nếu dùng HMAC thuần, không thể thu hồi cookie khi logout); (2) giữ `/orders` và `GET /api/orders` công khai trong v1 đồng nghĩa lộ tên/SĐT/địa chỉ khách hàng trong `Order` nếu không ẩn bớt ở UI/API; (3) `expectedStatus` ở FR-1 để "(tùy chọn)" nên nếu `/admin/orders` không bắt buộc gửi, hai nhân viên mở 2 tab vẫn có thể ghi đè trạng thái của nhau. *Fix:* Thêm `[NOTE FOR PM]` ngay tại `§4.1 (FR-1)`, `§4.3 (FR-9/FR-11)` và `§5 (#4)` để chốt rõ lập trường chấp nhận rủi ro hay bắt buộc xử lý.
- **[medium]** Câu hỏi mở về danh tính nhân viên chưa có giá trị mặc định chốt cho UX (`§8` #1) — Câu hỏi 1 hỏi có cần ô nhập tên nhân viên thao tác (VD: "Hoa") hay giữ nguyên `"staff"`, nhưng FR-3 (dòng 142) đã khóa cứng `actor` chỉ nhận `"customer" | "staff"` và chưa có trường mở rộng (như `actorName?`). *Fix:* Bổ sung phương án mặc định rõ ràng (VD: mặc định không thêm ô nhập tên ở MVP để giữ `SM-2 < 30 giây`, chỉ thêm `actorName?` nếu `bmad-ux` xác nhận cần).

---

## Substance over theater — strong
Tài liệu có thực chất kỹ thuật và nghiệp vụ cao. Vision (`§1`) chỉ đúng 3 lỗ hổng đang tồn tại trong mã nguồn ShopLite (`pending` chết, `stock` tĩnh, ghi đè JSON). Không có persona thừa (chỉ 2 nhân vật thật: Chị Hoa và Anh Minh), không có innovation theater, và Cross-Cutting NFRs đưa ra các ràng buộc kiểm chứng được (`crypto.timingSafeEqual`, `HMAC-SHA256`, `503`, `UUID` temp file + `fs.rename()`, `390px`, danh sách unit/E2E test cụ thể).

### Findings
- **[medium]** Thiếu ngưỡng NFR về hiệu năng / quy mô dữ liệu (`Cross-Cutting NFRs`, dòng 290–295) — NFR phủ bảo mật, độ tin cậy, trợ năng và kiểm thử nhưng hoàn toàn bỏ trống giới hạn hiệu năng và kích thước tệp JSON (không có phân trang ở `/admin/orders` trong FR-12, không có ngưỡng SLA phản hồi hay giới hạn số lượng đơn mà `orders.json` đọc/ghi toàn file vẫn chịu được). *Fix:* Thêm 1 dòng NFR cụ thể cho single-node (VD: ngưỡng p95 API hoặc giả định số lượng đơn MVP không cần phân trang, kèm mốc kích hoạt phân trang ở v1.1).
- **[low]** Rò rỉ chi tiết triển khai vào thân PRD trái với cam kết ở `§0` (`§0` dòng 22 vs `§4.2–§4.5`) — `§0` tuyên bố chi tiết kỹ thuật nằm ở `addendum.md`, nhưng thân `prd.md` vẫn gọi tên trực tiếp `crypto.randomUUID()`, `fs.rename()`, `Promise.allSettled()`, `force-dynamic`, `src/proxy.ts`, `router.refresh()`. *Fix:* Điều chỉnh câu chữ ở `§0` để thừa nhận rõ PRD giữ lại các neo kỹ thuật bắt buộc của codebase brownfield, hoặc đẩy tên hàm/file thuần túy sang `addendum.md`.

---

## Strategic coherence — strong
Toàn bộ PRD xoay quanh một luận điểm thống nhất: *giữ kiến trúc file JSON đơn giản, không thêm dịch vụ ngoài, nhưng khóa chặt tính đúng đắn tồn kho và an toàn trạng thái*. Các cụm FR-1..FR-15 phục vụ thẳng luận điểm này mà không bị phình thành backlog rời rạc; phạm vi MVP (`§6`) khớp đúng dạng *operational integrity / problem-solving MVP*; bộ Success Metrics (`§7`) có đầy đủ Primary, Secondary và Counter-metrics (`SM-C1`, `SM-C2`) trực tiếp đối trọng với rủi ro vận hành thật (`hủy oan do hiểu nhầm tồn kho`, `hồi quy luồng khách hàng`).

### Findings
- **[medium]** `SM-2 (< 30 giây, tối đa 2 thao tác bấm)` thiếu cách đo kiểm cụ thể (`§7`, dòng 330) — "Tối đa 2 thao tác bấm" kiểm được trên UI, nhưng "< 30 giây" là thời lượng thao tác người dùng mà hệ thống không có telemetry/analytics để đo tự động. *Fix:* Ghi rõ tiêu chí đo cho `SM-2` (VD: đo bằng UAT timing / stopwatch trên mẫu 5–10 đơn mẫu, hoặc tách phần đo tự động trong E2E là số bước click `<= 2`).

---

## Done-ness clarity — thin
Đa số FR đã có `Consequences (testable)` gắn với HTTP status và mã lỗi, nhưng khi soi từng FR-1..FR-15 và đối chiếu với mã nguồn thực tế (`src/features/orders/`, `src/app/page.tsx`, `src/lib/http.ts`), xuất hiện 1 lỗi bất khả thi về mặt kiến trúc, nhiều mã lỗi/HTTP status bị thiếu ở ngay đầu vào API, và vài câu chữ mơ hồ có thể khiến dev/QA hiểu khác nhau khi viết test.

### Findings
- **[critical]** **FR-11 đòi chặn cookie cũ sau logout trên cơ chế HMAC stateless là bất khả thi (`§4.3`, dòng 226)** — FR-11 khẳng định: *"Ngay sau khi đăng xuất, truy cập lại `/admin/orders` hoặc gọi `/api/admin/orders` bằng cookie cũ đều bị chặn (`307` về login / `401`)."* Với Phiên quản trị dùng cookie ký `HMAC-SHA256` (`§3` dòng 94) và không có DB/session store (`§5` #2), `POST /api/admin/auth/logout` đặt `Max-Age=0` chỉ xóa cookie ở trình duyệt. Nếu giữ nguyên chữ *"bằng cookie cũ"* và QA viết test replay lại header `Cookie` trước khi logout, server **vẫn trả `200`** chứ không thể trả `401`. *Fix:* Hoặc sửa tiêu chí nghiệm thu của FR-11 thành *"trình duyệt không còn gửi cookie sau logout và mọi truy cập kế tiếp từ trình duyệt bị chặn (`307` / `401`)"*, hoặc nếu bắt buộc vô hiệu hóa replay cookie cũ thì phải bổ sung cơ chế revocation list / session ID trong RAM/file JSON (và ghi nhận đánh đổi khi restart server).
- **[high]** **FR-10 xung đột trực tiếp với thiết kế endpoint `/restock` (`§4.3` dòng 219 vs `addendum.md §2` dòng 29)** — FR-10 quy định: *"Route `/api/admin/orders/:id/status` và `/api/admin/orders/:id/restock` chỉ chấp nhận JSON hợp lệ (`400 VALIDATION_ERROR` nếu body không phải JSON)."* Trong khi đó, cả FR-7 lẫn `addendum.md §2` đều không định nghĩa bất kỳ JSON body nào cho `POST /api/admin/orders/:id/restock`. Nếu client gọi `POST .../restock` không kèm body (body rỗng), `readJsonBody()` trong `src/lib/http.ts` sẽ trả `undefined` và route sẽ lỗi `400`. *Fix:* Bỏ yêu cầu body JSON bắt buộc ở `/restock` (hoặc quy định rõ nếu có body tùy chọn `{ note?: string }` thì mới parse JSON, còn body rỗng vẫn hợp lệ).
- **[high]** **FR-9 và FR-10 thiếu mã lỗi, HTTP status và thứ tự ưu tiên giữa `503` vs `401` (`§4.3`, dòng 205–220)** — (1) FR-9 không ghi HTTP status thành công (`200`), không ghi `error.code` cho `401` khi sai mật khẩu (VD: `UNAUTHORIZED`), và không có `400 VALIDATION_ERROR` khi body login thiếu/sai kiểu `passcode`. (2) Thiếu quy tắc ưu tiên khi `ADMIN_PASSCODE` chưa cấu hình **và** request cũng không có cookie: `503 ADMIN_NOT_CONFIGURED` phải chạy trước kiểm tra cookie `401`, và cần chốt `src/proxy.ts` trên `/admin/orders` trả `503` hay redirect sang `/admin/login`. (3) FR-10 dòng 218 ghi trừ mỗi `/api/admin/auth/login` khỏi kiểm tra cookie — nếu không trừ cả `/api/admin/auth/logout`, người dùng hết phiên bấm logout sẽ nhận `401`. (4) Cần lưu ý kỹ thuật trong `addendum.md`: `crypto.timingSafeEqual` sẽ ném `RangeError` (gây `500`) nếu hai buffer khác độ dài byte, nên cần hash SHA-256 trước khi so sánh. *Fix:* Bổ sung đầy đủ HTTP status, `error.code`, thứ tự ưu tiên `503 -> 401`, và ngoại lệ cho `/logout` ngay trong FR-9/FR-10.
- **[high]** **FR-1, FR-2, FR-4, FR-7 thiếu `404 ORDER_NOT_FOUND`, thiếu tên endpoint và thiếu ràng buộc cho `note` chuyển bước / `statusHistory` restock (`§4.1`–`§4.2`)** —
  - Cả 4 FR đều quên mã `404` (`ORDER_NOT_FOUND`) khi `:id` không tồn tại.
  - FR-1 và FR-2 không nêu tên endpoint (`PATCH /api/admin/orders/:id/status`).
  - FR-1 không đề cập tham số `note` (dùng khi `confirmed -> shipping` ghi mã vận đơn theo `UJ-1` bước 5) cũng như `400 VALIDATION_ERROR`.
  - FR-7 dòng 183 viết `(`POST /api/admin/orders/:id/restock` hoặc tương đương)` là mơ hồ; `OrderStatusEvent` bắt buộc có `status` nhưng FR-7 chưa chốt `status: "cancelled"` cho sự kiện `action: "restock"`.
  *Fix:* Nêu rõ tên endpoint ngay ở FR-1/FR-2, chuẩn hóa `404 ORDER_NOT_FOUND` và `400 VALIDATION_ERROR`, chốt dứt điểm `POST /api/admin/orders/:id/restock` và ghi rõ `status: "cancelled"` cho `action: "restock"`.
- **[high]** **FR-3, FR-4, FR-15 chưa định nghĩa rõ hành vi với dữ liệu đơn cũ ("hiển thị bình thường") (`§4.1`, `§4.5`)** —
  - Chưa chốt quy tắc fallback UI cho đơn cũ thiếu `statusHistory` (bước trung gian hiển thị thế nào, đơn cũ `cancelled` hiện tác nhân nào).
  - Nếu đơn cũ ở trạng thái `pending` (tạo trước khi có `storage/inventory.json`) bị hủy mà cộng trả kho sẽ đội khống Tồn kho khả dụng.
  - Đơn cũ đã `cancelled` có `inventoryRestocked === undefined` không được hiện nút hoàn kho.
  *Fix:* Quy định tường minh luật fallback UI và xử lý `inventoryRestocked === undefined` / đơn `pending` cũ trong FR-3, FR-7 và FR-15.
- **[medium]** **FR-8 bỏ sót trang chủ `/` (`src/app/page.tsx`) và chưa chốt lỗi khi nhiều món hết hàng ở `/checkout` (`§4.2`, dòng 186–192)** — `src/app/page.tsx` gọi `getFeaturedProducts(4)` và render `<ProductGrid>` có `<StockBadge>` và `<AddToCartButton>`. *Fix:* Đưa `/` (`src/app/page.tsx`) vào danh sách đọc động `force-dynamic` ở FR-8 & `addendum.md`; làm rõ fail-fast món hết hàng đầu tiên và giữ nguyên form + giỏ hàng kèm `role="alert"`.
- **[medium]** **Cụm từ mơ hồ / thiếu điều kiện biên trong FR-12, FR-13, FR-14 (`§4.4`)** — Thay `"nổi bật"` bằng tiêu chí kiểm thử được; chốt `delivered` không hiện dòng giữ chỗ; chốt chip lý do điền vào ô input (cho phép sửa) thay vì submit ngay; chốt `EmptyState`, fallback `?status=` không hợp lệ về `all`, xử lý lỗi `401` & `409` trên UI `/admin/orders`, và vùng chạm `>= 44px`.
- **[low]** **FR-6 thiếu HTTP code đầu vào và rollback error (`§4.2`, dòng 169–176)** — Bổ sung `400 VALIDATION_ERROR`, `422 PRODUCT_NOT_FOUND` và HTTP `500 INTERNAL_ERROR` sau rollback nếu `save()` lỗi.

---

## Scope honesty — thin
Các phần loại trừ phạm vi (`§5. Non-Goals` và `§6.2 Out of Scope`) viết dứt khoát và hợp lý với quy mô MVP nội bộ. Tuy nhiên, kỷ luật đánh dấu giả định (`[ASSUMPTION]`) và làm rõ căng thẳng phạm vi bị hổng đáng kể: bảng `Assumptions Index` không khớp với nội dung inline, và một số quyết định có tính giả định vẫn ẩn dưới dạng khẳng định chắc chắn.

### Findings
- **[high]** **Bảng `§9. Assumptions Index` không khớp 100% với `[ASSUMPTION]` inline (`§9` dòng 349–353)** — Chỉ có `1/3` mục xuất hiện inline trong thân `prd.md`. *Fix:* Gắn thẻ `[ASSUMPTION: ...]` inline đúng vị trí để vòng khép kín 1-1 đạt 100%.
- **[medium]** **Mâu thuẫn nội bộ về trạng thái giả định của thứ tự FIFO và các giả định ẩn khác (`§2.3 UJ-1` vs `§4.4 FR-12`, `§4.1`, `§4.4`)** — Đồng bộ `UJ-1` với `FR-12`, gắn `[ASSUMPTION]` cho các ngưỡng tự chọn (200 ký tự, 8 giờ, không phân trang dưới 500 đơn), nâng vùng chạm mobile lên `>= 44px`.

---

## Downstream usability — adequate
PRD có `§3. Glossary`, bộ ID `UJ-1..UJ-3`, `FR-1..FR-15`, `SM-1..SM-4`, `SM-C1..SM-C2` liên tục, duy nhất, mọi FR đều truy vết ngược về UJ (`Realizes UJ-X`), và `addendum.md` lập bản đồ mã nguồn chính xác.

### Findings
- **[high]** **Hợp đồng API bị chia đôi không nhất quán giữa `prd.md` và `addendum.md` (`§4.1–§4.4` vs `addendum.md §2`)** — Chuẩn hóa tất cả endpoint + status code tối thiểu vào `prd.md` và giữ `addendum.md §2` cho TypeScript request/response schema chi tiết.
- **[medium]** **Trượt thuật ngữ Glossary (Glossary drift) và thiếu thuật ngữ miền quan trọng (`§3` vs toàn bài)** — Chuẩn hóa đúng danh từ Glossary (`Tồn kho khả dụng`, `Hàng giữ chỗ`, `Nhân viên vận hành`), bổ sung `Timeline tiến trình` và `Khóa tuần tự` vào `§3`, đồng bộ trường `action` vào `FR-3`.
- **[low]** **Rò rỉ ngữ cảnh khóa học và lỗi đánh số mục nhẹ (`§8`, `Cross-Cutting NFRs`, `addendum.md`)** — Thay `"Bài 4.5"`/`"Bài 4.6"` bằng tên workflow (`bmad-ux`, `bmad-architecture`), làm rõ vị trí `Cross-Cutting NFRs`.
- **[low]** **Thiếu liên kết `Realizes UJ-3` ở FR-8 (`§4.2`, dòng 187)** — Sửa thành `Realizes UJ-2, UJ-3`.

---

## Shape fit — strong
Cấu trúc PRD vừa vặn với bài toán nội bộ brownfield trên Next.js 16 (~353 dòng + 40 dòng addendum), không thừa persona hay innovation theater.

---

## Mechanical notes (trên bản draft)
- **Assumptions Index roundtrip:** FAIL (`1/3` inline) → *Cần vá đạt 100% trước khi chuyển `status: final`.*
- **ID continuity:** PASS (`UJ-1..UJ-3`, `FR-1..FR-15`, `SM-1..SM-4`, `SM-C1..SM-C2`).
- **Glossary drift:** Có drift nhẹ đến trung bình → *Cần chuẩn hóa toàn bài.*
- **Cross-references & verified paths:** Toàn bộ file tham chiếu tồn tại; cần bổ sung `src/app/page.tsx` vào FR-8 & `addendum.md §1`.

---

## Resolution Log (trước khi chốt `status: final`)
Toàn bộ phát hiện mức **critical (1)**, **high (7)**, **medium (7)** và **low (4)** trong báo cáo này (cùng 5 gaps từ `reconcile-inputs.md`) đã được áp dụng đầy đủ vào bản `prd.md` (`status: final`) và `addendum.md`.
