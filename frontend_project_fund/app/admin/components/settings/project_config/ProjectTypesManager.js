"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Layers, PlusCircle, RefreshCcw, Save, Pencil, GripVertical } from "lucide-react";
import Swal from "sweetalert2";
import SettingsSectionCard from "@/app/admin/components/settings/common/SettingsSectionCard";
import SettingsModal from "@/app/admin/components/settings/common/SettingsModal";
import { adminAPI } from "@/app/lib/admin_api";

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 2800,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  },
});

const initialForm = { name_th: "", name_en: "" };

export default function ProjectTypesManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [orderDirty, setOrderDirty] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(() => new Set());

  const [form, setForm] = useState(initialForm);
  const [editingItem, setEditingItem] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const dragIdRef = useRef(null);
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  useEffect(() => {
    loadTypes();
  }, []);

  const loadTypes = async () => {
    setLoading(true);
    try {
      const list = await adminAPI.getProjectTypes();
      setItems(Array.isArray(list) ? list : []);
      setOrderDirty(false);
      setDragId(null);
      setDragOverId(null);
      dragIdRef.current = null;
      setToggleLoading(new Set());
    } catch (error) {
      console.error(error);
      Toast.fire({ icon: "error", title: "ไม่สามารถโหลดประเภทโครงการได้" });
    } finally {
      setLoading(false);
    }
  };

  const normalizedNames = useMemo(
    () => new Set(items.map((item) => (item?.name_th ?? "").trim().toLowerCase())),
    [items]
  );

  const handleOpenCreate = () => {
    setEditingItem(null);
    setForm(initialForm);
    setShowModal(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setForm({
      name_th: item?.name_th ?? "",
      name_en: item?.name_en ?? "",
    });
    setShowModal(true);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setForm(initialForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name_th.trim()) {
      Toast.fire({ icon: "warning", title: "กรุณาระบุชื่อภาษาไทย" });
      return;
    }

    const normalized = form.name_th.trim().toLowerCase();
    const editingId = editingItem?.type_id ?? null;
    const duplicate = items.some(
      (item) => item?.name_th?.trim().toLowerCase() === normalized && (item?.type_id ?? null) !== editingId
    );

    if (duplicate) {
      Toast.fire({ icon: "warning", title: "ชื่อประเภทโครงการซ้ำกัน" });
      return;
    }

    const payload = {
      name_th: form.name_th.trim(),
      name_en: form.name_en.trim(),
    };

    try {
      setSaving(true);
      if (editingItem) {
        await adminAPI.updateProjectType(editingItem.type_id, payload);
        Toast.fire({ icon: "success", title: "อัปเดตประเภทโครงการแล้ว" });
      } else {
        await adminAPI.createProjectType(payload);
        Toast.fire({ icon: "success", title: "เพิ่มประเภทโครงการเรียบร้อย" });
      }
      await loadTypes();
      handleCloseModal();
    } catch (error) {
      if (error?.status === 409) {
        Toast.fire({ icon: "warning", title: "ชื่อประเภทโครงการซ้ำกัน" });
      } else {
        console.error(error);
        Toast.fire({ icon: "error", title: error.message || "บันทึกประเภทไม่สำเร็จ" });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (item) => {
    const id = item.type_id ?? item.id;
    const next = !item.is_active;
    setToggleLoading((prev) => new Set(prev).add(id));
    try {
      await adminAPI.updateProjectType(id, { is_active: next });
      setItems((prev) =>
        prev.map((entry) =>
          (entry.type_id ?? entry.id) === id ? { ...entry, is_active: next } : entry
        )
      );
      Toast.fire({ icon: "success", title: next ? "เปิดใช้งานประเภทโครงการแล้ว" : "ปิดใช้งานประเภทโครงการแล้ว" });
    } catch (error) {
      console.error(error);
      Toast.fire({ icon: "error", title: error.message || "เปลี่ยนสถานะไม่สำเร็จ" });
    } finally {
      setToggleLoading((prev) => {
        const nextSet = new Set(prev);
        nextSet.delete(id);
        return nextSet;
      });
    }
  };

  const handleDragStart = (_event, item) => {
    const id = item.type_id ?? item.id;
    dragIdRef.current = id;
    setDragId(id);
  };

  const handleDragOver = (event, item) => {
    event.preventDefault();
    const overId = item.type_id ?? item.id;
    setDragOverId(overId);
    const draggingId = dragIdRef.current;
    if (!draggingId || draggingId === overId) {
      return;
    }

    setItems((prev) => {
      const updated = [...prev];
      const fromIndex = updated.findIndex((entry) => (entry.type_id ?? entry.id) === draggingId);
      const toIndex = updated.findIndex((entry) => (entry.type_id ?? entry.id) === overId);
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
        return prev;
      }
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated.map((entry, index) => ({ ...entry, display_order: index + 1 }));
    });

    setOrderDirty(true);
  };

  const handleDragEnd = () => {
    dragIdRef.current = null;
    setDragId(null);
    setDragOverId(null);
  };

  const handlePersistOrder = async () => {
    if (!items.length) {
      Toast.fire({ icon: "info", title: "ไม่มีข้อมูลให้บันทึกลำดับ" });
      return;
    }
    try {
      setSavingOrder(true);
      const payload = items.map((item) => item.type_id ?? item.id);
      await adminAPI.reorderProjectTypes(payload);
      setItems((prev) => prev.map((entry, index) => ({ ...entry, display_order: index + 1 })));
      setOrderDirty(false);
      Toast.fire({ icon: "success", title: "บันทึกลำดับประเภทโครงการแล้ว" });
    } catch (error) {
      console.error(error);
      Toast.fire({ icon: "error", title: error.message || "บันทึกลำดับประเภทไม่สำเร็จ" });
    } finally {
      setSavingOrder(false);
      handleDragEnd();
    }
  };

  const renderList = () => {
    if (loading) {
      return <div className="text-center text-gray-500">กำลังโหลดข้อมูล...</div>;
    }

    if (!items.length) {
      return (
        <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-500">
          ยังไม่มีประเภทโครงการ
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {items.map((item, index) => {
          const itemId = item.type_id ?? item.id ?? index;
          const isDragging = dragId === itemId;
          const isDragOver = dragOverId === itemId && dragId !== itemId;
          const isToggleLoading = toggleLoading.has(itemId);

          return (
            <div
              key={itemId}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                try {
                  event.dataTransfer.setData("text/plain", String(itemId));
                } catch (error) {
                  // ignore
                }
                handleDragStart(event, item);
              }}
              onDragOver={(event) => handleDragOver(event, item)}
              onDragEnd={handleDragEnd}
              onDrop={(event) => event.preventDefault()}
              className={`flex flex-wrap items-center justify-between gap-3 border rounded-lg px-4 py-3 transition-colors bg-white ${
                isDragging ? "ring-2 ring-blue-300 bg-blue-50" : "border-gray-200"
              } ${isDragOver ? "ring-2 ring-blue-200" : ""}`}
            >
              <div className="flex items-center gap-3 min-w-[220px]">
                <div className="flex items-center gap-2 text-gray-400 select-none cursor-grab" title="ลากเพื่อจัดลำดับ">
                  <GripVertical size={18} />
                  <span className="text-xs text-gray-500">#{index + 1}</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">
                    {item.name_th || "-"}
                    <span className="text-xs text-gray-400 ml-2">ID: {item.type_id ?? "-"}</span>
                  </div>
                  <div className="text-xs text-gray-500">{item.name_en || "ไม่มีชื่อภาษาอังกฤษ"}</div>
                </div>
              </div>
              <div className="flex items-center gap-4 flex-wrap justify-end text-sm text-gray-500">
                <span className="text-xs text-gray-500">ลำดับ: {index + 1}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(item)}
                    disabled={isToggleLoading || Boolean(dragId)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                      item.is_active ? "bg-emerald-500" : "bg-gray-300"
                    } ${isToggleLoading || dragId ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    title={item.is_active ? "ปิดการใช้งาน" : "เปิดการใช้งาน"}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                        item.is_active ? "translate-x-5" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <span className={`text-sm ${item.is_active ? "text-emerald-600" : "text-gray-400"}`}>
                    {item.is_active ? "เปิด" : "ปิด"}
                  </span>
                  {isToggleLoading ? <RefreshCcw size={16} className="animate-spin text-blue-500" /> : null}
                </div>
                <button
                  onClick={() => handleOpenEdit(item)}
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                >
                  <Pencil size={14} /> แก้ไข
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <SettingsSectionCard
        icon={Layers}
        iconBgClass="bg-purple-100"
        iconColorClass="text-purple-600"
        title="ประเภทโครงการ"
        description="สร้าง แก้ไข และจัดลำดับประเภทโครงการเพื่อใช้อ้างอิง"
        actions={
          <div className="flex items-center gap-3">
            {orderDirty ? <span className="text-xs text-amber-600">มีการเปลี่ยนลำดับที่ยังไม่บันทึก</span> : null}
            <button
              onClick={handlePersistOrder}
              disabled={!orderDirty || savingOrder || !items.length}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50"
            >
              {savingOrder ? (
                <>
                  <RefreshCcw size={16} className="animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Save size={16} />
                  บันทึกลำดับ
                </>
              )}
            </button>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
            >
              <PlusCircle size={16} /> เพิ่มประเภทโครงการ
            </button>
          </div>
        }
        contentClassName="space-y-4"
      >
        {renderList()}
      </SettingsSectionCard>

      <SettingsModal
        open={showModal}
        onClose={handleCloseModal}
        title={editingItem ? "แก้ไขประเภทโครงการ" : "เพิ่มประเภทโครงการ"}
        description="ระบุชื่อภาษาไทยและภาษาอังกฤษ (ถ้ามี)"
        footer={
          <>
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100"
              disabled={saving}
            >
              ยกเลิก
            </button>
            <button
              form="project-type-form"
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? <RefreshCcw size={16} className="animate-spin" /> : <PlusCircle size={16} />}
              {saving ? "กำลังบันทึก..." : editingItem ? "อัปเดตข้อมูล" : "บันทึกข้อมูล"}
            </button>
          </>
        }
      >
        <form id="project-type-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ (ภาษาไทย) *</label>
            <input
              type="text"
              name="name_th"
              value={form.name_th}
              onChange={handleFormChange}
              required
              className="w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
              placeholder="ระบุชื่อภาษาไทย"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ (ภาษาอังกฤษ)</label>
            <input
              type="text"
              name="name_en"
              value={form.name_en}
              onChange={handleFormChange}
              className="w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
              placeholder="ระบุชื่อภาษาอังกฤษ (ถ้ามี)"
            />
          </div>
        </form>
      </SettingsModal>
    </>
  );
}