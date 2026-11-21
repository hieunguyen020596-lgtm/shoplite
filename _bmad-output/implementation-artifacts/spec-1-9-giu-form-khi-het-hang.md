---
title: 'Story 1.9: Giữ form khi hết hàng'
type: 'feature'
created: '2026-11-21'
status: 'done'
route: 'dispatch'
baseline_commit: '392f31c229d3eb069a8ff0d26e8708eb3548d99f'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Khi thiếu hàng lúc đặt, Khách hàng chỉ thấy một câu lỗi chung và không biết dòng nào thiếu hay xử lý thế nào.

**Approach:** Giữ nguyên form, hiện `stock-conflict-row` cho mọi dòng thiếu từ `details.lines`, cho `Lấy N` hoặc `Bỏ` ngay tại `/checkout`, và chỉ mở lại `Đặt hàng` khi đã xử lý hết. Tách `form-field` và class `card` thành phần dùng chung.

## Boundaries & Constraints

**Always:** Client chỉ đọc `details.lines` sau khi kiểm `code === "INSUFFICIENT_STOCK"` và kiểm dạng dữ liệu; dữ liệu sai dạng thì hiện `error.message` như lỗi thường. Tiêu đề đúng `Một số sản phẩm không đủ hàng`, mô tả đúng `Chọn cách xử lý để đặt tiếp.`. Dòng còn hàng hiện tên sản phẩm, `Bạn chọn {X} · Chỉ còn {N}`, `Lấy {N}`, `Bỏ`. N = 0 chỉ có chữ `Hết hàng` và `Bỏ`. Nền `danger-soft` (`rose-50`), chữ `danger-ink` (`rose-700`), `rounded-xl`. `Lấy N` và `Bỏ` có vùng bấm tối thiểu 44px ở 390px, viền focus 2px `primary`, tên truy cập nêu rõ sản phẩm. Không cuộn ngang ở 390px. Trạng thái thiếu hàng không truyền đạt chỉ bằng màu. Giỏ, tổng tiền và phí giao cập nhật tại form. Lỗi `RATE_LIMITED` vẫn hiện `error.message` trong `error-banner`, form giữ nguyên.

**Never:** Không đổi API, service, schema hay migration. Không đổi giao diện các trang khác khi tách class. Không thêm dependency. Không sửa `.env`, không tạo lại `.env.local`, không chạm `storage/orders.json`. Không chạy `git stash`, `git checkout`, `git restore`, `git rm`, `git reset` hay lệnh đổi index. Không chạy prettier trên cả thư mục.

**Quyết định (landv ủy quyền chọn phương án bảo thủ, 2026-11-21):**
- `Lấy N` dùng `button-primary` và `Bỏ` dùng `button-ghost`, theo mô tả riêng của `stock-conflict-row` trong DESIGN. Mô tả riêng này được ưu tiên hơn quy tắc chung "mỗi vùng một nút chính".
- `form-field` giữ đúng giao diện hiện tại của `/checkout`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Thiếu một dòng | 409 có `details.lines`, N > 0 | Form giữ dữ liệu, hiện dòng thiếu, `Đặt hàng` disabled | N/A |
| Thiếu nhiều dòng | Nhiều phần tử `lines` | Hiện đủ các dòng; xử lý hết mới mở `Đặt hàng` | N/A |
| `Lấy N` | Bấm trên dòng N > 0 | Số lượng về N, tổng tiền và phí giao cập nhật, dòng biến mất | N/A |
| `Bỏ` | Bấm trên dòng | Xóa khỏi giỏ, tổng tiền cập nhật | N/A |
| Hết sạch | N = 0 | Chỉ có `Hết hàng` và `Bỏ` | N/A |
| Bỏ hết | Giỏ trống | Hiện trạng thái giỏ trống | N/A |
| Gửi lại | Sau khi xử lý, server báo thiếu dòng mới | Thay bằng danh sách thiếu mới, form giữ dữ liệu | N/A |
| Gửi đôi | Bấm `Đặt hàng` liên tiếp | Chỉ một request | N/A |
| Sai dạng | `details.lines` không hợp lệ hoặc mã lỗi khác | Hiện `error.message`, không hiện dòng thiếu, không khóa nút | N/A |

</frozen-after-approval>

## Code Map

- `src/features/checkout/components/checkout-form.tsx:49-50,121-126,142,219,246,256-263` -- `inputClass`, xử lý lỗi, các `section` card, vùng nút đặt.
- `src/features/checkout/components/stock-conflict-list.tsx` (mới) -- danh sách và `stock-conflict-row`.
- `src/components/ui/form-field.ts`, `src/components/ui/card.ts` (mới) -- hằng class dùng chung. `card` thay các chuỗi `rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200` giống hệt.
- `src/components/ui/button.tsx` -- dùng biến thể có sẵn, kiểm tra có `ghost`.
- `src/features/cart/use-cart.ts` -- `updateQuantity`, `removeItem`.
- `src/features/checkout/components/checkout-form.test.tsx` -- thêm ca ma trận.

## Tasks & Acceptance

**Execution:**
- [x] `src/components/ui/form-field.ts`, `card.ts`, `checkout-form.tsx` và các file dùng chuỗi `card` giống hệt -- tách class, không đổi giao diện.
- [x] `src/features/checkout/components/stock-conflict-list.tsx` -- dựng danh sách dòng thiếu.
- [x] `src/features/checkout/components/checkout-form.tsx` -- đọc lỗi an toàn, khóa nút, chống gửi đôi bằng ref.
- [x] `src/features/checkout/components/checkout-form.test.tsx` -- phủ toàn bộ ma trận.

**Acceptance Criteria:**
- Given dữ liệu form đã nhập, when nhận 409 thiếu hàng rồi xử lý và đặt lại, then không phải nhập lại và đơn gửi đúng số lượng đã sửa.
- Given viewport 390px, when hiện dòng thiếu, then `Lấy N` và `Bỏ` cao ít nhất 44px và trang không cuộn ngang.

### Review Findings

Code review Epic 1, 2026-11-21, đối chiếu tại `8a722dc`.

- [x] [Review][Defer] D2. Thử lại sau khi mất response có thể tạo đơn trùng, trừ kho hai lần [src/features/checkout/components/checkout-form.tsx:211] — deferred: landv chốt D2A ngày 2026-11-21, làm `Idempotency-Key` thành story riêng trước khi phát hành vì cần bảng hoặc cột mới
- [x] [Review][Patch] P2. [medium] 409 có thể không hiện gì khi giỏ đổi ở tab khác lúc đang gửi [src/features/checkout/components/checkout-form.tsx:191]
- [x] [Review][Patch] P6. Dòng thiếu đã xử lý có thể quay lại với số tồn cũ và khóa nút [src/features/checkout/components/checkout-form.tsx:145]
- [x] [Review][Patch] P9. Dòng thiếu dùng `bg-white/60` thay vì nền `danger-soft` [src/features/checkout/components/stock-conflict-list.tsx:79]
- [x] [Review][Patch] P27. Thiếu test nhánh lỗi API xóa danh sách thiếu cũ [src/features/checkout/components/checkout-form.tsx:198]

**Rejected**

- low: mất focus khi tab khác đổi giỏ — cần xung đột và đa tab cùng lúc.
- low: trình đọc màn hình có thể đọc hai lần — chưa kiểm trên thiết bị.
- low: thiếu e2e thiếu hàng — Playwright chưa đổi sang DB test, đã có trong deferred-work.
- low: trộn reformat với logic — không ảnh hưởng hành vi.
- low: alias `inputClass` thừa — chỉ là thẩm mỹ.

## Implementation Notes

- Kết quả trên Node 22.23.4: `npm run check:full` exit 0 (148/148 test thường, 40/40 test DB), build đạt.
- Chromium thật ở 390px trên `shoplite_test`: hiện đủ hai dòng thiếu, form giữ dữ liệu, `Lấy 1` và `Bỏ` hoạt động, nút cao 44px, không cuộn ngang, đặt lại tạo đơn đúng số lượng và trừ đúng tồn.

## Spec Change Log

## Review Triage Log

| Phát hiện | Verdict | Route | Bằng chứng |
|---|---|---|---|
| `Lấy N` có thể tăng số lượng khi giỏ đổi ở tab khác | high | patch | Danh sách thiếu suy ra từ giỏ hiện tại, có test |
| Dòng thiếu cũ quay lại, lỗi mạng giữ danh sách cũ | medium | patch | Đã xử lý, có test |
| `details.lines` có `available >= requested` | medium | patch | Coi là sai dạng, có test |
| Focus rơi về `body`, `role="alert"` bọc cả nút | medium | patch | Đã chuyển focus, thu hẹp vùng alert, có test |
| Chưa phủ `productId` không còn trong giỏ | medium | patch | Thêm ca id lạ và ca trộn |
| Test gửi đôi không chờ request kết thúc | low | patch | Đã sửa |
| Chưa đo 44px và cuộn ngang ở 390px | medium | patch | Chromium thật: nút cao 44px, 390/390, luồng đặt lại đạt |
| Tách `card`, `form-field` là ngoài phạm vi | false | reject | AC của story yêu cầu |
| Nhiều nút chính trong danh sách | low | reject | Theo mô tả riêng của `stock-conflict-row`, đã ghi trong quyết định |
| Định dạng làm diff dài | low | reject | Không đổi hành vi |
| Chuỗi tiếng Việt chưa tách i18n | false | reject | Dự án không có i18n |

## Verification

**Commands:**
- `npm run check:full` -- expected: xanh.
- `npm run build` -- expected: thành công; báo lại nếu `next-env.d.ts` tự đổi, không tự khôi phục bằng git.
