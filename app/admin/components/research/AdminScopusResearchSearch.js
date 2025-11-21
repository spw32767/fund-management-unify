// app/admin/components/research/AdminScopusResearchSearch.js
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, BarChart3, ExternalLink, FileText, Loader2, Search, UserSearch } from "lucide-react";
import PageLayout from "../common/PageLayout";
import { publicationsAPI, usersAPI } from "../../../lib/api";

const PUB_PAGE_SIZE = 10;
const USER_PAGE_SIZE = 20;

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

  const maxTrendDocs = useMemo(() => {
    if (!stats?.trend || stats.trend.length === 0) return 0;
    return Math.max(...stats.trend.map((p) => p.documents || 0));
  }, [stats]);

  return (
    <PageLayout
      title="ค้นหางานวิจัย"
      subtitle="ดูรายชื่อผู้ใช้ที่เชื่อมโยง Scopus และเปิดรายละเอียดผลงานแบบเดียวกับหน้าจัดการคำร้อง"
      icon={UserSearch}
    >
      <div className="grid gap-6 lg:grid-cols-[1.05fr,1.8fr] xl:grid-cols-[1fr,2fr]">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">รายชื่อผู้ใช้ที่มี Scopus ID</p>
              <p className="text-xs text-slate-500">เลือกแถวแล้วกด “ดูรายละเอียด” เพื่อเปิดข้อมูลเหมือนหน้าจัดการคำร้อง</p>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-[12px] font-semibold text-slate-700">รวม {userPaging.total} คน</div>
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
                ) : scopusUsers.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-4 py-8 text-center text-slate-500">
                      ยังไม่มีผู้ใช้ที่บันทึก Scopus ID
                    </td>
                  </tr>
                ) : (
                  scopusUsers.map((hit) => {
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
                              ดูรายละเอียด
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

          <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-slate-600">
              หน้า {userPage} / {userTotalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleUserPageChange(-1)}
                disabled={userPage <= 1 || userLoading}
                className="rounded-lg border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                ก่อนหน้า
              </button>
              <button
                type="button"
                onClick={() => handleUserPageChange(1)}
                disabled={userPage >= userTotalPages || userLoading}
                className="rounded-lg border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                ถัดไป
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">รายละเอียด Scopus</p>
                <p className="text-xs text-slate-500">จำนวนเอกสาร การอ้างอิง และแนวโน้มรายปี</p>
              </div>
              <div className="rounded-full bg-indigo-50 px-3 py-1 text-[12px] font-semibold text-indigo-700">
                {selectedUser ? selectedUser.name || "ไม่ระบุชื่อ" : "ยังไม่เลือกผู้ใช้"}
              </div>
            </div>

            <div className="grid gap-4 p-5 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <span>จำนวนเอกสาร</span>
                  <BarChart3 size={14} />
                </div>
                <div className="mt-2 text-3xl font-bold text-slate-900">
                  {statsLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : stats?.total_documents ?? "-"}
                </div>
                <p className="text-xs text-slate-500">รวมทั้งหมดจาก Scopus</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <span>จำนวนการอ้างอิง</span>
                  <BarChart3 size={14} />
                </div>
                <div className="mt-2 text-3xl font-bold text-slate-900">
                  {statsLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : stats?.total_citations ?? "-"}
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

              <div className="lg:col-span-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                    แนวโน้มเอกสารถูกตีพิมพ์รายปี
                  </div>
                  {statsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลดข้อมูล
                    </div>
                  ) : stats?.trend?.length ? (
                    <div className="space-y-2">
                      {stats.trend.map((point) => {
                        const width = maxTrendDocs ? Math.max(8, Math.round((point.documents / maxTrendDocs) * 100)) : 0;
                        return (
                          <div key={point.year} className="flex items-center gap-3 text-sm text-slate-700">
                            <div className="w-16 text-xs font-semibold text-slate-600">{point.year}</div>
                            <div className="flex-1 rounded-full bg-slate-100">
                              <div
                                className="rounded-full bg-indigo-500 text-[11px] font-semibold text-white"
                                style={{ width: `${width}%`, minWidth: "36px" }}
                              >
                                <span className="px-2">{point.documents} เรื่อง</span>
                              </div>
                            </div>
                            <div className="w-24 text-right text-[11px] text-slate-500">อ้างอิง {point.citations}</div>
                          </div>
                        );
                      })}
                    </div>
                  ) : selectedUser ? (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600">
                      ยังไม่มีข้อมูลแนวโน้มผลงาน
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600">
                      เลือกผู้ใช้เพื่อดูข้อมูลแนวโน้ม
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

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
                <div className="space-y-3">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold">ชื่อเรื่อง</th>
                          <th className="px-3 py-2 text-left font-semibold">วารสาร/แหล่งเผยแพร่</th>
                          <th className="px-3 py-2 text-left font-semibold">ปี</th>
                          <th className="px-3 py-2 text-left font-semibold">Cited by</th>
                          <th className="px-3 py-2 text-left font-semibold">ลิงก์</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {pubLoading ? (
                          <tr>
                            <td colSpan="5" className="px-3 py-6 text-center text-slate-500">
                              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                กำลังโหลดข้อมูล
                              </div>
                            </td>
                          </tr>
                        ) : publications.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="px-3 py-6 text-center text-slate-500">
                              ไม่พบข้อมูลงานวิจัยจาก Scopus
                            </td>
                          </tr>
                        ) : (
                          publications.map((pub) => (
                            <tr key={`${pub.id}-${pub.eid}`} className="hover:bg-slate-50">
                              <td className="px-3 py-3">
                                <div className="space-y-1">
                                  <div className="font-semibold text-slate-900">{pub.title || "ไม่ระบุชื่อเรือง"}</div>
                                  {pub.scopus_id && (
                                    <div className="text-[11px] text-slate-500">Scopus ID: {pub.scopus_id}</div>
                                  )}
                                  {pub.eid && (
                                    <div className="text-[11px] text-slate-500">EID: {pub.eid}</div>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-3 text-slate-700">{pub.publication_name || pub.venue || "-"}</td>
                              <td className="px-3 py-3 text-slate-700">{pub.publication_year || "-"}</td>
                              <td className="px-3 py-3 text-slate-700">{pub.cited_by ?? "-"}</td>
                              <td className="px-3 py-3">
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
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-slate-200 pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-xs text-slate-600">
                      แสดง {(pubMeta.offset || 0) + 1} - {Math.min((pubMeta.offset || 0) + (pubMeta.limit || PUB_PAGE_SIZE), pubMeta.total || 0)} จาก {pubMeta.total || 0} รายการ
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handlePageChange(-1)}
                        disabled={currentPage <= 1 || pubLoading}
                        className="rounded-lg border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        ก่อนหน้า
                      </button>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-700">
                        หน้า {currentPage} / {totalPages}
                      </div>
                      <button
                        type="button"
                        onClick={() => handlePageChange(1)}
                        disabled={currentPage >= totalPages || pubLoading}
                        className="rounded-lg border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        ถัดไป
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}