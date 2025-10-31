"use client";

import { Fragment, useCallback, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";

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

function buildUserGroups(entries = []) {
  const groups = new Map();

  entries.forEach((entry) => {
    const key = entry.userId || entry.userName;
    if (!key) return;

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        userId: entry.userId,
        userName: entry.userName,
        rows: [],
        totals: {
          allocatedAmount: 0,
          usedAmount: 0,
          remainingBudget: 0,
          maxGrants: 0,
          usedGrants: 0,
          remainingGrants: 0,
        },
      });
    }

    const group = groups.get(key);
    group.rows.push(entry);
    group.totals.allocatedAmount += entry.allocatedAmount;
    group.totals.usedAmount += entry.usedAmount;
    group.totals.remainingBudget += entry.remainingBudget;
    group.totals.maxGrants += entry.maxGrants;
    group.totals.usedGrants += entry.usedGrants;
    group.totals.remainingGrants += entry.remainingGrants;
  });

  return Array.from(groups.values()).map((group) => ({
    ...group,
    rows: group.rows.sort((a, b) => b.usedAmount - a.usedAmount),
  }));
}

export default function EligibilitySummary({ summary = [], usageRows = [] }) {
  const normalized = useMemo(
    () => buildQuotaEntries(summary, usageRows).sort((a, b) => b.usedAmount - a.usedAmount),
    [summary, usageRows]
  );

  const userGroups = useMemo(
    () => buildUserGroups(normalized).sort((a, b) => b.totals.usedAmount - a.totals.usedAmount),
    [normalized]
  );

  const [query, setQuery] = useState("");
  const [expandedKeys, setExpandedKeys] = useState(() => new Set());

  const handleToggle = useCallback((key) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    if (!normalizedQuery) return userGroups;
    return userGroups.filter((group) =>
      (group.userName || "").toLowerCase().includes(normalizedQuery)
    );
  }, [normalizedQuery, userGroups]);

  if (!userGroups.length) {
    return (
      <p className="text-center text-gray-500 py-4">
        ยังไม่มีข้อมูลการใช้งานสิทธิ์ในปีนี้
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ค้นหาชื่อผู้ใช้..."
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <p className="text-sm text-gray-500">
          พบ {formatNumber(filteredGroups.length)} ผู้ใช้
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-500">
              <th className="py-3 pl-4 pr-2 font-medium">ผู้ใช้</th>
              <th className="py-3 px-4 font-medium">ทุนที่ใช้</th>
              <th className="py-3 px-4 text-center font-medium">จำนวนครั้งที่ใช้</th>
              <th className="py-3 px-4 text-right font-medium">งบที่ใช้ไป</th>
              <th className="py-3 pr-4 text-right font-medium">งบคงเหลือ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredGroups.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500">
                  ไม่พบผู้ใช้ที่ตรงกับคำค้นหา
                </td>
              </tr>
            ) : (
              filteredGroups.map((group) => {
                const isExpanded = expandedKeys.has(group.key);
                const totals = group.totals;
                const grantLabel = totals.maxGrants > 0
                  ? `${formatNumber(totals.usedGrants)} / ${formatNumber(totals.maxGrants)}`
                  : formatNumber(totals.usedGrants);
                const usagePercent = totals.allocatedAmount > 0
                  ? Math.min((totals.usedAmount / totals.allocatedAmount) * 100, 999)
                  : 0;

                return (
                  <Fragment key={group.key}>
                    <tr className="text-gray-700 transition hover:bg-gray-50">
                      <td className="py-3 pl-4 pr-2">
                        <button
                          type="button"
                          onClick={() => handleToggle(group.key)}
                          className="mr-3 inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-500 hover:border-blue-500 hover:text-blue-600"
                          aria-expanded={isExpanded}
                          aria-label={isExpanded ? "ย่อรายละเอียด" : "ขยายรายละเอียด"}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                        <div>
                          <p className="font-semibold text-gray-900">{group.userName}</p>
                          <p className="text-xs text-gray-500">ใช้สิทธิ์ {formatNumber(group.rows.length)} ทุน</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-gray-900">รวม {formatNumber(group.rows.length)} ทุน</span>
                          <span className="text-xs text-gray-500">สิทธิ์รวม {formatCurrency(totals.allocatedAmount)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-semibold text-blue-600">{grantLabel}</span>
                          <span className="text-xs text-gray-500">{formatNumber(totals.remainingGrants)} สิทธิ์คงเหลือ</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-semibold text-emerald-600">{formatCurrency(totals.usedAmount)}</span>
                          <div className="h-2 w-28 overflow-hidden rounded-full bg-gray-200">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                              style={{ width: `${Math.min(usagePercent, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{usagePercent.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-right text-gray-700">
                        <span className="font-semibold">{formatCurrency(totals.remainingBudget)}</span>
                        <p className="text-xs text-gray-500">งบประมาณคงเหลือ</p>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={5} className="bg-gray-50 px-6 pb-5">
                          <div className="mt-4 space-y-4">
                            {group.rows.map((row) => {
                              const detailGrantLabel = row.maxGrants > 0
                                ? `${formatNumber(row.usedGrants)} / ${formatNumber(row.maxGrants)}`
                                : formatNumber(row.usedGrants);

                              return (
                                <div
                                  key={row.key}
                                  className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                                >
                                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                      <p className="font-medium text-gray-900">{row.subcategoryName}</p>
                                      <p className="text-xs text-gray-500">{row.categoryName}</p>
                                    </div>
                                    <div className="flex flex-col gap-3 text-right sm:flex-row sm:items-center sm:gap-6">
                                      <div>
                                        <p className="font-semibold text-blue-600">{detailGrantLabel}</p>
                                        <p className="text-xs text-gray-500">ใช้สิทธิ์</p>
                                      </div>
                                      <div>
                                        <p className="font-semibold text-gray-900">{formatCurrency(row.allocatedAmount)}</p>
                                        <p className="text-xs text-gray-500">สิทธิ์รวม</p>
                                      </div>
                                      <div>
                                        <p className="font-semibold text-emerald-600">{formatCurrency(row.usedAmount)}</p>
                                        <p className="text-xs text-gray-500">งบที่ใช้ไป</p>
                                      </div>
                                      <div>
                                        <p className="font-semibold text-gray-700">{formatCurrency(row.remainingBudget)}</p>
                                        <p className="text-xs text-gray-500">งบคงเหลือ</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
