-- Add fund-level keyword support for installment periods (using human-readable fund names)
ALTER TABLE `fund_installment_periods`
  ADD COLUMN `fund_level` ENUM('category','subcategory') NOT NULL DEFAULT 'category' AFTER `installment_period_id`,
  ADD COLUMN `fund_keyword` VARCHAR(255) NOT NULL DEFAULT '' AFTER `fund_level`,
  ADD COLUMN `fund_parent_keyword` VARCHAR(255) DEFAULT NULL AFTER `fund_keyword`;

-- Populate existing rows with readable names instead of keyword codes
UPDATE `fund_installment_periods`
SET `fund_level` = COALESCE(NULLIF(`fund_level`, ''), 'category'),
    `fund_keyword` = CASE
      WHEN `fund_level` = 'subcategory' THEN 'ทุนสนับสนุนผู้เชี่ยวชาญต่างประเทศ'
      WHEN `fund_keyword` = 'main_promotion' THEN 'ทุนส่งเสริมการวิจัย'
      WHEN `fund_keyword` = 'main_support' OR `fund_keyword` = '' THEN 'ทุนอุดหนุนกิจกรรม'
      ELSE `fund_keyword`
    END,
    `fund_parent_keyword` = CASE
      WHEN `fund_level` = 'subcategory' THEN 'ทุนส่งเสริมการวิจัย'
      ELSE NULL
    END;

-- Improve lookup performance for year-level conflicts
CREATE INDEX `idx_fund_installment_periods_level_keyword` ON `fund_installment_periods` (`fund_level`, `fund_keyword`, `year_id`, `installment_number`);
CREATE INDEX `idx_fund_installment_periods_level_keyword_cutoff` ON `fund_installment_periods` (`fund_level`, `fund_keyword`, `year_id`, `cutoff_date`);

-- Update uniqueness to include fund selection
ALTER TABLE `fund_installment_periods`
  DROP INDEX `ux_period_year_installment`,
  ADD UNIQUE KEY `ux_period_year_installment` (`year_id`, `installment_number`, `fund_level`, `fund_keyword`);
