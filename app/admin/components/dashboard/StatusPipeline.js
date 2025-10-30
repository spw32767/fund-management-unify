"use client";

import { useEffect, useMemo, useState } from "react";
import { formatNumber } from "@/app/utils/format";

const STAGE_DEFINITIONS = [
  {
    key: "draft",
    label: "ร่างคำร้อง",
    description: "ยังไม่ส่งเข้าสู่ระบบ",
    gradient: "from-slate-400 to-slate-500",
  },
  {
    key: "dept_review",
    label: "รอหัวหน้าสาขา",
    description: "รอการพิจารณาจากหัวหน้าสาขา",
    gradient: "from-amber-400 to-orange-500",
  },
  {
    key: "admin_review",
    label: "รอผู้ดูแล",
    description: "รอผู้ดูแลตรวจสอบ",
    gradient: "from-sky-400 to-blue-600",
  },
  {
    key: "needs_revision",
    label: "ขอข้อมูลเพิ่มเติม",
    description: "แจ้งให้ผู้ยื่นแก้ไขข้อมูล",
    gradient: "from-fuchsia-400 to-pink-500",
  },
  {
    key: "approved",
    label: "อนุมัติแล้ว",
    description: "ผ่านการอนุมัติเรียบร้อย",
    gradient: "from-emerald-400 to-green-600",
  },
  {
    key: "rejected",
    label: "ไม่อนุมัติ",
    description: "ถูกปฏิเสธ",
    gradient: "from-rose-400 to-red-600",
  },
  {
    key: "closed",
    label: "ปิดคำร้อง",
    description: "ดำเนินการเสร็จสิ้น",
    gradient: "from-gray-500 to-gray-700",
  },
];

const TYPE_OPTIONS = [
  { key: "overall", label: "ทั้งหมด" },
  { key: "fund_application", label: "ทุนวิจัย" },
  { key: "publication_reward", label: "เงินรางวัลตีพิมพ์" },
];

const OTHER_STAGE = {
  key: "other",
  label: "สถานะอื่น ๆ",
  description: "สถานะที่ไม่ได้อยู่ในขั้นตอนหลัก",
  gradient: "from-gray-400 to-gray-500",
};

function normalizeBreakdown(rawBreakdown = {}) {
  const safeBreakdown = typeof rawBreakdown === "object" && rawBreakdown !== null
    ? rawBreakdown
    : {};

  const typeKeys = new Set([
    ...Object.keys(safeBreakdown),
    ...TYPE_OPTIONS.map((option) => option.key),
  ]);

  const result = {};

  typeKeys.forEach((typeKey) => {
    const entry = safeBreakdown[typeKey] || {};
    const stageArray = Array.isArray(entry.stages) ? entry.stages : [];
    const stageMap = new Map(
      stageArray.map((stage) => [stage.stage || stage.key, stage])
    );

    const stagesWithCounts = STAGE_DEFINITIONS.map((definition) => {
      const data = stageMap.get(definition.key) || {};
      const count = Number(data.count ?? 0);
      const percentage = Number.isFinite(Number(data.percentage))
        ? Number(data.percentage)
        : 0;

      return {
        ...definition,
        label: data.label || definition.label,
        count,
        percentage,
      };
    });

    let total = Number(entry.total ?? 0);
    if (!Number.isFinite(total) || total <= 0) {
      total = stagesWithCounts.reduce((sum, stage) => sum + stage.count, 0);
    }

    const normalizedStages = stagesWithCounts.map((stage) => {
      const percentage = total > 0
        ? (stage.count / total) * 100
        : stage.percentage;
      return {
        ...stage,
        percentage: Number.isFinite(percentage) ? percentage : 0,
      };
    });

    const otherStage = stageArray.find((stage) => (stage.stage || stage.key) === OTHER_STAGE.key);
    if (otherStage && Number(otherStage.count ?? 0) > 0) {
      const otherCount = Number(otherStage.count ?? 0);
      const otherPercentage = total > 0
        ? (otherCount / total) * 100
        : Number(otherStage.percentage ?? 0);
      normalizedStages.push({
        ...OTHER_STAGE,
        label: otherStage.label || OTHER_STAGE.label,
        count: otherCount,
        percentage: Number.isFinite(otherPercentage) ? otherPercentage : 0,
      });
    }

    result[typeKey] = {
      total,
      stages: normalizedStages,
    };
  });

  return result;
}

export default function StatusPipeline({ breakdown = {} }) {
  const normalized = useMemo(() => normalizeBreakdown(breakdown), [breakdown]);

  const availableTypes = useMemo(() => {
    return TYPE_OPTIONS.filter(({ key }) => {
      const entry = normalized[key];
      if (!entry) return false;
      if (entry.total > 0) return true;
      return entry.stages?.some((stage) => Number(stage.count ?? 0) > 0);
    });
  }, [normalized]);

  const defaultType = availableTypes[0]?.key || TYPE_OPTIONS[0].key;
  const [activeType, setActiveType] = useState(defaultType);

  useEffect(() => {
    if (!availableTypes.some((option) => option.key === activeType)) {
      setActiveType(availableTypes[0]?.key || defaultType);
    }
  }, [activeType, availableTypes, defaultType]);

  if (!availableTypes.length) {
    return (
      <p className="text-center text-gray-500 py-6">
        ไม่มีข้อมูลสถานะคำร้องในช่วงเวลานี้
      </p>
    );
  }

  const activeData = normalized[activeType] || { total: 0, stages: [] };
  const approvalStage = activeData.stages.find((stage) => stage.key === "approved");
  const approvalRate = approvalStage ? Number(approvalStage.percentage ?? 0) : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">ประเภทคำร้อง</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {availableTypes.map((option) => {
              const isActive = option.key === activeType;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setActiveType(option.key)}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    isActive
                      ? "border-blue-600 bg-blue-50 text-blue-600"
                      : "border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="text-right">
          <p className="text-sm text-gray-500">คำร้องทั้งหมด</p>
          <p className="text-2xl font-semibold text-gray-900">
            {formatNumber(activeData.total)}
          </p>
          <p className="text-xs text-emerald-600 mt-1">
            อัตราการอนุมัติ {Number.isFinite(approvalRate) ? approvalRate.toFixed(1) : "0.0"}%
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {activeData.stages.map((stage) => {
          const percentage = Number.isFinite(stage.percentage) ? stage.percentage : 0;
          return (
            <div key={stage.key} className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-800">{stage.label}</span>
                  {stage.description && (
                    <span className="text-xs text-gray-500">{stage.description}</span>
                  )}
                </div>
                <span className="text-sm text-gray-600">
                  {formatNumber(stage.count)} ({percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${stage.gradient}`}
                  style={{ width: `${Math.min(Math.max(percentage, 0), 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}