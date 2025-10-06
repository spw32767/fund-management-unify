"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  FileText,
  Clock,
  CircleDollarSign,
  PieChart,
  RefreshCcw,
} from "lucide-react";

import PageLayout from "../common/PageLayout";
import Card from "../common/Card";
import SimpleCard from "../common/SimpleCard";
import MonthlyChart from "./MonthlyChart";
import BudgetSummary from "./BudgetSummary";
import adminAPI from "../../../lib/admin_api";
import {
  formatCurrency,
  formatNumber,
  formatThaiDateFromBEString,
  formatThaiDateTime,
  formatThaiMonthShort,
} from "@/app/utils/format";

const MAX_PENDING_DISPLAY = 5;

function OverviewCards({ overview, currentDate, onNavigate }) {
  const cards = useMemo(() => {
    const totalApplications = Number(overview?.total_applications ?? 0);
    const pending = Number(overview?.pending_count ?? 0);
    const totalUsers = Number(overview?.total_users ?? 0);
    const usedBudget = Number(overview?.used_budget ?? 0);
    const totalBudget = Number(overview?.total_budget ?? 0);

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
        onClick: () => onNavigate?.("applications-list"),
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
    ];
  }, [overview, onNavigate]);

  return (
    <div className="space-y-4">
      {currentDate && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-gray-600">
          <span>
            อัปเดตล่าสุด: <span className="font-medium text-gray-800">{currentDate}</span>
          </span>
          <span className="text-xs sm:text-sm text-gray-500">
            ข้อมูลสรุปภาพรวมการใช้งานระบบประจำปีปัจจุบัน
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {cards.map((card, index) => {
          const CardWrapper = card.onClick ? "button" : "div";
          return (
            <CardWrapper
              key={card.label}
              onClick={card.onClick}
              className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${card.gradient} text-white p-5 shadow-lg transition transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-white/60 ${
                card.onClick ? "cursor-pointer" : ""
              }`}
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
  if (!categories.length) {
    return <p className="text-center text-gray-500 py-4">ไม่มีข้อมูลการใช้งบประมาณตามหมวดหมู่</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500">
            <th className="py-2 pr-4 font-medium">หมวดหมู่ทุน</th>
            <th className="py-2 px-4 font-medium text-center">จำนวนคำร้อง</th>
            <th className="py-2 px-4 font-medium text-right">อนุมัติแล้ว</th>
            <th className="py-2 px-4 font-medium text-right">งบที่จัดสรร</th>
            <th className="py-2 pl-4 font-medium text-right">ใช้ไป (%)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {categories.map((category) => {
            const allocated = Number(category?.allocated_budget ?? 0);
            const approved = Number(category?.approved_amount ?? 0);
            const utilization = allocated > 0 ? Math.min((approved / allocated) * 100, 999) : 0;

            return (
              <tr key={category.category_name} className="text-gray-700">
                <td className="py-3 pr-4">
                  <p className="font-medium text-gray-900">{category.category_name}</p>
                  <p className="text-xs text-gray-500">รวมทั้งหมวดหมู่</p>
                </td>
                <td className="py-3 px-4 text-center font-semibold text-gray-900">
                  {formatNumber(category?.total_applications ?? 0)}
                </td>
                <td className="py-3 px-4 text-right text-blue-600 font-medium">
                  {formatCurrency(approved)}
                </td>
                <td className="py-3 px-4 text-right text-gray-600">
                  {formatCurrency(allocated)}
                </td>
                <td className="py-3 pl-4">
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-semibold text-emerald-600">
                      {utilization.toFixed(1)}%
                    </span>
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                        style={{ width: `${Math.min(utilization, 100)}%` }}
                      />
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
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

  const loadDashboard = useCallback(async ({ silent = false } = {}) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await adminAPI.getSystemStats();
      const payload = response?.stats || response;
      setStats(payload || {});
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
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const overview = stats?.overview ?? {};
  const categoryBudgets = useMemo(
    () => (Array.isArray(stats?.category_budgets) ? stats.category_budgets : []),
    [stats]
  );
  const pendingApplications = useMemo(
    () => (Array.isArray(stats?.pending_applications) ? stats.pending_applications : []),
    [stats]
  );

  const monthlyStats = useMemo(() => {
    const trends = Array.isArray(stats?.monthly_trends) ? stats.monthly_trends : [];
    const recent = trends.slice(-6);
    return recent.map((item) => ({
      month: formatThaiMonthShort(item?.month ?? ""),
      applications: Number(item?.total_applications ?? item?.applications ?? 0),
      approved: Number(item?.approved ?? 0),
    }));
  }, [stats]);

  const budgetOverview = useMemo(() => {
    const total = Number(overview?.total_budget ?? 0);
    const used = Number(overview?.used_budget ?? 0);
    const remaining = Math.max(total - used, 0);

    return {
      total,
      thisYear: used,
      remaining,
    };
  }, [overview]);

  const currentDate = stats?.current_date
    ? formatThaiDateFromBEString(stats.current_date)
    : null;

  const handleRefresh = () => loadDashboard({ silent: true });

  return (
    <PageLayout
      title="แดชบอร์ดผู้ดูแลระบบ"
      subtitle="ภาพรวมการดำเนินงานและการใช้งบประมาณของระบบ"
      icon={LayoutDashboard}
      loading={loading}
      actions={(
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNavigate?.("applications-list")}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-600 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 transition"
          >
            จัดการคำร้อง
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
      )}
    >
      {error ? (
        <ErrorState message={error} onRetry={handleRefresh} />
      ) : (
        <div className="space-y-8">
          <OverviewCards overview={overview} currentDate={currentDate} onNavigate={onNavigate} />

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <SimpleCard title="แนวโน้มการยื่นคำร้อง" icon={TrendingUp}>
              <MonthlyChart data={monthlyStats} />
            </SimpleCard>

            <SimpleCard title="สรุปการใช้งบประมาณ" icon={PieChart}>
              <BudgetSummary budget={budgetOverview} />
            </SimpleCard>

            <SimpleCard
              title="หมวดหมู่การใช้งบสูงสุด"
              icon={CircleDollarSign}
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
              <CategoryBudgetTable categories={categoryBudgets.slice(0, 5)} />
            </SimpleCard>
          </div>

          <Card
            title="คำร้องที่รอดำเนินการ"
            collapsible={false}
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