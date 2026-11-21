CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"window_started_at" timestamp (3) with time zone NOT NULL,
	"count" integer NOT NULL
);
