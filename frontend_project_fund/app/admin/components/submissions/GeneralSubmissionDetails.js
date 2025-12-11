// app/admin/components/submissions/GeneralSubmissionDetails.js
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, FileText,
  CheckCircle, XCircle, AlertTriangle, Clock,
  Eye, Download, PlusCircle, Loader2, RefreshCw,
  ChevronDown, MessageCircle,
} from 'lucide-react';

import PageLayout from '../common/PageLayout';
import Card from '../common/Card';
import StatusBadge from '../common/StatusBadge';
import { adminSubmissionAPI } from '@/app/lib/admin_submission_api';
import { adminAnnouncementAPI } from '@/app/lib/admin_announcement_api'; // <-- fetch announcement
import { notificationsAPI } from '@/app/lib/notifications_api';
import apiClient from '@/app/lib/api';
import { toast } from 'react-hot-toast';
import Swal from 'sweetalert2';
import { useStatusMap } from '@/app/hooks/useStatusMap';
import 'sweetalert2/dist/sweetalert2.min.css';
import { PDFDocument } from 'pdf-lib';
import { AnimatePresence, motion } from 'motion/react';
import PublicationSubmissionDetails from './PublicationSubmissionDetails';

/* =========================
 * Helpers
 * ========================= */

const statusIconOf = (statusCode) => {
  switch (statusCode) {
    case 'approved': return CheckCircle;
    case 'rejected': return XCircle;
    case 'revision': return AlertTriangle;
    case 'draft': return FileText;
    case 'pending':
    default: return Clock;
  }
};

const statusIconColor = (statusCode) => {
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
  const Icon = statusIconOf(statusCode);
  const color = statusIconColor(statusCode);
  return function ColoredStatusIcon(props) {
    return <Icon {...props} className={`${props.className || ''} ${color}`} />;
  };
};

const pickApplicant = (submission) => {
  const applicant =
    submission?.applicant ||
    submission?.applicant_user ||
    submission?.user ||
    submission?.User;

  if (applicant) return applicant;

  const su = (submission?.submission_users || []).find(
    (u) => u.is_applicant || u.IsApplicant || u.is_owner || u.is_submitter
  );
  return su?.user || su?.User || null;
};

const getUserFullName = (u) => {
  if (!u) return '-';
  const name = `${u.user_fname || u.first_name || ''} ${u.user_lname || u.last_name || ''}`.trim();
  return name || (u.email || '-');
};

// format "0฿" (suffix)
function baht(value) {
  const n = Number(value ?? 0);
  if (!isFinite(n)) return '0฿';
  const s = n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return `${s}฿`;
}


// build absolute URL for file paths (like /uploads/...)
function getFileURL(filePath) {
  if (!filePath) return '#';
  if (/^https?:\/\//i.test(filePath)) return filePath;
  const base = apiClient.baseURL.replace(/\/?api\/v1$/, '');
  try { return new URL(filePath, base).href; } catch { return filePath; }
}

const safeNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const MAX_ALLOWED_AMOUNT = 1_000_000;

const RESEARCH_FUND_KEYWORD = 'ทุนส่งเสริมการวิจัย';

const normalizeThaiText = (value) => {
  if (value === null || value === undefined) return '';
  let normalized = String(value).trim().toLowerCase();
  if (typeof normalized.normalize === 'function') {
    normalized = normalized.normalize('NFC');
  }
  normalized = normalized.replace(/\s+/g, '');
  normalized = normalized.replace(/[\u200B\u200C\u200D]/g, '');
  return normalized;
};

const RESEARCH_FUND_KEYWORD_NORMALIZED = normalizeThaiText(RESEARCH_FUND_KEYWORD);

const matchesResearchFundCategoryName = (value) => {
  const normalized = normalizeThaiText(value);
  if (!normalized || !RESEARCH_FUND_KEYWORD_NORMALIZED) return false;
  return (
    normalized.includes(RESEARCH_FUND_KEYWORD_NORMALIZED) ||
    RESEARCH_FUND_KEYWORD_NORMALIZED.includes(normalized)
  );
};

const CATEGORY_NAME_PATHS = [
  ['category_name'],
  ['CategoryName'],
  ['category', 'category_name'],
  ['category', 'CategoryName'],
  ['Category', 'category_name'],
  ['Category', 'CategoryName'],
  ['category', 'name'],
  ['category', 'label'],
  ['Category', 'Name'],
  ['Category', 'Label'],
  ['fund_application_detail', 'category_name'],
  ['fund_application_detail', 'CategoryName'],
  ['fund_application_detail', 'category', 'category_name'],
  ['fund_application_detail', 'category', 'CategoryName'],
  ['fund_application_detail', 'subcategory', 'category_name'],
  ['fund_application_detail', 'subcategory', 'category', 'category_name'],
  ['fund_application_detail', 'subcategory', 'category', 'CategoryName'],
  ['FundApplicationDetail', 'category_name'],
  ['FundApplicationDetail', 'CategoryName'],
  ['FundApplicationDetail', 'Category', 'category_name'],
  ['FundApplicationDetail', 'Category', 'CategoryName'],
  ['FundApplicationDetail', 'Subcategory', 'category_name'],
  ['FundApplicationDetail', 'Subcategory', 'Category', 'category_name'],
  ['FundApplicationDetail', 'Subcategory', 'Category', 'CategoryName'],
  ['details', 'data', 'category_name'],
  ['details', 'data', 'category', 'category_name'],
  ['details', 'data', 'subcategory', 'category_name'],
  ['details', 'data', 'subcategory', 'category', 'category_name'],
  ['subcategory', 'category_name'],
  ['subcategory', 'CategoryName'],
  ['subcategory', 'category', 'category_name'],
  ['subcategory', 'category', 'CategoryName'],
  ['Subcategory', 'category_name'],
  ['Subcategory', 'CategoryName'],
  ['Subcategory', 'Category', 'category_name'],
  ['Subcategory', 'Category', 'CategoryName'],
];

const getValueAtPath = (source, path) => {
  return path.reduce((acc, key) => {
    if (acc === null || acc === undefined) return undefined;
    return acc[key];
  }, source);
};

const collectResearchFundCategoryCandidates = (submission) => {
  if (!submission) return [];

  const seen = new Set();
  const names = [];

  const addCandidate = (value) => {
    if (value === null || value === undefined) return;
    if (typeof value !== 'string' && typeof value !== 'number') return;
    const text = String(value).trim();
    if (!text) return;
    const lowered = text.toLowerCase();
    if (seen.has(lowered)) return;
    seen.add(lowered);
    names.push(text);
  };

  CATEGORY_NAME_PATHS.forEach((path) => {
    const value = getValueAtPath(submission, path);
    if (Array.isArray(value)) {
      value.forEach(addCandidate);
    } else {
      addCandidate(value);
    }
  });

  return names;
};

const extractFirstFilePath = (value) => {
  if (!value || typeof value !== 'object') return null;

  const candidates = [
    value.file_path,
    value.path,
    value.url,
    value.file_url,
    value.download_url,
    value.announcement_file_path,
    value.announcement_document_path,
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
    value.announcement?.file_path,
    value.announcement?.document_path,
    value.Announcement?.file_path,
    value.Announcement?.document_path,
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

const detectResearchFundSubmission = (submission) => {
  if (!submission) {
    return {
      detected: false,
      matchedCandidate: null,
      candidates: [],
      keyword: RESEARCH_FUND_KEYWORD,
    };
  }

  const candidates = collectResearchFundCategoryCandidates(submission);
  const matchedCandidate = candidates.find(matchesResearchFundCategoryName) || null;

  const categoryId =
    submission?.category_id ??
    submission?.category?.category_id ??
    submission?.Category?.CategoryID ??
    null;

  const categoryName =
    submission?.category_name ??
    submission?.CategoryName ??
    submission?.category?.category_name ??
    submission?.category?.CategoryName ??
    submission?.Category?.category_name ??
    submission?.Category?.CategoryName ??
    (candidates.length > 0 ? candidates[0] : null);

  return {
    detected: Boolean(matchedCandidate),
    matchedCandidate,
    candidates,
    keyword: RESEARCH_FUND_KEYWORD,
    categoryId,
    categoryName,
  };
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  try {
    return date.toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    return date.toLocaleString();
  }
};

const normalizeFundStatus = (value) => {
  if (value === null || value === undefined) return '';
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return '';
  if (['6', 'closed', 'admin_closed', 'ปิดทุน'].includes(normalized)) return 'closed';
  if (['1', 'approved', 'อนุมัติ'].includes(normalized)) return 'approved';
  return normalized;
};

const FUND_CLOSE_THRESHOLD = 0.01;

const getAttachmentDisplayName = (file) => {
  if (!file || typeof file !== 'object') return '';
  if (file.display_name) return file.display_name;
  if (file.original_name) return file.original_name;
  return (
    file.original_filename ||
    file.file_name ||
    file.name ||
    file.filename ||
    file.title ||
    file.File?.original_name ||
    file.File?.file_name ||
    file.file?.original_name ||
    file.file?.file_name ||
    file.document_name ||
    file.Document?.original_name ||
    (typeof file.file_path === 'string' ? file.file_path.split('/').pop() : '') ||
    ''
  );
};

const resolveApprovedAmount = (submission, fundDetail, fallback = null) => {
  const candidates = [
    fundDetail?.approved_amount,
    fundDetail?.approval_amount,
    fundDetail?.approve_amount,
    fundDetail?.approvedAmount,
    submission?.approved_amount,
    submission?.approval_amount,
    submission?.approvedAmount,
    submission?.admin_approved_amount,
    submission?.total_approved_amount,
    submission?.FundApplicationDetail?.approved_amount,
    submission?.details?.data?.approved_amount,
  ];

  for (const value of candidates) {
    const num = Number(value);
    if (Number.isFinite(num)) {
      return num;
    }
  }

  return fallback;
};

const DECISION_OPTIONS = [
  {
    value: 'approve',
    label: 'อนุมัติ',
    hint: 'บันทึกผลเป็นอนุมัติ',
    description: 'ยืนยันจำนวนเงินที่อนุมัติและปิดการพิจารณา',
    icon: CheckCircle,
    iconClass: 'text-emerald-600',
    iconBg: 'bg-emerald-50',
    activeRing: 'ring-emerald-200',
  },
  {
    value: 'reject',
    label: 'ไม่อนุมัติ',
    hint: 'เปลี่ยนสถานะเป็นไม่อนุมัติ',
    description: 'ปฏิเสธคำร้องและแจ้งเหตุผลให้ผู้ยื่นทราบ',
    icon: XCircle,
    iconClass: 'text-red-600',
    iconBg: 'bg-red-50',
    activeRing: 'ring-red-200',
  },
  {
    value: 'revision',
    label: 'ต้องการข้อมูลเพิ่มเติม',
    hint: 'แจ้งผู้ยื่นให้ส่งข้อมูลเพิ่ม',
    description: 'ใช้หมายเหตุของผู้ดูแลระบบเพื่อขอข้อมูลเพิ่มเติม',
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
                  {active ? <CheckCircle className="h-4 w-4 text-blue-600" /> : null}
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
 * Approval Panel
 * ========================= */
function FundApprovalPanel({ submission, fundDetail, onApprove, onReject, onRequestRevision }) {
  const statusId = Number(submission?.status_id);
  const requested = Number(fundDetail?.requested_amount || 0);

  const defaultApprovedAmount = React.useMemo(() => {
    const resolved = resolveApprovedAmount(submission, fundDetail, null);
    const numeric = Number(resolved);
    if (Number.isFinite(numeric) && numeric >= 0) {
      return Math.min(numeric, MAX_ALLOWED_AMOUNT);
    }
    if (Number.isFinite(requested)) {
      return Math.min(requested, MAX_ALLOWED_AMOUNT);
    }
    return 0;
  }, [submission, fundDetail, requested]);

  const [approved, setApproved] = React.useState(
    defaultApprovedAmount
  );
  const announceReference =
    fundDetail?.announce_reference_number ||
    submission?.announce_reference_number ||
    submission?.announce_reference ||
    '';
  const [announceRef, setAnnounceRef] = React.useState(announceReference || '');
  const [comment, setComment] = React.useState(
    submission?.admin_comment ?? ''
  );
  const [errors, setErrors] = React.useState({});
  const approvedNumber = Number(approved);
  const isApprovedNumber = Number.isFinite(approvedNumber);
  const exceedsRequested = isApprovedNumber && approvedNumber > requested;
  const exceedsMaximum = isApprovedNumber && approvedNumber > MAX_ALLOWED_AMOUNT;

  const escapeHtml = (value = '') =>
    String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const [selectedAction, setSelectedAction] = React.useState('approve');
  const [actionPending, setActionPending] = React.useState(false);

  React.useEffect(() => {
    if (statusId === 1) {
      setApproved(defaultApprovedAmount);
    }
  }, [statusId, defaultApprovedAmount]);

  React.useEffect(() => {
    if (statusId === 1) {
      setAnnounceRef(announceReference || '');
    }
  }, [statusId, announceReference]);

  React.useEffect(() => {
    if (statusId === 1) {
      setComment(submission?.admin_comment ?? '');
    }
  }, [statusId, submission?.admin_comment]);

  const validate = () => {
    const nextErrors = {};
    const a = Number(approved);
    if (!Number.isFinite(a)) nextErrors.approved = 'กรุณากรอกจำนวนเงินเป็นตัวเลข';
    else if (a < 0) nextErrors.approved = 'จำนวนเงินต้องไม่ติดลบ';
    else if (a > MAX_ALLOWED_AMOUNT) nextErrors.approved = `จำนวนเงินต้องไม่เกิน ${baht(MAX_ALLOWED_AMOUNT)}`;

    setErrors((prev) => {
      const merged = { ...prev, ...nextErrors };
      if (!nextErrors.approved && prev.approved) {
        delete merged.approved;
      }
      return merged;
    });

    return Object.keys(nextErrors).length === 0;
  };

  const handleApprove = async () => {
    if (!validate()) return false;

    const numericApproved = Number(approved || 0);

    const html = `
      <div style="text-align:left;font-size:14px;line-height:1.6;display:grid;row-gap:.6rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span>จำนวนที่ขอ</span><strong>${baht(requested)}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-weight:700;">จำนวนที่จะอนุมัติ</span>
          <span style="font-weight:700;color:#047857;">${baht(numericApproved)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span>หมายเลขอ้างอิงประกาศผลการพิจารณา</span><strong>${escapeHtml(announceRef || '—')}</strong>
        </div>
        ${comment ? `<div><div style="font-weight:500;">หมายเหตุ</div><div style="border:1px solid #e5e7eb;background:#f9fafb;padding:.5rem;border-radius:.5rem;">${escapeHtml(comment)}</div></div>` : ''}
        <p style="font-size:12px;color:#6b7280;">ระบบจะบันทึกยอดอนุมัติและเปลี่ยนสถานะเป็น “อนุมัติ”</p>
      </div>
    `;

    const result = await Swal.fire({
      title: 'ยืนยันการอนุมัติ',
      html,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยันอนุมัติ',
      cancelButtonText: 'ยกเลิก',
      focusConfirm: false,
      showLoaderOnConfirm: true,
      allowOutsideClick: () => !Swal.isLoading(),
      preConfirm: async () => {
        try {
          await onApprove({
            approved_amount: numericApproved,
            approval_amount: numericApproved,
            approve_amount: numericApproved,
            approvedAmount: numericApproved,
            approveAmount: numericApproved,
            total_approve_amount: numericApproved,
            announce_reference_number: announceRef?.trim() || null,
            admin_comment: comment?.trim() || null,
          });
        } catch (e) {
          Swal.showValidationMessage(e?.message || 'อนุมัติไม่สำเร็จ');
          throw e;
        }
      },
    });

    if (result.isConfirmed) {
      await Swal.fire({ icon: 'success', title: 'อนุมัติแล้ว', timer: 1400, showConfirmButton: false });
      return true;
    }

    return false;
  };

  const handleReject = async () => {
    const { value: reason } = await Swal.fire({
      title: 'เหตุผลการไม่อนุมัติ',
      input: 'textarea',
      inputPlaceholder: 'โปรดระบุเหตุผล...',
      inputAttributes: { 'aria-label': 'เหตุผลการไม่อนุมัติ' },
      showCancelButton: true,
      confirmButtonText: 'ยืนยันไม่อนุมัติ',
      cancelButtonText: 'ยกเลิก',
      inputValidator: (v) => (!v?.trim() ? 'กรุณาระบุเหตุผล' : undefined),
    });
    if (!reason) return false;

    const res2 = await Swal.fire({
      title: 'ยืนยันการไม่อนุมัติ',
      text: 'ระบบจะเปลี่ยนสถานะคำร้องเป็น “ไม่อนุมัติ”',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
      showLoaderOnConfirm: true,
      allowOutsideClick: () => !Swal.isLoading(),
      preConfirm: async () => {
        try {
          await onReject(String(reason).trim());
        } catch (e) {
          Swal.showValidationMessage(e?.message || 'ไม่อนุมัติไม่สำเร็จ');
          throw e;
        }
      },
    });

    if (res2.isConfirmed) {
      await Swal.fire({ icon: 'success', title: 'ดำเนินการแล้ว', timer: 1200, showConfirmButton: false });
      return true;
    }

    return false;
  };

  const handleRequestRevision = async () => {
    if (typeof onRequestRevision !== 'function') {
      return false;
    }

    const trimmedComment = comment?.trim() || '';
    if (!trimmedComment) {
      setErrors((prev) => ({
        ...prev,
        comment: 'กรุณาระบุหมายเหตุเพื่อขอข้อมูลเพิ่มเติม',
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
            <div style="border:1px solid #e5e7eb;background:#f9fafb;padding:.75rem;border-radius:.75rem;white-space:pre-wrap;">${escapeHtml(trimmedComment)}</div>
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
          await onRequestRevision({ message: trimmedComment, adminComment: trimmedComment });
        } catch (e) {
          Swal.showValidationMessage(e?.message || 'ส่งคำขอไม่สำเร็จ');
          throw e;
        }
      },
    });

    if (result.isConfirmed) {
      setErrors((prev) => {
        if (!prev.comment) return prev;
        const updated = { ...prev };
        delete updated.comment;
        return updated;
      });

      await Swal.fire({ icon: 'success', title: 'ส่งคำขอแล้ว', timer: 1400, showConfirmButton: false });
      return true;
    }

    return false;
  };

  const handleDecisionSubmit = async () => {
    if (actionPending) return;

    setActionPending(true);
    try {
      let completed = false;
      if (selectedAction === 'approve') {
        completed = await handleApprove();
      } else if (selectedAction === 'reject') {
        completed = await handleReject();
      } else if (selectedAction === 'revision') {
        completed = await handleRequestRevision();
      }

      if (completed) {
        setSelectedAction('approve');
      }
    } finally {
      setActionPending(false);
    }
  };

  // ====== READ-ONLY MODE ======
  if (statusId !== 1) {
    const approvedAmount = resolveApprovedAmount(submission, fundDetail, null);
    const announceValue =
      fundDetail?.announce_reference_number ||
      submission?.announce_reference_number ||
      submission?.announce_reference ||
      '';
    const adminComment = submission?.admin_comment ?? '';
    const headComment =
      submission?.head_comment ??
      submission?.HeadComment ??
      submission?.headComment ??
      '';

    const headerTitle = (
      <div className="flex items-center justify-between w-full">
        <span>ผลการพิจารณา (Approval Result)</span>
      </div>
    );

    return (
      <Card title={headerTitle} icon={FileText} collapsible={false}>
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
            <span className="font-semibold text-blue-700">{baht(requested)}</span>
          </div>

          <div className="flex items-start justify-between">
            <span className="text-gray-600">จำนวนที่อนุมัติ</span>
            <span className="font-semibold text-green-700">
              {Number.isFinite(Number(approvedAmount)) ? baht(approvedAmount) : '—'}
            </span>
          </div>

          <div className="flex items-start justify-between">
            <span className="text-gray-600">หมายเลขอ้างอิงประกาศผลการพิจารณา</span>
            <span className="font-medium">{announceValue || '—'}</span>
          </div>

          <div>
            <div className="text-gray-600 mb-1">หมายเหตุของผู้ดูแลระบบ</div>
            <div className="rounded-md border border-gray-200 bg-gray-50 p-2 min-h-[40px]">
              {adminComment || '—'}
            </div>
          </div>

          <div>
            <div className="text-gray-600 mb-1">หมายเหตุของหัวหน้าสาขา</div>
            <div className="rounded-md border border-gray-200 bg-gray-50 p-2 min-h-[40px]">
              {headComment || '—'}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // ====== PENDING MODE ======
  const headerTitle = (
    <div className="flex items-center justify-between w-full">
      <span>ผลการพิจารณา (Approval Result)</span>
    </div>
  );

  return (
    <Card title={headerTitle} icon={FileText} collapsible={false}>
      <div className="space-y-5">
        {/* Requested */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <label className="block text-sm font-medium text-gray-700 leading-tight">
            จำนวนเงินที่ขอ
            <br /><span className="text-xs font-normal text-gray-600">Requested Amount</span>
          </label>
          <div className="text-right font-semibold text-blue-700">
            {baht(requested)}
          </div>
        </div>

        {/* Approved input - suffix ฿ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <label className="block text-sm font-medium text-gray-700 leading-tight">
            จำนวนเงินที่จะอนุมัติ
            <br /><span className="text-xs font-normal text-gray-600">Approved Amount</span>
          </label>
            <div className="flex flex-col w-full">
              <div className={[
                'inline-flex items-center rounded-md border bg-white shadow-sm transition-all w-full',
                'focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500',
                errors.approved || exceedsMaximum
                  ? 'border-red-400'
                  : exceedsRequested
                    ? 'border-amber-300 hover:border-amber-400'
                    : 'border-gray-300 hover:border-blue-300',
              ].join(' ')}>
              <input
                type="text"
                inputMode="decimal"
                value={approved}
                onChange={(e) => {
                  const value = e.target.value;
                  // อนุญาตให้กรอกเฉพาะตัวเลขและจุดทศนิยม
                  if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                    setApproved(value);
                  }
                }}
                className="w-full text-right font-mono tabular-nums bg-transparent py-2 pl-3 pr-1 outline-none border-0"
                placeholder="0.00"
              />
              <span className="px-3 text-gray-500 select-none">฿</span>
            </div>
            <div className="mt-1 min-h-[20px] space-y-1">
              {errors.approved ? (
                <p className="text-red-600 text-xs">{errors.approved}</p>
              ) : null}
              {!errors.approved && exceedsMaximum ? (
                <p className="text-red-600 text-xs">
                  จำนวนเงินต้องไม่เกิน {baht(MAX_ALLOWED_AMOUNT)}
                </p>
              ) : null}
              {!errors.approved && exceedsRequested ? (
                <p className="text-amber-600 text-xs inline-flex items-center gap-1">
                  <AlertTriangle size={12} />
                  กำลังใส่เงินเกินจำนวนที่ขอ ระบบจะบันทึกตามที่ระบุ
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Announcement ref */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700 leading-tight">
              หมายเลขอ้างอิงประกาศผลการพิจารณา (ถ้ามี)
              <br /><span className="text-xs font-normal text-gray-600">Announcement Ref.</span>
            </label>
            <div className="w-full rounded-md border bg-white shadow-sm transition-all border-gray-300 hover:border-blue-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500">
              <input
                type="text"
                className="w-full p-2.5 rounded-md outline-none bg-transparent"
                value={announceRef}
                onChange={(e) => setAnnounceRef(e.target.value)}
                placeholder="เช่น 123/2568"
              />
            </div>
          </div>

          {/* Comment */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700 leading-tight">
              หมายเหตุของผู้ดูแลระบบ
              <br /><span className="text-xs font-normal text-gray-600">Comment</span>
            </label>
            <div
              className={[
                'rounded-md border bg-white shadow-sm transition-all',
                'border-gray-300 hover:border-blue-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500',
                errors.comment ? 'border-red-400 focus-within:border-red-500 focus-within:ring-red-500/40' : '',
              ].join(' ')}
            >
              <textarea
                className="w-full p-3 rounded-md outline-none bg-transparent resize-y min-h-[96px]"
                value={comment}
                onChange={(e) => {
                  const next = e.target.value;
                  setComment(next);
                  setErrors((prev) => {
                    if (!prev.comment) return prev;
                    const updated = { ...prev };
                    delete updated.comment;
                    return updated;
                  });
                }}
                placeholder="เช่น เงื่อนไขการเบิก/เหตุผลประกอบการพิจารณา"
              />
            </div>
            {errors.comment ? (
              <p className="text-xs text-red-600 text-right">{errors.comment}</p>
            ) : (
              <p className="text-xs text-gray-400 text-right">ใช้หมายเหตุนี้เมื่อขอข้อมูลเพิ่มเติม</p>
            )}
          </div>

          {/* Actions */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3 md:max-w-[60%]">
                <span className="text-sm font-medium text-gray-700">ดำเนินการ</span>
                <DecisionDropdown
                  value={selectedAction}
                  onChange={(next) => {
                    setSelectedAction(next);
                    if (next !== 'revision') {
                      setErrors((prev) => {
                        if (!prev.comment) return prev;
                        const updated = { ...prev };
                        delete updated.comment;
                        return updated;
                      });
                    }
                  }}
                  disabled={actionPending}
                  className="w-full md:min-w-[18rem]"
                />
              </div>
              <div className="flex justify-end md:self-end">
                <button
                  className="btn btn-primary min-w-[164px] justify-center"
                  onClick={handleDecisionSubmit}
                  disabled={actionPending}
                >
                  บันทึกผล
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
 * Request Information (left card)
 * ========================= */
function RequestInfoCard({ submission, detail }) {
  const subName =
    submission?.Subcategory?.subcategory_name ||
    detail?.Subcategory?.subcategory_name ||
    submission?.subcategory_name ||
    (submission?.subcategory_id != null ? `ประเภททุน #${submission.subcategory_id}` : '—');

  const fields = [
    { label: 'ประเภททุน (Subcategory)', value: subName },
    {
      label: 'ชื่อโครงการ (Project Title)',
      value: detail?.project_title || submission?.title || '—',
    },
    {
      label: 'คำอธิบายโครงการ (Description)',
      value: detail?.project_description || '—',
      long: true,
    },
  ];

  const requested = Number(detail?.requested_amount || 0);
  const approved =
    Number(submission?.status_id) === 2
      ? Number(detail?.approved_amount ?? 0)
      : null;

  return (
    <Card title="ข้อมูลการเงิน (Request Information)" icon={FileText} collapsible={false}>
      <div className="space-y-4 text-sm">
        <div className="flex items-start justify-between">
          <span className="text-gray-600">จำนวนเงินที่ขอ</span>
          <span className="font-semibold text-blue-700">{baht(requested)}</span>
        </div>
        {approved != null && (
          <div className="flex items-start justify-between">
            <span className="text-gray-600">จำนวนเงินที่อนุมัติ</span>
            <span className="font-semibold text-green-700">{baht(approved)}</span>
          </div>
        )}

        <div className="h-px bg-gray-200 my-2" />
        {fields.map((f, idx) => (
          <div key={idx} className={f.long ? '' : 'flex items-start justify-between'}>
            <div className="text-gray-600">{f.label}</div>
            {f.long ? (
              <div className="mt-1 rounded-md border border-gray-200 bg-gray-50 p-2">{f.value}</div>
            ) : (
              <div className="font-medium text-right max-w-[60%] break-words">{f.value}</div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

/* =========================
 * Main Component
 * ========================= */
export default function GeneralSubmissionDetails({ submissionId, onBack }) {
  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState(null);
  const { getCodeById } = useStatusMap();

  // attachments
  const [attachments, setAttachments] = useState([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const visibleAttachments = useMemo(
    () => attachments.filter((doc) => !isMergedFormDocument(doc)),
    [attachments],
  );

  // Merged PDF
  const [merging, setMerging] = useState(false);
  const mergedUrlRef = useRef(null);
  const [creatingMerged, setCreatingMerged] = useState(false);

  // announcements for Status Summary
  const [mainAnn, setMainAnn] = useState(null);
  const [activityAnn, setActivityAnn] = useState(null);

  // Research fund timeline
  const [researchEvents, setResearchEvents] = useState([]);
  const [researchTotals, setResearchTotals] = useState(null);
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchError, setResearchError] = useState(null);
  const [isFundClosed, setIsFundClosed] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventForm, setEventForm] = useState({ comment: '', amount: '', status: 'approved', file: null });
  const [eventErrors, setEventErrors] = useState({});
  const [eventSubmitting, setEventSubmitting] = useState(false);
  const eventFileInputRef = useRef(null);
  const fileMetaCacheRef = useRef(new Map());

  const submissionStatusId = submission?.status_id;
  const submissionEntityId = submission?.submission_id;

  const researchFundDetection = useMemo(
    () => detectResearchFundSubmission(submission),
    [submission]
  );
  const isResearchFundSubmission = researchFundDetection.detected;

  const cleanupMergedUrl = () => {
    if (mergedUrlRef.current) {
      URL.revokeObjectURL(mergedUrlRef.current);
      mergedUrlRef.current = null;
    }
  };
  useEffect(() => () => cleanupMergedUrl(), []);

  const mapSubmissionResponse = useCallback((res) => {
    if (!res) return null;
    let data = res?.submission || res;

    if (res?.submission_users) data.submission_users = res.submission_users;
    if (res?.documents) data.documents = res.documents;

    if (res?.details?.type === 'fund_application' && res.details.data) {
      data.FundApplicationDetail = res.details.data;
    }

    const applicant =
      res?.applicant ||
      res?.applicant_user ||
      data?.user ||
      data?.User;

    if (applicant) {
      data.applicant = applicant;
      data.user = applicant;
    }

    if (res?.applicant_user_id) data.applicant_user_id = res.applicant_user_id;

    return data;
  }, []);

  const refetchSubmission = useCallback(async () => {
    if (!submissionId) return null;
    const res = await adminSubmissionAPI.getSubmissionDetails(submissionId);
    const data = mapSubmissionResponse(res);
    if (data) setSubmission(data);
    return data;
  }, [submissionId, mapSubmissionResponse]);

  const resetResearchSection = useCallback(() => {
    setResearchEvents([]);
    setResearchTotals(null);
    setResearchError(null);
    setIsFundClosed(false);
  }, []);

  const sortEventsByCreatedAt = useCallback((list = []) => {
    const toTimestamp = (value) => {
      if (!value) return 0;
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? 0 : date.getTime();
    };
    const sorted = [...list].sort((a, b) => toTimestamp(a.created_at) - toTimestamp(b.created_at));
    return sorted;
  }, []);

  const enhanceResearchEventAttachments = useCallback(async (events = []) => {
    if (!Array.isArray(events) || events.length === 0) {
      return events;
    }

    const cache = fileMetaCacheRef.current;
    const missingIds = new Set();

    events.forEach((event) => {
      const attachmentsSource = Array.isArray(event?.attachments)
        ? event.attachments
        : Array.isArray(event?.files)
          ? event.files
          : [];

      attachmentsSource.forEach((file) => {
        if (!file || typeof file !== 'object') return;
        if (file.file_id == null) return;
        const hasMetadata = Boolean(getAttachmentDisplayName(file)) || Boolean(file.file_path);
        if (!hasMetadata && !cache.has(file.file_id)) {
          missingIds.add(file.file_id);
        }
      });
    });

    if (missingIds.size > 0) {
      await Promise.all(
        Array.from(missingIds).map(async (fileId) => {
          try {
            const { file } = await adminSubmissionAPI.getFileUpload(fileId);
            if (file) {
              cache.set(fileId, file);
            } else if (!cache.has(fileId)) {
              cache.set(fileId, null);
            }
          } catch (error) {
            console.warn(
              '[GeneralSubmissionDetails] Failed to fetch file metadata',
              fileId,
              error
            );
            if (!cache.has(fileId)) {
              cache.set(fileId, null);
            }
          }
        })
      );
    }

    const enrichedEvents = events.map((event) => {
      const attachmentsSource = Array.isArray(event?.attachments)
        ? event.attachments
        : Array.isArray(event?.files)
          ? event.files
          : [];

      const normalizedAttachments = attachmentsSource.map((file) => {
        if (!file || typeof file !== 'object') return file;
        const meta = file.file_id != null ? cache.get(file.file_id) || null : null;

        if (!meta) {
          const fallbackDisplay = getAttachmentDisplayName(file);
          return {
            ...file,
            display_name: fallbackDisplay || file.display_name || null,
          };
        }

        const filePath =
          file.file_path ||
          meta.file_path ||
          meta.stored_path ||
          meta.url ||
          null;

        const originalName = (() => {
          const candidates = [meta.original_name, file.original_name];
          for (const candidate of candidates) {
            if (typeof candidate === 'string' && candidate.trim()) {
              return candidate.trim();
            }
          }
          return null;
        })();

        const fileName =
          meta.file_name ||
          file.file_name ||
          originalName ||
          null;

        const displayName =
          getAttachmentDisplayName({ ...meta, ...file }) ||
          originalName ||
          fileName ||
          null;

        return {
          ...file,
          file_id: file.file_id ?? meta.file_id ?? null,
          file_name: fileName,
          original_name: originalName,
          display_name: displayName,
          file_path: filePath,
          meta,
        };
      });

      const primaryAttachment = normalizedAttachments[0] || null;

      return {
        ...event,
        attachments: normalizedAttachments,
        files: normalizedAttachments,
        attachment: primaryAttachment,
        file_id: primaryAttachment?.file_id ?? event.file_id ?? null,
        file_name:
          primaryAttachment?.file_name ||
          primaryAttachment?.display_name ||
          event.file_name ||
          null,
        file_path: primaryAttachment?.file_path || event.file_path || null,
      };
    });

    return enrichedEvents;
  }, [adminSubmissionAPI]);

  const loadResearchEvents = useCallback(
    async (targetSubmissionId) => {
      const id = targetSubmissionId ?? submissionId;
      if (!id) return;

      setResearchLoading(true);
      setResearchError(null);
      try {
        const { events = [], totals, meta } = await adminSubmissionAPI.getResearchFundEvents(id);
        const sorted = sortEventsByCreatedAt(events);
        const enriched = await enhanceResearchEventAttachments(sorted);
        setResearchEvents(enriched);
        setResearchTotals(totals || null);
        setIsFundClosed(Boolean(totals?.is_closed));
      } catch (error) {
        console.error('load research fund events failed', error);
        setResearchError(error);
        setResearchEvents([]);
        setResearchTotals(null);
        setIsFundClosed(false);
      } finally {
        setResearchLoading(false);
      }
    },
    [submissionId, sortEventsByCreatedAt, enhanceResearchEventAttachments]
  );

  useEffect(() => {
    fileMetaCacheRef.current.clear();
  }, [submissionEntityId, submissionId]);

  const statusCode = useMemo(
    () => (submissionStatusId != null ? getCodeById(submissionStatusId) : undefined),
    [getCodeById, submissionStatusId]
  );

  const isApprovedStatus = useMemo(() => {
    const normalizedCode = statusCode != null ? String(statusCode).toLowerCase() : undefined;
    if (normalizedCode) {
      if (normalizedCode === 'approved' || normalizedCode === 'อนุมัติ') {
        return true;
      }
      if (normalizedCode === '1' || normalizedCode === '6') {
        return true;
      }
    }

    const normalizedId = Number(submissionStatusId);
    if (Number.isFinite(normalizedId)) {
      return normalizedId === 2 || normalizedId === 7;
    }

    return false;
  }, [statusCode, submissionStatusId]);

  const isResearchFundApproved = useMemo(() => {
    if (!isResearchFundSubmission) return false;

    const normalizedCode = statusCode != null ? String(statusCode).toLowerCase() : undefined;
    if (normalizedCode === '1' || normalizedCode === '6') {
      return true;
    }

    const normalizedId = Number(submissionStatusId);
    if (Number.isFinite(normalizedId)) {
      return normalizedId === 2 || normalizedId === 7;
    }

    return false;
  }, [isResearchFundSubmission, statusCode, submissionStatusId]);

  // load submission details
  useEffect(() => {
    if (!submissionId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await adminSubmissionAPI.getSubmissionDetails(submissionId);
        if (cancelled) return;
        const data = mapSubmissionResponse(res);
        setSubmission(data);
      } catch (e) {
        if (!cancelled) {
          console.error('load details failed', e);
          toast.error('โหลดรายละเอียดไม่สำเร็จ');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [submissionId, mapSubmissionResponse]);

  // load attachments
  useEffect(() => {
    const loadAttachments = async () => {
      if (!submission?.submission_id) return;
      setAttachmentsLoading(true);
      try {
        const [docRes, typeRes] = await Promise.all([
          adminSubmissionAPI.getSubmissionDocuments(submission.submission_id),
          adminSubmissionAPI.getDocumentTypes(),
        ]);

        const docsApi = docRes?.documents || docRes || [];
        const typesArr = typeRes?.document_types || typeRes || [];

        const typeMap = {};
        for (const t of typesArr) {
          const id = t?.document_type_id ?? t?.id;
          if (id != null) {
            typeMap[String(id)] =
              t?.document_type_name || t?.name || t?.code || t?.label || 'ไม่ระบุหมวด';
          }
        }

        const docsFallback = submission.documents || submission.submission_documents || [];
        const rawDocs = (Array.isArray(docsApi) && docsApi.length > 0) ? docsApi : docsFallback;

        const merged = (rawDocs || []).map((d, i) => {
          const fileId = d.file_id ?? d.File?.file_id ?? d.file?.file_id ?? d.id;
          const trimmedOriginal =
            typeof d.original_name === 'string' ? d.original_name.trim() : '';
          const originalName = trimmedOriginal || null;
          const docTypeId = d.document_type_id ?? d.DocumentTypeID ?? d.doc_type_id ?? null;
          const docTypeName = d.document_type_name || typeMap[String(docTypeId)] || 'ไม่ระบุหมวด';
          return {
            ...d,
            file_id: fileId,
            original_name: originalName,
            document_type_id: docTypeId,
            document_type_name: docTypeName,
          };
        });

        setAttachments(merged);
      } catch (e) {
        console.warn('fetch attachments/types failed', e);
        setAttachments([]);
      } finally {
        setAttachmentsLoading(false);
      }
    };
    loadAttachments();
  }, [submission?.submission_id]);

  // fetch announcements for Status Summary
  useEffect(() => {
    const d =
      submission?.FundApplicationDetail ||
      submission?.details?.data ||
      null;
    if (!d) { setMainAnn(null); setActivityAnn(null); return; }

    const mainId = d?.main_annoucement;
    const actId  = d?.activity_support_announcement;

    let cancelled = false;
    (async () => {
      try {
        if (mainId) {
          const r = await adminAnnouncementAPI.get(mainId);
          const a = r?.announcement || r?.data || r || null;
          if (!cancelled) setMainAnn(a);
        } else {
          setMainAnn(null);
        }
        if (actId) {
          const r2 = await adminAnnouncementAPI.get(actId);
          const a2 = r2?.announcement || r2?.data || r2 || null;
          if (!cancelled) setActivityAnn(a2);
        } else {
          setActivityAnn(null);
        }
      } catch (e) {
        console.warn('Load announcements failed:', e);
        if (!cancelled) { setMainAnn(null); setActivityAnn(null); }
      }
    })();
    return () => { cancelled = true; };
  }, [submission?.FundApplicationDetail, submission?.details?.data]);

  useEffect(() => {
    if (!isResearchFundApproved) {
      resetResearchSection();
      return;
    }
    const targetId = submissionEntityId ?? submissionId;
    if (!targetId) return;
    loadResearchEvents(targetId);
  }, [
    isResearchFundApproved,
    submissionEntityId,
    submissionId,
    loadResearchEvents,
    resetResearchSection,
    researchFundDetection,
    isResearchFundSubmission,
  ]);

  useEffect(() => {
    if (!showEventModal) {
      setEventForm({ comment: '', amount: isFundClosed ? '0' : '', file: null });
      setEventErrors({});
      if (eventFileInputRef.current) {
        eventFileInputRef.current.value = '';
      }
    }
  }, [showEventModal, isFundClosed]);

  useEffect(() => {
    if (showEventModal && isFundClosed) {
      setEventForm((prev) => ({ ...prev, amount: '0' }));
    }
  }, [showEventModal, isFundClosed]);

  const currentFundStatusCode = useMemo(() => {
    const fromTotals = normalizeFundStatus(
      researchTotals?.status ??
        researchTotals?.status_code ??
        researchTotals?.status_id
    );
    if (fromTotals) return fromTotals;
    return isFundClosed ? 'closed' : 'approved';
  }, [researchTotals, isFundClosed]);

  const currentFundStatusLabel = useMemo(() => {
    const label =
      researchTotals?.status_name ||
      researchTotals?.status_label ||
      (currentFundStatusCode === 'closed'
        ? 'ปิดทุน'
        : currentFundStatusCode === 'approved'
        ? 'อนุมัติ'
        : null);
    if (label) return label;
    return currentFundStatusCode || '';
  }, [researchTotals, currentFundStatusCode]);

  const handleReloadResearchEvents = useCallback(() => {
    const targetId = submissionEntityId ?? submissionId;
    if (!targetId) return;
    return loadResearchEvents(targetId);
  }, [submissionEntityId, submissionId, loadResearchEvents]);

  const formType = useMemo(() => {
    const t =
      submission?.form_type ||
      submission?.submission_type ||
      submission?.details?.type ||
      '';
    return String(t).toLowerCase();
  }, [submission]);

  const isPublicationReward = formType === 'publication_reward';

  let renderedContent;

  if (isPublicationReward) {
    renderedContent = (
      <PublicationSubmissionDetails submissionId={submissionId} onBack={onBack} />
    );
  } else if (loading) {
    renderedContent = (
      <PageLayout
        title="รายละเอียดคำร้อง (Submission Details)"
        subtitle="กำลังโหลดข้อมูล."
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
            <p className="mt-4 text-gray-600">กำลังโหลดข้อมูล.</p>
          </div>
        </div>
      </PageLayout>
    );
  } else if (!submission) {
    renderedContent = (
      <PageLayout title="ไม่พบข้อมูล" subtitle="ไม่พบคำร้องที่ระบุ" icon={FileText}>
        <Card collapsible={false}>
          <div className="text-center py-12">
            <p className="text-gray-600">ไม่พบข้อมูลคำร้องที่ต้องการ</p>
            <button onClick={onBack} className="btn btn-primary mt-4">
              กลับไปหน้ารายการ
            </button>
          </div>
        </Card>
      </PageLayout>
    );
  }

  const applicant = pickApplicant(submission);
  const detail =
    submission?.FundApplicationDetail ||
    submission?.details?.data ||
    submission?.payload ||
    submission;

  const contactPhone =
    submission?.contact_phone ||
    submission?.details?.data?.contact_phone ||
    detail?.contact_phone ||
    '';

  const bankAccount =
    submission?.bank_account ||
    submission?.details?.data?.bank_account ||
    detail?.bank_account ||
    '';

  const bankName =
    submission?.bank_name ||
    submission?.details?.data?.bank_name ||
    detail?.bank_name ||
    '';

  const bankAccountName =
    submission?.bank_account_name ||
    submission?.details?.data?.bank_account_name ||
    detail?.bank_account_name ||
    '';

  const fundName =
    detail?.fund_name ||
    submission?.fund_name ||
    detail?.fund_title ||
    submission?.fund_title ||
    detail?.subcategory_name ||
    submission?.subcategory_name ||
    detail?.fund_subcategory_name ||
    submission?.fund_subcategory_name ||
    detail?.Subcategory?.subcategory_name ||
    submission?.Subcategory?.subcategory_name ||
    (submission?.subcategory_id != null ? `ประเภททุน #${submission.subcategory_id}` : '-') ||
    '-';

  const requestedAmount = safeNumber(detail?.requested_amount ?? submission?.requested_amount ?? 0, 0);
  const approvedAmount =
    isApprovedStatus
      ? safeNumber(detail?.approved_amount ?? submission?.approved_amount ?? 0, 0)
      : null;
  const approvedAmountFallback = safeNumber(
    detail?.approved_amount ?? submission?.approved_amount ?? requestedAmount,
    requestedAmount
  );

  const researchApprovedAmount = safeNumber(
    researchTotals?.approved_amount,
    approvedAmount != null ? approvedAmount : approvedAmountFallback
  );
  const researchPaidAmount = safeNumber(researchTotals?.paid_amount, 0);
  const researchPendingAmount = safeNumber(researchTotals?.pending_amount, 0);
  const researchRemainingAmount = (() => {
    if (researchTotals?.remaining_amount != null) {
      return safeNumber(
        researchTotals.remaining_amount,
        Math.max(researchApprovedAmount - (researchPaidAmount + researchPendingAmount), 0)
      );
    }
    return Math.max(researchApprovedAmount - (researchPaidAmount + researchPendingAmount), 0);
  })();

  const maxAmountByRemaining = useMemo(() => {
    const remaining = Number(researchRemainingAmount);
    if (!Number.isFinite(remaining)) return MAX_ALLOWED_AMOUNT;
    const safeRemaining = Math.max(0, remaining);
    return Math.min(MAX_ALLOWED_AMOUNT, safeRemaining);
  }, [researchRemainingAmount]);

  const eventAmountNumber = useMemo(() => {
    const n = Number(eventForm?.amount);
    if (!Number.isFinite(n) || n < 0) return 0;
    return n;
  }, [eventForm?.amount]);

  const projectedRemainingAfterEntry = useMemo(() => {
    const currentRemaining = Number(researchRemainingAmount);
    const safeRemaining = Number.isFinite(currentRemaining) ? currentRemaining : 0;
    const nextRemaining = safeRemaining - eventAmountNumber;
    return nextRemaining <= FUND_CLOSE_THRESHOLD ? 0 : nextRemaining;
  }, [eventAmountNumber, researchRemainingAmount]);

  const canCloseFund = useMemo(() => {
    const nextRemaining = projectedRemainingAfterEntry;
    return nextRemaining <= FUND_CLOSE_THRESHOLD;
  }, [projectedRemainingAfterEntry]);

  useEffect(() => {
    if (eventForm?.status === 'closed' && !canCloseFund) {
      setEventForm((prev) => ({ ...prev, status: 'approved' }));
    }
  }, [eventForm?.status, canCloseFund]);

  const submittedAt =
    submission?.submitted_at || submission?.created_at || submission?.create_at;

  const handleOpenEventModal = () => {
    setEventErrors({});
    const defaultStatus = (() => {
      const initialStatus = currentFundStatusCode || (isFundClosed ? 'closed' : 'approved');
      if (normalizeFundStatus(initialStatus) === 'closed') {
        const initialRemaining = Number(researchRemainingAmount);
        const canCloseInitially = Number.isFinite(initialRemaining)
          ? initialRemaining <= FUND_CLOSE_THRESHOLD
          : false;
        return canCloseInitially ? 'closed' : 'approved';
      }
      return initialStatus || 'approved';
    })();
    setEventForm({ comment: '', amount: '', status: defaultStatus, file: null });
    if (eventFileInputRef.current) {
      eventFileInputRef.current.value = '';
    }
    setShowEventModal(true);
  };

  const handleCloseEventModal = () => {
    setShowEventModal(false);
  };

  const handleEventCommentChange = (e) => {
    const value = e.target.value;
    setEventForm((prev) => ({ ...prev, comment: value }));
  };

  const handleEventAmountChange = (e) => {
    const value = e.target.value;
    setEventForm((prev) => ({ ...prev, amount: value }));
    setEventErrors((prev) => {
      const updated = { ...prev, status: undefined };
      const numeric = Number(value);

      if (value === '') {
        updated.amount = undefined;
      } else if (!Number.isFinite(numeric)) {
        updated.amount = 'กรุณากรอกจำนวนเงินเป็นตัวเลข';
      } else if (numeric < 0) {
        updated.amount = 'จำนวนเงินต้องไม่ติดลบ';
      } else if (numeric > MAX_ALLOWED_AMOUNT) {
        updated.amount = `จำนวนเงินต้องไม่เกิน ${baht(MAX_ALLOWED_AMOUNT)}`;
      } else if (numeric - maxAmountByRemaining > 1e-6) {
        updated.amount = `จำนวนเงินต้องไม่เกินยอดอนุมัติคงเหลือปัจจุบัน (${baht(Math.max(maxAmountByRemaining, 0))})`;
      } else {
        updated.amount = undefined;
      }

      return updated;
    });
  };

  const handleEventStatusChange = (e) => {
    const value = normalizeFundStatus(e.target.value);
    setEventForm((prev) => {
      if (value === 'closed' && !canCloseFund) {
        return { ...prev, status: 'approved' };
      }
      return { ...prev, status: value || prev.status || 'approved' };
    });
    setEventErrors((prev) => ({ ...prev, status: undefined }));
  };

  const handleEventFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setEventForm((prev) => ({ ...prev, file }));
    setEventErrors((prev) => ({ ...prev, file: undefined }));
  };

  const handleRemoveEventFile = () => {
    setEventForm((prev) => ({ ...prev, file: null }));
    if (eventFileInputRef.current) {
      eventFileInputRef.current.value = '';
    }
    setEventErrors((prev) => ({ ...prev, file: undefined }));
  };

  const handleEventSubmit = async (ev) => {
    ev.preventDefault();
    const errors = {};
    const amountValue = Number(eventForm.amount || 0);
    const normalizedStatus = normalizeFundStatus(
      eventForm.status || currentFundStatusCode || 'approved'
    );

    if (!Number.isFinite(amountValue)) {
      errors.amount = 'กรุณากรอกจำนวนเงินเป็นตัวเลข';
    } else if (amountValue < 0) {
      errors.amount = 'จำนวนเงินต้องไม่ติดลบ';
    } else if (amountValue > MAX_ALLOWED_AMOUNT) {
      errors.amount = `จำนวนเงินต้องไม่เกิน ${baht(MAX_ALLOWED_AMOUNT)}`;
    } else if (amountValue - maxAmountByRemaining > 1e-6) {
      errors.amount = `จำนวนเงินต้องไม่เกินยอดอนุมัติคงเหลือปัจจุบัน (${baht(Math.max(maxAmountByRemaining, 0))})`;
    }

    if (!normalizedStatus || !['approved', 'closed'].includes(normalizedStatus)) {
      errors.status = 'กรุณาเลือกสถานะ';
    }

    if (normalizedStatus === 'closed' && !canCloseFund) {
      errors.status = 'สามารถปิดทุนได้เมื่อยอดอนุมัติคงเหลือเป็น 0';
    }

    if (amountValue > 0 && !eventForm.file) {
      errors.file = 'กรุณาแนบหลักฐานเมื่อมีการจ่ายเงิน';
    }

    const projectedTotal = researchPaidAmount + researchPendingAmount + (Number.isFinite(amountValue) ? amountValue : 0);
    if (!errors.amount && projectedTotal - researchApprovedAmount > 1e-6) {
      errors.amount = `ยอดรวมหลังบันทึก (${baht(projectedTotal)}) ต้องไม่เกินยอดที่อนุมัติ (${baht(researchApprovedAmount)})`;
    }

    setEventErrors(errors);
    if (Object.keys(errors).length > 0) return;

    if (!submission?.submission_id) {
      toast.error('ไม่พบคำร้อง');
      return;
    }

    const formData = new FormData();
    formData.append('comment', eventForm.comment?.trim() || '');
    formData.append('amount', String(Number.isFinite(amountValue) ? amountValue : 0));
    if (eventForm.file) {
      formData.append('files', eventForm.file);
    }

    const statusCodeForSubmit = normalizedStatus === 'closed' ? 'closed' : 'approved';
    const statusIdForSubmit = statusCodeForSubmit === 'closed' ? '6' : '1';
    formData.append('status', statusCodeForSubmit);
    formData.append('status_code', statusCodeForSubmit);
    formData.append('status_id', statusIdForSubmit);
    formData.append('status_after_id', statusIdForSubmit);

    const eventType = amountValue > 0 ? 'payment' : 'note';
    formData.append('event_type', eventType);

    setEventSubmitting(true);
    try {
      const result = await adminSubmissionAPI.createResearchFundEvent(submission.submission_id, formData);
      toast.success('บันทึกประวัติเรียบร้อย');
      setShowEventModal(false);
      const updatedStatus = normalizeFundStatus(
        result?.totals?.status ??
          result?.totals?.status_code ??
          (result?.totals?.is_closed ? 'closed' : null)
      );
      setEventForm({ comment: '', amount: '', status: updatedStatus || statusCodeForSubmit, file: null });
      setEventErrors({});
      if (eventFileInputRef.current) {
        eventFileInputRef.current.value = '';
      }
      if (Array.isArray(result?.events)) {
        setResearchEvents(sortEventsByCreatedAt(result.events));
      }
      if (result?.totals) {
        setResearchTotals(result.totals);
        setIsFundClosed(Boolean(result.totals?.is_closed));
      }
      await refetchSubmission();
      if (!Array.isArray(result?.events) || !result?.totals) {
        await loadResearchEvents(submission.submission_id);
      }
    } catch (error) {
      console.error('create research fund event failed', error);
      toast.error(error?.message || 'บันทึกประวัติไม่สำเร็จ');
    } finally {
      setEventSubmitting(false);
    }
  };

  // Approve/Reject handlers
  const approve = async (payload) => {
    const isPublicationReward =
      normalizeThaiText(submission?.submission_type) === normalizeThaiText('publication_reward') ||
      normalizeThaiText(submission?.SubmissionType) === normalizeThaiText('publication_reward');

    const retryableApprove = async () =>
      adminSubmissionAPI.approveSubmission(submission.submission_id, { ...payload });

    try {
      await retryableApprove();
    } catch (error) {
      const backendMessage = error?.response?.data?.error || error?.message || '';

      if (isPublicationReward && backendMessage.includes('Failed to update submission status')) {
        // Some publication reward rows are missing detail records; create/update them first then retry approval.
        const totalAmount = Number(
          payload?.total_approve_amount ?? payload?.approved_amount ?? payload?.approve_amount ?? 0
        );

        const sanitizedTotal = Number.isFinite(totalAmount) ? Math.max(0, Math.min(totalAmount, MAX_ALLOWED_AMOUNT)) : 0;

        const approvalAmountsPayload = {
          reward_approve_amount: sanitizedTotal,
          revision_fee_approve_amount: 0,
          publication_fee_approve_amount: 0,
          total_approve_amount: sanitizedTotal,
        };

        await adminSubmissionAPI.updateApprovalAmounts(
          submission.submission_id,
          approvalAmountsPayload
        );

        await retryableApprove();
      } else {
        throw error;
      }
    }

    // แจ้งเตือนผู้ยื่น: อนุมัติ (backend จะดึงจำนวนเงินจากตาราง detail เอง)
    try {
      await notificationsAPI.notifySubmissionApproved(
        submission.submission_id,
        { announce_reference_number: payload?.announce_reference_number || '' }
      );
    } catch (e) {
      console.warn('notifySubmissionApproved failed:', e);
    }
    await refetchSubmission();
  };

  const reject = async (reason) => {
    await adminSubmissionAPI.rejectSubmission(submission.submission_id, {
      admin_rejection_reason: reason,
    });
    // แจ้งเตือนผู้ยื่น: ไม่อนุมัติ
    try {
      await notificationsAPI.notifySubmissionRejected(
        submission.submission_id,
        { reason: String(reason || '') }
      );
    } catch (e) {
      console.warn('notifySubmissionRejected failed:', e);
    }
    await refetchSubmission();
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
    await refetchSubmission();
  };

  // file handlers
  const handleView = async (fileId) => {
    try {
      const token = apiClient.getToken();
      const url = `${apiClient.baseURL}/files/managed/${fileId}/download`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('File not found');
      const blob = await res.blob();
      const fileURL = window.URL.createObjectURL(blob);
      window.open(fileURL, '_blank');
      window.URL.revokeObjectURL(fileURL);
    } catch (e) {
      console.error('Error viewing document:', e);
      toast.error('ไม่สามารถเปิดไฟล์ได้');
    }
  };

  const handleDownload = async (fileId, fileName = 'document') => {
    try {
      await apiClient.downloadFile(`/files/managed/${fileId}/download`, fileName);
    } catch (e) {
      console.error('Error downloading document:', e);
      toast.error('ไม่สามารถดาวน์โหลดไฟล์ได้');
    }
  };

  // merge attachments to pdf
  const fetchFileAsBlob = async (fileId) => {
    const token = apiClient.getToken();
    const url = `${apiClient.baseURL}/files/managed/${fileId}/download`;
    const resp = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!resp.ok) throw new Error('File not found');
    return await resp.blob();
  };

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
        pages.forEach((p) => merged.addPage(p));
      } catch (e) {
        console.warn('merge: skip', e);
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
    const availableDocs = (Array.isArray(documents) ? documents : []).filter(
      (doc) => getDocumentFileId(doc),
    );

    if (!availableDocs.length) {
      toast.error('ไม่พบไฟล์ที่สามารถรวมได้');
      return null;
    }

    setCreatingMerged(true);
    try {
      const pdfLike = availableDocs.filter((doc) => {
        const nameCandidate =
          doc?.original_name || doc?.file_name || doc?.File?.file_name || doc?.file?.file_name || '';
        return String(nameCandidate).toLowerCase().endsWith('.pdf');
      });
      const list = pdfLike.length ? pdfLike : availableDocs;

      const { blob, skipped } = await mergeAttachmentsToPdf(list);
      if (mergedUrlRef.current) URL.revokeObjectURL(mergedUrlRef.current);
      const url = URL.createObjectURL(blob);
      mergedUrlRef.current = url;
      if (skipped.length) {
        toast((t) => <span>ข้ามไฟล์ที่ไม่ใช่/เสียหาย {skipped.length} รายการ</span>);
      }
      return url;
    } catch (e) {
      console.error('merge failed', e);
      toast.error(`รวมไฟล์ไม่สำเร็จ: ${e?.message || 'ไม่ทราบสาเหตุ'}`);
      return null;
    } finally {
      setCreatingMerged(false);
    }
  };

  const handleViewMerged = async () => {
    const url = mergedUrlRef.current || (await createMergedUrl(visibleAttachments));
    if (url) window.open(url, '_blank');
  };

  const handleDownloadMerged = async () => {
    const url = mergedUrlRef.current || (await createMergedUrl(visibleAttachments));
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `merged_documents_${submission?.submission_number || submission?.submission_id || ''}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  if (renderedContent) {
    return renderedContent;
  }

  // ===== Render =====
  return (
    <PageLayout
      title={`รายละเอียดคำร้อง #${submission.submission_number || submission.submission_id}`}
      subtitle="รายละเอียดคำร้องประเภทกองทุนทั่วไป"
      icon={FileText}
      actions={
        <button onClick={onBack} className="btn btn-secondary">
          <ArrowLeft size={20} />
          กลับ (Back)
        </button>
      }
      breadcrumbs={[
        { label: 'หน้าแรก', href: '/admin' },
        { label: 'รายการคำร้อง', href: '#', onClick: onBack },
        { label: submission.submission_number || String(submission.submission_id) },
      ]}
    >
      {/* Submission Status */}
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
        className="mb-6"
      >
        <div className="flex justify-between items-start">
          <div>
            <div className="flex flex-col gap-3 mt-4 text-sm">
              <div className="flex flex-wrap items-start gap-2">
                <span className="text-gray-500 shrink-0 min-w-[80px]">ชื่อทุน:</span>
                <span className="font-bold text-gray-700 break-words flex-1">{fundName}</span>
              </div>

              {/* ผู้ขอทุน */}
              <div className="flex flex-wrap items-start gap-2">
                <span className="text-gray-500 shrink-0 min-w-[80px]">ผู้ขอทุน:</span>
                <span className="font-bold text-gray-700 break-words flex-1">{getUserFullName(pickApplicant(submission))}</span>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 mt-2">
                <div className="flex items-start gap-2">
                  <span className="text-gray-500 shrink-0">เลขที่คำร้อง:</span>
                  <span className="font-medium">
                    {submission.submission_number || '-'}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-gray-500 shrink-0">เบอร์ติดต่อ:</span>
                  <span className="font-medium break-words">{contactPhone || '-'}</span>
                </div>
                {submittedAt && (
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 shrink-0">วันที่ส่งคำร้อง:</span>
                    <span className="font-medium">
                      {new Date(submittedAt).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                )}

                {/* Announce Reference */}
                {detail?.announce_reference_number && (
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 shrink-0">หมายเลขอ้างอิงประกาศผลการพิจารณา:</span>
                    <span className="font-medium break-all">{detail.announce_reference_number}</span>
                  </div>
                )}

                {/* Main announcement */}
                {(mainAnn || detail?.main_annoucement) && (
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
                        {mainAnn?.title || mainAnn?.file_name || `#${detail?.main_annoucement}`}
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

                {/* Activity support announcement */}
                {(activityAnn || detail?.activity_support_announcement) && (
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 shrink-0">ประกาศสนับสนุนกิจกรรม:</span>
                    {activityAnn?.file_path ? (
                      <a
                        href={getFileURL(activityAnn.file_path)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline break-all cursor-pointer pointer-events-auto relative z-10"
                        title={activityAnn?.title || activityAnn?.file_name || 'เปิดไฟล์ประกาศ'}
                      >
                        {activityAnn?.title || activityAnn?.file_name || `#${detail?.activity_support_announcement}`}
                      </a>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">
              {baht(requestedAmount || 0)}
            </div>
            <div className="text-sm text-gray-500">จำนวนเงินที่ขอ</div>
            {approvedAmount != null && (
              <div className="mt-2">
                <div className="text-lg font-bold text-green-600">
                  {baht(approvedAmount || 0)}
                </div>
                <div className="text-sm text-gray-500">จำนวนเงินที่อนุมัติ</div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <RequestInfoCard submission={submission} detail={detail} />
        <FundApprovalPanel
          submission={submission}
          fundDetail={detail}
          onApprove={approve}
          onReject={reject}
          onRequestRevision={requestRevision}
        />
      </div>

      {isResearchFundApproved && (
        <Card
          title="ประวัติการจ่ายทุนวิจัย"
          icon={Clock}
          collapsible={false}
          action={
            <button
              type="button"
              onClick={handleOpenEventModal}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={eventSubmitting}
            >
              <PlusCircle size={16} />
              เพิ่มประวัติ (Add Event)
            </button>
          }
          className="mb-6"
        >
          <div className="space-y-6">
            <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-gray-500">สถานะการจ่ายทุน</p>
                <div className="mt-1 flex flex-col gap-2">
                  <span
                    className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${
                      currentFundStatusCode === 'closed'
                        ? 'bg-gray-200 text-gray-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {currentFundStatusLabel || '-'}
                  </span>
                  <p className="text-xs text-gray-500">
                    สามารถเปลี่ยนสถานะได้ขณะบันทึกประวัติการจ่ายทุน
                  </p>
                </div>
                {researchTotals?.last_event_at && (
                  <p className="text-xs text-gray-500 mt-1">
                    อัปเดตล่าสุด: {formatDateTime(researchTotals.last_event_at)}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">ยอดอนุมัติรวม</p>
                <p className="mt-2 text-xl font-semibold text-blue-900">{baht(researchApprovedAmount)}</p>
              </div>
              <div className="rounded-lg bg-green-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-green-600">จ่ายแล้ว</p>
                <p className="mt-2 text-xl font-semibold text-green-900">{baht(researchPaidAmount)}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">คงเหลือ</p>
                <p className={`mt-2 text-xl font-semibold ${researchRemainingAmount < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                  {baht(Math.max(researchRemainingAmount, 0))}
                </p>
              </div>
            </div>

            <div>
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h4 className="text-base font-semibold text-gray-800">ประวัติการการจ่ายทุน</h4>
                <button
                  type="button"
                  onClick={handleReloadResearchEvents}
                  className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={researchLoading}
                >
                  <RefreshCw size={16}/>
                </button>
              </div>

              {researchLoading ? (
                <div className="flex items-center justify-center gap-3 rounded-md border border-dashed border-gray-200 py-8 text-gray-500">
                  <Loader2 size={20} className="animate-spin" />
                  <span>กำลังโหลดข้อมูลประวัติ...</span>
                </div>
              ) : researchError ? (
                <div className="space-y-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <p>ไม่สามารถโหลดไทม์ไลน์ได้: {researchError?.message || 'เกิดข้อผิดพลาด'}</p>
                  <button
                    type="button"
                    onClick={handleReloadResearchEvents}
                    className="inline-flex items-center gap-2 rounded-md border border-red-300 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100"
                  >
                    ลองอีกครั้ง
                  </button>
                </div>
              ) : researchEvents.length === 0 ? (
                <div className="rounded-md border border-dashed border-gray-200 bg-white py-8 text-center text-sm text-gray-500">
                  ยังไม่มีการบันทึกประวัติ
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">จำนวนเงิน / หมายเหตุ</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">สถานะ</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">บันทึกโดย</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">ไฟล์แนบ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {researchEvents.map((event) => (
                        <tr key={event.id ?? `${event.created_at}-${event.amount}`} className="align-top">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-gray-900">{baht(event.amount)}</div>
                            {event.comment && (
                              <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap break-words">{event.comment}</p>
                            )}
                            {!event.comment && (
                              <p className="mt-1 text-xs text-gray-400">ไม่มีหมายเหตุ</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                event.status === 'closed'
                                  ? 'bg-gray-200 text-gray-700'
                                  : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {event.status_label || (event.status === 'closed' ? 'ปิดทุน' : 'อนุมัติ')}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-800">{event.created_by_name || '-'}</div>
                            <div className="text-xs text-gray-500">{formatDateTime(event.created_at)}</div>
                          </td>
                          <td className="px-4 py-3">
                            {(() => {
                              let attachmentList = [];
                              if (Array.isArray(event.attachments) && event.attachments.length > 0) {
                                attachmentList = event.attachments;
                              } else if (event.attachments && typeof event.attachments === 'object') {
                                attachmentList = Object.values(event.attachments).filter(Boolean);
                              } else if (event.files && typeof event.files === 'object' && !Array.isArray(event.files)) {
                                attachmentList = Object.values(event.files).filter(Boolean);
                              }

                              if (!attachmentList.length && Array.isArray(event.files) && event.files.length > 0) {
                                attachmentList = event.files;
                              }

                              if (
                                !attachmentList.length &&
                                (event.file_id || event.file_path || event.file_name)
                              ) {
                                attachmentList = [
                                  {
                                    file_id: event.file_id,
                                    file_path: event.file_path,
                                    file_name: event.file_name,
                                  },
                                ];
                              }

                              if (!attachmentList.length && event.attachment) {
                                attachmentList = [event.attachment];
                              }

                              if (!attachmentList.length) {
                                return <span className="text-xs text-gray-400">ไม่มีไฟล์แนบ</span>;
                              }

                              return (
                                <div className="space-y-2">
                                  {attachmentList.map((file, index) => {
                                    const fileKey = file.file_id ?? `${event.id || event.created_at}-file-${index}`;
                                    const displayName = getAttachmentDisplayName(file);
                                    const fileLabel = `ไฟล์ที่ ${index + 1}`;
                                    const titleLabel = displayName
                                      ? `${fileLabel} ${displayName}`
                                      : fileLabel;
                                    const downloadName = displayName || `attachment-${index + 1}`;
                                    return (
                                      <div
                                        key={fileKey}
                                        className="rounded-md border border-gray-200 bg-white p-2"
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-gray-700 break-all" title={titleLabel}>
                                              {fileLabel}
                                            </p>
                                            {displayName && (
                                              <p className="mt-0.5 text-[11px] text-gray-500 break-all" title={displayName}>
                                                {displayName}
                                              </p>
                                            )}
                                          </div>
                                          <div className="flex flex-wrap gap-2">
                                            {file.file_id ? (
                                              <>
                                                <button
                                                  type="button"
                                                  onClick={() => handleView(file.file_id)}
                                                  className="inline-flex items-center gap-1 rounded-md border border-blue-200 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                                                >
                                                  <Eye size={12} />
                                                  <span>ดู</span>
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => handleDownload(file.file_id, downloadName)}
                                                  className="inline-flex items-center gap-1 rounded-md border border-green-200 px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-50"
                                                >
                                                  <Download size={12} />
                                                  <span>ดาวน์โหลด</span>
                                                </button>
                                              </>
                                            ) : file.file_path ? (
                                              <a
                                                href={getFileURL(file.file_path)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 underline"
                                                title={titleLabel}
                                              >
                                                <Eye size={12} />
                                                <span>เปิดไฟล์แนบ</span>
                                              </a>
                                            ) : null}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Attachments */}
      <Card title="เอกสารแนบ (Attachments)" icon={FileText} collapsible={false}>
        <div className="space-y-6">
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

          {visibleAttachments.length > 0 && (
            <div className="flex justify-end gap-3 pt-4 border-t-1 border-gray-300">
              <button
                className="inline-flex items-center gap-1 border border-blue-200 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleViewMerged}
                disabled={visibleAttachments.length === 0 || merging || creatingMerged}
                title="เปิดดูไฟล์แนบที่ถูกรวมเป็น PDF"
              >
                <Eye size={16} /> ดูไฟล์รวม (PDF)
              </button>
              <button
                className="inline-flex items-center gap-1 border border-green-200 px-3 py-2 text-sm text-green-600 hover:bg-green-50 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleDownloadMerged}
                disabled={visibleAttachments.length === 0 || merging || creatingMerged}
                title="ดาวน์โหลดไฟล์แนบที่ถูกรวมเป็น PDF เดียว"
              >
                <Download size={16} /> ดาวน์โหลดไฟล์รวม
              </button>
            </div>
          )}
        </div>
      </Card>

      <AnimatePresence>
        {showEventModal && (
          <motion.div
            key="event-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={handleCloseEventModal}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                <h3 className="text-lg font-semibold text-gray-800">เพิ่มประวัติการจ่ายทุนวิจัย</h3>
                <button
                  type="button"
                  onClick={handleCloseEventModal}
                  className="rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="ปิดโมดัล"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleEventSubmit} className="space-y-5 px-6 py-5">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">สถานะหลังบันทึก</label>
                  <select
                    value={eventForm.status || currentFundStatusCode || 'approved'}
                    onChange={handleEventStatusChange}
                    disabled={eventSubmitting}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="approved">อนุมัติ (เปิดทุน)</option>
                    <option value="closed" disabled={!canCloseFund}>
                      ปิดทุน
                    </option>
                  </select>
                  {eventErrors.status && (
                    <p className="mt-1 text-sm text-red-600">{eventErrors.status}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    ระบบจะอัปเดตสถานะคำร้องตามที่เลือกในการบันทึกครั้งนี้
                  </p>
                  {!canCloseFund && (
                    <p className="mt-1 text-xs text-orange-600">
                      สามารถปิดทุนได้เมื่อยอดอนุมัติคงเหลือหลังการบันทึกครั้งนี้เท่ากับ 0 บาท
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">หมายเหตุ</label>
                  <textarea
                    rows={3}
                    value={eventForm.comment}
                    onChange={handleEventCommentChange}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="ระบุรายละเอียดเพิ่มเติม (ถ้ามี)"
                    disabled={eventSubmitting}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">จำนวนเงินที่จ่าย (บาท)</label>
                  <input
                    type="number"
                    min="0"
                    max={maxAmountByRemaining}
                    step="0.01"
                    value={eventForm.amount}
                    onChange={handleEventAmountChange}
                    disabled={eventSubmitting}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                  {eventErrors.amount && (
                    <p className="mt-1 text-sm text-red-600">{eventErrors.amount}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">ไฟล์แนบ</label>
                  <input
                    ref={eventFileInputRef}
                    type="file"
                    onChange={handleEventFileChange}
                    disabled={eventSubmitting}
                    className="block w-full text-sm text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-blue-600 hover:file:bg-blue-100"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                  />
                  {eventForm.file && (
                    <div className="mt-2 flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                      <span className="truncate" title={eventForm.file.name}>{eventForm.file.name}</span>
                      <button
                        type="button"
                        onClick={handleRemoveEventFile}
                        className="text-red-500 hover:underline"
                        disabled={eventSubmitting}
                      >
                        ลบไฟล์
                      </button>
                    </div>
                  )}
                  {eventErrors.file && (
                    <p className="mt-1 text-sm text-red-600">{eventErrors.file}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">จำเป็นต้องแนบไฟล์เมื่อมีการบันทึกจำนวนเงิน</p>
                </div>

                <div className="flex flex-col gap-2 rounded-md bg-blue-50 px-4 py-3 text-xs text-blue-700 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-1">
                    <span>ยอดอนุมัติคงเหลือปัจจุบัน: {baht(Math.max(researchRemainingAmount, 0))}</span>
                    <span>คาดว่าจะเหลือหลังบันทึก: {baht(Math.max(projectedRemainingAfterEntry, 0))}</span>
                    {canCloseFund ? (
                      <span className="text-[11px] font-medium text-emerald-600">
                        ยอดคงเหลือหลังบันทึกเป็น 0 สามารถปิดทุนได้
                      </span>
                    ) : null}
                  </div>
                  <span className="sm:text-right">ยอดจ่ายสะสม: {baht(researchPaidAmount + researchPendingAmount)}</span>
                </div>

                <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseEventModal}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={eventSubmitting}
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={eventSubmitting}
                  >
                    {eventSubmitting && <Loader2 size={16} className="animate-spin" />}
                    บันทึกประวัติ
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageLayout>
  );
}