// StatusBadge.js - แสดง badge สถานะตาม status_id จาก database
"use client";

import React, { useMemo } from 'react';
import { useStatusMap } from '@/app/hooks/useStatusMap';

const STATUS_STYLES = {
  pending: {
    className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    style: {
      backgroundColor: '#fef3c7',
      color: '#92400e',
      borderColor: '#fcd34d',
    },
  },
  approved: {
    className: 'bg-green-100 text-green-800 border-green-300',
    style: {
      backgroundColor: '#d1fae5',
      color: '#065f46',
      borderColor: '#6ee7b7',
    },
  },
  rejected: {
    className: 'bg-red-100 text-red-800 border-red-300',
    style: {
      backgroundColor: '#fee2e2',
      color: '#991b1b',
      borderColor: '#fca5a5',
    },
  },
  revision: {
    className: 'bg-orange-100 text-orange-800 border-orange-300',
    style: {
      backgroundColor: '#fed7aa',
      color: '#9a3412',
      borderColor: '#fb923c',
    },
  },
  draft: {
    className: 'bg-gray-100 text-gray-600 border-gray-300',
    style: {
      backgroundColor: '#f3f4f6',
      color: '#4b5563',
      borderColor: '#d1d5db',
    },
  },
  unknown: {
    className: 'bg-gray-100 text-gray-600 border-gray-300',
    style: {
      backgroundColor: '#f3f4f6',
      color: '#4b5563',
      borderColor: '#d1d5db',
    },
  },
};

export default function StatusBadge({ statusId, fallbackLabel }) {
  const { byId, isLoading } = useStatusMap();
  const normalizedId = useMemo(() => {
    if (statusId == null) {
      return undefined;
    }
    const parsed = Number(statusId);
    return Number.isNaN(parsed) ? undefined : parsed;
  }, [statusId]);

  const status = normalizedId != null ? byId[normalizedId] : undefined;
  const statusCode = status?.status_code || 'unknown';
  const label = status?.status_name || fallbackLabel || (isLoading ? 'กำลังโหลด…' : 'ไม่ทราบสถานะ');
  const styleConfig = STATUS_STYLES[statusCode] || STATUS_STYLES.unknown;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styleConfig.className}`}
      style={{
        ...styleConfig.style,
        borderWidth: '1px',
        borderStyle: 'solid',
      }}
    >
      {label}
    </span>
  );
}