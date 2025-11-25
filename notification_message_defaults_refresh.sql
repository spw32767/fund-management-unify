-- Refresh default templates to the current formal wording used by the application.
-- 1) Bring the admin_rejected template up to date so placeholders align with the backend payload.
UPDATE notification_message
SET title_template = 'ผลการพิจารณาคำร้อง (หมายเลข {{submission_number}})',
    body_template = 'เรียน {{submitter_name}}\n\nระบบกองทุนวิจัยฯ วิทยาลัยการคอมพิวเตอร์ขอแจ้งว่า คำร้องหมายเลข {{submission_number}} เรื่อง {{submission_title}} ของท่านไม่ได้รับการอนุมัติ โดยมีรายละเอียดดังนี้\n{{admin_rejection_reason}}\n\nหากต้องการข้อมูลเพิ่มเติมหรือตรวจสอบสถานะ กรุณาเข้าสู่ระบบที่ {{web_url}} หรือสอบถามได้ที่ {{contact_info}}\n\nจึงเรียนมาเพื่อทราบ\n\nขอแสดงความนับถือ  \nระบบกองทุนวิจัยฯ  \nวิทยาลัยการคอมพิวเตอร์',
    variables = JSON_ARRAY('submission_number', 'submitter_name', 'submission_title', 'admin_rejection_reason', 'web_url', 'contact_info'),
    default_title_template = 'ผลการพิจารณาคำร้อง (หมายเลข {{submission_number}})',
    default_body_template = 'เรียน {{submitter_name}}\n\nระบบกองทุนวิจัยฯ วิทยาลัยการคอมพิวเตอร์ขอแจ้งว่า คำร้องหมายเลข {{submission_number}} เรื่อง {{submission_title}} ของท่านไม่ได้รับการอนุมัติ โดยมีรายละเอียดดังนี้\n{{admin_rejection_reason}}\n\nหากต้องการข้อมูลเพิ่มเติมหรือตรวจสอบสถานะ กรุณาเข้าสู่ระบบที่ {{web_url}} หรือสอบถามได้ที่ {{contact_info}}\n\nจึงเรียนมาเพื่อทราบ\n\nขอแสดงความนับถือ  \nระบบกองทุนวิจัยฯ  \nวิทยาลัยการคอมพิวเตอร์',
    default_variables = JSON_ARRAY('submission_number', 'submitter_name', 'submission_title', 'admin_rejection_reason', 'web_url', 'contact_info')
WHERE event_key = 'admin_rejected' AND send_to = 'user';

-- 2) Copy the current templates into the default columns for all events
--    so "reset to default" reverts to the latest formal wording.
UPDATE notification_message
SET default_title_template = title_template,
    default_body_template = body_template,
    default_variables = variables
WHERE default_title_template != title_template
   OR default_body_template != body_template
   OR default_variables != variables;
