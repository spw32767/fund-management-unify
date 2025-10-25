"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, TrendingUp } from "lucide-react";

import { formatCurrency, formatNumber, formatThaiMonthShort } from "@/app/utils/format";

const MODE_CONFIG = {
  monthly: {
    label: "รายเดือน",
    description: "ข้อมูลย้อนหลัง 12 เดือน",
    optionLabel: "รายเดือน (12 เดือน)",
    limit: 12,
  },
  yearly: {
    label: "รายปี",
    description: "สรุปคำร้อง 5 ปีล่าสุด",
    optionLabel: "รายปี",
  },
  quarterly: {
    label: "รายไตรมาส",
    description: "ข้อมูลย้อนหลัง 8 ไตรมาส",
    optionLabel: "รายไตรมาส",
  },
  installment: {
    label: "ตามรอบการพิจารณา",
    description: "รอบตัดสินทุนของปีปัจจุบัน",
    optionLabel: "รอบการพิจารณา",
  },
};

function deriveLabel(item, mode) {
  if (!item) return "-";

  if (mode === "monthly") {
    const period = item?.period ?? item?.month ?? "";
    if (!period) return "-";
    return formatThaiMonthShort(period, { includeYear: true });
  }

  if (mode === "yearly") {
    const rawYear = Number(item?.year ?? item?.period ?? 0);
    if (!rawYear) return String(item?.year ?? item?.period ?? "-");
    const thaiYear = rawYear + 543;
    return `พ.ศ. ${thaiYear}`;
  }

  if (mode === "quarterly") {
    const rawYear = Number(item?.year ?? item?.period?.year ?? 0);
    const quarter = Number(item?.quarter ?? item?.period?.quarter ?? 0);
    const thaiYear = rawYear ? rawYear + 543 : null;
    if (!quarter) {
      return thaiYear ? `พ.ศ. ${thaiYear}` : "ไม่ระบุ";
    }
    return thaiYear
      ? `ไตรมาส ${quarter} / ${thaiYear}`
      : `ไตรมาส ${quarter}`;
  }

  if (mode === "installment") {
    if (item?.period_label) {
      return `${item.period_label}${item?.year ? ` / ${item.year}` : ""}`;
    }
    const thaiYear = item?.year ? item.year : null;
    const roundLabel = item?.installment ? `รอบที่ ${item.installment}` : "ไม่ระบุรอบ";
    return thaiYear ? `${roundLabel} / ${thaiYear}` : roundLabel;
  }

  return String(item?.period ?? "-");
}

function normaliseDataset(rawData = [], mode = "monthly") {
  const dataset = Array.isArray(rawData) ? rawData : [];
  const config = MODE_CONFIG[mode] || {};
  const limit = typeof config.limit === "number" ? config.limit : dataset.length;
  const trimmed = limit > 0 ? dataset.slice(-limit) : dataset;

  return trimmed.map((item) => {
    const applications = Number(item?.total_applications ?? item?.applications ?? 0);
    const approved = Number(item?.approved ?? 0);
    const fundTotal = Number(item?.fund_total ?? 0);
    const rewardTotal = Number(item?.reward_total ?? 0);
    const fundApproved = Number(item?.fund_approved ?? 0);
    const rewardApproved = Number(item?.reward_approved ?? 0);
    const totalRequested = Number(item?.total_requested ?? 0);
    const totalApprovedAmount = Number(item?.total_approved ?? 0);

    return {
      label: deriveLabel(item, mode),
      applications,
      approved,
      fundTotal,
      rewardTotal,
      fundApproved,
      rewardApproved,
      totalRequested,
      totalApprovedAmount,
    };
  });
}

export default function MonthlyChart({ breakdown = {}, defaultMode = "monthly" }) {
  const availableModes = useMemo(() => {
    return Object.entries(MODE_CONFIG)
      .filter(([key]) => Array.isArray(breakdown?.[key]) && breakdown[key].length > 0)
      .map(([key]) => key);
  }, [breakdown]);

  const initialMode = useMemo(() => {
    if (availableModes.includes(defaultMode)) return defaultMode;
    return availableModes[0] ?? "monthly";
  }, [availableModes, defaultMode]);

  const [mode, setMode] = useState(() => initialMode);

  useEffect(() => {
    if (!availableModes.length) return;
    if (!availableModes.includes(mode)) {
      setMode(availableModes[0]);
    }
  }, [availableModes, mode]);

  useEffect(() => {
    if (!availableModes.length) return;
    if (availableModes.includes(initialMode)) {
      setMode(initialMode);
    }
  }, [initialMode, availableModes]);

  const normalizedData = useMemo(
    () => normaliseDataset(breakdown?.[mode] ?? breakdown?.monthly ?? [], mode),
    [breakdown, mode]
  );

  const maxValue = normalizedData.length > 0
    ? Math.max(...normalizedData.map((d) => d.applications))
    : 0;
  const scale = maxValue > 0 ? 220 / maxValue : 1;

  const totals = useMemo(() => {
    return normalizedData.reduce(
      (acc, item) => ({
        applications: acc.applications + item.applications,
        approved: acc.approved + item.approved,
        fundTotal: acc.fundTotal + item.fundTotal,
        rewardTotal: acc.rewardTotal + item.rewardTotal,
        totalRequested: acc.totalRequested + item.totalRequested,
        totalApprovedAmount: acc.totalApprovedAmount + item.totalApprovedAmount,
      }),
      {
        applications: 0,
        approved: 0,
        fundTotal: 0,
        rewardTotal: 0,
        totalRequested: 0,
        totalApprovedAmount: 0,
      }
    );
  }, [normalizedData]);

  const approvalRate = totals.applications > 0
    ? ((totals.approved / totals.applications) * 100).toFixed(1)
    : 0;

  const chartDescription = MODE_CONFIG[mode]?.description ?? "";
  const chartLabel = MODE_CONFIG[mode]?.label ?? "รายเดือน";

  if (!normalizedData.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <BarChart3 size={36} className="mb-3 text-gray-400" />
        <p className="font-medium">ไม่มีข้อมูลสำหรับการแสดงผล</p>
        <p className="text-sm">ลองเลือกช่วงเวลาอื่นหรือรีเฟรชข้อมูลอีกครั้ง</p>
      </div>
    );
  }

  const showScrollbar = normalizedData.length > 8;

  return (
    <div className="flex flex-col gap-6">
      {/* Chart Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex items-center gap-2 text-gray-600">
          <BarChart3 size={20} />
          <div className="flex flex-col">
            <span className="text-sm font-medium">{chartLabel}</span>
            <span className="text-xs text-gray-500">{chartDescription}</span>
          </div>
        </div>

        {availableModes.length > 1 && (
          <div className="flex items-center gap-2 text-sm">
            <label htmlFor="trend-mode" className="text-gray-600">
              มุมมอง:
            </label>
            <select
              id="trend-mode"
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={mode}
              onChange={(event) => setMode(event.target.value)}
            >
              {availableModes.map((key) => (
                <option key={key} value={key}>
                  {MODE_CONFIG[key]?.optionLabel ?? MODE_CONFIG[key]?.label ?? key}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Bar Chart */}
      <div className={`relative h-64 ${showScrollbar ? "overflow-x-auto" : ""}`}>
        <div className={`absolute inset-0 flex items-end ${showScrollbar ? "min-w-[640px]" : ""} px-2 gap-3`}>
          {normalizedData.map((stat, index) => (
            <div key={`${stat.label}-${index}`} className="flex flex-col items-center flex-1 min-w-[64px]">
              {/* Values on top of bars */}
              <div className="mb-2 text-center">
                <div className="text-xs font-semibold text-gray-700">
                  {formatNumber(stat.applications)}
                </div>
                <div className="text-[11px] text-green-600">
                  ({formatNumber(stat.approved)})
                </div>
              </div>

              {/* Bars */}
              <div className="relative w-full flex flex-col items-center">
                {/* Total Applications Bar */}
                <div
                  className="w-12 bg-blue-500 rounded-t-md transition-all duration-500 hover:bg-blue-600 relative group"
                  style={{ height: `${stat.applications * scale}px` }}
                >
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[11px] rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    ยื่นคำร้อง: {formatNumber(stat.applications)}
                  </div>
                </div>

                {/* Approved Bar (overlay) */}
                <div
                  className="w-12 bg-green-500 absolute bottom-0 rounded-b-md transition-all duration-500 hover:bg-green-600 group"
                  style={{ height: `${stat.approved * scale}px` }}
                >
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[11px] rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    อนุมัติ: {formatNumber(stat.approved)}
                  </div>
                </div>
              </div>

              {/* Period Label */}
              <span className="mt-2 text-xs text-gray-600 font-medium text-center">
                {stat.label}
              </span>
            </div>
          ))}
        </div>

        {/* Y-axis grid lines */}
        <div className="absolute inset-0 flex flex-col justify-end pointer-events-none">
          {[0, 25, 50, 75, 100].map((percentage) => (
            <div
              key={percentage}
              className="border-t border-gray-200 border-dashed"
              style={{ height: `${percentage}%` }}
            >
              <span className="absolute left-0 -mt-2 text-xs text-gray-400">
                {formatNumber(Math.round((maxValue * percentage) / 100))}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-6 mt-2 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded" />
          <span>ยื่นคำร้อง</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded" />
          <span>อนุมัติ</span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">{formatNumber(totals.applications)}</p>
          <p className="text-xs text-gray-600">คำร้องทั้งหมด</p>
        </div>
        <div className="text-center sm:border-x border-gray-200">
          <p className="text-2xl font-bold text-green-600">{formatNumber(totals.approved)}</p>
          <p className="text-xs text-gray-600">อนุมัติ</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-purple-600">{approvalRate}%</p>
          <p className="text-xs text-gray-600">อัตราอนุมัติ</p>
        </div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm text-gray-600">
        <div className="flex flex-col gap-1">
          <span className="font-medium text-gray-700">จำแนกตามประเภทคำร้อง</span>
          <div className="flex items-center justify-between">
            <span>ทุนวิจัย</span>
            <span className="font-semibold text-blue-600">{formatNumber(totals.fundTotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>เงินรางวัลผลงานตีพิมพ์</span>
            <span className="font-semibold text-emerald-600">{formatNumber(totals.rewardTotal)}</span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-medium text-gray-700">ภาพรวมจำนวนเงิน (บาท)</span>
          <div className="flex items-center justify-between">
            <span>วงเงินที่ขอ</span>
            <span className="font-semibold text-blue-600">{formatCurrency(totals.totalRequested)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>วงเงินที่อนุมัติ</span>
            <span className="font-semibold text-green-600">{formatCurrency(totals.totalApprovedAmount)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-600">
        <TrendingUp size={16} className="text-green-600" />
        <span>
          อัตราอนุมัติโดยรวมอยู่ที่ <span className="font-semibold text-green-600">{approvalRate}%</span>
        </span>
      </div>
    </div>
  );
}