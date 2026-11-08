import {
  WISHLIST_STORAGE_KEY,
  type WishlistAction,
  type WishlistState,
} from "./types";
import { EMPTY_WISHLIST, wishlistReducer } from "./wishlist-reducer";

type Listener = () => void;

let state: WishlistState | null = null;
const listeners = new Set<Listener>();

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
    if (isWishlistState(parsed)) {
      return parsed;
    }
    // Hỗ trợ trường hợp lưu mảng string thô: ["p001", "p002"]
    if (Array.isArray(parsed) && parsed.every((id) => typeof id === "string")) {
      return { productIds: parsed };
    }
    return EMPTY_WISHLIST;
  } catch {
    return EMPTY_WISHLIST;
  }
}

function writeToStorage(next: WishlistState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Chế độ ẩn danh hoặc localStorage bị vô hiệu hóa
  }
}

function getState(): WishlistState {
  if (state === null) state = readFromStorage();
  return state;
}

function emit(): void {
  for (const listener of listeners) listener();
}

/** Đồng bộ danh sách yêu thích giữa các tab trình duyệt qua sự kiện storage. */
function handleStorageEvent(event: StorageEvent): void {
  if (event.key !== WISHLIST_STORAGE_KEY) return;
  state = readFromStorage();
  emit();
}

/**
 * Store quản lý danh sách yêu thích phía client.
 * Tương thích React 18/19 qua useSyncExternalStore.
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

  /** Dùng trong unit test để reset trạng thái store */
  reset(): void {
    state = null;
  },
};
