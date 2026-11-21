import "server-only";
import { runInTransaction } from "@/db/transaction";
import { getServerEnv } from "@/lib/env";
import { rateLimiter } from "@/features/rate-limit/server";
import { stockLedger } from "@/features/inventory/server";
import { pgOrderRepository } from "./order-repository.pg";
import { createOrderService } from "./order-service";

/**
 * Instance dùng chung của OrderService (PostgreSQL). Chỉ import từ code chạy trên server
 * (Server Component, Route Handler).
 */
export const orderService = createOrderService({
  runInTransaction,
  repository: pgOrderRepository,
  stockLedger,
  rateLimiter,
  shopContactPhone: () => getServerEnv().SHOP_CONTACT_PHONE,
});
