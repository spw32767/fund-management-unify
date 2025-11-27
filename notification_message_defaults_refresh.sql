-- Refresh default templates to the current formal wording used by the application.
-- Add/refresh new "needs more info" events so reset-to-default works for requests from
-- both department heads and admins.
INSERT INTO notification_message
    (event_key, send_to, title_template, body_template, description, variables, default_title_template, default_body_template, default_variables)
VALUES
    (
        'dept_head_needs_more_info',
        'user',
        'คำร้องต้องการข้อมูลเพิ่มเติม (หมายเลข {{submission_number}})',
        'เรียน {{submitter_name}}\n\nหัวหน้าสาขาได้ตรวจสอบคำร้องหมายเลข {{submission_number}} เรื่อง {{submission_title}} และขอข้อมูลเพิ่มเติม โดยมีรายละเอียดดังนี้\n{{head_comment}}\n\nกรุณาเข้าสู่ระบบผ่านลิงก์นี้ {{web_url}} เพื่อเพิ่มเติมข้อมูลหรือเอกสารตามที่ร้องขอ\n\nจึงเรียนมาเพื่อทราบ\n\nขอแสดงความนับถือ  \nระบบกองทุนวิจัยฯ  \nวิทยาลัยการคอมพิวเตอร์',
        'แจ้งผู้ยื่นเมื่อหัวหน้าสาขาขอข้อมูลเพิ่มเติม',
        JSON_ARRAY('submission_number', 'submitter_name', 'submission_title', 'head_comment', 'web_url'),
        'คำร้องต้องการข้อมูลเพิ่มเติม (หมายเลข {{submission_number}})',
        'เรียน {{submitter_name}}\n\nหัวหน้าสาขาได้ตรวจสอบคำร้องหมายเลข {{submission_number}} เรื่อง {{submission_title}} และขอข้อมูลเพิ่มเติม โดยมีรายละเอียดดังนี้\n{{head_comment}}\n\nกรุณาเข้าสู่ระบบผ่านลิงก์นี้ {{web_url}} เพื่อเพิ่มเติมข้อมูลหรือเอกสารตามที่ร้องขอ\n\nจึงเรียนมาเพื่อทราบ\n\nขอแสดงความนับถือ  \nระบบกองทุนวิจัยฯ  \nวิทยาลัยการคอมพิวเตอร์',
        JSON_ARRAY('submission_number', 'submitter_name', 'submission_title', 'head_comment', 'web_url')
    ),
    (
        'admin_needs_more_info',
        'user',
        'คำร้องต้องการข้อมูลเพิ่มเติม (หมายเลข {{submission_number}})',
        'เรียน {{submitter_name}}\n\nผู้ดูแลระบบได้ตรวจสอบคำร้องหมายเลข {{submission_number}} เรื่อง {{submission_title}} และขอข้อมูลเพิ่มเติม โดยมีรายละเอียดดังนี้\n{{admin_comment}}\n\nกรุณาเข้าสู่ระบบผ่านลิงก์นี้ {{web_url}} เพื่อเพิ่มเติมข้อมูลหรือเอกสารตามที่ร้องขอ\n\nจึงเรียนมาเพื่อทราบ\n\nขอแสดงความนับถือ  \nระบบกองทุนวิจัยฯ  \nวิทยาลัยการคอมพิวเตอร์',
        'แจ้งผู้ยื่นเมื่อแอดมินขอข้อมูลเพิ่มเติม',
        JSON_ARRAY('submission_number', 'submitter_name', 'submission_title', 'admin_comment', 'web_url'),
        'คำร้องต้องการข้อมูลเพิ่มเติม (หมายเลข {{submission_number}})',
        'เรียน {{submitter_name}}\n\nผู้ดูแลระบบได้ตรวจสอบคำร้องหมายเลข {{submission_number}} เรื่อง {{submission_title}} และขอข้อมูลเพิ่มเติม โดยมีรายละเอียดดังนี้\n{{admin_comment}}\n\nกรุณาเข้าสู่ระบบผ่านลิงก์นี้ {{web_url}} เพื่อเพิ่มเติมข้อมูลหรือเอกสารตามที่ร้องขอ\n\nจึงเรียนมาเพื่อทราบ\n\nขอแสดงความนับถือ  \nระบบกองทุนวิจัยฯ  \nวิทยาลัยการคอมพิวเตอร์',
        JSON_ARRAY('submission_number', 'submitter_name', 'submission_title', 'admin_comment', 'web_url')
    )
ON DUPLICATE KEY UPDATE
    title_template = VALUES(title_template),
    body_template = VALUES(body_template),
    description = VALUES(description),
    variables = VALUES(variables),
    default_title_template = VALUES(default_title_template),
    default_body_template = VALUES(default_body_template),
    default_variables = VALUES(default_variables);

-- 1) Bring the admin_rejected template up to date so placeholders align with the backend payload.
UPDATE notification_message
SET title_template = 'ผลการพิจารณาคำร้อง (หมายเลข {{submission_number}})',
    body_template = 'เรียน {{submitter_name}}\n\nระบบกองทุนวิจัยฯ วิทยาลัยการคอมพิวเตอร์ขอแจ้งว่า คำร้องหมายเลข {{submission_number}} เรื่อง {{submission_title}} ของท่านไม่ได้รับการอนุมัติ โดยมีรายละเอียดดังนี้\n{{admin_rejection_reason}}\n\nหากต้องการข้อมูลเพิ่มเติมหรือตรวจสอบสถานะ กรุณาเข้าสู่ระบบผ่านลิงก์นี้ {{web_url}} หรือสอบถามได้ที่ {{contact_info}}\n\nจึงเรียนมาเพื่อทราบ\n\nขอแสดงความนับถือ  \nระบบกองทุนวิจัยฯ  \nวิทยาลัยการคอมพิวเตอร์',
    variables = JSON_ARRAY('submission_number', 'submitter_name', 'submission_title', 'admin_rejection_reason', 'web_url', 'contact_info'),
    default_title_template = 'ผลการพิจารณาคำร้อง (หมายเลข {{submission_number}})',
    default_body_template = 'เรียน {{submitter_name}}\n\nระบบกองทุนวิจัยฯ วิทยาลัยการคอมพิวเตอร์ขอแจ้งว่า คำร้องหมายเลข {{submission_number}} เรื่อง {{submission_title}} ของท่านไม่ได้รับการอนุมัติ โดยมีรายละเอียดดังนี้\n{{admin_rejection_reason}}\n\nหากต้องการข้อมูลเพิ่มเติมหรือตรวจสอบสถานะ กรุณาเข้าสู่ระบบผ่านลิงก์นี้ {{web_url}} หรือสอบถามได้ที่ {{contact_info}}\n\nจึงเรียนมาเพื่อทราบ\n\nขอแสดงความนับถือ  \nระบบกองทุนวิจัยฯ  \nวิทยาลัยการคอมพิวเตอร์',
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
