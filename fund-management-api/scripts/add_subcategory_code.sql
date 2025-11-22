-- Migration script to add a stable identifier for patent reward subcategories
ALTER TABLE `fund_subcategories`
    ADD COLUMN IF NOT EXISTS `subcategory_code` VARCHAR(100) NULL AFTER `subcategory_name`;

-- Backfill the canonical code for historical patent reward rows (2.9 ...)
UPDATE `fund_subcategories`
SET `subcategory_code` = 'patent_reward'
WHERE `subcategory_code` IS NULL
  AND `subcategory_name` LIKE '2.9 ค่าตอบแทนผลงานที่ได้รับสิทธิบัตรหรืออนุสิทธิบัตร%';

-- Indexes to support quick lookups by the stable code
CREATE INDEX IF NOT EXISTS `idx_fund_subcategories_code`
    ON `fund_subcategories` (`subcategory_code`);

CREATE UNIQUE INDEX IF NOT EXISTS `ux_fund_subcategories_code_year`
    ON `fund_subcategories` (`subcategory_code`, `year_id`);
