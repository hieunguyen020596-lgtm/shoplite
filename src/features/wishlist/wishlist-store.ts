import type { WishlistState, WishlistToggleResult } from "./types";
import {
  EMPTY_WISHLIST,
  removeFromWishlist,
  sanitizeWishlist,
  toggleWishlist,
} from "./wishlist-reducer";

export const WISHLIST_STORAGE_KEY = "shoplite:wishlist";

type Listener = () => void;

let state: WishlistState | null = null;
const listeners = new Set<Listener>();

function readFromStorage(): WishlistState {
  if (typeof window === "undefined") return EMPTY_WISHLIST;
  try {
    const raw = window.localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (!raw) return EMPTY_WISHLIST;
    return sanitizeWishlist(JSON.parse(raw));
  } catch {
    return EMPTY_WISHLIST;
  }
}

function writeToStorage(next: WishlistState): void {
  try {
    window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage có thể bị chặn (chế độ ẩn danh) - danh sách vẫn hoạt động trong phiên hiện tại.
  }
}

function getState(): WishlistState {
  if (state === null) state = readFromStorage();
  return state;
}

function commit(next: WishlistState): void {
  if (next === getState()) return;
  state = next;
  writeToStorage(next);
  for (const listener of listeners) listener();
}

/** Đồng bộ danh sách yêu thích giữa các tab trình duyệt. */
function handleStorageEvent(event: StorageEvent): void {
  if (event.key !== WISHLIST_STORAGE_KEY) return;
  state = readFromStorage();
  for (const listener of listeners) listener();
}

/**
 * Store danh sách yêu thích phía client, lưu trong localStorage.
 * Cùng cấu trúc với cartStore; dùng với React qua useSyncExternalStore (xem use-wishlist.ts).
 */
export const wishlistStore = {
  getSnapshot(): WishlistState {
    return getState();
  },

  getServerSnapshot(): WishlistState {
    return EMPTY_WISHLIST;
  },

  subscribe(listener: Listener): () => void {
    if (listeners.size === 0 && typeof window !== "undefined") {
      window.addEventListener("storage", handleStorageEvent);
    }
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0 && typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorageEvent);
      }
    };
  },

  /** Thích / bỏ thích; trả về "full" khi danh sách đã đủ MAX_WISHLIST_ITEMS. */
  toggle(productId: string, knownIds?: ReadonlySet<string>): WishlistToggleResult {
    const { state: next, result } = toggleWishlist(getState(), productId, knownIds);
    commit(next);
    return result;
  },

  remove(productId: string): void {
    commit(removeFromWishlist(getState(), productId));
  },

  /** Chỉ dùng trong test: buộc đọc lại từ localStorage ở lần truy cập tiếp theo. */
  reset(): void {
    state = null;
  },
};
