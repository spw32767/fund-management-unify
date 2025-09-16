// app/components/StatusBadge.js
import React from 'react';

const COLOR_MAP = {
  1: 'bg-yellow-100 text-yellow-800', // อยู่ระหว่างการพิจารณา
  2: 'bg-green-100 text-green-800',   // อนุมัติ
  3: 'bg-red-100 text-red-800',       // ไม่อนุมัติ
  4: 'bg-orange-100 text-orange-800', // ต้องแก้ไข
  5: 'bg-gray-100 text-gray-800',     // แบบร่าง / อื่น ๆ
};

const LABEL_MAP = {
  1: 'อยู่ระหว่างการพิจารณา',
  2: 'อนุมัติแล้ว',
  3: 'ไม่อนุมัติ',
  4: 'ต้องแก้ไข',
  5: 'แบบร่าง',
};

export default function StatusBadge({ statusId, className = '' }) {
  const colorClass = COLOR_MAP[statusId] || COLOR_MAP[5];
  const label = LABEL_MAP[statusId] || 'ไม่ทราบสถานะ';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass} ${className}`}
    >
      {label}
    </span>
  );
}
