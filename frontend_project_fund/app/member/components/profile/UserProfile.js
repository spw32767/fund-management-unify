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
import memberAPI from "@/app/lib/member_api";
import BudgetSummary from "@/app/member/components/dashboard/BudgetSummary";
import { useStatusMap } from "@/app/hooks/useStatusMap";

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

const CITATION_RECENT_START_YEAR = 2020;

const ScholarCitationsCard = ({ loading, metrics, formatNumber }) => {
  const totals = metrics?.totals || { all: null, recent: null };
  const hIndex = metrics?.hIndex || { all: null, recent: null };
  const i10Index = metrics?.i10Index || { all: null, recent: null };
  const chart = metrics?.chart || { data: [], isCitations: true };

  const renderValue = (value) => {
    if (value === null || value === undefined) {
      return "-";
    }
    if (typeof value === "number") {
      const formatted = formatNumber ? formatNumber(value) : value;
      return formatted ?? value;
    }
    return value;
  };

  const chartData = Array.isArray(chart.data) ? chart.data : [];
  const chartMax = chartData.reduce(
    (max, item) => (typeof item.value === "number" && item.value > max ? item.value : max),
    0,
  );

  const chartUnitLabel = chart.isCitations ? "การอ้างอิงต่อปี" : "จำนวนผลงานต่อปี";
  const chartValueLabel = chart.isCitations ? "การอ้างอิง" : "ผลงาน";

  const hasSummaryData =
    totals.all !== null ||
    totals.recent !== null ||
    hIndex.all !== null ||
    hIndex.recent !== null ||
    i10Index.all !== null ||
    i10Index.recent !== null;

  return (
    <div className="mt-6 rounded-xl border border-gray-100 bg-gradient-to-br from-white via-white to-slate-50 p-4 shadow-inner">
      <h3 className="text-lg font-semibold text-gray-900">อ้างโดย</h3>
      {loading ? (
        <div className="mt-4 space-y-3">
          <div className="h-16 animate-pulse rounded-md bg-gray-100" />
          <div className="h-28 animate-pulse rounded-md bg-gray-100" />
        </div>
      ) : (
        <>
          <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full text-sm text-gray-700">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">&nbsp;</th>
                  <th className="px-4 py-2 text-right font-medium">ทั้งหมด</th>
                  <th className="px-4 py-2 text-right font-medium">
                    ตั้งแต่ปี {CITATION_RECENT_START_YEAR}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="odd:bg-white even:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-600">การอ้างอิง</td>
                  <td className="px-4 py-2 text-right font-semibold text-gray-900">
                    {renderValue(totals.all)}
                  </td>
                  <td className="px-4 py-2 text-right font-semibold text-gray-900">
                    {renderValue(totals.recent)}
                  </td>
                </tr>
                <tr className="odd:bg-white even:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-600">ดัชนี h</td>
                  <td className="px-4 py-2 text-right font-semibold text-gray-900">
                    {renderValue(hIndex.all)}
                  </td>
                  <td className="px-4 py-2 text-right font-semibold text-gray-900">
                    {renderValue(hIndex.recent)}
                  </td>
                </tr>
                <tr className="odd:bg-white even:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-600">ดัชนี i10</td>
                  <td className="px-4 py-2 text-right font-semibold text-gray-900">
                    {renderValue(i10Index.all)}
                  </td>
                  <td className="px-4 py-2 text-right font-semibold text-gray-900">
                    {renderValue(i10Index.recent)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{chartUnitLabel}</span>
              {chart.isCitations ? null : (
                <span className="italic text-[11px] text-gray-400">
                  TODO: เปลี่ยนเป็นจำนวนการอ้างอิงเมื่อมีข้อมูล
                </span>
              )}
            </div>
            {chartData.length > 0 ? (
              <div className="mt-4 overflow-x-auto">
                <div className="relative">
                  <div className="pointer-events-none absolute inset-x-6 top-4 bottom-12">
                    <div className="flex h-full flex-col justify-between">
                      {[...Array(4)].map((_, idx) => (
                        <div
                          key={`grid-${idx}`}
                          className={`h-px w-full ${
                            idx === 0 ? "border-t border-slate-200/80" : "border-t border-dashed border-slate-200/70"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex h-48 min-w-max items-end gap-4 px-6 pb-12 pt-4">
                    {chartData.map(({ year, value }) => {
                      const numericValue = typeof value === "number" ? value : Number(value) || 0;
                      const ratio =
                        chartMax > 0
                          ? (numericValue / chartMax) * 100
                          : numericValue > 0
                            ? 100
                            : 0;
                      const basePercent = numericValue > 0 ? Math.max(ratio, 8) : 0;
                      const barPercent = Math.min(basePercent, 100);
                      const formattedValue =
                        typeof numericValue === "number"
                          ? (formatNumber ? formatNumber(numericValue) : numericValue)
                          : numericValue;
                      return (
                        <div
                          key={year}
                          className="group flex h-full min-w-[56px] flex-1 flex-col items-center justify-end text-[11px] text-gray-500"
                        >
                          <div className="flex h-full w-full items-end">
                            <div
                              className="relative w-full overflow-visible rounded-lg bg-gradient-to-t from-blue-500/80 via-blue-400 to-blue-300 shadow-sm transition-all duration-200 group-hover:from-blue-600 group-hover:via-blue-500 group-hover:to-blue-400"
                              style={{ height: `${barPercent}%` }}
                            >
                              <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-2 whitespace-nowrap rounded-md bg-slate-900/90 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-all duration-150 group-hover:-translate-y-3 group-hover:opacity-100">
                                <div>{formattedValue ?? "-"} {chartValueLabel}</div>
                                <div className="text-[10px] font-normal text-slate-300">{year}</div>
                              </div>
                            </div>
                          </div>
                          <span className="mt-3 text-xs font-medium text-gray-600">{year}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : hasSummaryData ? (
              <p className="mt-3 text-sm text-gray-500">ไม่มีข้อมูลเพียงพอสำหรับสร้างกราฟ</p>
            ) : (
              <p className="mt-3 text-sm text-gray-500">ยังไม่มีข้อมูลการอ้างอิง</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default function ProfileContent() {
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
  const [activeTab, setActiveTab] = useState("publications");
  const { getLabelById } = useStatusMap();

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
        memberAPI.getDashboardStats(),
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
          status:
            getLabelById(app.status_id) ||
            app.status_name ||
            "ดูรายละเอียด",
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
      const res = await memberAPI.getUserPublications({ limit: 1000 });
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
      const res = await memberAPI.getUserInnovations({ limit: 1000 });
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

  const citationMetrics = useMemo(() => {
    if (!publications || publications.length === 0) {
      return {
        totals: { all: null, recent: null },
        hIndex: { all: null, recent: null },
        i10Index: { all: null, recent: null },
        chart: { data: [], isCitations: true },
      };
    }

    const toNumber = (value) => {
      if (value === null || value === undefined) return null;
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed === "") return null;
        const num = Number(trimmed);
        return Number.isFinite(num) ? num : null;
      }
      const num = Number(value);
      return Number.isFinite(num) ? num : null;
    };

    const parseHistory = (raw) => {
      if (!raw) return {};
      let parsed = raw;
      if (typeof raw === "string") {
        try {
          parsed = JSON.parse(raw);
        } catch {
          return {};
        }
      }
      if (Array.isArray(parsed)) {
        return parsed.reduce((acc, entry) => {
          if (Array.isArray(entry) && entry.length >= 2) {
            const [year, count] = entry;
            if (year !== undefined && count !== undefined) {
              acc[year] = count;
            }
          } else if (entry && typeof entry === "object") {
            const year = entry.year ?? entry.Year ?? entry.y;
            const count =
              entry.citations ??
              entry.Citations ??
              entry.count ??
              entry.value ??
              entry.total;
            if (year !== undefined && count !== undefined) {
              acc[year] = count;
            }
          }
          return acc;
        }, {});
      }
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
      return {};
    };

    const perYearMap = new Map();
    const publicationCountMap = new Map();
    const allCitationCounts = [];
    const recentCitationCounts = [];
    let totalCitations = 0;

    publications.forEach((pub) => {
      if (Object.prototype.hasOwnProperty.call(pub, "cited_by")) {
        const totalCited = toNumber(pub.cited_by);
        if (totalCited !== null) {
          totalCitations += totalCited;
          allCitationCounts.push(totalCited);
        }
      }

      const pubYear = toNumber(pub.publication_year);
      if (pubYear !== null) {
        publicationCountMap.set(
          pubYear,
          (publicationCountMap.get(pubYear) || 0) + 1,
        );
      }

      const history = parseHistory(pub.citation_history);
      const entries = Object.entries(history);
      if (entries.length > 0) {
        let recentSumForPub = 0;
        entries.forEach(([yearKey, rawCount]) => {
          const yearNum = Number(yearKey);
          const countNum = toNumber(rawCount);
          if (!Number.isFinite(yearNum) || countNum === null) return;
          perYearMap.set(yearNum, (perYearMap.get(yearNum) || 0) + countNum);
          if (yearNum >= CITATION_RECENT_START_YEAR) {
            recentSumForPub += countNum;
          }
        });
        recentCitationCounts.push(recentSumForPub);
      }
    });

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

    const hasOverallCitations = allCitationCounts.length > 0;
    const hasPerYearCitations = perYearMap.size > 0;

    let chartData = [];
    let isCitationsChart = true;
    if (hasPerYearCitations) {
      chartData = Array.from(perYearMap.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([year, value]) => ({ year, value }));
    } else {
      isCitationsChart = false;
      // TODO: Switch to citation counts once the API exposes per-year citation data.
      chartData = Array.from(publicationCountMap.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([year, value]) => ({ year, value }));
    }

    const recentTotal = hasPerYearCitations
      ? Array.from(perYearMap.entries()).reduce(
          (sum, [year, value]) =>
            year >= CITATION_RECENT_START_YEAR ? sum + value : sum,
          0,
        )
      : null;

    return {
      totals: {
        all: hasOverallCitations ? totalCitations : null,
        recent: hasPerYearCitations ? recentTotal : null,
      },
      hIndex: {
        all: hasOverallCitations ? computeHIndex(allCitationCounts) : null,
        recent: hasPerYearCitations ? computeHIndex(recentCitationCounts) : null,
      },
      i10Index: {
        all: hasOverallCitations ? computeI10(allCitationCounts) : null,
        recent: hasPerYearCitations ? computeI10(recentCitationCounts) : null,
      },
      chart: {
        data: chartData,
        isCitations: isCitationsChart,
      },
    };
  }, [publications]);

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

        <div className="space-y-8">
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-6 border-b border-gray-200">
              <nav className="-mb-[1px] flex flex-wrap gap-2 overflow-x-auto">
                {[
                  { key: "publications", label: "ผลงานตีพิมพ์ (Publications)" },
                  { key: "innovations", label: "นวัตกรรม (Innovations)" },
                ].map((tab) => {
                  const isActive = tab.key === activeTab;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`whitespace-nowrap rounded-t-md border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? "border-blue-600 bg-white text-blue-600"
                          : "border-transparent text-gray-500 hover:border-blue-200 hover:text-blue-600"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {activeTab === "publications" ? (
              <div className="space-y-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <h3 className="text-base font-semibold text-gray-900 lg:text-lg">
                    รายการผลงานตีพิมพ์
                  </h3>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
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
                    </>
                  )}
                </div>
                <ScholarCitationsCard
                  loading={pubLoading}
                  metrics={citationMetrics}
                  formatNumber={formatNumber}
                />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <h3 className="text-base font-semibold text-gray-900 lg:text-lg">
                    รายการนวัตกรรม
                  </h3>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
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
              </div>
            )}
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
      </div>
    </div>
  );
}