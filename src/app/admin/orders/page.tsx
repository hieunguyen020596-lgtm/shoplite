import type { Metadata } from "next";
import { AdminHeaderBar } from "@/features/orders/components/admin-header-bar";
import { AdminOrdersView } from "@/features/orders/components/admin-orders-view";
import { orderService } from "@/features/orders/server";
import { normalizeFilterStatus } from "@/features/orders/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vận hành đơn hàng",
};

export default async function AdminOrdersPage({
  searchParams,
}: PageProps<"/admin/orders">) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const rawStatus = resolvedSearchParams.status;
  const status = Array.isArray(rawStatus) ? rawStatus[0] : rawStatus;
  const rawQ = resolvedSearchParams.q;
  const q = Array.isArray(rawQ) ? rawQ[0] : rawQ;

  const normalizedStatus = normalizeFilterStatus(status);
  const normalizedQ = typeof q === "string" ? q.trim() : "";
  const data = await orderService
    .listAdminOrders({ status: normalizedStatus, q: normalizedQ })
    .catch(() => undefined);

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeaderBar />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <AdminOrdersView
          initialData={data}
          initialStatus={normalizedStatus}
          initialQuery={normalizedQ}
        />
      </main>
    </div>
  );
}
