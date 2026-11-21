// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const readStock = vi.fn();
let failure: Error | undefined;
vi.mock("@/features/inventory/server", () => ({
  readStock: async (...args: unknown[]) => {
    if (failure) throw failure;
    return readStock(...args);
  },
}));

const { GET } = await import("./route");
const call = (qs: string) =>
  GET(new NextRequest(`http://localhost/api/inventory${qs}`));

describe("GET /api/inventory", () => {
  beforeEach(() => {
    readStock.mockReset();
    failure = undefined;
  });

  it("200 kèm no-store", async () => {
    readStock.mockResolvedValue({ a: 3, b: 0 });
    const res = await call("?ids=a,b");
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.json()).toEqual({ stock: { a: 3, b: 0 } });
  });

  it.each([
    ["thiếu ids", ""],
    [
      "51 id",
      `?ids=${Array.from({ length: 51 }, (_, i) => `p${i}`).join(",")}`,
    ],
    ["id quá dài", `?ids=${"x".repeat(65)}`],
  ])("400 VALIDATION_ERROR khi %s, không chạm DB", async (_n, qs) => {
    const res = await call(qs);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
    expect(readStock).not.toHaveBeenCalled();
  });

  it("500 đã làm sạch khi đọc tồn lỗi", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    failure = new Error("postgres://secret@host/db");
    const res = await call("?ids=a");
    expect(res.status).toBe(500);
    const text = JSON.stringify(await res.json());
    expect(text).toContain("INTERNAL_ERROR");
    expect(text).not.toContain("secret");
  });
});
