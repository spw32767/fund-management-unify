"use client";

import { useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard,
  TrendingUp,
  RefreshCcw,
  CalendarDays,
  BarChart3,
} from "lucide-react";

import PageLayout from "../common/PageLayout";
import Card from "../common/Card";
import SimpleCard from "../common/SimpleCard";
import StatCard from "./StatCard";
import MonthlyChart from "./MonthlyChart";
import BudgetSummary from "./BudgetSummary";
import RecentApplications from "./RecentApplications";
import { dashboardAPI, apiClient } from "../../../lib/api";
import {
  formatCurrency,
  formatNumber,
  formatThaiDateFromBEString,
  formatThaiMonthShort,
} from "@/app/utils/format";

const normalizeDashboardStats = (apiStats = {}) => {
  const myApplications = apiStats?.my_applications ?? {};
  const budgetSummary = apiStats?.budget_summary ?? {};
  const budgetUsage = apiStats?.budget_usage ?? {};
  const monthlyStats = Array.isArray(apiStats?.monthly_stats)
    ? apiStats.monthly_stats
    : [];
  const recentApplications = Array.isArray(apiStats?.recent_applications)
    ? apiStats.recent_applications
    : [];

  const normalizedMonthly = monthlyStats.map((item) => ({
    month: formatThaiMonthShort(item?.month ?? ""),
    applications: Number(item?.applications ?? item?.total_applications ?? 0),
    approved: Number(item?.approved ?? 0),
  }));

  return {
    myApplications: {
      total: Number(myApplications?.total ?? 0),
      pending: Number(myApplications?.pending ?? 0),
      approved: Number(myApplications?.approved ?? 0),
      rejected: Number(myApplications?.rejected ?? 0),
      revision: Number(myApplications?.revision ?? 0),
      draft: Number(myApplications?.draft ?? 0),
      total_requested: Number(myApplications?.total_amount ?? myApplications?.total_requested ?? 0),
      total_approved: Number(myApplications?.approved_amount ?? myApplications?.total_approved ?? 0),
    },
    budgetUsed: {
      total: Number(budgetSummary?.total_requested ?? 0),
      thisYear: Number(budgetSummary?.total_approved ?? 0),
      remaining: Number(budgetSummary?.remaining ?? budgetUsage?.remaining_budget ?? 0),
    },
    monthlyStats: normalizedMonthly,
    recentApplications: recentApplications.map((item) => ({
      application_id: item?.submission_id ?? item?.application_id,
      application_number: item?.submission_number ?? item?.application_number,
      project_title: item?.title ?? item?.project_title,
      requested_amount: Number(item?.amount ?? item?.requested_amount ?? 0),
      subcategory_name: item?.subcategory_name ?? item?.category_name ?? "-",
      status_id: item?.status_id ?? item?.application_status_id ?? item?.status,
      status: item?.status_name ?? item?.status,
      submitted_at: item?.submitted_at ?? item?.created_at ?? null,
    })),
    budgetUsage: {
      yearBudget: Number(budgetUsage?.year_budget ?? 0),
      usedBudget: Number(budgetUsage?.used_budget ?? 0),
      remainingBudget: Number(budgetUsage?.remaining_budget ?? 0),
    },
    currentDate: apiStats?.current_date ?? null,
  };
};

function WelcomeBanner({ user, stats }) {
  const firstName = user?.user_fname ?? "";
  const lastName = user?.user_lname ?? "";
  const position = user?.position ?? "";
  const totalApplications = formatNumber(stats?.myApplications?.total ?? 0);
  const pending = formatNumber(stats?.myApplications?.pending ?? 0);
  const approvedAmount = formatCurrency(stats?.myApplications?.total_approved ?? 0);

  return (
    <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white p-6 rounded-lg shadow-lg">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">สวัสดี{position ? ` ${position}` : ""} {firstName} {lastName}</h2>
          <p className="mt-1 text-sm opacity-90">ยินดีต้อนรับสู่ระบบกองทุนวิจัยฯ วิทยาลัยการคอมพิวเตอร์</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="bg-white/15 rounded-lg px-4 py-3">
            <p className="text-white/80">คำร้องทั้งหมด</p>
            <p className="text-xl font-bold">{totalApplications}</p>
          </div>
          <div className="bg-white/15 rounded-lg px-4 py-3">
            <p className="text-white/80">รอดำเนินการ</p>
            <p className="text-xl font-bold">{pending}</p>
          </div>
          <div className="bg-white/15 rounded-lg px-4 py-3">
            <p className="text-white/80">อนุมัติแล้ว (บาท)</p>
            <p className="text-xl font-bold">{approvedAmount}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BudgetUsageHighlights({ usage }) {
  const total = Number(usage?.yearBudget ?? 0);
  const used = Number(usage?.usedBudget ?? 0);
  const remaining = Math.max(Number(usage?.remainingBudget ?? total - used), 0);
  const usedPercent = total > 0 ? Math.min((used / total) * 100, 100) : 0;

  const items = [
    { label: "งบประมาณประจำปี", value: formatCurrency(total), accent: "text-gray-800" },
    { label: "ใช้ไปแล้ว", value: formatCurrency(used), accent: "text-blue-600" },
    { label: "คงเหลือ", value: formatCurrency(remaining), accent: "text-emerald-600" },
  ];

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-center justify-between text-sm">
          <span className="text-gray-600">{item.label}</span>
          <span className={`font-semibold ${item.accent}`}>{item.value}</span>
        </div>
      ))}

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>การใช้จ่าย</span>
          <span>{usedPercent.toFixed(1)}%</span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600"
            style={{ width: `${usedPercent}%` }}
          />
        </div>
      </div>
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
  const [user, setUser] = useState(null);
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
      const response = await dashboardAPI.getStats();
      const payload = response?.stats || response;
      setStats(normalizeDashboardStats(payload || {}));
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
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

  useEffect(() => {
    setUser(apiClient.getUser());
  }, []);

  const currentDateLabel = stats?.currentDate
    ? formatThaiDateFromBEString(stats.currentDate)
    : null;

  const handleRefresh = () => loadDashboard({ silent: true });

  return (
    <PageLayout
      title="แดชบอร์ดของฉัน"
      subtitle="ติดตามสถานะคำร้องและการใช้งบประมาณส่วนบุคคล"
      icon={LayoutDashboard}
      loading={loading}
      actions={(
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNavigate?.("applications")}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-600 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 transition"
          >
            จัดการคำร้องของฉัน
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
      ) : stats ? (
        <div className="space-y-8">
          <WelcomeBanner user={user} stats={stats} />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              <span>
                อัปเดตล่าสุด: {currentDateLabel || "-"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-500 text-xs sm:text-sm">
              <BarChart3 className="w-4 h-4" />
              <span>ข้อมูลสถิติคำนวณจากคำร้องและงบประมาณในระบบ</span>
            </div>
          </div>

          <StatCard stats={stats} />

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <SimpleCard title="แนวโน้มการยื่นคำร้อง" icon={TrendingUp}>
              <MonthlyChart data={stats.monthlyStats} />
            </SimpleCard>

            <SimpleCard title="สรุปงบประมาณของฉัน">
              <BudgetSummary budget={stats.budgetUsed} />
            </SimpleCard>

            <SimpleCard title="สถานะการใช้งบประมาณ" icon={CalendarDays}>
              <BudgetUsageHighlights usage={stats.budgetUsage} />
            </SimpleCard>
          </div>

          <Card
            title="คำร้องล่าสุดของฉัน"
            action={
              <button
                type="button"
                onClick={() => onNavigate?.("applications")}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                ดูทั้งหมด →
              </button>
            }
          >
            <RecentApplications applications={stats.recentApplications} />
          </Card>
        </div>
      ) : null}
    </PageLayout>
  );
}