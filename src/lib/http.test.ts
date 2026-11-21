import { afterEach, describe, expect, it, vi } from "vitest";
import { handleRouteError } from "./http";

afterEach(() => vi.restoreAllMocks());

describe("handleRouteError", () => {
  it("lỗi lạ trả 500 INTERNAL_ERROR và log không chứa message hay stack", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("password=hunter2");
    const res = handleRouteError(error);
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe("INTERNAL_ERROR");
    const out = spy.mock.calls.flat().join(" ");
    expect(out).not.toContain("hunter2");
    expect(out).not.toContain(String(error.stack));
  });
});
