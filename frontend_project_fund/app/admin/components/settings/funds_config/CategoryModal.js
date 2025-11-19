"use client";

// app/admin/components/settings/CategoryModal.js
import React, { useState, useEffect } from "react";
import { FolderTree } from "lucide-react";
import SettingsModal from "../common/SettingsModal";

const CategoryModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  editingCategory,
  selectedYear // เพิ่ม selectedYear prop
}) => {
  const [categoryForm, setCategoryForm] = useState({ 
    category_name: "", 
    status: "active" 
  });

  useEffect(() => {
    if (editingCategory) {
      setCategoryForm({
        category_name: editingCategory.category_name || "",
        status: editingCategory.status || "active"
      });
    } else {
      setCategoryForm({ category_name: "", status: "active" });
    }
  }, [editingCategory]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // ตรวจสอบว่ามี selectedYear หรือไม่
    if (!selectedYear) {
      alert('กรุณาเลือกปีงบประมาณก่อน');
      return;
    }
    
    // เพิ่ม year_id เข้าไปในข้อมูลที่จะส่ง
    const categoryData = {
      ...categoryForm,
      year_id: selectedYear.year_id
    };
    
    onSave(categoryData);
    setCategoryForm({ category_name: "", status: "active" });
  };

  return (
    <SettingsModal
      open={isOpen}
      onClose={onClose}
      size="md"
      bodyClassName="max-h-[70vh] overflow-y-auto px-6 py-6"
      headerContent={
        <div className="flex items-center gap-3 text-gray-700">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <FolderTree size={18} />
          </span>
          <div>
            <p className="text-base font-semibold text-gray-900">
              {editingCategory ? "แก้ไขหมวดหมู่" : "เพิ่มหมวดหมู่ใหม่"}
            </p>
            <p className="text-sm text-gray-500">จัดการหมวดหมู่ของทุนในแต่ละปีงบประมาณ</p>
          </div>
        </div>
      }
    >
      {selectedYear && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          ปีงบประมาณ: <span className="font-semibold">{selectedYear.year}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">ชื่อหมวดหมู่</label>
            <input
              type="text"
              required
              value={categoryForm.category_name}
              onChange={(e) =>
                setCategoryForm({
                  ...categoryForm,
                  category_name: e.target.value
                })
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700 focus:ring-2 focus:ring-blue-200 focus-visible:border-blue-500"
              placeholder="ระบุชื่อหมวดหมู่"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">สถานะ</label>
            <select
              value={categoryForm.status}
              onChange={(e) =>
                setCategoryForm({
                  ...categoryForm,
                  status: e.target.value
                })
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700 focus:ring-2 focus:ring-blue-200 focus-visible:border-blue-500"
            >
              <option value="active">เปิดใช้งาน</option>
              <option value="disable">ปิดใช้งาน</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            บันทึก
          </button>
        </div>
      </form>
    </SettingsModal>
  );
};

export default CategoryModal;