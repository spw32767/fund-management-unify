-- Add fund-level keyword support for installment periods
ALTER TABLE `fund_installment_periods`
  ADD COLUMN `fund_level` ENUM('category','subcategory') NOT NULL DEFAULT 'category' AFTER `installment_period_id`,
  ADD COLUMN `fund_keyword` VARCHAR(255) NOT NULL DEFAULT '' AFTER `fund_level`,
  ADD COLUMN `fund_parent_keyword` VARCHAR(255) DEFAULT NULL AFTER `fund_keyword`;

-- Populate existing rows with default category keywords
UPDATE `fund_installment_periods`
SET `fund_level` = 'category',
    `fund_keyword` = 'main_support',
    `fund_parent_keyword` = NULL
WHERE `fund_keyword` = '' OR `fund_keyword` IS NULL;

-- Optional: tag known promotion rows if needed
-- UPDATE `fund_installment_periods` SET `fund_keyword` = 'main_promotion' WHERE <condition matching ทุนส่งเสริมการวิจัยและนวัตกรรม>;

-- Improve lookup performance for year-level conflicts
CREATE INDEX `idx_fund_installment_periods_level_keyword` ON `fund_installment_periods` (`fund_level`, `fund_keyword`, `year_id`, `installment_number`);
CREATE INDEX `idx_fund_installment_periods_level_keyword_cutoff` ON `fund_installment_periods` (`fund_level`, `fund_keyword`, `year_id`, `cutoff_date`);
