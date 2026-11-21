"use client";

import { useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";
import type { Product } from "@/features/catalog/types";
import { cn } from "@/lib/cn";
import { MAX_WISHLIST_ITEMS } from "@/features/wishlist/wishlist-reducer";
import { useWishlist } from "@/features/wishlist/use-wishlist";

interface WishlistButtonProps {
  product: Pick<Product, "id" | "name">;
  /** Class cho phần tử bao ngoài (dùng để định vị, ví dụ đặt lên góc ảnh). */
  className?: string;
}

const FULL_MESSAGE_MS = 3000;

/** Nút trái tim thêm/bỏ sản phẩm khỏi danh sách yêu thích. */
export function WishlistButton({ product, className }: WishlistButtonProps) {
  const { has, toggle, hydrated } = useWishlist();
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const pressed = hydrated && has(product.id);

  function handleClick() {
    const result = toggle(product.id);
    clearTimeout(timer.current);
    if (result === "full") {
      setMessage(`Danh sách yêu thích đã đầy (tối đa ${MAX_WISHLIST_ITEMS} sản phẩm).`);
      timer.current = setTimeout(() => setMessage(""), FULL_MESSAGE_MS);
    } else {
      setMessage("");
    }
  }

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={handleClick}
        disabled={!hydrated}
        aria-pressed={pressed}
        aria-label={
          pressed
            ? `Bỏ ${product.name} khỏi danh sách yêu thích`
            : `Thêm ${product.name} vào danh sách yêu thích`
        }
        className={cn(
          "flex size-9 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-sm ring-1 ring-slate-200 transition",
          "hover:bg-white hover:text-rose-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600",
          "disabled:opacity-60",
          pressed && "text-rose-600",
        )}
      >
        <Heart className={cn("size-5", pressed && "fill-rose-600")} aria-hidden />
      </button>
      <span
        role="status"
        className={cn(
          message &&
            "absolute top-full right-0 z-10 mt-2 w-56 rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg",
        )}
      >
        {message}
      </span>
    </div>
  );
}
