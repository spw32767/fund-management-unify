"use client";

import { formatCurrency, formatNumber } from "@/app/utils/format";

function parseNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function parseInteger(value) {
  const numeric = parseNumber(value);
  return Number.isFinite(numeric) ? Math.trunc(numeric) : 0;
}

function buildQuotaEntries(summary = [], usageRows = []) {
  const entries = new Map();

  const normalize = (item) => {
    if (!item) return null;

    const yearId = parseInteger(item.year_id ?? item.yearId);
    const subcategoryId = parseInteger(item.subcategory_id ?? item.subcategoryId);
    const userId = parseInteger(item.user_id ?? item.userId);

    const categoryName = item.category_name ?? item.categoryName ?? "-";
    const subcategoryName = item.subcategory_name ?? item.subcategoryName ?? "-";
    const userName = item.user_name ?? item.userName ?? "-";

    const allocatedAmount = parseNumber(item.allocated_amount ?? item.allocatedAmount ?? item.max_amount_per_year ?? 0);
    const usedAmount = parseNumber(item.used_amount ?? item.usedAmount);
    const remainingBudgetRaw = item.remaining_budget ?? item.remainingBudget;
    const remainingBudget = remainingBudgetRaw !== undefined
      ? parseNumber(remainingBudgetRaw)
      : allocatedAmount - usedAmount;

    const maxGrants = parseNumber(item.max_grants ?? item.maxGrants);
    const usedGrants = parseNumber(item.used_grants ?? item.usedGrants);
    const remainingGrantsRaw = item.remaining_grants ?? item.remainingGrants;
    const remainingGrants = remainingGrantsRaw !== undefined
      ? parseNumber(remainingGrantsRaw)
      : Math.max(maxGrants - usedGrants, 0);

    const usagePercent = allocatedAmount > 0
      ? Math.min((usedAmount / allocatedAmount) * 100, 999)
      : 0;

    const keyParts = [yearId || "all", subcategoryId || subcategoryName || "-", userId || userName || "-"];

    return {
      key: keyParts.join(":"),
      yearId,
      subcategoryId,
      userId,
      categoryName,
      subcategoryName,
      userName,
      allocatedAmount,
      usedAmount,
      remainingBudget: remainingBudget < 0 ? 0 : remainingBudget,
      maxGrants,
      usedGrants,
      remainingGrants,
      usagePercent,
    };
  };

  const usageList = Array.isArray(usageRows) ? usageRows : [];
  usageList.forEach((item) => {
    const normalized = normalize(item);
    if (normalized) {
      entries.set(normalized.key, normalized);
    }
  });

  const summaryList = Array.isArray(summary) ? summary : [];
  summaryList.forEach((item) => {
    const normalized = normalize(item);
    if (!normalized) return;

    const existing = entries.get(normalized.key);
    if (existing) {
      entries.set(normalized.key, {
        ...existing,
        ...normalized,
        usedGrants: Math.max(existing.usedGrants, normalized.usedGrants),
        usedAmount: Math.max(existing.usedAmount, normalized.usedAmount),
        remainingGrants: Math.min(existing.remainingGrants, normalized.remainingGrants),
        remainingBudget: Math.min(existing.remainingBudget, normalized.remainingBudget),
      });
    } else {
      entries.set(normalized.key, normalized);
    }
  });

  return Array.from(entries.values());
}

export default function EligibilitySummary({ summary = [], usageRows = [] }) {
  const normalized = buildQuotaEntries(summary, usageRows)
    .sort((a, b) => b.usedAmount - a.usedAmount);

  if (!normalized.length) {
    return (
      <p className="text-center text-gray-500 py-4">
        ยังไม่มีข้อมูลการใช้งานสิทธิ์ในปีนี้
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500">
            <th className="py-2 pr-4 font-medium">ผู้ใช้</th>
            <th className="py-2 px-4 font-medium">ทุนที่ใช้</th>
            <th className="py-2 px-4 font-medium text-center">จำนวนครั้งที่ใช้</th>
            <th className="py-2 px-4 font-medium text-right">งบที่ใช้ไป</th>
            <th className="py-2 pl-4 font-medium text-right">งบคงเหลือ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {normalized.map((row) => {
            const grantLabel = row.maxGrants > 0
              ? `${formatNumber(row.usedGrants)} / ${formatNumber(row.maxGrants)}`
              : formatNumber(row.usedGrants);

            return (
              <tr key={row.key} className="text-gray-700">
                <td className="py-3 pr-4 align-top">
                  <p className="font-semibold text-gray-900">{row.userName}</p>
                  <p className="text-xs text-gray-500">{row.categoryName}</p>
                </td>
                <td className="py-3 px-4 align-top">
                  <p className="font-semibold text-gray-900">{row.subcategoryName}</p>
                  <p className="text-xs text-gray-500">{formatCurrency(row.allocatedAmount)} สิทธิ์รวม</p>
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-semibold text-blue-600">{grantLabel}</span>
                    <span className="text-xs text-gray-500">{formatNumber(row.remainingGrants)} สิทธิ์คงเหลือ</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-semibold text-emerald-600">{formatCurrency(row.usedAmount)}</span>
                    <div className="w-28 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                        style={{ width: `${Math.min(row.usagePercent, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">{row.usagePercent.toFixed(1)}%</span>
                  </div>
                </td>
                <td className="py-3 pl-4 text-right text-gray-600">
                  <span className="font-semibold">{formatCurrency(row.remainingBudget)}</span>
                  <p className="text-xs text-gray-500">งบประมาณคงเหลือ</p>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}