import Link from "next/link";
import { Store } from "lucide-react";
import { StaffLogoutButton } from "@/features/auth/components/staff-logout-button";

export function StaffHeader({ displayName }: { displayName: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-14 max-w-4xl items-center gap-3 px-4">
        <Link
          href="/staff"
          className="flex items-center gap-2"
          aria-label="ShopLite - Nhân viên"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <Store className="size-5" />
          </span>
          <span className="text-sm font-semibold text-slate-500">
            Nhân viên
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-sm text-slate-700 sm:inline">
            {displayName}
          </span>
          <StaffLogoutButton />
        </div>
      </div>
    </header>
  );
}
