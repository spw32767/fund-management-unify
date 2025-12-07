-- Tables to persist admin run history for Scopus batch imports and CiteScore metrics updates.
-- Run against your MySQL/MariaDB database (utf8mb4 charset assumed).

CREATE TABLE IF NOT EXISTS `scopus_batch_import_runs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `status` VARCHAR(32) NOT NULL DEFAULT 'running',
  `error_message` TEXT DEFAULT NULL,
  `requested_user_ids` TEXT DEFAULT NULL,
  `limit` INT DEFAULT NULL,
  `users_processed` INT NOT NULL DEFAULT 0,
  `users_with_errors` INT NOT NULL DEFAULT 0,
  `documents_fetched` INT NOT NULL DEFAULT 0,
  `documents_created` INT NOT NULL DEFAULT 0,
  `documents_updated` INT NOT NULL DEFAULT 0,
  `documents_failed` INT NOT NULL DEFAULT 0,
  `authors_created` INT NOT NULL DEFAULT 0,
  `authors_updated` INT NOT NULL DEFAULT 0,
  `affiliations_created` INT NOT NULL DEFAULT 0,
  `affiliations_updated` INT NOT NULL DEFAULT 0,
  `links_inserted` INT NOT NULL DEFAULT 0,
  `links_updated` INT NOT NULL DEFAULT 0,
  `started_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `finished_at` DATETIME DEFAULT NULL,
  `duration_seconds` DOUBLE DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_scopus_batch_import_runs_status_started` (`status`, `started_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `citescore_metrics_runs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `run_type` VARCHAR(32) NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'running',
  `error_message` TEXT DEFAULT NULL,
  `sources_scanned` INT NOT NULL DEFAULT 0,
  `sources_refreshed` INT NOT NULL DEFAULT 0,
  `skipped` INT NOT NULL DEFAULT 0,
  `errors` INT NOT NULL DEFAULT 0,
  `journals_scanned` INT NOT NULL DEFAULT 0,
  `metrics_fetched` INT NOT NULL DEFAULT 0,
  `skipped_existing` INT NOT NULL DEFAULT 0,
  `started_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `finished_at` DATETIME DEFAULT NULL,
  `duration_seconds` DOUBLE DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_citescore_metrics_runs_type_started` (`run_type`, `started_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
