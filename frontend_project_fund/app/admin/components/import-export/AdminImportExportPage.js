"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownUp,
  Download,
  UploadCloud,
  FileSpreadsheet,
  Plus,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { apiClient } from "../../../lib/api";
import PageLayout from "../common/PageLayout";
import SettingsModal from "../settings/common/SettingsModal";

const defaultForm = {
  title: "",
  description: "",
  template_type: "user_import",
  status: "active",
  is_required: false,
  display_order: "",
  file: null,
  currentFileName: "",
  currentFileSize: "",
};

function TemplateModal({
  open,
  onClose,
  form,
  onChange,
  onFileChange,
  onSubmit,
  isSubmitting,
  isEdit,
  error,
}) {
  return (
    <SettingsModal
      open={open}
      onClose={onClose}
      size="xl"
      bodyClassName="max-h-[80vh] overflow-y-auto px-6 py-6"
      headerContent={
        <div className="flex items-center gap-3 text-gray-700">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <UploadCloud size={18} />
          </span>
          <div>
            <p className="text-base font-semibold text-gray-900">
              {isEdit ? "แก้ไขเทมเพลตนำเข้า" : "เพิ่มเทมเพลตใหม่"}
            </p>
            <p className="text-sm text-gray-500">
              อัปโหลดไฟล์เทมเพลต (.xlsx/.xls) และกำหนดรายละเอียดที่ต้องการ
            </p>
          </div>
        </div>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-semibold text-gray-700">ชื่อเทมเพลต *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => onChange({ title: e.target.value })}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-semibold text-gray-700">รายละเอียด</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => onChange({ description: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">ประเภทเทมเพลต</label>
            <select
              value={form.template_type}
              onChange={(e) => onChange({ template_type: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="user_import">นำเข้าผู้ใช้</option>
              <option value="legacy_submission">ประวัติทุนย้อนหลัง</option>
              <option value="other">อื่นๆ</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">สถานะ</label>
            <select
              value={form.status}
              onChange={(e) => onChange({ status: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="active">เปิดใช้งาน</option>
              <option value="inactive">ปิดใช้งาน</option>
              <option value="archived">เก็บถาวร</option>
            </select>
          </div>

          <div className="sm:col-span-2 flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2">
            <input
              id="is_required"
              type="checkbox"
              checked={form.is_required}
              onChange={(e) => onChange({ is_required: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="is_required" className="text-sm font-medium text-gray-700">
              จำเป็นต้องใช้ในขั้นตอนนำเข้า
            </label>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">ลำดับการแสดง</label>
            <input
              type="number"
              value={form.display_order}
              onChange={(e) => onChange({ display_order: e.target.value })}
              placeholder="เช่น 1, 2, 3"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="mb-1 block text-sm font-semibold text-gray-700">
            {isEdit ? "อัปโหลดไฟล์ใหม่ (ถ้าต้องการแทนที่)" : "ไฟล์เทมเพลต (.xlsx/.xls) *"}
          </label>
          {isEdit && form.currentFileName ? (
            <p className="text-sm text-gray-600">
              ไฟล์ปัจจุบัน: <span className="font-medium text-gray-800">{form.currentFileName}</span>
              {form.currentFileSize ? <span className="text-gray-400"> • {form.currentFileSize}</span> : null}
            </p>
          ) : null}
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={onFileChange}
            required={!isEdit}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700 file:mr-4 file:rounded-lg file:border file:border-gray-300 file:bg-white file:px-4 file:py-2 file:text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <p className="text-xs text-gray-500">รองรับไฟล์ Excel ขนาดไม่เกิน 10MB</p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            disabled={isSubmitting}
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
            {isEdit ? "บันทึกการแก้ไข" : "บันทึกเทมเพลต"}
          </button>
        </div>
      </form>
    </SettingsModal>
  );
}

export default function AdminImportExportPage() {
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [modalError, setModalError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [userImportFile, setUserImportFile] = useState(null);
  const [legacyImportFile, setLegacyImportFile] = useState(null);
  const [importingType, setImportingType] = useState("");
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState("");
  const showImportSection = false;

  const userImportColumns = useMemo(
    () => [
      "user_fname",
      "user_lname",
      "gender",
      "email",
      "scholar_author_id",
      "role_id",
      "position_id",
      "date_of_employment",
      "prefix",
      "manage_position",
      "position_title",
      "position_en",
      "prefix_position_en",
      "name_en",
      "suffix_en",
      "tel",
      "tel_format",
      "tel_eng",
      "manage_position_en",
      "lab_name",
      "room",
      "cp_web_id",
      "scopus_id",
      "account_status",
    ],
    []
  );

  const submissionImportColumns = useMemo(
    () => [
      "submission_type",
      "user_id",
      "year",
      "category_name",
      "subcategory_name",
      "subcategory_budget",
      "status_id",
      "submitted_at",
      "installment_number_at_submit",
      "project_title",
      "project_description",
      "requested_amount",
      "announce_reference_number",
      "main_announcement",
      "activity_support_announcement",
      "paper_title",
      "journal_name",
      "publication_date",
      "publication_type",
      "quartile",
      "impact_factor",
      "doi",
      "url",
      "author_count",
      "author_type",
      "author_name_list",
      "reward_amount",
      "reward_approve_amount",
      "revision_fee",
      "revision_fee_approve_amount",
      "publication_fee",
      "publication_fee_approve_amount",
      "external_funding_amount",
      "total_amount",
      "total_approve_amount",
      "external_fund_name",
      "external_fund_amount",
      "external_fund_document_id",
      "external_fund_file_id",
      "additional_user_id",
      "additional_user_role",
      "additional_user_is_primary",
      "additional_user_display_order",
      "document_file_id",
      "document_original_name",
      "document_type_id",
      "document_description",
      "document_display_order",
      "document_is_required",
      "document_is_verified",
      "document_verified_by",
      "document_verified_at",
    ],
    []
  );

  const renderColumnList = useCallback((columns) => (
    <div className="rounded-lg border border-slate-200 bg-white/50 p-3 text-xs text-slate-700">
      <p className="mb-2 font-semibold">คอลัมน์ที่ต้องมีตามเทมเพลต:</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {columns.map((col) => (
          <span key={col} className="inline-flex items-center gap-2 rounded-md bg-slate-50 px-2 py-1 font-mono text-[11px] text-slate-700">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            {col}
          </span>
        ))}
      </div>
    </div>
  ), []);

  const handleImport = useCallback(
    async (type) => {
      setImportError("");
      setImportSuccess("");

      const file = type === "user" ? userImportFile : legacyImportFile;
      if (!file) {
        setImportError("กรุณาเลือกไฟล์สำหรับนำเข้าก่อน");
        return;
      }

      setImportingType(type);
      try {
        const payload = new FormData();
        payload.append("file", file);
        payload.append("template_type", type === "user" ? "user_import" : "legacy_submission");

        await apiClient.post(
          type === "user" ? "/admin/import/users" : "/admin/import/legacy-submissions",
          payload
        );

        setImportSuccess(
          type === "user"
            ? "นำเข้าผู้ใช้จากเทมเพลตสำเร็จ ข้อมูลถูกบันทึกในฐานข้อมูล"
            : "นำเข้าประวัติทุนย้อนหลังสำเร็จ ข้อมูลถูกบันทึกในฐานข้อมูล"
        );
        if (type === "user") {
          setUserImportFile(null);
        } else {
          setLegacyImportFile(null);
        }
      } catch (err) {
        console.error("Import failed", err);
        setImportError(err?.message || "นำเข้าข้อมูลไม่สำเร็จ กรุณาตรวจสอบไฟล์และลองใหม่");
      } finally {
        setImportingType("");
      }
    },
    [legacyImportFile, userImportFile]
  );

  const getFileURL = useCallback((filePath) => {
    if (!filePath) return "#";
    if (/^https?:\/\//i.test(filePath)) return filePath;
    const base = apiClient.baseURL.replace(/\/?api\/v1$/, "");
    try {
      return new URL(filePath, base).href;
    } catch (err) {
      console.warn("Invalid file path", err);
      return filePath;
    }
  }, []);

  const getFileType = useCallback((fileName, mimeType) => {
    if (fileName?.includes(".")) {
      return `.${fileName.split(".").pop()}`;
    }
    return mimeType || "-";
  }, []);

  const loadTemplates = useCallback(() => {
    let isSubscribed = true;
    setIsLoading(true);
    setError("");

    apiClient
      .get("/admin/import-templates")
      .then((res) => {
        if (!isSubscribed) return;
        setTemplates(res?.data || []);
      })
      .catch((err) => {
        if (!isSubscribed) return;
        console.error("Failed to load templates", err);
        setError("ไม่สามารถดึงรายการเทมเพลตได้");
      })
      .finally(() => {
        if (!isSubscribed) return;
        setIsLoading(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = loadTemplates();
    return unsubscribe;
  }, [loadTemplates]);

  const resetForm = useCallback(() => {
    setForm(defaultForm);
    setModalError("");
  }, []);

  const openCreateModal = useCallback(() => {
    setEditingTemplate(null);
    resetForm();
    setModalOpen(true);
  }, [resetForm]);

  const openEditModal = useCallback((template) => {
    setEditingTemplate(template);
    setForm({
      ...defaultForm,
      title: template?.title ?? "",
      description: template?.description ?? "",
      template_type: template?.template_type || "user_import",
      status: template?.status || "active",
      is_required: Boolean(template?.is_required),
      display_order:
        template?.display_order === null || template?.display_order === undefined
          ? ""
          : template.display_order,
      currentFileName: template?.file_name || "",
      currentFileSize: template?.file_size_readable || "",
    });
    setModalError("");
    setModalOpen(true);
  }, []);

  const handleFormChange = (patch) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    setForm((prev) => ({ ...prev, file }));
  };

  const submitTemplate = async (e) => {
    e.preventDefault();
    setModalError("");

    if (!form.title.trim()) {
      setModalError("กรุณากรอกชื่อเทมเพลต");
      return;
    }
    if (!editingTemplate && !form.file) {
      setModalError("กรุณาเลือกไฟล์เทมเพลต");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = new FormData();
      payload.append("title", form.title.trim());
      if (form.description?.trim()) payload.append("description", form.description.trim());
      if (form.template_type) payload.append("template_type", form.template_type);
      if (form.status) payload.append("status", form.status);
      payload.append("is_required", form.is_required ? "true" : "false");
      if (form.display_order !== "" && form.display_order !== null && form.display_order !== undefined) {
        payload.append("display_order", String(form.display_order));
      }
      if (form.file) {
        payload.append("file", form.file);
      }

      if (editingTemplate?.template_id) {
        await apiClient.put(`/admin/import-templates/${editingTemplate.template_id}`, payload);
        setStatusMessage("อัปเดตเทมเพลตเรียบร้อยแล้ว");
      } else {
        await apiClient.post("/admin/import-templates", payload);
        setStatusMessage("บันทึกเทมเพลตเรียบร้อยแล้ว");
      }

      setModalOpen(false);
      resetForm();
      await loadTemplates();
    } catch (err) {
      console.error("Failed to save template", err);
      setModalError(err?.message || "ไม่สามารถบันทึกเทมเพลตได้");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (template) => {
    if (!template?.template_id) return;
    const confirmed = window.confirm("ยืนยันการลบเทมเพลตนี้?");
    if (!confirmed) return;
    setDeletingId(template.template_id);
    setStatusMessage("");
    try {
      await apiClient.delete(`/admin/import-templates/${template.template_id}`);
      setStatusMessage("ลบเทมเพลตเรียบร้อยแล้ว");
      await loadTemplates();
    } catch (err) {
      console.error("Delete failed", err);
      setError("ไม่สามารถลบเทมเพลตได้");
    } finally {
      setDeletingId(null);
    }
  };

  const activeTemplates = useMemo(() => templates || [], [templates]);

  return (
    <PageLayout
      title="นำเข้า / ส่งออก"
      subtitle="หน้าสำหรับดาวน์โหลดเทมเพลตและนำเข้าข้อมูลผู้ใช้ / ประวัติการรับทุนย้อนหลัง"
      icon={ArrowDownUp}
      breadcrumbs={[
        { label: "หน้าแรก", href: "/admin" },
        { label: "นำเข้า / ส่งออก" },
      ]}
    >
      <div className="space-y-6">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">จัดการและดาวน์โหลดไฟล์เทมเพลต</h2>
              <p className="text-sm text-slate-600">
                อัปโหลด แก้ไข หรือลบไฟล์เทมเพลต และดาวน์โหลดไฟล์ตัวอย่างที่พร้อมใช้งานสำหรับการนำเข้าข้อมูล
              </p>
            </div>
            <div className="flex items-center justify-start gap-3 sm:justify-end">
              <div className="hidden sm:flex items-center gap-2 rounded-full bg-white px-3 py-1 text-slate-500 shadow-sm">
                <Download size={18} />
                <span className="text-sm">Available Templates</span>
              </div>
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
              >
                <Plus size={16} />
                เพิ่มเทมเพลตใหม่
              </button>
            </div>
          </div>

          {statusMessage ? (
            <div className="border-b border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700 sm:px-6">
              {statusMessage}
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">ชื่อเทมเพลต</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">รายละเอียด</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">ชนิดไฟล์</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">สถานะ</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-slate-700">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {isLoading ? (
                  <tr>
                    <td className="px-6 py-4 text-center text-sm text-slate-600" colSpan={5}>
                      กำลังโหลดรายการเทมเพลต...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td className="px-6 py-4 text-center text-sm text-red-600" colSpan={5}>
                      {error}
                    </td>
                  </tr>
                ) : activeTemplates.length === 0 ? (
                  <tr>
                    <td className="px-6 py-4 text-center text-sm text-slate-600" colSpan={5}>
                      ยังไม่มีเทมเพลตสำหรับดาวน์โหลด
                    </td>
                  </tr>
                ) : (
                  activeTemplates.map((template) => (
                    <tr key={template.template_id || template.title}>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">
                        <div className="flex flex-col gap-1">
                          <span>{template.title}</span>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <FileSpreadsheet size={14} />
                            <span>{template.file_name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {template.description || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {getFileType(template.file_name, template.mime_type)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                            template.status === "active"
                              ? "bg-emerald-50 text-emerald-700"
                              : template.status === "inactive"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {template.status_name || template.status || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 text-sm">
                          <a
                            href={getFileURL(template.file_path)}
                            className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 font-medium text-blue-700 transition hover:bg-blue-100 hover:text-blue-800"
                          >
                            <Download size={16} />
                            ดาวน์โหลด
                          </a>
                          <button
                            type="button"
                            onClick={() => openEditModal(template)}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            <Pencil size={16} />
                            แก้ไข
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(template)}
                            disabled={deletingId === template.template_id}
                            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {deletingId === template.template_id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                            ลบ
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Import section temporarily hidden */}
        {showImportSection ? (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">นำเข้าข้อมูลจากเทมเพลต</h2>
                <p className="text-sm text-slate-600">
                  อัปโหลดไฟล์ที่กรอกข้อมูลแล้ว ระบบจะตรวจสอบและเพิ่มข้อมูลตามเทมเพลตเพื่อป้องกันข้อผิดพลาดในฐานข้อมูล
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-slate-500">
                <UploadCloud size={18} />
                <span className="text-sm">Import</span>
              </div>
            </div>

            {importError ? (
              <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 sm:px-6">{importError}</div>
            ) : null}
            {importSuccess ? (
              <div className="border-b border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700 sm:px-6">{importSuccess}</div>
            ) : null}

            <div className="grid grid-cols-1 gap-6 p-4 sm:grid-cols-2 sm:p-6">
              <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-center gap-2 text-slate-800">
                  <FileSpreadsheet size={18} className="text-blue-600" />
                  <h3 className="text-base font-semibold">นำเข้าผู้ใช้จากไฟล์</h3>
                </div>
                <p className="text-sm text-slate-600">
                  ใช้ไฟล์ "User Import Template" กรอกข้อมูลผู้ใช้ใหม่ให้ครบ จากนั้นัปโหลดที่นี่
                </p>
                <div className="flex flex-col gap-3">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    onChange={(e) => setUserImportFile(e.target.files?.[0] || null)}
                  />
                  <button
                    type="button"
                    onClick={() => handleImport("user")}
                    disabled={importingType === "user"}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {importingType === "user" ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                    {importingType === "user" ? "กำลังนำเข้า..." : "อัปโหลด / นำเข้า"}
                  </button>
                  <p className="text-xs text-slate-500">ระบบจะตรวจสอบคอลัมน์ตามเทมเพลตก่อนเพิ่มผู้ใช้</p>
                  {renderColumnList(userImportColumns)}
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-center gap-2 text-slate-800">
                  <FileSpreadsheet size={18} className="text-green-600" />
                  <h3 className="text-base font-semibold">นำเข้าประวัติทุนย้อนหลัง</h3>
                </div>
                <p className="text-sm text-slate-600">
                  สำหรับบันทึกประวัติทุนของอาจารย์ที่มีทุนมาก่อนใช้ระบบนี้ ใช้เทมเพลตประวัติทุนย้อนหลัง
                </p>
                <div className="flex flex-col gap-3">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    onChange={(e) => setLegacyImportFile(e.target.files?.[0] || null)}
                  />
                  <button
                    type="button"
                    onClick={() => handleImport("legacy")}
                    disabled={importingType === "legacy"}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {importingType === "legacy" ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                    {importingType === "legacy" ? "กำลังนำเข้า..." : "อัปโหลด / นำเข้าประวัติทุน"}
                  </button>
                  <p className="text-xs text-slate-500">ระบบจะตรวจสอบโครงสร้างไฟล์ตามเทมเพลตก่อนเพิ่มข้อมูล</p>
                  {renderColumnList(submissionImportColumns)}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <TemplateModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          resetForm();
        }}
        form={form}
        onChange={handleFormChange}
        onFileChange={handleFileChange}
        onSubmit={submitTemplate}
        isSubmitting={isSubmitting}
        isEdit={Boolean(editingTemplate)}
        error={modalError}
      />
    </PageLayout>
  );
}