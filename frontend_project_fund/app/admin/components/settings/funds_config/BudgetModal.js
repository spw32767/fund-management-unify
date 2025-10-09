// modals/BudgetModal.js
import React, { useEffect, useMemo, useRef, useState } from "react";

const formatCurrencyDisplay = (value) => {
  if (value === null || value === undefined || value === "") return "ไม่จำกัด";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "-";
  return `${numeric.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} บาท`;
};

const formatCountDisplay = (value) => {
  if (value === null || value === undefined || value === "") return "ไม่จำกัด";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "-";
  if (numeric === 0) return "ไม่จำกัด";
  return `${numeric.toLocaleString()} ครั้ง`;
};

const BudgetModal = ({
  isOpen,
  onClose,
  onSave,
  editingBudget,
  selectedSubcategory,
}) => {
  const overallBudget = useMemo(() => {
    if (!selectedSubcategory?.budgets) return null;
    return selectedSubcategory.budgets.find(
      (budget) => String(budget.record_scope || "").toLowerCase() === "overall"
    );
  }, [selectedSubcategory]);

  const [budgetForm, setBudgetForm] = useState({
    record_scope: "rule",
    allocated_amount: "",
    max_amount_per_year: "",
    max_amount_per_grant: "",
    max_grants: "",
    fund_description: "",
    comment: "",
    status: "active",
  });
  const [isEditingOverall, setIsEditingOverall] = useState(false);

  const firstFieldRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (editingBudget) {
      const normalizedScope = String(editingBudget.record_scope || "rule").toLowerCase();
      setIsEditingOverall(normalizedScope === "overall");
      setBudgetForm({
        record_scope: normalizedScope === "overall" ? "overall" : "rule",
        allocated_amount: editingBudget.allocated_amount?.toString() || "",
        max_amount_per_year: editingBudget.max_amount_per_year?.toString() || "",
        max_amount_per_grant: editingBudget.max_amount_per_grant?.toString() || "",
        max_grants:
          editingBudget.max_grants !== null && editingBudget.max_grants !== undefined
            ? editingBudget.max_grants.toString()
            : "",
        fund_description: editingBudget.fund_description || "",
        comment: editingBudget.comment || "",
        status: editingBudget.status || "active",
      });
    } else {
      setIsEditingOverall(false);
      setBudgetForm({
        record_scope: "rule",
        allocated_amount: "",
        max_amount_per_year: "",
        max_amount_per_grant: "",
        max_grants: "",
        fund_description: "",
        comment: "",
        status: "active",
      });
    }
  }, [editingBudget, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const timeout = window.setTimeout(() => {
      firstFieldRef.current?.focus({ preventScroll: true });
    }, 0);

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose?.();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const sanitizedForm = {
      ...budgetForm,
      record_scope: isEditingOverall ? "overall" : "rule",
      allocated_amount: budgetForm.allocated_amount,
      fund_description: budgetForm.fund_description.trim(),
      comment: budgetForm.comment.trim(),
    };

    onSave(sanitizedForm);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={editingBudget ? "แก้ไขกฎย่อย" : "เพิ่มกฎย่อยใหม่"}
        tabIndex={-1}
        className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-2xl transform transition-all duration-300 scale-100 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex flex-col gap-2 mb-6">
          <h3 className="text-xl font-semibold text-gray-900">
            {editingBudget ? "แก้ไขกฎย่อย" : "เพิ่มกฎย่อยใหม่"}
          </h3>
          <p className="text-sm text-gray-500">
            ระบุเงื่อนไขการให้ทุนรายครั้งให้ชัดเจน โดยข้อมูลและคำศัพท์จะสอดคล้องกับหน้าหลักของการจัดการทุน
          </p>
        </div>

        {selectedSubcategory && (
          <div className="mb-6 p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-800">
              ทุนย่อย: <span className="font-semibold">{selectedSubcategory.subcategory_name}</span>
            </p>
            {overallBudget && (
              <p className="mt-1 text-xs text-green-700">
                วงเงินรวมต่อปี: {formatCurrencyDisplay(overallBudget.max_amount_per_year)}
                {formatCountDisplay(overallBudget.max_grants) !== "ไม่จำกัด" && (
                  <>
                    {" "}| จำนวนครั้งรวม: {formatCountDisplay(overallBudget.max_grants)}
                  </>
                )}
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">คำอธิบายนโยบาย</label>
              <textarea
                ref={firstFieldRef}
                value={budgetForm.fund_description}
                onChange={(e) =>
                  setBudgetForm((prev) => ({
                    ...prev,
                    fund_description: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                rows={3}
                placeholder="สรุปเงื่อนไขหรือรายละเอียดของกฎย่อยนี้"
              />
              <p className="mt-1 text-xs text-gray-500">ข้อความนี้จะแสดงเป็นชื่อการ์ดในหน้าแสดงผล</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">วงเงินต่อครั้ง (บาท)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required={!isEditingOverall}
                  value={budgetForm.max_amount_per_grant}
                  onChange={(e) =>
                    setBudgetForm((prev) => ({
                      ...prev,
                      max_amount_per_grant: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">จำนวนครั้งสูงสุด</label>
                <input
                  type="number"
                  min="0"
                  value={budgetForm.max_grants}
                  onChange={(e) =>
                    setBudgetForm((prev) => ({
                      ...prev,
                      max_grants: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="0 (ไม่จำกัด)"
                />
                <p className="text-xs text-gray-500 mt-1">ปล่อยว่างหากไม่จำกัดจำนวนครั้ง</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">วงเงินต่อปีสำหรับกฎนี้</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={budgetForm.max_amount_per_year}
                  onChange={(e) =>
                    setBudgetForm((prev) => ({
                      ...prev,
                      max_amount_per_year: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="0 (ไม่จำกัด)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">สถานะ</label>
                <select
                  value={budgetForm.status}
                  onChange={(e) =>
                    setBudgetForm((prev) => ({
                      ...prev,
                      status: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="active">เปิดใช้งาน</option>
                  <option value="disable">ปิดใช้งาน</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">หมายเหตุ (ภายใน)</label>
              <textarea
                value={budgetForm.comment}
                onChange={(e) =>
                  setBudgetForm((prev) => ({
                    ...prev,
                    comment: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                rows={2}
                placeholder="สำหรับบันทึกเพิ่มเติมที่เห็นได้เฉพาะผู้ดูแลระบบ"
              />
            </div>

            {isEditingOverall && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                กฎนี้เป็นนโยบายภาพรวมเดิมของระบบ หากต้องการแก้ไขรายละเอียดทั้งหมด กรุณาแก้ไขจากหน้าทุนย่อยโดยตรง
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-end gap-3 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium shadow"
            >
              {editingBudget ? "บันทึกการแก้ไข" : "บันทึกกฎย่อย"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BudgetModal;