import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from "../types";
import { OrderStatusBadge } from "./order-status-badge";

describe("OrderStatusBadge", () => {
  it("có đúng 6 trạng thái", () => {
    expect(ORDER_STATUSES).toHaveLength(6);
  });

  it.each(ORDER_STATUSES)("hiển thị nhãn của trạng thái %s", (status) => {
    render(<OrderStatusBadge status={status} />);
    expect(screen.getByText(ORDER_STATUS_LABELS[status])).toBeTruthy();
  });

  it("failed màu rose, cancelled màu xám", () => {
    render(
      <>
        <OrderStatusBadge status="failed" />
        <OrderStatusBadge status="cancelled" />
      </>,
    );
    expect(screen.getByText("Giao thất bại").className).toContain(
      "bg-rose-50 text-rose-700 ring-rose-200",
    );
    expect(screen.getByText("Đã hủy").className).toContain("bg-slate-100");
  });
});
