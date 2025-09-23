"use client";

// app/components/StatusBadge.js
import React, { useMemo } from 'react';
import { useStatusMap } from '@/app/hooks/useStatusMap';

const COLOR_MAP = {
  approved: 'bg-green-100 text-green-800 border-green-300',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  rejected: 'bg-red-100 text-red-800 border-red-300',
  revision: 'bg-orange-100 text-orange-800 border-orange-300',
  draft: 'bg-gray-100 text-gray-700 border-gray-300',
  unknown: 'bg-gray-100 text-gray-700 border-gray-300',
};

export default function StatusBadge({ statusId, className = '', fallbackLabel }) {
  const { byId, isLoading } = useStatusMap();

  const normalizedId = useMemo(() => {
    if (statusId == null) return undefined;
    const parsed = Number(statusId);
    return Number.isNaN(parsed) ? undefined : parsed;
  }, [statusId]);

  const status = normalizedId != null ? byId[normalizedId] : undefined;
  const code = status?.status_code || 'unknown';
  const label = status?.status_name || fallbackLabel || (isLoading ? 'กำลังโหลด…' : 'ไม่ทราบสถานะ');
  const colorClass = COLOR_MAP[code] || COLOR_MAP.unknown;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass} ${className}`}
      style={{ borderWidth: '1px' }}
    >
      {label}
    </span>
  );
}