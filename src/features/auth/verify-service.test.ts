import { describe, expect, it } from "vitest";
import { AccessError } from "./access-errors";
import { createAttemptLimiter } from "./attempt-limiter";
import { createVerifyService } from "./verify-service";

const MIN = 60 * 1000;

function setup() {
  let now = 1_000_000;
  const service = createVerifyService({
    limiter: createAttemptLimiter(),
    findOrderPhone: async (id) => (id === "SL-1" ? "0912345678" : null),
    now: () => now,
  });
  return { service, advance: (ms: number) => (now += ms) };
}

const attempt = (
  service: ReturnType<typeof setup>["service"],
  phone: string,
  extra: { orderId?: string; ip?: string; exempt?: boolean } = {},
) => service.verify({ orderId: "SL-1", ip: "ip", phone, ...extra });

const codeOf = async (promise: Promise<unknown>) =>
  promise.then(
    () => "ok",
    (e: AccessError) => `${e.code}:${JSON.stringify(e.details ?? {})}`,
  );

describe("verify service", () => {
  it("chấp nhận SĐT đúng ở mọi dạng", async () => {
    const { service } = setup();
    await expect(attempt(service, "0912 345 678")).resolves.toBeUndefined();
    await expect(attempt(service, "+84912345678")).resolves.toBeUndefined();
  });

  it("sai SĐT trả FORBIDDEN, báo số lần còn lại", async () => {
    const { service } = setup();
    expect(await codeOf(attempt(service, "0900000000"))).toBe(
      'FORBIDDEN:{"remaining":"4"}',
    );
  });

  it("sai 5 lần thì lần 6 bị 429 dù SĐT đúng, và mở lại sau 15 phút", async () => {
    const { service, advance } = setup();
    for (let i = 0; i < 5; i++) await codeOf(attempt(service, "0900000000"));
    expect(await codeOf(attempt(service, "0912345678"))).toMatch(
      /^TOO_MANY_ATTEMPTS/,
    );
    advance(14 * MIN);
    expect(await codeOf(attempt(service, "0912345678"))).toMatch(
      /^TOO_MANY_ATTEMPTS/,
    );
    advance(MIN + 1);
    expect(await codeOf(attempt(service, "0912345678"))).toBe("ok");
  });

  it("Mã đơn không tồn tại cho cùng phản hồi và tính vào giới hạn IP", async () => {
    const { service } = setup();
    const unknown = await codeOf(
      attempt(service, "0912345678", { orderId: "SL-X" }),
    );
    const wrong = await codeOf(
      attempt(service, "0900000000", { orderId: "SL-1", ip: "ip2" }),
    );
    expect(unknown).toBe(wrong);
    for (let i = 0; i < 19; i++)
      await codeOf(attempt(service, "0", { orderId: `SL-${i}` }));
    expect(
      await codeOf(attempt(service, "0912345678", { orderId: "SL-1" })),
    ).toMatch(/^TOO_MANY_ATTEMPTS/);
  });

  it("exempt không bị chặn và không bị tính lần sai", async () => {
    const { service } = setup();
    for (let i = 0; i < 10; i++)
      expect(
        await codeOf(attempt(service, "0900000000", { exempt: true })),
      ).toBe("FORBIDDEN:{}");
    expect(await codeOf(attempt(service, "0912345678"))).toBe("ok");
  });
});
