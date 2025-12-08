-- Table structure for table `import_templates`
--

CREATE TABLE `import_templates` (
  `template_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL COMMENT 'ชื่อเทมเพลตนำเข้า/ส่งออก',
  `description` text DEFAULT NULL COMMENT 'รายละเอียดเทมเพลต',
  `file_name` varchar(255) NOT NULL COMMENT 'ชื่อไฟล์ต้นฉบับ',
  `file_path` varchar(500) NOT NULL COMMENT 'path ไฟล์ในระบบ',
  `file_size` bigint(20) DEFAULT NULL COMMENT 'ขนาดไฟล์ (bytes)',
  `mime_type` varchar(100) DEFAULT NULL COMMENT 'ประเภทไฟล์',
  `template_type` enum('user_import','submission_import','other') DEFAULT 'user_import' COMMENT 'ประเภทเทมเพลต',
  `is_required` tinyint(1) DEFAULT 0 COMMENT 'บังคับใช้หรือไม่',
  `display_order` int(11) DEFAULT NULL,
  `status` enum('active','inactive','archived') DEFAULT 'active' COMMENT 'สถานะเทมเพลต',
  `created_by` int(11) NOT NULL COMMENT 'ผู้สร้าง (user_id)',
  `create_at` datetime DEFAULT current_timestamp(),
  `update_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `delete_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางเก็บไฟล์เทมเพลตสำหรับนำเข้า/ส่งออกข้อมูลระบบทุน';

--
-- Dumping data for table `import_templates`
--

INSERT INTO `import_templates` (`template_id`, `title`, `description`, `file_name`, `file_path`, `file_size`, `mime_type`, `template_type`, `is_required`, `display_order`, `status`, `created_by`, `create_at`, `update_at`, `delete_at`) VALUES
(1, 'เทมเพลตนำเข้าผู้ใช้งาน', 'ไฟล์ตัวอย่างสำหรับเพิ่มผู้ใช้งานระบบแบบกลุ่ม', 'user_import_template.xlsx', 'uploads/import_templates/user_import_template.xlsx', 5779, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'user_import', 0, 1, 'active', 1, '2025-10-15 00:00:00', '2025-10-15 00:00:00', NULL),
(2, 'เทมเพลตรวมคำร้องขอทุน', 'รูปแบบไฟล์นำเข้าคำร้องส่งเสริมทุน/ทุนกิจกรรม', 'submission_unified_template.xlsx', 'uploads/import_templates/submission_unified_template.xlsx', 5389, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'submission_import', 0, 2, 'active', 1, '2025-10-15 00:00:00', '2025-10-15 00:00:00', NULL);

--
-- Indexes for table `import_templates`
--
ALTER TABLE `import_templates`
  ADD PRIMARY KEY (`template_id`),
  ADD KEY `idx_template_type` (`template_type`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_created_by` (`created_by`),
  ADD KEY `idx_delete_at` (`delete_at`),
  ADD KEY `idx_import_templates_type_status` (`template_type`,`status`);

--
-- AUTO_INCREMENT for table `import_templates`
--
ALTER TABLE `import_templates`
  MODIFY `template_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Constraints for table `import_templates`
--
ALTER TABLE `import_templates`
  ADD CONSTRAINT `fk_import_templates_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`);
