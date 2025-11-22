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
,`fund_description` text
CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_approval_records`  AS  select `s`.`submission_id` AS `submission_id`,`s`.`submission_number` AS `submission_number`,`s`.`submission_type` AS `submission_type`,`s`.`user_id` AS `user_id`,concat(`u`.`user_fname`,' ',`u`.`user_lname`) AS `applicant_name`,`s`.`year_id` AS `year_id`,`y`.`year` AS `year_th`,`s`.`category_id` AS `category_id`,`fc`.`category_name` AS `category_name`,`s`.`subcategory_id` AS `subcategory_id`,`fsc`.`subcategory_name` AS `subcategory_name`,`s`.`subcategory_budget_id` AS `subcategory_budget_id`,coalesce(nullif(trim(`sb`.`fund_description`),''),nullif(trim(`sb`.`level`),'')) AS `subcategory_budget_label`,`sb`.`fund_description` AS `fund_description`,`s`.`status_id` AS `status_id`,`s`.`approved_by` AS `approved_by`,`s`.`approved_at` AS `approved_at`,case when `s`.`submission_type` = 'publication_reward' then coalesce(`prd`.`total_approve_amount`,coalesce(`prd`.`reward_approve_amount`,0) + coalesce(`prd`.`revision_fee_approve_amount`,0) + coalesce(`prd`.`publication_fee_approve_amount`,0),0) when `s`.`submission_type` = 'fund_application' then coalesce(`fa`.`total_approved_amount`,0) else 0 end AS `approved_amount` from (((((((`submissions` `s` join `users` `u` on(`u`.`user_id` = `s`.`user_id` and (`u`.`delete_at` is null or `u`.`delete_at` = 0))) join `years` `y` on(`y`.`year_id` = `s`.`year_id`)) left join `fund_categories` `fc` on(`fc`.`category_id` = `s`.`category_id`)) left join `fund_subcategories` `fsc` on(`fsc`.`subcategory_id` = `s`.`subcategory_id`)) left join `subcategory_budgets` `sb` on(`sb`.`subcategory_budget_id` = `s`.`subcategory_budget_id`)) left join `publication_reward_details` `prd` on(`prd`.`submission_id` = `s`.`submission_id`)) left join (select `fund_application_details`.`submission_id` AS `submission_id`,sum(coalesce(`fund_application_details`.`approved_amount`,0)) AS `total_approved_amount` from `fund_application_details` group by `fund_application_details`.`submission_id`) `fa` on(`fa`.`submission_id` = `s`.`submission_id`)) where `s`.`status_id` = 2 and `s`.`deleted_at` is null ;
