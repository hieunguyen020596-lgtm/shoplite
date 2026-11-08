"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useWishlist } from "../use-wishlist";

export function WishlistBadge() {
  const { itemCount, hydrated } = useWishlist();

  const label =
    hydrated && itemCount > 0
      ? `Danh sách yêu thích (${itemCount} sản phẩm)`
      : "Danh sách yêu thích";

  return (
    <Link
      href="/wishlist"
      aria-label={label}
      data-testid="wishlist-badge"
      className="relative inline-flex size-10 items-center justify-center rounded-xl text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
    >
      <Heart className="size-5" />
      {hydrated && itemCount > 0 && (
        <span
          data-testid="wishlist-count"
          className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-sm"
        >
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      )}
    </Link>
  );
}
