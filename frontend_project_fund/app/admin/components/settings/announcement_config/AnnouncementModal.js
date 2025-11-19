"use client";

import { useEffect, useState } from "react";
import { FileText, Save } from "lucide-react";
import SettingsModal from "../common/SettingsModal";

export default function AnnouncementModal({
  open,
  onClose,
  data, // null = create, object = edit
  onSubmit, // (payload) => Promise   // metadata create/update
  onReplaceFile, // (file) => Promise      // สำหรับ edit ถ้ามีเลือกไฟล์ใหม่
  yearOptions = [],
  loadingYears = false,
}) {
  const isEdit = !!data?.announcement_id;

  const [form, setForm] = useState({
    title: "",
    description: "",
    announcement_type: "general",
    announcement_reference_number: "",
    status: "active",
    year_id: "",
    published_at: "",
    expired_at: "",
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
        announcement_type: data?.announcement_type ?? "general",
        announcement_reference_number: data?.announcement_reference_number ?? "",
        status: data?.status ?? "active",
        year_id: resolvedYearId !== "" && resolvedYearId !== null && resolvedYearId !== undefined ? String(resolvedYearId) : "",
        published_at: data?.published_at ? toInputDT(data.published_at) : "",
        expired_at: data?.expired_at ? toInputDT(data.expired_at) : "",
      });
    } else {
      setForm({
        title: "",
        description: "",
        announcement_type: "general",
        announcement_reference_number: "",
        status: "active",
        year_id: "",
        published_at: "",
        expired_at: "",
      });
    }
    setFileObj(null);
  }, [open, isEdit, data]);

  function toInputDT(isoOrStr) {
    try {
      if (!isoOrStr) return "";
      const d = new Date(isoOrStr);
      const tzOffset = d.getTimezoneOffset() * 60000;
      return new Date(d - tzOffset).toISOString().slice(0, 16);
    } catch {
      return "";
    }
  }

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
            <p className="text-base font-semibold text-gray-900">{isEdit ? "แก้ไขประกาศ" : "เพิ่มประกาศ"}</p>
            <p className="text-sm text-gray-500">จัดการข้อมูลประกาศที่จะเผยแพร่ให้ผู้ใช้งาน</p>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-semibold text-gray-700">หัวข้อ *</label>
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
          <label className="mb-1 block text-sm font-semibold text-gray-700">ประเภท</label>
          <select
            value={form.announcement_type}
            onChange={(e) => setForm((s) => ({ ...s, announcement_type: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700 focus:outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-200"
          >
            <option value="general">ทั่วไป</option>
            <option value="research_fund">ทุนวิจัย</option>
            <option value="promotion_fund">ทุนกิจกรรม</option>
            <option value="fund_application">รับสมัครทุน/แบบฟอร์ม</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">เลขอ้างอิง</label>
          <input
            type="text"
            value={form.announcement_reference_number}
            onChange={(e) => setForm((s) => ({ ...s, announcement_reference_number: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700 focus:outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-200"
          />
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

        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">วันเวลาเผยแพร่</label>
          <input
            type="datetime-local"
            value={form.published_at}
            onChange={(e) => setForm((s) => ({ ...s, published_at: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700 focus:outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-200"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">วันเวลาหมดอายุ</label>
          <input
            type="datetime-local"
            value={form.expired_at}
            onChange={(e) => setForm((s) => ({ ...s, expired_at: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700 focus:outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-200"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-semibold text-gray-700">
            {isEdit ? "แทนที่ไฟล์ (อัปโหลดไฟล์ใหม่เพื่อแทนที่)" : "ไฟล์แนบ (PDF/DOC/DOCX) *"}
          </label>

          {isEdit && data?.file_name ? (
            <div className="mb-1 text-sm">
              <span className="text-gray-500">ไฟล์ปัจจุบัน: </span>
              <a target="_blank" rel="noopener noreferrer" className="text-blue-600 underline" title="กดเพื่อเปิดดูไฟล์">
                {data.file_name}
              </a>
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