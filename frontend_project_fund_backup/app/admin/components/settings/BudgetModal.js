// modals/BudgetModal.js
import React, { useState, useEffect } from "react";

const BudgetModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  editingBudget,
  selectedSubcategory 
}) => {
  const [budgetForm, setBudgetForm] = useState({
    allocated_amount: "",
    max_amount_per_grant: "",
    max_grants: "",
    fund_description: "",
    status: "active"
  });

  useEffect(() => {
    if (editingBudget) {
      setBudgetForm({
        allocated_amount: editingBudget.allocated_amount?.toString() || "",
        max_amount_per_grant: editingBudget.max_amount_per_grant?.toString() || "",
        max_grants: editingBudget.max_grants?.toString() || "",
        fund_description: editingBudget.fund_description || "",
        status: editingBudget.status || "active"
      });
    } else {
      setBudgetForm({
        allocated_amount: "",
        max_amount_per_grant: "",
        max_grants: "",
        fund_description: "",
        status: "active"
      });
    }
  }, [editingBudget]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Convert string values to numbers where appropriate
    const budgetData = {
      ...budgetForm,
      allocated_amount: parseFloat(budgetForm.allocated_amount) || 0,
      max_amount_per_grant: parseFloat(budgetForm.max_amount_per_grant) || 0,
      // max_grants: ถ้าไม่กรอกหรือกรอก 0 ให้เป็น null (ไม่จำกัด)
      max_grants: budgetForm.max_grants && budgetForm.max_grants !== "0" && budgetForm.max_grants !== "" 
        ? parseInt(budgetForm.max_grants) 
        : null
    };
    
    onSave(budgetData);
    setBudgetForm({
      allocated_amount: "",
      max_amount_per_grant: "",
      max_grants: "",
      fund_description: "",
      status: "active"
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl transform transition-all duration-300 scale-100">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">
          {editingBudget ? 'แก้ไขงบประมาณ' : 'เพิ่มงบประมาณใหม่'}
        </h3>
        
        {selectedSubcategory && (
          <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-800">
              ทุนย่อย: <span className="font-semibold">{selectedSubcategory.subcategory_name}</span>
            </p>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">วงเงินสูงสุดต่อทุน (บาท)</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={budgetForm.max_amount_per_grant}
                onChange={(e) => setBudgetForm({ 
                  ...budgetForm, 
                  max_amount_per_grant: e.target.value 
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="0"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">
                จำนวนทุนสูงสุด
                <span className="text-xs text-gray-500 ml-2">(ถ้าไม่กรอกจะหมายถึง ไม่จำกัดจำนวนการขอทุน)</span>
              </label>
              <input
                type="number"
                min="0"
                value={budgetForm.max_grants}
                onChange={(e) => setBudgetForm({ 
                  ...budgetForm, 
                  max_grants: e.target.value 
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="0 (ไม่จำกัด)"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">คำอธิบายทุน</label>
              <textarea
                value={budgetForm.fund_description}
                onChange={(e) => setBudgetForm({ 
                  ...budgetForm, 
                  fund_description: e.target.value 
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                rows={3}
                placeholder="เช่น สำหรับอาจารย์ระดับผู้ช่วยศาสตราจารย์ขึ้นไป, ทุนวิจัยระดับต้น, เป็นต้น"
              />
              <p className="text-xs text-gray-500 mt-1">
                ระบุรายละเอียด เช่น ระดับ, เงื่อนไข หรือคำอธิบายเพิ่มเติมของทุนนี้
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">สถานะ</label>
              <select
                value={budgetForm.status}
                onChange={(e) => setBudgetForm({ 
                  ...budgetForm, 
                  status: e.target.value 
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="active">เปิดใช้งาน</option>
                <option value="inactive">ปิดใช้งาน</option>
              </select>
            </div>
          </div>
          
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              {editingBudget ? 'บันทึกการแก้ไข' : 'เพิ่มงบประมาณ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BudgetModal;