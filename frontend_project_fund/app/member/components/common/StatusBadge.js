// StatusBadge.js - แสดง badge สถานะแบบ Dynamic รองรับทั้ง statusId และ statusCode (ตัวเลข)
"use client";

import React, { useMemo } from "react";
import { useStatusMap } from "@/app/hooks/useStatusMap";

/**
 * สไตล์ตาม "รหัสสถานะ (ตัวเลข)" จากฐานข้อมูล
 * 0: อยู่ระหว่างการพิจารณา (Admin) / pending
 * 1: อนุมัติ / approved
 * 2: ปฏิเสธ / rejected
 * 3: ขอข้อมูลเพิ่ม / revision
 * 4: ร่าง / draft
 * 5: อยู่ระหว่างการพิจารณาจากหัวหน้าสาขา (รอหัวหน้า) / pending (เฉดต่างกันเพื่อแยกสายตา)
 */
const STYLE_BY_CODE = {
  "0": { className: "bg-amber-100 text-amber-800 border-amber-300" },
  "1": { className: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  "2": { className: "bg-rose-100 text-rose-800 border-rose-300" },
  "3": { className: "bg-sky-100 text-sky-800 border-sky-300" },
  "4": { className: "bg-zinc-100 text-zinc-700 border-zinc-300" },
  "5": { className: "bg-indigo-100 text-indigo-800 border-indigo-300" },
};

// เพื่อรองรับโค้ดเดิมที่ใช้คีย์คำ (pending/approved/...)
const STYLE_BY_LEGACY_KEY = {
  pending: STYLE_BY_CODE["0"],
  approved: STYLE_BY_CODE["1"],
  rejected: STYLE_BY_CODE["2"],
  revision: STYLE_BY_CODE["3"],
  draft: STYLE_BY_CODE["4"],
  unknown: { className: "bg-gray-100 text-gray-600 border-gray-300" },
};

const DEFAULT_STYLE = STYLE_BY_LEGACY_KEY.unknown;

/**
 * Props ที่รองรับ:
 * - statusId: number | string  → หา status จาก useStatusMap()
 * - statusCode: number | string → ใช้เป็นรหัสสถานะโดยตรง (เช่น '5')
 * - label: string → ข้อความที่ต้องการแสดงโดยตรง (ถ้ามีจะมาก่อน)
 * - fallbackLabel: string → ข้อความสำรองถ้า label หาไม่เจอ
 * - status: string → alias เก่า (เทียบเท่า label)
 */
export default function StatusBadge({
  statusId,
  statusCode,
  label: labelProp,
  fallbackLabel,
  status, // alias เก่า
}) {
  const { byId, isLoading } = useStatusMap();

  // หา object สถานะจาก statusId (ถ้ามี)
  const statusObj = useMemo(() => {
    if (statusId == null) return undefined;
    const n = Number(statusId);
    if (Number.isNaN(n)) return undefined;
    return byId?.[n];
  }, [statusId, byId]);

  // code ที่จะใช้ตัดสินสี: มาก่อนคือ props.statusCode → statusObj.status_code
  const code = useMemo(() => {
    const c = statusCode ?? statusObj?.status_code;
    return c == null ? undefined : String(c);
  }, [statusCode, statusObj]);

  // label ที่จะโชว์: มาก่อนคือ props.label → statusObj.status_name → fallback → code → สถานะโหลด/ไม่ทราบ
  const label = useMemo(() => {
    return (
      labelProp ??
      status ??
      statusObj?.status_name ??
      fallbackLabel ??
      (code ? `สถานะ ${code}` : (isLoading ? "กำลังโหลด…" : "ไม่ทราบสถานะ"))
    );
  }, [labelProp, status, statusObj, fallbackLabel, code, isLoading]);

  // เลือกสไตล์: จาก code ตัวเลขก่อน → รองรับคีย์แบบ legacy → default
  const styleConfig =
    (code && STYLE_BY_CODE[code]) ||
    (statusObj?.status_code && STYLE_BY_LEGACY_KEY[statusObj.status_code]) ||
    DEFAULT_STYLE;

  return (
    <span
      className={[
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        styleConfig.className || DEFAULT_STYLE.className,
      ].join(" ")}
      style={{ borderWidth: 1 }}
    >
      {label}
    </span>
  );
}
