CREATE TABLE `product_costs` (
	`owner` text NOT NULL,
	`product` text NOT NULL,
	`cost_cents` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`owner`, `product`)
);
