# Feature Specification: Mã giảm giá khi thanh toán (Coupon Code)

**Feature Branch**: `001-coupon-code`

**Created**: 2026-11-08

**Status**: Draft

**Input**: User description: "Tính năng: Mã giảm giá khi thanh toán cho ShopLite. Cho phép khách hàng nhập mã giảm giá (phần trăm hoặc cố định), kiểm tra điều kiện tối thiểu, hạn sử dụng, chống gian lận và lưu lại trong đơn hàng."

## User Scenarios & Testing

### User Story 1 - Áp dụng mã giảm giá hợp lệ và xem trước số tiền giảm (Priority: P1)

Là một khách hàng đang ở trang thanh toán, tôi muốn nhập một mã giảm giá hợp lệ và bấm "Áp dụng" để nhận được ưu đãi giảm giá ngay trên đơn hàng hiện tại của mình.

**Why this priority**: Đây là luồng giá trị cốt lõi mang lại lợi ích trực tiếp cho người mua và đáp ứng mục tiêu marketing tăng tỷ lệ chuyển đổi đơn hàng.

**Independent Test**: Có thể kiểm thử độc lập bằng cách thêm sản phẩm vào giỏ hàng, đi tới trang thanh toán, nhập mã hợp lệ (ví dụ: `GIAM50K` cho đơn từ 500.000đ), bấm "Áp dụng" và xác nhận dòng giảm giá cùng tổng tiền mới xuất hiện chính xác.

**Acceptance Scenarios**:

1. **Given** giỏ hàng có tạm tính 600.000đ và chưa áp dụng mã nào,
   **When** khách nhập mã "GIAM50K" và bấm "Áp dụng",
   **Then** hệ thống hiển thị mã "GIAM50K" đã được áp dụng thành công,
   **And** tóm tắt đơn hàng hiển thị dòng "Giảm giá: -50.000đ",
   **And** tổng tiền thanh toán mới giảm đúng 50.000đ.

2. **Given** giỏ hàng có tạm tính 1.200.000đ,
   **When** khách nhập mã "SHOPLITE10" (giảm 10%, tối đa 100.000đ cho đơn từ 300.000đ) và bấm "Áp dụng",
   **Then** số tiền giảm được giới hạn ở mức trần 100.000đ (dù 10% của 1.200.000đ là 120.000đ),
   **And** tóm tắt đơn hiển thị "Giảm giá: -100.000đ".

3. **Given** khách hàng đã áp dụng một mã giảm giá thành công,
   **When** khách bấm nút "Gỡ bỏ" (hoặc "Xóa mã"),
   **Then** mã được gỡ bỏ khỏi đơn hàng,
   **And** số tiền giảm quay về 0đ và tổng tiền trở về mức ban đầu.

---

### User Story 2 - Thông báo lỗi rõ ràng khi mã không hợp lệ hoặc không đủ điều kiện (Priority: P2)

Là một khách hàng, tôi muốn nhận được thông báo lỗi rõ ràng, dễ hiểu khi mã giảm giá tôi nhập không thể sử dụng để tôi biết lý do và cách điều chỉnh giỏ hàng.

**Why this priority**: Giúp minh bạch trải nghiệm người dùng, tránh gây bức xúc và thúc đẩy người mua tăng thêm giá trị giỏ hàng để đủ điều kiện áp dụng.

**Independent Test**: Có thể kiểm thử bằng cách nhập các mã không tồn tại, mã hết hạn hoặc mã có yêu cầu đơn tối thiểu cao hơn giá trị giỏ hàng hiện tại.

**Acceptance Scenarios**:

1. **Given** khách hàng ở trang thanh toán,
   **When** nhập mã "KHONGTONTAI" và bấm "Áp dụng",
   **Then** hệ thống hiển thị thông báo lỗi: "Mã giảm giá không tồn tại."

2. **Given** khách hàng ở trang thanh toán,
   **When** nhập mã "TET2026" (đã hết hạn ngày 28/02/2026),
   **Then** hệ thống hiển thị thông báo lỗi: "Mã giảm giá đã hết hạn sử dụng."

3. **Given** giỏ hàng có tạm tính 200.000đ,
   **When** khách nhập mã "SHOPLITE10" (yêu cầu đơn tối thiểu 300.000đ),
   **Then** hệ thống báo lỗi rõ ràng: "Đơn hàng chưa đạt giá trị tối thiểu 300.000đ. Vui lòng mua thêm 100.000đ để áp dụng mã này."

---

### User Story 3 - Chống gian lận và lưu vết mã giảm giá vào đơn hàng đã đặt (Priority: P3)

Là chủ cửa hàng ShopLite, tôi muốn hệ thống phía server luôn xác thực và tính toán lại tiền giảm giá khi tạo đơn hàng, đồng thời lưu lại thông tin mã và số tiền giảm trong chi tiết đơn hàng để đảm bảo tính toàn vẹn tài chính.

**Why this priority**: Đảm bảo an toàn tài chính, ngăn chặn người dùng cố tình can thiệp số tiền từ trình duyệt, và phục vụ đối soát đơn hàng sau khi mua.

**Independent Test**: Gửi payload tạo đơn kèm mã giảm giá, kiểm tra dữ liệu đơn hàng được lưu trong hệ thống và trang chi tiết đơn hàng hiển thị mã cùng số tiền giảm.

**Acceptance Scenarios**:

1. **Given** đơn hàng được đặt thành công với mã "SHOPLITE10" hợp lệ,
   **When** khách hoặc quản trị viên mở trang chi tiết đơn hàng `/orders/[id]`,
   **Then** trang chi tiết hiển thị mã giảm giá đã dùng "SHOPLITE10" và dòng giảm giá "-100.000đ".

2. **Given** một client cố tình gửi request tạo đơn hàng với số tiền giảm bị làm sai lệch,
   **When** server xử lý request tạo đơn,
   **Then** server MUST tự tính toán lại số tiền giảm hợp lệ dựa trên quy tắc của mã,
   **And** lưu tổng tiền thực tế do server tính, bỏ qua số tiền do client tự gửi lên.

---

### Edge Cases

- **Mã nhập có chữ thường**: Nếu khách nhập `shoplite10`, hệ thống từ chối vì phân biệt chữ hoa chữ thường. Khoảng trắng thừa ở 2 đầu (ví dụ `SHOPLITE10`) vẫn được tự động cắt gọn.
- **Thay đổi giỏ hàng sau khi đã áp dụng mã**: Nếu khách quay lại giỏ hàng giảm số lượng hoặc xóa sản phẩm làm tạm tính rơi xuống dưới mức tối thiểu của mã đang áp dụng, hệ thống sẽ chặn thao tác và nhắc khách hàng cần gỡ mã giảm giá trước.
- **Thời điểm hết hạn**: Mã hết hạn vào 23:59:59 của ngày hết hạn theo múi giờ Việt Nam (UTC+7).
- **Mã hợp lệ lúc nhập nhưng hết hạn lúc bấm Đặt hàng**: Nếu khách hàng đã áp dụng mã thành công trước thời điểm hết hạn, server vẫn chấp nhận và cho phép hoàn tất đặt hàng với ưu đãi đó.
- **Số tiền giảm vượt quá giá trị đơn hàng**: Số tiền giảm có thể cấn trừ vào phí vận chuyển, nhưng tổng thanh toán tối thiểu của đơn hàng không bao giờ được âm (tối thiểu là 0đ).

---

## Requirements

### Functional Requirements

- **FR-001**: Hệ thống MUST cung cấp ô nhập mã giảm giá và nút "Áp dụng" tại trang thanh toán.
- **FR-002**: Hệ thống MUST hỗ trợ 2 loại giảm giá: giảm theo phần trăm (có trần giảm tối đa) và giảm số tiền cố định.
- **FR-003**: Hệ thống MUST kiểm tra điều kiện giá trị đơn hàng tối thiểu và ngày hết hạn trước khi cho phép áp dụng mã.
- **FR-004**: Mỗi đơn hàng MUST chỉ được áp dụng tối đa 01 mã giảm giá tại một thời điểm.
- **FR-005**: Khách hàng MUST có thể gỡ bỏ mã giảm giá đã áp dụng bất kỳ lúc nào trước khi đặt hàng.
- **FR-006**: Khi mã không hợp lệ, hệ thống MUST hiển thị thông báo lỗi cụ thể tương ứng (mã không tồn tại / mã hết hạn / số tiền cần mua thêm để đạt mức tối thiểu).
- **FR-007**: Hệ thống MUST khởi tạo sẵn 3 mã ban đầu:
  - `SHOPLITE10`: giảm 10%, tối đa 100.000đ, đơn từ 300.000đ.
  - `GIAM50K`: giảm 50.000đ, đơn từ 500.000đ.
  - `TET2026`: giảm 15%, tối đa 200.000đ, hết hạn 28/02/2026.
- **FR-008**: Server MUST là nguồn sự thật duy nhất (Single Source of Truth) tính toán lại số tiền giảm và tổng tiền khi đặt hàng, ngăn chặn hoàn toàn gian lận giá từ client.
- **FR-009**: Đơn hàng sau khi tạo MUST lưu trữ mã giảm giá đã dùng và số tiền giảm thực tế, hiển thị đầy đủ trong trang chi tiết đơn hàng `/orders/[id]`.
- **FR-010**: Mọi input liên quan đến mã giảm giá gửi lên API MUST được validate bằng Zod schemas.

---

## Clarifications

### Q1: Phân biệt chữ hoa / chữ thường khi nhập mã

- **Quyết định**: Hệ thống **phân biệt chính xác chữ hoa và chữ thường (case-sensitive)**. Khách hàng phải nhập chính xác ký tự hoa/thường theo đúng quy định của mã khuyến mãi (ví dụ: phải nhập đúng `SHOPLITE10`, không chấp nhận `shoplite10`). Khoảng trắng thừa ở hai đầu vẫn được tự động loại bỏ.

### Q2: Ngưỡng miễn phí giao hàng

- **Quyết định**: Ngưỡng miễn phí giao hàng (500.000đ hiện tại của ShopLite) được **tính dựa trên tạm tính TRƯỚC khi giảm giá**. Điều này khuyến khích khách hàng mua nhiều hàng hơn để nhận cả ưu đãi kép (vừa được giảm giá vừa được freeship).

### Q3: Giảm giá cấn trừ vào phí vận chuyển

- **Quyết định**: Số tiền giảm giá **được phép cấn trừ vào cả phí vận chuyển** nếu mức giảm vượt quá tổng tiền hàng tạm tính. Tổng thanh toán cuối cùng của đơn hàng tối thiểu bằng 0đ (không được âm).

### Q4: Mã hợp lệ lúc áp dụng nhưng hết hạn tại thời điểm bấm đặt hàng

- **Quyết định**: Server **vẫn chấp nhận tạo đơn hàng** nếu khách hàng đã áp dụng mã thành công trước thời điểm mã hết hạn (bảo vệ quyền lợi của khách hàng đã giữ chỗ ưu đãi trong phiên thanh toán).

### Q5: Khách thay đổi giỏ hàng làm đơn không còn đạt giá trị tối thiểu

- **Quyết định**: Hệ thống **chặn không cho phép khách giảm số lượng hoặc xóa sản phẩm** nếu hành động đó khiến giá trị giỏ hàng rơi xuống dưới mức tối thiểu của mã đang áp dụng. Khách hàng bắt buộc phải chủ động bấm "Gỡ mã" trước nếu muốn giảm bớt sản phẩm.

---

### Key Entities

- **Coupon**: Đại diện cho mã giảm giá trong hệ thống.
  - `code` (string): Mã coupon (ví dụ: `SHOPLITE10`).
  - `type` ("percent" | "fixed"): Loại giảm giá.
  - `value` (number): Tỷ lệ phần trăm (1-100) hoặc số tiền giảm cố định (VND).
  - `maxDiscount` (number, optional): Số tiền giảm tối đa (áp dụng cho loại percent).
  - `minOrderValue` (number, optional): Giá trị đơn hàng tối thiểu để được áp dụng.
  - `expiresAt` (string ISO, optional): Thời điểm hết hạn.
- **Order (mở rộng)**:
  - `couponCode` (string, optional): Mã đã áp dụng.
  - `discountAmount` (number): Số tiền giảm thực tế (mặc định 0đ).

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% các mã hợp lệ được tính toán chính xác số tiền giảm và cập nhật hiển thị ngay lập tức (< 200ms) trên giao diện.
- **SC-002**: 100% các trường hợp gian lận sửa số tiền giảm ở client đều bị server chặn hoặc tự động tính lại đúng giá trị.
- **SC-003**: Khi nhập mã thiếu điều kiện giá trị đơn, thông báo lỗi luôn hiển thị chính xác số tiền cần mua thêm.
- **SC-004**: Toàn bộ unit test và e2e test cho coupon pass 100%, lệnh `npm run check` không có bất kỳ warning/error nào.

---

## Assumptions & Out of Scope

- **Assumptions**:
  - Dữ liệu coupon ban đầu được lưu trữ tĩnh trong `src/data/coupons.ts` phù hợp với kiến trúc hiện tại của ShopLite.
  - Múi giờ hệ thống tính theo Giờ Việt Nam (GMT+7).
- **Out of Scope**:
  - Giao diện Admin để thêm/sửa/xóa mã giảm giá.
  - Giới hạn số lượt dùng của mỗi mã (usage limit) và mã dành riêng cho từng user.
  - Kết hợp nhiều mã giảm giá trong 1 đơn hàng.
