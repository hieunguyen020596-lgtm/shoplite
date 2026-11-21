CREATE FUNCTION order_status_history_reject_change() RETURNS trigger AS $$
BEGIN
	RAISE EXCEPTION 'order_status_history is append-only (% rejected)', TG_OP
		USING ERRCODE = 'integrity_constraint_violation';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER order_status_history_append_only
BEFORE UPDATE OR DELETE ON "order_status_history"
FOR EACH ROW EXECUTE FUNCTION order_status_history_reject_change();
