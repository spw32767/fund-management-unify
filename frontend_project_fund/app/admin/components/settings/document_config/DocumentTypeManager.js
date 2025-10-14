"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PlusCircle,
  Pencil,
  Trash2,
  RefreshCcw,
  FileStack,
  Save,
  GripVertical,
  Edit,
} from "lucide-react";
import Swal from "sweetalert2";

import { documentTypesAPI } from "@/app/lib/api";
import DocumentTypeModal, { FUND_TYPE_OPTIONS } from "./DocumentTypeModal";
import SettingsSectionCard from "@/app/admin/components/settings/common/SettingsSectionCard";

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
  const flat = [];

  const appendValue = (value) => {
    if (Array.isArray(value)) {
      value.forEach(appendValue);
      return;
    }

    if (typeof value !== "string") return;

    const trimmed = value.trim();
    if (!trimmed) return;

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          parsed.forEach(appendValue);
          return;
        }
      } catch (error) {
        console.warn("Failed to parse fund type list string:", trimmed, error);
      }
    }

    const cleaned = trimmed.replace(/^['"]+|['"]+$/g, "");
    if (!cleaned) return;

    if (cleaned.includes(",")) {
      cleaned.split(",").forEach((segment) => appendValue(segment));
      return;
    }

    flat.push(cleaned);
  };

  if (Array.isArray(items)) {
    items.forEach(appendValue);
  } else if (typeof items === "string") {
    appendValue(items);
  } else if (items && typeof items === "object") {
    if (Array.isArray(items.data)) {
      items.data.forEach(appendValue);
    } else if (Array.isArray(items.items)) {
      items.items.forEach(appendValue);
    } else {
      Object.values(items).forEach((value) => {
        if (Array.isArray(value)) {
          value.forEach(appendValue);
        }
      });
    }
  }

  const seen = new Set();
  const result = [];

  flat.forEach((value) => {
    const lower = value.toLowerCase();
    if (seen.has(lower)) return;
    seen.add(lower);
    result.push(value);
  });

  return result;
};

const determineFundTypeMode = (item) => {
  if (typeof item?.fund_type_mode === "string") {
    const trimmed = item.fund_type_mode.trim();
    if (trimmed) return trimmed;
  }

  if (
    Object.prototype.hasOwnProperty.call(item, "fund_types") &&
    item.fund_types === null
  ) {
    return "inactive";
  }

  const fundTypes = dedupeStringList(item?.fund_types);
  return fundTypes.length === 0 ? "all" : "limited";
};

const FUND_TYPE_LABELS = Object.fromEntries(
  FUND_TYPE_OPTIONS.map((option) => [option.value, option.label]),
);

const FUND_TYPE_DISPLAY_NAMES = {
  fund_application: "แบบฟอร์มสมัครรับทุนส่งเสริมการวิจัย",
  publication_reward: "แบบฟอร์มสมัครรับเงินรางวัลตีพิมพ์",
};

const formatDocumentType = (item) => {
  if (!item || typeof item !== "object") return null;
  const fundTypeMode = determineFundTypeMode(item);
  const fundTypes = dedupeStringList(item.fund_types);

  return {
    document_type_id: item.document_type_id ?? item.id,
    document_type_name: item.document_type_name ?? item.name ?? "",
    code: item.code || "",
    required: Boolean(item.required),
    multiple: Boolean(item.multiple),
    document_order: item.document_order ?? 0,
    fund_types: fundTypes,
    fund_type_mode: fundTypeMode,
    update_at: item.update_at || item.updated_at || null,
    is_inactive: fundTypeMode === "inactive",
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
  const [draggingId, setDraggingId] = useState(null);
  const [orderDirty, setOrderDirty] = useState(false);
  const baselineOrderRef = useRef([]);

  const isFiltering = useMemo(() => searchTerm.trim().length > 0, [searchTerm]);

  const syncBaseline = useCallback((list) => {
    const order = list.map((item) => item.document_type_id);
    baselineOrderRef.current = order;
    setOrderDirty(false);
  }, []);

  const showSuccess = (message) => Toast.fire({ icon: "success", title: message });
  const showError = (message) => Toast.fire({ icon: "error", title: message });

  const loadDocumentTypes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await documentTypesAPI.getAllDocumentTypes();
      const list = normalizeApiList(response, "document_types")
        .map(formatDocumentType)
        .filter(Boolean);
      const sorted = list
        .slice()
        .sort((a, b) => {
          const orderDiff = (a.document_order ?? 0) - (b.document_order ?? 0);
          if (orderDiff !== 0) return orderDiff;
          return (a.document_type_id ?? 0) - (b.document_type_id ?? 0);
        });
      const normalized = sorted.map((item, index) => ({
        ...item,
        document_order: index + 1,
      }));
      setDocumentTypes(normalized);
      setFilteredTypes(normalized);
      syncBaseline(normalized);
    } catch (error) {
      console.error("Failed to load document types:", error);
      showError("ไม่สามารถโหลดประเภทเอกสารได้");
    } finally {
      setLoading(false);
    }
  }, [syncBaseline]);

  useEffect(() => {
    loadDocumentTypes();
  }, [loadDocumentTypes]);

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
    const fundTypes = dedupeStringList(formData.fund_types);
    const payload = {
      document_type_name: formData.document_type_name,
      code: formData.code,
      required: Boolean(formData.required),
      multiple: Boolean(formData.multiple),
      fund_types: fundTypes,
    };

    const mode = editingDocumentType?.document_type_id ? "update" : "create";

    if (mode === "create") {
      const maxOrder = documentTypes.reduce((max, item) => {
        const current = Number(item.document_order) || 0;
        return current > max ? current : max;
      }, 0);
      payload.document_order = maxOrder + 1;
    }

    try {
      setSaving(true);
      if (mode === "update") {
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

  const handleDragStart = (event, id) => {
    setDraggingId(id);
    if (event?.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
    }
  };

  const handleDragOver = (event, overId) => {
    event.preventDefault();
    if (draggingId == null || draggingId === overId) return;

    setDocumentTypes((prev) => {
      const fromIndex = prev.findIndex(
        (item) => item.document_type_id === draggingId,
      );
      const toIndex = prev.findIndex(
        (item) => item.document_type_id === overId,
      );
      if (fromIndex === -1 || toIndex === -1) return prev;

      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);

      const recalculated = next.map((entry, idx) => ({
        ...entry,
        document_order: idx + 1,
      }));

      const term = searchTerm.trim().toLowerCase();
      if (!term) {
        setFilteredTypes(recalculated);
      } else {
        setFilteredTypes(
          recalculated.filter((item) => {
            const candidates = [
              item.document_type_name,
              item.code,
              ...(item.fund_types || []),
            ];
            return candidates.some(
              (entry) => typeof entry === "string" && entry.toLowerCase().includes(term),
            );
          }),
        );
      }

      const currentOrder = recalculated.map((item) => item.document_type_id);
      const baseline = baselineOrderRef.current;
      const matchesBaseline =
        currentOrder.length === baseline.length &&
        currentOrder.every((value, index) => value === baseline[index]);
      setOrderDirty(!matchesBaseline);

      return recalculated;
    });
  };

  const handleDragEnd = () => {
    setDraggingId(null);
  };

  const persistDocumentOrder = async () => {
    if (!orderDirty) return;

    try {
      setSaving(true);
      const payloads = documentTypes
        .map((item, index) => ({
          id: item.document_type_id,
          document_order: index + 1,
        }))
        .filter((entry) => entry.id != null);

      if (payloads.length === 0) {
        showError("ไม่มีรายการสำหรับบันทึกลำดับ");
        return;
      }

      await Promise.all(
        payloads.map((entry) =>
          documentTypesAPI.updateDocumentType(entry.id, {
            document_order: entry.document_order,
          }),
        ),
      );

      showSuccess("บันทึกลำดับประเภทเอกสารแล้ว");
      await loadDocumentTypes();
    } catch (error) {
      console.error("Failed to persist document order:", error);
      const message =
        error?.response?.data?.error ||
        error?.message ||
        "ไม่สามารถบันทึกลำดับได้";
      showError(message);
    } finally {
      setSaving(false);
    }
  };


  return (
    <div className="space-y-6">
      <SettingsSectionCard
        icon={FileStack}
        iconSize={20}
        title="ตั้งค่าเอกสารแนบทุน"
        description="เพิ่ม แก้ไข หรือกำหนดเงื่อนไขของไฟล์ที่ต้องใช้ในแบบฟอร์มต่างๆ"
        actions={
          <>
            <button
              type="button"
              onClick={loadDocumentTypes}
              disabled={loading || saving}
              className="inline-flex items-center gap-2 rounded-lg border border-green-200 px-4 py-2 text-sm font-medium text-green-600 transition hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <RefreshCcw size={16} />
              รีเฟรช
            </button>
            <button
              type="button"
              onClick={persistDocumentOrder}
              disabled={loading || saving || !orderDirty}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-200 px-4 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={16} />
              บันทึกลำดับ
            </button>
            <button
              type="button"
              onClick={handleAddDocumentType}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
            >
              <PlusCircle size={18} />
              เพิ่มประเภทเอกสาร
            </button>
          </>
        }
        contentClassName="space-y-4"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-gray-500">
            ทั้งหมด {documentTypes.length} รายการ | แสดง {filteredTypes.length} รายการ
          </div>
          <div className="relative w-full md:w-72">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="ค้นหาโดยชื่อ รหัส หรือประเภททุน"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-16 px-3 py-3 text-center font-bold text-gray-600">ลำดับ</th>
                <th className="px-3 py-3 text-center font-bold text-gray-600">ชื่อเอกสาร</th>
                <th className="px-3 py-3 text-center font-bold text-gray-600">รหัส</th>
                <th className="px-3 py-3 text-center font-bold text-gray-600">ประเภททุน</th>
                <th className="px-3 py-3 text-center font-bold text-gray-600">ตัวเลือก</th>
                <th className="px-3 py-3 text-center font-bold text-gray-600">การจัดการ</th>
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
                filteredTypes.map((item, index) => (
                  <tr
                    key={item.document_type_id}
                    draggable={!isFiltering}
                    onDragStart={(event) => handleDragStart(event, item.document_type_id)}
                    onDragOver={(event) => handleDragOver(event, item.document_type_id)}
                    onDragEnd={handleDragEnd}
                    className={`${draggingId === item.document_type_id ? "bg-blue-50" : "hover:bg-gray-50"}`}
                  >
                    <td className="px-3 py-3 text-center text-gray-400">
                      <div
                        className={`inline-flex items-center gap-1 ${isFiltering ? "cursor-not-allowed" : "cursor-grab"}`}
                      >
                        <GripVertical size={16} />
                        {item.document_order ?? index + 1}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium text-left text-gray-900">
                        {item.document_type_name || "(ไม่ระบุชื่อ)"}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-left text-gray-700">{item.code || "-"}</td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex flex-wrap justify-center gap-2">
                        {(() => {
                          const fundTypes = Array.isArray(item.fund_types)
                            ? item.fund_types
                            : [];
                          const mode = item.fund_type_mode || determineFundTypeMode(item);
                          const inactive = item.is_inactive || mode === "inactive";

                          if (inactive) {
                            return (
                              <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                                ไม่ได้ใช้งาน
                              </span>
                            );
                          }

                          if (mode === "all" || fundTypes.length === 0) {
                            return (
                              <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                                ทุกประเภททุน
                              </span>
                            );
                          }

                          return fundTypes.map((fund) => (
                            <span
                              key={`${item.document_type_id}-${fund.toLowerCase()}`}
                              className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 shadow-sm"
                            >
                              {FUND_TYPE_DISPLAY_NAMES[fund] ||
                                FUND_TYPE_LABELS[fund] ||
                                fund}
                            </span>
                          ));
                        })()}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-gray-700">
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
                    <td className="px-3 py-3 text-right">
                      <div className="flex justify-center gap-2 px-3 py-3 whitespace-nowrap text-sm font-medium">
                        <button
                          type="button"
                          onClick={() => handleEditDocumentType(item)}
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50"
                        >
                          <Edit size={16} /> แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDocumentType(item)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
                        >
                          <Trash2 size={16} /> ลบ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </SettingsSectionCard>

      <DocumentTypeModal
        isOpen={modalOpen}
        onClose={closeModal}
        onSubmit={handleModalSubmit}
        initialData={editingDocumentType}
        saving={saving}
      />
    </div>
  );
};

export default DocumentTypeManager;