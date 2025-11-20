"use client";
import { useEffect, useState } from "react";
import { publicationsAPI, usersAPI } from "@/app/lib/api";
import PageLayout from "../../common/PageLayout";

// Author ID helpers
function normalizeAuthorId(s) {
  const x = (s || "").trim();
  if (!x) return "";
  return x.startsWith("_") ? x : `_${x}`;
}
function looksLikeAuthorId(s) {
  const x = (s || "").trim().replace(/^_/, "");
  return /^[a-zA-Z0-9_-]{10,}$/.test(x);
}

const RUNS_PAGE_SIZE = 20;

const MESSAGE_TONE_STYLES = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  error: "border-rose-200 bg-rose-50 text-rose-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  info: "border-slate-200 bg-slate-50 text-slate-700",
};

const MESSAGE_TONE_ICONS = {
  success: "✔",
  error: "✖",
  warning: "⚠",
  info: "ℹ",
};

function getRunStatusBadgeClass(statusText) {
  switch (statusText) {
    case "SUCCESS":
    case "COMPLETED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "FAILED":
    case "ERROR":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "RUNNING":
    case "IN_PROGRESS":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

export default function AdminPublicationsImport() {
  const [userId, setUserId] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [userHits, setUserHits] = useState([]);
  const [authorId, setAuthorId] = useState("");
  const [searching, setSearching] = useState(false);
  const [manualBusy, setManualBusy] = useState(false);
  const [manualAction, setManualAction] = useState("");
  const [batchRunning, setBatchRunning] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgTone, setMsgTone] = useState("info");

  const [runs, setRuns] = useState([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [runsError, setRunsError] = useState("");
  const [runsPagination, setRunsPagination] = useState({
    current_page: 1,
    per_page: RUNS_PAGE_SIZE,
    total_pages: 0,
    total_count: 0,
    has_next: false,
    has_prev: false,
  });
  const [runsPage, setRunsPage] = useState(1);
  const [scheduleInfo, setScheduleInfo] = useState(null);

  const formatDateTime = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatNumber = (value) => {
    if (value === null || value === undefined) return "-";
    const n = Number(value);
    if (!Number.isFinite(n)) return "-";
    return n.toLocaleString("th-TH");
  };

  const formatNumberOrZero = (value) => {
    const formatted = formatNumber(value);
    return formatted === "-" ? "0" : formatted;
  };

  async function fetchRuns(page = 1) {
    setRunsLoading(true);
    setRunsError("");
    try {
      const res = await publicationsAPI.getScholarImportRuns({ page, per_page: RUNS_PAGE_SIZE });
      const items = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.runs)
          ? res.runs
          : [];
      setRuns(items);

      const paginationRaw = res?.pagination || {};
      const normalized = {
        current_page: paginationRaw.current_page ?? page,
        per_page: paginationRaw.per_page ?? RUNS_PAGE_SIZE,
        total_pages: paginationRaw.total_pages ?? paginationRaw.totalPages ?? 0,
        total_count: paginationRaw.total_count ?? paginationRaw.totalCount ?? items.length,
      };
      normalized.has_next =
        typeof paginationRaw.has_next === "boolean"
          ? paginationRaw.has_next
          : (normalized.total_pages > 0
              ? normalized.current_page < normalized.total_pages
              : normalized.total_count > normalized.per_page);
      normalized.has_prev =
        typeof paginationRaw.has_prev === "boolean"
          ? paginationRaw.has_prev
          : normalized.current_page > 1;

      setRunsPagination(normalized);
      setRunsPage(normalized.current_page);
      setScheduleInfo(res && Object.prototype.hasOwnProperty.call(res, "schedule") ? res.schedule : null);
    } catch (e) {
      setRunsError(e?.message || "ไม่สามารถดึงประวัติการนำเข้าได้");
    } finally {
      setRunsLoading(false);
    }
  }

  useEffect(() => {
    fetchRuns(1);
  }, []);

  async function searchUsers() {
    if (!userQuery.trim()) return;
    setSearching(true);
    setMsg("");
    setMsgTone("info");
    try {
      const res = await usersAPI.search(userQuery.trim());
      const hits = Array.isArray(res?.data) ? res.data : [];
      setUserHits(hits);
      if (!hits.length) {
        setMsg("ไม่พบผู้ใช้ในระบบที่ตรงคำค้น");
        setMsgTone("warning");
      }
    } catch (e) {
      setMsg(e?.message || "User search error");
      setMsgTone("error");
    } finally {
      setSearching(false);
    }
  }

  async function importOne() {
    const id = normalizeAuthorId(authorId);
    if (!userId) {
      setMsg("กรุณาเลือกหรือกรอก User ID");
      setMsgTone("warning");
      return;
    }
    if (!looksLikeAuthorId(id)) {
      setMsg("Author ID ไม่ถูกต้อง (ตัวอย่าง: _lza5VIAAAAJ)");
      setMsgTone("warning");
      return;
    }

    setManualBusy(true);
    setManualAction("import");
    setMsg("");
    setMsgTone("info");
    try {
      const s = await publicationsAPI.importScholarForUser(userId, id);
      setAuthorId(id);
      setMsg(
        `นำเข้าเสร็จ • fetched ${s.fetched ?? 0} • created ${s.created ?? 0} • updated ${s.updated ?? 0} • failed ${s.failed ?? 0}`
      );
      setMsgTone("success");
    } catch (e) {
      setMsg(e?.message || "Import error");
      setMsgTone("error");
    } finally {
      setManualBusy(false);
      setManualAction("");
    }
  }

  async function saveScholarAuthorId() {
    const id = normalizeAuthorId(authorId);
    if (!userId) {
      setMsg("กรุณาเลือกหรือกรอก User ID");
      setMsgTone("warning");
      return;
    }
    if (!looksLikeAuthorId(id)) {
      setMsg("Author ID ไม่ถูกต้อง (ตัวอย่าง: _lza5VIAAAAJ)");
      setMsgTone("warning");
      return;
    }

    setManualBusy(true);
    setManualAction("save");
    setMsg("");
    setMsgTone("info");
    try {
      const res = await usersAPI.setScholarAuthorId(userId, id);
      const savedId = res?.data?.scholar_author_id || id;
      setAuthorId(savedId);
      setUserHits((prev) =>
        prev.map((hit) =>
          String(hit.user_id) === String(userId) ? { ...hit, scholar_author_id: savedId } : hit
        )
      );
      setMsg(`บันทึก Scholar ID (${savedId}) สำหรับ User ID ${userId} เรียบร้อย`);
      setMsgTone("success");
    } catch (e) {
      setMsg(e?.message || "บันทึก Scholar ID ไม่สำเร็จ");
      setMsgTone("error");
    } finally {
      setManualBusy(false);
      setManualAction("");
    }
  }

  async function importAll() {
    setBatchRunning(true);
    setMsg("");
    setMsgTone("info");
    try {
      const s = await publicationsAPI.importScholarBatch();
      setMsg(
        `Batch • users ${s.users ?? 0} • fetched ${s.fetched ?? 0} • created ${s.created ?? 0} • updated ${s.updated ?? 0} • failed ${s.failed ?? 0}`
      );
      setMsgTone("success");
    } catch (e) {
      setMsg(e?.message || "Batch error");
      setMsgTone("error");
    } finally {
      setBatchRunning(false);
      fetchRuns(1);
    }
  }

  const lastRun = runs?.[0] || null;
  const lastFinishedRun = runs.find((run) => run?.finished_at);
  const lastImportDisplay = lastFinishedRun?.finished_at ? formatDateTime(lastFinishedRun.finished_at) : "-";
  const nextImportDisplay = scheduleInfo?.next_run_at ? formatDateTime(scheduleInfo.next_run_at) : "-";

  const selectedUser =
    userHits.find((hit) => String(hit.user_id) === String(userId)) || null;
  const disableManualActions = manualBusy || batchRunning || !userId || !authorId.trim();
  const disableSearchButton = !userQuery.trim() || searching || manualBusy || batchRunning;
  const disableBatchButton = batchRunning || manualBusy;

  const lastRunSummary = lastRun
    ? [
        `fetched ${formatNumberOrZero(lastRun.publications_fetched ?? lastRun.fetched ?? lastRun.fetched_count)}`,
        `created ${formatNumberOrZero(lastRun.publications_created ?? lastRun.created ?? lastRun.created_count)}`,
        `updated ${formatNumberOrZero(lastRun.publications_updated ?? lastRun.updated ?? lastRun.updated_count)}`,
        `failed ${formatNumberOrZero(lastRun.publications_failed ?? lastRun.failed ?? lastRun.failed_count)}`,
      ].join(" • ")
    : "";
  const lastRunError = lastRun?.error_message || "";
  const lastRunStatusDisplay = lastRun?.status ? lastRun.status.toUpperCase() : "-";

  const computedTotalPages =
    runsPagination.total_pages ||
    (runsPagination.total_count && runsPagination.per_page
      ? Math.ceil(runsPagination.total_count / runsPagination.per_page)
      : 0);
  const totalPages = computedTotalPages > 0 ? computedTotalPages : 1;
  const currentPage = runsPagination.current_page || runsPage || 1;
  const hasPrev = runsPagination.has_prev ?? currentPage > 1;
  const hasNext = runsPagination.has_next ?? (runsPagination.total_pages ? currentPage < runsPagination.total_pages : false);

  return (
    <PageLayout
      title="นำเข้าผลงานวิชาการ (Google Scholar)"
      subtitle="จัดการการนำเข้าผลงานจาก Google Scholar ทั้งแบบรายบุคคลและแบบกลุ่ม"
      breadcrumbs={[
        { label: "หน้าแรก", href: "/admin" },
        { label: "นำเข้าผลงานวิชาการ (Google Scholar)" },
      ]}
    >
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Manual Import</div>
            <div className="text-xl font-semibold text-slate-900">เลือกอาจารย์และจัดการ Google Scholar ID</div>
            <p className="text-sm text-slate-600">
              ค้นหาผู้ใช้จากฐานข้อมูล บันทึก Scholar ID แล้วนำเข้าผลงานเฉพาะบุคคลได้จากที่เดียว
            </p>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                  1
                </span>
                <div>
                  <div className="font-medium text-slate-900">เลือกอาจารย์จากฐานข้อมูล</div>
                  <p className="text-xs text-slate-500">ค้นหาด้วยชื่อหรืออีเมล หรือกรอก User ID ด้วยตนเอง</p>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  placeholder="พิมพ์ชื่อ/อีเมล แล้วกดค้นหา (เช่น: Somchai)"
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                />
                <button
                  type="button"
                  onClick={searchUsers}
                  disabled={disableSearchButton}
                  className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-950 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {searching ? "กำลังค้นหา..." : "ค้นหา"}
                </button>
              </div>

              {userHits.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">ผลการค้นหา</div>
                  <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
                    {userHits.map((u) => {
                      const isSelected = String(u.user_id) === String(userId);
                      return (
                        <li
                          key={u.user_id}
                          className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-3 text-sm shadow-sm transition ${
                            isSelected ? "border-slate-900 bg-white ring-1 ring-slate-300" : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="font-medium text-slate-900">{u.name || `(ID: ${u.user_id})`}</div>
                            {u.email && <div className="text-xs text-slate-500">{u.email}</div>}
                            {u.scholar_author_id ? (
                              <div className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                                Scholar ID <code className="font-mono text-xs">{u.scholar_author_id}</code>
                              </div>
                            ) : (
                              <div className="text-[11px] text-slate-400">ยังไม่บันทึก Scholar ID</div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setUserId(String(u.user_id));
                              setAuthorId(u.scholar_author_id || "");
                            }}
                            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                              isSelected
                                ? "bg-slate-900 text-white"
                                : "border border-slate-300 text-slate-600 hover:bg-slate-900 hover:text-white"
                            }`}
                          >
                            ใช้ User ID {u.user_id}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600">หรือกรอก User ID ตรงๆ</label>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 sm:w-60"
                  placeholder="User ID"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                />
              </div>

              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3">
                <div className="text-sm font-semibold text-slate-700">ผู้ใช้ที่เลือก</div>
                {userId ? (
                  <div className="mt-2 space-y-1 text-sm text-slate-600">
                    <div className="font-medium text-slate-900">
                      {selectedUser?.name ? selectedUser.name : `User ID ${userId}`}
                    </div>
                    {selectedUser?.email && <div className="text-xs text-slate-500">{selectedUser.email}</div>}
                    <div className="text-xs text-slate-500">
                      {selectedUser?.scholar_author_id ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 font-medium text-emerald-700">
                          Scholar ID <code className="font-mono text-xs">{selectedUser.scholar_author_id}</code>
                        </span>
                      ) : (
                        <span className="italic text-slate-500">ยังไม่บันทึก Scholar ID</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-slate-500">ยังไม่ได้เลือกผู้ใช้</div>
                )}
              </div>
            </div>

            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                  2
                </span>
                <div>
                  <div className="font-medium text-slate-900">กรอก Google Scholar Author ID</div>
                  <p className="text-xs text-slate-500">ใช้ช่องนี้ทั้งสำหรับบันทึก Scholar ID และนำเข้าผลงาน</p>
                </div>
              </div>

              <div className="space-y-3">
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  placeholder="เช่น: _lza5VIAAAAJ (ถ้าไม่มี _ ระบบจะเติมให้)"
                  value={authorId}
                  onChange={(e) => setAuthorId(e.target.value)}
                />
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={saveScholarAuthorId}
                    disabled={disableManualActions}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {manualAction === "save" ? "กำลังบันทึก..." : "บันทึก Scholar ID"}
                  </button>
                  <button
                    type="button"
                    onClick={importOne}
                    disabled={disableManualActions}
                    className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {manualAction === "import" ? "กำลังนำเข้า..." : "นำเข้าผลงาน"}
                  </button>
                </div>
              </div>

              <div className="space-y-2 rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-600">
                <p>
                  หา Author ID ได้จาก URL โปรไฟล์ Scholar:{" "}
                  <code className="text-[11px]">
                    https://scholar.google.com/citations?user=<span className="font-semibold">_XXXXXXXXXXX</span>
                  </code>
                </p>
                <p>ต้องเลือก User ID และกรอก Author ID ให้ครบก่อนจึงจะกดได้</p>
              </div>
            </div>
          </div>
        </div>

        {msg && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm shadow-sm ${
              MESSAGE_TONE_STYLES[msgTone] || MESSAGE_TONE_STYLES.info
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-base leading-6">
                {MESSAGE_TONE_ICONS[msgTone] || MESSAGE_TONE_ICONS.info}
              </span>
              <p className="flex-1 leading-relaxed">{msg}</p>
            </div>
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-1">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Batch Import</div>
                  <div className="text-lg font-semibold text-slate-900">นำเข้าทั้งหมด</div>
                  <p className="mt-1 text-sm text-slate-600">
                    สำหรับดึงผลงานของทุกคนที่บันทึก Scholar ID ไว้แล้ว
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-600">
                  Automate
                </span>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-purple-400" />
                  <span>เหมาะสำหรับรันเป็นประจำเพื่ออัปเดตข้อมูลให้เป็นปัจจุบัน</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-purple-400" />
                  <span>กดได้เมื่อไม่มีงานนำเข้าแบบ Manual กำลังรันอยู่</span>
                </li>
              </ul>
              <button
                onClick={importAll}
                disabled={disableBatchButton}
                className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {batchRunning ? "กำลังรัน..." : "รัน Batch Import"}
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Schedule</div>
                  <div className="text-lg font-semibold text-slate-900">ตารางนำเข้า</div>
                </div>
                {runsLoading && <span className="text-xs text-slate-500">กำลังโหลด...</span>}
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Last import</div>
                  <div className="mt-1 text-base font-semibold text-slate-900">{lastImportDisplay}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Next scheduled import</div>
                  <div className="mt-1 text-base font-semibold text-slate-900">{nextImportDisplay}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 md:col-span-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Last run status/result</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getRunStatusBadgeClass(
                        lastRunStatusDisplay
                      )}`}
                    >
                      {lastRunStatusDisplay}
                    </span>
                    {lastRunSummary && <span className="text-xs text-slate-600">{lastRunSummary}</span>}
                  </div>
                  {lastRunError && (
                    <div className="mt-2 text-xs text-rose-600" title={lastRunError}>
                      {lastRunError}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Import Logs</div>
                <div className="text-lg font-semibold text-slate-900">ประวัติการนำเข้า</div>
                <p className="text-xs text-slate-500">ดึงจากตาราง scholar_import_runs</p>
              </div>
              <div className="flex items-center gap-2">
                {runsError && <span className="text-xs text-rose-600">{runsError}</span>}
                <button
                  onClick={() => fetchRuns(currentPage)}
                  disabled={runsLoading}
                  className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {runsLoading ? "กำลังโหลด..." : "รีเฟรช"}
                </button>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-3 py-2 text-left">run_id</th>
                    <th className="px-3 py-2 text-left">trigger_source</th>
                    <th className="px-3 py-2 text-left">started_at</th>
                    <th className="px-3 py-2 text-left">finished_at</th>
                    <th className="px-3 py-2 text-left">status</th>
                    <th className="px-3 py-2 text-right">fetched_count</th>
                    <th className="px-3 py-2 text-right">created_count</th>
                    <th className="px-3 py-2 text-right">updated_count</th>
                    <th className="px-3 py-2 text-left">error_message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {runs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-3 py-6 text-center text-sm text-slate-500">
                        ไม่มีประวัติการนำเข้า
                      </td>
                    </tr>
                  ) : (
                    runs.map((run) => {
                      const fetched = run.publications_fetched ?? run.fetched ?? run.fetched_count;
                      const created = run.publications_created ?? run.created ?? run.created_count;
                      const updated = run.publications_updated ?? run.updated ?? run.updated_count;
                      const statusText = run.status ? run.status.toUpperCase() : "-";
                      return (
                        <tr key={run.id || run.run_id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 whitespace-nowrap text-slate-900">{run.id ?? run.run_id ?? "-"}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-slate-700">{run.trigger_source || "-"}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-slate-700">{formatDateTime(run.started_at)}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-slate-700">{formatDateTime(run.finished_at)}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getRunStatusBadgeClass(
                                statusText
                              )}`}
                            >
                              {statusText}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-right text-slate-900">{formatNumber(fetched)}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-right text-slate-900">{formatNumber(created)}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-right text-slate-900">{formatNumber(updated)}</td>
                          <td className="px-3 py-2 text-slate-700">
                            <div className="max-w-xs truncate" title={run.error_message || ""}>
                              {run.error_message || "-"}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
              <div>ทั้งหมด {formatNumber(runsPagination.total_count)} รายการ</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchRuns(Math.max(1, currentPage - 1))}
                  disabled={!hasPrev || runsLoading}
                  className="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ก่อนหน้า
                </button>
                <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                  หน้า {currentPage} / {totalPages}
                </div>
                <button
                  onClick={() => fetchRuns(hasNext ? currentPage + 1 : currentPage)}
                  disabled={!hasNext || runsLoading}
                  className="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ถัดไป
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}