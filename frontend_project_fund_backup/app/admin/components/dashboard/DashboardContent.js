// dashboard/DashboardContent.js
"use client";

import { useState, useEffect } from "react";
import { LayoutDashboard, TrendingUp } from "lucide-react";
import { mockDashboardStats, mockApplications, mockUser } from "../data/mockData";
import PageHeader from "../common/PageHeader";
import Card from "../common/Card";
import StatCard from "./StatCard";
import RecentApplications from "./RecentApplications";
import MonthlyChart from "./MonthlyChart";
import BudgetSummary from "./BudgetSummary";
import SimpleCard from "../common/SimpleCard";
import PageLayout from "../common/PageLayout";

export default function DashboardContent({ onNavigate }) {
  const [stats, setStats] = useState(mockDashboardStats);
  const [recentApplications, setRecentApplications] = useState([]);
  const [user, setUser] = useState(mockUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading data
    setTimeout(() => {
      setStats(mockDashboardStats);
      setRecentApplications(mockApplications.slice(0, 3));
      setUser(mockUser);
      setLoading(false);
    }, 200);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageLayout
        title="แดชบอร์ด"
        subtitle="ภาพรวมระบบและสถิติการใช้งาน"
        icon={LayoutDashboard}
        loading={loading}
      />

      {/* Announcements */}
      <SimpleCard title="ประกาศล่าสุด" defaultCollapsed={true} className="mt-6 mb-6">
        <div className="space-y-4">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <p className="font-semibold text-blue-900">ประกาศ</p>
            <p className="text-blue-700">
              เปิดรับสมัครทุนวิจัยประจำปี 2569 ตั้งแต่วันที่ 1 กรกฎาคม - 31 สิงหาคม 2568
            </p>
          </div>
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
            <p className="font-semibold text-green-900">อัพเดท</p>
            <p className="text-green-700">
              ระบบได้รับการปรับปรุงใหม่ เพิ่มฟีเจอร์การติดตามสถานะคำร้องแบบ Real-time
            </p>
          </div>
        </div>
      </SimpleCard>

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg mb-8 shadow-lg">
        <h2 className="text-2xl font-bold mb-2">
          สวัสดี, {user.position}{user.user_fname} {user.user_lname}
        </h2>
        <p className="opacity-90">ยินดีต้อนรับเข้าสู่ระบบบริหารจัดการทุนวิจัย</p>
      </div>
      
      {/* Statistics Cards */}
      <StatCard stats={stats} />

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <SimpleCard title="สถิติการยื่นคำร้องรายเดือน" icon={TrendingUp}>
          <MonthlyChart data={stats.monthlyStats} />
        </SimpleCard>

        <SimpleCard title="สรุปงบประมาณ">
          <BudgetSummary budget={stats.budgetUsed} />
        </SimpleCard>
      </div>

      {/* Recent Applications */}
      <Card 
        title="คำร้องล่าสุดของฉัน"
        action={
          <button 
            onClick={() => onNavigate('applications')}
            className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
          >
            ดูทั้งหมด →
          </button>
        }
      >
        <RecentApplications applications={recentApplications} />
      </Card>
    </div>
  );
}