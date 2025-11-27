-- Add a configurable contact_info field for notifications
ALTER TABLE system_config
    ADD COLUMN contact_info TEXT NULL AFTER service_announcement;

-- Optional: seed an initial value (edit as needed)
UPDATE system_config
SET contact_info = 'researchfund@kku.ac.th, โทร 043-xxx-xxxx'
WHERE contact_info IS NULL;
