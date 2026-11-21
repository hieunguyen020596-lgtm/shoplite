import { describe, expect, it } from "vitest";
import { getClientIp } from "./client-ip";

const h = (xff?: string) =>
  new Headers(xff === undefined ? {} : { "x-forwarded-for": xff });

describe("getClientIp", () => {
  it("hops 0: bucket direct, không đọc header", () => {
    expect(getClientIp(h("1.2.3.4"), 0)).toBe("direct");
    const headers = new Headers();
    let read = false;
    headers.get = () => ((read = true), null);
    getClientIp(headers, 0);
    expect(read).toBe(false);
  });

  it("hops n: phần tử thứ n từ phải", () => {
    expect(getClientIp(h("9.9.9.9, 1.2.3.4, 5.6.7.8"), 1)).toBe("5.6.7.8");
    expect(getClientIp(h("9.9.9.9, 1.2.3.4, 5.6.7.8"), 2)).toBe("1.2.3.4");
    expect(getClientIp(h("9.9.9.9, 1.2.3.4, 5.6.7.8"), 3)).toBe("9.9.9.9");
  });

  it("thiếu phần tử hoặc không phải IP: unknown", () => {
    expect(getClientIp(h("1.2.3.4"), 2)).toBe("unknown");
    expect(getClientIp(h(), 1)).toBe("unknown");
    expect(getClientIp(h("abc"), 1)).toBe("unknown");
    expect(getClientIp(h("1.2.3.4:80"), 1)).toBe("unknown");
    expect(getClientIp(h("1.2.3.256"), 1)).toBe("unknown");
    expect(getClientIp(h("1.2.3.4,"), 1)).toBe("unknown");
    expect(getClientIp(h("fe80::1%eth0"), 1)).toBe("unknown");
  });

  it("IPv4-mapped về IPv4", () => {
    expect(getClientIp(h("::ffff:1.2.3.4"), 1)).toBe("1.2.3.4");
    expect(getClientIp(h("::ffff:102:304"), 1)).toBe("1.2.3.4");
  });

  it("IPv6 đầy đủ hoặc rút gọn gom /64", () => {
    const a = getClientIp(h("2001:db8:1:2:aaaa:bbbb:cccc:dddd"), 1);
    const b = getClientIp(h("2001:0db8:0001:0002::1"), 1);
    expect(a).toBe("2001:db8:1:2::/64");
    expect(b).toBe(a);
    expect(getClientIp(h("2001:db8::1"), 1)).toBe("2001:db8:0:0::/64");
    expect(getClientIp(h("::1"), 1)).toBe("0:0:0:0::/64");
  });
});
