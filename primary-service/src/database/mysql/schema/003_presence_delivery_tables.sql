-- ====================================================
-- 003: User Presence, Typing, Message Delivery Tables
-- ====================================================

-- User Presence Tracking
CREATE TABLE IF NOT EXISTS `userPresence` (
  `userId` CHAR(36) NOT NULL,
  `isOnline` TINYINT(1) NOT NULL DEFAULT 0,
  `activeSocketCount` INT NOT NULL DEFAULT 0,
  `lastSeenAt` TIMESTAMP NULL,
  `lastConnectedAt` TIMESTAMP NULL,
  `lastDisconnectedAt` TIMESTAMP NULL,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`userId`),
  INDEX `idx_presence_online` (`isOnline`),
  CONSTRAINT `fk_presence_user` FOREIGN KEY (`userId`) REFERENCES `users`(`userId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Message Delivery/Read Status
CREATE TABLE IF NOT EXISTS `messageDelivery` (
  `deliveryId` CHAR(36) NOT NULL DEFAULT (UUID()),
  `messageId` CHAR(36) NOT NULL,
  `userId` CHAR(36) NOT NULL,
  `status` ENUM('sent', 'delivered', 'read') NOT NULL DEFAULT 'sent',
  `deliveredAt` TIMESTAMP NULL,
  `readAt` TIMESTAMP NULL,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`deliveryId`),
  UNIQUE KEY `uk_message_user` (`messageId`, `userId`),
  INDEX `idx_delivery_message` (`messageId`),
  INDEX `idx_delivery_user` (`userId`),
  INDEX `idx_delivery_status` (`status`),
  CONSTRAINT `fk_delivery_message` FOREIGN KEY (`messageId`) REFERENCES `messages`(`messageId`) ON DELETE CASCADE,
  CONSTRAINT `fk_delivery_user` FOREIGN KEY (`userId`) REFERENCES `users`(`userId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Shared Media/Files tracking
CREATE TABLE IF NOT EXISTS `sharedMedia` (
  `mediaId` CHAR(36) NOT NULL DEFAULT (UUID()),
  `conversationId` CHAR(36) NOT NULL,
  `messageId` CHAR(36) NOT NULL,
  `fileUrl` VARCHAR(500) NOT NULL,
  `fileType` ENUM('image', 'video', 'audio', 'document', 'other') NOT NULL DEFAULT 'other',
  `fileName` VARCHAR(255) NULL,
  `fileSize` BIGINT NULL,
  `uploadedBy` CHAR(36) NOT NULL,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`mediaId`),
  INDEX `idx_media_conversation` (`conversationId`),
  INDEX `idx_media_message` (`messageId`),
  INDEX `idx_media_type` (`fileType`),
  CONSTRAINT `fk_media_conversation` FOREIGN KEY (`conversationId`) REFERENCES `conversations`(`conversationId`) ON DELETE CASCADE,
  CONSTRAINT `fk_media_message` FOREIGN KEY (`messageId`) REFERENCES `messages`(`messageId`) ON DELETE CASCADE,
  CONSTRAINT `fk_media_uploader` FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`userId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
