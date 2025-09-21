"use client";
import { useEffect, useState } from "react";
import { publicationsAPI, usersAPI } from "@/app/lib/api";

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

export default function AdminPublicationsImport() {
  const [userId, setUserId] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [userHits, setUserHits] = useState([]);
  const [authorId, setAuthorId] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

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
    setLoading(true);
    setMsg("");
    try {
      const res = await usersAPI.search(userQuery.trim());
      setUserHits(res?.data || []);
      if (!res?.data?.length) setMsg("ไม่พบผู้ใช้ในระบบที่ตรงคำค้น");
    } catch (e) {
      setMsg(e.message || "User search error");
    } finally {
      setLoading(false);
    }
  }

  async function importOne() {
    const id = normalizeAuthorId(authorId);
    if (!userId) {
      setMsg("กรุณาเลือกหรือกรอก User ID");
      return;
    }
    if (!looksLikeAuthorId(id)) {
      setMsg("Author ID ไม่ถูกต้อง (ตัวอย่าง: _lza5VIAAAAJ)");
      return;
    }

    setLoading(true);
    setMsg("");
    try {
      const s = await publicationsAPI.importScholarForUser(userId, id);
      setMsg(
        `นำเข้าเสร็จ • fetched ${s.fetched ?? 0} • created ${s.created ?? 0} • updated ${s.updated ?? 0} • failed ${s.failed ?? 0}`
      );
    } catch (e) {
      setMsg(e.message || "Import error");
    } finally {
      setLoading(false);
    }
  }

  async function importAll() {
    setLoading(true);
    setMsg("");
    try {
      const s = await publicationsAPI.importScholarBatch();
      setMsg(
        `Batch • users ${s.users ?? 0} • fetched ${s.fetched ?? 0} • created ${s.created ?? 0} • updated ${s.updated ?? 0} • failed ${s.failed ?? 0}`
      );
    } catch (e) {
      setMsg(e.message || "Batch error");
    } finally {
      setLoading(false);
      fetchRuns(1);
    }
  }

  const lastRun = runs?.[0] || null;
  const lastFinishedRun = runs.find((run) => run?.finished_at);
  const lastImportDisplay = lastFinishedRun?.finished_at ? formatDateTime(lastFinishedRun.finished_at) : "-";
  const nextImportDisplay = scheduleInfo?.next_run_at ? formatDateTime(scheduleInfo.next_run_at) : "-";

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
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">นำเข้าผลงานวิชาการ (Google Scholar)</h2>

      {/* A) เลือกอาจารย์จากฐานข้อมูล (ค้นหาจาก DB) */}
      <div className="p-4 rounded-xl border space-y-3 bg-white">
        <div className="font-medium">เลือกอาจารย์จากฐานข้อมูล</div>
        <div className="flex gap-2">
          <input
            className="flex-1 border rounded-md px-3 py-2"
            placeholder="พิมพ์ชื่อ/อีเมล แล้วกดค้นหา (เช่น: Somchai)"
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
          />
          <button
            onClick={searchUsers}
            disabled={loading}
            className="px-4 py-2 rounded-md bg-slate-700 text-white disabled:opacity-50"
          >
            {loading ? "กำลังค้นหา..." : "ค้นหา"}
          </button>
        </div>
        {userHits.length > 0 && (
          <ul className="space-y-2 mt-3">
            {userHits.map((u) => (
              <li key={u.user_id} className="flex items-center justify-between border rounded-md p-2">
                <div className="text-sm">
                  <div className="font-medium">{u.name || `(ID: ${u.user_id})`}</div>
                  <div className="text-gray-600">{u.email}</div>
                </div>
                <button
                  onClick={() => setUserId(String(u.user_id))}
                  className="px-3 py-1 rounded bg-gray-900 text-white text-sm"
                >
                  ใช้ User ID {u.user_id}
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="text-xs text-gray-600 mt-2">หรือกรอก User ID ตรงๆ:</div>
        <input
          className="border rounded-md px-3 py-2 w-60"
          placeholder="User ID"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
      </div>

      {/* B) กรอก Author ID เท่านั้น (ไม่มีการค้นหาด้วยชื่อ) */}
      <div className="p-4 rounded-xl border space-y-3 bg-white">
        <div className="font-medium">กรอก Google Scholar Author ID</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start">
          <input
            className="border rounded-md px-3 py-2 md:col-span-2"
            placeholder="เช่น: _lza5VIAAAAJ (ถ้าไม่มี _ ระบบจะเติมให้)"
            value={authorId}
            onChange={(e) => setAuthorId(e.target.value)}
          />
          <button
            onClick={importOne}
            disabled={loading}
            className="px-4 py-2 rounded-md bg-green-600 text-white disabled:opacity-50"
          >
            {loading ? "กำลังนำเข้า..." : "นำเข้า"}
          </button>
        </div>
        <div className="text-xs text-gray-600">
          หา Author ID ได้จาก URL โปรไฟล์ Scholar:{" "}
          <code>https://scholar.google.com/citations?user=<b>_XXXXXXXXXXX</b></code>
        </div>
      </div>

      {/* C) Batch Import */}
      <div className="p-4 rounded-xl border space-y-3 bg-white">
        <div className="font-medium">นำเข้าทั้งหมด (เฉพาะผู้ที่บันทึก Scholar ID แล้ว)</div>
        <button
          onClick={importAll}
          disabled={loading}
          className="px-4 py-2 rounded-md bg-purple-600 text-white disabled:opacity-50"
        >
          {loading ? "กำลังรัน..." : "รัน Batch Import"}
        </button>
      </div>

      {!!msg && (
        <div className="p-3 rounded-md bg-yellow-50 text-yellow-800 text-sm border">{msg}</div>
      )}

      <div className="space-y-4">
        <div className="p-4 rounded-xl border bg-white">
          <div className="flex items-center justify-between mb-4">
            <div className="font-medium">ตารางนำเข้า (Schedule)</div>
            {runsLoading && <span className="text-xs text-gray-500">กำลังโหลด...</span>}
          </div>
          <div className="grid gap-4 text-sm md:grid-cols-3">
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-wide text-gray-500">Last import</div>
              <div className="font-medium text-gray-900">{lastImportDisplay}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-wide text-gray-500">Next scheduled import</div>
              <div className="font-medium text-gray-900">{nextImportDisplay}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-wide text-gray-500">Last run status/result</div>
              <div className="font-medium text-gray-900">{lastRunStatusDisplay}</div>
              {lastRunSummary && (
                <div className="text-xs text-gray-600">{lastRunSummary}</div>
              )}
              {lastRunError && (
                <div className="text-xs text-red-600 truncate" title={lastRunError}>
                  {lastRunError}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <div className="font-medium">ประวัติการนำเข้า (Import Logs)</div>
              <div className="text-xs text-gray-500">ดึงจาก scholar_import_runs</div>
            </div>
            <div className="flex items-center gap-2">
              {runsError && <span className="text-xs text-red-600">{runsError}</span>}
              <button
                onClick={() => fetchRuns(currentPage)}
                disabled={runsLoading}
                className="px-3 py-1 text-xs border rounded-md text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                {runsLoading ? "กำลังโหลด..." : "รีเฟรช"}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">run_id</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">trigger_source</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">started_at</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">finished_at</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">status</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700">fetched_count</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700">created_count</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700">updated_count</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">error_message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {runs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-6 text-center text-sm text-gray-500">
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
                        <td className="px-3 py-2 whitespace-nowrap text-gray-900">{run.id ?? run.run_id ?? "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-700">{run.trigger_source || "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-700">{formatDateTime(run.started_at)}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-700">{formatDateTime(run.finished_at)}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-900 font-medium">{statusText}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-right text-gray-900">{formatNumber(fetched)}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-right text-gray-900">{formatNumber(created)}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-right text-gray-900">{formatNumber(updated)}</td>
                        <td className="px-3 py-2 text-gray-700">
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

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600">
            <div>ทั้งหมด {formatNumber(runsPagination.total_count)} รายการ</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchRuns(Math.max(1, currentPage - 1))}
                disabled={!hasPrev || runsLoading}
                className="px-3 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ก่อนหน้า
              </button>
              <div>
                หน้า {currentPage} / {totalPages}
              </div>
              <button
                onClick={() => fetchRuns(hasNext ? currentPage + 1 : currentPage)}
                disabled={!hasNext || runsLoading}
                className="px-3 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ถัดไป
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}