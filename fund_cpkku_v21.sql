-- phpMyAdmin SQL Dump
-- version 4.9.5deb2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Aug 06, 2025 at 03:42 PM
-- Server version: 11.1.6-MariaDB-ubu2004
-- PHP Version: 7.4.3-4ubuntu2.29

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `fund_cpkku`
--

DELIMITER $$
--
-- Procedures
--
CREATE DEFINER=`devuser`@`localhost` PROCEDURE `CreateNotification` (IN `p_user_id` INT, IN `p_title` VARCHAR(255), IN `p_message` TEXT, IN `p_type` VARCHAR(50), IN `p_application_id` INT)  BEGIN
    INSERT INTO notifications (
        user_id, title, message, type, 
        related_application_id, is_read, create_at
    ) VALUES (
        p_user_id, p_title, p_message, p_type, 
        p_application_id, FALSE, NOW()
    );
END$$

CREATE DEFINER=`devuser`@`localhost` PROCEDURE `migrate_fund_applications` ()  BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_submission_id INT;
    DECLARE v_application_id INT;
    DECLARE v_subcategory_id INT;
    DECLARE v_project_title VARCHAR(255);
    DECLARE v_project_description TEXT;
    DECLARE v_requested_amount DECIMAL(15,2);
    DECLARE v_approved_amount DECIMAL(15,2);
    DECLARE v_closed_at DATETIME;
    DECLARE v_comment TEXT;
    
    DECLARE cur CURSOR FOR
        SELECT 
            fa.application_id,
            fa.subcategory_id,
            fa.project_title,
            fa.project_description,
            fa.requested_amount,
            fa.approved_amount,
            fa.closed_at,
            fa.comment
        FROM fund_applications fa
        WHERE fa.delete_at IS NULL;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    -- Start transaction
    START TRANSACTION;
    
    OPEN cur;
    
    read_loop: LOOP
        FETCH cur INTO v_application_id, v_subcategory_id, v_project_title, 
                      v_project_description, v_requested_amount, v_approved_amount,
                      v_closed_at, v_comment;
        
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- Get the submission_id for this application
        SELECT submission_id INTO v_submission_id
        FROM submissions s
        JOIN fund_applications fa ON s.submission_number = fa.application_number
        WHERE fa.application_id = v_application_id
        LIMIT 1;
        
        -- Insert into fund_application_details
        IF v_submission_id IS NOT NULL THEN
            INSERT INTO fund_application_details (
                submission_id, subcategory_id, project_title,
                project_description, requested_amount, approved_amount,
                closed_at, comment
            ) VALUES (
                v_submission_id, v_subcategory_id, v_project_title,
                v_project_description, v_requested_amount, v_approved_amount,
                v_closed_at, v_comment
            )
            ON DUPLICATE KEY UPDATE
                subcategory_id = VALUES(subcategory_id),
                project_title = VALUES(project_title),
                project_description = VALUES(project_description),
                requested_amount = VALUES(requested_amount),
                approved_amount = VALUES(approved_amount),
                closed_at = VALUES(closed_at),
                comment = VALUES(comment);
        END IF;
    END LOOP;
    
    CLOSE cur;
    
    -- Commit transaction
    COMMIT;
    
    -- Report results
    SELECT COUNT(*) as migrated_count FROM fund_application_details;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `application_status`
--

CREATE TABLE `application_status` (
  `application_status_id` int(11) NOT NULL,
  `status_code` varchar(255) DEFAULT NULL,
  `status_name` varchar(255) DEFAULT NULL,
  `create_at` datetime DEFAULT NULL,
  `update_at` datetime DEFAULT NULL,
  `delete_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `application_status`
--

INSERT INTO `application_status` (`application_status_id`, `status_code`, `status_name`, `create_at`, `update_at`, `delete_at`) VALUES
(1, '0', 'รอพิจารณา', '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL),
(2, '1', 'อนุมัติ', '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL),
(3, '2', 'ปฏิเสธ', '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `log_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `action` enum('create','update','delete','login','logout','view','download','approve','reject','submit','review') NOT NULL,
  `entity_type` varchar(50) NOT NULL,
  `entity_id` int(11) DEFAULT NULL,
  `entity_number` varchar(50) DEFAULT NULL,
  `old_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`old_values`)),
  `new_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`new_values`)),
  `changed_fields` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `audit_logs`
--

INSERT INTO `audit_logs` (`log_id`, `user_id`, `action`, `entity_type`, `entity_id`, `entity_number`, `old_values`, `new_values`, `changed_fields`, `ip_address`, `user_agent`, `description`, `created_at`) VALUES
(1, 8, 'create', 'submission', 1, 'PR-20250731-0001', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-07-31 12:58:57'),
(2, 8, 'submit', 'submission', 1, 'PR-20250731-0001', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-07-31 12:58:57'),
(3, 8, 'create', 'submission', 2, 'PR-20250731-0002', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-07-31 13:28:33'),
(4, 8, 'submit', 'submission', 2, 'PR-20250731-0002', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-07-31 13:28:34'),
(5, 8, 'create', 'submission', 3, 'PR-20250731-0003', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-07-31 13:38:11'),
(6, 8, 'submit', 'submission', 3, 'PR-20250731-0003', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-07-31 13:38:11'),
(7, 8, 'create', 'submission', 4, 'PR-20250731-0004', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-07-31 13:42:38'),
(8, 8, 'submit', 'submission', 4, 'PR-20250731-0004', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-07-31 13:42:38'),
(9, 8, 'create', 'submission', 5, 'PR-20250731-0005', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-07-31 13:44:25'),
(10, 8, 'submit', 'submission', 5, 'PR-20250731-0005', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-07-31 13:44:25'),
(11, 8, 'create', 'submission', 6, 'PR-20250801-0001', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-08-01 10:24:28'),
(12, 8, 'submit', 'submission', 6, 'PR-20250801-0001', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-08-01 10:24:29'),
(13, 8, 'create', 'submission', 7, 'PR-20250801-0002', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-08-01 10:25:34'),
(14, 8, 'submit', 'submission', 7, 'PR-20250801-0002', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-08-01 10:25:35'),
(15, 8, 'create', 'submission', 8, 'PR-20250801-0003', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-08-01 10:38:16'),
(16, 8, 'submit', 'submission', 8, 'PR-20250801-0003', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-08-01 10:38:16'),
(17, 8, 'create', 'submission', 9, 'PR-20250801-0004', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-08-01 10:39:09'),
(18, 8, 'submit', 'submission', 9, 'PR-20250801-0004', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-08-01 10:39:09'),
(19, 8, 'create', 'submission', 10, 'PR-20250801-0005', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-08-01 10:42:00'),
(20, 8, 'submit', 'submission', 10, 'PR-20250801-0005', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-08-01 10:42:00'),
(21, 8, 'create', 'submission', 11, 'PR-20250801-0006', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-08-01 10:50:27'),
(22, 8, 'submit', 'submission', 11, 'PR-20250801-0006', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-08-01 10:50:27'),
(23, 8, 'create', 'submission', 12, 'PR-20250801-0007', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-08-01 11:09:50'),
(24, 8, 'submit', 'submission', 12, 'PR-20250801-0007', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-08-01 11:09:50'),
(25, 8, 'create', 'submission', 13, 'PR-20250801-0008', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-08-01 11:19:12'),
(26, 8, 'submit', 'submission', 13, 'PR-20250801-0008', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-08-01 11:19:12'),
(27, 8, 'create', 'submission', 14, 'PR-20250801-0009', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-08-01 11:22:17'),
(28, 8, 'submit', 'submission', 14, 'PR-20250801-0009', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-08-01 11:22:17'),
(29, 8, 'create', 'submission', 15, 'PR-20250801-0010', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-08-01 11:23:53'),
(30, 8, 'submit', 'submission', 15, 'PR-20250801-0010', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-08-01 11:23:53'),
(31, 8, 'create', 'submission', 16, 'PR-20250801-0011', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-08-01 11:34:30'),
(32, 8, 'submit', 'submission', 16, 'PR-20250801-0011', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-08-01 11:34:30'),
(33, 8, 'create', 'submission', 17, 'PR-20250801-0012', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-08-01 11:37:53'),
(34, 8, 'submit', 'submission', 17, 'PR-20250801-0012', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-08-01 11:37:54'),
(35, 8, 'create', 'submission', 18, 'PR-20250801-0013', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-08-01 11:40:47'),
(36, 8, 'submit', 'submission', 18, 'PR-20250801-0013', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-08-01 11:40:47'),
(37, 8, 'create', 'submission', 19, 'PR-20250801-0014', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-08-01 12:08:25'),
(38, 8, 'submit', 'submission', 19, 'PR-20250801-0014', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-08-01 12:08:25'),
(39, 8, 'create', 'submission', 20, 'PR-20250801-0015', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-08-01 12:11:19'),
(40, 8, 'submit', 'submission', 20, 'PR-20250801-0015', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-08-01 12:11:19'),
(41, 8, 'create', 'submission', 21, 'PR-20250801-0016', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-08-01 22:29:44'),
(42, 8, 'submit', 'submission', 21, 'PR-20250801-0016', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-08-01 22:29:44'),
(43, 8, 'create', 'submission', 22, 'PR-20250802-0001', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-08-02 12:18:25'),
(44, 8, 'submit', 'submission', 22, 'PR-20250802-0001', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-08-02 12:18:25'),
(45, 8, 'create', 'submission', 23, 'PR-20250805-0001', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-08-05 22:41:57'),
(46, 8, 'submit', 'submission', 23, 'PR-20250805-0001', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-08-05 22:41:57'),
(47, 8, 'create', 'submission', 24, 'PR-20250805-0002', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-08-05 22:46:58'),
(48, 8, 'submit', 'submission', 24, 'PR-20250805-0002', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-08-05 22:46:59');

-- --------------------------------------------------------

--
-- Table structure for table `document_types`
--

CREATE TABLE `document_types` (
  `document_type_id` int(11) NOT NULL,
  `document_type_name` varchar(255) DEFAULT NULL,
  `code` varchar(50) DEFAULT NULL,
  `category` varchar(50) DEFAULT 'general',
  `required` tinyint(1) DEFAULT 0,
  `multiple` tinyint(1) DEFAULT 0,
  `document_order` int(11) DEFAULT 0,
  `is_required` enum('yes','no') DEFAULT NULL,
  `create_at` datetime DEFAULT current_timestamp(),
  `update_at` datetime DEFAULT current_timestamp(),
  `delete_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `document_types`
--

INSERT INTO `document_types` (`document_type_id`, `document_type_name`, `code`, `category`, `required`, `multiple`, `document_order`, `is_required`, `create_at`, `update_at`, `delete_at`) VALUES
(1, 'QS WUR 1-400', 'qs_wur_1-400', '', 0, 0, 1, NULL, NULL, NULL, NULL),
(2, 'Full reprint (บทความตีพิมพ์)', 'full_reprint_(บทความตีพิมพ์)', 'publication', 1, 0, 2, NULL, NULL, NULL, NULL),
(3, 'Scopus-ISI (หลักฐานการจัดอันดับ)', 'scopus-isi_(หลักฐานการจัดอันดับ)', 'publication', 1, 0, 3, NULL, NULL, NULL, NULL),
(4, 'สำเนาบัญชีธนาคาร', 'สำเนาบัญชีธนาคาร', '', 1, 0, 4, NULL, NULL, NULL, NULL),
(5, 'Payment / Exchange rate', 'payment_/_exchange_rate', 'publication', 0, 0, 5, NULL, NULL, NULL, NULL),
(6, 'Page charge Invoice', 'page_charge_invoice', '', 0, 0, 6, NULL, NULL, NULL, NULL),
(7, 'Page charge Receipt', 'page_charge_receipt', 'publication', 0, 0, 7, NULL, NULL, NULL, NULL),
(8, 'Manuscript Editor Invoice', 'manuscript_editor_invoice', 'publication', 0, 0, 8, NULL, NULL, NULL, NULL),
(9, 'Manuscript Receipt', 'manuscript_receipt', '', 0, 0, 9, NULL, NULL, NULL, NULL),
(10, 'Review Response (Special issue)', 'review_response_(special_issue)', '', 0, 0, 10, NULL, NULL, NULL, NULL),
(11, 'เอกสารอื่นๆ', 'เอกสารอื่นๆ', 'publication', 0, 1, 11, NULL, NULL, NULL, NULL),
(12, 'เอกสารเบิกจ่ายภายนอก', 'เอกสารเบิกจ่ายภายนอก', 'publication', 0, 1, 12, 'no', NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `file_uploads`
--

CREATE TABLE `file_uploads` (
  `file_id` int(11) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `stored_path` varchar(500) NOT NULL,
  `folder_type` enum('temp','submission','profile','other') DEFAULT 'temp',
  `submission_id` int(11) DEFAULT NULL,
  `file_size` bigint(20) DEFAULT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `file_hash` varchar(64) DEFAULT NULL,
  `is_public` tinyint(1) DEFAULT 0,
  `uploaded_by` int(11) DEFAULT NULL,
  `uploaded_at` datetime DEFAULT current_timestamp(),
  `create_at` datetime DEFAULT current_timestamp(),
  `update_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `delete_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `file_uploads`
--

INSERT INTO `file_uploads` (`file_id`, `original_name`, `stored_path`, `folder_type`, `submission_id`, `file_size`, `mime_type`, `file_hash`, `is_public`, `uploaded_by`, `uploaded_at`, `create_at`, `update_at`, `delete_at`) VALUES
(1, 'pdf-sample_1.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub1_2025-07-31/pdf-sample_1.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-07-31 12:58:57', '2025-07-31 12:58:57', '2025-07-31 12:58:57', NULL),
(2, 'pdf-sample_2.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub1_2025-07-31/pdf-sample_2.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-07-31 12:58:57', '2025-07-31 12:58:57', '2025-07-31 12:58:57', NULL),
(3, 'pdf-sample_3.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub1_2025-07-31/pdf-sample_3.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-07-31 12:58:57', '2025-07-31 12:58:57', '2025-07-31 12:58:57', NULL),
(4, 'pdf-sample_0.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub1_2025-07-31/pdf-sample_0.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-07-31 12:58:57', '2025-07-31 12:58:57', '2025-07-31 12:58:57', NULL),
(5, 'pdf-sample_2.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub2_2025-07-31/pdf-sample_2.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-07-31 13:28:33', '2025-07-31 13:28:33', '2025-07-31 13:28:34', NULL),
(6, 'pdf-sample_1.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub2_2025-07-31/pdf-sample_1.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-07-31 13:28:34', '2025-07-31 13:28:34', '2025-07-31 13:28:34', NULL),
(7, 'pdf-sample_2.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub3_2025-07-31/pdf-sample_2.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-07-31 13:38:11', '2025-07-31 13:38:11', '2025-07-31 13:38:11', NULL),
(8, 'pdf-sample_0.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub3_2025-07-31/pdf-sample_0.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-07-31 13:38:11', '2025-07-31 13:38:11', '2025-07-31 13:38:11', NULL),
(9, 'pdf-sample_1.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub4_2025-07-31/pdf-sample_1.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-07-31 13:42:38', '2025-07-31 13:42:38', '2025-07-31 13:42:38', NULL),
(10, 'pdf-sample_3.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub4_2025-07-31/pdf-sample_3.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-07-31 13:42:38', '2025-07-31 13:42:38', '2025-07-31 13:42:38', NULL),
(11, 'pdf-sample_3.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub5_2025-07-31/pdf-sample_3.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-07-31 13:44:25', '2025-07-31 13:44:25', '2025-07-31 13:44:25', NULL),
(12, 'pdf-sample_0.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub6_2025-08-01/pdf-sample_0.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-01 10:24:29', '2025-08-01 10:24:29', '2025-08-01 10:24:29', NULL),
(13, 'pdf-sample_1.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub6_2025-08-01/pdf-sample_1.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-01 10:24:29', '2025-08-01 10:24:29', '2025-08-01 10:24:29', NULL),
(14, 'pdf-sample_2.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub7_2025-08-01/pdf-sample_2.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-01 10:25:34', '2025-08-01 10:25:34', '2025-08-01 10:25:34', NULL),
(15, 'pdf-sample_2.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub7_2025-08-01/pdf-sample_2_1.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-01 10:25:34', '2025-08-01 10:25:34', '2025-08-01 10:25:34', NULL),
(16, 'pdf-sample_0.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub8_2025-08-01/pdf-sample_0.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-01 10:38:16', '2025-08-01 10:38:16', '2025-08-01 10:38:16', NULL),
(17, 'pdf-sample_1.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub8_2025-08-01/pdf-sample_1.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-01 10:38:16', '2025-08-01 10:38:16', '2025-08-01 10:38:16', NULL),
(18, 'pdf-sample_1.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub9_2025-08-01/pdf-sample_1.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-01 10:39:09', '2025-08-01 10:39:09', '2025-08-01 10:39:09', NULL),
(19, 'pdf-sample_0.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub9_2025-08-01/pdf-sample_0.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-01 10:39:09', '2025-08-01 10:39:09', '2025-08-01 10:39:09', NULL),
(20, 'pdf-sample_0.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub10_2025-08-01/pdf-sample_0.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-01 10:42:00', '2025-08-01 10:42:00', '2025-08-01 10:42:00', NULL),
(21, 'pdf-sample_2.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub11_2025-08-01/pdf-sample_2.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-01 10:50:27', '2025-08-01 10:50:27', '2025-08-01 10:50:27', NULL),
(22, 'pdf-sample_0.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub12_2025-08-01/pdf-sample_0.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-01 11:09:50', '2025-08-01 11:09:50', '2025-08-01 11:09:50', NULL),
(23, 'pdf-sample_1.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub12_2025-08-01/pdf-sample_1.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-01 11:09:50', '2025-08-01 11:09:50', '2025-08-01 11:09:50', NULL),
(24, 'pdf-sample_2.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub13_2025-08-01/pdf-sample_2.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-01 11:19:12', '2025-08-01 11:19:12', '2025-08-01 11:19:12', NULL),
(25, 'pdf-sample_0.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub14_2025-08-01/pdf-sample_0.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-01 11:22:17', '2025-08-01 11:22:17', '2025-08-01 11:22:17', NULL),
(26, 'pdf-sample_1.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub15_2025-08-01/pdf-sample_1.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-01 11:23:53', '2025-08-01 11:23:53', '2025-08-01 11:23:53', NULL),
(27, 'pdf-sample_0.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub16_2025-08-01/pdf-sample_0.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-01 11:34:30', '2025-08-01 11:34:30', '2025-08-01 11:34:30', NULL),
(28, 'pdf-sample_1.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub17_2025-08-01/pdf-sample_1.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-01 11:37:54', '2025-08-01 11:37:54', '2025-08-01 11:37:54', NULL),
(29, 'pdf-sample_1.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub18_2025-08-01/pdf-sample_1.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-01 11:40:47', '2025-08-01 11:40:47', '2025-08-01 11:40:47', NULL),
(30, 'pdf-sample_0.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub19_2025-08-01/pdf-sample_0.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-01 12:08:25', '2025-08-01 12:08:25', '2025-08-01 12:08:25', NULL),
(31, 'pdf-sample_1.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub19_2025-08-01/pdf-sample_1.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-01 12:08:25', '2025-08-01 12:08:25', '2025-08-01 12:08:25', NULL),
(32, 'pdf-sample_1.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub20_2025-08-01/pdf-sample_1.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-01 12:11:19', '2025-08-01 12:11:19', '2025-08-01 12:11:19', NULL),
(33, 'pdf-sample_0.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub21_2025-08-01/pdf-sample_0.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-01 22:29:44', '2025-08-01 22:29:44', '2025-08-01 22:29:44', NULL),
(34, 'pdf-sample_1.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub21_2025-08-01/pdf-sample_1.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-01 22:29:44', '2025-08-01 22:29:44', '2025-08-01 22:29:44', NULL),
(35, 'pdf-sample_0.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub21_2025-08-01/pdf-sample_0_1.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-01 22:29:44', '2025-08-01 22:29:44', '2025-08-01 22:29:44', NULL),
(36, 'pdf-sample_0.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub22_2025-08-02/pdf-sample_0.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-02 12:18:25', '2025-08-02 12:18:25', '2025-08-02 12:18:25', NULL),
(37, 'pdf-sample_1.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub22_2025-08-02/pdf-sample_1.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-02 12:18:25', '2025-08-02 12:18:25', '2025-08-02 12:18:25', NULL),
(38, 'pdf-sample_2.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub22_2025-08-02/pdf-sample_2.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-02 12:18:25', '2025-08-02 12:18:25', '2025-08-02 12:18:25', NULL),
(39, 'pdf-sample_2.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub22_2025-08-02/pdf-sample_2_1.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-02 12:18:25', '2025-08-02 12:18:25', '2025-08-02 12:18:25', NULL),
(40, 'merged_documents.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub22_2025-08-02/merged_documents.pdf', 'temp', NULL, 23937, 'application/pdf', '', 0, 8, '2025-08-02 12:18:25', '2025-08-02 12:18:25', '2025-08-02 12:18:25', NULL),
(41, 'pdf-sample_0.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub23_2025-08-05/pdf-sample_0.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-05 22:41:57', '2025-08-05 22:41:57', '2025-08-05 22:41:57', NULL),
(42, 'pdf-sample_1.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub23_2025-08-05/pdf-sample_1.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-05 22:41:57', '2025-08-05 22:41:57', '2025-08-05 22:41:57', NULL),
(43, 'pdf-sample_1.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub24_2025-08-05/pdf-sample_1.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-05 22:46:59', '2025-08-05 22:46:59', '2025-08-05 22:46:59', NULL),
(44, 'pdf-sample_2.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub24_2025-08-05/pdf-sample_2.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-05 22:46:59', '2025-08-05 22:46:59', '2025-08-05 22:46:59', NULL),
(45, 'pdf-sample_0.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub24_2025-08-05/pdf-sample_0.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-05 22:46:59', '2025-08-05 22:46:59', '2025-08-05 22:46:59', NULL),
(46, 'pdf-sample_0.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub24_2025-08-05/pdf-sample_0_1.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-05 22:46:59', '2025-08-05 22:46:59', '2025-08-05 22:46:59', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `fund_application_details`
--

CREATE TABLE `fund_application_details` (
  `detail_id` int(11) NOT NULL,
  `submission_id` int(11) NOT NULL,
  `subcategory_id` int(11) NOT NULL,
  `project_title` varchar(255) DEFAULT NULL,
  `project_description` text DEFAULT NULL,
  `requested_amount` decimal(15,2) DEFAULT NULL,
  `approved_amount` decimal(15,2) DEFAULT NULL,
  `closed_at` datetime DEFAULT NULL,
  `comment` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `fund_categories`
--

CREATE TABLE `fund_categories` (
  `category_id` int(11) NOT NULL,
  `category_name` varchar(255) DEFAULT NULL,
  `status` enum('active','disable') DEFAULT NULL,
  `year_id` int(11) DEFAULT NULL,
  `comment` text DEFAULT NULL,
  `create_at` datetime DEFAULT NULL,
  `update_at` datetime DEFAULT NULL,
  `delete_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `fund_categories`
--

INSERT INTO `fund_categories` (`category_id`, `category_name`, `status`, `year_id`, `comment`, `create_at`, `update_at`, `delete_at`) VALUES
(1, 'ทุนส่งเสริมการวิจัย', 'active', 1, NULL, '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL),
(2, 'ทุนอุดหนุนกิจกรรม', 'active', 1, NULL, '2025-06-24 16:49:13', '2025-07-23 19:29:48', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `fund_subcategories`
--

CREATE TABLE `fund_subcategories` (
  `subcategory_id` int(11) NOT NULL,
  `category_id` int(11) DEFAULT NULL,
  `subcategory_name` varchar(255) DEFAULT NULL,
  `fund_condition` text DEFAULT NULL,
  `target_roles` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'บทบาทที่สามารถเห็นทุนนี้ได้ (เก็บเป็น JSON array)',
  `form_type` varchar(50) DEFAULT 'download' COMMENT 'ประเภทฟอร์ม: download, publication_reward, research_proposal, etc.',
  `form_url` varchar(255) DEFAULT NULL COMMENT 'URL สำหรับดาวน์โหลดฟอร์ม (ถ้า form_type = download)',
  `status` enum('active','disable') DEFAULT NULL,
  `comment` text DEFAULT NULL,
  `create_at` datetime DEFAULT NULL,
  `update_at` datetime DEFAULT NULL,
  `delete_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `fund_subcategories`
--

INSERT INTO `fund_subcategories` (`subcategory_id`, `category_id`, `subcategory_name`, `fund_condition`, `target_roles`, `form_type`, `form_url`, `status`, `comment`, `create_at`, `update_at`, `delete_at`) VALUES
(1, 1, '1.1 ทุนสนับสนุนผู้เชี่ยวชาญต่างประเทศ', 'ผู้ได้รับทุนสนับสนุนผู้เชี่ยวชาญต่างประเทศ ต้องเผยแพร่บทความในฐานข้อมูลระดับ WOS หรือ ISI หรือ SCOPUS ในควอร์ไทล์ที่ 1 (Q1)', '[\"1\",\"3\"]', 'download', 'http://147.50.230.213:8080/uploads/form.pdf', 'active', NULL, '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL),
(2, 1, '1.2 ทุนวิจัยสถาบัน', 'ผู้ได้รับทุนสนับสนุนวิจัยสถาบัน ทุนวิจัยเพื่องานประจำ หรือทุนวิจัยในชั้นเรียนจะต้องมีชิ้นงาน', '[\"2\",\"3\"]', 'download', NULL, 'active', NULL, '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL),
(3, 1, '1.3 ทุนวิจัยเพื่อพัฒนางานประจํา', NULL, '[\"2\", \"3\"]', 'download', NULL, 'active', NULL, '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL),
(4, 1, '1.4 ทุนวิจัยในชั้นเรียน', NULL, '[\"1\", \"3\"]', 'download', NULL, 'active', NULL, '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL),
(5, 1, 'ทุนสนับสนุนงานวิจัย นวัตกรรมและสิ่งประดิษฐ์เพื่อการเรียนการสอน', NULL, '[\"1\", \"3\"]', 'download', NULL, 'active', NULL, '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL),
(6, 1, '1.5 ทุนวิจัยความเป็นเลิศ', 'ผู้ได้รับทุนวิจัยความเป็นเลิศ ต้องเผยแพร่บทความในฐานข้อมูลระดับ WOS หรือ ISI หรือ SCOPUS', '[\"1\", \"3\"]', 'download', NULL, 'active', NULL, '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL),
(7, 1, '1.10 ทุนพัฒนากลุ่มวิจัยบูรณาการ', 'ทุนพัฒนากลุ่มวิจัยบูรณาการ แบ่งออกเป็น 3 ระดับ', '[\"1\", \"3\"]', 'download', NULL, 'active', NULL, '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL),
(8, 1, 'ทุนนักวิจัยอาวุโส', NULL, '[\"1\", \"3\"]', 'download', NULL, 'active', NULL, '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL),
(9, 1, '1.7 ทุนพัฒนาศูนย์วิจัย', NULL, '[\"1\", \"3\"]', 'download', NULL, 'active', NULL, '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL),
(10, 1, 'ทุนฝึกอบรมนักวิจัยหลังปริญญาเอก', 'ทุนฝึกอบรมนักวิจัยหลังปริญญาเอก เป็นการสนับสนุนนักวิจัยผ่านการรับทุนของอาจารย์', '[\"1\", \"3\"]', 'download', NULL, 'active', NULL, '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL),
(11, 1, '1.6 ทุนนวัตกรรมความเป็นเลิศ', 'ผู้ได้รับทุนนวัตกรรมความเป็นเลิศ จะต้องสร้างนวัตกรรมหรือเครื่องมือ เครื่องใช้', '[\"1\", \"3\"]', 'download', NULL, 'active', NULL, '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL),
(12, 1, '1.9 ทุนสนับสนุนการได้รับทุนวิจัยภายนอก', NULL, '[\"1\", \"3\"]', 'download', NULL, 'active', NULL, '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL),
(13, 2, 'ทุนทําวิจัยในต่างประเทศ', NULL, '[\"1\"]', 'download', NULL, 'active', NULL, '2025-06-24 16:49:13', '2025-07-23 12:31:56', NULL),
(14, 2, 'เงินรางวัลการตีพิมพ์เผยแพร่ผลงานวิจัยที่ได้รับการตีพิมพ์ในสาขาวิทยาศาสตร์และเทคโนโลยี (กรณีเป็นผู้แต่งชื่อแรก)', NULL, '[\"1\"]', 'publication_reward', NULL, 'active', NULL, '2025-06-24 16:49:13', '2025-07-23 15:10:25', NULL),
(15, 2, 'เงินรางวัลการตีพิมพ์เผยแพร่ผลงานวิจัยที่ได้รับการตีพิมพ์ในสาขาวิทยาศาสตร์และเทคโนโลยี (กรณีเป็นผู้ประพันธ์บรรณกิจ)', NULL, '[\"2\",\"1\"]', 'publication_reward', NULL, 'active', NULL, NULL, '2025-08-02 12:28:55', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `notification_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text DEFAULT NULL,
  `type` enum('info','success','warning','error') DEFAULT 'info',
  `is_read` tinyint(1) DEFAULT 0,
  `related_submission_id` int(11) DEFAULT NULL,
  `create_at` datetime DEFAULT current_timestamp(),
  `update_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `delete_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `positions`
--

CREATE TABLE `positions` (
  `position_id` int(11) NOT NULL,
  `position_name` varchar(255) DEFAULT NULL,
  `is_active` enum('yes','no') DEFAULT 'yes',
  `create_at` datetime DEFAULT NULL,
  `update_at` datetime DEFAULT NULL,
  `delete_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `positions`
--

INSERT INTO `positions` (`position_id`, `position_name`, `is_active`, `create_at`, `update_at`, `delete_at`) VALUES
(1, 'อาจารย์', 'yes', '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL),
(2, 'รองศาสตราจารย์', 'yes', '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL),
(3, 'พนักงานธุรการ', 'yes', '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `publication_reward_details`
--

CREATE TABLE `publication_reward_details` (
  `detail_id` int(11) NOT NULL,
  `submission_id` int(11) NOT NULL,
  `paper_title` varchar(500) NOT NULL,
  `journal_name` varchar(255) NOT NULL,
  `publication_date` date NOT NULL,
  `publication_type` enum('journal','conference','book_chapter','other') DEFAULT 'journal',
  `quartile` enum('Q1','Q2','Q3','Q4','T5','T10','TCI','N/A') DEFAULT 'N/A',
  `impact_factor` decimal(10,3) DEFAULT NULL,
  `doi` varchar(255) DEFAULT NULL,
  `url` varchar(500) DEFAULT NULL,
  `page_numbers` varchar(50) DEFAULT NULL,
  `volume_issue` varchar(100) DEFAULT NULL,
  `indexing` varchar(255) DEFAULT NULL,
  `reward_amount` decimal(15,2) DEFAULT 0.00 COMMENT 'เงินรางวัลอ้างอิงจาก Author และ Quartile',
  `reward_approve_amount` decimal(15,2) DEFAULT 0.00 COMMENT 'จำนวนเงินรางวัลที่อนุมัติ',
  `revision_fee` decimal(15,2) DEFAULT 0.00 COMMENT 'ค่าปรับปรุง',
  `publication_fee` decimal(15,2) DEFAULT 0.00 COMMENT 'ค่าตีพิมพ์',
  `external_funding_amount` decimal(15,2) DEFAULT 0.00 COMMENT 'รวมจำนวนเงินจากทุนที่ user แนบเข้ามา',
  `total_amount` decimal(15,2) DEFAULT 0.00 COMMENT 'เกิดจากการหักลบค่าปรับปรุง+ค่าตีพิมพ์ ลบกับ รายการที่เบิกจากหน่วยงานนอก',
  `total_approve_amount` decimal(15,2) DEFAULT 0.00 COMMENT 'จำนวนเงินจริงที่วิทยาลัยจ่ายให้ (หลังจากได้รับการอนุมัติ)',
  `announce_reference_number` varchar(50) DEFAULT NULL,
  `author_count` int(11) DEFAULT 1,
  `author_type` enum('first_author','corresponding_author','coauthor') DEFAULT 'coauthor',
  `has_university_funding` enum('yes','no') DEFAULT 'no' COMMENT 'ได้รับการสนับสนุนทุนจากมหาวิทยาลัยหรือไม่',
  `funding_references` text DEFAULT NULL COMMENT 'หมายเลขอ้างอิงทุน (คั่นด้วยจุลภาค)',
  `university_rankings` text DEFAULT NULL COMMENT 'อันดับมหาวิทยาลัย/สถาบัน (คั่นด้วยจุลภาค)'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางเก็บรายละเอียดการขอรับเงินรางวัลผลงานวิชาการ พร้อมข้อมูลเพิ่มเติม';

--
-- Dumping data for table `publication_reward_details`
--

INSERT INTO `publication_reward_details` (`detail_id`, `submission_id`, `paper_title`, `journal_name`, `publication_date`, `publication_type`, `quartile`, `impact_factor`, `doi`, `url`, `page_numbers`, `volume_issue`, `indexing`, `reward_amount`, `reward_approve_amount`, `revision_fee`, `publication_fee`, `external_funding_amount`, `total_amount`, `total_approve_amount`, `announce_reference_number`, `author_count`, `author_type`, `has_university_funding`, `funding_references`, `university_rankings`) VALUES
(1, 1, 'asd', 'asdasd', '2025-07-31', 'journal', 'Q3', '0.000', '', '', '', '', '', '20000.00', '0.00', '123.00', '321.00', '2.00', '20442.00', '0.00', '', 3, 'corresponding_author', 'no', NULL, NULL),
(2, 2, 'asdasd', 'asd', '2025-07-31', 'journal', 'Q2', '0.000', '', '', '', '', '', '30000.00', '0.00', '0.00', '0.00', '0.00', '30000.00', '0.00', '', 3, 'corresponding_author', 'no', NULL, NULL),
(3, 3, 'asd', 'asd', '2025-07-31', 'journal', 'Q1', '0.000', '', '', '', '', '', '40000.00', '0.00', '0.00', '0.00', '0.00', '40000.00', '0.00', '', 3, 'first_author', 'no', NULL, NULL),
(4, 4, 'asdasd', 'asd', '2025-07-31', 'journal', 'Q4', '0.000', '', '', '', '', '', '10000.00', '0.00', '0.00', '0.00', '0.00', '10000.00', '0.00', '', 3, 'corresponding_author', 'no', NULL, NULL),
(5, 5, 'polow', 'asd', '2025-07-31', 'journal', 'Q3', '0.000', '', '', '', '', '', '20000.00', '0.00', '0.00', '0.00', '0.00', '20000.00', '0.00', '', 3, 'first_author', 'no', NULL, NULL),
(6, 6, 'ฟหกฟหก', 'ฟฟฟ', '2025-08-01', 'journal', 'T5', '0.000', '', '', '', '', '', '50000.00', '0.00', '0.00', '0.00', '0.00', '50000.00', '0.00', '', 3, 'first_author', 'no', NULL, NULL),
(7, 7, 'asdasd', 'asd', '2025-08-01', 'journal', 'Q3', '0.000', '', '', '', '', '', '20000.00', '0.00', '0.00', '0.00', '0.00', '20000.00', '0.00', '', 3, 'first_author', 'no', NULL, NULL),
(8, 8, 'asdasd', 'asd', '2025-08-01', 'journal', 'Q1', '0.000', '', '', '', '', '', '40000.00', '0.00', '0.00', '0.00', '0.00', '40000.00', '0.00', '', 3, 'corresponding_author', 'no', NULL, NULL),
(9, 9, 'ฟหกฟหก', 'asd', '2025-08-01', 'journal', 'Q2', '0.000', '', '', '', '', '', '30000.00', '0.00', '0.00', '0.00', '0.00', '30000.00', '0.00', '', 3, 'first_author', 'no', NULL, NULL),
(10, 10, 'ฟหกฟหก', 'mom', '2025-08-01', 'journal', 'Q2', '0.000', '', '', '', '', '', '30000.00', '0.00', '0.00', '0.00', '0.00', '30000.00', '0.00', '', 3, 'first_author', 'no', NULL, NULL),
(11, 11, 'ฟหกฟหก', 'asd', '2025-08-01', 'journal', 'Q4', '0.000', '', '', '', '', '', '10000.00', '0.00', '0.00', '0.00', '0.00', '10000.00', '0.00', '', 3, 'first_author', 'no', NULL, NULL),
(12, 12, 'ฟหกฟหก', 'asd', '2025-08-01', 'journal', 'Q4', '0.000', '', '', '', '', '', '10000.00', '0.00', '0.00', '0.00', '0.00', '10000.00', '0.00', '', 3, 'first_author', 'no', NULL, NULL),
(13, 13, 'ฟหกฟหก', 'asd', '2025-08-01', 'journal', 'T5', '0.000', '', '', '', '', '', '50000.00', '0.00', '0.00', '0.00', '0.00', '50000.00', '0.00', '', 3, 'corresponding_author', 'no', NULL, NULL),
(14, 14, 'polow', 'ฟฟฟ', '2025-08-01', 'journal', 'T10', '0.000', '', '', '', '', '', '45000.00', '0.00', '0.00', '0.00', '0.00', '45000.00', '0.00', '', 3, 'first_author', 'no', NULL, NULL),
(15, 15, 'ฟหกฟหก', 'asd', '2025-08-01', 'journal', 'Q1', '0.000', '', '', '', '', '', '40000.00', '0.00', '0.00', '0.00', '0.00', '40000.00', '0.00', '', 3, 'first_author', 'no', NULL, NULL),
(16, 16, 'polow', 'asd', '2025-08-01', 'journal', 'T10', '0.000', '', '', '', '', '', '45000.00', '0.00', '0.00', '0.00', '0.00', '45000.00', '0.00', '', 3, 'corresponding_author', 'no', NULL, NULL),
(17, 17, 'ฟหกฟหก', 'mom', '2025-08-01', 'journal', 'Q4', '0.000', '', '', '', '', '', '10000.00', '0.00', '0.00', '0.00', '0.00', '10000.00', '0.00', '', 3, 'first_author', 'no', NULL, NULL),
(18, 18, 'polow', 'ฟฟฟ', '2025-08-01', 'journal', 'Q2', '0.000', '', '', '', '', '', '30000.00', '0.00', '0.00', '0.00', '0.00', '30000.00', '0.00', '', 3, 'corresponding_author', 'no', NULL, NULL),
(19, 19, 'ฟหกฟหก', 'ฟหกฟหกฟหก', '2025-08-01', 'journal', 'Q1', '0.000', '', '', '', '', '', '40000.00', '0.00', '0.00', '0.00', '0.00', '40000.00', '0.00', '', 3, 'first_author', 'no', NULL, NULL),
(20, 20, 'ฟหกฟหก', 'ฟหกฟหกฟหก', '2025-08-01', 'journal', 'Q2', '0.000', '', '', '', '', '', '30000.00', '0.00', '0.00', '0.00', '0.00', '30000.00', '0.00', '', 3, 'first_author', 'no', NULL, NULL),
(21, 21, 'ฟหกฟหก', 'asdasd', '2025-03-01', 'journal', 'T10', '0.000', '123', '123', '123', '123', '', '45000.00', '0.00', '123.00', '123.00', '500.00', '44746.00', '0.00', '', 3, 'first_author', 'no', NULL, NULL),
(22, 22, 'polow', 'asdasd', '2025-02-01', 'journal', 'Q3', '0.000', '', '', '', '', '', '20000.00', '0.00', '5000.00', '27000.00', '5000.00', '47000.00', '0.00', '', 1, 'first_author', 'no', NULL, NULL),
(23, 23, 'ฟหกฟหก', 'asdasd', '2025-01-01', 'journal', 'Q2', '0.000', '123', '123', '123', '123', '', '30000.00', '0.00', '0.00', '0.00', '0.00', '30000.00', '0.00', '', 3, 'first_author', 'no', NULL, NULL),
(24, 24, 'ฟหกฟหก', 'asdasd', '2025-03-01', 'journal', 'T5', '0.000', '', '', '', '123', '', '50000.00', '0.00', '1000.00', '5000.00', '300.00', '55700.00', '0.00', '', 2, 'first_author', 'no', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `publication_reward_rates`
--

CREATE TABLE `publication_reward_rates` (
  `rate_id` int(11) NOT NULL,
  `year` varchar(4) NOT NULL,
  `author_status` enum('first_author','corresponding_author') NOT NULL,
  `journal_quartile` enum('Q1','Q2','Q3','Q4','T5','T10','TCI','N/A') NOT NULL,
  `reward_amount` decimal(15,2) NOT NULL COMMENT 'จำนวนเงินรางวัล',
  `is_active` tinyint(1) DEFAULT 1,
  `create_at` datetime DEFAULT current_timestamp(),
  `update_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `publication_reward_rates`
--

INSERT INTO `publication_reward_rates` (`rate_id`, `year`, `author_status`, `journal_quartile`, `reward_amount`, `is_active`, `create_at`, `update_at`) VALUES
(1, '2568', 'first_author', 'Q1', '40000.00', 1, '2025-07-02 09:35:58', '2025-08-04 15:33:26'),
(2, '2568', 'first_author', 'Q2', '30000.00', 1, '2025-07-02 09:35:58', '2025-08-04 15:33:28'),
(3, '2568', 'first_author', 'Q3', '20000.00', 1, '2025-07-02 09:35:58', '2025-08-04 15:33:29'),
(4, '2568', 'first_author', 'Q4', '10000.00', 1, '2025-07-02 09:35:58', '2025-08-04 15:33:30'),
(5, '2568', 'corresponding_author', 'Q1', '40000.00', 1, '2025-07-02 09:35:58', '2025-08-04 15:33:31'),
(6, '2568', 'corresponding_author', 'Q2', '30000.00', 1, '2025-07-02 09:35:58', '2025-08-04 15:33:31'),
(7, '2568', 'corresponding_author', 'Q3', '20000.00', 1, '2025-07-02 09:35:58', '2025-08-04 15:33:32'),
(8, '2568', 'corresponding_author', 'Q4', '10000.00', 1, '2025-07-02 09:35:58', '2025-08-04 15:33:33'),
(9, '2568', 'first_author', 'T5', '50000.00', 1, '2025-08-04 12:17:36', '2025-08-04 15:33:33'),
(10, '2568', 'first_author', 'T10', '45000.00', 1, '2025-08-04 12:18:14', '2025-08-04 15:33:34'),
(11, '2568', 'first_author', 'TCI', '5000.00', 1, '2025-08-04 12:18:24', '2025-08-04 15:33:35'),
(12, '2568', 'corresponding_author', 'T5', '50000.00', 1, '2025-08-04 12:19:45', '2025-08-04 15:33:36'),
(13, '2568', 'corresponding_author', 'T10', '45000.00', 1, '2025-08-04 12:19:54', '2025-08-04 15:33:37'),
(14, '2568', 'corresponding_author', 'TCI', '5000.00', 1, '2025-08-04 12:20:04', '2025-08-04 15:33:38');

-- --------------------------------------------------------

--
-- Table structure for table `reward_config`
--

CREATE TABLE `reward_config` (
  `config_id` int(11) NOT NULL,
  `year` varchar(4) NOT NULL COMMENT 'ปีงบประมาณ (พ.ศ.)',
  `journal_quartile` enum('Q1','Q2','Q3','Q4','T5','T10','TCI','N/A') DEFAULT NULL COMMENT 'ระดับ Quartile ของวารสาร',
  `max_amount` decimal(15,2) NOT NULL DEFAULT 0.00 COMMENT 'จำนวนเงินสูงสุดที่รับสนับสนุน',
  `condition_description` text DEFAULT NULL COMMENT 'เงื่อนไขเพิ่มเติม',
  `is_active` tinyint(1) DEFAULT 1 COMMENT 'สถานะการใช้งาน',
  `create_at` datetime DEFAULT current_timestamp(),
  `update_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `delete_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `reward_config`
--

INSERT INTO `reward_config` (`config_id`, `year`, `journal_quartile`, `max_amount`, `condition_description`, `is_active`, `create_at`, `update_at`, `delete_at`) VALUES
(1, '2568', 'T5', '50000.00', 'วงเงินสูงสุดสำหรับ T5 วารสาร', 1, '2025-08-04 15:33:53', '2025-08-04 15:35:52', NULL),
(2, '2568', 'T10', '40000.00', 'วงเงินสูงสุดสำหรับ T10 วารสาร', 1, '2025-08-04 15:33:53', '2025-08-04 15:35:55', NULL),
(3, '2568', 'Q1', '30000.00', 'วงเงินสูงสุดสำหรับ Q1 วารสาร', 1, '2025-08-04 15:33:53', '2025-08-04 15:37:32', NULL),
(4, '2568', 'Q2', '20000.00', 'วงเงินสูงสุดสำหรับ Q2 วารสาร', 0, '2025-08-04 15:33:53', '2025-08-04 15:37:42', NULL),
(5, '2568', 'Q3', '15000.00', 'วงเงินสูงสุดสำหรับ Q3 วารสาร', 0, '2025-08-04 15:33:53', '2025-08-04 15:37:44', NULL),
(6, '2568', 'Q4', '10000.00', 'วงเงินสูงสุดสำหรับ Q4 วารสาร', 0, '2025-08-04 15:33:53', '2025-08-04 15:37:46', NULL),
(7, '2568', 'TCI', '5000.00', 'วงเงินสูงสุดสำหรับ TCI วารสาร', 0, '2025-08-04 15:33:53', '2025-08-04 15:37:49', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `role_id` int(11) NOT NULL,
  `role` varchar(255) DEFAULT NULL,
  `create_at` datetime DEFAULT NULL,
  `update_at` datetime DEFAULT NULL,
  `delete_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`role_id`, `role`, `create_at`, `update_at`, `delete_at`) VALUES
(1, 'teacher', '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL),
(2, 'staff', '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL),
(3, 'admin', '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `subcategory_budgets`
--

CREATE TABLE `subcategory_budgets` (
  `subcategory_budget_id` int(11) NOT NULL,
  `subcategory_id` int(11) NOT NULL,
  `allocated_amount` decimal(15,2) DEFAULT NULL COMMENT 'จำนวนทุนต่อไป',
  `remaining_budget` decimal(15,2) DEFAULT NULL,
  `used_amount` decimal(15,2) DEFAULT NULL,
  `max_amount_per_grant` decimal(15,2) DEFAULT NULL,
  `max_grants` int(11) DEFAULT NULL,
  `remaining_grant` int(11) DEFAULT NULL,
  `level` enum('ต้น','กลาง','สูง') DEFAULT NULL,
  `status` enum('active','disable') DEFAULT NULL,
  `fund_description` text DEFAULT NULL,
  `comment` text DEFAULT NULL,
  `create_at` datetime DEFAULT current_timestamp(),
  `update_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `delete_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `subcategory_budgets`
--

INSERT INTO `subcategory_budgets` (`subcategory_budget_id`, `subcategory_id`, `allocated_amount`, `remaining_budget`, `used_amount`, `max_amount_per_grant`, `max_grants`, `remaining_grant`, `level`, `status`, `fund_description`, `comment`, `create_at`, `update_at`, `delete_at`) VALUES
(1, 1, '1200000.00', '1200000.00', '0.00', '200000.00', 6, 6, NULL, 'active', NULL, NULL, '2025-06-24 16:49:13', '2025-07-04 11:06:35', NULL),
(2, 2, '50000.00', '50000.00', '0.00', '25000.00', 2, 2, NULL, 'active', NULL, NULL, NULL, '2025-06-30 12:10:37', NULL),
(3, 3, '80000.00', '80000.00', '0.00', '20000.00', 4, 4, NULL, 'active', NULL, NULL, NULL, '2025-06-30 12:10:40', NULL),
(4, 4, '20000.00', '20000.00', '0.00', '10000.00', 2, 2, NULL, 'active', NULL, NULL, NULL, '2025-06-30 12:10:44', NULL),
(5, 5, '40000.00', '40000.00', '0.00', '20000.00', 2, 2, NULL, 'active', NULL, NULL, '2025-06-30 11:25:57', '2025-06-30 12:10:48', NULL),
(6, 6, '1000000.00', '1000000.00', '0.00', '150000.00', NULL, NULL, 'ต้น', 'active', 'ต้น', NULL, '2025-06-30 11:35:31', '2025-07-20 20:25:18', NULL),
(7, 6, '1000000.00', '1000000.00', '0.00', '200000.00', NULL, NULL, 'กลาง', 'active', 'กลาง', NULL, '2025-06-30 11:35:31', '2025-07-20 20:25:22', NULL),
(8, 6, '1000000.00', '1000000.00', '0.00', '250000.00', NULL, NULL, 'สูง', 'active', 'สูง', NULL, '2025-06-30 11:35:31', '2025-07-20 20:25:24', NULL),
(9, 7, '2500000.00', '2500000.00', '0.00', '1250000.00', 2, 2, NULL, 'active', NULL, NULL, '2025-06-30 11:35:31', '2025-06-30 12:14:15', NULL),
(10, 8, '1000000.00', '1000000.00', '0.00', '1000000.00', 1, 1, NULL, 'active', NULL, NULL, '2025-06-30 11:35:31', '2025-06-30 12:14:23', NULL),
(11, 9, '2500000.00', '2500000.00', '0.00', '2500000.00', 1, 1, NULL, 'active', NULL, NULL, '2025-06-30 11:35:31', '2025-06-30 12:14:26', NULL),
(12, 10, '1200000.00', '1200000.00', '0.00', '400000.00', 3, 3, NULL, 'active', NULL, NULL, '2025-06-30 11:35:31', '2025-06-30 12:14:30', NULL),
(13, 11, '500000.00', '500000.00', '0.00', '100000.00', NULL, NULL, 'ต้น', 'active', 'ต้น', NULL, '2025-06-30 11:46:07', '2025-07-20 20:25:26', NULL),
(14, 11, '500000.00', '500000.00', '0.00', '200000.00', NULL, NULL, 'กลาง', 'active', 'กลาง', NULL, '2025-06-30 11:46:07', '2025-07-20 20:25:30', NULL),
(15, 11, '500000.00', '500000.00', '0.00', '250000.00', NULL, NULL, 'สูง', 'active', 'สูง', NULL, '2025-06-30 11:46:07', '2025-07-20 20:25:33', NULL),
(16, 12, '200000.00', '200000.00', '0.00', '100000.00', 2, 2, NULL, 'active', NULL, 'ไม่เกิน 10% ของเงินทุนที่ได้รับจากภายนอก แต่ไม่เกิน 100,000 บาท', '2025-06-30 11:48:03', '2025-07-23 12:34:42', NULL),
(17, 13, '400000.00', '400000.00', '0.00', '150000.00', NULL, NULL, NULL, 'active', 'ประเทศต่างๆ ยกเว้นประเทศกลุ่มอาเซียน', 'กรณีเดินทางไปทําวิจัยในสถาบันการศึกษาที่อยู่ในอันดับ 1-300 ของโลกหรือสถาบันวิจัยที่มีชื่อเสียง', '2025-06-30 11:48:03', '2025-07-20 17:59:09', NULL),
(18, 13, '400000.00', '400000.00', '0.00', '100000.00', NULL, NULL, NULL, 'active', 'ประเทศกลุ่มอาเซียน', 'กรณีเดินทางไปทําวิจัยในสถาบันการศึกษาที่อยู่ในอันดับ 1-300 ของโลกหรือสถาบันวิจัยที่มีชื่อเสียง', '2025-06-30 11:48:03', '2025-07-20 17:59:37', NULL),
(19, 14, '3500000.00', '3500000.00', '0.00', '150000.00', NULL, NULL, NULL, 'active', 'วารสารระดับนานาชาติในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS (ลําดับ 5% แรก)', NULL, '2025-06-30 11:48:03', '2025-08-02 10:32:46', NULL),
(20, 14, '3500000.00', '3500000.00', '0.00', '125000.00', NULL, NULL, NULL, 'active', 'วารสารระดับนานาชาติในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS (ลําดับ 10% แรก)', NULL, '2025-06-30 11:48:03', '2025-08-02 10:32:46', NULL),
(21, 14, '3500000.00', '3500000.00', '0.00', '100000.00', NULL, NULL, NULL, 'active', 'วารสารระดับนานาชาติในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS ควอร์ไทล์ 1', NULL, '2025-06-30 11:48:03', '2025-08-02 10:32:46', NULL),
(22, 14, '3500000.00', '3500000.00', '0.00', '75000.00', NULL, NULL, NULL, 'active', 'วารสารระดับนานาชาติในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS ควอร์ไทล์ 2', NULL, '2025-06-30 11:48:03', '2025-08-02 10:32:46', NULL),
(23, 15, '3500000.00', '3500000.00', '0.00', '80000.00', NULL, NULL, NULL, 'active', 'วารสารระดับนานาชาติในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS (ลําดับ 5% แรก)', NULL, '2025-06-30 11:48:03', '2025-08-02 12:28:55', NULL),
(24, 15, '3500000.00', '3500000.00', '0.00', '60000.00', NULL, NULL, NULL, 'active', 'วารสารระดับนานาชาติในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS (ลําดับ 10% แรก)', NULL, '2025-06-30 11:48:03', '2025-08-02 12:28:55', NULL),
(25, 15, '3500000.00', '3500000.00', '0.00', '50000.00', NULL, NULL, NULL, 'active', 'วารสารระดับนานาชาติในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS ควอร์ไทล์ 1', NULL, '2025-06-30 11:48:03', '2025-08-02 12:28:55', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `submissions`
--

CREATE TABLE `submissions` (
  `submission_id` int(11) NOT NULL,
  `submission_type` enum('fund_application','publication_reward','conference_grant','training_request') NOT NULL,
  `submission_number` varchar(255) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `year_id` int(11) NOT NULL,
  `status_id` int(11) NOT NULL,
  `submitted_at` datetime DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `approved_by` int(11) DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `submissions`
--

INSERT INTO `submissions` (`submission_id`, `submission_type`, `submission_number`, `user_id`, `year_id`, `status_id`, `submitted_at`, `reviewed_at`, `approved_at`, `approved_by`, `completed_at`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 'publication_reward', 'PR-20250731-0001', 8, 3, 1, '2025-07-31 12:58:57', NULL, NULL, NULL, NULL, '2025-07-31 12:58:57', '2025-07-31 12:58:57', NULL),
(2, 'publication_reward', 'PR-20250731-0002', 8, 3, 1, '2025-07-31 13:28:34', NULL, NULL, NULL, NULL, '2025-07-31 13:28:33', '2025-07-31 13:28:34', NULL),
(3, 'publication_reward', 'PR-20250731-0003', 8, 3, 1, '2025-07-31 13:38:11', NULL, NULL, NULL, NULL, '2025-07-31 13:38:11', '2025-07-31 13:38:11', NULL),
(4, 'publication_reward', 'PR-20250731-0004', 8, 3, 1, '2025-07-31 13:42:38', NULL, NULL, NULL, NULL, '2025-07-31 13:42:38', '2025-07-31 13:42:38', NULL),
(5, 'publication_reward', 'PR-20250731-0005', 8, 3, 1, '2025-07-31 13:44:25', NULL, NULL, NULL, NULL, '2025-07-31 13:44:25', '2025-07-31 13:44:25', NULL),
(6, 'publication_reward', 'PR-20250801-0001', 8, 3, 1, '2025-08-01 10:24:29', NULL, NULL, NULL, NULL, '2025-08-01 10:24:28', '2025-08-01 10:24:29', NULL),
(7, 'publication_reward', 'PR-20250801-0002', 8, 3, 1, '2025-08-01 10:25:35', NULL, NULL, NULL, NULL, '2025-08-01 10:25:34', '2025-08-01 10:25:35', NULL),
(8, 'publication_reward', 'PR-20250801-0003', 8, 3, 1, '2025-08-01 10:38:16', NULL, NULL, NULL, NULL, '2025-08-01 10:38:16', '2025-08-01 10:38:16', NULL),
(9, 'publication_reward', 'PR-20250801-0004', 8, 3, 1, '2025-08-01 10:39:09', NULL, NULL, NULL, NULL, '2025-08-01 10:39:09', '2025-08-01 10:39:09', NULL),
(10, 'publication_reward', 'PR-20250801-0005', 8, 3, 1, '2025-08-01 10:42:00', NULL, NULL, NULL, NULL, '2025-08-01 10:42:00', '2025-08-01 10:42:00', NULL),
(11, 'publication_reward', 'PR-20250801-0006', 8, 3, 1, '2025-08-01 10:50:27', NULL, NULL, NULL, NULL, '2025-08-01 10:50:27', '2025-08-01 10:50:27', NULL),
(12, 'publication_reward', 'PR-20250801-0007', 8, 3, 1, '2025-08-01 11:09:50', NULL, NULL, NULL, NULL, '2025-08-01 11:09:50', '2025-08-01 11:09:50', NULL),
(13, 'publication_reward', 'PR-20250801-0008', 8, 3, 1, '2025-08-01 11:19:12', NULL, NULL, NULL, NULL, '2025-08-01 11:19:12', '2025-08-01 11:19:12', NULL),
(14, 'publication_reward', 'PR-20250801-0009', 8, 3, 1, '2025-08-01 11:22:17', NULL, NULL, NULL, NULL, '2025-08-01 11:22:17', '2025-08-01 11:22:17', NULL),
(15, 'publication_reward', 'PR-20250801-0010', 8, 3, 1, '2025-08-01 11:23:53', NULL, NULL, NULL, NULL, '2025-08-01 11:23:53', '2025-08-01 11:23:53', NULL),
(16, 'publication_reward', 'PR-20250801-0011', 8, 3, 1, '2025-08-01 11:34:30', NULL, NULL, NULL, NULL, '2025-08-01 11:34:30', '2025-08-01 11:34:30', NULL),
(17, 'publication_reward', 'PR-20250801-0012', 8, 3, 1, '2025-08-01 11:37:54', NULL, NULL, NULL, NULL, '2025-08-01 11:37:53', '2025-08-01 11:37:54', NULL),
(18, 'publication_reward', 'PR-20250801-0013', 8, 3, 1, '2025-08-01 11:40:47', NULL, NULL, NULL, NULL, '2025-08-01 11:40:47', '2025-08-01 11:40:47', NULL),
(19, 'publication_reward', 'PR-20250801-0014', 8, 3, 1, '2025-08-01 12:08:25', NULL, NULL, NULL, NULL, '2025-08-01 12:08:25', '2025-08-01 12:08:25', NULL),
(20, 'publication_reward', 'PR-20250801-0015', 8, 3, 1, '2025-08-01 12:11:19', NULL, NULL, NULL, NULL, '2025-08-01 12:11:19', '2025-08-01 12:11:19', NULL),
(21, 'publication_reward', 'PR-20250801-0016', 8, 3, 1, '2025-08-01 22:29:44', NULL, NULL, NULL, NULL, '2025-08-01 22:29:44', '2025-08-01 22:29:44', NULL),
(22, 'publication_reward', 'PR-20250802-0001', 8, 3, 1, '2025-08-02 12:18:25', NULL, NULL, NULL, NULL, '2025-08-02 12:18:25', '2025-08-02 12:18:25', NULL),
(23, 'publication_reward', 'PR-20250805-0001', 8, 3, 1, '2025-08-05 22:41:57', NULL, NULL, NULL, NULL, '2025-08-05 22:41:57', '2025-08-05 22:41:57', NULL),
(24, 'publication_reward', 'PR-20250805-0002', 8, 3, 1, '2025-08-05 22:46:59', NULL, NULL, NULL, NULL, '2025-08-05 22:46:58', '2025-08-05 22:46:59', NULL);

--
-- Triggers `submissions`
--
DELIMITER $$
CREATE TRIGGER `audit_submissions_delete` AFTER UPDATE ON `submissions` FOR EACH ROW BEGIN
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
        INSERT INTO audit_logs (
            user_id, action, entity_type, entity_id, entity_number,
            description, created_at
        ) VALUES (
            NEW.user_id,
            'delete',
            'submission',
            NEW.submission_id,
            NEW.submission_number,
            'Deleted submission',
            NOW()
        );
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `audit_submissions_insert` AFTER INSERT ON `submissions` FOR EACH ROW BEGIN
    DECLARE v_user_id INT;
    SET v_user_id = NEW.user_id;
    
    INSERT INTO audit_logs (
        user_id, action, entity_type, entity_id, entity_number,
        new_values, description, created_at
    ) VALUES (
        v_user_id, 
        'create', 
        'submission', 
        NEW.submission_id, 
        NEW.submission_number,
        JSON_OBJECT(
            'submission_type', NEW.submission_type,
            'status_id', NEW.status_id,
            'year_id', NEW.year_id
        ),
        CONCAT('Created new ', NEW.submission_type),
        NOW()
    );
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `audit_submissions_update` AFTER UPDATE ON `submissions` FOR EACH ROW BEGIN
   DECLARE v_user_id INT;
   DECLARE v_action VARCHAR(20);
   DECLARE v_changed_fields TEXT DEFAULT '';
   
   -- Determine user_id
   SET v_user_id = IFNULL(NEW.approved_by, NEW.user_id);
   
   -- Check what changed
   IF IFNULL(OLD.status_id, 0) != IFNULL(NEW.status_id, 0) THEN
       SET v_changed_fields = CONCAT(v_changed_fields, 'status,');
   END IF;
   
   -- Determine action type
   IF OLD.status_id != NEW.status_id AND NEW.status_id = 2 THEN
       SET v_action = 'approve';
   ELSEIF OLD.status_id != NEW.status_id AND NEW.status_id = 3 THEN
       SET v_action = 'reject';
   ELSEIF OLD.submitted_at IS NULL AND NEW.submitted_at IS NOT NULL THEN
       SET v_action = 'submit';
   ELSE
       SET v_action = 'update';
   END IF;
   
   -- Only log if something changed
   IF v_changed_fields != '' OR v_action != 'update' THEN
       INSERT INTO audit_logs (
           user_id, action, entity_type, entity_id, entity_number,
           changed_fields, description, created_at
       ) VALUES (
           v_user_id,
           v_action,
           'submission',
           NEW.submission_id,
           NEW.submission_number,
           TRIM(TRAILING ',' FROM v_changed_fields),
           CONCAT(v_action, ' submission'),
           NOW()
       );
   END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `submission_documents`
--

CREATE TABLE `submission_documents` (
  `document_id` int(11) NOT NULL,
  `submission_id` int(11) NOT NULL,
  `file_id` int(11) NOT NULL,
  `document_type_id` int(11) NOT NULL,
  `description` text DEFAULT NULL,
  `display_order` int(11) DEFAULT 0,
  `is_required` tinyint(1) DEFAULT 0,
  `is_verified` tinyint(1) DEFAULT 0,
  `verified_by` int(11) DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `submission_documents`
--

INSERT INTO `submission_documents` (`document_id`, `submission_id`, `file_id`, `document_type_id`, `description`, `display_order`, `is_required`, `is_verified`, `verified_by`, `verified_at`, `created_at`) VALUES
(1, 1, 1, 2, 'pdf-sample_1.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-07-31 12:58:57'),
(2, 1, 2, 3, 'pdf-sample_2.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-07-31 12:58:57'),
(3, 1, 3, 11, 'เอกสารอื่นๆ 1: pdf-sample_3.pdf', 3, 0, 0, NULL, NULL, '2025-07-31 12:58:57'),
(4, 1, 4, 12, 'เอกสารเบิกจ่ายภายนอก: ทุนที่ 1', 4, 0, 0, NULL, NULL, '2025-07-31 12:58:57'),
(5, 2, 5, 2, 'pdf-sample_2.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-07-31 13:28:34'),
(6, 2, 6, 3, 'pdf-sample_1.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-07-31 13:28:34'),
(7, 3, 7, 2, 'pdf-sample_2.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-07-31 13:38:11'),
(8, 3, 8, 3, 'pdf-sample_0.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-07-31 13:38:11'),
(9, 4, 9, 2, 'pdf-sample_1.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-07-31 13:42:38'),
(10, 4, 10, 3, 'pdf-sample_3.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-07-31 13:42:38'),
(11, 5, 11, 2, 'pdf-sample_3.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-07-31 13:44:25'),
(12, 6, 12, 2, 'pdf-sample_0.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-08-01 10:24:29'),
(13, 6, 13, 3, 'pdf-sample_1.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-08-01 10:24:29'),
(14, 7, 14, 2, 'pdf-sample_2.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-08-01 10:25:34'),
(15, 7, 15, 3, 'pdf-sample_2.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-08-01 10:25:34'),
(16, 8, 16, 2, 'pdf-sample_0.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-08-01 10:38:16'),
(17, 8, 17, 3, 'pdf-sample_1.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-08-01 10:38:16'),
(18, 9, 18, 2, 'pdf-sample_1.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-08-01 10:39:09'),
(19, 9, 19, 3, 'pdf-sample_0.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-08-01 10:39:09'),
(20, 10, 20, 3, 'pdf-sample_0.pdf (ประเภท 3)', 1, 0, 0, NULL, NULL, '2025-08-01 10:42:00'),
(21, 11, 21, 3, 'pdf-sample_2.pdf (ประเภท 3)', 1, 0, 0, NULL, NULL, '2025-08-01 10:50:27'),
(22, 12, 22, 2, 'pdf-sample_0.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-08-01 11:09:50'),
(23, 12, 23, 3, 'pdf-sample_1.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-08-01 11:09:50'),
(24, 13, 24, 2, 'pdf-sample_2.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-08-01 11:19:12'),
(25, 14, 25, 2, 'pdf-sample_0.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-08-01 11:22:17'),
(26, 15, 26, 2, 'pdf-sample_1.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-08-01 11:23:53'),
(27, 16, 27, 2, 'pdf-sample_0.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-08-01 11:34:30'),
(28, 17, 28, 2, 'pdf-sample_1.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-08-01 11:37:54'),
(29, 18, 29, 2, 'pdf-sample_1.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-08-01 11:40:47'),
(30, 19, 30, 2, 'pdf-sample_0.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-08-01 12:08:25'),
(31, 19, 31, 3, 'pdf-sample_1.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-08-01 12:08:25'),
(32, 20, 32, 2, 'pdf-sample_1.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-08-01 12:11:19'),
(33, 21, 33, 2, 'pdf-sample_0.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-08-01 22:29:44'),
(34, 21, 34, 3, 'pdf-sample_1.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-08-01 22:29:44'),
(35, 21, 35, 12, 'เอกสารเบิกจ่ายภายนอก: ทุนที่ 1', 3, 0, 0, NULL, NULL, '2025-08-01 22:29:44'),
(36, 22, 36, 2, 'pdf-sample_0.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-08-02 12:18:25'),
(37, 22, 37, 3, 'pdf-sample_1.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-08-02 12:18:25'),
(38, 22, 38, 11, 'เอกสารเบิกจ่ายภายนอก - pdf-sample_2.pdf', 3, 0, 0, NULL, NULL, '2025-08-02 12:18:25'),
(39, 22, 39, 12, 'เอกสารเบิกจ่ายภายนอก: ทุนที่ 1', 4, 0, 0, NULL, NULL, '2025-08-02 12:18:25'),
(40, 22, 40, 1, 'เอกสารรวม (Merged PDF)', 5, 0, 0, NULL, NULL, '2025-08-02 12:18:25'),
(41, 23, 41, 2, 'pdf-sample_0.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-08-05 22:41:57'),
(42, 23, 42, 3, 'pdf-sample_1.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-08-05 22:41:57'),
(43, 24, 43, 2, 'pdf-sample_1.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-08-05 22:46:59'),
(44, 24, 44, 3, 'pdf-sample_2.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-08-05 22:46:59'),
(45, 24, 45, 11, 'เอกสารเบิกจ่ายภายนอก - pdf-sample_0.pdf', 3, 0, 0, NULL, NULL, '2025-08-05 22:46:59'),
(46, 24, 46, 12, 'เอกสารเบิกจ่ายภายนอก: ทุนที่ 1', 4, 0, 0, NULL, NULL, '2025-08-05 22:46:59');

-- --------------------------------------------------------

--
-- Table structure for table `submission_reviews`
--

CREATE TABLE `submission_reviews` (
  `review_id` int(11) NOT NULL,
  `submission_id` int(11) NOT NULL,
  `reviewer_id` int(11) NOT NULL,
  `review_round` int(11) DEFAULT 1,
  `review_status` enum('approved','revision_required','rejected') NOT NULL,
  `comments` text DEFAULT NULL,
  `internal_notes` text DEFAULT NULL,
  `reviewed_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `submission_status_history`
--

CREATE TABLE `submission_status_history` (
  `history_id` int(11) NOT NULL,
  `submission_id` int(11) NOT NULL,
  `old_status_id` int(11) DEFAULT NULL,
  `new_status_id` int(11) NOT NULL,
  `changed_by` int(11) NOT NULL,
  `reason` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `submission_users`
--

CREATE TABLE `submission_users` (
  `id` int(11) NOT NULL,
  `submission_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `role` enum('owner','coauthor','team_member','advisor','coordinator','co_author') DEFAULT 'coauthor',
  `is_primary` tinyint(1) DEFAULT 0,
  `display_order` int(11) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `submission_users`
--

INSERT INTO `submission_users` (`id`, `submission_id`, `user_id`, `role`, `is_primary`, `display_order`, `created_at`) VALUES
(1, 5, 1, 'coauthor', 0, 2, '2025-07-31 13:44:25'),
(2, 5, 9, 'coauthor', 0, 3, '2025-07-31 13:44:25'),
(3, 13, 8, 'coauthor', 0, 1, '2025-08-01 11:19:12'),
(4, 13, 1, 'coauthor', 0, 2, '2025-08-01 11:19:12'),
(5, 13, 9, 'coauthor', 0, 3, '2025-08-01 11:19:12'),
(6, 14, 8, 'coauthor', 0, 1, '2025-08-01 11:22:17'),
(7, 14, 1, 'coauthor', 0, 2, '2025-08-01 11:22:17'),
(8, 14, 9, 'coauthor', 0, 3, '2025-08-01 11:22:17'),
(9, 15, 8, 'coauthor', 0, 1, '2025-08-01 11:23:53'),
(10, 15, 1, 'coauthor', 0, 2, '2025-08-01 11:23:53'),
(11, 15, 9, 'coauthor', 0, 3, '2025-08-01 11:23:53'),
(12, 16, 8, 'coauthor', 0, 1, '2025-08-01 11:34:30'),
(13, 16, 1, 'coauthor', 0, 2, '2025-08-01 11:34:30'),
(14, 16, 9, 'coauthor', 0, 3, '2025-08-01 11:34:30'),
(15, 17, 8, 'owner', 0, 1, '2025-08-01 11:37:53'),
(16, 17, 1, 'coauthor', 0, 2, '2025-08-01 11:37:53'),
(17, 17, 9, 'coauthor', 0, 3, '2025-08-01 11:37:53'),
(18, 18, 8, 'owner', 0, 1, '2025-08-01 11:40:47'),
(19, 18, 9, 'coauthor', 0, 2, '2025-08-01 11:40:47'),
(20, 18, 1, 'coauthor', 0, 3, '2025-08-01 11:40:47'),
(21, 19, 8, 'owner', 1, 1, '2025-08-01 12:08:25'),
(22, 19, 1, 'coauthor', 1, 2, '2025-08-01 12:08:25'),
(23, 19, 9, 'coauthor', 1, 3, '2025-08-01 12:08:25'),
(24, 20, 8, 'owner', 1, 1, '2025-08-01 12:11:19'),
(25, 20, 1, 'coauthor', 0, 2, '2025-08-01 12:11:19'),
(26, 20, 9, 'coauthor', 0, 3, '2025-08-01 12:11:19'),
(27, 21, 8, 'owner', 1, 1, '2025-08-01 22:29:44'),
(28, 21, 1, 'coauthor', 0, 2, '2025-08-01 22:29:44'),
(29, 21, 9, 'coauthor', 0, 3, '2025-08-01 22:29:44'),
(30, 22, 8, 'owner', 1, 1, '2025-08-02 12:18:25'),
(31, 23, 8, 'owner', 1, 1, '2025-08-05 22:41:57'),
(32, 23, 1, 'coauthor', 0, 2, '2025-08-05 22:41:57'),
(33, 23, 9, 'coauthor', 0, 3, '2025-08-05 22:41:57'),
(34, 24, 8, 'owner', 1, 1, '2025-08-05 22:46:59'),
(35, 24, 1, 'coauthor', 0, 2, '2025-08-05 22:46:59');

-- --------------------------------------------------------

--
-- Table structure for table `system_config`
--

CREATE TABLE `system_config` (
  `config_id` int(11) NOT NULL,
  `system_version` varchar(20) DEFAULT '1.0.0',
  `last_updated` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_by` int(11) DEFAULT NULL,
  `budget_2568` decimal(15,2) DEFAULT 2000000.00,
  `budget_2569` decimal(15,2) DEFAULT NULL,
  `budget_2570` decimal(15,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `user_fname` varchar(255) DEFAULT NULL,
  `user_lname` varchar(255) DEFAULT NULL,
  `gender` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `role_id` int(11) DEFAULT NULL,
  `position_id` int(11) DEFAULT NULL,
  `create_at` datetime DEFAULT current_timestamp(),
  `update_at` datetime DEFAULT NULL,
  `delete_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `user_fname`, `user_lname`, `gender`, `email`, `password`, `role_id`, `position_id`, `create_at`, `update_at`, `delete_at`) VALUES
(1, 'Somchai', 'Suwan', 'male', 'somchai@example.com', '$2a$10$LCtvqEswW1dTIOwJdTrvZuFmQF61aepTdC9HgI78UdnuyVJs3pxIm', 1, 1, '2025-06-24 16:49:13', '2025-07-02 22:02:51', NULL),
(2, 'Suda', 'Kong', 'female', 'suda@example.com', '$2a$10$.UeSuOiuMSwJRwZyxplaSOd7DsD/q/0S7zozjFWGP9F2Dm1ZCN8rK', 2, 3, '2025-06-24 16:49:13', '2025-07-02 22:02:51', NULL),
(7, 'ผู้ดูแล', 'ระบบ', 'male', 'admin@cpkku.ac.th', '$2a$10$f8kTbCx57o6gCNItJMUczeTmwPK1TUudS85U.wF6keW2cAVApjYN6', 3, 3, '2025-07-31 17:52:45', '2025-07-31 17:52:45', NULL),
(8, 'สมชาย', 'ใจดี', 'male', 'teacher@cpkku.ac.th', '$2a$10$sPaTxAZ.Bp4fxHGBg.awZ.a5jq72uWXeRAQHLK.3LTluhNoliaRYG', 1, 1, '2025-07-31 17:52:46', '2025-07-31 17:52:46', NULL),
(9, 'สมหญิง', 'รักการศึกษา', 'female', 'teacher2@cpkku.ac.th', '$2a$10$mgxuR9pZ5HfndfDoHd/ZquUQYAKztvxZBpT417iX05TLOC.axULf2', 1, 2, '2025-07-31 17:52:46', '2025-07-31 17:52:46', NULL),
(10, 'สุดา', 'ช่วยเหลือ', 'female', 'staff@cpkku.ac.th', '$2a$10$Df2y47XVO7Eugd/DLXJSAuIqXktScmsvhTSRzANBQzqSOCmuPSi1C', 2, 3, '2025-07-31 17:52:46', '2025-07-31 17:52:46', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `user_fund_eligibilities`
--

CREATE TABLE `user_fund_eligibilities` (
  `user_fund_eligibility_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `year_id` int(11) DEFAULT NULL,
  `category_id` int(11) DEFAULT NULL,
  `remaining_quota` decimal(15,2) DEFAULT NULL,
  `max_allowed_amount` decimal(15,2) DEFAULT NULL,
  `remaining_applications` int(11) DEFAULT NULL,
  `is_eligible` varchar(255) DEFAULT NULL,
  `restriction_reason` text DEFAULT NULL,
  `calculated_at` datetime DEFAULT NULL,
  `create_at` datetime DEFAULT NULL,
  `update_at` datetime DEFAULT NULL,
  `delete_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `user_fund_eligibilities`
--

INSERT INTO `user_fund_eligibilities` (`user_fund_eligibility_id`, `user_id`, `year_id`, `category_id`, `remaining_quota`, `max_allowed_amount`, `remaining_applications`, `is_eligible`, `restriction_reason`, `calculated_at`, `create_at`, `update_at`, `delete_at`) VALUES
(1, 1, 1, 1, '200000.00', '200000.00', 1, 'yes', NULL, '2025-06-24 17:52:30', '2025-06-24 17:52:30', '2025-06-24 17:52:30', NULL),
(2, 2, 2, 2, '80000.00', '80000.00', 1, 'yes', NULL, '2025-06-24 17:52:30', '2025-06-24 17:52:30', '2025-06-24 17:52:30', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `user_sessions`
--

CREATE TABLE `user_sessions` (
  `session_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `access_token_jti` varchar(255) DEFAULT NULL,
  `refresh_token` varchar(500) DEFAULT NULL,
  `device_name` varchar(255) DEFAULT NULL,
  `device_type` varchar(50) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `last_activity` datetime DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_sessions`
--

INSERT INTO `user_sessions` (`session_id`, `user_id`, `access_token_jti`, `refresh_token`, `device_name`, `device_type`, `ip_address`, `user_agent`, `last_activity`, `expires_at`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 8, '6cf24752-08eb-4497-9694-732a8acb9d96', '43B-KeFXrOD_lC0--z6IQxuwnUhboU20R3gBY9TYaUc=', 'Chrome Browser', 'web', '58.10.107.148', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', '2025-07-31 13:49:10', '2025-08-30 12:53:02', 1, '2025-07-31 12:53:02', '2025-07-31 13:49:10'),
(2, 8, '2199d26c-c883-4d53-9105-e96778e717f8', 'QhD-W6fwnfKAVhkbr7gLtuEZqF_9VuhVOA8kbcCIlwk=', 'Chrome Browser', 'web', '58.10.107.148', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', '2025-08-01 11:09:55', '2025-08-31 10:15:46', 1, '2025-08-01 10:15:46', '2025-08-01 11:09:55'),
(3, 8, '07d8477f-0c12-428b-9798-2afabb85e6e9', 'WVd4_TWI7MbRjRqqypZjKF-rm8MZYOcyzj0y0eOGHQU=', '', 'api_client', '58.11.71.81', 'PostmanRuntime/7.44.1', '2025-08-01 10:53:38', '2025-08-31 10:47:04', 1, '2025-08-01 10:47:04', '2025-08-01 10:53:38'),
(4, 8, 'a38c347e-60e8-4551-b5ce-3ec8c5de5e3d', '7rrvrM4re7D-aBNjprazG2mV4ERsG4HeCrY0JTmssws=', 'Chrome Browser', 'web', '58.10.107.148', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', '2025-08-01 12:38:50', '2025-08-31 11:18:50', 0, '2025-08-01 11:18:50', '2025-08-01 12:38:50'),
(5, 7, 'd76f7681-177e-4bd2-87e2-3a59b7384dfb', 'qWJwclseH-mQGLeitlCefczy8Krool17SxR9aLuxWMg=', 'Chrome Browser', 'web', '58.10.107.148', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', '2025-08-01 12:39:08', '2025-08-31 12:39:02', 1, '2025-08-01 12:39:02', '2025-08-01 12:39:08'),
(6, 8, '20d9f565-a45f-419b-b0e9-04afe15cf91e', 'VCy7bUlUN2oVJzftirdn5_6BZ5P_MEkpvHaRqbVsalo=', 'Chrome Browser', 'web', '58.10.107.148', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', '2025-08-01 23:28:10', '2025-08-31 22:20:17', 0, '2025-08-01 22:20:17', '2025-08-01 23:28:10'),
(7, 8, '32c223d3-098c-437f-82be-aabb41dd005d', 'YC99GxtX3hkbFXcI8byT5gsb0N0SdvRhbzVtWQre9TI=', 'Firefox Browser', 'web', '58.10.107.148', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0', '2025-08-01 23:28:35', '2025-08-31 23:28:32', 1, '2025-08-01 23:28:32', '2025-08-01 23:28:35'),
(8, 8, 'f92c5caa-3b62-4689-96bc-224a64d51678', 'a4r9RANIdKjeiBeVH_Z8Wpfuvb975SInLfOVpl0p178=', 'Chrome Browser', 'web', '58.10.107.148', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', '2025-08-01 23:34:08', '2025-08-31 23:28:46', 1, '2025-08-01 23:28:46', '2025-08-01 23:34:08'),
(9, 7, '5620991e-5ad9-43ae-a83e-a766c3cb64fe', 'ZaaMGnGs6zSWew6d6mrvgppHV5xlAQHwOCYK-cHLQKY=', 'Chrome Browser', 'web', '58.10.107.148', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', '2025-08-02 11:19:54', '2025-09-01 09:33:36', 0, '2025-08-02 09:33:36', '2025-08-02 11:19:54'),
(10, 8, 'f2f80462-c5e2-4240-8c0d-502954c84c81', 'iFPBvyz_os7_bwBZSW7BlcR2ziK6TejceOLt3nCtUyc=', 'Chrome Browser', 'web', '58.10.107.148', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', '2025-08-02 12:18:39', '2025-09-01 11:20:00', 0, '2025-08-02 11:20:00', '2025-08-02 12:18:39'),
(11, 8, '7d54ac1c-e509-4961-8224-b4a362a42f2c', 'LI-uQrJmZm72wg_pEySnuwjLH4UtqRjmq19vgreIbnA=', 'Chrome Browser', 'web', '58.11.71.81', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', '2025-08-02 11:48:31', '2025-09-01 11:38:55', 0, '2025-08-02 11:38:55', '2025-08-02 11:48:31'),
(12, 7, 'd66d2ff0-8227-4e83-9a4d-a8f68c325fcc', 'gSy68A17rp2f5UAwHCQCf_EShV3Ey42DP4IPAJkaxRE=', 'Chrome Browser', 'web', '58.11.71.81', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', '2025-08-02 12:44:07', '2025-09-01 11:49:07', 1, '2025-08-02 11:49:07', '2025-08-02 12:44:07'),
(13, 8, 'aea43d43-8566-440c-b792-b31d7e57881e', 'x5JgcPQU6nexukJoOL1ptMl4fP3YfZWZoZMVvdpjkTQ=', 'Chrome Browser', 'web', '58.10.107.148', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', '2025-08-02 12:19:29', '2025-09-01 12:18:51', 0, '2025-08-02 12:18:51', '2025-08-02 12:19:29'),
(14, 7, '5d2eeadd-e4a9-43de-99c3-1e477553f494', '8KWDhDFGFpovsh4eF6V8jB_FDvlCzUhTfmq2nNs0Hkg=', 'Chrome Browser', 'web', '58.10.107.148', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', '2025-08-02 12:55:22', '2025-09-01 12:19:34', 0, '2025-08-02 12:19:34', '2025-08-02 12:55:22'),
(15, 8, 'd9f974a4-9fb5-4d33-9543-a460607517f8', '0dYkJ1jWUDUw5biyKEbT8Ov7H_wrYKrfIzYBlwZ-YlY=', 'Chrome Browser', 'web', '58.10.107.148', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', '2025-08-02 12:55:35', '2025-09-01 12:55:30', 1, '2025-08-02 12:55:30', '2025-08-02 12:55:35'),
(16, 8, '530005e7-0b72-4c33-8715-d4e916c07fb6', 'BK8Ti6v5sXAfb9X3h16af16bv7-9mngUDHEVu08Z6Cw=', 'Chrome Browser', 'web', '58.10.107.148', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', '2025-08-02 20:32:49', '2025-09-01 20:13:21', 1, '2025-08-02 20:13:21', '2025-08-02 20:32:49'),
(17, 8, '1358ac14-9895-4064-b1cc-96d29836b801', '5W6do2fLNXTtsfiDa2n2Gy93fJK--VKw0j4guLVE6c4=', 'Chrome Browser', 'web', '124.122.123.241', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', '2025-08-04 21:10:38', '2025-09-03 13:06:25', 1, '2025-08-04 13:06:25', '2025-08-04 21:10:38'),
(18, 8, '7844df3f-e67c-4f86-81f1-396fb5d4e46e', 'EABql958klcSJO0gVVFqJBaqymknHtld3hOW-SFSY4E=', 'Chrome Browser', 'web', '124.122.123.241', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', '2025-08-05 01:28:04', '2025-09-04 01:04:32', 1, '2025-08-05 01:04:32', '2025-08-05 01:28:04'),
(19, 8, 'cfd6960b-ffca-41b2-9778-dbafcc3e5ae6', 'lyqgKhvv2sCDJZ-WP6FmIoMREDYllYnjZguXjGU_NLw=', 'Chrome Browser', 'web', '58.11.85.73', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', '2025-08-05 22:46:59', '2025-09-04 11:43:31', 1, '2025-08-05 11:43:31', '2025-08-05 22:46:59'),
(20, 8, '35b471e0-3892-4446-9580-1f89fd7396ad', 'mqWtgKjFHhlQO77MikMrljHlIZbUqnRnGY5AQHKTazE=', 'Chrome Browser', 'web', '58.11.71.81', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', '2025-08-05 12:47:41', '2025-09-04 12:01:21', 1, '2025-08-05 12:01:21', '2025-08-05 12:47:41'),
(21, 8, '92904a9f-aa67-4327-8d09-950d8338dcce', 'fmnJrIYgYGGLftYtEwIgi-rJaFgEjn7W-JViZZvY-hE=', 'Chrome Browser', 'web', '58.11.71.81', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', '2025-08-05 13:10:28', '2025-09-04 13:10:04', 1, '2025-08-05 13:10:04', '2025-08-05 13:10:28'),
(22, 8, 'cf2856f9-b3cd-4961-bc7d-0c16be3780ef', 'UuvjFwMCJUuPx3GDXZlL9lasHOU8BnqCbmxSHWitA1U=', 'Chrome Browser', 'web', '58.11.71.81', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', '2025-08-05 22:50:58', '2025-09-04 22:50:52', 1, '2025-08-05 22:50:52', '2025-08-05 22:50:58'),
(23, 8, '9c452368-1a61-4e8e-b7d9-d68140c5dfda', 'h2_uVFJ_W2GG4726q0cNkZEjMU4BsASAKMP3Ido5G7w=', 'Chrome Browser', 'web', '58.11.71.81', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', '2025-08-06 12:04:59', '2025-09-05 11:40:43', 1, '2025-08-06 11:40:43', '2025-08-06 12:04:59');

-- --------------------------------------------------------

--
-- Table structure for table `user_tokens`
--

CREATE TABLE `user_tokens` (
  `token_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `token_type` varchar(50) DEFAULT 'refresh',
  `token` varchar(500) NOT NULL,
  `expires_at` datetime NOT NULL,
  `is_revoked` tinyint(1) DEFAULT 0,
  `device_info` varchar(255) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_tokens`
--

INSERT INTO `user_tokens` (`token_id`, `user_id`, `token_type`, `token`, `expires_at`, `is_revoked`, `device_info`, `ip_address`, `created_at`, `updated_at`) VALUES
(1, 8, 'refresh', '43B-KeFXrOD_lC0--z6IQxuwnUhboU20R3gBY9TYaUc=', '2025-08-30 12:53:02', 0, 'Chrome Browser / web', '58.10.107.148', '2025-07-31 12:53:02', '2025-07-31 12:53:02'),
(2, 8, 'refresh', 'QhD-W6fwnfKAVhkbr7gLtuEZqF_9VuhVOA8kbcCIlwk=', '2025-08-31 10:15:46', 0, 'Chrome Browser / web', '58.10.107.148', '2025-08-01 10:15:46', '2025-08-01 10:15:46'),
(3, 8, 'refresh', 'WVd4_TWI7MbRjRqqypZjKF-rm8MZYOcyzj0y0eOGHQU=', '2025-08-31 10:47:04', 0, ' / api_client', '58.11.71.81', '2025-08-01 10:47:04', '2025-08-01 10:47:04'),
(4, 8, 'refresh', '7rrvrM4re7D-aBNjprazG2mV4ERsG4HeCrY0JTmssws=', '2025-08-31 11:18:50', 1, 'Chrome Browser / web', '58.10.107.148', '2025-08-01 11:18:50', '2025-08-01 12:38:50'),
(5, 7, 'refresh', 'qWJwclseH-mQGLeitlCefczy8Krool17SxR9aLuxWMg=', '2025-08-31 12:39:02', 0, 'Chrome Browser / web', '58.10.107.148', '2025-08-01 12:39:02', '2025-08-01 12:39:02'),
(6, 8, 'refresh', 'VCy7bUlUN2oVJzftirdn5_6BZ5P_MEkpvHaRqbVsalo=', '2025-08-31 22:20:17', 1, 'Chrome Browser / web', '58.10.107.148', '2025-08-01 22:20:17', '2025-08-01 23:28:10'),
(7, 8, 'refresh', 'YC99GxtX3hkbFXcI8byT5gsb0N0SdvRhbzVtWQre9TI=', '2025-08-31 23:28:32', 0, 'Firefox Browser / web', '58.10.107.148', '2025-08-01 23:28:32', '2025-08-01 23:28:32'),
(8, 8, 'refresh', 'a4r9RANIdKjeiBeVH_Z8Wpfuvb975SInLfOVpl0p178=', '2025-08-31 23:28:46', 0, 'Chrome Browser / web', '58.10.107.148', '2025-08-01 23:28:46', '2025-08-01 23:28:46'),
(9, 7, 'refresh', 'ZaaMGnGs6zSWew6d6mrvgppHV5xlAQHwOCYK-cHLQKY=', '2025-09-01 09:33:36', 1, 'Chrome Browser / web', '58.10.107.148', '2025-08-02 09:33:36', '2025-08-02 11:19:54'),
(10, 8, 'refresh', 'iFPBvyz_os7_bwBZSW7BlcR2ziK6TejceOLt3nCtUyc=', '2025-09-01 11:20:00', 1, 'Chrome Browser / web', '58.10.107.148', '2025-08-02 11:20:00', '2025-08-02 12:18:39'),
(11, 8, 'refresh', 'LI-uQrJmZm72wg_pEySnuwjLH4UtqRjmq19vgreIbnA=', '2025-09-01 11:38:55', 1, 'Chrome Browser / web', '58.11.71.81', '2025-08-02 11:38:55', '2025-08-02 11:48:31'),
(12, 7, 'refresh', 'gSy68A17rp2f5UAwHCQCf_EShV3Ey42DP4IPAJkaxRE=', '2025-09-01 11:49:07', 0, 'Chrome Browser / web', '58.11.71.81', '2025-08-02 11:49:07', '2025-08-02 11:49:07'),
(13, 8, 'refresh', 'x5JgcPQU6nexukJoOL1ptMl4fP3YfZWZoZMVvdpjkTQ=', '2025-09-01 12:18:51', 1, 'Chrome Browser / web', '58.10.107.148', '2025-08-02 12:18:51', '2025-08-02 12:19:29'),
(14, 7, 'refresh', '8KWDhDFGFpovsh4eF6V8jB_FDvlCzUhTfmq2nNs0Hkg=', '2025-09-01 12:19:34', 1, 'Chrome Browser / web', '58.10.107.148', '2025-08-02 12:19:34', '2025-08-02 12:55:22'),
(15, 8, 'refresh', '0dYkJ1jWUDUw5biyKEbT8Ov7H_wrYKrfIzYBlwZ-YlY=', '2025-09-01 12:55:30', 0, 'Chrome Browser / web', '58.10.107.148', '2025-08-02 12:55:30', '2025-08-02 12:55:30'),
(16, 8, 'refresh', 'BK8Ti6v5sXAfb9X3h16af16bv7-9mngUDHEVu08Z6Cw=', '2025-09-01 20:13:21', 0, 'Chrome Browser / web', '58.10.107.148', '2025-08-02 20:13:21', '2025-08-02 20:13:21'),
(17, 8, 'refresh', '5W6do2fLNXTtsfiDa2n2Gy93fJK--VKw0j4guLVE6c4=', '2025-09-03 13:06:25', 0, 'Chrome Browser / web', '124.122.123.241', '2025-08-04 13:06:25', '2025-08-04 13:06:25'),
(18, 8, 'refresh', 'EABql958klcSJO0gVVFqJBaqymknHtld3hOW-SFSY4E=', '2025-09-04 01:04:32', 0, 'Chrome Browser / web', '124.122.123.241', '2025-08-05 01:04:32', '2025-08-05 01:04:32'),
(19, 8, 'refresh', 'lyqgKhvv2sCDJZ-WP6FmIoMREDYllYnjZguXjGU_NLw=', '2025-09-04 11:43:31', 0, 'Chrome Browser / web', '58.11.85.73', '2025-08-05 11:43:31', '2025-08-05 11:43:31'),
(20, 8, 'refresh', 'mqWtgKjFHhlQO77MikMrljHlIZbUqnRnGY5AQHKTazE=', '2025-09-04 12:01:21', 0, 'Chrome Browser / web', '58.11.71.81', '2025-08-05 12:01:21', '2025-08-05 12:01:21'),
(21, 8, 'refresh', 'fmnJrIYgYGGLftYtEwIgi-rJaFgEjn7W-JViZZvY-hE=', '2025-09-04 13:10:04', 0, 'Chrome Browser / web', '58.11.71.81', '2025-08-05 13:10:04', '2025-08-05 13:10:04'),
(22, 8, 'refresh', 'UuvjFwMCJUuPx3GDXZlL9lasHOU8BnqCbmxSHWitA1U=', '2025-09-04 22:50:52', 0, 'Chrome Browser / web', '58.11.71.81', '2025-08-05 22:50:52', '2025-08-05 22:50:52'),
(23, 8, 'refresh', 'h2_uVFJ_W2GG4726q0cNkZEjMU4BsASAKMP3Ido5G7w=', '2025-09-05 11:40:43', 0, 'Chrome Browser / web', '58.11.71.81', '2025-08-06 11:40:43', '2025-08-06 11:40:43');

-- --------------------------------------------------------

--
-- Stand-in structure for view `view_budget_summary`
-- (See below for the actual view)
--
CREATE TABLE `view_budget_summary` (
`year` varchar(255)
,`category_name` varchar(255)
,`subcategory_name` varchar(255)
,`allocated_amount` decimal(15,2)
,`used_amount` decimal(15,2)
,`remaining_budget` decimal(15,2)
,`max_grants` int(11)
,`remaining_grant` int(11)
,`total_applications` bigint(21)
,`approved_applications` bigint(21)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `view_fund_applications_summary`
-- (See below for the actual view)
--
CREATE TABLE `view_fund_applications_summary` (
`application_id` int(11)
,`application_number` varchar(255)
,`project_title` varchar(255)
,`applicant_name` varchar(511)
,`email` varchar(255)
,`position_name` varchar(255)
,`category_name` varchar(255)
,`subcategory_name` varchar(255)
,`year` varchar(255)
,`status_name` varchar(255)
,`requested_amount` decimal(15,2)
,`approved_amount` decimal(15,2)
,`submitted_at` datetime
,`approved_at` datetime
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_active_reward_config`
-- (See below for the actual view)
--
CREATE TABLE `v_active_reward_config` (
`config_id` int(11)
,`year` varchar(4)
,`journal_quartile` enum('Q1','Q2','Q3','Q4','T5','T10','TCI','N/A')
,`max_amount` decimal(15,2)
,`condition_description` text
,`create_at` datetime
,`update_at` datetime
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_file_uploads_readable`
-- (See below for the actual view)
--
CREATE TABLE `v_file_uploads_readable` (
`file_id` int(11)
,`original_name` varchar(255)
,`stored_path` varchar(500)
,`folder_type` enum('temp','submission','profile','other')
,`submission_id` int(11)
,`file_size` bigint(20)
,`mime_type` varchar(100)
,`file_hash` varchar(64)
,`is_public` tinyint(1)
,`uploaded_by` int(11)
,`uploaded_at` datetime
,`create_at` datetime
,`update_at` datetime
,`delete_at` datetime
,`user_fname` varchar(255)
,`user_lname` varchar(255)
,`uploader_name` varchar(511)
,`user_folder` varchar(500)
,`folder_type_name` varchar(16)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_file_usage_stats`
-- (See below for the actual view)
--
CREATE TABLE `v_file_usage_stats` (
`user_id` int(11)
,`user_name` varchar(511)
,`email` varchar(255)
,`total_files` bigint(21)
,`total_size` decimal(41,0)
,`avg_file_size` decimal(23,4)
,`temp_files` bigint(21)
,`submission_files` bigint(21)
,`profile_files` bigint(21)
,`last_upload` datetime
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_fund_applications`
-- (See below for the actual view)
--
CREATE TABLE `v_fund_applications` (
`application_id` int(11)
,`application_number` varchar(255)
,`user_id` int(11)
,`year_id` int(11)
,`subcategory_id` int(11)
,`application_status_id` int(11)
,`approved_by` int(11)
,`project_title` varchar(255)
,`project_description` text
,`requested_amount` decimal(15,2)
,`approved_amount` decimal(15,2)
,`submitted_at` datetime
,`approved_at` datetime
,`closed_at` datetime
,`comment` text
,`create_at` datetime
,`update_at` datetime
,`delete_at` datetime
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_publication_rewards`
-- (See below for the actual view)
--
CREATE TABLE `v_publication_rewards` (
`reward_id` int(11)
,`reward_number` varchar(255)
,`user_id` int(11)
,`paper_title` varchar(500)
,`journal_name` varchar(255)
,`publication_date` date
,`journal_quartile` enum('Q1','Q2','Q3','Q4','T5','T10','TCI','N/A')
,`doi` varchar(255)
,`reward_amount` decimal(15,2)
,`status_id` int(11)
,`submitted_at` datetime
,`created_at` datetime
,`updated_at` datetime
,`deleted_at` datetime
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_recent_audit_logs`
-- (See below for the actual view)
--
CREATE TABLE `v_recent_audit_logs` (
`log_id` int(11)
,`created_at` datetime
,`user_name` varchar(511)
,`action` enum('create','update','delete','login','logout','view','download','approve','reject','submit','review')
,`entity_type` varchar(50)
,`entity_number` varchar(50)
,`description` text
,`ip_address` varchar(45)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_submission_audit_trail`
-- (See below for the actual view)
--
CREATE TABLE `v_submission_audit_trail` (
`submission_number` varchar(255)
,`submission_type` enum('fund_application','publication_reward','conference_grant','training_request')
,`created_at` datetime
,`action_by` varchar(511)
,`action` enum('create','update','delete','login','logout','view','download','approve','reject','submit','review')
,`changed_fields` text
,`description` text
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_user_activity_summary`
-- (See below for the actual view)
--
CREATE TABLE `v_user_activity_summary` (
`user_id` int(11)
,`user_name` varchar(511)
,`login_count` bigint(21)
,`create_count` bigint(21)
,`update_count` bigint(21)
,`download_count` bigint(21)
,`last_login` datetime /* mariadb-5.3 */
,`total_actions` bigint(21)
);

-- --------------------------------------------------------

--
-- Table structure for table `years`
--

CREATE TABLE `years` (
  `year_id` int(11) NOT NULL,
  `year` varchar(255) DEFAULT NULL,
  `budget` decimal(15,2) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `create_at` datetime DEFAULT current_timestamp(),
  `update_at` datetime DEFAULT current_timestamp(),
  `delete_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `years`
--

INSERT INTO `years` (`year_id`, `year`, `budget`, `status`, `create_at`, `update_at`, `delete_at`) VALUES
(1, '2566', '1000000.00', 'active', '2025-06-24 16:49:13', '2025-07-23 10:18:36', NULL),
(2, '2567', '1500000.00', 'active', '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL),
(3, '2568', '2000000.00', 'active', '2025-07-08 10:44:10', '2025-07-08 10:44:10', NULL);

-- --------------------------------------------------------

--
-- Structure for view `view_budget_summary`
--
DROP TABLE IF EXISTS `view_budget_summary`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_budget_summary`  AS  select `y`.`year` AS `year`,`fc`.`category_name` AS `category_name`,`fs`.`subcategory_name` AS `subcategory_name`,`sb`.`allocated_amount` AS `allocated_amount`,`sb`.`used_amount` AS `used_amount`,`sb`.`remaining_budget` AS `remaining_budget`,`sb`.`max_grants` AS `max_grants`,`sb`.`remaining_grant` AS `remaining_grant`,count(`fa`.`application_id`) AS `total_applications`,count(case when `fa`.`application_status_id` = 2 then 1 end) AS `approved_applications` from ((((`subcategory_budgets` `sb` left join `fund_subcategories` `fs` on(`sb`.`subcategory_id` = `fs`.`subcategory_id`)) left join `fund_categories` `fc` on(`fs`.`category_id` = `fc`.`category_id`)) left join `years` `y` on(`fc`.`year_id` = `y`.`year_id`)) left join `v_fund_applications` `fa` on(`fs`.`subcategory_id` = `fa`.`subcategory_id` and `fa`.`delete_at` is null)) where `sb`.`delete_at` is null group by `sb`.`subcategory_budget_id`,`y`.`year`,`fc`.`category_name`,`fs`.`subcategory_name`,`sb`.`allocated_amount`,`sb`.`used_amount`,`sb`.`remaining_budget`,`sb`.`max_grants`,`sb`.`remaining_grant` ;

-- --------------------------------------------------------

--
-- Structure for view `view_fund_applications_summary`
--
DROP TABLE IF EXISTS `view_fund_applications_summary`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_fund_applications_summary`  AS  select `fa`.`application_id` AS `application_id`,`fa`.`application_number` AS `application_number`,`fa`.`project_title` AS `project_title`,concat(`u`.`user_fname`,' ',`u`.`user_lname`) AS `applicant_name`,`u`.`email` AS `email`,`p`.`position_name` AS `position_name`,`fc`.`category_name` AS `category_name`,`fs`.`subcategory_name` AS `subcategory_name`,`y`.`year` AS `year`,`ast`.`status_name` AS `status_name`,`fa`.`requested_amount` AS `requested_amount`,`fa`.`approved_amount` AS `approved_amount`,`fa`.`submitted_at` AS `submitted_at`,`fa`.`approved_at` AS `approved_at` from ((((((`v_fund_applications` `fa` left join `users` `u` on(`fa`.`user_id` = `u`.`user_id`)) left join `positions` `p` on(`u`.`position_id` = `p`.`position_id`)) left join `fund_subcategories` `fs` on(`fa`.`subcategory_id` = `fs`.`subcategory_id`)) left join `fund_categories` `fc` on(`fs`.`category_id` = `fc`.`category_id`)) left join `years` `y` on(`fa`.`year_id` = `y`.`year_id`)) left join `application_status` `ast` on(`fa`.`application_status_id` = `ast`.`application_status_id`)) where `fa`.`delete_at` is null ;

-- --------------------------------------------------------

--
-- Structure for view `v_active_reward_config`
--
DROP TABLE IF EXISTS `v_active_reward_config`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_active_reward_config`  AS  select `reward_config`.`config_id` AS `config_id`,`reward_config`.`year` AS `year`,`reward_config`.`journal_quartile` AS `journal_quartile`,`reward_config`.`max_amount` AS `max_amount`,`reward_config`.`condition_description` AS `condition_description`,`reward_config`.`create_at` AS `create_at`,`reward_config`.`update_at` AS `update_at` from `reward_config` where `reward_config`.`is_active` = 1 and `reward_config`.`delete_at` is null order by `reward_config`.`year` desc,`reward_config`.`journal_quartile` ;

-- --------------------------------------------------------

--
-- Structure for view `v_file_uploads_readable`
--
DROP TABLE IF EXISTS `v_file_uploads_readable`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_file_uploads_readable`  AS  select `f`.`file_id` AS `file_id`,`f`.`original_name` AS `original_name`,`f`.`stored_path` AS `stored_path`,`f`.`folder_type` AS `folder_type`,`f`.`submission_id` AS `submission_id`,`f`.`file_size` AS `file_size`,`f`.`mime_type` AS `mime_type`,`f`.`file_hash` AS `file_hash`,`f`.`is_public` AS `is_public`,`f`.`uploaded_by` AS `uploaded_by`,`f`.`uploaded_at` AS `uploaded_at`,`f`.`create_at` AS `create_at`,`f`.`update_at` AS `update_at`,`f`.`delete_at` AS `delete_at`,`u`.`user_fname` AS `user_fname`,`u`.`user_lname` AS `user_lname`,concat(`u`.`user_fname`,' ',`u`.`user_lname`) AS `uploader_name`,case when `f`.`stored_path` like '%/users/%' then substring_index(substring_index(`f`.`stored_path`,'/users/',-1),'/',1) else 'unknown' end AS `user_folder`,case `f`.`folder_type` when 'temp' then 'Temporary Files' when 'submission' then 'Submission Files' when 'profile' then 'Profile Files' else 'Other Files' end AS `folder_type_name` from (`file_uploads` `f` left join `users` `u` on(`f`.`uploaded_by` = `u`.`user_id`)) where `f`.`delete_at` is null ;

-- --------------------------------------------------------

--
-- Structure for view `v_file_usage_stats`
--
DROP TABLE IF EXISTS `v_file_usage_stats`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_file_usage_stats`  AS  select `u`.`user_id` AS `user_id`,concat(`u`.`user_fname`,' ',`u`.`user_lname`) AS `user_name`,`u`.`email` AS `email`,count(`f`.`file_id`) AS `total_files`,sum(`f`.`file_size`) AS `total_size`,avg(`f`.`file_size`) AS `avg_file_size`,count(case when `f`.`folder_type` = 'temp' then 1 end) AS `temp_files`,count(case when `f`.`folder_type` = 'submission' then 1 end) AS `submission_files`,count(case when `f`.`folder_type` = 'profile' then 1 end) AS `profile_files`,max(`f`.`uploaded_at`) AS `last_upload` from (`users` `u` left join `file_uploads` `f` on(`u`.`user_id` = `f`.`uploaded_by` and `f`.`delete_at` is null)) where `u`.`delete_at` is null group by `u`.`user_id`,`u`.`user_fname`,`u`.`user_lname`,`u`.`email` order by count(`f`.`file_id`) desc ;

-- --------------------------------------------------------

--
-- Structure for view `v_fund_applications`
--
DROP TABLE IF EXISTS `v_fund_applications`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_fund_applications`  AS  select `s`.`submission_id` AS `application_id`,`s`.`submission_number` AS `application_number`,`s`.`user_id` AS `user_id`,`s`.`year_id` AS `year_id`,`fad`.`subcategory_id` AS `subcategory_id`,`s`.`status_id` AS `application_status_id`,`s`.`approved_by` AS `approved_by`,`fad`.`project_title` AS `project_title`,`fad`.`project_description` AS `project_description`,`fad`.`requested_amount` AS `requested_amount`,`fad`.`approved_amount` AS `approved_amount`,`s`.`submitted_at` AS `submitted_at`,`s`.`approved_at` AS `approved_at`,`fad`.`closed_at` AS `closed_at`,`fad`.`comment` AS `comment`,`s`.`created_at` AS `create_at`,`s`.`updated_at` AS `update_at`,`s`.`deleted_at` AS `delete_at` from (`submissions` `s` join `fund_application_details` `fad` on(`s`.`submission_id` = `fad`.`submission_id`)) where `s`.`submission_type` = 'fund_application' ;

-- --------------------------------------------------------

--
-- Structure for view `v_publication_rewards`
--
DROP TABLE IF EXISTS `v_publication_rewards`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_publication_rewards`  AS  select `s`.`submission_id` AS `reward_id`,`s`.`submission_number` AS `reward_number`,`s`.`user_id` AS `user_id`,`prd`.`paper_title` AS `paper_title`,`prd`.`journal_name` AS `journal_name`,`prd`.`publication_date` AS `publication_date`,`prd`.`quartile` AS `journal_quartile`,`prd`.`doi` AS `doi`,`prd`.`reward_amount` AS `reward_amount`,`s`.`status_id` AS `status_id`,`s`.`submitted_at` AS `submitted_at`,`s`.`created_at` AS `created_at`,`s`.`updated_at` AS `updated_at`,`s`.`deleted_at` AS `deleted_at` from (`submissions` `s` join `publication_reward_details` `prd` on(`s`.`submission_id` = `prd`.`submission_id`)) where `s`.`submission_type` = 'publication_reward' ;

-- --------------------------------------------------------

--
-- Structure for view `v_recent_audit_logs`
--
DROP TABLE IF EXISTS `v_recent_audit_logs`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_recent_audit_logs`  AS  select `al`.`log_id` AS `log_id`,`al`.`created_at` AS `created_at`,concat(`u`.`user_fname`,' ',`u`.`user_lname`) AS `user_name`,`al`.`action` AS `action`,`al`.`entity_type` AS `entity_type`,`al`.`entity_number` AS `entity_number`,`al`.`description` AS `description`,`al`.`ip_address` AS `ip_address` from (`audit_logs` `al` left join `users` `u` on(`al`.`user_id` = `u`.`user_id`)) order by `al`.`created_at` desc limit 100 ;

-- --------------------------------------------------------

--
-- Structure for view `v_submission_audit_trail`
--
DROP TABLE IF EXISTS `v_submission_audit_trail`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_submission_audit_trail`  AS  select `s`.`submission_number` AS `submission_number`,`s`.`submission_type` AS `submission_type`,`al`.`created_at` AS `created_at`,concat(`u`.`user_fname`,' ',`u`.`user_lname`) AS `action_by`,`al`.`action` AS `action`,`al`.`changed_fields` AS `changed_fields`,`al`.`description` AS `description` from ((`submissions` `s` join `audit_logs` `al` on(`al`.`entity_type` = 'submission' and `al`.`entity_id` = `s`.`submission_id`)) left join `users` `u` on(`al`.`user_id` = `u`.`user_id`)) order by `s`.`submission_id`,`al`.`created_at` ;

-- --------------------------------------------------------

--
-- Structure for view `v_user_activity_summary`
--
DROP TABLE IF EXISTS `v_user_activity_summary`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_user_activity_summary`  AS  select `u`.`user_id` AS `user_id`,concat(`u`.`user_fname`,' ',`u`.`user_lname`) AS `user_name`,count(case when `al`.`action` = 'login' then 1 end) AS `login_count`,count(case when `al`.`action` = 'create' then 1 end) AS `create_count`,count(case when `al`.`action` = 'update' then 1 end) AS `update_count`,count(case when `al`.`action` = 'download' then 1 end) AS `download_count`,max(case when `al`.`action` = 'login' then `al`.`created_at` end) AS `last_login`,count(0) AS `total_actions` from (`users` `u` left join `audit_logs` `al` on(`u`.`user_id` = `al`.`user_id`)) group by `u`.`user_id` ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `application_status`
--
ALTER TABLE `application_status`
  ADD PRIMARY KEY (`application_status_id`);

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`log_id`),
  ADD KEY `idx_user` (`user_id`),
  ADD KEY `idx_entity` (`entity_type`,`entity_id`),
  ADD KEY `idx_action` (`action`),
  ADD KEY `idx_created` (`created_at`),
  ADD KEY `idx_entity_number` (`entity_number`);

--
-- Indexes for table `document_types`
--
ALTER TABLE `document_types`
  ADD PRIMARY KEY (`document_type_id`);

--
-- Indexes for table `file_uploads`
--
ALTER TABLE `file_uploads`
  ADD PRIMARY KEY (`file_id`),
  ADD KEY `idx_uploaded_by` (`uploaded_by`),
  ADD KEY `idx_uploaded_at` (`uploaded_at`),
  ADD KEY `idx_mime_type` (`mime_type`),
  ADD KEY `idx_file_hash` (`file_hash`),
  ADD KEY `idx_file_uploads_hash` (`file_hash`),
  ADD KEY `idx_file_uploads_user_path` (`uploaded_by`,`stored_path`),
  ADD KEY `idx_file_uploads_original_name` (`original_name`),
  ADD KEY `idx_file_uploads_active` (`delete_at`,`uploaded_by`),
  ADD KEY `idx_file_uploads_uploaded_date` (`uploaded_at`,`uploaded_by`);

--
-- Indexes for table `fund_application_details`
--
ALTER TABLE `fund_application_details`
  ADD PRIMARY KEY (`detail_id`),
  ADD UNIQUE KEY `submission_id` (`submission_id`),
  ADD UNIQUE KEY `idx_submission` (`submission_id`),
  ADD KEY `idx_subcategory` (`subcategory_id`);

--
-- Indexes for table `fund_categories`
--
ALTER TABLE `fund_categories`
  ADD PRIMARY KEY (`category_id`),
  ADD KEY `year_id` (`year_id`);

--
-- Indexes for table `fund_subcategories`
--
ALTER TABLE `fund_subcategories`
  ADD PRIMARY KEY (`subcategory_id`),
  ADD KEY `category_id` (`category_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`notification_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_is_read` (`is_read`),
  ADD KEY `idx_create_at` (`create_at`),
  ADD KEY `idx_type` (`type`),
  ADD KEY `idx_user_unread` (`user_id`,`is_read`),
  ADD KEY `fk_notif_submission` (`related_submission_id`);

--
-- Indexes for table `positions`
--
ALTER TABLE `positions`
  ADD PRIMARY KEY (`position_id`);

--
-- Indexes for table `publication_reward_details`
--
ALTER TABLE `publication_reward_details`
  ADD PRIMARY KEY (`detail_id`),
  ADD UNIQUE KEY `submission_id` (`submission_id`),
  ADD UNIQUE KEY `idx_submission` (`submission_id`),
  ADD KEY `idx_publication_date` (`publication_date`),
  ADD KEY `idx_quartile` (`quartile`);

--
-- Indexes for table `publication_reward_rates`
--
ALTER TABLE `publication_reward_rates`
  ADD PRIMARY KEY (`rate_id`),
  ADD UNIQUE KEY `year_status_quartile` (`year`,`author_status`,`journal_quartile`);

--
-- Indexes for table `reward_config`
--
ALTER TABLE `reward_config`
  ADD PRIMARY KEY (`config_id`),
  ADD UNIQUE KEY `unique_config` (`year`,`journal_quartile`,`delete_at`),
  ADD KEY `idx_active` (`is_active`,`delete_at`),
  ADD KEY `idx_reward_config_year_type` (`year`,`is_active`),
  ADD KEY `idx_year_quartile` (`year`,`journal_quartile`),
  ADD KEY `idx_reward_config_lookup` (`year`,`journal_quartile`,`is_active`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`role_id`);

--
-- Indexes for table `subcategory_budgets`
--
ALTER TABLE `subcategory_budgets`
  ADD PRIMARY KEY (`subcategory_budget_id`),
  ADD KEY `subcategories_budgets_ibfk_1` (`subcategory_id`);

--
-- Indexes for table `submissions`
--
ALTER TABLE `submissions`
  ADD PRIMARY KEY (`submission_id`),
  ADD UNIQUE KEY `submission_number` (`submission_number`),
  ADD UNIQUE KEY `idx_submission_number` (`submission_number`),
  ADD KEY `idx_type` (`submission_type`),
  ADD KEY `idx_user` (`user_id`),
  ADD KEY `idx_year` (`year_id`),
  ADD KEY `idx_status` (`status_id`),
  ADD KEY `idx_dates` (`submitted_at`,`approved_at`),
  ADD KEY `fk_submission_approver` (`approved_by`),
  ADD KEY `idx_submission_type_status` (`submission_type`,`status_id`),
  ADD KEY `idx_submission_user_year` (`user_id`,`year_id`);

--
-- Indexes for table `submission_documents`
--
ALTER TABLE `submission_documents`
  ADD PRIMARY KEY (`document_id`),
  ADD KEY `idx_submission` (`submission_id`),
  ADD KEY `idx_file` (`file_id`),
  ADD KEY `idx_type` (`document_type_id`),
  ADD KEY `fk_doc_verifier` (`verified_by`),
  ADD KEY `idx_submission_documents_submission` (`submission_id`,`document_type_id`),
  ADD KEY `idx_submission_documents_file` (`file_id`);

--
-- Indexes for table `submission_reviews`
--
ALTER TABLE `submission_reviews`
  ADD PRIMARY KEY (`review_id`),
  ADD KEY `idx_submission` (`submission_id`),
  ADD KEY `idx_reviewer` (`reviewer_id`),
  ADD KEY `idx_status` (`review_status`),
  ADD KEY `idx_round` (`review_round`);

--
-- Indexes for table `submission_status_history`
--
ALTER TABLE `submission_status_history`
  ADD PRIMARY KEY (`history_id`),
  ADD KEY `idx_submission` (`submission_id`),
  ADD KEY `idx_changed_by` (`changed_by`),
  ADD KEY `idx_created` (`created_at`),
  ADD KEY `fk_history_old_status` (`old_status_id`),
  ADD KEY `fk_history_new_status` (`new_status_id`);

--
-- Indexes for table `submission_users`
--
ALTER TABLE `submission_users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_submission_user` (`submission_id`,`user_id`),
  ADD KEY `idx_submission` (`submission_id`),
  ADD KEY `idx_user` (`user_id`),
  ADD KEY `idx_role` (`role`),
  ADD KEY `idx_submission_users_search` (`user_id`,`role`);

--
-- Indexes for table `system_config`
--
ALTER TABLE `system_config`
  ADD PRIMARY KEY (`config_id`),
  ADD KEY `updated_by` (`updated_by`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD KEY `role_id` (`role_id`),
  ADD KEY `position_id` (`position_id`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_fullname` (`user_fname`,`user_lname`);

--
-- Indexes for table `user_fund_eligibilities`
--
ALTER TABLE `user_fund_eligibilities`
  ADD PRIMARY KEY (`user_fund_eligibility_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `year_id` (`year_id`),
  ADD KEY `category_id` (`category_id`);

--
-- Indexes for table `user_sessions`
--
ALTER TABLE `user_sessions`
  ADD PRIMARY KEY (`session_id`),
  ADD UNIQUE KEY `access_token_jti` (`access_token_jti`),
  ADD KEY `idx_user_active` (`user_id`,`is_active`),
  ADD KEY `idx_expires` (`expires_at`),
  ADD KEY `idx_refresh_token` (`refresh_token`),
  ADD KEY `idx_cleanup` (`is_active`,`expires_at`);

--
-- Indexes for table `user_tokens`
--
ALTER TABLE `user_tokens`
  ADD PRIMARY KEY (`token_id`),
  ADD KEY `idx_token` (`token`),
  ADD KEY `idx_user_expires` (`user_id`,`expires_at`);

--
-- Indexes for table `years`
--
ALTER TABLE `years`
  ADD PRIMARY KEY (`year_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `application_status`
--
ALTER TABLE `application_status`
  MODIFY `application_status_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `log_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=49;

--
-- AUTO_INCREMENT for table `document_types`
--
ALTER TABLE `document_types`
  MODIFY `document_type_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `file_uploads`
--
ALTER TABLE `file_uploads`
  MODIFY `file_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=47;

--
-- AUTO_INCREMENT for table `fund_application_details`
--
ALTER TABLE `fund_application_details`
  MODIFY `detail_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `fund_categories`
--
ALTER TABLE `fund_categories`
  MODIFY `category_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `fund_subcategories`
--
ALTER TABLE `fund_subcategories`
  MODIFY `subcategory_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `notification_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `positions`
--
ALTER TABLE `positions`
  MODIFY `position_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `publication_reward_details`
--
ALTER TABLE `publication_reward_details`
  MODIFY `detail_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT for table `publication_reward_rates`
--
ALTER TABLE `publication_reward_rates`
  MODIFY `rate_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `reward_config`
--
ALTER TABLE `reward_config`
  MODIFY `config_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `role_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `subcategory_budgets`
--
ALTER TABLE `subcategory_budgets`
  MODIFY `subcategory_budget_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT for table `submissions`
--
ALTER TABLE `submissions`
  MODIFY `submission_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT for table `submission_documents`
--
ALTER TABLE `submission_documents`
  MODIFY `document_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=47;

--
-- AUTO_INCREMENT for table `submission_reviews`
--
ALTER TABLE `submission_reviews`
  MODIFY `review_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `submission_status_history`
--
ALTER TABLE `submission_status_history`
  MODIFY `history_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `submission_users`
--
ALTER TABLE `submission_users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=36;

--
-- AUTO_INCREMENT for table `system_config`
--
ALTER TABLE `system_config`
  MODIFY `config_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `user_fund_eligibilities`
--
ALTER TABLE `user_fund_eligibilities`
  MODIFY `user_fund_eligibility_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `user_sessions`
--
ALTER TABLE `user_sessions`
  MODIFY `session_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `user_tokens`
--
ALTER TABLE `user_tokens`
  MODIFY `token_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `years`
--
ALTER TABLE `years`
  MODIFY `year_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `fk_audit_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `file_uploads`
--
ALTER TABLE `file_uploads`
  ADD CONSTRAINT `fk_file_uploads_user` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `fund_application_details`
--
ALTER TABLE `fund_application_details`
  ADD CONSTRAINT `fk_fund_detail_subcategory` FOREIGN KEY (`subcategory_id`) REFERENCES `fund_subcategories` (`subcategory_id`),
  ADD CONSTRAINT `fk_fund_detail_submission` FOREIGN KEY (`submission_id`) REFERENCES `submissions` (`submission_id`);

--
-- Constraints for table `fund_categories`
--
ALTER TABLE `fund_categories`
  ADD CONSTRAINT `fund_categories_ibfk_1` FOREIGN KEY (`year_id`) REFERENCES `years` (`year_id`);

--
-- Constraints for table `fund_subcategories`
--
ALTER TABLE `fund_subcategories`
  ADD CONSTRAINT `fund_subcategories_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `fund_categories` (`category_id`);

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `fk_notif_submission` FOREIGN KEY (`related_submission_id`) REFERENCES `submissions` (`submission_id`),
  ADD CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `publication_reward_details`
--
ALTER TABLE `publication_reward_details`
  ADD CONSTRAINT `fk_pub_detail_submission` FOREIGN KEY (`submission_id`) REFERENCES `submissions` (`submission_id`);

--
-- Constraints for table `subcategory_budgets`
--
ALTER TABLE `subcategory_budgets`
  ADD CONSTRAINT `subcategories_budgets_ibfk_1` FOREIGN KEY (`subcategory_id`) REFERENCES `fund_subcategories` (`subcategory_id`);

--
-- Constraints for table `submissions`
--
ALTER TABLE `submissions`
  ADD CONSTRAINT `fk_submission_approver` FOREIGN KEY (`approved_by`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `fk_submission_status` FOREIGN KEY (`status_id`) REFERENCES `application_status` (`application_status_id`),
  ADD CONSTRAINT `fk_submission_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `fk_submission_year` FOREIGN KEY (`year_id`) REFERENCES `years` (`year_id`);

--
-- Constraints for table `submission_documents`
--
ALTER TABLE `submission_documents`
  ADD CONSTRAINT `fk_doc_file` FOREIGN KEY (`file_id`) REFERENCES `file_uploads` (`file_id`),
  ADD CONSTRAINT `fk_doc_submission` FOREIGN KEY (`submission_id`) REFERENCES `submissions` (`submission_id`),
  ADD CONSTRAINT `fk_doc_type` FOREIGN KEY (`document_type_id`) REFERENCES `document_types` (`document_type_id`),
  ADD CONSTRAINT `fk_doc_verifier` FOREIGN KEY (`verified_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `submission_reviews`
--
ALTER TABLE `submission_reviews`
  ADD CONSTRAINT `fk_review_reviewer` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `fk_review_submission` FOREIGN KEY (`submission_id`) REFERENCES `submissions` (`submission_id`);

--
-- Constraints for table `submission_status_history`
--
ALTER TABLE `submission_status_history`
  ADD CONSTRAINT `fk_history_new_status` FOREIGN KEY (`new_status_id`) REFERENCES `application_status` (`application_status_id`),
  ADD CONSTRAINT `fk_history_old_status` FOREIGN KEY (`old_status_id`) REFERENCES `application_status` (`application_status_id`),
  ADD CONSTRAINT `fk_history_submission` FOREIGN KEY (`submission_id`) REFERENCES `submissions` (`submission_id`),
  ADD CONSTRAINT `fk_history_user` FOREIGN KEY (`changed_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `submission_users`
--
ALTER TABLE `submission_users`
  ADD CONSTRAINT `fk_submission_user_submission` FOREIGN KEY (`submission_id`) REFERENCES `submissions` (`submission_id`),
  ADD CONSTRAINT `fk_submission_user_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `system_config`
--
ALTER TABLE `system_config`
  ADD CONSTRAINT `system_config_ibfk_1` FOREIGN KEY (`updated_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`),
  ADD CONSTRAINT `users_ibfk_2` FOREIGN KEY (`position_id`) REFERENCES `positions` (`position_id`);

--
-- Constraints for table `user_fund_eligibilities`
--
ALTER TABLE `user_fund_eligibilities`
  ADD CONSTRAINT `user_fund_eligibilities_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `user_fund_eligibilities_ibfk_2` FOREIGN KEY (`year_id`) REFERENCES `years` (`year_id`),
  ADD CONSTRAINT `user_fund_eligibilities_ibfk_3` FOREIGN KEY (`category_id`) REFERENCES `fund_categories` (`category_id`);

--
-- Constraints for table `user_sessions`
--
ALTER TABLE `user_sessions`
  ADD CONSTRAINT `user_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `user_tokens`
--
ALTER TABLE `user_tokens`
  ADD CONSTRAINT `user_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
