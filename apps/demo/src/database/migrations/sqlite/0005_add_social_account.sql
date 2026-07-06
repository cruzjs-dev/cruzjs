CREATE TABLE `SocialAccount` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`provider` text NOT NULL,
	`providerUserId` text NOT NULL,
	`email` text,
	`displayName` text,
	`avatarUrl` text,
	`username` text,
	`accessToken` text,
	`accessTokenIv` text,
	`refreshToken` text,
	`refreshTokenIv` text,
	`tokenExpiresAt` text,
	`scopes` text,
	`metadata` text DEFAULT '{}',
	`lastSyncedAt` text,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `AuthIdentity`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `SocialAccount_userId_idx` ON `SocialAccount` (`userId`);
--> statement-breakpoint
CREATE UNIQUE INDEX `SocialAccount_provider_providerUserId_uniq` ON `SocialAccount` (`provider`, `providerUserId`);
--> statement-breakpoint
CREATE UNIQUE INDEX `SocialAccount_userId_provider_uniq` ON `SocialAccount` (`userId`, `provider`);
