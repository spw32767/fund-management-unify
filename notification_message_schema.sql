-- Schema and seed data for notification_message table (no channel column; messages used for all channels).
CREATE TABLE notification_message (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    event_key VARCHAR(100) NOT NULL,
    send_to ENUM('user', 'dept_head', 'admin') NOT NULL,
    title_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    default_title_template TEXT NOT NULL,
    default_body_template TEXT NOT NULL,
    description TEXT NULL,
    variables JSON NOT NULL,
    default_variables JSON NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by BIGINT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_notification_message_event_audience (event_key, send_to)
);

-- Seed initial templates (pulling current in-app/email messages into DB)
INSERT INTO notification_message
    (event_key, send_to, title_template, body_template, default_title_template, default_body_template, description, variables, default_variables)
VALUES
    -- เมื่อผู้ใช้ส่งคำร้อง
    (
        'submission_submitted',
        'user',
        'ระบบได้รับคำร้องของท่านแล้ว (หมายเลข {{submission_number}})',
        'เรียน {{submitter_name}} \nระบบกองทุนวิจัยฯ วิทยาลัยการคอมพิวเตอร์ขอแจ้งว่าได้รับคำร้องของท่านแล้ว มีรายละเอียดดังนี้ \n\n- หมายเลขคำร้อง: {{submission_number}} \n- ชื่อผลงานทางวิชาการ: {{submission_title}} \n- วันที่และเวลาที่ส่งคำร้อง: {{submitted_at}} \n\nขณะนี้คำร้องของท่านอยู่ระหว่างการพิจารณาโดยหัวหน้าสาขา \nหากต้องการติดตามสถานะของคำร้องกรุณาเข้าสู่ระบบที่ {{web_url}} เพื่อดูความคืบหน้า \n\nจึงเรียนมาเพื่อทราบ \n\nขอแสดงความนับถือ \nระบบกองทุนวิจัยฯ \nวิทยาลัยการคอมพิวเตอร์',
        'ระบบได้รับคำร้องของท่านแล้ว (หมายเลข {{submission_number}})',
        'เรียน {{submitter_name}} \nระบบกองทุนวิจัยฯ วิทยาลัยการคอมพิวเตอร์ขอแจ้งว่าได้รับคำร้องของท่านแล้ว มีรายละเอียดดังนี้ \n\n- หมายเลขคำร้อง: {{submission_number}} \n- ชื่อผลงานทางวิชาการ: {{submission_title}} \n- วันที่และเวลาที่ส่งคำร้อง: {{submitted_at}} \n\nขณะนี้คำร้องของท่านอยู่ระหว่างการพิจารณาโดยหัวหน้าสาขา \nหากต้องการติดตามสถานะของคำร้องกรุณาเข้าสู่ระบบที่ {{web_url}} เพื่อดูความคืบหน้า \n\nจึงเรียนมาเพื่อทราบ \n\nขอแสดงความนับถือ \nระบบกองทุนวิจัยฯ \nวิทยาลัยการคอมพิวเตอร์',
        'แจ้งผู้ยื่นเมื่อส่งคำร้องสำเร็จ',
        JSON_ARRAY('submission_number', 'submitter_name', 'submission_title', 'submitted_at', 'web_url'),
        JSON_ARRAY('submission_number', 'submitter_name', 'submission_title', 'submitted_at', 'web_url')
    ),
    (
        'submission_submitted',
        'dept_head',
        'มีคำร้องใหม่รอการพิจารณา (หมายเลข {{submission_number}})',
        'เรียน {{depthead_name}}\n\nระบบกองทุนวิจัยฯ วิทยาลัยการคอมพิวเตอร์ขอแจ้งว่าได้รับคำร้องใหม่ มีรายละเอียดดังนี้ \n\n- หมายเลขคำร้อง: {{submission_number}}\n- ผู้ยื่นคำร้อง: {{submitter_name}}\n- ชื่อผลงานทางวิชาการ: {{submission_title}}\n- วันที่ส่งคำร้อง: {{submitted_at}}\n\nจึงขอให้ท่านพิจารณาคำร้องดังกล่าว โดยสามารถเข้าสู่ระบบที่ {{web_url}} เพื่อดูรายละเอียดและดำเนินการต่อไป\n\nจึงเรียนมาเพื่อทราบ\n\nขอแสดงความนับถือ  \nระบบกองทุนวิจัยฯ  \nวิทยาลัยการคอมพิวเตอร์',
        'มีคำร้องใหม่รอการพิจารณา (หมายเลข {{submission_number}})',
        'เรียน {{depthead_name}}\n\nระบบกองทุนวิจัยฯ วิทยาลัยการคอมพิวเตอร์ขอแจ้งว่าได้รับคำร้องใหม่ มีรายละเอียดดังนี้ \n\n- หมายเลขคำร้อง: {{submission_number}}\n- ผู้ยื่นคำร้อง: {{submitter_name}}\n- ชื่อผลงานทางวิชาการ: {{submission_title}}\n- วันที่ส่งคำร้อง: {{submitted_at}}\n\nจึงขอให้ท่านพิจารณาคำร้องดังกล่าว โดยสามารถเข้าสู่ระบบที่ {{web_url}} เพื่อดูรายละเอียดและดำเนินการต่อไป\n\nจึงเรียนมาเพื่อทราบ\n\nขอแสดงความนับถือ  \nระบบกองทุนวิจัยฯ  \nวิทยาลัยการคอมพิวเตอร์',
        'แจ้งหัวหน้าสาขาเมื่อมีคำร้องใหม่',
        JSON_ARRAY('submission_number', 'depthead_name', 'submitter_name', 'submission_title', 'submitted_at', 'web_url'),
        JSON_ARRAY('submission_number', 'depthead_name', 'submitter_name', 'submission_title', 'submitted_at', 'web_url')
    ),

    -- เมื่อหัวหน้าสาขาเห็นควรพิจารณา
    (
        'dept_head_recommended',
        'user',
        'ผลการพิจารณาจากหัวหน้าสาขา (หมายเลข {{submission_number}})',
        'เรียน {{submitter_name}}\n\nระบบกองทุนวิจัยฯ วิทยาลัยการคอมพิวเตอร์ขอแจ้งผลการพิจารณาจากหัวหน้าสาขาเกี่ยวกับคำร้องของท่าน หมายเลข {{submission_number}} เรื่อง {{submission_title}} ซึ่งหัวหน้าสาขาได้พิจารณาและเห็นชอบให้ดำเนินการต่อเรียบร้อยแล้ว\n\nคำร้องของท่านจะเข้าสู่การพิจารณาในระดับถัดไป ท่านสามารถติดตามสถานะได้ผ่านระบบที่ {{web_url}}\n\nจึงเรียนมาเพื่อทราบ\n\nขอแสดงความนับถือ  \nระบบกองทุนวิจัยฯ  \nวิทยาลัยการคอมพิวเตอร์',
        'ผลการพิจารณาจากหัวหน้าสาขา (หมายเลข {{submission_number}})',
        'เรียน {{submitter_name}}\n\nระบบกองทุนวิจัยฯ วิทยาลัยการคอมพิวเตอร์ขอแจ้งผลการพิจารณาจากหัวหน้าสาขาเกี่ยวกับคำร้องของท่าน หมายเลข {{submission_number}} เรื่อง {{submission_title}} ซึ่งหัวหน้าสาขาได้พิจารณาและเห็นชอบให้ดำเนินการต่อเรียบร้อยแล้ว\n\nคำร้องของท่านจะเข้าสู่การพิจารณาในระดับถัดไป ท่านสามารถติดตามสถานะได้ผ่านระบบที่ {{web_url}}\n\nจึงเรียนมาเพื่อทราบ\n\nขอแสดงความนับถือ  \nระบบกองทุนวิจัยฯ  \nวิทยาลัยการคอมพิวเตอร์',
        'แจ้งผู้ยื่นเมื่อหัวหน้าสาขาเห็นควรพิจารณา',
        JSON_ARRAY('submission_number', 'submitter_name', 'submission_title', 'web_url'),
        JSON_ARRAY('submission_number', 'submitter_name', 'submission_title', 'web_url')
    ),
    (
        'dept_head_recommended',
        'admin',
        'มีคำร้องใหม่รอการพิจารณา (หมายเลข {{submission_number}})',
        'เรียน {{admin_name}}\n\nระบบกองทุนวิจัยฯ วิทยาลัยการคอมพิวเตอร์ขอแจ้งว่าได้รับคำร้องใหม่ มีรายละเอียดดังนี้\n\n- หมายเลขคำร้อง: {{submission_number}}\n- ชื่อผลงานทางวิชาการ: {{submission_title}}\n- ผู้ยื่นคำร้อง: {{submitter_name}}\n\nคำร้องดังกล่าวได้รับการเห็นควรพิจารณาโดยหัวหน้าสาขาแล้ว และรอให้ท่านพิจารณาดำเนินการต่อ โปรดเข้าสู่ระบบที่ {{web_url}} เพื่อดูรายละเอียดและดำเนินการตามขั้นตอน\n\nจึงเรียนมาเพื่อทราบ\n\nขอแสดงความนับถือ  \nระบบกองทุนวิจัยฯ  \nวิทยาลัยการคอมพิวเตอร์',
        'มีคำร้องใหม่รอการพิจารณา (หมายเลข {{submission_number}})',
        'เรียน {{admin_name}}\n\nระบบกองทุนวิจัยฯ วิทยาลัยการคอมพิวเตอร์ขอแจ้งว่าได้รับคำร้องใหม่ มีรายละเอียดดังนี้\n\n- หมายเลขคำร้อง: {{submission_number}}\n- ชื่อผลงานทางวิชาการ: {{submission_title}}\n- ผู้ยื่นคำร้อง: {{submitter_name}}\n\nคำร้องดังกล่าวได้รับการเห็นควรพิจารณาโดยหัวหน้าสาขาแล้ว และรอให้ท่านพิจารณาดำเนินการต่อ โปรดเข้าสู่ระบบที่ {{web_url}} เพื่อดูรายละเอียดและดำเนินการตามขั้นตอน\n\nจึงเรียนมาเพื่อทราบ\n\nขอแสดงความนับถือ  \nระบบกองทุนวิจัยฯ  \nวิทยาลัยการคอมพิวเตอร์',
        'แจ้งทีมแอดมินเพื่อพิจารณาต่อ',
        JSON_ARRAY('submission_number', 'admin_name', 'submission_title', 'submitter_name', 'web_url'),
        JSON_ARRAY('submission_number', 'admin_name', 'submission_title', 'submitter_name', 'web_url')
    ),

    -- เมื่อหัวหน้าสาขาไม่เห็นควรพิจารณา
    (
        'dept_head_not_recommended',
        'user',
        'ผลการพิจารณาจากหัวหน้าสาขา (หมายเลข {{submission_number}})',
        'เรียน {{submitter_name}}\n\nตามที่ท่านได้ยื่นคำร้องหมายเลข {{submission_number}} ผ่านระบบกองทุนวิจัยฯ วิทยาลัยการคอมพิวเตอร์ ขณะนี้หัวหน้าสาขาได้พิจารณาแล้วว่าไม่เห็นควรพิจารณาต่อ โดยมีเหตุผลดังนี้\n{{head_rejection_reason}}\n\nหากต้องการข้อมูลเพิ่มเติมหรือตรวจสอบสถานะ กรุณาเข้าสู่ระบบที่ {{web_url}}\n\nจึงเรียนมาเพื่อทราบ\n\nขอแสดงความนับถือ  \nระบบกองทุนวิจัยฯ  \nวิทยาลัยการคอมพิวเตอร์',
        'ผลการพิจารณาจากหัวหน้าสาขา (หมายเลข {{submission_number}})',
        'เรียน {{submitter_name}}\n\nตามที่ท่านได้ยื่นคำร้องหมายเลข {{submission_number}} ผ่านระบบกองทุนวิจัยฯ วิทยาลัยการคอมพิวเตอร์ ขณะนี้หัวหน้าสาขาได้พิจารณาแล้วว่าไม่เห็นควรพิจารณาต่อ โดยมีเหตุผลดังนี้\n{{head_rejection_reason}}\n\nหากต้องการข้อมูลเพิ่มเติมหรือตรวจสอบสถานะ กรุณาเข้าสู่ระบบที่ {{web_url}}\n\nจึงเรียนมาเพื่อทราบ\n\nขอแสดงความนับถือ  \nระบบกองทุนวิจัยฯ  \nวิทยาลัยการคอมพิวเตอร์',
        'แจ้งผู้ยื่นเมื่อหัวหน้าสาขาไม่เห็นควรพิจารณา',
        JSON_ARRAY('submission_number', 'submitter_name', 'head_rejection_reason', 'web_url'),
        JSON_ARRAY('submission_number', 'submitter_name', 'head_rejection_reason', 'web_url')
    ),

    -- เมื่อหัวหน้าสาขาขอข้อมูลเพิ่มเติม
    (
        'dept_head_needs_more_info',
        'user',
        'คำร้องต้องการข้อมูลเพิ่มเติม (หมายเลข {{submission_number}})',
        'เรียน {{submitter_name}}\n\nหัวหน้าสาขาได้ตรวจสอบคำร้องหมายเลข {{submission_number}} เรื่อง {{submission_title}} และขอข้อมูลเพิ่มเติม โดยมีรายละเอียดดังนี้\n{{head_comment}}\n\nกรุณาเข้าสู่ระบบที่ {{web_url}} เพื่อเพิ่มเติมข้อมูลหรือเอกสารตามที่ร้องขอ\n\nจึงเรียนมาเพื่อทราบ\n\nขอแสดงความนับถือ  \nระบบกองทุนวิจัยฯ  \nวิทยาลัยการคอมพิวเตอร์',
        'คำร้องต้องการข้อมูลเพิ่มเติม (หมายเลข {{submission_number}})',
        'เรียน {{submitter_name}}\n\nหัวหน้าสาขาได้ตรวจสอบคำร้องหมายเลข {{submission_number}} เรื่อง {{submission_title}} และขอข้อมูลเพิ่มเติม โดยมีรายละเอียดดังนี้\n{{head_comment}}\n\nกรุณาเข้าสู่ระบบที่ {{web_url}} เพื่อเพิ่มเติมข้อมูลหรือเอกสารตามที่ร้องขอ\n\nจึงเรียนมาเพื่อทราบ\n\nขอแสดงความนับถือ  \nระบบกองทุนวิจัยฯ  \nวิทยาลัยการคอมพิวเตอร์',
        'แจ้งผู้ยื่นเมื่อหัวหน้าสาขาขอข้อมูลเพิ่มเติม',
        JSON_ARRAY('submission_number', 'submitter_name', 'submission_title', 'head_comment', 'web_url'),
        JSON_ARRAY('submission_number', 'submitter_name', 'submission_title', 'head_comment', 'web_url')
    ),

    -- เมื่อแอดมินขอข้อมูลเพิ่มเติม
    (
        'admin_needs_more_info',
        'user',
        'คำร้องต้องการข้อมูลเพิ่มเติม (หมายเลข {{submission_number}})',
        'เรียน {{submitter_name}}\n\nผู้ดูแลระบบได้ตรวจสอบคำร้องหมายเลข {{submission_number}} เรื่อง {{submission_title}} และขอข้อมูลเพิ่มเติม โดยมีรายละเอียดดังนี้\n{{admin_comment}}\n\nกรุณาเข้าสู่ระบบที่ {{web_url}} เพื่อเพิ่มเติมข้อมูลหรือเอกสารตามที่ร้องขอ\n\nจึงเรียนมาเพื่อทราบ\n\nขอแสดงความนับถือ  \nระบบกองทุนวิจัยฯ  \nวิทยาลัยการคอมพิวเตอร์',
        'คำร้องต้องการข้อมูลเพิ่มเติม (หมายเลข {{submission_number}})',
        'เรียน {{submitter_name}}\n\nผู้ดูแลระบบได้ตรวจสอบคำร้องหมายเลข {{submission_number}} เรื่อง {{submission_title}} และขอข้อมูลเพิ่มเติม โดยมีรายละเอียดดังนี้\n{{admin_comment}}\n\nกรุณาเข้าสู่ระบบที่ {{web_url}} เพื่อเพิ่มเติมข้อมูลหรือเอกสารตามที่ร้องขอ\n\nจึงเรียนมาเพื่อทราบ\n\nขอแสดงความนับถือ  \nระบบกองทุนวิจัยฯ  \nวิทยาลัยการคอมพิวเตอร์',
        'แจ้งผู้ยื่นเมื่อแอดมินขอข้อมูลเพิ่มเติม',
        JSON_ARRAY('submission_number', 'submitter_name', 'submission_title', 'admin_comment', 'web_url'),
        JSON_ARRAY('submission_number', 'submitter_name', 'submission_title', 'admin_comment', 'web_url')
    ),

    -- แอดมินอนุมัติ
    (
        'admin_approved',
        'user',
        'ผลการพิจารณาคำร้อง (หมายเลข {{submission_number}})',
        'เรียน {{submitter_name}}\n\nระบบกองทุนวิจัยฯ วิทยาลัยการคอมพิวเตอร์ขอแจ้งว่า คำร้องหมายเลข {{submission_number}} เรื่อง {{submission_title}} ของท่านได้รับการอนุมัติ เป็นจำนวน {{amount}} บาท โดยพิจารณาตามประกาศกองทุนหมายเลข {{announce_ref}}\n\nหากมีข้อสงสัยหรือต้องการสอบถามเพิ่มเติม โปรดติดต่อ {{contact_info}}\n\nจึงเรียนมาเพื่อทราบ\n\nขอแสดงความนับถือ  \nระบบกองทุนวิจัยฯ  \nวิทยาลัยการคอมพิวเตอร์',
        'ผลการพิจารณาคำร้อง (หมายเลข {{submission_number}})',
        'เรียน {{submitter_name}}\n\nระบบกองทุนวิจัยฯ วิทยาลัยการคอมพิวเตอร์ขอแจ้งว่า คำร้องหมายเลข {{submission_number}} เรื่อง {{submission_title}} ของท่านได้รับการอนุมัติ เป็นจำนวน {{amount}} บาท โดยพิจารณาตามประกาศกองทุนหมายเลข {{announce_ref}}\n\nหากมีข้อสงสัยหรือต้องการสอบถามเพิ่มเติม โปรดติดต่อ {{contact_info}}\n\nจึงเรียนมาเพื่อทราบ\n\nขอแสดงความนับถือ  \nระบบกองทุนวิจัยฯ  \nวิทยาลัยการคอมพิวเตอร์',
        'แจ้งผลอนุมัติพร้อมรายละเอียดประกาศและช่องทางติดต่อ',
        JSON_ARRAY('submission_number', 'submitter_name', 'submission_title', 'amount', 'announce_ref', 'contact_info'),
        JSON_ARRAY('submission_number', 'submitter_name', 'submission_title', 'amount', 'announce_ref', 'contact_info')
    ),

    -- แอดมินไม่อนุมัติ
    (
        'admin_rejected',
        'user',
        'ผลการพิจารณาคำร้อง (หมายเลข {{submission_number}})',
        'เรียน {{submitter_name}}\n\nระบบกองทุนวิจัยฯ วิทยาลัยการคอมพิวเตอร์ขอแจ้งว่า คำร้องหมายเลข {{submission_number}} เรื่อง {{submission_title}} ของท่านไม่ได้รับการอนุมัติ โดยมีรายละเอียดดังนี้\n{{admin_rejection_reason}}\n\nหากต้องการข้อมูลเพิ่มเติมหรือตรวจสอบสถานะ กรุณาเข้าสู่ระบบที่ {{web_url}} หรือสอบถามได้ที่ {{contact_info}}\n\nจึงเรียนมาเพื่อทราบ\n\nขอแสดงความนับถือ  \nระบบกองทุนวิจัยฯ  \nวิทยาลัยการคอมพิวเตอร์',
        'ผลการพิจารณาคำร้อง (หมายเลข {{submission_number}})',
        'เรียน {{submitter_name}}\n\nระบบกองทุนวิจัยฯ วิทยาลัยการคอมพิวเตอร์ขอแจ้งว่า คำร้องหมายเลข {{submission_number}} เรื่อง {{submission_title}} ของท่านไม่ได้รับการอนุมัติ โดยมีรายละเอียดดังนี้\n{{admin_rejection_reason}}\n\nหากต้องการข้อมูลเพิ่มเติมหรือตรวจสอบสถานะ กรุณาเข้าสู่ระบบที่ {{web_url}} หรือสอบถามได้ที่ {{contact_info}}\n\nจึงเรียนมาเพื่อทราบ\n\nขอแสดงความนับถือ  \nระบบกองทุนวิจัยฯ  \nวิทยาลัยการคอมพิวเตอร์',
        'แจ้งผลไม่อนุมัติพร้อมเหตุผล (ถ้ามี)',
        JSON_ARRAY('submission_number', 'submitter_name', 'submission_title', 'admin_rejection_reason', 'web_url', 'contact_info'),
        JSON_ARRAY('submission_number', 'submitter_name', 'submission_title', 'admin_rejection_reason', 'web_url', 'contact_info')
    );
