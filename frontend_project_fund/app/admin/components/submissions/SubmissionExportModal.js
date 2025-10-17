"use client";

import { useEffect, useMemo, useState } from "react";
import { adminAPI } from "../../../lib/admin_api";

const normalizeId = (value) => {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
};

const normalizeCategory = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  const id =
    raw.category_id ??
    raw.id ??
    raw.CategoryID ??
    raw.CategoryId ??
    raw.categoryId ??
    raw.categoryID;
  const normalizedId = normalizeId(id);
  if (!normalizedId) return null;
  const name =
    raw.category_name ??
    raw.name ??
    raw.CategoryName ??
    raw.label ??
    raw.Category ??
    "";
  return {
    ...raw,
    category_id: normalizedId,
    category_name: name || `หมวดทุน ${normalizedId}`,
  };
};

const normalizeSubcategory = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  const id =
    raw.subcategory_id ??
    raw.id ??
    raw.SubcategoryID ??
    raw.SubcategoryId ??
    raw.subcategoryId ??
    raw.subcategoryID;
  const normalizedId = normalizeId(id);
  if (!normalizedId) return null;
  const name =
    raw.subcategory_name ??
    raw.name ??
    raw.SubcategoryName ??
    raw.label ??
    raw.Subcategory ??
    "";
  return {
    ...raw,
    subcategory_id: normalizedId,
    subcategory_name: name || `ประเภททุน ${normalizedId}`,
  };
};

const dedupeOptions = (items, normalize, key) => {
  if (!Array.isArray(items)) return [];
  const seen = new Set();
  const result = [];

  items.forEach((raw) => {
    const normalized = normalize(raw);
    if (!normalized) return;
    const id = normalized[key];
    if (!id || seen.has(id)) return;
    seen.add(id);
    result.push(normalized);
  });

  return result;
};

export default function SubmissionExportModal({
  open,
  onClose,
  onConfirm,
  initialFilters,
  selectedYear,
  selectedYearLabel,
  statuses = [],
  statusLoading = false,
  isExporting = false,
}) {
  const [localFilters, setLocalFilters] = useState(() => initialFilters);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);

  useEffect(() => {
    if (open) {
      setLocalFilters(initialFilters);
    }
  }, [open, initialFilters]);

  useEffect(() => {
    if (!open) return;
    if (!selectedYear) {
      setCategories([]);
      setSubcategories([]);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoadingCategories(true);
      try {
        const response = await adminAPI.getCategories(selectedYear);
        if (cancelled) return;
        if (Array.isArray(response)) {
          setCategories(dedupeOptions(response, normalizeCategory, "category_id"));
        } else if (response?.categories) {
          setCategories(dedupeOptions(response.categories, normalizeCategory, "category_id"));
        } else {
          setCategories([]);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load categories for export modal", error);
          setCategories([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingCategories(false);
        }
      }
    };
    load();

    return () => {
      cancelled = true;
    };
  }, [open, selectedYear]);

  useEffect(() => {
    if (!open) return;
    if (!localFilters.category) {
      setSubcategories([]);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoadingSubcategories(true);
      try {
        const response = await adminAPI.getSubcategories(localFilters.category);
        if (cancelled) return;
        if (Array.isArray(response)) {
          setSubcategories(dedupeOptions(response, normalizeSubcategory, "subcategory_id"));
        } else if (response?.subcategories) {
          setSubcategories(dedupeOptions(response.subcategories, normalizeSubcategory, "subcategory_id"));
        } else {
          setSubcategories([]);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load subcategories for export modal", error);
          setSubcategories([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingSubcategories(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [open, localFilters.category]);

  const statusOptions = useMemo(() => {
    if (!Array.isArray(statuses)) return [];
    return statuses.filter((status) => {
      const name = (status?.status_name || status?.StatusName || "").trim();
      const code = String(status?.status_code || status?.StatusCode || "")
        .trim()
        .toLowerCase();
      if (!name && !code) return true;
      if (name === "ร่าง") return false;
      if (code === "draft") return false;
      return true;
    });
  }, [statuses]);

  const handleChange = (field, value) => {
    setLocalFilters((prev) => {
      if (field === "category") {
        return { ...prev, category: value, subcategory: "" };
      }
      return { ...prev, [field]: value };
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onConfirm(localFilters);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-gray-900/40"
        aria-hidden="true"
        onClick={isExporting ? undefined : onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">ส่งออกคำร้อง</h2>
            <p className="text-sm text-gray-500 mt-1">
              เลือกตัวกรองสำหรับไฟล์ส่งออกก่อนดาวน์โหลด (.xlsx)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            aria-label="ปิดหน้าต่างเลือกตัวกรอง"
          >
            <span className="text-2xl leading-none">×</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                หมวดทุน (ทุนหลัก)
              </label>
              <select
                value={localFilters.category || ""}
                onChange={(e) => handleChange("category", e.target.value)}
                disabled={!selectedYear || loadingCategories}
                className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:bg-gray-100 disabled:text-gray-500"
              >
                <option value="">ทั้งหมด</option>
                {categories.map((category) => (
                  <option key={category.category_id} value={category.category_id}>
                    {category.category_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ประเภททุน (ทุนย่อย)
              </label>
              <select
                value={localFilters.subcategory || ""}
                onChange={(e) => handleChange("subcategory", e.target.value)}
                disabled={!localFilters.category || loadingSubcategories}
                className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:bg-gray-100 disabled:text-gray-500"
              >
                <option value="">ทั้งหมด</option>
                {subcategories.map((subcategory) => (
                  <option key={subcategory.subcategory_id} value={subcategory.subcategory_id}>
                    {subcategory.subcategory_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">สถานะ</label>
              <select
                value={localFilters.status || ""}
                onChange={(e) => handleChange("status", e.target.value)}
                disabled={statusLoading && statusOptions.length === 0}
                className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">ทั้งหมด</option>
                {statusOptions.map((status) => (
                  <option key={status.application_status_id} value={status.application_status_id}>
                    {status.status_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ค้นหา</label>
              <input
                type="text"
                value={localFilters.search || ""}
                onChange={(e) => handleChange("search", e.target.value)}
                placeholder="เลขที่คำร้อง, ชื่อเรื่อง, ผู้ยื่น..."
                className="block w-full pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
            <div>
              ปีงบประมาณที่เลือก:{' '}
              {selectedYearLabel || (selectedYear ? String(selectedYear) : "ทุกปี")}
            </div>
            <div className="text-xs text-gray-400">
              หมายเหตุ: ใช้การกรองแบบเดียวกับหน้ารายการ เพื่อส่งออกเฉพาะคำร้องที่ต้องการ
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isExporting}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isExporting}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isExporting && (
                <span className="inline-block h-4 w-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
              )}
              ส่งออกไฟล์ Excel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}