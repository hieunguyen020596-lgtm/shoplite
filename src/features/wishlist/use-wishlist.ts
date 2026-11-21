import { useMemo, useSyncExternalStore } from "react";
import { getProductById } from "@/features/catalog/catalog-service";
import { useHydrated } from "@/lib/use-hydrated";
import type { WishlistToggleResult } from "./types";
import { getToggleResult } from "./wishlist-reducer";
import { wishlistStore } from "./wishlist-store";

export function useWishlist() {
  const wishlist = useSyncExternalStore(
    wishlistStore.subscribe,
    wishlistStore.getSnapshot,
    wishlistStore.getServerSnapshot,
  );
  const hydrated = useHydrated();

  return useMemo(() => {
    // Bỏ qua mã sản phẩm không còn trong catalog (không xóa khỏi localStorage).
    const productIds = wishlist.productIds.filter((id) => getProductById(id) !== undefined);

    return {
      productIds,
      count: productIds.length,
      /** false trong lần render đầu (chưa đọc localStorage) - dùng để hiển thị skeleton. */
      hydrated,
      has: (productId: string) => productIds.includes(productId),
      /** Bấm trái tim; trả về "full" khi danh sách đã đủ 50 và sản phẩm chưa có trong đó. */
      toggle: (productId: string): WishlistToggleResult => {
        const result = getToggleResult(wishlistStore.getSnapshot(), productId);
        wishlistStore.dispatch({ type: "toggle", productId });
        return result;
      },
      remove: (productId: string) => wishlistStore.dispatch({ type: "remove", productId }),
    };
  }, [wishlist, hydrated]);
}
