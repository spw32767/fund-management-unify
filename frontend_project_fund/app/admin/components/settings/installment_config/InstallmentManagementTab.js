"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarRange, Copy, Edit, Plus, RefreshCcw, Trash2 } from "lucide-react";
import Swal from "sweetalert2";

import SettingsSectionCard from "@/app/admin/components/settings/common/SettingsSectionCard";
import SettingsModal from "@/app/admin/components/settings/common/SettingsModal";
import StatusBadge from "@/app/admin/components/settings/StatusBadge";
import { adminInstallmentAPI } from "@/app/lib/admin_installment_api";
import { systemConfigAPI } from "@/app/lib/system_config_api";
import InstallmentFormModal from "@/app/admin/components/settings/installment_config/InstallmentFormModal";

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

const extractYearNumeric = (year) => {
  if (!year || typeof year !== "object") return null;

  const candidates = [
    year.year,
    year.year_th,
    year.year_en,
    year.year_fiscal,
    year.fiscal_year,
    year.name,
    year.label,
  ];

  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null || candidate === "") continue;
    const numeric = Number(candidate);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }

  return null;
};

const getYearDisplayValue = (year) => {
  if (!year || typeof year !== "object") return "";
  return (
    year.year ??
    year.year_th ??
    year.year_en ??
    year.name ??
    year.label ??
    year.fiscal_year ??
    ""
  );
};

const initialFormState = {
  installment_number: "1",
  cutoff_date: "",
  name: "",
  status: "active",
  remark: "",
};

const InstallmentManagementTab = ({ years = [] }) => {
  const [selectedYearId, setSelectedYearId] = useState(null);
  const [currentYearValue, setCurrentYearValue] = useState(null);
  const [currentYearLoaded, setCurrentYearLoaded] = useState(false);
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
  const [copying, setCopying] = useState(false);
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [copyMode, setCopyMode] = useState("new");
  const [copyNewYear, setCopyNewYear] = useState("");
  const [copyExistingYearId, setCopyExistingYearId] = useState("");
  const [copyError, setCopyError] = useState("");

  const yearOptions = useMemo(() => {
    if (!Array.isArray(years)) return [];
    return years.map((year) => ({
      id: normalizeYearId(year),
      label: getYearLabel(year),
      raw: year,
      status: (year.status ?? "").toLowerCase(),
    }));
  }, [years]);

  const selectedYearOption = useMemo(() => {
    if (!selectedYearId) return null;
    return yearOptions.find((option) => option.id === selectedYearId) ?? null;
  }, [yearOptions, selectedYearId]);

  const selectedYearValue = useMemo(() => {
    if (!selectedYearOption) return null;
    return extractYearNumeric(selectedYearOption.raw);
  }, [selectedYearOption]);

  const isCurrentYearSelected =
    currentYearLoaded &&
    currentYearValue !== null &&
    selectedYearValue !== null &&
    String(selectedYearValue) === String(currentYearValue);

  const existingYearValues = useMemo(() => {
    return yearOptions
      .map((option) => extractYearNumeric(option.raw))
      .filter((value) => value !== null);
  }, [yearOptions]);

  const availableExistingYears = useMemo(() => {
    return yearOptions.filter((option) => option.id && option.id !== selectedYearId);
  }, [yearOptions, selectedYearId]);

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
      } finally {
        if (!ignore) {
          setCurrentYearLoaded(true);
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
    if (!currentYearLoaded) return;

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
  }, [
    yearOptions,
    currentYearValue,
    selectedYearId,
    defaultYearApplied,
    currentYearLoaded,
  ]);

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
      Swal.fire("เกิดข้อผิดพลาด", err?.message || "ไม่สามารถโหลดข้อมูลรอบการพิจารณาได้", "error");
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

    const selectedYearNumber = useMemo(() => {
      if (selectedYearValue === null || selectedYearValue === undefined) return null;
      const numeric = Number(selectedYearValue);
      return Number.isFinite(numeric) ? numeric : null;
    }, [selectedYearValue]);

  const nextYear = useMemo(() => {
    if (!selectedYearNumber) return null;
    return selectedYearNumber + 1;
  }, [selectedYearNumber]);

  const selectedYearTitle = useMemo(() => {
    if (!selectedYearOption) return "ปีที่เลือก";
    const display = getYearDisplayValue(selectedYearOption.raw);
    if (display) {
      return `พ.ศ. ${display}`;
    }
    if (selectedYearOption.label) return selectedYearOption.label;
    if (selectedYearOption.id) return `ID ${selectedYearOption.id}`;
    return "ปีที่เลือก";
  }, [selectedYearOption]);

  const copyDisabledReason = useMemo(() => {
    if (!selectedYearId) return "กรุณาเลือกปีงบประมาณก่อน";
    if (!periods?.length) return "ปีที่เลือกยังไม่มีรอบการพิจารณาให้คัดลอก";
    return null;
  }, [selectedYearId, periods]);

  const hasExistingTargets = availableExistingYears.length > 0;

  const resetCopyState = useCallback(() => {
    setCopyMode("new");
    setCopyNewYear(nextYear ? String(nextYear) : "");
    setCopyExistingYearId(
      hasExistingTargets && availableExistingYears[0]?.id
        ? String(availableExistingYears[0].id)
        : ""
    );
    setCopyError("");
  }, [availableExistingYears, hasExistingTargets, nextYear]);

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
      Swal.fire("ข้อมูลไม่ครบ", "กรุณาเลือกเลขรอบการพิจารณาระหว่าง 1-5", "warning");
      return false;
    }

    const cutoff = String(formData.cutoff_date || "").trim();
    if (!cutoff || !/^\d{4}-\d{2}-\d{2}$/.test(cutoff)) {
      Swal.fire("ข้อมูลไม่ครบ", "กรุณาเลือกวันตัดรอบการพิจารณาจากปฏิทิน", "warning");
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
        Swal.fire("สำเร็จ", "แก้ไขวันตัดรอบการพิจารณาเรียบร้อย", "success");
      } else {
        await adminInstallmentAPI.create(payload);
        Swal.fire("สำเร็จ", "เพิ่มวันตัดรอบการพิจารณาเรียบร้อย", "success");
      }
      loadPeriods();
      handleCloseForm();
    } catch (err) {
      console.error("Failed to save installment period", err);
      Swal.fire("เกิดข้อผิดพลาด", err?.message || "ไม่สามารถบันทึกวันตัดรอบการพิจารณาได้", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (period) => {
    if (!period?.installment_period_id) return;

    const confirmed = await Swal.fire({
      title: "ยืนยันการลบ?",
      text: `ต้องการลบรอบการพิจารณาที่ ${period.installment_number || ""} หรือไม่?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#d33",
    });

    if (!confirmed.isConfirmed) return;

    try {
      await adminInstallmentAPI.remove(period.installment_period_id);
      Swal.fire("สำเร็จ", "ลบวันตัดรอบการพิจารณาเรียบร้อย", "success");
      loadPeriods();
    } catch (err) {
      console.error("Failed to delete installment period", err);
      Swal.fire("เกิดข้อผิดพลาด", err?.message || "ไม่สามารถลบวันตัดรอบการพิจารณาได้", "error");
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
        nextActive ? "เปิดใช้งานรอบการพิจารณาเรียบร้อย" : "ปิดใช้งานรอบการพิจารณาเรียบร้อย",
        "success"
      );
    } catch (err) {
      console.error("Failed to toggle installment status", err);
      throw err;
    }
  };

  const openCopyModal = useCallback(async () => {
    if (copyDisabledReason) {
      await Swal.fire({
        icon: "warning",
        title: "ไม่สามารถคัดลอกได้",
        text: copyDisabledReason,
      });
      return;
    }

    resetCopyState();
    setCopyModalOpen(true);
  }, [copyDisabledReason, resetCopyState]);

  const closeCopyModal = () => {
    setCopyModalOpen(false);
    setCopyError("");
  };

  const handleCopySubmit = useCallback(
    async (event) => {
      event?.preventDefault();
      setCopyError("");

      if (!selectedYearId) return;

      if (copyMode === "existing") {
        if (!hasExistingTargets) {
          setCopyError("ยังไม่มีปีปลายทางให้เลือก");
          return;
        }

        if (!copyExistingYearId) {
          setCopyError("กรุณาเลือกปีที่ต้องการเพิ่มข้อมูล");
          return;
        }

        const targetOption = availableExistingYears.find(
          (option) => String(option.id) === String(copyExistingYearId)
        );
        const displayLabel =
          getYearDisplayValue(targetOption?.raw) || targetOption?.label || copyExistingYearId;

        try {
          setCopying(true);
          const payload = {
            sourceYearId: selectedYearId,
            targetYearId: Number(copyExistingYearId),
          };

          const response = await adminInstallmentAPI.copy(payload);
          const message =
            response?.message ||
            `คัดลอกรอบการพิจารณาไปยังปี ${displayLabel} เรียบร้อย`;

          await Swal.fire("สำเร็จ", message, "success");

          const targetYearId = response?.target_year_id ?? Number(copyExistingYearId);
          if (targetYearId && Number(targetYearId) === Number(selectedYearId)) {
            loadPeriods();
          }

          setCopyModalOpen(false);
        } catch (err) {
          console.error("Failed to copy installment periods", err);
          Swal.fire("เกิดข้อผิดพลาด", err?.message || "ไม่สามารถคัดลอกรอบการพิจารณาได้", "error");
        } finally {
          setCopying(false);
        }

        return;
      }

      const targetYearValue = (copyNewYear || "").trim();
      if (!targetYearValue) {
        setCopyError("กรุณาระบุปีปลายทาง");
        return;
      }
      if (!/^\d{4}$/.test(targetYearValue)) {
        setCopyError("กรุณาระบุปี พ.ศ. 4 หลัก");
        return;
      }
      const numeric = Number(targetYearValue);
      if (!Number.isFinite(numeric) || numeric <= 0) {
        setCopyError("ปีปลายทางไม่ถูกต้อง");
        return;
      }

      const duplicateYear = existingYearValues.some((existing) => {
        if (!Number.isFinite(existing)) return false;
        return (
          existing === numeric ||
          existing === numeric + 543 ||
          existing === numeric - 543
        );
      });

      if (duplicateYear) {
        setCopyError("ปีนี้มีอยู่แล้วในระบบ");
        return;
      }

      try {
        setCopying(true);
        const payload = {
          sourceYearId: selectedYearId,
          targetYear: targetYearValue,
        };

        const response = await adminInstallmentAPI.copy(payload);
        const message =
          response?.message || `สร้างปี ${targetYearValue} และคัดลอกรอบการพิจารณาเรียบร้อย`;

        await Swal.fire("สำเร็จ", message, "success");

        setCopyModalOpen(false);
      } catch (err) {
        console.error("Failed to copy installment periods", err);
        Swal.fire("เกิดข้อผิดพลาด", err?.message || "ไม่สามารถคัดลอกรอบการพิจารณาได้", "error");
      } finally {
        setCopying(false);
      }
    },
    [
      availableExistingYears,
      copyExistingYearId,
      copyMode,
      copyNewYear,
      existingYearValues,
      hasExistingTargets,
      loadPeriods,
      selectedYearId,
    ]
  );

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
        title="ตั้งค่าวันตัดรอบการพิจารณาของทุน"
        description="กำหนดเลขรอบการพิจารณาและวันตัดต่อปี เพื่อใช้คำนวณรอบการพิจารณาอัตโนมัติในการยื่นขอทุน"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={loadPeriods}
              className="inline-flex items-center gap-2 rounded-lg border border-green-200 px-4 py-2 text-sm font-medium text-green-600 transition hover:bg-green-50"
            >
              <RefreshCcw size={16} />
              รีเฟรช
            </button>
            <button
              type="button"
              onClick={openCopyModal}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-200 px-4 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50 disabled:opacity-60"
              disabled={copying || Boolean(copyDisabledReason)}
              title={copyDisabledReason || undefined}
            >
              <Copy size={16} />
              {copying ? "กำลังคัดลอก..." : "คัดลอกไปยังปีอื่น"}
            </button>
            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white transition-colors hover:bg-blue-700"
            >
              <Plus size={16} />
              เพิ่มวันตัดรอบการพิจารณา
            </button>
          </div>
        }
        contentClassName="space-y-6"
      >
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-gray-700">ปีงบประมาณ</span>
            <select
              value={selectedYearId ?? ""}
              onChange={handleYearChange}
              className="min-w-[160px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              {yearOptions.map((option) => (
                <option key={option.id ?? option.label} value={option.id ?? ""}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">เลขรอบการพิจารณา</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">วันตัดรอบการพิจารณา</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">ชื่อ/คำอธิบาย</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">หมายเหตุ</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">สถานะ</th>
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
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">รอบการพิจารณาที่ {period.installment_number ?? "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{toThaiDate(period.cutoff_date)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{period.name || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-pre-line">{period.remark || "-"}</td> 
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
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50"
                          onClick={() => openEditForm(period)}
                        >
                          <Edit size={16} /> แก้ไข
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
                          onClick={() => handleDelete(period)}
                        >
                          <Trash2 size={16} /> ลบ
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
                      ? "ยังไม่มีการตั้งค่ารอบการพิจารณาสำหรับปีนี้"
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

      <SettingsModal
        open={copyModalOpen}
        onClose={closeCopyModal}
        size="lg"
        bodyClassName="max-h-[75vh] overflow-y-auto px-6 py-6"
        footerClassName="flex items-center justify-end gap-3 px-6 py-4"
        headerContent={
          <div className="flex items-center gap-3 text-gray-700">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <Copy size={18} />
            </span>
            <div>
              <p className="text-base font-semibold text-gray-900">คัดลอกรอบการพิจารณา</p>
              <p className="text-sm text-gray-500">นำรอบการพิจารณาจาก {selectedYearTitle} ไปยังปีอื่น</p>
            </div>
          </div>
        }
      >
        <form onSubmit={handleCopySubmit} className="space-y-5">
          <div className="space-y-4">
            <div
              className={`rounded-xl border p-4 transition ${
                copyMode === "new" ? "border-blue-200 bg-blue-50/60" : "border-gray-200"
              }`}
            >
              <label className="flex items-start gap-3">
                <input
                  type="radio"
                  name="installment-copy-mode"
                  value="new"
                  checked={copyMode === "new"}
                  onChange={() => setCopyMode("new")}
                  className="mt-1"
                />
                <div className="space-y-1">
                  <p className="font-medium text-gray-900">คัดลอกไปปีใหม่</p>
                  <p className="text-sm text-gray-600">ระบบจะสร้างปีงบประมาณใหม่ตามปีที่ระบุ</p>
                </div>
              </label>
              <input
                type="number"
                value={copyNewYear}
                onChange={(event) => setCopyNewYear(event.target.value)}
                placeholder="เช่น 2569"
                className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
                disabled={copyMode !== "new"}
              />
            </div>

            <div
              className={`rounded-xl border p-4 transition ${
                copyMode === "existing" ? "border-blue-200 bg-blue-50/60" : "border-gray-200"
              } ${!hasExistingTargets ? "opacity-60" : ""}`}
            >
              <label className="flex items-start gap-3">
                <input
                  type="radio"
                  name="installment-copy-mode"
                  value="existing"
                  checked={copyMode === "existing"}
                  onChange={() => setCopyMode("existing")}
                  className="mt-1"
                  disabled={!hasExistingTargets}
                />
                <div className="space-y-1">
                  <p className="font-medium text-gray-900">เพิ่มไปยังปีที่มีอยู่</p>
                  <p className="text-sm text-gray-600">เพิ่มรอบการพิจารณาไปยังปีที่เลือกโดยไม่สร้างปีใหม่</p>
                </div>
              </label>
              <select
                value={copyExistingYearId}
                onChange={(event) => setCopyExistingYearId(event.target.value)}
                className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
                disabled={!hasExistingTargets || copyMode !== "existing"}
              >
                <option value="">เลือกปีปลายทาง</option>
                {availableExistingYears.map((option) => {
                  const display = getYearDisplayValue(option.raw) || option.label || option.id;
                  const label = option.label || (display ? `พ.ศ. ${display}` : `ID ${option.id}`);
                  return (
                    <option key={option.id} value={option.id}>
                      {label}
                    </option>
                  );
                })}
              </select>
              {!hasExistingTargets ? (
                <p className="mt-2 text-sm text-gray-500">ยังไม่มีปีปลายทางให้เลือก</p>
              ) : null}
            </div>
          </div>

          {copyError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{copyError}</div>
          ) : null}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={closeCopyModal}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={copying}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <Copy size={16} />
              {copying ? "กำลังคัดลอก..." : "คัดลอก"}
            </button>
          </div>
        </form>
      </SettingsModal>

      <InstallmentFormModal
        open={formOpen}
        onClose={handleCloseForm}
        title={
          editingPeriod
            ? `แก้ไขรอบการพิจารณาที่ ${editingPeriod.installment_number ?? ""}`
            : "เพิ่มวันตัดรอบการพิจารณาใหม่"
        }
        formData={formData}
        onChange={handleFormChange}
        installmentOptions={installmentOptions}
        submitting={submitting}
        onSubmit={handleSubmit}
      />
    </>
  );
};

export default InstallmentManagementTab;