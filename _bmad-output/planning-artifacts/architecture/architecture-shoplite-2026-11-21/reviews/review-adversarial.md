---
type: adversarial-review
target: ../ARCHITECTURE-SPINE.md
created: '2026-11-21'
verdict: 'Chưa đạt, cần siết AD trước khi chia story'
counts: { critical: 0, high: 7, medium: 14, low: 8 }
---

# Review đối kháng: Architecture Spine ShopLite

## Kết luận

**Chưa đạt, cần siết AD trước khi chia story.** Lõi chống bán quá tồn và hoàn kho hai lần đứng vững: không dựng được cặp nào phá AD-8, AD-9, AD-10 ở phần tồn kho. Lỗ hổng nằm ở **hợp đồng giữa các unit**: handle transaction, tập cột được ghi, DTO nhân viên, ngữ nghĩa `release`, và thứ tự câu lệnh trong READ COMMITTED.

| Mức | Số lượng | Ý nghĩa |
| --- | --- | --- |
| Critical | 0 | |
| High | 7 | Hai unit đúng AD nhưng không ghép được, hoặc sai tiền, quyền, trạng thái |
| Medium | 14 | Sai ở ca biên hoặc phải làm lại khi tích hợp |
| Low | 8 | Nên chốt, chi phí thấp |

**Cách kiểm chứng.** Đã đọc spine, PRD, addendum, EXPERIENCE và code trong `src`. Ba khẳng định về hành vi PostgreSQL (A-07, A-08, A-09) được chạy thật trên một cluster PostgreSQL 14.18 tạm, đã xóa sau khi chạy, không chạm `shoplite_dev` hay `shoplite_test`. Các mục còn lại là suy luận từ văn bản AD và code hiện có, chưa có code triển khai để chạy.

## High

### A-01. Không có kiểu transaction chung giữa các feature

- **AD:** AD-2, AD-8, AD-9, AD-10, AD-25
- **Unit A:** `order-service` mở transaction qua port `OrderRepository.withTransaction(fn)` và truyền `tx` kiểu Drizzle.
- **Unit B:** `stock-ledger.pg.ts` và `rate-limit` nhận `PoolClient` của `pg`.
- **Vì sao đều tuân thủ:** AD-9 chỉ nói "nhận transaction đang mở", AD-25 chỉ nói `consume(keys, tx?)`. Không AD nào định nghĩa kiểu `tx` hay ai mở nó.
- **Chỗ vỡ:** `placeOrder` phải đi qua ba feature trong một transaction nhưng handle không khớp. Nếu service import kiểu Drizzle để ghép thì lại phá lớp Application/Port của AD-1.
- **Siết nhỏ nhất:** Thêm vào AD-2: `src/db/transaction.ts` export `type DbTx` (opaque với service) và `runInTransaction(fn: (tx: DbTx) => Promise<T>)`. Service nhận `runInTransaction` qua deps. Mọi hàm port ghi đều nhận `tx: DbTx` là tham số đầu. Với `consume`, `tx` là bắt buộc ở đường đặt đơn.

### A-02. CAS theo `status` dính lỗi ABA sau Lùi đơn

- **AD:** AD-8, AD-13, FR-10, FR-13
- **Unit A:** Màn hình Chi tiết đơn của Thảo mở từ lúc đơn `shipping`, gửi `from=shipping, to=delivered`.
- **Unit B:** Trong lúc đó đồng nghiệp bấm Đã giao, Khoa Lùi đơn về `shipping`.
- **Vì sao đều tuân thủ:** `WHERE status = 'shipping'` đúng ở thời điểm ghi; UX không polling.
- **Chỗ vỡ:** Thao tác từ màn hình cũ thắng CAS, đơn vừa được sửa lại thành Đã giao trong khi hàng còn trên xe. Đây đúng là điều AD-8 ghi là phải ngăn ("thao tác dựa trên màn hình cũ"), và đúng kịch bản UJ-3.
- **Siết nhỏ nhất:** Thêm `orders.version integer NOT NULL DEFAULT 0`. Request gửi `expectedVersion` thay cho vai trò chống cũ của `from`; CAS là `WHERE id = $id AND status = $from AND version = $expectedVersion`, `SET version = version + 1`. Không dùng `updated_at` làm token (xem A-09). Ghi kết quả hoàn tiền không tăng `version`.

### A-03. `refund_required` và `updated_at` không có chủ ghi

- **AD:** AD-7, AD-8, AD-14, AD-19, FR-21
- **Unit A:** `casOrderStatus` làm đúng chuỗi bước của AD-8, chỉ `SET status`.
- **Unit B:** `refund-outcomes` đặt `refund_required = false` sau khi xử lý để đơn rời tab Cần hoàn tiền.
- **Vì sao đều tuân thủ:** AD-7 chỉ *trả về* `setRefundRequired`; chuỗi bước AD-8 không có bước áp dụng nó. AD-8 chỉ độc quyền cột `status`. AD-14 không cấm đổi cờ.
- **Chỗ vỡ:** Theo Unit A, đơn chuyển khoản bị hủy không bao giờ vào tab Cần hoàn tiền. Theo Unit B, lần `Ghi thêm` sau đó bị AD-14 từ chối vì cờ đã tắt. `updated_at` cũng không được AD nào bắt ghi, trong khi AD-19 sắp xếp theo nó.
- **Siết nhỏ nhất:** Thêm vào AD-8: `casOrderStatus` là đường ghi duy nhất của `status`, `version`, `updated_at`, `refund_required`, trong **cùng một câu UPDATE**; `refund_required` chỉ được đặt `true` trên cạnh hủy và bất biến sau đó. Việc rời tab chỉ suy ra từ Lịch sử.

### A-04. `release` không có ngữ nghĩa, có thể xóa bộ đếm chống dò

- **AD:** AD-25, FR-3
- **Unit A:** `release` là `DELETE FROM rate_limits WHERE key = ANY($keys)`.
- **Unit B:** Luồng Tra đơn gọi `release` đúng như AD sau mỗi lần thành công.
- **Vì sao đều tuân thủ:** AD-25 chỉ viết "thành công thì `release` các khóa đó".
- **Chỗ vỡ:** Kẻ tấn công có một đơn thật xen một lần tra đúng sau mỗi vài lần dò để xóa `lookup:ip`, vượt giới hạn 20 lần vô hạn. Bản giảm đếm không chặn dưới cũng có thể làm `count` âm khi cửa sổ đã đổi.
- **Siết nhỏ nhất:** `release` chỉ hoàn đúng một lượt vừa `consume`: `UPDATE ... SET count = GREATEST(count - 1, 0) WHERE key = $key AND window_started_at = $windowFromConsume`. `consume` trả `window_started_at` cho từng khóa. Không bao giờ xóa dòng trong luồng request.

### A-05. Cột của `orders` và `order_items` chưa được chốt

- **AD:** AD-4, AD-22, Structural Seed
- **Unit A:** `placeOrder` chỉ lưu các cột có trong ERD: `unit_price`, `quantity`, tính lại phí khi đọc.
- **Unit B:** `toCustomerOrderView` đọc `order_items.name`, `line_total`, `orders.total`, `payment_method`.
- **Vì sao đều tuân thủ:** ERD không có tên người nhận, địa chỉ, phương thức, tổng tiền, tên sản phẩm; không AD nào nói ERD là một phần hay toàn bộ.
- **Chỗ vỡ:** Hai unit không khớp schema. Nếu chọn cách join catalog và tính lại, đổi tên sản phẩm hoặc đổi `FREE_SHIPPING_THRESHOLD` sẽ làm **đổi tổng tiền của đơn cũ**, kể cả số tiền chuyển khoản đang hiển thị.
- **Siết nhỏ nhất:** Bổ sung ERD đầy đủ. `orders`: `customer_name`, `phone_normalized`, `email`, `address`, `note`, `shipping_method`, `payment_method`, `subtotal`, `shipping_fee`, `total`, `version`. `order_items`: PK `(order_id, product_id)`, bản chụp `name`, `slug`, `image`, `unit_price`, `quantity`, `line_total`. Quy tắc: tiền và tên là bản chụp lúc đặt, không tính lại khi đọc.

### A-06. Không có DTO và request contract cho API nhân viên

- **AD:** AD-8, AD-14, AD-18, AD-19, FR-9, FR-15, FR-21
- **Unit A:** `GET /api/staff/orders/:id` trả `Order` kèm `history` dạng hàng DB (`from_status`).
- **Unit B:** UI Chi tiết đơn đọc `order.latestRefundOutcome`, `history[].fromStatus`, và PATCH gửi `{ status, reason }`.
- **Vì sao đều tuân thủ:** AD-22 chỉ khóa projection khách. Bên nhân viên chỉ có đường dẫn, và "phải gửi `from`", "gửi `expectedLatest`".
- **Chỗ vỡ:** UI và route không ghép được. Riêng số đếm tab Cần hoàn tiền (`tab-count`) phải hiện ở mọi tab nhưng không endpoint nào được giao trả nó.
- **Siết nhỏ nhất:** Thêm AD mới `features/orders/staff-order-view.ts` gồm: `StaffOrderRow`, `StaffOrderDetail` (có `version`, `refundState`, `latestRefundOutcome`, `history[]` camelCase), body PATCH `{ from, to, expectedVersion, reasonCode?, reasonText? }`, body hoàn tiền `{ outcome, expectedLatest: Outcome | null, reasonText? }`, list response `{ orders, nextCursor, refundPendingCount }`.

### A-07. Khóa và đọc trong cùng một câu lệnh làm hỏng kiểm tra đồng thời

- **AD:** AD-6, AD-10, AD-14
- **Unit A:** Adapter hoàn tiền gộp cho gọn: `SELECT o.*, (SELECT refund_outcome ... ) FROM orders o WHERE id = $1 FOR UPDATE`.
- **Unit B:** Một Quản lý khác đang giữ khóa và vừa ghi `refunded`.
- **Vì sao đều tuân thủ:** AD-14 liệt kê "SELECT FOR UPDATE, đọc kết quả mới nhất" nhưng không bắt là hai câu lệnh. AD-10 có cùng dạng với advisory lock và đếm `pending` nếu gộp bằng CTE.
- **Chỗ vỡ:** **Đã chạy thật trên PostgreSQL 14.18:** sau khi chờ khóa, câu gộp vẫn thấy `latest = NULL`; bản hai câu lệnh thấy `refunded`. Hệ quả là ghi trùng kết quả hoàn tiền. Với AD-10, cùng cơ chế có thể vượt giới hạn 3 đơn chờ.
- **Siết nhỏ nhất:** Thêm vào AD-6: ở READ COMMITTED, mọi lần đọc dùng để quyết định sau khi lấy khóa **phải là câu lệnh riêng, chạy sau câu lấy khóa**. Áp dụng tường minh cho AD-10 bước 2→3 và AD-14. Race test của hai đường này là bắt buộc.

## Medium

### A-08. `available` có thể lớn hơn `requested`

- **AD:** AD-11, FR-19
- **Unit A:** `reserveStock` có `UPDATE` 0 hàng rồi đọc lại `stock`.
- **Unit B:** `restoreStock` của một đơn hủy commit xen giữa hai câu.
- **Vì sao đều tuân thủ:** AD-11 bảo "đọc `stock` hiện tại".
- **Chỗ vỡ:** **Đã chạy thật:** nhận `requested=2 available=6`. Form hiện `Bạn chọn 2 · Chỉ còn 6` và nút `Lấy 6`, có thể vượt số khách chọn.
- **Siết nhỏ nhất:** Trả `available = min(stockĐọcĐược, requested - 1)`.

### A-09. Độ chính xác thời gian làm mất dòng khi phân trang

- **AD:** AD-19, Consistency Conventions
- **Unit A:** Cột `timestamptz` mặc định, độ chính xác micro giây.
- **Unit B:** Cursor keyset mã hóa bằng `Date.toISOString()`, độ chính xác mili giây.
- **Vì sao đều tuân thủ:** Quy ước chỉ nói `timestamptz` và ISO 8601 UTC.
- **Chỗ vỡ:** **Đã chạy thật:** cursor cắt về ms làm mất dòng cùng mili giây ở trang sau.
- **Siết nhỏ nhất:** Mọi cột thời gian là `timestamptz(3)`; adapter trả `Date`, DTO trả `toISOString()`.

### A-10. Nguồn thời gian và thứ tự Lịch sử không thống nhất

- **AD:** AD-12, AD-13, AD-14
- **Unit A:** Service ghi `created_at` bằng `now()` inject từ app.
- **Unit B:** Adapter dùng `DEFAULT now()` của database, vốn là giờ bắt đầu transaction.
- **Vì sao đều tuân thủ:** Chỉ AD-25 chốt đồng hồ database.
- **Chỗ vỡ:** "Mới nhất" theo `created_at, id` có thể khác thứ tự ghi thật, ảnh hưởng mốc Đã giao và `expectedLatest`.
- **Siết nhỏ nhất:** Mọi timestamp nghiệp vụ do database cấp. Trong một đơn, thứ tự chuẩn của Lịch sử là `id` (được chèn khi đang giữ khóa dòng `orders`); một helper duy nhất đọc "kết quả mới nhất".

### A-11. Mã lý do không có chủ, không ràng theo cạnh

- **AD:** AD-7, Consistency Conventions, FR-12, FR-13
- **Unit A:** Zod của route chấp nhận hợp của 7 mã.
- **Unit B:** `decideTransition` chỉ kiểm `reasonCode !== "out_of_stock"`.
- **Vì sao đều tuân thủ:** Bảng quy ước chỉ liệt kê mã. AD-7 còn tự mâu thuẫn: tham số là `reason`, quy tắc dùng `reasonCode`.
- **Chỗ vỡ:** Hủy với `mistaken_delivery` hay Lùi đơn với `out_of_stock` đều lọt vào Lịch sử, làm sai SM-C1. Chữ còn sót khi đổi từ `Khác` sang mã khác bị xử lý mỗi nơi một kiểu.
- **Siết nhỏ nhất:** `features/orders/order-reasons.ts` export `CANCEL_REASONS`, `REVERT_REASONS`, nhãn tiếng Việt. Đổi chữ ký thành `reasonCode`, `reasonText`. `decideTransition` kiểm mã theo cạnh; server từ chối `reasonText` đi kèm mã khác `other`, UI xóa chữ khi đổi lựa chọn.

### A-12. AD-14 gộp mọi lỗi thành `REFUND_OUTCOME_CONFLICT`

- **AD:** AD-3, AD-14, EXPERIENCE
- **Unit A:** Service theo đúng câu "sai ở bất kỳ bước nào" trả 409 cho cả thiếu lý do và đơn không tồn tại.
- **Unit B:** UI xử lý 409 như xung đột đồng thời: đóng hộp thoại, tải lại.
- **Vì sao đều tuân thủ:** Đúng nguyên văn AD-14 và EXPERIENCE.
- **Chỗ vỡ:** Quản lý thiếu lý do đính chính bị đóng hộp thoại, mất dữ liệu đã nhập, thấy báo "người khác cập nhật".
- **Siết nhỏ nhất:** Body sai hoặc thiếu lý do là `VALIDATION_ERROR`; không có đơn là `ORDER_NOT_FOUND`; chỉ sai điều kiện trạng thái, cờ hoặc `expectedLatest` mới là `REFUND_OUTCOME_CONFLICT`.

### A-13. Trang login không có hàm guard hợp lệ để gọi

- **AD:** AD-17, AD-18
- **Unit A:** Trang login "kiểm tra qua guard" bằng `requireStaffPage`.
- **Unit B:** `requireStaffPage` chuyển về `/staff/login` khi thiếu phiên.
- **Vì sao đều tuân thủ:** AD-17 bắt login dùng guard; AD-18 chỉ cho guard hai export, cả hai đều từ chối khi thiếu phiên.
- **Chỗ vỡ:** Khách chưa đăng nhập bị vòng chuyển hướng; tự query phiên thì phá "nơi duy nhất".
- **Siết nhỏ nhất:** Guard export thêm `getOptionalStaff()`, chỉ trang login được dùng.

### A-14. Kiểm `Sec-Fetch-Site` không rõ khi thiếu header, thứ tự và phạm vi

- **AD:** AD-18
- **Unit A:** `withStaff` kiểm CSRF trước, thiếu header coi là "khác `same-origin`" nên trả 403.
- **Unit B:** Test bắt buộc của AD-18 gọi mọi route không cookie và mong 401.
- **Vì sao đều tuân thủ:** AD không nói thứ tự hay ca thiếu header.
- **Chỗ vỡ:** Test đỏ với route ghi, Playwright `request` cũng bị 403. Ngược lại `login` đứng ngoài `withStaff` nên không có kiểm tra CSRF nào.
- **Siết nhỏ nhất:** Một hàm `assertSameOrigin(request)`, dùng cho `withStaff` và `login`: header có và khác `same-origin` thì 403; thiếu header thì so `Origin` nếu có. Thứ tự: same-origin → phiên (401) → vai (403). Test 401 gửi kèm `Sec-Fetch-Site: same-origin`.

### A-15. Khóa và chính sách rate limit không có định dạng chung

- **AD:** AD-25
- **Unit A:** Tra đơn tạo `lookup:ip-order:<ip>:<id>`.
- **Unit B:** `rate-limit` nhận `{ key, limit, windowMs }`, hoặc test tạo `lookup:ip-order:<id>:<ip>`.
- **Vì sao đều tuân thủ:** AD-25 chỉ cho định dạng đầy đủ của khóa login; `consume(keys, tx?)` không có chỗ cho ngưỡng và cửa sổ.
- **Chỗ vỡ:** Bộ đếm tách đôi, test không đọc được khóa thật. Username dài tùy ý đi vào PK có thể gây lỗi 500 trước khi scrypt chạy.
- **Siết nhỏ nhất:** `features/rate-limit/policies.ts` là nơi duy nhất dựng khóa và ngưỡng: `lookupKeys(ip, orderId)`, `loginKey(ip, username)`, `orderKey(ip)`. Thành phần do người dùng nhập được `encodeURIComponent`; username quá 64 ký tự bị từ chối trước `consume`.

### A-16. `bigint` có thể làm hỏng JSON

- **AD:** Structural Seed, AD-12, AD-15
- **Unit A:** Schema khai báo `bigint(..., { mode: "bigint" })`.
- **Unit B:** Route trả `NextResponse.json(history)`.
- **Vì sao đều tuân thủ:** Spine không chốt mode của id.
- **Chỗ vỡ:** `JSON.stringify` ném `TypeError` với `BigInt`, route trả 500. Mode `string` thì client lại nhận kiểu khác.
- **Siết nhỏ nhất:** Dùng `bigint` với `mode: "number"` cho `id` nội bộ; DTO không lộ `actor_staff_id`.

### A-17. Dòng `order_created` và actor chưa có hình dạng

- **AD:** AD-12, FR-14
- **Unit A:** `placeOrder` ghi `to_status='pending'`, `actor_type='customer'`, `actor_name` là tên thật của khách.
- **Unit B:** UI Lịch sử coi `to_status` rỗng là dòng tạo đơn, chờ `actor_type` thuộc `staff|manager|system`.
- **Vì sao đều tuân thủ:** CHECK của AD-12 không nói về `order_created`, không liệt kê `actor_type`.
- **Chỗ vỡ:** Hiển thị sai, và tên khách bị chép vào bảng append-only, không sửa được.
- **Siết nhỏ nhất:** CHECK: `order_created` có `from_status NULL`, `to_status='pending'`, `actor_type='customer'`, `actor_staff_id NULL`, `actor_name='Khách hàng'`. `actor_type` thuộc `customer|staff`; dòng `staff` bắt buộc `actor_staff_id`. Dòng hoàn tiền có `reason_code NULL`, lý do đính chính ở `reason_text`.

### A-18. `customer-order-view.ts` vừa thuần vừa cần cấu hình

- **AD:** AD-1, AD-22, AD-31
- **Unit A:** `toCustomerOrderView` gọi `getServerEnv()` để lấy `shopPhone`, thông tin ngân hàng.
- **Unit B:** Component khách import helper che dữ liệu hoặc kiểu từ cùng file.
- **Vì sao đều tuân thủ:** File nằm ở vị trí Domain thuần, nhưng AD-22 buộc kết quả chứa dữ liệu env.
- **Chỗ vỡ:** Đồ thị import client kéo theo `lib/env.ts`, hoặc hàm mất tính thuần và khó test.
- **Siết nhỏ nhất:** Chữ ký `toCustomerOrderView(order, statusRows, shopConfig)`; `orders/server.ts` đọc env và truyền `shopConfig`. Kiểu `CustomerOrderView` chỉ `import type`.

### A-19. Username không được chuẩn hóa nhất quán

- **AD:** AD-15, AD-25
- **Unit A:** Seed lưu `Thao`, unique phân biệt hoa thường.
- **Unit B:** Login dựng khóa rate limit bằng chữ thường và query theo chuỗi đã hạ thường.
- **Vì sao đều tuân thủ:** Chỉ AD-25 nói "username viết thường".
- **Chỗ vỡ:** Tài khoản không đăng nhập được, hoặc `Thao` và `thao` là hai tài khoản dùng chung một bộ đếm.
- **Siết nhỏ nhất:** `normalizeUsername = trim + toLowerCase` dùng ở seed và login; thêm `CHECK (username = lower(username))`.

### A-20. `TEST_DATABASE_URL` không được nối vào `src/db/client.ts`

- **AD:** AD-5, AD-30, AD-31, AD-32
- **Unit A:** `client.ts` đọc `DATABASE_URL` qua `getServerEnv()`.
- **Unit B:** `test:db` chạy với `--env-file=.env`, chỉ dùng `TEST_DATABASE_URL` trong helper reset.
- **Vì sao đều tuân thủ:** AD-31 nói biến này "chỉ script test", không nói cách chuyển vào client.
- **Chỗ vỡ:** Service dưới test ghi vào `shoplite_dev`. Guard chỉ nằm ở helper reset nên test không gọi reset sẽ lọt.
- **Siết nhỏ nhất:** `test:db` và `db:test:prepare` đặt `DATABASE_URL=$TEST_DATABASE_URL` trước khi nạp app. Global setup của Vitest DB query `current_database()` và dừng nếu khác `shoplite_test`.

### A-21. Script không chạy được với cách import của `src`

- **AD:** AD-27, AD-32, Stack
- **Unit A:** `scripts/db-seed.ts` import `@/data/inventory-seed`.
- **Unit B:** `package.json` chạy `node --env-file=.env scripts/db-seed.ts`.
- **Vì sao đều tuân thủ:** AD-32 bắt dùng `node`; code hiện tại dùng alias `@/`.
- **Chỗ vỡ:** Node không phân giải alias của `tsconfig`. Engine cho phép từ 22.12, trong khi chạy TypeScript trực tiếp không mặc định ở các bản 22 đầu.
- **Siết nhỏ nhất:** Chốt một cách chạy: hoặc nâng engine tới bản có type stripping và script chỉ dùng import tương đối có đuôi `.ts`, hoặc thêm `tsx` làm devDependency và ghi vào Stack.

## Low

| ID | AD | Cặp và chỗ vỡ | Siết nhỏ nhất |
| --- | --- | --- | --- |
| A-22 | AD-26 | Tìm kiếm gọi `normalizePhone` với chuỗi tùy ý, Tra đơn gọi sau regex; hàm trả nguyên chuỗi hay ném lỗi là chưa rõ | `normalizePhone(raw): string \| null`, idempotent, `null` khi không khớp `VN_PHONE_REGEX` |
| A-23 | AD-20 | Hai response cấp quyền song song, cookie sau ghi đè cookie trước nên mất một mã; hàm đọc chưa có tên | Ghi nhận là rủi ro chấp nhận, fallback Tra đơn; export một `readOrderAccess` duy nhất |
| A-24 | AD-17, AD-18 | Proxy và guard cùng dựng `next`; validator chưa nói `/staff/../x`, `%2f`, `%5c` hay query | Một `sanitizeStaffNext`; từ chối dot-segment và dấu phân cách đã encode; chốt có giữ query hay không |
| A-25 | AD-29 | `/api/inventory` chưa có shape; `/cart` và `/checkout` có thể đọc khác nhau | Chốt `{ stock: Record<productId, number> }`, id thiếu trả 0, `ids` phân tách bằng dấu phẩy |
| A-26 | AD-12, AD-30, AD-32 | Helper reset dùng `DELETE` bị trigger chặn; trigger thêm tay dễ lệch quy trình generate | Reset bằng `TRUNCATE ... RESTART IDENTITY CASCADE`; trigger nằm trong migration `drizzle-kit generate --custom` |
| A-27 | AD-21, AD-23 | Tra đơn viết hoa Mã đơn, `/orders/:id` chưa nói có viết hoa không; link chữ thường bị coi là sai định dạng | Một `normalizeOrderId` dùng cho lookup, trang, API và tìm kiếm |
| A-28 | AD-15 | `staff:hash` và `staff:seed` có thể khác định dạng hash và `STAFF_ACCOUNTS` | Chốt `scrypt:N:r:p:saltB64:hashB64` và `STAFF_ACCOUNTS` là JSON array |
| A-29 | AD-16, AD-18 | `logout` qua `withStaff`, phiên đã hết hạn nhận 401 và cookie không bị xóa | Logout idempotent: luôn xóa cookie, thu hồi nếu còn phiên |

## Các cặp đã tấn công và loại bỏ

| Cặp | Vì sao spine đã chặn |
| --- | --- |
| Đặt đơn và hủy đơn trên cùng tồn kho | AD-9: UPDATE có điều kiện, một đường ghi, `CHECK (stock >= 0)` |
| Hai người cùng hủy | AD-8 và AD-9: chỉ bên thắng CAS mới hoàn kho, bên thua rollback |
| Deadlock đặt đơn và chuyển trạng thái | AD-10: đơn mới chưa bị ai khóa, `inventory` luôn tăng dần. Mã hiện tại `p001`..`p016` cùng độ dài nên so sánh chuỗi không lệch |
| Hoàn tiền chen với giao dịch hủy | AD-14 khóa dòng `orders` và kiểm `status = cancelled`; phần còn hở nằm ở A-07 |
| Mốc Đang giao sau Lùi đơn | AD-13: lấy dòng sớm nhất `confirmed → shipping`, dòng Lùi đơn không khớp |
| Dòng hoàn tiền chen vào mốc khách | AD-12 và AD-13: lọc theo `event_type`, kiểu đầu vào chỉ gồm `status_changed` |
| Hai nơi ghi cookie quyền xem với hai định dạng | AD-20: cùng `grantOrderAccess` |
| Vượt 3 đơn chờ qua `0...` và `+84...` | AD-10 và AD-26, với điều kiện đọc sau khóa theo A-07 |
| Vòng chuyển hướng proxy khi cookie đã chết | AD-17: proxy không rời khỏi `/staff/login`; phần còn hở ở trang login là A-13 |
| Tràn `integer` của tiền | Đơn lớn nhất theo catalog hiện tại (16 sản phẩm × 10) là 275.000.000đ |
| Seed ghi đè tồn thật | AD-32: `ON CONFLICT DO NOTHING` |

## Cần người quyết định

1. **Bucket IP `direct` khi chưa có proxy tin cậy (AD-24, AD-25, FR-3, FR-20).** Ở mặc định, cả shop dùng chung 10 đơn mỗi giờ, và một người dò sai 20 lần chặn Tra đơn của mọi khách. Điều này trái tiêu chí FR-3 "IP bị chặn không ảnh hưởng khách ở IP khác". Spine đã ghi cần sửa PRD nhưng PRD chưa đổi. Cần chọn: chấp nhận cho local và **cấm nhận đơn thật khi `TRUSTED_PROXY_HOPS = 0`**, hay làm custom server để lấy địa chỉ socket. Đề xuất: chọn cách đầu và cho server từ chối khởi động ở production khi giá trị là 0.
2. **Nội dung Trang xác nhận (AD-22).** Danh sách khóa đóng của AD-22 bỏ `subtotal`, `shippingFee`, ảnh sản phẩm và giờ đặt mà trang hiện tại đang hiển thị. PRD chỉ yêu cầu "sản phẩm, tổng tiền", nên đây không phải lỗi, nhưng khách chuyển khoản sẽ thấy tổng tiền không có dòng phí giao. Cần landv xác nhận bỏ hay thêm `subtotal` và `shippingFee` vào projection. Đề xuất: thêm hai trường này vì không phải dữ liệu nhạy cảm.
