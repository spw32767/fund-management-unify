"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ListChecks,
  PlusCircle,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  RefreshCcw,
  Save,
  Loader2,
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

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [activeTerm, setActiveTerm] = useState(null);
  const [modalSaving, setModalSaving] = useState(false);

  const orderedTerms = useMemo(() => {
    return normalizeTermList(terms);
  }, [terms]);

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
      setTerms(normalizeTermList(response));
      setOrderDirty(false);
    } catch (error) {
      console.error("Failed to load end-of-contract terms:", error);
      showError("ไม่สามารถโหลดข้อตกลงได้");
    } finally {
      setLoading(false);
    }
  }, [showError]);

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

  const handleMoveTerm = useCallback((termId, direction) => {
    setTerms((prev) => {
      const list = normalizeTermList(prev);
      const currentIndex = list.findIndex((item) => item.eoc_id === termId);
      if (currentIndex === -1) {
        return prev;
      }

      const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= list.length) {
        return prev;
      }

      const newList = list.slice();
      const [moved] = newList.splice(currentIndex, 1);
      newList.splice(targetIndex, 0, moved);

      const resequenced = newList.map((item, index) => ({
        ...item,
        display_order: index + 1,
      }));

      setOrderDirty(true);
      return resequenced;
    });
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

  const actionButtons = (
    <>
      {orderDirty ? (
        <button
          type="button"
          onClick={handleSaveOrder}
          disabled={savingOrder || orderedTerms.length === 0}
          className="inline-flex items-center gap-2 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {savingOrder ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {savingOrder ? "กำลังบันทึก" : "บันทึกการเรียงลำดับ"}
        </button>
      ) : null}
      <button
        type="button"
        onClick={loadTerms}
        disabled={loading || savingOrder}
        className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RefreshCcw className="h-4 w-4" /> รีเฟรช
      </button>
      <button
        type="button"
        onClick={openCreateModal}
        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
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
                  className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md md:flex-row md:items-start md:justify-between"
                >
                  <div className="md:flex-1">
                    <div className="text-xs font-semibold uppercase text-gray-500">ข้อที่ {index + 1}</div>
                    <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-gray-800">{term.content}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleMoveTerm(term.eoc_id, "up")}
                      disabled={index === 0 || loading || savingOrder}
                      className="inline-flex items-center justify-center rounded-md border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="เลื่อนขึ้น"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveTerm(term.eoc_id, "down")}
                      disabled={index === orderedTerms.length - 1 || loading || savingOrder}
                      className="inline-flex items-center justify-center rounded-md border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="เลื่อนลง"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(term)}
                      className="inline-flex items-center justify-center rounded-md border border-gray-200 p-2 text-gray-600 hover:bg-gray-50"
                      aria-label="แก้ไข"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTerm(term)}
                      className="inline-flex items-center justify-center rounded-md border border-red-200 p-2 text-red-600 hover:bg-red-50"
                      aria-label="ลบ"
                    >
                      <Trash2 className="h-4 w-4" />
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