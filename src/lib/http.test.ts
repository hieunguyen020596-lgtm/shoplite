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

  it("lỗi 500 ghi đúng một dòng log đã làm sạch", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    handleRouteError({ name: "DbFailure", sqlState: "23505", message: "x" });
    expect(spy).toHaveBeenCalledOnce();
    expect(JSON.parse(String(spy.mock.calls[0][0]))).toEqual({
      scope: "route",
      name: "DbFailure",
      sqlState: "23505",
    });
  });

  it.each(["55P03", "57014", "25P03"])(
    "DB hết thời gian chờ (%s): 503 SERVICE_UNAVAILABLE",
    async (sqlState) => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const res = handleRouteError({ name: "DbFailure", sqlState });
      expect(res.status).toBe(503);
      expect((await res.json()).error.code).toBe("SERVICE_UNAVAILABLE");
    },
  );
});
