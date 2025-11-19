"use client";

// modals/BudgetModal.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Wallet } from "lucide-react";
import SettingsModal from "../common/SettingsModal";

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

  return (
    <SettingsModal
      open={isOpen}
      onClose={onClose}
      size="lg"
      bodyClassName="max-h-[85vh] overflow-y-auto px-6 py-6"
      headerContent={
        <div className="flex items-center gap-3 text-gray-700">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <Wallet size={18} />
          </span>
          <div>
            <p className="text-base font-semibold text-gray-900">
              {editingBudget ? "แก้ไขเงื่อนไขรอง" : "เพิ่มเงื่อนไขรองใหม่"}
            </p>
            <p className="text-sm text-gray-500">
              ระบุเงื่อนไขการให้ทุนรายครั้งให้ชัดเจน เพื่อให้ตรงกับหน้าหลักของการจัดการทุน
            </p>
          </div>
        </div>
      }
    >
      {selectedSubcategory && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          <p>
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
              <label className="block text-sm font-semibold mb-2 text-gray-700">คำอธิบายเงื่อนไข</label>
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
                placeholder="สรุปเงื่อนไขหรือรายละเอียดของเงื่อนไขรองนี้"
              />
              <p className="mt-1 text-xs text-gray-500">ข้อความนี้จะแสดงเป็นชื่อการ์ดในหน้าแสดงผล</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">วงเงินต่อครั้ง (บาท)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
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
                <label className="block text-sm font-semibold mb-2 text-gray-700">จำนวนครั้งสูงสุด</label>
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
                <label className="block text-sm font-semibold mb-2 text-gray-700">วงเงินต่อปีสำหรับเงื่อนไขนี้</label>
                <input
                  type="number"
                  min="0"
                  step="1"
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
                <label className="block text-sm font-semibold mb-2 text-gray-700">สถานะ</label>
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
              <label className="block text-sm font-semibold mb-2 text-gray-700">หมายเหตุ (ภายใน)</label>
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
                เงื่อนไขนี้เป็นเงื่อนไขหลักเดิมของระบบ หากต้องการแก้ไขรายละเอียดทั้งหมด กรุณาแก้ไขจากหน้าทุนย่อยโดยตรง
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              {editingBudget ? "บันทึกการแก้ไข" : "บันทึกเงื่อนไขรอง"}
            </button>
          </div>
      </form>
    </SettingsModal>
  );
};

export default BudgetModal;