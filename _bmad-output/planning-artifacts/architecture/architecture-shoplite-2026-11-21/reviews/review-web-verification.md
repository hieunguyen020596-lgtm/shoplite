# Review: kiểm chứng web và thực tế — Architecture Spine shoplite

- **Ngày kiểm:** 2026-11-21
- **Đối tượng:** `ARCHITECTURE-SPINE.md`
- **Vai trò:** người kiểm độc lập, không sửa spine
- **Giới hạn đã tuân thủ:** không cài package, không kết nối database, không gửi thông tin dự án ra ngoài. Truy vấn ngoài chỉ chứa tên và phiên bản package công khai.

## Kết luận

**CHƯA ĐẠT — cần sửa trước khi chốt spine.**

Các phiên bản ghi trong Stack đều có thật và khớp lockfile hoặc npm. Phần lớn nhận định về Next 16.4.2 đúng với source. Tuy nhiên spine chốt một PostgreSQL đã hết hỗ trợ, chưa chốt tham số scrypt, và cách chạy script chưa tương thích với cấu hình TypeScript cùng mức Node tối thiểu của dự án.

| Mức độ | Số lượng |
| --- | ---: |
| Critical | 0 |
| High | 3 |
| Medium | 3 |
| Low | 4 |

## Phát hiện

### HIGH-1 — PostgreSQL 14 đã hết hỗ trợ, bản 14.18 thiếu 81 bản vá CVE

- **Vị trí:** AD-5, bảng Stack, mục Deferred không nhắc tới.
- **Bằng chứng:**
  - Trang chính sách phiên bản của PostgreSQL: nhánh 14 không còn được hỗ trợ, bản phát hành cuối ngày 2026-11-12, minor cuối là **14.25**.
  - Máy dev chạy 14.18 (`psql --version`, `pg_config --version`).
  - Trang bảo mật nhánh 14 liệt kê **81 CVE** được vá ở 14.19 đến 14.25, nhiều CVE có CVSS 8.8.
  - `.memlog.md:32` chỉ ghi phiên bản đang cài trên máy, không có dấu hiệu đã kiểm vòng đời.
- **Tác động:** Rủi ro thực tế còn thấp khi chỉ chạy local với dữ liệu học tập, nên chưa xếp Critical. Nhưng spine đang cố định một nền tảng sẽ không còn bản vá cho giai đoạn nhận đơn thật.
- **Đề xuất:** Chọn nhánh còn hỗ trợ trước migration đầu tiên, lúc chưa có dữ liệu cần chuyển. PostgreSQL 18 là ứng viên hợp lý; 19 mới phát hành 2026-11-19. Nếu tạm giữ 14, phải nâng lên 14.25 và ghi rõ hạn nâng major trong Deferred.
- **Nguồn:** <https://www.postgresql.org/support/versioning/>, <https://www.postgresql.org/support/security/14/>

### HIGH-2 — AD-15 chọn scrypt nhưng không chốt tham số

- **Vị trí:** AD-15.
- **Bằng chứng:**
  - OWASP yêu cầu tối thiểu một trong các cấu hình tương đương: `N=2^17,r=8,p=1`; `2^16,8,2`; `2^15,8,3`; `2^14,8,5`; `2^13,8,10`.
  - Mặc định của `node:crypto` là `N=16384,r=8,p=1`, tức `2^14` với `p=1`, thấp hơn mức `p=5` OWASP nêu cho `N=2^14`.
  - Chạy thử trên Node 22.23.4: `N=2^15,r=8,p=3` và `N=2^17,r=8,p=1` đều ném `ERR_CRYPTO_INVALID_SCRYPT_PARAMS` nếu giữ `maxmem` mặc định; đặt `maxmem` đủ lớn thì chạy được (113 ms và 166 ms).
- **Tác động:** Người build dễ dùng mặc định, tạo hash yếu hơn khuyến nghị. Nếu tăng tham số mà không đặt `maxmem`, code sẽ lỗi. Định dạng hash không được chốt thì khó nâng tham số về sau; hash giả cho username không tồn tại cũng phải dùng đúng tham số để giữ thời gian phản hồi đồng đều.
- **Đề xuất:** Chốt `N`, `r`, `p`, `keylen`, độ dài salt, `maxmem` và định dạng hash tự mô tả tham số.
- **Nguồn:** <https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html>, chạy thử `crypto.scryptSync` cục bộ.

### HIGH-3 — `node --env-file=.env` chưa chạy được script TypeScript theo cấu hình hiện tại

- **Vị trí:** AD-15, AD-27, AD-32; `package.json` `engines: >=22.12.0`; `tsconfig.json`.
- **Bằng chứng:**
  - Tài liệu Node: type stripping chỉ bật mặc định từ **22.18.0**, trong khi dự án cho phép 22.12.0. Node không đọc `paths` của tsconfig và bắt buộc ghi đuôi file khi import.
  - Thử trên Node 22.23.4: import không đuôi và import `@/...` đều lỗi `ERR_MODULE_NOT_FOUND`; import có `.ts` chạy được.
  - Thử `tsc` với các tùy chọn tương ứng của dự án: import có `.ts` lỗi **TS5097** vì `tsconfig.json` chưa bật `allowImportingTsExtensions`. `tsconfig.json` include `**/*.ts`, nên file trong `scripts/` sẽ bị typecheck.
  - AD-27 yêu cầu script seed import `src/data/inventory-seed.ts`, nên script phải nạp được file TypeScript.
- **Tác động:** Với cấu hình hiện tại, không có kiểu import nội bộ nào vừa chạy được bằng Node vừa qua typecheck. `db:seed`, `staff:seed`, `staff:hash` sẽ vướng ngay ở các story đầu.
- **Đề xuất:** Chốt một cách: nâng `engines` lên `>=22.18.0` và bật `allowImportingTsExtensions`, cấm alias trong đồ thị import của script; hoặc thêm `tsx` làm devDependency trực tiếp với phiên bản đã kiểm.
- **Nguồn:** <https://nodejs.org/api/typescript.html>, thử nghiệm cục bộ trong thư mục tạm.

### MEDIUM-1 — Next 16.4.2 đã bị vượt 4 bản vá và nằm trong 7 advisory

- **Vị trí:** AD-6, AD-24, bảng Stack.
- **Bằng chứng:** npm `latest` là **16.4.6**. GitHub Advisory Database có 7 advisory mức medium ảnh hưởng 16.4.2, đều vá ở **16.4.5**: GHSA-f3mh-rxg3-f5g2, GHSA-7qx7-33qx-rqx2, GHSA-pc58-hwjq-p385, GHSA-rhh4-g77r-r9qj, GHSA-vvgp-ww4w-46vf, GHSA-vc7v-qv4w-wrv8, GHSA-mfr8-8qww-v76h.
- **Mức áp dụng:** Thiết kế hiện tại tránh phần lớn điều kiện khai thác: không dùng Edge runtime cho route, cấm `use cache`, không có `next/image` trong `src`. GHSA-pc58 chỉ liên quan khi trả nguyên response upstream sau reverse proxy. Advisory SVG chưa được kiểm chứng khai thác trên endpoint ảnh mặc định.
- **Đề xuất:** Nâng `next` và `eslint-config-next` lên 16.4.6 trước spike AD-6, rồi kiểm lại `base-server.js` vì AD-24 đang trích số dòng cụ thể.
- **Nguồn:** <https://github.com/advisories?query=next%4016.4.2>, `npm view next`.

### MEDIUM-2 — Trigger của AD-12 không thể do `drizzle-kit generate` sinh ra theo schema

- **Vị trí:** AD-12, AD-32.
- **Bằng chứng:** AD-32 ghi migration SQL "do `drizzle-kit generate` tạo" và "Trigger của AD-12 nằm trong migration". Bundle `drizzle-kit@0.31.11/bin.cjs` không có chuỗi `CREATE TRIGGER`. Tài liệu Drizzle hướng dẫn dùng `drizzle-kit generate --custom` cho DDL mà Kit chưa hỗ trợ.
- **Đề xuất:** Ghi rõ trigger nằm trong custom migration và có test khẳng định trigger tồn tại sau `db:migrate`.
- **Nguồn:** <https://orm.drizzle.team/docs/kit-custom-migrations>, <https://cdn.jsdelivr.net/npm/drizzle-kit@0.31.11/bin.cjs>

### MEDIUM-3 — Spine không lưu bằng chứng kiểm chứng cho quyết định công nghệ

- **Vị trí:** bảng Stack, `.memlog.md:16`, `.memlog.md:32`.
- **Bằng chứng:** Memlog có ghi nguồn lockfile và "npm 2026-11-21", nhưng không ghi kiểm tra vòng đời, advisory, tương thích PostgreSQL hay tham số scrypt. Đây là lý do HIGH-1, HIGH-2 và MEDIUM-1 lọt qua.
- **Đề xuất:** Thêm ngày kiểm, nguồn và trạng thái hỗ trợ cho từng thành phần runtime.

### LOW-1 — Node 22 còn hỗ trợ nhưng sắp hết hạn

Node 22 đang ở Maintenance LTS từ 2025-10-21 và hết hỗ trợ **2027-04-30**. Nên ghi mốc xem xét Node 24 vào Deferred trước khi nhận đơn thật. Nguồn: <https://raw.githubusercontent.com/nodejs/Release/main/schedule.json>

### LOW-2 — Một số package đã có bản mới hơn

Spine khớp lockfile, nhưng npm hiện có React 19.3.1, Tailwind 4.3.5, Vitest 5.1.1, Playwright 1.65.1 và TypeScript 7.0.2. Không thấy advisory cho `react@19.3.0`, `react-dom@19.3.0`, `zod@4.6.7`. Giữ TypeScript 5.9.3 là hợp lý vì Next 16 yêu cầu tối thiểu 5.1.0, nhưng không nên nâng lên 7 nếu chưa kiểm riêng.

### LOW-3 — Drizzle đang có nhánh 1.0 RC

`drizzle-orm` `latest` vẫn là 0.45.4, song registry đã có `1.0.0-rc.5-*`. Nên pin chính xác `drizzle-orm` và `drizzle-kit`, nâng cùng nhau, để tránh đổi định dạng migration ngoài kế hoạch.

### LOW-4 — Cần ghi rõ advisory lock và query đếm là hai câu lệnh riêng

AD-10 đúng về thứ tự. Ở READ COMMITTED mỗi câu lệnh lấy snapshot mới, nên lệnh đếm phải chạy **sau** câu lệnh lấy khóa. Nếu gộp vào một câu SQL, snapshot có thể được lấy trước khi chờ khóa và đếm thiếu đơn vừa commit. Nguồn: <https://www.postgresql.org/docs/14/transaction-iso.html>

## Các điểm đã kiểm và đúng

| Nhận định | Kết quả | Bằng chứng |
| --- | --- | --- |
| Phiên bản Next, React, TypeScript, Zod, Tailwind, Vitest, Playwright | Khớp | `package-lock.json`, `node_modules` |
| `drizzle-orm` 0.45.4, `drizzle-kit` 0.31.11, `pg` 8.23.1, `@types/pg` 8.23.1 | Có thật, là `latest`, chưa có trong lockfile | `npm view` |
| Advisory cho `drizzle-orm`, `drizzle-kit`, `pg`, `@types/pg` ở các bản trên | Không có | GitHub Advisory API |
| `drizzle-orm@0.45.4` với `pg` | Peer `pg >=8`, `@types/pg *` | `npm view` |
| `pg@8.23.1` với Node 22 | `engines >=16` | `npm view` |
| `pg` với PostgreSQL 14 | CI nhánh master có PostgreSQL 14 (trên Node 26) | workflow CI của node-postgres |
| Next 16.4.2, Vitest 5.0.5, Vite 8.3.5 với Node 22.12+ | Tương thích | `engines` |
| TypeScript 5.9.3 với Next 16 | Đạt yêu cầu tối thiểu 5.1.0 | `version-16.md:99` |
| `src/proxy.ts`, Node runtime | Đúng | `proxy.md:23`, `proxy.md:255` |
| Proxy chỉ là kiểm tra lạc quan | Đúng hướng dẫn | `authentication.md:1017`, `proxy.md:251` |
| `cookies()` async, chỉ ghi ở Server Function hoặc Route Handler | Đúng | `cookies.md:6`, `cookies.md:81` |
| `force-dynamic` khi không bật `cacheComponents` | Hợp lệ | `caching-without-cache-components.md:88-97`, `route-segment-config/index.md:25` |
| `x-forwarded-for` chỉ gán socket khi client không gửi | Đúng, đúng dòng 567 | `next/dist/server/base-server.js:567` |
| `NextRequest.ip` đã bị bỏ | Đúng | `version-15.md:614` |
| `pg` không cần khai báo `serverExternalPackages` | Đúng, đã có trong danh sách mặc định | `next/dist/lib/server-external-packages.jsonc:67` |
| `src/instrumentation.ts`, bỏ qua lúc build | Đúng | `instrumentation.md:12`, `instrumentation-globals.external.js:92` |
| `register()` lỗi thì ném lại | Đúng ở mức source | `instrumentation-globals.external.js:110-115` |
| `pg_advisory_xact_lock(bigint)`, tự nhả cuối transaction | Đúng | Tài liệu PostgreSQL 14 |
| `hashtextextended(text, bigint)` trả `bigint` | Có trong catalog 14 và 18 | `postgres.bki:400`, `pg_proc.dat` nhánh REL_18_STABLE |
| `UPDATE ... WHERE` đánh giá lại điều kiện sau khi chờ khóa ở READ COMMITTED | Đúng | Tài liệu PostgreSQL 14 |
| `.env` bị ignore, `.env.example` được commit | Đúng | `git check-ignore` |

## Chưa kiểm chứng được

- Chưa chạy thật Drizzle + `pg` + Next 16.4.2 + PostgreSQL vì không được cài package hay kết nối database. Spike AD-6 vẫn là cổng bắt buộc.
- Không tìm thấy ma trận chính thức về phiên bản PostgreSQL mà `drizzle-orm` và `drizzle-kit` hỗ trợ.
- CI của `pg` được đọc ở nhánh master, không phải tag 8.23.1; tổ hợp Node 22 với PostgreSQL 14 không nằm trong ma trận CI.
- Hành vi "thiếu biến thì server không khởi động" mới xác nhận qua source, chưa chạy `next start` hoặc `next dev`.
- Chưa chạy `npm audit` để tránh gửi lockfile ra ngoài, nên advisory của dependency bắc cầu chưa được kiểm.
- Chưa xác nhận advisory SVG có khai thác được trên cấu hình hiện tại hay không.
- Chưa có baseline typecheck sạch: `tsc --noEmit` báo 3 lỗi, tất cả ở `.next/types/validator.ts` cũ (có tham chiếu route `coupons` không còn tồn tại). Không chạy `next typegen` vì lệnh này ghi file.
