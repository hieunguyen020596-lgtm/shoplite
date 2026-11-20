import {
  EMPTY_WISHLIST,
  MAX_WISHLIST_ITEMS,
  wishlistReducer,
} from "./wishlist-reducer";
import type { WishlistAction, WishlistState } from "./types";

export const WISHLIST_STORAGE_KEY = "shoplite:wishlist";

type Listener = () => void;

let state: WishlistState | null = null;
const listeners = new Set<Listener>();

export interface DispatchResult {
  success: boolean;
  reason?: "limit_reached";
}

function isWishlistState(value: unknown): value is WishlistState {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as WishlistState).productIds) &&
    (value as WishlistState).productIds.every((id) => typeof id === "string")
  );
}

function readFromStorage(): WishlistState {
  if (typeof window === "undefined") return EMPTY_WISHLIST;
  try {
    const raw = window.localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (!raw) return EMPTY_WISHLIST;
    const parsed: unknown = JSON.parse(raw);
    return isWishlistState(parsed) ? parsed : EMPTY_WISHLIST;
  } catch {
    return EMPTY_WISHLIST;
  }
}

function writeToStorage(next: WishlistState): void {
  try {
    window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage có thể bị chặn (chế độ ẩn danh) - wishlist vẫn hoạt động trong phiên hiện tại.
  }
}

function getState(): WishlistState {
  if (state === null) state = readFromStorage();
  return state;
}

function emit(): void {
  for (const listener of listeners) listener();
}

/** Đồng bộ danh sách yêu thích giữa các tab trình duyệt. */
function handleStorageEvent(event: StorageEvent): void {
  if (event.key !== WISHLIST_STORAGE_KEY) return;
  state = readFromStorage();
  emit();
}

/**
 * Store danh sách yêu thích phía client, lưu trong localStorage.
 * Dùng với React qua useSyncExternalStore (xem use-wishlist.ts).
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

  dispatch(action: WishlistAction): DispatchResult {
    const current = getState();
    const isAdding =
      action.type === "add" ||
      (action.type === "toggle" &&
        !current.productIds.includes(action.productId));

    if (isAdding && current.productIds.length >= MAX_WISHLIST_ITEMS) {
      return { success: false, reason: "limit_reached" };
    }

    const next = wishlistReducer(current, action);
    if (next === state) return { success: true };
    state = next;
    writeToStorage(next);
    emit();
    return { success: true };
  },

  /** Chỉ dùng trong test: buộc đọc lại từ localStorage ở lần truy cập tiếp theo. */
  reset(): void {
    state = null;
  },
};
