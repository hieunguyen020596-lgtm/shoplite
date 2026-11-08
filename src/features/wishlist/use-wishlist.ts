import { useMemo, useSyncExternalStore } from "react";
import { useHydrated } from "@/lib/use-hydrated";
import { MAX_WISHLIST_ITEMS } from "./types";
import { isInWishlist } from "./wishlist-reducer";
import { wishlistStore } from "./wishlist-store";

/**
 * Hook truy xuất và tương tác với Danh sách yêu thích.
 * Tự động đồng bộ với store và ngăn hydration mismatch.
 */
export function useWishlist() {
  const wishlist = useSyncExternalStore(
    wishlistStore.subscribe,
    wishlistStore.getSnapshot,
    wishlistStore.getServerSnapshot,
  );
  const hydrated = useHydrated();

  return useMemo(
    () => ({
      items: wishlist.productIds,
      itemCount: wishlist.productIds.length,
      isFull: wishlist.productIds.length >= MAX_WISHLIST_ITEMS,
      hydrated,
      hasItem: (productId: string) => isInWishlist(wishlist, productId),
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
