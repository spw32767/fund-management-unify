-- phpMyAdmin SQL Dump
-- version 4.9.5deb2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Oct 02, 2025 at 12:02 PM
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
CREATE DEFINER=`root`@`localhost` PROCEDURE `CreateNotification` (IN `p_user_id` INT, IN `p_title` VARCHAR(255), IN `p_message` TEXT, IN `p_type` VARCHAR(50), IN `p_submission_id` INT)  BEGIN
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci COMMENT='ตารางเก็บประกาศจากกองทุนวิจัยและนวัตกรรม';

--
-- Dumping data for table `announcements`
--

INSERT INTO `announcements` (`announcement_id`, `title`, `description`, `file_name`, `file_path`, `file_size`, `mime_type`, `announcement_type`, `announcement_reference_number`, `priority`, `display_order`, `status`, `published_at`, `expired_at`, `year_id`, `created_by`, `create_at`, `update_at`, `delete_at`) VALUES
(1, 'ประกาศเปิดรับสมัครทุนส่งเสริมการวิจัย ประจำปี 2568', 'กองทุนส่งเสริมการวิจัยและนวัตกรรม เปิดรับสมัครทุนส่งเสริมการวิจัย ประจำปี 2568 กองทุนส่งเสริมการวิจัยและนวัตกรรม เปิดรับสมัครทุนส่งเสริมการวิจัย ประจำปี 2568 กองทุนส่งเสริมการวิจัยและนวัตกรรม เปิดรับสมัครทุนส่งเสริมการวิจัย ประจำปี 2568', 'ประกาศทุนวิจัย2568.pdf', 'http://147.50.230.213:8080/uploads/test.png', 1024000, 'application/pdf', 'research_fund', NULL, 'high', 3, 'active', '2025-01-15 09:00:00', '2025-09-20 13:35:00', 3, 1, '2025-08-20 11:40:31', '2025-09-21 11:54:44', NULL),
(2, 'แนวทางการเขียนข้อเสนอโครงการวิจัย', 'เอกสารแนวทางและข้อแนะนำสำหรับการเขียนข้อเสนอโครงการวิจัย', 'แนวทางการเขียนข้อเสนอโครงการ.pdf', 'uploads/announcements/2025/09/test_20250919_151900.pdf', 2048000, 'application/pdf', 'general', NULL, 'normal', 5, 'active', '2025-01-10 10:00:00', NULL, 2, 1, '2025-08-20 11:40:31', '2025-09-21 11:54:44', NULL),
(3, 'ประกาศเปิดรับสมัครทุนอุดหนุนกิจกรรม ไตรมาส 1/2568', 'เปิดรับสมัครทุนอุดหนุนกิจกรรมประจำไตรมาส 1 ประจำปี 2568', 'ประกาศทุนกิจกรรมไตรมาส1-2568.pdf', 'http://147.50.230.213:8080/uploads/test.png', 800000, 'application/pdf', 'promotion_fund', NULL, 'normal', 1, 'active', '2025-01-05 14:00:00', '2025-09-26 13:23:00', 2, 1, '2025-08-20 11:40:31', '2025-09-21 11:54:44', NULL),
(4, 'หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย นวัตกรรม และบริการวิชาการ วิทยาลัยการคอมพิวเตอร์ (2568)', 'ประกาศหลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย นวัตกรรม และบริการวิชาการ วิทยาลัยการคอมพิวเตอร์ให้เป็นไปตามประกาศมหาวิทยาลัยขอนแก่น (ฉบับที่ 2200/2564) ลงวันที่ 27 ตุลาคม พ.ศ. 2564 เรื่อง กองทุนวิจัย นวัตกรรม และบริการวิชาการ วิทยาลัยการคอมพิวเตอร์และเพื่อส่งเสริม สนับสนุนศักยภาพด้านการวิจัย นวัตกรรม และบริการวิชาการ อันเป็นการพัฒนาขีดความสามารถในการแข่งขัน และยกระดับความเป็นเลิศด้านวิชาการ\r\n', '1. 1574-68 หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย นวัตกรรม และบริการวิชาการ (2568).pdf', 'http://147.50.230.213:8080/uploads/announcements/1.%201574-68%20หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย%20นวัตกรรม%20และบริการวิชาการ%20(2568).pdf', 444470, 'application/pdf', 'general', '1574/2568', 'urgent', 4, 'active', NULL, NULL, 3, 7, '2025-09-17 12:26:09', '2025-09-21 11:54:44', NULL),
(6, 'aswd', 'asd', 'sample.pdf', 'uploads/announcements/2025/09/aswd_20250919_151819.pdf', 18810, 'application/pdf', 'general', NULL, 'normal', NULL, 'active', '2025-09-16 15:18:00', '2025-09-26 15:18:00', 3, 7, '2025-09-19 15:18:19', '2025-09-19 15:18:19', '2025-09-19 15:18:29'),
(7, 'test', 'asd', 'sample-local-pdf.pdf', 'uploads/announcements/2025/09/test_20250919_151900.pdf', 49672, 'application/pdf', 'general', NULL, 'normal', 6, 'active', '2025-09-17 15:18:00', '2025-09-25 15:18:00', 2, 7, '2025-09-19 15:19:00', '2025-09-21 11:54:44', NULL),
(8, 'das', 'asd', 'sample.pdf', 'uploads/announcements/sample.pdf', 18810, 'application/pdf', 'general', NULL, 'normal', 2, 'active', NULL, NULL, NULL, 7, '2025-09-19 15:34:30', '2025-09-21 11:54:44', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `application_status`
--

CREATE TABLE `application_status` (
  `application_status_id` int(11) NOT NULL,
  `status_code` varchar(255) DEFAULT NULL,
  `status_name` varchar(255) DEFAULT NULL,
  `create_at` datetime DEFAULT current_timestamp(),
  `update_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `delete_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

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
(334, 8, 'submit', 'submission', 126, 'PR-25681002-0010', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-02 00:33:52');

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `dept_head_assignments`
--

INSERT INTO `dept_head_assignments` (`assignment_id`, `head_user_id`, `restore_role_id`, `effective_from`, `effective_to`, `changed_by`, `changed_at`, `note`) VALUES
(1, 13, 1, '2025-09-26 21:27:00', '2025-09-27 05:19:00', NULL, '2025-09-26 21:27:22', NULL),
(2, 12, 1, '2025-09-27 05:19:00', '2025-09-27 05:55:00', NULL, '2025-09-27 05:25:59', NULL),
(3, 13, 1, '2025-09-27 05:55:00', NULL, NULL, '2025-09-27 05:55:31', NULL);

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
  `update_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `delete_at` datetime DEFAULT NULL,
  `fund_types` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'ประเภททุนที่ใช้ได้ ["publication_reward", "fund_application"]' CHECK (json_valid(`fund_types`)),
  `subcategory_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'รหัส subcategory เฉพาะ [1,2,3] หรือ NULL = ทุก subcategory' CHECK (json_valid(`subcategory_ids`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `document_types`
--

INSERT INTO `document_types` (`document_type_id`, `document_type_name`, `code`, `category`, `required`, `multiple`, `document_order`, `is_required`, `create_at`, `update_at`, `delete_at`, `fund_types`, `subcategory_ids`) VALUES
(1, 'QS WUR 1-400', 'qs_wur_1-400', '', 0, 0, 1, NULL, NULL, '2025-08-29 15:50:11', NULL, NULL, NULL),
(2, 'Full Reprint (บทความตีพิมพ์)', 'full_reprint_(บทความตีพิมพ์)', 'publication', 1, 0, 2, NULL, NULL, '2025-09-13 14:45:11', NULL, NULL, NULL),
(3, 'Scopus-ISI (หลักฐานการจัดอันดับ)', 'scopus-isi_(หลักฐานการจัดอันดับ)', 'publication', 1, 0, 3, NULL, NULL, '2025-08-29 13:31:36', NULL, NULL, NULL),
(4, 'สำเนาบัญชีธนาคาร', 'สำเนาบัญชีธนาคาร', '', 1, 0, 4, NULL, NULL, NULL, NULL, NULL, NULL),
(5, 'Payment / Exchange rate', 'payment_/_exchange_rate', 'publication', 0, 0, 5, NULL, NULL, NULL, NULL, NULL, NULL),
(6, 'Page Charge Invoice', 'page_charge_invoice', '', 0, 0, 6, NULL, NULL, '2025-09-13 14:45:15', NULL, NULL, NULL),
(7, 'Page Charge Receipt', 'page_charge_receipt', 'publication', 0, 0, 7, NULL, NULL, '2025-09-13 14:45:18', NULL, NULL, NULL),
(8, 'Manuscript Editor Invoice', 'manuscript_editor_invoice', 'publication', 0, 0, 8, NULL, NULL, NULL, NULL, NULL, NULL),
(9, 'Manuscript Receipt', 'manuscript_receipt', '', 0, 0, 9, NULL, NULL, NULL, NULL, NULL, NULL),
(10, 'Review Response (Special issue)', 'review_response_(special_issue)', '', 0, 0, 10, NULL, NULL, NULL, NULL, NULL, NULL),
(11, 'เอกสารอื่นๆ', 'เอกสารอื่นๆ', 'publication', 0, 1, 11, NULL, NULL, NULL, NULL, NULL, NULL),
(12, 'เอกสารเบิกจ่ายภายนอก', 'เอกสารเบิกจ่ายภายนอก', 'publication', 0, 1, 12, 'no', NULL, NULL, NULL, NULL, NULL),
(13, 'โครงการวิจัย', 'research_proposal', 'general', 1, 0, 0, NULL, '2025-08-29 13:31:42', '2025-08-29 13:31:42', NULL, '[\"fund_application\"]', '[1,2,3]'),
(14, 'งบประมาณ', 'budget_plan', 'general', 1, 0, 0, NULL, '2025-08-29 13:31:42', '2025-08-29 13:31:42', NULL, '[\"fund_application\"]', '[4,5,6]'),
(15, 'CV ผู้วิจัย', 'researcher_cv', 'general', 0, 0, 0, NULL, '2025-08-29 13:31:42', '2025-08-29 13:31:42', NULL, '[\"fund_application\"]', NULL),
(16, 'แบบฟอร์มคำขอรับเงินรางวัล (DOCX)', 'publication_reward_form_docx', 'publication_reward', 0, 0, 0, NULL, '2025-09-30 13:41:38', '2025-09-30 13:41:38', NULL, '[\"publication_reward\"]', NULL);

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
(232, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub116_2025-09-25/sample-local-pdf_PR-25680925-0001.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-25 17:03:36', '2025-09-25 17:03:36', '2025-09-25 17:03:36', NULL),
(233, 'form.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub116_2025-09-25/form_PR-25680925-0001.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-09-25 17:03:36', '2025-09-25 17:03:36', '2025-09-25 17:03:36', NULL),
(234, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub117_2025-09-25/sample-local-pdf_PR-25680925-0002.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-25 17:27:15', '2025-09-25 17:27:15', '2025-09-25 17:27:15', NULL),
(235, 'form.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub117_2025-09-25/form_PR-25680925-0002.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-09-25 17:27:15', '2025-09-25 17:27:15', '2025-09-25 17:27:15', NULL),
(236, '1. 1574-68 หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย นวัตกรรม และบริการวิชาการ (2568).pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub118_2025-09-25/1._1574-68_หลกเกณฑการใชจายเงนกองทนวจย_นว.pdf', 'temp', NULL, 455138, 'application/pdf', '', 0, 8, '2025-09-25 17:29:17', '2025-09-25 17:29:17', '2025-09-25 17:29:17', NULL),
(237, 'form.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub118_2025-09-25/form_PR-25680925-0003.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-09-25 17:29:17', '2025-09-25 17:29:17', '2025-09-25 17:29:17', NULL),
(238, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub119_2025-09-25/sample-local-pdf_PR-25680925-0004.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-25 17:31:05', '2025-09-25 17:31:05', '2025-09-25 17:31:05', NULL),
(239, 'form.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub119_2025-09-25/form_PR-25680925-0004.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-09-25 17:31:06', '2025-09-25 17:31:06', '2025-09-25 17:31:06', NULL),
(240, 'form.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub120_2025-09-25/form_PR-25680925-0005.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-09-25 17:35:31', '2025-09-25 17:35:31', '2025-09-25 17:35:31', NULL),
(241, '1. 1574-68 หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย นวัตกรรม และบริการวิชาการ (2568).pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub120_2025-09-25/1._1574-68_หลกเกณฑการใชจายเงนกองทนวจย_นว.pdf', 'temp', NULL, 455138, 'application/pdf', '', 0, 8, '2025-09-25 17:35:31', '2025-09-25 17:35:31', '2025-09-25 17:35:31', NULL),
(242, 'sample-local-pdf.pdf', 'uploads/users/user_12_สมชาย_ใจด/submissions/fund121_2025-09-26/sample-local-pdf_FA-25680926-0001.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 12, '2025-09-26 08:42:51', '2025-09-26 08:42:51', '2025-09-26 08:42:51', NULL),
(243, 'sample.pdf', 'uploads/users/user_12_สมชาย_ใจด/submissions/fund121_2025-09-26/sample_FA-25680926-0001.pdf', 'temp', NULL, 18810, 'application/pdf', '', 0, 12, '2025-09-26 08:42:51', '2025-09-26 08:42:51', '2025-09-26 08:42:51', NULL),
(244, 'file-sample_150kB.pdf', 'uploads/users/user_12_สมชาย_ใจด/submissions/fund121_2025-09-26/file-sample_150kB_FA-25680926-0001.pdf', 'temp', NULL, 142786, 'application/pdf', '', 0, 12, '2025-09-26 08:42:51', '2025-09-26 08:42:51', '2025-09-26 08:42:51', NULL),
(245, 'c4611_sample_explain.pdf', 'uploads/users/user_12_สมชาย_ใจด/submissions/fund121_2025-09-26/c4611_sample_explain_FA-25680926-0001.pdf', 'temp', NULL, 88226, 'application/pdf', '', 0, 12, '2025-09-26 08:42:51', '2025-09-26 08:42:51', '2025-09-26 08:42:51', NULL),
(246, 'form.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub122_2025-09-26/form_PR-25680926-0006.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-09-26 23:33:11', '2025-09-26 23:33:11', '2025-09-26 23:33:11', NULL),
(247, 'form.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub123_2025-09-30/form_PR-25680930-0007.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-09-30 13:41:38', '2025-09-30 13:41:38', '2025-09-30 13:41:38', NULL),
(248, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub123_2025-09-30/sample-local-pdf_PR-25680930-0007.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-30 13:41:38', '2025-09-30 13:41:38', '2025-09-30 13:41:38', NULL),
(249, 'PR-25680930-0007_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub123_2025-09-30/PR-25680930-0007_publication_reward_form.docx', 'temp', NULL, 25552, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-09-30 13:41:38', '2025-09-30 13:41:38', '2025-09-30 13:41:38', NULL),
(250, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub124_2025-10-01/sample-local-pdf_PR-25681001-0008.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-10-01 13:16:58', '2025-10-01 13:16:58', '2025-10-01 13:16:58', NULL),
(251, 'form.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub124_2025-10-01/form_PR-25681001-0008.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-01 13:16:58', '2025-10-01 13:16:58', '2025-10-01 13:16:58', NULL),
(252, 'PR-25681001-0008_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub124_2025-10-01/PR-25681001-0008_publication_reward_form.docx', 'temp', NULL, 25556, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-01 13:16:58', '2025-10-01 13:16:58', '2025-10-01 13:16:58', NULL),
(253, 'form.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub125_2025-10-01/form_PR-25681001-0009.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-01 20:52:43', '2025-10-01 20:52:43', '2025-10-01 20:52:43', NULL),
(254, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub125_2025-10-01/sample-local-pdf_PR-25681001-0009.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-10-01 20:52:43', '2025-10-01 20:52:43', '2025-10-01 20:52:43', NULL),
(255, 'PR-25681001-0009_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub125_2025-10-01/PR-25681001-0009_publication_reward_form.docx', 'temp', NULL, 25620, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-01 20:52:43', '2025-10-01 20:52:43', '2025-10-01 20:52:43', NULL),
(256, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub126_2025-10-02/sample-local-pdf_PR-25681002-0010.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-10-02 00:33:52', '2025-10-02 00:33:52', '2025-10-02 00:33:52', NULL),
(257, 'form.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub126_2025-10-02/form_PR-25681002-0010.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-02 00:33:52', '2025-10-02 00:33:52', '2025-10-02 00:33:52', NULL),
(258, 'PR-25681002-0010_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub126_2025-10-02/PR-25681002-0010_publication_reward_form.docx', 'temp', NULL, 25808, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-02 00:33:52', '2025-10-02 00:33:52', '2025-10-02 00:33:52', NULL);

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
  `approved_by` int(11) DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `rejected_by` int(11) DEFAULT NULL,
  `rejected_at` datetime DEFAULT NULL,
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
(16, 121, 1, 'Project Title', '123-312-3123', '5000.00', '0.00', NULL, NULL, NULL, NULL, NULL, '', '', 1, 2, NULL);

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
(1, 'ทุนส่งเสริมการวิจัย', 'active', 3, NULL, '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL),
(2, 'ทุนอุดหนุนกิจกรรม', 'active', 3, NULL, '2025-06-24 16:49:13', '2025-08-10 23:25:26', NULL),
(5, 'ทดสอบ', 'active', 1, NULL, '2025-08-11 13:39:17', '2025-08-11 13:39:17', '2025-08-11 13:39:30');

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci COMMENT='ตารางเก็บแบบฟอร์มและเอกสารที่เกี่ยวข้องกับการขอทุน';

--
-- Dumping data for table `fund_forms`
--

INSERT INTO `fund_forms` (`form_id`, `title`, `description`, `file_name`, `file_path`, `file_size`, `mime_type`, `form_type`, `fund_category`, `is_required`, `display_order`, `status`, `year_id`, `created_by`, `create_at`, `update_at`, `delete_at`) VALUES
(1, 'แบบฟอร์มสมัครทุนส่งเสริมการวิจัย', 'แบบฟอร์มสำหรับสมัครขอรับทุนส่งเสริมการวิจัย แบบฟอร์มสำหรับสมัครขอรับทุนส่งเสริมการวิจัย แบบฟอร์มสำหรับสมัครขอรับทุนส่งเสริมการวิจัย แบบฟอร์มสำหรับสมัครขอรับทุนส่งเสริมการวิจัย แบบฟอร์มสำหรับสมัครขอรับทุนส่งเสริมการวิจัย แบบฟอร์มสำหรับสมัครขอรับทุนส่งเสริมการวิจัย แบบฟอร์มสำหรับสมัครขอรับทุนส่งเสริมการวิจัย', 'แบบฟอร์มสมัครทุนวิจัย.docx', 'uploads/fund_forms/research/แบบฟอร์มสมัครทุนวิจัย.docx', 512000, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application', 'research_fund', 1, 2, 'active', 3, 1, '2025-08-20 11:40:31', '2025-09-19 13:34:20', NULL),
(2, 'แบบฟอร์มรายงานความก้าวหน้าโครงการวิจัย', 'แบบฟอร์มสำหรับรายงานความก้าวหน้าของโครงการวิจัย', 'แบบฟอร์มรายงานความก้าวหน้า.docx', 'uploads/fund_forms/research/แบบฟอร์มรายงานความก้าวหน้า.docx', 480000, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'report', 'research_fund', 1, 1, 'active', 3, 1, '2025-08-20 11:40:31', '2025-09-19 11:36:42', NULL),
(3, 'แบบฟอร์มสมัครทุนอุดหนุนกิจกรรม', 'แบบฟอร์มสำหรับสมัครขอรับทุนอุดหนุนกิจกรรม', 'แบบฟอร์มสมัครทุนกิจกรรม.docx', 'uploads/fund_forms/promotion/แบบฟอร์มสมัครทุนกิจกรรม.docx', 600000, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application', 'promotion_fund', 1, 3, 'active', 3, 1, '2025-08-20 11:40:31', '2025-09-19 11:36:42', NULL),
(4, 'แบบประเมินผลกิจกรรม', 'แบบฟอร์มสำหรับประเมินผลการดำเนินกิจกรรม', 'แบบประเมินผลกิจกรรม.xlsx', 'uploads/fund_forms/promotion/แบบประเมินผลกิจกรรม.xlsx', 256000, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'evaluation', 'promotion_fund', 0, 4, 'active', 3, 1, '2025-08-20 11:40:31', '2025-09-19 11:36:42', NULL),
(5, 'แนวทางการเขียนข้อเสนอโครงการ', 'เอกสารแนวทางและข้อแนะนำสำหรับการเขียนข้อเสนอโครงการ', 'แนวทางการเขียนข้อเสนอโครงการ.pdf', 'uploads/fund_forms/guidelines/แนวทางการเขียนข้อเสนอโครงการ.pdf', 1024000, 'application/pdf', 'guidelines', 'both', 0, 5, 'active', 3, 1, '2025-08-20 11:40:31', '2025-09-19 11:36:42', NULL);

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
  `year_id` int(255) DEFAULT NULL,
  `status` enum('active','disable') DEFAULT NULL,
  `comment` text DEFAULT NULL,
  `create_at` datetime DEFAULT NULL,
  `update_at` datetime DEFAULT NULL,
  `delete_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `fund_subcategories`
--

INSERT INTO `fund_subcategories` (`subcategory_id`, `category_id`, `subcategory_name`, `fund_condition`, `target_roles`, `form_type`, `form_url`, `year_id`, `status`, `comment`, `create_at`, `update_at`, `delete_at`) VALUES
(1, 1, '1.1 ทุนสนับสนุนผู้เชี่ยวชาญต่างประเทศ', 'ผู้ได้รับทุนสนับสนุนผู้เชี่ยวชาญต่างประเทศ ต้องเผยแพร่บทความในฐานข้อมูลระดับ WOS หรือ ISI หรือ SCOPUS ในควอร์ไทล์ที่ 1 (Q1)', '', 'download', 'http://147.50.230.213:8080/uploads/form.pdf', 3, 'active', NULL, '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL),
(2, 1, '1.2 ทุนวิจัยสถาบัน', 'ผู้ได้รับทุนสนับสนุนวิจัยสถาบัน ทุนวิจัยเพื่องานประจำ หรือทุนวิจัยในชั้นเรียนจะต้องมีชิ้นงาน', '', 'download', NULL, 3, 'active', NULL, '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL),
(3, 1, '1.3 ทุนวิจัยเพื่อพัฒนางานประจํา', NULL, '', 'download', NULL, 3, 'active', NULL, '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL),
(4, 1, '1.4 ทุนวิจัยในชั้นเรียน', NULL, '', 'download', NULL, 3, 'active', NULL, '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL),
(5, 1, 'ทุนสนับสนุนงานวิจัย นวัตกรรมและสิ่งประดิษฐ์เพื่อการเรียนการสอน', NULL, '', 'download', NULL, 3, 'active', NULL, '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL),
(6, 1, '1.5 ทุนวิจัยความเป็นเลิศ', 'ผู้ได้รับทุนวิจัยความเป็นเลิศ ต้องเผยแพร่บทความในฐานข้อมูลระดับ WOS หรือ ISI หรือ SCOPUS', '', 'download', NULL, 3, 'active', NULL, '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL),
(7, 1, '1.10 ทุนพัฒนากลุ่มวิจัยบูรณาการ', 'ทุนพัฒนากลุ่มวิจัยบูรณาการ แบ่งออกเป็น 3 ระดับ', '', 'download', NULL, 3, 'active', NULL, '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL),
(8, 1, 'ทุนนักวิจัยอาวุโส', NULL, '', 'download', NULL, 3, 'active', NULL, '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL),
(9, 1, '1.7 ทุนพัฒนาศูนย์วิจัย', NULL, '', 'download', NULL, 3, 'active', NULL, '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL),
(10, 1, 'ทุนฝึกอบรมนักวิจัยหลังปริญญาเอก', 'ทุนฝึกอบรมนักวิจัยหลังปริญญาเอก เป็นการสนับสนุนนักวิจัยผ่านการรับทุนของอาจารย์', '', 'download', NULL, 3, 'active', NULL, '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL),
(11, 1, '1.6 ทุนนวัตกรรมความเป็นเลิศ', 'ผู้ได้รับทุนนวัตกรรมความเป็นเลิศ จะต้องสร้างนวัตกรรมหรือเครื่องมือ เครื่องใช้', '', 'download', NULL, 3, 'active', NULL, '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL),
(12, 1, '1.9 ทุนสนับสนุนการได้รับทุนวิจัยภายนอก', NULL, '', 'download', NULL, 3, 'active', NULL, '2025-06-24 16:49:13', '2025-08-08 22:57:24', NULL),
(13, 2, 'ทุนทําวิจัยในต่างประเทศ', NULL, NULL, 'download', NULL, 3, 'active', NULL, '2025-06-24 16:49:13', '2025-08-11 11:50:06', NULL),
(14, 2, 'เงินรางวัลการตีพิมพ์เผยแพร่ผลงานวิจัยที่ได้รับการตีพิมพ์ในสาขาวิทยาศาสตร์และเทคโนโลยี (กรณีเป็นผู้แต่งชื่อแรก)', NULL, NULL, 'publication_reward', NULL, 3, 'active', NULL, '2025-06-24 16:49:13', '2025-08-08 22:57:15', NULL),
(15, 2, 'เงินรางวัลการตีพิมพ์เผยแพร่ผลงานวิจัยที่ได้รับการตีพิมพ์ในสาขาวิทยาศาสตร์และเทคโนโลยี (กรณีเป็นผู้ประพันธ์บรรณกิจ)', NULL, '[\"1\",\"2\"]', 'publication_reward', NULL, 3, 'active', NULL, NULL, '2025-08-11 11:49:58', NULL);

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`notification_id`, `user_id`, `title`, `message`, `type`, `is_read`, `related_submission_id`, `create_at`, `update_at`, `delete_at`) VALUES
(95, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-25680925-0001 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 116, '2025-09-25 17:03:36', '2025-09-25 17:03:36', NULL),
(96, 7, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25680925-0001 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 116, '2025-09-25 17:03:36', '2025-09-25 17:03:36', NULL),
(97, 11, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25680925-0001 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 116, '2025-09-25 17:03:36', '2025-09-25 17:03:36', NULL),
(98, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-25680925-0002 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 117, '2025-09-25 17:27:15', '2025-09-25 17:27:15', NULL),
(99, 7, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25680925-0002 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 117, '2025-09-25 17:27:15', '2025-09-25 17:27:15', NULL),
(100, 11, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25680925-0002 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 117, '2025-09-25 17:27:15', '2025-09-25 17:27:15', NULL),
(101, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-25680925-0003 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 118, '2025-09-25 17:29:17', '2025-09-25 17:29:17', NULL),
(102, 7, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25680925-0003 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 118, '2025-09-25 17:29:17', '2025-09-25 17:29:17', NULL),
(103, 11, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25680925-0003 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 118, '2025-09-25 17:29:17', '2025-09-25 17:29:17', NULL),
(104, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-25680925-0004 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 119, '2025-09-25 17:31:06', '2025-09-25 17:31:06', NULL),
(105, 7, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25680925-0004 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 119, '2025-09-25 17:31:06', '2025-09-25 17:31:06', NULL),
(106, 11, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25680925-0004 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 119, '2025-09-25 17:31:06', '2025-09-25 17:31:06', NULL),
(107, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-25680925-0005 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 120, '2025-09-25 17:35:32', '2025-09-25 17:35:32', NULL),
(108, 7, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25680925-0005 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 120, '2025-09-25 17:35:32', '2025-09-25 17:35:32', NULL),
(109, 11, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25680925-0005 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 120, '2025-09-25 17:35:32', '2025-09-25 17:35:32', NULL),
(110, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-25680926-0006 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 122, '2025-09-26 23:33:11', '2025-09-26 23:33:11', NULL),
(111, 7, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25680926-0006 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 122, '2025-09-26 23:33:11', '2025-09-26 23:33:11', NULL),
(112, 11, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25680926-0006 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 122, '2025-09-26 23:33:11', '2025-09-26 23:33:11', NULL),
(113, 8, 'คำร้องได้รับการอนุมัติแล้ว', 'คำร้องหมายเลข PR-25680925-0002 ของคุณได้รับการอนุมัติแล้ว', 'success', 0, 117, '2025-09-29 12:06:57', '2025-09-29 12:06:57', NULL),
(114, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-25680930-0007 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 123, '2025-09-30 13:41:38', '2025-09-30 13:41:38', NULL),
(115, 7, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25680930-0007 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 123, '2025-09-30 13:41:38', '2025-09-30 13:41:38', NULL),
(116, 11, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25680930-0007 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 123, '2025-09-30 13:41:38', '2025-09-30 13:41:38', NULL),
(117, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-25681001-0008 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 124, '2025-10-01 13:16:59', '2025-10-01 13:16:59', NULL),
(118, 7, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25681001-0008 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 124, '2025-10-01 13:16:59', '2025-10-01 13:16:59', NULL),
(119, 11, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25681001-0008 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 124, '2025-10-01 13:16:59', '2025-10-01 13:16:59', NULL),
(120, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-25681001-0009 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 125, '2025-10-01 20:52:44', '2025-10-01 20:52:44', NULL),
(121, 7, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25681001-0009 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 125, '2025-10-01 20:52:44', '2025-10-01 20:52:44', NULL),
(122, 11, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25681001-0009 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 125, '2025-10-01 20:52:44', '2025-10-01 20:52:44', NULL),
(123, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-25681002-0010 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 126, '2025-10-02 00:33:52', '2025-10-02 00:33:52', NULL),
(124, 7, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25681002-0010 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 126, '2025-10-02 00:33:52', '2025-10-02 00:33:52', NULL),
(125, 11, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25681002-0010 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 126, '2025-10-02 00:33:52', '2025-10-02 00:33:52', NULL);

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
  `external_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`external_ids`)),
  `fingerprint` varchar(64) DEFAULT NULL,
  `is_verified` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  `citation_history` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'citations per year, e.g. {"2018":8,"2019":22}'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `publications`
--

INSERT INTO `publications` (`id`, `user_id`, `title`, `authors`, `journal`, `publication_type`, `publication_date`, `publication_year`, `doi`, `url`, `cited_by`, `cited_by_url`, `source`, `external_ids`, `fingerprint`, `is_verified`, `created_at`, `updated_at`, `deleted_at`, `citation_history`) VALUES
(146, 8, 'Transformation of the BPMN design model into a colored Petri net using the partitioning approach', 'Chanon Dechsupa, Wiwat Vatanawood, Arthit Thongtak', NULL, NULL, NULL, 2018, NULL, 'https://ieeexplore.ieee.org/abstract/document/8405526/', 45, 'https://scholar.google.com/scholar?hl=en&cites=12787580523055771259', 'scholar', '{\"scholar_cluster_id\":\"[\'12787580523055771259\']\"}', '6badedb989e2cf25cea1172a93f4cb13db967f23', 0, '2025-09-21 00:00:59', '2025-10-02 00:00:56', NULL, '{\"2018\":2,\"2019\":10,\"2020\":3,\"2021\":5,\"2022\":9,\"2023\":6,\"2024\":9,\"2025\":1}'),
(147, 8, 'Hierarchical verification for the BPMN design model using state space analysis', 'Chanon Dechsupa, Wiwat Vatanawood, Arthit Thongtak', NULL, NULL, NULL, 2019, NULL, 'https://ieeexplore.ieee.org/abstract/document/8611325/', 41, 'https://scholar.google.com/scholar?hl=en&cites=8862119664193353323', 'scholar', '{\"scholar_cluster_id\":\"[\'8862119664193353323\']\"}', '29bd0c0fb709ce634fa24280fa74b0123c33d553', 0, '2025-09-21 00:00:59', '2025-10-02 00:00:56', NULL, '{\"2018\":1,\"2019\":6,\"2020\":3,\"2021\":4,\"2022\":8,\"2023\":10,\"2024\":2,\"2025\":7}'),
(148, 8, 'Formal verification of web service orchestration using colored petri net', 'C Dechsupa, W Vatanawood, A Thongtak', NULL, NULL, NULL, 2016, NULL, 'http://www.iaeng.org/publication/IMECS2016/IMECS2016_pp398-403.pdf', 13, 'https://scholar.google.com/scholar?hl=en&cites=17960005054307779010', 'scholar', '{\"scholar_cluster_id\":\"[\'17960005054307779010\']\"}', '0c1a71fe987328fd47243c5f50fa927fe3aad557', 0, '2025-09-21 00:00:59', '2025-10-02 00:00:56', NULL, '{\"2017\":1,\"2018\":3,\"2019\":4,\"2020\":2,\"2021\":1,\"2022\":0,\"2023\":2}'),
(149, 8, 'Stepwise verification for the BPMN with timed and stochastic process using a colored generalized stochastic Petri net', 'Chanon Dechsupa, Wiwat Vatanawood, Arthit Thongtak', NULL, NULL, NULL, 2022, NULL, 'https://ieeexplore.ieee.org/abstract/document/9758738/', 6, 'https://scholar.google.com/scholar?hl=en&cites=7981025124627691886', 'scholar', '{\"scholar_cluster_id\":\"[\'7981025124627691886\']\"}', 'aeb7e0e56f784f470d212414acdf19f7307ed11e', 0, '2025-09-21 00:00:59', '2025-10-02 00:00:56', NULL, '{\"2022\":2,\"2023\":1,\"2024\":0,\"2025\":3}'),
(150, 8, 'An automated framework for BPMN model verification achieving branch coverage', 'Chanon Dechsupa, Wiwat Vatanawood, Arthit Thongtak', NULL, NULL, NULL, 2021, NULL, 'https://engj.org/index.php/ej/article/view/4084', 5, 'https://scholar.google.com/scholar?hl=en&cites=8795149309224104072', 'scholar', '{\"scholar_cluster_id\":\"[\'8795149309224104072\']\"}', '07daece3baefcd04ce2263035573e1c44e55bc49', 0, '2025-09-21 00:00:59', '2025-10-02 00:00:56', NULL, '{\"2021\":1,\"2022\":0,\"2023\":2,\"2024\":1,\"2025\":1}'),
(151, 8, 'Formal Verification of the Accounting Information Interfaces Using Colored Petri Net', 'Worawit Poolsawasdi, Chanon Dechsupa', NULL, NULL, NULL, 2019, NULL, 'https://ieeexplore.ieee.org/abstract/document/8802547/', 3, 'https://scholar.google.com/scholar?hl=en&cites=14998856147780456235', 'scholar', '{\"scholar_cluster_id\":\"[\'14998856147780456235\']\"}', 'c170922d38a507760700cbfab7f16275afb11e30', 0, '2025-09-21 00:00:59', '2025-10-02 00:00:56', NULL, '{\"2019\":1,\"2020\":0,\"2021\":2}'),
(152, 8, 'Compositional formal verification for business process models with heterogeneous notations using colored Petri Net', 'C Dechsupa, W Vatanawood, A Thongtak', NULL, NULL, NULL, 2019, NULL, 'https://scholar.google.com/scholar?cluster=6843663431830027631&hl=en&oi=scholarr', 3, 'https://scholar.google.com/scholar?hl=en&cites=6843663431830027631', 'scholar', '{\"scholar_cluster_id\":\"[\'6843663431830027631\']\"}', '23242652a60d109cd5fad480e0a5d4f44cafe19d', 0, '2025-09-21 00:00:59', '2025-10-02 00:00:56', NULL, '{\"2023\":1,\"2024\":2}'),
(153, 8, 'MorphoNet: A novel bivalve images classification framework with convolutional neural network', 'Chanon Dechsupa, Pongpun Prasankok, Wiwat Vattanawood, Arthit Thongtak', NULL, NULL, NULL, 2023, NULL, 'https://engj.org/index.php/ej/article/view/4510', 2, 'https://scholar.google.com/scholar?hl=en&cites=14881028456811771380', 'scholar', '{\"scholar_cluster_id\":\"[\'14881028456811771380\']\"}', '520340ad03a1bd8771441f1e27b9e5fd998fc943', 0, '2025-09-21 00:00:59', '2025-10-02 00:00:56', NULL, '{\"2024\":1,\"2025\":1}'),
(154, 8, 'Formal modelling and verification of the traffic light control system design with time-automata', 'A Kamput, C Dechsupa', NULL, NULL, NULL, 2023, NULL, 'https://www.researchgate.net/profile/Chanon-Dechsupa/publication/372388619_Formal_Modelling_and_Verification_of_the_Traffic_Light_Control_System_Design_with_Time-Automata/links/652e3af3b5c77c79f9bda3d7/Formal-Modelling-and-Verification-of-the-Traffic-Light-Control-System-Design-with-Time-Automata.pdf', 2, 'https://scholar.google.com/scholar?hl=en&cites=14268178437607664045', 'scholar', '{\"scholar_cluster_id\":\"[\'14268178437607664045\']\"}', '68f044d021c5607e9e2102e03aa9f62276ba28ef', 0, '2025-09-21 00:00:59', '2025-10-02 00:00:56', NULL, '{\"2025\":2}'),
(155, 8, 'An Applying Colored Petri Net for Computerized Accounting System and Ledger Accounts Instruction', 'Chanon Dechsupa, Wiwat Vatanawood, Worawit Poolsawasdi, Arthit Thongtak', NULL, NULL, NULL, 2021, NULL, 'https://www.mdpi.com/2073-431X/10/12/169', 2, 'https://scholar.google.com/scholar?hl=en&cites=16343376208504623490', 'scholar', '{\"scholar_cluster_id\":\"[\'16343376208504623490\']\"}', 'a0313a91b99f2de58140206c67f5aba6663f9f8b', 0, '2025-09-21 00:00:59', '2025-10-02 00:00:56', NULL, '{\"2023\":2}'),
(156, 8, 'Llm-Based Code Comment Summarization: Efficacy Evaluation and Challenges', 'Peeradon Sukkasem, Chitsutha Soomlek, Chanon Dechsupa', NULL, NULL, NULL, 2025, NULL, 'https://ieeexplore.ieee.org/abstract/document/11003343/', 1, 'https://scholar.google.com/scholar?hl=en&cites=14726756873448249733', 'scholar', '{\"scholar_cluster_id\":\"[\'14726756873448249733\']\"}', '39d79360a49705d0644781f70219ee2490fb951b', 0, '2025-09-21 00:00:59', '2025-10-02 00:00:56', NULL, '{\"2025\":1}'),
(157, 8, 'Scalable Timed-Automata Models for Traffic Light Control Systems: Challenges and Solutions in Formal Verification', 'Apipath Kamput, Chanon Dechsupa, Wiwat Vatanawood, Suttinan Pomsiri', NULL, NULL, NULL, 2024, NULL, 'https://ieeexplore.ieee.org/abstract/document/10666689/', 1, 'https://scholar.google.com/scholar?hl=en&cites=12598599138348353170', 'scholar', '{\"scholar_cluster_id\":\"[\'12598599138348353170\']\"}', '47baa15c9601f7a47e319e4ee43ac19e56de55cd', 0, '2025-09-21 00:00:59', '2025-10-02 00:00:56', NULL, '{\"2024\":1}'),
(158, 8, 'Toward automated verification of timed business process models using timed-automata networks and temporal properties', 'Chanon Dechsupa, Wiwat Vatanawood, Arthit Thongtak', NULL, NULL, NULL, 2025, NULL, 'https://www.sciencedirect.com/science/article/pii/S0020025525002208', NULL, NULL, 'scholar', NULL, '53db11828cb1250fd29af14999ea719ec090dbe1', 0, '2025-09-21 00:00:59', '2025-10-02 00:00:56', NULL, NULL),
(159, 8, 'Towards AI-Augmented Formal Verification: A Preliminary Investigation of ENGRU and Its Challenges', 'Chanon Dechsupa, Teerapong Panboonyuen, Wiwat Vatanawood, Praisan Padungweang, Chakchai So-In', NULL, NULL, NULL, 2025, NULL, 'https://ieeexplore.ieee.org/abstract/document/10993355/', 1, 'https://scholar.google.com/scholar?hl=en&cites=18157055063819776419', 'scholar', '{\"scholar_cluster_id\":\"[\'18157055063819776419\']\"}', '61ae555d998434eb64330b744161eaa6a8914dc1', 0, '2025-09-21 00:00:59', '2025-10-02 00:00:56', NULL, '{\"2025\":1}'),
(160, 8, 'Ensuring IoT Controller Reliability with Colored Generalized Stochastic Petri Net', 'Kruntarat Samngamnoi, Sutinun Pomsiri, Apipath Kamput, Chanon Dechsupa', NULL, NULL, NULL, 2024, NULL, 'https://ieeexplore.ieee.org/abstract/document/10770732/', NULL, NULL, 'scholar', NULL, 'baf62b4c49575b62532aacf9a50ee208449c39ec', 0, '2025-09-21 00:00:59', '2025-10-02 00:00:56', NULL, NULL),
(161, 8, 'An Applying Colored Petri Net for Computerized Accounting System and Ledger Accounts Instruction. Computers 2021, 10, 169', 'C Dechsupa, W Vatanawood, W Poolsawasdi, A Thongtak', NULL, NULL, NULL, 2021, NULL, 'https://www.academia.edu/download/80214901/pdf.pdf', NULL, NULL, 'scholar', NULL, '992712dd566fd338b5cf9253b9ddc09873cd0f04', 0, '2025-09-21 00:00:59', '2025-10-02 00:00:56', NULL, NULL),
(162, 8, 'Configuration management for integrated teaming environment', 'Chanon Dechsupa, Yachai Limpiyakorn', NULL, NULL, NULL, 2011, NULL, 'https://ieeexplore.ieee.org/abstract/document/6081265/', NULL, NULL, 'scholar', NULL, 'f43315261210343763e2bbcc9400bbf5696776cf', 0, '2025-09-21 00:00:59', '2025-10-02 00:00:56', NULL, NULL),
(163, 8, 'Transforming of the Sequence Diagram into Time-Automata Network', 'S Duangmalai, C Dechsupa', NULL, NULL, NULL, NULL, NULL, 'https://scholar.google.com/scholar?cluster=7621266305846188641&hl=en&oi=scholarr', NULL, NULL, 'scholar', NULL, '6df534e9aadf27573bb99823d90c0b0d042ad440', 0, '2025-09-21 00:00:59', '2025-10-02 00:00:56', NULL, NULL);

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
  `approved_amount` decimal(15,2) DEFAULT NULL,
  `approval_comment` text DEFAULT NULL,
  `approved_by` int(11) DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `rejected_by` int(11) DEFAULT NULL,
  `rejected_at` datetime DEFAULT NULL,
  `revision_request` text DEFAULT NULL,
  `revision_requested_by` int(11) DEFAULT NULL,
  `revision_requested_at` datetime DEFAULT NULL,
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
(81, 116, 'Test Article Title', 'Test Journal Name', '2025-10-01', 'journal', 'T10', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Scopus', '45000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '45000.00', '0.00', '', 2, 'first_author', 'yes', 'FA-777', 'QS #500', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-25 17:03:36', '2025-09-25 17:03:36', NULL, 1, 2, 'ab', 'somchai jaidee'),
(82, 117, 'Test Article Title', 'Test Journal Name', '2025-05-01', 'journal', 'Q2', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science, TCI', '30000.00', '30000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '30000.00', '30000.00', '', 2, 'first_author', 'yes', 'FA-777', 'QS #500', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-25 17:27:15', '2025-09-29 12:06:57', NULL, 1, 2, 'a b', 'somchai jaidee'),
(83, 118, 'Test Article Title', 'Test Journal Name', '2025-09-01', 'journal', 'T5', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science, TCI', '50000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '50000.00', '0.00', '', 2, 'first_author', 'yes', 'FA-777', 'QS #500', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-25 17:29:17', '2025-09-25 17:29:17', NULL, 1, 2, 'aq', 'somchai jaidee'),
(84, 119, 'Test Article Title', 'Test Journal Name', '2025-09-01', 'journal', 'Q3', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science, TCI', '20000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '20000.00', '0.00', '', 2, 'corresponding_author', 'yes', 'FA-777', NULL, NULL, NULL, NULL, NULL, 'asdasd', 13, '2025-09-26 15:58:43', NULL, NULL, NULL, '2025-09-25 17:31:05', '2025-09-26 15:58:43', NULL, 1, 2, 'a b', 'spw'),
(85, 120, 'Test Article Title', 'Test Journal Name', '2025-10-01', 'journal', 'T10', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science, TCI', '45000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '45000.00', '0.00', '', 2, 'first_author', 'yes', 'FA-777', 'QS #500', NULL, NULL, NULL, NULL, 'asad', 13, '2025-09-26 07:28:05', NULL, NULL, NULL, '2025-09-25 17:35:31', '2025-09-26 07:28:05', NULL, 1, 2, 'a', 'somchai jaidee'),
(86, 122, 'Test Article Title', 'Test Journal Name', '2025-03-01', 'journal', 'Q1', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science, TCI', '40000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '40000.00', '0.00', '', 2, 'first_author', 'yes', 'FA-777', 'QS #500', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-26 23:33:11', '2025-09-26 23:33:11', NULL, 3, 8, 'ab', 'somchai jaidee'),
(87, 123, 'Test Article Title', 'Test Journal Name', '2025-09-01', 'journal', 'T5', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science, TCI', '50000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '50000.00', '0.00', '', 2, 'first_author', 'yes', 'FA-777', 'QS #500', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-30 13:41:38', '2025-09-30 13:41:38', NULL, 3, 8, 'ab', 'somchai jaidee'),
(88, 124, 'Test Article Title', 'Test Journal Name', '2025-03-01', 'journal', 'Q1', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science, TCI', '40000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '40000.00', '0.00', '', 2, 'corresponding_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-01 13:16:58', '2025-10-01 13:16:58', NULL, 3, 8, 'ab', 'somchai jaidee'),
(89, 125, 'Test Article Title', 'Test Journal Name', '2025-08-01', 'journal', 'T5', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science, TCI', '50000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '50000.00', '0.00', '', 2, 'first_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-01 20:52:43', '2025-10-01 20:52:43', NULL, 3, 8, 'ab', 'somchai jaidee'),
(90, 126, 'Test Article Title', 'Test Journal Name', '2025-10-01', 'journal', 'T5', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Scopus, Web of Science', '50000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '50000.00', '0.00', '', 2, 'first_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-02 00:33:52', '2025-10-02 00:33:52', NULL, 3, 8, 'ab', 'somchai jaidee');

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
(1, '2568', 'first_author', 'Q1', '40000.00', 1, '2025-07-02 09:35:58', '2025-08-08 16:07:17'),
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
(14, '2568', 'corresponding_author', 'TCI', '5000.00', 1, '2025-08-04 12:20:04', '2025-08-04 15:33:38'),
(15, '2569', 'first_author', 'Q1', '40000.00', 1, '2025-08-08 02:50:39', '2025-08-08 02:50:39'),
(16, '2569', 'corresponding_author', 'Q2', '30000.00', 1, '2025-08-08 02:50:40', '2025-08-08 02:50:40'),
(17, '2569', 'first_author', 'Q3', '20000.00', 1, '2025-08-08 02:50:40', '2025-08-08 02:50:40'),
(18, '2569', 'first_author', 'Q4', '10000.00', 1, '2025-08-08 02:50:40', '2025-08-08 02:50:40'),
(19, '2569', 'corresponding_author', 'Q3', '20000.00', 1, '2025-08-08 02:50:40', '2025-08-08 02:50:40'),
(20, '2569', 'first_author', 'Q2', '30000.00', 1, '2025-08-08 02:50:40', '2025-08-08 02:50:40'),
(21, '2569', 'corresponding_author', 'Q1', '40000.00', 1, '2025-08-08 02:50:40', '2025-08-08 02:50:40'),
(22, '2569', 'corresponding_author', 'Q4', '10000.00', 1, '2025-08-08 02:50:40', '2025-08-08 02:50:40'),
(23, '2569', 'first_author', 'T5', '50000.00', 1, '2025-08-08 02:50:40', '2025-08-08 17:14:51'),
(24, '2569', 'first_author', 'T10', '45000.00', 1, '2025-08-08 02:50:40', '2025-08-08 02:50:40'),
(25, '2569', 'corresponding_author', 'T5', '50000.00', 1, '2025-08-08 02:50:40', '2025-08-08 21:02:41'),
(26, '2569', 'corresponding_author', 'T10', '45000.00', 1, '2025-08-08 02:50:40', '2025-08-08 02:50:40'),
(27, '2569', 'first_author', 'TCI', '5000.00', 1, '2025-08-08 02:50:40', '2025-08-08 02:50:40'),
(28, '2569', 'corresponding_author', 'TCI', '5000.00', 1, '2025-08-08 02:50:40', '2025-08-08 02:50:40');

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
(1, '2568', 'T5', '50000.00', 'วงเงินสูงสุดสำหรับ T5 วารสาร', 1, '2025-08-04 15:33:53', '2025-08-08 12:16:38', NULL),
(2, '2568', 'T10', '40000.00', 'วงเงินสูงสุดสำหรับ T10 วารสาร', 1, '2025-08-04 15:33:53', '2025-08-04 15:35:55', NULL),
(3, '2568', 'Q1', '30000.00', 'วงเงินสูงสุดสำหรับ Q1 วารสาร', 1, '2025-08-04 15:33:53', '2025-08-04 15:37:32', NULL),
(4, '2568', 'Q2', '20000.00', 'วงเงินสูงสุดสำหรับ Q2 วารสาร', 0, '2025-08-04 15:33:53', '2025-08-08 15:55:07', NULL),
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
  `create_at` datetime DEFAULT current_timestamp(),
  `update_at` datetime DEFAULT NULL ON UPDATE current_timestamp(),
  `delete_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
(16, 'timer', 'success', NULL, '2025-10-02 00:00:08', '2025-10-02 00:01:36', 2, 0, 18, 0, 18, 0, '2025-10-02 00:00:08', '2025-10-02 00:01:36', NULL);

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
(16, 12, '200000.00', '200000.00', '0.00', '100000.00', 2, 2, NULL, 'active', NULL, 'ไม่เกิน 10% ของเงินทุนที่ได้รับจากภายนอก แต่ไม่เกิน 100,000 บาท', '2025-06-30 11:48:03', '2025-08-08 22:57:24', NULL),
(17, 13, '400000.00', '400000.00', '0.00', '150000.00', NULL, NULL, NULL, 'active', 'ประเทศต่างๆ ยกเว้นประเทศกลุ่มอาเซียน', 'กรณีเดินทางไปทําวิจัยในสถาบันการศึกษาที่อยู่ในอันดับ 1-300 ของโลกหรือสถาบันวิจัยที่มีชื่อเสียง', '2025-06-30 11:48:03', '2025-08-11 11:50:06', NULL),
(18, 13, '400000.00', '400000.00', '0.00', '100000.00', NULL, NULL, NULL, 'active', 'ประเทศกลุ่มอาเซียน', 'กรณีเดินทางไปทําวิจัยในสถาบันการศึกษาที่อยู่ในอันดับ 1-300 ของโลกหรือสถาบันวิจัยที่มีชื่อเสียง', '2025-06-30 11:48:03', '2025-08-11 11:50:06', NULL),
(19, 14, '3500000.00', '3500000.00', '0.00', '150000.00', NULL, NULL, NULL, 'active', 'วารสารระดับนานาชาติในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS (ลําดับ 5% แรก)', NULL, '2025-06-30 11:48:03', '2025-08-08 22:57:15', NULL),
(20, 14, '3500000.00', '3500000.00', '0.00', '125000.00', NULL, NULL, NULL, 'active', 'วารสารระดับนานาชาติในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS (ลําดับ 10% แรก)', NULL, '2025-06-30 11:48:03', '2025-08-08 22:57:15', NULL),
(21, 14, '3500000.00', '3500000.00', '0.00', '100000.00', NULL, NULL, NULL, 'active', 'วารสารระดับนานาชาติในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS ควอร์ไทล์ 1', NULL, '2025-06-30 11:48:03', '2025-08-08 22:57:15', NULL),
(22, 14, '3500000.00', '3500000.00', '0.00', '75000.00', NULL, NULL, NULL, 'active', 'วารสารระดับนานาชาติในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS ควอร์ไทล์ 2', NULL, '2025-06-30 11:48:03', '2025-08-08 22:57:15', NULL),
(23, 15, '3500000.00', '3500000.00', '0.00', '80000.00', NULL, NULL, NULL, 'active', 'วารสารระดับนานาชาติในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS (ลําดับ 5% แรก)', NULL, '2025-06-30 11:48:03', '2025-08-11 11:49:58', NULL),
(24, 15, '3500000.00', '3500000.00', '0.00', '60000.00', NULL, NULL, NULL, 'active', 'วารสารระดับนานาชาติในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS (ลําดับ 10% แรก)', NULL, '2025-06-30 11:48:03', '2025-08-11 11:49:58', NULL),
(25, 15, '3500000.00', '3500000.00', '0.00', '50000.00', NULL, NULL, NULL, 'active', 'วารสารระดับนานาชาติในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS ควอร์ไทล์ 1', NULL, '2025-06-30 11:48:03', '2025-08-11 11:49:58', NULL),
(31, 14, '3500000.00', '3500000.00', '0.00', '50000.00', NULL, NULL, NULL, 'active', 'วารสารระดับนานาชาติในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS ควอร์ไทล์ 3', NULL, '2025-06-30 11:48:03', '2025-08-08 22:57:15', NULL),
(32, 14, '3500000.00', '3500000.00', '0.00', '25000.00', NULL, NULL, NULL, 'active', 'วารสารระดับนานาชาติในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS ควอร์ไทล์ 4', NULL, '2025-06-30 11:48:03', '2025-08-08 22:57:15', NULL),
(33, 14, '3500000.00', '3500000.00', '0.00', '15000.00', NULL, NULL, NULL, 'active', 'บทความตีพิมพ์ในวารสารระดับนานาชาติในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS หรือวารสารที่อยู่ในฐานข้อมูล TCI กลุ่มที่ 1 สาขาวิทยาศาสตร์เทคโนโลยี ', NULL, '2025-06-30 11:48:03', '2025-08-08 22:57:15', NULL),
(34, 15, '3500000.00', '3500000.00', '0.00', '30000.00', NULL, NULL, NULL, 'active', 'วารสารระดับนานาชาติในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS ควอร์ไทล์ 2', NULL, '2025-06-30 11:48:03', '2025-08-11 11:49:58', NULL),
(35, 15, '3500000.00', '3500000.00', '0.00', '15000.00', NULL, NULL, NULL, 'active', 'วารสารระดับนานาชาติในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS ควอร์ไทล์ 3', NULL, '2025-06-30 11:48:03', '2025-08-11 11:49:58', NULL),
(36, 15, '3500000.00', '3500000.00', '0.00', '7500.00', NULL, NULL, NULL, 'active', 'วารสารระดับนานาชาติในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS ควอร์ไทล์ 4', NULL, '2025-06-30 11:48:03', '2025-08-11 11:49:58', NULL),
(37, 15, '3500000.00', '3500000.00', '0.00', '3000.00', NULL, NULL, NULL, 'active', 'บทความตีพิมพ์ในวารสารระดับนานาชาติในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS หรือวารสารที่อยู่ในฐานข้อมูล TCI กลุ่มที่ 1 สาขาวิทยาศาสตร์เทคโนโลยี ', NULL, '2025-06-30 11:48:03', '2025-08-11 11:49:58', NULL);

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
  `head_approved_by` int(11) DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `approved_by` int(11) DEFAULT NULL,
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

INSERT INTO `submissions` (`submission_id`, `submission_type`, `submission_number`, `user_id`, `year_id`, `category_id`, `subcategory_id`, `subcategory_budget_id`, `status_id`, `submitted_at`, `reviewed_at`, `head_approved_at`, `head_approved_by`, `approved_at`, `approved_by`, `completed_at`, `closed_at`, `comment`, `created_at`, `updated_at`, `deleted_at`) VALUES
(116, 'publication_reward', 'PR-25680925-0001', 8, 3, 2, 14, 20, 1, '2025-09-25 17:03:36', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-25 17:03:36', '2025-09-25 17:03:36', NULL),
(117, 'publication_reward', 'PR-25680925-0002', 8, 3, 2, 14, 22, 2, '2025-09-25 17:27:15', NULL, NULL, NULL, '2025-09-29 12:06:57', 7, NULL, NULL, NULL, '2025-09-25 17:27:15', '2025-09-29 12:06:57', NULL),
(118, 'publication_reward', 'PR-25680925-0003', 8, 3, 2, 14, 19, 6, '2025-09-25 17:29:17', '2025-09-26 12:44:10', '2025-09-26 12:44:10', 13, NULL, NULL, NULL, NULL, NULL, '2025-09-25 17:29:17', '2025-09-26 15:58:55', NULL),
(119, 'publication_reward', 'PR-25680925-0004', 8, 3, 2, 15, 31, 6, '2025-09-25 17:31:06', '2025-09-26 15:58:43', '2025-09-26 15:58:43', 13, NULL, NULL, NULL, '2025-09-26 15:58:43', 'asdasd', '2025-09-25 17:31:05', '2025-09-26 15:58:58', NULL),
(120, 'publication_reward', 'PR-25680925-0005', 8, 3, 2, 14, 20, 6, '2025-09-25 17:35:32', '2025-09-26 07:28:05', '2025-09-26 07:28:05', 13, NULL, NULL, NULL, '2025-09-26 07:28:05', 'asad', '2025-09-25 17:35:31', '2025-09-26 15:58:59', NULL),
(121, 'fund_application', 'FA-25680926-0001', 12, 3, 1, 1, 1, 6, '2025-09-26 08:42:51', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-26 08:42:51', '2025-09-26 16:20:30', NULL),
(122, 'publication_reward', 'PR-25680926-0006', 8, 3, 2, 14, 21, 6, '2025-09-26 23:33:11', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-26 23:33:11', '2025-09-26 23:33:11', NULL),
(123, 'publication_reward', 'PR-25680930-0007', 8, 3, 2, 14, 19, 6, '2025-09-30 13:41:38', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-30 13:41:38', '2025-09-30 13:41:38', NULL),
(124, 'publication_reward', 'PR-25681001-0008', 8, 3, 2, 15, 21, 6, '2025-10-01 13:16:58', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-01 13:16:58', '2025-10-01 13:16:58', NULL),
(125, 'publication_reward', 'PR-25681001-0009', 8, 3, 2, 14, 19, 6, '2025-10-01 20:52:43', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-01 20:52:43', '2025-10-01 20:52:43', NULL),
(126, 'publication_reward', 'PR-25681002-0010', 8, 3, 2, 14, 19, 6, '2025-10-02 00:33:52', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-02 00:33:52', '2025-10-02 00:33:52', NULL);

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
(232, 116, 232, 2, 'sample-local-pdf.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-09-25 17:03:36'),
(233, 116, 233, 3, 'form.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-09-25 17:03:36'),
(234, 117, 234, 2, 'sample-local-pdf.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-09-25 17:27:15'),
(235, 117, 235, 3, 'form.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-09-25 17:27:15'),
(236, 118, 236, 2, '1. 1574-68 หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย นวัตกรรม และบริการวิชาการ (2568).pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-09-25 17:29:17'),
(237, 118, 237, 3, 'form.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-09-25 17:29:17'),
(238, 119, 238, 2, 'sample-local-pdf.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-09-25 17:31:05'),
(239, 119, 239, 3, 'form.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-09-25 17:31:06'),
(240, 120, 240, 2, 'form.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-09-25 17:35:31'),
(241, 120, 241, 3, '1. 1574-68 หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย นวัตกรรม และบริการวิชาการ (2568).pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-09-25 17:35:31'),
(242, 121, 245, 4, 'c4611_sample_explain.pdf', 3, 0, 0, NULL, NULL, '2025-09-26 08:42:51'),
(243, 121, 244, 3, 'file-sample_150kB.pdf', 2, 0, 0, NULL, NULL, '2025-09-26 08:42:51'),
(244, 121, 243, 2, 'sample.pdf', 1, 0, 0, NULL, NULL, '2025-09-26 08:42:51'),
(245, 121, 242, 13, 'sample-local-pdf.pdf', 4, 0, 0, NULL, NULL, '2025-09-26 08:42:51'),
(246, 122, 246, 2, 'form.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-09-26 23:33:11'),
(247, 123, 247, 2, 'form.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-09-30 13:41:38'),
(248, 123, 248, 3, 'sample-local-pdf.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-09-30 13:41:38'),
(249, 123, 249, 16, '', 3, 0, 0, NULL, NULL, '2025-09-30 13:41:38'),
(250, 124, 250, 2, 'sample-local-pdf.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-01 13:16:58'),
(251, 124, 251, 3, 'form.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-10-01 13:16:58'),
(252, 124, 252, 16, '', 3, 0, 0, NULL, NULL, '2025-10-01 13:16:58'),
(253, 125, 253, 2, 'form.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-01 20:52:43'),
(254, 125, 254, 3, 'sample-local-pdf.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-10-01 20:52:43'),
(255, 125, 255, 16, '', 3, 0, 0, NULL, NULL, '2025-10-01 20:52:43'),
(256, 126, 256, 2, 'sample-local-pdf.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-02 00:33:52'),
(257, 126, 257, 3, 'form.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-10-02 00:33:52'),
(258, 126, 258, 16, '', 3, 0, 0, NULL, NULL, '2025-10-02 00:33:52');

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
(166, 116, 8, 'owner', 1, 1, '2025-09-25 17:03:36'),
(167, 116, 1, 'coauthor', 0, 2, '2025-09-25 17:03:36'),
(168, 117, 8, 'owner', 1, 1, '2025-09-25 17:27:15'),
(169, 117, 1, 'coauthor', 0, 2, '2025-09-25 17:27:15'),
(170, 118, 8, 'owner', 1, 1, '2025-09-25 17:29:17'),
(171, 118, 9, 'coauthor', 0, 2, '2025-09-25 17:29:17'),
(172, 119, 8, 'owner', 1, 1, '2025-09-25 17:31:05'),
(173, 119, 1, 'coauthor', 0, 2, '2025-09-25 17:31:05'),
(174, 120, 8, 'owner', 1, 1, '2025-09-25 17:35:31'),
(175, 120, 1, 'coauthor', 0, 2, '2025-09-25 17:35:31'),
(176, 122, 8, 'owner', 1, 1, '2025-09-26 23:33:11'),
(177, 122, 1, 'coauthor', 0, 2, '2025-09-26 23:33:11'),
(178, 123, 8, 'owner', 1, 1, '2025-09-30 13:41:38'),
(179, 123, 12, 'coauthor', 0, 2, '2025-09-30 13:41:38'),
(180, 124, 8, 'owner', 1, 1, '2025-10-01 13:16:58'),
(181, 124, 1, 'coauthor', 0, 2, '2025-10-01 13:16:58'),
(182, 125, 8, 'owner', 1, 1, '2025-10-01 20:52:43'),
(183, 125, 1, 'coauthor', 0, 2, '2025-10-01 20:52:43'),
(184, 126, 8, 'owner', 1, 1, '2025-10-02 00:33:52'),
(185, 126, 1, 'coauthor', 0, 2, '2025-10-02 00:33:52');

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `system_config`
--

INSERT INTO `system_config` (`config_id`, `system_version`, `last_updated`, `updated_by`, `current_year`, `start_date`, `end_date`, `main_annoucement`, `reward_announcement`, `activity_support_announcement`, `conference_announcement`, `service_announcement`, `kku_report_year`, `installment`) VALUES
(1, '1.0.0', '2025-10-01 15:56:24', NULL, '2568', '2025-08-29 21:01:00', '2025-10-16 10:00:00', 3, 8, 1, 1, 2, '2999', 5);

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
  `scholar_author_id` varchar(32) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `role_id` int(11) DEFAULT NULL,
  `position_id` int(11) DEFAULT NULL,
  `date_of_employment` date DEFAULT NULL,
  `create_at` datetime DEFAULT current_timestamp(),
  `update_at` datetime DEFAULT NULL,
  `delete_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `user_fname`, `user_lname`, `gender`, `email`, `scholar_author_id`, `password`, `role_id`, `position_id`, `date_of_employment`, `create_at`, `update_at`, `delete_at`) VALUES
(1, 'Somchai', 'Suwan', 'male', 'somchai@example.com', NULL, '$2a$10$LCtvqEswW1dTIOwJdTrvZuFmQF61aepTdC9HgI78UdnuyVJs3pxIm', 1, 1, NULL, '2025-06-24 16:49:13', '2025-07-02 22:02:51', NULL),
(2, 'Suda', 'Kong', 'female', 'suda@example.com', NULL, '$2a$10$.UeSuOiuMSwJRwZyxplaSOd7DsD/q/0S7zozjFWGP9F2Dm1ZCN8rK', 2, 3, NULL, '2025-06-24 16:49:13', '2025-07-02 22:02:51', NULL),
(7, 'ผู้ดูแล', 'ระบบ', 'male', 'kitsanapong.p@kkumail.com', NULL, '$2a$10$f8kTbCx57o6gCNItJMUczeTmwPK1TUudS85U.wF6keW2cAVApjYN6', 3, 3, NULL, '2025-07-31 17:52:45', '2025-07-31 17:52:45', NULL),
(8, 'สมชาย', 'ใจดี', 'male', 'aum.kitsanapong@gmail.com', '_lza5VIAAAAJ', '$2a$10$sPaTxAZ.Bp4fxHGBg.awZ.a5jq72uWXeRAQHLK.3LTluhNoliaRYG', 1, 1, '2025-09-17', '2025-07-31 17:52:46', '2025-07-31 17:52:46', NULL),
(9, 'สมหญิง', 'รักการศึกษา', 'female', 'teacher2@cpkku.ac.th', '_XXXXXXXXXXZ', '$2a$10$mgxuR9pZ5HfndfDoHd/ZquUQYAKztvxZBpT417iX05TLOC.axULf2', 1, 2, NULL, '2025-07-31 17:52:46', '2025-07-31 17:52:46', NULL),
(10, 'สุดา', 'ช่วยเหลือ', 'female', 'staff@cpkku.ac.th', NULL, '$2a$10$Df2y47XVO7Eugd/DLXJSAuIqXktScmsvhTSRzANBQzqSOCmuPSi1C', 2, 3, NULL, '2025-07-31 17:52:46', '2025-07-31 17:52:46', NULL),
(11, 'ผู้ดูแล', 'ระบบ', 'male', 'admin@cpkku.ac.th', NULL, '$2a$10$JL5vSA37ApBjYy8Yn3dzd.JznwUc4PvU7BWw1HvG4Er5hfuJ8ypxO', 3, 3, NULL, '2025-09-22 14:48:29', '2025-09-22 14:48:29', NULL),
(12, 'สมหมาย', 'จันทร์', 'male', 'teacher@cpkku.ac.th', NULL, '$2a$10$6ZjpWSb79tlPLB4YViD/aet//OVVG2MigdyHqIrNX.RXyA6UVUaf.', 1, 1, '2025-09-16', '2025-09-22 14:48:29', '2025-09-22 14:48:29', NULL),
(13, 'หัวหน้า', 'สาขา', 'female', 'depthead@cpkku.ac.th', NULL, '$2a$10$1med.YpeDE7LdwkGyGgUo.6M9gg9TdRVQXioesRxWU0yz58uQuLna', 4, 3, NULL, '2025-09-22 14:48:30', '2025-09-22 14:48:30', NULL);

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
(2, 2, 2, 2, '80000.00', '80000.00', 1, 'yes', NULL, '2025-06-24 17:52:30', '2025-06-24 17:52:30', '2025-06-24 17:52:30', NULL),
(3, 8, 2, 1, '125000.00', '0.00', 10, 'yes', NULL, '2025-06-24 17:52:30', '2025-06-24 17:52:30', '2025-06-24 17:52:30', NULL);

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
  `cites_per_year` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`cites_per_year`)),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_scholar_metrics`
--

INSERT INTO `user_scholar_metrics` (`user_id`, `hindex`, `hindex5y`, `i10index`, `i10index5y`, `citedby_total`, `citedby_5y`, `cites_per_year`, `updated_at`) VALUES
(8, 5, 5, 3, 2, 125, 97, '{\"2017\":1,\"2018\":6,\"2019\":21,\"2020\":8,\"2021\":13,\"2022\":19,\"2023\":24,\"2024\":16,\"2025\":17}', '2025-10-02 00:00:56'),
(9, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-02 00:01:36');

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
(399, 8, '6315f856-52a9-474e-8796-65109596385c', 'liVU0RGJCYsDStYNDRbY-PWJA7bg6iYNq27vnwVgWfQ=', 'Chrome Browser', 'web', '58.10.72.49', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-02 12:01:37', '2025-11-01 09:56:34', 1, '2025-10-02 10:56:34', '2025-10-02 12:01:37');

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
(399, 8, 'refresh', 'liVU0RGJCYsDStYNDRbY-PWJA7bg6iYNq27vnwVgWfQ=', '2025-11-01 09:56:34', 0, 'Chrome Browser / web', '58.10.72.49', '2025-10-02 10:56:34', '2025-10-02 10:56:34');

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
-- Stand-in structure for view `v_announcements_readable`
-- (See below for the actual view)
--
CREATE TABLE `v_announcements_readable` (
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
-- Stand-in structure for view `v_fund_forms_readable`
-- (See below for the actual view)
--
CREATE TABLE `v_fund_forms_readable` (
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
,`submission_type` enum('fund_application','publication_reward')
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
(2, '2567', '1500000.00', 'active', '2025-06-24 16:49:13', '2025-08-08 21:22:24', NULL),
(3, '2568', '2000000.00', 'active', '2025-07-08 10:44:10', '2025-08-10 19:49:28', NULL),
(4, '2569', '1000000.00', 'active', '2025-08-27 14:58:19', '2025-08-27 14:58:19', NULL);

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
-- Structure for view `v_announcements_readable`
--
DROP TABLE IF EXISTS `v_announcements_readable`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_announcements_readable`  AS  select `a`.`announcement_id` AS `announcement_id`,`a`.`title` AS `title`,`a`.`description` AS `description`,`a`.`file_name` AS `file_name`,`a`.`file_path` AS `file_path`,`a`.`file_size` AS `file_size`,`a`.`mime_type` AS `mime_type`,`a`.`announcement_type` AS `announcement_type`,`a`.`priority` AS `priority`,`a`.`status` AS `status`,`a`.`published_at` AS `published_at`,`a`.`expired_at` AS `expired_at`,`a`.`view_count` AS `view_count`,`a`.`download_count` AS `download_count`,`a`.`created_by` AS `created_by`,`a`.`create_at` AS `create_at`,`a`.`update_at` AS `update_at`,`a`.`delete_at` AS `delete_at`,concat(`u`.`user_fname`,' ',`u`.`user_lname`) AS `creator_name`,`u`.`email` AS `creator_email`,case when `a`.`announcement_type` = 'general' then 'ประกาศทั่วไป' when `a`.`announcement_type` = 'research_fund' then 'ทุนส่งเสริมการวิจัย' when `a`.`announcement_type` = 'promotion_fund' then 'ทุนอุดหนุนกิจกรรม' else `a`.`announcement_type` end AS `announcement_type_name`,case when `a`.`priority` = 'normal' then 'ปกติ' when `a`.`priority` = 'high' then 'สำคัญ' when `a`.`priority` = 'urgent' then 'ด่วน' else `a`.`priority` end AS `priority_name`,case when `a`.`status` = 'active' then 'เปิดใช้งาน' when `a`.`status` = 'inactive' then 'ปิดใช้งาน' else `a`.`status` end AS `status_name`,case when `a`.`expired_at` is null then 0 when `a`.`expired_at` < current_timestamp() then 1 else 0 end AS `is_expired` from (`announcements` `a` left join `users` `u` on(`a`.`created_by` = `u`.`user_id`)) where `a`.`delete_at` is null ;

-- --------------------------------------------------------

--
-- Structure for view `v_approval_records`
--
DROP TABLE IF EXISTS `v_approval_records`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_approval_records`  AS  select `s`.`submission_id` AS `submission_id`,`s`.`submission_number` AS `submission_number`,`s`.`submission_type` AS `submission_type`,`s`.`user_id` AS `user_id`,concat(`u`.`user_fname`,' ',`u`.`user_lname`) AS `applicant_name`,`s`.`year_id` AS `year_id`,`y`.`year` AS `year_th`,`s`.`category_id` AS `category_id`,`fc`.`category_name` AS `category_name`,`s`.`subcategory_id` AS `subcategory_id`,`fsc`.`subcategory_name` AS `subcategory_name`,`s`.`subcategory_budget_id` AS `subcategory_budget_id`,coalesce(nullif(trim(`sb`.`fund_description`),''),nullif(concat('ระดับ ',`sb`.`level`),'ระดับ '),concat('งบ #',`sb`.`subcategory_budget_id`)) AS `subcategory_budget_label`,`s`.`status_id` AS `status_id`,`s`.`approved_by` AS `approved_by`,`s`.`approved_at` AS `approved_at`,case when `s`.`submission_type` = 'publication_reward' then coalesce(`prd`.`total_approve_amount`,coalesce(`prd`.`reward_approve_amount`,0) + coalesce(`prd`.`revision_fee_approve_amount`,0) + coalesce(`prd`.`publication_fee_approve_amount`,0),0) when `s`.`submission_type` = 'fund_application' then coalesce(`fa`.`total_approved_amount`,0) else 0 end AS `approved_amount` from (((((((`submissions` `s` join `users` `u` on(`u`.`user_id` = `s`.`user_id` and (`u`.`delete_at` is null or `u`.`delete_at` = 0))) join `years` `y` on(`y`.`year_id` = `s`.`year_id`)) left join `fund_categories` `fc` on(`fc`.`category_id` = `s`.`category_id`)) left join `fund_subcategories` `fsc` on(`fsc`.`subcategory_id` = `s`.`subcategory_id`)) left join `subcategory_budgets` `sb` on(`sb`.`subcategory_budget_id` = `s`.`subcategory_budget_id`)) left join `publication_reward_details` `prd` on(`prd`.`submission_id` = `s`.`submission_id`)) left join (select `fund_application_details`.`submission_id` AS `submission_id`,sum(coalesce(`fund_application_details`.`approved_amount`,0)) AS `total_approved_amount` from `fund_application_details` group by `fund_application_details`.`submission_id`) `fa` on(`fa`.`submission_id` = `s`.`submission_id`)) where `s`.`status_id` = 2 and `s`.`deleted_at` is null ;

-- --------------------------------------------------------

--
-- Structure for view `v_approval_totals_by_teacher`
--
DROP TABLE IF EXISTS `v_approval_totals_by_teacher`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_approval_totals_by_teacher`  AS  select `r`.`user_id` AS `user_id`,`r`.`applicant_name` AS `applicant_name`,`r`.`year_id` AS `year_id`,`r`.`year_th` AS `year_th`,`r`.`category_id` AS `category_id`,`r`.`category_name` AS `category_name`,`r`.`subcategory_id` AS `subcategory_id`,`r`.`subcategory_name` AS `subcategory_name`,`r`.`subcategory_budget_id` AS `subcategory_budget_id`,`r`.`subcategory_budget_label` AS `subcategory_budget_label`,sum(`r`.`approved_amount`) AS `total_approved_amount` from `v_approval_records` `r` group by `r`.`user_id`,`r`.`year_id`,`r`.`category_id`,`r`.`subcategory_id`,`r`.`subcategory_budget_id` ;

-- --------------------------------------------------------

--
-- Structure for view `v_current_dept_head`
--
DROP TABLE IF EXISTS `v_current_dept_head`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_current_dept_head`  AS  select `dept_head_assignments`.`head_user_id` AS `head_user_id`,`dept_head_assignments`.`effective_from` AS `effective_from` from `dept_head_assignments` where `dept_head_assignments`.`effective_to` is null ;

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
-- Structure for view `v_fund_forms_readable`
--
DROP TABLE IF EXISTS `v_fund_forms_readable`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_fund_forms_readable`  AS  select `f`.`form_id` AS `form_id`,`f`.`title` AS `title`,`f`.`description` AS `description`,`f`.`file_name` AS `file_name`,`f`.`file_path` AS `file_path`,`f`.`file_size` AS `file_size`,`f`.`mime_type` AS `mime_type`,`f`.`form_type` AS `form_type`,`f`.`fund_category` AS `fund_category`,`f`.`version` AS `version`,`f`.`is_required` AS `is_required`,`f`.`status` AS `status`,`f`.`effective_date` AS `effective_date`,`f`.`expiry_date` AS `expiry_date`,`f`.`download_count` AS `download_count`,`f`.`created_by` AS `created_by`,`f`.`create_at` AS `create_at`,`f`.`update_at` AS `update_at`,`f`.`delete_at` AS `delete_at`,concat(`u`.`user_fname`,' ',`u`.`user_lname`) AS `creator_name`,`u`.`email` AS `creator_email`,case when `f`.`form_type` = 'application' then 'แบบฟอร์มสมัคร' when `f`.`form_type` = 'report' then 'แบบฟอร์มรายงาน' when `f`.`form_type` = 'evaluation' then 'แบบฟอร์มประเมิน' when `f`.`form_type` = 'guidelines' then 'แนวทางปฏิบัติ' when `f`.`form_type` = 'other' then 'อื่นๆ' else `f`.`form_type` end AS `form_type_name`,case when `f`.`fund_category` = 'research_fund' then 'ทุนส่งเสริมการวิจัย' when `f`.`fund_category` = 'promotion_fund' then 'ทุนอุดหนุนกิจกรรม' when `f`.`fund_category` = 'both' then 'ทั้งสองประเภท' else `f`.`fund_category` end AS `fund_category_name`,case when `f`.`status` = 'active' then 'เปิดใช้งาน' when `f`.`status` = 'inactive' then 'ปิดใช้งาน' when `f`.`status` = 'archived' then 'เก็บถาวร' else `f`.`status` end AS `status_name`,case when `f`.`expiry_date` is null then 0 when `f`.`expiry_date` < current_timestamp() then 1 else 0 end AS `is_expired` from (`fund_forms` `f` left join `users` `u` on(`f`.`created_by` = `u`.`user_id`)) where `f`.`delete_at` is null ;

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
  ADD KEY `idx_submission_user_year` (`user_id`,`year_id`),
  ADD KEY `idx_submission_category` (`category_id`),
  ADD KEY `idx_submission_subcategory` (`subcategory_id`),
  ADD KEY `idx_submission_budget` (`subcategory_budget_id`),
  ADD KEY `idx_submission_category_subcategory` (`category_id`,`subcategory_id`),
  ADD KEY `idx_submissions_approval` (`status_id`,`user_id`,`year_id`,`category_id`,`subcategory_id`,`subcategory_budget_id`,`approved_at`),
  ADD KEY `head_approved_by` (`head_approved_by`);

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
  MODIFY `announcement_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `application_status`
--
ALTER TABLE `application_status`
  MODIFY `application_status_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `log_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=335;

--
-- AUTO_INCREMENT for table `dept_head_assignments`
--
ALTER TABLE `dept_head_assignments`
  MODIFY `assignment_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `document_types`
--
ALTER TABLE `document_types`
  MODIFY `document_type_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `file_uploads`
--
ALTER TABLE `file_uploads`
  MODIFY `file_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=259;

--
-- AUTO_INCREMENT for table `fund_application_details`
--
ALTER TABLE `fund_application_details`
  MODIFY `detail_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `fund_categories`
--
ALTER TABLE `fund_categories`
  MODIFY `category_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `fund_forms`
--
ALTER TABLE `fund_forms`
  MODIFY `form_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `fund_subcategories`
--
ALTER TABLE `fund_subcategories`
  MODIFY `subcategory_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `innovations`
--
ALTER TABLE `innovations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `notification_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=126;

--
-- AUTO_INCREMENT for table `positions`
--
ALTER TABLE `positions`
  MODIFY `position_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `publications`
--
ALTER TABLE `publications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=164;

--
-- AUTO_INCREMENT for table `publication_reward_details`
--
ALTER TABLE `publication_reward_details`
  MODIFY `detail_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=91;

--
-- AUTO_INCREMENT for table `publication_reward_rates`
--
ALTER TABLE `publication_reward_rates`
  MODIFY `rate_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

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
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `subcategory_budgets`
--
ALTER TABLE `subcategory_budgets`
  MODIFY `subcategory_budget_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=38;

--
-- AUTO_INCREMENT for table `submissions`
--
ALTER TABLE `submissions`
  MODIFY `submission_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=127;

--
-- AUTO_INCREMENT for table `submission_documents`
--
ALTER TABLE `submission_documents`
  MODIFY `document_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=259;

--
-- AUTO_INCREMENT for table `submission_users`
--
ALTER TABLE `submission_users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=186;

--
-- AUTO_INCREMENT for table `system_config`
--
ALTER TABLE `system_config`
  MODIFY `config_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `user_fund_eligibilities`
--
ALTER TABLE `user_fund_eligibilities`
  MODIFY `user_fund_eligibility_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `user_sessions`
--
ALTER TABLE `user_sessions`
  MODIFY `session_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=400;

--
-- AUTO_INCREMENT for table `user_tokens`
--
ALTER TABLE `user_tokens`
  MODIFY `token_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=400;

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
-- Constraints for table `subcategory_budgets`
--
ALTER TABLE `subcategory_budgets`
  ADD CONSTRAINT `subcategories_budgets_ibfk_1` FOREIGN KEY (`subcategory_id`) REFERENCES `fund_subcategories` (`subcategory_id`);

--
-- Constraints for table `submissions`
--
ALTER TABLE `submissions`
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
