import { afterEach, describe, expect, it, vi } from "vitest";
import { exitIfEnvInvalid, parseServerEnv, type EnvSource } from "./env";

const SECRET = "a".repeat(32);
const base = (over: EnvSource = {}): EnvSource => ({
  DATABASE_URL: "postgresql://u@localhost:5432/shoplite_dev",
  ORDER_ACCESS_SECRET: SECRET,
  SHOP_CONTACT_PHONE: "0900000000",
  BANK_NAME: "Ngan hang Demo",
  BANK_ACCOUNT_NUMBER: "0123456789",
  TRUSTED_PROXY_HOPS: "0",
  ...over,
});

const names = (r: ReturnType<typeof parseServerEnv>) => (r.ok ? [] : r.names);

describe("parseServerEnv", () => {
  it("env hợp lệ được parse, biến tùy chọn có thể thiếu", () => {
    const r = parseServerEnv(base(), "development");
    expect(r.ok && r.env.TRUSTED_PROXY_HOPS).toBe(0);
    expect(r.ok && r.env.TEST_DATABASE_URL).toBeUndefined();
    expect(r.ok && r.env.STAFF_ACCOUNTS).toBeUndefined();
  });

  it("giữ STAFF_ACCOUNTS dạng chuỗi, không parse JSON", () => {
    const r = parseServerEnv(
      base({ STAFF_ACCOUNTS: "not json" }),
      "development",
    );
    expect(r.ok && r.env.STAFF_ACCOUNTS).toBe("not json");
  });

  it("thiếu hoặc rỗng BANK_NAME báo đúng tên", () => {
    expect(
      names(parseServerEnv(base({ BANK_NAME: "" }), "development")),
    ).toEqual(["BANK_NAME"]);
    expect(
      names(parseServerEnv(base({ BANK_NAME: undefined }), "development")),
    ).toEqual(["BANK_NAME"]);
  });

  it("secret dưới 32 byte báo ORDER_ACCESS_SECRET, kể cả replace_me ngoài production", () => {
    expect(
      names(
        parseServerEnv(base({ ORDER_ACCESS_SECRET: "short" }), "development"),
      ),
    ).toEqual(["ORDER_ACCESS_SECRET"]);
    expect(
      names(
        parseServerEnv(
          base({ ORDER_ACCESS_SECRET: "replace_me" }),
          "development",
        ),
      ),
    ).toEqual(["ORDER_ACCESS_SECRET"]);
  });

  it("production coi replace_me là thiếu với mọi biến", () => {
    const r = parseServerEnv(
      base({
        TRUSTED_PROXY_HOPS: "1",
        DATABASE_URL: "postgresql://replace_me@h/db",
        BANK_NAME: "replace_me",
      }),
      "production",
    );
    expect(names(r).sort()).toEqual(["BANK_NAME", "DATABASE_URL"]);
  });

  it("hops production: thiếu, 0 hoặc sai định dạng đều lỗi", () => {
    for (const v of [undefined, "0", "-1", "1.5", "abc", "01"]) {
      expect(
        names(parseServerEnv(base({ TRUSTED_PROXY_HOPS: v }), "production")),
      ).toEqual(["TRUSTED_PROXY_HOPS"]);
    }
    const ok = parseServerEnv(base({ TRUSTED_PROXY_HOPS: "2" }), "production");
    expect(ok.ok && ok.env.TRUSTED_PROXY_HOPS).toBe(2);
  });

  it("hops ngoài production: thiếu là 0, sai định dạng là lỗi", () => {
    const r = parseServerEnv(
      base({ TRUSTED_PROXY_HOPS: undefined }),
      "development",
    );
    expect(r.ok && r.env.TRUSTED_PROXY_HOPS).toBe(0);
    expect(
      names(parseServerEnv(base({ TRUSTED_PROXY_HOPS: "x" }), "development")),
    ).toEqual(["TRUSTED_PROXY_HOPS"]);
  });

  it("hops là số quá lớn mất chính xác thì báo lỗi", () => {
    for (const env of ["production", "development"]) {
      expect(
        names(
          parseServerEnv(
            base({ TRUSTED_PROXY_HOPS: "99999999999999999999" }),
            env,
          ),
        ),
      ).toEqual(["TRUSTED_PROXY_HOPS"]);
    }
  });

  it("kết quả lỗi không chứa giá trị env", () => {
    const r = parseServerEnv(
      base({ ORDER_ACCESS_SECRET: "super-secret-short" }),
      "development",
    );
    expect(JSON.stringify(r)).not.toContain("super-secret-short");
  });
});

describe("exitIfEnvInvalid", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  function setup(env: Record<string, string>) {
    for (const k of Object.keys(base())) vi.stubEnv(k, "");
    for (const [k, v] of Object.entries({ ...base(), ...env }))
      vi.stubEnv(k, v as string);
    vi.stubEnv("NEXT_PHASE", env.NEXT_PHASE ?? "");
    const exit = vi
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as never);
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    return { exit, err };
  }

  it("env sai thì thoát mã 1 và chỉ log tên biến", () => {
    const { exit, err } = setup({
      BANK_NAME: "",
      ORDER_ACCESS_SECRET: "bi-mat-ngan",
    });
    exitIfEnvInvalid();
    expect(exit).toHaveBeenCalledWith(1);
    const out = err.mock.calls.flat().join(" ");
    expect(out).toContain("BANK_NAME");
    expect(out).toContain("ORDER_ACCESS_SECRET");
    expect(out).not.toContain("bi-mat-ngan");
  });

  it("env đúng thì không thoát", () => {
    const { exit } = setup({});
    exitIfEnvInvalid();
    expect(exit).not.toHaveBeenCalled();
  });

  it("phase build bỏ qua kiểm tra", () => {
    const { exit } = setup({
      BANK_NAME: "",
      NEXT_PHASE: "phase-production-build",
    });
    exitIfEnvInvalid();
    expect(exit).not.toHaveBeenCalled();
  });
});
