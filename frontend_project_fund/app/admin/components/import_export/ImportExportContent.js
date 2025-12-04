"use client";

import PageLayout from "../common/PageLayout";

function FieldTable({ title, description, fields }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-3 py-2 font-semibold">คอลัมน์</th>
              <th className="px-3 py-2 font-semibold">บังคับ</th>
              <th className="px-3 py-2 font-semibold">รายละเอียด</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {fields.map((field) => (
              <tr key={field.name} className="align-top">
                <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-900">
                  {field.name}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                  {field.required ? "จำเป็น" : "เลือกใส่ได้"}
                </td>
                <td className="px-3 py-2 text-slate-700">{field.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HeaderPreview({ sheetName, columns }) {
  return (
    <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-900">
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded bg-indigo-100 px-2 py-1 text-xs font-semibold uppercase text-indigo-700">
          Sheet
        </span>
        <span className="font-semibold">{sheetName}</span>
      </div>
      <p className="text-indigo-800">
        คัดลอกข้อความด้านล่างไปวางเป็นหัวแถวแรกของ Excel
      </p>
      <div className="mt-2 rounded bg-white/70 p-3 font-mono text-xs text-indigo-900 shadow-inner">
        {columns.join(" | ")}
      </div>
    </div>
  );
}

const userFields = [
  { name: "user_fname", required: true, detail: "ชื่อ (ภาษาไทย) ของผู้ใช้" },
  { name: "user_lname", required: true, detail: "นามสกุล (ภาษาไทย) ของผู้ใช้" },
  { name: "gender", required: true, detail: "เพศของผู้ใช้ (male / female)" },
  { name: "email", required: true, detail: "อีเมล (ต้องไม่ซ้ำในระบบ)" },
  {
    name: "password",
    required: true,
    detail: "รหัสผ่านชั่วคราว (ตัว importer ต้องแฮชก่อนบันทึก)",
  },
  { name: "role_id", required: true, detail: "Role ID ที่มีอยู่ในระบบ (เช่น 3 = admin)" },
  { name: "position_id", required: true, detail: "ตำแหน่งงาน (FK ไปที่ positions.position_id)" },
  { name: "prefix", required: false, detail: "คำนำหน้า" },
  { name: "position_title", required: false, detail: "ตำแหน่งภาษาอังกฤษ" },
  { name: "tel", required: false, detail: "เบอร์โทรศัพท์" },
  { name: "scopus_id", required: false, detail: "Scopus ID" },
  { name: "scholar_author_id", required: false, detail: "Scholar Author ID" },
  {
    name: "date_of_employment",
    required: false,
    detail: "วันที่เริ่มงาน รูปแบบ YYYY-MM-DD",
  },
  { name: "is_active", required: false, detail: "สถานะบัญชี (active / inactive)" },
];

const submissionBaseFields = [
  {
    name: "submission_type",
    required: true,
    detail: "ประเภทคำร้อง เช่น fund_application, publication_reward, conference_grant, training_request",
  },
  {
    name: "submission_number",
    required: false,
    detail: "รหัสคำร้อง หากเว้นว่างสามารถให้ระบบ gen อัตโนมัติตามประเภทได้",
  },
  { name: "user_id", required: true, detail: "User ID ที่มีอยู่แล้วในระบบ (เจ้าของคำร้อง)" },
  { name: "year_id", required: true, detail: "รหัสปีงบประมาณ (ตาราง years)" },
  {
    name: "status_id",
    required: true,
    detail: "สถานะคำร้อง (FK application_status.application_status_id)",
  },
  { name: "category_id", required: false, detail: "หมวดทุนหลัก" },
  {
    name: "subcategory_id",
    required: false,
    detail: "หมวดย่อย (ควรสัมพันธ์กับ category_id)",
  },
  {
    name: "subcategory_budget_id",
    required: false,
    detail: "งบประมาณย่อย ต้องผูกกับ subcategory_id",
  },
  {
    name: "submitted_at",
    required: false,
    detail: "วันที่ส่งคำร้อง YYYY-MM-DD HH:MM",
  },
  { name: "reviewed_at", required: false, detail: "เวลาที่รับเรื่อง YYYY-MM-DD HH:MM" },
  { name: "created_at", required: false, detail: "วันที่สร้างข้อมูล (หากมี)" },
  { name: "updated_at", required: false, detail: "วันที่แก้ไขข้อมูล (หากมี)" },
  { name: "approved_by", required: false, detail: "User ID ผู้อนุมัติ" },
  { name: "approved_at", required: false, detail: "เวลาที่อนุมัติ" },
  { name: "head_approved_by", required: false, detail: "User ID หัวหน้าที่อนุมัติ" },
  { name: "head_approved_at", required: false, detail: "เวลาที่หัวหน้าอนุมัติ" },
  { name: "admin_approved_by", required: false, detail: "User ID แอดมินกลางอนุมัติ" },
  { name: "admin_approved_at", required: false, detail: "เวลาที่แอดมินกลางอนุมัติ" },
  { name: "head_rejected_by", required: false, detail: "User ID ผู้ตีกลับ (หัวหน้า)" },
  { name: "head_rejected_at", required: false, detail: "เวลาที่ตีกลับ (หัวหน้า)" },
  { name: "head_rejection_reason", required: false, detail: "เหตุผลการตีกลับ (หัวหน้า)" },
  { name: "admin_rejected_by", required: false, detail: "User ID ผู้ตีกลับ (แอดมินกลาง)" },
  { name: "admin_rejected_at", required: false, detail: "เวลาที่ตีกลับ (แอดมินกลาง)" },
  { name: "admin_rejection_reason", required: false, detail: "เหตุผลการตีกลับ (แอดมินกลาง)" },
  {
    name: "installment_number_at_submit",
    required: false,
    detail: "ลำดับงวดตอนส่ง (integer)",
  },
];

const fundDetailFields = [
  { name: "submission_number", required: true, detail: "ใช้โยงกับ sheet submissions" },
  { name: "subcategory_id", required: true, detail: "ต้องตรงกับ subcategory ของ submission" },
  { name: "project_title", required: true, detail: "ชื่อโครงการ" },
  { name: "project_description", required: true, detail: "รายละเอียดโครงการ" },
  { name: "requested_amount", required: true, detail: "วงเงินที่ขอ (ตัวเลข)" },
  { name: "approved_amount", required: true, detail: "วงเงินที่อนุมัติ (ตัวเลข)" },
  { name: "announce_reference_number", required: false, detail: "เลขอ้างอิงประกาศ" },
  { name: "closed_at", required: false, detail: "วันที่ปิดโครงการ (YYYY-MM-DD)" },
  {
    name: "main_annoucement",
    required: false,
    detail: "snapshot ของประกาศหลัก (FK system_config)",
  },
  {
    name: "activity_support_announcement",
    required: false,
    detail: "snapshot ของประกาศสนับสนุนกิจกรรม (FK system_config)",
  },
];

const publicationDetailFields = [
  { name: "submission_number", required: true, detail: "ใช้โยงกับ sheet submissions" },
  { name: "paper_title", required: true, detail: "ชื่อบทความ" },
  { name: "journal_name", required: true, detail: "ชื่อวารสาร" },
  { name: "publication_date", required: true, detail: "วันตีพิมพ์ (YYYY-MM-DD)" },
  {
    name: "publication_type",
    required: true,
    detail: "journal / conference / book_chapter / other",
  },
  { name: "quartile", required: true, detail: "Q1/Q2/Q3/Q4 หรือ N/A" },
  { name: "impact_factor", required: false, detail: "ค่าดัชนีวารสาร" },
  { name: "indexing", required: false, detail: "ฐานข้อมูลที่จัดอันดับ" },
  { name: "doi", required: false, detail: "Digital Object Identifier" },
  { name: "url", required: false, detail: "ลิงก์บทความ" },
  { name: "page_numbers", required: false, detail: "เลขหน้า" },
  { name: "volume_issue", required: false, detail: "เล่ม/ฉบับ" },
  { name: "reward_amount", required: false, detail: "ยอดเงินรางวัลที่ขอ" },
  { name: "reward_approve_amount", required: false, detail: "ยอดเงินรางวัลที่อนุมัติ" },
  { name: "revision_fee", required: false, detail: "ค่าแก้ไขบทความ" },
  { name: "revision_fee_approve_amount", required: false, detail: "ยอดค่าแก้ไขที่อนุมัติ" },
  { name: "publication_fee", required: false, detail: "ค่าเผยแพร่" },
  { name: "publication_fee_approve_amount", required: false, detail: "ยอดค่าเผยแพร่ที่อนุมัติ" },
  { name: "external_funding_amount", required: false, detail: "ยอดทุนภายนอก" },
  { name: "total_amount", required: false, detail: "ยอดรวมทั้งหมด" },
  { name: "total_approve_amount", required: false, detail: "ยอดรวมที่อนุมัติ" },
  { name: "author_count", required: true, detail: "จำนวนผู้แต่ง" },
  {
    name: "author_type",
    required: true,
    detail: "owner / coauthor / advisor / team_member / coordinator",
  },
  { name: "author_name_list", required: true, detail: "รายชื่อผู้แต่ง (ข้อความ)" },
  { name: "signature", required: true, detail: "ลายเซ็นหรือหลักฐานยืนยัน" },
  { name: "announce_reference_number", required: false, detail: "เลขอ้างอิงประกาศ" },
  { name: "has_university_funding", required: false, detail: "TRUE/FALSE มีทุนจากมหาวิทยาลัยหรือไม่" },
  { name: "funding_references", required: false, detail: "อ้างอิงทุนอื่น" },
  { name: "university_rankings", required: false, detail: "อันดับมหาวิทยาลัย" },
  { name: "main_annoucement", required: false, detail: "snapshot ของประกาศหลัก (FK system_config)" },
  { name: "reward_announcement", required: false, detail: "snapshot ของประกาศรางวัล (FK system_config)" },
  { name: "approved_amount", required: false, detail: "ยอดที่อนุมัติหลังคำนวณ (สำหรับ admin)" },
];

const participantFields = [
  { name: "submission_number", required: true, detail: "โยง submission หลัก" },
  { name: "user_id", required: true, detail: "User ID ผู้มีส่วนร่วม" },
  {
    name: "role",
    required: true,
    detail: "owner / coauthor / advisor / team_member / coordinator",
  },
  { name: "is_primary", required: false, detail: "TRUE/FALSE ระบุผู้หลักในกรณี owner" },
  { name: "display_order", required: false, detail: "ลำดับการแสดงผล (integer)" },
];

const documentFields = [
  { name: "submission_number", required: true, detail: "โยง submission หลัก" },
  { name: "document_type_id", required: true, detail: "ชนิดเอกสาร (FK document_types)" },
  { name: "original_name", required: true, detail: "ชื่อไฟล์ที่แสดง" },
  { name: "file_name", required: true, detail: "ชื่อไฟล์จริงบนเซิร์ฟเวอร์" },
  { name: "stored_path", required: true, detail: "พาธไฟล์ เช่น users/<user_id>/submissions/..." },
  { name: "description", required: false, detail: "คำอธิบายเพิ่มเติม" },
  { name: "display_order", required: false, detail: "ลำดับการแสดงผล" },
  { name: "is_required", required: false, detail: "TRUE/FALSE บังคับต้องมี" },
  { name: "is_verified", required: false, detail: "TRUE/FALSE ตรวจสอบแล้ว" },
  { name: "verified_by", required: false, detail: "User ID ผู้ตรวจเอกสาร" },
  { name: "verified_at", required: false, detail: "เวลาตรวจเอกสาร" },
];

const headerSets = [
  {
    sheetName: "users",
    columns: userFields.map((f) => f.name),
  },
  {
    sheetName: "submissions",
    columns: submissionBaseFields.map((f) => f.name),
  },
  {
    sheetName: "fund_application_details",
    columns: fundDetailFields.map((f) => f.name),
  },
  {
    sheetName: "publication_reward_details",
    columns: publicationDetailFields.map((f) => f.name),
  },
  {
    sheetName: "submission_users",
    columns: participantFields.map((f) => f.name),
  },
  {
    sheetName: "documents",
    columns: documentFields.map((f) => f.name),
  },
];

export default function ImportExportContent() {
  return (
    <PageLayout
      title="นำเข้า / ส่งออกข้อมูล"
      description="สรุปคอลัมน์ที่ต้องใช้ใน Excel สำหรับการนำเข้าผู้ใช้และคำร้องที่มีอยู่แล้ว"
    >
      <div className="space-y-6">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">หัวคอลัมน์พร้อมคัดลอก</h2>
              <p className="mt-1 text-sm text-slate-600">
                ใช้หัวตารางเหล่านี้วางในแถวแรกของ Excel แต่ละชีต แล้วกรอกข้อมูลตามแถวต่อไป
              </p>
            </div>
            <a
              href="/import_templates.txt"
              download
              className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              ดาวน์โหลดไฟล์ .txt
            </a>
          </div>

          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>ช่องวันที่/เวลาใช้รูปแบบ <strong>YYYY-MM-DD</strong> หรือ <strong>YYYY-MM-DD HH:MM</strong></li>
            <li>เชื่อมชีตด้วย <strong>submission_number</strong> (หรือ submission_id หากต้องใช้)</li>
            <li>รหัส FK (role_id, position_id, year_id, status_id, category_id, subcategory_id ฯลฯ) ต้องมีอยู่แล้วในระบบ</li>
            <li>ไฟล์ <strong>import_templates.txt</strong> จะรวมชื่อคอลัมน์ทุกชีตในรูปแบบข้อความ (คั่นด้วย "|") สำหรับนำไปสร้าง Excel เอง</li>
          </ul>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {headerSets.map((sheet) => (
              <HeaderPreview
                key={sheet.sheetName}
                sheetName={sheet.sheetName}
                columns={sheet.columns}
              />
            ))}
          </div>
        </div>

        <FieldTable
          title="Sheet: users"
          description="เพิ่มผู้ใช้ใหม่ (ยังไม่มีในระบบ) ตามคอลัมน์ของตาราง users"
          fields={userFields}
        />

        <div className="grid gap-4 lg:grid-cols-2">
          <FieldTable
            title="Sheet: submissions"
            description="ข้อมูลหลักของคำร้อง ใช้ร่วมกับทุกประเภท submission"
            fields={submissionBaseFields}
          />
          <div className="space-y-4">
            <FieldTable
              title="Sheet: fund_application_details"
              description="รายละเอียดโครงการสำหรับ submission_type = fund_application"
              fields={fundDetailFields}
            />
            <FieldTable
              title="Sheet: publication_reward_details"
              description="รายละเอียดผลงานตีพิมพ์สำหรับ submission_type = publication_reward"
              fields={publicationDetailFields}
            />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <FieldTable
            title="Sheet: submission_users"
            description="ผู้มีส่วนร่วมในคำร้อง (owner / coauthor / advisor / team_member / coordinator)"
            fields={participantFields}
          />
          <FieldTable
            title="Sheet: documents"
            description="แนบไฟล์อ้างอิงย้อนหลัง สามารถดึงพาธไฟล์ที่มีอยู่บนเซิร์ฟเวอร์"
            fields={documentFields}
          />
        </div>
      </div>
    </PageLayout>
  );
}
