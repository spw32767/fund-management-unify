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
    const userId = Number(item?.user_id ?? 0);
    const rawUserName = typeof item?.user_name === "string" ? item.user_name.trim() : "";
    const userName = rawUserName || (userId ? `ผู้ใช้ #${userId}` : "ไม่ระบุชื่อ");
    const yearValue = item?.year ? String(item.year) : "";

    const usagePercent = allocatedAmount > 0
      ? Math.min((usedAmount / allocatedAmount) * 100, 999)
      : 0;

    return {
      key: `${userId || userName}-${item?.subcategory_id ?? item?.subcategory_name ?? item?.category_name ?? ""}-${yearValue}`,
      categoryName: item?.category_name ?? "-",
      subcategoryName: item?.subcategory_name ?? "-",
      allocatedAmount,
      usedAmount,
      remainingBudget: remainingBudget < 0 ? 0 : remainingBudget,
      maxGrants,
      usedGrants,
      remainingGrants,
      usagePercent,
      userId,
      userName,
      year: yearValue,
    };
  });
}

export default function EligibilitySummary({ items = [] }) {
  const normalized = normalizeItems(items)
    .sort((a, b) => {
      if (b.usedAmount === a.usedAmount) {
        return b.usedGrants - a.usedGrants;
      }
      return b.usedAmount - a.usedAmount;
    })
    .slice(0, 10);

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
            <th className="py-2 px-4 font-medium text-center">ใช้สิทธิ์แล้ว</th>
            <th className="py-2 px-4 font-medium text-right">งบที่ใช้ไป</th>
            <th className="py-2 pl-4 font-medium text-right">คงเหลืองบ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {normalized.map((row) => {
            const grantLabel = row.maxGrants > 0
              ? `${formatNumber(row.usedGrants)} / ${formatNumber(row.maxGrants)} ครั้ง`
              : `${formatNumber(row.usedGrants)} ครั้ง`;

            return (
              <tr key={row.key} className="text-gray-700">
                <td className="py-3 pr-4 align-top">
                  <p className="font-semibold text-gray-900">{row.userName}</p>
                  {row.year && (
                    <p className="text-xs text-gray-500">ปีงบประมาณ {row.year}</p>
                  )}
                </td>
                <td className="py-3 px-4 align-top">
                  <p className="font-semibold text-gray-900">{row.subcategoryName}</p>
                  <p className="text-xs text-gray-500">{row.categoryName}</p>
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-semibold text-blue-600">{grantLabel}</span>
                    {row.maxGrants > 0 ? (
                      <span className="text-xs text-gray-500">
                        เหลือ {formatNumber(row.remainingGrants)} สิทธิ์
                      </span>
                    ) : row.remainingGrants > 0 ? (
                      <span className="text-xs text-gray-500">
                        เหลือ {formatNumber(row.remainingGrants)} ครั้ง
                      </span>
                    ) : null}
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