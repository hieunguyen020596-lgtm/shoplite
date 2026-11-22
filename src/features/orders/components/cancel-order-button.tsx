"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button, buttonStyles } from "@/components/ui/button";
import type { ApiErrorBody } from "@/lib/http";

export function CancelOrderButton({ orderId }: { orderId: string }) {
  return <CancelOrderButtonInner key={orderId} orderId={orderId} />;
}

function CancelOrderButtonInner({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [conflictDetected, setConflictDetected] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);
  const triggerButtonRef = useRef<HTMLButtonElement | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);
  const wasConfirmingRef = useRef(false);

  useEffect(() => {
    if (confirming) {
      wasConfirmingRef.current = true;
      confirmButtonRef.current?.focus();
    } else if (wasConfirmingRef.current) {
      wasConfirmingRef.current = false;
      triggerButtonRef.current?.focus();
    }
  }, [confirming]);

  function dismissConfirm() {
    if (pending || submitted) return;
    setError(null);
    setConfirming(false);
  }

  async function cancelOrder() {
    if (submittingRef.current || pending || conflictDetected || submitted) {
      return;
    }
    submittingRef.current = true;
    setPending(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/orders/${encodeURIComponent(orderId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "cancelled",
            expectedStatus: "pending",
          }),
        },
      );

      if (!response.ok) {
        const body = (await response
          .json()
          .catch(() => null)) as ApiErrorBody | null;
        const serverMessage =
          typeof body?.error?.message === "string" &&
          body.error.message.trim().length > 0
            ? body.error.message.trim()
            : null;
        const isConflict =
          response.status === 409 ||
          body?.error?.code === "INVALID_STATUS_TRANSITION";

        if (isConflict) {
          submittingRef.current = false;
          setConflictDetected(true);
          setPending(false);
          setError(
            serverMessage ?? "Đơn hàng đã được xác nhận, không thể hủy.",
          );
          router.refresh();
          return;
        }

        submittingRef.current = false;
        setPending(false);
        setError(serverMessage ?? "Không thể hủy đơn hàng");
        return;
      }

      setSubmitted(true);
      setPending(false);
      setConfirming(false);
      router.refresh();
    } catch {
      submittingRef.current = false;
      setPending(false);
      setError("Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.");
    }
  }

  if (!confirming) {
    return (
      <button
        ref={triggerButtonRef}
        type="button"
        disabled={submitted}
        onClick={() => {
          if (submitted || submittingRef.current) return;
          setError(null);
          setConfirming(true);
        }}
        className={buttonStyles({
          variant: "secondary",
          className: "min-h-11 h-auto w-full sm:w-auto",
        })}
      >
        Hủy đơn hàng
      </button>
    );
  }

  return (
    <div
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          if (pending || submitted) return;
          event.stopPropagation();
          dismissConfirm();
        }
      }}
      className="flex flex-col gap-2 rounded-xl bg-rose-50 p-4 text-sm"
    >
      <p className="font-medium text-rose-900">
        Bạn chắc chắn muốn hủy đơn hàng này?
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          ref={confirmButtonRef}
          type="button"
          onClick={cancelOrder}
          disabled={pending || conflictDetected || submitted}
          className={buttonStyles({
            variant: "danger",
            size: "sm",
            className: "min-h-11 h-auto",
          })}
        >
          {pending ? "Đang hủy…" : "Xác nhận hủy"}
        </button>
        <Button
          variant="ghost"
          size="sm"
          onClick={dismissConfirm}
          disabled={pending || submitted}
          className="min-h-11 h-auto"
        >
          Không
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-rose-700 break-words">
          {error}
        </p>
      )}
    </div>
  );
}
