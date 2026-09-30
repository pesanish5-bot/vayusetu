CREATE TABLE `records` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`city` text NOT NULL,
	`created` text NOT NULL,
	`payload` text NOT NULL,
	`stage` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_records_city_created` ON `records` (`city`,`created`);