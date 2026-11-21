import { sql } from "drizzle-orm";
import { check, integer, pgTable, text } from "drizzle-orm/pg-core";

export const inventory = pgTable(
  "inventory",
  {
    productId: text("product_id").primaryKey(),
    stock: integer("stock").notNull(),
  },
  (table) => [check("inventory_stock_non_negative", sql`${table.stock} >= 0`)],
);
