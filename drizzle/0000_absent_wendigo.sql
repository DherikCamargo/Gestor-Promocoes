CREATE TABLE `ml_accounts` (
	`owner` text PRIMARY KEY NOT NULL,
	`secret` text NOT NULL,
	`tokens` text,
	`seller_id` text,
	`nickname` text,
	`expires_at` integer,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ml_oauth_states` (
	`state_hash` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`verifier` text NOT NULL,
	`browser_hash` text NOT NULL,
	`expires_at` integer NOT NULL
);
