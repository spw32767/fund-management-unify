"use client";

import { useEffect, useMemo, useState } from "react";
import { FileDown, Loader2, RefreshCcw } from "lucide-react";
import { adminAPI } from "@/app/lib/admin_api";
import apiClient from "@/app/lib/api";

function buildFileBaseURL() {
  const rawBase =
    process.env.NEXT_PUBLIC_FILE_BASE_URL?.replace(/\/$/, "") ||
    apiClient.baseURL?.replace(/\/$/, "") ||
    "";

  if (!rawBase) return "";
  return rawBase.replace(/\/?api\/v\d+.*/i, "");
}

function resolveFileURL(filePath) {
  if (!filePath) return "";
  if (/^https?:\/\//i.test(filePath)) return filePath;

  const cleanedPath = String(filePath)
    .replace(/^\.\/?/, "")
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/");

  const base = buildFileBaseURL();
  if (!base) {
    return cleanedPath.startsWith("/") ? cleanedPath : `/${cleanedPath}`;
  }

  const normalizedPath = cleanedPath.startsWith("/")
    ? cleanedPath.substring(1)
    : cleanedPath;

  return `${base}/${normalizedPath}`;
}

export default function AdminImportExportPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const hasTemplates = useMemo(() => Array.isArray(templates) && templates.length > 0, [templates]);

  const fetchTemplates = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminAPI.getImportTemplates({ status: "active" });
      setTemplates(data || []);
    } catch (err) {
      setError(err?.message || "ไม่สามารถโหลดเทมเพลตได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Import / Export</div>
        <h1 className="text-2xl font-semibold text-slate-900">จัดการเทมเพลตนำเข้า-ส่งออกข้อมูล</h1>
        <p className="text-sm text-slate-600">
          ดาวน์โหลดเทมเพลต .xlsx สำหรับการนำเข้าข้อมูลและเตรียมไฟล์ให้ตรงตามโครงสร้างที่ระบบรองรับ
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-4 py-3">
          <div className="text-sm font-semibold text-slate-800">รายการเทมเพลต</div>
          <button
            type="button"
            onClick={fetchTemplates}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            รีเฟรช
          </button>
        </div>

        {error && (
          <div className="bg-red-50 px-4 py-3 text-sm text-red-700 border-b border-red-100">{error}</div>
        )}

        <div className="divide-y divide-slate-100">
          {loading && (
            <div className="flex items-center gap-3 px-4 py-4 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              กำลังโหลดรายการเทมเพลต...
            </div>
          )}

          {!loading && !hasTemplates && !error && (
            <div className="px-4 py-6 text-center text-sm text-slate-500">ไม่พบเทมเพลตที่เปิดใช้งาน</div>
          )}

          {hasTemplates &&
            templates.map((template) => {
              const downloadURL = resolveFileURL(template.file_path);
              return (
                <div key={template.template_id || template.file_path} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="text-base font-semibold text-slate-900">{template.title}</div>
                    <div className="text-sm text-slate-600">
                      {template.description?.trim() || "ไม่มีรายละเอียดเพิ่มเติม"}
                    </div>
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      {template.template_type_name || template.template_type}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={downloadURL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                    >
                      <FileDown className="h-4 w-4" /> ดาวน์โหลด
                    </a>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
