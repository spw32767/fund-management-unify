-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 15, 2025 at 11:55 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
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
CREATE DEFINER=`root`@`localhost` PROCEDURE `CreateNotification` (IN `p_user_id` INT, IN `p_title` VARCHAR(255), IN `p_message` TEXT, IN `p_type` VARCHAR(50), IN `p_submission_id` INT)   BEGIN
    INSERT INTO `fund_cpkku`.`notifications` (
        `user_id`,
        `title`,
        `message`,
        `type`,
        `related_submission_id`, -- ใช้ชื่อนี้ (เดิม procedure ใส่ผิดเป็น related_application_id)
        `is_read`,
        `create_at`
    ) VALUES (
        p_user_id,
        p_title,
        p_message,
        p_type,
        p_submission_id,
        0,
        NOW()
    );
END$$

CREATE DEFINER=`devuser`@`localhost` PROCEDURE `migrate_fund_applications` ()   BEGIN
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
-- Table structure for table `announcements`
--

CREATE TABLE `announcements` (
  `announcement_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL COMMENT 'หัวข้อประกาศ',
  `description` text DEFAULT NULL COMMENT 'รายละเอียดประกาศ',
  `file_name` varchar(255) NOT NULL COMMENT 'ชื่อไฟล์ต้นฉบับ',
  `file_path` varchar(500) NOT NULL COMMENT 'path ไฟล์ในระบบ',
  `file_size` bigint(20) DEFAULT NULL COMMENT 'ขนาดไฟล์ (bytes)',
  `mime_type` varchar(100) DEFAULT NULL COMMENT 'ประเภทไฟล์',
  `announcement_type` enum('general','research_fund','promotion_fund','publication_reward','fund_application') DEFAULT 'general' COMMENT 'ประเภทประกาศ',
  `announcement_reference_number` varchar(50) DEFAULT NULL,
  `priority` enum('normal','high','urgent') DEFAULT 'normal' COMMENT 'ความสำคัญ',
  `display_order` int(11) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active' COMMENT 'สถานะการเผยแพร่',
  `published_at` datetime DEFAULT NULL COMMENT 'วันที่เผยแพร่',
  `expired_at` datetime DEFAULT NULL COMMENT 'วันที่หมดอายุ',
  `year_id` int(11) DEFAULT NULL COMMENT 'ปีของประกาศ',
  `created_by` int(11) NOT NULL COMMENT 'ผู้สร้าง (user_id)',
  `create_at` datetime DEFAULT current_timestamp(),
  `update_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `delete_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางเก็บประกาศจากกองทุนวิจัยและนวัตกรรม';

--
-- Dumping data for table `announcements`
--

INSERT INTO `announcements` (`announcement_id`, `title`, `description`, `file_name`, `file_path`, `file_size`, `mime_type`, `announcement_type`, `announcement_reference_number`, `priority`, `display_order`, `status`, `published_at`, `expired_at`, `year_id`, `created_by`, `create_at`, `update_at`, `delete_at`) VALUES
(15, '1. 1574-68 หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย นวัตกรรม และบริการวิชาการ วิทยาลัยการคอมพิวเตอร์ (2568)', NULL, '1._1574-68_หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย_นวัตกรรม_และบริการวิชาการ_วิทยาลัยการคอมพิวเตอร์_(2568).pdf', 'uploads\\announcements\\1._1574-68_หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย_นวัตกรรม_และบริการวิชาการ_วิทยาลัยการคอมพิวเตอร์_(2568).pdf', 455138, 'application/pdf', 'research_fund', NULL, 'normal', NULL, 'active', '2025-10-10 04:20:00', NULL, 3, 15, '2025-10-10 04:20:25', '2025-10-10 04:20:25', NULL),
(16, '2. ประกาศขอใช้เงินกองทุนวิจัยฯ 2568 (ทุนส่งเสริมวิจัย) (เวียนรับรอง 3 กค 2568)', NULL, '2._ประกาศขอใช้เงินกองทุนวิจัยฯ_2568_(ทุนส่งเสริมวิจัย)_(เวียนรับรอง_3_กค_2568).docx', 'uploads\\announcements\\2._ประกาศขอใช้เงินกองทุนวิจัยฯ_2568_(ทุนส่งเสริมวิจัย)_(เวียนรับรอง_3_กค_2568).docx', 218699, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'research_fund', NULL, 'normal', NULL, 'active', '2025-10-10 04:20:00', NULL, 3, 15, '2025-10-10 04:20:41', '2025-10-10 04:20:41', NULL),
(17, '3. ประกาศขอใช้เงินกองทุนวิจัยฯ 2568 (ทุนอุดหนุนกิจกรรม) (เวียนรับรอง 3 กค 2568)', NULL, '3._ประกาศขอใช้เงินกองทุนวิจัยฯ_2568_(ทุนอุดหนุนกิจกรรม)_(เวียนรับรอง_3_กค_2568).docx', 'uploads\\announcements\\3._ประกาศขอใช้เงินกองทุนวิจัยฯ_2568_(ทุนอุดหนุนกิจกรรม)_(เวียนรับรอง_3_กค_2568).docx', 227082, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'general', NULL, 'normal', NULL, 'active', '2025-10-10 04:20:00', NULL, 3, 15, '2025-10-10 04:20:56', '2025-10-10 04:20:56', NULL),
(18, 'test', NULL, '1._1574-68_หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย_นวัตกรรม_และบริการวิชาการ_วิทยาลัยการคอมพิวเตอร์_(2568).pdf', 'uploads\\announcements\\1._1574-68_หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย_นวัตกรรม_และบริการวิชาการ_วิทยาลัยการคอมพิวเตอร์_(2568).pdf', 455138, 'application/pdf', 'general', NULL, 'normal', NULL, 'active', NULL, NULL, 3, 15, '2025-10-11 11:58:09', '2025-10-11 11:58:09', '2025-10-11 11:58:38'),
(19, 'test2', NULL, '1._1574-68_หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย_นวัตกรรม_และบริการวิชาการ_วิทยาลัยการคอมพิวเตอร์_(2568).pdf', 'uploads\\announcements\\1._1574-68_หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย_นวัตกรรม_และบริการวิชาการ_วิทยาลัยการคอมพิวเตอร์_(2568).pdf', 455138, 'application/pdf', 'general', NULL, 'normal', NULL, 'active', NULL, NULL, NULL, 15, '2025-10-11 11:58:47', '2025-10-11 11:58:47', '2025-10-11 12:00:06');

-- --------------------------------------------------------

--
-- Table structure for table `announcement_assignments`
--

CREATE TABLE `announcement_assignments` (
  `assignment_id` int(11) NOT NULL,
  `slot_code` enum('main','reward','activity_support','conference','service') NOT NULL COMMENT 'ช่องประกาศที่ FE กำหนด',
  `announcement_id` int(11) DEFAULT NULL COMMENT 'อาจเป็น NULL เพื่อระบุช่วงที่ไม่มีประกาศ',
  `start_date` datetime NOT NULL,
  `end_date` datetime DEFAULT NULL,
  `changed_by` int(11) DEFAULT NULL,
  `changed_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `application_status`
--

CREATE TABLE `application_status` (
  `application_status_id` int(11) NOT NULL,
  `status_code` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `status_name` varchar(255) DEFAULT NULL,
  `create_at` datetime DEFAULT current_timestamp(),
  `update_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `delete_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `application_status`
--

INSERT INTO `application_status` (`application_status_id`, `status_code`, `status_name`, `create_at`, `update_at`, `delete_at`) VALUES
(1, '0', 'อยู่ระหว่างการพิจารณา', '2025-06-24 16:49:13', '2025-09-25 17:28:18', NULL),
(2, '1', 'อนุมัติ', '2025-06-24 16:49:13', '2025-09-25 17:28:20', NULL),
(3, '2', 'ปฏิเสธ', '2025-06-24 16:49:13', '2025-09-25 17:28:21', NULL),
(4, '3', 'ต้องการข้อมูลเพิ่มเติม', '2025-08-12 15:50:00', '2025-09-25 17:28:23', NULL),
(5, '4', 'ร่าง', '2025-08-12 15:50:22', '2025-09-25 17:28:24', NULL),
(6, '5', 'อยู่ระหว่างการพิจารณาจากหัวหน้าสาขา', '2025-08-12 15:50:22', '2025-09-25 17:28:26', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `log_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `action` enum('create','update','delete','login','logout','view','download','approve','reject','submit','review','request_revision') NOT NULL,
  `entity_type` varchar(50) NOT NULL,
  `entity_id` int(11) DEFAULT NULL,
  `entity_number` varchar(50) DEFAULT NULL,
  `old_values` longtext DEFAULT NULL CHECK (json_valid(`old_values`)),
  `new_values` longtext DEFAULT NULL CHECK (json_valid(`new_values`)),
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
(284, 8, 'create', 'submission', 116, 'PR-25680925-0001', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-09-25 17:03:36'),
(285, 8, 'submit', 'submission', 116, 'PR-25680925-0001', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-25 17:03:36'),
(286, 8, 'create', 'submission', 117, 'PR-25680925-0002', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 5, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-09-25 17:27:15'),
(287, 8, 'submit', 'submission', 117, 'PR-25680925-0002', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-25 17:27:15'),
(288, 8, 'create', 'submission', 118, 'PR-25680925-0003', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 5, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-09-25 17:29:17'),
(289, 8, 'submit', 'submission', 118, 'PR-25680925-0003', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-25 17:29:17'),
(290, 8, 'create', 'submission', 119, 'PR-25680925-0004', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 5, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-09-25 17:31:05'),
(291, 8, 'submit', 'submission', 119, 'PR-25680925-0004', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-25 17:31:06'),
(292, 8, 'create', 'submission', 120, 'PR-25680925-0005', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-09-25 17:35:31'),
(293, 8, 'submit', 'submission', 120, 'PR-25680925-0005', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-25 17:35:32'),
(294, 8, 'update', 'submission', 117, 'PR-25680925-0002', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-09-25 17:41:15'),
(295, 8, 'update', 'submission', 118, 'PR-25680925-0003', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-09-25 17:41:17'),
(296, 8, 'update', 'submission', 119, 'PR-25680925-0004', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-09-25 17:41:19'),
(297, 8, 'update', 'submission', 120, 'PR-25680925-0005', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-09-26 07:27:04'),
(298, 13, 'review', 'submission', 120, 'PR-25680925-0005', NULL, NULL, NULL, '58.10.71.71', NULL, 'Department head recommended submission', '2025-09-26 07:27:04'),
(299, 8, 'update', 'submission', 120, 'PR-25680925-0005', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-09-26 07:27:39'),
(300, 8, 'update', 'submission', 119, 'PR-25680925-0004', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-09-26 07:27:41'),
(301, 8, 'update', 'submission', 118, 'PR-25680925-0003', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-09-26 07:27:44'),
(302, 8, 'reject', 'submission', 120, 'PR-25680925-0005', NULL, NULL, 'status', NULL, NULL, 'reject submission', '2025-09-26 07:28:05'),
(303, 13, 'reject', 'submission', 120, 'PR-25680925-0005', NULL, NULL, NULL, '58.10.71.71', NULL, 'asad', '2025-09-26 07:28:05'),
(304, 12, 'create', 'submission', 121, 'FA-25680926-0001', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-09-26 08:42:51'),
(305, 12, 'submit', 'submission', 121, 'FA-25680926-0001', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-26 08:42:51'),
(306, 12, 'update', 'submission', 121, 'FA-25680926-0001', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-09-26 11:21:33'),
(307, 8, 'update', 'submission', 118, 'PR-25680925-0003', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-09-26 11:37:26'),
(308, 13, 'review', 'submission', 118, 'PR-25680925-0003', NULL, NULL, NULL, '58.10.71.71', NULL, 'Department head recommended submission', '2025-09-26 11:37:26'),
(309, 8, 'update', 'submission', 118, 'PR-25680925-0003', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-09-26 11:37:56'),
(310, 8, 'update', 'submission', 118, 'PR-25680925-0003', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-09-26 12:26:25'),
(311, 13, 'review', 'submission', 118, 'PR-25680925-0003', NULL, NULL, NULL, '58.10.71.71', NULL, 'Department head recommended submission', '2025-09-26 12:26:25'),
(312, 8, 'update', 'submission', 118, 'PR-25680925-0003', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-09-26 12:44:06'),
(313, 8, 'update', 'submission', 118, 'PR-25680925-0003', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-09-26 12:44:10'),
(314, 13, 'review', 'submission', 118, 'PR-25680925-0003', NULL, NULL, NULL, '58.10.71.71', NULL, 'Department head recommended submission', '2025-09-26 12:44:10'),
(315, 8, 'reject', 'submission', 119, 'PR-25680925-0004', NULL, NULL, 'status', NULL, NULL, 'reject submission', '2025-09-26 15:58:43'),
(316, 13, 'reject', 'submission', 119, 'PR-25680925-0004', NULL, NULL, NULL, '58.10.71.71', NULL, 'asdasd', '2025-09-26 15:58:43'),
(317, 8, 'update', 'submission', 118, 'PR-25680925-0003', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-09-26 15:58:55'),
(318, 8, 'update', 'submission', 119, 'PR-25680925-0004', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-09-26 15:58:58'),
(319, 8, 'update', 'submission', 120, 'PR-25680925-0005', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-09-26 15:58:59'),
(320, 12, 'update', 'submission', 121, 'FA-25680926-0001', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-09-26 16:14:18'),
(321, 12, 'update', 'submission', 121, 'FA-25680926-0001', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-09-26 16:14:41'),
(322, 12, 'update', 'submission', 121, 'FA-25680926-0001', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-09-26 16:15:44'),
(323, 12, 'update', 'submission', 121, 'FA-25680926-0001', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-09-26 16:20:30'),
(324, 8, 'create', 'submission', 122, 'PR-25680926-0006', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-09-26 23:33:11'),
(325, 8, 'submit', 'submission', 122, 'PR-25680926-0006', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-26 23:33:11'),
(326, 7, 'approve', 'submission', 117, 'PR-25680925-0002', NULL, NULL, 'status', NULL, NULL, 'approve submission', '2025-09-29 12:06:57'),
(327, 8, 'create', 'submission', 123, 'PR-25680930-0007', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-09-30 13:41:38'),
(328, 8, 'submit', 'submission', 123, 'PR-25680930-0007', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-30 13:41:38'),
(329, 8, 'create', 'submission', 124, 'PR-25681001-0008', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-01 13:16:58'),
(330, 8, 'submit', 'submission', 124, 'PR-25681001-0008', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-01 13:16:58'),
(331, 8, 'create', 'submission', 125, 'PR-25681001-0009', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-01 20:52:43'),
(332, 8, 'submit', 'submission', 125, 'PR-25681001-0009', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-01 20:52:43'),
(333, 8, 'create', 'submission', 126, 'PR-25681002-0010', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-02 00:33:52'),
(334, 8, 'submit', 'submission', 126, 'PR-25681002-0010', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-02 00:33:52'),
(335, 8, 'create', 'submission', 127, 'PR-25681002-0011', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-02 12:12:36'),
(336, 8, 'submit', 'submission', 127, 'PR-25681002-0011', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-02 12:12:36'),
(337, 8, 'create', 'submission', 128, 'PR-25681002-0012', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-02 12:21:39'),
(338, 8, 'submit', 'submission', 128, 'PR-25681002-0012', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-02 12:21:39'),
(339, 8, 'create', 'submission', 129, 'PR-25681002-0013', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-02 12:40:26'),
(340, 8, 'submit', 'submission', 129, 'PR-25681002-0013', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-02 12:40:26'),
(341, 8, 'create', 'submission', 130, 'FA-25681002-0002', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-02 14:11:19'),
(342, 8, 'submit', 'submission', 130, 'FA-25681002-0002', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-02 14:11:19'),
(343, 8, 'create', 'submission', 131, 'FA-25681002-0003', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-02 14:40:48'),
(344, 8, 'submit', 'submission', 131, 'FA-25681002-0003', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-02 14:40:48'),
(345, 8, 'create', 'submission', 132, 'FA-25681002-0004', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-02 14:55:31'),
(346, 8, 'submit', 'submission', 132, 'FA-25681002-0004', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-02 14:55:31'),
(347, 8, 'create', 'submission', 133, 'FA-25681002-0005', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-02 15:11:00'),
(348, 8, 'submit', 'submission', 133, 'FA-25681002-0005', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-02 15:11:00'),
(349, 8, 'create', 'submission', 134, 'FA-25681002-0006', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-02 15:26:43'),
(350, 8, 'submit', 'submission', 134, 'FA-25681002-0006', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-02 15:26:43'),
(351, 8, 'create', 'submission', 135, 'FA-25681002-0007', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-02 15:42:15'),
(352, 8, 'submit', 'submission', 135, 'FA-25681002-0007', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-02 15:42:15'),
(353, 8, 'reject', 'submission', 134, 'FA-25681002-0006', NULL, NULL, 'status', NULL, NULL, 'reject submission', '2025-10-03 13:39:13'),
(354, 7, 'reject', 'submission', 134, 'FA-25681002-0006', NULL, NULL, NULL, '110.168.236.56', NULL, 'ไม่อนุมัติ', '2025-10-03 13:39:13'),
(355, 13, 'create', 'submission', 136, 'PR-25681003-0014', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-03 15:49:50'),
(356, 13, 'submit', 'submission', 136, 'PR-25681003-0014', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-03 15:49:50'),
(357, 14, 'create', 'submission', 137, 'PR-25681003-0015', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-03 07:00:58'),
(358, 14, 'submit', 'submission', 137, 'PR-25681003-0015', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-03 07:00:59'),
(359, 1010, 'create', 'submission', 138, 'RP-2568-0001', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-04 08:38:23'),
(360, 14, 'create', 'submission', 139, 'PR-25681004-0001', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-04 09:05:01'),
(361, 14, 'submit', 'submission', 139, 'PR-25681004-0001', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-04 09:05:41'),
(362, 1025, 'create', 'submission', 10002, 'RP-2568-0002', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-04 09:06:36'),
(363, 1004, 'create', 'submission', 10003, 'RP-2568-0003', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-04 09:06:36'),
(364, 1004, 'create', 'submission', 10004, 'RP-2568-0004', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-04 09:06:36'),
(365, 1025, 'create', 'submission', 10005, 'RP-2568-0005', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-04 09:06:36'),
(366, 1012, 'create', 'submission', 10006, 'RP-2568-0006', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-04 09:06:36'),
(367, 1012, 'create', 'submission', 10007, 'RP-2568-0007', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-04 09:06:36'),
(368, 1032, 'create', 'submission', 10008, 'RP-2568-0008', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-04 09:06:36'),
(369, 1032, 'create', 'submission', 10009, 'RP-2568-0009', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-04 09:06:36'),
(370, 1032, 'create', 'submission', 10010, 'RP-2568-0010', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-04 09:06:36'),
(371, 1032, 'create', 'submission', 10011, 'RP-2568-0011', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-04 09:06:36'),
(372, 1032, 'create', 'submission', 10012, 'RP-2568-0012', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-04 09:06:36'),
(373, 1021, 'create', 'submission', 10013, 'RP-2568-0013', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-04 09:06:36'),
(374, 1021, 'create', 'submission', 10014, 'RP-2568-0014', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-04 09:06:36'),
(375, 1002, 'create', 'submission', 10015, 'RP-2568-0015', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-04 09:06:36'),
(376, 1002, 'create', 'submission', 10016, 'RP-2568-0016', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-04 09:06:36'),
(377, 1028, 'create', 'submission', 10017, 'RP-2568-0017', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-04 09:06:36'),
(378, 1028, 'create', 'submission', 10018, 'RP-2568-0018', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-04 09:06:36'),
(379, 1028, 'create', 'submission', 10019, 'RP-2568-0019', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-04 09:06:36'),
(380, 1028, 'create', 'submission', 10020, 'RP-2568-0020', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-04 09:06:36'),
(381, 1018, 'create', 'submission', 10021, 'RP-2568-0021', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-04 09:06:36'),
(382, 1018, 'create', 'submission', 10022, 'RP-2568-0022', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-04 09:06:36'),
(383, 1018, 'create', 'submission', 10023, 'RP-2568-0023', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-04 09:06:36'),
(384, 1018, 'create', 'submission', 10024, 'RP-2568-0024', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-04 09:06:36'),
(385, 1018, 'create', 'submission', 10025, 'RP-2568-0025', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-04 09:06:36'),
(386, 1027, 'create', 'submission', 10026, 'RP-2568-0026', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-04 09:06:36'),
(387, 1027, 'create', 'submission', 10027, 'RP-2568-0027', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-04 09:06:36'),
(388, 1018, 'create', 'submission', 10028, 'RP-2568-0028', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-04 09:06:36'),
(389, 14, 'create', 'submission', 10029, 'PR-2568-0002', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-05 02:18:18'),
(390, 14, 'submit', 'submission', 10029, 'PR-2568-0002', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-05 02:20:19'),
(391, 14, 'create', 'submission', 10030, 'PR-2568-0003', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-08 02:30:34'),
(392, 14, 'submit', 'submission', 10030, 'PR-2568-0003', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-08 02:30:34'),
(393, 1027, 'create', 'submission', 10031, 'PR-2568-0004', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-08 03:16:52'),
(394, 1027, 'submit', 'submission', 10031, 'PR-2568-0004', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-08 03:17:13'),
(395, 14, 'create', 'submission', 10032, 'FA-2568-0029', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-10 12:41:22'),
(396, 14, 'create', 'submission', 10033, 'FA-2568-0030', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-10 12:41:22'),
(397, 14, 'create', 'submission', 10034, 'FA-2568-0031', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-10 12:41:22'),
(398, 14, 'create', 'submission', 10035, 'FA-2568-0032', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-10 12:41:22'),
(399, 14, 'create', 'submission', 10036, 'FA-2568-0033', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-10 12:41:22'),
(400, 14, 'create', 'submission', 10037, 'FA-2568-0034', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-10 12:41:22'),
(401, 14, 'create', 'submission', 10038, 'FA-2568-0035', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-10 12:41:22'),
(402, 14, 'create', 'submission', 10039, 'FA-2568-0036', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-10 12:41:22'),
(403, 14, 'create', 'submission', 10040, 'FA-2568-0037', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-10 12:41:22'),
(404, 14, 'create', 'submission', 10041, 'FA-2568-0038', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-10 12:41:22'),
(405, 14, 'create', 'submission', 10042, 'FA-2568-0039', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-10 12:41:22'),
(406, 14, 'create', 'submission', 10043, 'FA-2568-0040', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-10 12:41:22'),
(407, 14, 'create', 'submission', 10044, 'FA-2568-0041', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-10 12:41:22'),
(408, 14, 'create', 'submission', 10045, 'FA-2568-0042', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-10 12:41:22'),
(409, 14, 'create', 'submission', 10046, 'FA-2568-0043', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-10 12:41:22'),
(410, 14, 'create', 'submission', 10047, 'FA-2568-0044', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-10 12:41:22'),
(411, 14, 'create', 'submission', 10048, 'FA-2568-0045', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-10 12:41:22'),
(412, 14, 'create', 'submission', 10049, 'FA-2568-0046', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-10 12:41:22'),
(413, 14, 'create', 'submission', 10050, 'FA-2568-0047', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-10 12:41:22'),
(414, 14, 'create', 'submission', 10051, 'FA-2568-0048', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-10 12:41:22'),
(415, 14, 'create', 'submission', 10052, 'FA-2568-0049', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-10 12:41:22'),
(416, 14, 'create', 'submission', 10053, 'FA-2568-0050', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-10 12:41:22'),
(417, 14, 'create', 'submission', 10054, 'FA-2568-0051', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-10 12:41:22'),
(418, 14, 'create', 'submission', 10055, 'FA-2568-0052', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-10 12:41:22'),
(419, 14, 'create', 'submission', 10056, 'FA-2568-0053', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-10 12:41:22'),
(420, 14, 'create', 'submission', 10057, 'FA-2568-0054', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-10 12:41:22'),
(421, 14, 'create', 'submission', 10058, 'FA-2568-0055', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-10 12:41:22'),
(422, 14, 'create', 'submission', 10059, 'FA-2568-0056', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-10 12:41:22'),
(423, 14, 'create', 'submission', 10060, 'FA-2568-0057', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-10 12:41:22'),
(424, 14, 'create', 'submission', 10061, 'FA-2568-0058', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-10 12:41:22'),
(425, 14, 'create', 'submission', 10062, 'FA-2568-0059', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-10 12:41:22'),
(426, 14, 'create', 'submission', 10063, 'FA-2568-0060', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-10 12:41:22'),
(427, 14, 'create', 'submission', 10064, 'FA-2568-0061', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 2, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-10 12:41:22');

-- --------------------------------------------------------

--
-- Table structure for table `cp_employee`
--

CREATE TABLE `cp_employee` (
  `ID` int(11) NOT NULL,
  `prefix` varchar(50) DEFAULT NULL,
  `FullName` varchar(255) DEFAULT NULL,
  `Name` varchar(100) DEFAULT NULL,
  `Lname` varchar(100) DEFAULT NULL,
  `manage_position` varchar(255) DEFAULT NULL,
  `position` varchar(255) DEFAULT NULL,
  `position_en` varchar(255) DEFAULT NULL,
  `prefix_position_en` varchar(50) DEFAULT NULL,
  `Name_en` varchar(255) DEFAULT NULL,
  `suffix_en` varchar(50) DEFAULT NULL,
  `Email` varchar(255) DEFAULT NULL,
  `TEL` varchar(50) DEFAULT NULL,
  `TELformat` varchar(50) DEFAULT NULL,
  `TEL_ENG` varchar(50) DEFAULT NULL,
  `manage_position_en` varchar(255) DEFAULT NULL,
  `LAB_Name` varchar(255) DEFAULT NULL,
  `Room` varchar(255) DEFAULT NULL,
  `CP_WEB_ID` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `cp_employee`
--

INSERT INTO `cp_employee` (`ID`, `prefix`, `FullName`, `Name`, `Lname`, `manage_position`, `position`, `position_en`, `prefix_position_en`, `Name_en`, `suffix_en`, `Email`, `TEL`, `TELformat`, `TEL_ENG`, `manage_position_en`, `LAB_Name`, `Room`, `CP_WEB_ID`) VALUES
(1001, 'รศ. ดร.', 'งามนิจ  อาจอินทร์', 'งามนิจ', 'อาจอินทร์', '', 'รองศาสตราจารย์', 'Associate Professor', 'Assoc. Prof.', 'ngamnij arch-int', 'Ph.D.', 'ngamnij@kku.ac.th', '089-6222316', '08 9622 2316', '+668 9622 2316', '', 'Applied Intelligence and Data Analytics (AIDA) Lab', '', 'https://computing.kku.ac.th/ngamnij.arch-int'),
(1002, 'ผศ. ดร.', 'พุธษดี  ศิริแสงตระกูล', 'พุธษดี', 'ศิริแสงตระกูล', '', 'ผู้ช่วยศาสตราจารย์', 'Assistant Professor', 'Asst. Prof.', 'pusadee seresangtakul', 'Ph.D.', 'pusadee@kku.ac.th', '080-4140401', '08 0414 0401', '+668 0414 0401', '', 'Natural Language and Speech Processing Lab (NLSP)', '', 'https://computing.kku.ac.th/pusadee.seresangtakul'),
(1003, 'รศ. ดร.', 'อุรฉัตร โคแก้ว', 'อุรฉัตร ', 'โคแก้ว', '', 'รองศาสตราจารย์', 'Associate Professor', 'Assoc. Prof.', 'urachart kokaew', 'Ph.D.', 'urachart@kku.ac.th', '086-6329529', '08 6632 9529', '+668 6632 9529', '', 'Applied Intelligence and Data Analytics (AIDA) Lab', 'SC9333', 'https://computing.kku.ac.th/urachart.kokaew'),
(1004, 'รศ. ดร.', 'ปัญญาพล  หอระตะ', 'ปัญญาพล', 'หอระตะ', '', 'รองศาสตราจารย์', 'Associate Professor', 'Assoc. Prof.', 'punyaphol horata', 'Ph.D.', 'punhor1@kku.ac.th', '095-1689845', '09 5168 9845', '+669 5168 9845', '', 'Advanced Smart Computing Lab', '', 'https://computing.kku.ac.th/punyaphol.horata'),
(1005, 'ผศ. ดร.', 'วชิราวุธ  ธรรมวิเศษ', 'วชิราวุธ', 'ธรรมวิเศษ', '', 'ผู้ช่วยศาสตราจารย์', 'Assistant Professor', 'Asst. Prof.', 'Wachirawut Thamviset', 'Ph.D.', 'twachi@kku.ac.th', '081-3805203', '08 1380 5203', '+668 1380 5203', '', 'Machine Learning and Intelligent Systems (MLIS) Lab', '', 'https://computing.kku.ac.th/wachirawut.tamviset'),
(1006, 'ผศ. ดร.', 'สุมณฑา  เกษมวิลาศ', 'สุมณฑา', 'เกษมวิลาศ', '', 'ผู้ช่วยศาสตราจารย์', 'Assistant Professor', 'Asst. Prof.', 'Sumonta Kasemvilas', 'Ph.D.', 'sumkas@kku.ac.th', '094-2519245', '09 4251 9245', '+669 4251 9245', '', 'Hardware-Human Interface and Communications (H2I-Comm) Lab', 'SC9363', 'https://computing.kku.ac.th/sumonta.kasemvilas'),
(1007, 'รศ. ดร.', 'สิรภัทร เชี่ยวชาญวัฒนา', 'สิรภัทร', 'เชี่ยวชาญวัฒนา', 'คณบดี', 'รองศาสตราจารย์', 'Associate Professor', 'Assoc. Prof.', 'sirapat chiewchanwattana', 'Ph.D.', 'sunkra@kku.ac.th', '086-8509784', '08 6850 9784', '+668 6850 9784', '', 'Advanced Smart Computing (ASC) Lab', '', 'https://computing.kku.ac.th/sirapat.chiewchanwattana'),
(1008, 'ผศ.', 'บุญทรัพย์   ไวคำ', 'บุญทรัพย์', 'ไวคำ', '', 'ผู้ช่วยศาสตราจารย์', 'Assistant Professor', 'Asst. Prof.', 'boonsup waikham', '', 'boonsup@kku.ac.th', '080-7668868', '08 0766 8868', '+668 0766 8868', '', '', '', 'https://computing.kku.ac.th/boonsup.waikham'),
(1009, 'ผศ. ดร.', 'อุราวรรณ  จันทร์เกษ', 'อุราวรรณ', 'จันทร์เกษ', '', 'ผู้ช่วยศาสตราจารย์', 'Assistant Professor', 'Asst. Prof.', 'urawan chanket', 'Ph.D.', 'curawa@kku.ac.th', '087-6780595', '08 7678 0595', '+668 7678 0595', '', 'Geo-informatics, NEGISTDA', '', 'https://computing.kku.ac.th/urawan.chanket'),
(1010, 'รศ. ดร.', 'วรารัตน์  สงฆ์แป้น', 'วรารัตน์', 'สงฆ์แป้น', '', 'ผู้ช่วยศาสตราจารย์', 'Assistant Professor', 'Asst. Prof.', 'wararat songpan', 'Ph.D.', 'wararat@kku.ac.th ', '080-4111279', '08 0411 1279', '+668 0411 1279', '', 'Applied Intelligence and Data Analytics (AIDA) Lab', '', 'https://computing.kku.ac.th/wararat.songpan'),
(1011, 'รศ. ดร.', 'ชัยพล  กีรติกสิกร', 'ชัยพล', 'กีรติกสิกร', '', 'รองศาสตราจารย์', 'Associate Professor', 'Assoc. Prof.', 'chaiyapon keeratikasikorn', 'Ph.D.', 'chaiyapon@kku.ac.th', '084-6499463', '08 4649 9463', '+668 4649 9463', '', '', '', 'https://computing.kku.ac.th/chaiyapon.keeratikasikorn'),
(1012, 'ผศ. ดร.', 'ปวีณา  วันชัย', 'ปวีณา', 'วันชัย', '', 'ผู้ช่วยศาสตราจารย์', 'Assistant Professor', 'Asst. Prof.', 'paweena wanchai', 'Ph.D.', 'wpaweena@kku.ac.th', '087-6926662', '08 7692 6662', '+668 7692 6662', '', 'Applied Intelligence and Data Analytics (AIDA) Lab', 'SC9332', 'https://computing.kku.ac.th/paweena.wanchai'),
(1013, 'ผศ. ดร.', 'สิลดา  อินทรโสธรฉันท์', 'สิลดา', 'อินทรโสธรฉันท์', '', 'ผู้ช่วยศาสตราจารย์', 'Assistant Professor', 'Asst. Prof.', 'silada intarasothonchun', 'Ph.D.', 'silain@kku.ac.th', '094-2842356', '09 4284 2356', '+669 4284 2356', '', '', '', 'https://computing.kku.ac.th/silada.intarasothonchun'),
(1014, 'ผศ. ดร.', 'ณกร  วัฒนกิจ', 'ณกร', 'วัฒนกิจ', 'รองคณบดีฝ่ายวิชาการ', 'ผู้ช่วยศาสตราจารย์', 'Assistant Professor', 'Asst. Prof.', 'nagon watanakij', 'Ph.D.', 'nagon@kku.ac.th', '085-0040090', '08 5004 0090', '+668 5004 0090', '', '', '', 'https://computing.kku.ac.th/nagon.watanakij'),
(1015, 'ผศ. ดร.', 'มัลลิกา  วัฒนะ', 'มัลลิกา', 'วัฒนะ', '', 'ผู้ช่วยศาสตราจารย์', 'Assistant Professor', 'Asst. Prof.', 'Monlica Wattana', 'Ph.D.', 'monlwa@kku.ac.th', '086-8680988', '08 6868 0988', '+668 6868 0988', '', 'Applied Intelligence and Data Analytics (AIDA) Lab', 'SC9329', 'https://computing.kku.ac.th/monlica.wattana'),
(1016, 'ผศ. ดร.', 'สายยัญ  สายยศ', 'สายยัญ', 'สายยศ', '', 'ผู้ช่วยศาสตราจารย์', 'Assistant Professor', 'Asst. Prof.', 'saiyan saiyod', 'Ph.D.', 'saiyan@kku.ac.th', '089-6204227', '08 9620 4227', '+668 9620 4227', '', '', '', 'https://computing.kku.ac.th/saiyan.saiyod'),
(1017, 'ผศ. ดร.', 'พิพัธน์  เรืองแสง', 'พิพัธน์', 'เรืองแสง', '', 'ผู้ช่วยศาสตราจารย์', 'Assistant Professor', 'Asst. Prof.', 'Pipat Reungsang', 'Ph.D.', 'reungsang@kku.ac.th ', '097-3217810', '09 7321 7810', '+669 7321 7810', '', '', '', 'https://computing.kku.ac.th/pipat.reungsang'),
(1018, 'ศ. ดร.', 'จักรชัย  โสอินทร์', 'จักรชัย', 'โสอินทร์', '', 'ศาสตราจารย์', 'Professor', 'Prof.', 'Chakchai So-In', 'Ph.D.', 'chakso@kku.ac.th', '094-5149644', '09 4514 9644', '+669 4514 9644', '', 'IEEE/ACM Senior Members', '', 'https://computing.kku.ac.th/chakchai.so-in'),
(1019, 'ผศ. ดร.', 'คำรณ  สุนัติ', 'คำรณ', 'สุนัติ', '', 'ผู้ช่วยศาสตราจารย์', 'Assistant Professor', 'Asst. Prof.', 'khamron sunat', 'Ph.D.', 'skhamron@kku.ac.th', '080-4613391', '08 0461 3391', '+668 0461 3391', '', 'Advanced Smart Computing (ASC) Lab', '', 'https://computing.kku.ac.th/khamron.sunat'),
(1020, 'ผศ. ดร.', 'ชิตสุธา  สุ่มเล็ก', 'ชิตสุธา', 'สุ่มเล็ก', '', 'ผู้ช่วยศาสตราจารย์', 'Assistant Professor', 'Asst. Prof.', 'chitsutha soomlek', 'Ph.D.', 'chitsutha@kku.ac.th', '091-8654422', '091-8654422', '-', '', '\r Department of Computer Science ', ' SC9327', 'https://computing.kku.ac.th/chitsutha.soomlek'),
(1021, 'อ. ดร.', 'ศรัณย์  อภิชนตระกูล', 'ศรัณย์', 'อภิชนตระกูล', 'รองคณบดีฝ่ายบริหาร', 'อาจารย์', 'Lecturer', '', 'Sarun Apichontrakul', 'Ph.D.', 'sarunap@kku.ac.th', '084-1056767', '08 4105 6767', '+668 4105 6767', '', '', '', 'https://computing.kku.ac.th/sarun.apichontrakul'),
(1022, 'อ.', 'ธนพล  ตั้งชูพงศ์', 'ธนพล', 'ตั้งชูพงศ์', '', 'อาจารย์', 'Lecturer', '', 'Thanaphon Tangchoopong', '', 'thanaphon@kku.ac.th', '065-5219359', '06 5521 9359', '+666 5521 9359', '', 'Advanced Smart Computing (ASC) Lab', 'SC9328', 'https://computing.kku.ac.th/thanaphon.tangchoopong'),
(1023, 'ผศ. ดร.', 'วรัญญา  วรรณศรี', 'วรัญญา', 'วรรณศรี', '', 'ผู้ช่วยศาสตราจารย์', 'Assistant Professor', 'Asst. Prof.', 'Warunya Wunnasri', 'Ph.D.', 'waruwu@kku.ac.th ', '085-0022231', '08 5002 2231', '+668 5002 2231', '', 'Applied Intelligence and Data Analytics (AIDA) Lab', '', 'https://computing.kku.ac.th/warunya.wunnasri'),
(1024, 'อ. ดร.', 'ศักดิ์พจน์  ทองเลี่ยมนาค', 'ศักดิ์พจน์', 'ทองเลี่ยมนาค', '', 'อาจารย์', 'Lecturer', '', 'Sakpod Tongleamnak', 'Ph.D.', 'sakpod@kku.ac.th ', '083-4662082', '08 3466 2082', '+668 3466 2082', '', '', '', 'https://computing.kku.ac.th/sakpod.tongleamnak'),
(1025, 'ผศ. ดร.', 'เพชร  อิ่มทองคำ', 'เพชร', 'อิ่มทองคำ', '', 'ผู้ช่วยศาสตราจารย์', 'Assistant Professor', 'Asst. Prof.', 'Phet Aimtongkham', 'Ph.D.', 'phetim@kku.ac.th', '084-3927080', '08 4392 7080', '+668 4392 7080', '', '', '', 'https://computing.kku.ac.th/phet.aimtongkham'),
(1026, 'ผศ. ดร.', 'ไพรสันต์  ผดุงเวียง', 'ไพรสันต์', 'ผดุงเวียง', '', 'ผู้ช่วยศาสตราจารย์', 'Assistant Professor', 'Asst. Prof.', 'Praisan Padungweang', 'Ph.D.', 'praipa@kku.ac.th', '094-2653336', '09 4265 3336', '+669 4265 3336', '', 'Advanced Smart Computing (ASC) Lab', '', 'https://computing.kku.ac.th/praisan.padungweang'),
(1027, 'ผศ. ดร.', 'ชานนท์  เดชสุภา', 'ชานนท์', 'เดชสุภา', 'รองคณบดีฝ่ายวิจัยและนวัตกรรม', 'ผู้ช่วยศาสตราจารย์', 'Assistant Professor', 'Asst. Prof.', 'Chanon Dechsupa', 'Ph.D.', 'chanode@kku.ac.th', '089-2175154', '08 9217 5154', '+668 9217 5154', '', '', '', 'https://computing.kku.ac.th/chanon.dechsupa'),
(1028, 'ศ. ดร.', 'ศาสตรา  วงศ์ธนวสุ', 'ศาสตรา', 'วงศ์ธนวสุ', '', 'ศาสตราจารย์', 'Professor', 'Prof.', 'Sartra Wongthanavasu', 'Ph.D.', 'wongsar@kku.ac.th', '081-9650277', '08 1965 0277', '+668 1965 0277', '', 'Machine Learning and Intelligent Systems (MLIS) Lab', '', 'https://computing.kku.ac.th/sartra.wongthanavasu'),
(1029, 'อ. ดร.', 'วาสนา พุฒกลาง', 'วาสนา', 'พุฒกลาง', '', 'อาจารย์', 'Lecturer', '', 'Wasana Putklang', 'Ph.D.', 'putklang_w@kku.ac.th', '086-7162373', '08-6716-2373', '+668 6716-2373', '', 'Geo-Informatics, NEGISTDA', 'SC9337', 'https://computing.kku.ac.th/wasana.putklang'),
(1030, 'อ. ดร.', 'ภัคราช มุสิกะวัน', 'ภัคราช', 'มุสิกะวัน', '', 'อาจารย์', 'Lecturer', '', 'Pakarat Musikawan', 'Ph.D.', 'pakamu@kku.ac.th', '083-4660399', '08 3466 0399 ', '+668 3466 0399 ', '', '', 'SC9349', 'https://computing.kku.ac.th/pakarat.musikawan'),
(1031, 'อ. ดร.', 'ญานิกา คงโสรส', 'ญานิกา', 'คงโสรส', '', 'อาจารย์', 'Lecturer', '', 'Yanika Kongsorot', 'Ph.D.', 'yaniko@kku.ac.th', '084-6042660', '08 4604 2660', '+668 4604 2660', '', '', 'SC9348', 'https://computing.kku.ac.th/yanika.kongsorot'),
(1032, 'อ. ดร.', 'Arfat Ahmad Khan', 'Arfat', 'Khan', '', 'อาจารย์', 'Lecturer', '', 'Arfat Ahmad Khan', 'Ph.D.', 'arfatkhan@kku.ac.th', '095-320-3915', '09 5320 3915\n', '', '', '', '', ''),
(1033, 'อ. ดร.', 'พงษ์ศธร จันทร์ยอย', 'พงษ์ศธร', 'จันทร์ยอย', '', 'อาจารย์', 'Lecturer', '', 'Pongsathon Janyoi', 'Ph.D.', 'pongsathon@kku.ac.th', '094-693-7606', '09 4693 7606', '+669 4693 7606', '', '', 'SC9348', ''),
(1034, 'ผศ. ดร.', 'ไอศูรย์ กาญจนสุรัตน์', 'ไอศูรย์', 'กาญจนสุรัตน์', 'ผู้ช่วยคณบดีฝ่ายแผนและประกันคุณภาพ', 'ผู้ช่วยศาสตราจารย์', 'Assistant Professor', 'Asst. Prof.', 'Isoon Kanjanasurat', 'Ph.D.', 'isoonkan@kku.ac.th', '093-2624161', '09 3262 4161', '+669 3262 4161', '', '', 'SC9323', ''),
(1035, 'อ. ดร.', 'จักรกฤษณ์ แก้วโยธา', 'จักรกฤษณ์', 'แก้วโยธา', '', 'อาจารย์', 'Lecturer', '', 'Jakkrit Kaewyotha', 'Ph.D.', 'jakkritk@kku.ac.th', '089-7140466', '08 9714 0466', '+668 9714 0466', '', '', 'SC9361', ''),
(1036, 'ผศ. ดร.', 'สาธิต กระเวนกิจ', 'สาธิต', 'กระเวนกิจ', 'ผู้ช่วยคณบดีฝ่ายดิจิทัล', 'ผู้ช่วยศาสตราจารย์', 'Assistant Professor', 'Asst. Prof.', 'Satit Kravenkit', 'Ph.D.', 'satikr@kku.ac.th', '089-4177484', '08 9417 7484', '+668 9417 7484', '', '', '', ''),
(1037, 'อ. ดร.', 'พบพร ด่านวิรุทัย', 'พบพร', 'ด่านวิรุทัย', '', 'อาจารย์', 'Lecturer', '', 'Pobporn Danvirutai', 'Ph.D.', 'pobda@kku.ac.th', '092-8719244', '', '', '', '', '', ''),
(1038, 'อ. ดร.', 'วันเฉลิม นัดดา', 'วันเฉลิม', 'นัดดา', '', 'อาจารย์', 'Lecturer', '', 'Wanchaloem Nadda', '', 'wannad@kku.ac.th', '062-8428362', '', '', '', '', '', '');

-- --------------------------------------------------------

--
-- Table structure for table `dept_head_assignments`
--

CREATE TABLE `dept_head_assignments` (
  `assignment_id` int(11) NOT NULL,
  `head_user_id` int(11) NOT NULL,
  `restore_role_id` int(11) NOT NULL,
  `effective_from` datetime NOT NULL,
  `effective_to` datetime DEFAULT NULL,
  `changed_by` int(11) DEFAULT NULL,
  `changed_at` datetime NOT NULL DEFAULT current_timestamp(),
  `note` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `dept_head_assignments`
--

INSERT INTO `dept_head_assignments` (`assignment_id`, `head_user_id`, `restore_role_id`, `effective_from`, `effective_to`, `changed_by`, `changed_at`, `note`) VALUES
(1, 13, 1, '2025-09-26 21:27:00', '2025-09-27 05:19:00', NULL, '2025-09-26 21:27:22', NULL),
(2, 12, 1, '2025-09-27 05:19:00', '2025-09-27 05:55:00', NULL, '2025-09-27 05:25:59', NULL),
(3, 13, 1, '2025-09-27 05:55:00', '2025-10-04 08:29:00', NULL, '2025-09-27 05:55:31', NULL),
(4, 1027, 3, '2025-10-04 08:29:00', NULL, NULL, '2025-10-04 08:30:30', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `document_types`
--

CREATE TABLE `document_types` (
  `document_type_id` int(11) NOT NULL,
  `document_type_name` varchar(255) DEFAULT NULL,
  `code` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `category` varchar(50) DEFAULT 'general' COMMENT 'ไม่ได้ใช้',
  `required` tinyint(1) DEFAULT 0,
  `multiple` tinyint(1) DEFAULT 0,
  `document_order` int(11) DEFAULT 0,
  `is_required` enum('yes','no') DEFAULT NULL COMMENT 'ไม่ได้ใช้',
  `create_at` datetime DEFAULT current_timestamp(),
  `update_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `delete_at` datetime DEFAULT NULL,
  `fund_types` longtext DEFAULT NULL COMMENT 'ประเภททุนที่ใช้ได้ ["publication_reward", "fund_application"]' CHECK (json_valid(`fund_types`)),
  `subcategory_ids` longtext DEFAULT NULL COMMENT 'รหัส subcategory เฉพาะ [1,2,3] หรือ NULL = ทุก subcategory' CHECK (json_valid(`subcategory_ids`)),
  `subcategory_name` longtext DEFAULT NULL COMMENT 'snapshot ของชื่อทุน ไม่ผูก FK'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `document_types`
--

INSERT INTO `document_types` (`document_type_id`, `document_type_name`, `code`, `category`, `required`, `multiple`, `document_order`, `is_required`, `create_at`, `update_at`, `delete_at`, `fund_types`, `subcategory_ids`, `subcategory_name`) VALUES
(1, 'QS WUR 1-400', 'qs_wur_1-400', '', 0, 0, 1, NULL, NULL, '2025-08-29 15:50:11', NULL, NULL, NULL, NULL),
(2, 'Full Reprint (บทความตีพิมพ์)', 'full_reprint_(บทความตีพิมพ์)', 'publication', 1, 0, 2, NULL, NULL, '2025-09-13 14:45:11', NULL, NULL, NULL, NULL),
(3, 'Scopus-ISI (หลักฐานการจัดอันดับ)', 'scopus-isi_(หลักฐานการจัดอันดับ)', 'publication', 1, 0, 3, NULL, NULL, '2025-08-29 13:31:36', NULL, NULL, NULL, NULL),
(4, 'สำเนาบัญชีธนาคาร', 'สำเนาบัญชีธนาคาร', '', 1, 0, 4, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(5, 'Payment / Exchange rate', 'payment_/_exchange_rate', 'publication', 0, 0, 5, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(6, 'Page Charge Invoice', 'page_charge_invoice', '', 0, 0, 6, NULL, NULL, '2025-09-13 14:45:15', NULL, NULL, NULL, NULL),
(7, 'Page Charge Receipt', 'page_charge_receipt', 'publication', 0, 0, 7, NULL, NULL, '2025-09-13 14:45:18', NULL, NULL, NULL, NULL),
(8, 'Manuscript Editor Invoice', 'manuscript_editor_invoice', 'publication', 0, 0, 8, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(9, 'Manuscript Receipt', 'manuscript_receipt', '', 0, 0, 9, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(10, 'Review Response (Special issue)', 'review_response_(special_issue)', '', 0, 0, 10, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(11, 'เอกสารอื่นๆ', 'เอกสารอื่นๆ', 'publication', 0, 1, 11, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(12, 'เอกสารเบิกจ่ายภายนอก', 'เอกสารเบิกจ่ายภายนอก', 'publication', 0, 1, 12, 'no', NULL, NULL, NULL, NULL, NULL, NULL),
(13, 'โครงการวิจัย', 'research_proposal', 'general', 0, 0, 0, NULL, '2025-08-29 13:31:42', '2025-10-02 14:54:58', NULL, '[\"fund_application\"]', '[1,2,3]', NULL),
(14, 'งบประมาณ', 'budget_plan', 'general', 0, 0, 0, NULL, '2025-08-29 13:31:42', '2025-10-02 14:55:00', NULL, '[\"fund_application\"]', '[4,5,6]', NULL),
(15, 'CV ผู้วิจัย', 'researcher_cv', 'general', 0, 0, 0, NULL, '2025-08-29 13:31:42', '2025-08-29 13:31:42', NULL, '[\"fund_application\"]', NULL, NULL),
(16, 'แบบฟอร์มคำขอรับเงินรางวัล (DOCX)', 'publication_reward_form_docx', 'publication_reward', 0, 0, 0, NULL, '2025-09-30 13:41:38', '2025-09-30 13:41:38', NULL, '[\"publication_reward\"]', NULL, NULL),
(17, 'แบบฟอร์มคำร้องรวม (merged pdf)', 'แบบฟอร์มคำร้องรวม (merged pdf)', 'general', 0, 0, 0, NULL, '2025-10-11 22:13:52', '2025-10-11 22:13:52', NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `end_of_contract`
--

CREATE TABLE `end_of_contract` (
  `eoc_id` int(11) NOT NULL,
  `content` longtext NOT NULL,
  `display_order` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `end_of_contract`
--

INSERT INTO `end_of_contract` (`eoc_id`, `content`, `display_order`) VALUES
(1, 'ผู้รับทุนต้องปฏิบัติตามระเบียบของหน่วยงานและใช้จ่ายงบประมาณอย่างโปร่งใส...', 1),
(2, 'ผู้รับทุนต้องส่งรายงานผลภายในระยะเวลาที่หน่วยงานกำหนด...', 2),
(3, 'กรณีมีเงินเหลือ ให้คืนเงินส่วนเกินภายในกำหนด...', 3);

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
  `file_hash` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `is_public` tinyint(1) DEFAULT 0,
  `uploaded_by` int(11) DEFAULT NULL,
  `uploaded_at` datetime DEFAULT current_timestamp(),
  `create_at` datetime DEFAULT current_timestamp(),
  `update_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `delete_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `file_uploads`
--

INSERT INTO `file_uploads` (`file_id`, `original_name`, `stored_path`, `folder_type`, `submission_id`, `file_size`, `mime_type`, `file_hash`, `is_public`, `uploaded_by`, `uploaded_at`, `create_at`, `update_at`, `delete_at`) VALUES
(293, 'form_sample.pdf', 'uploads\\users\\user_14_อาจารย_ทดสอบ\\submissions\\pub139_2025-10-04\\form_sample_PR-25681004-0001.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 14, '2025-10-04 09:05:41', '2025-10-04 09:05:41', '2025-10-04 09:05:41', NULL),
(294, 'PR-25681004-0001_publication_reward_form.docx', 'uploads\\users\\user_14_อาจารย_ทดสอบ\\submissions\\pub139_2025-10-04\\PR-25681004-0001_publication_reward_form.docx', 'temp', NULL, 25879, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 14, '2025-10-04 09:05:41', '2025-10-04 09:05:41', '2025-10-04 09:05:41', NULL),
(295, 'form_sample.pdf', 'uploads\\users\\user_14_อาจารย_ทดสอบ\\submissions\\pub10029_2025-10-05\\form_sample_PR-2568-0002.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 14, '2025-10-05 02:20:18', '2025-10-05 02:20:18', '2025-10-05 02:20:18', NULL),
(296, 'PR-2568-0002_publication_reward_form.docx', 'uploads\\users\\user_14_อาจารย_ทดสอบ\\submissions\\pub10029_2025-10-05\\PR-2568-0002_publication_reward_form.docx', 'temp', NULL, 25798, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 14, '2025-10-05 02:20:19', '2025-10-05 02:20:19', '2025-10-05 02:20:19', NULL),
(297, 'form_sample_PR-2568-0003.pdf', 'uploads\\users\\user_14_อาจารย์_ทดสอบ\\submissions\\pub10030_2025-10-08\\form_sample_PR-2568-0003.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 14, '2025-10-08 02:30:34', '2025-10-08 02:30:34', '2025-10-08 02:30:34', NULL),
(298, 'form_sample_PR-2568-0003_1.pdf', 'uploads\\users\\user_14_อาจารย์_ทดสอบ\\submissions\\pub10030_2025-10-08\\form_sample_PR-2568-0003_1.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 14, '2025-10-08 02:30:34', '2025-10-08 02:30:34', '2025-10-08 02:30:34', NULL),
(299, 'PR-2568-0003_publication_reward_form.docx', 'uploads\\users\\user_14_อาจารย์_ทดสอบ\\submissions\\pub10030_2025-10-08\\PR-2568-0003_publication_reward_form.docx', 'submission', NULL, 26294, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 14, '2025-10-08 02:30:34', '2025-10-08 02:30:34', '2025-10-08 02:30:34', NULL),
(300, 'form_sample_PR-2568-0004.pdf', 'uploads\\users\\user_1027_ชานนท์_เดชสุภา\\submissions\\pub10031_2025-10-08\\form_sample_PR-2568-0004.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 1027, '2025-10-08 03:17:13', '2025-10-08 03:17:13', '2025-10-08 03:17:13', NULL),
(301, 'form_sample_PR-2568-0004_1.pdf', 'uploads\\users\\user_1027_ชานนท์_เดชสุภา\\submissions\\pub10031_2025-10-08\\form_sample_PR-2568-0004_1.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 1027, '2025-10-08 03:17:13', '2025-10-08 03:17:13', '2025-10-08 03:17:13', NULL),
(302, 'PR-2568-0004_publication_reward_form.docx', 'uploads\\users\\user_1027_ชานนท์_เดชสุภา\\submissions\\pub10031_2025-10-08\\PR-2568-0004_publication_reward_form.docx', 'submission', NULL, 26300, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 1027, '2025-10-08 03:17:13', '2025-10-08 03:17:13', '2025-10-08 03:17:13', NULL),
(303, '14 ผศ.ดร.ชานนท์ 1.3, 1.10.pdf', 'uploads\\users\\user_1027_ชานนท์_เดชสุภา\\submissions\\PR-2568-0001\\14 ผศ.ดร.ชานนท์ 1.3, 1.10.pdf', 'submission', 10026, NULL, 'application/pdf', NULL, 0, 1027, '2025-10-11 22:10:36', '2025-10-11 22:10:36', '2025-10-11 22:10:36', NULL),
(304, '14 ผศ.ดร.ชานนท์ ทุนส่งเสริม 1.5.pdf', 'uploads\\users\\user_1027_ชานนท์_เดชสุภา\\submissions\\FA-2568-0001\\14 ผศ.ดร.ชานนท์ ทุนส่งเสริม 1.5.pdf', 'submission', 10062, NULL, 'application/pdf', NULL, 0, 1027, '2025-10-11 22:10:36', '2025-10-11 22:10:36', '2025-10-11 22:55:58', NULL);

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
  `approved_by` int(11) DEFAULT NULL COMMENT 'ไม่ได้ใช้',
  `approved_at` datetime DEFAULT NULL COMMENT 'ไม่ได้ใช้',
  `rejected_by` int(11) DEFAULT NULL COMMENT 'ไม่ได้ใช้',
  `rejected_at` datetime DEFAULT NULL COMMENT 'ไม่ได้ใช้',
  `closed_at` datetime DEFAULT NULL,
  `announce_reference_number` varchar(50) DEFAULT NULL,
  `comment` text DEFAULT NULL,
  `main_annoucement` int(11) DEFAULT NULL,
  `activity_support_announcement` int(11) DEFAULT NULL,
  `author_name_list` varchar(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `fund_application_details`
--

INSERT INTO `fund_application_details` (`detail_id`, `submission_id`, `subcategory_id`, `project_title`, `project_description`, `requested_amount`, `approved_amount`, `approved_by`, `approved_at`, `rejected_by`, `rejected_at`, `closed_at`, `announce_reference_number`, `comment`, `main_annoucement`, `activity_support_announcement`, `author_name_list`) VALUES
(55, 10032, 19, 'Mitigating Energy Attacks in Wireless Sensor Networks Using Deception: A Game Theoretic Approach\r\nProceedings - IEEE Global Communications Conference, GLOBECOM (2024)', NULL, NULL, 10000.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(56, 10033, 19, 'AI-Driven Prompt Templates for User Acceptance Test Case Generation\r\nการนำเสนอแบบบรรยายระดับนานาชาติ', NULL, NULL, 15000.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(57, 10034, 19, 'Internet of Things (IoT) Assisted Context Aware Fertilizer Recommendation\r\nระดับเพชร', NULL, NULL, 15000.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(58, 10035, 19, 'Data Complexity Based Evaluation of the Model Dependence of Brain MRI Images for Classification of Brain Tumor and Alzheimer\'s Disease\r\nระดับเพชร', NULL, NULL, 15000.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(59, 10036, 19, 'Detection of Apple Plant Diseases Using Leaf Images Through Convolutional Neural Network \r\nระดับเพชร', NULL, NULL, 15000.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(60, 10037, 19, 'Dual-3DM3AD: Mixed Transformer Based Semantic Segmentation and Triplet Pre-Processing for Early Multi-Class Alzheimer\'s Diagnosis\r\nระดับเพชร', NULL, NULL, 15000.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(61, 10038, 19, 'An Efficient Deep Learning for Thai Sentiment Analysis\r\nระดับเงิน', NULL, NULL, 5000.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(62, 10039, 19, 'Multi-stroke thai finger-spelling sign language recognition system with deep learning\r\nระดับเงิน', NULL, NULL, 5000.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(63, 10040, 19, 'Thai finger-spelling sign language recognition using global and local features with SVM\r\nระดับเงิน', NULL, NULL, 5000.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(64, 10041, 19, 'Federated Deep Reinforcement Learning for Traffic Monitoring in SDN-Based IoT Networks\r\nระดับเพชร', NULL, NULL, 15000.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(65, 10042, 19, 'A hybrid model using fuzzy logic and an extreme learning machine with vector particle swarm optimization for wireless sensor network localization\r\nระดับเพชร', NULL, NULL, 15000.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(66, 10043, 19, 'Averaged dependence estimators for DoS attack detection in IoT networks\r\nระดับเพชร', NULL, NULL, 15000.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(67, 10044, 19, 'A hybrid localization model using node segmentation and improved particle swarm optimization with obstacle-awareness for wireless sensor networks\r\nระดับเพชร', NULL, NULL, 15000.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(68, 10045, 19, 'SeArch: A Collaborative and Intelligent NIDS Architecture for SDN-Based Cloud IoT Networks\r\nระดับเพชร', NULL, NULL, 15000.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(69, 10046, 19, 'Innovations in Silk Pattern Design using Artificail intelligence\r\nประกวดในงาน: 2024 Kaohsiung International Invention and Design EXPO', NULL, NULL, 10000.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(70, 10047, 19, 'Development of AI Model for Sugarcane Variety Identification Using Machine Learning and Deep Learning\r\nประกวดมนงาน:  The 36th International Invention, Innovation & Technology Exhibition (ITEX 2025)', NULL, NULL, 10000.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(71, 10048, 19, 'ระบบการจัดการเนื้หาของเว็บไซต์สำหรับพัฒนาโปรแกรม\r\nยื่นขอวันที่ 6 มิถุนายน 2567\r\nออกให้วันที่ 15 กรกฎาคม 2567', NULL, NULL, 3000.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(72, 10049, 19, 'เกมบินไปเลย\r\nยื่นขอวันที่ 6 มิถุนายน 2567\r\nออกให้วันที่ 7 กรกฎาคม 2567', NULL, NULL, 3000.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(73, 10050, 19, 'แชทบอทติดตามสถานะการซ่อมบำรุงรถยนต์ของผู้ที่มาใช้บริการอู่ขนาดกลาง\r\nยื่นขอวันที่ 6 มิถุนายน 2567\r\nออกให้วันที่ 7 กรกฎาคม 2567', NULL, NULL, 3000.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(74, 10051, 19, 'ระบบออกเอกสารสำคัญทางการศึกษาผ่านตู้อัติโนมัติ', NULL, NULL, 3000.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(75, 10052, 19, 'วิธีการประมวลผลอัตราการเต้นหัวใจที่สัมพันธ์กับภาวะซึมเศร้าด้วยสมาร์ตวอตช์\r\nยื่นขอวันที่ 6 มิถุนายน 2567\r\nออกให้วันที่ 17 มิถุนายน 2567', NULL, NULL, 15000.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(76, 10053, 19, 'สื่อการเรียนการสอนด้วย HCI ด้วยการประยุกต์ใช้ Micro E-Learning และ Gamification\r\nยื่นขอวันที่ 6 มิถุนายน 2567\r\nออกให้วันที่ 26 มิถุนายน 2567', NULL, NULL, 3000.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(77, 10054, 19, 'สื่ื่อการสอนวิชาเทคโนโลยีการออกแบบเว็บโดยประยุกต์ใช้เกมมิฟิเคชั่น\r\nยื่นขอวันที่ 6 มิถุนายน 2567\r\nออกให้วันที่ 26 มิถุนายน 2567', NULL, NULL, 3000.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(78, 10055, 19, 'เว็บแอปพลิเคชั่นเพื่อช่วยเหลือกระบวนการพยาบาล\r\nยื่นขอวันที่ 6 มิถุนายน 2567\r\nออกให้วันที่ 26 มิถุนายน 2567', NULL, NULL, 3000.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(79, 10056, 19, 'แอปพลิเคชั่นผู้ช่วยสุขภาพสำหรับอาการออฟฟิศซินโดรมด้วยเอไอ\r\nยื่นขอวันที่ 6 มิถุนายน 2567\r\nออกให้วันที่ 4 กรกฎาคม 2567', NULL, NULL, 3000.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(80, 10057, 19, 'ระบบจัดการนักศึกษาฝึกงาน กรณีศึกษา วิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น\r\nยื่นขอวันที่ 2 พฤษภาคม 2567\r\nออกให้วันที่ 20 พฤษภาคม 2567', NULL, NULL, 3000.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(81, 10058, 19, 'ระบบตรวจสอบการสำเสร็จการศึกษา กรณีศึกษา วิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น\r\nยื่นขอวันที่ 2 พฤษภาคม 2567\r\nออกให้วันที่ 29 พฤษภาคม 2567', NULL, NULL, 3000.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(82, 10059, 19, 'นุดทาสแมว\r\nยื่นขอวันที่ 2 พฤษภาคม 2567\r\nออกให้วันที่ 29 พฤษภาคม 2567', NULL, NULL, 3000.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(83, 10060, 19, 'คอมมูนิตี้ศิษย์เก่าคอมไซส์แอดเคเคยู\r\nยื่นขอวันที่ 2 พฤษภาคม 2567\r\nออกให้วันที่ 29 พฤษภาคม 2567', NULL, NULL, 3000.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(84, 10061, 19, 'เครื่องเลียงจิ้งหรีดอัตโนมัติที่ควบคุมด้วยระบบทางไกลแบบไร้สาย\r\nขอจดวันที่ 5 กุมภาพันธ์ 2563\r\nได้รับอนุอนุสิทธิบัตร 4 ธันวาคม 2566\r\nหมดอายุ 4 กุมภาพันธื 2569', NULL, NULL, 15000.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(85, 10062, 19, 'ทุนวิจัยความเป็นเลิศ ชั้นกลาง\r\nเรื่อง การทวนสอบเชิงรูปนัยสำหรับโมเดลคัลเลอร์เพทริเน็ตโดยใช้อาร์เอ็นเอ็นมัลติลาเบล', NULL, NULL, 150000.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(86, 10063, 19, 'เรื่อง การเพิ่มประสิทธิภาพความปลอดภัยและการใช้พลังงานอย่างมีประสิทธิภาพในการสื่อสารสำหรับเครือข่ายนอกภาคพื้นดินในยุค 6G ด้วยพื้นผิวอัจฉริยะที่สามารถปรับเปลี่ยนได้', NULL, NULL, 400000.00, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `fund_categories`
--

INSERT INTO `fund_categories` (`category_id`, `category_name`, `status`, `year_id`, `comment`, `create_at`, `update_at`, `delete_at`) VALUES
(6, 'ทุนส่งเสริมการวิจัย', 'active', 3, 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(7, 'ทุนอุดหนุนกิจกรรม', 'active', 3, 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `fund_forms`
--

CREATE TABLE `fund_forms` (
  `form_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL COMMENT 'ชื่อแบบฟอร์ม',
  `description` text DEFAULT NULL COMMENT 'รายละเอียดแบบฟอร์ม',
  `file_name` varchar(255) NOT NULL COMMENT 'ชื่อไฟล์ต้นฉบับ',
  `file_path` varchar(500) NOT NULL COMMENT 'path ไฟล์ในระบบ',
  `file_size` bigint(20) DEFAULT NULL COMMENT 'ขนาดไฟล์ (bytes)',
  `mime_type` varchar(100) DEFAULT NULL COMMENT 'ประเภทไฟล์',
  `form_type` enum('application','report','evaluation','guidelines','other') DEFAULT 'application' COMMENT 'ประเภทแบบฟอร์ม',
  `fund_category` enum('research_fund','promotion_fund','both') DEFAULT 'both' COMMENT 'หมวดหมู่กองทุน',
  `is_required` tinyint(1) DEFAULT 0 COMMENT 'บังคับใช้หรือไม่',
  `display_order` int(11) DEFAULT NULL,
  `status` enum('active','inactive','archived') DEFAULT 'active' COMMENT 'สถานะแบบฟอร์ม',
  `year_id` int(11) DEFAULT NULL COMMENT 'ปีของแบบฟอร์ม',
  `created_by` int(11) NOT NULL COMMENT 'ผู้สร้าง (user_id)',
  `create_at` datetime DEFAULT current_timestamp(),
  `update_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `delete_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางเก็บแบบฟอร์มและเอกสารที่เกี่ยวข้องกับการขอทุน';

--
-- Dumping data for table `fund_forms`
--

INSERT INTO `fund_forms` (`form_id`, `title`, `description`, `file_name`, `file_path`, `file_size`, `mime_type`, `form_type`, `fund_category`, `is_required`, `display_order`, `status`, `year_id`, `created_by`, `create_at`, `update_at`, `delete_at`) VALUES
(12, 'แบบฟอร์มสมัครรับ เงินรางวัลตีพิมพ์ - 2568', NULL, 'แบบฟอร์มสมัครรับ_เงินรางวัลตีพิมพ์_-_2568.doc', 'uploads\\fund_forms\\แบบฟอร์มสมัครรับ_เงินรางวัลตีพิมพ์_-_2568.doc', 74752, 'application/msword', 'application', 'promotion_fund', NULL, 2, 'active', 3, 15, '2025-10-10 04:21:20', '2025-10-10 04:22:42', NULL),
(13, 'แบบฟอร์มสมัครรับ ค่า Page Charge และค่า Manuscript Editing Service 2568', NULL, 'แบบฟอร์มสมัครรับ_ค่า_Page_Charge_และค่า_Manuscript_Editing_Service_2568.doc', 'uploads\\fund_forms\\แบบฟอร์มสมัครรับ_ค่า_Page_Charge_และค่า_Manuscript_Editing_Service_2568.doc', 70656, 'application/msword', 'application', 'both', NULL, 3, 'active', 3, 15, '2025-10-10 04:21:38', '2025-10-10 04:22:42', NULL),
(14, 'แบบฟอร์มสมัครรับ ค่าตอบแทนการขอจดลิขสิทธิ์สิทธิบัตรและอนุสิทธิบัตร_RB - 2568', NULL, 'แบบฟอร์มสมัครรับ_ค่าตอบแทนการขอจดลิขสิทธิ์สิทธิบัตรและอนุสิทธิบัตร_RB_-_2568.doc', 'uploads\\fund_forms\\แบบฟอร์มสมัครรับ_ค่าตอบแทนการขอจดลิขสิทธิ์สิทธิบัตรและอนุสิทธิบัตร_RB_-_2568.doc', 46080, 'application/msword', 'application', 'both', NULL, 5, 'active', 3, 15, '2025-10-10 04:21:53', '2025-10-10 04:22:42', NULL),
(15, 'แบบฟอร์มสมัครรับ ค่าตอบแทนผลงานสิ่งประดิษฐ์และนวัตกรรมที่ได้รับรางวัล_RB - 2568', NULL, 'แบบฟอร์มสมัครรับ_ค่าตอบแทนผลงานสิ่งประดิษฐ์และนวัตกรรมที่ได้รับรางวัล_RB_-_2568.doc', 'uploads\\fund_forms\\แบบฟอร์มสมัครรับ_ค่าตอบแทนผลงานสิ่งประดิษฐ์และนวัตกรรมที่ได้รับรางวัล_RB_-_2568.doc', 51200, 'application/msword', 'application', 'both', NULL, 4, 'active', 3, 15, '2025-10-10 04:22:06', '2025-10-10 04:22:42', NULL),
(16, 'แบบฟอร์มสมัครรับ ทุนส่งเสริมการวิจัย 2568', '', 'แบบฟอร์มสมัครรับ_ทุนส่งเสริมการวิจัย_2568.doc', 'uploads\\fund_forms\\แบบฟอร์มสมัครรับ_ทุนส่งเสริมการวิจัย_2568.doc', 80896, 'application/msword', 'application', 'research_fund', NULL, 1, 'active', 3, 15, '2025-10-10 04:22:17', '2025-10-10 04:22:42', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `fund_installment_periods`
--

CREATE TABLE `fund_installment_periods` (
  `installment_period_id` int(11) NOT NULL,
  `year_id` int(11) NOT NULL,
  `installment_number` int(11) NOT NULL,
  `cutoff_date` date NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `remark` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `fund_installment_periods`
--

INSERT INTO `fund_installment_periods` (`installment_period_id`, `year_id`, `installment_number`, `cutoff_date`, `name`, `status`, `remark`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 3, 1, '2025-02-03', 'งวด 1', 'active', NULL, '2025-10-14 04:07:06', '2025-10-14 04:07:06', NULL),
(2, 3, 2, '2025-05-15', 'งวด 2', 'active', NULL, '2025-10-14 04:07:06', '2025-10-14 04:07:06', NULL),
(3, 3, 3, '2025-08-31', 'งวด 3', 'active', NULL, '2025-10-14 04:07:06', '2025-10-14 04:07:06', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `fund_subcategories`
--

CREATE TABLE `fund_subcategories` (
  `subcategory_id` int(11) NOT NULL,
  `category_id` int(11) DEFAULT NULL,
  `subcategory_name` varchar(255) DEFAULT NULL,
  `fund_condition` text DEFAULT NULL,
  `target_roles` longtext DEFAULT NULL COMMENT 'บทบาทที่สามารถเห็นทุนนี้ได้ (เก็บเป็น JSON array)',
  `form_type` varchar(50) DEFAULT 'download' COMMENT 'ประเภทฟอร์ม: download, publication_reward, research_proposal, etc.',
  `form_url` varchar(255) DEFAULT NULL COMMENT 'URL สำหรับดาวน์โหลดฟอร์ม (ถ้า form_type = download)',
  `year_id` int(255) DEFAULT NULL,
  `status` enum('active','disable') DEFAULT NULL,
  `comment` text DEFAULT NULL,
  `create_at` datetime DEFAULT NULL,
  `update_at` datetime DEFAULT NULL,
  `delete_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `fund_subcategories`
--

INSERT INTO `fund_subcategories` (`subcategory_id`, `category_id`, `subcategory_name`, `fund_condition`, `target_roles`, `form_type`, `form_url`, `year_id`, `status`, `comment`, `create_at`, `update_at`, `delete_at`) VALUES
(19, 6, '1.1 ทุนสนับสนุนผู้เชี่ยวชาญต่างประเทศ', NULL, NULL, 'download', NULL, 3, 'active', NULL, '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(20, 6, '1.2 ทุนวิจัยสถาบัน', NULL, NULL, 'download', NULL, 3, 'active', NULL, '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(21, 6, '1.3 ทุนวิจัยเพื่อพัฒนางานประจำ', NULL, NULL, 'download', NULL, 3, 'active', NULL, '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(22, 6, '1.4 ทุนวิจัยในชั้นเรียน', NULL, NULL, 'download', NULL, 3, 'active', NULL, '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(23, 6, '1.5 ทุนวิจัยความเป็นเลิศ', NULL, NULL, 'download', NULL, 3, 'active', NULL, '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(24, 6, '1.6 ทุนนวัตกรรมความเป็นเลิศ', NULL, NULL, 'download', NULL, 3, 'active', NULL, '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(25, 6, '1.7 ทุนพัฒนาศูนย์วิจัย', NULL, NULL, 'download', NULL, 3, 'active', NULL, '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(26, 6, '1.8 ทุนฝึกอบรมนักวิจัยหลังปริญญาเอก', NULL, NULL, 'download', NULL, 3, 'active', NULL, '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(27, 6, '1.9 ทุนสนับสนุนการได้รับทุนวิจัยภายนอก', NULL, NULL, 'download', NULL, 3, 'active', NULL, '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(28, 6, '1.10 ทุนพัฒนากลุ่มวิจัยบูรณาการ', NULL, NULL, 'download', NULL, 3, 'active', NULL, '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(29, 7, '2.1 ทุนทำวิจัยในต่างประเทศ', NULL, NULL, 'download', NULL, 3, 'active', NULL, '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(30, 7, '2.2 เงินรางวัลการตีพิมพ์เผยแพร่ผลงานวิจัยที่ได้รับการตีพิมพ์ในสาขาวิทยาศาสตร์และเทคโนโลยี (กรณีเป็นผู้แต่งชื่อแรก)', NULL, NULL, 'publication_reward', NULL, 3, 'active', NULL, '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(31, 7, '2.3 เงินรางวัลการตีพิมพ์เผยแพร่ผลงานวิจัยที่ได้รับการตีพิมพ์ในสาขาวิทยาศาสตร์และเทคโนโลยี (กรณีเป็นผู้ประพันธ์บรรณกิจ)', NULL, NULL, 'publication_reward', NULL, 3, 'active', NULL, '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(32, 7, '2.4 ค่าตอบแทนผลงานที่ได้รับการเผยแพร่ในการประชุมวิชาการชั้นนำในสาขาวิทยาศาสตร์และเทคโนโลยี ระดับ A+ ระดับ A และระดับ B', NULL, NULL, 'download', NULL, 3, 'active', NULL, '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(33, 7, '2.5 ค่าตอบแทนผลงานวิจัยที่ได้รับรางวัลบทความดีเด่น (Best paper award) จากการเข้าร่วมเสนอผลงานในการประชุมวิชาการ', NULL, NULL, 'download', NULL, 3, 'active', NULL, '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(34, 7, '2.6 ค่าตอบแทนผลงานที่ได้รับการอ้างอิงสูงจากวารสารในฐานข้อมูล ISI/Scopus ระดับเพชร ระดับทอง และ ระดับเงิน', NULL, NULL, 'download', NULL, 3, 'active', NULL, '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(35, 7, '2.7 ค่าตอบแทนผลงานสิ่งประดิษฐ์และนวัตกรรมที่ได้รับรางวัล\r\nจากการเข้าร่วมประกวด', NULL, NULL, 'download', NULL, 3, 'active', NULL, '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(36, 7, '2.8 ทุนสนับสนุนการวิจัยระยะสั้น', NULL, NULL, 'download', NULL, 3, 'active', NULL, '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(37, 7, '2.9 ค่าตอบแทนผลงานที่ได้รับสิทธิบัตรหรืออนุสิทธิบัตร \r\n (เป็นเจ้าของผลงานร่วมกัน)', NULL, NULL, 'download', NULL, 3, 'active', NULL, '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(38, 7, '2.10 เงินสมทบค่าธรรมเนียมที่ทางวารสารเรียกเก็บสำหรับการตีพิมพ์ (Page Charge) และค่าปรับปรุงบทความ (Manuscript Editing Service)', NULL, NULL, 'download', NULL, 3, 'active', NULL, '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(39, 7, '2.11 เงินรางวัลผลงานการเขียนหนังสือหรือตำรา', NULL, NULL, 'download', NULL, 3, 'active', NULL, '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(40, 7, '2.12 ทุนนำเสนอผลงานทางวิชาการ/ผลงาน นวัตกรรม/สิ่งประดิษฐ์', '1. ทุนนำเสนอผลงานทางวิชาการวงเงินรวมไม่เกิน 500,000 บาท\n2. ทุนนำเสนอผลงานนวัตกรรม/สิ่งประดิษฐ์วงเงินรวมไม่เกิน 200,000 บาท', '[\"1\"]', '', '', NULL, 'active', NULL, '2025-10-14 01:58:50', '2025-10-14 01:59:25', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `innovations`
--

CREATE TABLE `innovations` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `title` varchar(500) NOT NULL,
  `innovation_type` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `registered_date` date DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `innovations`
--

INSERT INTO `innovations` (`id`, `user_id`, `title`, `innovation_type`, `description`, `registered_date`, `created_at`, `updated_at`) VALUES
(1, 8, 'First Innovation', 'type1', 'First Innovation for Testing', '2025-09-02', '2025-09-13 14:59:08', '2025-09-13 14:59:17');

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`notification_id`, `user_id`, `title`, `message`, `type`, `is_read`, `related_submission_id`, `create_at`, `update_at`, `delete_at`) VALUES
(142, 14, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-25681004-0001 ของคุณ รองศาสตราจารย์อาจารย์ ทดสอบ แล้ว', 'success', 0, 139, '2025-10-04 09:05:41', '2025-10-04 09:05:41', NULL),
(143, 7, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25681004-0001 จากอาจารย์ รองศาสตราจารย์อาจารย์ ทดสอบ แล้ว', 'info', 0, 139, '2025-10-04 09:05:41', '2025-10-04 09:05:41', NULL),
(144, 11, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25681004-0001 จากอาจารย์ รองศาสตราจารย์อาจารย์ ทดสอบ แล้ว', 'info', 0, 139, '2025-10-04 09:05:41', '2025-10-04 09:05:41', NULL),
(145, 15, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25681004-0001 จากอาจารย์ รองศาสตราจารย์อาจารย์ ทดสอบ แล้ว', 'info', 0, 139, '2025-10-04 09:05:41', '2025-10-04 09:05:41', NULL),
(146, 14, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0002 ของคุณ รองศาสตราจารย์อาจารย์ ทดสอบ แล้ว', 'success', 0, 10029, '2025-10-05 02:20:19', '2025-10-05 02:20:19', NULL),
(147, 16, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0002 จากอาจารย์ รองศาสตราจารย์อาจารย์ ทดสอบ รอพิจารณา', 'info', 0, 10029, '2025-10-05 02:20:19', '2025-10-05 02:20:19', NULL),
(148, 1027, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0002 จากอาจารย์ รองศาสตราจารย์อาจารย์ ทดสอบ รอพิจารณา', 'info', 0, 10029, '2025-10-05 02:20:19', '2025-10-05 02:20:19', NULL),
(149, 14, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0003 ของคุณ รองศาสตราจารย์อาจารย์ ทดสอบ แล้ว', 'success', 0, 10030, '2025-10-08 02:30:34', '2025-10-08 02:30:34', NULL),
(150, 16, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0003 จากอาจารย์ รองศาสตราจารย์อาจารย์ ทดสอบ รอพิจารณา', 'info', 0, 10030, '2025-10-08 02:30:34', '2025-10-08 02:30:34', NULL),
(151, 1027, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0003 จากอาจารย์ รองศาสตราจารย์อาจารย์ ทดสอบ รอพิจารณา', 'info', 0, 10030, '2025-10-08 02:30:34', '2025-10-08 02:30:34', NULL),
(152, 1027, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0004 ของคุณ อาจารย์ชานนท์ เดชสุภา แล้ว', 'success', 0, 10031, '2025-10-08 03:17:14', '2025-10-08 03:17:14', NULL),
(153, 16, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0004 จากอาจารย์ อาจารย์ชานนท์ เดชสุภา รอพิจารณา', 'info', 0, 10031, '2025-10-08 03:17:14', '2025-10-08 03:17:14', NULL),
(154, 1027, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0004 จากอาจารย์ อาจารย์ชานนท์ เดชสุภา รอพิจารณา', 'info', 0, 10031, '2025-10-08 03:17:14', '2025-10-08 03:17:14', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `positions`
--

CREATE TABLE `positions` (
  `position_id` int(11) NOT NULL,
  `position_name` varchar(255) DEFAULT NULL,
  `is_active` enum('yes','no') DEFAULT 'yes',
  `create_at` datetime DEFAULT current_timestamp(),
  `update_at` datetime DEFAULT NULL ON UPDATE current_timestamp(),
  `delete_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `positions`
--

INSERT INTO `positions` (`position_id`, `position_name`, `is_active`, `create_at`, `update_at`, `delete_at`) VALUES
(1, 'อาจารย์', 'yes', '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL),
(2, 'รองศาสตราจารย์', 'yes', '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL),
(3, 'พนักงานธุรการ', 'yes', '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL),
(4, 'เจ้าหน้าที่บริหารงานทั่วไป', 'yes', NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `publications`
--

CREATE TABLE `publications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `title` varchar(500) NOT NULL,
  `authors` text DEFAULT NULL,
  `journal` varchar(255) DEFAULT NULL,
  `publication_type` enum('journal','conference','book','thesis','other') DEFAULT NULL,
  `publication_date` date DEFAULT NULL,
  `publication_year` smallint(5) UNSIGNED DEFAULT NULL,
  `doi` varchar(255) DEFAULT NULL,
  `url` varchar(512) DEFAULT NULL,
  `cited_by` int(10) UNSIGNED DEFAULT NULL,
  `cited_by_url` varchar(512) DEFAULT NULL,
  `source` enum('scholar','openalex','orcid','crossref') DEFAULT NULL,
  `external_ids` longtext DEFAULT NULL CHECK (json_valid(`external_ids`)),
  `fingerprint` varchar(64) DEFAULT NULL,
  `is_verified` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  `citation_history` longtext DEFAULT NULL COMMENT 'citations per year, e.g. {"2018":8,"2019":22}'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `publications`
--

INSERT INTO `publications` (`id`, `user_id`, `title`, `authors`, `journal`, `publication_type`, `publication_date`, `publication_year`, `doi`, `url`, `cited_by`, `cited_by_url`, `source`, `external_ids`, `fingerprint`, `is_verified`, `created_at`, `updated_at`, `deleted_at`, `citation_history`) VALUES
(218, 1027, 'Transformation of the BPMN design model into a colored Petri net using the partitioning approach', 'Chanon Dechsupa, Wiwat Vatanawood, Arthit Thongtak', NULL, NULL, NULL, 2018, NULL, 'https://ieeexplore.ieee.org/abstract/document/8405526/', 45, 'https://scholar.google.com/scholar?hl=en&cites=12787580523055771259', 'scholar', '{\"scholar_cluster_id\":\"[\'12787580523055771259\']\"}', '6badedb989e2cf25cea1172a93f4cb13db967f23', 0, '2025-10-07 02:04:36', '2025-10-07 02:04:36', NULL, '{\"2018\":2,\"2019\":10,\"2020\":3,\"2021\":5,\"2022\":9,\"2023\":6,\"2024\":9,\"2025\":1}'),
(219, 1027, 'Hierarchical verification for the BPMN design model using state space analysis', 'Chanon Dechsupa, Wiwat Vatanawood, Arthit Thongtak', NULL, NULL, NULL, 2019, NULL, 'https://ieeexplore.ieee.org/abstract/document/8611325/', 41, 'https://scholar.google.com/scholar?hl=en&cites=8862119664193353323', 'scholar', '{\"scholar_cluster_id\":\"[\'8862119664193353323\']\"}', '29bd0c0fb709ce634fa24280fa74b0123c33d553', 0, '2025-10-07 02:04:36', '2025-10-07 02:04:36', NULL, '{\"2018\":1,\"2019\":6,\"2020\":3,\"2021\":4,\"2022\":8,\"2023\":10,\"2024\":2,\"2025\":7}'),
(220, 1027, 'Formal verification of web service orchestration using colored petri net', 'C Dechsupa, W Vatanawood, A Thongtak', NULL, NULL, NULL, 2016, NULL, 'http://www.iaeng.org/publication/IMECS2016/IMECS2016_pp398-403.pdf', 13, 'https://scholar.google.com/scholar?hl=en&cites=17960005054307779010', 'scholar', '{\"scholar_cluster_id\":\"[\'17960005054307779010\']\"}', '0c1a71fe987328fd47243c5f50fa927fe3aad557', 0, '2025-10-07 02:04:37', '2025-10-07 02:04:37', NULL, '{\"2017\":1,\"2018\":3,\"2019\":4,\"2020\":2,\"2021\":1,\"2022\":0,\"2023\":2}'),
(221, 1027, 'Stepwise verification for the BPMN with timed and stochastic process using a colored generalized stochastic Petri net', 'Chanon Dechsupa, Wiwat Vatanawood, Arthit Thongtak', NULL, NULL, NULL, 2022, NULL, 'https://ieeexplore.ieee.org/abstract/document/9758738/', 6, 'https://scholar.google.com/scholar?hl=en&cites=7981025124627691886', 'scholar', '{\"scholar_cluster_id\":\"[\'7981025124627691886\']\"}', 'aeb7e0e56f784f470d212414acdf19f7307ed11e', 0, '2025-10-07 02:04:37', '2025-10-07 02:04:37', NULL, '{\"2022\":2,\"2023\":1,\"2024\":0,\"2025\":3}'),
(222, 1027, 'An automated framework for BPMN model verification achieving branch coverage', 'Chanon Dechsupa, Wiwat Vatanawood, Arthit Thongtak', NULL, NULL, NULL, 2021, NULL, 'https://engj.org/index.php/ej/article/view/4084', 5, 'https://scholar.google.com/scholar?hl=en&cites=8795149309224104072', 'scholar', '{\"scholar_cluster_id\":\"[\'8795149309224104072\']\"}', '07daece3baefcd04ce2263035573e1c44e55bc49', 0, '2025-10-07 02:04:37', '2025-10-07 02:04:37', NULL, '{\"2021\":1,\"2022\":0,\"2023\":2,\"2024\":1,\"2025\":1}'),
(223, 1027, 'Formal Verification of the Accounting Information Interfaces Using Colored Petri Net', 'Worawit Poolsawasdi, Chanon Dechsupa', NULL, NULL, NULL, 2019, NULL, 'https://ieeexplore.ieee.org/abstract/document/8802547/', 3, 'https://scholar.google.com/scholar?hl=en&cites=14998856147780456235', 'scholar', '{\"scholar_cluster_id\":\"[\'14998856147780456235\']\"}', 'c170922d38a507760700cbfab7f16275afb11e30', 0, '2025-10-07 02:04:37', '2025-10-07 02:04:37', NULL, '{\"2019\":1,\"2020\":0,\"2021\":2}'),
(224, 1027, 'Compositional formal verification for business process models with heterogeneous notations using colored Petri Net', 'C Dechsupa, W Vatanawood, A Thongtak', NULL, NULL, NULL, 2019, NULL, 'https://scholar.google.com/scholar?cluster=6843663431830027631&hl=en&oi=scholarr', 3, 'https://scholar.google.com/scholar?hl=en&cites=6843663431830027631', 'scholar', '{\"scholar_cluster_id\":\"[\'6843663431830027631\']\"}', '23242652a60d109cd5fad480e0a5d4f44cafe19d', 0, '2025-10-07 02:04:37', '2025-10-07 02:04:37', NULL, '{\"2023\":1,\"2024\":2}'),
(225, 1027, 'MorphoNet: A novel bivalve images classification framework with convolutional neural network', 'Chanon Dechsupa, Pongpun Prasankok, Wiwat Vattanawood, Arthit Thongtak', NULL, NULL, NULL, 2023, NULL, 'https://engj.org/index.php/ej/article/view/4510', 2, 'https://scholar.google.com/scholar?hl=en&cites=14881028456811771380', 'scholar', '{\"scholar_cluster_id\":\"[\'14881028456811771380\']\"}', '520340ad03a1bd8771441f1e27b9e5fd998fc943', 0, '2025-10-07 02:04:37', '2025-10-07 02:04:37', NULL, '{\"2024\":1,\"2025\":1}'),
(226, 1027, 'Formal modelling and verification of the traffic light control system design with time-automata', 'A Kamput, C Dechsupa', NULL, NULL, NULL, 2023, NULL, 'https://www.researchgate.net/profile/Chanon-Dechsupa/publication/372388619_Formal_Modelling_and_Verification_of_the_Traffic_Light_Control_System_Design_with_Time-Automata/links/652e3af3b5c77c79f9bda3d7/Formal-Modelling-and-Verification-of-the-Traffic-Light-Control-System-Design-with-Time-Automata.pdf', 2, 'https://scholar.google.com/scholar?hl=en&cites=14268178437607664045', 'scholar', '{\"scholar_cluster_id\":\"[\'14268178437607664045\']\"}', '68f044d021c5607e9e2102e03aa9f62276ba28ef', 0, '2025-10-07 02:04:37', '2025-10-07 02:04:37', NULL, '{\"2025\":2}'),
(227, 1027, 'An Applying Colored Petri Net for Computerized Accounting System and Ledger Accounts Instruction', 'Chanon Dechsupa, Wiwat Vatanawood, Worawit Poolsawasdi, Arthit Thongtak', NULL, NULL, NULL, 2021, NULL, 'https://www.mdpi.com/2073-431X/10/12/169', 2, 'https://scholar.google.com/scholar?hl=en&cites=16343376208504623490', 'scholar', '{\"scholar_cluster_id\":\"[\'16343376208504623490\']\"}', 'a0313a91b99f2de58140206c67f5aba6663f9f8b', 0, '2025-10-07 02:04:37', '2025-10-07 02:04:37', NULL, '{\"2023\":2}'),
(228, 1027, 'Towards AI-Augmented Formal Verification: A Preliminary Investigation of ENGRU and Its Challenges', 'Chanon Dechsupa, Teerapong Panboonyuen, Wiwat Vatanawood, Praisan Padungweang, Chakchai So-In', NULL, NULL, NULL, 2025, NULL, 'https://ieeexplore.ieee.org/abstract/document/10993355/', 1, 'https://scholar.google.com/scholar?hl=en&cites=18157055063819776419', 'scholar', '{\"scholar_cluster_id\":\"[\'18157055063819776419\']\"}', '61ae555d998434eb64330b744161eaa6a8914dc1', 0, '2025-10-07 02:04:37', '2025-10-07 02:04:37', NULL, '{\"2025\":1}'),
(229, 1027, 'Llm-Based Code Comment Summarization: Efficacy Evaluation and Challenges', 'Peeradon Sukkasem, Chitsutha Soomlek, Chanon Dechsupa', NULL, NULL, NULL, 2025, NULL, 'https://ieeexplore.ieee.org/abstract/document/11003343/', 1, 'https://scholar.google.com/scholar?hl=en&cites=14726756873448249733', 'scholar', '{\"scholar_cluster_id\":\"[\'14726756873448249733\']\"}', '39d79360a49705d0644781f70219ee2490fb951b', 0, '2025-10-07 02:04:37', '2025-10-07 02:04:37', NULL, '{\"2025\":1}'),
(230, 1027, 'Scalable Timed-Automata Models for Traffic Light Control Systems: Challenges and Solutions in Formal Verification', 'Apipath Kamput, Chanon Dechsupa, Wiwat Vatanawood, Suttinan Pomsiri', NULL, NULL, NULL, 2024, NULL, 'https://ieeexplore.ieee.org/abstract/document/10666689/', 1, 'https://scholar.google.com/scholar?hl=en&cites=12598599138348353170', 'scholar', '{\"scholar_cluster_id\":\"[\'12598599138348353170\']\"}', '47baa15c9601f7a47e319e4ee43ac19e56de55cd', 0, '2025-10-07 02:04:37', '2025-10-07 02:04:37', NULL, '{\"2024\":1}'),
(231, 1027, 'Toward automated verification of timed business process models using timed-automata networks and temporal properties', 'Chanon Dechsupa, Wiwat Vatanawood, Arthit Thongtak', NULL, NULL, NULL, 2025, NULL, 'https://www.sciencedirect.com/science/article/pii/S0020025525002208', NULL, NULL, 'scholar', NULL, '53db11828cb1250fd29af14999ea719ec090dbe1', 0, '2025-10-07 02:04:37', '2025-10-07 02:04:37', NULL, NULL),
(232, 1027, 'Ensuring IoT Controller Reliability with Colored Generalized Stochastic Petri Net', 'Kruntarat Samngamnoi, Sutinun Pomsiri, Apipath Kamput, Chanon Dechsupa', NULL, NULL, NULL, 2024, NULL, 'https://ieeexplore.ieee.org/abstract/document/10770732/', NULL, NULL, 'scholar', NULL, 'baf62b4c49575b62532aacf9a50ee208449c39ec', 0, '2025-10-07 02:04:37', '2025-10-07 02:04:37', NULL, NULL),
(233, 1027, 'An Applying Colored Petri Net for Computerized Accounting System and Ledger Accounts Instruction. Computers 2021, 10, 169', 'C Dechsupa, W Vatanawood, W Poolsawasdi, A Thongtak', NULL, NULL, NULL, 2021, NULL, 'https://www.academia.edu/download/80214901/pdf.pdf', NULL, NULL, 'scholar', NULL, '992712dd566fd338b5cf9253b9ddc09873cd0f04', 0, '2025-10-07 02:04:37', '2025-10-07 02:04:37', NULL, NULL),
(234, 1027, 'Configuration management for integrated teaming environment', 'Chanon Dechsupa, Yachai Limpiyakorn', NULL, NULL, NULL, 2011, NULL, 'https://ieeexplore.ieee.org/abstract/document/6081265/', NULL, NULL, 'scholar', NULL, 'f43315261210343763e2bbcc9400bbf5696776cf', 0, '2025-10-07 02:04:37', '2025-10-07 02:04:37', NULL, NULL),
(235, 1027, 'Transforming of the Sequence Diagram into Time-Automata Network', 'S Duangmalai, C Dechsupa', NULL, NULL, NULL, NULL, NULL, 'https://scholar.google.com/scholar?cluster=7621266305846188641&hl=en&oi=scholarr', NULL, NULL, 'scholar', NULL, '6df534e9aadf27573bb99823d90c0b0d042ad440', 0, '2025-10-07 02:04:37', '2025-10-07 02:04:37', NULL, NULL);

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
  `revision_fee_approve_amount` decimal(15,2) DEFAULT 0.00 COMMENT 'ค่าปรับปรุงที่ได้รับการอนุมัติ',
  `publication_fee` decimal(15,2) DEFAULT 0.00 COMMENT 'ค่าตีพิมพ์',
  `publication_fee_approve_amount` decimal(15,2) DEFAULT 0.00 COMMENT 'ค่าตีพิมพ์ที่อนุมัติ',
  `external_funding_amount` decimal(15,2) DEFAULT 0.00 COMMENT 'รวมจำนวนเงินจากทุนที่ user แนบเข้ามา',
  `total_amount` decimal(15,2) DEFAULT 0.00 COMMENT 'เกิดจากการหักลบค่าปรับปรุง+ค่าตีพิมพ์ ลบกับ รายการที่เบิกจากหน่วยงานนอก',
  `total_approve_amount` decimal(15,2) DEFAULT 0.00 COMMENT 'จำนวนเงินจริงที่วิทยาลัยจ่ายให้ (หลังจากได้รับการอนุมัติ)',
  `announce_reference_number` varchar(50) DEFAULT NULL,
  `author_count` int(11) DEFAULT 1,
  `author_type` enum('first_author','corresponding_author','coauthor') DEFAULT 'coauthor',
  `has_university_funding` enum('yes','no') DEFAULT 'no' COMMENT 'ได้รับการสนับสนุนทุนจากมหาวิทยาลัยหรือไม่',
  `funding_references` text DEFAULT NULL COMMENT 'หมายเลขอ้างอิงทุน (คั่นด้วยจุลภาค)',
  `university_rankings` text DEFAULT NULL COMMENT 'อันดับมหาวิทยาลัย/สถาบัน (คั่นด้วยจุลภาค)',
  `approved_amount` decimal(15,2) DEFAULT NULL COMMENT 'ไม่ได้ใช้',
  `approval_comment` text DEFAULT NULL COMMENT 'ไม่ได้ใช้',
  `approved_by` int(11) DEFAULT NULL COMMENT 'ไม่ได้ใช้',
  `approved_at` datetime DEFAULT NULL COMMENT 'ไม่ได้ใช้',
  `rejection_reason` text DEFAULT NULL COMMENT 'ไม่ได้ใช้',
  `rejected_by` int(11) DEFAULT NULL COMMENT 'ไม่ได้ใช้',
  `rejected_at` datetime DEFAULT NULL COMMENT 'ไม่ได้ใช้',
  `revision_request` text DEFAULT NULL COMMENT 'ไม่ได้ใช้',
  `revision_requested_by` int(11) DEFAULT NULL COMMENT 'ไม่ได้ใช้',
  `revision_requested_at` datetime DEFAULT NULL COMMENT 'ไม่ได้ใช้',
  `create_at` datetime NOT NULL DEFAULT current_timestamp(),
  `update_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `delete_at` datetime DEFAULT NULL,
  `main_annoucement` int(11) DEFAULT NULL,
  `reward_announcement` int(11) DEFAULT NULL,
  `author_name_list` text DEFAULT NULL,
  `signature` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางเก็บรายละเอียดการขอรับเงินรางวัลผลงานวิชาการ พร้อมข้อมูลเพิ่มเติม';

--
-- Dumping data for table `publication_reward_details`
--

INSERT INTO `publication_reward_details` (`detail_id`, `submission_id`, `paper_title`, `journal_name`, `publication_date`, `publication_type`, `quartile`, `impact_factor`, `doi`, `url`, `page_numbers`, `volume_issue`, `indexing`, `reward_amount`, `reward_approve_amount`, `revision_fee`, `revision_fee_approve_amount`, `publication_fee`, `publication_fee_approve_amount`, `external_funding_amount`, `total_amount`, `total_approve_amount`, `announce_reference_number`, `author_count`, `author_type`, `has_university_funding`, `funding_references`, `university_rankings`, `approved_amount`, `approval_comment`, `approved_by`, `approved_at`, `rejection_reason`, `rejected_by`, `rejected_at`, `revision_request`, `revision_requested_by`, `revision_requested_at`, `create_at`, `update_at`, `delete_at`, `main_annoucement`, `reward_announcement`, `author_name_list`, `signature`) VALUES
(96, 10001, '', '\"Automated classification in turtles genus malayemys using ensemble multiview image based on improved yolov8 with cnn\r\n', '2025-10-01', 'journal', 'T10', NULL, NULL, NULL, NULL, NULL, NULL, 45000.00, 45000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 45000.00, 45000.00, NULL, 1, 'coauthor', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 08:40:51', '2025-10-04 09:12:15', NULL, NULL, NULL, NULL, NULL),
(97, 139, 'Scalable timed-automata models for traffic light control systems: challenges and solutions in formal verification', 'Scalable timed-automata models for traffic light control systems: challenges and solutions in formal verification', '2024-12-31', 'journal', 'T10', 0.000, '10.10.16', 'test.artical.url', '123-234', 'Vol.1', 'Web of Science, TCI', 45000.00, 0.00, 0.00, 0.00, 19898.00, 0.00, 0.00, 64898.00, 0.00, '', 1, 'corresponding_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 09:05:41', '2025-10-04 09:05:41', NULL, NULL, NULL, 'Author1 Author2', 'Chanon'),
(101, 10002, 'A Novel Congestion Control Scheme Using Fuzzy Logic Systems to Enhance the Path Selection Criteria in Routing Protocols for Low-Power and Lossy Networks on the Internet of Things\nระดับบทความ Q1 \nปีที่ตีพิมพ์ 2024', 'IEEE ACCESS', '2025-01-01', 'journal', 'Q1', NULL, NULL, NULL, NULL, NULL, NULL, 40000.00, 40000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 40000.00, 40000.00, NULL, 1, 'coauthor', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 21:31:52', '2025-10-04 21:47:54', NULL, NULL, NULL, NULL, NULL),
(102, 10003, 'Research on Hybrid Architecture Neural Networks for Time Series Prediction\nระดับบทความ Q1 (ลำดับ 10% แรก)\nปีที่ตีพิมพ์ 2025', 'IEEE ACCESS', '2025-01-01', 'journal', 'Q1', NULL, NULL, NULL, NULL, NULL, NULL, 45000.00, 45000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 45000.00, 45000.00, NULL, 1, 'coauthor', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 21:33:05', '2025-10-04 21:47:54', NULL, NULL, NULL, NULL, NULL),
(103, 10004, 'AEMS: Adaptive Ensemble GNNs for Multibehavior Stream Recommendation\nระดับบทความ Q1 (ลำดับ 10% แรก)\nปีที่ตีพิมพ์ 2025', 'IEEE ACCESS', '2025-01-01', 'journal', 'Q1', NULL, NULL, NULL, NULL, NULL, NULL, 45000.00, 45000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 45000.00, 45000.00, NULL, 1, 'coauthor', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 21:33:15', '2025-10-04 21:47:54', NULL, NULL, NULL, NULL, NULL),
(104, 10005, 'FLSec-RPL: a fuzzy logic-based intrusion detection scheme for securing RPL-based IoT networks against DIO neighbor suppression attacks\nระดับบทความ Q1 \nปีที่ตีพิมพ์ 2024', 'IEEE ACCESS', '2025-01-01', 'journal', 'Q1', NULL, NULL, NULL, NULL, NULL, NULL, 40000.00, 40000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 40000.00, 40000.00, NULL, 1, 'coauthor', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 21:33:22', '2025-10-04 21:47:54', NULL, NULL, NULL, NULL, NULL),
(105, 10006, 'CTGAN-ENN: a tabular GAN-based hybrid sampling method for imbalanced and overlapped data in customer churn prediction\nระดับบทความ Q1 (ลำดับ 5% แรก)\nปีที่ตีพิมพ์ 2024', 'IEEE ACCESS', '2025-01-01', 'journal', 'Q1', NULL, NULL, NULL, NULL, NULL, NULL, 50000.00, 50000.00, 0.00, 0.00, 20279.00, 20279.00, 0.00, 70279.00, 70279.00, NULL, 1, 'coauthor', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 21:33:30', '2025-10-04 21:47:54', NULL, NULL, NULL, NULL, NULL),
(106, 10007, 'Optimized customer churn prediction using tabular generative adversarial network (gan)-based hybrid sampling method and cost-sensitive learning\nระดับบทความ Q1 \nปีที่ตีพิมพ์ 2024', 'IEEE ACCESS', '2025-01-01', 'journal', 'Q1', NULL, NULL, NULL, NULL, NULL, NULL, 40000.00, 40000.00, 0.00, 0.00, 27440.00, 27440.00, 0.00, 67440.00, 67440.00, NULL, 1, 'coauthor', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 21:33:35', '2025-10-04 21:47:54', NULL, NULL, NULL, NULL, NULL),
(107, 10008, 'MediGuard: A Survey on Security Attacks in Blockchain-IoT Ecosystems for e-Healthcare Applications\nCorrespaoding Author \nระดับบทความ Q1\nปีที่ตีพิมพ์ 2025', 'IEEE ACCESS', '2025-01-01', 'journal', 'Q1', NULL, NULL, NULL, NULL, NULL, NULL, 40000.00, 40000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 40000.00, 40000.00, NULL, 1, 'coauthor', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 21:33:40', '2025-10-04 21:47:54', NULL, NULL, NULL, NULL, NULL),
(108, 10009, 'Skin cancer segmentation and classification by implementing a hybrid FrCN-(U-NeT) technique with machine learning\nCorrespaoding Author \nระดับบทความ Q1\nปีที่ตีพิมพ์ 2025', 'IEEE ACCESS', '2025-01-01', 'journal', 'Q1', NULL, NULL, NULL, NULL, NULL, NULL, 40000.00, 40000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 40000.00, 40000.00, NULL, 1, 'coauthor', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 21:33:45', '2025-10-04 21:47:54', NULL, NULL, NULL, NULL, NULL),
(109, 10010, 'Machine Learning-Based Routing Protocol in Flying Ad Hoc Networks: A Review \nCorrespaoding Author \nระดับบทความ Q1\nปีที่ตีพิมพ์ 2025', 'IEEE ACCESS', '2025-01-01', 'journal', 'Q1', NULL, NULL, NULL, NULL, NULL, NULL, 40000.00, 40000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 40000.00, 40000.00, NULL, 1, 'coauthor', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 21:33:50', '2025-10-04 21:47:54', NULL, NULL, NULL, NULL, NULL),
(110, 10011, 'N-Beats architecture for explainable forecasting of multi-dimensional poultry data\nCorrespaoding Author \nระดับบทความ Q1\nปีที่ตีพิมพ์ 2025', 'IEEE ACCESS', '2025-01-01', 'journal', 'Q1', NULL, NULL, NULL, NULL, NULL, NULL, 40000.00, 40000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 40000.00, 40000.00, NULL, 1, 'coauthor', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 21:33:55', '2025-10-04 21:47:54', NULL, NULL, NULL, NULL, NULL),
(111, 10012, 'Enhanced human motion detection with hybrid RDA-WOA-based RNN and multiple hypothesis tracking for occlusion handling \nCorrespaoding Author \nระดับบทความ Q1\nปีที่ตีพิมพ์ 2024', 'IEEE ACCESS', '2025-01-01', 'journal', 'Q1', NULL, NULL, NULL, NULL, NULL, NULL, 40000.00, 40000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 40000.00, 40000.00, NULL, 1, 'coauthor', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 21:34:00', '2025-10-04 21:47:54', NULL, NULL, NULL, NULL, NULL),
(112, 10013, 'Surface Deformation Monitoring and Forecasting of Sinabung Volcano Using Interferometry Synthetic\nAperture Radar and Forest-based Algorithm\nระดับบทความ Q1 (ลำดับ 10% แรก)\nปีที่ตีพิมพ์ 2024', 'IEEE ACCESS', '2025-01-01', 'journal', 'Q1', NULL, NULL, NULL, NULL, NULL, NULL, 45000.00, 45000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 45000.00, 45000.00, NULL, 1, 'coauthor', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 21:34:05', '2025-10-04 21:47:54', NULL, NULL, NULL, NULL, NULL),
(113, 10014, 'Multi-Temporal InSAR Analysis for Monitoring the Ground Deformation of Mount Sinabung\nระดับบทความ Q3\nปีที่ตีพิมพ์ 2025', 'IEEE ACCESS', '2025-01-01', 'journal', 'Q1', NULL, NULL, NULL, NULL, NULL, NULL, 20000.00, 20000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 20000.00, 20000.00, NULL, 1, 'coauthor', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 21:34:13', '2025-10-04 21:47:54', NULL, NULL, NULL, NULL, NULL),
(114, 10015, 'MULTI-CLASS TEXT CLASSIFICATION ON KHMER NEWS ARTICLES USING DEEP LEARNING MODELS WITH OPTIMAL HYPERPARAMETERS\nระดับบทความ Q4\nปีที่ตีพิมพ์ 2024', 'IEEE ACCESS', '2025-01-01', 'journal', 'Q1', NULL, NULL, NULL, NULL, NULL, NULL, 10000.00, 10000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 10000.00, 10000.00, NULL, 1, 'coauthor', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 21:34:19', '2025-10-04 21:47:54', NULL, NULL, NULL, NULL, NULL),
(115, 10016, 'Service priority classification using machine learning\nระดับบทความ Q4\nปีที่ตีพิมพ์ 2024', 'IEEE ACCESS', '2025-01-01', 'journal', 'Q1', NULL, NULL, NULL, NULL, NULL, NULL, 10000.00, 10000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 10000.00, 10000.00, NULL, 1, 'coauthor', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 21:34:24', '2025-10-04 21:47:54', NULL, NULL, NULL, NULL, NULL),
(116, 10017, 'BiGCAN: A novel SRS-based bidirectional graph Convolution Attention Network for dynamic user preference and next-item recommendation\nระดับบทความ Q1 (ลำดับ 5% แรก)\nปีที่ตีพิมพ์ 2025', 'IEEE ACCESS', '2025-01-01', 'journal', 'Q1', NULL, NULL, NULL, NULL, NULL, NULL, 50000.00, 50000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 50000.00, 50000.00, NULL, 1, 'coauthor', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 21:34:28', '2025-10-04 21:47:54', NULL, NULL, NULL, NULL, NULL),
(117, 10018, 'Attribute reduction with fuzzy divergence-based weighted neighborhood rough sets\nระดับบทความ Q1 (ลำดับ 10% แรก)\nปีที่ตีพิมพ์ 2024', 'IEEE ACCESS', '2025-01-01', 'journal', 'Q1', NULL, NULL, NULL, NULL, NULL, NULL, 45000.00, 45000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 45000.00, 45000.00, NULL, 1, 'coauthor', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 21:34:34', '2025-10-04 21:47:54', NULL, NULL, NULL, NULL, NULL),
(118, 10019, 'BiHGCA: A Novel SRS-Based Bidirectional Hyperbolic Graph Capsule Co-Attention Network for User Preference Drift\nระดับบทความ Q1 (ลำดับ 10% แรก)\nปีที่ตีพิมพ์ 2024', 'IEEE ACCESS', '2025-01-01', 'journal', 'Q1', NULL, NULL, NULL, NULL, NULL, NULL, 45000.00, 45000.00, 0.00, 0.00, 3859.00, 3859.00, 0.00, 48859.00, 48859.00, NULL, 1, 'coauthor', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 21:34:38', '2025-10-04 21:47:54', NULL, NULL, NULL, NULL, NULL),
(119, 10020, 'BiLSTCAN: A Novel SRS-Based Bidirectional Long Short-Term Capsule Attention Network for Dynamic User Preference and Next-Item Recommendation\nระดับบทความ Q1 (ลำดับ 10% แรก)\nปีที่ตีพิมพ์ 2024', 'IEEE ACCESS', '2025-01-01', 'journal', 'Q1', NULL, NULL, NULL, NULL, NULL, NULL, 45000.00, 45000.00, 0.00, 0.00, 7107.00, 7107.00, 0.00, 52107.00, 52107.00, NULL, 1, 'coauthor', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 21:34:42', '2025-10-04 21:47:54', NULL, NULL, NULL, NULL, NULL),
(120, 10021, 'Secrecy Performance Analysis and Optimization for UAV-Relay-Enabled WPT and Cooperative NOMA MEC in IoT Networks\nระดับบทความ Q1 (ลำดับ 10% แรก)\nปีที่ตีพิมพ์ 2023', 'IEEE ACCESS', '2025-01-01', 'journal', 'Q1', NULL, NULL, NULL, NULL, NULL, NULL, 45000.00, 45000.00, 0.00, 0.00, 31570.00, 31570.00, 0.00, 76570.00, 76570.00, NULL, 1, 'coauthor', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 21:34:47', '2025-10-04 21:47:54', NULL, NULL, NULL, NULL, NULL),
(121, 10022, 'A Novel Transceiver and an Asynchronous Mode for the Hybrid Multiple-Access HetNet Architecture\nระดับบทความ Q1 (ลำดับ 10% แรก)\nปีที่ตีพิมพ์ 2023', 'IEEE ACCESS', '2025-01-01', 'journal', 'Q1', NULL, NULL, NULL, NULL, NULL, NULL, 45000.00, 45000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 45000.00, 45000.00, NULL, 1, 'coauthor', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 21:34:53', '2025-10-04 21:47:54', NULL, NULL, NULL, NULL, NULL),
(122, 10023, 'Reliable data transmission for a VANET-IoIT architecture: A DNN approach\nระดับบทความ Q1 (ลำดับ 5% แรก)\nปีที่ตีพิมพ์ 2024', 'IEEE ACCESS', '2025-01-01', 'journal', 'Q1', NULL, NULL, NULL, NULL, NULL, NULL, 50000.00, 50000.00, 0.00, 0.00, 11891.00, 11891.00, 0.00, 61891.00, 61891.00, NULL, 1, 'coauthor', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 21:34:57', '2025-10-04 21:47:54', NULL, NULL, NULL, NULL, NULL),
(123, 10024, 'An enhanced node segmentation and distance estimation scheme with a reduced search space boundary and improved PSO for obstacle-aware wireless sensor network localization', 'IEEE ACCESS', '2025-01-01', 'journal', 'Q1', NULL, NULL, NULL, NULL, NULL, NULL, 50000.00, 50000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 50000.00, 50000.00, NULL, 1, 'coauthor', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 21:35:13', '2025-10-04 21:47:54', NULL, NULL, NULL, NULL, NULL),
(124, 10025, 'Quantized Deep Learning Channel Model and Estimation for RIS-gMIMO Communication\nระดับบทความ Q1 (ลำดับ 10% แรก)\nปีที่ตีพิมพ์ 2024', 'IEEE ACCESS', '2025-01-01', 'journal', 'Q1', NULL, NULL, NULL, NULL, NULL, NULL, 45000.00, 45000.00, 0.00, 0.00, 26507.00, 26507.00, 0.00, 71507.00, 71507.00, NULL, 1, 'coauthor', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 21:35:19', '2025-10-04 21:47:54', NULL, NULL, NULL, NULL, NULL),
(125, 10026, 'Scalable timed-automata models for traffic light control systems: challenges and solutions in formal verification\nระดับวารสาร Q1 (ลำดับ 10% แรก)\nปีที่ตีพิมพ์ 2025', 'IEEE ACCESS', '2025-01-01', 'journal', 'Q1', NULL, NULL, NULL, NULL, NULL, NULL, 45000.00, 45000.00, 0.00, 0.00, 19898.00, 19898.00, 0.00, 64898.00, 64898.00, NULL, 1, 'coauthor', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 21:35:26', '2025-10-04 21:47:54', NULL, NULL, NULL, NULL, NULL),
(126, 10027, 'Toward ai-augmented formal verification: a preliminary investigation of engru and its challenges \nระดับวารสาร Q1 (ลำดับ 10% แรก)\nปีที่ตีพิมพ์ 2025', 'IEEE ACCESS', '2025-01-01', 'journal', 'Q1', NULL, NULL, NULL, NULL, NULL, NULL, 45000.00, 45000.00, 0.00, 0.00, 19908.00, 19908.00, 0.00, 64908.00, 64908.00, NULL, 1, 'coauthor', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 21:35:31', '2025-10-04 21:47:54', NULL, NULL, NULL, NULL, NULL),
(127, 10028, 'A Novel Congestion Control Scheme Using Fuzzy Logic Systems to Enhance the Path Selection Criteria in Routing Protocols for Low-Power and Lossy Networks on the Internet of Things\nCorrespaoding Author ตีพิมพ์ปี 2024\nระดับบทความ Q1 ', 'IEEE ACCESS', '2025-01-01', 'journal', 'Q1', NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, 0.00, 0.00, 16888.00, 16888.00, 0.00, 16888.00, 16888.00, NULL, 1, 'coauthor', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 21:35:39', '2025-10-04 21:47:54', NULL, NULL, NULL, NULL, NULL),
(128, 10029, 'Test Article', 'Test Journal', '2025-06-30', 'journal', 'T5', 0.000, '10.1016', 'test.url', '123-145', 'Vol.10', 'Web of Science, TCI', 50000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 50000.00, 0.00, '', 1, 'corresponding_author', 'yes', 'FA-101', 'QS', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-05 02:20:18', '2025-10-05 02:20:18', NULL, NULL, NULL, 'A B', 'somchai jaidee'),
(129, 10030, 'Test Article', 'Test Journal', '2024-12-31', 'journal', 'T5', 0.000, '10.1016', 'test.url', '123-145', 'Vol.10', 'Web of Science', 50000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 50000.00, 0.00, '', 1, 'first_author', 'yes', 'FA-101', 'QS', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-08 02:30:34', '2025-10-08 02:30:34', NULL, NULL, NULL, 'AB', 'somchai jaidee'),
(130, 10031, 'Test Article', 'Test Journal', '2024-12-31', 'journal', 'T10', 0.000, '10.1016', 'test.url', '123-145', 'Vol.10', '', 45000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 45000.00, 0.00, '', 1, 'first_author', 'no', NULL, 'QS', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-08 03:17:13', '2025-10-08 03:17:13', NULL, NULL, NULL, 'AB', 'somchai jaidee');

-- --------------------------------------------------------

--
-- Table structure for table `publication_reward_external_funds`
--

CREATE TABLE `publication_reward_external_funds` (
  `external_fund_id` int(11) NOT NULL,
  `detail_id` int(11) NOT NULL,
  `submission_id` int(11) NOT NULL,
  `fund_name` varchar(255) DEFAULT NULL,
  `amount` decimal(15,2) DEFAULT 0.00,
  `document_id` int(11) DEFAULT NULL,
  `file_id` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='รายละเอียดทุนภายนอกและไฟล์ประกอบของคำร้องขอรางวัลตีพิมพ์';

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `publication_reward_rates`
--

INSERT INTO `publication_reward_rates` (`rate_id`, `year`, `author_status`, `journal_quartile`, `reward_amount`, `is_active`, `create_at`, `update_at`) VALUES
(1, '2568', 'first_author', 'Q1', 40000.00, 1, '2025-07-02 09:35:58', '2025-08-08 16:07:17'),
(2, '2568', 'first_author', 'Q2', 30000.00, 1, '2025-07-02 09:35:58', '2025-08-04 15:33:28'),
(3, '2568', 'first_author', 'Q3', 20000.00, 1, '2025-07-02 09:35:58', '2025-08-04 15:33:29'),
(4, '2568', 'first_author', 'Q4', 10000.00, 1, '2025-07-02 09:35:58', '2025-08-04 15:33:30'),
(5, '2568', 'corresponding_author', 'Q1', 40000.00, 1, '2025-07-02 09:35:58', '2025-08-04 15:33:31'),
(6, '2568', 'corresponding_author', 'Q2', 30000.00, 1, '2025-07-02 09:35:58', '2025-08-04 15:33:31'),
(7, '2568', 'corresponding_author', 'Q3', 20000.00, 1, '2025-07-02 09:35:58', '2025-08-04 15:33:32'),
(8, '2568', 'corresponding_author', 'Q4', 10000.00, 1, '2025-07-02 09:35:58', '2025-08-04 15:33:33'),
(9, '2568', 'first_author', 'T5', 50000.00, 1, '2025-08-04 12:17:36', '2025-08-04 15:33:33'),
(10, '2568', 'first_author', 'T10', 45000.00, 1, '2025-08-04 12:18:14', '2025-08-04 15:33:34'),
(11, '2568', 'first_author', 'TCI', 5000.00, 1, '2025-08-04 12:18:24', '2025-08-04 15:33:35'),
(12, '2568', 'corresponding_author', 'T5', 50000.00, 1, '2025-08-04 12:19:45', '2025-08-04 15:33:36'),
(13, '2568', 'corresponding_author', 'T10', 45000.00, 1, '2025-08-04 12:19:54', '2025-08-04 15:33:37'),
(14, '2568', 'corresponding_author', 'TCI', 5000.00, 1, '2025-08-04 12:20:04', '2025-08-04 15:33:38'),
(15, '2569', 'first_author', 'Q1', 40000.00, 1, '2025-08-08 02:50:39', '2025-08-08 02:50:39'),
(16, '2569', 'corresponding_author', 'Q2', 30000.00, 1, '2025-08-08 02:50:40', '2025-08-08 02:50:40'),
(17, '2569', 'first_author', 'Q3', 20000.00, 1, '2025-08-08 02:50:40', '2025-08-08 02:50:40'),
(18, '2569', 'first_author', 'Q4', 10000.00, 1, '2025-08-08 02:50:40', '2025-08-08 02:50:40'),
(19, '2569', 'corresponding_author', 'Q3', 20000.00, 1, '2025-08-08 02:50:40', '2025-08-08 02:50:40'),
(20, '2569', 'first_author', 'Q2', 30000.00, 1, '2025-08-08 02:50:40', '2025-08-08 02:50:40'),
(21, '2569', 'corresponding_author', 'Q1', 40000.00, 1, '2025-08-08 02:50:40', '2025-08-08 02:50:40'),
(22, '2569', 'corresponding_author', 'Q4', 10000.00, 1, '2025-08-08 02:50:40', '2025-08-08 02:50:40'),
(23, '2569', 'first_author', 'T5', 50000.00, 1, '2025-08-08 02:50:40', '2025-08-08 17:14:51'),
(24, '2569', 'first_author', 'T10', 45000.00, 1, '2025-08-08 02:50:40', '2025-08-08 02:50:40'),
(25, '2569', 'corresponding_author', 'T5', 50000.00, 1, '2025-08-08 02:50:40', '2025-08-08 21:02:41'),
(26, '2569', 'corresponding_author', 'T10', 45000.00, 1, '2025-08-08 02:50:40', '2025-08-08 02:50:40'),
(27, '2569', 'first_author', 'TCI', 5000.00, 1, '2025-08-08 02:50:40', '2025-08-08 02:50:40'),
(28, '2569', 'corresponding_author', 'TCI', 5000.00, 1, '2025-08-08 02:50:40', '2025-08-08 02:50:40');

-- --------------------------------------------------------

--
-- Table structure for table `research_fund_admin_events`
--

CREATE TABLE `research_fund_admin_events` (
  `event_id` int(11) NOT NULL,
  `submission_id` int(11) NOT NULL,
  `status_after_id` int(11) DEFAULT NULL,
  `amount` decimal(15,2) DEFAULT NULL,
  `comment` text DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `research_fund_event_files`
--

CREATE TABLE `research_fund_event_files` (
  `event_file_id` int(11) NOT NULL,
  `event_id` int(11) NOT NULL,
  `file_id` int(11) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
(1, '2568', 'T5', 50000.00, 'วงเงินสูงสุดสำหรับ T5 วารสาร', 1, '2025-08-04 15:33:53', '2025-08-08 12:16:38', NULL),
(2, '2568', 'T10', 40000.00, 'วงเงินสูงสุดสำหรับ T10 วารสาร', 1, '2025-08-04 15:33:53', '2025-08-04 15:35:55', NULL),
(3, '2568', 'Q1', 30000.00, 'วงเงินสูงสุดสำหรับ Q1 วารสาร', 1, '2025-08-04 15:33:53', '2025-08-04 15:37:32', NULL),
(4, '2568', 'Q2', 20000.00, 'วงเงินสูงสุดสำหรับ Q2 วารสาร', 0, '2025-08-04 15:33:53', '2025-08-08 15:55:07', NULL),
(5, '2568', 'Q3', 15000.00, 'วงเงินสูงสุดสำหรับ Q3 วารสาร', 0, '2025-08-04 15:33:53', '2025-08-04 15:37:44', NULL),
(6, '2568', 'Q4', 10000.00, 'วงเงินสูงสุดสำหรับ Q4 วารสาร', 0, '2025-08-04 15:33:53', '2025-08-04 15:37:46', NULL),
(7, '2568', 'TCI', 5000.00, 'วงเงินสูงสุดสำหรับ TCI วารสาร', 0, '2025-08-04 15:33:53', '2025-08-04 15:37:49', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `role_id` int(11) NOT NULL,
  `role` varchar(255) DEFAULT NULL,
  `create_at` datetime DEFAULT current_timestamp(),
  `update_at` datetime DEFAULT NULL ON UPDATE current_timestamp(),
  `delete_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`role_id`, `role`, `create_at`, `update_at`, `delete_at`) VALUES
(1, 'teacher', '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL),
(2, 'staff', '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL),
(3, 'admin', '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL),
(4, 'dept_head', '2025-09-21 19:03:02', '2025-09-21 19:03:05', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `scholar_import_runs`
--

CREATE TABLE `scholar_import_runs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `trigger_source` varchar(64) NOT NULL,
  `status` enum('running','success','failed') NOT NULL DEFAULT 'running',
  `error_message` text DEFAULT NULL,
  `started_at` datetime NOT NULL DEFAULT current_timestamp(),
  `finished_at` datetime DEFAULT NULL,
  `users_processed` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `users_with_errors` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `publications_fetched` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `publications_created` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `publications_updated` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `publications_failed` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `scholar_import_runs`
--

INSERT INTO `scholar_import_runs` (`id`, `trigger_source`, `status`, `error_message`, `started_at`, `finished_at`, `users_processed`, `users_with_errors`, `publications_fetched`, `publications_created`, `publications_updated`, `publications_failed`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 'manual-run', 'running', NULL, '2025-09-19 13:21:55', NULL, 0, 0, 0, 0, 0, 0, '2025-09-19 13:21:55', '2025-09-19 13:21:55', NULL),
(2, 'admin_api', 'success', NULL, '2025-09-19 13:36:24', '2025-09-19 13:37:11', 1, 0, 18, 0, 18, 0, '2025-09-19 13:36:24', '2025-09-19 13:37:11', NULL),
(3, 'admin_api', 'success', NULL, '2025-09-19 14:40:02', '2025-09-19 14:40:50', 1, 0, 18, 18, 0, 0, '2025-09-19 14:40:02', '2025-09-19 14:40:50', NULL),
(4, 'timer', 'success', NULL, '2025-09-20 18:33:53', '2025-09-20 18:34:40', 1, 0, 18, 18, 0, 0, '2025-09-20 18:33:53', '2025-09-20 18:34:40', NULL),
(5, 'timer', 'success', NULL, '2025-09-21 00:00:12', '2025-09-21 00:00:59', 1, 0, 18, 18, 0, 0, '2025-09-21 00:00:12', '2025-09-21 00:00:59', NULL),
(6, 'timer', 'success', NULL, '2025-09-22 00:00:03', '2025-09-22 00:00:49', 1, 0, 18, 0, 18, 0, '2025-09-22 00:00:03', '2025-09-22 00:00:49', NULL),
(7, 'timer', 'success', NULL, '2025-09-23 00:00:04', '2025-09-23 00:01:31', 2, 0, 18, 0, 18, 0, '2025-09-23 00:00:04', '2025-09-23 00:01:31', NULL),
(8, 'timer', 'success', NULL, '2025-09-24 00:00:13', '2025-09-24 00:01:44', 2, 0, 18, 0, 18, 0, '2025-09-24 00:00:13', '2025-09-24 00:01:44', NULL),
(9, 'timer', 'success', NULL, '2025-09-25 00:00:08', '2025-09-25 00:01:36', 2, 0, 18, 0, 18, 0, '2025-09-25 00:00:08', '2025-09-25 00:01:36', NULL),
(10, 'timer', 'success', NULL, '2025-09-26 00:00:19', '2025-09-26 00:01:50', 2, 0, 18, 0, 18, 0, '2025-09-26 00:00:19', '2025-09-26 00:01:50', NULL),
(11, 'timer', 'success', NULL, '2025-09-27 00:00:03', '2025-09-27 00:01:35', 2, 0, 18, 0, 18, 0, '2025-09-27 00:00:03', '2025-09-27 00:01:35', NULL),
(12, 'timer', 'success', NULL, '2025-09-28 00:00:08', '2025-09-28 00:01:36', 2, 0, 18, 0, 18, 0, '2025-09-28 00:00:08', '2025-09-28 00:01:36', NULL),
(13, 'timer', 'success', NULL, '2025-09-29 00:00:13', '2025-09-29 00:01:44', 2, 0, 18, 0, 18, 0, '2025-09-29 00:00:13', '2025-09-29 00:01:44', NULL),
(14, 'timer', 'success', NULL, '2025-09-30 00:00:19', '2025-09-30 00:01:48', 2, 0, 18, 0, 18, 0, '2025-09-30 00:00:19', '2025-09-30 00:01:48', NULL),
(15, 'timer', 'success', NULL, '2025-10-01 00:00:00', '2025-10-01 00:01:29', 2, 0, 18, 0, 18, 0, '2025-10-01 00:00:00', '2025-10-01 00:01:29', NULL),
(16, 'timer', 'success', NULL, '2025-10-02 00:00:08', '2025-10-02 00:01:36', 2, 0, 18, 0, 18, 0, '2025-10-02 00:00:08', '2025-10-02 00:01:36', NULL),
(17, 'timer', 'success', NULL, '2025-10-03 00:00:00', '2025-10-03 00:01:27', 2, 0, 18, 0, 18, 0, '2025-10-03 00:00:00', '2025-10-03 00:01:27', NULL),
(18, 'admin_api', 'success', NULL, '2025-10-04 01:09:16', '2025-10-04 01:09:17', 0, 3, 0, 0, 0, 0, '2025-10-04 01:09:16', '2025-10-04 01:09:17', NULL),
(19, 'admin_api', 'success', NULL, '2025-10-04 01:26:46', '2025-10-04 01:26:47', 0, 3, 0, 0, 0, 0, '2025-10-04 01:26:46', '2025-10-04 01:26:47', NULL),
(20, 'admin_api', 'success', NULL, '2025-10-04 02:04:28', '2025-10-04 02:06:47', 3, 0, 36, 0, 18, 18, '2025-10-04 02:04:28', '2025-10-04 02:06:47', NULL),
(21, 'admin_api', 'success', NULL, '2025-10-05 23:53:03', '2025-10-05 23:53:49', 1, 0, 18, 0, 18, 0, '2025-10-05 23:53:03', '2025-10-05 23:53:49', NULL),
(22, 'admin_api', 'success', NULL, '2025-10-07 02:03:49', '2025-10-07 02:04:37', 1, 0, 18, 18, 0, 0, '2025-10-07 02:03:49', '2025-10-07 02:04:37', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `subcategory_budgets`
--

CREATE TABLE `subcategory_budgets` (
  `subcategory_budget_id` int(11) NOT NULL,
  `subcategory_id` int(11) NOT NULL,
  `record_scope` enum('overall','rule') NOT NULL DEFAULT 'rule',
  `allocated_amount` decimal(15,2) DEFAULT NULL COMMENT 'จำนวนทุนต่อไป',
  `remaining_budget` decimal(15,2) DEFAULT NULL,
  `used_amount` decimal(15,2) DEFAULT NULL,
  `max_amount_per_grant` decimal(15,2) DEFAULT NULL,
  `max_amount_per_year` decimal(15,2) DEFAULT NULL COMMENT 'Per-user per-year cap; set on OVERALL only',
  `max_grants` int(11) DEFAULT NULL,
  `remaining_grant` int(11) DEFAULT NULL,
  `level` enum('ต้น','กลาง','สูง') DEFAULT NULL,
  `status` enum('active','disable') DEFAULT NULL,
  `fund_description` text DEFAULT NULL,
  `comment` text DEFAULT NULL,
  `create_at` datetime DEFAULT current_timestamp(),
  `update_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `delete_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `subcategory_budgets`
--

INSERT INTO `subcategory_budgets` (`subcategory_budget_id`, `subcategory_id`, `record_scope`, `allocated_amount`, `remaining_budget`, `used_amount`, `max_amount_per_grant`, `max_amount_per_year`, `max_grants`, `remaining_grant`, `level`, `status`, `fund_description`, `comment`, `create_at`, `update_at`, `delete_at`) VALUES
(38, 19, 'overall', NULL, NULL, NULL, 200000.00, 200000.00, NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(39, 20, 'overall', NULL, NULL, NULL, 25000.00, 25000.00, NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(40, 21, 'overall', NULL, NULL, NULL, 20000.00, 80000.00, NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(41, 22, 'overall', NULL, NULL, NULL, 10000.00, 10000.00, NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(42, 23, 'overall', NULL, NULL, NULL, NULL, 500000.00, 1, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(43, 23, 'rule', NULL, NULL, NULL, 100000.00, NULL, NULL, NULL, NULL, 'active', '(1) ชั้นต้น', 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(44, 23, 'rule', NULL, NULL, NULL, 150000.00, NULL, NULL, NULL, NULL, 'active', '(2) ชั้นกลาง', 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(45, 23, 'rule', NULL, NULL, NULL, 250000.00, NULL, NULL, NULL, NULL, 'active', '(3) ชั้นสูง', 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(46, 24, 'overall', NULL, NULL, NULL, NULL, 500000.00, 1, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(47, 24, 'rule', NULL, NULL, NULL, 100000.00, NULL, NULL, NULL, NULL, 'active', '(1) ชั้นต้น', 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(48, 24, 'rule', NULL, NULL, NULL, 150000.00, NULL, NULL, NULL, NULL, 'active', '(2) ชั้นกลาง', 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(49, 24, 'rule', NULL, NULL, NULL, 250000.00, NULL, NULL, NULL, NULL, 'active', '(3) ชั้นสูง', 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(50, 25, 'overall', NULL, NULL, NULL, 250000.00, 250000.00, NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(51, 26, 'overall', NULL, NULL, NULL, 400000.00, 800000.00, NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(52, 27, 'overall', NULL, NULL, NULL, 100000.00, 300000.00, 1, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(53, 28, 'overall', NULL, NULL, NULL, NULL, 1000000.00, NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(54, 28, 'rule', NULL, NULL, NULL, 200000.00, NULL, NULL, NULL, NULL, 'active', '(1) ชั้นต้น', 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(55, 28, 'rule', NULL, NULL, NULL, 300000.00, NULL, NULL, NULL, NULL, 'active', '(2) ชั้นกลาง', 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(56, 28, 'rule', NULL, NULL, NULL, 500000.00, NULL, NULL, NULL, NULL, 'active', '(3) ชั้นสูง', 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(57, 29, 'overall', NULL, NULL, NULL, 100000.00, 100000.00, NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(58, 30, 'overall', NULL, NULL, NULL, NULL, 500000.00, 5, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(59, 30, 'rule', NULL, NULL, NULL, 50000.00, NULL, NULL, NULL, NULL, 'active', '(1) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 1 (ลำดับ 5 % แรก) ที่สามารถสืบค้นได้ในฐานข้อมูล \r\nWOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(60, 30, 'rule', NULL, NULL, NULL, 45000.00, NULL, NULL, NULL, NULL, 'active', '(2) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 1 (ลำดับ 10 % แรก) ที่สามารถสืบค้นได้ในฐานข้อมูล\r\nWOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(61, 30, 'rule', NULL, NULL, NULL, 40000.00, NULL, NULL, NULL, NULL, 'active', '(3) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 1 ที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(62, 30, 'rule', NULL, NULL, NULL, 30000.00, NULL, NULL, NULL, NULL, 'active', '(4) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 2 \r\nที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(63, 30, 'rule', NULL, NULL, NULL, 20000.00, NULL, NULL, NULL, NULL, 'active', '(5) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 3 \r\nที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(64, 30, 'rule', NULL, NULL, NULL, 10000.00, NULL, NULL, NULL, NULL, 'active', '(6) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 4 \r\nที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(65, 30, 'rule', NULL, NULL, NULL, 5000.00, NULL, NULL, NULL, NULL, 'active', '(7) บทความตีพิมพ์ในวารสารระดับนานาชาติในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS หรือวารสารที่อยู่ในฐานข้อมูล TCI กลุ่มที่ 1 สาขาวิทยาศาสตร์เทคโนโลยี', 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(66, 31, 'overall', NULL, NULL, NULL, NULL, 500000.00, 5, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(67, 31, 'rule', NULL, NULL, NULL, 50000.00, NULL, NULL, NULL, NULL, 'active', '(1) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 1 (ลำดับ 5 % แรก) ที่สามารถสืบค้นได้ในฐานข้อมูล \r\nWOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(68, 31, 'rule', NULL, NULL, NULL, 45000.00, NULL, NULL, NULL, NULL, 'active', '(2) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 1 (ลำดับ 10 % แรก) ที่สามารถสืบค้นได้ในฐานข้อมูล\r\nWOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(69, 31, 'rule', NULL, NULL, NULL, 40000.00, NULL, NULL, NULL, NULL, 'active', '(3) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 1 ที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(70, 31, 'rule', NULL, NULL, NULL, 30000.00, NULL, NULL, NULL, NULL, 'active', '(4) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 2 \r\nที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(71, 31, 'rule', NULL, NULL, NULL, 20000.00, NULL, NULL, NULL, NULL, 'active', '(5) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 3 \r\nที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(72, 31, 'rule', NULL, NULL, NULL, 10000.00, NULL, NULL, NULL, NULL, 'active', '(6) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 4 \r\nที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(73, 31, 'rule', NULL, NULL, NULL, 5000.00, NULL, NULL, NULL, NULL, 'active', '(7) บทความตีพิมพ์ในวารสารระดับนานาชาติในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS หรือวารสารที่อยู่ในฐานข้อมูล TCI กลุ่มที่ 1 สาขาวิทยาศาสตร์เทคโนโลยี', 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(74, 32, 'overall', NULL, NULL, NULL, NULL, 45000.00, NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(75, 32, 'rule', NULL, NULL, NULL, 20000.00, NULL, NULL, NULL, NULL, 'active', '(1) ระดับ A+', 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(76, 32, 'rule', NULL, NULL, NULL, 15000.00, NULL, NULL, NULL, NULL, 'active', '(2) ระดับ A', 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(77, 32, 'rule', NULL, NULL, NULL, 10000.00, NULL, NULL, NULL, NULL, 'active', '(3) ระดับ B', 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(78, 33, 'overall', NULL, NULL, NULL, NULL, 25000.00, NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(79, 33, 'rule', NULL, NULL, NULL, 15000.00, NULL, NULL, NULL, NULL, 'active', '(1) นำเสนอแบบบรรยาย ระดับนานาชาติ ในต่างประเทศ', 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(80, 33, 'rule', NULL, NULL, NULL, 10000.00, NULL, NULL, NULL, NULL, 'active', '(2) นำเสนอแบบบรรยาย ระดับนานาชาติ ในประเทศ  (รางวัลชนะเลิศ)', 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(81, 34, 'overall', NULL, NULL, NULL, NULL, 100000.00, NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(82, 34, 'rule', NULL, NULL, NULL, 15000.00, NULL, NULL, NULL, NULL, 'active', '(1) ระดับเพชร', 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(83, 34, 'rule', NULL, NULL, NULL, 10000.00, NULL, NULL, NULL, NULL, 'active', '(2) ระดับ ทอง', 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(84, 34, 'rule', NULL, NULL, NULL, 5000.00, NULL, NULL, NULL, NULL, 'active', '(3) ระดับ เงิน', 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(85, 35, 'overall', NULL, NULL, NULL, NULL, 15000.00, NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(86, 35, 'rule', NULL, NULL, NULL, 10000.00, NULL, NULL, NULL, NULL, 'active', '(1) ระดับนานาชาติ (รางวัลชนะเลิศ)', 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(87, 35, 'rule', NULL, NULL, NULL, 5000.00, NULL, NULL, NULL, NULL, 'active', '(2) ระดับชาติ (รางวัลชนะเลิศ)', 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(88, 36, 'overall', NULL, NULL, NULL, 150000.00, 150000.00, NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(89, 37, 'overall', NULL, NULL, NULL, NULL, 150000.00, 5, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(90, 37, 'rule', NULL, NULL, NULL, 35000.00, NULL, NULL, NULL, NULL, 'active', '(1) สิทธิบัตร (Invention patent)', 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(91, 37, 'rule', NULL, NULL, NULL, 15000.00, NULL, NULL, NULL, NULL, 'active', '(2) อนุสิทธิบัตร (Petty patent)', 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(92, 37, 'rule', NULL, NULL, NULL, 3000.00, NULL, NULL, NULL, NULL, 'active', '(3) ลิขสิทธิ์', 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(93, 38, 'overall', NULL, NULL, NULL, NULL, 600000.00, NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(94, 38, 'rule', NULL, NULL, NULL, 50000.00, NULL, NULL, NULL, NULL, 'active', '(1) ควอร์ไทล์ 1 (10% แรก)', 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(95, 38, 'rule', NULL, NULL, NULL, 40000.00, NULL, NULL, NULL, NULL, 'active', '(1) ควอร์ไทล์ 1', 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(96, 38, 'rule', NULL, NULL, NULL, 30000.00, NULL, NULL, NULL, NULL, 'active', '(1) ควอร์ไทล์ 2', 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(97, 39, 'overall', NULL, NULL, NULL, 40000.00, 40000.00, NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-09 01:02:21', '2025-10-09 01:02:21', NULL),
(98, 40, 'overall', 1000000.00, 1000000.00, 0.00, NULL, 500000.00, NULL, NULL, NULL, 'active', NULL, NULL, '2025-10-14 01:58:50', '2025-10-14 01:59:25', NULL),
(99, 40, 'rule', 0.00, 0.00, 0.00, 80000.00, NULL, NULL, NULL, NULL, 'active', '(1) แบบบรรยายและแบบโปสเตอร์ ต่างประเทศ', NULL, '2025-10-14 02:03:02', '2025-10-14 02:03:02', NULL),
(100, 40, 'rule', 0.00, 0.00, 0.00, 30000.00, NULL, NULL, NULL, NULL, 'active', '(2) แบบบรรยายและแบบโปสเตอร์ ระดับนานาชาติในประเทศ', NULL, '2025-10-14 02:03:18', '2025-10-14 02:03:18', NULL),
(101, 40, 'rule', 0.00, 0.00, 0.00, 15000.00, NULL, NULL, NULL, NULL, 'active', '(3) บรรยายและแบบโปสเตอร์ ระดับชาติ', NULL, '2025-10-14 02:03:28', '2025-10-14 02:03:28', NULL);

--
-- Triggers `subcategory_budgets`
--
DELIMITER $$
CREATE TRIGGER `bi_subcat_budget_overall` BEFORE INSERT ON `subcategory_budgets` FOR EACH ROW BEGIN
  IF NEW.record_scope = 'overall' THEN
    IF EXISTS (
      SELECT 1 FROM subcategory_budgets
      WHERE subcategory_id = NEW.subcategory_id AND record_scope = 'overall'
    ) THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Each subcategory can have only one OVERALL row.';
    END IF;
  END IF;

  IF NEW.record_scope = 'rule' THEN
    SET NEW.max_amount_per_year = NULL; -- ปี/คน ต้องเก็บที่ OVERALL เท่านั้น
  END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `bu_subcat_budget_overall` BEFORE UPDATE ON `subcategory_budgets` FOR EACH ROW BEGIN
  IF NEW.record_scope = 'overall'
     AND (OLD.subcategory_id <> NEW.subcategory_id OR OLD.record_scope <> 'overall') THEN
    IF EXISTS (
      SELECT 1 FROM subcategory_budgets
      WHERE subcategory_id = NEW.subcategory_id
        AND record_scope = 'overall'
        AND subcategory_budget_id <> OLD.subcategory_budget_id
    ) THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Each subcategory can have only one OVERALL row.';
    END IF;
  END IF;

  IF NEW.record_scope = 'rule' THEN
    SET NEW.max_amount_per_year = NULL;
  END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `submissions`
--

CREATE TABLE `submissions` (
  `submission_id` int(11) NOT NULL,
  `submission_type` enum('fund_application','publication_reward') NOT NULL,
  `submission_number` varchar(255) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `year_id` int(11) NOT NULL,
  `category_id` int(11) DEFAULT NULL,
  `subcategory_id` int(11) DEFAULT NULL,
  `subcategory_budget_id` int(11) DEFAULT NULL,
  `status_id` int(11) NOT NULL,
  `submitted_at` datetime DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `head_approved_at` datetime DEFAULT NULL,
  `head_rejected_by` int(11) DEFAULT NULL,
  `head_rejected_at` datetime DEFAULT NULL,
  `head_rejection_reason` text DEFAULT NULL,
  `head_comment` text DEFAULT NULL,
  `head_signature` varchar(255) DEFAULT NULL,
  `head_approved_by` int(11) DEFAULT NULL,
  `admin_approved_by` int(11) DEFAULT NULL,
  `admin_approved_at` datetime DEFAULT NULL,
  `admin_rejected_by` int(11) DEFAULT NULL,
  `admin_rejected_at` datetime DEFAULT NULL,
  `admin_rejection_reason` text DEFAULT NULL,
  `admin_comment` text DEFAULT NULL,
  `rejected_by` int(11) DEFAULT NULL,
  `rejected_at` datetime DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL COMMENT 'ไม่ได้ใช้',
  `approved_by` int(11) DEFAULT NULL COMMENT 'ไม่ได้ใช้',
  `completed_at` datetime DEFAULT NULL,
  `closed_at` datetime DEFAULT NULL,
  `comment` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `submissions`
--

INSERT INTO `submissions` (`submission_id`, `submission_type`, `submission_number`, `user_id`, `year_id`, `category_id`, `subcategory_id`, `subcategory_budget_id`, `status_id`, `submitted_at`, `reviewed_at`, `head_approved_at`, `head_rejected_by`, `head_rejected_at`, `head_rejection_reason`, `head_comment`, `head_signature`, `head_approved_by`, `admin_approved_by`, `admin_approved_at`, `admin_rejected_by`, `admin_rejected_at`, `admin_rejection_reason`, `admin_comment`, `rejected_by`, `rejected_at`, `rejection_reason`, `approved_at`, `approved_by`, `completed_at`, `closed_at`, `comment`, `created_at`, `updated_at`, `deleted_at`) VALUES
(139, 'publication_reward', 'PR-25681004-0001', 14, 3, NULL, NULL, NULL, 6, '2025-10-04 09:05:41', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 09:05:01', '2025-10-08 03:43:31', NULL),
(10001, 'publication_reward', 'PR-2568-0001', 1010, 3, 7, NULL, NULL, 2, '2025-10-02 08:35:07', '2025-10-03 08:35:07', '2025-10-03 08:35:07', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 08:38:23', '2025-10-11 22:20:14', NULL),
(10002, 'publication_reward', 'PR-2568-0002', 1025, 3, 7, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 09:06:36', '2025-10-11 22:20:24', NULL),
(10003, 'publication_reward', 'PR-2568-0003', 1004, 3, 7, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 09:06:36', '2025-10-11 22:20:27', NULL),
(10004, 'publication_reward', 'PR-2568-0004', 1004, 3, 7, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 09:06:36', '2025-10-11 22:20:31', NULL),
(10005, 'publication_reward', 'PR-2568-0005', 1025, 3, 7, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 09:06:36', '2025-10-11 22:20:39', NULL),
(10006, 'publication_reward', 'PR-2568-0006', 1012, 3, 7, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 09:06:36', '2025-10-11 22:20:43', NULL),
(10007, 'publication_reward', 'PR-2568-0007', 1012, 3, 7, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 09:06:36', '2025-10-11 22:20:51', NULL),
(10008, 'publication_reward', 'PR-2568-0008', 1032, 3, 7, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 09:06:36', '2025-10-11 22:20:54', NULL),
(10009, 'publication_reward', 'PR-2568-0009', 1032, 3, 7, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 09:06:36', '2025-10-11 22:21:00', NULL),
(10010, 'publication_reward', 'PR-2568-0010', 1032, 3, 7, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 09:06:36', '2025-10-11 22:20:57', NULL),
(10011, 'publication_reward', 'PR-2568-0011', 1032, 3, 7, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 09:06:36', '2025-10-11 22:21:03', NULL),
(10012, 'publication_reward', 'PR-2568-0012', 1032, 3, 7, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 09:06:36', '2025-10-11 22:21:06', NULL),
(10013, 'publication_reward', 'PR-2568-0013', 1021, 3, 7, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 09:06:36', '2025-10-11 22:21:10', NULL),
(10014, 'publication_reward', 'PR-2568-0014', 1021, 3, 7, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 09:06:36', '2025-10-11 22:21:12', NULL),
(10015, 'publication_reward', 'PR-2568-0015', 1002, 3, 7, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 09:06:36', '2025-10-11 22:21:15', NULL),
(10016, 'publication_reward', 'PR-2568-0016', 1002, 3, 7, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 09:06:36', '2025-10-11 22:21:19', NULL),
(10017, 'publication_reward', 'PR-2568-0017', 1028, 3, 7, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 09:06:36', '2025-10-11 22:21:22', NULL),
(10018, 'publication_reward', 'PR-2568-0018', 1028, 3, 7, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 09:06:36', '2025-10-11 22:21:25', NULL),
(10019, 'publication_reward', 'PR-2568-0019', 1028, 3, 7, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 09:06:36', '2025-10-11 22:21:28', NULL),
(10020, 'publication_reward', 'PR-2568-0020', 1028, 3, 7, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 09:06:36', '2025-10-11 22:21:32', NULL),
(10021, 'publication_reward', 'PR-2568-0021', 1018, 3, 7, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 09:06:36', '2025-10-11 22:21:36', NULL),
(10022, 'publication_reward', 'PR-2568-0022', 1018, 3, 7, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 09:06:36', '2025-10-11 22:21:39', NULL),
(10023, 'publication_reward', 'PR-2568-0023', 1018, 3, 7, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 09:06:36', '2025-10-11 22:21:42', NULL),
(10024, 'publication_reward', 'PR-2568-0024', 1018, 3, 7, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 09:06:36', '2025-10-11 22:21:45', NULL),
(10025, 'publication_reward', 'PR-2568-0025', 1018, 3, 7, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 09:06:36', '2025-10-11 22:21:48', NULL),
(10026, 'publication_reward', 'PR-2568-0026', 1027, 3, 7, 31, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 09:06:36', '2025-10-11 22:28:02', NULL),
(10027, 'publication_reward', 'PR-2568-0027', 1027, 3, 7, 31, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 09:06:36', '2025-10-11 22:28:38', NULL),
(10028, 'publication_reward', 'PR-2568-0028', 1018, 3, 7, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 09:06:36', '2025-10-11 22:22:01', NULL),
(10029, 'publication_reward', 'PR-2568-0029', 14, 3, NULL, NULL, NULL, 6, '2025-10-05 02:20:19', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-05 02:18:18', '2025-10-10 14:27:11', NULL),
(10030, 'publication_reward', 'PR-2568-0030', 14, 3, NULL, NULL, NULL, 6, '2025-10-08 02:30:34', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-08 02:30:34', '2025-10-10 14:27:14', NULL),
(10031, 'publication_reward', 'PR-2568-0031', 1027, 3, 7, NULL, NULL, 6, '2025-10-08 03:17:13', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-08 03:16:51', '2025-10-11 22:22:07', NULL),
(10032, 'fund_application', 'FA-2568-0029', 1018, 3, 6, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-10 12:41:22', '2025-10-10 15:17:10', NULL),
(10033, 'fund_application', 'FA-2568-0030', 1010, 3, 6, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-10 12:41:22', '2025-10-10 15:17:27', NULL),
(10034, 'fund_application', 'FA-2568-0031', 1032, 3, 6, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-10 12:41:22', '2025-10-10 15:17:47', NULL),
(10035, 'fund_application', 'FA-2568-0032', 1032, 3, 6, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-10 12:41:22', '2025-10-10 15:17:55', NULL),
(10036, 'fund_application', 'FA-2568-0033', 1032, 3, 6, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-10 12:41:22', '2025-10-10 15:18:00', NULL),
(10037, 'fund_application', 'FA-2568-0034', 1032, 3, 6, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-10 12:41:22', '2025-10-10 15:18:05', NULL),
(10038, 'fund_application', 'FA-2568-0035', 1002, 3, 6, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-10 12:41:22', '2025-10-10 15:18:24', NULL),
(10039, 'fund_application', 'FA-2568-0036', 1002, 3, 6, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-10 12:41:22', '2025-10-10 15:18:32', NULL),
(10040, 'fund_application', 'FA-2568-0037', 1002, 3, 6, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-10 12:41:22', '2025-10-10 15:18:38', NULL),
(10041, 'fund_application', 'FA-2568-0038', 1018, 3, 6, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-10 12:41:22', '2025-10-10 15:19:05', NULL),
(10042, 'fund_application', 'FA-2568-0039', 1018, 3, 6, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-10 12:41:22', '2025-10-10 15:19:10', NULL),
(10043, 'fund_application', 'FA-2568-0040', 1018, 3, 6, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-10 12:41:22', '2025-10-10 15:19:14', NULL),
(10044, 'fund_application', 'FA-2568-0041', 1018, 3, 6, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-10 12:41:22', '2025-10-10 15:19:20', NULL),
(10045, 'fund_application', 'FA-2568-0042', 1018, 3, 6, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-10 12:41:22', '2025-10-10 15:19:25', NULL),
(10046, 'fund_application', 'FA-2568-0043', 1010, 3, 6, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-10 12:41:22', '2025-10-10 15:19:48', NULL),
(10047, 'fund_application', 'FA-2568-0044', 1010, 3, 6, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-10 12:41:22', '2025-10-10 15:19:59', NULL),
(10048, 'fund_application', 'FA-2568-0045', 1020, 3, 6, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-10 12:41:22', '2025-10-10 15:20:12', NULL),
(10049, 'fund_application', 'FA-2568-0046', 1003, 3, 6, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-10 12:41:22', '2025-10-10 15:20:34', NULL),
(10050, 'fund_application', 'FA-2568-0047', 1003, 3, 6, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-10 12:41:22', '2025-10-10 15:20:39', NULL),
(10051, 'fund_application', 'FA-2568-0048', 1010, 3, 6, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-10 12:41:22', '2025-10-10 15:20:52', NULL),
(10052, 'fund_application', 'FA-2568-0049', 1006, 3, 6, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-10 12:41:22', '2025-10-10 15:21:08', NULL),
(10053, 'fund_application', 'FA-2568-0050', 1006, 3, 6, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-10 12:41:22', '2025-10-10 15:21:21', NULL),
(10054, 'fund_application', 'FA-2568-0051', 1006, 3, 6, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-10 12:41:22', '2025-10-10 15:21:27', NULL),
(10055, 'fund_application', 'FA-2568-0052', 1006, 3, 6, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-10 12:41:22', '2025-10-10 15:21:32', NULL),
(10056, 'fund_application', 'FA-2568-0053', 1006, 3, 6, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-10 12:41:22', '2025-10-10 15:21:38', NULL),
(10057, 'fund_application', 'FA-2568-0054', 1013, 3, 6, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-10 12:41:22', '2025-10-10 15:22:35', NULL),
(10058, 'fund_application', 'FA-2568-0055', 1013, 3, 6, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-10 12:41:22', '2025-10-10 15:22:45', NULL),
(10059, 'fund_application', 'FA-2568-0056', 1013, 3, 6, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-10 12:41:22', '2025-10-10 15:22:55', NULL),
(10060, 'fund_application', 'FA-2568-0057', 1013, 3, 6, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-10 12:41:22', '2025-10-10 15:23:01', NULL),
(10061, 'fund_application', 'FA-2568-0058', 1018, 3, 6, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-10 12:41:22', '2025-10-10 15:23:36', NULL),
(10062, 'fund_application', 'FA-2568-0059', 1027, 3, 6, 23, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-10 12:41:22', '2025-10-11 22:26:45', NULL),
(10063, 'fund_application', 'FA-2568-0060', 1018, 3, 6, NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-10 12:41:22', '2025-10-10 15:23:51', NULL);

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

   -- ใครกระทำ: admin > head > เจ้าของคำขอ
   SET v_user_id = COALESCE(NEW.admin_approved_by, NEW.head_approved_by, NEW.user_id);

   IF IFNULL(OLD.status_id,0) <> IFNULL(NEW.status_id,0) THEN
      SET v_changed_fields = CONCAT(v_changed_fields,'status,');
   END IF;

   IF OLD.status_id <> NEW.status_id AND NEW.status_id = 2 THEN
      SET v_action = 'approve';
   ELSEIF OLD.status_id <> NEW.status_id AND NEW.status_id = 3 THEN
      SET v_action = 'reject';
   ELSEIF OLD.submitted_at IS NULL AND NEW.submitted_at IS NOT NULL THEN
      SET v_action = 'submit';
   ELSE
      SET v_action = 'update';
   END IF;

   IF v_changed_fields <> '' OR v_action <> 'update' THEN
      INSERT INTO audit_logs (
        user_id, action, entity_type, entity_id, entity_number,
        changed_fields, description, created_at
      ) VALUES (
        v_user_id, v_action, 'submission', NEW.submission_id, NEW.submission_number,
        TRIM(TRAILING ',' FROM v_changed_fields), CONCAT(v_action,' submission'), NOW()
      );
   END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trg_submissions_sync_legacy` AFTER UPDATE ON `submissions` FOR EACH ROW BEGIN
  -- 3.1 sync กลับไปยังคอลัมน์เดิมของ submissions เอง (approved_by/approved_at เดิม)
  IF (NEW.admin_approved_by <> OLD.admin_approved_by) OR (NEW.admin_approved_at <> OLD.admin_approved_at) THEN
    UPDATE submissions
      SET approved_by = NEW.admin_approved_by,
          approved_at = NEW.admin_approved_at
    WHERE submission_id = NEW.submission_id;
  END IF;

  -- 3.2 sync ไปยังตารางรายละเอียด (legacy fields) เพื่อให้ของเก่ายังอ่านได้เหมือนเดิม
  -- Publication Reward
  IF (NEW.admin_approved_by <> OLD.admin_approved_by) OR (NEW.admin_approved_at <> OLD.admin_approved_at) THEN
    UPDATE publication_reward_details
      SET approved_by = NEW.admin_approved_by,
          approved_at = NEW.admin_approved_at
    WHERE submission_id = NEW.submission_id;
  END IF;

  IF (NEW.rejected_by <> OLD.rejected_by) OR (NEW.rejected_at <> OLD.rejected_at)
     OR (NEW.rejection_reason <> OLD.rejection_reason) THEN
    UPDATE publication_reward_details
      SET rejected_by      = NEW.rejected_by,
          rejected_at      = NEW.rejected_at,
          rejection_reason = NEW.rejection_reason
    WHERE submission_id = NEW.submission_id;
  END IF;

  -- Fund Application (เหตุผลเดิมอยู่ใน comment: ไม่ทับ comment อัตโนมัติ)
  IF (NEW.admin_approved_by <> OLD.admin_approved_by) OR (NEW.admin_approved_at <> OLD.admin_approved_at) THEN
    UPDATE fund_application_details
      SET approved_by = NEW.admin_approved_by,
          approved_at = NEW.admin_approved_at
    WHERE submission_id = NEW.submission_id;
  END IF;

  IF (NEW.rejected_by <> OLD.rejected_by) OR (NEW.rejected_at <> OLD.rejected_at) THEN
    UPDATE fund_application_details
      SET rejected_by = NEW.rejected_by,
          rejected_at = NEW.rejected_at
    WHERE submission_id = NEW.submission_id;
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
  `original_name` varchar(255) DEFAULT NULL,
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

INSERT INTO `submission_documents` (`document_id`, `submission_id`, `file_id`, `original_name`, `document_type_id`, `description`, `display_order`, `is_required`, `is_verified`, `verified_by`, `verified_at`, `created_at`) VALUES
(293, 139, 293, NULL, 2, 'form_sample.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-04 09:05:41'),
(294, 139, 294, NULL, 16, '', 2, 0, 0, NULL, NULL, '2025-10-04 09:05:41'),
(295, 10029, 295, NULL, 2, 'form_sample.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-05 02:20:18'),
(296, 10029, 296, NULL, 16, '', 2, 0, 0, NULL, NULL, '2025-10-05 02:20:19'),
(297, 10030, 297, NULL, 2, 'form_sample.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-08 02:30:34'),
(298, 10030, 298, NULL, 3, 'form_sample.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-10-08 02:30:34'),
(299, 10030, 299, NULL, 16, '', 3, 0, 0, NULL, NULL, '2025-10-08 02:30:34'),
(300, 10031, 300, NULL, 2, 'form_sample.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-08 03:17:13'),
(301, 10031, 301, NULL, 3, 'form_sample.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-10-08 03:17:13'),
(302, 10031, 302, NULL, 16, '', 3, 0, 0, NULL, NULL, '2025-10-08 03:17:13'),
(304, 10026, 303, '14 ผศ.ดร.ชานนท์ 1.3, 1.10.pdf', 17, NULL, 0, 0, 0, NULL, NULL, '2025-10-11 22:14:43'),
(305, 10062, 304, '14 ผศ.ดร.ชานนท์ ทุนส่งเสริม 1.5.pdf', 17, NULL, 0, 0, 0, NULL, NULL, '2025-10-11 22:14:43');

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
(193, 139, 14, 'owner', 1, 1, '2025-10-04 09:05:01'),
(194, 10029, 14, 'owner', 1, 1, '2025-10-05 02:18:18'),
(195, 10030, 14, 'owner', 1, 1, '2025-10-08 02:30:34'),
(196, 10031, 1027, 'owner', 1, 1, '2025-10-08 03:16:52');

-- --------------------------------------------------------

--
-- Table structure for table `system_config`
--

CREATE TABLE `system_config` (
  `config_id` int(11) NOT NULL,
  `system_version` varchar(20) DEFAULT '1.0.0',
  `last_updated` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_by` int(11) DEFAULT NULL,
  `current_year` varchar(250) DEFAULT NULL,
  `start_date` datetime NOT NULL,
  `end_date` datetime NOT NULL,
  `main_annoucement` int(11) DEFAULT NULL,
  `reward_announcement` int(11) DEFAULT NULL,
  `activity_support_announcement` int(11) DEFAULT NULL,
  `conference_announcement` int(11) DEFAULT NULL,
  `service_announcement` int(11) DEFAULT NULL,
  `kku_report_year` varchar(50) DEFAULT NULL COMMENT 'ปีระเบียบกองทุนมหาวิทยาลัยขอนแก่น',
  `installment` int(11) DEFAULT NULL COMMENT 'เลขที่ใส่ในเอกสาร Publication Reward ในส่วน "งวดที่"'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `system_config`
--

INSERT INTO `system_config` (`config_id`, `system_version`, `last_updated`, `updated_by`, `current_year`, `start_date`, `end_date`, `main_annoucement`, `reward_announcement`, `activity_support_announcement`, `conference_announcement`, `service_announcement`, `kku_report_year`, `installment`) VALUES
(1, '1.0.0', '2025-10-10 04:19:36', NULL, '2568', '2025-08-29 21:01:00', '2025-10-16 10:00:00', NULL, NULL, NULL, NULL, NULL, '2568', 5);

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
  `scholar_author_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `role_id` int(11) DEFAULT NULL,
  `position_id` int(11) DEFAULT NULL,
  `date_of_employment` date DEFAULT NULL,
  `create_at` datetime DEFAULT current_timestamp(),
  `update_at` datetime DEFAULT NULL,
  `delete_at` datetime DEFAULT NULL,
  `prefix` varchar(50) DEFAULT NULL,
  `manage_position` varchar(255) DEFAULT NULL,
  `position` varchar(255) DEFAULT NULL,
  `position_en` varchar(255) DEFAULT NULL,
  `prefix_position_en` varchar(50) DEFAULT NULL,
  `Name_en` varchar(255) DEFAULT NULL,
  `suffix_en` varchar(50) DEFAULT NULL,
  `TEL` varchar(50) DEFAULT NULL,
  `TELformat` varchar(50) DEFAULT NULL,
  `TEL_ENG` varchar(50) DEFAULT NULL,
  `manage_position_en` varchar(255) DEFAULT NULL,
  `LAB_Name` varchar(255) DEFAULT NULL,
  `Room` varchar(255) DEFAULT NULL,
  `CP_WEB_ID` varchar(255) DEFAULT NULL,
  `Scopus_id` varchar(100) DEFAULT NULL,
  `Is_active` char(1) DEFAULT 'A'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `user_fname`, `user_lname`, `gender`, `email`, `scholar_author_id`, `password`, `role_id`, `position_id`, `date_of_employment`, `create_at`, `update_at`, `delete_at`, `prefix`, `manage_position`, `position`, `position_en`, `prefix_position_en`, `Name_en`, `suffix_en`, `TEL`, `TELformat`, `TEL_ENG`, `manage_position_en`, `LAB_Name`, `Room`, `CP_WEB_ID`, `Scopus_id`, `Is_active`) VALUES
(1, 'Somchai', 'Suwan', 'male', 'somchai@example.com', NULL, '$2a$10$LCtvqEswW1dTIOwJdTrvZuFmQF61aepTdC9HgI78UdnuyVJs3pxIm', 1, 1, NULL, '2025-06-24 16:49:13', '2025-07-02 22:02:51', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'A'),
(2, 'Suda', 'Kong', 'female', 'suda@example.com', NULL, '$2a$10$.UeSuOiuMSwJRwZyxplaSOd7DsD/q/0S7zozjFWGP9F2Dm1ZCN8rK', 2, 3, NULL, '2025-06-24 16:49:13', '2025-07-02 22:02:51', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'A'),
(7, 'ผู้ดูแล', 'ระบบ', 'male', 'kitsanapong.p@kkumail.com', NULL, '$2a$10$f8kTbCx57o6gCNItJMUczeTmwPK1TUudS85U.wF6keW2cAVApjYN6', 3, 3, NULL, '2025-07-31 17:52:45', '2025-07-31 17:52:45', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'A'),
(8, 'สมชาย', 'ใจดี', 'male', 'aum.kitsanapong@gmail.com', '', '$2a$10$sPaTxAZ.Bp4fxHGBg.awZ.a5jq72uWXeRAQHLK.3LTluhNoliaRYG', 1, 1, '2025-09-17', '2025-07-31 17:52:46', '2025-07-31 17:52:46', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'A'),
(9, 'สมหญิง', 'รักการศึกษา', 'female', 'teacher2@cpkku.ac.th', '', '$2a$10$mgxuR9pZ5HfndfDoHd/ZquUQYAKztvxZBpT417iX05TLOC.axULf2', 1, 2, NULL, '2025-07-31 17:52:46', '2025-07-31 17:52:46', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'A'),
(10, 'สุดา', 'ช่วยเหลือ', 'female', 'staff@cpkku.ac.th', NULL, '$2a$10$Df2y47XVO7Eugd/DLXJSAuIqXktScmsvhTSRzANBQzqSOCmuPSi1C', 2, 3, NULL, '2025-07-31 17:52:46', '2025-07-31 17:52:46', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'A'),
(11, 'ผู้ดูแล', 'ระบบ', 'male', 'admin@cpkku.ac.th', NULL, '$2a$10$JL5vSA37ApBjYy8Yn3dzd.JznwUc4PvU7BWw1HvG4Er5hfuJ8ypxO', 3, 3, NULL, '2025-09-22 14:48:29', '2025-09-22 14:48:29', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'A'),
(12, 'สมหมาย', 'จันทร์', 'male', 'teacher@cpkku.ac.th', NULL, '$2a$10$6ZjpWSb79tlPLB4YViD/aet//OVVG2MigdyHqIrNX.RXyA6UVUaf.', 1, 1, '2025-09-16', '2025-09-22 14:48:29', '2025-09-22 14:48:29', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'A'),
(13, 'หัวหน้า', 'สาขา', 'female', 'depthead@cpkku.ac.th', NULL, '$2a$10$1med.YpeDE7LdwkGyGgUo.6M9gg9TdRVQXioesRxWU0yz58uQuLna', 1, 3, '2025-10-07', '2025-09-22 14:48:30', '2025-09-22 14:48:30', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'A'),
(14, 'อาจารย์', 'ทดสอบ', 'male', 'testteacher@cpkku.ac.th', NULL, '$2a$10$TeSru2c2Nv9X9jmuchGzX.4FARjjQ9PojLapTZkFC63hgAbr.zai.', 1, 2, '2025-10-07', '2025-10-03 06:59:37', '2025-10-03 06:59:37', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'A'),
(15, 'แอดมิน', 'ทดสอบ', 'male', 'testadmin@cpkku.ac.th', NULL, '$2a$10$wax64dU2Z5OiirKZWxyWP.3zniM9PLHwdqIN9DBnBOZvEEleaSMJi', 3, 3, NULL, '2025-10-03 06:59:37', '2025-10-03 06:59:37', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'A'),
(16, 'หัวหน้าสาขา', 'ทดสอบ', 'male', 'testdepthead@cpkku.ac.th', NULL, '$2a$10$v/xIgEwSfRpc7/pnzz11meFKo74rcg.7IhkXACNunKR5ayV1IjfeG', 4, 3, NULL, '2025-10-04 01:06:33', '2025-10-04 01:06:33', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'A'),
(1001, 'งามนิจ', 'อาจอินทร์', 'female', 'ngamnij@kku.ac.th', NULL, NULL, 1, NULL, NULL, '2025-10-04 00:00:00', '2025-10-04 00:00:00', NULL, 'รศ. ดร.', '', 'รองศาสตราจารย์', 'Associate Professor', 'Assoc. Prof.', 'ngamnij arch-int', 'Ph.D.', '089-6222316', '08 9622 2316', '+668 9622 2316', '', 'Applied Intelligence and Data Analytics (AIDA) Lab', '', 'https://computing.kku.ac.th/ngamnij.arch-int', NULL, 'A'),
(1002, 'พุธษดี', 'ศิริแสงตระกูล', 'female', 'pusadee@kku.ac.th', NULL, NULL, 1, NULL, NULL, '2025-10-04 00:00:00', '2025-10-04 00:00:00', NULL, 'ผศ. ดร.', '', 'ผู้ช่วยศาสตราจารย์', 'Assistant Professor', 'Asst. Prof.', 'pusadee seresangtakul', 'Ph.D.', '080-4140401', '08 0414 0401', '+668 0414 0401', '', 'Natural Language and Speech Processing Lab (NLSP)', '', 'https://computing.kku.ac.th/pusadee.seresangtakul', NULL, 'A'),
(1003, 'อุรฉัตร ', 'โคแก้ว', 'female', 'urachart@kku.ac.th', NULL, NULL, 1, NULL, NULL, '2025-10-04 00:00:00', '2025-10-04 00:00:00', NULL, 'รศ. ดร.', '', 'รองศาสตราจารย์', 'Associate Professor', 'Assoc. Prof.', 'urachart kokaew', 'Ph.D.', '086-6329529', '08 6632 9529', '+668 6632 9529', '', 'Applied Intelligence and Data Analytics (AIDA) Lab', 'SC9333', 'https://computing.kku.ac.th/urachart.kokaew', NULL, 'A'),
(1004, 'ปัญญาพล', 'หอระตะ', 'male', 'punhor1@kku.ac.th', NULL, NULL, 1, NULL, NULL, '2025-10-04 00:00:00', '2025-10-04 00:00:00', NULL, 'รศ. ดร.', '', 'รองศาสตราจารย์', 'Associate Professor', 'Assoc. Prof.', 'punyaphol horata', 'Ph.D.', '095-1689845', '09 5168 9845', '+669 5168 9845', '', 'Advanced Smart Computing Lab', '', 'https://computing.kku.ac.th/punyaphol.horata', NULL, 'A'),
(1005, 'วชิราวุธ', 'ธรรมวิเศษ', 'male', 'twachi@kku.ac.th', NULL, NULL, 1, NULL, NULL, '2025-10-04 00:00:00', '2025-10-04 00:00:00', NULL, 'ผศ. ดร.', '', 'ผู้ช่วยศาสตราจารย์', 'Assistant Professor', 'Asst. Prof.', 'Wachirawut Thamviset', 'Ph.D.', '081-3805203', '08 1380 5203', '+668 1380 5203', '', 'Machine Learning and Intelligent Systems (MLIS) Lab', '', 'https://computing.kku.ac.th/wachirawut.tamviset', NULL, 'A'),
(1006, 'สุมณฑา', 'เกษมวิลาศ', 'female', 'sumkas@kku.ac.th', NULL, NULL, 1, NULL, NULL, '2025-10-04 00:00:00', '2025-10-04 00:00:00', NULL, 'ผศ. ดร.', '', 'ผู้ช่วยศาสตราจารย์', 'Assistant Professor', 'Asst. Prof.', 'Sumonta Kasemvilas', 'Ph.D.', '094-2519245', '09 4251 9245', '+669 4251 9245', '', 'Hardware-Human Interface and Communications (H2I-Comm) Lab', 'SC9363', 'https://computing.kku.ac.th/sumonta.kasemvilas', NULL, 'A'),
(1007, 'สิรภัทร', 'เชี่ยวชาญวัฒนา', 'female', 'sunkra@kku.ac.th', NULL, NULL, 1, NULL, NULL, '2025-10-04 00:00:00', '2025-10-04 00:00:00', NULL, 'รศ. ดร.', 'คณบดี', 'รองศาสตราจารย์', 'Associate Professor', 'Assoc. Prof.', 'sirapat chiewchanwattana', 'Ph.D.', '086-8509784', '08 6850 9784', '+668 6850 9784', '', 'Advanced Smart Computing (ASC) Lab', '', 'https://computing.kku.ac.th/sirapat.chiewchanwattana', NULL, 'A'),
(1008, 'บุญทรัพย์', 'ไวคำ', 'male', 'boonsup@kku.ac.th', NULL, NULL, 1, NULL, NULL, '2025-10-04 00:00:00', '2025-10-04 00:00:00', NULL, 'ผศ.', '', 'ผู้ช่วยศาสตราจารย์', 'Assistant Professor', 'Asst. Prof.', 'boonsup waikham', '', '080-7668868', '08 0766 8868', '+668 0766 8868', '', '', '', 'https://computing.kku.ac.th/boonsup.waikham', NULL, 'A'),
(1009, 'อุราวรรณ', 'จันทร์เกษ', 'female', 'curawa@kku.ac.th', NULL, NULL, 1, NULL, NULL, '2025-10-04 00:00:00', '2025-10-04 00:00:00', NULL, 'ผศ. ดร.', '', 'ผู้ช่วยศาสตราจารย์', 'Assistant Professor', 'Asst. Prof.', 'urawan chanket', 'Ph.D.', '087-6780595', '08 7678 0595', '+668 7678 0595', '', 'Geo-informatics, NEGISTDA', '', 'https://computing.kku.ac.th/urawan.chanket', NULL, 'A'),
(1010, 'วรารัตน์', 'สงฆ์แป้น', 'female', 'wararat@kku.ac.th ', NULL, NULL, 1, NULL, NULL, '2025-10-04 00:00:00', '2025-10-04 00:00:00', NULL, 'รศ. ดร.', '', 'ผู้ช่วยศาสตราจารย์', 'Assistant Professor', 'Asst. Prof.', 'wararat songpan', 'Ph.D.', '080-4111279', '08 0411 1279', '+668 0411 1279', '', 'Applied Intelligence and Data Analytics (AIDA) Lab', '', 'https://computing.kku.ac.th/wararat.songpan', NULL, 'A'),
(1011, 'ชัยพล', 'กีรติกสิกร', 'male', 'chaiyapon@kku.ac.th', NULL, NULL, 1, NULL, NULL, '2025-10-04 00:00:00', '2025-10-04 00:00:00', NULL, 'รศ. ดร.', '', 'รองศาสตราจารย์', 'Associate Professor', 'Assoc. Prof.', 'chaiyapon keeratikasikorn', 'Ph.D.', '084-6499463', '08 4649 9463', '+668 4649 9463', '', '', '', 'https://computing.kku.ac.th/chaiyapon.keeratikasikorn', NULL, 'A'),
(1012, 'ปวีณา', 'วันชัย', 'female', 'wpaweena@kku.ac.th', NULL, NULL, 1, NULL, NULL, '2025-10-04 00:00:00', '2025-10-04 00:00:00', NULL, 'ผศ. ดร.', '', 'ผู้ช่วยศาสตราจารย์', 'Assistant Professor', 'Asst. Prof.', 'paweena wanchai', 'Ph.D.', '087-6926662', '08 7692 6662', '+668 7692 6662', '', 'Applied Intelligence and Data Analytics (AIDA) Lab', 'SC9332', 'https://computing.kku.ac.th/paweena.wanchai', NULL, 'A'),
(1013, 'สิลดา', 'อินทรโสธรฉันท์', 'female', 'silain@kku.ac.th', NULL, NULL, 1, NULL, NULL, '2025-10-04 00:00:00', '2025-10-04 00:00:00', NULL, 'ผศ. ดร.', '', 'ผู้ช่วยศาสตราจารย์', 'Assistant Professor', 'Asst. Prof.', 'silada intarasothonchun', 'Ph.D.', '094-2842356', '09 4284 2356', '+669 4284 2356', '', '', '', 'https://computing.kku.ac.th/silada.intarasothonchun', NULL, 'A'),
(1014, 'ณกร', 'วัฒนกิจ', 'male', 'nagon@kku.ac.th', NULL, NULL, 1, NULL, NULL, '2025-10-04 00:00:00', '2025-10-04 00:00:00', NULL, 'ผศ. ดร.', 'รองคณบดีฝ่ายวิชาการ', 'ผู้ช่วยศาสตราจารย์', 'Assistant Professor', 'Asst. Prof.', 'nagon watanakij', 'Ph.D.', '085-0040090', '08 5004 0090', '+668 5004 0090', '', '', '', 'https://computing.kku.ac.th/nagon.watanakij', NULL, 'A'),
(1015, 'มัลลิกา', 'วัฒนะ', 'female', 'monlwa@kku.ac.th', NULL, NULL, 1, NULL, NULL, '2025-10-04 00:00:00', '2025-10-04 00:00:00', NULL, 'ผศ. ดร.', '', 'ผู้ช่วยศาสตราจารย์', 'Assistant Professor', 'Asst. Prof.', 'Monlica Wattana', 'Ph.D.', '086-8680988', '08 6868 0988', '+668 6868 0988', '', 'Applied Intelligence and Data Analytics (AIDA) Lab', 'SC9329', 'https://computing.kku.ac.th/monlica.wattana', NULL, 'A'),
(1016, 'สายยัญ', 'สายยศ', 'male', 'saiyan@kku.ac.th', NULL, NULL, 1, NULL, NULL, '2025-10-04 00:00:00', '2025-10-04 00:00:00', NULL, 'ผศ. ดร.', '', 'ผู้ช่วยศาสตราจารย์', 'Assistant Professor', 'Asst. Prof.', 'saiyan saiyod', 'Ph.D.', '089-6204227', '08 9620 4227', '+668 9620 4227', '', '', '', 'https://computing.kku.ac.th/saiyan.saiyod', NULL, 'A'),
(1017, 'พิพัธน์', 'เรืองแสง', 'male', 'reungsang@kku.ac.th ', NULL, NULL, 1, NULL, NULL, '2025-10-04 00:00:00', '2025-10-04 00:00:00', NULL, 'ผศ. ดร.', '', 'ผู้ช่วยศาสตราจารย์', 'Assistant Professor', 'Asst. Prof.', 'Pipat Reungsang', 'Ph.D.', '097-3217810', '09 7321 7810', '+669 7321 7810', '', '', '', 'https://computing.kku.ac.th/pipat.reungsang', NULL, 'A'),
(1018, 'จักรชัย', 'โสอินทร์', 'male', 'chakso@kku.ac.th', NULL, NULL, 1, NULL, NULL, '2025-10-04 00:00:00', '2025-10-04 00:00:00', NULL, 'ศ. ดร.', '', 'ศาสตราจารย์', 'Professor', 'Prof.', 'Chakchai So-In', 'Ph.D.', '094-5149644', '09 4514 9644', '+669 4514 9644', '', 'IEEE/ACM Senior Members', '', 'https://computing.kku.ac.th/chakchai.so-in', NULL, 'A'),
(1019, 'คำรณ', 'สุนัติ', 'male', 'skhamron@kku.ac.th', NULL, NULL, 1, NULL, NULL, '2025-10-04 00:00:00', '2025-10-04 00:00:00', NULL, 'ผศ. ดร.', '', 'ผู้ช่วยศาสตราจารย์', 'Assistant Professor', 'Asst. Prof.', 'khamron sunat', 'Ph.D.', '080-4613391', '08 0461 3391', '+668 0461 3391', '', 'Advanced Smart Computing (ASC) Lab', '', 'https://computing.kku.ac.th/khamron.sunat', NULL, 'A'),
(1020, 'ชิตสุธา', 'สุ่มเล็ก', 'female', 'chitsutha@kku.ac.th', NULL, NULL, 1, NULL, NULL, '2025-10-04 00:00:00', '2025-10-04 00:00:00', NULL, 'ผศ. ดร.', '', 'ผู้ช่วยศาสตราจารย์', 'Assistant Professor', 'Asst. Prof.', 'chitsutha soomlek', 'Ph.D.', '091-8654422', '091-8654422', '-', '', '\r Department of Computer Science ', ' SC9327', 'https://computing.kku.ac.th/chitsutha.soomlek', NULL, 'A'),
(1021, 'ศรัณย์', 'อภิชนตระกูล', 'male', 'sarunap@kku.ac.th', NULL, NULL, 1, NULL, NULL, '2025-10-04 00:00:00', '2025-10-04 00:00:00', NULL, 'อ. ดร.', 'รองคณบดีฝ่ายบริหาร', 'อาจารย์', 'Lecturer', '', 'Sarun Apichontrakul', 'Ph.D.', '084-1056767', '08 4105 6767', '+668 4105 6767', '', '', '', 'https://computing.kku.ac.th/sarun.apichontrakul', NULL, 'A'),
(1022, 'ธนพล', 'ตั้งชูพงศ์', 'male', 'thanaphon@kku.ac.th', NULL, NULL, 1, NULL, NULL, '2025-10-04 00:00:00', '2025-10-04 00:00:00', NULL, 'อ.', '', 'อาจารย์', 'Lecturer', '', 'Thanaphon Tangchoopong', '', '065-5219359', '06 5521 9359', '+666 5521 9359', '', 'Advanced Smart Computing (ASC) Lab', 'SC9328', 'https://computing.kku.ac.th/thanaphon.tangchoopong', NULL, 'A'),
(1023, 'วรัญญา', 'วรรณศรี', 'female', 'waruwu@kku.ac.th ', NULL, NULL, 1, NULL, NULL, '2025-10-04 00:00:00', '2025-10-04 00:00:00', NULL, 'ผศ. ดร.', '', 'ผู้ช่วยศาสตราจารย์', 'Assistant Professor', 'Asst. Prof.', 'Warunya Wunnasri', 'Ph.D.', '085-0022231', '08 5002 2231', '+668 5002 2231', '', 'Applied Intelligence and Data Analytics (AIDA) Lab', '', 'https://computing.kku.ac.th/warunya.wunnasri', NULL, 'A'),
(1024, 'ศักดิ์พจน์', 'ทองเลี่ยมนาค', 'male', 'sakpod@kku.ac.th ', NULL, NULL, 1, NULL, NULL, '2025-10-04 00:00:00', '2025-10-04 00:00:00', NULL, 'อ. ดร.', '', 'อาจารย์', 'Lecturer', '', 'Sakpod Tongleamnak', 'Ph.D.', '083-4662082', '08 3466 2082', '+668 3466 2082', '', '', '', 'https://computing.kku.ac.th/sakpod.tongleamnak', NULL, 'A'),
(1025, 'เพชร', 'อิ่มทองคำ', 'male', 'phetim@kku.ac.th', NULL, NULL, 1, NULL, NULL, '2025-10-04 00:00:00', '2025-10-04 00:00:00', NULL, 'ผศ. ดร.', '', 'ผู้ช่วยศาสตราจารย์', 'Assistant Professor', 'Asst. Prof.', 'Phet Aimtongkham', 'Ph.D.', '084-3927080', '08 4392 7080', '+668 4392 7080', '', '', '', 'https://computing.kku.ac.th/phet.aimtongkham', NULL, 'A'),
(1026, 'ไพรสันต์', 'ผดุงเวียง', 'male', 'praipa@kku.ac.th', NULL, NULL, 1, NULL, NULL, '2025-10-04 00:00:00', '2025-10-04 00:00:00', NULL, 'ผศ. ดร.', '', 'ผู้ช่วยศาสตราจารย์', 'Assistant Professor', 'Asst. Prof.', 'Praisan Padungweang', 'Ph.D.', '094-2653336', '09 4265 3336', '+669 4265 3336', '', 'Advanced Smart Computing (ASC) Lab', '', 'https://computing.kku.ac.th/praisan.padungweang', NULL, 'A'),
(1027, 'ชานนท์', 'เดชสุภา', 'male', 'chanode@kku.ac.th', '_lza5VIAAAAJ', '$2a$10$qVdCxlPx1quNTW15DNhN0.eZFbdY0Y1Fw5PrM4zJLvbsUkjc3F8ZK', 4, 1, '2025-10-01', '2025-10-04 00:00:00', '2025-10-04 00:00:00', NULL, 'ผศ. ดร.', 'รองคณบดีฝ่ายวิจัยและนวัตกรรม', 'ผู้ช่วยศาสตราจารย์', 'Assistant Professor', 'Asst. Prof.', 'Chanon Dechsupa', 'Ph.D.', '089-2175154', '08 9217 5154', '+668 9217 5154', '', '', '', 'https://computing.kku.ac.th/chanon.dechsupa', NULL, 'A'),
(1028, 'ศาสตรา', 'วงศ์ธนวสุ', 'male', 'wongsar@kku.ac.th', NULL, NULL, 1, NULL, NULL, '2025-10-04 00:00:00', '2025-10-04 00:00:00', NULL, 'ศ. ดร.', '', 'ศาสตราจารย์', 'Professor', 'Prof.', 'Sartra Wongthanavasu', 'Ph.D.', '081-9650277', '08 1965 0277', '+668 1965 0277', '', 'Machine Learning and Intelligent Systems (MLIS) Lab', '', 'https://computing.kku.ac.th/sartra.wongthanavasu', NULL, 'A'),
(1029, 'วาสนา', 'พุฒกลาง', 'female', 'putklang_w@kku.ac.th', NULL, NULL, 1, NULL, NULL, '2025-10-04 00:00:00', '2025-10-04 00:00:00', NULL, 'อ. ดร.', '', 'อาจารย์', 'Lecturer', '', 'Wasana Putklang', 'Ph.D.', '086-7162373', '08-6716-2373', '+668 6716-2373', '', 'Geo-Informatics, NEGISTDA', 'SC9337', 'https://computing.kku.ac.th/wasana.putklang', NULL, 'A'),
(1030, 'ภัคราช', 'มุสิกะวัน', 'male', 'pakamu@kku.ac.th', NULL, NULL, 1, NULL, NULL, '2025-10-04 00:00:00', '2025-10-04 00:00:00', NULL, 'อ. ดร.', '', 'อาจารย์', 'Lecturer', '', 'Pakarat Musikawan', 'Ph.D.', '083-4660399', '08 3466 0399 ', '+668 3466 0399 ', '', '', 'SC9349', 'https://computing.kku.ac.th/pakarat.musikawan', NULL, 'A'),
(1031, 'ญานิกา', 'คงโสรส', 'female', 'yaniko@kku.ac.th', NULL, NULL, 1, NULL, NULL, '2025-10-04 00:00:00', '2025-10-04 00:00:00', NULL, 'อ. ดร.', '', 'อาจารย์', 'Lecturer', '', 'Yanika Kongsorot', 'Ph.D.', '084-6042660', '08 4604 2660', '+668 4604 2660', '', '', 'SC9348', 'https://computing.kku.ac.th/yanika.kongsorot', NULL, 'A'),
(1032, 'Arfat', 'Khan', 'male', 'arfatkhan@kku.ac.th', NULL, NULL, 1, NULL, NULL, '2025-10-04 00:00:00', '2025-10-04 00:00:00', NULL, 'อ. ดร.', '', 'อาจารย์', 'Lecturer', '', 'Arfat Ahmad Khan', 'Ph.D.', '095-320-3915', '09 5320 3915\n', '', '', '', '', '', NULL, 'A'),
(1033, 'พงษ์ศธร', 'จันทร์ยอย', 'male', 'pongsathon@kku.ac.th', NULL, NULL, 1, NULL, NULL, '2025-10-04 00:00:00', '2025-10-04 00:00:00', NULL, 'อ. ดร.', '', 'อาจารย์', 'Lecturer', '', 'Pongsathon Janyoi', 'Ph.D.', '094-693-7606', '09 4693 7606', '+669 4693 7606', '', '', 'SC9348', '', NULL, 'A'),
(1034, 'ไอศูรย์', 'กาญจนสุรัตน์', 'male', 'isoonkan@kku.ac.th', NULL, NULL, 1, NULL, NULL, '2025-10-04 00:00:00', '2025-10-04 00:00:00', NULL, 'ผศ. ดร.', 'ผู้ช่วยคณบดีฝ่ายแผนและประกันคุณภาพ', 'ผู้ช่วยศาสตราจารย์', 'Assistant Professor', 'Asst. Prof.', 'Isoon Kanjanasurat', 'Ph.D.', '093-2624161', '09 3262 4161', '+669 3262 4161', '', '', 'SC9323', '', NULL, 'A'),
(1035, 'จักรกฤษณ์', 'แก้วโยธา', 'male', 'jakkritk@kku.ac.th', NULL, NULL, 1, NULL, NULL, '2025-10-04 00:00:00', '2025-10-04 00:00:00', NULL, 'อ. ดร.', '', 'อาจารย์', 'Lecturer', '', 'Jakkrit Kaewyotha', 'Ph.D.', '089-7140466', '08 9714 0466', '+668 9714 0466', '', '', 'SC9361', '', NULL, 'A'),
(1036, 'สาธิต', 'กระเวนกิจ', 'male', 'satikr@kku.ac.th', NULL, NULL, 1, NULL, NULL, '2025-10-04 00:00:00', '2025-10-04 00:00:00', NULL, 'ผศ. ดร.', 'ผู้ช่วยคณบดีฝ่ายดิจิทัล', 'ผู้ช่วยศาสตราจารย์', 'Assistant Professor', 'Asst. Prof.', 'Satit Kravenkit', 'Ph.D.', '089-4177484', '08 9417 7484', '+668 9417 7484', '', '', '', '', NULL, 'A'),
(1037, 'พบพร', 'ด่านวิรุทัย', 'male', 'pobda@kku.ac.th', NULL, NULL, 1, NULL, NULL, '2025-10-04 00:00:00', '2025-10-04 00:00:00', NULL, 'อ. ดร.', '', 'อาจารย์', 'Lecturer', '', 'Pobporn Danvirutai', 'Ph.D.', '092-8719244', '', '', '', '', '', '', NULL, 'A'),
(1038, 'วันเฉลิม', 'นัดดา', 'male', 'wannad@kku.ac.th', NULL, NULL, 1, NULL, NULL, '2025-10-04 00:00:00', '2025-10-04 00:00:00', NULL, 'อ. ดร.', '', 'อาจารย์', 'Lecturer', '', 'Wanchaloem Nadda', '', '062-8428362', '', '', '', '', '', '', NULL, 'A'),
(1039, 'จุฑารัตน์', 'อุ่มไธสง', NULL, 'jutaum@kku.ac.th', NULL, '$2a$10$h.ILsvKAdo0LAU15A7hgk.OYtrC9x1ltHgZGsVedwNa1MGTkPlOqW', 3, NULL, NULL, '2025-10-05 23:44:04', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'A');

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_scholar_metrics`
--

CREATE TABLE `user_scholar_metrics` (
  `user_id` int(11) NOT NULL,
  `hindex` smallint(5) UNSIGNED DEFAULT NULL,
  `hindex5y` smallint(5) UNSIGNED DEFAULT NULL,
  `i10index` smallint(5) UNSIGNED DEFAULT NULL,
  `i10index5y` smallint(5) UNSIGNED DEFAULT NULL,
  `citedby_total` int(10) UNSIGNED DEFAULT NULL,
  `citedby_5y` int(10) UNSIGNED DEFAULT NULL,
  `cites_per_year` longtext DEFAULT NULL CHECK (json_valid(`cites_per_year`)),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `user_scholar_metrics`
--

INSERT INTO `user_scholar_metrics` (`user_id`, `hindex`, `hindex5y`, `i10index`, `i10index5y`, `citedby_total`, `citedby_5y`, `cites_per_year`, `updated_at`) VALUES
(8, 5, 5, 3, 2, 125, 97, '{\"2017\":1,\"2018\":6,\"2019\":21,\"2020\":8,\"2021\":13,\"2022\":19,\"2023\":24,\"2024\":16,\"2025\":17}', '2025-10-04 02:05:16'),
(9, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-04 02:06:00'),
(14, 5, 5, 3, 2, 125, 97, '{\"2017\":1,\"2018\":6,\"2019\":21,\"2020\":8,\"2021\":13,\"2022\":19,\"2023\":24,\"2024\":16,\"2025\":17}', '2025-10-05 23:53:49'),
(1027, 5, 5, 3, 2, 125, 97, '{\"2017\":1,\"2018\":6,\"2019\":21,\"2020\":8,\"2021\":13,\"2022\":19,\"2023\":24,\"2024\":16,\"2025\":17}', '2025-10-07 02:04:36');

-- --------------------------------------------------------

--
-- Table structure for table `user_sessions`
--

CREATE TABLE `user_sessions` (
  `session_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `access_token_jti` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `refresh_token` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `device_name` varchar(255) DEFAULT NULL,
  `device_type` varchar(50) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `last_activity` datetime DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `user_sessions`
--

INSERT INTO `user_sessions` (`session_id`, `user_id`, `access_token_jti`, `refresh_token`, `device_name`, `device_type`, `ip_address`, `user_agent`, `last_activity`, `expires_at`, `is_active`, `created_at`, `updated_at`) VALUES
(354, 7, 'f6224b8a-3819-4deb-b7b2-1eddbc42ca7d', 'rxM_PFUV0wzjWoj1Ym31z-qf7I25BtgPZy3ZbqkJVHs=', 'Chrome Browser', 'web', '58.11.72.176', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 18:33:15', '2025-10-25 17:38:16', 1, '2025-09-25 17:38:16', '2025-09-25 18:33:15'),
(355, 13, '70316514-8ce6-4a08-9f9c-2482face4482', 'tAJxQj8zZPdlCNmrY-mcTUeGuU8RXG94GQLjW7a6TRY=', 'Chrome Browser', 'web', '58.10.153.107', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 20:57:46', '2025-10-25 20:51:44', 0, '2025-09-25 20:51:44', '2025-09-25 20:57:46'),
(356, 8, '48728951-6aca-4201-b5e1-ce86dc252acd', 'ZThPyMcteVuStSP4qsHIUS74ndbrhnvvI6PJOz9_LvM=', 'Chrome Browser', 'web', '58.10.72.179', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-25 21:10:22', '2025-10-25 21:10:06', 1, '2025-09-25 21:10:06', '2025-09-25 21:10:22'),
(357, 13, 'ce21f936-f5b2-4070-8b9f-1f578a0bb4a1', 'UhH4xnBxO2jqDTUtNZ-64BsgL33gS6kCoz8o9wZBJY4=', 'Chrome Browser', 'web', '58.10.153.107', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-26 00:22:28', '2025-10-25 21:18:13', 1, '2025-09-25 21:18:13', '2025-09-26 00:22:28'),
(358, 13, 'd9d44174-fca9-4afa-a4b8-38d9ca60d6ba', 'clwBnBZuB9MXzOIK3Z5OYvyg1tHu4LPSbfqGTSPGLxM=', 'Chrome Browser', 'web', '58.10.71.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-26 08:42:14', '2025-10-26 06:26:48', 0, '2025-09-26 07:26:48', '2025-09-26 08:42:14'),
(359, 12, '6e7243d1-cd17-417b-8741-dc730dbac657', 'wuzezSMa9SHhXM1zkgtYkgqkjPJKF9rFcuvbHghlCvg=', 'Chrome Browser', 'web', '58.10.71.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-26 08:47:09', '2025-10-26 07:42:22', 0, '2025-09-26 08:42:22', '2025-09-26 08:47:09'),
(360, 13, 'cf561ace-3aae-4f15-87fe-df5395a4063e', 'TTdbyCMqnqSIv6_vi9kMTi1jOGhQkRY5frfw8uy0vTs=', 'Chrome Browser', 'web', '58.10.71.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-26 16:13:08', '2025-10-26 07:47:15', 0, '2025-09-26 08:47:15', '2025-09-26 16:13:08'),
(361, 8, '5902f3bc-35cf-42cb-8e4b-49272ae5fe4d', 'RMVXcxouxmrWU1A27yjHNs8WC1wZoHUN6XpVQnORejY=', 'Chrome Browser', 'web', '58.10.72.179', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-26 14:37:36', '2025-10-26 10:25:27', 1, '2025-09-26 11:25:27', '2025-09-26 14:37:36'),
(362, 8, 'd0884ae4-425c-4fcb-b5e4-4435397747f7', 'e3F-wKrYVvMXzKf4jtVrfSID6f_IOm_DAu2pxmz-RYs=', 'Chrome Browser', 'web', '58.10.72.179', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-26 16:28:19', '2025-10-26 13:52:24', 1, '2025-09-26 14:52:24', '2025-09-26 16:28:19'),
(363, 7, '74f5cc33-9543-42ed-b9bc-14ec233a14e9', 'SAm_OW1LFfBTLG3UAOSwkmZV2nAEYjBA6lbWL3FPj8E=', 'Chrome Browser', 'web', '58.10.71.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-26 17:13:21', '2025-10-26 15:13:22', 1, '2025-09-26 16:13:22', '2025-09-26 17:13:21'),
(364, 7, 'be37a462-9a91-44d8-a011-23cc42101f57', 'NvYADWK9cokdzsZk2KAHInsyfP9FWhIPdb21AuQ9wy8=', 'Chrome Browser', 'web', '58.10.71.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-26 21:27:22', '2025-10-26 16:14:12', 1, '2025-09-26 17:14:12', '2025-09-26 21:27:22'),
(365, 8, '344f1a4b-9636-4995-8e72-354eb9b6dfb7', 'BI65LxPZXkrirCYm7GYn30AiJ3lDxljtZdJDBXAK-_Q=', 'Chrome Browser', 'web', '58.10.72.179', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-26 18:41:41', '2025-10-26 17:22:42', 1, '2025-09-26 18:22:42', '2025-09-26 18:41:41'),
(366, 8, '8cc448b9-6266-40ca-a7e4-4472557a389d', 'o_mIb1dRJnSmzAuLJqDkvJXRAra16xE-OwyjtuMbVUM=', 'Chrome Browser', 'web', '58.10.72.179', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-26 20:09:32', '2025-10-26 18:26:42', 1, '2025-09-26 19:26:42', '2025-09-26 20:09:32'),
(367, 8, '996f9b7a-104c-4ed2-a091-dc16e00527f9', 'kXr_i_7NALvGdKrFJcDr6TYEulu7yLpi4_NTMP8drRI=', 'Chrome Browser', 'web', '58.10.72.179', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-26 22:21:19', '2025-10-26 19:36:35', 1, '2025-09-26 20:36:35', '2025-09-26 22:21:19'),
(368, 8, 'd324eb92-bc44-4b17-919c-1c915a7fc31e', 'lvb_pzrdffN62Gllsp0-arX8oV2yHJE44b1YlPCOOLM=', 'Chrome Browser', 'web', '58.10.72.179', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-27 00:11:55', '2025-10-26 22:15:36', 1, '2025-09-26 23:15:36', '2025-09-27 00:11:55'),
(369, 8, '7edd1d86-9059-45fb-a2ba-3681c0da5eb1', 'EMCeT2W6BIzZBx91np7MRVcX0bWYUraW9EiJ2jcPPr4=', 'Chrome Browser', 'web', '58.10.72.179', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-27 00:38:36', '2025-10-26 23:21:54', 1, '2025-09-27 00:21:54', '2025-09-27 00:38:36'),
(370, 7, '78dedfaf-1fdf-439d-a30f-3f27ba30f2a5', 'EwiASFctbTs9M77Lx53BuPA89Wo1UlgFmB0dvGdnW5Y=', 'Chrome Browser', 'web', '58.10.71.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-27 05:04:57', '2025-10-27 03:54:15', 0, '2025-09-27 04:54:15', '2025-09-27 05:04:57'),
(371, 7, '1f0b8e05-ab00-4de9-bbbe-f1bfd58f4cbf', 'mXQneMpzUiAx76nyHYMs_piD1NWps8iqT9NhMxLvqQo=', 'Chrome Browser', 'web', '202.28.118.74', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-27 04:56:08', '2025-10-27 03:55:52', 0, '2025-09-27 04:55:52', '2025-09-27 04:56:08'),
(372, 8, 'd065b2ad-5abb-404b-8818-1c7ec09ba2f4', 'DZ7obYirPxAEjcMgmckvWuyDD2S6VXC1BEBeBN6hPhc=', 'Chrome Browser', 'web', '202.28.118.74', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-27 04:56:45', '2025-10-27 03:56:10', 0, '2025-09-27 04:56:10', '2025-09-27 04:56:45'),
(373, 7, 'fd380bfe-f890-4f6b-a8d2-df7cc970ca7a', '5R3d2H8FNBoZuoLmo9HkQVzmi7VCPTqXadBD2HdrY9o=', 'Chrome Browser', 'web', '202.28.118.74', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-27 04:58:25', '2025-10-27 03:56:47', 0, '2025-09-27 04:56:47', '2025-09-27 04:58:25'),
(374, 8, 'fed459f2-5d9b-4382-9327-29a5e31e47d4', 'U1DHrOPzkALq7jpexWAsac4V8fkjWKDceUDtBG5tsl0=', 'Chrome Browser', 'web', '202.28.118.74', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-27 05:59:18', '2025-10-27 03:58:27', 1, '2025-09-27 04:58:27', '2025-09-27 05:59:18'),
(375, 13, '2563247b-d804-4503-ba3c-227055096820', 'nPqcQvvLWZX5y6FRxrFklm7fC4WlFY8xV5Z1Z8BTMC0=', 'Chrome Browser', 'web', '58.10.71.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-27 05:13:24', '2025-10-27 04:05:07', 0, '2025-09-27 05:05:07', '2025-09-27 05:13:24'),
(376, 7, 'd4677e60-2902-4a9c-ac44-b8db3c53fb60', 'BRMGWedavtB8xzSpslgsYR_DdOkvLfIlO_kZ7tKp8dY=', 'Chrome Browser', 'web', '58.10.71.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-27 05:15:33', '2025-10-27 04:13:31', 0, '2025-09-27 05:13:31', '2025-09-27 05:15:33'),
(377, 13, 'a5495e8f-0388-4df4-8191-643cd70d087c', '4aCLC6gDsACP8opSj5nbBNt9lkaaj3kH5GoA_uVi4vs=', 'Chrome Browser', 'web', '58.10.71.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-27 05:19:39', '2025-10-27 04:15:51', 0, '2025-09-27 05:15:51', '2025-09-27 05:19:39'),
(378, 7, '5fb5d574-aae2-482e-b816-8a02f0b5e99c', 'eNjW2eLm5WXZgZcTiu6TI42uJG0ZJcNxyMdnIEOUTnE=', 'Chrome Browser', 'web', '58.10.71.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-27 05:35:06', '2025-10-27 04:19:46', 0, '2025-09-27 05:19:46', '2025-09-27 05:35:06'),
(379, 8, 'c2daa351-d745-4c80-8b18-a6ecbf0f4d4e', 'ASc8UkEi6exZh7yhElyTseu1LExthq7a5hdkz7FzWaw=', 'Chrome Browser', 'web', '58.10.71.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-27 05:54:47', '2025-10-27 04:35:11', 0, '2025-09-27 05:35:11', '2025-09-27 05:54:47'),
(380, 7, '4673482c-f015-497e-9168-dfab58d07a74', 'gejn0BiryY94FQ81ZPZGq9AbO3aUHUu-Bkw6gwitqWA=', 'Chrome Browser', 'web', '58.10.71.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-27 05:56:12', '2025-10-27 04:55:05', 0, '2025-09-27 05:55:05', '2025-09-27 05:56:12'),
(381, 13, 'f64e30fc-9235-43e6-87a5-f18a87c059cd', 'Z53RqrrMfUHpWoS9u_m9B2cwvsPB0SvOzJivxy2_gmk=', 'Chrome Browser', 'web', '58.10.71.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-27 05:56:22', '2025-10-27 04:56:18', 1, '2025-09-27 05:56:18', '2025-09-27 05:56:22'),
(382, 7, 'fc1209f9-5eda-4084-b212-d85b82e4847b', 'qj_fpp4fs8DcKgYb-7UqCwUE68jQ_K1zndeL9LJsj_0=', 'Chrome Browser', 'web', '58.10.152.207', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-29 11:46:47', '2025-10-29 08:22:44', 1, '2025-09-29 09:22:44', '2025-09-29 11:46:47'),
(383, 8, '3b4c4e6d-919d-4254-97f1-1f6472182bc1', 'l0GJvIQB7krB-gXmMMWu1UtnSSlFKCjlXUnwVrUXoc8=', 'Chrome Browser', 'web', '58.10.72.49', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-29 12:04:19', '2025-10-29 11:03:51', 0, '2025-09-29 12:03:51', '2025-09-29 12:04:19'),
(384, 7, 'd156a201-7747-47cf-b316-88f41b7f59e0', 'yaDppk0SMZ7C-v2JDxziWucPGputer38GxXPFfRm7Zk=', 'Chrome Browser', 'web', '58.10.72.49', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-29 12:06:59', '2025-10-29 11:04:21', 0, '2025-09-29 12:04:21', '2025-09-29 12:06:59'),
(385, 8, '524a06f7-fdb7-4c37-8b16-96771ed16f75', 'bXPvjnJ8j0PB6dQF4LCYTRVPJiNs53cvCn3vayN_RDE=', 'Chrome Browser', 'web', '58.10.72.49', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-29 16:42:02', '2025-10-29 11:07:02', 1, '2025-09-29 12:07:02', '2025-09-29 16:42:02'),
(386, 7, 'dbe2604f-ec2b-4f02-8660-6cbbf1968dbb', '3L_F9QZjpFzxcaFpxKmbm7nGSBVxusiPVEuy1ElEFiQ=', 'Chrome Browser', 'web', '58.10.152.207', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-29 13:17:23', '2025-10-29 11:34:32', 1, '2025-09-29 12:34:32', '2025-09-29 13:17:23'),
(387, 7, 'aef5198b-5fc4-42e2-acbe-d0a4fd4ccc41', 'Q45MHiUiWnDHPELwGKHyC6gGL6JoLe-AlVp9ydtgYFc=', 'Chrome Browser', 'web', '58.10.152.207', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-30 00:19:47', '2025-10-29 16:54:47', 1, '2025-09-29 17:54:47', '2025-09-30 00:19:47'),
(388, 8, '6dd081f6-e30b-4850-a9eb-ebddf8f86c9e', 'o1rH4g0Q1iO7QOLjxs_AexgBSbzNJC7S1g-WI_P4Nrk=', 'Chrome Browser', 'web', '58.10.72.49', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-30 12:12:55', '2025-10-30 11:11:20', 1, '2025-09-30 12:11:20', '2025-09-30 12:12:55'),
(389, 7, '23ec269e-7e68-4b87-bbcb-4a95c54b705a', 'P6K4c4MQ2j90bi4VXYe1cmJuhkJX_RZ0_MVTSGS_QG0=', 'Chrome Browser', 'web', '58.10.140.76', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-30 12:30:32', '2025-10-30 11:26:20', 0, '2025-09-30 12:26:20', '2025-09-30 12:30:32'),
(390, 8, 'c0af8689-a5e2-43f1-bbdd-4ac46cd95d82', 'm_fupCJR-zcYVShwPVrJAY5sW5vm-ff_gv-LK3EmuVc=', 'Chrome Browser', 'web', '58.10.140.76', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-30 12:31:03', '2025-10-30 11:30:52', 0, '2025-09-30 12:30:52', '2025-09-30 12:31:03'),
(391, 13, 'b6cd0263-a945-4665-898a-0009cf0bac60', 're_6X4wQnnbCpdNzGXGrdc1hlAtprlNxmTD1iotgZZc=', 'Chrome Browser', 'web', '58.10.140.76', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-30 12:31:29', '2025-10-30 11:31:08', 0, '2025-09-30 12:31:08', '2025-09-30 12:31:29'),
(392, 7, '45bda1a6-27e8-40c8-9d92-349c6da0c87b', 'VcM9_606mfIpNQAwm_Y5PeVTw9jNgwj4JxJlE5tFevs=', 'Chrome Browser', 'web', '58.10.140.76', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-30 12:34:59', '2025-10-30 11:34:39', 0, '2025-09-30 12:34:39', '2025-09-30 12:34:59'),
(393, 8, 'ae4493f9-3be1-4219-a344-851b17a83dfb', 'JVRp_zSxSPPHQ6kfm8_JbIBcLOFloUPeQSNooInCeCo=', 'Chrome Browser', 'web', '58.10.72.49', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-30 13:44:57', '2025-10-30 12:40:56', 1, '2025-09-30 13:40:56', '2025-09-30 13:44:57'),
(394, 8, 'abd1922b-b884-439f-b1a5-1cf6c66d56f2', 'U7UPoXbcMTbmoTObve8oVrbcDJ4s7xjwOsnT4YuYDcM=', 'Chrome Browser', 'web', '58.10.72.49', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-30 15:02:47', '2025-10-30 14:02:22', 1, '2025-09-30 15:02:22', '2025-09-30 15:02:47'),
(395, 8, '22d49554-853b-4bfb-9a62-cc0cbbd0f962', 'IyIYChkgrGIvSKGMfX3v0-RLqYBaMYb0b4I0T9n3bE0=', 'Chrome Browser', 'web', '58.10.72.49', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-01 13:18:10', '2025-10-31 12:13:42', 1, '2025-10-01 13:13:42', '2025-10-01 13:18:10'),
(396, 13, 'a8a82bb9-ebe6-46e5-9111-ae9f1e161fc2', 'Q-pAz5mE5YHFfkEVvo94h3o3cegrI9vjJ9neEJvmA-U=', 'Chrome Browser', 'web', '124.121.173.22', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-01 17:36:14', '2025-10-31 16:07:07', 1, '2025-10-01 17:07:07', '2025-10-01 17:36:14'),
(397, 8, '28c8e827-40e4-458e-bb7e-3c2bcdc32c33', 'zOHdvy7d5kDtbvknZLO3pYpQWxZs95shQVHykEoG5fM=', 'Chrome Browser', 'web', '58.10.72.49', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-01 20:52:48', '2025-10-31 19:49:03', 1, '2025-10-01 20:49:03', '2025-10-01 20:52:48'),
(398, 8, 'cdad021f-377a-4a4a-b557-f104caa30a4d', 'P6yaokYV_Cma0MmGMKS3JnFmrC6wPo7ok0ZC5ZV423o=', 'Chrome Browser', 'web', '58.10.72.49', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-02 00:33:53', '2025-10-31 23:32:49', 1, '2025-10-02 00:32:49', '2025-10-02 00:33:53'),
(399, 8, '6315f856-52a9-474e-8796-65109596385c', 'liVU0RGJCYsDStYNDRbY-PWJA7bg6iYNq27vnwVgWfQ=', 'Chrome Browser', 'web', '58.10.72.49', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-02 12:35:55', '2025-11-01 09:56:34', 0, '2025-10-02 10:56:34', '2025-10-02 12:35:55'),
(400, 13, 'dd5e177e-fa03-440c-9ddd-84fcd60ebfe3', 'cCd1jLeBZXzTkTdtC4c_a5cFROikta5r5SFjsOsVvMU=', 'Chrome Browser', 'web', '171.97.76.248', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-02 17:03:37', '2025-11-01 11:28:38', 1, '2025-10-02 12:28:38', '2025-10-02 17:03:37'),
(401, 7, '9bd709c0-ed08-48b6-ae86-be2c0f7a340e', '9OzwcqGcl6m0WZhRCaIb2MF5X6chMOqWfo4aNCinnMM=', 'Chrome Browser', 'web', '58.10.72.49', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-02 12:37:18', '2025-11-01 11:35:57', 0, '2025-10-02 12:35:57', '2025-10-02 12:37:18'),
(402, 8, 'fc017eaf-71e9-43db-998f-bd7960c9d33b', 'uo50Xw8A8qGq881v90-gxz8l0RI4I09iSNpEtTOLz3Q=', 'Chrome Browser', 'web', '58.10.72.49', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-02 15:26:50', '2025-11-01 11:37:21', 1, '2025-10-02 12:37:21', '2025-10-02 15:26:50'),
(403, 8, 'e62d4e6b-6953-4113-ab7b-ffcdfa208bd1', 'oVEFDPZPnDnNfwpNDkS9uHY5pePbi2PJDYKvYIqHGi8=', 'Chrome Browser', 'web', '58.10.72.49', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-02 15:43:15', '2025-11-01 14:41:56', 0, '2025-10-02 15:41:56', '2025-10-02 15:43:15'),
(404, 7, '861d6412-20b3-4d48-9940-c53ebaacf9cf', '_RoO7hWZmGINcbSa68VuYSRR7pccfBXKFVgqmI1FHBc=', 'Chrome Browser', 'web', '58.10.72.49', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-02 15:48:47', '2025-11-01 14:43:18', 0, '2025-10-02 15:43:18', '2025-10-02 15:48:47'),
(405, 8, 'db07781a-e226-4557-b3ba-c8baaa41c63a', 'QK9QdaG-1Ws_UBNVPhfRBVgH_2WhZlpgkL9plWpqdoE=', 'Chrome Browser', 'web', '58.10.72.49', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-02 17:38:49', '2025-11-01 14:48:49', 1, '2025-10-02 15:48:49', '2025-10-02 17:38:49'),
(406, 13, '4de52b9e-8f3c-45cd-84ef-75330d821ae5', 'iO3qVtW4BfL910SK-a4a9ww7-OJtOonDAy4cfr02BGA=', 'Chrome Browser', 'web', '110.168.236.56', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-03 13:38:24', '2025-11-02 10:27:59', 0, '2025-10-03 11:27:59', '2025-10-03 13:38:24'),
(407, 13, '3e5a7672-1a2b-48cc-bf6f-80fb98957c73', 'TOXUKDj6NsQl9k6A4VrUKabfV1K4mJovh_qN_M0px7c=', 'Chrome Browser', 'web', '202.12.97.133', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-03 12:56:24', '2025-11-02 11:55:49', 0, '2025-10-03 12:55:49', '2025-10-03 12:56:24'),
(408, 7, '2b344079-c49b-4e36-9305-2b895cc853a0', 'BdWzAMQlTnL5DBJSVBcgigS6BVGnBiSLniO6esQK-fs=', 'Chrome Browser', 'web', '202.12.97.133', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-03 12:56:56', '2025-11-02 11:56:28', 1, '2025-10-03 12:56:28', '2025-10-03 12:56:56'),
(409, 7, '3c8d9641-5de1-4b91-b575-ce1f79cf3f74', 'FOUX_ve6rwG34hguDvYYthIET97tkKX6ic4iLHEX1rc=', 'Chrome Browser', 'web', '110.168.236.56', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-03 13:40:21', '2025-11-02 12:38:29', 0, '2025-10-03 13:38:29', '2025-10-03 13:40:21'),
(410, 13, '74ca9e2e-0e86-457d-ba6b-6c74d1c1db35', '3dm_HG8931mtl5UfKRCdFxEe9BQuiHhSU-4hDzl6zP4=', 'Chrome Browser', 'web', '110.168.236.56', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-03 14:37:30', '2025-11-02 12:40:30', 1, '2025-10-03 13:40:30', '2025-10-03 14:37:30'),
(411, 13, '97cd8059-8b87-4ffb-840c-a69a96f41bed', '3vA95Lleb8BHAeMFV3zROLS9lowW37WqjCVp8ITtImE=', 'Chrome Browser', 'web', '110.168.236.56', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-03 15:45:55', '2025-11-02 13:46:02', 1, '2025-10-03 14:46:02', '2025-10-03 15:45:55'),
(412, 13, 'cce3a0dd-045b-4849-ae2b-31f17f63c9da', 'Fgie1j8_OiNwlisfqoMJQhC-4xv5ee9V5Pg2tEYaniU=', 'Chrome Browser', 'web', '110.168.236.56', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-03 15:49:59', '2025-11-02 14:46:59', 1, '2025-10-03 15:46:59', '2025-10-03 15:49:59'),
(413, 14, '170b9c28-b4a1-42f2-b2f1-a8d57f529124', 'ZegguyU7uTNKuo2_ENveLmyqNlGobxF4MhN43DyMbds=', 'Chrome Browser', 'web', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-03 07:20:01', '2025-11-02 05:59:46', 0, '2025-10-03 06:59:46', '2025-10-03 07:20:01'),
(414, 14, 'f3ba177a-56c6-4699-9891-8bc32d1280f0', 'gVBwKQ7JWpINg0GFlOqH-o5yv8qFJ1RPYakMBhkusI0=', 'Chrome Browser', 'web', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-04 01:07:49', '2025-11-03 00:07:45', 0, '2025-10-04 01:07:45', '2025-10-04 01:07:49'),
(415, 15, '9221daa1-1ee4-4d70-b770-6d9aaaa23e65', 'qfiIrf6em62JL34TZsX-t2s3FBtPHtNhQKCcpQY536g=', 'Chrome Browser', 'web', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-04 02:09:41', '2025-11-03 00:07:55', 0, '2025-10-04 01:07:55', '2025-10-04 02:09:41'),
(416, 14, 'c8b037b5-6565-4db5-b310-c949a9ad490e', '0kO34XpFDqID0AcIi5t7FjcuZ9KEg0BvAhzMiaJ6rCQ=', 'Chrome Browser', 'web', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-04 02:11:42', '2025-11-03 01:09:45', 0, '2025-10-04 02:09:45', '2025-10-04 02:11:42'),
(417, 15, '592ac0ad-7a29-4c27-8d7c-e9237eecf70d', '33sINqUCT4oXDXZ82x4BV08ew04MhaYRx3olHDyNh0E=', 'Chrome Browser', 'web', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-04 03:54:44', '2025-11-03 01:11:45', 1, '2025-10-04 02:11:45', '2025-10-04 03:54:44'),
(418, 14, '1471bd66-2270-48f9-927e-c98d26111dde', 'Ee69lbVONqdiL3a_NLDoZeilN4q7FnO6pvMALcFSZ5g=', 'Chrome Browser', 'web', '10.48.104.22', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-04 04:11:27', '2025-11-03 03:10:29', 1, '2025-10-04 04:10:29', '2025-10-04 04:11:27'),
(419, 15, '497fb5e8-4f60-4056-953b-fe872a35bb43', 'xoZLfcY2lIet4OCZiAG0QjkUGhw92KjosrN89Qg0Ez8=', 'Chrome Browser', 'web', '10.48.108.28', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-04 07:46:52', '2025-11-03 03:16:14', 0, '2025-10-04 04:16:14', '2025-10-04 07:46:52'),
(420, 1027, '20039555-0824-49d3-ade0-42c218e18b93', '2h3CkkBTnbzbKF4g0YfzzThexpcOCQXiKZOQDOfo--w=', 'Chrome Browser', 'web', '10.48.108.28', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-04 08:51:17', '2025-11-03 06:47:04', 1, '2025-10-04 07:47:04', '2025-10-04 08:51:17'),
(421, 1027, '6aa8ed55-5fb1-464b-8ccb-568f236e420d', 'suvvHkmTnO-GnJ6w2JRDNwpyA3Og7WeoOMuTSF8N-ps=', 'Chrome Browser', 'web', '10.48.108.28', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-04 07:47:53', '2025-11-03 06:47:51', 1, '2025-10-04 07:47:51', '2025-10-04 07:47:53'),
(422, 14, '3d913fe2-2843-4a71-8690-7364e5cbcb68', 'pF_hq67ZKf4uJWqmJIDLdRCsI7S_W9bSHjta3DstWaA=', 'Chrome Browser', 'web', '10.198.110.27', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-04 08:42:17', '2025-11-03 07:25:42', 0, '2025-10-04 08:25:42', '2025-10-04 08:42:17'),
(423, 1027, 'ee556143-3b2f-4216-b27c-7aa75a9b6276', '3qSXHvft7sQlFnaXaCE0nDw-wbn8Jp0wLLbBcRj9TnQ=', 'Firefox Browser', 'web', '10.48.104.20', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0', '2025-10-04 09:35:03', '2025-11-03 07:26:30', 0, '2025-10-04 08:26:30', '2025-10-04 09:35:03'),
(424, 14, '5460d5a0-041b-4f23-bd75-175f769845b0', 'lfDs_i10JIk2hQ3nxIdRtz0mh3NKVs84tS9c1m2VV18=', 'Chrome Browser', 'web', '10.48.108.28', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-04 08:32:57', '2025-11-03 07:30:36', 1, '2025-10-04 08:30:36', '2025-10-04 08:32:57'),
(425, 15, 'd4873fd4-8ca3-451a-be93-c3cd896bbf36', 'eDiYnl0lolgholhYEYeYZXxLGgSUIWEn1QZvPbb8skM=', 'Chrome Browser', 'web', '10.198.110.27', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-04 10:35:53', '2025-11-03 07:42:21', 0, '2025-10-04 08:42:21', '2025-10-04 10:35:53'),
(426, 16, '21e76f7c-a0fe-42d1-9899-095c0313c1c4', '-7TwddswLyBCbdra8UsB5TD0IaI0XEKMCYZb_k4LpXo=', 'Chrome Browser', 'web', '10.48.104.38', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-04 08:58:23', '2025-11-03 07:57:59', 1, '2025-10-04 08:57:59', '2025-10-04 08:58:23'),
(427, 14, 'ce8299e7-a968-4679-ae3a-26329b74049f', 'LWJKO_c2SxDWqKtU7LT3kL6BIh2pUrEZLzrWiHa8Fxs=', 'Chrome Browser', 'web', '10.48.108.28', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-04 09:06:32', '2025-11-03 08:00:17', 1, '2025-10-04 09:00:17', '2025-10-04 09:06:32'),
(428, 1027, 'c450d8e6-5e25-48ff-ad92-54dba350c303', '6DeGbufVAI56NsWfW5G_snOw_bXtVLxE4T91oEBysDs=', 'Firefox Browser', 'web', '10.48.104.20', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0', '2025-10-04 09:41:24', '2025-11-03 08:35:08', 1, '2025-10-04 09:35:08', '2025-10-04 09:41:24'),
(429, 15, '08a710a7-2413-4f09-8246-8d2d09b7424e', '9N9tqCX550n6A0zKs4iUUKUnvPsQXEmE0hX-D2KcLh8=', 'Chrome Browser', 'web', '10.48.108.28', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-04 09:36:57', '2025-11-03 08:36:13', 1, '2025-10-04 09:36:13', '2025-10-04 09:36:57'),
(430, 15, '0e74cec2-3c02-4b6b-ba4d-17616de80843', 'iyG_e3pHDrfM7lb6eHNG_yQori2ocOBasVXvlcioaQE=', 'Chrome Browser', 'web', '10.198.110.27', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-04 13:35:03', '2025-11-03 09:36:25', 1, '2025-10-04 10:36:25', '2025-10-04 13:35:03'),
(431, 1027, 'c7eaf068-16b1-40de-b30d-b96a004785fd', '23_X4bg7-v3hdpER_Arz-2br2ydF5EeTqOCduWkD0lI=', 'Firefox Browser', 'web', '10.48.104.49', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0', '2025-10-04 21:51:51', '2025-11-03 19:47:06', 1, '2025-10-04 20:47:06', '2025-10-04 21:51:51'),
(432, 1027, 'c811de09-fb7d-4b14-843e-1158a9af67e7', 'a1XlbcotQp5F0KxzkOXChqjP1GkSzQjNefpyKKag6LE=', 'Firefox Browser', 'web', '10.48.104.49', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0', '2025-10-05 01:24:06', '2025-11-04 00:15:10', 1, '2025-10-05 01:15:10', '2025-10-05 01:24:06'),
(433, 15, '1a005c32-3eda-4014-91ce-812d075cb965', 'lldlwCd2WbrtYy2yRT6CZUsbeTzwI477-ftWPgudElo=', 'Chrome Browser', 'web', '10.198.110.27', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-05 01:47:33', '2025-11-04 00:40:15', 0, '2025-10-05 01:40:15', '2025-10-05 01:47:33'),
(434, 14, '4baca294-9bce-4482-b9c2-305873f09fef', 'vX4hmllSdFW7vbiZyKyk5gX2h1lf3eJEcpBwUnqd2q8=', 'Chrome Browser', 'web', '10.198.110.27', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-05 01:49:02', '2025-11-04 00:47:40', 0, '2025-10-05 01:47:40', '2025-10-05 01:49:02'),
(435, 15, '97f2a788-34ec-4458-a976-71d9f2ed42cd', 'mQzsiitkfiYcBmKprlKq7dNkP0MrSWY6YZqjeUEZA0o=', 'Chrome Browser', 'web', '10.198.110.27', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-05 02:12:32', '2025-11-04 00:49:25', 0, '2025-10-05 01:49:25', '2025-10-05 02:12:32'),
(436, 16, '59cb6cab-5b99-480f-b879-4b73d478a319', 'yV5Eoz1DtX9JP7TT2cTARJ2Ri7okhSyhKJVZWMwd9t0=', 'Chrome Browser', 'web', '10.198.110.27', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-05 02:13:28', '2025-11-04 01:12:51', 0, '2025-10-05 02:12:51', '2025-10-05 02:13:28'),
(437, 14, '6f3ef09f-a577-4a9a-a02d-57557130e695', 'K94PXNloJfxzqSe0NWSMCIMl07zV4ZyL5f7RucIYf5Y=', 'Chrome Browser', 'web', '10.198.110.27', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-05 02:37:11', '2025-11-04 01:13:33', 0, '2025-10-05 02:13:33', '2025-10-05 02:37:11'),
(438, 15, '3db0add2-50ac-46f6-a09a-54f95621c89b', '29vFXGCIbJcMYDH6pxLDizpzVmQDvt9imaFkoHBzPrk=', 'Chrome Browser', 'web', '10.198.110.27', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-05 02:45:18', '2025-11-04 01:37:16', 0, '2025-10-05 02:37:16', '2025-10-05 02:45:18'),
(439, 16, '19e7917f-d9b2-44cc-a67c-2b075226a32e', 'ed_FYTfWUZjsZbcqWRTrmPMyH9o2rDQJbatySL6Vu5U=', 'Chrome Browser', 'web', '10.198.110.27', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-05 04:57:12', '2025-11-04 01:45:23', 0, '2025-10-05 02:45:23', '2025-10-05 04:57:12'),
(440, 14, '5fa3e8ec-9452-439f-b7cd-a8e327369e94', 'YIWkKON1okvqXpmVSyVDxFHP7TYszm-ELQjv3RcpvrM=', 'Chrome Browser', 'web', '10.198.110.27', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-06 01:47:46', '2025-11-04 03:57:18', 1, '2025-10-05 04:57:18', '2025-10-06 01:47:46'),
(441, 1027, 'ec1ed63a-9286-4e76-9564-0f1645b97fca', 'tdqqyua_ESCgcRvSTDA9Z9J_VOczLzcGCArpOMs_SXA=', 'Chrome Browser', 'web', '10.54.62.22', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-05 23:49:55', '2025-11-04 22:12:57', 0, '2025-10-05 23:12:57', '2025-10-05 23:49:55'),
(442, 1039, 'a0d7d756-7db2-4e37-b7af-49a0881c687f', '5p8aLvBYcT2vjH8wUIbICIDD09QWFnZNBzPR9jQAZ_Q=', 'Chrome Browser', 'web', '10.48.108.58', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-06 00:14:31', '2025-11-04 22:48:20', 0, '2025-10-05 23:48:20', '2025-10-06 00:14:31'),
(443, 1039, '8548c6d5-e931-4432-aefb-80e4f5a74517', '6TxO1dWLaGykImIc_nKF70QBx2I9ZJ9DRBRINXxp7H0=', 'Chrome Browser', 'web', '10.54.62.22', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-05 23:54:45', '2025-11-04 22:50:18', 1, '2025-10-05 23:50:18', '2025-10-05 23:54:45'),
(444, 14, 'd1e2738e-354c-41b2-9072-46c86f93f946', 'qUl6-V5VqJipsxvEnYTRkfE5AJ-RQQlGMAjn5j1Qvik=', 'Chrome Browser', 'web', '10.198.110.27', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-06 04:37:51', '2025-11-05 02:03:29', 1, '2025-10-06 03:03:29', '2025-10-06 04:37:51'),
(445, 14, '222c470f-413d-4dfe-8372-22b8deb92870', 'dX2r4enLKUlSEvlHi3Y5YM1EFvfngASzcWQy2_EjDpM=', 'Chrome Browser', 'web', '10.48.108.58', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-06 03:36:38', '2025-11-05 02:36:36', 1, '2025-10-06 03:36:36', '2025-10-06 03:36:38'),
(446, 1027, '4b2270e3-1766-482e-ba04-1c4f2f038c22', 'uWmyn0ZnqzO_teBiDbNtl6Vka_e8wkQAWU4yx2_7v3o=', 'Firefox Browser', 'web', '10.48.104.72', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0', '2025-10-06 04:25:07', '2025-11-05 02:49:01', 0, '2025-10-06 03:49:01', '2025-10-06 04:25:07'),
(447, 1027, '1c531454-c180-47d3-b09c-dd18c4af040a', 'tEqax1C41xM9vsT0SlP48QTm-kSKxVnFiRVo-v23Kec=', 'Firefox Browser', 'web', '10.48.104.63', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0', '2025-10-07 01:56:53', '2025-11-06 00:41:31', 1, '2025-10-07 01:41:31', '2025-10-07 01:56:53'),
(448, 15, '915ff7bb-4316-41fb-9613-5877b3e4d560', 'qZDmpQP8jsbM_pxyXQ2yTf3GcXhcVeyxRdAVg8g7IbA=', 'Chrome Browser', 'web', '10.198.110.27', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-07 04:24:05', '2025-11-06 01:03:33', 0, '2025-10-07 02:03:33', '2025-10-07 04:24:05'),
(449, 1027, '31fb5c3b-b70a-484f-a9d4-cd202535daff', 'KCpE4tMzLLRF8YAtiMTSSSdmTvWdo2-5j5BAg4zVw84=', 'Chrome Browser', 'web', '10.48.108.26', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 03:16:31', '2025-11-06 02:16:28', 1, '2025-10-07 03:16:28', '2025-10-07 03:16:31'),
(450, 14, '22386ebb-86d5-4ebe-a523-ae6377b486bb', 'cWo-wI85b41ceL_P1lzFQ7QzIqwkAuuw7ITz9K5Rgic=', 'Chrome Browser', 'web', '10.198.110.27', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-07 04:33:28', '2025-11-06 03:24:09', 0, '2025-10-07 04:24:09', '2025-10-07 04:33:28'),
(451, 15, 'dafd2553-8c13-4efc-97b4-0456e5105686', 'GvXqIBMFgo7SGgRWkzCqfEzmiB_YW3jd_kIXS2huVxs=', 'Chrome Browser', 'web', '10.198.110.27', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-07 04:33:34', '2025-11-06 03:33:32', 0, '2025-10-07 04:33:32', '2025-10-07 04:33:34'),
(452, 1027, 'a1d47865-9216-4c2e-a088-dc6791f7256f', 'm-W0fZX9za1knSORZnIHi-ulYPgCfMhTiRTEKHHvzzI=', 'Chrome Browser', 'web', '10.198.110.27', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-07 04:35:00', '2025-11-06 03:33:51', 0, '2025-10-07 04:33:51', '2025-10-07 04:35:00'),
(453, 15, '2cc17431-3990-4435-98da-f68f331e1669', '4TW9TJi9DISZZYxXYQ7hb-rpTMNmenG8t2da3t3C_38=', 'Chrome Browser', 'web', '10.198.110.27', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-07 04:47:35', '2025-11-06 03:35:04', 0, '2025-10-07 04:35:04', '2025-10-07 04:47:35'),
(454, 15, '78d7f222-2b1f-42f3-aa79-21dac3abd9b8', 'Rvvx_pf_pyE85knhOWBGlL7aqmzU_EMJ6UDPx7JNwzY=', 'Chrome Browser', 'web', '10.198.110.27', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-08 02:07:14', '2025-11-06 03:55:13', 0, '2025-10-07 04:55:13', '2025-10-08 02:07:14'),
(455, 1027, '94e39a29-4a55-460b-84ff-167e630e28c1', '_w7yD4lT3Q5EWy2RRGrPV7A23dOHCcK-Cyj0EHuWN3E=', 'Firefox Browser', 'web', '10.48.104.101', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0', '2025-10-07 09:24:58', '2025-11-06 08:24:05', 1, '2025-10-07 09:24:05', '2025-10-07 09:24:58'),
(456, 1027, '03908607-340d-44f9-8e10-fdd9ef81e655', 'oQVaa6KVsSKf1MQ1nkYefYcvi4pJW6_TOoVEIlW3pEA=', 'Firefox Browser', 'web', '10.48.104.20', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0', '2025-10-08 02:42:45', '2025-11-07 00:56:34', 1, '2025-10-08 01:56:34', '2025-10-08 02:42:45'),
(457, 14, '1a226b13-5a65-4b16-a9a3-a3f73ad3bf95', 'K3GIT9Vzf8xeXaSYGEKeXM_6FYRmk9ZeVVhZDrh8nBg=', 'Chrome Browser', 'web', '10.198.110.27', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-08 02:47:00', '2025-11-07 01:07:18', 0, '2025-10-08 02:07:18', '2025-10-08 02:47:00'),
(458, 14, '07d1ff4a-1bf8-4e7b-bbf5-f8a4e5bc8eb0', 'RUVMJhwd_dtPlXMNSfW1_CXcAFNIY7SLlXYliN2Cg8c=', 'Chrome Browser', 'web', '10.48.108.49', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-08 02:11:20', '2025-11-07 01:10:59', 1, '2025-10-08 02:10:59', '2025-10-08 02:11:20'),
(459, 14, 'e90315f8-d1ea-4f1a-88ab-0ffbc68fb937', 'AjF8ETzC4PEPqlIb1_Ioc2omQBCi0uXP6GBHo9ilLis=', 'Chrome Browser', 'web', '10.48.104.48', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-08 05:05:18', '2025-11-07 01:20:18', 1, '2025-10-08 02:20:18', '2025-10-08 05:05:18'),
(460, 1027, '5f92a88e-85bd-40e6-bf7f-a03fe7983a05', 'u5B1HyXzlOT9tev3zyaktaoKXFRNj7J-cWabp2Yau1w=', 'Chrome Browser', 'web', '10.198.110.27', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-08 03:38:05', '2025-11-07 01:47:09', 0, '2025-10-08 02:47:09', '2025-10-08 03:38:05'),
(461, 15, '175660a1-e9d7-4af0-97b7-1e9c533e3fbd', 'o4L239KmKjZEmUv6DBfR4d5LSzLCdX6bljjIIcyl6h4=', 'Chrome Browser', 'web', '10.198.110.27', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-10 02:44:10', '2025-11-07 02:38:11', 1, '2025-10-08 03:38:11', '2025-10-10 02:44:10'),
(462, 1027, 'dc096047-26be-40b3-a97d-3dc6310ad04a', 'mxzeV8PBW2NyqeVvJGrB_6DUw_Ir45bsFVOHh_-ERT8=', 'Firefox Browser', 'web', '10.48.104.77', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0', '2025-10-09 20:01:01', '2025-11-08 18:59:05', 1, '2025-10-09 19:59:05', '2025-10-09 20:01:01'),
(463, 15, '22cacb96-5605-43de-990a-41bab7a860af', '0vE6myP4Q9zBaeAYZBn-vzLFXBWQKWlzaRzyYedq9Wk=', 'Chrome Browser', 'web', '10.198.110.27', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-10 03:59:56', '2025-11-09 01:58:57', 0, '2025-10-10 02:58:57', '2025-10-10 03:59:56'),
(464, 14, '368c596d-70dc-4371-8d59-35d8101e3c33', '2tIjS4ybN8aN8GHTaYx6AcRows6s9OOj2rHE6Y19C-A=', 'Chrome Browser', 'web', '10.198.110.27', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-10 04:08:48', '2025-11-09 03:00:33', 0, '2025-10-10 04:00:33', '2025-10-10 04:08:48'),
(465, 15, '1436dda6-25be-4fb9-ad99-84d5e455887a', 'czFf-pjV2xqQbg65e0JCPRrLL7zIkqP7CslRbK6bcA8=', 'Chrome Browser', 'web', '10.198.110.27', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-10 04:22:45', '2025-11-09 03:09:01', 0, '2025-10-10 04:09:01', '2025-10-10 04:22:45'),
(466, 14, 'fe9c8ff9-d942-402b-8060-8251b580ff30', 'kJzqgegkrav3U-9qzGhC325zEb3Wj0IiHesoAVTkZeA=', 'Chrome Browser', 'web', '10.198.110.27', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-10 04:35:54', '2025-11-09 03:22:53', 0, '2025-10-10 04:22:53', '2025-10-10 04:35:54'),
(467, 15, 'cd63291d-12c9-458c-b815-92073bbd4d86', 'qbRJG3qavlK1dDGu2HDCbfMd4OSLF60CJgHo2mO-OPM=', 'Chrome Browser', 'web', '10.198.110.27', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-11 04:36:38', '2025-11-09 03:35:59', 1, '2025-10-10 04:35:59', '2025-10-11 04:36:38'),
(468, 14, 'a4f21abf-380b-4967-adea-d79a4c2daa59', 'wuclPui0Z7wnQthy3Hr7vEW20udXdftt9mq3ARj6tG8=', 'Chrome Browser', 'web', '10.48.108.31', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 01:50:44', '2025-11-10 00:50:36', 1, '2025-10-11 01:50:36', '2025-10-11 01:50:44'),
(469, 14, 'a88b5b0d-3886-4752-b47c-2f8dde65bfdb', 'LeKbSuJoDdJXRgmY3I69ZoftQ4wfdoKFTyBAy9x_hvQ=', 'Chrome Browser', 'web', '10.198.110.27', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-11 11:30:37', '2025-11-10 10:30:32', 0, '2025-10-11 11:30:32', '2025-10-11 11:30:37'),
(470, 15, 'ba00a2e0-e2ff-4cb2-bc5b-740db90b46da', 'gebA9iJZF_sU7CKM1DBD1_mGlZHgx3VFa-1Jkc9ZLss=', 'Chrome Browser', 'web', '10.198.110.27', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-11 12:00:06', '2025-11-10 10:30:43', 1, '2025-10-11 11:30:43', '2025-10-11 12:00:06'),
(471, 14, '2f161be4-c925-4708-9a74-8d0fc2e7ce50', 'j_n1gkaG763MrqWzkD9FOdpLe2zjDHb8Cc-h8MYhvzM=', 'Chrome Browser', 'web', '10.198.110.27', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-11 22:59:52', '2025-11-10 21:05:24', 0, '2025-10-11 22:05:24', '2025-10-11 22:59:52'),
(472, 1027, '5e1552d7-62d9-4890-831f-057fd32ef3f9', 'aI9VNySMtoSXBncO5HTdCRBrO9szC15Fn3hHjeSre-0=', 'Chrome Browser', 'web', '10.48.108.21', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 22:56:18', '2025-11-10 21:15:02', 1, '2025-10-11 22:15:02', '2025-10-11 22:56:18'),
(473, 1027, '3ca84b8f-c2f9-44e6-ab8e-0443e7c75bb6', 'dGDiSk1NlIhC9kz_-rd92L7rFiRYw7AxxzQBifbW0xQ=', 'Firefox Browser', 'web', '10.48.104.72', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0', '2025-10-11 23:05:18', '2025-11-10 22:05:16', 1, '2025-10-11 23:05:16', '2025-10-11 23:05:18'),
(474, 15, '9be27b05-9a6e-4455-a9ad-7b149202d6cf', '-aYNUAF5cDfb9mgv_quvWw_3gycgHdGHaBzpSsP76dw=', 'Chrome Browser', 'web', '10.198.110.27', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-12 01:21:33', '2025-11-10 22:07:25', 0, '2025-10-11 23:07:25', '2025-10-12 01:21:33'),
(475, 14, '6e1961de-d843-445c-9f8e-407e5149b629', 'qLrQ0MQ_JoMFvMshi6M09WsZ82Ev--86-eU41ha0I3E=', 'Chrome Browser', 'web', '10.48.108.21', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 23:29:34', '2025-11-10 22:28:44', 0, '2025-10-11 23:28:44', '2025-10-11 23:29:34'),
(476, 14, 'b06caf04-7f0f-4607-a390-20b68779ff5e', 'Z-WFwmzNWbNQwZermc_57gRdleZ1IT-ZCWDy6X2h_qs=', 'Chrome Browser', 'web', '10.48.108.21', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-12 00:36:13', '2025-11-10 22:30:09', 1, '2025-10-11 23:30:09', '2025-10-12 00:36:13'),
(477, 14, '3c95ef06-a92f-4f1d-96cf-4e4d7b702224', 'qPPr9aCPVfzRwb_Y_kxhyuCuWp19NgYa58uvmmuTfvQ=', 'Chrome Browser', 'web', '10.198.110.27', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-12 01:22:29', '2025-11-11 00:21:37', 0, '2025-10-12 01:21:37', '2025-10-12 01:22:29'),
(478, 15, '44eed43d-ff46-4064-a3fa-a6a6cb2d52a5', 'ylUTJqzQ-O2imA2nDDBK7mfmOdG7z7hnatKQQP2G6y8=', 'Chrome Browser', 'web', '10.198.110.27', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-12 01:25:43', '2025-11-11 00:22:36', 0, '2025-10-12 01:22:36', '2025-10-12 01:25:43'),
(479, 1027, '8a0ce9e5-3bfa-477e-9979-3b9c1ce54f91', 'PEqw1IM4Fkr1Lnu5ve4rXzQyl_wathGnLP6-QLTy5uA=', 'Chrome Browser', 'web', '10.198.110.27', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-14 01:43:15', '2025-11-11 00:25:49', 0, '2025-10-12 01:25:49', '2025-10-14 01:43:15'),
(480, 1027, '5c777bf9-ce2b-4a09-bddb-35293e34817a', 'ARoBc1u6vImRpsRVIJo7rPYG9dGvnN51wBdd30CWXbs=', 'Firefox Browser', 'web', '10.48.104.72', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0', '2025-10-12 02:01:46', '2025-11-11 00:54:47', 1, '2025-10-12 01:54:47', '2025-10-12 02:01:46'),
(481, 1027, 'd927a487-0145-47ba-8b56-26397d199e21', 'EvkXkEmNG1_YoU4n8XLjD0Rdp9D68Q9yk9R4X6oXn88=', 'Firefox Browser', 'web', '10.48.104.113', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0', '2025-10-13 09:41:48', '2025-11-12 05:56:48', 1, '2025-10-13 06:56:48', '2025-10-13 09:41:48'),
(482, 1027, '00f77f97-ecbb-4145-a7c7-348e30322505', '5YmnboWhj_zMaM5BTwpBwH9UHEx4l5Y6HprX2AQo5_o=', 'Chrome Browser', 'web', '10.54.62.22', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-13 23:53:21', '2025-11-12 20:16:19', 0, '2025-10-13 21:16:19', '2025-10-13 23:53:21'),
(483, 1027, '7c93ee81-ecbc-4c03-b25e-027c057827d3', 'SIMYoZv7_DDjVXI4fLZdmke0OxvVCNRGnXYSr35msXA=', 'Chrome Browser', 'web', '10.54.62.22', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-15 01:23:06', '2025-11-12 22:53:32', 1, '2025-10-13 23:53:32', '2025-10-15 01:23:06'),
(484, 15, '331b5dfc-518c-48f7-92a2-1326515357dc', 'XzerWeQI3t1ghDan99gVChsYCNVJmanvPaodxZwygJg=', 'Chrome Browser', 'web', '10.198.110.27', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', '2025-10-14 04:59:18', '2025-11-13 00:43:26', 1, '2025-10-14 01:43:26', '2025-10-14 04:59:18');

-- --------------------------------------------------------

--
-- Table structure for table `user_tokens`
--

CREATE TABLE `user_tokens` (
  `token_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `token_type` varchar(64) DEFAULT NULL,
  `token` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `is_revoked` tinyint(1) DEFAULT 0,
  `device_info` varchar(255) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `user_tokens`
--

INSERT INTO `user_tokens` (`token_id`, `user_id`, `token_type`, `token`, `expires_at`, `is_revoked`, `device_info`, `ip_address`, `created_at`, `updated_at`) VALUES
(354, 7, 'refresh', 'rxM_PFUV0wzjWoj1Ym31z-qf7I25BtgPZy3ZbqkJVHs=', '2025-10-25 17:38:16', 0, 'Chrome Browser / web', '58.11.72.176', '2025-09-25 17:38:16', '2025-09-25 17:38:16'),
(355, 13, 'refresh', 'tAJxQj8zZPdlCNmrY-mcTUeGuU8RXG94GQLjW7a6TRY=', '2025-10-25 20:51:44', 1, 'Chrome Browser / web', '58.10.153.107', '2025-09-25 20:51:45', '2025-09-25 20:57:46'),
(356, 8, 'refresh', 'ZThPyMcteVuStSP4qsHIUS74ndbrhnvvI6PJOz9_LvM=', '2025-10-25 21:10:06', 0, 'Chrome Browser / web', '58.10.72.179', '2025-09-25 21:10:06', '2025-09-25 21:10:06'),
(357, 13, 'refresh', 'UhH4xnBxO2jqDTUtNZ-64BsgL33gS6kCoz8o9wZBJY4=', '2025-10-25 21:18:13', 0, 'Chrome Browser / web', '58.10.153.107', '2025-09-25 21:18:13', '2025-09-25 21:18:13'),
(358, 13, 'refresh', 'clwBnBZuB9MXzOIK3Z5OYvyg1tHu4LPSbfqGTSPGLxM=', '2025-10-26 06:26:48', 1, 'Chrome Browser / web', '58.10.71.71', '2025-09-26 07:26:48', '2025-09-26 08:42:14'),
(359, 12, 'refresh', 'wuzezSMa9SHhXM1zkgtYkgqkjPJKF9rFcuvbHghlCvg=', '2025-10-26 07:42:22', 1, 'Chrome Browser / web', '58.10.71.71', '2025-09-26 08:42:22', '2025-09-26 08:47:09'),
(360, 13, 'refresh', 'TTdbyCMqnqSIv6_vi9kMTi1jOGhQkRY5frfw8uy0vTs=', '2025-10-26 07:47:15', 1, 'Chrome Browser / web', '58.10.71.71', '2025-09-26 08:47:15', '2025-09-26 16:13:08'),
(361, 8, 'refresh', 'RMVXcxouxmrWU1A27yjHNs8WC1wZoHUN6XpVQnORejY=', '2025-10-26 10:25:27', 0, 'Chrome Browser / web', '58.10.72.179', '2025-09-26 11:25:27', '2025-09-26 11:25:27'),
(362, 8, 'refresh', 'e3F-wKrYVvMXzKf4jtVrfSID6f_IOm_DAu2pxmz-RYs=', '2025-10-26 13:52:24', 0, 'Chrome Browser / web', '58.10.72.179', '2025-09-26 14:52:24', '2025-09-26 14:52:24'),
(363, 7, 'refresh', 'SAm_OW1LFfBTLG3UAOSwkmZV2nAEYjBA6lbWL3FPj8E=', '2025-10-26 15:13:22', 0, 'Chrome Browser / web', '58.10.71.71', '2025-09-26 16:13:22', '2025-09-26 16:13:22'),
(364, 7, 'refresh', 'NvYADWK9cokdzsZk2KAHInsyfP9FWhIPdb21AuQ9wy8=', '2025-10-26 16:14:12', 0, 'Chrome Browser / web', '58.10.71.71', '2025-09-26 17:14:12', '2025-09-26 17:14:12'),
(365, 8, 'refresh', 'BI65LxPZXkrirCYm7GYn30AiJ3lDxljtZdJDBXAK-_Q=', '2025-10-26 17:22:42', 0, 'Chrome Browser / web', '58.10.72.179', '2025-09-26 18:22:42', '2025-09-26 18:22:42'),
(366, 8, 'refresh', 'o_mIb1dRJnSmzAuLJqDkvJXRAra16xE-OwyjtuMbVUM=', '2025-10-26 18:26:42', 0, 'Chrome Browser / web', '58.10.72.179', '2025-09-26 19:26:42', '2025-09-26 19:26:42'),
(367, 8, 'refresh', 'kXr_i_7NALvGdKrFJcDr6TYEulu7yLpi4_NTMP8drRI=', '2025-10-26 19:36:35', 0, 'Chrome Browser / web', '58.10.72.179', '2025-09-26 20:36:35', '2025-09-26 20:36:35'),
(368, 8, 'refresh', 'lvb_pzrdffN62Gllsp0-arX8oV2yHJE44b1YlPCOOLM=', '2025-10-26 22:15:36', 0, 'Chrome Browser / web', '58.10.72.179', '2025-09-26 23:15:36', '2025-09-26 23:15:36'),
(369, 8, 'refresh', 'EMCeT2W6BIzZBx91np7MRVcX0bWYUraW9EiJ2jcPPr4=', '2025-10-26 23:21:54', 0, 'Chrome Browser / web', '58.10.72.179', '2025-09-27 00:21:54', '2025-09-27 00:21:54'),
(370, 7, 'refresh', 'EwiASFctbTs9M77Lx53BuPA89Wo1UlgFmB0dvGdnW5Y=', '2025-10-27 03:54:15', 1, 'Chrome Browser / web', '58.10.71.71', '2025-09-27 04:54:15', '2025-09-27 05:04:57'),
(371, 7, 'refresh', 'mXQneMpzUiAx76nyHYMs_piD1NWps8iqT9NhMxLvqQo=', '2025-10-27 03:55:52', 1, 'Chrome Browser / web', '202.28.118.74', '2025-09-27 04:55:52', '2025-09-27 04:56:08'),
(372, 8, 'refresh', 'DZ7obYirPxAEjcMgmckvWuyDD2S6VXC1BEBeBN6hPhc=', '2025-10-27 03:56:10', 1, 'Chrome Browser / web', '202.28.118.74', '2025-09-27 04:56:10', '2025-09-27 04:56:45'),
(373, 7, 'refresh', '5R3d2H8FNBoZuoLmo9HkQVzmi7VCPTqXadBD2HdrY9o=', '2025-10-27 03:56:47', 1, 'Chrome Browser / web', '202.28.118.74', '2025-09-27 04:56:47', '2025-09-27 04:58:25'),
(374, 8, 'refresh', 'U1DHrOPzkALq7jpexWAsac4V8fkjWKDceUDtBG5tsl0=', '2025-10-27 03:58:27', 0, 'Chrome Browser / web', '202.28.118.74', '2025-09-27 04:58:27', '2025-09-27 04:58:27'),
(375, 13, 'refresh', 'nPqcQvvLWZX5y6FRxrFklm7fC4WlFY8xV5Z1Z8BTMC0=', '2025-10-27 04:05:07', 1, 'Chrome Browser / web', '58.10.71.71', '2025-09-27 05:05:07', '2025-09-27 05:13:24'),
(376, 7, 'refresh', 'BRMGWedavtB8xzSpslgsYR_DdOkvLfIlO_kZ7tKp8dY=', '2025-10-27 04:13:31', 1, 'Chrome Browser / web', '58.10.71.71', '2025-09-27 05:13:31', '2025-09-27 05:15:33'),
(377, 13, 'refresh', '4aCLC6gDsACP8opSj5nbBNt9lkaaj3kH5GoA_uVi4vs=', '2025-10-27 04:15:51', 1, 'Chrome Browser / web', '58.10.71.71', '2025-09-27 05:15:51', '2025-09-27 05:19:39'),
(378, 7, 'refresh', 'eNjW2eLm5WXZgZcTiu6TI42uJG0ZJcNxyMdnIEOUTnE=', '2025-10-27 04:19:46', 1, 'Chrome Browser / web', '58.10.71.71', '2025-09-27 05:19:46', '2025-09-27 05:35:06'),
(379, 8, 'refresh', 'ASc8UkEi6exZh7yhElyTseu1LExthq7a5hdkz7FzWaw=', '2025-10-27 04:35:11', 1, 'Chrome Browser / web', '58.10.71.71', '2025-09-27 05:35:11', '2025-09-27 05:54:47'),
(380, 7, 'refresh', 'gejn0BiryY94FQ81ZPZGq9AbO3aUHUu-Bkw6gwitqWA=', '2025-10-27 04:55:05', 1, 'Chrome Browser / web', '58.10.71.71', '2025-09-27 05:55:05', '2025-09-27 05:56:12'),
(381, 13, 'refresh', 'Z53RqrrMfUHpWoS9u_m9B2cwvsPB0SvOzJivxy2_gmk=', '2025-10-27 04:56:18', 0, 'Chrome Browser / web', '58.10.71.71', '2025-09-27 05:56:18', '2025-09-27 05:56:18'),
(382, 7, 'refresh', 'qj_fpp4fs8DcKgYb-7UqCwUE68jQ_K1zndeL9LJsj_0=', '2025-10-29 08:22:44', 0, 'Chrome Browser / web', '58.10.152.207', '2025-09-29 09:22:44', '2025-09-29 09:22:44'),
(383, 8, 'refresh', 'l0GJvIQB7krB-gXmMMWu1UtnSSlFKCjlXUnwVrUXoc8=', '2025-10-29 11:03:51', 1, 'Chrome Browser / web', '58.10.72.49', '2025-09-29 12:03:51', '2025-09-29 12:04:19'),
(384, 7, 'refresh', 'yaDppk0SMZ7C-v2JDxziWucPGputer38GxXPFfRm7Zk=', '2025-10-29 11:04:21', 1, 'Chrome Browser / web', '58.10.72.49', '2025-09-29 12:04:21', '2025-09-29 12:06:59'),
(385, 8, 'refresh', 'bXPvjnJ8j0PB6dQF4LCYTRVPJiNs53cvCn3vayN_RDE=', '2025-10-29 11:07:02', 0, 'Chrome Browser / web', '58.10.72.49', '2025-09-29 12:07:02', '2025-09-29 12:07:02'),
(386, 7, 'refresh', '3L_F9QZjpFzxcaFpxKmbm7nGSBVxusiPVEuy1ElEFiQ=', '2025-10-29 11:34:32', 0, 'Chrome Browser / web', '58.10.152.207', '2025-09-29 12:34:32', '2025-09-29 12:34:32'),
(387, 7, 'refresh', 'Q45MHiUiWnDHPELwGKHyC6gGL6JoLe-AlVp9ydtgYFc=', '2025-10-29 16:54:47', 0, 'Chrome Browser / web', '58.10.152.207', '2025-09-29 17:54:47', '2025-09-29 17:54:47'),
(388, 8, 'refresh', 'o1rH4g0Q1iO7QOLjxs_AexgBSbzNJC7S1g-WI_P4Nrk=', '2025-10-30 11:11:20', 0, 'Chrome Browser / web', '58.10.72.49', '2025-09-30 12:11:20', '2025-09-30 12:11:20'),
(389, 7, 'refresh', 'P6K4c4MQ2j90bi4VXYe1cmJuhkJX_RZ0_MVTSGS_QG0=', '2025-10-30 11:26:20', 1, 'Chrome Browser / web', '58.10.140.76', '2025-09-30 12:26:20', '2025-09-30 12:30:32'),
(390, 8, 'refresh', 'm_fupCJR-zcYVShwPVrJAY5sW5vm-ff_gv-LK3EmuVc=', '2025-10-30 11:30:52', 1, 'Chrome Browser / web', '58.10.140.76', '2025-09-30 12:30:52', '2025-09-30 12:31:03'),
(391, 13, 'refresh', 're_6X4wQnnbCpdNzGXGrdc1hlAtprlNxmTD1iotgZZc=', '2025-10-30 11:31:08', 1, 'Chrome Browser / web', '58.10.140.76', '2025-09-30 12:31:08', '2025-09-30 12:31:29'),
(392, 7, 'refresh', 'VcM9_606mfIpNQAwm_Y5PeVTw9jNgwj4JxJlE5tFevs=', '2025-10-30 11:34:39', 1, 'Chrome Browser / web', '58.10.140.76', '2025-09-30 12:34:39', '2025-09-30 12:34:59'),
(393, 8, 'refresh', 'JVRp_zSxSPPHQ6kfm8_JbIBcLOFloUPeQSNooInCeCo=', '2025-10-30 12:40:56', 0, 'Chrome Browser / web', '58.10.72.49', '2025-09-30 13:40:56', '2025-09-30 13:40:56'),
(394, 8, 'refresh', 'U7UPoXbcMTbmoTObve8oVrbcDJ4s7xjwOsnT4YuYDcM=', '2025-10-30 14:02:22', 0, 'Chrome Browser / web', '58.10.72.49', '2025-09-30 15:02:22', '2025-09-30 15:02:22'),
(395, 8, 'refresh', 'IyIYChkgrGIvSKGMfX3v0-RLqYBaMYb0b4I0T9n3bE0=', '2025-10-31 12:13:42', 0, 'Chrome Browser / web', '58.10.72.49', '2025-10-01 13:13:42', '2025-10-01 13:13:42'),
(396, 13, 'refresh', 'Q-pAz5mE5YHFfkEVvo94h3o3cegrI9vjJ9neEJvmA-U=', '2025-10-31 16:07:07', 0, 'Chrome Browser / web', '124.121.173.22', '2025-10-01 17:07:07', '2025-10-01 17:07:07'),
(397, 8, 'refresh', 'zOHdvy7d5kDtbvknZLO3pYpQWxZs95shQVHykEoG5fM=', '2025-10-31 19:49:03', 0, 'Chrome Browser / web', '58.10.72.49', '2025-10-01 20:49:03', '2025-10-01 20:49:03'),
(398, 8, 'refresh', 'P6yaokYV_Cma0MmGMKS3JnFmrC6wPo7ok0ZC5ZV423o=', '2025-10-31 23:32:49', 0, 'Chrome Browser / web', '58.10.72.49', '2025-10-02 00:32:49', '2025-10-02 00:32:49'),
(399, 8, 'refresh', 'liVU0RGJCYsDStYNDRbY-PWJA7bg6iYNq27vnwVgWfQ=', '2025-11-01 09:56:34', 1, 'Chrome Browser / web', '58.10.72.49', '2025-10-02 10:56:34', '2025-10-02 12:35:55'),
(400, 13, 'refresh', 'cCd1jLeBZXzTkTdtC4c_a5cFROikta5r5SFjsOsVvMU=', '2025-11-01 11:28:38', 0, 'Chrome Browser / web', '171.97.76.248', '2025-10-02 12:28:38', '2025-10-02 12:28:38'),
(401, 7, 'refresh', '9OzwcqGcl6m0WZhRCaIb2MF5X6chMOqWfo4aNCinnMM=', '2025-11-01 11:35:57', 1, 'Chrome Browser / web', '58.10.72.49', '2025-10-02 12:35:57', '2025-10-02 12:37:18'),
(402, 8, 'refresh', 'uo50Xw8A8qGq881v90-gxz8l0RI4I09iSNpEtTOLz3Q=', '2025-11-01 11:37:21', 0, 'Chrome Browser / web', '58.10.72.49', '2025-10-02 12:37:21', '2025-10-02 12:37:21'),
(403, 8, 'refresh', 'oVEFDPZPnDnNfwpNDkS9uHY5pePbi2PJDYKvYIqHGi8=', '2025-11-01 14:41:56', 1, 'Chrome Browser / web', '58.10.72.49', '2025-10-02 15:41:56', '2025-10-02 15:43:15'),
(404, 7, 'refresh', '_RoO7hWZmGINcbSa68VuYSRR7pccfBXKFVgqmI1FHBc=', '2025-11-01 14:43:18', 1, 'Chrome Browser / web', '58.10.72.49', '2025-10-02 15:43:18', '2025-10-02 15:48:47'),
(405, 8, 'refresh', 'QK9QdaG-1Ws_UBNVPhfRBVgH_2WhZlpgkL9plWpqdoE=', '2025-11-01 14:48:49', 0, 'Chrome Browser / web', '58.10.72.49', '2025-10-02 15:48:49', '2025-10-02 15:48:49'),
(406, 13, 'refresh', 'iO3qVtW4BfL910SK-a4a9ww7-OJtOonDAy4cfr02BGA=', '2025-11-02 10:27:59', 1, 'Chrome Browser / web', '110.168.236.56', '2025-10-03 11:27:59', '2025-10-03 13:38:24'),
(407, 13, 'refresh', 'TOXUKDj6NsQl9k6A4VrUKabfV1K4mJovh_qN_M0px7c=', '2025-11-02 11:55:49', 1, 'Chrome Browser / web', '202.12.97.133', '2025-10-03 12:55:49', '2025-10-03 12:56:24'),
(408, 7, 'refresh', 'BdWzAMQlTnL5DBJSVBcgigS6BVGnBiSLniO6esQK-fs=', '2025-11-02 11:56:28', 0, 'Chrome Browser / web', '202.12.97.133', '2025-10-03 12:56:28', '2025-10-03 12:56:28'),
(409, 7, 'refresh', 'FOUX_ve6rwG34hguDvYYthIET97tkKX6ic4iLHEX1rc=', '2025-11-02 12:38:29', 1, 'Chrome Browser / web', '110.168.236.56', '2025-10-03 13:38:29', '2025-10-03 13:40:21'),
(410, 13, 'refresh', '3dm_HG8931mtl5UfKRCdFxEe9BQuiHhSU-4hDzl6zP4=', '2025-11-02 12:40:30', 0, 'Chrome Browser / web', '110.168.236.56', '2025-10-03 13:40:30', '2025-10-03 13:40:30'),
(411, 13, 'refresh', '3vA95Lleb8BHAeMFV3zROLS9lowW37WqjCVp8ITtImE=', '2025-11-02 13:46:02', 0, 'Chrome Browser / web', '110.168.236.56', '2025-10-03 14:46:02', '2025-10-03 14:46:02'),
(412, 13, 'refresh', 'Fgie1j8_OiNwlisfqoMJQhC-4xv5ee9V5Pg2tEYaniU=', '2025-11-02 14:46:59', 0, 'Chrome Browser / web', '110.168.236.56', '2025-10-03 15:46:59', '2025-10-03 15:46:59'),
(413, 14, 'refresh', 'ZegguyU7uTNKuo2_ENveLmyqNlGobxF4MhN43DyMbds=', '2025-11-02 05:59:46', 1, 'Chrome Browser / web', '::1', '2025-10-03 06:59:46', '2025-10-03 07:20:01'),
(414, 14, 'refresh', 'gVBwKQ7JWpINg0GFlOqH-o5yv8qFJ1RPYakMBhkusI0=', '2025-11-03 00:07:45', 1, 'Chrome Browser / web', '::1', '2025-10-04 01:07:45', '2025-10-04 01:07:49'),
(415, 15, 'refresh', 'qfiIrf6em62JL34TZsX-t2s3FBtPHtNhQKCcpQY536g=', '2025-11-03 00:07:55', 1, 'Chrome Browser / web', '::1', '2025-10-04 01:07:55', '2025-10-04 02:09:41'),
(416, 14, 'refresh', '0kO34XpFDqID0AcIi5t7FjcuZ9KEg0BvAhzMiaJ6rCQ=', '2025-11-03 01:09:45', 1, 'Chrome Browser / web', '::1', '2025-10-04 02:09:45', '2025-10-04 02:11:42'),
(417, 15, 'refresh', '33sINqUCT4oXDXZ82x4BV08ew04MhaYRx3olHDyNh0E=', '2025-11-03 01:11:45', 0, 'Chrome Browser / web', '::1', '2025-10-04 02:11:45', '2025-10-04 02:11:45'),
(418, 14, 'refresh', 'Ee69lbVONqdiL3a_NLDoZeilN4q7FnO6pvMALcFSZ5g=', '2025-11-03 03:10:29', 0, 'Chrome Browser / web', '10.48.104.22', '2025-10-04 04:10:29', '2025-10-04 04:10:29'),
(419, 15, 'refresh', 'xoZLfcY2lIet4OCZiAG0QjkUGhw92KjosrN89Qg0Ez8=', '2025-11-03 03:16:14', 1, 'Chrome Browser / web', '10.48.108.28', '2025-10-04 04:16:14', '2025-10-04 07:46:52'),
(420, 1027, 'refresh', '2h3CkkBTnbzbKF4g0YfzzThexpcOCQXiKZOQDOfo--w=', '2025-11-03 06:47:04', 0, 'Chrome Browser / web', '10.48.108.28', '2025-10-04 07:47:04', '2025-10-04 07:47:04'),
(421, 1027, 'refresh', 'suvvHkmTnO-GnJ6w2JRDNwpyA3Og7WeoOMuTSF8N-ps=', '2025-11-03 06:47:51', 0, 'Chrome Browser / web', '10.48.108.28', '2025-10-04 07:47:52', '2025-10-04 07:47:52'),
(422, 14, 'refresh', 'pF_hq67ZKf4uJWqmJIDLdRCsI7S_W9bSHjta3DstWaA=', '2025-11-03 07:25:42', 1, 'Chrome Browser / web', '10.198.110.27', '2025-10-04 08:25:42', '2025-10-04 08:42:17'),
(423, 1027, 'refresh', '3qSXHvft7sQlFnaXaCE0nDw-wbn8Jp0wLLbBcRj9TnQ=', '2025-11-03 07:26:30', 1, 'Firefox Browser / web', '10.48.104.20', '2025-10-04 08:26:30', '2025-10-04 09:35:03'),
(424, 14, 'refresh', 'lfDs_i10JIk2hQ3nxIdRtz0mh3NKVs84tS9c1m2VV18=', '2025-11-03 07:30:36', 0, 'Chrome Browser / web', '10.48.108.28', '2025-10-04 08:30:36', '2025-10-04 08:30:36'),
(425, 15, 'refresh', 'eDiYnl0lolgholhYEYeYZXxLGgSUIWEn1QZvPbb8skM=', '2025-11-03 07:42:21', 1, 'Chrome Browser / web', '10.198.110.27', '2025-10-04 08:42:21', '2025-10-04 10:35:53'),
(426, 16, 'refresh', '-7TwddswLyBCbdra8UsB5TD0IaI0XEKMCYZb_k4LpXo=', '2025-11-03 07:57:59', 0, 'Chrome Browser / web', '10.48.104.38', '2025-10-04 08:57:59', '2025-10-04 08:57:59'),
(427, 14, 'refresh', 'LWJKO_c2SxDWqKtU7LT3kL6BIh2pUrEZLzrWiHa8Fxs=', '2025-11-03 08:00:17', 0, 'Chrome Browser / web', '10.48.108.28', '2025-10-04 09:00:17', '2025-10-04 09:00:17'),
(428, 1027, 'refresh', '6DeGbufVAI56NsWfW5G_snOw_bXtVLxE4T91oEBysDs=', '2025-11-03 08:35:08', 0, 'Firefox Browser / web', '10.48.104.20', '2025-10-04 09:35:08', '2025-10-04 09:35:08'),
(429, 15, 'refresh', '9N9tqCX550n6A0zKs4iUUKUnvPsQXEmE0hX-D2KcLh8=', '2025-11-03 08:36:13', 0, 'Chrome Browser / web', '10.48.108.28', '2025-10-04 09:36:13', '2025-10-04 09:36:13'),
(430, 15, 'refresh', 'iyG_e3pHDrfM7lb6eHNG_yQori2ocOBasVXvlcioaQE=', '2025-11-03 09:36:25', 0, 'Chrome Browser / web', '10.198.110.27', '2025-10-04 10:36:25', '2025-10-04 10:36:25'),
(431, 1027, 'refresh', '23_X4bg7-v3hdpER_Arz-2br2ydF5EeTqOCduWkD0lI=', '2025-11-03 19:47:06', 0, 'Firefox Browser / web', '10.48.104.49', '2025-10-04 20:47:06', '2025-10-04 20:47:06'),
(432, 1027, 'refresh', 'a1XlbcotQp5F0KxzkOXChqjP1GkSzQjNefpyKKag6LE=', '2025-11-04 00:15:10', 0, 'Firefox Browser / web', '10.48.104.49', '2025-10-05 01:15:10', '2025-10-05 01:15:10'),
(433, 15, 'refresh', 'lldlwCd2WbrtYy2yRT6CZUsbeTzwI477-ftWPgudElo=', '2025-11-04 00:40:15', 1, 'Chrome Browser / web', '10.198.110.27', '2025-10-05 01:40:15', '2025-10-05 01:47:33'),
(434, 14, 'refresh', 'vX4hmllSdFW7vbiZyKyk5gX2h1lf3eJEcpBwUnqd2q8=', '2025-11-04 00:47:40', 1, 'Chrome Browser / web', '10.198.110.27', '2025-10-05 01:47:40', '2025-10-05 01:49:02'),
(435, 15, 'refresh', 'mQzsiitkfiYcBmKprlKq7dNkP0MrSWY6YZqjeUEZA0o=', '2025-11-04 00:49:25', 1, 'Chrome Browser / web', '10.198.110.27', '2025-10-05 01:49:25', '2025-10-05 02:12:32'),
(436, 16, 'refresh', 'yV5Eoz1DtX9JP7TT2cTARJ2Ri7okhSyhKJVZWMwd9t0=', '2025-11-04 01:12:51', 1, 'Chrome Browser / web', '10.198.110.27', '2025-10-05 02:12:51', '2025-10-05 02:13:28'),
(437, 14, 'refresh', 'K94PXNloJfxzqSe0NWSMCIMl07zV4ZyL5f7RucIYf5Y=', '2025-11-04 01:13:33', 1, 'Chrome Browser / web', '10.198.110.27', '2025-10-05 02:13:33', '2025-10-05 02:37:11'),
(438, 15, 'refresh', '29vFXGCIbJcMYDH6pxLDizpzVmQDvt9imaFkoHBzPrk=', '2025-11-04 01:37:16', 1, 'Chrome Browser / web', '10.198.110.27', '2025-10-05 02:37:16', '2025-10-05 02:45:18'),
(439, 16, 'refresh', 'ed_FYTfWUZjsZbcqWRTrmPMyH9o2rDQJbatySL6Vu5U=', '2025-11-04 01:45:23', 1, 'Chrome Browser / web', '10.198.110.27', '2025-10-05 02:45:23', '2025-10-05 04:57:12'),
(440, 14, 'refresh', 'YIWkKON1okvqXpmVSyVDxFHP7TYszm-ELQjv3RcpvrM=', '2025-11-04 03:57:18', 0, 'Chrome Browser / web', '10.198.110.27', '2025-10-05 04:57:18', '2025-10-05 04:57:18'),
(441, 1027, 'refresh', 'tdqqyua_ESCgcRvSTDA9Z9J_VOczLzcGCArpOMs_SXA=', '2025-11-04 22:12:57', 1, 'Chrome Browser / web', '10.54.62.22', '2025-10-05 23:12:57', '2025-10-05 23:49:55'),
(442, 1039, 'refresh', '5p8aLvBYcT2vjH8wUIbICIDD09QWFnZNBzPR9jQAZ_Q=', '2025-11-04 22:48:20', 1, 'Chrome Browser / web', '10.48.108.58', '2025-10-05 23:48:20', '2025-10-06 00:14:31'),
(443, 1039, 'refresh', '6TxO1dWLaGykImIc_nKF70QBx2I9ZJ9DRBRINXxp7H0=', '2025-11-04 22:50:18', 0, 'Chrome Browser / web', '10.54.62.22', '2025-10-05 23:50:18', '2025-10-05 23:50:18'),
(444, 14, 'refresh', 'qUl6-V5VqJipsxvEnYTRkfE5AJ-RQQlGMAjn5j1Qvik=', '2025-11-05 02:03:29', 0, 'Chrome Browser / web', '10.198.110.27', '2025-10-06 03:03:29', '2025-10-06 03:03:29'),
(445, 14, 'refresh', 'dX2r4enLKUlSEvlHi3Y5YM1EFvfngASzcWQy2_EjDpM=', '2025-11-05 02:36:36', 0, 'Chrome Browser / web', '10.48.108.58', '2025-10-06 03:36:36', '2025-10-06 03:36:36'),
(446, 1027, 'refresh', 'uWmyn0ZnqzO_teBiDbNtl6Vka_e8wkQAWU4yx2_7v3o=', '2025-11-05 02:49:01', 1, 'Firefox Browser / web', '10.48.104.72', '2025-10-06 03:49:01', '2025-10-06 04:25:07'),
(447, 1027, 'refresh', 'tEqax1C41xM9vsT0SlP48QTm-kSKxVnFiRVo-v23Kec=', '2025-11-06 00:41:31', 0, 'Firefox Browser / web', '10.48.104.63', '2025-10-07 01:41:31', '2025-10-07 01:41:31'),
(448, 15, 'refresh', 'qZDmpQP8jsbM_pxyXQ2yTf3GcXhcVeyxRdAVg8g7IbA=', '2025-11-06 01:03:33', 1, 'Chrome Browser / web', '10.198.110.27', '2025-10-07 02:03:33', '2025-10-07 04:24:05'),
(449, 1027, 'refresh', 'KCpE4tMzLLRF8YAtiMTSSSdmTvWdo2-5j5BAg4zVw84=', '2025-11-06 02:16:28', 0, 'Chrome Browser / web', '10.48.108.26', '2025-10-07 03:16:28', '2025-10-07 03:16:28'),
(450, 14, 'refresh', 'cWo-wI85b41ceL_P1lzFQ7QzIqwkAuuw7ITz9K5Rgic=', '2025-11-06 03:24:09', 1, 'Chrome Browser / web', '10.198.110.27', '2025-10-07 04:24:10', '2025-10-07 04:33:28'),
(451, 15, 'refresh', 'GvXqIBMFgo7SGgRWkzCqfEzmiB_YW3jd_kIXS2huVxs=', '2025-11-06 03:33:32', 1, 'Chrome Browser / web', '10.198.110.27', '2025-10-07 04:33:32', '2025-10-07 04:33:34'),
(452, 1027, 'refresh', 'm-W0fZX9za1knSORZnIHi-ulYPgCfMhTiRTEKHHvzzI=', '2025-11-06 03:33:51', 1, 'Chrome Browser / web', '10.198.110.27', '2025-10-07 04:33:51', '2025-10-07 04:35:00'),
(453, 15, 'refresh', '4TW9TJi9DISZZYxXYQ7hb-rpTMNmenG8t2da3t3C_38=', '2025-11-06 03:35:04', 1, 'Chrome Browser / web', '10.198.110.27', '2025-10-07 04:35:04', '2025-10-07 04:47:35'),
(454, 15, 'refresh', 'Rvvx_pf_pyE85knhOWBGlL7aqmzU_EMJ6UDPx7JNwzY=', '2025-11-06 03:55:13', 1, 'Chrome Browser / web', '10.198.110.27', '2025-10-07 04:55:13', '2025-10-08 02:07:14'),
(455, 1027, 'refresh', '_w7yD4lT3Q5EWy2RRGrPV7A23dOHCcK-Cyj0EHuWN3E=', '2025-11-06 08:24:05', 0, 'Firefox Browser / web', '10.48.104.101', '2025-10-07 09:24:05', '2025-10-07 09:24:05'),
(456, 1027, 'refresh', 'oQVaa6KVsSKf1MQ1nkYefYcvi4pJW6_TOoVEIlW3pEA=', '2025-11-07 00:56:34', 0, 'Firefox Browser / web', '10.48.104.20', '2025-10-08 01:56:34', '2025-10-08 01:56:34'),
(457, 14, 'refresh', 'K3GIT9Vzf8xeXaSYGEKeXM_6FYRmk9ZeVVhZDrh8nBg=', '2025-11-07 01:07:18', 1, 'Chrome Browser / web', '10.198.110.27', '2025-10-08 02:07:18', '2025-10-08 02:47:00'),
(458, 14, 'refresh', 'RUVMJhwd_dtPlXMNSfW1_CXcAFNIY7SLlXYliN2Cg8c=', '2025-11-07 01:10:59', 0, 'Chrome Browser / web', '10.48.108.49', '2025-10-08 02:10:59', '2025-10-08 02:10:59'),
(459, 14, 'refresh', 'AjF8ETzC4PEPqlIb1_Ioc2omQBCi0uXP6GBHo9ilLis=', '2025-11-07 01:20:18', 0, 'Chrome Browser / web', '10.48.104.48', '2025-10-08 02:20:19', '2025-10-08 02:20:19'),
(460, 1027, 'refresh', 'u5B1HyXzlOT9tev3zyaktaoKXFRNj7J-cWabp2Yau1w=', '2025-11-07 01:47:09', 1, 'Chrome Browser / web', '10.198.110.27', '2025-10-08 02:47:09', '2025-10-08 03:38:05'),
(461, 15, 'refresh', 'o4L239KmKjZEmUv6DBfR4d5LSzLCdX6bljjIIcyl6h4=', '2025-11-07 02:38:11', 0, 'Chrome Browser / web', '10.198.110.27', '2025-10-08 03:38:11', '2025-10-08 03:38:11'),
(462, 1027, 'refresh', 'mxzeV8PBW2NyqeVvJGrB_6DUw_Ir45bsFVOHh_-ERT8=', '2025-11-08 18:59:05', 0, 'Firefox Browser / web', '10.48.104.77', '2025-10-09 19:59:05', '2025-10-09 19:59:05'),
(463, 15, 'refresh', '0vE6myP4Q9zBaeAYZBn-vzLFXBWQKWlzaRzyYedq9Wk=', '2025-11-09 01:58:57', 1, 'Chrome Browser / web', '10.198.110.27', '2025-10-10 02:58:57', '2025-10-10 03:59:56'),
(464, 14, 'refresh', '2tIjS4ybN8aN8GHTaYx6AcRows6s9OOj2rHE6Y19C-A=', '2025-11-09 03:00:33', 1, 'Chrome Browser / web', '10.198.110.27', '2025-10-10 04:00:33', '2025-10-10 04:08:48'),
(465, 15, 'refresh', 'czFf-pjV2xqQbg65e0JCPRrLL7zIkqP7CslRbK6bcA8=', '2025-11-09 03:09:01', 1, 'Chrome Browser / web', '10.198.110.27', '2025-10-10 04:09:01', '2025-10-10 04:22:45'),
(466, 14, 'refresh', 'kJzqgegkrav3U-9qzGhC325zEb3Wj0IiHesoAVTkZeA=', '2025-11-09 03:22:53', 1, 'Chrome Browser / web', '10.198.110.27', '2025-10-10 04:22:53', '2025-10-10 04:35:54'),
(467, 15, 'refresh', 'qbRJG3qavlK1dDGu2HDCbfMd4OSLF60CJgHo2mO-OPM=', '2025-11-09 03:35:59', 0, 'Chrome Browser / web', '10.198.110.27', '2025-10-10 04:35:59', '2025-10-10 04:35:59'),
(468, 14, 'refresh', 'wuclPui0Z7wnQthy3Hr7vEW20udXdftt9mq3ARj6tG8=', '2025-11-10 00:50:36', 0, 'Chrome Browser / web', '10.48.108.31', '2025-10-11 01:50:36', '2025-10-11 01:50:36'),
(469, 14, 'refresh', 'LeKbSuJoDdJXRgmY3I69ZoftQ4wfdoKFTyBAy9x_hvQ=', '2025-11-10 10:30:32', 1, 'Chrome Browser / web', '10.198.110.27', '2025-10-11 11:30:32', '2025-10-11 11:30:37'),
(470, 15, 'refresh', 'gebA9iJZF_sU7CKM1DBD1_mGlZHgx3VFa-1Jkc9ZLss=', '2025-11-10 10:30:43', 0, 'Chrome Browser / web', '10.198.110.27', '2025-10-11 11:30:43', '2025-10-11 11:30:43'),
(471, 14, 'refresh', 'j_n1gkaG763MrqWzkD9FOdpLe2zjDHb8Cc-h8MYhvzM=', '2025-11-10 21:05:24', 1, 'Chrome Browser / web', '10.198.110.27', '2025-10-11 22:05:24', '2025-10-11 22:59:52'),
(472, 1027, 'refresh', 'aI9VNySMtoSXBncO5HTdCRBrO9szC15Fn3hHjeSre-0=', '2025-11-10 21:15:02', 0, 'Chrome Browser / web', '10.48.108.21', '2025-10-11 22:15:02', '2025-10-11 22:15:02'),
(473, 1027, 'refresh', 'dGDiSk1NlIhC9kz_-rd92L7rFiRYw7AxxzQBifbW0xQ=', '2025-11-10 22:05:16', 0, 'Firefox Browser / web', '10.48.104.72', '2025-10-11 23:05:16', '2025-10-11 23:05:16'),
(474, 15, 'refresh', '-aYNUAF5cDfb9mgv_quvWw_3gycgHdGHaBzpSsP76dw=', '2025-11-10 22:07:25', 1, 'Chrome Browser / web', '10.198.110.27', '2025-10-11 23:07:25', '2025-10-12 01:21:34'),
(475, 14, 'refresh', 'qLrQ0MQ_JoMFvMshi6M09WsZ82Ev--86-eU41ha0I3E=', '2025-11-10 22:28:44', 1, 'Chrome Browser / web', '10.48.108.21', '2025-10-11 23:28:44', '2025-10-11 23:29:34'),
(476, 14, 'refresh', 'Z-WFwmzNWbNQwZermc_57gRdleZ1IT-ZCWDy6X2h_qs=', '2025-11-10 22:30:09', 0, 'Chrome Browser / web', '10.48.108.21', '2025-10-11 23:30:09', '2025-10-11 23:30:09'),
(477, 14, 'refresh', 'qPPr9aCPVfzRwb_Y_kxhyuCuWp19NgYa58uvmmuTfvQ=', '2025-11-11 00:21:37', 1, 'Chrome Browser / web', '10.198.110.27', '2025-10-12 01:21:37', '2025-10-12 01:22:29'),
(478, 15, 'refresh', 'ylUTJqzQ-O2imA2nDDBK7mfmOdG7z7hnatKQQP2G6y8=', '2025-11-11 00:22:36', 1, 'Chrome Browser / web', '10.198.110.27', '2025-10-12 01:22:36', '2025-10-12 01:25:43'),
(479, 1027, 'refresh', 'PEqw1IM4Fkr1Lnu5ve4rXzQyl_wathGnLP6-QLTy5uA=', '2025-11-11 00:25:49', 1, 'Chrome Browser / web', '10.198.110.27', '2025-10-12 01:25:49', '2025-10-14 01:43:15'),
(480, 1027, 'refresh', 'ARoBc1u6vImRpsRVIJo7rPYG9dGvnN51wBdd30CWXbs=', '2025-11-11 00:54:47', 0, 'Firefox Browser / web', '10.48.104.72', '2025-10-12 01:54:47', '2025-10-12 01:54:47'),
(481, 1027, 'refresh', 'EvkXkEmNG1_YoU4n8XLjD0Rdp9D68Q9yk9R4X6oXn88=', '2025-11-12 05:56:48', 0, 'Firefox Browser / web', '10.48.104.113', '2025-10-13 06:56:48', '2025-10-13 06:56:48'),
(482, 1027, 'refresh', '5YmnboWhj_zMaM5BTwpBwH9UHEx4l5Y6HprX2AQo5_o=', '2025-11-12 20:16:19', 1, 'Chrome Browser / web', '10.54.62.22', '2025-10-13 21:16:19', '2025-10-13 23:53:21'),
(483, 1027, 'refresh', 'SIMYoZv7_DDjVXI4fLZdmke0OxvVCNRGnXYSr35msXA=', '2025-11-12 22:53:32', 0, 'Chrome Browser / web', '10.54.62.22', '2025-10-13 23:53:32', '2025-10-13 23:53:32'),
(484, 15, 'refresh', 'XzerWeQI3t1ghDan99gVChsYCNVJmanvPaodxZwygJg=', '2025-11-13 00:43:26', 0, 'Chrome Browser / web', '10.198.110.27', '2025-10-14 01:43:26', '2025-10-14 01:43:26');

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
-- Stand-in structure for view `v_approval_records`
-- (See below for the actual view)
--
CREATE TABLE `v_approval_records` (
`submission_id` int(11)
,`submission_number` varchar(255)
,`submission_type` enum('fund_application','publication_reward')
,`user_id` int(11)
,`applicant_name` varchar(511)
,`year_id` int(11)
,`year_th` varchar(255)
,`category_id` int(11)
,`category_name` varchar(255)
,`subcategory_id` int(11)
,`subcategory_name` varchar(255)
,`subcategory_budget_id` int(11)
,`subcategory_budget_label` mediumtext
,`status_id` int(11)
,`approved_by` int(11)
,`approved_at` datetime
,`approved_amount` decimal(37,2)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_approval_totals_by_teacher`
-- (See below for the actual view)
--
CREATE TABLE `v_approval_totals_by_teacher` (
`user_id` int(11)
,`applicant_name` varchar(511)
,`year_id` int(11)
,`year_th` varchar(255)
,`category_id` int(11)
,`category_name` varchar(255)
,`subcategory_id` int(11)
,`subcategory_name` varchar(255)
,`subcategory_budget_id` int(11)
,`subcategory_budget_label` mediumtext
,`total_approved_amount` decimal(59,2)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_budget_summary`
-- (See below for the actual view)
--
CREATE TABLE `v_budget_summary` (
`subcategory_id` int(11)
,`allocated_amount` decimal(15,2)
,`used_amount` decimal(37,2)
,`remaining_budget` decimal(38,2)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_current_dept_head`
-- (See below for the actual view)
--
CREATE TABLE `v_current_dept_head` (
`head_user_id` int(11)
,`effective_from` datetime
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
,`action` enum('create','update','delete','login','logout','view','download','approve','reject','submit','review','request_revision')
,`entity_type` varchar(50)
,`entity_number` varchar(50)
,`description` text
,`ip_address` varchar(45)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_subcategory_policy_rules`
-- (See below for the actual view)
--
CREATE TABLE `v_subcategory_policy_rules` (
`subcategory_id` int(11)
,`subcategory_budget_id` int(11)
,`max_grants` int(11)
,`max_amount_per_grant` decimal(15,2)
,`max_amount_per_year` decimal(15,2)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_subcategory_user_usage_by_type`
-- (See below for the actual view)
--
CREATE TABLE `v_subcategory_user_usage_by_type` (
`user_id` int(11)
,`year_id` int(11)
,`subcategory_id` int(11)
,`subcategory_budget_id` int(11)
,`submission_type` enum('fund_application','publication_reward')
,`used_grants` bigint(21)
,`used_amount` decimal(37,2)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_subcategory_user_usage_total`
-- (See below for the actual view)
--
CREATE TABLE `v_subcategory_user_usage_total` (
`user_id` int(11)
,`year_id` int(11)
,`subcategory_id` int(11)
,`used_grants_fund` decimal(22,0)
,`used_amount_fund` decimal(37,2)
,`used_grants_pub` decimal(22,0)
,`used_amount_pub` decimal(37,2)
,`used_grants_total` decimal(22,0)
,`used_amount_total` decimal(37,2)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_submission_audit_trail`
-- (See below for the actual view)
--
CREATE TABLE `v_submission_audit_trail` (
`submission_number` varchar(255)
,`submission_type` enum('fund_application','publication_reward')
,`created_at` datetime
,`action_by` varchar(511)
,`action` enum('create','update','delete','login','logout','view','download','approve','reject','submit','review','request_revision')
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
,`last_login` datetime
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `years`
--

INSERT INTO `years` (`year_id`, `year`, `budget`, `status`, `create_at`, `update_at`, `delete_at`) VALUES
(1, '2566', 1000000.00, 'active', '2025-06-24 16:49:13', '2025-07-23 10:18:36', NULL),
(2, '2567', 1500000.00, 'active', '2025-06-24 16:49:13', '2025-08-08 21:22:24', NULL),
(3, '2568', 2000000.00, 'active', '2025-07-08 10:44:10', '2025-08-10 19:49:28', NULL),
(4, '2569', 1000000.00, 'active', '2025-08-27 14:58:19', '2025-08-27 14:58:19', NULL);

-- --------------------------------------------------------

--
-- Structure for view `view_budget_summary`
--
DROP TABLE IF EXISTS `view_budget_summary`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_budget_summary`  AS SELECT `y`.`year` AS `year`, `fc`.`category_name` AS `category_name`, `fs`.`subcategory_name` AS `subcategory_name`, `sb`.`allocated_amount` AS `allocated_amount`, `sb`.`used_amount` AS `used_amount`, `sb`.`remaining_budget` AS `remaining_budget`, `sb`.`max_grants` AS `max_grants`, `sb`.`remaining_grant` AS `remaining_grant`, count(`fa`.`application_id`) AS `total_applications`, count(case when `fa`.`application_status_id` = 2 then 1 end) AS `approved_applications` FROM ((((`subcategory_budgets` `sb` left join `fund_subcategories` `fs` on(`sb`.`subcategory_id` = `fs`.`subcategory_id`)) left join `fund_categories` `fc` on(`fs`.`category_id` = `fc`.`category_id`)) left join `years` `y` on(`fc`.`year_id` = `y`.`year_id`)) left join `v_fund_applications` `fa` on(`fs`.`subcategory_id` = `fa`.`subcategory_id` and `fa`.`delete_at` is null)) WHERE `sb`.`delete_at` is null GROUP BY `sb`.`subcategory_budget_id`, `y`.`year`, `fc`.`category_name`, `fs`.`subcategory_name`, `sb`.`allocated_amount`, `sb`.`used_amount`, `sb`.`remaining_budget`, `sb`.`max_grants`, `sb`.`remaining_grant` ;

-- --------------------------------------------------------

--
-- Structure for view `view_fund_applications_summary`
--
DROP TABLE IF EXISTS `view_fund_applications_summary`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `view_fund_applications_summary`  AS SELECT `fa`.`application_id` AS `application_id`, `fa`.`application_number` AS `application_number`, `fa`.`project_title` AS `project_title`, concat(`u`.`user_fname`,' ',`u`.`user_lname`) AS `applicant_name`, `u`.`email` AS `email`, `p`.`position_name` AS `position_name`, `fc`.`category_name` AS `category_name`, `fs`.`subcategory_name` AS `subcategory_name`, `y`.`year` AS `year`, `ast`.`status_name` AS `status_name`, `fa`.`requested_amount` AS `requested_amount`, `fa`.`approved_amount` AS `approved_amount`, `fa`.`submitted_at` AS `submitted_at`, `fa`.`approved_at` AS `approved_at` FROM ((((((`v_fund_applications` `fa` left join `users` `u` on(`fa`.`user_id` = `u`.`user_id`)) left join `positions` `p` on(`u`.`position_id` = `p`.`position_id`)) left join `fund_subcategories` `fs` on(`fa`.`subcategory_id` = `fs`.`subcategory_id`)) left join `fund_categories` `fc` on(`fs`.`category_id` = `fc`.`category_id`)) left join `years` `y` on(`fa`.`year_id` = `y`.`year_id`)) left join `application_status` `ast` on(`fa`.`application_status_id` = `ast`.`application_status_id`)) WHERE `fa`.`delete_at` is null ;

-- --------------------------------------------------------

--
-- Structure for view `v_active_reward_config`
--
DROP TABLE IF EXISTS `v_active_reward_config`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_active_reward_config`  AS SELECT `reward_config`.`config_id` AS `config_id`, `reward_config`.`year` AS `year`, `reward_config`.`journal_quartile` AS `journal_quartile`, `reward_config`.`max_amount` AS `max_amount`, `reward_config`.`condition_description` AS `condition_description`, `reward_config`.`create_at` AS `create_at`, `reward_config`.`update_at` AS `update_at` FROM `reward_config` WHERE `reward_config`.`is_active` = 1 AND `reward_config`.`delete_at` is null ORDER BY `reward_config`.`year` DESC, `reward_config`.`journal_quartile` ASC ;

-- --------------------------------------------------------

--
-- Structure for view `v_approval_records`
--
DROP TABLE IF EXISTS `v_approval_records`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_approval_records`  AS SELECT `s`.`submission_id` AS `submission_id`, `s`.`submission_number` AS `submission_number`, `s`.`submission_type` AS `submission_type`, `s`.`user_id` AS `user_id`, concat(`u`.`user_fname`,' ',`u`.`user_lname`) AS `applicant_name`, `s`.`year_id` AS `year_id`, `y`.`year` AS `year_th`, `s`.`category_id` AS `category_id`, `fc`.`category_name` AS `category_name`, `s`.`subcategory_id` AS `subcategory_id`, `fsc`.`subcategory_name` AS `subcategory_name`, `s`.`subcategory_budget_id` AS `subcategory_budget_id`, coalesce(nullif(trim(`sb`.`fund_description`),''),nullif(concat('ระดับ ',`sb`.`level`),'ระดับ '),concat('งบ #',`sb`.`subcategory_budget_id`)) AS `subcategory_budget_label`, `s`.`status_id` AS `status_id`, `s`.`approved_by` AS `approved_by`, `s`.`approved_at` AS `approved_at`, CASE WHEN `s`.`submission_type` = 'publication_reward' THEN coalesce(`prd`.`total_approve_amount`,coalesce(`prd`.`reward_approve_amount`,0) + coalesce(`prd`.`revision_fee_approve_amount`,0) + coalesce(`prd`.`publication_fee_approve_amount`,0),0) WHEN `s`.`submission_type` = 'fund_application' THEN coalesce(`fa`.`total_approved_amount`,0) ELSE 0 END AS `approved_amount` FROM (((((((`submissions` `s` join `users` `u` on(`u`.`user_id` = `s`.`user_id` and (`u`.`delete_at` is null or `u`.`delete_at` = 0))) join `years` `y` on(`y`.`year_id` = `s`.`year_id`)) left join `fund_categories` `fc` on(`fc`.`category_id` = `s`.`category_id`)) left join `fund_subcategories` `fsc` on(`fsc`.`subcategory_id` = `s`.`subcategory_id`)) left join `subcategory_budgets` `sb` on(`sb`.`subcategory_budget_id` = `s`.`subcategory_budget_id`)) left join `publication_reward_details` `prd` on(`prd`.`submission_id` = `s`.`submission_id`)) left join (select `fund_application_details`.`submission_id` AS `submission_id`,sum(coalesce(`fund_application_details`.`approved_amount`,0)) AS `total_approved_amount` from `fund_application_details` group by `fund_application_details`.`submission_id`) `fa` on(`fa`.`submission_id` = `s`.`submission_id`)) WHERE `s`.`status_id` = 2 AND `s`.`deleted_at` is null ;

-- --------------------------------------------------------

--
-- Structure for view `v_approval_totals_by_teacher`
--
DROP TABLE IF EXISTS `v_approval_totals_by_teacher`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_approval_totals_by_teacher`  AS SELECT `r`.`user_id` AS `user_id`, `r`.`applicant_name` AS `applicant_name`, `r`.`year_id` AS `year_id`, `r`.`year_th` AS `year_th`, `r`.`category_id` AS `category_id`, `r`.`category_name` AS `category_name`, `r`.`subcategory_id` AS `subcategory_id`, `r`.`subcategory_name` AS `subcategory_name`, `r`.`subcategory_budget_id` AS `subcategory_budget_id`, `r`.`subcategory_budget_label` AS `subcategory_budget_label`, sum(`r`.`approved_amount`) AS `total_approved_amount` FROM `v_approval_records` AS `r` GROUP BY `r`.`user_id`, `r`.`year_id`, `r`.`category_id`, `r`.`subcategory_id`, `r`.`subcategory_budget_id` ;

-- --------------------------------------------------------

--
-- Structure for view `v_budget_summary`
--
DROP TABLE IF EXISTS `v_budget_summary`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_budget_summary`  AS SELECT `sb`.`subcategory_id` AS `subcategory_id`, `sb`.`allocated_amount` AS `allocated_amount`, coalesce(sum(case when `s`.`submission_type` = 'fund_application' then ifnull(`fad`.`approved_amount`,0) when `s`.`submission_type` = 'publication_reward' then ifnull(`prd`.`total_approve_amount`,0) else 0 end),0) AS `used_amount`, `sb`.`allocated_amount`- coalesce(sum(case when `s`.`submission_type` = 'fund_application' then ifnull(`fad`.`approved_amount`,0) when `s`.`submission_type` = 'publication_reward' then ifnull(`prd`.`total_approve_amount`,0) else 0 end),0) AS `remaining_budget` FROM (((`subcategory_budgets` `sb` left join `submissions` `s` on(`s`.`subcategory_id` = `sb`.`subcategory_id` and `s`.`status_id` = 2)) left join `fund_application_details` `fad` on(`fad`.`submission_id` = `s`.`submission_id`)) left join `publication_reward_details` `prd` on(`prd`.`submission_id` = `s`.`submission_id`)) WHERE `sb`.`record_scope` = 'overall' GROUP BY `sb`.`subcategory_id`, `sb`.`allocated_amount` ;

-- --------------------------------------------------------

--
-- Structure for view `v_current_dept_head`
--
DROP TABLE IF EXISTS `v_current_dept_head`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_current_dept_head`  AS SELECT `dept_head_assignments`.`head_user_id` AS `head_user_id`, `dept_head_assignments`.`effective_from` AS `effective_from` FROM `dept_head_assignments` WHERE `dept_head_assignments`.`effective_to` is null ;

-- --------------------------------------------------------

--
-- Structure for view `v_file_uploads_readable`
--
DROP TABLE IF EXISTS `v_file_uploads_readable`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_file_uploads_readable`  AS SELECT `f`.`file_id` AS `file_id`, `f`.`original_name` AS `original_name`, `f`.`stored_path` AS `stored_path`, `f`.`folder_type` AS `folder_type`, `f`.`submission_id` AS `submission_id`, `f`.`file_size` AS `file_size`, `f`.`mime_type` AS `mime_type`, `f`.`file_hash` AS `file_hash`, `f`.`is_public` AS `is_public`, `f`.`uploaded_by` AS `uploaded_by`, `f`.`uploaded_at` AS `uploaded_at`, `f`.`create_at` AS `create_at`, `f`.`update_at` AS `update_at`, `f`.`delete_at` AS `delete_at`, `u`.`user_fname` AS `user_fname`, `u`.`user_lname` AS `user_lname`, concat(`u`.`user_fname`,' ',`u`.`user_lname`) AS `uploader_name`, CASE WHEN `f`.`stored_path` like '%/users/%' THEN substring_index(substring_index(`f`.`stored_path`,'/users/',-1),'/',1) ELSE 'unknown' END AS `user_folder`, CASE `f`.`folder_type` WHEN 'temp' THEN 'Temporary Files' WHEN 'submission' THEN 'Submission Files' WHEN 'profile' THEN 'Profile Files' ELSE 'Other Files' END AS `folder_type_name` FROM (`file_uploads` `f` left join `users` `u` on(`f`.`uploaded_by` = `u`.`user_id`)) WHERE `f`.`delete_at` is null ;

-- --------------------------------------------------------

--
-- Structure for view `v_file_usage_stats`
--
DROP TABLE IF EXISTS `v_file_usage_stats`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_file_usage_stats`  AS SELECT `u`.`user_id` AS `user_id`, concat(`u`.`user_fname`,' ',`u`.`user_lname`) AS `user_name`, `u`.`email` AS `email`, count(`f`.`file_id`) AS `total_files`, sum(`f`.`file_size`) AS `total_size`, avg(`f`.`file_size`) AS `avg_file_size`, count(case when `f`.`folder_type` = 'temp' then 1 end) AS `temp_files`, count(case when `f`.`folder_type` = 'submission' then 1 end) AS `submission_files`, count(case when `f`.`folder_type` = 'profile' then 1 end) AS `profile_files`, max(`f`.`uploaded_at`) AS `last_upload` FROM (`users` `u` left join `file_uploads` `f` on(`u`.`user_id` = `f`.`uploaded_by` and `f`.`delete_at` is null)) WHERE `u`.`delete_at` is null GROUP BY `u`.`user_id`, `u`.`user_fname`, `u`.`user_lname`, `u`.`email` ORDER BY count(`f`.`file_id`) DESC ;

-- --------------------------------------------------------

--
-- Structure for view `v_fund_applications`
--
DROP TABLE IF EXISTS `v_fund_applications`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_fund_applications`  AS SELECT `s`.`submission_id` AS `application_id`, `s`.`submission_number` AS `application_number`, `s`.`user_id` AS `user_id`, `s`.`year_id` AS `year_id`, `fad`.`subcategory_id` AS `subcategory_id`, `s`.`status_id` AS `application_status_id`, `s`.`approved_by` AS `approved_by`, `fad`.`project_title` AS `project_title`, `fad`.`project_description` AS `project_description`, `fad`.`requested_amount` AS `requested_amount`, `fad`.`approved_amount` AS `approved_amount`, `s`.`submitted_at` AS `submitted_at`, `s`.`approved_at` AS `approved_at`, `fad`.`closed_at` AS `closed_at`, `fad`.`comment` AS `comment`, `s`.`created_at` AS `create_at`, `s`.`updated_at` AS `update_at`, `s`.`deleted_at` AS `delete_at` FROM (`submissions` `s` join `fund_application_details` `fad` on(`s`.`submission_id` = `fad`.`submission_id`)) WHERE `s`.`submission_type` = 'fund_application' ;

-- --------------------------------------------------------

--
-- Structure for view `v_publication_rewards`
--
DROP TABLE IF EXISTS `v_publication_rewards`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_publication_rewards`  AS SELECT `s`.`submission_id` AS `reward_id`, `s`.`submission_number` AS `reward_number`, `s`.`user_id` AS `user_id`, `prd`.`paper_title` AS `paper_title`, `prd`.`journal_name` AS `journal_name`, `prd`.`publication_date` AS `publication_date`, `prd`.`quartile` AS `journal_quartile`, `prd`.`doi` AS `doi`, `prd`.`reward_amount` AS `reward_amount`, `s`.`status_id` AS `status_id`, `s`.`submitted_at` AS `submitted_at`, `s`.`created_at` AS `created_at`, `s`.`updated_at` AS `updated_at`, `s`.`deleted_at` AS `deleted_at` FROM (`submissions` `s` join `publication_reward_details` `prd` on(`s`.`submission_id` = `prd`.`submission_id`)) WHERE `s`.`submission_type` = 'publication_reward' ;

-- --------------------------------------------------------

--
-- Structure for view `v_recent_audit_logs`
--
DROP TABLE IF EXISTS `v_recent_audit_logs`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_recent_audit_logs`  AS SELECT `al`.`log_id` AS `log_id`, `al`.`created_at` AS `created_at`, concat(`u`.`user_fname`,' ',`u`.`user_lname`) AS `user_name`, `al`.`action` AS `action`, `al`.`entity_type` AS `entity_type`, `al`.`entity_number` AS `entity_number`, `al`.`description` AS `description`, `al`.`ip_address` AS `ip_address` FROM (`audit_logs` `al` left join `users` `u` on(`al`.`user_id` = `u`.`user_id`)) ORDER BY `al`.`created_at` DESC LIMIT 0, 100 ;

-- --------------------------------------------------------

--
-- Structure for view `v_subcategory_policy_rules`
--
DROP TABLE IF EXISTS `v_subcategory_policy_rules`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_subcategory_policy_rules`  AS SELECT `r`.`subcategory_id` AS `subcategory_id`, `r`.`subcategory_budget_id` AS `subcategory_budget_id`, `r`.`max_grants` AS `max_grants`, `r`.`max_amount_per_grant` AS `max_amount_per_grant`, `r`.`max_amount_per_year` AS `max_amount_per_year` FROM `subcategory_budgets` AS `r` WHERE `r`.`record_scope` = 'rule'union all select `o`.`subcategory_id` AS `subcategory_id`,`o`.`subcategory_budget_id` AS `subcategory_budget_id`,`o`.`max_grants` AS `max_grants`,`o`.`max_amount_per_grant` AS `max_amount_per_grant`,`o`.`max_amount_per_year` AS `max_amount_per_year` from `subcategory_budgets` `o` where `o`.`record_scope` = 'overall' and !exists(select 1 from `subcategory_budgets` `rr` where `rr`.`subcategory_id` = `o`.`subcategory_id` and `rr`.`record_scope` = 'rule' limit 1)  ;

-- --------------------------------------------------------

--
-- Structure for view `v_subcategory_user_usage_by_type`
--
DROP TABLE IF EXISTS `v_subcategory_user_usage_by_type`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_subcategory_user_usage_by_type`  AS SELECT `s`.`user_id` AS `user_id`, `s`.`year_id` AS `year_id`, `s`.`subcategory_id` AS `subcategory_id`, `s`.`subcategory_budget_id` AS `subcategory_budget_id`, `s`.`submission_type` AS `submission_type`, count(0) AS `used_grants`, sum(case when `s`.`submission_type` = 'fund_application' then ifnull(`fad`.`approved_amount`,0) when `s`.`submission_type` = 'publication_reward' then ifnull(`prd`.`total_approve_amount`,0) else 0 end) AS `used_amount` FROM ((`submissions` `s` left join `fund_application_details` `fad` on(`fad`.`submission_id` = `s`.`submission_id`)) left join `publication_reward_details` `prd` on(`prd`.`submission_id` = `s`.`submission_id`)) WHERE `s`.`status_id` = 2 AND `s`.`submission_type` in ('fund_application','publication_reward') GROUP BY `s`.`user_id`, `s`.`year_id`, `s`.`subcategory_id`, `s`.`subcategory_budget_id`, `s`.`submission_type` ;

-- --------------------------------------------------------

--
-- Structure for view `v_subcategory_user_usage_total`
--
DROP TABLE IF EXISTS `v_subcategory_user_usage_total`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_subcategory_user_usage_total`  AS SELECT `s`.`user_id` AS `user_id`, `s`.`year_id` AS `year_id`, `s`.`subcategory_id` AS `subcategory_id`, sum(case when `s`.`submission_type` = 'fund_application' then 1 else 0 end) AS `used_grants_fund`, sum(case when `s`.`submission_type` = 'fund_application' then ifnull(`fad`.`approved_amount`,0) else 0 end) AS `used_amount_fund`, sum(case when `s`.`submission_type` = 'publication_reward' then 1 else 0 end) AS `used_grants_pub`, sum(case when `s`.`submission_type` = 'publication_reward' then ifnull(`prd`.`total_approve_amount`,0) else 0 end) AS `used_amount_pub`, sum(case when `s`.`submission_type` in ('fund_application','publication_reward') then 1 else 0 end) AS `used_grants_total`, sum(case when `s`.`submission_type` = 'fund_application' then ifnull(`fad`.`approved_amount`,0) when `s`.`submission_type` = 'publication_reward' then ifnull(`prd`.`total_approve_amount`,0) else 0 end) AS `used_amount_total` FROM ((`submissions` `s` left join `fund_application_details` `fad` on(`fad`.`submission_id` = `s`.`submission_id`)) left join `publication_reward_details` `prd` on(`prd`.`submission_id` = `s`.`submission_id`)) WHERE `s`.`status_id` = 2 AND `s`.`submission_type` in ('fund_application','publication_reward') GROUP BY `s`.`user_id`, `s`.`year_id`, `s`.`subcategory_id` ;

-- --------------------------------------------------------

--
-- Structure for view `v_submission_audit_trail`
--
DROP TABLE IF EXISTS `v_submission_audit_trail`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_submission_audit_trail`  AS SELECT `s`.`submission_number` AS `submission_number`, `s`.`submission_type` AS `submission_type`, `al`.`created_at` AS `created_at`, concat(`u`.`user_fname`,' ',`u`.`user_lname`) AS `action_by`, `al`.`action` AS `action`, `al`.`changed_fields` AS `changed_fields`, `al`.`description` AS `description` FROM ((`submissions` `s` join `audit_logs` `al` on(`al`.`entity_type` = 'submission' and `al`.`entity_id` = `s`.`submission_id`)) left join `users` `u` on(`al`.`user_id` = `u`.`user_id`)) ORDER BY `s`.`submission_id` ASC, `al`.`created_at` ASC ;

-- --------------------------------------------------------

--
-- Structure for view `v_user_activity_summary`
--
DROP TABLE IF EXISTS `v_user_activity_summary`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_user_activity_summary`  AS SELECT `u`.`user_id` AS `user_id`, concat(`u`.`user_fname`,' ',`u`.`user_lname`) AS `user_name`, count(case when `al`.`action` = 'login' then 1 end) AS `login_count`, count(case when `al`.`action` = 'create' then 1 end) AS `create_count`, count(case when `al`.`action` = 'update' then 1 end) AS `update_count`, count(case when `al`.`action` = 'download' then 1 end) AS `download_count`, max(case when `al`.`action` = 'login' then `al`.`created_at` end) AS `last_login`, count(0) AS `total_actions` FROM (`users` `u` left join `audit_logs` `al` on(`u`.`user_id` = `al`.`user_id`)) GROUP BY `u`.`user_id` ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `announcements`
--
ALTER TABLE `announcements`
  ADD PRIMARY KEY (`announcement_id`),
  ADD KEY `idx_announcement_type` (`announcement_type`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_priority` (`priority`),
  ADD KEY `idx_published_at` (`published_at`),
  ADD KEY `idx_expired_at` (`expired_at`),
  ADD KEY `idx_created_by` (`created_by`),
  ADD KEY `idx_delete_at` (`delete_at`),
  ADD KEY `idx_announcements_type_status_published` (`announcement_type`,`status`,`published_at`),
  ADD KEY `idx_announcements_status_priority_published` (`status`,`priority`,`published_at`),
  ADD KEY `idx_year_id` (`year_id`);

--
-- Indexes for table `announcement_assignments`
--
ALTER TABLE `announcement_assignments`
  ADD PRIMARY KEY (`assignment_id`),
  ADD KEY `idx_aa_slot_code` (`slot_code`),
  ADD KEY `idx_aa_announcement_id` (`announcement_id`),
  ADD KEY `fk_aa_changed_by` (`changed_by`),
  ADD KEY `idx_aa_active` (`end_date`),
  ADD KEY `idx_aa_effective_window` (`slot_code`,`start_date`,`end_date`);

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
-- Indexes for table `cp_employee`
--
ALTER TABLE `cp_employee`
  ADD PRIMARY KEY (`ID`);

--
-- Indexes for table `dept_head_assignments`
--
ALTER TABLE `dept_head_assignments`
  ADD PRIMARY KEY (`assignment_id`),
  ADD KEY `fk_dha_head_user` (`head_user_id`),
  ADD KEY `fk_dha_changed_by` (`changed_by`),
  ADD KEY `fk_dha_restore_role_id` (`restore_role_id`),
  ADD KEY `idx_dha_active` (`effective_to`);

--
-- Indexes for table `document_types`
--
ALTER TABLE `document_types`
  ADD PRIMARY KEY (`document_type_id`);

--
-- Indexes for table `end_of_contract`
--
ALTER TABLE `end_of_contract`
  ADD PRIMARY KEY (`eoc_id`),
  ADD KEY `idx_eoc_order` (`display_order`);

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
  ADD KEY `idx_subcategory` (`subcategory_id`),
  ADD KEY `idx_approved_by` (`approved_by`),
  ADD KEY `idx_rejected_by` (`rejected_by`),
  ADD KEY `main_annoucement` (`main_annoucement`),
  ADD KEY `activity_support_announcement` (`activity_support_announcement`);

--
-- Indexes for table `fund_categories`
--
ALTER TABLE `fund_categories`
  ADD PRIMARY KEY (`category_id`),
  ADD KEY `year_id` (`year_id`);

--
-- Indexes for table `fund_forms`
--
ALTER TABLE `fund_forms`
  ADD PRIMARY KEY (`form_id`),
  ADD KEY `idx_form_type` (`form_type`),
  ADD KEY `idx_fund_category` (`fund_category`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_created_by` (`created_by`),
  ADD KEY `idx_delete_at` (`delete_at`),
  ADD KEY `idx_fund_forms_category_type_status` (`fund_category`,`form_type`,`status`),
  ADD KEY `idx_fund_forms_status_effective_expiry` (`status`),
  ADD KEY `idx_year_id` (`year_id`);

--
-- Indexes for table `fund_installment_periods`
--
ALTER TABLE `fund_installment_periods`
  ADD PRIMARY KEY (`installment_period_id`),
  ADD UNIQUE KEY `ux_period_year_installment` (`year_id`,`installment_number`),
  ADD KEY `idx_year_cutoff` (`year_id`,`cutoff_date`);

--
-- Indexes for table `fund_subcategories`
--
ALTER TABLE `fund_subcategories`
  ADD PRIMARY KEY (`subcategory_id`),
  ADD KEY `category_id` (`category_id`),
  ADD KEY `fund_subcategorie_ibfk_2` (`year_id`);

--
-- Indexes for table `innovations`
--
ALTER TABLE `innovations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

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
  ADD KEY `fk_notif_submission` (`related_submission_id`),
  ADD KEY `idx_user_created_at` (`user_id`,`create_at`);

--
-- Indexes for table `positions`
--
ALTER TABLE `positions`
  ADD PRIMARY KEY (`position_id`);

--
-- Indexes for table `publications`
--
ALTER TABLE `publications`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_doi` (`doi`),
  ADD UNIQUE KEY `uniq_fingerprint` (`fingerprint`),
  ADD UNIQUE KEY `ux_pub_user_doi` (`user_id`,`doi`),
  ADD UNIQUE KEY `ux_pub_user_fingerprint` (`user_id`,`fingerprint`),
  ADD KEY `idx_user_year` (`user_id`,`publication_year`);

--
-- Indexes for table `publication_reward_details`
--
ALTER TABLE `publication_reward_details`
  ADD PRIMARY KEY (`detail_id`),
  ADD UNIQUE KEY `submission_id` (`submission_id`),
  ADD UNIQUE KEY `idx_submission` (`submission_id`),
  ADD KEY `idx_publication_date` (`publication_date`),
  ADD KEY `idx_quartile` (`quartile`),
  ADD KEY `idx_approved_by` (`approved_by`),
  ADD KEY `idx_rejected_by` (`rejected_by`),
  ADD KEY `idx_revision_requested_by` (`revision_requested_by`),
  ADD KEY `idx_approved_at` (`approved_at`),
  ADD KEY `idx_rejected_at` (`rejected_at`),
  ADD KEY `idx_prd_submission` (`submission_id`),
  ADD KEY `idx_prd_main_annoucement` (`main_annoucement`),
  ADD KEY `idx_prd_reward_announcement` (`reward_announcement`);

--
-- Indexes for table `publication_reward_external_funds`
--
ALTER TABLE `publication_reward_external_funds`
  ADD PRIMARY KEY (`external_fund_id`),
  ADD KEY `idx_pref_detail_id` (`detail_id`),
  ADD KEY `idx_pref_submission_id` (`submission_id`),
  ADD KEY `idx_pref_document_id` (`document_id`),
  ADD KEY `idx_pref_file_id` (`file_id`);

--
-- Indexes for table `publication_reward_rates`
--
ALTER TABLE `publication_reward_rates`
  ADD PRIMARY KEY (`rate_id`),
  ADD UNIQUE KEY `year_status_quartile` (`year`,`author_status`,`journal_quartile`);

--
-- Indexes for table `research_fund_admin_events`
--
ALTER TABLE `research_fund_admin_events`
  ADD PRIMARY KEY (`event_id`),
  ADD KEY `idx_rfae_submission_created_at` (`submission_id`,`created_at`),
  ADD KEY `idx_rfae_status_after_id` (`status_after_id`),
  ADD KEY `fk_rfae_created_by` (`created_by`);

--
-- Indexes for table `research_fund_event_files`
--
ALTER TABLE `research_fund_event_files`
  ADD PRIMARY KEY (`event_file_id`),
  ADD KEY `idx_rfef_event_id` (`event_id`),
  ADD KEY `idx_rfef_file_id` (`file_id`);

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
-- Indexes for table `scholar_import_runs`
--
ALTER TABLE `scholar_import_runs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_scholar_import_runs_status` (`status`),
  ADD KEY `idx_scholar_import_runs_started_at` (`started_at`);

--
-- Indexes for table `subcategory_budgets`
--
ALTER TABLE `subcategory_budgets`
  ADD PRIMARY KEY (`subcategory_budget_id`),
  ADD KEY `subcategories_budgets_ibfk_1` (`subcategory_id`),
  ADD KEY `idx_subcat_scope` (`subcategory_id`,`record_scope`);

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
  ADD KEY `idx_submission_user_year` (`user_id`,`year_id`),
  ADD KEY `idx_submission_category` (`category_id`),
  ADD KEY `idx_submission_subcategory` (`subcategory_id`),
  ADD KEY `idx_submission_budget` (`subcategory_budget_id`),
  ADD KEY `idx_submission_category_subcategory` (`category_id`,`subcategory_id`),
  ADD KEY `idx_submissions_approval` (`status_id`,`user_id`,`year_id`,`category_id`,`subcategory_id`,`subcategory_budget_id`,`approved_at`),
  ADD KEY `head_approved_by` (`head_approved_by`),
  ADD KEY `idx_subm_admin_approved_by` (`admin_approved_by`),
  ADD KEY `idx_subm_rejected_by` (`rejected_by`),
  ADD KEY `idx_subm_rejected_at` (`rejected_at`),
  ADD KEY `idx_head_rejected_by` (`head_rejected_by`),
  ADD KEY `idx_admin_rejected_by` (`admin_rejected_by`),
  ADD KEY `idx_admin_approved_by` (`admin_approved_by`);

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
  ADD KEY `updated_by` (`updated_by`),
  ADD KEY `main_annoucement` (`main_annoucement`),
  ADD KEY `reward_announcement` (`reward_announcement`),
  ADD KEY `activity_support_announcement` (`activity_support_announcement`),
  ADD KEY `conference_announcement` (`conference_announcement`),
  ADD KEY `service_announcement` (`service_announcement`);

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
-- Indexes for table `user_scholar_metrics`
--
ALTER TABLE `user_scholar_metrics`
  ADD PRIMARY KEY (`user_id`);

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
-- AUTO_INCREMENT for table `announcements`
--
ALTER TABLE `announcements`
  MODIFY `announcement_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `announcement_assignments`
--
ALTER TABLE `announcement_assignments`
  MODIFY `assignment_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `application_status`
--
ALTER TABLE `application_status`
  MODIFY `application_status_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `log_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=428;

--
-- AUTO_INCREMENT for table `dept_head_assignments`
--
ALTER TABLE `dept_head_assignments`
  MODIFY `assignment_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `document_types`
--
ALTER TABLE `document_types`
  MODIFY `document_type_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `end_of_contract`
--
ALTER TABLE `end_of_contract`
  MODIFY `eoc_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `file_uploads`
--
ALTER TABLE `file_uploads`
  MODIFY `file_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=305;

--
-- AUTO_INCREMENT for table `fund_application_details`
--
ALTER TABLE `fund_application_details`
  MODIFY `detail_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=87;

--
-- AUTO_INCREMENT for table `fund_categories`
--
ALTER TABLE `fund_categories`
  MODIFY `category_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `fund_forms`
--
ALTER TABLE `fund_forms`
  MODIFY `form_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `fund_installment_periods`
--
ALTER TABLE `fund_installment_periods`
  MODIFY `installment_period_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `fund_subcategories`
--
ALTER TABLE `fund_subcategories`
  MODIFY `subcategory_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=41;

--
-- AUTO_INCREMENT for table `innovations`
--
ALTER TABLE `innovations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `notification_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=155;

--
-- AUTO_INCREMENT for table `positions`
--
ALTER TABLE `positions`
  MODIFY `position_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `publications`
--
ALTER TABLE `publications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=236;

--
-- AUTO_INCREMENT for table `publication_reward_details`
--
ALTER TABLE `publication_reward_details`
  MODIFY `detail_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=131;

--
-- AUTO_INCREMENT for table `publication_reward_external_funds`
--
ALTER TABLE `publication_reward_external_funds`
  MODIFY `external_fund_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `publication_reward_rates`
--
ALTER TABLE `publication_reward_rates`
  MODIFY `rate_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

--
-- AUTO_INCREMENT for table `research_fund_admin_events`
--
ALTER TABLE `research_fund_admin_events`
  MODIFY `event_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `research_fund_event_files`
--
ALTER TABLE `research_fund_event_files`
  MODIFY `event_file_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `reward_config`
--
ALTER TABLE `reward_config`
  MODIFY `config_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `role_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `scholar_import_runs`
--
ALTER TABLE `scholar_import_runs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT for table `subcategory_budgets`
--
ALTER TABLE `subcategory_budgets`
  MODIFY `subcategory_budget_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=102;

--
-- AUTO_INCREMENT for table `submissions`
--
ALTER TABLE `submissions`
  MODIFY `submission_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10065;

--
-- AUTO_INCREMENT for table `submission_documents`
--
ALTER TABLE `submission_documents`
  MODIFY `document_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=306;

--
-- AUTO_INCREMENT for table `submission_users`
--
ALTER TABLE `submission_users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=197;

--
-- AUTO_INCREMENT for table `system_config`
--
ALTER TABLE `system_config`
  MODIFY `config_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1040;

--
-- AUTO_INCREMENT for table `user_fund_eligibilities`
--
ALTER TABLE `user_fund_eligibilities`
  MODIFY `user_fund_eligibility_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `user_sessions`
--
ALTER TABLE `user_sessions`
  MODIFY `session_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=485;

--
-- AUTO_INCREMENT for table `user_tokens`
--
ALTER TABLE `user_tokens`
  MODIFY `token_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=485;

--
-- AUTO_INCREMENT for table `years`
--
ALTER TABLE `years`
  MODIFY `year_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `announcements`
--
ALTER TABLE `announcements`
  ADD CONSTRAINT `fk_announcements_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `fk_announcements_year` FOREIGN KEY (`year_id`) REFERENCES `years` (`year_id`);

--
-- Constraints for table `announcement_assignments`
--
ALTER TABLE `announcement_assignments`
  ADD CONSTRAINT `fk_aa_announcement` FOREIGN KEY (`announcement_id`) REFERENCES `announcements` (`announcement_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_aa_changed_by` FOREIGN KEY (`changed_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `fk_audit_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `dept_head_assignments`
--
ALTER TABLE `dept_head_assignments`
  ADD CONSTRAINT `fk_dha_changed_by` FOREIGN KEY (`changed_by`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `fk_dha_head_user` FOREIGN KEY (`head_user_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `fk_dha_restore_role_id` FOREIGN KEY (`restore_role_id`) REFERENCES `roles` (`role_id`);

--
-- Constraints for table `file_uploads`
--
ALTER TABLE `file_uploads`
  ADD CONSTRAINT `fk_file_uploads_user` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `fund_application_details`
--
ALTER TABLE `fund_application_details`
  ADD CONSTRAINT `fk_fund_approved_by_user` FOREIGN KEY (`approved_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_fund_detail_subcategory` FOREIGN KEY (`subcategory_id`) REFERENCES `fund_subcategories` (`subcategory_id`),
  ADD CONSTRAINT `fk_fund_detail_submission` FOREIGN KEY (`submission_id`) REFERENCES `submissions` (`submission_id`),
  ADD CONSTRAINT `fk_fund_rejected_by_user` FOREIGN KEY (`rejected_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

--
-- Constraints for table `fund_categories`
--
ALTER TABLE `fund_categories`
  ADD CONSTRAINT `fund_categories_ibfk_1` FOREIGN KEY (`year_id`) REFERENCES `years` (`year_id`);

--
-- Constraints for table `fund_forms`
--
ALTER TABLE `fund_forms`
  ADD CONSTRAINT `fk_fund_forms_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `fk_fund_forms_year` FOREIGN KEY (`year_id`) REFERENCES `years` (`year_id`);

--
-- Constraints for table `fund_installment_periods`
--
ALTER TABLE `fund_installment_periods`
  ADD CONSTRAINT `fk_fip_year` FOREIGN KEY (`year_id`) REFERENCES `years` (`year_id`);

--
-- Constraints for table `fund_subcategories`
--
ALTER TABLE `fund_subcategories`
  ADD CONSTRAINT `fund_subcategorie_ibfk_2` FOREIGN KEY (`year_id`) REFERENCES `years` (`year_id`),
  ADD CONSTRAINT `fund_subcategories_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `fund_categories` (`category_id`);

--
-- Constraints for table `innovations`
--
ALTER TABLE `innovations`
  ADD CONSTRAINT `innovations_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `fk_notif_submission` FOREIGN KEY (`related_submission_id`) REFERENCES `submissions` (`submission_id`),
  ADD CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `publications`
--
ALTER TABLE `publications`
  ADD CONSTRAINT `publications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `publication_reward_details`
--
ALTER TABLE `publication_reward_details`
  ADD CONSTRAINT `fk_approved_by_user` FOREIGN KEY (`approved_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_prd_main_announcement` FOREIGN KEY (`main_annoucement`) REFERENCES `announcements` (`announcement_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_prd_reward_announcement` FOREIGN KEY (`reward_announcement`) REFERENCES `announcements` (`announcement_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_pub_detail_submission` FOREIGN KEY (`submission_id`) REFERENCES `submissions` (`submission_id`),
  ADD CONSTRAINT `fk_rejected_by_user` FOREIGN KEY (`rejected_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_revision_requested_by_user` FOREIGN KEY (`revision_requested_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

--
-- Constraints for table `research_fund_admin_events`
--
ALTER TABLE `research_fund_admin_events`
  ADD CONSTRAINT `fk_rfae_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `fk_rfae_status_after` FOREIGN KEY (`status_after_id`) REFERENCES `application_status` (`application_status_id`),
  ADD CONSTRAINT `fk_rfae_submission` FOREIGN KEY (`submission_id`) REFERENCES `submissions` (`submission_id`) ON DELETE CASCADE;

--
-- Constraints for table `research_fund_event_files`
--
ALTER TABLE `research_fund_event_files`
  ADD CONSTRAINT `fk_rfef_event` FOREIGN KEY (`event_id`) REFERENCES `research_fund_admin_events` (`event_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_rfef_file` FOREIGN KEY (`file_id`) REFERENCES `file_uploads` (`file_id`) ON DELETE CASCADE;

--
-- Constraints for table `subcategory_budgets`
--
ALTER TABLE `subcategory_budgets`
  ADD CONSTRAINT `subcategories_budgets_ibfk_1` FOREIGN KEY (`subcategory_id`) REFERENCES `fund_subcategories` (`subcategory_id`);

--
-- Constraints for table `submissions`
--
ALTER TABLE `submissions`
  ADD CONSTRAINT `fk_subm_admin_approved_by` FOREIGN KEY (`admin_approved_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_subm_admin_approved_by_v2` FOREIGN KEY (`admin_approved_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_subm_admin_rejected_by_v2` FOREIGN KEY (`admin_rejected_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_subm_head_rejected_by_v2` FOREIGN KEY (`head_rejected_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_subm_rejected_by` FOREIGN KEY (`rejected_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_submission_approver` FOREIGN KEY (`approved_by`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `fk_submission_category` FOREIGN KEY (`category_id`) REFERENCES `fund_categories` (`category_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_submission_status` FOREIGN KEY (`status_id`) REFERENCES `application_status` (`application_status_id`),
  ADD CONSTRAINT `fk_submission_subcategory` FOREIGN KEY (`subcategory_id`) REFERENCES `fund_subcategories` (`subcategory_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_submission_subcategory_budget` FOREIGN KEY (`subcategory_budget_id`) REFERENCES `subcategory_budgets` (`subcategory_budget_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_submission_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `fk_submission_year` FOREIGN KEY (`year_id`) REFERENCES `years` (`year_id`),
  ADD CONSTRAINT `submissions_ibfk_1` FOREIGN KEY (`head_approved_by`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `submissions_ibfk_2` FOREIGN KEY (`approved_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `submission_documents`
--
ALTER TABLE `submission_documents`
  ADD CONSTRAINT `fk_doc_file` FOREIGN KEY (`file_id`) REFERENCES `file_uploads` (`file_id`),
  ADD CONSTRAINT `fk_doc_submission` FOREIGN KEY (`submission_id`) REFERENCES `submissions` (`submission_id`),
  ADD CONSTRAINT `fk_doc_type` FOREIGN KEY (`document_type_id`) REFERENCES `document_types` (`document_type_id`),
  ADD CONSTRAINT `fk_doc_verifier` FOREIGN KEY (`verified_by`) REFERENCES `users` (`user_id`);

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
  ADD CONSTRAINT `system_config_ibfk_1` FOREIGN KEY (`updated_by`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `system_config_ibfk_2` FOREIGN KEY (`main_annoucement`) REFERENCES `announcements` (`announcement_id`),
  ADD CONSTRAINT `system_config_ibfk_3` FOREIGN KEY (`reward_announcement`) REFERENCES `announcements` (`announcement_id`),
  ADD CONSTRAINT `system_config_ibfk_4` FOREIGN KEY (`activity_support_announcement`) REFERENCES `announcements` (`announcement_id`),
  ADD CONSTRAINT `system_config_ibfk_5` FOREIGN KEY (`conference_announcement`) REFERENCES `announcements` (`announcement_id`),
  ADD CONSTRAINT `system_config_ibfk_6` FOREIGN KEY (`service_announcement`) REFERENCES `announcements` (`announcement_id`);

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
-- Constraints for table `user_scholar_metrics`
--
ALTER TABLE `user_scholar_metrics`
  ADD CONSTRAINT `fk_user_scholar_metrics_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

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
