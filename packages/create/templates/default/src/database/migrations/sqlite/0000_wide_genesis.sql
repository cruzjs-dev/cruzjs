CREATE TABLE `Account` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`type` text DEFAULT 'oauth' NOT NULL,
	`provider` text NOT NULL,
	`providerAccountId` text NOT NULL,
	`accessToken` text,
	`refreshToken` text,
	`idToken` text,
	`tokenType` text,
	`scope` text,
	`expiresAt` text,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `AuthIdentity`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Account_provider_providerAccountId_idx` ON `Account` (`provider`,`providerAccountId`);--> statement-breakpoint
CREATE TABLE `AiConnection` (
	`id` text PRIMARY KEY NOT NULL,
	`orgId` text NOT NULL,
	`provider` text NOT NULL,
	`displayName` text,
	`encryptedApiKey` text NOT NULL,
	`apiKeyIv` text NOT NULL,
	`selectedModel` text,
	`isEnabled` integer DEFAULT true NOT NULL,
	`isDefault` integer DEFAULT false NOT NULL,
	`connectedBy` text,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`orgId`) REFERENCES `Organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`connectedBy`) REFERENCES `AuthIdentity`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `AiConnection_orgId_idx` ON `AiConnection` (`orgId`);--> statement-breakpoint
CREATE UNIQUE INDEX `AiConnection_orgId_provider_idx` ON `AiConnection` (`orgId`,`provider`);--> statement-breakpoint
CREATE TABLE `ApiKey` (
	`id` text PRIMARY KEY NOT NULL,
	`orgId` text NOT NULL,
	`name` text NOT NULL,
	`keyHash` text NOT NULL,
	`keyPrefix` text NOT NULL,
	`scopes` text NOT NULL,
	`projectScope` text,
	`expiresAt` text,
	`lastUsedAt` text,
	`createdBy` text,
	`revokedAt` text,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`orgId`) REFERENCES `Organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`createdBy`) REFERENCES `AuthIdentity`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ApiKey_orgId_idx` ON `ApiKey` (`orgId`);--> statement-breakpoint
CREATE INDEX `ApiKey_keyPrefix_idx` ON `ApiKey` (`keyPrefix`);--> statement-breakpoint
CREATE UNIQUE INDEX `ApiKey_keyHash_idx` ON `ApiKey` (`keyHash`);--> statement-breakpoint
CREATE TABLE `AuditLog` (
	`id` text PRIMARY KEY NOT NULL,
	`orgId` text,
	`userId` text,
	`action` text NOT NULL,
	`resource` text,
	`metadata` text DEFAULT '{}',
	`entityType` text,
	`entityId` text,
	`details` text DEFAULT '{}',
	`ipAddress` text,
	`userAgent` text,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`orgId`) REFERENCES `Organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `AuthIdentity`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `AuditLog_orgId_idx` ON `AuditLog` (`orgId`);--> statement-breakpoint
CREATE INDEX `AuditLog_userId_idx` ON `AuditLog` (`userId`);--> statement-breakpoint
CREATE INDEX `AuditLog_action_idx` ON `AuditLog` (`action`);--> statement-breakpoint
CREATE INDEX `AuditLog_resource_idx` ON `AuditLog` (`resource`);--> statement-breakpoint
CREATE INDEX `AuditLog_createdAt_idx` ON `AuditLog` (`createdAt`);--> statement-breakpoint
CREATE TABLE `AuthIdentity` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`emailVerified` text,
	`emailVerificationToken` text,
	`password` text,
	`passwordResetToken` text,
	`passwordResetExpiry` text,
	`isBanned` integer DEFAULT false,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `AuthIdentity_email_unique` ON `AuthIdentity` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `AuthIdentity_emailVerificationToken_unique` ON `AuthIdentity` (`emailVerificationToken`);--> statement-breakpoint
CREATE UNIQUE INDEX `AuthIdentity_passwordResetToken_unique` ON `AuthIdentity` (`passwordResetToken`);--> statement-breakpoint
CREATE TABLE `DashboardLayout` (
	`id` text PRIMARY KEY NOT NULL,
	`orgId` text NOT NULL,
	`userId` text NOT NULL,
	`name` text NOT NULL,
	`widgets` text DEFAULT '[]' NOT NULL,
	`isDefault` integer DEFAULT false,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`orgId`) REFERENCES `Organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `AuthIdentity`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `DashboardLayout_orgId_userId_idx` ON `DashboardLayout` (`orgId`,`userId`);--> statement-breakpoint
CREATE INDEX `DashboardLayout_orgId_isDefault_idx` ON `DashboardLayout` (`orgId`,`isDefault`);--> statement-breakpoint
CREATE TABLE `EmailLog` (
	`id` text PRIMARY KEY NOT NULL,
	`to` text NOT NULL,
	`from` text,
	`cc` text,
	`subject` text NOT NULL,
	`template` text,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`messageId` text,
	`error` text,
	`sentAt` text,
	`metadata` text DEFAULT '{}',
	`createdAt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `IntegrationConnection` (
	`id` text PRIMARY KEY NOT NULL,
	`orgId` text NOT NULL,
	`provider` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`config` text DEFAULT '{}' NOT NULL,
	`lastSyncAt` text,
	`lastSyncStatus` text,
	`createdBy` text,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`orgId`) REFERENCES `Organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`createdBy`) REFERENCES `AuthIdentity`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `IntegrationConnection_orgId_idx` ON `IntegrationConnection` (`orgId`);--> statement-breakpoint
CREATE INDEX `IntegrationConnection_orgId_provider_idx` ON `IntegrationConnection` (`orgId`,`provider`);--> statement-breakpoint
CREATE TABLE `IntegrationSyncLog` (
	`id` text PRIMARY KEY NOT NULL,
	`connectionId` text NOT NULL,
	`orgId` text NOT NULL,
	`provider` text NOT NULL,
	`direction` text DEFAULT 'PULL' NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`itemsSynced` integer DEFAULT 0,
	`itemsFailed` integer DEFAULT 0,
	`itemsSkipped` integer DEFAULT 0,
	`errorMessage` text,
	`startedAt` text,
	`completedAt` text,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`connectionId`) REFERENCES `IntegrationConnection`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`orgId`) REFERENCES `Organization`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `IntegrationSyncLog_connectionId_idx` ON `IntegrationSyncLog` (`connectionId`);--> statement-breakpoint
CREATE INDEX `IntegrationSyncLog_orgId_idx` ON `IntegrationSyncLog` (`orgId`);--> statement-breakpoint
CREATE INDEX `IntegrationSyncLog_connectionId_startedAt_idx` ON `IntegrationSyncLog` (`connectionId`,`startedAt`);--> statement-breakpoint
CREATE TABLE `Invitation` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`orgId` text NOT NULL,
	`role` text DEFAULT 'MEMBER' NOT NULL,
	`token` text NOT NULL,
	`expiresAt` text NOT NULL,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`orgId`) REFERENCES `Organization`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Invitation_token_unique` ON `Invitation` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `Invitation_email_orgId_idx` ON `Invitation` (`email`,`orgId`);--> statement-breakpoint
CREATE INDEX `Invitation_token_idx` ON `Invitation` (`token`);--> statement-breakpoint
CREATE TABLE `Job` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`lookupKey` text,
	`payload` text DEFAULT '{}' NOT NULL,
	`resultSummary` text DEFAULT '{}',
	`error` text,
	`priority` integer DEFAULT 0 NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`maxAttempts` integer DEFAULT 3 NOT NULL,
	`scheduledFor` text NOT NULL,
	`startedAt` text,
	`completedAt` text,
	`processedBy` text,
	`workflowInstanceId` text,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `Job_poll_idx` ON `Job` (`status`,`priority`,`scheduledFor`,`createdAt`);--> statement-breakpoint
CREATE INDEX `Job_lookupKey_idx` ON `Job` (`lookupKey`);--> statement-breakpoint
CREATE INDEX `Job_type_status_idx` ON `Job` (`type`,`status`);--> statement-breakpoint
CREATE INDEX `Job_type_idx` ON `Job` (`type`);--> statement-breakpoint
CREATE TABLE `NotificationPreference` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`orgId` text NOT NULL,
	`eventType` text NOT NULL,
	`channel` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `AuthIdentity`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`orgId`) REFERENCES `Organization`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `NotificationPreference_userId_orgId_eventType_channel_idx` ON `NotificationPreference` (`userId`,`orgId`,`eventType`,`channel`);--> statement-breakpoint
CREATE INDEX `NotificationPreference_userId_orgId_idx` ON `NotificationPreference` (`userId`,`orgId`);--> statement-breakpoint
CREATE TABLE `Notification` (
	`id` text PRIMARY KEY NOT NULL,
	`orgId` text NOT NULL,
	`userId` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`body` text,
	`linkUrl` text,
	`metadata` text DEFAULT '{}',
	`isRead` integer DEFAULT false,
	`readAt` text,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`orgId`) REFERENCES `Organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `AuthIdentity`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `Notification_userId_isRead_idx` ON `Notification` (`userId`,`isRead`);--> statement-breakpoint
CREATE INDEX `Notification_orgId_userId_idx` ON `Notification` (`orgId`,`userId`);--> statement-breakpoint
CREATE INDEX `Notification_createdAt_idx` ON `Notification` (`createdAt`);--> statement-breakpoint
CREATE TABLE `OrgMember` (
	`id` text PRIMARY KEY NOT NULL,
	`orgId` text NOT NULL,
	`userId` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`orgId`) REFERENCES `Organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `AuthIdentity`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `OrgMember_orgId_userId_idx` ON `OrgMember` (`orgId`,`userId`);--> statement-breakpoint
CREATE TABLE `Organization` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`ownerId` text NOT NULL,
	`avatarUrl` text,
	`stripeCustomerId` text,
	`settings` text DEFAULT '{}',
	`deletedAt` text,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`ownerId`) REFERENCES `AuthIdentity`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Organization_slug_unique` ON `Organization` (`slug`);--> statement-breakpoint
CREATE TABLE `RefreshToken` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`userId` text NOT NULL,
	`expiresAt` text NOT NULL,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `AuthIdentity`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `RefreshToken_token_unique` ON `RefreshToken` (`token`);--> statement-breakpoint
CREATE TABLE `Session` (
	`id` text PRIMARY KEY NOT NULL,
	`sessionToken` text NOT NULL,
	`userId` text NOT NULL,
	`currentOrgId` text,
	`expiresAt` text NOT NULL,
	`csrfToken` text,
	`userAgent` text,
	`ipAddress` text,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `AuthIdentity`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Session_sessionToken_unique` ON `Session` (`sessionToken`);--> statement-breakpoint
CREATE TABLE `SlackConnection` (
	`id` text PRIMARY KEY NOT NULL,
	`orgId` text NOT NULL,
	`webhookUrl` text NOT NULL,
	`channelName` text,
	`isActive` integer DEFAULT true,
	`createdBy` text,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`orgId`) REFERENCES `Organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`createdBy`) REFERENCES `AuthIdentity`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `SlackConnection_orgId_idx` ON `SlackConnection` (`orgId`);--> statement-breakpoint
CREATE TABLE `Subscription` (
	`id` text PRIMARY KEY NOT NULL,
	`orgId` text NOT NULL,
	`stripeCustomerId` text,
	`stripeSubscriptionId` text,
	`stripePriceId` text,
	`status` text DEFAULT 'active' NOT NULL,
	`currentPeriodStart` text,
	`currentPeriodEnd` text,
	`cancelAtPeriodEnd` integer DEFAULT false,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`orgId`) REFERENCES `Organization`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Subscription_stripeSubscriptionId_unique` ON `Subscription` (`stripeSubscriptionId`);--> statement-breakpoint
CREATE TABLE `Upload` (
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
	FOREIGN KEY (`userId`) REFERENCES `AuthIdentity`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`orgId`) REFERENCES `Organization`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `Upload_userId_idx` ON `Upload` (`userId`);--> statement-breakpoint
CREATE INDEX `Upload_orgId_idx` ON `Upload` (`orgId`);--> statement-breakpoint
CREATE TABLE `UserProfile` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`fullName` text,
	`avatarUrl` text,
	`phoneNumber` text,
	`bio` text,
	`location` text,
	`company` text,
	`website` text,
	`timezone` text DEFAULT 'UTC',
	`isAdmin` integer DEFAULT false NOT NULL,
	`onboardingCompleted` integer DEFAULT false,
	`featureOnboarding` text DEFAULT '{}',
	`preferences` text DEFAULT '{}',
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `AuthIdentity`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `UserProfile_userId_unique` ON `UserProfile` (`userId`);