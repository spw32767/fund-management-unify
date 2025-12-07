"use client";

import { useEffect, useMemo, useState } from "react";
import { publicationsAPI, usersAPI, scopusConfigAPI, scopusImportAPI } from "@/app/lib/api";
import PageLayout from "../../common/PageLayout";

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

const manualSummaryItems = [
  { key: "documents_fetched", label: "ดึงข้อมูล (documents)" },
  { key: "documents_created", label: "เพิ่มใหม่" },
  { key: "documents_updated", label: "อัปเดต" },
  { key: "documents_failed", label: "ผิดพลาด" },
  { key: "authors_created", label: "ผู้เขียนเพิ่มใหม่" },
  { key: "authors_updated", label: "ผู้เขียนอัปเดต" },
  { key: "affiliations_created", label: "สังกัดเพิ่มใหม่" },
  { key: "affiliations_updated", label: "สังกัดอัปเดต" },
  { key: "document_authors_inserted", label: "ลิงก์ผู้เขียนเพิ่มใหม่" },
  { key: "document_authors_updated", label: "ลิงก์ผู้เขียนอัปเดต" },
];

const batchSummaryItems = [
  { key: "users_processed", label: "ผู้ใช้งานที่ประมวลผล" },
  { key: "users_with_errors", label: "ผู้ใช้ที่ผิดพลาด" },
  ...manualSummaryItems,
];

const metricsSummaryItems = [
  { key: "journals_scanned", label: "วารสารที่ตรวจสอบ" },
  { key: "metrics_fetched", label: "ดึงข้อมูลใหม่" },
  { key: "skipped_existing", label: "พบข้อมูลเดิม" },
  { key: "errors", label: "ผิดพลาด" },
];

function looksLikeScopusId(value) {
  const normalized = (value || "").trim();
  return /^[0-9]{5,}$/.test(normalized);
}

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

function getJobStatusBadge(statusText) {
  const normalized = (statusText || "").toLowerCase();
  if (["success", "completed", "done"].includes(normalized)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (["failed", "error"].includes(normalized)) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (["running", "in_progress", "in-progress"].includes(normalized)) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function maskApiKey(value) {
  const normalized = (value || "").trim();
  if (!normalized) return "-";
  if (normalized.length <= 4) {
    return "•".repeat(normalized.length);
  }
  const suffix = normalized.slice(-4);
  const prefix = "•".repeat(Math.max(4, normalized.length - 4));
  return `${prefix}${suffix}`;
}

function SummaryGrid({ summary, items }) {
  if (!summary) return null;
  return (
    <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(({ key, label }) => (
        <div key={key} className="rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
          <dd className="mt-1 text-lg font-semibold text-slate-900">
            {Number(summary?.[key] ?? 0).toLocaleString("th-TH")}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default function AdminScopusImport() {
  const [userQuery, setUserQuery] = useState("");
  const [userHits, setUserHits] = useState([]);
  const [userId, setUserId] = useState("");
  const [scopusId, setScopusId] = useState("");
  const [searching, setSearching] = useState(false);
  const [manualBusy, setManualBusy] = useState(false);
  const [manualAction, setManualAction] = useState("");
  const [batchRunning, setBatchRunning] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgTone, setMsgTone] = useState("info");
  const [lastManualSummary, setLastManualSummary] = useState(null);
  const [lastBatchSummary, setLastBatchSummary] = useState(null);
  const [lastMetricsSummary, setLastMetricsSummary] = useState(null);
  const [batchUserIds, setBatchUserIds] = useState("");
  const [batchLimit, setBatchLimit] = useState("");

  const [apiKeyValue, setApiKeyValue] = useState("");
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [apiKeyError, setApiKeyError] = useState("");
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [apiKeyEditing, setApiKeyEditing] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiKeySaving, setApiKeySaving] = useState(false);
  const [apiKeyConfirming, setApiKeyConfirming] = useState(false);
  const [apiKeyValidationError, setApiKeyValidationError] = useState("");
  const [metricsBackfillRunning, setMetricsBackfillRunning] = useState(false);
  const [metricsRefreshRunning, setMetricsRefreshRunning] = useState(false);

  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState("");
  const [jobsPagination, setJobsPagination] = useState({
    current_page: 1,
    per_page: 10,
    total_pages: 0,
    total_count: 0,
    has_next: false,
    has_prev: false,
  });
  const [jobsPage, setJobsPage] = useState(1);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsPagination, setRequestsPagination] = useState({
    current_page: 1,
    per_page: 10,
    total_pages: 0,
    total_count: 0,
    has_next: false,
    has_prev: false,
  });
  const [requestsPage, setRequestsPage] = useState(1);

  const selectedUser = useMemo(
    () => userHits.find((hit) => String(hit.user_id) === String(userId)) || null,
    [userHits, userId]
  );
  const selectedJob = useMemo(
    () => jobs.find((job) => String(job.id) === String(selectedJobId)) || null,
    [jobs, selectedJobId]
  );

  const disableManualActions = manualBusy || batchRunning;
  const disableSearchButton = !userQuery.trim() || searching || disableManualActions;
  const disableBatchButton = batchRunning || manualBusy;
  const disableBackfillButton = metricsBackfillRunning;
  const disableRefreshButton = metricsRefreshRunning;

  const computedJobTotalPages =
    jobsPagination.total_pages ||
    (jobsPagination.total_count && jobsPagination.per_page
      ? Math.ceil(jobsPagination.total_count / jobsPagination.per_page)
      : 1);
  const jobsTotalPages = computedJobTotalPages > 0 ? computedJobTotalPages : 1;
  const jobHasPrev = jobsPagination.has_prev ?? jobsPage > 1;
  const jobHasNext = jobsPagination.has_next ?? jobsPage < jobsTotalPages;

  const computedRequestTotalPages =
    requestsPagination.total_pages ||
    (requestsPagination.total_count && requestsPagination.per_page
      ? Math.ceil(requestsPagination.total_count / requestsPagination.per_page)
      : 1);
  const requestsTotalPages = computedRequestTotalPages > 0 ? computedRequestTotalPages : 1;
  const requestsHasPrev = requestsPagination.has_prev ?? requestsPage > 1;
  const requestsHasNext =
    requestsPagination.has_next ?? requestsPage < requestsTotalPages;

  useEffect(() => {
    fetchApiKey();
    fetchJobs(1);
  }, []);

  useEffect(() => {
    if (selectedJobId) {
      fetchRequests(selectedJobId, 1);
    }
  }, [selectedJobId]);

  async function fetchJobs(page = 1) {
    setJobsLoading(true);
    setJobsError("");
    try {
      const res = await scopusImportAPI.listJobs({ page });
      const items = Array.isArray(res?.data) ? res.data : [];
      setJobs(items);
      if (items.length > 0) {
        const stillExists = items.some((job) => String(job.id) === String(selectedJobId));
        if (!selectedJobId || !stillExists) {
          setSelectedJobId(items[0].id);
        }
      }

      const paginationRaw = res?.pagination || {};
      const normalized = {
        current_page: paginationRaw.current_page ?? page,
        per_page: paginationRaw.per_page ?? 10,
        total_pages: paginationRaw.total_pages ?? paginationRaw.totalPages ?? 0,
        total_count: paginationRaw.total_count ?? paginationRaw.totalCount ?? items.length,
        has_next: paginationRaw.has_next ?? false,
        has_prev: paginationRaw.has_prev ?? false,
      };
      setJobsPagination(normalized);
      setJobsPage(normalized.current_page);
    } catch (error) {
      setJobsError(error?.message || "ไม่สามารถโหลดประวัติการเรียก Scopus API ได้");
    } finally {
      setJobsLoading(false);
    }
  }

  async function fetchRequests(jobId, page = 1) {
    if (!jobId) return;
    setRequestsLoading(true);
    setRequests([]);
    try {
      const res = await scopusImportAPI.listRequests(jobId, { page });
      const items = Array.isArray(res?.data) ? res.data : [];
      setRequests(items);
      const paginationRaw = res?.pagination || {};
      const normalized = {
        current_page: paginationRaw.current_page ?? page,
        per_page: paginationRaw.per_page ?? 10,
        total_pages: paginationRaw.total_pages ?? paginationRaw.totalPages ?? 0,
        total_count: paginationRaw.total_count ?? paginationRaw.totalCount ?? items.length,
        has_next: paginationRaw.has_next ?? false,
        has_prev: paginationRaw.has_prev ?? false,
      };
      setRequestsPagination(normalized);
      setRequestsPage(normalized.current_page);
    } catch (error) {
      setRequests([]);
    } finally {
      setRequestsLoading(false);
    }
  }

  async function fetchApiKey() {
    setApiKeyLoading(true);
    setApiKeyError("");
    try {
      const res = await scopusConfigAPI.getAPIKey();
      const payload = res?.data || res || {};
      const value =
        typeof payload?.value === "string"
          ? payload.value
          : typeof payload?.value === "number"
          ? String(payload.value)
          : "";
      setApiKeyValue(value);
      setApiKeyInput(value);
    } catch (error) {
      setApiKeyError(error?.message || "ไม่สามารถโหลด Scopus API Key ได้");
    } finally {
      setApiKeyLoading(false);
      setApiKeyVisible(false);
    }
  }

  function startEditingApiKey() {
    setApiKeyEditing(true);
    setApiKeyInput(apiKeyValue);
    setApiKeyValidationError("");
    setApiKeyConfirming(false);
    setApiKeyVisible(false);
  }

  function cancelEditingApiKey() {
    setApiKeyEditing(false);
    setApiKeyInput(apiKeyValue);
    setApiKeyValidationError("");
    setApiKeyConfirming(false);
    setApiKeyVisible(false);
  }

  function requestApiKeySave() {
    const nextValue = apiKeyInput.trim();
    if (!nextValue) {
      setApiKeyValidationError("กรุณากรอก API Key");
      return;
    }
    setApiKeyValidationError("");
    setApiKeyConfirming(true);
  }

  async function confirmApiKeySave() {
    const nextValue = apiKeyInput.trim();
    if (!nextValue) {
      setApiKeyValidationError("กรุณากรอก API Key");
      setApiKeyConfirming(false);
      return;
    }
    setApiKeySaving(true);
    try {
      await scopusConfigAPI.updateAPIKey(nextValue);
      setApiKeyValue(nextValue);
      setApiKeyInput(nextValue);
      setApiKeyEditing(false);
      setMsg("อัปเดต Scopus API Key เรียบร้อย");
      setMsgTone("success");
    } catch (error) {
      setMsg(error?.message || "บันทึก Scopus API Key ไม่สำเร็จ");
      setMsgTone("error");
    } finally {
      setApiKeySaving(false);
      setApiKeyConfirming(false);
    setApiKeyVisible(false);
  }

  function goToJobsPage(page) {
    if (page < 1) return;
    setJobsPage(page);
    fetchJobs(page);
  }

  function goToRequestsPage(page) {
    if (!selectedJobId || page < 1) return;
    setRequestsPage(page);
    fetchRequests(selectedJobId, page);
  }
  }

  async function searchUsers() {
    if (!userQuery.trim()) return;
    setSearching(true);
    setMsg("");
    try {
      const res = await usersAPI.search(userQuery.trim());
      const hits = Array.isArray(res?.data) ? res.data : [];
      setUserHits(hits);
      if (!hits.length) {
        setMsg("ไม่พบผู้ใช้ที่ตรงคำค้น");
        setMsgTone("warning");
      } else {
        setMsg("");
      }
    } catch (error) {
      setMsg(error?.message || "ค้นหาไม่สำเร็จ");
      setMsgTone("error");
    } finally {
      setSearching(false);
    }
  }

  async function saveScopusId() {
    if (!userId) {
      setMsg("กรุณาเลือก User ID ก่อน");
      setMsgTone("warning");
      return;
    }
    if (!looksLikeScopusId(scopusId)) {
      setMsg("Scopus Author ID ต้องเป็นตัวเลขอย่างน้อย 5 หลัก");
      setMsgTone("warning");
      return;
    }

    setManualBusy(true);
    setManualAction("save");
    setMsg("");
    try {
      await usersAPI.setScopusAuthorId(userId, scopusId.trim());
      setUserHits((prev) =>
        prev.map((hit) =>
          String(hit.user_id) === String(userId)
            ? { ...hit, scopus_id: scopusId.trim() }
            : hit
        )
      );
      setMsg(`บันทึก Scopus ID (${scopusId.trim()}) เรียบร้อย`);
      setMsgTone("success");
    } catch (error) {
      setMsg(error?.message || "บันทึก Scopus ID ไม่สำเร็จ");
      setMsgTone("error");
    } finally {
      setManualBusy(false);
      setManualAction("");
    }
  }

  async function importManual() {
    if (!userId || !looksLikeScopusId(scopusId)) {
      setMsg("กรุณากรอก Scopus ID ที่ถูกต้องและเลือกผู้ใช้");
      setMsgTone("warning");
      return;
    }

    setManualBusy(true);
    setManualAction("import");
    setMsg("");
    try {
      const summary = await publicationsAPI.importScopusForUser(userId, scopusId.trim());
      setLastManualSummary(summary);
      setMsg("นำเข้าจาก Scopus สำเร็จ");
      setMsgTone("success");
    } catch (error) {
      setMsg(error?.message || "นำเข้าไม่สำเร็จ");
      setMsgTone("error");
    } finally {
      setManualBusy(false);
      setManualAction("");
    }
  }

  async function importBatch() {
    setBatchRunning(true);
    setMsg("");
    try {
      const payload = {};
      if (batchUserIds.trim()) {
        payload.user_ids = batchUserIds
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean)
          .join(",");
      }
      if (batchLimit.trim()) {
        payload.limit = batchLimit.trim();
      }
      const summary = await publicationsAPI.importScopusBatch(payload);
      setLastBatchSummary(summary);
      setMsg("สั่งรัน Batch Import สำเร็จ");
      setMsgTone("success");
    } catch (error) {
      setMsg(error?.message || "Batch Import ไม่สำเร็จ");
      setMsgTone("error");
    } finally {
      setBatchRunning(false);
    }
  }

  async function backfillCiteScoreMetrics() {
    setMetricsBackfillRunning(true);
    setMsg("");
    try {
      const summary = await scopusConfigAPI.backfillMetrics();
      setLastMetricsSummary(summary);
      setMsg("ดึง CiteScore metrics สำหรับวารสารที่มีอยู่แล้วสำเร็จ");
      setMsgTone("success");
    } catch (error) {
      setMsg(error?.message || "ดึง CiteScore metrics ไม่สำเร็จ");
      setMsgTone("error");
    } finally {
      setMetricsBackfillRunning(false);
    }
  }

  async function refreshCiteScoreMetrics() {
    setMetricsRefreshRunning(true);
    setMsg("");
    try {
      await scopusConfigAPI.refreshMetrics();
      setMsg("CiteScore metrics updated successfully.");
      setMsgTone("success");
    } catch (error) {
      setMsg(error?.message || "ไม่สามารถอัปเดต CiteScore metrics ได้");
      setMsgTone("error");
    } finally {
      setMetricsRefreshRunning(false);
    }
  }

  return (
    <PageLayout
      title="นำเข้าผลงานวิชาการ (Scopus)"
      subtitle="จัดการ Scopus Author ID, API Key และสั่งนำเข้าผลงานผ่านบริการ Scopus"
      breadcrumbs={[
        { label: "หน้าแรก", href: "/admin" },
        { label: "นำเข้าผลงานวิชาการ (Scopus)" },
      ]}
    >
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Scopus Publications Import</div>
            <div className="text-xl font-semibold text-slate-900">นำเข้าผลงานวิชาการ (Scopus)</div>
            <p className="text-sm text-slate-600">
              ค้นหาและบันทึก Scopus Author ID แล้วสั่งนำเข้าแบบรายบุคคลหรือแบบกลุ่มได้จากหน้านี้
            </p>
          </div>

          <div className="mt-6 space-y-8">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-5">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                    1
                  </span>
                  <div>
                    <div className="font-medium text-slate-900">ค้นหาและเลือกผู้ใช้</div>
                    <p className="text-xs text-slate-500">ค้นหาจากชื่อ/อีเมล หรือกรอก User ID ได้โดยตรง</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    placeholder="พิมพ์ชื่อหรืออีเมล"
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
                      {userHits.map((hit) => {
                        const isSelected = String(hit.user_id) === String(userId);
                        return (
                          <li
                            key={hit.user_id}
                            className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-3 text-sm shadow-sm transition ${
                              isSelected
                                ? "border-slate-900 bg-white ring-1 ring-slate-300"
                                : "border-slate-200 bg-white hover:border-slate-300"
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="font-medium text-slate-900">{hit.name || `(ID: ${hit.user_id})`}</div>
                              {hit.email && <div className="text-xs text-slate-500">{hit.email}</div>}
                              {hit.scopus_id ? (
                                <div className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                                  Scopus ID <code className="font-mono text-xs">{hit.scopus_id}</code>
                                </div>
                              ) : (
                                <div className="text-[11px] text-slate-400">ยังไม่บันทึก Scopus ID</div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setUserId(String(hit.user_id));
                                setScopusId(hit.scopus_id || "");
                                setMsg("");
                              }}
                              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                                isSelected
                                  ? "border border-slate-900 bg-slate-900 text-white"
                                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              {isSelected ? "เลือกแล้ว" : "เลือก"}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>

              <div className="space-y-5 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                    2
                  </span>
                  <div>
                    <div className="font-medium text-slate-900">บันทึก Scopus Author ID</div>
                    <p className="text-xs text-slate-500">ตรวจสอบความถูกต้องก่อนบันทึกและดึงข้อมูล</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Scopus Author ID</label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      placeholder="เช่น 57203294219"
                      value={scopusId}
                      onChange={(e) => setScopusId(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={saveScopusId}
                      disabled={manualBusy}
                      className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    >
                      {manualAction === "save" ? "กำลังบันทึก..." : "บันทึก Scopus ID"}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">นำเข้าเฉพาะบุคคล</label>
                  <p className="text-xs text-slate-500">จะดึงข้อมูลผลงานทั้งหมดของผู้ใช้ที่เลือกทันที</p>
                  <button
                    type="button"
                    onClick={importManual}
                    disabled={manualBusy}
                    className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {manualAction === "import" ? "กำลังนำเข้า..." : "นำเข้าจาก Scopus"}
                  </button>
                </div>

                {selectedUser ? (
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                    <div className="font-semibold text-slate-900">กำลังทำงานกับ</div>
                    <div className="mt-1 space-y-1">
                      <div>ชื่อ: {selectedUser.name || "-"}</div>
                      <div>อีเมล: {selectedUser.email || "-"}</div>
                      <div>User ID: {selectedUser.user_id}</div>
                      <div>Scopus ID: {selectedUser.scopus_id || "(ยังไม่บันทึก)"}</div>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-slate-500">ยังไม่ได้เลือกผู้ใช้</p>
                )}

                {lastManualSummary && (
                  <div className="mt-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">สรุปรอบล่าสุด</div>
                    <SummaryGrid summary={lastManualSummary} items={manualSummaryItems} />
                  </div>
                )}
              </div>
            </div>

            {msg && (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm shadow-sm ${
                  MESSAGE_TONE_STYLES[msgTone] || MESSAGE_TONE_STYLES.info
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-base leading-6">{MESSAGE_TONE_ICONS[msgTone] || MESSAGE_TONE_ICONS.info}</span>
                  <p className="flex-1 leading-relaxed">{msg}</p>
                </div>
              </div>
            )}

            <div className="border-t border-slate-200 pt-6">
              <div className="flex flex-col gap-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Batch Import</div>
                <div className="text-lg font-semibold text-slate-900">รันงานนำเข้าแบบกลุ่ม</div>
                <p className="text-sm text-slate-600">
                  หากไม่ระบุ User ID ระบบจะรันให้ผู้ใช้ที่มี Scopus ID ทั้งหมด สามารถกำหนดจำนวนสูงสุดต่อรอบได้
                </p>
              </div>

              <div className="mt-4 grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-600">User IDs (CSV, ไม่บังคับ)</label>
                    <textarea
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      rows={3}
                      placeholder="เช่น 12,34,56"
                      value={batchUserIds}
                      onChange={(e) => setBatchUserIds(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Limit ต่อรอบ (ไม่บังคับ)</label>
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      placeholder="เช่น 25"
                      value={batchLimit}
                      onChange={(e) => setBatchLimit(e.target.value)}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4">
                  <div className="text-sm font-semibold text-slate-900">สรุปการรันล่าสุด</div>
                  {lastBatchSummary ? (
                    <SummaryGrid summary={lastBatchSummary} items={batchSummaryItems} />
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">ยังไม่มีข้อมูลการรัน</p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={importBatch}
                  disabled={disableBatchButton}
                  className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {batchRunning ? "กำลังรัน..." : "เริ่ม Batch Import"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">CiteScore Metrics</div>
            <div className="text-xl font-semibold text-slate-900">อัปเดตข้อมูลวารสาร</div>
            <p className="text-sm text-slate-600">
              จัดการข้อมูล CiteScore / Percentile / Quartile จาก Scopus รวมถึงเติมข้อมูลให้วารสารที่มีอยู่แล้ว
            </p>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="text-sm font-semibold text-slate-900">อัปเดต CiteScore Metrics (Scopus)</div>
              <p className="text-sm text-slate-600">
                สั่งรันการดึงข้อมูล scopus_source_metrics จาก Scopus เพื่ออัปเดตเปอร์เซ็นไทล์ ควอร์ไทล์ และค่าชี้วัดล่าสุดในฐานข้อมูล
              </p>
              <button
                type="button"
                onClick={refreshCiteScoreMetrics}
                disabled={disableRefreshButton}
                className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {metricsRefreshRunning ? "กำลังอัปเดต..." : "Run CiteScore Refresh"}
              </button>
              <p className="text-[11px] text-slate-500">ป้องกันการคลิกซ้ำขณะกำลังทำงาน และตรวจสอบ API Key ก่อนเริ่ม</p>
            </div>

            <div className="space-y-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4">
              <div className="text-sm font-semibold text-slate-900">สถานะการอัปเดต</div>
              <p className="text-xs text-slate-600">
                หากมีการเก็บประวัติรัน ระบบจะแสดงข้อมูลรอบล่าสุดในอนาคต ปัจจุบันสามารถดูผลลัพธ์ได้จากข้อความแจ้งเตือนเมื่อสั่งรัน
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-slate-200 bg-white/70 p-5">
            <div className="flex flex-col gap-2">
              <div className="text-sm font-semibold text-slate-900">เติมข้อมูลวารสารที่มีอยู่</div>
              <p className="text-sm text-slate-600">
                สแกนวารสารจากเอกสาร Scopus ที่มีอยู่แล้ว และดึง CiteScore / SJR / SNIP หากยังไม่เคยบันทึก
              </p>
            </div>

            <div className="mt-4 grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  การทำงานนี้จะเรียก API ตามจำนวนวารสารที่ยังไม่มีข้อมูลในฐานข้อมูล ควรตรวจสอบว่า API Key ถูกต้องก่อนเริ่ม
                </p>
                <button
                  type="button"
                  onClick={backfillCiteScoreMetrics}
                  disabled={disableBackfillButton}
                  className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {metricsBackfillRunning ? "กำลังสแกน..." : "สั่งดึง CiteScore ให้เอกสารเดิม"}
                </button>
                <p className="text-[11px] text-slate-500">ไม่กระทบการนำเข้าปกติ และข้ามวารสารที่มีข้อมูลอยู่แล้ว</p>
              </div>

              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4">
                <div className="text-sm font-semibold text-slate-900">สรุปการสแกนล่าสุด</div>
                {lastMetricsSummary ? (
                  <SummaryGrid summary={lastMetricsSummary} items={metricsSummaryItems} />
                ) : (
                  <p className="mt-2 text-xs text-slate-500">ยังไม่เคยสแกน</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Scopus API Activity</div>
            <div className="text-xl font-semibold text-slate-900">ประวัติการเรียก Scopus API</div>
            <p className="text-sm text-slate-600">
              แสดงงานนำเข้าที่เรียกใช้ตาราง <code>scopus_api_import_jobs</code> และ <code>scopus_api_requests</code>
              เพื่อช่วยตรวจสอบสถานะล่าสุดและรายละเอียดคำขอ
            </p>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 xl:col-span-1">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-slate-900">งานนำเข้า (scopus_api_import_jobs)</div>
                {jobsLoading && <span className="text-xs text-slate-500">กำลังโหลด...</span>}
              </div>
              {jobsError ? (
                <p className="text-sm text-rose-600">{jobsError}</p>
              ) : jobs.length === 0 && !jobsLoading ? (
                <p className="text-sm text-slate-500">ยังไม่มีประวัติการเรียก</p>
              ) : (
                <ul className="space-y-2">
                  {jobs.map((job) => {
                    const isSelected = String(job.id) === String(selectedJobId);
                    return (
                      <li
                        key={job.id}
                        className={`rounded-lg border p-3 shadow-sm transition ${
                          isSelected
                            ? "border-slate-900 bg-white"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${getJobStatusBadge(job.status)}`}>
                            {job.status || "-"}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-slate-900">Job #{job.id}</span>
                              <span className="text-[11px] text-slate-500">{formatDateTime(job.started_at)}</span>
                            </div>
                            <div className="text-xs text-slate-600">{job.query_string || "-"}</div>
                            <div className="flex flex-wrap gap-2 text-[11px] text-slate-600">
                              {job.scopus_author_id && (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                                  Author: {job.scopus_author_id}
                                </span>
                              )}
                              <span className="rounded-full bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700">
                                Requests: {job.request_count ?? 0}
                              </span>
                              <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                                Items: {job.items_returned ?? 0}
                              </span>
                              {job.total_results !== undefined && job.total_results !== null && (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                                  Total results: {job.total_results}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            className={`rounded-md px-3 py-2 text-xs font-semibold transition ${
                              isSelected
                                ? "bg-slate-900 text-white"
                                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                            onClick={() => setSelectedJobId(job.id)}
                          >
                            {isSelected ? "เลือกอยู่" : "ดูรายละเอียด"}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="flex items-center justify-between text-xs text-slate-600">
                <div>
                  หน้า {jobsPage} / {jobsTotalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => goToJobsPage(jobsPage - 1)}
                    disabled={!jobHasPrev || jobsLoading}
                    className="rounded-md border border-slate-300 px-3 py-1 font-semibold text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    ก่อนหน้า
                  </button>
                  <button
                    type="button"
                    onClick={() => goToJobsPage(jobsPage + 1)}
                    disabled={!jobHasNext || jobsLoading}
                    className="rounded-md border border-slate-300 px-3 py-1 font-semibold text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    ถัดไป
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4 xl:col-span-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">รายละเอียดงาน</div>
                    <div className="text-lg font-semibold text-slate-900">
                      {selectedJob ? `Job #${selectedJob.id}` : "เลือกงานที่ต้องการดู"}
                    </div>
                  </div>
                  {selectedJob && (
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getJobStatusBadge(selectedJob.status)}`}>
                      {selectedJob.status || "-"}
                    </span>
                  )}
                </div>

                {selectedJob ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Scopus Author</div>
                      <div className="mt-1 font-semibold text-slate-900">{selectedJob.scopus_author_id || "-"}</div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Started</div>
                      <div className="mt-1 font-semibold text-slate-900">{formatDateTime(selectedJob.started_at)}</div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Finished</div>
                      <div className="mt-1 font-semibold text-slate-900">{formatDateTime(selectedJob.finished_at)}</div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Total Results</div>
                      <div className="mt-1 font-semibold text-slate-900">{selectedJob.total_results ?? "-"}</div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Requests</div>
                      <div className="mt-1 font-semibold text-slate-900">{selectedJob.request_count ?? 0}</div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Items Returned</div>
                      <div className="mt-1 font-semibold text-slate-900">{selectedJob.items_returned ?? 0}</div>
                    </div>
                    {selectedJob.error_message && (
                      <div className="sm:col-span-2 lg:col-span-3">
                        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                          <div className="text-[11px] font-semibold uppercase tracking-wide">Error Message</div>
                          <p className="mt-1 whitespace-pre-wrap">{selectedJob.error_message}</p>
                        </div>
                      </div>
                    )}
                    {selectedJob.query_string && (
                      <div className="sm:col-span-2 lg:col-span-3">
                        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Query</div>
                          <p className="mt-1 whitespace-pre-wrap font-mono text-xs">{selectedJob.query_string}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-500">เลือกงานจากแถบด้านซ้ายเพื่อดูรายละเอียด</p>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">คำขอที่เกี่ยวข้อง</div>
                    <div className="text-lg font-semibold text-slate-900">scopus_api_requests</div>
                  </div>
                  {requestsLoading && <span className="text-xs text-slate-500">กำลังโหลด...</span>}
                </div>
                {selectedJob ? (
                  requests.length === 0 && !requestsLoading ? (
                    <p className="mt-3 text-sm text-slate-500">ยังไม่มีข้อมูลคำขอสำหรับงานนี้</p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 text-sm">
                          <thead>
                            <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                              <th className="px-3 py-2">สร้างเมื่อ</th>
                              <th className="px-3 py-2">Endpoint</th>
                              <th className="px-3 py-2">สถานะ</th>
                              <th className="px-3 py-2">เวลา (ms)</th>
                              <th className="px-3 py-2">Page</th>
                              <th className="px-3 py-2">Items</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {requests.map((req) => (
                              <tr key={req.id} className="hover:bg-slate-50">
                                <td className="px-3 py-2 text-xs text-slate-600">{formatDateTime(req.created_at)}</td>
                                <td className="px-3 py-2">
                                  <div className="font-mono text-xs text-slate-900">{req.endpoint}</div>
                                  <div className="text-[11px] text-slate-500">{req.http_method}</div>
                                </td>
                                <td className="px-3 py-2 text-xs text-slate-700">{req.response_status ?? "-"}</td>
                                <td className="px-3 py-2 text-xs text-slate-700">{req.response_time_ms ?? "-"}</td>
                                <td className="px-3 py-2 text-xs text-slate-700">
                                  {req.page_start ?? "-"}/{req.page_count ?? "-"}
                                </td>
                                <td className="px-3 py-2 text-xs text-slate-700">{req.items_returned ?? "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <div>
                          หน้า {requestsPage} / {requestsTotalPages}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => goToRequestsPage(requestsPage - 1)}
                            disabled={!requestsHasPrev || requestsLoading}
                            className="rounded-md border border-slate-300 px-3 py-1 font-semibold text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            ก่อนหน้า
                          </button>
                          <button
                            type="button"
                            onClick={() => goToRequestsPage(requestsPage + 1)}
                            disabled={!requestsHasNext || requestsLoading}
                            className="rounded-md border border-slate-300 px-3 py-1 font-semibold text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            ถัดไป
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <p className="mt-3 text-sm text-slate-500">เลือกงานก่อนเพื่อดูรายละเอียดคำขอ</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Scopus API</div>
              <div className="text-xl font-semibold text-slate-900">Scopus API Key</div>
              <p className="mt-1 text-sm text-slate-600">
                ใช้สำหรับเรียก Elsevier Scopus API ทุกการนำเข้า ควรเก็บเป็นความลับและอัปเดตเมื่อจำเป็น
              </p>
            </div>
            <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600">
              Sensitive
            </span>
          </div>

          {apiKeyError && <p className="mt-3 text-sm text-rose-600">{apiKeyError}</p>}

          {apiKeyLoading ? (
            <p className="mt-4 text-sm text-slate-500">กำลังโหลดค่า API Key...</p>
          ) : apiKeyEditing ? (
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">Scopus API Key</label>
                <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                  <input
                    type={apiKeyVisible ? "text" : "password"}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="เช่น abcd1234..."
                  />
                  <button
                    type="button"
                    onClick={() => setApiKeyVisible((prev) => !prev)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    {apiKeyVisible ? "ซ่อน" : "แสดง"}
                  </button>
                </div>
                {apiKeyValidationError && (
                  <p className="mt-1 text-xs text-rose-600">{apiKeyValidationError}</p>
                )}
              </div>

              {apiKeyConfirming ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  <p className="font-semibold">ยืนยันการเปลี่ยน API Key</p>
                  <p>การเปลี่ยนค่านี้มีผลกับการนำเข้าจาก Scopus ทั้งหมด ต้องแน่ใจว่าคีย์ถูกต้องก่อนบันทึก</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={confirmApiKeySave}
                      disabled={apiKeySaving}
                      className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {apiKeySaving ? "กำลังบันทึก..." : "ยืนยันการเปลี่ยน"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setApiKeyConfirming(false)}
                      disabled={apiKeySaving}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={requestApiKeySave}
                    disabled={apiKeySaving}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    บันทึก API Key
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditingApiKey}
                    disabled={apiKeySaving}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    ยกเลิก
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current Key</div>
                <code className="text-base font-semibold text-slate-900">
                  {apiKeyVisible ? apiKeyValue || "-" : maskApiKey(apiKeyValue)}
                </code>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setApiKeyVisible((prev) => !prev)}
                  disabled={!apiKeyValue}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {apiKeyVisible ? "ซ่อน" : "แสดง"}
                </button>
                <button
                  type="button"
                  onClick={startEditingApiKey}
                  className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-950"
                >
                  แก้ไข
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}