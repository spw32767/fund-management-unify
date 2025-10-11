"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";

export const FUND_TYPE_OPTIONS = [
  { value: "fund_application", label: "คำขอรับทุนวิจัย" },
  { value: "publication_reward", label: "เงินรางวัลผลงานเผยแพร่" },
];

const initialFormState = {
  document_type_name: "",
  code: "",
  required: false,
  multiple: false,
  fund_types: [],
};

const DocumentTypeModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  saving = false,
}) => {
  const [formState, setFormState] = useState(initialFormState);

  useEffect(() => {
    if (!isOpen) {
      setFormState(initialFormState);
      return;
    }

    const base = {
      ...initialFormState,
      ...(initialData || {}),
    };

    setFormState({
      document_type_name: base.document_type_name || "",
      code: base.code || "",
      required: Boolean(base.required),
      multiple: Boolean(base.multiple),
      fund_types: Array.isArray(base.fund_types) ? base.fund_types : [],
    });
  }, [isOpen, initialData]);

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
      required: Boolean(formState.required),
      multiple: Boolean(formState.multiple),
      fund_types: Array.isArray(formState.fund_types)
        ? formState.fund_types
        : [],
    };

    onSubmit(payload);
  };

  if (!isOpen) return null;

  const selectedFundTypes = Array.isArray(formState.fund_types)
    ? formState.fund_types
    : [];

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
                    อนุญาตให้อัปโหลดหลายไฟล์
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  ประเภททุนที่ใช้งาน
                </label>
                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="mb-3 text-xs text-gray-500">
                    ไม่เลือกหมายถึงใช้ได้กับทุกประเภททุน
                  </p>
                  <div className="flex flex-col gap-2">
                    {FUND_TYPE_OPTIONS.map((option) => {
                      const checked = selectedFundTypes.includes(option.value);
                      return (
                        <label
                          key={option.value}
                          className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 transition hover:border-blue-300"
                        >
                          <div className="flex flex-1 items-center gap-2">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleFundTypeToggle(option.value)}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>{option.label}</span>
                          </div>
                          {checked && (
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">เลือกไว้</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-gray-50 p-4 text-xs text-gray-600">
                <p className="font-semibold text-gray-700">คำแนะนำ</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>เว้นว่างไม่เลือกประเภททุน เพื่อให้ใช้ได้กับทุกแบบฟอร์ม</li>
                  <li>เลือกอย่างน้อย 1 รายการ หากต้องการจำกัดให้ใช้เฉพาะฟอร์มที่ระบุ</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-end gap-3 border-t pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
              disabled={saving}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? "กำลังบันทึก..." : initialData ? "บันทึกการเปลี่ยนแปลง" : "บันทึกข้อมูล"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DocumentTypeModal;