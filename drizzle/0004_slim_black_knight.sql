CREATE TABLE `participation_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner` text NOT NULL,
	`item_id` text NOT NULL,
	`promotion_id` text,
	`promotion_type` text,
	`ref_id` text NOT NULL,
	`expected_price_cents` integer,
	`result_price_cents` integer,
	`status` text NOT NULL,
	`detail` text NOT NULL,
	`created_at` integer NOT NULL
);
