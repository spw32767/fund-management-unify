// StatusBadge.js - แสดง badge สถานะตาม status_id จาก database

import React from 'react';

export default function StatusBadge({ status, statusId }) {
  // Map status_id to display properties ตามข้อมูลจริงใน database
  const getStatusConfig = (id) => {
    const statusMap = {
      1: { // รอพิจารณา
        label: status || 'รอพิจารณา',
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-800',
        borderColor: 'border-yellow-200'
      },
      2: { // อนุมัติ
        label: status || 'อนุมัติ',
        bgColor: 'bg-green-100',
        textColor: 'text-green-800',
        borderColor: 'border-green-200'
      },
      3: { // ปฏิเสธ
        label: status || 'ปฏิเสธ',
        bgColor: 'bg-red-100',
        textColor: 'text-red-800',
        borderColor: 'border-red-200'
      },
      4: { // ต้องการข้อมูลเพิ่มเติม
        label: status || 'ต้องการข้อมูลเพิ่มเติม',
        bgColor: 'bg-orange-100',
        textColor: 'text-orange-800',
        borderColor: 'border-orange-200'
      },
      5: { // ร่าง (Draft)
        label: status || 'ร่าง',
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-600',
        borderColor: 'border-gray-200'
      }
    };

    // Default status if ID not found
    return statusMap[id] || {
      label: status || 'ไม่ทราบสถานะ',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-600',
      borderColor: 'border-gray-200'
    };
  };

  const config = getStatusConfig(statusId);

  return (
    <span className={`
      inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
      ${config.bgColor} ${config.textColor} border ${config.borderColor}
    `}>
      {config.label}
    </span>
  );
}