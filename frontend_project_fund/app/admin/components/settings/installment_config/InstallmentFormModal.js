"use client";

import React, { useMemo } from "react";
import { CalendarClock } from "lucide-react";
import SettingsModal from "../common/SettingsModal";

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
    <SettingsModal
      open={open}
      onClose={onClose}
      size="lg"
      headerContent={
        <div className="flex items-center gap-3 text-gray-700">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <CalendarClock size={18} />
          </span>
          <div>
            <p className="text-base font-semibold text-gray-900">{title}</p>
            <p className="text-sm text-gray-500">กำหนดวันตัดรอบและสถานะของรอบการพิจารณา</p>
          </div>
        </div>
      }
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
          <span className="text-sm font-semibold text-gray-700">เลขรอบการพิจารณา *</span>
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
          <span className="text-sm font-semibold text-gray-700">วันตัดรอบการพิจารณา (MM/DD/YYYY) *</span>
          <input
            type="date"
            value={formData.cutoff_date}
            onChange={(e) => onChange("cutoff_date", e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            disabled={submitting}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-gray-700">ชื่อ/คำอธิบายรอบการพิจารณา</span>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => onChange("name", e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="เช่น รอบการพิจารณาที่ 1"
            disabled={submitting}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-gray-700">สถานะ</span>
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
          <span className="text-sm font-semibold text-gray-700">หมายเหตุ</span>
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
    </SettingsModal>
  );
};

export default InstallmentFormModal;