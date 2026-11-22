"use client";

import { usePathname } from "next/navigation";
import { Header } from "./header";

/** Header của khách; khu vực /staff có header riêng nên không hiển thị ở đó. */
export function SiteHeader() {
  const pathname = usePathname();
  if (pathname === "/staff" || pathname.startsWith("/staff/")) return null;
  return <Header />;
}
