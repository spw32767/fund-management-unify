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

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 2500,
  timerProgressBar: true,
});

const escapeHtml = (value) => {
  if (typeof value !== "string") {
    return "";
  }
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

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

  const handleAddTerm = useCallback(async () => {
    const { value } = await Swal.fire({
      title: "เพิ่มข้อตกลงใหม่",
      html: `
        <div class="text-left space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              รายละเอียดข้อตกลง <span class="text-red-500">*</span>
            </label>
            <textarea id="endOfContractContent" class="swal2-textarea" rows="4" placeholder="กรอกรายละเอียดข้อตกลง"></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              ลำดับที่ต้องการ (ปล่อยว่างเพื่อเพิ่มท้าย)
            </label>
            <input id="endOfContractDisplayOrder" type="number" min="1" class="swal2-input" placeholder="เช่น 1" />
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "บันทึก",
      cancelButtonText: "ยกเลิก",
      preConfirm: () => {
        const contentEl = document.getElementById("endOfContractContent");
        const orderEl = document.getElementById("endOfContractDisplayOrder");
        const content = (contentEl?.value || "").trim();
        const orderRaw = (orderEl?.value || "").trim();

        if (!content) {
          Swal.showValidationMessage("กรุณากรอกเนื้อหาข้อตกลง");
          return null;
        }

        if (orderRaw) {
          const orderValue = Number(orderRaw);
          if (!Number.isInteger(orderValue) || orderValue < 1) {
            Swal.showValidationMessage("ลำดับต้องเป็นจำนวนเต็มที่มากกว่า 0");
            return null;
          }
          return { content, display_order: orderValue };
        }

        return { content };
      },
    });

    if (!value) {
      return;
    }

    try {
      await adminAPI.createEndOfContractTerm(value);
      showSuccess("เพิ่มข้อตกลงเรียบร้อยแล้ว");
      await loadTerms();
    } catch (error) {
      console.error("Failed to create end-of-contract term:", error);
      const message = error?.message || "ไม่สามารถเพิ่มข้อตกลงได้";
      showError(message);
    }
  }, [loadTerms, showError, showSuccess]);

  const handleEditTerm = useCallback(
    async (term) => {
      const escapedContent = escapeHtml(term.content || "");
      const escapedOrder = escapeHtml(
        term.display_order != null ? String(term.display_order) : ""
      );

      const { value } = await Swal.fire({
        title: "แก้ไขข้อตกลง",
        html: `
          <div class="text-left space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                รายละเอียดข้อตกลง <span class="text-red-500">*</span>
              </label>
              <textarea id="endOfContractContent" class="swal2-textarea" rows="4">${escapedContent}</textarea>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                ลำดับที่ต้องการ (ปล่อยว่างเพื่อไม่เปลี่ยน)
              </label>
              <input id="endOfContractDisplayOrder" type="number" min="1" class="swal2-input" placeholder="เช่น 1" value="${escapedOrder}" />
            </div>
          </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: "บันทึก",
        cancelButtonText: "ยกเลิก",
        preConfirm: () => {
          const contentEl = document.getElementById("endOfContractContent");
          const orderEl = document.getElementById("endOfContractDisplayOrder");
          const content = (contentEl?.value || "").trim();
          const orderRaw = (orderEl?.value || "").trim();

          if (!content) {
            Swal.showValidationMessage("กรุณากรอกเนื้อหาข้อตกลง");
            return null;
          }

          const payload = { content };
          if (orderRaw) {
            const orderValue = Number(orderRaw);
            if (!Number.isInteger(orderValue) || orderValue < 1) {
              Swal.showValidationMessage("ลำดับต้องเป็นจำนวนเต็มที่มากกว่า 0");
              return null;
            }
            payload.display_order = orderValue;
          }

          return payload;
        },
      });

      if (!value) {
        return;
      }

      try {
        await adminAPI.updateEndOfContractTerm(term.eoc_id, value);
        showSuccess("บันทึกข้อตกลงเรียบร้อยแล้ว");
        await loadTerms();
      } catch (error) {
        console.error("Failed to update end-of-contract term:", error);
        const message = error?.message || "ไม่สามารถบันทึกข้อตกลงได้";
        showError(message);
      }
    },
    [loadTerms, showError, showSuccess]
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

    const orderedIds = orderedTerms.map((item) => item.eoc_id);
    if (orderedIds.length === 0) {
      setOrderDirty(false);
      return;
    }

    setSavingOrder(true);
    try {
      await adminAPI.reorderEndOfContractTerms(orderedIds);
      showSuccess("บันทึกการเรียงลำดับเรียบร้อยแล้ว");
      await loadTerms();
    } catch (error) {
      console.error("Failed to save end-of-contract ordering:", error);
      const message = error?.message || "ไม่สามารถบันทึกการเรียงลำดับได้";
      showError(message);
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
        onClick={handleAddTerm}
        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        <PlusCircle className="h-4 w-4" /> เพิ่มข้อตกลง
      </button>
    </>
  );

  return (
    <SettingsSectionCard
      icon={ListChecks}
      title="เงื่อนไข/ข้อตกลงการรับเงินรางวัล"
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
                className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm md:flex-row md:items-start md:justify-between"
              >
                <div className="md:flex-1">
                  <div className="text-xs font-semibold uppercase text-gray-500">ข้อที่ {index + 1}</div>
                  <p className="mt-1 text-sm leading-relaxed text-gray-800 whitespace-pre-line">{term.content}</p>
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
                    onClick={() => handleEditTerm(term)}
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
  );
};

export default EndOfContractManager;

