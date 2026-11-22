import { describe, expect, it } from "vitest";
import { maskPhone, toCustomerOrderView } from "./customer-view";
import type { Order } from "./types";

const order: Order & { internalSecret: string } = {
  id: "SL-20261121-ABC123",
  status: "pending",
  createdAt: "2026-11-21T01:00:00.000Z",
  updatedAt: "2026-11-21T01:00:00.000Z",
  customer: {
    fullName: "Nguyễn Văn An",
    phone: "0912345678",
    email: "an@example.com",
    address: "12 Lê Lợi, Huế",
    note: "Giao giờ hành chính",
  },
  shippingMethod: "standard",
  paymentMethod: "bank_transfer",
  items: [
    {
      productId: "p001",
      slug: "tai-nghe",
      name: "Tai nghe",
      image: { emoji: "🎧", from: "#111", to: "#222" },
      unitPrice: 100_000,
      quantity: 2,
      lineTotal: 200_000,
    },
  ],
  subtotal: 200_000,
  shippingFee: 30_000,
  total: 230_000,
  internalSecret: "không được lộ",
};

describe("maskPhone", () => {
  it("+84 và 0 che ra cùng kết quả", () => {
    expect(maskPhone("+84912345678")).toBe("09****678");
    expect(maskPhone("0912345678")).toBe("09****678");
  });

  it("số quá ngắn thì che toàn bộ", () => {
    expect(maskPhone("123")).toBe("***");
  });
});

describe("toCustomerOrderView", () => {
  it("verified=false: không có field cá nhân, chỉ có SĐT đã che", () => {
    const view = toCustomerOrderView(order, { verified: false });
    const json = JSON.stringify(view);
    for (const value of Object.values(order.customer)) expect(json).not.toContain(value);
    expect(view.customer).toBeUndefined();
    expect(view.maskedPhone).toBe("09****678");
    expect(view).toMatchObject({ id: order.id, status: "pending", total: 230_000 });
    expect(view.items).toHaveLength(1);
  });

  it("mặc định là chưa xác minh", () => {
    expect(toCustomerOrderView(order).customer).toBeUndefined();
  });

  it("verified=true: có đầy đủ thông tin người nhận, không có SĐT che", () => {
    const view = toCustomerOrderView(order, { verified: true });
    expect(view.customer).toEqual(order.customer);
    expect(view.maskedPhone).toBeUndefined();
  });

  it("whitelist: field lạ của Order không lọt ra, và đối tượng là bản mới", () => {
    for (const verified of [true, false]) {
      const view = toCustomerOrderView(order, { verified });
      expect(JSON.stringify(view)).not.toContain("internalSecret");
      expect(view).not.toBe(order);
      expect(view.items[0]).not.toBe(order.items[0]);
    }
  });
});
