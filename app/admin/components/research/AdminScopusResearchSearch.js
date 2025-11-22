"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, BarChart3, Download, ExternalLink, FileText, Loader2, Search, UserSearch } from "lucide-react";
import PageLayout from "../common/PageLayout";
import { publicationsAPI, usersAPI } from "../../../lib/api";
import { toast } from "react-hot-toast";
import { downloadXlsx } from "@/app/admin/utils/xlsxExporter";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
  loading: () => (
    <div className="flex h-48 items-center justify-center text-sm text-slate-500">กำลังโหลดกราฟ...</div>
  ),
});

const PUB_PAGE_SIZE = 10;
const USER_PAGE_SIZE = 20;
const CITATION_RECENT_START_YEAR = 2020;
const EXPORT_COLUMNS = [
  { key: "rowNumber", header: "ลำดับ", width: 8 },
  { key: "title", header: "ชื่อเรื่อง", width: 60 },
  { key: "venue", header: "แหล่งเผยแพร่", width: 36 },
  { key: "citedBy", header: "Cited by", width: 12 },
  { key: "year", header: "ปี", width: 10 },
  { key: "scopusId", header: "Scopus ID", width: 16 },
  { key: "eid", header: "EID", width: 22 },
  { key: "doiUrl", header: "DOI/URL", width: 32 },
  { key: "scopusUrl", header: "Scopus URL", width: 32 },
  { key: "openAccess", header: "Open Access", width: 14 },
  { key: "keywords", header: "Keywords", width: 40 },
];

export default function AdminScopusResearchSearch() {
  const [scopusUsers, setScopusUsers] = useState([]);
  const [userPaging, setUserPaging] = useState({ total: 0, limit: USER_PAGE_SIZE, offset: 0 });
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState("");

  const [selectedUser, setSelectedUser] = useState(null);
  const selectedUserId = selectedUser?.user_id || selectedUser?.UserID;

  const [stats, setStats] = useState(null);
  const [statsMeta, setStatsMeta] = useState({ has_scopus_id: false, has_author_record: false });
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState("");

  const [pubQuery, setPubQuery] = useState("");
  const [publications, setPublications] = useState([]);
  const [pubMeta, setPubMeta] = useState({ total: 0, limit: PUB_PAGE_SIZE, offset: 0 });
  const [pubFlags, setPubFlags] = useState({ has_scopus_id: false, has_author_record: false });
  const [pubLoading, setPubLoading] = useState(false);
  const [pubError, setPubError] = useState("");

  const [activeTab, setActiveTab] = useState("publications");
  const [userSearch, setUserSearch] = useState("");
  const [exporting, setExporting] = useState(false);

  const loadUsers = useCallback(
    async (offset = 0) => {
      setUserLoading(true);
      setUserError("");
      try {
        const res = await usersAPI.listScopusUsers({ limit: USER_PAGE_SIZE, offset });
        const hits = Array.isArray(res?.data) ? res.data : [];
        setScopusUsers(hits);
        setUserPaging(res?.paging || { total: hits.length, limit: USER_PAGE_SIZE, offset });

        if (hits.length > 0) {
          const stillSelected = hits.find((u) => String(u.user_id) === String(selectedUserId));
          if (stillSelected) {
            setSelectedUser(stillSelected);
          } else if (!selectedUserId) {
            setSelectedUser(hits[0]);
          }
        } else {
          setSelectedUser(null);
        }
      } catch (error) {
        console.error("Load scopus users error", error);
        setScopusUsers([]);
        setUserPaging({ total: 0, limit: USER_PAGE_SIZE, offset: 0 });
        setSelectedUser(null);
        setUserError(error?.message || "ไม่สามารถโหลดรายชื่อผู้ใช้ที่มี Scopus ID ได้");
      } finally {
        setUserLoading(false);
      }
    },
    [selectedUserId]
  );

  const fetchStats = useCallback(
    async () => {
      if (!selectedUserId) return;
      setStatsLoading(true);
      setStatsError("");
      try {
        const res = await publicationsAPI.getScopusPublicationStatsForUser(selectedUserId);
        setStats(res?.data || null);
        setStatsMeta(res?.meta || { has_scopus_id: false, has_author_record: false });
      } catch (error) {
        console.error("Load stats error", error);
        setStats(null);
        setStatsMeta({ has_scopus_id: false, has_author_record: false });
        setStatsError(error?.message || "ไม่สามารถโหลดสถิติผลงานวิจัยได้");
      } finally {
        setStatsLoading(false);
      }
    },
    [selectedUserId]
  );

  const fetchPublications = useCallback(
    async (offset = 0) => {
      if (!selectedUserId) return;
      setPubLoading(true);
      setPubError("");
      try {
        const params = { limit: PUB_PAGE_SIZE, offset, sort: "year", direction: "desc" };
        if (pubQuery.trim()) {
          params.q = pubQuery.trim();
        }
        const res = await publicationsAPI.getScopusPublicationsForUser(selectedUserId, params);
        const items = res?.data || [];
        setPublications(items);
        setPubMeta(res?.paging || { total: items.length, limit: PUB_PAGE_SIZE, offset });
        setPubFlags(res?.meta || { has_scopus_id: true, has_author_record: true });
      } catch (error) {
        console.error("Load publications error", error);
        setPublications([]);
        setPubMeta({ total: 0, limit: PUB_PAGE_SIZE, offset: 0 });
        setPubFlags({ has_scopus_id: false, has_author_record: false });
        setPubError(error?.message || "ไม่สามารถดึงข้อมูลงานวิจัยได้");
      } finally {
        setPubLoading(false);
      }
    },
    [pubQuery, selectedUserId]
  );

  useEffect(() => {
    loadUsers(0);
  }, [loadUsers]);

  useEffect(() => {
    if (selectedUserId) {
      setPubMeta((prev) => ({ ...prev, offset: 0 }));
      fetchPublications(0);
      fetchStats();
    }
  }, [selectedUserId, fetchPublications, fetchStats]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((pubMeta?.total || 0) / (pubMeta?.limit || PUB_PAGE_SIZE))),
    [pubMeta]
  );
  const currentPage = useMemo(
    () => Math.floor((pubMeta?.offset || 0) / (pubMeta?.limit || PUB_PAGE_SIZE)) + 1,
    [pubMeta]
  );

  const userTotalPages = useMemo(
    () => Math.max(1, Math.ceil((userPaging?.total || 0) / (userPaging?.limit || USER_PAGE_SIZE))),
    [userPaging]
  );
  const userPage = useMemo(
    () => Math.floor((userPaging?.offset || 0) / (userPaging?.limit || USER_PAGE_SIZE)) + 1,
    [userPaging]
  );

  const handleUserPageChange = (direction) => {
    if (userLoading) return;
    const next = userPage + direction;
    if (next < 1 || next > userTotalPages) return;
    const nextOffset = (next - 1) * (userPaging?.limit || USER_PAGE_SIZE);
    loadUsers(nextOffset);
  };

  const handlePageChange = (direction) => {
    if (pubLoading) return;
    const nextPage = currentPage + direction;
    if (nextPage < 1 || nextPage > totalPages) return;
    const nextOffset = (nextPage - 1) * (pubMeta?.limit || PUB_PAGE_SIZE);
    fetchPublications(nextOffset);
  };

  const statusMessage = () => {
    if (!selectedUserId) return "เลือกผู้ใช้เพื่อดูข้อมูลงานวิจัย";
    if (!pubFlags?.has_scopus_id) return "ผู้ใช้นี้ยังไม่มี Scopus ID";
    if (!pubFlags?.has_author_record) return "ยังไม่พบข้อมูลจาก Scopus สำหรับผู้ใช้นี้";
    return "";
  };

  const formatNumber = (value) => {
    if (value === null || value === undefined) return "-";
    const num = Number(value);
    if (Number.isNaN(num)) return value;
    return new Intl.NumberFormat("th-TH").format(num);
  };

  const scopusTrend = Array.isArray(stats?.trend) ? stats.trend : [];
  const scopusTotals = useMemo(
    () => ({
      documents: stats?.total_documents ?? null,
      citations: stats?.total_citations ?? null,
    }),
    [stats]
  );
  const scopusUnavailable =
    statsMeta?.has_scopus_id === false || statsMeta?.has_author_record === false;

  const sortedTrend = useMemo(
    () => [...scopusTrend].sort((a, b) => (a.year || 0) - (b.year || 0)),
    [scopusTrend]
  );
  const yearLabels = sortedTrend.map((point) =>
    point.year === null || point.year === undefined ? "ไม่ระบุ" : `${point.year}`
  );
  const documentSeries = sortedTrend.map((point) => point.documents || 0);
  const citationSeries = sortedTrend.map((point) => point.citations || 0);
  const chartHasSeries =
    documentSeries.some((value) => value > 0) || citationSeries.some((value) => value > 0);
  const scopusRecent = sortedTrend.reduce(
    (acc, point) => {
      if (point.year >= CITATION_RECENT_START_YEAR) {
        acc.documents += point.documents || 0;
        acc.citations += point.citations || 0;
      }
      return acc;
    },
    { documents: 0, citations: 0 }
  );

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return scopusUsers;
    const term = userSearch.toLowerCase();
    return scopusUsers.filter((hit) => {
      const name = (hit.name || "").toLowerCase();
      const email = (hit.email || "").toLowerCase();
      const scopusId = String(hit.scopus_id || hit.scopusID || "").toLowerCase();
      return name.includes(term) || email.includes(term) || scopusId.includes(term);
    });
  }, [scopusUsers, userSearch]);

  const buildExportRows = useCallback((items, startOffset = 0) => {
    if (!Array.isArray(items) || items.length === 0) return [];
    return items.map((pub, index) => {
      const rowNumber = startOffset + index + 1;
      const citedByValue =
        pub.cited_by !== undefined && pub.cited_by !== null ? pub.cited_by : "";
      const openAccessFlag =
        pub.open_access ?? pub.is_open_access ?? pub.openaccess ?? pub.openAccess;
      const keywords = Array.isArray(pub.keywords)
        ? pub.keywords.join("; ")
        : pub.keywords || "";

      return {
        rowNumber,
        title: pub.title || "",
        venue: pub.venue || pub.publication_name || "",
        citedBy: citedByValue,
        year: pub.publication_year || pub.coverDate || "",
        scopusId: pub.scopus_id || pub.scopusID || "",
        eid: pub.eid || "",
        doiUrl: pub.doi || pub.doi_url || pub.url || "",
        scopusUrl: pub.scopus_url || "",
        openAccess:
          openAccessFlag === undefined || openAccessFlag === null
            ? ""
            : openAccessFlag
            ? "Yes"
            : "No",
        keywords,
      };
    });
  }, []);

  const hasExportableData = useMemo(() => (pubMeta?.total || 0) > 0, [pubMeta?.total]);

  const axisLabelFormatter = (value) => {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return value;
    }
    return formatNumber(value);
  };

  const handleExport = useCallback(async () => {
    if (!selectedUserId || !hasExportableData) return;
    setExporting(true);
    try {
      const query = pubQuery.trim();
      const limit = pubMeta?.limit || PUB_PAGE_SIZE;
      let offset = 0;
      let total = pubMeta?.total || 0;
      const allRows = [];

      while (offset === 0 || offset < total) {
        const params = { limit, offset, sort: "year", direction: "desc" };
        if (query) {
          params.q = query;
        }

        const res = await publicationsAPI.getScopusPublicationsForUser(selectedUserId, params);
        const items = Array.isArray(res?.data) ? res.data : [];
        const paging = res?.paging || {};
        total = paging.total ?? total;
        const pageLimit = paging.limit || limit;

        allRows.push(...buildExportRows(items, offset));

        if (items.length < pageLimit) {
          break;
        }
        offset += pageLimit;
      }

      if (allRows.length === 0) {
        toast.error("ไม่พบข้อมูลงานวิจัยสำหรับส่งออก");
        return;
      }

      const timestamp = new Date().toISOString().replace(/[:T]/g, "-").split(".")[0];
      const userRef = selectedUser?.scopus_id || selectedUser?.scopusID || selectedUserId;
      const filename = `scopus_publications_${userRef}_${timestamp}.xlsx`;
      downloadXlsx(EXPORT_COLUMNS, allRows, {
        sheetName: "Scopus Publications",
        filename,
      });
      toast.success(`ส่งออก ${allRows.length} รายการเรียบร้อยแล้ว`);
    } catch (error) {
      console.error("Export publications error", error);
      toast.error("ไม่สามารถส่งออกไฟล์ได้");
    } finally {
      setExporting(false);
    }
  }, [buildExportRows, hasExportableData, pubMeta?.limit, pubMeta?.total, pubQuery, selectedUser, selectedUserId]);

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
    <PageLayout
      title="ค้นหางานวิจัย"
      subtitle="ดูรายชื่อผู้ใช้ที่เชื่อมโยงกับ Scopus และดูรายละเอียดผลงาน"
      icon={UserSearch}
    >
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-[1.15fr,1.85fr]">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">รายชื่อผู้ใช้ที่มี Scopus ID</p>
              <p className="text-xs text-slate-500">เลือกแถวแล้วกด “ดูรายละเอียด” เพื่อเปิดข้อมูลเหมือนหน้าจัดการคำร้อง</p>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              <div className="relative w-full min-w-[240px] sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-300 bg-white px-9 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  placeholder="ค้นหารายชื่อ / Scopus ID"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-[12px] font-semibold text-slate-700">รวม {userPaging.total} คน</div>
            </div>
          </div>

          {userError && (
            <div className="m-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertCircle className="mt-0.5 h-4 w-4" />
              <span>{userError}</span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">ผู้ใช้</th>
                  <th className="px-4 py-3 text-left font-semibold">Scopus ID</th>
                  <th className="px-4 py-3 text-left font-semibold">อีเมล</th>
                  <th className="px-4 py-3 text-right font-semibold">การทำงาน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {userLoading ? (
                  <tr>
                    <td colSpan="4" className="px-4 py-8 text-center text-slate-500">
                      <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                        <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลดรายชื่อ
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-4 py-8 text-center text-slate-500">
                      ไม่พบผู้ใช้ที่ตรงกับคำค้น
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((hit) => {
                    const isActive = String(hit.user_id) === String(selectedUserId);
                    return (
                      <tr key={hit.user_id} className={isActive ? "bg-indigo-50/60" : "hover:bg-slate-50"}>
                        <td className="px-4 py-3">
                          <div className="space-y-0.5">
                            <div className="font-semibold text-slate-900">{hit.name || "ไม่ระบุชื่อ"}</div>
                            <div className="text-[11px] text-slate-500">User ID: {hit.user_id}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                            <FileText size={12} />
                            <code className="font-mono text-xs">{hit.scopus_id || hit.scopusID}</code>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{hit.email || "-"}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              className={`rounded-lg px-3 py-1.5 text-sm font-semibold shadow-sm transition ${
                                isActive
                                  ? "border border-indigo-200 bg-indigo-600 text-white hover:bg-indigo-700"
                                  : "border border-slate-300 bg-white text-slate-800 hover:border-slate-400"
                              }`}
                              onClick={() => setSelectedUser(hit)}
                            >
                              {isActive ? "กำลังดู" : "ดูรายละเอียด"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-5 py-4 text-xs text-slate-600">
            <span>
              แสดง {(userPaging.offset || 0) + 1}-{Math.min((userPaging.offset || 0) + (userPaging.limit || USER_PAGE_SIZE), userPaging.total || 0)} จาก {userPaging.total || 0}
            </span>
            <div className="space-x-2">
              <button
                type="button"
                onClick={() => handleUserPageChange(-1)}
                disabled={userPage <= 1 || userLoading}
                className="rounded border px-3 py-1 disabled:opacity-50"
              >
                ก่อนหน้า
              </button>
              <button
                type="button"
                onClick={() => handleUserPageChange(1)}
                disabled={userPage >= userTotalPages || userLoading}
                className="rounded border px-3 py-1 disabled:opacity-50"
              >
                ถัดไป
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">ผู้ใช้ที่เลือก</p>
                  <p className="text-xs text-slate-500">
                  {selectedUser ? selectedUser.name || "ไม่ระบุชื่อ" : "เลือกผู้ใช้ทางซ้ายเพื่อเริ่ม"}
                </p>
                {selectedUser && (
                  <p className="text-[11px] text-slate-500">Scopus ID: {selectedUser.scopus_id || selectedUser.scopusID || "-"}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition ${
                    activeTab === "publications"
                      ? "bg-indigo-600 text-white"
                      : "border border-slate-200 bg-white text-slate-800 hover:border-slate-300"
                  }`}
                  onClick={() => setActiveTab("publications")}
                  disabled={!selectedUserId}
                >
                  รายการเอกสาร
                </button>
                <button
                  type="button"
                  className={`rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition ${
                    activeTab === "stats"
                      ? "bg-indigo-600 text-white"
                      : "border border-slate-200 bg-white text-slate-800 hover:border-slate-300"
                  }`}
                  onClick={() => setActiveTab("stats")}
                  disabled={!selectedUserId}
                >
                  สถิติ/กราฟ
                </button>
              </div>
            </div>
          </div>

          {activeTab === "stats" ? (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <span>จำนวนเอกสาร</span>
                    <BarChart3 size={14} />
                  </div>
                  <div className="mt-2 text-3xl font-bold text-slate-900">
                    {statsLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : formatNumber(scopusTotals.documents)}
                  </div>
                  <p className="text-xs text-slate-500">รวมทั้งหมดจาก Scopus</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <span>จำนวนการอ้างอิง</span>
                    <BarChart3 size={14} />
                  </div>
                  <div className="mt-2 text-3xl font-bold text-slate-900">
                    {statsLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : formatNumber(scopusTotals.citations)}
                  </div>
                  <p className="text-xs text-slate-500">รวมการอ้างอิงจากเอกสารทั้งหมด</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <span>สถานะ Scopus</span>
                    <FileText size={14} />
                  </div>
                  <div className="mt-2 text-sm text-slate-700">
                    {statsError ? (
                      <span className="text-rose-600">{statsError}</span>
                    ) : !selectedUser ? (
                      "เลือกผู้ใช้เพื่อดูสถานะ"
                    ) : !statsMeta.has_scopus_id ? (
                      "ผู้ใช้นี้ยังไม่ได้ตั้งค่า Scopus ID"
                    ) : !statsMeta.has_author_record ? (
                      "ยังไม่พบข้อมูลบน Scopus"
                    ) : (
                      "เชื่อมโยง Scopus สำเร็จ"
                    )}
                  </div>
                  {selectedUser && (
                    <div className="mt-2 text-xs text-slate-500">Scopus ID: {selectedUser.scopus_id || selectedUser.scopusID}</div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-gradient-to-br from-white via-white to-slate-50 p-4 shadow-inner">
                <div className="flex flex-col gap-1">
                  <h3 className="text-base font-semibold text-slate-900">Documents & Citations by Year (Scopus)</h3>
                  <p className="text-sm text-slate-500">ข้อมูลจาก Scopus แสดงจำนวนผลงาน (แท่ง) และการอ้างอิง (เส้น)</p>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: "ผลงานทั้งหมด", value: scopusTotals.documents ?? 0 },
                    { label: "การอ้างอิงทั้งหมด", value: scopusTotals.citations ?? 0 },
                    { label: `ผลงานตั้งแต่ปี ${CITATION_RECENT_START_YEAR}`, value: scopusRecent.documents ?? 0 },
                    { label: `การอ้างอิงตั้งแต่ปี ${CITATION_RECENT_START_YEAR}`, value: scopusRecent.citations ?? 0 },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-lg border border-gray-100 bg-white/70 p-4 shadow-sm">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
                      <p className="mt-1 text-2xl font-semibold text-gray-900">{formatNumber(value)}</p>
                    </div>
                  ))}
                </div>
                {statsLoading ? (
                  <div className="mt-6 space-y-3">
                    <div className="h-16 animate-pulse rounded-md bg-slate-100" />
                    <div className="h-28 animate-pulse rounded-md bg-slate-100" />
                  </div>
                ) : scopusUnavailable ? (
                  <div className="mt-6 rounded-lg border border-dashed border-slate-200 bg-gray-50 p-6 text-center text-sm text-slate-500">
                    ยังไม่มีข้อมูลจาก Scopus สำหรับผู้ใช้นี้
                  </div>
                ) : sortedTrend.length === 0 ? (
                  <div className="mt-6 rounded-lg border border-dashed border-slate-200 bg-gray-50 p-6 text-center text-sm text-slate-500">
                    ยังไม่มีข้อมูลแนวโน้มจาก Scopus สำหรับสร้างกราฟ
                  </div>
                ) : chartHasSeries ? (
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
                      <ReactApexChart options={chartOptions} series={chartSeries} type="line" height={360} width="100%" />
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 rounded-lg border border-dashed border-slate-200 bg-gray-50 p-6 text-center text-sm text-slate-500">
                    ยังไม่มีข้อมูลสำหรับสร้างกราฟ
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">ผลงานวิจัยจาก Scopus</p>
                  <p className="text-xs text-slate-500">ค้นหาในชื่อเรื่องและเปิดลิงก์อ้างอิง</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      className="w-full rounded-lg border border-slate-300 bg-white px-9 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      placeholder="ค้นหาชื่อเรื่อง"
                      value={pubQuery}
                      onChange={(e) => setPubQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          fetchPublications(0);
                        }
                      }}
                      disabled={!selectedUserId}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => fetchPublications(0)}
                    disabled={!selectedUserId || pubLoading}
                    className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {pubLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}ค้นหาเอกสาร
                  </button>
                  <button
                    type="button"
                    onClick={handleExport}
                    disabled={!selectedUserId || exporting || !hasExportableData}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}ส่งออก Excel
                  </button>
                </div>
              </div>

              <div className="p-5">
                {pubError ? (
                  <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    <AlertCircle className="mt-0.5 h-4 w-4" />
                    <span>{pubError}</span>
                  </div>
                ) : statusMessage() ? (
                  <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    <AlertCircle className="mt-0.5 h-4 w-4 text-slate-500" />
                    <span>{statusMessage()}</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="overflow-x-auto">
                      {pubLoading ? (
                        <div className="space-y-2 animate-pulse">
                          {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-6 rounded bg-slate-100" />
                          ))}
                        </div>
                      ) : publications.length === 0 ? (
                        <div className="py-6 text-center text-slate-500">ไม่พบข้อมูลงานวิจัยจาก Scopus</div>
                      ) : (
                        <>
                          <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="w-14 px-4 py-2 text-center font-medium text-gray-700">ลำดับ</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-700">ชื่อเรื่อง</th>
                                <th className="w-24 px-4 py-2 text-right font-medium text-gray-700">Cited by</th>
                                <th className="w-20 px-4 py-2 text-center font-medium text-gray-700">ปี</th>
                                <th className="w-32 px-4 py-2 text-left font-medium text-gray-700">ลิงก์</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {publications.map((pub, index) => {
                                const rowNumber = (pubMeta.offset || 0) + index + 1;
                                const citedByValue =
                                  pub.cited_by !== undefined && pub.cited_by !== null ? pub.cited_by : null;
                                const yearValue = pub.publication_year || "-";
                                return (
                                  <tr key={`${pub.id}-${pub.eid}`} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 text-center text-gray-700">{rowNumber}</td>
                                    <td className="max-w-xs px-4 py-2 lg:max-w-md">
                                      <div className="space-y-1">
                                        <span className="block truncate font-semibold text-gray-900" title={pub.title}>
                                          {pub.title || "ไม่ระบุชื่อเรื่อง"}
                                        </span>
                                        {pub.venue || pub.publication_name ? (
                                          <span className="block truncate text-xs text-gray-500">
                                            {pub.venue || pub.publication_name}
                                          </span>
                                        ) : null}
                                        {pub.scopus_id ? (
                                          <span className="block text-[11px] text-gray-500">Scopus ID: {pub.scopus_id}</span>
                                        ) : null}
                                        {pub.eid ? <span className="block text-[11px] text-gray-500">EID: {pub.eid}</span> : null}
                                      </div>
                                    </td>
                                    <td className="px-4 py-2 text-right text-gray-700">{citedByValue ?? "-"}</td>
                                    <td className="px-4 py-2 text-center text-gray-700">{yearValue}</td>
                                    <td className="px-4 py-2">
                                      <div className="flex flex-wrap gap-2 text-xs">
                                        {pub.url && (
                                          <a
                                            href={pub.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-2 py-1 text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
                                          >
                                            DOI/URL <ExternalLink size={14} />
                                          </a>
                                        )}
                                        {pub.scopus_url && (
                                          <a
                                            href={pub.scopus_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-1 text-indigo-700 transition hover:border-indigo-400"
                                          >
                                            Scopus <ExternalLink size={14} />
                                          </a>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          <div className="mt-4 flex items-center justify-between text-sm text-slate-700">
                            <span>
                              แสดง {(pubMeta.offset || 0) + 1}-
                              {Math.min((pubMeta.offset || 0) + (pubMeta.limit || PUB_PAGE_SIZE), pubMeta.total || 0)} จาก {pubMeta.total || 0}
                            </span>
                            <div className="space-x-2">
                              <button
                                type="button"
                                onClick={() => handlePageChange(-1)}
                                disabled={currentPage <= 1 || pubLoading}
                                className="rounded border px-3 py-1 text-sm disabled:opacity-50"
                              >
                                ก่อนหน้า
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePageChange(1)}
                                disabled={currentPage >= totalPages || pubLoading}
                                className="rounded border px-3 py-1 text-sm disabled:opacity-50"
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
              </div>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}