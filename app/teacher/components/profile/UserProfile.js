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
