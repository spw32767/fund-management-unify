-- Add default templates for reset support (run once on existing deployments)
ALTER TABLE notification_message
    ADD COLUMN default_title_template TEXT NULL AFTER body_template,
    ADD COLUMN default_body_template TEXT NULL AFTER default_title_template,
    ADD COLUMN default_variables JSON NULL AFTER variables;

-- Populate defaults from the current live content so reset matches today's text
UPDATE notification_message
SET
    default_title_template = title_template,
    default_body_template = body_template,
    default_variables = variables
WHERE default_title_template IS NULL OR default_body_template IS NULL OR default_variables IS NULL;

-- Enforce not-null after data is copied
ALTER TABLE notification_message
    MODIFY default_title_template TEXT NOT NULL,
    MODIFY default_body_template TEXT NOT NULL,
    MODIFY default_variables JSON NOT NULL;
