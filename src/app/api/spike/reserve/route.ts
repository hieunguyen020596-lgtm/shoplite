import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { DatabaseError } from "pg";
import { z } from "zod";
import { runInTransaction, toDrizzleTx } from "@/db/transaction";
import { jsonError, readJsonBody } from "@/lib/http";

// Route spike của Story 1.2, xóa ở đầu Story 1.3. Không dùng ở production.
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(2147483647),
  failAfterUpdate: z.boolean().optional(),
});

class SpikeInsufficientStock extends Error {}
class SpikeInjectedFailure extends Error {}

function sqlStateOf(error: unknown): string | undefined {
  const candidates = [error, (error as { cause?: unknown } | null)?.cause];
  for (const c of candidates) {
    if (
      c instanceof DatabaseError &&
      typeof c.code === "string" &&
      /^[0-9A-Z]{5}$/.test(c.code)
    ) {
      return c.code;
    }
  }
  return undefined;
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return jsonError(404, "NOT_FOUND", "Không tìm thấy");
  }
  const parsed = bodySchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return jsonError(400, "VALIDATION_ERROR", "Dữ liệu không hợp lệ");
  }
  const { productId, quantity, failAfterUpdate } = parsed.data;

  try {
    const remaining = await runInTransaction(async (dbTx) => {
      const tx = toDrizzleTx(dbTx);
      const result = await tx.execute(
        sql`UPDATE inventory SET stock = stock - ${quantity} WHERE product_id = ${productId} AND stock >= ${quantity} RETURNING stock`,
      );
      if (result.rowCount === 0) throw new SpikeInsufficientStock();
      if (failAfterUpdate) throw new SpikeInjectedFailure();
      return (result.rows[0] as { stock: number }).stock;
    });
    return NextResponse.json({ stock: remaining });
  } catch (error) {
    if (error instanceof SpikeInsufficientStock) {
      return jsonError(409, "INSUFFICIENT_STOCK", "Không đủ hàng");
    }
    if (error instanceof SpikeInjectedFailure) {
      return jsonError(500, "INTERNAL_ERROR", "Lỗi giả lập sau khi trừ kho");
    }
    const sqlState = sqlStateOf(error);
    return jsonError(
      500,
      "DB_ERROR",
      "Lỗi cơ sở dữ liệu",
      sqlState ? { sqlState } : undefined,
    );
  }
}
