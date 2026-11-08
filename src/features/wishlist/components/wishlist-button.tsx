"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/cn";
import { useWishlist } from "../use-wishlist";

interface WishlistButtonProps {
  productId: string;
  productName: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  showText?: boolean;
}

export function WishlistButton({
  productId,
  productName,
  size = "md",
  className,
  showText = false,
}: WishlistButtonProps) {
  const { hasItem, toggleItem, isFull, hydrated } = useWishlist();
  const [fullWarning, setFullWarning] = useState(false);

  const active = hydrated && hasItem(productId);

  const sizeClasses = {
    sm: "size-8 text-xs",
    md: "size-10 text-sm",
    lg: "h-11 px-4 text-sm gap-2",
  };

  const iconSizes = {
    sm: "size-4",
    md: "size-5",
    lg: "size-5",
  };

  function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (!active && isFull) {
      setFullWarning(true);
      setTimeout(() => setFullWarning(false), 3000);
      return;
    }

    setFullWarning(false);
    toggleItem(productId);
  }

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={active}
        aria-label={
          active
            ? `Bỏ thích ${productName}`
            : `Thêm ${productName} vào danh sách yêu thích`
        }
        title={
          active
            ? `Bỏ thích ${productName}`
            : `Thêm ${productName} vào danh sách yêu thích`
        }
        className={cn(
          "relative inline-flex items-center justify-center rounded-xl font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500",
          sizeClasses[size],
          active
            ? "bg-rose-50 text-rose-600 hover:bg-rose-100"
            : "bg-white/90 text-slate-500 shadow-sm ring-1 ring-slate-200/80 hover:bg-rose-50 hover:text-rose-600 hover:ring-rose-200",
          className,
        )}
      >
        <Heart
          className={cn(
            iconSizes[size],
            "transition-transform active:scale-125",
            active ? "fill-rose-500 text-rose-500" : "fill-transparent",
          )}
        />
        {showText && (
          <span>{active ? "Đã lưu vào yêu thích" : "Lưu vào yêu thích"}</span>
        )}
      </button>

      {fullWarning && (
        <span
          role="status"
          className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white shadow-lg animate-in fade-in zoom-in-95 z-30"
        >
          Danh sách đã đầy (tối đa 50 sản phẩm)
        </span>
      )}
    </div>
  );
}
