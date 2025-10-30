"use client";

import { formatThaiDateTime } from "@/app/utils/format";

const STATUS_LABELS = {
  open: { label: "กำลังเปิดรับ", className: "bg-emerald-100 text-emerald-700 border border-emerald-200" },
  not_yet: { label: "ยังไม่เปิดรับ", className: "bg-blue-100 text-blue-700 border border-blue-200" },
  closed: { label: "เลยกำหนด", className: "bg-rose-100 text-rose-700 border border-rose-200" },
};

function formatRemainingDays(days) {
  if (!Number.isFinite(days)) return "ไม่มีกำหนด";
  if (days < 0) return `เกินกำหนด ${Math.abs(days)} วัน`;
  if (days === 0) return "ปิดรับวันนี้";
  if (days === 1) return "เหลือ 1 วัน";
  return `เหลือ ${days} วัน`;
}

export default function UpcomingDeadlines({ periods = [] }) {
  const items = Array.isArray(periods) ? periods.slice(0, 5) : [];

  if (!items.length) {
    return (
      <p className="text-center text-gray-500 py-6">
        ยังไม่มีรอบตัดรับทุนที่กำลังจะมาถึง
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((period) => {
        const key = `${period.year || ""}-${period.installment || period.name}`;
        const statusMeta = STATUS_LABELS[period.status] || STATUS_LABELS.open;
        const remainingLabel = formatRemainingDays(Number(period.days_remaining));
        const cutoffLabel = formatThaiDateTime(period.cutoff_datetime || period.cutoff_date);

        return (
          <div
            key={key}
            className="rounded-lg border border-gray-200 p-4 hover:border-blue-400 transition"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">{period.name || `รอบที่ ${period.installment}`}</p>
                <p className="text-xs text-gray-500">
                  ปีงบประมาณ {period.year || "-"}
                </p>
              </div>
              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusMeta.className}`}>
                {statusMeta.label}
              </span>
            </div>

            <div className="mt-3 flex flex-col gap-1 text-sm text-gray-600">
              <span>ปิดรับ {cutoffLabel}</span>
              <span className="text-xs font-medium text-gray-500">{remainingLabel}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}