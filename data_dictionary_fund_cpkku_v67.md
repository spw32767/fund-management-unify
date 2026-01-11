# Data Dictionary (fund_cpkku_v67.sql)

Generated from `fund_cpkku_v67.sql`.

## Table: `announcements`
**Description:** ตารางเก็บประกาศจากกองทุนวิจัยและนวัตกรรม

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `announcement_id` | int(11) | NO |  |  |  |
| `title` | varchar(255) | NO |  |  | หัวข้อประกาศ |
| `description` | text | YES | NULL |  | รายละเอียดประกาศ |
| `file_name` | varchar(255) | NO |  |  | ชื่อไฟล์ต้นฉบับ |
| `file_path` | varchar(512) | NO |  |  | path ไฟล์ในระบบ |
| `file_size` | bigint(20) | YES | NULL |  | ขนาดไฟล์ (bytes) |
| `mime_type` | varchar(100) | YES | NULL |  | ประเภทไฟล์ |
| `announcement_type` | enum('general','research_fund','promotion_fund','publication_reward','fund_application') | YES | 'general' |  | ประเภทประกาศ |
| `announcement_reference_number` | varchar(50) | YES | NULL |  |  |
| `priority` | enum('normal','high','urgent') | YES | 'normal' |  | ความสำคัญ |
| `display_order` | int(11) | YES | NULL |  |  |
| `status` | enum('active','inactive') | YES | 'active' |  | สถานะการเผยแพร่ |
| `published_at` | datetime | YES | NULL |  | วันที่เผยแพร่ |
| `expired_at` | datetime | YES | NULL |  | วันที่หมดอายุ |
| `year_id` | int(11) | YES | NULL |  | ปีของประกาศ |
| `created_by` | int(11) | NO |  |  | ผู้สร้าง (user_id) |
| `create_at` | datetime | YES | current_timestamp() |  |  |
| `update_at` | datetime | YES | current_timestamp() |  |  |
| `delete_at` | datetime | YES | NULL |  |  |

## Table: `announcement_assignments`
**Description:**

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `assignment_id` | int(11) | NO |  |  |  |
| `slot_code` | enum('main','reward','activity_support','conference','service') | NO |  |  | ช่องประกาศที่ FE กำหนด |
| `announcement_id` | int(11) | YES | NULL |  | อาจเป็น NULL เพื่อระบุช่วงที่ไม่มีประกาศ |
| `start_date` | datetime | NO |  |  |  |
| `end_date` | datetime | YES | NULL |  |  |
| `changed_by` | int(11) | YES | NULL |  |  |
| `changed_at` | datetime | NO | current_timestamp() |  |  |
| `note` | varchar(255) | YES | NULL |  | หมายเหตุเพิ่มเติมสำหรับการจัดประกาศ |

## Table: `application_status`
**Description:**

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `application_status_id` | int(11) | NO |  |  |  |
| `status_code` | varchar(64) CHARACTER SET utf8mb4 | YES | NULL |  |  |
| `status_name` | varchar(255) | YES | NULL |  |  |
| `create_at` | datetime | YES | current_timestamp() |  |  |
| `update_at` | datetime | YES | current_timestamp() |  |  |
| `delete_at` | datetime | YES | NULL |  |  |

## Table: `audit_logs`
**Description:**

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `log_id` | int(11) | NO |  |  |  |
| `user_id` | int(11) | YES | NULL |  |  |
| `action` | enum('create','update','delete','login','logout','view','download','approve','reject','submit','review','request_revision') | NO |  |  |  |
| `entity_type` | varchar(50) | NO |  |  |  |
| `entity_id` | int(11) | YES | NULL |  |  |
| `entity_number` | varchar(50) | YES | NULL |  |  |
| `old_values` | longtext | YES | NULL |  |  |
| `new_values` | longtext | YES | NULL |  |  |
| `changed_fields` | text | YES | NULL |  |  |
| `ip_address` | varchar(45) | YES | NULL |  |  |
| `user_agent` | varchar(255) | YES | NULL |  |  |
| `description` | text | YES | NULL |  |  |
| `created_at` | datetime | YES | current_timestamp() |  |  |

## Table: `cp_profile`
**Description:**

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `id` | int(11) | NO |  |  |  |
| `user_id` | int(11) | YES | NULL |  | fk users table |
| `name_th` | varchar(255) | NO |  |  | ชื่อ (ภาษาไทย) |
| `name_en` | varchar(255) | YES | NULL |  | Name (English) |
| `position` | varchar(255) | YES | NULL |  | ตำแหน่ง |
| `email` | varchar(255) | YES | NULL |  | อีเมล |
| `photo_url` | varchar(500) | YES | NULL |  | URL รูปโปรไฟล์ |
| `profile_url` | varchar(500) | YES | NULL |  |  |
| `info` | text | YES | NULL |  | ข้อมูล |
| `education` | text | YES | NULL |  | ประวัติการศึกษา |
| `create_at` | datetime | YES | current_timestamp() |  |  |
| `update_at` | datetime | YES | current_timestamp() |  |  |

## Table: `dept_head_assignments`
**Description:**

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `assignment_id` | int(11) | NO |  |  |  |
| `head_user_id` | int(11) | NO |  |  |  |
| `restore_role_id` | int(11) | NO |  |  |  |
| `effective_from` | datetime | NO |  |  |  |
| `effective_to` | datetime | YES | NULL |  |  |
| `changed_by` | int(11) | YES | NULL |  |  |
| `changed_at` | datetime | NO | current_timestamp() |  |  |
| `note` | varchar(255) | YES | NULL |  |  |

## Table: `document_types`
**Description:**

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `document_type_id` | int(11) | NO |  |  |  |
| `document_type_name` | varchar(255) | YES | NULL |  |  |
| `code` | varchar(64) CHARACTER SET utf8mb4 | YES | NULL |  |  |
| `category` | varchar(50) | YES | 'general' |  | ไม่ได้ใช้ |
| `required` | tinyint(1) | YES | 0 |  |  |
| `multiple` | tinyint(1) | YES | 0 |  |  |
| `document_order` | int(11) | YES | 0 |  |  |
| `is_required` | enum('yes','no') | YES | NULL |  | ไม่ได้ใช้ |
| `create_at` | datetime | YES | current_timestamp() |  |  |
| `update_at` | datetime | YES | current_timestamp() |  |  |
| `delete_at` | datetime | YES | NULL |  |  |
| `fund_types` | longtext | YES | NULL |  | ประเภททุนที่ใช้ได้ ["publication_reward", "fund_application"] |
| `subcategory_ids` | longtext | YES | NULL |  | ไม่ได้ใช้ |
| `subcategory_name` | longtext | YES | NULL |  | snapshot ของชื่อทุน ไม่ผูก FK |

## Table: `end_of_contract`
**Description:**

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `eoc_id` | int(11) | NO |  |  |  |
| `content` | longtext | NO |  |  |  |
| `display_order` | int(11) | NO | 1 |  |  |

## Table: `file_uploads`
**Description:**

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `file_id` | int(11) | NO |  |  |  |
| `original_name` | varchar(255) | NO |  |  |  |
| `stored_path` | varchar(500) | NO |  |  |  |
| `folder_type` | enum('temp','submission','profile','other') | YES | 'temp' |  |  |
| `submission_id` | int(11) | YES | NULL |  |  |
| `file_size` | bigint(20) | YES | NULL |  |  |
| `mime_type` | varchar(100) | YES | NULL |  |  |
| `file_hash` | varchar(64) CHARACTER SET utf8mb4 | YES | NULL |  |  |
| `is_public` | tinyint(1) | YES | 0 |  |  |
| `uploaded_by` | int(11) | YES | NULL |  |  |
| `uploaded_at` | datetime | YES | current_timestamp() |  |  |
| `create_at` | datetime | YES | current_timestamp() |  |  |
| `update_at` | datetime | YES | current_timestamp() |  |  |
| `delete_at` | datetime | YES | NULL |  |  |

## Table: `fund_application_details`
**Description:**

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `detail_id` | int(11) | NO |  |  |  |
| `submission_id` | int(11) | NO |  |  |  |
| `subcategory_id` | int(11) | NO |  |  |  |
| `project_title` | varchar(255) | YES | NULL |  |  |
| `project_description` | text | YES | NULL |  |  |
| `requested_amount` | decimal(15,2) | YES | NULL |  |  |
| `approved_amount` | decimal(15,2) | YES | NULL |  |  |
| `closed_at` | datetime | YES | NULL |  |  |
| `announce_reference_number` | varchar(50) | YES | NULL |  |  |
| `main_annoucement` | int(11) | YES | NULL |  |  |
| `activity_support_announcement` | int(11) | YES | NULL |  |  |
| `author_name_list` | varchar(500) | YES | NULL |  |  |

## Table: `fund_categories`
**Description:**

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `category_id` | int(11) | NO |  |  |  |
| `category_name` | varchar(255) | YES | NULL |  |  |
| `status` | enum('active','disable') | YES | NULL |  |  |
| `year_id` | int(11) | YES | NULL |  |  |
| `comment` | text | YES | NULL |  |  |
| `create_at` | datetime | YES | NULL |  |  |
| `update_at` | datetime | YES | NULL |  |  |
| `delete_at` | datetime | YES | NULL |  |  |

## Table: `fund_forms`
**Description:** ตารางเก็บแบบฟอร์มและเอกสารที่เกี่ยวข้องกับการขอทุน

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `form_id` | int(11) | NO |  |  |  |
| `title` | varchar(255) | NO |  |  | ชื่อแบบฟอร์ม |
| `description` | text | YES | NULL |  | รายละเอียดแบบฟอร์ม |
| `file_name` | varchar(255) | NO |  |  | ชื่อไฟล์ต้นฉบับ |
| `file_path` | varchar(500) | NO |  |  | path ไฟล์ในระบบ |
| `file_size` | bigint(20) | YES | NULL |  | ขนาดไฟล์ (bytes) |
| `mime_type` | varchar(100) | YES | NULL |  | ประเภทไฟล์ |
| `form_type` | enum('application','report','evaluation','guidelines','other') | YES | 'application' |  | ประเภทแบบฟอร์ม |
| `fund_category` | enum('research_fund','promotion_fund','both') | YES | 'both' |  | หมวดหมู่กองทุน |
| `is_required` | tinyint(1) | YES | 0 |  | บังคับใช้หรือไม่ |
| `display_order` | int(11) | YES | NULL |  |  |
| `status` | enum('active','inactive','archived') | YES | 'active' |  | สถานะแบบฟอร์ม |
| `year_id` | int(11) | YES | NULL |  | ปีของแบบฟอร์ม |
| `created_by` | int(11) | NO |  |  | ผู้สร้าง (user_id) |
| `create_at` | datetime | YES | current_timestamp() |  |  |
| `update_at` | datetime | YES | current_timestamp() |  |  |
| `delete_at` | datetime | YES | NULL |  |  |

## Table: `fund_installment_periods`
**Description:**

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `installment_period_id` | int(11) | NO |  |  |  |
| `fund_level` | enum('category','subcategory') | NO | 'category' |  |  |
| `fund_keyword` | varchar(255) | NO | '' |  |  |
| `fund_parent_keyword` | varchar(255) | YES | NULL |  |  |
| `year_id` | int(11) | NO |  |  | FK → years.year_id |
| `installment_number` | int(11) | NO |  |  | งวดที่ 1, 2, 3, ... |
| `cutoff_date` | date | NO |  |  | วันตัดของงวดนี้ (เช่น 2025-02-03) |
| `name` | varchar(255) | YES | NULL |  | ป้ายกำกับงวด (เช่น "งวดแรก") |
| `status` | enum('active','inactive') | YES | 'active' |  |  |
| `remark` | text | YES | NULL |  |  |
| `created_at` | datetime | YES | current_timestamp() |  |  |
| `updated_at` | datetime | YES | current_timestamp() |  |  |
| `deleted_at` | datetime | YES | NULL |  |  |

## Table: `fund_subcategories`
**Description:**

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `subcategory_id` | int(11) | NO |  |  |  |
| `category_id` | int(11) | YES | NULL |  |  |
| `subcategory_name` | varchar(255) | YES | NULL |  |  |
| `subcategory_code` | varchar(100) | YES | NULL |  |  |
| `fund_condition` | text | YES | NULL |  |  |
| `target_roles` | longtext | YES | NULL |  | บทบาทที่สามารถเห็นทุนนี้ได้ (เก็บเป็น JSON array) |
| `form_type` | varchar(50) | YES | 'download' |  | ประเภทฟอร์ม: download, publication_reward, fund_application, etc. |
| `form_url` | varchar(255) | YES | NULL |  | URL สำหรับดาวน์โหลดฟอร์ม (ถ้า form_type = download) |
| `year_id` | int(255) | YES | NULL |  |  |
| `status` | enum('active','disable') | YES | NULL |  |  |
| `comment` | text | YES | NULL |  |  |
| `create_at` | datetime | YES | NULL |  |  |
| `update_at` | datetime | YES | NULL |  |  |
| `delete_at` | datetime | YES | NULL |  |  |

## Table: `import_templates`
**Description:** ตารางเก็บไฟล์เทมเพลตสำหรับการนำเข้า

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `template_id` | int(11) | NO |  |  |  |
| `title` | varchar(255) | NO |  |  | ชื่อเทมเพลตนำเข้า |
| `description` | text | YES | NULL |  | รายละเอียดเทมเพลต |
| `file_name` | varchar(255) | NO |  |  | ชื่อไฟล์ต้นฉบับ |
| `file_path` | varchar(500) | NO |  |  | path ไฟล์ในระบบ |
| `file_size` | bigint(20) | YES | NULL |  | ขนาดไฟล์ (bytes) |
| `mime_type` | varchar(100) | YES | NULL |  | ประเภทไฟล์ |
| `template_type` | enum('user_import','legacy_submission','other') | YES | 'other' |  | ประเภทการนำเข้า |
| `is_required` | tinyint(1) | YES | 0 |  | บังคับใช้หรือไม่ |
| `display_order` | int(11) | YES | NULL |  |  |
| `status` | enum('active','inactive','archived') | YES | 'active' |  | สถานะเทมเพลต |
| `year_id` | int(11) | YES | NULL |  | ปีที่เกี่ยวข้อง |
| `created_by` | int(11) | NO |  |  | ผู้สร้าง (user_id) |
| `create_at` | datetime | YES | current_timestamp() |  |  |
| `update_at` | datetime | YES | current_timestamp() |  |  |
| `delete_at` | datetime | YES | NULL |  |  |

## Table: `innovations`
**Description:**

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `id` | int(11) | NO |  |  |  |
| `user_id` | int(11) | NO |  |  |  |
| `title` | varchar(500) | NO |  |  |  |
| `innovation_type` | varchar(255) | YES | NULL |  |  |
| `description` | text | YES | NULL |  |  |
| `registered_date` | date | YES | NULL |  |  |
| `created_at` | datetime | YES | current_timestamp() |  |  |
| `updated_at` | datetime | YES | current_timestamp() |  |  |

## Table: `kku_people_import_runs`
**Description:**

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `id` | bigint(20) UNSIGNED | NO |  |  |  |
| `trigger_source` | varchar(64) | NO |  |  |  |
| `dry_run` | tinyint(1) | NO | 0 |  |  |
| `status` | enum('running','success','failed') | NO | 'running' |  |  |
| `error_message` | text | YES | NULL |  |  |
| `started_at` | datetime(6) | NO | current_timestamp(6) |  |  |
| `finished_at` | datetime(6) | YES | NULL |  |  |
| `duration_seconds` | double | YES | NULL |  |  |
| `fetched_count` | int(10) UNSIGNED | NO | 0 |  |  |
| `created_count` | int(10) UNSIGNED | NO | 0 |  |  |
| `updated_count` | int(10) UNSIGNED | NO | 0 |  |  |
| `failed_count` | int(10) UNSIGNED | NO | 0 |  |  |
| `exit_code` | int(11) | YES | NULL |  |  |
| `stdout` | longtext | YES | NULL |  |  |
| `stderr` | longtext | YES | NULL |  |  |
| `created_at` | datetime(6) | NO | current_timestamp(6) |  |  |
| `updated_at` | datetime(6) | NO | current_timestamp(6) |  |  |
| `deleted_at` | datetime(6) | YES | NULL |  |  |

## Table: `notifications`
**Description:**

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `notification_id` | int(11) | NO |  |  |  |
| `user_id` | int(11) | NO |  |  |  |
| `title` | varchar(255) | NO |  |  |  |
| `message` | text | YES | NULL |  |  |
| `type` | enum('info','success','warning','error') | YES | 'info' |  |  |
| `is_read` | tinyint(1) | YES | 0 |  |  |
| `related_submission_id` | int(11) | YES | NULL |  |  |
| `create_at` | datetime | YES | current_timestamp() |  |  |
| `update_at` | datetime | YES | current_timestamp() |  |  |
| `delete_at` | datetime | YES | NULL |  |  |

## Table: `notification_message`
**Description:**

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `id` | bigint(20) | NO |  |  |  |
| `event_key` | varchar(100) | NO |  |  |  |
| `send_to` | enum('user','dept_head','admin') | NO |  |  |  |
| `title_template` | text | NO |  |  |  |
| `body_template` | text | NO |  |  |  |
| `default_title_template` | text | NO |  |  |  |
| `default_body_template` | text | NO |  |  |  |
| `description` | text | YES | NULL |  |  |
| `variables` | longtext CHARACTER SET utf8mb4 | NO |  |  |  |
| `default_variables` | longtext CHARACTER SET utf8mb4 | NO |  |  |  |
| `is_active` | tinyint(1) | NO | 1 |  |  |
| `updated_by` | bigint(20) | YES | NULL |  |  |
| `created_at` | timestamp | NO | current_timestamp() |  |  |
| `updated_at` | timestamp | NO | current_timestamp() |  |  |

## Table: `positions`
**Description:**

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `position_id` | int(11) | NO |  |  |  |
| `position_name` | varchar(255) | YES | NULL |  |  |
| `is_active` | enum('yes','no') | YES | 'yes' |  |  |
| `create_at` | datetime | YES | NULL |  |  |
| `update_at` | datetime | YES | NULL |  |  |
| `delete_at` | datetime | YES | NULL |  |  |

## Table: `projects`
**Description:**

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `project_id` | int(10) UNSIGNED | NO |  |  |  |
| `project_name` | varchar(255) | NO |  |  | ชื่อโครงการ |
| `type_id` | tinyint(3) UNSIGNED | NO |  |  | FK -> project_types |
| `event_date` | date | NO |  |  | วันที่จัด |
| `plan_id` | tinyint(3) UNSIGNED | NO |  |  | FK -> project_budget_plans |
| `budget_amount` | decimal(12,2) UNSIGNED | NO | 0.00 |  | งบประมาณ |
| `participants` | int(10) UNSIGNED | NO | 0 |  | จำนวนผู้เข้าร่วม |
| `beneficiaries_count` | int(10) UNSIGNED | NO | 0 |  | จำนวนหน่วยงานหรือชุมชนที่ได้รับประโยชน์ |
| `notes` | text | YES | NULL |  | หมายเหตุ |
| `created_by` | int(10) UNSIGNED | YES | NULL |  |  |
| `created_at` | timestamp | NO | current_timestamp() |  |  |
| `updated_at` | timestamp | YES | current_timestamp() |  |  |

## Table: `project_attachments`
**Description:**

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `file_id` | int(10) UNSIGNED | NO |  |  |  |
| `project_id` | int(10) UNSIGNED | NO |  |  |  |
| `original_name` | varchar(255) | NO |  |  |  |
| `stored_path` | varchar(500) | NO |  |  |  |
| `file_size` | bigint(20) UNSIGNED | NO | 0 |  |  |
| `mime_type` | varchar(100) | NO |  |  |  |
| `file_hash` | varchar(64) | YES | NULL |  |  |
| `is_public` | tinyint(1) | NO | 0 |  |  |
| `uploaded_by` | int(10) UNSIGNED | YES | NULL |  |  |
| `uploaded_at` | datetime | NO | current_timestamp() |  |  |
| `create_at` | datetime | NO | current_timestamp() |  |  |
| `update_at` | datetime | YES | current_timestamp() |  |  |
| `delete_at` | datetime | YES | NULL |  |  |
| `display_order` | smallint(5) UNSIGNED | NO | 1 |  |  |

## Table: `project_budget_plans`
**Description:**

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `plan_id` | tinyint(3) UNSIGNED | NO |  |  |  |
| `name_th` | varchar(255) | NO |  |  |  |
| `name_en` | varchar(255) | NO |  |  |  |
| `display_order` | smallint(5) UNSIGNED | NO | 1 |  |  |
| `is_active` | tinyint(1) | NO | 1 |  |  |

## Table: `project_members`
**Description:**

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `member_id` | bigint(20) UNSIGNED | NO |  |  |  |
| `project_id` | int(10) UNSIGNED | NO |  |  |  |
| `user_id` | int(10) UNSIGNED | NO |  |  |  |
| `duty` | varchar(255) | NO |  |  |  |
| `workload_hours` | decimal(6,2) UNSIGNED | NO | 0.00 |  | ชั่วโมง |
| `display_order` | smallint(5) UNSIGNED | NO | 1 |  |  |
| `notes` | varchar(255) | YES | NULL |  |  |
| `created_at` | timestamp | NO | current_timestamp() |  |  |
| `updated_at` | timestamp | YES | current_timestamp() |  |  |

## Table: `project_types`
**Description:**

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `type_id` | tinyint(3) UNSIGNED | NO |  |  |  |
| `name_th` | varchar(255) | NO |  |  |  |
| `name_en` | varchar(255) | NO |  |  |  |
| `display_order` | smallint(5) UNSIGNED | NO | 1 |  |  |
| `is_active` | tinyint(1) | NO | 1 |  |  |

## Table: `publications`
**Description:**

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `id` | int(11) | NO |  |  |  |
| `user_id` | int(11) | NO |  |  |  |
| `title` | varchar(500) | NO |  |  |  |
| `authors` | text | YES | NULL |  |  |
| `journal` | varchar(255) | YES | NULL |  |  |
| `publication_type` | enum('journal','conference','book','thesis','other') | YES | NULL |  |  |
| `publication_date` | date | YES | NULL |  |  |
| `publication_year` | smallint(5) UNSIGNED | YES | NULL |  |  |
| `doi` | varchar(255) | YES | NULL |  |  |
| `url` | varchar(512) | YES | NULL |  |  |
| `cited_by` | int(10) UNSIGNED | YES | NULL |  |  |
| `cited_by_url` | varchar(512) | YES | NULL |  |  |
| `source` | enum('scholar','openalex','orcid','crossref') | YES | NULL |  |  |
| `external_ids` | longtext | YES | NULL |  |  |
| `fingerprint` | varchar(64) | YES | NULL |  |  |
| `is_verified` | tinyint(1) | NO | 0 |  |  |
| `created_at` | datetime | YES | current_timestamp() |  |  |
| `updated_at` | datetime | YES | current_timestamp() |  |  |
| `deleted_at` | datetime | YES | NULL |  |  |
| `citation_history` | longtext | YES | NULL |  | citations per year, e.g. {"2018":8,"2019":22} |

## Table: `publication_reward_details`
**Description:** ตารางเก็บรายละเอียดการขอรับเงินรางวัลผลงานวิชาการ พร้อมข้อมูลเพิ่มเติม

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `detail_id` | int(11) | NO |  |  |  |
| `submission_id` | int(11) | NO |  |  |  |
| `paper_title` | varchar(500) | NO |  |  |  |
| `journal_name` | varchar(255) | NO |  |  |  |
| `publication_date` | date | NO |  |  |  |
| `publication_type` | enum('journal','conference','book_chapter','other') | YES | 'journal' |  |  |
| `quartile` | enum('Q1','Q2','Q3','Q4','T5','T10','TCI','N/A') | YES | 'N/A' |  |  |
| `impact_factor` | decimal(10,3) | YES | NULL |  |  |
| `doi` | varchar(255) | YES | NULL |  |  |
| `url` | varchar(500) | YES | NULL |  |  |
| `page_numbers` | varchar(50) | YES | NULL |  |  |
| `volume_issue` | varchar(100) | YES | NULL |  |  |
| `indexing` | varchar(255) | YES | NULL |  |  |
| `reward_amount` | decimal(15,2) | YES | 0.00 |  | เงินรางวัลอ้างอิงจาก Author และ Quartile |
| `reward_approve_amount` | decimal(15,2) | YES | 0.00 |  | จำนวนเงินรางวัลที่อนุมัติ |
| `revision_fee` | decimal(15,2) | YES | 0.00 |  | ค่าปรับปรุง |
| `revision_fee_approve_amount` | decimal(15,2) | YES | 0.00 |  | ค่าปรับปรุงที่ได้รับการอนุมัติ |
| `publication_fee` | decimal(15,2) | YES | 0.00 |  | ค่าตีพิมพ์ |
| `publication_fee_approve_amount` | decimal(15,2) | YES | 0.00 |  | ค่าตีพิมพ์ที่อนุมัติ |
| `external_funding_amount` | decimal(15,2) | YES | 0.00 |  | รวมจำนวนเงินจากทุนที่ user แนบเข้ามา |
| `total_amount` | decimal(15,2) | YES | 0.00 |  | เกิดจากการหักลบค่าปรับปรุง+ค่าตีพิมพ์ ลบกับ รายการที่เบิกจากหน่วยงานนอก |
| `total_approve_amount` | decimal(15,2) | YES | 0.00 |  | จำนวนเงินจริงที่วิทยาลัยจ่ายให้ (หลังจากได้รับการอนุมัติ) |
| `announce_reference_number` | varchar(50) | YES | NULL |  |  |
| `author_count` | int(11) | YES | 1 |  |  |
| `author_type` | enum('first_author','corresponding_author','coauthor') | YES | 'coauthor' |  |  |
| `has_university_funding` | enum('yes','no') | YES | 'no' |  | ได้รับการสนับสนุนทุนจากมหาวิทยาลัยหรือไม่ |
| `funding_references` | text | YES | NULL |  | หมายเลขอ้างอิงทุน (คั่นด้วยจุลภาค) |
| `university_rankings` | text | YES | NULL |  | อันดับมหาวิทยาลัย/สถาบัน (คั่นด้วยจุลภาค) |
| `approved_amount` | decimal(15,2) | YES | NULL |  |  |
| `create_at` | datetime | NO | current_timestamp() |  |  |
| `update_at` | datetime | NO | current_timestamp() |  |  |
| `delete_at` | datetime | YES | NULL |  |  |
| `main_annoucement` | int(11) | YES | NULL |  |  |
| `reward_announcement` | int(11) | YES | NULL |  |  |
| `author_name_list` | text | YES | NULL |  |  |
| `signature` | varchar(255) | YES | NULL |  |  |

## Table: `publication_reward_external_funds`
**Description:** รายละเอียดทุนภายนอกและไฟล์ประกอบของคำร้องขอรางวัลตีพิมพ์

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `external_fund_id` | int(11) | NO |  |  |  |
| `detail_id` | int(11) | NO |  |  |  |
| `submission_id` | int(11) | NO |  |  |  |
| `fund_name` | varchar(255) | YES | NULL |  |  |
| `amount` | decimal(15,2) | YES | 0.00 |  |  |
| `document_id` | int(11) | YES | NULL |  |  |
| `file_id` | int(11) | YES | NULL |  |  |
| `created_at` | datetime | NO | current_timestamp() |  |  |
| `updated_at` | datetime | NO | current_timestamp() |  |  |
| `deleted_at` | datetime | YES | NULL |  |  |

## Table: `publication_reward_rates`
**Description:**

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `rate_id` | int(11) | NO |  |  |  |
| `year` | varchar(4) | NO |  |  |  |
| `author_status` | enum('first_author','corresponding_author') | NO |  |  |  |
| `journal_quartile` | enum('Q1','Q2','Q3','Q4','T5','T10','TCI','N/A') | NO |  |  |  |
| `reward_amount` | decimal(15,2) | NO |  |  | จำนวนเงินรางวัล |
| `is_active` | tinyint(1) | YES | 1 |  |  |
| `create_at` | datetime | YES | current_timestamp() |  |  |
| `update_at` | datetime | YES | current_timestamp() |  |  |

## Table: `research_fund_admin_events`
**Description:**

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `event_id` | int(11) | NO |  |  |  |
| `submission_id` | int(11) | NO |  |  |  |
| `status_after_id` | int(11) | YES | NULL |  |  |
| `amount` | decimal(15,2) | YES | NULL |  |  |
| `comment` | text | YES | NULL |  |  |
| `created_by` | int(11) | NO |  |  |  |
| `created_at` | datetime | YES | current_timestamp() |  |  |

## Table: `research_fund_event_files`
**Description:**

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `event_file_id` | int(11) | NO |  |  |  |
| `event_id` | int(11) | NO |  |  |  |
| `file_id` | int(11) | NO |  |  |  |
| `created_at` | datetime | YES | current_timestamp() |  |  |

## Table: `reward_config`
**Description:**

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `config_id` | int(11) | NO |  |  |  |
| `year` | varchar(4) | NO |  |  | ปีงบประมาณ (พ.ศ.) |
| `journal_quartile` | enum('Q1','Q2','Q3','Q4','T5','T10','TCI','N/A') | YES | NULL |  | ระดับ Quartile ของวารสาร |
| `max_amount` | decimal(15,2) | NO | 0.00 |  | จำนวนเงินสูงสุดที่รับสนับสนุน |
| `condition_description` | text | YES | NULL |  | เงื่อนไขเพิ่มเติม |
| `is_active` | tinyint(1) | YES | 1 |  | สถานะการใช้งาน |
| `create_at` | datetime | YES | current_timestamp() |  |  |
| `update_at` | datetime | YES | current_timestamp() |  |  |
| `delete_at` | datetime | YES | NULL |  |  |

## Table: `roles`
**Description:**

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `role_id` | int(11) | NO |  |  |  |
| `role` | varchar(255) | YES | NULL |  |  |
| `create_at` | datetime | YES | current_timestamp() |  |  |
| `update_at` | datetime | YES | NULL |  |  |
| `delete_at` | datetime | YES | NULL |  |  |

## Table: `scholar_import_runs`
**Description:**

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `id` | bigint(20) UNSIGNED | NO |  |  |  |
| `trigger_source` | varchar(64) | NO |  |  |  |
| `status` | enum('running','success','failed') | NO | 'running' |  |  |
| `error_message` | text | YES | NULL |  |  |
| `started_at` | datetime | NO | current_timestamp() |  |  |
| `finished_at` | datetime | YES | NULL |  |  |
| `users_processed` | int(10) UNSIGNED | NO | 0 |  |  |
| `users_with_errors` | int(10) UNSIGNED | NO | 0 |  |  |
| `publications_fetched` | int(10) UNSIGNED | NO | 0 |  |  |
| `publications_created` | int(10) UNSIGNED | NO | 0 |  |  |
| `publications_updated` | int(10) UNSIGNED | NO | 0 |  |  |
| `publications_failed` | int(10) UNSIGNED | NO | 0 |  |  |
| `created_at` | datetime | NO | current_timestamp() |  |  |
| `updated_at` | datetime | NO | current_timestamp() |  |  |
| `deleted_at` | datetime | YES | NULL |  |  |

## Table: `scopus_affiliations`
**Description:**

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `id` | bigint(20) UNSIGNED | NO |  |  |  |
| `afid` | varchar(32) | NO |  |  |  |
| `name` | text | YES | NULL |  |  |
| `city` | text | YES | NULL |  |  |
| `country` | text | YES | NULL |  |  |
| `affiliation_url` | text | YES | NULL |  |  |
| `created_at` | datetime | NO | current_timestamp() |  |  |
| `updated_at` | datetime | NO | current_timestamp() |  |  |

## Table: `scopus_api_import_jobs`
**Description:**

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `id` | bigint(20) UNSIGNED | NO |  |  |  |
| `service` | varchar(64) | NO | 'scopus' |  |  |
| `job_type` | varchar(64) | NO | 'author_documents' |  |  |
| `scopus_author_id` | varchar(100) | YES | NULL |  |  |
| `query_string` | text | NO |  |  |  |
| `total_results` | int(11) | YES | NULL |  |  |
| `status` | varchar(32) | NO | 'running' |  |  |
| `error_message` | text | YES | NULL |  |  |
| `started_at` | datetime | NO | current_timestamp() |  |  |
| `finished_at` | datetime | YES | NULL |  |  |
| `created_at` | datetime | NO | current_timestamp() |  |  |
| `updated_at` | datetime | NO | current_timestamp() |  |  |

## Table: `scopus_api_requests`
**Description:**

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `id` | bigint(20) UNSIGNED | NO |  |  |  |
| `job_id` | bigint(20) UNSIGNED | NO |  |  |  |
| `http_method` | varchar(8) | NO | 'GET' |  |  |
| `endpoint` | text | NO |  |  |  |
| `query_params` | longtext CHARACTER SET utf8mb4 | YES | NULL |  |  |
| `request_headers` | longtext CHARACTER SET utf8mb4 | YES | NULL |  |  |
| `response_status` | int(11) | YES | NULL |  |  |
| `response_time_ms` | int(11) | YES | NULL |  |  |
| `page_start` | int(11) | YES | NULL |  |  |
| `page_count` | int(11) | YES | NULL |  |  |
| `items_returned` | int(11) | YES | NULL |  |  |
| `created_at` | datetime | NO | current_timestamp() |  |  |

## Table: `scopus_authors`
**Description:**

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `id` | bigint(20) UNSIGNED | NO |  |  |  |
| `scopus_author_id` | varchar(100) | NO |  |  |  |
| `full_name` | text | YES | NULL |  |  |
| `given_name` | text | YES | NULL |  |  |
| `surname` | text | YES | NULL |  |  |
| `initials` | text | YES | NULL |  |  |
| `orcid` | varchar(64) | YES | NULL |  |  |
| `author_url` | text | YES | NULL |  |  |
| `created_at` | datetime | NO | current_timestamp() |  |  |
| `updated_at` | datetime | NO | current_timestamp() |  |  |

## Table: `scopus_config`
**Description:**

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `id` | bigint(20) UNSIGNED | NO |  |  |  |
| `key` | varchar(128) | NO |  |  |  |
| `value` | text | NO |  |  |  |
| `updated_at` | datetime | NO | current_timestamp() |  |  |

## Table: `scopus_documents`
**Description:**

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `id` | bigint(20) UNSIGNED | NO |  |  |  |
| `eid` | varchar(64) | NO |  |  |  |
| `scopus_id` | varchar(64) | YES | NULL |  |  |
| `scopus_link` | text | YES | NULL |  |  |
| `title` | text | YES | NULL |  |  |
| `abstract` | longtext | YES | NULL |  |  |
| `aggregation_type` | varchar(32) | YES | NULL |  |  |
| `subtype` | varchar(32) | YES | NULL |  |  |
| `subtype_description` | text | YES | NULL |  |  |
| `source_id` | varchar(32) | YES | NULL |  |  |
| `publication_name` | text | YES | NULL |  |  |
| `issn` | varchar(32) | YES | NULL |  |  |
| `eissn` | varchar(32) | YES | NULL |  |  |
| `isbn` | varchar(64) | YES | NULL |  |  |
| `volume` | varchar(32) | YES | NULL |  |  |
| `issue` | varchar(32) | YES | NULL |  |  |
| `page_range` | varchar(64) | YES | NULL |  |  |
| `article_number` | varchar(64) | YES | NULL |  |  |
| `cover_date` | date | YES | NULL |  |  |
| `cover_display_date` | text | YES | NULL |  |  |
| `doi` | varchar(255) | YES | NULL |  |  |
| `pii` | varchar(64) | YES | NULL |  |  |
| `citedby_count` | int(11) | YES | NULL |  |  |
| `openaccess` | tinyint(4) | YES | NULL |  |  |
| `openaccess_flag` | tinyint(1) | YES | NULL |  |  |
| `authkeywords` | longtext CHARACTER SET utf8mb4 | YES | NULL |  |  |
| `fund_acr` | text | YES | NULL |  |  |
| `fund_sponsor` | text | YES | NULL |  |  |
| `raw_json` | longtext CHARACTER SET utf8mb4 | YES | NULL |  |  |
| `created_at` | datetime | NO | current_timestamp() |  |  |
| `updated_at` | datetime | NO | current_timestamp() |  |  |

## Table: `scopus_document_authors`
**Description:**

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `id` | bigint(20) UNSIGNED | NO |  |  |  |
| `document_id` | bigint(20) UNSIGNED | NO |  |  |  |
| `author_id` | bigint(20) UNSIGNED | NO |  |  |  |
| `author_seq` | int(11) | YES | NULL |  |  |
| `affiliation_id` | bigint(20) UNSIGNED | YES | NULL |  |  |
| `created_at` | datetime | NO | current_timestamp() |  |  |
| `updated_at` | datetime | NO | current_timestamp() |  |  |

## Table: `scopus_source_metrics`
**Description:**

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `source_metric_id` | int(11) | NO |  |  |  |
| `source_id` | varchar(32) | NO |  |  | Scopus source-id (source-id) |
| `issn` | varchar(32) | YES | NULL |  | prism:issn |
| `eissn` | varchar(32) | YES | NULL |  | prism:eIssn |
| `metric_year` | int(4) | NO |  |  | year attribute from citeScoreYearInfo / SNIP / SJR / yearly-data |
| `doc_type` | varchar(32) | NO | 'all' |  | citeScoreInfo.docType (usually all, article, review, etc.) |
| `cite_score` | decimal(8,3) | YES | NULL |  |  |
| `cite_score_status` | enum('Complete','In-Progress') | YES | NULL |  | status attribute on citeScoreYearInfo |
| `cite_score_scholarly_output` | int(11) | YES | NULL |  |  |
| `cite_score_citation_count` | int(11) | YES | NULL |  |  |
| `cite_score_percent_cited` | decimal(5,2) | YES | NULL |  |  |
| `cite_score_rank` | int(11) | YES | NULL |  |  |
| `cite_score_percentile` | decimal(5,2) | YES | NULL |  |  |
| `cite_score_quartile` | varchar(4) | YES | NULL |  | Q1, Q2, Q3, Q4 if present |
| `cite_score_current_metric` | decimal(8,3) | YES | NULL |  |  |
| `cite_score_current_metric_year` | int(4) | YES | NULL |  |  |
| `cite_score_tracker` | decimal(8,3) | YES | NULL |  |  |
| `cite_score_tracker_year` | int(4) | YES | NULL |  |  |
| `sjr` | decimal(8,3) | YES | NULL |  |  |
| `snip` | decimal(8,3) | YES | NULL |  |  |
| `publication_count` | int(11) | YES | NULL |  |  |
| `cite_count_sce` | int(11) | YES | NULL |  |  |
| `zero_cites_sce` | decimal(5,2) | YES | NULL |  |  |
| `rev_percent` | decimal(5,2) | YES | NULL |  |  |
| `created_at` | datetime | YES | current_timestamp() |  |  |
| `updated_at` | datetime | YES | current_timestamp() |  |  |
| `last_fetched_at` | datetime | YES | NULL |  | Last time metrics were fetched from Scopus API |

## Table: `subcategory_budgets`
**Description:**

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `subcategory_budget_id` | int(11) | NO |  |  |  |
| `subcategory_id` | int(11) | NO |  |  |  |
| `record_scope` | enum('overall','rule') | NO | 'rule' |  |  |
| `allocated_amount` | decimal(15,2) | YES | NULL |  | งบทั้งหมดประมาณของทุน |
| `remaining_budget` | decimal(15,2) | YES | NULL |  | ไม่ได้ใช้ |
| `used_amount` | decimal(15,2) | YES | NULL |  | ไม่ได้ใช้ |
| `max_amount_per_grant` | decimal(15,2) | YES | NULL |  |  |
| `max_amount_per_year` | decimal(15,2) | YES | NULL |  |  |
| `max_grants` | int(11) | YES | NULL |  |  |
| `remaining_grant` | int(11) | YES | NULL |  | ไม่ได้ใช้ |
| `level` | enum('ต้น','กลาง','สูง') | YES | NULL |  | ไม่ได้ใช้ |
| `status` | enum('active','disable') | YES | NULL |  |  |
| `fund_description` | text | YES | NULL |  |  |
| `comment` | text | YES | NULL |  |  |
| `create_at` | datetime | YES | current_timestamp() |  |  |
| `update_at` | datetime | YES | current_timestamp() |  |  |
| `delete_at` | datetime | YES | NULL |  |  |

## Table: `submissions`
**Description:**

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `submission_id` | int(11) | NO |  |  |  |
| `submission_type` | enum('fund_application','publication_reward') | NO |  |  | ใช้ในการ generate submission number |
| `submission_number` | varchar(255) | YES | NULL |  |  |
| `user_id` | int(11) | NO |  |  |  |
| `year_id` | int(11) | NO |  |  |  |
| `category_id` | int(11) | YES | NULL |  |  |
| `subcategory_id` | int(11) | YES | NULL |  |  |
| `subcategory_budget_id` | int(11) | YES | NULL |  |  |
| `status_id` | int(11) | NO |  |  |  |
| `submitted_at` | datetime | YES | NULL |  |  |
| `reviewed_at` | datetime | YES | NULL |  |  |
| `head_rejected_by` | int(11) | YES | NULL |  |  |
| `head_rejected_at` | datetime | YES | NULL |  |  |
| `head_rejection_reason` | text | YES | NULL |  |  |
| `head_approved_by` | int(11) | YES | NULL |  |  |
| `head_approved_at` | datetime | YES | NULL |  |  |
| `head_comment` | text | YES | NULL |  |  |
| `head_signature` | varchar(255) | YES | NULL |  |  |
| `admin_approved_by` | int(11) | YES | NULL |  |  |
| `admin_approved_at` | datetime | YES | NULL |  |  |
| `admin_rejected_by` | int(11) | YES | NULL |  |  |
| `admin_rejected_at` | datetime | YES | NULL |  |  |
| `admin_rejection_reason` | text | YES | NULL |  |  |
| `admin_comment` | text | YES | NULL |  |  |
| `contact_phone` | varchar(50) | YES | NULL |  |  |
| `bank_account` | varchar(50) | YES | NULL |  |  |
| `bank_name` | varchar(100) | YES | NULL |  |  |
| `bank_account_name` | varchar(150) | YES | NULL |  |  |
| `rejected_by` | int(11) | YES | NULL |  | เช็คคนที่อัพเดทล่าสุด |
| `rejected_at` | datetime | YES | NULL |  | เช็คเวลาที่อัพเดทล่าสุด |
| `approved_at` | datetime | YES | NULL |  | เช็คเวลาที่อัพเดทล่าสุด |
| `approved_by` | int(11) | YES | NULL |  | เช็คคนที่อัพเดทล่าสุด |
| `created_at` | datetime | YES | current_timestamp() |  |  |
| `updated_at` | datetime | YES | current_timestamp() |  |  |
| `deleted_at` | datetime | YES | NULL |  |  |
| `installment_number_at_submit` | int(11) | YES | NULL |  |  |
| `installment_fund_name_at_submit` | varchar(255) | YES | NULL |  |  |

## Table: `submission_documents`
**Description:**

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `document_id` | int(11) | NO |  |  |  |
| `submission_id` | int(11) | NO |  |  |  |
| `file_id` | int(11) | NO |  |  |  |
| `original_name` | varchar(255) | YES | NULL |  |  |
| `document_type_id` | int(11) | NO |  |  |  |
| `description` | text | YES | NULL |  |  |
| `display_order` | int(11) | YES | 0 |  |  |
| `is_required` | tinyint(1) | YES | 0 |  |  |
| `is_verified` | tinyint(1) | YES | 0 |  |  |
| `verified_by` | int(11) | YES | NULL |  |  |
| `verified_at` | datetime | YES | NULL |  |  |
| `created_at` | datetime | YES | current_timestamp() |  |  |

## Table: `submission_users`
**Description:**

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `id` | int(11) | NO |  |  |  |
| `submission_id` | int(11) | NO |  |  |  |
| `user_id` | int(11) | NO |  |  |  |
| `role` | enum('owner','coauthor','team_member','advisor','coordinator','co_author') | YES | 'coauthor' |  |  |
| `is_primary` | tinyint(1) | YES | 0 |  |  |
| `display_order` | int(11) | YES | 0 |  |  |
| `created_at` | datetime | YES | current_timestamp() |  |  |

## Table: `system_config`
**Description:**

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `config_id` | int(11) | NO |  |  |  |
| `system_version` | varchar(20) | YES | '1.0.0' |  |  |
| `last_updated` | datetime | YES | current_timestamp() |  |  |
| `updated_by` | int(11) | YES | NULL |  |  |
| `current_year` | varchar(250) | YES | NULL |  |  |
| `start_date` | datetime | NO |  |  |  |
| `end_date` | datetime | NO |  |  |  |
| `main_annoucement` | int(11) | YES | NULL |  |  |
| `reward_announcement` | int(11) | YES | NULL |  |  |
| `activity_support_announcement` | int(11) | YES | NULL |  |  |
| `conference_announcement` | int(11) | YES | NULL |  |  |
| `service_announcement` | int(11) | YES | NULL |  |  |
| `contact_info` | text | YES | NULL |  |  |
| `kku_report_year` | varchar(50) | YES | NULL |  | ปีระเบียบกองทุนมหาวิทยาลัยขอนแก่น |
| `installment` | int(11) | YES | NULL |  | เลขที่ใส่ในเอกสาร Publication Reward ในส่วน "งวดที่" |

## Table: `users`
**Description:**

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `user_id` | int(11) | NO |  |  |  |
| `user_fname` | varchar(255) | YES | NULL |  |  |
| `user_lname` | varchar(255) | YES | NULL |  |  |
| `gender` | varchar(255) | YES | NULL |  |  |
| `email` | varchar(255) | YES | NULL |  |  |
| `email_notification` | varchar(255) | YES | NULL |  |  |
| `scholar_author_id` | varchar(64) CHARACTER SET utf8mb4 | YES | NULL |  |  |
| `scopus_id` | varchar(100) | YES | NULL |  |  |
| `password` | varchar(255) | YES | NULL |  |  |
| `role_id` | int(11) | YES | NULL |  |  |
| `position_id` | int(11) | YES | NULL |  |  |
| `date_of_employment` | date | YES | NULL |  |  |
| `create_at` | datetime | YES | current_timestamp() |  |  |
| `update_at` | datetime | YES | NULL |  |  |
| `delete_at` | datetime | YES | NULL |  |  |
| `prefix` | varchar(50) | YES | NULL |  |  |
| `manage_position` | varchar(255) | YES | NULL |  |  |
| `position` | varchar(255) | YES | NULL |  |  |
| `position_en` | varchar(255) | YES | NULL |  |  |
| `prefix_position_en` | varchar(50) | YES | NULL |  |  |
| `Name_en` | varchar(255) | YES | NULL |  |  |
| `suffix_en` | varchar(50) | YES | NULL |  |  |
| `TEL` | varchar(50) | YES | NULL |  |  |
| `TELformat` | varchar(50) | YES | NULL |  |  |
| `TEL_ENG` | varchar(50) | YES | NULL |  |  |
| `manage_position_en` | varchar(255) | YES | NULL |  |  |
| `LAB_Name` | varchar(255) | YES | NULL |  |  |
| `Room` | varchar(255) | YES | NULL |  |  |
| `CP_WEB_ID` | varchar(255) | YES | NULL |  |  |
| `Is_active` | char(1) | YES | 'A' |  |  |

## Table: `user_fund_eligibilities`
**Description:**

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `user_fund_eligibility_id` | int(11) | NO |  |  |  |
| `user_id` | int(11) | YES | NULL |  |  |
| `year_id` | int(11) | YES | NULL |  |  |
| `category_id` | int(11) | YES | NULL |  |  |
| `remaining_quota` | decimal(15,2) | YES | NULL |  |  |
| `max_allowed_amount` | decimal(15,2) | YES | NULL |  |  |
| `remaining_applications` | int(11) | YES | NULL |  |  |
| `is_eligible` | varchar(255) | YES | NULL |  |  |
| `restriction_reason` | text | YES | NULL |  |  |
| `calculated_at` | datetime | YES | NULL |  |  |
| `create_at` | datetime | YES | NULL |  |  |
| `update_at` | datetime | YES | NULL |  |  |
| `delete_at` | datetime | YES | NULL |  |  |

## Table: `user_innovations_view`
**Description:**

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `submission_id` | int(11) | YES |  |  |  |
| `user_id` | int(11) | NO |  |  |  |
| `hindex` | smallint(5) UNSIGNED | YES | NULL |  |  |
| `hindex5y` | smallint(5) UNSIGNED | YES | NULL |  |  |
| `i10index` | smallint(5) UNSIGNED | YES | NULL |  |  |
| `i10index5y` | smallint(5) UNSIGNED | YES | NULL |  |  |
| `citedby_total` | int(10) UNSIGNED | YES | NULL |  |  |
| `citedby_5y` | int(10) UNSIGNED | YES | NULL |  |  |
| `cites_per_year` | longtext | YES | NULL |  |  |
| `updated_at` | datetime | NO | current_timestamp() |  |  |

## Table: `user_sessions`
**Description:**

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `session_id` | int(11) | NO |  |  |  |
| `user_id` | int(11) | NO |  |  |  |
| `access_token_jti` | varchar(191) CHARACTER SET utf8mb4 | YES | NULL |  |  |
| `refresh_token` | varchar(255) CHARACTER SET utf8mb4 | YES | NULL |  |  |
| `device_name` | varchar(255) | YES | NULL |  |  |
| `device_type` | varchar(50) | YES | NULL |  |  |
| `ip_address` | varchar(45) | YES | NULL |  |  |
| `user_agent` | text | YES | NULL |  |  |
| `last_activity` | datetime | YES | NULL |  |  |
| `expires_at` | datetime | NO |  |  |  |
| `is_active` | tinyint(1) | YES | 1 |  |  |
| `created_at` | datetime | YES | current_timestamp() |  |  |
| `updated_at` | datetime | YES | current_timestamp() |  |  |

## Table: `user_tokens`
**Description:**

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `token_id` | int(11) | NO |  |  |  |
| `user_id` | int(11) | NO |  |  |  |
| `token_type` | varchar(64) | YES | NULL |  |  |
| `token` | varchar(255) CHARACTER SET utf8mb4 | YES | NULL |  |  |
| `expires_at` | datetime | NO |  |  |  |
| `is_revoked` | tinyint(1) | YES | 0 |  |  |
| `device_info` | varchar(255) | YES | NULL |  |  |
| `ip_address` | varchar(45) | YES | NULL |  |  |
| `user_agent` | text | YES | NULL |  |  |
| `created_at` | datetime | YES | current_timestamp() |  |  |
| `updated_at` | datetime | YES | current_timestamp() |  |  |

## Table: `view_budget_summary`
**Description:**

| Column | Type | Null | Default | Key | Description |
| --- | --- | --- | --- | --- | --- |
| `year` | varchar(255) | YES |  |  |  |
| `application_id` | int(11) | YES |  |  |  |
| `config_id` | int(11) | YES |  |  |  |
| `submission_id` | int(11) | YES |  |  |  |
| `user_id` | int(11) | YES |  |  |  |
| `subcategory_id` | int(11) | YES |  |  |  |
| `slot_code` | enum('main','reward','activity_support','conference','service') | YES |  |  |  |
| `head_user_id` | int(11) | YES |  |  |  |
| `file_id` | int(11) | YES |  |  |  |
| `user_id` | int(11) | YES |  |  |  |
| `application_id` | int(11) | YES |  |  |  |
| `reward_id` | int(11) | YES |  |  |  |
| `log_id` | int(11) | YES |  |  |  |
| `user_id` | int(11) | YES |  |  |  |
| `user_id` | int(11) | YES |  |  |  |
| `submission_number` | varchar(255) | YES |  |  |  |
| `user_id` | int(11) | YES |  |  |  |
| `year_id` | int(11) | NO |  |  |  |
| `year` | varchar(255) | YES | NULL |  |  |
| `status` | enum('active','inactive') | YES | 'active' |  |  |
| `create_at` | datetime | YES | current_timestamp() |  |  |
| `update_at` | datetime | YES | current_timestamp() |  |  |
| `delete_at` | datetime | YES | NULL |  |  |

## ตัวอย่างข้อมูลภาษาไทย (Thai Example)

ตัวอย่างระเบียนสำหรับตาราง `announcements`:

```
announcement_id: 20
title: "ประกาศเปิดรับสมัครทุนวิจัย ประจำปี 2569"
description: "กองทุนวิจัยและนวัตกรรมเปิดรับข้อเสนอโครงการ"
file_name: "ประกาศทุนวิจัย2569.pdf"
file_path: "uploads/announcements/2026/01/ประกาศทุนวิจัย2569.pdf"
announcement_type: "research_fund"
priority: "high"
status: "active"
published_at: "2026-01-15 09:00:00"
```