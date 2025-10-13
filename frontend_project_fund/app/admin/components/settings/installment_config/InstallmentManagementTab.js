"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarRange, Edit, Plus, RefreshCcw, RotateCcw, Trash2 } from "lucide-react";
import Swal from "sweetalert2";

import SettingsSectionCard from "@/app/admin/components/settings/common/SettingsSectionCard";
import StatusBadge from "@/app/admin/components/settings/StatusBadge";
import { adminInstallmentAPI } from "@/app/lib/admin_installment_api";

const DEFAULT_LIMIT = 20;

const toThaiDate = (value) => {
  if (!value) return "-";

  let date;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      date = new Date(`${value}T00:00:00`);
    } else {
      date = new Date(value);
    }
  }

  if (!date || Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const normalizeYearId = (year) => {
  if (!year) return null;
  const candidates = [year.year_id, year.yearId, year.id];
  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null || candidate === "") continue;
    const numeric = Number(candidate);
    if (!Number.isNaN(numeric)) {
      return numeric;
    }
  }
  return null;
};

const getYearLabel = (year) => {
  if (!year) return "";
  const value = year.year ?? year.name ?? year.label ?? "";
  return value ? `พ.ศ. ${value}` : "ไม่ระบุปี";
};

const initialFormState = {
  installment_number: "",
  cutoff_date: "",
  name: "",
  status: "active",
  remark: "",
};

const InstallmentManagementTab = ({ years = [] }) => {
  const [selectedYearId, setSelectedYearId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("active");
  const [showDeleted, setShowDeleted] = useState(false);

  const [periods, setPeriods] = useState([]);
  const [paging, setPaging] = useState({ total: 0, limit: DEFAULT_LIMIT, offset: 0 });
  const [page, setPage] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormState);
  const [editingPeriod, setEditingPeriod] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const yearOptions = useMemo(() => {
    if (!Array.isArray(years)) return [];
    return years.map((year) => ({
      id: normalizeYearId(year),
      label: getYearLabel(year),
      raw: year,
      status: (year.status ?? "").toLowerCase(),
    }));
  }, [years]);

  useEffect(() => {
    if (selectedYearId) return;
    if (!yearOptions.length) return;

    const activeYear = yearOptions.find((year) => year.status === "active");
    if (activeYear) {
      setSelectedYearId(activeYear.id);
      return;
    }

    if (yearOptions[0]?.id != null) {
      setSelectedYearId(yearOptions[0].id);
    }
  }, [yearOptions, selectedYearId]);

  useEffect(() => {
    setPage(0);
  }, [selectedYearId, statusFilter, showDeleted]);

  const loadPeriods = useCallback(async () => {
    if (!selectedYearId) {
      setPeriods([]);
      setPaging((prev) => ({ ...prev, total: 0, offset: 0 }));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const limit = paging.limit || DEFAULT_LIMIT;
      const offset = (page || 0) * limit;
      const { items, paging: nextPaging } = await adminInstallmentAPI.list({
        yearId: selectedYearId,
        status: statusFilter,
        limit,
        offset,
        includeDeleted: showDeleted,
      });

      setPeriods(items);
      setPaging({
        total: nextPaging.total ?? items.length,
        limit: nextPaging.limit ?? limit,
        offset: nextPaging.offset ?? offset,
      });
    } catch (err) {
      console.error("Failed to load installment periods", err);
      setError(err);
      Swal.fire("เกิดข้อผิดพลาด", err?.message || "ไม่สามารถโหลดข้อมูลงวดได้", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedYearId, statusFilter, showDeleted, page, paging.limit]);

  useEffect(() => {
    loadPeriods();
  }, [loadPeriods]);

  const handleYearChange = (event) => {
    const value = Number(event.target.value || 0) || null;
    setSelectedYearId(value);
  };

  const handleStatusChange = (event) => {
    setStatusFilter(event.target.value);
  };

  const handleToggleDeleted = (event) => {
    setShowDeleted(event.target.checked);
  };

  const resetForm = useCallback(() => {
    setFormData(initialFormState);
    setEditingPeriod(null);
    setFormOpen(false);
    setSubmitting(false);
  }, []);

  const openCreateForm = () => {
    setEditingPeriod(null);
    setFormData({ ...initialFormState, status: "active" });
    setFormOpen(true);
  };

  const openEditForm = (period) => {
    if (!period) return;
    setEditingPeriod(period);
    setFormData({
      installment_number: period.installment_number ?? "",
      cutoff_date: period.cutoff_date ?? "",
      name: period.name ?? "",
      status: period.status ?? "active",
      remark: period.remark ?? "",
    });
    setFormOpen(true);
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!selectedYearId) {
      Swal.fire("ข้อมูลไม่ครบ", "กรุณาเลือกปีงบประมาณ", "warning");
      return false;
    }

    const installmentNumber = Number(formData.installment_number);
    if (!installmentNumber || installmentNumber <= 0) {
      Swal.fire("ข้อมูลไม่ครบ", "กรุณาระบุเลขงวดให้ถูกต้อง (มากกว่า 0)", "warning");
      return false;
    }

    const cutoff = String(formData.cutoff_date || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cutoff)) {
      Swal.fire("ข้อมูลไม่ครบ", "กรุณาระบุวันตัดงวดในรูปแบบ YYYY-MM-DD", "warning");
      return false;
    }

    const status = String(formData.status || "").trim().toLowerCase();
    if (status && !["active", "inactive"].includes(status)) {
      Swal.fire("ข้อมูลไม่ถูกต้อง", "สถานะต้องเป็น active หรือ inactive", "warning");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const payload = {
      year_id: selectedYearId,
      installment_number: Number(formData.installment_number),
      cutoff_date: String(formData.cutoff_date || "").trim(),
    };

    if (formData.name != null) {
      const name = String(formData.name || "").trim();
      if (name) payload.name = name;
      else payload.name = "";
    }

    if (formData.status != null) {
      const status = String(formData.status || "").trim().toLowerCase();
      if (status) payload.status = status;
    }

    if (formData.remark != null) {
      const remark = String(formData.remark || "").trim();
      if (remark) payload.remark = remark;
      else payload.remark = "";
    }

    try {
      setSubmitting(true);
      if (editingPeriod?.installment_period_id) {
        await adminInstallmentAPI.update(editingPeriod.installment_period_id, payload);
        Swal.fire("สำเร็จ", "แก้ไขวันตัดงวดเรียบร้อย", "success");
      } else {
        await adminInstallmentAPI.create(payload);
        Swal.fire("สำเร็จ", "เพิ่มวันตัดงวดเรียบร้อย", "success");
      }
      resetForm();
      loadPeriods();
    } catch (err) {
      console.error("Failed to save installment period", err);
      Swal.fire("เกิดข้อผิดพลาด", err?.message || "ไม่สามารถบันทึกวันตัดงวดได้", "error");
      setSubmitting(false);
    }
  };

  const handleDelete = async (period) => {
    if (!period?.installment_period_id) return;

    const confirmed = await Swal.fire({
      title: "ยืนยันการลบ?",
      text: `ต้องการลบงวดที่ ${period.installment_number || ""} หรือไม่?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#d33",
    });

    if (!confirmed.isConfirmed) return;

    try {
      await adminInstallmentAPI.remove(period.installment_period_id);
      Swal.fire("สำเร็จ", "ลบวันตัดงวดเรียบร้อย", "success");
      loadPeriods();
    } catch (err) {
      console.error("Failed to delete installment period", err);
      Swal.fire("เกิดข้อผิดพลาด", err?.message || "ไม่สามารถลบวันตัดงวดได้", "error");
    }
  };

  const handleRestore = async (period) => {
    if (!period?.installment_period_id) return;

    try {
      await adminInstallmentAPI.restore(period.installment_period_id);
      Swal.fire("สำเร็จ", "กู้คืนวันตัดงวดเรียบร้อย", "success");
      loadPeriods();
    } catch (err) {
      console.error("Failed to restore installment period", err);
      Swal.fire("เกิดข้อผิดพลาด", err?.message || "ไม่สามารถกู้คืนวันตัดงวดได้", "error");
    }
  };

  const totalPages = useMemo(() => {
    if (!paging.limit) return 0;
    return Math.ceil((paging.total || 0) / paging.limit);
  }, [paging.total, paging.limit]);

  const isDeleted = (period) => Boolean(period?.deleted_at);

  return (
    <SettingsSectionCard
      icon={CalendarRange}
      iconBgClass="bg-indigo-100"
      iconColorClass="text-indigo-600"
      title="ตั้งค่าวันตัดงวดของทุน"
      description="กำหนดเลขงวดและวันตัดต่อปี เพื่อใช้คำนวณงวดอัตโนมัติในการยื่นขอทุน"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadPeriods}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
          >
            <RefreshCcw size={16} />
            โหลดข้อมูลใหม่
          </button>
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={16} />
            เพิ่มวันตัดงวด
          </button>
        </div>
      }
      contentClassName="space-y-6"
    >
      <div className="grid gap-4 md:grid-cols-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">ปีงบประมาณ</span>
          <select
            value={selectedYearId ?? ""}
            onChange={handleYearChange}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">-- เลือกปีงบประมาณ --</option>
            {yearOptions.map((option) => (
              <option key={option.id ?? option.label} value={option.id ?? ""}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">สถานะ</span>
          <select
            value={statusFilter}
            onChange={handleStatusChange}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="active">ใช้งานอยู่</option>
            <option value="inactive">ปิดใช้งาน</option>
            <option value="all">ทั้งหมด</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300"
            checked={showDeleted}
            onChange={handleToggleDeleted}
          />
          แสดงที่ถูกลบ (soft delete)
        </label>
      </div>

      {formOpen ? (
        <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-semibold text-blue-900">
              {editingPeriod ? `แก้ไขงวดที่ ${editingPeriod.installment_number}` : "เพิ่มวันตัดงวดใหม่"}
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="text-sm text-blue-700 hover:underline"
              disabled={submitting}
            >
              ยกเลิก
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">เลขงวด *</span>
              <input
                type="number"
                min="1"
                value={formData.installment_number}
                onChange={(e) => handleFormChange("installment_number", e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                disabled={submitting}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">วันตัดงวด (YYYY-MM-DD) *</span>
              <input
                type="date"
                value={formData.cutoff_date}
                onChange={(e) => handleFormChange("cutoff_date", e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                disabled={submitting}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">ชื่อ/คำอธิบายงวด</span>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleFormChange("name", e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="เช่น งวดที่ 1"
                disabled={submitting}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">สถานะ</span>
              <select
                value={formData.status}
                onChange={(e) => handleFormChange("status", e.target.value)}
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
                onChange={(e) => handleFormChange("remark", e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="ระบุรายละเอียดเพิ่มเติม (ถ้ามี)"
                disabled={submitting}
              />
            </label>
          </div>

          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
              onClick={resetForm}
              disabled={submitting}
            >
              ยกเลิก
            </button>
            <button
              type="button"
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-70"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">เลขงวด</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">วันตัดงวด</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">ชื่อ/คำอธิบาย</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">สถานะ</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">หมายเหตุ</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">การจัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                  กำลังโหลดข้อมูล...
                </td>
              </tr>
            ) : periods.length ? (
              periods.map((period) => (
                <tr key={period.installment_period_id || period.installment_number} className={isDeleted(period) ? "bg-red-50" : ""}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">งวดที่ {period.installment_number ?? "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{toThaiDate(period.cutoff_date)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{period.name || "-"}</td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge
                      status={period.status}
                      activeLabel="ใช้งาน"
                      inactiveLabel="ปิด"
                      className="text-xs"
                    />
                    {isDeleted(period) ? (
                      <div className="mt-1 text-xs text-red-600">ลบแล้ว</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 whitespace-pre-line">{period.remark || "-"}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-2">
                      {!isDeleted(period) ? (
                        <>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-100"
                            onClick={() => openEditForm(period)}
                          >
                            <Edit size={14} /> แก้ไข
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-md border border-red-300 px-3 py-1 text-xs text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(period)}
                          >
                            <Trash2 size={14} /> ลบ
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-md border border-green-300 px-3 py-1 text-xs text-green-600 hover:bg-green-50"
                          onClick={() => handleRestore(period)}
                        >
                          <RotateCcw size={14} /> กู้คืน
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                  {error ? "เกิดข้อผิดพลาดในการโหลดข้อมูล" : "ยังไม่มีการตั้งค่างวดสำหรับปีนี้"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            แสดง {paging.offset + 1}-{Math.min(paging.offset + paging.limit, paging.total)} จาก {paging.total} รายการ
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-60"
              onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
              disabled={page <= 0}
            >
              ก่อนหน้า
            </button>
            <span>
              หน้า {page + 1} / {totalPages}
            </span>
            <button
              type="button"
              className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-60"
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages - 1))}
              disabled={page >= totalPages - 1}
            >
              ถัดไป
            </button>
          </div>
        </div>
      ) : null}
    </SettingsSectionCard>
  );
};

export default InstallmentManagementTab;
