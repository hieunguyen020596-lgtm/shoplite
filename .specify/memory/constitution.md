<!--
Sync Impact Report:
- Status: Initial Constitution Ratification
- Version: 1.0.0
- Ratified: 2026-11-08
- Source inputs: AGENTS.md, README.md, current ShopLite codebase architecture
- Impact: Establishes foundational rules for all future specifications, plans, tasks, and implementations.
-->

# ShopLite Constitution

## Core Principles

### I. Kiến trúc theo tính năng (Feature-based Architecture)

Mỗi tính năng MUST nằm trọn trong `src/features/<feature>/` bao gồm logic thuần, components nội bộ (`components/`), hooks và unit test đặt cạnh file tương ứng. Thư mục `src/app/` chỉ chứa các route mỏng (thin routes) chịu trách nhiệm nhận request và gọi sang features. Tuyệt đối không tạo các thư mục "utils" dùng chung chung cho logic nghiệp vụ.

### II. Test trước cho nghiệp vụ (NON-NEGOTIABLE)

Mọi quy tắc nghiệp vụ (tính tiền, giới hạn số lượng, điều kiện áp dụng khuyến mãi, chuyển trạng thái đơn hàng) MUST có unit test được viết trước khi cài đặt code, bao gồm đầy đủ các ca kiểm thử giá trị biên (edge cases). Các luồng tương tác người dùng quan trọng MUST có component test hoặc E2E test. Toàn bộ `npm run check` (typecheck, lint, test) MUST pass trước khi merge.

### III. Server là nguồn sự thật về tiền (Server as Single Source of Truth)

Mọi số liệu tài chính gồm đơn giá, phí giao hàng, mức giảm giá và tổng tiền MUST được server tính toán lại khi xử lý đơn hàng. Các con số hiển thị tại client chỉ mang tính chất xem trước (preview). Mọi dữ liệu đầu vào từ client gửi lên API MUST được kiểm tra và validate nghiêm ngặt bằng Zod schemas.

### IV. Đơn giản trước (YAGNI & Simplicity First)

Dự án MUST ưu tiên sử dụng tech stack hiện có: Next.js App Router, TypeScript strict mode, Zod, Tailwind CSS, Vitest và Playwright. Tuyệt đối không tự ý thêm external dependencies, thư viện bên ngoài, database thực tế hoặc dịch vụ third-party trừ khi có lý do kỹ thuật thuyết phục được giải thích rõ trong mục Complexity Tracking của bản plan.

### V. Trải nghiệm tiếng Việt và dễ tiếp cận (Localization & Accessibility)

Toàn bộ văn bản giao diện người dùng MUST viết bằng tiếng Việt chuẩn ngữ pháp. Giá tiền MUST được định dạng chuẩn tiền tệ Việt Nam (VND) thông qua hàm `formatCurrency`. Mọi form nhập liệu MUST có nhãn (label) rõ ràng và hiển thị thông báo lỗi cụ thể cho từng trường dữ liệu. Giao diện người dùng MUST hiển thị tốt trên màn hình từ 390px trở lên.

## Ràng buộc kỹ thuật

- Sử dụng Next.js 16 App Router, React 19, TypeScript với cờ `strict: true`, không dùng kiểu `any`.
- Dữ liệu tĩnh lưu trữ trong `src/data/`, dữ liệu nghiệp vụ có thể ghi đọc thông qua Repository pattern (hiện tại lưu trữ file JSON).
- Mọi API endpoint trả lỗi MUST theo chuẩn định dạng nhất quán: `{ error: { code, message, details? } }`.

## Quy trình phát triển

- Mỗi tính năng MUST được phát triển trên một nhánh git riêng biệt, đặc tả kỹ thuật đặt trong `specs/<NNN-tên-tính-năng>/`.
- Quy trình chuẩn tuân thủ nghiêm ngặt: `spec` → `plan` → `tasks` → `implement` → `converge`.
- Không được bắt đầu viết code khi bản spec vẫn còn các câu hỏi mở đánh dấu `[NEEDS CLARIFICATION]`.
- Code review là bắt buộc trước khi merge vào nhánh chính (`main`).

## Governance

- Constitution có hiệu lực tối cao, vượt trên mọi tài liệu hướng dẫn và thói quen thông thường trong dự án.
- Mọi thay đổi đối với Constitution MUST tăng version theo chuẩn Semantic Versioning (SemVer):
  - **MAJOR**: Thay đổi hoặc loại bỏ một nguyên tắc cốt lõi hiện có.
  - **MINOR**: Bổ sung nguyên tắc mới hoặc thay đổi đáng kể quy trình.
  - **PATCH**: Hiệu đính câu chữ, làm rõ nghĩa mà không đổi bản chất nguyên tắc.
- Bất kỳ đề xuất hoặc Plan nào vi phạm các nguyên tắc trong Constitution MUST giải trình chi tiết trong mục Complexity Tracking và phải được phê duyệt rõ ràng.

---

**Version**: 1.0.0 | **Ratified**: 2026-11-08 | **Last Amended**: 2026-11-08
