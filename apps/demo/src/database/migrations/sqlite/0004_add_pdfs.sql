CREATE TABLE `Pdf` (
	`id` text PRIMARY KEY NOT NULL,
	`ownerId` text NOT NULL,
	`name` text NOT NULL,
	`r2Key` text NOT NULL,
	`sizeBytes` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'ready' NOT NULL,
	`extractedText` text,
	`analysis` text,
	`error` text,
	`createdAt` text NOT NULL
);
