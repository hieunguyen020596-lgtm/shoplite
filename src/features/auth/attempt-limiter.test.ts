import { describe, expect, it } from "vitest";
import { createAttemptLimiter } from "./attempt-limiter";

const MIN = 60 * 1000;
const T0 = 1_000_000;

describe("createAttemptLimiter", () => {
  it("đếm lùi số lần còn lại theo Mã đơn", () => {
    const limiter = createAttemptLimiter();
    expect(limiter.check("A", "ip", T0)).toEqual({
      allowed: true,
      remaining: 5,
    });
    limiter.recordFailure("A", "ip", T0);
    limiter.recordFailure("A", "ip", T0);
    expect(limiter.check("A", "ip", T0)).toEqual({
      allowed: true,
      remaining: 3,
    });
  });

  it("sai 5 lần thì khóa Mã đơn; chưa đủ 15 phút vẫn khóa, quá 15 phút thì mở", () => {
    const limiter = createAttemptLimiter();
    for (let i = 0; i < 5; i++) limiter.recordFailure("A", `ip${i}`, T0);
    expect(limiter.check("A", "other", T0 + 14 * MIN + 59_000)).toEqual({
      allowed: false,
      retryAt: T0 + 15 * MIN,
    });
    expect(limiter.check("A", "other", T0 + 15 * MIN + 1).allowed).toBe(true);
  });

  it("Mã đơn khác không bị ảnh hưởng bởi khóa theo Mã đơn", () => {
    const limiter = createAttemptLimiter();
    for (let i = 0; i < 5; i++) limiter.recordFailure("A", `ip${i}`, T0);
    expect(limiter.check("B", "fresh", T0).allowed).toBe(true);
  });

  it("một IP sai 20 lần trên nhiều Mã đơn thì bị khóa với mọi Mã đơn", () => {
    const limiter = createAttemptLimiter();
    for (let i = 0; i < 20; i++) limiter.recordFailure(`O${i}`, "ip", T0);
    expect(limiter.check("NEW", "ip", T0 + MIN).allowed).toBe(false);
    expect(limiter.check("NEW", "ip", T0 + 15 * MIN + 1).allowed).toBe(true);
    expect(limiter.check("NEW", "khac", T0 + MIN).allowed).toBe(true);
  });

  it("lần sai cũ hơn 15 phút không còn được tính", () => {
    const limiter = createAttemptLimiter();
    for (let i = 0; i < 4; i++) limiter.recordFailure("A", "ip", T0);
    limiter.recordFailure("A", "ip", T0 + 16 * MIN);
    expect(limiter.check("A", "ip", T0 + 16 * MIN)).toEqual({
      allowed: true,
      remaining: 4,
    });
  });
});
