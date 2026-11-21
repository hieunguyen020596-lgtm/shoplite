// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CATALOG_QUERY, getAllProducts } from "./catalog-service";

const readStock = vi.fn();
vi.mock("@/features/inventory/server", () => ({ readStock }));

const { queryStockedProducts, getStockedProductBySlug } =
  await import("./server");

describe("catalog/server", () => {
  beforeEach(() => readStock.mockReset());

  it("ghép tồn đã mock, thiếu dòng là 0", async () => {
    readStock.mockResolvedValue({ p001: 7 });
    const result = await queryStockedProducts({
      ...DEFAULT_CATALOG_QUERY,
      page: 1,
    });
    const p001 = result.items.find((p) => p.id === "p001");
    expect(p001?.stock).toBe(7);
    expect(
      result.items.filter((p) => p.id !== "p001").every((p) => p.stock === 0),
    ).toBe(true);
  });

  it("inStock lọc theo tồn mock", async () => {
    readStock.mockResolvedValue({ p001: 7, p002: 0 });
    const result = await queryStockedProducts({
      ...DEFAULT_CATALOG_QUERY,
      inStock: true,
    });
    expect(result.items.map((p) => p.id)).toEqual(["p001"]);
  });

  it("getStockedProductBySlug trả tồn đúng", async () => {
    const product = getAllProducts()[0];
    readStock.mockResolvedValue({ [product.id]: 4 });
    expect((await getStockedProductBySlug(product.slug))?.stock).toBe(4);
    expect(await getStockedProductBySlug("khong-co")).toBeUndefined();
  });
});
