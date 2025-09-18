"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Mail,
  Phone,
  Building,
  FileText,
  Clock,
  Camera,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";

import profileAPI from "@/app/lib/profile_api";
import teacherAPI from "@/app/lib/teacher_api";
import BudgetSummary from "@/app/teacher/components/dashboard/BudgetSummary";

// Default data structure for the profile
const defaultTeacherData = {
  user_id: null,
  user_fname: "",
  user_lname: "",
  position: "",
  department: "",
  faculty: "",
  email: "",
  phone: "",
  office: "",
  employeeId: "",
  joinDate: "",
  profileImage: null,
  stats: {
    totalApplications: 0,
    approvedApplications: 0,
    pendingApplications: 0,
    totalBudgetReceived: 0,
    usedBudget: 0,
    remainingBudget: 0,
    successRate: 0,
  },
  quickLinks: [],
};

function MiniBarChart({ data, valueLabel, formatNumber }) {
  const safeFormat = (value) => {
    if (typeof formatNumber === "function") {
      const formatted = formatNumber(value);
      if (formatted !== null && formatted !== undefined) {
        return formatted;
      }
    }
    if (value === null || value === undefined) {
      return "-";
    }
    return String(value);
  };

  if (!Array.isArray(data) || data.length === 0) {
    return <p className="text-sm text-gray-500">ไม่มีข้อมูลการอ้างอิง</p>;
  }

  const maxValue = data.reduce(
    (max, item) => Math.max(max, Number(item?.value) || 0),
    0,
  );

  return (
    <div className="relative">
      <div className="flex h-40 items-end gap-3 overflow-x-auto pb-4">
        {data.map(({ year, value }) => {
          const numericValue = Number(value) || 0;
          let heightPercent = 0;
          if (maxValue > 0) {
            heightPercent = (numericValue / maxValue) * 100;
            heightPercent =
              numericValue > 0 ? Math.max(6, heightPercent) : Math.max(2, heightPercent);
          } else {
            heightPercent = numericValue > 0 ? 100 : 4;
          }

          const barClasses =
            numericValue > 0
              ? "bg-gradient-to-t from-blue-600 to-sky-400 group-hover:from-blue-700 group-hover:to-sky-500"
              : "bg-gray-200";

          return (
            <div
              key={year}
              className="group relative flex min-w-[48px] flex-col items-center text-xs text-gray-500"
            >
              <div className="relative flex h-32 w-full items-end justify-center">
                <div
                  className={`w-6 rounded-t ${barClasses}`}
                  style={{ height: `${heightPercent}%` }}
                ></div>
                <div className="pointer-events-none absolute -top-3 hidden -translate-y-full rounded-md bg-gray-900 px-2 py-1 text-[11px] font-medium text-white shadow-lg group-hover:block">
                  <div>
                    {valueLabel} {safeFormat(numericValue)}
                  </div>
                  <div className="text-[10px] text-gray-200">ปี {year}</div>
                </div>
              </div>
              <span className="mt-2 text-[11px] font-medium text-gray-600">{year}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScholarCitationsCard({ summary, recentStartYear, formatNumber }) {
  if (!summary) {
    return null;
  }

  const {
    totalCitations,
    recentCitations,
    hIndexAll,
    hIndexRecent,
    i10IndexAll,
    i10IndexRecent,
    chartData,
    chartIsFallback,
  } = summary;

  const safeFormat = (value) => {
    if (value === null || value === undefined) {
      return "-";
    }
    if (typeof formatNumber === "function") {
      const formatted = formatNumber(value);
      if (formatted !== null && formatted !== undefined) {
        return formatted;
      }
    }
    return String(value);
  };

  const rows = [
    {
      label: "การอ้างอิง",
      all: totalCitations,
      recent: recentCitations,
    },
    {
      label: "ดัชนี h",
      all: hIndexAll,
      recent: hIndexRecent,
    },
    {
      label: "ดัชนี i10",
      all: i10IndexAll,
      recent: i10IndexRecent,
    },
  ];

  const hasChartData = Array.isArray(chartData) && chartData.length > 0;

  return (
    <div className="mt-6 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900">อ้างโดย</h3>
      <div className="mt-4 overflow-hidden rounded-lg border border-gray-100 bg-white text-sm">
        <div className="grid grid-cols-[1fr_repeat(2,minmax(0,120px))] bg-gray-50 font-medium text-gray-600">
          <div className="px-4 py-2"></div>
          <div className="px-4 py-2 text-right">ทั้งหมด</div>
          <div className="px-4 py-2 text-right">ตั้งแต่ปี {recentStartYear}</div>
        </div>
        <div className="divide-y divide-gray-100">
          {rows.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-[1fr_repeat(2,minmax(0,120px))]"
            >
              <div className="px-4 py-2 font-medium text-gray-700">{row.label}</div>
              <div className="px-4 py-2 text-right text-gray-900">
                {safeFormat(row.all)}
              </div>
              <div className="px-4 py-2 text-right text-gray-900">
                {safeFormat(row.recent)}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6">
        {hasChartData ? (
          <>
            <MiniBarChart
              data={chartData}
              valueLabel={chartIsFallback ? "จำนวนผลงาน" : "การอ้างอิง"}
              formatNumber={formatNumber}
            />
            {chartIsFallback && (
              <p className="mt-2 text-xs text-amber-600">
                แสดงจำนวนผลงานต่อปีชั่วคราว (TODO: ปรับเป็นจำนวนการอ้างอิงเมื่อ API พร้อม)
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-500">ไม่มีข้อมูลการอ้างอิง</p>
        )}
      </div>
    </div>
  );
}

export default function ProfileContent({ onNavigate }) {
  const [teacherData, setTeacherData] = useState(defaultTeacherData);
  const [loading, setLoading] = useState(true);
  const [publications, setPublications] = useState([]);
  const [pubLoading, setPubLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("year");
  const [sortDirection, setSortDirection] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [innovations, setInnovations] = useState([]);
  const [innovLoading, setInnovLoading] = useState(true);
  const [innovSearchTerm, setInnovSearchTerm] = useState("");
  const [innovSortField, setInnovSortField] = useState("registered_date");
  const [innovSortDirection, setInnovSortDirection] = useState("desc");
  const [innovPage, setInnovPage] = useState(1);
  const [innovRowsPerPage, setInnovRowsPerPage] = useState(10);

  useEffect(() => {
    loadProfileData();
    loadPublications();
    loadInnovations();
  }, []);

  // helpers
  const parseDate = (value) => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const formatThaiDate = (value) => {
    const d = parseDate(value);
    if (!d) return "-";
    return d.toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatNumber = (value) => {
    if (value === null || value === undefined) return null;
    const num = Number(value);
    if (Number.isNaN(num)) return null;
    return new Intl.NumberFormat("th-TH").format(num);
  };
  const loadProfileData = async () => {
    try {
      setLoading(true);
      const [profileRes, statsRes] = await Promise.all([
        profileAPI.getProfile(),
        teacherAPI.getDashboardStats(),
      ]);

      const profile = profileRes || {};
      const stats = statsRes.stats || {};
      const myApps = stats.my_applications || {};
      const budgetSummary = stats.budget_summary || {};
      const recentApps = stats.recent_applications || [];

      const successRate =
        (myApps.total || myApps.Total) > 0
          ? ((myApps.approved || myApps.Approved || 0) /
              (myApps.total || myApps.Total)) *
            100
          : 0;

      setTeacherData({
        user_id: profile.user_id,
        user_fname: profile.user_fname,
        user_lname: profile.user_lname,
        position: profile.position_name,
        department: profile.department || "",
        faculty: profile.faculty || "",
        email: profile.email,
        phone: profile.phone || "",
        office: profile.office || "",
        employeeId: profile.employee_id || "",
        joinDate: profile.join_date || "",
        profileImage: profile.profile_image || null,
        stats: {
          totalApplications: myApps.total || myApps.Total || 0,
          approvedApplications: myApps.approved || myApps.Approved || 0,
          pendingApplications: myApps.pending || myApps.Pending || 0,
          totalBudgetReceived:
            budgetSummary.total_requested || budgetSummary.TotalRequested || 0,
          usedBudget:
            budgetSummary.total_approved || budgetSummary.TotalApproved || 0,
          remainingBudget:
            budgetSummary.remaining || budgetSummary.Remaining || 0,
          successRate: Number(successRate.toFixed(1)),
        },
        quickLinks: recentApps.map((app) => ({
          id: app.submission_id || app.id,
          name: app.title || app.submission_number || "ไม่ทราบชื่อโครงการ",
          status: app.status_name || "ดูรายละเอียด",
          destination: "applications",
        })),
      });
    } catch (error) {
      console.error("Error loading profile:", error);
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
      console.error("Error loading publications:", error);
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
      console.error("Error loading innovations:", error);
    } finally {
      setInnovLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection(field === "year" ? "desc" : "asc");
    }
  };

  const fieldValue = (item, field) => {
    switch (field) {
      case "title":
        return item.title?.toLowerCase() || "";
      case "cited_by":
        return item.cited_by || 0;
      case "year":
      default:
        return item.publication_year || 0;
    }
  };

  const sortedPublications = useMemo(() => {
    const filtered = publications.filter((p) =>
      p.title?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    const sorted = filtered.sort((a, b) => {
      const aVal = fieldValue(a, sortField);
      const bVal = fieldValue(b, sortField);
      if (aVal === bVal) return 0;
      if (sortDirection === "asc") return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });
    return sorted;
  }, [publications, searchTerm, sortField, sortDirection]);

  const paginatedPublications = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return sortedPublications.slice(start, start + rowsPerPage);
  }, [sortedPublications, currentPage, rowsPerPage]);

  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const recentStartYear = currentYear - 4;

  const citationInsights = useMemo(() => {
    const toNumber = (value) => {
      if (value === null || value === undefined) return null;
      if (typeof value === "number") {
        return Number.isNaN(value) ? null : value;
      }
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed === "") return null;
        const num = Number(trimmed);
        return Number.isNaN(num) ? null : num;
      }
      return null;
    };

    let totalCitations = 0;
    let hasCitationCountData = false;

    const citationCountsAll = [];
    const recentCitationCounts = [];
    const perYearMap = new Map();
    let hasCitationHistory = false;

    publications.forEach((pub) => {
      if (!pub) return;

      let parsedHistory = null;
      if (pub.citation_history) {
        try {
          parsedHistory = JSON.parse(pub.citation_history);
        } catch (error) {
          parsedHistory = null;
        }
      }

      let historyTotal = null;
      if (parsedHistory && typeof parsedHistory === "object") {
        let hasAnyHistory = false;
        let pubRecentSum = 0;

        Object.entries(parsedHistory).forEach(([yearKey, value]) => {
          const yearNum = Number(yearKey);
          const valNum = toNumber(value);
          if (!Number.isNaN(yearNum) && valNum !== null) {
            hasCitationHistory = true;
            hasAnyHistory = true;
            perYearMap.set(yearNum, (perYearMap.get(yearNum) || 0) + valNum);
            historyTotal = (historyTotal || 0) + valNum;
            if (yearNum >= recentStartYear) {
              pubRecentSum += valNum;
            }
          }
        });

        if (hasAnyHistory) {
          recentCitationCounts.push(pubRecentSum);
        }
      }

      const citedByValue = toNumber(pub.cited_by);
      const citationsForTotal =
        citedByValue !== null ? citedByValue : historyTotal;

      if (citationsForTotal !== null) {
        hasCitationCountData = true;
        totalCitations += citationsForTotal;
        citationCountsAll.push(citationsForTotal);
      }
    });

    if (!hasCitationHistory) {
      // TODO: Replace fallback with citation counts once backend exposes per-year citations.
      publications.forEach((pub) => {
        const yearValue = toNumber(pub?.publication_year);
        if (yearValue !== null) {
          const yearInt = Math.trunc(yearValue);
          if (!Number.isNaN(yearInt)) {
            perYearMap.set(yearInt, (perYearMap.get(yearInt) || 0) + 1);
          }
        }
      });
    }

    const chartData = Array.from(perYearMap.entries())
      .filter(([year]) => !Number.isNaN(year))
      .sort((a, b) => a[0] - b[0])
      .map(([year, value]) => ({
        year,
        value,
      }));

    const computeHIndex = (values) => {
      if (!values || values.length === 0) return 0;
      const sorted = [...values].sort((a, b) => b - a);
      let h = 0;
      for (let i = 0; i < sorted.length; i += 1) {
        if (sorted[i] >= i + 1) {
          h = i + 1;
        } else {
          break;
        }
      }
      return h;
    };

    const computeI10 = (values) => {
      if (!values || values.length === 0) return 0;
      return values.filter((val) => val >= 10).length;
    };

    const recentCitationsTotal = hasCitationHistory
      ? chartData
          .filter((item) => item.year >= recentStartYear)
          .reduce((sum, item) => sum + (item.value || 0), 0)
      : null;

    const hIndexAll = hasCitationCountData
      ? computeHIndex(citationCountsAll)
      : null;
    const i10IndexAll = hasCitationCountData
      ? computeI10(citationCountsAll)
      : null;

    const hIndexRecent = hasCitationHistory
      ? computeHIndex(recentCitationCounts)
      : null;
    const i10IndexRecent = hasCitationHistory
      ? computeI10(recentCitationCounts)
      : null;

    return {
      totalCitations: hasCitationCountData ? totalCitations : null,
      recentCitations: recentCitationsTotal,
      hIndexAll,
      hIndexRecent,
      i10IndexAll,
      i10IndexRecent,
      chartData,
      chartIsFallback: !hasCitationHistory,
    };
  }, [publications, recentStartYear]);

  const totalPages = Math.ceil(sortedPublications.length / rowsPerPage) || 1;

  const handleInnovSort = (field) => {
    if (innovSortField === field) {
      setInnovSortDirection(innovSortDirection === "asc" ? "desc" : "asc");
    } else {
      setInnovSortField(field);
      setInnovSortDirection(field === "registered_date" ? "desc" : "asc");
    }
  };

  const innovFieldValue = (item, field) => {
    switch (field) {
      case "title":
        return item.title?.toLowerCase() || "";
      case "innovation_type":
        return item.innovation_type?.toLowerCase() || "";
      case "registered_date":
      default: {
        const d = parseDate(item.registered_date);
        return d ? d.getTime() : 0; // numeric for correct asc/desc sorting
      }
    }
  };

  const sortedInnovations = useMemo(() => {
    const filtered = innovations.filter((i) =>
      i.title?.toLowerCase().includes(innovSearchTerm.toLowerCase()),
    );
    const sorted = filtered.sort((a, b) => {
      const aVal = innovFieldValue(a, innovSortField);
      const bVal = innovFieldValue(b, innovSortField);
      if (aVal === bVal) return 0;
      if (innovSortDirection === "asc") return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });
    return sorted;
  }, [innovations, innovSearchTerm, innovSortField, innovSortDirection]);

  const paginatedInnovations = useMemo(() => {
    const start = (innovPage - 1) * innovRowsPerPage;
    return sortedInnovations.slice(start, start + innovRowsPerPage);
  }, [sortedInnovations, innovPage, innovRowsPerPage]);

  const innovTotalPages =
    Math.ceil(sortedInnovations.length / innovRowsPerPage) || 1;

  const {
    totalApplications,
    approvedApplications,
    pendingApplications,
    totalBudgetReceived,
    usedBudget,
    remainingBudget,
    successRate,
  } = teacherData.stats;

  const displayName = [
    teacherData.user_fname,
    teacherData.user_lname,
  ]
    .filter(Boolean)
    .join(" ");
  const affiliationLine = [
    teacherData.department,
    teacherData.faculty,
  ]
    .filter(Boolean)
    .join(", ");
  const positionLine = teacherData.position || "";

  const contactDetails = [
    teacherData.phone
      ? {
          key: "phone",
          icon: Phone,
          label: "เบอร์โทรศัพท์",
          value: teacherData.phone,
        }
      : null,
    teacherData.office
      ? {
          key: "office",
          icon: Building,
          label: "ห้องทำงาน",
          value: teacherData.office,
        }
      : null,
    teacherData.employeeId
      ? {
          key: "employeeId",
          icon: FileText,
          label: "รหัสพนักงาน",
          value: teacherData.employeeId,
        }
      : null,
    teacherData.joinDate
      ? {
          key: "joinDate",
          icon: Clock,
          label: "เข้าร่วมเมื่อ",
          value: formatThaiDate(teacherData.joinDate),
        }
      : null,
  ].filter(Boolean);

  const highlightChips = useMemo(() => {
    const chips = [];
    const total = formatNumber(totalApplications);
    if (total && Number(totalApplications) > 0) {
      chips.push(`คำร้องทั้งหมด ${total}`);
    }
    const approved = formatNumber(approvedApplications);
    if (approved && Number(approvedApplications) > 0) {
      chips.push(`อนุมัติ ${approved}`);
    }
    const pending = formatNumber(pendingApplications);
    if (pending && Number(pendingApplications) > 0) {
      chips.push(`รอดำเนินการ ${pending}`);
    }
    if (successRate && Number(successRate) > 0) {
      chips.push(`อัตราสำเร็จ ${successRate}%`);
    }
    const totalBudget = formatNumber(totalBudgetReceived);
    if (totalBudget && Number(totalBudgetReceived) > 0) {
      chips.push(`งบที่ขอ ${totalBudget} บาท`);
    }
    const used = formatNumber(usedBudget);
    if (used && Number(usedBudget) > 0) {
      chips.push(`ใช้ไปแล้ว ${used} บาท`);
    }
    const remaining = formatNumber(remainingBudget);
    if (remaining && Number(remainingBudget) > 0) {
      chips.push(`คงเหลือ ${remaining} บาท`);
    }
    return chips.slice(0, 6);
  }, [
    totalApplications,
    approvedApplications,
    pendingApplications,
    successRate,
    totalBudgetReceived,
    usedBudget,
    remainingBudget,
  ]);

  const quickLinks = teacherData.quickLinks || [];
  const hasQuickLinks = quickLinks.length > 0;

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
    <div className="px-4 py-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            <div className="relative">
              <div className="h-28 w-28 overflow-hidden rounded-full bg-gradient-to-br from-green-400 to-green-600 shadow-lg sm:h-32 sm:w-32">
                {teacherData.profileImage ? (
                  <img
                    src={teacherData.profileImage}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl font-semibold text-white">
                    {(displayName || teacherData.user_fname || teacherData.user_lname || "")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}
              </div>
              <button
                type="button"
                className="absolute -bottom-1 -right-1 rounded-full bg-blue-600 p-2 text-white shadow-md transition-colors hover:bg-blue-700"
              >
                <Camera size={16} />
              </button>
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-semibold text-gray-900 sm:text-3xl">
                {displayName || "ไม่ระบุชื่อ"}
              </h1>
              {affiliationLine && (
                <p className="mt-2 text-base text-gray-700">{affiliationLine}</p>
              )}
              {positionLine && (
                <p className="mt-1 text-sm text-gray-500">{positionLine}</p>
              )}
              {teacherData.email && (
                <div className="mt-3 flex items-center justify-center gap-3 text-sm text-gray-500 sm:justify-start">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <Mail size={16} />
                  </span>
                  <span>อีเมล (Email): {teacherData.email}</span>
                </div>
              )}
              {highlightChips.length > 0 && (
                <div className="mt-5 flex flex-wrap justify-center gap-2 sm:justify-start">
                  {highlightChips.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          {contactDetails.length > 0 && (
            <div className="mt-6 grid gap-4 border-t border-gray-100 pt-6 sm:grid-cols-2 lg:grid-cols-4">
              {contactDetails.map(({ key, icon: Icon, label, value }) => (
                <div key={key} className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50">
                    <Icon className="h-5 w-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {label}
                    </p>
                    <p className="break-all text-sm text-gray-700">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-8">
            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  ผลงานตีพิมพ์ (Publications)
                </h2>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="ค้นหาชื่อเรื่อง..."
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-64"
                  />
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>แสดง</span>
                    <select
                      value={rowsPerPage}
                      onChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="rounded-md border border-gray-300 px-2 py-2"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                    </select>
                    <span>รายการ</span>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                {pubLoading ? (
                  <div className="space-y-2 animate-pulse">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-6 rounded bg-gray-100" />
                    ))}
                  </div>
                ) : sortedPublications.length === 0 ? (
                  <p className="py-6 text-center text-gray-500">
                    ยังไม่มีผลงานตีพิมพ์
                  </p>
                ) : (
                  <>
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th
                            className="cursor-pointer px-4 py-2 text-left font-medium text-gray-700"
                            onClick={() => handleSort("title")}
                          >
                            ชื่อเรื่อง
                            {sortField === "title" ? (
                              sortDirection === "asc" ? (
                                <ArrowUp className="ml-1 inline" size={14} />
                              ) : (
                                <ArrowDown className="ml-1 inline" size={14} />
                              )
                            ) : (
                              <ArrowUpDown
                                className="ml-1 inline text-gray-400"
                                size={14}
                              />
                            )}
                          </th>
                          <th
                            className="w-24 cursor-pointer px-4 py-2 text-right font-medium text-gray-700"
                            onClick={() => handleSort("cited_by")}
                          >
                            อ้างโดย
                            {sortField === "cited_by" ? (
                              sortDirection === "asc" ? (
                                <ArrowUp className="ml-1 inline" size={14} />
                              ) : (
                                <ArrowDown className="ml-1 inline" size={14} />
                              )
                            ) : (
                              <ArrowUpDown
                                className="ml-1 inline text-gray-400"
                                size={14}
                              />
                            )}
                          </th>
                          <th
                            className="w-20 cursor-pointer px-4 py-2 text-center font-medium text-gray-700"
                            onClick={() => handleSort("year")}
                          >
                            ปี
                            {sortField === "year" ? (
                              sortDirection === "asc" ? (
                                <ArrowUp className="ml-1 inline" size={14} />
                              ) : (
                                <ArrowDown className="ml-1 inline" size={14} />
                              )
                            ) : (
                              <ArrowUpDown
                                className="ml-1 inline text-gray-400"
                                size={14}
                              />
                            )}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {paginatedPublications.map((pub) => (
                          <tr key={pub.id} className="hover:bg-gray-50">
                            <td className="max-w-xs px-4 py-2 lg:max-w-md">
                              {pub.url ? (
                                <a
                                  href={pub.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block truncate text-blue-600 hover:underline"
                                  title={pub.title}
                                >
                                  {pub.title}
                                </a>
                              ) : (
                                <span className="block truncate" title={pub.title}>
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
                              {pub.publication_year || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        แสดง {(currentPage - 1) * rowsPerPage + 1}-
                        {Math.min(
                          currentPage * rowsPerPage,
                          sortedPublications.length,
                        )} จาก {sortedPublications.length}
                      </span>
                      <div className="space-x-2">
                        <button
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="rounded border px-3 py-1 disabled:opacity-50"
                        >
                          ก่อนหน้า
                        </button>
                        <button
                          onClick={() =>
                            setCurrentPage((p) => Math.min(totalPages, p + 1))
                          }
                          disabled={currentPage === totalPages}
                          className="rounded border px-3 py-1 disabled:opacity-50"
                        >
                          ถัดไป
                        </button>
                      </div>
                    </div>
                    <ScholarCitationsCard
                      summary={citationInsights}
                      recentStartYear={recentStartYear}
                      formatNumber={formatNumber}
                    />
                  </>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  นวัตกรรม (Innovations)
                </h2>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <input
                    type="text"
                    value={innovSearchTerm}
                    onChange={(e) => {
                      setInnovSearchTerm(e.target.value);
                      setInnovPage(1);
                    }}
                    placeholder="ค้นหาชื่อเรื่อง..."
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-64"
                  />
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>แสดง</span>
                    <select
                      value={innovRowsPerPage}
                      onChange={(e) => {
                        setInnovRowsPerPage(parseInt(e.target.value));
                        setInnovPage(1);
                      }}
                      className="rounded-md border border-gray-300 px-2 py-2"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                    </select>
                    <span>รายการ</span>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                {innovLoading ? (
                  <div className="space-y-2 animate-pulse">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-6 rounded bg-gray-100" />
                    ))}
                  </div>
                ) : sortedInnovations.length === 0 ? (
                  <p className="py-6 text-center text-gray-500">ยังไม่มีนวัตกรรม</p>
                ) : (
                  <>
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th
                            className="cursor-pointer px-4 py-2 text-left font-medium text-gray-700"
                            onClick={() => handleInnovSort("title")}
                          >
                            ชื่อนวัตกรรม
                            {innovSortField === "title" ? (
                              innovSortDirection === "asc" ? (
                                <ArrowUp className="ml-1 inline" size={14} />
                              ) : (
                                <ArrowDown className="ml-1 inline" size={14} />
                              )
                            ) : (
                              <ArrowUpDown
                                className="ml-1 inline text-gray-400"
                                size={14}
                              />
                            )}
                          </th>
                          <th
                            className="w-40 cursor-pointer px-4 py-2 text-left font-medium text-gray-700"
                            onClick={() => handleInnovSort("innovation_type")}
                          >
                            ประเภท
                            {innovSortField === "innovation_type" ? (
                              innovSortDirection === "asc" ? (
                                <ArrowUp className="ml-1 inline" size={14} />
                              ) : (
                                <ArrowDown className="ml-1 inline" size={14} />
                              )
                            ) : (
                              <ArrowUpDown
                                className="ml-1 inline text-gray-400"
                                size={14}
                              />
                            )}
                          </th>
                          <th
                            className="w-32 cursor-pointer px-4 py-2 text-center font-medium text-gray-700"
                            onClick={() => handleInnovSort("registered_date")}
                          >
                            วันที่จดทะเบียน
                            {innovSortField === "registered_date" ? (
                              innovSortDirection === "asc" ? (
                                <ArrowUp className="ml-1 inline" size={14} />
                              ) : (
                                <ArrowDown className="ml-1 inline" size={14} />
                              )
                            ) : (
                              <ArrowUpDown
                                className="ml-1 inline text-gray-400"
                                size={14}
                              />
                            )}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {paginatedInnovations.map((inv) => (
                          <tr key={inv.id} className="hover:bg-gray-50">
                            <td className="max-w-xs px-4 py-2 lg:max-w-md">
                              <span className="block truncate" title={inv.title}>
                                {inv.title}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              <span className="block truncate" title={inv.innovation_type}>
                                {inv.innovation_type || "-"}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-center">
                              {formatThaiDate(inv.registered_date)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        แสดง {(innovPage - 1) * innovRowsPerPage + 1}-
                        {Math.min(
                          innovPage * innovRowsPerPage,
                          sortedInnovations.length,
                        )} จาก {sortedInnovations.length}
                      </span>
                      <div className="space-x-2">
                        <button
                          onClick={() => setInnovPage((p) => Math.max(1, p - 1))}
                          disabled={innovPage === 1}
                          className="rounded border px-3 py-1 disabled:opacity-50"
                        >
                          ก่อนหน้า
                        </button>
                        <button
                          onClick={() =>
                            setInnovPage((p) => Math.min(innovTotalPages, p + 1))
                          }
                          disabled={innovPage === innovTotalPages}
                          className="rounded border px-3 py-1 disabled:opacity-50"
                        >
                          ถัดไป
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900">สรุปงบประมาณ</h2>
              <div className="mt-4">
                <BudgetSummary
                  budget={{
                    total: teacherData.stats.totalBudgetReceived,
                    thisYear: teacherData.stats.usedBudget,
                    remaining: teacherData.stats.remainingBudget,
                  }}
                />
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h4 className="text-lg font-semibold text-gray-900">คำร้องของฉัน</h4>
              {hasQuickLinks ? (
                <div className="mt-4 space-y-3">
                  {quickLinks.map((link) => (
                    <button
                      type="button"
                      key={link.id ?? `${link.name}-${link.destination}`}
                      onClick={() =>
                        onNavigate &&
                        onNavigate(link.destination ? link.destination : "applications")
                      }
                      className="w-full rounded-lg border border-transparent px-3 py-2 text-left transition-colors hover:border-blue-200 hover:bg-blue-50"
                    >
                      <p className="text-sm font-medium text-gray-900" title={link.name}>
                        {link.name}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-blue-600">
                        {link.status}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-gray-500">ยังไม่มีคำร้องล่าสุด</p>
              )}
              <button
                type="button"
                onClick={() => onNavigate && onNavigate("applications")}
                className="mt-6 w-full text-center text-sm font-medium text-purple-600 transition-colors hover:text-purple-700"
              >
                ดูทั้งหมด
              </button>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}