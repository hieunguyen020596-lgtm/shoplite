import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { requireStaffPage } from "@/features/auth/page-guard";
import { StaffOrderCard } from "@/features/orders/components/staff-order-card";
import { StaffOrderSearch } from "@/features/orders/components/staff-order-search";
import { orderService } from "@/features/orders/server";
import {
  DEFAULT_STATUS_FILTER,
  QUEUE_CHIPS,
  staffOrdersQuerySchema,
} from "@/features/orders/staff-order-schema";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Danh sách đơn" };

// Luôn đọc đơn mới nhất ở mỗi request.
export const dynamic = "force-dynamic";

export default async function StaffHomePage({
  searchParams,
}: PageProps<"/staff">) {
  await requireStaffPage();

  const raw = await searchParams;
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  const parsed = staffOrdersQuerySchema.safeParse({
    status: first(raw.status),
    q: first(raw.q) || undefined,
  });
  // Trang không trả 400: status sai thì quay về chip mặc định.
  const status =
    (parsed.success && parsed.data.status) || DEFAULT_STATUS_FILTER;
  const q = parsed.success ? parsed.data.q : undefined;

  const counts = await orderService.countByFilter();
  const matches = q ? await orderService.searchOrders(q) : null;

  // Đúng một đơn khớp mã thì chuyển thẳng tới chi tiết.
  if (matches?.length === 1)
    redirect(`/staff/orders/${matches[0].id}?status=${status}`);

  const orders = matches ?? (await orderService.listOrders({ status }));
  const clearHref = `/staff?status=${status}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-bold">Danh sách đơn</h1>

      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <nav
          aria-label="Lọc theo trạng thái"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 md:order-first md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
        >
          {QUEUE_CHIPS.map(({ filter, label }) => {
            const selected = !matches && filter === status;
            return (
              <Link
                key={filter}
                href={`/staff?status=${filter}`}
                aria-current={selected ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold whitespace-nowrap",
                  selected
                    ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
                    : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50",
                )}
              >
                {label}
                <span className="text-xs font-normal tabular-nums">
                  {counts[filter] ?? 0}
                </span>
              </Link>
            );
          })}
        </nav>
        <StaffOrderSearch
          key={q ?? ""}
          status={status}
          defaultValue={q}
          notFoundMessage={
            matches?.length === 0 ? "Không có đơn nào có mã này" : undefined
          }
        />
      </div>

      {matches && matches.length > 1 && (
        <div className="mb-3 flex items-center justify-between">
          <p role="status" className="text-sm text-slate-600">
            {matches.length} đơn khớp mã “{q}”
          </p>
          <Link
            href={clearHref}
            className="text-sm font-semibold text-indigo-600 hover:underline"
          >
            Xóa tìm kiếm
          </Link>
        </div>
      )}

      {matches?.length === 0 ? null : orders.length === 0 ? (
        status === "pending" ? (
          <EmptyState emoji="✅" title="Không còn đơn chờ xác nhận" />
        ) : (
          <EmptyState emoji="📦" title="Không có đơn nào ở trạng thái này" />
        )
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {orders.map((order) => (
            <li key={order.id}>
              <StaffOrderCard order={order} backStatus={status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
