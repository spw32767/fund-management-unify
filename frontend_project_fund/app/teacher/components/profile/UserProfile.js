import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  Activity
} from 'lucide-react';

import profileAPI from '@/app/lib/profile_api';
import teacherAPI from '@/app/lib/teacher_api';

// Default data structure for the profile
const defaultTeacherData = {
  user_id: null,
  user_fname: '',
  user_lname: '',
  position: '',
  department: '',
  faculty: '',
  email: '',
  phone: '',
  office: '',
  employeeId: '',
  joinDate: '',
  profileImage: null,
  stats: {
    totalApplications: 0,
    approvedApplications: 0,
    pendingApplications: 0,
    totalBudgetReceived: 0,
    usedBudget: 0,
    remainingBudget: 0,
    successRate: 0
  },
  quickLinks: []
};

export default function ProfileContent({ onNavigate }) {
  const [teacherData, setTeacherData] = useState(defaultTeacherData);
  const [loading, setLoading] = useState(true);
  const [publications, setPublications] = useState([]);
  const [innovations, setInnovations] = useState([]);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const [profileRes, statsRes, pubsRes, innovRes] = await Promise.all([
        profileAPI.getProfile(),
        teacherAPI.getDashboardStats(),
        profileAPI.getPublications(),
        profileAPI.getInnovations()
      ]);

      const profile = profileRes || {};
      const stats = statsRes.stats || {};
      const myApps = stats.my_applications || {};
      const budget = stats.budget_usage || {};
      const recentApps = stats.recent_applications || [];

      const successRate = (myApps.total || myApps.Total) > 0
        ? (((myApps.approved || myApps.Approved || 0) /
            (myApps.total || myApps.Total)) * 100)
        : 0;

      setTeacherData({
        user_id: profile.user_id,
        user_fname: profile.user_fname,
        user_lname: profile.user_lname,
        position: profile.position_name,
        department: profile.department || '',
        faculty: profile.faculty || '',
        email: profile.email,
        phone: profile.phone || '',
        office: profile.office || '',
        employeeId: profile.employee_id || '',
        joinDate: profile.join_date || '',
        profileImage: profile.profile_image || null,
        stats: {
          totalApplications: myApps.total || myApps.Total || 0,
          approvedApplications: myApps.approved || myApps.Approved || 0,
          pendingApplications: myApps.pending || myApps.Pending || 0,
          totalBudgetReceived: budget.year_budget || budget.YearBudget || 0,
          usedBudget: budget.used_budget || budget.UsedBudget || 0,
          remainingBudget: budget.remaining_budget || budget.RemainingBudget || 0,
          successRate: Number(successRate.toFixed(1))
        },
        quickLinks: recentApps.map(app => ({
          id: app.submission_id || app.id,
          name: app.title || app.submission_number || 'ไม่ทราบชื่อโครงการ',
          status: app.status_name || 'ดูรายละเอียด',
          destination: 'applications'
        }))
      });
      setPublications(pubsRes.publications || pubsRes || []);
      setInnovations(innovRes.innovations || innovRes || []);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Budget Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">สรุปงบประมาณ</h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <DollarSign size={20} className="text-gray-600" />
              <span className="font-medium">งบประมาณทั้งหมด</span>
            </div>
            <span className="text-xl font-bold">฿{teacherData.stats.totalBudgetReceived.toLocaleString()}</span>
          </div>

          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <TrendingUp size={20} className="text-blue-600" />
              <span className="font-medium">ใช้ไปในปีนี้</span>
              <span className="text-sm text-blue-600">
                {teacherData.stats.successRate}% ของทั้งหมด
              </span>
            </div>
            <span className="text-xl font-bold text-blue-600">฿{teacherData.stats.usedBudget.toLocaleString()}</span>
          </div>

          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Activity size={20} className="text-green-600" />
              <span className="font-medium">คงเหลือสำหรับปีนี้</span>
              <span className="text-sm text-green-600">
                {teacherData.stats.remainingBudget && teacherData.stats.totalBudgetReceived
                  ? ((teacherData.stats.remainingBudget / teacherData.stats.totalBudgetReceived) * 100).toFixed(1)
                  : 0}% ของทั้งหมด
              </span>
            </div>
            <span className="text-xl font-bold text-green-600">฿{teacherData.stats.remainingBudget.toLocaleString()}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">การใช้งบประมาณ</span>
            <span className="text-sm font-bold text-gray-900">{teacherData.stats.successRate}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div className="flex h-full">
              <div
                className="bg-blue-500 transition-all duration-500"
                style={{ width: `${teacherData.stats.successRate}%` }}
              ></div>
              <div
                className="bg-green-500 transition-all duration-500"
                style={{ width: `${teacherData.stats.totalBudgetReceived ? ((teacherData.stats.remainingBudget / teacherData.stats.totalBudgetReceived) * 100) : 0}%` }}
              ></div>
            </div>
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-blue-600">ใช้ไป: {teacherData.stats.successRate}%</span>
            <span className="text-xs text-green-600">
              คงเหลือ: {teacherData.stats.totalBudgetReceived ? ((teacherData.stats.remainingBudget / teacherData.stats.totalBudgetReceived) * 100).toFixed(1) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Publications Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Publications</h3>
        {publications.length === 0 ? (
          <p className="text-sm text-gray-500">ไม่มีข้อมูลผลงานตีพิมพ์</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Title</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Year</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Status</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {publications.map((pub) => (
                  <tr key={pub.id}>
                    <td className="px-4 py-2 whitespace-nowrap">{pub.title}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{pub.publication_date ? new Date(pub.publication_date).getFullYear() : '-'}</td>
                    <td className="px-4 py-2 whitespace-nowrap">-</td>
                    <td className="px-4 py-2 whitespace-nowrap">-</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Innovations Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Innovations</h3>
        {innovations.length === 0 ? (
          <p className="text-sm text-gray-500">ไม่มีข้อมูลนวัตกรรม</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Title</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Year</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Status</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {innovations.map((inv) => (
                  <tr key={inv.id}>
                    <td className="px-4 py-2 whitespace-nowrap">{inv.title}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{inv.registered_date ? new Date(inv.registered_date).getFullYear() : '-'}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{inv.innovation_type || '-'}</td>
                    <td className="px-4 py-2 whitespace-nowrap">-</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}