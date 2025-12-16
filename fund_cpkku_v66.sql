-- Add contact and bank information columns to submissions
ALTER TABLE submissions
  ADD COLUMN contact_phone VARCHAR(50) NULL AFTER admin_comment,
  ADD COLUMN bank_account VARCHAR(50) NULL AFTER contact_phone,
  ADD COLUMN bank_name VARCHAR(100) NULL AFTER bank_account,
  ADD COLUMN bank_account_name VARCHAR(150) NULL AFTER bank_name;
