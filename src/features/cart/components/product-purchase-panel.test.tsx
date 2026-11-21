import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getProductById } from "@/features/catalog/catalog-service";
import { cartStore } from "@/features/cart/cart-store";
import { AddToCartButton } from "./add-to-cart-button";
import { ProductPurchasePanel } from "./product-purchase-panel";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe("<ProductPurchasePanel />", () => {
  beforeEach(() => {
    window.localStorage.clear();
    cartStore.reset();
  });

  it("truyền stock vào add: không thêm vượt 3", async () => {
    const user = userEvent.setup();
    render(
      <ProductPurchasePanel
        product={{ ...getProductById("p010")!, stock: 3 }}
      />,
    );
    const add = screen.getByRole("button", { name: /Thêm vào giỏ/ });
    for (let i = 0; i < 5; i++) {
      if (!(add as HTMLButtonElement).disabled) await user.click(add);
    }
    expect(cartStore.getSnapshot().items[0].quantity).toBe(3);
  });

  it("addItem truyền stock: thêm 5 khi tồn 3 chỉ vào giỏ 3", async () => {
    const user = userEvent.setup();
    render(
      <AddToCartButton
        product={{ ...getProductById("p010")!, stock: 3 }}
        quantity={5}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Thêm vào giỏ/ }));
    expect(cartStore.getSnapshot().items[0].quantity).toBe(3);
  });
});
