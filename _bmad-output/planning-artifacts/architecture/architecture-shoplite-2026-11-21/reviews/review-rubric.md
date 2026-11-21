# Review rubric: ARCHITECTURE-SPINE shoplite

- **Ngày:** 2026-11-21
- **Đối tượng:** `ARCHITECTURE-SPINE.md` (status: draft)
- **Thước đo:** "Good-spine checklist" trong `.claude/skills/bmad-architecture/references/reviewer-gate.md`
- **Vai trò:** reviewer độc lập, chỉ báo cáo, không sửa spine

## 1. Kết luận

**CHƯA ĐẠT, cần sửa rồi mới bàn giao.** Hướng kiến trúc đúng và phần lớn khẳng định về code hiện có là chính xác, nhưng spine bỏ sót đường nối quan trọng nhất (transaction đi qua các feature), chưa chốt hợp đồng dữ liệu của đơn, và có hai quyết định rate limit trái tiêu chí FR-3. Đồng thời spine quá chi tiết cho dự án học tập: 32 AD nên còn khoảng 14.

| Mức | Số lượng |
| --- | --- |
| Critical | 0 |
| High | 7 |
| Medium | 9 |
| Low | 9 |
| **Tổng** | **25** |

## 2. Đối chiếu checklist

| Tiêu chí | Kết quả | Ghi chú |
| --- | --- | --- |
| Chốt đúng các điểm phân kỳ, không bỏ sót | **Không đạt** | H1, H2, H3 |
| Rule của mỗi AD thực thi được và thật sự ngăn phân kỳ | **Một phần** | H3, H6, H7, M5, M7 |
| Không mục Deferred nào để hai unit phân kỳ | Đạt | Mục Deferred hợp lý; riêng proxy cần chặn ở production (H4) |
| Công nghệ đã xác minh còn hiện hành | **Một phần** | Package đúng bản mới nhất; PostgreSQL 14 đã hết hỗ trợ (M8) |
| Phê chuẩn, không mâu thuẫn code hiện có | **Một phần** | H2, M2 |
| Phủ các capability của spec | **Một phần** | Đủ 21 FR trong bản đồ; FR-3 và FR-18 chưa đạt trọn (H4, H5, M6) |
| Không làm yếu spine cha | Không áp dụng | Không có spine cha |
| Không dimension nào im lặng | **Một phần** | Vận hành đã Deferred; vòng đời dữ liệu và index im lặng (L7, L8) |

## 3. Phát hiện High

### H1. Không có hợp đồng transaction giữa các feature

- **Vị trí:** bảng Design Paradigm; AD-2, AD-8, AD-9, AD-10, AD-25
- **Vấn đề:** `placeOrder` phải chạy `consume` (rate-limit), `reserveStock` (inventory) và insert đơn (orders) trong một transaction. Bảng lớp ghi Application "điều phối transaction", còn Adapter giữ "SQL, Drizzle, transaction". Spine không nói ai mở transaction, kiểu của `tx` là gì, và service không được import Drizzle thì nhận `tx` bằng cách nào.
- **Hậu quả:** ba feature có thể chọn ba cách khác nhau: lộ kiểu Drizzle qua port, truyền `tx` opaque, hoặc đẩy cả luồng xuống adapter. Đây đúng là loại phân kỳ spine phải chặn.
- **Đề xuất:** thêm vào AD-2 một port duy nhất, ví dụ `runInTransaction<T>(fn: (tx: TxContext) => Promise<T>)`, với `TxContext` opaque định nghĩa ở một nơi; spike AD-6 phải dùng đúng port này.

### H2. Hợp đồng dữ liệu của `orders` và `order_items` chưa được chốt

- **Vị trí:** Structural Seed; AD-14; AD-22
- **Vấn đề:**
  - ERD thiếu các trường mà `Order` hiện có (`src/features/orders/types.ts`): thông tin người nhận, `shipping_method`, `payment_method`, `subtotal`, `shipping_fee`, `total`.
  - `order_items` thiếu bản chụp `name`, `slug`, `image`, `line_total`. AD-22 cần `name` và `lineTotal`.
  - AD-14 viết `orders` "không có cột kết quả hay thanh toán", đọc theo nghĩa đen thì cấm luôn `payment_method`, trong khi AD-7 và AD-22 cần cột này.
  - Dòng Lịch sử trong ERD thiếu `actor_type`, `actor_name`, `created_at` mà AD-12 bắt buộc.
- **Hậu quả:** một unit có thể join catalog tĩnh thay vì lưu bản chụp, làm đơn cũ đổi tên sản phẩm khi catalog đổi. Đây là hồi quy so với hành vi hiện tại.
- **Đề xuất:** ghi rõ "`order_items` là bản chụp lúc đặt", liệt kê đủ cột, sửa AD-14 thành "không có cột `payment_status` hay kết quả hoàn tiền".

### H3. Ngữ nghĩa `release` chưa định nghĩa, có thể mở đường dò Mã đơn

- **Vị trí:** AD-25
- **Vấn đề:** "thành công thì `release` các khóa đó" không nói là giảm 1 hay xóa khóa.
- **Hậu quả:** nếu xóa khóa, kẻ tấn công có một đơn hợp lệ của mình có thể dò 19 lần, tra đúng một lần để xóa `lookup:ip`, rồi lặp lại, vô hiệu hóa giới hạn FR-3. Nếu giảm 1 mà không kiểm cửa sổ, lần `release` sau khi cửa sổ đã reset sẽ trừ vào cửa sổ mới hoặc làm bộ đếm âm.
- **Đề xuất:** chốt "`release` giảm đúng 1, sàn 0, chỉ khi `window_started_at` trùng cửa sổ đã `consume`", và thêm test cho chuỗi sai, đúng, sai.

### H4. Chế độ mặc định biến giới hạn IP thành giới hạn toàn shop

- **Vị trí:** AD-24, AD-25, bảng biến ở AD-31
- **Vấn đề:** phân tích về Next là đúng (`base-server.js:567` chỉ gán socket khi thiếu header). Nhưng với `TRUSTED_PROXY_HOPS=0`, mọi khách chung bucket `direct`, nên:
  - cả shop chỉ nhận **10 đơn mỗi giờ**;
  - 20 lần tra sai của một người chặn Tra đơn của **mọi khách** trong 15 phút, và khách thật chỉ thấy "Thông tin không đúng";
  - bất kỳ ai cũng khóa được đăng nhập của một nhân viên nếu biết username (5 lần).
- **Mâu thuẫn:** FR-3 yêu cầu "Một IP bị chặn không làm Khách hàng ở IP khác mất quyền Tra đơn". Spine đề xuất sửa PRD, nhưng app vẫn khởi động được ở production với giá trị 0.
- **Đề xuất:** khi `NODE_ENV=production`, bắt buộc khai báo `TRUSTED_PROXY_HOPS` tường minh; giá trị 0 phải là lựa chọn có chủ đích. Xem quyết định D1.

### H5. Khóa `lookup:order` cho phép khóa đơn của khách thật từ xa

- **Vị trí:** AD-25; Upstream Edits dòng `prd.md:107-111`
- **Vấn đề:** 20 lần sai trên một Mã đơn, bất kể IP, sẽ chặn cả chủ đơn. Mã đơn có thể lộ qua nhãn gói hàng (PRD 6.3). Lỗi này vẫn còn **kể cả khi proxy cấu hình đúng**, và trái trực tiếp FR-3. Cột Prevents của AD-25 lại nêu mục tiêu tránh khóa Mã đơn của khách thật.
- **Đề xuất:** đây là đánh đổi sản phẩm giữa chống dò phân tán và tính sẵn sàng, cần người quyết định. Xem D2.

### H6. Các test bảo vệ invariant cốt lõi không nằm trong cổng nào

- **Vị trí:** AD-30; Deferred dòng CI; `package.json`
- **Vấn đề:** `npm run check` chỉ gồm lint, typecheck và `npm test`, mà AD-30 lại loại `*.db.test.ts` khỏi `npm test`. Repo không có CI. Vậy các race test của AD-8, AD-9, AD-10, trigger AD-12 và test quyền của AD-18 (nếu cần DB) không chạy ở bước nào bắt buộc.
- **Hậu quả:** SM-2, SM-3, SM-4 có thể hỏng trong khi `check` vẫn xanh.
- **Đề xuất:** thêm `npm run check:full` gồm `check` và `test:db`, và ghi Rule: PR chạm orders, inventory, rate-limit hoặc staff-auth phải chạy lệnh này. Chưa cần CI.

### H7. Quy tắc log của AD-3 không chặn được rò dữ liệu khách

- **Vị trí:** AD-3; NFR Bảo mật (PRD 4.9)
- **Vấn đề:**
  - `DrizzleQueryError` của drizzle-orm 0.45.4 đặt cả tham số vào `message` (`Failed query: ...\nparams: ...`), nên `stack` cũng chứa số điện thoại, địa chỉ. Rule "stack đã loại tham số SQL" không nói cách làm và rất dễ làm sai.
  - `handleRouteError` chỉ phủ route API. Lỗi ném trong Server Component (`/orders/[id]`, `/staff/**`) đi theo đường log của Next, ngoài phạm vi Rule. Điểm này suy ra từ cơ chế của Next, chưa chạy thử.
- **Đề xuất:** không log `message` hay `stack` của lỗi DB; chỉ log `name`, mã SQLSTATE từ `cause.code` và route. Adapter bọc lỗi DB thành lỗi đã làm sạch trước khi ném lên, để cả trang và route đều an toàn.

## 4. Độ chi tiết: 32 AD có quá nhiều không?

**Có.** Ở độ cao feature của một dự án học tập, một người làm, AD nên giữ cho những chỗ hai unit thật sự có thể chọn khác nhau. Áp ba câu hỏi: (A) hai unit có thể chọn không tương thích, (B) lựa chọn không hiển nhiên, (C) có đánh đổi thật.

Kết quả: **14 giữ làm AD gốc, 8 gộp vào AD gốc, 10 không qua phép thử** và nên chuyển thành convention hoặc tiêu chí story.

| AD | A | B | C | Đề xuất |
| --- | --- | --- | --- | --- |
| 1 Hướng phụ thuộc | Có | Có | Có | **Giữ**, sửa theo M2 |
| 2 Repository, DI | Có | Không | Một phần | Gộp vào AD-1, thêm port transaction (H1) |
| 3 Shape lỗi | Có | Có | Một phần | **Giữ** |
| 4 Tính lại giá | Không | Không | Không | **Story**: hành vi có sẵn cộng một bug fix |
| 5 Không Docker | Một phần | Có | Không | **Convention** / dòng Stack |
| 6 Drizzle, spike | Có | Có | Có | **Giữ** |
| 7 Máy trạng thái | Không | Có | Một phần | Gộp vào AD-8 |
| 8 Một đường ghi Trạng thái | Có | Có | Có | **Giữ** |
| 9 Một đường ghi Tồn kho | Có | Có | Có | **Giữ** |
| 10 Thứ tự khóa | Có | Có | Có | Gộp vào AD-9 |
| 11 Payload thiếu hàng | Có | Không | Không | **Convention** trong hợp đồng lỗi |
| 12 Lịch sử append-only | Có | Có | Có | **Giữ** |
| 13 Mốc khách | Không | Không | Không | **Story** FR-7; giữ một câu "chỉ đọc `status_changed`" ở AD-12 |
| 14 Kết quả hoàn tiền | Một phần | Có | Có | Gộp vào AD-12 phần "suy ra từ Lịch sử"; còn lại vào story FR-21 |
| 15 Tài khoản, scrypt | Không | Có | Có | Gộp vào AD-16 |
| 16 Phiên có thu hồi | Một phần | Có | Có | **Giữ** làm AD xác thực nhân viên |
| 17 Proxy lạc quan | Không | Không | Không | **Convention**: tài liệu Next đã khuyến nghị; một câu trong AD-18 |
| 18 Một guard | Có | Có | Có | **Giữ** |
| 19 Danh sách đơn | Không | Không | Không | **Story** FR-9 |
| 20 Cookie quyền xem | Có | Có | Có | **Giữ**; quy tắc loại mã chuyển vào story |
| 21 Không lộ đơn tồn tại | Có | Có | Một phần | Gộp vào AD-20 |
| 22 Projection cho khách | Có | Có | Một phần | **Giữ** |
| 23 Một kiểu thất bại | Có | Có | Có | Gộp vào AD-22 |
| 24 Nguồn IP | Có | Có | Có | Gộp vào AD-25; gom IPv6 `/64` có thể Deferred tới khi deploy |
| 25 Rate limit | Có | Có | Có | **Giữ** |
| 26 Chuẩn hóa số | Có | Không | Không | **Convention** |
| 27 Nguồn đọc Tồn kho | Có | Có | Có | **Giữ** |
| 28 Render động | Một phần | Không | Không | **Convention** |
| 29 Giỏ không giữ stock | Không | Không | Một phần | **Story** FR-18 |
| 30 Chiến lược test | Có | Có | Có | **Giữ** |
| 31 Biến môi trường | Có | Có | Một phần | **Giữ**, gộp phần cấu hình của AD-32 |
| 32 Setup, migration, seed | Một phần | Không | Không | **Convention** + runbook; giữ câu "đóng route cũ sau cùng" |

Lưu ý: rút gọn không làm mất nội dung. Các chi tiết cụ thể đang rất tốt cho story, chỉ nên chuyển chỗ để spine ngắn lại.

## 5. Rule có kiểm được trong PR không?

| Cách kiểm | AD | Nhận xét |
| --- | --- | --- |
| Rule đã nêu test cụ thể | 7, 18 (route), 22, 30 | Tốt; AD-18 còn thiếu phần trang (M5) |
| Compiler bắt được | 11, 27, 29 | Xóa field làm lỗi type ở mọi chỗ dùng |
| Cần DB test, chưa có cổng bắt buộc | 8, 9, 10, 12, 14, 16, 20, 21, 23, 25 | Xem H6 |
| Grep hoặc ESLint được, nhưng chưa có luật | 1, 2, 5, 24, 26, 28, 31, 32 | Xem M7 |
| Khó kiểm hoặc mơ hồ | 3 (làm sạch stack), 25 (`release`), 6 và 32 (thứ tự merge) | Xem H7, H3; thứ tự merge cần ghi vào story dependency |

## 6. Dimension

| Dimension | Tình trạng |
| --- | --- |
| Deploy, hosting, TLS, proxy | Deferred, có điều kiện xem lại |
| Môi trường dev, test | Đã quyết định |
| Backup, giám sát, CI | Deferred, có điều kiện xem lại |
| Bảo mật, xác thực, phân quyền | Đã quyết định, còn H3, H7, M5 |
| Đồng thời, toàn vẹn | Đã quyết định, còn H1 |
| Migration | Đã quyết định; chưa nói rõ chỉ đi tiến hay có rollback (nên thêm một câu) |
| **Vòng đời dữ liệu cá nhân** | **Im lặng** (L7) |
| **Index, hiệu năng truy vấn** | **Im lặng** (L8) |

## 7. Phát hiện Medium

| ID | Vị trí | Vấn đề | Đề xuất |
| --- | --- | --- | --- |
| M1 | Toàn spine | Quá chi tiết: 10/32 AD không qua phép thử, 8 AD nên gộp | Theo mục 4 |
| M2 | Bảng lớp, AD-1 | "Phụ thuộc ngược duy nhất" sai với code: `src/data/products.ts`, `src/data/categories.ts`, `src/components/layout/header.tsx`, `footer.tsx` đều import từ `features`. `components/layout` không thuộc lớp nào. `catalog-service.ts` khớp mẫu Application nhưng AD-27 yêu cầu thuần vì `catalog-filters.tsx` (client) import nó | Thêm lớp layout, cho phép `import type` từ shared, ghi `catalog-service.ts` là ngoại lệ thuần |
| M3 | AD-30, AD-32, Stack | `node --env-file=.env` không phân giải alias `@/` (đã chạy thử: `ERR_MODULE_NOT_FOUND` với `checkout-schema.ts`). `engines` cho phép 22.12, thấp hơn bản bật type stripping mặc định (22.18). Chưa chốt `test:db` nạp env và ánh xạ `TEST_DATABASE_URL` sang `DATABASE_URL` thế nào | Chốt một runner cho script (ví dụ `tsx`) hoặc nâng `engines`; ghi rõ cách nạp env cho test |
| M4 | AD-30 | "Cổng riêng" không cô lập E2E: Next 16.4.2 bật `lockDistDir`, `next dev` thứ hai trong cùng thư mục sẽ thoát với "Another next dev server is already running" | E2E dùng `distDir` riêng hoặc `next build` + `next start` |
| M5 | AD-18 | Kiểm `Sec-Fetch-Site` nằm trong `withStaff` nên `login` không được bảo vệ (login CSRF); request thiếu header vẫn qua. Test tự động chỉ duyệt `route.ts`, không duyệt `page.tsx` | Tách kiểm same-origin dùng cho cả login; thêm test duyệt page |
| M6 | AD-29 vs FR-18 | FR-18 yêu cầu giới hạn số lượng đọc từ Tồn kho; AD-29 chỉ kẹp theo 10 và không nói `getMaxQuantity`, `cart-item-row` dùng gì | Chốt `max` ở giỏ là `min(tồn, 10)` khi có dữ liệu, 10 khi lỗi tải |
| M7 | AD-1, 2, 26, 28, 31 | Rule grep được nhưng không có cơ chế chạy | Thêm `no-restricted-imports`, `no-restricted-syntax` cho `process.env`, và `server-only` ở `server.ts`, `*.pg.ts` |
| M8 | Stack, AD-5 | PostgreSQL 14 hết hỗ trợ ngày 2026-11-12 theo trang versioning chính thức; bản vá cuối là 14.25, máy dev dùng 14.18 | Xem D3 |
| M9 | AD-14 | "Sai ở bất kỳ bước nào trả `REFUND_OUTCOME_CONFLICT`" bao cả đơn không tồn tại và thiếu lý do; `decideRefundOutcome(latest, requested)` không nhận lý do dù phải bắt buộc | Không tồn tại trả `ORDER_NOT_FOUND`, thiếu lý do trả `VALIDATION_ERROR`, thêm tham số lý do |

## 8. Phát hiện Low

| ID | Vị trí | Vấn đề |
| --- | --- | --- |
| L1 | Upstream Edits | Thiếu `prd.md:453` (Open Question 5 vẫn ghi "dùng địa chỉ kết nối"), trái AD-24 |
| L2 | AD-7 | Tham số là `reason` nhưng công thức dùng `reasonCode`; chưa nói ai chặn mã lý do Lùi đơn dùng trên cạnh Hủy và ngược lại |
| L3 | AD-12 | CHECK chưa quy định cột của `order_created`. `created_at` nếu dùng `now()` là giờ bắt đầu transaction, có thể đảo thứ tự hai dòng sát nhau; nên sắp theo `id` hoặc dùng `clock_timestamp()` |
| L4 | AD-25 | Khóa `login:<ip>:<username>` chưa giới hạn độ dài username và không có trần theo IP, nên `rate_limits` có thể phình |
| L5 | AD-31, addendum | Addendum nói `.env.local` trong git có giá trị `replace_me`, nhưng bản ở HEAD (đã có trên `origin/main`) là giá trị khác; chỉ working tree mới là `replace_me` và chưa commit. Kiểm tra hình dạng cho thấy giống placeholder, không giống khóa thật. Giá trị không được in ra trong review này |
| L6 | AD-2 | `storage/` chưa nằm trong `.gitignore`, chứa 11 đơn thử, có thể bị commit nhầm |
| L7 | Deferred | Im lặng về thời hạn lưu và xóa dữ liệu cá nhân; nên thêm một dòng Deferred trước khi có đơn thật |
| L8 | Structural Seed | Chưa nêu index cho `phone_normalized`, tab theo `status`, keyset `(updated_at, id)`, Lịch sử theo `order_id` |
| L9 | AD-31 | Bỏ qua `NEXT_PHASE` là thừa: `registerInstrumentation` của Next đã tự return ở `phase-production-build` |

## 9. Cần người quyết định

| ID | Câu hỏi | Khuyến nghị của reviewer |
| --- | --- | --- |
| D1 | Khi chưa có proxy, chấp nhận giới hạn IP dùng chung toàn shop và sửa FR-3, hay chặn khởi động production cho tới khi khai báo proxy? | Chấp nhận khi chạy local; bắt buộc khai báo tường minh ở production |
| D2 | Giữ `lookup:order` (chống dò phân tán, nhưng khách thật có thể bị khóa) hay bỏ (giữ đúng FR-3)? | Bỏ ở MVP vì Mã đơn và số điện thoại phải khớp cùng lúc, ghi rủi ro vào PRD 6.3 |
| D3 | Giữ PostgreSQL 14 đã hết hỗ trợ hay nâng cấp? | Giữ cho học tập, nâng ít nhất lên 14.25, thêm dòng Deferred "nâng major trước đơn thật" |
| D4 | Có rút 32 AD xuống khoảng 14 theo mục 4 không? | Có |

## 10. Khẳng định đã kiểm chứng đúng

- Phiên bản Next 16.4.2, React 19.3.0, Zod 4.6.7, Tailwind 4.3.3, Vitest 5.0.5, Playwright 1.64.1, TypeScript 5.9.3, Node 22.23.4, PostgreSQL 14.18 khớp máy dev.
- drizzle-orm 0.45.4, drizzle-kit 0.31.11, pg 8.23.1 là bản mới nhất trên npm; `pg` nằm trong danh sách server external của Next.
- `base-server.js:567` đúng như AD-24 mô tả.
- `src/proxy.ts` là quy ước đúng của Next 16; tài liệu Next xác nhận proxy chỉ dành cho kiểm tra lạc quan.
- Bug `mergeItems` vượt `MAX_QUANTITY_PER_ITEM` (AD-4) có thật.
- `storage/orders.json` có đúng 11 đơn; định dạng Mã đơn khớp `generateOrderId`.
- Số tài khoản hard-code ở `orders/[id]/page.tsx`, `console.error(error)` ở `lib/http.ts`, `generateStaticParams` ở trang sản phẩm đều có thật.
- Tập khóa của AD-22 khớp mock Trang xác nhận. Các tham chiếu dòng trong Upstream Edits đã kiểm đều đúng.
- Kích thước cookie AD-20 (20 mã, khoảng 1 KB) hợp lý.

**Chưa kiểm chứng bằng chạy thật:** Drizzle trên Next 16.4.2 (đúng là việc của spike AD-6); hành vi dừng server khi `register()` ném lỗi ở chế độ `next dev`.
