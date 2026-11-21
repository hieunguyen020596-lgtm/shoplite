"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Footer } from "./footer";
import { Header } from "./header";

export function StorefrontChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute =
    pathname === "/admin" || (pathname?.startsWith("/admin/") ?? false);

  if (isAdminRoute) {
    return <div className="flex min-h-full flex-1 flex-col">{children}</div>;
  }

  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
