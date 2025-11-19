"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { DollarSign, AlertCircle, ShieldCheck, Layers } from "lucide-react";
import SettingsModal from "../common/SettingsModal";

const SubcategoryModal = ({
  isOpen,
  onClose,
  onSave,
  editingSubcategory,
  selectedCategory,
}) => {
  const [subcategoryForm, setSubcategoryForm] = useState({
    subcategory_name: "",
    fund_condition: "",
    target_roles: [],
    status: "active",
  });

  const [overallPolicyForm, setOverallPolicyForm] = useState({
    subcategory_budget_id: null,
    allocated_amount: "",
    max_amount_per_year: "",
    max_amount_per_grant: "",
    max_grants: "",
    fund_description: "",
    comment: "",
    status: "active",
    remaining_budget: "",
  });

  const [overallPolicyEnabled, setOverallPolicyEnabled] = useState(false);

  const firstFieldRef = useRef(null);

  const roleOptions = useMemo(
    () => [
      { value: "1", label: "อาจารย์" },
      { value: "2", label: "เจ้าหน้าที่" },
    ],
    []
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (editingSubcategory) {
      setSubcategoryForm({
        subcategory_name: editingSubcategory.subcategory_name || "",
        fund_condition: editingSubcategory.fund_condition || "",
        target_roles: Array.isArray(editingSubcategory.target_roles)
          ? editingSubcategory.target_roles.map((role) => role?.toString?.() ?? "")
          : [],
        status: editingSubcategory.status || "active",
      });

      const existingOverall = editingSubcategory.budgets?.find(
        (budget) => String(budget.record_scope || "").toLowerCase() === "overall"
      );

      if (existingOverall) {
        setOverallPolicyForm({
          subcategory_budget_id: existingOverall.subcategory_budget_id ?? null,
          allocated_amount: existingOverall.allocated_amount?.toString() || "",
          max_amount_per_year: existingOverall.max_amount_per_year?.toString() || "",
          max_amount_per_grant:
            existingOverall.max_amount_per_grant?.toString() || "",
          max_grants: existingOverall.max_grants?.toString() || "",
          fund_description: existingOverall.fund_description || "",
          comment: existingOverall.comment || "",
          status: existingOverall.status || "active",
          remaining_budget: existingOverall.remaining_budget?.toString() || "",
        });
        setOverallPolicyEnabled(true);
      } else {
        setOverallPolicyForm({
          subcategory_budget_id: null,
          allocated_amount: "",
          max_amount_per_year: "",
          max_amount_per_grant: "",
          max_grants: "",
          fund_description: "",
          comment: "",
          status: "active",
          remaining_budget: "",
        });
        setOverallPolicyEnabled(false);
      }
    } else {
      setSubcategoryForm({
        subcategory_name: "",
        fund_condition: "",
        target_roles: [],
        status: "active",
      });
      setOverallPolicyForm({
        subcategory_budget_id: null,
        allocated_amount: "",
        max_amount_per_year: "",
        max_amount_per_grant: "",
        max_grants: "",
        fund_description: "",
        comment: "",
        status: "active",
        remaining_budget: "",
      });
      setOverallPolicyEnabled(false);
    }
  }, [editingSubcategory, isOpen]);

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

  const handleTargetRoleChange = (roleId, checked) => {
    setSubcategoryForm((prev) => {
      const current = Array.isArray(prev.target_roles) ? prev.target_roles : [];
      if (checked) {
        if (current.includes(roleId)) {
          return prev;
        }
        return {
          ...prev,
          target_roles: [...current, roleId],
        };
      }
      return {
        ...prev,
        target_roles: current.filter((role) => role !== roleId),
      };
    });
  };

  const handleOverallPolicyChange = (field, value) => {
    setOverallPolicyForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const sanitizedName = subcategoryForm.subcategory_name.trim();
    if (!sanitizedName) {
      setSubcategoryForm((prev) => ({
        ...prev,
        subcategory_name: "",
      }));
      return;
    }

    const { remaining_budget, ...policyToSave } = overallPolicyForm;

    onSave({
      subcategory: {
        ...subcategoryForm,
        subcategory_name: sanitizedName,
      },
      overallPolicy: overallPolicyEnabled ? policyToSave : null,
    });
  };

  return (
    <SettingsModal
      open={isOpen}
      onClose={onClose}
      size="3xl"
      bodyClassName="max-h-[85vh] overflow-y-auto px-6 py-6"
      headerContent={
        <div className="flex items-center gap-3 text-gray-700">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <Layers size={18} />
          </span>
          <div>
            <p className="text-base font-semibold text-gray-900">
              {editingSubcategory ? "แก้ไขทุนย่อย" : "เพิ่มทุนย่อยใหม่"}
            </p>
            <p className="text-sm text-gray-500">จัดการข้อมูลทุนย่อยและเงื่อนไขหลักให้ตรงกับหน้าแสดงผล</p>
          </div>
        </div>
      }
    >
      {selectedCategory && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          หมวดหมู่: <span className="font-semibold">{selectedCategory.category_name}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-gray-700">
              <ShieldCheck size={18} className="text-blue-600" />
              <h4 className="text-base font-semibold">ข้อมูลทุนย่อย</h4>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold mb-2 text-gray-700">ชื่อทุนย่อย</label>
                <input
                  type="text"
                  required
                  value={subcategoryForm.subcategory_name}
                  onChange={(e) =>
                    setSubcategoryForm((prev) => ({
                      ...prev,
                      subcategory_name: e.target.value,
                    }))
                  }
                  onBlur={(e) =>
                    setSubcategoryForm((prev) => ({
                      ...prev,
                      subcategory_name: e.target.value.trim(),
                    }))
                  }
                  ref={firstFieldRef}
                  className="w-full text-gray-700 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="ระบุชื่อทุนย่อย"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold mb-2 text-gray-700">เงื่อนไขทุน (แสดงในหน้าแรก)</label>
                <textarea
                  value={subcategoryForm.fund_condition}
                  onChange={(e) =>
                    setSubcategoryForm((prev) => ({
                      ...prev,
                      fund_condition: e.target.value,
                    }))
                  }
                  className="w-full text-gray-700 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  rows={3}
                  placeholder="ระบุเงื่อนไขของทุน (ถ้ามี)"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">บทบาทที่เห็นทุนนี้</label>
                <div className="space-y-2">
                  {roleOptions.map((role) => {
                    const checked = subcategoryForm.target_roles.includes(role.value);
                    return (
                      <label key={role.value} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => handleTargetRoleChange(role.value, e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-600">{role.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">สถานะทุนย่อย</label>
                <select
                  value={subcategoryForm.status}
                  onChange={(e) =>
                    setSubcategoryForm((prev) => ({
                      ...prev,
                      status: e.target.value,
                    }))
                  }
                  className="w-full text-gray-700 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="active">เปิดใช้งาน</option>
                  <option value="disable">ปิดใช้งาน</option>
                </select>
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t pt-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-gray-700">
                <DollarSign size={18} className="text-emerald-600" />
                <h4 className="text-base font-semibold">เงื่อนไขหลัก</h4>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={overallPolicyEnabled}
                  onChange={(e) => setOverallPolicyEnabled(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span>{overallPolicyEnabled ? "กำลังตั้งค่าเงื่อนไขหลัก" : "ยังไม่ตั้งค่าเงื่อนไขหลัก"}</span>
              </label>
            </div>

            {overallPolicyEnabled ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">งบประมาณที่จัดสรร (บาท)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={overallPolicyForm.allocated_amount}
                      onChange={(e) => handleOverallPolicyChange("allocated_amount", e.target.value)}
                      className="w-full text-gray-700 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">วงเงินรวมต่อปี (บาท)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={overallPolicyForm.max_amount_per_year}
                      onChange={(e) => handleOverallPolicyChange("max_amount_per_year", e.target.value)}
                      className="w-full text-gray-700 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="0 (ไม่จำกัด)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">จำนวนครั้งรวมต่อปี</label>
                    <input
                      type="number"
                      min="0"
                      value={overallPolicyForm.max_grants}
                      onChange={(e) => handleOverallPolicyChange("max_grants", e.target.value)}
                      className="w-full text-gray-700 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="0 (ไม่จำกัด)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-700">วงเงินต่อครั้ง (ค่าเริ่มต้น)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={overallPolicyForm.max_amount_per_grant}
                      onChange={(e) => handleOverallPolicyChange("max_amount_per_grant", e.target.value)}
                      className="w-full text-gray-700 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="0 (ไม่กำหนด)"
                    />
                  </div>
                  {overallPolicyForm.remaining_budget && (
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">งบประมาณคงเหลือ (บาท)</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={overallPolicyForm.remaining_budget}
                          readOnly
                          className="w-full text-gray-700 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 cursor-not-allowed"
                          placeholder="คำนวณอัตโนมัติ"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <AlertCircle size={16} className="text-gray-400" />
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        * คำนวณจากการเบิกจ่ายจริงของระบบ
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">คำอธิบายเงื่อนไข</label>
                  <textarea
                    value={overallPolicyForm.fund_description}
                    onChange={(e) => handleOverallPolicyChange("fund_description", e.target.value)}
                    className="w-full text-gray-700 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    rows={3}
                    placeholder="สรุปเงื่อนไขหรือรายละเอียดของเงื่อนไขหลัก"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">หมายเหตุ (ภายใน)</label>
                  <textarea
                    value={overallPolicyForm.comment}
                    onChange={(e) => handleOverallPolicyChange("comment", e.target.value)}
                    className="w-full text-gray-700 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    rows={2}
                    placeholder="สำหรับบันทึกเพิ่มเติมของผู้ดูแล"
                  />
                </div>

                <div className="sm:w-60">
                  <label className="block text-sm font-semibold mb-2 text-gray-700">สถานะเงื่อนไขหลัก</label>
                  <select
                    value={overallPolicyForm.status}
                    onChange={(e) => handleOverallPolicyChange("status", e.target.value)}
                    className="w-full text-gray-700 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="active">เปิดใช้งาน</option>
                    <option value="disable">ปิดใช้งาน</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="p-4 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 bg-gray-50">
                ยังไม่กำหนดเงื่อนไขหลัก ระบบจะแสดงผลเฉพาะข้อมูลทุนย่อย โดยสามารถเปิดใช้งานภายหลังได้
              </div>
            )}
          </section>

        <div className="pt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
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
              บันทึกการเปลี่ยนแปลง
            </button>
          </div>
        </div>
      </form>
    </SettingsModal>
  );
};

export default SubcategoryModal;