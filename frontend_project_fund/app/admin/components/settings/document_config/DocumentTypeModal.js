"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

export const FUND_TYPE_OPTIONS = [
  { value: "fund_application", label: "คำขอรับทุนวิจัย" },
  { value: "publication_reward", label: "เงินรางวัลผลงานเผยแพร่" },
];

const initialFormState = {
  document_type_name: "",
  code: "",
  document_order: 0,
  required: false,
  multiple: false,
  fund_types: [],
  subcategory_name: "",
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

  const normalizedSubcategoryOptions = useMemo(() => {
    if (!Array.isArray(subcategoryOptions)) return [];

    const unique = new Map();

    subcategoryOptions.forEach((option) => {
      const rawName =
        typeof option?.name === "string" ? option.name.trim() : "";
      if (!rawName) return;

      const key = rawName.toLowerCase();

      if (!unique.has(key)) {
        unique.set(key, {
          ...option,
          name: rawName,
        });
      }
    });

    return Array.from(unique.values()).sort((a, b) =>
      (a.name || "").localeCompare(b.name || "", "th"),
    );
  }, [subcategoryOptions]);

  useEffect(() => {
    if (isOpen) {
      const { category: _legacyCategory, ...restInitialData } =
        initialData || {};
      const base = {
        ...initialFormState,
        ...restInitialData,
      };

      setFormState({
        ...initialFormState,
        ...base,
        document_type_name: base.document_type_name || "",
        code: base.code || "",
        document_order: Number(base.document_order || 0),
        required: Boolean(base.required),
        multiple: Boolean(base.multiple),
        fund_types: Array.isArray(base.fund_types) ? base.fund_types : [],
        subcategory_name:
          typeof base.subcategory_name === "string" && base.subcategory_name.trim() !== ""
            ? base.subcategory_name.trim()
            : Array.isArray(base.subcategory_names) && base.subcategory_names.length > 0
            ? base.subcategory_names[0]
            : "",
      });
      setSubcategorySearch("");
    } else {
      setFormState(initialFormState);
      setSubcategorySearch("");
    }
  }, [isOpen, initialData]);

  const filteredSubcategoryOptions = useMemo(() => {
    if (!Array.isArray(normalizedSubcategoryOptions)) return [];
    const term = subcategorySearch.trim().toLowerCase();
    if (!term) return normalizedSubcategoryOptions;
    return normalizedSubcategoryOptions.filter((option) => {
      const name = option?.name?.toLowerCase?.() || "";
      return name.includes(term);
    });
  }, [normalizedSubcategoryOptions, subcategorySearch]);

  const handleSelectSubcategory = (name) => {
    setFormState((prev) => ({
      ...prev,
      subcategory_name: prev.subcategory_name === name ? "" : name,
    }));
  };

  const handleClearSubcategory = () => {
    setFormState((prev) => ({
      ...prev,
      subcategory_name: "",
    }));
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
      document_order: Number(formState.document_order) || 0,
      required: Boolean(formState.required),
      multiple: Boolean(formState.multiple),
      fund_types: Array.isArray(formState.fund_types)
        ? formState.fund_types
        : [],
    };

    const subcategoryName = (formState.subcategory_name || "").trim();
    payload.subcategory_name = subcategoryName ? subcategoryName : null;

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
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      ใช้กับประเภทย่อยของทุน
                    </label>
                    <p className="text-xs text-gray-500">
                      เลือกได้ 1 รายการ หรือปล่อยว่างเพื่อใช้กับทุกประเภทย่อย
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>
                      {formState.subcategory_name
                        ? `เลือกแล้ว: ${formState.subcategory_name}`
                        : "ทุกประเภทย่อย"}
                    </span>
                    {formState.subcategory_name && (
                      <button
                        type="button"
                        onClick={handleClearSubcategory}
                        className="rounded border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
                      >
                        ล้างการเลือก
                      </button>
                    )}
                  </div>
                </div>
                <input
                  type="text"
                  value={subcategorySearch}
                  onChange={(e) => setSubcategorySearch(e.target.value)}
                  className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="ค้นหาชื่อประเภทย่อย"
                />
                <div className="max-h-80 overflow-y-auto rounded-lg border border-gray-200">
                  {filteredSubcategoryOptions.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">
                      ไม่พบประเภทย่อยที่ตรงกับคำค้นหา
                    </div>
                  ) : (
                    <ul className="divide-y">
                      <li className="p-3 hover:bg-gray-50">
                        <label className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="subcategory-option"
                            checked={!formState.subcategory_name}
                            onChange={() => handleSelectSubcategory("")}
                            className="mt-1 h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span>
                            <span className="block text-sm font-medium text-gray-800">
                              ทุกประเภทย่อยของทุน
                            </span>
                            <span className="mt-1 block text-xs text-gray-500">
                              เลือกตัวเลือกนี้หากต้องการให้ใช้กับทุกประเภทย่อย
                            </span>
                          </span>
                        </label>
                      </li>
                      {filteredSubcategoryOptions.map((option, index) => {
                        const name = option?.name || "";
                        const checked = formState.subcategory_name === name;
                        const optionKey = name
                          ? name.toLowerCase()
                          : option?.id
                          ? `option-${option.id}`
                          : `option-index-${index}`;
                        return (
                          <li
                            key={optionKey}
                            className="p-3 hover:bg-gray-50"
                          >
                            <label className="flex items-start gap-3">
                              <input
                                type="radio"
                                name="subcategory-option"
                                checked={checked}
                                onChange={() => handleSelectSubcategory(name)}
                                className="mt-1 h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span>
                                <span className="block text-sm font-medium text-gray-800">
                                  {name || "(ไม่ระบุชื่อ)"}
                                </span>
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