"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PriceTag } from "@/components/ui/price-tag";
import { AddToCartButton } from "@/features/cart/components/add-to-cart-button";
import { getProductById } from "@/features/catalog/catalog-service";
import { ProductImage } from "@/features/catalog/components/product-image";
import { StockBadge } from "@/features/catalog/components/stock-badge";
import type { Product } from "@/features/catalog/types";
import { useWishlist } from "@/features/wishlist/use-wishlist";

export function WishlistView() {
  const { productIds, count, hydrated, remove } = useWishlist();

  if (!hydrated) {
    return <div className="h-64 animate-pulse rounded-2xl bg-slate-200/60" aria-busy />;
  }

  // Giá và tồn kho luôn lấy từ catalog hiện tại (wishlist chỉ lưu mã sản phẩm).
  const products = productIds
    .map((id) => getProductById(id))
    .filter((product): product is Product => product !== undefined);

  if (products.length === 0) {
    return (
      <EmptyState
        emoji="💝"
        title="Danh sách yêu thích đang trống"
        description="Bấm biểu tượng trái tim trên sản phẩm bạn thích để lưu lại và quay lại mua sau."
        action={
          <Link href="/products" className={buttonStyles()}>
            Khám phá sản phẩm
          </Link>
        }
      />
    );
  }

  return (
    <section className="rounded-2xl bg-white px-5 shadow-sm ring-1 ring-slate-200">
      <p className="border-b border-slate-100 py-4 text-sm text-slate-600">{count} sản phẩm</p>
      <ul className="divide-y divide-slate-100">
        {products.map((product) => (
          <li
            key={product.id}
            className="flex flex-wrap items-center gap-4 py-4"
            data-testid="wishlist-item"
          >
            <Link
              href={`/products/${product.slug}`}
              className="w-20 shrink-0"
              tabIndex={-1}
              aria-hidden
            >
              <ProductImage image={product.image} alt={product.name} />
            </Link>
            <div className="flex min-w-48 flex-1 flex-col gap-1">
              <Link
                href={`/products/${product.slug}`}
                className="font-semibold text-slate-900 hover:text-indigo-600"
              >
                {product.name}
              </Link>
              <PriceTag price={product.price} originalPrice={product.originalPrice} />
              <div>
                <StockBadge product={product} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AddToCartButton product={product} size="sm" />
              <button
                type="button"
                onClick={() => remove(product.id)}
                aria-label={`Bỏ ${product.name} khỏi danh sách yêu thích`}
                className="flex size-8 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-rose-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
