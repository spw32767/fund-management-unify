-- Ensure publication_reward_details has author name list and signature columns
ALTER TABLE publication_reward_details
    ADD COLUMN IF NOT EXISTS author_name_list TEXT NULL;

ALTER TABLE publication_reward_details
    ADD COLUMN IF NOT EXISTS signature VARCHAR(255) NULL;

ALTER TABLE publication_reward_details
    MODIFY COLUMN author_name_list TEXT NULL;
