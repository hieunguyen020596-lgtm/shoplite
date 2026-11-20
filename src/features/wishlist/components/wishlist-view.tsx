"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PriceTag } from "@/components/ui/price-tag";
import { AddToCartButton } from "@/features/cart/components/add-to-cart-button";
import { ProductImage } from "@/features/catalog/components/product-image";
import { StockBadge } from "@/features/catalog/components/stock-badge";
import type { Product } from "@/features/catalog/types";
import { useWishlist } from "../use-wishlist";
import { WishlistButton } from "./wishlist-button";

/**
 * Danh sách yêu thích. Nhận toàn bộ catalog từ server để giá và tồn kho luôn là số liệu mới nhất;
 * localStorage chỉ giữ mã sản phẩm.
 */
export function WishlistView({ products }: { products: Product[] }) {
  const { productIds, hydrated, prune } = useWishlist();

  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );
  const items = productIds.flatMap((id) => productById.get(id) ?? []);
  const hasUnknownIds = items.length !== productIds.length;

  // Loại mã không còn trong catalog để badge header khớp với danh sách hiển thị.
  useEffect(() => {
    if (hydrated && hasUnknownIds) prune([...productById.keys()]);
  }, [hydrated, hasUnknownIds, productById, prune]);

  if (!hydrated) {
    return <div className="h-64 animate-pulse rounded-2xl bg-slate-200/60" aria-busy />;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        emoji="🤍"
        title="Danh sách yêu thích đang trống"
        description="Bấm biểu tượng trái tim trên sản phẩm để lưu lại và quay lại mua sau."
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
      <p className="border-b border-slate-100 py-4 text-sm text-slate-600">
        {items.length} sản phẩm
      </p>
      <ul className="divide-y divide-slate-100">
        {items.map((product) => (
          <li
            key={product.id}
            className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center"
            data-testid="wishlist-item"
          >
            <div className="flex flex-1 items-center gap-4">
              <Link
                href={`/products/${product.slug}`}
                tabIndex={-1}
                aria-hidden
                className="shrink-0"
              >
                <ProductImage
                  image={product.image}
                  alt={product.name}
                  size="sm"
                  className="size-20"
                />
              </Link>
              <div className="flex flex-col gap-1">
                <Link
                  href={`/products/${product.slug}`}
                  className="font-semibold text-slate-900 hover:text-indigo-600"
                >
                  {product.name}
                </Link>
                <PriceTag price={product.price} originalPrice={product.originalPrice} />
                <StockBadge product={product} />
              </div>
            </div>
            <div className="flex items-start gap-2">
              <AddToCartButton product={product} size="sm" />
              <WishlistButton product={product} variant="full" />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
