"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Heart } from "lucide-react";
import { useWishlist } from "../use-wishlist";

interface WishlistBadgeProps {
  /** Id các sản phẩm còn trong catalog, do Header (Server Component) truyền vào. */
  knownProductIds: readonly string[];
}

export function WishlistBadge({ knownProductIds }: WishlistBadgeProps) {
  const { productIds, hydrated } = useWishlist();
  const known = useMemo(() => new Set(knownProductIds), [knownProductIds]);
  const count = productIds.filter((id) => known.has(id)).length;
  const showCount = hydrated && count > 0;

  return (
    <Link
      href="/wishlist"
      className="relative flex size-10 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100"
      aria-label={showCount ? `Yêu thích (${count} sản phẩm)` : "Yêu thích"}
    >
      <Heart className="size-5" />
      {showCount && (
        <span
          className="absolute -top-0.5 -right-0.5 flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-xs font-bold text-white"
          data-testid="wishlist-count"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
