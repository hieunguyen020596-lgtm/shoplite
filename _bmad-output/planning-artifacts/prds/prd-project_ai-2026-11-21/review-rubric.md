# PRD Quality Review — Vận hành đơn hàng ShopLite

## Overall verdict

PRD có luận điểm rõ: khóa dữ liệu khách, đưa vòng đời đơn vào hệ thống, giữ hàng ngay khi đặt. Các chỗ tham chiếu code là chính xác. Phần tách Baseline và [MỚI]/[THAY ĐỔI] làm tốt, và đây là thế mạnh lớn nhất của tài liệu. Rủi ro chính nằm ở done-ness: vài FR chưa có khối Consequences. Ngoài ra có một khoảng trống bảo mật ở FR-7, và một mâu thuẫn nhỏ giữa FR-17 và FR-26.

## Decision-readiness: adequate

Các quyết định được nêu thẳng: không giao lại sau `failed`, Hàng đang giữ tính từ đơn, nhân viên cập nhật trạng thái thay đơn vị vận chuyển. Counter-metrics SM-C2 nói thẳng "tỷ lệ cao là tín hiệu thiếu người". Câu hỏi mở 1 (nhập kho) là một mâu thuẫn thật với SM-5: chạy thật 2 tuần mà không nhập được kho thì Tồn khả dụng chỉ giảm dần về 0.

### Findings

- **medium** Câu hỏi mở 1 ảnh hưởng tới SM-5 (§7, §8). Đây không phải câu hỏi phụ. _Fix:_ ghi rõ chủ sở hữu, điều kiện xem lại, và liên kết với SM-5.

## Substance over theater: strong

Không có persona trang trí: 5 UJ đều dẫn tới FR cụ thể. NFR có ngưỡng cụ thể (1.000 đơn, dưới 1 giây; cookie `HttpOnly`/`SameSite`).

## Strategic coherence: strong

Thứ tự feature đi theo bảng rủi ro: R1 (4.1, 4.2) → R3 (4.3, 4.4) → R2 (4.5) → R5 (4.6). SM-1 → SM-4 đo đúng bốn rủi ro này.

## Done-ness clarity: thin

### Findings

- **high** FR-12, FR-13, FR-21, FR-25, FR-28, FR-29 thiếu khối "Consequences (testable)" (§4.4–4.7). FR-12 và FR-13 chỉ có một dòng mô tả. _Fix:_ thêm điều kiện kiểm được cho từng FR.
- **medium** FR-9 không có tiêu chí đo cho "tối giản" (§4.3), trong khi R6 phụ thuộc vào nó. _Fix:_ xác nhận một đơn từ Hàng đợi không quá 2 thao tác.
- **medium** FR-30 → FR-32 thiếu Consequences (§4.8). Chúng là Should nhưng vẫn cần điều kiện nghiệm thu nếu được làm. _Fix:_ thêm 1–2 điều kiện cho mỗi FR.
- **low** FR-6: câu "không chứa `phone`" mâu thuẫn với "SĐT nếu có hiển thị phải che". _Fix:_ nói rõ chỉ được trả bản đã che, không trả bản rõ.

## Scope honesty: strong

§5 Non-Goals làm đúng việc của nó, ví dụ "không phải hệ thống quản lý kho". `[NOTE FOR PM]` đặt đúng chỗ ở §6.2. Mật độ mục mở (5 câu hỏi mở, 8 giả định) chấp nhận được với mức độ lab nghiêm túc.

## Downstream usability: adequate

### Findings

- **medium** FR-17 và FR-26 mâu thuẫn (§4.4, §4.6). FR-17 tính hạn từ `createdAt` và ghi thời điểm là `createdAt` + N. FR-26 tính hạn của đơn cũ từ lúc nâng cấp. _Fix:_ FR-17 tham chiếu ngoại lệ ở FR-26.
- **medium** FR-7 chỉ giới hạn theo Mã đơn (§4.2). Kẻ dò có thể thử nhiều Mã đơn mà không bị chặn. Họ cũng có thể cố tình khóa đơn của khách thật (SM-C3). _Fix:_ thêm giới hạn theo nguồn yêu cầu, và nêu rằng khóa không áp dụng cho Thiết bị đã đặt (đã có).

## Shape fit: strong

Đúng dạng brownfield, nhiều bên liên quan: có UJ với nhân vật có tên, Baseline có tham chiếu code, FR [THAY ĐỔI] ghi rõ "Hiện tại / Mới".

## Mechanical notes

- Chỉ mục giả định thiếu `[ASSUMPTION]` ở §10 Hiệu năng.
- FR-4 dùng từ "trình duyệt hiện tại đã đặt". Nên dùng đúng thuật ngữ Glossary: "Thiết bị đã đặt".
- ID FR-1 → FR-32, UJ-1 → UJ-5, SM-1 → SM-6, SM-C1 → SM-C3, BL-1 → BL-10 đều liên tục. Mọi tham chiếu chéo đều trỏ đúng.
