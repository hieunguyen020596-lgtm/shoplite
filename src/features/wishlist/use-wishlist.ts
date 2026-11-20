import { useMemo, useSyncExternalStore } from "react";
import { useHydrated } from "@/lib/use-hydrated";
import type { ToggleResult } from "./types";
import { getToggleResult, getWishlistCount, isInWishlist } from "./wishlist-reducer";
import { wishlistStore } from "./wishlist-store";

/** Tính kết quả từ state mới nhất trong store (không dùng state lúc render, có thể đã cũ). */
function toggle(productId: string): ToggleResult {
  const result = getToggleResult(wishlistStore.getSnapshot(), productId);
  wishlistStore.dispatch({ type: "toggle", productId });
  return result;
}

const actions = {
  toggle,
  remove: (productId: string) => wishlistStore.dispatch({ type: "remove", productId }),
  prune: (knownIds: readonly string[]) => wishlistStore.dispatch({ type: "prune", knownIds }),
};

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
      count: getWishlistCount(wishlist),
      /** false trong lần render đầu (chưa đọc localStorage). */
      hydrated,
      isWishlisted: (productId: string) => isInWishlist(wishlist, productId),
      ...actions,
    }),
    [wishlist, hydrated],
  );
}
