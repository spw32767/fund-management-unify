"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Mail,
  Phone,
  Building,
  FileText,
  Clock,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  UserCircle,
  Download,
} from "lucide-react";

import profileAPI from "@/app/lib/profile_api";
import memberAPI from "@/app/lib/member_api";
import BudgetSummary from "@/app/member/components/dashboard/BudgetSummary";
import { useStatusMap } from "@/app/hooks/useStatusMap";
import PageLayout from "../common/PageLayout";
import { toast } from "react-hot-toast";
import { downloadXlsx } from "@/app/admin/utils/xlsxExporter";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center text-sm text-gray-500">
      กำลังโหลดกราฟ...
    </div>
  ),
});

// Default data structure for the profile
const defaultTeacherData = {
  user_id: null,
  prefix: "",
  suffix: "",
  user_fname: "",
  user_lname: "",
  english_name: "",
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

const createDefaultScopusStats = () => ({
  trend: [],
  totals: { documents: null, citations: null },
  meta: { has_scopus_id: true, has_author_record: true },
});

const EXPORT_COLUMNS = [
  { key: "rowNumber", header: "ลำดับ", width: 8 },
  { key: "scopusId", header: "scopus_id", width: 14 },
  { key: "scopusLink", header: "scopus_link", width: 30 },
  { key: "title", header: "title", width: 60 },
  { key: "abstract", header: "abstract", width: 60 },
  { key: "aggregationType", header: "aggregation_type", width: 18 },
  { key: "sourceId", header: "source_id", width: 18 },
  { key: "publicationName", header: "publication_name", width: 36 },
  { key: "issn", header: "issn", width: 18 },
  { key: "eissn", header: "eissn", width: 18 },
  { key: "isbn", header: "isbn", width: 18 },
  { key: "volume", header: "volume", width: 12 },
  { key: "issue", header: "issue", width: 12 },
  { key: "pageRange", header: "page_range", width: 16 },
  { key: "articleNumber", header: "article_number", width: 18 },
  { key: "coverDate", header: "cover_date", width: 18 },
  { key: "doi", header: "doi", width: 22 },
  { key: "citedBy", header: "citedby_count", width: 12 },
  { key: "authkeywords", header: "authkeywords", width: 28 },
  { key: "fundSponsor", header: "fund_sponsor", width: 28 },
  { key: "citeScoreStatus", header: "cite_score_status", width: 18 },
  { key: "citeScoreRank", header: "cite_score_rank", width: 14 },
  { key: "citeScorePercentile", header: "cite_score_percentile", width: 16 },
  { key: "citeScoreQuartile", header: "cite_score_quartile", width: 16 },
  { key: "year", header: "publication_year", width: 12 },
  { key: "eid", header: "eid", width: 22 },
  { key: "scopusUrl", header: "scopus_url", width: 32 },
  { key: "doiUrl", header: "doi_url", width: 32 },
];

const CITATION_RECENT_START_YEAR = 2020;

const ScopusTrendCard = ({ scopusStats, scopusLoading, formatNumber }) => {
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

  const renderSkeleton = () => (
    <div className="mt-6 rounded-xl border border-gray-100 bg-gradient-to-br from-white via-white to-slate-50 p-4 shadow-inner">
      <h3 className="text-lg font-semibold text-gray-900">
        Documents & Citations by Year (Scopus)
      </h3>
      <div className="mt-4 space-y-3">
        <div className="h-16 animate-pulse rounded-md bg-gray-100" />
        <div className="h-28 animate-pulse rounded-md bg-gray-100" />
      </div>
    </div>
  );

  if (scopusLoading) {
    return renderSkeleton();
  }

  const scopusTrend = Array.isArray(scopusStats?.trend) ? scopusStats.trend : [];
  const scopusTotals = scopusStats?.totals || {};
  const scopusMeta = scopusStats?.meta || {};
  const hasScopusTrend = scopusTrend.length > 0;
  const hasScopusTotals =
    scopusTotals.documents !== null || scopusTotals.citations !== null;
  const scopusUnavailable =
    scopusMeta.has_scopus_id === false || scopusMeta.has_author_record === false;

  if ((hasScopusTrend || hasScopusTotals) && !scopusUnavailable) {
    const sortedTrend = [...scopusTrend].sort((a, b) => (a.year || 0) - (b.year || 0));
    const yearLabels = sortedTrend.map((point) =>
      point.year === null || point.year === undefined ? "ไม่ระบุ" : `${point.year}`,
    );
    const documentSeries = sortedTrend.map((point) => point.documents || 0);
    const citationSeries = sortedTrend.map((point) => point.citations || 0);
    const chartHasSeries =
      documentSeries.some((value) => value > 0) ||
      citationSeries.some((value) => value > 0);
    const scopusRecent = sortedTrend.reduce(
      (acc, point) => {
        if (point.year >= CITATION_RECENT_START_YEAR) {
          acc.documents += point.documents || 0;
          acc.citations += point.citations || 0;
        }
        return acc;
      },
      { documents: 0, citations: 0 },
    );
    const summaryItems = [
      {
        label: "ผลงานทั้งหมด",
        value: renderValue(scopusTotals.documents ?? 0),
      },
      {
        label: "การอ้างอิงทั้งหมด",
        value: renderValue(scopusTotals.citations ?? 0),
      },
      {
        label: `ผลงานตั้งแต่ปี ${CITATION_RECENT_START_YEAR}`,
        value: renderValue(scopusRecent.documents ?? 0),
      },
      {
        label: `การอ้างอิงตั้งแต่ปี ${CITATION_RECENT_START_YEAR}`,
        value: renderValue(scopusRecent.citations ?? 0),
      },
    ];

    const axisLabelFormatter = (value) => {
      if (typeof value !== "number" || Number.isNaN(value)) {
        return value;
      }
      return formatNumber ? formatNumber(value) : value;
    };

    const chartOptions = {
      chart: {
        type: "line",
        stacked: false,
        toolbar: { show: false },
        background: "transparent",
        zoom: { enabled: false },
        animations: { enabled: false },
      },
      stroke: { width: [0, 3], curve: "smooth" },
      plotOptions: {
        bar: {
          borderRadius: 6,
          columnWidth: "45%",
        },
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: yearLabels,
        axisBorder: { color: "#e5e7eb" },
        axisTicks: { color: "#e5e7eb" },
        labels: {
          style: {
            colors: yearLabels.map(() => "#6b7280"),
            fontSize: "12px",
          },
        },
      },
      yaxis: [
        {
          title: { text: "Documents" },
          labels: { formatter: axisLabelFormatter },
        },
        {
          opposite: true,
          title: { text: "Citations" },
          labels: { formatter: axisLabelFormatter },
        },
      ],
      grid: { borderColor: "#f1f5f9", strokeDashArray: 4 },
      legend: {
        position: "top",
        horizontalAlign: "left",
        fontSize: "13px",
        labels: { colors: "#0f172a" },
      },
      colors: ["#0ea5e9", "#7c3aed"],
      tooltip: { shared: true, intersect: false },
      fill: { opacity: [0.85, 1] },
    };

    const chartSeries = [
      { name: "Documents", type: "column", data: documentSeries },
      { name: "Citations", type: "line", data: citationSeries },
    ];

    return (
      <div className="mt-6 rounded-xl border border-gray-100 bg-gradient-to-br from-white via-white to-slate-50 p-4 shadow-inner">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold text-gray-900">
            Documents & Citations by Year (Scopus)
          </h3>
          <p className="text-sm text-gray-500">
            ข้อมูลจาก Scopus แสดงจำนวนผลงาน (แท่ง) และการอ้างอิง (เส้น)
          </p>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summaryItems.map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-gray-100 bg-white/70 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {label}
              </p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
            </div>
          ))}
        </div>
        {hasScopusTrend ? (
          chartHasSeries ? (
            <div className="mt-6">
              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-6 rounded-full bg-sky-500" />
                  <span>Documents</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-0.5 w-8 bg-indigo-600" />
                  <span>Citations</span>
                </div>
              </div>
              <div className="mt-4 w-full overflow-hidden">
                <div className="w-full">
                  <ReactApexChart
                    options={chartOptions}
                    series={chartSeries}
                    type="line"
                    height={360}
                    width="100%"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-lg border border-dashed border-slate-200 bg-white/70 p-6 text-center text-sm text-gray-500">
              ยังไม่มีข้อมูลสำหรับสร้างกราฟ
            </div>
          )
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-gray-100 bg-gradient-to-br from-white via-white to-slate-50 p-4 text-center text-sm text-gray-500">
      <h3 className="text-lg font-semibold text-gray-900">
        Documents & Citations by Year (Scopus)
      </h3>
      <div className="mt-4 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4">
        {scopusUnavailable
          ? "ยังไม่มีข้อมูลจาก Scopus สำหรับผู้ใช้นี้"
          : "ยังไม่มีข้อมูลแนวโน้มจาก Scopus สำหรับสร้างกราฟ"}
      </div>
    </div>
  );
};

const ScholarCitationsCard = ({ metrics, scholarLoading, formatNumber }) => {
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

  const renderSkeleton = (title = "อ้างโดย") => (
    <div className="mt-6 rounded-xl border border-gray-100 bg-gradient-to-br from-white via-white to-slate-50 p-4 shadow-inner">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <div className="mt-4 space-y-3">
        <div className="h-16 animate-pulse rounded-md bg-gray-100" />
        <div className="h-28 animate-pulse rounded-md bg-gray-100" />
      </div>
    </div>
  );

  if (scholarLoading) {
    return renderSkeleton();
  }

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
    </div>
  );
};

export default function ProfileContent() {
  const [teacherData, setTeacherData] = useState(defaultTeacherData);
  const [loading, setLoading] = useState(true);
  const [scholarPublications, setScholarPublications] = useState([]);
  const [scholarLoading, setScholarLoading] = useState(true);
  const [scopusPublications, setScopusPublications] = useState([]);
  const [scopusLoading, setScopusLoading] = useState(true);
  const [scopusMeta, setScopusMeta] = useState({
    has_scopus_id: true,
    has_author_record: true,
  });
  const [scopusStats, setScopusStats] = useState(() => createDefaultScopusStats());
  const [scopusStatsLoading, setScopusStatsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [startYear, setStartYear] = useState("");
  const [endYear, setEndYear] = useState("");
  const [sortField, setSortField] = useState("year");
  const [sortDirection, setSortDirection] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [exporting, setExporting] = useState(false);

  const [innovations, setInnovations] = useState([]);
  const [innovLoading, setInnovLoading] = useState(true);
  const [innovSearchTerm, setInnovSearchTerm] = useState("");
  const [innovSortField, setInnovSortField] = useState("registered_date");
  const [innovSortDirection, setInnovSortDirection] = useState("desc");
  const [innovPage, setInnovPage] = useState(1);
  const [innovRowsPerPage, setInnovRowsPerPage] = useState(10);
  const [activeSource, setActiveSource] = useState("scopus");
  const [hasUserSelectedSource, setHasUserSelectedSource] = useState(false);
  const [activeTab, setActiveTab] = useState("publications");
  const { getLabelById } = useStatusMap();
  const scopusUnavailable =
    !scopusMeta.has_scopus_id || !scopusMeta.has_author_record;

  useEffect(() => {
    loadProfileData();
    loadScholarPublications();
    loadInnovations();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeSource]);

  useEffect(() => {
    if (
      activeSource === "scopus" &&
      scopusUnavailable &&
      !hasUserSelectedSource &&
      !scopusLoading
    ) {
      setActiveSource("scholar");
    }
  }, [activeSource, scopusUnavailable, hasUserSelectedSource, scopusLoading]);

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

  const getPublicationYear = useCallback((pub) => {
    const yearCandidate =
      pub.publication_year ||
      pub.year ||
      pub.cover_year ||
      pub.coverYear ||
      (() => {
        const dateValue = pub.cover_date || pub.coverDate || pub.publication_date;
        if (!dateValue) return null;
        const date = new Date(dateValue);
        return Number.isNaN(date.getTime()) ? null : date.getFullYear();
      })();

    if (!yearCandidate) return null;
    const parsed = Number(yearCandidate);
    return Number.isFinite(parsed) ? parsed : null;
  }, []);

  const isYearWithinRange = useCallback(
    (year) => {
      const hasStart = startYear !== "";
      const hasEnd = endYear !== "";

      if (!hasStart && !hasEnd) return true;
      if (year === null || year === undefined) return false;

      const yearNum = Number(year);
      if (!Number.isFinite(yearNum)) return false;

      if (hasStart && yearNum < Number(startYear)) {
        return false;
      }
      if (hasEnd && yearNum > Number(endYear)) {
        return false;
      }
      return true;
    },
    [endYear, startYear],
  );

  const filteredYears = useMemo(() => {
    const years = new Set();
    [...scopusPublications, ...scholarPublications].forEach((pub) => {
      const year = getPublicationYear(pub);
      if (year) {
        years.add(year);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [getPublicationYear, scopusPublications, scholarPublications]);

  const formatNumber = (value) => {
    if (value === null || value === undefined) return null;
    const num = Number(value);
    if (Number.isNaN(num)) return null;
    return new Intl.NumberFormat("th-TH").format(num);
  };

  const clearYearRange = () => {
    setStartYear("");
    setEndYear("");
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    clearYearRange();
  };

  const quartileBadgeClass = (quartile) => {
    const normalized = quartile?.toUpperCase();
    switch (normalized) {
      case "Q1":
        return "bg-emerald-100 text-emerald-700";
      case "Q2":
        return "bg-sky-100 text-sky-700";
      case "Q3":
        return "bg-amber-100 text-amber-700";
      case "Q4":
        return "bg-rose-100 text-rose-700";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const formatPercentile = (value) => {
    if (value === null || value === undefined) return null;
    const num = Number(value);
    if (!Number.isFinite(num)) return null;
    return formatNumber(num);
  };

  const buildExportRows = useCallback((items, startOffset = 0) => {
    if (!Array.isArray(items) || items.length === 0) return [];
    const formatCoverDate = (value) => {
      if (!value) return "";
      const date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(date.getTime())) return String(value);
      return date.toISOString().split("T")[0];
    };
    return items.map((pub, index) => {
      const rowNumber = startOffset + index + 1;
      const citedByValue =
        pub.cited_by !== undefined && pub.cited_by !== null ? pub.cited_by : "";
      const keywords = Array.isArray(pub.keywords)
        ? pub.keywords.join("; ")
        : pub.keywords || pub.authkeywords || "";
      const coverDate = pub.cover_date || pub.coverDate || null;
      const coverYear = (() => {
        if (!coverDate) return "";
        const date = coverDate instanceof Date ? coverDate : new Date(coverDate);
        return Number.isNaN(date.getTime()) ? "" : date.getFullYear();
      })();

      return {
        rowNumber,
        scopusId: pub.scopus_id || pub.scopusID || "",
        scopusLink: pub.scopus_url || pub.scopus_link || "",
        title: pub.title || "",
        abstract: pub.abstract || "",
        aggregationType: pub.aggregation_type || "",
        sourceId: pub.source_id || "",
        publicationName: pub.publication_name || pub.venue || "",
        issn: pub.issn || "",
        eissn: pub.eissn || "",
        isbn: pub.isbn || "",
        volume: pub.volume || "",
        issue: pub.issue || "",
        pageRange: pub.page_range || "",
        articleNumber: pub.article_number || "",
        coverDate: formatCoverDate(coverDate),
        doi: pub.doi || "",
        citedBy: citedByValue,
        authkeywords: keywords,
        fundSponsor: pub.fund_sponsor || "",
        citeScoreStatus:
          pub.cite_score_status ?? pub.scopus_source_metrics?.cite_score_status ?? "",
        citeScoreRank: pub.cite_score_rank ?? pub.scopus_source_metrics?.cite_score_rank ?? "",
        citeScorePercentile:
          pub.cite_score_percentile ?? pub.scopus_source_metrics?.cite_score_percentile ?? "",
        citeScoreQuartile:
          (pub.cite_score_quartile || pub.scopus_source_metrics?.cite_score_quartile || "")?.toUpperCase(),
        year: pub.publication_year || coverYear,
        eid: pub.eid || "",
        scopusUrl: pub.scopus_url || "",
        doiUrl: pub.doi || pub.doi_url || pub.url || "",
      };
    });
  }, []);
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

      const englishPrefix =
        profile.prefix_position_en ||
        profile.prefix_en ||
        profile.title_en ||
        "";
      const englishFullName = (
        profile.name_en ||
        profile.full_name_en ||
        [
          profile.user_fname_en ||
            profile.first_name_en ||
            profile.given_name_en ||
            profile.en_first_name ||
            "",
          profile.user_lname_en ||
            profile.last_name_en ||
            profile.family_name_en ||
            profile.en_last_name ||
            "",
        ]
          .filter(Boolean)
          .join(" ")
      ).trim();
      const englishName = [englishPrefix, englishFullName]
        .filter(Boolean)
        .join(" ")
        .trim();

      setTeacherData({
        user_id: profile.user_id,
        prefix:
          profile.prefix ||
          profile.prefix_name ||
          profile.title ||
          profile.position ||
          "",
        suffix: profile.suffix || profile.suffix_name || "",
        user_fname: profile.user_fname,
        user_lname: profile.user_lname,
        english_name: englishName,
        position: profile.position_name,
        department: profile.department || "",
        faculty: profile.faculty || "",
        email: profile.email,
        phone:
          profile.phone ||
          profile.tel ||
          profile.TEL ||
          profile.users?.TEL ||
          profile.users?.tel ||
          "",
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

  const loadScholarPublications = async () => {
    try {
      setScholarLoading(true);
      const res = await memberAPI.getUserPublications({ limit: 1000 });
      const items = res.data || res.items || [];
      setScholarPublications(items);
    } catch (error) {
      console.error("Error loading publications:", error);
    } finally {
      setScholarLoading(false);
    }
  };

  const loadScopusStats = useCallback(async () => {
    try {
      setScopusStatsLoading(true);
      const res = await memberAPI.getUserScopusPublicationStats();
      const data = res?.data || res?.stats || {};
      const metaPayload = res?.meta || data.meta || {};
      const normalizeCount = (value) => {
        if (value === null || value === undefined) {
          return null;
        }
        const num = Number(value);
        return Number.isFinite(num) ? num : null;
      };
      const normalizedTrend = Array.isArray(data.trend)
        ? data.trend
            .map((point) => {
              if (!point || typeof point !== "object") return null;
              const year = Number(point.year ?? point.Year ?? point.cover_year);
              if (!Number.isFinite(year) || year === 0) return null;
              const documentsRaw =
                point.documents ??
                point.Documents ??
                point.document_count ??
                point.docs ??
                0;
              const citationsRaw =
                point.citations ??
                point.Citations ??
                point.citation_count ??
                point.cites ??
                0;
              const documents = Number(documentsRaw);
              const citations = Number(citationsRaw);
              return {
                year,
                documents: Number.isFinite(documents) ? documents : 0,
                citations: Number.isFinite(citations) ? citations : 0,
              };
            })
            .filter(Boolean)
        : [];

      setScopusStats({
        trend: normalizedTrend,
        totals: {
          documents:
            normalizeCount(
              data.total_documents ?? data.documents ?? data.total_docs,
            ),
          citations:
            normalizeCount(
              data.total_citations ?? data.citations ?? data.total_cites,
            ),
        },
        meta: {
          has_scopus_id:
            typeof metaPayload.has_scopus_id === "boolean"
              ? metaPayload.has_scopus_id
              : true,
          has_author_record:
            typeof metaPayload.has_author_record === "boolean"
              ? metaPayload.has_author_record
              : true,
        },
      });
    } catch (error) {
      console.error("Error loading Scopus stats:", error);
      setScopusStats(createDefaultScopusStats());
    } finally {
      setScopusStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadScopusStats();
  }, [loadScopusStats]);

  const loadScopusPublications = useCallback(async () => {
    if (activeSource !== "scopus") {
      return;
    }
    try {
      setScopusLoading(true);
      const params = {
        limit: 1000,
        sort: sortField,
        direction: sortDirection,
      };
      if (searchTerm.trim()) {
        params.q = searchTerm.trim();
      }
      const res = await memberAPI.getUserScopusPublications(params);
      const items = res.data || res.items || [];
      setScopusPublications(items);
      const meta = res.meta || {};
      setScopusMeta({
        has_scopus_id: Boolean(meta.has_scopus_id),
        has_author_record: Boolean(meta.has_author_record),
      });
    } catch (error) {
      console.error("Error loading Scopus publications:", error);
      setScopusPublications([]);
    } finally {
      setScopusLoading(false);
    }
  }, [activeSource, sortField, sortDirection, searchTerm]);

  useEffect(() => {
    if (activeSource === "scopus") {
      loadScopusPublications();
    }
  }, [activeSource, loadScopusPublications]);

  useEffect(() => {
    setCurrentPage(1);
  }, [startYear, endYear]);

  const handleSourceChange = useCallback(
    (value) => {
      setHasUserSelectedSource(true);
      setActiveSource(value);
    },
    [setActiveSource, setHasUserSelectedSource],
  );

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

  const scholarFieldValue = (item, field) => {
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

  const matchesYearRange = useCallback(
    (pub) => {
      const year = getPublicationYear(pub);
      return isYearWithinRange(year);
    },
    [getPublicationYear, isYearWithinRange],
  );

  const scholarPublicationsInRange = useMemo(
    () => scholarPublications.filter((p) => matchesYearRange(p)),
    [matchesYearRange, scholarPublications],
  );

  const filteredScholarPublications = useMemo(() => {
    const filtered = scholarPublicationsInRange.filter((p) =>
      p.title?.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    const sorted = filtered.sort((a, b) => {
      const aVal = scholarFieldValue(a, sortField);
      const bVal = scholarFieldValue(b, sortField);
      if (aVal === bVal) return 0;
      if (sortDirection === "asc") return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });
    return sorted;
  }, [scholarPublicationsInRange, searchTerm, sortDirection, sortField]);

  const paginatedScholarPublications = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredScholarPublications.slice(start, start + rowsPerPage);
  }, [filteredScholarPublications, currentPage, rowsPerPage]);

  const citationMetrics = useMemo(() => {
    if (!scholarPublicationsInRange || scholarPublicationsInRange.length === 0) {
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

    scholarPublicationsInRange.forEach((pub) => {
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
          if (
            !Number.isFinite(yearNum) ||
            countNum === null ||
            !isYearWithinRange(yearNum)
          )
            return;
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
  }, [isYearWithinRange, scholarPublicationsInRange]);

  const filteredScopusPublications = useMemo(
    () => scopusPublications.filter((p) => matchesYearRange(p)),
    [matchesYearRange, scopusPublications],
  );

  const handleExportScopus = useCallback(async () => {
    if (activeSource !== "scopus") return;
    setExporting(true);
    try {
      const limit = 200;
      let offset = 0;
      let total;
      const allRows = [];

      while (true) {
        const params = { limit, offset, sort: sortField, direction: sortDirection };
        if (searchTerm.trim()) {
          params.q = searchTerm.trim();
        }

        const res = await memberAPI.getUserScopusPublications(params);
        const items = Array.isArray(res?.data || res?.items) ? res.data || res.items : [];
        const paging = res?.meta || res?.paging || {};
        total = paging.total ?? total;
        const pageLimit = paging.limit || limit;

        const filteredItems = items.filter((pub) => matchesYearRange(pub));
        allRows.push(...buildExportRows(filteredItems, allRows.length));

        if (items.length < pageLimit) {
          break;
        }
        offset += pageLimit;

        if (total !== undefined && offset >= total) {
          break;
        }
      }

      if (allRows.length === 0) {
        toast.error("ไม่พบข้อมูลงานวิจัยสำหรับส่งออก");
        return;
      }

      const timestamp = new Date().toISOString().replace(/[:T]/g, "-").split(".")[0];
      const filename = `my_scopus_publications_${timestamp}.xlsx`;
      downloadXlsx(EXPORT_COLUMNS, allRows, {
        sheetName: "Scopus Publications",
        filename,
      });
      toast.success(`ส่งออก ${allRows.length} รายการเรียบร้อยแล้ว`);
    } catch (error) {
      console.error("Export Scopus publications error", error);
      toast.error("ไม่สามารถส่งออกไฟล์ได้");
    } finally {
      setExporting(false);
    }
  }, [
    activeSource,
    buildExportRows,
    matchesYearRange,
    searchTerm,
    sortDirection,
    sortField,
  ]);

  const scopusTrend = useMemo(
    () => (Array.isArray(scopusStats?.trend) ? scopusStats.trend : []),
    [scopusStats],
  );

  const scopusTrendForRange = useMemo(
    () => scopusTrend.filter((point) => isYearWithinRange(point?.year)),
    [isYearWithinRange, scopusTrend],
  );

  const scopusStatsMeta = scopusStats?.meta || {};
  const scopusTotals = scopusStats?.totals || {};

  const scopusTotalsForRange = useMemo(() => {
    if (startYear === "" && endYear === "") {
      return scopusTotals;
    }
    if (scopusTrendForRange.length === 0) {
      return { documents: null, citations: null };
    }
    return scopusTrendForRange.reduce(
      (acc, point) => ({
        documents: acc.documents + (point.documents || 0),
        citations: acc.citations + (point.citations || 0),
      }),
      { documents: 0, citations: 0 },
    );
  }, [endYear, scopusTotals, scopusTrendForRange, startYear]);

  const scopusStatsForDisplay = useMemo(
    () => ({
      trend: scopusTrendForRange,
      totals: scopusTotalsForRange,
      meta: scopusStatsMeta,
    }),
    [scopusStatsMeta, scopusTotalsForRange, scopusTrendForRange],
  );
  const paginatedScopusPublications = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredScopusPublications.slice(start, start + rowsPerPage);
  }, [currentPage, filteredScopusPublications, rowsPerPage]);

  const totalPages = useMemo(() => {
    if (activeSource === "scopus") {
      const pages = Math.ceil((filteredScopusPublications.length || 0) / rowsPerPage);
      return pages > 0 ? pages : 1;
    }
    const pages = Math.ceil(filteredScholarPublications.length / rowsPerPage);
    return pages > 0 ? pages : 1;
  }, [
    activeSource,
    filteredScholarPublications.length,
    filteredScopusPublications.length,
    rowsPerPage,
  ]);

  const isScopusActive = activeSource === "scopus";
  const tablePublications = isScopusActive
    ? paginatedScopusPublications
    : paginatedScholarPublications;
  const tableLoading = isScopusActive ? scopusLoading : scholarLoading;
  const totalRecords = isScopusActive
    ? filteredScopusPublications.length
    : filteredScholarPublications.length;
  const startRecord =
    totalRecords === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const endRecord =
    totalRecords === 0 ? 0 : Math.min(currentPage * rowsPerPage, totalRecords);
  const canExportScopus =
    isScopusActive &&
    !scopusLoading &&
    !scopusUnavailable &&
    filteredScopusPublications.length > 0;

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
      case "submission_number":
        return item.submission_number?.toLowerCase() || "";
      case "innovation_type":
        return item.innovation_type?.toLowerCase() || "";
      case "status_name":
        return item.status_name?.toLowerCase() || "";
      case "registered_date":
      default: {
        const d = parseDate(item.registered_date);
        return d ? d.getTime() : 0; // numeric for correct asc/desc sorting
      }
    }
  };

  const sortedInnovations = useMemo(() => {
    const filtered = innovations.filter((i) =>
      [i.title, i.innovation_type, i.submission_number, i.status_name]
        .filter(Boolean)
        .some((val) =>
          val.toLowerCase().includes(innovSearchTerm.toLowerCase()),
        ),
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

  const displayName = [
    teacherData.prefix,
    teacherData.user_fname,
    teacherData.user_lname,
  ]
    .filter(Boolean)
    .join(" ");
  const englishNameLine = teacherData.english_name?.trim();
  const suffixLine = teacherData.suffix?.trim() || "";
  const secondaryNameLine = [suffixLine, englishNameLine]
    .filter(Boolean)
    .join(" · ");
  const affiliationLine = [
    teacherData.department,
    teacherData.faculty,
  ]
    .filter(Boolean)
    .join(", ");
  const positionLine = teacherData.position || "";

  const contactDetails = [
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

  if (loading) {
    return (
      <PageLayout
        title="ข้อมูลส่วนตัว"
        subtitle="ดูข้อมูลส่วนบุคคลและสถิติการยื่นคำร้องของคุณ"
        icon={UserCircle}
        breadcrumbs={[
          { label: "หน้าแรก", href: "/member" },
          { label: "ข้อมูลส่วนตัว" },
        ]}
        loading
      />
    );
  }

  return (
    <PageLayout
      title="ข้อมูลส่วนตัว"
      subtitle="ดูข้อมูลส่วนบุคคลและสถิติการยื่นคำร้องของคุณ"
      icon={UserCircle}
      breadcrumbs={[
        { label: "หน้าแรก", href: "/member" },
        { label: "ข้อมูลส่วนตัว" },
      ]}
    >
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
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-2xl font-semibold text-gray-900 sm:text-3xl">
                  {displayName || "ไม่ระบุชื่อ"}
                </h1>
                {secondaryNameLine && (
                  <p className="mt-1 text-sm text-gray-500">{secondaryNameLine}</p>
                )}
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
                    <div className="text-left">
                      <p>อีเมล (Email): {teacherData.email}</p>
                    </div>
                  </div>
                )}
                {teacherData.phone && (
                  <div
                    className={`${
                      teacherData.email ? "mt-2" : "mt-3"
                    } flex items-center justify-center gap-3 text-sm text-gray-500 sm:justify-start`}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-50 text-green-600">
                      <Phone size={16} />
                    </span>
                    <div className="text-left">
                      <p>โทรศัพท์ (Tel): {teacherData.phone}</p>
                    </div>
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
                  <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex flex-col gap-2">
                      <h3 className="text-base font-semibold text-gray-900 lg:text-lg">รายการผลงานตีพิมพ์</h3>
                      <p className="text-sm text-gray-600">
                        ค้นหาและกรองรายการผลงานตามปีที่เผยแพร่
                      </p>
                    </div>
                    <div className="flex flex-col items-start gap-2 text-sm lg:items-end">
                      <div className="flex flex-wrap items-center justify-end gap-2 text-gray-600">
                        {isScopusActive ? (
                          <button
                            type="button"
                            onClick={handleExportScopus}
                            className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-70"
                            disabled={!canExportScopus || exporting}
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>{exporting ? "กำลังส่งออก..." : "ส่งออก Scopus"}</span>
                          </button>
                        ) : null}
                        <span>แหล่งข้อมูล:</span>
                        <div className="inline-flex rounded-full border border-gray-200 bg-gray-50 p-0.5">
                          {[{ value: "scopus", label: "Scopus" }, { value: "scholar", label: "Google Scholar" }].map(
                            (option) => {
                              const isActiveSource = activeSource === option.value;
                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => handleSourceChange(option.value)}
                                  className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                                    isActiveSource
                                      ? "bg-blue-600 text-white shadow"
                                      : "text-gray-600 hover:bg-white"
                                  }`}
                                >
                                  {option.label}
                                </button>
                              );
                            },
                          )}
                        </div>
                        {isScopusActive && scopusUnavailable ? (
                          <span className="text-xs text-amber-600">
                            ยังไม่มีข้อมูลจาก Scopus สำหรับผู้ใช้นี้
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between lg:gap-3">
                    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 lg:w-auto">
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
                        <div className="flex w-full flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm sm:flex-nowrap sm:gap-3 lg:w-auto">
                          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <Clock className="h-4 w-4 text-blue-500" />
                            <span>ช่วงปีเผยแพร่</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                            <label className="flex items-center gap-1">
                              <span className="text-gray-500">จาก</span>
                              <select
                                value={startYear}
                                onChange={(e) => setStartYear(e.target.value)}
                                className="min-w-[4.5rem] rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">ทั้งหมด</option>
                                {filteredYears.map((year) => (
                                  <option key={`start-${year}`} value={year}>
                                    {year}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <span className="text-gray-400">—</span>
                            <label className="flex items-center gap-1">
                              <span className="text-gray-500">ถึง</span>
                              <select
                                value={endYear}
                                onChange={(e) => setEndYear(e.target.value)}
                                className="min-w-[4.5rem] rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">ทั้งหมด</option>
                                {filteredYears.map((year) => (
                                  <option key={`end-${year}`} value={year}>
                                    {year}
                                  </option>
                                ))}
                              </select>
                            </label>
                            {(startYear || endYear) && (
                              <button
                                type="button"
                                onClick={clearYearRange}
                                className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-200"
                              >
                                ล้างช่วงปี
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 lg:flex-row lg:items-center lg:gap-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span>แสดง</span>
                          <select
                            value={rowsPerPage}
                            onChange={(e) => {
                              setRowsPerPage(Number(e.target.value));
                              setCurrentPage(1);
                            }}
                            className="rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {[10, 20, 50].map((size) => (
                              <option key={size} value={size}>
                                {size} รายการ
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={!searchTerm && !startYear && !endYear}
                        >
                          รีเซ็ตตัวกรอง
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    {tableLoading ? (
                      <div className="space-y-2 animate-pulse">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="h-6 rounded bg-gray-100" />
                        ))}
                      </div>
                    ) : tablePublications.length === 0 ? (
                      <div className="py-6 text-center text-gray-500">
                        {isScopusActive ? (
                          scopusUnavailable ? (
                            <div className="space-y-3">
                              <p>ยังไม่มีข้อมูลจาก Scopus สำหรับผู้ใช้นี้</p>
                              <button
                                type="button"
                                onClick={() => handleSourceChange("scholar")}
                                className="inline-flex items-center justify-center rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                              >
                                ดูข้อมูลจาก Google Scholar
                              </button>
                            </div>
                          ) : (
                            <p>
                              {searchTerm
                                ? "ไม่พบผลการค้นหาใน Scopus"
                                : "ยังไม่มีผลงานตีพิมพ์จาก Scopus"}
                            </p>
                          )
                        ) : (
                          <p>
                            {searchTerm
                              ? "ไม่พบผลการค้นหาใน Google Scholar"
                              : "ยังไม่มีผลงานตีพิมพ์"}
                          </p>
                        )}
                      </div>
                    ) : (
                      <>
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="w-14 px-4 py-2 text-center font-medium text-gray-700">
                                ลำดับ
                              </th>
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
                              {isScopusActive ? (
                                <th className="w-32 px-4 py-2 text-center font-medium text-gray-700">
                                  คุณภาพวารสาร
                                </th>
                              ) : null}
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
                            {tablePublications.map((pub, index) => {
                              const rowNumber = (currentPage - 1) * rowsPerPage + index + 1;
                              const citedByValue =
                                pub.cited_by !== undefined && pub.cited_by !== null
                                  ? pub.cited_by
                                  : null;
                              const yearValue = getPublicationYear(pub) || "-";
                              const key = `${pub.id || pub.eid || index}-${activeSource}`;
                              const subtypeDescription =
                                pub.scopus_documents?.subtype_description ||
                                pub.subtype_description ||
                                pub.subtypeDescription;
                              const shouldShowCiteScore = subtypeDescription === "Article";
                              return (
                                <tr key={key} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 text-center text-gray-700">
                                    {rowNumber}
                                  </td>
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
                                    {pub.venue || pub.publication_name ? (
                                      <span className="mt-1 block truncate text-xs text-gray-500">
                                        {pub.venue || pub.publication_name}
                                      </span>
                                    ) : null}
                                  </td>
                                  <td className="px-4 py-2 text-right">
                                    {citedByValue !== null ? (
                                      pub.cited_by_url ? (
                                        <a
                                          href={pub.cited_by_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:underline"
                                        >
                                          {citedByValue}
                                        </a>
                                      ) : (
                                        <span>{citedByValue}</span>
                                      )
                                    ) : (
                                      <span>-</span>
                                    )}
                                  </td>
                                  {isScopusActive ? (
                                    <td className="px-4 py-2 text-center">
                                      {shouldShowCiteScore && (pub.cite_score_quartile || pub.cite_score_percentile) ? (
                                        <div className="flex flex-col items-center gap-1">
                                          {pub.cite_score_quartile ? (
                                            <span
                                              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${quartileBadgeClass(
                                                pub.cite_score_quartile,
                                              )}`}
                                            >
                                              Quartile {pub.cite_score_quartile.toUpperCase()}
                                            </span>
                                          ) : null}
                                          {formatPercentile(pub.cite_score_percentile) ? (
                                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-700">
                                              Percentile {formatPercentile(pub.cite_score_percentile)}
                                            </span>
                                          ) : null}
                                        </div>
                                      ) : (
                                        <span className="text-gray-400">-</span>
                                      )}
                                    </td>
                                  ) : null}
                                  <td className="px-4 py-2 text-center">{yearValue || "-"}</td>
                            </tr>
                          );
                        })}
                          </tbody>
                        </table>
                        <div className="mt-4 flex items-center justify-between text-sm">
                          <span className="text-gray-600">
                            แสดง {startRecord}-{endRecord} จาก {totalRecords}
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
                  {isScopusActive ? (
                    <ScopusTrendCard
                      scopusStats={scopusStatsForDisplay}
                      scopusLoading={scopusStatsLoading}
                      formatNumber={formatNumber}
                    />
                  ) : (
                    <ScholarCitationsCard
                      metrics={citationMetrics}
                      scholarLoading={scholarLoading}
                      formatNumber={formatNumber}
                    />
                  )}
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
                              <th className="w-14 px-4 py-2 text-center font-medium text-gray-700">
                                ลำดับ
                              </th>
                              <th
                                className="w-40 cursor-pointer px-4 py-2 text-left font-medium text-gray-700"
                                onClick={() => handleInnovSort("submission_number")}
                              >
                                หมายเลขคำขอ
                                {innovSortField === "submission_number" ? (
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
                                className="w-36 cursor-pointer px-4 py-2 text-left font-medium text-gray-700"
                                onClick={() => handleInnovSort("status_name")}
                              >
                                สถานะคำขอ
                                {innovSortField === "status_name" ? (
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
                            {paginatedInnovations.map((inv, index) => (
                              <tr
                                key={inv.submission_id || inv.id || index}
                                className="hover:bg-gray-50"
                              >
                                <td className="px-4 py-2 text-center text-gray-700">
                                  {(innovPage - 1) * innovRowsPerPage + index + 1}
                                </td>
                                <td className="px-4 py-2">
                                  <span className="block truncate" title={inv.submission_number}>
                                    {inv.submission_number || "-"}
                                  </span>
                                </td>
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
                                <td className="px-4 py-2">
                                  <span className="block truncate" title={inv.status_name}>
                                    {inv.status_name || "-"}
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
          </div>
        </div>
      </div>
    </PageLayout>
  );
}