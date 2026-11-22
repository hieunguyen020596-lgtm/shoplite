import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { verifiedOrderIds } from "@/features/auth/guards";
import { LookupOrderForm } from "@/features/orders/components/lookup-order-form";
import { OrderError } from "@/features/orders/order-errors";
import { toCustomerOrderView, type CustomerOrderView } from "@/features/orders/customer-view";
import { OrderStatusBadge } from "@/features/orders/components/order-status-badge";
import { orderService } from "@/features/orders/server";
import { formatCurrency, formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Đơn hàng" };

// Đọc dữ liệu đơn hàng mới nhất ở mỗi request (không prerender lúc build).
export const dynamic = "force-dynamic";

/** Chỉ các đơn có trong cookie của thiết bị này; mã không còn trong dữ liệu thì bỏ qua. */
async function listMyOrders(): Promise<CustomerOrderView[]> {
  const ids = await verifiedOrderIds();
  const found = await Promise.all(
    ids.map(async (id) => {
      try {
        return toCustomerOrderView(await orderService.getOrder(id), { verified: true });
      } catch (error) {
        if (error instanceof OrderError && error.code === "ORDER_NOT_FOUND") return null;
        throw error;
      }
    }),
  );
  return found
    .filter((order): order is CustomerOrderView => order !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export default async function OrdersPage() {
  const orders = await listMyOrders();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Đơn hàng của bạn</h1>

      {orders.length === 0 ? (
        <EmptyState
          emoji="📦"
          title="Bạn chưa có đơn hàng nào"
          description="Các đơn hàng sau khi đặt sẽ hiển thị tại đây."
          action={
            <Link href="/products" className={buttonStyles()}>
              Bắt đầu mua sắm
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((order) => {
            const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
            return (
              <li key={order.id}>
                <Link
                  href={`/orders/${order.id}`}
                  className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md"
                  data-testid="order-row"
                >
                  <div className="flex -space-x-3">
                    {order.items.slice(0, 3).map((item) => (
                      <span
                        key={item.productId}
                        className="flex size-11 items-center justify-center rounded-full text-xl ring-2 ring-white"
                        style={{
                          backgroundImage: `linear-gradient(135deg, ${item.image.from}, ${item.image.to})`,
                        }}
                        aria-hidden
                      >
                        {item.image.emoji}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{order.id}</span>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <span className="text-sm text-slate-500">
                      {formatDateTime(order.createdAt)} · {itemCount} sản phẩm
                    </span>
                  </div>
                  <span className="font-bold text-slate-900">{formatCurrency(order.total)}</span>
                  <ChevronRight className="size-5 text-slate-400" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <section aria-labelledby="lookup-heading" className="mt-8">
        <h2 id="lookup-heading" className="mb-1 text-lg font-bold">
          Tra cứu đơn
        </h2>
        <p className="mb-3 text-sm text-slate-500">
          Đặt hàng từ máy khác? Nhập Mã đơn và số điện thoại đặt hàng để xem đơn.
        </p>
        <LookupOrderForm />
      </section>
    </div>
  );
}
