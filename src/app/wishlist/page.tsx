"use client";

import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { products } from "@/data/products";
import { WishlistItemRow } from "@/features/wishlist/components/wishlist-item-row";
import { useWishlist } from "@/features/wishlist/use-wishlist";

export default function WishlistPage() {
  const { items, removeItem, clear, hydrated } = useWishlist();

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-4xl py-12 px-4 sm:px-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200/80 mb-6" />
        <div className="h-64 animate-pulse rounded-2xl bg-slate-200/50" />
      </div>
    );
  }

  // Tra cứu sản phẩm từ danh mục, tự động lọc bỏ ID không tồn tại
  const productMap = new Map(products.map((p) => [p.id, p]));
  const savedProducts = items
    .map((id) => productMap.get(id))
    .filter((p): p is NonNullable<typeof p> => p !== undefined);

  if (savedProducts.length === 0) {
    return (
      <div className="mx-auto max-w-4xl py-12 px-4 sm:px-6">
        <EmptyState
          emoji="💖"
          title="Danh sách yêu thích trống"
          description="Bạn chưa lưu sản phẩm nào. Hãy khám phá các sản phẩm công nghệ nổi bật và lưu lại để mua sắm sau nhé!"
          action={
            <Link href="/products" className={buttonStyles()}>
              Khám phá sản phẩm
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl py-8 px-4 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Danh sách yêu thích
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {savedProducts.length} sản phẩm đã được lưu lại
          </p>
        </div>
        <button
          type="button"
          onClick={clear}
          className="text-sm font-medium text-slate-500 hover:text-rose-600 transition-colors"
        >
          Xóa tất cả
        </button>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <ul className="divide-y divide-slate-100" data-testid="wishlist-list">
          {savedProducts.map((product) => (
            <WishlistItemRow
              key={product.id}
              product={product}
              onRemove={() => removeItem(product.id)}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}
