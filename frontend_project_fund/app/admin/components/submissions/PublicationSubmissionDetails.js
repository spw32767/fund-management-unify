'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  FileText,
  User,
  BookOpen,
  Award,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Download,
  Eye,
  Users,
  Link,
  FileCheck,
  RefreshCcw,
  Check,
  BadgeCheck,
  ChevronDown,
  MessageCircle,
  X as XIcon,
} from 'lucide-react';

import PageLayout from '../common/PageLayout';
import Card from '../common/Card';
import { toast } from 'react-hot-toast';
import StatusBadge from '@/app/admin/components/common/StatusBadge';
import { useStatusMap } from '@/app/hooks/useStatusMap';

import apiClient from "@/app/lib/api";
import { adminAnnouncementAPI } from "@/app/lib/admin_announcement_api";
import { adminSubmissionAPI } from '@/app/lib/admin_submission_api';
import { rewardConfigAPI } from '@/app/lib/publication_api';
import adminAPI from '@/app/lib/admin_api';
import { notificationsAPI } from '@/app/lib/notifications_api';

import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

import { PDFDocument } from 'pdf-lib';

/* =========================
 * Helpers
 * ========================= */

const getStatusIcon = (statusCode) => {
  switch (statusCode) {
    case 'approved': return CheckCircle;
    case 'rejected': return XCircle;
    case 'revision': return AlertTriangle;
    case 'draft': return FileText;
    case 'pending':
    default: return Clock;
  }
};

// สีของไอคอนให้สอดคล้องกับ StatusBadge
const getStatusIconColor = (statusCode) => {
  switch (statusCode) {
    case 'approved': return 'text-green-600';
    case 'rejected': return 'text-red-600';
    case 'revision': return 'text-orange-600';
    case 'draft': return 'text-gray-500';
    case 'pending':
    default: return 'text-yellow-600';
  }
};

const getColoredStatusIcon = (statusCode) => {
  const Icon = getStatusIcon(statusCode);
  const color = getStatusIconColor(statusCode);
  // คืน "คอมโพเนนต์" ที่ Card จะเรียกใช้ (จะได้รับ props เช่น className/size)
  return function ColoredStatusIcon(props) {
    return <Icon {...props} className={`${props.className || ''} ${color}`} />;
  };
};


const formatDate = (dateString) => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
};


const formatCurrency = (n) =>
  Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatCurrencyParen = (n) =>
  `(${Number(Math.abs(n || 0)).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;

const getUserFullName = (user) => {
  if (!user) return '-';
  const firstName =
    user.user_fname ||
    user.first_name ||
    user.full_name?.split(' ')[0] ||
    user.fullname?.split(' ')[0] ||
    user.name?.split(' ')[0] ||
    '';
  const lastName =
    user.user_lname ||
    user.last_name ||
    user.full_name?.split(' ').slice(1).join(' ') ||
    user.fullname?.split(' ').slice(1).join(' ') ||
    user.name?.split(' ').slice(1).join(' ') ||
    '';
  const fullName = (user.full_name || user.fullname || `${firstName} ${lastName}`).trim();
  return fullName || '-';
};

const getUserEmail = (user) => (user?.email ? user.email : '');

const parseAmount = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const cleaned = value.replace(/,/g, '').trim();
    if (cleaned === '') return null;
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const deriveRequestedSummary = (pubDetail = {}, submission = {}) => {
  const rewardRaw = parseAmount(pubDetail?.reward_amount ?? submission?.reward_amount);
  const revisionRaw = parseAmount(
    pubDetail?.revision_fee ??
      pubDetail?.editing_fee ??
      submission?.revision_fee
  );
  const publicationRaw = parseAmount(
    pubDetail?.publication_fee ??
      pubDetail?.page_charge ??
      submission?.publication_fee
  );
  const externalRaw = parseAmount(
    pubDetail?.external_funding_amount ?? submission?.external_funding_amount
  );

  const hasBreakdown =
    rewardRaw != null || revisionRaw != null || publicationRaw != null;

  const fallbackTotals = [
    parseAmount(pubDetail?.total_amount),
    parseAmount(submission?.total_amount),
    parseAmount(submission?.requested_amount),
  ];

  let baseTotal = hasBreakdown
    ? (rewardRaw ?? 0) + (revisionRaw ?? 0) + (publicationRaw ?? 0)
    : fallbackTotals.find((v) => v != null);

  if (baseTotal == null) {
    baseTotal = (rewardRaw ?? 0) + (revisionRaw ?? 0) + (publicationRaw ?? 0);
  }

  let reward = rewardRaw;
  if (reward == null) {
    reward = hasBreakdown ? 0 : (baseTotal ?? 0);
  }
  const revision = revisionRaw ?? 0;
  const publication = publicationRaw ?? 0;
  const external = externalRaw ?? 0;

  const grossTotal = Math.max(0, baseTotal ?? 0);
  const netTotal = Math.max(0, grossTotal - external);

  return {
    reward,
    revision,
    publication,
    external,
    baseTotal: grossTotal,
    total: grossTotal,
    netTotal,
    hasBreakdown,
  };
};

const deriveApprovedSummary = (pubDetail = {}, submission = {}, requestedSummary) => {
  const rewardRaw = parseAmount(
    pubDetail?.reward_approve_amount ??
      pubDetail?.reward_approved_amount ??
      submission?.reward_approve_amount
  );
  const revisionRaw = parseAmount(
    pubDetail?.revision_fee_approve_amount ??
      pubDetail?.revision_fee_approved_amount ??
      submission?.revision_fee_approve_amount
  );
  const publicationRaw = parseAmount(
    pubDetail?.publication_fee_approve_amount ??
      pubDetail?.publication_fee_approved_amount ??
      submission?.publication_fee_approve_amount
  );

  const hasBreakdown =
    rewardRaw != null || revisionRaw != null || publicationRaw != null;

  const fallbackTotals = [
    parseAmount(pubDetail?.total_approve_amount),
    parseAmount(pubDetail?.approved_amount),
    parseAmount(submission?.approved_amount),
  ];

  let baseTotal = hasBreakdown
    ? (rewardRaw ?? 0) + (revisionRaw ?? 0) + (publicationRaw ?? 0)
    : fallbackTotals.find((v) => v != null);

  if (baseTotal == null && requestedSummary) {
    baseTotal = requestedSummary.baseTotal;
  }

  const external = requestedSummary?.external ??
    parseAmount(pubDetail?.external_funding_amount ?? submission?.external_funding_amount) ??
    0;

  const grossTotal = Math.max(0, baseTotal ?? 0);
  const netTotal = Math.max(0, grossTotal - external);

  return {
    reward: rewardRaw ?? (requestedSummary?.reward ?? 0),
    rewardRaw,
    revision: revisionRaw ?? (requestedSummary?.revision ?? 0),
    revisionRaw,
    publication: publicationRaw ?? (requestedSummary?.publication ?? 0),
    publicationRaw,
    external,
    baseTotal: grossTotal,
    total: grossTotal,
    netTotal,
    hasBreakdown,
  };
};

const extractFirstFilePath = (value) => {
  if (!value || typeof value !== 'object') return null;

  const candidates = [
    value.file_path,
    value.path,
    value.url,
    value.file_url,
    value.download_url,
    value.document_path,
    value.document_url,
    value.attachment_path,
    value.attachment_url,
    value.file?.file_path,
    value.file?.path,
    value.file?.url,
    value.file?.download_url,
    value.document?.file_path,
    value.document?.path,
    value.document?.url,
    value.Document?.file_path,
    value.Document?.path,
    value.Document?.url,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim() !== '') {
      return candidate.trim();
    }
  }

  const fileCollections = [value.files, value.Files, value.documents, value.Documents];
  for (const collection of fileCollections) {
    if (!Array.isArray(collection)) continue;
    for (const entry of collection) {
      const nested = extractFirstFilePath(entry);
      if (nested) return nested;
      if (typeof entry === 'string' && entry.trim() !== '') {
        return entry.trim();
      }
    }
  }

  return null;
};

const normalizeDocumentName = (name) =>
  (typeof name === 'string' ? name.trim().toLowerCase() : '');

const HIDDEN_MERGED_FORM_NAME = 'แบบฟอร์มคำร้องรวม (merged pdf)'.toLowerCase();
const HIDDEN_MERGED_FILE_REGEX = /_merged_document(?:_\d+)?\.pdf$/i;
const MERGED_FOLDER_SEGMENT = 'merge_submissions';

const getDocumentNameCandidates = (doc) => {
  if (!doc) return [];
  if (typeof doc === 'string') return [doc];

  return [
    doc.original_name,
    doc.file_name,
    doc.document_name,
    doc.name,
    doc.File?.file_name,
    doc.file?.file_name,
  ];
};

const getDocumentPathCandidates = (doc) => {
  if (!doc) return [];
  if (typeof doc === 'string') return [doc];

  const directPaths = [
    doc.file_path,
    doc.path,
    doc.url,
    doc.file?.file_path,
    doc.file?.path,
    doc.file?.url,
    doc.File?.file_path,
    doc.File?.path,
    doc.File?.url,
  ];

  const extracted = extractFirstFilePath(doc);
  if (extracted) {
    directPaths.push(extracted);
  }

  return directPaths;
};

const isMergedFormDocument = (doc) => {
  if (!doc) return false;

  const nameMatches = getDocumentNameCandidates(doc).some((candidate) => {
    const normalized = normalizeDocumentName(candidate);
    if (!normalized) return false;
    return (
      normalized === HIDDEN_MERGED_FORM_NAME ||
      HIDDEN_MERGED_FILE_REGEX.test(candidate.trim())
    );
  });

  if (nameMatches) return true;

  return getDocumentPathCandidates(doc).some((candidate) => {
    if (typeof candidate !== 'string') return false;
    const normalized = candidate.trim().toLowerCase();
    if (!normalized) return false;
    return (
      normalized.includes(MERGED_FOLDER_SEGMENT) ||
      HIDDEN_MERGED_FILE_REGEX.test(normalized)
    );
  });
};

const getDocumentFileId = (doc) => {
  if (!doc || typeof doc !== 'object') return null;
  return doc.file_id ?? doc.File?.file_id ?? doc.file?.file_id ?? null;
};

// ---------- Add: helpers for subcategory name from payload ----------
const firstNonEmpty = (...vals) => {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim() !== '') return v.trim();
  }
  return null;
};

const getSubcategoryName = (submission, pubDetail) => {
  // 1) จากรายละเอียดบทความ
  const fromDetail = firstNonEmpty(
    pubDetail?.subcategory_name_th,
    pubDetail?.subcategory_name,
    pubDetail?.fund_subcategory_name,
    pubDetail?.subcategory_label,
    pubDetail?.fund_subcategory_label
  );
  if (fromDetail) return fromDetail;

  // 2) จากฟิลด์แบนบน submission
  const fromSubmissionFlat = firstNonEmpty(
    submission?.subcategory_name_th,
    submission?.subcategory_name,
    submission?.fund_subcategory_name,
    submission?.subcategory_label,
    submission?.fund_subcategory_label
  );
  if (fromSubmissionFlat) return fromSubmissionFlat;

  // 3) จากอ็อบเจ็กต์ย่อย
  const subcatObj =
    submission?.subcategory ||
    submission?.fund_subcategory ||
    submission?.Subcategory ||
    submission?.FundSubcategory ||
    submission?.fundSubcategory;

  const fromObj = firstNonEmpty(
    subcatObj?.name_th,
    subcatObj?.title_th,
    subcatObj?.label_th,
    subcatObj?.name_en,
    subcatObj?.title_en,
    subcatObj?.label_en,
    subcatObj?.name,
    subcatObj?.title,
    subcatObj?.label
  );
  return fromObj || '-';
};

// ---------- Add: helpers for resolving names via adminAPI ----------
const pickCategoryName = (cat) => {
  const o = cat || {};
  const cands = [
    o.category_name,
    o.name_th, o.title_th, o.label_th,
    o.name, o.title, o.label,
    o.name_en, o.title_en, o.label_en,
  ].filter((v) => typeof v === 'string' && v.trim() !== '');
  return cands[0] || null;
};

const pickSubcategoryName = (sub) => {
  const o = sub || {};
  const cands = [
    o.subcategory_name,
    o.name_th, o.title_th, o.label_th,
    o.name, o.title, o.label,
    o.name_en, o.title_en, o.label_en,
  ].filter((v) => typeof v === 'string' && v.trim() !== '');
  return cands[0] || null;
};

async function fetchFundNamesWithAdminAPI({ categoryId, subcategoryId, yearId }) {
  const result = { category: null, subcategory: null };

  try {
    // Category
    if (categoryId != null) {
      const catsResp = await adminAPI.getCategories(yearId); // array / {data:[]}
      const catList = Array.isArray(catsResp) ? catsResp : (catsResp?.data || catsResp?.categories || []);
      const hit = (catList || []).find((c) => String(c.category_id ?? c.id) === String(categoryId));
      result.category = pickCategoryName(hit);
    }

    // Subcategory
    if (subcategoryId != null) {
      let subList = [];
      if (categoryId != null) {
        const resp = await adminAPI.getSubcategories(categoryId); // array / {data:[]}
        subList = Array.isArray(resp) ? resp : (resp?.data || resp?.subcategories || []);
      } else {
        const resp = await adminAPI.getAllSubcategories(null, yearId); // array / {data:[]}
        subList = Array.isArray(resp) ? resp : (resp?.data || resp?.subcategories || []);
      }
      const subHit = (subList || []).find((s) => String(s.subcategory_id ?? s.id) === String(subcategoryId));
      result.subcategory = pickSubcategoryName(subHit);
    }
  } catch (e) {
    console.warn('Failed to resolve fund names via adminAPI:', e);
  }

  return result;
}

/* ===== Reusable money inputs ===== */
function MoneyInput({
  value, onChange, error, bold = false, disabled = false, aria,
  max, min = 0, autoSyncWhenDisabled = false, helperRight = null,
}) {
  const sanitize = (raw) => {
    let only = raw.replace(/[^\d.]/g, '').replace(/(\..*?)\..*/g, '$1');
    const parts = only.split('.');
    if (parts[1] && parts[1].length > 2) only = parts[0] + '.' + parts[1].slice(0, 2);
    return only;
  };

  const [text, setText] = React.useState(() => (Number(value || 0) === 0 ? '' : String(value)));
  const [touched, setTouched] = React.useState(false);

  React.useEffect(() => {
    if (!touched || (autoSyncWhenDisabled && disabled)) {
      setText(Number(value || 0) === 0 ? '' : String(value));
    }
  }, [value, disabled, touched, autoSyncWhenDisabled]);

  const handleChange = (e) => {
    const raw = sanitize(e.target.value);
    setTouched(true);

    const num = raw === '' ? 0 : Number(raw);
    const upper = typeof max === 'number' ? max : Number.POSITIVE_INFINITY;
    const clamped = Math.min(Math.max(num, min), upper);

    if (num > upper) setText(String(upper));
    else setText(raw);

    onChange(clamped);
  };

  return (
    <div className="flex-grow flex flex-col items-end">
      <div
        className={[
          'inline-flex items-center rounded-md border bg-white shadow-sm transition-all',
          'focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500',
          error ? 'border-red-400' : 'border-gray-300 hover:border-blue-300',
          disabled ? 'opacity-60' : ''
        ].join(' ')}
      >
        <span className="px-3 text-gray-500 select-none">฿</span>
        <input
          aria-label={aria}
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          className={[
            'w-40 md:w-48 text-right font-mono tabular-nums bg-transparent',
            'py-2 pr-3 outline-none border-0',
            bold ? 'font-semibold' : 'font-medium'
          ].join(' ')}
          value={text}
          onChange={handleChange}
          disabled={disabled}
          onFocus={() => setTouched(true)}
        />
      </div>
      <div className="h-5 mt-1 flex items-center gap-2">
        {error ? <p className="text-red-600 text-xs text-right">{error}</p> : null}
        {helperRight}
      </div>
    </div>
  );
}

function ReadonlyMoney({ value, aria }) {
  return (
    <div className="flex-grow flex flex-col items-end">
      <div
        className={[
          'inline-flex items-center rounded-md border bg-gray-50 shadow-sm transition-all',
          'border-gray-300 text-gray-600 opacity-80'
        ].join(' ')}
      >
        <span className="px-3 text-gray-500 select-none">฿</span>
        <input
          aria-label={aria}
          type="text"
          readOnly
          className="w-40 md:w-48 text-right font-mono tabular-nums bg-transparent py-2 pr-3 outline-none border-0"
          value={Number(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        />
      </div>
      <div className="h-5 mt-1" />
    </div>
  );
}

const DECISION_OPTIONS = [
  {
    value: 'approve',
    label: 'อนุมัติ',
    hint: 'บันทึกผลเป็นอนุมัติ',
    description: 'อนุมัติคำร้องและบันทึกจำนวนเงินที่อนุมัติ',
    icon: CheckCircle,
    iconClass: 'text-emerald-600',
    iconBg: 'bg-emerald-50',
    activeRing: 'ring-emerald-200',
  },
  {
    value: 'reject',
    label: 'ไม่อนุมัติ',
    hint: 'เปลี่ยนสถานะเป็นไม่อนุมัติ',
    description: 'ปฏิเสธคำร้องและระบุเหตุผลประกอบ',
    icon: XCircle,
    iconClass: 'text-red-600',
    iconBg: 'bg-red-50',
    activeRing: 'ring-red-200',
  },
  {
    value: 'revision',
    label: 'ต้องการข้อมูลเพิ่มเติม',
    hint: 'แจ้งผู้ยื่นให้ส่งข้อมูลเพิ่ม',
    description: 'ส่งคำขอข้อมูลเพิ่มเติมโดยใช้หมายเหตุของผู้ดูแลระบบ',
    icon: MessageCircle,
    iconClass: 'text-amber-600',
    iconBg: 'bg-amber-50',
    activeRing: 'ring-amber-200',
  },
];

function DecisionDropdown({ value, onChange, disabled = false, className = '' }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const selectedOption = useMemo(() => {
    return DECISION_OPTIONS.find((option) => option.value === value) || DECISION_OPTIONS[0];
  }, [value]);

  useEffect(() => {
    if (!open) return undefined;

    const handleClick = (event) => {
      if (
        buttonRef.current?.contains(event.target) ||
        menuRef.current?.contains(event.target)
      ) {
        return;
      }
      setOpen(false);
    };

    const handleKey = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    document.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  useEffect(() => {
    if (disabled) {
      setOpen(false);
    }
  }, [disabled]);

  const handleSelect = (nextValue) => {
    if (typeof onChange === 'function') {
      onChange(nextValue);
    }
    setOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        ref={buttonRef}
        onClick={() => setOpen((prev) => !prev)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={[
          'inline-flex w-full items-center gap-3 rounded-lg border border-gray-300 bg-white px-3 py-2',
          'text-sm font-medium text-gray-700 shadow-sm transition',
          'hover:border-blue-300 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500',
          'disabled:cursor-not-allowed disabled:opacity-60',
        ].join(' ')}
      >
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-full ${selectedOption.iconBg} ${open ? `ring-2 ring-offset-2 ${selectedOption.activeRing}` : ''}`}
        >
          <selectedOption.icon className={`h-5 w-5 ${selectedOption.iconClass}`} />
        </span>
        <span className="flex flex-1 flex-col text-left">
          <span className="text-sm font-semibold text-gray-900">{selectedOption.label}</span>
          <span className="text-xs text-gray-500">{selectedOption.hint}</span>
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          ref={menuRef}
          role="listbox"
          className="absolute left-0 bottom-full z-50 mb-2 w-72 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl ring-1 ring-black/5"
        >
          <div className="py-1">
            {DECISION_OPTIONS.map((option) => {
              const active = option.value === selectedOption.value;
              return (
                <button
                  type="button"
                  key={option.value}
                  role="option"
                  aria-selected={active}
                  onClick={() => handleSelect(option.value)}
                  className={[
                    'flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition',
                    active ? 'bg-blue-50/70 text-gray-900' : 'text-gray-700 hover:bg-gray-50',
                  ].join(' ')}
                >
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${option.iconBg} ${active ? `ring-2 ring-offset-2 ${option.activeRing}` : ''}`}
                  >
                    <option.icon className={`h-5 w-5 ${option.iconClass}`} />
                  </span>
                  <span className="flex-1">
                    <span className="block font-semibold">{option.label}</span>
                    <span className="block text-xs text-gray-500">{option.description}</span>
                  </span>
                  {active ? <Check className="h-4 w-4 text-blue-600" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================
 * Approval Panel (admin-only)
 * ========================= */
function ApprovalPanel({ submission, pubDetail, requestedSummary, approvedSummary, onApprove, onReject, onRequestRevision }) {
  const statusId = Number(submission?.status_id);
  const approvable = statusId === 1; // อยู่ระหว่างการพิจารณา
  if (!approvable) {
    const requestedTotal = Number(
      requestedSummary?.netTotal ?? requestedSummary?.total ?? 0
    );
    const approvedTotalNumber = Number(
      approvedSummary?.netTotal ?? approvedSummary?.total ?? 0
    );

    const announceValue =
      pubDetail?.announce_reference_number ||
      submission?.announce_reference_number ||
      submission?.announce_reference ||
      '';

    const adminCommentValue = submission?.admin_comment ?? '';

    const rejectionReason =
      submission?.admin_rejection_reason ??
      submission?.head_rejection_reason ??
      submission?.admin_rejected ??
      '';

    return (
      <Card title="ผลการพิจารณา (Approval Result)" icon={DollarSign} collapsible={false}>
        <div className="space-y-4 text-sm">
          <div className="flex items-start justify-between">
            <span className="text-gray-600">สถานะ</span>
            <span className="font-medium">
              <StatusBadge
                statusId={submission?.status_id}
                fallbackLabel={submission?.status?.status_name}
              />
            </span>
          </div>

          <div className="flex items-start justify-between">
            <span className="text-gray-600">จำนวนที่ขอ</span>
            <span className="font-semibold text-blue-700">฿{formatCurrency(requestedTotal)}</span>
          </div>

          <div className="flex items-start justify-between">
            <span className="text-gray-600">จำนวนที่อนุมัติ</span>
            <span className="font-semibold text-green-700">
              {Number.isFinite(approvedTotalNumber) ? `฿${formatCurrency(approvedTotalNumber)}` : '—'}
            </span>
          </div>

          <div className="flex items-start justify-between">
            <span className="text-gray-600">หมายเลขอ้างอิงประกาศผลการพิจารณา</span>
            <span className="font-medium break-all">{announceValue || '—'}</span>
          </div>

          <div>
            <div className="text-gray-600 mb-1">หมายเหตุของผู้ดูแลระบบ</div>
            <div className="rounded-md border border-gray-200 bg-gray-50 p-2 min-h-[40px] whitespace-pre-wrap break-words">
              {adminCommentValue || '—'}
            </div>
          </div>

          {rejectionReason && (
            <div>
              <div className="text-gray-600 mb-1">เหตุผลการไม่อนุมัติ</div>
              <div className="rounded-md border border-gray-200 bg-gray-50 p-2 min-h-[40px] whitespace-pre-wrap break-words">
                {rejectionReason}
              </div>
            </div>
          )}
        </div>
      </Card>
    );
  }

  // Defaults from "ข้อมูลการเงิน"
  const requestedReward = requestedSummary?.reward ??
    parseAmount(pubDetail?.reward_amount ?? submission?.reward_amount) ??
    0;
  const requestedRevision = requestedSummary?.revision ??
    parseAmount(
      pubDetail?.revision_fee ??
      pubDetail?.editing_fee ??
      submission?.revision_fee
    ) ??
    0;
  const requestedPublication = requestedSummary?.publication ??
    parseAmount(
      pubDetail?.publication_fee ??
      pubDetail?.page_charge ??
      submission?.publication_fee
    ) ??
    0;
  const extFunding = requestedSummary?.external ??
    parseAmount(pubDetail?.external_funding_amount ?? submission?.external_funding_amount) ??
    0;
  const requestedBaseTotal = requestedSummary?.baseTotal ?? (
    Number(requestedReward || 0) +
    Number(requestedRevision || 0) +
    Number(requestedPublication || 0)
  );

  // ใช้ค่าที่อนุมัติแล้วถ้ามี, ถ้าไม่มีให้ใช้ค่าที่ขอ
  // *แก้ไขตามที่ผู้ใช้ร้องขอ: เพื่อให้ 'เงินรางวัลที่จะอนุมัติ' แสดงค่า default เป็น 'เงินรางวัลที่ขอ'
  // หาก approvedSummary?.rewardRaw เป็นค่า falsy (null, undefined, 0) จะใช้ requestedReward แทน
  // ซึ่งจะทำให้ค่าเริ่มต้นแสดงเป็นค่าที่ขอ หากยังไม่มีการบันทึกค่าอนุมัติที่ชัดเจน
  const rewardAutoValue = requestedReward;
  const approvedRevisionDefault =
    approvedSummary?.revisionRaw ?? requestedRevision;
  const approvedPublicationDefault =
    approvedSummary?.publicationRaw ?? requestedPublication;
  const requestedNetDefault = Math.max(
    0,
    Number(requestedBaseTotal || 0) - Number(extFunding || 0)
  );
  const approvedTotalDefault =
    approvedSummary?.netTotal ?? requestedNetDefault;

  // Approved values
  const [rewardApprove, setRewardApprove] = useState(rewardAutoValue);
  const [revisionApprove, setRevisionApprove] = useState(approvedRevisionDefault);
  const [publicationApprove, setPublicationApprove] = useState(approvedPublicationDefault);
  const [totalApprove, setTotalApprove] = useState(approvedTotalDefault);

  const [announceRef, setAnnounceRef] = useState(pubDetail?.announce_reference_number || '');

  // Shared cap from announcement
  const [feeCap, setFeeCap] = useState(null);
  const [capLoading, setCapLoading] = useState(false);
  const [capError, setCapError] = useState(null);

  const [manualEdit, setManualEdit] = useState(false);
  const [adminComment, setAdminComment] = useState(
    submission?.admin_comment ??
      ''
  );
  const [saving, setSaving] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState('approve');
  const [decisionPending, setDecisionPending] = useState(false);
  const [errors, setErrors] = useState({});

  // ซ่อน 2 ฟิลด์เมื่อไม่พบเพดาน
  const hideSharedFeeFields = !!capError && /ไม่สามารถเบิกค่าใช้จ่ายนี้ได้/.test(capError);

  const revisionAutoValue = hideSharedFeeFields ? 0 : requestedRevision;
  const publicationAutoValue = hideSharedFeeFields ? 0 : requestedPublication;

  useEffect(() => {
    setManualEdit(false);
  }, [submission?.submission_id]);

  useEffect(() => {
    setAdminComment(
      submission?.admin_comment ??
        ''
    );
  }, [submission?.admin_comment, submission?.status_id]);

  // โหลดเพดานจาก reward config
  useEffect(() => {
    const fetchCap = async () => {
      try {
        setCapLoading(true);
        setCapError(null);

        const qCode = String(pubDetail?.quartile || pubDetail?.journal_quartile || '')
          .toUpperCase()
          .trim();

        // ปี พ.ศ.
        let yearBE = null;
        if (pubDetail?.publication_year) {
          yearBE = String(pubDetail.publication_year);
        } else if (pubDetail?.publication_date) {
          const d = new Date(pubDetail.publication_date);
          if (!isNaN(d.getTime())) yearBE = String(d.getFullYear() + 543);
        }
        if (!yearBE) yearBE = String(new Date().getFullYear() + 543);

        if (!qCode) {
          setFeeCap(null);
          setCapError('ไม่พบข้อมูล Quartile สำหรับคำนวณวงเงิน');
          return;
        }

        const resp = await rewardConfigAPI.lookupMaxAmount(yearBE, qCode);
        const maxAmount = Number(resp?.max_amount);
        if (!maxAmount || maxAmount <= 0) {
          setFeeCap(null);
          setCapError('ไม่สามารถเบิกค่าใช้จ่ายนี้ได้');
          return;
        }
        setFeeCap(maxAmount);
      } catch (err) {
        console.error('Failed to fetch shared fee cap:', err);
        setFeeCap(null);
        setCapError('ดึงจำนวนเงินวงเงินไม่สำเร็จ');
      } finally {
        setCapLoading(false);
      }
    };

    fetchCap();
  }, [pubDetail?.quartile, pubDetail?.journal_quartile, pubDetail?.publication_year, pubDetail?.publication_date]);

  const applyAutoSharedFeeValues = React.useCallback(() => {
    if (hideSharedFeeFields) {
      setRevisionApprove(0);
      setPublicationApprove(0);
      return;
    }

    setRevisionApprove(revisionAutoValue);
    setPublicationApprove(publicationAutoValue);
  }, [hideSharedFeeFields, revisionAutoValue, publicationAutoValue]);

  // เติมค่าอัตโนมัติเมื่อไม่เปิดโหมดแก้ไข
  useEffect(() => {
    if (manualEdit) return;
    setRewardApprove(rewardAutoValue);
    applyAutoSharedFeeValues();
  }, [manualEdit, rewardAutoValue, applyAutoSharedFeeValues]);

  const handleToggleManualEdit = React.useCallback(() => {
    setManualEdit((prev) => !prev);
  }, []);


  // รวมอัตโนมัติ (Total อ่านอย่างเดียว)
  useEffect(() => {
    const sum =
      Number(rewardApprove || 0) +
      Number(revisionApprove || 0) +
      Number(publicationApprove || 0);
    const net = Math.max(0, sum - Number(extFunding || 0));
    setTotalApprove(net);
  }, [rewardApprove, revisionApprove, publicationApprove, extFunding]);

  // Clamp helper สำหรับวงเงินร่วม (Revision+Publication)
  const clampShared = (val, other) => {
    const n = Number.isFinite(val) ? val : 0;
    if (feeCap == null) return Math.max(0, n);
    const remain = Math.max(0, feeCap - Math.max(0, other || 0));
    return Math.max(0, Math.min(n, remain));
  };

  const renderCapHelper = () => {
    if (capLoading) return <p className="text-gray-500 text-xs">กำลังโหลดเพดานวงเงิน…</p>;
    if (capError)   return <p className="text-red-600 text-xs">{capError}</p>;
    if (typeof feeCap === 'number') {
      const used = Number(revisionApprove || 0) + Number(publicationApprove || 0);
      const remain = Math.max(0, feeCap - used);
      return (
        <p className="text-gray-500 text-[11px]">
          ใช้วงเงินร่วม: ฿{formatCurrency(feeCap)} (คงเหลือ ฿{formatCurrency(remain)})
        </p>
      );
    }
    return null;
  };

  // เปลี่ยนค่าเมื่อเปิดสวิตช์
  const handleChangeReward = (next) => {
    if (!manualEdit) return;
    let n = Number(next || 0);
    if (Number.isNaN(n) || n < 0) n = 0;
    if (n > requestedReward) n = requestedReward; // ล็อกไม่เกินที่ขอ
    setRewardApprove(n);
    setErrors((prev) => ({ ...prev, rewardApprove: undefined }));
  };

  const handleChangeRevision = (next) => {
    if (!manualEdit || feeCap == null) return;
    const clamped = clampShared(Number(next || 0), publicationApprove);
    setRevisionApprove(clamped);
    setErrors((e) => ({ ...e, sharedCap: undefined, revisionApprove: undefined }));
  };

  const handleChangePublication = (next) => {
    if (!manualEdit || feeCap == null) return;
    const clamped = clampShared(Number(next || 0), revisionApprove);
    setPublicationApprove(clamped);
    setErrors((e) => ({ ...e, sharedCap: undefined, publicationApprove: undefined }));
  };

  // ตรวจสอบก่อนบันทึก
  const validate = () => {
    const e = {};
    const checkNonNeg = (k, v) => {
      const num = Number(v);
      if (Number.isNaN(num)) e[k] = 'กรุณากรอกตัวเลขที่ถูกต้อง';
      else if (num < 0) e[k] = 'จำนวนต้องไม่เป็นค่าติดลบ';
    };

    checkNonNeg('rewardApprove', rewardApprove);

    if (feeCap != null) {
      checkNonNeg('revisionApprove', revisionApprove);
      checkNonNeg('publicationApprove', publicationApprove);
    }
    checkNonNeg('totalApprove', totalApprove);

    if (feeCap != null) {
      const sum = Number(revisionApprove || 0) + Number(publicationApprove || 0);
      if (sum > feeCap) {
        e.sharedCap = 'ยอดรวมเกินวงเงินร่วม';
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // รีเซ็ตกลับค่าเริ่มต้นจาก FI/คำขอ
  const recalc = () => {
    setRewardApprove(rewardAutoValue);
    applyAutoSharedFeeValues();
  };

  const escapeHtml = (value = '') =>
    String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  // ยืนยันอนุมัติ
  const confirmApprove = async () => {
    if (!validate()) return false;

    const capHint =
      typeof feeCap === 'number' && feeCap > 0
        ? `<div style="font-size:12px;color:#6b7280;margin:.25rem 0 0;">
             วงเงินร่วมสำหรับค่าปรับปรุง & ค่าธรรมเนียมการตีพิมพ์: ฿${formatCurrency(feeCap)}
           </div>`
        : '';

    const html = `
          <div style="
            text-align:left;
            font-size:14px;
            line-height:1.6;
            display:grid;
            row-gap:.6rem; 
          ">

            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span>เงินรางวัลที่จะอนุมัติ</span>
              <strong>฿${formatCurrency(rewardApprove)}</strong>
            </div>

            ${hideSharedFeeFields ? '' : `
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span>ค่าปรับปรุงบทความที่จะอนุมัติ</span>
                <strong>฿${formatCurrency(revisionApprove)}</strong>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span>ค่าธรรมเนียมการตีพิมพ์ที่จะอนุมัติ</span>
                <strong>฿${formatCurrency(publicationApprove)}</strong>
              </div>
            `}

            <hr style="margin:1rem 0 1rem;border-color:#999999;" />

            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-weight:700;">รวมจำนวนเงินที่อนุมัติ</span>
              <span style="font-weight:700;color:#047857;">฿${formatCurrency(totalApprove)}</span>
            </div>

            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-weight:700;">หมายเลขอ้างอิงประกาศผลการพิจารณา</span>
              <strong>${announceRef ? escapeHtml(announceRef) : '—'}</strong>
            </div>

            ${adminComment ? `
              <div style="display:flex;flex-direction:column;gap:.35rem;">
                <span style="font-weight:500;">หมายเหตุของผู้ดูแลระบบ</span>
                <div style="border:1px solid #e5e7eb;background:#f9fafb;padding:.75rem;border-radius:.5rem;white-space:pre-wrap;">
                  ${escapeHtml(adminComment)}
                </div>
              </div>
            ` : ''}

            ${capHint}
            <p style="font-size:12px;color:#6b7280;">
              จำนวนเงินที่จะอนุมัติจะถูกบันทึกและสถานะคำร้องจะเปลี่ยนเป็น “อนุมัติ”
            </p>
          </div>
        `;


    const result = await Swal.fire({
      title: 'ยืนยันการอนุมัติ',
      html,
      icon: 'question',
      padding: '1.6rem',          // << เพิ่มพื้นที่รอบเนื้อหา
      width: 600,                 // (ตัวเลือก) ทำให้โปร่งขึ้นเล็กน้อย
      showCancelButton: true,
      confirmButtonText: 'ยืนยันอนุมัติ',
      cancelButtonText: 'ยกเลิก',
      focusConfirm: false,
      showLoaderOnConfirm: true,
      allowOutsideClick: () => !Swal.isLoading(),
      preConfirm: async () => {
        try {
          setSaving(true);

          // อนุมัติบนระบบหลัก
          await onApprove({
            reward_approve_amount: Number(rewardApprove),
            revision_fee_approve_amount: hideSharedFeeFields ? 0 : Number(revisionApprove),
            publication_fee_approve_amount: hideSharedFeeFields ? 0 : Number(publicationApprove),
            total_approve_amount: Number(totalApprove),
            announce_reference_number: announceRef.trim() || null,
            admin_comment: adminComment.trim() || null,
          });

          // NEW: แจ้งเตือน + ส่งอีเมล (best-effort; ไม่ให้พัง flow อนุมัติ)
          try {
            await notificationsAPI.notifySubmissionApproved(
              submission?.submission_id,
              { announce_reference_number: announceRef?.trim() || '' }
            );
          } catch (err) {
            console.warn('notify approved failed:', err);
            // ไม่ throw — เพื่อไม่ให้ Swal แสดง validation error
          }

        } catch (e) {
          Swal.showValidationMessage(e?.message || 'อนุมัติไม่สำเร็จ');
          throw e;
        } finally {
          setSaving(false);
        }
      },
    });

    if (result.isConfirmed) {
      await Swal.fire({
        icon: 'success',
        title: 'อนุมัติแล้ว',
        timer: 1400,
        showConfirmButton: false,
      });
      return true;
    }

    return false;
  };

  // ยืนยันไม่อนุมัติ
  const confirmReject = async () => {
    const { value: reason } = await Swal.fire({
      title: 'เหตุผลการไม่อนุมัติ',
      input: 'textarea',
      inputPlaceholder: 'โปรดระบุเหตุผล...',
      inputAttributes: { 'aria-label': 'เหตุผลการไม่อนุมัติ' },
      showCancelButton: true,
      confirmButtonText: 'ยืนยันไม่อนุมัติ',
      cancelButtonText: 'ยกเลิก',
      inputValidator: (value) => (!value?.trim() ? 'กรุณาระบุเหตุผล' : undefined),
    });
    if (!reason) return false;

    const trimmedReason = String(reason).trim();

    const html = `
      <div style="text-align:left;font-size:14px;">
        <div style="font-weight:500;margin-bottom:.25rem;">เหตุผลการไม่อนุมัติ</div>
        <div style="border:1px solid #e5e7eb;background:#f9fafb;padding:.75rem;border-radius:.5rem;white-space:pre-wrap;">
          ${escapeHtml(trimmedReason)}
        </div>
        <p style="font-size:12px;color:#6b7280;margin-top:.5rem;">
          ระบบจะบันทึกเหตุผลและเปลี่ยนสถานะคำร้องเป็น “ไม่อนุมัติ”
        </p>
      </div>
    `;

    const result = await Swal.fire({
      title: 'ยืนยันการไม่อนุมัติ',
      html,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ยืนยันไม่อนุมัติ',
      cancelButtonText: 'ยกเลิก',
      focusConfirm: false,
      showLoaderOnConfirm: true,
      allowOutsideClick: () => !Swal.isLoading(),
      preConfirm: async () => {
        try {
          setSaving(true);
          await onReject(trimmedReason);

          // NEW: แจ้งเตือน + ส่งอีเมล (best-effort)
          try {
            await notificationsAPI.notifySubmissionRejected(
              submission?.submission_id,
              { reason: trimmedReason || '' }
            );
          } catch (e) {
            console.warn('notify rejected failed:', e);
            // ไม่ throw — ไม่ให้บล็อก flow
          }
        } catch (e) {
          Swal.showValidationMessage(e?.message || 'ไม่อนุมัติไม่สำเร็จ');
          throw e;
        } finally {
          setSaving(false);
        }
      },
    });

    if (result.isConfirmed) {
      await Swal.fire({
        icon: 'success',
        title: 'ดำเนินการแล้ว',
        timer: 1200,
        showConfirmButton: false,
      });
      return true;
    }

    return false;
  };

  const confirmRequestRevision = async () => {
    if (typeof onRequestRevision !== 'function') {
      return false;
    }

    const trimmed = adminComment?.trim() || '';
    if (!trimmed) {
      setErrors((prev) => ({
        ...prev,
        adminComment: 'กรุณาระบุหมายเหตุเพื่อขอข้อมูลเพิ่มเติม',
      }));
      await Swal.fire({
        icon: 'warning',
        title: 'กรุณาระบุหมายเหตุ',
        text: 'โปรดกรอกหมายเหตุของผู้ดูแลระบบก่อนขอข้อมูลเพิ่มเติม',
      });
      return false;
    }

    const result = await Swal.fire({
      title: 'ยืนยันการขอข้อมูลเพิ่มเติม',
      html: `
        <div style="text-align:left;font-size:14px;line-height:1.6;display:grid;row-gap:.75rem;">
          <div>
            <div style="font-weight:500;margin-bottom:.35rem;">หมายเหตุของผู้ดูแลระบบ</div>
            <div style="border:1px solid #e5e7eb;background:#f9fafb;padding:.75rem;border-radius:.75rem;white-space:pre-wrap;">${escapeHtml(trimmed)}</div>
          </div>
          <p style="font-size:12px;color:#6b7280;">ระบบจะบันทึกคำขอข้อมูลเพิ่มเติมและแจ้งผู้ยื่นคำร้อง</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'บันทึกคำขอ',
      cancelButtonText: 'ยกเลิก',
      focusConfirm: false,
      showLoaderOnConfirm: true,
      allowOutsideClick: () => !Swal.isLoading(),
      preConfirm: async () => {
        try {
          setSaving(true);
          await onRequestRevision({ message: trimmed, adminComment: trimmed });
        } catch (e) {
          Swal.showValidationMessage(e?.message || 'ส่งคำขอไม่สำเร็จ');
          throw e;
        } finally {
          setSaving(false);
        }
      },
    });

    if (result.isConfirmed) {
      setErrors((prev) => {
        if (!prev.adminComment) return prev;
        const next = { ...prev };
        delete next.adminComment;
        return next;
      });

      await Swal.fire({
        icon: 'success',
        title: 'ส่งคำขอแล้ว',
        timer: 1400,
        showConfirmButton: false,
      });
      return true;
    }

    return false;
  };

  const handleDecisionSubmit = async () => {
    if (decisionPending || saving) return;

    setDecisionPending(true);
    try {
      let completed = false;
      if (selectedDecision === 'approve') {
        completed = await confirmApprove();
      } else if (selectedDecision === 'reject') {
        completed = await confirmReject();
      } else if (selectedDecision === 'revision') {
        completed = await confirmRequestRevision();
      }

      if (completed) {
        setSelectedDecision('approve');
      }
    } finally {
      setDecisionPending(false);
    }
  };

  return (
    <Card title="ผลการพิจารณา (Approval Result)" icon={DollarSign} collapsible={false}>
      <div className="space-y-4">
        {/* Header: only Approved column */}
        <div className="grid grid-cols-2 pb-2 border-b text-sm text-gray-600">
          <div></div>
          <div className="text-right">
            <div>จำนวนเงินที่จะอนุมัติ</div>
            <div className="text-xs text-gray-500">Approve Amount</div>
          </div>
        </div>

        {/* Reward */}
        <div className="grid grid-cols-2 items-center min-h-[76px]">
          <label className="block text-sm font-medium text-gray-700 leading-tight">
            เงินรางวัลที่จะอนุมัติ
            <br /><span className="text-xs font-normal text-gray-600">Approve Reward Amount</span>
          </label>
          <MoneyInput
            aria="Approved reward amount"
            value={rewardApprove}
            onChange={handleChangeReward}
            error={errors.rewardApprove}
            max={requestedReward}
            helperRight={null}
            disabled={!manualEdit}
            autoSyncWhenDisabled
          />
        </div>

        {/* Revision — always visible; disabled if no cap */}
        <div className="grid grid-cols-2 items-center min-h-[76px]">
          <label className="block text-sm font-medium text-gray-700 leading-tight">
            ค่าปรับปรุงบทความที่จะอนุมัติ
            <br /><span className="text-xs font-normal text-gray-600">Approve Manuscript Editing Fee</span>
          </label>
          <MoneyInput
            aria="Approved revision fee"
            value={revisionApprove}
            onChange={handleChangeRevision}
            error={errors.revisionApprove || errors.sharedCap}
            helperRight={renderCapHelper()}
            disabled={!manualEdit || capLoading || feeCap == null}
            max={feeCap == null ? undefined : Math.max(0, feeCap - Number(publicationApprove || 0))}
            autoSyncWhenDisabled
          />
        </div>

        {/* Publication — always visible; disabled if no cap */}
        <div className="grid grid-cols-2 items-center min-h-[76px]">
          <label className="block text-sm font-medium text-gray-700 leading-tight">
            ค่าธรรมเนียมการตีพิมพ์ที่จะอนุมัติ
            <br /><span className="text-xs font-normal text-gray-600">Approve Page Charge</span>
          </label>
          <MoneyInput
            aria="Approved publication fee"
            value={publicationApprove}
            onChange={handleChangePublication}
            error={errors.publicationApprove || errors.sharedCap}
            helperRight={renderCapHelper()}
            disabled={!manualEdit || capLoading || feeCap == null}
            max={feeCap == null ? undefined : Math.max(0, feeCap - Number(revisionApprove || 0))}
            autoSyncWhenDisabled
          />
        </div>

        {/* External funding (read-only) */}
        {extFunding > 0 && (
          <div className="grid grid-cols-2 items-center">
            <label className="block text-sm font-medium text-gray-700">
              เงินสนับสนุนจากภายนอก
              <br /><span className="text-xs font-normal text-gray-600">External Funding</span>
            </label>
            <ReadonlyMoney aria="External funding amount (readonly)" value={extFunding} />
          </div>
        )}

        {/* Total (read-only) + switch + recalc */}
        <div className="grid grid-cols-2 items-center pt-2 border-t min-h-[76px]">
          <label className="block font-medium text-gray-700 leading-tight">
            รวมจำนวนเงินที่อนุมัติ
            <div className="text-xs font-normal text-gray-600 flex items-center gap-3 mt-1">
              <div className="inline-flex items-center gap-2">
                <button
                  type="button"
                  role="switch"
                  aria-checked={manualEdit}
                  onClick={handleToggleManualEdit}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                    manualEdit ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      manualEdit ? 'translate-x-4' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span>ปรับแก้ข้อมูล</span>
              </div>
              <button
                className="btn btn-ghost btn-xs inline-flex items-center gap-1"
                type="button"
                onClick={recalc}
              >
                <RefreshCcw size={14} /> Recalculate
              </button>
            </div>
          </label>
          <ReadonlyMoney aria="Total approved amount (readonly)" value={totalApprove} />
        </div>

        <div className="space-y-6">
          {/* Announcement number */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700 leading-tight">
              หมายเลขอ้างอิงประกาศผลการพิจารณา
              <br /><span className="text-xs font-normal text-gray-600">Announcement Ref.</span>
            </label>
            <div
              className="w-full rounded-md border bg-white shadow-sm transition-all border-gray-300 hover:border-blue-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500"
            >
              <input
                type="text"
                className="w-full p-2.5 rounded-md outline-none bg-transparent"
                placeholder="เช่น 123/2568"
                value={announceRef}
                onChange={(e) => setAnnounceRef(e.target.value)}
              />
            </div>
          </div>

          {/* Admin comment */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700 leading-tight">
              หมายเหตุของผู้ดูแลระบบ
              <br /><span className="text-xs font-normal text-gray-600">Admin Comment</span>
            </label>
            <div
              className={[
                'rounded-md border bg-white shadow-sm transition-all',
                'border-gray-300 hover:border-blue-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500',
                errors.adminComment ? 'border-red-400 focus-within:border-red-500 focus-within:ring-red-500/40' : '',
              ].join(' ')}
            >
              <textarea
                className="w-full p-3 rounded-md outline-none bg-transparent resize-y min-h-[96px]"
                value={adminComment}
                onChange={(e) => {
                  const next = e.target.value;
                  setAdminComment(next);
                  setErrors((prev) => {
                    if (!prev.adminComment) return prev;
                    const updated = { ...prev };
                    delete updated.adminComment;
                    return updated;
                  });
                }}
                placeholder="เช่น เงื่อนไขการจ่ายเงิน / หมายเหตุประกอบการพิจารณา"
              />
            </div>
            {errors.adminComment ? (
              <p className="text-xs text-red-600 text-right">{errors.adminComment}</p>
            ) : (
              <p className="text-xs text-gray-400 text-right">หมายเหตุจะแจ้งให้ผู้ยื่นทราบเมื่อขอข้อมูลเพิ่มเติม</p>
            )}
          </div>

          {/* Actions */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3 md:max-w-[60%]">
                <span className="text-sm font-medium text-gray-700">ดำเนินการ</span>
                <DecisionDropdown
                  value={selectedDecision}
                  onChange={(next) => {
                    setSelectedDecision(next);
                    if (next !== 'revision') {
                      setErrors((prev) => {
                        if (!prev.adminComment) return prev;
                        const updated = { ...prev };
                        delete updated.adminComment;
                        return updated;
                      });
                    }
                  }}
                  disabled={saving || decisionPending}
                  className="w-full md:min-w-[18rem]"
                />
              </div>
              <div className="flex items-center justify-end gap-3 md:self-end">
                {(saving || decisionPending) && (
                  <span className="text-sm text-gray-500">กำลังดำเนินการ...</span>
                )}
                <button
                  className="btn btn-primary min-w-[164px] justify-center gap-2 disabled:opacity-60"
                  onClick={handleDecisionSubmit}
                  disabled={saving || decisionPending}
                >
                  <Check size={18} /> บันทึกผล
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* =========================
 * Main Component
 * ========================= */
export default function PublicationSubmissionDetails({ submissionId, onBack }) {
  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState(null);
  const [activeTab, setActiveTab] = useState('details');

  // >>> Add for mapped announcements
  const [mainAnn, setMainAnn] = useState(null);      // object จาก announcements/:id
  const [rewardAnn, setRewardAnn] = useState(null);  // object จาก announcements/:id

  // Add: resolved fund names
  const [fundNames, setFundNames] = useState({ category: null, subcategory: null });
  const [fundNamesLoading, setFundNamesLoading] = useState(false);

  const [attachments, setAttachments] = useState([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false)
  const visibleAttachments = useMemo(
    () => attachments.filter((doc) => !isMergedFormDocument(doc)),
    [attachments],
  );
  const { getCodeById } = useStatusMap();

  // Load data
  useEffect(() => {
    if (!submissionId) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await adminSubmissionAPI.getSubmissionDetails(submissionId);
        let data = res?.submission || res;

        // Normalize arrays
        if (res?.submission_users) data.submission_users = res.submission_users;
        if (res?.documents) data.documents = res.documents;

        // Publication detail in standard slot (like user page)
        if (res?.details?.type === 'publication_reward' && res.details.data) {
          data.PublicationRewardDetail = res.details.data;
        }

        // Attach applicant if present
        const applicant =
          res?.applicant ||
          res?.applicant_user ||
          data?.user ||
          data?.User;
        if (applicant) {
          data.applicant = applicant;
          data.user = applicant;
        }
        if (res?.applicant_user_id) {
          data.applicant_user_id = res.applicant_user_id;
        }

        setSubmission(data);
      } catch (err) {
        console.error('Error loading submission details:', err);
        toast.error('โหลดข้อมูลล้มเหลว');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [submissionId]);

// ADD — fetch attachments + document types then merge label
  useEffect(() => {
    if (!submission?.submission_id) return;
    let cancel = false;

    (async () => {
      try {
        setAttachmentsLoading(true);

        // ดึงจาก endpoint ที่มีอยู่แล้ว
        const [docRes, typeRes] = await Promise.all([
          adminSubmissionAPI.getSubmissionDocuments(submission.submission_id),
          adminSubmissionAPI.getDocumentTypes(),
        ]);

        const docsApi = docRes?.documents || docRes || [];
        const typesArr = typeRes?.document_types || typeRes || [];

        // ทำ map: document_type_id -> display name
        const typeMap = {};
        for (const t of typesArr) {
          const id = t.document_type_id ?? t.id;
          typeMap[id] =
            t.document_type_name ||
            t.name ||
            t.code ||
            (Array.isArray(t.fund_types) && t.fund_types.length > 0
              ? t.fund_types.join(', ')
              : t.subcategory_name) ||
            'ไม่ระบุหมวด';
        }

        // ถ้า API ไม่มีเอกสาร ให้ fallback ใช้จาก payload เดิม
        const docsFallback = submission.documents || submission.submission_documents || [];
        const rawDocs = docsApi.length ? docsApi : docsFallback;

        const merged = rawDocs.map((d, i) => {
          const fileId = d.file_id ?? d.File?.file_id ?? d.file?.file_id ?? d.id;
          const trimmedOriginal =
            typeof d.original_name === 'string' ? d.original_name.trim() : '';
          const originalName = trimmedOriginal || null;
          const docTypeId = d.document_type_id ?? d.DocumentTypeID ?? d.doc_type_id ?? null;
          const docTypeName = d.document_type_name || typeMap[docTypeId] || 'ไม่ระบุหมวด';

          return {
            ...d,
            file_id: fileId,
            original_name: originalName,
            document_type_id: docTypeId,
            document_type_name: docTypeName,
          };
        });

        if (!cancel) setAttachments(merged);
      } catch (e) {
        console.error('load attachments failed', e);
        if (!cancel) setAttachments([]);
      } finally {
        if (!cancel) setAttachmentsLoading(false);
      }
    })();

    return () => { cancel = true; };
  }, [
    submission?.submission_id,
    submission?.documents,
    submission?.submission_documents,
  ]);

  // Applicant detection (robust)
  const getApplicant = useMemo(
    () => () => {
      if (!submission) return null;

      const explicit =
        submission.applicant ||
        submission.applicant_user ||
        submission.user ||
        submission.User;
      if (explicit) return explicit;

      const users = submission.submission_users || [];

      const byFlag = users.find((u) => {
        const roleText = String(
          u.role || u.position || u.author_role || u.AuthorRole || ''
        );
        return (
          u.is_applicant === true ||
          u.IsApplicant === true ||
          u.is_applicant === 1 ||
          u.IsApplicant === 1 ||
          u.is_owner === true ||
          u.is_submitter === true ||
          /applicant|ผู้ยื่น/i.test(roleText)
        );
      });
      if (byFlag) return byFlag.user || byFlag.User || null;

      const idCandidates = [
        submission.applicant_user_id,
        submission.applicant_id,
        submission.user_id,
        submission.created_by_user_id,
        submission.created_by,
      ].filter((v) => v != null);

      const byId = users.find((u) => {
        const ud = u.user || u.User;
        const uid = ud?.user_id ?? ud?.id ?? u.user_id ?? u.UserID;
        return idCandidates.includes(uid);
      });
      if (byId) return byId.user || byId.User || null;

      const first = [...users].sort(
        (a, b) => (a.display_order || 0) - (b.display_order || 0)
      )[0];
      return first?.user || first?.User || null;
    },
    [submission]
  );

  const getCoAuthors = useMemo(
    () => () => {
      const users = submission?.submission_users || [];
      if (users.length === 0) return [];

      const applicantUser = getApplicant();
      const applicantId =
        applicantUser?.user_id ??
        applicantUser?.id ??
        applicantUser?.UserID ??
        submission?.applicant_user_id ??
        submission?.user_id;

      return users
        .filter((u) => {
          const ud = u.user || u.User;
          const uid = ud?.user_id ?? ud?.id ?? u.user_id ?? u.UserID;

          const roleText = String(
            u.role || u.position || u.author_role || u.AuthorRole || ''
          );
          const isApplicantFlag =
            u.is_applicant ||
            u.IsApplicant ||
            u.is_owner ||
            u.is_submitter ||
            /applicant|ผู้ยื่น/i.test(roleText);

          if (isApplicantFlag) return false;
          if (applicantId && uid === applicantId) return false;
          return true;
        })
        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    },
    [submission, getApplicant]
  );

  const pubDetail =
    submission?.PublicationRewardDetail ||
    submission?.publication_reward_detail ||
    submission?.details?.data ||
    {};

  const requestedSummary = useMemo(
    () => deriveRequestedSummary(pubDetail, submission),
    [pubDetail, submission]
  );

  const approvedSummary = useMemo(
    () => deriveApprovedSummary(pubDetail, submission, requestedSummary),
    [pubDetail, submission, requestedSummary]
  );

  const approvedTotal = approvedSummary?.netTotal ?? approvedSummary?.total ?? null;

  const submittedAt =
    submission?.submitted_at ??
    pubDetail?.submitted_at ??
    submission?.submitted_date ??
    null;

  const contactPhone = firstNonEmpty(
    submission?.contact_phone,
    submission?.details?.data?.contact_phone,
    pubDetail?.contact_phone,
  );

  const bankAccount = firstNonEmpty(
    submission?.bank_account,
    submission?.details?.data?.bank_account,
    pubDetail?.bank_account,
  );

  const bankName = firstNonEmpty(
    submission?.bank_name,
    submission?.details?.data?.bank_name,
    pubDetail?.bank_name,
  );

  const bankAccountName = firstNonEmpty(
    submission?.bank_account_name,
    submission?.details?.data?.bank_account_name,
    pubDetail?.bank_account_name,
  );

  const approvedAt =
    submission?.admin_approved_at ??
    submission?.head_approved_at ??
    pubDetail?.approval_date ??
    submission?.approval_date ??
    null;

  const showApprovedColumn =
    submission?.status_id === 2 &&
    approvedTotal != null &&
    !Number.isNaN(Number(approvedTotal));

  // --- helpers for showing requested rows (0 should still show if shared cap or approved exists) ---
  const reqRevision    = Number(pubDetail?.revision_fee ?? pubDetail?.editing_fee ?? 0);
  const reqPublication = Number(pubDetail?.publication_fee ?? pubDetail?.page_charge ?? 0);

  // shared cap ถือว่ามี ก็ต่อเมื่อดึงมาได้เป็นตัวเลข > 0 เท่านั้น (ถ้า null/0 = ไม่มี)
  const hasSharedCap = typeof feeCap === 'number' && feeCap > 0;

  // มีตัวเลขฝั่งอนุมัติแล้วหรือยัง
  const hasRevisionApproved    = pubDetail?.revision_fee_approve_amount != null;
  const hasPublicationApproved = pubDetail?.publication_fee_approve_amount != null;

  // จะโชว์ row เมื่อ: มี shared cap หรือ requested > 0 หรือมี approved amount
  const showRevisionRequestedRow    = hasSharedCap || reqRevision > 0 || hasRevisionApproved;
  const showPublicationRequestedRow = hasSharedCap || reqPublication > 0 || hasPublicationApproved;

  function getFileURL(filePath) {
    if (!filePath) return "#";
    // ถ้าเป็น absolute (http/https) ใช้ได้เลย
    if (/^https?:\/\//i.test(filePath)) return filePath;
    // ต่อกับ BASE ของ backend (ตัด /api/v1 ทิ้งก่อน)
    const base = apiClient.baseURL.replace(/\/?api\/v1$/, "");
    return new URL(filePath, base).href;
  }

  useEffect(() => {
    const detail =
      submission?.PublicationRewardDetail ||
      submission?.publication_reward_detail ||
      submission?.details?.data?.publication_reward_detail ||
      submission?.details?.data ||
      null;

    if (!detail) return;

    const mainId = detail?.main_annoucement;
    const rewardId = detail?.reward_announcement;

    let cancelled = false;
    (async () => {
      try {
        if (mainId) {
          const res = await adminAnnouncementAPI.get(mainId);       // <— เปลี่ยนมาใช้ตัวนี้
          // รองรับได้ทั้ง {announcement} / {data} / ตรง ๆ
          const parsed = res?.announcement || res?.data || res || null;
          if (!cancelled) setMainAnn(parsed);
        } else {
          setMainAnn(null);
        }

        if (rewardId) {
          const res2 = await adminAnnouncementAPI.get(rewardId);    // <— และตัวนี้
          const parsed2 = res2?.announcement || res2?.data || res2 || null;
          if (!cancelled) setRewardAnn(parsed2);
        } else {
          setRewardAnn(null);
        }
      } catch (e) {
        console.warn("Load announcements failed:", e);
        if (!cancelled) { setMainAnn(null); setRewardAnn(null); }
      }
    })();

    return () => { cancelled = true; };
  }, [
    submission?.PublicationRewardDetail,
    submission?.publication_reward_detail,
    submission?.details?.data,
  ]);

  const handleViewAnnouncement = async (id, annObj) => {
    // เปิดแท็บก่อน เพื่อให้ยังเป็น user-gesture (กัน popup-blocker)
    const win = window.open('about:blank', '_blank', 'noopener,noreferrer');

    // helper: fetch แล้วเปิดเป็น blob (มี Authorization)
    const openAsBlob = async (url) => {
      const token = apiClient.getToken();
      const resp = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      if (win) win.location = blobUrl; else window.open(blobUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => { try { URL.revokeObjectURL(blobUrl); } catch {} }, 60000);
    };

    try {
      if (id) {
        // 1) ลอง /view ก่อน (ดูในแท็บ)
        await openAsBlob(`${apiClient.baseURL}/announcements/${id}/view`);
        return;
      }
    } catch (e) {
      console.warn('view failed, try download:', e);
    }

    try {
      if (id) {
        // 2) fallback: /download
        await openAsBlob(`${apiClient.baseURL}/announcements/${id}/download`);
        return;
      }
    } catch (e) {
      console.warn('download failed, try file_path:', e);
    }

    // 3) สุดท้ายค่อยลอง file_path (หลีกเลี่ยง http บน https)
    const raw = annObj?.file_path;
    if (raw) {
      if (/^https:\/\//i.test(raw)) {
        window.open(raw, '_blank', 'noopener,noreferrer');
      } else {
        // ถ้าเป็น http อาจโดน block — แจ้งเตือนผู้ใช้ไว้
        toast.error('ไม่สามารถเปิดไฟล์ผ่านลิงก์ภายนอก (http) ได้บนหน้า https');
        if (win) win.close();
      }
      return;
    }

    if (win) win.close();
    toast.error('ไม่พบไฟล์ประกาศ');
  };



  // File actions
  const handleView = async (fileId) => {
    try {
      const token = apiClient.getToken();
      const url = `${apiClient.baseURL}/files/managed/${fileId}/download`;
      const resp = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!resp.ok) throw new Error('File not found');
      const blob = await resp.blob();
      const fileURL = window.URL.createObjectURL(blob);
      window.open(fileURL, '_blank');
      window.URL.revokeObjectURL(fileURL);
    } catch (e) {
      console.error('Error viewing document:', e);
      toast.error('ไม่สามารถเปิดเอกสารได้');
    }
  };

  const handleDownload = async (fileId, fileName = 'document') => {
    try {
      await apiClient.downloadFile(`/files/managed/${fileId}/download`, fileName);
    } catch (e) {
      console.error('Error downloading:', e);
      toast.error('ดาวน์โหลดเอกสารล้มเหลว');
    }
  };

  // === PDF merge helpers (on-the-fly) ===
  const [merging, setMerging] = useState(false);
  const mergedUrlRef = useRef(null);

  const cleanupMergedUrl = () => {
    if (mergedUrlRef.current) {
      URL.revokeObjectURL(mergedUrlRef.current);
      mergedUrlRef.current = null;
    }
  };

  const fetchFileAsBlob = async (fileId) => {
    const token = apiClient.getToken();
    const url = `${apiClient.baseURL}/files/managed/${fileId}/download`;
    const resp = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!resp.ok) throw new Error('File not found');
    return await resp.blob();
  };

  // รวม PDF จากรายการ attachments (ข้ามไฟล์ที่โหลด/แปลงไม่สำเร็จ)
  const mergeAttachmentsToPdf = async (list) => {
    const merged = await PDFDocument.create();
    const skipped = [];

    for (const doc of list) {
      const fileId = getDocumentFileId(doc);
      if (!fileId) {
        skipped.push(doc?.original_name || 'unknown-file');
        continue;
      }

      try {
        const blob = await fetchFileAsBlob(fileId);
        const src = await PDFDocument.load(await blob.arrayBuffer(), { ignoreEncryption: true });
        const pages = await merged.copyPages(src, src.getPageIndices());
        pages.forEach(p => merged.addPage(p));
      } catch (e) {
        console.warn('merge: skip', doc?.original_name || fileId, e);
        skipped.push(doc?.original_name || `file-${fileId}.pdf`);
        continue;
      }
    }

    if (merged.getPageCount() === 0) {
      const err = new Error('No PDF pages');
      err.skipped = skipped;
      throw err;
    }

    const bytes = await merged.save();
    const blob = new Blob([bytes], { type: 'application/pdf' });
    return { blob, skipped };
  };

  const createMergedUrl = async (documents) => {
    setMerging(true);
    try {
      const availableDocs = (Array.isArray(documents) ? documents : []).filter(
        (doc) => getDocumentFileId(doc),
      );

      if (!availableDocs.length) {
        toast.error('ไม่พบไฟล์ที่สามารถรวมได้');
        return null;
      }

      // เลือกไฟล์ .pdf ก่อน ถ้าไม่มีเลยค่อยลองทุกไฟล์ (ให้ merge functionเป็นคนคัดทิ้งเอง)
      const pdfLike = availableDocs.filter(d => {
        const name = (d.original_name || d.file_name || d.File?.file_name || d.file?.file_name || '').toLowerCase();
        return name.endsWith('.pdf');
      });
      const list = pdfLike.length ? pdfLike : availableDocs;

      const { blob, skipped } = await mergeAttachmentsToPdf(list);
      cleanupMergedUrl();
      const url = URL.createObjectURL(blob);
      mergedUrlRef.current = url;

      if (skipped.length) {
        toast((t) => (
          <span>ข้ามไฟล์ที่ไม่ใช่/เสียหาย {skipped.length} รายการ</span>
        ));
      }
      return url;
    } catch (e) {
      console.error('merge failed', e);
      toast.error(`รวมไฟล์ไม่สำเร็จ: ${e?.message || 'ไม่ทราบสาเหตุ'}`);
      return null;
    } finally {
      setMerging(false);
    }
  };

  const handleViewMerged = async () => {
    const url = mergedUrlRef.current || await createMergedUrl(visibleAttachments);
    if (url) window.open(url, '_blank');
  };

  const handleDownloadMerged = async () => {
    const url = mergedUrlRef.current || await createMergedUrl(visibleAttachments);
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `merged_documents_${submission?.submission_number || submission?.submission_id || ''}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // cleanup URL ตอน component unmount
  useEffect(() => {
    return () => cleanupMergedUrl();
  }, []);


  // Admin actions → API wiring
  const approve = async (payload) => {
    // ส่งตัวเลขอนุมัติ + หมายเลขอ้างอิงประกาศ ไปในคำสั่งอนุมัติครั้งเดียว
    await adminSubmissionAPI.approveSubmission(submission.submission_id, payload);

    // reload รายละเอียดเพื่อให้ได้ admin_approved_at / approve metadata / announce_reference_number ล่าสุด
    const res = await adminSubmissionAPI.getSubmissionDetails(submission.submission_id);
    let data = res?.submission || res;
    if (res?.submission_users) data.submission_users = res.submission_users;
    if (res?.documents) data.documents = res.documents;
    if (res?.details?.type === 'publication_reward' && res.details.data) {
      data.PublicationRewardDetail = res.details.data;
    }
    setSubmission(data);
  };

  const reject = async (reason) => {
    await adminSubmissionAPI.rejectSubmission(submission.submission_id, {
      admin_rejection_reason: reason,
    });
    // reload
    const res = await adminSubmissionAPI.getSubmissionDetails(submission.submission_id);
    let data = res?.submission || res;
    if (res?.submission_users) data.submission_users = res.submission_users;
    if (res?.documents) data.documents = res.documents;
    if (res?.details?.type === 'publication_reward' && res.details.data) {
      data.PublicationRewardDetail = res.details.data;
    }
    setSubmission(data);
  };

  const requestRevision = async ({ message, adminComment: adminCommentOverride } = {}) => {
    const payload = {};
    const trimmed = (adminCommentOverride ?? message)?.trim();
    if (trimmed) {
      payload.request_comment = trimmed;
      payload.revision_comment = trimmed;
      payload.reason = trimmed;
      payload.admin_comment = trimmed;
    }

    await adminSubmissionAPI.requestRevision(submission.submission_id, payload);

    const res = await adminSubmissionAPI.getSubmissionDetails(submission.submission_id);
    let data = res?.submission || res;
    if (res?.submission_users) data.submission_users = res.submission_users;
    if (res?.documents) data.documents = res.documents;
    if (res?.details?.type === 'publication_reward' && res.details.data) {
      data.PublicationRewardDetail = res.details.data;
    }
    setSubmission(data);
  };

  // --------- Add: resolve subcategory/category names from ids via adminAPI ---------
  useEffect(() => {
    if (!submission) return;

    const catId = submission?.category_id;
    const subId = submission?.subcategory_id;

    // ถ้า payload มีชื่ออยู่แล้ว ก็ไม่ต้องยิงเพิ่ม
    const payloadSubName = getSubcategoryName(submission, pubDetail);
    const hasPayloadSubName = payloadSubName && payloadSubName !== '-';

    if ((catId || subId) && !hasPayloadSubName && !fundNames.subcategory && !fundNamesLoading) {
      (async () => {
        try {
          setFundNamesLoading(true);
          const names = await fetchFundNamesWithAdminAPI({
            categoryId: catId,
            subcategoryId: subId,
            yearId: submission?.year_id,
          });
          setFundNames((prev) => ({ ...prev, ...names }));
        } catch (e) {
          console.warn('Resolve fund names failed:', e);
        } finally {
          setFundNamesLoading(false);
        }
      })();
    }
  }, [submission, pubDetail, fundNames.subcategory, fundNamesLoading]);

  useEffect(() => {
    const detail =
      submission?.PublicationRewardDetail ||
      submission?.publication_reward_detail ||
      submission?.details?.data?.publication_reward_detail ||
      submission?.details?.data ||
      null;

    if (!detail) {
      return;
    }

    const mainId = detail?.main_annoucement;
    const rewardId = detail?.reward_announcement;

    let cancelled = false;
    (async () => {
      try {
        // โหลด Main
        if (mainId) {
          const res = await announcementAPI.getAnnouncement(mainId);
          // รองรับหลากหลายทรง response
          const parsed =
            res?.announcement ||      // { announcement: {...} }
            res?.data?.announcement ||// { data: { announcement: {...} } }
            res?.data ||              // { data: {...} }
            res;                      // {...}
          if (!cancelled) {
            setMainAnn(parsed || null);
          }
        } else {
          setMainAnn(null);
        }

        // โหลด Reward
        if (rewardId) {
          const res2 = await announcementAPI.getAnnouncement(rewardId);
          const parsed2 =
            res2?.announcement ||
            res2?.data?.announcement ||
            res2?.data ||
            res2;
          if (!cancelled) {
            setRewardAnn(parsed2 || null);
          }
        } else {
          setRewardAnn(null);
        }
      } catch (e) {
        console.warn('[DEBUG] Load announcements failed:', e);
        if (!cancelled) {
          setMainAnn(null);
          setRewardAnn(null);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [
    submission?.PublicationRewardDetail,
    submission?.publication_reward_detail,
    submission?.details?.data,
  ]);

  if (loading) {
    return (
      <PageLayout
        title="รายละเอียดคำร้อง (Submission Details)"
        subtitle="กำลังโหลดข้อมูล... (Loading...)"
        icon={FileText}
        actions={
          <button onClick={onBack} className="btn btn-secondary">
            <ArrowLeft size={20} />
            กลับ (Back)
          </button>
        }
      >
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">กำลังโหลดข้อมูล... (Loading...)</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!submission) {
    return (
      <PageLayout title="ไม่พบข้อมูล" subtitle="ไม่พบคำร้องที่ระบุ" icon={AlertCircle}>
        <Card collapsible={false}>
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600">ไม่พบข้อมูลคำร้องที่ต้องการ</p>
            <button onClick={onBack} className="btn btn-primary mt-4">
              กลับไปหน้ารายการ
            </button>
          </div>
        </Card>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={`เงินรางวัลตีพิมพ์ #${submission.submission_number}`}
      subtitle="รายละเอียดคำร้องขอเงินรางวัลการตีพิมพ์ผลงานวิชาการ"
      icon={Award}
      actions={
        <div className="flex gap-2">
          <button onClick={onBack} className="btn btn-secondary">
            <ArrowLeft size={20} />
            กลับ (Back)
          </button>
        </div>
      }
      breadcrumbs={[
        { label: 'หน้าแรก', href: '/admin' },
        { label: 'รายการคำร้อง', href: '#', onClick: onBack },
        { label: submission.submission_number },
      ]}
    >
    {/* Status Summary */}
    <Card
      icon={getColoredStatusIcon(getCodeById(submission?.status_id) || submission?.status?.status_code)}
      collapsible={false}
      headerClassName="items-center"
      title={
        <div className="flex items-center gap-2">
          <span>สถานะคำร้อง (Submission Status)</span>
          <StatusBadge
            statusId={submission?.status_id}
            fallbackLabel={submission?.status?.status_name}
          />
        </div>
      }
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="flex flex-col gap-3 mt-4 text-sm">
            {/* ชื่อทุน — ทำให้ตัวหนา */}
            <div className="flex flex-wrap items-start gap-2">
              <span className="text-gray-500 shrink-0 min-w-[80px]">ชื่อทุน:</span>
              <span className="font-bold text-gray-700 break-words flex-1">
                {fundNames?.subcategory || getSubcategoryName(submission, pubDetail)}
              </span>
            </div>

            {/* ผู้ขอทุน */}
            <div className="flex flex-wrap items-start gap-2">
              <span className="text-gray-500 shrink-0 min-w-[80px]">ผู้ขอทุน:</span>
              <span className="font-bold text-gray-700 break-words flex-1">
                {getUserFullName(getApplicant())}
              </span>
            </div>
            
            {/* Info grid: วันที่ต่าง ๆ และเลขอ้างอิงประกาศ */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 mt-2">
              <div className="flex items-start gap-2">
                <span className="text-gray-500 shrink-0">เลขที่คำร้อง:</span>
                <span className="font-medium">{submission.submission_number || '-'}</span>
              </div>

              <div className="flex items-start gap-2">
                <span className="text-gray-500 shrink-0">เบอร์ติดต่อ:</span>
                <span className="font-medium break-words">{contactPhone || '-'}</span>
              </div>

              {/* วันที่สร้างคำร้อง (ถ้ามี) */}
              {submission.created_at && (
                <div className="flex items-start gap-2">
                  <span className="text-gray-500 shrink-0">วันที่สร้างคำร้อง:</span>
                  <span className="font-medium">{formatDate(submission.created_at)}</span>
                </div>
              )}

              {/* วันที่ส่งคำร้อง */}
              {submittedAt && (
                <div className="flex items-start gap-2">
                  <span className="text-gray-500 shrink-0">วันที่ส่งคำร้อง:</span>
                  <span className="font-medium">{formatDate(submittedAt)}</span>
                </div>
              )}


              {/* วันที่อนุมัติ */}
              {approvedAt && (
                <div className="flex items-start gap-2">
                  <span className="text-gray-500 shrink-0">วันที่อนุมัติ:</span>
                  <span className="font-medium">{formatDate(approvedAt)}</span>
                </div>
              )}


              {/* หมายเลขอ้างอิงประกาศ */}
              {pubDetail?.announce_reference_number && (
                <div className="flex items-start gap-2">
                  <span className="text-gray-500 shrink-0">หมายเลขอ้างอิงประกาศผลการพิจารณา:</span>
                  <span className="font-medium break-all">
                    {pubDetail.announce_reference_number}
                  </span>
                </div>
              )}

              {/* ประกาศหลักเกณฑ์ (Main Announcement) */}
              {(mainAnn || pubDetail?.main_annoucement) && (
                <div className="flex items-start gap-2">
                  <span className="text-gray-500 shrink-0">ประกาศหลักเกณฑ์:</span>
                  {mainAnn?.file_path ? (
                    <a
                      href={getFileURL(mainAnn.file_path)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline break-all cursor-pointer pointer-events-auto relative z-10"
                      title={mainAnn?.title || mainAnn?.file_name || 'เปิดไฟล์ประกาศ'}
                    >
                      {mainAnn?.title || mainAnn?.file_name || `#${pubDetail?.main_annoucement}`}
                    </a>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </div>
              )}

              <div className="flex items-start gap-2 md:col-span-2 lg:col-span-3">
                <span className="text-gray-500 shrink-0">ข้อมูลธนาคาร:</span>
                <div className="flex flex-col text-sm font-medium text-gray-700">
                  <span>
                    เลขที่บัญชี: <span className="font-semibold">{bankAccount || '-'}</span>
                  </span>
                  <span>
                    ชื่อบัญชี: <span className="font-semibold">{bankAccountName || '-'}</span>
                  </span>
                  <span>
                    ธนาคาร: <span className="font-semibold">{bankName || '-'}</span>
                  </span>
                </div>
              </div>

              {/* ประกาศเงินรางวัล (Reward Announcement) */}
              {(rewardAnn || pubDetail?.reward_announcement) && (
                <div className="flex items-start gap-2">
                  <span className="text-gray-500 shrink-0">ประกาศเงินรางวัล:</span>
                  {rewardAnn?.file_path ? (
                    <a
                      href={getFileURL(rewardAnn.file_path)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline break-all cursor-pointer pointer-events-auto relative z-10"
                      title={rewardAnn?.title || rewardAnn?.file_name || 'เปิดไฟล์ประกาศ'}
                    >
                      {rewardAnn?.title || rewardAnn?.file_name || `#${pubDetail?.reward_announcement}`}
                    </a>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Amounts (คอลัมน์ขวา) */}
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">
            {formatCurrency(requestedSummary?.netTotal ?? requestedSummary?.total ?? 0)}
          </div>
          <div className="text-sm text-gray-500">จำนวนเงินที่ขอ</div>

          {submission?.status_id === 2 && (
            <div className="mt-2">
              <div className="text-lg font-bold text-green-600">
                {formatCurrency(approvedSummary?.netTotal ?? approvedSummary?.total ?? 0)}
              </div>
              <div className="text-sm text-gray-500">จำนวนเงินที่อนุมัติ</div>
            </div>
          )}
        </div>
      </div>
    </Card>


      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6 mt-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'details'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            รายละเอียดบทความ
          </button>
          <button
            onClick={() => setActiveTab('authors')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'authors'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            ผู้แต่งร่วม
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'documents'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            เอกสารแนบ
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Publication Information */}
          <Card title="ข้อมูลบทความ (Article Information)" icon={BookOpen} collapsible={false}>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">ชื่อบทความ</label>
                <p className="font-medium">
                  {pubDetail.paper_title ||
                    pubDetail.article_title ||
                    pubDetail.title_th ||
                    pubDetail.title_en ||
                    submission.title ||
                    '-'}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-500">ชื่อวารสาร</label>
                <p className="font-medium">{pubDetail.journal_name || '-'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">Volume/Issue</label>
                  <p className="font-medium">
                    {pubDetail.volume_issue ||
                      ([pubDetail.volume, pubDetail.issue].filter(Boolean).join('/') || '-')}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">หน้า (Pages)</label>
                  <p className="font-medium">{pubDetail.page_numbers || pubDetail.pages || '-'}</p>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-500">วันที่ตีพิมพ์</label>
                <p className="font-medium">
                  {pubDetail.publication_date
                    ? formatDate(pubDetail.publication_date)
                    : pubDetail.publication_year || '-'}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-500">DOI</label>
                <p className="font-medium">
                  {pubDetail.doi ? (
                    <a
                      href={`https://doi.org/${pubDetail.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline inline-flex items-center gap-1 break-all"
                    >
                      {pubDetail.doi}
                      <Link size={14} />
                    </a>
                  ) : (
                    pubDetail.doi_url || '-'
                  )}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-500">ฐานข้อมูลที่ปรากฏ</label>
                <p className="font-medium">
                  {pubDetail.indexing || pubDetail.database_name || pubDetail.database || '-'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">ควอร์ไทล์ (Quartile)</label>
                  <p className="font-medium">
                    {String(pubDetail.quartile || pubDetail.journal_quartile || '').toUpperCase() || '-'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Impact Factor</label>
                  <p className="font-medium text-lg">{pubDetail.impact_factor || '-'}</p>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-500">ประเภทการตีพิมพ์</label>
                <p className="font-medium">{pubDetail.publication_type || 'journal'}</p>
              </div>
            </div>
          </Card>

          {/* Additional Information */}
          <Card title="ข้อมูลเพิ่มเติม (Additional Information)" icon={FileCheck} collapsible={false}>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">สถานะผู้แต่ง</label>
                <p className="font-medium">
                  {pubDetail.author_type === 'first_author'
                    ? 'ผู้แต่งหลัก'
                    : pubDetail.author_type === 'corresponding_author'
                    ? 'Corresponding Author'
                    : pubDetail.author_type === 'coauthor'
                    ? 'ผู้แต่งร่วม'
                    : pubDetail.author_type || '-'}
                </p>
              </div>

              {pubDetail.author_count != null && (
                <div>
                  <label className="text-sm text-gray-500">จำนวนผู้แต่ง</label>
                  <p className="font-medium">{pubDetail.author_count} คน</p>
                </div>
              )}

              {pubDetail.has_university_funding && (
                <div>
                  <label className="text-sm text-gray-500">ได้รับทุนจากมหาวิทยาลัย</label>
                  <p className="font-medium">
                    {pubDetail.has_university_funding === 'yes' ? 'ใช่' : 'ไม่ใช่'}
                  </p>
                </div>
              )}

              {pubDetail.funding_references && (
                <div>
                  <label className="text-sm text-gray-500">หมายเลขอ้างอิงทุน</label>
                  <p className="font-medium">{pubDetail.funding_references}</p>
                </div>
              )}
            </div>
          </Card>
          
          {/* Request Information */}
          <Card title="ข้อมูลการเงิน (Request Information)" icon={DollarSign} collapsible={false}>
            <div className="space-y-4">
              <div className={`grid ${submission?.status_id === 2 ? 'grid-cols-3' : 'grid-cols-2'} pb-2 border-b text-sm text-gray-600`}>
                <div></div>
                <div className="text-right">
                  <div>จำนวนเงินที่ขอ</div>
                  <div className="text-xs text-gray-500">Requested Amount</div>
                </div>
                {submission?.status_id === 2 && (
                  <div className="text-right">
                    <div>จำนวนเงินที่จะอนุมัติ</div>
                    <div className="text-xs text-gray-500">Approve Amount</div>
                  </div>
                )}
              </div>

              {/* Reward */}
              <div className={`grid ${submission?.status_id === 2 ? 'grid-cols-3' : 'grid-cols-2'} items-center min-h-[76px]`}>
                <label className="block text-sm font-medium text-gray-700 leading-tight">
                  เงินรางวัลที่ขอ
                  <br />
                  <span className="text-xs font-normal text-gray-600">Requested Reward Amount</span>
                </label>
                <span className="text-right font-semibold">฿{formatCurrency(pubDetail.reward_amount || 0)}</span>
                {submission?.status_id === 2 && (
                  <span className="text-right font-semibold">
                    {pubDetail.reward_approve_amount != null ? `฿${formatCurrency(pubDetail.reward_approve_amount)}` : '-'}
                  </span>
                )}
              </div>

              {/* Revision fee (always visible) */}
              <div className={`grid ${submission?.status_id === 2 ? 'grid-cols-3' : 'grid-cols-2'} items-center min-h-[76px]`}>
                <label className="block text-sm font-medium text-gray-700 leading-tight">
                  ค่าปรับปรุงบทความ
                  <br /><span className="text-xs font-normal text-gray-600">Requested Manuscript Editing Fee</span>
                </label>
                <span className="text-right">฿{formatCurrency(pubDetail.revision_fee || pubDetail.editing_fee || 0)}</span>
                {submission?.status_id === 2 && (
                  <span className="text-right">
                    {pubDetail.revision_fee_approve_amount != null
                      ? `฿${formatCurrency(pubDetail.revision_fee_approve_amount)}`
                      : '-'}
                  </span>
                )}
              </div>

              {/* Publication fee (always visible) */}
              <div className={`grid ${submission?.status_id === 2 ? 'grid-cols-3' : 'grid-cols-2'} items-center min-h-[76px]`}>
                <label className="block text-sm font-medium text-gray-700 leading-tight">
                  ค่าธรรมเนียมการตีพิมพ์
                  <br /><span className="text-xs font-normal text-gray-600">Requested Page Charge</span>
                </label>
                <span className="text-right">฿{formatCurrency(pubDetail.publication_fee || pubDetail.page_charge || 0)}</span>
                {submission?.status_id === 2 && (
                  <span className="text-right">
                    {pubDetail.publication_fee_approve_amount != null
                      ? `฿${formatCurrency(pubDetail.publication_fee_approve_amount)}`
                      : '-'}
                  </span>
                )}
              </div>

              {/* External funding */}
              {pubDetail.external_funding_amount > 0 && (
                <div className={`grid ${submission?.status_id === 2 ? 'grid-cols-3' : 'grid-cols-2'} items-center pt-2 mt-2 border-t`}>
                  <label className="block text-sm font-medium text-gray-700">
                    เงินสนับสนุนจากภายนอก
                    <br />
                    <span className="text-xs font-normal text-gray-600">External Funding Sources</span>
                  </label>
                  <span className="text-right text-red-600">
                    ฿{formatCurrencyParen(pubDetail.external_funding_amount)}
                  </span>
                  {submission?.status_id === 2 && <span></span>}
                </div>
              )}

              {/* Total */}
              <div className={`grid ${submission?.status_id === 2 ? 'grid-cols-3' : 'grid-cols-2'} items-center pt-2 border-t min-h-[76px]`}>
                <label className="block font-medium text-gray-700 leading-tight">
                  รวมเบิกจากวิทยาลัยการคอม
                  <br />
                  <span className="text-xs font-normal text-gray-600">Total Requested to CP-KKU</span>
                </label>
                <span className="text-right font-bold text-blue-600">
                  ฿{formatCurrency(requestedSummary?.netTotal ?? requestedSummary?.total ?? 0)}
                </span>
                {submission?.status_id === 2 && (
                  <span className="text-right font-bold text-green-600">
                    ฿{formatCurrency(approvedSummary?.netTotal ?? approvedSummary?.total ?? 0)}
                  </span>
                )}
              </div>
            </div>
          </Card>

          {/* Admin-only Approval Panel */}
          <ApprovalPanel
            submission={submission}
            pubDetail={pubDetail}
          requestedSummary={requestedSummary}
          approvedSummary={approvedSummary}
          onApprove={approve}
          onReject={reject}
          onRequestRevision={requestRevision}
        />
        </div>
      )}

      {activeTab === 'authors' && (
        <Card title="รายชื่อผู้แต่ง (Authors)" icon={Users} collapsible={false}>
          <div className="space-y-6">
            {/* Applicant */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">ผู้ยื่นคำร้อง (Applicant)</h4>
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center">
                  <User className="h-5 w-5 text-blue-600 mr-3" />
                  <div>
                    <div className="font-medium text-gray-900">{getUserFullName(getApplicant())}</div>
                    <div className="text-sm text-gray-500">{getUserEmail(getApplicant())}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Co-authors */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                รายชื่อผู้แต่งร่วม (Co-Authors){getCoAuthors().length > 0 ? ` (${getCoAuthors().length} คน)` : ''}
              </h4>

              {getCoAuthors().length > 0 ? (
                <div className="space-y-2">
                  {getCoAuthors().map((submissionUser, index) => {
                    const userData = submissionUser.user || submissionUser.User;
                    return (
                      <div key={submissionUser.user_id || index} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-500 w-8">{index + 1}.</span>
                          <div className="flex-1 ml-3">
                            <div className="font-medium text-gray-900">{getUserFullName(userData)}</div>
                            <div className="text-sm text-gray-500">{getUserEmail(userData)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">ไม่มีข้อมูลผู้แต่งร่วม</p>
              )}
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'documents' && (
        <Card title="เอกสารแนบ (Attachments)" icon={FileText} collapsible={false}>
          <div className="space-y-6">
            {/* Content */}
            {attachmentsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-3 text-gray-500">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span>กำลังโหลดเอกสาร...</span>
                </div>
              </div>
            ) : visibleAttachments.length > 0 ? (
              <div className="space-y-4">
                {visibleAttachments.map((doc, index) => {
                  const fileId = doc.file_id || doc.File?.file_id || doc.file?.file_id;
                  const trimmedOriginal =
                    typeof doc.original_name === 'string' ? doc.original_name.trim() : '';
                  const fileName = trimmedOriginal || '-';
                  const downloadName =
                    trimmedOriginal || `document-${fileId ?? index + 1}`;
                  const docType = (doc.document_type_name || '').trim() || 'ไม่ระบุประเภท';

                  return (
                    <div
                      key={doc.document_id || fileId || index}
                      className="bg-gray-50/50 rounded-lg p-4 hover:bg-gray-50 transition-colors duration-200"
                    >
                      <div className="flex items-center justify-between">
                        {/* Left: File Info */}
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            <span className="text-gray-600 font-semibold text-sm">
                              {index + 1}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <FileText size={16} className="text-gray-600 flex-shrink-0" />
                              <p className="text-sm text-gray-600">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                                {docType}
                              </span>
                            </p>
                            </div>
                              {/* ชื่อไฟล์: ทำเป็นลิงก์สีน้ำเงิน กดแล้วเรียก handleView(fileId) */}
                              {fileId ? (
                                <a
                                  href="#"
                                  onClick={(e) => { e.preventDefault(); handleView(fileId); }}
                                  className="font-medium text-blue-600 hover:underline truncate cursor-pointer"
                                  title={`เปิดดู: ${fileName}`}
                                >
                                  {fileName}
                                </a>
                              ) : (
                                <span
                                  className="font-medium text-gray-400 truncate"
                                  title={fileName}
                                >
                                  {fileName}
                                </span>
                              )}
                          </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            className="inline-flex items-center gap-1 border border-blue-200 px-3 py-2 text-sm text-blue-600 hover:bg-blue-100 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => handleView(fileId)}
                            disabled={!fileId}
                            title="เปิดดูไฟล์"
                          >
                            <Eye size={14} />
                            <span>ดู</span>
                          </button>
                          <button
                            className="inline-flex items-center gap-1 border border-green-200 px-3 py-2 text-sm text-green-600 hover:bg-green-100 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => handleDownload(fileId, downloadName)}
                            disabled={!fileId}
                            title="ดาวน์โหลดไฟล์"
                          >
                            <Download size={14} />
                            <span>ดาวน์โหลด</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 text-lg font-medium mb-2">ไม่มีเอกสารแนบ</p>
                <p className="text-gray-400 text-sm">ยังไม่มีการอัปโหลดเอกสารสำหรับคำร้องนี้</p>
              </div>
            )}

            {/* Action Buttons - ย้ายมาด้านล่าง */}
            {visibleAttachments.length > 0 && (
              <div className="flex justify-end gap-3 pt-4 border-t-1 border-gray-300">
                <button
                  className="inline-flex items-center gap-1 border border-blue-200 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleViewMerged}
                  disabled={visibleAttachments.length === 0 || merging}
                  title="เปิดดูไฟล์แนบที่ถูกรวมเป็น PDF"
                >
                  <Eye size={16} /> ดูไฟล์รวม (PDF)
                </button>
                <button
                  className="inline-flex items-center gap-1 border border-green-200 px-3 py-2 text-sm text-green-600 hover:bg-green-50 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleDownloadMerged}
                  disabled={visibleAttachments.length === 0 || merging}
                  title="ดาวน์โหลดไฟล์แนบที่ถูกรวมเป็น PDF เดียว"
                >
                  <Download size={16} /> ดาวน์โหลดไฟล์รวม
                </button>
              </div>
            )}
          </div>
        </Card>
      )}
    </PageLayout>
  );
}