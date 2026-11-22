import type { Metadata } from "next";
import { Store } from "lucide-react";
import { LoginForm } from "@/features/auth/components/login-form";
import { safeStaffNext } from "@/features/auth/next-path";

export const metadata: Metadata = { title: "Đăng nhập nhân viên" };

export default async function StaffLoginPage({
  searchParams,
}: PageProps<"/staff/login">) {
  const { next } = await searchParams;
  const target = safeStaffNext(Array.isArray(next) ? next[0] : next);

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 px-4 py-12">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
          <Store className="size-6" />
        </span>
        <h1 className="text-2xl font-bold">Đăng nhập nhân viên</h1>
      </div>
      <LoginForm next={target} />
    </div>
  );
}
