import { cleanup, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cartStore } from "@/features/cart/cart-store";
import type { InventoryRepository } from "@/features/orders/inventory-repository";

const testState = vi.hoisted(() => ({
  inventoryRepository: undefined as unknown as InventoryRepository,
  notFoundMock: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  pushMock: vi.fn(),
}));

vi.mock("@/features/orders/server", async () => {
  const { createInMemoryInventoryRepository } =
    await import("@/features/orders/inventory-repository");
  testState.inventoryRepository = createInMemoryInventoryRepository();
  const proxyRepo: InventoryRepository = {
    getStockMap: () => testState.inventoryRepository.getStockMap(),
    getStock: (productId) => testState.inventoryRepository.getStock(productId),
    deduct: (items) => testState.inventoryRepository.deduct(items),
    restock: (items) => testState.inventoryRepository.restock(items),
  };
  return { inventoryRepository: proxyRepo };
});

vi.mock("next/navigation", () => ({
  notFound: () => testState.notFoundMock(),
  useRouter: () => ({
    push: testState.pushMock,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/products",
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import HomePage, { dynamic as homeDynamic } from "./page";
import ProductsPage, { dynamic as productsDynamic } from "./products/page";
import * as productDetailModule from "./products/[slug]/page";
import ProductDetailPage, {
  dynamic as productDetailDynamic,
} from "./products/[slug]/page";

describe("Storefront Server Components với tồn kho động", () => {
  beforeEach(async () => {
    cartStore.reset();
    testState.notFoundMock.mockClear();
    testState.pushMock.mockClear();
    const { createInMemoryInventoryRepository } =
      await import("@/features/orders/inventory-repository");
    testState.inventoryRepository = createInMemoryInventoryRepository();
  });

  it("cấu hình dynamic = force-dynamic trên cả 3 trang và không xuất generateStaticParams ở [slug]/page", () => {
    expect(homeDynamic).toBe("force-dynamic");
    expect(productsDynamic).toBe("force-dynamic");
    expect(productDetailDynamic).toBe("force-dynamic");
    expect("generateStaticParams" in productDetailModule).toBe(false);
  });

  it("HomePage hiển thị Hết hàng và khóa nút mua khi sản phẩm nổi bật p003 giảm tồn kho về 0 rồi khôi phục khi hoàn kho", async () => {
    await testState.inventoryRepository.deduct([
      { productId: "p003", quantity: 8 },
    ]);

    render(await HomePage());
    expect(
      screen.getByRole("heading", { name: "Tai nghe chụp tai StudioOne" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Hết hàng" })).toBeDisabled();
    expect(
      screen.getAllByRole("button", { name: /Thêm vào giỏ/ }),
    ).toHaveLength(3);

    cleanup();
    await testState.inventoryRepository.restock([
      { productId: "p003", quantity: 5 },
    ]);

    render(await HomePage());
    expect(
      screen.queryByRole("button", { name: "Hết hàng" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /Thêm vào giỏ/ }),
    ).toHaveLength(4);
  });

  it("ProductsPage với inStock=1 loại bỏ p006 và cập nhật result-count khi tồn kho về 0, sau đó hiển thị lại khi hoàn kho", async () => {
    await testState.inventoryRepository.deduct([
      { productId: "p006", quantity: 60 },
    ]);

    render(
      await ProductsPage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({
          inStock: "1",
          category: "ban-phim-chuot",
        }),
      }),
    );

    expect(screen.getByTestId("result-count")).toHaveTextContent(
      "Hiển thị 2 sản phẩm",
    );
    expect(
      screen.queryByRole("heading", { name: "Chuột không dây SwiftClick" }),
    ).not.toBeInTheDocument();

    cleanup();
    await testState.inventoryRepository.restock([
      { productId: "p006", quantity: 4 },
    ]);

    render(
      await ProductsPage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({
          inStock: "1",
          category: "ban-phim-chuot",
        }),
      }),
    );

    expect(screen.getByTestId("result-count")).toHaveTextContent(
      "Hiển thị 3 sản phẩm",
    );
    expect(
      screen.getByRole("heading", { name: "Chuột không dây SwiftClick" }),
    ).toBeVisible();
  });

  it("ProductDetailPage hiển thị trạng thái tạm hết hàng khi p011 về 0 và mở lại bảng chọn mua sau khi hoàn kho", async () => {
    await testState.inventoryRepository.deduct([
      { productId: "p011", quantity: 3 },
    ]);

    render(
      await ProductDetailPage({
        params: Promise.resolve({ slug: "gia-do-laptop-nhom" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(
      screen.getByRole("heading", { name: "Giá đỡ laptop nhôm" }),
    ).toBeVisible();
    expect(screen.getByText("Hết hàng")).toBeVisible();
    expect(
      screen.getByText("Sản phẩm tạm hết hàng. Vui lòng quay lại sau."),
    ).toBeVisible();
    expect(screen.queryByTestId("purchase-panel")).not.toBeInTheDocument();

    cleanup();
    await testState.inventoryRepository.restock([
      { productId: "p011", quantity: 3 },
    ]);

    render(
      await ProductDetailPage({
        params: Promise.resolve({ slug: "gia-do-laptop-nhom" }),
        searchParams: Promise.resolve({}),
      }),
    );

    const purchasePanel = screen.getByTestId("purchase-panel");
    expect(purchasePanel).toBeVisible();
    expect(screen.getByText("Chỉ còn 3 sản phẩm")).toBeVisible();
    expect(
      screen.queryByText("Sản phẩm tạm hết hàng. Vui lòng quay lại sau."),
    ).not.toBeInTheDocument();
    expect(
      within(purchasePanel).getByRole("button", { name: /Thêm vào giỏ/ }),
    ).toBeEnabled();
    expect(
      within(purchasePanel).getByRole("button", { name: /Mua ngay/ }),
    ).toBeEnabled();
  });
});
