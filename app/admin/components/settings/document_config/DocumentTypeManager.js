"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { PlusCircle, Pencil, Trash2, RefreshCcw, FileStack } from "lucide-react";
import Swal from "sweetalert2";

import { documentTypesAPI } from "@/app/lib/api";
import { adminAPI } from "@/app/lib/admin_api";
import DocumentTypeModal, { FUND_TYPE_OPTIONS } from "./DocumentTypeModal";

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

const normalizeApiList = (value, fallbackKey) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    if (Array.isArray(value.data)) return value.data;
    if (Array.isArray(value.items)) return value.items;
    if (Array.isArray(value[fallbackKey])) return value[fallbackKey];
  }
  return [];
};

const dedupeStringList = (items) => {
  const list = Array.isArray(items)
    ? items
    : typeof items === "string"
    ? [items]
    : [];

  const seen = new Set();
  const result = [];

  list.forEach((value) => {
    if (typeof value !== "string") return;
    const trimmed = value.trim();
    if (!trimmed) return;
    const lower = trimmed.toLowerCase();
    if (seen.has(lower)) return;
    seen.add(lower);
    result.push(trimmed);
  });

  return result;
};

const FUND_TYPE_LABELS = Object.fromEntries(
  FUND_TYPE_OPTIONS.map((option) => [option.value, option.label]),
);

const buildSubcategoryOptions = (rawSubcategories) => {
  const unique = new Map();

  rawSubcategories.forEach((item) => {
    const candidates = [
      item.subcategory_name,
      item.name,
      item.name_th,
      item.title,
      item.title_th,
      item.label,
      item.label_th,
    ];
    const nameCandidate = candidates.find(
      (entry) => typeof entry === "string" && entry.trim() !== ""
    );

    if (!nameCandidate) {
      return;
    }

    const name = nameCandidate.trim();
    const lower = name.toLowerCase();
    if (!unique.has(lower)) {
      unique.set(lower, {
        id: item.subcategory_id ?? item.id,
        name,
      });
      return;
    }
  });

  return Array.from(unique.values())
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
    }))
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "th"));
};

const formatDocumentType = (item) => {
  if (!item || typeof item !== "object") return null;
  const rawNames = Array.isArray(item.subcategory_names)
    ? item.subcategory_names
    : Array.isArray(item.subcategories)
    ? item.subcategories
    : [];

  const normalizedNames = dedupeStringList(rawNames);

  let primaryName = "";
  if (typeof item.subcategory_name === "string" && item.subcategory_name.trim() !== "") {
    primaryName = item.subcategory_name.trim();
  } else if (normalizedNames.length > 0) {
    primaryName = normalizedNames[0];
  }

  if (primaryName && !normalizedNames.includes(primaryName)) {
    normalizedNames.unshift(primaryName);
  }

  return {
    document_type_id: item.document_type_id ?? item.id,
    document_type_name: item.document_type_name ?? item.name ?? "",
    code: item.code || "",
    required: Boolean(item.required),
    multiple: Boolean(item.multiple),
    document_order: item.document_order ?? 0,
    fund_types: dedupeStringList(item.fund_types),
    subcategory_name: primaryName,
    subcategory_names: normalizedNames,
    subcategory_ids: Array.isArray(item.subcategory_ids) ? item.subcategory_ids : [],
    update_at: item.update_at || item.updated_at || null,
  };
};

const DocumentTypeManager = () => {
  const [documentTypes, setDocumentTypes] = useState([]);
  const [filteredTypes, setFilteredTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDocumentType, setEditingDocumentType] = useState(null);
  const [subcategoryOptions, setSubcategoryOptions] = useState([]);

  const showSuccess = (message) => Toast.fire({ icon: "success", title: message });
  const showError = (message) => Toast.fire({ icon: "error", title: message });

  const loadSubcategories = useCallback(async () => {
    try {
      const response = await adminAPI.getAllSubcategories();
      const list = normalizeApiList(response, "subcategories");
      setSubcategoryOptions(buildSubcategoryOptions(list));
    } catch (error) {
      console.error("Failed to load subcategories:", error);
      showError("ไม่สามารถโหลดรายชื่อประเภทย่อยของทุนได้");
    }
  }, []);

  const loadDocumentTypes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await documentTypesAPI.getAllDocumentTypes();
      const list = normalizeApiList(response, "document_types")
        .map(formatDocumentType)
        .filter(Boolean);
      setDocumentTypes(list);
    } catch (error) {
      console.error("Failed to load document types:", error);
      showError("ไม่สามารถโหลดประเภทเอกสารได้");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocumentTypes();
    loadSubcategories();
  }, [loadDocumentTypes, loadSubcategories]);

  useEffect(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      setFilteredTypes(documentTypes);
      return;
    }
    setFilteredTypes(
      documentTypes.filter((item) => {
        const candidates = [
          item.document_type_name,
          item.code,
          item.subcategory_name,
          ...(item.subcategory_names || []),
          ...(item.fund_types || []),
        ];
        return candidates.some(
          (entry) => typeof entry === "string" && entry.toLowerCase().includes(term)
        );
      })
    );
  }, [documentTypes, searchTerm]);

  const handleAddDocumentType = () => {
    setEditingDocumentType(null);
    setModalOpen(true);
  };

  const handleEditDocumentType = (docType) => {
    setEditingDocumentType(docType);
    setModalOpen(true);
  };

  const handleDeleteDocumentType = async (docType) => {
    if (!docType?.document_type_id) return;
    const result = await Swal.fire({
      title: "ยืนยันการลบ",
      text: `ต้องการลบประเภทเอกสาร "${docType.document_type_name}" หรือไม่?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      setSaving(true);
      await documentTypesAPI.deleteDocumentType(docType.document_type_id);
      showSuccess("ลบประเภทเอกสารเรียบร้อยแล้ว");
      await loadDocumentTypes();
    } catch (error) {
      console.error("Failed to delete document type:", error);
      showError(error?.response?.data?.error || "ไม่สามารถลบประเภทเอกสารได้");
    } finally {
      setSaving(false);
    }
  };

  const handleModalSubmit = async (formData) => {
    const payload = {
      document_type_name: formData.document_type_name,
      code: formData.code,
      document_order: Number(formData.document_order) || 0,
      required: Boolean(formData.required),
      multiple: Boolean(formData.multiple),
      fund_types: dedupeStringList(formData.fund_types),
    };

    const selectedName = (formData.subcategory_name || "").trim();
    payload.subcategory_name = selectedName ? selectedName : null;

    try {
      setSaving(true);
      if (editingDocumentType?.document_type_id) {
        await documentTypesAPI.updateDocumentType(
          editingDocumentType.document_type_id,
          payload,
        );
        showSuccess("อัปเดตประเภทเอกสารเรียบร้อยแล้ว");
      } else {
        await documentTypesAPI.createDocumentType(payload);
        showSuccess("เพิ่มประเภทเอกสารเรียบร้อยแล้ว");
      }

      setModalOpen(false);
      setEditingDocumentType(null);
      await loadDocumentTypes();
    } catch (error) {
      console.error("Failed to save document type:", error);
      const message =
        error?.response?.data?.error ||
        error?.message ||
        "ไม่สามารถบันทึกประเภทเอกสารได้";
      showError(message);
    } finally {
      setSaving(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingDocumentType(null);
  };

  const subcategoryOptionList = useMemo(() => subcategoryOptions, [subcategoryOptions]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b px-6 py-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <FileStack size={24} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">จัดการประเภทเอกสาร</h2>
              <p className="text-sm text-gray-500">
                เพิ่ม แก้ไข หรือกำหนดเงื่อนไขของไฟล์ที่ต้องใช้ในแบบฟอร์มต่างๆ
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={loadDocumentTypes}
              disabled={loading || saving}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <RefreshCcw size={16} />
              โหลดข้อมูลใหม่
            </button>
            <button
              type="button"
              onClick={handleAddDocumentType}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
            >
              <PlusCircle size={18} />
              เพิ่มประเภทเอกสาร
            </button>
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-gray-500">
              ทั้งหมด {documentTypes.length} รายการ | แสดง {filteredTypes.length} รายการ
            </div>
            <div className="relative w-full md:w-72">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="ค้นหาโดยชื่อ รหัส หรือประเภทย่อย"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">ชื่อเอกสาร</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">รหัส</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">ประเภททุน</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">ประเภทย่อยที่ใช้ได้</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">ตัวเลือก</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                      กำลังโหลดข้อมูล...
                    </td>
                  </tr>
                ) : filteredTypes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                      ไม่พบประเภทเอกสาร
                    </td>
                  </tr>
                ) : (
                  filteredTypes.map((item) => (
                    <tr key={item.document_type_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {item.document_type_name || "(ไม่ระบุชื่อ)"}
                        </div>
                        <div className="text-xs text-gray-500">
                          ลำดับ: {item.document_order ?? 0}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{item.code}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(() => {
                            const fundTypes = dedupeStringList(item.fund_types);
                            if (fundTypes.length === 0) {
                              return (
                                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                                  ทุกประเภททุน
                                </span>
                              );
                            }

                            return fundTypes.map((fund) => (
                              <span
                                key={`${item.document_type_id}-${fund.toLowerCase()}`}
                                className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600"
                              >
                                {FUND_TYPE_LABELS[fund] || fund}
                              </span>
                            ));
                          })()}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(() => {
                            const badges = dedupeStringList(item.subcategory_names);
                            if (badges.length === 0) {
                              return (
                                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                                  ทุกประเภทย่อย
                                </span>
                              );
                            }

                            return badges.map((name) => (
                              <span
                                key={`${item.document_type_id}-${name.toLowerCase()}`}
                                className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-600"
                              >
                                {name}
                              </span>
                            ));
                          })()}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        <div className="space-y-1 text-xs">
                          <div>
                            <span className="font-medium text-gray-600">ต้องแนบ:</span>{" "}
                            {item.required ? "ใช่" : "ไม่"}
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">แนบหลายไฟล์:</span>{" "}
                            {item.multiple ? "ได้" : "ไม่ได้"}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditDocumentType(item)}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
                          >
                            <Pencil size={14} /> แก้ไข
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDocumentType(item)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
                          >
                            <Trash2 size={14} /> ลบ
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <DocumentTypeModal
        isOpen={modalOpen}
        onClose={closeModal}
        onSubmit={handleModalSubmit}
        initialData={editingDocumentType}
        subcategoryOptions={subcategoryOptionList}
        saving={saving}
      />
    </div>
  );
};

export default DocumentTypeManager;