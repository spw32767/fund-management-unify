  `changed_at` datetime NOT NULL DEFAULT current_timestamp(),
  `note` varchar(255) DEFAULT NULL COMMENT 'หมายเหตุเพิ่มเติมสำหรับการจัดประกาศ'
`slot_code` enum('main','reward','activity_support','conference','service')
,`announcement_id` int(11)
,`start_date` datetime
,`end_date` datetime
,`changed_by` int(11)
,`changed_at` datetime
,`note` varchar(255)
  ADD KEY `idx_rfae_submission_created_at` (`submission_id`,`created_at`),
