-- Align scopus_source_metrics schema with CiteScore model fields.
-- Adds cite_count_sce column if it is missing.
ALTER TABLE scopus_source_metrics
    ADD COLUMN IF NOT EXISTS cite_count_sce INT NULL AFTER publication_count;
