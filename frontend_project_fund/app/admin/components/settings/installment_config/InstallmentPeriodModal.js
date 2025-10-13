"use client";

import React, { useEffect, useState } from "react";

const emptyForm = {
  installment_number: "",
  cutoff_date: "",
  name: "",
  status: "active",
  remark: "",
};

export default function InstallmentPeriodModal({
  isOpen,
  onClose,
  onSave,
  editingPeriod,
  selectedYear,
}) {
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (editingPeriod) {
      setForm({
        installment_number: editingPeriod.installment_number?.toString() || "",
        cutoff_date: editingPeriod.cutoff_date || "",
        name: editingPeriod.name || "",
        status: editingPeriod.status || "active",
        remark: editingPeriod.remark || "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [editingPeriod]);

  if (!isOpen) return null;

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!selectedYear?.year_id) {
      alert("กรุณาเลือกปีงบประมาณก่อน");
      return;
    }

    if (!form.installment_number || Number(form.installment_number) <= 0) {
      alert("กรุณาระบุเลขงวดให้ถูกต้อง");
      return;
    }

    if (!form.cutoff_date) {
      alert("กรุณาระบุวันตัดงวด");
      return;
    }

    const payload = {
      year_id: selectedYear.year_id,
      installment_number: Number(form.installment_number),
      cutoff_date: form.cutoff_date,
      name: form.name?.trim() ? form.name : null,
      status: form.status || "active",
      remark: form.remark?.trim() ? form.remark : null,
    };

    onSave(payload, editingPeriod);
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {editingPeriod ? "แก้ไขงวด" : "เพิ่มงวดใหม่"}
            </h3>
            <p className="text-sm text-gray-500">
              จัดการวันตัดงวดของปีงบประมาณ {selectedYear?.year || "-"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100"
            aria-label="ปิด"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                เลขงวด
              </label>
              <input
                type="number"
                min={1}
                value={form.installment_number}
                onChange={(event) => handleChange("installment_number", event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="เช่น 1"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                วันตัดงวด
              </label>
              <input
                type="date"
                value={form.cutoff_date}
                onChange={(event) => handleChange("cutoff_date", event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                ชื่อ/ป้ายกำกับงวด
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(event) => handleChange("name", event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="เช่น งวดที่ 1"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                สถานะ
              </label>
              <select
                value={form.status}
                onChange={(event) => handleChange("status", event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="active">ใช้งาน</option>
                <option value="inactive">ปิดใช้งาน</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              หมายเหตุ
            </label>
            <textarea
              value={form.remark}
              onChange={(event) => handleChange("remark", event.target.value)}
              className="h-24 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="ระบุข้อมูลเพิ่มเติม (ถ้ามี)"
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-gray-600 transition-colors hover:bg-gray-100"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-5 py-2 text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              บันทึกข้อมูล
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
