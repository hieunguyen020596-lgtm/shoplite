"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useWishlist } from "@/features/wishlist/use-wishlist";

export function WishlistBadge() {
  const { itemCount, hydrated } = useWishlist();
  const showCount = hydrated && itemCount > 0;

  return (
    <Link
      href="/wishlist"
      className="relative flex size-10 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100"
      aria-label={
        showCount
          ? `Danh sách yêu thích (${itemCount} sản phẩm)`
          : "Danh sách yêu thích"
      }
    >
      <Heart className="size-5" />
      {showCount && (
        <span
          className="absolute -top-0.5 -right-0.5 flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-xs font-bold text-white"
          data-testid="wishlist-count"
        >
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      )}
    </Link>
  );
}
