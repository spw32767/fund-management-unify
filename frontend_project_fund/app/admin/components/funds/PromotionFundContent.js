// app/teacher/components/funds/PromotionFundContent.js - ทุนอุดหนุนกิจกรรม (Using New API)
"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Search, Info, Clock, AlertTriangle } from "lucide-react";
import PageLayout from "../common/PageLayout";
import { teacherAPI } from '../../../lib/member_api';
import { targetRolesUtils, filterFundsByRole } from '../../../lib/target_roles_utils';
import systemConfigAPI from '../../../lib/system_config_api';

export default function PromotionFundContent() {
  const [selectedYear, setSelectedYear] = useState("2568");
  const [fundCategories, setFundCategories] = useState([]);
  const [filteredFunds, setFilteredFunds] = useState([]);
  const [years, setYears] = useState([]);
  const [systemConfig, setSystemConfig] = useState(null);
  const [isWithinApplicationPeriod, setIsWithinApplicationPeriod] = useState(true);
  const [endDateLabel, setEndDateLabel] = useState(""); // <— NEW: for appending to fund_condition
  const [loading, setLoading] = useState(true);
  const [yearsLoading, setYearsLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      loadFundData(selectedYear, userRole);
    }
  }, [selectedYear, userRole, isWithinApplicationPeriod, endDateLabel]); // reload when window status/label changes

  useEffect(() => {
    applyFilters();
  }, [searchTerm, statusFilter, fundCategories]);

  // ---------- helpers ----------
  // Accepts "YYYY-MM-DD HH:mm:ss" (treated as local) or ISO (respects Z/offset)
  const computeApplicationOpen = (start, end) => {
    if (!start || !end) return true; // if not configured => allow
    const parse = (v) => {
      if (v == null) return NaN;
      const s = String(v).trim();
      // If it already has timezone info (Z or ±HH:MM), let Date handle it
      if (/[zZ]|[+\-]\d{2}:\d{2}$/.test(s)) return new Date(s);
      // Otherwise treat SQL-like as local time by inserting 'T'
      return new Date(s.replace(" ", "T"));
    };
    const s = parse(start);
    const e = parse(end);
    if (isNaN(s) || isNaN(e)) return true;

    const now = new Date();
    // inclusive window: start <= now <= end
    return s.getTime() <= now.getTime() && now.getTime() <= e.getTime();
  };


  // Thai date (date only) like "1 มกราคม 2569"
  const formatThaiDate = (value) => {
    if (!value) return "";
    const d = new Date(String(value).replace(" ", "T"));
    if (isNaN(d.getTime())) return "";
    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    return `${d.getDate()} ${thaiMonths[d.getMonth()]} ${d.getFullYear() + 543}`;
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [roleInfo, yearsData, configData] = await Promise.all([
        targetRolesUtils.getCurrentUserRole(),
        loadAvailableYears(),
        loadSystemConfig()
      ]);

      setUserRole(roleInfo);
      setYears(yearsData);
      setSystemConfig(configData);

      // funds will reload via selectedYear effect
    } catch (err) {
      console.error('Error loading initial data:', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableYears = async () => {
    try {
      setYearsLoading(true);
      const response = await fetch('/api/years');
      const data = await response.json();
      
      if (data.success) {
        const yearsData = data.years || data.data || [];
        const validYears = yearsData.filter(year => 
          year && year.year_id && year.year
        );
        return validYears;
      } else {
        throw new Error(data.error || 'Failed to load years');
      }
    } catch (err) {
      console.error('Error loading years:', err);
      return [];
    } finally {
      setYearsLoading(false);
    }
  };

  // === build Authorization header from localStorage (no TS) ===
  const buildAuthHeader = () => {
    if (typeof window === "undefined") return null;
    const raw =
      localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("auth_token");
    if (!raw) return null;
    return /^Bearer\s+/i.test(raw) ? raw : `Bearer ${raw}`;
  };

  // REPLACE: whole function
  const loadSystemConfig = async () => {
    try {
      setConfigLoading(true);

      // เรียกตรง backend ผ่าน apiClient (ไม่ผ่าน /app/api/* อีกแล้ว)
      const res = await systemConfigAPI.getWindow();
      const win = systemConfigAPI.normalizeWindow(res);

      // กันค่าผิดปกติ
      const norm = (v) => {
        if (!v) return null;
        const s = String(v).trim();
        if (!s || s === '0000-00-00 00:00:00') return null;
        return s;
      };

      const start_date = norm(win.start_date);
      const end_date   = norm(win.end_date);

      // ใช้ค่าสถานะเปิดจาก backend ถ้ามี ไม่งั้นคำนวณเอง
      const open = (typeof win.is_open_effective === 'boolean')
        ? win.is_open_effective
        : computeApplicationOpen(start_date, end_date);

      setIsWithinApplicationPeriod(open);
      setEndDateLabel(end_date ? formatThaiDate(end_date) : '');
      setSystemConfig({
        start_date,
        end_date,
        is_open_effective: open,
        current_year: win.current_year,
        last_updated: win.last_updated,
        now: win.now,
      });

      // debug ให้ดูบน console
      console.log('[system-config]', {
        start_date,
        end_date,
        is_open_effective: open,
        now: win.now,
      });

      return { start_date, end_date, is_open_effective: open };
    } catch (e) {
      console.warn('loadSystemConfig failed:', e);
      // อย่าบล็อกหน้า ถ้าโหลดไม่ได้ให้ถือว่าเปิดไว้ก่อน
      setIsWithinApplicationPeriod(true);
      setEndDateLabel('');
      return null;
    } finally {
      setConfigLoading(false);
    }
  };


  // (kept for banner rendering compatibility)
  const checkApplicationPeriod = (config) => {
    if (!config || !config.start_date || !config.end_date) {
      setIsWithinApplicationPeriod(true); // Default to allow if no config
      return;
    }

    const now = new Date();
    const startDate = new Date(config.start_date);
    const endDate = new Date(config.end_date);

    // Check if dates are valid (not "0000-00-00 00:00:00")
    if (config.start_date === "0000-00-00 00:00:00" || config.end_date === "0000-00-00 00:00:00") {
      setIsWithinApplicationPeriod(true); // Allow if dates are not set
      return;
    }

    const withinPeriod = now >= startDate && now <= endDate;
    setIsWithinApplicationPeriod(withinPeriod);
  };

  const formatDateThai = (dateString) => {
    if (!dateString || dateString === "0000-00-00 00:00:00") {
      return 'ไม่ระบุ';
    }

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'วันที่ไม่ถูกต้อง';

      const thaiMonths = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
      ];

      const day = date.getDate();
      const month = thaiMonths[date.getMonth()];
      const year = date.getFullYear() + 543; // Convert to Buddhist year
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');

      return `${day} ${month} ${year} เวลา ${hours}:${minutes} น.`;
    } catch (err) {
      return 'วันที่ไม่ถูกต้อง';
    }
  };

  const getDaysUntilDeadline = () => {
    if (!systemConfig || !systemConfig.end_date || systemConfig.end_date === "0000-00-00 00:00:00") {
      return null;
    }

    try {
      const now = new Date();
      const endDate = new Date(systemConfig.end_date);
      const diffTime = endDate - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays;
    } catch (err) {
      return null;
    }
  };

  const loadFundData = async (year, roleContext = userRole) => {
    try {
      setLoading(true);
      setError(null);

      // ใช้ API ใหม่ที่ส่งข้อมูลแบบจัดกลุ่มแล้ว
      const response = await teacherAPI.getVisibleFundsStructure(year);
      console.log("Fund structure response:", response);

      if (!response.categories || !Array.isArray(response.categories)) {
        console.error("No categories found or invalid format");
        setFundCategories([]);
        return;
      }

      const visibleCategories = filterFundsByRole(
        response.categories,
        roleContext?.role_id ?? roleContext?.role_name ?? roleContext
      );

      // กรองเฉพาะทุนอุดหนุนกิจกรรม (category_id = 2)
      const promotionFunds = visibleCategories.filter(
        (category) => category.category_id === 2
      );

      // รวมทุน publication_reward ให้เป็น 1 แถว (คงพฤติกรรมเดิม)
      const mergedPromotionFunds = promotionFunds.map((category) => {
        if (!Array.isArray(category.subcategories)) return category;

        const publicationSubs = category.subcategories.filter(
          (sub) => sub.form_type === "publication_reward"
        );

        if (publicationSubs.length > 1) {
          const merged = {
            ...publicationSubs[0],
            category_id: category.category_id,
            subcategory_name: "เงินรางวัลการตีพิมพ์เผยแพร่ผลงานวิจัย",
            remaining_budget: publicationSubs.reduce(
              (sum, s) => sum + (s.remaining_budget || 0),
              0
            ),
            has_multiple_levels: publicationSubs.some((s) => s.has_multiple_levels),
            budget_count: publicationSubs.reduce(
              (sum, s) => sum + (s.budget_count || 0),
              0
            ),
            merged_subcategories: publicationSubs,
          };

          const others = category.subcategories.filter(
            (sub) => sub.form_type !== "publication_reward"
          );
          return { ...category, subcategories: [merged, ...others] };
        }
        return category;
      });

      const adjusted = mergedPromotionFunds.map((category) => {
        const newSubs = (category.subcategories || []).map((sub) => {
          let next = { ...sub };
          if (!isWithinApplicationPeriod) {
            const note = endDateLabel ? `\nสิ้นสุดรับคำขอ: ${endDateLabel}` : "";
            const base = (next.fund_condition || "").trim();
            const already = base.includes("สิ้นสุดรับคำขอ:");
            next.fund_condition = already ? base : `${base}${note}`;
          }
          return next;
        });
        return { ...category, subcategories: newSubs };
      });


      setFundCategories(adjusted);
    } catch (err) {
      console.error("Error loading fund data:", err);
      setError(err.message || "เกิดข้อผิดพลาดในการโหลดข้อมูลทุน");
      setFundCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...fundCategories];

    // Search filter
    if (searchTerm) {
      filtered = filtered.map(category => ({
        ...category,
        subcategories: category.subcategories?.filter(sub => {
          const subName = sub.subcategory_name || sub.subcategorie_name || '';
          const condition = sub.fund_condition || '';
          return subName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                 condition.toLowerCase().includes(searchTerm.toLowerCase());
        }) || []
      })).filter(category => category.subcategories && category.subcategories.length > 0);
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.map(category => ({
        ...category,
        subcategories: category.subcategories?.filter(sub => {
          const isAvailable = sub.remaining_budget > 0;
          return statusFilter === "available" ? isAvailable : !isAvailable;
        }) || []
      })).filter(category => category.subcategories && category.subcategories.length > 0);
    }

    setFilteredFunds(filtered);
  };

  const refetch = () => {
    loadFundData(selectedYear);
  };

  const renderApplicationPeriodInfo = () => {
    if (!systemConfig) return null;

    const daysUntilDeadline = getDaysUntilDeadline();
    const endDateFormatted = formatDateThai(systemConfig.end_date);

    if (!isWithinApplicationPeriod) {
      return (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-red-600 flex-shrink-0" size={20} />
            <div>
              <h3 className="text-red-800 font-medium">หมดเวลาการยื่นขอทุน</h3>
              <p className="text-red-700 text-sm mt-1">
                การยื่นขอทุนได้สิ้นสุดลงเมื่อ {endDateFormatted}
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (daysUntilDeadline !== null && daysUntilDeadline <= 7) {
      return (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Clock className="text-yellow-600 flex-shrink-0" size={20} />
            <div>
              <h3 className="text-yellow-800 font-medium">
                {daysUntilDeadline > 0 
                  ? `เหลือเวลาอีก ${daysUntilDeadline} วัน` 
                  : 'วันสุดท้ายของการยื่นขอทุน'}
              </h3>
              <p className="text-yellow-700 text-sm mt-1">
                การยื่นขอทุนจะสิ้นสุดในวันที่ {endDateFormatted}
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (systemConfig.end_date && systemConfig.end_date !== "0000-00-00 00:00:00") {
      return (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Info className="text-blue-600 flex-shrink-0" size={20} />
            <div>
              <h3 className="text-blue-800 font-medium">ระยะเวลาการยื่นขอทุน</h3>
              <p className="text-blue-700 text-sm mt-1">
                สามารถยื่นขอทุนได้ถึงวันที่ {endDateFormatted}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

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

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center text-red-600">
          <p>เกิดข้อผิดพลาด: {error}</p>
          <button 
            onClick={refetch}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            ลองใหม่
          </button>
        </div>
      </div>
    );
  }

  const renderFundRow = (fund) => {
    const fundName = fund.subcategory_name || fund.subcategorie_name || 'ไม่ระบุ';
    const fundId = fund.subcategory_id ?? fund.subcategorie_id ?? fundName;

    return (
      <tr key={fundId}>
        <td className="px-6 py-4">
          <div className="text-sm font-medium text-gray-900 max-w-lg break-words leading-relaxed">
            {fundName}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <PageLayout
      title="ทุนอุดหนุนกิจกรรม"
      subtitle="รายการทุนอุดหนุนกิจกรรมที่เปิดรับสมัคร"
      icon={TrendingUp}
      breadcrumbs={[
        { label: "หน้าแรก", href: "/admin" },
        { label: "ทุนอุดหนุนกิจกรรม" }
      ]}
    >
      {/* Application Period Info */}
      {renderApplicationPeriodInfo()}

      <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-start gap-3 text-gray-700">
          <Info className="text-blue-500 mt-1" size={18} />
          <div>
            <p className="font-medium">โหมดผู้ดูแลระบบ</p>
            <p className="text-sm text-gray-600">
              หน้านี้ใช้สำหรับตรวจสอบข้อมูลทุนและแบบฟอร์มเท่านั้น ผู้ดูแลระบบไม่สามารถยื่นขอทุนผ่านหน้าแสดงผลนี้ได้
            </p>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Year Selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">ปีงบประมาณ:</label>
            <select 
              className="px-3 py-2 text-gray-700 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              disabled={yearsLoading}
            >
              {yearsLoading ? (
                <option>กำลังโหลด...</option>
              ) : (
                years.map((year) => (
                  <option key={year.year_id} value={year.year}>
                    {year.year}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="ค้นหาทุน..."
                className="text-gray-600 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <select
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">ทั้งหมด</option>
              <option value="available">มีงบประมาณ</option>
              <option value="unavailable">งบประมาณหมด</option>
            </select>
          </div>
        </div>
      </div>

      {/* Funds Table */}
      {filteredFunds.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="text-gray-500">
            <TrendingUp size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">ไม่พบทุนอุดหนุนกิจกรรม</p>
            <p className="text-sm">
              {fundCategories.length === 0 
                ? "ไม่มีทุนอุดหนุนกิจกรรมในปีงบประมาณนี้" 
                : "ลองปรับตัวกรองใหม่"}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ชื่อทุน
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredFunds.map((category) => {
                  if (category.subcategories && category.subcategories.length > 0) {
                    return category.subcategories.map((fund) => renderFundRow(fund));
                  }

                  return (
                    <tr key={category.category_id}>
                      <td className="px-6 py-4 text-center text-gray-500">
                        ไม่มีทุนย่อยในหมวด {category.category_name}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </PageLayout>
  );
}
