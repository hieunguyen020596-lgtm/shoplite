import { describe, expect, it } from "vitest";
import { AccessError } from "./access-errors";
import { createAuthService } from "./auth-service";
import { signSession, STAFF_SESSION_SECONDS } from "./session";
import { hashPassword } from "./staff-accounts";

const accounts = [
  {
    username: "lan",
    displayName: "Chị Lan",
    passwordHash: hashPassword("pw-dung"),
  },
];
const NOW = 1_700_000_000_000;
const make = (now = NOW, secret = "s3cret") =>
  createAuthService({ accounts, secret, now: () => now });

describe("authService.login", () => {
  it("đúng thông tin: trả staff và token đọc lại được", () => {
    const service = make();
    const { staff, token } = service.login("lan", "pw-dung");
    expect(staff).toEqual({ username: "lan", displayName: "Chị Lan" });
    expect(service.readSession(token)).toEqual(staff);
  });

  it("sai mật khẩu và sai username cùng một lỗi", () => {
    const service = make();
    const errors = [service, service].map((s, i) => {
      try {
        s.login(i === 0 ? "lan" : "ghost", "sai");
      } catch (e) {
        return e as AccessError;
      }
      throw new Error("không ném lỗi");
    });
    for (const e of errors) {
      expect(e).toBeInstanceOf(AccessError);
      expect(e.code).toBe("UNAUTHENTICATED");
    }
    expect(errors[0].message).toBe(errors[1].message);
  });

  it("không có secret thì từ chối dù đúng mật khẩu", () => {
    expect(() => make(NOW, "").login("lan", "pw-dung")).toThrow(AccessError);
  });
});

describe("authService.readSession", () => {
  it("null khi không có token, token hỏng, hết hạn hoặc user không còn", () => {
    const service = make();
    const { token } = service.login("lan", "pw-dung");
    expect(service.readSession(undefined)).toBeNull();
    expect(service.readSession(token.slice(0, -1) + (token.endsWith("A") ? "B" : "A"))).toBeNull();
    expect(make(NOW + STAFF_SESSION_SECONDS * 1000).readSession(token)).toBeNull();
    const ghost = signSession({ username: "ghost", exp: NOW + 1000 }, "s3cret");
    expect(service.readSession(ghost)).toBeNull();
  });
});

describe("authService verified orders", () => {
  it("thêm mã, không trùng lặp, đọc lại được", () => {
    const svc = make();
    const t1 = svc.addVerifiedOrder(undefined, "SL-1")!;
    const t2 = svc.addVerifiedOrder(t1, "SL-2")!;
    const t3 = svc.addVerifiedOrder(t2, "SL-1")!;
    expect(svc.readVerifiedOrders(t3)).toEqual(["SL-2", "SL-1"]);
  });

  it("giữ 20 mã gần nhất khi đặt đơn thứ 21", () => {
    const svc = make();
    let token: string | undefined;
    for (let i = 1; i <= 21; i++) token = svc.addVerifiedOrder(token, `SL-${i}`)!;
    const ids = svc.readVerifiedOrders(token);
    expect(ids).toHaveLength(20);
    expect(ids[0]).toBe("SL-2");
    expect(ids[19]).toBe("SL-21");
  });

  it("cookie bị sửa thì coi như rỗng; thiếu secret thì không ký", () => {
    const svc = make();
    expect(svc.readVerifiedOrders("rac.rac")).toEqual([]);
    expect(svc.readVerifiedOrders(undefined)).toEqual([]);
    expect(make(NOW, "").addVerifiedOrder(undefined, "SL-1")).toBeNull();
  });
});
