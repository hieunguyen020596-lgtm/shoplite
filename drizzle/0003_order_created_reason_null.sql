ALTER TABLE "order_status_history" DROP CONSTRAINT "osh_event_shape";--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "osh_event_shape" CHECK ((
        "order_status_history"."event_type" = 'order_created'
        AND "order_status_history"."from_status" IS NULL
        AND "order_status_history"."to_status" = 'pending'
        AND "order_status_history"."reason_code" IS NULL
        AND "order_status_history"."reason_text" IS NULL
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
      ));