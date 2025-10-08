// app/admin/components/settings/CategoryModal.js
import React, { useState, useEffect } from "react";

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl transform transition-all duration-300 scale-100">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">
          {editingCategory ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่'}
        </h3>
        
        {/* แสดงปีงบประมาณที่เลือก */}
        {selectedYear && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              ปีงบประมาณ: <span className="font-semibold">{selectedYear.year}</span>
            </p>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">ชื่อหมวดหมู่</label>
              <input
                type="text"
                required
                value={categoryForm.category_name}
                onChange={(e) => setCategoryForm({ 
                  ...categoryForm, 
                  category_name: e.target.value 
                })}
                className="w-full text-gray-600 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="ระบุชื่อหมวดหมู่"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">สถานะ</label>
              <select
                value={categoryForm.status}
                onChange={(e) => setCategoryForm({ 
                  ...categoryForm, 
                  status: e.target.value 
                })}
                className="w-full text-gray-600 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="active">เปิดใช้งาน</option>
                <option value="disable">ปิดใช้งาน</option>
              </select>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              บันทึก
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryModal;