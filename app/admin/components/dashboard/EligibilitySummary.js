"use client";

import { formatCurrency, formatNumber } from "@/app/utils/format";

function normalizeItems(items = []) {
  return (Array.isArray(items) ? items : []).map((item) => {
    const allocatedAmount = Number(item?.allocated_amount ?? 0);
    const usedAmount = Number(item?.used_amount ?? 0);
    const remainingBudget = Number(item?.remaining_budget ?? 0);
    const maxGrants = Number(item?.max_grants ?? 0);
    const usedGrants = Number(item?.used_grants ?? 0);
    const remainingGrants = Number(item?.remaining_grants ?? Math.max(maxGrants - usedGrants, 0));

    const usagePercent = allocatedAmount > 0
      ? Math.min((usedAmount / allocatedAmount) * 100, 999)
      : 0;

    return {
      key: `${item?.category_name || ""}-${item?.subcategory_name || ""}`,
      categoryName: item?.category_name ?? "-",
      subcategoryName: item?.subcategory_name ?? "-",
      allocatedAmount,
      usedAmount,
      remainingBudget: remainingBudget < 0 ? 0 : remainingBudget,
      maxGrants,
      usedGrants,
      remainingGrants,
      usagePercent,
    };
  });
}

export default function EligibilitySummary({ items = [] }) {
  const normalized = normalizeItems(items)
    .sort((a, b) => b.usagePercent - a.usagePercent)
    .slice(0, 6);

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
            <th className="py-2 pr-4 font-medium">หมวด / ประเภทย่อย</th>
            <th className="py-2 px-4 font-medium text-center">ใช้สิทธิ์แล้ว</th>
            <th className="py-2 px-4 font-medium text-right">งบที่ใช้ไป</th>
            <th className="py-2 pl-4 font-medium text-right">คงเหลืองบ</th>
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
                  <p className="font-semibold text-gray-900">{row.subcategoryName}</p>
                  <p className="text-xs text-gray-500">{row.categoryName}</p>
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