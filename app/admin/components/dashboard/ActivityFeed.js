"use client";

import { formatThaiDateTime } from "@/app/utils/format";

const ACTION_META = {
  create: { label: "สร้าง", className: "bg-emerald-100 text-emerald-700 border border-emerald-200" },
  update: { label: "แก้ไข", className: "bg-blue-100 text-blue-700 border border-blue-200" },
  delete: { label: "ลบ", className: "bg-rose-100 text-rose-700 border border-rose-200" },
  approve: { label: "อนุมัติ", className: "bg-emerald-100 text-emerald-700 border border-emerald-200" },
  reject: { label: "ปฏิเสธ", className: "bg-rose-100 text-rose-700 border border-rose-200" },
  submit: { label: "ยื่นคำร้อง", className: "bg-indigo-100 text-indigo-700 border border-indigo-200" },
  review: { label: "ตรวจสอบ", className: "bg-purple-100 text-purple-700 border border-purple-200" },
  request_revision: { label: "ขอข้อมูลเพิ่ม", className: "bg-amber-100 text-amber-700 border border-amber-200" },
  download: { label: "ดาวน์โหลด", className: "bg-amber-100 text-amber-700 border border-amber-200" },
  login: { label: "เข้าสู่ระบบ", className: "bg-slate-100 text-slate-700 border border-slate-200" },
  logout: { label: "ออกจากระบบ", className: "bg-slate-100 text-slate-700 border border-slate-200" },
};

export default function ActivityFeed({ items = [] }) {
  const activities = Array.isArray(items) ? items.slice(0, 6) : [];

  if (!activities.length) {
    return (
      <p className="text-center text-gray-500 py-6">
        ยังไม่มีกิจกรรมล่าสุดในระบบ
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => {
        const meta = ACTION_META[activity.action] || {
          label: activity.action || "กิจกรรม",
          className: "bg-gray-100 text-gray-700 border border-gray-200",
        };
        const timestamp = formatThaiDateTime(activity.created_at);
        const key = activity.log_id || `${activity.action}-${activity.created_at}`;

        return (
          <div
            key={key}
            className="rounded-lg border border-gray-200 p-4 hover:border-blue-400 transition"
          >
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${meta.className}`}>
                  {meta.label}
                </span>
                {activity.entity_type && (
                  <span className="text-xs text-gray-500">
                    {activity.entity_type}
                    {activity.entity_number ? ` #${activity.entity_number}` : ""}
                  </span>
                )}
              </div>

              <p className="text-sm text-gray-700">
                {activity.description || "ไม่มีคำอธิบาย"}
              </p>

              <div className="flex flex-wrap items-center justify-between text-xs text-gray-500">
                <span>{activity.user_name || "ระบบ"}</span>
                <span>{timestamp}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}