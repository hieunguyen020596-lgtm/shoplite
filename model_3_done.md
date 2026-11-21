# Báo cáo Module 3 - OpenSpec (add-wishlist)

Ngày: 2026-11-10 · Nhánh: `lab3-openspec`

## 1. Hiện trạng khi bắt đầu phiên

| Bài | Nội dung | Trạng thái ban đầu |
| --- | --- | --- |
| 3.1 | Init OpenSpec, `config.yaml` có context + codemap, bật workflow `verify` | Đã xong (commit `5320482`) |
| 3.2 | Proposal `add-wishlist` | Đã xong (commit `72bc65d`) |
| 3.3 | Explore, cập nhật design | Đã xong (commit `03572ea`) |
| 3.4 | Apply, verify, archive | Làm dở: code wishlist có nhưng chưa commit, `tasks.md` 0/9, thiếu test component, chưa archive |

## 2. Việc đã làm trong phiên

1. **Cài dependencies:** `npm ci` (repo chưa có `node_modules`, nên `npm run check` không chạy được).
2. **Bổ sung test component (task 2.4):**
   - `src/features/wishlist/components/wishlist-button.test.tsx`: toggle và aria, sản phẩm hết hàng, thông báo đầy 50.
   - `src/features/wishlist/components/wishlist-view.test.tsx`: trạng thái trống, lọc id không còn trong catalog, thêm vào giỏ, hết hàng, bỏ thích.
   - `src/features/wishlist/components/wishlist-badge.test.tsx`: không có số khi trống, có số và nhãn, không đếm id lạ.
   - `src/features/catalog/components/product-card.test.tsx`: thêm 1 ca nút trái tim (không nằm trong `<a>` hay phần tử `aria-hidden`).
3. **Chuẩn hóa định dạng:** chạy prettier với `--print-width 100` cho các file wishlist và file đã sửa, vì code gốc dùng 100 cột và repo không có file cấu hình prettier. Khôi phục `next-env.d.ts` do `next typegen` sinh ra.
4. **Cập nhật tasks:** đánh dấu 9/9 task xong trong `openspec/changes/add-wishlist/tasks.md`.
5. **Cài trình duyệt Playwright:** `npx playwright install chromium` (~100MB) để chạy e2e.
6. **Archive:** `openspec archive add-wishlist -y`.
7. **Dọn dẹp:** xóa thư mục `storage/` do e2e sinh ra.

## 3. Kết quả kiểm tra

| Kiểm tra | Kết quả |
| --- | --- |
| `npm run check` (lint, typecheck, vitest) | Pass, 17 file test, 113 test |
| `openspec validate add-wishlist --strict` (trước khi archive) | Hợp lệ |
| `npm run test:e2e` | Pass 2/2 |
| `openspec archive` | Tạo `openspec/specs/wishlist/spec.md` (+6 requirement), chuyển change vào `openspec/changes/archive/2026-11-10-add-wishlist` |
| `openspec list --specs` | `wishlist requirements 6` |

## 4. Đối chiếu checkpoint của 3.4

| Checkpoint | Trạng thái |
| --- | --- |
| `npm run check` pass | Đạt |
| `openspec/specs/wishlist/spec.md` tồn tại | Đạt (chưa đọc lại nội dung sau archive) |
| Verify không còn CRITICAL | **Chưa chạy `/opsx:verify`.** Chỉ tự đối chiếu requirement với code và test, chưa có báo cáo verify thật |
| 9 kịch bản thủ công đúng | **Chưa làm.** Chưa chạy `npm run dev` và chưa thao tác trên trình duyệt |

## 5. Điểm cần lưu ý khi review

- **Sai thứ tự quy trình:** đã archive trước khi chạy verify và kiểm tra thủ công, trái với hướng dẫn 3.4 (không archive khi còn CRITICAL chưa được xác nhận).
- **Scenario chưa có test riêng:** "Tải trang lần đầu" (skeleton khi chưa hydrate). Code xử lý đã có trong `wishlist-view.tsx`, nhưng khó test trong jsdom. Đây là mức WARNING.
- **Chưa kiểm tra lại 3.1:** chưa chạy `openspec instructions proposal --change <tên>` để xác nhận `<project_context>` và `<rules>` được chèn.
- **Chưa commit:** toàn bộ thay đổi của 3.4 còn ở working tree. Không dùng `git add -A`, vì sẽ kéo cả `.idea/`, `.specify/`, `module123-guides/`.
- **Bảng so sánh Spec Kit và OpenSpec** ở cuối 3.4 chưa điền (phần người học tự làm).
- **Môi trường:** Playwright chromium và `node_modules` đã được cài mới trên máy.

## 6. File thay đổi

**Sửa**
- `openspec/changes/add-wishlist/tasks.md` (nay nằm trong thư mục archive)
- `src/app/products/[slug]/page.tsx`
- `src/components/layout/header.tsx`
- `src/features/catalog/components/product-card.tsx`
- `src/features/catalog/components/product-card.test.tsx`

**Mới (chưa theo dõi bởi git)**
- `src/app/wishlist/page.tsx`
- `src/features/wishlist/` (types, reducer, store, hook, 3 component và các file test)
- `openspec/specs/wishlist/spec.md`
- `openspec/changes/archive/2026-11-10-add-wishlist/`
- `model_3_done.md` (file này)

## 7. Việc còn lại đề xuất

1. Chạy `npm run dev` và kiểm 9 kịch bản thủ công trong 3.4 (Playwright có thể tự động hóa các kịch bản 4, 7, 8, 9).
2. Đọc lại `openspec/specs/wishlist/spec.md` và chạy `/opsx:verify` nếu change còn dùng được, hoặc coi báo cáo này là đối chiếu thay thế.
3. Commit từng đường dẫn cụ thể, ví dụ:
   ```bash
   git add openspec src
   git commit -m "feat(wishlist): add wishlist with heart toggle, header badge and /wishlist page"
   ```
4. Điền bảng so sánh Spec Kit và OpenSpec.
