import Link from "next/link";
import { Banknote, CreditCard } from "lucide-react";
import type { PaymentMethod } from "@/features/checkout/checkout-schema";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { Order } from "../types";
import { OrderStatusBadge } from "./order-status-badge";

const PAYMENT_ICONS: Record<
  PaymentMethod,
  { icon: typeof Banknote; label: string }
> = {
  cod: { icon: Banknote, label: "Thanh toán khi nhận hàng" },
  bank_transfer: { icon: CreditCard, label: "Chuyển khoản" },
};

/** Thẻ đơn cho nhân viên: 3 dòng, chỉ để mở chi tiết (không có nút đổi trạng thái). */
export function StaffOrderCard({
  order,
  backStatus,
}: {
  order: Order;
  backStatus?: string;
}) {
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const { icon: PaymentIcon, label: paymentLabel } =
    PAYMENT_ICONS[order.paymentMethod];
  const href = `/staff/orders/${order.id}${backStatus ? `?status=${backStatus}` : ""}`;

  return (
    <Link
      href={href}
      data-testid="staff-order-card"
      className="flex flex-col gap-1.5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold tabular-nums">{order.id}</span>
        <OrderStatusBadge status={order.status} />
      </div>
      <div className="text-sm text-slate-700">
        {order.customer.fullName} · {order.customer.phone}
      </div>
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span>{formatDateTime(order.createdAt)}</span>
        <span aria-hidden>·</span>
        <span>
          {itemCount} <span className="max-[389px]:hidden">sản phẩm</span>
          <abbr
            title="sản phẩm"
            className="hidden no-underline max-[389px]:inline"
          >
            SP
          </abbr>
        </span>
        <PaymentIcon className="size-4" aria-label={paymentLabel} role="img" />
        <span className="ml-auto font-bold text-slate-900">
          {formatCurrency(order.total)}
        </span>
      </div>
    </Link>
  );
}
