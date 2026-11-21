"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { AddToCartButton } from "@/features/cart/components/add-to-cart-button";
import { ProductImage } from "@/features/catalog/components/product-image";
import type { Product } from "@/features/catalog/types";
import { formatCurrency } from "@/lib/format";

interface WishlistItemRowProps {
  product: Product;
  onRemove: () => void;
}

export function WishlistItemRow({ product, onRemove }: WishlistItemRowProps) {
  return (
    <li
      className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between"
      data-testid="wishlist-item"
    >
      <div className="flex items-center gap-4">
        <Link
          href={`/products/${product.slug}`}
          className="w-20 shrink-0 sm:w-24"
        >
          <ProductImage image={product.image} alt={product.name} size="sm" />
        </Link>
        <div>
          <Link
            href={`/products/${product.slug}`}
            className="font-semibold text-slate-900 hover:text-rose-600 transition-colors"
          >
            {product.name}
          </Link>
          <p className="mt-1 font-medium text-slate-800">
            {formatCurrency(product.price)}
          </p>
          {product.stock <= 0 && (
            <span className="mt-1 inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              Hết hàng
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 self-end sm:self-center">
        <AddToCartButton product={product} size="sm" />
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Xóa ${product.name} khỏi danh sách yêu thích`}
          className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </li>
  );
}
