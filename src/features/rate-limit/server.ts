import "server-only";
import { pgRateLimiter } from "./rate-limiter.pg";

/** Cổng ghi bộ đếm giới hạn duy nhất, nối vào `createOrderService`. */
export const rateLimiter = pgRateLimiter;
