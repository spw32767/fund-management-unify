
--
-- Schema cleanup: drop unused approval/rejection columns and move closure tracking to fund_application_details
--
DROP VIEW IF EXISTS `v_fund_applications`;

ALTER TABLE `fund_application_details`
  DROP COLUMN `approved_by`,
  DROP COLUMN `approved_at`,
  DROP COLUMN `rejected_by`,
  DROP COLUMN `rejected_at`,
  DROP COLUMN `comment`;

ALTER TABLE `publication_reward_details`
  DROP FOREIGN KEY `fk_revision_requested_by_user`;

ALTER TABLE `publication_reward_details`
  DROP COLUMN `approval_comment`,
  DROP COLUMN `approved_by`,
  DROP COLUMN `approved_at`,
  DROP COLUMN `rejection_reason`,
  DROP COLUMN `rejected_by`,
  DROP COLUMN `rejected_at`,
  DROP COLUMN `revision_request`,
  DROP COLUMN `revision_requested_by`,
  DROP COLUMN `revision_requested_at`;

ALTER TABLE `submissions`
  DROP COLUMN `rejection_reason`,
  DROP COLUMN `completed_at`,
  DROP COLUMN `closed_at`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_fund_applications` AS
SELECT
    `s`.`submission_id` AS `application_id`,
    `s`.`submission_number` AS `application_number`,
    `s`.`user_id` AS `user_id`,
    `s`.`year_id` AS `year_id`,
    `fad`.`subcategory_id` AS `subcategory_id`,
    `s`.`status_id` AS `application_status_id`,
    `s`.`approved_by` AS `approved_by`,
    `fad`.`project_title` AS `project_title`,
    `fad`.`project_description` AS `project_description`,
    `fad`.`requested_amount` AS `requested_amount`,
    `fad`.`approved_amount` AS `approved_amount`,
    `s`.`submitted_at` AS `submitted_at`,
    `s`.`approved_at` AS `approved_at`,
    `fad`.`closed_at` AS `closed_at`,
    NULL AS `comment`,
    `s`.`created_at` AS `create_at`,
    `s`.`updated_at` AS `update_at`,
    `s`.`deleted_at` AS `delete_at`
FROM `submissions` `s`
         JOIN `fund_application_details` `fad` ON `s`.`submission_id` = `fad`.`submission_id`
WHERE `s`.`submission_type` = 'fund_application';
