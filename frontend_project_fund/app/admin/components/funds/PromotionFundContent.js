// app/admin/components/funds/PromotionFundContent.js - ทุนอุดหนุนกิจกรรม (Admin View)
"use client";

import { useState, useEffect, useRef } from "react";
import { TrendingUp, Search, X, Info, Clock, AlertTriangle } from "lucide-react";
import PageLayout from "../common/PageLayout";
import { teacherAPI } from "../../../lib/member_api";
import { targetRolesUtils, filterFundsByRole } from "../../../lib/target_roles_utils";
import systemConfigAPI from "../../../lib/system_config_api";

export default function PromotionFundContent() {
  const [selectedYear, setSelectedYear] = useState("2568");
  const [fundCategories, setFundCategories] = useState([]);
  const [filteredFunds, setFilteredFunds] = useState([]);
  const [years, setYears] = useState([]);
  const [systemConfig, setSystemConfig] = useState(null);
  const [isWithinApplicationPeriod, setIsWithinApplicationPeriod] = useState(true);
  const [endDateLabel, setEndDateLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [yearsLoading, setYearsLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showConditionModal, setShowConditionModal] = useState(false);
  const [selectedCondition, setSelectedCondition] = useState({ title: "", content: "" });
  const modalRef = useRef(null);

  const parseBudgetValue = (value) => {
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : 0;
    }

    const cleaned = String(value).replace(/,/g, "").trim();
    if (cleaned === "") return 0;

    const numeric = Number.parseFloat(cleaned);
    return Number.isNaN(numeric) ? 0 : numeric;
  };

  const parseCountValue = (value) => {
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : 0;
    }

    const cleaned = String(value).replace(/,/g, "").trim();
    if (cleaned === "") return 0;

    const numeric = Number.parseInt(cleaned, 10);
    return Number.isNaN(numeric) ? 0 : numeric;
  };

  const normalizeSubcategoryBudgets = (subcategory) => {
    if (!subcategory) return subcategory;

    const normalizedLevels = Array.isArray(subcategory.budget_levels)
      ? subcategory.budget_levels.map((level) => ({
          ...level,
          remaining_budget: parseBudgetValue(level?.remaining_budget),
          total_budget: parseBudgetValue(level?.total_budget),
        }))
      : subcategory.budget_levels;
    const normalizedCount = parseCountValue(subcategory.budget_count);

    return {
      ...subcategory,
      remaining_budget: parseBudgetValue(subcategory.remaining_budget),
      total_budget: parseBudgetValue(subcategory.total_budget),
      allocated_budget: parseBudgetValue(subcategory.allocated_budget),
      budget_levels: normalizedLevels,
      budget_count:
        normalizedCount || (Array.isArray(normalizedLevels) ? normalizedLevels.length : 0),
    };
  };

  useEffect(() => {
    if (showConditionModal && modalRef.current) {
      modalRef.current.focus();
    }
  }, [showConditionModal]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      loadFundData(selectedYear, userRole);
    }
  }, [selectedYear, userRole, isWithinApplicationPeriod, endDateLabel]);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, statusFilter, fundCategories]);

  const computeApplicationOpen = (start, end) => {
    if (!start || !end) return true;
    const parse = (v) => {
      if (v == null) return NaN;
      const s = String(v).trim();
      if (/[zZ]|[+\-]\d{2}:\d{2}$/.test(s)) return new Date(s);
      return new Date(s.replace(" ", "T"));
    };
    const s = parse(start);
    const e = parse(end);
    if (isNaN(s) || isNaN(e)) return true;

    const now = new Date();
    return s.getTime() <= now.getTime() && now.getTime() <= e.getTime();
  };

  const formatThaiDate = (value) => {
    if (!value) return "";
    const d = new Date(String(value).replace(" ", "T"));
    if (isNaN(d.getTime())) return "";
    const thaiMonths = [
      "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
      "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
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
    } catch (err) {
      console.error("Error loading initial data:", err);
      setError(err.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableYears = async () => {
    try {
      setYearsLoading(true);
      const response = await fetch("/api/years");
      const data = await response.json();

      if (data.success) {
        const yearsData = data.years || data.data || [];
        const validYears = yearsData.filter(
          (year) => year && year.year_id && year.year
        );
        return validYears;
      } else {
        throw new Error(data.error || "Failed to load years");
      }
    } catch (err) {
      console.error("Error loading years:", err);
      return [];
    } finally {
      setYearsLoading(false);
    }
  };

  const loadSystemConfig = async () => {
    try {
      setConfigLoading(true);
      const res = await systemConfigAPI.getWindow();
      const win = systemConfigAPI.normalizeWindow(res);

      const norm = (v) => {
        if (!v) return null;
        const s = String(v).trim();
        if (!s || s === "0000-00-00 00:00:00") return null;
        return s;
      };

      const start_date = norm(win.start_date);
      const end_date = norm(win.end_date);

      const open = typeof win.is_open_effective === "boolean"
        ? win.is_open_effective
        : computeApplicationOpen(start_date, end_date);

      setIsWithinApplicationPeriod(open);
      setEndDateLabel(end_date ? formatThaiDate(end_date) : "");
      setSystemConfig({
        start_date,
        end_date,
        is_open_effective: open,
        current_year: win.current_year,
        last_updated: win.last_updated,
        now: win.now,
      });

      console.log("[system-config]", {
        start_date,
        end_date,
        is_open_effective: open,
        now: win.now,
      });

      return { start_date, end_date, is_open_effective: open };
    } catch (e) {
      console.warn("loadSystemConfig failed:", e);
      setIsWithinApplicationPeriod(true);
      setEndDateLabel("");
      return null;
    } finally {
      setConfigLoading(false);
    }
  };

  const formatDateThai = (dateString) => {
    if (!dateString || dateString === "0000-00-00 00:00:00") {
      return "ไม่ระบุ";
    }

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "วันที่ไม่ถูกต้อง";

      const thaiMonths = [
        "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
        "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
      ];

      const day = date.getDate();
      const month = thaiMonths[date.getMonth()];
      const year = date.getFullYear() + 543;
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");

      return `${day} ${month} ${year} เวลา ${hours}:${minutes} น.`;
    } catch (err) {
      return "วันที่ไม่ถูกต้อง";
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

  const resolveRoleKey = (role) => {
    if (!role) return null;

    if (typeof role === "object") {
      if (role.role_id != null) return resolveRoleKey(role.role_id);
      if (role.role != null) return resolveRoleKey(role.role);
      if (role.role_name != null) return resolveRoleKey(role.role_name);
      if (role.name != null) return resolveRoleKey(role.name);
    }

    const raw = String(role).trim();
    if (!raw) return null;

    const lower = raw.toLowerCase();
    if (/^\d+$/.test(lower)) {
      return String(Number(lower));
    }

    return lower;
  };

  const isAdminRole = (role) => {
    const key = resolveRoleKey(role);
    if (!key) return false;

    if (key === "admin") return true;

    if (/^\d+$/.test(key)) {
      return Number(key) === 3;
    }

    return false;
  };

  const loadFundData = async (year, roleContext = userRole) => {
    try {
      setLoading(true);
      setError(null);

      const response = await teacherAPI.getVisibleFundsStructure(year);
      console.log("Fund structure response:", response);

      if (!response.categories || !Array.isArray(response.categories)) {
        console.error("No categories found or invalid format");
        setFundCategories([]);
        return;
      }

      const allCategories = response.categories;
      const shouldBypassRoleFilter = isAdminRole(roleContext);

      const visibleCategories = shouldBypassRoleFilter
        ? allCategories
        : filterFundsByRole(
            allCategories,
            roleContext?.role_id ?? roleContext?.role_name ?? roleContext
          );

      const promotionFunds = visibleCategories
        .filter((category) => category.category_id === 2)
        .map((category) => ({
          ...category,
          subcategories: category.subcategories?.map(normalizeSubcategoryBudgets) || [],
        }));

      const mergedPromotionFunds = promotionFunds.map((category) => {
        if (!Array.isArray(category.subcategories)) return category;

        const publicationSubs = category.subcategories.filter(
          (sub) => sub.form_type === "publication_reward"
        );

        if (publicationSubs.length > 1) {
          const combinedLevels = publicationSubs.flatMap((sub) =>
            Array.isArray(sub.budget_levels) ? sub.budget_levels : []
          );
          const remainingBudgetTotal = publicationSubs.reduce(
            (sum, s) => sum + parseBudgetValue(s.remaining_budget),
            0
          );
          const totalBudgetTotal = publicationSubs.reduce(
            (sum, s) => sum + parseBudgetValue(s.total_budget),
            0
          );
          const allocatedBudgetTotal = publicationSubs.reduce(
            (sum, s) => sum + parseBudgetValue(s.allocated_budget),
            0
          );
          const combinedCount =
            (Array.isArray(combinedLevels) && combinedLevels.length > 0
              ? combinedLevels.length
              : publicationSubs.reduce(
                  (sum, s) => sum + parseCountValue(s.budget_count),
                  0
                )) || 0;

          const merged = {
            ...publicationSubs[0],
            category_id: category.category_id,
            subcategory_name: "เงินรางวัลการตีพิมพ์เผยแพร่ผลงานวิจัย",
            remaining_budget: remainingBudgetTotal,
            total_budget: totalBudgetTotal,
            allocated_budget: allocatedBudgetTotal,
            has_multiple_levels:
              combinedLevels.length > 0 || publicationSubs.some((s) => s.has_multiple_levels),
            budget_levels: combinedLevels,
            budget_count: combinedCount,
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

    if (searchTerm) {
      filtered = filtered
        .map((category) => ({
          ...category,
          subcategories: category.subcategories?.filter((sub) => {
            const subName = sub.subcategory_name || "";
            const condition = sub.fund_condition || "";
            return (
              subName.toLowerCase().includes(searchTerm.toLowerCase()) ||
              condition.toLowerCase().includes(searchTerm.toLowerCase())
            );
          }) || [],
        }))
        .filter((category) => category.subcategories && category.subcategories.length > 0);
    }

    if (statusFilter !== "all") {
      filtered = filtered
        .map((category) => ({
          ...category,
          subcategories: category.subcategories?.filter((sub) => {
            const remaining = parseBudgetValue(sub.remaining_budget);
            const isAvailable = remaining > 0;
            return statusFilter === "available" ? isAvailable : !isAvailable;
          }) || [],
        }))
        .filter((category) => category.subcategories && category.subcategories.length > 0);
    }

    setFilteredFunds(filtered);
  };

  const refetch = () => {
    loadFundData(selectedYear);
  };

  const formatAmount = (amount) => {
    if (amount === null || amount === undefined || amount === "") {
      return "ไม่ระบุ";
    }

    const numeric = parseBudgetValue(amount);
    if (!Number.isFinite(numeric)) {
      return "ไม่ระบุ";
    }

    const hasDecimal = Math.abs(numeric % 1) > 1e-6;

    return (
      new Intl.NumberFormat("th-TH", {
        minimumFractionDigits: hasDecimal ? 2 : 0,
        maximumFractionDigits: 2,
      }).format(numeric) + " บาท"
    );
  };

  const showCondition = (fundName, condition) => {
    setSelectedCondition({ title: fundName, content: condition });
    setShowConditionModal(true);
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
                  : "วันสุดท้ายของการยื่นขอทุน"}
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
    const fundName = fund.subcategory_name || "ไม่ระบุ";
    const remainingBudget = parseBudgetValue(fund.remaining_budget);

    return (
      <tr key={fund.subcategory_id} className={!isWithinApplicationPeriod ? "bg-gray-50" : ""}>
        <td className="px-6 py-4">
          <div className="text-sm font-medium text-gray-900 max-w-lg break-words leading-relaxed">
            {fundName}
          </div>
          {fund.has_multiple_levels && (
            <div className="text-xs text-gray-500 mt-1">
              (มี {fund.budget_count || fund.budget_levels?.length || 0} ระดับ)
            </div>
          )}
        </td>
        <td className="px-6 py-4">
          <div className="text-sm text-gray-900">
            {fund.fund_condition ? (
              <button
                onClick={() => showCondition(fundName, fund.fund_condition)}
                className="text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
              >
                <Info className="w-4 h-4" />
                ดูเงื่อนไข
              </button>
            ) : (
              <span className="text-gray-500">ไม่มีเงื่อนไขเฉพาะ</span>
            )}
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="text-sm font-medium text-gray-900">
            {formatAmount(remainingBudget)}
          </div>
          {isWithinApplicationPeriod && remainingBudget === 0 ? (
            <div className="text-xs text-red-600 mt-1">งบประมาณหมด</div>
          ) : !isWithinApplicationPeriod ? (
            <div className="text-xs text-gray-500 mt-1">ปิดรับคำขอ</div>
          ) : null}
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
        { label: "ทุนอุดหนุนกิจกรรม" },
      ]}
    >
      {renderApplicationPeriodInfo()}

      <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
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

      {filteredFunds.length > 0 && (
        <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-sm text-gray-500">จำนวนทุนทั้งหมด</div>
            <div className="text-2xl font-semibold text-gray-900">
              {filteredFunds.reduce(
                (sum, cat) => sum + (cat.subcategories?.length || 0),
                0
              )}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-sm text-gray-500">ทุนที่มีงบประมาณ</div>
            <div className="text-2xl font-semibold text-green-600">
              {filteredFunds.reduce(
                (sum, cat) =>
                  sum +
                  (cat.subcategories?.filter((s) => parseBudgetValue(s.remaining_budget) > 0).length || 0),
                0
              )}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-sm text-gray-500">งบประมาณรวมคงเหลือ</div>
            <div className="text-xl font-semibold text-blue-600">
              {formatAmount(
                filteredFunds.reduce(
                  (sum, cat) =>
                    sum +
                    (cat.subcategories?.reduce(
                      (subSum, sub) => subSum + parseBudgetValue(sub.remaining_budget),
                      0
                    ) || 0),
                  0
                )
              )}
            </div>
          </div>
        </div>
      )}

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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5">
                    ชื่อทุน
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                    เงื่อนไขทุน
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    งบประมาณคงเหลือ
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
                      <td colSpan="3" className="px-6 py-4 text-center text-gray-500">
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

      {showConditionModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowConditionModal(false);
            }
          }}
        >
          <div
            className="fixed inset-0 bg-gray-500 opacity-75 transition-opacity duration-300 ease-in-out"
            onClick={() => setShowConditionModal(false)}
            aria-hidden="true"
          ></div>

          <div
            ref={modalRef}
            className="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all duration-300 ease-in-out max-w-2xl w-full max-h-[90vh] flex flex-col"
            role="dialog"
            aria-labelledby="modal-title"
            aria-describedby="modal-description"
            tabIndex={-1}
          >
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
              <div className="flex justify-between items-start">
                <h3 className="text-lg leading-6 font-medium text-gray-900 pr-4" id="modal-title">
                  เงื่อนไขทุน: {selectedCondition.title}
                </h3>
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-500 flex-shrink-0"
                  onClick={() => setShowConditionModal(false)}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
              <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed" id="modal-description">
                {selectedCondition.content}
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200 flex-shrink-0">
              <button
                type="button"
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                onClick={() => setShowConditionModal(false)}
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}