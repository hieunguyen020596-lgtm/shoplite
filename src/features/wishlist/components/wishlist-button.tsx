"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Heart } from "lucide-react";
import type { Product } from "@/features/catalog/types";
import { cn } from "@/lib/cn";
import { useWishlist } from "../use-wishlist";
import { MAX_WISHLIST_ITEMS } from "../wishlist-reducer";

interface WishlistButtonProps {
  product: Pick<Product, "id" | "name">;
  /** Id các sản phẩm còn trong catalog (do Server Component truyền) - dùng để dọn id cũ khi danh sách đầy. */
  knownIds?: readonly string[];
  /** "overlay": nút tròn trên ảnh thẻ sản phẩm; "inline": nút có chữ ở trang chi tiết. */
  variant?: "overlay" | "inline";
  className?: string;
}

const FULL_MESSAGE = `Danh sách yêu thích đã đầy (tối đa ${MAX_WISHLIST_ITEMS} sản phẩm)`;
const MESSAGE_DURATION_MS = 4000;

export function WishlistButton({
  product,
  knownIds,
  variant = "overlay",
  className,
}: WishlistButtonProps) {
  const { hydrated, isInWishlist, toggle } = useWishlist();
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const knownSet = useMemo(() => (knownIds ? new Set(knownIds) : undefined), [knownIds]);

  useEffect(() => () => clearTimeout(timer.current), []);

  // Trước khi đọc localStorage luôn hiển thị "chưa thích" để khớp HTML server.
  const liked = hydrated && isInWishlist(product.id);

  function handleClick() {
    const result = toggle(product.id, knownSet);
    clearTimeout(timer.current);
    if (result === "full") {
      setMessage(FULL_MESSAGE);
      timer.current = setTimeout(() => setMessage(""), MESSAGE_DURATION_MS);
    } else {
      setMessage("");
    }
  }

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={liked}
        // Nhãn cố định, trạng thái truyền qua aria-pressed (mẫu toggle button của WAI-ARIA).
        aria-label={`Yêu thích ${product.name}`}
        className={cn(
          "inline-flex items-center justify-center transition-colors",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500",
          variant === "overlay"
            ? "size-9 rounded-full bg-white/90 shadow-sm ring-1 ring-slate-200 hover:bg-white"
            : "h-12 gap-2 rounded-xl bg-white px-4 text-sm font-semibold ring-1 ring-slate-300 ring-inset hover:bg-slate-50",
          liked ? "text-rose-600" : "text-slate-600 hover:text-rose-600",
        )}
      >
        <Heart className={cn("size-5", liked && "fill-current")} aria-hidden />
        {variant === "inline" && <span aria-hidden>{liked ? "Đã thích" : "Yêu thích"}</span>}
      </button>
      {/* Vùng live luôn có trong DOM để screen reader đọc được thông báo khi nội dung thay đổi. */}
      <p
        role="status"
        className={cn(
          "absolute top-full right-0 z-10 mt-1 w-56 rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg",
          !message && "sr-only",
        )}
      >
        {message}
      </p>
    </div>
  );
}
