"use client";

import { LogOut, Store } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ApiErrorBody } from "@/lib/http";

const SYSTEM_ERROR_MESSAGE = "Có lỗi hệ thống xảy ra. Vui lòng thử lại sau.";
const NETWORK_ERROR_MESSAGE =
  "Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.";

export function AdminHeaderBar() {
  const router = useRouter();
  const loggingOutRef = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    if (loggingOutRef.current || pending) {
      return;
    }
    loggingOutRef.current = true;
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        const body = (await response
          .json()
          .catch(() => null)) as ApiErrorBody | null;
        const serverMessage =
          typeof body?.error?.message === "string" &&
          body.error.message.trim().length > 0
            ? body.error.message
            : SYSTEM_ERROR_MESSAGE;
        setError(serverMessage);
        loggingOutRef.current = false;
        setPending(false);
        return;
      }

      router.push("/admin/login");
      router.refresh();
    } catch {
      setError(NETWORK_ERROR_MESSAGE);
      loggingOutRef.current = false;
      setPending(false);
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-2.5 text-base font-bold text-slate-900">
          <span
            className="flex size-8 items-center justify-center rounded-lg bg-indigo-600 text-white"
            aria-hidden="true"
          >
            <Store className="size-4" aria-hidden="true" />
          </span>
          <span className="hidden sm:inline">ShopLite</span>
          <span className="hidden rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 sm:inline">
            Vận hành đơn hàng
          </span>
          <span className="sm:hidden">Vận hành</span>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleLogout}
          disabled={pending}
          className="min-h-11"
        >
          <LogOut className="size-4" aria-hidden="true" />
          {pending ? "Đang đăng xuất…" : "Đăng xuất"}
        </Button>
      </div>

      {error && (
        <div className="mx-auto max-w-6xl px-4 pb-3">
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
          >
            {error}
          </div>
        </div>
      )}
    </header>
  );
}
