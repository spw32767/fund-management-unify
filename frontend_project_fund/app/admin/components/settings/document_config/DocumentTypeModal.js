"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

const FUND_TYPE_OPTIONS = [
  { value: "fund_application", label: "คำขอรับทุนวิจัย" },
  { value: "publication_reward", label: "เงินรางวัลผลงานเผยแพร่" },
];

const initialFormState = {
  document_type_name: "",
  code: "",
  category: "",
  document_order: 0,
  required: false,
  multiple: false,
  is_required: "",
  fund_types: [],
  subcategory_names: [],
};

const DocumentTypeModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  subcategoryOptions,
  saving = false,
}) => {
  const [formState, setFormState] = useState(initialFormState);
  const [subcategorySearch, setSubcategorySearch] = useState("");

  useEffect(() => {
    if (isOpen) {
      const base = {
        ...initialFormState,
        ...initialData,
      };

      setFormState({
        ...initialFormState,
        ...base,
        document_type_name: base.document_type_name || "",
        code: base.code || "",
        category: base.category || "",
        document_order: Number(base.document_order || 0),
        required: Boolean(base.required),
        multiple: Boolean(base.multiple),
        is_required: base.is_required || "",
        fund_types: Array.isArray(base.fund_types) ? base.fund_types : [],
        subcategory_names: Array.isArray(base.subcategory_names)
          ? base.subcategory_names
          : [],
      });
      setSubcategorySearch("");
    } else {
      setFormState(initialFormState);
      setSubcategorySearch("");
    }
  }, [isOpen, initialData]);

  const filteredSubcategoryOptions = useMemo(() => {
    if (!Array.isArray(subcategoryOptions)) return [];
    const term = subcategorySearch.trim().toLowerCase();
    if (!term) return subcategoryOptions;
    return subcategoryOptions.filter((option) => {
      const name = option?.name?.toLowerCase?.() || "";
      const category = option?.category?.toLowerCase?.() || "";
      return name.includes(term) || category.includes(term);
    });
  }, [subcategoryOptions, subcategorySearch]);

  const handleCheckboxChange = (name) => {
    setFormState((prev) => {
      const current = new Set(prev.subcategory_names || []);
      if (current.has(name)) {
        current.delete(name);
      } else {
        current.add(name);
      }
      return {
        ...prev,
        subcategory_names: Array.from(current),
      };
    });
  };

  const handleFundTypeToggle = (value) => {
    setFormState((prev) => {
      const current = new Set(prev.fund_types || []);
      if (current.has(value)) {
        current.delete(value);
      } else {
        current.add(value);
      }
      return {
        ...prev,
        fund_types: Array.from(current),
      };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      document_type_name: formState.document_type_name.trim(),
      code: formState.code.trim(),
      category: formState.category.trim(),
      document_order: Number(formState.document_order) || 0,
      required: Boolean(formState.required),
      multiple: Boolean(formState.multiple),
      fund_types: Array.isArray(formState.fund_types)
        ? formState.fund_types
        : [],
      subcategory_names: Array.isArray(formState.subcategory_names)
        ? formState.subcategory_names
        : [],
    };

    const isRequired = (formState.is_required || "").trim();
    if (isRequired) {
      payload.is_required = isRequired;
    }

    onSubmit(payload);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {initialData ? "แก้ไขประเภทเอกสาร" : "เพิ่มประเภทเอกสาร"}
            </h3>
            <p className="text-sm text-gray-500">
              กำหนดข้อมูลประเภทเอกสารและเงื่อนไขการใช้งานในระบบ
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label="ปิดหน้าต่าง"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  ชื่อประเภทเอกสาร
                </label>
                <input
                  type="text"
                  required
                  value={formState.document_type_name}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      document_type_name: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="ระบุชื่อเอกสาร"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  รหัสเอกสาร (Code)
                </label>
                <input
                  type="text"
                  required
                  value={formState.code}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      code: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="เช่น publication_reward_form"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  หมวดหมู่ (Category)
                </label>
                <input
                  type="text"
                  value={formState.category}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="เช่น publication"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    ลำดับการแสดงผล
                  </label>
                  <input
                    type="number"
                    value={formState.document_order}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        document_order: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    เงื่อนไขบังคับ (is_required)
                  </label>
                  <select
                    value={formState.is_required}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        is_required: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="">ค่าเริ่มต้น (ตามระบบเดิม)</option>
                    <option value="yes">บังคับแนบเอกสาร</option>
                    <option value="no">ไม่บังคับ</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  ตัวเลือกเพิ่มเติม
                </label>
                <div className="flex flex-col gap-2">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={formState.required}
                      onChange={(e) =>
                        setFormState((prev) => ({
                          ...prev,
                          required: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    ต้องแนบไฟล์อย่างน้อย 1 ไฟล์
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={formState.multiple}
                      onChange={(e) =>
                        setFormState((prev) => ({
                          ...prev,
                          multiple: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    อนุญาตให้แนบได้หลายไฟล์
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  ประเภททุนที่ใช้ได้
                </label>
                <div className="flex flex-col gap-2">
                  {FUND_TYPE_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className="inline-flex items-center gap-2 text-sm text-gray-700"
                    >
                      <input
                        type="checkbox"
                        checked={formState.fund_types.includes(option.value)}
                        onChange={() => handleFundTypeToggle(option.value)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    ใช้กับประเภทย่อยของทุน (เลือกได้หลายรายการ)
                  </label>
                  <span className="text-xs text-gray-500">
                    เลือก {formState.subcategory_names.length} รายการ
                  </span>
                </div>
                <input
                  type="text"
                  value={subcategorySearch}
                  onChange={(e) => setSubcategorySearch(e.target.value)}
                  className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="ค้นหาชื่อประเภทย่อยหรือหมวดหมู่"
                />
                <div className="max-h-80 overflow-y-auto rounded-lg border border-gray-200">
                  {filteredSubcategoryOptions.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">
                      ไม่พบประเภทย่อยที่ตรงกับคำค้นหา
                    </div>
                  ) : (
                    <ul className="divide-y">
                      {filteredSubcategoryOptions.map((option) => {
                        const name = option?.name || "";
                        const checked = formState.subcategory_names.includes(name);
                        return (
                          <li key={`${name}-${option.category || ""}`} className="p-3 hover:bg-gray-50">
                            <label className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => handleCheckboxChange(name)}
                                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span>
                                <span className="block text-sm font-medium text-gray-800">
                                  {name || "(ไม่ระบุชื่อ)"}
                                </span>
                                {option?.category ? (
                                  <span className="mt-1 block text-xs text-gray-500">
                                    หมวดหมู่: {option.category}
                                  </span>
                                ) : null}
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3 border-t pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DocumentTypeModal;
