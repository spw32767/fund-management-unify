"use client";

import { useEffect, useMemo, useState } from "react";
import { publicationsAPI, usersAPI, scopusConfigAPI } from "@/app/lib/api";
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

function looksLikeScopusId(value) {
  const normalized = (value || "").trim();
  return /^[0-9]{5,}$/.test(normalized);
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

  const selectedUser = useMemo(
    () => userHits.find((hit) => String(hit.user_id) === String(userId)) || null,
    [userHits, userId]
  );

  const disableManualActions = manualBusy || batchRunning;
  const disableSearchButton = !userQuery.trim() || searching || disableManualActions;
  const disableBatchButton = batchRunning || manualBusy;

  useEffect(() => {
    fetchApiKey();
  }, []);

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

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Manual Import</div>
            <div className="text-xl font-semibold text-slate-900">ค้นหาและจัดการ Scopus Author ID</div>
            <p className="text-sm text-slate-600">
              ค้นหาผู้ใช้ บันทึก Scopus Author ID และสั่งดึงข้อมูลเฉพาะบุคคล
            </p>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                  1
                </span>
                <div>
                  <div className="font-medium text-slate-900">เลือกผู้ใช้จากฐานข้อมูล</div>
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
                            }}
                            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                              isSelected
                                ? "bg-slate-900 text-white"
                                : "border border-slate-300 text-slate-600 hover:bg-slate-900 hover:text-white"
                            }`}
                          >
                            ใช้ User ID {hit.user_id}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600">หรือกรอก User ID</label>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 sm:w-60"
                  placeholder="User ID"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                />
              </div>

              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                  2
                </span>
                <div>
                  <div className="font-medium text-slate-900">กรอก Scopus Author ID</div>
                  <p className="text-xs text-slate-500">ใช้รหัสตัวเลขจากโปรไฟล์ Scopus (AU-ID)</p>
                </div>
              </div>

              <div className="space-y-3">
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  placeholder="เช่น 54683571200"
                  value={scopusId}
                  onChange={(e) => setScopusId(e.target.value)}
                />
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={saveScopusId}
                    disabled={disableManualActions}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {manualAction === "save" ? "กำลังบันทึก..." : "บันทึก Scopus ID"}
                  </button>
                  <button
                    type="button"
                    onClick={importManual}
                    disabled={disableManualActions}
                    className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {manualAction === "import" ? "กำลังนำเข้า..." : "นำเข้าจาก Scopus"}
                  </button>
                </div>
                <div className="rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  <p>ต้องเลือก User ID และกรอก Scopus ID ให้ครบก่อนจึงจะกดได้</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600">
              <div className="text-sm font-semibold text-slate-900">ผู้ใช้ที่เลือก</div>
              {userId ? (
                <div className="mt-3 space-y-2">
                  <div className="font-medium text-slate-900">{selectedUser?.name || `User ID ${userId}`}</div>
                  {selectedUser?.email && <div className="text-xs text-slate-500">{selectedUser.email}</div>}
                  <div className="text-xs text-slate-500">
                    {scopusId ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-1 font-medium text-indigo-700">
                        Scopus ID <code className="font-mono text-xs">{scopusId}</code>
                      </span>
                    ) : (
                      <span className="text-rose-500">ยังไม่ได้กำหนด Scopus ID</span>
                    )}
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

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Batch Import</div>
            <div className="text-xl font-semibold text-slate-900">รันงานนำเข้าแบบกลุ่ม</div>
            <p className="text-sm text-slate-600">
              หากไม่ระบุ User ID ระบบจะรันให้ผู้ใช้ที่มี Scopus ID ทั้งหมด สามารถกำหนดจำนวนสูงสุดต่อรอบได้
            </p>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
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
    </PageLayout>
  );
}