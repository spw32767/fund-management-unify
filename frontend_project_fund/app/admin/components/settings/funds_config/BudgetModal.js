// modals/BudgetModal.js
import React, { useState, useEffect } from "react";

const BudgetModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  editingBudget,
  selectedSubcategory 
}) => {
  const hasExistingOverall = React.useMemo(() => {
    if (!selectedSubcategory?.budgets) return false;
    return selectedSubcategory.budgets.some(
      (budget) =>
        budget.record_scope === "overall" &&
        (!editingBudget || editingBudget.subcategory_budget_id !== budget.subcategory_budget_id)
    );
  }, [selectedSubcategory, editingBudget]);

  const [budgetForm, setBudgetForm] = useState({
    record_scope: "rule",
    allocated_amount: "",
    max_amount_per_year: "",
    max_amount_per_grant: "",
    max_grants: "",
    level: "",
    fund_description: "",
    comment: "",
    status: "active",
  });

  useEffect(() => {
    if (editingBudget) {
      setBudgetForm({
        record_scope: editingBudget.record_scope || "rule",
        allocated_amount: editingBudget.allocated_amount?.toString() || "",
        max_amount_per_year: editingBudget.max_amount_per_year?.toString() || "",
        max_amount_per_grant: editingBudget.max_amount_per_grant?.toString() || "",
        max_grants:
          editingBudget.max_grants !== null && editingBudget.max_grants !== undefined
            ? editingBudget.max_grants.toString()
            : "",
        level: editingBudget.level || "",
        fund_description: editingBudget.fund_description || "",
        comment: editingBudget.comment || "",
        status: editingBudget.status || "active",
      });
    } else {
      const defaultScope = hasExistingOverall ? "rule" : "overall";
      setBudgetForm({
        record_scope: defaultScope,
        allocated_amount: "",
        max_amount_per_year: "",
        max_amount_per_grant: "",
        max_grants: "",
        level: "",
        fund_description: "",
        comment: "",
        status: "active",
      });
    }
  }, [editingBudget, hasExistingOverall]);

  const isOverall = budgetForm.record_scope === "overall";
  const disableOverallOption = hasExistingOverall && budgetForm.record_scope !== "overall";

  const handleSubmit = (e) => {
    e.preventDefault();
    
    onSave(budgetForm);
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium mb-2 text-gray-700">ประเภทนโยบาย</label>
                <select
                  value={budgetForm.record_scope}
                  onChange={(e) => setBudgetForm({
                    ...budgetForm,
                    record_scope: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="overall" disabled={disableOverallOption}>นโยบายภาพรวม</option>
                  <option value="rule">กฎย่อย / เพดานเฉพาะกลุ่ม</option>
                </select>
                {disableOverallOption && (
                  <p className="text-xs text-orange-600 mt-1">
                    มีนโยบายภาพรวมอยู่แล้วในทุนย่อยนี้ สามารถเพิ่มเฉพาะกฎย่อยเพิ่มเติมได้เท่านั้น
                  </p>
                )}
              </div>
              <div className="sm:col-span-1">
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
                  <option value="disable">ปิดใช้งาน</option>
                </select>
              </div>
            </div>

            {isOverall ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">งบประมาณรวม (บาท)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={budgetForm.allocated_amount}
                    onChange={(e) => setBudgetForm({
                      ...budgetForm,
                      allocated_amount: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">วงเงินรวมต่อปี / ต่อคน (บาท)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={budgetForm.max_amount_per_year}
                    onChange={(e) => setBudgetForm({
                      ...budgetForm,
                      max_amount_per_year: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="ปล่อยว่าง = ไม่จำกัด"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">จำนวนทุนสูงสุด</label>
                  <input
                    type="number"
                    min="0"
                    value={budgetForm.max_grants}
                    onChange={(e) => setBudgetForm({
                      ...budgetForm,
                      max_grants: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="ปล่อยว่าง = ไม่จำกัด"
                  />
                  <p className="text-xs text-gray-500 mt-1">เว้นว่างหากไม่จำกัดจำนวนผู้รับทุน</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">เพดานต่อครั้ง (บาท)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={budgetForm.max_amount_per_grant}
                    onChange={(e) => setBudgetForm({
                      ...budgetForm,
                      max_amount_per_grant: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="ปล่อยว่าง = ใช้กฎย่อย"
                  />
                  <p className="text-xs text-gray-500 mt-1">ใช้เมื่อไม่มีการตั้งกฎย่อยเพิ่มเติม</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">วงเงินสูงสุดต่อครั้ง (บาท)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
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
                  <label className="block text-sm font-medium mb-2 text-gray-700">กลุ่ม / ระดับที่ใช้กฎนี้</label>
                  <input
                    type="text"
                    value={budgetForm.level}
                    onChange={(e) => setBudgetForm({
                      ...budgetForm,
                      level: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="เช่น ผู้ช่วยศาสตราจารย์, Staff"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">คำอธิบายเพิ่มเติม</label>
              <textarea
                value={budgetForm.fund_description}
                onChange={(e) => setBudgetForm({
                  ...budgetForm,
                  fund_description: e.target.value
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                rows={3}
                placeholder="เช่น เงื่อนไขการขอทุน หรือรายละเอียดเพิ่มเติม"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">หมายเหตุ (ภายใน)</label>
              <textarea
                value={budgetForm.comment}
                onChange={(e) => setBudgetForm({
                  ...budgetForm,
                  comment: e.target.value
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                rows={2}
                placeholder="สำหรับบันทึกเพิ่มเติมที่เห็นได้เฉพาะผู้ดูแลระบบ"
              />
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