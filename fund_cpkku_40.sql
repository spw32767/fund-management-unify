-- phpMyAdmin SQL Dump
-- version 4.9.5deb2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Sep 24, 2025 at 12:18 PM
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
(1, '0', 'อยู่ระหว่างการพิจารณา', '2025-06-24 16:49:13', '2025-08-31 08:06:36', NULL),
(2, '1', 'อนุมัติ', '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL),
(3, '2', 'ปฏิเสธ', '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL),
(4, '3', 'ต้องการข้อมูลเพิ่มเติม', '2025-08-12 15:50:00', '2025-08-12 10:50:45', NULL),
(5, '4', 'ร่าง', '2025-08-12 15:50:22', '2025-08-12 10:50:25', NULL),
(6, '5', 'อยู่ระหว่างการพิจารณาจากหัวหน้าสาขา', '2025-08-12 15:50:22', '2025-08-12 10:50:25', NULL),
(7, '6', 'เห็นควรพิจารณาจากหัวหน้าสาขา', '2025-08-12 15:50:22', '2025-08-12 10:50:25', NULL),
(8, '7', 'ไม่เห็นควรพิจารณา', '2025-08-12 15:50:22', '2025-08-12 10:50:25', NULL);

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
(48, 8, 'submit', 'submission', 24, 'PR-20250805-0002', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-08-05 22:46:59'),
(49, 8, 'create', 'submission', 25, 'PR-20250807-0001', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-08-07 01:19:17'),
(50, 8, 'submit', 'submission', 25, 'PR-20250807-0001', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-08-07 01:19:18'),
(51, 8, 'create', 'submission', 26, 'PR-20250807-0002', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-08-07 02:34:33'),
(52, 8, 'submit', 'submission', 26, 'PR-20250807-0002', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-08-07 02:34:34'),
(53, 8, 'create', 'submission', 27, 'PR-20250807-0003', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-08-07 02:56:56'),
(54, 8, 'create', 'submission', 28, 'PR-20250807-0004', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-08-07 02:57:59'),
(55, 8, 'create', 'submission', 29, 'PR-20250807-0005', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-08-07 03:27:58'),
(56, 8, 'submit', 'submission', 29, 'PR-20250807-0005', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-08-07 03:28:43'),
(57, 8, 'create', 'submission', 30, 'PR-20250807-0006', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-08-07 04:00:14'),
(58, 8, 'create', 'submission', 31, 'PR-20250807-0007', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-08-07 06:11:59'),
(59, 8, 'submit', 'submission', 31, 'PR-20250807-0007', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-08-07 06:11:59'),
(60, 8, 'create', 'submission', 32, 'PR-20250807-0008', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-08-07 13:34:30'),
(61, 8, 'submit', 'submission', 32, 'PR-20250807-0008', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-08-07 13:34:30'),
(62, 8, 'create', 'submission', 33, 'PR-20250807-0009', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-08-07 13:38:22'),
(63, 8, 'submit', 'submission', 33, 'PR-20250807-0009', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-08-07 13:38:22'),
(64, 8, 'create', 'submission', 34, 'PR-20250807-0010', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-08-07 13:41:31'),
(65, 8, 'submit', 'submission', 34, 'PR-20250807-0010', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-08-07 13:41:31'),
(66, 8, 'create', 'submission', 35, 'PR-20250807-0011', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-08-07 13:53:27'),
(67, 8, 'submit', 'submission', 35, 'PR-20250807-0011', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-08-07 13:53:27'),
(68, 8, 'create', 'submission', 36, 'PR-20250807-0012', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-08-07 13:58:00'),
(69, 8, 'submit', 'submission', 36, 'PR-20250807-0012', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-08-07 13:58:00'),
(70, 8, 'create', 'submission', 37, 'PR-20250807-0013', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-08-07 14:01:47'),
(71, 8, 'submit', 'submission', 37, 'PR-20250807-0013', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-08-07 14:01:47'),
(72, 8, 'approve', 'submission', 1, 'PR-20250731-0001', NULL, NULL, 'status', NULL, NULL, 'approve submission', '2025-08-13 12:54:33'),
(73, 8, 'reject', 'submission', 1, 'PR-20250731-0001', NULL, NULL, 'status', NULL, NULL, 'reject submission', '2025-08-13 12:56:18'),
(74, 8, 'update', 'submission', 1, 'PR-20250731-0001', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-08-13 12:56:39'),
(75, 8, 'approve', 'submission', 2, 'PR-20250731-0002', NULL, NULL, 'status', NULL, NULL, 'approve submission', '2025-08-15 12:03:43'),
(76, 8, 'reject', 'submission', 2, 'PR-20250731-0002', NULL, NULL, 'status', NULL, NULL, 'reject submission', '2025-08-15 12:07:09'),
(77, 8, 'update', 'submission', 2, 'PR-20250731-0002', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-08-15 12:13:44'),
(78, 8, 'approve', 'submission', 3, 'PR-20250731-0003', NULL, NULL, 'status', NULL, NULL, 'approve submission', '2025-08-15 12:14:11'),
(79, 8, 'approve', 'submission', 1, 'PR-20250731-0001', NULL, NULL, 'status', NULL, NULL, 'approve submission', '2025-08-15 17:45:19'),
(80, 8, 'update', 'submission', 1, 'PR-20250731-0001', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-08-15 17:45:43'),
(81, 8, 'approve', 'submission', 1, 'PR-20250731-0001', NULL, NULL, 'status', NULL, NULL, 'approve submission', '2025-08-15 17:46:02'),
(82, 8, 'update', 'submission', 1, 'PR-20250731-0001', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-08-15 17:46:15'),
(83, 8, 'update', 'submission', 1, 'PR-20250731-0001', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-08-15 17:46:27'),
(84, 8, 'update', 'submission', 1, 'PR-20250731-0001', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-08-15 17:46:35'),
(85, 8, 'approve', 'submission', 1, 'PR-20250731-0001', NULL, NULL, 'status', NULL, NULL, 'approve submission', '2025-08-15 17:54:27'),
(86, 8, 'update', 'submission', 1, 'PR-20250731-0001', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-08-15 17:54:48'),
(87, 8, 'update', 'submission', 1, 'PR-20250731-0001', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-08-15 17:54:58'),
(88, 8, 'reject', 'submission', 1, 'PR-20250731-0001', NULL, NULL, 'status', NULL, NULL, 'reject submission', '2025-08-15 17:55:11'),
(89, 8, 'approve', 'submission', 1, 'PR-20250731-0001', NULL, NULL, 'status', NULL, NULL, 'approve submission', '2025-08-15 18:01:11'),
(90, 8, 'update', 'submission', 1, 'PR-20250731-0001', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-08-16 11:27:36'),
(91, 8, 'approve', 'submission', 25, 'PR-20250807-0001', NULL, NULL, 'status', NULL, NULL, 'approve submission', '2025-08-16 11:28:55'),
(92, 8, 'reject', 'submission', 25, 'PR-20250807-0001', NULL, NULL, 'status', NULL, NULL, 'reject submission', '2025-08-16 11:29:04'),
(93, 8, 'update', 'submission', 25, 'PR-20250807-0001', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-08-16 11:29:09'),
(94, 8, 'update', 'submission', 25, 'PR-20250807-0001', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-08-16 11:29:15'),
(95, 8, 'update', 'submission', 25, 'PR-20250807-0001', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-08-16 11:29:38'),
(96, 8, 'reject', 'submission', 37, 'PR-20250807-0013', NULL, NULL, 'status', NULL, NULL, 'reject submission', '2025-08-18 18:05:41'),
(97, 7, 'reject', 'submission', 37, 'PR-20250807-0013', NULL, NULL, NULL, '58.11.83.106', NULL, 'asd', '2025-08-18 18:05:41'),
(98, 7, 'approve', 'submission', 35, 'PR-20250807-0011', NULL, NULL, 'status', NULL, NULL, 'approve submission', '2025-08-18 18:13:00'),
(99, 7, 'approve', 'submission', 35, 'PR-20250807-0011', NULL, NULL, NULL, '58.11.83.106', NULL, '', '2025-08-18 18:13:00'),
(100, 8, 'reject', 'submission', 36, 'PR-20250807-0012', NULL, NULL, 'status', NULL, NULL, 'reject submission', '2025-08-18 18:14:30'),
(101, 7, 'reject', 'submission', 36, 'PR-20250807-0012', NULL, NULL, NULL, '58.11.83.106', NULL, 'awwww', '2025-08-18 18:14:30'),
(102, 7, 'approve', 'submission', 34, 'PR-20250807-0010', NULL, NULL, 'status', NULL, NULL, 'approve submission', '2025-08-18 22:17:00'),
(103, 7, 'approve', 'submission', 34, 'PR-20250807-0010', NULL, NULL, NULL, '58.11.83.106', NULL, '', '2025-08-18 22:17:00'),
(104, 8, 'submit', 'submission', 27, 'PR-20250807-0003', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-08-19 11:35:46'),
(105, 8, 'submit', 'submission', 28, 'PR-20250807-0004', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-08-19 11:35:52'),
(106, 8, 'submit', 'submission', 30, 'PR-20250807-0006', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-08-19 11:35:54'),
(107, 8, 'create', 'submission', 38, 'PR-20250819-0001', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-08-19 18:02:45'),
(108, 8, 'create', 'submission', 39, 'PR-20250819-0002', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-08-19 21:38:18'),
(109, 8, 'create', 'submission', 40, 'PR-20250820-0001', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-08-20 01:33:59'),
(110, 8, 'create', 'submission', 41, 'PR-20250820-0002', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-08-20 01:45:00'),
(111, 8, 'create', 'submission', 42, 'PR-20250820-0003', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-08-20 14:16:13'),
(112, 8, 'create', 'submission', 43, 'PR-20250822-0001', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-08-22 03:18:56'),
(113, 8, 'create', 'submission', 44, 'PR-20250822-0002', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-08-22 04:15:27'),
(114, 8, 'create', 'submission', 45, 'PR-20250822-0003', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-08-22 09:33:24'),
(115, 8, 'submit', 'submission', 45, 'PR-20250822-0003', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-08-22 09:34:39'),
(116, 8, 'create', 'submission', 46, 'PR-20250822-0004', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-08-22 09:54:13'),
(117, 8, 'submit', 'submission', 46, 'PR-20250822-0004', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-08-22 09:54:14'),
(118, 8, 'reject', 'submission', 46, 'PR-20250822-0004', NULL, NULL, 'status', NULL, NULL, 'reject submission', '2025-08-22 11:19:48'),
(119, 7, 'reject', 'submission', 46, 'PR-20250822-0004', NULL, NULL, NULL, '58.10.155.36', NULL, 'ไม่ให้', '2025-08-22 11:19:48'),
(120, 7, 'approve', 'submission', 45, 'PR-20250822-0003', NULL, NULL, 'status', NULL, NULL, 'approve submission', '2025-08-22 13:28:49'),
(121, 7, 'approve', 'submission', 45, 'PR-20250822-0003', NULL, NULL, NULL, '58.10.155.36', NULL, 'This is Approval Comment.\n', '2025-08-22 13:28:49'),
(122, 8, 'create', 'submission', 47, 'PR-20250822-0005', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-08-22 16:40:11'),
(123, 8, 'submit', 'submission', 47, 'PR-20250822-0005', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-08-22 16:40:11'),
(124, 8, 'create', 'submission', 48, 'PR-20250823-0001', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-08-23 07:27:47'),
(125, 8, 'submit', 'submission', 48, 'PR-20250823-0001', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-08-23 07:27:48'),
(126, 8, 'create', 'submission', 49, '', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-08-27 12:08:25'),
(127, 8, 'create', 'submission', 51, 'PR-20250827-0001', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-08-27 14:48:22'),
(128, 8, 'submit', 'submission', 51, 'PR-20250827-0001', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-08-27 14:48:23'),
(129, 8, 'create', 'submission', 52, 'PR-20250827-0002', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-08-27 18:32:12'),
(130, 8, 'submit', 'submission', 52, 'PR-20250827-0002', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-08-27 18:32:13'),
(131, 8, 'create', 'submission', 53, 'PR-20250827-0003', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-08-27 21:08:29'),
(132, 8, 'submit', 'submission', 53, 'PR-20250827-0003', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-08-27 21:08:29'),
(133, 8, 'approve', 'submission', 51, 'PR-20250827-0001', NULL, NULL, 'status', NULL, NULL, 'approve submission', '2025-08-28 12:49:54'),
(134, 7, 'approve', 'submission', 53, 'PR-20250827-0003', NULL, NULL, 'status', NULL, NULL, 'approve submission', '2025-08-29 15:04:17'),
(135, 7, 'approve', 'submission', 53, 'PR-20250827-0003', NULL, NULL, NULL, '58.10.141.247', NULL, '', '2025-08-29 15:04:17'),
(136, 8, 'update', 'submission', 53, 'PR-20250827-0003', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-08-29 15:05:12'),
(137, 8, 'reject', 'submission', 53, 'PR-20250827-0003', NULL, NULL, 'status', NULL, NULL, 'reject submission', '2025-08-29 15:55:50'),
(138, 7, 'reject', 'submission', 53, 'PR-20250827-0003', NULL, NULL, NULL, '58.10.141.247', NULL, 'ส่งคำร้องและแนบไฟล์มาใหม่', '2025-08-29 15:55:50'),
(139, 7, 'approve', 'submission', 52, 'PR-20250827-0002', NULL, NULL, 'status', NULL, NULL, 'approve submission', '2025-08-29 16:09:33'),
(140, 7, 'approve', 'submission', 52, 'PR-20250827-0002', NULL, NULL, NULL, '58.10.141.247', NULL, '', '2025-08-29 16:09:33'),
(141, 8, 'create', 'submission', 54, 'FA-20250829-0001', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-08-29 16:53:37'),
(142, 8, 'create', 'submission', 55, 'FA-20250829-0002', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-08-29 16:59:35'),
(143, 8, 'create', 'submission', 56, 'FA-20250829-0003', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-08-29 17:00:39'),
(144, 8, 'create', 'submission', 57, 'FA-20250829-0004', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-08-29 17:08:16'),
(145, 8, 'create', 'submission', 58, 'FA-20250829-0005', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-08-29 20:52:06'),
(146, 8, 'create', 'submission', 59, 'FA-20250829-0006', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-08-29 21:11:30'),
(147, 8, 'create', 'submission', 60, 'FA-20250829-0007', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-08-29 21:12:50'),
(148, 8, 'create', 'submission', 61, 'FA-20250829-0008', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-08-29 21:31:50'),
(149, 8, 'update', 'submission', 53, 'PR-20250827-0003', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-08-31 08:09:15'),
(150, 8, 'create', 'submission', 62, 'FA-20250901-0001', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-09-01 12:04:10'),
(151, 8, 'submit', 'submission', 62, 'FA-20250901-0001', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-01 12:04:10'),
(152, 8, 'create', 'submission', 63, 'FA-20250901-0002', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-09-01 12:32:10'),
(153, 8, 'submit', 'submission', 63, 'FA-20250901-0002', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-01 12:32:10'),
(154, 8, 'create', 'submission', 64, 'FA-20250901-0003', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-09-01 13:03:42'),
(155, 8, 'submit', 'submission', 64, 'FA-20250901-0003', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-01 13:03:42'),
(156, 8, 'create', 'submission', 65, 'FA-20250901-0004', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-09-01 13:10:10'),
(157, 8, 'submit', 'submission', 65, 'FA-20250901-0004', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-01 13:10:10'),
(158, 8, 'create', 'submission', 66, 'FA-20250902-0001', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-09-02 12:13:53'),
(159, 8, 'submit', 'submission', 66, 'FA-20250902-0001', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-02 12:13:53'),
(160, 7, 'approve', 'submission', 53, 'PR-20250827-0003', NULL, NULL, 'status', NULL, NULL, 'approve submission', '2025-09-03 08:48:13'),
(161, 7, 'approve', 'submission', 53, 'PR-20250827-0003', NULL, NULL, NULL, '58.10.129.204', NULL, '', '2025-09-03 08:48:13'),
(162, 8, 'create', 'submission', 67, 'FA-20250903-0001', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-09-03 12:49:45'),
(163, 8, 'submit', 'submission', 67, 'FA-20250903-0001', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-03 12:49:45'),
(164, 8, 'create', 'submission', 68, 'FA-20250903-0002', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-09-03 13:13:43'),
(165, 8, 'submit', 'submission', 68, 'FA-20250903-0002', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-03 13:13:43'),
(166, 8, 'update', 'submission', 51, 'PR-20250827-0001', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-09-03 17:32:44'),
(167, 7, 'approve', 'submission', 51, 'PR-20250827-0001', NULL, NULL, 'status', NULL, NULL, 'approve submission', '2025-09-03 17:34:00'),
(168, 7, 'update', 'submission', 51, 'PR-20250827-0001', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-09-04 15:55:46'),
(169, 7, 'approve', 'submission', 51, 'PR-20250827-0001', NULL, NULL, 'status', NULL, NULL, 'approve submission', '2025-09-04 17:19:01'),
(170, 7, 'update', 'submission', 51, 'PR-20250827-0001', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-09-04 17:19:23'),
(171, 8, 'create', 'submission', 69, 'FA-20250904-0001', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-09-04 18:14:38'),
(172, 8, 'submit', 'submission', 69, 'FA-20250904-0001', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-04 18:14:38'),
(173, 8, 'create', 'submission', 70, 'FA-20250904-0002', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-09-04 18:15:21'),
(174, 8, 'submit', 'submission', 70, 'FA-20250904-0002', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-04 18:15:21'),
(175, 8, 'approve', 'submission', 70, 'FA-20250904-0002', NULL, NULL, 'status', NULL, NULL, 'approve submission', '2025-09-06 13:11:30'),
(176, 8, 'create', 'submission', 71, 'PR-20250907-0001', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-09-07 07:50:53'),
(177, 8, 'submit', 'submission', 71, 'PR-20250907-0001', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-07 07:50:53'),
(178, 8, 'create', 'submission', 72, 'FA-20250909-0001', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-09-09 10:58:06'),
(179, 8, 'submit', 'submission', 72, 'FA-20250909-0001', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-09 10:58:06'),
(180, 8, 'create', 'submission', 73, 'FA-20250909-0002', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-09-09 11:37:22'),
(181, 8, 'submit', 'submission', 73, 'FA-20250909-0002', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-09 11:37:22'),
(182, 8, 'create', 'submission', 74, 'PR-20250912-0001', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-09-12 09:15:01'),
(183, 8, 'submit', 'submission', 74, 'PR-20250912-0001', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-12 09:15:01'),
(184, 8, 'create', 'submission', 75, 'PR-20250912-0002', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-09-12 11:27:59'),
(185, 8, 'submit', 'submission', 75, 'PR-20250912-0002', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-12 11:27:59'),
(186, 8, 'create', 'submission', 76, 'PR-20250912-0003', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-09-12 12:21:26'),
(187, 8, 'submit', 'submission', 76, 'PR-20250912-0003', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-12 12:21:27'),
(188, 8, 'create', 'submission', 77, 'PR-20250912-0004', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-09-12 12:40:28'),
(189, 8, 'submit', 'submission', 77, 'PR-20250912-0004', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-12 12:40:28'),
(190, 8, 'create', 'submission', 78, 'PR-20250912-0005', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-09-12 13:02:07'),
(191, 8, 'submit', 'submission', 78, 'PR-20250912-0005', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-12 13:02:07'),
(192, 8, 'create', 'submission', 79, 'PR-20250912-0006', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-09-12 13:20:43'),
(193, 8, 'submit', 'submission', 79, 'PR-20250912-0006', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-12 13:20:43'),
(194, 8, 'create', 'submission', 80, 'PR-20250912-0007', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-09-12 13:42:50'),
(195, 8, 'submit', 'submission', 80, 'PR-20250912-0007', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-12 13:42:50'),
(196, 8, 'create', 'submission', 81, 'PR-20250912-0008', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-09-12 14:25:55'),
(197, 8, 'submit', 'submission', 81, 'PR-20250912-0008', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-12 14:25:55'),
(198, 8, 'create', 'submission', 82, 'PR-20250913-0001', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-09-13 03:11:08'),
(199, 8, 'submit', 'submission', 82, 'PR-20250913-0001', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-13 03:11:08'),
(200, 8, 'create', 'submission', 83, 'FA-25680913-0013', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-09-13 15:09:12'),
(201, 8, 'submit', 'submission', 83, 'FA-25680913-0013', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-13 15:09:12'),
(202, 7, 'approve', 'submission', 82, 'PR-20250913-0001', NULL, NULL, 'status', NULL, NULL, 'approve submission', '2025-09-13 16:00:42'),
(203, 7, 'approve', 'submission', 81, 'PR-20250912-0008', NULL, NULL, 'status', NULL, NULL, 'approve submission', '2025-09-13 16:03:33'),
(204, 7, 'update', 'submission', 81, 'PR-20250912-0008', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-09-13 16:04:17'),
(205, 7, 'update', 'submission', 82, 'PR-20250913-0001', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-09-13 16:04:20'),
(206, 7, 'approve', 'submission', 81, 'PR-20250912-0008', NULL, NULL, 'status', NULL, NULL, 'approve submission', '2025-09-13 16:04:48'),
(207, 7, 'reject', 'submission', 82, 'PR-20250913-0001', NULL, NULL, 'status', NULL, NULL, 'reject submission', '2025-09-13 17:03:58'),
(208, 7, 'reject', 'submission', 82, 'PR-20250913-0001', NULL, NULL, NULL, '58.10.141.29', NULL, 'nono', '2025-09-13 17:03:58'),
(209, 7, 'update', 'submission', 82, 'PR-20250913-0001', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-09-13 17:05:16'),
(210, 7, 'approve', 'submission', 82, 'PR-20250913-0001', NULL, NULL, 'status', NULL, NULL, 'approve submission', '2025-09-13 17:15:15'),
(211, 7, 'reject', 'submission', 51, 'PR-20250827-0001', NULL, NULL, 'status', NULL, NULL, 'reject submission', '2025-09-14 02:21:06'),
(212, 7, 'reject', 'submission', 51, 'PR-20250827-0001', NULL, NULL, NULL, '58.10.141.29', NULL, 'เอกสารยังไม่ครบ', '2025-09-14 02:21:06'),
(213, 8, 'create', 'submission', 84, 'FA-25680914-0002', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-09-14 08:00:36'),
(214, 8, 'submit', 'submission', 84, 'FA-25680914-0002', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-14 08:00:36'),
(215, 7, 'update', 'submission', 82, 'PR-20250913-0001', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-09-14 08:19:17'),
(216, 8, 'create', 'submission', 85, 'PR-25680915-0001', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-09-15 07:23:17'),
(217, 8, 'create', 'submission', 86, 'PR-25680915-0002', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-09-15 07:23:46'),
(218, 8, 'create', 'submission', 87, 'PR-25680915-0003', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-09-15 07:36:39'),
(219, 8, 'submit', 'submission', 87, 'PR-25680915-0003', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-15 07:36:39'),
(220, 8, 'create', 'submission', 88, 'PR-25680915-0004', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-09-15 07:38:57'),
(221, 8, 'submit', 'submission', 88, 'PR-25680915-0004', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-15 07:38:57'),
(222, 8, 'create', 'submission', 89, 'PR-25680917-0005', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-09-17 09:21:06'),
(223, 8, 'submit', 'submission', 89, 'PR-25680917-0005', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-17 09:21:06'),
(224, 8, 'create', 'submission', 90, 'PR-25680917-0006', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-09-17 09:38:06'),
(225, 8, 'submit', 'submission', 90, 'PR-25680917-0006', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-17 09:38:06'),
(226, 8, 'create', 'submission', 91, 'PR-25680917-0007', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-09-17 10:21:31'),
(227, 8, 'submit', 'submission', 91, 'PR-25680917-0007', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-17 10:21:31'),
(228, 8, 'create', 'submission', 92, 'PR-25680917-0008', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-09-17 10:30:44'),
(229, 8, 'submit', 'submission', 92, 'PR-25680917-0008', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-17 10:30:45'),
(230, 8, 'create', 'submission', 93, 'PR-25680917-0009', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-09-17 10:47:20'),
(231, 8, 'submit', 'submission', 93, 'PR-25680917-0009', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-17 10:47:21'),
(232, 8, 'create', 'submission', 94, 'PR-25680917-0010', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-09-17 10:48:36'),
(233, 8, 'submit', 'submission', 94, 'PR-25680917-0010', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-17 10:48:36'),
(234, 8, 'create', 'submission', 95, 'PR-25680917-0011', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-09-17 10:50:54'),
(235, 8, 'submit', 'submission', 95, 'PR-25680917-0011', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-17 10:50:54'),
(236, 8, 'create', 'submission', 96, 'PR-25680917-0012', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-09-17 10:52:06'),
(237, 8, 'submit', 'submission', 96, 'PR-25680917-0012', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-17 10:52:06'),
(238, 8, 'create', 'submission', 97, 'PR-25680917-0013', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-09-17 11:16:56'),
(239, 8, 'submit', 'submission', 97, 'PR-25680917-0013', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-17 11:16:56'),
(240, 8, 'create', 'submission', 98, 'PR-25680917-0014', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-09-17 11:18:07'),
(241, 8, 'submit', 'submission', 98, 'PR-25680917-0014', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-17 11:18:07'),
(242, 7, 'approve', 'submission', 98, 'PR-25680917-0014', NULL, NULL, 'status', NULL, NULL, 'approve submission', '2025-09-20 08:33:12'),
(243, 7, 'approve', 'submission', 97, 'PR-25680917-0013', NULL, NULL, 'status', NULL, NULL, 'approve submission', '2025-09-20 16:25:07'),
(244, 8, 'create', 'submission', 99, 'PR-25680920-0015', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-09-20 16:35:39'),
(245, 8, 'submit', 'submission', 99, 'PR-25680920-0015', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-20 16:35:40'),
(246, 7, 'approve', 'submission', 99, 'PR-25680920-0015', NULL, NULL, 'status', NULL, NULL, 'approve submission', '2025-09-20 17:17:33'),
(247, 13, 'create', 'submission', 100, 'PR-25680922-0016', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-09-22 13:43:37'),
(248, 13, 'submit', 'submission', 100, 'PR-25680922-0016', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-22 13:43:38'),
(249, 8, 'create', 'submission', 101, 'PR-25680922-0017', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-09-22 16:11:53'),
(250, 8, 'submit', 'submission', 101, 'PR-25680922-0017', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-22 16:11:53'),
(251, 8, 'create', 'submission', 102, 'PR-25680922-0018', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-09-22 16:51:50'),
(252, 8, 'submit', 'submission', 102, 'PR-25680922-0018', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-22 16:51:50'),
(253, 8, 'create', 'submission', 103, 'FA-25680923-0003', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-09-23 12:43:25'),
(254, 8, 'submit', 'submission', 103, 'FA-25680923-0003', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-23 12:43:25'),
(255, 8, 'create', 'submission', 104, 'PR-25680923-0019', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-09-23 12:48:24'),
(256, 8, 'submit', 'submission', 104, 'PR-25680923-0019', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-23 12:48:24'),
(257, 8, 'create', 'submission', 105, 'PR-25680923-0020', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-09-23 13:50:59'),
(258, 8, 'submit', 'submission', 105, 'PR-25680923-0020', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-23 13:50:59'),
(259, 8, 'create', 'submission', 106, 'PR-25680923-0021', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-09-23 15:04:19'),
(260, 8, 'submit', 'submission', 106, 'PR-25680923-0021', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-23 15:05:04'),
(261, 8, 'create', 'submission', 107, 'PR-25680923-0022', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-09-23 15:06:29'),
(262, 8, 'submit', 'submission', 107, 'PR-25680923-0022', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-23 15:06:30'),
(263, 8, 'create', 'submission', 108, 'PR-25680923-0023', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-09-23 15:29:14'),
(264, 8, 'submit', 'submission', 108, 'PR-25680923-0023', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-23 15:29:14'),
(265, 8, 'create', 'submission', 109, 'PR-25680923-0024', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-09-23 16:20:14'),
(266, 8, 'submit', 'submission', 109, 'PR-25680923-0024', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-23 16:20:14'),
(267, 8, 'create', 'submission', 110, 'PR-25680923-0025', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-09-23 16:25:33'),
(268, 8, 'submit', 'submission', 110, 'PR-25680923-0025', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-09-23 16:25:34'),
(269, 8, 'create', 'submission', 111, 'PR-25680924-0026', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-09-24 11:58:49'),
(270, 8, 'submit', 'submission', 111, 'PR-25680924-0026', NULL, NULL, 'status', NULL, NULL, 'submit submission', '2025-09-24 11:58:50'),
(271, 8, 'submit', 'submission', 111, 'PR-25680924-0026', NULL, '{\"action\":\"submit\",\"new_status_id\":6}', NULL, '58.10.72.179', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', 'Submission sent to department review', '2025-09-24 11:58:50');

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
(15, 'CV ผู้วิจัย', 'researcher_cv', 'general', 0, 0, 0, NULL, '2025-08-29 13:31:42', '2025-08-29 13:31:42', NULL, '[\"fund_application\"]', NULL);

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
(46, 'pdf-sample_0.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub24_2025-08-05/pdf-sample_0_1.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-05 22:46:59', '2025-08-05 22:46:59', '2025-08-05 22:46:59', NULL),
(47, 'pdf-sample_1.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub25_2025-08-07/pdf-sample_1.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-07 01:19:18', '2025-08-07 01:19:18', '2025-08-07 01:19:18', NULL),
(48, 'pdf-sample_2.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub25_2025-08-07/pdf-sample_2.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-07 01:19:18', '2025-08-07 01:19:18', '2025-08-07 01:19:18', NULL),
(49, 'pdf-sample_0.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub25_2025-08-07/pdf-sample_0.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-07 01:19:18', '2025-08-07 01:19:18', '2025-08-07 01:19:18', NULL),
(50, 'pdf-sample_0.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub25_2025-08-07/pdf-sample_0_1.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-07 01:19:18', '2025-08-07 01:19:18', '2025-08-07 01:19:18', NULL),
(51, 'pdf-sample_0.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub26_2025-08-07/pdf-sample_0.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-07 02:34:34', '2025-08-07 02:34:34', '2025-08-07 02:34:34', NULL),
(52, 'pdf-sample_3.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub26_2025-08-07/pdf-sample_3.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-07 02:34:34', '2025-08-07 02:34:34', '2025-08-07 02:34:34', NULL),
(53, 'pdf-sample_0.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub29_2025-08-07/pdf-sample_0.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-07 03:28:42', '2025-08-07 03:28:42', '2025-08-07 03:28:42', NULL),
(54, 'pdf-sample_1.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub29_2025-08-07/pdf-sample_1.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-07 03:28:42', '2025-08-07 03:28:42', '2025-08-07 03:28:42', NULL),
(55, 'merged_documents.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub29_2025-08-07/merged_documents.pdf', 'temp', NULL, 23937, 'application/pdf', '', 0, 8, '2025-08-07 03:28:43', '2025-08-07 03:28:43', '2025-08-07 03:28:43', NULL),
(56, 'pdf-sample_0.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub31_2025-08-07/pdf-sample_0.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-07 06:11:59', '2025-08-07 06:11:59', '2025-08-07 06:11:59', NULL),
(57, 'pdf-sample_1.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub31_2025-08-07/pdf-sample_1.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-07 06:11:59', '2025-08-07 06:11:59', '2025-08-07 06:11:59', NULL),
(58, 'pdf-sample_0.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub32_2025-08-07/pdf-sample_0.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-07 13:34:30', '2025-08-07 13:34:30', '2025-08-07 13:34:30', NULL),
(59, 'pdf-sample_3.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub32_2025-08-07/pdf-sample_3.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-07 13:34:30', '2025-08-07 13:34:30', '2025-08-07 13:34:30', NULL),
(60, 'pdf-sample_2.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub33_2025-08-07/pdf-sample_2.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-07 13:38:22', '2025-08-07 13:38:22', '2025-08-07 13:38:22', NULL),
(61, 'pdf-sample_0.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub33_2025-08-07/pdf-sample_0.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-07 13:38:22', '2025-08-07 13:38:22', '2025-08-07 13:38:22', NULL),
(62, 'pdf-sample_1.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub34_2025-08-07/pdf-sample_1.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-07 13:41:31', '2025-08-07 13:41:31', '2025-08-07 13:41:31', NULL),
(63, 'pdf-sample_0.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub34_2025-08-07/pdf-sample_0.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-07 13:41:31', '2025-08-07 13:41:31', '2025-08-07 13:41:31', NULL),
(64, 'pdf-sample_0.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub35_2025-08-07/pdf-sample_0.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-07 13:53:27', '2025-08-07 13:53:27', '2025-08-07 13:53:27', NULL),
(65, 'pdf-sample_3.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub35_2025-08-07/pdf-sample_3.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-07 13:53:27', '2025-08-07 13:53:27', '2025-08-07 13:53:27', NULL),
(66, 'pdf-sample_3.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub36_2025-08-07/pdf-sample_3.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-07 13:58:00', '2025-08-07 13:58:00', '2025-08-07 13:58:00', NULL),
(67, 'pdf-sample_0.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub36_2025-08-07/pdf-sample_0.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-07 13:58:00', '2025-08-07 13:58:00', '2025-08-07 13:58:00', NULL),
(68, 'pdf-sample_1.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub36_2025-08-07/pdf-sample_1.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-07 13:58:00', '2025-08-07 13:58:00', '2025-08-07 13:58:00', NULL),
(69, 'pdf-sample_1.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub36_2025-08-07/pdf-sample_1_1.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-07 13:58:00', '2025-08-07 13:58:00', '2025-08-07 13:58:00', NULL),
(70, 'pdf-sample_0.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub37_2025-08-07/pdf-sample_0.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-07 14:01:47', '2025-08-07 14:01:47', '2025-08-07 14:01:47', NULL),
(71, 'pdf-sample_1.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub37_2025-08-07/pdf-sample_1.pdf', 'temp', NULL, 13264, 'application/pdf', '', 0, 8, '2025-08-07 14:01:47', '2025-08-07 14:01:47', '2025-08-07 14:01:47', NULL),
(72, 'form.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub45_2025-08-22/form.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-08-22 09:34:39', '2025-08-22 09:34:39', '2025-08-22 09:34:39', NULL),
(73, 'form.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub45_2025-08-22/form_1.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-08-22 09:34:39', '2025-08-22 09:34:39', '2025-08-22 09:34:39', NULL),
(74, 'form.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub45_2025-08-22/form_2.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-08-22 09:34:39', '2025-08-22 09:34:39', '2025-08-22 09:34:39', NULL),
(75, 'form.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub45_2025-08-22/form_3.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-08-22 09:34:39', '2025-08-22 09:34:39', '2025-08-22 09:34:39', NULL),
(76, 'merged_documents.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub45_2025-08-22/merged_documents.pdf', 'temp', NULL, 2307, 'application/pdf', '', 0, 8, '2025-08-22 09:34:39', '2025-08-22 09:34:39', '2025-08-22 09:34:39', NULL),
(77, 'form.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub46_2025-08-22/form.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-08-22 09:54:13', '2025-08-22 09:54:13', '2025-08-22 09:54:13', NULL),
(78, 'form.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub46_2025-08-22/form_1.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-08-22 09:54:13', '2025-08-22 09:54:13', '2025-08-22 09:54:13', NULL),
(79, 'form.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub47_2025-08-22/form.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-08-22 16:40:11', '2025-08-22 16:40:11', '2025-08-22 16:40:11', NULL),
(80, 'file-sample_150kB.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub48_2025-08-23/file-sample_150kB.pdf', 'temp', NULL, 142786, 'application/pdf', '', 0, 8, '2025-08-23 07:27:47', '2025-08-23 07:27:47', '2025-08-23 07:27:47', NULL),
(81, 'sample.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub48_2025-08-23/sample.pdf', 'temp', NULL, 18810, 'application/pdf', '', 0, 8, '2025-08-23 07:27:47', '2025-08-23 07:27:47', '2025-08-23 07:27:47', NULL),
(82, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub48_2025-08-23/sample-local-pdf.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-08-23 07:27:47', '2025-08-23 07:27:47', '2025-08-23 07:27:47', NULL),
(83, 'c4611_sample_explain.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub48_2025-08-23/c4611_sample_explain.pdf', 'temp', NULL, 88226, 'application/pdf', '', 0, 8, '2025-08-23 07:27:47', '2025-08-23 07:27:47', '2025-08-23 07:27:47', NULL),
(84, 'file-example_PDF_500_kB.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub48_2025-08-23/file-example_PDF_500_kB.pdf', 'temp', NULL, 469513, 'application/pdf', '', 0, 8, '2025-08-23 07:27:47', '2025-08-23 07:27:47', '2025-08-23 07:27:47', NULL),
(85, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub51_2025-08-27/sample-local-pdf.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-08-27 14:48:23', '2025-08-27 14:48:23', '2025-08-27 14:48:23', NULL),
(86, 'sample.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub51_2025-08-27/sample.pdf', 'temp', NULL, 18810, 'application/pdf', '', 0, 8, '2025-08-27 14:48:23', '2025-08-27 14:48:23', '2025-08-27 14:48:23', NULL),
(87, 'sample.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub52_2025-08-27/sample.pdf', 'temp', NULL, 18810, 'application/pdf', '', 0, 8, '2025-08-27 18:32:12', '2025-08-27 18:32:12', '2025-08-27 18:32:12', NULL),
(88, 'file-sample_150kB.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub52_2025-08-27/file-sample_150kB.pdf', 'temp', NULL, 142786, 'application/pdf', '', 0, 8, '2025-08-27 18:32:12', '2025-08-27 18:32:12', '2025-08-27 18:32:12', NULL),
(89, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub52_2025-08-27/sample-local-pdf.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-08-27 18:32:12', '2025-08-27 18:32:12', '2025-08-27 18:32:12', NULL),
(90, 'sample.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub53_2025-08-27/sample.pdf', 'temp', NULL, 18810, 'application/pdf', '', 0, 8, '2025-08-27 21:08:29', '2025-08-27 21:08:29', '2025-08-27 21:08:29', NULL),
(91, 'file-sample_150kB.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub53_2025-08-27/file-sample_150kB.pdf', 'temp', NULL, 142786, 'application/pdf', '', 0, 8, '2025-08-27 21:08:29', '2025-08-27 21:08:29', '2025-08-27 21:08:29', NULL),
(92, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub53_2025-08-27/sample-local-pdf.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-08-27 21:08:29', '2025-08-27 21:08:29', '2025-08-27 21:08:29', NULL),
(93, 'form.pdf', 'uploads/users/user_8_สมชาย_ใจด/temp/form.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-09-01 12:04:10', '2025-09-01 12:04:10', '2025-09-01 12:04:10', NULL),
(94, 'form.pdf', 'uploads/users/user_8_สมชาย_ใจด/temp/form_1.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-09-01 12:04:10', '2025-09-01 12:04:10', '2025-09-01 12:04:10', NULL),
(95, 'form.pdf', 'uploads/users/user_8_สมชาย_ใจด/temp/form_2.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-09-01 12:04:10', '2025-09-01 12:04:10', '2025-09-01 12:04:10', NULL),
(96, 'form.pdf', 'uploads/users/user_8_สมชาย_ใจด/temp/form_3.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-09-01 12:04:10', '2025-09-01 12:04:10', '2025-09-01 12:04:10', NULL),
(97, 'form.pdf', 'uploads/users/user_8_สมชาย_ใจด/temp/form_6.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-09-01 12:32:10', '2025-09-01 12:32:10', '2025-09-01 12:32:10', NULL),
(98, 'form.pdf', 'uploads/users/user_8_สมชาย_ใจด/temp/form_5.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-09-01 12:32:10', '2025-09-01 12:32:10', '2025-09-01 12:32:10', NULL),
(99, 'form.pdf', 'uploads/users/user_8_สมชาย_ใจด/temp/form_4.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-09-01 12:32:10', '2025-09-01 12:32:10', '2025-09-01 12:32:10', NULL),
(100, 'form.pdf', 'uploads/users/user_8_สมชาย_ใจด/temp/form_7.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-09-01 12:32:10', '2025-09-01 12:32:10', '2025-09-01 12:32:10', NULL),
(101, 'form.pdf', 'uploads/users/user_8_สมชาย_ใจด/temp/form_9.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-09-01 13:03:42', '2025-09-01 13:03:42', '2025-09-01 13:03:42', NULL),
(102, 'form.pdf', 'uploads/users/user_8_สมชาย_ใจด/temp/form_8.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-09-01 13:03:42', '2025-09-01 13:03:42', '2025-09-01 13:03:42', NULL),
(103, 'form.pdf', 'uploads/users/user_8_สมชาย_ใจด/temp/form_10.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-09-01 13:03:42', '2025-09-01 13:03:42', '2025-09-01 13:03:42', NULL),
(104, 'form.pdf', 'uploads/users/user_8_สมชาย_ใจด/temp/form_11.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-09-01 13:03:42', '2025-09-01 13:03:42', '2025-09-01 13:03:42', NULL),
(105, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/temp/sample-local-pdf_1.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-01 13:10:10', '2025-09-01 13:10:10', '2025-09-01 13:10:10', NULL),
(106, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/temp/sample-local-pdf_3.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-01 13:10:10', '2025-09-01 13:10:10', '2025-09-01 13:10:10', NULL),
(107, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/temp/sample-local-pdf_2.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-01 13:10:10', '2025-09-01 13:10:10', '2025-09-01 13:10:10', NULL),
(108, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/temp/sample-local-pdf.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-01 13:10:10', '2025-09-01 13:10:10', '2025-09-01 13:10:10', NULL),
(109, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/temp/sample-local-pdf_4.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-02 12:13:53', '2025-09-02 12:13:53', '2025-09-02 12:13:53', NULL),
(110, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/temp/sample-local-pdf_6.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-02 12:13:53', '2025-09-02 12:13:53', '2025-09-02 12:13:53', NULL),
(111, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/temp/sample-local-pdf_5.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-02 12:13:53', '2025-09-02 12:13:53', '2025-09-02 12:13:53', NULL),
(112, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/temp/sample-local-pdf_7.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-02 12:13:53', '2025-09-02 12:13:53', '2025-09-02 12:13:53', NULL),
(113, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/temp/sample-local-pdf_8.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-03 12:49:45', '2025-09-03 12:49:45', '2025-09-03 12:49:45', NULL),
(114, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/temp/sample-local-pdf_9.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-03 12:49:45', '2025-09-03 12:49:45', '2025-09-03 12:49:45', NULL),
(115, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/temp/sample-local-pdf_10.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-03 12:49:45', '2025-09-03 12:49:45', '2025-09-03 12:49:45', NULL),
(116, 'form.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund68_2025-09-03/form.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-09-03 13:13:43', '2025-09-03 13:13:43', '2025-09-03 13:13:43', NULL),
(117, 'form.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund68_2025-09-03/form_1.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-09-03 13:13:43', '2025-09-03 13:13:43', '2025-09-03 13:13:43', NULL),
(118, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund68_2025-09-03/sample-local-pdf_1.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-03 13:13:43', '2025-09-03 13:13:43', '2025-09-03 13:13:43', NULL),
(119, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund68_2025-09-03/sample-local-pdf.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-03 13:13:43', '2025-09-03 13:13:43', '2025-09-03 13:13:43', NULL),
(120, 'form.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund69_2025-09-04/form_1.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-09-04 18:14:38', '2025-09-04 18:14:38', '2025-09-04 18:14:38', NULL),
(121, 'form.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund69_2025-09-04/form.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-09-04 18:14:38', '2025-09-04 18:14:38', '2025-09-04 18:14:38', NULL),
(122, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund69_2025-09-04/sample-local-pdf_1.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-04 18:14:38', '2025-09-04 18:14:38', '2025-09-04 18:14:38', NULL),
(123, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund69_2025-09-04/sample-local-pdf_2.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-04 18:14:38', '2025-09-04 18:14:38', '2025-09-04 18:14:38', NULL),
(124, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund69_2025-09-04/sample-local-pdf.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-04 18:14:38', '2025-09-04 18:14:38', '2025-09-04 18:14:38', NULL),
(125, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund70_2025-09-04/sample-local-pdf.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-04 18:15:21', '2025-09-04 18:15:21', '2025-09-04 18:15:21', NULL),
(126, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund70_2025-09-04/sample-local-pdf_1.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-04 18:15:21', '2025-09-04 18:15:21', '2025-09-04 18:15:21', NULL),
(127, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund70_2025-09-04/sample-local-pdf_2.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-04 18:15:21', '2025-09-04 18:15:21', '2025-09-04 18:15:21', NULL),
(128, 'sample.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub71_2025-09-07/sample.pdf', 'temp', NULL, 18810, 'application/pdf', '', 0, 8, '2025-09-07 07:50:53', '2025-09-07 07:50:53', '2025-09-07 07:50:53', NULL),
(129, 'file-sample_150kB.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub71_2025-09-07/file-sample_150kB.pdf', 'temp', NULL, 142786, 'application/pdf', '', 0, 8, '2025-09-07 07:50:53', '2025-09-07 07:50:53', '2025-09-07 07:50:53', NULL),
(130, 'c4611_sample_explain.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub71_2025-09-07/c4611_sample_explain.pdf', 'temp', NULL, 88226, 'application/pdf', '', 0, 8, '2025-09-07 07:50:53', '2025-09-07 07:50:53', '2025-09-07 07:50:53', NULL),
(131, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub71_2025-09-07/sample-local-pdf.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-07 07:50:53', '2025-09-07 07:50:53', '2025-09-07 07:50:53', NULL),
(132, 'merged_documents.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub71_2025-09-07/merged_documents.pdf', 'temp', NULL, 281086, 'application/pdf', '', 0, 8, '2025-09-07 07:50:53', '2025-09-07 07:50:53', '2025-09-07 07:50:53', NULL),
(133, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund72_2025-09-09/sample-local-pdf_1.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-09 10:58:06', '2025-09-09 10:58:06', '2025-09-09 10:58:06', NULL),
(134, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund72_2025-09-09/sample-local-pdf.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-09 10:58:06', '2025-09-09 10:58:06', '2025-09-09 10:58:06', NULL),
(135, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund72_2025-09-09/sample-local-pdf_2.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-09 10:58:06', '2025-09-09 10:58:06', '2025-09-09 10:58:06', NULL),
(136, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund72_2025-09-09/sample-local-pdf_3.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-09 10:58:06', '2025-09-09 10:58:06', '2025-09-09 10:58:06', NULL),
(137, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund72_2025-09-09/sample-local-pdf_2.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-09 10:58:06', '2025-09-09 10:58:06', '2025-09-09 10:58:06', NULL),
(138, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund73_2025-09-09/sample-local-pdf.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-09 11:37:22', '2025-09-09 11:37:22', '2025-09-09 11:37:22', NULL),
(139, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund73_2025-09-09/sample-local-pdf_1.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-09 11:37:22', '2025-09-09 11:37:22', '2025-09-09 11:37:22', NULL),
(140, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund73_2025-09-09/sample-local-pdf_3.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-09 11:37:22', '2025-09-09 11:37:22', '2025-09-09 11:37:22', NULL),
(141, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund73_2025-09-09/sample-local-pdf_2.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-09 11:37:22', '2025-09-09 11:37:22', '2025-09-09 11:37:22', NULL),
(142, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจราย/submissions/pub74_2025-09-12/sample-local-pdf.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-12 09:15:01', '2025-09-12 09:15:01', '2025-09-12 09:15:01', NULL),
(143, 'sample.pdf', 'uploads/users/user_8_สมชาย_ใจราย/submissions/pub74_2025-09-12/sample.pdf', 'temp', NULL, 18810, 'application/pdf', '', 0, 8, '2025-09-12 09:15:01', '2025-09-12 09:15:01', '2025-09-12 09:15:01', NULL),
(144, 'merged_documents.pdf', 'uploads/users/user_8_สมชาย_ใจราย/submissions/pub74_2025-09-12/merged_documents.pdf', 'temp', NULL, 15, 'application/pdf', '', 0, 8, '2025-09-12 09:15:01', '2025-09-12 09:15:01', '2025-09-12 09:15:01', NULL),
(145, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจราย/submissions/pub75_2025-09-12/sample-local-pdf.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-12 11:27:59', '2025-09-12 11:27:59', '2025-09-12 11:27:59', NULL),
(146, 'sample.pdf', 'uploads/users/user_8_สมชาย_ใจราย/submissions/pub75_2025-09-12/sample.pdf', 'temp', NULL, 18810, 'application/pdf', '', 0, 8, '2025-09-12 11:27:59', '2025-09-12 11:27:59', '2025-09-12 11:27:59', NULL),
(147, 'merged_documents.pdf', 'uploads/users/user_8_สมชาย_ใจราย/submissions/pub75_2025-09-12/merged_documents.pdf', 'temp', NULL, 15, 'application/pdf', '', 0, 8, '2025-09-12 11:27:59', '2025-09-12 11:27:59', '2025-09-12 11:27:59', NULL),
(148, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub76_2025-09-12/sample-local-pdf.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-12 12:21:26', '2025-09-12 12:21:26', '2025-09-12 12:21:26', NULL),
(149, 'sample.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub76_2025-09-12/sample.pdf', 'temp', NULL, 18810, 'application/pdf', '', 0, 8, '2025-09-12 12:21:26', '2025-09-12 12:21:26', '2025-09-12 12:21:26', NULL),
(150, 'merged_documents.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub76_2025-09-12/merged_documents.pdf', 'temp', NULL, 15, 'application/pdf', '', 0, 8, '2025-09-12 12:21:26', '2025-09-12 12:21:26', '2025-09-12 12:21:26', NULL),
(151, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub77_2025-09-12/sample-local-pdf.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-12 12:40:28', '2025-09-12 12:40:28', '2025-09-12 12:40:28', NULL),
(152, 'sample.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub77_2025-09-12/sample.pdf', 'temp', NULL, 18810, 'application/pdf', '', 0, 8, '2025-09-12 12:40:28', '2025-09-12 12:40:28', '2025-09-12 12:40:28', NULL),
(153, 'merged_documents.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub77_2025-09-12/merged_documents.pdf', 'temp', NULL, 15, 'application/pdf', '', 0, 8, '2025-09-12 12:40:28', '2025-09-12 12:40:28', '2025-09-12 12:40:28', NULL),
(154, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub78_2025-09-12/sample-local-pdf.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-12 13:02:07', '2025-09-12 13:02:07', '2025-09-12 13:02:07', NULL),
(155, 'sample.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub78_2025-09-12/sample.pdf', 'temp', NULL, 18810, 'application/pdf', '', 0, 8, '2025-09-12 13:02:07', '2025-09-12 13:02:07', '2025-09-12 13:02:07', NULL),
(156, 'merged_documents.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub78_2025-09-12/merged_documents.pdf', 'temp', NULL, 15, 'application/pdf', '', 0, 8, '2025-09-12 13:02:07', '2025-09-12 13:02:07', '2025-09-12 13:02:07', NULL),
(157, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub79_2025-09-12/sample-local-pdf.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-12 13:20:43', '2025-09-12 13:20:43', '2025-09-12 13:20:43', NULL),
(158, 'sample.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub79_2025-09-12/sample.pdf', 'temp', NULL, 18810, 'application/pdf', '', 0, 8, '2025-09-12 13:20:43', '2025-09-12 13:20:43', '2025-09-12 13:20:43', NULL),
(159, 'merged_documents.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub79_2025-09-12/merged_documents.pdf', 'temp', NULL, 15, 'application/pdf', '', 0, 8, '2025-09-12 13:20:43', '2025-09-12 13:20:43', '2025-09-12 13:20:43', NULL),
(160, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub80_2025-09-12/sample-local-pdf.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-12 13:42:50', '2025-09-12 13:42:50', '2025-09-12 13:42:50', NULL),
(161, 'sample.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub80_2025-09-12/sample.pdf', 'temp', NULL, 18810, 'application/pdf', '', 0, 8, '2025-09-12 13:42:50', '2025-09-12 13:42:50', '2025-09-12 13:42:50', NULL),
(162, 'merged_documents.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub80_2025-09-12/merged_documents.pdf', 'temp', NULL, 15, 'application/pdf', '', 0, 8, '2025-09-12 13:42:50', '2025-09-12 13:42:50', '2025-09-12 13:42:50', NULL),
(163, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub81_2025-09-12/sample-local-pdf.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-12 14:25:55', '2025-09-12 14:25:55', '2025-09-12 14:25:55', NULL),
(164, 'sample.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub81_2025-09-12/sample.pdf', 'temp', NULL, 18810, 'application/pdf', '', 0, 8, '2025-09-12 14:25:55', '2025-09-12 14:25:55', '2025-09-12 14:25:55', NULL),
(165, 'merged_documents.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub81_2025-09-12/merged_documents.pdf', 'temp', NULL, 15, 'application/pdf', '', 0, 8, '2025-09-12 14:25:55', '2025-09-12 14:25:55', '2025-09-12 14:25:55', NULL),
(166, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub82_2025-09-13/sample-local-pdf.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-13 03:11:08', '2025-09-13 03:11:08', '2025-09-13 03:11:08', NULL),
(167, 'sample.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub82_2025-09-13/sample.pdf', 'temp', NULL, 18810, 'application/pdf', '', 0, 8, '2025-09-13 03:11:08', '2025-09-13 03:11:08', '2025-09-13 03:11:08', NULL),
(168, 'merged_documents.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub82_2025-09-13/merged_documents.pdf', 'temp', NULL, 15, 'application/pdf', '', 0, 8, '2025-09-13 03:11:08', '2025-09-13 03:11:08', '2025-09-13 03:11:08', NULL),
(169, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund83_2025-09-13/sample-local-pdf_2.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-13 15:09:12', '2025-09-13 15:09:12', '2025-09-13 15:09:12', NULL),
(170, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund83_2025-09-13/sample-local-pdf_3.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-13 15:09:12', '2025-09-13 15:09:12', '2025-09-13 15:09:12', NULL),
(171, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund83_2025-09-13/sample-local-pdf.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-13 15:09:12', '2025-09-13 15:09:12', '2025-09-13 15:09:12', NULL),
(172, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund83_2025-09-13/sample-local-pdf_1.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-13 15:09:12', '2025-09-13 15:09:12', '2025-09-13 15:09:12', NULL),
(173, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund84_2025-09-14/sample-local-pdf_FA-25680914-0002_2.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-14 08:00:36', '2025-09-14 08:00:36', '2025-09-14 08:00:36', NULL),
(174, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund84_2025-09-14/sample-local-pdf_FA-25680914-0002.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-14 08:00:36', '2025-09-14 08:00:36', '2025-09-14 08:00:36', NULL),
(175, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund84_2025-09-14/sample-local-pdf_FA-25680914-0002_3.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-14 08:00:36', '2025-09-14 08:00:36', '2025-09-14 08:00:36', NULL),
(176, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund84_2025-09-14/sample-local-pdf_FA-25680914-0002_1.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-14 08:00:36', '2025-09-14 08:00:36', '2025-09-14 08:00:36', NULL),
(177, 'sample.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub87_2025-09-15/sample_PR-25680915-0003.pdf', 'temp', NULL, 18810, 'application/pdf', '', 0, 8, '2025-09-15 07:36:39', '2025-09-15 07:36:39', '2025-09-15 07:36:39', NULL),
(178, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub87_2025-09-15/sample-local-pdf_PR-25680915-0003.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-15 07:36:39', '2025-09-15 07:36:39', '2025-09-15 07:36:39', NULL),
(179, 'merged_documents.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub87_2025-09-15/merged_documents_PR-25680915-0003.pdf', 'temp', NULL, 15, 'application/pdf', '', 0, 8, '2025-09-15 07:36:39', '2025-09-15 07:36:39', '2025-09-15 07:36:39', NULL),
(180, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub88_2025-09-15/sample-local-pdf_PR-25680915-0004.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-15 07:38:57', '2025-09-15 07:38:57', '2025-09-15 07:38:57', NULL),
(181, 'sample.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub88_2025-09-15/sample_PR-25680915-0004.pdf', 'temp', NULL, 18810, 'application/pdf', '', 0, 8, '2025-09-15 07:38:57', '2025-09-15 07:38:57', '2025-09-15 07:38:57', NULL),
(182, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub89_2025-09-17/sample-local-pdf_PR-25680917-0005.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-17 09:21:06', '2025-09-17 09:21:06', '2025-09-17 09:21:06', NULL),
(183, 'sample.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub89_2025-09-17/sample_PR-25680917-0005.pdf', 'temp', NULL, 18810, 'application/pdf', '', 0, 8, '2025-09-17 09:21:06', '2025-09-17 09:21:06', '2025-09-17 09:21:06', NULL),
(184, 'sample.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub90_2025-09-17/sample_PR-25680917-0006.pdf', 'temp', NULL, 18810, 'application/pdf', '', 0, 8, '2025-09-17 09:38:06', '2025-09-17 09:38:06', '2025-09-17 09:38:06', NULL),
(185, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub90_2025-09-17/sample-local-pdf_PR-25680917-0006.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-17 09:38:06', '2025-09-17 09:38:06', '2025-09-17 09:38:06', NULL),
(186, 'sample.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub91_2025-09-17/sample_PR-25680917-0007.pdf', 'temp', NULL, 18810, 'application/pdf', '', 0, 8, '2025-09-17 10:21:31', '2025-09-17 10:21:31', '2025-09-17 10:21:31', NULL),
(187, 'sample.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub92_2025-09-17/sample_PR-25680917-0008.pdf', 'temp', NULL, 18810, 'application/pdf', '', 0, 8, '2025-09-17 10:30:45', '2025-09-17 10:30:45', '2025-09-17 10:30:45', NULL),
(188, 'sample.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub93_2025-09-17/sample_PR-25680917-0009.pdf', 'temp', NULL, 18810, 'application/pdf', '', 0, 8, '2025-09-17 10:47:21', '2025-09-17 10:47:21', '2025-09-17 10:47:21', NULL),
(189, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub93_2025-09-17/sample-local-pdf_PR-25680917-0009.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-17 10:47:21', '2025-09-17 10:47:21', '2025-09-17 10:47:21', NULL),
(190, 'sample.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub94_2025-09-17/sample_PR-25680917-0010.pdf', 'temp', NULL, 18810, 'application/pdf', '', 0, 8, '2025-09-17 10:48:36', '2025-09-17 10:48:36', '2025-09-17 10:48:36', NULL),
(191, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub94_2025-09-17/sample-local-pdf_PR-25680917-0010.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-17 10:48:36', '2025-09-17 10:48:36', '2025-09-17 10:48:36', NULL),
(192, 'sample.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub95_2025-09-17/sample_PR-25680917-0011.pdf', 'temp', NULL, 18810, 'application/pdf', '', 0, 8, '2025-09-17 10:50:54', '2025-09-17 10:50:54', '2025-09-17 10:50:54', NULL),
(193, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub95_2025-09-17/sample-local-pdf_PR-25680917-0011.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-17 10:50:54', '2025-09-17 10:50:54', '2025-09-17 10:50:54', NULL),
(194, 'sample.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub96_2025-09-17/sample_PR-25680917-0012.pdf', 'temp', NULL, 18810, 'application/pdf', '', 0, 8, '2025-09-17 10:52:06', '2025-09-17 10:52:06', '2025-09-17 10:52:06', NULL),
(195, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub96_2025-09-17/sample-local-pdf_PR-25680917-0012.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-17 10:52:06', '2025-09-17 10:52:06', '2025-09-17 10:52:06', NULL),
(196, 'sample.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub97_2025-09-17/sample_PR-25680917-0013.pdf', 'temp', NULL, 18810, 'application/pdf', '', 0, 8, '2025-09-17 11:16:56', '2025-09-17 11:16:56', '2025-09-17 11:16:56', NULL),
(197, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub97_2025-09-17/sample-local-pdf_PR-25680917-0013.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-17 11:16:56', '2025-09-17 11:16:56', '2025-09-17 11:16:56', NULL),
(198, 'sample.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub98_2025-09-17/sample_PR-25680917-0014.pdf', 'temp', NULL, 18810, 'application/pdf', '', 0, 8, '2025-09-17 11:18:07', '2025-09-17 11:18:07', '2025-09-17 11:18:07', NULL),
(199, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub98_2025-09-17/sample-local-pdf_PR-25680917-0014.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-17 11:18:07', '2025-09-17 11:18:07', '2025-09-17 11:18:07', NULL),
(200, 'sample.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub99_2025-09-20/sample_PR-25680920-0015.pdf', 'temp', NULL, 18810, 'application/pdf', '', 0, 8, '2025-09-20 16:35:39', '2025-09-20 16:35:39', '2025-09-20 16:35:39', NULL),
(201, 'c4611_sample_explain.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub99_2025-09-20/c4611_sample_explain_PR-25680920-0015.pdf', 'temp', NULL, 88226, 'application/pdf', '', 0, 8, '2025-09-20 16:35:40', '2025-09-20 16:35:40', '2025-09-20 16:35:40', NULL),
(202, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub99_2025-09-20/sample-local-pdf_PR-25680920-0015.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-20 16:35:40', '2025-09-20 16:35:40', '2025-09-20 16:35:40', NULL),
(203, 'sample.pdf', 'uploads/users/user_13_หวหนา_สาขา/submissions/pub100_2025-09-22/sample_PR-25680922-0016.pdf', 'temp', NULL, 18810, 'application/pdf', '', 0, 13, '2025-09-22 13:43:37', '2025-09-22 13:43:37', '2025-09-22 13:43:37', NULL),
(204, 'sample-local-pdf.pdf', 'uploads/users/user_13_หวหนา_สาขา/submissions/pub100_2025-09-22/sample-local-pdf_PR-25680922-0016.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 13, '2025-09-22 13:43:38', '2025-09-22 13:43:38', '2025-09-22 13:43:38', NULL),
(205, '1. 1574-68 หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย นวัตกรรม และบริการวิชาการ (2568).pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub101_2025-09-22/1._1574-68_หลกเกณฑการใชจายเงนกองทนวจย_นว.pdf', 'temp', NULL, 455138, 'application/pdf', '', 0, 8, '2025-09-22 16:11:53', '2025-09-22 16:11:53', '2025-09-22 16:11:53', NULL),
(206, '1. 1574-68 หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย นวัตกรรม และบริการวิชาการ (2568).pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub102_2025-09-22/1._1574-68_หลกเกณฑการใชจายเงนกองทนวจย_นว.pdf', 'temp', NULL, 455138, 'application/pdf', '', 0, 8, '2025-09-22 16:51:50', '2025-09-22 16:51:50', '2025-09-22 16:51:50', NULL),
(207, '1. 1574-68 หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย นวัตกรรม และบริการวิชาการ (2568).pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund103_2025-09-23/1._1574-68_หลกเกณฑการใชจายเงนกองทนวจย_นว_3.pdf', 'temp', NULL, 455138, 'application/pdf', '', 0, 8, '2025-09-23 12:43:25', '2025-09-23 12:43:25', '2025-09-23 12:43:25', NULL),
(208, '1. 1574-68 หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย นวัตกรรม และบริการวิชาการ (2568).pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund103_2025-09-23/1._1574-68_หลกเกณฑการใชจายเงนกองทนวจย_นว.pdf', 'temp', NULL, 455138, 'application/pdf', '', 0, 8, '2025-09-23 12:43:25', '2025-09-23 12:43:25', '2025-09-23 12:43:25', NULL),
(209, '1. 1574-68 หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย นวัตกรรม และบริการวิชาการ (2568).pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund103_2025-09-23/1._1574-68_หลกเกณฑการใชจายเงนกองทนวจย_นว_2.pdf', 'temp', NULL, 455138, 'application/pdf', '', 0, 8, '2025-09-23 12:43:25', '2025-09-23 12:43:25', '2025-09-23 12:43:25', NULL),
(210, '1. 1574-68 หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย นวัตกรรม และบริการวิชาการ (2568).pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund103_2025-09-23/1._1574-68_หลกเกณฑการใชจายเงนกองทนวจย_นว_1.pdf', 'temp', NULL, 455138, 'application/pdf', '', 0, 8, '2025-09-23 12:43:25', '2025-09-23 12:43:25', '2025-09-23 12:43:25', NULL),
(211, 'sample.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub104_2025-09-23/sample_PR-25680923-0019.pdf', 'temp', NULL, 18810, 'application/pdf', '', 0, 8, '2025-09-23 12:48:24', '2025-09-23 12:48:24', '2025-09-23 12:48:24', NULL),
(212, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub104_2025-09-23/sample-local-pdf_PR-25680923-0019.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-09-23 12:48:24', '2025-09-23 12:48:24', '2025-09-23 12:48:24', NULL),
(213, 'form.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub105_2025-09-23/form_PR-25680923-0020.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-09-23 13:50:59', '2025-09-23 13:50:59', '2025-09-23 13:50:59', NULL);
INSERT INTO `file_uploads` (`file_id`, `original_name`, `stored_path`, `folder_type`, `submission_id`, `file_size`, `mime_type`, `file_hash`, `is_public`, `uploaded_by`, `uploaded_at`, `create_at`, `update_at`, `delete_at`) VALUES
(214, 'form.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub106_2025-09-23/form_PR-25680923-0021.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-09-23 15:05:03', '2025-09-23 15:05:03', '2025-09-23 15:05:03', NULL),
(215, '1. 1574-68 หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย นวัตกรรม และบริการวิชาการ (2568).pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub106_2025-09-23/1._1574-68_หลกเกณฑการใชจายเงนกองทนวจย_นว.pdf', 'temp', NULL, 455138, 'application/pdf', '', 0, 8, '2025-09-23 15:05:04', '2025-09-23 15:05:04', '2025-09-23 15:05:04', NULL),
(216, 'form.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub107_2025-09-23/form_PR-25680923-0022.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-09-23 15:06:29', '2025-09-23 15:06:29', '2025-09-23 15:06:29', NULL),
(217, '1. 1574-68 หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย นวัตกรรม และบริการวิชาการ (2568).pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub107_2025-09-23/1._1574-68_หลกเกณฑการใชจายเงนกองทนวจย_นว.pdf', 'temp', NULL, 455138, 'application/pdf', '', 0, 8, '2025-09-23 15:06:29', '2025-09-23 15:06:29', '2025-09-23 15:06:30', NULL),
(218, '1. 1574-68 หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย นวัตกรรม และบริการวิชาการ (2568).pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub108_2025-09-23/1._1574-68_หลกเกณฑการใชจายเงนกองทนวจย_นว.pdf', 'temp', NULL, 455138, 'application/pdf', '', 0, 8, '2025-09-23 15:29:14', '2025-09-23 15:29:14', '2025-09-23 15:29:14', NULL),
(219, 'form.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub108_2025-09-23/form_PR-25680923-0023.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-09-23 15:29:14', '2025-09-23 15:29:14', '2025-09-23 15:29:14', NULL),
(220, '1. 1574-68 หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย นวัตกรรม และบริการวิชาการ (2568).pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub109_2025-09-23/1._1574-68_หลกเกณฑการใชจายเงนกองทนวจย_นว.pdf', 'temp', NULL, 455138, 'application/pdf', '', 0, 8, '2025-09-23 16:20:14', '2025-09-23 16:20:14', '2025-09-23 16:20:14', NULL),
(221, '1. 1574-68 หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย นวัตกรรม และบริการวิชาการ (2568).pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub110_2025-09-23/1._1574-68_หลกเกณฑการใชจายเงนกองทนวจย_นว.pdf', 'temp', NULL, 455138, 'application/pdf', '', 0, 8, '2025-09-23 16:25:33', '2025-09-23 16:25:33', '2025-09-23 16:25:33', NULL),
(222, 'form.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub110_2025-09-23/form_PR-25680923-0025.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-09-23 16:25:33', '2025-09-23 16:25:33', '2025-09-23 16:25:33', NULL),
(223, '1. 1574-68 หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย นวัตกรรม และบริการวิชาการ (2568).pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub111_2025-09-24/1._1574-68_หลกเกณฑการใชจายเงนกองทนวจย_นว.pdf', 'temp', NULL, 455138, 'application/pdf', '', 0, 8, '2025-09-24 11:58:50', '2025-09-24 11:58:50', '2025-09-24 11:58:50', NULL);

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
(1, 61, 1, 'สมชาย ใจดี', '081-111-1111', '0.00', '0.00', NULL, NULL, NULL, NULL, NULL, NULL, '', NULL, NULL, NULL),
(2, 62, 1, 'สมชาย ใจดี', '092-222-2222', '0.00', '0.00', NULL, NULL, NULL, NULL, NULL, NULL, '', NULL, NULL, NULL),
(3, 63, 1, 'สมชาย ใจดี', '088-888-8888', '0.00', '0.00', NULL, NULL, NULL, NULL, NULL, NULL, '', NULL, NULL, NULL),
(4, 64, 1, 'สมชาย ใจดี', '088-888-8888', '0.00', '0.00', NULL, NULL, NULL, NULL, NULL, NULL, '', NULL, NULL, NULL),
(5, 65, 2, 'สมชาย ใจดี', '081-231-2374', '0.00', '0.00', NULL, NULL, NULL, NULL, NULL, NULL, '', NULL, NULL, NULL),
(6, 66, 1, 'สมชาย ใจดี', '081-111-1111', '0.00', '0.00', NULL, NULL, NULL, NULL, NULL, NULL, '', NULL, NULL, NULL),
(7, 67, 9, 'สมชาย ใจดี', '088-888-8888', '0.00', '0.00', NULL, NULL, NULL, NULL, NULL, NULL, '', NULL, NULL, NULL),
(8, 68, 1, 'สมชาย ใจดี', '081-111-1111', '0.00', '0.00', NULL, NULL, NULL, NULL, NULL, NULL, '', NULL, NULL, NULL),
(9, 69, 1, 'สมชาย ใจดี', '081-111-1111', '0.00', '0.00', NULL, NULL, NULL, NULL, NULL, NULL, '', NULL, NULL, NULL),
(10, 70, 10, 'สมชาย ใจดี', '085-464-5612', '15000.00', '10000.00', NULL, '2025-09-02 19:41:25', NULL, NULL, NULL, 'TEST-123', '', NULL, NULL, NULL),
(11, 72, 1, 'สมชาย ใจดี', '099-999-9999', '0.00', '0.00', NULL, NULL, NULL, NULL, NULL, '', '', NULL, NULL, NULL),
(12, 73, 1, 'สมชาย ใจดี', '099-999-9999', '15000.00', '0.00', NULL, NULL, NULL, NULL, NULL, '', '', NULL, NULL, NULL),
(13, 83, 1, 'สมชาย ใจดี', '888-888-8888', '50000.00', '0.00', NULL, NULL, NULL, NULL, NULL, '', '', NULL, NULL, NULL),
(14, 84, 2, 'สมชาย ใจดี', '088-888-8888', '70000.00', '0.00', NULL, NULL, NULL, NULL, NULL, '', '', NULL, NULL, NULL),
(15, 103, 1, 'สมชาย ใจดี', '088-888-8888', '8000.00', '0.00', NULL, NULL, NULL, NULL, NULL, '', '', NULL, NULL, NULL);

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
(15, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-20250912-0008 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 81, '2025-09-12 14:25:55', '2025-09-12 14:25:55', NULL),
(16, 7, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-20250912-0008 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 81, '2025-09-12 14:25:55', '2025-09-12 14:25:55', NULL),
(17, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-20250913-0001 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 82, '2025-09-13 03:11:08', '2025-09-13 03:11:08', NULL),
(18, 7, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-20250913-0001 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 82, '2025-09-13 03:11:08', '2025-09-13 03:11:08', NULL),
(19, 8, 'คำร้องได้รับการอนุมัติแล้ว', 'คำร้องหมายเลข PR-20250912-0008 ของคุณได้รับการอนุมัติแล้ว', 'success', 0, 81, '2025-09-13 16:04:49', '2025-09-13 16:04:49', NULL),
(20, 8, 'คำร้องไม่ได้รับการอนุมัติ', 'คำร้องหมายเลข PR-20250827-0001 ของคุณไม่ได้รับการอนุมัติ เนื่องจาก: เอกสารยังไม่ครบ', 'error', 0, 51, '2025-09-14 02:21:07', '2025-09-14 02:21:07', NULL),
(21, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-25680915-0003 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 87, '2025-09-15 07:36:39', '2025-09-15 07:36:39', NULL),
(22, 7, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25680915-0003 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 87, '2025-09-15 07:36:39', '2025-09-15 07:36:39', NULL),
(23, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-25680915-0004 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 88, '2025-09-15 07:38:57', '2025-09-15 07:38:57', NULL),
(24, 7, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25680915-0004 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 88, '2025-09-15 07:38:57', '2025-09-15 07:38:57', NULL),
(25, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-25680917-0005 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 89, '2025-09-17 09:21:06', '2025-09-17 09:21:06', NULL),
(26, 7, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25680917-0005 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 89, '2025-09-17 09:21:06', '2025-09-17 09:21:06', NULL),
(27, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-25680917-0006 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 90, '2025-09-17 09:38:06', '2025-09-17 09:38:06', NULL),
(28, 7, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25680917-0006 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 90, '2025-09-17 09:38:06', '2025-09-17 09:38:06', NULL),
(29, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-25680917-0007 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 91, '2025-09-17 10:21:31', '2025-09-17 10:21:31', NULL),
(30, 7, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25680917-0007 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 91, '2025-09-17 10:21:31', '2025-09-17 10:21:31', NULL),
(31, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-25680917-0008 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 92, '2025-09-17 10:30:45', '2025-09-17 10:30:45', NULL),
(32, 7, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25680917-0008 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 92, '2025-09-17 10:30:45', '2025-09-17 10:30:45', NULL),
(33, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-25680917-0009 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 93, '2025-09-17 10:47:21', '2025-09-17 10:47:21', NULL),
(34, 7, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25680917-0009 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 93, '2025-09-17 10:47:21', '2025-09-17 10:47:21', NULL),
(35, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-25680917-0010 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 94, '2025-09-17 10:48:36', '2025-09-17 10:48:36', NULL),
(36, 7, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25680917-0010 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 94, '2025-09-17 10:48:36', '2025-09-17 10:48:36', NULL),
(37, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-25680917-0011 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 95, '2025-09-17 10:50:54', '2025-09-17 10:50:54', NULL),
(38, 7, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25680917-0011 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 95, '2025-09-17 10:50:54', '2025-09-17 10:50:54', NULL),
(39, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-25680917-0012 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 96, '2025-09-17 10:52:06', '2025-09-17 10:52:06', NULL),
(40, 7, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25680917-0012 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 96, '2025-09-17 10:52:06', '2025-09-17 10:52:06', NULL),
(41, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-25680917-0013 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 97, '2025-09-17 11:16:56', '2025-09-17 11:16:56', NULL),
(42, 7, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25680917-0013 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 97, '2025-09-17 11:16:56', '2025-09-17 11:16:56', NULL),
(43, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-25680917-0014 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 98, '2025-09-17 11:18:07', '2025-09-17 11:18:07', NULL),
(44, 7, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25680917-0014 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 98, '2025-09-17 11:18:07', '2025-09-17 11:18:07', NULL),
(45, 8, 'คำร้องได้รับการอนุมัติแล้ว', 'คำร้องหมายเลข PR-25680917-0014 ของคุณได้รับการอนุมัติแล้ว', 'success', 0, 98, '2025-09-20 08:33:12', '2025-09-20 08:33:12', NULL),
(46, 8, 'คำร้องได้รับการอนุมัติแล้ว', 'คำร้องหมายเลข PR-25680917-0013 ของคุณได้รับการอนุมัติแล้วตามหมายเลขประกาศที่ asdasd', 'success', 0, 97, '2025-09-20 16:25:07', '2025-09-20 16:25:07', NULL),
(47, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-25680920-0015 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 99, '2025-09-20 16:35:40', '2025-09-20 16:35:40', NULL),
(48, 7, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25680920-0015 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 99, '2025-09-20 16:35:40', '2025-09-20 16:35:40', NULL),
(49, 8, 'คำร้องได้รับการอนุมัติแล้ว', 'คำร้องหมายเลข PR-25680920-0015 ของคุณได้รับการอนุมัติแล้วตามหมายเลขประกาศที่ 123/2555', 'success', 0, 99, '2025-09-20 17:17:33', '2025-09-20 17:17:33', NULL),
(50, 13, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-25680922-0016 ของคุณ พนักงานธุรการหัวหน้า สาขา แล้ว', 'success', 0, 100, '2025-09-22 13:43:38', '2025-09-22 13:43:38', NULL),
(51, 7, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25680922-0016 จากอาจารย์ พนักงานธุรการหัวหน้า สาขา แล้ว', 'info', 0, 100, '2025-09-22 13:43:38', '2025-09-22 13:43:38', NULL),
(52, 11, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25680922-0016 จากอาจารย์ พนักงานธุรการหัวหน้า สาขา แล้ว', 'info', 0, 100, '2025-09-22 13:43:38', '2025-09-22 13:43:38', NULL),
(53, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-25680922-0017 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 101, '2025-09-22 16:11:53', '2025-09-22 16:11:53', NULL),
(54, 7, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25680922-0017 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 101, '2025-09-22 16:11:53', '2025-09-22 16:11:53', NULL),
(55, 11, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25680922-0017 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 101, '2025-09-22 16:11:53', '2025-09-22 16:11:53', NULL),
(56, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-25680922-0018 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 102, '2025-09-22 16:51:50', '2025-09-22 16:51:50', NULL),
(57, 7, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25680922-0018 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 102, '2025-09-22 16:51:50', '2025-09-22 16:51:50', NULL),
(58, 11, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25680922-0018 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 102, '2025-09-22 16:51:50', '2025-09-22 16:51:50', NULL),
(59, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-25680923-0019 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 104, '2025-09-23 12:48:24', '2025-09-23 12:48:24', NULL),
(60, 7, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25680923-0019 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 104, '2025-09-23 12:48:24', '2025-09-23 12:48:24', NULL),
(61, 11, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25680923-0019 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 104, '2025-09-23 12:48:24', '2025-09-23 12:48:24', NULL),
(62, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-25680923-0020 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 105, '2025-09-23 13:50:59', '2025-09-23 13:50:59', NULL),
(63, 7, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25680923-0020 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 105, '2025-09-23 13:50:59', '2025-09-23 13:50:59', NULL),
(64, 11, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25680923-0020 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 105, '2025-09-23 13:50:59', '2025-09-23 13:50:59', NULL),
(65, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-25680923-0021 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 106, '2025-09-23 15:05:04', '2025-09-23 15:05:04', NULL),
(66, 7, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25680923-0021 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 106, '2025-09-23 15:05:04', '2025-09-23 15:05:04', NULL),
(67, 11, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25680923-0021 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 106, '2025-09-23 15:05:04', '2025-09-23 15:05:04', NULL),
(68, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-25680923-0022 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 107, '2025-09-23 15:06:30', '2025-09-23 15:06:30', NULL),
(69, 7, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25680923-0022 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 107, '2025-09-23 15:06:30', '2025-09-23 15:06:30', NULL),
(70, 11, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25680923-0022 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 107, '2025-09-23 15:06:30', '2025-09-23 15:06:30', NULL),
(71, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-25680923-0023 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 108, '2025-09-23 15:29:14', '2025-09-23 15:29:14', NULL),
(72, 7, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25680923-0023 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 108, '2025-09-23 15:29:14', '2025-09-23 15:29:14', NULL),
(73, 11, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25680923-0023 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 108, '2025-09-23 15:29:14', '2025-09-23 15:29:14', NULL),
(74, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-25680923-0024 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 109, '2025-09-23 16:20:14', '2025-09-23 16:20:14', NULL),
(75, 7, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25680923-0024 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 109, '2025-09-23 16:20:14', '2025-09-23 16:20:14', NULL),
(76, 11, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25680923-0024 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 109, '2025-09-23 16:20:14', '2025-09-23 16:20:14', NULL),
(77, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-25680923-0025 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 110, '2025-09-23 16:25:34', '2025-09-23 16:25:34', NULL),
(78, 7, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25680923-0025 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 110, '2025-09-23 16:25:34', '2025-09-23 16:25:34', NULL),
(79, 11, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25680923-0025 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 110, '2025-09-23 16:25:34', '2025-09-23 16:25:34', NULL),
(80, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-25680924-0026 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 111, '2025-09-24 11:58:50', '2025-09-24 11:58:50', NULL),
(81, 7, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25680924-0026 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 111, '2025-09-24 11:58:50', '2025-09-24 11:58:50', NULL),
(82, 11, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25680924-0026 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 111, '2025-09-24 11:58:50', '2025-09-24 11:58:50', NULL);

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
(146, 8, 'Transformation of the BPMN design model into a colored Petri net using the partitioning approach', 'Chanon Dechsupa, Wiwat Vatanawood, Arthit Thongtak', NULL, NULL, NULL, 2018, NULL, 'https://ieeexplore.ieee.org/abstract/document/8405526/', 45, 'https://scholar.google.com/scholar?hl=en&cites=12787580523055771259', 'scholar', '{\"scholar_cluster_id\":\"[\'12787580523055771259\']\"}', '6badedb989e2cf25cea1172a93f4cb13db967f23', 0, '2025-09-21 00:00:59', '2025-09-24 00:01:02', NULL, '{\"2018\":2,\"2019\":10,\"2020\":3,\"2021\":5,\"2022\":9,\"2023\":6,\"2024\":9,\"2025\":1}'),
(147, 8, 'Hierarchical verification for the BPMN design model using state space analysis', 'Chanon Dechsupa, Wiwat Vatanawood, Arthit Thongtak', NULL, NULL, NULL, 2019, NULL, 'https://ieeexplore.ieee.org/abstract/document/8611325/', 40, 'https://scholar.google.com/scholar?hl=en&cites=8862119664193353323', 'scholar', '{\"scholar_cluster_id\":\"[\'8862119664193353323\']\"}', '29bd0c0fb709ce634fa24280fa74b0123c33d553', 0, '2025-09-21 00:00:59', '2025-09-24 00:01:02', NULL, '{\"2018\":1,\"2019\":6,\"2020\":3,\"2021\":4,\"2022\":8,\"2023\":10,\"2024\":2,\"2025\":6}'),
(148, 8, 'Formal verification of web service orchestration using colored petri net', 'C Dechsupa, W Vatanawood, A Thongtak', NULL, NULL, NULL, 2016, NULL, 'http://www.iaeng.org/publication/IMECS2016/IMECS2016_pp398-403.pdf', 13, 'https://scholar.google.com/scholar?hl=en&cites=17960005054307779010', 'scholar', '{\"scholar_cluster_id\":\"[\'17960005054307779010\']\"}', '0c1a71fe987328fd47243c5f50fa927fe3aad557', 0, '2025-09-21 00:00:59', '2025-09-24 00:01:02', NULL, '{\"2017\":1,\"2018\":3,\"2019\":4,\"2020\":2,\"2021\":1,\"2022\":0,\"2023\":2}'),
(149, 8, 'Stepwise verification for the BPMN with timed and stochastic process using a colored generalized stochastic Petri net', 'Chanon Dechsupa, Wiwat Vatanawood, Arthit Thongtak', NULL, NULL, NULL, 2022, NULL, 'https://ieeexplore.ieee.org/abstract/document/9758738/', 6, 'https://scholar.google.com/scholar?hl=en&cites=7981025124627691886', 'scholar', '{\"scholar_cluster_id\":\"[\'7981025124627691886\']\"}', 'aeb7e0e56f784f470d212414acdf19f7307ed11e', 0, '2025-09-21 00:00:59', '2025-09-24 00:01:02', NULL, '{\"2022\":2,\"2023\":1,\"2024\":0,\"2025\":3}'),
(150, 8, 'An automated framework for BPMN model verification achieving branch coverage', 'Chanon Dechsupa, Wiwat Vatanawood, Arthit Thongtak', NULL, NULL, NULL, 2021, NULL, 'https://engj.org/index.php/ej/article/view/4084', 5, 'https://scholar.google.com/scholar?hl=en&cites=8795149309224104072', 'scholar', '{\"scholar_cluster_id\":\"[\'8795149309224104072\']\"}', '07daece3baefcd04ce2263035573e1c44e55bc49', 0, '2025-09-21 00:00:59', '2025-09-24 00:01:02', NULL, '{\"2021\":1,\"2022\":0,\"2023\":2,\"2024\":1,\"2025\":1}'),
(151, 8, 'Formal Verification of the Accounting Information Interfaces Using Colored Petri Net', 'Worawit Poolsawasdi, Chanon Dechsupa', NULL, NULL, NULL, 2019, NULL, 'https://ieeexplore.ieee.org/abstract/document/8802547/', 3, 'https://scholar.google.com/scholar?hl=en&cites=14998856147780456235', 'scholar', '{\"scholar_cluster_id\":\"[\'14998856147780456235\']\"}', 'c170922d38a507760700cbfab7f16275afb11e30', 0, '2025-09-21 00:00:59', '2025-09-24 00:01:02', NULL, '{\"2019\":1,\"2020\":0,\"2021\":2}'),
(152, 8, 'Compositional formal verification for business process models with heterogeneous notations using colored Petri Net', 'C Dechsupa, W Vatanawood, A Thongtak', NULL, NULL, NULL, 2019, NULL, 'https://scholar.google.com/scholar?cluster=6843663431830027631&hl=en&oi=scholarr', 3, 'https://scholar.google.com/scholar?hl=en&cites=6843663431830027631', 'scholar', '{\"scholar_cluster_id\":\"[\'6843663431830027631\']\"}', '23242652a60d109cd5fad480e0a5d4f44cafe19d', 0, '2025-09-21 00:00:59', '2025-09-24 00:01:02', NULL, '{\"2023\":1,\"2024\":2}'),
(153, 8, 'MorphoNet: A novel bivalve images classification framework with convolutional neural network', 'Chanon Dechsupa, Pongpun Prasankok, Wiwat Vattanawood, Arthit Thongtak', NULL, NULL, NULL, 2023, NULL, 'https://www.engj.org/index.php/ej/article/view/4510', 2, 'https://scholar.google.com/scholar?hl=en&cites=14881028456811771380', 'scholar', '{\"scholar_cluster_id\":\"[\'14881028456811771380\']\"}', '520340ad03a1bd8771441f1e27b9e5fd998fc943', 0, '2025-09-21 00:00:59', '2025-09-24 00:01:02', NULL, '{\"2024\":1,\"2025\":1}'),
(154, 8, 'Formal modelling and verification of the traffic light control system design with time-automata', 'A Kamput, C Dechsupa', NULL, NULL, NULL, 2023, NULL, 'https://www.researchgate.net/profile/Chanon-Dechsupa/publication/372388619_Formal_Modelling_and_Verification_of_the_Traffic_Light_Control_System_Design_with_Time-Automata/links/652e3af3b5c77c79f9bda3d7/Formal-Modelling-and-Verification-of-the-Traffic-Light-Control-System-Design-with-Time-Automata.pdf', 2, 'https://scholar.google.com/scholar?hl=en&cites=14268178437607664045', 'scholar', '{\"scholar_cluster_id\":\"[\'14268178437607664045\']\"}', '68f044d021c5607e9e2102e03aa9f62276ba28ef', 0, '2025-09-21 00:00:59', '2025-09-24 00:01:02', NULL, '{\"2025\":2}'),
(155, 8, 'An Applying Colored Petri Net for Computerized Accounting System and Ledger Accounts Instruction', 'Chanon Dechsupa, Wiwat Vatanawood, Worawit Poolsawasdi, Arthit Thongtak', NULL, NULL, NULL, 2021, NULL, 'https://www.mdpi.com/2073-431X/10/12/169', 2, 'https://scholar.google.com/scholar?hl=en&cites=16343376208504623490', 'scholar', '{\"scholar_cluster_id\":\"[\'16343376208504623490\']\"}', 'a0313a91b99f2de58140206c67f5aba6663f9f8b', 0, '2025-09-21 00:00:59', '2025-09-24 00:01:02', NULL, '{\"2023\":2}'),
(156, 8, 'Llm-Based Code Comment Summarization: Efficacy Evaluation and Challenges', 'Peeradon Sukkasem, Chitsutha Soomlek, Chanon Dechsupa', NULL, NULL, NULL, 2025, NULL, 'https://ieeexplore.ieee.org/abstract/document/11003343/', 1, 'https://scholar.google.com/scholar?hl=en&cites=14726756873448249733', 'scholar', '{\"scholar_cluster_id\":\"[\'14726756873448249733\']\"}', '39d79360a49705d0644781f70219ee2490fb951b', 0, '2025-09-21 00:00:59', '2025-09-24 00:01:02', NULL, '{\"2025\":1}'),
(157, 8, 'Scalable Timed-Automata Models for Traffic Light Control Systems: Challenges and Solutions in Formal Verification', 'Apipath Kamput, Chanon Dechsupa, Wiwat Vatanawood, Suttinan Pomsiri', NULL, NULL, NULL, 2024, NULL, 'https://ieeexplore.ieee.org/abstract/document/10666689/', 1, 'https://scholar.google.com/scholar?hl=en&cites=12598599138348353170', 'scholar', '{\"scholar_cluster_id\":\"[\'12598599138348353170\']\"}', '47baa15c9601f7a47e319e4ee43ac19e56de55cd', 0, '2025-09-21 00:00:59', '2025-09-24 00:01:02', NULL, '{\"2024\":1}'),
(158, 8, 'Toward automated verification of timed business process models using timed-automata networks and temporal properties', 'Chanon Dechsupa, Wiwat Vatanawood, Arthit Thongtak', NULL, NULL, NULL, 2025, NULL, 'https://www.sciencedirect.com/science/article/pii/S0020025525002208', NULL, NULL, 'scholar', NULL, '53db11828cb1250fd29af14999ea719ec090dbe1', 0, '2025-09-21 00:00:59', '2025-09-24 00:01:02', NULL, NULL),
(159, 8, 'Towards AI-Augmented Formal Verification: A Preliminary Investigation of ENGRU and Its Challenges', 'Chanon Dechsupa, Teerapong Panboonyuen, Wiwat Vatanawood, Praisan Padungweang, Chakchai So-In', NULL, NULL, NULL, 2025, NULL, 'https://ieeexplore.ieee.org/abstract/document/10993355/', NULL, NULL, 'scholar', NULL, '61ae555d998434eb64330b744161eaa6a8914dc1', 0, '2025-09-21 00:00:59', '2025-09-24 00:01:02', NULL, NULL),
(160, 8, 'Ensuring IoT Controller Reliability with Colored Generalized Stochastic Petri Net', 'Kruntarat Samngamnoi, Sutinun Pomsiri, Apipath Kamput, Chanon Dechsupa', NULL, NULL, NULL, 2024, NULL, 'https://ieeexplore.ieee.org/abstract/document/10770732/', NULL, NULL, 'scholar', NULL, 'baf62b4c49575b62532aacf9a50ee208449c39ec', 0, '2025-09-21 00:00:59', '2025-09-24 00:01:02', NULL, NULL),
(161, 8, 'An Applying Colored Petri Net for Computerized Accounting System and Ledger Accounts Instruction. Computers 2021, 10, 169', 'C Dechsupa, W Vatanawood, W Poolsawasdi, A Thongtak', NULL, NULL, NULL, 2021, NULL, 'https://www.academia.edu/download/80214901/pdf.pdf', NULL, NULL, 'scholar', NULL, '992712dd566fd338b5cf9253b9ddc09873cd0f04', 0, '2025-09-21 00:00:59', '2025-09-24 00:01:02', NULL, NULL),
(162, 8, 'Configuration management for integrated teaming environment', 'Chanon Dechsupa, Yachai Limpiyakorn', NULL, NULL, NULL, 2011, NULL, 'https://ieeexplore.ieee.org/abstract/document/6081265/', NULL, NULL, 'scholar', NULL, 'f43315261210343763e2bbcc9400bbf5696776cf', 0, '2025-09-21 00:00:59', '2025-09-24 00:01:02', NULL, NULL),
(163, 8, 'Transforming of the Sequence Diagram into Time-Automata Network', 'S Duangmalai, C Dechsupa', NULL, NULL, NULL, NULL, NULL, 'https://scholar.google.com/scholar?cluster=7621266305846188641&hl=en&oi=scholarr', NULL, NULL, 'scholar', NULL, '6df534e9aadf27573bb99823d90c0b0d042ad440', 0, '2025-09-21 00:00:59', '2025-09-24 00:01:02', NULL, NULL);

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
(40, 51, 'Test Article Title', 'Test Journal Name', '2025-06-01', 'journal', 'T5', '0.000', '10.1016/j', 'https://example.ac.th', '123-145', 'Vol.10', 'Scopus, Web of Science', '50000.00', '50000.00', '3123.00', '0.00', '3121.00', '0.00', '0.00', '0.00', '0.00', '', 3, 'first_author', 'no', 'ABC-123', 'QS World University Rankings #543', NULL, 'approve comment', 7, '2025-08-28 17:49:05', 'เอกสารยังไม่ครบ', 7, '2025-09-14 02:21:06', NULL, NULL, NULL, '2025-08-27 14:48:22', '2025-09-14 02:21:06', NULL, NULL, NULL, NULL, NULL),
(41, 52, 'Test Article Title', 'Test Journal Name', '2025-06-01', 'journal', 'T10', '0.000', '10.1016/j', 'https://example.ac.th', '123-145', 'Vol.10', 'Scopus, Web of Science, TCI', '45000.00', '40000.00', '3121.00', '1000.00', '22211.00', '5000.00', '0.00', '70332.00', '46000.00', 'TEST-123', 3, 'first_author', 'no', '', 'QS World University Rankings #543', NULL, '', 7, '2025-08-29 16:09:33', NULL, NULL, NULL, NULL, NULL, NULL, '2025-08-27 18:32:12', '2025-08-31 09:24:04', NULL, NULL, NULL, NULL, NULL),
(42, 53, 'Test Article Title', 'Test Journal Name', '2025-04-01', 'journal', 'T10', '0.000', '10.1016/j', 'https://example.ac.th', '123-145', 'Vol.10', 'Scopus, Web of Science', '45000.00', '45000.00', '111.00', '0.00', '2222.00', '0.00', '333.00', '47000.00', '45000.00', 'ASD-55', 3, 'first_author', 'no', '', 'QS World University Rankings #543', NULL, '', 7, '2025-09-03 08:48:13', 'ส่งคำร้องและแนบไฟล์มาใหม่', 7, '2025-08-29 15:55:50', NULL, NULL, NULL, '2025-08-27 21:08:29', '2025-09-03 09:09:50', NULL, NULL, NULL, NULL, NULL),
(51, 81, 'Test Article Title', 'Test Journal Name', '2025-06-01', 'journal', 'Q4', '0.000', '', '', '', 'Vol.10', '', '10000.00', '10000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '10000.00', '10000.00', '', 2, 'first_author', 'no', '', '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-12 14:25:55', '2025-09-13 16:04:48', NULL, NULL, NULL, NULL, NULL),
(52, 82, 'Test Article Title', 'Journal Name', '2025-09-01', 'journal', 'Q3', '0.000', '', '', '', '', '', '20000.00', '20000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '20000.00', '20000.00', '123/456', 1, 'first_author', 'no', '', '', NULL, NULL, NULL, NULL, 'nono', 7, '2025-09-13 17:03:58', NULL, NULL, NULL, '2025-09-13 03:11:08', '2025-09-13 17:15:15', NULL, NULL, NULL, NULL, NULL),
(53, 87, 'Test Article Title', 'Journal Name', '2025-09-01', 'journal', 'Q3', '0.000', '', '', '', 'Vol.10', '', '20000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '20000.00', '0.00', '', 1, 'corresponding_author', 'no', '', '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-15 07:36:39', '2025-09-15 07:36:39', NULL, NULL, NULL, NULL, NULL),
(54, 88, 'Test Article Title', 'Journal Name', '2025-03-01', 'journal', 'Q1', '0.000', '', '', '', '', '', '40000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '40000.00', '0.00', '', 1, 'corresponding_author', 'no', '', '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-15 07:38:57', '2025-09-15 07:38:57', NULL, NULL, NULL, NULL, NULL),
(55, 89, 'Article Title', 'Journal Name', '2025-05-01', 'journal', 'Q3', '0.000', '', '', '', '', '', '20000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '20000.00', '0.00', '', 1, 'first_author', 'no', '', '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-17 09:21:06', '2025-09-17 09:21:06', NULL, NULL, NULL, NULL, NULL),
(56, 90, 'Test Article Title', 'Journal Name', '2025-11-01', 'journal', 'Q4', '0.000', '', '', '', '', '', '10000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '10000.00', '0.00', '', 1, 'corresponding_author', 'yes', '321', '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-17 09:38:06', '2025-09-17 09:38:06', NULL, NULL, NULL, NULL, NULL),
(57, 91, 'Test Article Title', 'Test Journal Name', '2025-05-01', 'journal', 'Q3', '0.000', '', '', '', '', '', '20000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '20000.00', '0.00', '', 1, 'corresponding_author', 'no', '', '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-17 10:21:31', '2025-09-17 10:21:31', NULL, 1, 1, NULL, NULL),
(58, 92, 'Test Article Title', 'Test Journal Name', '2025-03-01', 'journal', 'Q1', '0.000', '', '', '', '', '', '40000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '40000.00', '0.00', '', 1, 'first_author', 'yes', 'PR-20250731-0001', '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-17 10:30:45', '2025-09-17 10:30:45', NULL, 1, 1, NULL, NULL),
(59, 93, 'Test Article Title', 'Test Journal Name', '2025-05-01', 'journal', 'T5', '0.000', '', '', '', '', '', '50000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '50000.00', '0.00', '', 1, 'first_author', 'no', '', '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-17 10:47:21', '2025-09-17 10:47:21', NULL, 1, 1, NULL, NULL),
(60, 94, 'Test Article Title', 'Journal Name', '2025-01-01', 'journal', 'TCI', '0.000', '', '', '', '', '', '5000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '5000.00', '0.00', '', 1, 'first_author', 'no', '', '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-17 10:48:36', '2025-09-17 10:48:36', NULL, 1, 1, NULL, NULL),
(61, 95, 'Article Title', 'Journal Name', '2025-03-01', 'journal', 'T5', '0.000', '', '', '', '', '', '50000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '50000.00', '0.00', '', 1, 'corresponding_author', 'no', '', '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-17 10:50:54', '2025-09-17 10:50:54', NULL, 1, 2, NULL, NULL),
(62, 96, 'Test Article Title', 'Test Journal Name', '2025-01-01', 'journal', 'TCI', '0.000', '', '', '', '', '', '5000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '5000.00', '0.00', '', 1, 'corresponding_author', 'no', '', '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-17 10:52:06', '2025-09-17 10:52:06', NULL, 3, 1, NULL, NULL),
(63, 97, 'Test Article Title', 'Test Journal Name', '2025-08-01', 'journal', 'TCI', '0.000', '', '', '', '', '', '5000.00', '5000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '5000.00', '5000.00', 'asdasd', 1, 'corresponding_author', 'no', '', '', NULL, NULL, 7, '2025-09-20 16:25:07', NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-17 11:16:56', '2025-09-20 16:25:07', NULL, 3, 1, NULL, NULL),
(64, 98, 'Article Title', 'Journal Name', '2025-06-01', 'journal', 'TCI', '0.000', '', '', '', '', '', '5000.00', '5000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '5000.00', '5000.00', '', 1, 'corresponding_author', 'no', '', '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-17 11:18:07', '2025-09-20 08:33:12', NULL, 1, 2, NULL, NULL),
(65, 99, 'Test Article Title', 'Test Journal Name', '2025-06-01', 'journal', 'T10', '0.000', '10.1016/j', 'https://example.ac.th', '123-145', 'Vol.10', 'ISI, Scopus, Web of Science', '45000.00', '45000.00', '2000.00', '2000.00', '10000.00', '1000.00', '0.00', '57000.00', '48000.00', '123/2555', 2, 'first_author', 'yes', '321', 'QS World University Rankings #543', NULL, NULL, 7, '2025-09-20 17:17:33', NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-20 16:35:39', '2025-09-20 17:34:52', NULL, 3, 2, NULL, NULL),
(66, 100, 'Test Article Title', 'Test Journal Name', '2025-04-01', 'journal', 'Q3', '0.000', '10.1016/j', 'https://example.ac.th', '', '', 'Scopus, Web of Science', '20000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '20000.00', '0.00', '', 2, 'first_author', 'no', '', '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-22 13:43:37', '2025-09-22 13:43:37', NULL, 1, 2, NULL, NULL),
(67, 101, 'Test Article Title', 'Test Journal Name', '2025-01-01', 'journal', 'T5', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Scopus, Web of Science', '50000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '50000.00', '0.00', '', 2, 'first_author', 'yes', 'FA-555', 'QS #500', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-22 16:11:53', '2025-09-22 16:11:53', NULL, 1, 2, NULL, NULL),
(68, 102, 'Test Article Title', 'Test Journal Name', '2025-02-01', 'journal', 'T5', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science, TCI', '50000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '50000.00', '0.00', '', 2, 'first_author', 'yes', 'FA-666', 'QS #500', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-22 16:51:50', '2025-09-22 16:51:50', NULL, 1, 2, 'Somchai Jaidee, Somying Jaiyen', 'SOMCHAI JAIDEE'),
(69, 104, 'Test Article Title', 'Test Journal Name', '2025-03-01', 'journal', 'Q3', '0.000', '', '', '', 'ฟหก', '', '20000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '20000.00', '0.00', '', 1, 'first_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-23 12:48:24', '2025-09-23 12:48:24', NULL, 1, 2, 'ฟหก', 'ฟหก'),
(70, 105, 'Test Article Title', 'Test Journal Name', '2025-01-01', 'journal', 'T5', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science, TCI', '50000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '50000.00', '0.00', '', 2, 'corresponding_author', 'no', NULL, 'QS #500', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-23 13:50:59', '2025-09-23 13:50:59', NULL, 1, 2, 'asdasd, asdasd', 'spw'),
(71, 106, 'Test Article Title', 'Test Journal Name', '2025-01-01', 'journal', 'T5', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science', '50000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '50000.00', '0.00', '', 4, 'first_author', 'yes', 'FA-777', 'QS #501', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-23 15:05:03', '2025-09-23 15:05:03', NULL, 1, 2, 'a, b, c', 'somchai jaidee'),
(72, 107, 'Test Article Title', 'Test Journal Name', '2022-06-01', 'journal', 'TCI', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science, TCI', '5000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '5000.00', '0.00', '', 2, 'corresponding_author', 'yes', 'FA-777', 'QS #500', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-23 15:06:29', '2025-09-23 15:06:29', NULL, 1, 2, 'a, b', 'sasdasd'),
(73, 108, 'Test Article Title', 'Test Journal Name', '2025-03-01', 'journal', 'Q2', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science, TCI', '30000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '30000.00', '0.00', '', 3, 'corresponding_author', 'yes', 'FA-777', 'QS #500', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-23 15:29:14', '2025-09-23 15:29:14', NULL, 1, 2, 'asd asd', 'spw'),
(74, 109, 'Test Article Title', 'Test Journal Name', '2025-10-01', 'journal', 'TCI', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Scopus, Web of Science', '5000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '5000.00', '0.00', '', 4, 'first_author', 'yes', NULL, 'QS #500', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-23 16:20:14', '2025-09-23 16:20:14', NULL, 1, 2, 'a b', 'somchai jaidee'),
(75, 110, 'Test Article Title', 'Test Journal Name', '2025-02-01', 'journal', 'TCI', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Scopus', '5000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '5000.00', '0.00', '', 2, 'corresponding_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-23 16:25:33', '2025-09-23 16:25:33', NULL, 1, 2, 'a b', 'sasdasd'),
(76, 111, 'Test Article Title', 'Test Journal Name', '2025-11-01', 'journal', 'Q4', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Scopus, Web of Science', '10000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '10000.00', '0.00', '', 4, 'corresponding_author', 'yes', 'FA-777', 'QS #500', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-24 11:58:49', '2025-09-24 11:58:49', NULL, 1, 2, 'l', 'somchai jaidee');

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
(8, 'timer', 'success', NULL, '2025-09-24 00:00:13', '2025-09-24 00:01:44', 2, 0, 18, 0, 18, 0, '2025-09-24 00:00:13', '2025-09-24 00:01:44', NULL);

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
(51, 'publication_reward', 'PR-20250827-0001', 8, 3, 2, 14, 19, 3, '2025-08-27 14:48:23', NULL, NULL, NULL, '2025-09-04 17:19:01', 7, NULL, NULL, NULL, '2025-08-27 14:48:22', '2025-09-14 02:21:06', NULL),
(52, 'publication_reward', 'PR-20250827-0002', 8, 3, 2, 14, 20, 2, '2025-08-27 18:32:13', NULL, NULL, NULL, '2025-08-29 16:09:33', 7, NULL, NULL, NULL, '2025-08-27 18:32:12', '2025-08-29 16:09:33', NULL),
(53, 'publication_reward', 'PR-20250827-0003', 8, 3, 2, 15, 23, 2, '2025-08-27 21:08:29', NULL, NULL, NULL, '2025-09-03 08:48:13', 7, NULL, NULL, NULL, '2025-08-27 21:08:29', '2025-09-03 08:48:13', NULL),
(61, 'fund_application', 'FA-20250829-0008', 8, 3, 1, 1, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-08-29 21:31:50', '2025-09-03 12:49:13', NULL),
(62, 'fund_application', 'FA-20250901-0001', 8, 3, 1, 1, NULL, 1, '2025-09-01 12:04:10', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-01 12:04:10', '2025-09-03 12:49:11', NULL),
(63, 'fund_application', 'FA-20250901-0002', 8, 3, 1, 1, NULL, 1, '2025-09-01 12:32:10', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-01 12:32:10', '2025-09-01 12:32:10', NULL),
(64, 'fund_application', 'FA-20250901-0003', 8, 3, 1, 1, NULL, 1, '2025-09-01 13:03:42', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-01 13:03:42', '2025-09-01 13:03:42', NULL),
(65, 'fund_application', 'FA-20250901-0004', 8, 3, 1, 2, 2, 1, '2025-09-01 13:10:10', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-01 13:10:10', '2025-09-01 13:10:10', NULL),
(66, 'fund_application', 'FA-20250902-0001', 8, 3, 1, 1, 1, 1, '2025-09-02 12:13:53', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-02 12:13:53', '2025-09-02 12:13:53', NULL),
(67, 'fund_application', 'FA-20250903-0001', 8, 3, 1, 9, 11, 1, '2025-09-03 12:49:45', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-03 12:49:45', '2025-09-03 12:49:45', NULL),
(68, 'fund_application', 'FA-20250903-0002', 8, 3, 1, 1, 1, 1, '2025-09-03 13:13:43', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-03 13:13:43', '2025-09-03 13:13:43', NULL),
(69, 'fund_application', 'FA-20250904-0001', 8, 3, 1, 1, 1, 1, '2025-09-04 18:14:38', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-04 18:14:38', '2025-09-04 18:14:38', NULL),
(70, 'fund_application', 'FA-20250904-0002', 8, 3, 1, 10, 12, 2, '2025-09-04 18:15:21', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-04 18:15:21', '2025-09-06 13:11:30', NULL),
(72, 'fund_application', 'FA-20250909-0001', 8, 3, 1, 1, 1, 1, '2025-09-09 10:58:06', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-09 10:58:06', '2025-09-09 10:58:06', NULL),
(73, 'fund_application', 'FA-20250909-0002', 8, 3, 1, 1, 1, 1, '2025-09-09 11:37:22', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-09 11:37:22', '2025-09-09 11:37:22', NULL),
(81, 'publication_reward', 'PR-20250912-0008', 8, 3, 2, 14, 32, 2, '2025-09-12 14:25:55', NULL, NULL, NULL, '2025-09-13 16:04:48', 7, NULL, NULL, NULL, '2025-09-12 14:25:55', '2025-09-13 16:04:48', NULL),
(82, 'publication_reward', 'PR-20250913-0001', 8, 3, 2, 14, 31, 1, '2025-09-13 03:11:08', NULL, NULL, NULL, '2025-09-13 17:15:15', 7, NULL, NULL, NULL, '2025-09-13 03:11:08', '2025-09-14 08:19:17', NULL),
(83, 'fund_application', 'FA-25680913-0013', 8, 3, 1, 1, 1, 1, '2025-09-13 15:09:12', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-13 15:09:12', '2025-09-13 15:09:12', NULL),
(84, 'fund_application', 'FA-25680914-0002', 8, 3, 1, 2, 2, 1, '2025-09-14 08:00:36', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-14 08:00:36', '2025-09-14 08:00:36', NULL),
(85, 'publication_reward', 'PR-25680915-0001', 8, 3, 2, 14, 31, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-15 07:23:17', '2025-09-15 07:23:17', NULL),
(86, 'publication_reward', 'PR-25680915-0002', 8, 3, 2, 14, 22, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-15 07:23:46', '2025-09-15 07:23:46', NULL),
(87, 'publication_reward', 'PR-25680915-0003', 8, 3, 2, 14, 31, 1, '2025-09-15 07:36:39', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-15 07:36:39', '2025-09-15 07:36:39', NULL),
(88, 'publication_reward', 'PR-25680915-0004', 8, 3, 2, 14, 21, 1, '2025-09-15 07:38:57', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-15 07:38:57', '2025-09-15 07:38:57', NULL),
(89, 'publication_reward', 'PR-25680917-0005', 8, 3, 2, 14, 31, 1, '2025-09-17 09:21:06', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-17 09:21:06', '2025-09-17 09:21:06', NULL),
(90, 'publication_reward', 'PR-25680917-0006', 8, 3, 2, 14, 32, 1, '2025-09-17 09:38:06', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-17 09:38:06', '2025-09-17 09:38:06', NULL),
(91, 'publication_reward', 'PR-25680917-0007', 8, 3, 2, 14, 31, 1, '2025-09-17 10:21:31', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-17 10:21:31', '2025-09-17 10:21:31', NULL),
(92, 'publication_reward', 'PR-25680917-0008', 8, 3, 2, 14, 21, 1, '2025-09-17 10:30:45', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-17 10:30:44', '2025-09-17 10:30:45', NULL),
(93, 'publication_reward', 'PR-25680917-0009', 8, 3, 2, 14, 19, 1, '2025-09-17 10:47:21', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-17 10:47:20', '2025-09-17 10:47:21', NULL),
(94, 'publication_reward', 'PR-25680917-0010', 8, 3, 2, 14, 33, 1, '2025-09-17 10:48:36', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-17 10:48:36', '2025-09-17 10:48:36', NULL),
(95, 'publication_reward', 'PR-25680917-0011', 8, 3, 2, 14, 19, 1, '2025-09-17 10:50:54', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-17 10:50:53', '2025-09-17 10:50:54', NULL),
(96, 'publication_reward', 'PR-25680917-0012', 8, 3, 2, 14, 33, 1, '2025-09-17 10:52:06', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-17 10:52:06', '2025-09-17 10:52:06', NULL),
(97, 'publication_reward', 'PR-25680917-0013', 8, 3, 2, 14, 33, 2, '2025-09-17 11:16:56', NULL, NULL, NULL, '2025-09-20 16:25:07', 7, NULL, NULL, NULL, '2025-09-17 11:16:56', '2025-09-20 16:25:07', NULL),
(98, 'publication_reward', 'PR-25680917-0014', 8, 3, 2, 14, 33, 2, '2025-09-17 11:18:07', NULL, NULL, NULL, '2025-09-20 08:33:12', 7, NULL, NULL, NULL, '2025-09-17 11:18:07', '2025-09-20 08:33:12', NULL),
(99, 'publication_reward', 'PR-25680920-0015', 8, 3, 2, 14, 20, 2, '2025-09-20 16:35:40', NULL, NULL, NULL, '2025-09-20 17:17:33', 7, NULL, NULL, NULL, '2025-09-20 16:35:39', '2025-09-20 17:17:33', NULL),
(100, 'publication_reward', 'PR-25680922-0016', 13, 3, 2, 14, 31, 1, '2025-09-22 13:43:38', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-22 13:43:37', '2025-09-22 13:43:38', NULL),
(101, 'publication_reward', 'PR-25680922-0017', 8, 3, 2, 14, 19, 1, '2025-09-22 16:11:53', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-22 16:11:53', '2025-09-22 16:11:53', NULL),
(102, 'publication_reward', 'PR-25680922-0018', 8, 3, 2, 14, 19, 1, '2025-09-22 16:51:50', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-22 16:51:50', '2025-09-22 16:51:50', NULL),
(103, 'fund_application', 'FA-25680923-0003', 8, 3, 1, 1, 1, 1, '2025-09-23 12:43:25', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-23 12:43:25', '2025-09-23 12:43:25', NULL),
(104, 'publication_reward', 'PR-25680923-0019', 8, 3, 2, 14, 31, 1, '2025-09-23 12:48:24', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-23 12:48:24', '2025-09-23 12:48:24', NULL),
(105, 'publication_reward', 'PR-25680923-0020', 8, 3, 2, 14, 19, 6, '2025-09-23 13:50:59', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-23 13:50:59', '2025-09-23 13:50:59', NULL),
(106, 'publication_reward', 'PR-25680923-0021', 8, 3, 2, 14, 19, 6, '2025-09-23 15:05:04', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-23 15:04:19', '2025-09-23 15:05:04', NULL),
(107, 'publication_reward', 'PR-25680923-0022', 8, 3, 2, 14, 33, 6, '2025-09-23 15:06:30', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-23 15:06:29', '2025-09-23 15:06:30', NULL),
(108, 'publication_reward', 'PR-25680923-0023', 8, 3, 2, 14, 22, 6, '2025-09-23 15:29:14', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-23 15:29:14', '2025-09-23 15:29:14', NULL),
(109, 'publication_reward', 'PR-25680923-0024', 8, 3, 2, 14, 33, 6, '2025-09-23 16:20:14', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-23 16:20:14', '2025-09-23 16:20:14', NULL),
(110, 'publication_reward', 'PR-25680923-0025', 8, 3, 2, 15, 33, 6, '2025-09-23 16:25:34', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-23 16:25:33', '2025-09-23 16:25:34', NULL),
(111, 'publication_reward', 'PR-25680924-0026', 8, 3, 2, 15, 32, 6, '2025-09-24 11:58:50', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-24 11:58:49', '2025-09-24 11:58:50', NULL);

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
(85, 51, 85, 2, 'sample-local-pdf.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-08-27 14:48:23'),
(86, 51, 86, 3, 'sample.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-08-27 14:48:23'),
(87, 52, 87, 2, 'sample.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-08-27 18:32:12'),
(88, 52, 88, 3, 'file-sample_150kB.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-08-27 18:32:12'),
(89, 52, 89, 12, 'เอกสารเบิกจ่ายภายนอก: ไม่ระบุ', 3, 0, 0, NULL, NULL, '2025-08-27 18:32:12'),
(90, 53, 90, 2, 'sample.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-08-27 21:08:29'),
(91, 53, 91, 3, 'file-sample_150kB.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-08-27 21:08:29'),
(92, 53, 92, 12, 'เอกสารเบิกจ่ายภายนอก: ไม่ระบุ', 3, 0, 0, NULL, NULL, '2025-08-27 21:08:29'),
(93, 62, 94, 2, '', 0, 1, 0, NULL, NULL, '2025-09-01 12:04:10'),
(94, 62, 93, 3, '', 0, 1, 0, NULL, NULL, '2025-09-01 12:04:10'),
(95, 62, 96, 4, '', 0, 1, 0, NULL, NULL, '2025-09-01 12:04:10'),
(96, 62, 95, 13, '', 0, 1, 0, NULL, NULL, '2025-09-01 12:04:10'),
(97, 63, 97, 3, '', 0, 1, 0, NULL, NULL, '2025-09-01 12:32:10'),
(98, 63, 98, 4, '', 0, 1, 0, NULL, NULL, '2025-09-01 12:32:10'),
(99, 63, 100, 13, '', 0, 1, 0, NULL, NULL, '2025-09-01 12:32:10'),
(100, 63, 99, 2, '', 0, 1, 0, NULL, NULL, '2025-09-01 12:32:10'),
(101, 64, 101, 3, '', 0, 1, 0, NULL, NULL, '2025-09-01 13:03:42'),
(102, 64, 102, 2, '', 0, 1, 0, NULL, NULL, '2025-09-01 13:03:42'),
(103, 64, 104, 4, '', 0, 1, 0, NULL, NULL, '2025-09-01 13:03:42'),
(104, 64, 103, 13, '', 0, 1, 0, NULL, NULL, '2025-09-01 13:03:42'),
(105, 65, 106, 13, '', 0, 1, 0, NULL, NULL, '2025-09-01 13:10:10'),
(106, 65, 108, 2, '', 0, 1, 0, NULL, NULL, '2025-09-01 13:10:10'),
(107, 65, 105, 4, '', 0, 1, 0, NULL, NULL, '2025-09-01 13:10:10'),
(108, 65, 107, 3, '', 0, 1, 0, NULL, NULL, '2025-09-01 13:10:10'),
(109, 66, 111, 13, '', 0, 1, 0, NULL, NULL, '2025-09-02 12:13:53'),
(110, 66, 109, 2, '', 0, 1, 0, NULL, NULL, '2025-09-02 12:13:53'),
(111, 66, 112, 3, '', 0, 1, 0, NULL, NULL, '2025-09-02 12:13:53'),
(112, 66, 110, 4, '', 0, 1, 0, NULL, NULL, '2025-09-02 12:13:53'),
(113, 67, 114, 2, '', 0, 1, 0, NULL, NULL, '2025-09-03 12:49:45'),
(114, 67, 113, 3, '', 0, 1, 0, NULL, NULL, '2025-09-03 12:49:45'),
(115, 67, 115, 4, '', 0, 1, 0, NULL, NULL, '2025-09-03 12:49:45'),
(116, 68, 116, 2, 'form.pdf', 1, 0, 0, NULL, NULL, '2025-09-03 13:13:43'),
(117, 68, 118, 4, 'sample-local-pdf.pdf', 3, 0, 0, NULL, NULL, '2025-09-03 13:13:43'),
(118, 68, 119, 13, 'sample-local-pdf.pdf', 4, 0, 0, NULL, NULL, '2025-09-03 13:13:43'),
(119, 68, 117, 3, 'form.pdf', 2, 0, 0, NULL, NULL, '2025-09-03 13:13:43'),
(120, 69, 124, 4, 'sample-local-pdf.pdf', 3, 0, 0, NULL, NULL, '2025-09-04 18:14:38'),
(121, 69, 121, 13, 'form.pdf', 4, 0, 0, NULL, NULL, '2025-09-04 18:14:38'),
(122, 69, 122, 3, 'sample-local-pdf.pdf', 2, 0, 0, NULL, NULL, '2025-09-04 18:14:38'),
(123, 69, 120, 15, 'form.pdf', 5, 0, 0, NULL, NULL, '2025-09-04 18:14:38'),
(124, 69, 123, 2, 'sample-local-pdf.pdf', 1, 0, 0, NULL, NULL, '2025-09-04 18:14:38'),
(125, 70, 125, 2, 'sample-local-pdf.pdf', 1, 0, 0, NULL, NULL, '2025-09-04 18:15:21'),
(126, 70, 126, 3, 'sample-local-pdf.pdf', 2, 0, 0, NULL, NULL, '2025-09-04 18:15:21'),
(127, 70, 127, 4, 'sample-local-pdf.pdf', 3, 0, 0, NULL, NULL, '2025-09-04 18:15:21'),
(133, 72, 134, 9, 'sample-local-pdf.pdf', 4, 0, 0, NULL, NULL, '2025-09-09 10:58:06'),
(134, 72, 137, 4, 'sample-local-pdf.pdf', 3, 0, 0, NULL, NULL, '2025-09-09 10:58:06'),
(135, 72, 133, 2, 'sample-local-pdf.pdf', 1, 0, 0, NULL, NULL, '2025-09-09 10:58:06'),
(136, 72, 135, 3, 'sample-local-pdf.pdf', 2, 0, 0, NULL, NULL, '2025-09-09 10:58:06'),
(137, 72, 136, 13, 'sample-local-pdf.pdf', 5, 0, 0, NULL, NULL, '2025-09-09 10:58:06'),
(138, 73, 139, 3, 'sample-local-pdf.pdf', 2, 0, 0, NULL, NULL, '2025-09-09 11:37:22'),
(139, 73, 138, 2, 'sample-local-pdf.pdf', 1, 0, 0, NULL, NULL, '2025-09-09 11:37:22'),
(140, 73, 141, 13, 'sample-local-pdf.pdf', 4, 0, 0, NULL, NULL, '2025-09-09 11:37:22'),
(141, 73, 140, 4, 'sample-local-pdf.pdf', 3, 0, 0, NULL, NULL, '2025-09-09 11:37:22'),
(163, 81, 163, 2, 'sample-local-pdf.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-09-12 14:25:55'),
(164, 81, 164, 3, 'sample.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-09-12 14:25:55'),
(165, 81, 165, 11, 'เอกสารรวม (Merged PDF)', 3, 0, 0, NULL, NULL, '2025-09-12 14:25:55'),
(166, 82, 166, 2, 'sample-local-pdf.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-09-13 03:11:08'),
(167, 82, 167, 3, 'sample.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-09-13 03:11:08'),
(168, 82, 168, 11, 'เอกสารรวม (Merged PDF)', 3, 0, 0, NULL, NULL, '2025-09-13 03:11:08'),
(169, 83, 169, 13, 'sample-local-pdf.pdf', 4, 0, 0, NULL, NULL, '2025-09-13 15:09:12'),
(170, 83, 170, 2, 'sample-local-pdf.pdf', 1, 0, 0, NULL, NULL, '2025-09-13 15:09:12'),
(171, 83, 172, 4, 'sample-local-pdf.pdf', 3, 0, 0, NULL, NULL, '2025-09-13 15:09:12'),
(172, 83, 171, 3, 'sample-local-pdf.pdf', 2, 0, 0, NULL, NULL, '2025-09-13 15:09:12'),
(173, 84, 174, 3, 'sample-local-pdf.pdf', 2, 0, 0, NULL, NULL, '2025-09-14 08:00:36'),
(174, 84, 173, 2, 'sample-local-pdf.pdf', 1, 0, 0, NULL, NULL, '2025-09-14 08:00:36'),
(175, 84, 176, 13, 'sample-local-pdf.pdf', 4, 0, 0, NULL, NULL, '2025-09-14 08:00:36'),
(176, 84, 175, 4, 'sample-local-pdf.pdf', 3, 0, 0, NULL, NULL, '2025-09-14 08:00:36'),
(177, 87, 177, 2, 'sample.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-09-15 07:36:39'),
(178, 87, 178, 3, 'sample-local-pdf.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-09-15 07:36:39'),
(179, 87, 179, 11, 'เอกสารรวม (Merged PDF)', 3, 0, 0, NULL, NULL, '2025-09-15 07:36:39'),
(180, 88, 180, 2, 'sample-local-pdf.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-09-15 07:38:57'),
(181, 88, 181, 3, 'sample.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-09-15 07:38:57'),
(182, 89, 182, 2, 'sample-local-pdf.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-09-17 09:21:06'),
(183, 89, 183, 3, 'sample.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-09-17 09:21:06'),
(184, 90, 184, 2, 'sample.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-09-17 09:38:06'),
(185, 90, 185, 3, 'sample-local-pdf.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-09-17 09:38:06'),
(186, 91, 186, 2, 'sample.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-09-17 10:21:31'),
(187, 92, 187, 2, 'sample.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-09-17 10:30:45'),
(188, 93, 188, 2, 'sample.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-09-17 10:47:21'),
(189, 93, 189, 3, 'sample-local-pdf.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-09-17 10:47:21'),
(190, 94, 190, 2, 'sample.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-09-17 10:48:36'),
(191, 94, 191, 3, 'sample-local-pdf.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-09-17 10:48:36'),
(192, 95, 192, 2, 'sample.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-09-17 10:50:54'),
(193, 95, 193, 3, 'sample-local-pdf.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-09-17 10:50:54'),
(194, 96, 194, 2, 'sample.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-09-17 10:52:06'),
(195, 96, 195, 3, 'sample-local-pdf.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-09-17 10:52:06'),
(196, 97, 196, 2, 'sample.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-09-17 11:16:56'),
(197, 97, 197, 3, 'sample-local-pdf.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-09-17 11:16:56'),
(198, 98, 198, 2, 'sample.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-09-17 11:18:07'),
(199, 98, 199, 3, 'sample-local-pdf.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-09-17 11:18:07'),
(200, 99, 200, 2, 'sample.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-09-20 16:35:39'),
(201, 99, 201, 3, 'c4611_sample_explain.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-09-20 16:35:40'),
(202, 99, 202, 12, 'เอกสารเบิกจ่ายภายนอก: ไม่ระบุ', 3, 0, 0, NULL, NULL, '2025-09-20 16:35:40'),
(203, 100, 203, 2, 'sample.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-09-22 13:43:37'),
(204, 100, 204, 3, 'sample-local-pdf.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-09-22 13:43:38'),
(205, 101, 205, 2, '1. 1574-68 หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย นวัตกรรม และบริการวิชาการ (2568).pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-09-22 16:11:53'),
(206, 102, 206, 2, '1. 1574-68 หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย นวัตกรรม และบริการวิชาการ (2568).pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-09-22 16:51:50'),
(207, 103, 208, 2, '1. 1574-68 หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย นวัตกรรม และบริการวิชาการ (2568).pdf', 1, 0, 0, NULL, NULL, '2025-09-23 12:43:25'),
(208, 103, 210, 3, '1. 1574-68 หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย นวัตกรรม และบริการวิชาการ (2568).pdf', 2, 0, 0, NULL, NULL, '2025-09-23 12:43:25'),
(209, 103, 209, 13, '1. 1574-68 หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย นวัตกรรม และบริการวิชาการ (2568).pdf', 4, 0, 0, NULL, NULL, '2025-09-23 12:43:25'),
(210, 103, 207, 4, '1. 1574-68 หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย นวัตกรรม และบริการวิชาการ (2568).pdf', 3, 0, 0, NULL, NULL, '2025-09-23 12:43:25'),
(211, 104, 211, 2, 'sample.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-09-23 12:48:24'),
(212, 104, 212, 3, 'sample-local-pdf.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-09-23 12:48:24'),
(213, 105, 213, 2, 'form.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-09-23 13:50:59'),
(214, 106, 214, 2, 'form.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-09-23 15:05:03'),
(215, 106, 215, 3, '1. 1574-68 หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย นวัตกรรม และบริการวิชาการ (2568).pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-09-23 15:05:04'),
(216, 107, 216, 2, 'form.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-09-23 15:06:29'),
(217, 107, 217, 3, '1. 1574-68 หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย นวัตกรรม และบริการวิชาการ (2568).pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-09-23 15:06:30'),
(218, 108, 218, 2, '1. 1574-68 หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย นวัตกรรม และบริการวิชาการ (2568).pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-09-23 15:29:14'),
(219, 108, 219, 3, 'form.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-09-23 15:29:14'),
(220, 109, 220, 2, '1. 1574-68 หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย นวัตกรรม และบริการวิชาการ (2568).pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-09-23 16:20:14'),
(221, 110, 221, 2, '1. 1574-68 หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย นวัตกรรม และบริการวิชาการ (2568).pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-09-23 16:25:33'),
(222, 110, 222, 3, 'form.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-09-23 16:25:33'),
(223, 111, 223, 2, '1. 1574-68 หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย นวัตกรรม และบริการวิชาการ (2568).pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-09-24 11:58:50');

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

--
-- Dumping data for table `submission_status_history`
--

INSERT INTO `submission_status_history` (`history_id`, `submission_id`, `old_status_id`, `new_status_id`, `changed_by`, `reason`, `notes`, `created_at`) VALUES
(1, 111, 1, 6, 8, NULL, 'auto:submitted_for_dept_head_review', '2025-09-24 11:58:50');

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
(92, 51, 8, 'owner', 1, 1, '2025-08-27 14:48:22'),
(93, 51, 1, 'coauthor', 0, 2, '2025-08-27 14:48:22'),
(94, 51, 9, 'coauthor', 0, 3, '2025-08-27 14:48:22'),
(95, 52, 8, 'owner', 1, 1, '2025-08-27 18:32:12'),
(96, 52, 1, 'coauthor', 0, 2, '2025-08-27 18:32:12'),
(97, 52, 9, 'coauthor', 0, 3, '2025-08-27 18:32:12'),
(98, 53, 8, 'owner', 1, 1, '2025-08-27 21:08:29'),
(99, 53, 1, 'coauthor', 0, 2, '2025-08-27 21:08:29'),
(100, 53, 9, 'coauthor', 0, 3, '2025-08-27 21:08:29'),
(113, 81, 8, 'owner', 1, 1, '2025-09-12 14:25:55'),
(114, 81, 9, 'coauthor', 0, 2, '2025-09-12 14:25:55'),
(115, 82, 8, 'owner', 1, 1, '2025-09-13 03:11:08'),
(116, 87, 8, 'owner', 1, 1, '2025-09-15 07:36:39'),
(117, 88, 8, 'owner', 1, 1, '2025-09-15 07:38:57'),
(118, 89, 8, 'owner', 1, 1, '2025-09-17 09:21:06'),
(119, 90, 8, 'owner', 1, 1, '2025-09-17 09:38:06'),
(120, 91, 8, 'owner', 1, 1, '2025-09-17 10:21:31'),
(121, 92, 8, 'owner', 1, 1, '2025-09-17 10:30:44'),
(122, 93, 8, 'owner', 1, 1, '2025-09-17 10:47:21'),
(123, 94, 8, 'owner', 1, 1, '2025-09-17 10:48:36'),
(124, 95, 8, 'owner', 1, 1, '2025-09-17 10:50:54'),
(125, 96, 8, 'owner', 1, 1, '2025-09-17 10:52:06'),
(126, 97, 8, 'owner', 1, 1, '2025-09-17 11:16:56'),
(127, 98, 8, 'owner', 1, 1, '2025-09-17 11:18:07'),
(128, 99, 8, 'owner', 1, 1, '2025-09-20 16:35:39'),
(129, 99, 1, 'coauthor', 0, 2, '2025-09-20 16:35:39'),
(130, 100, 13, 'owner', 1, 1, '2025-09-22 13:43:37'),
(131, 100, 1, 'coauthor', 0, 2, '2025-09-22 13:43:37'),
(132, 101, 8, 'owner', 1, 1, '2025-09-22 16:11:53'),
(133, 101, 1, 'coauthor', 0, 2, '2025-09-22 16:11:53'),
(134, 102, 8, 'owner', 1, 1, '2025-09-22 16:51:50'),
(135, 102, 1, 'coauthor', 0, 2, '2025-09-22 16:51:50'),
(136, 104, 8, 'owner', 1, 1, '2025-09-23 12:48:24'),
(137, 105, 8, 'owner', 1, 1, '2025-09-23 13:50:59'),
(138, 105, 1, 'coauthor', 0, 2, '2025-09-23 13:50:59'),
(139, 106, 8, 'owner', 1, 1, '2025-09-23 15:04:19'),
(140, 106, 1, 'coauthor', 0, 2, '2025-09-23 15:04:19'),
(141, 106, 9, 'coauthor', 0, 3, '2025-09-23 15:04:19'),
(142, 106, 12, 'coauthor', 0, 4, '2025-09-23 15:04:19'),
(143, 107, 8, 'owner', 1, 1, '2025-09-23 15:06:29'),
(144, 107, 1, 'coauthor', 0, 2, '2025-09-23 15:06:29'),
(145, 108, 8, 'owner', 1, 1, '2025-09-23 15:29:14'),
(146, 108, 9, 'coauthor', 0, 2, '2025-09-23 15:29:14'),
(147, 108, 12, 'coauthor', 0, 3, '2025-09-23 15:29:14'),
(148, 109, 8, 'owner', 1, 1, '2025-09-23 16:20:14'),
(149, 109, 1, 'coauthor', 0, 2, '2025-09-23 16:20:14'),
(150, 109, 9, 'coauthor', 0, 3, '2025-09-23 16:20:14'),
(151, 109, 12, 'coauthor', 0, 4, '2025-09-23 16:20:14'),
(152, 110, 8, 'owner', 1, 1, '2025-09-23 16:25:33'),
(153, 110, 9, 'coauthor', 0, 2, '2025-09-23 16:25:33'),
(154, 111, 8, 'owner', 1, 1, '2025-09-24 11:58:49'),
(155, 111, 9, 'coauthor', 0, 2, '2025-09-24 11:58:49'),
(156, 111, 1, 'coauthor', 0, 3, '2025-09-24 11:58:49'),
(157, 111, 12, 'coauthor', 0, 4, '2025-09-24 11:58:49');

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
(1, '1.0.0', '2025-09-23 11:18:55', NULL, '2568', '2025-08-29 21:01:00', '2025-10-16 10:00:00', 1, 2, 3, 1, 2, '2561', 5);

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
  `date_of_employment` datetime DEFAULT NULL,
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
(8, 'สมชาย', 'ใจดี', 'male', 'aum.kitsanapong@gmail.com', '_lza5VIAAAAJ', '$2a$10$sPaTxAZ.Bp4fxHGBg.awZ.a5jq72uWXeRAQHLK.3LTluhNoliaRYG', 1, 1, '2025-09-17 17:00:15', '2025-07-31 17:52:46', '2025-07-31 17:52:46', NULL),
(9, 'สมหญิง', 'รักการศึกษา', 'female', 'teacher2@cpkku.ac.th', '_XXXXXXXXXXZ', '$2a$10$mgxuR9pZ5HfndfDoHd/ZquUQYAKztvxZBpT417iX05TLOC.axULf2', 1, 2, NULL, '2025-07-31 17:52:46', '2025-07-31 17:52:46', NULL),
(10, 'สุดา', 'ช่วยเหลือ', 'female', 'staff@cpkku.ac.th', NULL, '$2a$10$Df2y47XVO7Eugd/DLXJSAuIqXktScmsvhTSRzANBQzqSOCmuPSi1C', 2, 3, NULL, '2025-07-31 17:52:46', '2025-07-31 17:52:46', NULL),
(11, 'ผู้ดูแล', 'ระบบ', 'male', 'admin@cpkku.ac.th', NULL, '$2a$10$JL5vSA37ApBjYy8Yn3dzd.JznwUc4PvU7BWw1HvG4Er5hfuJ8ypxO', 3, 3, NULL, '2025-09-22 14:48:29', '2025-09-22 14:48:29', NULL),
(12, 'สมชาย', 'ใจดี', 'male', 'teacher@cpkku.ac.th', NULL, '$2a$10$6ZjpWSb79tlPLB4YViD/aet//OVVG2MigdyHqIrNX.RXyA6UVUaf.', 1, 1, '2025-09-16 17:00:19', '2025-09-22 14:48:29', '2025-09-22 14:48:29', NULL),
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
(8, 5, 5, 3, 2, 123, 95, '{\"2017\":1,\"2018\":6,\"2019\":21,\"2020\":8,\"2021\":13,\"2022\":19,\"2023\":24,\"2024\":16,\"2025\":15}', '2025-09-24 00:01:02'),
(9, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-24 00:01:44');

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
(23, 8, '9c452368-1a61-4e8e-b7d9-d68140c5dfda', 'h2_uVFJ_W2GG4726q0cNkZEjMU4BsASAKMP3Ido5G7w=', 'Chrome Browser', 'web', '58.11.71.81', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', '2025-08-06 12:04:59', '2025-09-05 11:40:43', 1, '2025-08-06 11:40:43', '2025-08-06 12:04:59'),
(24, 7, 'ad02a5db-95aa-4696-ae7e-30a937694fe1', '8amfrnG6pKEDlzI4AOK4IJqyqy1xu4iITV2QK611fHA=', 'Chrome Browser', 'web', '58.11.85.73', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', '2025-08-07 01:15:50', '2025-09-05 22:03:49', 0, '2025-08-06 22:03:49', '2025-08-07 01:15:50'),
(25, 8, '3c8f1b54-11fb-4ec0-8813-25543e237d83', 'ZkKXFYm2Ph-st0HezFOH1KSTZcx6nbVfv_y48-L2hM8=', 'Chrome Browser', 'web', '58.11.85.73', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', '2025-08-07 06:11:59', '2025-09-06 01:15:59', 1, '2025-08-07 01:15:59', '2025-08-07 06:11:59'),
(26, 8, '9dfd4664-ec7b-4b69-ba74-6efc3f93b5bc', 'yXI19rJ0peiTAJR3pObJ30SedqpOHQO41pOZ6hrrgpY=', 'Chrome Browser', 'web', '58.11.85.73', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', '2025-08-07 14:01:47', '2025-09-06 13:33:42', 1, '2025-08-07 13:33:42', '2025-08-07 14:01:47'),
(27, 7, '1038c846-1075-4783-b694-827ce31baba3', 'NrQYwvk--sVk3NqWHMWDtrEqvpQHsxCsEMaHHdxY5o0=', 'Chrome Browser', 'web', '58.11.85.73', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', '2025-08-07 20:17:42', '2025-09-06 16:49:03', 1, '2025-08-07 16:49:03', '2025-08-07 20:17:42'),
(28, 7, 'd5405339-1bb9-4d0e-983f-75003bee696b', '_pZeHz6qf7AzqYvrNjDue7n9biAUV_Vtl-_GxLp2xRE=', 'Chrome Browser', 'web', '58.11.85.73', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', '2025-08-08 12:18:12', '2025-09-07 02:33:09', 1, '2025-08-08 02:33:09', '2025-08-08 12:18:12'),
(29, 7, '673eced7-2284-441e-a38f-3507562624ab', 'L_YZpdgZYWhwOSxNMP4AnpL-Rl_ENfZ0kKbZeHEtx1w=', 'Chrome Browser', 'web', '58.11.85.73', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', '2025-08-08 14:58:51', '2025-09-07 14:21:38', 1, '2025-08-08 14:21:38', '2025-08-08 14:58:51'),
(30, 7, 'aa0439b1-cbf5-41b1-9a1a-24f33993fef4', 'hnsuVtjVScBDfg6wWB4PCWHXPS70IaJg7HKeCni3_Sk=', 'Chrome Browser', 'web', '58.11.85.73', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', '2025-08-08 18:10:44', '2025-09-07 15:40:31', 1, '2025-08-08 15:40:31', '2025-08-08 18:10:44'),
(31, 7, 'd2100b6f-b3df-4850-84fa-71ee185e3db3', 'b6A0SuteEP1MdHwP9b5HxM8CVxxJFZ7J5Gg5jjrjR0k=', '', 'api_client', '110.168.238.46', 'PostmanRuntime/7.45.0', '2025-08-08 16:07:17', '2025-09-07 16:06:12', 1, '2025-08-08 16:06:12', '2025-08-08 16:07:17'),
(32, 7, '32d78ca4-4e73-476b-b916-989094b55c3c', 'psKmPkYcoYCCXd-fK7N8YfU5aWCQX7WbHg6j4lnNjWQ=', 'Chrome Browser', 'web', '58.11.85.73', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', '2025-08-08 21:37:45', '2025-09-07 19:36:30', 1, '2025-08-08 19:36:30', '2025-08-08 21:37:45'),
(33, 7, '6d056236-3ae0-4d46-ac2a-33249292b20b', '26HwD33jydwP4ur37hPNWxwumGRhEcJR32h2eEk9Zs8=', 'Chrome Browser', 'web', '58.11.85.73', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', '2025-08-08 23:15:04', '2025-09-07 21:51:58', 1, '2025-08-08 21:51:58', '2025-08-08 23:15:04'),
(34, 7, 'f877555a-0393-4ef8-b812-a8d4cbbcbd2e', 'gm21KeuRY_yYCchc6g2lqhLRUjGPRDi0gRuctmr0UpI=', 'Chrome Browser', 'web', '58.10.128.241', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-10 13:13:24', '2025-09-09 12:34:52', 1, '2025-08-10 12:34:52', '2025-08-10 13:13:24'),
(35, 7, 'fbb38821-d672-4a58-8281-6a7b54daf88f', 'zeOfHeY0_oCp1iHku1MP3ovzT1AdXMm6TQ3nCQ0zjCQ=', 'Chrome Browser', 'web', '58.10.128.241', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-10 16:17:07', '2025-09-09 14:40:27', 1, '2025-08-10 14:40:27', '2025-08-10 16:17:07'),
(36, 7, '71d90938-ffde-40ee-abdf-2b37d563731b', 'OaWrbI5YN_2ANsFDOFVNo7B6MvRWHanWWIzryWvSWNQ=', 'Chrome Browser', 'web', '58.10.128.241', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-10 23:25:26', '2025-09-09 18:37:16', 1, '2025-08-10 18:37:16', '2025-08-10 23:25:26'),
(37, 7, '6bb3f0f2-16ac-435f-9db8-36dceefb18e5', 'kbV58DjZt7Vv482MW9p7d0LHcuW-kfR8DGw1DA24iLs=', 'Chrome Browser', 'web', '58.10.128.241', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-11 12:10:58', '2025-09-10 11:48:46', 0, '2025-08-11 11:48:46', '2025-08-11 12:10:58'),
(38, 8, 'b2558194-5108-4ccf-8cd1-a4b4c7718966', 'fwkRgmgs1wu4RCJ1V1j7JlB4PuHCSg6IhYLPoWG2pdc=', 'Chrome Browser', 'web', '110.168.238.46', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', '2025-08-11 12:07:59', '2025-09-10 12:04:26', 1, '2025-08-11 12:04:26', '2025-08-11 12:07:59'),
(39, 8, '2e7b2cd4-26a3-4b76-8ce9-57afb257ee44', 'N7yzEXoJiIFLxDN55tbs6hxUGGh4FGOT6hXKAAt5Lfs=', 'Chrome Browser', 'web', '58.10.128.241', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-11 12:14:58', '2025-09-10 12:11:04', 0, '2025-08-11 12:11:04', '2025-08-11 12:14:58'),
(40, 7, '024be4c9-9002-4bbf-bedf-5cb12146d138', 'TRaeEZ4VDx2V6gTLdTKTbd2YKXQFMqyN_tF-_3G5p7s=', 'Chrome Browser', 'web', '58.10.128.241', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-11 13:14:19', '2025-09-10 12:15:03', 1, '2025-08-11 12:15:03', '2025-08-11 13:14:19'),
(41, 7, 'b6d68c42-2ac6-494c-a58d-323b5cabe4a5', 'iAjnkwYNartyyJUy1K3ExGqFcFABFexI1ZRlmISb51Q=', 'Chrome Browser', 'web', '58.10.128.241', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-11 13:56:03', '2025-09-10 13:15:19', 1, '2025-08-11 13:15:19', '2025-08-11 13:56:03'),
(42, 8, 'bd0c9df4-12d0-4519-8c66-ba559a3b95f5', 'jkFrX8YMasUmiKJ07vtsjc1ASPL9qT0Fs6NYZjc3zLg=', 'Chrome Browser', 'web', '110.168.238.46', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', '2025-08-11 14:16:19', '2025-09-10 13:35:18', 1, '2025-08-11 13:35:18', '2025-08-11 14:16:19'),
(43, 8, '4a3b1bfc-4f2d-4acb-9ec6-e76071d5c0b1', 'VctAjiipLu81JtbhK5KH-uu1NnoWfjmUbEZ5FszLTBs=', 'Chrome Browser', 'web', '110.168.238.46', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', '2025-08-11 22:14:31', '2025-09-10 20:11:29', 1, '2025-08-11 20:11:29', '2025-08-11 22:14:31'),
(44, 8, '8270dd78-dc35-43ae-8690-6b881520df6a', 'IXFyHy46RSfjtGoy171aYO21NSHQQ6y1wMKWJJ54qCc=', 'Chrome Browser', 'web', '58.11.84.239', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', '2025-08-12 05:09:35', '2025-09-11 05:08:41', 0, '2025-08-12 05:08:41', '2025-08-12 05:09:35'),
(45, 7, 'dc875c4f-2038-4b43-93ad-dd9559eb49a0', 'FoOd1dkiuA3mpwzaKQncos7ktpidbmLEGhBx-24baNk=', 'Chrome Browser', 'web', '58.11.84.239', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', '2025-08-12 05:35:26', '2025-09-11 05:09:39', 0, '2025-08-12 05:09:39', '2025-08-12 05:35:26'),
(46, 7, '5b6b14b3-ab5d-4db9-a1a3-ea2f58d41b49', 'bwg9ZafDSKoEZ9QxeIk-N_L-jk4ByrNM87Pwj1Wlb6s=', 'Chrome Browser', 'web', '58.10.128.241', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-12 05:17:46', '2025-09-11 05:14:30', 0, '2025-08-12 05:14:30', '2025-08-12 05:17:46'),
(47, 8, '9f02833e-b5c4-48a5-a1d5-73c4205625b6', '2IoetuIMkYs-w7X_i5LOl3aS-13uiTRv3Wywwo-FahQ=', 'Chrome Browser', 'web', '58.10.128.241', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-12 06:03:48', '2025-09-11 05:17:57', 1, '2025-08-12 05:17:57', '2025-08-12 06:03:48'),
(48, 8, 'b598c193-6e30-4be1-a9ae-4c35e9cda80a', 'phBNr1qYw2w51aud1Z6tieJ92BZtQ0HrBA5eovKlwBM=', 'Chrome Browser', 'web', '58.11.84.239', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', '2025-08-13 13:18:19', '2025-09-12 11:42:59', 1, '2025-08-13 11:42:59', '2025-08-13 13:18:19'),
(49, 8, '02471e2e-e7b0-4c1d-8a00-ac3e8b44f10d', 'hsoMuTwW7o2ZBVsqx1OCapUBlv5xbWDry6BxNG_8gg0=', 'Chrome Browser', 'web', '58.11.84.239', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-15 12:15:07', '2025-09-14 11:37:05', 1, '2025-08-15 11:37:05', '2025-08-15 12:15:07'),
(50, 8, 'd409b552-abb7-4136-81c3-d7dd31001f62', 'Gy-6dbq7KGtG-A8JVQMaASP52Dq28Te_66nnGMT4xt0=', 'Chrome Browser', 'web', '58.11.84.239', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-15 18:27:28', '2025-09-14 17:44:19', 1, '2025-08-15 17:44:19', '2025-08-15 18:27:28'),
(51, 8, 'fcc9b58f-a30d-4033-bc39-a33808093c3d', 'h7PLs6dU27wd7R-mMClhhLJokiCSlOB8KFsXidb8eeo=', 'Chrome Browser', 'web', '58.11.84.239', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-15 22:42:45', '2025-09-14 22:02:31', 1, '2025-08-15 22:02:31', '2025-08-15 22:42:45'),
(52, 8, 'e079e4cc-b0a3-43b5-bcd0-1bb98cf38df2', 'p7YYvscatu-GtkTDd2eOYgkyUyqY5klGCYx4Lf1oV_M=', 'Chrome Browser', 'web', '58.11.84.239', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-16 11:55:41', '2025-09-15 11:22:23', 1, '2025-08-16 11:22:23', '2025-08-16 11:55:41'),
(53, 8, '23098be3-a9f9-4f18-9380-0b9009e7d04e', 'iud6o_YnknREU2ZudtWtuwCv1rvNsRIYy3M0mesrh-U=', 'Chrome Browser', 'web', '58.11.84.239', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-16 17:18:38', '2025-09-15 17:18:20', 1, '2025-08-16 17:18:20', '2025-08-16 17:18:38'),
(54, 8, '8f6e9a09-f247-4158-8373-63fb24194672', 'Od8MoBHOugpZzJcD9wT-v4TSaQsSbh8FEyZmQBea2TQ=', 'Chrome Browser', 'web', '58.11.84.239', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-16 23:25:07', '2025-09-15 22:40:32', 1, '2025-08-16 22:40:32', '2025-08-16 23:25:07'),
(55, 8, 'caa87d66-e49e-44e7-b60b-5a14b40c8da5', 'gfrLMUYBAKQqaIdFVDA6bnasF1bgrExuJHbNoWeOvGM=', 'Chrome Browser', 'web', '58.11.84.239', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-17 09:00:57', '2025-09-16 08:56:04', 0, '2025-08-17 08:56:04', '2025-08-17 09:00:57'),
(56, 7, '60938321-5ae9-4318-a289-544c597de98e', '-uAin-AvWvdaZwBfLWHwD4_jFPwCpsbFpsiWpUuA5gg=', 'Chrome Browser', 'web', '58.11.84.239', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-17 09:00:48', '2025-09-16 09:00:41', 1, '2025-08-17 09:00:41', '2025-08-17 09:00:48'),
(57, 8, '411e242a-c558-4c45-ab67-42ba0f3398d5', 'fZhVhKszDMkdl6Usyrw--x1ZHRAccYH4I81UyTxR_0g=', 'Chrome Browser', 'web', '58.11.84.239', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-17 09:49:01', '2025-09-16 09:01:00', 1, '2025-08-17 09:01:00', '2025-08-17 09:49:01'),
(58, 8, '738f887d-786e-45c5-a12f-789db51a92f7', '8S8qQ126HW4pnZAE1PeAg-MyQKyqUlA_gAlWWP7N260=', 'Chrome Browser', 'web', '58.11.84.239', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-17 19:27:48', '2025-09-16 19:19:04', 1, '2025-08-17 19:19:04', '2025-08-17 19:27:48'),
(59, 8, '79ce9534-846f-4318-9cbf-1bee608b2ba9', 'dTUjHjPRWgTBuy4OqKzlDblDQYd8JlAZcH-q6LAtydc=', 'Chrome Browser', 'web', '58.11.84.239', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-18 13:42:49', '2025-09-17 10:57:49', 1, '2025-08-18 10:57:49', '2025-08-18 13:42:49'),
(60, 8, 'a5282275-aa7c-4509-ae2a-c72a4787b42e', '2Ic2IZTbUCkIqWltTJ1EyIpsxrC4E8qqmrRNE-6UA2M=', 'Chrome Browser', 'web', '58.11.84.239', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-18 11:44:35', '2025-09-17 11:27:11', 1, '2025-08-18 11:27:11', '2025-08-18 11:44:35'),
(61, 8, 'fcb318a8-be6c-4a2a-95a9-a72f7ef9c7d2', 'byIbHv1zmuhDU0U81JxT0Can0kbqizmU8QJ2Wyjtdmc=', 'Chrome Browser', 'web', '58.11.83.106', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-18 11:45:14', '2025-09-17 11:29:03', 1, '2025-08-18 11:29:03', '2025-08-18 11:45:14'),
(62, 7, 'a66e3f14-c78f-40fe-b8aa-3ea8ef194c98', 'nqnDsdZMJ7ZFK4k2OESwtcoWyO5EhYLZr8dIw6lEg0c=', 'Chrome Browser', 'web', '58.11.83.106', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-18 23:11:59', '2025-09-17 17:43:57', 1, '2025-08-18 17:43:57', '2025-08-18 23:11:59'),
(63, 7, 'c22f049d-478e-4846-9f7f-03d9b658ccb5', 'o4V4iixAUCe0rEssC12tVjkOpNoiIDxfwDNfwaMMtpk=', 'Chrome Browser', 'web', '58.10.73.81', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-19 09:55:34', '2025-09-18 09:30:36', 0, '2025-08-19 09:30:36', '2025-08-19 09:55:34'),
(64, 8, 'fbbb8a9d-684a-41d1-a4ba-0f563077cd1b', 'a6ukk8xJmp01v6JZKwlGSnp8GUxU-FssgXuEd5gyYm4=', 'Chrome Browser', 'web', '58.10.73.81', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0', '2025-08-19 09:55:12', '2025-09-18 09:51:20', 1, '2025-08-19 09:51:20', '2025-08-19 09:55:12'),
(65, 8, '5cdcd954-b131-422d-a843-8b5cec3ff508', 'YGoHFeH4JejOzsONRGI58j5lMLZjHAm2sif-6OAU53I=', 'Chrome Browser', 'web', '58.10.73.81', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-20 01:45:00', '2025-09-18 09:55:41', 1, '2025-08-19 09:55:41', '2025-08-20 01:45:00'),
(66, 8, 'a38a56f8-98f9-47b7-9e66-7e6f2efb1c8b', 'h9ksWLBEnZyvmvVJh1yLPsvDqI8qR7ZFux4_0ISWvlM=', 'Chrome Browser', 'web', '58.10.140.241', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-19 12:03:34', '2025-09-18 11:05:04', 1, '2025-08-19 11:05:04', '2025-08-19 12:03:34'),
(67, 8, '8d2cab0e-0800-45f9-80e5-8894cb6eb7db', 'BU-NKZes65X9MYUXOLxTYNnWstt-B4yyTmztb_lPdGY=', 'Chrome Browser', 'web', '58.10.140.241', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-19 16:16:57', '2025-09-18 15:38:50', 1, '2025-08-19 15:38:50', '2025-08-19 16:16:57'),
(68, 8, '85791753-ea53-4668-acec-3202cf5e9d91', 'fN8nsKW_54FeoM7ghqVhmAO9FLngqPdzzyOScTVJZSU=', 'Chrome Browser', 'web', '58.10.140.241', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-19 18:03:56', '2025-09-18 17:47:44', 1, '2025-08-19 17:47:44', '2025-08-19 18:03:56'),
(69, 8, 'c2b8726a-c73b-4215-befd-d3391fbb5ec8', '8d10y94bqHEeVWAEscyfGc6kIR5aXEHziwL8UiJDpVg=', 'Chrome Browser', 'web', '58.10.140.241', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-20 14:04:17', '2025-09-19 13:28:07', 1, '2025-08-20 13:28:07', '2025-08-20 14:04:17'),
(70, 8, 'd34d01a4-93bb-4be0-b9ea-e35277668480', 'fHp_ODwVbl1puidJ_v0VDB-tJrVl6KaksA3TISMDd_o=', 'Chrome Browser', 'web', '58.11.79.179', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-21 05:56:31', '2025-09-19 14:15:40', 0, '2025-08-20 14:15:40', '2025-08-21 05:56:31'),
(71, 8, 'c23e323e-9ad1-4275-875a-79a5899d5cd5', 'd4Yb2tGiqcnC3zXFPmncroSF_fZ9LPv-lLL4-ko2zY4=', 'Chrome Browser', 'web', '58.10.140.241', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-20 17:06:00', '2025-09-19 16:25:09', 1, '2025-08-20 16:25:09', '2025-08-20 17:06:00'),
(72, 7, '2090f135-1651-47a7-b74a-fd59f1bf9704', 'sYtEOv2COuoDn6tdgvAqaTtX1-nSfdDfQ33cNj5vh9A=', 'Chrome Browser', 'web', '58.11.79.179', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-21 08:41:37', '2025-09-20 05:56:38', 1, '2025-08-21 05:56:38', '2025-08-21 08:41:37'),
(73, 7, 'b2319d9c-45f7-4044-9949-e2104d590a42', '4_Ek8UW6Ihk48NSHxfRlWJFLyiySlhAY2U0m32DcKFg=', 'Chrome Browser', 'web', '58.10.71.142', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-21 18:05:20', '2025-09-20 14:50:16', 1, '2025-08-21 14:50:16', '2025-08-21 18:05:20'),
(74, 8, '5bd4aadf-5f18-487c-b0f5-cb9da6c2c275', 'XG3M7Fj4OLIXtEUIPdvBjqbQr89169Q1Jp2heETdIJ4=', 'Chrome Browser', 'web', '58.10.71.142', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-22 03:27:17', '2025-09-21 03:18:03', 0, '2025-08-22 03:18:03', '2025-08-22 03:27:17'),
(75, 7, 'a3487363-5ab0-4807-af34-3b4b77da171a', 'E_geKerdRbB64ATv30Eag_ggWH2dcao4M6lMFyvdhQw=', 'Chrome Browser', 'web', '58.10.71.142', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-22 04:07:07', '2025-09-21 03:27:27', 0, '2025-08-22 03:27:27', '2025-08-22 04:07:07'),
(76, 8, 'e3503c19-1e7c-4ea7-803c-caa46cb6c824', 'HqeNHEtTCvutm1rftYO74evxkhx0PGcqmxeIHO5OF1k=', 'Chrome Browser', 'web', '58.10.71.142', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-22 10:28:37', '2025-09-21 04:07:13', 0, '2025-08-22 04:07:13', '2025-08-22 10:28:37'),
(77, 8, '4c15cf27-0df1-41d0-b54c-f12e5b701003', 'LR_aUatosWPXIsflxe6YuTBdXj1Keah2DXQDE1BIzQc=', 'Chrome Browser', 'web', '58.10.155.36', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-22 11:05:38', '2025-09-21 09:31:16', 0, '2025-08-22 09:31:16', '2025-08-22 11:05:38'),
(78, 7, '6638cea7-ea1d-4fa3-9e35-379f87ba2e2b', 'dT9QFYhyL-L9aKBHqZ6XK4ZgJFyxacHLY-ZsV5753MU=', 'Chrome Browser', 'web', '27.145.211.127', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-22 10:29:02', '2025-09-21 10:28:45', 0, '2025-08-22 10:28:45', '2025-08-22 10:29:02'),
(79, 8, 'c1df6592-3c7c-43e7-8dce-a82437364db5', 'WcLaSyCy1ecuLK0hdZdmZh2kbSSmU5V830Pc-k_2Tzc=', 'Chrome Browser', 'web', '27.145.211.127', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-22 11:27:59', '2025-09-21 10:29:12', 1, '2025-08-22 10:29:12', '2025-08-22 11:27:59'),
(80, 8, '7e04bcb8-232a-4821-9ef1-a0e5f63af66c', '0Aeu-wqFq8zOAFN6ZakwvLoI30X3SRTNkYuPmjQjcmc=', 'Chrome Browser', 'web', '58.10.155.36', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-22 11:09:02', '2025-09-21 11:06:16', 0, '2025-08-22 11:06:16', '2025-08-22 11:09:02'),
(81, 7, '1ddd6a0b-ba96-42be-a324-d591a3fb4a8b', '-mJvRL5XXqcx_WUBXWKXX2Fbtu8Eww3-jcjGeYbP4Mk=', 'Chrome Browser', 'web', '58.10.155.36', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-22 12:17:02', '2025-09-21 11:09:17', 0, '2025-08-22 11:09:17', '2025-08-22 12:17:02'),
(82, 8, '836f256b-c573-489d-a604-c7151a98a55f', '66APBp0GokYRrZ8hkfIsE4LtT-jhx1b89HEBucYKSpw=', 'Chrome Browser', 'web', '58.10.155.36', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-22 11:31:48', '2025-09-21 11:20:18', 1, '2025-08-22 11:20:18', '2025-08-22 11:31:48'),
(83, 8, '94123437-4df3-4150-9899-f5341bd2c22e', 'rrBY5pqtfMOFtSJGHCykffh0dX46U2_S_U_V00ofq3Q=', 'Chrome Browser', 'web', '58.10.155.36', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-22 12:05:26', '2025-09-21 11:47:35', 1, '2025-08-22 11:47:35', '2025-08-22 12:05:26'),
(84, 8, '49eed656-30bb-4679-bf9f-22776c858850', 'xNxLws0kgG7T-slD4d1fseGlgsW1vrOYRiFoT3gWk2I=', 'Chrome Browser', 'web', '58.10.155.36', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-22 13:16:36', '2025-09-21 12:17:05', 1, '2025-08-22 12:17:05', '2025-08-22 13:16:36'),
(85, 8, '308e51d3-4207-4960-be44-c0f0e001b72f', 'uJ_EgTBO1Q3gQKDwC2p4zYf-AkMErbhxnUJ5ICK5A98=', 'Chrome Browser', 'web', '58.10.155.36', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-22 13:05:20', '2025-09-21 13:05:10', 0, '2025-08-22 13:05:10', '2025-08-22 13:05:20'),
(86, 7, '264c4e90-20bd-4ea8-8c4b-09c3ba8e1ad8', 'UVL5pIjTze90_fgO4SLD3OmuIT1hdM3Zf7HlOOy8b8Q=', 'Chrome Browser', 'web', '58.10.155.36', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-22 13:08:17', '2025-09-21 13:05:23', 1, '2025-08-22 13:05:23', '2025-08-22 13:08:17'),
(87, 8, 'e86b2f39-0850-4f37-a3e2-7a32d0612050', 'XkpusDTD5o2Obeencyn70Ib34pEIDj53RTolijWZItw=', 'Chrome Browser', 'web', '58.10.155.36', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-22 13:17:31', '2025-09-21 13:17:27', 1, '2025-08-22 13:17:27', '2025-08-22 13:17:31'),
(88, 8, '539b4ff4-2dcf-403b-a71c-b2f772d72b40', 'FHjPT1446XEQDS6pBXTHbEdSfZ4iJcD7H0MQnG-yuwk=', 'Chrome Browser', 'web', '58.10.155.36', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-22 14:02:30', '2025-09-21 13:25:47', 1, '2025-08-22 13:25:47', '2025-08-22 14:02:30'),
(89, 7, 'ecf93f12-fb0e-4a46-964f-9709a85baf63', 'aFyhanlOuCbRMIF4ZkLNuW-ddY0cL_NMrQP5kC0AOWA=', 'Chrome Browser', 'web', '58.10.155.36', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-22 13:28:49', '2025-09-21 13:27:03', 1, '2025-08-22 13:27:03', '2025-08-22 13:28:49'),
(90, 8, 'c2bf5741-1cf6-469c-ad87-335cc18b7212', '9bgN593g-ZNPFLcmRh-czV5VeEVr4aK94uV5HiLE_WE=', 'Chrome Browser', 'web', '58.10.155.36', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-22 15:15:29', '2025-09-21 14:34:30', 1, '2025-08-22 14:34:30', '2025-08-22 15:15:29'),
(91, 8, '8c6b5cc7-85cc-489e-af12-a784a8d1de92', 'FpFNDIDgM_k65aEgFlAAkGB8ZiRvtTfJFmhK4Ar8ywQ=', 'Chrome Browser', 'web', '58.10.155.36', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-22 15:38:34', '2025-09-21 15:31:15', 1, '2025-08-22 15:31:15', '2025-08-22 15:38:34'),
(92, 8, '73ca3714-2880-4dd8-b66e-3720e4d6d1e8', 'C3oPsD_qT2Q187NPxFYPDZJElc8dP-1CJJRGz07osBI=', 'Chrome Browser', 'web', '58.10.155.36', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-22 17:15:50', '2025-09-21 15:58:26', 1, '2025-08-22 15:58:26', '2025-08-22 17:15:50'),
(93, 8, '4c7b26e9-62aa-42ca-a19b-b2e268c250dd', 'sMPg7MWAFCw4Q823S7aFmj_SrxRtcJelLJ0XCJc-JJo=', 'Chrome Browser', 'web', '27.145.211.127', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-22 22:40:31', '2025-09-21 18:41:48', 1, '2025-08-22 18:41:48', '2025-08-22 22:40:31'),
(94, 7, '9ad8f802-36e9-457c-9245-40eddb01c194', 'TqrEznLz2oAkOmqTB5U_PkL6I4xtJtxqZPEcQmsiRTw=', '', 'api_client', '58.10.155.36', 'PostmanRuntime/7.45.0', '2025-08-22 19:02:25', '2025-09-21 19:02:25', 1, '2025-08-22 19:02:25', '2025-08-22 19:02:25'),
(95, 8, '141282c7-5bc2-478f-95fc-e8e38bd203aa', 'VlZSRTAwBBcMY7SNdXOz984v9wgi7JXS6DUUiBxcMK0=', '', 'api_client', '58.10.155.36', 'PostmanRuntime/7.45.0', '2025-08-22 19:03:47', '2025-09-21 19:02:47', 1, '2025-08-22 19:02:47', '2025-08-22 19:03:47'),
(96, 8, '903bfe35-2e1c-4652-8b86-333c609fa6ff', 'ZSX5cbHwrJfLPE35ffalDyusEYG58NGf2SM5Gz6t_q8=', 'Chrome Browser', 'web', '27.145.211.127', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-22 23:41:31', '2025-09-21 22:57:56', 1, '2025-08-22 22:57:56', '2025-08-22 23:41:31'),
(97, 7, '008d1278-25f8-4104-8f3b-b2ad8ff2a7d3', 'iOPDusVzQkASkmRVmHn3FbFqu_Azc95PCYgbRDbb4G8=', 'Chrome Browser', 'web', '27.145.211.127', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-23 04:59:24', '2025-09-22 04:58:44', 1, '2025-08-23 04:58:44', '2025-08-23 04:59:24'),
(98, 7, '4f76dc6b-e6c6-4095-9544-af093368723c', 'zQ-hmQBc0_f386Au_V8SPvNjBThy7A0ByqryiUCipxI=', 'Chrome Browser', 'web', '27.145.211.127', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-23 07:26:58', '2025-09-22 07:26:49', 0, '2025-08-23 07:26:49', '2025-08-23 07:26:58'),
(99, 8, '489658c4-4a2c-4089-8ab9-bd0de274c769', '5au8V4OH8SRnAWT7cByqmrNzP1TXdZo3naiGQfPQVR8=', 'Chrome Browser', 'web', '27.145.211.127', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-23 07:28:43', '2025-09-22 07:27:11', 0, '2025-08-23 07:27:11', '2025-08-23 07:28:43'),
(100, 7, '81438979-96f1-4ca2-ba1b-4418cb309ab2', 'WIKJVQLIEE5lTprk9onoWOrfhOHiendslI4AO1aR5T8=', 'Chrome Browser', 'web', '27.145.211.127', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-23 09:03:07', '2025-09-22 07:28:49', 0, '2025-08-23 07:28:49', '2025-08-23 09:03:07'),
(101, 8, 'b70e8278-bf9b-4e60-9b99-d4c111de29b0', 'LARTpQPggSvLyLO63aPULXfy1nu9SjA_tMgHi0bzsdg=', 'Chrome Browser', 'web', '58.10.155.36', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-23 09:12:07', '2025-09-22 08:21:13', 0, '2025-08-23 08:21:13', '2025-08-23 09:12:07'),
(102, 7, '7d5355a0-ba82-46b3-92d9-f07c695d0cb4', '4PZdZQOPy_4tDCA6gh2YfYM_VqXuJs-mp31A4gk4rGw=', 'Chrome Browser', 'web', '27.145.211.127', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-23 09:07:37', '2025-09-22 09:03:22', 0, '2025-08-23 09:03:22', '2025-08-23 09:07:37'),
(103, 7, '44f72392-6e4a-4169-b8e4-eab0307fbee8', 'utDCbBJwLnPLlqYgHan1welntpvzkqozbHFBErQRhfQ=', 'Chrome Browser', 'web', '58.10.155.36', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-23 09:11:01', '2025-09-22 09:03:37', 0, '2025-08-23 09:03:37', '2025-08-23 09:11:01'),
(104, 7, 'ccf5ca5d-6970-4e6a-9ca6-e618346eadb3', 'a1fxhAFIJ_ztw67g8Q4womW5AHFV6pxcMXDXUDOFDeo=', 'Chrome Browser', 'web', '27.145.211.127', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-23 09:14:05', '2025-09-22 09:07:44', 1, '2025-08-23 09:07:44', '2025-08-23 09:14:05'),
(105, 8, '25001a18-6134-43e1-ad93-8d214f7ee12f', 'AFQJeaenmNbz2DbYtpEe_zcnGIZo21zoJGbz63CbMTc=', 'Chrome Browser', 'web', '58.10.155.36', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-23 10:21:06', '2025-09-22 09:11:12', 0, '2025-08-23 09:11:12', '2025-08-23 10:21:06'),
(106, 7, 'a3307ccc-2284-40a2-b1c8-78c0061a5191', 'JjUFYtBYGfSYTY5II7vHUznwSm1feamoonLkDekf65c=', 'Chrome Browser', 'web', '58.10.155.36', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-23 11:04:39', '2025-09-22 09:12:10', 0, '2025-08-23 09:12:10', '2025-08-23 11:04:39'),
(107, 7, 'dfc002c0-a1fe-40b0-9876-76d3cfa1db57', '-G9pid_z8ZEtLW30FKhpdW2ru1IGp-_L_gXchk2zkno=', 'Chrome Browser', 'web', '27.145.211.127', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-23 22:17:31', '2025-09-22 10:20:23', 1, '2025-08-23 10:20:23', '2025-08-23 22:17:31'),
(108, 8, 'a51e248a-0e4a-4caa-90e8-bf5ee73d5177', 'MFKgUR2MvXXt6vpkWo7De02HClNBnQwzaJtWTksjLjI=', 'Chrome Browser', 'web', '58.10.155.36', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-23 10:25:31', '2025-09-22 10:22:44', 0, '2025-08-23 10:22:44', '2025-08-23 10:25:31'),
(109, 7, '2fa9a9df-2d54-4fbf-8b62-c8b2133ec59f', 'n0FMnXHWB9mDpqPVS_rMxm_CgTCjptc9jy04YmsZNY4=', 'Chrome Browser', 'web', '58.10.155.36', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-23 11:03:40', '2025-09-22 10:25:33', 0, '2025-08-23 10:25:33', '2025-08-23 11:03:40'),
(110, 8, '7796cf26-8527-4257-913d-b56d656ed624', 'jvRtFXk7d6AAuwW9xqBR8TM7INEmnpKoHJjzaAUrD4w=', 'Chrome Browser', 'web', '58.10.155.36', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-23 11:10:19', '2025-09-22 11:04:41', 0, '2025-08-23 11:04:41', '2025-08-23 11:10:19'),
(111, 7, '4d32cb90-81cf-4b25-b22f-3e3ae986ec5f', 'Lbc_8wSXjHSlZQc_F4ifBqpYtQ676HblpBYn5yGimGo=', 'Chrome Browser', 'web', '58.10.155.36', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-23 12:00:57', '2025-09-22 11:05:57', 1, '2025-08-23 11:05:57', '2025-08-23 12:00:57'),
(112, 7, '1fff7b83-1f65-4a33-97ce-c937f48a91bc', '1sT50x0OUVOwZBH6e2N3Td4EjXDXjlTEyckkctP3g18=', 'Chrome Browser', 'web', '58.10.155.36', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-23 11:10:38', '2025-09-22 11:10:22', 0, '2025-08-23 11:10:22', '2025-08-23 11:10:38'),
(113, 8, '23822771-8e6c-4acd-9399-63244057a65a', 'V6Ix5RsnPo3LMKGeaPT7gh7Dj4T0qaVdPEfZseUxoAw=', 'Chrome Browser', 'web', '58.10.155.36', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-23 11:12:45', '2025-09-22 11:10:42', 1, '2025-08-23 11:10:42', '2025-08-23 11:12:45'),
(114, 8, '839a8d9d-7db1-4d04-a406-63704bee47c9', 'eYHHm2B6wMNSHi-Usx-QtdyO9SrFNt2UxUphwbVcDZ4=', 'Chrome Browser', 'web', '58.10.155.36', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-23 12:10:12', '2025-09-22 11:19:55', 1, '2025-08-23 11:19:55', '2025-08-23 12:10:12'),
(115, 8, '0bff232b-9d56-41c6-8cff-89f9f66103fd', 'prMfAARqXPU-Y4rrIS-83hFMP1OVYB9gNN62m94EKmk=', 'Chrome Browser', 'web', '58.10.155.36', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-23 20:30:14', '2025-09-22 16:13:30', 1, '2025-08-23 16:13:30', '2025-08-23 20:30:14'),
(116, 8, 'd0944ea7-4ecd-481a-a3b8-a945402b80b7', 'qk4a5-2PZyaUd1FFaWFwFUE9ceohmQZF7DHLW_RL1mo=', 'Chrome Browser', 'web', '58.10.155.36', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-23 22:56:50', '2025-09-22 20:32:51', 1, '2025-08-23 20:32:51', '2025-08-23 22:56:50'),
(117, 7, '082287a7-fa6c-4407-b238-31b7fd1dc0c5', 'FSGqHAUpxMqpXN6J1PW4v5PJbP2Gf7QhTwNLe1XEUYo=', 'Chrome Browser', 'web', '27.145.211.127', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-23 23:21:31', '2025-09-22 22:40:22', 1, '2025-08-23 22:40:22', '2025-08-23 23:21:31'),
(118, 7, '1153bd6b-a20c-4af0-86ce-04d8fc29179f', 'n8yjGO3YvHSZv5oOWJp5328yXZVNEpNASS5dR8_CfZc=', 'Chrome Browser', 'web', '27.145.211.127', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-24 12:02:12', '2025-09-23 05:19:47', 1, '2025-08-24 05:19:47', '2025-08-24 12:02:12'),
(119, 8, '4aa16140-6fe2-4c21-9735-3a40d595e489', 'diTzhLERttUEENmPjEvIqrML-LVr-7zZkZUKQuBcoC8=', 'Chrome Browser', 'web', '58.10.155.36', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-24 12:46:36', '2025-09-23 12:44:22', 1, '2025-08-24 12:44:22', '2025-08-24 12:46:36'),
(120, 7, '43bc0097-8d24-499a-a773-e781b320f6b9', 'UtfU4vTqM45d9Xv0-fw5pVw2UaxsDZaWX5ZHmU3O82o=', 'Chrome Browser', 'web', '58.10.149.116', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-24 16:04:32', '2025-09-23 16:00:20', 1, '2025-08-24 16:00:20', '2025-08-24 16:04:32'),
(121, 7, 'c1e28bd4-52f8-4a8e-acd9-8a0dd20f385e', 'JcSZv-pD04inrvfB9Lcl7JF4wvkdUEM5uXg7sIH8p3U=', 'Chrome Browser', 'web', '58.10.149.116', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-24 19:08:52', '2025-09-23 17:24:11', 1, '2025-08-24 17:24:11', '2025-08-24 19:08:52'),
(122, 8, '9b1e6aa8-5711-4d0b-9a2d-6d6edaf1581f', 'CrnfXhbRikjO-Rl6X5cPtvm51diqegjHqOtRaRDPfc4=', 'Chrome Browser', 'web', '58.10.155.36', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-24 18:27:14', '2025-09-23 18:14:32', 0, '2025-08-24 18:14:32', '2025-08-24 18:27:14'),
(123, 7, '68b65828-a7e3-4b70-ab9d-ad8c17e70182', 'x_jVIkwNqO5MPOA7YAGo5RN_B9IcAno1c8a-Cim7ZTg=', 'Chrome Browser', 'web', '58.10.155.36', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-24 18:28:40', '2025-09-23 18:27:45', 1, '2025-08-24 18:27:45', '2025-08-24 18:28:40'),
(124, 8, 'c847f13b-6d13-4af5-b7a8-c45a1cc1cda0', 'm7cxUSDxup5zORwyiwCWBwTDvPjpLrTQNhEJcX6mmkA=', 'Chrome Browser', 'web', '58.10.155.36', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-25 02:01:13', '2025-09-24 01:42:40', 1, '2025-08-25 01:42:40', '2025-08-25 02:01:13'),
(125, 8, 'c401fbaf-b22c-4352-9d29-7bf10c203986', '97tP1aM9RfJM3j2JkY20_uAJVpUOTyPBaL1zUjfJyA0=', 'Chrome Browser', 'web', '58.10.149.116', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-25 08:37:25', '2025-09-24 03:07:26', 1, '2025-08-25 03:07:26', '2025-08-25 08:37:25'),
(126, 8, '4e4af3dd-edc2-45dc-88d1-9e7127d5f380', 'mkotUTMqIiA_mD9h-OzUSKorWx8bBfTWNTDa64n4Lns=', 'Chrome Browser', 'web', '58.10.155.36', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-25 12:46:53', '2025-09-24 11:04:45', 1, '2025-08-25 11:04:45', '2025-08-25 12:46:53'),
(127, 8, '49428724-cba7-43da-8aff-53ff78a07c7f', 'sTvJCdVQlrg-LHbJua5UhdZbu6Zo1zFoAA0sGhOczKA=', 'Chrome Browser', 'web', '58.10.149.116', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-25 19:18:03', '2025-09-24 14:17:24', 1, '2025-08-25 14:17:24', '2025-08-25 19:18:03'),
(128, 7, 'f595280a-7312-4739-85a2-293d924a3e8e', 'iJIjVjvu9B_2K9kMWEEMDdIERCCbkocSv0Ni5xII5Gw=', '', 'api_client', '58.10.155.36', 'PostmanRuntime/7.45.0', '2025-08-25 15:37:00', '2025-09-24 15:24:23', 1, '2025-08-25 15:24:23', '2025-08-25 15:37:00'),
(129, 8, '1fa5514a-6e1d-4bae-9598-700c92940a4a', 'T-OBbuhymAZbSN5AwJ5Eqk4w4lYI0_aFSuwJn0TLlAM=', 'Chrome Browser', 'web', '58.10.149.116', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-26 10:45:33', '2025-09-25 10:45:12', 0, '2025-08-26 10:45:12', '2025-08-26 10:45:33'),
(130, 7, '39590ef6-49e4-4c65-a706-c8f875953b2b', 'na4h1sGtMVUOzdgP1lMsgqQVU0PTEHYhoyi48aKfwl0=', 'Chrome Browser', 'web', '58.10.149.116', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-26 10:54:32', '2025-09-25 10:45:40', 0, '2025-08-26 10:45:40', '2025-08-26 10:54:32'),
(131, 8, '5a011c7c-936b-4d82-bd96-10946e0547fc', 'auxM-raUAMxZ1NE56mdOH9DQ8ghn5uaHA8skzTB1ojo=', 'Chrome Browser', 'web', '58.10.149.116', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-26 11:00:19', '2025-09-25 10:55:10', 1, '2025-08-26 10:55:10', '2025-08-26 11:00:19'),
(132, 8, 'ce950ba4-18e2-410d-b56f-545299869e1e', 'oSaaCQRgFKLK2pvXiE2OV_lCiGTwxAKnDL9Hn9QKzvU=', 'Chrome Browser', 'web', '58.10.155.36', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-26 12:31:08', '2025-09-25 11:08:35', 1, '2025-08-26 11:08:35', '2025-08-26 12:31:08'),
(133, 8, '31c8f085-7c04-401b-bd05-f3403aab32bd', 'qO7s3HZH8T-EHPDPFof09M6BD7pkc_Y_SnaCwci34Fc=', 'Chrome Browser', 'web', '58.10.149.116', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-26 12:28:12', '2025-09-25 12:14:56', 1, '2025-08-26 12:14:56', '2025-08-26 12:28:12'),
(134, 8, '84cf1de1-aa3b-48b7-bdf3-2545dc9ab819', '2Dp7-bLnGVBrdCSmm-M6nj_2mtTnbr3me_-Kl0ORUKU=', 'Chrome Browser', 'web', '58.10.155.36', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-26 13:28:51', '2025-09-25 12:50:16', 1, '2025-08-26 12:50:16', '2025-08-26 13:28:51'),
(135, 8, 'b92e0a6c-ca91-466b-a25a-8434eda4dd6d', 'nNC5LzIuFw7M2ek9itnlO4064t5HVnSA-1lPgPzNYhw=', 'Chrome Browser', 'web', '58.10.149.116', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-26 13:38:26', '2025-09-25 13:34:12', 0, '2025-08-26 13:34:12', '2025-08-26 13:38:26'),
(136, 7, '5ced74f9-249e-4754-a9a7-02a50d1dcffa', 'yQiVu2QX6B0QEtyoENXfjG-9zCqUqaJGHMBZUYg2P40=', 'Chrome Browser', 'web', '58.10.149.116', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-26 13:44:51', '2025-09-25 13:38:33', 0, '2025-08-26 13:38:33', '2025-08-26 13:44:51'),
(137, 8, '9531ee64-5f5f-49ce-ac57-7092f000850e', 'VWMpIaVx08uwFOAwBTY7gtwMjcYU_O9A_fatpqueCUE=', 'Chrome Browser', 'web', '58.10.149.116', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-26 14:15:01', '2025-09-25 13:44:56', 0, '2025-08-26 13:44:56', '2025-08-26 14:15:01'),
(138, 7, '93319d64-f7a8-4844-a78c-11e8d0515b27', 'xpkSjCc3yH3O7MAgu3YxWG2-NiQ1C6vMtXuJ9DDUvOM=', 'Chrome Browser', 'web', '58.10.149.116', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-26 23:37:39', '2025-09-25 14:15:08', 0, '2025-08-26 14:15:08', '2025-08-26 23:37:39'),
(139, 8, '8b5fdb94-aeae-4ec8-bd08-a1f7303673d5', 'y_Vx6pDD38H1QwC0SutWTxWZgojYdY5rij2zzdxkvxU=', 'Chrome Browser', 'web', '58.10.149.116', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-26 23:38:19', '2025-09-25 23:38:12', 1, '2025-08-26 23:38:12', '2025-08-26 23:38:19'),
(140, 8, '3b650595-67a7-4e21-9b64-07f95c5709a4', 'YzOeRLL7rJE1f_dh0u6iOI_DJUpTjvqgcrGzS9ig-r8=', 'Chrome Browser', 'web', '58.10.149.116', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-27 11:33:56', '2025-09-26 04:25:52', 1, '2025-08-27 04:25:52', '2025-08-27 11:33:56'),
(141, 8, 'ed48e9dc-0e90-4674-8951-835ec1a19117', 'VKyjsXLp7uxzdhYcEgiH6CmtgXWiru3NrfLpbs-ErSc=', 'Chrome Browser', 'web', '58.10.155.36', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-27 11:39:03', '2025-09-26 09:45:36', 1, '2025-08-27 09:45:36', '2025-08-27 11:39:03'),
(142, 8, '870946c1-fdac-4c77-99ce-ec10b36c73b6', '38o3rdC-XC-xQxusk6MJ9wLmTrZFuk_1FaidtUy7rjk=', 'Chrome Browser', 'web', '58.10.155.36', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-27 12:10:36', '2025-09-26 11:45:24', 0, '2025-08-27 11:45:24', '2025-08-27 12:10:36'),
(143, 8, 'ab855cbf-80d5-46aa-8c31-acdec7d4da88', '1kS9Gr7Jv7LYNRfS9x6iEwgShbY_jgZrUm7eaHvcrrE=', 'Chrome Browser', 'web', '58.10.119.240', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-27 13:52:51', '2025-09-26 12:03:53', 1, '2025-08-27 12:03:53', '2025-08-27 13:52:51'),
(144, 8, 'b76e8d34-1b0d-4be3-8a65-fd6444e1f358', 'a0JAyD3_NnDbg4c34FEXXrWV9yUWYDaefAP2aJxZlE8=', 'Chrome Browser', 'web', '58.10.155.36', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-27 14:11:08', '2025-09-26 12:10:42', 1, '2025-08-27 12:10:42', '2025-08-27 14:11:08'),
(145, 8, 'f63678c2-45e2-45d6-965f-709b36452053', 'igJO0BVXwBOh9GXpE0SL-TuGha0A93rlCIUMo4lBq5E=', 'Chrome Browser', 'web', '58.10.119.240', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-27 14:50:03', '2025-09-26 14:09:21', 1, '2025-08-27 14:09:21', '2025-08-27 14:50:03');
INSERT INTO `user_sessions` (`session_id`, `user_id`, `access_token_jti`, `refresh_token`, `device_name`, `device_type`, `ip_address`, `user_agent`, `last_activity`, `expires_at`, `is_active`, `created_at`, `updated_at`) VALUES
(146, 8, '42a7dc62-d16f-43bd-82cd-ca4314693b40', 'vJQj97Ay2ltoO1H7Evcz4XSVAypOFbfDnZy6GbzZlzM=', 'Chrome Browser', 'web', '58.10.155.36', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-27 14:16:17', '2025-09-26 14:11:11', 0, '2025-08-27 14:11:11', '2025-08-27 14:16:17'),
(147, 8, '91d43e9c-9558-4bbc-acd4-d76164703c51', 'mjKl_T3uxmTJQdeY5UdQXRvCu_-GT4WNpAcY6wf-H1o=', 'Chrome Browser', 'web', '58.10.155.36', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-27 14:16:22', '2025-09-26 14:16:19', 0, '2025-08-27 14:16:19', '2025-08-27 14:16:22'),
(148, 7, 'b8b2f0d8-3f74-4d75-ab57-9ecff8b933b6', 'u5u8e0VAbjq9V0pgdQuRWq4NaoCdiNRWEk8gIMaz394=', 'Chrome Browser', 'web', '58.10.155.36', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-27 14:17:46', '2025-09-26 14:16:24', 0, '2025-08-27 14:16:24', '2025-08-27 14:17:46'),
(149, 7, 'ef9ec769-2362-4c8c-9d79-2a1cbe495ca0', '8KFiGtbSEaHLr_VmRuBzxPUidHKwwsy7V0lTm9vSwqQ=', 'Chrome Browser', 'web', '58.10.155.36', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-27 14:18:01', '2025-09-26 14:17:47', 0, '2025-08-27 14:17:47', '2025-08-27 14:18:01'),
(150, 8, 'bf38296d-e39c-4e22-a807-e716c8874cbd', 'SZEZR2o8ctKfyVe6EAGvL0G4yH2CIVDDNpgco-tN4JM=', 'Chrome Browser', 'web', '58.10.155.36', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-27 14:57:57', '2025-09-26 14:18:04', 0, '2025-08-27 14:18:04', '2025-08-27 14:57:57'),
(151, 7, '289062b1-5c31-4fce-9565-20d964f92065', 'Om9qdMyxTesH9kpmH6V0KCclHQdwonokSLfqZ0gN61Y=', 'Chrome Browser', 'web', '58.10.155.36', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-27 15:21:20', '2025-09-26 14:58:00', 1, '2025-08-27 14:58:00', '2025-08-27 15:21:20'),
(152, 8, 'c832e3e5-a7b0-4c9d-8c14-39f978ec0a25', 'kKtdIVEahQGb2hzic2bsRHYiej4PY1LpvP1Z7SdbFY0=', 'Chrome Browser', 'web', '58.10.119.240', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-27 22:25:56', '2025-09-26 18:31:09', 1, '2025-08-27 18:31:09', '2025-08-27 22:25:56'),
(153, 8, 'e6153e7b-64b1-40b6-8a35-242f89444ade', '6B84pYiN2YcF7uKBrJufXIn2OLvpsHNjgwE9tqQJVUE=', 'Chrome Browser', 'web', '58.10.119.240', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-27 23:26:49', '2025-09-26 23:19:32', 0, '2025-08-27 23:19:32', '2025-08-27 23:26:49'),
(154, 10, '26fdd008-49ae-47c0-bdf7-0a9647a9766c', 'lAKAzCNflXmRuRVAXGcx7Jq0u6nnQVJlFC7G2viecmM=', 'Chrome Browser', 'web', '58.10.119.240', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-27 23:27:12', '2025-09-26 23:26:54', 1, '2025-08-27 23:26:54', '2025-08-27 23:27:12'),
(155, 8, '8a206e6b-97a2-4e50-a15e-0e3e3a976117', 'lO3tvQscufE8eOMRlRggAvJSxlgo1p4U9-WevfOi700=', 'Chrome Browser', 'web', '58.10.119.240', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-28 04:08:37', '2025-09-27 02:28:40', 0, '2025-08-28 02:28:40', '2025-08-28 04:08:37'),
(156, 7, '3681e1da-4b62-4205-b83b-cf62158b56bd', 'xPV6XMBFhrMLyuA7pExsgQjWxtUQ1XuqWN6KnJ8k2Zw=', 'Chrome Browser', 'web', '58.10.119.240', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-28 04:31:58', '2025-09-27 04:08:43', 1, '2025-08-28 04:08:43', '2025-08-28 04:31:58'),
(157, 8, '4735129f-2045-4a21-a9d8-79625191c69e', 'AMo1ltwoSWAd1ijZjng85JiBv02mB_sMKqofAMDY-DQ=', 'Chrome Browser', 'web', '58.11.0.200', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-28 10:15:11', '2025-09-27 10:13:43', 1, '2025-08-28 10:13:43', '2025-08-28 10:15:11'),
(158, 8, '70905947-3e9e-41e7-9c5d-4d09433ede8b', 'RsLMPxLRP63rfldgoEhNV4bwupjzaPU6_d5I3NAJUxU=', 'Chrome Browser', 'web', '58.11.0.200', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-28 11:13:51', '2025-09-27 10:17:12', 1, '2025-08-28 10:17:12', '2025-08-28 11:13:51'),
(159, 8, '49bb7621-457c-4607-b8b6-c683323cee57', '4vihW9FeMtgVUJosXftHSQQAulcCGdEiegPqfjOAvb4=', 'Chrome Browser', 'web', '58.11.0.200', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-28 15:08:04', '2025-09-27 11:19:14', 1, '2025-08-28 11:19:14', '2025-08-28 15:08:04'),
(160, 7, '4ff4911a-2d3f-4a3c-8bc2-0776dddd7cdc', 'T0QCThfw8iVkFTfmbDZEW_IIG-4u79jVNbVtFQqAkZ8=', 'Chrome Browser', 'web', '58.10.119.240', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-28 12:55:44', '2025-09-27 12:33:49', 0, '2025-08-28 12:33:49', '2025-08-28 12:55:44'),
(161, 8, '2af2a2b5-ae40-467e-9c55-988b68cdeda1', 'Z_3-GOrTLpZzYpzi2vAyPnt00j0wP2QYasg6g8TczcU=', 'Chrome Browser', 'web', '58.11.0.200', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-28 12:58:54', '2025-09-27 12:45:46', 1, '2025-08-28 12:45:46', '2025-08-28 12:58:54'),
(162, 8, 'ab5fa727-3933-46ff-987d-5d81cf05ea55', 'NFk8lfqAapWnQX90XLBzV-dfUONQWJazV1iDQL7AvAk=', 'Chrome Browser', 'web', '58.10.119.240', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-28 14:22:48', '2025-09-27 12:55:52', 0, '2025-08-28 12:55:52', '2025-08-28 14:22:48'),
(163, 7, '94a6d9c8-9947-4622-b6a7-5ae6f1970af9', 'Qs-LyPIngpfVO4OYOwl-_v97XPggBJ4CJpTfVH1pEGU=', 'Chrome Browser', 'web', '58.10.119.240', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-28 22:48:07', '2025-09-27 14:22:54', 0, '2025-08-28 14:22:54', '2025-08-28 22:48:07'),
(164, 8, '92fd5ce8-f3ea-4283-b6f8-04872001fe8b', 'SeZSNtwDikIArhVVi6W-8MSlxUEcSesW9834ZCh9fMg=', 'Chrome Browser', 'web', '58.11.0.200', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-28 14:49:18', '2025-09-27 14:48:22', 1, '2025-08-28 14:48:22', '2025-08-28 14:49:18'),
(165, 7, '2a42e8ce-94a0-4a01-94a9-e291486ef0ed', 'eyMx8kJGaGOF928RK2h7MOQHJdWlZwzGshC-uFxKRRc=', 'Chrome Browser', 'web', '58.10.119.240', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-29 00:05:43', '2025-09-27 22:48:13', 1, '2025-08-28 22:48:13', '2025-08-29 00:05:43'),
(166, 8, '788c1b67-5d28-4c2d-babe-7cf278bf672f', 'IQftLJ9UeOPzr9W-pFM85QedXQaAXsbmeEEoODl56Ak=', 'Chrome Browser', 'web', '58.11.0.200', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-28 23:13:35', '2025-09-27 23:05:20', 1, '2025-08-28 23:05:20', '2025-08-28 23:13:35'),
(167, 8, '525b6807-0a44-4176-a046-0353d13df553', 'Bo7jy4QNkVbPpYSqmf91wRnR923662Z35Jj8vM39_8s=', 'Chrome Browser', 'web', '58.10.119.240', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-29 04:55:07', '2025-09-28 04:49:29', 0, '2025-08-29 04:49:29', '2025-08-29 04:55:07'),
(168, 7, '9c4d349b-b553-45b6-b567-cea2a27ced5c', '5pnqaYfr6FirAZA4mvg_aB4Fh9D9bCvFjLeGZ6NWoKw=', 'Chrome Browser', 'web', '58.10.119.240', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-29 06:16:24', '2025-09-28 04:55:16', 1, '2025-08-29 04:55:16', '2025-08-29 06:16:24'),
(169, 8, 'e8ee47d4-5a9a-4099-8354-11f20ef658df', 'f-_7Qx_jbiJ7czjoNqbtTALQkTIi34cHFdGoyXdkR3o=', 'Chrome Browser', 'web', '58.11.0.200', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-29 13:16:27', '2025-09-28 11:01:12', 1, '2025-08-29 11:01:12', '2025-08-29 13:16:27'),
(170, 8, '51f7dec2-0a95-4d7c-99c6-f5ad110cd673', 'l8JPvjZWQcgKyvMFDvGNnGTGEV8z7zln_-GT4SuJSIs=', 'Chrome Browser', 'web', '58.11.0.200', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-29 13:46:53', '2025-09-28 13:16:31', 1, '2025-08-29 13:16:31', '2025-08-29 13:46:53'),
(171, 7, '9681f090-e727-4c60-8165-48bb5f6a2dc4', 'ucgk4k0t_dSeiswuAA4XCEhABUAL-SzWCIqnmCROP6c=', 'Chrome Browser', 'web', '58.10.141.247', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-29 16:09:33', '2025-09-28 13:20:40', 1, '2025-08-29 13:20:40', '2025-08-29 16:09:33'),
(172, 8, '3ad1517b-9844-484d-9fd0-7b9730c52c89', 'WriIBiTHvrY754eZvSR-PAafc35dlVsCwiitJXQ2wAM=', 'Chrome Browser', 'web', '58.11.0.200', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-29 15:50:15', '2025-09-28 15:11:56', 1, '2025-08-29 15:11:56', '2025-08-29 15:50:15'),
(173, 8, '856f1cbe-469d-4324-a9a6-cd1a6c40ab2d', 'X9hV40PDo1_5nmCQ21ho5s9FMqP2jfwbctlUbHCAL-M=', 'Chrome Browser', 'web', '58.11.0.200', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-29 16:20:45', '2025-09-28 16:14:18', 0, '2025-08-29 16:14:18', '2025-08-29 16:20:45'),
(174, 7, '9d2a1ddf-7ac1-47d6-8d3b-900db3627d42', 'jaK9iYNga0Ul3SwQkt3fk-cjvd3YN-iupqStFbSXEJY=', 'Chrome Browser', 'web', '58.11.0.200', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-29 16:41:20', '2025-09-28 16:20:48', 0, '2025-08-29 16:20:48', '2025-08-29 16:41:20'),
(175, 8, 'ca451cb0-5a2c-443c-a27d-e3895b6d69b8', 'nI8Yp9c1VLRfQmKR-JHkALkycbyjQkMO35x0S9kWvRo=', 'Chrome Browser', 'web', '58.11.0.200', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-29 21:31:51', '2025-09-28 16:41:22', 1, '2025-08-29 16:41:22', '2025-08-29 21:31:51'),
(176, 8, '3926a787-e6e7-46e9-acd6-ad281f5e411b', 'UbzRMQz5VGW_Cz6-kDPTG5UfI_cMkpUCqXpV5oA7Z0w=', 'Chrome Browser', 'web', '58.11.0.200', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-31 09:24:26', '2025-09-30 07:56:33', 1, '2025-08-31 07:56:33', '2025-08-31 09:24:26'),
(177, 7, '0a625f5d-7b51-4805-8a74-4b845ef661e2', 'JjP8k0ri7pTM-YC7D2MMzq2j_0C822B3bJ-1v5QYlSY=', 'Chrome Browser', 'web', '58.10.141.247', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-31 08:23:38', '2025-09-30 08:00:05', 0, '2025-08-31 08:00:05', '2025-08-31 08:23:38'),
(178, 7, 'd3cb4198-3cb4-48e1-8ccb-d0a64603e579', '3auuGwdBz5y6vDnPl8T1hfeiDxcpzLdsXO3NgD4K_aQ=', 'Chrome Browser', 'web', '58.11.0.200', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-31 08:57:31', '2025-09-30 08:02:32', 1, '2025-08-31 08:02:32', '2025-08-31 08:57:31'),
(179, 8, '5ba338d4-205a-4c14-8ac6-e1850653761a', 'laoJ50g2fWth8eI_hP0X_0UPlcs-NnlpR12SzfahrHk=', 'Chrome Browser', 'web', '58.10.141.247', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-08-31 08:41:34', '2025-09-30 08:23:47', 1, '2025-08-31 08:23:47', '2025-08-31 08:41:34'),
(180, 8, 'f00c37f8-4041-4d6d-a75d-a7a2c17eb5be', 'yeA0Hb3q3m4oTGLkKrHO5fUUPA4mKnkKhPtyhThfN68=', 'Chrome Browser', 'web', '58.11.0.200', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-09-01 10:58:31', '2025-10-01 10:43:26', 1, '2025-09-01 10:43:26', '2025-09-01 10:58:31'),
(181, 7, '5f9e33af-08ab-413f-aec7-e1eb1d2d4b8b', 'aHtY6nP9kNQOcOSf5ee2T36B9oiUqCeWpH3QMASspyg=', 'Chrome Browser', 'web', '58.11.0.200', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-09-01 12:03:36', '2025-10-01 12:03:32', 0, '2025-09-01 12:03:32', '2025-09-01 12:03:36'),
(182, 8, 'a3e7f873-16bb-449a-9a55-5585674a7fb7', 'AGUG-3i0c5PIUjKD7ryQLCkryCKnknMWyCOrPnfUP9Y=', 'Chrome Browser', 'web', '58.11.0.200', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-09-01 13:14:40', '2025-10-01 12:03:38', 1, '2025-09-01 12:03:38', '2025-09-01 13:14:40'),
(183, 7, '530f2bca-24b5-46eb-970b-e7abb7c4e957', 'y_rA2jmiF-UpAG6yUV7_bLoMdZM0RwktptbUJkj5z7o=', 'Chrome Browser', 'web', '58.10.135.22', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-09-02 22:15:02', '2025-10-02 10:10:39', 1, '2025-09-02 10:10:39', '2025-09-02 22:15:02'),
(184, 8, '6ca6f117-b3c3-4654-bc40-c9143a1999de', 'FDeqmEjELqbhK45vG7Lql5cD918gZhaQrS1bpP2d32c=', 'Chrome Browser', 'web', '58.11.0.200', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-09-02 14:03:20', '2025-10-02 12:13:20', 1, '2025-09-02 12:13:20', '2025-09-02 14:03:20'),
(185, 7, 'd31ed7c6-6c02-488e-9d8a-eb681b8e6780', 'aRq_kWbdjehByaqJGMAoVpViKf2J0xeDZ8MQfJ1Fhlw=', 'Chrome Browser', 'web', '58.10.129.204', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-09-03 17:34:00', '2025-10-03 07:45:06', 1, '2025-09-03 07:45:06', '2025-09-03 17:34:00'),
(186, 8, '64df7e4f-ac42-459c-a155-dc069884fdb4', 'uPgy9w9CkbJ9fQ-nrDwnIrRcVZdlZzIGj0Ci2kBCFGM=', 'Chrome Browser', 'web', '58.10.72.13', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-09-03 09:58:22', '2025-10-03 09:58:18', 1, '2025-09-03 09:58:18', '2025-09-03 09:58:22'),
(187, 8, '4df40766-8587-4f8f-b14b-05937d0057ed', 'XtF1RGXZ4pB3eI6meuDjXB1QAVFlob777_MBytcl1Bg=', 'Chrome Browser', 'web', '58.10.72.13', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-09-03 14:07:37', '2025-10-03 12:12:54', 1, '2025-09-03 12:12:54', '2025-09-03 14:07:37'),
(188, 8, '8a68f282-3eee-4c2a-862f-d17e07bbe64e', '4zJY9MLiqKKjw_q_ivOwRk4fFaHU2AsZ4Ti8soFsgXo=', 'Chrome Browser', 'web', '58.10.72.13', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-09-03 18:31:09', '2025-10-03 15:31:50', 1, '2025-09-03 15:31:50', '2025-09-03 18:31:09'),
(189, 8, '00873966-24c6-4fc9-851e-c3b1fc0c1545', 'EA-pmexm1651cuj5aC0CN4UOmFZ32zzUbN2rYnQZP2Q=', 'Chrome Browser', 'web', '58.10.72.13', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-04 22:53:52', '2025-10-04 11:06:55', 1, '2025-09-04 11:06:55', '2025-09-04 22:53:52'),
(190, 7, '5bf9ccb6-3ec0-479f-8c8e-120a16c71183', 'UqoYfSNQtz8y8iAISKQg3BtNbrAi0GBXsgDKWJPNrpY=', 'Chrome Browser', 'web', '58.10.129.204', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-09-04 22:32:20', '2025-10-04 15:19:21', 1, '2025-09-04 15:19:21', '2025-09-04 22:32:20'),
(191, 8, 'ae8bd319-685b-4384-bc65-4640234dcb07', 'w5BBvbuPJJmTQTU8m5hR_6DJXXjJ-_5mTl2zQlFWQow=', 'Chrome Browser', 'web', '58.10.72.13', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-05 10:42:41', '2025-10-05 09:53:01', 1, '2025-09-05 09:53:01', '2025-09-05 10:42:41'),
(192, 8, '2c359008-1b50-4233-a8d4-6bd41ae28726', 'eMlZ9vfOc3rGdzwHV78xixGjxHAZ1B93_CrFvCrpd08=', 'Chrome Browser', 'web', '58.10.72.13', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-05 19:20:18', '2025-10-05 11:05:17', 1, '2025-09-05 11:05:17', '2025-09-05 19:20:18'),
(193, 8, '581d55ac-f4ff-48a8-8baa-ca4fed93e8b4', 'YfBNR4Z7xE8tOTe2U6Wu3-P2VOcX9F94RrOWjM-WzC0=', 'Chrome Browser', 'web', '58.10.129.204', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-09-06 13:37:55', '2025-10-06 03:30:08', 1, '2025-09-06 03:30:08', '2025-09-06 13:37:55'),
(194, 8, '06a7ca93-74b1-40b9-922c-2d40a6cd0183', 'g9i0Y5arHGaijgfrUMbiJI0383756O1ODR72fZWdj1s=', 'Chrome Browser', 'web', '58.10.72.13', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-06 10:33:38', '2025-10-06 09:57:17', 1, '2025-09-06 09:57:17', '2025-09-06 10:33:38'),
(195, 8, '6615007f-ece4-4972-8b4b-16685f599df0', 'ImzGL6mrDQgnKAW-0BnvXLwTyRFhuALW7plIQb-NDR0=', 'Chrome Browser', 'web', '58.10.72.13', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-06 11:04:37', '2025-10-06 11:04:22', 0, '2025-09-06 11:04:22', '2025-09-06 11:04:37'),
(196, 7, '491b6524-145b-4482-a792-b89dc585c0ed', 'KeLIwbXx4aiBWnI1rqDAaSLvhRZNnhn1_t4MdKFgZWU=', 'Chrome Browser', 'web', '58.10.72.13', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-06 11:10:20', '2025-10-06 11:04:39', 0, '2025-09-06 11:04:39', '2025-09-06 11:10:20'),
(197, 7, '3a5423fe-31b8-4d6d-9ae1-a3d656490222', '5kv-8hQa5LyGdCPcBSe1Ji5pYC-QiXmO9lrYHlUJrr8=', 'Chrome Browser', 'web', '58.10.72.13', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-06 11:27:39', '2025-10-06 11:10:21', 0, '2025-09-06 11:10:21', '2025-09-06 11:27:39'),
(198, 8, '7ce3a80d-a4a1-40ff-8ce3-e6ade61fbc89', 'UicfObYAc8tXGtu9YwF0_DKAqN3IaDIoXtV6FKRCi0Q=', 'Chrome Browser', 'web', '58.10.72.13', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-06 13:11:37', '2025-10-06 11:27:42', 1, '2025-09-06 11:27:42', '2025-09-06 13:11:37'),
(199, 8, 'ef8e982f-561d-40c0-ab16-ba2e9107e3fb', '7qdbH-xZx_8Rvg9uzpF5fKkocN9z2SK4pgLWduP5sps=', 'Chrome Browser', 'web', '58.10.72.13', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-06 14:42:14', '2025-10-06 14:39:32', 1, '2025-09-06 14:39:32', '2025-09-06 14:42:14'),
(200, 8, '1b14be5c-a655-4c34-b65e-38e2f6efa104', 'ah8SEOsM1iPA6S8xcXYQ-jfH7ECMuEr386gq1UC6eVw=', 'Chrome Browser', 'web', '58.10.129.204', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-09-06 15:44:17', '2025-10-06 14:56:23', 1, '2025-09-06 14:56:23', '2025-09-06 15:44:17'),
(201, 8, 'bd3c4485-76b2-4806-a6df-106a7151d0ce', 'ptwM1vGhR5Tuqk2uPPqUc2tRMEhA-Ba9EV4Zbji4TCg=', 'Chrome Browser', 'web', '58.10.72.13', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-06 16:25:08', '2025-10-06 15:43:45', 1, '2025-09-06 15:43:45', '2025-09-06 16:25:08'),
(202, 8, 'ad83a95c-7b47-462d-bf77-4c5811547984', 'LWFbRDEbEcWfjpC1AOb9IxRXn4f8UCkKkDAo8dV3eEs=', 'Chrome Browser', 'web', '58.10.129.204', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-09-06 16:39:41', '2025-10-06 16:01:06', 1, '2025-09-06 16:01:06', '2025-09-06 16:39:41'),
(203, 8, 'edf0a113-18e0-4140-bbcd-8f5aa14b8a10', '4zyMCE8Q2M5-WSRXKh1SLTd4oWMhc8TaUcy1K86Mh1A=', 'Chrome Browser', 'web', '58.10.129.204', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-09-06 18:36:33', '2025-10-06 17:56:04', 1, '2025-09-06 17:56:04', '2025-09-06 18:36:33'),
(204, 8, 'de8e2fec-4559-4599-8117-41687c551481', '2mV8mVLvcqhccfzcj75WXQxRGmfNQ7tbPwCjgEIiRgY=', 'Chrome Browser', 'web', '58.10.129.204', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-09-07 03:13:31', '2025-10-07 00:29:06', 0, '2025-09-07 00:29:06', '2025-09-07 03:13:31'),
(205, 7, '08f4b236-31a0-4080-bc74-ad2749097578', 'mtRAfGaV2g8Gnb9DYvHgvzvT10ak3yDyfnv-qbupZ0w=', 'Chrome Browser', 'web', '58.10.129.204', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-09-07 04:01:47', '2025-10-07 03:13:52', 1, '2025-09-07 03:13:52', '2025-09-07 04:01:47'),
(206, 7, '94a1c8e3-b551-4841-8ebf-d40b34fc962a', 'Z13CA_MvUQTm6rCzB5hBQ9FHQ3fk0pNDHAd4IqWjsZY=', 'Chrome Browser', 'web', '58.10.129.204', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-09-07 04:47:47', '2025-10-07 04:16:33', 0, '2025-09-07 04:16:33', '2025-09-07 04:47:47'),
(207, 8, '5d439a66-a323-48ac-af87-23fe9341d832', 'PEAmo_mSN_yt9HJR5g0r2ppVBJ9b1f5RHxJToxU4ulM=', 'Chrome Browser', 'web', '58.10.129.204', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-09-07 07:45:05', '2025-10-07 04:48:02', 0, '2025-09-07 04:48:02', '2025-09-07 07:45:05'),
(208, 7, '6462231d-2ac0-41f2-afc1-c787a0e7d400', 'oZucGL3T1XKgALXKA0oSVbwTifGZgR4VMHwc6sLobYs=', 'Chrome Browser', 'web', '58.10.129.204', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-09-07 07:49:02', '2025-10-07 07:45:21', 0, '2025-09-07 07:45:21', '2025-09-07 07:49:02'),
(209, 8, 'd2ddf700-32ca-4a8c-b49d-7d24a4795eee', 'foRGk5B3B60yosRBTjPEw9Y0oeVlT96BvWoJW0qir0A=', 'Chrome Browser', 'web', '58.10.129.204', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-09-07 07:59:40', '2025-10-07 07:49:11', 0, '2025-09-07 07:49:11', '2025-09-07 07:59:40'),
(210, 8, 'fd87b818-e8dd-4387-af5a-eb9bb041cbef', 'VnNCQkAjqkISeNvqteIKQybTAE-riDHMtLjjInSB9aU=', 'Chrome Browser', 'web', '58.10.72.13', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-07 07:52:03', '2025-10-07 07:51:02', 0, '2025-09-07 07:51:02', '2025-09-07 07:52:03'),
(211, 7, 'cdec6d3e-3b5b-4647-89dc-0ef733acbf3f', '47bSyICNSSbY9gyY4TB26WgvTD7S9bwG5u5_jNOMZgk=', 'Chrome Browser', 'web', '58.10.72.13', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-07 07:53:17', '2025-10-07 07:52:05', 0, '2025-09-07 07:52:05', '2025-09-07 07:53:17'),
(212, 8, '8debe255-bb10-4a84-ae4c-9d5047a327ae', '13ES3DypNvGXbA6OR21sQWShy9lnaP5Q-tv_OdHZkNM=', 'Chrome Browser', 'web', '58.10.72.13', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-07 08:21:31', '2025-10-07 07:53:19', 0, '2025-09-07 07:53:19', '2025-09-07 08:21:31'),
(213, 7, '07f12c8a-2c9c-4646-a3c6-297857dbc85f', 'O_ak5SsTaLcSvjKqVILq0FeZ4Z_k0ohYxnaGff8se7o=', 'Chrome Browser', 'web', '58.10.129.204', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-09-07 08:00:32', '2025-10-07 07:59:46', 0, '2025-09-07 07:59:46', '2025-09-07 08:00:32'),
(214, 8, '64768987-39e2-48be-9c0e-8d097d27be2a', 'hABtm4tBQlOu1ffMbYugHJE4wnwt3r62BW_n7_LxQz0=', 'Chrome Browser', 'web', '58.10.129.204', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-09-07 08:08:26', '2025-10-07 08:00:38', 0, '2025-09-07 08:00:38', '2025-09-07 08:08:26'),
(215, 7, '8a35e1b9-661f-415d-8f82-6f08c7d86c44', 'YHD3ax9ABG7SmIsjsj4D8neNJHm2Vr16swmGQZuDWqg=', 'Chrome Browser', 'web', '58.10.129.204', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-09-07 09:03:31', '2025-10-07 08:08:31', 1, '2025-09-07 08:08:31', '2025-09-07 09:03:31'),
(216, 7, '2d5c53c3-0d2e-4bc0-98e3-ea9dd68a3189', '49BfOsjdNStBg24UKNZM0DqPWibhMvvp6i9bCP0yVHc=', 'Chrome Browser', 'web', '58.10.72.13', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-07 08:46:28', '2025-10-07 08:21:35', 0, '2025-09-07 08:21:35', '2025-09-07 08:46:28'),
(217, 8, 'cf92f214-ec3d-4ed7-b1ff-40dbd93b7a86', 'vwaBHrUKrO-xJERF0NhIX0OeHPqqYwFYeKakzgAJ2sg=', 'Chrome Browser', 'web', '58.10.72.13', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-07 08:57:31', '2025-10-07 08:46:30', 0, '2025-09-07 08:46:30', '2025-09-07 08:57:31'),
(218, 7, '64bfc5c2-c728-4303-98e9-81877c2ae09e', 'NIXFaa1CNMzb6gWLcXtfmzcKK0rjLo8FQlMPYt7OSS8=', 'Chrome Browser', 'web', '58.10.72.13', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-07 09:09:29', '2025-10-07 08:57:33', 1, '2025-09-07 08:57:33', '2025-09-07 09:09:29'),
(219, 8, '747f95cc-ec34-49d0-a465-9cfe5a5a9d5d', '4CX0gpVsJCM5690hkkRJYwuJQgjh1VQeKr9wNdBkoRM=', 'Chrome Browser', 'web', '58.10.119.32', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-08 12:25:15', '2025-10-08 10:54:40', 1, '2025-09-08 10:54:40', '2025-09-08 12:25:15'),
(220, 8, 'f78836fe-8f12-4cbf-bf4f-8f271db3d93d', 'pDHSnYYz_f16R4zo1y4xymr4AzmIdFJME5gpKb2Owkg=', 'Chrome Browser', 'web', '58.10.119.32', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-09 13:23:37', '2025-10-09 10:13:11', 1, '2025-09-09 10:13:11', '2025-09-09 13:23:37'),
(221, 8, '94cab3cf-4c24-4d3b-959b-21a33af013f6', 'lwBsUWbp1_ltSgA8DaGbAoOrqY83uzep0I1iQaOdLy8=', 'Chrome Browser', 'web', '58.10.119.32', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-10 14:55:32', '2025-10-10 13:10:33', 1, '2025-09-10 13:10:33', '2025-09-10 14:55:32'),
(222, 8, '2d3edb97-c187-429b-84c9-d0dfd0097bbd', 'TnF2BI0WdbnmhRMk4Mhh0OjxBJiKuxV2bV3TPH33ork=', 'Chrome Browser', 'web', '58.10.119.32', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-11 16:33:54', '2025-10-11 12:43:34', 1, '2025-09-11 12:43:34', '2025-09-11 16:33:54'),
(223, 8, 'b504e113-aead-434b-9a6b-8175900d799a', 'QpVLhnbvYhCdyTeL0iRPcR14y4jVgeB0DnUmQFBXOe4=', 'Chrome Browser', 'web', '110.168.239.196', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-12 11:28:31', '2025-10-12 08:38:45', 1, '2025-09-12 08:38:45', '2025-09-12 11:28:31'),
(224, 8, '97c0a72b-980d-46fc-9b44-c88a040560a4', 'VT3j7yazMfM8rwLFHUq-Yix4owJrR9EXBPU9wX0meLg=', 'Chrome Browser', 'web', '58.10.119.32', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-12 15:50:13', '2025-10-12 12:19:18', 1, '2025-09-12 12:19:18', '2025-09-12 15:50:13'),
(225, 8, '73ab6244-06ca-4606-8818-e8a2b0e9ceb9', 'T5tbdLtZBINUxKxORlgypWF93FHnn3zrrybTJuW1c9Q=', 'Chrome Browser', 'web', '110.168.239.196', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-12 14:01:56', '2025-10-12 12:20:26', 0, '2025-09-12 12:20:26', '2025-09-12 14:01:56'),
(226, 7, 'f3eaa6c0-0c32-461b-8d06-7a4772b59e72', '3d2RfH-H3W-rWqdgpZR745l2DXmjXl3IMgG8Wmxo8EU=', '', 'api_client', '58.10.119.32', 'PostmanRuntime/7.45.0', '2025-09-12 13:06:00', '2025-10-12 12:43:49', 1, '2025-09-12 12:43:49', '2025-09-12 13:06:00'),
(227, 8, 'f10053fa-3125-45c6-a1be-17eae079064c', 'F-oZkgmR8Y9VPFR91LxoFD8tUGc5U766GmSb9a5wS1c=', '', 'api_client', '58.10.119.32', 'PostmanRuntime/7.45.0', '2025-09-12 13:08:37', '2025-10-12 13:08:26', 1, '2025-09-12 13:08:26', '2025-09-12 13:08:37'),
(228, 7, '38165b0c-aef0-4c0c-a211-898b9d282f20', 'gxV9ZZyLYA-l7b1hExrTtXAKB1dxNfPA3SRpffTsYGc=', 'Chrome Browser', 'web', '110.168.239.196', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-12 14:25:09', '2025-10-12 14:02:06', 0, '2025-09-12 14:02:06', '2025-09-12 14:25:09'),
(229, 8, '27adf3fa-db28-4c5a-98e5-cef9b1f9a6f1', '7fAvtTJcLk_I-V4Y2oLrHM-TwMpjX55_x8QcNxQjvjo=', 'Chrome Browser', 'web', '110.168.239.196', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-12 14:26:05', '2025-10-12 14:25:15', 0, '2025-09-12 14:25:15', '2025-09-12 14:26:05'),
(230, 7, '45cc7bbd-c725-4397-b9f3-42e81e276405', '6DkUJ0T2SjNU9CQTn-DucAK_EbZMJjhbWvvPWxbb9xc=', 'Chrome Browser', 'web', '110.168.239.196', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-12 16:52:59', '2025-10-12 14:26:14', 1, '2025-09-12 14:26:14', '2025-09-12 16:52:59'),
(231, 7, '24e32e45-7d1a-4120-ad19-0e6c8ac30fb3', 'P-TrRQsi9C2ahJTcm9XKVmV6Q6zUYrb6RzC4gvDYZtw=', 'Chrome Browser', 'web', '58.10.119.32', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-12 17:13:57', '2025-10-12 16:13:20', 1, '2025-09-12 16:13:20', '2025-09-12 17:13:57'),
(232, 8, 'f6d51eec-c6ba-4987-9798-e44faa54647a', 'S_u6M8m5IJUk0OOsFILDzIPKcF4ccq9hc0bd0dpqg1A=', 'Chrome Browser', 'web', '58.10.141.29', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-13 03:11:11', '2025-10-13 03:10:39', 0, '2025-09-13 03:10:39', '2025-09-13 03:11:11'),
(233, 7, 'edafeceb-8bbc-4923-a50e-ad329391937f', '5nPl4OSxZnNASUzOigaygB6JfxWPzrz1c6nGSjOFOBU=', 'Chrome Browser', 'web', '58.10.141.29', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-13 14:20:42', '2025-10-13 03:11:18', 1, '2025-09-13 03:11:18', '2025-09-13 14:20:42'),
(234, 7, '6f4b3869-443a-43ad-bee0-70075cb150fb', '9LDzOeIMkMeizTWdIe7aver9tYNiDKULXRo6kHaPjjM=', 'Chrome Browser', 'web', '58.10.119.32', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-13 12:07:15', '2025-10-13 11:16:13', 1, '2025-09-13 11:16:13', '2025-09-13 12:07:15'),
(235, 7, 'ab7c8c1f-7039-4522-af2d-fa7a2de974c8', '00YpaNkrPerDKk1t5hvvM5gFIstQ-dmSc2c9445SXnk=', 'Chrome Browser', 'web', '58.10.119.32', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-13 14:18:37', '2025-10-13 12:24:27', 0, '2025-09-13 12:24:27', '2025-09-13 14:18:37'),
(236, 7, '25183f40-f261-451f-b18c-6427cf0d799b', 'wElt4DiArvgNP6vDMxKx7cyHSQawWKSmMpDyR1htA9A=', '', 'api_client', '58.10.119.32', 'PostmanRuntime/7.46.0', '2025-09-13 12:37:20', '2025-10-13 12:37:10', 1, '2025-09-13 12:37:10', '2025-09-13 12:37:20'),
(237, 8, '14303cf0-2c0f-4417-a589-15768d13ba67', 'R_GjwldS_qrL8Jq0dvTFX-2So9Ry8IVS7aHianVfPF4=', 'Chrome Browser', 'web', '58.10.119.32', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-13 15:27:35', '2025-10-13 14:18:39', 0, '2025-09-13 14:18:39', '2025-09-13 15:27:35'),
(238, 7, '7bc600d7-1827-4d0b-9fa8-6a19643f7b71', 'sbe9vXI90e_fvHaIKfnvt3of0vzMqWiH7DEje4T3WLs=', 'Chrome Browser', 'web', '58.10.141.29', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-13 16:36:41', '2025-10-13 14:42:34', 1, '2025-09-13 14:42:34', '2025-09-13 16:36:41'),
(239, 8, '0039d316-c966-4407-a8b4-93ac92ae2e7a', 'dIm38DGyPSOt-RSkRHYaOb7pbCAelY8xp8ADPdkNs34=', 'Chrome Browser', 'web', '58.10.119.32', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-13 15:27:39', '2025-10-13 15:27:38', 0, '2025-09-13 15:27:38', '2025-09-13 15:27:39'),
(240, 7, '81321a8e-f489-4d20-a48b-7f983787fda6', 'cHbHxAP7aIb1SbGXI5Pv05STpmbvQK5DWBw2Jc3ErT4=', 'Chrome Browser', 'web', '58.10.119.32', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-13 15:28:01', '2025-10-13 15:27:43', 0, '2025-09-13 15:27:43', '2025-09-13 15:28:01'),
(241, 7, 'afcee0bb-b5b8-4d21-9852-9c57f4c31cc4', 'ng7J3lX9xqUSzKQ8b9znRVq0O_6zyTZ96abr0T7xeec=', 'Chrome Browser', 'web', '58.10.119.32', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-13 15:28:07', '2025-10-13 15:28:05', 0, '2025-09-13 15:28:05', '2025-09-13 15:28:07'),
(242, 8, '4c0cbafc-6e47-44ef-9290-7860ea9d9e38', 'GKP4pjtx4HxwnHGhRFpdZpvbMLejxYoRHNZ9eOXhsvI=', 'Chrome Browser', 'web', '58.10.119.32', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-13 17:14:48', '2025-10-13 15:28:09', 0, '2025-09-13 15:28:09', '2025-09-13 17:14:48'),
(243, 7, 'b7d3153c-1362-451f-afdc-85d89f805e75', 'GBacdpQ85D4ZqnksT19ajBoUXDI96WikjfPnwR1G-_4=', 'Chrome Browser', 'web', '58.10.141.29', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-14 08:12:58', '2025-10-13 16:39:25', 0, '2025-09-13 16:39:25', '2025-09-14 08:12:58'),
(244, 7, 'f64320a1-d332-4696-a341-a9df4ac5768c', 'XxHtyO74NTiDQg3RweQPtCspbluor44AEV-eynjx3N4=', 'Chrome Browser', 'web', '58.10.119.32', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-13 17:15:19', '2025-10-13 17:14:52', 0, '2025-09-13 17:14:52', '2025-09-13 17:15:19'),
(245, 8, 'b616224f-b934-42cc-9f99-22df9dc51da1', 'lteoXLjMIysVeoELPGh1NEInVa2tJ_Exr67XwH41iOc=', 'Chrome Browser', 'web', '58.10.119.32', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-13 17:50:06', '2025-10-13 17:15:22', 0, '2025-09-13 17:15:22', '2025-09-13 17:50:06'),
(246, 7, '094ab8fa-6fa8-40bd-aa0a-8457d49a4454', 'bOU0ulti5A-kad_azROznEH2ApPFpOZn2avZ6uHzQv0=', 'Chrome Browser', 'web', '58.10.119.32', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-13 17:52:22', '2025-10-13 17:50:09', 0, '2025-09-13 17:50:09', '2025-09-13 17:52:22'),
(247, 8, 'e1bae695-02b6-4d6e-bd17-60d009be9496', 'fYjQbkKTy0x8hvtLFlB-hJATVG_XLA8zBXC1-OKDHr8=', 'Chrome Browser', 'web', '58.10.119.32', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-13 17:58:45', '2025-10-13 17:52:28', 1, '2025-09-13 17:52:28', '2025-09-13 17:58:45'),
(248, 7, '29f9f3c2-b154-4c20-b183-947263b592e2', 'HA4QTCZAseohlTi_ehyB6zLiuhmSLfGkM9L4xjowotE=', 'Chrome Browser', 'web', '58.10.119.32', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-14 07:07:58', '2025-10-14 07:03:14', 0, '2025-09-14 07:03:14', '2025-09-14 07:07:58'),
(249, 8, '585a2c89-2776-4166-8b5b-140b96576f62', 'QhQOAU-MWshj5p63nWxKSvQx_R711jDgN7IU4VgiSYA=', 'Chrome Browser', 'web', '58.10.119.32', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-14 07:20:15', '2025-10-14 07:08:07', 0, '2025-09-14 07:08:07', '2025-09-14 07:20:15'),
(250, 7, '6f02cfb9-dfef-4214-b4e2-1c93046c8016', 'ifKQP3Jl_YA2E5KSaUi9uFccCSfJK0JVsrf2JvHEeDI=', 'Chrome Browser', 'web', '58.10.119.32', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-14 07:20:52', '2025-10-14 07:20:17', 0, '2025-09-14 07:20:17', '2025-09-14 07:20:52'),
(251, 8, '92b1ad8f-b52d-47a7-94cf-3c4871b46c3d', 'Z4CDTeAZVosMuZD9ewyArniqjQAZpCj-8q2ZxBICmVI=', 'Chrome Browser', 'web', '58.10.119.32', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-14 07:22:16', '2025-10-14 07:20:54', 0, '2025-09-14 07:20:54', '2025-09-14 07:22:16'),
(252, 7, '72830304-6341-4dc2-ae06-7158bb07a977', 'tLy9rUhUF5BH-aEhtfcgZwEnUZkh5VAUeigRi56DFik=', 'Chrome Browser', 'web', '58.10.119.32', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-14 07:22:48', '2025-10-14 07:22:31', 0, '2025-09-14 07:22:31', '2025-09-14 07:22:48'),
(253, 8, '4faeff15-cb06-4390-882a-7e76ab369ede', 'H2qEp3X6PPLbsqDddkzj7xTPThiQWQpdhWTAxukEhE8=', 'Chrome Browser', 'web', '58.10.119.32', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-14 07:23:21', '2025-10-14 07:22:50', 0, '2025-09-14 07:22:50', '2025-09-14 07:23:21'),
(254, 7, 'c18a335a-981e-4229-b64d-cb8e15d253ee', 'UHosSNRDxZ89qZEoH5nsAtXZFZM4J92Rpcw_AdPs8-Y=', 'Chrome Browser', 'web', '58.10.119.32', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-14 07:23:55', '2025-10-14 07:23:23', 0, '2025-09-14 07:23:23', '2025-09-14 07:23:55'),
(255, 8, '13f9825e-042d-4319-a982-9d1f446d03a2', 'cS65pobBsCjP8GtQdai_rOzVSTH3nKCu6O5XpoYirBI=', 'Chrome Browser', 'web', '58.10.119.32', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-14 07:24:10', '2025-10-14 07:23:59', 0, '2025-09-14 07:23:59', '2025-09-14 07:24:10'),
(256, 7, '64e10b5a-e6f3-4622-8caf-e63b1b6a46ad', 'qmsDhmtkxobM-X2fRFDdu-AgAmrdWp47wjzRpLg7Dd8=', 'Chrome Browser', 'web', '58.10.119.32', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-14 07:24:24', '2025-10-14 07:24:19', 0, '2025-09-14 07:24:19', '2025-09-14 07:24:24'),
(257, 8, 'f7a85784-1200-4489-8c5d-534c136e304e', 'owjpSfy__XBcxgsxcm42olNDGw6YeKUtxQfF2cTxYFQ=', 'Chrome Browser', 'web', '58.10.119.32', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-14 07:24:38', '2025-10-14 07:24:26', 0, '2025-09-14 07:24:26', '2025-09-14 07:24:38'),
(258, 8, '51ab41fa-87eb-4c00-95a3-4e3e9dfaba45', 'RWFxF0ihKWrK1X2YiPVLNwTQ8uGd2WOCaiTzhCxWNak=', 'Chrome Browser', 'web', '58.10.119.32', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-14 07:24:42', '2025-10-14 07:24:39', 0, '2025-09-14 07:24:39', '2025-09-14 07:24:42'),
(259, 7, 'a68038bf-560c-4b92-8bbc-45e88c76a9f6', 'Bk2lVP4WMVoEWaftilm6m8GlB4Ki6u38FGU8b3PHFIU=', 'Chrome Browser', 'web', '58.10.119.32', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-14 07:40:49', '2025-10-14 07:24:43', 0, '2025-09-14 07:24:43', '2025-09-14 07:40:49'),
(260, 8, '32338347-717a-4077-b512-8f70839bd692', 'QJFa5f-QBM8EPC7Muj_teLl6shFzCIi6V_JqJYq5F-4=', 'Chrome Browser', 'web', '58.10.119.32', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-14 08:08:25', '2025-10-14 07:40:52', 0, '2025-09-14 07:40:52', '2025-09-14 08:08:25'),
(261, 7, 'b07202b5-635f-4f46-9eb7-9c4ed42c5457', 'r7SNnHgI9ed3mEcFEomLiMFjnNin_oJMcJEv5yLsjN4=', 'Chrome Browser', 'web', '58.10.119.32', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-14 08:09:37', '2025-10-14 08:08:27', 0, '2025-09-14 08:08:27', '2025-09-14 08:09:37'),
(262, 8, 'ebca5d66-5014-4d17-92c1-1833aece7e7c', 'UH8Kz2Ias5E2zs3s5eJexoI0uTxqj-zAPyFR800shTk=', 'Chrome Browser', 'web', '58.10.119.32', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-14 08:32:55', '2025-10-14 08:09:40', 0, '2025-09-14 08:09:40', '2025-09-14 08:32:55'),
(263, 8, 'a134d86a-d934-4105-aff9-463fe32575b2', 'zA2_IogiMPbBaQ67cE3xlv3gfd6VDD_hACfiN1essII=', 'Chrome Browser', 'web', '58.10.148.156', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-14 08:18:09', '2025-10-14 08:13:05', 0, '2025-09-14 08:13:05', '2025-09-14 08:18:09'),
(264, 7, 'aa74965f-31b2-4e50-9450-7d8964139152', 'E_dWWRlJ-TQ2j1gN1Xf59W9gxplTT3zTX5AXvdGbEyI=', 'Chrome Browser', 'web', '58.10.148.156', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-14 13:48:18', '2025-10-14 08:18:18', 1, '2025-09-14 08:18:18', '2025-09-14 13:48:18'),
(265, 7, '402d892d-569b-48a6-bdfd-0d5daddbdbb1', '3IQ82gQc1_o6XLPLw3giqszbsFTCFWh6WjrwqIFE-dY=', 'Chrome Browser', 'web', '58.10.119.32', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-14 08:44:24', '2025-10-14 08:32:57', 0, '2025-09-14 08:32:57', '2025-09-14 08:44:24'),
(266, 8, '5410bb09-8c0a-4242-945c-b956421bcc6e', '6FW8IUo2oYgNUfaipL63_niCvBrgSHd1u3V-rJ6jedU=', 'Chrome Browser', 'web', '58.10.119.32', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-14 09:01:49', '2025-10-14 08:44:26', 0, '2025-09-14 08:44:26', '2025-09-14 09:01:49'),
(267, 8, '5bb5b659-d982-4a30-8603-4bf832146358', 'NJETJCIZbNy9Qs0AgPlQbUtipoiDcz2tn2CSiwInQJ8=', 'Chrome Browser', 'web', '58.10.119.32', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-14 09:01:53', '2025-10-14 09:01:50', 1, '2025-09-14 09:01:50', '2025-09-14 09:01:53'),
(268, 8, 'caff03af-e2a0-46a1-88dc-fdc3470618f0', 'aiptA8nNfYaQrVc_yFn6_ucFKiIHnDgw0ZMwbYUQkiY=', 'Chrome Browser', 'web', '58.10.106.234', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-15 07:39:15', '2025-10-15 07:20:39', 0, '2025-09-15 07:20:39', '2025-09-15 07:39:15'),
(269, 7, '444b5f94-7833-4f6f-b95f-5ae2fd7094bb', 'YtRMZrtE5aPv_2MGCgDrqq0nobQx_dAPD2pEHqqWQ6M=', 'Chrome Browser', 'web', '58.10.106.234', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-15 08:36:49', '2025-10-15 07:39:22', 0, '2025-09-15 07:39:22', '2025-09-15 08:36:49'),
(270, 8, 'd7217a90-333d-4a38-814c-2e690ceea2d4', 'KhfZW2qm4fmTjX4fZlIFnV0rnlBUff9TmGLg-0LMPfc=', 'Chrome Browser', 'web', '58.10.106.234', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-15 08:37:11', '2025-10-15 08:37:01', 0, '2025-09-15 08:37:01', '2025-09-15 08:37:11'),
(271, 7, 'cb3f2596-40a2-4341-a3ce-9a1fceb1efea', 'lr_e4zX6tc3rKdAEHtCvQPciNQhLw1JkANrzLo9bBvQ=', 'Chrome Browser', 'web', '58.10.106.234', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-15 08:42:44', '2025-10-15 08:37:38', 1, '2025-09-15 08:37:38', '2025-09-15 08:42:44'),
(272, 8, '7be52480-2e34-4c48-b4cd-9e641627dd19', 'Ypa3FTMydqLFGnbj7mbM8Aus-QwLDeHr_1CV6GHDEEU=', 'Chrome Browser', 'web', '58.10.129.101', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-16 14:20:38', '2025-10-16 12:30:38', 1, '2025-09-16 12:30:38', '2025-09-16 14:20:38'),
(273, 8, '21bc709e-818c-4944-9c8c-4e487598e93e', 'GUxKERgRgPgg_qzZtg6IyWn69qQDbJWEec6jS9MgGpo=', 'Chrome Browser', 'web', '58.10.72.50', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-17 09:38:08', '2025-10-17 09:19:11', 1, '2025-09-17 09:19:11', '2025-09-17 09:38:08'),
(274, 8, 'a0752083-8086-452e-aeb0-3d3ee9aedee3', 'HfE9oasB057EImjq7dytSJGZWodQv5fJYztZn1vkSFA=', 'Chrome Browser', 'web', '58.10.72.50', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-17 12:06:54', '2025-10-17 10:21:07', 0, '2025-09-17 10:21:07', '2025-09-17 12:06:54'),
(275, 8, '2ec7dd1d-493f-46d7-9f8e-7d44d851dc44', 'BpkZW1UcJNGnCAlYIG7CMD3ispn1Ts9kz3HwNf8yOWg=', 'Chrome Browser', 'web', '58.10.129.101', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-17 11:22:36', '2025-10-17 10:27:37', 1, '2025-09-17 10:27:37', '2025-09-17 11:22:36'),
(276, 7, '0b65d9ed-f4d8-44eb-80c5-f6e60e84c851', 'Yv0BOdc4yXR3i1vl0RInOP0-GtxKuJEjeHRWjVBPE64=', 'Chrome Browser', 'web', '58.10.72.50', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-17 14:52:04', '2025-10-17 12:07:05', 1, '2025-09-17 12:07:05', '2025-09-17 14:52:04'),
(277, 7, 'abddb483-6537-4215-ad65-b5b9ac7cc295', 'rsRcbujmMsNCWOaOmp2tV7Kc0yhnn2gc78ZvRYRdqyg=', 'Chrome Browser', 'web', '110.168.242.151', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-18 13:58:40', '2025-10-18 06:21:59', 1, '2025-09-18 06:21:59', '2025-09-18 13:58:40'),
(278, 8, '388dfd7f-4d32-48d7-bee1-0ba6a1680c59', 'J9FUKwmHTi8MYUcGpW2Nlrg-nVEx8mcKQRm8UvUHP14=', 'Chrome Browser', 'web', '58.10.129.101', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-18 10:38:52', '2025-10-18 10:38:41', 0, '2025-09-18 10:38:41', '2025-09-18 10:38:52'),
(279, 7, '1c346d07-dc84-4995-892a-62e144cefcac', 'gTH1nbF2ghFE_6nF4EvSzFeFL23yDZkLxk_M9vqpDZ4=', 'Chrome Browser', 'web', '58.10.129.101', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-18 12:18:54', '2025-10-18 10:38:54', 1, '2025-09-18 10:38:54', '2025-09-18 12:18:54'),
(280, 7, '8c10d66a-ef84-49b8-beae-9605bfab020d', 'xzBV7m1hpAVCQ2lJqIfPpgLjgwdW_dw8u4ZVIxKC4X0=', 'Chrome Browser', 'web', '58.10.129.101', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-18 13:46:45', '2025-10-18 12:57:06', 0, '2025-09-18 12:57:06', '2025-09-18 13:46:45'),
(281, 8, 'c98c76b5-c352-46a8-8c94-9e7e9c1bd1bc', 'J8fCQACpsDDs7XEHjAwYp813n_HMyMXnFpwY7ytB_kk=', 'Chrome Browser', 'web', '58.10.129.101', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-18 15:47:27', '2025-10-18 13:46:49', 1, '2025-09-18 13:46:49', '2025-09-18 15:47:27'),
(282, 7, '7b43e6c7-2876-4720-a045-298db8934018', 'abmmhAihBvIwB_IkXn4BwGY_cuXokP8w15BvRrYcC3s=', 'Chrome Browser', 'web', '110.168.242.151', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-19 10:58:10', '2025-10-19 06:36:22', 1, '2025-09-19 06:36:22', '2025-09-19 10:58:10'),
(283, 7, '9fab6680-41b1-4466-a72e-03125b5fe6fb', 'sNU_NCubk3Au2ACBNqMVPMAKN2ZKQ2J29QFtZAcsAnc=', 'Chrome Browser', 'web', '110.168.242.151', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-19 14:39:09', '2025-10-19 11:36:33', 1, '2025-09-19 11:36:33', '2025-09-19 14:39:09'),
(284, 8, 'fbe44980-2518-4094-a1c2-cd42a9a1ef0c', 'lIBhOGnEW5O_IMXvllzyqo13bk0Hr1GfGLCfk_R3XFs=', 'Chrome Browser', 'web', '58.10.129.101', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-19 12:56:04', '2025-10-19 12:55:56', 0, '2025-09-19 12:55:56', '2025-09-19 12:56:04'),
(285, 7, 'e9a24846-6e7d-41a5-a4ac-4d46360d70c7', '2XPkRQUNtasCjKC7HZoxiKKSmwTLrV5vSCP8jdmm9Vs=', 'Chrome Browser', 'web', '58.10.129.101', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-19 14:40:02', '2025-10-19 12:56:06', 1, '2025-09-19 12:56:06', '2025-09-19 14:40:02'),
(286, 7, '5c311a83-40b0-440b-8017-bc91187668c2', 'thi4mSggmF8iZWnaHoi70rowGVnhoAka3g6wwQ0WiqE=', 'Chrome Browser', 'web', '110.168.242.151', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-19 15:34:30', '2025-10-19 15:07:19', 1, '2025-09-19 15:07:19', '2025-09-19 15:34:30'),
(287, 7, '41e60193-441f-4eb4-95a6-c8e45dffcb9e', 'W7SyXUBjzNrDA5kjE64NY8H4b4Kni8lDxG7QiuYy0kM=', 'Chrome Browser', 'web', '58.10.153.17', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-20 07:08:51', '2025-10-20 06:09:14', 1, '2025-09-20 06:09:14', '2025-09-20 07:08:51'),
(288, 7, 'db17d39d-fcdc-49f5-99c9-a35d3224d27a', 'u_M2Kka1UlSn5l5tRiBOuOyl8QlEuaEaBT_oVt92dhw=', 'Chrome Browser', 'web', '58.10.153.17', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-20 08:43:23', '2025-10-20 07:10:37', 1, '2025-09-20 07:10:37', '2025-09-20 08:43:23'),
(289, 7, '72b83922-8355-403f-801c-42fac726dd27', 'MfRFH7rioh-1Wvcyd94LZl8DMrlgaOTFZb65xnYCNi4=', 'Chrome Browser', 'web', '58.10.153.17', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-20 15:08:41', '2025-10-20 13:27:27', 1, '2025-09-20 13:27:27', '2025-09-20 15:08:41');
INSERT INTO `user_sessions` (`session_id`, `user_id`, `access_token_jti`, `refresh_token`, `device_name`, `device_type`, `ip_address`, `user_agent`, `last_activity`, `expires_at`, `is_active`, `created_at`, `updated_at`) VALUES
(290, 7, '2b2e3106-0b0c-40cf-85ba-b434c9d92b33', 'esGwgv1cmB8i-6bp_SR0ECrKJw3EQIE5QrJq-CVy3Fg=', 'Chrome Browser', 'web', '58.10.153.17', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-20 16:33:53', '2025-10-20 16:12:10', 0, '2025-09-20 16:12:10', '2025-09-20 16:33:53'),
(291, 8, 'cfbf0a12-1630-4cb4-b15c-f2ec6aaadbcc', 'LaG6yvsZlWdhJNjcxsu03CU3JpBZlmvbbMakYri42mA=', 'Chrome Browser', 'web', '58.10.153.17', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-20 16:35:50', '2025-10-20 16:34:07', 0, '2025-09-20 16:34:07', '2025-09-20 16:35:50'),
(292, 7, 'f8dba95b-3411-4f79-ba3a-3526c73b59c1', 'ho4kWZ2bWBebf7T3CLksiCUDlrbzOCI5705U1RLp65A=', 'Chrome Browser', 'web', '58.10.153.17', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-20 18:35:53', '2025-10-20 16:35:59', 1, '2025-09-20 16:35:59', '2025-09-20 18:35:53'),
(293, 7, 'b6db6839-dd54-48fa-8ab5-73935c64f76f', '2A8kdO6DQABESy9LNVhklnwUaEWMgEPVOF5Ljfcd2cY=', 'Chrome Browser', 'web', '58.10.129.101', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-20 20:39:24', '2025-10-20 20:14:21', 1, '2025-09-20 20:14:21', '2025-09-20 20:39:24'),
(294, 7, '193b0b56-9bd8-43a7-870f-c0a69e76e19a', 'wAXXTajkWnEAuA1xTTS3XdSneJ1cmjtsowdD1HqdblI=', 'Chrome Browser', 'web', '58.10.153.17', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-21 13:34:17', '2025-10-21 07:20:03', 1, '2025-09-21 07:20:03', '2025-09-21 13:34:17'),
(295, 7, 'b56a6263-d2fc-401a-b22a-54c48c66da53', 'sWzSO_auHT6XwAIRU1GRbVEYAaTeCT0usQwCqhHmODM=', 'Chrome Browser', 'web', '58.10.129.101', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-21 11:12:58', '2025-10-21 11:11:26', 0, '2025-09-21 11:11:26', '2025-09-21 11:12:58'),
(296, 8, '182b79af-a5f4-406f-8e71-6dad354d9e53', 'lBRdsOXjJu91YvtFlBDbMfIiavWohjmY8H9YmN-kFfU=', 'Chrome Browser', 'web', '58.10.129.101', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-21 11:14:31', '2025-10-21 11:13:01', 0, '2025-09-21 11:13:01', '2025-09-21 11:14:31'),
(297, 7, 'f4095eb5-55be-4f51-ac65-a6730785b95d', 'jgj9MYCDsy2bGLD4pcXf2sgOisWZsQoS_FeahN3jOwM=', 'Chrome Browser', 'web', '58.10.129.101', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-21 11:20:17', '2025-10-21 11:14:33', 0, '2025-09-21 11:14:33', '2025-09-21 11:20:17'),
(298, 8, '809ce5a3-5387-4647-8c05-c54ecdb5a856', '-m3erAYF59DrdCBnA9QwPq2XfOL3u1OGAvF1w-9LRAk=', 'Chrome Browser', 'web', '58.10.129.101', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-21 11:21:53', '2025-10-21 11:20:19', 1, '2025-09-21 11:20:19', '2025-09-21 11:21:53'),
(299, 8, '5bfd2161-8e89-44f9-9274-a9a792b805a4', 'gjqQD0d40O1ymz_O6KYLNSje2Z038TilfP8E8SOu6m0=', 'Chrome Browser', 'web', '58.10.129.101', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-21 11:39:15', '2025-10-21 11:28:21', 0, '2025-09-21 11:28:21', '2025-09-21 11:39:15'),
(300, 7, 'bf899081-a07d-48ca-8452-cdadd9c45c23', '3BpJw9ncNCEtQjwRNfMlz-e9lXKCAvp6_qhFIu4qx18=', 'Chrome Browser', 'web', '58.10.129.101', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-21 11:49:33', '2025-10-21 11:39:17', 0, '2025-09-21 11:39:17', '2025-09-21 11:49:33'),
(301, 8, '7cce37a0-6eb9-47ae-a510-ef35a296d8ed', '_xMUFCc9pv7ueJW-EW6iKXpe5yoYvYCRbneZdu9SD_A=', 'Chrome Browser', 'web', '58.10.129.101', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-21 12:34:28', '2025-10-21 11:49:35', 0, '2025-09-21 11:49:35', '2025-09-21 12:34:28'),
(302, 7, 'ef2f9e8f-8937-4f26-8942-d071aa10c6a2', '11zwTI8zwZehWszbQCDiGXf5AkA1zTEUcT4nLYXhAU0=', 'Chrome Browser', 'web', '58.10.129.101', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-21 13:20:40', '2025-10-21 12:34:30', 0, '2025-09-21 12:34:30', '2025-09-21 13:20:40'),
(303, 8, '0ad5be27-f563-4492-96da-b62377e61726', 'PWJRQzLyKgWtHiNZc680fbPBKf-OlhXf4yfbabJpOhA=', 'Chrome Browser', 'web', '58.10.129.101', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-21 13:25:50', '2025-10-21 13:20:44', 1, '2025-09-21 13:20:44', '2025-09-21 13:25:50'),
(304, 8, '0c3684d0-0cfc-4e15-b83c-47c6a53b24e7', 'qv7TsEgz_Dvkk5mZ6ckLECUae82WCdgHPlzgLxyF12s=', 'Chrome Browser', 'web', '58.10.153.17', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-22 12:08:31', '2025-10-22 09:38:22', 0, '2025-09-22 09:38:22', '2025-09-22 12:08:31'),
(305, 13, '39d632c0-7c6a-4185-8fbe-f2641bc9057b', 'qeE_dkhv3gC4oYNVS08duEUjKHaJq9k4UafrfJ4Wy0I=', 'Chrome Browser', 'web', '58.10.72.179', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-22 09:55:12', '2025-10-22 09:55:12', 0, '2025-09-22 09:55:12', '2025-09-22 09:56:17'),
(306, 7, '0284a48d-0279-4807-8ab0-86418bc6694c', 'Bi2fxjVHt1824GkRpy0wY_UezTXppvQ6glWB8q20brw=', 'Chrome Browser', 'web', '58.10.72.179', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-22 10:45:21', '2025-10-22 10:44:09', 0, '2025-09-22 10:44:09', '2025-09-22 10:45:21'),
(307, 8, '814387dd-1d4b-49bf-8163-6582a29619bd', 'P8zN_x5vwdeKtogCA43TVBN9Uzp1j-BoMAkfYPnIGeI=', 'Chrome Browser', 'web', '58.10.72.179', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-22 10:46:25', '2025-10-22 10:45:23', 0, '2025-09-22 10:45:23', '2025-09-22 10:46:25'),
(308, 7, 'e877f1c1-9ddc-4013-975c-a4daaf48c8a4', 'Peei5m4CyKWdsY_3yz5HLDl5wRwgOhIw12bLkpsFZCY=', 'Chrome Browser', 'web', '58.10.72.179', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-22 11:02:21', '2025-10-22 10:46:27', 0, '2025-09-22 10:46:27', '2025-09-22 11:02:21'),
(309, 8, 'e7e16d33-3b7f-4f06-866c-0c1401248288', 'hKOWwNOA0sSHBjvatleFkMP2zwJSLQ4aWkHWJ-HQyoQ=', 'Chrome Browser', 'web', '58.10.72.179', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-22 11:12:28', '2025-10-22 11:02:24', 0, '2025-09-22 11:02:24', '2025-09-22 11:12:28'),
(310, 7, 'f710ca41-d418-4445-b040-3fad9710c1ad', '0nayjNM95WJt5CJZAig5gj1RinqiMHITG-Cu2rJTJho=', 'Chrome Browser', 'web', '58.10.72.179', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-22 11:12:46', '2025-10-22 11:12:30', 1, '2025-09-22 11:12:30', '2025-09-22 11:12:46'),
(311, 8, '38912791-5689-4f2a-ba7b-29d5ccf788c0', 'eBqBB7xCIupBfPdTpok7ecwbPz_QAyffr0iNiCEXGpw=', 'Chrome Browser', 'web', '58.10.72.179', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-22 11:39:04', '2025-10-22 11:39:01', 0, '2025-09-22 11:39:01', '2025-09-22 11:39:04'),
(312, 7, '0a4ff749-e691-432d-a625-3dd6019171f1', 'NBfcyms7wBZAxFlsWW_3hlYI0IDfeNo7XI-0kxEcyrA=', 'Chrome Browser', 'web', '58.10.72.179', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-22 11:52:48', '2025-10-22 11:39:06', 0, '2025-09-22 11:39:06', '2025-09-22 11:52:48'),
(313, 8, '074b47ab-31df-4720-b16a-6a613b827ea4', 'pS6ZDaeKsaLUgOBtaadV2b5xWZJ7UVLoz_QJ7rU1bEk=', 'Chrome Browser', 'web', '58.10.72.179', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-22 12:02:32', '2025-10-22 11:52:50', 0, '2025-09-22 11:52:50', '2025-09-22 12:02:32'),
(314, 7, '865ffd85-d3a1-4ca2-a628-79ee04c5a162', 'xWVILUmpOjlNzz4-hQZRSuGU0VrRZszV1FK_iRo0HT4=', 'Chrome Browser', 'web', '58.10.72.179', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-22 12:02:44', '2025-10-22 12:02:36', 0, '2025-09-22 12:02:36', '2025-09-22 12:02:44'),
(315, 8, '1f716ed0-62c6-4816-a932-19b47655d7e0', 'PLGO_wf3hblrH-i1b3E0WqzgrLUnBph9dweHeTg_N2o=', 'Chrome Browser', 'web', '58.10.153.17', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-22 12:09:45', '2025-10-22 12:08:40', 0, '2025-09-22 12:08:40', '2025-09-22 12:09:45'),
(316, 8, 'e3aa8f43-aa20-4d13-947a-94b57aac3bd4', 'bfuyS9kblW_2AHRfaj-csswMNMfWTvdRMCrcuKH4JRI=', 'Chrome Browser', 'web', '58.10.153.17', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-22 12:11:08', '2025-10-22 12:09:57', 0, '2025-09-22 12:09:57', '2025-09-22 12:11:08'),
(317, 7, '358300ba-9294-4566-95f8-7ca3131d61a9', 'RHT6bkzNJ6d1yTeFJc5xmPJPgwRDDf1IocmlPALt4mA=', 'Chrome Browser', 'web', '58.10.72.179', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-22 12:10:49', '2025-10-22 12:10:47', 0, '2025-09-22 12:10:47', '2025-09-22 12:10:49'),
(318, 8, '763ba068-c1de-4f38-866b-ea217198c15f', 'hTz05W1WkNw0UAlKwVBo0f-shQvKd8DO3jLVaTEg_RA=', 'Chrome Browser', 'web', '58.10.72.179', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-22 13:40:29', '2025-10-22 12:10:51', 0, '2025-09-22 12:10:51', '2025-09-22 13:40:29'),
(319, 7, '678d66ea-4e0c-47cd-9ee4-b7a62d486b36', 'C5ZoWXLF8dmAG_Ix-hwrHGbYuiNLCoH3BUULxfuG1IY=', 'Chrome Browser', 'web', '58.10.153.17', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-22 12:11:46', '2025-10-22 12:11:16', 0, '2025-09-22 12:11:16', '2025-09-22 12:11:46'),
(320, 7, 'a36d5f57-147c-442d-b0ed-32ed7fc8be09', 'FPuVo2E9q21eFSsIcCISsxECiwuru1b8C6Hx-WYniqI=', 'Chrome Browser', 'web', '58.10.153.17', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-22 12:11:58', '2025-10-22 12:11:55', 0, '2025-09-22 12:11:55', '2025-09-22 12:11:58'),
(321, 8, 'a3b4bb61-d3e3-4772-b6e6-b20e1c850e50', '1zjdyfrvTtXOo3AUFLqqK5ZqDNRoElS5RhY5EKu6GQY=', 'Chrome Browser', 'web', '58.10.153.17', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-22 12:14:54', '2025-10-22 12:12:06', 0, '2025-09-22 12:12:06', '2025-09-22 12:14:54'),
(322, 8, 'd8fbff7f-60ee-4c5e-bb96-826097ea6b96', 'IpUURj0K12ZlDnqcWp_ElrbE13yYluyoSIqKWPIIZ7o=', 'Chrome Browser', 'web', '58.10.153.17', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-22 12:15:54', '2025-10-22 12:15:10', 0, '2025-09-22 12:15:10', '2025-09-22 12:15:54'),
(323, 10, '3284fca7-6091-4c65-a9ec-044927d48cf4', 'v0Sh6D4olQ9csp1KtnMFK3a7kk5RB9kUxwmimn-Asmw=', 'Chrome Browser', 'web', '58.10.153.17', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-22 12:16:21', '2025-10-22 12:16:17', 0, '2025-09-22 12:16:17', '2025-09-22 12:16:21'),
(324, 13, '8ae56c0e-faf7-4bb6-9e54-db69d2643930', 'wW9TWIA-ZgdsnJAJ5RwF-CJhhUcYvhbSYH1mAixOtT4=', 'Chrome Browser', 'web', '58.10.153.17', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-22 12:49:12', '2025-10-22 12:16:42', 0, '2025-09-22 12:16:42', '2025-09-22 12:49:12'),
(325, 8, 'cf01932d-afc3-4312-8d1d-84cc4ba6aa39', 'kCcnPfWgf3mJCHoLOAtGm5CygkVykGf8gOB_J1fITik=', 'Chrome Browser', 'web', '58.10.153.17', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-22 12:49:23', '2025-10-22 12:49:18', 0, '2025-09-22 12:49:18', '2025-09-22 12:49:23'),
(326, 10, '23ebf92e-2fe9-4d76-a91b-a9fa3c09b1b8', 'D9R22W4Ek2Nsj6KkPb8s1AsPy76jurMg40Urk_K_kXo=', 'Chrome Browser', 'web', '58.10.153.17', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-22 12:49:48', '2025-10-22 12:49:42', 0, '2025-09-22 12:49:42', '2025-09-22 12:49:48'),
(327, 8, 'f3d4e9cb-0a4d-40e9-8537-ef5813ef1cbb', 'KSniMaroE9HVinQu09d76aFaSmjNvcqtN6NctEzTrRQ=', 'Chrome Browser', 'web', '58.10.153.17', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-22 12:49:58', '2025-10-22 12:49:56', 0, '2025-09-22 12:49:56', '2025-09-22 12:49:58'),
(328, 13, '1b633a3a-b782-490f-9ed7-bca1d3878f89', '4_1-fZV3Kl7TJkwwKriHv5s0QKpJmU-LncX5L_t-Vzs=', 'Chrome Browser', 'web', '58.10.153.17', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-22 13:37:43', '2025-10-22 12:50:18', 0, '2025-09-22 12:50:18', '2025-09-22 13:37:43'),
(329, 7, '4acc0309-0a89-4f8f-b846-1852310e2703', 'Pp6kZp3wlrL7X8Ve_GdR49LgncO08vThJMtIlYGR3gY=', 'Chrome Browser', 'web', '58.10.153.17', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-22 13:38:00', '2025-10-22 13:37:51', 0, '2025-09-22 13:37:51', '2025-09-22 13:38:00'),
(330, 8, '4429ff1d-1dc3-4701-8fbb-ff59b1220ba0', 'VT4qfkM8wLI7x48F-Bn28qb2JMDXqu7zwYy3BVdTUwM=', 'Chrome Browser', 'web', '58.10.153.17', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-22 13:40:59', '2025-10-22 13:38:26', 0, '2025-09-22 13:38:26', '2025-09-22 13:40:59'),
(331, 8, 'f778cc4e-efcc-4e63-b940-bfd232c68752', 'rDwIFxa1wBB60OVf8Jgb2h3DEny6l-3JvJjbMydW4DA=', 'Chrome Browser', 'web', '58.10.72.179', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-22 13:40:35', '2025-10-22 13:40:32', 0, '2025-09-22 13:40:32', '2025-09-22 13:40:35'),
(332, 8, '15c7928d-19e4-4015-b998-4914889386f6', 'dF1kQvHfF6DbTQFT1nJnn4GvWMyXNAea9vrKETgqR3A=', 'Chrome Browser', 'web', '58.10.72.179', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-22 16:13:30', '2025-10-22 13:40:36', 1, '2025-09-22 13:40:36', '2025-09-22 16:13:30'),
(333, 13, '9af791cc-66dc-4679-bf14-2f4527d099ef', 'DHXBZqxrcOpofAqw14ShqjR9UOi_ZUyVCXA6aOnq7oY=', 'Chrome Browser', 'web', '58.10.153.17', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-22 13:46:56', '2025-10-22 13:41:06', 1, '2025-09-22 13:41:06', '2025-09-22 13:46:56'),
(334, 8, 'cf3d963e-729d-4b95-bf80-22dce188b808', '03wFn0LcizTg7HiyfBy6L5t1ajAJDfNFpDCnbbm-Em4=', 'Chrome Browser', 'web', '58.10.72.179', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-22 19:35:30', '2025-10-22 16:50:30', 1, '2025-09-22 16:50:30', '2025-09-22 19:35:30'),
(335, 8, '02f4ba4f-052b-401c-aa03-fe3d0b49b5b5', '2lgt6EiY8ScIjnnt4DZgHotHqmhWIeCzESurlOTXwJM=', 'Chrome Browser', 'web', '58.10.72.179', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-22 21:47:49', '2025-10-22 21:42:30', 1, '2025-09-22 21:42:30', '2025-09-22 21:47:49'),
(336, 7, '33476362-53b2-435a-a485-633ccbaf22af', '1EUKHjcd906Flmi_0FgWKEVlcArl-nKmroUDtRARL74=', 'Chrome Browser', 'web', '58.10.153.17', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-23 10:35:17', '2025-10-23 10:01:14', 0, '2025-09-23 10:01:14', '2025-09-23 10:35:17'),
(337, 8, 'ad036aeb-fc85-4b9f-a6b2-7940bc7fd1bf', 'ub9jBsGbQcWdk0-ZCWkWWSvHFSbrniSCF8BAbTufyI4=', 'Chrome Browser', 'web', '58.10.72.179', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-23 13:51:00', '2025-10-23 10:30:23', 1, '2025-09-23 10:30:23', '2025-09-23 13:51:00'),
(338, 8, '7683d74d-c118-417e-a839-27ad889f5198', 'KIKq0jAykx5l2RCF71F7hljtue-nUHnLQAH_IdPs7QM=', 'Chrome Browser', 'web', '58.10.153.17', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-23 11:26:49', '2025-10-23 10:35:23', 1, '2025-09-23 10:35:23', '2025-09-23 11:26:49'),
(339, 8, 'f95a6d86-4253-4445-a7ee-3f6872f7c63c', '4Zz33OixEJ3b9IGES0MvdwDYz4aMDe5oqnkp4RKaPig=', 'Chrome Browser', 'web', '58.10.153.17', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-23 15:27:16', '2025-10-23 12:42:16', 1, '2025-09-23 12:42:16', '2025-09-23 15:27:16'),
(340, 8, '477cee2c-9bc8-46bb-a267-14ae65b986e8', 'CYZS0XH-Adr3T508PQKq-IhQC1ANEGVL0ZaQdh-7oKk=', 'Chrome Browser', 'web', '58.10.72.179', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-23 16:32:32', '2025-10-23 15:01:24', 1, '2025-09-23 15:01:24', '2025-09-23 16:32:33'),
(341, 13, '3cbf1a85-21a4-421b-b518-2f777fa68ef5', 'b33Rb9N5COPrOogyiDGC75BOkS2yNpUbbHhCr8hEbAQ=', 'Chrome Browser', 'web', '58.11.71.191', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-24 11:37:38', '2025-10-24 09:21:53', 0, '2025-09-24 09:21:53', '2025-09-24 11:37:38'),
(342, 7, '6e03d2e0-2e81-425c-9030-3a14074a28e9', 'aC6e-g89libDbbrq8eFy6gL20zx90UkuDKD25Erv97w=', 'Chrome Browser', 'web', '58.11.71.191', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-24 11:44:14', '2025-10-24 11:37:49', 1, '2025-09-24 11:37:49', '2025-09-24 11:44:14'),
(343, 8, '3826f7bf-40d8-4138-b3d5-4f103ad61b41', '8_yitHn0M2V_SQNiueu-nHiDt0JpGc7pJi5zTN8yqGY=', 'Chrome Browser', 'web', '58.10.72.179', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-24 11:58:56', '2025-10-24 11:56:42', 1, '2025-09-24 11:56:42', '2025-09-24 11:58:56');

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
(23, 8, 'refresh', 'h2_uVFJ_W2GG4726q0cNkZEjMU4BsASAKMP3Ido5G7w=', '2025-09-05 11:40:43', 0, 'Chrome Browser / web', '58.11.71.81', '2025-08-06 11:40:43', '2025-08-06 11:40:43'),
(24, 7, 'refresh', '8amfrnG6pKEDlzI4AOK4IJqyqy1xu4iITV2QK611fHA=', '2025-09-05 22:03:49', 1, 'Chrome Browser / web', '58.11.85.73', '2025-08-06 22:03:49', '2025-08-07 01:15:50'),
(25, 8, 'refresh', 'ZkKXFYm2Ph-st0HezFOH1KSTZcx6nbVfv_y48-L2hM8=', '2025-09-06 01:15:59', 1, 'Chrome Browser / web', '58.11.85.73', '2025-08-07 01:15:59', '2025-09-22 09:59:28'),
(26, 8, 'refresh', 'yXI19rJ0peiTAJR3pObJ30SedqpOHQO41pOZ6hrrgpY=', '2025-09-06 13:33:42', 0, 'Chrome Browser / web', '58.11.85.73', '2025-08-07 13:33:42', '2025-08-07 13:33:42'),
(27, 7, 'refresh', 'NrQYwvk--sVk3NqWHMWDtrEqvpQHsxCsEMaHHdxY5o0=', '2025-09-06 16:49:03', 0, 'Chrome Browser / web', '58.11.85.73', '2025-08-07 16:49:03', '2025-08-07 16:49:03'),
(28, 7, 'refresh', '_pZeHz6qf7AzqYvrNjDue7n9biAUV_Vtl-_GxLp2xRE=', '2025-09-07 02:33:09', 0, 'Chrome Browser / web', '58.11.85.73', '2025-08-08 02:33:09', '2025-08-08 02:33:09'),
(29, 7, 'refresh', 'L_YZpdgZYWhwOSxNMP4AnpL-Rl_ENfZ0kKbZeHEtx1w=', '2025-09-07 14:21:38', 0, 'Chrome Browser / web', '58.11.85.73', '2025-08-08 14:21:38', '2025-08-08 14:21:38'),
(30, 7, 'refresh', 'hnsuVtjVScBDfg6wWB4PCWHXPS70IaJg7HKeCni3_Sk=', '2025-09-07 15:40:31', 0, 'Chrome Browser / web', '58.11.85.73', '2025-08-08 15:40:31', '2025-08-08 15:40:31'),
(31, 7, 'refresh', 'b6A0SuteEP1MdHwP9b5HxM8CVxxJFZ7J5Gg5jjrjR0k=', '2025-09-07 16:06:12', 0, ' / api_client', '110.168.238.46', '2025-08-08 16:06:12', '2025-08-08 16:06:12'),
(32, 7, 'refresh', 'psKmPkYcoYCCXd-fK7N8YfU5aWCQX7WbHg6j4lnNjWQ=', '2025-09-07 19:36:30', 0, 'Chrome Browser / web', '58.11.85.73', '2025-08-08 19:36:30', '2025-08-08 19:36:30'),
(33, 7, 'refresh', '26HwD33jydwP4ur37hPNWxwumGRhEcJR32h2eEk9Zs8=', '2025-09-07 21:51:58', 0, 'Chrome Browser / web', '58.11.85.73', '2025-08-08 21:51:58', '2025-08-08 21:51:58'),
(34, 7, 'refresh', 'gm21KeuRY_yYCchc6g2lqhLRUjGPRDi0gRuctmr0UpI=', '2025-09-09 12:34:52', 0, 'Chrome Browser / web', '58.10.128.241', '2025-08-10 12:34:52', '2025-08-10 12:34:52'),
(35, 7, 'refresh', 'zeOfHeY0_oCp1iHku1MP3ovzT1AdXMm6TQ3nCQ0zjCQ=', '2025-09-09 14:40:27', 0, 'Chrome Browser / web', '58.10.128.241', '2025-08-10 14:40:27', '2025-08-10 14:40:27'),
(36, 7, 'refresh', 'OaWrbI5YN_2ANsFDOFVNo7B6MvRWHanWWIzryWvSWNQ=', '2025-09-09 18:37:16', 0, 'Chrome Browser / web', '58.10.128.241', '2025-08-10 18:37:16', '2025-08-10 18:37:16'),
(37, 7, 'refresh', 'kbV58DjZt7Vv482MW9p7d0LHcuW-kfR8DGw1DA24iLs=', '2025-09-10 11:48:46', 1, 'Chrome Browser / web', '58.10.128.241', '2025-08-11 11:48:46', '2025-08-11 12:10:58'),
(38, 8, 'refresh', 'fwkRgmgs1wu4RCJ1V1j7JlB4PuHCSg6IhYLPoWG2pdc=', '2025-09-10 12:04:26', 0, 'Chrome Browser / web', '110.168.238.46', '2025-08-11 12:04:26', '2025-08-11 12:04:26'),
(39, 8, 'refresh', 'N7yzEXoJiIFLxDN55tbs6hxUGGh4FGOT6hXKAAt5Lfs=', '2025-09-10 12:11:04', 1, 'Chrome Browser / web', '58.10.128.241', '2025-08-11 12:11:04', '2025-08-11 12:14:58'),
(40, 7, 'refresh', 'TRaeEZ4VDx2V6gTLdTKTbd2YKXQFMqyN_tF-_3G5p7s=', '2025-09-10 12:15:03', 0, 'Chrome Browser / web', '58.10.128.241', '2025-08-11 12:15:03', '2025-08-11 12:15:03'),
(41, 7, 'refresh', 'iAjnkwYNartyyJUy1K3ExGqFcFABFexI1ZRlmISb51Q=', '2025-09-10 13:15:19', 0, 'Chrome Browser / web', '58.10.128.241', '2025-08-11 13:15:19', '2025-08-11 13:15:19'),
(42, 8, 'refresh', 'jkFrX8YMasUmiKJ07vtsjc1ASPL9qT0Fs6NYZjc3zLg=', '2025-09-10 13:35:18', 0, 'Chrome Browser / web', '110.168.238.46', '2025-08-11 13:35:18', '2025-08-11 13:35:18'),
(43, 8, 'refresh', 'VctAjiipLu81JtbhK5KH-uu1NnoWfjmUbEZ5FszLTBs=', '2025-09-10 20:11:29', 0, 'Chrome Browser / web', '110.168.238.46', '2025-08-11 20:11:29', '2025-08-11 20:11:29'),
(44, 8, 'refresh', 'IXFyHy46RSfjtGoy171aYO21NSHQQ6y1wMKWJJ54qCc=', '2025-09-11 05:08:41', 1, 'Chrome Browser / web', '58.11.84.239', '2025-08-12 05:08:41', '2025-08-12 05:09:35'),
(45, 7, 'refresh', 'FoOd1dkiuA3mpwzaKQncos7ktpidbmLEGhBx-24baNk=', '2025-09-11 05:09:39', 1, 'Chrome Browser / web', '58.11.84.239', '2025-08-12 05:09:39', '2025-08-12 05:35:26'),
(46, 7, 'refresh', 'bwg9ZafDSKoEZ9QxeIk-N_L-jk4ByrNM87Pwj1Wlb6s=', '2025-09-11 05:14:30', 1, 'Chrome Browser / web', '58.10.128.241', '2025-08-12 05:14:30', '2025-08-12 05:17:46'),
(47, 8, 'refresh', '2IoetuIMkYs-w7X_i5LOl3aS-13uiTRv3Wywwo-FahQ=', '2025-09-11 05:17:57', 0, 'Chrome Browser / web', '58.10.128.241', '2025-08-12 05:17:57', '2025-08-12 05:17:57'),
(48, 8, 'refresh', 'phBNr1qYw2w51aud1Z6tieJ92BZtQ0HrBA5eovKlwBM=', '2025-09-12 11:42:59', 0, 'Chrome Browser / web', '58.11.84.239', '2025-08-13 11:42:59', '2025-08-13 11:42:59'),
(49, 8, 'refresh', 'hsoMuTwW7o2ZBVsqx1OCapUBlv5xbWDry6BxNG_8gg0=', '2025-09-14 11:37:05', 0, 'Chrome Browser / web', '58.11.84.239', '2025-08-15 11:37:05', '2025-08-15 11:37:05'),
(50, 8, 'refresh', 'Gy-6dbq7KGtG-A8JVQMaASP52Dq28Te_66nnGMT4xt0=', '2025-09-14 17:44:19', 0, 'Chrome Browser / web', '58.11.84.239', '2025-08-15 17:44:19', '2025-08-15 17:44:19'),
(51, 8, 'refresh', 'h7PLs6dU27wd7R-mMClhhLJokiCSlOB8KFsXidb8eeo=', '2025-09-14 22:02:31', 0, 'Chrome Browser / web', '58.11.84.239', '2025-08-15 22:02:31', '2025-08-15 22:02:31'),
(52, 8, 'refresh', 'p7YYvscatu-GtkTDd2eOYgkyUyqY5klGCYx4Lf1oV_M=', '2025-09-15 11:22:23', 0, 'Chrome Browser / web', '58.11.84.239', '2025-08-16 11:22:23', '2025-08-16 11:22:23'),
(53, 8, 'refresh', 'iud6o_YnknREU2ZudtWtuwCv1rvNsRIYy3M0mesrh-U=', '2025-09-15 17:18:20', 0, 'Chrome Browser / web', '58.11.84.239', '2025-08-16 17:18:20', '2025-08-16 17:18:20'),
(54, 8, 'refresh', 'Od8MoBHOugpZzJcD9wT-v4TSaQsSbh8FEyZmQBea2TQ=', '2025-09-15 22:40:32', 0, 'Chrome Browser / web', '58.11.84.239', '2025-08-16 22:40:32', '2025-08-16 22:40:32'),
(55, 8, 'refresh', 'gfrLMUYBAKQqaIdFVDA6bnasF1bgrExuJHbNoWeOvGM=', '2025-09-16 08:56:04', 1, 'Chrome Browser / web', '58.11.84.239', '2025-08-17 08:56:04', '2025-08-17 09:00:57'),
(56, 7, 'refresh', '-uAin-AvWvdaZwBfLWHwD4_jFPwCpsbFpsiWpUuA5gg=', '2025-09-16 09:00:41', 0, 'Chrome Browser / web', '58.11.84.239', '2025-08-17 09:00:41', '2025-08-17 09:00:41'),
(57, 8, 'refresh', 'fZhVhKszDMkdl6Usyrw--x1ZHRAccYH4I81UyTxR_0g=', '2025-09-16 09:01:00', 0, 'Chrome Browser / web', '58.11.84.239', '2025-08-17 09:01:00', '2025-08-17 09:01:00'),
(58, 8, 'refresh', '8S8qQ126HW4pnZAE1PeAg-MyQKyqUlA_gAlWWP7N260=', '2025-09-16 19:19:04', 0, 'Chrome Browser / web', '58.11.84.239', '2025-08-17 19:19:04', '2025-08-17 19:19:04'),
(59, 8, 'refresh', 'dTUjHjPRWgTBuy4OqKzlDblDQYd8JlAZcH-q6LAtydc=', '2025-09-17 10:57:49', 0, 'Chrome Browser / web', '58.11.84.239', '2025-08-18 10:57:49', '2025-08-18 10:57:49'),
(60, 8, 'refresh', '2Ic2IZTbUCkIqWltTJ1EyIpsxrC4E8qqmrRNE-6UA2M=', '2025-09-17 11:27:11', 0, 'Chrome Browser / web', '58.11.84.239', '2025-08-18 11:27:11', '2025-08-18 11:27:11'),
(61, 8, 'refresh', 'byIbHv1zmuhDU0U81JxT0Can0kbqizmU8QJ2Wyjtdmc=', '2025-09-17 11:29:03', 0, 'Chrome Browser / web', '58.11.83.106', '2025-08-18 11:29:03', '2025-08-18 11:29:03'),
(62, 7, 'refresh', 'nqnDsdZMJ7ZFK4k2OESwtcoWyO5EhYLZr8dIw6lEg0c=', '2025-09-17 17:43:57', 0, 'Chrome Browser / web', '58.11.83.106', '2025-08-18 17:43:57', '2025-08-18 17:43:57'),
(63, 7, 'refresh', 'o4V4iixAUCe0rEssC12tVjkOpNoiIDxfwDNfwaMMtpk=', '2025-09-18 09:30:36', 1, 'Chrome Browser / web', '58.10.73.81', '2025-08-19 09:30:36', '2025-08-19 09:55:34'),
(64, 8, 'refresh', 'a6ukk8xJmp01v6JZKwlGSnp8GUxU-FssgXuEd5gyYm4=', '2025-09-18 09:51:20', 0, 'Chrome Browser / web', '58.10.73.81', '2025-08-19 09:51:20', '2025-08-19 09:51:20'),
(65, 8, 'refresh', 'YGoHFeH4JejOzsONRGI58j5lMLZjHAm2sif-6OAU53I=', '2025-09-18 09:55:41', 0, 'Chrome Browser / web', '58.10.73.81', '2025-08-19 09:55:41', '2025-08-19 09:55:41'),
(66, 8, 'refresh', 'h9ksWLBEnZyvmvVJh1yLPsvDqI8qR7ZFux4_0ISWvlM=', '2025-09-18 11:05:04', 0, 'Chrome Browser / web', '58.10.140.241', '2025-08-19 11:05:04', '2025-08-19 11:05:04'),
(67, 8, 'refresh', 'BU-NKZes65X9MYUXOLxTYNnWstt-B4yyTmztb_lPdGY=', '2025-09-18 15:38:50', 0, 'Chrome Browser / web', '58.10.140.241', '2025-08-19 15:38:50', '2025-08-19 15:38:50'),
(68, 8, 'refresh', 'fN8nsKW_54FeoM7ghqVhmAO9FLngqPdzzyOScTVJZSU=', '2025-09-18 17:47:44', 0, 'Chrome Browser / web', '58.10.140.241', '2025-08-19 17:47:44', '2025-08-19 17:47:44'),
(69, 8, 'refresh', '8d10y94bqHEeVWAEscyfGc6kIR5aXEHziwL8UiJDpVg=', '2025-09-19 13:28:07', 0, 'Chrome Browser / web', '58.10.140.241', '2025-08-20 13:28:07', '2025-08-20 13:28:07'),
(70, 8, 'refresh', 'fHp_ODwVbl1puidJ_v0VDB-tJrVl6KaksA3TISMDd_o=', '2025-09-19 14:15:40', 1, 'Chrome Browser / web', '58.11.79.179', '2025-08-20 14:15:40', '2025-08-21 05:56:31'),
(71, 8, 'refresh', 'd4Yb2tGiqcnC3zXFPmncroSF_fZ9LPv-lLL4-ko2zY4=', '2025-09-19 16:25:09', 0, 'Chrome Browser / web', '58.10.140.241', '2025-08-20 16:25:09', '2025-08-20 16:25:09'),
(72, 7, 'refresh', 'sYtEOv2COuoDn6tdgvAqaTtX1-nSfdDfQ33cNj5vh9A=', '2025-09-20 05:56:38', 0, 'Chrome Browser / web', '58.11.79.179', '2025-08-21 05:56:38', '2025-08-21 05:56:38'),
(73, 7, 'refresh', '4_Ek8UW6Ihk48NSHxfRlWJFLyiySlhAY2U0m32DcKFg=', '2025-09-20 14:50:16', 0, 'Chrome Browser / web', '58.10.71.142', '2025-08-21 14:50:16', '2025-08-21 14:50:16'),
(74, 8, 'refresh', 'XG3M7Fj4OLIXtEUIPdvBjqbQr89169Q1Jp2heETdIJ4=', '2025-09-21 03:18:03', 1, 'Chrome Browser / web', '58.10.71.142', '2025-08-22 03:18:03', '2025-08-22 03:27:17'),
(75, 7, 'refresh', 'E_geKerdRbB64ATv30Eag_ggWH2dcao4M6lMFyvdhQw=', '2025-09-21 03:27:27', 1, 'Chrome Browser / web', '58.10.71.142', '2025-08-22 03:27:27', '2025-08-22 04:07:07'),
(76, 8, 'refresh', 'HqeNHEtTCvutm1rftYO74evxkhx0PGcqmxeIHO5OF1k=', '2025-09-21 04:07:13', 1, 'Chrome Browser / web', '58.10.71.142', '2025-08-22 04:07:13', '2025-08-22 10:28:37'),
(77, 8, 'refresh', 'LR_aUatosWPXIsflxe6YuTBdXj1Keah2DXQDE1BIzQc=', '2025-09-21 09:31:16', 1, 'Chrome Browser / web', '58.10.155.36', '2025-08-22 09:31:16', '2025-08-22 11:05:38'),
(78, 7, 'refresh', 'dT9QFYhyL-L9aKBHqZ6XK4ZgJFyxacHLY-ZsV5753MU=', '2025-09-21 10:28:45', 1, 'Chrome Browser / web', '27.145.211.127', '2025-08-22 10:28:45', '2025-08-22 10:29:02'),
(79, 8, 'refresh', 'WcLaSyCy1ecuLK0hdZdmZh2kbSSmU5V830Pc-k_2Tzc=', '2025-09-21 10:29:12', 0, 'Chrome Browser / web', '27.145.211.127', '2025-08-22 10:29:12', '2025-08-22 10:29:12'),
(80, 8, 'refresh', '0Aeu-wqFq8zOAFN6ZakwvLoI30X3SRTNkYuPmjQjcmc=', '2025-09-21 11:06:16', 1, 'Chrome Browser / web', '58.10.155.36', '2025-08-22 11:06:16', '2025-08-22 11:09:02'),
(81, 7, 'refresh', '-mJvRL5XXqcx_WUBXWKXX2Fbtu8Eww3-jcjGeYbP4Mk=', '2025-09-21 11:09:17', 1, 'Chrome Browser / web', '58.10.155.36', '2025-08-22 11:09:17', '2025-08-22 12:17:02'),
(82, 8, 'refresh', '66APBp0GokYRrZ8hkfIsE4LtT-jhx1b89HEBucYKSpw=', '2025-09-21 11:20:18', 0, 'Chrome Browser / web', '58.10.155.36', '2025-08-22 11:20:18', '2025-08-22 11:20:18'),
(83, 8, 'refresh', 'rrBY5pqtfMOFtSJGHCykffh0dX46U2_S_U_V00ofq3Q=', '2025-09-21 11:47:35', 0, 'Chrome Browser / web', '58.10.155.36', '2025-08-22 11:47:35', '2025-08-22 11:47:35'),
(84, 8, 'refresh', 'xNxLws0kgG7T-slD4d1fseGlgsW1vrOYRiFoT3gWk2I=', '2025-09-21 12:17:05', 0, 'Chrome Browser / web', '58.10.155.36', '2025-08-22 12:17:05', '2025-08-22 12:17:05'),
(85, 8, 'refresh', 'uJ_EgTBO1Q3gQKDwC2p4zYf-AkMErbhxnUJ5ICK5A98=', '2025-09-21 13:05:10', 1, 'Chrome Browser / web', '58.10.155.36', '2025-08-22 13:05:10', '2025-08-22 13:05:20'),
(86, 7, 'refresh', 'UVL5pIjTze90_fgO4SLD3OmuIT1hdM3Zf7HlOOy8b8Q=', '2025-09-21 13:05:23', 0, 'Chrome Browser / web', '58.10.155.36', '2025-08-22 13:05:23', '2025-08-22 13:05:23'),
(87, 8, 'refresh', 'XkpusDTD5o2Obeencyn70Ib34pEIDj53RTolijWZItw=', '2025-09-21 13:17:27', 0, 'Chrome Browser / web', '58.10.155.36', '2025-08-22 13:17:27', '2025-08-22 13:17:27'),
(88, 8, 'refresh', 'FHjPT1446XEQDS6pBXTHbEdSfZ4iJcD7H0MQnG-yuwk=', '2025-09-21 13:25:47', 0, 'Chrome Browser / web', '58.10.155.36', '2025-08-22 13:25:47', '2025-08-22 13:25:47'),
(89, 7, 'refresh', 'aFyhanlOuCbRMIF4ZkLNuW-ddY0cL_NMrQP5kC0AOWA=', '2025-09-21 13:27:03', 0, 'Chrome Browser / web', '58.10.155.36', '2025-08-22 13:27:03', '2025-08-22 13:27:03'),
(90, 8, 'refresh', '9bgN593g-ZNPFLcmRh-czV5VeEVr4aK94uV5HiLE_WE=', '2025-09-21 14:34:30', 0, 'Chrome Browser / web', '58.10.155.36', '2025-08-22 14:34:30', '2025-08-22 14:34:30'),
(91, 8, 'refresh', 'FpFNDIDgM_k65aEgFlAAkGB8ZiRvtTfJFmhK4Ar8ywQ=', '2025-09-21 15:31:15', 0, 'Chrome Browser / web', '58.10.155.36', '2025-08-22 15:31:15', '2025-08-22 15:31:15'),
(92, 8, 'refresh', 'C3oPsD_qT2Q187NPxFYPDZJElc8dP-1CJJRGz07osBI=', '2025-09-21 15:58:26', 0, 'Chrome Browser / web', '58.10.155.36', '2025-08-22 15:58:26', '2025-08-22 15:58:26'),
(93, 8, 'refresh', 'sMPg7MWAFCw4Q823S7aFmj_SrxRtcJelLJ0XCJc-JJo=', '2025-09-21 18:41:48', 0, 'Chrome Browser / web', '27.145.211.127', '2025-08-22 18:41:48', '2025-08-22 18:41:48'),
(94, 7, 'refresh', 'TqrEznLz2oAkOmqTB5U_PkL6I4xtJtxqZPEcQmsiRTw=', '2025-09-21 19:02:25', 0, ' / api_client', '58.10.155.36', '2025-08-22 19:02:25', '2025-08-22 19:02:25'),
(95, 8, 'refresh', 'VlZSRTAwBBcMY7SNdXOz984v9wgi7JXS6DUUiBxcMK0=', '2025-09-21 19:02:47', 0, ' / api_client', '58.10.155.36', '2025-08-22 19:02:47', '2025-08-22 19:02:47'),
(96, 8, 'refresh', 'ZSX5cbHwrJfLPE35ffalDyusEYG58NGf2SM5Gz6t_q8=', '2025-09-21 22:57:56', 0, 'Chrome Browser / web', '27.145.211.127', '2025-08-22 22:57:56', '2025-08-22 22:57:56'),
(97, 7, 'refresh', 'iOPDusVzQkASkmRVmHn3FbFqu_Azc95PCYgbRDbb4G8=', '2025-09-22 04:58:44', 0, 'Chrome Browser / web', '27.145.211.127', '2025-08-23 04:58:44', '2025-08-23 04:58:44'),
(98, 7, 'refresh', 'zQ-hmQBc0_f386Au_V8SPvNjBThy7A0ByqryiUCipxI=', '2025-09-22 07:26:49', 1, 'Chrome Browser / web', '27.145.211.127', '2025-08-23 07:26:49', '2025-08-23 07:26:58'),
(99, 8, 'refresh', '5au8V4OH8SRnAWT7cByqmrNzP1TXdZo3naiGQfPQVR8=', '2025-09-22 07:27:11', 1, 'Chrome Browser / web', '27.145.211.127', '2025-08-23 07:27:11', '2025-08-23 07:28:43'),
(100, 7, 'refresh', 'WIKJVQLIEE5lTprk9onoWOrfhOHiendslI4AO1aR5T8=', '2025-09-22 07:28:49', 1, 'Chrome Browser / web', '27.145.211.127', '2025-08-23 07:28:49', '2025-08-23 09:03:07'),
(101, 8, 'refresh', 'LARTpQPggSvLyLO63aPULXfy1nu9SjA_tMgHi0bzsdg=', '2025-09-22 08:21:13', 1, 'Chrome Browser / web', '58.10.155.36', '2025-08-23 08:21:13', '2025-08-23 09:12:07'),
(102, 7, 'refresh', '4PZdZQOPy_4tDCA6gh2YfYM_VqXuJs-mp31A4gk4rGw=', '2025-09-22 09:03:22', 1, 'Chrome Browser / web', '27.145.211.127', '2025-08-23 09:03:22', '2025-08-23 09:07:37'),
(103, 7, 'refresh', 'utDCbBJwLnPLlqYgHan1welntpvzkqozbHFBErQRhfQ=', '2025-09-22 09:03:37', 1, 'Chrome Browser / web', '58.10.155.36', '2025-08-23 09:03:37', '2025-08-23 09:11:01'),
(104, 7, 'refresh', 'a1fxhAFIJ_ztw67g8Q4womW5AHFV6pxcMXDXUDOFDeo=', '2025-09-22 09:07:44', 0, 'Chrome Browser / web', '27.145.211.127', '2025-08-23 09:07:44', '2025-08-23 09:07:44'),
(105, 8, 'refresh', 'AFQJeaenmNbz2DbYtpEe_zcnGIZo21zoJGbz63CbMTc=', '2025-09-22 09:11:12', 1, 'Chrome Browser / web', '58.10.155.36', '2025-08-23 09:11:12', '2025-08-23 10:21:06'),
(106, 7, 'refresh', 'JjUFYtBYGfSYTY5II7vHUznwSm1feamoonLkDekf65c=', '2025-09-22 09:12:10', 1, 'Chrome Browser / web', '58.10.155.36', '2025-08-23 09:12:10', '2025-08-23 11:04:39'),
(107, 7, 'refresh', '-G9pid_z8ZEtLW30FKhpdW2ru1IGp-_L_gXchk2zkno=', '2025-09-22 10:20:23', 0, 'Chrome Browser / web', '27.145.211.127', '2025-08-23 10:20:23', '2025-08-23 10:20:23'),
(108, 8, 'refresh', 'MFKgUR2MvXXt6vpkWo7De02HClNBnQwzaJtWTksjLjI=', '2025-09-22 10:22:44', 1, 'Chrome Browser / web', '58.10.155.36', '2025-08-23 10:22:44', '2025-08-23 10:25:31'),
(109, 7, 'refresh', 'n0FMnXHWB9mDpqPVS_rMxm_CgTCjptc9jy04YmsZNY4=', '2025-09-22 10:25:33', 1, 'Chrome Browser / web', '58.10.155.36', '2025-08-23 10:25:33', '2025-08-23 11:03:40'),
(110, 8, 'refresh', 'jvRtFXk7d6AAuwW9xqBR8TM7INEmnpKoHJjzaAUrD4w=', '2025-09-22 11:04:41', 1, 'Chrome Browser / web', '58.10.155.36', '2025-08-23 11:04:41', '2025-08-23 11:10:19'),
(111, 7, 'refresh', 'Lbc_8wSXjHSlZQc_F4ifBqpYtQ676HblpBYn5yGimGo=', '2025-09-22 11:05:57', 0, 'Chrome Browser / web', '58.10.155.36', '2025-08-23 11:05:57', '2025-08-23 11:05:57'),
(112, 7, 'refresh', '1sT50x0OUVOwZBH6e2N3Td4EjXDXjlTEyckkctP3g18=', '2025-09-22 11:10:22', 1, 'Chrome Browser / web', '58.10.155.36', '2025-08-23 11:10:22', '2025-08-23 11:10:38'),
(113, 8, 'refresh', 'V6Ix5RsnPo3LMKGeaPT7gh7Dj4T0qaVdPEfZseUxoAw=', '2025-09-22 11:10:42', 0, 'Chrome Browser / web', '58.10.155.36', '2025-08-23 11:10:42', '2025-08-23 11:10:42'),
(114, 8, 'refresh', 'eYHHm2B6wMNSHi-Usx-QtdyO9SrFNt2UxUphwbVcDZ4=', '2025-09-22 11:19:55', 0, 'Chrome Browser / web', '58.10.155.36', '2025-08-23 11:19:55', '2025-08-23 11:19:55'),
(115, 8, 'refresh', 'prMfAARqXPU-Y4rrIS-83hFMP1OVYB9gNN62m94EKmk=', '2025-09-22 16:13:30', 0, 'Chrome Browser / web', '58.10.155.36', '2025-08-23 16:13:30', '2025-08-23 16:13:30'),
(116, 8, 'refresh', 'qk4a5-2PZyaUd1FFaWFwFUE9ceohmQZF7DHLW_RL1mo=', '2025-09-22 20:32:51', 0, 'Chrome Browser / web', '58.10.155.36', '2025-08-23 20:32:51', '2025-08-23 20:32:51'),
(117, 7, 'refresh', 'FSGqHAUpxMqpXN6J1PW4v5PJbP2Gf7QhTwNLe1XEUYo=', '2025-09-22 22:40:22', 0, 'Chrome Browser / web', '27.145.211.127', '2025-08-23 22:40:22', '2025-08-23 22:40:22'),
(118, 7, 'refresh', 'n8yjGO3YvHSZv5oOWJp5328yXZVNEpNASS5dR8_CfZc=', '2025-09-23 05:19:47', 0, 'Chrome Browser / web', '27.145.211.127', '2025-08-24 05:19:47', '2025-08-24 05:19:47'),
(119, 8, 'refresh', 'diTzhLERttUEENmPjEvIqrML-LVr-7zZkZUKQuBcoC8=', '2025-09-23 12:44:22', 0, 'Chrome Browser / web', '58.10.155.36', '2025-08-24 12:44:22', '2025-08-24 12:44:22'),
(120, 7, 'refresh', 'UtfU4vTqM45d9Xv0-fw5pVw2UaxsDZaWX5ZHmU3O82o=', '2025-09-23 16:00:20', 0, 'Chrome Browser / web', '58.10.149.116', '2025-08-24 16:00:20', '2025-08-24 16:00:20'),
(121, 7, 'refresh', 'JcSZv-pD04inrvfB9Lcl7JF4wvkdUEM5uXg7sIH8p3U=', '2025-09-23 17:24:11', 0, 'Chrome Browser / web', '58.10.149.116', '2025-08-24 17:24:11', '2025-08-24 17:24:11'),
(122, 8, 'refresh', 'CrnfXhbRikjO-Rl6X5cPtvm51diqegjHqOtRaRDPfc4=', '2025-09-23 18:14:32', 1, 'Chrome Browser / web', '58.10.155.36', '2025-08-24 18:14:32', '2025-08-24 18:27:14'),
(123, 7, 'refresh', 'x_jVIkwNqO5MPOA7YAGo5RN_B9IcAno1c8a-Cim7ZTg=', '2025-09-23 18:27:45', 0, 'Chrome Browser / web', '58.10.155.36', '2025-08-24 18:27:45', '2025-08-24 18:27:45'),
(124, 8, 'refresh', 'm7cxUSDxup5zORwyiwCWBwTDvPjpLrTQNhEJcX6mmkA=', '2025-09-24 01:42:40', 0, 'Chrome Browser / web', '58.10.155.36', '2025-08-25 01:42:40', '2025-08-25 01:42:40'),
(125, 8, 'refresh', '97tP1aM9RfJM3j2JkY20_uAJVpUOTyPBaL1zUjfJyA0=', '2025-09-24 03:07:26', 0, 'Chrome Browser / web', '58.10.149.116', '2025-08-25 03:07:26', '2025-08-25 03:07:26'),
(126, 8, 'refresh', 'mkotUTMqIiA_mD9h-OzUSKorWx8bBfTWNTDa64n4Lns=', '2025-09-24 11:04:45', 0, 'Chrome Browser / web', '58.10.155.36', '2025-08-25 11:04:45', '2025-08-25 11:04:45'),
(127, 8, 'refresh', 'sTvJCdVQlrg-LHbJua5UhdZbu6Zo1zFoAA0sGhOczKA=', '2025-09-24 14:17:24', 0, 'Chrome Browser / web', '58.10.149.116', '2025-08-25 14:17:24', '2025-08-25 14:17:24'),
(128, 7, 'refresh', 'iJIjVjvu9B_2K9kMWEEMDdIERCCbkocSv0Ni5xII5Gw=', '2025-09-24 15:24:23', 0, ' / api_client', '58.10.155.36', '2025-08-25 15:24:23', '2025-08-25 15:24:23'),
(129, 8, 'refresh', 'T-OBbuhymAZbSN5AwJ5Eqk4w4lYI0_aFSuwJn0TLlAM=', '2025-09-25 10:45:12', 1, 'Chrome Browser / web', '58.10.149.116', '2025-08-26 10:45:12', '2025-08-26 10:45:33'),
(130, 7, 'refresh', 'na4h1sGtMVUOzdgP1lMsgqQVU0PTEHYhoyi48aKfwl0=', '2025-09-25 10:45:40', 1, 'Chrome Browser / web', '58.10.149.116', '2025-08-26 10:45:40', '2025-08-26 10:54:32'),
(131, 8, 'refresh', 'auxM-raUAMxZ1NE56mdOH9DQ8ghn5uaHA8skzTB1ojo=', '2025-09-25 10:55:10', 0, 'Chrome Browser / web', '58.10.149.116', '2025-08-26 10:55:10', '2025-08-26 10:55:10'),
(132, 8, 'refresh', 'oSaaCQRgFKLK2pvXiE2OV_lCiGTwxAKnDL9Hn9QKzvU=', '2025-09-25 11:08:35', 0, 'Chrome Browser / web', '58.10.155.36', '2025-08-26 11:08:35', '2025-08-26 11:08:35'),
(133, 8, 'refresh', 'qO7s3HZH8T-EHPDPFof09M6BD7pkc_Y_SnaCwci34Fc=', '2025-09-25 12:14:56', 0, 'Chrome Browser / web', '58.10.149.116', '2025-08-26 12:14:56', '2025-08-26 12:14:56'),
(134, 8, 'refresh', '2Dp7-bLnGVBrdCSmm-M6nj_2mtTnbr3me_-Kl0ORUKU=', '2025-09-25 12:50:16', 0, 'Chrome Browser / web', '58.10.155.36', '2025-08-26 12:50:16', '2025-08-26 12:50:16'),
(135, 8, 'refresh', 'nNC5LzIuFw7M2ek9itnlO4064t5HVnSA-1lPgPzNYhw=', '2025-09-25 13:34:12', 1, 'Chrome Browser / web', '58.10.149.116', '2025-08-26 13:34:12', '2025-08-26 13:38:26'),
(136, 7, 'refresh', 'yQiVu2QX6B0QEtyoENXfjG-9zCqUqaJGHMBZUYg2P40=', '2025-09-25 13:38:33', 1, 'Chrome Browser / web', '58.10.149.116', '2025-08-26 13:38:33', '2025-08-26 13:44:51'),
(137, 8, 'refresh', 'VWMpIaVx08uwFOAwBTY7gtwMjcYU_O9A_fatpqueCUE=', '2025-09-25 13:44:56', 1, 'Chrome Browser / web', '58.10.149.116', '2025-08-26 13:44:56', '2025-08-26 14:15:01'),
(138, 7, 'refresh', 'xpkSjCc3yH3O7MAgu3YxWG2-NiQ1C6vMtXuJ9DDUvOM=', '2025-09-25 14:15:08', 1, 'Chrome Browser / web', '58.10.149.116', '2025-08-26 14:15:08', '2025-08-26 23:37:39'),
(139, 8, 'refresh', 'y_Vx6pDD38H1QwC0SutWTxWZgojYdY5rij2zzdxkvxU=', '2025-09-25 23:38:12', 0, 'Chrome Browser / web', '58.10.149.116', '2025-08-26 23:38:12', '2025-08-26 23:38:12'),
(140, 8, 'refresh', 'YzOeRLL7rJE1f_dh0u6iOI_DJUpTjvqgcrGzS9ig-r8=', '2025-09-26 04:25:52', 0, 'Chrome Browser / web', '58.10.149.116', '2025-08-27 04:25:52', '2025-08-27 04:25:52'),
(141, 8, 'refresh', 'VKyjsXLp7uxzdhYcEgiH6CmtgXWiru3NrfLpbs-ErSc=', '2025-09-26 09:45:36', 0, 'Chrome Browser / web', '58.10.155.36', '2025-08-27 09:45:36', '2025-08-27 09:45:36'),
(142, 8, 'refresh', '38o3rdC-XC-xQxusk6MJ9wLmTrZFuk_1FaidtUy7rjk=', '2025-09-26 11:45:24', 1, 'Chrome Browser / web', '58.10.155.36', '2025-08-27 11:45:24', '2025-08-27 12:10:36'),
(143, 8, 'refresh', '1kS9Gr7Jv7LYNRfS9x6iEwgShbY_jgZrUm7eaHvcrrE=', '2025-09-26 12:03:53', 0, 'Chrome Browser / web', '58.10.119.240', '2025-08-27 12:03:53', '2025-08-27 12:03:53'),
(144, 8, 'refresh', 'a0JAyD3_NnDbg4c34FEXXrWV9yUWYDaefAP2aJxZlE8=', '2025-09-26 12:10:42', 0, 'Chrome Browser / web', '58.10.155.36', '2025-08-27 12:10:42', '2025-08-27 12:10:42'),
(145, 8, 'refresh', 'igJO0BVXwBOh9GXpE0SL-TuGha0A93rlCIUMo4lBq5E=', '2025-09-26 14:09:21', 0, 'Chrome Browser / web', '58.10.119.240', '2025-08-27 14:09:21', '2025-08-27 14:09:21'),
(146, 8, 'refresh', 'vJQj97Ay2ltoO1H7Evcz4XSVAypOFbfDnZy6GbzZlzM=', '2025-09-26 14:11:11', 1, 'Chrome Browser / web', '58.10.155.36', '2025-08-27 14:11:11', '2025-08-27 14:16:17'),
(147, 8, 'refresh', 'mjKl_T3uxmTJQdeY5UdQXRvCu_-GT4WNpAcY6wf-H1o=', '2025-09-26 14:16:19', 1, 'Chrome Browser / web', '58.10.155.36', '2025-08-27 14:16:19', '2025-08-27 14:16:22'),
(148, 7, 'refresh', 'u5u8e0VAbjq9V0pgdQuRWq4NaoCdiNRWEk8gIMaz394=', '2025-09-26 14:16:24', 1, 'Chrome Browser / web', '58.10.155.36', '2025-08-27 14:16:24', '2025-08-27 14:17:46'),
(149, 7, 'refresh', '8KFiGtbSEaHLr_VmRuBzxPUidHKwwsy7V0lTm9vSwqQ=', '2025-09-26 14:17:47', 1, 'Chrome Browser / web', '58.10.155.36', '2025-08-27 14:17:47', '2025-08-27 14:18:01'),
(150, 8, 'refresh', 'SZEZR2o8ctKfyVe6EAGvL0G4yH2CIVDDNpgco-tN4JM=', '2025-09-26 14:18:04', 1, 'Chrome Browser / web', '58.10.155.36', '2025-08-27 14:18:04', '2025-08-27 14:57:57'),
(151, 7, 'refresh', 'Om9qdMyxTesH9kpmH6V0KCclHQdwonokSLfqZ0gN61Y=', '2025-09-26 14:58:00', 0, 'Chrome Browser / web', '58.10.155.36', '2025-08-27 14:58:00', '2025-08-27 14:58:00'),
(152, 8, 'refresh', 'kKtdIVEahQGb2hzic2bsRHYiej4PY1LpvP1Z7SdbFY0=', '2025-09-26 18:31:09', 0, 'Chrome Browser / web', '58.10.119.240', '2025-08-27 18:31:09', '2025-08-27 18:31:09'),
(153, 8, 'refresh', '6B84pYiN2YcF7uKBrJufXIn2OLvpsHNjgwE9tqQJVUE=', '2025-09-26 23:19:32', 1, 'Chrome Browser / web', '58.10.119.240', '2025-08-27 23:19:32', '2025-08-27 23:26:49'),
(154, 10, 'refresh', 'lAKAzCNflXmRuRVAXGcx7Jq0u6nnQVJlFC7G2viecmM=', '2025-09-26 23:26:54', 0, 'Chrome Browser / web', '58.10.119.240', '2025-08-27 23:26:54', '2025-08-27 23:26:54'),
(155, 8, 'refresh', 'lO3tvQscufE8eOMRlRggAvJSxlgo1p4U9-WevfOi700=', '2025-09-27 02:28:40', 1, 'Chrome Browser / web', '58.10.119.240', '2025-08-28 02:28:40', '2025-08-28 04:08:37'),
(156, 7, 'refresh', 'xPV6XMBFhrMLyuA7pExsgQjWxtUQ1XuqWN6KnJ8k2Zw=', '2025-09-27 04:08:43', 0, 'Chrome Browser / web', '58.10.119.240', '2025-08-28 04:08:43', '2025-08-28 04:08:43'),
(157, 8, 'refresh', 'AMo1ltwoSWAd1ijZjng85JiBv02mB_sMKqofAMDY-DQ=', '2025-09-27 10:13:43', 0, 'Chrome Browser / web', '58.11.0.200', '2025-08-28 10:13:43', '2025-08-28 10:13:43'),
(158, 8, 'refresh', 'RsLMPxLRP63rfldgoEhNV4bwupjzaPU6_d5I3NAJUxU=', '2025-09-27 10:17:12', 0, 'Chrome Browser / web', '58.11.0.200', '2025-08-28 10:17:12', '2025-08-28 10:17:12'),
(159, 8, 'refresh', '4vihW9FeMtgVUJosXftHSQQAulcCGdEiegPqfjOAvb4=', '2025-09-27 11:19:14', 0, 'Chrome Browser / web', '58.11.0.200', '2025-08-28 11:19:14', '2025-08-28 11:19:14'),
(160, 7, 'refresh', 'T0QCThfw8iVkFTfmbDZEW_IIG-4u79jVNbVtFQqAkZ8=', '2025-09-27 12:33:49', 1, 'Chrome Browser / web', '58.10.119.240', '2025-08-28 12:33:49', '2025-08-28 12:55:44'),
(161, 8, 'refresh', 'Z_3-GOrTLpZzYpzi2vAyPnt00j0wP2QYasg6g8TczcU=', '2025-09-27 12:45:46', 0, 'Chrome Browser / web', '58.11.0.200', '2025-08-28 12:45:46', '2025-08-28 12:45:46'),
(162, 8, 'refresh', 'NFk8lfqAapWnQX90XLBzV-dfUONQWJazV1iDQL7AvAk=', '2025-09-27 12:55:52', 1, 'Chrome Browser / web', '58.10.119.240', '2025-08-28 12:55:52', '2025-08-28 14:22:48'),
(163, 7, 'refresh', 'Qs-LyPIngpfVO4OYOwl-_v97XPggBJ4CJpTfVH1pEGU=', '2025-09-27 14:22:54', 1, 'Chrome Browser / web', '58.10.119.240', '2025-08-28 14:22:54', '2025-08-28 22:48:08'),
(164, 8, 'refresh', 'SeZSNtwDikIArhVVi6W-8MSlxUEcSesW9834ZCh9fMg=', '2025-09-27 14:48:22', 0, 'Chrome Browser / web', '58.11.0.200', '2025-08-28 14:48:22', '2025-08-28 14:48:22'),
(165, 7, 'refresh', 'eyMx8kJGaGOF928RK2h7MOQHJdWlZwzGshC-uFxKRRc=', '2025-09-27 22:48:13', 0, 'Chrome Browser / web', '58.10.119.240', '2025-08-28 22:48:13', '2025-08-28 22:48:13'),
(166, 8, 'refresh', 'IQftLJ9UeOPzr9W-pFM85QedXQaAXsbmeEEoODl56Ak=', '2025-09-27 23:05:20', 0, 'Chrome Browser / web', '58.11.0.200', '2025-08-28 23:05:20', '2025-08-28 23:05:20'),
(167, 8, 'refresh', 'Bo7jy4QNkVbPpYSqmf91wRnR923662Z35Jj8vM39_8s=', '2025-09-28 04:49:29', 1, 'Chrome Browser / web', '58.10.119.240', '2025-08-29 04:49:29', '2025-08-29 04:55:07'),
(168, 7, 'refresh', '5pnqaYfr6FirAZA4mvg_aB4Fh9D9bCvFjLeGZ6NWoKw=', '2025-09-28 04:55:16', 0, 'Chrome Browser / web', '58.10.119.240', '2025-08-29 04:55:16', '2025-08-29 04:55:16'),
(169, 8, 'refresh', 'f-_7Qx_jbiJ7czjoNqbtTALQkTIi34cHFdGoyXdkR3o=', '2025-09-28 11:01:12', 0, 'Chrome Browser / web', '58.11.0.200', '2025-08-29 11:01:12', '2025-08-29 11:01:12'),
(170, 8, 'refresh', 'l8JPvjZWQcgKyvMFDvGNnGTGEV8z7zln_-GT4SuJSIs=', '2025-09-28 13:16:31', 0, 'Chrome Browser / web', '58.11.0.200', '2025-08-29 13:16:31', '2025-08-29 13:16:31'),
(171, 7, 'refresh', 'ucgk4k0t_dSeiswuAA4XCEhABUAL-SzWCIqnmCROP6c=', '2025-09-28 13:20:40', 0, 'Chrome Browser / web', '58.10.141.247', '2025-08-29 13:20:40', '2025-08-29 13:20:40'),
(172, 8, 'refresh', 'WriIBiTHvrY754eZvSR-PAafc35dlVsCwiitJXQ2wAM=', '2025-09-28 15:11:56', 0, 'Chrome Browser / web', '58.11.0.200', '2025-08-29 15:11:56', '2025-08-29 15:11:56'),
(173, 8, 'refresh', 'X9hV40PDo1_5nmCQ21ho5s9FMqP2jfwbctlUbHCAL-M=', '2025-09-28 16:14:18', 1, 'Chrome Browser / web', '58.11.0.200', '2025-08-29 16:14:18', '2025-08-29 16:20:45'),
(174, 7, 'refresh', 'jaK9iYNga0Ul3SwQkt3fk-cjvd3YN-iupqStFbSXEJY=', '2025-09-28 16:20:48', 1, 'Chrome Browser / web', '58.11.0.200', '2025-08-29 16:20:48', '2025-08-29 16:41:20'),
(175, 8, 'refresh', 'nI8Yp9c1VLRfQmKR-JHkALkycbyjQkMO35x0S9kWvRo=', '2025-09-28 16:41:22', 0, 'Chrome Browser / web', '58.11.0.200', '2025-08-29 16:41:22', '2025-08-29 16:41:22'),
(176, 8, 'refresh', 'UbzRMQz5VGW_Cz6-kDPTG5UfI_cMkpUCqXpV5oA7Z0w=', '2025-09-30 07:56:33', 0, 'Chrome Browser / web', '58.11.0.200', '2025-08-31 07:56:33', '2025-08-31 07:56:33'),
(177, 7, 'refresh', 'JjP8k0ri7pTM-YC7D2MMzq2j_0C822B3bJ-1v5QYlSY=', '2025-09-30 08:00:05', 1, 'Chrome Browser / web', '58.10.141.247', '2025-08-31 08:00:05', '2025-08-31 08:23:38'),
(178, 7, 'refresh', '3auuGwdBz5y6vDnPl8T1hfeiDxcpzLdsXO3NgD4K_aQ=', '2025-09-30 08:02:32', 0, 'Chrome Browser / web', '58.11.0.200', '2025-08-31 08:02:32', '2025-08-31 08:02:32'),
(179, 8, 'refresh', 'laoJ50g2fWth8eI_hP0X_0UPlcs-NnlpR12SzfahrHk=', '2025-09-30 08:23:47', 0, 'Chrome Browser / web', '58.10.141.247', '2025-08-31 08:23:47', '2025-08-31 08:23:47'),
(180, 8, 'refresh', 'yeA0Hb3q3m4oTGLkKrHO5fUUPA4mKnkKhPtyhThfN68=', '2025-10-01 10:43:26', 0, 'Chrome Browser / web', '58.11.0.200', '2025-09-01 10:43:26', '2025-09-01 10:43:26'),
(181, 7, 'refresh', 'aHtY6nP9kNQOcOSf5ee2T36B9oiUqCeWpH3QMASspyg=', '2025-10-01 12:03:32', 1, 'Chrome Browser / web', '58.11.0.200', '2025-09-01 12:03:32', '2025-09-01 12:03:36'),
(182, 8, 'refresh', 'AGUG-3i0c5PIUjKD7ryQLCkryCKnknMWyCOrPnfUP9Y=', '2025-10-01 12:03:38', 0, 'Chrome Browser / web', '58.11.0.200', '2025-09-01 12:03:38', '2025-09-01 12:03:38'),
(183, 7, 'refresh', 'y_rA2jmiF-UpAG6yUV7_bLoMdZM0RwktptbUJkj5z7o=', '2025-10-02 10:10:39', 0, 'Chrome Browser / web', '58.10.135.22', '2025-09-02 10:10:39', '2025-09-02 10:10:39'),
(184, 8, 'refresh', 'FDeqmEjELqbhK45vG7Lql5cD918gZhaQrS1bpP2d32c=', '2025-10-02 12:13:20', 0, 'Chrome Browser / web', '58.11.0.200', '2025-09-02 12:13:20', '2025-09-02 12:13:20'),
(185, 7, 'refresh', 'aRq_kWbdjehByaqJGMAoVpViKf2J0xeDZ8MQfJ1Fhlw=', '2025-10-03 07:45:06', 0, 'Chrome Browser / web', '58.10.129.204', '2025-09-03 07:45:06', '2025-09-03 07:45:06'),
(186, 8, 'refresh', 'uPgy9w9CkbJ9fQ-nrDwnIrRcVZdlZzIGj0Ci2kBCFGM=', '2025-10-03 09:58:18', 0, 'Chrome Browser / web', '58.10.72.13', '2025-09-03 09:58:18', '2025-09-03 09:58:18'),
(187, 8, 'refresh', 'XtF1RGXZ4pB3eI6meuDjXB1QAVFlob777_MBytcl1Bg=', '2025-10-03 12:12:54', 0, 'Chrome Browser / web', '58.10.72.13', '2025-09-03 12:12:54', '2025-09-03 12:12:54'),
(188, 8, 'refresh', '4zJY9MLiqKKjw_q_ivOwRk4fFaHU2AsZ4Ti8soFsgXo=', '2025-10-03 15:31:50', 0, 'Chrome Browser / web', '58.10.72.13', '2025-09-03 15:31:50', '2025-09-03 15:31:50'),
(189, 8, 'refresh', 'EA-pmexm1651cuj5aC0CN4UOmFZ32zzUbN2rYnQZP2Q=', '2025-10-04 11:06:55', 0, 'Chrome Browser / web', '58.10.72.13', '2025-09-04 11:06:55', '2025-09-04 11:06:55'),
(190, 7, 'refresh', 'UqoYfSNQtz8y8iAISKQg3BtNbrAi0GBXsgDKWJPNrpY=', '2025-10-04 15:19:21', 0, 'Chrome Browser / web', '58.10.129.204', '2025-09-04 15:19:21', '2025-09-04 15:19:21'),
(191, 8, 'refresh', 'w5BBvbuPJJmTQTU8m5hR_6DJXXjJ-_5mTl2zQlFWQow=', '2025-10-05 09:53:01', 0, 'Chrome Browser / web', '58.10.72.13', '2025-09-05 09:53:01', '2025-09-05 09:53:01'),
(192, 8, 'refresh', 'eMlZ9vfOc3rGdzwHV78xixGjxHAZ1B93_CrFvCrpd08=', '2025-10-05 11:05:17', 0, 'Chrome Browser / web', '58.10.72.13', '2025-09-05 11:05:17', '2025-09-05 11:05:17'),
(193, 8, 'refresh', 'YfBNR4Z7xE8tOTe2U6Wu3-P2VOcX9F94RrOWjM-WzC0=', '2025-10-06 03:30:08', 0, 'Chrome Browser / web', '58.10.129.204', '2025-09-06 03:30:08', '2025-09-06 03:30:08'),
(194, 8, 'refresh', 'g9i0Y5arHGaijgfrUMbiJI0383756O1ODR72fZWdj1s=', '2025-10-06 09:57:17', 0, 'Chrome Browser / web', '58.10.72.13', '2025-09-06 09:57:17', '2025-09-06 09:57:17'),
(195, 8, 'refresh', 'ImzGL6mrDQgnKAW-0BnvXLwTyRFhuALW7plIQb-NDR0=', '2025-10-06 11:04:22', 1, 'Chrome Browser / web', '58.10.72.13', '2025-09-06 11:04:22', '2025-09-06 11:04:37'),
(196, 7, 'refresh', 'KeLIwbXx4aiBWnI1rqDAaSLvhRZNnhn1_t4MdKFgZWU=', '2025-10-06 11:04:39', 1, 'Chrome Browser / web', '58.10.72.13', '2025-09-06 11:04:39', '2025-09-06 11:10:20'),
(197, 7, 'refresh', '5kv-8hQa5LyGdCPcBSe1Ji5pYC-QiXmO9lrYHlUJrr8=', '2025-10-06 11:10:21', 1, 'Chrome Browser / web', '58.10.72.13', '2025-09-06 11:10:21', '2025-09-06 11:27:39'),
(198, 8, 'refresh', 'UicfObYAc8tXGtu9YwF0_DKAqN3IaDIoXtV6FKRCi0Q=', '2025-10-06 11:27:42', 0, 'Chrome Browser / web', '58.10.72.13', '2025-09-06 11:27:42', '2025-09-06 11:27:42'),
(199, 8, 'refresh', '7qdbH-xZx_8Rvg9uzpF5fKkocN9z2SK4pgLWduP5sps=', '2025-10-06 14:39:32', 0, 'Chrome Browser / web', '58.10.72.13', '2025-09-06 14:39:32', '2025-09-06 14:39:32'),
(200, 8, 'refresh', 'ah8SEOsM1iPA6S8xcXYQ-jfH7ECMuEr386gq1UC6eVw=', '2025-10-06 14:56:23', 0, 'Chrome Browser / web', '58.10.129.204', '2025-09-06 14:56:23', '2025-09-06 14:56:23'),
(201, 8, 'refresh', 'ptwM1vGhR5Tuqk2uPPqUc2tRMEhA-Ba9EV4Zbji4TCg=', '2025-10-06 15:43:45', 0, 'Chrome Browser / web', '58.10.72.13', '2025-09-06 15:43:45', '2025-09-06 15:43:45'),
(202, 8, 'refresh', 'LWFbRDEbEcWfjpC1AOb9IxRXn4f8UCkKkDAo8dV3eEs=', '2025-10-06 16:01:06', 0, 'Chrome Browser / web', '58.10.129.204', '2025-09-06 16:01:06', '2025-09-06 16:01:06'),
(203, 8, 'refresh', '4zyMCE8Q2M5-WSRXKh1SLTd4oWMhc8TaUcy1K86Mh1A=', '2025-10-06 17:56:04', 0, 'Chrome Browser / web', '58.10.129.204', '2025-09-06 17:56:04', '2025-09-06 17:56:04'),
(204, 8, 'refresh', '2mV8mVLvcqhccfzcj75WXQxRGmfNQ7tbPwCjgEIiRgY=', '2025-10-07 00:29:06', 1, 'Chrome Browser / web', '58.10.129.204', '2025-09-07 00:29:06', '2025-09-07 03:13:31'),
(205, 7, 'refresh', 'mtRAfGaV2g8Gnb9DYvHgvzvT10ak3yDyfnv-qbupZ0w=', '2025-10-07 03:13:52', 0, 'Chrome Browser / web', '58.10.129.204', '2025-09-07 03:13:52', '2025-09-07 03:13:52'),
(206, 7, 'refresh', 'Z13CA_MvUQTm6rCzB5hBQ9FHQ3fk0pNDHAd4IqWjsZY=', '2025-10-07 04:16:33', 1, 'Chrome Browser / web', '58.10.129.204', '2025-09-07 04:16:33', '2025-09-07 04:47:47'),
(207, 8, 'refresh', 'PEAmo_mSN_yt9HJR5g0r2ppVBJ9b1f5RHxJToxU4ulM=', '2025-10-07 04:48:02', 1, 'Chrome Browser / web', '58.10.129.204', '2025-09-07 04:48:02', '2025-09-07 07:45:05'),
(208, 7, 'refresh', 'oZucGL3T1XKgALXKA0oSVbwTifGZgR4VMHwc6sLobYs=', '2025-10-07 07:45:21', 1, 'Chrome Browser / web', '58.10.129.204', '2025-09-07 07:45:21', '2025-09-07 07:49:02'),
(209, 8, 'refresh', 'foRGk5B3B60yosRBTjPEw9Y0oeVlT96BvWoJW0qir0A=', '2025-10-07 07:49:11', 1, 'Chrome Browser / web', '58.10.129.204', '2025-09-07 07:49:11', '2025-09-07 07:59:40'),
(210, 8, 'refresh', 'VnNCQkAjqkISeNvqteIKQybTAE-riDHMtLjjInSB9aU=', '2025-10-07 07:51:02', 1, 'Chrome Browser / web', '58.10.72.13', '2025-09-07 07:51:02', '2025-09-07 07:52:03'),
(211, 7, 'refresh', '47bSyICNSSbY9gyY4TB26WgvTD7S9bwG5u5_jNOMZgk=', '2025-10-07 07:52:05', 1, 'Chrome Browser / web', '58.10.72.13', '2025-09-07 07:52:05', '2025-09-07 07:53:17'),
(212, 8, 'refresh', '13ES3DypNvGXbA6OR21sQWShy9lnaP5Q-tv_OdHZkNM=', '2025-10-07 07:53:19', 1, 'Chrome Browser / web', '58.10.72.13', '2025-09-07 07:53:19', '2025-09-07 08:21:31'),
(213, 7, 'refresh', 'O_ak5SsTaLcSvjKqVILq0FeZ4Z_k0ohYxnaGff8se7o=', '2025-10-07 07:59:46', 1, 'Chrome Browser / web', '58.10.129.204', '2025-09-07 07:59:46', '2025-09-07 08:00:32'),
(214, 8, 'refresh', 'hABtm4tBQlOu1ffMbYugHJE4wnwt3r62BW_n7_LxQz0=', '2025-10-07 08:00:38', 1, 'Chrome Browser / web', '58.10.129.204', '2025-09-07 08:00:38', '2025-09-07 08:08:26'),
(215, 7, 'refresh', 'YHD3ax9ABG7SmIsjsj4D8neNJHm2Vr16swmGQZuDWqg=', '2025-10-07 08:08:31', 0, 'Chrome Browser / web', '58.10.129.204', '2025-09-07 08:08:31', '2025-09-07 08:08:31'),
(216, 7, 'refresh', '49BfOsjdNStBg24UKNZM0DqPWibhMvvp6i9bCP0yVHc=', '2025-10-07 08:21:35', 1, 'Chrome Browser / web', '58.10.72.13', '2025-09-07 08:21:35', '2025-09-07 08:46:28'),
(217, 8, 'refresh', 'vwaBHrUKrO-xJERF0NhIX0OeHPqqYwFYeKakzgAJ2sg=', '2025-10-07 08:46:30', 1, 'Chrome Browser / web', '58.10.72.13', '2025-09-07 08:46:30', '2025-09-07 08:57:31'),
(218, 7, 'refresh', 'NIXFaa1CNMzb6gWLcXtfmzcKK0rjLo8FQlMPYt7OSS8=', '2025-10-07 08:57:33', 0, 'Chrome Browser / web', '58.10.72.13', '2025-09-07 08:57:33', '2025-09-07 08:57:33'),
(219, 8, 'refresh', '4CX0gpVsJCM5690hkkRJYwuJQgjh1VQeKr9wNdBkoRM=', '2025-10-08 10:54:40', 0, 'Chrome Browser / web', '58.10.119.32', '2025-09-08 10:54:40', '2025-09-08 10:54:40'),
(220, 8, 'refresh', 'pDHSnYYz_f16R4zo1y4xymr4AzmIdFJME5gpKb2Owkg=', '2025-10-09 10:13:11', 0, 'Chrome Browser / web', '58.10.119.32', '2025-09-09 10:13:11', '2025-09-09 10:13:11'),
(221, 8, 'refresh', 'lwBsUWbp1_ltSgA8DaGbAoOrqY83uzep0I1iQaOdLy8=', '2025-10-10 13:10:33', 0, 'Chrome Browser / web', '58.10.119.32', '2025-09-10 13:10:33', '2025-09-10 13:10:33'),
(222, 8, 'refresh', 'TnF2BI0WdbnmhRMk4Mhh0OjxBJiKuxV2bV3TPH33ork=', '2025-10-11 12:43:34', 0, 'Chrome Browser / web', '58.10.119.32', '2025-09-11 12:43:34', '2025-09-11 12:43:34'),
(223, 8, 'refresh', 'QpVLhnbvYhCdyTeL0iRPcR14y4jVgeB0DnUmQFBXOe4=', '2025-10-12 08:38:45', 0, 'Chrome Browser / web', '110.168.239.196', '2025-09-12 08:38:45', '2025-09-12 08:38:45'),
(224, 8, 'refresh', 'VT3j7yazMfM8rwLFHUq-Yix4owJrR9EXBPU9wX0meLg=', '2025-10-12 12:19:18', 0, 'Chrome Browser / web', '58.10.119.32', '2025-09-12 12:19:18', '2025-09-12 12:19:18'),
(225, 8, 'refresh', 'T5tbdLtZBINUxKxORlgypWF93FHnn3zrrybTJuW1c9Q=', '2025-10-12 12:20:26', 1, 'Chrome Browser / web', '110.168.239.196', '2025-09-12 12:20:26', '2025-09-12 14:01:56'),
(226, 7, 'refresh', '3d2RfH-H3W-rWqdgpZR745l2DXmjXl3IMgG8Wmxo8EU=', '2025-10-12 12:43:49', 0, ' / api_client', '58.10.119.32', '2025-09-12 12:43:49', '2025-09-12 12:43:49'),
(227, 8, 'refresh', 'F-oZkgmR8Y9VPFR91LxoFD8tUGc5U766GmSb9a5wS1c=', '2025-10-12 13:08:26', 0, ' / api_client', '58.10.119.32', '2025-09-12 13:08:26', '2025-09-12 13:08:26'),
(228, 7, 'refresh', 'gxV9ZZyLYA-l7b1hExrTtXAKB1dxNfPA3SRpffTsYGc=', '2025-10-12 14:02:06', 1, 'Chrome Browser / web', '110.168.239.196', '2025-09-12 14:02:06', '2025-09-12 14:25:09'),
(229, 8, 'refresh', '7fAvtTJcLk_I-V4Y2oLrHM-TwMpjX55_x8QcNxQjvjo=', '2025-10-12 14:25:15', 1, 'Chrome Browser / web', '110.168.239.196', '2025-09-12 14:25:15', '2025-09-12 14:26:05'),
(230, 7, 'refresh', '6DkUJ0T2SjNU9CQTn-DucAK_EbZMJjhbWvvPWxbb9xc=', '2025-10-12 14:26:14', 0, 'Chrome Browser / web', '110.168.239.196', '2025-09-12 14:26:14', '2025-09-12 14:26:14'),
(231, 7, 'refresh', 'P-TrRQsi9C2ahJTcm9XKVmV6Q6zUYrb6RzC4gvDYZtw=', '2025-10-12 16:13:20', 0, 'Chrome Browser / web', '58.10.119.32', '2025-09-12 16:13:20', '2025-09-12 16:13:20'),
(232, 8, 'refresh', 'S_u6M8m5IJUk0OOsFILDzIPKcF4ccq9hc0bd0dpqg1A=', '2025-10-13 03:10:39', 1, 'Chrome Browser / web', '58.10.141.29', '2025-09-13 03:10:39', '2025-09-13 03:11:11'),
(233, 7, 'refresh', '5nPl4OSxZnNASUzOigaygB6JfxWPzrz1c6nGSjOFOBU=', '2025-10-13 03:11:18', 0, 'Chrome Browser / web', '58.10.141.29', '2025-09-13 03:11:18', '2025-09-13 03:11:18'),
(234, 7, 'refresh', '9LDzOeIMkMeizTWdIe7aver9tYNiDKULXRo6kHaPjjM=', '2025-10-13 11:16:13', 0, 'Chrome Browser / web', '58.10.119.32', '2025-09-13 11:16:13', '2025-09-13 11:16:13'),
(235, 7, 'refresh', '00YpaNkrPerDKk1t5hvvM5gFIstQ-dmSc2c9445SXnk=', '2025-10-13 12:24:27', 1, 'Chrome Browser / web', '58.10.119.32', '2025-09-13 12:24:27', '2025-09-13 14:18:37'),
(236, 7, 'refresh', 'wElt4DiArvgNP6vDMxKx7cyHSQawWKSmMpDyR1htA9A=', '2025-10-13 12:37:10', 0, ' / api_client', '58.10.119.32', '2025-09-13 12:37:10', '2025-09-13 12:37:10'),
(237, 8, 'refresh', 'R_GjwldS_qrL8Jq0dvTFX-2So9Ry8IVS7aHianVfPF4=', '2025-10-13 14:18:39', 1, 'Chrome Browser / web', '58.10.119.32', '2025-09-13 14:18:39', '2025-09-13 15:27:35'),
(238, 7, 'refresh', 'sbe9vXI90e_fvHaIKfnvt3of0vzMqWiH7DEje4T3WLs=', '2025-10-13 14:42:34', 0, 'Chrome Browser / web', '58.10.141.29', '2025-09-13 14:42:34', '2025-09-13 14:42:34'),
(239, 8, 'refresh', 'dIm38DGyPSOt-RSkRHYaOb7pbCAelY8xp8ADPdkNs34=', '2025-10-13 15:27:38', 1, 'Chrome Browser / web', '58.10.119.32', '2025-09-13 15:27:38', '2025-09-13 15:27:39'),
(240, 7, 'refresh', 'cHbHxAP7aIb1SbGXI5Pv05STpmbvQK5DWBw2Jc3ErT4=', '2025-10-13 15:27:43', 1, 'Chrome Browser / web', '58.10.119.32', '2025-09-13 15:27:43', '2025-09-13 15:28:01'),
(241, 7, 'refresh', 'ng7J3lX9xqUSzKQ8b9znRVq0O_6zyTZ96abr0T7xeec=', '2025-10-13 15:28:05', 1, 'Chrome Browser / web', '58.10.119.32', '2025-09-13 15:28:05', '2025-09-13 15:28:07'),
(242, 8, 'refresh', 'GKP4pjtx4HxwnHGhRFpdZpvbMLejxYoRHNZ9eOXhsvI=', '2025-10-13 15:28:09', 1, 'Chrome Browser / web', '58.10.119.32', '2025-09-13 15:28:09', '2025-09-13 17:14:48'),
(243, 7, 'refresh', 'GBacdpQ85D4ZqnksT19ajBoUXDI96WikjfPnwR1G-_4=', '2025-10-13 16:39:25', 1, 'Chrome Browser / web', '58.10.141.29', '2025-09-13 16:39:25', '2025-09-14 08:12:58'),
(244, 7, 'refresh', 'XxHtyO74NTiDQg3RweQPtCspbluor44AEV-eynjx3N4=', '2025-10-13 17:14:52', 1, 'Chrome Browser / web', '58.10.119.32', '2025-09-13 17:14:52', '2025-09-13 17:15:19'),
(245, 8, 'refresh', 'lteoXLjMIysVeoELPGh1NEInVa2tJ_Exr67XwH41iOc=', '2025-10-13 17:15:22', 1, 'Chrome Browser / web', '58.10.119.32', '2025-09-13 17:15:22', '2025-09-13 17:50:06'),
(246, 7, 'refresh', 'bOU0ulti5A-kad_azROznEH2ApPFpOZn2avZ6uHzQv0=', '2025-10-13 17:50:09', 1, 'Chrome Browser / web', '58.10.119.32', '2025-09-13 17:50:09', '2025-09-13 17:52:22'),
(247, 8, 'refresh', 'fYjQbkKTy0x8hvtLFlB-hJATVG_XLA8zBXC1-OKDHr8=', '2025-10-13 17:52:28', 0, 'Chrome Browser / web', '58.10.119.32', '2025-09-13 17:52:28', '2025-09-13 17:52:28'),
(248, 7, 'refresh', 'HA4QTCZAseohlTi_ehyB6zLiuhmSLfGkM9L4xjowotE=', '2025-10-14 07:03:14', 1, 'Chrome Browser / web', '58.10.119.32', '2025-09-14 07:03:14', '2025-09-14 07:07:58'),
(249, 8, 'refresh', 'QhQOAU-MWshj5p63nWxKSvQx_R711jDgN7IU4VgiSYA=', '2025-10-14 07:08:07', 1, 'Chrome Browser / web', '58.10.119.32', '2025-09-14 07:08:07', '2025-09-14 07:20:15'),
(250, 7, 'refresh', 'ifKQP3Jl_YA2E5KSaUi9uFccCSfJK0JVsrf2JvHEeDI=', '2025-10-14 07:20:17', 1, 'Chrome Browser / web', '58.10.119.32', '2025-09-14 07:20:17', '2025-09-14 07:20:52'),
(251, 8, 'refresh', 'Z4CDTeAZVosMuZD9ewyArniqjQAZpCj-8q2ZxBICmVI=', '2025-10-14 07:20:54', 1, 'Chrome Browser / web', '58.10.119.32', '2025-09-14 07:20:54', '2025-09-14 07:22:16'),
(252, 7, 'refresh', 'tLy9rUhUF5BH-aEhtfcgZwEnUZkh5VAUeigRi56DFik=', '2025-10-14 07:22:31', 1, 'Chrome Browser / web', '58.10.119.32', '2025-09-14 07:22:31', '2025-09-14 07:22:48'),
(253, 8, 'refresh', 'H2qEp3X6PPLbsqDddkzj7xTPThiQWQpdhWTAxukEhE8=', '2025-10-14 07:22:50', 1, 'Chrome Browser / web', '58.10.119.32', '2025-09-14 07:22:50', '2025-09-14 07:23:21'),
(254, 7, 'refresh', 'UHosSNRDxZ89qZEoH5nsAtXZFZM4J92Rpcw_AdPs8-Y=', '2025-10-14 07:23:23', 1, 'Chrome Browser / web', '58.10.119.32', '2025-09-14 07:23:23', '2025-09-14 07:23:55'),
(255, 8, 'refresh', 'cS65pobBsCjP8GtQdai_rOzVSTH3nKCu6O5XpoYirBI=', '2025-10-14 07:23:59', 1, 'Chrome Browser / web', '58.10.119.32', '2025-09-14 07:23:59', '2025-09-14 07:24:10'),
(256, 7, 'refresh', 'qmsDhmtkxobM-X2fRFDdu-AgAmrdWp47wjzRpLg7Dd8=', '2025-10-14 07:24:19', 1, 'Chrome Browser / web', '58.10.119.32', '2025-09-14 07:24:19', '2025-09-14 07:24:24'),
(257, 8, 'refresh', 'owjpSfy__XBcxgsxcm42olNDGw6YeKUtxQfF2cTxYFQ=', '2025-10-14 07:24:26', 1, 'Chrome Browser / web', '58.10.119.32', '2025-09-14 07:24:26', '2025-09-14 07:24:38'),
(258, 8, 'refresh', 'RWFxF0ihKWrK1X2YiPVLNwTQ8uGd2WOCaiTzhCxWNak=', '2025-10-14 07:24:39', 1, 'Chrome Browser / web', '58.10.119.32', '2025-09-14 07:24:39', '2025-09-14 07:24:42'),
(259, 7, 'refresh', 'Bk2lVP4WMVoEWaftilm6m8GlB4Ki6u38FGU8b3PHFIU=', '2025-10-14 07:24:43', 1, 'Chrome Browser / web', '58.10.119.32', '2025-09-14 07:24:43', '2025-09-14 07:40:49'),
(260, 8, 'refresh', 'QJFa5f-QBM8EPC7Muj_teLl6shFzCIi6V_JqJYq5F-4=', '2025-10-14 07:40:52', 1, 'Chrome Browser / web', '58.10.119.32', '2025-09-14 07:40:52', '2025-09-14 08:08:25'),
(261, 7, 'refresh', 'r7SNnHgI9ed3mEcFEomLiMFjnNin_oJMcJEv5yLsjN4=', '2025-10-14 08:08:27', 1, 'Chrome Browser / web', '58.10.119.32', '2025-09-14 08:08:27', '2025-09-14 08:09:37'),
(262, 8, 'refresh', 'UH8Kz2Ias5E2zs3s5eJexoI0uTxqj-zAPyFR800shTk=', '2025-10-14 08:09:40', 1, 'Chrome Browser / web', '58.10.119.32', '2025-09-14 08:09:40', '2025-09-14 08:32:55'),
(263, 8, 'refresh', 'zA2_IogiMPbBaQ67cE3xlv3gfd6VDD_hACfiN1essII=', '2025-10-14 08:13:05', 1, 'Chrome Browser / web', '58.10.148.156', '2025-09-14 08:13:05', '2025-09-14 08:18:09'),
(264, 7, 'refresh', 'E_dWWRlJ-TQ2j1gN1Xf59W9gxplTT3zTX5AXvdGbEyI=', '2025-10-14 08:18:18', 0, 'Chrome Browser / web', '58.10.148.156', '2025-09-14 08:18:18', '2025-09-14 08:18:18'),
(265, 7, 'refresh', '3IQ82gQc1_o6XLPLw3giqszbsFTCFWh6WjrwqIFE-dY=', '2025-10-14 08:32:57', 1, 'Chrome Browser / web', '58.10.119.32', '2025-09-14 08:32:57', '2025-09-14 08:44:24'),
(266, 8, 'refresh', '6FW8IUo2oYgNUfaipL63_niCvBrgSHd1u3V-rJ6jedU=', '2025-10-14 08:44:26', 1, 'Chrome Browser / web', '58.10.119.32', '2025-09-14 08:44:26', '2025-09-14 09:01:49'),
(267, 8, 'refresh', 'NJETJCIZbNy9Qs0AgPlQbUtipoiDcz2tn2CSiwInQJ8=', '2025-10-14 09:01:50', 0, 'Chrome Browser / web', '58.10.119.32', '2025-09-14 09:01:50', '2025-09-14 09:01:50'),
(268, 8, 'refresh', 'aiptA8nNfYaQrVc_yFn6_ucFKiIHnDgw0ZMwbYUQkiY=', '2025-10-15 07:20:39', 1, 'Chrome Browser / web', '58.10.106.234', '2025-09-15 07:20:39', '2025-09-15 07:39:15'),
(269, 7, 'refresh', 'YtRMZrtE5aPv_2MGCgDrqq0nobQx_dAPD2pEHqqWQ6M=', '2025-10-15 07:39:22', 1, 'Chrome Browser / web', '58.10.106.234', '2025-09-15 07:39:22', '2025-09-15 08:36:49'),
(270, 8, 'refresh', 'KhfZW2qm4fmTjX4fZlIFnV0rnlBUff9TmGLg-0LMPfc=', '2025-10-15 08:37:01', 1, 'Chrome Browser / web', '58.10.106.234', '2025-09-15 08:37:01', '2025-09-15 08:37:11'),
(271, 7, 'refresh', 'lr_e4zX6tc3rKdAEHtCvQPciNQhLw1JkANrzLo9bBvQ=', '2025-10-15 08:37:38', 0, 'Chrome Browser / web', '58.10.106.234', '2025-09-15 08:37:38', '2025-09-15 08:37:38'),
(272, 8, 'refresh', 'Ypa3FTMydqLFGnbj7mbM8Aus-QwLDeHr_1CV6GHDEEU=', '2025-10-16 12:30:38', 0, 'Chrome Browser / web', '58.10.129.101', '2025-09-16 12:30:38', '2025-09-16 12:30:38'),
(273, 8, 'refresh', 'GUxKERgRgPgg_qzZtg6IyWn69qQDbJWEec6jS9MgGpo=', '2025-10-17 09:19:11', 0, 'Chrome Browser / web', '58.10.72.50', '2025-09-17 09:19:11', '2025-09-17 09:19:11'),
(274, 8, 'refresh', 'HfE9oasB057EImjq7dytSJGZWodQv5fJYztZn1vkSFA=', '2025-10-17 10:21:07', 1, 'Chrome Browser / web', '58.10.72.50', '2025-09-17 10:21:07', '2025-09-17 12:06:54'),
(275, 8, 'refresh', 'BpkZW1UcJNGnCAlYIG7CMD3ispn1Ts9kz3HwNf8yOWg=', '2025-10-17 10:27:37', 0, 'Chrome Browser / web', '58.10.129.101', '2025-09-17 10:27:37', '2025-09-17 10:27:37'),
(276, 7, 'refresh', 'Yv0BOdc4yXR3i1vl0RInOP0-GtxKuJEjeHRWjVBPE64=', '2025-10-17 12:07:05', 0, 'Chrome Browser / web', '58.10.72.50', '2025-09-17 12:07:05', '2025-09-17 12:07:05'),
(277, 7, 'refresh', 'rsRcbujmMsNCWOaOmp2tV7Kc0yhnn2gc78ZvRYRdqyg=', '2025-10-18 06:21:59', 0, 'Chrome Browser / web', '110.168.242.151', '2025-09-18 06:21:59', '2025-09-18 06:21:59'),
(278, 8, 'refresh', 'J9FUKwmHTi8MYUcGpW2Nlrg-nVEx8mcKQRm8UvUHP14=', '2025-10-18 10:38:41', 1, 'Chrome Browser / web', '58.10.129.101', '2025-09-18 10:38:41', '2025-09-18 10:38:52');
INSERT INTO `user_tokens` (`token_id`, `user_id`, `token_type`, `token`, `expires_at`, `is_revoked`, `device_info`, `ip_address`, `created_at`, `updated_at`) VALUES
(279, 7, 'refresh', 'gTH1nbF2ghFE_6nF4EvSzFeFL23yDZkLxk_M9vqpDZ4=', '2025-10-18 10:38:54', 0, 'Chrome Browser / web', '58.10.129.101', '2025-09-18 10:38:54', '2025-09-18 10:38:54'),
(280, 7, 'refresh', 'xzBV7m1hpAVCQ2lJqIfPpgLjgwdW_dw8u4ZVIxKC4X0=', '2025-10-18 12:57:06', 1, 'Chrome Browser / web', '58.10.129.101', '2025-09-18 12:57:06', '2025-09-18 13:46:45'),
(281, 8, 'refresh', 'J8fCQACpsDDs7XEHjAwYp813n_HMyMXnFpwY7ytB_kk=', '2025-10-18 13:46:49', 0, 'Chrome Browser / web', '58.10.129.101', '2025-09-18 13:46:49', '2025-09-18 13:46:49'),
(282, 7, 'refresh', 'abmmhAihBvIwB_IkXn4BwGY_cuXokP8w15BvRrYcC3s=', '2025-10-19 06:36:22', 0, 'Chrome Browser / web', '110.168.242.151', '2025-09-19 06:36:22', '2025-09-19 06:36:22'),
(283, 7, 'refresh', 'sNU_NCubk3Au2ACBNqMVPMAKN2ZKQ2J29QFtZAcsAnc=', '2025-10-19 11:36:33', 0, 'Chrome Browser / web', '110.168.242.151', '2025-09-19 11:36:33', '2025-09-19 11:36:33'),
(284, 8, 'refresh', 'lIBhOGnEW5O_IMXvllzyqo13bk0Hr1GfGLCfk_R3XFs=', '2025-10-19 12:55:56', 1, 'Chrome Browser / web', '58.10.129.101', '2025-09-19 12:55:56', '2025-09-19 12:56:04'),
(285, 7, 'refresh', '2XPkRQUNtasCjKC7HZoxiKKSmwTLrV5vSCP8jdmm9Vs=', '2025-10-19 12:56:06', 0, 'Chrome Browser / web', '58.10.129.101', '2025-09-19 12:56:06', '2025-09-19 12:56:06'),
(286, 7, 'refresh', 'thi4mSggmF8iZWnaHoi70rowGVnhoAka3g6wwQ0WiqE=', '2025-10-19 15:07:19', 0, 'Chrome Browser / web', '110.168.242.151', '2025-09-19 15:07:19', '2025-09-19 15:07:19'),
(287, 7, 'refresh', 'W7SyXUBjzNrDA5kjE64NY8H4b4Kni8lDxG7QiuYy0kM=', '2025-10-20 06:09:14', 0, 'Chrome Browser / web', '58.10.153.17', '2025-09-20 06:09:14', '2025-09-20 06:09:14'),
(288, 7, 'refresh', 'u_M2Kka1UlSn5l5tRiBOuOyl8QlEuaEaBT_oVt92dhw=', '2025-10-20 07:10:37', 0, 'Chrome Browser / web', '58.10.153.17', '2025-09-20 07:10:37', '2025-09-20 07:10:37'),
(289, 7, 'refresh', 'MfRFH7rioh-1Wvcyd94LZl8DMrlgaOTFZb65xnYCNi4=', '2025-10-20 13:27:27', 0, 'Chrome Browser / web', '58.10.153.17', '2025-09-20 13:27:27', '2025-09-20 13:27:27'),
(290, 7, 'refresh', 'esGwgv1cmB8i-6bp_SR0ECrKJw3EQIE5QrJq-CVy3Fg=', '2025-10-20 16:12:10', 1, 'Chrome Browser / web', '58.10.153.17', '2025-09-20 16:12:10', '2025-09-20 16:33:53'),
(291, 8, 'refresh', 'LaG6yvsZlWdhJNjcxsu03CU3JpBZlmvbbMakYri42mA=', '2025-10-20 16:34:07', 1, 'Chrome Browser / web', '58.10.153.17', '2025-09-20 16:34:07', '2025-09-20 16:35:50'),
(292, 7, 'refresh', 'ho4kWZ2bWBebf7T3CLksiCUDlrbzOCI5705U1RLp65A=', '2025-10-20 16:35:59', 0, 'Chrome Browser / web', '58.10.153.17', '2025-09-20 16:35:59', '2025-09-20 16:35:59'),
(293, 7, 'refresh', '2A8kdO6DQABESy9LNVhklnwUaEWMgEPVOF5Ljfcd2cY=', '2025-10-20 20:14:21', 0, 'Chrome Browser / web', '58.10.129.101', '2025-09-20 20:14:21', '2025-09-20 20:14:21'),
(294, 7, 'refresh', 'wAXXTajkWnEAuA1xTTS3XdSneJ1cmjtsowdD1HqdblI=', '2025-10-21 07:20:03', 0, 'Chrome Browser / web', '58.10.153.17', '2025-09-21 07:20:03', '2025-09-21 07:20:03'),
(295, 7, 'refresh', 'sWzSO_auHT6XwAIRU1GRbVEYAaTeCT0usQwCqhHmODM=', '2025-10-21 11:11:26', 1, 'Chrome Browser / web', '58.10.129.101', '2025-09-21 11:11:26', '2025-09-21 11:12:58'),
(296, 8, 'refresh', 'lBRdsOXjJu91YvtFlBDbMfIiavWohjmY8H9YmN-kFfU=', '2025-10-21 11:13:01', 1, 'Chrome Browser / web', '58.10.129.101', '2025-09-21 11:13:01', '2025-09-21 11:14:31'),
(297, 7, 'refresh', 'jgj9MYCDsy2bGLD4pcXf2sgOisWZsQoS_FeahN3jOwM=', '2025-10-21 11:14:33', 1, 'Chrome Browser / web', '58.10.129.101', '2025-09-21 11:14:33', '2025-09-21 11:20:17'),
(298, 8, 'refresh', '-m3erAYF59DrdCBnA9QwPq2XfOL3u1OGAvF1w-9LRAk=', '2025-10-21 11:20:19', 0, 'Chrome Browser / web', '58.10.129.101', '2025-09-21 11:20:19', '2025-09-21 11:20:19'),
(299, 8, 'refresh', 'gjqQD0d40O1ymz_O6KYLNSje2Z038TilfP8E8SOu6m0=', '2025-10-21 11:28:21', 1, 'Chrome Browser / web', '58.10.129.101', '2025-09-21 11:28:21', '2025-09-21 11:39:15'),
(300, 7, 'refresh', '3BpJw9ncNCEtQjwRNfMlz-e9lXKCAvp6_qhFIu4qx18=', '2025-10-21 11:39:17', 1, 'Chrome Browser / web', '58.10.129.101', '2025-09-21 11:39:17', '2025-09-21 11:49:33'),
(301, 8, 'refresh', '_xMUFCc9pv7ueJW-EW6iKXpe5yoYvYCRbneZdu9SD_A=', '2025-10-21 11:49:35', 1, 'Chrome Browser / web', '58.10.129.101', '2025-09-21 11:49:35', '2025-09-21 12:34:28'),
(302, 7, 'refresh', '11zwTI8zwZehWszbQCDiGXf5AkA1zTEUcT4nLYXhAU0=', '2025-10-21 12:34:30', 1, 'Chrome Browser / web', '58.10.129.101', '2025-09-21 12:34:30', '2025-09-21 13:20:40'),
(303, 8, 'refresh', 'PWJRQzLyKgWtHiNZc680fbPBKf-OlhXf4yfbabJpOhA=', '2025-10-21 13:20:44', 0, 'Chrome Browser / web', '58.10.129.101', '2025-09-21 13:20:44', '2025-09-21 13:20:44'),
(304, 8, 'refresh', 'qv7TsEgz_Dvkk5mZ6ckLECUae82WCdgHPlzgLxyF12s=', '2025-10-22 09:38:22', 1, 'Chrome Browser / web', '58.10.153.17', '2025-09-22 09:38:22', '2025-09-22 12:08:31'),
(305, 13, 'refresh', 'qeE_dkhv3gC4oYNVS08duEUjKHaJq9k4UafrfJ4Wy0I=', '2025-10-22 09:55:12', 0, 'Chrome Browser / web', '58.10.72.179', '2025-09-22 09:55:12', '2025-09-22 09:55:12'),
(306, 7, 'refresh', 'Bi2fxjVHt1824GkRpy0wY_UezTXppvQ6glWB8q20brw=', '2025-10-22 10:44:09', 1, 'Chrome Browser / web', '58.10.72.179', '2025-09-22 10:44:09', '2025-09-22 10:45:21'),
(307, 8, 'refresh', 'P8zN_x5vwdeKtogCA43TVBN9Uzp1j-BoMAkfYPnIGeI=', '2025-10-22 10:45:23', 1, 'Chrome Browser / web', '58.10.72.179', '2025-09-22 10:45:23', '2025-09-22 10:46:25'),
(308, 7, 'refresh', 'Peei5m4CyKWdsY_3yz5HLDl5wRwgOhIw12bLkpsFZCY=', '2025-10-22 10:46:27', 1, 'Chrome Browser / web', '58.10.72.179', '2025-09-22 10:46:27', '2025-09-22 11:02:21'),
(309, 8, 'refresh', 'hKOWwNOA0sSHBjvatleFkMP2zwJSLQ4aWkHWJ-HQyoQ=', '2025-10-22 11:02:24', 1, 'Chrome Browser / web', '58.10.72.179', '2025-09-22 11:02:24', '2025-09-22 11:12:28'),
(310, 7, 'refresh', '0nayjNM95WJt5CJZAig5gj1RinqiMHITG-Cu2rJTJho=', '2025-10-22 11:12:30', 0, 'Chrome Browser / web', '58.10.72.179', '2025-09-22 11:12:30', '2025-09-22 11:12:30'),
(311, 8, 'refresh', 'eBqBB7xCIupBfPdTpok7ecwbPz_QAyffr0iNiCEXGpw=', '2025-10-22 11:39:01', 1, 'Chrome Browser / web', '58.10.72.179', '2025-09-22 11:39:01', '2025-09-22 11:39:04'),
(312, 7, 'refresh', 'NBfcyms7wBZAxFlsWW_3hlYI0IDfeNo7XI-0kxEcyrA=', '2025-10-22 11:39:06', 1, 'Chrome Browser / web', '58.10.72.179', '2025-09-22 11:39:06', '2025-09-22 11:52:48'),
(313, 8, 'refresh', 'pS6ZDaeKsaLUgOBtaadV2b5xWZJ7UVLoz_QJ7rU1bEk=', '2025-10-22 11:52:50', 1, 'Chrome Browser / web', '58.10.72.179', '2025-09-22 11:52:50', '2025-09-22 12:02:32'),
(314, 7, 'refresh', 'xWVILUmpOjlNzz4-hQZRSuGU0VrRZszV1FK_iRo0HT4=', '2025-10-22 12:02:36', 1, 'Chrome Browser / web', '58.10.72.179', '2025-09-22 12:02:36', '2025-09-22 12:02:44'),
(315, 8, 'refresh', 'PLGO_wf3hblrH-i1b3E0WqzgrLUnBph9dweHeTg_N2o=', '2025-10-22 12:08:40', 1, 'Chrome Browser / web', '58.10.153.17', '2025-09-22 12:08:40', '2025-09-22 12:09:45'),
(316, 8, 'refresh', 'bfuyS9kblW_2AHRfaj-csswMNMfWTvdRMCrcuKH4JRI=', '2025-10-22 12:09:57', 1, 'Chrome Browser / web', '58.10.153.17', '2025-09-22 12:09:57', '2025-09-22 12:11:08'),
(317, 7, 'refresh', 'RHT6bkzNJ6d1yTeFJc5xmPJPgwRDDf1IocmlPALt4mA=', '2025-10-22 12:10:47', 1, 'Chrome Browser / web', '58.10.72.179', '2025-09-22 12:10:47', '2025-09-22 12:10:49'),
(318, 8, 'refresh', 'hTz05W1WkNw0UAlKwVBo0f-shQvKd8DO3jLVaTEg_RA=', '2025-10-22 12:10:51', 1, 'Chrome Browser / web', '58.10.72.179', '2025-09-22 12:10:51', '2025-09-22 13:40:29'),
(319, 7, 'refresh', 'C5ZoWXLF8dmAG_Ix-hwrHGbYuiNLCoH3BUULxfuG1IY=', '2025-10-22 12:11:16', 1, 'Chrome Browser / web', '58.10.153.17', '2025-09-22 12:11:16', '2025-09-22 12:11:46'),
(320, 7, 'refresh', 'FPuVo2E9q21eFSsIcCISsxECiwuru1b8C6Hx-WYniqI=', '2025-10-22 12:11:55', 1, 'Chrome Browser / web', '58.10.153.17', '2025-09-22 12:11:55', '2025-09-22 12:11:58'),
(321, 8, 'refresh', '1zjdyfrvTtXOo3AUFLqqK5ZqDNRoElS5RhY5EKu6GQY=', '2025-10-22 12:12:06', 1, 'Chrome Browser / web', '58.10.153.17', '2025-09-22 12:12:06', '2025-09-22 12:14:54'),
(322, 8, 'refresh', 'IpUURj0K12ZlDnqcWp_ElrbE13yYluyoSIqKWPIIZ7o=', '2025-10-22 12:15:10', 1, 'Chrome Browser / web', '58.10.153.17', '2025-09-22 12:15:10', '2025-09-22 12:15:54'),
(323, 10, 'refresh', 'v0Sh6D4olQ9csp1KtnMFK3a7kk5RB9kUxwmimn-Asmw=', '2025-10-22 12:16:17', 1, 'Chrome Browser / web', '58.10.153.17', '2025-09-22 12:16:17', '2025-09-22 12:16:21'),
(324, 13, 'refresh', 'wW9TWIA-ZgdsnJAJ5RwF-CJhhUcYvhbSYH1mAixOtT4=', '2025-10-22 12:16:42', 1, 'Chrome Browser / web', '58.10.153.17', '2025-09-22 12:16:42', '2025-09-22 12:49:12'),
(325, 8, 'refresh', 'kCcnPfWgf3mJCHoLOAtGm5CygkVykGf8gOB_J1fITik=', '2025-10-22 12:49:18', 1, 'Chrome Browser / web', '58.10.153.17', '2025-09-22 12:49:18', '2025-09-22 12:49:23'),
(326, 10, 'refresh', 'D9R22W4Ek2Nsj6KkPb8s1AsPy76jurMg40Urk_K_kXo=', '2025-10-22 12:49:42', 1, 'Chrome Browser / web', '58.10.153.17', '2025-09-22 12:49:42', '2025-09-22 12:49:48'),
(327, 8, 'refresh', 'KSniMaroE9HVinQu09d76aFaSmjNvcqtN6NctEzTrRQ=', '2025-10-22 12:49:56', 1, 'Chrome Browser / web', '58.10.153.17', '2025-09-22 12:49:56', '2025-09-22 12:49:58'),
(328, 13, 'refresh', '4_1-fZV3Kl7TJkwwKriHv5s0QKpJmU-LncX5L_t-Vzs=', '2025-10-22 12:50:18', 1, 'Chrome Browser / web', '58.10.153.17', '2025-09-22 12:50:18', '2025-09-22 13:37:43'),
(329, 7, 'refresh', 'Pp6kZp3wlrL7X8Ve_GdR49LgncO08vThJMtIlYGR3gY=', '2025-10-22 13:37:51', 1, 'Chrome Browser / web', '58.10.153.17', '2025-09-22 13:37:51', '2025-09-22 13:38:00'),
(330, 8, 'refresh', 'VT4qfkM8wLI7x48F-Bn28qb2JMDXqu7zwYy3BVdTUwM=', '2025-10-22 13:38:26', 1, 'Chrome Browser / web', '58.10.153.17', '2025-09-22 13:38:26', '2025-09-22 13:40:59'),
(331, 8, 'refresh', 'rDwIFxa1wBB60OVf8Jgb2h3DEny6l-3JvJjbMydW4DA=', '2025-10-22 13:40:32', 1, 'Chrome Browser / web', '58.10.72.179', '2025-09-22 13:40:32', '2025-09-22 13:40:35'),
(332, 8, 'refresh', 'dF1kQvHfF6DbTQFT1nJnn4GvWMyXNAea9vrKETgqR3A=', '2025-10-22 13:40:36', 0, 'Chrome Browser / web', '58.10.72.179', '2025-09-22 13:40:36', '2025-09-22 13:40:36'),
(333, 13, 'refresh', 'DHXBZqxrcOpofAqw14ShqjR9UOi_ZUyVCXA6aOnq7oY=', '2025-10-22 13:41:06', 0, 'Chrome Browser / web', '58.10.153.17', '2025-09-22 13:41:06', '2025-09-22 13:41:06'),
(334, 8, 'refresh', '03wFn0LcizTg7HiyfBy6L5t1ajAJDfNFpDCnbbm-Em4=', '2025-10-22 16:50:30', 0, 'Chrome Browser / web', '58.10.72.179', '2025-09-22 16:50:30', '2025-09-22 16:50:30'),
(335, 8, 'refresh', '2lgt6EiY8ScIjnnt4DZgHotHqmhWIeCzESurlOTXwJM=', '2025-10-22 21:42:30', 0, 'Chrome Browser / web', '58.10.72.179', '2025-09-22 21:42:30', '2025-09-22 21:42:30'),
(336, 7, 'refresh', '1EUKHjcd906Flmi_0FgWKEVlcArl-nKmroUDtRARL74=', '2025-10-23 10:01:14', 1, 'Chrome Browser / web', '58.10.153.17', '2025-09-23 10:01:14', '2025-09-23 10:35:17'),
(337, 8, 'refresh', 'ub9jBsGbQcWdk0-ZCWkWWSvHFSbrniSCF8BAbTufyI4=', '2025-10-23 10:30:23', 0, 'Chrome Browser / web', '58.10.72.179', '2025-09-23 10:30:23', '2025-09-23 10:30:23'),
(338, 8, 'refresh', 'KIKq0jAykx5l2RCF71F7hljtue-nUHnLQAH_IdPs7QM=', '2025-10-23 10:35:23', 0, 'Chrome Browser / web', '58.10.153.17', '2025-09-23 10:35:23', '2025-09-23 10:35:23'),
(339, 8, 'refresh', '4Zz33OixEJ3b9IGES0MvdwDYz4aMDe5oqnkp4RKaPig=', '2025-10-23 12:42:16', 0, 'Chrome Browser / web', '58.10.153.17', '2025-09-23 12:42:16', '2025-09-23 12:42:16'),
(340, 8, 'refresh', 'CYZS0XH-Adr3T508PQKq-IhQC1ANEGVL0ZaQdh-7oKk=', '2025-10-23 15:01:24', 0, 'Chrome Browser / web', '58.10.72.179', '2025-09-23 15:01:24', '2025-09-23 15:01:24'),
(341, 13, 'refresh', 'b33Rb9N5COPrOogyiDGC75BOkS2yNpUbbHhCr8hEbAQ=', '2025-10-24 09:21:53', 1, 'Chrome Browser / web', '58.11.71.191', '2025-09-24 09:21:53', '2025-09-24 11:37:38'),
(342, 7, 'refresh', 'aC6e-g89libDbbrq8eFy6gL20zx90UkuDKD25Erv97w=', '2025-10-24 11:37:49', 0, 'Chrome Browser / web', '58.11.71.191', '2025-09-24 11:37:49', '2025-09-24 11:37:49'),
(343, 8, 'refresh', '8_yitHn0M2V_SQNiueu-nHiDt0JpGc7pJi5zTN8yqGY=', '2025-10-24 11:56:42', 0, 'Chrome Browser / web', '58.10.72.179', '2025-09-24 11:56:42', '2025-09-24 11:56:42');

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
  MODIFY `log_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=272;

--
-- AUTO_INCREMENT for table `document_types`
--
ALTER TABLE `document_types`
  MODIFY `document_type_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `file_uploads`
--
ALTER TABLE `file_uploads`
  MODIFY `file_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=224;

--
-- AUTO_INCREMENT for table `fund_application_details`
--
ALTER TABLE `fund_application_details`
  MODIFY `detail_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

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
  MODIFY `notification_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=83;

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
  MODIFY `detail_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=77;

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
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `subcategory_budgets`
--
ALTER TABLE `subcategory_budgets`
  MODIFY `subcategory_budget_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=38;

--
-- AUTO_INCREMENT for table `submissions`
--
ALTER TABLE `submissions`
  MODIFY `submission_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=112;

--
-- AUTO_INCREMENT for table `submission_documents`
--
ALTER TABLE `submission_documents`
  MODIFY `document_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=224;

--
-- AUTO_INCREMENT for table `submission_reviews`
--
ALTER TABLE `submission_reviews`
  MODIFY `review_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `submission_status_history`
--
ALTER TABLE `submission_status_history`
  MODIFY `history_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `submission_users`
--
ALTER TABLE `submission_users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=158;

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
  MODIFY `session_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=344;

--
-- AUTO_INCREMENT for table `user_tokens`
--
ALTER TABLE `user_tokens`
  MODIFY `token_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=344;

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
