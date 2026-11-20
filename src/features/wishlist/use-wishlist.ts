import { useMemo, useSyncExternalStore } from "react";
import { useHydrated } from "@/lib/use-hydrated";
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
      /** false trong lần render đầu (chưa đọc localStorage) - dùng để hiển thị skeleton. */
      hydrated,
      isInWishlist: (productId: string) => wishlist.productIds.includes(productId),
      toggle: (productId: string, knownIds?: ReadonlySet<string>) =>
        wishlistStore.toggle(productId, knownIds),
      remove: (productId: string) => wishlistStore.remove(productId),
    }),
    [wishlist, hydrated],
  );
}
