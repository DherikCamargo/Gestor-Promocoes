CREATE TABLE `ml_imports` (
	`owner` text PRIMARY KEY NOT NULL,
	`seller_id` text NOT NULL,
	`run` text NOT NULL,
	`payload` text NOT NULL,
	`cursor` text,
	`processed` integer NOT NULL,
	`total` integer NOT NULL,
	`done` integer NOT NULL,
	`lease` text,
	`locked_until` integer NOT NULL,
	`updated_at` integer NOT NULL
);
