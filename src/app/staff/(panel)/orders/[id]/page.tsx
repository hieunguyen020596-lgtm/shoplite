import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireStaffPage } from "@/features/auth/page-guard";
import { ProductImage } from "@/features/catalog/components/product-image";
import { PAYMENT_OPTIONS } from "@/features/checkout/checkout-schema";
import { SHIPPING_OPTIONS } from "@/features/checkout/pricing";
import { OrderStatusBadge } from "@/features/orders/components/order-status-badge";
import { OrderError } from "@/features/orders/order-errors";
import { orderService } from "@/features/orders/server";
import {
  DEFAULT_STATUS_FILTER,
  staffOrdersQuerySchema,
} from "@/features/orders/staff-order-schema";
import type { Order } from "@/features/orders/types";
import { formatCurrency, formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

async function findOrder(id: string): Promise<Order | null> {
  try {
    return await orderService.getOrder(id);
  } catch (error) {
    if (error instanceof OrderError && error.code === "ORDER_NOT_FOUND")
      return null;
    throw error;
  }
}

// Không đọc dữ liệu đơn ở đây: tiêu đề chỉ dùng Mã đơn từ URL.
export async function generateMetadata({
  params,
}: PageProps<"/staff/orders/[id]">): Promise<Metadata> {
  return { title: `Đơn ${(await params).id}` };
}

export default async function StaffOrderDetailPage({
  params,
  searchParams,
}: PageProps<"/staff/orders/[id]">) {
  await requireStaffPage();

  const { id } = await params;
  const raw = await searchParams;
  const rawStatus = Array.isArray(raw.status) ? raw.status[0] : raw.status;
  const parsed = staffOrdersQuerySchema.safeParse({ status: rawStatus });
  const backStatus =
    (parsed.success && parsed.data.status) || DEFAULT_STATUS_FILTER;

  const order = await findOrder(id);
  if (!order) notFound();

  const { customer } = order;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      <Link
        href={`/staff?status=${backStatus}`}
        className="flex w-fit items-center gap-1 text-sm font-medium text-slate-600 hover:text-indigo-600"
      >
        <ArrowLeft className="size-4" /> Danh sách đơn
      </Link>

      <header>
        <h1 className="flex flex-wrap items-center gap-3 text-2xl font-bold">
          Đơn hàng <span className="tabular-nums">{order.id}</span>
          <OrderStatusBadge status={order.status} />
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Đặt lúc {formatDateTime(order.createdAt)}
        </p>
      </header>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-2 text-lg font-semibold">Sản phẩm</h2>
        <ul className="divide-y divide-slate-100">
          {order.items.map((item) => (
            <li key={item.productId} className="flex items-center gap-4 py-3">
              <div className="w-14 shrink-0">
                <ProductImage image={item.image} alt={item.name} size="sm" />
              </div>
              <div className="flex-1">
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-slate-500">
                  {formatCurrency(item.unitPrice)} × {item.quantity}
                </p>
              </div>
              <span className="font-semibold">
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
        <div className="rounded-2xl bg-white p-5 text-sm shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-2 text-base font-semibold">Người nhận</h2>
          <p className="font-medium">{customer.fullName}</p>
          <p className="text-slate-600">{customer.phone}</p>
          {customer.email && <p className="text-slate-600">{customer.email}</p>}
          <p className="mt-2 text-slate-600">{customer.address}</p>
          {customer.note && (
            <p className="mt-2 text-slate-500 italic">
              Ghi chú của khách: {customer.note}
            </p>
          )}
        </div>
        <div className="rounded-2xl bg-white p-5 text-sm shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-2 text-base font-semibold">
            Giao hàng & thanh toán
          </h2>
          <p>
            <span className="text-slate-500">Giao hàng: </span>
            {SHIPPING_OPTIONS[order.shippingMethod].label}
          </p>
          <p>
            <span className="text-slate-500">Thanh toán: </span>
            {PAYMENT_OPTIONS[order.paymentMethod].label}
          </p>
        </div>
      </section>
    </div>
  );
}
