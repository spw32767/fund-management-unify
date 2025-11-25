-- Schema and seed data for notification_message table (no channel column; messages used for all channels).
CREATE TABLE notification_message (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    event_key VARCHAR(100) NOT NULL,
    send_to ENUM('user', 'dept_head', 'admin') NOT NULL,
    title_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    description TEXT NULL,
    variables JSON NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by BIGINT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_notification_message_event_audience (event_key, send_to)
);

-- Seed initial templates (pulling current in-app/email messages into DB)
INSERT INTO notification_message
    (event_key, send_to, title_template, body_template, description, variables)
VALUES
    -- เมื่อผู้ใช้ส่งคำร้อง
    (
        'submission_submitted',
        'user',
        'ระบบได้รับคำร้องของท่านแล้ว (หมายเลข {{submission_number}})',
        'เรียน {{submitter_name}} \nระบบกองทุนวิจัยฯ วิทยาลัยการคอมพิวเตอร์ขอแจ้งว่าได้รับคำร้องของท่านแล้ว มีรายละเอียดดังนี้ \n\n- หมายเลขคำร้อง: {{submission_number}} \n- ชื่อผลงานทางวิชาการ: {{submission_title}} \n- วันที่และเวลาที่ส่งคำร้อง: {{submitted_at}} \n\nขณะนี้คำร้องของท่านอยู่ระหว่างการพิจารณาโดยหัวหน้าสาขา \nหากต้องการติดตามสถานะของคำร้องกรุณาเข้าสู่ระบบที่ {{web_url}} เพื่อดูความคืบหน้า \n\nจึงเรียนมาเพื่อทราบ \n\nขอแสดงความนับถือ \nระบบกองทุนวิจัยฯ \nวิทยาลัยการคอมพิวเตอร์',
        'แจ้งผู้ยื่นเมื่อส่งคำร้องสำเร็จ',
        JSON_ARRAY('submission_number', 'submitter_name', 'submission_title', 'submitted_at', 'web_url')
    ),
    (
        'submission_submitted',
        'dept_head',
        'มีคำร้องใหม่รอการพิจารณา (หมายเลข {{submission_number}})',
        'เรียน {{depthead_name}}\n\nระบบกองทุนวิจัยฯ วิทยาลัยการคอมพิวเตอร์ขอแจ้งว่าได้รับคำร้องใหม่ มีรายละเอียดดังนี้ \n\n- หมายเลขคำร้อง: {{submission_number}}\n- ผู้ยื่นคำร้อง: {{submitter_name}}\n- ชื่อผลงานทางวิชาการ: {{submission_title}}\n- วันที่ส่งคำร้อง: {{submitted_at}}\n\nจึงขอให้ท่านพิจารณาคำร้องดังกล่าว โดยสามารถเข้าสู่ระบบที่ {{web_url}} เพื่อดูรายละเอียดและดำเนินการต่อไป\n\nจึงเรียนมาเพื่อทราบ\n\nขอแสดงความนับถือ  \nระบบกองทุนวิจัยฯ  \nวิทยาลัยการคอมพิวเตอร์',
        'แจ้งหัวหน้าสาขาเมื่อมีคำร้องใหม่',
        JSON_ARRAY('submission_number', 'depthead_name', 'submitter_name', 'submission_title', 'submitted_at', 'web_url')
    ),

    -- เมื่อหัวหน้าสาขาเห็นควรพิจารณา
    ('dept_head_recommended', 'user', 'ผลพิจารณาจากหัวหน้าสาขา', 'คำร้องหมายเลข {{submission_number}} ของคุณได้รับการ "เห็นควรพิจารณา" จากหัวหน้าสาขาแล้ว', 'แจ้งผลให้ผู้ยื่นทราบ', JSON_ARRAY('submission_number')),
    ('dept_head_recommended', 'admin', 'คำร้องใหม่รอการตัดสินใจ (แอดมิน)', 'คำร้อง {{submission_number}} ผ่านการเห็นควรพิจารณาจากหัวหน้าสาขาแล้ว', 'แจ้งทีมแอดมินเพื่อพิจารณาต่อ', JSON_ARRAY('submission_number')),

    -- เมื่อหัวหน้าสาขาไม่เห็นควรพิจารณา
    ('dept_head_not_recommended', 'user', 'ผลพิจารณาจากหัวหน้าสาขา', 'คำร้องหมายเลข {{submission_number}} ของคุณได้รับการ "ไม่เห็นควรพิจารณา"{{reason}}', 'แจ้งผลพร้อมเหตุผล (ถ้ามี)', JSON_ARRAY('submission_number', 'reason')),

    -- แอดมินอนุมัติ
    ('admin_approved', 'user', 'คำร้องได้รับการอนุมัติ', 'คำร้องหมายเลข {{submission_number}} ของคุณได้รับการอนุมัติ เป็นจำนวน {{amount}} บาท{{announce_ref}}', 'แจ้งผลอนุมัติพร้อมจำนวนเงิน/อ้างอิงประกาศ', JSON_ARRAY('submission_number', 'amount', 'announce_ref')),

    -- แอดมินไม่อนุมัติ
    ('admin_rejected', 'user', 'ผลการตัดสินใจ: ไม่อนุมัติ', 'คำร้องหมายเลข {{submission_number}} ของคุณไม่ได้รับการอนุมัติ{{reason}}', 'แจ้งผลไม่อนุมัติพร้อมเหตุผล (ถ้ามี)', JSON_ARRAY('submission_number', 'reason'));
