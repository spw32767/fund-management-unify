-- --------------------------------------------------------
-- Table structure for table `import_templates`
--

CREATE TABLE `import_templates` (
  `template_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL COMMENT 'ชื่อเทมเพลตนำเข้า',
  `description` text DEFAULT NULL COMMENT 'รายละเอียดเทมเพลต',
  `file_name` varchar(255) NOT NULL COMMENT 'ชื่อไฟล์ต้นฉบับ',
  `file_path` varchar(500) NOT NULL COMMENT 'path ไฟล์ในระบบ',
  `file_size` bigint(20) DEFAULT NULL COMMENT 'ขนาดไฟล์ (bytes)',
  `mime_type` varchar(100) DEFAULT NULL COMMENT 'ประเภทไฟล์',
  `template_type` enum('user_import','legacy_submission','other') DEFAULT 'other' COMMENT 'ประเภทการนำเข้า',
  `is_required` tinyint(1) DEFAULT 0 COMMENT 'บังคับใช้หรือไม่',
  `display_order` int(11) DEFAULT NULL,
  `status` enum('active','inactive','archived') DEFAULT 'active' COMMENT 'สถานะเทมเพลต',
  `year_id` int(11) DEFAULT NULL COMMENT 'ปีที่เกี่ยวข้อง',
  `created_by` int(11) NOT NULL COMMENT 'ผู้สร้าง (user_id)',
  `create_at` datetime DEFAULT current_timestamp(),
  `update_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `delete_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางเก็บไฟล์เทมเพลตสำหรับการนำเข้า';

--
-- Indexes for table `import_templates`
--
ALTER TABLE `import_templates`
  ADD PRIMARY KEY (`template_id`),
  ADD KEY `idx_template_type` (`template_type`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_created_by` (`created_by`),
  ADD KEY `idx_delete_at` (`delete_at`),
  ADD KEY `idx_template_type_status` (`template_type`,`status`),
  ADD KEY `idx_year_id` (`year_id`);

--
-- AUTO_INCREMENT for table `import_templates`
--
ALTER TABLE `import_templates`
  MODIFY `template_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for table `import_templates`
--
ALTER TABLE `import_templates`
  ADD CONSTRAINT `fk_import_templates_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `fk_import_templates_year` FOREIGN KEY (`year_id`) REFERENCES `years` (`year_id`);

--
-- Dumping data for table `import_templates`
--
INSERT INTO `import_templates` (`template_id`, `title`, `description`, `file_name`, `file_path`, `file_size`, `mime_type`, `template_type`, `is_required`, `display_order`, `status`, `year_id`, `created_by`, `create_at`, `update_at`, `delete_at`) VALUES
(1, 'เทมเพลตนำเข้าผู้ใช้ (User Import Template)', 'ใช้สำหรับเพิ่มผู้ใช้ใหม่จำนวนมากจากไฟล์ Excel', 'user_import_template.xlsx', '/uploads/import_templates/user_import_template.xlsx', 5779, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'user_import', 0, 1, 'active', NULL, 1, NOW(), NOW(), NULL),
(2, 'เทมเพลตนำเข้าประวัติทุนย้อนหลัง (Submission Unified Template)', 'ใช้สำหรับบันทึกประวัติทุนของอาจารย์ที่มีทุนมาก่อนใช้ระบบนี้', 'submission_unified_template.xlsx', '/uploads/import_templates/submission_unified_template.xlsx', 5389, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'legacy_submission', 0, 2, 'active', NULL, 1, NOW(), NOW(), NULL);
