// mockData.js - ข้อมูลจำลองสำหรับระบบ Teacher

export const mockUser = {
  user_id: 1,
  user_fname: "สมชาย",
  user_lname: "ใจดี",
  email: "somchai@university.ac.th",
  position: "รองศาสตราจารย์",
  role: "teacher",
  unit: "คณะวิศวกรรมศาสตร์",
  profile_image: null
};

export const mockApplications = [
  {
    application_id: 1,
    application_number: "APP-2568-001",
    project_title: "การวิจัยเทคโนโลยี AI สำหรับการศึกษา",
    category_name: "ทุนส่งเสริมการวิจัย",
    subcategory_name: "ทุนสนับสนุนผู้เชี่ยวชาญต่างประเทศ",
    requested_amount: 150000,
    approved_amount: 0,
    status: "รอพิจารณา",
    status_code: "pending",
    submitted_at: "2025-06-15T10:30:00",
    approved_at: null,
    year: "2568",
    documents: [
      { id: 1, name: "ใบสมัคร.pdf", type: "application", uploaded_at: "2025-06-15T10:25:00" },
      { id: 2, name: "โครงการวิจัย.pdf", type: "proposal", uploaded_at: "2025-06-15T10:26:00" },
      { id: 3, name: "งบประมาณ.xlsx", type: "budget", uploaded_at: "2025-06-15T10:27:00" }
    ]
  },
  {
    application_id: 2,
    application_number: "APP-2568-002",
    project_title: "พัฒนาหุ่นยนต์ช่วยสอน",
    category_name: "ทุนส่งเสริมการวิจัย",
    subcategory_name: "ทุนวิจัยร่วมกับหน่วยงานภายนอก",
    requested_amount: 200000,
    approved_amount: 180000,
    status: "อนุมัติ",
    status_code: "approved",
    submitted_at: "2025-05-20T14:20:00",
    approved_at: "2025-06-01T09:15:00",
    year: "2568",
    approved_by: "ผศ.ดร.สมศักดิ์ ศรีสุข",
    comment: "โครงการมีประโยชน์ต่อการเรียนการสอน อนุมัติงบประมาณ 180,000 บาท"
  },
  {
    application_id: 3,
    application_number: "APP-2567-015",
    project_title: "ระบบ IoT สำหรับเกษตรอัจฉริยะ",
    category_name: "ทุนพัฒนาบุคลากร",
    subcategory_name: "ทุนอบรมเชิงปฏิบัติการ",
    requested_amount: 30000,
    approved_amount: 0,
    status: "ไม่อนุมัติ",
    status_code: "rejected",
    submitted_at: "2025-04-10T11:45:00",
    approved_at: "2025-04-25T16:30:00",
    year: "2567",
    comment: "งบประมาณหมวดนี้ได้จัดสรรครบแล้ว"
  }
];

export const mockNotifications = [
  {
    notification_id: 1,
    title: "คำร้องได้รับการอนุมัติ",
    message: "คำร้องขอทุนวิจัย APP-2568-002 ได้รับการอนุมัติแล้ว จำนวนเงิน 180,000 บาท",
    type: "success",
    is_read: false,
    related_application_id: 2,
    created_at: "2025-06-01T09:15:00"
  },
  {
    notification_id: 2,
    title: "กรุณาแก้ไขเอกสาร",
    message: "คำร้อง APP-2568-001 ต้องการเอกสารเพิ่มเติม: หนังสือรับรองจากหน่วยงาน",
    type: "warning",
    is_read: false,
    related_application_id: 1,
    created_at: "2025-06-20T14:00:00"
  },
  {
    notification_id: 3,
    title: "เปิดรับสมัครทุนวิจัยประจำปี 2569",
    message: "เริ่มรับสมัครตั้งแต่วันที่ 1 กรกฎาคม - 31 สิงหาคม 2568",
    type: "info",
    is_read: true,
    created_at: "2025-06-15T09:00:00"
  }
];

export const mockFundCategories = [
  {
    category_id: 1,
    category_name: "ทุนส่งเสริมการวิจัย",
    year: "2568",
    subcategories: [
      {
        subcategorie_id: 1,
        subcategorie_name: "ทุนสนับสนุนผู้เชี่ยวชาญต่างประเทศ",
        allocated_amount: 200000,
        used_amount: 0,
        remaining_budget: 200000,
        max_grants: 1,
        max_amount_per_grant: 200000,
        remaining_grant: 1,
        // เพิ่มข้อมูลรายละเอียด
        description: "ทุนสำหรับเชิญผู้เชี่ยวชาญจากต่างประเทศมาให้คำปรึกษาหรือร่วมทำวิจัย",
        objectives: [
          "พัฒนาความร่วมมือระหว่างประเทศ",
          "ถ่ายทอดความรู้และเทคโนโลยีใหม่",
          "ยกระดับคุณภาพการวิจัย"
        ],
        conditions: [
          "ผู้เชี่ยวชาญต้องมีประสบการณ์อย่างน้อย 10 ปี",
          "ต้องมีผลงานตีพิมพ์ระดับนานาชาติอย่างน้อย 5 เรื่อง",
          "ระยะเวลาโครงการไม่เกิน 1 ปี",
          "ต้องมีแผนการถ่ายทอดความรู้ที่ชัดเจน"
        ],
        documents_required: [
          "CV ของผู้เชี่ยวชาญ",
          "หนังสือตอบรับจากผู้เชี่ยวชาญ",
          "แผนการดำเนินงานโดยละเอียด",
          "งบประมาณแยกตามหมวด"
        ],
        timeline: "1 มกราคม - 31 ธันวาคม 2568",
        contact: {
          name: "คุณสมศรี ใจดี",
          phone: "02-123-4567",
          email: "research@university.ac.th"
        }
      },
      {
        subcategorie_id: 2,
        subcategorie_name: "ทุนวิจัยร่วมกับหน่วยงานภายนอก",
        allocated_amount: 300000,
        used_amount: 180000,
        remaining_budget: 120000,
        max_grants: 2,
        max_amount_per_grant: 150000,
        remaining_grant: 1,
                // เพิ่มข้อมูลรายละเอียด
        description: "ทุนสำหรับเชิญผู้เชี่ยวชาญจากต่างประเทศมาให้คำปรึกษาหรือร่วมทำวิจัย",
        objectives: [
          "พัฒนาความร่วมมือระหว่างประเทศ",
          "ถ่ายทอดความรู้และเทคโนโลยีใหม่",
          "ยกระดับคุณภาพการวิจัย"
        ],
        conditions: [
          "ผู้เชี่ยวชาญต้องมีประสบการณ์อย่างน้อย 10 ปี",
          "ต้องมีผลงานตีพิมพ์ระดับนานาชาติอย่างน้อย 5 เรื่อง",
          "ระยะเวลาโครงการไม่เกิน 1 ปี",
          "ต้องมีแผนการถ่ายทอดความรู้ที่ชัดเจน"
        ],
        documents_required: [
          "CV ของผู้เชี่ยวชาญ",
          "หนังสือตอบรับจากผู้เชี่ยวชาญ",
          "แผนการดำเนินงานโดยละเอียด",
          "งบประมาณแยกตามหมวด"
        ],
        timeline: "1 มกราคม - 31 ธันวาคม 2568",
        contact: {
          name: "คุณสมศรี ใจดี",
          phone: "02-123-4567",
          email: "research@university.ac.th"
        }
      },
      {
        subcategorie_id: 5,
        subcategorie_name: "ทุนวิจัยเพื่อพัฒนาท้องถิ่น",
        allocated_amount: 150000,
        used_amount: 150000,
        remaining_budget: 0,
        max_grants: 3,
        max_amount_per_grant: 50000,
        remaining_grant: 0,
                // เพิ่มข้อมูลรายละเอียด
        description: "ทุนสำหรับเชิญผู้เชี่ยวชาญจากต่างประเทศมาให้คำปรึกษาหรือร่วมทำวิจัย",
        objectives: [
          "พัฒนาความร่วมมือระหว่างประเทศ",
          "ถ่ายทอดความรู้และเทคโนโลยีใหม่",
          "ยกระดับคุณภาพการวิจัย"
        ],
        conditions: [
          "ผู้เชี่ยวชาญต้องมีประสบการณ์อย่างน้อย 10 ปี",
          "ต้องมีผลงานตีพิมพ์ระดับนานาชาติอย่างน้อย 5 เรื่อง",
          "ระยะเวลาโครงการไม่เกิน 1 ปี",
          "ต้องมีแผนการถ่ายทอดความรู้ที่ชัดเจน"
        ],
        documents_required: [
          "CV ของผู้เชี่ยวชาญ",
          "หนังสือตอบรับจากผู้เชี่ยวชาญ",
          "แผนการดำเนินงานโดยละเอียด",
          "งบประมาณแยกตามหมวด"
        ],
        timeline: "1 มกราคม - 31 ธันวาคม 2568",
        contact: {
          name: "คุณสมศรี ใจดี",
          phone: "02-123-4567",
          email: "research@university.ac.th"
        }
      },
      {
        subcategorie_id: 6,
        subcategorie_name: "ทุนวิจัยนวัตกรรมการศึกษา",
        allocated_amount: 250000,
        used_amount: 100000,
        remaining_budget: 150000,
        max_grants: 5,
        max_amount_per_grant: 50000,
        remaining_grant: 3,
                // เพิ่มข้อมูลรายละเอียด
        description: "ทุนสำหรับเชิญผู้เชี่ยวชาญจากต่างประเทศมาให้คำปรึกษาหรือร่วมทำวิจัย",
        objectives: [
          "พัฒนาความร่วมมือระหว่างประเทศ",
          "ถ่ายทอดความรู้และเทคโนโลยีใหม่",
          "ยกระดับคุณภาพการวิจัย"
        ],
        conditions: [
          "ผู้เชี่ยวชาญต้องมีประสบการณ์อย่างน้อย 10 ปี",
          "ต้องมีผลงานตีพิมพ์ระดับนานาชาติอย่างน้อย 5 เรื่อง",
          "ระยะเวลาโครงการไม่เกิน 1 ปี",
          "ต้องมีแผนการถ่ายทอดความรู้ที่ชัดเจน"
        ],
        documents_required: [
          "CV ของผู้เชี่ยวชาญ",
          "หนังสือตอบรับจากผู้เชี่ยวชาญ",
          "แผนการดำเนินงานโดยละเอียด",
          "งบประมาณแยกตามหมวด"
        ],
        timeline: "1 มกราคม - 31 ธันวาคม 2568",
        contact: {
          name: "คุณสมศรี ใจดี",
          phone: "02-123-4567",
          email: "research@university.ac.th"
        }
      }
    ]
  },
  {
    category_id: 2,
    category_name: "ทุนพัฒนาบุคลากร",
    year: "2568",
    subcategories: [
      {
        subcategorie_id: 3,
        subcategorie_name: "ทุนอบรมเชิงปฏิบัติการ",
        allocated_amount: 150000,
        used_amount: 120000,
        remaining_budget: 30000,
        max_grants: 5,
        max_amount_per_grant: 30000,
        remaining_grant: 1,
                // เพิ่มข้อมูลรายละเอียด
        description: "ทุนสำหรับเชิญผู้เชี่ยวชาญจากต่างประเทศมาให้คำปรึกษาหรือร่วมทำวิจัย",
        objectives: [
          "พัฒนาความร่วมมือระหว่างประเทศ",
          "ถ่ายทอดความรู้และเทคโนโลยีใหม่",
          "ยกระดับคุณภาพการวิจัย"
        ],
        conditions: [
          "ผู้เชี่ยวชาญต้องมีประสบการณ์อย่างน้อย 10 ปี",
          "ต้องมีผลงานตีพิมพ์ระดับนานาชาติอย่างน้อย 5 เรื่อง",
          "ระยะเวลาโครงการไม่เกิน 1 ปี",
          "ต้องมีแผนการถ่ายทอดความรู้ที่ชัดเจน"
        ],
        documents_required: [
          "CV ของผู้เชี่ยวชาญ",
          "หนังสือตอบรับจากผู้เชี่ยวชาญ",
          "แผนการดำเนินงานโดยละเอียด",
          "งบประมาณแยกตามหมวด"
        ],
        timeline: "1 มกราคม - 31 ธันวาคม 2568",
        contact: {
          name: "คุณสมศรี ใจดี",
          phone: "02-123-4567",
          email: "research@university.ac.th"
        }
      },
      {
        subcategorie_id: 4,
        subcategorie_name: "ทุนศึกษาต่อระดับปริญญาเอก",
        allocated_amount: 600000,
        used_amount: 200000,
        remaining_budget: 400000,
        max_grants: 3,
        max_amount_per_grant: 200000,
        remaining_grant: 2,
                // เพิ่มข้อมูลรายละเอียด
        description: "ทุนสำหรับเชิญผู้เชี่ยวชาญจากต่างประเทศมาให้คำปรึกษาหรือร่วมทำวิจัย",
        objectives: [
          "พัฒนาความร่วมมือระหว่างประเทศ",
          "ถ่ายทอดความรู้และเทคโนโลยีใหม่",
          "ยกระดับคุณภาพการวิจัย"
        ],
        conditions: [
          "ผู้เชี่ยวชาญต้องมีประสบการณ์อย่างน้อย 10 ปี",
          "ต้องมีผลงานตีพิมพ์ระดับนานาชาติอย่างน้อย 5 เรื่อง",
          "ระยะเวลาโครงการไม่เกิน 1 ปี",
          "ต้องมีแผนการถ่ายทอดความรู้ที่ชัดเจน"
        ],
        documents_required: [
          "CV ของผู้เชี่ยวชาญ",
          "หนังสือตอบรับจากผู้เชี่ยวชาญ",
          "แผนการดำเนินงานโดยละเอียด",
          "งบประมาณแยกตามหมวด"
        ],
        timeline: "1 มกราคม - 31 ธันวาคม 2568",
        contact: {
          name: "คุณสมศรี ใจดี",
          phone: "02-123-4567",
          email: "research@university.ac.th"
        }
      },
      {
        subcategorie_id: 7,
        subcategorie_name: "ทุนฝึกอบรมต่างประเทศ",
        allocated_amount: 100000,
        used_amount: 100000,
        remaining_budget: 0,
        max_grants: 2,
        max_amount_per_grant: 50000,
        remaining_grant: 0,
                // เพิ่มข้อมูลรายละเอียด
        description: "ทุนสำหรับเชิญผู้เชี่ยวชาญจากต่างประเทศมาให้คำปรึกษาหรือร่วมทำวิจัย",
        objectives: [
          "พัฒนาความร่วมมือระหว่างประเทศ",
          "ถ่ายทอดความรู้และเทคโนโลยีใหม่",
          "ยกระดับคุณภาพการวิจัย"
        ],
        conditions: [
          "ผู้เชี่ยวชาญต้องมีประสบการณ์อย่างน้อย 10 ปี",
          "ต้องมีผลงานตีพิมพ์ระดับนานาชาติอย่างน้อย 5 เรื่อง",
          "ระยะเวลาโครงการไม่เกิน 1 ปี",
          "ต้องมีแผนการถ่ายทอดความรู้ที่ชัดเจน"
        ],
        documents_required: [
          "CV ของผู้เชี่ยวชาญ",
          "หนังสือตอบรับจากผู้เชี่ยวชาญ",
          "แผนการดำเนินงานโดยละเอียด",
          "งบประมาณแยกตามหมวด"
        ],
        timeline: "1 มกราคม - 31 ธันวาคม 2568",
        contact: {
          name: "คุณสมศรี ใจดี",
          phone: "02-123-4567",
          email: "research@university.ac.th"
        }
      },
      {
        subcategorie_id: 8,
        subcategorie_name: "ทุนพัฒนาทักษะภาษาอังกฤษ",
        allocated_amount: 80000,
        used_amount: 60000,
        remaining_budget: 20000,
        max_grants: 4,
        max_amount_per_grant: 20000,
        remaining_grant: 1,
                // เพิ่มข้อมูลรายละเอียด
        description: "ทุนสำหรับเชิญผู้เชี่ยวชาญจากต่างประเทศมาให้คำปรึกษาหรือร่วมทำวิจัย",
        objectives: [
          "พัฒนาความร่วมมือระหว่างประเทศ",
          "ถ่ายทอดความรู้และเทคโนโลยีใหม่",
          "ยกระดับคุณภาพการวิจัย"
        ],
        conditions: [
          "ผู้เชี่ยวชาญต้องมีประสบการณ์อย่างน้อย 10 ปี",
          "ต้องมีผลงานตีพิมพ์ระดับนานาชาติอย่างน้อย 5 เรื่อง",
          "ระยะเวลาโครงการไม่เกิน 1 ปี",
          "ต้องมีแผนการถ่ายทอดความรู้ที่ชัดเจน"
        ],
        documents_required: [
          "CV ของผู้เชี่ยวชาญ",
          "หนังสือตอบรับจากผู้เชี่ยวชาญ",
          "แผนการดำเนินงานโดยละเอียด",
          "งบประมาณแยกตามหมวด"
        ],
        timeline: "1 มกราคม - 31 ธันวาคม 2568",
        contact: {
          name: "คุณสมศรี ใจดี",
          phone: "02-123-4567",
          email: "research@university.ac.th"
        }
      }
    ]
  },
  {
    category_id: 3,
    category_name: "ทุนสนับสนุนการตีพิมพ์",
    year: "2568",
    subcategories: [
      {
        subcategorie_id: 9,
        subcategorie_name: "ทุนตีพิมพ์วารสารระดับชาติ",
        allocated_amount: 50000,
        used_amount: 30000,
        remaining_budget: 20000,
        max_grants: 10,
        max_amount_per_grant: 5000,
        remaining_grant: 4,
                // เพิ่มข้อมูลรายละเอียด
        description: "ทุนสำหรับเชิญผู้เชี่ยวชาญจากต่างประเทศมาให้คำปรึกษาหรือร่วมทำวิจัย",
        objectives: [
          "พัฒนาความร่วมมือระหว่างประเทศ",
          "ถ่ายทอดความรู้และเทคโนโลยีใหม่",
          "ยกระดับคุณภาพการวิจัย"
        ],
        conditions: [
          "ผู้เชี่ยวชาญต้องมีประสบการณ์อย่างน้อย 10 ปี",
          "ต้องมีผลงานตีพิมพ์ระดับนานาชาติอย่างน้อย 5 เรื่อง",
          "ระยะเวลาโครงการไม่เกิน 1 ปี",
          "ต้องมีแผนการถ่ายทอดความรู้ที่ชัดเจน"
        ],
        documents_required: [
          "CV ของผู้เชี่ยวชาญ",
          "หนังสือตอบรับจากผู้เชี่ยวชาญ",
          "แผนการดำเนินงานโดยละเอียด",
          "งบประมาณแยกตามหมวด"
        ],
        timeline: "1 มกราคม - 31 ธันวาคม 2568",
        contact: {
          name: "คุณสมศรี ใจดี",
          phone: "02-123-4567",
          email: "research@university.ac.th"
        }
      },
      {
        subcategorie_id: 10,
        subcategorie_name: "ทุนตีพิมพ์วารสารระดับนานาชาติ",
        allocated_amount: 120000,
        used_amount: 80000,
        remaining_budget: 40000,
        max_grants: 6,
        max_amount_per_grant: 20000,
        remaining_grant: 2,
                // เพิ่มข้อมูลรายละเอียด
        description: "ทุนสำหรับเชิญผู้เชี่ยวชาญจากต่างประเทศมาให้คำปรึกษาหรือร่วมทำวิจัย",
        objectives: [
          "พัฒนาความร่วมมือระหว่างประเทศ",
          "ถ่ายทอดความรู้และเทคโนโลยีใหม่",
          "ยกระดับคุณภาพการวิจัย"
        ],
        conditions: [
          "ผู้เชี่ยวชาญต้องมีประสบการณ์อย่างน้อย 10 ปี",
          "ต้องมีผลงานตีพิมพ์ระดับนานาชาติอย่างน้อย 5 เรื่อง",
          "ระยะเวลาโครงการไม่เกิน 1 ปี",
          "ต้องมีแผนการถ่ายทอดความรู้ที่ชัดเจน"
        ],
        documents_required: [
          "CV ของผู้เชี่ยวชาญ",
          "หนังสือตอบรับจากผู้เชี่ยวชาญ",
          "แผนการดำเนินงานโดยละเอียด",
          "งบประมาณแยกตามหมวด"
        ],
        timeline: "1 มกราคม - 31 ธันวาคม 2568",
        contact: {
          name: "คุณสมศรี ใจดี",
          phone: "02-123-4567",
          email: "research@university.ac.th"
        }
      }
    ]
  },
  // ข้อมูลปี 2567
  {
    category_id: 1,
    category_name: "ทุนส่งเสริมการวิจัย",
    year: "2567",
    subcategories: [
      {
        subcategorie_id: 11,
        subcategorie_name: "ทุนวิจัยพื้นฐาน",
        allocated_amount: 180000,
        used_amount: 180000,
        remaining_budget: 0,
        max_grants: 3,
        max_amount_per_grant: 60000,
        remaining_grant: 0,
                // เพิ่มข้อมูลรายละเอียด
        description: "ทุนสำหรับเชิญผู้เชี่ยวชาญจากต่างประเทศมาให้คำปรึกษาหรือร่วมทำวิจัย",
        objectives: [
          "พัฒนาความร่วมมือระหว่างประเทศ",
          "ถ่ายทอดความรู้และเทคโนโลยีใหม่",
          "ยกระดับคุณภาพการวิจัย"
        ],
        conditions: [
          "ผู้เชี่ยวชาญต้องมีประสบการณ์อย่างน้อย 10 ปี",
          "ต้องมีผลงานตีพิมพ์ระดับนานาชาติอย่างน้อย 5 เรื่อง",
          "ระยะเวลาโครงการไม่เกิน 1 ปี",
          "ต้องมีแผนการถ่ายทอดความรู้ที่ชัดเจน"
        ],
        documents_required: [
          "CV ของผู้เชี่ยวชาญ",
          "หนังสือตอบรับจากผู้เชี่ยวชาญ",
          "แผนการดำเนินงานโดยละเอียด",
          "งบประมาณแยกตามหมวด"
        ],
        timeline: "1 มกราคม - 31 ธันวาคม 2568",
        contact: {
          name: "คุณสมศรี ใจดี",
          phone: "02-123-4567",
          email: "research@university.ac.th"
        }
      },
      {
        subcategorie_id: 12,
        subcategorie_name: "ทุนวิจัยประยุกต์",
        allocated_amount: 200000,
        used_amount: 150000,
        remaining_budget: 50000,
        max_grants: 4,
        max_amount_per_grant: 50000,
        remaining_grant: 1,
                // เพิ่มข้อมูลรายละเอียด
        description: "ทุนสำหรับเชิญผู้เชี่ยวชาญจากต่างประเทศมาให้คำปรึกษาหรือร่วมทำวิจัย",
        objectives: [
          "พัฒนาความร่วมมือระหว่างประเทศ",
          "ถ่ายทอดความรู้และเทคโนโลยีใหม่",
          "ยกระดับคุณภาพการวิจัย"
        ],
        conditions: [
          "ผู้เชี่ยวชาญต้องมีประสบการณ์อย่างน้อย 10 ปี",
          "ต้องมีผลงานตีพิมพ์ระดับนานาชาติอย่างน้อย 5 เรื่อง",
          "ระยะเวลาโครงการไม่เกิน 1 ปี",
          "ต้องมีแผนการถ่ายทอดความรู้ที่ชัดเจน"
        ],
        documents_required: [
          "CV ของผู้เชี่ยวชาญ",
          "หนังสือตอบรับจากผู้เชี่ยวชาญ",
          "แผนการดำเนินงานโดยละเอียด",
          "งบประมาณแยกตามหมวด"
        ],
        timeline: "1 มกราคม - 31 ธันวาคม 2568",
        contact: {
          name: "คุณสมศรี ใจดี",
          phone: "02-123-4567",
          email: "research@university.ac.th"
        }
      }
    ]
  }
];

export const mockYears = ["2569", "2568", "2567", "2566"];

export const mockDocumentTypes = [
  { id: 1, name: "ใบสมัคร", required: true },
  { id: 2, name: "โครงการวิจัย", required: true },
  { id: 3, name: "เอกสารอื่นๆ", required: false }
];

export const mockDashboardStats = {
  myApplications: {
    total: 15,
    approved: 8,
    pending: 4,
    rejected: 3
  },
  budgetUsed: {
    total: 850000,
    thisYear: 380000,
    remaining: 120000
  },
  monthlyStats: [
    { month: "ม.ค.", applications: 2, approved: 1 },
    { month: "ก.พ.", applications: 1, approved: 1 },
    { month: "มี.ค.", applications: 3, approved: 2 },
    { month: "เม.ย.", applications: 2, approved: 1 },
    { month: "พ.ค.", applications: 4, approved: 2 },
    { month: "มิ.ย.", applications: 3, approved: 1 }
  ]
};