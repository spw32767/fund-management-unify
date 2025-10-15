-- phpMyAdmin SQL Dump
-- version 4.9.5deb2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: 15 ต.ค. 2025 เมื่อ 03:49 PM
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
  `file_path` varchar(512) NOT NULL COMMENT 'path ไฟล์ในระบบ',
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
(1, 'ประกาศเปิดรับสมัครทุนส่งเสริมการวิจัย ประจำปี 2568', 'กองทุนส่งเสริมการวิจัยและนวัตกรรม เปิดรับสมัครทุนส่งเสริมการวิจัย ประจำปี 2568 กองทุนส่งเสริมการวิจัยและนวัตกรรม เปิดรับสมัครทุนส่งเสริมการวิจัย ประจำปี 2568 กองทุนส่งเสริมการวิจัยและนวัตกรรม เปิดรับสมัครทุนส่งเสริมการวิจัย ประจำปี 2568', 'ประกาศทุนวิจัย2568.pdf', 'http://147.50.230.213:8080/uploads/announcements/1.%201574-68%20หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย%20นวัตกรรม%20และบริการวิชาการ%20(2568).pdf', 1024000, 'application/pdf', 'research_fund', NULL, 'high', 3, 'active', '2025-01-15 09:00:00', '2025-09-20 13:35:00', 3, 1, '2025-08-20 11:40:31', '2025-10-04 22:39:32', '2025-10-11 19:28:29'),
(2, 'แนวทางการเขียนข้อเสนอโครงการวิจัย', 'เอกสารแนวทางและข้อแนะนำสำหรับการเขียนข้อเสนอโครงการวิจัย', 'แนวทางการเขียนข้อเสนอโครงการ.pdf', 'uploads/announcements/2025/09/test_20250919_151900.pdf', 2048000, 'application/pdf', 'general', NULL, 'normal', 5, 'active', '2025-01-10 10:00:00', NULL, 2, 1, '2025-08-20 11:40:31', '2025-09-21 11:54:44', NULL),
(3, 'ประกาศเปิดรับสมัครทุนอุดหนุนกิจกรรม ไตรมาส 1/2568', 'เปิดรับสมัครทุนอุดหนุนกิจกรรมประจำไตรมาส 1 ประจำปี 2568', 'ประกาศทุนกิจกรรมไตรมาส1-2568.pdf', 'http://147.50.230.213:8080/uploads/announcements/1.%201574-68%20หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย%20นวัตกรรม%20และบริการวิชาการ%20(2568).pdf', 800000, 'application/pdf', 'promotion_fund', NULL, 'normal', 1, 'active', '2025-01-05 14:00:00', '2025-09-26 13:23:00', 2, 1, '2025-08-20 11:40:31', '2025-10-10 14:41:30', '2025-10-11 19:28:19'),
(4, 'หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย นวัตกรรม และบริการวิชาการ วิทยาลัยการคอมพิวเตอร์ (2568)', 'ประกาศหลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย นวัตกรรม และบริการวิชาการ วิทยาลัยการคอมพิวเตอร์ให้เป็นไปตามประกาศมหาวิทยาลัยขอนแก่น (ฉบับที่ 2200/2564) ลงวันที่ 27 ตุลาคม พ.ศ. 2564 เรื่อง กองทุนวิจัย นวัตกรรม และบริการวิชาการ วิทยาลัยการคอมพิวเตอร์และเพื่อส่งเสริม สนับสนุนศักยภาพด้านการวิจัย นวัตกรรม และบริการวิชาการ อันเป็นการพัฒนาขีดความสามารถในการแข่งขัน และยกระดับความเป็นเลิศด้านวิชาการ\r\n', '1. 1574-68 หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย นวัตกรรม และบริการวิชาการ (2568).pdf', 'http://147.50.230.213:8080/uploads/announcements/1.%201574-68%20หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย%20นวัตกรรม%20และบริการวิชาการ%20(2568).pdf', 444470, 'application/pdf', 'general', '1574/2568', 'urgent', 4, 'active', NULL, NULL, 3, 7, '2025-09-17 12:26:09', '2025-09-21 11:54:44', '2025-10-11 19:28:39'),
(6, 'aswd', 'asd', 'sample.pdf', 'uploads/announcements/2025/09/aswd_20250919_151819.pdf', 18810, 'application/pdf', 'general', NULL, 'normal', NULL, 'active', '2025-09-16 15:18:00', '2025-09-26 15:18:00', 3, 7, '2025-09-19 15:18:19', '2025-09-19 15:18:19', '2025-09-19 15:18:29'),
(7, 'test', 'asd', 'sample-local-pdf.pdf', 'uploads/announcements/2025/09/test_20250919_151900.pdf', 49672, 'application/pdf', 'general', NULL, 'normal', 6, 'active', '2025-09-17 15:18:00', '2025-09-25 15:18:00', 2, 7, '2025-09-19 15:19:00', '2025-09-21 11:54:44', NULL),
(8, 'das', 'asd', 'sample.pdf', 'uploads/announcements/sample.pdf', 18810, 'application/pdf', 'general', NULL, 'normal', 2, 'active', NULL, NULL, NULL, 7, '2025-09-19 15:34:30', '2025-10-04 22:38:07', NULL),
(9, 's', NULL, 'เอกสารอื่น_ๆ.pdf', 'uploads/announcements/เอกสารอื่น_ๆ.pdf', 1312, 'application/pdf', 'general', NULL, 'normal', NULL, 'active', NULL, NULL, NULL, 7, '2025-10-10 11:11:05', '2025-10-10 11:11:05', '2025-10-10 11:11:10'),
(11, 'asdasd', 'asdasd', '2._ประกาศขอใช้เงินกองทุนวิจัยฯ_2568_(ทุนส่งเสริมวิจัย)_(เวียนรับรอง_3_กค_2568).docx', 'uploads/announcements/2._ประกาศขอใช้เงินกองทุนวิจัยฯ_2568_(ทุนส่งเสริมวิจัย)_(เวียนรับรอง_3_กค_2568).docx', 218699, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'general', NULL, 'normal', NULL, 'active', '2025-09-30 19:29:00', '2025-10-20 19:29:00', 4, 7, '2025-10-11 19:30:07', '2025-10-11 19:30:07', '2025-10-11 20:11:11'),
(12, 'test1', 'asd', 'merged_documents_PR-20250913-0001.pdf', 'uploads/announcements/merged_documents_PR-20250913-0001.pdf', 62415, 'application/pdf', 'general', NULL, 'normal', NULL, 'active', '2025-10-11 19:30:00', '2025-10-13 19:30:00', 3, 7, '2025-10-11 19:31:22', '2025-10-11 19:31:22', NULL),
(13, 'test22', '1', '2._ประกาศขอใช้เงินกองทุนวิจัยฯ_2568_(ทุนส่งเสริมวิจัย)_(เวียนรับรอง_3_กค_2568).docx', 'uploads/announcements/2._ประกาศขอใช้เงินกองทุนวิจัยฯ_2568_(ทุนส่งเสริมวิจัย)_(เวียนรับรอง_3_กค_2568).docx', 218699, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'general', NULL, 'normal', NULL, 'active', '2025-10-01 19:52:00', '2025-10-02 19:52:00', 4, 7, '2025-10-11 19:52:18', '2025-10-11 19:52:18', NULL),
(14, 'Long', 'aa', 'sample.pdf', 'uploads/announcements/sample.pdf', 18810, 'application/pdf', 'general', NULL, 'normal', NULL, 'active', '2025-09-30 20:10:00', '2025-10-13 20:10:00', NULL, 7, '2025-10-11 20:11:05', '2025-10-11 20:11:05', '2025-10-11 20:11:08'),
(15, 'asdasd', 'aaa', 'sample.pdf', 'uploads/announcements/sample.pdf', 18810, 'application/pdf', 'general', NULL, 'normal', NULL, 'active', NULL, NULL, NULL, 7, '2025-10-11 20:48:03', '2025-10-11 20:48:03', '2025-10-11 20:48:12'),
(16, 'อื่น ๆ', NULL, 'เอกสารอื่น_ๆ.pdf', 'uploads/announcements/เอกสารอื่น_ๆ.pdf', 1312, 'application/pdf', 'general', NULL, 'normal', NULL, 'active', NULL, NULL, 3, 7, '2025-10-11 20:48:23', '2025-10-11 20:48:23', NULL),
(17, '120', 'aa', '1.20หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย20และบริการวิชาการ%20(2568).pdf', 'uploads/announcements/1.20หลักเกณฑ์การใช้จ่ายเงินกองทุนวิจัย20และบริการวิชาการ%20(2568).pdf', 455138, 'application/pdf', 'general', NULL, 'normal', NULL, 'active', NULL, NULL, 3, 7, '2025-10-11 20:49:18', '2025-10-11 20:49:18', NULL),
(18, 'ประกาศหลักเกณของใช้เงิน 2568', 'ประกาศ', 'sample.pdf', 'uploads/announcements/sample.pdf', 18810, 'application/pdf', 'general', NULL, 'normal', NULL, 'active', '2025-10-13 08:33:00', '2025-10-14 08:33:00', 3, 7, '2025-10-12 08:33:21', '2025-10-12 08:33:21', NULL);

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
(4, 'conference', 1, '2025-10-05 00:46:00', '2025-10-31 23:46:00', 7, '2025-10-05 00:46:28'),
(5, 'main', 8, '2025-10-04 22:17:00', '2025-10-30 21:17:00', 7, '2025-10-11 21:16:35'),
(6, 'activity_support', 13, '2025-10-03 00:33:00', '2025-10-30 23:33:00', 7, '2025-10-12 08:27:55'),
(7, 'conference', 16, '2025-10-05 00:46:00', '2025-10-31 23:46:00', 7, '2025-10-12 08:28:55'),
(8, 'service', 12, '2025-10-11 08:28:00', '2025-10-22 08:29:00', 7, '2025-10-12 08:29:03');

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
(6, '5', 'อยู่ระหว่างการพิจารณาโดยหัวหน้าสาขา', '2025-08-12 15:50:22', '2025-10-12 08:09:23', NULL),
(7, '6', 'ปิดทุน', '2025-10-05 14:48:54', '2025-10-05 14:48:54', NULL);

-- --------------------------------------------------------

--
-- โครงสร้างตาราง `audit_logs`
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
(489, 13, 'review', 'submission', 166, 'PR-2568-0044', NULL, NULL, NULL, '202.28.118.117', NULL, 'comment', '2025-10-07 15:59:49'),
(490, 8, 'create', 'submission', 167, 'PR-2568-0045', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-07 20:32:36'),
(491, 8, 'create', 'submission', 168, 'PR-2568-0046', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-07 20:45:23'),
(492, 8, 'submit', 'submission', 168, 'PR-2568-0046', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-07 20:57:03'),
(493, 8, 'create', 'submission', 169, 'PR-2568-0047', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-07 22:07:17'),
(494, 8, 'submit', 'submission', 169, 'PR-2568-0047', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-07 22:07:17'),
(495, 8, 'create', 'submission', 170, 'PR-2568-0001', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-07 22:10:43'),
(496, 8, 'submit', 'submission', 170, 'PR-2568-0001', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-07 22:10:44'),
(497, 8, 'create', 'submission', 171, 'PR-2568-0002', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-07 22:35:40'),
(498, 8, 'submit', 'submission', 171, 'PR-2568-0002', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-07 22:35:42'),
(499, 8, 'create', 'submission', 172, 'PR-2568-0003', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-07 23:33:37'),
(500, 8, 'submit', 'submission', 172, 'PR-2568-0003', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-07 23:33:37'),
(501, 13, 'update', 'submission', 171, 'PR-2568-0002', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-07 23:35:19'),
(502, 13, 'review', 'submission', 171, 'PR-2568-0002', NULL, NULL, NULL, '58.10.78.71', NULL, 'test comment', '2025-10-07 23:35:19'),
(503, 8, 'create', 'submission', 173, 'PR-2568-0004', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-08 00:06:04'),
(504, 8, 'submit', 'submission', 173, 'PR-2568-0004', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-08 00:06:04'),
(505, 8, 'create', 'submission', 174, 'FA-2568-0001', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-08 00:19:15'),
(506, 8, 'submit', 'submission', 174, 'FA-2568-0001', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-08 00:19:15'),
(507, 8, 'create', 'submission', 175, 'PR-2568-0005', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-08 10:52:09'),
(508, 8, 'submit', 'submission', 175, 'PR-2568-0005', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-08 10:52:10'),
(509, 11, 'approve', 'submission', 174, 'FA-2568-0001', NULL, NULL, 'status', NULL, NULL, 'approve submission', '2025-10-09 10:08:37'),
(510, 13, 'update', 'submission', 175, 'PR-2568-0005', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-09 10:11:51'),
(511, 13, 'review', 'submission', 175, 'PR-2568-0005', NULL, NULL, NULL, '58.10.78.71', NULL, 'ฟหกฟหก', '2025-10-09 10:11:51'),
(512, 8, 'create', 'submission', 176, 'PR-2568-0006', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-09 10:14:11'),
(513, 8, 'submit', 'submission', 176, 'PR-2568-0006', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-09 10:14:12'),
(514, 13, 'update', 'submission', 176, 'PR-2568-0006', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-09 10:14:37'),
(515, 13, 'review', 'submission', 176, 'PR-2568-0006', NULL, NULL, NULL, '58.10.78.71', NULL, 'comment', '2025-10-09 10:14:37'),
(516, 7, 'approve', 'submission', 176, 'PR-2568-0006', NULL, NULL, 'status', NULL, NULL, 'approve submission', '2025-10-09 10:15:30'),
(517, 8, 'create', 'submission', 177, 'FA-2568-0002', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-09 10:18:34'),
(518, 8, 'submit', 'submission', 177, 'FA-2568-0002', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-09 10:18:34'),
(519, 7, 'approve', 'submission', 177, 'FA-2568-0002', NULL, NULL, 'status', NULL, NULL, 'approve submission', '2025-10-09 10:19:48'),
(520, 7, 'update', 'submission', 176, 'PR-2568-0006', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-09 10:58:20'),
(521, 7, 'approve', 'submission', 176, 'PR-2568-0006', NULL, NULL, 'status', NULL, NULL, 'approve submission', '2025-10-09 11:21:32'),
(522, 8, 'create', 'submission', 178, 'PR-2568-0007', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-09 11:23:45'),
(523, 8, 'submit', 'submission', 178, 'PR-2568-0007', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-09 11:23:45'),
(524, 13, 'update', 'submission', 178, 'PR-2568-0007', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-09 11:28:57'),
(525, 13, 'review', 'submission', 178, 'PR-2568-0007', NULL, NULL, NULL, '202.12.97.144', NULL, 'asd', '2025-10-09 11:28:57'),
(526, 7, 'approve', 'submission', 178, 'PR-2568-0007', NULL, NULL, 'status', NULL, NULL, 'approve submission', '2025-10-09 11:29:25'),
(527, 8, 'create', 'submission', 179, 'PR-2568-0008', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-09 12:50:53'),
(528, 8, 'create', 'submission', 180, 'PR-2568-0009', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-09 12:58:08'),
(529, 8, 'create', 'submission', 181, 'PR-2568-0010', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-09 13:33:51'),
(530, 8, 'submit', 'submission', 181, 'PR-2568-0010', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-09 14:23:08'),
(531, 8, 'create', 'submission', 182, 'PR-2568-0011', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-11 11:01:14'),
(532, 8, 'submit', 'submission', 182, 'PR-2568-0011', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-11 11:01:16'),
(533, 8, 'create', 'submission', 183, 'PR-2568-0012', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-11 12:23:19'),
(534, 8, 'submit', 'submission', 183, 'PR-2568-0012', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-11 12:23:22'),
(535, 8, 'create', 'submission', 184, 'PR-2568-0013', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-11 13:26:47'),
(536, 8, 'submit', 'submission', 184, 'PR-2568-0013', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-11 13:26:49'),
(537, 8, 'create', 'submission', 185, 'FA-2568-0003', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-11 13:43:37'),
(538, 8, 'submit', 'submission', 185, 'FA-2568-0003', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-11 13:43:37'),
(539, 13, 'update', 'submission', 184, 'PR-2568-0013', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-11 19:30:16'),
(540, 13, 'review', 'submission', 184, 'PR-2568-0013', NULL, NULL, NULL, '58.10.78.71', NULL, 'test comment', '2025-10-11 19:30:16'),
(541, 13, 'update', 'submission', 183, 'PR-2568-0012', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-11 19:31:12'),
(542, 13, 'review', 'submission', 183, 'PR-2568-0012', NULL, NULL, NULL, '58.10.78.71', NULL, 'test comment', '2025-10-11 19:31:12'),
(543, 8, 'create', 'submission', 186, 'FA-2568-0004', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-11 20:30:18'),
(544, 8, 'submit', 'submission', 186, 'FA-2568-0004', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-11 20:30:18'),
(545, 8, 'create', 'submission', 187, 'PR-2568-0014', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-11 20:44:34'),
(546, 8, 'submit', 'submission', 187, 'PR-2568-0014', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-11 20:44:35'),
(547, 8, 'create', 'submission', 188, 'FA-2568-0005', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-11 21:17:22'),
(548, 8, 'submit', 'submission', 188, 'FA-2568-0005', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-11 21:17:22'),
(549, 8, 'create', 'submission', 189, 'PR-2568-0015', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-11 21:20:46'),
(550, 8, 'submit', 'submission', 189, 'PR-2568-0015', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-11 21:20:47'),
(551, 8, 'create', 'submission', 190, 'PR-2568-0016', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-11 21:27:01'),
(552, 8, 'submit', 'submission', 190, 'PR-2568-0016', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-11 21:27:02'),
(553, 8, 'create', 'submission', 191, 'FA-2568-0006', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-11 21:59:53'),
(554, 8, 'submit', 'submission', 191, 'FA-2568-0006', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-11 21:59:53'),
(555, 8, 'create', 'submission', 192, 'PR-2568-0017', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-11 22:17:10'),
(556, 8, 'submit', 'submission', 192, 'PR-2568-0017', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-11 22:17:11'),
(557, 8, 'create', 'submission', 193, 'PR-2568-0018', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-11 22:25:00'),
(558, 8, 'submit', 'submission', 193, 'PR-2568-0018', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-11 22:25:00'),
(559, 8, 'create', 'submission', 194, 'PR-2568-0019', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-11 22:36:58'),
(560, 8, 'submit', 'submission', 194, 'PR-2568-0019', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-11 22:36:59'),
(561, 8, 'create', 'submission', 195, 'FA-2568-0007', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-11 22:50:09'),
(562, 8, 'submit', 'submission', 195, 'FA-2568-0007', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-11 22:50:10'),
(563, 8, 'create', 'submission', 196, 'PR-2568-0020', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-11 22:55:18'),
(564, 8, 'submit', 'submission', 196, 'PR-2568-0020', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-11 22:55:19'),
(565, 8, 'create', 'submission', 197, 'FA-2568-0008', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-11 23:02:20'),
(566, 8, 'submit', 'submission', 197, 'FA-2568-0008', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-11 23:02:21'),
(567, 8, 'create', 'submission', 198, 'PR-2568-0021', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-11 23:05:31'),
(568, 8, 'submit', 'submission', 198, 'PR-2568-0021', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-11 23:05:32'),
(569, 8, 'create', 'submission', 199, 'PR-2568-0022', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-11 23:12:42'),
(570, 8, 'submit', 'submission', 199, 'PR-2568-0022', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-11 23:12:43'),
(571, 8, 'create', 'submission', 200, 'FA-2568-0009', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 1, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-11 23:13:00'),
(572, 8, 'submit', 'submission', 200, 'FA-2568-0009', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-11 23:13:01'),
(573, 12, 'create', 'submission', 201, 'FA-2568-0010', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-11 23:29:05'),
(574, 12, 'submit', 'submission', 201, 'FA-2568-0010', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-11 23:29:06'),
(575, 8, 'create', 'submission', 202, 'PR-2568-0023', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-11 23:36:03'),
(576, 8, 'submit', 'submission', 202, 'PR-2568-0023', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-11 23:36:04'),
(577, 8, 'create', 'submission', 203, 'PR-2568-0024', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-11 23:47:42'),
(578, 8, 'submit', 'submission', 203, 'PR-2568-0024', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-11 23:47:44'),
(579, 8, 'create', 'submission', 204, 'PR-2568-0025', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-12 18:58:24'),
(580, 8, 'submit', 'submission', 204, 'PR-2568-0025', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-12 18:58:25'),
(581, 8, 'create', 'submission', 205, 'FA-2568-0011', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-12 19:01:16'),
(582, 8, 'submit', 'submission', 205, 'FA-2568-0011', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-12 19:01:16'),
(583, 8, 'create', 'submission', 206, 'PR-2568-0026', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-13 12:57:41'),
(584, 8, 'submit', 'submission', 206, 'PR-2568-0026', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-13 12:57:41'),
(585, 8, 'create', 'submission', 207, 'PR-2568-0027', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-13 12:59:28'),
(586, 8, 'submit', 'submission', 207, 'PR-2568-0027', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-13 12:59:28'),
(587, 8, 'create', 'submission', 208, 'FA-2568-0012', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-13 13:05:58'),
(588, 8, 'submit', 'submission', 208, 'FA-2568-0012', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-13 13:05:58'),
(589, 8, 'create', 'submission', 209, 'PR-2568-0028', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-13 13:11:15'),
(590, 8, 'submit', 'submission', 209, 'PR-2568-0028', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-13 13:11:15'),
(591, 8, 'create', 'submission', 210, 'PR-2568-0029', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-13 13:38:55'),
(592, 8, 'submit', 'submission', 210, 'PR-2568-0029', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-13 13:38:55'),
(593, 8, 'create', 'submission', 211, 'PR-2568-0030', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-13 13:39:57'),
(594, 8, 'submit', 'submission', 211, 'PR-2568-0030', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-13 13:39:57'),
(595, 8, 'create', 'submission', 212, 'PR-2568-0031', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-13 14:10:18'),
(596, 8, 'submit', 'submission', 212, 'PR-2568-0031', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-13 14:10:18'),
(597, 8, 'create', 'submission', 213, 'FA-2568-0013', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-13 14:10:40'),
(598, 8, 'submit', 'submission', 213, 'FA-2568-0013', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-13 14:10:40'),
(599, 8, 'create', 'submission', 214, 'FA-2568-0014', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 6, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-13 14:11:23'),
(600, 8, 'submit', 'submission', 214, 'FA-2568-0014', NULL, NULL, '', NULL, NULL, 'submit submission', '2025-10-13 14:11:23'),
(601, 13, 'update', 'submission', 212, 'PR-2568-0031', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-14 19:36:37'),
(602, 13, 'review', 'submission', 212, 'PR-2568-0031', NULL, NULL, NULL, '58.11.83.64', NULL, 'good', '2025-10-14 19:36:37');
INSERT INTO `audit_logs` (`log_id`, `user_id`, `action`, `entity_type`, `entity_id`, `entity_number`, `old_values`, `new_values`, `changed_fields`, `ip_address`, `user_agent`, `description`, `created_at`) VALUES
(603, 13, 'create', 'submission', 215, 'FA-2568-0015', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 5, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-14 19:44:50'),
(604, 13, 'submit', 'submission', 215, 'FA-2568-0015', NULL, NULL, 'status', NULL, NULL, 'submit submission', '2025-10-14 19:49:23'),
(605, 13, 'create', 'submission', 216, 'PR-2568-0032', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 5, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-14 22:01:25'),
(606, 13, 'create', 'submission', 217, 'PR-2568-0033', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 5, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-14 22:10:46'),
(607, 13, 'create', 'submission', 218, 'PR-2568-0034', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 5, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-14 23:10:55'),
(608, 13, 'delete', 'submission', 218, 'PR-2568-0034', NULL, NULL, NULL, NULL, NULL, 'Deleted submission', '2025-10-14 23:21:51'),
(609, 13, 'create', 'submission', 219, 'PR-2568-0033', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 5, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-15 01:03:10'),
(612, 8, 'update', 'submission', 212, 'PR-2568-0031', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-15 08:43:29'),
(613, 7, 'request_revision', 'submission', 212, 'PR-2568-0031', NULL, NULL, NULL, '58.11.83.64', NULL, 'Admin requested revision: ต้องการเอกสารเพิ่ม', '2025-10-15 08:43:29'),
(614, 13, 'update', 'submission', 215, 'FA-2568-0015', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-15 08:45:55'),
(615, 13, 'request_revision', 'submission', 215, 'FA-2568-0015', NULL, NULL, NULL, '58.11.83.64', NULL, 'Department head requested revision: เพิ่มเอกสาร', '2025-10-15 08:45:55'),
(616, 13, 'create', 'submission', 220, 'PR-2568-0033', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 5, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-15 08:49:34'),
(617, 13, 'submit', 'submission', 220, 'PR-2568-0033', NULL, NULL, 'status', NULL, NULL, 'submit submission', '2025-10-15 08:49:34'),
(618, 13, 'update', 'submission', 220, 'PR-2568-0033', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-15 08:50:20'),
(619, 13, 'review', 'submission', 220, 'PR-2568-0033', NULL, NULL, NULL, '58.11.83.64', NULL, 'ดี', '2025-10-15 08:50:20'),
(620, 8, 'create', 'submission', 221, 'PR-2568-0035', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 5, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-15 12:23:32'),
(621, 8, 'submit', 'submission', 221, 'PR-2568-0035', NULL, NULL, 'status', NULL, NULL, 'submit submission', '2025-10-15 12:23:33'),
(622, 13, 'update', 'submission', 221, 'PR-2568-0035', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-15 12:25:05'),
(623, 13, 'review', 'submission', 221, 'PR-2568-0035', NULL, NULL, NULL, '58.11.83.64', NULL, 'ไฟล์น่าจะครบแล้ว', '2025-10-15 12:25:05'),
(624, 8, 'update', 'submission', 221, 'PR-2568-0035', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-15 12:25:32'),
(625, 7, 'request_revision', 'submission', 221, 'PR-2568-0035', NULL, NULL, NULL, '58.11.83.64', NULL, 'Admin requested revision: ไปใส่เอกสารเพิ่มอีก', '2025-10-15 12:25:32'),
(626, 8, 'create', 'submission', 222, 'PR-2568-0036', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 5, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-15 14:28:04'),
(627, 8, 'submit', 'submission', 222, 'PR-2568-0036', NULL, NULL, 'status', NULL, NULL, 'submit submission', '2025-10-15 14:28:05'),
(628, 13, 'update', 'submission', 222, 'PR-2568-0036', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-15 14:40:51'),
(629, 13, 'review', 'submission', 222, 'PR-2568-0036', NULL, NULL, NULL, '58.11.83.64', NULL, 'ผ่าน', '2025-10-15 14:40:51'),
(630, 8, 'update', 'submission', 222, 'PR-2568-0036', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-15 14:45:10'),
(631, 7, 'request_revision', 'submission', 222, 'PR-2568-0036', NULL, NULL, NULL, '58.11.83.64', NULL, 'Admin requested revision: ขอไฟล์เอกสารอื่นๆเพิ่ม', '2025-10-15 14:45:10'),
(632, 8, 'create', 'submission', 223, 'PR-2568-0037', NULL, '{\"submission_type\": \"publication_reward\", \"status_id\": 5, \"year_id\": 3}', NULL, NULL, NULL, 'Created new publication_reward', '2025-10-15 14:53:36'),
(633, 8, 'create', 'submission', 224, 'FA-2568-0016', NULL, '{\"submission_type\": \"fund_application\", \"status_id\": 5, \"year_id\": 3}', NULL, NULL, NULL, 'Created new fund_application', '2025-10-15 15:42:09'),
(634, 8, 'submit', 'submission', 224, 'FA-2568-0016', NULL, NULL, 'status', NULL, NULL, 'submit submission', '2025-10-15 15:42:09'),
(635, 8, 'update', 'submission', 224, 'FA-2568-0016', NULL, NULL, 'status', NULL, NULL, 'update submission', '2025-10-15 15:43:28'),
(636, 13, 'request_revision', 'submission', 224, 'FA-2568-0016', NULL, NULL, NULL, '58.11.83.64', NULL, 'Department head requested revision: asdasd', '2025-10-15 15:43:28');

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
  `is_required` enum('yes','no') DEFAULT NULL COMMENT 'ไม่ได้ใช้',
  `create_at` datetime DEFAULT current_timestamp(),
  `update_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `delete_at` datetime DEFAULT NULL,
  `fund_types` longtext DEFAULT NULL COMMENT 'ประเภททุนที่ใช้ได้ ["publication_reward", "fund_application"]' CHECK (json_valid(`fund_types`)),
  `subcategory_ids` longtext DEFAULT NULL COMMENT 'ไม่ได้ใช้',
  `subcategory_name` longtext DEFAULT NULL COMMENT 'snapshot ของชื่อทุน ไม่ผูก FK'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- dump ตาราง `document_types`
--

INSERT INTO `document_types` (`document_type_id`, `document_type_name`, `code`, `category`, `required`, `multiple`, `document_order`, `is_required`, `create_at`, `update_at`, `delete_at`, `fund_types`, `subcategory_ids`, `subcategory_name`) VALUES
(1, 'QS WUR 1-400', 'qs_wur_1-400', '', 0, 0, 3, NULL, NULL, '2025-10-12 09:32:44', NULL, NULL, '[\"1.10 ทุนพัฒนากลุ่มวิจัยบูรณาการ\",\"1.1 ทุนสนับสนุนผู้เชี่ยวชาญต่างประเทศ\"]', '[\"1.10 ทุนพัฒนากลุ่มวิจัยบูรณาการ\",\"1.1 ทุนสนับสนุนผู้เชี่ยวชาญต่างประเทศ\"]'),
(2, 'Full Reprint (บทความตีพิมพ์)', 'full_reprint_(บทความตีพิมพ์)', 'publication', 1, 0, 4, NULL, NULL, '2025-10-11 20:39:03', NULL, '[\"publication_reward\"]', NULL, NULL),
(3, 'Scopus-ISI (หลักฐานการจัดอันดับ)', 'scopus-isi_(หลักฐานการจัดอันดับ)', 'publication', 1, 0, 5, NULL, NULL, '2025-10-11 20:39:03', NULL, '[\"publication_reward\"]', NULL, NULL),
(4, 'สำเนาบัญชีธนาคาร', 'สำเนาบัญชีธนาคาร', '', 1, 0, 6, NULL, NULL, '2025-10-11 20:39:03', NULL, '[\"fund_application, publication_reward\"]', NULL, NULL),
(5, 'Payment / Exchange rate', 'payment_/_exchange_rate', 'publication', 0, 0, 7, NULL, NULL, '2025-10-11 20:39:03', NULL, '[\"publication_reward\"]', NULL, NULL),
(6, 'Page Charge Invoice', 'page_charge_invoice', '', 0, 0, 8, NULL, NULL, '2025-10-11 20:39:03', NULL, NULL, NULL, NULL),
(7, 'Page Charge Receipt', 'page_charge_receipt', 'publication', 0, 0, 9, NULL, NULL, '2025-10-11 20:39:03', NULL, '[\"publication_reward\"]', NULL, NULL),
(8, 'Manuscript Editor Invoice', 'manuscript_editor_invoice', 'publication', 0, 0, 10, NULL, NULL, '2025-10-11 20:39:03', NULL, '[\"publication_reward\"]', NULL, NULL),
(9, 'Manuscript Receipt', 'manuscript_receipt', '', 0, 0, 11, NULL, NULL, '2025-10-11 20:39:03', NULL, NULL, NULL, NULL),
(10, 'Review Response (Special issue)', 'review_response_(special_issue)', '', 0, 0, 12, NULL, NULL, '2025-10-11 20:39:03', NULL, NULL, NULL, NULL),
(11, 'เอกสารอื่นๆ', 'เอกสารอื่นๆ', 'publication', 0, 1, 13, NULL, NULL, '2025-10-11 20:39:03', NULL, '[\"publication_reward\"]', NULL, NULL),
(12, 'เอกสารเบิกจ่ายภายนอก', 'เอกสารเบิกจ่ายภายนอก', 'publication', 0, 1, 14, NULL, NULL, '2025-10-11 20:39:03', NULL, '[\"publication_reward\"]', NULL, NULL),
(13, 'โครงการวิจัย', 'research_proposal', 'general', 0, 0, 15, NULL, '2025-08-29 13:31:42', '2025-10-11 20:39:03', NULL, '[\"fund_application\"]', NULL, '[\"2.2 เงินรางวัลการตีพิมพ์เผยแพร่ผลงานวิจัยที่ได้รับการตีพิมพ์ในสาขาวิทยาศาสตร์และเทคโนโลยี (กรณีเป็นผู้แต่งชื่อแรก)\"]'),
(14, 'งบประมาณ', 'budget_plan', 'general', 0, 0, 16, NULL, '2025-08-29 13:31:42', '2025-10-11 20:39:03', NULL, '[\"fund_application\"]', NULL, NULL),
(15, 'CV ผู้วิจัย', 'researcher_cv', 'general', 0, 0, 17, NULL, '2025-08-29 13:31:42', '2025-10-11 20:39:03', NULL, '[\"fund_application, publication_reward\"]', NULL, NULL),
(16, 'แบบฟอร์มคำขอรับเงินรางวัล (DOCX) (Auto Generated)', 'publication_reward_form_docx', 'publication_reward', 0, 0, 1, NULL, '2025-09-30 13:41:38', '2025-10-12 10:08:55', NULL, NULL, NULL, NULL),
(20, 'แบบฟอร์มคำขอรับเงินรางวัล (หัวหน้าภาคลงนาม DOCX)', 'publication_reward_form_head_signed_docx', 'publication_reward', 0, 1, 18, NULL, '2025-10-07 12:44:35', '2025-10-11 20:39:03', NULL, NULL, NULL, NULL),
(21, 'แบบฟอร์มคำขอรับเงินรางวัล (PDF) (Auto Generated)', 'publication_reward_form_pdf', 'publication_reward', 0, 0, 2, NULL, '2025-10-11 13:26:49', '2025-10-12 10:10:14', NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- โครงสร้างตาราง `end_of_contract`
--

CREATE TABLE `end_of_contract` (
  `eoc_id` int(11) NOT NULL,
  `content` longtext NOT NULL,
  `display_order` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
(378, 'form_sample_PR-2568-0001.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub170_2025-10-07/form_sample_PR-2568-0001.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-07 22:10:43', '2025-10-07 22:10:43', '2025-10-07 22:10:44', NULL),
(379, 'form_sample_1_PR-2568-0001.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub170_2025-10-07/form_sample_1_PR-2568-0001.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-07 22:10:44', '2025-10-07 22:10:44', '2025-10-07 22:10:44', NULL),
(380, 'PR-2568-0001_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub170_2025-10-07/PR-2568-0001_publication_reward_form.docx', 'submission', NULL, 26302, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-07 22:10:44', '2025-10-07 22:10:44', '2025-10-07 22:10:44', NULL),
(381, 'form_sample_PR-2568-0002.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub171_2025-10-07/form_sample_PR-2568-0002.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-07 22:35:41', '2025-10-07 22:35:41', '2025-10-07 22:35:41', NULL),
(382, 'form_sample_1_PR-2568-0002.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub171_2025-10-07/form_sample_1_PR-2568-0002.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-07 22:35:41', '2025-10-07 22:35:41', '2025-10-07 22:35:41', NULL),
(383, 'PR-2568-0002_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub171_2025-10-07/PR-2568-0002_publication_reward_form.docx', 'submission', NULL, 26302, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-07 22:35:42', '2025-10-07 22:35:42', '2025-10-07 22:35:42', NULL),
(384, 'sample_PR-2568-0003.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub172_2025-10-07/sample_PR-2568-0003.pdf', 'submission', NULL, 18810, 'application/pdf', '', 0, 8, '2025-10-07 23:33:37', '2025-10-07 23:33:37', '2025-10-07 23:33:37', NULL),
(385, 'file-sample_150kB_PR-2568-0003.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub172_2025-10-07/file-sample_150kB_PR-2568-0003.pdf', 'submission', NULL, 142786, 'application/pdf', '', 0, 8, '2025-10-07 23:33:37', '2025-10-07 23:33:37', '2025-10-07 23:33:37', NULL),
(386, 'sample-local-pdf_PR-2568-0003.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub172_2025-10-07/sample-local-pdf_PR-2568-0003.pdf', 'submission', NULL, 49672, 'application/pdf', '', 0, 8, '2025-10-07 23:33:37', '2025-10-07 23:33:37', '2025-10-07 23:33:37', NULL),
(387, 'PR-2568-0003_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub172_2025-10-07/PR-2568-0003_publication_reward_form.docx', 'submission', NULL, 26351, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-07 23:33:37', '2025-10-07 23:33:37', '2025-10-07 23:33:37', NULL),
(388, 'PR-2568-0002_publication_reward_form_head_signed.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub171_2025-10-07/PR-2568-0002_publication_reward_form_head_signed.docx', 'submission', NULL, 26371, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 13, '2025-10-07 23:35:19', '2025-10-07 23:35:19', '2025-10-07 23:35:19', NULL),
(389, 'sample-local-pdf_PR-2568-0004.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub173_2025-10-08/sample-local-pdf_PR-2568-0004.pdf', 'submission', NULL, 49672, 'application/pdf', '', 0, 8, '2025-10-08 00:06:04', '2025-10-08 00:06:04', '2025-10-08 00:06:04', NULL),
(390, 'sample_PR-2568-0004.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub173_2025-10-08/sample_PR-2568-0004.pdf', 'submission', NULL, 18810, 'application/pdf', '', 0, 8, '2025-10-08 00:06:04', '2025-10-08 00:06:04', '2025-10-08 00:06:04', NULL),
(391, 'PR-2568-0004_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub173_2025-10-08/PR-2568-0004_publication_reward_form.docx', 'submission', NULL, 26296, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-08 00:06:04', '2025-10-08 00:06:04', '2025-10-08 00:06:04', NULL),
(392, 'sample-local-pdf_FA-2568-0001.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/fund174_2025-10-08/sample-local-pdf_FA-2568-0001.pdf', 'submission', NULL, 49672, 'application/pdf', '', 0, 8, '2025-10-08 00:19:15', '2025-10-08 00:19:15', '2025-10-08 00:19:15', NULL),
(393, 'sample-local-pdf_FA-2568-0001_1.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/fund174_2025-10-08/sample-local-pdf_FA-2568-0001_1.pdf', 'submission', NULL, 49672, 'application/pdf', '', 0, 8, '2025-10-08 00:19:15', '2025-10-08 00:19:15', '2025-10-08 00:19:15', NULL),
(394, 'sample-local-pdf_FA-2568-0001_2.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/fund174_2025-10-08/sample-local-pdf_FA-2568-0001_2.pdf', 'submission', NULL, 49672, 'application/pdf', '', 0, 8, '2025-10-08 00:19:15', '2025-10-08 00:19:15', '2025-10-08 00:19:15', NULL),
(395, 'Full_Reprint_PR-2568-0005.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub175_2025-10-08/Full_Reprint_PR-2568-0005.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-08 10:52:09', '2025-10-08 10:52:09', '2025-10-08 10:52:09', NULL),
(396, 'Scopus-ISI_PR-2568-0005.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub175_2025-10-08/Scopus-ISI_PR-2568-0005.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-08 10:52:09', '2025-10-08 10:52:09', '2025-10-08 10:52:09', NULL),
(397, 'Payment_PR-2568-0005.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub175_2025-10-08/Payment_PR-2568-0005.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-08 10:52:09', '2025-10-08 10:52:09', '2025-10-08 10:52:09', NULL),
(398, 'Page_Charge_PR-2568-0005.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub175_2025-10-08/Page_Charge_PR-2568-0005.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-08 10:52:09', '2025-10-08 10:52:09', '2025-10-08 10:52:09', NULL),
(399, 'Manuscript_PR-2568-0005.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub175_2025-10-08/Manuscript_PR-2568-0005.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-08 10:52:09', '2025-10-08 10:52:09', '2025-10-08 10:52:09', NULL),
(400, 'เอกสารอื่น_ๆ_PR-2568-0005.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub175_2025-10-08/เอกสารอื่น_ๆ_PR-2568-0005.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-08 10:52:09', '2025-10-08 10:52:09', '2025-10-08 10:52:09', NULL),
(401, 'ExFund1_PR-2568-0005.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub175_2025-10-08/ExFund1_PR-2568-0005.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-08 10:52:09', '2025-10-08 10:52:09', '2025-10-08 10:52:09', NULL),
(402, 'ExFund2_PR-2568-0005.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub175_2025-10-08/ExFund2_PR-2568-0005.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-08 10:52:09', '2025-10-08 10:52:09', '2025-10-08 10:52:09', NULL),
(403, 'ExFund3_PR-2568-0005.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub175_2025-10-08/ExFund3_PR-2568-0005.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-08 10:52:09', '2025-10-08 10:52:09', '2025-10-08 10:52:10', NULL),
(404, 'ExFund4_PR-2568-0005.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub175_2025-10-08/ExFund4_PR-2568-0005.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-08 10:52:10', '2025-10-08 10:52:10', '2025-10-08 10:52:10', NULL),
(405, 'PR-2568-0005_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub175_2025-10-08/PR-2568-0005_publication_reward_form.docx', 'submission', NULL, 26412, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-08 10:52:10', '2025-10-08 10:52:10', '2025-10-08 10:52:10', NULL),
(406, 'PR-2568-0005_publication_reward_form_head_signed.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub175_2025-10-08/PR-2568-0005_publication_reward_form_head_signed.docx', 'submission', NULL, 26476, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 13, '2025-10-09 10:11:51', '2025-10-09 10:11:51', '2025-10-09 10:11:51', NULL),
(407, 'Full_Reprint_PR-2568-0006.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub176_2025-10-09/Full_Reprint_PR-2568-0006.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-09 10:14:12', '2025-10-09 10:14:12', '2025-10-09 10:14:12', NULL),
(408, 'Scopus-ISI_PR-2568-0006.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub176_2025-10-09/Scopus-ISI_PR-2568-0006.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-09 10:14:12', '2025-10-09 10:14:12', '2025-10-09 10:14:12', NULL),
(409, 'PR-2568-0006_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub176_2025-10-09/PR-2568-0006_publication_reward_form.docx', 'submission', NULL, 26302, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-09 10:14:12', '2025-10-09 10:14:12', '2025-10-09 10:14:12', NULL),
(410, 'PR-2568-0006_publication_reward_form_head_signed.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub176_2025-10-09/PR-2568-0006_publication_reward_form_head_signed.docx', 'submission', NULL, 26368, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 13, '2025-10-09 10:14:37', '2025-10-09 10:14:37', '2025-10-09 10:14:37', NULL),
(411, 'Payment_FA-2568-0002.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/fund177_2025-10-09/Payment_FA-2568-0002.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-09 10:18:34', '2025-10-09 10:18:34', '2025-10-09 10:18:34', NULL),
(412, 'Scopus-ISI_FA-2568-0002.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/fund177_2025-10-09/Scopus-ISI_FA-2568-0002.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-09 10:18:34', '2025-10-09 10:18:34', '2025-10-09 10:18:34', NULL),
(413, 'Full_Reprint_FA-2568-0002.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/fund177_2025-10-09/Full_Reprint_FA-2568-0002.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-09 10:18:34', '2025-10-09 10:18:34', '2025-10-09 10:18:34', NULL),
(414, 'Full_Reprint_PR-2568-0007.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub178_2025-10-09/Full_Reprint_PR-2568-0007.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-09 11:23:45', '2025-10-09 11:23:45', '2025-10-09 11:23:45', NULL),
(415, 'Scopus-ISI_PR-2568-0007.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub178_2025-10-09/Scopus-ISI_PR-2568-0007.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-09 11:23:45', '2025-10-09 11:23:45', '2025-10-09 11:23:45', NULL),
(416, 'PR-2568-0007_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub178_2025-10-09/PR-2568-0007_publication_reward_form.docx', 'submission', NULL, 26302, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-09 11:23:45', '2025-10-09 11:23:45', '2025-10-09 11:23:45', NULL),
(417, 'PR-2568-0007_publication_reward_form_head_signed.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub178_2025-10-09/PR-2568-0007_publication_reward_form_head_signed.docx', 'submission', NULL, 26368, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 13, '2025-10-09 11:28:57', '2025-10-09 11:28:57', '2025-10-09 11:28:57', NULL),
(418, 'Full Reprint.pdf', 'uploads/users/user_8_สมชาย_ใจดี/temp/Full_Reprint.pdf', 'temp', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-09 13:58:45', '2025-10-09 13:58:45', '2025-10-09 13:58:45', NULL),
(419, 'Full Reprint.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub181_2025-10-09/Full_Reprint_PR-2568-0010_1.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-09 14:23:08', '2025-10-09 14:23:08', '2025-10-09 14:23:08', NULL),
(420, 'Scopus-ISI.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub181_2025-10-09/Scopus-ISI_PR-2568-0010.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-09 14:23:08', '2025-10-09 14:23:08', '2025-10-09 14:23:08', NULL),
(421, 'PR-2568-0010_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/pub181_2025-10-09/PR-2568-0010_publication_reward_form.docx', 'submission', NULL, 26378, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-09 14:23:08', '2025-10-09 14:23:08', '2025-10-09 14:23:08', NULL),
(422, 'form_sample.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0011/form_sample_PR-2568-0011.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-11 11:01:14', '2025-10-11 11:01:14', '2025-10-11 11:01:14', NULL),
(423, 'Final Report.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0011/Final_Report_PR-2568-0011.pdf', 'submission', NULL, 3194914, 'application/pdf', '', 0, 8, '2025-10-11 11:01:16', '2025-10-11 11:01:16', '2025-10-11 11:01:16', NULL),
(424, 'PR-2568-0011_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0011/PR-2568-0011_publication_reward_form.docx', 'submission', NULL, 26379, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-11 11:01:16', '2025-10-11 11:01:16', '2025-10-11 11:01:16', NULL),
(425, 'form_sample.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0012/form_sample_PR-2568-0012.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-11 12:23:19', '2025-10-11 12:23:19', '2025-10-11 12:23:19', NULL),
(426, 'Final Report.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0012/Final_Report_PR-2568-0012.pdf', 'submission', NULL, 3194914, 'application/pdf', '', 0, 8, '2025-10-11 12:23:21', '2025-10-11 12:23:21', '2025-10-11 12:23:21', NULL),
(427, 'PR-2568-0012_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0012/PR-2568-0012_publication_reward_form.docx', 'submission', NULL, 26393, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-11 12:23:22', '2025-10-11 12:23:22', '2025-10-11 12:23:22', NULL),
(428, 'Full Reprint.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0013/Full_Reprint_PR-2568-0013.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-11 13:26:47', '2025-10-11 13:26:47', '2025-10-11 13:26:47', NULL),
(429, 'Scopus-ISI.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0013/Scopus-ISI_PR-2568-0013.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-11 13:26:48', '2025-10-11 13:26:48', '2025-10-11 13:26:48', NULL),
(430, 'Payment.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0013/Payment_PR-2568-0013.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-11 13:26:48', '2025-10-11 13:26:48', '2025-10-11 13:26:48', NULL),
(431, 'Page Charge.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0013/Page_Charge_PR-2568-0013.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-11 13:26:48', '2025-10-11 13:26:48', '2025-10-11 13:26:48', NULL),
(432, 'Manuscript.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0013/Manuscript_PR-2568-0013.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-11 13:26:48', '2025-10-11 13:26:48', '2025-10-11 13:26:48', NULL),
(433, 'เอกสารอื่น ๆ.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0013/เอกสารอื่น_ๆ_PR-2568-0013.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-11 13:26:48', '2025-10-11 13:26:48', '2025-10-11 13:26:48', NULL),
(434, 'เอกสารอื่น ๆ.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0013/เอกสารอื่น_ๆ_PR-2568-0013_1.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-11 13:26:48', '2025-10-11 13:26:48', '2025-10-11 13:26:48', NULL),
(435, 'เอกสารอื่น ๆ 2.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0013/เอกสารอื่น_ๆ_2_PR-2568-0013.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-11 13:26:48', '2025-10-11 13:26:48', '2025-10-11 13:26:48', NULL),
(436, 'ExFund1.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0013/ExFund1_PR-2568-0013.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-11 13:26:48', '2025-10-11 13:26:48', '2025-10-11 13:26:49', NULL),
(437, 'ExFund2.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0013/ExFund2_PR-2568-0013.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-11 13:26:49', '2025-10-11 13:26:49', '2025-10-11 13:26:49', NULL),
(438, 'ExFund3.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0013/ExFund3_PR-2568-0013.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-11 13:26:49', '2025-10-11 13:26:49', '2025-10-11 13:26:49', NULL),
(439, 'ExFund4.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0013/ExFund4_PR-2568-0013.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-11 13:26:49', '2025-10-11 13:26:49', '2025-10-11 13:26:49', NULL),
(440, 'PR-2568-0013_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0013/PR-2568-0013_publication_reward_form.docx', 'submission', NULL, 26494, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-11 13:26:49', '2025-10-11 13:26:49', '2025-10-11 13:26:49', NULL),
(441, 'PR-2568-0013_publication_reward_form.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0013/PR-2568-0013_publication_reward_form.pdf', 'submission', NULL, 120104, 'application/pdf', '', 0, 8, '2025-10-11 13:26:49', '2025-10-11 13:26:49', '2025-10-11 13:26:49', NULL),
(442, 'Full Reprint.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/FA-2568-0003/Full_Reprint_FA-2568-0003.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-11 13:43:37', '2025-10-11 13:43:37', '2025-10-11 13:43:37', NULL),
(443, 'Page Charge.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/FA-2568-0003/Page_Charge_FA-2568-0003.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-11 13:43:37', '2025-10-11 13:43:37', '2025-10-11 13:43:37', NULL),
(444, 'sample.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/FA-2568-0004/sample_FA-2568-0004.pdf', 'submission', NULL, 18810, 'application/pdf', '', 0, 8, '2025-10-11 20:30:18', '2025-10-11 20:30:18', '2025-10-11 20:30:18', NULL),
(445, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/FA-2568-0004/sample-local-pdf_FA-2568-0004.pdf', 'submission', NULL, 49672, 'application/pdf', '', 0, 8, '2025-10-11 20:30:18', '2025-10-11 20:30:18', '2025-10-11 20:30:18', NULL),
(446, 'Full Reprint.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0014/Full_Reprint_PR-2568-0014.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-11 20:44:34', '2025-10-11 20:44:34', '2025-10-11 20:44:34', NULL),
(447, 'Scopus-ISI.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0014/Scopus-ISI_PR-2568-0014.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-11 20:44:35', '2025-10-11 20:44:35', '2025-10-11 20:44:35', NULL),
(448, 'PR-2568-0014_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0014/PR-2568-0014_publication_reward_form.docx', 'submission', NULL, 26385, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-11 20:44:35', '2025-10-11 20:44:35', '2025-10-11 20:44:35', NULL),
(449, 'PR-2568-0014_publication_reward_form.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0014/PR-2568-0014_publication_reward_form.pdf', 'submission', NULL, 115168, 'application/pdf', '', 0, 8, '2025-10-11 20:44:35', '2025-10-11 20:44:35', '2025-10-11 20:44:35', NULL),
(450, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/FA-2568-0005/sample-local-pdf_FA-2568-0005.pdf', 'submission', NULL, 49672, 'application/pdf', '', 0, 8, '2025-10-11 21:17:22', '2025-10-11 21:17:22', '2025-10-11 21:17:22', NULL),
(451, 'sample.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/FA-2568-0005/sample_FA-2568-0005.pdf', 'submission', NULL, 18810, 'application/pdf', '', 0, 8, '2025-10-11 21:17:22', '2025-10-11 21:17:22', '2025-10-11 21:17:22', NULL),
(452, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0015/sample-local-pdf_PR-2568-0015.pdf', 'submission', NULL, 49672, 'application/pdf', '', 0, 8, '2025-10-11 21:20:47', '2025-10-11 21:20:47', '2025-10-11 21:20:47', NULL),
(453, 'sample.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0015/sample_PR-2568-0015.pdf', 'submission', NULL, 18810, 'application/pdf', '', 0, 8, '2025-10-11 21:20:47', '2025-10-11 21:20:47', '2025-10-11 21:20:47', NULL),
(454, 'sample.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0015/sample_PR-2568-0015_1.pdf', 'submission', NULL, 18810, 'application/pdf', '', 0, 8, '2025-10-11 21:20:47', '2025-10-11 21:20:47', '2025-10-11 21:20:47', NULL),
(455, 'PR-2568-0015_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0015/PR-2568-0015_publication_reward_form.docx', 'submission', NULL, 26419, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-11 21:20:47', '2025-10-11 21:20:47', '2025-10-11 21:20:47', NULL),
(456, 'PR-2568-0015_publication_reward_form.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0015/PR-2568-0015_publication_reward_form.pdf', 'submission', NULL, 114505, 'application/pdf', '', 0, 8, '2025-10-11 21:20:47', '2025-10-11 21:20:47', '2025-10-11 21:20:47', NULL),
(457, 'Full Reprint.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0016/Full_Reprint_PR-2568-0016.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-11 21:27:01', '2025-10-11 21:27:01', '2025-10-11 21:27:01', NULL),
(458, 'Scopus-ISI.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0016/Scopus-ISI_PR-2568-0016.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-11 21:27:02', '2025-10-11 21:27:02', '2025-10-11 21:27:02', NULL),
(459, 'PR-2568-0016_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0016/PR-2568-0016_publication_reward_form.docx', 'submission', NULL, 26385, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-11 21:27:02', '2025-10-11 21:27:02', '2025-10-11 21:27:02', NULL),
(460, 'PR-2568-0016_publication_reward_form.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0016/PR-2568-0016_publication_reward_form.pdf', 'submission', NULL, 115168, 'application/pdf', '', 0, 8, '2025-10-11 21:27:02', '2025-10-11 21:27:02', '2025-10-11 21:27:02', NULL),
(461, 'sample.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/FA-2568-0006/sample_FA-2568-0006.pdf', 'submission', NULL, 18810, 'application/pdf', '', 0, 8, '2025-10-11 21:59:53', '2025-10-11 21:59:53', '2025-10-11 21:59:53', NULL),
(462, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/FA-2568-0006/sample-local-pdf_FA-2568-0006.pdf', 'submission', NULL, 49672, 'application/pdf', '', 0, 8, '2025-10-11 21:59:53', '2025-10-11 21:59:53', '2025-10-11 21:59:53', NULL),
(463, 'Full Reprint.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0017/Full_Reprint_PR-2568-0017.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-11 22:17:11', '2025-10-11 22:17:11', '2025-10-11 22:17:11', NULL),
(464, 'Scopus-ISI.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0017/Scopus-ISI_PR-2568-0017.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-11 22:17:11', '2025-10-11 22:17:11', '2025-10-11 22:17:11', NULL),
(465, 'Manuscript.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0017/Manuscript_PR-2568-0017.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-11 22:17:11', '2025-10-11 22:17:11', '2025-10-11 22:17:11', NULL),
(466, 'PR-2568-0017_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0017/PR-2568-0017_publication_reward_form.docx', 'submission', NULL, 26406, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-11 22:17:11', '2025-10-11 22:17:11', '2025-10-11 22:17:11', NULL),
(467, 'PR-2568-0017_publication_reward_form.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0017/PR-2568-0017_publication_reward_form.pdf', 'submission', NULL, 115925, 'application/pdf', '', 0, 8, '2025-10-11 22:17:11', '2025-10-11 22:17:11', '2025-10-11 22:17:11', NULL),
(468, 'Full Reprint.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0018/Full_Reprint_PR-2568-0018.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-11 22:25:00', '2025-10-11 22:25:00', '2025-10-11 22:25:00', NULL),
(469, 'Scopus-ISI.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0018/Scopus-ISI_PR-2568-0018.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-11 22:25:00', '2025-10-11 22:25:00', '2025-10-11 22:25:00', NULL),
(470, 'PR-2568-0018_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0018/PR-2568-0018_publication_reward_form.docx', 'submission', NULL, 26379, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-11 22:25:00', '2025-10-11 22:25:00', '2025-10-11 22:25:00', NULL),
(471, 'PR-2568-0018_publication_reward_form.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0018/PR-2568-0018_publication_reward_form.pdf', 'submission', NULL, 115061, 'application/pdf', '', 0, 8, '2025-10-11 22:25:00', '2025-10-11 22:25:00', '2025-10-11 22:25:00', NULL),
(472, 'Full Reprint.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0019/Full_Reprint_PR-2568-0019.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-11 22:36:58', '2025-10-11 22:36:58', '2025-10-11 22:36:58', NULL),
(473, 'Scopus-ISI.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0019/Scopus-ISI_PR-2568-0019.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-11 22:36:58', '2025-10-11 22:36:58', '2025-10-11 22:36:59', NULL),
(474, 'PR-2568-0019_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0019/PR-2568-0019_publication_reward_form.docx', 'submission', NULL, 26379, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-11 22:36:59', '2025-10-11 22:36:59', '2025-10-11 22:36:59', NULL),
(475, 'PR-2568-0019_publication_reward_form.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0019/PR-2568-0019_publication_reward_form.pdf', 'submission', NULL, 115061, 'application/pdf', '', 0, 8, '2025-10-11 22:36:59', '2025-10-11 22:36:59', '2025-10-11 22:36:59', NULL),
(476, 'sample.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/FA-2568-0007/sample_FA-2568-0007.pdf', 'submission', NULL, 18810, 'application/pdf', '', 0, 8, '2025-10-11 22:50:09', '2025-10-11 22:50:09', '2025-10-11 22:50:09', NULL),
(477, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/FA-2568-0007/sample-local-pdf_FA-2568-0007.pdf', 'submission', NULL, 49672, 'application/pdf', '', 0, 8, '2025-10-11 22:50:09', '2025-10-11 22:50:09', '2025-10-11 22:50:09', NULL),
(478, 'Full Reprint.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0020/Full_Reprint_PR-2568-0020.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-11 22:55:19', '2025-10-11 22:55:19', '2025-10-11 22:55:19', NULL),
(479, 'Scopus-ISI.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0020/Scopus-ISI_PR-2568-0020.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-11 22:55:19', '2025-10-11 22:55:19', '2025-10-11 22:55:19', NULL),
(480, 'PR-2568-0020_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0020/PR-2568-0020_publication_reward_form.docx', 'submission', NULL, 26364, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-11 22:55:19', '2025-10-11 22:55:19', '2025-10-11 22:55:19', NULL),
(481, 'PR-2568-0020_publication_reward_form.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0020/PR-2568-0020_publication_reward_form.pdf', 'submission', NULL, 114589, 'application/pdf', '', 0, 8, '2025-10-11 22:55:19', '2025-10-11 22:55:19', '2025-10-11 22:55:19', NULL),
(482, 'sample.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/FA-2568-0008/sample_FA-2568-0008.pdf', 'submission', NULL, 18810, 'application/pdf', '', 0, 8, '2025-10-11 23:02:20', '2025-10-11 23:02:20', '2025-10-11 23:02:20', NULL),
(483, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/FA-2568-0008/sample-local-pdf_FA-2568-0008.pdf', 'submission', NULL, 49672, 'application/pdf', '', 0, 8, '2025-10-11 23:02:20', '2025-10-11 23:02:20', '2025-10-11 23:02:20', NULL),
(484, 'Full Reprint.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0021/Full_Reprint_PR-2568-0021.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-11 23:05:31', '2025-10-11 23:05:31', '2025-10-11 23:05:31', NULL),
(485, 'Scopus-ISI.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0021/Scopus-ISI_PR-2568-0021.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-11 23:05:31', '2025-10-11 23:05:31', '2025-10-11 23:05:31', NULL),
(486, 'PR-2568-0021_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0021/PR-2568-0021_publication_reward_form.docx', 'submission', NULL, 26379, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-11 23:05:32', '2025-10-11 23:05:32', '2025-10-11 23:05:32', NULL),
(487, 'PR-2568-0021_publication_reward_form.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0021/PR-2568-0021_publication_reward_form.pdf', 'submission', NULL, 115061, 'application/pdf', '', 0, 8, '2025-10-11 23:05:32', '2025-10-11 23:05:32', '2025-10-11 23:05:32', NULL),
(488, 'Full Reprint.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0022/Full_Reprint_PR-2568-0022.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-11 23:12:43', '2025-10-11 23:12:43', '2025-10-11 23:12:43', NULL),
(489, 'Scopus-ISI.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0022/Scopus-ISI_PR-2568-0022.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-11 23:12:43', '2025-10-11 23:12:43', '2025-10-11 23:12:43', NULL),
(490, 'PR-2568-0022_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0022/PR-2568-0022_publication_reward_form.docx', 'submission', NULL, 26379, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-11 23:12:43', '2025-10-11 23:12:43', '2025-10-11 23:12:43', NULL),
(491, 'PR-2568-0022_publication_reward_form.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0022/PR-2568-0022_publication_reward_form.pdf', 'submission', NULL, 115061, 'application/pdf', '', 0, 8, '2025-10-11 23:12:43', '2025-10-11 23:12:43', '2025-10-11 23:12:43', NULL),
(492, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/FA-2568-0009/sample-local-pdf_FA-2568-0009.pdf', 'submission', NULL, 49672, 'application/pdf', '', 0, 8, '2025-10-11 23:13:00', '2025-10-11 23:13:00', '2025-10-11 23:13:00', NULL),
(493, 'sample.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/FA-2568-0009/sample_FA-2568-0009.pdf', 'submission', NULL, 18810, 'application/pdf', '', 0, 8, '2025-10-11 23:13:00', '2025-10-11 23:13:00', '2025-10-11 23:13:00', NULL),
(494, 'sample-local-pdf.pdf', 'uploads/users/user_12_สมหมาย_จันทร์/submissions/FA-2568-0010/sample-local-pdf_FA-2568-0010.pdf', 'submission', NULL, 49672, 'application/pdf', '', 0, 12, '2025-10-11 23:29:05', '2025-10-11 23:29:05', '2025-10-11 23:29:06', NULL),
(495, 'sample.pdf', 'uploads/users/user_12_สมหมาย_จันทร์/submissions/FA-2568-0010/sample_FA-2568-0010.pdf', 'submission', NULL, 18810, 'application/pdf', '', 0, 12, '2025-10-11 23:29:05', '2025-10-11 23:29:05', '2025-10-11 23:29:06', NULL),
(496, 'Full Reprint.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0023/Full_Reprint_PR-2568-0023.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-11 23:36:03', '2025-10-11 23:36:03', '2025-10-11 23:36:03', NULL),
(497, 'Scopus-ISI.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0023/Scopus-ISI_PR-2568-0023.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-11 23:36:03', '2025-10-11 23:36:03', '2025-10-11 23:36:04', NULL),
(498, 'PR-2568-0023_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0023/PR-2568-0023_publication_reward_form.docx', 'submission', NULL, 26379, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-11 23:36:04', '2025-10-11 23:36:04', '2025-10-11 23:36:04', NULL),
(499, 'PR-2568-0023_publication_reward_form.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0023/PR-2568-0023_publication_reward_form.pdf', 'submission', NULL, 115061, 'application/pdf', '', 0, 8, '2025-10-11 23:36:04', '2025-10-11 23:36:04', '2025-10-11 23:36:04', NULL),
(500, 'Full Reprint.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0024/Full_Reprint_PR-2568-0024.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-11 23:47:43', '2025-10-11 23:47:43', '2025-10-11 23:47:43', NULL),
(501, 'Scopus-ISI.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0024/Scopus-ISI_PR-2568-0024.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-11 23:47:43', '2025-10-11 23:47:43', '2025-10-11 23:47:43', NULL),
(502, 'PR-2568-0024_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0024/PR-2568-0024_publication_reward_form.docx', 'submission', NULL, 26374, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-11 23:47:44', '2025-10-11 23:47:44', '2025-10-11 23:47:44', NULL),
(503, 'PR-2568-0024_publication_reward_form.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0024/PR-2568-0024_publication_reward_form.pdf', 'submission', NULL, 114463, 'application/pdf', '', 0, 8, '2025-10-11 23:47:44', '2025-10-11 23:47:44', '2025-10-11 23:47:44', NULL),
(504, 'PR-2568-0024_merged_document.pdf', 'uploads/merge_submissions/2568/PR-2568-0024_merged_document.pdf', 'submission', NULL, 125045, 'application/pdf', '', 0, 8, '2025-10-11 23:47:45', '2025-10-11 23:47:45', '2025-10-11 23:47:45', NULL),
(505, 'c4611_sample_explain.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0025/c4611_sample_explain_PR-2568-0025.pdf', 'submission', NULL, 88226, 'application/pdf', '', 0, 8, '2025-10-12 18:58:24', '2025-10-12 18:58:24', '2025-10-12 18:58:24', NULL),
(506, 'sample01.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0025/sample01_PR-2568-0025.pdf', 'submission', NULL, 18810, 'application/pdf', '', 0, 8, '2025-10-12 18:58:24', '2025-10-12 18:58:24', '2025-10-12 18:58:24', NULL),
(507, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0025/sample-local-pdf_PR-2568-0025.pdf', 'submission', NULL, 49672, 'application/pdf', '', 0, 8, '2025-10-12 18:58:24', '2025-10-12 18:58:24', '2025-10-12 18:58:24', NULL),
(508, 'sample.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0025/sample_PR-2568-0025.pdf', 'submission', NULL, 18810, 'application/pdf', '', 0, 8, '2025-10-12 18:58:24', '2025-10-12 18:58:24', '2025-10-12 18:58:25', NULL),
(509, 'file-sample_150kB.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0025/file-sample_150kB_PR-2568-0025.pdf', 'submission', NULL, 142786, 'application/pdf', '', 0, 8, '2025-10-12 18:58:25', '2025-10-12 18:58:25', '2025-10-12 18:58:25', NULL),
(510, 'PR-2568-0025_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0025/PR-2568-0025_publication_reward_form.docx', 'submission', NULL, 25877, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-12 18:58:25', '2025-10-12 18:58:25', '2025-10-12 18:58:25', NULL),
(511, 'PR-2568-0025_publication_reward_form.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0025/PR-2568-0025_publication_reward_form.pdf', 'submission', NULL, 112373, 'application/pdf', '', 0, 8, '2025-10-12 18:58:25', '2025-10-12 18:58:25', '2025-10-12 18:58:25', NULL),
(512, 'sample02.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/FA-2568-0011/sample02_FA-2568-0011.pdf', 'submission', NULL, 18810, 'application/pdf', '', 0, 8, '2025-10-12 19:01:16', '2025-10-12 19:01:16', '2025-10-12 19:01:16', NULL),
(513, 'sample01.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/FA-2568-0011/sample01_FA-2568-0011.pdf', 'submission', NULL, 18810, 'application/pdf', '', 0, 8, '2025-10-12 19:01:16', '2025-10-12 19:01:16', '2025-10-12 19:01:16', NULL),
(514, 'Full Reprint.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0026/Full_Reprint_PR-2568-0026.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-13 12:57:41', '2025-10-13 12:57:41', '2025-10-13 12:57:41', NULL),
(515, 'Scopus-ISI.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0026/Scopus-ISI_PR-2568-0026.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-13 12:57:41', '2025-10-13 12:57:41', '2025-10-13 12:57:41', NULL),
(516, 'PR-2568-0026_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0026/PR-2568-0026_publication_reward_form.docx', 'submission', NULL, 25829, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-13 12:57:41', '2025-10-13 12:57:41', '2025-10-13 12:57:41', NULL),
(517, 'PR-2568-0026_publication_reward_form.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0026/PR-2568-0026_publication_reward_form.pdf', 'submission', NULL, 111356, 'application/pdf', '', 0, 8, '2025-10-13 12:57:41', '2025-10-13 12:57:41', '2025-10-13 12:57:41', NULL),
(518, 'PR-2568-0026_merged_document.pdf', 'uploads/merge_submissions/2568/PR-2568-0026_merged_document.pdf', 'submission', NULL, 121884, 'application/pdf', '', 0, 8, '2025-10-13 12:57:42', '2025-10-13 12:57:42', '2025-10-13 12:57:42', NULL),
(519, 'Full Reprint.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0027/Full_Reprint_PR-2568-0027.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-13 12:59:28', '2025-10-13 12:59:28', '2025-10-13 12:59:28', NULL),
(520, 'Scopus-ISI.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0027/Scopus-ISI_PR-2568-0027.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-13 12:59:28', '2025-10-13 12:59:28', '2025-10-13 12:59:28', NULL),
(521, 'PR-2568-0027_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0027/PR-2568-0027_publication_reward_form.docx', 'submission', NULL, 25840, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-13 12:59:28', '2025-10-13 12:59:28', '2025-10-13 12:59:28', NULL),
(522, 'PR-2568-0027_publication_reward_form.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0027/PR-2568-0027_publication_reward_form.pdf', 'submission', NULL, 111224, 'application/pdf', '', 0, 8, '2025-10-13 12:59:28', '2025-10-13 12:59:28', '2025-10-13 12:59:28', NULL),
(523, 'PR-2568-0027_merged_document.pdf', 'uploads/merge_submissions/2568/PR-2568-0027_merged_document.pdf', 'submission', NULL, 121753, 'application/pdf', '', 0, 8, '2025-10-13 12:59:29', '2025-10-13 12:59:29', '2025-10-13 12:59:29', NULL),
(524, 'ExFund3.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/FA-2568-0012/ExFund3_FA-2568-0012.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-13 13:05:58', '2025-10-13 13:05:58', '2025-10-13 13:05:58', NULL),
(525, 'Full Reprint.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/FA-2568-0012/Full_Reprint_FA-2568-0012.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-13 13:05:58', '2025-10-13 13:05:58', '2025-10-13 13:05:58', NULL),
(526, 'FA-2568-0012_merged_document.pdf', 'uploads/merge_submissions/2568/FA-2568-0012_merged_document.pdf', 'submission', NULL, 9297, 'application/pdf', '', 0, 8, '2025-10-13 13:05:59', '2025-10-13 13:05:59', '2025-10-13 13:05:59', NULL),
(527, 'Full Reprint.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0028/Full_Reprint_PR-2568-0028.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-13 13:11:15', '2025-10-13 13:11:15', '2025-10-13 13:11:15', NULL),
(528, 'Scopus-ISI.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0028/Scopus-ISI_PR-2568-0028.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-13 13:11:15', '2025-10-13 13:11:15', '2025-10-13 13:11:15', NULL),
(529, 'PR-2568-0028_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0028/PR-2568-0028_publication_reward_form.docx', 'submission', NULL, 25829, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-13 13:11:15', '2025-10-13 13:11:15', '2025-10-13 13:11:15', NULL),
(530, 'PR-2568-0028_publication_reward_form.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0028/PR-2568-0028_publication_reward_form.pdf', 'submission', NULL, 111356, 'application/pdf', '', 0, 8, '2025-10-13 13:11:15', '2025-10-13 13:11:15', '2025-10-13 13:11:15', NULL),
(531, 'PR-2568-0028_merged_document.pdf', 'uploads/merge_submissions/2568/PR-2568-0028_merged_document.pdf', 'submission', NULL, 121884, 'application/pdf', '', 0, 8, '2025-10-13 13:11:16', '2025-10-13 13:11:16', '2025-10-13 13:11:16', NULL),
(532, 'Full Reprint.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0029/Full_Reprint_PR-2568-0029.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-13 13:38:55', '2025-10-13 13:38:55', '2025-10-13 13:38:55', NULL),
(533, 'Scopus-ISI.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0029/Scopus-ISI_PR-2568-0029.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-13 13:38:55', '2025-10-13 13:38:55', '2025-10-13 13:38:55', NULL),
(534, 'PR-2568-0029_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0029/PR-2568-0029_publication_reward_form.docx', 'submission', NULL, 25825, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-13 13:38:55', '2025-10-13 13:38:55', '2025-10-13 13:38:55', NULL),
(535, 'PR-2568-0029_publication_reward_form.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0029/PR-2568-0029_publication_reward_form.pdf', 'submission', NULL, 111007, 'application/pdf', '', 0, 8, '2025-10-13 13:38:55', '2025-10-13 13:38:55', '2025-10-13 13:38:55', NULL),
(536, 'PR-2568-0029_merged_document.pdf', 'uploads/merge_submissions/2568/PR-2568-0029_merged_document.pdf', 'submission', NULL, 121543, 'application/pdf', '', 0, 8, '2025-10-13 13:38:56', '2025-10-13 13:38:56', '2025-10-13 13:38:56', NULL),
(537, 'Full Reprint.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0030/Full_Reprint_PR-2568-0030.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-13 13:39:57', '2025-10-13 13:39:57', '2025-10-13 13:39:57', NULL),
(538, 'Scopus-ISI.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0030/Scopus-ISI_PR-2568-0030.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-13 13:39:57', '2025-10-13 13:39:57', '2025-10-13 13:39:57', NULL),
(539, 'PR-2568-0030_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0030/PR-2568-0030_publication_reward_form.docx', 'submission', NULL, 25830, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-13 13:39:57', '2025-10-13 13:39:57', '2025-10-13 13:39:57', NULL),
(540, 'PR-2568-0030_publication_reward_form.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0030/PR-2568-0030_publication_reward_form.pdf', 'submission', NULL, 111357, 'application/pdf', '', 0, 8, '2025-10-13 13:39:57', '2025-10-13 13:39:57', '2025-10-13 13:39:57', NULL),
(541, 'PR-2568-0030_merged_document.pdf', 'uploads/merge_submissions/2568/PR-2568-0030_merged_document.pdf', 'submission', NULL, 121881, 'application/pdf', '', 0, 8, '2025-10-13 13:39:58', '2025-10-13 13:39:58', '2025-10-13 13:39:58', NULL),
(542, 'Full Reprint.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0031/Full_Reprint_PR-2568-0031.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-13 14:10:18', '2025-10-13 14:10:18', '2025-10-13 14:10:18', NULL),
(543, 'Scopus-ISI.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0031/Scopus-ISI_PR-2568-0031.pdf', 'submission', NULL, 1312, 'application/pdf', '', 0, 8, '2025-10-13 14:10:18', '2025-10-13 14:10:18', '2025-10-13 14:10:18', NULL),
(544, 'PR-2568-0031_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0031/PR-2568-0031_publication_reward_form.docx', 'submission', NULL, 25839, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-13 14:10:18', '2025-10-13 14:10:18', '2025-10-13 14:10:18', NULL),
(545, 'PR-2568-0031_publication_reward_form.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0031/PR-2568-0031_publication_reward_form.pdf', 'submission', NULL, 111514, 'application/pdf', '', 0, 8, '2025-10-13 14:10:18', '2025-10-13 14:10:18', '2025-10-13 14:10:18', NULL),
(546, 'PR-2568-0031_merged_document.pdf', 'uploads/merge_submissions/2568/PR-2568-0031_merged_document.pdf', 'submission', NULL, 122061, 'application/pdf', '', 0, 8, '2025-10-13 14:10:19', '2025-10-13 14:10:19', '2025-10-13 14:10:19', NULL),
(547, 'sample02.pdf', 'uploads/users/user_13_หัวหน้า_สาขา/submissions/FA-2568-0015/sample02_FA-2568-0015.pdf', 'submission', NULL, 18810, 'application/pdf', '', 0, 13, '2025-10-14 19:49:23', '2025-10-14 19:49:23', '2025-10-14 19:49:23', NULL),
(548, 'sample01.pdf', 'uploads/users/user_13_หัวหน้า_สาขา/submissions/FA-2568-0015/sample01_FA-2568-0015.pdf', 'submission', NULL, 18810, 'application/pdf', '', 0, 13, '2025-10-14 19:49:23', '2025-10-14 19:49:23', '2025-10-14 19:49:23', NULL),
(549, 'FA-2568-0015_merged_document.pdf', 'uploads/merge_submissions/2568/FA-2568-0015_merged_document.pdf', 'submission', NULL, 40263, 'application/pdf', '', 0, 13, '2025-10-14 19:49:23', '2025-10-14 19:49:23', '2025-10-14 19:49:23', NULL),
(550, 'sample-local-pdf.pdf', 'uploads/users/user_13_หัวหน้า_สาขา/submissions/PR-2568-0033/sample-local-pdf_PR-2568-0033.pdf', 'submission', NULL, 49672, 'application/pdf', '', 0, 13, '2025-10-15 08:49:34', '2025-10-15 08:49:34', '2025-10-15 08:49:34', NULL),
(551, 'sample04.pdf', 'uploads/users/user_13_หัวหน้า_สาขา/submissions/PR-2568-0033/sample04_PR-2568-0033.pdf', 'submission', NULL, 18810, 'application/pdf', '', 0, 13, '2025-10-15 08:49:34', '2025-10-15 08:49:34', '2025-10-15 08:49:34', NULL),
(552, 'PR-2568-0033_publication_reward_form.docx', 'uploads/users/user_13_หัวหน้า_สาขา/submissions/PR-2568-0033/PR-2568-0033_publication_reward_form.docx', 'submission', NULL, 25809, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 13, '2025-10-15 08:49:34', '2025-10-15 08:49:34', '2025-10-15 08:49:34', NULL),
(553, 'PR-2568-0033_publication_reward_form.pdf', 'uploads/users/user_13_หัวหน้า_สาขา/submissions/PR-2568-0033/PR-2568-0033_publication_reward_form.pdf', 'submission', NULL, 110313, 'application/pdf', '', 0, 13, '2025-10-15 08:49:34', '2025-10-15 08:49:34', '2025-10-15 08:49:34', NULL),
(554, 'PR-2568-0033_merged_document.pdf', 'uploads/merge_submissions/2568/PR-2568-0033_merged_document.pdf', 'submission', NULL, 178708, 'application/pdf', '', 0, 13, '2025-10-15 08:49:35', '2025-10-15 08:49:35', '2025-10-15 08:49:35', NULL),
(555, 'sample03.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0035/sample03_PR-2568-0035.pdf', 'submission', NULL, 18810, 'application/pdf', '', 0, 8, '2025-10-15 12:23:33', '2025-10-15 12:23:33', '2025-10-15 12:23:33', NULL),
(556, 'sample02.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0035/sample02_PR-2568-0035.pdf', 'submission', NULL, 18810, 'application/pdf', '', 0, 8, '2025-10-15 12:23:33', '2025-10-15 12:23:33', '2025-10-15 12:23:33', NULL),
(557, 'sample01.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0035/sample01_PR-2568-0035.pdf', 'submission', NULL, 18810, 'application/pdf', '', 0, 8, '2025-10-15 12:23:33', '2025-10-15 12:23:33', '2025-10-15 12:23:33', NULL),
(558, 'sample.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0035/sample_PR-2568-0035.pdf', 'submission', NULL, 18810, 'application/pdf', '', 0, 8, '2025-10-15 12:23:33', '2025-10-15 12:23:33', '2025-10-15 12:23:33', NULL),
(559, 'PR-2568-0035_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0035/PR-2568-0035_publication_reward_form.docx', 'submission', NULL, 26317, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-15 12:23:33', '2025-10-15 12:23:33', '2025-10-15 12:23:33', NULL),
(560, 'PR-2568-0035_publication_reward_form.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0035/PR-2568-0035_publication_reward_form.pdf', 'submission', NULL, 124149, 'application/pdf', '', 0, 8, '2025-10-15 12:23:33', '2025-10-15 12:23:33', '2025-10-15 12:23:33', NULL),
(561, 'PR-2568-0035_merged_document.pdf', 'uploads/merge_submissions/2568/PR-2568-0035_merged_document.pdf', 'submission', NULL, 187968, 'application/pdf', '', 0, 8, '2025-10-15 12:23:34', '2025-10-15 12:23:34', '2025-10-15 12:23:34', NULL);
INSERT INTO `file_uploads` (`file_id`, `original_name`, `stored_path`, `folder_type`, `submission_id`, `file_size`, `mime_type`, `file_hash`, `is_public`, `uploaded_by`, `uploaded_at`, `create_at`, `update_at`, `delete_at`) VALUES
(562, 'sample-local-pdf.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0036/sample-local-pdf_PR-2568-0036.pdf', 'submission', NULL, 49672, 'application/pdf', '', 0, 8, '2025-10-15 14:28:04', '2025-10-15 14:28:04', '2025-10-15 14:28:05', NULL),
(563, 'sample04.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0036/sample04_PR-2568-0036.pdf', 'submission', NULL, 18810, 'application/pdf', '', 0, 8, '2025-10-15 14:28:05', '2025-10-15 14:28:05', '2025-10-15 14:28:05', NULL),
(564, 'sample03.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0036/sample03_PR-2568-0036.pdf', 'submission', NULL, 18810, 'application/pdf', '', 0, 8, '2025-10-15 14:28:05', '2025-10-15 14:28:05', '2025-10-15 14:28:05', NULL),
(565, 'sample02.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0036/sample02_PR-2568-0036.pdf', 'submission', NULL, 18810, 'application/pdf', '', 0, 8, '2025-10-15 14:28:05', '2025-10-15 14:28:05', '2025-10-15 14:28:05', NULL),
(566, 'sample01.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0036/sample01_PR-2568-0036.pdf', 'submission', NULL, 18810, 'application/pdf', '', 0, 8, '2025-10-15 14:28:05', '2025-10-15 14:28:05', '2025-10-15 14:28:05', NULL),
(567, 'PR-2568-0036_publication_reward_form.docx', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0036/PR-2568-0036_publication_reward_form.docx', 'submission', NULL, 26295, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '', 0, 8, '2025-10-15 14:28:05', '2025-10-15 14:28:05', '2025-10-15 14:28:05', NULL),
(568, 'PR-2568-0036_publication_reward_form.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/PR-2568-0036/PR-2568-0036_publication_reward_form.pdf', 'submission', NULL, 123362, 'application/pdf', '', 0, 8, '2025-10-15 14:28:05', '2025-10-15 14:28:05', '2025-10-15 14:28:05', NULL),
(569, 'PR-2568-0036_merged_document.pdf', 'uploads/merge_submissions/2568/PR-2568-0036_merged_document.pdf', 'submission', NULL, 233161, 'application/pdf', '', 0, 8, '2025-10-15 14:28:06', '2025-10-15 14:28:06', '2025-10-15 14:28:06', NULL),
(570, 'sample.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/FA-2568-0016/sample_FA-2568-0016.pdf', 'submission', NULL, 18810, 'application/pdf', '', 0, 8, '2025-10-15 15:42:09', '2025-10-15 15:42:09', '2025-10-15 15:42:09', NULL),
(571, 'sample01.pdf', 'uploads/users/user_8_สมชาย_ใจดี/submissions/FA-2568-0016/sample01_FA-2568-0016.pdf', 'submission', NULL, 18810, 'application/pdf', '', 0, 8, '2025-10-15 15:42:09', '2025-10-15 15:42:09', '2025-10-15 15:42:09', NULL),
(572, 'FA-2568-0016_merged_document.pdf', 'uploads/merge_submissions/2568/FA-2568-0016_merged_document.pdf', 'submission', NULL, 40263, 'application/pdf', '', 0, 8, '2025-10-15 15:42:09', '2025-10-15 15:42:09', '2025-10-15 15:42:09', NULL);

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
(23, 174, 1, 'สมชาย ใจดี', '000-000-0000', '15000.00', '0.00', NULL, NULL, NULL, NULL, NULL, '', '', NULL, NULL, NULL),
(24, 177, 97, 'สมชาย ใจดี', '081-111-1111', '5000.00', '0.00', NULL, NULL, NULL, NULL, NULL, '', '', NULL, NULL, NULL),
(25, 185, 97, 'สมชาย ใจดี', '081-111-1111', '5000.00', '0.00', NULL, NULL, NULL, NULL, NULL, '', '', NULL, NULL, NULL),
(26, 186, 97, 'สมชาย ใจดี', '123-123-1231', '12345.00', '0.00', NULL, NULL, NULL, NULL, NULL, '', '', NULL, NULL, NULL),
(27, 188, 97, 'สมชาย ใจดี', '123-123-3212', '12312.00', '0.00', NULL, NULL, NULL, NULL, NULL, '', '', NULL, NULL, NULL),
(28, 191, 97, 'Test Project', 'Test Project Description', '123.00', '0.00', NULL, NULL, NULL, NULL, NULL, '', '', NULL, NULL, NULL),
(29, 195, 100, 'Test Project', 'Test Des', '5432.00', '0.00', NULL, NULL, NULL, NULL, NULL, '', '', NULL, NULL, NULL),
(30, 197, 98, 'Test Project', '', '111.00', '0.00', NULL, NULL, NULL, NULL, NULL, '', '', NULL, NULL, NULL),
(31, 200, 97, 'Test Project', '', '111.00', '0.00', NULL, NULL, NULL, NULL, NULL, '', '', NULL, NULL, NULL),
(32, 201, 97, 'Test Project', 'ฟหกฟหก', '123.00', '0.00', NULL, NULL, NULL, NULL, NULL, '', '', 8, 4, NULL),
(33, 205, 97, 'Test Project', 'ฟหก', '123.00', '0.00', NULL, NULL, NULL, NULL, NULL, '', '', 8, 13, NULL),
(34, 208, 97, 'project name', 'description test', '8000.00', '0.00', NULL, NULL, NULL, NULL, NULL, '', '', 8, 13, NULL),
(35, 213, 97, '', '', '1000.00', '0.00', NULL, NULL, NULL, NULL, NULL, '', '', 8, 13, NULL),
(36, 214, 97, '', '', '1000.00', '0.00', NULL, NULL, NULL, NULL, NULL, '', '', 8, 13, NULL),
(37, 215, 97, 'Test Project', 'Test Project Description', '1234.00', '0.00', NULL, NULL, NULL, NULL, NULL, '', '', 8, 13, NULL),
(38, 224, 97, 'Test Project', 'Test Project Description', '12345.00', '0.00', NULL, NULL, NULL, NULL, NULL, '', '', 8, 13, NULL);

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
(15, 'ทุนส่งเสริมการวิจัย', 'active', 3, 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(16, 'ทุนอุดหนุนกิจกรรม', 'active', 3, 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(27, 'ทุนส่งเสริมการวิจัย', 'active', 9, NULL, '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(28, 'ทุนอุดหนุนกิจกรรม', 'active', 9, NULL, '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(29, 'ทุนส่งเสริมการวิจัย', 'active', 9, NULL, '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(30, 'ทุนอุดหนุนกิจกรรม', 'active', 9, NULL, '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(31, 'ทุนส่งเสริมการวิจัย', 'active', 9, NULL, '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(32, 'ทุนอุดหนุนกิจกรรม', 'active', 9, NULL, '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL);

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
(1, 'แบบฟอร์มสมัครทุนส่งเสริมการวิจัย', 'แบบฟอร์มสำหรับสมัครขอรับทุนส่งเสริมการวิจัย แบบฟอร์มสำหรับสมัครขอรับทุนส่งเสริมการวิจัย แบบฟอร์มสำหรับสมัครขอรับทุนส่งเสริมการวิจัย แบบฟอร์มสำหรับสมัครขอรับทุนส่งเสริมการวิจัย แบบฟอร์มสำหรับสมัครขอรับทุนส่งเสริมการวิจัย แบบฟอร์มสำหรับสมัครขอรับทุนส่งเสริมการวิจัย แบบฟอร์มสำหรับสมัครขอรับทุนส่งเสริมการวิจัย', 'แบบฟอร์มสมัครทุนวิจัย.docx', 'uploads/fund_forms/research/แบบฟอร์มสมัครทุนวิจัย.docx', 512000, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application', 'research_fund', 1, 3, 'active', 3, 1, '2025-08-20 11:40:31', '2025-10-10 11:08:41', NULL),
(2, 'แบบฟอร์มรายงานความก้าวหน้าโครงการวิจัย', 'แบบฟอร์มสำหรับรายงานความก้าวหน้าของโครงการวิจัย', 'แบบฟอร์มรายงานความก้าวหน้า.docx', 'uploads/fund_forms/research/แบบฟอร์มรายงานความก้าวหน้า.docx', 480000, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'report', 'research_fund', 1, 5, 'active', 3, 1, '2025-08-20 11:40:31', '2025-10-10 11:08:41', NULL),
(3, 'แบบฟอร์มสมัครทุนอุดหนุนกิจกรรม', 'แบบฟอร์มสำหรับสมัครขอรับทุนอุดหนุนกิจกรรม', 'แบบฟอร์มสมัครทุนกิจกรรม.docx', 'uploads/fund_forms/promotion/แบบฟอร์มสมัครทุนกิจกรรม.docx', 600000, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application', 'promotion_fund', 1, 1, 'active', 3, 1, '2025-08-20 11:40:31', '2025-10-10 11:08:41', NULL),
(4, 'แบบประเมินผลกิจกรรม', 'แบบฟอร์มสำหรับประเมินผลการดำเนินกิจกรรม', 'แบบประเมินผลกิจกรรม.xlsx', 'uploads/fund_forms/promotion/แบบประเมินผลกิจกรรม.xlsx', 256000, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'evaluation', 'promotion_fund', 0, 4, 'active', 3, 1, '2025-08-20 11:40:31', '2025-10-10 11:08:41', NULL),
(5, 'แนวทางการเขียนข้อเสนอโครงการ', 'เอกสารแนวทางและข้อแนะนำสำหรับการเขียนข้อเสนอโครงการ', 'แนวทางการเขียนข้อเสนอโครงการ.pdf', 'uploads/fund_forms/guidelines/แนวทางการเขียนข้อเสนอโครงการ.pdf', 1024000, 'application/pdf', 'guidelines', 'both', 0, 5, 'active', 3, 1, '2025-08-20 11:40:31', '2025-09-19 11:36:42', NULL);

-- --------------------------------------------------------

--
-- โครงสร้างตาราง `fund_installment_periods`
--

CREATE TABLE `fund_installment_periods` (
  `installment_period_id` int(11) NOT NULL,
  `year_id` int(11) NOT NULL COMMENT 'FK → years.year_id',
  `installment_number` int(11) NOT NULL COMMENT 'งวดที่ 1, 2, 3, ...',
  `cutoff_date` date NOT NULL COMMENT 'วันตัดของงวดนี้ (เช่น 2025-02-03)',
  `name` varchar(255) DEFAULT NULL COMMENT 'ป้ายกำกับงวด (เช่น "งวดแรก")',
  `status` enum('active','inactive') DEFAULT 'active',
  `remark` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- dump ตาราง `fund_installment_periods`
--

INSERT INTO `fund_installment_periods` (`installment_period_id`, `year_id`, `installment_number`, `cutoff_date`, `name`, `status`, `remark`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 3, 1, '2025-02-03', 'งวดที่ 1', 'active', NULL, '2025-10-13 11:32:54', '2025-10-13 19:43:37', NULL),
(2, 3, 2, '2025-05-15', 'งวดที่ 2', 'active', NULL, '2025-10-13 11:32:54', '2025-10-13 11:32:54', NULL),
(3, 3, 3, '2025-08-31', 'งวดที่ 3', 'active', NULL, '2025-10-13 11:32:54', '2025-10-13 11:32:54', NULL),
(4, 3, 4, '2025-12-01', 'งวดที่ 4', 'active', NULL, '2025-10-13 11:32:54', '2025-10-13 19:13:43', NULL),
(5, 3, 5, '2025-12-31', 'งวดที่ x', 'active', 'เพิ่มจากเดิม', '2025-10-13 19:15:06', '2025-10-13 19:43:13', NULL),
(6, 4, 1, '2026-02-03', 'งวดที่ 1', 'active', NULL, '2025-10-13 20:13:21', '2025-10-13 20:18:01', NULL),
(7, 4, 2, '2026-05-15', 'งวดที่ 2', 'active', NULL, '2025-10-13 20:13:21', '2025-10-13 20:13:21', NULL),
(8, 4, 3, '2026-08-31', 'งวดที่ 3', 'active', NULL, '2025-10-13 20:13:21', '2025-10-13 20:13:21', NULL),
(9, 4, 4, '2026-12-01', 'งวดที่ 4', 'active', NULL, '2025-10-13 20:13:21', '2025-10-13 20:13:21', NULL),
(10, 4, 5, '2026-12-31', 'งวดที่ x', 'active', 'เพิ่มจากเดิม', '2025-10-13 20:13:21', '2025-10-13 20:13:21', NULL);

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
(97, 15, '1.1 ทุนสนับสนุนผู้เชี่ยวชาญต่างประเทศ', NULL, NULL, 'download', NULL, 3, 'active', NULL, '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(98, 15, '1.2 ทุนวิจัยสถาบัน', NULL, NULL, 'download', NULL, 3, 'active', NULL, '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(99, 15, '1.3 ทุนวิจัยเพื่อพัฒนางานประจำ', NULL, NULL, 'download', NULL, 3, 'active', NULL, '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(100, 15, '1.4 ทุนวิจัยในชั้นเรียน', NULL, NULL, 'download', NULL, 3, 'active', NULL, '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(101, 15, '1.5 ทุนวิจัยความเป็นเลิศ', NULL, NULL, 'download', NULL, 3, 'active', NULL, '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(102, 15, '1.6 ทุนนวัตกรรมความเป็นเลิศ', NULL, NULL, 'download', NULL, 3, 'active', NULL, '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(103, 15, '1.7 ทุนพัฒนาศูนย์วิจัย', NULL, NULL, 'download', NULL, 3, 'active', NULL, '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(104, 15, '1.8 ทุนฝึกอบรมนักวิจัยหลังปริญญาเอก', NULL, NULL, 'download', NULL, 3, 'active', NULL, '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(105, 15, '1.9 ทุนสนับสนุนการได้รับทุนวิจัยภายนอก', NULL, NULL, 'download', NULL, 3, 'active', NULL, '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(106, 15, '1.10 ทุนพัฒนากลุ่มวิจัยบูรณาการ', NULL, NULL, 'download', NULL, 3, 'active', NULL, '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(107, 16, '2.1 ทุนทำวิจัยในต่างประเทศ', NULL, NULL, 'download', NULL, 3, 'active', NULL, '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(108, 16, '2.2 เงินรางวัลการตีพิมพ์เผยแพร่ผลงานวิจัยที่ได้รับการตีพิมพ์ในสาขาวิทยาศาสตร์และเทคโนโลยี (กรณีเป็นผู้แต่งชื่อแรก)', NULL, NULL, 'publication_reward', NULL, 3, 'active', NULL, '2025-10-08 13:11:28', '2025-10-09 12:17:52', NULL),
(109, 16, '2.3 เงินรางวัลการตีพิมพ์เผยแพร่ผลงานวิจัยที่ได้รับการตีพิมพ์ในสาขาวิทยาศาสตร์และเทคโนโลยี (กรณีเป็นผู้ประพันธ์บรรณกิจ)', NULL, NULL, 'publication_reward', NULL, 3, 'active', NULL, '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(110, 16, '2.4 ค่าตอบแทนผลงานที่ได้รับการเผยแพร่ในการประชุมวิชาการชั้นนำในสาขาวิทยาศาสตร์และเทคโนโลยี ระดับ A+ ระดับ A และระดับ B', NULL, NULL, 'download', NULL, 3, 'active', NULL, '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(111, 16, '2.5 ค่าตอบแทนผลงานวิจัยที่ได้รับรางวัลบทความดีเด่น (Best paper award) จากการเข้าร่วมเสนอผลงานในการประชุมวิชาการ', NULL, NULL, 'download', NULL, 3, 'active', NULL, '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(112, 16, '2.6 ค่าตอบแทนผลงานที่ได้รับการอ้างอิงสูงจากวารสารในฐานข้อมูล ISI/Scopus ระดับเพชร ระดับทอง และ ระดับเงิน', NULL, NULL, 'download', NULL, 3, 'active', NULL, '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(113, 16, '2.7 ค่าตอบแทนผลงานสิ่งประดิษฐ์และนวัตกรรมที่ได้รับรางวัล\r\nจากการเข้าร่วมประกวด', NULL, NULL, 'download', NULL, 3, 'active', NULL, '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(114, 16, '2.8 ทุนสนับสนุนการวิจัยระยะสั้น', NULL, NULL, 'download', NULL, 3, 'active', NULL, '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(115, 16, '2.9 ค่าตอบแทนผลงานที่ได้รับสิทธิบัตรหรืออนุสิทธิบัตร (เป็นเจ้าของผลงานร่วมกัน)', NULL, NULL, 'download', NULL, 3, 'active', NULL, '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(116, 16, '2.10 เงินสมทบค่าธรรมเนียมที่ทางวารสารเรียกเก็บสำหรับการตีพิมพ์ (Page Charge) และค่าปรับปรุงบทความ (Manuscript Editing Service)', NULL, NULL, 'download', NULL, 3, 'active', NULL, '2025-10-08 13:11:28', '2025-10-08 21:25:02', NULL),
(117, 16, '2.11 เงินรางวัลผลงานการเขียนหนังสือหรือตำรา', NULL, NULL, 'download', NULL, 3, 'active', NULL, '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(223, 27, '1.1 ทุนสนับสนุนผู้เชี่ยวชาญต่างประเทศ', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(224, 27, '1.2 ทุนวิจัยสถาบัน', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(225, 27, '1.3 ทุนวิจัยเพื่อพัฒนางานประจำ', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(226, 27, '1.4 ทุนวิจัยในชั้นเรียน', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(227, 27, '1.5 ทุนวิจัยความเป็นเลิศ', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(228, 27, '1.6 ทุนนวัตกรรมความเป็นเลิศ', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(229, 27, '1.7 ทุนพัฒนาศูนย์วิจัย', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(230, 27, '1.8 ทุนฝึกอบรมนักวิจัยหลังปริญญาเอก', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(231, 27, '1.9 ทุนสนับสนุนการได้รับทุนวิจัยภายนอก', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(232, 27, '1.10 ทุนพัฒนากลุ่มวิจัยบูรณาการ', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(233, 28, '2.1 ทุนทำวิจัยในต่างประเทศ', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(234, 28, '2.2 เงินรางวัลการตีพิมพ์เผยแพร่ผลงานวิจัยที่ได้รับการตีพิมพ์ในสาขาวิทยาศาสตร์และเทคโนโลยี (กรณีเป็นผู้แต่งชื่อแรก)', NULL, NULL, 'publication_reward', '', NULL, 'active', NULL, '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(235, 28, '2.3 เงินรางวัลการตีพิมพ์เผยแพร่ผลงานวิจัยที่ได้รับการตีพิมพ์ในสาขาวิทยาศาสตร์และเทคโนโลยี (กรณีเป็นผู้ประพันธ์บรรณกิจ)', NULL, NULL, 'publication_reward', '', NULL, 'active', NULL, '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(236, 28, '2.4 ค่าตอบแทนผลงานที่ได้รับการเผยแพร่ในการประชุมวิชาการชั้นนำในสาขาวิทยาศาสตร์และเทคโนโลยี ระดับ A+ ระดับ A และระดับ B', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(237, 28, '2.5 ค่าตอบแทนผลงานวิจัยที่ได้รับรางวัลบทความดีเด่น (Best paper award) จากการเข้าร่วมเสนอผลงานในการประชุมวิชาการ', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(238, 28, '2.6 ค่าตอบแทนผลงานที่ได้รับการอ้างอิงสูงจากวารสารในฐานข้อมูล ISI/Scopus ระดับเพชร ระดับทอง และ ระดับเงิน', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(239, 28, '2.7 ค่าตอบแทนผลงานสิ่งประดิษฐ์และนวัตกรรมที่ได้รับรางวัล\r\nจากการเข้าร่วมประกวด', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(240, 28, '2.8 ทุนสนับสนุนการวิจัยระยะสั้น', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(241, 28, '2.9 ค่าตอบแทนผลงานที่ได้รับสิทธิบัตรหรืออนุสิทธิบัตร (เป็นเจ้าของผลงานร่วมกัน)', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(242, 28, '2.10 เงินสมทบค่าธรรมเนียมที่ทางวารสารเรียกเก็บสำหรับการตีพิมพ์ (Page Charge) และค่าปรับปรุงบทความ (Manuscript Editing Service)', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(243, 28, '2.11 เงินรางวัลผลงานการเขียนหนังสือหรือตำรา', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(244, 29, '1.1 ทุนสนับสนุนผู้เชี่ยวชาญต่างประเทศ', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(245, 29, '1.2 ทุนวิจัยสถาบัน', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(246, 29, '1.3 ทุนวิจัยเพื่อพัฒนางานประจำ', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(247, 29, '1.4 ทุนวิจัยในชั้นเรียน', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(248, 29, '1.5 ทุนวิจัยความเป็นเลิศ', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(249, 29, '1.6 ทุนนวัตกรรมความเป็นเลิศ', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(250, 29, '1.7 ทุนพัฒนาศูนย์วิจัย', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(251, 29, '1.8 ทุนฝึกอบรมนักวิจัยหลังปริญญาเอก', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(252, 29, '1.9 ทุนสนับสนุนการได้รับทุนวิจัยภายนอก', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(253, 29, '1.10 ทุนพัฒนากลุ่มวิจัยบูรณาการ', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(254, 30, '2.1 ทุนทำวิจัยในต่างประเทศ', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(255, 30, '2.2 เงินรางวัลการตีพิมพ์เผยแพร่ผลงานวิจัยที่ได้รับการตีพิมพ์ในสาขาวิทยาศาสตร์และเทคโนโลยี (กรณีเป็นผู้แต่งชื่อแรก)', NULL, NULL, 'publication_reward', '', NULL, 'active', NULL, '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(256, 30, '2.3 เงินรางวัลการตีพิมพ์เผยแพร่ผลงานวิจัยที่ได้รับการตีพิมพ์ในสาขาวิทยาศาสตร์และเทคโนโลยี (กรณีเป็นผู้ประพันธ์บรรณกิจ)', NULL, NULL, 'publication_reward', '', NULL, 'active', NULL, '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(257, 30, '2.4 ค่าตอบแทนผลงานที่ได้รับการเผยแพร่ในการประชุมวิชาการชั้นนำในสาขาวิทยาศาสตร์และเทคโนโลยี ระดับ A+ ระดับ A และระดับ B', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(258, 30, '2.5 ค่าตอบแทนผลงานวิจัยที่ได้รับรางวัลบทความดีเด่น (Best paper award) จากการเข้าร่วมเสนอผลงานในการประชุมวิชาการ', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(259, 30, '2.6 ค่าตอบแทนผลงานที่ได้รับการอ้างอิงสูงจากวารสารในฐานข้อมูล ISI/Scopus ระดับเพชร ระดับทอง และ ระดับเงิน', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(260, 30, '2.7 ค่าตอบแทนผลงานสิ่งประดิษฐ์และนวัตกรรมที่ได้รับรางวัล\r\nจากการเข้าร่วมประกวด', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(261, 30, '2.8 ทุนสนับสนุนการวิจัยระยะสั้น', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(262, 30, '2.9 ค่าตอบแทนผลงานที่ได้รับสิทธิบัตรหรืออนุสิทธิบัตร (เป็นเจ้าของผลงานร่วมกัน)', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(263, 30, '2.10 เงินสมทบค่าธรรมเนียมที่ทางวารสารเรียกเก็บสำหรับการตีพิมพ์ (Page Charge) และค่าปรับปรุงบทความ (Manuscript Editing Service)', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(264, 30, '2.11 เงินรางวัลผลงานการเขียนหนังสือหรือตำรา', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(265, 31, '1.1 ทุนสนับสนุนผู้เชี่ยวชาญต่างประเทศ', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(266, 31, '1.2 ทุนวิจัยสถาบัน', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(267, 31, '1.3 ทุนวิจัยเพื่อพัฒนางานประจำ', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(268, 31, '1.4 ทุนวิจัยในชั้นเรียน', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(269, 31, '1.5 ทุนวิจัยความเป็นเลิศ', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(270, 31, '1.6 ทุนนวัตกรรมความเป็นเลิศ', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(271, 31, '1.7 ทุนพัฒนาศูนย์วิจัย', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(272, 31, '1.8 ทุนฝึกอบรมนักวิจัยหลังปริญญาเอก', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(273, 31, '1.9 ทุนสนับสนุนการได้รับทุนวิจัยภายนอก', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(274, 31, '1.10 ทุนพัฒนากลุ่มวิจัยบูรณาการ', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(275, 32, '2.1 ทุนทำวิจัยในต่างประเทศ', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(276, 32, '2.2 เงินรางวัลการตีพิมพ์เผยแพร่ผลงานวิจัยที่ได้รับการตีพิมพ์ในสาขาวิทยาศาสตร์และเทคโนโลยี (กรณีเป็นผู้แต่งชื่อแรก)', NULL, NULL, 'publication_reward', '', NULL, 'active', NULL, '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(277, 32, '2.3 เงินรางวัลการตีพิมพ์เผยแพร่ผลงานวิจัยที่ได้รับการตีพิมพ์ในสาขาวิทยาศาสตร์และเทคโนโลยี (กรณีเป็นผู้ประพันธ์บรรณกิจ)', NULL, NULL, 'publication_reward', '', NULL, 'active', NULL, '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(278, 32, '2.4 ค่าตอบแทนผลงานที่ได้รับการเผยแพร่ในการประชุมวิชาการชั้นนำในสาขาวิทยาศาสตร์และเทคโนโลยี ระดับ A+ ระดับ A และระดับ B', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(279, 32, '2.5 ค่าตอบแทนผลงานวิจัยที่ได้รับรางวัลบทความดีเด่น (Best paper award) จากการเข้าร่วมเสนอผลงานในการประชุมวิชาการ', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(280, 32, '2.6 ค่าตอบแทนผลงานที่ได้รับการอ้างอิงสูงจากวารสารในฐานข้อมูล ISI/Scopus ระดับเพชร ระดับทอง และ ระดับเงิน', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(281, 32, '2.7 ค่าตอบแทนผลงานสิ่งประดิษฐ์และนวัตกรรมที่ได้รับรางวัล\r\nจากการเข้าร่วมประกวด', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(282, 32, '2.8 ทุนสนับสนุนการวิจัยระยะสั้น', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(283, 32, '2.9 ค่าตอบแทนผลงานที่ได้รับสิทธิบัตรหรืออนุสิทธิบัตร (เป็นเจ้าของผลงานร่วมกัน)', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(284, 32, '2.10 เงินสมทบค่าธรรมเนียมที่ทางวารสารเรียกเก็บสำหรับการตีพิมพ์ (Page Charge) และค่าปรับปรุงบทความ (Manuscript Editing Service)', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(285, 32, '2.11 เงินรางวัลผลงานการเขียนหนังสือหรือตำรา', NULL, NULL, 'download', '', NULL, 'active', NULL, '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL);

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
(198, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0001 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 170, '2025-10-07 22:10:44', '2025-10-07 22:10:44', NULL),
(199, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0001 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 170, '2025-10-07 22:10:44', '2025-10-07 22:10:44', NULL),
(200, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0002 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 171, '2025-10-07 22:35:42', '2025-10-07 22:35:42', NULL),
(201, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0002 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 171, '2025-10-07 22:35:42', '2025-10-07 22:35:42', NULL),
(202, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0003 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 172, '2025-10-07 23:33:37', '2025-10-07 23:33:37', NULL),
(203, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0003 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 172, '2025-10-07 23:33:37', '2025-10-07 23:33:37', NULL),
(204, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0004 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 173, '2025-10-08 00:06:04', '2025-10-08 00:06:04', NULL),
(205, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0004 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 173, '2025-10-08 00:06:04', '2025-10-08 00:06:04', NULL),
(206, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0005 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 175, '2025-10-08 10:52:10', '2025-10-08 10:52:10', NULL),
(207, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0005 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 175, '2025-10-08 10:52:10', '2025-10-08 10:52:10', NULL),
(208, 8, 'คำร้องได้รับการอนุมัติ', 'คำร้องหมายเลข FA-2568-0001 ของคุณได้รับการอนุมัติ เป็นจำนวน 0.00 บาท', 'success', 0, 174, '2025-10-09 10:08:38', '2025-10-09 10:08:38', NULL),
(209, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0006 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 176, '2025-10-09 10:14:12', '2025-10-09 10:14:12', NULL),
(210, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0006 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 176, '2025-10-09 10:14:12', '2025-10-09 10:14:12', NULL),
(211, 8, 'คำร้องได้รับการอนุมัติ', 'คำร้องหมายเลข PR-2568-0006 ของคุณได้รับการอนุมัติ เป็นจำนวน 45000.00 บาท (เลขอ้างอิงประกาศ: 123/456)', 'success', 0, 176, '2025-10-09 10:15:30', '2025-10-09 10:15:30', NULL),
(212, 8, 'คำร้องได้รับการอนุมัติ', 'คำร้องหมายเลข FA-2568-0002 ของคุณได้รับการอนุมัติ เป็นจำนวน 0.00 บาท (เลขอ้างอิงประกาศ: 123/555)', 'success', 0, 177, '2025-10-09 10:19:48', '2025-10-09 10:19:48', NULL),
(213, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0007 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 178, '2025-10-09 11:23:45', '2025-10-09 11:23:45', NULL),
(214, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0007 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 178, '2025-10-09 11:23:45', '2025-10-09 11:23:45', NULL),
(215, 8, 'คำร้องได้รับการอนุมัติ', 'คำร้องหมายเลข PR-2568-0007 ของคุณได้รับการอนุมัติ เป็นจำนวน 50000.00 บาท (เลขอ้างอิงประกาศ: 123)', 'success', 0, 178, '2025-10-09 11:29:26', '2025-10-09 11:29:26', NULL),
(216, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0010 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 181, '2025-10-09 14:23:08', '2025-10-09 14:23:08', NULL),
(217, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0010 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 181, '2025-10-09 14:23:08', '2025-10-09 14:23:08', NULL),
(218, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0011 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 182, '2025-10-11 11:01:17', '2025-10-11 11:01:17', NULL),
(219, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0011 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 182, '2025-10-11 11:01:17', '2025-10-11 11:01:17', NULL),
(220, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0012 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 183, '2025-10-11 12:23:22', '2025-10-11 12:23:22', NULL),
(221, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0012 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 183, '2025-10-11 12:23:22', '2025-10-11 12:23:22', NULL),
(222, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0013 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 184, '2025-10-11 13:26:50', '2025-10-11 13:26:50', NULL),
(223, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0013 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 184, '2025-10-11 13:26:50', '2025-10-11 13:26:50', NULL),
(224, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0014 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 187, '2025-10-11 20:44:36', '2025-10-11 20:44:36', NULL),
(225, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0014 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 187, '2025-10-11 20:44:36', '2025-10-11 20:44:36', NULL),
(226, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0015 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 189, '2025-10-11 21:20:48', '2025-10-11 21:20:48', NULL),
(227, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0015 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 189, '2025-10-11 21:20:48', '2025-10-11 21:20:48', NULL),
(228, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0016 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 190, '2025-10-11 21:27:03', '2025-10-11 21:27:03', NULL),
(229, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0016 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 190, '2025-10-11 21:27:03', '2025-10-11 21:27:03', NULL),
(230, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0017 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 192, '2025-10-11 22:17:13', '2025-10-11 22:17:13', NULL),
(231, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0017 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 192, '2025-10-11 22:17:13', '2025-10-11 22:17:13', NULL),
(232, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0018 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 193, '2025-10-11 22:25:02', '2025-10-11 22:25:02', NULL),
(233, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0018 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 193, '2025-10-11 22:25:02', '2025-10-11 22:25:02', NULL),
(234, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0019 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 194, '2025-10-11 22:37:00', '2025-10-11 22:37:00', NULL),
(235, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0019 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 194, '2025-10-11 22:37:00', '2025-10-11 22:37:00', NULL),
(236, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0020 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 196, '2025-10-11 22:55:21', '2025-10-11 22:55:21', NULL),
(237, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0020 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 196, '2025-10-11 22:55:21', '2025-10-11 22:55:21', NULL),
(238, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0021 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 198, '2025-10-11 23:05:33', '2025-10-11 23:05:33', NULL),
(239, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0021 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 198, '2025-10-11 23:05:33', '2025-10-11 23:05:33', NULL),
(240, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0022 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 199, '2025-10-11 23:12:45', '2025-10-11 23:12:45', NULL),
(241, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0022 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 199, '2025-10-11 23:12:45', '2025-10-11 23:12:45', NULL),
(242, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0023 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 202, '2025-10-11 23:36:05', '2025-10-11 23:36:05', NULL),
(243, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0023 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 202, '2025-10-11 23:36:05', '2025-10-11 23:36:05', NULL),
(244, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0024 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 203, '2025-10-11 23:47:45', '2025-10-11 23:47:45', NULL),
(245, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0024 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 203, '2025-10-11 23:47:45', '2025-10-11 23:47:45', NULL),
(246, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0025 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 204, '2025-10-12 18:58:25', '2025-10-12 18:58:25', NULL),
(247, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0025 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 204, '2025-10-12 18:58:25', '2025-10-12 18:58:25', NULL),
(248, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0026 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 206, '2025-10-13 12:57:42', '2025-10-13 12:57:42', NULL),
(249, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0026 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 206, '2025-10-13 12:57:42', '2025-10-13 12:57:42', NULL),
(250, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0027 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 207, '2025-10-13 12:59:29', '2025-10-13 12:59:29', NULL),
(251, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0027 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 207, '2025-10-13 12:59:29', '2025-10-13 12:59:29', NULL),
(252, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0028 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 209, '2025-10-13 13:11:16', '2025-10-13 13:11:16', NULL),
(253, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0028 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 209, '2025-10-13 13:11:16', '2025-10-13 13:11:16', NULL),
(254, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0029 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 210, '2025-10-13 13:38:56', '2025-10-13 13:38:56', NULL),
(255, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0029 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 210, '2025-10-13 13:38:56', '2025-10-13 13:38:56', NULL),
(256, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0030 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 211, '2025-10-13 13:39:58', '2025-10-13 13:39:58', NULL),
(257, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0030 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 211, '2025-10-13 13:39:58', '2025-10-13 13:39:58', NULL),
(258, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0031 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 212, '2025-10-13 14:10:19', '2025-10-13 14:10:19', NULL),
(259, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0031 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 212, '2025-10-13 14:10:19', '2025-10-13 14:10:19', NULL),
(260, 13, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0033 ของคุณ พนักงานธุรการหัวหน้า สาขา แล้ว', 'success', 0, 220, '2025-10-15 08:49:35', '2025-10-15 08:49:35', NULL),
(261, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0033 จากอาจารย์ พนักงานธุรการหัวหน้า สาขา รอพิจารณา', 'info', 0, 220, '2025-10-15 08:49:35', '2025-10-15 08:49:35', NULL),
(262, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0035 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 221, '2025-10-15 12:23:34', '2025-10-15 12:23:34', NULL),
(263, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0035 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 221, '2025-10-15 12:23:34', '2025-10-15 12:23:34', NULL),
(264, 8, 'ส่งคำร้องสำเร็จ', 'ระบบได้รับคำร้อง PR-2568-0036 ของคุณ อาจารย์สมชาย ใจดี แล้ว', 'success', 0, 222, '2025-10-15 14:28:06', '2025-10-15 14:28:06', NULL),
(265, 13, 'คำร้องใหม่รอพิจารณา (หัวหน้าสาขา)', 'มีคำร้องใหม่ PR-2568-0036 จากอาจารย์ อาจารย์สมชาย ใจดี รอพิจารณา', 'info', 0, 222, '2025-10-15 14:28:06', '2025-10-15 14:28:06', NULL);

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
(146, 8, 'Transformation of the BPMN design model into a colored Petri net using the partitioning approach', 'Chanon Dechsupa, Wiwat Vatanawood, Arthit Thongtak', NULL, NULL, NULL, 2018, NULL, 'https://ieeexplore.ieee.org/abstract/document/8405526/', 45, 'https://scholar.google.com/scholar?hl=en&cites=12787580523055771259', 'scholar', '{\"scholar_cluster_id\":\"[\'12787580523055771259\']\"}', '6badedb989e2cf25cea1172a93f4cb13db967f23', 0, '2025-09-21 00:00:59', '2025-10-15 00:01:08', NULL, '{\"2018\":2,\"2019\":10,\"2020\":3,\"2021\":5,\"2022\":9,\"2023\":6,\"2024\":9,\"2025\":1}'),
(147, 8, 'Hierarchical verification for the BPMN design model using state space analysis', 'Chanon Dechsupa, Wiwat Vatanawood, Arthit Thongtak', NULL, NULL, NULL, 2019, NULL, 'https://ieeexplore.ieee.org/abstract/document/8611325/', 41, 'https://scholar.google.com/scholar?hl=en&cites=8862119664193353323', 'scholar', '{\"scholar_cluster_id\":\"[\'8862119664193353323\']\"}', '29bd0c0fb709ce634fa24280fa74b0123c33d553', 0, '2025-09-21 00:00:59', '2025-10-15 00:01:08', NULL, '{\"2018\":1,\"2019\":6,\"2020\":3,\"2021\":4,\"2022\":8,\"2023\":10,\"2024\":2,\"2025\":7}'),
(148, 8, 'Formal verification of web service orchestration using colored petri net', 'C Dechsupa, W Vatanawood, A Thongtak', NULL, NULL, NULL, 2016, NULL, 'http://www.iaeng.org/publication/IMECS2016/IMECS2016_pp398-403.pdf', 13, 'https://scholar.google.com/scholar?hl=en&cites=17960005054307779010', 'scholar', '{\"scholar_cluster_id\":\"[\'17960005054307779010\']\"}', '0c1a71fe987328fd47243c5f50fa927fe3aad557', 0, '2025-09-21 00:00:59', '2025-10-15 00:01:08', NULL, '{\"2017\":1,\"2018\":3,\"2019\":4,\"2020\":2,\"2021\":1,\"2022\":0,\"2023\":2}'),
(149, 8, 'Stepwise verification for the BPMN with timed and stochastic process using a colored generalized stochastic Petri net', 'Chanon Dechsupa, Wiwat Vatanawood, Arthit Thongtak', NULL, NULL, NULL, 2022, NULL, 'https://ieeexplore.ieee.org/abstract/document/9758738/', 6, 'https://scholar.google.com/scholar?hl=en&cites=7981025124627691886', 'scholar', '{\"scholar_cluster_id\":\"[\'7981025124627691886\']\"}', 'aeb7e0e56f784f470d212414acdf19f7307ed11e', 0, '2025-09-21 00:00:59', '2025-10-15 00:01:08', NULL, '{\"2022\":2,\"2023\":1,\"2024\":0,\"2025\":3}'),
(150, 8, 'An automated framework for BPMN model verification achieving branch coverage', 'Chanon Dechsupa, Wiwat Vatanawood, Arthit Thongtak', NULL, NULL, NULL, 2021, NULL, 'https://engj.org/index.php/ej/article/view/4084', 5, 'https://scholar.google.com/scholar?hl=en&cites=8795149309224104072', 'scholar', '{\"scholar_cluster_id\":\"[\'8795149309224104072\']\"}', '07daece3baefcd04ce2263035573e1c44e55bc49', 0, '2025-09-21 00:00:59', '2025-10-15 00:01:08', NULL, '{\"2021\":1,\"2022\":0,\"2023\":2,\"2024\":1,\"2025\":1}'),
(151, 8, 'Formal Verification of the Accounting Information Interfaces Using Colored Petri Net', 'Worawit Poolsawasdi, Chanon Dechsupa', NULL, NULL, NULL, 2019, NULL, 'https://ieeexplore.ieee.org/abstract/document/8802547/', 3, 'https://scholar.google.com/scholar?hl=en&cites=14998856147780456235', 'scholar', '{\"scholar_cluster_id\":\"[\'14998856147780456235\']\"}', 'c170922d38a507760700cbfab7f16275afb11e30', 0, '2025-09-21 00:00:59', '2025-10-15 00:01:08', NULL, '{\"2019\":1,\"2020\":0,\"2021\":2}'),
(152, 8, 'Compositional formal verification for business process models with heterogeneous notations using colored Petri Net', 'C Dechsupa, W Vatanawood, A Thongtak', NULL, NULL, NULL, 2019, NULL, 'https://scholar.google.com/scholar?cluster=6843663431830027631&hl=en&oi=scholarr', 3, 'https://scholar.google.com/scholar?hl=en&cites=6843663431830027631', 'scholar', '{\"scholar_cluster_id\":\"[\'6843663431830027631\']\"}', '23242652a60d109cd5fad480e0a5d4f44cafe19d', 0, '2025-09-21 00:00:59', '2025-10-15 00:01:08', NULL, '{\"2023\":1,\"2024\":2}'),
(153, 8, 'MorphoNet: A novel bivalve images classification framework with convolutional neural network', 'Chanon Dechsupa, Pongpun Prasankok, Wiwat Vattanawood, Arthit Thongtak', NULL, NULL, NULL, 2023, NULL, 'https://www.engj.org/index.php/ej/article/view/4510', 2, 'https://scholar.google.com/scholar?hl=en&cites=14881028456811771380', 'scholar', '{\"scholar_cluster_id\":\"[\'14881028456811771380\']\"}', '520340ad03a1bd8771441f1e27b9e5fd998fc943', 0, '2025-09-21 00:00:59', '2025-10-15 00:01:08', NULL, '{\"2024\":1,\"2025\":1}'),
(154, 8, 'Formal modelling and verification of the traffic light control system design with time-automata', 'A Kamput, C Dechsupa', NULL, NULL, NULL, 2023, NULL, 'https://www.researchgate.net/profile/Chanon-Dechsupa/publication/372388619_Formal_Modelling_and_Verification_of_the_Traffic_Light_Control_System_Design_with_Time-Automata/links/652e3af3b5c77c79f9bda3d7/Formal-Modelling-and-Verification-of-the-Traffic-Light-Control-System-Design-with-Time-Automata.pdf', 2, 'https://scholar.google.com/scholar?hl=en&cites=14268178437607664045', 'scholar', '{\"scholar_cluster_id\":\"[\'14268178437607664045\']\"}', '68f044d021c5607e9e2102e03aa9f62276ba28ef', 0, '2025-09-21 00:00:59', '2025-10-15 00:01:08', NULL, '{\"2025\":2}'),
(155, 8, 'An Applying Colored Petri Net for Computerized Accounting System and Ledger Accounts Instruction', 'Chanon Dechsupa, Wiwat Vatanawood, Worawit Poolsawasdi, Arthit Thongtak', NULL, NULL, NULL, 2021, NULL, 'https://www.mdpi.com/2073-431X/10/12/169', 2, 'https://scholar.google.com/scholar?hl=en&cites=16343376208504623490', 'scholar', '{\"scholar_cluster_id\":\"[\'16343376208504623490\']\"}', 'a0313a91b99f2de58140206c67f5aba6663f9f8b', 0, '2025-09-21 00:00:59', '2025-10-15 00:01:08', NULL, '{\"2023\":2}'),
(156, 8, 'Llm-Based Code Comment Summarization: Efficacy Evaluation and Challenges', 'Peeradon Sukkasem, Chitsutha Soomlek, Chanon Dechsupa', NULL, NULL, NULL, 2025, NULL, 'https://ieeexplore.ieee.org/abstract/document/11003343/', 1, 'https://scholar.google.com/scholar?hl=en&cites=14726756873448249733', 'scholar', '{\"scholar_cluster_id\":\"[\'14726756873448249733\']\"}', '39d79360a49705d0644781f70219ee2490fb951b', 0, '2025-09-21 00:00:59', '2025-10-15 00:01:08', NULL, '{\"2025\":1}'),
(157, 8, 'Scalable Timed-Automata Models for Traffic Light Control Systems: Challenges and Solutions in Formal Verification', 'Apipath Kamput, Chanon Dechsupa, Wiwat Vatanawood, Suttinan Pomsiri', NULL, NULL, NULL, 2024, NULL, 'https://ieeexplore.ieee.org/abstract/document/10666689/', 2, 'https://scholar.google.com/scholar?hl=en&cites=12598599138348353170', 'scholar', '{\"scholar_cluster_id\":\"[\'12598599138348353170\']\"}', '47baa15c9601f7a47e319e4ee43ac19e56de55cd', 0, '2025-09-21 00:00:59', '2025-10-15 00:01:08', NULL, '{\"2024\":1,\"2025\":1}'),
(158, 8, 'Toward automated verification of timed business process models using timed-automata networks and temporal properties', 'Chanon Dechsupa, Wiwat Vatanawood, Arthit Thongtak', NULL, NULL, NULL, 2025, NULL, 'https://www.sciencedirect.com/science/article/pii/S0020025525002208', NULL, NULL, 'scholar', NULL, '53db11828cb1250fd29af14999ea719ec090dbe1', 0, '2025-09-21 00:00:59', '2025-10-15 00:01:08', NULL, NULL),
(159, 8, 'Towards AI-Augmented Formal Verification: A Preliminary Investigation of ENGRU and Its Challenges', 'Chanon Dechsupa, Teerapong Panboonyuen, Wiwat Vatanawood, Praisan Padungweang, Chakchai So-In', NULL, NULL, NULL, 2025, NULL, 'https://ieeexplore.ieee.org/abstract/document/10993355/', 1, 'https://scholar.google.com/scholar?hl=en&cites=18157055063819776419', 'scholar', '{\"scholar_cluster_id\":\"[\'18157055063819776419\']\"}', '61ae555d998434eb64330b744161eaa6a8914dc1', 0, '2025-09-21 00:00:59', '2025-10-15 00:01:08', NULL, '{\"2025\":1}'),
(160, 8, 'Ensuring IoT Controller Reliability with Colored Generalized Stochastic Petri Net', 'Kruntarat Samngamnoi, Sutinun Pomsiri, Apipath Kamput, Chanon Dechsupa', NULL, NULL, NULL, 2024, NULL, 'https://ieeexplore.ieee.org/abstract/document/10770732/', NULL, NULL, 'scholar', NULL, 'baf62b4c49575b62532aacf9a50ee208449c39ec', 0, '2025-09-21 00:00:59', '2025-10-15 00:01:08', NULL, NULL),
(161, 8, 'An Applying Colored Petri Net for Computerized Accounting System and Ledger Accounts Instruction. Computers 2021, 10, 169', 'C Dechsupa, W Vatanawood, W Poolsawasdi, A Thongtak', NULL, NULL, NULL, 2021, NULL, 'https://www.academia.edu/download/80214901/pdf.pdf', NULL, NULL, 'scholar', NULL, '992712dd566fd338b5cf9253b9ddc09873cd0f04', 0, '2025-09-21 00:00:59', '2025-10-15 00:01:08', NULL, NULL),
(162, 8, 'Configuration management for integrated teaming environment', 'Chanon Dechsupa, Yachai Limpiyakorn', NULL, NULL, NULL, 2011, NULL, 'https://ieeexplore.ieee.org/abstract/document/6081265/', NULL, NULL, 'scholar', NULL, 'f43315261210343763e2bbcc9400bbf5696776cf', 0, '2025-09-21 00:00:59', '2025-10-15 00:01:08', NULL, NULL),
(163, 8, 'Transforming of the Sequence Diagram into Time-Automata Network', 'S Duangmalai, C Dechsupa', NULL, NULL, NULL, NULL, NULL, 'https://scholar.google.com/scholar?cluster=7621266305846188641&hl=en&oi=scholarr', NULL, NULL, 'scholar', NULL, '6df534e9aadf27573bb99823d90c0b0d042ad440', 0, '2025-09-21 00:00:59', '2025-10-15 00:01:08', NULL, NULL);

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
(128, 170, 'Test Article Title', 'Test Journal Name', '2025-02-01', 'journal', 'T5', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Scopus, Web of Science', '50000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '50000.00', '0.00', '', 1, 'first_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-07 22:10:43', '2025-10-07 22:10:43', NULL, 3, 2, 'AB', 'somchai jaidee'),
(129, 171, 'Test Article Title', 'Test Journal Name', '2025-07-01', 'journal', 'T5', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science', '50000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '50000.00', '0.00', '', 1, 'first_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-07 22:35:41', '2025-10-07 22:35:41', NULL, 3, 2, 'AB', 'somchai jaidee'),
(130, 172, 'Test Article Title', 'Test Journal Name', '2025-06-01', 'journal', 'T5', '0.000', '10.1016/j', 'https://example.ac.th', '123-145', 'Vol.10', 'ISI, Web of Science', '50000.00', '0.00', '1111.00', '0.00', '2222.00', '0.00', '333.00', '53000.00', '0.00', '', 2, 'corresponding_author', 'no', NULL, 'QS World University Rankings #543', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-07 23:33:37', '2025-10-07 23:33:37', NULL, 3, 2, 'ก ข ค', 'สมชาย ใจดี'),
(131, 173, 'Article Title', 'Journal Name', '2025-10-01', 'journal', 'Q2', '0.000', '10.1016/j', 'https://example.ac.th', '123-145', 'Vol.10', 'Scopus, Web of Science', '30000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '30000.00', '0.00', '', 3, 'corresponding_author', 'no', NULL, 'QS World University Rankings #543', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-08 00:06:04', '2025-10-08 00:06:04', NULL, 3, 2, 'สมชาย สมหญิง', 'สมชาย ใจดี'),
(132, 175, 'Test Article Title', 'Test Journal Name', '2025-01-01', 'journal', 'T5', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Scopus, Web of Science', '50000.00', '0.00', '500.00', '0.00', '10000.00', '0.00', '5000.00', '55500.00', '0.00', '', 2, 'first_author', 'yes', 'FA-777', 'QS #500', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-08 10:52:09', '2025-10-08 10:52:09', NULL, 3, 2, 'AB', 'somchai jaidee'),
(133, 176, 'Test Article Title', 'Test Journal Name', '2025-01-01', 'journal', 'T5', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'ISI', '50000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '50000.00', '45000.00', '123/456', 1, 'first_author', 'yes', 'FA-777', 'QS #500', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-09 10:14:12', '2025-10-09 10:58:28', NULL, 3, 2, 'A B', 'somchai jaidee'),
(134, 178, 'Test Article Title', 'Test Journal Name', '2025-04-01', 'journal', 'T5', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science', '50000.00', '50000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '50000.00', '50000.00', '123', 1, 'first_author', 'yes', 'FA-777', 'QS #500', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-09 11:23:45', '2025-10-09 11:29:25', NULL, 3, 2, 'AB', 'somchai jaidee'),
(135, 179, 'Test Article Title', 'Test Journal Name', '2025-06-01', 'journal', 'T10', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science', '45000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '45000.00', '0.00', '', 1, 'first_author', 'yes', 'FA-777', 'QS #500', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-09 12:50:53', '2025-10-09 12:56:34', NULL, 3, 2, 'AB', 'somchai jaidee'),
(136, 180, 'Test Article Title', 'Test Journal Name', '2025-04-01', 'journal', 'Q3', '0.000', '', '', '', '', '', '20000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '20000.00', '0.00', '', 2, 'first_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-09 12:58:08', '2025-10-09 12:58:08', NULL, 3, 2, 'a asd', 'สมชาย ใจดี'),
(137, 181, 'Test Article Title', 'Test Journal Name', '2025-06-01', 'journal', 'T5', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science', '50000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '50000.00', '0.00', '', 1, 'first_author', 'yes', 'FA-777', 'QS #500', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-09 13:33:51', '2025-10-09 14:23:08', NULL, 3, 2, 'AB', 'somchai jaidee'),
(138, 182, 'Test Article Title', 'Test Journal Name', '2025-05-01', 'journal', 'T5', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science', '50000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '50000.00', '0.00', '', 1, 'first_author', 'yes', 'FA-777', 'QS #500', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-11 11:01:14', '2025-10-11 11:01:14', NULL, 3, 2, 'AB', 'somchai jaidee'),
(139, 183, 'Test Article Title', 'Test Journal Name', '2025-12-01', 'journal', 'T5', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science', '50000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '50000.00', '0.00', '', 1, 'corresponding_author', 'yes', 'FA-777', 'QS #500', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-11 12:23:19', '2025-10-11 12:23:19', NULL, 3, 2, 'AB', 'somchai jaidee'),
(140, 184, 'Test Article Title', 'Test Journal Name', '2025-04-01', 'journal', 'T5', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Scopus, Web of Science', '50000.00', '0.00', '500.00', '0.00', '5000.00', '0.00', '2000.00', '53500.00', '0.00', '', 1, 'first_author', 'yes', 'FA-777', 'QS #500', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-11 13:26:47', '2025-10-11 13:26:47', NULL, 3, 2, 'AB', 'somchai jaidee'),
(141, 187, 'Test Article Title', 'Test Journal Name', '2025-05-01', 'journal', 'T10', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'ISI', '45000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '45000.00', '0.00', '', 1, 'first_author', 'yes', 'FA-777', 'QS #500', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-11 20:44:34', '2025-10-11 20:44:34', NULL, 3, 2, 'AB', 'somchai jaidee'),
(142, 189, 'Test Article Title', 'Test Journal Name', '2025-05-01', 'journal', 'Q1', '0.000', '', '', 'aa', '', 'ISI, Web of Science', '40000.00', '0.00', '1230.00', '0.00', '4020.00', '0.00', '3123.00', '42127.00', '0.00', '', 2, 'corresponding_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-11 21:20:47', '2025-10-11 21:20:47', NULL, 8, 2, 'A B C', 'สมชาย ใจดี'),
(143, 190, 'Test Article Title', 'Test Journal Name', '2025-02-01', 'journal', 'T10', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science', '45000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '45000.00', '0.00', '', 1, 'first_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-11 21:27:01', '2025-10-11 21:27:01', NULL, 8, 2, 'AB', 'somchai jaidee'),
(144, 192, 'Test Article Title', 'Test Journal Name', '2025-09-01', 'journal', 'T5', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'ISI', '50000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '50000.00', '0.00', '', 1, 'first_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-11 22:17:11', '2025-10-11 22:17:11', NULL, 8, 2, 'AB', 'somchai jaidee'),
(145, 193, 'Test Article Title', 'Test Journal Name', '2025-08-01', 'journal', 'T5', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science', '50000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '50000.00', '0.00', '', 1, 'first_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-11 22:25:00', '2025-10-11 22:25:00', NULL, 8, 2, 'AB', 'somchai jaidee'),
(146, 194, 'Test Article Title', 'Test Journal Name', '2025-06-01', 'journal', 'T5', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science', '50000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '50000.00', '0.00', '', 1, 'first_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-11 22:36:58', '2025-10-11 22:36:58', NULL, 8, 2, 'AB', 'somchai jaidee'),
(147, 196, 'Test Article Title', 'Test Journal Name', '2025-08-01', 'journal', 'Q2', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science', '30000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '30000.00', '0.00', '', 1, 'first_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-11 22:55:18', '2025-10-11 22:55:18', NULL, 8, 2, 'AB', 'somchai jaidee'),
(148, 198, 'Test Article Title', 'Test Journal Name', '2025-08-01', 'journal', 'T5', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science', '50000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '50000.00', '0.00', '', 1, 'first_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-11 23:05:31', '2025-10-11 23:05:31', NULL, 8, 2, 'AB', 'somchai jaidee'),
(149, 199, 'Test Article Title', 'Test Journal Name', '2025-08-01', 'journal', 'T5', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science', '50000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '50000.00', '0.00', '', 1, 'first_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-11 23:12:43', '2025-10-11 23:12:43', NULL, 8, 2, 'AB', 'somchai jaidee'),
(150, 202, 'Test Article Title', 'Test Journal Name', '2025-05-01', 'journal', 'T5', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'ISI', '50000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '50000.00', '0.00', '', 1, 'first_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-11 23:36:03', '2025-10-11 23:36:03', NULL, 8, 2, 'AB', 'somchai jaidee'),
(151, 203, 'Test Article Title', 'Test Journal Name', '2025-08-01', 'journal', 'Q2', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science', '30000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '30000.00', '0.00', '', 1, 'corresponding_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-11 23:47:43', '2025-10-11 23:47:43', NULL, 8, 2, 'AB', 'somchai jaidee'),
(152, 204, 'Test Article Title', 'Test Journal Name', '2025-03-01', 'journal', 'Q1', '0.000', '10.1016/j', 'https://example.ac.th', '123-145', 'Vol.10', 'Web of Science', '40000.00', '0.00', '2500.00', '0.00', '3500.00', '0.00', '4234.00', '41766.00', '0.00', '', 3, 'first_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-12 18:58:24', '2025-10-12 18:58:24', NULL, 8, 2, 'A B C D', 'สมชาย ใจดี'),
(153, 206, 'Test Article Title', 'Test Journal Name', '2025-06-01', 'journal', 'T5', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science', '50000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '50000.00', '0.00', '', 1, 'first_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-13 12:57:41', '2025-10-13 12:57:41', NULL, 8, 2, 'AB', 'somchai jaidee'),
(154, 207, 'Test Article Title', 'Test Journal Name', '2025-05-01', 'journal', 'T10', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science', '45000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '45000.00', '0.00', '', 1, 'first_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-13 12:59:28', '2025-10-13 12:59:28', NULL, 8, 2, 'a b c', 'somchai jaidee'),
(155, 209, 'Test Article Title', 'Test Journal Name', '2025-03-01', 'journal', 'T5', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science', '50000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '50000.00', '0.00', '', 1, 'first_author', 'no', NULL, 'QS #500', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-13 13:11:15', '2025-10-13 13:11:15', NULL, 8, 2, 'AB', 'somchai jaidee'),
(156, 210, 'Test Article Title', 'Test Journal Name', '2025-09-01', 'journal', 'T10', '0.000', '', '', '', '', 'Scopus', '45000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '45000.00', '0.00', '', 1, 'first_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-13 13:38:55', '2025-10-13 13:38:55', NULL, 8, 2, 'ab', 'somchai jaidee'),
(157, 211, 'Test Article Title', 'Test Journal Name', '2025-02-01', 'journal', 'T5', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science', '50000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '50000.00', '0.00', '', 1, 'first_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-13 13:39:57', '2025-10-13 13:39:57', NULL, 8, 2, 'ABC', 'somchai jaidee'),
(158, 212, 'Test Article Title', 'Test Journal Name', '2025-07-01', 'journal', 'T10', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science', '45000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '45000.00', '0.00', '', 1, 'first_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-13 14:10:18', '2025-10-13 14:10:18', NULL, 8, 2, 'ABCS', 'somchai jaidee'),
(161, 218, 'Test Article Title', 'Test Journal Name', '2025-07-01', 'journal', 'Q1', '0.000', '10.1016/j', 'https://example.ac.th', '123-145', 'Vol.10', 'ISI, Web of Science', '40000.00', '0.00', '4321.00', '0.00', '1234.00', '0.00', '444.00', '45111.00', '0.00', '', 3, 'corresponding_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-14 23:10:55', '2025-10-14 23:10:55', NULL, 8, 2, 'A B C D', 'สมชาย ใจดี'),
(163, 220, 'Test Article Title', 'Test Journal Name', '2025-09-01', 'journal', 'Q4', '0.000', '10.1016/j', 'https://example.ac.th', '123-145', 'Vol.10', 'ISI, Web of Science', '10000.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '10000.00', '0.00', '', 2, 'first_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-15 08:49:34', '2025-10-15 08:49:34', NULL, 8, 2, 'A B C D', 'สมชาย ใจดี'),
(164, 221, 'Test Article Title', 'Test Journal Name', '2025-01-01', 'journal', 'T5', '0.000', '10.1016/j', 'https://example.ac.th', '123-145', 'Vol.10', 'ISI, Web of Science', '50000.00', '0.00', '1234.00', '0.00', '4321.00', '0.00', '444.00', '55111.00', '0.00', '', 3, 'first_author', 'no', NULL, 'QS World University Rankings #543', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-15 12:23:32', '2025-10-15 12:23:32', NULL, 8, 2, 'A B C D', 'สมชาย ใจดี'),
(165, 222, 'Test Article Title', 'Test Journal Name', '2025-01-01', 'journal', 'Q1', '0.000', '10.1016/j', 'https://example.ac.th', '123-145', 'Vol.10', 'ISI, Web of Science', '40000.00', '0.00', '4321.00', '0.00', '1234.00', '0.00', '555.00', '45000.00', '0.00', '', 3, 'corresponding_author', 'no', NULL, 'QS World University Rankings #543', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-15 14:28:04', '2025-10-15 14:28:04', NULL, 8, 2, 'A B C D', 'สมชาย ใจดี'),
(166, 223, 'Test Article Title', 'Test Journal Name', '2025-02-01', 'journal', 'T10', '0.000', '10.10.16', 'test.artical.url', '123-456', 'Vol.Test', 'Web of Science, TCI', '45000.00', '0.00', '5000.00', '0.00', '10000.00', '0.00', '3000.00', '57000.00', '0.00', '', 2, 'first_author', 'no', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-15 14:53:40', '2025-10-15 14:53:40', NULL, 8, 2, 'A B C', 'somchai jaidee');

-- --------------------------------------------------------

--
-- โครงสร้างตาราง `publication_reward_external_funds`
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

--
-- dump ตาราง `publication_reward_external_funds`
--

INSERT INTO `publication_reward_external_funds` (`external_fund_id`, `detail_id`, `submission_id`, `fund_name`, `amount`, `document_id`, `file_id`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 152, 204, '', '1000.00', 594, 507, '2025-10-12 18:58:24', '2025-10-12 18:58:24', NULL),
(2, 152, 204, '', '2000.00', 595, 508, '2025-10-12 18:58:24', '2025-10-12 18:58:25', NULL),
(3, 152, 204, '', '1234.00', 596, 509, '2025-10-12 18:58:24', '2025-10-12 18:58:25', NULL),
(8, 161, 218, '', '123.00', NULL, NULL, '2025-10-14 23:10:55', '2025-10-14 23:10:55', NULL),
(9, 161, 218, '', '321.00', NULL, NULL, '2025-10-14 23:10:55', '2025-10-14 23:10:55', NULL),
(14, 164, 221, 'จากมข', '123.00', NULL, NULL, '2025-10-15 12:23:32', '2025-10-15 12:23:32', NULL),
(15, 164, 221, 'จากคณะนิติ', '321.00', NULL, NULL, '2025-10-15 12:23:32', '2025-10-15 12:23:32', NULL),
(16, 165, 222, 'ทุนจากมข', '123.00', 643, 566, '2025-10-15 14:28:04', '2025-10-15 14:28:05', NULL),
(17, 165, 222, 'ทุนจากมก', '432.00', 642, 565, '2025-10-15 14:28:04', '2025-10-15 14:28:05', NULL),
(18, 166, 223, '', '1000.00', NULL, NULL, '2025-10-15 14:53:40', '2025-10-15 14:53:40', NULL),
(19, 166, 223, '', '2000.00', NULL, NULL, '2025-10-15 14:53:40', '2025-10-15 14:53:40', NULL);

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
(12, '2568', 'corresponding_author', 'T5', '50000.00', 1, '2025-08-04 12:19:45', '2025-10-10 11:56:18'),
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
(1, '2568', 'T5', '50000.00', 'วงเงินสูงสุดสำหรับ T5 วารสาร', 1, '2025-08-04 15:33:53', '2025-10-09 11:00:27', NULL),
(2, '2568', 'T10', '40000.00', 'วงเงินสูงสุดสำหรับ T10 วารสาร', 1, '2025-08-04 15:33:53', '2025-08-04 15:35:55', NULL),
(3, '2568', 'Q1', '30000.00', 'วงเงินสูงสุดสำหรับ Q1 วารสาร', 1, '2025-08-04 15:33:53', '2025-08-04 15:37:32', NULL),
(4, '2568', 'Q2', '20000.00', 'วงเงินสูงสุดสำหรับ Q2 วารสาร', 0, '2025-08-04 15:33:53', '2025-10-07 23:12:37', NULL),
(5, '2568', 'Q3', '15000.00', 'วงเงินสูงสุดสำหรับ Q3 วารสาร', 0, '2025-08-04 15:33:53', '2025-08-04 15:37:44', NULL),
(6, '2568', 'Q4', '10000.00', 'วงเงินสูงสุดสำหรับ Q4 วารสาร', 0, '2025-08-04 15:33:53', '2025-08-04 15:37:46', NULL),
(7, '2568', 'TCI', '5000.00', 'วงเงินสูงสุดสำหรับ TCI วารสาร', 0, '2025-08-04 15:33:53', '2025-08-04 15:37:49', NULL),
(24, '2567', 'T5', '50000.00', 'วงเงินสูงสุดสำหรับ T5 วารสาร', 1, '2025-10-12 08:26:09', '2025-10-12 08:26:09', NULL),
(25, '2567', 'Q1', '30000.00', 'วงเงินสูงสุดสำหรับ Q1 วารสาร', 1, '2025-10-12 08:26:09', '2025-10-12 08:26:09', NULL),
(26, '2567', 'T10', '40000.00', 'วงเงินสูงสุดสำหรับ T10 วารสาร', 1, '2025-10-12 08:26:09', '2025-10-12 08:26:09', NULL);

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
(21, 'timer', 'success', NULL, '2025-10-07 00:00:04', '2025-10-07 00:01:34', 2, 0, 18, 0, 18, 0, '2025-10-07 00:00:04', '2025-10-07 00:01:34', NULL),
(22, 'timer', 'success', NULL, '2025-10-08 00:00:19', '2025-10-08 00:01:48', 2, 0, 18, 0, 18, 0, '2025-10-08 00:00:19', '2025-10-08 00:01:48', NULL),
(23, 'timer', 'success', NULL, '2025-10-09 00:00:19', '2025-10-09 00:01:48', 2, 0, 18, 0, 18, 0, '2025-10-09 00:00:19', '2025-10-09 00:01:48', NULL),
(24, 'timer', 'success', NULL, '2025-10-10 00:00:19', '2025-10-10 00:01:51', 2, 0, 18, 0, 18, 0, '2025-10-10 00:00:19', '2025-10-10 00:01:51', NULL),
(25, 'timer', 'success', NULL, '2025-10-11 00:00:19', '2025-10-11 00:01:50', 2, 0, 18, 0, 18, 0, '2025-10-11 00:00:19', '2025-10-11 00:01:50', NULL),
(26, 'timer', 'success', NULL, '2025-10-12 00:00:19', '2025-10-12 00:01:49', 2, 0, 18, 0, 18, 0, '2025-10-12 00:00:19', '2025-10-12 00:01:49', NULL),
(27, 'timer', 'success', NULL, '2025-10-13 00:00:04', '2025-10-13 00:01:31', 2, 0, 18, 0, 18, 0, '2025-10-13 00:00:04', '2025-10-13 00:01:31', NULL),
(28, 'timer', 'success', NULL, '2025-10-14 00:00:19', '2025-10-14 00:01:48', 2, 0, 18, 0, 18, 0, '2025-10-14 00:00:19', '2025-10-14 00:01:48', NULL),
(29, 'timer', 'success', NULL, '2025-10-15 00:00:19', '2025-10-15 00:01:49', 2, 0, 18, 0, 18, 0, '2025-10-15 00:00:19', '2025-10-15 00:01:49', NULL);

-- --------------------------------------------------------

--
-- โครงสร้างตาราง `subcategory_budgets`
--

CREATE TABLE `subcategory_budgets` (
  `subcategory_budget_id` int(11) NOT NULL,
  `subcategory_id` int(11) NOT NULL,
  `record_scope` enum('overall','rule') NOT NULL DEFAULT 'rule',
  `allocated_amount` decimal(15,2) DEFAULT NULL COMMENT 'งบทั้งหมดประมาณของทุน',
  `remaining_budget` decimal(15,2) DEFAULT NULL COMMENT 'ไม่ได้ใช้',
  `used_amount` decimal(15,2) DEFAULT NULL COMMENT 'ไม่ได้ใช้',
  `max_amount_per_grant` decimal(15,2) DEFAULT NULL,
  `max_amount_per_year` decimal(15,2) DEFAULT NULL,
  `max_grants` int(11) DEFAULT NULL,
  `remaining_grant` int(11) DEFAULT NULL COMMENT 'ไม่ได้ใช้',
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

INSERT INTO `subcategory_budgets` (`subcategory_budget_id`, `subcategory_id`, `record_scope`, `allocated_amount`, `remaining_budget`, `used_amount`, `max_amount_per_grant`, `max_amount_per_year`, `max_grants`, `remaining_grant`, `level`, `status`, `fund_description`, `comment`, `create_at`, `update_at`, `delete_at`) VALUES
(258, 97, 'overall', NULL, NULL, NULL, '200000.00', '200000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(259, 98, 'overall', NULL, NULL, NULL, '25000.00', '25000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(260, 99, 'overall', NULL, NULL, NULL, '20000.00', '80000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(261, 100, 'overall', NULL, NULL, NULL, '10000.00', '10000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(262, 101, 'overall', NULL, NULL, NULL, NULL, '500000.00', 1, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(263, 101, 'rule', NULL, NULL, NULL, '100000.00', NULL, NULL, NULL, NULL, 'active', '(1) ชั้นต้น', 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(264, 101, 'rule', NULL, NULL, NULL, '150000.00', NULL, NULL, NULL, NULL, 'active', '(2) ชั้นกลาง', 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(265, 101, 'rule', NULL, NULL, NULL, '250000.00', NULL, NULL, NULL, NULL, 'active', '(3) ชั้นสูง', 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(266, 102, 'overall', NULL, NULL, NULL, NULL, '500000.00', 1, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(267, 102, 'rule', NULL, NULL, NULL, '100000.00', NULL, NULL, NULL, NULL, 'active', '(1) ชั้นต้น', 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(268, 102, 'rule', NULL, NULL, NULL, '150000.00', NULL, NULL, NULL, NULL, 'active', '(2) ชั้นกลาง', 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(269, 102, 'rule', NULL, NULL, NULL, '250000.00', NULL, NULL, NULL, NULL, 'active', '(3) ชั้นสูง', 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(270, 103, 'overall', NULL, NULL, NULL, '250000.00', '250000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(271, 104, 'overall', NULL, NULL, NULL, '400000.00', '800000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(272, 105, 'overall', NULL, NULL, NULL, '100000.00', '300000.00', 1, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(273, 106, 'overall', NULL, NULL, NULL, NULL, '1000000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(274, 106, 'rule', NULL, NULL, NULL, '200000.00', NULL, NULL, NULL, NULL, 'active', '(1) ชั้นต้น', 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(275, 106, 'rule', NULL, NULL, NULL, '300000.00', NULL, NULL, NULL, NULL, 'active', '(2) ชั้นกลาง', 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(276, 106, 'rule', NULL, NULL, NULL, '500000.00', NULL, NULL, NULL, NULL, 'active', '(3) ชั้นสูง', 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(277, 107, 'overall', NULL, NULL, NULL, '100000.00', '100000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(278, 108, 'overall', NULL, NULL, NULL, NULL, '500000.00', 5, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 15:24:41', NULL),
(279, 108, 'rule', NULL, NULL, NULL, '50000.00', NULL, NULL, NULL, NULL, 'active', '(1) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 1 (ลำดับ 5 % แรก) ที่สามารถสืบค้นได้ในฐานข้อมูล \r\nWOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-14 13:36:00', NULL),
(280, 108, 'rule', NULL, NULL, NULL, '45000.00', NULL, NULL, NULL, NULL, 'active', '(2) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 1 (ลำดับ 10 % แรก) ที่สามารถสืบค้นได้ในฐานข้อมูล\r\nWOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(281, 108, 'rule', NULL, NULL, NULL, '40000.00', NULL, NULL, NULL, NULL, 'active', '(3) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 1 ที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(282, 108, 'rule', NULL, NULL, NULL, '30000.00', NULL, NULL, NULL, NULL, 'active', '(4) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 2 \r\nที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(283, 108, 'rule', NULL, NULL, NULL, '20000.00', NULL, NULL, NULL, NULL, 'active', '(5) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 3 \r\nที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(284, 108, 'rule', NULL, NULL, NULL, '10000.00', NULL, NULL, NULL, NULL, 'active', '(6) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 4 \r\nที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(285, 108, 'rule', NULL, NULL, NULL, '5000.00', NULL, NULL, NULL, NULL, 'active', '(7) บทความตีพิมพ์ในวารสารระดับนานาชาติในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS หรือวารสารที่อยู่ในฐานข้อมูล TCI กลุ่มที่ 1 สาขาวิทยาศาสตร์เทคโนโลยี', 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(286, 109, 'overall', NULL, NULL, NULL, NULL, '500000.00', 5, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(287, 109, 'rule', NULL, NULL, NULL, '50000.00', NULL, NULL, NULL, NULL, 'active', '(1) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 1 (ลำดับ 5 % แรก) ที่สามารถสืบค้นได้ในฐานข้อมูล \r\nWOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-10 11:39:42', NULL),
(288, 109, 'rule', NULL, NULL, NULL, '45000.00', NULL, NULL, NULL, NULL, 'active', '(2) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 1 (ลำดับ 10 % แรก) ที่สามารถสืบค้นได้ในฐานข้อมูล\r\nWOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(289, 109, 'rule', NULL, NULL, NULL, '40000.00', NULL, NULL, NULL, NULL, 'active', '(3) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 1 ที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(290, 109, 'rule', NULL, NULL, NULL, '30000.00', NULL, NULL, NULL, NULL, 'active', '(4) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 2 \r\nที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(291, 109, 'rule', NULL, NULL, NULL, '20000.00', NULL, NULL, NULL, NULL, 'active', '(5) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 3 \r\nที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(292, 109, 'rule', NULL, NULL, NULL, '10000.00', NULL, NULL, NULL, NULL, 'active', '(6) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 4 \r\nที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(293, 109, 'rule', NULL, NULL, NULL, '5000.00', NULL, NULL, NULL, NULL, 'active', '(7) บทความตีพิมพ์ในวารสารระดับนานาชาติในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS หรือวารสารที่อยู่ในฐานข้อมูล TCI กลุ่มที่ 1 สาขาวิทยาศาสตร์เทคโนโลยี', 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(294, 110, 'overall', NULL, NULL, NULL, NULL, '45000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(295, 110, 'rule', NULL, NULL, NULL, '20000.00', NULL, NULL, NULL, NULL, 'active', '(1) ระดับ A+', 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(296, 110, 'rule', NULL, NULL, NULL, '15000.00', NULL, NULL, NULL, NULL, 'active', '(2) ระดับ A', 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(297, 110, 'rule', NULL, NULL, NULL, '10000.00', NULL, NULL, NULL, NULL, 'active', '(3) ระดับ B', 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(298, 111, 'overall', NULL, NULL, NULL, NULL, '25000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(299, 111, 'rule', NULL, NULL, NULL, '15000.00', NULL, NULL, NULL, NULL, 'active', '(1) นำเสนอแบบบรรยาย ระดับนานาชาติ ในต่างประเทศ', 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(300, 111, 'rule', NULL, NULL, NULL, '10000.00', NULL, NULL, NULL, NULL, 'active', '(2) นำเสนอแบบบรรยาย ระดับนานาชาติ ในประเทศ  (รางวัลชนะเลิศ)', 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(301, 112, 'overall', NULL, NULL, NULL, NULL, '100000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(302, 112, 'rule', NULL, NULL, NULL, '15000.00', NULL, NULL, NULL, NULL, 'active', '(1) ระดับเพชร', 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(303, 112, 'rule', NULL, NULL, NULL, '10000.00', NULL, NULL, NULL, NULL, 'active', '(2) ระดับ ทอง', 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(304, 112, 'rule', NULL, NULL, NULL, '5000.00', NULL, NULL, NULL, NULL, 'active', '(3) ระดับ เงิน', 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(305, 113, 'overall', NULL, NULL, NULL, NULL, '15000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(306, 113, 'rule', NULL, NULL, NULL, '10000.00', NULL, NULL, NULL, NULL, 'active', '(1) ระดับนานาชาติ (รางวัลชนะเลิศ)', 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(307, 113, 'rule', NULL, NULL, NULL, '5000.00', NULL, NULL, NULL, NULL, 'active', '(2) ระดับชาติ (รางวัลชนะเลิศ)', 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(308, 114, 'overall', NULL, NULL, NULL, '150000.00', '150000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(309, 115, 'overall', NULL, NULL, NULL, NULL, '150000.00', 5, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(310, 115, 'rule', NULL, NULL, NULL, '35000.00', NULL, NULL, NULL, NULL, 'active', '(1) สิทธิบัตร (Invention patent)', 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(311, 115, 'rule', NULL, NULL, NULL, '15000.00', NULL, NULL, NULL, NULL, 'active', '(2) อนุสิทธิบัตร (Petty patent)', 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(312, 115, 'rule', NULL, NULL, NULL, '3000.00', NULL, NULL, NULL, NULL, 'active', '(3) ลิขสิทธิ์', 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(313, 116, 'overall', NULL, NULL, NULL, NULL, '600000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(314, 116, 'rule', NULL, NULL, NULL, '50000.00', NULL, NULL, NULL, NULL, 'active', '(1) ควอร์ไทล์ 1 (10% แรก)', 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(315, 116, 'rule', NULL, NULL, NULL, '40000.00', NULL, NULL, NULL, NULL, 'active', '(1) ควอร์ไทล์ 1', 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(316, 116, 'rule', NULL, NULL, NULL, '30000.00', NULL, NULL, NULL, NULL, 'active', '(1) ควอร์ไทล์ 2', 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(317, 117, 'overall', NULL, NULL, NULL, '40000.00', '40000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-08 13:11:28', '2025-10-08 13:11:28', NULL),
(319, 223, 'overall', NULL, NULL, '0.00', '200000.00', '200000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(320, 224, 'overall', NULL, NULL, '0.00', '25000.00', '25000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(321, 225, 'overall', NULL, NULL, '0.00', '20000.00', '80000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(322, 226, 'overall', NULL, NULL, '0.00', '10000.00', '10000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(323, 227, 'overall', NULL, NULL, '0.00', NULL, '500000.00', 1, 1, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(324, 227, 'rule', NULL, NULL, '0.00', '100000.00', NULL, NULL, NULL, NULL, 'active', '(1) ชั้นต้น', 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(325, 227, 'rule', NULL, NULL, '0.00', '150000.00', NULL, NULL, NULL, NULL, 'active', '(2) ชั้นกลาง', 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(326, 227, 'rule', NULL, NULL, '0.00', '250000.00', NULL, NULL, NULL, NULL, 'active', '(3) ชั้นสูง', 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(327, 228, 'overall', NULL, NULL, '0.00', NULL, '500000.00', 1, 1, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(328, 228, 'rule', NULL, NULL, '0.00', '100000.00', NULL, NULL, NULL, NULL, 'active', '(1) ชั้นต้น', 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(329, 228, 'rule', NULL, NULL, '0.00', '150000.00', NULL, NULL, NULL, NULL, 'active', '(2) ชั้นกลาง', 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(330, 228, 'rule', NULL, NULL, '0.00', '250000.00', NULL, NULL, NULL, NULL, 'active', '(3) ชั้นสูง', 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(331, 229, 'overall', NULL, NULL, '0.00', '250000.00', '250000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(332, 230, 'overall', NULL, NULL, '0.00', '400000.00', '800000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(333, 231, 'overall', NULL, NULL, '0.00', '100000.00', '300000.00', 1, 1, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(334, 232, 'overall', NULL, NULL, '0.00', NULL, '1000000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(335, 232, 'rule', NULL, NULL, '0.00', '200000.00', NULL, NULL, NULL, NULL, 'active', '(1) ชั้นต้น', 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(336, 232, 'rule', NULL, NULL, '0.00', '300000.00', NULL, NULL, NULL, NULL, 'active', '(2) ชั้นกลาง', 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(337, 232, 'rule', NULL, NULL, '0.00', '500000.00', NULL, NULL, NULL, NULL, 'active', '(3) ชั้นสูง', 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(338, 233, 'overall', NULL, NULL, '0.00', '100000.00', '100000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(339, 234, 'overall', NULL, NULL, '0.00', NULL, '500000.00', 5, 5, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(340, 234, 'rule', NULL, NULL, '0.00', '50000.00', NULL, NULL, NULL, NULL, 'active', '(1) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 1 (ลำดับ 5 % แรก) ที่สามารถสืบค้นได้ในฐานข้อมูล \r\nWOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(341, 234, 'rule', NULL, NULL, '0.00', '45000.00', NULL, NULL, NULL, NULL, 'active', '(2) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 1 (ลำดับ 10 % แรก) ที่สามารถสืบค้นได้ในฐานข้อมูล\r\nWOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(342, 234, 'rule', NULL, NULL, '0.00', '40000.00', NULL, NULL, NULL, NULL, 'active', '(3) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 1 ที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(343, 234, 'rule', NULL, NULL, '0.00', '30000.00', NULL, NULL, NULL, NULL, 'active', '(4) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 2 \r\nที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(344, 234, 'rule', NULL, NULL, '0.00', '20000.00', NULL, NULL, NULL, NULL, 'active', '(5) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 3 \r\nที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(345, 234, 'rule', NULL, NULL, '0.00', '10000.00', NULL, NULL, NULL, NULL, 'active', '(6) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 4 \r\nที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(346, 234, 'rule', NULL, NULL, '0.00', '5000.00', NULL, NULL, NULL, NULL, 'active', '(7) บทความตีพิมพ์ในวารสารระดับนานาชาติในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS หรือวารสารที่อยู่ในฐานข้อมูล TCI กลุ่มที่ 1 สาขาวิทยาศาสตร์เทคโนโลยี', 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(347, 235, 'overall', NULL, NULL, '0.00', NULL, '500000.00', 5, 5, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(348, 235, 'rule', NULL, NULL, '0.00', '50000.00', NULL, NULL, NULL, NULL, 'active', '(1) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 1 (ลำดับ 5 % แรก) ที่สามารถสืบค้นได้ในฐานข้อมูล \r\nWOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(349, 235, 'rule', NULL, NULL, '0.00', '45000.00', NULL, NULL, NULL, NULL, 'active', '(2) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 1 (ลำดับ 10 % แรก) ที่สามารถสืบค้นได้ในฐานข้อมูล\r\nWOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(350, 235, 'rule', NULL, NULL, '0.00', '40000.00', NULL, NULL, NULL, NULL, 'active', '(3) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 1 ที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(351, 235, 'rule', NULL, NULL, '0.00', '30000.00', NULL, NULL, NULL, NULL, 'active', '(4) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 2 \r\nที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(352, 235, 'rule', NULL, NULL, '0.00', '20000.00', NULL, NULL, NULL, NULL, 'active', '(5) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 3 \r\nที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(353, 235, 'rule', NULL, NULL, '0.00', '10000.00', NULL, NULL, NULL, NULL, 'active', '(6) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 4 \r\nที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(354, 235, 'rule', NULL, NULL, '0.00', '5000.00', NULL, NULL, NULL, NULL, 'active', '(7) บทความตีพิมพ์ในวารสารระดับนานาชาติในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS หรือวารสารที่อยู่ในฐานข้อมูล TCI กลุ่มที่ 1 สาขาวิทยาศาสตร์เทคโนโลยี', 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(355, 236, 'overall', NULL, NULL, '0.00', NULL, '45000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(356, 236, 'rule', NULL, NULL, '0.00', '20000.00', NULL, NULL, NULL, NULL, 'active', '(1) ระดับ A+', 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(357, 236, 'rule', NULL, NULL, '0.00', '15000.00', NULL, NULL, NULL, NULL, 'active', '(2) ระดับ A', 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(358, 236, 'rule', NULL, NULL, '0.00', '10000.00', NULL, NULL, NULL, NULL, 'active', '(3) ระดับ B', 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(359, 237, 'overall', NULL, NULL, '0.00', NULL, '25000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(360, 237, 'rule', NULL, NULL, '0.00', '15000.00', NULL, NULL, NULL, NULL, 'active', '(1) นำเสนอแบบบรรยาย ระดับนานาชาติ ในต่างประเทศ', 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(361, 237, 'rule', NULL, NULL, '0.00', '10000.00', NULL, NULL, NULL, NULL, 'active', '(2) นำเสนอแบบบรรยาย ระดับนานาชาติ ในประเทศ  (รางวัลชนะเลิศ)', 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(362, 238, 'overall', NULL, NULL, '0.00', NULL, '100000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(363, 238, 'rule', NULL, NULL, '0.00', '15000.00', NULL, NULL, NULL, NULL, 'active', '(1) ระดับเพชร', 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(364, 238, 'rule', NULL, NULL, '0.00', '10000.00', NULL, NULL, NULL, NULL, 'active', '(2) ระดับ ทอง', 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(365, 238, 'rule', NULL, NULL, '0.00', '5000.00', NULL, NULL, NULL, NULL, 'active', '(3) ระดับ เงิน', 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(366, 239, 'overall', NULL, NULL, '0.00', NULL, '15000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(367, 239, 'rule', NULL, NULL, '0.00', '10000.00', NULL, NULL, NULL, NULL, 'active', '(1) ระดับนานาชาติ (รางวัลชนะเลิศ)', 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(368, 239, 'rule', NULL, NULL, '0.00', '5000.00', NULL, NULL, NULL, NULL, 'active', '(2) ระดับชาติ (รางวัลชนะเลิศ)', 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(369, 240, 'overall', NULL, NULL, '0.00', '150000.00', '150000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(370, 241, 'overall', NULL, NULL, '0.00', NULL, '150000.00', 5, 5, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(371, 241, 'rule', NULL, NULL, '0.00', '35000.00', NULL, NULL, NULL, NULL, 'active', '(1) สิทธิบัตร (Invention patent)', 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(372, 241, 'rule', NULL, NULL, '0.00', '15000.00', NULL, NULL, NULL, NULL, 'active', '(2) อนุสิทธิบัตร (Petty patent)', 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(373, 241, 'rule', NULL, NULL, '0.00', '3000.00', NULL, NULL, NULL, NULL, 'active', '(3) ลิขสิทธิ์', 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(374, 242, 'overall', NULL, NULL, '0.00', NULL, '600000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(375, 242, 'rule', NULL, NULL, '0.00', '50000.00', NULL, NULL, NULL, NULL, 'active', '(1) ควอร์ไทล์ 1 (10% แรก)', 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(376, 242, 'rule', NULL, NULL, '0.00', '40000.00', NULL, NULL, NULL, NULL, 'active', '(1) ควอร์ไทล์ 1', 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(377, 242, 'rule', NULL, NULL, '0.00', '30000.00', NULL, NULL, NULL, NULL, 'active', '(1) ควอร์ไทล์ 2', 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(378, 243, 'overall', NULL, NULL, '0.00', '40000.00', '40000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL),
(379, 244, 'overall', NULL, NULL, '0.00', '200000.00', '200000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(380, 245, 'overall', NULL, NULL, '0.00', '25000.00', '25000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(381, 246, 'overall', NULL, NULL, '0.00', '20000.00', '80000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(382, 247, 'overall', NULL, NULL, '0.00', '10000.00', '10000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(383, 248, 'overall', NULL, NULL, '0.00', NULL, '500000.00', 1, 1, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(384, 248, 'rule', NULL, NULL, '0.00', '100000.00', NULL, NULL, NULL, NULL, 'active', '(1) ชั้นต้น', 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(385, 248, 'rule', NULL, NULL, '0.00', '150000.00', NULL, NULL, NULL, NULL, 'active', '(2) ชั้นกลาง', 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(386, 248, 'rule', NULL, NULL, '0.00', '250000.00', NULL, NULL, NULL, NULL, 'active', '(3) ชั้นสูง', 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(387, 249, 'overall', NULL, NULL, '0.00', NULL, '500000.00', 1, 1, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(388, 249, 'rule', NULL, NULL, '0.00', '100000.00', NULL, NULL, NULL, NULL, 'active', '(1) ชั้นต้น', 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(389, 249, 'rule', NULL, NULL, '0.00', '150000.00', NULL, NULL, NULL, NULL, 'active', '(2) ชั้นกลาง', 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(390, 249, 'rule', NULL, NULL, '0.00', '250000.00', NULL, NULL, NULL, NULL, 'active', '(3) ชั้นสูง', 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(391, 250, 'overall', NULL, NULL, '0.00', '250000.00', '250000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(392, 251, 'overall', NULL, NULL, '0.00', '400000.00', '800000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(393, 252, 'overall', NULL, NULL, '0.00', '100000.00', '300000.00', 1, 1, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(394, 253, 'overall', NULL, NULL, '0.00', NULL, '1000000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(395, 253, 'rule', NULL, NULL, '0.00', '200000.00', NULL, NULL, NULL, NULL, 'active', '(1) ชั้นต้น', 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(396, 253, 'rule', NULL, NULL, '0.00', '300000.00', NULL, NULL, NULL, NULL, 'active', '(2) ชั้นกลาง', 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(397, 253, 'rule', NULL, NULL, '0.00', '500000.00', NULL, NULL, NULL, NULL, 'active', '(3) ชั้นสูง', 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(398, 254, 'overall', NULL, NULL, '0.00', '100000.00', '100000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(399, 255, 'overall', NULL, NULL, '0.00', NULL, '500000.00', 5, 5, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(400, 255, 'rule', NULL, NULL, '0.00', '50000.00', NULL, NULL, NULL, NULL, 'active', '(1) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 1 (ลำดับ 5 % แรก) ที่สามารถสืบค้นได้ในฐานข้อมูล \r\nWOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(401, 255, 'rule', NULL, NULL, '0.00', '45000.00', NULL, NULL, NULL, NULL, 'active', '(2) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 1 (ลำดับ 10 % แรก) ที่สามารถสืบค้นได้ในฐานข้อมูล\r\nWOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(402, 255, 'rule', NULL, NULL, '0.00', '40000.00', NULL, NULL, NULL, NULL, 'active', '(3) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 1 ที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(403, 255, 'rule', NULL, NULL, '0.00', '30000.00', NULL, NULL, NULL, NULL, 'active', '(4) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 2 \r\nที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(404, 255, 'rule', NULL, NULL, '0.00', '20000.00', NULL, NULL, NULL, NULL, 'active', '(5) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 3 \r\nที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(405, 255, 'rule', NULL, NULL, '0.00', '10000.00', NULL, NULL, NULL, NULL, 'active', '(6) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 4 \r\nที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(406, 255, 'rule', NULL, NULL, '0.00', '5000.00', NULL, NULL, NULL, NULL, 'active', '(7) บทความตีพิมพ์ในวารสารระดับนานาชาติในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS หรือวารสารที่อยู่ในฐานข้อมูล TCI กลุ่มที่ 1 สาขาวิทยาศาสตร์เทคโนโลยี', 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(407, 256, 'overall', NULL, NULL, '0.00', NULL, '500000.00', 5, 5, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(408, 256, 'rule', NULL, NULL, '0.00', '50000.00', NULL, NULL, NULL, NULL, 'active', '(1) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 1 (ลำดับ 5 % แรก) ที่สามารถสืบค้นได้ในฐานข้อมูล \r\nWOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(409, 256, 'rule', NULL, NULL, '0.00', '45000.00', NULL, NULL, NULL, NULL, 'active', '(2) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 1 (ลำดับ 10 % แรก) ที่สามารถสืบค้นได้ในฐานข้อมูล\r\nWOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(410, 256, 'rule', NULL, NULL, '0.00', '40000.00', NULL, NULL, NULL, NULL, 'active', '(3) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 1 ที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(411, 256, 'rule', NULL, NULL, '0.00', '30000.00', NULL, NULL, NULL, NULL, 'active', '(4) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 2 \r\nที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(412, 256, 'rule', NULL, NULL, '0.00', '20000.00', NULL, NULL, NULL, NULL, 'active', '(5) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 3 \r\nที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(413, 256, 'rule', NULL, NULL, '0.00', '10000.00', NULL, NULL, NULL, NULL, 'active', '(6) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 4 \r\nที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(414, 256, 'rule', NULL, NULL, '0.00', '5000.00', NULL, NULL, NULL, NULL, 'active', '(7) บทความตีพิมพ์ในวารสารระดับนานาชาติในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS หรือวารสารที่อยู่ในฐานข้อมูล TCI กลุ่มที่ 1 สาขาวิทยาศาสตร์เทคโนโลยี', 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(415, 257, 'overall', NULL, NULL, '0.00', NULL, '45000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(416, 257, 'rule', NULL, NULL, '0.00', '20000.00', NULL, NULL, NULL, NULL, 'active', '(1) ระดับ A+', 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(417, 257, 'rule', NULL, NULL, '0.00', '15000.00', NULL, NULL, NULL, NULL, 'active', '(2) ระดับ A', 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(418, 257, 'rule', NULL, NULL, '0.00', '10000.00', NULL, NULL, NULL, NULL, 'active', '(3) ระดับ B', 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(419, 258, 'overall', NULL, NULL, '0.00', NULL, '25000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(420, 258, 'rule', NULL, NULL, '0.00', '15000.00', NULL, NULL, NULL, NULL, 'active', '(1) นำเสนอแบบบรรยาย ระดับนานาชาติ ในต่างประเทศ', 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(421, 258, 'rule', NULL, NULL, '0.00', '10000.00', NULL, NULL, NULL, NULL, 'active', '(2) นำเสนอแบบบรรยาย ระดับนานาชาติ ในประเทศ  (รางวัลชนะเลิศ)', 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(422, 259, 'overall', NULL, NULL, '0.00', NULL, '100000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(423, 259, 'rule', NULL, NULL, '0.00', '15000.00', NULL, NULL, NULL, NULL, 'active', '(1) ระดับเพชร', 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(424, 259, 'rule', NULL, NULL, '0.00', '10000.00', NULL, NULL, NULL, NULL, 'active', '(2) ระดับ ทอง', 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(425, 259, 'rule', NULL, NULL, '0.00', '5000.00', NULL, NULL, NULL, NULL, 'active', '(3) ระดับ เงิน', 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(426, 260, 'overall', NULL, NULL, '0.00', NULL, '15000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(427, 260, 'rule', NULL, NULL, '0.00', '10000.00', NULL, NULL, NULL, NULL, 'active', '(1) ระดับนานาชาติ (รางวัลชนะเลิศ)', 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(428, 260, 'rule', NULL, NULL, '0.00', '5000.00', NULL, NULL, NULL, NULL, 'active', '(2) ระดับชาติ (รางวัลชนะเลิศ)', 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(429, 261, 'overall', NULL, NULL, '0.00', '150000.00', '150000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(430, 262, 'overall', NULL, NULL, '0.00', NULL, '150000.00', 5, 5, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(431, 262, 'rule', NULL, NULL, '0.00', '35000.00', NULL, NULL, NULL, NULL, 'active', '(1) สิทธิบัตร (Invention patent)', 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(432, 262, 'rule', NULL, NULL, '0.00', '15000.00', NULL, NULL, NULL, NULL, 'active', '(2) อนุสิทธิบัตร (Petty patent)', 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(433, 262, 'rule', NULL, NULL, '0.00', '3000.00', NULL, NULL, NULL, NULL, 'active', '(3) ลิขสิทธิ์', 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(434, 263, 'overall', NULL, NULL, '0.00', NULL, '600000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(435, 263, 'rule', NULL, NULL, '0.00', '50000.00', NULL, NULL, NULL, NULL, 'active', '(1) ควอร์ไทล์ 1 (10% แรก)', 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(436, 263, 'rule', NULL, NULL, '0.00', '40000.00', NULL, NULL, NULL, NULL, 'active', '(1) ควอร์ไทล์ 1', 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(437, 263, 'rule', NULL, NULL, '0.00', '30000.00', NULL, NULL, NULL, NULL, 'active', '(1) ควอร์ไทล์ 2', 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(438, 264, 'overall', NULL, NULL, '0.00', '40000.00', '40000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-12 08:22:53', '2025-10-12 08:22:53', NULL),
(439, 265, 'overall', NULL, NULL, '0.00', '200000.00', '200000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(440, 266, 'overall', NULL, NULL, '0.00', '25000.00', '25000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(441, 267, 'overall', NULL, NULL, '0.00', '20000.00', '80000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(442, 268, 'overall', NULL, NULL, '0.00', '10000.00', '10000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(443, 269, 'overall', NULL, NULL, '0.00', NULL, '500000.00', 1, 1, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(444, 269, 'rule', NULL, NULL, '0.00', '100000.00', NULL, NULL, NULL, NULL, 'active', '(1) ชั้นต้น', 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(445, 269, 'rule', NULL, NULL, '0.00', '150000.00', NULL, NULL, NULL, NULL, 'active', '(2) ชั้นกลาง', 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(446, 269, 'rule', NULL, NULL, '0.00', '250000.00', NULL, NULL, NULL, NULL, 'active', '(3) ชั้นสูง', 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(447, 270, 'overall', NULL, NULL, '0.00', NULL, '500000.00', 1, 1, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(448, 270, 'rule', NULL, NULL, '0.00', '100000.00', NULL, NULL, NULL, NULL, 'active', '(1) ชั้นต้น', 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(449, 270, 'rule', NULL, NULL, '0.00', '150000.00', NULL, NULL, NULL, NULL, 'active', '(2) ชั้นกลาง', 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(450, 270, 'rule', NULL, NULL, '0.00', '250000.00', NULL, NULL, NULL, NULL, 'active', '(3) ชั้นสูง', 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(451, 271, 'overall', NULL, NULL, '0.00', '250000.00', '250000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(452, 272, 'overall', NULL, NULL, '0.00', '400000.00', '800000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(453, 273, 'overall', NULL, NULL, '0.00', '100000.00', '300000.00', 1, 1, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(454, 274, 'overall', NULL, NULL, '0.00', NULL, '1000000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(455, 274, 'rule', NULL, NULL, '0.00', '200000.00', NULL, NULL, NULL, NULL, 'active', '(1) ชั้นต้น', 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(456, 274, 'rule', NULL, NULL, '0.00', '300000.00', NULL, NULL, NULL, NULL, 'active', '(2) ชั้นกลาง', 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(457, 274, 'rule', NULL, NULL, '0.00', '500000.00', NULL, NULL, NULL, NULL, 'active', '(3) ชั้นสูง', 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(458, 275, 'overall', NULL, NULL, '0.00', '100000.00', '100000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(459, 276, 'overall', NULL, NULL, '0.00', NULL, '500000.00', 5, 5, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(460, 276, 'rule', NULL, NULL, '0.00', '50000.00', NULL, NULL, NULL, NULL, 'active', '(1) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 1 (ลำดับ 5 % แรก) ที่สามารถสืบค้นได้ในฐานข้อมูล \r\nWOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(461, 276, 'rule', NULL, NULL, '0.00', '45000.00', NULL, NULL, NULL, NULL, 'active', '(2) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 1 (ลำดับ 10 % แรก) ที่สามารถสืบค้นได้ในฐานข้อมูล\r\nWOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(462, 276, 'rule', NULL, NULL, '0.00', '40000.00', NULL, NULL, NULL, NULL, 'active', '(3) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 1 ที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(463, 276, 'rule', NULL, NULL, '0.00', '30000.00', NULL, NULL, NULL, NULL, 'active', '(4) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 2 \r\nที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(464, 276, 'rule', NULL, NULL, '0.00', '20000.00', NULL, NULL, NULL, NULL, 'active', '(5) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 3 \r\nที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(465, 276, 'rule', NULL, NULL, '0.00', '10000.00', NULL, NULL, NULL, NULL, 'active', '(6) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 4 \r\nที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(466, 276, 'rule', NULL, NULL, '0.00', '5000.00', NULL, NULL, NULL, NULL, 'active', '(7) บทความตีพิมพ์ในวารสารระดับนานาชาติในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS หรือวารสารที่อยู่ในฐานข้อมูล TCI กลุ่มที่ 1 สาขาวิทยาศาสตร์เทคโนโลยี', 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(467, 277, 'overall', NULL, NULL, '0.00', NULL, '500000.00', 5, 5, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(468, 277, 'rule', NULL, NULL, '0.00', '50000.00', NULL, NULL, NULL, NULL, 'active', '(1) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 1 (ลำดับ 5 % แรก) ที่สามารถสืบค้นได้ในฐานข้อมูล \r\nWOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(469, 277, 'rule', NULL, NULL, '0.00', '45000.00', NULL, NULL, NULL, NULL, 'active', '(2) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 1 (ลำดับ 10 % แรก) ที่สามารถสืบค้นได้ในฐานข้อมูล\r\nWOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(470, 277, 'rule', NULL, NULL, '0.00', '40000.00', NULL, NULL, NULL, NULL, 'active', '(3) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 1 ที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(471, 277, 'rule', NULL, NULL, '0.00', '30000.00', NULL, NULL, NULL, NULL, 'active', '(4) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 2 \r\nที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(472, 277, 'rule', NULL, NULL, '0.00', '20000.00', NULL, NULL, NULL, NULL, 'active', '(5) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 3 \r\nที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(473, 277, 'rule', NULL, NULL, '0.00', '10000.00', NULL, NULL, NULL, NULL, 'active', '(6) บทความตีพิมพ์ในวารสารระดับนานาชาติ ควอร์ไทล์ 4 \r\nที่สามารถสืบค้นได้ในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS', 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(474, 277, 'rule', NULL, NULL, '0.00', '5000.00', NULL, NULL, NULL, NULL, 'active', '(7) บทความตีพิมพ์ในวารสารระดับนานาชาติในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS หรือวารสารที่อยู่ในฐานข้อมูล TCI กลุ่มที่ 1 สาขาวิทยาศาสตร์เทคโนโลยี', 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(475, 278, 'overall', NULL, NULL, '0.00', NULL, '45000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(476, 278, 'rule', NULL, NULL, '0.00', '20000.00', NULL, NULL, NULL, NULL, 'active', '(1) ระดับ A+', 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(477, 278, 'rule', NULL, NULL, '0.00', '15000.00', NULL, NULL, NULL, NULL, 'active', '(2) ระดับ A', 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(478, 278, 'rule', NULL, NULL, '0.00', '10000.00', NULL, NULL, NULL, NULL, 'active', '(3) ระดับ B', 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(479, 279, 'overall', NULL, NULL, '0.00', NULL, '25000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(480, 279, 'rule', NULL, NULL, '0.00', '15000.00', NULL, NULL, NULL, NULL, 'active', '(1) นำเสนอแบบบรรยาย ระดับนานาชาติ ในต่างประเทศ', 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(481, 279, 'rule', NULL, NULL, '0.00', '10000.00', NULL, NULL, NULL, NULL, 'active', '(2) นำเสนอแบบบรรยาย ระดับนานาชาติ ในประเทศ  (รางวัลชนะเลิศ)', 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(482, 280, 'overall', NULL, NULL, '0.00', NULL, '100000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(483, 280, 'rule', NULL, NULL, '0.00', '15000.00', NULL, NULL, NULL, NULL, 'active', '(1) ระดับเพชร', 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(484, 280, 'rule', NULL, NULL, '0.00', '10000.00', NULL, NULL, NULL, NULL, 'active', '(2) ระดับ ทอง', 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(485, 280, 'rule', NULL, NULL, '0.00', '5000.00', NULL, NULL, NULL, NULL, 'active', '(3) ระดับ เงิน', 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(486, 281, 'overall', NULL, NULL, '0.00', NULL, '15000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(487, 281, 'rule', NULL, NULL, '0.00', '10000.00', NULL, NULL, NULL, NULL, 'active', '(1) ระดับนานาชาติ (รางวัลชนะเลิศ)', 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(488, 281, 'rule', NULL, NULL, '0.00', '5000.00', NULL, NULL, NULL, NULL, 'active', '(2) ระดับชาติ (รางวัลชนะเลิศ)', 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(489, 282, 'overall', NULL, NULL, '0.00', '150000.00', '150000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(490, 283, 'overall', NULL, NULL, '0.00', NULL, '150000.00', 5, 5, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(491, 283, 'rule', NULL, NULL, '0.00', '35000.00', NULL, NULL, NULL, NULL, 'active', '(1) สิทธิบัตร (Invention patent)', 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(492, 283, 'rule', NULL, NULL, '0.00', '15000.00', NULL, NULL, NULL, NULL, 'active', '(2) อนุสิทธิบัตร (Petty patent)', 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(493, 283, 'rule', NULL, NULL, '0.00', '3000.00', NULL, NULL, NULL, NULL, 'active', '(3) ลิขสิทธิ์', 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(494, 284, 'overall', NULL, NULL, '0.00', NULL, '600000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(495, 284, 'rule', NULL, NULL, '0.00', '50000.00', NULL, NULL, NULL, NULL, 'active', '(1) ควอร์ไทล์ 1 (10% แรก)', 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(496, 284, 'rule', NULL, NULL, '0.00', '40000.00', NULL, NULL, NULL, NULL, 'active', '(1) ควอร์ไทล์ 1', 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(497, 284, 'rule', NULL, NULL, '0.00', '30000.00', NULL, NULL, NULL, NULL, 'active', '(1) ควอร์ไทล์ 2', 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL),
(498, 285, 'overall', NULL, NULL, '0.00', '40000.00', '40000.00', NULL, NULL, NULL, 'active', NULL, 'ข้อมูลทุนปี 2568', '2025-10-14 12:07:22', '2025-10-14 12:07:22', NULL);

--
-- ทริกเกอร์ `subcategory_budgets`
--
DELIMITER $$
CREATE TRIGGER `bi_subcat_budget_overall` BEFORE INSERT ON `subcategory_budgets` FOR EACH ROW BEGIN
  /* overall มีได้แค่ 1 แถว/ทุนรอง */
  IF NEW.record_scope = 'overall' THEN
    IF EXISTS (
      SELECT 1 FROM subcategory_budgets
      WHERE subcategory_id = NEW.subcategory_id
        AND record_scope = 'overall'
    ) THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Each subcategory can have only one OVERALL row.';
    END IF;
  END IF;

  /* rule: ไม่ให้ใส่ yearly cap */
  IF NEW.record_scope = 'rule' THEN
    SET NEW.max_amount_per_year = NULL;
  END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `bu_subcat_budget_overall` BEFORE UPDATE ON `subcategory_budgets` FOR EACH ROW BEGIN
  /* กันการอัปเดตให้ชน overall ที่มีอยู่แล้ว */
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

  /* rule: yearly cap ต้องเป็น NULL เสมอ */
  IF NEW.record_scope = 'rule' THEN
    SET NEW.max_amount_per_year = NULL;
  END IF;
END
$$
DELIMITER ;

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
  `deleted_at` datetime DEFAULT NULL,
  `installment_number_at_submit` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- dump ตาราง `submissions`
--

INSERT INTO `submissions` (`submission_id`, `submission_type`, `submission_number`, `user_id`, `year_id`, `category_id`, `subcategory_id`, `subcategory_budget_id`, `status_id`, `submitted_at`, `reviewed_at`, `head_rejected_by`, `head_rejected_at`, `head_rejection_reason`, `head_approved_by`, `head_approved_at`, `head_comment`, `head_signature`, `admin_approved_by`, `admin_approved_at`, `admin_rejected_by`, `admin_rejected_at`, `admin_rejection_reason`, `admin_comment`, `rejected_by`, `rejected_at`, `rejection_reason`, `approved_at`, `approved_by`, `completed_at`, `closed_at`, `comment`, `created_at`, `updated_at`, `deleted_at`, `installment_number_at_submit`) VALUES
(170, 'publication_reward', 'PR-2568-0001', 8, 3, 2, 14, 19, 6, '2025-10-07 22:10:44', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-07 22:10:43', '2025-10-07 22:10:44', NULL, NULL),
(171, 'publication_reward', 'PR-2568-0002', 8, 3, 2, 14, 19, 1, '2025-10-07 22:35:42', '2025-10-07 23:35:19', NULL, NULL, NULL, 13, '2025-10-07 23:35:19', 'test comment', 'test sign', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-07 22:35:40', '2025-10-07 23:35:19', NULL, NULL),
(172, 'publication_reward', 'PR-2568-0003', 8, 3, 2, 15, 23, 6, '2025-10-07 23:33:37', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-07 23:33:37', '2025-10-07 23:33:37', NULL, NULL),
(173, 'publication_reward', 'PR-2568-0004', 8, 3, 2, 15, 34, 6, '2025-10-08 00:06:04', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-08 00:06:04', '2025-10-08 00:06:04', NULL, NULL),
(174, 'fund_application', 'FA-2568-0001', 8, 3, 15, 1, 1, 2, '2025-10-08 00:19:15', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 11, '2025-10-09 10:08:37', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-08 00:19:15', '2025-10-09 10:22:42', NULL, NULL),
(175, 'publication_reward', 'PR-2568-0005', 8, 3, 2, 15, 23, 1, '2025-10-08 10:52:10', '2025-10-09 10:11:51', NULL, NULL, NULL, 13, '2025-10-09 10:11:51', 'ฟหกฟหก', 'ฟหกฟหก', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-08 10:52:09', '2025-10-09 10:11:51', NULL, NULL),
(176, 'publication_reward', 'PR-2568-0006', 8, 3, 16, 109, 287, 2, '2025-10-09 10:14:12', '2025-10-09 10:14:37', NULL, NULL, NULL, 13, '2025-10-09 10:14:37', 'comment', 'signed', 7, '2025-10-09 10:15:30', NULL, NULL, NULL, 'admin comment', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-09 10:14:11', '2025-10-09 11:21:32', NULL, NULL),
(177, 'fund_application', 'FA-2568-0002', 8, 3, 15, 97, 258, 2, '2025-10-09 10:18:34', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 7, '2025-10-09 10:19:48', NULL, NULL, NULL, 'approve', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-09 10:18:34', '2025-10-09 10:19:48', NULL, NULL),
(178, 'publication_reward', 'PR-2568-0007', 8, 3, 16, 109, 287, 2, '2025-10-09 11:23:45', '2025-10-09 11:28:57', NULL, NULL, NULL, 13, '2025-10-09 11:28:57', 'asd', 'สมมุติ', 7, '2025-10-09 11:29:25', NULL, NULL, NULL, 'good', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-09 11:23:45', '2025-10-09 11:29:25', NULL, NULL),
(179, 'publication_reward', 'PR-2568-0008', 8, 3, 16, 109, 288, 6, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-09 12:50:53', '2025-10-09 12:50:53', NULL, NULL),
(180, 'publication_reward', 'PR-2568-0009', 8, 3, 16, 109, 291, 6, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-09 12:58:08', '2025-10-09 12:58:08', NULL, NULL),
(181, 'publication_reward', 'PR-2568-0010', 8, 3, 16, 109, 287, 6, '2025-10-09 14:23:08', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-09 13:33:51', '2025-10-09 14:23:08', NULL, NULL),
(182, 'publication_reward', 'PR-2568-0011', 8, 3, 16, 109, 287, 6, '2025-10-11 11:01:16', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-11 11:01:14', '2025-10-11 11:01:16', NULL, NULL),
(183, 'publication_reward', 'PR-2568-0012', 8, 3, 16, 109, 287, 1, '2025-10-11 12:23:22', '2025-10-11 19:31:12', NULL, NULL, NULL, 13, '2025-10-11 19:31:12', 'test comment', 'test sign', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-11 12:23:19', '2025-10-11 19:31:12', NULL, NULL),
(184, 'publication_reward', 'PR-2568-0013', 8, 3, 16, 109, 287, 1, '2025-10-11 13:26:49', '2025-10-11 19:30:16', NULL, NULL, NULL, 13, '2025-10-11 19:30:16', 'test comment', 'test sign', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-11 13:26:47', '2025-10-11 19:30:16', NULL, NULL),
(185, 'fund_application', 'FA-2568-0003', 8, 3, 15, 97, 258, 1, '2025-10-11 13:43:37', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-11 13:43:36', '2025-10-11 13:43:37', NULL, NULL),
(186, 'fund_application', 'FA-2568-0004', 8, 3, 15, 97, 258, 1, '2025-10-11 20:30:18', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-11 20:30:18', '2025-10-11 20:30:18', NULL, NULL),
(187, 'publication_reward', 'PR-2568-0014', 8, 3, 16, 109, 288, 6, '2025-10-11 20:44:35', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-11 20:44:34', '2025-10-11 20:44:35', NULL, NULL),
(188, 'fund_application', 'FA-2568-0005', 8, 3, 15, 97, 258, 1, '2025-10-11 21:17:22', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-11 21:17:22', '2025-10-11 21:17:22', NULL, NULL),
(189, 'publication_reward', 'PR-2568-0015', 8, 3, 16, 109, 289, 6, '2025-10-11 21:20:47', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-11 21:20:46', '2025-10-11 21:20:47', NULL, NULL),
(190, 'publication_reward', 'PR-2568-0016', 8, 3, 16, 109, 288, 6, '2025-10-11 21:27:02', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-11 21:27:01', '2025-10-11 21:27:02', NULL, NULL),
(191, 'fund_application', 'FA-2568-0006', 8, 3, 15, 97, 258, 1, '2025-10-11 21:59:53', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-11 21:59:53', '2025-10-11 21:59:53', NULL, NULL),
(192, 'publication_reward', 'PR-2568-0017', 8, 3, 16, 109, 287, 6, '2025-10-11 22:17:11', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-11 22:17:10', '2025-10-11 22:17:11', NULL, NULL),
(193, 'publication_reward', 'PR-2568-0018', 8, 3, 16, 109, 287, 6, '2025-10-11 22:25:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-11 22:25:00', '2025-10-11 22:25:00', NULL, NULL),
(194, 'publication_reward', 'PR-2568-0019', 8, 3, 16, 109, 287, 6, '2025-10-11 22:36:59', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-11 22:36:58', '2025-10-11 22:36:59', NULL, NULL),
(195, 'fund_application', 'FA-2568-0007', 8, 3, 15, 100, 261, 1, '2025-10-11 22:50:10', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-11 22:50:09', '2025-10-11 22:50:10', NULL, NULL),
(196, 'publication_reward', 'PR-2568-0020', 8, 3, 16, 109, 290, 6, '2025-10-11 22:55:19', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-11 22:55:18', '2025-10-11 22:55:19', NULL, NULL),
(197, 'fund_application', 'FA-2568-0008', 8, 3, 15, 98, 259, 1, '2025-10-11 23:02:21', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-11 23:02:20', '2025-10-11 23:02:21', NULL, NULL),
(198, 'publication_reward', 'PR-2568-0021', 8, 3, 16, 109, 287, 6, '2025-10-11 23:05:32', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-11 23:05:31', '2025-10-11 23:05:32', NULL, NULL),
(199, 'publication_reward', 'PR-2568-0022', 8, 3, 16, 109, 287, 6, '2025-10-11 23:12:43', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-11 23:12:42', '2025-10-11 23:12:43', NULL, NULL),
(200, 'fund_application', 'FA-2568-0009', 8, 3, 15, 97, 258, 1, '2025-10-11 23:13:01', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-11 23:13:00', '2025-10-11 23:13:01', NULL, NULL),
(201, 'fund_application', 'FA-2568-0010', 12, 3, 15, 97, 258, 6, '2025-10-11 23:29:06', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-11 23:29:05', '2025-10-11 23:29:06', NULL, NULL),
(202, 'publication_reward', 'PR-2568-0023', 8, 3, 16, 109, 287, 6, '2025-10-11 23:36:04', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-11 23:36:03', '2025-10-11 23:36:04', NULL, NULL),
(203, 'publication_reward', 'PR-2568-0024', 8, 3, 16, 109, 290, 6, '2025-10-11 23:47:44', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-11 23:47:42', '2025-10-11 23:47:44', NULL, NULL),
(204, 'publication_reward', 'PR-2568-0025', 8, 3, 16, 109, 289, 6, '2025-10-12 18:58:25', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-12 18:58:24', '2025-10-12 18:58:25', NULL, NULL),
(205, 'fund_application', 'FA-2568-0011', 8, 3, 15, 97, 258, 6, '2025-10-12 19:01:16', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-12 19:01:16', '2025-10-12 19:01:16', NULL, NULL),
(206, 'publication_reward', 'PR-2568-0026', 8, 3, 16, 109, 287, 6, '2025-10-13 12:57:41', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-13 12:57:41', '2025-10-13 12:57:41', NULL, NULL),
(207, 'publication_reward', 'PR-2568-0027', 8, 3, 16, 109, 288, 6, '2025-10-13 12:59:28', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-13 12:59:28', '2025-10-13 12:59:28', NULL, NULL),
(208, 'fund_application', 'FA-2568-0012', 8, 3, 15, 97, 258, 6, '2025-10-13 13:05:58', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-13 13:05:58', '2025-10-13 13:05:58', NULL, NULL),
(209, 'publication_reward', 'PR-2568-0028', 8, 3, 16, 109, 287, 6, '2025-10-13 13:11:15', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-13 13:11:15', '2025-10-13 13:11:15', NULL, NULL),
(210, 'publication_reward', 'PR-2568-0029', 8, 3, 16, 109, 288, 6, '2025-10-13 13:38:55', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-13 13:38:55', '2025-10-13 13:38:55', NULL, NULL),
(211, 'publication_reward', 'PR-2568-0030', 8, 3, 16, 109, 287, 6, '2025-10-13 13:39:57', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-13 13:39:57', '2025-10-13 13:39:57', NULL, NULL),
(212, 'publication_reward', 'PR-2568-0031', 8, 3, 16, 109, 288, 4, NULL, '2025-10-15 08:43:29', NULL, NULL, NULL, NULL, NULL, 'good', 'กกก', NULL, NULL, NULL, NULL, NULL, 'ต้องการเอกสารเพิ่ม', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ต้องการเอกสารเพิ่ม', '2025-10-13 14:10:18', '2025-10-15 08:43:29', NULL, 4),
(213, 'fund_application', 'FA-2568-0013', 8, 3, 15, 97, 258, 6, '2025-10-13 14:10:40', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-13 14:10:40', '2025-10-13 14:10:40', NULL, 4),
(214, 'fund_application', 'FA-2568-0014', 8, 3, 15, 97, 258, 6, '2025-10-13 14:11:23', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-13 14:11:23', '2025-10-13 14:11:23', NULL, 4),
(215, 'fund_application', 'FA-2568-0015', 13, 3, 15, 97, 258, 4, NULL, '2025-10-15 08:45:55', NULL, NULL, NULL, NULL, NULL, 'เพิ่มเอกสาร', 'asd', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'เพิ่มเอกสาร', '2025-10-14 19:44:50', '2025-10-15 08:45:55', NULL, 4),
(218, 'publication_reward', 'PR-2568-0034', 13, 3, 16, 109, 289, 5, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-14 23:10:55', '2025-10-14 23:21:51', '2025-10-14 23:21:51', NULL),
(220, 'publication_reward', 'PR-2568-0033', 13, 3, 16, 109, 292, 1, '2025-10-15 08:49:34', '2025-10-15 08:50:20', NULL, NULL, NULL, 13, '2025-10-15 08:50:20', 'ดี', 'หัวหน้า สาขา', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-15 08:49:34', '2025-10-15 08:50:20', NULL, 4),
(221, 'publication_reward', 'PR-2568-0035', 8, 3, 16, 109, 287, 4, NULL, '2025-10-15 12:25:32', NULL, NULL, NULL, NULL, NULL, 'ไฟล์น่าจะครบแล้ว', 'หัวหน้า สาขา', NULL, NULL, NULL, NULL, NULL, 'ไปใส่เอกสารเพิ่มอีก', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ไปใส่เอกสารเพิ่มอีก', '2025-10-15 12:23:32', '2025-10-15 12:25:32', NULL, 4),
(222, 'publication_reward', 'PR-2568-0036', 8, 3, 16, 109, 289, 4, NULL, '2025-10-15 14:45:10', NULL, NULL, NULL, NULL, NULL, 'ผ่าน', 'หัวหน้า สาสาขา', NULL, NULL, NULL, NULL, NULL, 'ขอไฟล์เอกสารอื่นๆเพิ่ม', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ขอไฟล์เอกสารอื่นๆเพิ่ม', '2025-10-15 14:28:04', '2025-10-15 14:45:10', NULL, 4),
(223, 'publication_reward', 'PR-2568-0037', 8, 3, 16, 109, 288, 5, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-15 14:53:36', '2025-10-15 14:53:40', NULL, NULL),
(224, 'fund_application', 'FA-2568-0016', 8, 3, 15, 97, 258, 4, NULL, '2025-10-15 15:43:28', NULL, NULL, NULL, NULL, NULL, 'asdasd', 'asd', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'asdasd', '2025-10-15 15:42:09', '2025-10-15 15:43:28', NULL, 4);

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
-- dump ตาราง `submission_documents`
--

INSERT INTO `submission_documents` (`document_id`, `submission_id`, `file_id`, `original_name`, `document_type_id`, `description`, `display_order`, `is_required`, `is_verified`, `verified_by`, `verified_at`, `created_at`) VALUES
(367, 170, 378, NULL, 2, 'form_sample.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-07 22:10:44'),
(368, 170, 379, NULL, 3, 'form_sample (1).pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-10-07 22:10:44'),
(369, 170, 380, NULL, 16, '', 3, 0, 0, NULL, NULL, '2025-10-07 22:10:44'),
(370, 171, 381, NULL, 2, 'form_sample.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-07 22:35:41'),
(371, 171, 382, NULL, 3, 'form_sample (1).pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-10-07 22:35:41'),
(372, 171, 383, NULL, 16, '', 3, 0, 0, NULL, NULL, '2025-10-07 22:35:42'),
(373, 172, 384, NULL, 2, 'sample.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-07 23:33:37'),
(374, 172, 385, NULL, 3, 'file-sample_150kB.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-10-07 23:33:37'),
(375, 172, 386, NULL, 12, 'เอกสารเบิกจ่ายภายนอก: ไม่ระบุ', 3, 0, 0, NULL, NULL, '2025-10-07 23:33:37'),
(376, 172, 387, NULL, 16, '', 4, 0, 0, NULL, NULL, '2025-10-07 23:33:37'),
(377, 171, 388, NULL, 20, '', 4, 0, 0, NULL, NULL, '2025-10-07 23:35:19'),
(378, 173, 389, NULL, 2, 'sample-local-pdf.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-08 00:06:04'),
(379, 173, 390, NULL, 3, 'sample.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-10-08 00:06:04'),
(380, 173, 391, NULL, 16, '', 3, 0, 0, NULL, NULL, '2025-10-08 00:06:04'),
(381, 174, 392, NULL, 2, 'sample-local-pdf.pdf', 1, 0, 0, NULL, NULL, '2025-10-08 00:19:15'),
(382, 174, 393, NULL, 4, 'sample-local-pdf.pdf', 3, 0, 0, NULL, NULL, '2025-10-08 00:19:15'),
(383, 174, 394, NULL, 3, 'sample-local-pdf.pdf', 2, 0, 0, NULL, NULL, '2025-10-08 00:19:15'),
(384, 175, 395, NULL, 2, 'Full Reprint.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-08 10:52:09'),
(385, 175, 396, NULL, 3, 'Scopus-ISI.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-10-08 10:52:09'),
(386, 175, 397, NULL, 5, 'Payment.pdf (ประเภท 5)', 3, 0, 0, NULL, NULL, '2025-10-08 10:52:09'),
(387, 175, 398, NULL, 7, 'Page Charge.pdf (ประเภท 7)', 4, 0, 0, NULL, NULL, '2025-10-08 10:52:09'),
(388, 175, 399, NULL, 8, 'Manuscript.pdf (ประเภท 8)', 5, 0, 0, NULL, NULL, '2025-10-08 10:52:09'),
(389, 175, 400, NULL, 11, 'เอกสารอื่นๆ 1: เอกสารอื่น ๆ.pdf', 6, 0, 0, NULL, NULL, '2025-10-08 10:52:09'),
(390, 175, 401, NULL, 12, 'เอกสารเบิกจ่ายภายนอก: ไม่ระบุ', 7, 0, 0, NULL, NULL, '2025-10-08 10:52:09'),
(391, 175, 402, NULL, 12, 'เอกสารเบิกจ่ายภายนอก: ไม่ระบุ', 8, 0, 0, NULL, NULL, '2025-10-08 10:52:09'),
(392, 175, 403, NULL, 12, 'เอกสารเบิกจ่ายภายนอก: ไม่ระบุ', 9, 0, 0, NULL, NULL, '2025-10-08 10:52:10'),
(393, 175, 404, NULL, 12, 'เอกสารเบิกจ่ายภายนอก: ไม่ระบุ', 10, 0, 0, NULL, NULL, '2025-10-08 10:52:10'),
(394, 175, 405, NULL, 16, '', 11, 0, 0, NULL, NULL, '2025-10-08 10:52:10'),
(395, 175, 406, NULL, 20, '', 12, 0, 0, NULL, NULL, '2025-10-09 10:11:51'),
(396, 176, 407, NULL, 2, 'Full Reprint.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-09 10:14:12'),
(397, 176, 408, NULL, 3, 'Scopus-ISI.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-10-09 10:14:12'),
(398, 176, 409, NULL, 16, '', 3, 0, 0, NULL, NULL, '2025-10-09 10:14:12'),
(399, 176, 410, NULL, 20, '', 4, 0, 0, NULL, NULL, '2025-10-09 10:14:37'),
(400, 177, 411, NULL, 4, 'Payment.pdf', 3, 0, 0, NULL, NULL, '2025-10-09 10:18:34'),
(401, 177, 412, NULL, 3, 'Scopus-ISI.pdf', 2, 0, 0, NULL, NULL, '2025-10-09 10:18:34'),
(402, 177, 413, NULL, 2, 'Full Reprint.pdf', 1, 0, 0, NULL, NULL, '2025-10-09 10:18:34'),
(403, 178, 414, NULL, 2, 'Full Reprint.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-09 11:23:45'),
(404, 178, 415, NULL, 3, 'Scopus-ISI.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-10-09 11:23:45'),
(405, 178, 416, NULL, 16, '', 3, 0, 0, NULL, NULL, '2025-10-09 11:23:45'),
(406, 178, 417, NULL, 20, '', 4, 0, 0, NULL, NULL, '2025-10-09 11:28:57'),
(407, 181, 419, NULL, 2, 'Full Reprint.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-09 14:23:08'),
(408, 181, 420, NULL, 3, 'Scopus-ISI.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-10-09 14:23:08'),
(409, 181, 421, NULL, 16, '', 3, 0, 0, NULL, NULL, '2025-10-09 14:23:08'),
(510, 182, 422, NULL, 2, 'form_sample.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-11 11:01:14'),
(511, 182, 423, NULL, 3, 'Final Report.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-10-11 11:01:16'),
(512, 182, 424, NULL, 16, '', 3, 0, 0, NULL, NULL, '2025-10-11 11:01:16'),
(513, 183, 425, 'form_sample.pdf', 2, 'form_sample.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-11 12:23:19'),
(514, 183, 426, 'Final Report.pdf', 3, 'Final Report.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-10-11 12:23:21'),
(515, 183, 427, 'PR-2568-0012_publication_reward_form.docx', 16, '', 3, 0, 0, NULL, NULL, '2025-10-11 12:23:22'),
(516, 184, 428, 'Full Reprint.pdf', 2, 'Full Reprint.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-11 13:26:47'),
(517, 184, 429, 'Scopus-ISI.pdf', 3, 'Scopus-ISI.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-10-11 13:26:48'),
(518, 184, 430, 'Payment.pdf', 5, 'Payment.pdf (ประเภท 5)', 3, 0, 0, NULL, NULL, '2025-10-11 13:26:48'),
(519, 184, 431, 'Page Charge.pdf', 7, 'Page Charge.pdf (ประเภท 7)', 4, 0, 0, NULL, NULL, '2025-10-11 13:26:48'),
(520, 184, 432, 'Manuscript.pdf', 8, 'Manuscript.pdf (ประเภท 8)', 5, 0, 0, NULL, NULL, '2025-10-11 13:26:48'),
(521, 184, 433, 'เอกสารอื่น ๆ.pdf', 11, 'เอกสารอื่นๆ 1: เอกสารอื่น ๆ.pdf', 6, 0, 0, NULL, NULL, '2025-10-11 13:26:48'),
(522, 184, 434, 'เอกสารอื่น ๆ.pdf', 11, 'เอกสารอื่นๆ 2: เอกสารอื่น ๆ.pdf', 7, 0, 0, NULL, NULL, '2025-10-11 13:26:48'),
(523, 184, 435, 'เอกสารอื่น ๆ 2.pdf', 11, 'เอกสารอื่นๆ 3: เอกสารอื่น ๆ 2.pdf', 8, 0, 0, NULL, NULL, '2025-10-11 13:26:48'),
(524, 184, 436, 'ExFund1.pdf', 12, 'เอกสารเบิกจ่ายภายนอก: ไม่ระบุ', 9, 0, 0, NULL, NULL, '2025-10-11 13:26:49'),
(525, 184, 437, 'ExFund2.pdf', 12, 'เอกสารเบิกจ่ายภายนอก: ไม่ระบุ', 10, 0, 0, NULL, NULL, '2025-10-11 13:26:49'),
(526, 184, 438, 'ExFund3.pdf', 12, 'เอกสารเบิกจ่ายภายนอก: ไม่ระบุ', 11, 0, 0, NULL, NULL, '2025-10-11 13:26:49'),
(527, 184, 439, 'ExFund4.pdf', 12, 'เอกสารเบิกจ่ายภายนอก: ไม่ระบุ', 12, 0, 0, NULL, NULL, '2025-10-11 13:26:49'),
(528, 184, 440, 'PR-2568-0013_publication_reward_form.docx', 16, '', 13, 0, 0, NULL, NULL, '2025-10-11 13:26:49'),
(529, 184, 441, 'PR-2568-0013_publication_reward_form.pdf', 21, '', 14, 0, 0, NULL, NULL, '2025-10-11 13:26:49'),
(530, 185, 442, 'Full Reprint.pdf', 13, 'Full Reprint.pdf', 1, 0, 0, NULL, NULL, '2025-10-11 13:43:37'),
(531, 185, 443, 'Page Charge.pdf', 14, 'Page Charge.pdf', 2, 0, 0, NULL, NULL, '2025-10-11 13:43:37'),
(532, 186, 444, 'sample.pdf', 14, 'sample.pdf', 2, 0, 0, NULL, NULL, '2025-10-11 20:30:18'),
(533, 186, 445, 'sample-local-pdf.pdf', 13, 'sample-local-pdf.pdf', 1, 0, 0, NULL, NULL, '2025-10-11 20:30:18'),
(534, 187, 446, 'Full Reprint.pdf', 2, 'Full Reprint.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-11 20:44:34'),
(535, 187, 447, 'Scopus-ISI.pdf', 3, 'Scopus-ISI.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-10-11 20:44:35'),
(536, 187, 448, 'PR-2568-0014_publication_reward_form.docx', 16, '', 3, 0, 0, NULL, NULL, '2025-10-11 20:44:35'),
(537, 187, 449, 'PR-2568-0014_publication_reward_form.pdf', 21, '', 4, 0, 0, NULL, NULL, '2025-10-11 20:44:35'),
(538, 188, 450, 'sample-local-pdf.pdf', 13, 'sample-local-pdf.pdf', 1, 0, 0, NULL, NULL, '2025-10-11 21:17:22'),
(539, 188, 451, 'sample.pdf', 14, 'sample.pdf', 2, 0, 0, NULL, NULL, '2025-10-11 21:17:22'),
(540, 189, 452, 'sample-local-pdf.pdf', 2, 'sample-local-pdf.pdf (ประเภท 2)', 1, 0, 0, NULL, NULL, '2025-10-11 21:20:47'),
(541, 189, 453, 'sample.pdf', 3, 'sample.pdf (ประเภท 3)', 2, 0, 0, NULL, NULL, '2025-10-11 21:20:47'),
(542, 189, 454, 'sample.pdf', 12, 'เอกสารเบิกจ่ายภายนอก: ไม่ระบุ', 3, 0, 0, NULL, NULL, '2025-10-11 21:20:47'),
(543, 189, 455, 'PR-2568-0015_publication_reward_form.docx', 16, '', 4, 0, 0, NULL, NULL, '2025-10-11 21:20:47'),
(544, 189, 456, 'PR-2568-0015_publication_reward_form.pdf', 21, '', 5, 0, 0, NULL, NULL, '2025-10-11 21:20:47'),
(545, 190, 457, 'Full Reprint.pdf', 2, 'Full Reprint.pdf (ประเภท 2)', 3, 0, 0, NULL, NULL, '2025-10-11 21:27:01'),
(546, 190, 458, 'Scopus-ISI.pdf', 3, 'Scopus-ISI.pdf (ประเภท 3)', 4, 0, 0, NULL, NULL, '2025-10-11 21:27:02'),
(547, 190, 459, 'PR-2568-0016_publication_reward_form.docx', 16, '', 1, 0, 0, NULL, NULL, '2025-10-11 21:27:02'),
(548, 190, 460, 'PR-2568-0016_publication_reward_form.pdf', 21, '', 2, 0, 0, NULL, NULL, '2025-10-11 21:27:02'),
(549, 191, 461, 'sample.pdf', 14, 'sample.pdf', 2, 0, 0, NULL, NULL, '2025-10-11 21:59:53'),
(550, 191, 462, 'sample-local-pdf.pdf', 13, 'sample-local-pdf.pdf', 1, 0, 0, NULL, NULL, '2025-10-11 21:59:53'),
(551, 192, 463, 'Full Reprint.pdf', 2, 'Full Reprint.pdf (ประเภท 2)', 3, 0, 0, NULL, NULL, '2025-10-11 22:17:11'),
(552, 192, 464, 'Scopus-ISI.pdf', 3, 'Scopus-ISI.pdf (ประเภท 3)', 4, 0, 0, NULL, NULL, '2025-10-11 22:17:11'),
(553, 192, 465, 'Manuscript.pdf', 8, 'Manuscript.pdf (ประเภท 8)', 5, 0, 0, NULL, NULL, '2025-10-11 22:17:11'),
(554, 192, 466, 'PR-2568-0017_publication_reward_form.docx', 16, '', 1, 0, 0, NULL, NULL, '2025-10-11 22:17:11'),
(555, 192, 467, 'PR-2568-0017_publication_reward_form.pdf', 21, '', 2, 0, 0, NULL, NULL, '2025-10-11 22:17:11'),
(556, 193, 468, 'Full Reprint.pdf', 2, 'Full Reprint.pdf (ประเภท 2)', 3, 0, 0, NULL, NULL, '2025-10-11 22:25:00'),
(557, 193, 469, 'Scopus-ISI.pdf', 3, 'Scopus-ISI.pdf (ประเภท 3)', 4, 0, 0, NULL, NULL, '2025-10-11 22:25:00'),
(558, 193, 470, 'PR-2568-0018_publication_reward_form.docx', 16, '', 1, 0, 0, NULL, NULL, '2025-10-11 22:25:00'),
(559, 193, 471, 'PR-2568-0018_publication_reward_form.pdf', 21, '', 2, 0, 0, NULL, NULL, '2025-10-11 22:25:00'),
(560, 194, 472, 'Full Reprint.pdf', 2, 'Full Reprint.pdf (ประเภท 2)', 3, 0, 0, NULL, NULL, '2025-10-11 22:36:58'),
(561, 194, 473, 'Scopus-ISI.pdf', 3, 'Scopus-ISI.pdf (ประเภท 3)', 4, 0, 0, NULL, NULL, '2025-10-11 22:36:59'),
(562, 194, 474, 'PR-2568-0019_publication_reward_form.docx', 16, '', 1, 0, 0, NULL, NULL, '2025-10-11 22:36:59'),
(563, 194, 475, 'PR-2568-0019_publication_reward_form.pdf', 21, '', 2, 0, 0, NULL, NULL, '2025-10-11 22:36:59'),
(564, 195, 476, 'sample.pdf', 14, 'sample.pdf', 2, 0, 0, NULL, NULL, '2025-10-11 22:50:09'),
(565, 195, 477, 'sample-local-pdf.pdf', 13, 'sample-local-pdf.pdf', 1, 0, 0, NULL, NULL, '2025-10-11 22:50:09'),
(566, 196, 478, 'Full Reprint.pdf', 2, 'Full Reprint.pdf (ประเภท 2)', 3, 0, 0, NULL, NULL, '2025-10-11 22:55:19'),
(567, 196, 479, 'Scopus-ISI.pdf', 3, 'Scopus-ISI.pdf (ประเภท 3)', 4, 0, 0, NULL, NULL, '2025-10-11 22:55:19'),
(568, 196, 480, 'PR-2568-0020_publication_reward_form.docx', 16, '', 1, 0, 0, NULL, NULL, '2025-10-11 22:55:19'),
(569, 196, 481, 'PR-2568-0020_publication_reward_form.pdf', 21, '', 2, 0, 0, NULL, NULL, '2025-10-11 22:55:19'),
(570, 197, 482, 'sample.pdf', 13, 'sample.pdf', 1, 0, 0, NULL, NULL, '2025-10-11 23:02:20'),
(571, 197, 483, 'sample-local-pdf.pdf', 14, 'sample-local-pdf.pdf', 2, 0, 0, NULL, NULL, '2025-10-11 23:02:20'),
(572, 198, 484, 'Full Reprint.pdf', 2, 'Full Reprint.pdf (ประเภท 2)', 3, 0, 0, NULL, NULL, '2025-10-11 23:05:31'),
(573, 198, 485, 'Scopus-ISI.pdf', 3, 'Scopus-ISI.pdf (ประเภท 3)', 4, 0, 0, NULL, NULL, '2025-10-11 23:05:31'),
(574, 198, 486, 'PR-2568-0021_publication_reward_form.docx', 16, '', 1, 0, 0, NULL, NULL, '2025-10-11 23:05:32'),
(575, 198, 487, 'PR-2568-0021_publication_reward_form.pdf', 21, '', 2, 0, 0, NULL, NULL, '2025-10-11 23:05:32'),
(576, 199, 488, 'Full Reprint.pdf', 2, 'Full Reprint.pdf (ประเภท 2)', 3, 0, 0, NULL, NULL, '2025-10-11 23:12:43'),
(577, 199, 489, 'Scopus-ISI.pdf', 3, 'Scopus-ISI.pdf (ประเภท 3)', 4, 0, 0, NULL, NULL, '2025-10-11 23:12:43'),
(578, 199, 490, 'PR-2568-0022_publication_reward_form.docx', 16, '', 1, 0, 0, NULL, NULL, '2025-10-11 23:12:43'),
(579, 199, 491, 'PR-2568-0022_publication_reward_form.pdf', 21, '', 2, 0, 0, NULL, NULL, '2025-10-11 23:12:43'),
(580, 200, 492, 'sample-local-pdf.pdf', 13, 'sample-local-pdf.pdf', 1, 0, 0, NULL, NULL, '2025-10-11 23:13:00'),
(581, 200, 493, 'sample.pdf', 14, 'sample.pdf', 2, 0, 0, NULL, NULL, '2025-10-11 23:13:00'),
(582, 201, 495, 'sample.pdf', 14, 'sample.pdf', 2, 0, 0, NULL, NULL, '2025-10-11 23:29:06'),
(583, 201, 494, 'sample-local-pdf.pdf', 13, 'sample-local-pdf.pdf', 1, 0, 0, NULL, NULL, '2025-10-11 23:29:06'),
(584, 202, 496, 'Full Reprint.pdf', 2, 'Full Reprint.pdf (ประเภท 2)', 3, 0, 0, NULL, NULL, '2025-10-11 23:36:03'),
(585, 202, 497, 'Scopus-ISI.pdf', 3, 'Scopus-ISI.pdf (ประเภท 3)', 4, 0, 0, NULL, NULL, '2025-10-11 23:36:04'),
(586, 202, 498, 'PR-2568-0023_publication_reward_form.docx', 16, '', 1, 0, 0, NULL, NULL, '2025-10-11 23:36:04'),
(587, 202, 499, 'PR-2568-0023_publication_reward_form.pdf', 21, '', 2, 0, 0, NULL, NULL, '2025-10-11 23:36:04'),
(588, 203, 500, 'Full Reprint.pdf', 2, 'Full Reprint.pdf (ประเภท 2)', 3, 0, 0, NULL, NULL, '2025-10-11 23:47:43'),
(589, 203, 501, 'Scopus-ISI.pdf', 3, 'Scopus-ISI.pdf (ประเภท 3)', 4, 0, 0, NULL, NULL, '2025-10-11 23:47:43'),
(590, 203, 502, 'PR-2568-0024_publication_reward_form.docx', 16, '', 1, 0, 0, NULL, NULL, '2025-10-11 23:47:44'),
(591, 203, 503, 'PR-2568-0024_publication_reward_form.pdf', 21, '', 2, 0, 0, NULL, NULL, '2025-10-11 23:47:44'),
(592, 204, 505, 'c4611_sample_explain.pdf', 2, 'c4611_sample_explain.pdf (ประเภท 2)', 3, 0, 0, NULL, NULL, '2025-10-12 18:58:24'),
(593, 204, 506, 'sample01.pdf', 3, 'sample01.pdf (ประเภท 3)', 4, 0, 0, NULL, NULL, '2025-10-12 18:58:24'),
(594, 204, 507, 'sample-local-pdf.pdf', 12, 'เอกสารเบิกจ่ายภายนอก: ไม่ระบุ', 5, 0, 0, NULL, NULL, '2025-10-12 18:58:24'),
(595, 204, 508, 'sample.pdf', 12, 'เอกสารเบิกจ่ายภายนอก: ไม่ระบุ', 6, 0, 0, NULL, NULL, '2025-10-12 18:58:25'),
(596, 204, 509, 'file-sample_150kB.pdf', 12, 'เอกสารเบิกจ่ายภายนอก: ไม่ระบุ', 7, 0, 0, NULL, NULL, '2025-10-12 18:58:25'),
(597, 204, 510, 'PR-2568-0025_publication_reward_form.docx', 16, '', 1, 0, 0, NULL, NULL, '2025-10-12 18:58:25'),
(598, 204, 511, 'PR-2568-0025_publication_reward_form.pdf', 21, '', 2, 0, 0, NULL, NULL, '2025-10-12 18:58:25'),
(599, 205, 513, 'sample01.pdf', 13, 'sample01.pdf', 1, 0, 0, NULL, NULL, '2025-10-12 19:01:16'),
(600, 205, 512, 'sample02.pdf', 14, 'sample02.pdf', 2, 0, 0, NULL, NULL, '2025-10-12 19:01:16'),
(601, 206, 514, 'Full Reprint.pdf', 2, 'Full Reprint.pdf (ประเภท 2)', 3, 0, 0, NULL, NULL, '2025-10-13 12:57:41'),
(602, 206, 515, 'Scopus-ISI.pdf', 3, 'Scopus-ISI.pdf (ประเภท 3)', 4, 0, 0, NULL, NULL, '2025-10-13 12:57:41'),
(603, 206, 516, 'PR-2568-0026_publication_reward_form.docx', 16, '', 1, 0, 0, NULL, NULL, '2025-10-13 12:57:41'),
(604, 206, 517, 'PR-2568-0026_publication_reward_form.pdf', 21, '', 2, 0, 0, NULL, NULL, '2025-10-13 12:57:41'),
(605, 207, 519, 'Full Reprint.pdf', 2, 'Full Reprint.pdf (ประเภท 2)', 3, 0, 0, NULL, NULL, '2025-10-13 12:59:28'),
(606, 207, 520, 'Scopus-ISI.pdf', 3, 'Scopus-ISI.pdf (ประเภท 3)', 4, 0, 0, NULL, NULL, '2025-10-13 12:59:28'),
(607, 207, 521, 'PR-2568-0027_publication_reward_form.docx', 16, '', 1, 0, 0, NULL, NULL, '2025-10-13 12:59:28'),
(608, 207, 522, 'PR-2568-0027_publication_reward_form.pdf', 21, '', 2, 0, 0, NULL, NULL, '2025-10-13 12:59:28'),
(609, 208, 524, 'ExFund3.pdf', 14, 'ExFund3.pdf', 1, 0, 0, NULL, NULL, '2025-10-13 13:05:58'),
(610, 208, 525, 'Full Reprint.pdf', 13, 'Full Reprint.pdf', 1, 0, 0, NULL, NULL, '2025-10-13 13:05:58'),
(611, 209, 527, 'Full Reprint.pdf', 2, 'Full Reprint.pdf (ประเภท 2)', 3, 0, 0, NULL, NULL, '2025-10-13 13:11:15'),
(612, 209, 528, 'Scopus-ISI.pdf', 3, 'Scopus-ISI.pdf (ประเภท 3)', 4, 0, 0, NULL, NULL, '2025-10-13 13:11:15'),
(613, 209, 529, 'PR-2568-0028_publication_reward_form.docx', 16, '', 1, 0, 0, NULL, NULL, '2025-10-13 13:11:15'),
(614, 209, 530, 'PR-2568-0028_publication_reward_form.pdf', 21, '', 2, 0, 0, NULL, NULL, '2025-10-13 13:11:15'),
(615, 210, 532, 'Full Reprint.pdf', 2, 'Full Reprint.pdf (ประเภท 2)', 3, 0, 0, NULL, NULL, '2025-10-13 13:38:55'),
(616, 210, 533, 'Scopus-ISI.pdf', 3, 'Scopus-ISI.pdf (ประเภท 3)', 4, 0, 0, NULL, NULL, '2025-10-13 13:38:55'),
(617, 210, 534, 'PR-2568-0029_publication_reward_form.docx', 16, '', 1, 0, 0, NULL, NULL, '2025-10-13 13:38:55'),
(618, 210, 535, 'PR-2568-0029_publication_reward_form.pdf', 21, '', 2, 0, 0, NULL, NULL, '2025-10-13 13:38:55'),
(619, 211, 537, 'Full Reprint.pdf', 2, 'Full Reprint.pdf (ประเภท 2)', 3, 0, 0, NULL, NULL, '2025-10-13 13:39:57'),
(620, 211, 538, 'Scopus-ISI.pdf', 3, 'Scopus-ISI.pdf (ประเภท 3)', 4, 0, 0, NULL, NULL, '2025-10-13 13:39:57'),
(621, 211, 539, 'PR-2568-0030_publication_reward_form.docx', 16, '', 1, 0, 0, NULL, NULL, '2025-10-13 13:39:57'),
(622, 211, 540, 'PR-2568-0030_publication_reward_form.pdf', 21, '', 2, 0, 0, NULL, NULL, '2025-10-13 13:39:57'),
(623, 212, 542, 'Full Reprint.pdf', 2, 'Full Reprint.pdf (ประเภท 2)', 3, 0, 0, NULL, NULL, '2025-10-13 14:10:18'),
(624, 212, 543, 'Scopus-ISI.pdf', 3, 'Scopus-ISI.pdf (ประเภท 3)', 4, 0, 0, NULL, NULL, '2025-10-13 14:10:18'),
(625, 212, 544, 'PR-2568-0031_publication_reward_form.docx', 16, '', 1, 0, 0, NULL, NULL, '2025-10-13 14:10:18'),
(626, 212, 545, 'PR-2568-0031_publication_reward_form.pdf', 21, '', 2, 0, 0, NULL, NULL, '2025-10-13 14:10:18'),
(627, 215, 548, 'sample01.pdf', 13, 'sample01.pdf', 1, 0, 0, NULL, NULL, '2025-10-14 19:49:23'),
(628, 215, 547, 'sample02.pdf', 14, 'sample02.pdf', 2, 0, 0, NULL, NULL, '2025-10-14 19:49:23'),
(629, 220, 550, 'sample-local-pdf.pdf', 2, 'sample-local-pdf.pdf (ประเภท 2)', 3, 0, 0, NULL, NULL, '2025-10-15 08:49:34'),
(630, 220, 551, 'sample04.pdf', 3, 'sample04.pdf (ประเภท 3)', 4, 0, 0, NULL, NULL, '2025-10-15 08:49:34'),
(631, 220, 552, 'PR-2568-0033_publication_reward_form.docx', 16, '', 1, 0, 0, NULL, NULL, '2025-10-15 08:49:34'),
(632, 220, 553, 'PR-2568-0033_publication_reward_form.pdf', 21, '', 2, 0, 0, NULL, NULL, '2025-10-15 08:49:34'),
(633, 221, 555, 'sample03.pdf', 2, 'Full Reprint (บทความตีพิมพ์)', 3, 0, 0, NULL, NULL, '2025-10-15 12:23:33'),
(634, 221, 556, 'sample02.pdf', 3, 'Scopus-ISI (หลักฐานการจัดอันดับ)', 4, 0, 0, NULL, NULL, '2025-10-15 12:23:33'),
(635, 221, 557, 'sample01.pdf', 12, 'เอกสารเบิกจ่ายภายนอก', 5, 0, 0, NULL, NULL, '2025-10-15 12:23:33'),
(636, 221, 558, 'sample.pdf', 12, 'เอกสารเบิกจ่ายภายนอก', 6, 0, 0, NULL, NULL, '2025-10-15 12:23:33'),
(637, 221, 559, 'PR-2568-0035_publication_reward_form.docx', 16, '', 1, 0, 0, NULL, NULL, '2025-10-15 12:23:33'),
(638, 221, 560, 'PR-2568-0035_publication_reward_form.pdf', 21, '', 2, 0, 0, NULL, NULL, '2025-10-15 12:23:33'),
(639, 222, 562, 'sample-local-pdf.pdf', 2, 'sample-local-pdf.pdf (ประเภท 2)', 3, 0, 0, NULL, NULL, '2025-10-15 14:28:05'),
(640, 222, 563, 'sample04.pdf', 3, 'sample04.pdf (ประเภท 3)', 4, 0, 0, NULL, NULL, '2025-10-15 14:28:05'),
(641, 222, 564, 'sample03.pdf', 11, 'เอกสารอื่นๆ 1: sample03.pdf', 5, 0, 0, NULL, NULL, '2025-10-15 14:28:05'),
(642, 222, 565, 'sample02.pdf', 12, 'เอกสารเบิกจ่ายภายนอก: ทุนจากมก', 6, 0, 0, NULL, NULL, '2025-10-15 14:28:05'),
(643, 222, 566, 'sample01.pdf', 12, 'เอกสารเบิกจ่ายภายนอก: ทุนจากมข', 7, 0, 0, NULL, NULL, '2025-10-15 14:28:05'),
(644, 222, 567, 'PR-2568-0036_publication_reward_form.docx', 16, '', 1, 0, 0, NULL, NULL, '2025-10-15 14:28:05'),
(645, 222, 568, 'PR-2568-0036_publication_reward_form.pdf', 21, '', 2, 0, 0, NULL, NULL, '2025-10-15 14:28:05'),
(646, 224, 570, 'sample.pdf', 13, 'sample.pdf', 1, 0, 0, NULL, NULL, '2025-10-15 15:42:09'),
(647, 224, 571, 'sample01.pdf', 14, 'sample01.pdf', 2, 0, 0, NULL, NULL, '2025-10-15 15:42:09');

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
(225, 170, 8, 'owner', 1, 1, '2025-10-07 22:10:43'),
(226, 171, 8, 'owner', 1, 1, '2025-10-07 22:35:41'),
(227, 172, 8, 'owner', 1, 1, '2025-10-07 23:33:37'),
(228, 172, 12, 'coauthor', 0, 2, '2025-10-07 23:33:37'),
(229, 173, 8, 'owner', 1, 1, '2025-10-08 00:06:04'),
(230, 173, 9, 'coauthor', 0, 2, '2025-10-08 00:06:04'),
(231, 173, 1, 'coauthor', 0, 3, '2025-10-08 00:06:04'),
(232, 175, 8, 'owner', 1, 1, '2025-10-08 10:52:09'),
(233, 175, 1, 'coauthor', 0, 2, '2025-10-08 10:52:09'),
(234, 176, 8, 'owner', 1, 1, '2025-10-09 10:14:12'),
(235, 178, 8, 'owner', 1, 1, '2025-10-09 11:23:45'),
(236, 179, 8, 'owner', 1, 1, '2025-10-09 12:50:53'),
(237, 180, 8, 'owner', 1, 1, '2025-10-09 12:58:08'),
(238, 180, 9, 'coauthor', 0, 2, '2025-10-09 12:58:08'),
(239, 181, 8, 'owner', 1, 1, '2025-10-09 13:33:51'),
(240, 182, 8, 'owner', 1, 1, '2025-10-11 11:01:14'),
(241, 183, 8, 'owner', 1, 1, '2025-10-11 12:23:19'),
(242, 184, 8, 'owner', 1, 1, '2025-10-11 13:26:47'),
(243, 187, 8, 'owner', 1, 1, '2025-10-11 20:44:34'),
(244, 189, 8, 'owner', 1, 1, '2025-10-11 21:20:46'),
(245, 189, 1, 'coauthor', 0, 2, '2025-10-11 21:20:46'),
(246, 190, 8, 'owner', 1, 1, '2025-10-11 21:27:01'),
(247, 192, 8, 'owner', 1, 1, '2025-10-11 22:17:11'),
(248, 193, 8, 'owner', 1, 1, '2025-10-11 22:25:00'),
(249, 194, 8, 'owner', 1, 1, '2025-10-11 22:36:58'),
(250, 196, 8, 'owner', 1, 1, '2025-10-11 22:55:18'),
(251, 198, 8, 'owner', 1, 1, '2025-10-11 23:05:31'),
(252, 199, 8, 'owner', 1, 1, '2025-10-11 23:12:43'),
(253, 202, 8, 'owner', 1, 1, '2025-10-11 23:36:03'),
(254, 203, 8, 'owner', 1, 1, '2025-10-11 23:47:43'),
(255, 204, 8, 'owner', 1, 1, '2025-10-12 18:58:24'),
(256, 204, 1, 'coauthor', 0, 2, '2025-10-12 18:58:24'),
(257, 204, 12, 'coauthor', 0, 3, '2025-10-12 18:58:24'),
(258, 206, 8, 'owner', 1, 1, '2025-10-13 12:57:41'),
(259, 207, 8, 'owner', 1, 1, '2025-10-13 12:59:28'),
(260, 209, 8, 'owner', 1, 1, '2025-10-13 13:11:15'),
(261, 210, 8, 'owner', 1, 1, '2025-10-13 13:38:55'),
(262, 211, 8, 'owner', 1, 1, '2025-10-13 13:39:57'),
(263, 212, 8, 'owner', 1, 1, '2025-10-13 14:10:18'),
(267, 218, 1, 'coauthor', 0, 2, '2025-10-14 23:10:55'),
(268, 218, 12, 'coauthor', 0, 3, '2025-10-14 23:10:55'),
(271, 220, 13, 'owner', 1, 1, '2025-10-15 08:49:34'),
(272, 220, 8, 'coauthor', 0, 2, '2025-10-15 08:49:34'),
(273, 221, 8, 'owner', 1, 1, '2025-10-15 12:23:32'),
(274, 221, 1, 'coauthor', 0, 2, '2025-10-15 12:23:32'),
(275, 221, 9, 'coauthor', 0, 3, '2025-10-15 12:23:32'),
(276, 222, 8, 'owner', 1, 1, '2025-10-15 14:28:04'),
(277, 222, 1, 'coauthor', 0, 2, '2025-10-15 14:28:04'),
(278, 222, 9, 'coauthor', 0, 3, '2025-10-15 14:28:04'),
(280, 223, 1, 'coauthor', 0, 2, '2025-10-15 14:53:40');

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
(1, '1.0.0', '2025-10-13 17:49:31', 7, '2568', '2025-08-29 21:01:00', '2025-10-16 10:00:00', 8, 2, 13, 16, 12, '2568', 5);

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
-- dump ตาราง `users`
--

INSERT INTO `users` (`user_id`, `user_fname`, `user_lname`, `gender`, `email`, `scholar_author_id`, `password`, `role_id`, `position_id`, `date_of_employment`, `create_at`, `update_at`, `delete_at`, `prefix`, `manage_position`, `position`, `position_en`, `prefix_position_en`, `Name_en`, `suffix_en`, `TEL`, `TELformat`, `TEL_ENG`, `manage_position_en`, `LAB_Name`, `Room`, `CP_WEB_ID`, `Scopus_id`, `Is_active`) VALUES
(1, 'Somchai', 'Suwan', 'male', 'somchai@example.com', NULL, '$2a$10$LCtvqEswW1dTIOwJdTrvZuFmQF61aepTdC9HgI78UdnuyVJs3pxIm', 1, 1, NULL, '2025-06-24 16:49:13', '2025-07-02 22:02:51', NULL, 'รศ. ดร.', '', 'รองศาสตราจารย์', 'Associate Professor', 'Assoc. Prof.', 'ngamnij arch-int', 'Ph.D.', '089-6222316', '08 9622 2316', '+668 9622 2316', '', 'Applied Intelligence and Data Analytics (AIDA) Lab', '', 'https://computing.kku.ac.th/ngamnij.arch-int', NULL, 'A'),
(2, 'Suda', 'Kong', 'female', 'suda@example.com', NULL, '$2a$10$.UeSuOiuMSwJRwZyxplaSOd7DsD/q/0S7zozjFWGP9F2Dm1ZCN8rK', 2, 3, NULL, '2025-06-24 16:49:13', '2025-07-02 22:02:51', NULL, 'ผศ. ดร.', '', 'ผู้ช่วยศาสตราจารย์', 'Assistant Professor', 'Asst. Prof.', 'pusadee seresangtakul', 'Ph.D.', '080-4140401', '08 0414 0401', '+668 0414 0401', '', 'Natural Language and Speech Processing Lab (NLSP)', '', 'https://computing.kku.ac.th/pusadee.seresangtakul', NULL, 'A'),
(7, 'ผู้ดูแล', 'ระบบ', 'male', 'kitsanapong.p@kkumail.com', NULL, '$2a$10$f8kTbCx57o6gCNItJMUczeTmwPK1TUudS85U.wF6keW2cAVApjYN6', 3, 3, NULL, '2025-07-31 17:52:45', '2025-07-31 17:52:45', NULL, 'รศ. ดร.', 'คณบดี', 'รองศาสตราจารย์', 'Associate Professor', 'Assoc. Prof.', 'sirapat chiewchanwattana', 'Ph.D.', '086-8509784', '08 6850 9784', '+668 6850 9784', '', 'Advanced Smart Computing (ASC) Lab', '', 'https://computing.kku.ac.th/sirapat.chiewchanwattana', NULL, 'A'),
(8, 'สมชาย', 'ใจดี', 'male', 'aum.kitsanapong@gmail.com', '_lza5VIAAAAJ', '$2a$10$sPaTxAZ.Bp4fxHGBg.awZ.a5jq72uWXeRAQHLK.3LTluhNoliaRYG', 1, 1, '2025-09-17', '2025-07-31 17:52:46', '2025-07-31 17:52:46', NULL, 'ผศ.', '', 'ผู้ช่วยศาสตราจารย์', 'Assistant Professor', 'Asst. Prof.', 'Somchai Jaidee', '', '080-7668868', '08 0766 8868', '+668 0766 8868', '', '', '', 'https://computing.kku.ac.th/boonsup.waikham', NULL, 'A'),
(9, 'สมหญิง', 'รักการศึกษา', 'female', 'teacher2@cpkku.ac.th', '_XXXXXXXXXXZ', '$2a$10$mgxuR9pZ5HfndfDoHd/ZquUQYAKztvxZBpT417iX05TLOC.axULf2', 1, 2, NULL, '2025-07-31 17:52:46', '2025-07-31 17:52:46', NULL, 'ผศ. ดร.', '', 'ผู้ช่วยศาสตราจารย์', 'Assistant Professor', 'Asst. Prof.', 'urawan chanket', 'Ph.D.', '087-6780595', '08 7678 0595', '+668 7678 0595', '', 'Geo-informatics, NEGISTDA', '', 'https://computing.kku.ac.th/urawan.chanket', NULL, 'A'),
(10, 'สุดา', 'ช่วยเหลือ', 'female', 'staff@cpkku.ac.th', NULL, '$2a$10$Df2y47XVO7Eugd/DLXJSAuIqXktScmsvhTSRzANBQzqSOCmuPSi1C', 2, 3, NULL, '2025-07-31 17:52:46', '2025-07-31 17:52:46', NULL, 'รศ. ดร.', '', 'ผู้ช่วยศาสตราจารย์', 'Assistant Professor', 'Asst. Prof.', 'wararat songpan', 'Ph.D.', '080-4111279', '08 0411 1279', '+668 0411 1279', '', 'Applied Intelligence and Data Analytics (AIDA) Lab', '', 'https://computing.kku.ac.th/wararat.songpan', NULL, 'A'),
(11, 'ผู้ดูแล', 'ระบบ', 'male', 'admin@cpkku.ac.th', NULL, '$2a$10$JL5vSA37ApBjYy8Yn3dzd.JznwUc4PvU7BWw1HvG4Er5hfuJ8ypxO', 3, 3, NULL, '2025-09-22 14:48:29', '2025-09-22 14:48:29', NULL, 'รศ. ดร.', '', 'รองศาสตราจารย์', 'Associate Professor', 'Assoc. Prof.', 'chaiyapon keeratikasikorn', 'Ph.D.', '084-6499463', '08 4649 9463', '+668 4649 9463', '', '', '', 'https://computing.kku.ac.th/chaiyapon.keeratikasikorn', NULL, 'A'),
(12, 'สมหมาย', 'จันทร์', 'male', 'teacher@cpkku.ac.th', NULL, '$2a$10$6ZjpWSb79tlPLB4YViD/aet//OVVG2MigdyHqIrNX.RXyA6UVUaf.', 1, 1, '2025-09-16', '2025-09-22 14:48:29', '2025-09-22 14:48:29', NULL, 'ผศ. ดร.', '', 'ผู้ช่วยศาสตราจารย์', 'Assistant Professor', 'Asst. Prof.', 'paweena wanchai', 'Ph.D.', '087-6926662', '08 7692 6662', '+668 7692 6662', '', 'Applied Intelligence and Data Analytics (AIDA) Lab', 'SC9332', 'https://computing.kku.ac.th/paweena.wanchai', NULL, 'A'),
(13, 'หัวหน้า', 'สาขา', 'female', 'depthead@cpkku.ac.th', NULL, '$2a$10$1med.YpeDE7LdwkGyGgUo.6M9gg9TdRVQXioesRxWU0yz58uQuLna', 4, 3, '2025-10-07', '2025-09-22 14:48:30', '2025-09-22 14:48:30', NULL, 'ผศ. ดร.', '', 'ผู้ช่วยศาสตราจารย์', 'Assistant Professor', 'Asst. Prof.', 'silada intarasothonchun', 'Ph.D.', '094-2842356', '09 4284 2356', '+669 4284 2356', '', '', '', 'https://computing.kku.ac.th/silada.intarasothonchun', NULL, 'A'),
(14, 'งามนิจ', 'อาจอินทร์', NULL, 'ngamnij@kku.ac.th', NULL, '$2a$10$4HpKnGcQlio9Xq4t8E8oSeNxxM6RSD9JmlmfoMSn/mLNJHjStXR5i', NULL, NULL, NULL, '2025-10-04 14:20:56', '2025-10-04 21:44:37', NULL, 'นาง', 'อาจารย์', 'บุคลากร', 'Staff', '', 'งามนิจ อาจอินทร์', NULL, '0815181358', '081-518-1358', '0817421274', 'Lecturer', 'Network Lab', 'อาคารวิศวะ 410', 'CP00014', 'SCOPUS00172830', 'A'),
(15, 'พุธษดี', 'ศิริแสงตระกูล', NULL, 'pusadee@kku.ac.th', NULL, '$2a$10$F3qwnLPaO64NO7323ws.I.RvBxutz/5ZeUS2hsdijOeOB.3JdFK9G', NULL, NULL, NULL, '2025-10-04 14:24:21', '2025-10-04 21:44:37', NULL, 'นางสาว', 'อาจารย์', 'บุคลากร', 'Staff', '', 'พุธษดี ศิริแสงตระกูล', 'Ph.D.', '0815551455', '081-555-1455', '0817951365', 'Lecturer', 'Robotics Lab', 'อาคารวิศวะ 201', 'CP00015', NULL, 'A'),
(16, 'อุรฉัตร', 'โคแก้ว', NULL, 'urachart@kku.ac.th', NULL, '$2a$10$gt3NS.KR4GdSSIbWfm7W4O4hJoxf1JOy0a6lnjoOd96A0IjzbR68u', NULL, NULL, NULL, '2025-10-04 14:25:03', '2025-10-04 21:44:37', NULL, 'นาง', 'อาจารย์', 'บุคลากร', 'Staff', '', 'อุรฉัตร โคแก้ว', NULL, '0815921552', '081-592-1552', '0818481456', 'Lecturer', 'Software Engineering Lab', 'อาคารวิศวะ 305', 'CP00016', 'SCOPUS00197520', 'A'),
(17, 'ปัญญาพล', 'หอระตะ', NULL, 'punhor1@kku.ac.th', NULL, '$2a$10$YH4cHc.e5j9AfQuCu4u33.AsKpzJRRwmrVoDUul71oI0N7X8aYKri', NULL, NULL, NULL, '2025-10-04 14:26:29', '2025-10-04 21:44:37', NULL, 'นางสาว', 'อาจารย์', 'บุคลากร', 'Staff', '', 'ปัญญาพล หอระตะ', NULL, '0816291649', '081-629-1649', '0819011547', 'Lecturer', 'AI & Data Lab', 'อาคารวิศวะ 410', 'CP00017', NULL, 'A'),
(18, 'วชิราวุธ', 'ธรรมวิเศษ', NULL, 'twachi@kku.ac.th', NULL, '$2a$10$Rfl7ah0DiSifSPpySSP/nOeAMc2GYMDMJTDaSFZTmdd2JVEugnU/m', NULL, NULL, NULL, '2025-10-04 14:27:25', '2025-10-04 21:44:37', NULL, 'นาง', 'อาจารย์', 'บุคลากร', 'Staff', '', 'วชิราวุธ ธรรมวิเศษ', 'Ph.D.', '0816661746', '081-666-1746', '0819541638', 'Lecturer', 'Network Lab', 'อาคารวิศวะ 201', 'CP00018', 'SCOPUS00222210', 'A'),
(19, 'สุมณฑา', 'เกษมวิลาศ', NULL, 'sumkas@kku.ac.th', NULL, '$2a$10$16f.A.sumDui2.QtSOhUceM1qMiQJco9rRe1a6XR/zAJuPs0l0CdW', NULL, NULL, NULL, '2025-10-04 14:27:55', '2025-10-04 21:44:37', NULL, 'นางสาว', 'อาจารย์', 'บุคลากร', 'Staff', '', 'สุมณฑา เกษมวิลาศ', NULL, '0817031843', '081-703-1843', '0810071729', 'Lecturer', 'Robotics Lab', 'อาคารวิศวะ 305', 'CP00019', NULL, 'A'),
(20, 'สิรภัทร', 'เชี่ยวชาญวัฒนา', NULL, 'sunkra@kku.ac.th', NULL, '$2a$10$eOV7Pb5brWREiOUyqeNI5OxypcmuBCIE9yelkiuFLLLVGzm8c1LKa', NULL, NULL, NULL, '2025-10-04 14:28:25', '2025-10-04 21:44:38', NULL, 'นาง', 'อาจารย์', 'บุคลากร', 'Staff', '', 'สิรภัทร เชี่ยวชาญวัฒนา', NULL, '0817401940', '081-740-1940', '0810601820', 'Lecturer', 'Software Engineering Lab', 'อาคารวิศวะ 410', 'CP00020', 'SCOPUS00246900', 'A'),
(21, 'บุญทรัพย์', 'ไวคำ', NULL, 'boonsup@kku.ac.th', NULL, '$2a$10$gN1vou53vKzXpZMrRdFAO.8Bd7yqW4QXG0oGrIYUWHomqpQQFltJC', NULL, NULL, NULL, '2025-10-04 14:29:07', '2025-10-04 21:44:38', NULL, 'นางสาว', 'อาจารย์', 'บุคลากร', 'Staff', '', 'บุญทรัพย์ ไวคำ', 'Ph.D.', '0817772037', '081-777-2037', '0811131911', 'Lecturer', 'AI & Data Lab', 'อาคารวิศวะ 201', 'CP00021', NULL, 'A'),
(22, 'อุราวรรณ', 'จันทร์เกษ', NULL, 'curawa@kku.ac.th', NULL, '$2a$10$kNHO/RTh87Kid2XjQB7gleufj9rafR6v72uolmICXtwmPWPY5IsZ2', NULL, NULL, NULL, '2025-10-04 14:29:42', '2025-10-04 21:44:38', NULL, 'นาง', 'อาจารย์', 'บุคลากร', 'Staff', '', 'อุราวรรณ จันทร์เกษ', NULL, '0818142134', '081-814-2134', '0811662002', 'Lecturer', 'Network Lab', 'อาคารวิศวะ 305', 'CP00022', 'SCOPUS00271590', 'A'),
(23, 'วรารัตน์', 'สงฆ์แป้น', NULL, 'wararat@kku.ac.th', NULL, '$2a$10$UIth2oqd4suiB7sQLACpd.EKR4YzVQmvmtUwyhAauj9xed5Rod2ji', NULL, NULL, NULL, '2025-10-04 14:30:58', '2025-10-04 21:44:38', NULL, 'นางสาว', 'อาจารย์', 'บุคลากร', 'Staff', '', 'วรารัตน์ สงฆ์แป้น', NULL, '0818512231', '081-851-2231', '0812192093', 'Lecturer', 'Robotics Lab', 'อาคารวิศวะ 410', 'CP00023', NULL, 'A'),
(24, 'ชัยพล', 'กีรติกสิกร', NULL, 'chaiyapon@kku.ac.th', NULL, '$2a$10$Vkf67vJ3wPTMPCEVn8iXW.28g/lLbWf.vTvIaJ3Phod6KOorDaxWy', NULL, NULL, NULL, '2025-10-04 14:31:42', '2025-10-04 21:44:38', NULL, 'นาง', 'อาจารย์', 'บุคลากร', 'Staff', '', 'ชัยพล กีรติกสิกร', 'Ph.D.', '0818882328', '081-888-2328', '0812722184', 'Lecturer', 'Software Engineering Lab', 'อาคารวิศวะ 201', 'CP00024', 'SCOPUS00296280', 'A'),
(25, 'ปวีณา', 'วันชัย', NULL, 'wpaweena@kku.ac.th', NULL, '$2a$10$mKshyMlPVYbLuPmmAQrBjeDaYfQJDmfyd43j35y5k2fO4KquDpFbe', NULL, NULL, NULL, '2025-10-04 14:31:51', '2025-10-04 21:44:38', NULL, 'นางสาว', 'อาจารย์', 'บุคลากร', 'Staff', '', 'ปวีณา วันชัย', NULL, '0819252425', '081-925-2425', '0813252275', 'Lecturer', 'AI & Data Lab', 'อาคารวิศวะ 305', 'CP00025', NULL, 'A'),
(26, 'สิลดา', 'อินทรโสธรฉันท์', NULL, 'silain@kku.ac.th', NULL, '$2a$10$Upk6PJD7RQ8Lbe4AW7EsDOIReU0G27kzorl6GwY4XjPETD10lYHv6', NULL, NULL, NULL, '2025-10-04 14:34:20', '2025-10-04 21:44:38', NULL, 'นาง', 'อาจารย์', 'บุคลากร', 'Staff', '', 'สิลดา อินทรโสธรฉันท์', NULL, '0819622522', '081-962-2522', '0813782366', 'Lecturer', 'Network Lab', 'อาคารวิศวะ 410', 'CP00026', 'SCOPUS00320970', 'A'),
(27, 'ณกร', 'วัฒนกิจ', NULL, 'nagon@kku.ac.th', NULL, '$2a$10$P1MwvheKfRo4iErtP134de64aHX9m94T49Q.M.TijSu5CZKLIqH06', NULL, NULL, NULL, '2025-10-04 14:35:06', '2025-10-04 21:44:39', NULL, 'นางสาว', 'อาจารย์', 'บุคลากร', 'Staff', '', 'ณกร วัฒนกิจ', 'Ph.D.', '0819992619', '081-999-2619', '0814312457', 'Lecturer', 'Robotics Lab', 'อาคารวิศวะ 201', 'CP00027', NULL, 'A'),
(28, 'มัลลิกา', 'วัฒนะ', NULL, 'monlwa@kku.ac.th', NULL, '$2a$10$EUJI5fYeXQRJHCfCououquVyjNhzaKU5aVEjUq9PZXWPUMeYX0JnS', NULL, NULL, NULL, '2025-10-04 14:35:29', '2025-10-04 21:44:39', NULL, 'นาง', 'อาจารย์', 'บุคลากร', 'Staff', '', 'มัลลิกา วัฒนะ', NULL, '0810362716', '081-036-2716', '0814842548', 'Lecturer', 'Software Engineering Lab', 'อาคารวิศวะ 305', 'CP00028', 'SCOPUS00345660', 'A'),
(29, 'สายยัญ', 'สายยศ', NULL, 'saiyan@kku.ac.th', NULL, '$2a$10$pOpwercKvW0gTdAoAArqGeX1P7Oq5WH6VQTnvddMrZalcTI/WGs5S', NULL, NULL, NULL, '2025-10-04 14:36:06', '2025-10-04 21:44:39', NULL, 'นางสาว', 'อาจารย์', 'บุคลากร', 'Staff', '', 'สายยัญ สายยศ', NULL, '0810732813', '081-073-2813', '0815372639', 'Lecturer', 'AI & Data Lab', 'อาคารวิศวะ 410', 'CP00029', NULL, 'A'),
(30, 'พิพัธน์', 'เรืองแสง', NULL, 'reungsang@kku.ac.th', NULL, '$2a$10$eG6l1jgJss8aFjsn24/xMuIcA17VxOA6ERw0xDLmfipPtGtDhsECO', NULL, NULL, NULL, '2025-10-04 14:36:40', '2025-10-04 21:44:39', NULL, 'นาง', 'อาจารย์', 'บุคลากร', 'Staff', '', 'พิพัธน์ เรืองแสง', 'Ph.D.', '0811102910', '081-110-2910', '0815902730', 'Lecturer', 'Network Lab', 'อาคารวิศวะ 201', 'CP00030', 'SCOPUS00370350', 'A'),
(31, 'จักรชัย', 'โสอินทร์', NULL, 'chakso@kku.ac.th', NULL, '$2a$10$kJkP/00IfgBTBclihYY6reTBAye9fb6JNTBVkAaprN.nP5RJZUddO', NULL, NULL, NULL, '2025-10-04 14:37:11', '2025-10-04 21:44:39', NULL, 'นางสาว', 'อาจารย์', 'บุคลากร', 'Staff', '', 'จักรชัย โสอินทร์', NULL, '0811473007', '081-147-3007', '0816432821', 'Lecturer', 'Robotics Lab', 'อาคารวิศวะ 305', 'CP00031', NULL, 'A'),
(32, 'คำรณ', 'สุนัติ', NULL, 'skhamron@kku.ac.th', NULL, '$2a$10$RXDT8JgbvfAIQxBhzeBfQeG3HGjau7KhFgUO1AsHtn3gtLbDFN25.', NULL, NULL, NULL, '2025-10-04 14:37:59', '2025-10-04 21:44:39', NULL, 'นาง', 'อาจารย์', 'บุคลากร', 'Staff', '', 'คำรณ สุนัติ', NULL, '0811843104', '081-184-3104', '0816962912', 'Lecturer', 'Software Engineering Lab', 'อาคารวิศวะ 410', 'CP00032', 'SCOPUS00395040', 'A'),
(33, 'ชิตสุธา', 'สุ่มเล็ก', NULL, 'chitsutha@kku.ac.th', NULL, '$2a$10$zDwigsaNvpGlsTyWVfl3A.b9B3XSnHcWd/QlcSVRmQIlqT1ijST3G', NULL, NULL, NULL, '2025-10-04 14:38:56', '2025-10-04 21:44:39', NULL, 'นางสาว', 'อาจารย์', 'บุคลากร', 'Staff', '', 'ชิตสุธา สุ่มเล็ก', 'Ph.D.', '0812213201', '081-221-3201', '0817493003', 'Lecturer', 'AI & Data Lab', 'อาคารวิศวะ 201', 'CP00033', NULL, 'A'),
(34, 'ธนพล', 'ตั้งชูพงศ์', NULL, 'thanaphon@kku.ac.th', NULL, '$2a$10$B2wFQqzkv8KiWVzSiGgNo.T8rH6BaXyTjmqFXXiU4ickGLsisDgne', NULL, NULL, NULL, '2025-10-04 14:41:33', '2025-10-04 21:44:40', NULL, 'นาง', 'อาจารย์', 'บุคลากร', 'Staff', '', 'ธนพล ตั้งชูพงศ์', NULL, '0812583298', '081-258-3298', '0818023094', 'Lecturer', 'Network Lab', 'อาคารวิศวะ 305', 'CP00034', 'SCOPUS00419730', 'A'),
(35, 'วรัญญา', 'วรรณศรี', NULL, 'waruwu@kku.ac.th', NULL, '$2a$10$QBXutWzdBgnjOeqac.kQSe.LH2xxNv9ongTIRgKFHH6XXhhYstiD6', NULL, NULL, NULL, '2025-10-04 14:42:43', '2025-10-04 21:44:40', NULL, 'นางสาว', 'อาจารย์', 'บุคลากร', 'Staff', '', 'วรัญญา วรรณศรี', NULL, '0812953395', '081-295-3395', '0818553185', 'Lecturer', 'Robotics Lab', 'อาคารวิศวะ 410', 'CP00035', NULL, 'A'),
(36, 'หัวหน้า', 'สาขา', 'male', 'forpassword@cpkku.ac.th', NULL, '$2a$10$qVdCxlPx1quNTW15DNhN0.eZFbdY0Y1Fw5PrM4zJLvbsUkjc3F8ZK', 1, 2, NULL, '2025-10-04 21:44:40', '2025-10-04 21:44:40', NULL, 'นาย', 'อาจารย์', 'ผู้ช่วยศาสตราจารย์', 'Asst. Prof.', 'Asst. Prof.', 'หัวหน้า สาขา', 'Ph.D.', '0813323492', '081-332-3492', '0819083276', 'Lecturer', 'Software Engineering Lab', 'อาคารวิศวะ 201', 'CP00036', 'SCOPUS00444420', 'A'),
(37, 'หัวหน้า', 'สาขา', 'male', 'forpassword2@cpkku.ac.th', NULL, '$2a$10$h.ILsvKAdo0LAU15A7hgk.OYtrC9x1ltHgZGsVedwNa1MGTkPlOqW', 1, 2, NULL, '2025-10-06 13:47:39', '2025-10-06 13:47:39', NULL, 'ดร.', 'อาจารย์', 'ผู้ช่วยศาสตราจารย์', 'Asst. Prof.', 'Asst. Prof.', 'หัวหน้า สาขา', NULL, '0813693589', '081-369-3589', '0819613367', 'Lecturer', 'AI & Data Lab', 'อาคารวิศวะ 305', 'CP00037', NULL, 'A');

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
(8, 5, 5, 3, 2, 126, 98, '{\"2017\":1,\"2018\":6,\"2019\":21,\"2020\":8,\"2021\":13,\"2022\":19,\"2023\":24,\"2024\":16,\"2025\":18}', '2025-10-15 00:01:08'),
(9, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-10-15 00:01:49');

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
(510, 8, 'baa9181c-4a86-481b-88bf-c519d9e059a3', 'Iy9xpnQ_FErRpBR5GrWOwr9vht6D2wEDh9KQGoee3ho=', 'Chrome Browser', 'web', '27.145.211.4', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-07 18:30:53', '2025-11-06 14:07:33', 1, '2025-10-07 15:07:33', '2025-10-07 18:30:53'),
(511, 8, '113fd0de-854f-4299-9d28-0fad119ca08e', 'N9l0qabE5R39FRuHlnuRVccBirhwsomtIsaP2Pga_ak=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 15:11:00', '2025-11-06 14:10:58', 0, '2025-10-07 15:10:58', '2025-10-07 15:11:00'),
(512, 13, '1054850e-3d51-4f8d-8c55-c0fb4c858f52', 'jVd79hZ-JsG7iSpeLVDd7JePAQ1CUo_ntuysb9TcMS0=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 15:15:31', '2025-11-06 14:11:03', 0, '2025-10-07 15:11:03', '2025-10-07 15:15:31'),
(513, 8, 'dea5e3d1-ad0f-452b-8d85-c9d9a3b44ce7', 'XvzM9cs27ssPU9zI4j7g58t6e2aKOKj2G8xlHUnQuWU=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 15:15:35', '2025-11-06 14:15:33', 0, '2025-10-07 15:15:33', '2025-10-07 15:15:35'),
(514, 7, '9f7e7cae-84e0-4ed6-b591-2b4d252958fe', 'wvLBQ9MnAVHa0V8kWp95Mhiqku8xwHDWba5dGVllr-o=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 15:21:49', '2025-11-06 14:15:38', 0, '2025-10-07 15:15:38', '2025-10-07 15:21:49'),
(515, 7, 'cf845bd8-03b0-4130-a3fa-e93c86d2fde0', 'rITSeZz8NXewyRWsVNWuLT97DmBRPwYpxqbXiv6ws3k=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 15:43:31', '2025-11-06 14:21:52', 0, '2025-10-07 15:21:52', '2025-10-07 15:43:31'),
(516, 8, 'a3f3cc1d-1444-4100-9f65-0ea772f2adae', 'vX6R0RF525bAdRS_jHjHLDQd5oOFa8jeY-n_D9h_hN8=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 15:46:21', '2025-11-06 14:43:34', 0, '2025-10-07 15:43:34', '2025-10-07 15:46:21'),
(517, 13, 'cdd1f6e5-83d4-47ac-aa23-f1651b0907c2', 'PrKJMB2xsnPVvEe5mSKRT-GUSh7IjX4fvk_LUZeHawY=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 15:47:01', '2025-11-06 14:46:24', 0, '2025-10-07 15:46:24', '2025-10-07 15:47:01'),
(518, 8, '55396242-9275-4668-8b29-0cdcf25b7099', 'FslRI7m2DO32o-fMdFqrfmLDfREIXca8Trk-ZvsBE-E=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 15:47:15', '2025-11-06 14:47:05', 0, '2025-10-07 15:47:05', '2025-10-07 15:47:15'),
(519, 7, '19c0d4ea-64ad-4365-9283-789db9a4b146', 'bhRxl75XOeuabXj7QA9gOsZPcgYuVE9CQ5v3sIl09iM=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 15:47:37', '2025-11-06 14:47:24', 0, '2025-10-07 15:47:24', '2025-10-07 15:47:37'),
(520, 13, '80ad4500-e508-4e2e-b5af-9c6e98c1415d', '8WH75C8Ckl5XrKIzXJMwRm7RHst_LQzq6X3QEl9iwUk=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 15:59:51', '2025-11-06 14:47:39', 1, '2025-10-07 15:47:39', '2025-10-07 15:59:51'),
(521, 8, '63deb44a-a6a1-49bc-957b-b537b944d3e4', 'nrYy4dYgiPIzJGuu9Bhgdy9gnzq442spdQ-XhyIfQpg=', 'Chrome Browser', 'web', '27.145.211.4', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-07 20:25:54', '2025-11-06 19:01:24', 0, '2025-10-07 20:01:24', '2025-10-07 20:25:54'),
(522, 13, 'c6e01119-c25f-4bac-afd0-c5d7ad839c5b', 'h0HgmuXBlv-Y9CSKMFkmKMSSE0ANtozwXGStIce9iSA=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 20:30:03', '2025-11-06 19:22:41', 0, '2025-10-07 20:22:41', '2025-10-07 20:30:03'),
(523, 8, '8bde045e-bf30-49fe-88b6-334f99c409d4', '6rezq890X9VgSFkoYqL8U0XaL8bVPFhcXdTP3SUHZTY=', 'Chrome Browser', 'web', '27.145.211.4', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-07 22:07:28', '2025-11-06 19:26:05', 1, '2025-10-07 20:26:05', '2025-10-07 22:07:28'),
(524, 8, '72e99bfb-1178-43ab-ac74-fee75d4ab726', 'BoJr8ObxPxPz-TME2Eb-ai5YI1rcc8poZI790-RMHlM=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 21:34:34', '2025-11-06 19:30:08', 0, '2025-10-07 20:30:08', '2025-10-07 21:34:34'),
(525, 11, 'bb4a779d-0c55-41cf-9d82-6ed94584a1bc', '6ACSFl7fbZCifo1L7p-KhyljiHFHA_K47Vbg-opMfSY=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 21:34:44', '2025-11-06 20:34:36', 0, '2025-10-07 21:34:36', '2025-10-07 21:34:44'),
(526, 12, '32d6453e-3811-41f6-ae51-7ba81d3a2d40', 'HeGxNMi0SZWXgg1UwgijkpOlDRgCmXZoRIf0PrvXiso=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 21:34:57', '2025-11-06 20:34:47', 0, '2025-10-07 21:34:47', '2025-10-07 21:34:57'),
(527, 8, 'cb6947d8-d981-44b2-aa05-74578b17864a', 'ZS1HSfV6EbCHWZjePeQ2y5nYfkAjto9YDIeRMdiiWKI=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 22:11:04', '2025-11-06 20:35:01', 0, '2025-10-07 21:35:01', '2025-10-07 22:11:04'),
(528, 13, '11487839-13bc-4a2b-a438-5035a58d3644', 'qvPszXSELYFEk_wdwwiYwYIBlo3OvMsExASnu6xHt88=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 22:11:25', '2025-11-06 21:11:06', 0, '2025-10-07 22:11:06', '2025-10-07 22:11:25'),
(529, 11, 'f2e46bc1-189c-4412-a80d-695dda51b76b', 'n52cRFhjArlreIiNFMa25JAEePBCN7spvaffsbSWPFI=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 22:13:27', '2025-11-06 21:11:28', 0, '2025-10-07 22:11:28', '2025-10-07 22:13:27'),
(530, 13, '8cbefbb0-645a-40d7-8498-2baa405cb6b5', '7-ZQXONlFD6wyiEwBPFNZ2pPRX8rnvV4suuATexk9X0=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 22:20:41', '2025-11-06 21:13:31', 0, '2025-10-07 22:13:31', '2025-10-07 22:20:41'),
(531, 7, 'e2eb9e36-b459-4bfb-8c12-06508915eb0b', '3sCK85np6SpmRjWRqTPUuiHr6SkIIqCEiEdm6zwLccw=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 22:34:54', '2025-11-06 21:20:43', 0, '2025-10-07 22:20:43', '2025-10-07 22:34:54'),
(532, 8, '6f7c3397-3d36-44ad-8e5d-deec1224973d', 'lH4JYzu9flScsj3k3EhixhMAauAWcDSBBO2RedqRqOE=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 22:35:52', '2025-11-06 21:34:56', 0, '2025-10-07 22:34:56', '2025-10-07 22:35:52'),
(533, 7, '115b2608-de70-4de5-b107-0f55c9a65baf', 'kAS0gYM4rZz2AMBN1ry8LBWVKwypb_gBjkaUjD4xj_4=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 22:53:22', '2025-11-06 21:35:55', 0, '2025-10-07 22:35:55', '2025-10-07 22:53:22'),
(534, 8, '0b0e48e2-4de4-4969-8785-50e6ef4f5dc2', 'Za4irw-5PFCicpPttGn347zFt4LqEDyjduhPON8knUA=', 'Chrome Browser', 'web', '27.145.211.4', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-07 23:00:04', '2025-11-06 21:42:12', 0, '2025-10-07 22:42:12', '2025-10-07 23:00:04'),
(535, 13, '224e616e-4317-4fd1-bbc7-bdf1f24f0c47', 'oADnfOmxMTWdcfd8JQFjmpJr6oKlH3968_G2dipHN-A=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 22:53:36', '2025-11-06 21:53:24', 0, '2025-10-07 22:53:24', '2025-10-07 22:53:36'),
(536, 11, '20a13cd5-6fc4-46af-8a73-23e39f3ba8f2', 'KfiqkFTQwT7Z5Ui7U4pLyOaxw8YAQ5FCjQOg926zaEo=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 23:14:14', '2025-11-06 21:53:38', 0, '2025-10-07 22:53:38', '2025-10-07 23:14:14'),
(537, 7, '49ca8143-c075-4d32-85b9-10196fc9a4f4', 'PUV_ITJBCXNPraj1NHrjwtTH9NFubqdD7K_ze6Zry5w=', 'Chrome Browser', 'web', '27.145.211.4', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-07 23:11:56', '2025-11-06 22:00:09', 0, '2025-10-07 23:00:09', '2025-10-07 23:11:56'),
(538, 8, '36629c56-36b2-4312-8b18-4713f13c2440', 'XEPtlUIhpmZZlQ42JZqymGcJKL3oA8cvZqBAvmG0eQc=', 'Chrome Browser', 'web', '27.145.211.4', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-07 23:43:42', '2025-11-06 22:12:02', 0, '2025-10-07 23:12:02', '2025-10-07 23:43:42'),
(539, 8, '8fc5bb24-52c6-4a7f-95c5-2530e245cae8', 'UTu4nsnKg_5NtiHv4ZJg4gjTPVhkcSB6KbdFnJJmDLU=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 23:34:38', '2025-11-06 22:14:17', 0, '2025-10-07 23:14:17', '2025-10-07 23:34:38'),
(540, 13, 'af341026-8822-4e28-a529-6d9564af4b3c', 'YwL7nqYRe343zfvBtOU5NaXbVJE8B2WHeWVaxQ5sTjg=', 'Chrome Browser', 'web', '58.10.78.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 23:35:33', '2025-11-06 22:34:43', 0, '2025-10-07 23:34:43', '2025-10-07 23:35:33'),
(541, 7, 'e91d0789-1be3-4573-9204-9084225ef569', 'H6YjMxFpnDlbXNK4ADhCeRBgSXkMpMEKN9P0z0StM5o=', 'Chrome Browser', 'web', '58.10.78.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-07 23:47:52', '2025-11-06 22:35:37', 1, '2025-10-07 23:35:37', '2025-10-07 23:47:52'),
(542, 7, '0cea5d08-398b-4093-ad64-3f509931f177', 'PwuX9AhjRzCbh3wJIpl3l5OTiJfCFgGasE8HnDZf_KQ=', 'Chrome Browser', 'web', '27.145.211.4', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-07 23:48:23', '2025-11-06 22:43:48', 0, '2025-10-07 23:43:48', '2025-10-07 23:48:23'),
(543, 8, '9c939cce-2223-4703-8e90-2a7312807eda', 'fwYkJqHWvPYk8dVkmjmX2QXFjL4l0SqPlqChGatFFeg=', 'Chrome Browser', 'web', '27.145.211.4', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-08 00:02:15', '2025-11-06 22:48:29', 0, '2025-10-07 23:48:29', '2025-10-08 00:02:15'),
(544, 7, 'ab50cd44-6307-4113-8181-ec0d14273bbd', '9K-9t9P6LbscsXmYgzrgyflijok-edrVDHmAOV0VLvQ=', 'Chrome Browser', 'web', '27.145.211.4', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-08 00:02:25', '2025-11-06 23:02:19', 0, '2025-10-08 00:02:19', '2025-10-08 00:02:25'),
(545, 8, '2d6fc745-0eae-489f-bb6c-361f798d9718', '-BrAWxGM3QMk3pI419qGzdWrz5ovTkqK0QHP8iA0oYE=', 'Chrome Browser', 'web', '27.145.211.4', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-08 00:23:44', '2025-11-06 23:02:30', 1, '2025-10-08 00:02:30', '2025-10-08 00:23:44'),
(546, 8, '65dfb982-cc3b-4ebd-a36d-ba5b11c63126', 'HB-9BKdBJjMB0I9d6zl0oWa2BVudwFIwzJJRqTRbuYE=', 'Chrome Browser', 'web', '58.10.78.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-08 10:36:03', '2025-11-07 09:35:56', 0, '2025-10-08 10:35:56', '2025-10-08 10:36:03'),
(547, 8, '0458403c-6a8b-4957-9360-4c86233b24b8', 'YQWKXdKRCBStDsfl3Yj-qi0r3TDUOHqRJS9Me5NoxwM=', 'Chrome Browser', 'web', '58.10.78.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-08 10:36:52', '2025-11-07 09:36:43', 0, '2025-10-08 10:36:43', '2025-10-08 10:36:52'),
(548, 7, '6a7bfdb8-2411-40ca-8a8b-db1b7fc80951', 'kcZDJpSHblX1_-lvezQs3Osz-MXfwBOVUCJRBF-elzc=', 'Chrome Browser', 'web', '58.10.78.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-08 10:46:28', '2025-11-07 09:36:54', 0, '2025-10-08 10:36:54', '2025-10-08 10:46:28'),
(549, 8, '8064c875-09ca-4062-9ce8-0466bf7cff90', 'qo6mhfDCBKKCvFyoKDWyIDF8rPY1NFjEsZbECI2GZYo=', 'Chrome Browser', 'web', '58.10.78.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-08 10:54:42', '2025-11-07 09:46:29', 0, '2025-10-08 10:46:29', '2025-10-08 10:54:42'),
(550, 7, '908a0bd1-bd83-4042-b787-2653bb4f0187', 'bg0nMvEnI2uU49Dv5DvP_siTtDafyGNG5kwyHfNIZwo=', 'Chrome Browser', 'web', '58.10.78.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-08 11:00:34', '2025-11-07 09:54:45', 0, '2025-10-08 10:54:45', '2025-10-08 11:00:34'),
(551, 8, '0696fda6-6fa1-427f-af76-5b70befd2c25', 'DYI9uHshLBqTjNVK3qLQusNlwsfMr3ztikz5qhov1jg=', 'Chrome Browser', 'web', '58.10.78.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-08 11:37:56', '2025-11-07 10:00:36', 0, '2025-10-08 11:00:36', '2025-10-08 11:37:56'),
(552, 11, '5116c695-9014-4033-be83-eb8e25becca4', 'nQ3LBCHVE6g8sD4x__3Oqe7YtNYOxNaJOmbcmPSpolA=', 'Chrome Browser', 'web', '202.12.97.155', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-08 13:37:04', '2025-11-07 10:37:58', 1, '2025-10-08 11:37:58', '2025-10-08 13:37:04'),
(553, 12, 'cdbb116a-fa61-485f-9e5f-d3f252444579', 'hi8II-R8q0YYXYCFHfHKQsy1I3EqSrJnV8-t7RFL_IM=', 'Chrome Browser', 'web', '202.12.97.155', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-08 11:43:32', '2025-11-07 10:43:30', 0, '2025-10-08 11:43:30', '2025-10-08 11:43:32'),
(554, 8, '212fbae5-a78a-428b-8d7f-74a83c6b3846', 'Diln7GXM7K9KBlluRmvKxy14qDDkZgsnc32KBh8YtIQ=', 'Chrome Browser', 'web', '202.12.97.155', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-08 13:24:32', '2025-11-07 10:43:34', 1, '2025-10-08 11:43:34', '2025-10-08 13:24:32'),
(555, 8, '33c7816d-7bc0-4ed4-b864-3cd83005666d', '8vcB7L4INZKrGsm1JILTlWrg3m5DQQ8DVL41DGSi1w4=', 'Chrome Browser', 'web', '202.28.118.102', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-08 15:24:54', '2025-11-07 10:44:00', 1, '2025-10-08 11:44:00', '2025-10-08 15:24:54'),
(556, 11, 'd0e865da-4f4c-4e81-b169-efbd9fea7374', 'JfTetNm84BwVPOJUq2NHeMWlylBDdkVesZVrc0tn4Qo=', 'Chrome Browser', 'web', '58.10.78.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-08 15:20:16', '2025-11-07 14:20:15', 0, '2025-10-08 15:20:15', '2025-10-08 15:20:16'),
(557, 12, 'db3d8ca1-a72b-4b45-9718-6ca7beaa9b36', 'PT_2rkCNixwvwXXTlrwb903uo4WP5okZX6B5JAfl6yQ=', 'Chrome Browser', 'web', '58.10.78.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-08 15:40:10', '2025-11-07 14:20:20', 1, '2025-10-08 15:20:20', '2025-10-08 15:40:10'),
(558, 8, 'c05c3ec1-72f2-4e02-a820-57f2c412a70b', 'iNAobFNu94z6d0k4x0nurmE0rlUk4Gap-h4npxo-muY=', 'Chrome Browser', 'web', '202.28.118.102', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-08 16:54:41', '2025-11-07 15:14:23', 0, '2025-10-08 16:14:23', '2025-10-08 16:54:41'),
(559, 7, '00334baf-c443-4714-870b-5670fde7487a', 'r5gWBlBHKIODT5DXo_MPB1AD5VZDE_NtPrnB4MWiz7U=', 'Chrome Browser', 'web', '202.28.118.102', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-08 21:50:06', '2025-11-07 15:55:09', 1, '2025-10-08 16:55:09', '2025-10-08 21:50:06'),
(560, 7, 'a155b38d-25b6-42c6-9ce2-08ac3021fccf', 'lIg8GyUP5e0JvpauBhux4pnyB_aqD6n4nQpm7C8aUL4=', 'Chrome Browser', 'web', '27.145.211.4', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-09 11:28:27', '2025-11-08 07:41:29', 0, '2025-10-09 08:41:29', '2025-10-09 11:28:27'),
(561, 13, '8a43dbd1-5432-48cc-9be9-d1bbe3a49f86', 'wwqplY3_sDdpkKLHivn28fWLxUu6V-Bi75udefpiYD8=', 'Chrome Browser', 'web', '58.10.78.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-09 09:50:26', '2025-11-08 08:33:59', 0, '2025-10-09 09:33:59', '2025-10-09 09:50:26'),
(562, 13, '8fabba3e-f18a-43b6-9fa8-422e458c8faa', '0SqObYeeFyQ74fPC_NR0tT8loUbJvGux6yoejbhZqtM=', 'Chrome Browser', 'web', '58.10.78.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-09 09:50:34', '2025-11-08 08:50:30', 0, '2025-10-09 09:50:30', '2025-10-09 09:50:34'),
(563, 11, '56c67767-5967-46d1-84a5-bbbfd5e15815', 'qUAXoP2t-M2gQmaydOHxeiMxU8z81TTmGg8y2RrS_QQ=', 'Chrome Browser', 'web', '58.10.78.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-09 10:11:22', '2025-11-08 08:50:37', 0, '2025-10-09 09:50:37', '2025-10-09 10:11:22'),
(564, 7, '6929606e-0a87-48db-b560-16ffafb0c393', 'YKHKvSgHha-woZWnUc8F7m4FgnBVM2z2VBJcMF7vNVg=', 'Chrome Browser', 'web', '58.10.78.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-09 10:11:39', '2025-11-08 09:11:25', 0, '2025-10-09 10:11:25', '2025-10-09 10:11:39'),
(565, 13, '325f7b9d-a98c-409e-8197-baf4c73acd6e', 'FZ9tm3LXUORJXNSoxUngX2xDhMSYLkDeOEYkiyZ4HNg=', 'Chrome Browser', 'web', '58.10.78.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-09 10:11:53', '2025-11-08 09:11:42', 0, '2025-10-09 10:11:42', '2025-10-09 10:11:53'),
(566, 7, '50213ce4-d0aa-4d49-a36c-cd2b347620d0', 'zZqtSGkaDf1KqhIjViBgcxo51GFnnt9Mx960aWfnifk=', 'Chrome Browser', 'web', '58.10.78.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-09 10:12:08', '2025-11-08 09:11:56', 0, '2025-10-09 10:11:56', '2025-10-09 10:12:08'),
(567, 8, '57197e2f-0838-4bb2-bede-09b23befdaa7', '_0Gxd3arNyiwy0LxS2VAS_MjayIhPZeqmAOGS-GRzss=', 'Chrome Browser', 'web', '58.10.78.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-09 10:14:16', '2025-11-08 09:12:11', 0, '2025-10-09 10:12:11', '2025-10-09 10:14:16'),
(568, 13, '03289779-eb92-4216-8751-b4a3b163b454', 'LZOeKCuzQFAoXLcJUGhReRBU9fomZTpEJP8ip3BuPww=', 'Chrome Browser', 'web', '58.10.78.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-09 10:14:42', '2025-11-08 09:14:18', 0, '2025-10-09 10:14:18', '2025-10-09 10:14:42'),
(569, 8, 'c46d769a-346c-44e3-8b00-e68bfcf5887b', 'zJPsikocqVDqt8d5w60SOM9OTicfqK3-HxkY1XjMK5o=', 'Chrome Browser', 'web', '58.10.78.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-09 10:14:46', '2025-11-08 09:14:45', 0, '2025-10-09 10:14:45', '2025-10-09 10:14:46'),
(570, 7, '91bc15ac-4a10-4db1-8232-053aa517881c', 'uC49aNl1fUAb7QbdIFm-cbBOx3fNxivoip-hvzZNOsM=', 'Chrome Browser', 'web', '58.10.78.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-09 10:17:57', '2025-11-08 09:14:48', 0, '2025-10-09 10:14:48', '2025-10-09 10:17:57'),
(571, 8, '41cf5cdb-de17-4ba6-a499-0eb34b5d9e60', 'iBNRy1Na5R3jSlvEcbEqC_uP7lgHJlgemHobOAWj9is=', 'Chrome Browser', 'web', '58.10.78.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-09 10:18:47', '2025-11-08 09:18:00', 0, '2025-10-09 10:18:00', '2025-10-09 10:18:47'),
(572, 7, '80b13f3f-9f37-4faa-a228-be2d1d651801', 'EkHpV4R4XdPwX5xGnhoRytTuq4SKSVzLSQ1TXB_8YVE=', 'Chrome Browser', 'web', '58.10.78.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-09 10:40:58', '2025-11-08 09:18:50', 0, '2025-10-09 10:18:50', '2025-10-09 10:40:58'),
(573, 8, '4fb80c6b-e7e9-402b-a357-f09803e168b0', 'nakZBbrb_iQqiAOc41NCbwhz2XqtPYihC35wk1UBNq4=', 'Chrome Browser', 'web', '58.10.78.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-09 10:41:59', '2025-11-08 09:41:00', 0, '2025-10-09 10:41:00', '2025-10-09 10:41:59'),
(574, 13, '10b78d21-1a05-4215-a07c-e855bc3d8c0a', 'bzemOhd6zeO7EBWgPzHP7vkBVSvI78RPoNDPD3KInFM=', 'Chrome Browser', 'web', '58.10.78.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-09 10:42:13', '2025-11-08 09:42:02', 0, '2025-10-09 10:42:02', '2025-10-09 10:42:13'),
(575, 11, 'd3345156-23c1-43d3-bd64-0f109b4d86d4', 'jNoKqMEUwxlot4k64IaA-sBaakJyvVeCfCfHuAN9C5g=', 'Chrome Browser', 'web', '58.10.78.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-09 11:22:53', '2025-11-08 09:42:16', 0, '2025-10-09 10:42:16', '2025-10-09 11:22:53'),
(576, 8, '77d37e28-551f-4d73-97e6-0b87291882f8', 'asGgA4bSBShoP82RpfAGiQXkXLj82iJdZRw1SRDOtIg=', 'Chrome Browser', 'web', '58.10.78.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-09 11:23:48', '2025-11-08 10:22:57', 1, '2025-10-09 11:22:57', '2025-10-09 11:23:48'),
(577, 13, '52ad26b2-5a3e-4a22-9215-296c89f3d617', 'aTJdOt6Vw8Io03Qs_M4n5Y2X5eBz32OpYt9vAC1jzlc=', 'Chrome Browser', 'web', '202.12.97.144', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-09 11:29:03', '2025-11-08 10:28:32', 0, '2025-10-09 11:28:32', '2025-10-09 11:29:03'),
(578, 7, '458c1570-f0a4-4355-931d-7c31d88a20d9', 'FhjguG7oHa9VdTmWLUFD1zMT0CAsiB1J8tT5EuaLmhI=', 'Chrome Browser', 'web', '202.12.97.144', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-09 12:57:14', '2025-11-08 10:29:14', 0, '2025-10-09 11:29:14', '2025-10-09 12:57:14'),
(579, 8, 'cbed99ef-a743-40fc-ad42-433ffb4e99f3', '6YvZqeSRD9P2C7fpM2HuykjApBM9o-1K_tkqIaSKH9U=', 'Chrome Browser', 'web', '58.10.78.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-09 12:50:12', '2025-11-08 11:25:04', 0, '2025-10-09 12:25:04', '2025-10-09 12:50:12'),
(580, 8, '6c856cec-e579-4240-aa08-7c4790bfcd7d', 'NOZlX5a18f3G7OY8kO-Y8f_ipKh10nfjybdOIhKlhT8=', 'Chrome Browser', 'web', '58.10.78.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-09 14:23:10', '2025-11-08 11:50:14', 1, '2025-10-09 12:50:14', '2025-10-09 14:23:10'),
(581, 8, 'c24a4498-2534-45c6-a48d-110b74956561', 'a-r_jZyNfGU1gDE2BQsUYBVqutus1uxRPNhBfnSvxS0=', 'Chrome Browser', 'web', '202.12.97.144', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-09 13:21:02', '2025-11-08 11:57:24', 0, '2025-10-09 12:57:24', '2025-10-09 13:21:02'),
(582, 7, '5e6f06e1-8eaa-4d73-85d8-2cc42f3e26ec', 'DvldHRaASiU3yY1FFyQNf0ruflBRkTDt3JoCvkSYZE0=', 'Chrome Browser', 'web', '202.12.97.144', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-09 13:55:14', '2025-11-08 12:21:07', 1, '2025-10-09 13:21:07', '2025-10-09 13:55:14'),
(583, 7, '5df929c1-3db1-4340-b436-122215d0f206', '5YPyAQRKhre5cnKzkG_m0zAffBdAEPPNe68YEZ35-cs=', 'Chrome Browser', 'web', '58.10.148.203', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-09 19:58:04', '2025-11-08 17:48:26', 1, '2025-10-09 18:48:26', '2025-10-09 19:58:04'),
(584, 7, 'd5e77ccf-2118-4b2c-805e-558da8db2eb4', 'spa-bEZWtIdSuj-U4KFhQ0o4UkLVq-ioUZ012vAmKYc=', 'Chrome Browser', 'web', '202.28.118.108', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-10 11:39:19', '2025-11-09 10:07:42', 0, '2025-10-10 11:07:42', '2025-10-10 11:39:19'),
(585, 7, '86bf9027-9138-42bd-aa43-2355d15ad239', 'TMXFwiv910T4mtnYXYSztmEU3pqkSd4EnXwmNJsfnqo=', 'Chrome Browser', 'web', '110.168.236.118', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-10 11:59:41', '2025-11-09 10:23:17', 0, '2025-10-10 11:23:17', '2025-10-10 11:59:41'),
(586, 8, '7f66fbe8-b0bf-4924-86e9-ad602bdf9110', 'KIdKrRGrGxgjyool6BP573JytNbCdLnJkw9YZ-OlK0M=', 'Chrome Browser', 'web', '202.28.118.108', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-10 12:08:13', '2025-11-09 10:39:22', 0, '2025-10-10 11:39:22', '2025-10-10 12:08:13'),
(587, 8, '1985a38a-7b18-463a-8ce2-4e88402c696f', '6Rum9aPTNhF8BMoxxyqbrJFU01A9c_gk5OLqWDFKI04=', 'Chrome Browser', 'web', '110.168.236.118', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-10 12:32:13', '2025-11-09 10:59:51', 0, '2025-10-10 11:59:51', '2025-10-10 12:32:13'),
(588, 7, '6536ff2e-ea19-46dc-a09a-03ad2f171f6c', 'PGdGbwByS7DmalIpopyPOrVFXOwMAvp0ehoUcrsZkMo=', 'Chrome Browser', 'web', '202.28.118.108', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-10 12:45:10', '2025-11-09 11:08:15', 1, '2025-10-10 12:08:15', '2025-10-10 12:45:10'),
(589, 7, '2a37dd1c-166a-47a7-a870-bd0b7b0045a7', '5odYEUzUBEoMcYkYIAkhVO15lB41sWo__dawuu53eFI=', 'Chrome Browser', 'web', '110.168.236.118', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-10 13:27:31', '2025-11-09 11:32:29', 1, '2025-10-10 12:32:29', '2025-10-10 13:27:31'),
(590, 7, 'aba1f30f-cf96-4ff1-9bb3-56c740271bd2', 'GvZDvZZWZI7ZIVz2_w-1PceduYGXkGnHdITOGogbSp8=', 'Chrome Browser', 'web', '110.168.236.118', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-10 21:02:36', '2025-11-09 12:34:17', 0, '2025-10-10 13:34:17', '2025-10-10 21:02:36'),
(591, 7, '21a3f389-921b-4d1e-8f51-5a5bcf5b17cb', 'xDl2afwcxj3p_YwwAIns4T3Z8fISLiAVcMlWgd1KXn4=', 'Chrome Browser', 'web', '202.28.118.108', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-10 14:19:03', '2025-11-09 12:38:04', 0, '2025-10-10 13:38:04', '2025-10-10 14:19:03'),
(592, 8, '88e56e57-ba5e-4f92-b997-880f0146a64c', 'zSIm3vDsCkrHzjjm4oNeMEMernR2fEyiBHjdHoNKKSw=', 'Chrome Browser', 'web', '202.28.118.108', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-10 14:28:32', '2025-11-09 13:19:05', 0, '2025-10-10 14:19:05', '2025-10-10 14:28:32'),
(593, 8, 'd76a6e6a-c597-46b5-a2ff-6ead78640e6b', 'ZtGtJrHnnGsMI5KvPCbzwGscgnCkHYyWIGVHGX-Rnc8=', 'Chrome Browser', 'web', '202.28.118.108', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-10 14:33:13', '2025-11-09 13:28:34', 0, '2025-10-10 14:28:34', '2025-10-10 14:33:13'),
(594, 13, '97d154f7-cc32-431a-a86d-5f97743c8c6b', 'WalVQjtx0RabzBm8_4i_Fj2D-3fYZpN3KNGIONUeqDE=', 'Chrome Browser', 'web', '202.28.118.108', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-10 14:36:10', '2025-11-09 13:33:16', 0, '2025-10-10 14:33:16', '2025-10-10 14:36:10'),
(595, 11, '03072a98-ecde-479c-b8b8-be499cc67a95', 'ktKjYvl4CSym8rORm7sH-zSSnC-r-Xn64rS4Ffy_wDY=', 'Chrome Browser', 'web', '202.28.118.108', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-10 15:24:56', '2025-11-09 13:36:13', 0, '2025-10-10 14:36:13', '2025-10-10 15:24:56'),
(596, 7, 'cde11376-da46-47c6-982a-5f32f7cdf60e', '4oaDjP7GSYhbFP7pqgF5_XijQFKPe5IdIzl7DEu5blU=', 'Chrome Browser', 'web', '202.28.118.108', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-10 17:08:03', '2025-11-09 14:26:19', 0, '2025-10-10 15:26:19', '2025-10-10 17:08:03'),
(597, 8, 'e31ed0b5-b6e3-48e1-8fc1-1a562706f1d6', 'TLqjmvsp1W-4ZGj4wVamTnJN43h7RqRGqDoOvBjHzuw=', 'Chrome Browser', 'web', '202.28.118.108', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-10 18:17:16', '2025-11-09 16:08:05', 0, '2025-10-10 17:08:05', '2025-10-10 18:17:16'),
(598, 7, '231ccf29-e297-4156-bfb4-035bd34226bb', 'DFyHEZ8m0oGfAr-Xryxhcv9-NslRGna_DT1mfvgB7B0=', 'Chrome Browser', 'web', '202.28.118.108', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-10 18:49:37', '2025-11-09 17:17:18', 1, '2025-10-10 18:17:18', '2025-10-10 18:49:37'),
(599, 8, '14a39f07-ae79-412e-a60d-9f3b7da9c214', 'PrUfKiEe_4_YdVfo1mMxa0kS_9Fh9qvsywOe6qlz3Cs=', 'Chrome Browser', 'web', '110.168.236.118', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-10 21:04:01', '2025-11-09 20:02:42', 0, '2025-10-10 21:02:42', '2025-10-10 21:04:01'),
(600, 8, '25d27a4b-bd3e-4f78-97b0-2ea882e75e71', 'J2o5x7tIWRqqqPXx419whCx9c4Y_EXRpPBAoUhxtqF8=', 'Chrome Browser', 'web', '110.168.236.118', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-10 21:04:11', '2025-11-09 20:04:06', 0, '2025-10-10 21:04:06', '2025-10-10 21:04:11'),
(601, 7, 'bf1d7e8a-a7d8-4b6e-91a9-db72721a615b', 'TliIn15YthjVsy2VYs46WHgewFpi3zv3GIlMKFC0YPU=', 'Chrome Browser', 'web', '110.168.236.118', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-10 21:04:34', '2025-11-09 20:04:18', 0, '2025-10-10 21:04:18', '2025-10-10 21:04:34'),
(602, 8, 'f6b3989a-9b99-4bf6-9891-ec52f4c5802c', '6d_tieKERmmw6wVojeyUG-3et0ciRJeEE2UKhTC5AtU=', 'Chrome Browser', 'web', '110.168.236.118', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-10-10 21:06:26', '2025-11-09 20:04:44', 1, '2025-10-10 21:04:44', '2025-10-10 21:06:26'),
(603, 8, 'b0b28397-3bf0-4d40-97c3-50f9be5a0309', 'oP3XDzW8NoV8LoRuviYuRg0CLT2__Ggoy9PSPvETAfM=', 'Chrome Browser', 'web', '58.10.78.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-10 21:18:33', '2025-11-09 20:18:28', 0, '2025-10-10 21:18:28', '2025-10-10 21:18:33'),
(604, 7, '15bf8d79-84a4-49eb-81dc-226598a6a4e7', 'ykrDVB1e3KWAapW0yF5pAWpcF2VvZ6YJzKt9y8XebcU=', 'Chrome Browser', 'web', '58.10.78.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-10 21:56:54', '2025-11-09 20:18:35', 1, '2025-10-10 21:18:35', '2025-10-10 21:56:54'),
(605, 7, 'ba5a3f4f-2255-4c46-b66b-63b9b9e256e8', '6Dy-zwmgNzUOFxYKhoR6E11NSw1UrsBPW71G7y77OEY=', 'Chrome Browser', 'web', '58.11.0.123', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 11:20:50', '2025-11-10 09:42:14', 0, '2025-10-11 10:42:14', '2025-10-11 11:20:50'),
(606, 7, 'dc980bd0-3950-4d4d-9648-caa6cb6955b4', 'jbtlMkAXU5crhonJL6fp70CuAXE58xThDvvEJgzamwY=', 'Chrome Browser', 'web', '58.10.78.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 10:48:27', '2025-11-10 09:48:17', 0, '2025-10-11 10:48:17', '2025-10-11 10:48:27'),
(607, 8, '08d1b658-7abc-4693-a30a-c3355fadd766', 'g_57vUOUlpTXm-6PqemCrfGRwSAhbPf9Lvl27RT-PM4=', 'Chrome Browser', 'web', '58.10.78.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 11:52:03', '2025-11-10 09:48:30', 0, '2025-10-11 10:48:30', '2025-10-11 11:52:03'),
(608, 7, '1cb23efe-6cf9-4d89-a415-bb813f7065e0', '4qsTngj6XFVrsk5cV6-H6yFnJUHbwdIhMuek0T0dtKI=', 'Chrome Browser', 'web', '58.11.0.123', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 11:33:29', '2025-11-10 10:21:43', 0, '2025-10-11 11:21:43', '2025-10-11 11:33:29'),
(609, 8, '9145db8f-4439-45b2-b2c2-fc07310b5b69', 'n-OgKVa_I_OFhzeUC1yTCmj2f83CRYUV9tYBaADq55s=', 'Chrome Browser', 'web', '58.11.0.123', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 11:50:55', '2025-11-10 10:33:36', 0, '2025-10-11 11:33:36', '2025-10-11 11:50:55'),
(610, 8, 'b747b8f9-9143-410e-ac6b-e83177414af4', 'bV1xMscLjC3ynJvm61x_UWG3Lh5nEEHY2wjDHZypIuM=', 'Chrome Browser', 'web', '58.11.0.123', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 12:22:04', '2025-11-10 10:51:04', 0, '2025-10-11 11:51:04', '2025-10-11 12:22:04'),
(611, 8, 'e9ebfb3b-e913-4496-b8a9-7ac826ecc6db', 'YSRaPvchanuprdlu5EfgGnFtj5otTgel39CLZLaBhQQ=', 'Chrome Browser', 'web', '202.28.118.73', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 12:44:52', '2025-11-10 10:52:07', 1, '2025-10-11 11:52:07', '2025-10-11 12:44:52'),
(612, 7, 'ad6ba2da-fa58-44e7-a4dd-e72501938e6f', 'jQn_oBnWBTK9QKMT8ITFCePAWTNxKe7lv0CpTFbS4nM=', 'Chrome Browser', 'web', '58.11.0.123', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 13:34:20', '2025-11-10 11:22:12', 0, '2025-10-11 12:22:12', '2025-10-11 13:34:20'),
(613, 8, '897b337a-e1dc-42e2-a72a-e61ee365aaa8', '87EmKoXJ-MmKNWauX3bHiQmM5UEMci-SFFSjMrA59v4=', 'Chrome Browser', 'web', '202.28.118.73', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 13:44:33', '2025-11-10 12:12:44', 0, '2025-10-11 13:12:44', '2025-10-11 13:44:33'),
(614, 8, 'a5700c7c-6bf2-4288-92d4-4c7c63ea56d8', 'U_SJP4NWvRiHrmOdeZ97OT69jTatWn1VIDRAsskcFJ8=', 'Chrome Browser', 'web', '58.11.0.123', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 13:38:38', '2025-11-10 12:34:27', 0, '2025-10-11 13:34:27', '2025-10-11 13:38:38'),
(615, 7, 'b2dc1925-9f2c-47a2-9bef-d00176dae386', '_4bUNh4Llcq_0SjbYi-r75mDi5GXemRvDqJsMVNDZdc=', 'Chrome Browser', 'web', '58.11.0.123', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 14:31:50', '2025-11-10 12:38:43', 0, '2025-10-11 13:38:43', '2025-10-11 14:31:50'),
(616, 7, 'b46934e8-4e45-48d2-9689-fa081c3aecee', '5t07uOpt8Uqa5vvrHuuQ8oq9DKwv1Swvl5BOIyNa3Xo=', 'Chrome Browser', 'web', '202.28.118.73', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 13:45:36', '2025-11-10 12:44:36', 0, '2025-10-11 13:44:36', '2025-10-11 13:45:36'),
(617, 8, '6c33e336-b454-43de-a6d4-0b490678ce37', '7AIxySd7DwDPuFUu9AY80_7-sBU2aEzfUc19I-LNLI4=', 'Chrome Browser', 'web', '202.28.118.73', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 13:45:53', '2025-11-10 12:45:38', 0, '2025-10-11 13:45:38', '2025-10-11 13:45:53'),
(618, 7, 'b0b63964-6a6b-4064-bbc5-1e0a54ff458a', 'zUAXMOD8yCAVjwE3gr7rACU7NnUUcS1tPjzLKi1o77I=', 'Chrome Browser', 'web', '202.28.118.73', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 13:46:10', '2025-11-10 12:45:55', 0, '2025-10-11 13:45:55', '2025-10-11 13:46:10'),
(619, 8, '3af94a10-81d5-4f11-b88f-903c47ebee89', 'U7ro8frsrBhpSuI3as8l1nOB_k8gd2S2fvxpw-EaY6A=', 'Chrome Browser', 'web', '202.28.118.73', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 14:00:11', '2025-11-10 12:46:12', 0, '2025-10-11 13:46:12', '2025-10-11 14:00:11'),
(620, 13, '9daa531b-bfd5-44d2-8527-7123f1d3b3ad', 'XllWb37RxKZ_m2mYOEVZiuVLjsCA3gFtOe203qPVZfA=', 'Chrome Browser', 'web', '202.28.118.73', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 14:08:12', '2025-11-10 13:00:14', 0, '2025-10-11 14:00:14', '2025-10-11 14:08:12'),
(621, 8, 'd855ab48-e142-4c4a-8c71-d263fdeb623f', 'JCBhdNsUIOuVSHZdXTyGrpjg2f8X9vAFpW8RDQtN2Yk=', 'Chrome Browser', 'web', '202.28.118.73', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 15:36:32', '2025-11-10 13:08:23', 0, '2025-10-11 14:08:23', '2025-10-11 15:36:32'),
(622, 8, '9cc82270-b805-44b1-a390-013da295b6b0', 'ZloEIxqhhZKPZsztliHLYQBQzH9daXvKBaibMGnsON8=', 'Chrome Browser', 'web', '58.11.0.123', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 14:58:40', '2025-11-10 13:31:55', 0, '2025-10-11 14:31:55', '2025-10-11 14:58:40'),
(623, 7, '9b62a954-58aa-4218-b0ed-9b8bfb1f20a1', 'WDfUXTPtMlEg_l9XLcmgiq6C_tTmepSawXHkloS4OdU=', 'Chrome Browser', 'web', '58.11.0.123', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 15:57:51', '2025-11-10 13:58:45', 1, '2025-10-11 14:58:45', '2025-10-11 15:57:51'),
(624, 7, '011d49e2-bafa-4d83-ba2d-ec2672db2d85', '-ZXe8da2BYk5QgYxiCaowTRkRdZXY7SDFtywHH1agB8=', 'Chrome Browser', 'web', '202.28.118.73', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 15:42:17', '2025-11-10 14:36:34', 0, '2025-10-11 15:36:34', '2025-10-11 15:42:17'),
(625, 8, '1eda4a40-1f21-4f3d-b055-e3a5190a869b', 'zn7qAEO42GdCIFMdWwREaSZ_TgJwwyfQH9xTBX0rBWE=', 'Chrome Browser', 'web', '202.28.118.73', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 15:42:23', '2025-11-10 14:42:19', 1, '2025-10-11 15:42:19', '2025-10-11 15:42:23'),
(626, 7, '0433af7e-7f05-4f43-aa8b-f0181d8d0cda', 'R3M2Cj7xm5bJovNo797E2dMnS_Ct4832X6cqH7l_NPo=', 'Chrome Browser', 'web', '58.11.0.123', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 18:15:48', '2025-11-10 15:28:34', 1, '2025-10-11 16:28:34', '2025-10-11 18:15:48'),
(627, 7, '34e4e515-fb81-4db1-9893-42a0efb3a4f2', '1yCoseXE58ce3N040Og4RpR8P8l2QTlRqeRJVrLlVAs=', 'Chrome Browser', 'web', '58.11.0.123', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 20:29:02', '2025-11-10 17:42:40', 0, '2025-10-11 18:42:40', '2025-10-11 20:29:02'),
(628, 13, '4442f4ee-f997-4c2c-94d7-59f87d176f45', '6T15Y3aBrHPmdHWGFSmkCD4URmDU0bMFdTqkvuVJM1I=', 'Chrome Browser', 'web', '58.10.78.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 19:30:19', '2025-11-10 18:30:03', 0, '2025-10-11 19:30:03', '2025-10-11 19:30:19'),
(629, 7, '0cbdf04c-9753-4764-b1fa-a49d91a966f4', 'sKniwpdjklTuWX5L12eyi1MXt0vLQezUZ_gVThZwDes=', 'Chrome Browser', 'web', '58.10.78.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 19:30:55', '2025-11-10 18:30:22', 0, '2025-10-11 19:30:22', '2025-10-11 19:30:55'),
(630, 13, 'c1fb8777-9c60-446a-9a76-7d0ace4c6f70', '6-xJ6wAw6lrTwG8SYxW4ry9XHLcfaAz7SP1_HOD_zAc=', 'Chrome Browser', 'web', '58.10.78.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 19:31:14', '2025-11-10 18:31:00', 0, '2025-10-11 19:31:00', '2025-10-11 19:31:14'),
(631, 7, 'ccecf66f-ac8c-47d2-a84e-0c5cd44e706e', 'oLB-fSN7dmz2k6pFJpu7xvV2lSa6Pm4CwL2kEp7kzOQ=', 'Chrome Browser', 'web', '58.10.78.71', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 20:39:50', '2025-11-10 18:31:16', 0, '2025-10-11 19:31:16', '2025-10-11 20:39:50'),
(632, 8, '8da35f7d-71d3-4d24-8881-bcfb891f648b', 't1-DhGo4u_OFGrqx31oAQwDdPZ60dVCk0lmhe6XOYgA=', 'Chrome Browser', 'web', '58.11.0.123', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 20:39:10', '2025-11-10 19:29:52', 0, '2025-10-11 20:29:52', '2025-10-11 20:39:10'),
(633, 7, '60aaf27f-9777-4c8d-82b8-becb0d08893e', '8SjPO_4B5iIYnnw3XRD1RetvRHjnZvVoqu1tK90__38=', 'Chrome Browser', 'web', '58.11.0.123', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 21:11:26', '2025-11-10 19:39:15', 0, '2025-10-11 20:39:15', '2025-10-11 21:11:26'),
(634, 8, 'f22fb5c1-0772-4ef5-9342-e847e484e0b0', 'ipu9CTKGkh4gtkwe7aSDkT_KUYRbZFXxq_TUj44HwIM=', 'Chrome Browser', 'web', '202.12.97.208', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 20:48:04', '2025-11-10 19:39:52', 0, '2025-10-11 20:39:52', '2025-10-11 20:48:04'),
(635, 7, '7cb97539-0202-4a05-88e7-7834d521327e', '0l67BFfRIEV0k2azSiVpl08Z1gV9cZcoXxTWyk5H1Hg=', 'Chrome Browser', 'web', '202.12.97.208', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 21:00:17', '2025-11-10 19:48:07', 0, '2025-10-11 20:48:07', '2025-10-11 21:00:17'),
(636, 8, 'ae148dda-4d53-4edd-81a9-c6a2b29b2992', 'MWjIdYTfXWxDrixHq3-ucJ1rBxwAMotrayRiGEku2Qk=', 'Chrome Browser', 'web', '202.12.97.208', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 21:27:54', '2025-11-10 20:00:21', 0, '2025-10-11 21:00:21', '2025-10-11 21:27:54'),
(637, 13, '8694405d-b77f-41d3-ac01-552f8fd343a1', 'Zs2aDqJZh-7xtVzQrSTfpglHdn3FAdDGpP5xRJEswNo=', 'Chrome Browser', 'web', '202.28.119.61', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 21:15:37', '2025-11-10 20:11:33', 0, '2025-10-11 21:11:33', '2025-10-11 21:15:37'),
(638, 7, '47f3b45e-c52e-437e-9a43-06ea1ddadacc', 'BwHxFxZF6N0A3tSEucBmNV_tvLRG4Kx2OBZBluyDmBo=', 'Chrome Browser', 'web', '202.28.119.61', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 21:16:49', '2025-11-10 20:15:44', 0, '2025-10-11 21:15:44', '2025-10-11 21:16:49'),
(639, 8, 'e6a969c0-d925-4094-83fe-492ff3f13e3e', '70lp3mJUuPHciFPjQBuia8wORSr9AVcv4uwXfXC25eg=', 'Chrome Browser', 'web', '202.28.119.61', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 21:17:48', '2025-11-10 20:16:54', 0, '2025-10-11 21:16:54', '2025-10-11 21:17:48');
INSERT INTO `user_sessions` (`session_id`, `user_id`, `access_token_jti`, `refresh_token`, `device_name`, `device_type`, `ip_address`, `user_agent`, `last_activity`, `expires_at`, `is_active`, `created_at`, `updated_at`) VALUES
(640, 7, '34a64122-5d87-4b7c-bf95-f5b934b5a3f1', 'HZMhipFSPu5paM0rf7OH-07xFMAmvXhm1JidkbTZcSQ=', 'Chrome Browser', 'web', '202.28.119.61', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 21:19:20', '2025-11-10 20:17:54', 0, '2025-10-11 21:17:54', '2025-10-11 21:19:20'),
(641, 8, 'a240e7fa-8789-4061-b0e0-7c2d99b55a59', 'z6jvWkI4pXx4Gm26OzOCkaH7J0lFnEEWJr3dddK2EXY=', 'Chrome Browser', 'web', '202.28.119.61', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 21:23:53', '2025-11-10 20:19:29', 0, '2025-10-11 21:19:29', '2025-10-11 21:23:53'),
(642, 8, 'c4bf09e4-7414-4ea4-9d22-34df18e857e1', 'bwVTZ9JP-dthVA-Gd-o2J0Wp4G9hqze9w1wDj73k3QQ=', 'Chrome Browser', 'web', '202.28.119.61', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 21:42:14', '2025-11-10 20:24:02', 0, '2025-10-11 21:24:02', '2025-10-11 21:42:14'),
(643, 7, '24a1db8a-9548-4a16-90a2-33d927b700ba', 'rrC8Y5m5BkkALT_PWWJ8YwSt3vbBJJ44_NuPKabwsoc=', 'Chrome Browser', 'web', '202.12.97.208', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 21:28:28', '2025-11-10 20:28:09', 0, '2025-10-11 21:28:09', '2025-10-11 21:28:28'),
(644, 8, '192fc77e-2854-4024-a4ea-3e890f68871d', 'm0O_HSTu28T2Qguzy54zI1v-bZQaIMJbQ7plwELQ4Y4=', 'Chrome Browser', 'web', '202.12.97.208', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 22:25:07', '2025-11-10 20:28:31', 1, '2025-10-11 21:28:31', '2025-10-11 22:25:07'),
(645, 13, '6f9524ae-4bf6-4431-99a7-45dfa2b7b65e', 'qQ_VJwHrzBgy2CBqN1duakdVxwRAP1hlg2nY4hcAIec=', 'Chrome Browser', 'web', '202.28.119.61', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 21:43:06', '2025-11-10 20:42:20', 0, '2025-10-11 21:42:20', '2025-10-11 21:43:06'),
(646, 8, '601b8a0c-2c9d-4107-b7dd-25b2481264c8', 'dpglakZjrK-kNkT8fCYYP1-ZCSdRQSjPUho9DDjfse0=', 'Chrome Browser', 'web', '202.28.119.61', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 21:56:11', '2025-11-10 20:43:26', 0, '2025-10-11 21:43:26', '2025-10-11 21:56:11'),
(647, 7, '01dd7c83-7051-4776-8b6e-b77f67371356', 'FP4QVFwq54WKfElGrr-UwO5euLHO8PO-53x5DWi9vpA=', 'Chrome Browser', 'web', '202.28.119.61', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 21:58:31', '2025-11-10 20:56:15', 0, '2025-10-11 21:56:15', '2025-10-11 21:58:31'),
(648, 8, '04c86be7-597b-4a60-8bce-04814f1864c5', 'uLJBvtJUmsb0yeyzJN570zolAi2XknundfIVNGx3o6E=', 'Chrome Browser', 'web', '202.28.119.61', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 22:06:00', '2025-11-10 20:58:35', 0, '2025-10-11 21:58:35', '2025-10-11 22:06:00'),
(649, 7, '15b99b4f-0604-4992-b373-2d2547c60f6c', 'RA4XPaBwFbhc-cTgOCWhSeSbR5EqJiRn2McVBjyF4pA=', 'Chrome Browser', 'web', '202.28.119.61', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 22:23:29', '2025-11-10 21:06:04', 0, '2025-10-11 22:06:04', '2025-10-11 22:23:29'),
(650, 8, '74b37322-a420-4d0e-b430-4eebd4d6b1ab', 'XxHBbdjwIeWbEJ-D2BSF56LkOq4TA839HJJFElTU2SM=', 'Chrome Browser', 'web', '202.28.119.61', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 23:14:42', '2025-11-10 21:23:37', 0, '2025-10-11 22:23:37', '2025-10-11 23:14:42'),
(651, 8, '0f703d86-356b-48e5-8e1d-7565d0a5fe3b', 'fAd02v5bhCVipKiFTF9N1LKYuuXu_m8D7CVnzhIPgQE=', 'Chrome Browser', 'web', '202.12.97.208', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 23:47:49', '2025-11-10 21:36:09', 1, '2025-10-11 22:36:09', '2025-10-11 23:47:49'),
(652, 12, 'df580410-ad62-48b9-a99c-3d4258522cf8', 'OazTeeAsX35eJddKI3KIfxXRgPcIQCpHLhy2XdjjF3o=', 'Chrome Browser', 'web', '202.28.119.61', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 23:36:39', '2025-11-10 22:14:52', 0, '2025-10-11 23:14:52', '2025-10-11 23:36:39'),
(653, 8, 'c7bfab7e-7130-4888-97bb-5a2c9a96fe2a', 'JxeL0bPDfVZD835UjBXY910GdtKBguVEvP9yugOL_Ck=', 'Chrome Browser', 'web', '202.28.119.61', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 23:49:34', '2025-11-10 22:36:44', 0, '2025-10-11 23:36:44', '2025-10-11 23:49:34'),
(654, 12, 'e49dab65-3820-4846-9f28-0fa7255ce3eb', 'DO6Dv4mi35Cyh8s5dzG2yWxa6M3QIPJf5c-2WkJ7eBI=', 'Chrome Browser', 'web', '202.28.119.61', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-11 23:49:44', '2025-11-10 22:49:40', 1, '2025-10-11 23:49:40', '2025-10-11 23:49:44'),
(655, 7, 'd95a28a3-74fc-4296-914b-c65ec0c6d034', 'hFz5ve3XVwqLh1v8WKPvMhjZjLpO0N_ywkG21heCPXk=', 'Chrome Browser', 'web', '202.28.118.112', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-12 10:25:26', '2025-11-11 07:02:48', 0, '2025-10-12 08:02:48', '2025-10-12 10:25:26'),
(656, 7, 'd343132e-923b-41c7-8ef1-8726baf53d82', 'WOhg4ArIs33Vz3SxZEOGOL0CHbeo7pZwhlW0an3Ox4k=', 'Chrome Browser', 'web', '202.28.119.60', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-12 08:16:00', '2025-11-11 07:02:53', 0, '2025-10-12 08:02:53', '2025-10-12 08:16:00'),
(657, 8, 'f6d5ebf8-ecf4-4554-9f1e-89db635f4bf0', 'w8S2IzNB5Fecj0tsQDLjhu5uKeEN8SK2T_faFhGxnKg=', 'Chrome Browser', 'web', '202.28.119.60', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-12 08:18:39', '2025-11-11 07:16:05', 0, '2025-10-12 08:16:05', '2025-10-12 08:18:39'),
(658, 7, 'b561e03a-0ff4-4a3f-855b-a984bcc1527d', 'ssAEHo5arDaBEeXllMUUBuM8_JvDdWigjDK9wnNZnfQ=', 'Chrome Browser', 'web', '202.28.119.60', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-12 08:29:07', '2025-11-11 07:18:44', 0, '2025-10-12 08:18:44', '2025-10-12 08:29:07'),
(659, 8, '3c7441c9-b5cb-4967-a07a-5ed13ebb80fa', 'GpCjcpshQWfqd1ENWcj69CanF7R5ZbLABDk1TYoWmpY=', 'Chrome Browser', 'web', '202.28.119.60', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-12 08:30:46', '2025-11-11 07:29:12', 0, '2025-10-12 08:29:12', '2025-10-12 08:30:46'),
(660, 7, 'a527e0b3-1f20-4fbd-8ab8-93f5db66a3e2', 'p5Ao_4rtAStuRgZSnxGUfeSU28_KvHg8AISKQDRqweE=', 'Chrome Browser', 'web', '202.28.119.60', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-12 09:14:06', '2025-11-11 07:30:51', 0, '2025-10-12 08:30:51', '2025-10-12 09:14:06'),
(661, 8, '784a0fa7-e0de-4eb2-83a5-aadd881f4c59', 'spqLgmlbjbRKVHRfnVt2rTyR_Zn8rRzRzILWm5q1eHU=', 'Chrome Browser', 'web', '202.28.119.60', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-12 09:26:57', '2025-11-11 08:14:13', 0, '2025-10-12 09:14:13', '2025-10-12 09:26:57'),
(662, 7, '9bac951a-49e3-44a5-83f5-6404513ebb93', 'dlGxIFlzqHZJ-Sw9qs_3XGgOG8NTGWRl7yXRFySGAAg=', 'Chrome Browser', 'web', '202.28.119.60', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-12 09:30:15', '2025-11-11 08:27:01', 0, '2025-10-12 09:27:01', '2025-10-12 09:30:15'),
(663, 8, 'f0556da7-bf37-48ee-ab00-b6eb730124e5', 'TYelSPYcdowSAzsr7H4p67aHBMFhSYBiV9lgBlm3vlo=', 'Chrome Browser', 'web', '202.28.119.60', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-12 09:31:00', '2025-11-11 08:30:19', 0, '2025-10-12 09:30:19', '2025-10-12 09:31:00'),
(664, 7, 'f0810682-7672-4d3f-8b2f-bcd247c376f2', 'wUeKEqhEp8mApfkeLDNDmbxdwBQsipypX0rsTFyfYnI=', 'Chrome Browser', 'web', '202.28.119.60', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-12 09:45:27', '2025-11-11 08:31:06', 1, '2025-10-12 09:31:06', '2025-10-12 09:45:27'),
(665, 8, 'e3e2b90e-ad77-4de3-827c-da33ba0d8855', 'YXhnt_svHboJEuG4tbQY-4gAA3Ih1zdwFoHJiPXSloo=', 'Chrome Browser', 'web', '202.28.118.112', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-12 10:29:47', '2025-11-11 09:29:43', 1, '2025-10-12 10:29:43', '2025-10-12 10:29:47'),
(666, 7, 'b491a2ca-16fb-4b8f-99c8-ab32d2d4a6be', 'e-2Qi0H5hG9oNJgZ4P9PdE7iEPyTrsNaIRdkU4tzTRI=', 'Chrome Browser', 'web', '202.28.119.60', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-12 15:13:23', '2025-11-11 14:07:18', 1, '2025-10-12 15:07:18', '2025-10-12 15:13:23'),
(667, 8, '1fa6832f-0cd9-44c5-a2fe-2272cd9dd287', 'AQHlgwIPSkdSl1ZJADuHhmMlWwKB5cqtr6oD_9OrDnM=', 'Chrome Browser', 'web', '124.122.123.63', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-12 19:01:17', '2025-11-11 17:55:41', 1, '2025-10-12 18:55:41', '2025-10-12 19:01:17'),
(668, 8, 'c628578e-8a44-438a-9dce-776e46602ae3', 'zK4sENjKP520xGUk-KGfLK9VYBTR-dEu2WFZVadnm7Y=', 'Chrome Browser', 'web', '58.10.149.19', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-13 13:10:33', '2025-11-12 11:56:32', 0, '2025-10-13 12:56:32', '2025-10-13 13:10:33'),
(669, 8, '5c4a1774-163f-4755-beea-be4a92f04c23', 'BjPOES5RmgkJTs3wGcdrz6E_yqs6YaYygUdJbC4XYb0=', 'Chrome Browser', 'web', '58.10.149.19', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-13 14:11:24', '2025-11-12 12:10:34', 1, '2025-10-13 13:10:34', '2025-10-13 14:11:24'),
(670, 8, 'e31ba16f-c654-4efd-b947-87137ecfcb4a', 'CtfQS9BvMB_a4Da0hx-dJVkdTMXBFT3wQTM6x5ka14M=', 'Chrome Browser', 'web', '58.10.149.19', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-13 17:49:33', '2025-11-12 16:26:23', 1, '2025-10-13 17:26:23', '2025-10-13 17:49:33'),
(671, 8, '8c1b8b70-4559-4ab7-9ebe-e031a4c7c5df', 'C4vML3ak6Jt-OgaQ9RIWdRTO1tN-30f_40KXS3ZyEF4=', 'Chrome Browser', 'web', '58.10.149.19', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-13 18:55:48', '2025-11-12 17:40:30', 1, '2025-10-13 18:40:30', '2025-10-13 18:55:48'),
(672, 8, '6f3f8692-f132-4fd4-a40e-66d0fc4f430b', '-pCB1u4dKD91QHRsl3LW2ZWhrWfupWqGeN3bs9Ul01I=', 'Chrome Browser', 'web', '110.168.238.218', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-13 19:09:54', '2025-11-12 18:09:47', 0, '2025-10-13 19:09:47', '2025-10-13 19:09:54'),
(673, 7, 'b56bcc6b-b281-4b64-82bf-080154eedefb', 'H8GpCL4xr4FQkyDzq75-WXR_bJ0y6xclFWz4iyU3Goc=', 'Chrome Browser', 'web', '110.168.238.218', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-13 20:18:14', '2025-11-12 18:10:06', 1, '2025-10-13 19:10:06', '2025-10-13 20:18:14'),
(674, 8, '4712d8e9-2c50-4113-beca-ba465f60a168', 'wt-6izrRVWhsiRwMDyCOew8CxRF_3byn82dVAGLslOA=', 'Chrome Browser', 'web', '202.28.118.117', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-14 15:21:37', '2025-11-13 09:46:36', 1, '2025-10-14 10:46:36', '2025-10-14 15:21:37'),
(675, 7, '8e920663-7e96-419d-a0a2-3c608c23e01c', 'OrbwGF8kdGkydjigU8pN-FwVVQ1qhqT0agxKYB7Kr9s=', 'Chrome Browser', 'web', '202.28.118.75', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-14 13:36:00', '2025-11-13 10:07:55', 1, '2025-10-14 11:07:55', '2025-10-14 13:36:00'),
(676, 7, 'c3f6a3e3-298d-4e19-8e5e-5bbc6aee8573', '2JVuyKudgSQEdxBdmLDW-o82J3noHqcsax4izWu1aaQ=', 'Chrome Browser', 'web', '202.28.118.75', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-14 19:36:05', '2025-11-13 13:12:15', 0, '2025-10-14 14:12:15', '2025-10-14 19:36:05'),
(677, 13, '6b75dae3-e3a3-43b4-b72d-75a7f3b938e5', 'Z4FzZgBUWdRmv-mpp-5cBzOPowZPuN0k7lr9IuUSjhs=', 'Chrome Browser', 'web', '58.11.83.64', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-14 19:36:39', '2025-11-13 18:36:10', 0, '2025-10-14 19:36:10', '2025-10-14 19:36:39'),
(678, 7, '29fd0b4f-ef1b-4750-9dc8-cdbdd72cf009', 'cJbyZMTz6e1tn1Oi7SFTPge3eSlIBCnTayQasBeqEMg=', 'Chrome Browser', 'web', '58.11.83.64', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-14 19:40:47', '2025-11-13 18:36:46', 0, '2025-10-14 19:36:46', '2025-10-14 19:40:47'),
(679, 8, '78f0b4be-39f3-42f2-93c6-5cd2c7daa570', 'yM9fEBwxuloG_HRDGW-TAYHUGSVxTMJdQ8JwzFTLWz4=', 'Chrome Browser', 'web', '58.11.83.64', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-14 19:42:18', '2025-11-13 18:40:58', 0, '2025-10-14 19:40:58', '2025-10-14 19:42:18'),
(680, 13, 'bae14b93-e0d0-4945-9a27-8898d4cfd1c7', 'XrEDH3e8HudIv7FszYgjEyvaSkJ9ulQXs1LyweIaKp4=', 'Chrome Browser', 'web', '58.11.83.64', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-15 01:57:16', '2025-11-13 18:42:22', 1, '2025-10-14 19:42:22', '2025-10-15 01:57:16'),
(681, 13, '34c38a0e-88a4-46a2-9f0f-9838c3e3020b', 'EUSofyLhynrOIU4rkuVb0oMFkWOV6f7bb7PYV9HP2Cs=', 'Chrome Browser', 'web', '58.11.83.64', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-15 03:25:10', '2025-11-14 01:13:03', 1, '2025-10-15 02:13:03', '2025-10-15 03:25:10'),
(682, 7, 'fdca3064-7a6d-432d-94a0-ae623f5d477a', '6GHpihTaD1DpXkBgQl8DfttfgZa9BwKQKhrltl_Z0N0=', 'Chrome Browser', 'web', '58.11.83.64', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-15 08:44:17', '2025-11-14 06:33:23', 0, '2025-10-15 07:33:23', '2025-10-15 08:44:17'),
(683, 8, '7a744553-49e3-4f87-8f77-e76aee387d65', 'bB4EJ8nQFrvPYHjWYe7PC1cRgfW5NDKsurQOoZB8PLk=', 'Chrome Browser', 'web', '58.11.83.64', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-15 08:45:15', '2025-11-14 07:44:28', 0, '2025-10-15 08:44:28', '2025-10-15 08:45:15'),
(684, 13, '014e67cb-0164-4c4a-b332-c212a1cf625b', 'JaBDDFgybmuTWNPyvFPJdrly4kgmsnCTjwc5t6_Elgs=', 'Chrome Browser', 'web', '58.11.83.64', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-15 08:51:18', '2025-11-14 07:45:26', 0, '2025-10-15 08:45:26', '2025-10-15 08:51:18'),
(685, 7, '4cb22d7c-9387-4efc-b16b-10265f02884b', 'Rapc-WFihtrhwJ4n9ckuY3RI9aAL3SrwVjJ2lrIHslI=', 'Chrome Browser', 'web', '58.11.83.64', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-15 09:04:33', '2025-11-14 07:51:25', 0, '2025-10-15 08:51:25', '2025-10-15 09:04:33'),
(686, 13, '42d80cff-0f67-4bd4-b25f-56fea92b3101', 'pGmh6kGKE1aNAUdrV_-JSq6BqK_29zlhtnHQKBNLxSo=', 'Chrome Browser', 'web', '58.11.83.64', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-15 09:05:46', '2025-11-14 08:04:39', 0, '2025-10-15 09:04:39', '2025-10-15 09:05:46'),
(687, 7, '517e1455-e981-4632-b460-21c95a1b568f', 'Da8rkx0DCAPml4P43y_emgihUAFWF2c_HtfwH-mQEDA=', 'Chrome Browser', 'web', '58.11.83.64', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-15 09:06:11', '2025-11-14 08:05:52', 0, '2025-10-15 09:05:52', '2025-10-15 09:06:11'),
(688, 13, '9c5d706f-aba6-4efb-9e89-e690e639388d', '9cJEZl_yF68EpxtP_xxu6IfaHY_BwIfd6S3sWmph5_0=', 'Chrome Browser', 'web', '58.11.83.64', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-15 10:47:28', '2025-11-14 08:06:16', 0, '2025-10-15 09:06:16', '2025-10-15 10:47:28'),
(689, 8, '9d590644-173b-4539-accf-fdb16aa166df', 'lcIH3Nn8nnLNtC6VAP7hsExocztbEydAbG_Efrvhqsc=', 'Chrome Browser', 'web', '58.11.83.64', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-15 11:46:48', '2025-11-14 09:47:35', 1, '2025-10-15 10:47:35', '2025-10-15 11:46:48'),
(690, 8, 'bdb64288-050a-4cf1-9871-0df485e3dafb', 'J0UEzqj3Ss6T8theSEDETj04ZygU96smMjleDcm6ecI=', 'Chrome Browser', 'web', '58.10.107.212', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-15 14:55:26', '2025-11-14 10:34:30', 1, '2025-10-15 11:34:30', '2025-10-15 14:55:26'),
(691, 8, '6982aa33-db7a-45fc-93c4-9417225d47b9', 'VM5tkHu7ciLg3GoBwOf7DFiqqhMKuKjq8vKoumxPk0k=', 'Chrome Browser', 'web', '58.11.83.64', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-15 12:23:42', '2025-11-14 11:18:51', 0, '2025-10-15 12:18:51', '2025-10-15 12:23:42'),
(692, 13, 'e3341cf1-883a-4e62-8518-2bac71a0e7d5', 'wgdxSn-cjkoBPDgBbZA518BE6j8ipZlPU5StUwiBDkE=', 'Chrome Browser', 'web', '58.11.83.64', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-15 12:25:08', '2025-11-14 11:23:51', 0, '2025-10-15 12:23:51', '2025-10-15 12:25:08'),
(693, 7, '677600f4-a02d-43fb-846e-7a43a535607a', 'FcnjrSaa_oNtwJhYzfjQUZ_Nv6sUayWLvyluwYoIeE8=', 'Chrome Browser', 'web', '58.11.83.64', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-15 12:25:35', '2025-11-14 11:25:13', 0, '2025-10-15 12:25:13', '2025-10-15 12:25:35'),
(694, 8, '0245a2a1-5352-4c5f-8c63-016483816a53', 'S3K-YX_qvMKZBkOOL359pCfh-aqyxDXJ-3BEGhZR7ck=', 'Chrome Browser', 'web', '58.11.83.64', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-15 14:28:18', '2025-11-14 11:25:41', 0, '2025-10-15 12:25:41', '2025-10-15 14:28:18'),
(695, 13, '6dd64823-f110-4251-b0b9-95a09a0ff34d', 'IgSKVEZLDeqiIcXbHMWttGXp6mH7oWXk9k5XFnjBKhA=', 'Chrome Browser', 'web', '58.11.83.64', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-15 14:40:53', '2025-11-14 13:40:28', 0, '2025-10-15 14:40:28', '2025-10-15 14:40:53'),
(696, 7, '93e8954a-0d23-4892-869b-f205f35191ba', 'omyUddF5Ju8gRQY9ql6b3amsr6xdp6BdmBmu1zGNqwA=', 'Chrome Browser', 'web', '58.11.83.64', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-15 14:45:12', '2025-11-14 13:41:01', 0, '2025-10-15 14:41:01', '2025-10-15 14:45:12'),
(697, 8, '60ed3625-c334-421c-84cf-17e111cc9510', 'JBdHg-BOsqNINGCXc_mAksFu0gbDs_FioukIjcvY7Ik=', 'Chrome Browser', 'web', '58.11.83.64', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-15 15:42:12', '2025-11-14 13:45:18', 0, '2025-10-15 14:45:18', '2025-10-15 15:42:12'),
(698, 13, 'aa256ab7-3813-4475-9580-dcc33f6ebfeb', 'Dsrcx9LEIqy9J8Ixs8qzymtdMxtIODOlQf2Ijw5nMA8=', 'Chrome Browser', 'web', '58.11.83.64', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-15 15:43:30', '2025-11-14 14:42:19', 0, '2025-10-15 15:42:19', '2025-10-15 15:43:30'),
(699, 8, 'e1023917-f8a2-44b1-8822-c7c60c25ba99', 'dipHseowUO8Yr_qViWQ1e_mgDs3nC4Ldkvi82XjX2ho=', 'Chrome Browser', 'web', '58.11.83.64', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', '2025-10-15 15:45:08', '2025-11-14 14:43:35', 1, '2025-10-15 15:43:35', '2025-10-15 15:45:08');

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
(520, 13, 'refresh', '8WH75C8Ckl5XrKIzXJMwRm7RHst_LQzq6X3QEl9iwUk=', '2025-11-06 14:47:39', 0, 'Chrome Browser / web', '202.28.118.117', '2025-10-07 15:47:39', '2025-10-07 15:47:39'),
(521, 8, 'refresh', 'nrYy4dYgiPIzJGuu9Bhgdy9gnzq442spdQ-XhyIfQpg=', '2025-11-06 19:01:24', 1, 'Chrome Browser / web', '27.145.211.4', '2025-10-07 20:01:24', '2025-10-07 20:25:54'),
(522, 13, 'refresh', 'h0HgmuXBlv-Y9CSKMFkmKMSSE0ANtozwXGStIce9iSA=', '2025-11-06 19:22:41', 1, 'Chrome Browser / web', '202.28.118.117', '2025-10-07 20:22:41', '2025-10-07 20:30:03'),
(523, 8, 'refresh', '6rezq890X9VgSFkoYqL8U0XaL8bVPFhcXdTP3SUHZTY=', '2025-11-06 19:26:05', 0, 'Chrome Browser / web', '27.145.211.4', '2025-10-07 20:26:05', '2025-10-07 20:26:05'),
(524, 8, 'refresh', 'BoJr8ObxPxPz-TME2Eb-ai5YI1rcc8poZI790-RMHlM=', '2025-11-06 19:30:08', 1, 'Chrome Browser / web', '202.28.118.117', '2025-10-07 20:30:08', '2025-10-07 21:34:34'),
(525, 11, 'refresh', '6ACSFl7fbZCifo1L7p-KhyljiHFHA_K47Vbg-opMfSY=', '2025-11-06 20:34:36', 1, 'Chrome Browser / web', '202.28.118.117', '2025-10-07 21:34:36', '2025-10-07 21:34:44'),
(526, 12, 'refresh', 'HeGxNMi0SZWXgg1UwgijkpOlDRgCmXZoRIf0PrvXiso=', '2025-11-06 20:34:47', 1, 'Chrome Browser / web', '202.28.118.117', '2025-10-07 21:34:47', '2025-10-07 21:34:57'),
(527, 8, 'refresh', 'ZS1HSfV6EbCHWZjePeQ2y5nYfkAjto9YDIeRMdiiWKI=', '2025-11-06 20:35:01', 1, 'Chrome Browser / web', '202.28.118.117', '2025-10-07 21:35:01', '2025-10-07 22:11:04'),
(528, 13, 'refresh', 'qvPszXSELYFEk_wdwwiYwYIBlo3OvMsExASnu6xHt88=', '2025-11-06 21:11:06', 1, 'Chrome Browser / web', '202.28.118.117', '2025-10-07 22:11:06', '2025-10-07 22:11:25'),
(529, 11, 'refresh', 'n52cRFhjArlreIiNFMa25JAEePBCN7spvaffsbSWPFI=', '2025-11-06 21:11:28', 1, 'Chrome Browser / web', '202.28.118.117', '2025-10-07 22:11:28', '2025-10-07 22:13:27'),
(530, 13, 'refresh', '7-ZQXONlFD6wyiEwBPFNZ2pPRX8rnvV4suuATexk9X0=', '2025-11-06 21:13:31', 1, 'Chrome Browser / web', '202.28.118.117', '2025-10-07 22:13:31', '2025-10-07 22:20:41'),
(531, 7, 'refresh', '3sCK85np6SpmRjWRqTPUuiHr6SkIIqCEiEdm6zwLccw=', '2025-11-06 21:20:43', 1, 'Chrome Browser / web', '202.28.118.117', '2025-10-07 22:20:43', '2025-10-07 22:34:54'),
(532, 8, 'refresh', 'lH4JYzu9flScsj3k3EhixhMAauAWcDSBBO2RedqRqOE=', '2025-11-06 21:34:56', 1, 'Chrome Browser / web', '202.28.118.117', '2025-10-07 22:34:56', '2025-10-07 22:35:52'),
(533, 7, 'refresh', 'kAS0gYM4rZz2AMBN1ry8LBWVKwypb_gBjkaUjD4xj_4=', '2025-11-06 21:35:55', 1, 'Chrome Browser / web', '202.28.118.117', '2025-10-07 22:35:55', '2025-10-07 22:53:22'),
(534, 8, 'refresh', 'Za4irw-5PFCicpPttGn347zFt4LqEDyjduhPON8knUA=', '2025-11-06 21:42:12', 1, 'Chrome Browser / web', '27.145.211.4', '2025-10-07 22:42:12', '2025-10-07 23:00:04'),
(535, 13, 'refresh', 'oADnfOmxMTWdcfd8JQFjmpJr6oKlH3968_G2dipHN-A=', '2025-11-06 21:53:24', 1, 'Chrome Browser / web', '202.28.118.117', '2025-10-07 22:53:24', '2025-10-07 22:53:36'),
(536, 11, 'refresh', 'KfiqkFTQwT7Z5Ui7U4pLyOaxw8YAQ5FCjQOg926zaEo=', '2025-11-06 21:53:38', 1, 'Chrome Browser / web', '202.28.118.117', '2025-10-07 22:53:38', '2025-10-07 23:14:14'),
(537, 7, 'refresh', 'PUV_ITJBCXNPraj1NHrjwtTH9NFubqdD7K_ze6Zry5w=', '2025-11-06 22:00:09', 1, 'Chrome Browser / web', '27.145.211.4', '2025-10-07 23:00:09', '2025-10-07 23:11:56'),
(538, 8, 'refresh', 'XEPtlUIhpmZZlQ42JZqymGcJKL3oA8cvZqBAvmG0eQc=', '2025-11-06 22:12:02', 1, 'Chrome Browser / web', '27.145.211.4', '2025-10-07 23:12:02', '2025-10-07 23:43:42'),
(539, 8, 'refresh', 'UTu4nsnKg_5NtiHv4ZJg4gjTPVhkcSB6KbdFnJJmDLU=', '2025-11-06 22:14:17', 1, 'Chrome Browser / web', '202.28.118.117', '2025-10-07 23:14:17', '2025-10-07 23:34:38'),
(540, 13, 'refresh', 'YwL7nqYRe343zfvBtOU5NaXbVJE8B2WHeWVaxQ5sTjg=', '2025-11-06 22:34:43', 1, 'Chrome Browser / web', '58.10.78.71', '2025-10-07 23:34:43', '2025-10-07 23:35:33'),
(541, 7, 'refresh', 'H6YjMxFpnDlbXNK4ADhCeRBgSXkMpMEKN9P0z0StM5o=', '2025-11-06 22:35:37', 0, 'Chrome Browser / web', '58.10.78.71', '2025-10-07 23:35:37', '2025-10-07 23:35:37'),
(542, 7, 'refresh', 'PwuX9AhjRzCbh3wJIpl3l5OTiJfCFgGasE8HnDZf_KQ=', '2025-11-06 22:43:48', 1, 'Chrome Browser / web', '27.145.211.4', '2025-10-07 23:43:48', '2025-10-07 23:48:23'),
(543, 8, 'refresh', 'fwYkJqHWvPYk8dVkmjmX2QXFjL4l0SqPlqChGatFFeg=', '2025-11-06 22:48:29', 1, 'Chrome Browser / web', '27.145.211.4', '2025-10-07 23:48:29', '2025-10-08 00:02:15'),
(544, 7, 'refresh', '9K-9t9P6LbscsXmYgzrgyflijok-edrVDHmAOV0VLvQ=', '2025-11-06 23:02:19', 1, 'Chrome Browser / web', '27.145.211.4', '2025-10-08 00:02:19', '2025-10-08 00:02:25'),
(545, 8, 'refresh', '-BrAWxGM3QMk3pI419qGzdWrz5ovTkqK0QHP8iA0oYE=', '2025-11-06 23:02:30', 0, 'Chrome Browser / web', '27.145.211.4', '2025-10-08 00:02:30', '2025-10-08 00:02:30'),
(546, 8, 'refresh', 'HB-9BKdBJjMB0I9d6zl0oWa2BVudwFIwzJJRqTRbuYE=', '2025-11-07 09:35:56', 1, 'Chrome Browser / web', '58.10.78.71', '2025-10-08 10:35:56', '2025-10-08 10:36:03'),
(547, 8, 'refresh', 'YQWKXdKRCBStDsfl3Yj-qi0r3TDUOHqRJS9Me5NoxwM=', '2025-11-07 09:36:43', 1, 'Chrome Browser / web', '58.10.78.71', '2025-10-08 10:36:43', '2025-10-08 10:36:52'),
(548, 7, 'refresh', 'kcZDJpSHblX1_-lvezQs3Osz-MXfwBOVUCJRBF-elzc=', '2025-11-07 09:36:54', 1, 'Chrome Browser / web', '58.10.78.71', '2025-10-08 10:36:54', '2025-10-08 10:46:28'),
(549, 8, 'refresh', 'qo6mhfDCBKKCvFyoKDWyIDF8rPY1NFjEsZbECI2GZYo=', '2025-11-07 09:46:29', 1, 'Chrome Browser / web', '58.10.78.71', '2025-10-08 10:46:29', '2025-10-08 10:54:42'),
(550, 7, 'refresh', 'bg0nMvEnI2uU49Dv5DvP_siTtDafyGNG5kwyHfNIZwo=', '2025-11-07 09:54:45', 1, 'Chrome Browser / web', '58.10.78.71', '2025-10-08 10:54:45', '2025-10-08 11:00:34'),
(551, 8, 'refresh', 'DYI9uHshLBqTjNVK3qLQusNlwsfMr3ztikz5qhov1jg=', '2025-11-07 10:00:36', 1, 'Chrome Browser / web', '58.10.78.71', '2025-10-08 11:00:36', '2025-10-08 11:37:56'),
(552, 11, 'refresh', 'nQ3LBCHVE6g8sD4x__3Oqe7YtNYOxNaJOmbcmPSpolA=', '2025-11-07 10:37:58', 0, 'Chrome Browser / web', '202.12.97.155', '2025-10-08 11:37:58', '2025-10-08 11:37:58'),
(553, 12, 'refresh', 'hi8II-R8q0YYXYCFHfHKQsy1I3EqSrJnV8-t7RFL_IM=', '2025-11-07 10:43:30', 1, 'Chrome Browser / web', '202.12.97.155', '2025-10-08 11:43:30', '2025-10-08 11:43:32'),
(554, 8, 'refresh', 'Diln7GXM7K9KBlluRmvKxy14qDDkZgsnc32KBh8YtIQ=', '2025-11-07 10:43:34', 0, 'Chrome Browser / web', '202.12.97.155', '2025-10-08 11:43:34', '2025-10-08 11:43:34'),
(555, 8, 'refresh', '8vcB7L4INZKrGsm1JILTlWrg3m5DQQ8DVL41DGSi1w4=', '2025-11-07 10:44:00', 0, 'Chrome Browser / web', '202.28.118.102', '2025-10-08 11:44:00', '2025-10-08 11:44:00'),
(556, 11, 'refresh', 'JfTetNm84BwVPOJUq2NHeMWlylBDdkVesZVrc0tn4Qo=', '2025-11-07 14:20:15', 1, 'Chrome Browser / web', '58.10.78.71', '2025-10-08 15:20:15', '2025-10-08 15:20:16'),
(557, 12, 'refresh', 'PT_2rkCNixwvwXXTlrwb903uo4WP5okZX6B5JAfl6yQ=', '2025-11-07 14:20:20', 0, 'Chrome Browser / web', '58.10.78.71', '2025-10-08 15:20:20', '2025-10-08 15:20:20'),
(558, 8, 'refresh', 'iNAobFNu94z6d0k4x0nurmE0rlUk4Gap-h4npxo-muY=', '2025-11-07 15:14:23', 1, 'Chrome Browser / web', '202.28.118.102', '2025-10-08 16:14:23', '2025-10-08 16:54:41'),
(559, 7, 'refresh', 'r5gWBlBHKIODT5DXo_MPB1AD5VZDE_NtPrnB4MWiz7U=', '2025-11-07 15:55:09', 0, 'Chrome Browser / web', '202.28.118.102', '2025-10-08 16:55:09', '2025-10-08 16:55:09'),
(560, 7, 'refresh', 'lIg8GyUP5e0JvpauBhux4pnyB_aqD6n4nQpm7C8aUL4=', '2025-11-08 07:41:29', 1, 'Chrome Browser / web', '27.145.211.4', '2025-10-09 08:41:29', '2025-10-09 11:28:27'),
(561, 13, 'refresh', 'wwqplY3_sDdpkKLHivn28fWLxUu6V-Bi75udefpiYD8=', '2025-11-08 08:33:59', 1, 'Chrome Browser / web', '58.10.78.71', '2025-10-09 09:33:59', '2025-10-09 09:50:26'),
(562, 13, 'refresh', '0SqObYeeFyQ74fPC_NR0tT8loUbJvGux6yoejbhZqtM=', '2025-11-08 08:50:30', 1, 'Chrome Browser / web', '58.10.78.71', '2025-10-09 09:50:30', '2025-10-09 09:50:34'),
(563, 11, 'refresh', 'qUAXoP2t-M2gQmaydOHxeiMxU8z81TTmGg8y2RrS_QQ=', '2025-11-08 08:50:37', 1, 'Chrome Browser / web', '58.10.78.71', '2025-10-09 09:50:37', '2025-10-09 10:11:22'),
(564, 7, 'refresh', 'YKHKvSgHha-woZWnUc8F7m4FgnBVM2z2VBJcMF7vNVg=', '2025-11-08 09:11:25', 1, 'Chrome Browser / web', '58.10.78.71', '2025-10-09 10:11:25', '2025-10-09 10:11:39'),
(565, 13, 'refresh', 'FZ9tm3LXUORJXNSoxUngX2xDhMSYLkDeOEYkiyZ4HNg=', '2025-11-08 09:11:42', 1, 'Chrome Browser / web', '58.10.78.71', '2025-10-09 10:11:42', '2025-10-09 10:11:53'),
(566, 7, 'refresh', 'zZqtSGkaDf1KqhIjViBgcxo51GFnnt9Mx960aWfnifk=', '2025-11-08 09:11:56', 1, 'Chrome Browser / web', '58.10.78.71', '2025-10-09 10:11:56', '2025-10-09 10:12:08'),
(567, 8, 'refresh', '_0Gxd3arNyiwy0LxS2VAS_MjayIhPZeqmAOGS-GRzss=', '2025-11-08 09:12:11', 1, 'Chrome Browser / web', '58.10.78.71', '2025-10-09 10:12:11', '2025-10-09 10:14:16'),
(568, 13, 'refresh', 'LZOeKCuzQFAoXLcJUGhReRBU9fomZTpEJP8ip3BuPww=', '2025-11-08 09:14:18', 1, 'Chrome Browser / web', '58.10.78.71', '2025-10-09 10:14:18', '2025-10-09 10:14:42'),
(569, 8, 'refresh', 'zJPsikocqVDqt8d5w60SOM9OTicfqK3-HxkY1XjMK5o=', '2025-11-08 09:14:45', 1, 'Chrome Browser / web', '58.10.78.71', '2025-10-09 10:14:45', '2025-10-09 10:14:46'),
(570, 7, 'refresh', 'uC49aNl1fUAb7QbdIFm-cbBOx3fNxivoip-hvzZNOsM=', '2025-11-08 09:14:48', 1, 'Chrome Browser / web', '58.10.78.71', '2025-10-09 10:14:48', '2025-10-09 10:17:57'),
(571, 8, 'refresh', 'iBNRy1Na5R3jSlvEcbEqC_uP7lgHJlgemHobOAWj9is=', '2025-11-08 09:18:00', 1, 'Chrome Browser / web', '58.10.78.71', '2025-10-09 10:18:00', '2025-10-09 10:18:47'),
(572, 7, 'refresh', 'EkHpV4R4XdPwX5xGnhoRytTuq4SKSVzLSQ1TXB_8YVE=', '2025-11-08 09:18:50', 1, 'Chrome Browser / web', '58.10.78.71', '2025-10-09 10:18:50', '2025-10-09 10:40:58'),
(573, 8, 'refresh', 'nakZBbrb_iQqiAOc41NCbwhz2XqtPYihC35wk1UBNq4=', '2025-11-08 09:41:00', 1, 'Chrome Browser / web', '58.10.78.71', '2025-10-09 10:41:00', '2025-10-09 10:41:59'),
(574, 13, 'refresh', 'bzemOhd6zeO7EBWgPzHP7vkBVSvI78RPoNDPD3KInFM=', '2025-11-08 09:42:02', 1, 'Chrome Browser / web', '58.10.78.71', '2025-10-09 10:42:02', '2025-10-09 10:42:13'),
(575, 11, 'refresh', 'jNoKqMEUwxlot4k64IaA-sBaakJyvVeCfCfHuAN9C5g=', '2025-11-08 09:42:16', 1, 'Chrome Browser / web', '58.10.78.71', '2025-10-09 10:42:16', '2025-10-09 11:22:53'),
(576, 8, 'refresh', 'asGgA4bSBShoP82RpfAGiQXkXLj82iJdZRw1SRDOtIg=', '2025-11-08 10:22:57', 0, 'Chrome Browser / web', '58.10.78.71', '2025-10-09 11:22:57', '2025-10-09 11:22:57'),
(577, 13, 'refresh', 'aTJdOt6Vw8Io03Qs_M4n5Y2X5eBz32OpYt9vAC1jzlc=', '2025-11-08 10:28:32', 1, 'Chrome Browser / web', '202.12.97.144', '2025-10-09 11:28:32', '2025-10-09 11:29:03'),
(578, 7, 'refresh', 'FhjguG7oHa9VdTmWLUFD1zMT0CAsiB1J8tT5EuaLmhI=', '2025-11-08 10:29:14', 1, 'Chrome Browser / web', '202.12.97.144', '2025-10-09 11:29:14', '2025-10-09 12:57:14'),
(579, 8, 'refresh', '6YvZqeSRD9P2C7fpM2HuykjApBM9o-1K_tkqIaSKH9U=', '2025-11-08 11:25:04', 1, 'Chrome Browser / web', '58.10.78.71', '2025-10-09 12:25:04', '2025-10-09 12:50:12'),
(580, 8, 'refresh', 'NOZlX5a18f3G7OY8kO-Y8f_ipKh10nfjybdOIhKlhT8=', '2025-11-08 11:50:14', 0, 'Chrome Browser / web', '58.10.78.71', '2025-10-09 12:50:14', '2025-10-09 12:50:14'),
(581, 8, 'refresh', 'a-r_jZyNfGU1gDE2BQsUYBVqutus1uxRPNhBfnSvxS0=', '2025-11-08 11:57:24', 1, 'Chrome Browser / web', '202.12.97.144', '2025-10-09 12:57:24', '2025-10-09 13:21:02'),
(582, 7, 'refresh', 'DvldHRaASiU3yY1FFyQNf0ruflBRkTDt3JoCvkSYZE0=', '2025-11-08 12:21:07', 0, 'Chrome Browser / web', '202.12.97.144', '2025-10-09 13:21:07', '2025-10-09 13:21:07'),
(583, 7, 'refresh', '5YPyAQRKhre5cnKzkG_m0zAffBdAEPPNe68YEZ35-cs=', '2025-11-08 17:48:26', 0, 'Chrome Browser / web', '58.10.148.203', '2025-10-09 18:48:26', '2025-10-09 18:48:26'),
(584, 7, 'refresh', 'spa-bEZWtIdSuj-U4KFhQ0o4UkLVq-ioUZ012vAmKYc=', '2025-11-09 10:07:42', 1, 'Chrome Browser / web', '202.28.118.108', '2025-10-10 11:07:42', '2025-10-10 11:39:19'),
(585, 7, 'refresh', 'TMXFwiv910T4mtnYXYSztmEU3pqkSd4EnXwmNJsfnqo=', '2025-11-09 10:23:17', 1, 'Chrome Browser / web', '110.168.236.118', '2025-10-10 11:23:17', '2025-10-10 11:59:41'),
(586, 8, 'refresh', 'KIdKrRGrGxgjyool6BP573JytNbCdLnJkw9YZ-OlK0M=', '2025-11-09 10:39:22', 1, 'Chrome Browser / web', '202.28.118.108', '2025-10-10 11:39:22', '2025-10-10 12:08:13'),
(587, 8, 'refresh', '6Rum9aPTNhF8BMoxxyqbrJFU01A9c_gk5OLqWDFKI04=', '2025-11-09 10:59:51', 1, 'Chrome Browser / web', '110.168.236.118', '2025-10-10 11:59:51', '2025-10-10 12:32:13'),
(588, 7, 'refresh', 'PGdGbwByS7DmalIpopyPOrVFXOwMAvp0ehoUcrsZkMo=', '2025-11-09 11:08:15', 0, 'Chrome Browser / web', '202.28.118.108', '2025-10-10 12:08:15', '2025-10-10 12:08:15'),
(589, 7, 'refresh', '5odYEUzUBEoMcYkYIAkhVO15lB41sWo__dawuu53eFI=', '2025-11-09 11:32:29', 0, 'Chrome Browser / web', '110.168.236.118', '2025-10-10 12:32:29', '2025-10-10 12:32:29'),
(590, 7, 'refresh', 'GvZDvZZWZI7ZIVz2_w-1PceduYGXkGnHdITOGogbSp8=', '2025-11-09 12:34:17', 1, 'Chrome Browser / web', '110.168.236.118', '2025-10-10 13:34:17', '2025-10-10 21:02:36'),
(591, 7, 'refresh', 'xDl2afwcxj3p_YwwAIns4T3Z8fISLiAVcMlWgd1KXn4=', '2025-11-09 12:38:04', 1, 'Chrome Browser / web', '202.28.118.108', '2025-10-10 13:38:04', '2025-10-10 14:19:03'),
(592, 8, 'refresh', 'zSIm3vDsCkrHzjjm4oNeMEMernR2fEyiBHjdHoNKKSw=', '2025-11-09 13:19:05', 1, 'Chrome Browser / web', '202.28.118.108', '2025-10-10 14:19:05', '2025-10-10 14:28:32'),
(593, 8, 'refresh', 'ZtGtJrHnnGsMI5KvPCbzwGscgnCkHYyWIGVHGX-Rnc8=', '2025-11-09 13:28:34', 1, 'Chrome Browser / web', '202.28.118.108', '2025-10-10 14:28:34', '2025-10-10 14:33:13'),
(594, 13, 'refresh', 'WalVQjtx0RabzBm8_4i_Fj2D-3fYZpN3KNGIONUeqDE=', '2025-11-09 13:33:16', 1, 'Chrome Browser / web', '202.28.118.108', '2025-10-10 14:33:16', '2025-10-10 14:36:10'),
(595, 11, 'refresh', 'ktKjYvl4CSym8rORm7sH-zSSnC-r-Xn64rS4Ffy_wDY=', '2025-11-09 13:36:13', 1, 'Chrome Browser / web', '202.28.118.108', '2025-10-10 14:36:13', '2025-10-10 15:24:56'),
(596, 7, 'refresh', '4oaDjP7GSYhbFP7pqgF5_XijQFKPe5IdIzl7DEu5blU=', '2025-11-09 14:26:19', 1, 'Chrome Browser / web', '202.28.118.108', '2025-10-10 15:26:19', '2025-10-10 17:08:03'),
(597, 8, 'refresh', 'TLqjmvsp1W-4ZGj4wVamTnJN43h7RqRGqDoOvBjHzuw=', '2025-11-09 16:08:05', 1, 'Chrome Browser / web', '202.28.118.108', '2025-10-10 17:08:05', '2025-10-10 18:17:16'),
(598, 7, 'refresh', 'DFyHEZ8m0oGfAr-Xryxhcv9-NslRGna_DT1mfvgB7B0=', '2025-11-09 17:17:18', 0, 'Chrome Browser / web', '202.28.118.108', '2025-10-10 18:17:18', '2025-10-10 18:17:18'),
(599, 8, 'refresh', 'PrUfKiEe_4_YdVfo1mMxa0kS_9Fh9qvsywOe6qlz3Cs=', '2025-11-09 20:02:42', 1, 'Chrome Browser / web', '110.168.236.118', '2025-10-10 21:02:42', '2025-10-10 21:04:01'),
(600, 8, 'refresh', 'J2o5x7tIWRqqqPXx419whCx9c4Y_EXRpPBAoUhxtqF8=', '2025-11-09 20:04:06', 1, 'Chrome Browser / web', '110.168.236.118', '2025-10-10 21:04:06', '2025-10-10 21:04:11'),
(601, 7, 'refresh', 'TliIn15YthjVsy2VYs46WHgewFpi3zv3GIlMKFC0YPU=', '2025-11-09 20:04:18', 1, 'Chrome Browser / web', '110.168.236.118', '2025-10-10 21:04:19', '2025-10-10 21:04:34'),
(602, 8, 'refresh', '6d_tieKERmmw6wVojeyUG-3et0ciRJeEE2UKhTC5AtU=', '2025-11-09 20:04:44', 0, 'Chrome Browser / web', '110.168.236.118', '2025-10-10 21:04:44', '2025-10-10 21:04:44'),
(603, 8, 'refresh', 'oP3XDzW8NoV8LoRuviYuRg0CLT2__Ggoy9PSPvETAfM=', '2025-11-09 20:18:28', 1, 'Chrome Browser / web', '58.10.78.71', '2025-10-10 21:18:28', '2025-10-10 21:18:33'),
(604, 7, 'refresh', 'ykrDVB1e3KWAapW0yF5pAWpcF2VvZ6YJzKt9y8XebcU=', '2025-11-09 20:18:35', 0, 'Chrome Browser / web', '58.10.78.71', '2025-10-10 21:18:35', '2025-10-10 21:18:35'),
(605, 7, 'refresh', '6Dy-zwmgNzUOFxYKhoR6E11NSw1UrsBPW71G7y77OEY=', '2025-11-10 09:42:14', 1, 'Chrome Browser / web', '58.11.0.123', '2025-10-11 10:42:14', '2025-10-11 11:20:50'),
(606, 7, 'refresh', 'jbtlMkAXU5crhonJL6fp70CuAXE58xThDvvEJgzamwY=', '2025-11-10 09:48:17', 1, 'Chrome Browser / web', '58.10.78.71', '2025-10-11 10:48:17', '2025-10-11 10:48:27'),
(607, 8, 'refresh', 'g_57vUOUlpTXm-6PqemCrfGRwSAhbPf9Lvl27RT-PM4=', '2025-11-10 09:48:30', 1, 'Chrome Browser / web', '58.10.78.71', '2025-10-11 10:48:30', '2025-10-11 11:52:03'),
(608, 7, 'refresh', '4qsTngj6XFVrsk5cV6-H6yFnJUHbwdIhMuek0T0dtKI=', '2025-11-10 10:21:43', 1, 'Chrome Browser / web', '58.11.0.123', '2025-10-11 11:21:43', '2025-10-11 11:33:29'),
(609, 8, 'refresh', 'n-OgKVa_I_OFhzeUC1yTCmj2f83CRYUV9tYBaADq55s=', '2025-11-10 10:33:36', 1, 'Chrome Browser / web', '58.11.0.123', '2025-10-11 11:33:36', '2025-10-11 11:50:55'),
(610, 8, 'refresh', 'bV1xMscLjC3ynJvm61x_UWG3Lh5nEEHY2wjDHZypIuM=', '2025-11-10 10:51:04', 1, 'Chrome Browser / web', '58.11.0.123', '2025-10-11 11:51:04', '2025-10-11 12:22:04'),
(611, 8, 'refresh', 'YSRaPvchanuprdlu5EfgGnFtj5otTgel39CLZLaBhQQ=', '2025-11-10 10:52:07', 0, 'Chrome Browser / web', '202.28.118.73', '2025-10-11 11:52:07', '2025-10-11 11:52:07'),
(612, 7, 'refresh', 'jQn_oBnWBTK9QKMT8ITFCePAWTNxKe7lv0CpTFbS4nM=', '2025-11-10 11:22:12', 1, 'Chrome Browser / web', '58.11.0.123', '2025-10-11 12:22:12', '2025-10-11 13:34:20'),
(613, 8, 'refresh', '87EmKoXJ-MmKNWauX3bHiQmM5UEMci-SFFSjMrA59v4=', '2025-11-10 12:12:44', 1, 'Chrome Browser / web', '202.28.118.73', '2025-10-11 13:12:44', '2025-10-11 13:44:33'),
(614, 8, 'refresh', 'U_SJP4NWvRiHrmOdeZ97OT69jTatWn1VIDRAsskcFJ8=', '2025-11-10 12:34:27', 1, 'Chrome Browser / web', '58.11.0.123', '2025-10-11 13:34:27', '2025-10-11 13:38:38'),
(615, 7, 'refresh', '_4bUNh4Llcq_0SjbYi-r75mDi5GXemRvDqJsMVNDZdc=', '2025-11-10 12:38:43', 1, 'Chrome Browser / web', '58.11.0.123', '2025-10-11 13:38:43', '2025-10-11 14:31:50'),
(616, 7, 'refresh', '5t07uOpt8Uqa5vvrHuuQ8oq9DKwv1Swvl5BOIyNa3Xo=', '2025-11-10 12:44:36', 1, 'Chrome Browser / web', '202.28.118.73', '2025-10-11 13:44:36', '2025-10-11 13:45:36'),
(617, 8, 'refresh', '7AIxySd7DwDPuFUu9AY80_7-sBU2aEzfUc19I-LNLI4=', '2025-11-10 12:45:38', 1, 'Chrome Browser / web', '202.28.118.73', '2025-10-11 13:45:38', '2025-10-11 13:45:53'),
(618, 7, 'refresh', 'zUAXMOD8yCAVjwE3gr7rACU7NnUUcS1tPjzLKi1o77I=', '2025-11-10 12:45:55', 1, 'Chrome Browser / web', '202.28.118.73', '2025-10-11 13:45:55', '2025-10-11 13:46:10'),
(619, 8, 'refresh', 'U7ro8frsrBhpSuI3as8l1nOB_k8gd2S2fvxpw-EaY6A=', '2025-11-10 12:46:12', 1, 'Chrome Browser / web', '202.28.118.73', '2025-10-11 13:46:12', '2025-10-11 14:00:11'),
(620, 13, 'refresh', 'XllWb37RxKZ_m2mYOEVZiuVLjsCA3gFtOe203qPVZfA=', '2025-11-10 13:00:14', 1, 'Chrome Browser / web', '202.28.118.73', '2025-10-11 14:00:14', '2025-10-11 14:08:12'),
(621, 8, 'refresh', 'JCBhdNsUIOuVSHZdXTyGrpjg2f8X9vAFpW8RDQtN2Yk=', '2025-11-10 13:08:23', 1, 'Chrome Browser / web', '202.28.118.73', '2025-10-11 14:08:23', '2025-10-11 15:36:32'),
(622, 8, 'refresh', 'ZloEIxqhhZKPZsztliHLYQBQzH9daXvKBaibMGnsON8=', '2025-11-10 13:31:55', 1, 'Chrome Browser / web', '58.11.0.123', '2025-10-11 14:31:55', '2025-10-11 14:58:40'),
(623, 7, 'refresh', 'WDfUXTPtMlEg_l9XLcmgiq6C_tTmepSawXHkloS4OdU=', '2025-11-10 13:58:45', 0, 'Chrome Browser / web', '58.11.0.123', '2025-10-11 14:58:45', '2025-10-11 14:58:45'),
(624, 7, 'refresh', '-ZXe8da2BYk5QgYxiCaowTRkRdZXY7SDFtywHH1agB8=', '2025-11-10 14:36:34', 1, 'Chrome Browser / web', '202.28.118.73', '2025-10-11 15:36:34', '2025-10-11 15:42:17'),
(625, 8, 'refresh', 'zn7qAEO42GdCIFMdWwREaSZ_TgJwwyfQH9xTBX0rBWE=', '2025-11-10 14:42:19', 0, 'Chrome Browser / web', '202.28.118.73', '2025-10-11 15:42:19', '2025-10-11 15:42:19'),
(626, 7, 'refresh', 'R3M2Cj7xm5bJovNo797E2dMnS_Ct4832X6cqH7l_NPo=', '2025-11-10 15:28:34', 0, 'Chrome Browser / web', '58.11.0.123', '2025-10-11 16:28:34', '2025-10-11 16:28:34'),
(627, 7, 'refresh', '1yCoseXE58ce3N040Og4RpR8P8l2QTlRqeRJVrLlVAs=', '2025-11-10 17:42:40', 1, 'Chrome Browser / web', '58.11.0.123', '2025-10-11 18:42:40', '2025-10-11 20:29:02'),
(628, 13, 'refresh', '6T15Y3aBrHPmdHWGFSmkCD4URmDU0bMFdTqkvuVJM1I=', '2025-11-10 18:30:03', 1, 'Chrome Browser / web', '58.10.78.71', '2025-10-11 19:30:03', '2025-10-11 19:30:19'),
(629, 7, 'refresh', 'sKniwpdjklTuWX5L12eyi1MXt0vLQezUZ_gVThZwDes=', '2025-11-10 18:30:22', 1, 'Chrome Browser / web', '58.10.78.71', '2025-10-11 19:30:22', '2025-10-11 19:30:55'),
(630, 13, 'refresh', '6-xJ6wAw6lrTwG8SYxW4ry9XHLcfaAz7SP1_HOD_zAc=', '2025-11-10 18:31:00', 1, 'Chrome Browser / web', '58.10.78.71', '2025-10-11 19:31:00', '2025-10-11 19:31:14');
INSERT INTO `user_tokens` (`token_id`, `user_id`, `token_type`, `token`, `expires_at`, `is_revoked`, `device_info`, `ip_address`, `created_at`, `updated_at`) VALUES
(631, 7, 'refresh', 'oLB-fSN7dmz2k6pFJpu7xvV2lSa6Pm4CwL2kEp7kzOQ=', '2025-11-10 18:31:16', 1, 'Chrome Browser / web', '58.10.78.71', '2025-10-11 19:31:16', '2025-10-11 20:39:50'),
(632, 8, 'refresh', 't1-DhGo4u_OFGrqx31oAQwDdPZ60dVCk0lmhe6XOYgA=', '2025-11-10 19:29:52', 1, 'Chrome Browser / web', '58.11.0.123', '2025-10-11 20:29:52', '2025-10-11 20:39:10'),
(633, 7, 'refresh', '8SjPO_4B5iIYnnw3XRD1RetvRHjnZvVoqu1tK90__38=', '2025-11-10 19:39:15', 1, 'Chrome Browser / web', '58.11.0.123', '2025-10-11 20:39:15', '2025-10-11 21:11:26'),
(634, 8, 'refresh', 'ipu9CTKGkh4gtkwe7aSDkT_KUYRbZFXxq_TUj44HwIM=', '2025-11-10 19:39:52', 1, 'Chrome Browser / web', '202.12.97.208', '2025-10-11 20:39:52', '2025-10-11 20:48:04'),
(635, 7, 'refresh', '0l67BFfRIEV0k2azSiVpl08Z1gV9cZcoXxTWyk5H1Hg=', '2025-11-10 19:48:07', 1, 'Chrome Browser / web', '202.12.97.208', '2025-10-11 20:48:07', '2025-10-11 21:00:17'),
(636, 8, 'refresh', 'MWjIdYTfXWxDrixHq3-ucJ1rBxwAMotrayRiGEku2Qk=', '2025-11-10 20:00:21', 1, 'Chrome Browser / web', '202.12.97.208', '2025-10-11 21:00:21', '2025-10-11 21:27:54'),
(637, 13, 'refresh', 'Zs2aDqJZh-7xtVzQrSTfpglHdn3FAdDGpP5xRJEswNo=', '2025-11-10 20:11:33', 1, 'Chrome Browser / web', '202.28.119.61', '2025-10-11 21:11:33', '2025-10-11 21:15:37'),
(638, 7, 'refresh', 'BwHxFxZF6N0A3tSEucBmNV_tvLRG4Kx2OBZBluyDmBo=', '2025-11-10 20:15:44', 1, 'Chrome Browser / web', '202.28.119.61', '2025-10-11 21:15:44', '2025-10-11 21:16:49'),
(639, 8, 'refresh', '70lp3mJUuPHciFPjQBuia8wORSr9AVcv4uwXfXC25eg=', '2025-11-10 20:16:54', 1, 'Chrome Browser / web', '202.28.119.61', '2025-10-11 21:16:54', '2025-10-11 21:17:48'),
(640, 7, 'refresh', 'HZMhipFSPu5paM0rf7OH-07xFMAmvXhm1JidkbTZcSQ=', '2025-11-10 20:17:54', 1, 'Chrome Browser / web', '202.28.119.61', '2025-10-11 21:17:54', '2025-10-11 21:19:20'),
(641, 8, 'refresh', 'z6jvWkI4pXx4Gm26OzOCkaH7J0lFnEEWJr3dddK2EXY=', '2025-11-10 20:19:29', 1, 'Chrome Browser / web', '202.28.119.61', '2025-10-11 21:19:29', '2025-10-11 21:23:53'),
(642, 8, 'refresh', 'bwVTZ9JP-dthVA-Gd-o2J0Wp4G9hqze9w1wDj73k3QQ=', '2025-11-10 20:24:02', 1, 'Chrome Browser / web', '202.28.119.61', '2025-10-11 21:24:02', '2025-10-11 21:42:14'),
(643, 7, 'refresh', 'rrC8Y5m5BkkALT_PWWJ8YwSt3vbBJJ44_NuPKabwsoc=', '2025-11-10 20:28:09', 1, 'Chrome Browser / web', '202.12.97.208', '2025-10-11 21:28:09', '2025-10-11 21:28:28'),
(644, 8, 'refresh', 'm0O_HSTu28T2Qguzy54zI1v-bZQaIMJbQ7plwELQ4Y4=', '2025-11-10 20:28:31', 0, 'Chrome Browser / web', '202.12.97.208', '2025-10-11 21:28:31', '2025-10-11 21:28:31'),
(645, 13, 'refresh', 'qQ_VJwHrzBgy2CBqN1duakdVxwRAP1hlg2nY4hcAIec=', '2025-11-10 20:42:20', 1, 'Chrome Browser / web', '202.28.119.61', '2025-10-11 21:42:20', '2025-10-11 21:43:06'),
(646, 8, 'refresh', 'dpglakZjrK-kNkT8fCYYP1-ZCSdRQSjPUho9DDjfse0=', '2025-11-10 20:43:26', 1, 'Chrome Browser / web', '202.28.119.61', '2025-10-11 21:43:26', '2025-10-11 21:56:11'),
(647, 7, 'refresh', 'FP4QVFwq54WKfElGrr-UwO5euLHO8PO-53x5DWi9vpA=', '2025-11-10 20:56:15', 1, 'Chrome Browser / web', '202.28.119.61', '2025-10-11 21:56:15', '2025-10-11 21:58:31'),
(648, 8, 'refresh', 'uLJBvtJUmsb0yeyzJN570zolAi2XknundfIVNGx3o6E=', '2025-11-10 20:58:35', 1, 'Chrome Browser / web', '202.28.119.61', '2025-10-11 21:58:35', '2025-10-11 22:06:00'),
(649, 7, 'refresh', 'RA4XPaBwFbhc-cTgOCWhSeSbR5EqJiRn2McVBjyF4pA=', '2025-11-10 21:06:04', 1, 'Chrome Browser / web', '202.28.119.61', '2025-10-11 22:06:04', '2025-10-11 22:23:29'),
(650, 8, 'refresh', 'XxHBbdjwIeWbEJ-D2BSF56LkOq4TA839HJJFElTU2SM=', '2025-11-10 21:23:37', 1, 'Chrome Browser / web', '202.28.119.61', '2025-10-11 22:23:37', '2025-10-11 23:14:42'),
(651, 8, 'refresh', 'fAd02v5bhCVipKiFTF9N1LKYuuXu_m8D7CVnzhIPgQE=', '2025-11-10 21:36:09', 0, 'Chrome Browser / web', '202.12.97.208', '2025-10-11 22:36:09', '2025-10-11 22:36:09'),
(652, 12, 'refresh', 'OazTeeAsX35eJddKI3KIfxXRgPcIQCpHLhy2XdjjF3o=', '2025-11-10 22:14:52', 1, 'Chrome Browser / web', '202.28.119.61', '2025-10-11 23:14:52', '2025-10-11 23:36:39'),
(653, 8, 'refresh', 'JxeL0bPDfVZD835UjBXY910GdtKBguVEvP9yugOL_Ck=', '2025-11-10 22:36:44', 1, 'Chrome Browser / web', '202.28.119.61', '2025-10-11 23:36:44', '2025-10-11 23:49:34'),
(654, 12, 'refresh', 'DO6Dv4mi35Cyh8s5dzG2yWxa6M3QIPJf5c-2WkJ7eBI=', '2025-11-10 22:49:40', 0, 'Chrome Browser / web', '202.28.119.61', '2025-10-11 23:49:40', '2025-10-11 23:49:40'),
(655, 7, 'refresh', 'hFz5ve3XVwqLh1v8WKPvMhjZjLpO0N_ywkG21heCPXk=', '2025-11-11 07:02:48', 1, 'Chrome Browser / web', '202.28.118.112', '2025-10-12 08:02:48', '2025-10-12 10:25:26'),
(656, 7, 'refresh', 'WOhg4ArIs33Vz3SxZEOGOL0CHbeo7pZwhlW0an3Ox4k=', '2025-11-11 07:02:53', 1, 'Chrome Browser / web', '202.28.119.60', '2025-10-12 08:02:53', '2025-10-12 08:16:00'),
(657, 8, 'refresh', 'w8S2IzNB5Fecj0tsQDLjhu5uKeEN8SK2T_faFhGxnKg=', '2025-11-11 07:16:05', 1, 'Chrome Browser / web', '202.28.119.60', '2025-10-12 08:16:05', '2025-10-12 08:18:39'),
(658, 7, 'refresh', 'ssAEHo5arDaBEeXllMUUBuM8_JvDdWigjDK9wnNZnfQ=', '2025-11-11 07:18:44', 1, 'Chrome Browser / web', '202.28.119.60', '2025-10-12 08:18:44', '2025-10-12 08:29:07'),
(659, 8, 'refresh', 'GpCjcpshQWfqd1ENWcj69CanF7R5ZbLABDk1TYoWmpY=', '2025-11-11 07:29:12', 1, 'Chrome Browser / web', '202.28.119.60', '2025-10-12 08:29:12', '2025-10-12 08:30:46'),
(660, 7, 'refresh', 'p5Ao_4rtAStuRgZSnxGUfeSU28_KvHg8AISKQDRqweE=', '2025-11-11 07:30:51', 1, 'Chrome Browser / web', '202.28.119.60', '2025-10-12 08:30:51', '2025-10-12 09:14:06'),
(661, 8, 'refresh', 'spqLgmlbjbRKVHRfnVt2rTyR_Zn8rRzRzILWm5q1eHU=', '2025-11-11 08:14:13', 1, 'Chrome Browser / web', '202.28.119.60', '2025-10-12 09:14:13', '2025-10-12 09:26:57'),
(662, 7, 'refresh', 'dlGxIFlzqHZJ-Sw9qs_3XGgOG8NTGWRl7yXRFySGAAg=', '2025-11-11 08:27:01', 1, 'Chrome Browser / web', '202.28.119.60', '2025-10-12 09:27:01', '2025-10-12 09:30:15'),
(663, 8, 'refresh', 'TYelSPYcdowSAzsr7H4p67aHBMFhSYBiV9lgBlm3vlo=', '2025-11-11 08:30:19', 1, 'Chrome Browser / web', '202.28.119.60', '2025-10-12 09:30:19', '2025-10-12 09:31:00'),
(664, 7, 'refresh', 'wUeKEqhEp8mApfkeLDNDmbxdwBQsipypX0rsTFyfYnI=', '2025-11-11 08:31:06', 0, 'Chrome Browser / web', '202.28.119.60', '2025-10-12 09:31:06', '2025-10-12 09:31:06'),
(665, 8, 'refresh', 'YXhnt_svHboJEuG4tbQY-4gAA3Ih1zdwFoHJiPXSloo=', '2025-11-11 09:29:43', 0, 'Chrome Browser / web', '202.28.118.112', '2025-10-12 10:29:43', '2025-10-12 10:29:43'),
(666, 7, 'refresh', 'e-2Qi0H5hG9oNJgZ4P9PdE7iEPyTrsNaIRdkU4tzTRI=', '2025-11-11 14:07:18', 0, 'Chrome Browser / web', '202.28.119.60', '2025-10-12 15:07:18', '2025-10-12 15:07:18'),
(667, 8, 'refresh', 'AQHlgwIPSkdSl1ZJADuHhmMlWwKB5cqtr6oD_9OrDnM=', '2025-11-11 17:55:41', 0, 'Chrome Browser / web', '124.122.123.63', '2025-10-12 18:55:41', '2025-10-12 18:55:41'),
(668, 8, 'refresh', 'zK4sENjKP520xGUk-KGfLK9VYBTR-dEu2WFZVadnm7Y=', '2025-11-12 11:56:32', 1, 'Chrome Browser / web', '58.10.149.19', '2025-10-13 12:56:32', '2025-10-13 13:10:33'),
(669, 8, 'refresh', 'BjPOES5RmgkJTs3wGcdrz6E_yqs6YaYygUdJbC4XYb0=', '2025-11-12 12:10:34', 0, 'Chrome Browser / web', '58.10.149.19', '2025-10-13 13:10:34', '2025-10-13 13:10:34'),
(670, 8, 'refresh', 'CtfQS9BvMB_a4Da0hx-dJVkdTMXBFT3wQTM6x5ka14M=', '2025-11-12 16:26:23', 0, 'Chrome Browser / web', '58.10.149.19', '2025-10-13 17:26:23', '2025-10-13 17:26:23'),
(671, 8, 'refresh', 'C4vML3ak6Jt-OgaQ9RIWdRTO1tN-30f_40KXS3ZyEF4=', '2025-11-12 17:40:30', 0, 'Chrome Browser / web', '58.10.149.19', '2025-10-13 18:40:30', '2025-10-13 18:40:30'),
(672, 8, 'refresh', '-pCB1u4dKD91QHRsl3LW2ZWhrWfupWqGeN3bs9Ul01I=', '2025-11-12 18:09:47', 1, 'Chrome Browser / web', '110.168.238.218', '2025-10-13 19:09:47', '2025-10-13 19:09:54'),
(673, 7, 'refresh', 'H8GpCL4xr4FQkyDzq75-WXR_bJ0y6xclFWz4iyU3Goc=', '2025-11-12 18:10:06', 0, 'Chrome Browser / web', '110.168.238.218', '2025-10-13 19:10:06', '2025-10-13 19:10:06'),
(674, 8, 'refresh', 'wt-6izrRVWhsiRwMDyCOew8CxRF_3byn82dVAGLslOA=', '2025-11-13 09:46:36', 0, 'Chrome Browser / web', '202.28.118.117', '2025-10-14 10:46:36', '2025-10-14 10:46:36'),
(675, 7, 'refresh', 'OrbwGF8kdGkydjigU8pN-FwVVQ1qhqT0agxKYB7Kr9s=', '2025-11-13 10:07:55', 0, 'Chrome Browser / web', '202.28.118.75', '2025-10-14 11:07:55', '2025-10-14 11:07:55'),
(676, 7, 'refresh', '2JVuyKudgSQEdxBdmLDW-o82J3noHqcsax4izWu1aaQ=', '2025-11-13 13:12:15', 1, 'Chrome Browser / web', '202.28.118.75', '2025-10-14 14:12:15', '2025-10-14 19:36:05'),
(677, 13, 'refresh', 'Z4FzZgBUWdRmv-mpp-5cBzOPowZPuN0k7lr9IuUSjhs=', '2025-11-13 18:36:10', 1, 'Chrome Browser / web', '58.11.83.64', '2025-10-14 19:36:10', '2025-10-14 19:36:39'),
(678, 7, 'refresh', 'cJbyZMTz6e1tn1Oi7SFTPge3eSlIBCnTayQasBeqEMg=', '2025-11-13 18:36:46', 1, 'Chrome Browser / web', '58.11.83.64', '2025-10-14 19:36:46', '2025-10-14 19:40:47'),
(679, 8, 'refresh', 'yM9fEBwxuloG_HRDGW-TAYHUGSVxTMJdQ8JwzFTLWz4=', '2025-11-13 18:40:58', 1, 'Chrome Browser / web', '58.11.83.64', '2025-10-14 19:40:58', '2025-10-14 19:42:18'),
(680, 13, 'refresh', 'XrEDH3e8HudIv7FszYgjEyvaSkJ9ulQXs1LyweIaKp4=', '2025-11-13 18:42:22', 0, 'Chrome Browser / web', '58.11.83.64', '2025-10-14 19:42:22', '2025-10-14 19:42:22'),
(681, 13, 'refresh', 'EUSofyLhynrOIU4rkuVb0oMFkWOV6f7bb7PYV9HP2Cs=', '2025-11-14 01:13:03', 0, 'Chrome Browser / web', '58.11.83.64', '2025-10-15 02:13:03', '2025-10-15 02:13:03'),
(682, 7, 'refresh', '6GHpihTaD1DpXkBgQl8DfttfgZa9BwKQKhrltl_Z0N0=', '2025-11-14 06:33:23', 1, 'Chrome Browser / web', '58.11.83.64', '2025-10-15 07:33:23', '2025-10-15 08:44:17'),
(683, 8, 'refresh', 'bB4EJ8nQFrvPYHjWYe7PC1cRgfW5NDKsurQOoZB8PLk=', '2025-11-14 07:44:28', 1, 'Chrome Browser / web', '58.11.83.64', '2025-10-15 08:44:28', '2025-10-15 08:45:15'),
(684, 13, 'refresh', 'JaBDDFgybmuTWNPyvFPJdrly4kgmsnCTjwc5t6_Elgs=', '2025-11-14 07:45:26', 1, 'Chrome Browser / web', '58.11.83.64', '2025-10-15 08:45:26', '2025-10-15 08:51:18'),
(685, 7, 'refresh', 'Rapc-WFihtrhwJ4n9ckuY3RI9aAL3SrwVjJ2lrIHslI=', '2025-11-14 07:51:25', 1, 'Chrome Browser / web', '58.11.83.64', '2025-10-15 08:51:25', '2025-10-15 09:04:33'),
(686, 13, 'refresh', 'pGmh6kGKE1aNAUdrV_-JSq6BqK_29zlhtnHQKBNLxSo=', '2025-11-14 08:04:39', 1, 'Chrome Browser / web', '58.11.83.64', '2025-10-15 09:04:39', '2025-10-15 09:05:46'),
(687, 7, 'refresh', 'Da8rkx0DCAPml4P43y_emgihUAFWF2c_HtfwH-mQEDA=', '2025-11-14 08:05:52', 1, 'Chrome Browser / web', '58.11.83.64', '2025-10-15 09:05:52', '2025-10-15 09:06:11'),
(688, 13, 'refresh', '9cJEZl_yF68EpxtP_xxu6IfaHY_BwIfd6S3sWmph5_0=', '2025-11-14 08:06:16', 1, 'Chrome Browser / web', '58.11.83.64', '2025-10-15 09:06:16', '2025-10-15 10:47:28'),
(689, 8, 'refresh', 'lcIH3Nn8nnLNtC6VAP7hsExocztbEydAbG_Efrvhqsc=', '2025-11-14 09:47:35', 0, 'Chrome Browser / web', '58.11.83.64', '2025-10-15 10:47:35', '2025-10-15 10:47:35'),
(690, 8, 'refresh', 'J0UEzqj3Ss6T8theSEDETj04ZygU96smMjleDcm6ecI=', '2025-11-14 10:34:30', 0, 'Chrome Browser / web', '58.10.107.212', '2025-10-15 11:34:30', '2025-10-15 11:34:30'),
(691, 8, 'refresh', 'VM5tkHu7ciLg3GoBwOf7DFiqqhMKuKjq8vKoumxPk0k=', '2025-11-14 11:18:51', 1, 'Chrome Browser / web', '58.11.83.64', '2025-10-15 12:18:51', '2025-10-15 12:23:42'),
(692, 13, 'refresh', 'wgdxSn-cjkoBPDgBbZA518BE6j8ipZlPU5StUwiBDkE=', '2025-11-14 11:23:51', 1, 'Chrome Browser / web', '58.11.83.64', '2025-10-15 12:23:51', '2025-10-15 12:25:08'),
(693, 7, 'refresh', 'FcnjrSaa_oNtwJhYzfjQUZ_Nv6sUayWLvyluwYoIeE8=', '2025-11-14 11:25:13', 1, 'Chrome Browser / web', '58.11.83.64', '2025-10-15 12:25:13', '2025-10-15 12:25:35'),
(694, 8, 'refresh', 'S3K-YX_qvMKZBkOOL359pCfh-aqyxDXJ-3BEGhZR7ck=', '2025-11-14 11:25:41', 1, 'Chrome Browser / web', '58.11.83.64', '2025-10-15 12:25:41', '2025-10-15 14:28:18'),
(695, 13, 'refresh', 'IgSKVEZLDeqiIcXbHMWttGXp6mH7oWXk9k5XFnjBKhA=', '2025-11-14 13:40:28', 1, 'Chrome Browser / web', '58.11.83.64', '2025-10-15 14:40:28', '2025-10-15 14:40:53'),
(696, 7, 'refresh', 'omyUddF5Ju8gRQY9ql6b3amsr6xdp6BdmBmu1zGNqwA=', '2025-11-14 13:41:01', 1, 'Chrome Browser / web', '58.11.83.64', '2025-10-15 14:41:01', '2025-10-15 14:45:12'),
(697, 8, 'refresh', 'JBdHg-BOsqNINGCXc_mAksFu0gbDs_FioukIjcvY7Ik=', '2025-11-14 13:45:18', 1, 'Chrome Browser / web', '58.11.83.64', '2025-10-15 14:45:18', '2025-10-15 15:42:12'),
(698, 13, 'refresh', 'Dsrcx9LEIqy9J8Ixs8qzymtdMxtIODOlQf2Ijw5nMA8=', '2025-11-14 14:42:19', 1, 'Chrome Browser / web', '58.11.83.64', '2025-10-15 15:42:19', '2025-10-15 15:43:30'),
(699, 8, 'refresh', 'dipHseowUO8Yr_qViWQ1e_mgDs3nC4Ldkvi82XjX2ho=', '2025-11-14 14:43:35', 0, 'Chrome Browser / web', '58.11.83.64', '2025-10-15 15:43:35', '2025-10-15 15:43:35');

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
,`action` enum('create','update','delete','login','logout','view','download','approve','reject','submit','review','request_revision')
,`entity_type` varchar(50)
,`entity_number` varchar(50)
,`description` text
,`ip_address` varchar(45)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_subcategory_user_usage`
-- (See below for the actual view)
--
CREATE TABLE `v_subcategory_user_usage` (
`user_id` int(11)
,`year_id` int(11)
,`subcategory_id` int(11)
,`subcategory_budget_id` int(11)
,`used_grants` bigint(21)
,`used_amount` decimal(59,2)
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
,`used_grants` bigint(21)
,`used_amount` decimal(59,2)
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
(4, '2569', '1000000.00', 'active', '2025-08-27 14:58:19', '2025-10-10 13:16:51', NULL),
(9, '2565', '2000000.00', 'active', '2025-10-10 13:35:05', '2025-10-10 13:35:05', NULL);

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
-- Structure for view `v_budget_summary`
--
DROP TABLE IF EXISTS `v_budget_summary`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_budget_summary`  AS  select `sb`.`subcategory_id` AS `subcategory_id`,`sb`.`allocated_amount` AS `allocated_amount`,coalesce(sum(case when `s`.`submission_type` = 'fund_application' then `fad`.`approved_amount` when `s`.`submission_type` = 'publication_reward' then `prd`.`total_approve_amount` else 0 end),0) AS `used_amount`,`sb`.`allocated_amount` - coalesce(sum(case when `s`.`submission_type` = 'fund_application' then `fad`.`approved_amount` when `s`.`submission_type` = 'publication_reward' then `prd`.`total_approve_amount` else 0 end),0) AS `remaining_budget` from (((`subcategory_budgets` `sb` left join `submissions` `s` on(`s`.`subcategory_id` = `sb`.`subcategory_id` and `s`.`status_id` = 2)) left join `fund_application_details` `fad` on(`fad`.`submission_id` = `s`.`submission_id`)) left join `publication_reward_details` `prd` on(`prd`.`submission_id` = `s`.`submission_id`)) where `sb`.`record_scope` = 'overall' group by `sb`.`subcategory_id`,`sb`.`allocated_amount` ;

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
-- Structure for view `v_subcategory_user_usage`
--
DROP TABLE IF EXISTS `v_subcategory_user_usage`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_subcategory_user_usage`  AS  select `r`.`user_id` AS `user_id`,`r`.`year_id` AS `year_id`,`r`.`subcategory_id` AS `subcategory_id`,`r`.`subcategory_budget_id` AS `subcategory_budget_id`,count(0) AS `used_grants`,sum(`r`.`approved_amount`) AS `used_amount` from `v_approval_records` `r` where `r`.`submission_type` = 'fund_application' group by `r`.`user_id`,`r`.`year_id`,`r`.`subcategory_id`,`r`.`subcategory_budget_id` ;

-- --------------------------------------------------------

--
-- Structure for view `v_subcategory_user_usage_total`
--
DROP TABLE IF EXISTS `v_subcategory_user_usage_total`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_subcategory_user_usage_total`  AS  select `r`.`user_id` AS `user_id`,`r`.`year_id` AS `year_id`,`r`.`subcategory_id` AS `subcategory_id`,count(0) AS `used_grants`,sum(`r`.`approved_amount`) AS `used_amount` from `v_approval_records` `r` where `r`.`submission_type` in ('fund_application','publication_reward') group by `r`.`user_id`,`r`.`year_id`,`r`.`subcategory_id` ;

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
  ADD KEY `idx_admin_approved_by` (`admin_approved_by`),
  ADD KEY `idx_installment_submit` (`installment_number_at_submit`);

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
  MODIFY `announcement_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `announcement_assignments`
--
ALTER TABLE `announcement_assignments`
  MODIFY `assignment_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `application_status`
--
ALTER TABLE `application_status`
  MODIFY `application_status_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `log_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=637;

--
-- AUTO_INCREMENT for table `dept_head_assignments`
--
ALTER TABLE `dept_head_assignments`
  MODIFY `assignment_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `document_types`
--
ALTER TABLE `document_types`
  MODIFY `document_type_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `end_of_contract`
--
ALTER TABLE `end_of_contract`
  MODIFY `eoc_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `file_uploads`
--
ALTER TABLE `file_uploads`
  MODIFY `file_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=573;

--
-- AUTO_INCREMENT for table `fund_application_details`
--
ALTER TABLE `fund_application_details`
  MODIFY `detail_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=39;

--
-- AUTO_INCREMENT for table `fund_categories`
--
ALTER TABLE `fund_categories`
  MODIFY `category_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- AUTO_INCREMENT for table `fund_forms`
--
ALTER TABLE `fund_forms`
  MODIFY `form_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `fund_installment_periods`
--
ALTER TABLE `fund_installment_periods`
  MODIFY `installment_period_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `fund_subcategories`
--
ALTER TABLE `fund_subcategories`
  MODIFY `subcategory_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=286;

--
-- AUTO_INCREMENT for table `innovations`
--
ALTER TABLE `innovations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `notification_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=266;

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
  MODIFY `detail_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=167;

--
-- AUTO_INCREMENT for table `publication_reward_external_funds`
--
ALTER TABLE `publication_reward_external_funds`
  MODIFY `external_fund_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

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
  MODIFY `config_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `role_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `scholar_import_runs`
--
ALTER TABLE `scholar_import_runs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=30;

--
-- AUTO_INCREMENT for table `subcategory_budgets`
--
ALTER TABLE `subcategory_budgets`
  MODIFY `subcategory_budget_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=499;

--
-- AUTO_INCREMENT for table `submissions`
--
ALTER TABLE `submissions`
  MODIFY `submission_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=225;

--
-- AUTO_INCREMENT for table `submission_documents`
--
ALTER TABLE `submission_documents`
  MODIFY `document_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=648;

--
-- AUTO_INCREMENT for table `submission_users`
--
ALTER TABLE `submission_users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=281;

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
  MODIFY `session_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=700;

--
-- AUTO_INCREMENT for table `user_tokens`
--
ALTER TABLE `user_tokens`
  MODIFY `token_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=700;

--
-- AUTO_INCREMENT for table `years`
--
ALTER TABLE `years`
  MODIFY `year_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

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
