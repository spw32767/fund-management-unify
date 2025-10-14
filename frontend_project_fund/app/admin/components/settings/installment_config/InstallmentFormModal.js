"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

const AnimatedModal = ({ open, onClose, title, children, footer }) => {
  const [shouldRender, setShouldRender] = useState(open);
  const [isVisible, setIsVisible] = useState(open);

  useEffect(() => {
    let timeoutId;

    if (open) {
      setShouldRender(true);
      if (typeof window !== "undefined") {
        requestAnimationFrame(() => setIsVisible(true));
      } else {
        setIsVisible(true);
      }
    } else {
      setIsVisible(false);
      timeoutId = setTimeout(() => setShouldRender(false), 200);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [open]);

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center px-4 transition-opacity duration-200 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all duration-200 ${
          isVisible ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 translate-y-4"
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto px-6 py-5">{children}</div>
        {footer ? (
          <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
};

const InstallmentFormModal = ({
  open,
  onClose,
  title,
  formData,
  onChange,
  installmentOptions,
  submitting,
  onSubmit,
}) => {
  const availableOptions = useMemo(() => {
    if (!Array.isArray(installmentOptions)) return [];
    return installmentOptions.map((option) => ({
      value: option,
      label: option,
    }));
  }, [installmentOptions]);

  return (
    <AnimatedModal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button
            type="button"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100"
            onClick={onClose}
            disabled={submitting}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700 disabled:opacity-70"
            onClick={onSubmit}
            disabled={submitting}
          >
            {submitting ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">เลขงวด *</span>
          <select
            value={formData.installment_number}
            onChange={(e) => onChange("installment_number", e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            disabled={submitting}
          >
            {availableOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">วันตัดงวด (MM/DD/YYYY) *</span>
          <input
            type="date"
            value={formData.cutoff_date}
            onChange={(e) => onChange("cutoff_date", e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            disabled={submitting}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">ชื่อ/คำอธิบายงวด</span>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => onChange("name", e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="เช่น งวดที่ 1"
            disabled={submitting}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">สถานะ</span>
          <select
            value={formData.status}
            onChange={(e) => onChange("status", e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            disabled={submitting}
          >
            <option value="active">เปิดใช้งาน</option>
            <option value="inactive">ปิดใช้งาน</option>
          </select>
        </label>

        <label className="md:col-span-2 flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">หมายเหตุ</span>
          <textarea
            rows={3}
            value={formData.remark}
            onChange={(e) => onChange("remark", e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="ระบุรายละเอียดเพิ่มเติม (ถ้ามี)"
            disabled={submitting}
          />
        </label>
      </div>
    </AnimatedModal>
  );
};

export default InstallmentFormModal;