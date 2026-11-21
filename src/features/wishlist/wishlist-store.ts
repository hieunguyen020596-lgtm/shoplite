import type { WishlistAction, WishlistState } from "./types";
import { EMPTY_WISHLIST, MAX_WISHLIST_ITEMS, wishlistReducer } from "./wishlist-reducer";

export const WISHLIST_STORAGE_KEY = "shoplite:wishlist";

type Listener = () => void;

let state: WishlistState | null = null;
const listeners = new Set<Listener>();

function isWishlistState(value: unknown): value is WishlistState {
  if (typeof value !== "object" || value === null) return false;
  const ids = (value as WishlistState).productIds;
  return (
    Array.isArray(ids) &&
    ids.length <= MAX_WISHLIST_ITEMS &&
    ids.every((id) => typeof id === "string") &&
    new Set(ids).size === ids.length
  );
}

function readFromStorage(): WishlistState {
  if (typeof window === "undefined") return EMPTY_WISHLIST;
  try {
    const raw = window.localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (!raw) return EMPTY_WISHLIST;
    const parsed: unknown = JSON.parse(raw);
    return isWishlistState(parsed) ? { productIds: parsed.productIds } : EMPTY_WISHLIST;
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

function emit(): void {
  for (const listener of listeners) listener();
}

/** Đồng bộ danh sách yêu thích giữa các tab trình duyệt. */
function handleStorageEvent(event: StorageEvent): void {
  // key === null nghĩa là localStorage bị xóa toàn bộ.
  if (event.key !== null && event.key !== WISHLIST_STORAGE_KEY) return;
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

  dispatch(action: WishlistAction): void {
    const next = wishlistReducer(getState(), action);
    if (next === state) return;
    state = next;
    writeToStorage(next);
    emit();
  },

  /** Chỉ dùng trong test: buộc đọc lại từ localStorage ở lần truy cập tiếp theo. */
  reset(): void {
    state = null;
  },
};
