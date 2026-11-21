CREATE TABLE "inventory" (
	"product_id" text PRIMARY KEY NOT NULL,
	"stock" integer NOT NULL,
	CONSTRAINT "inventory_stock_non_negative" CHECK ("inventory"."stock" >= 0)
);
