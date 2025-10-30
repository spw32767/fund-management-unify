"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { BarChart3, TrendingUp } from "lucide-react";

import { formatCurrency, formatNumber, formatThaiMonthShort } from "@/app/utils/format";

const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const MODE_CONFIG = {
  monthly: {
    label: "รายเดือน",
    description: "ข้อมูลย้อนหลัง 12 เดือนตามช่วงที่เลือก",
    optionLabel: "รายเดือน (12 เดือน)",
    limit: 12,
  },
  yearly: {
    label: "รายปี",
    description: "สรุปคำร้องแต่ละปี",
    optionLabel: "รายปี",
  },
  quarterly: {
    label: "รายไตรมาส",
    description: "ภาพรวมตามไตรมาส",
    optionLabel: "รายไตรมาส",
  },
  installment: {
    label: "ตามรอบการพิจารณา",
    description: "การยื่นและอนุมัติในแต่ละรอบทุน",
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
    const thaiYear = rawYear >= 2400 ? rawYear : rawYear + 543;
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

function buildChartConfig(dataset) {
  const categories = dataset.map((item) => item.label);
  const fundSeries = dataset.map((item) => item.fundTotal);
  const rewardSeries = dataset.map((item) => item.rewardTotal);
  const approvedSeries = dataset.map((item) => item.approved);

  const options = {
    chart: {
      type: "line",
      stacked: false,
      toolbar: { show: false },
      animations: { easing: "easeinout" },
    },
    stroke: {
      width: [0, 0, 3],
      curve: "smooth",
    },
    plotOptions: {
      bar: {
        columnWidth: "45%",
        borderRadius: 6,
      },
    },
    dataLabels: {
      enabled: false,
    },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: {
          colors: "#6b7280",
          fontSize: "12px",
        },
        rotateAlways: categories.some((label) => label.length > 18),
      },
    },
    yaxis: [
      {
        title: {
          text: "จำนวนคำร้อง",
          style: { color: "#1f2937" },
        },
        labels: {
          style: { colors: "#6b7280" },
        },
        min: 0,
        forceNiceScale: true,
      },
      {
        opposite: true,
        title: {
          text: "จำนวนที่อนุมัติ",
          style: { color: "#047857" },
        },
        labels: {
          style: { colors: "#6b7280" },
        },
        min: 0,
        forceNiceScale: true,
      },
    ],
    legend: {
      position: "top",
      horizontalAlign: "left",
      fontSize: "12px",
      labels: {
        colors: "#374151",
      },
    },
    colors: ["#2563eb", "#10b981", "#f97316"],
    tooltip: {
      shared: true,
      intersect: false,
      y: {
        formatter(value, { seriesIndex, dataPointIndex }) {
          const point = dataset[dataPointIndex];
          if (seriesIndex === 0) {
            return `ทุนวิจัย: ${formatNumber(value)} รายการ`;
          }
          if (seriesIndex === 1) {
            return `เงินรางวัลตีพิมพ์: ${formatNumber(value)} รายการ`;
          }
          const approvalAmount = point?.totalApprovedAmount ?? 0;
          return `อนุมัติแล้ว: ${formatNumber(value)} รายการ (ยอดเงิน ${formatCurrency(approvalAmount)})`;
        },
      },
    },
    grid: {
      borderColor: "#e5e7eb",
      strokeDashArray: 4,
    },
  };

  const series = [
    {
      name: "ทุนวิจัย",
      type: "column",
      data: fundSeries,
    },
    {
      name: "เงินรางวัลตีพิมพ์",
      type: "column",
      data: rewardSeries,
    },
    {
      name: "อนุมัติแล้ว",
      type: "line",
      data: approvedSeries,
      yAxisIndex: 1,
    },
  ];

  return { options, series };
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

  const normalizedData = useMemo(
    () => normaliseDataset(breakdown?.[mode] ?? breakdown?.monthly ?? [], mode),
    [breakdown, mode]
  );

  const chartConfig = useMemo(() => buildChartConfig(normalizedData), [normalizedData]);

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex items-center gap-2 text-gray-600">
          <TrendingUp size={20} />
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
                  {MODE_CONFIG[key]?.optionLabel || key}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="w-full">
        <ApexChart
          options={chartConfig.options}
          series={chartConfig.series}
          type="line"
          height={340}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">คำร้องทั้งหมด</p>
          <p className="mt-2 text-xl font-semibold text-blue-700">{formatNumber(totals.applications)}</p>
          <p className="text-xs text-blue-600 mt-1">ทุนวิจัย {formatNumber(totals.fundTotal)} / เงินรางวัลตีพิมพ์ {formatNumber(totals.rewardTotal)}</p>
        </div>
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">อนุมัติแล้ว</p>
          <p className="mt-2 text-xl font-semibold text-emerald-700">{formatNumber(totals.approved)}</p>
          <p className="text-xs text-emerald-600 mt-1">อัตรา {approvalRate}%</p>
        </div>
        <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">ยอดคำร้องทั้งหมด</p>
          <p className="mt-2 text-xl font-semibold text-amber-700">{formatCurrency(totals.totalRequested)}</p>
          <p className="text-xs text-amber-600 mt-1">รวมคำร้องที่ยื่น</p>
        </div>
        <div className="rounded-lg border border-purple-100 bg-purple-50 p-4">
          <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide">ยอดอนุมัติ</p>
          <p className="mt-2 text-xl font-semibold text-purple-700">{formatCurrency(totals.totalApprovedAmount)}</p>
          <p className="text-xs text-purple-600 mt-1">รวมวงเงินที่อนุมัติแล้ว</p>
        </div>
      </div>
    </div>
  );
}