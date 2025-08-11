// app/admin/components/settings/SubcategoryModal.js
import React, { useState, useEffect } from "react";
import { DollarSign, AlertCircle } from "lucide-react";

const SubcategoryModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  editingSubcategory,
  selectedCategory 
}) => {
  const [subcategoryForm, setSubcategoryForm] = useState({
    subcategory_name: "",
    fund_condition: "",
    target_roles: [],
    allocated_amount: "",
    remaining_budget: "",
    status: "active"
  });

  useEffect(() => {
    if (editingSubcategory) {
      // ใช้ค่าจาก budget ตัวแรก (เพราะทุกตัวใน subcategory เดียวกันมีค่าเท่ากัน)
      const allocatedAmount = editingSubcategory.budgets?.[0]?.allocated_amount || 0;
      const remainingBudget = editingSubcategory.budgets?.[0]?.remaining_budget || 0;

      setSubcategoryForm({
        subcategory_name: editingSubcategory.subcategory_name || "",
        fund_condition: editingSubcategory.fund_condition || "",
        target_roles: editingSubcategory.target_roles || [],
        allocated_amount: allocatedAmount.toString(),
        remaining_budget: remainingBudget.toString(),
        status: editingSubcategory.status || "active"
      });
    } else {
      setSubcategoryForm({
        subcategory_name: "",
        fund_condition: "",
        target_roles: [],
        allocated_amount: "",
        remaining_budget: "",
        status: "active"
      });
    }
  }, [editingSubcategory]);

  const handleTargetRoleChange = (roleId, checked) => {
    if (checked) {
      setSubcategoryForm({ 
        ...subcategoryForm, 
        target_roles: [...subcategoryForm.target_roles, roleId] 
      });
    } else {
      setSubcategoryForm({ 
        ...subcategoryForm, 
        target_roles: subcategoryForm.target_roles.filter(r => r !== roleId) 
      });
    }
  };

  const handleAllocatedAmountChange = (value) => {
    const amount = parseFloat(value) || 0;
    const used = parseFloat(subcategoryForm.allocated_amount) - parseFloat(subcategoryForm.remaining_budget) || 0;
    
    setSubcategoryForm({ 
      ...subcategoryForm, 
      allocated_amount: value,
      remaining_budget: (amount - used).toString()
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const dataToSave = {
      ...subcategoryForm,
      allocated_amount: parseFloat(subcategoryForm.allocated_amount) || 0
    };
    
    // ไม่ส่ง remaining_budget เพราะจะคำนวณใน backend
    delete dataToSave.remaining_budget;
    
    onSave(dataToSave);
    setSubcategoryForm({
      subcategory_name: "",
      fund_condition: "",
      target_roles: [],
      allocated_amount: "",
      remaining_budget: "",
      status: "active"
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl transform transition-all duration-300 scale-100">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">
          {editingSubcategory ? 'แก้ไขทุนย่อย' : 'เพิ่มทุนย่อยใหม่'}
        </h3>
        
        {selectedCategory && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              หมวดหมู่: <span className="font-semibold">{selectedCategory.category_name}</span>
            </p>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">ชื่อทุนย่อย</label>
              <input
                type="text"
                required
                value={subcategoryForm.subcategory_name}
                onChange={(e) => setSubcategoryForm({ 
                  ...subcategoryForm, 
                  subcategory_name: e.target.value 
                })}
                className="w-full text-gray-600 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="ระบุชื่อทุนย่อย"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">เงื่อนไขทุน</label>
              <textarea
                value={subcategoryForm.fund_condition}
                onChange={(e) => setSubcategoryForm({ 
                  ...subcategoryForm, 
                  fund_condition: e.target.value 
                })}
                className="w-full text-gray-600 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                rows="3"
                placeholder="ระบุเงื่อนไขของทุน (ถ้ามี)"
              />
            </div>

            {/* ส่วนงบประมาณ */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-3 text-gray-700 flex items-center gap-2">
                <DollarSign size={16} />
                ข้อมูลงบประมาณ
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    งบประมาณรวม (บาท)
                  </label>
                  <input
                    type="number"
                    value={subcategoryForm.allocated_amount}
                    onChange={(e) => handleAllocatedAmountChange(e.target.value)}
                    className="w-full text-gray-600 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="0"
                    step="0.01"
                    min="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    งบประมาณคงเหลือ (บาท)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={subcategoryForm.remaining_budget}
                      readOnly
                      className="w-full text-gray-600 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 cursor-not-allowed"
                      placeholder="คำนวณอัตโนมัติ"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <AlertCircle size={16} className="text-gray-400" />
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    * คำนวณอัตโนมัติจากงบประมาณรวม
                  </p>
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">บทบาทที่สามารถเห็นทุนนี้</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={subcategoryForm.target_roles.includes("1")}
                    onChange={(e) => handleTargetRoleChange("1", e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">อาจารย์</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={subcategoryForm.target_roles.includes("2")}
                    onChange={(e) => handleTargetRoleChange("2", e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">เจ้าหน้าที่</span>
                </label>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                * หากไม่เลือกบทบาทใด จะมีเฉพาะผู้ดูแลระบบเท่านั้นที่เห็นทุนนี้
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">สถานะ</label>
              <select
                value={subcategoryForm.status}
                onChange={(e) => setSubcategoryForm({ 
                  ...subcategoryForm, 
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

export default SubcategoryModal;