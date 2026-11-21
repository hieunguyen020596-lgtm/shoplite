# Deferred Work

## Deferred from: code review of spec-1-1-may-trang-thai-don-hang.md (2026-11-21)

- File tạm `orders.json.tmp` trong `createJsonFileOrderRepository` có tên cố định: hai lần ghi đồng thời (khác tiến trình, hoặc trong tiến trình khi chưa có hàng đợi ghi) có thể đè dữ liệu của nhau hoặc `rename` lỗi `ENOENT`. Có từ trước Story 1.1. Story 1.3 (AD-7) tuần tự hóa mọi lần ghi trong một tiến trình; đổi sang tên file tạm duy nhất nên là một story riêng (xem mục Deferred của spine).
