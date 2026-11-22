import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StaffOrderCard } from "./staff-order-card";
import type { Order } from "../types";

const order: Order = {
  id: "SL-20261021-4F9A2C",
  status: "pending",
  createdAt: "2026-10-21T03:00:00.000Z",
  updatedAt: "2026-10-21T03:00:00.000Z",
  customer: { fullName: "Trần Thị B", phone: "0987654321", address: "x" },
  shippingMethod: "standard",
  paymentMethod: "bank_transfer",
  items: [
    {
      productId: "p1",
      slug: "a",
      name: "A",
      image: { emoji: "x", from: "#000", to: "#fff" },
      unitPrice: 1,
      quantity: 2,
      lineTotal: 2,
    },
  ],
  subtotal: 2,
  shippingFee: 0,
  total: 2,
};

describe("StaffOrderCard", () => {
  it("là một link tới chi tiết, giữ ?status= và không có nút thao tác", () => {
    render(<StaffOrderCard order={order} backStatus="pending" />);
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/staff/orders/SL-20261021-4F9A2C?status=pending",
    );
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("Trần Thị B · 0987654321")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Chuyển khoản" }),
    ).toBeInTheDocument();
  });
});
