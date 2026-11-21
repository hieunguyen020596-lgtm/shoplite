import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  type OrderStatus,
} from "@/features/orders/types";
import { OrderStatusBadge } from "./order-status-badge";

describe("<OrderStatusBadge />", () => {
  const expectedClassesByStatus: Record<OrderStatus, string[]> = {
    pending: ["bg-amber-50", "text-amber-700", "ring-amber-200"],
    confirmed: ["bg-sky-50", "text-sky-700", "ring-sky-200"],
    shipping: ["bg-indigo-50", "text-indigo-700", "ring-indigo-200"],
    delivered: ["bg-emerald-50", "text-emerald-700", "ring-emerald-200"],
    cancelled: ["bg-slate-100", "text-slate-600", "ring-slate-200"],
  };

  it.each(ORDER_STATUSES)(
    "render trạng thái %s với nhãn tiếng Việt, icon SVG aria-hidden size-3 và màu chuẩn WCAG AA",
    (status) => {
      const { container } = render(<OrderStatusBadge status={status} />);

      const badge = screen.getByText(ORDER_STATUS_LABELS[status]);
      expect(badge).toBeInTheDocument();

      for (const cls of expectedClassesByStatus[status]) {
        expect(badge).toHaveClass(cls);
      }

      const svg = container.querySelector("svg");
      expect(svg).not.toBeNull();
      expect(svg).toHaveAttribute("aria-hidden", "true");
      expect(svg).toHaveClass("size-3", "shrink-0");
    },
  );

  it("dùng text-slate-600 trên nền bg-slate-100 cho trạng thái cancelled (không dùng text-slate-500)", () => {
    render(<OrderStatusBadge status="cancelled" />);

    const badge = screen.getByText("Đã hủy");
    expect(badge).toHaveClass(
      "bg-slate-100",
      "text-slate-600",
      "ring-slate-200",
    );
    expect(badge).not.toHaveClass("text-slate-500");
  });
});
