"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Edit2,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
} from "lucide-react";
import Swal from "sweetalert2";

import SettingsSectionCard from "@/app/admin/components/settings/common/SettingsSectionCard";
import StatusBadge from "@/app/admin/components/settings/StatusBadge";
import InstallmentPeriodModal from "./InstallmentPeriodModal";
import { adminAPI } from "@/app/lib/admin_api";

const statusOptions = [
  { value: "active", label: "ใช้งาน" },
  { value: "inactive", label: "ปิดใช้งาน" },
  { value: "all", label: "ทั้งหมด" },
];

function formatDisplayDate(dateString) {
  if (!dateString) return "-";
  const [year, month, day] = dateString.split("-").map(Number);
  if (!year || !month || !day) {
    return dateString;
  }

  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function InstallmentPeriodsManager({
  years = [],
  selectedYear,
  onYearChange,
  onRefreshYears,
}) {
  const [installments, setInstallments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("active");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [paging, setPaging] = useState({ total: 0, limit: 50, offset: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState(null);

  const selectedYearId = selectedYear?.year_id || null;

  const loadInstallments = useCallback(async () => {
    if (!selectedYearId) {
      setInstallments([]);
      setPaging({ total: 0, limit: 50, offset: 0 });
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await adminAPI.getInstallmentPeriods({
        yearId: selectedYearId,
        status: statusFilter,
        limit: 200,
        offset: 0,
        includeDeleted,
      });

      const list = Array.isArray(response?.data) ? response.data : [];
      setInstallments(list);
      setPaging(response?.paging || {
        total: list.length,
        limit: list.length,
        offset: 0,
      });
    } catch (err) {
      console.error("Failed to load installment periods:", err);
      const message = err?.message || "ไม่สามารถโหลดข้อมูลงวดได้";
      setError(message);
      Swal.fire("เกิดข้อผิดพลาด", message, "error");
    } finally {
      setLoading(false);
    }
  }, [includeDeleted, selectedYearId, statusFilter]);

  useEffect(() => {
    loadInstallments();
  }, [loadInstallments]);

  const handleOpenModal = (period = null) => {
    setEditingPeriod(period);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingPeriod(null);
    setIsModalOpen(false);
  };

  const handleSavePeriod = async (payload, period) => {
    try {
      if (period) {
        await adminAPI.updateInstallmentPeriod(period.installment_period_id, payload);
        Swal.fire("สำเร็จ", "อัปเดตข้อมูลงวดเรียบร้อย", "success");
      } else {
        await adminAPI.createInstallmentPeriod(payload);
        Swal.fire("สำเร็จ", "เพิ่มงวดใหม่เรียบร้อย", "success");
      }
      handleCloseModal();
      await loadInstallments();
      if (typeof onRefreshYears === "function") {
        onRefreshYears();
      }
    } catch (err) {
      console.error("Failed to save installment period:", err);
      const message = err?.message || "ไม่สามารถบันทึกข้อมูลได้";
      Swal.fire("เกิดข้อผิดพลาด", message, "error");
    }
  };

  const handleDelete = async (period) => {
    if (!period) return;

    const confirm = await Swal.fire({
      title: "ยืนยันการลบงวด?",
      text: `ต้องการลบงวดที่ ${period.installment_number} หรือไม่? สามารถกู้คืนได้ภายหลัง`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
      reverseButtons: true,
    });

    if (!confirm.isConfirmed) return;

    try {
      await adminAPI.deleteInstallmentPeriod(period.installment_period_id);
      Swal.fire("สำเร็จ", "ลบงวดเรียบร้อย", "success");
      await loadInstallments();
    } catch (err) {
      console.error("Failed to delete installment period:", err);
      const message = err?.message || "ไม่สามารถลบงวดได้";
      Swal.fire("เกิดข้อผิดพลาด", message, "error");
    }
  };

  const handleRestore = async (period) => {
    if (!period) return;

    const confirm = await Swal.fire({
      title: "กู้คืนงวดนี้?",
      text: `ต้องการกู้คืนงวดที่ ${period.installment_number} หรือไม่?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "กู้คืน",
      cancelButtonText: "ยกเลิก",
    });

    if (!confirm.isConfirmed) return;

    try {
      await adminAPI.restoreInstallmentPeriod(period.installment_period_id);
      Swal.fire("สำเร็จ", "กู้คืนงวดเรียบร้อย", "success");
      await loadInstallments();
    } catch (err) {
      console.error("Failed to restore installment period:", err);
      const message = err?.message || "ไม่สามารถกู้คืนงวดได้";
      Swal.fire("เกิดข้อผิดพลาด", message, "error");
    }
  };

  const sortedInstallments = useMemo(() => {
    const list = Array.isArray(installments) ? [...installments] : [];
    return list.sort((a, b) => (a.installment_number || 0) - (b.installment_number || 0));
  }, [installments]);

  const totalActive = useMemo(() => {
    return sortedInstallments.filter(
      (item) => (item.deleted_at == null || item.deleted_at === "") && (item.status || "active") === "active",
    ).length;
  }, [sortedInstallments]);

  const yearOptions = useMemo(() => {
    return Array.isArray(years)
      ? years.map((year) => ({
          value: year.year_id,
          label: year.year ? `พ.ศ. ${year.year}` : `ID ${year.year_id}`,
        }))
      : [];
  }, [years]);

  return (
    <>
      <SettingsSectionCard
        icon={CalendarClock}
        iconBgClass="bg-blue-100"
        iconColorClass="text-blue-600"
        title="ตั้งค่าวันตัดงวดของทุน"
        description="กำหนดวันตัดงวดตามปีงบประมาณเพื่อใช้คำนวณเลขงวดในการยื่นขอทุน"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={loadInstallments}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              รีเฟรช
            </button>
            <button
              type="button"
              onClick={() => handleOpenModal(null)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
              disabled={!selectedYearId}
            >
              <Plus size={16} />
              เพิ่มงวดใหม่
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">เลือกปีงบประมาณ</label>
                <select
                  value={selectedYearId || ""}
                  onChange={(event) => onYearChange?.(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">-- เลือกปี --</option>
                  {yearOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">ตัวกรองสถานะ</label>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <input
                  id="installment-include-deleted"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={includeDeleted}
                  onChange={(event) => setIncludeDeleted(event.target.checked)}
                />
                <label htmlFor="installment-include-deleted" className="text-sm text-gray-700">
                  แสดงรายการที่ถูกลบ
                </label>
              </div>
            </div>

            {selectedYearId ? (
              <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                <div>
                  <p className="font-medium">สรุปงวดของปีนี้</p>
                  <p className="text-xs text-blue-600">
                    ทั้งหมด {paging.total} รายการ • เปิดใช้งาน {totalActive} รายการ
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          {!selectedYearId ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-gray-600">
              กรุณาเลือกปีงบประมาณเพื่อจัดการงวดของทุน
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">งวดที่</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">วันตัดงวด</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">ชื่อ/คำอธิบาย</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">สถานะ</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">หมายเหตุ</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                        กำลังโหลดข้อมูล...
                      </td>
                    </tr>
                  ) : sortedInstallments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                        ไม่พบข้อมูลงวดสำหรับปีนี้
                      </td>
                    </tr>
                  ) : (
                    sortedInstallments.map((period) => {
                      const isDeleted = period.deleted_at && period.deleted_at !== "";
                      return (
                        <tr key={period.installment_period_id} className={isDeleted ? "bg-gray-50" : undefined}>
                          <td className="px-4 py-3 font-medium text-gray-900">
                            งวดที่ {period.installment_number}
                          </td>
                          <td className="px-4 py-3 text-gray-800">
                            <div>{formatDisplayDate(period.cutoff_date)}</div>
                            <div className="text-xs text-gray-500">{period.cutoff_date}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-800">
                            <div className="font-medium text-gray-900">{period.name || "-"}</div>
                            <div className="text-xs text-gray-500">
                              อัปเดตล่าสุด {formatDisplayDate(period.updated_at?.slice(0, 10))}
                            </div>
                            {isDeleted ? (
                              <div className="mt-1 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                                ถูกลบเมื่อ {formatDisplayDate(period.deleted_at?.slice(0, 10))}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={isDeleted ? "inactive" : period.status} />
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {period.remark ? period.remark : <span className="text-gray-400">-</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100"
                                onClick={() => handleOpenModal(period)}
                                disabled={isDeleted}
                              >
                                <Edit2 size={14} /> แก้ไข
                              </button>
                              {isDeleted ? (
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 rounded-lg border border-blue-500 px-3 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50"
                                  onClick={() => handleRestore(period)}
                                >
                                  <RotateCcw size={14} /> กู้คืน
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 rounded-lg border border-red-500 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                                  onClick={() => handleDelete(period)}
                                >
                                  <Trash2 size={14} /> ลบ
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
        </div>
      </SettingsSectionCard>

      <InstallmentPeriodModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSavePeriod}
        editingPeriod={editingPeriod}
        selectedYear={selectedYear}
      />
    </>
  );
}
