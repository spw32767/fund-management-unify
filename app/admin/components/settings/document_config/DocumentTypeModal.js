"use client";

import React, { useEffect, useState } from "react";
import { FileCog } from "lucide-react";
import SettingsModal from "../common/SettingsModal";

export const FUND_TYPE_OPTIONS = [
  { value: "publication_reward", label: "เงินรางวัล/เงินสมทบผลงานเผยแพร่" },
  { value: "fund_application", label: "ทุนอื่น ๆ ที่ไม่ใช่เงินรางวัล/เงินสมทบฯ" },
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

  const selectedFundTypes = Array.isArray(formState.fund_types)
    ? formState.fund_types
    : [];

  return (
    <SettingsModal
      open={isOpen}
      onClose={onClose}
      size="xl"
      bodyClassName="max-h-[75vh] overflow-y-auto px-6 py-6"
      headerContent={
        <div className="flex items-center gap-3 text-gray-700">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <FileCog size={18} />
          </span>
          <div>
            <p className="text-base font-semibold text-gray-900">
              {initialData ? "แก้ไขประเภทเอกสาร" : "เพิ่มประเภทเอกสาร"}
            </p>
            <p className="text-sm text-gray-500">กำหนดข้อมูลประเภทเอกสารและเงื่อนไขการใช้งานในระบบ</p>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit}>
          <div className="grid gap-6 md:grid-cols-1">
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
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
                <label className="mb-2 block text-sm font-semibold text-gray-700">
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
                <label className="block text-sm font-semibold text-gray-700">
                  ตั้งค่าความจำเป็นของเอกสาร
                </label>
                  <div className="rounded-lg border border-gray-200 p-4">
                    <div className="flex flex-col gap-2">                  
                      <label 
                        className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 transition hover:border-blue-300"
                      >
                      <div className="flex flex-1 items-center gap-2">
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
                      </div>
                    </label>
                    <label 
                        className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 transition hover:border-blue-300"
                      >
                      <div className="flex flex-1 items-center gap-2">
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
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                เอกสารนี้ใช้กับแบบฟอร์มทุนประเภทใด
              </label>
              <div className="rounded-lg border border-gray-200 p-4">
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
          </div>

          <div className="mt-8 flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
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
              {saving ? "กำลังบันทึก..." : initialData ? "บันทึกการเปลี่ยนแปลง" : "บันทึก"}
            </button>
          </div>
      </form>
    </SettingsModal>
  );
};

export default DocumentTypeModal;