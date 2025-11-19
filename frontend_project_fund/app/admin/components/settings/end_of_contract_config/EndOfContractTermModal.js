"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ListChecks, Loader2 } from "lucide-react";
import SettingsModal from "../common/SettingsModal";

const MAX_LENGTH = 2000;

const EndOfContractTermModal = ({
  isOpen,
  mode = "create",
  initialData,
  onClose,
  onSubmit,
  saving = false,
}) => {
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setContent("");
      setError("");
      return;
    }

    setContent(initialData?.content ?? "");
    setError("");
  }, [isOpen, initialData]);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      const element = textareaRef.current;
      element.focus({ preventScroll: true });
      const length = element.value.length;
      element.setSelectionRange(length, length);
    }
  }, [isOpen]);

  const trimmedContent = useMemo(() => content.trim(), [content]);
  const charCount = content.length;
  const remaining = MAX_LENGTH - charCount;
  const isEditMode = mode === "edit";

  const heading = isEditMode ? "แก้ไขข้อตกลง" : "เพิ่มข้อตกลงใหม่";
  const description = isEditMode
    ? "ปรับปรุงรายละเอียดข้อตกลงการรับเงินรางวัล"
    : "กรอกข้อความข้อตกลงที่จะให้ผู้ยื่นคำร้องอ่านและยืนยัน";
  const primaryLabel = isEditMode ? "บันทึกการแก้ไข" : "บันทึกข้อตกลง";

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) {
      return;
    }

    const value = trimmedContent;
    if (!value) {
      setError("กรุณากรอกรายละเอียดข้อตกลง");
      return;
    }

    if (value.length > MAX_LENGTH) {
      setError(`เนื้อหายาวเกิน ${MAX_LENGTH.toLocaleString()} ตัวอักษร`);
      return;
    }

    setError("");
    await onSubmit?.({ content: value });
  };

  return (
    <SettingsModal
      open={isOpen}
      onClose={onClose}
      size="lg"
      bodyClassName="max-h-[80vh] overflow-y-auto px-6 py-6"
      hideCloseButton={saving}
      closeOnBackdrop={!saving}
      headerContent={
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
            <ListChecks className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">{heading}</p>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                รายละเอียดข้อตกลง <span className="text-red-500">*</span>
              </label>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(event) => {
                    setContent(event.target.value);
                    if (error) {
                      setError("");
                    }
                  }}
                  rows={8}
                  maxLength={MAX_LENGTH}
                  placeholder="ระบุรายละเอียดข้อตกลง ตัวอย่าง: ผลงานตีพิมพ์ที่ขอรับการสนับสนุนไม่เคยได้รับการจัดสรรทุนของมหาวิทยาลัยมาก่อน"
                  className="h-48 w-full resize-none rounded-lg border border-transparent bg-white px-4 py-3 text-sm text-gray-800 shadow-inner focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                  <span>สามารถเว้นบรรทัดเพื่อแสดงผลหลายบรรทัดได้</span>
                  <span className={remaining < 0 ? "font-medium text-red-500" : ""}>
                    {charCount.toLocaleString()} / {MAX_LENGTH.toLocaleString()} ตัวอักษร
                  </span>
                </div>
              </div>
              {error ? <p className="mt-2 text-sm text-red-500">{error}</p> : null}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? "กำลังบันทึก" : primaryLabel}
            </button>
          </div>
      </form>
    </SettingsModal>
  );
};

export default EndOfContractTermModal;