  `installment` int(11) DEFAULT NULL COMMENT 'เลขที่ใส่ในเอกสาร Publication Reward ในส่วน "งวดที่"',
  `max_submissions_per_year` int(11) NOT NULL DEFAULT 5 COMMENT 'จำนวนครั้งสูงสุดที่ยื่นทุนได้ต่อปี (รวม Publication + Fund Application)'
INSERT INTO `system_config` (`config_id`, `system_version`, `last_updated`, `updated_by`, `current_year`, `start_date`, `end_date`, `main_annoucement`, `reward_announcement`, `activity_support_announcement`, `conference_announcement`, `service_announcement`, `contact_info`, `kku_report_year`, `installment`, `max_submissions_per_year`) VALUES
(1, '1.0.0', '2025-12-25 10:48:44', 7, '2568', '2025-08-29 21:01:00', '2026-01-31 10:00:00', 8, 2, 13, 16, 18, 'researchfund@kku.ac.th, โทร 043-xxx-xxxx', '2568', 1, 5);
--
-- Stand-in structure for view `v_user_yearly_submission_usage`
-- (See below for the actual view)
--
CREATE TABLE `v_user_yearly_submission_usage` (
`user_id` int(11)
,`year_id` int(11)
,`used_submissions` bigint(21)
);

-- --------------------------------------------------------

--
-- Structure for view `v_user_yearly_submission_usage`
--
DROP TABLE IF EXISTS `v_user_yearly_submission_usage`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_user_yearly_submission_usage`  AS  select `s`.`user_id` AS `user_id`,`s`.`year_id` AS `year_id`,count(0) AS `used_submissions` from (`submissions` `s` join `application_status` `st` on(`st`.`application_status_id` = `s`.`status_id`)) where `s`.`deleted_at` is null and `s`.`submission_type` in ('fund_application','publication_reward') and `st`.`status_code` not in ('2','4') group by `s`.`user_id`,`s`.`year_id` ;

-- --------------------------------------------------------

