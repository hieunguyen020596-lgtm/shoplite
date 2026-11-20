export interface WishlistState {
  productIds: string[];
}

export type WishlistAction =
  | { type: "toggle"; productId: string }
  | { type: "add"; productId: string }
  | { type: "remove"; productId: string }
  | { type: "clear" };
