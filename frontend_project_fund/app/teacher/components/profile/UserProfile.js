"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
  Activity,
  ArrowUp,
  ArrowDown,
  ArrowUpDown
} from 'lucide-react';

import profileAPI from '@/app/lib/profile_api';
import teacherAPI from '@/app/lib/teacher_api';
import BudgetSummary from '@/app/teacher/components/dashboard/BudgetSummary';

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
  const [pubLoading, setPubLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('year');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [innovations, setInnovations] = useState([]);
  const [innovLoading, setInnovLoading] = useState(true);
  const [innovSearchTerm, setInnovSearchTerm] = useState('');
  const [innovSortField, setInnovSortField] = useState('registered_date');
  const [innovSortDirection, setInnovSortDirection] = useState('desc');
  const [innovPage, setInnovPage] = useState(1);
  const [innovRowsPerPage, setInnovRowsPerPage] = useState(10);

  useEffect(() => {
    loadProfileData();
    loadPublications();
    loadInnovations();
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

  const loadPublications = async () => {
    try {
      setPubLoading(true);
      const res = await teacherAPI.getUserPublications({ limit: 1000 });
      const items = res.data || res.items || [];
      setPublications(items);
    } catch (error) {
      console.error('Error loading publications:', error);
    } finally {
      setPubLoading(false);
    }
  };

  const loadInnovations = async () => {
    try {
      setInnovLoading(true);
      const res = await teacherAPI.getUserInnovations({ limit: 1000 });
      const items = res.data || res.items || [];
      setInnovations(items);
    } catch (error) {
      console.error('Error loading innovations:', error);
    } finally {
      setInnovLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'year' ? 'desc' : 'asc');
    }
  };

  const fieldValue = (item, field) => {
    switch (field) {
      case 'title':
        return item.title?.toLowerCase() || '';
      case 'cited_by':
        return item.cited_by || 0;
      case 'year':
      default:
        return item.publication_year || 0;
    }
  };

  const sortedPublications = useMemo(() => {
    const filtered = publications.filter((p) =>
      p.title?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const sorted = filtered.sort((a, b) => {
      const aVal = fieldValue(a, sortField);
      const bVal = fieldValue(b, sortField);
      if (aVal === bVal) return 0;
      if (sortDirection === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });
    return sorted;
  }, [publications, searchTerm, sortField, sortDirection]);

  const paginatedPublications = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return sortedPublications.slice(start, start + rowsPerPage);
  }, [sortedPublications, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(sortedPublications.length / rowsPerPage) || 1;

  const handleInnovSort = (field) => {
    if (innovSortField === field) {
      setInnovSortDirection(innovSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setInnovSortField(field);
      setInnovSortDirection(field === 'registered_date' ? 'desc' : 'asc');
    }
  };

  const innovFieldValue = (item, field) => {
    switch (field) {
      case 'title':
        return item.title?.toLowerCase() || '';
      case 'innovation_type':
        return item.innovation_type?.toLowerCase() || '';
      case 'registered_date':
      default:
        return item.registered_date || '';
    }
  };

  const sortedInnovations = useMemo(() => {
    const filtered = innovations.filter((i) =>
      i.title?.toLowerCase().includes(innovSearchTerm.toLowerCase())
    );
    const sorted = filtered.sort((a, b) => {
      const aVal = innovFieldValue(a, innovSortField);
      const bVal = innovFieldValue(b, innovSortField);
      if (aVal === bVal) return 0;
      if (innovSortDirection === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });
    return sorted;
  }, [innovations, innovSearchTerm, innovSortField, innovSortDirection]);

  const paginatedInnovations = useMemo(() => {
    const start = (innovPage - 1) * innovRowsPerPage;
    return sortedInnovations.slice(start, start + innovRowsPerPage);
  }, [sortedInnovations, innovPage, innovRowsPerPage]);

  const innovTotalPages = Math.ceil(sortedInnovations.length / innovRowsPerPage) || 1;

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
      <div className="flex-1 lg:mr-80 p-6 space-y-8">
        {/* Publications */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">ผลงานตีพิมพ์ (Publications)</h2>
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="ค้นหาชื่อเรื่อง..."
              className="border border-gray-300 rounded-md px-3 py-2 w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">แสดง</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded-md px-2 py-2 text-sm"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
              <span className="text-sm text-gray-600">รายการ</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            {pubLoading ? (
              <div className="space-y-2 animate-pulse">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-6 bg-gray-100 rounded" />
                ))}
              </div>
            ) : sortedPublications.length === 0 ? (
              <p className="text-center text-gray-500 py-6">ยังไม่มีผลงานตีพิมพ์</p>
            ) : (
              <>
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        className="px-4 py-2 text-left font-medium text-gray-700 cursor-pointer"
                        onClick={() => handleSort('title')}
                      >
                        ชื่อเรื่อง
                        {sortField === 'title' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="inline ml-1" size={14} />
                          ) : (
                            <ArrowDown className="inline ml-1" size={14} />
                          )
                        ) : (
                          <ArrowUpDown className="inline ml-1 text-gray-400" size={14} />
                        )}
                      </th>
                      <th
                        className="px-4 py-2 text-right font-medium text-gray-700 w-24 cursor-pointer"
                        onClick={() => handleSort('cited_by')}
                      >
                        อ้างโดย
                        {sortField === 'cited_by' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="inline ml-1" size={14} />
                          ) : (
                            <ArrowDown className="inline ml-1" size={14} />
                          )
                        ) : (
                          <ArrowUpDown className="inline ml-1 text-gray-400" size={14} />
                        )}
                      </th>
                      <th
                        className="px-4 py-2 text-center font-medium text-gray-700 w-20 cursor-pointer"
                        onClick={() => handleSort('year')}
                      >
                        ปี
                        {sortField === 'year' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="inline ml-1" size={14} />
                          ) : (
                            <ArrowDown className="inline ml-1" size={14} />
                          )
                        ) : (
                          <ArrowUpDown className="inline ml-1 text-gray-400" size={14} />
                        )}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedPublications.map((pub) => (
                      <tr key={pub.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 max-w-xs lg:max-w-md">
                          {pub.url ? (
                            <a
                              href={pub.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline truncate block"
                              title={pub.title}
                            >
                              {pub.title}
                            </a>
                          ) : (
                            <span className="truncate block" title={pub.title}>
                              {pub.title}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {pub.cited_by ? (
                            pub.cited_by_url ? (
                              <a
                                href={pub.cited_by_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {pub.cited_by}
                              </a>
                            ) : (
                              <span>{pub.cited_by}</span>
                            )
                          ) : (
                            <span>-</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {pub.publication_year || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex items-center justify-between mt-4 text-sm">
                  <span className="text-gray-600">
                    แสดง { (currentPage - 1) * rowsPerPage + 1 }-
                    { Math.min(currentPage * rowsPerPage, sortedPublications.length) } จาก { sortedPublications.length }
                  </span>
                  <div className="space-x-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border rounded disabled:opacity-50"
                    >
                      ก่อนหน้า
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border rounded disabled:opacity-50"
                    >
                      ถัดไป
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Innovations */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">นวัตกรรม (Innovations)</h2>
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <input
              type="text"
              value={innovSearchTerm}
              onChange={(e) => {
                setInnovSearchTerm(e.target.value);
                setInnovPage(1);
              }}
              placeholder="ค้นหาชื่อเรื่อง..."
              className="border border-gray-300 rounded-md px-3 py-2 w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">แสดง</span>
              <select
                value={innovRowsPerPage}
                onChange={(e) => {
                  setInnovRowsPerPage(parseInt(e.target.value));
                  setInnovPage(1);
                }}
                className="border border-gray-300 rounded-md px-2 py-2 text-sm"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
              <span className="text-sm text-gray-600">รายการ</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            {innovLoading ? (
              <div className="space-y-2 animate-pulse">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-6 bg-gray-100 rounded" />
                ))}
              </div>
            ) : sortedInnovations.length === 0 ? (
              <p className="text-center text-gray-500 py-6">ยังไม่มีนวัตกรรม</p>
            ) : (
              <>
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        className="px-4 py-2 text-left font-medium text-gray-700 cursor-pointer"
                        onClick={() => handleInnovSort('title')}
                      >
                        ชื่อนวัตกรรม
                        {innovSortField === 'title' ? (
                          innovSortDirection === 'asc' ? (
                            <ArrowUp className="inline ml-1" size={14} />
                          ) : (
                            <ArrowDown className="inline ml-1" size={14} />
                          )
                        ) : (
                          <ArrowUpDown className="inline ml-1 text-gray-400" size={14} />
                        )}
                      </th>
                      <th
                        className="px-4 py-2 text-left font-medium text-gray-700 cursor-pointer w-40"
                        onClick={() => handleInnovSort('innovation_type')}
                      >
                        ประเภท
                        {innovSortField === 'innovation_type' ? (
                          innovSortDirection === 'asc' ? (
                            <ArrowUp className="inline ml-1" size={14} />
                          ) : (
                            <ArrowDown className="inline ml-1" size={14} />
                          )
                        ) : (
                          <ArrowUpDown className="inline ml-1 text-gray-400" size={14} />
                        )}
                      </th>
                      <th
                        className="px-4 py-2 text-center font-medium text-gray-700 w-32 cursor-pointer"
                        onClick={() => handleInnovSort('registered_date')}
                      >
                        วันที่จดทะเบียน
                        {innovSortField === 'registered_date' ? (
                          innovSortDirection === 'asc' ? (
                            <ArrowUp className="inline ml-1" size={14} />
                          ) : (
                            <ArrowDown className="inline ml-1" size={14} />
                          )
                        ) : (
                          <ArrowUpDown className="inline ml-1 text-gray-400" size={14} />
                        )}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedInnovations.map((inv) => (
                      <tr key={inv.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 max-w-xs lg:max-w-md">
                          <span className="truncate block" title={inv.title}>
                            {inv.title}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <span className="truncate block" title={inv.innovation_type}>
                            {inv.innovation_type || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          {inv.registered_date || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex items-center justify-between mt-4 text-sm">
                  <span className="text-gray-600">
                    แสดง { (innovPage - 1) * innovRowsPerPage + 1 }-
                    { Math.min(innovPage * innovRowsPerPage, sortedInnovations.length) } จาก { sortedInnovations.length }
                  </span>
                  <div className="space-x-2">
                    <button
                      onClick={() => setInnovPage((p) => Math.max(1, p - 1))}
                      disabled={innovPage === 1}
                      className="px-3 py-1 border rounded disabled:opacity-50"
                    >
                      ก่อนหน้า
                    </button>
                    <button
                      onClick={() => setInnovPage((p) => Math.min(innovTotalPages, p + 1))}
                      disabled={innovPage === innovTotalPages}
                      className="px-3 py-1 border rounded disabled:opacity-50"
                    >
                      ถัดไป
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Budget Summary */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">สรุปงบประมาณ</h2>
          <BudgetSummary
            budget={{
              total: teacherData.stats.totalBudgetReceived,
              thisYear: teacherData.stats.usedBudget,
              remaining: teacherData.stats.remainingBudget
            }}
          />
        </section>
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