// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/catalog/server", () => ({
  getStockedFeaturedProducts: vi.fn(),
}));

describe("trang chủ", () => {
  it("luôn render động để không đóng băng Tồn kho lúc build", async () => {
    const { dynamic } = await import("./page");
    expect(dynamic).toBe("force-dynamic");
  });
});
