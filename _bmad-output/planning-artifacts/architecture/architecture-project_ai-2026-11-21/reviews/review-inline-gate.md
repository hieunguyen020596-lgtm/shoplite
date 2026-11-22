# Reviewer Gate (inline, không phải subagent độc lập)

Người dùng chọn Fast path, chỉ cần spine. Gate được chạy trực tiếp trong phiên: lint xác định + hai lens bắt buộc trong `finalize_reviewers` + rubric. **Không có reviewer nào chạy với context độc lập.**

## Lint (lint_spine.py)
0 phát hiện.

## Lens 1: kiểm chứng phiên bản và công nghệ
- Phiên bản lấy từ `package.json` của repo (theo yêu cầu người dùng); không tra web.
- Hành vi của Next 16 (`proxy.ts`, Node runtime mặc định, proxy chỉ kiểm tra lạc quan, DAL) đã đối chiếu với `node_modules/next/dist/docs` bản 16.4.2.
- `node:crypto` (`createHmac`, `scrypt`, `timingSafeEqual`) là module có sẵn của Node 22, không bị deprecate.
- Kết luận: đạt.

## Lens 2: adversarial (hai unit tuân thủ mọi AD mà vẫn lệch nhau)
1. **HIGH, đã sửa:** `/products/[slug]` dùng `generateStaticParams`, nên tồn kho bị đóng băng lúc build mà vẫn "tuân thủ" AD-12 → AD-12 thêm quy tắc `force-dynamic`, bỏ `generateStaticParams`, và `/api/products` trả Tồn khả dụng.
2. **MEDIUM, đã sửa:** ghi chú và cờ chuyển khoản sửa `Order` ngoài `applyTransition`, nên hai unit có thể lưu `author` khác nhau (username hoặc tên hiển thị) → AD-7 chốt lưu username và dùng hàm `appendNote`.
3. **MEDIUM, đã sửa:** xác nhận hàng loạt có thể lấy khóa theo từng đơn hoặc theo cả lô → AD-3 chốt một khóa cho cả lô.
4. **LOW, đã sửa:** mermaid có node rỗng `x(( ))` và cú pháp nhãn cạnh dễ lỗi → đã gỡ hoặc viết lại.

## Rubric
- Ratify brownfield: AD-1, 2, 10, 11 [ADOPTED]; không mâu thuẫn với code hiện có.
- Bao phủ: BL-1..10 và FR-1..33 đều có trong Capability Map.
- Môi trường vận hành: AD-14, sơ đồ triển khai, Deferred (backup, giám sát, nhiều instance).
- **Lệch với nguồn:** AD-4 khác cách làm trong `prd/addendum.md` (addendum gợi ý trừ `inventory.json` khi giao). Đã được người dùng duyệt. Đề nghị cập nhật addendum để thượng nguồn không lệch với spine.
