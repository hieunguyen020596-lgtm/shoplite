// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getProductById } from "@/features/catalog/catalog-service";

const readStock = vi.fn();
vi.mock("@/features/inventory/server", () => ({ readStock }));

const { GET } = await import("./route");
const { GET: GET_ONE } = await import("./[slug]/route");

const product = getProductById("p010")!;
const one = (slug: string) =>
  GET_ONE(new Request(`http://localhost/api/products/${slug}`), {
    params: Promise.resolve({ slug }),
  });

describe("API sản phẩm", () => {
  beforeEach(() => {
    readStock.mockReset();
  });

  it("GET danh sách trả stock từ inventory", async () => {
    readStock.mockImplementation(async (ids: string[]) =>
      Object.fromEntries(ids.map((id) => [id, id === "p010" ? 7 : 1])),
    );
    const res = await GET(
      new NextRequest(`http://localhost/api/products?q=${product.name}`),
    );
    expect(res.status).toBe(200);
    const { items } = await res.json();
    expect(items.find((p: { id: string }) => p.id === "p010")).toMatchObject({
      stock: 7,
    });
  });

  it("GET chi tiết trả stock", async () => {
    readStock.mockResolvedValue({ p010: 4 });
    const res = await one(product.slug);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: "p010", stock: 4 });
  });

  it("GET chi tiết slug lạ: 404 PRODUCT_NOT_FOUND", async () => {
    const res = await one("khong-co");
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("PRODUCT_NOT_FOUND");
    expect(readStock).not.toHaveBeenCalled();
  });

  it("đọc tồn lỗi: cả hai route trả 500 đã làm sạch", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    readStock.mockImplementation(async () => {
      throw new Error("postgres://secret@host/db");
    });
    for (const res of [
      await GET(new NextRequest("http://localhost/api/products")),
      await one(product.slug),
    ]) {
      expect(res.status).toBe(500);
      const text = JSON.stringify(await res.json());
      expect(text).toContain("INTERNAL_ERROR");
      expect(text).not.toContain("secret");
    }
  });
});
