"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarRange, Edit, Plus, RefreshCcw, Trash2, X } from "lucide-react";
import Swal from "sweetalert2";

import SettingsSectionCard from "@/app/admin/components/settings/common/SettingsSectionCard";
import StatusBadge from "@/app/admin/components/settings/StatusBadge";
import { adminInstallmentAPI } from "@/app/lib/admin_installment_api";
import { systemConfigAPI } from "@/app/lib/system_config_api";

const DEFAULT_LIMIT = 20;
const INSTALLMENT_OPTIONS = [1, 2, 3, 4, 5];

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
  installment_number: "1",
  cutoff_date: "",
  name: "",
  status: "active",
  remark: "",
};

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

const InstallmentManagementTab = ({ years = [] }) => {
  const [selectedYearId, setSelectedYearId] = useState(null);
  const [currentYearValue, setCurrentYearValue] = useState(null);
  const [defaultYearApplied, setDefaultYearApplied] = useState(false);

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
    let ignore = false;

    const fetchCurrentYear = async () => {
      try {
        const response = await systemConfigAPI.getCurrentYear();
        if (ignore) return;
        const value =
          response?.current_year ?? response?.data?.current_year ?? null;
        if (value !== undefined) {
          setCurrentYearValue(value ?? null);
        }
      } catch (err) {
        if (!ignore) {
          console.warn("ไม่สามารถอ่านปีปัจจุบันจาก system config:", err);
        }
      }
    };

    fetchCurrentYear();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!yearOptions.length) return;

    if (selectedYearId != null) {
      if (!defaultYearApplied) {
        setDefaultYearApplied(true);
      }
      return;
    }

    if (defaultYearApplied) return;

    const findByValue = (value) => {
      if (value === null || value === undefined || value === "") return null;

      const normalizedCandidates = new Set([String(value)]);
      const numeric = Number(value);
      if (!Number.isNaN(numeric)) {
        normalizedCandidates.add(String(numeric));
        normalizedCandidates.add(String(numeric - 543));
        normalizedCandidates.add(String(numeric + 543));
      }

      return (
        yearOptions.find((option) => {
          const comparisons = [
            option.id,
            option.raw?.year,
            option.raw?.year_en,
            option.raw?.year_th,
            option.raw?.fiscal_year,
          ]
            .filter((item) => item !== undefined && item !== null && item !== "")
            .map((item) => String(item));

          return comparisons.some((candidate) =>
            normalizedCandidates.has(candidate)
          );
        }) ?? null
      );
    };

    let candidate = null;

    if (currentYearValue !== null && currentYearValue !== undefined) {
      candidate = findByValue(currentYearValue);
    }

    if (!candidate) {
      candidate = yearOptions.find((year) => year.status === "active") ?? null;
    }

    if (!candidate) {
      candidate = yearOptions[0] ?? null;
    }

    if (candidate?.id != null) {
      setSelectedYearId(candidate.id);
      setDefaultYearApplied(true);
    }
  }, [yearOptions, currentYearValue, selectedYearId, defaultYearApplied]);

  useEffect(() => {
    setPage(0);
  }, [selectedYearId]);

  const loadPeriods = useCallback(async () => {
    if (!selectedYearId) {
      setPeriods([]);
      setPaging({ total: 0, limit: DEFAULT_LIMIT, offset: 0 });
      return;
    }

    setLoading(true);
    setError(null);

    const limit = DEFAULT_LIMIT;
    const offset = (page || 0) * limit;

    try {
      const { items, paging: nextPaging } = await adminInstallmentAPI.list({
        yearId: selectedYearId,
        limit,
        offset,
      });

      setPeriods(items);
      setPaging({
        total: nextPaging?.total ?? items.length,
        limit: nextPaging?.limit ?? limit,
        offset: nextPaging?.offset ?? offset,
      });
    } catch (err) {
      console.error("Failed to load installment periods", err);
      setError(err);
      Swal.fire("เกิดข้อผิดพลาด", err?.message || "ไม่สามารถโหลดข้อมูลงวดได้", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedYearId, page]);

  useEffect(() => {
    loadPeriods();
  }, [loadPeriods]);

  const handleYearChange = (event) => {
    const rawValue = event.target.value;
    const numericValue = Number(rawValue);
    const nextValue =
      rawValue === "" || Number.isNaN(numericValue) || numericValue <= 0
        ? null
        : numericValue;

    setSelectedYearId(nextValue);
    setDefaultYearApplied(true);
  };

  useEffect(() => {
    if (!formOpen) {
      setFormData(initialFormState);
      setEditingPeriod(null);
      setSubmitting(false);
    }
  }, [formOpen]);

  const handleCloseForm = useCallback(() => {
    setFormOpen(false);
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
      installment_number:
        period.installment_number !== undefined && period.installment_number !== null
          ? String(period.installment_number)
          : "",
      cutoff_date: period.cutoff_date ?? "",
      name: period.name ?? "",
      status: period.status ?? "active",
      remark: period.remark ?? "",
    });
    setFormOpen(true);
  };

  const installmentOptions = useMemo(() => {
    const base = [...INSTALLMENT_OPTIONS];
    const candidates = [
      editingPeriod?.installment_number,
      Number(formData.installment_number),
    ];

    candidates.forEach((value) => {
      const numeric = Number(value);
      if (!Number.isNaN(numeric) && numeric > 0 && !base.includes(numeric)) {
        base.push(numeric);
      }
    });

    return Array.from(new Set(base)).sort((a, b) => a - b);
  }, [editingPeriod?.installment_number, formData.installment_number]);

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!selectedYearId) {
      Swal.fire("ข้อมูลไม่ครบ", "กรุณาเลือกปีงบประมาณ", "warning");
      return false;
    }

    const installmentNumber = Number(formData.installment_number);
    if (
      !installmentNumber ||
      Number.isNaN(installmentNumber) ||
      !installmentOptions.includes(installmentNumber)
    ) {
      Swal.fire("ข้อมูลไม่ครบ", "กรุณาเลือกเลขงวดระหว่าง 1-5", "warning");
      return false;
    }

    const cutoff = String(formData.cutoff_date || "").trim();
    if (!cutoff || !/^\d{4}-\d{2}-\d{2}$/.test(cutoff)) {
      Swal.fire("ข้อมูลไม่ครบ", "กรุณาเลือกวันตัดงวดจากปฏิทิน", "warning");
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
      loadPeriods();
      handleCloseForm();
    } catch (err) {
      console.error("Failed to save installment period", err);
      Swal.fire("เกิดข้อผิดพลาด", err?.message || "ไม่สามารถบันทึกวันตัดงวดได้", "error");
    } finally {
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

  const handleToggleStatus = async (period, nextActive) => {
    if (!period?.installment_period_id) return;

    const status = nextActive ? "active" : "inactive";

    try {
      await adminInstallmentAPI.patch(period.installment_period_id, { status });
      setPeriods((prev) =>
        prev.map((item) =>
          item.installment_period_id === period.installment_period_id
            ? { ...item, status }
            : item
        )
      );
      Swal.fire(
        "สำเร็จ",
        nextActive ? "เปิดใช้งานงวดเรียบร้อย" : "ปิดใช้งานงวดเรียบร้อย",
        "success"
      );
    } catch (err) {
      console.error("Failed to toggle installment status", err);
      throw err;
    }
  };

  const totalPages = useMemo(() => {
    if (!paging.limit) return 0;
    return Math.ceil((paging.total || 0) / paging.limit);
  }, [paging.total, paging.limit]);

  return (
    <>
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
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100"
            >
              <RefreshCcw size={16} />
              โหลดข้อมูลใหม่
            </button>
            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white transition-colors hover:bg-blue-700"
            >
              <Plus size={16} />
              เพิ่มวันตัดงวด
            </button>
          </div>
        }
        contentClassName="space-y-6"
      >
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
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
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-200">
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
                  <tr key={period.installment_period_id || period.installment_number}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">งวดที่ {period.installment_number ?? "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{toThaiDate(period.cutoff_date)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{period.name || "-"}</td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge
                        status={period.status}
                        interactive
                        onChange={(next) => handleToggleStatus(period, next)}
                        activeLabel="เปิดใช้งาน"
                        inactiveLabel="ปิดใช้งาน"
                        className="text-xs"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-pre-line">{period.remark || "-"}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1 text-xs text-gray-700 transition-colors hover:bg-gray-100"
                          onClick={() => openEditForm(period)}
                        >
                          <Edit size={14} /> แก้ไข
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-md border border-red-300 px-3 py-1 text-xs text-red-600 transition-colors hover:bg-red-50"
                          onClick={() => handleDelete(period)}
                        >
                          <Trash2 size={14} /> ลบ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                    {error
                      ? "เกิดข้อผิดพลาดในการโหลดข้อมูล"
                      : selectedYearId
                      ? "ยังไม่มีการตั้งค่างวดสำหรับปีนี้"
                      : "กรุณาเลือกปีงบประมาณเพื่อดูรายการ"}
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
                className="rounded-md border border-gray-300 px-3 py-1 transition-colors hover:bg-gray-100 disabled:opacity-60"
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
                className="rounded-md border border-gray-300 px-3 py-1 transition-colors hover:bg-gray-100 disabled:opacity-60"
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages - 1))}
                disabled={page >= totalPages - 1}
              >
                ถัดไป
              </button>
            </div>
          </div>
        ) : null}
      </SettingsSectionCard>

      <AnimatedModal
        open={formOpen}
        onClose={handleCloseForm}
        title={
          editingPeriod
            ? `แก้ไขงวดที่ ${editingPeriod.installment_number ?? ""}`
            : "เพิ่มวันตัดงวดใหม่"
        }
        footer={
          <>
            <button
              type="button"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100"
              onClick={handleCloseForm}
              disabled={submitting}
            >
              ยกเลิก
            </button>
            <button
              type="button"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700 disabled:opacity-70"
              onClick={handleSubmit}
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
              onChange={(e) => handleFormChange("installment_number", e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              disabled={submitting}
            >
              {installmentOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">วันตัดงวด (MM/DD/YYYY) *</span>
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
      </AnimatedModal>
    </>
  );
};

export default InstallmentManagementTab;
