"use client";

// modals/DeleteConfirmDialog.js
import React from "react";
import { AlertCircle } from "lucide-react";
import SettingsModal from "../common/SettingsModal";

const DeleteConfirmDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  deleteTarget 
}) => {
  const getDeleteMessage = () => {
    if (!deleteTarget) return "คุณต้องการลบรายการนี้ใช่หรือไม่?";
    
    const typeNames = {
      year: "ปีงบประมาณ",
      category: "หมวดหมู่",
      subcategory: "ทุนย่อย",
      budget: "งบประมาณ"
    };
    
    const typeName = typeNames[deleteTarget.type] || "รายการ";
    return `คุณต้องการลบ${typeName}: "${deleteTarget.name}" ใช่หรือไม่?`;
  };

  const getDeleteWarning = () => {
    switch (deleteTarget?.type) {
      case "category":
        return "การลบหมวดหมู่จะลบทุนย่อยและงบประมาณที่เกี่ยวข้องทั้งหมด";
      case "subcategory":
        return "การลบทุนย่อยจะลบงบประมาณที่เกี่ยวข้องทั้งหมด";
      case "year":
        return "การลบปีงบประมาณจะลบข้อมูลทุนทั้งหมดในปีนั้น";
      default:
        return null;
    }
  };

  return (
    <SettingsModal
      open={isOpen}
      onClose={onClose}
      size="sm"
      bodyClassName="px-6 py-6"
      headerContent={
        <div className="flex items-center gap-3 text-red-600">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
            <AlertCircle size={20} />
          </span>
          <div>
            <p className="text-base font-semibold text-gray-900">ยืนยันการลบ</p>
            <p className="text-sm text-gray-500">การลบไม่สามารถย้อนกลับได้</p>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-gray-700">{getDeleteMessage()}</p>
        {getDeleteWarning() ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            ⚠️ คำเตือน: {getDeleteWarning()}
          </div>
        ) : null}
        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
          >
            ยกเลิก
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
          >
            ลบ
          </button>
        </div>
      </div>
    </SettingsModal>
  );
};

export default DeleteConfirmDialog;