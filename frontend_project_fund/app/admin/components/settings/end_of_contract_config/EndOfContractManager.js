"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ListChecks,
  PlusCircle,
  Pencil,
  Trash2,
  RefreshCcw,
  Save,
  Loader2,
  GripVertical,
} from "lucide-react";
import Swal from "sweetalert2";

import SettingsSectionCard from "@/app/admin/components/settings/common/SettingsSectionCard";
import { adminAPI } from "@/app/lib/admin_api";
import EndOfContractTermModal from "./EndOfContractTermModal";

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 2500,
  timerProgressBar: true,
});

const normalizeTerm = (item, index = 0) => {
  if (!item || typeof item !== "object") {
    return null;
  }

  const content = typeof item.content === "string" ? item.content.trim() : "";
  if (!content) {
    return null;
  }

  const rawId =
    item.eoc_id ?? item.id ?? item.term_id ?? item.termId ?? item.termID ?? index + 1;
  const parsedId = Number(rawId);
  const resolvedId = Number.isFinite(parsedId) ? parsedId : index + 1;

  const rawOrder = item.display_order ?? item.order ?? item.displayOrder ?? index + 1;
  const parsedOrder = Number(rawOrder);
  const resolvedOrder = Number.isFinite(parsedOrder) ? parsedOrder : index + 1;

  return {
    eoc_id: resolvedId,
    content,
    display_order: resolvedOrder,
  };
};

const normalizeTermList = (value) => {
  let list = [];
  if (Array.isArray(value)) {
    list = value;
  } else if (value && typeof value === "object") {
    if (Array.isArray(value.data)) list = value.data;
    else if (Array.isArray(value.items)) list = value.items;
    else if (Array.isArray(value.terms)) list = value.terms;
  }

  return list
    .map((item, index) => normalizeTerm(item, index))
    .filter(Boolean)
    .sort((a, b) => {
      const orderDiff = (a.display_order ?? 0) - (b.display_order ?? 0);
      if (orderDiff !== 0) return orderDiff;
      return (a.eoc_id ?? 0) - (b.eoc_id ?? 0);
    });
};

const EndOfContractManager = () => {
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [orderDirty, setOrderDirty] = useState(false);
  const [draggingId, setDraggingId] = useState(null);
  const initialOrderRef = useRef([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [activeTerm, setActiveTerm] = useState(null);
  const [modalSaving, setModalSaving] = useState(false);

  const orderedTerms = useMemo(() => {
    return normalizeTermList(terms);
  }, [terms]);

  useEffect(() => {
    const initialIds = initialOrderRef.current;
    const currentIds = orderedTerms.map((item) => item.eoc_id);

    if (initialIds.length !== currentIds.length) {
      setOrderDirty(true);
      return;
    }

    const hasChanges = currentIds.some((id, index) => id !== initialIds[index]);
    setOrderDirty(hasChanges);
  }, [initialOrderRef, orderedTerms]);

  const showSuccess = useCallback((message) => {
    Toast.fire({ icon: "success", title: message });
  }, []);

  const showError = useCallback((message) => {
    Toast.fire({ icon: "error", title: message });
  }, []);

  const loadTerms = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getEndOfContractTerms();
      const normalized = normalizeTermList(response);
      initialOrderRef.current = normalized.map((item) => item.eoc_id);
      setTerms(normalized);
      setOrderDirty(false);
    } catch (error) {
      console.error("Failed to load end-of-contract terms:", error);
      showError("ไม่สามารถโหลดข้อตกลงได้");
    } finally {
      setLoading(false);
      setDraggingId(null);
    }
  }, [initialOrderRef, showError]);

  useEffect(() => {
    loadTerms().catch((error) => {
      console.error("Failed to initialize end-of-contract terms:", error);
    });
  }, [loadTerms]);

  const openCreateModal = useCallback(() => {
    setActiveTerm(null);
    setModalMode("create");
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback((term) => {
    setActiveTerm(term);
    setModalMode("edit");
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    if (modalSaving) {
      return;
    }
    setModalOpen(false);
    setActiveTerm(null);
    setModalMode("create");
  }, [modalSaving]);

  const handleModalSubmit = useCallback(
    async (formData) => {
      const payload = {
        content:
          typeof formData?.content === "string" ? formData.content.trim() : "",
      };

      if (!payload.content) {
        showError("กรุณากรอกเนื้อหาข้อตกลง");
        return;
      }

      setModalSaving(true);
      try {
        if (modalMode === "edit" && activeTerm) {
          await adminAPI.updateEndOfContractTerm(activeTerm.eoc_id, payload);
          showSuccess("บันทึกข้อตกลงเรียบร้อยแล้ว");
        } else {
          await adminAPI.createEndOfContractTerm(payload);
          showSuccess("เพิ่มข้อตกลงเรียบร้อยแล้ว");
        }
        setModalOpen(false);
        setActiveTerm(null);
        setModalMode("create");
        await loadTerms();
      } catch (error) {
        console.error("Failed to save end-of-contract term:", error);
        const message = error?.message || "ไม่สามารถบันทึกข้อตกลงได้";
        showError(message);
      } finally {
        setModalSaving(false);
      }
    },
    [activeTerm, loadTerms, modalMode, showError, showSuccess]
  );

  const handleDeleteTerm = useCallback(
    async (term) => {
      const result = await Swal.fire({
        title: "ยืนยันการลบข้อตกลง",
        text: term.content,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#dc2626",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "ลบ",
        cancelButtonText: "ยกเลิก",
      });

      if (!result.isConfirmed) {
        return;
      }

      try {
        await adminAPI.deleteEndOfContractTerm(term.eoc_id);
        showSuccess("ลบข้อตกลงแล้ว");
        await loadTerms();
      } catch (error) {
        console.error("Failed to delete end-of-contract term:", error);
        const message = error?.message || "ไม่สามารถลบข้อตกลงได้";
        showError(message);
      }
    },
    [loadTerms, showError, showSuccess]
  );

  const handleDragStart = useCallback((event, termId) => {
    setDraggingId(termId);
    if (event?.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      try {
        event.dataTransfer.setData("text/plain", String(termId));
      } catch (err) {
        // บราวเซอร์บางตัวอาจไม่รองรับ setData
      }
    }
  }, []);

  const handleDragOver = useCallback(
    (event, targetId) => {
      event.preventDefault();
      if (draggingId == null || draggingId === targetId) {
        return;
      }

      setTerms((prev) => {
        const list = normalizeTermList(prev);
        const fromIndex = list.findIndex((item) => item.eoc_id === draggingId);
        const toIndex = list.findIndex((item) => item.eoc_id === targetId);

        if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
          return prev;
        }

        const reordered = list.slice();
        const [moved] = reordered.splice(fromIndex, 1);
        reordered.splice(toIndex, 0, moved);

        return reordered.map((item, index) => ({
          ...item,
          display_order: index + 1,
        }));
      });

      if (event?.dataTransfer) {
        event.dataTransfer.dropEffect = "move";
      }
    },
    [draggingId]
  );

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
  }, []);

  const handleSaveOrder = useCallback(async () => {
    if (!orderDirty) {
      return;
    }

    const orderedIds = orderedTerms
      .map((item) => Number(item.eoc_id))
      .filter((id) => Number.isInteger(id) && id > 0);

    if (orderedIds.length !== orderedTerms.length) {
      showError("ข้อมูลการเรียงลำดับไม่ถูกต้อง กรุณารีเฟรชแล้วลองอีกครั้ง");
      await loadTerms();
      return;
    }

    setSavingOrder(true);
    try {
      await adminAPI.reorderEndOfContractTerms(orderedIds);
      showSuccess("บันทึกการเรียงลำดับเรียบร้อยแล้ว");
      await loadTerms();
    } catch (error) {
      console.error("Failed to save end-of-contract ordering:", error);
      if (error?.status === 404) {
        showError("ไม่พบข้อตกลงบางรายการ กรุณารีเฟรชแล้วลองอีกครั้ง");
        await loadTerms();
      } else {
        const message = error?.message || "ไม่สามารถบันทึกการเรียงลำดับได้";
        showError(message);
      }
    } finally {
      setSavingOrder(false);
    }
  }, [loadTerms, orderDirty, orderedTerms, showError, showSuccess]);

  const isRefreshDisabled = loading || savingOrder;
  const isSaveEnabled = orderDirty && orderedTerms.length > 0;
  const refreshButtonClasses = `inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
    isRefreshDisabled
      ? "border border-gray-200 bg-gray-50 text-gray-400 disabled:opacity-100"
      : "border border-green-200 text-green-600 hover:bg-green-50"
  } disabled:cursor-not-allowed`;
  const saveButtonClasses = `inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
    isSaveEnabled || savingOrder
      ? "border border-blue-200 text-blue-600 hover:bg-blue-50 disabled:opacity-70"
      : "border border-blue-200 text-blue-600 hover:bg-blue-50 disabled:opacity-70"
  } disabled:cursor-not-allowed`;
  const operationButtonBaseClasses =
    "inline-flex items-center gap-1 rounded-lg border px-3 py-1 text-xs font-medium transition focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60";
  const editOperationButtonClasses =
    `${operationButtonBaseClasses} border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-100 focus-visible:ring-offset-2`;
  const deleteOperationButtonClasses =
    `${operationButtonBaseClasses} border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-red-100 focus-visible:ring-offset-2`;

  const actionButtons = (
    <>
      <button
        type="button"
        onClick={loadTerms}
        disabled={isRefreshDisabled}
        className={refreshButtonClasses}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
        รีเฟรช
      </button>
      <button
        type="button"
        onClick={handleSaveOrder}
        disabled={!isSaveEnabled || savingOrder}
        className={saveButtonClasses}
      >
        {savingOrder ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {savingOrder ? "กำลังบันทึก" : "บันทึกการเรียงลำดับ"}
      </button>
      <button
        type="button"
        onClick={openCreateModal}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
      >
        <PlusCircle className="h-4 w-4" /> เพิ่มข้อตกลง
      </button>
    </>
  );

  return (
    <>
      <SettingsSectionCard
        icon={ListChecks}
        title="ข้อตกลงการรับเงินรางวัล"
        description="จัดการข้อความข้อตกลงที่จะแสดงก่อนส่งคำร้องและในไฟล์ตัวอย่าง"
        actions={actionButtons}
      >
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลดข้อตกลง...
            </div>
          ) : orderedTerms.length === 0 ? (
            <p className="text-sm text-gray-500">ยังไม่มีข้อตกลง กรุณาเพิ่มรายการใหม่</p>
          ) : (
            <div className="space-y-3">
              {orderedTerms.map((term, index) => (
                <div
                  key={term.eoc_id}
                  draggable={
                    orderedTerms.length > 1 && !loading && !savingOrder
                  }
                  onDragStart={(event) => handleDragStart(event, term.eoc_id)}
                  onDragOver={(event) => handleDragOver(event, term.eoc_id)}
                  onDragEnd={handleDragEnd}
                  className={`flex flex-col gap-3 rounded-lg border bg-white p-4 shadow-sm transition md:flex-row md:items-start md:justify-between ${
                    draggingId === term.eoc_id
                      ? "border-blue-200 ring-2 ring-blue-100"
                      : "border-gray-200 hover:shadow-md"
                  } ${
                    orderedTerms.length > 1 && !loading && !savingOrder
                      ? draggingId === term.eoc_id
                        ? "cursor-grabbing"
                        : "cursor-grab"
                      : ""
                  }`}
                >
                  <div className="md:flex-1">
                    <div className="text-xs font-semibold uppercase text-gray-500">ข้อที่ {index + 1}</div>
                    <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-gray-800">{term.content}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-dashed border-gray-300 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
                      <GripVertical className="h-4 w-4 text-gray-400" />
                      <span>ลากเพื่อจัดลำดับ</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => openEditModal(term)}
                      className={editOperationButtonClasses}
                      aria-label="แก้ไข"
                    >
                      <Pencil className="h-4 w-4" />
                      <span>แก้ไข</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTerm(term)}
                      className={deleteOperationButtonClasses}
                      aria-label="ลบ"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>ลบ</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SettingsSectionCard>

      <EndOfContractTermModal
        isOpen={modalOpen}
        mode={modalMode}
        initialData={activeTerm}
        onClose={closeModal}
        onSubmit={handleModalSubmit}
        saving={modalSaving}
      />
    </>
  );
};

export default EndOfContractManager;