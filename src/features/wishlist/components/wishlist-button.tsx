"use client";

import { Heart } from "lucide-react";
import { cn } from "@/lib/cn";
import { useWishlist } from "@/features/wishlist/use-wishlist";

interface WishlistButtonProps {
  productId: string;
  productName?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function WishlistButton({
  productId,
  productName,
  className,
  size = "md",
  showLabel = false,
}: WishlistButtonProps) {
  const { isWishlisted, toggleItem, hydrated } = useWishlist();
  const wishlisted = hydrated && isWishlisted(productId);

  const label = wishlisted
    ? productName
      ? `Xóa ${productName} khỏi danh sách yêu thích`
      : "Xóa khỏi danh sách yêu thích"
    : productName
      ? `Thêm ${productName} vào danh sách yêu thích`
      : "Thêm vào danh sách yêu thích";

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    const result = toggleItem(productId);
    if (!result.success && result.reason === "limit_reached") {
      alert("Danh sách yêu thích đã đầy (tối đa 50 sản phẩm).");
    }
  }

  const iconSizeClass =
    size === "sm" ? "size-4" : size === "lg" ? "size-6" : "size-5";

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={wishlisted}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center justify-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500",
        wishlisted
          ? "text-rose-600 hover:text-rose-700 bg-white/90 shadow-sm"
          : "text-slate-400 hover:text-rose-500 bg-white/90 shadow-sm",
        size === "sm" && "p-1.5",
        size === "md" && "p-2",
        size === "lg" && "p-2.5",
        showLabel &&
          "rounded-xl px-4 py-2 gap-2 font-medium text-sm shadow-none border border-slate-200",
        className,
      )}
    >
      <Heart
        className={cn(
          iconSizeClass,
          "transition-transform active:scale-125",
          wishlisted && "fill-current",
        )}
      />
      {showLabel && (
        <span className="text-sm font-medium text-slate-700">
          {wishlisted ? "Đã lưu vào yêu thích" : "Lưu vào yêu thích"}
        </span>
      )}
    </button>
  );
}
