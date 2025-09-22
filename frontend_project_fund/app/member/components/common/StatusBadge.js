// StatusBadge.js - แสดง badge สถานะตาม status_id จาก database
"use client";

import React from 'react';

export default function StatusBadge({ status, statusId }) {
  // แปลง statusId เป็น number เพื่อให้แน่ใจ
  const id = parseInt(statusId);
  
  // Map status_id to display properties ตามข้อมูลจริงใน database
  const getStatusConfig = (statusIdNum) => {
    switch(statusIdNum) {
      case 1: // รอพิจารณา
        return {
          label: 'รอพิจารณา',
          className: 'bg-yellow-100 text-yellow-800 border-yellow-300'
        };
      case 2: // อนุมัติ
        return {
          label: 'อนุมัติ',
          className: 'bg-green-100 text-green-800 border-green-300'
        };
      case 3: // ปฏิเสธ
        return {
          label: 'ปฏิเสธ',
          className: 'bg-red-100 text-red-800 border-red-300'
        };
      case 4: // ต้องการข้อมูลเพิ่มเติม
        return {
          label: 'ต้องการข้อมูลเพิ่มเติม',
          className: 'bg-orange-100 text-orange-800 border-orange-300'
        };
      case 5: // ร่าง
        return {
          label: 'ร่าง',
          className: 'bg-gray-100 text-gray-600 border-gray-300'
        };
      default:
        return {
          label: status || 'ไม่ทราบสถานะ',
          className: 'bg-gray-100 text-gray-600 border-gray-300'
        };
    }
  };

  const config = getStatusConfig(id);

  // ใช้ inline styles เพื่อให้แน่ใจว่าสีแสดง
  const getInlineStyles = (statusIdNum) => {
    switch(statusIdNum) {
      case 1: // รอพิจารณา
        return {
          backgroundColor: '#fef3c7',
          color: '#92400e',
          borderColor: '#fcd34d'
        };
      case 2: // อนุมัติ
        return {
          backgroundColor: '#d1fae5',
          color: '#065f46',
          borderColor: '#6ee7b7'
        };
      case 3: // ปฏิเสธ
        return {
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          borderColor: '#fca5a5'
        };
      case 4: // ต้องการข้อมูลเพิ่มเติม
        return {
          backgroundColor: '#fed7aa',
          color: '#9a3412',
          borderColor: '#fb923c'
        };
      case 5: // ร่าง
        return {
          backgroundColor: '#f3f4f6',
          color: '#4b5563',
          borderColor: '#d1d5db'
        };
      default:
        return {
          backgroundColor: '#f3f4f6',
          color: '#4b5563',
          borderColor: '#d1d5db'
        };
    }
  };

  const inlineStyles = getInlineStyles(id);

  return (
    <span 
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}
      style={{
        ...inlineStyles,
        borderWidth: '1px',
        borderStyle: 'solid'
      }}
    >
      {config.label}
    </span>
  );
}