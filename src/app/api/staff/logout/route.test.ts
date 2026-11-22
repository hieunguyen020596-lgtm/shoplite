// @vitest-environment node
import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/staff/logout", () => {
  it("204 - xóa cookie sl_staff", async () => {
    const response = await POST();
    expect(response.status).toBe(204);
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("sl_staff=");
    expect(cookie).toContain("Max-Age=0");
  });
});
