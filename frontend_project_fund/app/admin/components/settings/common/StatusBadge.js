// components/common/StatusBadge.js
import React from "react";
import Swal from "sweetalert2";
import { ToggleRight, ToggleLeft } from "lucide-react";

/**
 * StatusBadge (v2)
 * - รองรับ status เป็น boolean หรือ "active"/"inactive"
 * - interactive: เปิดให้กดสลับสถานะ (default: false)
 * - confirm: ให้ badge ยืนยันเองก่อนเรียก onChange (default: false)
 * - onChange(next) : callback เมื่อยืนยันจะเปลี่ยนสถานะ
 * - activeLabel / inactiveLabel: ปรับข้อความได้
 * - disabled: ปิดการกด
 */
const StatusBadge = ({
  status,
  interactive = false,
  confirm = false,
  onChange,
  activeLabel = "เปิดใช้งาน",
  inactiveLabel = "ปิดใช้งาน",
  className = "",
  disabled = false,
}) => {
  // แปลงค่าให้เป็น boolean
  const isActive =
    typeof status === "boolean"
      ? status
      : String(status || "").toLowerCase() === "active";

  const baseClass =
    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border " +
    (isActive
      ? "bg-green-100 text-green-800 border-green-200"
      : "bg-red-100 text-red-800 border-red-200");

  const handleClick = async () => {
    if (!interactive || disabled || !onChange) return;

    const next = !isActive;

    if (confirm) {
      const res = await Swal.fire({
        title: "ยืนยันการเปลี่ยนสถานะ?",
        text: `ต้องการ${next ? "เปิด" : "ปิด"}การใช้งานรายการนี้หรือไม่?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "ยืนยัน",
        cancelButtonText: "ยกเลิก",
      });
      if (!res.isConfirmed) return;
    }

    try {
      await onChange(next);
    } catch (error) {
      console.error("Error changing status:", error);
      // แสดง error message
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: error.message || 'ไม่สามารถเปลี่ยนสถานะได้',
      });
    }
  };

  const content = (
    <>
      {isActive ? (
        <>
          <ToggleRight size={14} className="mr-1" />
          {activeLabel}
        </>
      ) : (
        <>
          <ToggleLeft size={14} className="mr-1" />
          {inactiveLabel}
        </>
      )}
    </>
  );

  if (interactive) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`${baseClass} ${className} ${disabled ? "opacity-60 cursor-not-allowed" : "hover:opacity-90"} `}
        disabled={disabled}
        title={isActive ? inactiveLabel : activeLabel}
      >
        {content}
      </button>
    );
  }

  return <span className={`${baseClass} ${className}`}>{content}</span>;
};

export default StatusBadge;
