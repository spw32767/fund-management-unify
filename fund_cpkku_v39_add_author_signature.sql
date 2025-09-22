ALTER TABLE publication_reward_details
  ADD COLUMN IF NOT EXISTS author_name_list TEXT NULL,
  ADD COLUMN IF NOT EXISTS signature VARCHAR(255) NULL;
