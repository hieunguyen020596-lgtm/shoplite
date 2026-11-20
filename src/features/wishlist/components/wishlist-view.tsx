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
  const { productIds, hydrated, removeItem, clear } = useWishlist();

  if (!hydrated) {
    return (
      <div
        className="h-64 animate-pulse rounded-2xl bg-slate-200/60"
        aria-busy
      />
    );
  }

  // Tra cứu dữ liệu sản phẩm mới nhất từ catalog, bỏ qua các id không còn tồn tại
  const products = productIds
    .map((id) => getProductById(id))
    .filter((product): product is Product => product !== undefined);

  if (products.length === 0) {
    return (
      <EmptyState
        emoji="❤️"
        title="Danh sách yêu thích của bạn đang trống"
        description="Hãy khám phá các sản phẩm công nghệ tuyệt vời và lưu lại những món đồ bạn yêu thích."
        action={
          <Link href="/products" className={buttonStyles()}>
            Khám phá sản phẩm
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6" data-testid="wishlist-view">
      <section className="rounded-2xl bg-white px-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 py-4">
          <p className="text-sm font-medium text-slate-600">
            {products.length} sản phẩm yêu thích
          </p>
          <button
            type="button"
            onClick={clear}
            className="text-sm font-medium text-rose-600 hover:underline"
          >
            Xóa tất cả
          </button>
        </div>
        <ul className="divide-y divide-slate-100">
          {products.map((product) => {
            const isOutOfStock = product.stock <= 0;
            return (
              <li
                key={product.id}
                className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                data-testid="wishlist-item"
              >
                <div className="flex items-center gap-4">
                  <Link
                    href={`/products/${product.slug}`}
                    className="w-20 shrink-0 sm:w-24"
                  >
                    <ProductImage
                      image={product.image}
                      alt={product.name}
                      size="sm"
                    />
                  </Link>
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-medium tracking-wide text-indigo-600 uppercase">
                      {product.brand}
                    </p>
                    <Link
                      href={`/products/${product.slug}`}
                      className="font-semibold text-slate-900 hover:text-indigo-600"
                    >
                      {product.name}
                    </Link>
                    <div className="flex items-center gap-2">
                      <PriceTag
                        price={product.price}
                        originalPrice={product.originalPrice}
                      />
                      {isOutOfStock && <StockBadge product={product} />}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <AddToCartButton product={product} size="sm" />
                  <button
                    type="button"
                    onClick={() => removeItem(product.id)}
                    aria-label={`Xóa ${product.name} khỏi danh sách yêu thích`}
                    title="Bỏ thích"
                    className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
