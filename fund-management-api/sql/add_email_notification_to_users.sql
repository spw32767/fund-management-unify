-- Add email_notification column for notification delivery
ALTER TABLE `users`
    ADD COLUMN `email_notification` VARCHAR(255) NULL AFTER `email`;

-- Initialize the new column from existing email values so notifications continue to work
UPDATE `users`
SET `email_notification` = `email`
WHERE (`email_notification` IS NULL OR `email_notification` = '')
  AND (`email` IS NOT NULL AND `email` <> '');
