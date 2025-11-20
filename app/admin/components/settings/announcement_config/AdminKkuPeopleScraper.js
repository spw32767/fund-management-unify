"use client";

import { useEffect, useMemo, useState } from "react";
import { kkuPeopleAPI } from "@/app/lib/api";
import PageLayout from "../../common/PageLayout";

const PAGE_SIZE = 20;

const MESSAGE_TONE_STYLES = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  error: "border-rose-200 bg-rose-50 text-rose-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  info: "border-slate-200 bg-slate-50 text-slate-700",
};

const STATUS_BADGE_STYLES = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  failed: "border-rose-200 bg-rose-50 text-rose-700",
  running: "border-amber-200 bg-amber-50 text-amber-700",
};

function formatDateTime(value) {
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
}

function formatDurationSeconds(seconds) {
  if (seconds === null || seconds === undefined) return "-";
  const total = Math.max(0, Math.round(Number(seconds)));
  if (!Number.isFinite(total)) return "-";
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hrs > 0) {
    return `${hrs} ชม. ${mins} นาที ${secs} วินาที`;
  }
  if (mins > 0) {
    return `${mins} นาที ${secs} วินาที`;
  }
  return `${secs} วินาที`;
}

function computeDuration(run) {
  if (!run) return "-";
  if (run.duration_seconds !== undefined && run.duration_seconds !== null) {
    return formatDurationSeconds(run.duration_seconds);
  }
  if (run.started_at && run.finished_at) {
    const start = new Date(run.started_at).getTime();
    const end = new Date(run.finished_at).getTime();
    if (!Number.isNaN(start) && !Number.isNaN(end) && end >= start) {
      return formatDurationSeconds((end - start) / 1000);
    }
  }
  return "-";
}

function statusBadgeClass(status) {
  if (!status) return "border-slate-200 bg-slate-50 text-slate-600";
  const key = status.toLowerCase();
  return STATUS_BADGE_STYLES[key] || "border-slate-200 bg-slate-50 text-slate-600";
}

function truncateMessage(msg, length = 80) {
  if (!msg) return "";
  if (msg.length <= length) return msg;
  return `${msg.slice(0, length - 3)}...`;
}

export default function AdminKkuPeopleScraper() {
  const [statusData, setStatusData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("info");
  const [runBusy, setRunBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ limit: PAGE_SIZE, offset: 0, total: 0, has_next: false, has_prev: false });

  const inProgress = useMemo(() => {
    return Boolean(statusData?.in_progress || statusData?.current_run?.status === "running");
  }, [statusData]);

  const lastRun = useMemo(() => statusData?.last_run || null, [statusData]);

  const refreshStatus = async () => {
    setStatusLoading(true);
    try {
      const res = await kkuPeopleAPI.getStatus();
      const payload = res?.status || res?.data || null;
      if (payload) {
        setStatusData(payload);
      }
    } catch (err) {
      console.error("Failed to fetch scraper status", err);
      setMessage(err?.message || "ไม่สามารถโหลดสถานะได้");
      setMessageTone("error");
    } finally {
      setStatusLoading(false);
    }
  };

  const loadLogs = async (targetPage = 1) => {
    setLogsLoading(true);
    try {
      const offset = (targetPage - 1) * PAGE_SIZE;
      const res = await kkuPeopleAPI.getLogs({ limit: PAGE_SIZE, offset });
      const items = Array.isArray(res?.data) ? res.data : [];
      setLogs(items);
      const meta = res?.pagination || {};
      setPagination({
        limit: meta.limit ?? PAGE_SIZE,
        offset: meta.offset ?? offset,
        total: meta.total ?? items.length,
        has_next: Boolean(meta.has_next ?? (items.length === PAGE_SIZE)),
        has_prev: Boolean(meta.has_prev ?? (targetPage > 1)),
      });
      setPage(targetPage);
    } catch (err) {
      console.error("Failed to fetch scraper logs", err);
      setMessage(err?.message || "ไม่สามารถโหลดประวัติการนำเข้าได้");
      setMessageTone("error");
    } finally {
      setLogsLoading(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([refreshStatus(), loadLogs(page)]);
  };

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRun = async (dryRun = false) => {
    if (runBusy) return;
    setRunBusy(true);
    setMessage("");
    setMessageTone("info");
    try {
      const res = await kkuPeopleAPI.run({ dry_run: dryRun });
      const summary = res?.summary || {};
      const run = res?.run || {};
      setMessage(
        dryRun
          ? `Dry run สำเร็จ • fetched ${summary.fetched_count ?? 0} • created ${summary.created_count ?? 0} • updated ${summary.updated_count ?? 0}`
          : `นำเข้าเสร็จ • fetched ${summary.fetched_count ?? 0} • created ${summary.created_count ?? 0} • updated ${summary.updated_count ?? 0}`
      );
      setMessageTone("success");
      if (run) {
        setStatusData((prev) => ({ ...(prev || {}), last_run: run, in_progress: false }));
      }
      await refreshAll();
    } catch (err) {
      console.error("KKU scraper run failed", err);
      setMessage(err?.message || "ไม่สามารถเรียกใช้งานตัวดึงข้อมูลได้");
      setMessageTone("error");
      await refreshStatus();
    } finally {
      setRunBusy(false);
    }
  };

  const handleRefresh = async () => {
    setMessage("");
    setMessageTone("info");
    await refreshAll();
  };

  const totalPages = useMemo(() => {
    if (!pagination || !pagination.limit) return 1;
    return Math.max(1, Math.ceil((pagination.total || 0) / pagination.limit));
  }, [pagination]);

  const canRun = !runBusy && !inProgress;

  return (
    <PageLayout
      title="KKU Profile Scraper"
      subtitle="รันสคริปต์เพื่อนำเข้าข้อมูลบุคลากรจากเว็บไซต์คณะ"
      breadcrumbs={[
        { label: "หน้าแรก", href: "/admin" },
        { label: "KKU Profile Scraper" },
      ]}
    >
      <div className="space-y-6">
        <div className="bg-white shadow-sm border border-slate-200 rounded-xl p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">KKU Profile Scraper</h2>
              <p className="text-sm text-slate-500">รันสคริปต์เพื่อนำเข้าข้อมูลบุคลากรจากเว็บไซต์คณะ</p>
            </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleRun(false)}
              disabled={!canRun}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
                canRun ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-400 cursor-not-allowed"
              }`}
            >
              {runBusy && !inProgress ? <span className="animate-spin">⏳</span> : null}
              รันทันที
            </button>
            <button
              type="button"
              onClick={() => handleRun(true)}
              disabled={!canRun}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                canRun ? "border border-slate-300 text-slate-700 hover:bg-slate-50" : "border border-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              {runBusy && !inProgress ? <span className="animate-spin">⏳</span> : null}
              Dry Run
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium border border-slate-300 text-slate-600 hover:bg-slate-50"
            >
              {statusLoading || logsLoading ? <span className="animate-spin">⏳</span> : null}
              รีเฟรช
            </button>
          </div>
        </div>

        {message ? (
          <div className={`mt-4 rounded-lg border px-4 py-3 text-sm ${MESSAGE_TONE_STYLES[messageTone] || MESSAGE_TONE_STYLES.info}`}>
            {message}
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase text-slate-500">ครั้งล่าสุด</p>
            <p className="mt-1 text-sm font-medium text-slate-800">{formatDateTime(lastRun?.finished_at || lastRun?.started_at)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase text-slate-500">รอบถัดไป</p>
            <p className="mt-1 text-sm font-medium text-slate-800">{statusData?.next_run_at ? formatDateTime(statusData.next_run_at) : "-"}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase text-slate-500">ผลลัพธ์ล่าสุด</p>
            <span className={`inline-flex mt-1 items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeClass(lastRun?.status)}`}>
              {lastRun?.status ? lastRun.status.toUpperCase() : "-"}
              {lastRun?.dry_run ? <span className="ml-1 text-[10px] uppercase text-slate-500">DRY RUN</span> : null}
            </span>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase text-slate-500">ระยะเวลา</p>
            <p className="mt-1 text-sm font-medium text-slate-800">{computeDuration(lastRun)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-800">ประวัติการนำเข้า (Import Logs)</h3>
            <p className="text-sm text-slate-500">เรียงจากล่าสุดก่อน จำกัด {PAGE_SIZE} รายการต่อหน้า</p>
          </div>
          {inProgress ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 border border-amber-200">
              <span className="animate-spin">⏳</span>
              กำลังดำเนินการอยู่
            </div>
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Run ID</th>
                <th className="px-4 py-3 text-left">เริ่ม</th>
                <th className="px-4 py-3 text-left">สิ้นสุด</th>
                <th className="px-4 py-3 text-left">สถานะ</th>
                <th className="px-4 py-3 text-right">Fetched</th>
                <th className="px-4 py-3 text-right">Created</th>
                <th className="px-4 py-3 text-right">Updated</th>
                <th className="px-4 py-3 text-left">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {logsLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                    กำลังโหลด...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                    ยังไม่มีประวัติการนำเข้า
                  </td>
                </tr>
              ) : (
                logs.map((run) => (
                  <tr key={run.run_id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800">#{run.run_id}</span>
                        {run.dry_run ? <span className="text-xs text-slate-500">Dry Run</span> : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDateTime(run.started_at)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDateTime(run.finished_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeClass(run.status)}`}>
                        {run.status ? run.status.toUpperCase() : "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{run.fetched_count ?? 0}</td>
                    <td className="px-4 py-3 text-right font-mono">{run.created_count ?? 0}</td>
                    <td className="px-4 py-3 text-right font-mono">{run.updated_count ?? 0}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {run.error_message ? (
                        <span title={run.error_message}>{truncateMessage(run.error_message)}</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {logs.length > 0 || pagination.total > PAGE_SIZE ? (
          <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
            <div>
              แสดง {(pagination.offset || 0) + 1} -
              {Math.min((pagination.offset || 0) + PAGE_SIZE, pagination.total || logs.length)} จาก {pagination.total || logs.length} รายการ
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => loadLogs(Math.max(1, page - 1))}
                disabled={!pagination.has_prev && page <= 1}
                className={`rounded-lg border px-3 py-1 transition ${
                  pagination.has_prev || page > 1 ? "border-slate-300 text-slate-600 hover:bg-slate-50" : "border-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                ก่อนหน้า
              </button>
              <span>
                หน้า {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => loadLogs(page + 1)}
                disabled={!pagination.has_next}
                className={`rounded-lg border px-3 py-1 transition ${
                  pagination.has_next ? "border-slate-300 text-slate-600 hover:bg-slate-50" : "border-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                ถัดไป
              </button>
            </div>
          </div>
        ) : null}
        </div>
      </div>
    </PageLayout>
  );
}