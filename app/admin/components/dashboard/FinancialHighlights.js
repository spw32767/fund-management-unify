"use client";

import { useMemo } from "react";
import { formatCurrency, formatNumber } from "@/app/utils/format";

const TYPE_LABELS = {
  fund_application: "ทุนวิจัย",
  publication_reward: "เงินรางวัลตีพิมพ์",
};

function normaliseFinancialData(data = {}, overview = {}) {
  const totalRequested = Number(data.total_requested ?? 0);
  const totalApproved = Number(data.total_approved ?? 0);
  const totalPending = Number(data.total_pending ?? 0);
  const totalRejected = Number(data.total_rejected ?? 0);
  const approvalRate = Number.isFinite(Number(data.approval_rate))
    ? Number(data.approval_rate)
    : Number(overview.approval_rate ?? 0);

  const totalCount = Number(data.total_count ?? overview.total_applications ?? 0);
  const approvedCount = Number(data.approved_count ?? overview.approved_count ?? 0);
  const pendingCount = Number(data.pending_count ?? overview.pending_count ?? 0);
  const rejectedCount = Number(data.rejected_count ?? overview.rejected_count ?? 0);

  const types = Object.entries(TYPE_LABELS).map(([key, label]) => {
    const entry = data[key] || {};
    const requested = Number(entry.requested ?? 0);
    const approved = Number(entry.approved ?? 0);
    const pending = Number(entry.pending ?? 0);
    const rejected = Number(entry.rejected ?? 0);
    const total = Number(entry.total_count ?? 0);
    const approvedTotal = Number(entry.approved_count ?? 0);
    const pendingTotal = Number(entry.pending_count ?? 0);
    const rejectedTotal = Number(entry.rejected_count ?? 0);
    const typeApprovalRate = Number.isFinite(Number(entry.approval_rate))
      ? Number(entry.approval_rate)
      : total > 0
        ? (approvedTotal / total) * 100
        : 0;

    return {
      key,
      label,
      requested,
      approved,
      pending,
      rejected,
      total,
      approvedTotal,
      pendingTotal,
      rejectedTotal,
      approvalRate: typeApprovalRate,
    };
  });

  const hasData = totalCount > 0 || totalRequested > 0 || totalApproved > 0;

  return {
    totals: {
      requested: totalRequested,
      approved: totalApproved,
      pending: totalPending,
      rejected: totalRejected,
      approvalRate,
      totalCount,
      approvedCount,
      pendingCount,
      rejectedCount,
      hasData,
    },
    types,
  };
}

export default function FinancialHighlights({ data = {}, overview = {} }) {
  const normalised = useMemo(
    () => normaliseFinancialData(data, overview),
    [data, overview]
  );

  if (!normalised.totals.hasData) {
    return (
      <p className="text-center text-gray-500 py-6">
        ยังไม่มีข้อมูลทางการเงินเพียงพอสำหรับการวิเคราะห์
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
            ยอดคำร้องทั้งหมด
          </p>
          <p className="mt-2 text-2xl font-semibold text-blue-700">
            {formatCurrency(normalised.totals.requested)}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            อนุมัติแล้ว {formatCurrency(normalised.totals.approved)}
          </p>
        </div>

        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">
            อัตราการอนุมัติรวม
          </p>
          <p className="mt-2 text-2xl font-semibold text-emerald-700">
            {normalised.totals.approvalRate.toFixed(1)}%
          </p>
          <p className="text-xs text-emerald-600 mt-1">
            จาก {formatNumber(normalised.totals.totalCount)} คำร้องในระบบ
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-100 text-amber-700">
          <p className="text-xs font-semibold uppercase tracking-wide">รอดำเนินการ</p>
          <p className="mt-1 text-lg font-semibold">
            {formatCurrency(normalised.totals.pending)}
          </p>
          <p className="text-xs text-amber-600">
            {formatNumber(normalised.totals.pendingCount)} รายการ
          </p>
        </div>
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-100 text-rose-700">
          <p className="text-xs font-semibold uppercase tracking-wide">ไม่อนุมัติ</p>
          <p className="mt-1 text-lg font-semibold">
            {formatCurrency(normalised.totals.rejected)}
          </p>
          <p className="text-xs text-rose-600">
            {formatNumber(normalised.totals.rejectedCount)} รายการ
          </p>
        </div>
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
          <p className="text-xs font-semibold uppercase tracking-wide">อนุมัติแล้ว</p>
          <p className="mt-1 text-lg font-semibold">
            {formatCurrency(normalised.totals.approved)}
          </p>
          <p className="text-xs text-slate-600">
            {formatNumber(normalised.totals.approvedCount)} รายการ
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {normalised.types.map((type) => (
          <div
            key={type.key}
            className="rounded-lg border border-gray-200 p-4 hover:border-blue-400 transition"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-gray-900">{type.label}</p>
                <p className="text-xs text-gray-500">
                  คำร้องทั้งหมด {formatNumber(type.total)} รายการ
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">อัตราการอนุมัติ</p>
                <p className="text-lg font-semibold text-emerald-600">
                  {Number.isFinite(type.approvalRate) ? type.approvalRate.toFixed(1) : "0.0"}%
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                <p className="text-xs text-gray-500">ยอดคำร้อง</p>
                <p className="text-base font-semibold text-gray-900">
                  {formatCurrency(type.requested)}
                </p>
              </div>
              <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                <p className="text-xs text-gray-500">ยอดอนุมัติ</p>
                <p className="text-base font-semibold text-emerald-600">
                  {formatCurrency(type.approved)}
                </p>
              </div>
              <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                <p className="text-xs text-gray-500">รอดำเนินการ</p>
                <p className="text-base font-semibold text-amber-600">
                  {formatCurrency(type.pending)}
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-600">
              <span>อนุมัติ {formatNumber(type.approvedTotal)} รายการ</span>
              <span>รอดำเนินการ {formatNumber(type.pendingTotal)} รายการ</span>
              <span>ไม่อนุมัติ {formatNumber(type.rejectedTotal)} รายการ</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}