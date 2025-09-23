// app/admin/components/submissions/GeneralSubmissionDetails.js
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, FileText,
  CheckCircle, XCircle, AlertTriangle, Clock,
  Eye, Download,
} from 'lucide-react';

import PageLayout from '../common/PageLayout';
import Card from '../common/Card';
import StatusBadge from '../common/StatusBadge';
import { formatCurrency } from '@/app/utils/format';
import { adminSubmissionAPI } from '@/app/lib/admin_submission_api';
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
    (u) => u.is_applicant || u.IsApplicant
  );
  return su?.user || su?.User || null;
};

const getUserFullName = (u) => {
  if (!u) return '-';
  const name = `${u.user_fname || u.first_name || ''} ${u.user_lname || u.last_name || ''}`.trim();
  return name || (u.email || '-');
};

/* =========================
 * Approval Panel
 *  - โหมด Pending (status_id=1): ฟอร์มอนุมัติ/ไม่อนุมัติ
 *  - โหมดอื่น: แสดงผลแบบ read-only เพื่อเทียบกับฝั่งซ้าย
 * ========================= */
function FundApprovalPanel({ submission, fundDetail, onApprove, onReject }) {
  const statusId = Number(submission?.status_id);
  const requested = Number(fundDetail?.requested_amount || 0);

  // ✅ เรียก Hooks เสมอเพื่อไม่ให้ผิดลำดับเมื่อสถานะเปลี่ยน
  const [approved, setApproved] = React.useState(
    Number.isFinite(Number(fundDetail?.approved_amount))
      ? Number(fundDetail?.approved_amount)
      : requested
  );
  const [announceRef, setAnnounceRef] = React.useState(fundDetail?.announce_reference_number || '');
  const [comment, setComment] = React.useState(fundDetail?.comment || '');
  const [errors, setErrors] = React.useState({});

  const validate = () => {
    const e = {};
    const a = Number(approved);
    if (!Number.isFinite(a)) e.approved = 'กรุณากรอกจำนวนเงินเป็นตัวเลข';
    else if (a < 0) e.approved = 'จำนวนเงินต้องไม่ติดลบ';
    else if (a > requested) e.approved = `ต้องไม่เกินจำนวนที่ขอ (฿${formatCurrency(requested)})`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleApprove = async () => {
    if (!validate()) return;

    const html = `
      <div style="text-align:left;font-size:14px;line-height:1.6;display:grid;row-gap:.6rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span>จำนวนที่ขอ</span><strong>฿${formatCurrency(requested)}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-weight:700;">จำนวนที่จะอนุมัติ</span>
          <span style="font-weight:700;color:#047857;">฿${formatCurrency(Number(approved || 0))}</span>
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
            comment: comment?.trim() || null,
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

  // ====== READ-ONLY MODE (status_id !== 1) ======
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
        <span className="text-blue-700 font-semibold">
          {approvedAmount != null ? `฿${formatCurrency(approvedAmount)}` : '—'}
        </span>
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
            <span className="font-semibold text-blue-700">฿{formatCurrency(requested)}</span>
          </div>

          <div className="flex items-start justify-between">
            <span className="text-gray-600">จำนวนที่อนุมัติ</span>
            <span className="font-semibold text-green-700">
              {approvedAmount != null ? `฿${formatCurrency(approvedAmount)}` : '—'}
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

  // ====== PENDING MODE (status_id === 1) ======
  const headerTitle = (
    <div className="flex items-center justify-between w-full">
      <span>ผลการพิจารณา (Approval Result)</span>
      <span className="text-blue-700 font-semibold">
        ฿{formatCurrency(Number(approved || 0))}
      </span>
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
            ฿{formatCurrency(requested)}
          </div>
        </div>

        {/* Approved input - Fixed grid layout */}
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
              <span className="px-3 text-gray-500 select-none">฿</span>
              <input
                type="number"
                step="0.01"
                min="0"
                max={requested}
                value={approved}
                onChange={(e) => setApproved(e.target.value)}
                className="w-full text-right font-mono tabular-nums bg-transparent py-2 pr-3 outline-none border-0"
                placeholder="0.00"
              />
            </div>
            <div className="h-5 mt-1">
              {errors.approved ? <p className="text-red-600 text-xs">{errors.approved}</p> : null}
            </div>
          </div>
        </div>

        {/* Announcement ref - Fixed grid layout */}
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

        {/* Comment - Fixed grid layout */}
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
 * Request Information (ซ้าย)
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
        {/* Amounts summary on top */}
        <div className="flex items-start justify-between">
          <span className="text-gray-600">จำนวนเงินที่ขอ</span>
          <span className="font-semibold text-blue-700">฿{formatCurrency(requested)}</span>
        </div>
        {approved != null && (
          <div className="flex items-start justify-between">
            <span className="text-gray-600">จำนวนเงินที่อนุมัติ</span>
            <span className="font-semibold text-green-700">฿{formatCurrency(approved)}</span>
          </div>
        )}

        {/* Basic fields */}
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
 * Component หลัก (General)
 * ========================= */
export default function GeneralSubmissionDetails({ submissionId, onBack }) {
  // ---- States/Refs (คงลำดับ Hooks ให้คงที่) ----
  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState(null);
  const { getCodeById } = useStatusMap();

  // เอกสารแนบ + label ประเภทไฟล์
  const [attachments, setAttachments] = useState([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);

  // รวมไฟล์ PDF
  const [merging, setMerging] = useState(false);
  const mergedUrlRef = useRef(null);
  const [creatingMerged, setCreatingMerged] = useState(false);

  const cleanupMergedUrl = () => {
    if (mergedUrlRef.current) {
      URL.revokeObjectURL(mergedUrlRef.current);
      mergedUrlRef.current = null;
    }
  };
  useEffect(() => () => cleanupMergedUrl(), []);

  // โหลดรายละเอียดคำร้อง
  useEffect(() => {
    if (!submissionId) return;
    (async () => {
      setLoading(true);
      try {
        const res = await adminSubmissionAPI.getSubmissionDetails(submissionId);
        let data = res?.submission || res;

        if (res?.submission_users) data.submission_users = res.submission_users;
        if (res?.documents) data.documents = res.documents;

        // map publication detail → เผื่อ reuse
        if (res?.details?.type === 'publication_reward' && res.details.data) {
          data.PublicationRewardDetail = res.details.data;
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

  // ผสาน label ประเภทไฟล์ → attachments
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

  const formType = useMemo(() => {
    const t =
      submission?.form_type ||
      submission?.submission_type ||
      submission?.details?.type ||
      '';
    return String(t).toLowerCase();
  }, [submission]);

  // เส้นทางตีพิมพ์ → ใช้หน้าพิเศษเดิม
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

  const requestedAmount = Number(detail?.requested_amount ?? submission?.requested_amount ?? 0);
  const approvedAmount =
    submission?.status_id === 2
      ? Number(detail?.approved_amount ?? submission?.approved_amount ?? 0)
      : null;

  const submittedAt =
    submission?.submitted_at || submission?.created_at || submission?.create_at;

  // === API wiring สำหรับอนุมัติ/ไม่อนุมัติแบบ "ทั่วไป" ===
  const approve = async (payload) => {
    await adminSubmissionAPI.approveSubmission(submission.submission_id, { ...payload });
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
    await adminSubmissionAPI.rejectSubmission(submission.submission_id, { rejection_reason: reason });
    const res = await adminSubmissionAPI.getSubmissionDetails(submission.submission_id);
    let data = res?.submission || res;
    if (res?.submission_users) data.submission_users = res.submission_users;
    if (res?.documents) data.documents = res.documents;
    if (res?.details?.type === 'publication_reward' && res.details.data) {
      data.PublicationRewardDetail = res.details.data;
    }
    setSubmission(data);
  };

  // ===== ดู/โหลดไฟล์เดี่ยว (คงเดิม) =====
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

  // ===== รวมไฟล์แนบเป็น PDF เดียว (คงเดิม) =====
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
        console.warn('merge: skip', doc?.original_name || doc?.file_name || doc?.file_id, e);
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
                <span className="text-gray-500 shrink-0 min-w-[80px]">ผู้ขอทุน:</span>
                <span className="font-medium break-words flex-1">{getUserFullName(pickApplicant(submission))}</span>
              </div>
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
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(requestedAmount || 0)}
            </div>
            <div className="text-sm text-gray-500">จำนวนเงินที่ขอ</div>
            {approvedAmount != null && (
              <div className="mt-2">
                <div className="text-lg font-bold text-green-600">
                  {formatCurrency(approvedAmount || 0)}
                </div>
                <div className="text-sm text-gray-500">จำนวนเงินที่อนุมัติ</div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* ==== ซ้าย–ขวา: Request Information | Approval Result ==== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <RequestInfoCard submission={submission} detail={detail} />
        <FundApprovalPanel
          submission={submission}
          fundDetail={detail}
          onApprove={approve}
          onReject={reject}
        />
      </div>

      {/* ===== เอกสารแนบ (Attachments) — ไม่แตะโค้ดหลักของคุณ ===== */}
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
                            <p className="font-medium text-gray-900 truncate" title={fileName}>
                              {fileName}
                            </p>
                          </div>
                          <p className="text-sm text-gray-600">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                              {docType}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          className="inline-flex items-center gap-1 px-3 py-2 text-sm text-blue-600 hover:bg-blue-100 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => handleView(fileId)}
                          disabled={!fileId}
                          title="เปิดดูไฟล์"
                        >
                          <Eye size={14} />
                          <span>ดู</span>
                        </button>
                        <button
                          className="inline-flex items-center gap-1 px-3 py-2 text-sm text-green-600 hover:bg-green-100 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => handleDownload(fileId, fileName)}
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

          {/* ปุ่มรวม PDF (คงเดิม) */}
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
    </PageLayout>
  );
}