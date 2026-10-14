ALTER TABLE `users`
  ADD COLUMN `passwordHash` text NULL,
  ADD COLUMN `emailVerified` int NOT NULL DEFAULT 0,
  ADD COLUMN `verificationToken` varchar(128) NULL,
  ADD COLUMN `verificationExpiresAt` timestamp NULL;

ALTER TABLE `users`
  MODIFY COLUMN `role` enum('user','owner','platform_manager','content_moderator','support_moderator') NOT NULL DEFAULT 'user';

ALTER TABLE `users`
  MODIFY COLUMN `openId` varchar(64) NOT NULL;
