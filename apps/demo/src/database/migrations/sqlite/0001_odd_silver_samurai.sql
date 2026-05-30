PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_Upload` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text,
	`orgId` text,
	`filename` text NOT NULL,
	`originalFilename` text NOT NULL,
	`mimeType` text NOT NULL,
	`size` integer NOT NULL,
	`bucket` text NOT NULL,
	`key` text NOT NULL,
	`url` text,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`metadata` text DEFAULT '{}',
	`createdAt` text NOT NULL,
	`uploadedAt` text,
	FOREIGN KEY (`userId`) REFERENCES `AuthIdentity`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_Upload`("id", "userId", "orgId", "filename", "originalFilename", "mimeType", "size", "bucket", "key", "url", "status", "metadata", "createdAt", "uploadedAt") SELECT "id", "userId", "orgId", "filename", "originalFilename", "mimeType", "size", "bucket", "key", "url", "status", "metadata", "createdAt", "uploadedAt" FROM `Upload`;--> statement-breakpoint
DROP TABLE `Upload`;--> statement-breakpoint
ALTER TABLE `__new_Upload` RENAME TO `Upload`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `Upload_userId_idx` ON `Upload` (`userId`);--> statement-breakpoint
CREATE INDEX `Upload_orgId_idx` ON `Upload` (`orgId`);--> statement-breakpoint
ALTER TABLE `Organization` DROP COLUMN `stripeCustomerId`;