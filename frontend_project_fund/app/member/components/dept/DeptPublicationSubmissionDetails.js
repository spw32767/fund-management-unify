"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle,
  Clock,
  Download,
  Eye,
  FileText,
  Loader2,
  User,
  XCircle,
} from "lucide-react";
import { toast } from "react-hot-toast";

import PageLayout from "@/app/member/components/common/PageLayout";
import Card from "@/app/member/components/common/Card";
import StatusBadge from "@/app/member/components/common/StatusBadge";
import { useStatusMap } from "@/app/hooks/useStatusMap";
import { deptHeadAPI } from "@/app/lib/member_api";
import apiClient from "@/app/lib/api";

const STATUS_ICON_MAP = {
  approved: { icon: CheckCircle, className: "text-emerald-600" },
  rejected: { icon: XCircle, className: "text-red-600" },
  revision: { icon: AlertCircle, className: "text-orange-500" },
  pending: { icon: Clock, className: "text-amber-500" },
  draft: { icon: FileText, className: "text-gray-500" },
  unknown: { icon: Clock, className: "text-gray-400" },
};

function getStatusVisual(statusCode) {
  const normalized = typeof statusCode === "string" ? statusCode.toLowerCase() : "unknown";
  return STATUS_ICON_MAP[normalized] || STATUS_ICON_MAP.unknown;
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatCurrency(amount) {
  if (amount == null || Number.isNaN(Number(amount))) return "-";
  return Number(amount).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getFullName(user) {
  if (!user) return "-";
  const fallback = [user.user_fname, user.user_lname].filter(Boolean).join(" ");
  return (
    user.full_name ||
    user.fullname ||
    fallback ||
    "-"
  ).trim();
}

function extractErrorMessage(error, fallback) {
  if (!error) return fallback;
  if (error?.response?.data?.error) return error.response.data.error;
  if (typeof error?.message === "string") return error.message;
  return fallback;
}

function resolveDocumentName(doc, index) {
  return (
    doc?.original_name ||
    doc?.File?.original_name ||
    doc?.file?.original_name ||
    doc?.file_name ||
    doc?.name ||
    `เอกสารที่ ${index + 1}`
  );
}

const REVIEW_STATUS_LABELS = {
  approved: "เห็นควร",
  rejected: "ไม่เห็นควร",
  revision_required: "ขอข้อมูลเพิ่มเติม",
  depthead_reviewing: "อยู่ระหว่างการพิจารณา (หัวหน้าสาขา)",
  depthead_approved: "เห็นควร (หัวหน้าสาขา)",
  depthead_rejected: "ไม่เห็นควร (หัวหน้าสาขา)",
};

function getReviewStatusLabel(status) {
  if (!status) return "-";
  const key = status.toLowerCase();
  return REVIEW_STATUS_LABELS[key] || status;
}

export default function DeptPublicationSubmissionDetails({ submissionId, onBack, onDecisionComplete }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [detail, setDetail] = useState(null);
  const [applicant, setApplicant] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [statusHistory, setStatusHistory] = useState([]);
  const [comment, setComment] = useState("");
  const [decisionLoading, setDecisionLoading] = useState(null);

  const { getCodeById, getLabelById } = useStatusMap();

  const fetchDetails = useCallback(async () => {
    if (!submissionId) return;
    try {
      setLoading(true);
      setError(null);

      const res = await deptHeadAPI.getSubmission(submissionId);
      const submissionData = res?.submission || res || null;
      setSubmission(submissionData);

      if (res?.details?.type === "publication_reward" && res.details.data) {
        setDetail(res.details.data);
      } else {
        setDetail(null);
      }

      setApplicant(res?.applicant || submissionData?.user || submissionData?.User || null);
      setDocuments(res?.documents || []);
      setReviews(res?.reviews || []);
      setStatusHistory(res?.status_history || []);
    } catch (err) {
      console.error("Failed to load submission details:", err);
      setError(extractErrorMessage(err, "ไม่พบข้อมูลคำร้อง"));
    } finally {
      setLoading(false);
    }
  }, [submissionId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const statusCode = useMemo(() => {
    if (!submission) return "pending";
    return (
      getCodeById?.(submission.status_id) ||
      submission?.status?.status_code ||
      submission?.Status?.StatusCode ||
      "pending"
    );
  }, [submission, getCodeById]);

  const statusVisual = getStatusVisual(statusCode);

  const handleViewDocument = useCallback(async (fileId) => {
    if (!fileId) return;
    try {
      const token = apiClient.getToken();
      const url = `${apiClient.baseURL}/files/managed/${fileId}/download`;
      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error("File not found");
      const blob = await response.blob();
      const fileURL = window.URL.createObjectURL(blob);
      window.open(fileURL, "_blank");
      window.URL.revokeObjectURL(fileURL);
    } catch (err) {
      console.error("Failed to open file", err);
      toast.error("ไม่สามารถเปิดเอกสารได้");
    }
  }, []);

  const handleDownloadDocument = useCallback(async (fileId, fileName = "document") => {
    if (!fileId) return;
    try {
      await apiClient.downloadFile(`/files/managed/${fileId}/download`, fileName);
    } catch (err) {
      console.error("Failed to download file", err);
      toast.error("ดาวน์โหลดเอกสารล้มเหลว");
    }
  }, []);

  const handleDecision = useCallback(
    async (decision) => {
      if (!submission?.submission_id) return;
      const action = decision === "approve" ? "approve" : "reject";
      const payload = {};
      const trimmed = comment.trim();
      if (trimmed) payload.comment = trimmed;

      try {
        setDecisionLoading(action);
        if (action === "approve") {
          await deptHeadAPI.approveSubmission(submission.submission_id, payload);
          toast.success("บันทึกการเห็นควรเรียบร้อยแล้ว");
        } else {
          await deptHeadAPI.rejectSubmission(submission.submission_id, payload);
          toast.success("บันทึกการไม่เห็นควรเรียบร้อยแล้ว");
        }
        setComment("");
        if (typeof onDecisionComplete === "function") {
          onDecisionComplete(action);
        }
      } catch (err) {
        console.error("Dept head decision failed:", err);
        toast.error(extractErrorMessage(err, "ไม่สามารถบันทึกผลการพิจารณาได้"));
      } finally {
        setDecisionLoading(null);
      }
    },
    [comment, onDecisionComplete, submission]
  );

  if (loading) {
    return (
      <PageLayout title="รายละเอียดคำร้อง">
        <div className="flex min-h-[240px] items-center justify-center text-gray-500">
          <Loader2 className="mr-2 animate-spin" />
          กำลังโหลดข้อมูลคำร้อง...
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout title="รายละเอียดคำร้อง">
        <div className="mx-auto max-w-xl rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-700">
          <p className="mb-4 font-medium">{error}</p>
          <button
            onClick={() => (typeof onBack === "function" ? onBack() : null)}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft size={16} />
            กลับไปหน้ารายการ
          </button>
        </div>
      </PageLayout>
    );
  }

  if (!submission) {
    return null;
  }

  const statusLabel = getReviewStatusLabel(statusCode);
  const categoryName =
    submission?.category?.category_name ||
    submission?.Category?.CategoryName ||
    submission?.category_name ||
    "-";
  const subcategoryName =
    submission?.subcategory?.subcategory_name ||
    submission?.Subcategory?.SubcategoryName ||
    submission?.subcategory_name ||
    "-";

  return (
    <PageLayout
      title={`เงินรางวัลตีพิมพ์ #${submission.submission_number || "-"}`}
      subtitle="รายละเอียดคำร้องขอเงินรางวัลการตีพิมพ์ผลงานวิชาการ"
      icon={Award}
      actions={
        <button
          onClick={() => (typeof onBack === "function" ? onBack() : null)}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft size={16} />
          กลับหน้ารายการ
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-6">
        <Card title="สถานะคำร้อง" icon={statusVisual.icon} headerClassName="items-center">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 text-sm">
              {statusVisual.icon && (
                <statusVisual.icon size={18} className={`${statusVisual.className} hidden sm:block`} />
              )}
              <StatusBadge
                statusId={submission.status_id}
                fallbackLabel={submission?.status?.status_name || submission?.Status?.StatusName || statusLabel}
              />
              <span className="font-medium text-gray-700">{statusLabel}</span>
            </div>
            <div className="grid grid-cols-1 gap-3 text-sm text-gray-700 md:grid-cols-2 lg:grid-cols-3">
              <div className="flex items-center gap-2">
                <BookOpen size={16} className="text-gray-500" />
                <span className="font-medium">ประเภททุน:</span>
                <span>{categoryName}</span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen size={16} className="text-gray-500" />
                <span className="font-medium">ทุนย่อย:</span>
                <span>{subcategoryName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-gray-500" />
                <span className="font-medium">วันที่ยื่น:</span>
                <span>{formatDate(submission.submitted_at || submission.SubmittedAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-gray-500" />
                <span className="font-medium">วันที่อัปเดตล่าสุด:</span>
                <span>{formatDateTime(submission.updated_at || submission.UpdatedAt)}</span>
              </div>
            </div>
          </div>
        </Card>

        <Card title="ข้อมูลผู้ยื่น" icon={User}>
          <div className="grid grid-cols-1 gap-3 text-sm text-gray-700 md:grid-cols-2">
            <div>
              <span className="block text-gray-500">ชื่อผู้ยื่น</span>
              <span className="font-medium">{getFullName(applicant)}</span>
            </div>
            {applicant?.email && (
              <div>
                <span className="block text-gray-500">อีเมล</span>
                <span className="font-medium">{applicant.email}</span>
              </div>
            )}
          </div>
        </Card>

        {detail && (
          <Card title="รายละเอียดผลงาน" icon={BookOpen}>
            <div className="grid grid-cols-1 gap-4 text-sm text-gray-700 md:grid-cols-2">
              <div>
                <span className="block text-gray-500">ชื่อบทความ</span>
                <span className="font-medium text-gray-800">{detail.paper_title || "-"}</span>
              </div>
              <div>
                <span className="block text-gray-500">ชื่อวารสาร/แหล่งตีพิมพ์</span>
                <span className="font-medium text-gray-800">{detail.journal_name || "-"}</span>
              </div>
              <div>
                <span className="block text-gray-500">วันที่ตีพิมพ์</span>
                <span className="font-medium text-gray-800">{formatDate(detail.publication_date)}</span>
              </div>
              <div>
                <span className="block text-gray-500">Quartile</span>
                <span className="font-medium text-gray-800">{detail.quartile || "-"}</span>
              </div>
              <div>
                <span className="block text-gray-500">ประเภทผู้เขียน</span>
                <span className="font-medium text-gray-800">{detail.author_type || "-"}</span>
              </div>
              <div>
                <span className="block text-gray-500">จำนวนเงินที่ขอ</span>
                <span className="font-medium text-gray-800">฿{formatCurrency(detail.reward_amount)}</span>
              </div>
            </div>
          </Card>
        )}

        <Card title="เอกสารแนบ" icon={FileText}>
          {documents.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">ไม่มีเอกสารแนบ</p>
          ) : (
            <div className="space-y-3">
              {documents.map((doc, index) => {
                const fileId = doc.file_id || doc.File?.file_id || doc.file?.file_id;
                const fileName = resolveDocumentName(doc, index);
                const docType = doc.document_type_name || doc.DocumentType?.document_type_name || "ไม่ระบุ";
                return (
                  <div
                    key={doc.document_id || fileId || index}
                    className="flex flex-col gap-2 rounded-lg border border-gray-200 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-medium text-gray-800">{fileName}</p>
                      <p className="text-sm text-gray-500">{docType}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleViewDocument(fileId)}
                        disabled={!fileId}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Eye size={14} /> ดู
                      </button>
                      <button
                        onClick={() => handleDownloadDocument(fileId, fileName)}
                        disabled={!fileId}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Download size={14} /> ดาวน์โหลด
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card title="ประวัติการพิจารณา" icon={Clock}>
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-700">ผลการพิจารณา</h3>
              {reviews.length === 0 ? (
                <p className="text-sm text-gray-500">ยังไม่มีประวัติการพิจารณา</p>
              ) : (
                <div className="space-y-3">
                  {reviews.map((review) => (
                    <div key={review.review_id} className="rounded-md border border-gray-200 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-gray-800">{getReviewStatusLabel(review.review_status)}</span>
                        <span className="text-sm text-gray-500">{formatDateTime(review.reviewed_at)}</span>
                      </div>
                      <p className="text-sm text-gray-600">โดย {getFullName(review.reviewer || review.Reviewer)}</p>
                      {review.comments && (
                        <p className="mt-2 rounded bg-gray-50 p-2 text-sm text-gray-700">{review.comments}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-700">ประวัติการเปลี่ยนสถานะ</h3>
              {statusHistory.length === 0 ? (
                <p className="text-sm text-gray-500">ยังไม่มีประวัติการเปลี่ยนสถานะ</p>
              ) : (
                <div className="space-y-3">
                  {statusHistory.map((history) => {
                    const oldLabel =
                      getLabelById?.(history.old_status_id) || history.old_status_id || "-";
                    const newLabel =
                      getLabelById?.(history.new_status_id) || history.new_status_id || "-";
                    return (
                      <div key={history.history_id} className="rounded-md border border-gray-200 p-3 text-sm text-gray-700">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span>
                            {oldLabel !== "-" ? `จาก ${oldLabel} → ${newLabel}` : `เปลี่ยนเป็น ${newLabel}`}
                          </span>
                          <span className="text-sm text-gray-500">{formatDateTime(history.created_at)}</span>
                        </div>
                        <p className="text-gray-600">โดย {getFullName(history.changed_by_user || history.ChangedByUser)}</p>
                        {history.reason && (
                          <p className="mt-2 rounded bg-gray-50 p-2 text-sm text-gray-700">{history.reason}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card title="บันทึกผลการพิจารณา" icon={CheckCircle}>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">ความคิดเห็น (ถ้ามี)</label>
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                rows={4}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="ระบุความคิดเห็นหรือเหตุผลเพิ่มเติม"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleDecision("approve")}
                disabled={decisionLoading === "approve" || decisionLoading === "reject"}
                className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {decisionLoading === "approve" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle size={16} />
                )}
                อนุมัติ (เห็นควร)
              </button>
              <button
                onClick={() => handleDecision("reject")}
                disabled={decisionLoading === "approve" || decisionLoading === "reject"}
                className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {decisionLoading === "reject" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <XCircle size={16} />
                )}
                ไม่เห็นควร
              </button>
            </div>
          </div>
        </Card>
      </div>
    </PageLayout>
  );
}

