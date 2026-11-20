# Tasks

## 1. Route test cho API hủy đơn (ghi lại hành vi hiện có)

- [x] 1.1 Tạo `src/app/api/orders/[id]/route.test.ts` (`// @vitest-environment node`), mock `@/features/orders/server` bằng service dùng repository in-memory. Cần cover:
  - 200 hủy đơn `pending`
  - 400 với `{ "status": "confirmed" }`
  - 400 với body không phải JSON
  - 404 với mã đơn không tồn tại
  - 409 với đơn đã hủy

  Kiểm tra: `npx vitest run "src/app/api/orders/[id]"` pass.

## 2. Sửa CancelOrderButton

- [x] 2.1 Sửa `cancel-order-button.tsx`:
  - bọc `fetch` bằng `try / catch / finally`
  - `catch` đặt lỗi "Không kết nối được máy chủ, vui lòng thử lại."
  - `finally` đặt `pending = false`

  Kiểm tra: typecheck pass.

- [x] 2.2 Thêm `REFRESH_ON_ERROR_CODES = ["INVALID_STATUS_TRANSITION", "ORDER_NOT_FOUND"] as const`. Khi `error.code` thuộc danh sách thì vừa hiện message vừa gọi `router.refresh()`. Kiểm tra: typecheck pass.
- [x] 2.3 Viết `cancel-order-button.test.tsx` (mock `next/navigation`, `vi.stubGlobal("fetch", ...)`). Cần cover:
  - bấm "Không" thì không gọi `fetch`
  - thành công thì gọi `refresh`
  - 409 thì gọi `refresh`
  - 400 thì hiện message và không `refresh`
  - `fetch` reject thì hiện thông báo mất kết nối, nút "Xác nhận hủy" được bật lại
  - thử lại thành công thì lỗi cũ biến mất

  Kiểm tra: `npx vitest run src/features/orders` pass.

## 3. Hộp xác nhận dạng dialog

- [x] 3.1 Sửa `cancel-order-button.tsx` sang `<dialog>` modal:
  - "Hủy đơn hàng" gọi `showModal()`
  - `aria-labelledby`/`aria-describedby`, tiêu đề "Hủy đơn hàng?", mô tả có mã đơn
  - nút "Không" được focus bằng ref sau `showModal()`; "Xác nhận hủy" variant `danger`
  - lỗi hiện trong dialog với `role="alert"`
  - Esc bị chặn khi `pending`; sự kiện `close` xóa lỗi và đưa focus về nút "Hủy đơn hàng"
  - thành công thì `close()` rồi `router.refresh()`; bỏ state `confirming`

  Kiểm tra: typecheck pass.

- [x] 3.2 Cập nhật `cancel-order-button.test.tsx`: giả lập `showModal`/`close` cho jsdom trong file test. Thêm các case:
  - bấm "Hủy đơn hàng" thì mở dialog có tên "Hủy đơn hàng?", chưa gọi `fetch`, focus ở "Không"
  - "Không" thì đóng dialog, không gọi `fetch`, focus về nút "Hủy đơn hàng"
  - Esc (sự kiện `cancel`) đóng dialog; khi đang gửi thì Esc không đóng và hai nút bị disabled
  - các case cũ (thành công, 409, 404, 400, 500, mất mạng, thử lại) vẫn pass

  Kiểm tra: `npx vitest run src/features/orders` pass.

## 4. Kiểm tra tích hợp

- [x] 4.1 Chạy `npm run format` và `npm run check` (lint + typecheck + test). Kiểm tra: pass toàn bộ.
- [x] 4.2 Kiểm tra thủ công trên `npm run dev`:
  - đặt một đơn, bấm "Hủy đơn hàng" thì dialog hiện giữa màn hình, nền phía sau bị làm mờ và không bấm được
  - Tab chỉ chạy giữa "Không" và "Xác nhận hủy"; Esc đóng dialog, focus quay về nút "Hủy đơn hàng"
  - mở trang đơn ở 2 tab, hủy ở tab 1; xác nhận hủy ở tab 2 thì trang tự hiện "Đã hủy"
  - DevTools Network chọn Offline, xác nhận hủy thì thấy thông báo mất kết nối trong dialog, bấm lại được

## Workflow follow-up

- Chạy `/opsx:verify fix-cancel-order-resilience`, xử lý hết CRITICAL.
- Archive bằng `/opsx:archive fix-cancel-order-resilience`.
