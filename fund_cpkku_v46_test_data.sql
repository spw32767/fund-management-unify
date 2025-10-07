-- phpMyAdmin SQL Dump
-- version 4.9.5deb2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: 07 ต.ค. 2025 เมื่อ 05:28 PM
-- เวอร์ชันของเซิร์ฟเวอร์: 11.1.6-MariaDB-ubu2004
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
-- โครงสร้างตาราง `announcements`
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
-- dump ตาราง `announcements`
--

INSERT INTO `announcements` (`announcement_id`, `title`, `description`, `file_name`, `file_path`, `file_size`, `mime_type`, `announcement_type`, `announcement_reference_number`, `priority`, `display_order`, `status`, `published_at`, `expired_at`, `year_id`, `created_by`, `create_at`, `update_at`, `delete_at`) VALUES
(1, 'ประกาศเปิดรับสมัครทุนส่งเสริมการวิจัย ประจำปี 2568', 'กองทุนส่งเสริมการวิจัยและนวัตกรรม เปิดรับสมัครทุนส่งเสริมการวิจัย ประจำปี 2568 กองทุนส่งเสริมการวิจัยและนวัตกรรม เปิดรับสมัครทุนส่งเสริมการวิจัย ประจำปี 2568 กองทุนส่งเสริมการวิจัยและนวัตกรรม เปิดรับสมัครทุนส่งเสริมการวิจัย ประจำปี 2568', 'ประกาศทุนวิจัย2568.pdf', 'http://147.50.230.213:8080/uploads/announcements/1.%201574-68%20หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย%20นวัตกรรม%20และบริการวิชาการ%20(2568).pdf', 1024000, 'application/pdf', 'research_fund', NULL, 'high', 3, 'active', '2025-01-15 09:00:00', '2025-09-20 13:35:00', 3, 1, '2025-08-20 11:40:31', '2025-10-04 22:39:32', NULL),
(2, 'แนวทางการเขียนข้อเสนอโครงการวิจัย', 'เอกสารแนวทางและข้อแนะนำสำหรับการเขียนข้อเสนอโครงการวิจัย', 'แนวทางการเขียนข้อเสนอโครงการ.pdf', 'uploads/announcements/2025/09/test_20250919_151900.pdf', 2048000, 'application/pdf', 'general', NULL, 'normal', 5, 'active', '2025-01-10 10:00:00', NULL, 2, 1, '2025-08-20 11:40:31', '2025-09-21 11:54:44', NULL),
(3, 'ประกาศเปิดรับสมัครทุนอุดหนุนกิจกรรม ไตรมาส 1/2568', 'เปิดรับสมัครทุนอุดหนุนกิจกรรมประจำไตรมาส 1 ประจำปี 2568', 'ประกาศทุนกิจกรรมไตรมาส1-2568.pdf', 'http://147.50.230.213:8080/uploads/announcements/1.%201574-68%20หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย%20นวัตกรรม%20และบริการวิชาการ%20(2568).pdf', 800000, 'application/pdf', 'promotion_fund', NULL, 'normal', 1, 'active', '2025-01-05 14:00:00', '2025-09-26 13:23:00', 2, 1, '2025-08-20 11:40:31', '2025-10-04 22:39:29', NULL),
(4, 'หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย นวัตกรรม และบริการวิชาการ วิทยาลัยการคอมพิวเตอร์ (2568)', 'ประกาศหลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย นวัตกรรม และบริการวิชาการ วิทยาลัยการคอมพิวเตอร์ให้เป็นไปตามประกาศมหาวิทยาลัยขอนแก่น (ฉบับที่ 2200/2564) ลงวันที่ 27 ตุลาคม พ.ศ. 2564 เรื่อง กองทุนวิจัย นวัตกรรม และบริการวิชาการ วิทยาลัยการคอมพิวเตอร์และเพื่อส่งเสริม สนับสนุนศักยภาพด้านการวิจัย นวัตกรรม และบริการวิชาการ อันเป็นการพัฒนาขีดความสามารถในการแข่งขัน และยกระดับความเป็นเลิศด้านวิชาการ\r\n', '1. 1574-68 หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย นวัตกรรม และบริการวิชาการ (2568).pdf', 'http://147.50.230.213:8080/uploads/announcements/1.%201574-68%20หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย%20นวัตกรรม%20และบริการวิชาการ%20(2568).pdf', 444470, 'application/pdf', 'general', '1574/2568', 'urgent', 4, 'active', NULL, NULL, 3, 7, '2025-09-17 12:26:09', '2025-09-21 11:54:44', NULL),
(6, 'aswd', 'asd', 'sample.pdf', 'uploads/announcements/2025/09/aswd_20250919_151819.pdf', 18810, 'application/pdf', 'general', NULL, 'normal', NULL, 'active', '2025-09-16 15:18:00', '2025-09-26 15:18:00', 3, 7, '2025-09-19 15:18:19', '2025-09-19 15:18:19', '2025-09-19 15:18:29'),
(7, 'test', 'asd', 'sample-local-pdf.pdf', 'uploads/announcements/2025/09/test_20250919_151900.pdf', 49672, 'application/pdf', 'general', NULL, 'normal', 6, 'active', '2025-09-17 15:18:00', '2025-09-25 15:18:00', 2, 7, '2025-09-19 15:19:00', '2025-09-21 11:54:44', NULL),
(8, 'das', 'asd', 'sample.pdf', 'uploads/announcements/sample.pdf', 18810, 'application/pdf', 'general', NULL, 'normal', 2, 'active', NULL, NULL, NULL, 7, '2025-09-19 15:34:30', '2025-10-04 22:38:07', NULL);

-- --------------------------------------------------------

--
-- โครงสร้างตาราง `announcement_assignments`
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

--
-- dump ตาราง `announcement_assignments`
--

INSERT INTO `announcement_assignments` (`assignment_id`, `slot_code`, `announcement_id`, `start_date`, `end_date`, `changed_by`, `changed_at`) VALUES
(1, 'main', 3, '2025-10-04 22:17:00', '2025-10-30 21:17:00', NULL, '2025-10-04 22:17:37'),
(2, 'reward', 2, '2025-10-05 22:47:00', '2025-10-29 21:47:00', NULL, '2025-10-04 22:47:29'),
(3, 'activity_support', 4, '2025-10-03 00:33:00', '2025-10-30 23:33:00', NULL, '2025-10-05 00:33:53'),
(4, 'conference', 1, '2025-10-05 00:46:00', '2025-10-31 23:46:00', 7, '2025-10-05 00:46:28');

-- --------------------------------------------------------

--
-- โครงสร้างตาราง `application_status`
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
-- dump ตาราง `application_status`
--

INSERT INTO `application_status` (`application_status_id`, `status_code`, `status_name`, `create_at`, `update_at`, `delete_at`) VALUES
(1, '0', 'อยู่ระหว่างการพิจารณา', '2025-06-24 16:49:13', '2025-09-25 17:28:18', NULL),
(2, '1', 'อนุมัติ', '2025-06-24 16:49:13', '2025-09-25 17:28:20', NULL),
(3, '2', 'ปฏิเสธ', '2025-06-24 16:49:13', '2025-09-25 17:28:21', NULL),
(4, '3', 'ต้องการข้อมูลเพิ่มเติม', '2025-08-12 15:50:00', '2025-09-25 17:28:23', NULL),
(5, '4', 'ร่าง', '2025-08-12 15:50:22', '2025-09-25 17:28:24', NULL),
(6, '5', 'อยู่ระหว่างการพิจารณาจากหัวหน้าสาขา', '2025-08-12 15:50:22', '2025-09-25 17:28:26', NULL),
(7, '6', 'ปิดทุน', '2025-10-05 14:48:54', '2025-10-05 14:48:54', NULL);

-- --------------------------------------------------------

--
-- โครงสร้างตาราง `audit_logs`
--

CREATE TABLE `audit_logs` (
  `log_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `action` enum('create','update','delete','login','logout','view','download','approve','reject','submit','review') NOT NULL,
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
-- dump ตาราง `audit_logs`
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
(357, 13, 'update', 'submission', 136, 'PR-25681003-0014', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-04 14:57:40'),
(358, 13, 'review', 'submission', 136, 'PR-25681003-0014', NULL, NULL, NULL, '27.145.211.4', NULL, 'Department head recommended submission', '2025-10-04 14:57:40'),
(359, 13, 'update', 'submission', 135, 'FA-25681002-0007', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-05 14:36:00'),
(360, 13, 'review', 'submission', 135, 'FA-25681002-0007', NULL, NULL, NULL, '58.10.72.49', NULL, 'YES APRROVE', '2025-10-05 14:36:00'),
(361, 13, 'update', 'submission', 129, 'PR-25681002-0013', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-05 15:00:21'),
(362, 13, 'review', 'submission', 129, 'PR-25681002-0013', NULL, NULL, NULL, '27.145.211.4', NULL, 'ผ่าน1', '2025-10-05 15:00:21'),
(363, 13, 'reject', 'submission', 128, 'PR-25681002-0012', NULL, NULL, 'status', NULL, NULL, 'reject submission', '2025-10-05 15:00:46'),
(364, 13, 'reject', 'submission', 128, 'PR-25681002-0012', NULL, NULL, NULL, '27.145.211.4', NULL, 'ข้อมูลหาย', '2025-10-05 15:00:46'),
(365, 13, 'update', 'submission', 121, 'FA-25680926-0001', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-05 15:09:05'),
(366, 13, 'review', 'submission', 121, 'FA-25680926-0001', NULL, NULL, NULL, '27.145.211.4', NULL, 'FA ผ่าน', '2025-10-05 15:09:05'),
(367, 8, 'update', 'submission', 131, 'FA-25681002-0003', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-05 15:10:42'),
(368, 13, 'reject', 'submission', 131, 'FA-25681002-0003', NULL, NULL, 'status', NULL, NULL, 'reject submission', '2025-10-05 15:11:04'),
(369, 13, 'reject', 'submission', 131, 'FA-25681002-0003', NULL, NULL, NULL, '27.145.211.4', NULL, 'ข้อมูลไม่ครบ', '2025-10-05 15:11:04'),
(370, 13, 'update', 'submission', 118, 'PR-25680925-0003', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-05 15:54:59'),
(371, 13, 'update', 'submission', 119, 'PR-25680925-0004', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-05 15:55:14'),
(372, 13, 'update', 'submission', 120, 'PR-25680925-0005', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-05 15:55:17'),
(373, 8, 'update', 'submission', 122, 'PR-25680926-0006', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-05 15:55:21'),
(374, 8, 'update', 'submission', 123, 'PR-25680930-0007', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-05 15:55:23'),
(375, 8, 'update', 'submission', 124, 'PR-25681001-0008', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-05 15:55:29'),
(376, 8, 'update', 'submission', 125, 'PR-25681001-0009', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-05 15:55:33'),
(377, 8, 'update', 'submission', 132, 'FA-25681002-0004', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-05 15:55:47'),
(378, 8, 'update', 'submission', 133, 'FA-25681002-0005', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-05 15:55:51'),
(379, 8, 'create', 'submission', 137, 'PR-2568-0015', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-05 15:56:14'),
(380, 8, 'submit', 'submission', 137, 'PR-2568-0015', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-05 15:56:14'),
(381, 13, 'update', 'submission', 133, 'FA-25681002-0005', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-05 15:56:19'),
(382, 13, 'review', 'submission', 133, 'FA-25681002-0005', NULL, NULL, NULL, '27.145.211.4', NULL, 'FA APPROVE', '2025-10-05 15:56:19'),
(383, 8, 'reject', 'submission', 132, 'FA-25681002-0004', NULL, NULL, 'status', NULL, NULL, 'reject submission', '2025-10-05 15:57:32'),
(384, 13, 'review', 'submission', 132, 'FA-25681002-0004', NULL, NULL, NULL, '27.145.211.4', NULL, 'Department head rejected submission', '2025-10-05 15:57:32'),
(385, 8, 'create', 'submission', 138, 'PR-2568-0016', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-05 15:58:15'),
(386, 8, 'submit', 'submission', 138, 'PR-2568-0016', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-05 15:58:15'),
(387, 8, 'update', 'submission', 132, 'FA-25681002-0004', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-05 15:59:13'),
(388, 8, 'update', 'submission', 132, 'FA-25681002-0004', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-05 15:59:17'),
(389, 8, 'reject', 'submission', 132, 'FA-25681002-0004', NULL, NULL, 'status', NULL, NULL, 'reject submission', '2025-10-05 15:59:38'),
(390, 13, 'review', 'submission', 132, 'FA-25681002-0004', NULL, NULL, NULL, '27.145.211.4', NULL, 'Department head rejected submission', '2025-10-05 15:59:38'),
(391, 8, 'create', 'submission', 139, 'PR-2568-0017', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-05 15:59:47'),
(392, 8, 'submit', 'submission', 139, 'PR-2568-0017', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-05 15:59:47'),
(393, 13, 'update', 'submission', 126, 'PR-25681002-0010', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-05 16:00:36'),
(394, 13, 'review', 'submission', 126, 'PR-25681002-0010', NULL, NULL, NULL, '27.145.211.4', NULL, 'PR APPROVE', '2025-10-05 16:00:36'),
(395, 8, 'create', 'submission', 140, 'PR-2568-0018', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-05 16:00:48'),
(396, 8, 'submit', 'submission', 140, 'PR-2568-0018', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-05 16:00:48'),
(397, 8, 'reject', 'submission', 127, 'PR-25681002-0011', NULL, NULL, 'status', NULL, NULL, 'reject submission', '2025-10-05 16:00:49'),
(398, 13, 'review', 'submission', 127, 'PR-25681002-0011', NULL, NULL, NULL, '27.145.211.4', NULL, 'Department head rejected submission', '2025-10-05 16:00:49'),
(399, 8, 'create', 'submission', 141, 'PR-2568-0019', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-05 16:01:57'),
(400, 8, 'submit', 'submission', 141, 'PR-2568-0019', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-05 16:01:57'),
(401, 8, 'create', 'submission', 142, 'PR-2568-0020', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-05 17:08:25'),
(402, 8, 'submit', 'submission', 142, 'PR-2568-0020', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-05 17:08:25'),
(403, 8, 'create', 'submission', 143, 'PR-2568-0021', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-05 17:21:26'),
(404, 8, 'submit', 'submission', 143, 'PR-2568-0021', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-05 17:21:26'),
(405, 8, 'create', 'submission', 144, 'PR-2568-0022', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-05 17:30:59'),
(406, 8, 'submit', 'submission', 144, 'PR-2568-0022', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-05 17:30:59'),
(407, 8, 'create', 'submission', 145, 'PR-2568-0023', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-05 17:33:24'),
(408, 8, 'submit', 'submission', 145, 'PR-2568-0023', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-05 17:33:25'),
(409, 8, 'create', 'submission', 146, 'PR-2568-0024', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-05 17:34:12'),
(410, 8, 'submit', 'submission', 146, 'PR-2568-0024', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-05 17:34:12'),
(411, 8, 'create', 'submission', 147, 'PR-2568-0025', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-05 17:41:26'),
(412, 8, 'submit', 'submission', 147, 'PR-2568-0025', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-05 17:41:26'),
(413, 8, 'create', 'submission', 148, 'PR-2568-0026', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-05 17:50:36'),
(414, 8, 'submit', 'submission', 148, 'PR-2568-0026', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-05 17:50:36'),
(415, 8, 'create', 'submission', 149, 'PR-2568-0027', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-05 18:03:19'),
(416, 8, 'submit', 'submission', 149, 'PR-2568-0027', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-05 18:03:19'),
(417, 8, 'create', 'submission', 150, 'PR-2568-0028', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-05 18:04:30'),
(418, 8, 'submit', 'submission', 150, 'PR-2568-0028', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-05 18:04:30'),
(419, 8, 'create', 'submission', 151, 'PR-2568-0029', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-05 18:05:24'),
(420, 8, 'submit', 'submission', 151, 'PR-2568-0029', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-05 18:05:24'),
(421, 8, 'create', 'submission', 152, 'PR-2568-0030', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-05 18:06:18'),
(422, 8, 'submit', 'submission', 152, 'PR-2568-0030', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-05 18:06:18'),
(423, 8, 'create', 'submission', 153, 'PR-2568-0031', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-05 18:15:55'),
(424, 8, 'submit', 'submission', 153, 'PR-2568-0031', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-05 18:15:55'),
(425, 8, 'create', 'submission', 154, 'PR-2568-0032', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-05 18:17:03'),
(426, 8, 'submit', 'submission', 154, 'PR-2568-0032', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-05 18:17:03'),
(427, 8, 'create', 'submission', 155, 'PR-2568-0033', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-05 18:25:41'),
(428, 8, 'submit', 'submission', 155, 'PR-2568-0033', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-05 18:25:41'),
(429, 8, 'create', 'submission', 156, 'PR-2568-0034', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-05 18:26:50'),
(430, 8, 'submit', 'submission', 156, 'PR-2568-0034', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-05 18:26:50'),
(431, 8, 'create', 'submission', 157, 'PR-2568-0035', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-05 18:28:42'),
(432, 8, 'submit', 'submission', 157, 'PR-2568-0035', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-05 18:28:42'),
(433, 8, 'update', 'submission', 140, 'PR-2568-0018', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-05 19:25:37'),
(434, 8, 'update', 'submission', 139, 'PR-2568-0017', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-05 19:26:01'),
(435, 8, 'approve', 'submission', 140, 'PR-2568-0018', NULL, NULL, 'status', NULL, NULL, 'approve submission', '2025-10-05 19:27:34'),
(436, 8, 'update', 'submission', 140, 'PR-2568-0018', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-05 19:27:38'),
(437, 8, 'update', 'submission', 139, 'PR-2568-0017', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-05 19:27:54'),
(438, 8, 'update', 'submission', 140, 'PR-2568-0018', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-05 19:27:56'),
(439, 8, 'update', 'submission', 157, 'PR-2568-0035', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-05 19:28:21'),
(440, 7, 'approve', 'submission', 133, 'FA-25681002-0005', NULL, NULL, 'status', NULL, NULL, 'approve submission', '2025-10-05 20:15:31'),
(441, 7, 'approve', 'submission', 135, 'FA-25681002-0007', NULL, NULL, 'status', NULL, NULL, 'approve submission', '2025-10-05 20:19:12'),
(443, 7, 'approve', 'submission', 130, 'FA-25681002-0002', NULL, NULL, 'status', NULL, NULL, 'approve submission', '2025-10-05 20:51:37'),
(445, 7, 'update', 'submission', 130, 'FA-25681002-0002', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-06 16:06:53'),
(446, 7, 'reject', 'submission', 130, 'FA-25681002-0002', NULL, NULL, 'status', NULL, NULL, 'reject submission', '2025-10-06 16:19:32'),
(447, 7, 'approve', 'submission', 130, 'FA-25681002-0002', NULL, NULL, 'status', NULL, NULL, 'approve submission', '2025-10-06 16:20:04'),
(448, 7, 'update', 'submission', 130, 'FA-25681002-0002', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-06 16:29:49'),
(449, 7, 'approve', 'submission', 130, 'FA-25681002-0002', NULL, NULL, 'status', NULL, NULL, 'approve submission', '2025-10-06 16:30:07'),
(450, 7, 'update', 'submission', 130, 'FA-25681002-0002', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-06 17:23:35'),
(451, 7, 'approve', 'submission', 130, 'FA-25681002-0002', NULL, NULL, 'status', NULL, NULL, 'approve submission', '2025-10-06 17:24:35'),
(452, 7, 'update', 'submission', 130, 'FA-25681002-0002', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-06 17:24:54'),
(453, 7, 'approve', 'submission', 130, 'FA-25681002-0002', NULL, NULL, 'status', NULL, NULL, 'approve submission', '2025-10-06 18:27:13'),
(454, 7, 'update', 'submission', 130, 'FA-25681002-0002', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-06 20:06:53'),
(455, 7, 'approve', 'submission', 130, 'FA-25681002-0002', NULL, NULL, 'status', NULL, NULL, 'approve submission', '2025-10-06 20:07:00'),
(456, 7, 'update', 'submission', 130, 'FA-25681002-0002', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-06 22:05:18'),
(457, 7, 'approve', 'submission', 130, 'FA-25681002-0002', NULL, NULL, 'status', NULL, NULL, 'approve submission', '2025-10-06 22:31:59'),
(458, 7, 'update', 'submission', 130, 'FA-25681002-0002', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-06 22:34:24'),
(459, 13, 'update', 'submission', 156, 'PR-2568-0034', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-06 22:50:09'),
(460, 13, 'review', 'submission', 156, 'PR-2568-0034', NULL, NULL, NULL, '58.10.78.71', NULL, 'test comment', '2025-10-06 22:50:09'),
(461, 8, 'reject', 'submission', 155, 'PR-2568-0033', NULL, NULL, 'status', NULL, NULL, 'reject submission', '2025-10-06 23:02:30'),
(462, 13, 'review', 'submission', 155, 'PR-2568-0033', NULL, NULL, NULL, '58.10.78.71', NULL, 'Department head rejected submission', '2025-10-06 23:02:30'),
(467, 13, 'update', 'submission', 154, 'PR-2568-0032', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-07 12:44:35'),
(468, 13, 'review', 'submission', 154, 'PR-2568-0032', NULL, NULL, NULL, '202.28.118.117', NULL, 'test comment', '2025-10-07 12:44:35'),
(469, 8, 'create', 'submission', 158, 'PR-2568-0036', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-07 13:01:57'),
(470, 13, 'update', 'submission', 153, 'PR-2568-0031', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-07 13:05:19'),
(471, 13, 'review', 'submission', 153, 'PR-2568-0031', NULL, NULL, NULL, '202.28.118.117', NULL, 'test comment', '2025-10-07 13:05:19'),
(472, 7, 'approve', 'submission', 153, 'PR-2568-0031', NULL, NULL, 'status', NULL, NULL, 'approve submission', '2025-10-07 13:10:34'),
(473, 8, 'create', 'submission', 159, 'PR-2568-0037', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-07 13:28:28'),
(474, 8, 'create', 'submission', 160, 'PR-2568-0038', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-07 13:43:11'),
(475, 8, 'create', 'submission', 161, 'PR-2568-0039', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-07 13:50:18'),
(476, 8, 'create', 'submission', 162, 'PR-2568-0040', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-07 14:00:41'),
(477, 8, 'submit', 'submission', 162, 'PR-2568-0040', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-07 14:00:42'),
(478, 13, 'update', 'submission', 162, 'PR-2568-0040', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-07 14:04:38'),
(479, 13, 'review', 'submission', 162, 'PR-2568-0040', NULL, NULL, NULL, '202.28.118.117', NULL, 'Test', '2025-10-07 14:04:37'),
(480, 8, 'create', 'submission', 163, 'PR-2568-0041', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-07 14:23:19'),
(481, 8, 'submit', 'submission', 163, 'PR-2568-0041', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-07 14:33:37'),
(482, 8, 'create', 'submission', 164, 'PR-2568-0042', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-07 14:57:02'),
(483, 8, 'submit', 'submission', 164, 'PR-2568-0042', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-07 14:57:03'),
(484, 8, 'create', 'submission', 165, 'PR-2568-0043', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-07 15:08:07'),
(485, 8, 'submit', 'submission', 165, 'PR-2568-0043', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-07 15:08:09'),
(486, 8, 'create', 'submission', 166, 'PR-2568-0044', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-07 15:45:13'),
(487, 8, 'submit', 'submission', 166, 'PR-2568-0044', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-07 15:45:14'),
(488, 13, 'update', 'submission', 166, 'PR-2568-0044', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-07 15:59:49'),
(489, 13, 'review', 'submission', 166, 'PR-2568-0044', NULL, NULL, NULL, '202.28.118.117', NULL, 'comment', '2025-10-07 15:59:49');

-- --------------------------------------------------------

--
-- โครงสร้างตาราง `dept_head_assignments`
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
-- dump ตาราง `dept_head_assignments`
--

INSERT INTO `dept_head_assignments` (`assignment_id`, `head_user_id`, `restore_role_id`, `effective_from`, `effective_to`, `changed_by`, `changed_at`, `note`) VALUES
(1, 13, 1, '2025-09-26 21:27:00', '2025-09-27 05:19:00', NULL, '2025-09-26 21:27:22', NULL),
(2, 12, 1, '2025-09-27 05:19:00', '2025-09-27 05:55:00', NULL, '2025-09-27 05:25:59', NULL),
(3, 13, 1, '2025-09-27 05:55:00', '2025-10-04 01:29:00', 7, '2025-10-04 23:30:02', NULL),
(4, 13, 1, '2025-10-05 00:59:08', '2025-10-05 00:59:23', NULL, '2025-10-05 00:59:08', NULL),
(5, 8, 1, '2025-10-05 00:59:23', '2025-10-05 00:59:47', NULL, '2025-10-05 00:59:23', NULL),
(6, 13, 1, '2025-10-05 00:59:47', '2025-10-05 01:11:00', 7, '2025-10-05 01:11:53', NULL),
(7, 9, 1, '2025-10-05 01:11:00', '2025-10-05 01:30:00', 7, '2025-10-04 23:30:13', NULL),
(8, 13, 1, '2025-10-05 01:12:00', '2025-10-05 01:30:00', 7, '2025-10-04 23:30:13', NULL),
(9, 8, 1, '2025-10-05 01:16:00', '2025-10-05 01:30:00', 7, '2025-10-04 23:30:13', NULL),
(10, 8, 4, '2025-10-04 01:29:00', '2025-10-04 01:30:00', 7, '2025-10-04 23:30:49', NULL),
(11, 13, 1, '2025-10-05 01:30:00', '2025-10-05 01:35:00', 7, '2025-10-04 23:36:16', NULL),
(12, 13, 1, '2025-10-04 01:30:00', '2025-10-04 01:35:00', 7, '2025-10-04 23:36:42', NULL),
(13, 8, 1, '2025-10-05 01:35:00', '2025-10-05 01:37:06', 7, '2025-10-04 23:38:06', NULL),
(14, 8, 4, '2025-10-04 01:35:00', '2025-10-05 01:37:06', 7, '2025-10-04 23:38:06', NULL),
(15, 13, 1, '2025-10-05 01:37:06', '2025-11-01 00:38:00', 7, '2025-10-04 23:38:06', NULL);

-- --------------------------------------------------------

--
-- โครงสร้างตาราง `document_types`
--

CREATE TABLE `document_types` (
  `document_type_id` int(11) NOT NULL,
  `document_type_name` varchar(255) DEFAULT NULL,
  `code` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `category` varchar(50) DEFAULT 'general' COMMENT 'ไม่ได้ใช้',
  `required` tinyint(1) DEFAULT 0,
  `multiple` tinyint(1) DEFAULT 0,
  `document_order` int(11) DEFAULT 0,
  `is_required` enum('yes','no') DEFAULT NULL,
  `create_at` datetime DEFAULT current_timestamp(),
  `update_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `delete_at` datetime DEFAULT NULL,
  `fund_types` longtext DEFAULT NULL COMMENT 'ประเภททุนที่ใช้ได้ ["publication_reward", "fund_application"]' CHECK (json_valid(`fund_types`)),
  `subcategory_ids` longtext DEFAULT NULL COMMENT 'รหัส subcategory เฉพาะ [1,2,3] หรือ NULL = ทุก subcategory' CHECK (json_valid(`subcategory_ids`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- dump ตาราง `document_types`
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
(13, 'โครงการวิจัย', 'research_proposal', 'general', 0, 0, 0, NULL, '2025-08-29 13:31:42', '2025-10-02 14:54:58', NULL, '[\"fund_application\"]', '[1,2,3]'),
(14, 'งบประมาณ', 'budget_plan', 'general', 0, 0, 0, NULL, '2025-08-29 13:31:42', '2025-10-02 14:55:00', NULL, '[\"fund_application\"]', '[4,5,6]'),
(15, 'CV ผู้วิจัย', 'researcher_cv', 'general', 0, 0, 0, NULL, '2025-08-29 13:31:42', '2025-08-29 13:31:42', NULL, '[\"fund_application\"]', NULL),
(16, 'แบบฟอร์มคำขอรับเงินรางวัล (DOCX)', 'publication_reward_form_docx', 'publication_reward', 0, 0, 0, NULL, '2025-09-30 13:41:38', '2025-09-30 13:41:38', NULL, '[\"publication_reward\"]', NULL),
(20, 'แบบฟอร์มคำขอรับเงินรางวัล (หัวหน้าภาคลงนาม DOCX)', 'publication_reward_form_head_signed_docx', 'publication_reward', 0, 1, 0, NULL, '2025-10-07 12:44:35', '2025-10-07 12:44:35', NULL, '[\"publication_reward\"]', NULL);

-- --------------------------------------------------------

--
-- โครงสร้างตาราง `file_uploads`
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
-- dump ตาราง `file_uploads`
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
(258, 'PR-25681002-0010_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub126_2025-10-02/PR-25681002-0010_publication_reward_form.docx', 'temp', NULL, 25808, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-02 00:33:52', '2025-10-02 00:33:52', '2025-10-02 00:33:52', NULL),
(259, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub127_2025-10-02/sample-local-pdf_PR-25681002-0011.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-10-02 12:12:36', '2025-10-02 12:12:36', '2025-10-02 12:12:36', NULL),
(260, 'form.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub127_2025-10-02/form_PR-25681002-0011.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-02 12:12:36', '2025-10-02 12:12:36', '2025-10-02 12:12:36', NULL),
(261, 'PR-25681002-0011_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub127_2025-10-02/PR-25681002-0011_publication_reward_form.docx', 'temp', NULL, 25729, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-02 12:12:36', '2025-10-02 12:12:36', '2025-10-02 12:12:36', NULL),
(262, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub128_2025-10-02/sample-local-pdf_PR-25681002-0012.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-10-02 12:21:39', '2025-10-02 12:21:39', '2025-10-02 12:21:39', NULL),
(263, 'form.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub128_2025-10-02/form_PR-25681002-0012.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-02 12:21:39', '2025-10-02 12:21:39', '2025-10-02 12:21:39', NULL),
(264, 'PR-25681002-0012_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub128_2025-10-02/PR-25681002-0012_publication_reward_form.docx', 'temp', NULL, 25753, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-02 12:21:39', '2025-10-02 12:21:39', '2025-10-02 12:21:39', NULL),
(265, 'form.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub129_2025-10-02/form_PR-25681002-0013.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-02 12:40:26', '2025-10-02 12:40:26', '2025-10-02 12:40:26', NULL),
(266, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub129_2025-10-02/sample-local-pdf_PR-25681002-0013.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 8, '2025-10-02 12:40:26', '2025-10-02 12:40:26', '2025-10-02 12:40:26', NULL),
(267, 'PR-25681002-0013_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจด/submissions/pub129_2025-10-02/PR-25681002-0013_publication_reward_form.docx', 'temp', NULL, 25816, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-02 12:40:26', '2025-10-02 12:40:26', '2025-10-02 12:40:26', NULL),
(268, 'form.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund130_2025-10-02/form_FA-25681002-0002.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-02 14:11:19', '2025-10-02 14:11:19', '2025-10-02 14:11:19', NULL),
(269, 'form.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund130_2025-10-02/form_FA-25681002-0002_1.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-02 14:11:19', '2025-10-02 14:11:19', '2025-10-02 14:11:19', NULL),
(270, 'form.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund130_2025-10-02/form_FA-25681002-0002_3.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-02 14:11:19', '2025-10-02 14:11:19', '2025-10-02 14:11:19', NULL),
(271, 'form.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund130_2025-10-02/form_FA-25681002-0002_2.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-02 14:11:19', '2025-10-02 14:11:19', '2025-10-02 14:11:19', NULL),
(272, 'form_sample.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund131_2025-10-02/form_sample_FA-25681002-0003.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-02 14:40:48', '2025-10-02 14:40:48', '2025-10-02 14:40:48', NULL),
(273, 'form.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund131_2025-10-02/form_FA-25681002-0003_1.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-02 14:40:48', '2025-10-02 14:40:48', '2025-10-02 14:40:48', NULL),
(274, 'form.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund131_2025-10-02/form_FA-25681002-0003.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-02 14:40:48', '2025-10-02 14:40:48', '2025-10-02 14:40:48', NULL),
(275, 'form_sample.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund131_2025-10-02/form_sample_FA-25681002-0003_1.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-02 14:40:48', '2025-10-02 14:40:48', '2025-10-02 14:40:48', NULL),
(276, 'form_sample.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund132_2025-10-02/form_sample_FA-25681002-0004.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-02 14:55:31', '2025-10-02 14:55:31', '2025-10-02 14:55:31', NULL),
(277, 'form_sample.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund132_2025-10-02/form_sample_FA-25681002-0004_2.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-02 14:55:31', '2025-10-02 14:55:31', '2025-10-02 14:55:31', NULL),
(278, 'form_sample.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund132_2025-10-02/form_sample_FA-25681002-0004_1.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-02 14:55:31', '2025-10-02 14:55:31', '2025-10-02 14:55:31', NULL),
(279, 'form_sample.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund133_2025-10-02/form_sample_FA-25681002-0005.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-02 15:11:00', '2025-10-02 15:11:00', '2025-10-02 15:11:00', NULL),
(280, 'form_sample.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund133_2025-10-02/form_sample_FA-25681002-0005_2.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-02 15:11:00', '2025-10-02 15:11:00', '2025-10-02 15:11:00', NULL),
(281, 'form_sample.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund133_2025-10-02/form_sample_FA-25681002-0005_1.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-02 15:11:00', '2025-10-02 15:11:00', '2025-10-02 15:11:00', NULL),
(282, 'form_sample.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund134_2025-10-02/form_sample_FA-25681002-0006_2.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-02 15:26:43', '2025-10-02 15:26:43', '2025-10-02 15:26:43', NULL),
(283, 'form_sample.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund134_2025-10-02/form_sample_FA-25681002-0006_1.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-02 15:26:43', '2025-10-02 15:26:43', '2025-10-02 15:26:43', NULL),
(284, 'form_sample.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund134_2025-10-02/form_sample_FA-25681002-0006.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-02 15:26:43', '2025-10-02 15:26:43', '2025-10-02 15:26:43', NULL),
(285, 'form_sample.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund135_2025-10-02/form_sample_FA-25681002-0007.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-02 15:42:15', '2025-10-02 15:42:15', '2025-10-02 15:42:15', NULL),
(286, 'form_sample.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund135_2025-10-02/form_sample_FA-25681002-0007_2.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-02 15:42:15', '2025-10-02 15:42:15', '2025-10-02 15:42:15', NULL),
(287, 'form_sample.pdf', 'uploads/users/user_8_สมชาย_ใจด/submissions/fund135_2025-10-02/form_sample_FA-25681002-0007_1.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-02 15:42:15', '2025-10-02 15:42:15', '2025-10-02 15:42:15', NULL),
(288, 'sample.pdf', 'uploads/users/user_13_หวหนา_สาขา/submissions/pub136_2025-10-03/sample_PR-25681003-0014.pdf', 'temp', NULL, 18810, 'application/pdf', '', 0, 13, '2025-10-03 15:49:50', '2025-10-03 15:49:50', '2025-10-03 15:49:50', NULL),
(289, 'sample-local-pdf.pdf', 'uploads/users/user_13_หวหนา_สาขา/submissions/pub136_2025-10-03/sample-local-pdf_PR-25681003-0014.pdf', 'temp', NULL, 49672, 'application/pdf', '', 0, 13, '2025-10-03 15:49:50', '2025-10-03 15:49:50', '2025-10-03 15:49:50', NULL),
(290, 'PR-25681003-0014_publication_reward_form.docx', 'uploads/users/user_13_หวหนา_สาขา/submissions/pub136_2025-10-03/PR-25681003-0014_publication_reward_form.docx', 'temp', NULL, 25767, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 13, '2025-10-03 15:49:50', '2025-10-03 15:49:50', '2025-10-03 15:49:50', NULL),
(291, 'form_sample (1).pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub137_2025-10-05/form_sample_1_PR-2568-0015.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-05 15:56:14', '2025-10-05 15:56:14', '2025-10-05 15:56:14', NULL),
(292, 'PR-2568-0015_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub137_2025-10-05/PR-2568-0015_publication_reward_form.docx', 'temp', NULL, 25815, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-05 15:56:14', '2025-10-05 15:56:14', '2025-10-05 15:56:14', NULL),
(293, 'form_sample (1).pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub138_2025-10-05/form_sample_1_PR-2568-0016.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-05 15:58:15', '2025-10-05 15:58:15', '2025-10-05 15:58:15', NULL),
(294, 'PR-2568-0016_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub138_2025-10-05/PR-2568-0016_publication_reward_form.docx', 'temp', NULL, 25756, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-05 15:58:15', '2025-10-05 15:58:15', '2025-10-05 15:58:15', NULL),
(295, 'form_sample (1).pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub139_2025-10-05/form_sample_1_PR-2568-0017.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-05 15:59:47', '2025-10-05 15:59:47', '2025-10-05 15:59:47', NULL),
(296, 'PR-2568-0017_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub139_2025-10-05/PR-2568-0017_publication_reward_form.docx', 'temp', NULL, 25767, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-05 15:59:47', '2025-10-05 15:59:47', '2025-10-05 15:59:47', NULL),
(297, 'form_sample (1).pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub140_2025-10-05/form_sample_1_PR-2568-0018.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-05 16:00:48', '2025-10-05 16:00:48', '2025-10-05 16:00:48', NULL),
(298, 'PR-2568-0018_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub140_2025-10-05/PR-2568-0018_publication_reward_form.docx', 'temp', NULL, 25767, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-05 16:00:48', '2025-10-05 16:00:48', '2025-10-05 16:00:48', NULL),
(299, 'form_sample (1).pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub141_2025-10-05/form_sample_1_PR-2568-0019.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-05 16:01:57', '2025-10-05 16:01:57', '2025-10-05 16:01:57', NULL),
(300, 'PR-2568-0019_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub141_2025-10-05/PR-2568-0019_publication_reward_form.docx', 'temp', NULL, 25786, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-05 16:01:57', '2025-10-05 16:01:57', '2025-10-05 16:01:57', NULL),
(301, 'form_sample (1).pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub142_2025-10-05/form_sample_1_PR-2568-0020.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-05 17:08:25', '2025-10-05 17:08:25', '2025-10-05 17:08:25', NULL),
(302, 'PR-2568-0020_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub142_2025-10-05/PR-2568-0020_publication_reward_form.docx', 'temp', NULL, 25767, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-05 17:08:25', '2025-10-05 17:08:25', '2025-10-05 17:08:25', NULL),
(303, 'form_sample (1).pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub143_2025-10-05/form_sample_1_PR-2568-0021.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-05 17:21:26', '2025-10-05 17:21:26', '2025-10-05 17:21:26', NULL),
(304, 'PR-2568-0021_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub143_2025-10-05/PR-2568-0021_publication_reward_form.docx', 'temp', NULL, 25767, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-05 17:21:26', '2025-10-05 17:21:26', '2025-10-05 17:21:26', NULL),
(305, 'form_sample (1).pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub144_2025-10-05/form_sample_1_PR-2568-0022.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-05 17:30:59', '2025-10-05 17:30:59', '2025-10-05 17:30:59', NULL),
(306, 'PR-2568-0022_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub144_2025-10-05/PR-2568-0022_publication_reward_form.docx', 'temp', NULL, 25767, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-05 17:30:59', '2025-10-05 17:30:59', '2025-10-05 17:30:59', NULL),
(307, 'form_sample (1).pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub145_2025-10-05/form_sample_1_PR-2568-0023.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-05 17:33:25', '2025-10-05 17:33:25', '2025-10-05 17:33:25', NULL),
(308, 'PR-2568-0023_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub145_2025-10-05/PR-2568-0023_publication_reward_form.docx', 'temp', NULL, 25766, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-05 17:33:25', '2025-10-05 17:33:25', '2025-10-05 17:33:25', NULL),
(309, 'form_sample (1).pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub146_2025-10-05/form_sample_1_PR-2568-0024.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-05 17:34:12', '2025-10-05 17:34:12', '2025-10-05 17:34:12', NULL),
(310, 'PR-2568-0024_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub146_2025-10-05/PR-2568-0024_publication_reward_form.docx', 'temp', NULL, 25801, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-05 17:34:12', '2025-10-05 17:34:12', '2025-10-05 17:34:12', NULL),
(311, 'form_sample (1).pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub147_2025-10-05/form_sample_1_PR-2568-0025.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-05 17:41:26', '2025-10-05 17:41:26', '2025-10-05 17:41:26', NULL),
(312, 'PR-2568-0025_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub147_2025-10-05/PR-2568-0025_publication_reward_form.docx', 'temp', NULL, 25767, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-05 17:41:26', '2025-10-05 17:41:26', '2025-10-05 17:41:26', NULL),
(313, 'form_sample (1).pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub148_2025-10-05/form_sample_1_PR-2568-0026.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-05 17:50:36', '2025-10-05 17:50:36', '2025-10-05 17:50:36', NULL),
(314, 'form_sample (1).pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub148_2025-10-05/form_sample_1_PR-2568-0026_1.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-05 17:50:36', '2025-10-05 17:50:36', '2025-10-05 17:50:36', NULL),
(315, 'PR-2568-0026_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub148_2025-10-05/PR-2568-0026_publication_reward_form.docx', 'temp', NULL, 25838, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-05 17:50:36', '2025-10-05 17:50:36', '2025-10-05 17:50:36', NULL),
(316, 'form_sample (1).pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub149_2025-10-05/form_sample_1_PR-2568-0027.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-05 18:03:19', '2025-10-05 18:03:19', '2025-10-05 18:03:19', NULL),
(317, 'form_sample (1).pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub149_2025-10-05/form_sample_1_PR-2568-0027_1.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-05 18:03:19', '2025-10-05 18:03:19', '2025-10-05 18:03:19', NULL),
(318, 'PR-2568-0027_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub149_2025-10-05/PR-2568-0027_publication_reward_form.docx', 'temp', NULL, 25852, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-05 18:03:19', '2025-10-05 18:03:19', '2025-10-05 18:03:19', NULL),
(319, 'form_sample (1).pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub150_2025-10-05/form_sample_1_PR-2568-0028.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-05 18:04:30', '2025-10-05 18:04:30', '2025-10-05 18:04:30', NULL),
(320, 'form_sample (1).pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub150_2025-10-05/form_sample_1_PR-2568-0028_1.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-05 18:04:30', '2025-10-05 18:04:30', '2025-10-05 18:04:30', NULL),
(321, 'PR-2568-0028_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub150_2025-10-05/PR-2568-0028_publication_reward_form.docx', 'temp', NULL, 25825, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-05 18:04:30', '2025-10-05 18:04:30', '2025-10-05 18:04:30', NULL),
(322, 'form_sample (1).pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub151_2025-10-05/form_sample_1_PR-2568-0029.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-05 18:05:24', '2025-10-05 18:05:24', '2025-10-05 18:05:24', NULL),
(323, 'form_sample (1).pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub151_2025-10-05/form_sample_1_PR-2568-0029_1.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-05 18:05:24', '2025-10-05 18:05:24', '2025-10-05 18:05:24', NULL),
(324, 'PR-2568-0029_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub151_2025-10-05/PR-2568-0029_publication_reward_form.docx', 'temp', NULL, 25823, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-05 18:05:24', '2025-10-05 18:05:24', '2025-10-05 18:05:24', NULL),
(325, 'form_sample (1).pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub152_2025-10-05/form_sample_1_PR-2568-0030.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-05 18:06:18', '2025-10-05 18:06:18', '2025-10-05 18:06:18', NULL),
(326, 'form_sample (1).pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub152_2025-10-05/form_sample_1_PR-2568-0030_1.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-05 18:06:18', '2025-10-05 18:06:18', '2025-10-05 18:06:18', NULL),
(327, 'PR-2568-0030_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub152_2025-10-05/PR-2568-0030_publication_reward_form.docx', 'temp', NULL, 25824, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-05 18:06:18', '2025-10-05 18:06:18', '2025-10-05 18:06:18', NULL),
(328, 'form_sample (1).pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub153_2025-10-05/form_sample_1_PR-2568-0031.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-05 18:15:55', '2025-10-05 18:15:55', '2025-10-05 18:15:55', NULL),
(329, 'form_sample (1).pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub153_2025-10-05/form_sample_1_PR-2568-0031_1.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-05 18:15:55', '2025-10-05 18:15:55', '2025-10-05 18:15:55', NULL),
(330, 'PR-2568-0031_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub153_2025-10-05/PR-2568-0031_publication_reward_form.docx', 'temp', NULL, 25827, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-05 18:15:55', '2025-10-05 18:15:55', '2025-10-05 18:15:55', NULL),
(331, 'form_sample (1).pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub154_2025-10-05/form_sample_1_PR-2568-0032.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-05 18:17:03', '2025-10-05 18:17:03', '2025-10-05 18:17:03', NULL),
(332, 'form_sample (1).pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub154_2025-10-05/form_sample_1_PR-2568-0032_1.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-05 18:17:03', '2025-10-05 18:17:03', '2025-10-05 18:17:03', NULL),
(333, 'PR-2568-0032_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub154_2025-10-05/PR-2568-0032_publication_reward_form.docx', 'temp', NULL, 25804, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-05 18:17:03', '2025-10-05 18:17:03', '2025-10-05 18:17:03', NULL),
(334, 'form_sample (1).pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub155_2025-10-05/form_sample_1_PR-2568-0033.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-05 18:25:41', '2025-10-05 18:25:41', '2025-10-05 18:25:41', NULL),
(335, 'form_sample (1).pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub155_2025-10-05/form_sample_1_PR-2568-0033_1.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-05 18:25:41', '2025-10-05 18:25:41', '2025-10-05 18:25:41', NULL),
(336, 'PR-2568-0033_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub155_2025-10-05/PR-2568-0033_publication_reward_form.docx', 'temp', NULL, 25828, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-05 18:25:41', '2025-10-05 18:25:41', '2025-10-05 18:25:41', NULL),
(337, 'form_sample (1).pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub156_2025-10-05/form_sample_1_PR-2568-0034.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-05 18:26:50', '2025-10-05 18:26:50', '2025-10-05 18:26:50', NULL),
(338, 'form_sample (1).pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub156_2025-10-05/form_sample_1_PR-2568-0034_1.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-05 18:26:50', '2025-10-05 18:26:50', '2025-10-05 18:26:50', NULL),
(339, 'PR-2568-0034_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub156_2025-10-05/PR-2568-0034_publication_reward_form.docx', 'temp', NULL, 25836, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-05 18:26:50', '2025-10-05 18:26:50', '2025-10-05 18:26:50', NULL),
(340, 'form_sample (1).pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub157_2025-10-05/form_sample_1_PR-2568-0035.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-05 18:28:42', '2025-10-05 18:28:42', '2025-10-05 18:28:42', NULL),
(341, 'PR-2568-0035_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub157_2025-10-05/PR-2568-0035_publication_reward_form.docx', 'temp', NULL, 25807, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-05 18:28:42', '2025-10-05 18:28:42', '2025-10-05 18:28:42', NULL),
(345, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/fund130_2025-10-02/หลักฐานการปิดทุน/sample-local-pdf.pdf', 'submission', NULL, 49672, 'application/pdf', '', 0, 7, '2025-10-06 22:32:29', '2025-10-06 22:32:29', '2025-10-06 22:32:29', NULL),
(346, 'sample.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/fund130_2025-10-02/หลักฐานการปิดทุน/sample.pdf', 'submission', NULL, 18810, 'application/pdf', '', 0, 7, '2025-10-06 22:33:03', '2025-10-06 22:33:03', '2025-10-06 22:33:03', NULL),
(347, 'c4611_sample_explain.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/fund130_2025-10-02/หลักฐานการปิดทุน/c4611_sample_explain.pdf', 'submission', NULL, 88226, 'application/pdf', '', 0, 7, '2025-10-06 22:34:24', '2025-10-06 22:34:24', '2025-10-06 22:34:24', NULL),
(348, 'PR-2568-0032_publication_reward_form_head_signed.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub154_2025-10-05/PR-2568-0032_publication_reward_form_head_signed.docx', 'submission', NULL, 26345, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 13, '2025-10-07 12:44:35', '2025-10-07 12:44:35', '2025-10-07 12:44:35', NULL),
(349, 'PR-2568-0031_publication_reward_form_head_signed.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub153_2025-10-05/PR-2568-0031_publication_reward_form_head_signed.docx', 'submission', NULL, 26368, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 13, '2025-10-07 13:05:19', '2025-10-07 13:05:19', '2025-10-07 13:05:19', NULL),
(350, 'form_sample (1).pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/fund135_2025-10-02/หลักฐานการปิดทุน/form_sample_1.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 7, '2025-10-07 13:16:04', '2025-10-07 13:16:04', '2025-10-07 13:16:04', NULL),
(351, 'PR-2568-0032_publication_reward_form_head_signed.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/fund135_2025-10-02/หลักฐานการปิดทุน/PR-2568-0032_publication_reward_form_head_signed.docx', 'submission', NULL, 26345, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 7, '2025-10-07 13:20:33', '2025-10-07 13:20:33', '2025-10-07 13:20:33', NULL),
(352, 'form_sample (1).pdf', 'uploads/users/user_8_สมชาย_ใจดี/temp/form_sample_1.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-07 13:50:18', '2025-10-07 13:50:18', '2025-10-07 13:50:18', NULL),
(353, 'form_sample (1).pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub162_2025-10-07/PR-2568-0040_form_sample_1.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-07 14:00:42', '2025-10-07 14:00:42', '2025-10-07 14:00:42', NULL),
(354, 'form_sample (1).pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub162_2025-10-07/PR-2568-0040_form_sample_1_1.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-07 14:00:42', '2025-10-07 14:00:42', '2025-10-07 14:00:42', NULL),
(355, 'PR-2568-0040_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub162_2025-10-07/PR-2568-0040_publication_reward_form.docx', 'submission', NULL, 26323, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-07 14:00:42', '2025-10-07 14:00:42', '2025-10-07 14:00:42', NULL),
(356, 'sample_head_signed.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub162_2025-10-07/sample_head_signed.pdf', 'submission', NULL, 26381, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 13, '2025-10-07 14:04:37', '2025-10-07 14:04:37', '2025-10-07 14:04:37', NULL),
(357, 'form_sample (1).pdf', 'uploads/users/user_8_สมชาย_ใจดี/temp/form_sample_1.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-07 14:23:20', '2025-10-07 14:23:20', '2025-10-07 14:23:20', NULL),
(358, 'form_sample (1).pdf', 'uploads/users/user_8_สมชาย_ใจดี/temp/form_sample_1.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-07 14:25:00', '2025-10-07 14:25:00', '2025-10-07 14:25:00', NULL),
(359, 'form_sample (1).pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub163_2025-10-07/PR-2568-0041_form_sample_1_2.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-07 14:33:37', '2025-10-07 14:33:37', '2025-10-07 14:33:37', NULL),
(360, 'publication_reward_preview.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub163_2025-10-07/PR-2568-0041_publication_reward_preview.pdf', 'submission', NULL, 97578, 'application/pdf', '', 0, 8, '2025-10-07 14:33:37', '2025-10-07 14:33:37', '2025-10-07 14:33:37', NULL),
(361, 'PR-2568-0041_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub163_2025-10-07/PR-2568-0041_publication_reward_form.docx', 'submission', NULL, 26293, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-07 14:33:37', '2025-10-07 14:33:37', '2025-10-07 14:33:37', NULL),
(362, 'form_sample (1).pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub164_2025-10-07/PR-2568-0042_form_sample_1.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-07 14:57:03', '2025-10-07 14:57:03', '2025-10-07 14:57:03', NULL),
(363, 'form_sample.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub164_2025-10-07/PR-2568-0042_form_sample.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-07 14:57:03', '2025-10-07 14:57:03', '2025-10-07 14:57:03', NULL),
(364, 'PR-2568-0042_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub164_2025-10-07/PR-2568-0042_publication_reward_form.docx', 'submission', NULL, 26299, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-07 14:57:03', '2025-10-07 14:57:03', '2025-10-07 14:57:03', NULL),
(365, 'form_sample.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub165_2025-10-07/PR-2568-0043_form_sample.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-07 15:08:08', '2025-10-07 15:08:08', '2025-10-07 15:08:08', NULL),
(366, 'publication_reward_preview.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub165_2025-10-07/PR-2568-0043_publication_reward_preview.pdf', 'submission', NULL, 97578, 'application/pdf', '', 0, 8, '2025-10-07 15:08:09', '2025-10-07 15:08:09', '2025-10-07 15:08:09', NULL),
(367, 'PR-2568-0043_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub165_2025-10-07/PR-2568-0043_publication_reward_form.docx', 'submission', NULL, 26299, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-07 15:08:09', '2025-10-07 15:08:09', '2025-10-07 15:08:09', NULL),
(368, 'form_sample.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub166_2025-10-07/PR-2568-0044_form_sample.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-07 15:45:13', '2025-10-07 15:45:13', '2025-10-07 15:45:13', NULL),
(369, 'form_sample (1).pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub166_2025-10-07/PR-2568-0044_form_sample_1.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-07 15:45:14', '2025-10-07 15:45:14', '2025-10-07 15:45:14', NULL),
(370, 'PR-2568-0044_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub166_2025-10-07/PR-2568-0044_publication_reward_form.docx', 'submission', NULL, 26301, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-07 15:45:14', '2025-10-07 15:45:14', '2025-10-07 15:45:14', NULL),
(371, 'PR-2568-0041_form_sample_1_2_head_signed.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub166_2025-10-07/PR-2568-0041_form_sample_1_2_head_signed.pdf', 'submission', NULL, 26367, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 13, '2025-10-07 15:59:49', '2025-10-07 15:59:49', '2025-10-07 15:59:49', NULL);

-- --------------------------------------------------------

--
-- โครงสร้างตาราง `fund_application_details`
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
  `closed_at` datetime DEFAULT NULL COMMENT 'ไม่ได้ใช้',
  `announce_reference_number` varchar(50) DEFAULT NULL,
  `comment` text DEFAULT NULL COMMENT 'ไม่ได้ใช้',
  `main_annoucement` int(11) DEFAULT NULL,
  `activity_support_announcement` int(11) DEFAULT NULL,
  `author_name_list` varchar(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- dump ตาราง `fund_application_details`
--

INSERT INTO `fund_application_details` (`detail_id`, `submission_id`, `subcategory_id`, `project_title`, `project_description`, `requested_amount`, `approved_amount`, `approved_by`, `approved_at`, `rejected_by`, `rejected_at`, `closed_at`, `announce_reference_number`, `comment`, `main_annoucement`, `activity_support_announcement`, `author_name_list`) VALUES
(16, 121, 1, 'Project Title', '123-312-3123', '5000.00', '0.00', NULL, NULL, NULL, NULL, NULL, '', '', 1, 2, NULL),
(17, 130, 1, 'สมชาย ใจดี', '081-111-1111', '50000.00', '47000.00', NULL, NULL, NULL, NULL, '2025-10-06 22:34:24', '333', '', 2, 1, NULL),
(18, 131, 1, 'สมชาย ใจดี', '081-111-1111', '115000.00', '0.00', NULL, NULL, NULL, NULL, NULL, '', '', 3, 1, NULL),
(19, 132, 1, 'สมชาย ใจดี', '081-111-1111', '50000.00', '0.00', NULL, NULL, NULL, NULL, NULL, '', '', 2, 2, NULL),
(20, 133, 1, 'สมชาย ใจดี', '081-111-1111', '5000.00', '0.00', NULL, NULL, NULL, NULL, NULL, '', '', 1, 2, NULL),
(21, 134, 1, 'สมชาย ใจดี', '081-111-1111', '5000.00', '0.00', NULL, NULL, NULL, NULL, NULL, '', '', 1, 1, NULL),
(22, 135, 1, 'สมชาย ใจดี', '081-111-1111', '15000.00', '10000.00', NULL, NULL, NULL, NULL, NULL, '', '', 1, 2, NULL);

-- --------------------------------------------------------

--
-- โครงสร้างตาราง `fund_categories`
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
-- dump ตาราง `fund_categories`
--

INSERT INTO `fund_categories` (`category_id`, `category_name`, `status`, `year_id`, `comment`, `create_at`, `update_at`, `delete_at`) VALUES
(1, 'ทุนส่งเสริมการวิจัย', 'active', 3, NULL, '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL),
(2, 'ทุนอุดหนุนกิจกรรม', 'active', 3, NULL, '2025-06-24 16:49:13', '2025-08-10 23:25:26', NULL);

-- --------------------------------------------------------

--
-- โครงสร้างตาราง `fund_forms`
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
-- dump ตาราง `fund_forms`
--

INSERT INTO `fund_forms` (`form_id`, `title`, `description`, `file_name`, `file_path`, `file_size`, `mime_type`, `form_type`, `fund_category`, `is_required`, `display_order`, `status`, `year_id`, `created_by`, `create_at`, `update_at`, `delete_at`) VALUES
(1, 'แบบฟอร์มสมัครทุนส่งเสริมการวิจัย', 'แบบฟอร์มสำหรับสมัครขอรับทุนส่งเสริมการวิจัย แบบฟอร์มสำหรับสมัครขอรับทุนส่งเสริมการวิจัย แบบฟอร์มสำหรับสมัครขอรับทุนส่งเสริมการวิจัย แบบฟอร์มสำหรับสมัครขอรับทุนส่งเสริมการวิจัย แบบฟอร์มสำหรับสมัครขอรับทุนส่งเสริมการวิจัย แบบฟอร์มสำหรับสมัครขอรับทุนส่งเสริมการวิจัย แบบฟอร์มสำหรับสมัครขอรับทุนส่งเสริมการวิจัย', 'แบบฟอร์มสมัครทุนวิจัย.docx', 'uploads/fund_forms/research/แบบฟอร์มสมัครทุนวิจัย.docx', 512000, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application', 'research_fund', 1, 2, 'active', 3, 1, '2025-08-20 11:40:31', '2025-09-19 13:34:20', NULL),
(2, 'แบบฟอร์มรายงานความก้าวหน้าโครงการวิจัย', 'แบบฟอร์มสำหรับรายงานความก้าวหน้าของโครงการวิจัย', 'แบบฟอร์มรายงานความก้าวหน้า.docx', 'uploads/fund_forms/research/แบบฟอร์มรายงานความก้าวหน้า.docx', 480000, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'report', 'research_fund', 1, 1, 'active', 3, 1, '2025-08-20 11:40:31', '2025-09-19 11:36:42', NULL),
(3, 'แบบฟอร์มสมัครทุนอุดหนุนกิจกรรม', 'แบบฟอร์มสำหรับสมัครขอรับทุนอุดหนุนกิจกรรม', 'แบบฟอร์มสมัครทุนกิจกรรม.docx', 'uploads/fund_forms/promotion/แบบฟอร์มสมัครทุนกิจกรรม.docx', 600000, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application', 'promotion_fund', 1, 3, 'active', 3, 1, '2025-08-20 11:40:31', '2025-09-19 11:36:42', NULL),
(4, 'แบบประเมินผลกิจกรรม', 'แบบฟอร์มสำหรับประเมินผลการดำเนินกิจกรรม', 'แบบประเมินผลกิจกรรม.xlsx', 'uploads/fund_forms/promotion/แบบประเมินผลกิจกรรม.xlsx', 256000, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'evaluation', 'promotion_fund', 0, 4, 'active', 3, 1, '2025-08-20 11:40:31', '2025-09-19 11:36:42', NULL),
(5, 'แนวทางการเขียนข้อเสนอโครงการ', 'เอกสารแนวทางและข้อแนะนำสำหรับการเขียนข้อเสนอโครงการ', 'แนวทางการเขียนข้อเสนอโครงการ.pdf', 'uploads/fund_forms/guidelines/แนวทางการเขียนข้อเสนอโครงการ.pdf', 1024000, 'application/pdf', 'guidelines', 'both', 0, 5, 'active', 3, 1, '2025-08-20 11:40:31', '2025-09-19 11:36:42', NULL);

-- --------------------------------------------------------

--
-- โครงสร้างตาราง `fund_subcategories`
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
-- dump ตาราง `fund_subcategories`
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
-- โครงสร้างตาราง `innovations`
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
-- dump ตาราง `innovations`
--

INSERT INTO `innovations` (`id`, `user_id`, `title`, `innovation_type`, `description`, `registered_date`, `created_at`, `updated_at`) VALUES
(1, 8, 'First Innovation', 'type1', 'First Innovation for Testing', '2025-09-02', '2025-09-13 14:59:08', '2025-09-13 14:59:17');

-- --------------------------------------------------------

--
-- โครงสร้างตาราง `notifications`
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
-- dump ตาราง `notifications`
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
(125, 11, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25681002-0010 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 126, '2025-10-02 00:33:52', '2025-10-02 00:33:52', NULL),
(126, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-25681002-0011 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 127, '2025-10-02 12:12:36', '2025-10-02 12:12:36', NULL),
(127, 7, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25681002-0011 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 127, '2025-10-02 12:12:36', '2025-10-02 12:12:36', NULL),
(128, 11, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25681002-0011 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 127, '2025-10-02 12:12:36', '2025-10-02 12:12:36', NULL),
(129, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-25681002-0012 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 128, '2025-10-02 12:21:39', '2025-10-02 12:21:39', NULL),
(130, 7, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25681002-0012 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 128, '2025-10-02 12:21:39', '2025-10-02 12:21:39', NULL),
(131, 11, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25681002-0012 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 128, '2025-10-02 12:21:39', '2025-10-02 12:21:39', NULL),
(132, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-25681002-0013 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 129, '2025-10-02 12:40:26', '2025-10-02 12:40:26', NULL),
(133, 7, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25681002-0013 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 129, '2025-10-02 12:40:26', '2025-10-02 12:40:26', NULL),
(134, 11, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25681002-0013 จากอาจารย์ อาจารย์สมชาย ใจดี แล้ว', 'info', 0, 129, '2025-10-02 12:40:26', '2025-10-02 12:40:26', NULL),
(135, 13, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-25681003-0014 ของคุณ พนักงานธุรการหัวหน้า สาขา แล้ว', 'success', 0, 136, '2025-10-03 15:49:50', '2025-10-03 15:49:50', NULL),
(136, 7, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25681003-0014 จากอาจารย์ พนักงานธุรการหัวหน้า สาขา แล้ว', 'info', 0, 136, '2025-10-03 15:49:50', '2025-10-03 15:49:50', NULL),
(137, 11, 'มีคำร้องใหม่', 'มีคำร้องใหม่ PR-25681003-0014 จากอาจารย์ พนักงานธุรการหัวหน้า สาขา แล้ว', 'info', 0, 136, '2025-10-03 15:49:50', '2025-10-03 15:49:50', NULL),
(138, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0015 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 137, '2025-10-05 15:56:14', '2025-10-05 15:56:14', NULL),
(139, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0015 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 137, '2025-10-05 15:56:14', '2025-10-05 15:56:14', NULL),
(140, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0016 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 138, '2025-10-05 15:58:15', '2025-10-05 15:58:15', NULL),
(141, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0016 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 138, '2025-10-05 15:58:15', '2025-10-05 15:58:15', NULL),
(142, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0017 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 139, '2025-10-05 15:59:47', '2025-10-05 15:59:47', NULL),
(143, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0017 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 139, '2025-10-05 15:59:47', '2025-10-05 15:59:47', NULL),
(144, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0018 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 140, '2025-10-05 16:00:48', '2025-10-05 16:00:48', NULL),
(145, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0018 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 140, '2025-10-05 16:00:48', '2025-10-05 16:00:48', NULL),
(146, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0019 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 141, '2025-10-05 16:01:57', '2025-10-05 16:01:57', NULL),
(147, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0019 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 141, '2025-10-05 16:01:57', '2025-10-05 16:01:57', NULL),
(148, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0020 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 142, '2025-10-05 17:08:25', '2025-10-05 17:08:25', NULL),
(149, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0020 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 142, '2025-10-05 17:08:25', '2025-10-05 17:08:25', NULL),
(150, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0021 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 143, '2025-10-05 17:21:26', '2025-10-05 17:21:26', NULL),
(151, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0021 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 143, '2025-10-05 17:21:26', '2025-10-05 17:21:26', NULL),
(152, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0022 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 144, '2025-10-05 17:30:59', '2025-10-05 17:30:59', NULL),
(153, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0022 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 144, '2025-10-05 17:30:59', '2025-10-05 17:30:59', NULL),
(154, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0023 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 145, '2025-10-05 17:33:25', '2025-10-05 17:33:25', NULL),
(155, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0023 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 145, '2025-10-05 17:33:25', '2025-10-05 17:33:25', NULL),
(156, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0024 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 146, '2025-10-05 17:34:12', '2025-10-05 17:34:12', NULL),
(157, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0024 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 146, '2025-10-05 17:34:12', '2025-10-05 17:34:12', NULL),
(158, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0025 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 147, '2025-10-05 17:41:26', '2025-10-05 17:41:26', NULL),
(159, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0025 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 147, '2025-10-05 17:41:26', '2025-10-05 17:41:26', NULL),
(160, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0026 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 148, '2025-10-05 17:50:36', '2025-10-05 17:50:36', NULL),
(161, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0026 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 148, '2025-10-05 17:50:36', '2025-10-05 17:50:36', NULL),
(162, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0027 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 149, '2025-10-05 18:03:19', '2025-10-05 18:03:19', NULL),
(163, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0027 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 149, '2025-10-05 18:03:19', '2025-10-05 18:03:19', NULL),
(164, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0028 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 150, '2025-10-05 18:04:31', '2025-10-05 18:04:31', NULL),
(165, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0028 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 150, '2025-10-05 18:04:31', '2025-10-05 18:04:31', NULL),
(166, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0029 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 151, '2025-10-05 18:05:24', '2025-10-05 18:05:24', NULL),
(167, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0029 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 151, '2025-10-05 18:05:24', '2025-10-05 18:05:24', NULL),
(168, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0030 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 152, '2025-10-05 18:06:18', '2025-10-05 18:06:18', NULL),
(169, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0030 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 152, '2025-10-05 18:06:18', '2025-10-05 18:06:18', NULL),
(170, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0031 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 153, '2025-10-05 18:15:55', '2025-10-05 18:15:55', NULL),
(171, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0031 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 153, '2025-10-05 18:15:55', '2025-10-05 18:15:55', NULL),
(172, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0032 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 154, '2025-10-05 18:17:03', '2025-10-05 18:17:03', NULL),
(173, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0032 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 154, '2025-10-05 18:17:03', '2025-10-05 18:17:03', NULL),
(174, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0033 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 155, '2025-10-05 18:25:41', '2025-10-05 18:25:41', NULL),
(175, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0033 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 155, '2025-10-05 18:25:41', '2025-10-05 18:25:41', NULL),
(176, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0034 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 156, '2025-10-05 18:26:50', '2025-10-05 18:26:50', NULL),
(177, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0034 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 156, '2025-10-05 18:26:50', '2025-10-05 18:26:50', NULL),
(178, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0035 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 157, '2025-10-05 18:28:42', '2025-10-05 18:28:42', NULL),
(179, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0035 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 157, '2025-10-05 18:28:42', '2025-10-05 18:28:42', NULL),
(180, 8, 'คำร้องได้รับการอนุมัติ', 'คำร้องหมายเลข FA-25681002-0005 ของคุณได้รับการอนุมัติ เป็นจำนวน 0.00 บาท (เลขอ้างอิงประกาศ: 123)', 'success', 0, 133, '2025-10-05 20:15:31', '2025-10-05 20:15:31', NULL),
(181, 8, 'คำร้องได้รับการอนุมัติ', 'คำร้องหมายเลข FA-25681002-0007 ของคุณได้รับการอนุมัติ เป็นจำนวน 0.00 บาท (เลขอ้างอิงประกาศ: 123)', 'success', 0, 135, '2025-10-05 20:19:12', '2025-10-05 20:19:12', NULL),
(182, 8, 'คำร้องได้รับการอนุมัติ', 'คำร้องหมายเลข FA-25681002-0002 ของคุณได้รับการอนุมัติ เป็นจำนวน 47000.00 บาท (เลขอ้างอิงประกาศ: 333)', 'success', 0, 130, '2025-10-05 20:51:37', '2025-10-05 20:51:37', NULL),
(183, 8, 'คำร้องได้รับการอนุมัติ', 'คำร้องหมายเลข PR-2568-0031 ของคุณได้รับการอนุมัติ เป็นจำนวน 10000.00 บาท (เลขอ้างอิงประกาศ: 132/568)', 'success', 0, 153, '2025-10-07 13:10:35', '2025-10-07 13:10:35', NULL),
(184, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0040 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 162, '2025-10-07 14:00:42', '2025-10-07 14:00:42', NULL),
(185, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0040 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 162, '2025-10-07 14:00:42', '2025-10-07 14:00:42', NULL),
(186, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0041 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 163, '2025-10-07 14:33:38', '2025-10-07 14:33:38', NULL),
(187, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0041 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 163, '2025-10-07 14:33:38', '2025-10-07 14:33:38', NULL),
(188, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0042 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 164, '2025-10-07 14:57:04', '2025-10-07 14:57:04', NULL),
(189, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0042 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 164, '2025-10-07 14:57:04', '2025-10-07 14:57:04', NULL),
(190, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0043 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 165, '2025-10-07 15:08:09', '2025-10-07 15:08:09', NULL),
(191, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0043 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 165, '2025-10-07 15:08:09', '2025-10-07 15:08:09', NULL),
(192, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0044 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 166, '2025-10-07 15:45:14', '2025-10-07 15:45:14', NULL),
(193, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0044 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 166, '2025-10-07 15:45:14', '2025-10-07 15:45:14', NULL);

-- --------------------------------------------------------

--
-- โครงสร้างตาราง `positions`
--

CREATE TABLE `positions` (
  `position_id` int(11) NOT NULL,
  `position_name` varchar(255) DEFAULT NULL,
  `is_active` enum('yes','no') DEFAULT 'yes',
  `create_at` datetime DEFAULT NULL,
  `update_at` datetime DEFAULT NULL,
  `delete_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- dump ตาราง `positions`
--

INSERT INTO `positions` (`position_id`, `position_name`, `is_active`, `create_at`, `update_at`, `delete_at`) VALUES
(1, 'อาจารย์', 'yes', '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL),
(2, 'รองศาสตราจารย์', 'yes', '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL),
(3, 'พนักงานธุรการ', 'yes', '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL);

-- --------------------------------------------------------

--
-- โครงสร้างตาราง `publications`
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
-- dump ตาราง `publications`
--

INSERT INTO `publications` (`id`, `user_id`, `title`, `authors`, `journal`, `publication_type`, `publication_date`, `publication_year`, `doi`, `url`, `cited_by`, `cited_by_url`, `source`, `external_ids`, `fingerprint`, `is_verified`, `created_at`, `updated_at`, `deleted_at`, `citation_history`) VALUES
(146, 8, 'Transformation of the BPMN design model into a colored Petri net using the partitioning approach', 'Chanon Dechsupa, Wiwat Vatanawood, Arthit Thongtak', NULL, NULL, NULL, 2018, NULL, 'https://ieeexplore.ieee.org/abstract/document/8405526/', 45, 'https://scholar.google.com/scholar?hl=en&cites=12787580523055771259', 'scholar', '{\"scholar_cluster_id\":\"[\'12787580523055771259\']\"}', '6badedb989e2cf25cea1172a93f4cb13db967f23', 0, '2025-09-21 00:00:59', '2025-10-07 00:00:53', NULL, '{\"2018\":2,\"2019\":10,\"2020\":3,\"2021\":5,\"2022\":9,\"2023\":6,\"2024\":9,\"2025\":1}'),
(147, 8, 'Hierarchical verification for the BPMN design model using state space analysis', 'Chanon Dechsupa, Wiwat Vatanawood, Arthit Thongtak', NULL, NULL, NULL, 2019, NULL, 'https://ieeexplore.ieee.org/abstract/document/8611325/', 41, 'https://scholar.google.com/scholar?hl=en&cites=8862119664193353323', 'scholar', '{\"scholar_cluster_id\":\"[\'8862119664193353323\']\"}', '29bd0c0fb709ce634fa24280fa74b0123c33d553', 0, '2025-09-21 00:00:59', '2025-10-07 00:00:53', NULL, '{\"2018\":1,\"2019\":6,\"2020\":3,\"2021\":4,\"2022\":8,\"2023\":10,\"2024\":2,\"2025\":7}'),
(148, 8, 'Formal verification of web service orchestration using colored petri net', 'C Dechsupa, W Vatanawood, A Thongtak', NULL, NULL, NULL, 2016, NULL, 'http://www.iaeng.org/publication/IMECS2016/IMECS2016_pp398-403.pdf', 13, 'https://scholar.google.com/scholar?hl=en&cites=17960005054307779010', 'scholar', '{\"scholar_cluster_id\":\"[\'17960005054307779010\']\"}', '0c1a71fe987328fd47243c5f50fa927fe3aad557', 0, '2025-09-21 00:00:59', '2025-10-07 00:00:53', NULL, '{\"2017\":1,\"2018\":3,\"2019\":4,\"2020\":2,\"2021\":1,\"2022\":0,\"2023\":2}'),
(149, 8, 'Stepwise verification for the BPMN with timed and stochastic process using a colored generalized stochastic Petri net', 'Chanon Dechsupa, Wiwat Vatanawood, Arthit Thongtak', NULL, NULL, NULL, 2022, NULL, 'https://ieeexplore.ieee.org/abstract/document/9758738/', 6, 'https://scholar.google.com/scholar?hl=en&cites=7981025124627691886', 'scholar', '{\"scholar_cluster_id\":\"[\'7981025124627691886\']\"}', 'aeb7e0e56f784f470d212414acdf19f7307ed11e', 0, '2025-09-21 00:00:59', '2025-10-07 00:00:53', NULL, '{\"2022\":2,\"2023\":1,\"2024\":0,\"2025\":3}'),
(150, 8, 'An automated framework for BPMN model verification achieving branch coverage', 'Chanon Dechsupa, Wiwat Vatanawood, Arthit Thongtak', NULL, NULL, NULL, 2021, NULL, 'https://engj.org/index.php/ej/article/view/4084', 5, 'https://scholar.google.com/scholar?hl=en&cites=8795149309224104072', 'scholar', '{\"scholar_cluster_id\":\"[\'8795149309224104072\']\"}', '07daece3baefcd04ce2263035573e1c44e55bc49', 0, '2025-09-21 00:00:59', '2025-10-07 00:00:53', NULL, '{\"2021\":1,\"2022\":0,\"2023\":2,\"2024\":1,\"2025\":1}'),
(151, 8, 'Formal Verification of the Accounting Information Interfaces Using Colored Petri Net', 'Worawit Poolsawasdi, Chanon Dechsupa', NULL, NULL, NULL, 2019, NULL, 'https://ieeexplore.ieee.org/abstract/document/8802547/', 3, 'https://scholar.google.com/scholar?hl=en&cites=14998856147780456235', 'scholar', '{\"scholar_cluster_id\":\"[\'14998856147780456235\']\"}', 'c170922d38a507760700cbfab7f16275afb11e30', 0, '2025-09-21 00:00:59', '2025-10-07 00:00:53', NULL, '{\"2019\":1,\"2020\":0,\"2021\":2}'),
(152, 8, 'Compositional formal verification for business process models with heterogeneous notations using colored Petri Net', 'C Dechsupa, W Vatanawood, A Thongtak', NULL, NULL, NULL, 2019, NULL, 'https://scholar.google.com/scholar?cluster=6843663431830027631&hl=en&oi=scholarr', 3, 'https://scholar.google.com/scholar?hl=en&cites=6843663431830027631', 'scholar', '{\"scholar_cluster_id\":\"[\'6843663431830027631\']\"}', '23242652a60d109cd5fad480e0a5d4f44cafe19d', 0, '2025-09-21 00:00:59', '2025-10-07 00:00:53', NULL, '{\"2023\":1,\"2024\":2}'),
(153, 8, 'MorphoNet: A novel bivalve images classification framework with convolutional neural network', 'Chanon Dechsupa, Pongpun Prasankok, Wiwat Vattanawood, Arthit Thongtak', NULL, NULL, NULL, 2023, NULL, 'https://engj.org/index.php/ej/article/view/4510', 2, 'https://scholar.google.com/scholar?hl=en&cites=14881028456811771380', 'scholar', '{\"scholar_cluster_id\":\"[\'14881028456811771380\']\"}', '520340ad03a1bd8771441f1e27b9e5fd998fc943', 0, '2025-09-21 00:00:59', '2025-10-07 00:00:53', NULL, '{\"2024\":1,\"2025\":1}'),
(154, 8, 'Formal modelling and verification of the traffic light control system design with time-automata', 'A Kamput, C Dechsupa', NULL, NULL, NULL, 2023, NULL, 'https://www.researchgate.net/profile/Chanon-Dechsupa/publication/372388619_Formal_Modelling_and_Verification_of_the_Traffic_Light_Control_System_Design_with_Time-Automata/links/652e3af3b5c77c79f9bda3d7/Formal-Modelling-and-Verification-of-the-Traffic-Light-Control-System-Design-with-Time-Automata.pdf', 2, 'https://scholar.google.com/scholar?hl=en&cites=14268178437607664045', 'scholar', '{\"scholar_cluster_id\":\"[\'14268178437607664045\']\"}', '68f044d021c5607e9e2102e03aa9f62276ba28ef', 0, '2025-09-21 00:00:59', '2025-10-07 00:00:53', NULL, '{\"2025\":2}'),
(155, 8, 'An Applying Colored Petri Net for Computerized Accounting System and Ledger Accounts Instruction', 'Chanon Dechsupa, Wiwat Vatanawood, Worawit Poolsawasdi, Arthit Thongtak', NULL, NULL, NULL, 2021, NULL, 'https://www.mdpi.com/2073-431X/10/12/169', 2, 'https://scholar.google.com/scholar?hl=en&cites=16343376208504623490', 'scholar', '{\"scholar_cluster_id\":\"[\'16343376208504623490\']\"}', 'a0313a91b99f2de58140206c67f5aba6663f9f8b', 0, '2025-09-21 00:00:59', '2025-10-07 00:00:53', NULL, '{\"2023\":2}'),
(156, 8, 'Llm-Based Code Comment Summarization: Efficacy Evaluation and Challenges', 'Peeradon Sukkasem, Chitsutha Soomlek, Chanon Dechsupa', NULL, NULL, NULL, 2025, NULL, 'https://ieeexplore.ieee.org/abstract/document/11003343/', 1, 'https://scholar.google.com/scholar?hl=en&cites=14726756873448249733', 'scholar', '{\"scholar_cluster_id\":\"[\'14726756873448249733\']\"}', '39d79360a49705d0644781f70219ee2490fb951b', 0, '2025-09-21 00:00:59', '2025-10-07 00:00:53', NULL, '{\"2025\":1}'),
(157, 8, 'Scalable Timed-Automata Models for Traffic Light Control Systems: Challenges and Solutions in Formal Verification', 'Apipath Kamput, Chanon Dechsupa, Wiwat Vatanawood, Suttinan Pomsiri', NULL, NULL, NULL, 2024, NULL, 'https://ieeexplore.ieee.org/abstract/document/10666689/', 1, 'https://scholar.google.com/scholar?hl=en&cites=12598599138348353170', 'scholar', '{\"scholar_cluster_id\":\"[\'12598599138348353170\']\"}', '47baa15c9601f7a47e319e4ee43ac19e56de55cd', 0, '2025-09-21 00:00:59', '2025-10-07 00:00:53', NULL, '{\"2024\":1}'),
(158, 8, 'Toward automated verification of timed business process models using timed-automata networks and temporal properties', 'Chanon Dechsupa, Wiwat Vatanawood, Arthit Thongtak', NULL, NULL, NULL, 2025, NULL, 'https://www.sciencedirect.com/science/article/pii/S0020025525002208', NULL, NULL, 'scholar', NULL, '53db11828cb1250fd29af14999ea719ec090dbe1', 0, '2025-09-21 00:00:59', '2025-10-07 00:00:53', NULL, NULL),
(159, 8, 'Towards AI-Augmented Formal Verification: A Preliminary Investigation of ENGRU and Its Challenges', 'Chanon Dechsupa, Teerapong Panboonyuen, Wiwat Vatanawood, Praisan Padungweang, Chakchai So-In', NULL, NULL, NULL, 2025, NULL, 'https://ieeexplore.ieee.org/abstract/document/10993355/', 1, 'https://scholar.google.com/scholar?hl=en&cites=18157055063819776419', 'scholar', '{\"scholar_cluster_id\":\"[\'18157055063819776419\']\"}', '61ae555d998434eb64330b744161eaa6a8914dc1', 0, '2025-09-21 00:00:59', '2025-10-07 00:00:53', NULL, '{\"2025\":1}'),
(160, 8, 'Ensuring IoT Controller Reliability with Colored Generalized Stochastic Petri Net', 'Kruntarat Samngamnoi, Sutinun Pomsiri, Apipath Kamput, Chanon Dechsupa', NULL, NULL, NULL, 2024, NULL, 'https://ieeexplore.ieee.org/abstract/document/10770732/', NULL, NULL, 'scholar', NULL, 'baf62b4c49575b62532aacf9a50ee208449c39ec', 0, '2025-09-21 00:00:59', '2025-10-07 00:00:53', NULL, NULL),
(161, 8, 'An Applying Colored Petri Net for Computerized Accounting System and Ledger Accounts Instruction. Computers 2021, 10, 169', 'C Dechsupa, W Vatanawood, W Poolsawasdi, A Thongtak', NULL, NULL, NULL, 2021, NULL, 'https://www.academia.edu/download/80214901/pdf.pdf', NULL, NULL, 'scholar', NULL, '992712dd566fd338b5cf9253b9ddc09873cd0f04', 0, '2025-09-21 00:00:59', '2025-10-07 00:00:53', NULL, NULL),
(162, 8, 'Configuration management for integrated teaming environment', 'Chanon Dechsupa, Yachai Limpiyakorn', NULL, NULL, NULL, 2011, NULL, 'https://ieeexplore.ieee.org/abstract/document/6081265/', NULL, NULL, 'scholar', NULL, 'f43315261210343763e2bbcc9400bbf5696776cf', 0, '2025-09-21 00:00:59', '2025-10-07 00:00:53', NULL, NULL),
(163, 8, 'Transforming of the Sequence Diagram into Time-Automata Network', 'S Duangmalai, C Dechsupa', NULL, NULL, NULL, NULL, NULL, 'https://scholar.google.com/scholar?cluster=7621266305846188641&hl=en&oi=scholarr', NULL, NULL, 'scholar', NULL, '6df534e9aadf27573bb99823d90c0b0d042ad440', 0, '2025-09-21 00:00:59', '2025-10-07 00:00:53', NULL, NULL);

-- --------------------------------------------------------

--
-- โครงสร้างตาราง `publication_reward_details`
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
-- dump ตาราง `publication_reward_details`
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
(90, 126, 'Test Article Title', 'Test Journal Name', '2025-10-01', 'journal', 'T5', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Scopus, Web of Science', '50000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '50000.00', '0.00', '', 2, 'first_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-02 00:33:52', '2025-10-02 00:33:52', NULL, 3, 8, 'ab', 'somchai jaidee'),
(91, 127, 'Test Article Title', 'Test Journal Name', '2025-10-01', 'journal', 'Q2', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science, TCI', '30000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '30000.00', '0.00', '', 2, 'first_author', 'yes', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-02 12:12:36', '2025-10-02 12:12:36', NULL, 3, 8, 'ab', 'somchai jaidee'),
(92, 128, 'Test Article Title', 'Test Journal Name', '2025-04-01', 'journal', 'T10', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'ISI, Web of Science', '45000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '45000.00', '0.00', '', 1, 'first_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-02 12:21:39', '2025-10-02 12:21:39', NULL, 3, 8, 'ab', 'somchai jaidee'),
(93, 129, 'Test Article Title', 'Test Journal Name', '2025-04-01', 'journal', 'T10', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science, TCI', '45000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '45000.00', '0.00', '', 1, 'first_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-02 12:40:26', '2025-10-02 12:40:26', NULL, 3, 8, 'ab', 'somchai jaidee'),
(94, 136, 'Test Article Title', 'Test Journal Name', '2025-11-01', 'journal', 'Q3', '0.000', '', '', '123-145', 'Vol.10', '', '20000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '20000.00', '0.00', '', 2, 'first_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-03 15:49:50', '2025-10-03 15:49:50', NULL, 3, 8, 'a a a', 'กฤ'),
(95, 137, 'Test Article Title', 'Test Journal Name', '2025-09-01', 'journal', 'T10', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science', '45000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '45000.00', '0.00', '', 1, 'corresponding_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-05 15:56:14', '2025-10-05 15:56:14', NULL, 3, 2, 'ab', 'somchai jaidee'),
(96, 138, 'Test Article Title', 'Test Journal Name', '2025-10-01', 'journal', 'TCI', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science, TCI', '5000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '5000.00', '0.00', '', 1, 'first_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-05 15:58:15', '2025-10-05 15:58:15', NULL, 3, 2, 'AB', 'somchai jaidee'),
(97, 139, 'Test Article Title', 'Test Journal Name', '2025-10-01', 'journal', 'TCI', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science, TCI', '5000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '5000.00', '0.00', '', 1, 'corresponding_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-05 15:59:47', '2025-10-05 15:59:47', NULL, 3, 2, 'AB', 'somchai jaidee'),
(98, 140, 'Test Article Title', 'Test Journal Name', '2025-04-01', 'journal', 'TCI', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science, TCI', '5000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '5000.00', '0.00', '', 1, 'corresponding_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-05 16:00:48', '2025-10-05 16:00:48', NULL, 3, 2, 'AB', 'somchai jaidee'),
(99, 141, 'Test Article Title', 'Test Journal Name', '2025-11-01', 'journal', 'Q2', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science', '30000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '30000.00', '0.00', '', 1, 'corresponding_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-05 16:01:57', '2025-10-05 16:01:57', NULL, 3, 2, 'AB', 'somchai jaidee'),
(100, 142, 'Test Article Title', 'Test Journal Name', '2025-11-01', 'journal', 'TCI', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science, TCI', '5000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '5000.00', '0.00', '', 1, 'corresponding_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-05 17:08:25', '2025-10-05 17:08:25', NULL, 3, 2, 'AB', 'somchai jaidee'),
(101, 143, 'Test Article Title', 'Test Journal Name', '2025-05-01', 'journal', 'TCI', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'TCI', '5000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '5000.00', '0.00', '', 1, 'corresponding_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-05 17:21:26', '2025-10-05 17:21:26', NULL, 3, 2, 'ab', 'somchai jaidee'),
(102, 144, 'Test Article Title', 'Test Journal Name', '2025-06-01', 'journal', 'TCI', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science', '5000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '5000.00', '0.00', '', 1, 'corresponding_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-05 17:30:59', '2025-10-05 17:30:59', NULL, 3, 2, 'ab', 'somchai jaidee'),
(103, 145, 'Test Article Title', 'Test Journal Name', '2025-08-01', 'journal', 'TCI', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science', '5000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '5000.00', '0.00', '', 1, 'corresponding_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-05 17:33:25', '2025-10-05 17:33:25', NULL, 3, 2, 'a', 'somchai jaidee'),
(104, 146, 'Test Article Title', 'Test Journal Name', '2025-01-01', 'journal', 'T5', '0.000', '10.10.16', 'test.artical.url', '', 'Vol.Test', 'Web of Science', '50000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '50000.00', '0.00', '', 1, 'corresponding_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-05 17:34:12', '2025-10-05 17:34:12', NULL, 3, 2, 'ab', 'somchai jaidee'),
(105, 147, 'Test Article Title', 'Test Journal Name', '2025-04-01', 'journal', 'TCI', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science', '5000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '5000.00', '0.00', '', 1, 'corresponding_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-05 17:41:26', '2025-10-05 17:41:26', NULL, 3, 2, 'ab', 'somchai jaidee'),
(106, 148, 'Test Article Title', 'Test Journal Name', '2025-07-01', 'journal', 'T5', '0.000', '10.10.16', 'test.artical.url', '', 'Vol.Test', 'Web of Science', '50000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '50000.00', '0.00', '', 1, 'corresponding_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-05 17:50:36', '2025-10-05 17:50:36', NULL, 3, 2, 'ab', 'somchai jaidee'),
(107, 149, 'Test Article Title', 'Test Journal Name', '2025-01-01', 'journal', 'T10', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science', '45000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '45000.00', '0.00', '', 1, 'corresponding_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-05 18:03:19', '2025-10-05 18:03:19', NULL, 3, 2, 'AB', 'somchai jaidee'),
(108, 150, 'Test Article Title', 'Test Journal Name', '2025-01-01', 'journal', 'Q1', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science', '40000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '40000.00', '0.00', '', 1, 'corresponding_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-05 18:04:30', '2025-10-05 18:04:30', NULL, 3, 2, 'AB', 'somchai jaidee'),
(109, 151, 'Test Article Title', 'Test Journal Name', '2025-04-01', 'journal', 'Q2', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science', '30000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '30000.00', '0.00', '', 1, 'corresponding_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-05 18:05:24', '2025-10-05 18:05:24', NULL, 3, 2, 'AB', 'somchai jaidee'),
(110, 152, 'Test Article Title', 'Test Journal Name', '2025-01-01', 'journal', 'Q3', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science', '20000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '20000.00', '0.00', '', 1, 'corresponding_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-05 18:06:18', '2025-10-05 18:06:18', NULL, 3, 2, 'AB', 'somchai jaidee'),
(111, 153, 'Test Article Title', 'Test Journal Name', '2025-11-01', 'journal', 'Q4', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science', '10000.00', '10000.00', '3000.00', '0.00', '5000.00', '6000.00', '0.00', '10000.00', '10000.00', '132/568', 1, 'corresponding_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-05 18:15:55', '2025-10-07 13:46:12', NULL, 3, 2, 'AB', 'somchai jaidee'),
(112, 154, 'Test Article Title', 'Test Journal Name', '2025-04-01', 'journal', 'TCI', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science', '5000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '5000.00', '0.00', '', 1, 'corresponding_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-05 18:17:03', '2025-10-05 18:17:03', NULL, 3, 2, 'AB', 'somchai jaidee'),
(113, 155, 'Test Article Title', 'Test Journal Name', '2025-09-01', 'journal', 'T5', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science, TCI', '50000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '50000.00', '0.00', '', 1, 'first_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-05 18:25:41', '2025-10-05 18:25:41', NULL, 3, 2, 'ab', 'somchai jaidee'),
(114, 156, 'Test Article Title', 'Test Journal Name', '2025-01-01', 'journal', 'T10', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'TCI', '45000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '45000.00', '0.00', '', 1, 'first_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-05 18:26:50', '2025-10-05 18:26:50', NULL, 3, 2, 'ab', 'somchai jaidee'),
(115, 157, 'Test Article Title', 'Test Journal Name', '2025-12-01', 'journal', 'T5', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'TCI', '50000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '50000.00', '0.00', '', 1, 'corresponding_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-05 18:28:42', '2025-10-05 18:28:42', NULL, 3, 2, 'AB', 'somchai jaidee'),
(116, 158, 'Test Article', 'Test Journal', '2025-06-01', 'journal', 'T5', '0.000', '10.10.10', 'www.test.com', '123-456', 'Vol.Test', 'ISI', '50000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '50000.00', '0.00', '', 1, 'first_author', 'yes', 'F-123456', 'QS 500', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-07 13:01:58', '2025-10-07 13:02:21', NULL, 3, 2, 'ab', 'somchai jaidee'),
(117, 159, 'Test Article', 'Test Journal', '2025-02-01', 'journal', 'T5', '0.000', '10.10.10', 'www.test.com', '123-456', 'Vol.Test', 'TCI', '50000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '50000.00', '0.00', '', 1, 'first_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-07 13:28:55', '2025-10-07 13:28:55', NULL, 3, 2, 'ab', 'somchai jaidee'),
(118, 160, 'Test Article', 'Test Journal', '2025-02-01', 'journal', 'T10', '0.000', '10.10.10', 'www.test.com', '123-456', 'Vol.Test', 'TCI', '45000.00', '0.00', '0.00', '0.00', '19898.00', '0.00', '1000.00', '63898.00', '0.00', '', 1, 'first_author', 'yes', 'F-123456', 'QS 500', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-07 13:43:12', '2025-10-07 13:43:12', NULL, 3, 2, 'ab', 'somchai jaidee'),
(119, 161, 'Test Article', 'Test Journal', '2025-02-01', 'journal', 'T10', '0.000', '10.10.10', 'www.test.com', '123-456', 'Vol.Test', 'TCI', '45000.00', '0.00', '0.00', '0.00', '19898.00', '0.00', '0.00', '64898.00', '0.00', '', 1, 'first_author', 'yes', 'F-123456', 'QS 500', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-07 13:50:18', '2025-10-07 13:50:18', NULL, 3, 2, 'ab', 'somchai jaidee'),
(120, 162, 'Test Article', 'Test Journal', '2025-02-01', 'journal', 'T10', '0.000', '10.10.10', 'www.test.com', '123-456', 'Vol.Test', 'TCI', '45000.00', '0.00', '0.00', '0.00', '19898.00', '0.00', '0.00', '64898.00', '0.00', '', 1, 'first_author', 'yes', 'F-123456', 'QS 500', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-07 14:00:42', '2025-10-07 14:00:42', NULL, 3, 2, 'ab', 'somchai jaidee'),
(121, 163, 'Test Article', 'Test Journal', '2025-03-01', 'journal', 'T5', '0.000', '10.10.10', 'www.test.com', '123-456', 'Vol.Test', 'ISI', '50000.00', '0.00', '0.00', '0.00', '20000.00', '0.00', '0.00', '70000.00', '0.00', '', 1, 'first_author', 'yes', NULL, 'QS 500', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-07 14:23:20', '2025-10-07 14:33:37', NULL, 3, 2, 'ab', 'somchai jaidee'),
(122, 164, 'Test Article', 'Test Journal', '2025-02-01', 'journal', 'T10', '0.000', '10.10.10', 'www.test.com', '123-456', 'Vol.Test', 'Web of Science', '45000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '45000.00', '0.00', '', 1, 'first_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-07 14:57:03', '2025-10-07 14:57:03', NULL, 3, 2, 'AB', 'somchai jaidee'),
(123, 165, 'Test Article', 'Test Journal', '2025-03-01', 'journal', 'T10', '0.000', '10.10.10', 'www.test.com', '123-456', 'Vol.Test', 'ISI', '45000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '45000.00', '0.00', '', 1, 'first_author', 'yes', 'F-123456', 'QS 500', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-07 15:08:08', '2025-10-07 15:08:08', NULL, 3, 2, 'AB', 'somchai jaidee'),
(124, 166, 'Test Article', 'Test Journal', '2025-06-01', 'journal', 'T10', '0.000', '10.10.10', 'www.test.com', '123-456', 'Vol.Test', 'Scopus, Web of Science', '45000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '45000.00', '0.00', '', 1, 'first_author', 'yes', 'F-123456', 'QS 500', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-07 15:45:13', '2025-10-07 15:45:13', NULL, 3, 2, 'abv', 'somchai jaidee');

-- --------------------------------------------------------

--
-- โครงสร้างตาราง `publication_reward_rates`
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
-- dump ตาราง `publication_reward_rates`
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
-- โครงสร้างตาราง `research_fund_admin_events`
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

--
-- dump ตาราง `research_fund_admin_events`
--

INSERT INTO `research_fund_admin_events` (`event_id`, `submission_id`, `status_after_id`, `amount`, `comment`, `created_by`, `created_at`) VALUES
(17, 130, 2, '12000.00', 'จ่ายทุนงวดแรก', 7, '2025-10-06 22:32:29'),
(18, 130, 2, '15000.00', 'จ่ายทุนงวดที่ 2', 7, '2025-10-06 22:33:03'),
(19, 130, 7, '20000.00', 'จ่ายงวดสุดท้าย', 7, '2025-10-06 22:34:24'),
(20, 135, 2, '5000.00', 'ให้ 5000', 7, '2025-10-07 13:16:04'),
(21, 135, 2, '5000.00', 'test', 7, '2025-10-07 13:20:33');

-- --------------------------------------------------------

--
-- โครงสร้างตาราง `research_fund_event_files`
--

CREATE TABLE `research_fund_event_files` (
  `event_file_id` int(11) NOT NULL,
  `event_id` int(11) NOT NULL,
  `file_id` int(11) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- dump ตาราง `research_fund_event_files`
--

INSERT INTO `research_fund_event_files` (`event_file_id`, `event_id`, `file_id`, `created_at`) VALUES
(4, 17, 345, '2025-10-06 22:32:29'),
(5, 18, 346, '2025-10-06 22:33:03'),
(6, 19, 347, '2025-10-06 22:34:24'),
(7, 20, 350, '2025-10-07 13:16:04'),
(8, 21, 351, '2025-10-07 13:20:33');

-- --------------------------------------------------------

--
-- โครงสร้างตาราง `reward_config`
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
-- dump ตาราง `reward_config`
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
-- โครงสร้างตาราง `roles`
--

CREATE TABLE `roles` (
  `role_id` int(11) NOT NULL,
  `role` varchar(255) DEFAULT NULL,
  `create_at` datetime DEFAULT current_timestamp(),
  `update_at` datetime DEFAULT NULL ON UPDATE current_timestamp(),
  `delete_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- dump ตาราง `roles`
--

INSERT INTO `roles` (`role_id`, `role`, `create_at`, `update_at`, `delete_at`) VALUES
(1, 'teacher', '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL),
(2, 'staff', '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL),
(3, 'admin', '2025-06-24 16:49:13', '2025-06-24 16:49:13', NULL),
(4, 'dept_head', '2025-09-21 19:03:02', '2025-09-21 19:03:05', NULL);

-- --------------------------------------------------------

--
-- โครงสร้างตาราง `scholar_import_runs`
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
-- dump ตาราง `scholar_import_runs`
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
(18, 'timer', 'success', NULL, '2025-10-04 00:00:19', '2025-10-04 00:01:50', 2, 0, 18, 0, 18, 0, '2025-10-04 00:00:19', '2025-10-04 00:01:50', NULL),
(19, 'timer', 'success', NULL, '2025-10-05 00:00:01', '2025-10-05 00:01:31', 2, 0, 18, 0, 18, 0, '2025-10-05 00:00:01', '2025-10-05 00:01:31', NULL),
(20, 'timer', 'success', NULL, '2025-10-06 00:00:00', '2025-10-06 00:01:29', 2, 0, 18, 0, 18, 0, '2025-10-06 00:00:00', '2025-10-06 00:01:29', NULL),
(21, 'timer', 'success', NULL, '2025-10-07 00:00:04', '2025-10-07 00:01:34', 2, 0, 18, 0, 18, 0, '2025-10-07 00:00:04', '2025-10-07 00:01:34', NULL);

-- --------------------------------------------------------

--
-- โครงสร้างตาราง `subcategory_budgets`
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
  `level` enum('ต้น','กลาง','สูง') DEFAULT NULL COMMENT 'ไม่ได้ใช้',
  `status` enum('active','disable') DEFAULT NULL,
  `fund_description` text DEFAULT NULL,
  `comment` text DEFAULT NULL,
  `create_at` datetime DEFAULT current_timestamp(),
  `update_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `delete_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- dump ตาราง `subcategory_budgets`
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
-- โครงสร้างตาราง `submissions`
--

CREATE TABLE `submissions` (
  `submission_id` int(11) NOT NULL,
  `submission_type` enum('fund_application','publication_reward') NOT NULL COMMENT 'ใช้ในการ generate submission number',
  `submission_number` varchar(255) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `year_id` int(11) NOT NULL,
  `category_id` int(11) DEFAULT NULL,
  `subcategory_id` int(11) DEFAULT NULL,
  `subcategory_budget_id` int(11) DEFAULT NULL,
  `status_id` int(11) NOT NULL,
  `submitted_at` datetime DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `head_rejected_by` int(11) DEFAULT NULL,
  `head_rejected_at` datetime DEFAULT NULL,
  `head_rejection_reason` text DEFAULT NULL,
  `head_approved_by` int(11) DEFAULT NULL,
  `head_approved_at` datetime DEFAULT NULL,
  `head_comment` text DEFAULT NULL,
  `head_signature` varchar(255) DEFAULT NULL,
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
  `completed_at` datetime DEFAULT NULL COMMENT 'ไม่ได้ใช้',
  `closed_at` datetime DEFAULT NULL COMMENT 'ไม่ได้ใช้',
  `comment` text DEFAULT NULL COMMENT 'ไม่ได้ใช้',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- dump ตาราง `submissions`
--

INSERT INTO `submissions` (`submission_id`, `submission_type`, `submission_number`, `user_id`, `year_id`, `category_id`, `subcategory_id`, `subcategory_budget_id`, `status_id`, `submitted_at`, `reviewed_at`, `head_rejected_by`, `head_rejected_at`, `head_rejection_reason`, `head_approved_by`, `head_approved_at`, `head_comment`, `head_signature`, `admin_approved_by`, `admin_approved_at`, `admin_rejected_by`, `admin_rejected_at`, `admin_rejection_reason`, `admin_comment`, `rejected_by`, `rejected_at`, `rejection_reason`, `approved_at`, `approved_by`, `completed_at`, `closed_at`, `comment`, `created_at`, `updated_at`, `deleted_at`) VALUES
(116, 'publication_reward', 'PR-25680925-0001', 8, 3, 2, 14, 20, 1, '2025-09-25 17:03:36', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-25 17:03:36', '2025-09-25 17:03:36', NULL),
(117, 'publication_reward', 'PR-25680925-0002', 8, 3, 2, 14, 22, 2, '2025-09-25 17:27:15', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 7, '2025-09-29 12:06:57', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-29 12:06:57', 7, NULL, NULL, NULL, '2025-09-25 17:27:15', '2025-10-03 12:21:06', NULL),
(118, 'publication_reward', 'PR-25680925-0003', 8, 3, 2, 14, 19, 1, '2025-09-25 17:29:17', '2025-09-26 12:44:10', NULL, NULL, NULL, 13, '2025-09-26 12:44:10', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-25 17:29:17', '2025-10-05 15:54:59', NULL),
(119, 'publication_reward', 'PR-25680925-0004', 8, 3, 2, 15, 31, 1, '2025-09-25 17:31:06', '2025-09-26 15:58:43', NULL, NULL, NULL, 13, '2025-09-26 15:58:43', 'asdasd', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 13, '2025-09-26 15:58:43', 'asdasd', NULL, NULL, NULL, NULL, NULL, '2025-09-25 17:31:05', '2025-10-05 15:55:14', NULL),
(120, 'publication_reward', 'PR-25680925-0005', 8, 3, 2, 14, 20, 1, '2025-09-25 17:35:32', '2025-09-26 07:28:05', NULL, NULL, NULL, 13, '2025-09-26 07:28:05', 'asad', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 13, '2025-09-26 07:28:05', 'asad', NULL, NULL, NULL, NULL, NULL, '2025-09-25 17:35:31', '2025-10-05 15:55:17', NULL),
(121, 'fund_application', 'FA-25680926-0001', 12, 3, 1, 1, 1, 1, '2025-09-26 08:42:51', '2025-10-05 15:09:05', NULL, NULL, NULL, 13, '2025-10-05 15:09:05', 'FA ผ่าน', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-26 08:42:51', '2025-10-05 15:37:43', NULL),
(122, 'publication_reward', 'PR-25680926-0006', 8, 3, 2, 14, 21, 1, '2025-09-26 23:33:11', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-26 23:33:11', '2025-10-05 15:55:21', NULL),
(123, 'publication_reward', 'PR-25680930-0007', 8, 3, 2, 14, 19, 1, '2025-09-30 13:41:38', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-30 13:41:38', '2025-10-05 15:55:23', NULL),
(124, 'publication_reward', 'PR-25681001-0008', 8, 3, 2, 15, 21, 1, '2025-10-01 13:16:58', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-01 13:16:58', '2025-10-05 15:55:29', NULL),
(125, 'publication_reward', 'PR-25681001-0009', 8, 3, 2, 14, 19, 1, '2025-10-01 20:52:43', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-01 20:52:43', '2025-10-05 15:55:33', NULL),
(126, 'publication_reward', 'PR-25681002-0010', 8, 3, 2, 14, 19, 1, '2025-10-02 00:33:52', '2025-10-05 16:00:36', NULL, NULL, NULL, 13, '2025-10-05 16:00:36', 'PR APPROVE', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-02 00:33:52', '2025-10-05 16:00:36', NULL),
(127, 'publication_reward', 'PR-25681002-0011', 8, 3, 2, 14, 22, 3, '2025-10-02 12:12:36', '2025-10-05 16:00:49', 13, '2025-10-05 16:00:49', 'NOOO', NULL, NULL, 'PR REJECT', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-02 12:12:36', '2025-10-05 16:00:49', NULL),
(128, 'publication_reward', 'PR-25681002-0012', 8, 3, 2, 14, 20, 3, '2025-10-02 12:21:39', '2025-10-05 15:00:46', 13, '2025-10-05 15:00:46', 'ข้อมูลหาย', 13, '2025-10-05 15:00:46', 'ไม่ผ่าน2', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-02 12:21:39', '2025-10-05 15:38:11', NULL),
(129, 'publication_reward', 'PR-25681002-0013', 8, 3, 2, 14, 20, 1, '2025-10-02 12:40:26', '2025-10-05 15:00:21', NULL, NULL, NULL, 13, '2025-10-05 15:00:21', 'ผ่าน1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-02 12:40:26', '2025-10-05 15:37:43', NULL),
(130, 'fund_application', 'FA-25681002-0002', 8, 3, 1, 1, 1, 7, '2025-10-02 14:11:19', NULL, NULL, NULL, NULL, NULL, NULL, 'ผ่านเลย', NULL, 7, '2025-10-05 20:51:37', NULL, NULL, NULL, 'No Comment', NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-06 22:34:24', NULL, '2025-10-02 14:11:19', '2025-10-06 23:44:06', NULL),
(131, 'fund_application', 'FA-25681002-0003', 8, 3, 1, 1, 1, 3, '2025-10-02 14:40:48', '2025-10-05 15:11:04', 13, '2025-10-05 15:11:04', 'ข้อมูลไม่ครบ', 13, '2025-10-05 15:11:04', 'FA ไม่ผ่าน', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-02 14:40:48', '2025-10-05 15:38:11', NULL),
(132, 'fund_application', 'FA-25681002-0004', 8, 3, 1, 1, 1, 3, '2025-10-02 14:55:31', '2025-10-05 15:59:38', 13, '2025-10-05 15:59:38', 'NO C', NULL, NULL, 'FA REJECT', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-02 14:55:31', '2025-10-05 15:59:38', NULL),
(133, 'fund_application', 'FA-25681002-0005', 8, 3, 1, 1, 1, 2, '2025-10-02 15:11:00', '2025-10-05 15:56:19', NULL, NULL, NULL, 13, '2025-10-05 15:56:19', 'FA APPROVE', NULL, 7, '2025-10-05 20:15:31', NULL, NULL, NULL, 'ผ่าน', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-02 15:10:59', '2025-10-05 20:15:31', NULL),
(134, 'fund_application', 'FA-25681002-0006', 8, 3, 1, 1, 1, 3, '2025-10-02 15:26:43', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 7, '2025-10-03 13:39:13', 'ไม่อนุมัติ', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-02 15:26:43', '2025-10-03 13:39:13', NULL),
(135, 'fund_application', 'FA-25681002-0007', 8, 3, 1, 1, 1, 2, '2025-10-02 15:42:15', '2025-10-05 14:36:00', NULL, NULL, NULL, 13, '2025-10-05 14:36:00', 'YES APRROVE', NULL, 7, '2025-10-05 20:19:12', NULL, NULL, NULL, 'MOMO', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-02 15:42:15', '2025-10-07 13:20:33', NULL),
(136, 'publication_reward', 'PR-25681003-0014', 13, 3, 2, 14, 31, 1, '2025-10-03 15:49:50', '2025-10-04 14:57:40', NULL, NULL, NULL, 13, '2025-10-04 14:57:40', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-03 15:49:50', '2025-10-04 14:57:40', NULL),
(137, 'publication_reward', 'PR-2568-0015', 8, 3, 2, 15, 20, 6, '2025-10-05 15:56:14', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-05 15:56:14', '2025-10-05 15:56:14', NULL),
(138, 'publication_reward', 'PR-2568-0016', 8, 3, 2, 14, 33, 6, '2025-10-05 15:58:15', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-05 15:58:15', '2025-10-05 15:58:15', NULL),
(139, 'publication_reward', 'PR-2568-0017', 8, 3, 2, 14, 33, 6, '2025-10-05 15:59:47', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-05 15:59:47', '2025-10-05 19:27:54', NULL),
(140, 'publication_reward', 'PR-2568-0018', 8, 3, 2, 14, 33, 6, '2025-10-05 16:00:48', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-05 16:00:48', '2025-10-05 19:27:56', NULL),
(141, 'publication_reward', 'PR-2568-0019', 8, 3, 2, 14, 22, 6, '2025-10-05 16:01:57', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-05 16:01:57', '2025-10-05 16:01:57', NULL),
(142, 'publication_reward', 'PR-2568-0020', 8, 3, 2, 14, 33, 6, '2025-10-05 17:08:25', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-05 17:08:25', '2025-10-05 17:08:25', NULL),
(143, 'publication_reward', 'PR-2568-0021', 8, 3, 2, 14, 33, 6, '2025-10-05 17:21:26', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-05 17:21:26', '2025-10-05 17:21:26', NULL),
(144, 'publication_reward', 'PR-2568-0022', 8, 3, 2, 14, 33, 6, '2025-10-05 17:30:59', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-05 17:30:59', '2025-10-05 17:30:59', NULL),
(145, 'publication_reward', 'PR-2568-0023', 8, 3, 2, 14, 33, 6, '2025-10-05 17:33:25', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-05 17:33:24', '2025-10-05 17:33:25', NULL),
(146, 'publication_reward', 'PR-2568-0024', 8, 3, 2, 14, 19, 6, '2025-10-05 17:34:12', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-05 17:34:12', '2025-10-05 17:34:12', NULL),
(147, 'publication_reward', 'PR-2568-0025', 8, 3, 2, 14, 33, 6, '2025-10-05 17:41:26', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-05 17:41:26', '2025-10-05 17:41:26', NULL),
(148, 'publication_reward', 'PR-2568-0026', 8, 3, 2, 15, 19, 6, '2025-10-05 17:50:36', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-05 17:50:36', '2025-10-05 17:50:36', NULL),
(149, 'publication_reward', 'PR-2568-0027', 8, 3, 2, 15, 20, 6, '2025-10-05 18:03:19', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-05 18:03:19', '2025-10-05 18:03:19', NULL),
(150, 'publication_reward', 'PR-2568-0028', 8, 3, 2, 15, 21, 6, '2025-10-05 18:04:30', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-05 18:04:30', '2025-10-05 18:04:30', NULL),
(151, 'publication_reward', 'PR-2568-0029', 8, 3, 2, 15, 22, 6, '2025-10-05 18:05:24', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-05 18:05:24', '2025-10-05 18:05:24', NULL),
(152, 'publication_reward', 'PR-2568-0030', 8, 3, 2, 15, 31, 6, '2025-10-05 18:06:18', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-05 18:06:18', '2025-10-05 18:06:18', NULL),
(153, 'publication_reward', 'PR-2568-0031', 8, 3, 2, 15, 32, 2, '2025-10-05 18:15:55', '2025-10-07 13:05:19', NULL, NULL, NULL, 13, '2025-10-07 13:05:19', 'test comment', 'test sign', 7, '2025-10-07 13:10:34', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-05 18:15:55', '2025-10-07 13:10:34', NULL),
(154, 'publication_reward', 'PR-2568-0032', 8, 3, 2, 15, 33, 1, '2025-10-05 18:17:03', '2025-10-07 12:44:35', NULL, NULL, NULL, 13, '2025-10-07 12:44:35', 'test comment', 'test sign', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-05 18:17:03', '2025-10-07 12:44:35', NULL),
(155, 'publication_reward', 'PR-2568-0033', 8, 3, 2, 14, 19, 3, '2025-10-05 18:25:41', '2025-10-06 23:02:30', 13, '2025-10-06 23:02:30', 'not approve from popup window', NULL, NULL, 'not approve', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-05 18:25:41', '2025-10-06 23:02:30', NULL),
(156, 'publication_reward', 'PR-2568-0034', 8, 3, 2, 14, 20, 1, '2025-10-05 18:26:50', '2025-10-06 22:50:09', NULL, NULL, NULL, 13, '2025-10-06 22:50:09', 'test comment', 'test sign', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-05 18:26:50', '2025-10-06 22:50:09', NULL),
(157, 'publication_reward', 'PR-2568-0035', 8, 3, 2, 14, 19, 1, '2025-10-05 18:28:42', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-05 18:28:42', '2025-10-05 19:28:21', NULL),
(158, 'publication_reward', 'PR-2568-0036', 8, 3, 2, 14, 19, 6, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-07 13:01:57', '2025-10-07 13:01:57', NULL),
(159, 'publication_reward', 'PR-2568-0037', 8, 3, 2, 14, 19, 6, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-07 13:28:28', '2025-10-07 13:28:28', NULL),
(160, 'publication_reward', 'PR-2568-0038', 8, 3, 2, 14, 20, 6, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-07 13:43:11', '2025-10-07 13:43:11', NULL),
(161, 'publication_reward', 'PR-2568-0039', 8, 3, 2, 14, 20, 6, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-07 13:50:18', '2025-10-07 13:50:18', NULL),
(162, 'publication_reward', 'PR-2568-0040', 8, 3, 2, 14, 20, 1, '2025-10-07 14:00:42', '2025-10-07 14:04:37', NULL, NULL, NULL, 13, '2025-10-07 14:04:37', 'Test', 'Test', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-07 14:00:41', '2025-10-07 14:04:37', NULL),
(163, 'publication_reward', 'PR-2568-0041', 8, 3, 2, 14, 19, 6, '2025-10-07 14:33:37', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-07 14:23:19', '2025-10-07 14:33:37', NULL),
(164, 'publication_reward', 'PR-2568-0042', 8, 3, 2, 14, 20, 6, '2025-10-07 14:57:03', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-07 14:57:02', '2025-10-07 14:57:03', NULL),
(165, 'publication_reward', 'PR-2568-0043', 8, 3, 2, 14, 20, 6, '2025-10-07 15:08:09', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-07 15:08:07', '2025-10-07 15:08:09', NULL),
(166, 'publication_reward', 'PR-2568-0044', 8, 3, 2, 14, 20, 1, '2025-10-07 15:45:14', '2025-10-07 15:59:49', NULL, NULL, NULL, 13, '2025-10-07 15:59:49', 'comment', 'sign head', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-07 15:45:13', '2025-10-07 15:59:49', NULL);

--
-- ทริกเกอร์ `submissions`
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
-- โครงสร้างตาราง `submission_documents`
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
-- dump ตาราง `submission_documents`
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
(258, 126, 258, 16, '', 3, 0, 0, NULL, NULL, '2025-10-02 00:33:52'),
(259, 127, 259, 2, 'sample-local-pdf.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-02 12:12:36'),
(260, 127, 260, 3, 'form.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-10-02 12:12:36'),
(261, 127, 261, 16, '', 3, 0, 0, NULL, NULL, '2025-10-02 12:12:36'),
(262, 128, 262, 2, 'sample-local-pdf.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-02 12:21:39'),
(263, 128, 263, 3, 'form.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-10-02 12:21:39'),
(264, 128, 264, 16, '', 3, 0, 0, NULL, NULL, '2025-10-02 12:21:39'),
(265, 129, 265, 2, 'form.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-02 12:40:26'),
(266, 129, 266, 3, 'sample-local-pdf.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-10-02 12:40:26'),
(267, 129, 267, 16, '', 3, 0, 0, NULL, NULL, '2025-10-02 12:40:26'),
(268, 130, 268, 3, 'form.pdf', 2, 0, 0, NULL, NULL, '2025-10-02 14:11:19'),
(269, 130, 270, 4, 'form.pdf', 3, 0, 0, NULL, NULL, '2025-10-02 14:11:19'),
(270, 130, 269, 2, 'form.pdf', 1, 0, 0, NULL, NULL, '2025-10-02 14:11:19'),
(271, 130, 271, 13, 'form.pdf', 4, 0, 0, NULL, NULL, '2025-10-02 14:11:19'),
(272, 131, 274, 13, 'form.pdf', 4, 0, 0, NULL, NULL, '2025-10-02 14:40:48'),
(273, 131, 273, 2, 'form.pdf', 1, 0, 0, NULL, NULL, '2025-10-02 14:40:48'),
(274, 131, 272, 3, 'form_sample.pdf', 2, 0, 0, NULL, NULL, '2025-10-02 14:40:48'),
(275, 131, 275, 4, 'form_sample.pdf', 3, 0, 0, NULL, NULL, '2025-10-02 14:40:48'),
(276, 132, 276, 4, 'form_sample.pdf', 3, 0, 0, NULL, NULL, '2025-10-02 14:55:31'),
(277, 132, 278, 3, 'form_sample.pdf', 2, 0, 0, NULL, NULL, '2025-10-02 14:55:31'),
(278, 132, 277, 2, 'form_sample.pdf', 1, 0, 0, NULL, NULL, '2025-10-02 14:55:31'),
(279, 133, 279, 2, 'form_sample.pdf', 1, 0, 0, NULL, NULL, '2025-10-02 15:11:00'),
(280, 133, 281, 4, 'form_sample.pdf', 3, 0, 0, NULL, NULL, '2025-10-02 15:11:00'),
(281, 133, 280, 3, 'form_sample.pdf', 2, 0, 0, NULL, NULL, '2025-10-02 15:11:00'),
(282, 134, 284, 2, 'form_sample.pdf', 1, 0, 0, NULL, NULL, '2025-10-02 15:26:43'),
(283, 134, 283, 4, 'form_sample.pdf', 3, 0, 0, NULL, NULL, '2025-10-02 15:26:43'),
(284, 134, 282, 3, 'form_sample.pdf', 2, 0, 0, NULL, NULL, '2025-10-02 15:26:43'),
(285, 135, 285, 2, 'form_sample.pdf', 1, 0, 0, NULL, NULL, '2025-10-02 15:42:15'),
(286, 135, 287, 4, 'form_sample.pdf', 3, 0, 0, NULL, NULL, '2025-10-02 15:42:15'),
(287, 135, 286, 3, 'form_sample.pdf', 2, 0, 0, NULL, NULL, '2025-10-02 15:42:15'),
(288, 136, 288, 2, 'sample.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-03 15:49:50'),
(289, 136, 289, 3, 'sample-local-pdf.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-10-03 15:49:50'),
(290, 136, 290, 16, '', 3, 0, 0, NULL, NULL, '2025-10-03 15:49:50'),
(291, 137, 291, 2, 'form_sample (1).pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-05 15:56:14'),
(292, 137, 292, 16, '', 2, 0, 0, NULL, NULL, '2025-10-05 15:56:14'),
(293, 138, 293, 2, 'form_sample (1).pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-05 15:58:15'),
(294, 138, 294, 16, '', 2, 0, 0, NULL, NULL, '2025-10-05 15:58:15'),
(295, 139, 295, 2, 'form_sample (1).pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-05 15:59:47'),
(296, 139, 296, 16, '', 2, 0, 0, NULL, NULL, '2025-10-05 15:59:47'),
(297, 140, 297, 2, 'form_sample (1).pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-05 16:00:48'),
(298, 140, 298, 16, '', 2, 0, 0, NULL, NULL, '2025-10-05 16:00:48'),
(299, 141, 299, 2, 'form_sample (1).pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-05 16:01:57'),
(300, 141, 300, 16, '', 2, 0, 0, NULL, NULL, '2025-10-05 16:01:57'),
(301, 142, 301, 2, 'form_sample (1).pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-05 17:08:25'),
(302, 142, 302, 16, '', 2, 0, 0, NULL, NULL, '2025-10-05 17:08:25'),
(303, 143, 303, 2, 'form_sample (1).pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-05 17:21:26'),
(304, 143, 304, 16, '', 2, 0, 0, NULL, NULL, '2025-10-05 17:21:26'),
(305, 144, 305, 2, 'form_sample (1).pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-05 17:30:59'),
(306, 144, 306, 16, '', 2, 0, 0, NULL, NULL, '2025-10-05 17:30:59'),
(307, 145, 307, 2, 'form_sample (1).pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-05 17:33:25'),
(308, 145, 308, 16, '', 2, 0, 0, NULL, NULL, '2025-10-05 17:33:25'),
(309, 146, 309, 2, 'form_sample (1).pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-05 17:34:12'),
(310, 146, 310, 16, '', 2, 0, 0, NULL, NULL, '2025-10-05 17:34:12'),
(311, 147, 311, 2, 'form_sample (1).pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-05 17:41:26'),
(312, 147, 312, 16, '', 2, 0, 0, NULL, NULL, '2025-10-05 17:41:26'),
(313, 148, 313, 2, 'form_sample (1).pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-05 17:50:36'),
(314, 148, 314, 3, 'form_sample (1).pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-10-05 17:50:36'),
(315, 148, 315, 16, '', 3, 0, 0, NULL, NULL, '2025-10-05 17:50:36'),
(316, 149, 316, 2, 'form_sample (1).pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-05 18:03:19'),
(317, 149, 317, 3, 'form_sample (1).pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-10-05 18:03:19'),
(318, 149, 318, 16, '', 3, 0, 0, NULL, NULL, '2025-10-05 18:03:19'),
(319, 150, 319, 2, 'form_sample (1).pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-05 18:04:30'),
(320, 150, 320, 3, 'form_sample (1).pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-10-05 18:04:30'),
(321, 150, 321, 16, '', 3, 0, 0, NULL, NULL, '2025-10-05 18:04:30'),
(322, 151, 322, 2, 'form_sample (1).pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-05 18:05:24'),
(323, 151, 323, 3, 'form_sample (1).pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-10-05 18:05:24'),
(324, 151, 324, 16, '', 3, 0, 0, NULL, NULL, '2025-10-05 18:05:24'),
(325, 152, 325, 2, 'form_sample (1).pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-05 18:06:18'),
(326, 152, 326, 3, 'form_sample (1).pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-10-05 18:06:18'),
(327, 152, 327, 16, '', 3, 0, 0, NULL, NULL, '2025-10-05 18:06:18'),
(328, 153, 328, 2, 'form_sample (1).pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-05 18:15:55'),
(329, 153, 329, 3, 'form_sample (1).pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-10-05 18:15:55'),
(330, 153, 330, 16, '', 3, 0, 0, NULL, NULL, '2025-10-05 18:15:55'),
(331, 154, 331, 2, 'form_sample (1).pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-05 18:17:03'),
(332, 154, 332, 3, 'form_sample (1).pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-10-05 18:17:03'),
(333, 154, 333, 16, '', 3, 0, 0, NULL, NULL, '2025-10-05 18:17:03'),
(334, 155, 334, 2, 'form_sample (1).pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-05 18:25:41'),
(335, 155, 335, 3, 'form_sample (1).pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-10-05 18:25:41'),
(336, 155, 336, 16, '', 3, 0, 0, NULL, NULL, '2025-10-05 18:25:41'),
(337, 156, 337, 2, 'form_sample (1).pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-05 18:26:50'),
(338, 156, 338, 3, 'form_sample (1).pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-10-05 18:26:50'),
(339, 156, 339, 16, '', 3, 0, 0, NULL, NULL, '2025-10-05 18:26:50'),
(340, 157, 340, 2, 'form_sample (1).pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-05 18:28:42'),
(341, 157, 341, 16, '', 2, 0, 0, NULL, NULL, '2025-10-05 18:28:42'),
(342, 154, 348, 20, '', 4, 0, 0, NULL, NULL, '2025-10-07 12:44:35'),
(343, 153, 349, 20, '', 4, 0, 0, NULL, NULL, '2025-10-07 13:05:19'),
(344, 162, 353, 2, 'form_sample (1).pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-07 14:00:42'),
(345, 162, 354, 3, 'form_sample (1).pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-10-07 14:00:42'),
(346, 162, 355, 16, '', 3, 0, 0, NULL, NULL, '2025-10-07 14:00:42'),
(347, 162, 356, 20, '', 4, 0, 0, NULL, NULL, '2025-10-07 14:04:37'),
(348, 163, 359, 2, 'form_sample (1).pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-07 14:33:37'),
(349, 163, 360, 3, 'publication_reward_preview.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-10-07 14:33:37'),
(350, 163, 361, 16, '', 3, 0, 0, NULL, NULL, '2025-10-07 14:33:37'),
(351, 164, 362, 2, 'form_sample (1).pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-07 14:57:03'),
(352, 164, 363, 3, 'form_sample.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-10-07 14:57:03'),
(353, 164, 364, 16, '', 3, 0, 0, NULL, NULL, '2025-10-07 14:57:03'),
(354, 165, 365, 2, 'form_sample.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-07 15:08:08'),
(355, 165, 366, 3, 'publication_reward_preview.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-10-07 15:08:09'),
(356, 165, 367, 16, '', 3, 0, 0, NULL, NULL, '2025-10-07 15:08:09'),
(357, 166, 368, 2, 'form_sample.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-07 15:45:13'),
(358, 166, 369, 3, 'form_sample (1).pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-10-07 15:45:14'),
(359, 166, 370, 16, '', 3, 0, 0, NULL, NULL, '2025-10-07 15:45:14'),
(360, 166, 371, 20, '', 4, 0, 0, NULL, NULL, '2025-10-07 15:59:49');

-- --------------------------------------------------------

--
-- โครงสร้างตาราง `submission_users`
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
-- dump ตาราง `submission_users`
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
(185, 126, 1, 'coauthor', 0, 2, '2025-10-02 00:33:52'),
(186, 127, 8, 'owner', 1, 1, '2025-10-02 12:12:36'),
(187, 127, 1, 'coauthor', 0, 2, '2025-10-02 12:12:36'),
(188, 128, 8, 'owner', 1, 1, '2025-10-02 12:21:39'),
(189, 129, 8, 'owner', 1, 1, '2025-10-02 12:40:26'),
(190, 136, 13, 'owner', 1, 1, '2025-10-03 15:49:50'),
(191, 136, 8, 'coauthor', 0, 2, '2025-10-03 15:49:50'),
(192, 137, 8, 'owner', 1, 1, '2025-10-05 15:56:14'),
(193, 138, 8, 'owner', 1, 1, '2025-10-05 15:58:15'),
(194, 139, 8, 'owner', 1, 1, '2025-10-05 15:59:47'),
(195, 140, 8, 'owner', 1, 1, '2025-10-05 16:00:48'),
(196, 141, 8, 'owner', 1, 1, '2025-10-05 16:01:57'),
(197, 142, 8, 'owner', 1, 1, '2025-10-05 17:08:25'),
(198, 143, 8, 'owner', 1, 1, '2025-10-05 17:21:26'),
(199, 144, 8, 'owner', 1, 1, '2025-10-05 17:30:59'),
(200, 145, 8, 'owner', 1, 1, '2025-10-05 17:33:25'),
(201, 146, 8, 'owner', 1, 1, '2025-10-05 17:34:12'),
(202, 147, 8, 'owner', 1, 1, '2025-10-05 17:41:26'),
(203, 148, 8, 'owner', 1, 1, '2025-10-05 17:50:36'),
(204, 149, 8, 'owner', 1, 1, '2025-10-05 18:03:19'),
(205, 150, 8, 'owner', 1, 1, '2025-10-05 18:04:30'),
(206, 151, 8, 'owner', 1, 1, '2025-10-05 18:05:24'),
(207, 152, 8, 'owner', 1, 1, '2025-10-05 18:06:18'),
(208, 153, 8, 'owner', 1, 1, '2025-10-05 18:15:55'),
(209, 154, 8, 'owner', 1, 1, '2025-10-05 18:17:03'),
(210, 155, 8, 'owner', 1, 1, '2025-10-05 18:25:41'),
(211, 156, 8, 'owner', 1, 1, '2025-10-05 18:26:50'),
(212, 157, 8, 'owner', 1, 1, '2025-10-05 18:28:42'),
(213, 158, 8, 'owner', 1, 1, '2025-10-07 13:01:58'),
(214, 159, 8, 'owner', 1, 1, '2025-10-07 13:28:28'),
(215, 160, 8, 'owner', 1, 1, '2025-10-07 13:43:12'),
(216, 161, 8, 'owner', 1, 1, '2025-10-07 13:50:18'),
(217, 162, 8, 'owner', 1, 1, '2025-10-07 14:00:41'),
(218, 163, 8, 'owner', 1, 1, '2025-10-07 14:23:20'),
(219, 164, 8, 'owner', 1, 1, '2025-10-07 14:57:03'),
(220, 165, 8, 'owner', 1, 1, '2025-10-07 15:08:08'),
(221, 166, 8, 'owner', 1, 1, '2025-10-07 15:45:13');

-- --------------------------------------------------------

--
-- โครงสร้างตาราง `system_config`
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
-- dump ตาราง `system_config`
--

INSERT INTO `system_config` (`config_id`, `system_version`, `last_updated`, `updated_by`, `current_year`, `start_date`, `end_date`, `main_annoucement`, `reward_announcement`, `activity_support_announcement`, `conference_announcement`, `service_announcement`, `kku_report_year`, `installment`) VALUES
(1, '1.0.0', '2025-10-05 00:46:28', 7, '2568', '2025-08-29 21:01:00', '2025-10-16 10:00:00', 3, 2, 4, 1, 2, '2568', 5);

-- --------------------------------------------------------

--
-- โครงสร้างตาราง `users`
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
  `delete_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- dump ตาราง `users`
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
(13, 'หัวหน้า', 'สาขา', 'female', 'depthead@cpkku.ac.th', NULL, '$2a$10$1med.YpeDE7LdwkGyGgUo.6M9gg9TdRVQXioesRxWU0yz58uQuLna', 4, 3, '2025-10-07', '2025-09-22 14:48:30', '2025-09-22 14:48:30', NULL),
(14, 'งามนิจ', 'อาจอินทร์', NULL, 'ngamnij@kku.ac.th', NULL, '$2a$10$4HpKnGcQlio9Xq4t8E8oSeNxxM6RSD9JmlmfoMSn/mLNJHjStXR5i', NULL, NULL, NULL, '2025-10-04 14:20:56', '2025-10-04 21:44:37', NULL),
(15, 'พุธษดี', 'ศิริแสงตระกูล', NULL, 'pusadee@kku.ac.th', NULL, '$2a$10$F3qwnLPaO64NO7323ws.I.RvBxutz/5ZeUS2hsdijOeOB.3JdFK9G', NULL, NULL, NULL, '2025-10-04 14:24:21', '2025-10-04 21:44:37', NULL),
(16, 'อุรฉัตร', 'โคแก้ว', NULL, 'urachart@kku.ac.th', NULL, '$2a$10$gt3NS.KR4GdSSIbWfm7W4O4hJoxf1JOy0a6lnjoOd96A0IjzbR68u', NULL, NULL, NULL, '2025-10-04 14:25:03', '2025-10-04 21:44:37', NULL),
(17, 'ปัญญาพล', 'หอระตะ', NULL, 'punhor1@kku.ac.th', NULL, '$2a$10$YH4cHc.e5j9AfQuCu4u33.AsKpzJRRwmrVoDUul71oI0N7X8aYKri', NULL, NULL, NULL, '2025-10-04 14:26:29', '2025-10-04 21:44:37', NULL),
(18, 'วชิราวุธ', 'ธรรมวิเศษ', NULL, 'twachi@kku.ac.th', NULL, '$2a$10$Rfl7ah0DiSifSPpySSP/nOeAMc2GYMDMJTDaSFZTmdd2JVEugnU/m', NULL, NULL, NULL, '2025-10-04 14:27:25', '2025-10-04 21:44:37', NULL),
(19, 'สุมณฑา', 'เกษมวิลาศ', NULL, 'sumkas@kku.ac.th', NULL, '$2a$10$16f.A.sumDui2.QtSOhUceM1qMiQJco9rRe1a6XR/zAJuPs0l0CdW', NULL, NULL, NULL, '2025-10-04 14:27:55', '2025-10-04 21:44:37', NULL),
(20, 'สิรภัทร', 'เชี่ยวชาญวัฒนา', NULL, 'sunkra@kku.ac.th', NULL, '$2a$10$eOV7Pb5brWREiOUyqeNI5OxypcmuBCIE9yelkiuFLLLVGzm8c1LKa', NULL, NULL, NULL, '2025-10-04 14:28:25', '2025-10-04 21:44:38', NULL),
(21, 'บุญทรัพย์', 'ไวคำ', NULL, 'boonsup@kku.ac.th', NULL, '$2a$10$gN1vou53vKzXpZMrRdFAO.8Bd7yqW4QXG0oGrIYUWHomqpQQFltJC', NULL, NULL, NULL, '2025-10-04 14:29:07', '2025-10-04 21:44:38', NULL),
(22, 'อุราวรรณ', 'จันทร์เกษ', NULL, 'curawa@kku.ac.th', NULL, '$2a$10$kNHO/RTh87Kid2XjQB7gleufj9rafR6v72uolmICXtwmPWPY5IsZ2', NULL, NULL, NULL, '2025-10-04 14:29:42', '2025-10-04 21:44:38', NULL),
(23, 'วรารัตน์', 'สงฆ์แป้น', NULL, 'wararat@kku.ac.th', NULL, '$2a$10$UIth2oqd4suiB7sQLACpd.EKR4YzVQmvmtUwyhAauj9xed5Rod2ji', NULL, NULL, NULL, '2025-10-04 14:30:58', '2025-10-04 21:44:38', NULL),
(24, 'ชัยพล', 'กีรติกสิกร', NULL, 'chaiyapon@kku.ac.th', NULL, '$2a$10$Vkf67vJ3wPTMPCEVn8iXW.28g/lLbWf.vTvIaJ3Phod6KOorDaxWy', NULL, NULL, NULL, '2025-10-04 14:31:42', '2025-10-04 21:44:38', NULL),
(25, 'ปวีณา', 'วันชัย', NULL, 'wpaweena@kku.ac.th', NULL, '$2a$10$mKshyMlPVYbLuPmmAQrBjeDaYfQJDmfyd43j35y5k2fO4KquDpFbe', NULL, NULL, NULL, '2025-10-04 14:31:51', '2025-10-04 21:44:38', NULL),
(26, 'สิลดา', 'อินทรโสธรฉันท์', NULL, 'silain@kku.ac.th', NULL, '$2a$10$Upk6PJD7RQ8Lbe4AW7EsDOIReU0G27kzorl6GwY4XjPETD10lYHv6', NULL, NULL, NULL, '2025-10-04 14:34:20', '2025-10-04 21:44:38', NULL),
(27, 'ณกร', 'วัฒนกิจ', NULL, 'nagon@kku.ac.th', NULL, '$2a$10$P1MwvheKfRo4iErtP134de64aHX9m94T49Q.M.TijSu5CZKLIqH06', NULL, NULL, NULL, '2025-10-04 14:35:06', '2025-10-04 21:44:39', NULL),
(28, 'มัลลิกา', 'วัฒนะ', NULL, 'monlwa@kku.ac.th', NULL, '$2a$10$EUJI5fYeXQRJHCfCououquVyjNhzaKU5aVEjUq9PZXWPUMeYX0JnS', NULL, NULL, NULL, '2025-10-04 14:35:29', '2025-10-04 21:44:39', NULL),
(29, 'สายยัญ', 'สายยศ', NULL, 'saiyan@kku.ac.th', NULL, '$2a$10$pOpwercKvW0gTdAoAArqGeX1P7Oq5WH6VQTnvddMrZalcTI/WGs5S', NULL, NULL, NULL, '2025-10-04 14:36:06', '2025-10-04 21:44:39', NULL),
(30, 'พิพัธน์', 'เรืองแสง', NULL, 'reungsang@kku.ac.th', NULL, '$2a$10$eG6l1jgJss8aFjsn24/xMuIcA17VxOA6ERw0xDLmfipPtGtDhsECO', NULL, NULL, NULL, '2025-10-04 14:36:40', '2025-10-04 21:44:39', NULL),
(31, 'จักรชัย', 'โสอินทร์', NULL, 'chakso@kku.ac.th', NULL, '$2a$10$kJkP/00IfgBTBclihYY6reTBAye9fb6JNTBVkAaprN.nP5RJZUddO', NULL, NULL, NULL, '2025-10-04 14:37:11', '2025-10-04 21:44:39', NULL),
(32, 'คำรณ', 'สุนัติ', NULL, 'skhamron@kku.ac.th', NULL, '$2a$10$RXDT8JgbvfAIQxBhzeBfQeG3HGjau7KhFgUO1AsHtn3gtLbDFN25.', NULL, NULL, NULL, '2025-10-04 14:37:59', '2025-10-04 21:44:39', NULL),
(33, 'ชิตสุธา', 'สุ่มเล็ก', NULL, 'chitsutha@kku.ac.th', NULL, '$2a$10$zDwigsaNvpGlsTyWVfl3A.b9B3XSnHcWd/QlcSVRmQIlqT1ijST3G', NULL, NULL, NULL, '2025-10-04 14:38:56', '2025-10-04 21:44:39', NULL),
(34, 'ธนพล', 'ตั้งชูพงศ์', NULL, 'thanaphon@kku.ac.th', NULL, '$2a$10$B2wFQqzkv8KiWVzSiGgNo.T8rH6BaXyTjmqFXXiU4ickGLsisDgne', NULL, NULL, NULL, '2025-10-04 14:41:33', '2025-10-04 21:44:40', NULL),
(35, 'วรัญญา', 'วรรณศรี', NULL, 'waruwu@kku.ac.th', NULL, '$2a$10$QBXutWzdBgnjOeqac.kQSe.LH2xxNv9ongTIRgKFHH6XXhhYstiD6', NULL, NULL, NULL, '2025-10-04 14:42:43', '2025-10-04 21:44:40', NULL),
(36, 'หัวหน้า', 'สาขา', 'male', 'forpassword@cpkku.ac.th', NULL, '$2a$10$qVdCxlPx1quNTW15DNhN0.eZFbdY0Y1Fw5PrM4zJLvbsUkjc3F8ZK', 1, 2, NULL, '2025-10-04 21:44:40', '2025-10-04 21:44:40', NULL),
(37, 'หัวหน้า', 'สาขา', 'male', 'forpassword2@cpkku.ac.th', NULL, '$2a$10$h.ILsvKAdo0LAU15A7hgk.OYtrC9x1ltHgZGsVedwNa1MGTkPlOqW', 1, 2, NULL, '2025-10-06 13:47:39', '2025-10-06 13:47:39', NULL);

-- --------------------------------------------------------

--
-- โครงสร้างตาราง `user_fund_eligibilities`
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

--
-- dump ตาราง `user_fund_eligibilities`
--

INSERT INTO `user_fund_eligibilities` (`user_fund_eligibility_id`, `user_id`, `year_id`, `category_id`, `remaining_quota`, `max_allowed_amount`, `remaining_applications`, `is_eligible`, `restriction_reason`, `calculated_at`, `create_at`, `update_at`, `delete_at`) VALUES
(1, 1, 1, 1, '200000.00', '200000.00', 1, 'yes', NULL, '2025-06-24 17:52:30', '2025-06-24 17:52:30', '2025-06-24 17:52:30', NULL),
(2, 2, 2, 2, '80000.00', '80000.00', 1, 'yes', NULL, '2025-06-24 17:52:30', '2025-06-24 17:52:30', '2025-06-24 17:52:30', NULL),
(3, 8, 2, 1, '125000.00', '0.00', 10, 'yes', NULL, '2025-06-24 17:52:30', '2025-06-24 17:52:30', '2025-06-24 17:52:30', NULL);

-- --------------------------------------------------------

--
-- โครงสร้างตาราง `user_scholar_metrics`
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
-- dump ตาราง `user_scholar_metrics`
--

INSERT INTO `user_scholar_metrics` (`user_id`, `hindex`, `hindex5y`, `i10index`, `i10index5y`, `citedby_total`, `citedby_5y`, `cites_per_year`, `updated_at`) VALUES
(8, 5, 5, 3, 2, 125, 97, '{\"2017\":1,\"2018\":6,\"2019\":21,\"2020\":8,\"2021\":13,\"2022\":19,\"2023\":24,\"2024\":16,\"2025\":17}', '2025-10-07 00:00:53'),
(9, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-07 00:01:34');

-- --------------------------------------------------------

--
-- โครงสร้างตาราง `user_sessions`
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
-- dump ตาราง `user_sessions`
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
(413, 13, '42100a55-ca86-4ed2-9825-38ce39d11fbd', 'x8HpRYLHW1n-qecjkFYLOW3p_coaWht8KhNoQ2S9iO8=', 'Chrome Browser', 'web', '27.145.211.4', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-04 11:53:32', '2025-11-03 08:51:17', 1, '2025-10-04 09:51:17', '2025-10-04 11:53:32'),
(414, 13, '0f36b925-9504-4a6a-94bb-d4b966da570e', 'GzwrmAKpxn6va19JlLJNU3GL3x4b6j-fzpSxbBcNeFc=', 'Chrome Browser', 'web', '27.145.211.4', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-04 14:16:20', '2025-11-03 10:58:49', 1, '2025-10-04 11:58:49', '2025-10-04 14:16:20'),
(415, 13, '7026fd9f-4af4-4e35-b0d9-85ebf48309b1', 'av-lCjFHJXR-DpoQXcl0z8-ogThakMonAqTpaOVcBNs=', 'Chrome Browser', 'web', '202.28.119.65', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-04 16:01:39', '2025-11-03 13:26:26', 1, '2025-10-04 14:26:26', '2025-10-04 16:01:39'),
(416, 13, '328cd1c0-b601-4d33-a677-26ce9e187e04', '2b8oQK4aVreIG24K9eEjf4HWh3ufLyGqOhUTSPAzuNA=', 'Chrome Browser', 'web', '27.145.211.4', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-04 16:01:45', '2025-11-03 15:01:44', 1, '2025-10-04 16:01:44', '2025-10-04 16:01:45'),
(417, 13, '91d1aeb5-ca2d-4fab-b03d-2146a3ab80d5', 'FZ7miAX8aRDsrPcCegWLPHgcufte0M84UCP8fT5j3Ms=', 'Chrome Browser', 'web', '27.145.211.4', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-04 16:02:08', '2025-11-03 15:02:05', 1, '2025-10-04 16:02:05', '2025-10-04 16:02:08'),
(418, 13, '7e9564f9-98ba-4fb2-9cf9-d588276c0856', 'Yon58jckEnFrDIvla6n5gb6eIUKSgziw2P0c_lRrkn0=', 'Chrome Browser', 'web', '27.145.211.4', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-04 16:02:51', '2025-11-03 15:02:50', 1, '2025-10-04 16:02:50', '2025-10-04 16:02:51'),
(419, 13, '68f5496c-d2fc-49b5-912f-57092b67be44', 'NOYJMStyLL-zsv_SK5-Zu89CTlX6Pkf3_Jbnry1RJ1k=', 'Chrome Browser', 'web', '27.145.211.4', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-04 17:31:12', '2025-11-03 15:05:32', 0, '2025-10-04 16:05:32', '2025-10-04 17:31:12'),
(420, 7, '396fb4f6-8f74-4d52-b4bc-3968421f0c25', 'JeSRiagFrGVXYkYZCe2GBytwyG2Cbr4s0X0l0o4XNDQ=', 'Chrome Browser', 'web', '27.145.211.4', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-04 18:29:13', '2025-11-03 16:31:19', 0, '2025-10-04 17:31:19', '2025-10-04 18:29:13'),
(421, 7, '8cb19a5d-8dd0-4608-884f-210d8e7048f6', 'If4LIrJR_Yz7F2hu1ay5pBG3W7HGDSf0Mydzx786YWo=', 'Chrome Browser', 'web', '202.28.118.91', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-04 18:24:34', '2025-11-03 17:22:42', 0, '2025-10-04 18:22:42', '2025-10-04 18:24:34'),
(422, 8, '194e6309-bee2-43df-a785-5ac702473f1b', 'a6t5788eKagDH-6v4LuoMGQqCIWnbOXP4zl6N3Acx70=', 'Chrome Browser', 'web', '202.28.118.91', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-04 18:29:51', '2025-11-03 17:24:37', 0, '2025-10-04 18:24:37', '2025-10-04 18:29:51'),
(423, 13, '4a8418aa-3f8e-4ab5-bc40-3a5f3ab8a493', '3T5SkhKAzsyUI67piJLBbXL2NLh0qKZDkao9USr8OyA=', 'Chrome Browser', 'web', '202.28.119.81', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-04 18:29:37', '2025-11-03 17:29:21', 0, '2025-10-04 18:29:21', '2025-10-04 18:29:38'),
(424, 7, '59f2cb7a-b3fe-4e9c-9cf3-9b9b7906eedc', 'juq_fKB4OpQAO5s8DXAqBXqYetxbmw7n6dF1h3AZD1M=', 'Chrome Browser', 'web', '202.28.118.91', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-04 18:30:12', '2025-11-03 17:29:54', 0, '2025-10-04 18:29:54', '2025-10-04 18:30:12'),
(425, 7, '1a11d3ad-1274-4ffd-89bc-2b804630eb65', 'et36HxonU1stRwLNvmEMh6KIilV6UyeeMF1Nkm5zjBU=', 'Chrome Browser', 'web', '202.28.119.81', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-04 18:48:16', '2025-11-03 17:30:15', 0, '2025-10-04 18:30:15', '2025-10-04 18:48:16'),
(426, 8, 'ee54a3b2-79a6-42f1-ae01-578bed40a0c4', '3qEOs2VdlzujPPAW4etNEMNQDmvPmyegW80pW9rV_Ng=', 'Chrome Browser', 'web', '202.28.118.91', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-04 18:30:33', '2025-11-03 17:30:16', 0, '2025-10-04 18:30:16', '2025-10-04 18:30:33'),
(427, 7, '8001905a-df3c-4466-8242-199504fa6e94', 'potlInsVKWygyQ4jXFoQxXM2tkVEidLWhw67Aw-X1QQ=', 'Chrome Browser', 'web', '202.28.118.91', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-04 18:33:07', '2025-11-03 17:30:35', 0, '2025-10-04 18:30:35', '2025-10-04 18:33:07'),
(428, 8, '0219822b-858f-45e4-be47-12471309c28a', '1zYejBZQEOEs1S07Wf2DKuHiTWYMxvoeLJWW6T7vfLs=', 'Chrome Browser', 'web', '202.28.118.91', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-04 18:35:19', '2025-11-03 17:33:09', 0, '2025-10-04 18:33:09', '2025-10-04 18:35:19'),
(429, 7, '843a1ebb-aab3-4276-a571-759253028fd4', 'GifgSvvHynkw0qlCOrId8YpfHcbzGIJrFRvyJfCTi1E=', 'Chrome Browser', 'web', '202.28.118.91', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-04 18:39:36', '2025-11-03 17:35:21', 0, '2025-10-04 18:35:21', '2025-10-04 18:39:36'),
(430, 7, 'b0426cd9-3a6d-4839-8d5e-2e3acf057cf5', '3srzNWu49TUkoiASFG736Mq0Czam9CMr-6eZeyPC7-A=', 'Chrome Browser', 'web', '202.28.118.91', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-04 18:39:25', '2025-11-03 17:37:27', 0, '2025-10-04 18:37:27', '2025-10-04 18:39:25'),
(431, 7, '478ba378-150c-49fd-82d1-6378376eba39', 'zF3gi5i1Zc7A7t147gZIR-KtJaZ7b-FpmLiceG91okI=', 'Chrome Browser', 'web', '202.28.118.91', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-04 18:51:47', '2025-11-03 17:39:40', 0, '2025-10-04 18:39:40', '2025-10-04 18:51:47'),
(432, 7, '1627825c-2e0a-4618-89fa-4ecd5f5c6139', 'QXGnGcRSZbEoFJ8kpDdjRjV9Wu1LLQZYCzpd7gH3OXU=', 'Chrome Browser', 'web', '202.28.119.81', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-04 21:05:09', '2025-11-03 17:48:25', 1, '2025-10-04 18:48:25', '2025-10-04 21:05:09'),
(433, 8, 'dfd59675-8b66-46fa-b118-f3051d7591b3', 'hZFT6y-cXOfddRAnTkLLVXIPyuNqaewnF4XnqYHkvjM=', 'Chrome Browser', 'web', '202.28.118.91', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-04 19:03:48', '2025-11-03 17:51:51', 0, '2025-10-04 18:51:51', '2025-10-04 19:03:48'),
(434, 7, 'ef285205-f791-49cd-9925-9e8bd968ee93', 'B9SJg6HfrMFF6CEhwC7hrmvySzqcFXJRAdIXaThos-I=', 'Chrome Browser', 'web', '202.28.118.91', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-04 19:04:05', '2025-11-03 18:03:50', 0, '2025-10-04 19:03:50', '2025-10-04 19:04:05'),
(435, 8, 'f6f104a0-dba6-40cb-86ee-4b11f1b93dda', '7HEN5X_fVnM4-d38YHXB-eEjAgVQxVuwYlLXwQLDYV0=', 'Chrome Browser', 'web', '202.28.118.91', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-04 19:09:34', '2025-11-03 18:04:08', 0, '2025-10-04 19:04:08', '2025-10-04 19:09:34'),
(436, 7, 'c7473a8e-30a8-4cf7-90d1-253412876ddc', 'cxsayfHr6hq4Eur8mfyMbfRNf56JKK4PLHopitNbY1w=', 'Chrome Browser', 'web', '202.28.118.91', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-04 19:12:55', '2025-11-03 18:09:36', 0, '2025-10-04 19:09:36', '2025-10-04 19:12:55'),
(437, 8, '07bb5564-b14f-464c-9520-d1cb1f6669ea', 'ZYD_1PRvaw5YFPIWDY-z2UDPMc02KrAVPyQgUP3KP_M=', 'Chrome Browser', 'web', '202.28.118.91', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-04 19:23:32', '2025-11-03 18:12:58', 0, '2025-10-04 19:12:58', '2025-10-04 19:23:32'),
(438, 7, '2b13b345-5a5e-44d5-984d-8d96b98d0db6', 'izqTBQMENZq7Ue6qLB7bbEHks73XZo2-i7Vqr6HGJsE=', 'Chrome Browser', 'web', '202.28.118.91', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-04 19:38:42', '2025-11-03 18:23:38', 0, '2025-10-04 19:23:38', '2025-10-04 19:38:42'),
(439, 8, 'c10ae82f-3f6e-4b81-a2cf-c3d5f1eb3fa3', 'vV7haFp1KTc-5tPHhIFaX7kLguIcgNjJvpkE5My16Y4=', 'Chrome Browser', 'web', '202.28.118.91', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-04 20:39:22', '2025-11-03 18:38:43', 0, '2025-10-04 19:38:43', '2025-10-04 20:39:22'),
(440, 7, 'c80a61e0-778f-460a-a317-5a52cd7a2266', 'P1MSk1KTSR_dIgE6LSuafirMDPeKs6UuhZyfMt3H250=', 'Chrome Browser', 'web', '202.28.118.91', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-04 20:40:05', '2025-11-03 19:39:24', 0, '2025-10-04 20:39:24', '2025-10-04 20:40:05'),
(441, 8, '9cfc0e91-2fd4-4c8b-a3b1-515a2a4680bd', 'qmR_nJRE6-vOtf8VBDrzba_SBHeIZyVrIP0_Ox4F_dY=', 'Chrome Browser', 'web', '202.28.118.91', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-04 20:42:14', '2025-11-03 19:40:08', 0, '2025-10-04 20:40:08', '2025-10-04 20:42:14'),
(442, 7, '12e98f14-26f0-4e9b-8664-c7384c7377fc', 'HWwlEMgUDC1qM8FqYfIeSh2Nz9FRuvCs_UepCIds9Fw=', 'Chrome Browser', 'web', '202.28.118.91', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-04 20:43:50', '2025-11-03 19:42:17', 0, '2025-10-04 20:42:17', '2025-10-04 20:43:50'),
(443, 8, '7e7541b9-2b00-4029-a3dc-bc6e9f2076bc', 'QocE2NFZz1N_VsfSeyPBBlzXMjC1tStoYePb09KWJpI=', 'Chrome Browser', 'web', '202.28.118.91', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-04 20:46:38', '2025-11-03 19:43:52', 0, '2025-10-04 20:43:52', '2025-10-04 20:46:38'),
(444, 8, '53e9e7ed-6354-4eb6-9af9-39c5dfe373ee', 'BQO0ZcjOU4x5Aj3Ho2_WXk6tyF9byPkQ9OXmH8NSs7g=', 'Chrome Browser', 'web', '202.28.118.91', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-04 20:46:54', '2025-11-03 19:46:39', 0, '2025-10-04 20:46:39', '2025-10-04 20:46:54'),
(445, 7, '86d164a5-5f4a-4a19-81d6-2239480a6414', '1eYuCvSwKtu-GINiekptebHysc6L8a7VzsIWEYSC780=', 'Chrome Browser', 'web', '202.28.118.91', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-04 20:52:13', '2025-11-03 19:46:56', 0, '2025-10-04 20:46:56', '2025-10-04 20:52:13'),
(446, 8, 'dbddbcc8-cd9b-43c9-8ad0-cf2bda46054f', '0YckqxL2sZihsLuJGg1cCjgS7ZYVlmWj6rHwBs9Y8hE=', 'Chrome Browser', 'web', '202.28.118.91', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-04 20:56:17', '2025-11-03 19:52:15', 0, '2025-10-04 20:52:15', '2025-10-04 20:56:17'),
(447, 7, 'c8f8879a-619b-417b-b7f7-d8470efe2192', '9x1Pi7oZVMr3xDpBpgrOsCHBz-2bRliHF-XfQHs2pN0=', 'Chrome Browser', 'web', '202.28.118.91', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-04 21:03:39', '2025-11-03 19:56:19', 0, '2025-10-04 20:56:19', '2025-10-04 21:03:39'),
(448, 7, 'cc110cdd-4c5a-40c6-905c-15cef2d44591', 'zhEfqQX5bDAxO50yjAS0jk8_6Egxy4obTnLdu4doOuM=', 'Chrome Browser', 'web', '202.28.118.91', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-04 21:20:46', '2025-11-03 20:03:40', 0, '2025-10-04 21:03:40', '2025-10-04 21:20:46'),
(449, 7, 'f1d490aa-4120-430d-b19e-e312c573adfc', 'kUjkApNDCnqYcx5QJ-kDlNjJ9tyooOeHOuzhkCzqlAg=', 'Chrome Browser', 'web', '202.28.119.81', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-05 00:59:47', '2025-11-03 20:09:29', 1, '2025-10-04 21:09:29', '2025-10-05 00:59:47'),
(450, 8, '47858742-6b09-4133-9fd0-ddc2e195fc7d', '3yZXT9wEReA1by3vk0zXp2wwomNWx9l4ezdtEMUgNVI=', 'Chrome Browser', 'web', '202.28.118.91', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-04 21:20:54', '2025-11-03 20:20:49', 0, '2025-10-04 21:20:49', '2025-10-04 21:20:54'),
(451, 7, '9287bfb4-7bf1-4a1e-b143-cb91a1d18857', 'lzjmsBaMtsx75Tnhb-JfhBlqGEygfory-j8k5VaCrV4=', 'Chrome Browser', 'web', '202.28.118.91', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-04 21:34:02', '2025-11-03 20:20:57', 0, '2025-10-04 21:20:57', '2025-10-04 21:34:02'),
(452, 8, '60898015-fbde-4556-84a3-373be586b35a', '8HHcqQTRm9W3KWlexUZspudkQdKUte85QHXsKzbrwXw=', 'Chrome Browser', 'web', '202.28.118.91', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-04 21:43:00', '2025-11-03 20:34:04', 0, '2025-10-04 21:34:04', '2025-10-04 21:43:00'),
(453, 7, 'dd949a04-1fd1-4360-8af6-2eb2a4a04759', 'yPIRIcmoH1akayVcdekjDwc0pAON9de6seLFBBStNok=', 'Chrome Browser', 'web', '202.28.118.91', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-04 22:09:31', '2025-11-03 20:43:03', 0, '2025-10-04 21:43:03', '2025-10-04 22:09:31'),
(454, 8, '56c93393-1ef9-4cb6-9533-b92297473b61', 'G9xpJTv_WRuhpAm2pzX99PE4ocfEvvWAzoddMb-4Tig=', 'Chrome Browser', 'web', '202.28.118.91', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-04 22:11:42', '2025-11-03 21:09:33', 0, '2025-10-04 22:09:33', '2025-10-04 22:11:42'),
(455, 8, '13af8eb8-5fb9-40b4-b7f8-e552d5922151', '799Pl-VMMfZpEoQ69TXGAjMthqnMDeNKipYrVF3hP40=', 'Chrome Browser', 'web', '202.28.118.91', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-04 22:51:33', '2025-11-03 21:18:39', 1, '2025-10-04 22:18:39', '2025-10-04 22:51:33'),
(456, 7, '174b1d47-a871-43d9-a1b8-47dc0349ed21', 'CouTNbBHKspA9bOQfddwdlMm4c-_-MjFVM_Jlxee-XI=', 'Chrome Browser', 'web', '202.28.119.81', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-05 01:38:06', '2025-11-04 00:11:23', 1, '2025-10-05 01:11:23', '2025-10-05 01:38:06'),
(457, 7, '7f6f4306-c984-44d9-9439-1141a3fac7ae', 'ZqeV6FZVRuPW_jgv82p1X9hGou8z7A6ughLtjeDrJPs=', 'Chrome Browser', 'web', '202.12.97.181', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-05 11:12:18', '2025-11-04 09:52:43', 0, '2025-10-05 10:52:43', '2025-10-05 11:12:18'),
(458, 8, '949a898c-fb70-4312-b403-7b2ef54aa369', 'lZIq8bLhqMcnuMZB7xpflM5ENvQFVdb4rXzNcRfmnUw=', 'Chrome Browser', 'web', '202.12.97.181', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-05 11:12:29', '2025-11-04 10:12:20', 0, '2025-10-05 11:12:20', '2025-10-05 11:12:29'),
(459, 13, '5b3e91be-ac23-49a1-a111-e87411109b9c', 'b-sq13baY6LozqjMYuU7pS5HuvW0NMZQZOwGz33TpK0=', 'Chrome Browser', 'web', '27.145.211.4', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-05 11:14:20', '2025-11-04 10:14:00', 0, '2025-10-05 11:14:00', '2025-10-05 11:14:20'),
(460, 13, '0f04ceb4-e750-44d7-bfed-2fc5e66f7593', 'jOGdADNoZQZJ-CneeihpwDf6GEfhDu64xYkT6ui5fNo=', 'Chrome Browser', 'web', '27.145.211.4', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-05 11:31:44', '2025-11-04 10:14:25', 1, '2025-10-05 11:14:25', '2025-10-05 11:31:44'),
(461, 8, '8513acac-c3cd-430e-9af2-aaf50588c889', 'dtct5_BHJWLs_XddGIYZy-v309-QPVdTdMDif5qa46Q=', 'Chrome Browser', 'web', '202.12.97.181', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-05 13:22:57', '2025-11-04 10:27:57', 0, '2025-10-05 11:27:57', '2025-10-05 13:22:57'),
(462, 13, '56915263-554e-4a09-a957-381ac9a63f4d', '7izuNLgc2LgW4onZWtvLHrLAK9QeGVeNq0MEnXCF1S8=', 'Chrome Browser', 'web', '202.12.97.181', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-05 14:36:14', '2025-11-04 12:22:59', 0, '2025-10-05 13:22:59', '2025-10-05 14:36:14'),
(463, 13, '40a53ad6-9c40-42d2-ba6c-bc355c70a104', 'J5JHk1O7nj1fAMfhHyZx2mOeSpISFykdETzpgr5qvt8=', 'Chrome Browser', 'web', '27.145.211.4', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-05 13:52:45', '2025-11-04 12:51:01', 0, '2025-10-05 13:51:01', '2025-10-05 13:52:45'),
(464, 8, '3b34f973-c817-4651-a014-1e55a05bbde3', 'OxrUhP32DKfwTYVDKW5olJnA2pP-tDvyCYLQbCI1tmw=', 'Chrome Browser', 'web', '27.145.211.4', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-05 15:00:04', '2025-11-04 12:52:52', 0, '2025-10-05 13:52:52', '2025-10-05 15:00:04'),
(465, 11, '75a07f8f-8e53-4b0b-abae-ccba47bdf9cb', 'ePKWSNTLgCcP5aYpE4Igdlv6F-pIXtE__tSrBhk0bR0=', 'Chrome Browser', 'web', '58.10.72.49', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-05 15:52:42', '2025-11-04 13:36:18', 0, '2025-10-05 14:36:18', '2025-10-05 15:52:42'),
(466, 13, '439a3624-7ec4-44d5-9672-97eff1727749', '_QM2tgCX18mvFzqVOX4ThNPRQZb0D5RyWnnUCVd9cMs=', 'Chrome Browser', 'web', '27.145.211.4', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-05 19:25:02', '2025-11-04 14:00:11', 0, '2025-10-05 15:00:11', '2025-10-05 19:25:02'),
(467, 8, '3f753bf3-bae9-4808-b0a0-ed192c7af6d2', 'Hdoavnb_vUlktmpiKRo2d3b68gTs-XG9QFiR0Fy9yT8=', 'Chrome Browser', 'web', '58.10.72.49', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-05 16:01:58', '2025-11-04 14:52:45', 1, '2025-10-05 15:52:45', '2025-10-05 16:01:58'),
(468, 8, '6488f70a-bc1f-42bc-b93d-225c1caf559f', 'kgvyWN-RfAGxJHE3bD5qD8TtKJuS_NBXPh6IOWJYTaQ=', 'Chrome Browser', 'web', '58.10.72.49', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-05 18:09:31', '2025-11-04 16:07:39', 0, '2025-10-05 17:07:39', '2025-10-05 18:09:31'),
(469, 7, '0a0c5ded-cdb1-4952-b35d-2434ce333a27', 'Hc5loPMCTZwdAbYA5d_vY1sOSVHJXDLbZbnDDmRfcVY=', 'Chrome Browser', 'web', '58.10.72.49', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-05 18:14:20', '2025-11-04 17:09:34', 0, '2025-10-05 18:09:34', '2025-10-05 18:14:20'),
(470, 8, '5ffa1e96-f911-41ce-9d24-7aaec0a056ab', 'NWa3hYfG50sVVNkqKKTFPh38SdqoOc2br-j9u_hXZ3I=', 'Chrome Browser', 'web', '58.10.72.49', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-05 18:38:20', '2025-11-04 17:14:22', 0, '2025-10-05 18:14:22', '2025-10-05 18:38:20'),
(471, 13, '86d52d88-0d0d-448a-942b-e01aa782bf7d', 'GSvzTCW4Ta4o86HIZ4Rc9-_Lf_pbKSwir_QP6NFzl7Y=', 'Chrome Browser', 'web', '58.10.72.49', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-05 19:33:21', '2025-11-04 17:38:21', 1, '2025-10-05 18:38:21', '2025-10-05 19:33:21'),
(472, 7, 'aef064b1-0ef3-42b2-b9b6-be2891757ae3', '9R6NcnjU-HSRWDQ0J6EFHOsbuGx1KF_6KtDi2WO5iME=', 'Chrome Browser', 'web', '27.145.211.4', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-05 21:07:09', '2025-11-04 18:25:06', 1, '2025-10-05 19:25:06', '2025-10-05 21:07:09'),
(473, 7, '7ec331dc-9307-456c-b936-6fbb355cbfd9', 'CMuupVRv1RE3VPqhoIM9qAsoDSs8ydbRACyGtY2q9Jw=', 'Chrome Browser', 'web', '27.145.211.4', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-06 00:05:12', '2025-11-04 23:05:12', 1, '2025-10-06 00:05:12', '2025-10-06 00:05:12'),
(474, 7, '39b0f2a5-73b2-4ddc-8c8f-512ab452dd0c', 'O56OuXHcfVbOXCHlUo9ZovKKa31YrWKDMEnjdcndwtY=', 'Chrome Browser', 'web', '27.145.211.4', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-06 04:07:38', '2025-11-05 02:55:26', 1, '2025-10-06 03:55:26', '2025-10-06 04:07:38'),
(475, 8, 'e46cc37f-3e0a-46f8-b1e3-a2894db2ab87', 'UpSttBNJ76MFhr1mE6T-MQc5ucP5TCy8fhQek84U2oM=', 'Chrome Browser', 'web', '202.12.97.133', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-06 09:25:07', '2025-11-05 08:15:38', 0, '2025-10-06 09:15:38', '2025-10-06 09:25:07'),
(476, 7, 'f6ec0dbb-6549-4a68-b8f4-b13121a5e0f7', 'aZswfVVA8lS3I-g78INvAUnZnnILl5if6XkEr32iVAQ=', 'Chrome Browser', 'web', '202.12.97.133', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-06 10:47:16', '2025-11-05 08:25:13', 0, '2025-10-06 09:25:13', '2025-10-06 10:47:16'),
(477, 8, '444ca8b2-f02a-4bc0-9dd8-5c6a0d906ace', 'MYBwfaDNz76tW930Dmyj2_aygInEw2by65nKFInFORY=', 'Chrome Browser', 'web', '202.12.97.133', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-06 12:02:31', '2025-11-05 09:47:18', 0, '2025-10-06 10:47:18', '2025-10-06 12:02:31'),
(478, 7, 'be1bc7ed-498b-4929-b0e2-72dd1114084e', 'czwNQX0WvKVrJ-boyWof_MEv_WNDNXQw6tWK1Rqc1JA=', 'Chrome Browser', 'web', '202.12.97.133', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-06 12:02:37', '2025-11-05 11:02:34', 0, '2025-10-06 12:02:34', '2025-10-06 12:02:37'),
(479, 8, '8c07646f-61b3-4477-bb0e-78e49acf8128', 'us88mSRQWZzv6ON3rFoCacI54i2Ev5TF16Pbs-bN_pY=', 'Chrome Browser', 'web', '202.12.97.133', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-06 13:17:12', '2025-11-05 11:02:42', 0, '2025-10-06 12:02:42', '2025-10-06 13:17:12'),
(480, 7, '21886ed5-8537-4845-b051-c7db1bddd843', 'g_KW1PEDJ8CFqYKi84-m1B8yF0DU5uyqNsfcnmDNYfs=', 'Chrome Browser', 'web', '27.145.211.4', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-06 13:41:41', '2025-11-05 12:10:52', 1, '2025-10-06 13:10:52', '2025-10-06 13:41:41'),
(481, 7, '1cef9c28-5a3d-4352-83ea-a8f35666c488', 'nyEyhoEytGDALPMbBZEoyolxwFSLAa-3IopUQMkdHAQ=', 'Chrome Browser', 'web', '202.12.97.133', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-06 13:17:51', '2025-11-05 12:17:15', 0, '2025-10-06 13:17:15', '2025-10-06 13:17:51'),
(482, 13, '590258e7-e025-44a0-8d7a-0a9a157acf4a', 'rxxTy-advxZSQOHC38LQWDQg1effyZf8SkRf5Jf0Pi8=', 'Chrome Browser', 'web', '202.12.97.133', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-06 13:28:44', '2025-11-05 12:17:54', 0, '2025-10-06 13:17:54', '2025-10-06 13:28:44'),
(483, 7, '3f518ff2-5abf-4fe9-8b20-891f8dccadd4', 'BwPBQqrhFh8Am0LXSkX1fYnk8C7U8gfu5RNI-QyuT1c=', 'Chrome Browser', 'web', '202.12.97.133', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-06 13:47:38', '2025-11-05 12:28:58', 0, '2025-10-06 13:28:58', '2025-10-06 13:47:38'),
(484, 13, 'f1490a2f-283d-4898-9138-b1406fe77e43', 'XTR5siCrHbIlrxOpqTjAUxa0gAHJRNeus4ImKhF8-iY=', 'Chrome Browser', 'web', '202.12.97.133', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-06 13:48:45', '2025-11-05 12:47:41', 1, '2025-10-06 13:47:41', '2025-10-06 13:48:45'),
(485, 7, 'bda0bcad-7047-415b-980d-ddd4d174c2f3', 'z6eBhaQ1QPZlIjvxbYduRauP2-vi3i5U--76JI9vHPY=', 'Chrome Browser', 'web', '27.145.211.4', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-06 15:05:37', '2025-11-05 13:30:46', 1, '2025-10-06 14:30:46', '2025-10-06 15:05:37'),
(486, 7, 'fbc3b16d-d607-4f97-8dce-566d682f8405', 'WqroYZQnRzNF8sGpJg0RjePIiqZbyoyqg4Plqs5wK-M=', 'Chrome Browser', 'web', '27.145.211.4', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-06 18:15:33', '2025-11-05 14:53:16', 1, '2025-10-06 15:53:16', '2025-10-06 18:15:33'),
(487, 13, 'ca9481ea-22c5-4751-be55-3ba073fdd0ac', '7LsZowZvlR9NQJT5RPQhhb3zrEovMG_mkJ2WUlImTMs=', 'Chrome Browser', 'web', '58.10.78.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-06 23:02:31', '2025-11-05 16:24:56', 1, '2025-10-06 17:24:56', '2025-10-06 23:02:31'),
(488, 7, '5289b3cd-7b80-4deb-9cf4-45d68533f430', 'MLEpsTSqraYxph95fWAXAIxcZbop7qM21I813jm42L8=', 'Chrome Browser', 'web', '27.145.211.4', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-07 00:09:18', '2025-11-05 17:26:43', 1, '2025-10-06 18:26:43', '2025-10-07 00:09:18'),
(489, 13, 'b474a995-483b-498e-b82b-29bd4c941b37', 'NGCKiddtOQeLYsZd9fnimO3XbU-2PIMq9_zo7gI1rhA=', 'Chrome Browser', 'web', '58.10.78.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 12:44:38', '2025-11-06 09:50:57', 1, '2025-10-07 10:50:57', '2025-10-07 12:44:38'),
(490, 8, '6ef2954a-af7a-4f7e-bae4-c5e3aec04e9b', 'WnoYhzLWW9-kiS2u8DYbo1lCEJEnoNOR6NrMQEAQ3ns=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 13:03:08', '2025-11-06 11:59:34', 0, '2025-10-07 12:59:34', '2025-10-07 13:03:08'),
(491, 7, '6026a915-e28e-4949-85ee-71a8ac3bf313', '4fl7X-fVoR8JmHp3oKqfk565efzq_U87Gfw-IbkZu68=', 'Chrome Browser', 'web', '27.145.211.4', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-07 14:42:32', '2025-11-06 12:00:42', 0, '2025-10-07 13:00:42', '2025-10-07 14:42:32'),
(492, 13, 'f46a0156-daa4-4bff-9ea4-4c890b1409b3', '46KNIAh1_2rhHkwUyrOC20StLoABBOTS2H5XzYxvraQ=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 13:05:30', '2025-11-06 12:04:13', 0, '2025-10-07 13:04:13', '2025-10-07 13:05:30'),
(493, 7, '10cc1da7-2a61-4491-aa33-9bb2fab2ef21', 'kZtIoZTHa7CZY2V7M4pYMfEAXg2pjatyM8unmPefH_k=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 13:26:49', '2025-11-06 12:05:46', 0, '2025-10-07 13:05:46', '2025-10-07 13:26:49'),
(494, 8, '7ccb7a6c-9334-4850-ac56-79c3dc17bc7f', 'YiMFUJhG4iJNcEzLqUvYdbcYdrwEQ3FiIdG4MSdYD4k=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 13:30:51', '2025-11-06 12:26:52', 0, '2025-10-07 13:26:52', '2025-10-07 13:30:51'),
(495, 7, 'f585ae2e-1bd2-4964-ba66-d58ce73de0ac', 'yp-7V70TeXFKbLXG129qzxeUD2juFrhf9M_LNJ8_TBQ=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 13:41:23', '2025-11-06 12:30:53', 0, '2025-10-07 13:30:53', '2025-10-07 13:41:23'),
(496, 8, 'c6a296e3-f387-43af-af46-145439c19105', 'ANoR9xqV_N0LIxUsR-J2mHhfvKI6R4X73qt9D92cLYU=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 13:54:17', '2025-11-06 12:41:26', 0, '2025-10-07 13:41:26', '2025-10-07 13:54:17');
INSERT INTO `user_sessions` (`session_id`, `user_id`, `access_token_jti`, `refresh_token`, `device_name`, `device_type`, `ip_address`, `user_agent`, `last_activity`, `expires_at`, `is_active`, `created_at`, `updated_at`) VALUES
(497, 7, '712ef933-f8c8-4e72-9dfb-1725fd7dabae', 'lIlM_4SPJb80qj-U2y_6RSDzlGmPMAW0-h-wY8lZvs4=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 13:58:33', '2025-11-06 12:54:19', 0, '2025-10-07 13:54:19', '2025-10-07 13:58:33'),
(498, 8, '0c4f7bea-d3b1-4cc3-8347-abc69918e212', 'jmwCDDdDjLlaxS3ibMnZhBtulOgB4tx6mmHOES6SeC8=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 14:02:26', '2025-11-06 12:58:35', 0, '2025-10-07 13:58:35', '2025-10-07 14:02:26'),
(499, 7, 'ada357e1-1496-4667-b53f-7eac779365a3', 'tX5ElKY0eu4mYkKs779ZHLH4tAlm4knyDod2_Ar1T40=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 14:03:27', '2025-11-06 13:02:28', 0, '2025-10-07 14:02:28', '2025-10-07 14:03:27'),
(500, 13, 'f9f2a402-5f5e-4fb2-801d-978561bd6c1e', 'hlsqrzj0Wv_CBpWs610slufLDu3QGOfoAl8pkgmLnzM=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 14:06:49', '2025-11-06 13:03:58', 0, '2025-10-07 14:03:58', '2025-10-07 14:06:49'),
(501, 8, 'ebaf93b4-2473-45c6-97e0-7d670ed3614f', 'GhE2j-8m8j_CrXOonyAAs3qamW86y0-Ms62OEShpuUQ=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 14:57:57', '2025-11-06 13:06:52', 0, '2025-10-07 14:06:52', '2025-10-07 14:57:57'),
(502, 8, 'cb1a47cb-e2ae-4689-a0c7-f213a5ac0ee8', 'CYC2nu28CbN-H83Mi2kdIJZCjqgCD2wc1pp-PQdE0eo=', 'Chrome Browser', 'web', '27.145.211.4', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-07 14:55:57', '2025-11-06 13:42:37', 0, '2025-10-07 14:42:37', '2025-10-07 14:55:57'),
(503, 7, 'f7b6a2e6-0214-4d05-b3e3-792a851fb9a8', 'ggeQmrfTPnz31ZIbnhu_C75u97bpBxqU6KPzwxTD3kM=', 'Chrome Browser', 'web', '27.145.211.4', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-07 15:02:50', '2025-11-06 13:56:03', 0, '2025-10-07 14:56:03', '2025-10-07 15:02:50'),
(504, 13, 'a11bdb9a-6b8f-4ef4-bfce-46be0871877f', 'D7Gxgez2boqSrWv14TiInMN9Qp44MvTwEwoO0lEdMc8=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 15:01:00', '2025-11-06 13:58:00', 0, '2025-10-07 14:58:00', '2025-10-07 15:01:00'),
(505, 7, 'db84fce3-0d6e-4b45-b0b0-2a6c620f79ee', 'h-_eiTl2xSpngdnlTfkHf4__t443byGTqWRck8816KY=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 15:02:45', '2025-11-06 14:01:04', 0, '2025-10-07 15:01:04', '2025-10-07 15:02:45'),
(506, 7, 'cbd2858f-40eb-4198-a4da-60d550cf872b', 'WMndVh0x9qW41idSHV9ytAwz6vxpHHul-Cq8tNCKlc0=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 15:03:03', '2025-11-06 14:02:46', 0, '2025-10-07 15:02:46', '2025-10-07 15:03:03'),
(507, 13, 'dfdc803c-855e-41ac-b27d-be2ddea9fe6b', 'zVGSZW09E1OABPhQFr5amuD6TZ-OEv4WwOTwNrNLTcE=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 15:06:28', '2025-11-06 14:03:06', 0, '2025-10-07 15:03:06', '2025-10-07 15:06:28'),
(508, 8, '76a7a693-e4c2-45dd-9c79-f91481014eea', 'Mitlrk02UwQS0APSkU332CeBs10lZksRsa8HrmDZR_M=', 'Chrome Browser', 'web', '27.145.211.4', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-07 15:07:27', '2025-11-06 14:03:18', 0, '2025-10-07 15:03:18', '2025-10-07 15:07:27'),
(509, 8, 'fac44307-54ea-4f7a-86ed-5da56aed894b', 'C-mNL09NQckF4-SnbQdr20OnCfejb-3336MV0je1naM=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 15:08:58', '2025-11-06 14:06:31', 0, '2025-10-07 15:06:31', '2025-10-07 15:08:58'),
(510, 8, '9b01b579-2761-4954-a31b-78bd611d73bd', 'Iy9xpnQ_FErRpBR5GrWOwr9vht6D2wEDh9KQGoee3ho=', 'Chrome Browser', 'web', '27.145.211.4', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-07 17:24:03', '2025-11-06 14:07:33', 1, '2025-10-07 15:07:33', '2025-10-07 17:24:03'),
(511, 8, '113fd0de-854f-4299-9d28-0fad119ca08e', 'N9l0qabE5R39FRuHlnuRVccBirhwsomtIsaP2Pga_ak=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 15:11:00', '2025-11-06 14:10:58', 0, '2025-10-07 15:10:58', '2025-10-07 15:11:00'),
(512, 13, '1054850e-3d51-4f8d-8c55-c0fb4c858f52', 'jVd79hZ-JsG7iSpeLVDd7JePAQ1CUo_ntuysb9TcMS0=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 15:15:31', '2025-11-06 14:11:03', 0, '2025-10-07 15:11:03', '2025-10-07 15:15:31'),
(513, 8, 'dea5e3d1-ad0f-452b-8d85-c9d9a3b44ce7', 'XvzM9cs27ssPU9zI4j7g58t6e2aKOKj2G8xlHUnQuWU=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 15:15:35', '2025-11-06 14:15:33', 0, '2025-10-07 15:15:33', '2025-10-07 15:15:35'),
(514, 7, '9f7e7cae-84e0-4ed6-b591-2b4d252958fe', 'wvLBQ9MnAVHa0V8kWp95Mhiqku8xwHDWba5dGVllr-o=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 15:21:49', '2025-11-06 14:15:38', 0, '2025-10-07 15:15:38', '2025-10-07 15:21:49'),
(515, 7, 'cf845bd8-03b0-4130-a3fa-e93c86d2fde0', 'rITSeZz8NXewyRWsVNWuLT97DmBRPwYpxqbXiv6ws3k=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 15:43:31', '2025-11-06 14:21:52', 0, '2025-10-07 15:21:52', '2025-10-07 15:43:31'),
(516, 8, 'a3f3cc1d-1444-4100-9f65-0ea772f2adae', 'vX6R0RF525bAdRS_jHjHLDQd5oOFa8jeY-n_D9h_hN8=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 15:46:21', '2025-11-06 14:43:34', 0, '2025-10-07 15:43:34', '2025-10-07 15:46:21'),
(517, 13, 'cdd1f6e5-83d4-47ac-aa23-f1651b0907c2', 'PrKJMB2xsnPVvEe5mSKRT-GUSh7IjX4fvk_LUZeHawY=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 15:47:01', '2025-11-06 14:46:24', 0, '2025-10-07 15:46:24', '2025-10-07 15:47:01'),
(518, 8, '55396242-9275-4668-8b29-0cdcf25b7099', 'FslRI7m2DO32o-fMdFqrfmLDfREIXca8Trk-ZvsBE-E=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 15:47:15', '2025-11-06 14:47:05', 0, '2025-10-07 15:47:05', '2025-10-07 15:47:15'),
(519, 7, '19c0d4ea-64ad-4365-9283-789db9a4b146', 'bhRxl75XOeuabXj7QA9gOsZPcgYuVE9CQ5v3sIl09iM=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 15:47:37', '2025-11-06 14:47:24', 0, '2025-10-07 15:47:24', '2025-10-07 15:47:37'),
(520, 13, '80ad4500-e508-4e2e-b5af-9c6e98c1415d', '8WH75C8Ckl5XrKIzXJMwRm7RHst_LQzq6X3QEl9iwUk=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 15:59:51', '2025-11-06 14:47:39', 1, '2025-10-07 15:47:39', '2025-10-07 15:59:51');

-- --------------------------------------------------------

--
-- โครงสร้างตาราง `user_tokens`
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
-- dump ตาราง `user_tokens`
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
(413, 13, 'refresh', 'x8HpRYLHW1n-qecjkFYLOW3p_coaWht8KhNoQ2S9iO8=', '2025-11-03 08:51:17', 0, 'Chrome Browser / web', '27.145.211.4', '2025-10-04 09:51:17', '2025-10-04 09:51:17'),
(414, 13, 'refresh', 'GzwrmAKpxn6va19JlLJNU3GL3x4b6j-fzpSxbBcNeFc=', '2025-11-03 10:58:49', 0, 'Chrome Browser / web', '27.145.211.4', '2025-10-04 11:58:49', '2025-10-04 11:58:49'),
(415, 13, 'refresh', 'av-lCjFHJXR-DpoQXcl0z8-ogThakMonAqTpaOVcBNs=', '2025-11-03 13:26:26', 0, 'Chrome Browser / web', '202.28.119.65', '2025-10-04 14:26:26', '2025-10-04 14:26:26'),
(416, 13, 'refresh', '2b8oQK4aVreIG24K9eEjf4HWh3ufLyGqOhUTSPAzuNA=', '2025-11-03 15:01:44', 0, 'Chrome Browser / web', '27.145.211.4', '2025-10-04 16:01:44', '2025-10-04 16:01:44'),
(417, 13, 'refresh', 'FZ7miAX8aRDsrPcCegWLPHgcufte0M84UCP8fT5j3Ms=', '2025-11-03 15:02:05', 0, 'Chrome Browser / web', '27.145.211.4', '2025-10-04 16:02:05', '2025-10-04 16:02:05'),
(418, 13, 'refresh', 'Yon58jckEnFrDIvla6n5gb6eIUKSgziw2P0c_lRrkn0=', '2025-11-03 15:02:50', 0, 'Chrome Browser / web', '27.145.211.4', '2025-10-04 16:02:50', '2025-10-04 16:02:50'),
(419, 13, 'refresh', 'NOYJMStyLL-zsv_SK5-Zu89CTlX6Pkf3_Jbnry1RJ1k=', '2025-11-03 15:05:32', 1, 'Chrome Browser / web', '27.145.211.4', '2025-10-04 16:05:33', '2025-10-04 17:31:12'),
(420, 7, 'refresh', 'JeSRiagFrGVXYkYZCe2GBytwyG2Cbr4s0X0l0o4XNDQ=', '2025-11-03 16:31:19', 1, 'Chrome Browser / web', '27.145.211.4', '2025-10-04 17:31:19', '2025-10-04 18:29:13'),
(421, 7, 'refresh', 'If4LIrJR_Yz7F2hu1ay5pBG3W7HGDSf0Mydzx786YWo=', '2025-11-03 17:22:42', 1, 'Chrome Browser / web', '202.28.118.91', '2025-10-04 18:22:42', '2025-10-04 18:24:34'),
(422, 8, 'refresh', 'a6t5788eKagDH-6v4LuoMGQqCIWnbOXP4zl6N3Acx70=', '2025-11-03 17:24:37', 1, 'Chrome Browser / web', '202.28.118.91', '2025-10-04 18:24:37', '2025-10-04 18:29:51'),
(423, 13, 'refresh', '3T5SkhKAzsyUI67piJLBbXL2NLh0qKZDkao9USr8OyA=', '2025-11-03 17:29:21', 1, 'Chrome Browser / web', '202.28.119.81', '2025-10-04 18:29:21', '2025-10-04 18:29:37'),
(424, 7, 'refresh', 'juq_fKB4OpQAO5s8DXAqBXqYetxbmw7n6dF1h3AZD1M=', '2025-11-03 17:29:54', 1, 'Chrome Browser / web', '202.28.118.91', '2025-10-04 18:29:54', '2025-10-04 18:30:12'),
(425, 7, 'refresh', 'et36HxonU1stRwLNvmEMh6KIilV6UyeeMF1Nkm5zjBU=', '2025-11-03 17:30:15', 1, 'Chrome Browser / web', '202.28.119.81', '2025-10-04 18:30:15', '2025-10-04 18:48:16'),
(426, 8, 'refresh', '3qEOs2VdlzujPPAW4etNEMNQDmvPmyegW80pW9rV_Ng=', '2025-11-03 17:30:16', 1, 'Chrome Browser / web', '202.28.118.91', '2025-10-04 18:30:16', '2025-10-04 18:30:33'),
(427, 7, 'refresh', 'potlInsVKWygyQ4jXFoQxXM2tkVEidLWhw67Aw-X1QQ=', '2025-11-03 17:30:35', 1, 'Chrome Browser / web', '202.28.118.91', '2025-10-04 18:30:35', '2025-10-04 18:33:07'),
(428, 8, 'refresh', '1zYejBZQEOEs1S07Wf2DKuHiTWYMxvoeLJWW6T7vfLs=', '2025-11-03 17:33:09', 1, 'Chrome Browser / web', '202.28.118.91', '2025-10-04 18:33:09', '2025-10-04 18:35:19'),
(429, 7, 'refresh', 'GifgSvvHynkw0qlCOrId8YpfHcbzGIJrFRvyJfCTi1E=', '2025-11-03 17:35:21', 1, 'Chrome Browser / web', '202.28.118.91', '2025-10-04 18:35:21', '2025-10-04 18:39:36'),
(430, 7, 'refresh', '3srzNWu49TUkoiASFG736Mq0Czam9CMr-6eZeyPC7-A=', '2025-11-03 17:37:27', 1, 'Chrome Browser / web', '202.28.118.91', '2025-10-04 18:37:27', '2025-10-04 18:39:25'),
(431, 7, 'refresh', 'zF3gi5i1Zc7A7t147gZIR-KtJaZ7b-FpmLiceG91okI=', '2025-11-03 17:39:40', 1, 'Chrome Browser / web', '202.28.118.91', '2025-10-04 18:39:40', '2025-10-04 18:51:47'),
(432, 7, 'refresh', 'QXGnGcRSZbEoFJ8kpDdjRjV9Wu1LLQZYCzpd7gH3OXU=', '2025-11-03 17:48:25', 0, 'Chrome Browser / web', '202.28.119.81', '2025-10-04 18:48:25', '2025-10-04 18:48:25'),
(433, 8, 'refresh', 'hZFT6y-cXOfddRAnTkLLVXIPyuNqaewnF4XnqYHkvjM=', '2025-11-03 17:51:51', 1, 'Chrome Browser / web', '202.28.118.91', '2025-10-04 18:51:51', '2025-10-04 19:03:48'),
(434, 7, 'refresh', 'B9SJg6HfrMFF6CEhwC7hrmvySzqcFXJRAdIXaThos-I=', '2025-11-03 18:03:50', 1, 'Chrome Browser / web', '202.28.118.91', '2025-10-04 19:03:50', '2025-10-04 19:04:05'),
(435, 8, 'refresh', '7HEN5X_fVnM4-d38YHXB-eEjAgVQxVuwYlLXwQLDYV0=', '2025-11-03 18:04:08', 1, 'Chrome Browser / web', '202.28.118.91', '2025-10-04 19:04:08', '2025-10-04 19:09:34'),
(436, 7, 'refresh', 'cxsayfHr6hq4Eur8mfyMbfRNf56JKK4PLHopitNbY1w=', '2025-11-03 18:09:36', 1, 'Chrome Browser / web', '202.28.118.91', '2025-10-04 19:09:36', '2025-10-04 19:12:55'),
(437, 8, 'refresh', 'ZYD_1PRvaw5YFPIWDY-z2UDPMc02KrAVPyQgUP3KP_M=', '2025-11-03 18:12:58', 1, 'Chrome Browser / web', '202.28.118.91', '2025-10-04 19:12:58', '2025-10-04 19:23:32'),
(438, 7, 'refresh', 'izqTBQMENZq7Ue6qLB7bbEHks73XZo2-i7Vqr6HGJsE=', '2025-11-03 18:23:38', 1, 'Chrome Browser / web', '202.28.118.91', '2025-10-04 19:23:38', '2025-10-04 19:38:42'),
(439, 8, 'refresh', 'vV7haFp1KTc-5tPHhIFaX7kLguIcgNjJvpkE5My16Y4=', '2025-11-03 18:38:43', 1, 'Chrome Browser / web', '202.28.118.91', '2025-10-04 19:38:43', '2025-10-04 20:39:22'),
(440, 7, 'refresh', 'P1MSk1KTSR_dIgE6LSuafirMDPeKs6UuhZyfMt3H250=', '2025-11-03 19:39:24', 1, 'Chrome Browser / web', '202.28.118.91', '2025-10-04 20:39:24', '2025-10-04 20:40:05'),
(441, 8, 'refresh', 'qmR_nJRE6-vOtf8VBDrzba_SBHeIZyVrIP0_Ox4F_dY=', '2025-11-03 19:40:08', 1, 'Chrome Browser / web', '202.28.118.91', '2025-10-04 20:40:08', '2025-10-04 20:42:14'),
(442, 7, 'refresh', 'HWwlEMgUDC1qM8FqYfIeSh2Nz9FRuvCs_UepCIds9Fw=', '2025-11-03 19:42:17', 1, 'Chrome Browser / web', '202.28.118.91', '2025-10-04 20:42:17', '2025-10-04 20:43:50'),
(443, 8, 'refresh', 'QocE2NFZz1N_VsfSeyPBBlzXMjC1tStoYePb09KWJpI=', '2025-11-03 19:43:52', 1, 'Chrome Browser / web', '202.28.118.91', '2025-10-04 20:43:52', '2025-10-04 20:46:38'),
(444, 8, 'refresh', 'BQO0ZcjOU4x5Aj3Ho2_WXk6tyF9byPkQ9OXmH8NSs7g=', '2025-11-03 19:46:39', 1, 'Chrome Browser / web', '202.28.118.91', '2025-10-04 20:46:39', '2025-10-04 20:46:54'),
(445, 7, 'refresh', '1eYuCvSwKtu-GINiekptebHysc6L8a7VzsIWEYSC780=', '2025-11-03 19:46:56', 1, 'Chrome Browser / web', '202.28.118.91', '2025-10-04 20:46:56', '2025-10-04 20:52:13'),
(446, 8, 'refresh', '0YckqxL2sZihsLuJGg1cCjgS7ZYVlmWj6rHwBs9Y8hE=', '2025-11-03 19:52:15', 1, 'Chrome Browser / web', '202.28.118.91', '2025-10-04 20:52:15', '2025-10-04 20:56:17'),
(447, 7, 'refresh', '9x1Pi7oZVMr3xDpBpgrOsCHBz-2bRliHF-XfQHs2pN0=', '2025-11-03 19:56:19', 1, 'Chrome Browser / web', '202.28.118.91', '2025-10-04 20:56:19', '2025-10-04 21:03:39'),
(448, 7, 'refresh', 'zhEfqQX5bDAxO50yjAS0jk8_6Egxy4obTnLdu4doOuM=', '2025-11-03 20:03:40', 1, 'Chrome Browser / web', '202.28.118.91', '2025-10-04 21:03:40', '2025-10-04 21:20:46'),
(449, 7, 'refresh', 'kUjkApNDCnqYcx5QJ-kDlNjJ9tyooOeHOuzhkCzqlAg=', '2025-11-03 20:09:29', 0, 'Chrome Browser / web', '202.28.119.81', '2025-10-04 21:09:29', '2025-10-04 21:09:29'),
(450, 8, 'refresh', '3yZXT9wEReA1by3vk0zXp2wwomNWx9l4ezdtEMUgNVI=', '2025-11-03 20:20:49', 1, 'Chrome Browser / web', '202.28.118.91', '2025-10-04 21:20:49', '2025-10-04 21:20:54'),
(451, 7, 'refresh', 'lzjmsBaMtsx75Tnhb-JfhBlqGEygfory-j8k5VaCrV4=', '2025-11-03 20:20:57', 1, 'Chrome Browser / web', '202.28.118.91', '2025-10-04 21:20:57', '2025-10-04 21:34:02'),
(452, 8, 'refresh', '8HHcqQTRm9W3KWlexUZspudkQdKUte85QHXsKzbrwXw=', '2025-11-03 20:34:04', 1, 'Chrome Browser / web', '202.28.118.91', '2025-10-04 21:34:04', '2025-10-04 21:43:00'),
(453, 7, 'refresh', 'yPIRIcmoH1akayVcdekjDwc0pAON9de6seLFBBStNok=', '2025-11-03 20:43:03', 1, 'Chrome Browser / web', '202.28.118.91', '2025-10-04 21:43:03', '2025-10-04 22:09:31'),
(454, 8, 'refresh', 'G9xpJTv_WRuhpAm2pzX99PE4ocfEvvWAzoddMb-4Tig=', '2025-11-03 21:09:33', 1, 'Chrome Browser / web', '202.28.118.91', '2025-10-04 22:09:33', '2025-10-04 22:11:42'),
(455, 8, 'refresh', '799Pl-VMMfZpEoQ69TXGAjMthqnMDeNKipYrVF3hP40=', '2025-11-03 21:18:39', 0, 'Chrome Browser / web', '202.28.118.91', '2025-10-04 22:18:39', '2025-10-04 22:18:39'),
(456, 7, 'refresh', 'CouTNbBHKspA9bOQfddwdlMm4c-_-MjFVM_Jlxee-XI=', '2025-11-04 00:11:23', 0, 'Chrome Browser / web', '202.28.119.81', '2025-10-05 01:11:23', '2025-10-05 01:11:23'),
(457, 7, 'refresh', 'ZqeV6FZVRuPW_jgv82p1X9hGou8z7A6ughLtjeDrJPs=', '2025-11-04 09:52:43', 1, 'Chrome Browser / web', '202.12.97.181', '2025-10-05 10:52:43', '2025-10-05 11:12:18'),
(458, 8, 'refresh', 'lZIq8bLhqMcnuMZB7xpflM5ENvQFVdb4rXzNcRfmnUw=', '2025-11-04 10:12:20', 1, 'Chrome Browser / web', '202.12.97.181', '2025-10-05 11:12:20', '2025-10-05 11:12:29'),
(459, 13, 'refresh', 'b-sq13baY6LozqjMYuU7pS5HuvW0NMZQZOwGz33TpK0=', '2025-11-04 10:14:00', 1, 'Chrome Browser / web', '27.145.211.4', '2025-10-05 11:14:00', '2025-10-05 11:14:20'),
(460, 13, 'refresh', 'jOGdADNoZQZJ-CneeihpwDf6GEfhDu64xYkT6ui5fNo=', '2025-11-04 10:14:25', 0, 'Chrome Browser / web', '27.145.211.4', '2025-10-05 11:14:25', '2025-10-05 11:14:25'),
(461, 8, 'refresh', 'dtct5_BHJWLs_XddGIYZy-v309-QPVdTdMDif5qa46Q=', '2025-11-04 10:27:57', 1, 'Chrome Browser / web', '202.12.97.181', '2025-10-05 11:27:57', '2025-10-05 13:22:57'),
(462, 13, 'refresh', '7izuNLgc2LgW4onZWtvLHrLAK9QeGVeNq0MEnXCF1S8=', '2025-11-04 12:22:59', 1, 'Chrome Browser / web', '202.12.97.181', '2025-10-05 13:22:59', '2025-10-05 14:36:14'),
(463, 13, 'refresh', 'J5JHk1O7nj1fAMfhHyZx2mOeSpISFykdETzpgr5qvt8=', '2025-11-04 12:51:01', 1, 'Chrome Browser / web', '27.145.211.4', '2025-10-05 13:51:01', '2025-10-05 13:52:45'),
(464, 8, 'refresh', 'OxrUhP32DKfwTYVDKW5olJnA2pP-tDvyCYLQbCI1tmw=', '2025-11-04 12:52:52', 1, 'Chrome Browser / web', '27.145.211.4', '2025-10-05 13:52:52', '2025-10-05 15:00:04'),
(465, 11, 'refresh', 'ePKWSNTLgCcP5aYpE4Igdlv6F-pIXtE__tSrBhk0bR0=', '2025-11-04 13:36:18', 1, 'Chrome Browser / web', '58.10.72.49', '2025-10-05 14:36:18', '2025-10-05 15:52:42'),
(466, 13, 'refresh', '_QM2tgCX18mvFzqVOX4ThNPRQZb0D5RyWnnUCVd9cMs=', '2025-11-04 14:00:11', 1, 'Chrome Browser / web', '27.145.211.4', '2025-10-05 15:00:11', '2025-10-05 19:25:02'),
(467, 8, 'refresh', 'Hdoavnb_vUlktmpiKRo2d3b68gTs-XG9QFiR0Fy9yT8=', '2025-11-04 14:52:45', 0, 'Chrome Browser / web', '58.10.72.49', '2025-10-05 15:52:45', '2025-10-05 15:52:45'),
(468, 8, 'refresh', 'kgvyWN-RfAGxJHE3bD5qD8TtKJuS_NBXPh6IOWJYTaQ=', '2025-11-04 16:07:39', 1, 'Chrome Browser / web', '58.10.72.49', '2025-10-05 17:07:39', '2025-10-05 18:09:31'),
(469, 7, 'refresh', 'Hc5loPMCTZwdAbYA5d_vY1sOSVHJXDLbZbnDDmRfcVY=', '2025-11-04 17:09:34', 1, 'Chrome Browser / web', '58.10.72.49', '2025-10-05 18:09:34', '2025-10-05 18:14:20'),
(470, 8, 'refresh', 'NWa3hYfG50sVVNkqKKTFPh38SdqoOc2br-j9u_hXZ3I=', '2025-11-04 17:14:22', 1, 'Chrome Browser / web', '58.10.72.49', '2025-10-05 18:14:22', '2025-10-05 18:38:20'),
(471, 13, 'refresh', 'GSvzTCW4Ta4o86HIZ4Rc9-_Lf_pbKSwir_QP6NFzl7Y=', '2025-11-04 17:38:21', 0, 'Chrome Browser / web', '58.10.72.49', '2025-10-05 18:38:21', '2025-10-05 18:38:21'),
(472, 7, 'refresh', '9R6NcnjU-HSRWDQ0J6EFHOsbuGx1KF_6KtDi2WO5iME=', '2025-11-04 18:25:06', 0, 'Chrome Browser / web', '27.145.211.4', '2025-10-05 19:25:06', '2025-10-05 19:25:06'),
(473, 7, 'refresh', 'CMuupVRv1RE3VPqhoIM9qAsoDSs8ydbRACyGtY2q9Jw=', '2025-11-04 23:05:12', 0, 'Chrome Browser / web', '27.145.211.4', '2025-10-06 00:05:12', '2025-10-06 00:05:12'),
(474, 7, 'refresh', 'O56OuXHcfVbOXCHlUo9ZovKKa31YrWKDMEnjdcndwtY=', '2025-11-05 02:55:26', 0, 'Chrome Browser / web', '27.145.211.4', '2025-10-06 03:55:26', '2025-10-06 03:55:26'),
(475, 8, 'refresh', 'UpSttBNJ76MFhr1mE6T-MQc5ucP5TCy8fhQek84U2oM=', '2025-11-05 08:15:38', 1, 'Chrome Browser / web', '202.12.97.133', '2025-10-06 09:15:38', '2025-10-06 09:25:07'),
(476, 7, 'refresh', 'aZswfVVA8lS3I-g78INvAUnZnnILl5if6XkEr32iVAQ=', '2025-11-05 08:25:13', 1, 'Chrome Browser / web', '202.12.97.133', '2025-10-06 09:25:13', '2025-10-06 10:47:16'),
(477, 8, 'refresh', 'MYBwfaDNz76tW930Dmyj2_aygInEw2by65nKFInFORY=', '2025-11-05 09:47:18', 1, 'Chrome Browser / web', '202.12.97.133', '2025-10-06 10:47:18', '2025-10-06 12:02:31'),
(478, 7, 'refresh', 'czwNQX0WvKVrJ-boyWof_MEv_WNDNXQw6tWK1Rqc1JA=', '2025-11-05 11:02:34', 1, 'Chrome Browser / web', '202.12.97.133', '2025-10-06 12:02:34', '2025-10-06 12:02:37'),
(479, 8, 'refresh', 'us88mSRQWZzv6ON3rFoCacI54i2Ev5TF16Pbs-bN_pY=', '2025-11-05 11:02:42', 1, 'Chrome Browser / web', '202.12.97.133', '2025-10-06 12:02:42', '2025-10-06 13:17:12'),
(480, 7, 'refresh', 'g_KW1PEDJ8CFqYKi84-m1B8yF0DU5uyqNsfcnmDNYfs=', '2025-11-05 12:10:52', 0, 'Chrome Browser / web', '27.145.211.4', '2025-10-06 13:10:52', '2025-10-06 13:10:52'),
(481, 7, 'refresh', 'nyEyhoEytGDALPMbBZEoyolxwFSLAa-3IopUQMkdHAQ=', '2025-11-05 12:17:15', 1, 'Chrome Browser / web', '202.12.97.133', '2025-10-06 13:17:15', '2025-10-06 13:17:51'),
(482, 13, 'refresh', 'rxxTy-advxZSQOHC38LQWDQg1effyZf8SkRf5Jf0Pi8=', '2025-11-05 12:17:54', 1, 'Chrome Browser / web', '202.12.97.133', '2025-10-06 13:17:54', '2025-10-06 13:28:44'),
(483, 7, 'refresh', 'BwPBQqrhFh8Am0LXSkX1fYnk8C7U8gfu5RNI-QyuT1c=', '2025-11-05 12:28:58', 1, 'Chrome Browser / web', '202.12.97.133', '2025-10-06 13:28:58', '2025-10-06 13:47:38'),
(484, 13, 'refresh', 'XTR5siCrHbIlrxOpqTjAUxa0gAHJRNeus4ImKhF8-iY=', '2025-11-05 12:47:41', 0, 'Chrome Browser / web', '202.12.97.133', '2025-10-06 13:47:41', '2025-10-06 13:47:41'),
(485, 7, 'refresh', 'z6eBhaQ1QPZlIjvxbYduRauP2-vi3i5U--76JI9vHPY=', '2025-11-05 13:30:46', 0, 'Chrome Browser / web', '27.145.211.4', '2025-10-06 14:30:46', '2025-10-06 14:30:46'),
(486, 7, 'refresh', 'WqroYZQnRzNF8sGpJg0RjePIiqZbyoyqg4Plqs5wK-M=', '2025-11-05 14:53:16', 0, 'Chrome Browser / web', '27.145.211.4', '2025-10-06 15:53:16', '2025-10-06 15:53:16'),
(487, 13, 'refresh', '7LsZowZvlR9NQJT5RPQhhb3zrEovMG_mkJ2WUlImTMs=', '2025-11-05 16:24:56', 0, 'Chrome Browser / web', '58.10.78.71', '2025-10-06 17:24:56', '2025-10-06 17:24:56'),
(488, 7, 'refresh', 'MLEpsTSqraYxph95fWAXAIxcZbop7qM21I813jm42L8=', '2025-11-05 17:26:43', 0, 'Chrome Browser / web', '27.145.211.4', '2025-10-06 18:26:43', '2025-10-06 18:26:43'),
(489, 13, 'refresh', 'NGCKiddtOQeLYsZd9fnimO3XbU-2PIMq9_zo7gI1rhA=', '2025-11-06 09:50:57', 0, 'Chrome Browser / web', '58.10.78.71', '2025-10-07 10:50:57', '2025-10-07 10:50:57'),
(490, 8, 'refresh', 'WnoYhzLWW9-kiS2u8DYbo1lCEJEnoNOR6NrMQEAQ3ns=', '2025-11-06 11:59:34', 1, 'Chrome Browser / web', '202.28.118.117', '2025-10-07 12:59:34', '2025-10-07 13:03:08'),
(491, 7, 'refresh', '4fl7X-fVoR8JmHp3oKqfk565efzq_U87Gfw-IbkZu68=', '2025-11-06 12:00:42', 1, 'Chrome Browser / web', '27.145.211.4', '2025-10-07 13:00:42', '2025-10-07 14:42:32'),
(492, 13, 'refresh', '46KNIAh1_2rhHkwUyrOC20StLoABBOTS2H5XzYxvraQ=', '2025-11-06 12:04:13', 1, 'Chrome Browser / web', '202.28.118.117', '2025-10-07 13:04:13', '2025-10-07 13:05:30'),
(493, 7, 'refresh', 'kZtIoZTHa7CZY2V7M4pYMfEAXg2pjatyM8unmPefH_k=', '2025-11-06 12:05:46', 1, 'Chrome Browser / web', '202.28.118.117', '2025-10-07 13:05:46', '2025-10-07 13:26:49'),
(494, 8, 'refresh', 'YiMFUJhG4iJNcEzLqUvYdbcYdrwEQ3FiIdG4MSdYD4k=', '2025-11-06 12:26:52', 1, 'Chrome Browser / web', '202.28.118.117', '2025-10-07 13:26:52', '2025-10-07 13:30:51'),
(495, 7, 'refresh', 'yp-7V70TeXFKbLXG129qzxeUD2juFrhf9M_LNJ8_TBQ=', '2025-11-06 12:30:53', 1, 'Chrome Browser / web', '202.28.118.117', '2025-10-07 13:30:53', '2025-10-07 13:41:23'),
(496, 8, 'refresh', 'ANoR9xqV_N0LIxUsR-J2mHhfvKI6R4X73qt9D92cLYU=', '2025-11-06 12:41:26', 1, 'Chrome Browser / web', '202.28.118.117', '2025-10-07 13:41:26', '2025-10-07 13:54:17'),
(497, 7, 'refresh', 'lIlM_4SPJb80qj-U2y_6RSDzlGmPMAW0-h-wY8lZvs4=', '2025-11-06 12:54:19', 1, 'Chrome Browser / web', '202.28.118.117', '2025-10-07 13:54:19', '2025-10-07 13:58:33'),
(498, 8, 'refresh', 'jmwCDDdDjLlaxS3ibMnZhBtulOgB4tx6mmHOES6SeC8=', '2025-11-06 12:58:35', 1, 'Chrome Browser / web', '202.28.118.117', '2025-10-07 13:58:35', '2025-10-07 14:02:26'),
(499, 7, 'refresh', 'tX5ElKY0eu4mYkKs779ZHLH4tAlm4knyDod2_Ar1T40=', '2025-11-06 13:02:28', 1, 'Chrome Browser / web', '202.28.118.117', '2025-10-07 14:02:28', '2025-10-07 14:03:27'),
(500, 13, 'refresh', 'hlsqrzj0Wv_CBpWs610slufLDu3QGOfoAl8pkgmLnzM=', '2025-11-06 13:03:58', 1, 'Chrome Browser / web', '202.28.118.117', '2025-10-07 14:03:58', '2025-10-07 14:06:49'),
(501, 8, 'refresh', 'GhE2j-8m8j_CrXOonyAAs3qamW86y0-Ms62OEShpuUQ=', '2025-11-06 13:06:52', 1, 'Chrome Browser / web', '202.28.118.117', '2025-10-07 14:06:52', '2025-10-07 14:57:57'),
(502, 8, 'refresh', 'CYC2nu28CbN-H83Mi2kdIJZCjqgCD2wc1pp-PQdE0eo=', '2025-11-06 13:42:37', 1, 'Chrome Browser / web', '27.145.211.4', '2025-10-07 14:42:37', '2025-10-07 14:55:57'),
(503, 7, 'refresh', 'ggeQmrfTPnz31ZIbnhu_C75u97bpBxqU6KPzwxTD3kM=', '2025-11-06 13:56:03', 1, 'Chrome Browser / web', '27.145.211.4', '2025-10-07 14:56:03', '2025-10-07 15:02:50'),
(504, 13, 'refresh', 'D7Gxgez2boqSrWv14TiInMN9Qp44MvTwEwoO0lEdMc8=', '2025-11-06 13:58:00', 1, 'Chrome Browser / web', '202.28.118.117', '2025-10-07 14:58:00', '2025-10-07 15:01:00'),
(505, 7, 'refresh', 'h-_eiTl2xSpngdnlTfkHf4__t443byGTqWRck8816KY=', '2025-11-06 14:01:04', 1, 'Chrome Browser / web', '202.28.118.117', '2025-10-07 15:01:04', '2025-10-07 15:02:45'),
(506, 7, 'refresh', 'WMndVh0x9qW41idSHV9ytAwz6vxpHHul-Cq8tNCKlc0=', '2025-11-06 14:02:46', 1, 'Chrome Browser / web', '202.28.118.117', '2025-10-07 15:02:46', '2025-10-07 15:03:03'),
(507, 13, 'refresh', 'zVGSZW09E1OABPhQFr5amuD6TZ-OEv4WwOTwNrNLTcE=', '2025-11-06 14:03:06', 1, 'Chrome Browser / web', '202.28.118.117', '2025-10-07 15:03:06', '2025-10-07 15:06:28'),
(508, 8, 'refresh', 'Mitlrk02UwQS0APSkU332CeBs10lZksRsa8HrmDZR_M=', '2025-11-06 14:03:18', 1, 'Chrome Browser / web', '27.145.211.4', '2025-10-07 15:03:18', '2025-10-07 15:07:27'),
(509, 8, 'refresh', 'C-mNL09NQckF4-SnbQdr20OnCfejb-3336MV0je1naM=', '2025-11-06 14:06:31', 1, 'Chrome Browser / web', '202.28.118.117', '2025-10-07 15:06:31', '2025-10-07 15:08:58'),
(510, 8, 'refresh', 'Iy9xpnQ_FErRpBR5GrWOwr9vht6D2wEDh9KQGoee3ho=', '2025-11-06 14:07:33', 0, 'Chrome Browser / web', '27.145.211.4', '2025-10-07 15:07:33', '2025-10-07 15:07:33'),
(511, 8, 'refresh', 'N9l0qabE5R39FRuHlnuRVccBirhwsomtIsaP2Pga_ak=', '2025-11-06 14:10:58', 1, 'Chrome Browser / web', '202.28.118.117', '2025-10-07 15:10:58', '2025-10-07 15:11:00'),
(512, 13, 'refresh', 'jVd79hZ-JsG7iSpeLVDd7JePAQ1CUo_ntuysb9TcMS0=', '2025-11-06 14:11:03', 1, 'Chrome Browser / web', '202.28.118.117', '2025-10-07 15:11:03', '2025-10-07 15:15:31'),
(513, 8, 'refresh', 'XvzM9cs27ssPU9zI4j7g58t6e2aKOKj2G8xlHUnQuWU=', '2025-11-06 14:15:33', 1, 'Chrome Browser / web', '202.28.118.117', '2025-10-07 15:15:33', '2025-10-07 15:15:35'),
(514, 7, 'refresh', 'wvLBQ9MnAVHa0V8kWp95Mhiqku8xwHDWba5dGVllr-o=', '2025-11-06 14:15:38', 1, 'Chrome Browser / web', '202.28.118.117', '2025-10-07 15:15:38', '2025-10-07 15:21:49'),
(515, 7, 'refresh', 'rITSeZz8NXewyRWsVNWuLT97DmBRPwYpxqbXiv6ws3k=', '2025-11-06 14:21:52', 1, 'Chrome Browser / web', '202.28.118.117', '2025-10-07 15:21:52', '2025-10-07 15:43:31'),
(516, 8, 'refresh', 'vX6R0RF525bAdRS_jHjHLDQd5oOFa8jeY-n_D9h_hN8=', '2025-11-06 14:43:34', 1, 'Chrome Browser / web', '202.28.118.117', '2025-10-07 15:43:34', '2025-10-07 15:46:21'),
(517, 13, 'refresh', 'PrKJMB2xsnPVvEe5mSKRT-GUSh7IjX4fvk_LUZeHawY=', '2025-11-06 14:46:24', 1, 'Chrome Browser / web', '202.28.118.117', '2025-10-07 15:46:24', '2025-10-07 15:47:01'),
(518, 8, 'refresh', 'FslRI7m2DO32o-fMdFqrfmLDfREIXca8Trk-ZvsBE-E=', '2025-11-06 14:47:05', 1, 'Chrome Browser / web', '202.28.118.117', '2025-10-07 15:47:05', '2025-10-07 15:47:15'),
(519, 7, 'refresh', 'bhRxl75XOeuabXj7QA9gOsZPcgYuVE9CQ5v3sIl09iM=', '2025-11-06 14:47:24', 1, 'Chrome Browser / web', '202.28.118.117', '2025-10-07 15:47:24', '2025-10-07 15:47:37'),
(520, 13, 'refresh', '8WH75C8Ckl5XrKIzXJMwRm7RHst_LQzq6X3QEl9iwUk=', '2025-11-06 14:47:39', 0, 'Chrome Browser / web', '202.28.118.117', '2025-10-07 15:47:39', '2025-10-07 15:47:39');

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
-- Stand-in structure for view `v_current_announcement_assignments`
-- (See below for the actual view)
--
CREATE TABLE `v_current_announcement_assignments` (
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
-- โครงสร้างตาราง `years`
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
-- dump ตาราง `years`
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
-- Structure for view `v_current_announcement_assignments`
--
DROP TABLE IF EXISTS `v_current_announcement_assignments`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_current_announcement_assignments`  AS  select `t`.`slot_code` AS `slot_code`,`t`.`announcement_id` AS `announcement_id`,`t`.`start_date` AS `start_date`,`t`.`end_date` AS `end_date`,`t`.`changed_by` AS `changed_by`,`t`.`changed_at` AS `changed_at`,`t`.`note` AS `note` from (`announcement_assignments` `t` join (select `announcement_assignments`.`slot_code` AS `slot_code`,max(`announcement_assignments`.`changed_at`) AS `max_changed_at` from `announcement_assignments` where `announcement_assignments`.`start_date` <= current_timestamp() and (`announcement_assignments`.`end_date` is null or `announcement_assignments`.`end_date` >= current_timestamp()) group by `announcement_assignments`.`slot_code`) `x` on(`x`.`slot_code` = `t`.`slot_code` and `x`.`max_changed_at` = `t`.`changed_at`)) where `t`.`start_date` <= current_timestamp() and (`t`.`end_date` is null or `t`.`end_date` >= current_timestamp()) ;

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
-- Indexes for table `research_fund_admin_events`
--
ALTER TABLE `research_fund_admin_events`
  ADD PRIMARY KEY (`event_id`),
  ADD KEY `idx_rfae_submission_created_at` (`submission_id`,`DESC`),
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
  ADD UNIQUE KEY `uniq_scholar_author_id` (`scholar_author_id`),
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
-- AUTO_INCREMENT for table `announcement_assignments`
--
ALTER TABLE `announcement_assignments`
  MODIFY `assignment_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `application_status`
--
ALTER TABLE `application_status`
  MODIFY `application_status_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `log_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=490;

--
-- AUTO_INCREMENT for table `dept_head_assignments`
--
ALTER TABLE `dept_head_assignments`
  MODIFY `assignment_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `document_types`
--
ALTER TABLE `document_types`
  MODIFY `document_type_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `file_uploads`
--
ALTER TABLE `file_uploads`
  MODIFY `file_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=372;

--
-- AUTO_INCREMENT for table `fund_application_details`
--
ALTER TABLE `fund_application_details`
  MODIFY `detail_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

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
  MODIFY `notification_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=194;

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
  MODIFY `detail_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=125;

--
-- AUTO_INCREMENT for table `publication_reward_rates`
--
ALTER TABLE `publication_reward_rates`
  MODIFY `rate_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

--
-- AUTO_INCREMENT for table `research_fund_admin_events`
--
ALTER TABLE `research_fund_admin_events`
  MODIFY `event_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `research_fund_event_files`
--
ALTER TABLE `research_fund_event_files`
  MODIFY `event_file_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

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
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `subcategory_budgets`
--
ALTER TABLE `subcategory_budgets`
  MODIFY `subcategory_budget_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=38;

--
-- AUTO_INCREMENT for table `submissions`
--
ALTER TABLE `submissions`
  MODIFY `submission_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=167;

--
-- AUTO_INCREMENT for table `submission_documents`
--
ALTER TABLE `submission_documents`
  MODIFY `document_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=361;

--
-- AUTO_INCREMENT for table `submission_users`
--
ALTER TABLE `submission_users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=222;

--
-- AUTO_INCREMENT for table `system_config`
--
ALTER TABLE `system_config`
  MODIFY `config_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=38;

--
-- AUTO_INCREMENT for table `user_fund_eligibilities`
--
ALTER TABLE `user_fund_eligibilities`
  MODIFY `user_fund_eligibility_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `user_sessions`
--
ALTER TABLE `user_sessions`
  MODIFY `session_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=521;

--
-- AUTO_INCREMENT for table `user_tokens`
--
ALTER TABLE `user_tokens`
  MODIFY `token_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=521;

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
