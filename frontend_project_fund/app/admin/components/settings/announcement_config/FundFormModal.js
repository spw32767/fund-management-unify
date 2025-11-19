"use client";

import { useEffect, useState } from "react";
import { FileText, Save } from "lucide-react";
import SettingsModal from "../common/SettingsModal";

export default function FundFormModal({
  open,
  onClose,
  data, // null=create, object=edit
  onSubmit,
  onReplaceFile,
  yearOptions = [],
  loadingYears = false,
}) {
  const isEdit = !!data?.form_id;

  const [form, setForm] = useState({
    title: "",
    description: "",
    form_type: "application",
    fund_category: "both",
    status: "active",
    year_id: "",
  });
  const [fileObj, setFileObj] = useState(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      const resolvedYearId =
        data?.year_id ??
        data?.year?.year_id ??
        data?.Year?.year_id ??
        "";
      setForm({
        title: data?.title ?? "",
        description: data?.description ?? "",
        form_type: data?.form_type ?? "application",
        fund_category: data?.fund_category ?? "both",
        status: data?.status ?? "active",
        year_id: resolvedYearId !== "" && resolvedYearId !== null && resolvedYearId !== undefined ? String(resolvedYearId) : "",
      });
    } else {
      setForm({
        title: "",
        description: "",
        form_type: "application",
        fund_category: "both",
        status: "active",
        year_id: "",
      });
    }
    setFileObj(null);
  }, [open, isEdit, data]);

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = { ...form };

    if (payload.year_id === "") delete payload.year_id;

    if (!isEdit) {
      await onSubmit({ ...payload, file: fileObj });
    } else {
      await onSubmit(payload);
      if (fileObj) {
        await onReplaceFile?.(fileObj);
      }
    }
    onClose?.();
  }

  return (
    <SettingsModal
      open={open}
      onClose={onClose}
      size="xl"
      bodyClassName="max-h-[75vh] overflow-y-auto px-6 py-6"
      headerContent={
        <div className="flex items-center gap-3 text-gray-700">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <FileText size={18} />
          </span>
          <div>
            <p className="text-base font-semibold text-gray-900">
              {isEdit ? "แก้ไขแบบฟอร์มการขอทุน" : "เพิ่มแบบฟอร์มการขอทุน"}
            </p>
            <p className="text-sm text-gray-500">อัปโหลดและจัดระเบียบไฟล์ที่เกี่ยวข้องกับการยื่นขอทุน</p>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-semibold text-gray-700">ชื่อไฟล์/หัวข้อ *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700 focus:outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-200"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-semibold text-gray-700">รายละเอียด</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
            className="w-full min-h-[96px] rounded-lg border border-gray-300 px-3 py-2 text-gray-700 focus:outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-200"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">ประเภทฟอร์ม</label>
          <select
            value={form.form_type}
            onChange={(e) => setForm((s) => ({ ...s, form_type: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700 focus:outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-200"
          >
            <option value="application">แบบฟอร์มสมัคร</option>
            <option value="report">แบบฟอร์มรายงาน</option>
            <option value="evaluation">แบบฟอร์มประเมิน</option>
            <option value="guidelines">แนวทางปฏิบัติ</option>
            <option value="other">อื่นๆ</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">หมวดหมู่กองทุน</label>
          <select
            value={form.fund_category}
            onChange={(e) => setForm((s) => ({ ...s, fund_category: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700 focus:outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-200"
          >
            <option value="research_fund">ทุนวิจัย</option>
            <option value="promotion_fund">ทุนกิจกรรม</option>
            <option value="both">ทั้งสองประเภท</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">สถานะ</label>
          <select
            value={form.status}
            onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700 focus:outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-200"
          >
            <option value="active">เผยแพร่</option>
            <option value="inactive">ปิดเผยแพร่</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">ปี</label>
          <select
            value={form.year_id}
            onChange={(e) => setForm((s) => ({ ...s, year_id: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700 focus:outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-200"
            disabled={loadingYears && yearOptions.length === 0}
          >
            <option value="">ไม่ระบุ</option>
            {yearOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {loadingYears ? <p className="mt-1 text-xs text-gray-500">กำลังโหลดปีงบประมาณ...</p> : null}
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-semibold text-gray-700">
            {isEdit ? "แทนที่ไฟล์ (อัปโหลดไฟล์ใหม่เพื่อแทนที่)" : "ไฟล์แนบ (PDF/DOC/DOCX) *"}
          </label>

          {isEdit && data?.file_name ? (
            <div className="mb-1 text-sm">
              <span className="text-gray-500">ไฟล์ปัจจุบัน: </span>
              <span className="text-gray-700">{data.file_name}</span>
              {data?.file_size_readable ? <span className="text-gray-400"> • {data.file_size_readable}</span> : null}
            </div>
          ) : null}

          <input
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => setFileObj(e.target.files?.[0] || null)}
            required={!isEdit}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700 file:mr-4 file:rounded-lg file:border file:border-gray-300 file:bg-white file:px-4 file:py-2 file:text-gray-700 focus:outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-200"
          />
        </div>

        <div className="md:col-span-2 mt-4 flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
          >
            ยกเลิก
          </button>

          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            <span>บันทึก</span>
          </button>
        </div>
      </form>
    </SettingsModal>
  );
}