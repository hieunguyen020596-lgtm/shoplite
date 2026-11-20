"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState, type SyntheticEvent } from "react";
import { Button, buttonStyles } from "@/components/ui/button";
import type { OrderErrorCode } from "@/features/orders/order-errors";
import type { ApiErrorBody } from "@/lib/http";

/** Lỗi cho thấy trạng thái đơn trên server đã khác trang đang hiển thị - cần tải lại trang. */
const REFRESH_ON_ERROR_CODES: readonly string[] = [
  "INVALID_STATUS_TRANSITION",
  "ORDER_NOT_FOUND",
] as const satisfies readonly OrderErrorCode[];

/** Nút hủy đơn + hộp thoại xác nhận modal (thẻ <dialog> của trình duyệt). */
export function CancelOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  function openDialog() {
    dialogRef.current?.showModal();
    // React chỉ autoFocus khi mount, nên focus nút an toàn "Không" ngay sau khi mở.
    keepRef.current?.focus();
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  function handleClose() {
    setError(null);
    triggerRef.current?.focus();
  }

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    // Esc: không cho đóng khi đang gửi yêu cầu hủy.
    if (pending) event.preventDefault();
  }

  async function cancelOrder() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
        setError(body?.error.message ?? "Không thể hủy đơn hàng");
        // Đơn đã bị hủy/xác nhận ở nơi khác hoặc không còn tồn tại: tải lại để hiện trạng thái thật.
        if (body && REFRESH_ON_ERROR_CODES.includes(body.error.code)) router.refresh();
        return;
      }
      closeDialog();
      router.refresh();
    } catch {
      setError("Không kết nối được máy chủ, vui lòng thử lại.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openDialog}
        className={buttonStyles({ variant: "secondary" })}
      >
        Hủy đơn hàng
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onCancel={handleCancel}
        onClose={handleClose}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-white p-6 shadow-xl backdrop:bg-slate-900/50"
      >
        <h2 id={titleId} className="text-lg font-semibold text-slate-900">
          Hủy đơn hàng?
        </h2>
        <p id={descriptionId} className="mt-2 text-sm text-slate-600">
          Đơn hàng <strong className="text-slate-900">{orderId}</strong> sẽ bị hủy và không thể khôi
          phục.
        </p>

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            ref={keepRef}
            type="button"
            onClick={closeDialog}
            disabled={pending}
            className={buttonStyles({ variant: "secondary" })}
          >
            Không
          </button>
          <Button variant="danger" onClick={cancelOrder} disabled={pending}>
            {pending ? "Đang hủy…" : "Xác nhận hủy"}
          </Button>
        </div>
      </dialog>
    </>
  );
}
