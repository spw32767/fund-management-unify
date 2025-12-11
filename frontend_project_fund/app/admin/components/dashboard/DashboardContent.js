"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  FileText,
  Clock,
  CircleDollarSign,
  PieChart,
  RefreshCcw,
  ShieldCheck,
  BadgeCheck,
  ListChecks,
  CalendarClock,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  Download,
} from "lucide-react";

import PageLayout from "../common/PageLayout";
import Card from "../common/Card";
import SimpleCard from "../common/SimpleCard";
import MonthlyChart from "./MonthlyChart";
import adminAPI from "../../../lib/admin_api";
import EligibilitySummary from "./EligibilitySummary";
import StatusPipeline from "./StatusPipeline";
import FinancialHighlights from "./FinancialHighlights";
import UpcomingDeadlines from "./UpcomingDeadlines";
import {
  formatCurrency,
  formatNumber,
  formatThaiDateFromBEString,
  formatThaiDateTime,
} from "@/app/utils/format";

const MAX_PENDING_DISPLAY = 5;

const SCOPE_LABELS = {
  all: "ทั้งหมด",
  current_year: "ปีปัจจุบัน",
  year: "เลือกปี",
  installment: "ตามรอบการพิจารณา",
};

function buildScopeDescription(filters, options) {
  const years = Array.isArray(options?.years) ? options.years : [];
  const yearLabel = years.find((item) => String(item.year) === String(filters?.year))?.year || filters?.year;
  switch (filters?.scope) {
    case "all":
      return "ช่วงข้อมูล: ทั้งหมด";
    case "year":
      return yearLabel ? `ช่วงข้อมูล: ปี ${yearLabel}` : "ช่วงข้อมูล: เลือกปี";
    case "installment": {
      const installment = filters?.installment ? `รอบที่ ${filters.installment}` : "ทุกช่วง";
      return yearLabel
        ? `ช่วงข้อมูล: ${installment} ของปี ${yearLabel}`
        : `ช่วงข้อมูล: ${installment}`;
    }
    case "current_year": {
      const current = options?.current_year;
      return current ? `ช่วงข้อมูล: ปีปัจจุบัน (${current})` : "ช่วงข้อมูล: ปีปัจจุบัน";
    }
    default:
      return null;
  }
}

function getInstallmentsForYear(year, options) {
  const yearKey = String(year || "");
  if (!options?.installments || !yearKey) return [];
  return Array.isArray(options.installments[yearKey]) ? options.installments[yearKey] : [];
}

function normalizeServerFilter(selected, fallback = {}) {
  if (!selected || typeof selected !== "object") {
    return null;
  }
  const scope = selected.scope || fallback.scope || "current_year";
  const normalized = { scope };
  if (selected.year) {
    normalized.year = String(selected.year);
  } else if (fallback.year) {
    normalized.year = fallback.year;
  }
  if (selected.installment !== undefined && selected.installment !== null) {
    normalized.installment = String(selected.installment);
  } else if (fallback.installment) {
    normalized.installment = fallback.installment;
  }
  return normalized;
}

function normalizeFilterForScope(filters, options) {
  const normalized = { scope: filters.scope || "current_year" };
  if (normalized.scope === "year" || normalized.scope === "installment") {
    const fallbackYear = filters.year || options?.current_year || (Array.isArray(options?.years) && options.years.length > 0 ? options.years[0].year : "");
    normalized.year = fallbackYear ? String(fallbackYear) : "";
  }
  if (normalized.scope === "installment") {
    const availableInstallments = getInstallmentsForYear(normalized.year, options);
    const firstInstallment = availableInstallments[0]?.installment;
    const targetInstallment = filters.installment || (firstInstallment !== undefined ? String(firstInstallment) : "");
    normalized.installment = targetInstallment;
  }
  return normalized;
}

function areFiltersEqual(a = {}, b = {}) {
  return (
    a.scope === b.scope &&
    String(a.year || "") === String(b.year || "") &&
    String(a.installment || "") === String(b.installment || "")
  );
}

function FilterControls({ filters, options, onScopeChange, onYearChange, onInstallmentChange, disabled }) {
  const scopes = useMemo(() => (Array.isArray(options?.scopes) ? options.scopes : []), [options]);
  const years = useMemo(() => (Array.isArray(options?.years) ? options.years : []), [options]);
  const installments = useMemo(
    () => getInstallmentsForYear(filters?.year, options),
    [filters?.year, options]
  );

  const showYearSelect = filters.scope === "year" || filters.scope === "installment";
  const showInstallmentSelect = filters.scope === "installment";

  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="w-4 h-4 text-gray-500" />
        <select
          value={filters.scope}
          onChange={onScopeChange}
          disabled={disabled}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {scopes.map((scope) => (
            <option key={scope} value={scope}>
              {SCOPE_LABELS[scope] || scope}
            </option>
          ))}
        </select>
      </div>

      {showYearSelect && (
        <select
          value={filters.year || ""}
          onChange={onYearChange}
          disabled={disabled || !years.length}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {years.map((year) => (
            <option key={year.year_id ?? year.year} value={year.year}>
              ปี {year.year}
            </option>
          ))}
        </select>
      )}

      {showInstallmentSelect && (
        <select
          value={filters.installment || ""}
          onChange={onInstallmentChange}
          disabled={disabled || !installments.length}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {installments.map((item) => (
            <option key={`${item.installment}-${item.name}`} value={item.installment}>
              {item.name || `รอบที่ ${item.installment}`}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

function OverviewCards({ overview, currentDate, scopeDescription, onNavigate }) {
  const handlePendingClick = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("adminPendingFocus", "1");
    }
    onNavigate?.("applications-list");
  }, [onNavigate]);

  const cards = useMemo(() => {
    const totalApplications = Number(overview?.total_applications ?? 0);
    const pending = Number(overview?.pending_count ?? 0);
    const totalUsers = Number(overview?.total_users ?? 0);
    const usedBudget = Number(overview?.used_budget ?? overview?.total_approved_amount ?? 0);
    const totalBudget = Number(overview?.total_budget ?? overview?.total_requested_amount ?? 0);
    const approvalRate = Number(overview?.approval_rate ?? 0);

    return [
      {
        label: "คำร้องทั้งหมด",
        value: formatNumber(totalApplications),
        icon: FileText,
        gradient: "from-sky-500 to-blue-600",
      },
      {
        label: "รอดำเนินการ",
        value: formatNumber(pending),
        icon: Clock,
        gradient: "from-amber-400 to-orange-500",
        onClick: handlePendingClick,
      },
      {
        label: "ผู้ใช้งานทั้งหมด",
        value: formatNumber(totalUsers),
        icon: Users,
        gradient: "from-fuchsia-500 to-pink-500",
      },
      {
        label: "งบที่ใช้ไป",
        value: formatCurrency(usedBudget),
        icon: CircleDollarSign,
        gradient: "from-emerald-500 to-green-600",
      },
      {
        label: "งบประมาณประจำปี",
        value: formatCurrency(totalBudget),
        icon: PieChart,
        gradient: "from-slate-500 to-gray-700",
      },
      {
        label: "อัตราการอนุมัติ",
        value: Number.isFinite(approvalRate) ? `${approvalRate.toFixed(1)}%` : "-",
        icon: BadgeCheck,
        gradient: "from-indigo-500 to-purple-600",
      },
    ];
  }, [overview, onNavigate]);

  return (
    <div className="space-y-4">
      {(currentDate || scopeDescription) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-gray-600">
          {currentDate && (
            <span>
              อัปเดตล่าสุด: <span className="font-medium text-gray-800">{currentDate}</span>
            </span>
          )}
          {scopeDescription && (
            <span className="text-xs sm:text-sm text-gray-500">{scopeDescription}</span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
        {cards.map((card) => {
          const CardWrapper = card.onClick ? "button" : "div";
          return (
            <CardWrapper
              key={card.label}
              onClick={card.onClick}
              className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${card.gradient} text-white p-5 shadow-lg transition transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-white/60 ${card.onClick ? "cursor-pointer" : ""}`}
              type={card.onClick ? "button" : undefined}
            >
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold">{card.value}</div>
                  <card.icon className="w-10 h-10 opacity-80" />
                </div>
                <p className="mt-3 text-sm text-white/90">{card.label}</p>
              </div>

              <div className="absolute inset-0 opacity-20">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.6),_transparent)]" />
              </div>
            </CardWrapper>
          );
        })}
      </div>
    </div>
  );
}

function CategoryBudgetTable({ categories = [] }) {
  const [expanded, setExpanded] = useState({});

  if (!categories.length) {
    return <p className="text-center text-gray-500 py-4">ไม่มีข้อมูลการใช้งบประมาณตามหมวดหมู่</p>;
  }

  const toggle = (key) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-4">
      {categories.map((category) => {
        const key = `${category.category_id}-${category.year}`;
        const usedAmount = Number(category?.used_amount ?? category?.approved_amount ?? 0);
        const allocated = Number(category?.allocated_budget ?? 0);
        const remaining = Number(category?.remaining_budget ?? Math.max(allocated - usedAmount, 0));
        const totalApplications = Number(category?.total_applications ?? 0);
        const approvedApplications = Number(category?.approved_applications ?? 0);
        const utilization = allocated > 0 ? Math.min((usedAmount / allocated) * 100, 999) : 0;
        const subcategories = Array.isArray(category?.subcategories) ? category.subcategories : [];
        const isExpanded = !!expanded[key];

        return (
          <div
            key={key}
            className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden"
          >
            <button
              type="button"
              onClick={() => toggle(key)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50 transition"
            >
              <div>
                <p className="text-base font-semibold text-gray-900">{category.category_name}</p>
                <p className="text-xs text-gray-500">ปีงบประมาณ {category.year}</p>
              </div>
              <div className="flex items-center gap-6 text-sm text-gray-600">
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatNumber(totalApplications)}</p>
                  <p className="text-xs text-gray-500">คำร้องทั้งหมด</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-emerald-600">{formatCurrency(usedAmount)}</p>
                  <p className="text-xs text-gray-500">ใช้ไป</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-700">{formatCurrency(allocated)}</p>
                  <p className="text-xs text-gray-500">งบที่จัดสรร</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-700">{utilization.toFixed(1)}%</p>
                  <p className="text-xs text-gray-500">การใช้จ่าย</p>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
              </div>
            </button>

            <div className="px-4 pb-4">
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>อนุมัติแล้ว {formatNumber(approvedApplications)} รายการ</span>
                <span>คงเหลืองบ {formatCurrency(remaining)}</span>
              </div>

              <div className="mt-3 w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                  style={{ width: `${Math.min(utilization, 100)}%` }}
                />
              </div>
            </div>

            {isExpanded && subcategories.length > 0 && (
              <div className="border-t border-gray-100 bg-gray-50">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="py-2 pl-4 pr-3 font-medium">ทุนย่อย</th>
                      <th className="py-2 px-3 font-medium text-center">คำร้องทั้งหมด</th>
                      <th className="py-2 px-3 font-medium text-right">อนุมัติแล้ว</th>
                      <th className="py-2 px-3 font-medium text-right">งบที่จัดสรร</th>
                      <th className="py-2 px-4 font-medium text-right">ใช้ไป</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {subcategories.map((item) => {
                      const subAllocated = Number(item?.allocated_amount ?? 0);
                      const subUsed = Number(item?.used_amount ?? item?.approved_amount ?? 0);
                      return (
                        <tr key={item.subcategory_id} className="text-gray-700">
                          <td className="py-2 pl-4 pr-3">
                            <p className="font-medium text-gray-900">{item.subcategory_name || "-"}</p>
                            <p className="text-xs text-gray-500">
                              เหลือสิทธิ์ {formatNumber(item.remaining_grant ?? 0)} / {formatNumber(item.max_grants ?? 0)}
                            </p>
                          </td>
                          <td className="py-2 px-3 text-center">{formatNumber(item.total_applications ?? 0)}</td>
                          <td className="py-2 px-3 text-right text-emerald-600">{formatNumber(item.approved_applications ?? 0)}</td>
                          <td className="py-2 px-3 text-right">{formatCurrency(subAllocated)}</td>
                          <td className="py-2 px-4 text-right text-blue-600">{formatCurrency(subUsed)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PendingApplicationsList({ applications = [] }) {
  if (!applications.length) {
    return <p className="text-center text-gray-500 py-6">ไม่มีคำร้องที่รอดำเนินการ</p>;
  }

  return (
    <div className="space-y-4">
      {applications.slice(0, MAX_PENDING_DISPLAY).map((app) => {
        const amount = formatCurrency(app?.requested_amount ?? app?.amount ?? 0);
        const submittedAt = formatThaiDateTime(app?.submitted_at);
        const key = app?.application_id ?? app?.submission_id ?? app?.application_number ?? submittedAt;

        return (
          <div
            key={key}
            className="border border-gray-200 rounded-lg p-4 hover:border-blue-400 transition-colors"
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-900">
                  {app?.project_title || app?.title || "-"}
                </p>
                <p className="text-xs text-gray-500">เลขที่คำร้อง: {app?.application_number || "-"}</p>
                {app?.category_name && (
                  <p className="text-xs text-gray-500 mt-1">หมวด: {app.category_name}</p>
                )}
              </div>
              <div className="text-xs text-gray-500 whitespace-nowrap">{submittedAt}</div>
            </div>

            <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-gray-600">
              <div>
                <p className="font-medium text-gray-700">{app?.applicant_name || "ไม่ระบุผู้ยื่น"}</p>
                {app?.subcategory_name && (
                  <p className="text-xs text-gray-500">{app.subcategory_name}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-blue-600">{amount}</p>
                <p className="text-xs text-gray-500">วงเงินที่ขอ</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-lg">
      <p className="font-semibold mb-2">เกิดข้อผิดพลาดในการโหลดข้อมูลแดชบอร์ด</p>
      <p className="text-sm mb-4">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-lg bg-red-600 text-white px-4 py-2 text-sm hover:bg-red-700 transition"
      >
        <RefreshCcw className="w-4 h-4" />
        ลองอีกครั้ง
      </button>
    </div>
  );
}

export default function DashboardContent({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filters, setFilters] = useState({ scope: "current_year", year: "", installment: "" });
  const filtersRef = useRef(filters);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const buildQueryParams = useCallback((params) => {
    return Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
    );
  }, []);

  const loadDashboard = useCallback(async ({ silent = false, targetFilters } = {}) => {
    const params = targetFilters || filtersRef.current;
    const query = buildQueryParams(params);

    if (silent) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await adminAPI.getSystemStats(query);
      const payload = response?.stats || response || {};
      setStats(payload);

      const serverFilter = normalizeServerFilter(payload?.selected_filter, params);
      if (serverFilter) {
        const next = normalizeFilterForScope(serverFilter, payload?.filter_options || {});
        if (!areFiltersEqual(filtersRef.current, next)) {
          setFilters(next);
        }
      }
    } catch (err) {
      console.error("Error fetching admin dashboard stats:", err);
      setError(err?.message || "ไม่สามารถโหลดข้อมูลได้ในขณะนี้");
    } finally {
      if (silent) {
        setIsRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [buildQueryParams]);

  const handleExportAllData = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("adminAutoExport", "1");
    }

    if (onNavigate) {
      onNavigate("applications-list");
    } else if (typeof window !== "undefined") {
      window.location.href = "/admin/applications-list";
    }
  }, [onNavigate]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const filterOptions = stats?.filter_options || {};
  const scopeDescription = buildScopeDescription(filters, filterOptions);

  const overview = stats?.overview ?? {};
  const categoryBudgets = useMemo(
    () => (Array.isArray(stats?.category_budgets) ? stats.category_budgets : []),
    [stats]
  );
  const pendingApplications = useMemo(
    () => (Array.isArray(stats?.pending_applications) ? stats.pending_applications : []),
    [stats]
  );

  const trendBreakdown = useMemo(() => {
    const base = stats?.trend_breakdown && typeof stats.trend_breakdown === "object"
      ? stats.trend_breakdown
      : {};
    const fallbackMonthly = Array.isArray(stats?.monthly_trends)
      ? { monthly: stats.monthly_trends }
      : {};
    return { ...fallbackMonthly, ...base };
  }, [stats]);

  const statusBreakdown = useMemo(
    () => (stats?.status_breakdown && typeof stats.status_breakdown === "object"
      ? stats.status_breakdown
      : {}),
    [stats]
  );

  const financialOverview = useMemo(
    () => (stats?.financial_overview && typeof stats.financial_overview === "object"
      ? stats.financial_overview
      : {}),
    [stats]
  );

  const upcomingPeriods = useMemo(
    () => (Array.isArray(stats?.upcoming_periods) ? stats.upcoming_periods : []),
    [stats]
  );

  const quotaSummary = useMemo(
    () => (Array.isArray(stats?.quota_summary) ? stats.quota_summary : []),
    [stats]
  );

  const quotaUsageViewRows = useMemo(
    () => (Array.isArray(stats?.quota_usage_view_rows) ? stats.quota_usage_view_rows : []),
    [stats]
  );

  const currentDate = stats?.current_date
    ? formatThaiDateFromBEString(stats.current_date)
    : null;

  const handleRefresh = () => loadDashboard({ silent: true });

  const handleScopeChange = (event) => {
    const nextFilters = normalizeFilterForScope(
      { scope: event.target.value, year: filters.year, installment: filters.installment },
      filterOptions
    );
    setFilters(nextFilters);
    loadDashboard({ targetFilters: nextFilters });
  };

  const handleYearChange = (event) => {
    const nextFilters = normalizeFilterForScope(
      { ...filters, year: event.target.value },
      filterOptions
    );
    setFilters(nextFilters);
    loadDashboard({ targetFilters: nextFilters });
  };

  const handleInstallmentChange = (event) => {
    const nextFilters = { ...filters, installment: event.target.value };
    setFilters(nextFilters);
    loadDashboard({ targetFilters: nextFilters });
  };

  return (
    <PageLayout
      title="แดชบอร์ดผู้ดูแลระบบ"
      subtitle="ภาพรวมการดำเนินงานและการใช้งบประมาณของระบบ"
      icon={LayoutDashboard}
      loading={loading}
      breadcrumbs={[
        { label: "หน้าแรก", href: "/admin" },
        { label: "แดชบอร์ดผู้ดูแลระบบ" },
      ]}
      actions={(
        <div className="flex flex-col w-full gap-3 lg:flex-row lg:items-center lg:justify-between">
          <FilterControls
            filters={filters}
            options={filterOptions}
            onScopeChange={handleScopeChange}
            onYearChange={handleYearChange}
            onInstallmentChange={handleInstallmentChange}
            disabled={loading && !isRefreshing}
          />

          <div className="flex flex-wrap gap-2 justify-end">
            <button
              type="button"
              onClick={() => onNavigate?.("applications-list")}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 transition"
            >
              จัดการคำร้อง
            </button>
            <button
              type="button"
              onClick={handleExportAllData}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 transition"
            >
              <Download className="w-4 h-4" />
              ส่งออกข้อมูลทั้งหมด
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition disabled:opacity-60"
            >
              <RefreshCcw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "กำลังรีเฟรช..." : "รีเฟรช"}
            </button>
          </div>
        </div>
      )}
    >
      {error ? (
          <ErrorState message={error} onRetry={handleRefresh} />
      ) : (
        <div className="space-y-8">
          <OverviewCards
            overview={overview}
            currentDate={currentDate}
            scopeDescription={scopeDescription}
            onNavigate={onNavigate}
          />

          <div className="grid grid-cols-1 2xl:grid-cols-3 gap-6">
            <SimpleCard
              title="สถานะคำร้องทั้งระบบ"
              icon={ListChecks}
              className="2xl:col-span-2"
            >
              <StatusPipeline breakdown={statusBreakdown} />
            </SimpleCard>

            <SimpleCard
              title="กำหนดปิดรอบทุนที่กำลังมาถึง"
              icon={CalendarClock}
            >
              <UpcomingDeadlines periods={upcomingPeriods} />
            </SimpleCard>
          </div>

          <div className="grid grid-cols-1 2xl:grid-cols-3 gap-6">
            <SimpleCard
              title="แนวโน้มการยื่นคำร้อง"
              icon={TrendingUp}
              className="2xl:col-span-2"
            >
              <MonthlyChart breakdown={trendBreakdown} defaultMode="monthly" />
            </SimpleCard>

            <SimpleCard
              title="สถานะการเงินและการอนุมัติ"
              icon={CircleDollarSign}
            >
              <FinancialHighlights data={financialOverview} overview={overview} />
            </SimpleCard>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <SimpleCard
              title="หมวดหมู่การใช้งบสูงสุด"
              icon={CircleDollarSign}
              className="2xl:col-span-3"
              action={(
                <button
                  type="button"
                  onClick={() => onNavigate?.("fund-settings")}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  จัดการงบประมาณ →
                </button>
              )}
            >
              <CategoryBudgetTable categories={categoryBudgets} />
            </SimpleCard>

            <SimpleCard
              title="สิทธิ์และโควตาการใช้ทุน"
              icon={ShieldCheck}
              className="2xl:col-span-3"
            >
              <EligibilitySummary summary={quotaSummary} usageRows={quotaUsageViewRows} />
            </SimpleCard>
          </div>

          <Card
            title="คำร้องที่รอดำเนินการ"
            collapsible={false}
            className="2xl:col-span-3"
            action={
              pendingApplications.length > MAX_PENDING_DISPLAY && (
                <button
                  type="button"
                  onClick={() => onNavigate?.("applications-list")}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  ดูทั้งหมด {formatNumber(pendingApplications.length)} รายการ →
                </button>
              )
            }
          >
            <PendingApplicationsList applications={pendingApplications} />
          </Card>
        </div>
      )}
    </PageLayout>
  );
}