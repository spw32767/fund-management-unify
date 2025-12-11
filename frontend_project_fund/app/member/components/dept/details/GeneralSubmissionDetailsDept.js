// app/admin/components/submissions/GeneralSubmissionDetailsDept.js
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, FileText,
    User,
  CheckCircle, XCircle, AlertTriangle, Clock,
  Eye, Download, DollarSign,
  ChevronDown, MessageCircle,
} from 'lucide-react';

import PageLayout from '../../common/PageLayout';
import Card from '../../common/Card';
import StatusBadge from '../../common/StatusBadge';
import deptHeadAPI from '@/app/lib/dept_head_api';
import apiClient from '@/app/lib/api';
import { notificationsAPI } from '@/app/lib/notifications_api';
import { toast } from 'react-hot-toast';
import { useStatusMap } from '@/app/hooks/useStatusMap';
import { PDFDocument } from 'pdf-lib';
import PublicationSubmissionDetailsDept from './PublicationSubmissionDetailsDept';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

/* =========================
 * Helpers
 * ========================= */

// --- ADD THIS HELPER (near other helpers e.g., above the component) ---
const formatCurrency = (n) =>
  Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');


const formatDate = (dateString) => {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '—';
  try {
    return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch (_) {
    return d.toISOString().slice(0,10);
  }
};

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

// format THB
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


const DECISION_OPTIONS = [
  {
    value: 'approve',
    label: 'อนุมัติ',
    hint: 'บันทึกผลพร้อมลายเซ็นหัวหน้าสาขา',
    description: 'ยืนยันการอนุมัติและบันทึกหมายเหตุ/ลายเซ็นที่ระบุ',
    icon: CheckCircle,
    iconClass: 'text-emerald-600',
    iconBg: 'bg-emerald-50',
    activeRing: 'ring-emerald-200',
  },
  {
    value: 'reject',
    label: 'ไม่อนุมัติ',
    hint: 'เปลี่ยนสถานะเป็นไม่อนุมัติ',
    description: 'ปฏิเสธคำร้องและแจ้งเหตุผลที่ระบุในขั้นตอนถัดไป',
    icon: XCircle,
    iconClass: 'text-red-600',
    iconBg: 'bg-red-50',
    activeRing: 'ring-red-200',
  },
  {
    value: 'revision',
    label: 'ต้องการข้อมูลเพิ่มเติม',
    hint: 'แจ้งผู้ยื่นให้ส่งข้อมูลเพิ่มเติม',
    description: 'ส่งคำขอข้อมูลเพิ่มเติมโดยใช้หมายเหตุของหัวหน้าสาขา',
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
 * Dept Decision Panel (แทน Approval Result เดิมทั้งก้อน)
 * ========================= */
function DeptDecisionPanel({ submission, onApprove, onReject, onRequestRevision, onBack }) {
  const [comment, setComment] = useState(
    submission?.head_comment ??
      submission?.department_head_comment ??
      submission?.dept_head_comment ??
      ''
  );
  const [headSignature, setHeadSignature] = useState(
    submission?.head_signature ?? ''
  );
  const announceReference =
    submission?.announce_reference_number ??
    submission?.announce_reference ??
    '';
  const [announceRef, setAnnounceRef] = useState(announceReference || '');
  const [saving, setSaving] = useState(false);
  const [selectedAction, setSelectedAction] = useState('approve');
  const [decisionPending, setDecisionPending] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setAnnounceRef(announceReference || '');
  }, [announceReference]);

  const statusId = Number(submission?.status_id);
  const canAct = statusId === 1 || String(submission?.status?.status_code || '').toLowerCase() === 'pending';

  const handleApprove = async () => {
    const trimmedComment = comment?.trim() || '';
    const trimmedSignature = headSignature?.trim() || '';
    const trimmedAnnounce = announceRef?.trim() || '';
    if (!trimmedSignature) {
      await Swal.fire({
        icon: 'warning',
        title: 'กรุณาระบุลายเซ็นหัวหน้าสาขา',
        text: 'โปรดพิมพ์ชื่อเต็มของหัวหน้าสาขาก่อนดำเนินการ.',
      });
      return false;
    }
    const html = `
      <div style="text-align:left;font-size:14px;line-height:1.6;">
        ${trimmedAnnounce
          ? `<div style="margin-bottom:0.75rem;">
              <div style="font-weight:500;margin-bottom:.25rem;">หมายเลขอ้างอิงประกาศผลการพิจารณา</div>
              <div style="border:1px solid #e5e7eb;background:#f9fafb;padding:.5rem;border-radius:.5rem;">${escapeHtml(trimmedAnnounce)}</div>
            </div>`
          : ''}
        <div style="margin-bottom:0.75rem;">
          <div style="font-weight:500;margin-bottom:.25rem;">ลายเซ็นหัวหน้าสาขา</div>
          <div style="border:1px solid #e5e7eb;background:#f9fafb;padding:.5rem;border-radius:.5rem;">${escapeHtml(trimmedSignature)}</div>
        </div>
        <div>
          <div style="font-weight:500;margin-bottom:.25rem;">หมายเหตุจากหัวหน้าสาขา</div>
          ${trimmedComment
            ? `<div style=\"border:1px solid #e5e7eb;background:#f9fafb;padding:.5rem;border-radius:.5rem;white-space:pre-wrap;\">${escapeHtml(trimmedComment)}</div>`
            : `<div style=\"font-size:12px;color:#6b7280;\">(ไม่มีหมายเหตุ)</div>`
          }
        </div>
      </div>
    `;

    const result = await Swal.fire({
      title: 'ยืนยันการอนุมัติ',
      html,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยันอนุมัติ',
      cancelButtonText: 'ยกเลิก',
      showLoaderOnConfirm: true,
      allowOutsideClick: () => !Swal.isLoading(),
      preConfirm: async () => {
        try {
          setSaving(true);
          // ส่งหมายเหตุ (comment/head_comment) ไปเก็บที่ submissions เท่านั้น
          await onApprove(trimmedComment, trimmedSignature, trimmedAnnounce);
        } catch (e) {
          Swal.showValidationMessage(e?.message || 'อนุมัติไม่สำเร็จ');
          throw e;
        } finally {
          setSaving(false);
        }
      },
    });

    if (result.isConfirmed) {
      await Swal.fire({ icon: 'success', title: 'อนุมัติแล้ว', timer: 1400, showConfirmButton: false });
      if (typeof onBack === 'function') onBack();
      return true;
    }

    return false;
  };


  const handleReject = async () => {
    const trimmedSignature = headSignature?.trim() || '';
    const trimmedComment = comment?.trim() || '';
    const trimmedAnnounce = announceRef?.trim() || '';
    // Step 1: กล่องกรอกเหตุผล
    const { value: reason } = await Swal.fire({
      title: 'เหตุผลการไม่อนุมัติ',
      input: 'textarea',
      inputPlaceholder: 'โปรดระบุเหตุผล...',
      inputAttributes: { 'aria-label': 'เหตุผลการไม่อนุมัติ' },
      showCancelButton: true,
      confirmButtonText: 'ถัดไป',
      cancelButtonText: 'ยกเลิก',
      inputValidator: (v) => (!v?.trim() ? 'กรุณาระบุเหตุผล' : undefined),
    });
    if (!reason) return false;

    // Step 2: กล่องยืนยัน + preConfirm เรียก onReject
    const res2 = await Swal.fire({
      title: 'ยืนยันการไม่อนุมัติ',
      html: `
        <div style="text-align:left;font-size:14px;">
          <div style="margin-bottom:0.75rem;">
            <div style="font-weight:500;margin-bottom:.25rem;">เหตุผลการไม่อนุมัติ</div>
            <div style="border:1px solid #e5e7eb;background:#f9fafb;padding:.75rem;border-radius:.5rem;white-space:pre-wrap;">
              ${escapeHtml(String(reason).trim())}
            </div>
          </div>
          <div style="margin-bottom:0.75rem;">
            <div style="font-weight:500;margin-bottom:.25rem;">ลายเซ็นหัวหน้าสาขา</div>
            ${trimmedSignature
              ? `<div style=\"border:1px solid #e5e7eb;background:#f9fafb;padding:.5rem;border-radius:.5rem;\">${escapeHtml(trimmedSignature)}</div>`
              : `<div style=\"font-size:12px;color:#6b7280;\">(ไม่ระบุลายเซ็น)</div>`
            }
          </div>
          ${trimmedAnnounce
            ? `<div style="margin-bottom:0.75rem;">
                <div style="font-weight:500;margin-bottom:.25rem;">หมายเลขอ้างอิงประกาศผลการพิจารณา</div>
                <div style=\"border:1px solid #e5e7eb;background:#f9fafb;padding:.5rem;border-radius:.5rem;\">${escapeHtml(trimmedAnnounce)}</div>
              </div>`
            : ''}
          <div>
            <div style="font-weight:500;margin-bottom:.25rem;">หมายเหตุจากหัวหน้าสาขา</div>
            ${trimmedComment
              ? `<div style=\"border:1px solid #e5e7eb;background:#f9fafb;padding:.5rem;border-radius:.5rem;white-space:pre-wrap;\">${escapeHtml(trimmedComment)}</div>`
              : `<div style=\"font-size:12px;color:#6b7280;\">(ไม่มีหมายเหตุ)</div>`
            }
          </div>
          <p style="font-size:12px;color:#6b7280;margin-top:.75rem;">
            ระบบจะบันทึกเหตุผลและเปลี่ยนสถานะคำร้องเป็น “ไม่อนุมัติ”
          </p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ยืนยันไม่อนุมัติ',
      cancelButtonText: 'ยกเลิก',
      showLoaderOnConfirm: true,
      allowOutsideClick: () => !Swal.isLoading(),
      preConfirm: async () => {
        try {
          setSaving(true);
          // ส่งเหตุผล + หมายเหตุหัวหน้าสาขา (comment) ไปหลังบ้าน (เก็บที่ submissions เท่านั้น)
          await onReject(
            String(reason).trim(),
            trimmedComment,
            trimmedSignature,
            trimmedAnnounce
          );
        } catch (e) {
          Swal.showValidationMessage(e?.message || 'ไม่อนุมัติไม่สำเร็จ');
          throw e;
        } finally {
          setSaving(false);
        }
      },
    });

    if (res2.isConfirmed) {
      await Swal.fire({ icon: 'success', title: 'ดำเนินการแล้ว', timer: 1200, showConfirmButton: false });
      if (typeof onBack === 'function') onBack();
      return true;
    }

    return false;
  };

  const handleRequestRevision = async () => {
    const trimmedSignature = headSignature?.trim() || '';
    const trimmedComment = comment?.trim() || '';
    const trimmedAnnounce = announceRef?.trim() || '';

    if (!trimmedComment) {
      setErrors((prev) => ({
        ...prev,
        comment: 'กรุณาระบุหมายเหตุเพื่อขอข้อมูลเพิ่มเติม',
      }));
      await Swal.fire({
        icon: 'warning',
        title: 'กรุณาระบุหมายเหตุ',
        text: 'โปรดกรอกหมายเหตุของหัวหน้าสาขาก่อนขอข้อมูลเพิ่มเติม',
      });
      return false;
    }

    const result = await Swal.fire({
      title: 'ยืนยันการขอข้อมูลเพิ่มเติม',
      html: `
        <div style="text-align:left;font-size:14px;line-height:1.6;display:grid;row-gap:.75rem;">
          ${trimmedAnnounce
            ? `<div style="margin-bottom:0.75rem;">
                <div style="font-weight:500;margin-bottom:.25rem;">หมายเลขอ้างอิงประกาศผลการพิจารณา</div>
                <div style=\"border:1px solid #e5e7eb;background:#f9fafb;padding:.5rem;border-radius:.5rem;\">${escapeHtml(trimmedAnnounce)}</div>
              </div>`
            : ''}
          <div>
            <div style="font-weight:500;margin-bottom:.35rem;">หมายเหตุของหัวหน้าสาขา</div>
            <div style="border:1px solid #e5e7eb;background:#f9fafb;padding:.75rem;border-radius:.75rem;white-space:pre-wrap;">${escapeHtml(trimmedComment)}</div>
          </div>
          <div>
            <div style="font-weight:500;margin-bottom:.25rem;">ลายเซ็นหัวหน้าสาขา</div>
            ${trimmedSignature
              ? `<div style="border:1px solid #e5e7eb;background:#f9fafb;padding:.5rem;border-radius:.5rem;">${escapeHtml(trimmedSignature)}</div>`
              : `<div style="font-size:12px;color:#6b7280;">(ไม่ระบุลายเซ็น)</div>`}
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'บันทึกคำขอ',
      cancelButtonText: 'ยกเลิก',
      showLoaderOnConfirm: true,
      allowOutsideClick: () => !Swal.isLoading(),
      preConfirm: async () => {
        try {
          setSaving(true);
          await onRequestRevision({
            message: trimmedComment,
            headComment: trimmedComment,
            headSignature: trimmedSignature,
            announceReference: trimmedAnnounce,
          });
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
        if (!prev.comment) return prev;
        const updated = { ...prev };
        delete updated.comment;
        return updated;
      });

      await Swal.fire({ icon: 'success', title: 'ส่งคำขอแล้ว', timer: 1400, showConfirmButton: false });
      if (typeof onBack === 'function') onBack();
      return true;
    }

    return false;
  };

  const handleDecisionSubmit = async () => {
    if (decisionPending || saving) return;

    setDecisionPending(true);
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
      setDecisionPending(false);
    }
  };

  return (
    <Card title="ผลการพิจารณา (หัวหน้าสาขา)" icon={DollarSign} collapsible={false}>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700 leading-tight">
            หมายเลขอ้างอิงประกาศผลการพิจารณา
            <br /><span className="text-xs font-normal text-gray-600">Announcement Ref.</span>
          </label>
          <div
            className="rounded-lg border bg-white shadow-sm transition border-gray-300 hover:border-blue-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500"
          >
            <input
              type="text"
              className="w-full rounded-lg border-0 bg-transparent p-3 outline-none"
              placeholder="เช่น 123/2568"
              value={announceRef}
              onChange={(e) => setAnnounceRef(e.target.value)}
              disabled={saving || decisionPending}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700 leading-tight">
            หมายเหตุของหัวหน้าสาขา
            <br /><span className="text-xs font-normal text-gray-600">Comment</span>
          </label>
          <div
            className={[
              'rounded-lg border bg-white shadow-sm transition',
              'border-gray-300 hover:border-blue-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500',
              errors.comment ? 'border-red-400 focus-within:border-red-500 focus-within:ring-red-500/40' : '',
            ].join(' ')}
          >
            <textarea
              className="w-full min-h-[100px] rounded-lg border-0 bg-transparent p-3 outline-none"
              placeholder="เขียนหมายเหตุของหัวหน้าสาขาหรือบันทึกหมายเหตุ (ถ้ามี)"
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
              disabled={saving}
            />
          </div>
          {errors.comment ? (
            <p className="text-xs text-red-600 text-right">{errors.comment}</p>
          ) : (
            <p className="text-xs text-gray-400 text-right">ใช้หมายเหตุนี้เมื่อขอข้อมูลเพิ่มเติม</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700 leading-tight">
            ลายเซ็นหัวหน้าสาขา (พิมพ์ชื่อเต็ม)
            <br /><span className="text-xs font-normal text-gray-600">Head Signature</span>
          </label>
          <input
            type="text"
            className="w-full rounded-lg border border-gray-300 p-3 outline-none transition focus:ring-2 focus:ring-blue-500"
            placeholder="พิมพ์ชื่อเต็มของหัวหน้าสาขา"
            value={headSignature}
            onChange={(e) => setHeadSignature(e.target.value)}
            disabled={saving}
          />
        </div>

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
                disabled={saving || decisionPending}
                className="w-full md:min-w-[18rem]"
              />
            </div>
            <div className="flex items-center justify-end gap-3 md:self-end">
              {(saving || decisionPending) && (
                <span className="text-sm text-gray-500">กำลังดำเนินการ…</span>
              )}
              <button
                className="btn btn-primary min-w-[164px] justify-center gap-2 disabled:opacity-60"
                onClick={handleDecisionSubmit}
                disabled={saving || decisionPending}
                title="บันทึกผลการพิจารณา"
              >
                บันทึกผล
              </button>
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
export default function GeneralSubmissionDetailsDept({ submissionId, onBack }) {
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

  const pickArray = useCallback((...candidates) => {
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) return candidate;
    }
    return [];
  }, []);

  // Merged PDF
  const [merging, setMerging] = useState(false);
  const mergedUrlRef = useRef(null);
  const [creatingMerged, setCreatingMerged] = useState(false);

  // announcements for Status Summary
  const [mainAnn, setMainAnn] = useState(null);
  const [activityAnn, setActivityAnn] = useState(null);

  const cleanupMergedUrl = () => {
    if (mergedUrlRef.current) {
      URL.revokeObjectURL(mergedUrlRef.current);
      mergedUrlRef.current = null;
    }
  };
  useEffect(() => () => cleanupMergedUrl(), []);

  // Load details
  useEffect(() => {
    if (!submissionId) return;
    (async () => {
      setLoading(true);
      try {
        const res = await deptHeadAPI.getSubmissionDetails(submissionId);

        let data = res?.submission || res;

        if (res?.submission_users) data.submission_users = res.submission_users;
        if (res?.documents) data.documents = res.documents;
        if (res?.details) data.details = res.details;

        if (res?.details?.type === 'fund_application' && res.details.data) {
          data.FundApplicationDetail = res.details.data;
        }

        const applicant =
          res?.applicant || res?.applicant_user || data?.user || data?.User;
        if (applicant) {
          data.applicant = applicant;
          data.user = applicant;
        }
        if (res?.applicant_user_id) data.applicant_user_id = res.applicant_user_id;

        setSubmission(data);

      } catch (e) {
        console.error('load details failed', e);
        toast.error('โหลดรายละเอียดไม่สำเร็จ');
      } finally {
        setLoading(false);
      }
    })();
  }, [submissionId]);

  // Load attachments
  useEffect(() => {
    const loadAttachments = async () => {
      if (!submission?.submission_id) return;
      setAttachmentsLoading(true);
      try {
        const [docRes, typeRes] = await Promise.all([
          (deptHeadAPI.getSubmissionDocuments
            ? deptHeadAPI.getSubmissionDocuments(submission.submission_id)
            : Promise.resolve(submission.documents || submission.submission_documents || [])),
          (deptHeadAPI.getDocumentTypes
            ? deptHeadAPI.getDocumentTypes()
            : Promise.resolve([])),
        ]);
        const docsApi = pickArray(
          docRes?.documents,
          docRes?.data?.documents,
          docRes?.data?.documents?.data,
          docRes?.data?.documents?.items,
          docRes?.data?.documents?.results,
          docRes?.data?.items,
          docRes?.data?.results,
          docRes?.data,
          docRes?.items,
          docRes?.results,
          docRes?.documents?.data,
          docRes?.documents?.items,
          docRes?.documents?.results,
          docRes
        );

        const typesArr = pickArray(
          typeRes?.document_types,
          typeRes?.data?.document_types,
          typeRes?.data?.document_types?.data,
          typeRes?.data?.document_types?.items,
          typeRes?.data?.document_types?.results,
          typeRes?.data?.items,
          typeRes?.data?.results,
          typeRes?.data,
          typeRes?.items,
          typeRes?.results,
          typeRes
        );

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

  // Map announcements when detail present
  useEffect(() => {
    const d =
      submission?.FundApplicationDetail ||
      submission?.fund_application_detail ||
      submission?.details?.data?.fund_application_detail ||
      submission?.details?.data ||
      null;
    if (!d) { setMainAnn(null); setActivityAnn(null); return; }

    const mainId = d?.main_annoucement;
    const actId  = d?.activity_support_announcement;

    let cancelled = false;
    (async () => {
      try {
        // เหมือนหน้า Publication: รองรับหลายทรงของ response
        if (mainId) {
          const r = await deptHeadAPI.getAnnouncement(mainId);
          const a = r?.announcement || r?.data?.announcement || r?.data || r || null;
          if (!cancelled) setMainAnn(a);
        } else {
          setMainAnn(null);
        }
        if (actId) {
          const r2 = await deptHeadAPI.getAnnouncement(actId);
          const a2 = r2?.announcement || r2?.data?.announcement || r2?.data || r2 || null;
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

  const formType = useMemo(() => {
    const t =
      submission?.form_type ||
      submission?.submission_type ||
      submission?.details?.type ||
      '';
    return String(t).toLowerCase();
  }, [submission]);

  // Redirect to Publication Dept page if needed
  if (formType === 'publication_reward') {
    return (
      <PublicationSubmissionDetailsDept submissionId={submissionId} onBack={onBack} />
    );
  }

  if (loading) {
    return (
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
  }

  if (!submission) {
    return (
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
    submission?.fund_application_detail ||
    submission?.details?.data?.fund_application_detail ||
    submission?.details?.data ||
    submission?.payload ||
    submission;

  const requestedAmount =
    parseAmount(detail?.requested_amount ?? submission?.requested_amount) ?? 0;
  const approvedAmount =
    submission?.status_id === 2
      ? parseAmount(detail?.approved_amount ?? submission?.approved_amount)
      : null;

  const submittedAt =
    submission?.submitted_at || submission?.created_at || submission?.create_at;


  // ---- Derived fields used by Status Summary ----
  const createdAt = submission?.created_at || submission?.create_at || null;
  const headApprovedAt = submission?.head_approved_at || submission?.headApprovedAt || null;
  const headRejectedAt = submission?.head_rejected_at || submission?.headRejectedAt || null;
  const headRejectionReason = submission?.head_rejection_reason || submission?.headRejectionReason || '';
  const adminApprovedAt = submission?.admin_approved_at || submission?.adminApprovedAt || null;
  const adminRejectedAt = submission?.admin_rejected_at || submission?.adminRejectedAt || null;
  const adminRejectionReason = submission?.admin_rejection_reason || submission?.adminRejectionReason || '';

  // Best-effort fund subcategory display name (no backend change)
  const fundName = (() => {
    const cand =
      submission?.Subcategory?.subcategory_name ||
      submission?.subcategory?.subcategory_name ||
      submission?.subcategory_name ||
      detail?.fund_subcategory_name ||
      detail?.subcategory_name ||
      detail?.subcategory?.subcategory_name ||
      null;
    return (typeof cand === 'string' && cand.trim()) ? cand.trim() : '—';
  })();

  // ---- Robust subcategory/fund display name (fallbacks) ----
  const firstNonEmpty = (...vals) => {
    for (const v of vals) {
      if (typeof v === 'string' && v.trim() !== '') return v.trim();
    }
    return null;
  };

  const contactPhone = firstNonEmpty(
    submission?.contact_phone,
    submission?.details?.data?.contact_phone,
    detail?.contact_phone,
    detail?.fund_application_detail?.contact_phone,
  ) || '';

  const bankAccount = firstNonEmpty(
    submission?.bank_account,
    submission?.details?.data?.bank_account,
    detail?.bank_account,
    detail?.fund_application_detail?.bank_account,
  ) || '';

  const bankName = firstNonEmpty(
    submission?.bank_name,
    submission?.details?.data?.bank_name,
    detail?.bank_name,
    detail?.fund_application_detail?.bank_name,
  ) || '';

  const bankAccountName = firstNonEmpty(
    submission?.bank_account_name,
    submission?.details?.data?.bank_account_name,
    detail?.bank_account_name,
    detail?.fund_application_detail?.bank_account_name,
  ) || '';

  const getSubcategoryNameGeneral = (submission, detail) => {
    // 1) ลองจาก detail ก่อน (ชื่อ key เปลี่ยนได้ตามฟอร์ม)
    const fromDetail = firstNonEmpty(
      detail?.subcategory_name_th,
      detail?.subcategory_name,
      detail?.fund_subcategory_name,
      detail?.subcategory_label,
      detail?.fund_subcategory_label,
      detail?.fund_name_th,
      detail?.fund_name
    );
    if (fromDetail) return fromDetail;

    // 2) ฟิลด์แบบแบนบน submission (ถ้า backend ยิงชื่อแนบมา)
    const fromSubmissionFlat = firstNonEmpty(
      submission?.subcategory_name_th,
      submission?.subcategory_name,
      submission?.fund_subcategory_name,
      submission?.fund_name_th,
      submission?.fund_name
    );
    if (fromSubmissionFlat) return fromSubmissionFlat;

    // 3) อ็อบเจ็กต์ซ้อนบน submission/detail
    const subcatObj =
      submission?.subcategory ||
      submission?.Subcategory ||
      submission?.fund_subcategory ||
      submission?.FundSubcategory ||
      detail?.subcategory ||
      null;

    const fromObj = firstNonEmpty(
      subcatObj?.subcategory_name_th,
      subcatObj?.subcategory_name,
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

    return fromObj || '—';
  };

  const displaySubName = (fundName && fundName !== '—')
    ? fundName
    : getSubcategoryNameGeneral(submission, detail);


  // ===== Approve/Reject handlers (Dept) =====
  // รับ headComment จากแผง แล้วส่งไปกับ recommendSubmission
  const approve = async (headComment, headSignature, announceReference) => {
    const body = {};
    if (headComment) {
      body.head_comment = headComment;
    }
    if (headSignature) {
      body.head_signature = headSignature;
    }
    const trimmedRef = typeof announceReference === 'string' ? announceReference.trim() : '';
    if (trimmedRef) {
      body.announce_reference_number = trimmedRef;
      body.announce_reference = trimmedRef;
    }
    await deptHeadAPI.recommendSubmission(submission.submission_id, body);

    try {
      await notificationsAPI.notifyDeptHeadRecommended(submission.submission_id, {
        comment: typeof headComment === 'string' ? headComment.trim() : '',
      });
    } catch (notifyErr) {
      console.warn('notifyDeptHeadRecommended failed:', notifyErr);
    }
    // refresh
    const res = await deptHeadAPI.getSubmissionDetails(submission.submission_id);
    let data = res?.submission || res;
    if (res?.submission_users) data.submission_users = res.submission_users;
    if (res?.documents) data.documents = res.documents;
    if (res?.details) data.details = res.details;
    if (res?.details?.type === 'fund_application' && res.details.data) {
      data.FundApplicationDetail = res.details.data;
    }
    setSubmission(data);
  };

  // ส่งเหตุผลปฏิเสธ + (ถ้ามี) คอมเมนต์ของหัวหน้าสาขา
  const reject = async (reason, headComment, headSignature, announceReference) => {
    const payload = { head_rejection_reason: reason };
    if (headComment) {
      payload.head_comment = headComment;
    }
    if (headSignature) {
      payload.head_signature = headSignature;
    }
    const trimmedRef = typeof announceReference === 'string' ? announceReference.trim() : '';
    if (trimmedRef) {
      payload.announce_reference_number = trimmedRef;
      payload.announce_reference = trimmedRef;
    }
    await deptHeadAPI.rejectSubmission(submission.submission_id, payload);

    try {
      await notificationsAPI.notifyDeptHeadNotRecommended(submission.submission_id, {
        reason: typeof reason === 'string' ? reason.trim() : '',
        comment: typeof headComment === 'string' ? headComment.trim() : '',
      });
    } catch (notifyErr) {
      console.warn('notifyDeptHeadNotRecommended failed:', notifyErr);
    }
    // refresh
    const res = await deptHeadAPI.getSubmissionDetails(submission.submission_id);
    let data = res?.submission || res;
    if (res?.submission_users) data.submission_users = res.submission_users;
    if (res?.documents) data.documents = res.documents;
    if (res?.details) data.details = res.details;
    if (res?.details?.type === 'fund_application' && res.details.data) {
      data.FundApplicationDetail = res.details.data;
    }
    setSubmission(data);
  };

  const requestRevision = async ({ message, headComment, headSignature, announceReference }) => {
    const payload = {};
    const trimmedMessage = message?.trim();
    const trimmedComment = headComment?.trim();
    const trimmedSignature = headSignature?.trim();
    const trimmedRef = typeof announceReference === 'string' ? announceReference.trim() : '';

    if (trimmedMessage) {
      payload.request_comment = trimmedMessage;
      payload.revision_comment = trimmedMessage;
      payload.reason = trimmedMessage;
    }
    if (trimmedComment) {
      payload.head_comment = trimmedComment;
    }
    if (trimmedSignature) {
      payload.head_signature = trimmedSignature;
    }
    if (trimmedRef) {
      payload.announce_reference_number = trimmedRef;
      payload.announce_reference = trimmedRef;
    }

    await deptHeadAPI.requestRevision(submission.submission_id, payload);

    const res = await deptHeadAPI.getSubmissionDetails(submission.submission_id);
    let data = res?.submission || res;
    if (res?.submission_users) data.submission_users = res.submission_users;
    if (res?.documents) data.documents = res.documents;
    if (res?.details) data.details = res.details;
    if (res?.details?.type === 'fund_application' && res.details.data) {
      data.FundApplicationDetail = res.details.data;
    }
    setSubmission(data);
  };

  const statusCode = getCodeById(submission.status_id);
  const ColoredIcon = getColoredStatusIcon(statusCode);

  const resolveFileId = (doc) =>
    doc?.file_id ??
    doc?.File?.file_id ??
    doc?.file?.file_id ??
    doc?.file?.id ??
    doc?.File?.id ??
    null;

  const resolveFilePath = (doc) => {
    const candidates = [
      doc?.file_path,
      doc?.File?.file_path,
      doc?.file?.file_path,
      doc?.File?.stored_path,
      doc?.file?.stored_path,
      doc?.download_url,
      doc?.url,
      doc?.File?.url,
      doc?.file?.url,
      doc?.path,
      doc?.File?.path,
      doc?.file?.path,
    ];
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim() !== '') {
        return candidate;
      }
    }
    return null;
  };

  const resolveFileName = (doc, fallback = 'document') => {
    const candidate =
      typeof doc?.original_name === 'string' ? doc.original_name.trim() : '';
    return candidate || fallback;
  };

  const fetchManagedFileBlob = async (fileId) => {
    const token = apiClient.getToken();
    const url = `${apiClient.baseURL}/files/managed/${fileId}/download`;
    const resp = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!resp.ok) {
      const err = new Error('File not found');
      err.status = resp.status;
      throw err;
    }
    return await resp.blob();
  };

  const fetchBlobByPath = async (filePath) => {
    if (!filePath) throw new Error('missing file path');
    const token = apiClient.getToken();
    const url = getFileURL(filePath);
    const resp = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!resp.ok) {
      const err = new Error('File not found');
      err.status = resp.status;
      throw err;
    }
    return await resp.blob();
  };

  const fetchAttachmentBlob = async (doc) => {
    if (!doc) throw new Error('missing document');
    const fileId = resolveFileId(doc);
    if (fileId != null) {
      try {
        return await fetchManagedFileBlob(fileId);
      } catch (err) {
        console.warn('Managed file fetch failed, try path fallback', fileId, err);
      }
    }

    const filePath = resolveFilePath(doc);
    if (filePath) {
      return await fetchBlobByPath(filePath);
    }

    throw new Error('File not accessible');
  };

  const openBlobInNewTab = (blob) => {
    const fileURL = window.URL.createObjectURL(blob);
    window.open(fileURL, '_blank');
    setTimeout(() => {
      try {
        window.URL.revokeObjectURL(fileURL);
      } catch (err) {
        console.warn('revokeObjectURL failed', err);
      }
    }, 1000);
  };

  const triggerBlobDownload = (blob, fileName) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => {
      try {
        window.URL.revokeObjectURL(url);
      } catch (err) {
        console.warn('revokeObjectURL failed', err);
      }
    }, 1000);
  };

  // ===== File handlers =====
  const handleView = async (doc) => {
    if (!doc) {
      toast.error('ไม่พบไฟล์');
      return;
    }
    try {
      const blob = await fetchAttachmentBlob(doc);
      openBlobInNewTab(blob);
    } catch (e) {
      console.error('Error viewing document:', e);
      toast.error('ไม่สามารถเปิดไฟล์ได้');
    }
  };

  const handleDownload = async (doc, fallbackName = 'document') => {
    if (!doc) {
      toast.error('ไม่พบไฟล์');
      return;
    }

    const fileId = resolveFileId(doc);
    const fileName = resolveFileName(doc, fallbackName);

    if (fileId != null) {
      try {
        await apiClient.downloadFile(`/files/managed/${fileId}/download`, fileName);
        return;
      } catch (err) {
        console.warn('Managed download failed, fallback to path', fileId, err);
      }
    }

    try {
      const blob = await fetchAttachmentBlob(doc);
      triggerBlobDownload(blob, fileName);
    } catch (e) {
      console.error('Error downloading document:', e);
      toast.error('ไม่สามารถดาวน์โหลดไฟล์ได้');
    }
  };

  // ===== Merge attachments to pdf =====

  const mergeAttachmentsToPdf = async (list) => {
    const merged = await PDFDocument.create();
    const skipped = [];
    for (const doc of list) {
      try {
        const blob = await fetchAttachmentBlob(doc);
        const src = await PDFDocument.load(await blob.arrayBuffer(), { ignoreEncryption: true });
        const pages = await merged.copyPages(src, src.getPageIndices());
        pages.forEach((p) => merged.addPage(p));
      } catch (e) {
        const skippedName = resolveFileName(doc, doc?.file_id ? `file-${doc.file_id}.pdf` : 'unknown.pdf');
        console.warn('merge: skip', skippedName, e);
        skipped.push(skippedName);
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
    const availableDocs = Array.isArray(documents) ? documents : [];
    if (!availableDocs.length) {
      toast.error('ไม่พบไฟล์ที่สามารถรวมได้');
      return null;
    }

    setCreatingMerged(true);
    try {
      const pdfLike = availableDocs.filter((d) =>
        String(d.original_name || d.file_name || d.File?.file_name || d.file?.file_name || '')
          .toLowerCase()
          .endsWith('.pdf')
      );
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
  className="mb-6"
>
  <div className="flex justify-between items-start">
    <div>
      <div className="flex flex-col gap-3 mt-4 text-sm">
        {/* ชื่อทุน — ทำให้ตัวหนา */}
        <div className="flex flex-wrap items-start gap-2">
          <span className="text-gray-500 shrink-0 min-w-[80px]">ชื่อทุน:</span>
          <span className="font-bold text-gray-700 break-words flex-1">
            {displaySubName}
          </span>
        </div>

        {/* ผู้ขอทุน */}
        <div className="flex flex-wrap items-start gap-2">
          <span className="text-gray-500 shrink-0 min-w-[80px]">ผู้ขอทุน:</span>
          <span className="font-bold text-gray-700 break-words flex-1">
            {getUserFullName(applicant)}
          </span>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 mt-2">
          {/* เลขที่คำร้อง */}
          <div className="flex items-start gap-2">
            <span className="text-gray-500 shrink-0">เลขที่คำร้อง:</span>
            <span className="font-medium break-all">{submission.submission_number || '-'}</span>
          </div>

          <div className="flex items-start gap-2">
            <span className="text-gray-500 shrink-0">เบอร์ติดต่อ:</span>
            <span className="font-medium break-words">{contactPhone || '-'}</span>
          </div>

          {/* วันที่สร้างคำร้อง (ถ้ามี) */}
          {createdAt && (
            <div className="flex items-start gap-2">
              <span className="text-gray-500 shrink-0">วันที่สร้างคำร้อง:</span>
              <span className="font-medium">{formatDate(createdAt)}</span>
            </div>
          )}

          {/* วันที่ส่งคำร้อง */}
          {submittedAt && (
            <div className="flex items-start gap-2">
              <span className="text-gray-500 shrink-0">วันที่ส่งคำร้อง:</span>
              <span className="font-medium">{formatDate(submittedAt)}</span>
            </div>
          )}

          {/* วันที่อนุมัติ (ใช้ของผู้ดูแลถ้ามี ถ้าไม่มีก็ใช้ของหัวหน้าสาขา) */}
          {(adminApprovedAt || headApprovedAt) && (
            <div className="flex items-start gap-2">
              <span className="text-gray-500 shrink-0">วันที่อนุมัติ:</span>
              <span className="font-medium">{formatDate(adminApprovedAt || headApprovedAt)}</span>
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

          {/* เหตุผลการไม่อนุมัติ (ถ้ามี) */}
          {(adminRejectedAt || headRejectedAt) && (adminRejectionReason || headRejectionReason) && (
            <div className="flex items-start gap-2 md:col-span-2 lg:col-span-3">
              <span className="text-gray-500 shrink-0">เหตุผลการไม่อนุมัติ:</span>
              <span className="font-medium break-words flex-1">
                {adminRejectionReason || headRejectionReason}
              </span>
            </div>
          )}

          {/* ประกาศหลักเกณฑ์ */}
          {(mainAnn || detail?.main_annoucement) && (
            <div className="flex items-start gap-2">
              <span className="text-gray-500 shrink-0">ประกาศหลักเกณฑ์:</span>
              {mainAnn?.file_path ? (
                <a
                  href={getFileURL(mainAnn.file_path)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline break-all cursor-pointer pointer-events-auto relative z-10"
                  title={mainAnn?.title || mainAnn?.file_name || `#${detail?.main_annoucement}`}
                >
                  {mainAnn?.title || mainAnn?.file_name || `#${detail?.main_annoucement}`}
                </a>
              ) : (
                <span className="text-gray-400">-</span>
              )}
            </div>
          )}

          {/* ประกาศกิจกรรม/สนับสนุน */}
          {(activityAnn || detail?.activity_support_announcement) && (
            <div className="flex items-start gap-2">
              <span className="text-gray-500 shrink-0">ประกาศกิจกรรม:</span>
              {activityAnn?.file_path ? (
                <a
                  href={getFileURL(activityAnn.file_path)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline break-all cursor-pointer pointer-events-auto relative z-10"
                  title={activityAnn?.title || activityAnn?.file_name || `#${detail?.activity_support_announcement}`}
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

    {/* Amounts (คอลัมน์ขวา) */}
    <div className="text-right">
      <div className="text-2xl font-bold text-blue-600">
        {formatCurrency(requestedAmount ?? 0)}
      </div>
      <div className="text-sm text-gray-500">จำนวนเงินที่ขอ</div>

      {approvedAmount != null && (
        <div className="mt-2">
          <div className="text-lg font-bold text-green-600">
            {formatCurrency(approvedAmount ?? 0)}
          </div>
          <div className="text-xs text-gray-500">จำนวนเงินที่อนุมัติ</div>
        </div>
      )}
    </div>

  </div>
</Card>


      {/* Two-column layout: ซ้ายรายละเอียด / ขวาแผงตัดสินใจหัวหน้าสาขา */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <RequestInfoCard submission={submission} detail={detail} />
        <DeptDecisionPanel
          submission={submission}
          onApprove={approve}
          onReject={reject}
          onRequestRevision={requestRevision}
          onBack={onBack}
        />
      </div>

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

                const canOpen = fileId != null || !!resolveFilePath(doc);

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
                          {/* ชื่อไฟล์: ทำเป็นลิงก์สีน้ำเงิน กดแล้วเรียก handleView(doc) */}
                          {canOpen ? (
                            <a
                              href="#"
                              onClick={(e) => { e.preventDefault(); handleView(doc); }}
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
                          className="inline-flex items-center gap-1 px-3 py-2 text-sm text-blue-600 hover:bg-blue-100 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => handleView(doc)}
                          disabled={!canOpen}
                          title="เปิดดูไฟล์"
                        >
                          <Eye size={14} />
                          <span>ดู</span>
                        </button>
                        <button
                          className="inline-flex items-center gap-1 px-3 py-2 text-sm text-green-600 hover:bg-green-100 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => handleDownload(doc, downloadName)}
                          disabled={!canOpen}
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
                className="inline-flex items-center gap-1 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleViewMerged}
                disabled={visibleAttachments.length === 0 || merging || creatingMerged}
                title="เปิดดูไฟล์แนบที่ถูกรวมเป็น PDF"
              >
                <Eye size={16} /> ดูไฟล์รวม (PDF)
              </button>
              <button
                className="inline-flex items-center gap-1 px-3 py-2 text-sm text-green-600 hover:bg-green-50 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
    </PageLayout>
  );
}