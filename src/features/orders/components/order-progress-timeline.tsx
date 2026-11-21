import {
  Check,
  CheckCircle2,
  Clock,
  PackageCheck,
  Truck,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { synthesizeStatusHistory } from "@/features/orders/order-state-machine";
import {
  ORDER_STATUS_LABELS,
  type Order,
  type OrderStatus,
  type OrderStatusEvent,
} from "@/features/orders/types";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";

type ActiveOrderStatus = Exclude<OrderStatus, "cancelled">;
type StepState = "done" | "current" | "upcoming";

interface TimelineStepConfig {
  status: ActiveOrderStatus;
  label: string;
  icon: LucideIcon;
}

const ACTIVE_STEPS: readonly TimelineStepConfig[] = [
  { status: "pending", label: ORDER_STATUS_LABELS.pending, icon: Clock },
  {
    status: "confirmed",
    label: ORDER_STATUS_LABELS.confirmed,
    icon: CheckCircle2,
  },
  { status: "shipping", label: ORDER_STATUS_LABELS.shipping, icon: Truck },
  {
    status: "delivered",
    label: ORDER_STATUS_LABELS.delivered,
    icon: PackageCheck,
  },
];

export function safeFormatDateTime(iso: string | undefined | null): string {
  if (typeof iso !== "string") return "—";
  const trimmed = iso.trim();
  if (trimmed.length === 0 || !/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return "—";
  }
  try {
    if (!Number.isFinite(Date.parse(trimmed))) return "—";
    return formatDateTime(trimmed);
  } catch {
    return "—";
  }
}

function resolveUpdatedOrCreatedTime(order: Order): string {
  const updatedTime = safeFormatDateTime(order.updatedAt);
  return updatedTime !== "—"
    ? updatedTime
    : safeFormatDateTime(order.createdAt);
}

function findLastTransitionEvent(
  events: readonly OrderStatusEvent[],
  status: OrderStatus,
): OrderStatusEvent | undefined {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const event = events[i];
    if (
      event &&
      (event.action ?? "transition") === "transition" &&
      event.status === status
    ) {
      return event;
    }
  }
  return undefined;
}

export function OrderProgressTimeline({ order }: { order: Order }) {
  const hasOriginalHistory =
    Array.isArray(order.statusHistory) && order.statusHistory.length > 0;
  const history = synthesizeStatusHistory(order);

  if (order.status === "cancelled") {
    const cancelEvent = hasOriginalHistory
      ? findLastTransitionEvent(history, "cancelled")
      : undefined;
    const cancelTitle =
      cancelEvent?.actor === "staff"
        ? "Đơn hàng đã bị hủy bởi Cửa hàng"
        : cancelEvent?.actor === "customer"
          ? "Đơn hàng đã bị hủy bởi Khách hàng"
          : "Đơn đã hủy";
    const eventCancelTime = safeFormatDateTime(cancelEvent?.at);
    const cancelTimestamp =
      eventCancelTime !== "—"
        ? eventCancelTime
        : resolveUpdatedOrCreatedTime(order);
    const cancelNote =
      cancelEvent &&
      typeof cancelEvent.note === "string" &&
      cancelEvent.note.trim().length > 0
        ? cancelEvent.note.trim()
        : null;

    return (
      <section
        aria-label="Tiến trình đơn hàng"
        className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
      >
        <h2 className="mb-4 text-base font-semibold text-slate-900">
          Tiến trình đơn hàng
        </h2>
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700"
        >
          <XCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1 space-y-1 text-sm break-words">
            <p className="font-semibold">{cancelTitle}</p>
            <p>Thời điểm: {cancelTimestamp}</p>
            {cancelNote && <p>Lý do: {cancelNote}</p>}
          </div>
        </div>
      </section>
    );
  }

  const rawIndex = ACTIVE_STEPS.findIndex(
    (step) => step.status === order.status,
  );
  const currentIndex = rawIndex >= 0 ? rawIndex : 0;
  const isDelivered = order.status === "delivered";

  return (
    <section
      aria-label="Tiến trình đơn hàng"
      className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
    >
      <h2 className="mb-4 text-base font-semibold text-slate-900">
        Tiến trình đơn hàng
      </h2>
      <ol className="flex flex-col">
        {ACTIVE_STEPS.map((step, idx) => {
          const stepState: StepState = isDelivered
            ? "done"
            : idx < currentIndex
              ? "done"
              : idx === currentIndex
                ? "current"
                : "upcoming";
          const isLast = idx === ACTIVE_STEPS.length - 1;
          const StepIcon = step.icon;
          const event =
            stepState === "upcoming"
              ? undefined
              : findLastTransitionEvent(history, step.status);
          const formattedEventTime = safeFormatDateTime(event?.at);
          const timeLabel =
            stepState === "upcoming"
              ? "Chưa hoàn tất"
              : formattedEventTime !== "—"
                ? formattedEventTime
                : step.status === "pending"
                  ? safeFormatDateTime(order.createdAt)
                  : step.status === order.status
                    ? resolveUpdatedOrCreatedTime(order)
                    : "—";
          const stepNote =
            event &&
            typeof event.note === "string" &&
            event.note.trim().length > 0
              ? event.note.trim()
              : null;

          return (
            <li
              key={step.status}
              data-step={step.status}
              data-state={stepState}
              aria-current={stepState === "current" ? "step" : undefined}
              className={cn("relative flex gap-3", !isLast && "pb-5")}
            >
              <div className="flex w-7 shrink-0 flex-col items-center">
                <span
                  className={cn(
                    "z-10 flex size-7 items-center justify-center rounded-full border-2",
                    stepState === "done" &&
                      "border-emerald-600 bg-emerald-50 text-emerald-700",
                    stepState === "current" &&
                      "border-indigo-600 bg-indigo-600 text-white ring-4 ring-indigo-50",
                    stepState === "upcoming" &&
                      "border-slate-300 bg-white text-slate-500",
                  )}
                >
                  {stepState === "done" ? (
                    <Check className="size-4" aria-hidden="true" />
                  ) : (
                    <StepIcon className="size-4" aria-hidden="true" />
                  )}
                </span>
                {!isLast && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "mt-1 min-h-5 w-0.5 flex-1",
                      stepState === "done" ? "bg-emerald-600" : "bg-slate-200",
                    )}
                  />
                )}
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p
                  className={cn(
                    "text-sm break-words",
                    stepState === "upcoming"
                      ? "font-medium text-slate-500"
                      : "font-semibold text-slate-900",
                  )}
                >
                  {step.label}
                </p>
                <p className="mt-0.5 text-xs text-slate-600">{timeLabel}</p>
                {stepNote && (
                  <p className="mt-1.5 inline-block max-w-full rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 break-words">
                    Ghi chú: {stepNote}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
