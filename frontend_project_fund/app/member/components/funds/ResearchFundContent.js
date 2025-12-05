// app/teacher/components/funds/ResearchFundContent.js
// ทุนส่งเสริมการวิจัยและนวัตกรรม (UI matched to Promotion, keep original display conditions)

"use client";

import { useState, useEffect, useRef } from "react";
import { DollarSign, FileText, Search, Download, X, Info, Clock, AlertTriangle, Calendar } from "lucide-react";
import PageLayout from "../common/PageLayout";
import { teacherAPI } from "../../../lib/member_api";
import { targetRolesUtils, filterFundsByRole } from "../../../lib/target_roles_utils";
import { FORM_TYPE_CONFIG } from "../../../lib/form_type_config";
import systemConfigAPI from "../../../lib/system_config_api";

const RESEARCH_CATEGORY_KEYWORDS = [
  "ทุนส่งเสริมการวิจัย"
];

const normalizeText = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const extractCategoryTexts = (category) => {
  if (!category || typeof category !== "object") {
    return [];
  }

  const baseTexts = [
    category.category_name,
    category.categoryName,
    category.name,
    category.category_name_en,
    category.categoryNameEn,
  ];

  const subTexts = Array.isArray(category.subcategories)
    ? category.subcategories.flatMap((sub) => [
        sub?.subcategory_name,
        sub?.subcategorie_name,
        sub?.name,
        sub?.fund_condition,
      ])
    : [];

  return [...baseTexts, ...subTexts]
    .filter((text) => text != null && text !== "")
    .map(normalizeText);
};

const matchCategoryByKeywords = (category, keywords = []) => {
  const texts = extractCategoryTexts(category);
  if (!texts.length || !Array.isArray(keywords) || !keywords.length) {
    return false;
  }

  return keywords.some((keyword) => {
    const normalizedKeyword = normalizeText(keyword);
    if (!normalizedKeyword) {
      return false;
    }

    return texts.some((text) => text.includes(normalizedKeyword));
  });
};

const selectCategoriesByKeywords = (categories = [], keywords = []) => {
  if (!Array.isArray(categories) || !categories.length) {
    return [];
  }

  const directMatches = categories.filter((category) =>
    matchCategoryByKeywords(category, keywords)
  );

  if (directMatches.length) {
    return directMatches;
  }

  // Fallback: choose categories with highest keyword hit counts (if any)
  const scored = categories
    .map((category) => {
      const texts = extractCategoryTexts(category);
      const score = keywords.reduce((total, keyword) => {
        const normalizedKeyword = normalizeText(keyword);
        if (!normalizedKeyword) {
          return total;
        }
        const hit = texts.some((text) => text.includes(normalizedKeyword));
        return total + (hit ? 1 : 0);
      }, 0);

      return { category, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length) {
    return scored.map((entry) => entry.category);
  }

  // As a final fallback, return the first category to avoid empty state
  return categories.slice(0, 1);
};

export default function ResearchFundContent({ onNavigate }) {
  const [selectedYear, setSelectedYear] = useState("");
  const [currentYear, setCurrentYear] = useState("");
  const [yearId, setYearId] = useState(null);
  const [fundCategories, setFundCategories] = useState([]);
  const [filteredFunds, setFilteredFunds] = useState([]);
  const [years, setYears] = useState([]);

  // system config / window
  const [systemConfig, setSystemConfig] = useState(null);
  const [isWithinApplicationPeriod, setIsWithinApplicationPeriod] = useState(true);
  const [endDateLabel, setEndDateLabel] = useState("");

  const [loading, setLoading] = useState(true);
  const [yearsLoading, setYearsLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);

  // filters
  const [searchTerm, setSearchTerm] = useState("");

  // modal
  const [showConditionModal, setShowConditionModal] = useState(false);
  const [isConditionModalVisible, setIsConditionModalVisible] = useState(false);
  const [selectedCondition, setSelectedCondition] = useState({ title: "", content: "" });
  const modalRef = useRef(null);

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
  }, [searchTerm, fundCategories]);

  // ---------- helpers ----------
  const normalizeYearValue = (value) => {
    if (value === undefined || value === null) return null;
    const str = String(value).trim();
    return str ? str : null;
  };

  const resolveFundYear = (fund, category) => {
    const candidates = [
      fund?.year,
      fund?.year_name,
      fund?.yearName,
      fund?.fiscal_year,
      fund?.fiscalYear,
      fund?.budget_year,
      fund?.budgetYear,
      fund?.budget_year_name,
      fund?.budgetYearName,
      fund?.budget_year_label,
      fund?.budgetYearLabel,
      fund?.year_label,
      fund?.yearLabel,
      fund?.year_text,
      fund?.yearText,
      category?.year,
      category?.year_name,
      category?.yearName,
      category?.fiscal_year,
      category?.budget_year,
      category?.budgetYear,
    ];

    for (const candidate of candidates) {
      const normalized = normalizeYearValue(candidate);
      if (normalized) {
        return normalized;
      }
    }
    return null;
  };

  const isFundInCurrentBudgetYear = (fund, category) => {
    const activeYear = normalizeYearValue(currentYear);
    if (!activeYear) {
      return true;
    }

    const fundYear = resolveFundYear(fund, category);
    if (fundYear) {
      return normalizeYearValue(fundYear) === activeYear;
    }

    const selected = normalizeYearValue(selectedYear);
    return selected ? selected === activeYear : true;
  };

  // Accepts "YYYY-MM-DD HH:mm:ss" (treated as local) or ISO (respects Z/offset)
  const computeApplicationOpen = (start, end) => {
    if (!start || !end) return true; // if not configured => allow
    const parse = (v) => {
      if (v == null) return NaN;
      const s = String(v).trim();
      if (/[zZ]|[+\-]\d{2}:\d{2}$/.test(s)) return new Date(s);
      return new Date(s.replace(" ", "T")); // treat as local
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
      "มกราคม",
      "กุมภาพันธ์",
      "มีนาคม",
      "เมษายน",
      "พฤษภาคม",
      "มิถุนายน",
      "กรกฎาคม",
      "สิงหาคม",
      "กันยายน",
      "ตุลาคม",
      "พฤศจิกายน",
      "ธันวาคม",
    ];
    return `${d.getDate()} ${thaiMonths[d.getMonth()]} ${d.getFullYear() + 543}`;
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [roleInfo, yearsData, winData, currentYearRes] = await Promise.all([
        targetRolesUtils.getCurrentUserRole(),
        loadAvailableYears(),
        loadSystemConfig(),
        systemConfigAPI
          .getCurrentYear()
          .catch((err) => {
            console.warn("Failed to fetch current system year:", err);
            return null;
          }),
      ]);

      setUserRole(roleInfo);

      const normalizedYears = Array.isArray(yearsData)
        ? [...yearsData]
            .map((entry) => ({
              ...entry,
              year: entry?.year != null ? String(entry.year) : entry?.year,
            }))
            .sort((a, b) => {
              const aYear = Number(a?.year ?? 0);
              const bYear = Number(b?.year ?? 0);
              return bYear - aYear;
            })
        : [];

      setSystemConfig(winData || null);

      const systemYearCandidate =
        currentYearRes?.current_year ??
        currentYearRes?.data?.current_year ??
        winData?.current_year ??
        null;

      const fallbackYear = normalizedYears.length
        ? String(normalizedYears[0].year)
        : "";

      const resolvedYearCandidate = systemYearCandidate
        ? String(systemYearCandidate)
        : fallbackYear;

      const hasResolvedYear = normalizedYears.some(
        (year) => String(year.year) === resolvedYearCandidate
      );

      const finalYear = hasResolvedYear ? resolvedYearCandidate : fallbackYear;

      const normalizedFinalYear = finalYear ? String(finalYear) : '';

      const limitedYears = normalizedFinalYear
        ? normalizedYears.filter((year) => String(year.year) === normalizedFinalYear)
        : normalizedYears;

      const yearOptions = (limitedYears.length ? limitedYears : normalizedYears).map((year) => ({
        ...year,
        year: year?.year != null ? String(year.year) : year?.year,
      }));

      setYears(yearOptions);
      setCurrentYear(normalizedFinalYear);

      if (normalizedFinalYear) {
        setSelectedYear(normalizedFinalYear);
      } else {
        setSelectedYear("");
      }
      // loadFundData will be triggered by effect on selectedYear
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
        const validYears = yearsData.filter((year) => year && year.year_id && year.year);
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

  // --- system config ---
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

      const open =
        typeof win.is_open_effective === "boolean"
          ? win.is_open_effective
          : computeApplicationOpen(start_date, end_date);

      setIsWithinApplicationPeriod(open);
      setEndDateLabel(end_date ? formatThaiDate(end_date) : "");

      const payload = {
        start_date,
        end_date,
        is_open_effective: open,
        current_year: win.current_year ?? null,
        last_updated: win.last_updated ?? null,
        now: win.now ?? null,
      };

      return payload;
    } catch (e) {
      console.warn("loadSystemConfig failed:", e);
      setIsWithinApplicationPeriod(true);
      setEndDateLabel("");
      return null;
    } finally {
      setConfigLoading(false);
    }
  };

  const formatDateThaiFull = (dateString) => {
    if (!dateString || dateString === "0000-00-00 00:00:00") return "ไม่ระบุ";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "วันที่ไม่ถูกต้อง";
      const thaiMonths = [
        "มกราคม",
        "กุมภาพันธ์",
        "มีนาคม",
        "เมษายน",
        "พฤษภาคม",
        "มิถุนายน",
        "กรกฎาคม",
        "สิงหาคม",
        "กันยายน",
        "ตุลาคม",
        "พฤศจิกายน",
        "ธันวาคม",
      ];
      const day = date.getDate();
      const month = thaiMonths[date.getMonth()];
      const year = date.getFullYear() + 543;
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");
      return `${day} ${month} ${year} เวลา ${hours}:${minutes} น.`;
    } catch {
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
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch {
      return null;
    }
  };

  // ---------- data ----------
  const loadFundData = async (year, roleContext = userRole) => {
    try {
      setLoading(true);
      setError(null);

      if (!year) {
        setFundCategories([]);
        return;
      }

      const response = await teacherAPI.getVisibleFundsStructure(year);
      console.log("Fund structure response (research):", response);
      setYearId(response.year_id);

      if (!response.categories || !Array.isArray(response.categories)) {
        console.error("No categories found or invalid format");
        setFundCategories([]);
        return;
      }

      const visibleCategories = filterFundsByRole(
        response.categories,
        roleContext?.role_id ?? roleContext?.role_name ?? roleContext
      );

      // Keep research categories only (matched by keywords with graceful fallback)
      const researchFunds = selectCategoriesByKeywords(
        visibleCategories,
        RESEARCH_CATEGORY_KEYWORDS
      );

      // ถ้าอยู่นอกช่วงเวลา ให้เติม “สิ้นสุดรับคำขอ: …” ต่อท้าย fund_condition (เหมือน Promotion)
      const adjusted = researchFunds.map((category) => {
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

  // remaining_budget / used_amount / remaining_grant are no longer read here;
  // availability should be sourced from the new database table views instead.

  const applyFilters = () => {
    let filtered = [...fundCategories];

    if (searchTerm) {
      filtered = filtered
        .map((category) => ({
          ...category,
          subcategories:
            category.subcategories?.filter((sub) => {
              const name =
                sub.subcategorie_name || sub.subcategory_name || "";
              const cond = sub.fund_condition || "";
              return (
                name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                cond.toLowerCase().includes(searchTerm.toLowerCase())
              );
            }) || [],
        }))
        .filter((category) => category.subcategories && category.subcategories.length > 0);
    }

    setFilteredFunds(filtered);
  };

  // ---------- actions ----------
  const showCondition = (fundName, condition) => {
    setSelectedCondition({ title: fundName, content: condition });
    setShowConditionModal(true);
    if (typeof window !== "undefined" && window.requestAnimationFrame) {
      window.requestAnimationFrame(() => setIsConditionModalVisible(true));
    } else {
      setTimeout(() => setIsConditionModalVisible(true), 0);
    }
  };

  const closeConditionModal = () => {
    setIsConditionModalVisible(false);
    setTimeout(() => setShowConditionModal(false), 250);
  };

  const yearIdFromSelectedYear = () => {
    const y = years.find((yy) => String(yy.year) === String(selectedYear));
    return y?.year_id ?? yearId ?? null;
  };

  const findParentCategoryId = (subcategoryId) => {
    if (!subcategoryId) {
      return null;
    }

    const normalizedId = Number(subcategoryId);
    const parentCategory = fundCategories.find((category) =>
      category?.subcategories?.some((sub) => {
        const currentId = sub?.subcategory_id ?? sub?.subcategorie_id;
        return Number(currentId) === normalizedId;
      })
    );

    return parentCategory?.category_id ?? parentCategory?.categoryId ?? null;
  };

  const handleViewDetails = (subcategory) => {
    const formType = subcategory?.form_type || "download";
    const formConfig = FORM_TYPE_CONFIG[formType] || {};

    if (!formConfig.isOnlineForm) {
      const docUrl = subcategory?.form_url || "/documents/default-fund-form.docx";
      if (typeof window !== "undefined") {
        window.open(docUrl, "_blank");
      }
      return;
    }

    try {
      sessionStorage.setItem("fund_form_readonly", "1");
    } catch {}

    if (onNavigate) {
      const resolvedSubcategoryId =
        subcategory?.subcategory_id || subcategory?.subcategorie_id || null;
      const resolvedSubcategoryName =
        subcategory?.subcategory_name || subcategory?.subcategorie_name || "";

      onNavigate(
        formConfig.route || "generic-fund-application",
        {
          category_id: findParentCategoryId(resolvedSubcategoryId),
          year_id: yearIdFromSelectedYear(),
          subcategory,
          subcategory_id: resolvedSubcategoryId,
          subcategory_name: resolvedSubcategoryName,
          originPage: "research-fund",
        },
        { mode: "view-only" }
      );
    }
  };

  const handleApplyForm = (subcategory, options = {}) => {
    const { isCurrentBudgetYear: canApplyCurrent = true } = options;

    if (!canApplyCurrent) {
      if (typeof window !== "undefined") {
        window.alert("สามารถยื่นขอทุนได้เฉพาะปีงบประมาณปัจจุบัน");
      }
      return;
    }

    if (!isWithinApplicationPeriod) {
      if (typeof window !== "undefined") {
        window.alert("หมดเวลาการยื่นขอทุนแล้ว");
      }
      return;
    }
    const formType = subcategory?.form_type || "download";
    const formConfig = FORM_TYPE_CONFIG[formType] || {};

    if (!formConfig.isOnlineForm) {
      const docUrl = subcategory?.form_url || "/documents/default-fund-form.docx";
      if (typeof window !== "undefined") {
        window.open(docUrl, "_blank");
      }
      return;
    }

    try {
      sessionStorage.removeItem("fund_form_readonly");
    } catch {}

    if (onNavigate) {
      const resolvedSubcategoryId =
        subcategory?.subcategory_id || subcategory?.subcategorie_id || null;
      const resolvedSubcategoryName =
        subcategory?.subcategory_name || subcategory?.subcategorie_name || "";

      onNavigate(
        formConfig.route || "generic-fund-application",
        {
          category_id: findParentCategoryId(resolvedSubcategoryId),
          year_id: yearIdFromSelectedYear(),
          subcategory,
          subcategory_id: resolvedSubcategoryId,
          subcategory_name: resolvedSubcategoryName,
          originPage: "research-fund",
        },
        { mode: "edit" }
      );
    }
  };

  const renderApplicationPeriodInfo = () => {
    if (!systemConfig) return null;

    const daysUntilDeadline = getDaysUntilDeadline();
    const endDateFormatted = formatDateThaiFull(systemConfig.end_date);

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
                {daysUntilDeadline > 0 ? `เหลือเวลาอีก ${daysUntilDeadline} วัน` : "วันสุดท้ายของการยื่นขอทุน"}
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

  const resolvedYear =
    normalizeYearValue(selectedYear) ||
    normalizeYearValue(currentYear) ||
    (years.length ? normalizeYearValue(years[0]?.year) : null);

  const yearDisplayLabel = yearsLoading
    ? "กำลังโหลด..."
    : resolvedYear || "ไม่พบปีงบประมาณ";

  const yearDisplayIsAvailable = !yearsLoading && !!resolvedYear;

  const yearDisplayHelperText = yearsLoading
    ? "กำลังโหลดปีงบประมาณจากระบบ"
    : !yearDisplayIsAvailable
      ? "ไม่พบปีงบประมาณที่เปิดใช้งาน"
      : "";

  // ---------- rendering ----------
  if (loading) {
    // remaining_budget / used_amount / remaining_grant are no longer displayed here;
    // rely on aggregated values from the database views when needed.
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
            onClick={() => loadFundData(selectedYear)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            ลองใหม่
          </button>
        </div>
      </div>
    );
  }

  const renderFundRow = (fund, category) => {
    const fundName = fund.subcategorie_name || fund.subcategory_name || "ไม่ระบุ";
    const formType = fund.form_type || "download";
    const formConfig = FORM_TYPE_CONFIG[formType] || {};
    const ButtonIcon = formConfig.icon || FileText;
    const isOnlineForm = !!formConfig.isOnlineForm;
    const activeYearLabel = normalizeYearValue(currentYear) || normalizeYearValue(selectedYear);
    const isCurrentBudgetYear = isFundInCurrentBudgetYear(fund, category);
    const canApply = isCurrentBudgetYear && isWithinApplicationPeriod;
    const buttonTitle = !isCurrentBudgetYear
      ? `ยื่นขอทุนได้เฉพาะปีงบประมาณ ${activeYearLabel || "ปัจจุบัน"}`
      : (isWithinApplicationPeriod ? "ยื่นขอทุน" : "หมดเวลาการยื่นขอทุน");

    const handleDownload = () => {
      const docUrl = fund.form_url || "/documents/default-fund-form.docx";
      if (typeof window !== "undefined") {
        window.open(docUrl, "_blank");
      }
    };

    return (
      <tr
        key={fund.subcategory_id || fund.subcategorie_id}
        className={!canApply ? "bg-gray-50" : ""}
      >
        <td className="px-6 py-4 align-top">
          <div className="text-sm font-medium text-gray-900 max-w-lg break-words leading-relaxed">
            {fundName}
          </div>
          {fund.has_multiple_levels && (
            <div className="text-xs text-gray-500 mt-1">(มี {fund.budget_count} ระดับ)</div>
          )}
        </td>

        <td className="px-6 py-4">
          <div className="flex flex-col gap-2">
            <div className="text-sm text-gray-900">
              {fund.fund_condition ? (
                <button
                  onClick={() => showCondition(fundName, fund.fund_condition)}
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <Info className="w-4 h-4" />
                  ดูเงื่อนไข
                </button>
              ) : (
                <span className="text-gray-500">ไม่มีเงื่อนไข</span>
              )}
            </div>
          </div>
        </td>

        <td className="px-6 py-4 text-center">
          {isOnlineForm ? (
            <div className="flex flex-col items-center gap-1">
              <div className="inline-flex items-center justify-center gap-3">
                <button
                  onClick={() => handleViewDetails(fund)}
                  className="inline-flex items-center gap-2 px-1 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                  title="เปิดดูรายละเอียด (อ่านอย่างเดียว)"
                >
                  <Search size={16} />
                  ดูรายละเอียด
                </button>

                <button
                  onClick={() => handleApplyForm(fund, { isCurrentBudgetYear })}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    canApply
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                  title={buttonTitle}
                  disabled={!canApply}
                  aria-disabled={!canApply}
                >
                  <ButtonIcon size={16} />
                  ยื่นขอทุน
                </button>
              </div>
              {!isCurrentBudgetYear && activeYearLabel && (
                <p className="text-xs text-red-500">
                  ยื่นขอได้เฉพาะทุนในปีงบประมาณ {activeYearLabel}
                </p>
              )}
            </div>
          ) : (
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
              title="ดาวน์โหลดแบบฟอร์ม"
            >
              <Download size={16} />
              ดาวน์โหลด
            </button>
          )}
        </td>
      </tr>
    );
  };

  return (
    <PageLayout
      title="ทุนส่งเสริมการวิจัยและนวัตกรรม"
      subtitle="รายการทุนส่งเสริมการวิจัยที่เปิดรับสมัคร"
      icon={DollarSign}
      breadcrumbs={[
        { label: "หน้าแรก", href: "/member" },
        { label: "ทุนส่งเสริมการวิจัย" },
      ]}
    >
      {/* Application Period Info (เหมือน Promotion) */}
      {renderApplicationPeriodInfo()}

      {/* Control Bar (เหมือน Promotion) */}
      <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          {/* Year Display */}
          <div className="flex flex-col items-start gap-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">ปีงบประมาณ:</span>
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-semibold ${
                  yearDisplayIsAvailable
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-gray-100 border-gray-200 text-gray-500'
                }`}
              >
                <Calendar
                  size={16}
                  className={yearDisplayIsAvailable ? 'text-blue-500' : 'text-gray-400'}
                  aria-hidden="true"
                />
                <span>{yearDisplayLabel}</span>
              </div>
            </div>
            {yearDisplayHelperText && (
              <span className="text-xs text-gray-500">{yearDisplayHelperText}</span>
            )}
          </div>

          {/* Search */}
          <div className="relative w-full md:w-auto">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={16}
            />
            <input
              type="text"
              placeholder="ค้นหาทุน..."
              className="text-gray-600 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Funds Table (เหมือน Promotion) */}
      {filteredFunds.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="text-gray-500">
            <DollarSign size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">ไม่พบทุนส่งเสริมงานวิจัย</p>
            <p className="text-sm">
              {fundCategories.length === 0
                ? "ไม่มีทุนส่งเสริมงานวิจัยในปีงบประมาณนี้"
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    รายละเอียด
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    แบบฟอร์มขอทุน
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredFunds.map((category) => {
                  if (category.subcategories && category.subcategories.length > 0) {
                    return category.subcategories.map((fund) => renderFundRow(fund, category));
                  } else {
                    return (
                      <tr key={category.category_id}>
                        <td colSpan="3" className="px-6 py-4 text-center text-gray-500">
                          ไม่มีทุนย่อยในหมวด {category.category_name}
                        </td>
                      </tr>
                    );
                  }
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Condition Modal (เหมือน Promotion) */}
      {showConditionModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeConditionModal();
          }}
        >
          <div
            className={`fixed inset-0 bg-gray-500 transition-opacity duration-300 ease-in-out ${
              isConditionModalVisible ? "opacity-75" : "opacity-0"
            }`}
            onClick={closeConditionModal}
            aria-hidden="true"
          ></div>

          <div
            ref={modalRef}
            className={`relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all duration-300 ease-in-out max-w-2xl w-full max-h-[90vh] flex flex-col ${
              isConditionModalVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
            }`}
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
                  onClick={closeConditionModal}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
              <div
                className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed"
                id="modal-description"
              >
                {selectedCondition.content}
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200 flex-shrink-0">
              <button
                type="button"
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                onClick={closeConditionModal}
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