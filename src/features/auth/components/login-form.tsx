"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import type { ApiErrorBody } from "@/lib/http";

const INVALID_MESSAGE = "Tên đăng nhập hoặc mật khẩu không đúng";

/** `next` đã được server làm sạch bằng safeStaffNext. */
export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      if (response.ok) {
        router.push(next);
        router.refresh();
        return;
      }

      const body = (await response
        .json()
        .catch(() => null)) as ApiErrorBody | null;
      const invalid = response.status === 400 || response.status === 401;
      setError(
        invalid ? INVALID_MESSAGE : (body?.error.message ?? INVALID_MESSAGE),
      );
    } catch {
      setError("Không kết nối được máy chủ, vui lòng thử lại.");
    }
    setPassword("");
    setSubmitting(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
    >
      <Field label="Tên đăng nhập" name="username">
        <input
          id="username"
          name="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          className={cn(inputClass, "ring-slate-300")}
        />
      </Field>
      <Field label="Mật khẩu" name="password">
        <input
          id="password"
          name="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          className={cn(inputClass, "ring-slate-300")}
        />
      </Field>
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          {error}
        </p>
      )}
      <Button
        type="submit"
        size="lg"
        disabled={submitting}
        className="min-h-11"
      >
        {submitting ? "Đang đăng nhập…" : "Đăng nhập"}
      </Button>
    </form>
  );
}
