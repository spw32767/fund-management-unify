-- Adds missing user_agent column required by password reset token storage
ALTER TABLE `user_tokens`
    ADD COLUMN `user_agent` TEXT NULL AFTER `ip_address`;
