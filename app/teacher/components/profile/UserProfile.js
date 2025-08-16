import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  Building,
  FileText,
  TrendingUp,
  DollarSign,
  Clock,
  Bell,
  Settings,
  Camera,
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

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const [profileRes, statsRes] = await Promise.all([
        profileAPI.getProfile(),
        teacherAPI.getDashboardStats()
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
    <div className="flex">
      {/* Main Content Area */}
      <div className="flex-1 pr-0 lg:pr-80">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg mb-6 shadow-lg">
          <h2 className="text-2xl font-bold mb-2">
            สวัสดี, {teacherData.position}{teacherData.user_fname} {teacherData.user_lname}
          </h2>
          <p className="opacity-90">ยินดีต้อนรับเข้าสู่ระบบบริหารจัดการทุนวิจัย</p>
        </div>

        {/* Stats Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-lg transform transition-transform hover:scale-105">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-3xl font-bold mb-1">{teacherData.stats.totalApplications}</div>
                <div className="text-sm opacity-90">คำร้องทั้งหมดของฉัน</div>
              </div>
              <FileText size={32} className="opacity-30" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-teal-500 to-teal-600 text-white p-6 rounded-lg shadow-lg transform transition-transform hover:scale-105">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-3xl font-bold mb-1">{teacherData.stats.approvedApplications}</div>
                <div className="text-sm opacity-90">อนุมัติแล้ว</div>
              </div>
              <TrendingUp size={32} className="opacity-30" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-pink-500 to-purple-600 text-white p-6 rounded-lg shadow-lg transform transition-transform hover:scale-105">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-3xl font-bold mb-1">{teacherData.stats.pendingApplications}</div>
                <div className="text-sm opacity-90">รอพิจารณา</div>
              </div>
              <Clock size={32} className="opacity-30" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-pink-500 text-white p-6 rounded-lg shadow-lg transform transition-transform hover:scale-105">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-3xl font-bold mb-1">฿{teacherData.stats.usedBudget.toLocaleString()}</div>
                <div className="text-sm opacity-90">งบประมาณที่ใช้ไปปีนี้</div>
              </div>
              <DollarSign size={32} className="opacity-30" />
            </div>
          </div>
        </div>

        {/* Budget Summary */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
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

        {/* Call to Action */}
        <div className="bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-lg p-6 shadow-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Activity size={24} />
            <h3 className="text-lg font-semibold">สรุปการใช้งบประมาณ</h3>
          </div>
          <p className="mb-4 opacity-90">
            คุณได้ใช้งบประมาณไปแล้ว {teacherData.stats.successRate}% จากงบประมาณทั้งหมดที่ได้รับ
          </p>
          <button
            onClick={() => onNavigate && onNavigate('applications')}
            className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors"
          >
            ดูรายละเอียดเพิ่มเติม
          </button>
        </div>
      </div>

      {/* Right Sidebar - Fixed Position */}
      <div className="hidden lg:block fixed right-0 top-20 bottom-0 w-80 p-6 bg-white border-l border-gray-200 overflow-y-auto">
        {/* Profile Card */}
        <div className="text-center mb-6">
          <div className="relative inline-block mb-4">
            <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
              {teacherData.profileImage ? (
                <img
                  src={teacherData.profileImage}
                  alt="Profile"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-white text-3xl font-bold">
                  {teacherData.user_fname?.[0] || ''}
                </span>
              )}
            </div>
            <button className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors">
              <Camera size={16} />
            </button>
          </div>
          <h3 className="font-bold text-lg text-gray-900">{teacherData.user_fname} {teacherData.user_lname}</h3>
          <p className="text-sm text-gray-600 mb-1">{teacherData.position}</p>
          <p className="text-xs text-gray-500">{teacherData.department}</p>

          <div className="flex justify-center space-x-2 mt-4">
            <button className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
              <Bell size={20} className="text-gray-600" />
            </button>
            <button className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
              <Mail size={20} className="text-gray-600" />
            </button>
            <button className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
              <Settings size={20} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-gray-900 mb-3">คำร้องของฉัน</h4>
          <div className="space-y-3">
            {teacherData.quickLinks.map((link) => (
              <div
                key={link.id ?? `${link.name}-${link.destination}`}
                className="flex items-center justify-between"
              >
                <span className="text-sm text-gray-600 truncate mr-2">{link.name}</span>
                <button
                  onClick={() => onNavigate && onNavigate('applications')}
                  className="text-xs text-blue-600 hover:text-blue-700 whitespace-nowrap"
                >
                  {link.status}
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() => onNavigate && onNavigate('applications')}
            className="w-full mt-4 text-center text-sm text-purple-600 hover:text-purple-700 font-medium"
          >
            See All
          </button>
        </div>

        {/* Contact Information */}
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider">อีเมล</label>
            <p className="text-sm font-medium text-gray-900 mt-1">{teacherData.email}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider">เบอร์โทรศัพท์</label>
            <p className="text-sm font-medium text-gray-900 mt-1">{teacherData.phone}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider">ห้องทำงาน</label>
            <p className="text-sm font-medium text-gray-900 mt-1">{teacherData.office}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider">รหัสพนักงาน</label>
            <p className="text-sm font-medium text-gray-900 mt-1">{teacherData.employeeId}</p>
          </div>
        </div>
      </div>
    </div>
  );
}