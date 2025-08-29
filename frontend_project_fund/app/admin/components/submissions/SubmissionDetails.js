'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
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
  Download,
  Eye,
  Users,
  Link,
  FileCheck,
  RefreshCcw,
  Check,
  X as XIcon,
} from 'lucide-react';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import PageLayout from '../common/PageLayout';
import Card from '../common/Card';
import { toast } from 'react-hot-toast';
import apiClient from '@/app/lib/api';
import { adminSubmissionAPI } from '@/app/lib/admin_submission_api';

/** =========================
 *  Helpers
 *  ========================= */
const StatusBadge = ({ statusId }) => {
  const map = {
    1: 'bg-yellow-100 text-yellow-800',
    2: 'bg-green-100 text-green-800',
    3: 'bg-red-100 text-red-800',
    4: 'bg-orange-100 text-orange-800',
    5: 'bg-gray-100 text-gray-800',
  };
  const label = { 1: 'รอพิจารณา', 2: 'อนุมัติ', 3: 'ไม่อนุมัติ', 4: 'ต้องแก้ไข', 5: 'แบบร่าง' }[statusId] || 'ไม่ทราบสถานะ';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${map[statusId] || map[5]}`}>
      {label}
    </span>
  );
};

const getStatusIcon = (statusId) => {
  switch (statusId) {
    case 2:
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    case 3:
      return <XCircle className="h-5 w-5 text-red-600" />;
    case 4:
      return <AlertCircle className="h-5 w-5 text-orange-600" />;
    default:
      return <Clock className="h-5 w-5 text-yellow-600" />;
  }
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
};

const formatCurrency = (n) =>
  Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const parseCurrency = (raw) => {
  if (raw === '' || raw === null || raw === undefined) return 0;
  if (typeof raw === 'number') return raw;
  const cleaned = String(raw).replace(/[,\s]/g, '');
  const n = Number(cleaned);
  return Number.isNaN(n) ? 0 : n;
};

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

/** =========================
 *  Inline Approval Panel (admin-only)
 *  ========================= */
function ApprovalPanel({ submission, pubDetail, onPersist, onApprove, onReject }) {
  const approvable = submission?.status_id === 1;
  if (!approvable) return null;

  // --- Requested maxima (mirror "ข้อมูลการเงิน") ---
  const requestedReward = Number(pubDetail?.reward_amount || 0);
  const requestedRevision = Number(pubDetail?.revision_fee || pubDetail?.editing_fee || 0);
  const requestedPublication = Number(pubDetail?.publication_fee || pubDetail?.page_charge || 0);
  const requestedTotal = Number(pubDetail?.total_amount || pubDetail?.reward_amount || 0);

  // numeric states used for validation / recalc / API
  const [rewardApprove, setRewardApprove] = React.useState(pubDetail?.reward_approve_amount ?? 0);
  const [revisionApprove, setRevisionApprove] = React.useState(pubDetail?.revision_fee_approve_amount ?? 0);
  const [publicationApprove, setPublicationApprove] = React.useState(pubDetail?.publication_fee_approve_amount ?? 0);
  const [totalApprove, setTotalApprove] = React.useState(
    pubDetail?.total_approve_amount ??
      ((pubDetail?.reward_approve_amount || 0) +
        (pubDetail?.revision_fee_approve_amount || 0) +
        (pubDetail?.publication_fee_approve_amount || 0))
  );

  const [manualTotal, setManualTotal] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState({});
  const [confirmAction, setConfirmAction] = React.useState(null); // 'approve' | 'reject' | null

  // keep numeric states in sync with payload on load
  React.useEffect(() => {
    setRewardApprove(pubDetail?.reward_approve_amount ?? 0);
    setRevisionApprove(pubDetail?.revision_fee_approve_amount ?? 0);
    setPublicationApprove(pubDetail?.publication_fee_approve_amount ?? 0);
    setTotalApprove(
      pubDetail?.total_approve_amount ??
        ((pubDetail?.reward_approve_amount || 0) +
          (pubDetail?.revision_fee_approve_amount || 0) +
          (pubDetail?.publication_fee_approve_amount || 0))
    );
  }, [pubDetail]);

  // auto-recalc total (and clamp to requested total when auto)
  React.useEffect(() => {
    if (!manualTotal) {
      const sum =
        Number(rewardApprove || 0) +
        Number(revisionApprove || 0) +
        Number(publicationApprove || 0);
      setTotalApprove(Math.min(sum, requestedTotal));
    }
  }, [rewardApprove, revisionApprove, publicationApprove, manualTotal, requestedTotal]);

  const validate = () => {
    const e = {};
    const check = (k, v, max) => {
      const num = Number(v);
      if (Number.isNaN(num)) e[k] = 'กรุณากรอกตัวเลขที่ถูกต้อง';
      else if (num < 0) e[k] = 'จำนวนต้องไม่เป็นค่าติดลบ';
      else if (typeof max === 'number' && num > max) e[k] = `ห้ามเกิน ฿${formatCurrency(max)}`;
    };
    check('rewardApprove', rewardApprove, requestedReward);
    check('revisionApprove', revisionApprove, requestedRevision);
    check('publicationApprove', publicationApprove, requestedPublication);
    check('totalApprove', totalApprove, requestedTotal);
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const recalc = () => {
    setManualTotal(false);
    const sum =
      Number(rewardApprove || 0) +
      Number(revisionApprove || 0) +
      Number(publicationApprove || 0);
    setTotalApprove(Math.min(sum, requestedTotal));
  };

  const approve = async () => {
    if (!validate()) return;
    if (!manualTotal) recalc();
    setSaving(true);
    try {
      await onApprove({
        reward_approve_amount: Number(rewardApprove),
        revision_fee_approve_amount: Number(revisionApprove),
        publication_fee_approve_amount: Number(publicationApprove),
        total_approve_amount: Number(totalApprove),
      });
      toast.success('อนุมัติคำร้องแล้ว');
    } catch (e) {
      toast.error(e?.message || 'อนุมัติไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const reject = async () => {
    if (!rejectReason.trim()) {
      setErrors((p) => ({ ...p, rejectReason: 'กรุณาระบุเหตุผลการไม่อนุมัติ' }));
      return;
    }
    setSaving(true);
    try {
      await onReject(rejectReason.trim());
      toast.success('ดำเนินการไม่อนุมัติแล้ว');
    } catch (e) {
      toast.error(e?.message || 'ไม่อนุมัติไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  // ---- Simplest input with max clamp + helper text ----
  const MoneyInput = React.useRef(function MoneyInputInner({
    value, onChange, error, bold = false, disabled = false, aria,
    max, min = 0, autoSyncWhenDisabled = false,
  }) {
    const sanitize = (raw) => {
      // allow digits and a single dot, clamp to 2 decimals
      let only = raw.replace(/[^\d.]/g, '').replace(/(\..*?)\..*/g, '$1');
      const parts = only.split('.');
      if (parts[1] && parts[1].length > 2) only = parts[0] + '.' + parts[1].slice(0, 2);
      return only;
    };

    const [text, setText] = React.useState(() => (Number(value || 0) === 0 ? '' : String(value)));
    const [touched, setTouched] = React.useState(false);

    // sync from parent (when untouched) or while disabled & autosyncing (Total auto mode)
    React.useEffect(() => {
      if (!touched || (autoSyncWhenDisabled && disabled)) {
        setText(Number(value || 0) === 0 ? '' : String(value));
      }
    }, [value, disabled, touched, autoSyncWhenDisabled]);

    const handleChange = (e) => {
      const raw = sanitize(e.target.value);
      setTouched(true);

      // parse & clamp to [min, max]
      const num = raw === '' ? 0 : Number(raw);
      const upper = typeof max === 'number' ? max : Number.POSITIVE_INFINITY;
      const clamped = Math.min(Math.max(num, min), upper);

      // **Hard-limit the field**: if user enters > max, snap the text to max immediately
      if (num > upper) {
        setText(String(upper));
      } else {
        setText(raw);
      }
      onChange(clamped);
    };

    const helper = typeof max === 'number' ? `สูงสุด ฿${formatCurrency(max)}` : null;

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
          />
        </div>
        <div className="h-5 mt-1">
          {error ? (
            <p className="text-red-600 text-xs text-right">{error}</p>
          ) : helper ? (
            <p className="text-gray-500 text-xs text-right">{helper}</p>
          ) : null}
        </div>
      </div>
    );
  }).current;

  // SweetAlert2 confirms
  const confirmApprove = async () => {
    // validate form first
    if (!validate()) return;
    if (!manualTotal) recalc();

    const html = `
      <div style="text-align:left;font-size:14px;">
        <div style="display:flex;justify-content:space-between;margin:.25rem 0;">
          <span>เงินรางวัลที่อนุมัติ</span>
          <strong>฿${formatCurrency(rewardApprove)}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;margin:.25rem 0;">
          <span>ค่าปรับปรุงบทความ (อนุมัติ)</span>
          <strong>฿${formatCurrency(revisionApprove)}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;margin:.25rem 0;">
          <span>ค่าธรรมเนียมการตีพิมพ์ (อนุมัติ)</span>
          <strong>฿${formatCurrency(publicationApprove)}</strong>
        </div>
        <hr style="margin:.5rem 0;" />
        <div style="display:flex;justify-content:space-between;margin:.25rem 0;">
          <span class="swal2-title" style="font-size:14px;">รวมอนุมัติ</span>
          <span style="font-weight:700;color:#047857;">฿${formatCurrency(totalApprove)}</span>
        </div>
        <p style="font-size:12px;color:#6b7280;margin-top:.5rem;">
          จำนวนอนุมัติจะถูกบันทึกและสถานะคำร้องจะเปลี่ยนเป็น “อนุมัติ”
        </p>
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
            reward_approve_amount: Number(rewardApprove),
            revision_fee_approve_amount: Number(revisionApprove),
            publication_fee_approve_amount: Number(publicationApprove),
            total_approve_amount: Number(totalApprove),
          });
        } catch (e) {
          Swal.showValidationMessage(e?.message || 'อนุมัติไม่สำเร็จ');
          throw e;
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
    }
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) {
      setErrors((p) => ({ ...p, rejectReason: 'กรุณาระบุเหตุผลการไม่อนุมัติ' }));
      await Swal.fire({
        icon: 'error',
        title: 'ไม่สามารถดำเนินการ',
        text: 'กรุณาระบุเหตุผลการไม่อนุมัติ',
        confirmButtonText: 'ตกลง',
      });
      return;
    }

    const html = `
      <div style="text-align:left;font-size:14px;">
        <div style="font-weight:500;margin-bottom:.25rem;">เหตุผลการไม่อนุมัติ</div>
        <div style="border:1px solid #e5e7eb;background:#f9fafb;padding:.75rem;border-radius:.5rem;white-space:pre-wrap;">
          ${rejectReason.replace(/</g,'&lt;').replace(/>/g,'&gt;')}
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
          await onReject(rejectReason.trim());
        } catch (e) {
          Swal.showValidationMessage(e?.message || 'ไม่อนุมัติไม่สำเร็จ');
          throw e;
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
    }
  };

  return (
    <Card title="แผงอนุมัติ (Approval Panel)" icon={DollarSign} collapsible={false}>
      <div className="space-y-4">
        {/* Header */}
        <div className="grid grid-cols-2 pb-2 border-b text-sm text-gray-600">
          <div></div>
          <div className="text-right">
            <div>จำนวนที่อนุมัติ</div>
            <div className="text-xs text-gray-500">Approved Amount</div>
          </div>
        </div>

        {/* Reward (max = Requested Reward Amount) */}
        <div className="grid grid-cols-2 items-center">
          <label className="block text-sm font-medium text-gray-700">
            เงินรางวัลที่อนุมัติ
            <br /><span className="text-xs font-normal text-gray-600">Approve Reward Amount</span>
          </label>
          <MoneyInput
            aria="Approved reward amount"
            value={rewardApprove}
            onChange={setRewardApprove}
            error={errors.rewardApprove}
            max={requestedReward}
          />
        </div>

        {/* Revision (max = Requested Manuscript Editing Fee) */}
        <div className="grid grid-cols-2 items-center">
          <label className="block text-sm font-medium text-gray-700">
            ค่าปรับปรุงบทความ (อนุมัติ)
            <br /><span className="text-xs font-normal text-gray-600">Approve Manuscript Editing Fee</span>
          </label>
          <MoneyInput
            aria="Approved revision fee"
            value={revisionApprove}
            onChange={setRevisionApprove}
            error={errors.revisionApprove}
            max={requestedRevision}
          />
        </div>

        {/* Publication fee (max = Requested Page Charge) */}
        <div className="grid grid-cols-2 items-center">
          <label className="block text-sm font-medium text-gray-700">
            ค่าธรรมเนียมการตีพิมพ์ (อนุมัติ)
            <br /><span className="text-xs font-normal text-gray-600">Approve Page Charge</span>
          </label>
          <MoneyInput
            aria="Approved publication fee"
            value={publicationApprove}
            onChange={setPublicationApprove}
            error={errors.publicationApprove}
            max={requestedPublication}
          />
        </div>

        {/* External funding (read-only) */}
        {(pubDetail?.external_funding_amount ?? 0) > 0 && (
          <div className="grid grid-cols-2 items-center">
            <label className="block text-sm font-medium text-gray-700">
              เงินสนับสนุนจากภายนอก
              <br /><span className="text-xs font-normal text-gray-600">External Funding — ไม่ต้องอนุมัติ</span>
            </label>
            <div className="text-right text-gray-400">—</div>
          </div>
        )}

        {/* Total (max = Requested Total Reimbursement) */}
        <div className="grid grid-cols-2 items-center pt-2 border-t">
          <label className="block font-medium text-gray-700">
            รวมอนุมัติ (Total Approved)
            <div className="text-xs font-normal text-gray-600 flex items-center gap-2 mt-1">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={manualTotal}
                  onChange={(e) => setManualTotal(e.target.checked)}
                />
                ปรับเอง (Manual)
              </label>
              <button className="btn btn-ghost btn-xs inline-flex items-center gap-1" type="button" onClick={recalc}>
                <RefreshCcw size={14} />
                Recalculate
              </button>
            </div>
          </label>
          <MoneyInput
            aria="Total approved amount"
            value={totalApprove}
            onChange={setTotalApprove}
            error={errors.totalApprove}
            bold
            disabled={!manualTotal}
            autoSyncWhenDisabled
            max={requestedTotal}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            className="btn btn-success inline-flex items-center gap-2 disabled:opacity-60"
            onClick={confirmApprove}
            disabled={saving}
          >
            <Check size={18} />
            อนุมัติ
          </button>

          <button
            className="btn btn-danger inline-flex items-center gap-2 disabled:opacity-60"
            onClick={confirmReject}
            disabled={saving}
          >
            <XIcon size={18} />
            ไม่อนุมัติ
          </button>

          {saving && <span className="text-sm text-gray-500">กำลังดำเนินการ...</span>}
        </div>

        {/* Reject reason (styled like input field) */}
        <div className="space-y-1">
          <label className="text-sm text-gray-600">เหตุผลการไม่อนุมัติ (กรณีปฏิเสธ)</label>
          <div
            className={[
              "rounded-md border bg-white shadow-sm transition-all",
              errors.rejectReason
                ? "border-red-400 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500"
                : "border-gray-300 hover:border-blue-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500"
            ].join(" ")}
          >
            <textarea
              className="w-full p-3 rounded-md outline-none bg-transparent resize-y min-h-[96px]"
              placeholder="โปรดระบุเหตุผลหากไม่อนุมัติ"
              value={rejectReason}
              onChange={(e) => {
                setRejectReason(e.target.value);
                if (errors.rejectReason) setErrors((prev) => ({ ...prev, rejectReason: undefined }));
              }}
            />
          </div>
          {errors.rejectReason && <p className="text-red-600 text-xs">{errors.rejectReason}</p>}
        </div>
      </div>
    </Card>
  );
}


/** =========================
 *  Main Component
 *  ========================= */
export default function SubmissionDetails({ submissionId, onBack }) {
  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState(null);
  const [activeTab, setActiveTab] = useState('details');

  // ---- Load data from admin endpoint (same shape as user page) ----
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

        // Attach applicant if present on response root
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

  // ---- Applicant & Co-authors (EXACT same logic as user page) ----
  const getApplicant = useMemo(
    () => () => {
      if (!submission) return null;

      // Prefer explicit fields from API root (if present)
      const explicit =
        submission.applicant ||
        submission.applicant_user ||
        submission.user ||
        submission.User;
      if (explicit) return explicit;

      const users = submission.submission_users || [];

      // 1) Flags/roles that indicate "Applicant"
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

      // 2) Match by IDs coming from various fields on submission
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

      // 3) Fallback: first in display order
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

          // treat these as applicant markers, exclude them
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


  // ---- Derived publication detail ----
  const pubDetail =
    submission?.PublicationRewardDetail ||
    submission?.publication_reward_detail ||
    submission?.details?.data ||
    {};

  // ---- Approved amounts for display (if already approved) ----
  const approvedTotal =
    pubDetail?.total_approve_amount ??
    pubDetail?.approved_amount ??
    (Number(pubDetail?.reward_approve_amount || 0) +
      Number(pubDetail?.revision_fee_approve_amount || 0) +
      Number(pubDetail?.publication_fee_approve_amount || 0));

  const showApprovedColumn =
    submission?.status_id === 2 &&
    approvedTotal != null &&
    !Number.isNaN(Number(approvedTotal));

  /** File actions (unchanged behavior) */
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

  // ---- Admin actions wiring ----
  const persistAmounts = async (amounts) => {
    await adminSubmissionAPI.updateApprovalAmounts(submission.submission_id, amounts);
    setSubmission((prev) => {
      if (!prev) return prev;
      const next = { ...prev };
      next.PublicationRewardDetail = { ...(next.PublicationRewardDetail || {}), ...amounts };
      return next;
    });
  };

  const approve = async (amounts) => {
    await adminSubmissionAPI.approveSubmission(submission.submission_id, { ...amounts });
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

  const reject = async (reason) => {
    await adminSubmissionAPI.rejectSubmission(submission.submission_id, { rejection_reason: reason });
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

  // ---- Loading / error states ----
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

  const documents = submission.documents || submission.submission_documents || [];

  return (
    <PageLayout
      title={`เงินรางวัลตีพิมพ์ #${submission.submission_number}`}
      subtitle="รายละเอียดคำร้องขอเงินรางวัลการตีพิมพ์ผลงานวิชาการ (มุมมองผู้ดูแล)"
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
      <Card className="mb-6 border-l-4 border-blue-500" collapsible={false}>
        <div className="flex justify-between items-start">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              {getStatusIcon(submission.status_id)}
              <h3 className="text-lg font-semibold">สถานะคำร้อง (Submission Status)</h3>
              <div className="flex-shrink-0">
                <StatusBadge statusId={submission.status_id} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-sm">
              <div>
                <span className="text-gray-500">วันที่สร้างคำร้อง:</span>
                <span className="ml-2 font-medium">{formatDate(submission.created_at)}</span>
              </div>
              {submission.submitted_at && (
                <div>
                  <span className="text-gray-500">วันที่ส่งคำร้อง:</span>
                  <span className="ml-2 font-medium">{formatDate(submission.submitted_at)}</span>
                </div>
              )}
              {submission.approved_at && (
                <div>
                  <span className="text-gray-500">วันที่อนุมัติ:</span>
                  <span className="ml-2 font-medium">{formatDate(submission.approved_at)}</span>
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(pubDetail.reward_amount || 0)}
            </div>
            <div className="text-sm text-gray-500">จำนวนเงินที่ขอ</div>
            {showApprovedColumn && (
              <div className="mt-2">
                <div className="text-lg font-bold text-green-600">
                  {formatCurrency(approvedTotal)}
                </div>
                <div className="text-sm text-gray-500">จำนวนเงินที่อนุมัติ</div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
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
          {/* Publication Information — field names match the user view */}
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
                  <p className="font-medium">{pubDetail.quartile || pubDetail.journal_quartile || '-'}</p>
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

          {/* Financial (user-like) */}
          <Card title="ข้อมูลการเงิน (Financial Information)" icon={DollarSign} collapsible={false}>
            <div className="space-y-4">
              <div
                className={`grid ${showApprovedColumn ? 'grid-cols-3' : 'grid-cols-2'} pb-2 border-b text-sm text-gray-600`}
              >
                <div></div>
                <div className="text-right">
                  <div>จำนวนที่ขอ</div>
                  <div className="text-xs text-gray-500">Requested Amount</div>
                </div>
                {showApprovedColumn && (
                  <div className="text-right">
                    <div>จำนวนที่อนุมัติ</div>
                    <div className="text-xs text-gray-500">Approved Amount</div>
                  </div>
                )}
              </div>

              {/* Reward */}
              <div className={`grid ${showApprovedColumn ? 'grid-cols-3' : 'grid-cols-2'} items-center`}>
                <label className="block text-sm font-medium text-gray-700">
                  เงินรางวัลที่ขอ
                  <br />
                  <span className="text-xs font-normal text-gray-600">Requested Reward Amount</span>
                </label>
                <span className="text-right font-semibold">฿{formatCurrency(pubDetail.reward_amount || 0)}</span>
                {showApprovedColumn && (
                  <span className="text-right font-semibold">
                    {pubDetail.reward_approve_amount != null ? `฿${formatCurrency(pubDetail.reward_approve_amount)}` : '-'}
                  </span>
                )}
              </div>

              {/* Revision fee */}
              {(pubDetail.revision_fee > 0 || pubDetail.editing_fee > 0) && (
                <div className={`grid ${showApprovedColumn ? 'grid-cols-3' : 'grid-cols-2'} items-center`}>
                  <label className="block text-sm font-medium text-gray-700">
                    ค่าปรับปรุงบทความ
                    <br />
                    <span className="text-xs font-normal text-gray-600">Manuscript Editing Fee</span>
                  </label>
                  <span className="text-right">
                    ฿{formatCurrency(pubDetail.revision_fee || pubDetail.editing_fee || 0)}
                  </span>
                  {showApprovedColumn && (
                    <span className="text-right">
                      {pubDetail.revision_fee_approve_amount != null
                        ? `฿${formatCurrency(pubDetail.revision_fee_approve_amount)}`
                        : '-'}
                    </span>
                  )}
                </div>
              )}

              {/* Publication fee */}
              {(pubDetail.publication_fee > 0 || pubDetail.page_charge > 0) && (
                <div className={`grid ${showApprovedColumn ? 'grid-cols-3' : 'grid-cols-2'} items-center`}>
                  <label className="block text-sm font-medium text-gray-700">
                    ค่าธรรมเนียมการตีพิมพ์
                    <br />
                    <span className="text-xs font-normal text-gray-600">Page Charge</span>
                  </label>
                  <span className="text-right">฿{formatCurrency(pubDetail.publication_fee || pubDetail.page_charge || 0)}</span>
                  {showApprovedColumn && (
                    <span className="text-right">
                      {pubDetail.publication_fee_approve_amount != null
                        ? `฿${formatCurrency(pubDetail.publication_fee_approve_amount)}`
                        : '-'}
                    </span>
                  )}
                </div>
              )}

              {/* External funding */}
              {pubDetail.external_funding_amount > 0 && (
                <div className={`grid ${showApprovedColumn ? 'grid-cols-3' : 'grid-cols-2'} items-center`}>
                  <label className="block text-sm font-medium text-gray-700">
                    เงินสนับสนุนจากภายนอก
                    <br />
                    <span className="text-xs font-normal text-gray-600">External Funding Sources</span>
                  </label>
                  <span className="text-right text-red-600">-฿{formatCurrency(pubDetail.external_funding_amount)}</span>
                  {showApprovedColumn && <span></span>}
                </div>
              )}

              {/* Total */}
              <div className={`grid ${showApprovedColumn ? 'grid-cols-3' : 'grid-cols-2'} items-center pt-2 border-t`}>
                <label className="block font-medium text-gray-700">
                  รวมเบิกจากวิทยาลัยการคอม
                  <br />
                  <span className="text-xs font-normal text-gray-600">Total Reimbursement from CP-KKU</span>
                </label>
                <span className="text-right font-bold text-blue-600">
                  ฿{formatCurrency(pubDetail.total_amount || pubDetail.reward_amount || 0)}
                </span>
                {showApprovedColumn && (
                  <span className="text-right font-bold text-green-600">
                    ฿{formatCurrency(approvedTotal)}
                  </span>
                )}
              </div>
            </div>
          </Card>

          {/* Admin-only Approval Panel */}
          <ApprovalPanel
            submission={submission}
            pubDetail={pubDetail}
            onPersist={persistAmounts}
            onApprove={approve}
            onReject={reject}
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
          <div className="space-y-4">
            {documents.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {documents.map((doc, index) => {
                  const fileId = doc.file_id || doc.File?.file_id || doc.file?.file_id;
                  const docName =
                    doc.File?.original_name ||
                    doc.file?.original_name ||
                    doc.original_filename ||
                    doc.file_name ||
                    doc.name ||
                    `เอกสารที่ ${index + 1}`;
                  return (
                    <li key={doc.document_id || fileId || index} className="py-3 flex items-center justify-between">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-gray-400 mr-3" />
                        <span className="text-sm text-gray-700">{docName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleView(fileId)}
                          className="inline-flex items-center gap-1 px-3 py-1 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md"
                        >
                          <Eye className="h-4 w-4" />
                          ดู
                        </button>
                        <button
                          onClick={() => handleDownload(fileId, docName)}
                          className="inline-flex items-center gap-1 px-3 py-1 text-sm text-green-600 bg-green-50 hover:bg-green-100 rounded-md"
                        >
                          <Download className="h-4 w-4" />
                          ดาวน์โหลด
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-center text-gray-500 py-8">ไม่มีเอกสารแนบ</p>
            )}
          </div>
        </Card>
      )}
    </PageLayout>
  );
}

/** =========================
 *  Small subcomponent: labeled money input
 *  ========================= */
function LabeledMoney({ label, value, onChange, error }) {
  return (
    <div>
      <label className="block text-sm text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        className={`input input-bordered w-full ${error ? 'border-red-400' : ''}`}
        value={formatCurrency(value)}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => e.target.select()}
      />
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  );
}
