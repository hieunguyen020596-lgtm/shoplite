import { useMemo, useSyncExternalStore } from "react";
import { useHydrated } from "@/lib/use-hydrated";
import {
  getWishlistItemCount,
  isWishlisted,
  MAX_WISHLIST_ITEMS,
} from "./wishlist-reducer";
import { wishlistStore } from "./wishlist-store";

export function useWishlist() {
  const wishlist = useSyncExternalStore(
    wishlistStore.subscribe,
    wishlistStore.getSnapshot,
    wishlistStore.getServerSnapshot,
  );
  const hydrated = useHydrated();

  return useMemo(
    () => ({
      productIds: wishlist.productIds,
      itemCount: getWishlistItemCount(wishlist),
      /** false trong lần render đầu (chưa đọc localStorage) - dùng để tránh nháy giao diện. */
      hydrated,
      isWishlisted: (productId: string) => isWishlisted(wishlist, productId),
      isFull: wishlist.productIds.length >= MAX_WISHLIST_ITEMS,
      toggleItem: (productId: string) =>
        wishlistStore.dispatch({ type: "toggle", productId }),
      addItem: (productId: string) =>
        wishlistStore.dispatch({ type: "add", productId }),
      removeItem: (productId: string) =>
        wishlistStore.dispatch({ type: "remove", productId }),
      clear: () => wishlistStore.dispatch({ type: "clear" }),
    }),
    [wishlist, hydrated],
  );
}
