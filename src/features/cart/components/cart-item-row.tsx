"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { QuantityInput } from "@/components/ui/quantity-input";
import { ProductImage } from "@/features/catalog/components/product-image";
import {
  getMaxQuantity,
  MAX_QUANTITY_PER_ITEM,
} from "@/features/cart/cart-reducer";
import type { CartItem } from "@/features/cart/types";
import { formatCurrency } from "@/lib/format";

interface CartItemRowProps {
  item: CartItem;
  /** Tồn kho đọc từ /api/inventory; undefined khi chưa biết hoặc tải lỗi (giới hạn 10). */
  stock?: number;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
}

export function CartItemRow({
  item,
  stock,
  onQuantityChange,
  onRemove,
}: CartItemRowProps) {
  return (
    <li className="flex gap-4 py-4" data-testid="cart-item">
      <Link href={`/products/${item.slug}`} className="w-20 shrink-0 sm:w-24">
        <ProductImage image={item.image} alt={item.name} size="sm" />
      </Link>
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href={`/products/${item.slug}`}
            className="font-semibold text-slate-900 hover:text-indigo-600"
          >
            {item.name}
          </Link>
          <p className="text-sm text-slate-500">{formatCurrency(item.price)}</p>
        </div>
        <div className="flex items-center gap-4">
          <QuantityInput
            value={item.quantity}
            max={Math.max(
              item.quantity,
              stock === undefined
                ? MAX_QUANTITY_PER_ITEM
                : getMaxQuantity(stock),
            )}
            onChange={onQuantityChange}
            label={`Số lượng ${item.name}`}
          />
          <p className="w-28 text-right font-semibold text-slate-900">
            {formatCurrency(item.price * item.quantity)}
          </p>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Xóa ${item.name} khỏi giỏ hàng`}
            className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
    </li>
  );
}
