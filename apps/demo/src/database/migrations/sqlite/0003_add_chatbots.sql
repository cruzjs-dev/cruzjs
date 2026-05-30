CREATE TABLE `Chatbot` (
	`id` text PRIMARY KEY NOT NULL,
	`ownerId` text NOT NULL,
	`name` text NOT NULL,
	`systemPrompt` text DEFAULT 'You are a helpful assistant.' NOT NULL,
	`model` text DEFAULT 'openai/gpt-4o-mini' NOT NULL,
	`createdAt` text NOT NULL
);
