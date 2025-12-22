-- Add fund name snapshot for installment selection on submissions and details
ALTER TABLE `submissions`
  ADD COLUMN `installment_fund_name_at_submit` VARCHAR(255) DEFAULT NULL AFTER `installment_number_at_submit`;
