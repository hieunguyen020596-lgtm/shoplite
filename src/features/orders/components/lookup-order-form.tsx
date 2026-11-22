"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import type { ApiErrorBody } from "@/lib/http";
import { normalizeOrderCode } from "../order-service";

const NOT_FOUND = "Không tìm thấy đơn với mã và số điện thoại này.";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Form "Tra cứu đơn" trên /orders: dùng chung endpoint xác minh (và giới hạn thử) của Story 1.6. */
export function LookupOrderForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || lockedUntil) return;
    const orderId = normalizeOrderCode(code);
    if (!orderId || !phone.trim()) {
      setError("Vui lòng nhập Mã đơn và số điện thoại.");
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch(
        `/api/orders/${encodeURIComponent(orderId)}/verify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: phone.trim() }),
        },
      );
      if (response.ok) {
        router.push(`/orders/${encodeURIComponent(orderId)}`);
        router.refresh();
        return;
      }

      const body = (await response
        .json()
        .catch(() => null)) as ApiErrorBody | null;
      if (response.status === 429) {
        const retryAt =
          body?.error.details?.retryAt ??
          new Date(Date.now() + 15 * 60 * 1000).toISOString();
        setLockedUntil(retryAt);
        setError(
          body?.error.message ??
            "Bạn đã thử quá nhiều lần, vui lòng thử lại sau 15 phút",
        );
      } else {
        // Mã đơn sai và SĐT sai dùng chung một câu.
        setError(NOT_FOUND);
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
      className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
    >
      <Field label="Mã đơn" name="lookup-code">
        <input
          id="lookup-code"
          name="code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          disabled={locked}
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="SL-20261121-4F9A2C"
          className={cn(inputClass, "ring-slate-300")}
        />
      </Field>
      <Field label="Số điện thoại đặt hàng" name="lookup-phone">
        <input
          id="lookup-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          disabled={locked}
          placeholder="0912 345 678"
          className={cn(inputClass, "ring-slate-300")}
        />
      </Field>
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          {error}
          {locked && <> Bạn có thể thử lại lúc {formatTime(lockedUntil)}.</>}
        </p>
      )}
      <Button
        type="submit"
        size="lg"
        disabled={submitting || locked}
        className="min-h-11"
      >
        {submitting ? "Đang tra cứu…" : "Tra cứu"}
      </Button>
    </form>
  );
}
