"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import type { ApiErrorBody } from "@/lib/http";

const WRONG_PHONE = "Số điện thoại không khớp với đơn hàng này";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Form xác minh bằng SĐT đặt hàng trên /orders/[id] khi thiết bị chưa được xác minh. */
export function VerifyOrderForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || lockedUntil) return;
    setError(null);
    setRemaining(null);
    setSubmitting(true);

    try {
      const response = await fetch(`/api/orders/${orderId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      if (response.ok) {
        router.refresh();
        return;
      }

      const body = (await response
        .json()
        .catch(() => null)) as ApiErrorBody | null;
      const details = body?.error.details;
      if (response.status === 429) {
        setLockedUntil(
          details?.retryAt ??
            new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        );
        setError(
          body?.error.message ??
            "Bạn đã thử quá nhiều lần, vui lòng thử lại sau 15 phút",
        );
      } else if (response.status === 400) {
        setError(details?.phone ?? "Vui lòng nhập số điện thoại");
      } else {
        setError(
          response.status === 403
            ? WRONG_PHONE
            : (body?.error.message ?? WRONG_PHONE),
        );
        const left = Number(details?.remaining);
        if (details?.remaining !== undefined && Number.isFinite(left)) {
          if (left <= 2) setRemaining(left);
          if (left === 0 && details.retryAt) setLockedUntil(details.retryAt);
        }
      }
    } catch {
      setError("Không kết nối được máy chủ, vui lòng thử lại.");
    }
    setSubmitting(false);
  }

  const locked = lockedUntil !== null;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mt-3 flex flex-col gap-2"
    >
      <Field label="Nhập SĐT đặt hàng để xem đầy đủ" name="verify-phone">
        <div className="flex gap-2">
          <input
            id="verify-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            disabled={locked}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "verify-phone-error" : undefined}
            placeholder="0912 345 678"
            className={cn(
              inputClass,
              error ? "ring-rose-400" : "ring-slate-300",
            )}
          />
          <Button
            type="submit"
            variant="secondary"
            aria-label="Xem đầy đủ"
            disabled={submitting || locked}
            className="min-h-11 shrink-0"
          >
            <span className="hidden min-[390px]:inline">Xem đầy đủ</span>
            <span className="min-[390px]:hidden" aria-hidden>
              Xem
            </span>
          </Button>
        </div>
      </Field>
      {error && (
        <p
          id="verify-phone-error"
          role="alert"
          className="text-xs text-rose-600"
        >
          {error}
          {remaining !== null && remaining > 0 && (
            <> Còn {remaining} lần thử.</>
          )}
          {locked && <> Bạn có thể thử lại lúc {formatTime(lockedUntil)}.</>}
        </p>
      )}
    </form>
  );
}
