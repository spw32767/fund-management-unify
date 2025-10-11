-- Adds original_name column to submission_documents so document records can
-- retain the human friendly file name that was uploaded by the user.
ALTER TABLE submission_documents
    ADD COLUMN original_name VARCHAR(255) NULL AFTER file_id;
