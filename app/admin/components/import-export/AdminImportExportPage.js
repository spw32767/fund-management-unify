"use client";

import { useCallback } from "react";
import { ArrowDownUp, Download, UploadCloud, FileSpreadsheet } from "lucide-react";
import PageLayout from "../common/PageLayout";

const templates = [
  {
    name: "เทมเพลตนำเข้าผู้ใช้ (User Import Template)",
    description: "ใช้สำหรับเพิ่มผู้ใช้ใหม่จำนวนมากจากไฟล์ Excel",
    fileType: ".xlsx",
    href: "/templates/user_import_template.xlsx",
  },
  {
    name: "เทมเพลตนำเข้าประวัติทุนย้อนหลัง",
    description: "ใช้สำหรับบันทึกประวัติทุนของอาจารย์ที่มีทุนมาก่อนใช้ระบบนี้",
    fileType: ".xlsx",
    href: "/templates/submission_unified_template.xlsx",
  },
];

export default function AdminImportExportPage() {
  const handleComingSoon = useCallback(() => {
    alert("ฟังก์ชันนำเข้ากำลังจะมาภายหลัง");
  }, []);

  return (
    <PageLayout
      title="นำเข้า / ส่งออก"
      subtitle="หน้าสำหรับดาวน์โหลดเทมเพลตและนำเข้าข้อมูลผู้ใช้ / ประวัติการรับทุนย้อนหลัง"
      icon={ArrowDownUp}
      breadcrumbs={[
        { label: "หน้าแรก", href: "/admin" },
        { label: "นำเข้า / ส่งออก" },
      ]}
    >
      <div className="space-y-6">
        {/* Download templates */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                ดาวน์โหลดไฟล์ตัวอย่าง / Templates
              </h2>
              <p className="text-sm text-slate-600">
                เลือกดาวน์โหลดไฟล์เทมเพลตที่ต้องการแล้วกรอกข้อมูลให้ครบถ้วนก่อนนำเข้า
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-slate-500">
              <Download size={18} />
              <span className="text-sm">Available Templates</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                    ชื่อเทมเพลต
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                    รายละเอียด
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">
                    ชนิดไฟล์
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-slate-700">
                    ดาวน์โหลด
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {templates.map((template) => (
                  <tr key={template.name}>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      {template.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {template.description}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {template.fileType}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <a
                        href={template.href}
                        className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100 hover:text-blue-800"
                      >
                        <Download size={16} />
                        ดาวน์โหลด
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Import section */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">นำเข้าข้อมูลจากเทมเพลต</h2>
              <p className="text-sm text-slate-600">
                อัปโหลดไฟล์ที่กรอกข้อมูลแล้ว ระบบจะตรวจสอบและเพิ่มข้อมูล (ฟังก์ชันกำลังพัฒนา)
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-slate-500">
              <UploadCloud size={18} />
              <span className="text-sm">Import</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 p-4 sm:grid-cols-2 sm:p-6">
            <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center gap-2 text-slate-800">
                <FileSpreadsheet size={18} className="text-blue-600" />
                <h3 className="text-base font-semibold">นำเข้าผู้ใช้จากไฟล์</h3>
              </div>
              <p className="text-sm text-slate-600">
                ใช้ไฟล์ "User Import Template" กรอกข้อมูลผู้ใช้ใหม่ให้ครบ จากนั้นอัปโหลดที่นี่
              </p>
              <div className="flex flex-col gap-3">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  disabled
                />
                <button
                  type="button"
                  onClick={handleComingSoon}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <UploadCloud size={16} />
                  อัปโหลด / นำเข้า
                </button>
                <p className="text-xs text-slate-500">
                  ระบบจะตรวจสอบและเพิ่มผู้ใช้ใหม่จากไฟล์นี้ (ฟังก์ชันกำลังพัฒนา)
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center gap-2 text-slate-800">
                <FileSpreadsheet size={18} className="text-green-600" />
                <h3 className="text-base font-semibold">นำเข้าประวัติทุนย้อนหลัง</h3>
              </div>
              <p className="text-sm text-slate-600">
                สำหรับบันทึกประวัติทุนของอาจารย์ที่มีทุนมาก่อนใช้ระบบนี้ ใช้เทมเพลตประวัติทุนย้อนหลัง
              </p>
              <div className="flex flex-col gap-3">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  disabled
                />
                <button
                  type="button"
                  onClick={handleComingSoon}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <UploadCloud size={16} />
                  อัปโหลด / นำเข้าประวัติทุน
                </button>
                <p className="text-xs text-slate-500">
                  ระบบจะตรวจสอบข้อมูลและเพิ่มประวัติทุน (ฟังก์ชันกำลังพัฒนา)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}