# Data Dictionary with Examples (fund_cpkku_v67.sql)

Generated from `fund_cpkku_v67.sql` with an Example column.

## Table: `announcements`
**Description:** ตารางเก็บประกาศจากกองทุนวิจัยและนวัตกรรม

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `announcement_id` | int(11) | NO |  |  |  | 1 |
| `title` | varchar(255) | NO |  |  | หัวข้อประกาศ | ตัวอย่างหัวข้อ |
| `description` | text | YES | NULL |  | รายละเอียดประกาศ | รายละเอียดตัวอย่าง |
| `file_name` | varchar(255) | NO |  |  | ชื่อไฟล์ต้นฉบับ | example.pdf |
| `file_path` | varchar(512) | NO |  |  | path ไฟล์ในระบบ | uploads/example/file.pdf |
| `file_size` | bigint(20) | YES | NULL |  | ขนาดไฟล์ (bytes) | 10 |
| `mime_type` | varchar(100) | YES | NULL |  | ประเภทไฟล์ | application/pdf |
| `announcement_type` | enum('general','research_fund','promotion_fund','publication_reward','fund_application') | YES | 'general' |  | ประเภทประกาศ | general |
| `announcement_reference_number` | varchar(50) | YES | NULL |  |  | DOC-001 |
| `priority` | enum('normal','high','urgent') | YES | 'normal' |  | ความสำคัญ | normal |
| `display_order` | int(11) | YES | NULL |  |  | 10 |
| `status` | enum('active','inactive') | YES | 'active' |  | สถานะการเผยแพร่ | active |
| `published_at` | datetime | YES | NULL |  | วันที่เผยแพร่ | 2026-01-15 09:00:00 |
| `expired_at` | datetime | YES | NULL |  | วันที่หมดอายุ | 2026-01-15 09:00:00 |
| `year_id` | int(11) | YES | NULL |  | ปีของประกาศ | 2569 |
| `created_by` | int(11) | NO |  |  | ผู้สร้าง (user_id) | 10 |
| `create_at` | datetime | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `update_at` | datetime | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `delete_at` | datetime | YES | NULL |  |  | 2026-01-15 09:00:00 |

## Table: `announcement_assignments`
**Description:**

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `assignment_id` | int(11) | NO |  |  |  | 1 |
| `slot_code` | enum('main','reward','activity_support','conference','service') | NO |  |  | ช่องประกาศที่ FE กำหนด | main |
| `announcement_id` | int(11) | YES | NULL |  | อาจเป็น NULL เพื่อระบุช่วงที่ไม่มีประกาศ | 1 |
| `start_date` | datetime | NO |  |  |  | 2026-01-15 09:00:00 |
| `end_date` | datetime | YES | NULL |  |  | 2026-01-15 09:00:00 |
| `changed_by` | int(11) | YES | NULL |  |  | 10 |
| `changed_at` | datetime | NO | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `note` | varchar(255) | YES | NULL |  | หมายเหตุเพิ่มเติมสำหรับการจัดประกาศ | ตัวอย่างข้อความ |

## Table: `application_status`
**Description:**

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `application_status_id` | int(11) | NO |  |  |  | 1 |
| `status_code` | varchar(64) CHARACTER SET utf8mb4 | YES | NULL |  |  | active |
| `status_name` | varchar(255) | YES | NULL |  |  | active |
| `create_at` | datetime | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `update_at` | datetime | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `delete_at` | datetime | YES | NULL |  |  | 2026-01-15 09:00:00 |

## Table: `audit_logs`
**Description:**

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `log_id` | int(11) | NO |  |  |  | 1 |
| `user_id` | int(11) | YES | NULL |  |  | 1 |
| `action` | enum('create','update','delete','login','logout','view','download','approve','reject','submit','review','request_revision') | NO |  |  |  | create |
| `entity_type` | varchar(50) | NO |  |  |  | ตัวอย่างข้อความ |
| `entity_id` | int(11) | YES | NULL |  |  | 1 |
| `entity_number` | varchar(50) | YES | NULL |  |  | DOC-001 |
| `old_values` | longtext | YES | NULL |  |  | ตัวอย่างข้อความ |
| `new_values` | longtext | YES | NULL |  |  | ตัวอย่างข้อความ |
| `changed_fields` | text | YES | NULL |  |  | ตัวอย่างข้อความ |
| `ip_address` | varchar(45) | YES | NULL |  |  | 203.0.113.10 |
| `user_agent` | varchar(255) | YES | NULL |  |  | Mozilla/5.0 |
| `description` | text | YES | NULL |  |  | รายละเอียดตัวอย่าง |
| `created_at` | datetime | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |

## Table: `cp_profile`
**Description:**

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | int(11) | NO |  |  |  | 1 |
| `user_id` | int(11) | YES | NULL |  | fk users table | 1 |
| `name_th` | varchar(255) | NO |  |  | ชื่อ (ภาษาไทย) | สมชาย ใจดี |
| `name_en` | varchar(255) | YES | NULL |  | Name (English) | Somchai Jaidee |
| `position` | varchar(255) | YES | NULL |  | ตำแหน่ง | เจ้าหน้าที่ |
| `email` | varchar(255) | YES | NULL |  | อีเมล | user@example.com |
| `photo_url` | varchar(500) | YES | NULL |  | URL รูปโปรไฟล์ | https://example.com/resource |
| `profile_url` | varchar(500) | YES | NULL |  |  | https://example.com/resource |
| `info` | text | YES | NULL |  | ข้อมูล | ตัวอย่างข้อความ |
| `education` | text | YES | NULL |  | ประวัติการศึกษา | ตัวอย่างข้อความ |
| `create_at` | datetime | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `update_at` | datetime | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |

## Table: `dept_head_assignments`
**Description:**

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `assignment_id` | int(11) | NO |  |  |  | 1 |
| `head_user_id` | int(11) | NO |  |  |  | 1 |
| `restore_role_id` | int(11) | NO |  |  |  | 1 |
| `effective_from` | datetime | NO |  |  |  | 2026-01-15 09:00:00 |
| `effective_to` | datetime | YES | NULL |  |  | 2026-01-15 09:00:00 |
| `changed_by` | int(11) | YES | NULL |  |  | 10 |
| `changed_at` | datetime | NO | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `note` | varchar(255) | YES | NULL |  |  | ตัวอย่างข้อความ |

## Table: `document_types`
**Description:**

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `document_type_id` | int(11) | NO |  |  |  | 1 |
| `document_type_name` | varchar(255) | YES | NULL |  |  | ตัวอย่างข้อความ |
| `code` | varchar(64) CHARACTER SET utf8mb4 | YES | NULL |  |  | CODE001 |
| `category` | varchar(50) | YES | 'general' |  | ไม่ได้ใช้ | ตัวอย่างข้อความ |
| `required` | tinyint(1) | YES | 0 |  |  | 1 |
| `multiple` | tinyint(1) | YES | 0 |  |  | 1 |
| `document_order` | int(11) | YES | 0 |  |  | 10 |
| `is_required` | enum('yes','no') | YES | NULL |  | ไม่ได้ใช้ | yes |
| `create_at` | datetime | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `update_at` | datetime | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `delete_at` | datetime | YES | NULL |  |  | 2026-01-15 09:00:00 |
| `fund_types` | longtext | YES | NULL |  | ประเภททุนที่ใช้ได้ ["publication_reward", "fund_application"] | ตัวอย่างข้อความ |
| `subcategory_ids` | longtext | YES | NULL |  | ไม่ได้ใช้ | ตัวอย่างข้อความ |
| `subcategory_name` | longtext | YES | NULL |  | snapshot ของชื่อทุน ไม่ผูก FK | ตัวอย่างข้อความ |

## Table: `end_of_contract`
**Description:**

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `eoc_id` | int(11) | NO |  |  |  | 1 |
| `content` | longtext | NO |  |  |  | ตัวอย่างข้อความ |
| `display_order` | int(11) | NO | 1 |  |  | 10 |

## Table: `file_uploads`
**Description:**

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `file_id` | int(11) | NO |  |  |  | 1 |
| `original_name` | varchar(255) | NO |  |  |  | ตัวอย่างข้อความ |
| `stored_path` | varchar(500) | NO |  |  |  | uploads/example/file.pdf |
| `folder_type` | enum('temp','submission','profile','other') | YES | 'temp' |  |  | temp |
| `submission_id` | int(11) | YES | NULL |  |  | 1 |
| `file_size` | bigint(20) | YES | NULL |  |  | 10 |
| `mime_type` | varchar(100) | YES | NULL |  |  | application/pdf |
| `file_hash` | varchar(64) CHARACTER SET utf8mb4 | YES | NULL |  |  | ตัวอย่างข้อความ |
| `is_public` | tinyint(1) | YES | 0 |  |  | 1 |
| `uploaded_by` | int(11) | YES | NULL |  |  | 10 |
| `uploaded_at` | datetime | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `create_at` | datetime | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `update_at` | datetime | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `delete_at` | datetime | YES | NULL |  |  | 2026-01-15 09:00:00 |

## Table: `fund_application_details`
**Description:**

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `detail_id` | int(11) | NO |  |  |  | 1 |
| `submission_id` | int(11) | NO |  |  |  | 1 |
| `subcategory_id` | int(11) | NO |  |  |  | 1 |
| `project_title` | varchar(255) | YES | NULL |  |  | ตัวอย่างหัวข้อ |
| `project_description` | text | YES | NULL |  |  | รายละเอียดตัวอย่าง |
| `requested_amount` | decimal(15,2) | YES | NULL |  |  | 10000.00 |
| `approved_amount` | decimal(15,2) | YES | NULL |  |  | 10000.00 |
| `closed_at` | datetime | YES | NULL |  |  | 2026-01-15 09:00:00 |
| `announce_reference_number` | varchar(50) | YES | NULL |  |  | DOC-001 |
| `main_annoucement` | int(11) | YES | NULL |  |  | 10 |
| `activity_support_announcement` | int(11) | YES | NULL |  |  | 10 |
| `author_name_list` | varchar(500) | YES | NULL |  |  | ตัวอย่างข้อความ |

## Table: `fund_categories`
**Description:**

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `category_id` | int(11) | NO |  |  |  | 1 |
| `category_name` | varchar(255) | YES | NULL |  |  | ตัวอย่างข้อความ |
| `status` | enum('active','disable') | YES | NULL |  |  | active |
| `year_id` | int(11) | YES | NULL |  |  | 2569 |
| `comment` | text | YES | NULL |  |  | หมายเหตุเพิ่มเติม |
| `create_at` | datetime | YES | NULL |  |  | 2026-01-15 09:00:00 |
| `update_at` | datetime | YES | NULL |  |  | 2026-01-15 09:00:00 |
| `delete_at` | datetime | YES | NULL |  |  | 2026-01-15 09:00:00 |

## Table: `fund_forms`
**Description:** ตารางเก็บแบบฟอร์มและเอกสารที่เกี่ยวข้องกับการขอทุน

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `form_id` | int(11) | NO |  |  |  | 1 |
| `title` | varchar(255) | NO |  |  | ชื่อแบบฟอร์ม | ตัวอย่างหัวข้อ |
| `description` | text | YES | NULL |  | รายละเอียดแบบฟอร์ม | รายละเอียดตัวอย่าง |
| `file_name` | varchar(255) | NO |  |  | ชื่อไฟล์ต้นฉบับ | example.pdf |
| `file_path` | varchar(500) | NO |  |  | path ไฟล์ในระบบ | uploads/example/file.pdf |
| `file_size` | bigint(20) | YES | NULL |  | ขนาดไฟล์ (bytes) | 10 |
| `mime_type` | varchar(100) | YES | NULL |  | ประเภทไฟล์ | application/pdf |
| `form_type` | enum('application','report','evaluation','guidelines','other') | YES | 'application' |  | ประเภทแบบฟอร์ม | application |
| `fund_category` | enum('research_fund','promotion_fund','both') | YES | 'both' |  | หมวดหมู่กองทุน | research_fund |
| `is_required` | tinyint(1) | YES | 0 |  | บังคับใช้หรือไม่ | 1 |
| `display_order` | int(11) | YES | NULL |  |  | 10 |
| `status` | enum('active','inactive','archived') | YES | 'active' |  | สถานะแบบฟอร์ม | active |
| `year_id` | int(11) | YES | NULL |  | ปีของแบบฟอร์ม | 2569 |
| `created_by` | int(11) | NO |  |  | ผู้สร้าง (user_id) | 10 |
| `create_at` | datetime | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `update_at` | datetime | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `delete_at` | datetime | YES | NULL |  |  | 2026-01-15 09:00:00 |

## Table: `fund_installment_periods`
**Description:**

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `installment_period_id` | int(11) | NO |  |  |  | 1 |
| `fund_level` | enum('category','subcategory') | NO | 'category' |  |  | category |
| `fund_keyword` | varchar(255) | NO | '' |  |  | ตัวอย่างข้อความ |
| `fund_parent_keyword` | varchar(255) | YES | NULL |  |  | ตัวอย่างข้อความ |
| `year_id` | int(11) | NO |  |  | FK → years.year_id | 2569 |
| `installment_number` | int(11) | NO |  |  | งวดที่ 1, 2, 3, ... | 10 |
| `cutoff_date` | date | NO |  |  | วันตัดของงวดนี้ (เช่น 2025-02-03) | 2026-01-15 |
| `name` | varchar(255) | YES | NULL |  | ป้ายกำกับงวด (เช่น "งวดแรก") | ตัวอย่างข้อความ |
| `status` | enum('active','inactive') | YES | 'active' |  |  | active |
| `remark` | text | YES | NULL |  |  | ตัวอย่างข้อความ |
| `created_at` | datetime | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `updated_at` | datetime | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `deleted_at` | datetime | YES | NULL |  |  | 2026-01-15 09:00:00 |

## Table: `fund_subcategories`
**Description:**

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `subcategory_id` | int(11) | NO |  |  |  | 1 |
| `category_id` | int(11) | YES | NULL |  |  | 1 |
| `subcategory_name` | varchar(255) | YES | NULL |  |  | ตัวอย่างข้อความ |
| `subcategory_code` | varchar(100) | YES | NULL |  |  | CODE001 |
| `fund_condition` | text | YES | NULL |  |  | ตัวอย่างข้อความ |
| `target_roles` | longtext | YES | NULL |  | บทบาทที่สามารถเห็นทุนนี้ได้ (เก็บเป็น JSON array) | ตัวอย่างข้อความ |
| `form_type` | varchar(50) | YES | 'download' |  | ประเภทฟอร์ม: download, publication_reward, fund_application, etc. | ตัวอย่างข้อความ |
| `form_url` | varchar(255) | YES | NULL |  | URL สำหรับดาวน์โหลดฟอร์ม (ถ้า form_type = download) | https://example.com/resource |
| `year_id` | int(255) | YES | NULL |  |  | 2569 |
| `status` | enum('active','disable') | YES | NULL |  |  | active |
| `comment` | text | YES | NULL |  |  | หมายเหตุเพิ่มเติม |
| `create_at` | datetime | YES | NULL |  |  | 2026-01-15 09:00:00 |
| `update_at` | datetime | YES | NULL |  |  | 2026-01-15 09:00:00 |
| `delete_at` | datetime | YES | NULL |  |  | 2026-01-15 09:00:00 |

## Table: `import_templates`
**Description:** ตารางเก็บไฟล์เทมเพลตสำหรับการนำเข้า

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `template_id` | int(11) | NO |  |  |  | 1 |
| `title` | varchar(255) | NO |  |  | ชื่อเทมเพลตนำเข้า | ตัวอย่างหัวข้อ |
| `description` | text | YES | NULL |  | รายละเอียดเทมเพลต | รายละเอียดตัวอย่าง |
| `file_name` | varchar(255) | NO |  |  | ชื่อไฟล์ต้นฉบับ | example.pdf |
| `file_path` | varchar(500) | NO |  |  | path ไฟล์ในระบบ | uploads/example/file.pdf |
| `file_size` | bigint(20) | YES | NULL |  | ขนาดไฟล์ (bytes) | 10 |
| `mime_type` | varchar(100) | YES | NULL |  | ประเภทไฟล์ | application/pdf |
| `template_type` | enum('user_import','legacy_submission','other') | YES | 'other' |  | ประเภทการนำเข้า | user_import |
| `is_required` | tinyint(1) | YES | 0 |  | บังคับใช้หรือไม่ | 1 |
| `display_order` | int(11) | YES | NULL |  |  | 10 |
| `status` | enum('active','inactive','archived') | YES | 'active' |  | สถานะเทมเพลต | active |
| `year_id` | int(11) | YES | NULL |  | ปีที่เกี่ยวข้อง | 2569 |
| `created_by` | int(11) | NO |  |  | ผู้สร้าง (user_id) | 10 |
| `create_at` | datetime | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `update_at` | datetime | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `delete_at` | datetime | YES | NULL |  |  | 2026-01-15 09:00:00 |

## Table: `innovations`
**Description:**

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | int(11) | NO |  |  |  | 1 |
| `user_id` | int(11) | NO |  |  |  | 1 |
| `title` | varchar(500) | NO |  |  |  | ตัวอย่างหัวข้อ |
| `innovation_type` | varchar(255) | YES | NULL |  |  | ตัวอย่างข้อความ |
| `description` | text | YES | NULL |  |  | รายละเอียดตัวอย่าง |
| `registered_date` | date | YES | NULL |  |  | 2026-01-15 |
| `created_at` | datetime | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `updated_at` | datetime | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |

## Table: `kku_people_import_runs`
**Description:**

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | bigint(20) UNSIGNED | NO |  |  |  | 1 |
| `trigger_source` | varchar(64) | NO |  |  |  | ตัวอย่างข้อความ |
| `dry_run` | tinyint(1) | NO | 0 |  |  | 1 |
| `status` | enum('running','success','failed') | NO | 'running' |  |  | running |
| `error_message` | text | YES | NULL |  |  | ตัวอย่างข้อความ |
| `started_at` | datetime(6) | NO | current_timestamp(6) |  |  | 2026-01-15 09:00:00 |
| `finished_at` | datetime(6) | YES | NULL |  |  | 2026-01-15 09:00:00 |
| `duration_seconds` | double | YES | NULL |  |  | 1000.00 |
| `fetched_count` | int(10) UNSIGNED | NO | 0 |  |  | 10 |
| `created_count` | int(10) UNSIGNED | NO | 0 |  |  | 10 |
| `updated_count` | int(10) UNSIGNED | NO | 0 |  |  | 10 |
| `failed_count` | int(10) UNSIGNED | NO | 0 |  |  | 10 |
| `exit_code` | int(11) | YES | NULL |  |  | 10 |
| `stdout` | longtext | YES | NULL |  |  | ตัวอย่างข้อความ |
| `stderr` | longtext | YES | NULL |  |  | ตัวอย่างข้อความ |
| `created_at` | datetime(6) | NO | current_timestamp(6) |  |  | 2026-01-15 09:00:00 |
| `updated_at` | datetime(6) | NO | current_timestamp(6) |  |  | 2026-01-15 09:00:00 |
| `deleted_at` | datetime(6) | YES | NULL |  |  | 2026-01-15 09:00:00 |

## Table: `notifications`
**Description:**

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `notification_id` | int(11) | NO |  |  |  | 1 |
| `user_id` | int(11) | NO |  |  |  | 1 |
| `title` | varchar(255) | NO |  |  |  | ตัวอย่างหัวข้อ |
| `message` | text | YES | NULL |  |  | ตัวอย่างข้อความ |
| `type` | enum('info','success','warning','error') | YES | 'info' |  |  | info |
| `is_read` | tinyint(1) | YES | 0 |  |  | 1 |
| `related_submission_id` | int(11) | YES | NULL |  |  | 1 |
| `create_at` | datetime | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `update_at` | datetime | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `delete_at` | datetime | YES | NULL |  |  | 2026-01-15 09:00:00 |

## Table: `notification_message`
**Description:**

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | bigint(20) | NO |  |  |  | 1 |
| `event_key` | varchar(100) | NO |  |  |  | ตัวอย่างข้อความ |
| `send_to` | enum('user','dept_head','admin') | NO |  |  |  | user |
| `title_template` | text | NO |  |  |  | ตัวอย่างข้อความ |
| `body_template` | text | NO |  |  |  | ตัวอย่างข้อความ |
| `default_title_template` | text | NO |  |  |  | ตัวอย่างข้อความ |
| `default_body_template` | text | NO |  |  |  | ตัวอย่างข้อความ |
| `description` | text | YES | NULL |  |  | รายละเอียดตัวอย่าง |
| `variables` | longtext CHARACTER SET utf8mb4 | NO |  |  |  | ตัวอย่างข้อความ |
| `default_variables` | longtext CHARACTER SET utf8mb4 | NO |  |  |  | ตัวอย่างข้อความ |
| `is_active` | tinyint(1) | NO | 1 |  |  | 1 |
| `updated_by` | bigint(20) | YES | NULL |  |  | 10 |
| `created_at` | timestamp | NO | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `updated_at` | timestamp | NO | current_timestamp() |  |  | 2026-01-15 09:00:00 |

## Table: `positions`
**Description:**

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `position_id` | int(11) | NO |  |  |  | 1 |
| `position_name` | varchar(255) | YES | NULL |  |  | เจ้าหน้าที่ |
| `is_active` | enum('yes','no') | YES | 'yes' |  |  | yes |
| `create_at` | datetime | YES | NULL |  |  | 2026-01-15 09:00:00 |
| `update_at` | datetime | YES | NULL |  |  | 2026-01-15 09:00:00 |
| `delete_at` | datetime | YES | NULL |  |  | 2026-01-15 09:00:00 |

## Table: `projects`
**Description:**

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `project_id` | int(10) UNSIGNED | NO |  |  |  | 1 |
| `project_name` | varchar(255) | NO |  |  | ชื่อโครงการ | ตัวอย่างข้อความ |
| `type_id` | tinyint(3) UNSIGNED | NO |  |  | FK -> project_types | 1 |
| `event_date` | date | NO |  |  | วันที่จัด | 2026-01-15 |
| `plan_id` | tinyint(3) UNSIGNED | NO |  |  | FK -> project_budget_plans | 1 |
| `budget_amount` | decimal(12,2) UNSIGNED | NO | 0.00 |  | งบประมาณ | 10000.00 |
| `participants` | int(10) UNSIGNED | NO | 0 |  | จำนวนผู้เข้าร่วม | 10 |
| `beneficiaries_count` | int(10) UNSIGNED | NO | 0 |  | จำนวนหน่วยงานหรือชุมชนที่ได้รับประโยชน์ | 10 |
| `notes` | text | YES | NULL |  | หมายเหตุ | หมายเหตุเพิ่มเติม |
| `created_by` | int(10) UNSIGNED | YES | NULL |  |  | 10 |
| `created_at` | timestamp | NO | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `updated_at` | timestamp | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |

## Table: `project_attachments`
**Description:**

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `file_id` | int(10) UNSIGNED | NO |  |  |  | 1 |
| `project_id` | int(10) UNSIGNED | NO |  |  |  | 1 |
| `original_name` | varchar(255) | NO |  |  |  | ตัวอย่างข้อความ |
| `stored_path` | varchar(500) | NO |  |  |  | uploads/example/file.pdf |
| `file_size` | bigint(20) UNSIGNED | NO | 0 |  |  | 10 |
| `mime_type` | varchar(100) | NO |  |  |  | application/pdf |
| `file_hash` | varchar(64) | YES | NULL |  |  | ตัวอย่างข้อความ |
| `is_public` | tinyint(1) | NO | 0 |  |  | 1 |
| `uploaded_by` | int(10) UNSIGNED | YES | NULL |  |  | 10 |
| `uploaded_at` | datetime | NO | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `create_at` | datetime | NO | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `update_at` | datetime | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `delete_at` | datetime | YES | NULL |  |  | 2026-01-15 09:00:00 |
| `display_order` | smallint(5) UNSIGNED | NO | 1 |  |  | 10 |

## Table: `project_budget_plans`
**Description:**

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `plan_id` | tinyint(3) UNSIGNED | NO |  |  |  | 1 |
| `name_th` | varchar(255) | NO |  |  |  | สมชาย ใจดี |
| `name_en` | varchar(255) | NO |  |  |  | Somchai Jaidee |
| `display_order` | smallint(5) UNSIGNED | NO | 1 |  |  | 10 |
| `is_active` | tinyint(1) | NO | 1 |  |  | 1 |

## Table: `project_members`
**Description:**

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `member_id` | bigint(20) UNSIGNED | NO |  |  |  | 1 |
| `project_id` | int(10) UNSIGNED | NO |  |  |  | 1 |
| `user_id` | int(10) UNSIGNED | NO |  |  |  | 1 |
| `duty` | varchar(255) | NO |  |  |  | ตัวอย่างข้อความ |
| `workload_hours` | decimal(6,2) UNSIGNED | NO | 0.00 |  | ชั่วโมง | 1000.00 |
| `display_order` | smallint(5) UNSIGNED | NO | 1 |  |  | 10 |
| `notes` | varchar(255) | YES | NULL |  |  | ตัวอย่างข้อความ |
| `created_at` | timestamp | NO | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `updated_at` | timestamp | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |

## Table: `project_types`
**Description:**

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `type_id` | tinyint(3) UNSIGNED | NO |  |  |  | 1 |
| `name_th` | varchar(255) | NO |  |  |  | สมชาย ใจดี |
| `name_en` | varchar(255) | NO |  |  |  | Somchai Jaidee |
| `display_order` | smallint(5) UNSIGNED | NO | 1 |  |  | 10 |
| `is_active` | tinyint(1) | NO | 1 |  |  | 1 |

## Table: `publications`
**Description:**

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | int(11) | NO |  |  |  | 1 |
| `user_id` | int(11) | NO |  |  |  | 1 |
| `title` | varchar(500) | NO |  |  |  | ตัวอย่างหัวข้อ |
| `authors` | text | YES | NULL |  |  | ตัวอย่างข้อความ |
| `journal` | varchar(255) | YES | NULL |  |  | ตัวอย่างข้อความ |
| `publication_type` | enum('journal','conference','book','thesis','other') | YES | NULL |  |  | journal |
| `publication_date` | date | YES | NULL |  |  | 2026-01-15 |
| `publication_year` | smallint(5) UNSIGNED | YES | NULL |  |  | 2569 |
| `doi` | varchar(255) | YES | NULL |  |  | ตัวอย่างข้อความ |
| `url` | varchar(512) | YES | NULL |  |  | https://example.com/resource |
| `cited_by` | int(10) UNSIGNED | YES | NULL |  |  | 10 |
| `cited_by_url` | varchar(512) | YES | NULL |  |  | https://example.com/resource |
| `source` | enum('scholar','openalex','orcid','crossref') | YES | NULL |  |  | scholar |
| `external_ids` | longtext | YES | NULL |  |  | ตัวอย่างข้อความ |
| `fingerprint` | varchar(64) | YES | NULL |  |  | ตัวอย่างข้อความ |
| `is_verified` | tinyint(1) | NO | 0 |  |  | 1 |
| `created_at` | datetime | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `updated_at` | datetime | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `deleted_at` | datetime | YES | NULL |  |  | 2026-01-15 09:00:00 |
| `citation_history` | longtext | YES | NULL |  | citations per year, e.g. {"2018":8,"2019":22} | ตัวอย่างข้อความ |

## Table: `publication_reward_details`
**Description:** ตารางเก็บรายละเอียดการขอรับเงินรางวัลผลงานวิชาการ พร้อมข้อมูลเพิ่มเติม

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `detail_id` | int(11) | NO |  |  |  | 1 |
| `submission_id` | int(11) | NO |  |  |  | 1 |
| `paper_title` | varchar(500) | NO |  |  |  | ตัวอย่างหัวข้อ |
| `journal_name` | varchar(255) | NO |  |  |  | ตัวอย่างข้อความ |
| `publication_date` | date | NO |  |  |  | 2026-01-15 |
| `publication_type` | enum('journal','conference','book_chapter','other') | YES | 'journal' |  |  | journal |
| `quartile` | enum('Q1','Q2','Q3','Q4','T5','T10','TCI','N/A') | YES | 'N/A' |  |  | q1 |
| `impact_factor` | decimal(10,3) | YES | NULL |  |  | 1000.00 |
| `doi` | varchar(255) | YES | NULL |  |  | ตัวอย่างข้อความ |
| `url` | varchar(500) | YES | NULL |  |  | https://example.com/resource |
| `page_numbers` | varchar(50) | YES | NULL |  |  | DOC-001 |
| `volume_issue` | varchar(100) | YES | NULL |  |  | ตัวอย่างข้อความ |
| `indexing` | varchar(255) | YES | NULL |  |  | ตัวอย่างข้อความ |
| `reward_amount` | decimal(15,2) | YES | 0.00 |  | เงินรางวัลอ้างอิงจาก Author และ Quartile | 10000.00 |
| `reward_approve_amount` | decimal(15,2) | YES | 0.00 |  | จำนวนเงินรางวัลที่อนุมัติ | 10000.00 |
| `revision_fee` | decimal(15,2) | YES | 0.00 |  | ค่าปรับปรุง | 10000.00 |
| `revision_fee_approve_amount` | decimal(15,2) | YES | 0.00 |  | ค่าปรับปรุงที่ได้รับการอนุมัติ | 10000.00 |
| `publication_fee` | decimal(15,2) | YES | 0.00 |  | ค่าตีพิมพ์ | 10000.00 |
| `publication_fee_approve_amount` | decimal(15,2) | YES | 0.00 |  | ค่าตีพิมพ์ที่อนุมัติ | 10000.00 |
| `external_funding_amount` | decimal(15,2) | YES | 0.00 |  | รวมจำนวนเงินจากทุนที่ user แนบเข้ามา | 10000.00 |
| `total_amount` | decimal(15,2) | YES | 0.00 |  | เกิดจากการหักลบค่าปรับปรุง+ค่าตีพิมพ์ ลบกับ รายการที่เบิกจากหน่วยงานนอก | 10000.00 |
| `total_approve_amount` | decimal(15,2) | YES | 0.00 |  | จำนวนเงินจริงที่วิทยาลัยจ่ายให้ (หลังจากได้รับการอนุมัติ) | 10000.00 |
| `announce_reference_number` | varchar(50) | YES | NULL |  |  | DOC-001 |
| `author_count` | int(11) | YES | 1 |  |  | 10 |
| `author_type` | enum('first_author','corresponding_author','coauthor') | YES | 'coauthor' |  |  | first_author |
| `has_university_funding` | enum('yes','no') | YES | 'no' |  | ได้รับการสนับสนุนทุนจากมหาวิทยาลัยหรือไม่ | yes |
| `funding_references` | text | YES | NULL |  | หมายเลขอ้างอิงทุน (คั่นด้วยจุลภาค) | ตัวอย่างข้อความ |
| `university_rankings` | text | YES | NULL |  | อันดับมหาวิทยาลัย/สถาบัน (คั่นด้วยจุลภาค) | ตัวอย่างข้อความ |
| `approved_amount` | decimal(15,2) | YES | NULL |  |  | 10000.00 |
| `create_at` | datetime | NO | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `update_at` | datetime | NO | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `delete_at` | datetime | YES | NULL |  |  | 2026-01-15 09:00:00 |
| `main_annoucement` | int(11) | YES | NULL |  |  | 10 |
| `reward_announcement` | int(11) | YES | NULL |  |  | 10 |
| `author_name_list` | text | YES | NULL |  |  | ตัวอย่างข้อความ |
| `signature` | varchar(255) | YES | NULL |  |  | ตัวอย่างข้อความ |

## Table: `publication_reward_external_funds`
**Description:** รายละเอียดทุนภายนอกและไฟล์ประกอบของคำร้องขอรางวัลตีพิมพ์

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `external_fund_id` | int(11) | NO |  |  |  | 1 |
| `detail_id` | int(11) | NO |  |  |  | 1 |
| `submission_id` | int(11) | NO |  |  |  | 1 |
| `fund_name` | varchar(255) | YES | NULL |  |  | ตัวอย่างข้อความ |
| `amount` | decimal(15,2) | YES | 0.00 |  |  | 10000.00 |
| `document_id` | int(11) | YES | NULL |  |  | 1 |
| `file_id` | int(11) | YES | NULL |  |  | 1 |
| `created_at` | datetime | NO | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `updated_at` | datetime | NO | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `deleted_at` | datetime | YES | NULL |  |  | 2026-01-15 09:00:00 |

## Table: `publication_reward_rates`
**Description:**

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `rate_id` | int(11) | NO |  |  |  | 1 |
| `year` | varchar(4) | NO |  |  |  | ตัวอย่างข้อความ |
| `author_status` | enum('first_author','corresponding_author') | NO |  |  |  | first_author |
| `journal_quartile` | enum('Q1','Q2','Q3','Q4','T5','T10','TCI','N/A') | NO |  |  |  | q1 |
| `reward_amount` | decimal(15,2) | NO |  |  | จำนวนเงินรางวัล | 10000.00 |
| `is_active` | tinyint(1) | YES | 1 |  |  | 1 |
| `create_at` | datetime | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `update_at` | datetime | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |

## Table: `research_fund_admin_events`
**Description:**

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `event_id` | int(11) | NO |  |  |  | 1 |
| `submission_id` | int(11) | NO |  |  |  | 1 |
| `status_after_id` | int(11) | YES | NULL |  |  | 1 |
| `amount` | decimal(15,2) | YES | NULL |  |  | 10000.00 |
| `comment` | text | YES | NULL |  |  | หมายเหตุเพิ่มเติม |
| `created_by` | int(11) | NO |  |  |  | 10 |
| `created_at` | datetime | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |

## Table: `research_fund_event_files`
**Description:**

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `event_file_id` | int(11) | NO |  |  |  | 1 |
| `event_id` | int(11) | NO |  |  |  | 1 |
| `file_id` | int(11) | NO |  |  |  | 1 |
| `created_at` | datetime | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |

## Table: `reward_config`
**Description:**

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `config_id` | int(11) | NO |  |  |  | 1 |
| `year` | varchar(4) | NO |  |  | ปีงบประมาณ (พ.ศ.) | ตัวอย่างข้อความ |
| `journal_quartile` | enum('Q1','Q2','Q3','Q4','T5','T10','TCI','N/A') | YES | NULL |  | ระดับ Quartile ของวารสาร | q1 |
| `max_amount` | decimal(15,2) | NO | 0.00 |  | จำนวนเงินสูงสุดที่รับสนับสนุน | 10000.00 |
| `condition_description` | text | YES | NULL |  | เงื่อนไขเพิ่มเติม | รายละเอียดตัวอย่าง |
| `is_active` | tinyint(1) | YES | 1 |  | สถานะการใช้งาน | 1 |
| `create_at` | datetime | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `update_at` | datetime | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `delete_at` | datetime | YES | NULL |  |  | 2026-01-15 09:00:00 |

## Table: `roles`
**Description:**

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `role_id` | int(11) | NO |  |  |  | 1 |
| `role` | varchar(255) | YES | NULL |  |  | admin |
| `create_at` | datetime | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `update_at` | datetime | YES | NULL |  |  | 2026-01-15 09:00:00 |
| `delete_at` | datetime | YES | NULL |  |  | 2026-01-15 09:00:00 |

## Table: `scholar_import_runs`
**Description:**

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | bigint(20) UNSIGNED | NO |  |  |  | 1 |
| `trigger_source` | varchar(64) | NO |  |  |  | ตัวอย่างข้อความ |
| `status` | enum('running','success','failed') | NO | 'running' |  |  | running |
| `error_message` | text | YES | NULL |  |  | ตัวอย่างข้อความ |
| `started_at` | datetime | NO | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `finished_at` | datetime | YES | NULL |  |  | 2026-01-15 09:00:00 |
| `users_processed` | int(10) UNSIGNED | NO | 0 |  |  | 10 |
| `users_with_errors` | int(10) UNSIGNED | NO | 0 |  |  | 10 |
| `publications_fetched` | int(10) UNSIGNED | NO | 0 |  |  | 10 |
| `publications_created` | int(10) UNSIGNED | NO | 0 |  |  | 10 |
| `publications_updated` | int(10) UNSIGNED | NO | 0 |  |  | 10 |
| `publications_failed` | int(10) UNSIGNED | NO | 0 |  |  | 10 |
| `created_at` | datetime | NO | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `updated_at` | datetime | NO | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `deleted_at` | datetime | YES | NULL |  |  | 2026-01-15 09:00:00 |

## Table: `scopus_affiliations`
**Description:**

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | bigint(20) UNSIGNED | NO |  |  |  | 1 |
| `afid` | varchar(32) | NO |  |  |  | ตัวอย่างข้อความ |
| `name` | text | YES | NULL |  |  | ตัวอย่างข้อความ |
| `city` | text | YES | NULL |  |  | ตัวอย่างข้อความ |
| `country` | text | YES | NULL |  |  | ตัวอย่างข้อความ |
| `affiliation_url` | text | YES | NULL |  |  | ตัวอย่างข้อความ |
| `created_at` | datetime | NO | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `updated_at` | datetime | NO | current_timestamp() |  |  | 2026-01-15 09:00:00 |

## Table: `scopus_api_import_jobs`
**Description:**

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | bigint(20) UNSIGNED | NO |  |  |  | 1 |
| `service` | varchar(64) | NO | 'scopus' |  |  | ตัวอย่างข้อความ |
| `job_type` | varchar(64) | NO | 'author_documents' |  |  | ตัวอย่างข้อความ |
| `scopus_author_id` | varchar(100) | YES | NULL |  |  | ตัวอย่างข้อความ |
| `query_string` | text | NO |  |  |  | ตัวอย่างข้อความ |
| `total_results` | int(11) | YES | NULL |  |  | 10 |
| `status` | varchar(32) | NO | 'running' |  |  | active |
| `error_message` | text | YES | NULL |  |  | ตัวอย่างข้อความ |
| `started_at` | datetime | NO | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `finished_at` | datetime | YES | NULL |  |  | 2026-01-15 09:00:00 |
| `created_at` | datetime | NO | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `updated_at` | datetime | NO | current_timestamp() |  |  | 2026-01-15 09:00:00 |

## Table: `scopus_api_requests`
**Description:**

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | bigint(20) UNSIGNED | NO |  |  |  | 1 |
| `job_id` | bigint(20) UNSIGNED | NO |  |  |  | 1 |
| `http_method` | varchar(8) | NO | 'GET' |  |  | ตัวอย่างข้อความ |
| `endpoint` | text | NO |  |  |  | ตัวอย่างข้อความ |
| `query_params` | longtext CHARACTER SET utf8mb4 | YES | NULL |  |  | ตัวอย่างข้อความ |
| `request_headers` | longtext CHARACTER SET utf8mb4 | YES | NULL |  |  | ตัวอย่างข้อความ |
| `response_status` | int(11) | YES | NULL |  |  | 10 |
| `response_time_ms` | int(11) | YES | NULL |  |  | 10 |
| `page_start` | int(11) | YES | NULL |  |  | 10 |
| `page_count` | int(11) | YES | NULL |  |  | 10 |
| `items_returned` | int(11) | YES | NULL |  |  | 10 |
| `created_at` | datetime | NO | current_timestamp() |  |  | 2026-01-15 09:00:00 |

## Table: `scopus_authors`
**Description:**

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | bigint(20) UNSIGNED | NO |  |  |  | 1 |
| `scopus_author_id` | varchar(100) | NO |  |  |  | ตัวอย่างข้อความ |
| `full_name` | text | YES | NULL |  |  | ตัวอย่างข้อความ |
| `given_name` | text | YES | NULL |  |  | ตัวอย่างข้อความ |
| `surname` | text | YES | NULL |  |  | ตัวอย่างข้อความ |
| `initials` | text | YES | NULL |  |  | ตัวอย่างข้อความ |
| `orcid` | varchar(64) | YES | NULL |  |  | ตัวอย่างข้อความ |
| `author_url` | text | YES | NULL |  |  | ตัวอย่างข้อความ |
| `created_at` | datetime | NO | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `updated_at` | datetime | NO | current_timestamp() |  |  | 2026-01-15 09:00:00 |

## Table: `scopus_config`
**Description:**

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | bigint(20) UNSIGNED | NO |  |  |  | 1 |
| `key` | varchar(128) | NO |  |  |  | ตัวอย่างข้อความ |
| `value` | text | NO |  |  |  | ตัวอย่างข้อความ |
| `updated_at` | datetime | NO | current_timestamp() |  |  | 2026-01-15 09:00:00 |

## Table: `scopus_documents`
**Description:**

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | bigint(20) UNSIGNED | NO |  |  |  | 1 |
| `eid` | varchar(64) | NO |  |  |  | ตัวอย่างข้อความ |
| `scopus_id` | varchar(64) | YES | NULL |  |  | ตัวอย่างข้อความ |
| `scopus_link` | text | YES | NULL |  |  | ตัวอย่างข้อความ |
| `title` | text | YES | NULL |  |  | ตัวอย่างข้อความ |
| `abstract` | longtext | YES | NULL |  |  | ตัวอย่างข้อความ |
| `aggregation_type` | varchar(32) | YES | NULL |  |  | ตัวอย่างข้อความ |
| `subtype` | varchar(32) | YES | NULL |  |  | ตัวอย่างข้อความ |
| `subtype_description` | text | YES | NULL |  |  | รายละเอียดตัวอย่าง |
| `source_id` | varchar(32) | YES | NULL |  |  | ตัวอย่างข้อความ |
| `publication_name` | text | YES | NULL |  |  | ตัวอย่างข้อความ |
| `issn` | varchar(32) | YES | NULL |  |  | ตัวอย่างข้อความ |
| `eissn` | varchar(32) | YES | NULL |  |  | ตัวอย่างข้อความ |
| `isbn` | varchar(64) | YES | NULL |  |  | ตัวอย่างข้อความ |
| `volume` | varchar(32) | YES | NULL |  |  | ตัวอย่างข้อความ |
| `issue` | varchar(32) | YES | NULL |  |  | ตัวอย่างข้อความ |
| `page_range` | varchar(64) | YES | NULL |  |  | ตัวอย่างข้อความ |
| `article_number` | varchar(64) | YES | NULL |  |  | DOC-001 |
| `cover_date` | date | YES | NULL |  |  | 2026-01-15 |
| `cover_display_date` | text | YES | NULL |  |  | ตัวอย่างข้อความ |
| `doi` | varchar(255) | YES | NULL |  |  | ตัวอย่างข้อความ |
| `pii` | varchar(64) | YES | NULL |  |  | ตัวอย่างข้อความ |
| `citedby_count` | int(11) | YES | NULL |  |  | 10 |
| `openaccess` | tinyint(4) | YES | NULL |  |  | 10 |
| `openaccess_flag` | tinyint(1) | YES | NULL |  |  | 1 |
| `authkeywords` | longtext CHARACTER SET utf8mb4 | YES | NULL |  |  | ตัวอย่างข้อความ |
| `fund_acr` | text | YES | NULL |  |  | ตัวอย่างข้อความ |
| `fund_sponsor` | text | YES | NULL |  |  | ตัวอย่างข้อความ |
| `raw_json` | longtext CHARACTER SET utf8mb4 | YES | NULL |  |  | ตัวอย่างข้อความ |
| `created_at` | datetime | NO | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `updated_at` | datetime | NO | current_timestamp() |  |  | 2026-01-15 09:00:00 |

## Table: `scopus_document_authors`
**Description:**

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | bigint(20) UNSIGNED | NO |  |  |  | 1 |
| `document_id` | bigint(20) UNSIGNED | NO |  |  |  | 1 |
| `author_id` | bigint(20) UNSIGNED | NO |  |  |  | 1 |
| `author_seq` | int(11) | YES | NULL |  |  | 10 |
| `affiliation_id` | bigint(20) UNSIGNED | YES | NULL |  |  | 1 |
| `created_at` | datetime | NO | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `updated_at` | datetime | NO | current_timestamp() |  |  | 2026-01-15 09:00:00 |

## Table: `scopus_source_metrics`
**Description:**

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `source_metric_id` | int(11) | NO |  |  |  | 1 |
| `source_id` | varchar(32) | NO |  |  | Scopus source-id (source-id) | ตัวอย่างข้อความ |
| `issn` | varchar(32) | YES | NULL |  | prism:issn | ตัวอย่างข้อความ |
| `eissn` | varchar(32) | YES | NULL |  | prism:eIssn | ตัวอย่างข้อความ |
| `metric_year` | int(4) | NO |  |  | year attribute from citeScoreYearInfo / SNIP / SJR / yearly-data | 2569 |
| `doc_type` | varchar(32) | NO | 'all' |  | citeScoreInfo.docType (usually all, article, review, etc.) | ตัวอย่างข้อความ |
| `cite_score` | decimal(8,3) | YES | NULL |  |  | 1000.00 |
| `cite_score_status` | enum('Complete','In-Progress') | YES | NULL |  | status attribute on citeScoreYearInfo | complete |
| `cite_score_scholarly_output` | int(11) | YES | NULL |  |  | 10 |
| `cite_score_citation_count` | int(11) | YES | NULL |  |  | 10 |
| `cite_score_percent_cited` | decimal(5,2) | YES | NULL |  |  | 1000.00 |
| `cite_score_rank` | int(11) | YES | NULL |  |  | 10 |
| `cite_score_percentile` | decimal(5,2) | YES | NULL |  |  | 1000.00 |
| `cite_score_quartile` | varchar(4) | YES | NULL |  | Q1, Q2, Q3, Q4 if present | ตัวอย่างข้อความ |
| `cite_score_current_metric` | decimal(8,3) | YES | NULL |  |  | 1000.00 |
| `cite_score_current_metric_year` | int(4) | YES | NULL |  |  | 2569 |
| `cite_score_tracker` | decimal(8,3) | YES | NULL |  |  | 1000.00 |
| `cite_score_tracker_year` | int(4) | YES | NULL |  |  | 2569 |
| `sjr` | decimal(8,3) | YES | NULL |  |  | 1000.00 |
| `snip` | decimal(8,3) | YES | NULL |  |  | 1000.00 |
| `publication_count` | int(11) | YES | NULL |  |  | 10 |
| `cite_count_sce` | int(11) | YES | NULL |  |  | 10 |
| `zero_cites_sce` | decimal(5,2) | YES | NULL |  |  | 1000.00 |
| `rev_percent` | decimal(5,2) | YES | NULL |  |  | 1000.00 |
| `created_at` | datetime | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `updated_at` | datetime | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `last_fetched_at` | datetime | YES | NULL |  | Last time metrics were fetched from Scopus API | 2026-01-15 09:00:00 |

## Table: `subcategory_budgets`
**Description:**

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `subcategory_budget_id` | int(11) | NO |  |  |  | 1 |
| `subcategory_id` | int(11) | NO |  |  |  | 1 |
| `record_scope` | enum('overall','rule') | NO | 'rule' |  |  | overall |
| `allocated_amount` | decimal(15,2) | YES | NULL |  | งบทั้งหมดประมาณของทุน | 10000.00 |
| `remaining_budget` | decimal(15,2) | YES | NULL |  | ไม่ได้ใช้ | 1000.00 |
| `used_amount` | decimal(15,2) | YES | NULL |  | ไม่ได้ใช้ | 10000.00 |
| `max_amount_per_grant` | decimal(15,2) | YES | NULL |  |  | 10000.00 |
| `max_amount_per_year` | decimal(15,2) | YES | NULL |  |  | 10000.00 |
| `max_grants` | int(11) | YES | NULL |  |  | 10 |
| `remaining_grant` | int(11) | YES | NULL |  | ไม่ได้ใช้ | 10 |
| `level` | enum('ต้น','กลาง','สูง') | YES | NULL |  | ไม่ได้ใช้ | ต้น |
| `status` | enum('active','disable') | YES | NULL |  |  | active |
| `fund_description` | text | YES | NULL |  |  | รายละเอียดตัวอย่าง |
| `comment` | text | YES | NULL |  |  | หมายเหตุเพิ่มเติม |
| `create_at` | datetime | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `update_at` | datetime | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `delete_at` | datetime | YES | NULL |  |  | 2026-01-15 09:00:00 |

## Table: `submissions`
**Description:**

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `submission_id` | int(11) | NO |  |  |  | 1 |
| `submission_type` | enum('fund_application','publication_reward') | NO |  |  | ใช้ในการ generate submission number | fund_application |
| `submission_number` | varchar(255) | YES | NULL |  |  | DOC-001 |
| `user_id` | int(11) | NO |  |  |  | 1 |
| `year_id` | int(11) | NO |  |  |  | 2569 |
| `category_id` | int(11) | YES | NULL |  |  | 1 |
| `subcategory_id` | int(11) | YES | NULL |  |  | 1 |
| `subcategory_budget_id` | int(11) | YES | NULL |  |  | 1 |
| `status_id` | int(11) | NO |  |  |  | 1 |
| `submitted_at` | datetime | YES | NULL |  |  | 2026-01-15 09:00:00 |
| `reviewed_at` | datetime | YES | NULL |  |  | 2026-01-15 09:00:00 |
| `head_rejected_by` | int(11) | YES | NULL |  |  | 10 |
| `head_rejected_at` | datetime | YES | NULL |  |  | 2026-01-15 09:00:00 |
| `head_rejection_reason` | text | YES | NULL |  |  | ตัวอย่างข้อความ |
| `head_approved_by` | int(11) | YES | NULL |  |  | 10 |
| `head_approved_at` | datetime | YES | NULL |  |  | 2026-01-15 09:00:00 |
| `head_comment` | text | YES | NULL |  |  | หมายเหตุเพิ่มเติม |
| `head_signature` | varchar(255) | YES | NULL |  |  | ตัวอย่างข้อความ |
| `admin_approved_by` | int(11) | YES | NULL |  |  | 10 |
| `admin_approved_at` | datetime | YES | NULL |  |  | 2026-01-15 09:00:00 |
| `admin_rejected_by` | int(11) | YES | NULL |  |  | 10 |
| `admin_rejected_at` | datetime | YES | NULL |  |  | 2026-01-15 09:00:00 |
| `admin_rejection_reason` | text | YES | NULL |  |  | ตัวอย่างข้อความ |
| `admin_comment` | text | YES | NULL |  |  | หมายเหตุเพิ่มเติม |
| `contact_phone` | varchar(50) | YES | NULL |  |  | 0800000000 |
| `bank_account` | varchar(50) | YES | NULL |  |  | ธนาคารตัวอย่าง |
| `bank_name` | varchar(100) | YES | NULL |  |  | ธนาคารตัวอย่าง |
| `bank_account_name` | varchar(150) | YES | NULL |  |  | ธนาคารตัวอย่าง |
| `rejected_by` | int(11) | YES | NULL |  | เช็คคนที่อัพเดทล่าสุด | 10 |
| `rejected_at` | datetime | YES | NULL |  | เช็คเวลาที่อัพเดทล่าสุด | 2026-01-15 09:00:00 |
| `approved_at` | datetime | YES | NULL |  | เช็คเวลาที่อัพเดทล่าสุด | 2026-01-15 09:00:00 |
| `approved_by` | int(11) | YES | NULL |  | เช็คคนที่อัพเดทล่าสุด | 10 |
| `created_at` | datetime | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `updated_at` | datetime | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `deleted_at` | datetime | YES | NULL |  |  | 2026-01-15 09:00:00 |
| `installment_number_at_submit` | int(11) | YES | NULL |  |  | 10 |
| `installment_fund_name_at_submit` | varchar(255) | YES | NULL |  |  | ตัวอย่างข้อความ |

## Table: `submission_documents`
**Description:**

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `document_id` | int(11) | NO |  |  |  | 1 |
| `submission_id` | int(11) | NO |  |  |  | 1 |
| `file_id` | int(11) | NO |  |  |  | 1 |
| `original_name` | varchar(255) | YES | NULL |  |  | ตัวอย่างข้อความ |
| `document_type_id` | int(11) | NO |  |  |  | 1 |
| `description` | text | YES | NULL |  |  | รายละเอียดตัวอย่าง |
| `display_order` | int(11) | YES | 0 |  |  | 10 |
| `is_required` | tinyint(1) | YES | 0 |  |  | 1 |
| `is_verified` | tinyint(1) | YES | 0 |  |  | 1 |
| `verified_by` | int(11) | YES | NULL |  |  | 10 |
| `verified_at` | datetime | YES | NULL |  |  | 2026-01-15 09:00:00 |
| `created_at` | datetime | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |

## Table: `submission_users`
**Description:**

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `id` | int(11) | NO |  |  |  | 1 |
| `submission_id` | int(11) | NO |  |  |  | 1 |
| `user_id` | int(11) | NO |  |  |  | 1 |
| `role` | enum('owner','coauthor','team_member','advisor','coordinator','co_author') | YES | 'coauthor' |  |  | owner |
| `is_primary` | tinyint(1) | YES | 0 |  |  | 1 |
| `display_order` | int(11) | YES | 0 |  |  | 10 |
| `created_at` | datetime | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |

## Table: `system_config`
**Description:**

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `config_id` | int(11) | NO |  |  |  | 1 |
| `system_version` | varchar(20) | YES | '1.0.0' |  |  | ตัวอย่างข้อความ |
| `last_updated` | datetime | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `updated_by` | int(11) | YES | NULL |  |  | 10 |
| `current_year` | varchar(250) | YES | NULL |  |  | ตัวอย่างข้อความ |
| `start_date` | datetime | NO |  |  |  | 2026-01-15 09:00:00 |
| `end_date` | datetime | NO |  |  |  | 2026-01-15 09:00:00 |
| `main_annoucement` | int(11) | YES | NULL |  |  | 10 |
| `reward_announcement` | int(11) | YES | NULL |  |  | 10 |
| `activity_support_announcement` | int(11) | YES | NULL |  |  | 10 |
| `conference_announcement` | int(11) | YES | NULL |  |  | 10 |
| `service_announcement` | int(11) | YES | NULL |  |  | 10 |
| `contact_info` | text | YES | NULL |  |  | ตัวอย่างข้อความ |
| `kku_report_year` | varchar(50) | YES | NULL |  | ปีระเบียบกองทุนมหาวิทยาลัยขอนแก่น | ตัวอย่างข้อความ |
| `installment` | int(11) | YES | NULL |  | เลขที่ใส่ในเอกสาร Publication Reward ในส่วน "งวดที่" | 10 |

## Table: `users`
**Description:**

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `user_id` | int(11) | NO |  |  |  | 1 |
| `user_fname` | varchar(255) | YES | NULL |  |  | ตัวอย่างข้อความ |
| `user_lname` | varchar(255) | YES | NULL |  |  | ตัวอย่างข้อความ |
| `gender` | varchar(255) | YES | NULL |  |  | male |
| `email` | varchar(255) | YES | NULL |  |  | user@example.com |
| `email_notification` | varchar(255) | YES | NULL |  |  | user@example.com |
| `scholar_author_id` | varchar(64) CHARACTER SET utf8mb4 | YES | NULL |  |  | ตัวอย่างข้อความ |
| `scopus_id` | varchar(100) | YES | NULL |  |  | ตัวอย่างข้อความ |
| `password` | varchar(255) | YES | NULL |  |  | hashed_password |
| `role_id` | int(11) | YES | NULL |  |  | 1 |
| `position_id` | int(11) | YES | NULL |  |  | 1 |
| `date_of_employment` | date | YES | NULL |  |  | 2026-01-15 |
| `create_at` | datetime | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `update_at` | datetime | YES | NULL |  |  | 2026-01-15 09:00:00 |
| `delete_at` | datetime | YES | NULL |  |  | 2026-01-15 09:00:00 |
| `prefix` | varchar(50) | YES | NULL |  |  | ตัวอย่างข้อความ |
| `manage_position` | varchar(255) | YES | NULL |  |  | เจ้าหน้าที่ |
| `position` | varchar(255) | YES | NULL |  |  | เจ้าหน้าที่ |
| `position_en` | varchar(255) | YES | NULL |  |  | เจ้าหน้าที่ |
| `prefix_position_en` | varchar(50) | YES | NULL |  |  | เจ้าหน้าที่ |
| `Name_en` | varchar(255) | YES | NULL |  |  | Somchai Jaidee |
| `suffix_en` | varchar(50) | YES | NULL |  |  | ตัวอย่างข้อความ |
| `TEL` | varchar(50) | YES | NULL |  |  | 0800000000 |
| `TELformat` | varchar(50) | YES | NULL |  |  | 0800000000 |
| `TEL_ENG` | varchar(50) | YES | NULL |  |  | 0800000000 |
| `manage_position_en` | varchar(255) | YES | NULL |  |  | เจ้าหน้าที่ |
| `LAB_Name` | varchar(255) | YES | NULL |  |  | ตัวอย่างข้อความ |
| `Room` | varchar(255) | YES | NULL |  |  | ตัวอย่างข้อความ |
| `CP_WEB_ID` | varchar(255) | YES | NULL |  |  | ตัวอย่างข้อความ |
| `Is_active` | char(1) | YES | 'A' |  |  | ตัวอย่างข้อความ |

## Table: `user_fund_eligibilities`
**Description:**

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `user_fund_eligibility_id` | int(11) | NO |  |  |  | 1 |
| `user_id` | int(11) | YES | NULL |  |  | 1 |
| `year_id` | int(11) | YES | NULL |  |  | 2569 |
| `category_id` | int(11) | YES | NULL |  |  | 1 |
| `remaining_quota` | decimal(15,2) | YES | NULL |  |  | 1000.00 |
| `max_allowed_amount` | decimal(15,2) | YES | NULL |  |  | 10000.00 |
| `remaining_applications` | int(11) | YES | NULL |  |  | 10 |
| `is_eligible` | varchar(255) | YES | NULL |  |  | ตัวอย่างข้อความ |
| `restriction_reason` | text | YES | NULL |  |  | ตัวอย่างข้อความ |
| `calculated_at` | datetime | YES | NULL |  |  | 2026-01-15 09:00:00 |
| `create_at` | datetime | YES | NULL |  |  | 2026-01-15 09:00:00 |
| `update_at` | datetime | YES | NULL |  |  | 2026-01-15 09:00:00 |
| `delete_at` | datetime | YES | NULL |  |  | 2026-01-15 09:00:00 |

## Table: `user_innovations_view`
**Description:**

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `submission_id` | int(11) | YES |  |  |  | 1 |
| `user_id` | int(11) | NO |  |  |  | 1 |
| `hindex` | smallint(5) UNSIGNED | YES | NULL |  |  | 10 |
| `hindex5y` | smallint(5) UNSIGNED | YES | NULL |  |  | 10 |
| `i10index` | smallint(5) UNSIGNED | YES | NULL |  |  | 10 |
| `i10index5y` | smallint(5) UNSIGNED | YES | NULL |  |  | 10 |
| `citedby_total` | int(10) UNSIGNED | YES | NULL |  |  | 10 |
| `citedby_5y` | int(10) UNSIGNED | YES | NULL |  |  | 10 |
| `cites_per_year` | longtext | YES | NULL |  |  | ตัวอย่างข้อความ |
| `updated_at` | datetime | NO | current_timestamp() |  |  | 2026-01-15 09:00:00 |

## Table: `user_sessions`
**Description:**

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `session_id` | int(11) | NO |  |  |  | 1 |
| `user_id` | int(11) | NO |  |  |  | 1 |
| `access_token_jti` | varchar(191) CHARACTER SET utf8mb4 | YES | NULL |  |  | ตัวอย่างข้อความ |
| `refresh_token` | varchar(255) CHARACTER SET utf8mb4 | YES | NULL |  |  | ตัวอย่างข้อความ |
| `device_name` | varchar(255) | YES | NULL |  |  | ตัวอย่างข้อความ |
| `device_type` | varchar(50) | YES | NULL |  |  | ตัวอย่างข้อความ |
| `ip_address` | varchar(45) | YES | NULL |  |  | 203.0.113.10 |
| `user_agent` | text | YES | NULL |  |  | ตัวอย่างข้อความ |
| `last_activity` | datetime | YES | NULL |  |  | 2026-01-15 09:00:00 |
| `expires_at` | datetime | NO |  |  |  | 2026-01-15 09:00:00 |
| `is_active` | tinyint(1) | YES | 1 |  |  | 1 |
| `created_at` | datetime | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `updated_at` | datetime | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |

## Table: `user_tokens`
**Description:**

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `token_id` | int(11) | NO |  |  |  | 1 |
| `user_id` | int(11) | NO |  |  |  | 1 |
| `token_type` | varchar(64) | YES | NULL |  |  | ตัวอย่างข้อความ |
| `token` | varchar(255) CHARACTER SET utf8mb4 | YES | NULL |  |  | ตัวอย่างข้อความ |
| `expires_at` | datetime | NO |  |  |  | 2026-01-15 09:00:00 |
| `is_revoked` | tinyint(1) | YES | 0 |  |  | 1 |
| `device_info` | varchar(255) | YES | NULL |  |  | ตัวอย่างข้อความ |
| `ip_address` | varchar(45) | YES | NULL |  |  | 203.0.113.10 |
| `user_agent` | text | YES | NULL |  |  | ตัวอย่างข้อความ |
| `created_at` | datetime | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `updated_at` | datetime | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |

## Table: `view_budget_summary`
**Description:**

| Column | Type | Null | Default | Key | Description | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `year` | varchar(255) | YES |  |  |  | ตัวอย่างข้อความ |
| `application_id` | int(11) | YES |  |  |  | 1 |
| `config_id` | int(11) | YES |  |  |  | 1 |
| `submission_id` | int(11) | YES |  |  |  | 1 |
| `user_id` | int(11) | YES |  |  |  | 1 |
| `subcategory_id` | int(11) | YES |  |  |  | 1 |
| `slot_code` | enum('main','reward','activity_support','conference','service') | YES |  |  |  | main |
| `head_user_id` | int(11) | YES |  |  |  | 1 |
| `file_id` | int(11) | YES |  |  |  | 1 |
| `user_id` | int(11) | YES |  |  |  | 1 |
| `application_id` | int(11) | YES |  |  |  | 1 |
| `reward_id` | int(11) | YES |  |  |  | 1 |
| `log_id` | int(11) | YES |  |  |  | 1 |
| `user_id` | int(11) | YES |  |  |  | 1 |
| `user_id` | int(11) | YES |  |  |  | 1 |
| `submission_number` | varchar(255) | YES |  |  |  | DOC-001 |
| `user_id` | int(11) | YES |  |  |  | 1 |
| `year_id` | int(11) | NO |  |  |  | 2569 |
| `year` | varchar(255) | YES | NULL |  |  | ตัวอย่างข้อความ |
| `status` | enum('active','inactive') | YES | 'active' |  |  | active |
| `create_at` | datetime | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `update_at` | datetime | YES | current_timestamp() |  |  | 2026-01-15 09:00:00 |
| `delete_at` | datetime | YES | NULL |  |  | 2026-01-15 09:00:00 |

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