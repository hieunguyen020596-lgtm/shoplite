---
title: "Addendum — Vận hành đơn hàng ShopLite"
created: 2026-11-21
updated: 2026-11-21
---

# Addendum: Vận hành đơn hàng ShopLite

Phần này giữ các chi tiết không đưa vào brief nhưng PRD và kiến trúc sẽ cần.

## Sự thật codebase đã kiểm chứng (2026-11-21)

- `ORDER_STATUSES` có `pending/confirmed/shipping/delivered/cancelled` (`src/features/orders/types.ts`). Hiện chưa có trạng thái `failed`.
- `order-service.ts` chỉ kiểm tra `quantity > product.stock` lúc tạo đơn, dùng hằng số trong `src/data/products.ts`, và không trừ kho.
- `cancelOrder` chỉ cho hủy khi `status === "pending"`.
- Trang `/orders` render mọi đơn phía server. `PATCH /api/orders/:id` không xác thực (theo memlog của PRD).
- Repository đã ghi atomic (file tạm rồi rename) nhưng chưa tuần tự hóa các lần ghi.

## Phương án trả lời 6 câu hỏi mở (đề xuất mô phỏng Shopee, chờ xác nhận trong PRD)

| #   | Câu hỏi             | Đề xuất                                                                                                                          |
| --- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Khách tra đơn       | Mã đơn + SĐT đặt hàng. localStorage nhớ các mã đơn đã đặt trên máy. `GET /api/orders` chỉ dành cho staff.                        |
| 2   | Danh tính nhân viên | Mỗi người một tài khoản, khai báo tĩnh trong cấu hình, chỉ một vai trò `staff`, session cookie, không có màn quản lý người dùng. |
| 3   | Lưu tồn kho         | `storage/inventory.json`, khởi tạo từ `products.ts`. Mutex trong process, ghi atomic. Chỉ an toàn khi chạy 1 instance.           |
| 4   | Thời hạn giữ hàng   | Tự hủy `pending` sau N giờ (mặc định 24h, cấu hình được) với lý do "Quá hạn xác nhận". Kiểm tra khi đọc đơn, không dùng cron.    |
| 5   | Người giao          | Nhân viên cập nhật thay đơn vị vận chuyển. Giao thất bại thì đơn kết thúc kèm lý do và cộng lại kho.                             |
| 6   | Báo khách           | Timeline + lý do làm kênh chính. Shop hủy hoặc giao thất bại thì nhân viên gọi điện cho khách và ghi chú. Không có email/SMS.    |

## Bảng rủi ro (S×L)

R1 Lộ dữ liệu khách 25 · R3 Đơn bị bỏ quên/chuyển tùy tiện 20 · R2 Bán vượt kho 12 · R5 Không truy vết 12 · R7 Phạm vi lan man 9 · R4 Sai thanh toán 8 · R6 Nhân viên không dùng 8.

## Phương án đã loại

- **Trừ kho khi xác nhận (mục 13):** bị thay bằng giữ hàng khi đặt. Trừ khi xác nhận vẫn để hai khách cùng đặt món cuối, và nhân viên phải phát hiện thủ công.
- **Hủy phần hàng thiếu (mục 7):** không giao một phần, không tách đơn. Thiếu hàng thì hủy cả đơn kèm lý do.
- **Mật khẩu chung cho nhân viên:** bị loại vì làm mất ý nghĩa truy vết của lịch sử trạng thái.

## Mục "Could" để dành (không thuộc MVP)

Tạm hoãn đơn (5); ghi kết quả cuộc gọi xác nhận (6); mốc "chuẩn bị hàng / bàn giao vận chuyển" riêng (9); đánh dấu đơn cần hoàn tiền để xử lý thủ công (21).

## Đầu vào cho giai đoạn 2: hoàn tiền

- Các vai: khách, CSKH, quản lý (người duyệt), kế toán (người chuyển tiền). Người duyệt phải khác người chuyển tiền.
- bank_transfer: khách cung cấp STK → đối chiếu giao dịch gốc → người có thẩm quyền duyệt → kế toán chuyển khoản thủ công → cập nhật kết quả, lưu bằng chứng (ảnh hoặc mã giao dịch).
- COD: không tạo yêu cầu hoàn tiền khi chưa thu tiền. Nếu khách đã trả cho đơn vị vận chuyển thì đối soát trước khi hoàn.
- Trạng thái: `refund_requested/approved/processing/completed/failed`.
- Lịch sử liên hệ khách: ai báo, qua kênh nào, nội dung gì.
- Cờ "đã nhận tiền chuyển khoản" (mục 20) là điểm khởi đầu của luồng này.
