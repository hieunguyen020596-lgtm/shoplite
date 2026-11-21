import type { Metadata } from "next";
import { isAdminConfigured } from "@/features/orders/admin-auth";
import { AdminLoginCard } from "@/features/orders/components/admin-login-card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Đăng nhập quản trị",
};

export default async function AdminLoginPage({
  searchParams,
}: PageProps<"/admin/login">) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const rawExpired = resolvedSearchParams.expired;
  const expired = Array.isArray(rawExpired) ? rawExpired[0] : rawExpired;
  const configured = isAdminConfigured();

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center bg-slate-50 px-4 py-12">
      <AdminLoginCard configured={configured} expired={expired === "1"} />
    </div>
  );
}
