import { cartReducer, EMPTY_CART, MAX_QUANTITY_PER_ITEM } from "./cart-reducer";
import type { CartAction, CartItem, CartState } from "./types";

export const CART_STORAGE_KEY = "shoplite:cart";

type Listener = () => void;

let state: CartState | null = null;
const listeners = new Set<Listener>();

function isImage(value: unknown): value is CartItem["image"] {
  const v = value as Record<string, unknown> | null;
  return (
    typeof v === "object" &&
    v !== null &&
    typeof v.emoji === "string" &&
    typeof v.from === "string" &&
    typeof v.to === "string"
  );
}

/** Làm sạch giỏ cũ: bỏ `stock`, loại dòng thiếu field, kẹp số lượng vào 1..10. */
export function sanitizeCart(value: unknown): CartState {
  const rawItems = (value as { items?: unknown } | null)?.items;
  if (!Array.isArray(rawItems)) return EMPTY_CART;

  const items: CartItem[] = [];
  const seen = new Set<string>();
  for (const raw of rawItems) {
    const r = raw as Record<string, unknown> | null;
    if (
      typeof r !== "object" ||
      r === null ||
      typeof r.productId !== "string" ||
      typeof r.slug !== "string" ||
      typeof r.name !== "string" ||
      typeof r.price !== "number" ||
      !Number.isFinite(r.price) ||
      r.price < 0 ||
      !isImage(r.image) ||
      typeof r.quantity !== "number" ||
      !Number.isFinite(r.quantity)
    ) {
      continue;
    }
    if (seen.has(r.productId)) continue;
    seen.add(r.productId);
    items.push({
      productId: r.productId,
      slug: r.slug,
      name: r.name,
      price: r.price,
      image: r.image,
      quantity: Math.min(
        Math.max(1, Math.floor(r.quantity)),
        MAX_QUANTITY_PER_ITEM,
      ),
    });
  }
  return { items };
}

function readFromStorage(): CartState {
  if (typeof window === "undefined") return EMPTY_CART;
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return EMPTY_CART;
    const parsed: unknown = JSON.parse(raw);
    return sanitizeCart(parsed);
  } catch {
    return EMPTY_CART;
  }
}

function writeToStorage(next: CartState): void {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage có thể bị chặn (chế độ ẩn danh) - giỏ hàng vẫn hoạt động trong phiên hiện tại.
  }
}

function getState(): CartState {
  if (state === null) state = readFromStorage();
  return state;
}

function emit(): void {
  for (const listener of listeners) listener();
}

/** Đồng bộ giỏ hàng giữa các tab trình duyệt. */
function handleStorageEvent(event: StorageEvent): void {
  if (event.key !== CART_STORAGE_KEY) return;
  state = readFromStorage();
  emit();
}

/**
 * Store giỏ hàng phía client, lưu trong localStorage.
 * Dùng với React qua useSyncExternalStore (xem use-cart.ts).
 */
export const cartStore = {
  getSnapshot(): CartState {
    return getState();
  },

  getServerSnapshot(): CartState {
    return EMPTY_CART;
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

  dispatch(action: CartAction): void {
    const next = cartReducer(getState(), action);
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
