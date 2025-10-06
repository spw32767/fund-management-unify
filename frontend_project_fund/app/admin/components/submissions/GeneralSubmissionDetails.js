// app/admin/components/submissions/GeneralSubmissionDetails.js
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState, useId } from 'react';
import {
  ArrowLeft, FileText,
  CheckCircle, XCircle, AlertTriangle, Clock,
  Eye, Download, PlusCircle, Loader2, ToggleLeft, ToggleRight, RefreshCw, UploadCloud
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

const isResearchFundCategory = (categoryId) => {
  if (categoryId === null || categoryId === undefined) return false;
  const idStr = String(categoryId).toLowerCase();
  return idStr === '1' || idStr === 'research_fund';
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

const formatFileSize = (bytes) => {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size <= 0) return '0 KB';

  const units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let value = size;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const precision = value >= 10 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
};

/* =========================
 * Approval Panel
 * ========================= */
function FundApprovalPanel({ submission, fundDetail, onApprove, onReject }) {
  const statusId = Number(submission?.status_id);
  const requested = Number(fundDetail?.requested_amount || 0);

  const [approved, setApproved] = React.useState(
    Number.isFinite(Number(fundDetail?.approved_amount))
      ? Number(fundDetail?.approved_amount)
      : requested
  );
  const [announceRef, setAnnounceRef] = React.useState(fundDetail?.announce_reference_number || '');
  const [comment, setComment] = React.useState(
    submission?.admin_comment ?? submission?.comment ?? ''
  );  const [errors, setErrors] = React.useState({});

  const validate = () => {
    const e = {};
    const a = Number(approved);
    if (!Number.isFinite(a)) e.approved = 'กรุณากรอกจำนวนเงินเป็นตัวเลข';
    else if (a < 0) e.approved = 'จำนวนเงินต้องไม่ติดลบ';
    else if (a > requested) e.approved = `ต้องไม่เกินจำนวนที่ขอ (${baht(requested)})`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleApprove = async () => {
    if (!validate()) return;

    const html = `
      <div style="text-align:left;font-size:14px;line-height:1.6;display:grid;row-gap:.6rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span>จำนวนที่ขอ</span><strong>${baht(requested)}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-weight:700;">จำนวนที่จะอนุมัติ</span>
          <span style="font-weight:700;color:#047857;">${baht(Number(approved || 0))}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span>หมายเลขอ้างอิงประกาศผลการพิจารณา</span><strong>${(announceRef || '—').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</strong>
        </div>
        ${comment ? `<div><div style="font-weight:500;">หมายเหตุ</div><div style="border:1px solid #e5e7eb;background:#f9fafb;padding:.5rem;border-radius:.5rem;">${comment.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div></div>` : ''}
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
            approved_amount: Number(approved),
            announce_reference_number: announceRef?.trim() || null,
            approval_comment: comment?.trim() || null,
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
    }
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
    if (!reason) return;

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
    }
  };

  // ====== READ-ONLY MODE ======
  if (statusId !== 1) {
    const approvedAmount =
      statusId === 2
        ? Number(
            fundDetail?.approved_amount ??
            approved ?? 0
          )
        : null;

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
              {approvedAmount != null ? baht(approvedAmount) : '—'}
            </span>
          </div>

          <div className="flex items-start justify-between">
            <span className="text-gray-600">หมายเลขอ้างอิงประกาศผลการพิจารณา</span>
            <span className="font-medium">{announceRef || '—'}</span>
          </div>

          <div>
            <div className="text-gray-600 mb-1">หมายเหตุ</div>
            <div className="rounded-md border border-gray-200 bg-gray-50 p-2 min-h-[40px]">
              {comment || '—'}
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
              errors.approved ? 'border-red-400' : 'border-gray-300 hover:border-blue-300',
            ].join(' ')}>
              <input
                type="number"
                step="0.01"
                min="0"
                max={requested}
                value={approved}
                onChange={(e) => setApproved(e.target.value)}
                className="w-full text-right font-mono tabular-nums bg-transparent py-2 pl-3 pr-1 outline-none border-0"
                placeholder="0.00"
              />
              <span className="px-3 text-gray-500 select-none">฿</span>
            </div>
            <div className="h-5 mt-1">
              {errors.approved ? <p className="text-red-600 text-xs">{errors.approved}</p> : null}
            </div>
          </div>
        </div>

        {/* Announcement ref */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <label className="block text-sm font-medium text-gray-700 leading-tight">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <label className="block text-sm font-medium text-gray-700 leading-tight pt-2">
            หมายเหตุ / คำอธิบายเพิ่มเติม
            <br /><span className="text-xs font-normal text-gray-600">Comment</span>
          </label>
          <div className="w-full rounded-md border bg-white shadow-sm transition-all border-gray-300 hover:border-blue-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500">
            <textarea
              className="w-full p-3 rounded-md outline-none bg-transparent resize-y min-h-[96px]"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="เช่น เงื่อนไขการเบิก/เหตุผลประกอบการพิจารณา"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
          <button className="btn btn-success" onClick={handleApprove}>อนุมัติ</button>
          <button className="btn btn-danger" onClick={handleReject}>ไม่อนุมัติ</button>
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
  const { getCodeById, getLabelById } = useStatusMap();

  // attachments
  const [attachments, setAttachments] = useState([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);

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
  const [eventForm, setEventForm] = useState({ comment: '', amount: '0', file: null });
  const [eventErrors, setEventErrors] = useState({});
  const [eventSubmitting, setEventSubmitting] = useState(false);
  const [toggleClosureLoading, setToggleClosureLoading] = useState(false);
  const eventFileInputRef = useRef(null);
  const eventFileInputId = useId();

  const submissionStatusId = submission?.status_id;
  const submissionCategoryId = submission?.category_id;
  const submissionEntityId = submission?.submission_id;

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

  const loadResearchEvents = useCallback(
    async (targetSubmissionId) => {
      const id = targetSubmissionId ?? submissionId;
      if (!id) return;

      setResearchLoading(true);
      setResearchError(null);
      try {
        const { events = [], totals } = await adminSubmissionAPI.getResearchFundEvents(id);
        const toTimestamp = (value) => {
          if (!value) return 0;
          const date = new Date(value);
          return Number.isNaN(date.getTime()) ? 0 : date.getTime();
        };
        const sorted = [...events].sort((a, b) => toTimestamp(a.created_at) - toTimestamp(b.created_at));
        setResearchEvents(sorted);
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
    [submissionId]
  );

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
    if (!isResearchFundCategory(submissionCategoryId)) return false;

    const normalizedCode = statusCode != null ? String(statusCode).toLowerCase() : undefined;
    if (normalizedCode === '1' || normalizedCode === '6') {
      return true;
    }

    const normalizedId = Number(submissionStatusId);
    if (Number.isFinite(normalizedId)) {
      return normalizedId === 2 || normalizedId === 7;
    }

    return false;
  }, [submissionCategoryId, statusCode, submissionStatusId]);

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
          const name =
            d.file_name ??
            d.original_name ??
            d.original_filename ??
            d.File?.original_name ??
            d.file?.original_name ??
            d.name ??
            `เอกสารที่ ${i + 1}`;
          const docTypeId = d.document_type_id ?? d.DocumentTypeID ?? d.doc_type_id ?? null;
          const docTypeName = d.document_type_name || typeMap[String(docTypeId)] || 'ไม่ระบุหมวด';
          return {
            ...d,
            file_id: fileId,
            original_name: name,
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

  const handleReloadResearchEvents = useCallback(() => {
    const targetId = submissionEntityId ?? submissionId;
    if (!targetId) return;
    return loadResearchEvents(targetId);
  }, [submissionEntityId, submissionId, loadResearchEvents]);

  const getEventStatusDisplay = useCallback(
    (event) => {
      if (!event) {
        return {
          label: '-',
          tone: 'neutral',
        };
      }

      const normalizedStatus = String(event.status ?? '').toLowerCase();
      const statusAfterId = Number(event.status_after_id);
      const labelFromMap = Number.isFinite(statusAfterId) ? getLabelById(statusAfterId) : null;
      const fallbackLabel =
        event.status_label ||
        (normalizedStatus === 'closed'
          ? 'ปิดทุน'
          : normalizedStatus === 'approved'
            ? 'อนุมัติ'
            : event.status || '-');

      const label = (labelFromMap || fallbackLabel || '-').toString().trim() || '-';
      const labelLower = label.toLowerCase();

      const isClosed =
        normalizedStatus === 'closed' ||
        statusAfterId === 7 ||
        labelLower.includes('ปิดทุน');
      const isRejected =
        normalizedStatus === 'rejected' ||
        statusAfterId === 3 ||
        labelLower.includes('ไม่อนุมัติ') ||
        labelLower.includes('ปฏิเสธ');
      const isPending =
        normalizedStatus === 'pending' ||
        statusAfterId === 1 ||
        labelLower.includes('รอดำเนินการ');

      let tone = 'approved';
      if (isClosed) tone = 'closed';
      else if (isRejected) tone = 'rejected';
      else if (isPending) tone = 'pending';

      return { label, tone };
    },
    [getLabelById]
  );

  const formType = useMemo(() => {
    const t =
      submission?.form_type ||
      submission?.submission_type ||
      submission?.details?.type ||
      '';
    return String(t).toLowerCase();
  }, [submission]);

  // Redirect to Publication Details page when needed
  if (formType === 'publication_reward') {
    return (
      <PublicationSubmissionDetails submissionId={submissionId} onBack={onBack} />
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
    submission?.details?.data ||
    submission?.payload ||
    submission;

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

  const submittedAt =
    submission?.submitted_at || submission?.created_at || submission?.create_at;

  const handleOpenEventModal = () => {
    setEventErrors({});
    setEventForm({ comment: '', amount: '', file: null });
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
  };

  const handleEventFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setEventForm((prev) => ({ ...prev, file }));
  };

  const handleRemoveEventFile = () => {
    setEventForm((prev) => ({ ...prev, file: null }));
    if (eventFileInputRef.current) {
      eventFileInputRef.current.value = '';
    }
  };

  const handleEventSubmit = async (ev) => {
    ev.preventDefault();
    const errors = {};
    const rawAmount = typeof eventForm.amount === 'string' ? eventForm.amount.trim() : '';
    const parsedAmount = rawAmount === '' ? 0 : Number(rawAmount);
    const isAmountValidNumber = rawAmount === '' ? true : Number.isFinite(parsedAmount);
    const amountValue = isAmountValidNumber ? parsedAmount : NaN;
    const isPaymentEvent = Number.isFinite(amountValue) && amountValue > 0;

    if (!isAmountValidNumber) {
      errors.amount = 'กรุณากรอกจำนวนเงินเป็นตัวเลข';
    } else if (amountValue < 0) {
      errors.amount = 'จำนวนเงินต้องไม่ติดลบ';
    }

    if (isPaymentEvent && !eventForm.file) {
      errors.file = 'กรุณาแนบหลักฐานเมื่อมีการจ่ายเงิน';
    }

    const projectedTotal =
      researchPaidAmount + researchPendingAmount + (isPaymentEvent ? amountValue : 0);
    if (!errors.amount && isPaymentEvent && projectedTotal - researchApprovedAmount > 1e-6) {
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
    formData.append('event_type', isPaymentEvent ? 'payment' : 'note');
    if (isPaymentEvent) {
      formData.append('amount', String(amountValue));
    }
    if (eventForm.file) {
      formData.append('files', eventForm.file);
    }

    setEventSubmitting(true);
    try {
      await adminSubmissionAPI.createResearchFundEvent(submission.submission_id, formData);
      toast.success('บันทึกประวัติเรียบร้อย');
      setShowEventModal(false);
      await refetchSubmission();
      await loadResearchEvents(submission.submission_id);
    } catch (error) {
      console.error('create research fund event failed', error);
      toast.error(error?.message || 'บันทึกประวัติไม่สำเร็จ');
    } finally {
      setEventSubmitting(false);
    }
  };

  const handleToggleClosure = async () => {
    if (!submission?.submission_id) return;
    const nextState = !isFundClosed;
    setToggleClosureLoading(true);
    try {
      const result = await adminSubmissionAPI.toggleResearchFundClosure(
        submission.submission_id,
        {
          status: nextState ? 'closed' : 'approved',
          is_closed: nextState,
        }
      );
      const totals = result?.totals;
      if (totals) {
        setResearchTotals(totals);
        setIsFundClosed(Boolean(totals?.is_closed));
      } else {
        setIsFundClosed(nextState);
      }
      if (Array.isArray(result?.events)) {
        const toTimestamp = (value) => {
          if (!value) return 0;
          const date = new Date(value);
          return Number.isNaN(date.getTime()) ? 0 : date.getTime();
        };
        const sorted = [...result.events].sort((a, b) => toTimestamp(a.created_at) - toTimestamp(b.created_at));
        setResearchEvents(sorted);
      } else {
        await loadResearchEvents(submission.submission_id);
      }
      toast.success(nextState ? 'ปิดทุนเรียบร้อย' : 'เปิดทุนแล้ว');
      try {
        await Promise.all([
          refetchSubmission(),
          loadResearchEvents(submission.submission_id),
        ]);
      } catch (refreshError) {
        console.warn('refresh after toggle failed', refreshError);
      }
    } catch (error) {
      console.error('toggle research fund closure failed', error);
      toast.error(error?.message || 'เปลี่ยนสถานะไม่สำเร็จ');
    } finally {
      setToggleClosureLoading(false);
    }
  };

  // Approve/Reject handlers
  const approve = async (payload) => {
    await adminSubmissionAPI.approveSubmission(submission.submission_id, { ...payload });
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
    await adminSubmissionAPI.rejectSubmission(submission.submission_id, { rejection_reason: reason });
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
      try {
        const blob = await fetchFileAsBlob(doc.file_id);
        const src = await PDFDocument.load(await blob.arrayBuffer(), { ignoreEncryption: true });
        const pages = await merged.copyPages(src, src.getPageIndices());
        pages.forEach((p) => merged.addPage(p));
      } catch (e) {
        console.warn('merge: skip', e);
        skipped.push(doc?.original_name || doc?.file_name || `file-${doc.file_id}.pdf`);
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

  const createMergedUrl = async () => {
    setCreatingMerged(true);
    try {
      const pdfLike = attachments.filter((d) =>
        String(d.original_name || d.file_name || '').toLowerCase().endsWith('.pdf')
      );
      const list = pdfLike.length ? pdfLike : attachments;

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
    const url = mergedUrlRef.current || (await createMergedUrl());
    if (url) window.open(url, '_blank');
  };

  const handleDownloadMerged = async () => {
    const url = mergedUrlRef.current || (await createMergedUrl());
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `merged_documents_${submission?.submission_number || submission?.submission_id || ''}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

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
              {/* ผู้ขอทุน */}
              <div className="flex flex-wrap items-start gap-2">
                <span className="text-gray-500 shrink-0 min-w-[80px]">ผู้ขอทุน:</span>
                <span className="font-medium break-words flex-1">{getUserFullName(pickApplicant(submission))}</span>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 mt-2">
                <div className="flex items-start gap-2">
                  <span className="text-gray-500 shrink-0">เลขที่คำร้อง:</span>
                  <span className="font-medium">
                    {submission.submission_number || '-'}
                  </span>
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
                <p className="text-base font-semibold text-gray-800">
                  {isFundClosed ? 'ปิดทุน' : 'อนุมัติ'}
                </p>
                {researchTotals?.last_event_at && (
                  <p className="text-xs text-gray-500 mt-1">
                    อัปเดตล่าสุด: {formatDateTime(researchTotals.last_event_at)}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleToggleClosure}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                  isFundClosed
                    ? 'bg-red-100 text-red-700 hover:bg-red-200 focus:ring-red-300'
                    : 'bg-green-100 text-green-700 hover:bg-green-200 focus:ring-green-300'
                } disabled:cursor-not-allowed disabled:opacity-60`}
                disabled={toggleClosureLoading}
              >
                {isFundClosed ? <ToggleLeft size={18} /> : <ToggleRight size={18} />}
                {toggleClosureLoading ? 'กำลังอัปเดต...' : isFundClosed ? 'เปิดทุน' : 'ปิดทุน'}
              </button>
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
                      {researchEvents.map((event) => {
                        const { label: statusLabel, tone } = getEventStatusDisplay(event);
                        const statusToneClass =
                          tone === 'closed'
                            ? 'bg-gray-200 text-gray-700'
                            : tone === 'rejected'
                              ? 'bg-red-100 text-red-700'
                              : tone === 'pending'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-green-100 text-green-700';

                        return (
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
                              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusToneClass}`}>
                                {statusLabel}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-gray-800">{event.created_by_name || '-'}</div>
                              <div className="text-xs text-gray-500">{formatDateTime(event.created_at)}</div>
                            </td>
                            <td className="px-4 py-3">
                              {event.file_id || event.file_path ? (
                                <div className="flex flex-col gap-2">
                                  {event.file_name && (
                                    <span className="text-xs text-gray-500 break-all">{event.file_name}</span>
                                  )}
                                  {event.file_id ? (
                                    <div className="flex flex-wrap gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleView(event.file_id)}
                                        className="inline-flex items-center gap-1 rounded-md border border-blue-200 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                                      >
                                        ดูไฟล์
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDownload(event.file_id, event.file_name || 'attachment')}
                                        className="inline-flex items-center gap-1 rounded-md border border-green-200 px-2 py-1 text-xs text-green-600 hover:bg-green-50"
                                      >
                                        ดาวน์โหลด
                                      </button>
                                    </div>
                                  ) : (
                                    <a
                                      href={getFileURL(event.file_path)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-xs text-blue-600 underline"
                                    >
                                      เปิดไฟล์แนบ
                                    </a>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">ไม่มีไฟล์แนบ</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
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
          ) : attachments.length > 0 ? (
            <div className="space-y-4">
              {attachments.map((doc, index) => {
                const fileId = doc.file_id || doc.File?.file_id || doc.file?.file_id;
                const fileName =
                  doc.original_name ||
                  doc.File?.original_name ||
                  doc.file?.original_name ||
                  doc.original_filename ||
                  doc.file_name ||
                  doc.name ||
                  `เอกสารที่ ${index + 1}`;
                const docType = (doc.document_type_name || '').trim() || 'ไม่ระบุประเภท';
                const extension = (fileName.split('.').pop() || '').toUpperCase();
                const filePath = doc.file_path || doc.File?.stored_path || doc.file?.stored_path;

                const openExternal = () => {
                  if (fileId) {
                    handleView(fileId);
                    return;
                  }
                  if (filePath) {
                    window.open(getFileURL(filePath), '_blank', 'noopener');
                  }
                };

                const handleCardClick = (event) => {
                  if (!fileId) return;
                  if (event.target instanceof Element && event.target.closest('button, a')) {
                    return;
                  }
                  handleView(fileId);
                };

                const handleCardKeyDown = (event) => {
                  if (!fileId) return;
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleView(fileId);
                  }
                };

                return (
                  <div
                    key={doc.document_id || fileId || index}
                    className={`group relative rounded-xl border border-transparent bg-white/80 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md ${
                      fileId ? 'cursor-pointer' : 'cursor-default'
                    }`}
                    onClick={handleCardClick}
                    onKeyDown={handleCardKeyDown}
                    role={fileId ? 'button' : undefined}
                    tabIndex={fileId ? 0 : undefined}
                    aria-label={fileId ? `เปิดดู ${fileName}` : undefined}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-1 items-start gap-4 min-w-0">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-sm font-semibold text-blue-600">
                          {extension || index + 1}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <FileText size={16} className="text-gray-500" />
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                              {docType}
                            </span>
                          </div>
                          {fileId ? (
                            <button
                              type="button"
                              onClick={() => handleView(fileId)}
                              className="block max-w-full truncate text-left text-sm font-medium text-blue-600 underline-offset-2 hover:underline"
                              title={`เปิดดู: ${fileName}`}
                            >
                              {fileName}
                            </button>
                          ) : filePath ? (
                            <a
                              href={getFileURL(filePath)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block max-w-full truncate text-sm font-medium text-blue-600 underline-offset-2 hover:underline"
                              title={`เปิดดู: ${fileName}`}
                            >
                              {fileName}
                            </a>
                          ) : (
                            <span className="block max-w-full truncate text-sm font-medium text-gray-500" title={fileName}>
                              {fileName}
                            </span>
                          )}
                          {doc.remark && (
                            <p className="text-xs text-gray-500">{doc.remark}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {fileId ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleView(fileId)}
                              className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-white px-3 py-2 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50"
                              title="เปิดดูไฟล์"
                            >
                              <Eye size={14} />
                              <span>เปิดดู</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownload(fileId, fileName)}
                              className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-white px-3 py-2 text-xs font-medium text-green-600 transition-colors hover:bg-green-50"
                              title="ดาวน์โหลดไฟล์"
                            >
                              <Download size={14} />
                              <span>ดาวน์โหลด</span>
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={openExternal}
                            className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-white px-3 py-2 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={!filePath}
                          >
                            <Eye size={14} />
                            <span>เปิดไฟล์</span>
                          </button>
                        )}
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

          {attachments.length > 0 && (
            <div className="flex justify-end gap-3 pt-4 border-t-1 border-gray-300">
              <button
                className="inline-flex items-center gap-1 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleViewMerged}
                disabled={attachments.length === 0 || merging || creatingMerged}
                title="เปิดดูไฟล์แนบที่ถูกรวมเป็น PDF"
              >
                <Eye size={16} /> ดูไฟล์รวม (PDF)
              </button>
              <button
                className="inline-flex items-center gap-1 px-3 py-2 text-sm text-green-600 hover:bg-green-50 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleDownloadMerged}
                disabled={attachments.length === 0 || merging || creatingMerged}
                title="ดาวน์โหลดไฟล์แนบที่ถูกรวมเป็น PDF เดียว"
              >
                <Download size={16} /> ดาวน์โหลดไฟล์รวม
              </button>
            </div>
          )}
        </div>
      </Card>

      {showEventModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={handleCloseEventModal}
        >
          <div
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
                  step="0.01"
                  value={eventForm.amount}
                  onChange={handleEventAmountChange}
                  disabled={isFundClosed || eventSubmitting}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                  placeholder={isFundClosed ? 'ทุนถูกปิด ไม่สามารถบันทึกจำนวนเงินได้' : '0.00'}
                />
                {isFundClosed && (
                  <p className="mt-1 text-xs text-gray-500">สถานะทุนถูกปิด จะบันทึกได้เฉพาะหมายเหตุ</p>
                )}
                {eventErrors.amount && (
                  <p className="mt-1 text-sm text-red-600">{eventErrors.amount}</p>
                )}
              </div>

              <div>
                <div className="mb-1 text-sm font-medium text-gray-700">ไฟล์แนบ</div>
                <input
                  id={eventFileInputId}
                  ref={eventFileInputRef}
                  type="file"
                  onChange={handleEventFileChange}
                  disabled={eventSubmitting}
                  className="sr-only"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (eventSubmitting) return;
                    eventFileInputRef.current?.click();
                  }}
                  className={`group flex w-full items-center justify-between gap-3 rounded-lg border-2 border-dashed px-4 py-3 text-left text-sm transition ${
                    eventSubmitting
                      ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400'
                      : 'border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2'
                  }`}
                  disabled={eventSubmitting}
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-white/80 p-2 text-blue-500 transition group-hover:bg-white">
                      <UploadCloud size={18} />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {eventForm.file ? 'เลือกไฟล์ใหม่' : 'เลือกไฟล์จากเครื่อง'}
                      </span>
                      <span className="text-xs text-blue-600/80">
                        รองรับ .pdf .jpg .png .docx .xlsx
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-blue-600 underline group-hover:text-blue-700">
                    {eventForm.file ? 'เปลี่ยนไฟล์' : 'เลือกไฟล์'}
                  </span>
                </button>
                {eventForm.file && (
                  <div className="mt-3 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium" title={eventForm.file.name}>{eventForm.file.name}</p>
                        <p className="mt-0.5 text-[11px] text-blue-600/80">ขนาดไฟล์ {formatFileSize(eventForm.file.size)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveEventFile}
                        className="flex-shrink-0 text-xs font-medium text-red-500 hover:text-red-600"
                        disabled={eventSubmitting}
                      >
                        ลบไฟล์
                      </button>
                    </div>
                  </div>
                )}
                {eventErrors.file && (
                  <p className="mt-1 text-sm text-red-600">{eventErrors.file}</p>
                )}
                <p className="mt-2 text-xs text-gray-500">จำเป็นต้องแนบไฟล์เมื่อมีการบันทึกจำนวนเงิน</p>
              </div>

              <div className="flex items-center justify-between rounded-md bg-blue-50 px-4 py-3 text-xs text-blue-700">
                <span>ยอดอนุมัติคงเหลือ: {baht(Math.max(researchRemainingAmount, 0))}</span>
                <span>ยอดจ่ายสะสม: {baht(researchPaidAmount + researchPendingAmount)}</span>
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
          </div>
        </div>
      )}
    </PageLayout>
  );
}