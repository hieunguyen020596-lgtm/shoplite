import type { Ref } from "react";
import { TriangleAlert } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import type { OrderLineShortage } from "@/features/orders/order-errors";

export interface StockConflictLine extends OrderLineShortage {
  name: string;
}

/** Đọc `details.lines` của lỗi INSUFFICIENT_STOCK; sai dạng thì trả null. */
export function parseShortageLines(
  details: unknown,
): OrderLineShortage[] | null {
  if (typeof details !== "object" || details === null) return null;
  const lines = (details as { lines?: unknown }).lines;
  if (!Array.isArray(lines) || lines.length === 0) return null;

  const seen = new Set<string>();
  const result: OrderLineShortage[] = [];
  for (const line of lines) {
    if (typeof line !== "object" || line === null) return null;
    const { productId, requested, available } = line as Record<string, unknown>;
    if (
      typeof productId !== "string" ||
      productId === "" ||
      seen.has(productId)
    )
      return null;
    if (!Number.isInteger(requested) || (requested as number) < 1) return null;
    if (!Number.isInteger(available) || (available as number) < 0) return null;
    if ((available as number) >= (requested as number)) return null;
    seen.add(productId);
    result.push({
      productId,
      requested: requested as number,
      available: available as number,
    });
  }
  return result;
}

interface StockConflictListProps {
  lines: StockConflictLine[];
  onTake: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  headingRef?: Ref<HTMLHeadingElement>;
}

const ACTION_CLASS =
  "min-h-11 px-4 focus-visible:outline-2 focus-visible:outline-indigo-600!";

export function StockConflictList({
  lines,
  onTake,
  onRemove,
  headingRef,
}: StockConflictListProps) {
  return (
    <section
      data-testid="stock-conflict-list"
      className="flex flex-col gap-3 rounded-xl bg-rose-50 p-4 text-rose-700"
    >
      <div role="alert">
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="flex items-center gap-2 text-base font-semibold focus:outline-2 focus:outline-offset-2 focus:outline-indigo-600"
        >
          <TriangleAlert className="size-5 shrink-0" aria-hidden />
          Một số sản phẩm không đủ hàng
        </h2>
        <p className="mt-1 text-sm">Chọn cách xử lý để đặt tiếp.</p>
      </div>
      <ul className="flex flex-col gap-3">
        {lines.map((line) => (
          <li
            key={line.productId}
            data-testid="stock-conflict-row"
            className="flex flex-col gap-2 rounded-xl bg-rose-50 p-3 ring-1 ring-rose-200"
          >
            <p className="min-w-0 text-sm font-semibold break-words">
              {line.name}
            </p>
            <p className="text-sm">
              {line.available > 0
                ? `Bạn chọn ${line.requested} · Chỉ còn ${line.available}`
                : "Hết hàng"}
            </p>
            <div className="flex flex-wrap gap-2">
              {line.available > 0 && (
                <button
                  type="button"
                  aria-label={`Lấy ${line.available} ${line.name}`}
                  onClick={() => onTake(line.productId, line.available)}
                  className={buttonStyles({
                    variant: "primary",
                    className: ACTION_CLASS,
                  })}
                >
                  {`Lấy ${line.available}`}
                </button>
              )}
              <button
                type="button"
                aria-label={`Bỏ ${line.name}`}
                onClick={() => onRemove(line.productId)}
                className={buttonStyles({
                  variant: "ghost",
                  className: ACTION_CLASS,
                })}
              >
                Bỏ
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
