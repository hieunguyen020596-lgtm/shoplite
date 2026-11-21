import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getProductById } from "@/features/catalog/catalog-service";
import { cartStore } from "@/features/cart/cart-store";
import { ProductPurchasePanel } from "./product-purchase-panel";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("<ProductPurchasePanel />", () => {
  beforeEach(() => {
    cartStore.reset();
  });

  it("ẩn bảng chọn mua và hiện thông báo tạm hết hàng khi stock === 0", () => {
    const outOfStockProduct = { ...getProductById("p011")!, stock: 0 };
    render(<ProductPurchasePanel product={outOfStockProduct} />);

    expect(
      screen.getByText("Sản phẩm tạm hết hàng. Vui lòng quay lại sau."),
    ).toBeVisible();
    expect(screen.queryByTestId("purchase-panel")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Thêm vào giỏ/ }),
    ).not.toBeInTheDocument();
  });

  it("hiển thị bảng chọn mua cùng nút Thêm vào giỏ và Mua ngay hoạt động khi stock > 0", () => {
    const inStockProduct = { ...getProductById("p011")!, stock: 3 };
    render(<ProductPurchasePanel product={inStockProduct} />);

    expect(screen.getByTestId("purchase-panel")).toBeVisible();
    expect(screen.getByRole("button", { name: /Thêm vào giỏ/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Mua ngay/ })).toBeEnabled();
  });
});
