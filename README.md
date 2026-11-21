# ShopLite 🛍️

Cửa hàng đồ công nghệ mini viết bằng **Next.js 16 (App Router) + TypeScript + Tailwind CSS v4**.
Dự án dùng làm mẫu cho các bài thực hành phát triển phần mềm: đủ nhỏ để đọc hiểu trong một buổi,
đủ thật để mở rộng thêm nhiều tính năng.

> Dữ liệu sản phẩm là dữ liệu mẫu, đơn hàng và Tồn kho được lưu trong PostgreSQL (xem `.env.example`).

## Tính năng

| #   | Tính năng           | Đường dẫn          | Mô tả                                                                                 |
| --- | ------------------- | ------------------ | ------------------------------------------------------------------------------------- |
| 1   | Trang chủ           | `/`                | Banner, danh mục, sản phẩm nổi bật                                                    |
| 2   | Danh mục & tìm kiếm | `/products`        | Tìm kiếm không dấu, lọc theo danh mục / khoảng giá / còn hàng, sắp xếp, phân trang    |
| 3   | Chi tiết sản phẩm   | `/products/[slug]` | Thông tin, thông số kỹ thuật, tình trạng kho, chọn số lượng, sản phẩm liên quan       |
| 4   | Giỏ hàng            | `/cart`            | Thêm/sửa/xóa, giới hạn theo tồn kho, lưu trong localStorage, gợi ý miễn phí giao hàng |
| 5   | Thanh toán          | `/checkout`        | Form có validate, chọn phương thức giao hàng & thanh toán, tạo đơn qua API            |
| 6   | Đơn hàng            | `/orders`          | Lịch sử đơn hàng, chi tiết đơn                                                        |

## Yêu cầu

- Node.js **22.18** trở lên (`node -v`); `npm install` sẽ cảnh báo `EBADENGINE` nếu Node thấp hơn. Khuyến nghị **22.22.2** trở lên để không có cảnh báo từ dev dependency
- npm 10+
- PostgreSQL

## Bắt đầu

Cần PostgreSQL đang chạy, với hai database `shoplite_dev` và `shoplite_test`.

```bash
npm install
cp .env.example .env        # rồi sửa DATABASE_URL, TEST_DATABASE_URL và các giá trị replace_me
createdb shoplite_dev
createdb shoplite_test
npm run db:migrate
npm run db:seed
npm run dev
```

Mở <http://localhost:3000>. App sẽ thoát ngay khi khởi động nếu thiếu biến môi trường bắt buộc.

## Các lệnh

| Lệnh                      | Mô tả                                           |
| ------------------------- | ----------------------------------------------- |
| `npm run dev`             | Chạy môi trường phát triển (Turbopack)          |
| `npm run build`           | Build production                                |
| `npm start`               | Chạy bản build production                       |
| `npm run lint`            | Kiểm tra code bằng ESLint                       |
| `npm run typecheck`       | Kiểm tra kiểu TypeScript                        |
| `npm run format`          | Định dạng code bằng Prettier                    |
| `npm test`                | Chạy unit test & component test (Vitest)        |
| `npm run test:watch`      | Chạy test ở chế độ watch                        |
| `npm run test:coverage`   | Chạy test và đo độ bao phủ                      |
| `npm run test:e2e`        | Chạy end-to-end test (Playwright)               |
| `npm run check`           | lint + typecheck + test - chạy trước khi commit |
| `npm run db:migrate`      | Áp dụng migration vào `DATABASE_URL`            |
| `npm run db:seed`         | Thêm Tồn kho mẫu, không ghi đè tồn đã có        |
| `npm run db:test:prepare` | Dựng lại `shoplite_test` để chạy test DB        |
| `npm run test:db`         | Chạy test `*.db.test.ts` trên PostgreSQL thật   |
| `npm run check:full`      | `check` + chuẩn bị DB test + `test:db`          |

> `npm test` và `npm run check` không chạy `*.db.test.*`. Luồng đặt hàng cần `npm run check:full`.
>
> Lần đầu chạy E2E cần cài trình duyệt: `npx playwright install chromium`

## Cấu trúc thư mục

```text
src/
├── app/                    # Routes (App Router) - chỉ chứa trang và API, logic nằm ở features/
│   ├── api/                # Route Handlers: /api/products, /api/orders
│   ├── products/ cart/ checkout/ orders/
│   └── layout.tsx
├── features/               # Mỗi thư mục là một tính năng: logic + component + test
│   ├── catalog/            # Tìm kiếm, lọc, sắp xếp, phân trang sản phẩm
│   ├── cart/               # Giỏ hàng (reducer + store localStorage)
│   ├── checkout/           # Quy tắc tính tiền, validate form thanh toán
│   ├── inventory/          # Đọc và trừ Tồn kho
│   ├── rate-limit/         # Giới hạn đặt đơn theo IP
│   └── orders/             # Tạo / xem đơn hàng, lưu trong PostgreSQL
├── db/                     # Drizzle schema, pool, transaction
├── components/             # UI dùng chung (button, layout...)
├── data/                   # Dữ liệu mẫu: sản phẩm, danh mục
└── lib/                    # Tiện ích: format tiền/ngày, cn, http helpers
e2e/                        # Playwright end-to-end tests
```

## Quy tắc nghiệp vụ chính

- **Giỏ hàng:** tối đa 10 sản phẩm mỗi loại và không vượt quá tồn kho. Sản phẩm hết hàng không thể thêm.
- **Phí giao hàng:** tiêu chuẩn 30.000 ₫ (miễn phí cho đơn từ 500.000 ₫), giao nhanh 60.000 ₫.
- **Đặt hàng:** server tự tính lại giá từ dữ liệu sản phẩm, không tin giá do client gửi lên.
- **Tồn kho:** đặt hàng trừ Tồn kho nguyên tử trong một transaction; thiếu hàng thì không tạo đơn.

## API

| Method  | Endpoint              | Mô tả                                                                             |
| ------- | --------------------- | --------------------------------------------------------------------------------- |
| `GET`   | `/api/products`       | Danh sách sản phẩm. Query: `q, category, minPrice, maxPrice, inStock, sort, page` |
| `GET`   | `/api/products/:slug` | Chi tiết sản phẩm                                                                 |
| `GET`   | `/api/orders`         | Danh sách đơn hàng                                                                |
| `POST`  | `/api/orders`         | Tạo đơn hàng                                                                      |
| `GET`   | `/api/orders/:id`     | Chi tiết đơn hàng                                                                 |
| `PATCH` | `/api/orders/:id`     | Luôn trả 401 (Khách hàng không tự hủy đơn)                                        |

Lỗi trả về dạng `{ "error": { "code": "...", "message": "...", "details": { ... } } }`.

Khi thiếu hàng, `POST /api/orders` trả 409 `INSUFFICIENT_STOCK` với `details.lines: [{ "productId": "p006", "requested": 3, "available": 1 }]`; `available` luôn nhỏ hơn `requested`. Quá giới hạn đặt đơn trả 429 `RATE_LIMITED`. Database bận quá thời gian chờ trả 503 `SERVICE_UNAVAILABLE`.

Ví dụ tạo đơn hàng:

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer": { "fullName": "Nguyễn Văn A", "phone": "0912345678", "address": "12 Nguyễn Huệ, Quận 1, TP.HCM" },
    "shippingMethod": "standard",
    "paymentMethod": "cod",
    "items": [{ "productId": "p006", "quantity": 2 }]
  }'
```

## Biến môi trường

Xem `.env.example`; `DATABASE_URL` trỏ tới PostgreSQL.

## Giấy phép

[MIT](./LICENSE)
