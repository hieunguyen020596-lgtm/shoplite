"use client";

import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import type { ApiErrorBody } from "@/lib/http";

const SYSTEM_ERROR_MESSAGE = "Có lỗi hệ thống xảy ra. Vui lòng thử lại sau.";
const NETWORK_ERROR_MESSAGE =
  "Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.";

export function AdminLoginCard({
  configured,
  expired = false,
}: {
  configured: boolean;
  expired?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);
  const [isConfigured, setIsConfigured] = useState(configured);
  const [passcode, setPasscode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isConfigured || submittingRef.current) {
      return;
    }

    const trimmedPasscode = passcode.trim();
    if (trimmedPasscode.length === 0) {
      setError("Vui lòng nhập mật khẩu quản trị");
      inputRef.current?.focus();
      return;
    }

    submittingRef.current = true;
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: trimmedPasscode }),
      });

      if (!response.ok) {
        const body = (await response
          .json()
          .catch(() => null)) as ApiErrorBody | null;

        if (
          response.status === 503 ||
          body?.error?.code === "ADMIN_NOT_CONFIGURED"
        ) {
          setIsConfigured(false);
          setError(null);
          submittingRef.current = false;
          setPending(false);
          return;
        }

        const serverMessage =
          typeof body?.error?.message === "string" &&
          body.error.message.trim().length > 0
            ? body.error.message
            : SYSTEM_ERROR_MESSAGE;

        setError(serverMessage);
        submittingRef.current = false;
        setPending(false);
        inputRef.current?.focus();
        return;
      }

      router.push("/admin/orders");
      router.refresh();
    } catch {
      setError(NETWORK_ERROR_MESSAGE);
      submittingRef.current = false;
      setPending(false);
      inputRef.current?.focus();
    }
  }

  const describedBy = !isConfigured
    ? "admin-unconfigured-alert"
    : error
      ? "admin-login-error"
      : expired
        ? "admin-session-expired"
        : undefined;

  return (
    <div className="flex w-full max-w-[400px] flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div
        className="flex size-11 items-center justify-center rounded-xl bg-indigo-600 text-white"
        aria-hidden="true"
      >
        <Lock className="size-5" aria-hidden="true" />
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Đăng nhập quản trị
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Dành cho Nhân viên vận hành cửa hàng ShopLite.
        </p>
      </div>

      {!isConfigured && (
        <div
          id="admin-unconfigured-alert"
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-700"
        >
          Hệ thống chưa cấu hình mật khẩu quản trị (ADMIN_PASSCODE). Vui lòng
          thiết lập biến môi trường trên máy chủ trước khi truy cập.
        </div>
      )}

      {expired && isConfigured && !error && (
        <div
          id="admin-session-expired"
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-medium text-amber-800"
        >
          Phiên làm việc 8 giờ đã hết hạn. Vui lòng đăng nhập lại để tiếp tục xử
          lý đơn.
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div>
          <label
            htmlFor="admin-passcode"
            className="mb-1.5 block text-sm font-semibold text-slate-900"
          >
            Mật khẩu quản trị
          </label>
          <input
            ref={inputRef}
            id="admin-passcode"
            name="passcode"
            type="password"
            autoComplete="current-password"
            value={passcode}
            readOnly={pending}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            onChange={(event) => {
              setPasscode(event.target.value);
              if (error) {
                setError(null);
              }
            }}
            placeholder={
              isConfigured
                ? "Nhập mật khẩu quản trị"
                : "Tạm khóa khi chưa cấu hình"
            }
            disabled={!isConfigured}
            className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
          />
        </div>

        {isConfigured && error && (
          <div
            id="admin-login-error"
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-700"
          >
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={!isConfigured || pending}
          aria-busy={pending}
          className="min-h-11 w-full"
        >
          {pending ? "Đang đăng nhập…" : "Đăng nhập vận hành"}
        </Button>
      </form>
    </div>
  );
}
