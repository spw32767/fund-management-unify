"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Briefcase,
  Layers,
  Wallet,
  Plus,
  Pencil,
  Trash2,
  RefreshCcw,
  CalendarDays,
  Users,
  FileText,
  Paperclip,
  GripVertical,
  Save,
} from "lucide-react";
import Swal from "sweetalert2";
import PageLayout from "@/app/admin/components/common/PageLayout";
import adminAPI from "@/app/lib/admin_api";

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

const normalizeText = (value) =>
  (value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const initialProjectForm = {
  project_name: "",
  type_id: "",
  event_date: "",
  plan_id: "",
  budget_amount: "",
  participants: "",
  notes: "",
  attachment: null,
};

const initialTypeForm = {
  name_th: "",
  name_en: "",
};

const initialPlanForm = {
  name_th: "",
  name_en: "",
};

function formatCurrency(value) {
  const number = Number(value || 0);
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 2,
  }).format(number);
}

function formatDate(dateString) {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch (error) {
    return dateString;
  }
}

function ProjectsTable({ projects, onEdit, onDelete }) {
  if (!projects.length) {
    return (
      <div className="border border-dashed border-gray-300 rounded-lg p-10 text-center text-gray-500 bg-white">
        ยังไม่มีข้อมูลโครงการ
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white shadow-sm rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">ชื่อโครงการ</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">ประเภท</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">วันที่จัด</th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">งบประมาณ</th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">ผู้เข้าร่วม</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">หมายเหตุ</th>
            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">จัดการ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
          {projects.map((project) => (
            <tr key={project.project_id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3">
                <div className="font-semibold text-gray-900">{project.project_name}</div>
                <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                  <Wallet size={14} className="text-gray-400" />
                  {project.budget_plan?.name_th || project.budget_plan?.name_en || "-"}
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-1 text-gray-700">
                  <Layers size={15} className="text-blue-500" />
                  {project.type?.name_th || project.type?.name_en || "-"}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-1">
                  <CalendarDays size={15} className="text-amber-500" />
                  {formatDate(project.event_date)}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-medium text-gray-900">
                {formatCurrency(project.budget_amount)}
              </td>
              <td className="px-4 py-3 text-right">
                <span className="inline-flex items-center gap-1 justify-end">
                  <Users size={15} className="text-emerald-500" />
                  {typeof project.participants === "number"
                    ? project.participants.toLocaleString("th-TH")
                    : project.participants || "-"}
                </span>
              </td>
              <td className="px-4 py-3">
                {project.notes ? (
                  <span className="text-gray-600 line-clamp-2">{project.notes}</span>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td className="px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => onEdit(project)}
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                  >
                    <Pencil size={16} />
                    แก้ไข
                  </button>
                  <button
                    onClick={() => onDelete(project)}
                    className="inline-flex items-center gap-1 text-red-600 hover:text-red-700"
                  >
                    <Trash2 size={16} />
                    ลบ
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProjectForm({
  open,
  formData,
  types,
  plans,
  onClose,
  onChange,
  onFileChange,
  onClearAttachment,
  onSubmit,
  saving,
  isEditing,
  fileInputKey,
  attachmentFile,
  existingAttachment,
}) {
  if (!open) return null;

  const disableTypeSelect = types.length === 0;
  const disablePlanSelect = plans.length === 0;
  const selectedTypeInactive =
    isEditing &&
    formData.type_id &&
    types.some(
      (type) =>
        type.type_id === Number(formData.type_id) && type.is_active === false
    );
  const selectedPlanInactive =
    isEditing &&
    formData.plan_id &&
    plans.some(
      (plan) =>
        plan.plan_id === Number(formData.plan_id) && plan.is_active === false
    );

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {isEditing ? "แก้ไขโครงการ" : "เพิ่มโครงการใหม่"}
          </h3>
          <p className="text-sm text-gray-500">
            กรอกข้อมูลให้ครบถ้วนตามฟิลด์ที่กำหนดไว้
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <RefreshCcw size={16} />
          ยกเลิก
        </button>
      </div>

      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ชื่อโครงการ
          </label>
          <input
            type="text"
            name="project_name"
            value={formData.project_name}
            onChange={onChange}
            required
            className="w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
            placeholder="ระบุชื่อโครงการ"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ประเภทโครงการ
          </label>
          <select
            name="type_id"
            value={formData.type_id}
            onChange={onChange}
            required
            disabled={disableTypeSelect}
            className={`w-full rounded-md border focus:border-blue-500 focus:ring-blue-500 px-3 py-2 ${
              disableTypeSelect
                ? "bg-gray-100 cursor-not-allowed border-gray-200"
                : "border-gray-300"
            }`}
          >
            <option value="">-- เลือกประเภท --</option>
            {types.map((type) => (
              <option key={type.type_id} value={type.type_id}>
                {type.name_th || type.name_en}
                {type.is_active ? "" : " (ปิดใช้งาน)"}
              </option>
            ))}
          </select>
          {disableTypeSelect ? (
            <p className="mt-2 text-xs text-red-500">
              ไม่มีประเภทโครงการที่เปิดใช้งาน กรุณาเปิดใช้งานก่อนบันทึกโครงการ
            </p>
          ) : null}
          {selectedTypeInactive ? (
            <p className="mt-2 text-xs text-amber-500">
              ประเภทที่เลือกถูกปิดใช้งานอยู่ หากต้องการเปลี่ยนกรุณาเลือกประเภทที่เปิดใช้งาน
            </p>
          ) : null}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            วันที่จัดกิจกรรม
          </label>
          <input
            type="date"
            name="event_date"
            value={formData.event_date}
            onChange={onChange}
            required
            className="w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            แผนงบประมาณ
          </label>
          <select
            name="plan_id"
            value={formData.plan_id}
            onChange={onChange}
            required
            disabled={disablePlanSelect}
            className={`w-full rounded-md border focus:border-blue-500 focus:ring-blue-500 px-3 py-2 ${
              disablePlanSelect
                ? "bg-gray-100 cursor-not-allowed border-gray-200"
                : "border-gray-300"
            }`}
          >
            <option value="">-- เลือกแผนงบประมาณ --</option>
            {plans.map((plan) => (
              <option key={plan.plan_id} value={plan.plan_id}>
                {plan.name_th || plan.name_en}
                {plan.is_active ? "" : " (ปิดใช้งาน)"}
              </option>
            ))}
          </select>
          {disablePlanSelect ? (
            <p className="mt-2 text-xs text-red-500">
              ไม่มีแผนงบประมาณที่เปิดใช้งาน กรุณาเปิดใช้งานก่อนบันทึกโครงการ
            </p>
          ) : null}
          {selectedPlanInactive ? (
            <p className="mt-2 text-xs text-amber-500">
              แผนงบประมาณที่เลือกถูกปิดใช้งานอยู่ หากต้องการเปลี่ยนกรุณาเลือกแผนที่เปิดใช้งาน
            </p>
          ) : null}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            งบประมาณ (บาท)
          </label>
          <input
            type="number"
            name="budget_amount"
            value={formData.budget_amount}
            onChange={onChange}
            min="0"
            step="0.01"
            required
            className="w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
            placeholder="เช่น 50000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            จำนวนผู้เข้าร่วม (คน)
          </label>
          <input
            type="number"
            name="participants"
            value={formData.participants}
            onChange={onChange}
            min="0"
            className="w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
            placeholder="เช่น 120"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ไฟล์แนบโครงการ (สูงสุด 1 ไฟล์)
          </label>
          <input
            key={fileInputKey}
            type="file"
            name="attachment"
            onChange={onFileChange}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
            disabled={saving}
            className="block w-full rounded-md border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:ring-blue-500 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-600 hover:file:bg-blue-100 disabled:cursor-not-allowed"
          />
          {attachmentFile ? (
            <div className="mt-3 flex items-center justify-between rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">
              <span className="flex items-center gap-2">
                <Paperclip size={16} />
                {attachmentFile.name}
              </span>
              <button
                type="button"
                onClick={onClearAttachment}
                disabled={saving}
                className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                ล้างไฟล์
              </button>
            </div>
          ) : existingAttachment ? (
            <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Paperclip size={16} className="text-gray-400" />
                <span>
                  ไฟล์ที่บันทึกล่าสุด: {existingAttachment.original_name || existingAttachment.stored_path}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                การเลือกไฟล์ใหม่จะทับไฟล์เดิมโดยอัตโนมัติ
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-gray-400">ยังไม่ได้เลือกไฟล์แนบ</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            หมายเหตุ / รายละเอียดเพิ่มเติม
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={onChange}
            rows={3}
            className="w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
            placeholder="ข้อมูลเพิ่มเติมที่ต้องการบันทึก"
          />
        </div>

        <div className="md:col-span-2 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <RefreshCcw size={16} className="animate-spin" />
                บันทึกข้อมูล...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Plus size={16} />
                {isEditing ? "อัปเดตข้อมูล" : "บันทึกโครงการ"}
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function ConfigList({
  title,
  description,
  icon: Icon,
  items,
  form,
  onFormChange,
  onSubmit,
  onCancel,
  editingItem,
  onEdit,
  onToggleActive,
  saving,
  emptyText,
  disableDeleteNotice,
  draggingId,
  dragOverId,
  onDragStart,
  onDragOver,
  onDragEnd,
  orderDirty,
  onPersistOrder,
  savingOrder,
  toggleLoadingIds,
  isReordering,
}) {
  const highlightInputs = Boolean(editingItem);
  const inputBaseClass =
    "w-full rounded-md border border-gray-300 focus:border-blue-500 focus:ring-blue-500 px-3 py-2 transition";
  const highlightClass = highlightInputs
    ? "border-blue-400 bg-blue-50 ring-2 ring-blue-200"
    : "";
  const editingItemId =
    editingItem?.type_id ?? editingItem?.plan_id ?? editingItem?.id ?? null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Icon size={20} className="text-blue-600" />
            {title}
          </h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
        {onPersistOrder && (
          <div className="flex items-center gap-3">
            {orderDirty && !savingOrder ? (
              <span className="text-xs text-amber-600">
                มีการเปลี่ยนลำดับที่ยังไม่บันทึก
              </span>
            ) : null}
            <button
              type="button"
              onClick={onPersistOrder}
              disabled={!orderDirty || savingOrder || items.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-blue-200 bg-white text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ชื่อ (ภาษาไทย)
          </label>
          <input
            type="text"
            name="name_th"
            value={form.name_th}
            onChange={onFormChange}
            required
            className={`${inputBaseClass} ${highlightClass}`}
            placeholder="ระบุชื่อภาษาไทย"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ชื่อ (ภาษาอังกฤษ)
          </label>
          <input
            type="text"
            name="name_en"
            value={form.name_en}
            onChange={onFormChange}
            className={`${inputBaseClass} ${highlightClass}`}
            placeholder="ระบุชื่อภาษาอังกฤษ (ถ้ามี)"
          />
        </div>
        {editingItem ? (
          <div className="md:col-span-4 flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
            <Pencil size={16} className="text-blue-500" />
            <span>
              กำลังแก้ไข: {editingItem.name_th || editingItem.name_en || `ID ${editingItemId}`}
            </span>
          </div>
        ) : null}
        <div className="md:col-span-4 flex justify-end gap-3">
          {editingItem && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100"
            >
              ยกเลิกการแก้ไข
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
          >
            {saving ? (
              <>
                <RefreshCcw size={16} className="animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              <>
                <Plus size={16} />
                {editingItem ? "อัปเดตข้อมูล" : "บันทึกข้อมูล"}
              </>
            )}
          </button>
        </div>
      </form>

      {disableDeleteNotice && (
        <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
          ไม่สามารถลบข้อมูลชุดนี้ได้ เพื่อรักษาลำดับรหัสให้ต่อเนื่อง
        </div>
      )}

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-500">
            {emptyText}
          </div>
        ) : (
          items.map((item, index) => {
            const itemId = item.type_id ?? item.plan_id ?? item.id ?? index;
            const isDragging = draggingId === itemId;
            const isDragOver = dragOverId === itemId && draggingId !== itemId;
            const isEditingItem = editingItemId === itemId;
            const isToggleLoading = toggleLoadingIds?.has?.(itemId);
            const toggleDisabled =
              !onToggleActive || isReordering || isToggleLoading;

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
                  onDragStart?.(event, item);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  onDragOver?.(event, item);
                }}
                onDragEnd={(event) => onDragEnd?.(event)}
                onDrop={(event) => event.preventDefault()}
                className={`flex flex-wrap items-center justify-between gap-3 border rounded-lg px-4 py-3 transition-colors bg-white ${
                  isDragging ? "ring-2 ring-blue-300 bg-blue-50" : "border-gray-200"
                } ${isDragOver ? "ring-2 ring-blue-200" : ""} ${
                  isEditingItem ? "border-blue-300" : ""
                }`}
              >
                <div className="flex items-center gap-3 min-w-[220px]">
                  <div
                    className="flex items-center gap-2 text-gray-400 select-none cursor-grab"
                    title="ลากเพื่อจัดลำดับ"
                  >
                    <GripVertical size={18} />
                    <span className="text-xs text-gray-500">#{index + 1}</span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      {item.name_th || "-"}
                      <span className="text-xs text-gray-400 ml-2">
                        ID: {item.type_id ?? item.plan_id ?? "-"}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {item.name_en || "ไม่มีชื่อภาษาอังกฤษ"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-wrap justify-end text-sm text-gray-500">
                  <span className="text-xs text-gray-500">ลำดับ: {index + 1}</span>
                  {onToggleActive && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onToggleActive(item)}
                        disabled={toggleDisabled}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                          item.is_active ? "bg-emerald-500" : "bg-gray-300"
                        } ${
                          toggleDisabled
                            ? "opacity-50 cursor-not-allowed"
                            : "cursor-pointer"
                        }`}
                        title={item.is_active ? "ปิดการใช้งาน" : "เปิดการใช้งาน"}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                            item.is_active ? "translate-x-5" : "translate-x-1"
                          }`}
                        />
                      </button>
                      <span
                        className={`text-sm ${
                          item.is_active ? "text-emerald-600" : "text-gray-400"
                        }`}
                      >
                        {item.is_active ? "เปิด" : "ปิด"}
                      </span>
                      {isToggleLoading ? (
                        <RefreshCcw
                          size={16}
                          className="animate-spin text-blue-500"
                        />
                      ) : null}
                    </div>
                  )}
                  <button
                    onClick={() => onEdit(item)}
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                  >
                    <Pencil size={14} /> แก้ไข
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function ProjectsContent() {
  const [activeTab, setActiveTab] = useState("projects");
  const [loading, setLoading] = useState(true);
  const [savingProject, setSavingProject] = useState(false);
  const [savingType, setSavingType] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);

  const [projects, setProjects] = useState([]);
  const [projectTypes, setProjectTypes] = useState([]);
  const [budgetPlans, setBudgetPlans] = useState([]);

  const [projectForm, setProjectForm] = useState(() => ({
    ...initialProjectForm,
  }));
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [projectFileKey, setProjectFileKey] = useState(0);

  const [typeForm, setTypeForm] = useState(initialTypeForm);
  const [editingType, setEditingType] = useState(null);

  const [planForm, setPlanForm] = useState(initialPlanForm);
  const [editingPlan, setEditingPlan] = useState(null);

  const typeDragIdRef = useRef(null);
  const planDragIdRef = useRef(null);

  const [typeDragId, setTypeDragId] = useState(null);
  const [typeDragOverId, setTypeDragOverId] = useState(null);
  const [planDragId, setPlanDragId] = useState(null);
  const [planDragOverId, setPlanDragOverId] = useState(null);
  const [typeOrderDirty, setTypeOrderDirty] = useState(false);
  const [planOrderDirty, setPlanOrderDirty] = useState(false);
  const [savingTypeOrder, setSavingTypeOrder] = useState(false);
  const [savingPlanOrder, setSavingPlanOrder] = useState(false);
  const [typeToggleLoading, setTypeToggleLoading] = useState(() => new Set());
  const [planToggleLoading, setPlanToggleLoading] = useState(() => new Set());

  const projectTypeOptions = useMemo(() => {
    const selectedTypeId = editingProject?.type_id;
    return projectTypes.filter((type) =>
      type.is_active || type.type_id === selectedTypeId
    );
  }, [projectTypes, editingProject]);

  const budgetPlanOptions = useMemo(() => {
    const selectedPlanId = editingProject?.plan_id;
    return budgetPlans.filter((plan) =>
      plan.is_active || plan.plan_id === selectedPlanId
    );
  }, [budgetPlans, editingProject]);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [projectList, typeList, planList] = await Promise.all([
        adminAPI.getProjects(),
        adminAPI.getProjectTypes(),
        adminAPI.getProjectBudgetPlans(),
      ]);
      setProjects(projectList);
      setProjectTypes(typeList);
      setBudgetPlans(planList);
      setTypeOrderDirty(false);
      setPlanOrderDirty(false);
      setTypeDragId(null);
      setTypeDragOverId(null);
      setPlanDragId(null);
      setPlanDragOverId(null);
      typeDragIdRef.current = null;
      planDragIdRef.current = null;
      setTypeToggleLoading(new Set());
      setPlanToggleLoading(new Set());
    } catch (error) {
      console.error(error);
      Toast.fire({ icon: "error", title: "ไม่สามารถโหลดข้อมูลได้" });
    } finally {
      setLoading(false);
    }
  };

  const resetProjectForm = () => {
    setProjectForm({ ...initialProjectForm });
    setEditingProject(null);
    setShowProjectForm(false);
    setProjectFileKey((key) => key + 1);
  };

  const handleProjectChange = (event) => {
    const { name, value } = event.target;
    setProjectForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProjectFileChange = (event) => {
    const file = event.target?.files?.[0] ?? null;
    setProjectForm((prev) => ({
      ...prev,
      attachment: file,
    }));
  };

  const handleClearProjectAttachment = () => {
    setProjectForm((prev) => ({
      ...prev,
      attachment: null,
    }));
    setProjectFileKey((key) => key + 1);
  };

  const handleSubmitProject = async (event) => {
    event.preventDefault();
    if (!projectForm.project_name || !projectForm.type_id || !projectForm.plan_id || !projectForm.event_date) {
      Toast.fire({ icon: "warning", title: "กรุณากรอกข้อมูลให้ครบถ้วน" });
      return;
    }

    const normalizedProjectName = normalizeText(projectForm.project_name);
    const projectId = editingProject?.project_id ?? null;
    const duplicateProject = projects.some(
      (project) =>
        normalizeText(project.project_name) === normalizedProjectName &&
        (project.project_id ?? null) !== projectId
    );

    if (duplicateProject) {
      Toast.fire({ icon: "warning", title: "ชื่อโครงการซ้ำกัน" });
      return;
    }

    if (!editingProject && !projectForm.attachment) {
      Toast.fire({ icon: "warning", title: "กรุณาเลือกไฟล์แนบ" });
      return;
    }

    const typeId = Number(projectForm.type_id);
    const planId = Number(projectForm.plan_id);
    const participantsValue = projectForm.participants
      ? Number(projectForm.participants)
      : 0;
    const budgetValue = Number(projectForm.budget_amount) || 0;

    if (Number.isNaN(typeId) || Number.isNaN(planId)) {
      Toast.fire({ icon: "warning", title: "การเลือกประเภทหรือแผนงบประมาณไม่ถูกต้อง" });
      return;
    }

    if (budgetValue < 0) {
      Toast.fire({ icon: "warning", title: "งบประมาณต้องมากกว่าหรือเท่ากับ 0" });
      return;
    }

    if (participantsValue < 0) {
      Toast.fire({ icon: "warning", title: "จำนวนผู้เข้าร่วมต้องมากกว่าหรือเท่ากับ 0" });
      return;
    }

    const formPayload = new FormData();
    formPayload.append("project_name", projectForm.project_name.trim());
    formPayload.append("type_id", typeId.toString());
    formPayload.append("event_date", projectForm.event_date);
    formPayload.append("plan_id", planId.toString());
    formPayload.append("budget_amount", budgetValue.toString());
    formPayload.append("participants", participantsValue.toString());
    formPayload.append("notes", projectForm.notes ? projectForm.notes.trim() : "");

    if (projectForm.attachment) {
      formPayload.append("attachment", projectForm.attachment);
    }

    try {
      setSavingProject(true);
      if (editingProject) {
        await adminAPI.updateProject(editingProject.project_id, formPayload);
        Toast.fire({ icon: "success", title: "อัปเดตข้อมูลโครงการเรียบร้อย" });
      } else {
        await adminAPI.createProject(formPayload);
        Toast.fire({ icon: "success", title: "บันทึกโครงการใหม่เรียบร้อย" });
      }
      await loadAll();
      resetProjectForm();
    } catch (error) {
      if (error?.status === 409) {
        Toast.fire({ icon: "warning", title: "ชื่อโครงการซ้ำกัน" });
      } else {
        console.error(error);
        Toast.fire({ icon: "error", title: error.message || "บันทึกข้อมูลไม่สำเร็จ" });
      }
    } finally {
      setSavingProject(false);
    }
  };

  const handleEditProject = (project) => {
    setEditingProject(project);
    setProjectForm({
      project_name: project.project_name || "",
      type_id: project.type_id?.toString() || "",
      event_date: project.event_date || "",
      plan_id: project.plan_id?.toString() || "",
      budget_amount: project.budget_amount?.toString() || "",
      participants: project.participants?.toString() || "",
      notes: project.notes || "",
      attachment: null,
    });
    setProjectFileKey((key) => key + 1);
    setShowProjectForm(true);
  };

  const handleDeleteProject = async (project) => {
    const result = await Swal.fire({
      title: "ยืนยันการลบ",
      text: `ต้องการลบโครงการ "${project.project_name}" หรือไม่?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "ลบข้อมูล",
      cancelButtonText: "ยกเลิก",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      await adminAPI.deleteProject(project.project_id);
      Toast.fire({ icon: "success", title: "ลบโครงการเรียบร้อย" });
      await loadAll();
    } catch (error) {
      console.error(error);
      Toast.fire({ icon: "error", title: error.message || "ไม่สามารถลบโครงการได้" });
    }
  };

  const handleTypeFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    setTypeForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handlePlanFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    setPlanForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const submitTypeForm = async (event) => {
    event.preventDefault();
    if (!typeForm.name_th) {
      Toast.fire({ icon: "warning", title: "กรุณาระบุชื่อภาษาไทย" });
      return;
    }

    const normalizedThaiName = normalizeText(typeForm.name_th);
    const editingId = editingType?.type_id ?? null;
    const duplicateType = projectTypes.some(
      (item) =>
        normalizeText(item.name_th) === normalizedThaiName &&
        (item.type_id ?? null) !== editingId
    );

    if (duplicateType) {
      Toast.fire({ icon: "warning", title: "ชื่อประเภทโครงการซ้ำกัน" });
      return;
    }

    const payload = {
      name_th: typeForm.name_th.trim(),
      name_en: typeForm.name_en.trim(),
    };

    try {
      setSavingType(true);
      if (editingType) {
        await adminAPI.updateProjectType(editingType.type_id, payload);
        Toast.fire({ icon: "success", title: "อัปเดตประเภทโครงการแล้ว" });
      } else {
        await adminAPI.createProjectType(payload);
        Toast.fire({ icon: "success", title: "เพิ่มประเภทโครงการเรียบร้อย" });
      }
      await loadAll();
      setTypeForm(initialTypeForm);
      setEditingType(null);
    } catch (error) {
      if (error?.status === 409) {
        Toast.fire({ icon: "warning", title: "ชื่อประเภทโครงการซ้ำกัน" });
      } else {
        console.error(error);
        Toast.fire({ icon: "error", title: error.message || "บันทึกประเภทไม่สำเร็จ" });
      }
    } finally {
      setSavingType(false);
    }
  };

  const submitPlanForm = async (event) => {
    event.preventDefault();
    if (!planForm.name_th) {
      Toast.fire({ icon: "warning", title: "กรุณาระบุชื่อภาษาไทย" });
      return;
    }

    const normalizedThaiName = normalizeText(planForm.name_th);
    const editingId = editingPlan?.plan_id ?? null;
    const duplicatePlan = budgetPlans.some(
      (item) =>
        normalizeText(item.name_th) === normalizedThaiName &&
        (item.plan_id ?? null) !== editingId
    );

    if (duplicatePlan) {
      Toast.fire({ icon: "warning", title: "ชื่อแผนงบประมาณซ้ำกัน" });
      return;
    }

    const payload = {
      name_th: planForm.name_th.trim(),
      name_en: planForm.name_en.trim(),
    };

    try {
      setSavingPlan(true);
      if (editingPlan) {
        await adminAPI.updateProjectBudgetPlan(editingPlan.plan_id, payload);
        Toast.fire({ icon: "success", title: "อัปเดตแผนงบประมาณแล้ว" });
      } else {
        await adminAPI.createProjectBudgetPlan(payload);
        Toast.fire({ icon: "success", title: "เพิ่มแผนงบประมาณเรียบร้อย" });
      }
      await loadAll();
      setPlanForm(initialPlanForm);
      setEditingPlan(null);
    } catch (error) {
      if (error?.status === 409) {
        Toast.fire({ icon: "warning", title: "ชื่อแผนงบประมาณซ้ำกัน" });
      } else {
        console.error(error);
        Toast.fire({ icon: "error", title: error.message || "บันทึกแผนงบประมาณไม่สำเร็จ" });
      }
    } finally {
      setSavingPlan(false);
    }
  };

  const updateToggleLoadingSet = (setter, id, shouldAdd) => {
    setter((prev) => {
      const next = new Set(prev);
      if (shouldAdd) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleTypeDragStart = (_event, item) => {
    const id = item.type_id ?? item.id;
    typeDragIdRef.current = id;
    setTypeDragId(id);
  };

  const handleTypeDragOver = (_event, item) => {
    const overId = item.type_id ?? item.id;
    setTypeDragOverId(overId);
    const draggingId = typeDragIdRef.current;
    if (!draggingId || draggingId === overId) {
      return;
    }

    setProjectTypes((prev) => {
      const updated = [...prev];
      const fromIndex = updated.findIndex(
        (entry) => (entry.type_id ?? entry.id) === draggingId
      );
      const toIndex = updated.findIndex(
        (entry) => (entry.type_id ?? entry.id) === overId
      );
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
        return prev;
      }

      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated.map((entry, index) => ({
        ...entry,
        display_order: index + 1,
      }));
    });

    setTypeOrderDirty(true);
  };

  const handleTypeDragEnd = () => {
    typeDragIdRef.current = null;
    setTypeDragId(null);
    setTypeDragOverId(null);
  };

  const handlePlanDragStart = (_event, item) => {
    const id = item.plan_id ?? item.id;
    planDragIdRef.current = id;
    setPlanDragId(id);
  };

  const handlePlanDragOver = (_event, item) => {
    const overId = item.plan_id ?? item.id;
    setPlanDragOverId(overId);
    const draggingId = planDragIdRef.current;
    if (!draggingId || draggingId === overId) {
      return;
    }

    setBudgetPlans((prev) => {
      const updated = [...prev];
      const fromIndex = updated.findIndex(
        (entry) => (entry.plan_id ?? entry.id) === draggingId
      );
      const toIndex = updated.findIndex(
        (entry) => (entry.plan_id ?? entry.id) === overId
      );
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
        return prev;
      }

      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated.map((entry, index) => ({
        ...entry,
        display_order: index + 1,
      }));
    });

    setPlanOrderDirty(true);
  };

  const handlePlanDragEnd = () => {
    planDragIdRef.current = null;
    setPlanDragId(null);
    setPlanDragOverId(null);
  };

  const persistTypeOrder = async () => {
    if (!projectTypes.length) {
      Toast.fire({ icon: "info", title: "ไม่มีข้อมูลให้บันทึกลำดับ" });
      return;
    }
    try {
      setSavingTypeOrder(true);
      const orderPayload = projectTypes.map((item) => item.type_id);
      await adminAPI.reorderProjectTypes(orderPayload);
      setProjectTypes((prev) =>
        prev.map((entry, index) => ({
          ...entry,
          display_order: index + 1,
        }))
      );
      setTypeOrderDirty(false);
      Toast.fire({ icon: "success", title: "บันทึกลำดับประเภทโครงการแล้ว" });
    } catch (error) {
      console.error(error);
      Toast.fire({ icon: "error", title: error.message || "บันทึกลำดับประเภทไม่สำเร็จ" });
    } finally {
      setSavingTypeOrder(false);
      handleTypeDragEnd();
    }
  };

  const persistPlanOrder = async () => {
    if (!budgetPlans.length) {
      Toast.fire({ icon: "info", title: "ไม่มีข้อมูลให้บันทึกลำดับ" });
      return;
    }
    try {
      setSavingPlanOrder(true);
      const orderPayload = budgetPlans.map((item) => item.plan_id);
      await adminAPI.reorderProjectBudgetPlans(orderPayload);
      setBudgetPlans((prev) =>
        prev.map((entry, index) => ({
          ...entry,
          display_order: index + 1,
        }))
      );
      setPlanOrderDirty(false);
      Toast.fire({ icon: "success", title: "บันทึกลำดับแผนงบประมาณแล้ว" });
    } catch (error) {
      console.error(error);
      Toast.fire({ icon: "error", title: error.message || "บันทึกลำดับแผนงบประมาณไม่สำเร็จ" });
    } finally {
      setSavingPlanOrder(false);
      handlePlanDragEnd();
    }
  };

  const handleToggleTypeActive = async (item) => {
    const id = item.type_id ?? item.id;
    const nextStatus = !item.is_active;
    updateToggleLoadingSet(setTypeToggleLoading, id, true);
    try {
      await adminAPI.updateProjectType(id, { is_active: nextStatus });
      setProjectTypes((prev) =>
        prev.map((entry) =>
          (entry.type_id ?? entry.id) === id
            ? { ...entry, is_active: nextStatus }
            : entry
        )
      );
      Toast.fire({
        icon: "success",
        title: nextStatus
          ? "เปิดใช้งานประเภทโครงการแล้ว"
          : "ปิดใช้งานประเภทโครงการแล้ว",
      });
    } catch (error) {
      console.error(error);
      Toast.fire({ icon: "error", title: error.message || "เปลี่ยนสถานะไม่สำเร็จ" });
    } finally {
      updateToggleLoadingSet(setTypeToggleLoading, id, false);
    }
  };

  const handleTogglePlanActive = async (item) => {
    const id = item.plan_id ?? item.id;
    const nextStatus = !item.is_active;
    updateToggleLoadingSet(setPlanToggleLoading, id, true);
    try {
      await adminAPI.updateProjectBudgetPlan(id, { is_active: nextStatus });
      setBudgetPlans((prev) =>
        prev.map((entry) =>
          (entry.plan_id ?? entry.id) === id
            ? { ...entry, is_active: nextStatus }
            : entry
        )
      );
      Toast.fire({
        icon: "success",
        title: nextStatus
          ? "เปิดใช้งานแผนงบประมาณแล้ว"
          : "ปิดใช้งานแผนงบประมาณแล้ว",
      });
    } catch (error) {
      console.error(error);
      Toast.fire({ icon: "error", title: error.message || "เปลี่ยนสถานะไม่สำเร็จ" });
    } finally {
      updateToggleLoadingSet(setPlanToggleLoading, id, false);
    }
  };

  const tabItems = useMemo(() => ([
    { id: "projects", label: "รายการโครงการ", icon: Briefcase },
    { id: "types", label: "ประเภทโครงการ", icon: Layers },
    { id: "plans", label: "แผนงบประมาณ", icon: Wallet },
  ]), []);

  return (
    <PageLayout
      title="จัดการโครงการ"
      subtitle="สร้าง แก้ไข และติดตามข้อมูลโครงการ รวมถึงประเภทและแผนงบประมาณ"
      icon={Briefcase}
      loading={loading}
    >
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="border-b border-gray-200 px-6 pt-4">
          <nav className="-mb-px flex flex-wrap gap-4">
            {tabItems.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6 space-y-6 bg-gray-50">
          {activeTab === "projects" && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-gray-500 flex items-center gap-2">
                  <FileText size={16} className="text-blue-500" />
                  รายการทั้งหมด {projects.length} โครงการ
                </div>
                <button
                  onClick={() => {
                    setShowProjectForm(true);
                    setEditingProject(null);
                    setProjectForm({ ...initialProjectForm });
                    setProjectFileKey((key) => key + 1);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus size={16} />
                  เพิ่มโครงการ
                </button>
              </div>

              <ProjectForm
                open={showProjectForm}
                formData={projectForm}
                types={projectTypeOptions}
                plans={budgetPlanOptions}
                onClose={resetProjectForm}
                onChange={handleProjectChange}
                onFileChange={handleProjectFileChange}
                onClearAttachment={handleClearProjectAttachment}
                onSubmit={handleSubmitProject}
                saving={savingProject}
                isEditing={!!editingProject}
                fileInputKey={projectFileKey}
                attachmentFile={projectForm.attachment}
                existingAttachment={editingProject?.attachments?.[0] || null}
              />

              <ProjectsTable
                projects={projects}
                onEdit={handleEditProject}
                onDelete={handleDeleteProject}
              />
            </>
          )}

          {activeTab === "types" && (
          <ConfigList
            title="ประเภทโครงการ"
            description="สร้างและแก้ไขชื่อประเภท โดยรหัสจะเรียงต่อเนื่องอัตโนมัติ"
            icon={Layers}
            items={projectTypes}
            form={typeForm}
            onFormChange={handleTypeFormChange}
            onSubmit={submitTypeForm}
            onCancel={() => {
              setTypeForm(initialTypeForm);
              setEditingType(null);
            }}
            editingItem={editingType}
            onEdit={(item) => {
              setEditingType(item);
              setTypeForm({
                name_th: item.name_th || "",
                name_en: item.name_en || "",
              });
            }}
            onToggleActive={handleToggleTypeActive}
            saving={savingType}
            emptyText="ยังไม่มีประเภทโครงการ"
            disableDeleteNotice
            draggingId={typeDragId}
            dragOverId={typeDragOverId}
            onDragStart={handleTypeDragStart}
            onDragOver={handleTypeDragOver}
            onDragEnd={handleTypeDragEnd}
            orderDirty={typeOrderDirty}
            onPersistOrder={persistTypeOrder}
            savingOrder={savingTypeOrder}
            toggleLoadingIds={typeToggleLoading}
            isReordering={typeDragId !== null}
          />
        )}

        {activeTab === "plans" && (
          <ConfigList
              title="แผนงบประมาณ"
              description="กำหนดแผนงบประมาณสำหรับอ้างอิงในการบันทึกโครงการ"
              icon={Wallet}
              items={budgetPlans}
              form={planForm}
              onFormChange={handlePlanFormChange}
              onSubmit={submitPlanForm}
            onCancel={() => {
              setPlanForm(initialPlanForm);
              setEditingPlan(null);
            }}
            editingItem={editingPlan}
            onEdit={(item) => {
              setEditingPlan(item);
              setPlanForm({
                name_th: item.name_th || "",
                name_en: item.name_en || "",
              });
            }}
            onToggleActive={handleTogglePlanActive}
            saving={savingPlan}
            emptyText="ยังไม่มีแผนงบประมาณ"
            disableDeleteNotice
            draggingId={planDragId}
            dragOverId={planDragOverId}
            onDragStart={handlePlanDragStart}
            onDragOver={handlePlanDragOver}
            onDragEnd={handlePlanDragEnd}
            orderDirty={planOrderDirty}
            onPersistOrder={persistPlanOrder}
            savingOrder={savingPlanOrder}
            toggleLoadingIds={planToggleLoading}
            isReordering={planDragId !== null}
          />
        )}
        </div>
      </div>
    </PageLayout>
  );
}