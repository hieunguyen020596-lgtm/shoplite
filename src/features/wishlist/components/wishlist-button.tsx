"use client";

import { useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import type { Product } from "@/features/catalog/types";
import { cn } from "@/lib/cn";
import { useWishlist } from "../use-wishlist";
import { WISHLIST_MAX_ITEMS } from "../wishlist-reducer";

export const WISHLIST_FULL_MESSAGE = `Danh sách yêu thích đã đầy (tối đa ${WISHLIST_MAX_ITEMS} sản phẩm)`;

interface WishlistButtonProps {
  product: Pick<Product, "id" | "name">;
  /** `icon`: nút tròn trên thẻ sản phẩm; `full`: nút có chữ ở trang chi tiết / trang wishlist. */
  variant?: "icon" | "full";
  className?: string;
}

/** Nút trái tim thêm/bỏ sản phẩm khỏi danh sách yêu thích. Không được đặt bên trong <a>. */
export function WishlistButton({ product, variant = "icon", className }: WishlistButtonProps) {
  const { hydrated, isWishlisted, toggle } = useWishlist();
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  // Trước khi hydrate luôn hiển thị "chưa thích" để khớp với HTML render ở server.
  const liked = hydrated && isWishlisted(product.id);
  const label = liked
    ? `Bỏ ${product.name} khỏi danh sách yêu thích`
    : `Thêm ${product.name} vào danh sách yêu thích`;

  function handleClick() {
    const result = toggle(product.id);
    clearTimeout(timer.current);
    if (result === "full") {
      setMessage(WISHLIST_FULL_MESSAGE);
      timer.current = setTimeout(() => setMessage(""), 3000);
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
        aria-label={label}
        title={label}
        className={
          variant === "icon"
            ? cn(
                "flex size-10 items-center justify-center rounded-full bg-white/90 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-white",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600",
                liked ? "text-rose-600" : "text-slate-500 hover:text-rose-600",
              )
            : buttonStyles({
                variant: "secondary",
                className: liked ? "text-rose-600" : undefined,
              })
        }
      >
        <Heart className={cn("size-5", liked && "fill-current")} aria-hidden />
        {variant === "full" && (liked ? "Đã thích" : "Yêu thích")}
      </button>
      {/* Vùng live luôn có sẵn trong DOM để screen reader đọc được khi nội dung thay đổi. */}
      <span
        role="status"
        className={variant === "icon" ? "absolute top-full right-0 z-20 mt-1" : ""}
      >
        {message && (
          <span
            className={cn(
              "block text-xs font-medium",
              variant === "icon"
                ? "w-48 rounded-lg bg-slate-900 px-2 py-1.5 text-white shadow-md"
                : "mt-2 text-rose-700",
            )}
          >
            {message}
          </span>
        )}
      </span>
    </div>
  );
}
