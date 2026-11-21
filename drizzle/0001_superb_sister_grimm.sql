CREATE TABLE "order_items" (
	"order_id" text NOT NULL,
	"product_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"image" jsonb NOT NULL,
	"unit_price" integer NOT NULL,
	"quantity" integer NOT NULL,
	"line_total" integer NOT NULL,
	CONSTRAINT "order_items_order_id_product_id_pk" PRIMARY KEY("order_id","product_id"),
	CONSTRAINT "order_items_quantity_positive" CHECK ("order_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "order_status_history" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "order_status_history_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"order_id" text NOT NULL,
	"event_type" text NOT NULL,
	"from_status" text,
	"to_status" text,
	"reason_code" text,
	"reason_text" text,
	"refund_outcome" text,
	"actor_type" text NOT NULL,
	"actor_staff_id" bigint,
	"actor_name" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT clock_timestamp() NOT NULL,
	CONSTRAINT "osh_event_type_valid" CHECK ("order_status_history"."event_type" IN ('order_created', 'status_changed', 'refund_outcome_recorded')),
	CONSTRAINT "osh_actor_type_valid" CHECK ("order_status_history"."actor_type" IN ('customer', 'staff')),
	CONSTRAINT "osh_from_status_valid" CHECK ("order_status_history"."from_status" IS NULL OR "order_status_history"."from_status" IN ('pending', 'confirmed', 'shipping', 'delivered', 'cancelled')),
	CONSTRAINT "osh_to_status_valid" CHECK ("order_status_history"."to_status" IS NULL OR "order_status_history"."to_status" IN ('pending', 'confirmed', 'shipping', 'delivered', 'cancelled')),
	CONSTRAINT "osh_refund_outcome_valid" CHECK ("order_status_history"."refund_outcome" IS NULL OR "order_status_history"."refund_outcome" IN ('refunded', 'customer_not_transferred')),
	CONSTRAINT "osh_staff_actor_required" CHECK ("order_status_history"."actor_type" <> 'staff' OR "order_status_history"."actor_staff_id" IS NOT NULL),
	CONSTRAINT "osh_event_shape" CHECK ((
        "order_status_history"."event_type" = 'order_created'
        AND "order_status_history"."from_status" IS NULL
        AND "order_status_history"."to_status" = 'pending'
        AND "order_status_history"."reason_code" IS NOT NULL
        AND "order_status_history"."reason_text" IS NOT NULL
        AND "order_status_history"."refund_outcome" IS NULL
        AND "order_status_history"."actor_type" = 'customer'
        AND "order_status_history"."actor_staff_id" IS NULL
        AND "order_status_history"."actor_name" = 'Khách hàng'
      ) OR (
        "order_status_history"."event_type" = 'status_changed'
        AND "order_status_history"."from_status" IS NOT NULL
        AND "order_status_history"."to_status" IS NOT NULL
        AND "order_status_history"."refund_outcome" IS NULL
        AND "order_status_history"."actor_type" = 'staff'
      ) OR (
        "order_status_history"."event_type" = 'refund_outcome_recorded'
        AND "order_status_history"."refund_outcome" IS NOT NULL
        AND "order_status_history"."from_status" IS NOT NULL
        AND "order_status_history"."to_status" IS NOT NULL
        AND "order_status_history"."reason_code" IS NULL
        AND "order_status_history"."actor_type" = 'staff'
      ))
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"customer_name" text NOT NULL,
	"phone_normalized" text NOT NULL,
	"email" text,
	"address" text NOT NULL,
	"note" text,
	"shipping_method" text NOT NULL,
	"payment_method" text NOT NULL,
	"subtotal" integer NOT NULL,
	"shipping_fee" integer NOT NULL,
	"total" integer NOT NULL,
	"refund_required" boolean DEFAULT false NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_status_valid" CHECK ("orders"."status" IN ('pending', 'confirmed', 'shipping', 'delivered', 'cancelled')),
	CONSTRAINT "orders_shipping_method_valid" CHECK ("orders"."shipping_method" IN ('standard', 'express')),
	CONSTRAINT "orders_payment_method_valid" CHECK ("orders"."payment_method" IN ('cod', 'bank_transfer')),
	CONSTRAINT "orders_refund_required_valid" CHECK (NOT "orders"."refund_required" OR ("orders"."status" = 'cancelled' AND "orders"."payment_method" = 'bank_transfer'))
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."inventory"("product_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_status_history_order_id_idx" ON "order_status_history" USING btree ("order_id","id");--> statement-breakpoint
CREATE INDEX "orders_phone_status_idx" ON "orders" USING btree ("phone_normalized","status");--> statement-breakpoint
CREATE INDEX "orders_status_created_idx" ON "orders" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "orders_status_updated_id_idx" ON "orders" USING btree ("status","updated_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "orders_refund_created_idx" ON "orders" USING btree ("created_at") WHERE "orders"."refund_required";