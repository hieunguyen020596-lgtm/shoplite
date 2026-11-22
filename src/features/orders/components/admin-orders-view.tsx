"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  PackageCheck,
  Search,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { AdminOrderListResult } from "@/features/orders/order-service";
import {
  normalizeFilterStatus,
  ORDER_STATUS_LABELS,
  type Order,
  type OrderFilterStatus,
  type OrderStatus,
} from "@/features/orders/types";
import { cn } from "@/lib/cn";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { ApiErrorBody } from "@/lib/http";
import { OrderStatusBadge } from "./order-status-badge";

export { normalizeFilterStatus, type OrderFilterStatus };

const SYSTEM_ERROR_MESSAGE = "Có lỗi hệ thống xảy ra. Vui lòng thử lại sau.";
const NETWORK_ERROR_MESSAGE =
  "Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.";
const CONFLICT_ERROR_MESSAGE =
  "Đơn hàng vừa được cập nhật bởi thao tác khác. Danh sách đã được làm mới.";

const FILTER_TABS: readonly { key: OrderFilterStatus; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "pending", label: ORDER_STATUS_LABELS.pending },
  { key: "confirmed", label: ORDER_STATUS_LABELS.confirmed },
  { key: "shipping", label: ORDER_STATUS_LABELS.shipping },
  { key: "delivered", label: ORDER_STATUS_LABELS.delivered },
  { key: "cancelled", label: ORDER_STATUS_LABELS.cancelled },
];

export const QUICK_CANCEL_REASONS = [
  "Hết hàng thực tế",
  "Khách yêu cầu hủy qua điện thoại",
  "Giao hàng thất bại / Khách không nhận",
] as const;

const ACTIVE_RESERVATION_STATUSES: ReadonlySet<OrderStatus> = new Set([
  "pending",
  "confirmed",
  "shipping",
]);

const DEFAULT_COUNTS: Record<OrderFilterStatus, number> = {
  all: 0,
  pending: 0,
  confirmed: 0,
  shipping: 0,
  delivered: 0,
  cancelled: 0,
};

const SEARCH_DEBOUNCE_MS = 250;

function buildAdminOrdersQueryString(
  status: OrderFilterStatus,
  q: string,
): string {
  const params = new URLSearchParams();
  params.set("status", status);
  const trimmedQ = q.trim();
  if (trimmedQ.length > 0) {
    params.set("q", trimmedQ);
  }
  const serialized = params.toString();
  return serialized.length > 0 ? `?${serialized}` : "";
}

function normalizeListResult(
  raw?: Partial<AdminOrderListResult> | null,
): AdminOrderListResult {
  return {
    orders: Array.isArray(raw?.orders) ? raw.orders : [],
    counts: {
      all: raw?.counts?.all ?? 0,
      pending: raw?.counts?.pending ?? 0,
      confirmed: raw?.counts?.confirmed ?? 0,
      shipping: raw?.counts?.shipping ?? 0,
      delivered: raw?.counts?.delivered ?? 0,
      cancelled: raw?.counts?.cancelled ?? 0,
    },
    availableStockByProductId:
      raw?.availableStockByProductId &&
      typeof raw.availableStockByProductId === "object"
        ? raw.availableStockByProductId
        : {},
  };
}

function safeFormatDateTime(iso?: string | null): string {
  if (typeof iso !== "string" || iso.trim().length === 0) {
    return "—";
  }
  try {
    return formatDateTime(iso);
  } catch {
    return iso;
  }
}

function findLatestStatusNote(order: Order): string | undefined {
  if (!Array.isArray(order.statusHistory)) {
    return undefined;
  }
  for (let i = order.statusHistory.length - 1; i >= 0; i -= 1) {
    const event = order.statusHistory[i];
    if (!event || event.action === "restock") {
      continue;
    }
    if (
      order.status === "cancelled" &&
      (event.status !== "cancelled" ||
        (event.action !== undefined && event.action !== "transition"))
    ) {
      continue;
    }
    if (typeof event.note === "string" && event.note.trim().length > 0) {
      return event.note.trim();
    }
  }
  return undefined;
}

export interface OrderFilterTabsProps {
  activeStatus: OrderFilterStatus;
  counts: Record<OrderFilterStatus, number>;
  onSelect: (status: OrderFilterStatus) => void;
}

export function OrderFilterTabs({
  activeStatus,
  counts,
  onSelect,
}: OrderFilterTabsProps) {
  return (
    <nav
      aria-label="Lọc theo trạng thái đơn hàng"
      className="flex flex-nowrap gap-2 overflow-x-auto pb-1"
    >
      {FILTER_TABS.map((tab) => {
        const isActive = activeStatus === tab.key;
        const count = counts?.[tab.key] ?? 0;

        return (
          <button
            key={tab.key}
            type="button"
            aria-pressed={isActive}
            onClick={() => onSelect(tab.key)}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold whitespace-nowrap transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600",
              isActive
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            )}
          >
            <span>{tab.label}</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                isActive
                  ? "bg-white/20 text-white"
                  : "bg-slate-100 text-slate-600",
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

export interface AdminOrderSearchBarProps {
  value: string;
  onChange: (nextValue: string) => void;
  onSubmit?: (value: string) => void;
  onClear?: () => void;
}

export function AdminOrderSearchBar({
  value,
  onChange,
  onSubmit,
  onClear,
}: AdminOrderSearchBarProps) {
  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit?.(value);
  }

  function handleClear() {
    if (onClear) {
      onClear();
    } else {
      onChange("");
    }
  }

  return (
    <form
      role="search"
      onSubmit={handleFormSubmit}
      className="relative flex w-full items-center sm:max-w-sm"
    >
      <Search
        className="pointer-events-none absolute left-3.5 size-4 text-slate-400"
        aria-hidden="true"
      />
      <input
        type="search"
        aria-label="Tìm kiếm đơn hàng"
        placeholder="Tìm mã SL-..., SĐT hoặc tên khách..."
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-xl border border-slate-300 bg-white py-2 pr-11 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 [&::-webkit-search-cancel-button]:hidden"
      />
      {value.length > 0 && (
        <button
          type="button"
          aria-label="Xóa từ khóa tìm kiếm"
          onClick={handleClear}
          className="absolute right-1 inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          ✕
        </button>
      )}
    </form>
  );
}

export interface ReservedStockIndicatorProps {
  orderStatus: OrderStatus;
  quantity: number;
  availableStock: number;
}

export function ReservedStockIndicator({
  orderStatus,
  quantity,
  availableStock,
}: ReservedStockIndicatorProps) {
  if (!ACTIVE_RESERVATION_STATUSES.has(orderStatus)) {
    return null;
  }

  const safeQuantity = Number.isFinite(quantity)
    ? Math.max(0, Math.trunc(quantity))
    : 0;
  const safeAvailable = Number.isFinite(availableStock)
    ? Math.max(0, Math.trunc(availableStock))
    : 0;

  const tier =
    safeAvailable > 5
      ? {
          containerClass:
            "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
          Icon: CheckCircle2,
        }
      : safeAvailable >= 1
        ? {
            containerClass:
              "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200",
            Icon: AlertTriangle,
          }
        : {
            containerClass:
              "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200",
            Icon: XCircle,
          };

  const { Icon, containerClass } = tier;

  return (
    <div
      role="status"
      className={cn(
        "inline-flex flex-wrap items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold",
        containerClass,
      )}
    >
      <span className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-bold text-slate-900 tabular-nums">
        ✓ Đã giữ {safeQuantity} cho đơn này
      </span>
      <span className="inline-flex items-center gap-1 tabular-nums">
        <span aria-hidden="true">·</span>
        <Icon className="size-3.5 shrink-0" aria-hidden="true" />
        <span>Còn cho đơn mới: {safeAvailable}</span>
      </span>
    </div>
  );
}

export function RestockStatusBadge({
  inventoryRestocked,
}: {
  inventoryRestocked?: boolean;
}) {
  if (inventoryRestocked === false) {
    return (
      <span
        data-testid="restock-pending-badge"
        className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200 ring-inset"
      >
        <Clock className="size-3 shrink-0" aria-hidden="true" />
        Chờ nhận hàng hoàn
      </span>
    );
  }

  if (inventoryRestocked === true) {
    return (
      <span
        data-testid="restocked-badge"
        className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 ring-inset"
      >
        <PackageCheck className="size-3 shrink-0" aria-hidden="true" />
        Đã hoàn kho
      </span>
    );
  }

  return null;
}

export interface CancelOrderDialogProps {
  order: Order | null;
  open?: boolean;
  pending?: boolean;
  errorMessage?: string | null;
  openerRef?: RefObject<HTMLElement | null>;
  fallbackFocusRef?: RefObject<HTMLElement | null>;
  onClose: () => void;
  onConfirm: (note: string) => void | Promise<void>;
}

export function CancelOrderDialog(props: CancelOrderDialogProps) {
  const { order, open = true } = props;
  if (!open || !order) {
    return null;
  }

  return <CancelOrderDialogContent key={order.id} {...props} order={order} />;
}

function CancelOrderDialogContent({
  order,
  pending = false,
  errorMessage = null,
  openerRef,
  fallbackFocusRef,
  onClose,
  onConfirm,
}: CancelOrderDialogProps & { order: Order }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const pendingRef = useRef(pending);
  const submittingRef = useRef(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    pendingRef.current = pending;
    onCloseRef.current = onClose;
  }, [pending, onClose]);

  const [note, setNote] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  function restoreOpenerFocus() {
    const target = openerRef?.current ?? previousActiveElementRef.current;
    if (target && target.isConnected && typeof target.focus === "function") {
      target.focus();
      return;
    }
    const fallback = fallbackFocusRef?.current;
    if (
      fallback &&
      fallback.isConnected &&
      typeof fallback.focus === "function"
    ) {
      fallback.focus();
    }
  }

  useEffect(() => {
    previousActiveElementRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    textareaRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (pendingRef.current || submittingRef.current) {
          event.preventDefault();
          return;
        }
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        );
        if (focusable.length === 0) {
          event.preventDefault();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active =
          document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        if (event.shiftKey) {
          if (
            !active ||
            !dialogRef.current.contains(active) ||
            active === first
          ) {
            event.preventDefault();
            last.focus();
          }
        } else {
          if (
            !active ||
            !dialogRef.current.contains(active) ||
            active === last
          ) {
            event.preventDefault();
            first.focus();
          }
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreOpenerFocus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayedError = validationError ?? errorMessage;
  const titleId = `cancel-order-dialog-title-${order.id}`;
  const hintId = `cancel-order-note-hint-${order.id}`;
  const errorId = `cancel-order-note-error-${order.id}`;

  function handleChipClick(reason: string) {
    if (pending || pendingRef.current || submittingRef.current) {
      return;
    }
    setNote(reason);
    setValidationError(null);
    textareaRef.current?.focus();
  }

  function handleCloseClick() {
    if (pending || pendingRef.current || submittingRef.current) {
      return;
    }
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || pendingRef.current || submittingRef.current) {
      return;
    }

    const trimmed = note.trim();
    if (trimmed.length === 0) {
      setValidationError("Vui lòng nhập lý do hủy đơn hàng");
      textareaRef.current?.focus();
      return;
    }

    if (trimmed.length > 200) {
      setValidationError("Lý do hủy đơn tối đa 200 ký tự");
      textareaRef.current?.focus();
      return;
    }

    setValidationError(null);
    pendingRef.current = true;
    submittingRef.current = true;
    try {
      await onConfirm(trimmed);
    } finally {
      submittingRef.current = false;
      pendingRef.current = pending;
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/45 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="my-auto flex max-h-[calc(100dvh-2rem)] w-full max-w-[440px] flex-col gap-3.5 overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
      >
        <h2 id={titleId} className="text-lg font-bold text-slate-900">
          Hủy đơn {order.id}
        </h2>

        {order.status === "shipping" && (
          <div
            role="alert"
            className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-800"
          >
            <strong className="font-semibold">Lưu ý tồn kho:</strong> Hủy đơn
            đang giao sẽ{" "}
            <strong className="font-semibold">
              không tự động cộng lại tồn kho
            </strong>
            . Bạn sẽ xác nhận cộng lại kho sau khi shipper trả hàng thực tế về
            kệ.
          </div>
        )}

        <div>
          <p className="mb-2 text-xs font-semibold text-slate-700">
            Chọn nhanh lý do (có thể sửa lại bên dưới):
          </p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_CANCEL_REASONS.map((reason) => {
              const isSelected = note === reason;
              return (
                <button
                  key={reason}
                  type="button"
                  aria-pressed={isSelected}
                  disabled={pending}
                  onClick={() => handleChipClick(reason)}
                  className={cn(
                    "inline-flex min-h-11 items-center rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600",
                    "disabled:pointer-events-none disabled:opacity-50",
                    isSelected
                      ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                      : "border-slate-300 bg-slate-100 text-slate-900 hover:bg-slate-200",
                  )}
                >
                  {reason}
                </button>
              );
            })}
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3.5"
          noValidate
        >
          <div>
            <label
              htmlFor="cancel-order-note"
              className="mb-1.5 block text-sm font-semibold text-slate-900"
            >
              Lý do hủy đơn (bắt buộc)
            </label>
            <textarea
              ref={textareaRef}
              id="cancel-order-note"
              rows={3}
              value={note}
              readOnly={pending}
              aria-invalid={Boolean(displayedError)}
              aria-describedby={
                displayedError ? `${hintId} ${errorId}` : hintId
              }
              onChange={(event) => {
                setNote(event.target.value);
                if (validationError) {
                  setValidationError(null);
                }
              }}
              placeholder="Nhập hoặc chọn nhanh lý do hủy đơn..."
              className="min-h-[84px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            />
            <div className="mt-1 flex items-center justify-between gap-2 text-xs text-slate-500">
              <span id={hintId}>
                Tối đa 200 ký tự · Lưu bất biến vào lịch sử đơn
              </span>
              <span className="shrink-0 tabular-nums whitespace-nowrap">
                {note.length} / 200
              </span>
            </div>
          </div>

          {displayedError && (
            <div
              id={errorId}
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
            >
              {displayedError}
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCloseClick}
              disabled={pending}
              className="min-h-11 h-auto w-full sm:w-auto"
            >
              Quay lại
            </Button>
            <Button
              type="submit"
              variant="danger"
              disabled={pending}
              aria-busy={pending}
              className="min-h-11 h-auto w-full sm:w-auto"
            >
              {pending ? "Đang hủy…" : "Xác nhận hủy đơn"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export type PendingOrderAction =
  "confirm" | "ship" | "deliver" | "cancel" | "restock";

export interface AdminOrderCardProps {
  order: Order;
  availableStockByProductId: Record<string, number>;
  isPending?: boolean;
  pendingAction?: PendingOrderAction | null;
  shippingNote?: string;
  onShippingNoteChange?: (orderId: string, value: string) => void;
  onTransitionStatus: (
    order: Order,
    nextStatus: OrderStatus,
    action: PendingOrderAction,
    note?: string,
  ) => void | Promise<void>;
  onOpenCancelDialog: (
    order: Order,
    openerElement: HTMLButtonElement | null,
  ) => void;
  onRestockOrder: (order: Order) => void | Promise<void>;
}

export function AdminOrderCard({
  order,
  availableStockByProductId,
  isPending = false,
  pendingAction = null,
  shippingNote: controlledShippingNote,
  onShippingNoteChange,
  onTransitionStatus,
  onOpenCancelDialog,
  onRestockOrder,
}: AdminOrderCardProps) {
  const [localShippingNote, setLocalShippingNote] = useState("");
  const shippingNote =
    controlledShippingNote !== undefined
      ? controlledShippingNote
      : localShippingNote;

  const latestNote = findLatestStatusNote(order);
  const paymentLabel = order.paymentMethod === "cod" ? "COD" : "Chuyển khoản";
  const shippingInputId = `shipping-note-${order.id}`;
  const customerName =
    typeof order.customer?.fullName === "string" &&
    order.customer.fullName.trim().length > 0
      ? order.customer.fullName
      : "Khách hàng";
  const customerPhone =
    typeof order.customer?.phone === "string" &&
    order.customer.phone.trim().length > 0
      ? order.customer.phone
      : "—";
  const items = Array.isArray(order.items) ? order.items : [];

  function handleShippingNoteInput(nextValue: string) {
    if (onShippingNoteChange) {
      onShippingNoteChange(order.id, nextValue);
    } else {
      setLocalShippingNote(nextValue);
    }
  }

  function handleConfirmOrder() {
    if (isPending) {
      return;
    }
    void onTransitionStatus(order, "confirmed", "confirm");
  }

  function handleShipOrder() {
    if (isPending) {
      return;
    }
    const trimmedNote = shippingNote.trim();
    void onTransitionStatus(
      order,
      "shipping",
      "ship",
      trimmedNote.length > 0 ? trimmedNote : undefined,
    );
  }

  function handleDeliverOrder() {
    if (isPending) {
      return;
    }
    void onTransitionStatus(order, "delivered", "deliver");
  }

  function handleRestock() {
    if (isPending) {
      return;
    }
    void onRestockOrder(order);
  }

  const showCancelButton =
    order.status === "pending" ||
    order.status === "confirmed" ||
    order.status === "shipping";
  const showRestockButton =
    order.status === "cancelled" && order.inventoryRestocked === false;
  const hasFooterActions =
    order.status === "pending" ||
    order.status === "confirmed" ||
    order.status === "shipping" ||
    showRestockButton;

  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 break-words shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-bold text-slate-900">
              {order.id}
            </span>
            <OrderStatusBadge status={order.status} />
            {order.status === "cancelled" && (
              <RestockStatusBadge
                inventoryRestocked={order.inventoryRestocked}
              />
            )}
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {customerName} · {customerPhone} ·{" "}
            {safeFormatDateTime(order.createdAt)} · {paymentLabel}
          </p>
          {latestNote && (
            <p className="mt-1 text-xs font-medium text-slate-600">
              {order.status === "cancelled"
                ? `Lý do hủy: ${latestNote}`
                : `Ghi chú: ${latestNote}`}
            </p>
          )}
        </div>
        <div className="text-base font-bold text-indigo-700 tabular-nums">
          {formatCurrency(order.total)}
        </div>
      </div>

      <div className="flex flex-col gap-2.5 border-y border-slate-100 py-2.5">
        {items.map((item, index) => {
          const rawStock = availableStockByProductId?.[item.productId];
          const availableStock =
            typeof rawStock === "number" && Number.isFinite(rawStock)
              ? Math.max(0, Math.trunc(rawStock))
              : 0;

          return (
            <div
              key={`${item.productId}-${index}`}
              className="flex flex-wrap items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">
                  {item.name}
                </div>
                <div className="text-xs text-slate-600 tabular-nums">
                  {formatCurrency(item.unitPrice)} × {item.quantity}
                </div>
              </div>
              <ReservedStockIndicator
                orderStatus={order.status}
                quantity={item.quantity}
                availableStock={availableStock}
              />
            </div>
          );
        })}
      </div>

      {hasFooterActions && (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          {order.status === "confirmed" && (
            <div className="min-w-0 flex-1 sm:min-w-[240px]">
              <label
                htmlFor={shippingInputId}
                className="mb-1 block text-xs font-semibold text-slate-600"
              >
                Ghi chú vận chuyển / mã vận đơn (tùy chọn)
              </label>
              <input
                id={shippingInputId}
                type="text"
                maxLength={200}
                value={shippingNote}
                disabled={isPending}
                onChange={(event) =>
                  handleShippingNoteInput(event.target.value)
                }
                placeholder="VD: Mã vận đơn GHN-882910"
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-slate-100"
              />
            </div>
          )}

          <div className="flex flex-col gap-2 sm:ml-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            {showCancelButton && (
              <button
                type="button"
                disabled={isPending}
                onClick={(event) =>
                  onOpenCancelDialog(order, event.currentTarget)
                }
                className="inline-flex min-h-11 h-auto w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 disabled:pointer-events-none disabled:opacity-50 sm:w-auto"
              >
                Hủy đơn
              </button>
            )}

            {order.status === "pending" && (
              <Button
                type="button"
                variant="primary"
                disabled={isPending}
                aria-busy={isPending && pendingAction === "confirm"}
                onClick={handleConfirmOrder}
                className="min-h-11 h-auto w-full sm:w-auto"
              >
                {isPending && pendingAction === "confirm"
                  ? "Đang xác nhận…"
                  : "Xác nhận đơn"}
              </Button>
            )}

            {order.status === "confirmed" && (
              <Button
                type="button"
                variant="primary"
                disabled={isPending}
                aria-busy={isPending && pendingAction === "ship"}
                onClick={handleShipOrder}
                className="min-h-11 h-auto w-full sm:w-auto"
              >
                {isPending && pendingAction === "ship"
                  ? "Đang xử lý…"
                  : "Bàn giao giao hàng"}
              </Button>
            )}

            {order.status === "shipping" && (
              <Button
                type="button"
                variant="primary"
                disabled={isPending}
                aria-busy={isPending && pendingAction === "deliver"}
                onClick={handleDeliverOrder}
                className="min-h-11 h-auto w-full sm:w-auto"
              >
                {isPending && pendingAction === "deliver"
                  ? "Đang xử lý…"
                  : "Đánh dấu đã giao"}
              </Button>
            )}

            {showRestockButton && (
              <Button
                type="button"
                variant="primary"
                disabled={isPending}
                aria-busy={isPending && pendingAction === "restock"}
                onClick={handleRestock}
                className="min-h-11 h-auto w-full sm:w-auto"
              >
                {isPending && pendingAction === "restock"
                  ? "Đang xử lý…"
                  : "Xác nhận đã nhận hàng hoàn (+kho)"}
              </Button>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

export interface AdminOrdersViewProps {
  initialData?: AdminOrderListResult;
  initialStatus?: string;
  initialQuery?: string;
}

export function AdminOrdersView({
  initialData,
  initialStatus,
  initialQuery = "",
}: AdminOrdersViewProps) {
  const router = useRouter();
  const initialNormalizedStatus = normalizeFilterStatus(initialStatus);

  const [activeStatus, setActiveStatus] = useState<OrderFilterStatus>(
    initialNormalizedStatus,
  );
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [appliedQuery, setAppliedQuery] = useState(initialQuery);
  const [data, setData] = useState<AdminOrderListResult>(() =>
    normalizeListResult(initialData),
  );
  const [isLoading, setIsLoading] = useState(!initialData);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingOrderAction | null>(
    null,
  );
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [shippingNotesByOrderId, setShippingNotesByOrderId] = useState<
    Record<string, string>
  >({});

  const activeStatusRef = useRef<OrderFilterStatus>(initialNormalizedStatus);
  const searchInputRef = useRef(initialQuery);
  const appliedQueryRef = useRef(initialQuery);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchAbortRef = useRef<AbortController | null>(null);
  const requestSeqRef = useRef(0);
  const mutatingOrderIdRef = useRef<string | null>(null);
  const cancelOpenerRef = useRef<HTMLElement | null>(null);
  const listRegionRef = useRef<HTMLDivElement | null>(null);
  const hasMountedRef = useRef(false);
  const [prevSyncedProps, setPrevSyncedProps] = useState({
    initialData,
    initialStatus,
    initialQuery,
  });

  if (
    prevSyncedProps.initialData !== initialData ||
    prevSyncedProps.initialStatus !== initialStatus ||
    prevSyncedProps.initialQuery !== initialQuery
  ) {
    setPrevSyncedProps({ initialData, initialStatus, initialQuery });
    setActiveStatus(initialNormalizedStatus);
    setSearchInput(initialQuery);
    setAppliedQuery(initialQuery);
    if (initialData !== undefined) {
      setData(normalizeListResult(initialData));
      setIsLoading(false);
    }
  }

  function clearDebounceTimer() {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }

  function cancelPendingGetRequests() {
    clearDebounceTimer();
    fetchAbortRef.current?.abort();
    fetchAbortRef.current = null;
    requestSeqRef.current += 1;
    setIsLoading(false);
    searchInputRef.current = appliedQueryRef.current;
    setSearchInput(appliedQueryRef.current);
  }

  function handleShippingNoteChange(orderId: string, value: string) {
    setShippingNotesByOrderId((prev) => ({
      ...prev,
      [orderId]: value,
    }));
  }

  async function fetchOrders(
    status: OrderFilterStatus,
    query: string,
    options?: { preserveBanner?: boolean },
  ) {
    fetchAbortRef.current?.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;
    const seq = ++requestSeqRef.current;

    setIsLoading(true);
    if (!options?.preserveBanner) {
      setBannerError(null);
    }

    const qs = buildAdminOrdersQueryString(status, query);

    try {
      const response = await fetch(`/api/admin/orders${qs}`, {
        method: "GET",
        signal: controller.signal,
        cache: "no-store",
      });

      if (controller.signal.aborted || seq !== requestSeqRef.current) {
        return;
      }

      if (response.status === 401) {
        router.push("/admin/login?expired=1");
        return;
      }

      if (!response.ok) {
        const body = (await response
          .json()
          .catch(() => null)) as ApiErrorBody | null;
        if (controller.signal.aborted || seq !== requestSeqRef.current) {
          return;
        }
        if (
          response.status === 503 ||
          body?.error?.code === "ADMIN_NOT_CONFIGURED"
        ) {
          router.push("/admin/login");
          return;
        }
        const message =
          response.status >= 500
            ? SYSTEM_ERROR_MESSAGE
            : typeof body?.error?.message === "string" &&
                body.error.message.trim().length > 0
              ? body.error.message
              : SYSTEM_ERROR_MESSAGE;
        setBannerError(message);
        setIsLoading(false);
        return;
      }

      const json = (await response
        .json()
        .catch(() => null)) as AdminOrderListResult | null;
      if (
        controller.signal.aborted ||
        seq !== requestSeqRef.current ||
        mutatingOrderIdRef.current !== null
      ) {
        return;
      }

      setData(normalizeListResult(json));
      setIsLoading(false);
    } catch (error) {
      if (
        controller.signal.aborted ||
        (error instanceof Error && error.name === "AbortError") ||
        seq !== requestSeqRef.current
      ) {
        return;
      }
      setBannerError(NETWORK_ERROR_MESSAGE);
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!initialData) {
      void fetchOrders(activeStatusRef.current, appliedQueryRef.current);
    }
    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
      fetchAbortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    clearDebounceTimer();
    activeStatusRef.current = normalizeFilterStatus(initialStatus);
    searchInputRef.current = initialQuery;
    appliedQueryRef.current = initialQuery;
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (initialData !== undefined) {
      fetchAbortRef.current?.abort();
      fetchAbortRef.current = null;
      requestSeqRef.current += 1;
    } else {
      void fetchOrders(activeStatusRef.current, appliedQueryRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData, initialStatus, initialQuery]);

  function syncUrlAndFetch(nextStatus: OrderFilterStatus, nextQuery: string) {
    activeStatusRef.current = nextStatus;
    appliedQueryRef.current = nextQuery;
    setActiveStatus(nextStatus);
    setAppliedQuery(nextQuery);

    const qs = buildAdminOrdersQueryString(nextStatus, nextQuery);
    router.replace(`/admin/orders${qs}`, { scroll: false });
    void fetchOrders(nextStatus, nextQuery);
  }

  function handleSelectTab(nextStatus: OrderFilterStatus) {
    clearDebounceTimer();
    syncUrlAndFetch(nextStatus, searchInputRef.current);
  }

  function handleSearchChange(nextValue: string) {
    searchInputRef.current = nextValue;
    setSearchInput(nextValue);
    clearDebounceTimer();
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      if (nextValue.trim() === appliedQueryRef.current.trim()) {
        return;
      }
      syncUrlAndFetch(activeStatusRef.current, nextValue);
    }, SEARCH_DEBOUNCE_MS);
  }

  function handleSearchSubmit(submittedValue: string) {
    const hadPendingDebounce = debounceTimerRef.current !== null;
    clearDebounceTimer();
    searchInputRef.current = submittedValue;
    setSearchInput(submittedValue);
    if (
      hadPendingDebounce ||
      submittedValue.trim() !== appliedQueryRef.current.trim()
    ) {
      syncUrlAndFetch(activeStatusRef.current, submittedValue);
    }
  }

  function handleSearchClear() {
    clearDebounceTimer();
    searchInputRef.current = "";
    setSearchInput("");
    if (appliedQueryRef.current.trim().length > 0) {
      syncUrlAndFetch(activeStatusRef.current, "");
    }
  }

  function handleResetFilters() {
    clearDebounceTimer();
    searchInputRef.current = "";
    setSearchInput("");
    syncUrlAndFetch("all", "");
  }

  function applyUpdatedOrderToState(previousOrder: Order, updatedOrder: Order) {
    if (updatedOrder.status !== "confirmed") {
      setShippingNotesByOrderId((prev) => {
        if (!(previousOrder.id in prev)) {
          return prev;
        }
        const next = { ...prev };
        delete next[previousOrder.id];
        return next;
      });
    }

    setData((prev) => {
      const nextCounts = { ...prev.counts };
      if (updatedOrder.status !== previousOrder.status) {
        nextCounts[previousOrder.status] = Math.max(
          0,
          (nextCounts[previousOrder.status] ?? 0) - 1,
        );
        nextCounts[updatedOrder.status] =
          (nextCounts[updatedOrder.status] ?? 0) + 1;
      }

      const currentTab = activeStatusRef.current;
      const nextOrders = prev.orders
        .map((item) => (item.id === previousOrder.id ? updatedOrder : item))
        .filter((item) => currentTab === "all" || item.status === currentTab);

      let nextAvailableStock = prev.availableStockByProductId;
      const hadOriginalHistory =
        Array.isArray(previousOrder.statusHistory) &&
        previousOrder.statusHistory.length > 0;
      const didRestockInventory =
        hadOriginalHistory &&
        updatedOrder.status === "cancelled" &&
        previousOrder.inventoryRestocked !== true &&
        updatedOrder.inventoryRestocked === true;
      const sourceItems = Array.isArray(updatedOrder.items)
        ? updatedOrder.items
        : Array.isArray(previousOrder.items)
          ? previousOrder.items
          : [];

      if (didRestockInventory && sourceItems.length > 0) {
        nextAvailableStock = { ...prev.availableStockByProductId };
        for (const item of sourceItems) {
          if (
            item &&
            typeof item.productId === "string" &&
            typeof item.quantity === "number" &&
            Number.isFinite(item.quantity) &&
            item.quantity > 0
          ) {
            const currentStock = nextAvailableStock[item.productId];
            const baseStock =
              typeof currentStock === "number" && Number.isFinite(currentStock)
                ? Math.max(0, Math.trunc(currentStock))
                : 0;
            nextAvailableStock[item.productId] =
              baseStock + Math.trunc(item.quantity);
          }
        }
      }

      return {
        ...prev,
        orders: nextOrders,
        counts: nextCounts,
        availableStockByProductId: nextAvailableStock,
      };
    });
  }

  async function handleTransitionStatus(
    order: Order,
    nextStatus: OrderStatus,
    action: PendingOrderAction,
    note?: string,
  ) {
    if (mutatingOrderIdRef.current !== null) {
      return;
    }

    const trimmedNote = typeof note === "string" ? note.trim() : "";
    if (trimmedNote.length > 200) {
      if (action === "cancel") {
        setDialogError("Lý do hủy đơn tối đa 200 ký tự");
      } else {
        setBannerError("Ghi chú vận chuyển tối đa 200 ký tự");
      }
      return;
    }

    cancelPendingGetRequests();
    mutatingOrderIdRef.current = order.id;
    setPendingOrderId(order.id);
    setPendingAction(action);
    if (action === "cancel") {
      setDialogError(null);
    } else {
      setBannerError(null);
    }

    try {
      const response = await fetch(
        `/api/admin/orders/${encodeURIComponent(order.id)}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: nextStatus,
            note: trimmedNote.length > 0 ? trimmedNote : undefined,
            expectedStatus: order.status,
          }),
        },
      );

      if (response.status === 401) {
        mutatingOrderIdRef.current = null;
        setPendingOrderId(null);
        setPendingAction(null);
        router.push("/admin/login?expired=1");
        return;
      }

      if (response.status === 409) {
        mutatingOrderIdRef.current = null;
        setPendingOrderId(null);
        setPendingAction(null);
        setCancellingOrder(null);
        setDialogError(null);
        setBannerError(CONFLICT_ERROR_MESSAGE);
        void fetchOrders(activeStatusRef.current, appliedQueryRef.current, {
          preserveBanner: true,
        });
        return;
      }

      if (!response.ok) {
        const body = (await response
          .json()
          .catch(() => null)) as ApiErrorBody | null;
        if (
          response.status === 503 ||
          body?.error?.code === "ADMIN_NOT_CONFIGURED"
        ) {
          mutatingOrderIdRef.current = null;
          setPendingOrderId(null);
          setPendingAction(null);
          router.push("/admin/login");
          return;
        }
        const message =
          response.status >= 500
            ? SYSTEM_ERROR_MESSAGE
            : typeof body?.error?.message === "string" &&
                body.error.message.trim().length > 0
              ? body.error.message
              : SYSTEM_ERROR_MESSAGE;

        if (action === "cancel") {
          setDialogError(message);
        } else {
          setBannerError(message);
        }
        mutatingOrderIdRef.current = null;
        setPendingOrderId(null);
        setPendingAction(null);
        return;
      }

      const json = (await response.json().catch(() => null)) as {
        order?: Order;
      } | null;
      const updatedOrder: Order = json?.order ?? {
        ...order,
        status: nextStatus,
        inventoryRestocked:
          nextStatus === "cancelled"
            ? order.status !== "shipping"
            : order.inventoryRestocked,
      };

      applyUpdatedOrderToState(order, updatedOrder);

      if (action === "cancel") {
        setCancellingOrder(null);
        setDialogError(null);
      }
      setBannerError(null);
    } catch {
      if (action === "cancel") {
        setDialogError(NETWORK_ERROR_MESSAGE);
      } else {
        setBannerError(NETWORK_ERROR_MESSAGE);
      }
    } finally {
      mutatingOrderIdRef.current = null;
      setPendingOrderId(null);
      setPendingAction(null);
    }
  }

  async function handleRestockOrder(order: Order) {
    if (mutatingOrderIdRef.current !== null) {
      return;
    }

    cancelPendingGetRequests();
    mutatingOrderIdRef.current = order.id;
    setPendingOrderId(order.id);
    setPendingAction("restock");
    setBannerError(null);

    try {
      const response = await fetch(
        `/api/admin/orders/${encodeURIComponent(order.id)}/restock`,
        {
          method: "POST",
        },
      );

      if (response.status === 401) {
        mutatingOrderIdRef.current = null;
        setPendingOrderId(null);
        setPendingAction(null);
        router.push("/admin/login?expired=1");
        return;
      }

      if (response.status === 409) {
        mutatingOrderIdRef.current = null;
        setPendingOrderId(null);
        setPendingAction(null);
        setBannerError(CONFLICT_ERROR_MESSAGE);
        void fetchOrders(activeStatusRef.current, appliedQueryRef.current, {
          preserveBanner: true,
        });
        return;
      }

      if (!response.ok) {
        const body = (await response
          .json()
          .catch(() => null)) as ApiErrorBody | null;
        if (
          response.status === 503 ||
          body?.error?.code === "ADMIN_NOT_CONFIGURED"
        ) {
          mutatingOrderIdRef.current = null;
          setPendingOrderId(null);
          setPendingAction(null);
          router.push("/admin/login");
          return;
        }
        const message =
          response.status >= 500
            ? SYSTEM_ERROR_MESSAGE
            : typeof body?.error?.message === "string" &&
                body.error.message.trim().length > 0
              ? body.error.message
              : SYSTEM_ERROR_MESSAGE;
        setBannerError(message);
        mutatingOrderIdRef.current = null;
        setPendingOrderId(null);
        setPendingAction(null);
        return;
      }

      const json = (await response.json().catch(() => null)) as {
        order?: Order;
      } | null;
      const updatedOrder: Order = json?.order ?? {
        ...order,
        inventoryRestocked: true,
      };

      applyUpdatedOrderToState(order, updatedOrder);
      setBannerError(null);
    } catch {
      setBannerError(NETWORK_ERROR_MESSAGE);
    } finally {
      mutatingOrderIdRef.current = null;
      setPendingOrderId(null);
      setPendingAction(null);
    }
  }

  function handleOpenCancelDialog(
    order: Order,
    openerElement: HTMLButtonElement | null,
  ) {
    if (mutatingOrderIdRef.current !== null) {
      return;
    }
    cancelOpenerRef.current = openerElement;
    setDialogError(null);
    setCancellingOrder(order);
  }

  function handleCloseCancelDialog() {
    if (pendingOrderId && pendingAction === "cancel") {
      return;
    }
    setDialogError(null);
    setCancellingOrder(null);
  }

  async function handleConfirmCancel(note: string) {
    if (!cancellingOrder) {
      return;
    }
    await handleTransitionStatus(cancellingOrder, "cancelled", "cancel", note);
  }

  const hasFilterOrQuery =
    activeStatus !== "all" || appliedQuery.trim().length > 0;
  const emptyTitle = hasFilterOrQuery
    ? appliedQuery.trim().length > 0
      ? `Không tìm thấy đơn hàng khớp từ khóa "${appliedQuery.trim()}"`
      : `Chưa có đơn hàng ở trạng thái "${ORDER_STATUS_LABELS[activeStatus as OrderStatus] ?? activeStatus}"`
    : "Chưa có đơn hàng nào trong hệ thống";
  const emptyDescription = hasFilterOrQuery
    ? "Chưa có đơn hàng nào trong hệ thống khớp với bộ lọc hoặc từ khóa tìm kiếm hiện tại."
    : "Khi khách hàng đặt mua sản phẩm, đơn hàng mới sẽ xuất hiện tại đây.";

  return (
    <div
      ref={listRegionRef}
      tabIndex={-1}
      className="flex flex-col gap-4 focus:outline-none"
    >
      {bannerError && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-semibold text-rose-700"
        >
          {bannerError}
        </div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <OrderFilterTabs
          activeStatus={activeStatus}
          counts={data.counts ?? DEFAULT_COUNTS}
          onSelect={handleSelectTab}
        />
        <AdminOrderSearchBar
          value={searchInput}
          onChange={handleSearchChange}
          onSubmit={handleSearchSubmit}
          onClear={handleSearchClear}
        />
      </div>

      {activeStatus === "pending" && (
        <p
          data-testid="fifo-sort-hint"
          className="text-xs font-medium text-slate-500"
        >
          Đang hiển thị đơn chờ xác nhận theo thứ tự cũ nhất trước (FIFO) để ưu
          tiên xử lý đơn đặt sớm.
        </p>
      )}

      {isLoading ? (
        <div
          data-testid="admin-orders-skeleton"
          aria-busy="true"
          aria-label="Đang tải danh sách đơn hàng"
          className="flex flex-col gap-3"
        >
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              data-testid="admin-order-skeleton-card"
              className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="h-5 w-44 rounded-lg bg-slate-100" />
                <div className="h-5 w-24 rounded-lg bg-slate-100" />
              </div>
              <div className="mt-2 h-4 w-64 max-w-full rounded-lg bg-slate-100" />
              <div className="my-3 h-12 w-full rounded-lg bg-slate-100" />
              <div className="flex justify-end gap-2">
                <div className="h-11 w-28 rounded-xl bg-slate-100" />
                <div className="h-11 w-36 rounded-xl bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : data.orders.length === 0 ? (
        <EmptyState
          emoji="📦"
          title={emptyTitle}
          description={emptyDescription}
          action={
            <Button
              type="button"
              variant="secondary"
              onClick={handleResetFilters}
              className="min-h-11 h-auto"
            >
              Xóa bộ lọc
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {data.orders.map((order) => (
            <AdminOrderCard
              key={order.id}
              order={order}
              availableStockByProductId={data.availableStockByProductId}
              isPending={pendingOrderId !== null}
              pendingAction={pendingOrderId === order.id ? pendingAction : null}
              shippingNote={shippingNotesByOrderId[order.id] ?? ""}
              onShippingNoteChange={handleShippingNoteChange}
              onTransitionStatus={handleTransitionStatus}
              onOpenCancelDialog={handleOpenCancelDialog}
              onRestockOrder={handleRestockOrder}
            />
          ))}
        </div>
      )}

      <CancelOrderDialog
        order={cancellingOrder}
        open={Boolean(cancellingOrder)}
        pending={
          Boolean(cancellingOrder) &&
          pendingOrderId === cancellingOrder?.id &&
          pendingAction === "cancel"
        }
        errorMessage={dialogError}
        openerRef={cancelOpenerRef}
        fallbackFocusRef={listRegionRef}
        onClose={handleCloseCancelDialog}
        onConfirm={handleConfirmCancel}
      />
    </div>
  );
}
