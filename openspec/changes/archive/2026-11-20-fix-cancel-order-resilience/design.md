# Design

## Context

Động lực và phạm vi: xem proposal.md. Hành vi cần đạt: xem `specs/order-cancellation/spec.md`.

### Các bước của luồng hủy đơn hiện tại

(Số dòng tại thời điểm explore.)

1. **Trang chi tiết đơn** `src/app/orders/[id]/page.tsx`
   - Là Server Component, khai báo `dynamic = "force-dynamic"` nên mỗi request đều đọc lại `orders.json`.
   - Lấy đơn bằng `orderService.getOrder(id)`. Không tìm thấy thì gọi `notFound()`.
   - Chỉ khi `order.status === "pending"` mới render `<CancelOrderButton orderId=... />` (dòng 70).
2. **Bấm "Hủy đơn hàng"** (`cancel-order-button.tsx:35`): chỉ đặt `confirming = true` để hiện hộp xác nhận, chưa gọi API.
3. **Bấm "Xác nhận hủy"** (`:45`), hàm `cancelOrder()`:
   - đặt `pending = true`, xóa lỗi cũ
   - gọi `fetch PATCH /api/orders/{id}` với body `{ "status": "cancelled" }` (`:17`)
4. **Route** `src/app/api/orders/[id]/route.ts`:
   - `readJsonBody()`: body không phải JSON thì thành `undefined`.
   - `body.status !== "cancelled"` thì trả `jsonError(400, "VALIDATION_ERROR", ...)`.
   - Gọi `orderService.cancelOrder(id)`. Có lỗi thì `handleRouteError(error)` trả `ApiErrorBody`.
5. **Service** `order-service.ts:166`:
   - `getOrder(id)`: không có đơn thì ném `ORDER_NOT_FOUND` (404).
   - `status !== "pending"` thì ném `INVALID_STATUS_TRANSITION` (409).
   - Ngược lại tạo `{ ...order, status: "cancelled", updatedAt: now() }` rồi `repository.save()`. Repository ghi `.tmp` rồi `rename` sang `orders.json`.
6. **Route trả về** 200 kèm đơn đã hủy.
7. **Client xử lý kết quả:**
   - Lỗi (`!response.ok`): đọc `ApiErrorBody`, hiện `error.message`, rồi dừng.
   - Thành công: `confirming = false`, gọi `router.refresh()`. Server Component render lại, thấy `cancelled`, nên không còn nút hủy và badge hiện "Đã hủy".

### Lỗ hổng ở bước 3 và bước 7

```text
fetch(...) ném lỗi (mất mạng)
  -> setPending(false) ở :22 KHÔNG chạy, vì không có try/catch
  -> nút kẹt "Đang hủy…", bị disabled vĩnh viễn, có unhandled rejection

server trả 409 (đơn đã bị hủy ở tab khác)
  -> chỉ hiện message, không refresh
  -> trang vẫn hiện "Chờ xác nhận" và vẫn còn nút hủy (sai sự thật)
```

Đối chiếu: `CheckoutForm.handleSubmit` đã có `try/catch` với thông báo "Không kết nối được máy chủ, vui lòng thử lại.". Change này đưa `CancelOrderButton` về cùng cách làm.

## Goals / Non-Goals

**Goals:**

- Sửa chỉ ở client component. Không đổi service, route hay định dạng lỗi.
- Có test cho mọi nhánh của luồng: route (200/400/404/409) và component (thành công, lỗi nghiệp vụ, lỗi mạng, hủy bỏ xác nhận).
- Hộp xác nhận là dialog modal truy cập được bằng bàn phím và screen reader.

**Non-Goals:**

- Không thêm hook hay helper `fetchJson` dùng chung, vì mới có hai chỗ gọi. Có thể làm sau.
- Không tạo component `Dialog` dùng chung (mới có một chỗ cần).
- Không đóng dialog khi bấm ra ngoài backdrop (tránh hủy nhầm thao tác đang xác nhận; muốn đóng thì bấm "Không" hoặc Esc).

## Decisions

### 1. Bọc `fetch` bằng `try / catch / finally`

- **Cách làm:**
  - `try`: gọi API rồi xử lý `response`.
  - `catch`: đặt lỗi "Không kết nối được máy chủ, vui lòng thử lại." (cùng câu chữ với `CheckoutForm` để thống nhất).
  - `finally`: `setPending(false)`, nên mọi nhánh đều thoát trạng thái "Đang hủy…".
- **Phương án đã cân nhắc:** thêm `setPending(false)` vào từng nhánh. Bị loại vì dễ sót nhánh, đúng loại lỗi đang sửa.

### 2. Tải lại trang khi lỗi là do trạng thái đơn đã đổi

- **Cách làm:** đặt `const REFRESH_ON_ERROR_CODES = ["INVALID_STATUS_TRANSITION", "ORDER_NOT_FOUND"] as const`. Khi `body.error.code` thuộc danh sách này thì vẫn đặt thông báo lỗi và gọi `router.refresh()`.
  - Với 409: trang render lại, đơn không còn `pending` nên nút hủy (và thông báo lỗi) biến mất. Badge trạng thái là phản hồi đúng sự thật.
  - Với 404: trang render lại thành trang "không tìm thấy".
- **Lý do xét theo `code` chứ không theo HTTP status:** đúng quy ước dự án (`ApiErrorBody.code` mới là nghĩa nghiệp vụ). Ví dụ `INSUFFICIENT_STOCK` cũng là 409 nhưng không liên quan tới việc này.
- **Phương án đã cân nhắc:** luôn refresh khi có lỗi. Bị loại vì lỗi 400/500 không làm đổi dữ liệu, refresh chỉ làm mất thông báo lỗi.

### 3. Test

- **Route test** `src/app/api/orders/[id]/route.test.ts` (`// @vitest-environment node`):
  - Mock `@/features/orders/server` bằng `createOrderService({ repository })` với `createInMemoryOrderRepository()`, giống `app/api/orders/route.test.ts`, nhưng giữ tham chiếu `repository` để dựng đơn `confirmed`.
  - Các trường hợp: 200 hủy thành công; 400 body sai (`{status:"confirmed"}`); 400 body không phải JSON; 404; 409 (đơn đã hủy).
- **Component test** `cancel-order-button.test.tsx`:
  - Mock `next/navigation` (`useRouter` trả `{ refresh }`), giống `checkout-form.test.tsx`. Dùng `vi.stubGlobal("fetch", ...)`.
  - Các trường hợp:
    - bấm "Không" thì không gọi `fetch`
    - thành công thì gọi `refresh`
    - 409 thì gọi `refresh`
    - 400 thì hiện message và không `refresh`
    - `fetch` reject thì hiện thông báo mất kết nối, nút được bật lại
    - thử lại thành công thì xóa lỗi cũ

### 4. Xác nhận bằng `<dialog>` modal của trình duyệt

- **Cách làm:**
  - Bấm "Hủy đơn hàng" gọi `dialogRef.current.showModal()`. Trình duyệt tự làm phần nền phía sau không bấm được (inert), giữ focus trong dialog và hỗ trợ Esc.
  - `<dialog aria-labelledby aria-describedby>` gồm tiêu đề "Hủy đơn hàng?", mô tả "Đơn hàng {id} sẽ bị hủy và không thể khôi phục.", nút "Không" (là lựa chọn an toàn, được focus bằng ref ngay sau `showModal()` vì `autoFocus` của React chỉ chạy lúc mount, không chạy khi mở dialog) và "Xác nhận hủy" (variant `danger`).
  - Thông báo lỗi hiển thị **bên trong** dialog với `role="alert"`, khách không cần đóng dialog mới thấy lỗi.
  - Sự kiện `cancel` (Esc): khi `pending` thì `preventDefault()` để không đóng giữa chừng.
  - Sự kiện `close`: xóa lỗi cũ và đưa focus về nút "Hủy đơn hàng" bằng ref. Trình duyệt thường tự làm việc này, nhưng ghi rõ để hành vi chắc chắn và test được.
  - Thành công: `dialog.close()` rồi `router.refresh()`.
  - Bỏ state `confirming`: trạng thái mở/đóng do chính `<dialog>` giữ.
- **Phương án đã cân nhắc:**
  - Thư viện dialog (Radix, Headless UI): bị loại vì thêm dependency cho một chỗ dùng.
  - Tự làm modal bằng `div` + focus trap: bị loại vì dễ sót a11y, trong khi `<dialog>` đã có sẵn.
  - `window.confirm()`: bị loại vì không đổi style được và không hiện được lỗi trong hộp.
- **Test:** jsdom 30 chưa có `showModal()` / `close()`. File test tự giả lập hai hàm này cho `HTMLDialogElement.prototype` (đặt `open`, phát sự kiện `close`), chỉ trong phạm vi file test đó. Phần focus trap thật và Esc thật của trình duyệt được kiểm tra thủ công.

### Luồng sau khi sửa

```text
Huy don hang -> dialog.showModal()  (focus "Khong")
Khong / Esc  -> dialog.close() -> xoa loi, focus ve nut "Huy don hang"  (Esc bi chan khi pending)
Xac nhan huy -> pending=true, error=null
  try   fetch PATCH
          ok              -> dialog.close(), router.refresh()
          !ok + code in REFRESH_ON_ERROR_CODES -> error=message, router.refresh()
          !ok (khac)      -> error=message (hoac "Khong the huy don hang")
  catch                   -> error="Khong ket noi duoc may chu, vui long thu lai."
  finally                 -> pending=false
```

### File tạo mới / file sửa

| Loại | File                                                          |
| ---- | ------------------------------------------------------------- |
| Sửa  | `src/features/orders/components/cancel-order-button.tsx`      |
| Mới  | `src/features/orders/components/cancel-order-button.test.tsx` |
| Mới  | `src/app/api/orders/[id]/route.test.ts`                       |

## Risks / Trade-offs

- **[`router.refresh()` sau 409 làm mất thông báo lỗi vì nút bị unmount]** → Chấp nhận: badge "Đã hủy"/"Đã xác nhận" sau khi refresh mới là thông tin đúng. Không cần giữ câu lỗi.
- **[`setState` sau khi component unmount (refresh xong trước `finally`)]** → React 19 không cảnh báo khi `setState` trên component đã unmount, và không gây lỗi. Chấp nhận.
- **[jsdom không có `showModal()`: test không kiểm tra được focus trap thật]** → Giả lập tối thiểu trong file test. Task kiểm tra thủ công trên trình duyệt có bước Tab/Esc.
- **[Hai nơi lặp lại câu "Không kết nối được máy chủ…"]** → Chấp nhận (xem Non-Goals). Nếu có nơi thứ ba thì tách ra hằng số dùng chung.
