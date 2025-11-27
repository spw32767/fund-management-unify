ALTER TABLE `scopus_documents`
    ADD COLUMN `scopus_link` text DEFAULT NULL AFTER `scopus_id`;
