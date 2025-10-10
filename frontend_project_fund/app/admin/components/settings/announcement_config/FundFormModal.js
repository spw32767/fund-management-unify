"use client";

import { useEffect, useState } from "react";
import { X, FileText, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const backdrop = { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } };
const card = {
  hidden: { opacity: 0, scale: 0.9, y: 16 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 320, damping: 26 } },
  exit: { opacity: 0, scale: 0.95, y: 10 },
};

export default function FundFormModal({
  open,
  onClose,
  data,            // null=create, object=edit
  onSubmit,        // (payload) => Promise
  onReplaceFile,   // (file) => Promise
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
    return () => { document.body.style.overflow = prev; };
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
      // create: ต้องมีไฟล์
      await onSubmit({ ...payload, file: fileObj });
    } else {
      // update meta
      await onSubmit(payload);
      // ถ้าเลือกไฟล์ใหม่ ให้แทนที่
      if (fileObj) {
        await onReplaceFile?.(fileObj);
      }
    }
    onClose?.();
  }

  return (
    <AnimatePresence>
    {open && (
        <div className="fixed inset-0 z-50">
        {/* Backdrop */}
        <motion.div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}                 // ← คลิกฉากหลังเพื่อปิด
        variants={backdrop}
        initial="hidden"
        animate="visible"
        exit="exit"
        />

        {/* Wrapper ครอบทั้งจอ — IMPORTANT: ใส่ onClick={onClose} ที่นี่ */}
        <div
            className="absolute inset-0 flex items-center justify-center p-4"
            onClick={onClose}
        >
            {/* การ์ดโมดอล — IMPORTANT: กันคลิกทะลุ */}
            <motion.div
            className="w-full max-w-3xl bg-white rounded-xl shadow-lg border border-gray-200"
            variants={card}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            ></motion.div>

        {/* Modal */}
        <div className="absolute inset-0 flex items-center justify-center p-4">
            <motion.div
            className="w-full max-w-3xl bg-white rounded-xl shadow-lg border border-gray-200"
            variants={card}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            >
            {/* Header (ธีมเดียวกับประกาศ/จัดการประกาศ) */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200 rounded-t-xl">
                <div className="flex items-center gap-2 text-gray-700">
                <FileText size={18} />
                <h3 className="font-semibold">{isEdit ? "แก้ไขแบบฟอร์มการขอทุน" : "เพิ่มแบบฟอร์มการขอทุน"}</h3>
                </div>
                <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
                aria-label="Close"
                >
                <X size={18} />
                </button>
            </div>

            {/* Body */}
            <div className="p-4 max-h-[70vh] overflow-y-auto">   {/* ← ทำเลื่อนในโมดอลได้ */}
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ชื่อไฟล์/หัวข้อ */}
                <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1 text-gray-700">ชื่อไฟล์/หัวข้อ *</label>
                <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-blue-500 text-gray-500"
                />
                </div>

                {/* รายละเอียด */}
                <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1 text-gray-700">รายละเอียด</label>
                <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-blue-500 text-gray-500
                            resize-y min-h-[96px] max-h-[60vh]"   // ← เพิ่มแค่บรรทัดนี้
                />
                </div>

                {/* ประเภทฟอร์ม */}
                <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">ประเภทฟอร์ม</label>
                <select
                    value={form.form_type}
                    onChange={(e) => setForm((s) => ({ ...s, form_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-blue-500 text-gray-500"
                >
                    <option value="application">แบบฟอร์มสมัคร</option>
                    <option value="report">แบบฟอร์มรายงาน</option>
                    <option value="evaluation">แบบฟอร์มประเมิน</option>
                    <option value="guidelines">แนวทางปฏิบัติ</option>
                    <option value="other">อื่นๆ</option>
                </select>
                </div>

                {/* หมวดหมู่กองทุน */}
                <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">หมวดหมู่กองทุน</label>
                <select
                    value={form.fund_category}
                    onChange={(e) => setForm((s) => ({ ...s, fund_category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-blue-500 text-gray-500"
                >
                    <option value="research_fund">ทุนวิจัย</option>
                    <option value="promotion_fund">ทุนกิจกรรม</option>
                    <option value="both">ทั้งสองประเภท</option>
                </select>
                </div>

                {/* สถานะ */}
                <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">สถานะ</label>
                <select
                    value={form.status}
                    onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-blue-500 text-gray-500"
                >
                    <option value="active">เผยแพร่</option>
                    <option value="inactive">ปิดเผยแพร่</option>
                </select>
                </div>

                {/* ปี */}
                <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">ปี</label>
                <select
                    value={form.year_id}
                    onChange={(e) => setForm((s) => ({ ...s, year_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-blue-500 text-gray-500"
                    disabled={loadingYears && yearOptions.length === 0}
                >
                    <option value="">ไม่ระบุ</option>
                    {yearOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                </select>
                {loadingYears ? (
                  <p className="text-xs text-gray-500 mt-1">กำลังโหลดปีงบประมาณ...</p>
                ) : null}
                </div>

                {/* ไฟล์แนบ (PDF/DOC/DOCX) – แสดงชื่อไฟล์ปัจจุบันแบบไม่ลิงก์ */}
                <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1 text-gray-700">
                    {isEdit ? "แทนที่ไฟล์ (อัปโหลดไฟล์ใหม่เพื่อแทนที่)" : "ไฟล์แนบ (PDF/DOC/DOCX) *"}
                </label>

                {isEdit && data?.file_name && (
                    <div className="text-sm mb-1">
                    <span className="text-gray-500">ไฟล์ปัจจุบัน: </span>
                    <span className="text-gray-500">{data.file_name}</span>
                    {data?.file_size_readable ? (
                        <span className="text-gray-400"> • {data.file_size_readable}</span>
                    ) : null}
                    </div>
                )}

                <input
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(e) => setFileObj(e.target.files?.[0] || null)}
                    required={!isEdit}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-blue-500 text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border file:border-gray-300 file:bg-white file:text-gray-700 hover:file:bg-gray-50"
                />
                </div>

                {/* Footer */}
                <div className="md:col-span-2 flex items-center justify-end gap-2 pt-2">
                <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-colors"
                >
                    ยกเลิก
                </button>
                <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 whitespace-nowrap"
                >
                    <Save size={16} />
                    <span>บันทึก</span>
                </button>
                </div>
            </form>
            </div>
        </motion.div>
      </div>
    </div>
    </div>
    )}
    </AnimatePresence>
  );
}