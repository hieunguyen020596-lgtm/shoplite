import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CircleCheck } from "lucide-react";
import { ProductImage } from "@/features/catalog/components/product-image";
import { PAYMENT_OPTIONS } from "@/features/checkout/checkout-schema";
import { SHIPPING_OPTIONS } from "@/features/checkout/pricing";
import { CancelOrderButton } from "@/features/orders/components/cancel-order-button";
import {
  OrderProgressTimeline,
  safeFormatDateTime,
} from "@/features/orders/components/order-progress-timeline";
import { OrderStatusBadge } from "@/features/orders/components/order-status-badge";
import { RefreshStatusButton } from "@/features/orders/components/refresh-status-button";
import { OrderError } from "@/features/orders/order-errors";
import { orderService } from "@/features/orders/server";
import type { Order } from "@/features/orders/types";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

async function findOrder(id: string): Promise<Order | null> {
  try {
    return await orderService.getOrder(id);
  } catch (error) {
    if (error instanceof OrderError && error.code === "ORDER_NOT_FOUND") {
      return null;
    }
    throw error;
  }
}

export async function generateMetadata({
  params,
}: PageProps<"/orders/[id]">): Promise<Metadata> {
  return { title: `Đơn hàng ${(await params).id}` };
}

export default async function OrderDetailPage({
  params,
  searchParams,
}: PageProps<"/orders/[id]">) {
  const { id } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const rawPlaced = resolvedSearchParams.placed;
  const placed = Array.isArray(rawPlaced) ? rawPlaced[0] : rawPlaced;
  const order = await findOrder(id);
  if (!order) notFound();

  const shippingLabel =
    SHIPPING_OPTIONS[order.shippingMethod]?.label ?? order.shippingMethod;
  const paymentLabel =
    PAYMENT_OPTIONS[order.paymentMethod]?.label ?? order.paymentMethod;
  const items = Array.isArray(order.items) ? order.items : [];
  const customer = order.customer;
  const customerFullName =
    typeof customer?.fullName === "string" &&
    customer.fullName.trim().length > 0
      ? customer.fullName
      : "—";
  const customerPhone =
    typeof customer?.phone === "string" && customer.phone.trim().length > 0
      ? customer.phone
      : "—";
  const customerAddress =
    typeof customer?.address === "string" && customer.address.trim().length > 0
      ? customer.address
      : "—";
  const customerEmail =
    typeof customer?.email === "string" && customer.email.trim().length > 0
      ? customer.email
      : null;
  const customerNote =
    typeof customer?.note === "string" && customer.note.trim().length > 0
      ? customer.note
      : null;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      <Link
        href="/orders"
        className="inline-flex min-h-11 w-fit items-center gap-1 text-sm font-medium text-slate-600 hover:text-indigo-600"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Tất cả đơn hàng
      </Link>

      {placed === "1" && order.status === "pending" && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl bg-emerald-50 p-5 text-emerald-900 ring-1 ring-emerald-200"
        >
          <CircleCheck
            className="mt-0.5 size-6 shrink-0 text-emerald-600"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1 break-words">
            <p className="font-semibold">Đặt hàng thành công!</p>
            <p className="text-sm">
              Cảm ơn {customerFullName}. Chúng tôi sẽ gọi xác nhận qua số{" "}
              {customerPhone} trong thời gian sớm nhất.
            </p>
          </div>
        </div>
      )}

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 basis-64 flex-1">
          <h1 className="flex min-w-0 flex-wrap items-center gap-3 text-2xl font-bold break-words">
            Đơn hàng {order.id}
            <OrderStatusBadge status={order.status} />
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Đặt lúc {safeFormatDateTime(order.createdAt)}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-start">
          <RefreshStatusButton />
          {order.status === "pending" && (
            <CancelOrderButton orderId={order.id} />
          )}
        </div>
      </header>

      <OrderProgressTimeline order={order} />

      {(order.status === "confirmed" || order.status === "shipping") && (
        <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
          Đơn hàng đã được xác nhận — vui lòng liên hệ cửa hàng nếu cần hỗ trợ.
        </p>
      )}

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-2 text-lg font-semibold">Sản phẩm</h2>
        <ul className="divide-y divide-slate-100">
          {items.map((item, index) => (
            <li
              key={`${item.productId}-${index}`}
              className="flex items-center gap-4 py-3"
            >
              <Link href={`/products/${item.slug}`} className="w-14 shrink-0">
                <ProductImage image={item.image} alt={item.name} size="sm" />
              </Link>
              <div className="min-w-0 flex-1 break-words">
                <Link
                  href={`/products/${item.slug}`}
                  className="font-medium hover:text-indigo-600"
                >
                  {item.name}
                </Link>
                <p className="text-sm text-slate-500">
                  {formatCurrency(item.unitPrice)} × {item.quantity}
                </p>
              </div>
              <span className="shrink-0 font-semibold">
                {formatCurrency(item.lineTotal)}
              </span>
            </li>
          ))}
        </ul>
        <dl className="mt-2 flex flex-col gap-2 border-t border-slate-200 pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-600">Tạm tính</dt>
            <dd>{formatCurrency(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-600">Phí giao hàng</dt>
            <dd>
              {order.shippingFee === 0
                ? "Miễn phí"
                : formatCurrency(order.shippingFee)}
            </dd>
          </div>
          <div className="flex justify-between text-base">
            <dt className="font-semibold">Tổng cộng</dt>
            <dd className="font-bold text-indigo-700">
              {formatCurrency(order.total)}
            </dd>
          </div>
        </dl>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="min-w-0 rounded-2xl bg-white p-5 text-sm shadow-sm ring-1 ring-slate-200 break-words">
          <h2 className="mb-2 text-base font-semibold">Người nhận</h2>
          <p className="font-medium">{customerFullName}</p>
          <p className="text-slate-600">{customerPhone}</p>
          {customerEmail && <p className="text-slate-600">{customerEmail}</p>}
          <p className="mt-2 text-slate-600">{customerAddress}</p>
          {customerNote && (
            <p className="mt-2 text-slate-500 italic">
              Ghi chú: {customerNote}
            </p>
          )}
        </div>
        <div className="min-w-0 rounded-2xl bg-white p-5 text-sm shadow-sm ring-1 ring-slate-200 break-words">
          <h2 className="mb-2 text-base font-semibold">
            Giao hàng & thanh toán
          </h2>
          <p>
            <span className="text-slate-500">Giao hàng: </span>
            {shippingLabel}
          </p>
          <p>
            <span className="text-slate-500">Thanh toán: </span>
            {paymentLabel}
          </p>
          {order.paymentMethod === "bank_transfer" &&
            order.status === "pending" && (
              <p className="mt-3 rounded-xl bg-slate-50 p-3 text-slate-600">
                Vui lòng chuyển khoản {formatCurrency(order.total)} tới STK{" "}
                <strong>0123456789</strong> (Ngân hàng Demo) với nội dung{" "}
                <strong>{order.id}</strong>.
              </p>
            )}
        </div>
      </section>
    </div>
  );
}
