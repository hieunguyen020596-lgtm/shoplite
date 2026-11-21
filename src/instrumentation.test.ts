// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const exitIfEnvInvalid = vi.fn();
vi.mock("./lib/env", () => ({ exitIfEnvInvalid }));

const { register } = await import("./instrumentation");

afterEach(() => {
  vi.unstubAllEnvs();
  exitIfEnvInvalid.mockReset();
});

describe("register", () => {
  it("runtime nodejs: kiểm env", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    await register();
    expect(exitIfEnvInvalid).toHaveBeenCalledOnce();
  });

  it("runtime edge: không kiểm env", async () => {
    vi.stubEnv("NEXT_RUNTIME", "edge");
    await register();
    expect(exitIfEnvInvalid).not.toHaveBeenCalled();
  });
});
