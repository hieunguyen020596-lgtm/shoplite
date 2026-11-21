---
title: 'Story 1.1: Nâng Next 16.4.6 và engines Node 22.18'
type: 'chore'
created: '2026-11-21'
status: 'done'
route: 'dispatch'
baseline_commit: 'ea824e51f5ca8c7ca99dfe1676344cea2aa2b259'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Dự án đang ở `next` và `eslint-config-next` 16.4.2 với `engines.node` `>=22.12.0`, thấp hơn nền đã chốt cho Epic 1 (AD-6). Các story sau cần nền này trước khi chạm vào database.

**Approach:** Pin chính xác `next` và `eslint-config-next` ở 16.4.6, nâng `engines.node` lên `>=22.18.0`, cập nhật lockfile và README, rồi chứng minh `npm run check` xanh và năm trang hiện có vẫn dựng được.

## Boundaries & Constraints

**Always:** Phiên bản `next` và `eslint-config-next` là số chính xác, không có `^` hay `~`. Lockfile khớp `package.json`. README nêu đúng phiên bản Node yêu cầu.

**Never:** Không thêm dependency. Không nâng `react`, `react-dom` hay package trực tiếp khác. Không sửa `.env.local`. Không đưa `.env.local` hay các file đang chưa track vào commit của story. Không sửa code ứng dụng, trừ khi bản nâng cấp làm `check` hoặc build đỏ và phải ghi rõ lý do trong Implementation Notes.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Nâng cấp hợp lệ | Node 22.23.4, npm 10.9.9 | `npm run check` xanh, `/`, `/products`, `/cart`, `/checkout`, `/orders` dựng được | N/A |
| Node thấp khi cài | Node `< 22.18.0` chạy `npm install` | `npm install` cảnh báo `EBADENGINE` và vẫn cài tiếp | Không chặn, theo quyết định bên dưới |
| Node thấp khi chạy script | Node `< 22.18.0` chạy `npm run ...` | Không chặn, theo quyết định bên dưới | N/A |

**Quyết định (landv, 2026-11-21, thay quyết định trước):** Bỏ `engine-strict`, không tạo `.npmrc`. Giữ `engines.node` là `>=22.18.0`. Node thấp chỉ nhận cảnh báo của npm. Không thêm script kiểm Node cho `npm run`.

</frozen-after-approval>

## Code Map

- `package.json:7-9` -- `engines.node` cần đổi.
- `package.json:27,45` -- pin `next` và `eslint-config-next`. Giữ nguyên `react` 19.3.0, đã thỏa peer `^19.0.0` của Next 16.4.6.
- `package-lock.json:6312` -- mục `node_modules/next`. Diff chỉ nên chạm `next`, `eslint-config-next` và các package `@next/*` đi kèm.
- `README.md:23` -- dòng yêu cầu Node đang ghi 22.12.
- Repo chưa có `.npmrc`, `.nvmrc`, Dockerfile hay GitHub workflow nên không có nơi khác cần đổi phiên bản Node.

## Tasks & Acceptance

**Execution:**
- [x] `package.json`, `package-lock.json` -- chạy `npm install --save-exact next@16.4.6 eslint-config-next@16.4.6` -- pin phiên bản và cập nhật lockfile.
- [x] `package.json` -- đặt `engines.node` thành `>=22.18.0`, rồi đồng bộ lockfile -- nền Node đã chốt.
- [x] `README.md` -- đổi yêu cầu Node thành 22.18 và ghi rõ `npm install` sẽ cảnh báo nếu Node thấp hơn -- đáp ứng tiêu chí ghi rõ phiên bản.

**Acceptance Criteria:**
- Given đã nâng cấp, when xem `package.json` và `npm ls next eslint-config-next`, then cả hai đều là đúng 16.4.6 và không có range.
- Given diff của story, when so `dependencies` và `devDependencies`, then chỉ hai phiên bản trên thay đổi và `.env.local` không nằm trong thay đổi của story.

### Review Findings

Code review Epic 1, 2026-11-21, đối chiếu tại `8a722dc`.

- Không có phát hiện cần xử lý.

## Implementation Notes

- Không sửa code ứng dụng.
- `package-lock.json` có thêm 6 mục ngoài dự kiến của Code Map: các package bundle trong `node_modules/@tailwindcss/oxide-wasm32-wasi/node_modules/` (`@emnapi/core`, `@emnapi/runtime`, `@emnapi/wasi-threads`, `@napi-rs/wasm-runtime`, `@tybys/wasm-util`, `tslib`). npm tự sinh khi cài; phiên bản `@tailwindcss/oxide-wasm32-wasi` không đổi. Chưa gỡ, cần người duyệt quyết định giữ hay bỏ.
- Đã gỡ `.npmrc` theo quyết định của landv. Với `engine-strict`, bộ giải dependency của npm chặn cả Node 22.18.0 vì `jsdom@30.1.3` và các package đi kèm cần `^22.22.2 || ^24.15.0 || >=26.0.0`.
- Rủi ro còn lại: Node 22.18 đến 22.22.1 đạt `engines` của dự án nhưng nhận cảnh báo từ dev dependency, và test dùng jsdom chưa được chạy trên các bản này.
- Chưa chạy thử trường hợp Node `< 22.18.0` thật.
- Giữ 6 mục bundle trong lockfile vì npm tự sinh và không đổi phiên bản package trực tiếp.
- Kết quả cuối trên Node 22.23.4: `npm run check` xanh (83/83 test), `npm run build` exit 0, năm trang trả HTTP 200, route động sản phẩm và đơn hàng trả đúng nội dung.
- `.env.local` do landv tự xóa, không thuộc commit của story. `next-env.d.ts` do build tự đổi và đã được khôi phục.

## Spec Change Log

## Review Triage Log

| Phát hiện | Verdict | Route | Bằng chứng |
|---|---|---|---|
| `engines` nhận Node 22.18 đến 22.22.1, 23.x, 24.0 đến 24.14, 25.x mà toolchain không khai báo hỗ trợ; chưa chạy trên 22.18 | medium | defer | Lockfile xác nhận; ràng buộc của `jsdom` có từ trước story, mốc 22.18 do landv giữ. Máy chỉ có Node 22.23.4 |
| README ngụ ý từ 22.18 không có cảnh báo | low | patch | Đã sửa `README.md:23` |
| README không nói trường hợp máy tự bật `engine-strict` | low | reject | Cấu hình riêng của máy, ít gặp, không thuộc story |
| Commit có thể kèm thao tác xóa `.env.local` | false | reject | landv tự xóa có chủ ý; commit của story chỉ dùng pathspec ba file |
| AC trong `epics.md` trái quyết định bỏ strict | medium | defer | Tài liệu kế hoạch cần landv cập nhật |
| AD-6 và `epics.md:203` ghi story đầu merge spike, còn spike ở Story 1.2 | low | defer | Lệch tài liệu có sẵn |
| Route động chưa được kiểm trên 16.4.6 | false | reject | `next start`: trang và API sản phẩm, đơn đều 200 và có đúng nội dung; slug sai trả 404 |
| Luồng hủy đơn `PATCH` và e2e chưa chạy trên 16.4.6 | maybe-false | defer | Không có test hủy đơn từ trước; cần chạy e2e và luồng hủy thật để kết luận |
| 6 mục bundle trong lockfile | false | reject | Khớp `bundleDependencies`, phiên bản cha không đổi, `npm ci --dry-run` đạt |
| Spec và sprint-status lệch trạng thái, thiếu kết quả kiểm chứng | false | reject | Trạng thái đồng bộ ở bước hoàn tất; kết quả ghi trong Implementation Notes |

## Verification

**Commands:**
- `npm ls next eslint-config-next` -- expected: cả hai ở 16.4.6.
- `npm run check` -- expected: lint, typecheck và test đều xanh.
- `npm run build` -- expected: build thành công.
- `npm config get engine-strict` tại thư mục dự án -- expected: `false`.

**Manual checks (if no CLI):**
- Chạy `npm run start`, gọi `/`, `/products`, `/cart`, `/checkout`, `/orders` -- expected: đều trả HTTP 200.
