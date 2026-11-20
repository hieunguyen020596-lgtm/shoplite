# Spec Delta

## Purpose

Server tiếp nhận và kiểm tra đơn hàng do client gửi lên, không tin bất kỳ số liệu nào từ client vượt ngoài quy tắc nghiệp vụ của cửa hàng.

## ADDED Requirements

### Requirement: Giới hạn số lượng mỗi sản phẩm trong một đơn

The system SHALL tính tổng số lượng của từng sản phẩm trong đơn, cộng cả các dòng trùng sản phẩm, và MUST từ chối đơn có sản phẩm vượt quá 10 đơn vị với lỗi `VALIDATION_ERROR` (HTTP 400). Đơn bị từ chối MUST NOT được lưu.

#### Scenario: Hai dòng trùng sản phẩm vượt giới hạn

- **WHEN** client gửi đơn gồm hai dòng cùng một sản phẩm, mỗi dòng 10 đơn vị
- **THEN** server trả 400 `VALIDATION_ERROR` kèm thông báo sản phẩm vượt giới hạn
- **AND** không có đơn nào được lưu

#### Scenario: Dòng trùng có tổng đúng bằng giới hạn

- **WHEN** client gửi hai dòng cùng một sản phẩm với số lượng 4 và 6
- **THEN** đơn được tạo với một dòng duy nhất cho sản phẩm đó, số lượng 10

#### Scenario: Dòng trùng có tổng vượt giới hạn 1 đơn vị

- **WHEN** client gửi hai dòng cùng một sản phẩm với số lượng 5 và 6
- **THEN** server trả 400 `VALIDATION_ERROR` và không lưu đơn

#### Scenario: Một dòng vượt giới hạn

- **WHEN** client gửi một dòng có số lượng 11
- **THEN** server trả 400 `VALIDATION_ERROR` như trước đây
