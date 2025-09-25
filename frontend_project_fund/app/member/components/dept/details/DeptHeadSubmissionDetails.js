"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Bookmark,
  Download,
  Eye,
  FileText,
  Loader2,
  Send,
  Users,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import PageLayout from "../../common/PageLayout";
import Card from "../../common/Card";
import StatusBadge from "../../common/StatusBadge";
import { deptHeadSubmissionAPI } from "@/app/lib/dept_head_submission_api";
import apiClient from "@/app/lib/api";
import { formatCurrency } from "@/app/utils/format";
import { toast } from "react-hot-toast";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { PDFDocument } from "pdf-lib";

const formatDateTime = (value) => {
  if (!value) return "-";
  try {
    const date = new Date(value);
    return date.toLocaleString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    return value;
  }
};

const formatDate = (value) => {
  if (!value) return "-";
  try {
    const date = new Date(value);
    return date.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch (error) {
    return value;
  }
};

const getApplicant = (submission) => {
  if (!submission) return null;
  const candidate =
    submission.applicant ||
    submission.applicant_user ||
    submission.user ||
    submission.User;
  if (candidate) return candidate;

  const submissionUsers = submission.submission_users || [];
  const applicantUser = submissionUsers.find(
    (user) => user.is_applicant || user.IsApplicant || user.role === "owner"
  );
  return applicantUser?.user || applicantUser?.User || null;
};

const getUserFullName = (user) => {
  if (!user) return "-";
  const firstName =
    user.user_fname || user.first_name || user.full_name?.split(" ")[0] || "";
  const lastName =
    user.user_lname ||
    user.last_name ||
    user.full_name?.split(" ").slice(1).join(" ") ||
    "";
  const full = `${firstName} ${lastName}`.trim();
  return full || user.full_name || user.email || "-";
};

const normalizeDetail = (submission, payload) => {
  if (!submission) return { type: "unknown", data: null };

  if (payload?.details?.type && payload?.details?.data) {
    return payload.details;
  }

  if (submission.fund_application_detail || submission.FundApplicationDetail) {
    return {
      type: "fund_application",
      data: submission.fund_application_detail || submission.FundApplicationDetail,
    };
  }

  if (
    submission.publication_reward_detail ||
    submission.PublicationRewardDetail
  ) {
    return {
      type: "publication_reward",
      data:
        submission.publication_reward_detail ||
        submission.PublicationRewardDetail,
    };
  }

  if (submission.submission_type === "publication_reward") {
    return { type: "publication_reward", data: null };
  }

  return {
    type: submission.submission_type || payload?.details?.type || "fund_application",
    data: payload?.details?.data || null,
  };
};

const mapDocumentTypeNames = (documents = [], types = []) => {
  if (!Array.isArray(documents) || documents.length === 0) return [];

  const typeMap = new Map();
  types.forEach((type) => {
    const id = type?.document_type_id ?? type?.id;
    if (id != null) {
      typeMap.set(String(id), type?.document_type_name || type?.name || type?.label);
    }
  });

  return documents.map((doc, index) => {
    const fileId =
      doc.file_id ?? doc.File?.file_id ?? doc.file?.file_id ?? doc.id ?? null;
    const typeId =
      doc.document_type_id ??
      doc.DocumentTypeID ??
      doc.doc_type_id ??
      doc.document_type?.document_type_id ??
      null;
    const typeName =
      doc.document_type_name ||
      doc.DocumentType?.document_type_name ||
      doc.document_type?.document_type_name ||
      (typeId != null ? typeMap.get(String(typeId)) : null);

    const originalName =
      doc.original_name ||
      doc.original_filename ||
      doc.file_name ||
      doc.File?.original_name ||
      doc.file?.original_name ||
      `เอกสารที่ ${index + 1}`;

    return {
      ...doc,
      file_id: fileId,
      document_type_id: typeId,
      document_type_name: typeName || "ไม่ระบุประเภท",
      original_name: originalName,
    };
  });
};

function FundApplicationSection({ submission, detail }) {
  if (!detail) {
    return (
      <Card title="รายละเอียดคำร้อง" icon={FileText} collapsible={false}>
        <p className="text-gray-500 text-sm">ไม่พบรายละเอียดคำร้อง</p>
      </Card>
    );
  }

  const requestedAmount = detail.requested_amount ?? detail.requestAmount;
  const approvedAmount = detail.approved_amount ?? detail.approvedAmount;
  const comment = detail.comment ?? detail.Comment;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card title="ข้อมูลโครงการ" icon={Bookmark} collapsible={false}>
        <div className="space-y-4 text-sm text-gray-700">
          <div>
            <p className="text-gray-500">ชื่อโครงการ</p>
            <p className="font-semibold text-gray-900">
              {detail.project_title || detail.ProjectTitle || "-"}
            </p>
          </div>
          <div>
            <p className="text-gray-500">วัตถุประสงค์ / รายละเอียด</p>
            <p className="whitespace-pre-wrap">
              {detail.project_description || detail.ProjectDescription || "-"}
            </p>
          </div>
        </div>
      </Card>

      <Card title="งบประมาณ" icon={FileText} collapsible={false}>
        <div className="space-y-4 text-sm text-gray-700">
          <div className="flex justify-between">
            <span className="text-gray-500">จำนวนเงินที่ขอ</span>
            <span className="font-semibold text-blue-600">
              ฿{formatCurrency(requestedAmount || 0)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">จำนวนเงินที่อนุมัติ</span>
            <span className="font-semibold text-green-600">
              {approvedAmount != null
                ? `฿${formatCurrency(approvedAmount || 0)}`
                : "-"}
            </span>
          </div>
          {comment ? (
            <div>
              <p className="text-gray-500 mb-1">หมายเหตุ</p>
              <p className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-gray-700 whitespace-pre-wrap">
                {comment}
              </p>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

function PublicationRewardSection({ detail }) {
  if (!detail) {
    return (
      <Card title="รายละเอียดบทความ" icon={FileText} collapsible={false}>
        <p className="text-gray-500 text-sm">ไม่พบรายละเอียดบทความ</p>
      </Card>
    );
  }

  const rewardAmount = detail.reward_amount ?? detail.RewardAmount;
  const approveReward = detail.reward_approve_amount ?? detail.RewardApproveAmount;
  const revisionFee = detail.revision_fee ?? detail.RevisionFee;
  const approveRevision =
    detail.revision_fee_approve_amount ?? detail.RevisionFeeApproveAmount;
  const publicationFee = detail.publication_fee ?? detail.PublicationFee;
  const approvePublication =
    detail.publication_fee_approve_amount ?? detail.PublicationFeeApproveAmount;
  const totalApprove = detail.total_approve_amount ?? detail.TotalApproveAmount;
  const totalAmount = detail.total_amount ?? detail.TotalAmount;
  const rejectionReason = detail.rejection_reason ?? detail.RejectionReason;
  const approvalComment = detail.approval_comment ?? detail.ApprovalComment;

  return (
    <div className="space-y-6">
      <Card title="ข้อมูลบทความ" icon={Bookmark} collapsible={false}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-sm text-gray-700">
          <div>
            <p className="text-gray-500">ชื่อบทความ</p>
            <p className="font-semibold text-gray-900">
              {detail.paper_title || detail.PaperTitle || "-"}
            </p>
          </div>
          <div>
            <p className="text-gray-500">วารสาร / แหล่งตีพิมพ์</p>
            <p className="font-semibold text-gray-900">
              {detail.journal_name || detail.JournalName || "-"}
            </p>
          </div>
          <div>
            <p className="text-gray-500">วันที่ตีพิมพ์</p>
            <p>{formatDate(detail.publication_date || detail.PublicationDate)}</p>
          </div>
          <div>
            <p className="text-gray-500">ประเภทบทความ</p>
            <p>{detail.publication_type || detail.PublicationType || "-"}</p>
          </div>
          <div>
            <p className="text-gray-500">Quartile</p>
            <p>{detail.quartile || detail.Quartile || "-"}</p>
          </div>
          <div>
            <p className="text-gray-500">DOI / ลิงก์</p>
            <p>{detail.doi || detail.DOI || detail.url || detail.URL || "-"}</p>
          </div>
        </div>
      </Card>

      <Card title="รายละเอียดเงินรางวัล" icon={FileText} collapsible={false}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
          <div className="flex justify-between">
            <span className="text-gray-500">เงินรางวัล (ฐาน)</span>
            <span className="font-semibold">฿{formatCurrency(rewardAmount || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">เงินรางวัล (เสนออนุมัติ)</span>
            <span className="font-semibold text-blue-600">
              {approveReward != null
                ? `฿${formatCurrency(approveReward || 0)}`
                : "-"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">ค่าปรับปรุง</span>
            <span className="font-semibold">฿{formatCurrency(revisionFee || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">ค่าปรับปรุง (เสนออนุมัติ)</span>
            <span className="font-semibold text-blue-600">
              {approveRevision != null
                ? `฿${formatCurrency(approveRevision || 0)}`
                : "-"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">ค่าตีพิมพ์</span>
            <span className="font-semibold">฿{formatCurrency(publicationFee || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">ค่าตีพิมพ์ (เสนออนุมัติ)</span>
            <span className="font-semibold text-blue-600">
              {approvePublication != null
                ? `฿${formatCurrency(approvePublication || 0)}`
                : "-"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">ยอดรวม</span>
            <span className="font-semibold">฿{formatCurrency(totalAmount || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">ยอดรวมที่เสนออนุมัติ</span>
            <span className="font-semibold text-blue-600">
              {totalApprove != null
                ? `฿${formatCurrency(totalApprove || 0)}`
                : "-"}
            </span>
          </div>
        </div>
        {approvalComment ? (
          <div className="mt-4">
            <p className="text-gray-500 mb-1">หมายเหตุ</p>
            <p className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-gray-700 whitespace-pre-wrap">
              {approvalComment}
            </p>
          </div>
        ) : null}
        {rejectionReason ? (
          <div className="mt-4">
            <p className="text-gray-500 mb-1">เหตุผลการไม่อนุมัติ</p>
            <p className="bg-red-50 border border-red-100 rounded-lg p-3 text-red-700 whitespace-pre-wrap">
              {rejectionReason}
            </p>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

function SubmissionTeamCard({ submissionUsers = [] }) {
  if (!submissionUsers.length) {
    return null;
  }

  return (
    <Card title="ผู้เกี่ยวข้อง" icon={Users} collapsible={false}>
      <div className="divide-y divide-gray-200">
        {submissionUsers.map((item) => {
          const user = item.user || item.User || item;
          const roleLabel = item.role || item.Role || "สมาชิก";
          return (
            <div
              key={`${item.user_id || user?.user_id || user?.id}-${roleLabel}`}
              className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
            >
              <div>
                <p className="font-semibold text-gray-900">
                  {getUserFullName(user)}
                </p>
                <p className="text-sm text-gray-500">{user?.email || ""}</p>
              </div>
              <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                {roleLabel}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function AttachmentsCard({
  submission,
  attachments,
  onView,
  onDownload,
  onViewMerged,
  onDownloadMerged,
  loading,
  merging,
  creatingMerged,
}) {
  return (
    <Card title="เอกสารแนบ" icon={FileText} collapsible={false}>
      <div className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-gray-500">
            <Loader2 className="animate-spin mr-2" /> กำลังโหลดเอกสาร...
          </div>
        ) : attachments.length ? (
          <div className="space-y-4">
            {attachments.map((doc, index) => (
              <div
                key={doc.document_id || doc.file_id || index}
                className="bg-gray-50 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900" title={doc.original_name}>
                      {doc.original_name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {doc.document_type_name || "ไม่ระบุประเภท"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onView(doc.file_id)}
                    className="inline-flex items-center gap-1 px-3 py-2 text-sm text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 disabled:opacity-50"
                    disabled={!doc.file_id}
                  >
                    <Eye size={16} /> ดู
                  </button>
                  <button
                    onClick={() => onDownload(doc.file_id, doc.original_name)}
                    className="inline-flex items-center gap-1 px-3 py-2 text-sm text-green-600 border border-green-200 rounded-md hover:bg-green-50 disabled:opacity-50"
                    disabled={!doc.file_id}
                  >
                    <Download size={16} /> ดาวน์โหลด
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-gray-500">
            ไม่พบเอกสารที่แนบไว้
          </div>
        )}

        {attachments.length ? (
          <div className="flex flex-wrap gap-2 justify-end border-t border-gray-100 pt-4">
            <button
              onClick={onViewMerged}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 disabled:opacity-50"
              disabled={merging || creatingMerged || !attachments.length}
            >
              <Eye size={16} /> ดูไฟล์รวม
            </button>
            <button
              onClick={onDownloadMerged}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm text-green-600 border border-green-200 rounded-md hover:bg-green-50 disabled:opacity-50"
              disabled={merging || creatingMerged || !attachments.length}
            >
              <Download size={16} /> ดาวน์โหลดไฟล์รวม
            </button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function ActionPanel({ onRecommend, onReject, disabled }) {
  return (
    <Card title="การดำเนินการ" icon={Send} collapsible={false}>
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-end">
        <button
          onClick={onRecommend}
          disabled={disabled}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
        >
          <Send size={16} /> เห็นควรพิจารณา
        </button>
        <button
          onClick={onReject}
          disabled={disabled}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
        >
          <XCircle size={16} /> ไม่เห็นควรพิจารณา
        </button>
      </div>
    </Card>
  );
}

export default function DeptHeadSubmissionDetails({ submissionId, onBack }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState(null);
  const [detailInfo, setDetailInfo] = useState({ type: "fund_application", data: null });
  const [submissionUsers, setSubmissionUsers] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [creatingMerged, setCreatingMerged] = useState(false);
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState(null);
  const mergedUrlRef = useRef(null);

  const cleanupMerged = () => {
    if (mergedUrlRef.current) {
      URL.revokeObjectURL(mergedUrlRef.current);
      mergedUrlRef.current = null;
    }
  };

  useEffect(() => {
    return () => cleanupMerged();
  }, []);

  const loadDetails = async () => {
    if (!submissionId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await deptHeadSubmissionAPI.getSubmissionDetails(submissionId);
      const baseSubmission = response?.submission || response;
      const detail = normalizeDetail(baseSubmission, response);
      const users = response?.submission_users || baseSubmission?.submission_users || [];
      setSubmission(baseSubmission);
      setDetailInfo(detail);
      setSubmissionUsers(users);

      setAttachmentsLoading(true);
      try {
        const [documentRes, typeRes] = await Promise.all([
          deptHeadSubmissionAPI.getSubmissionDocuments(baseSubmission.submission_id || submissionId),
          deptHeadSubmissionAPI.getDocumentTypes(),
        ]);
        const documents =
          documentRes?.documents || documentRes?.data || documentRes || baseSubmission?.documents || [];
        const types = typeRes?.document_types || typeRes?.data || typeRes || [];
        setAttachments(mapDocumentTypeNames(documents, types));
      } catch (docError) {
        console.error("Failed to load documents", docError);
        setAttachments([]);
      } finally {
        setAttachmentsLoading(false);
      }
    } catch (fetchError) {
      console.error("Failed to load submission details", fetchError);
      setError(fetchError?.message || "ไม่สามารถโหลดข้อมูลคำร้องได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId]);

  const handleViewDocument = async (fileId) => {
    if (!fileId) return;
    try {
      const token = apiClient.getToken();
      const url = `${apiClient.baseURL}/files/managed/${fileId}/download`;
      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error("File not found");
      const blob = await response.blob();
      const fileUrl = window.URL.createObjectURL(blob);
      window.open(fileUrl, "_blank");
      window.URL.revokeObjectURL(fileUrl);
    } catch (docError) {
      console.error("Failed to open document", docError);
      toast.error("ไม่สามารถเปิดไฟล์ได้");
    }
  };

  const handleDownloadDocument = async (fileId, fileName = "document") => {
    if (!fileId) return;
    try {
      await apiClient.downloadFile(`/files/managed/${fileId}/download`, fileName);
    } catch (docError) {
      console.error("Failed to download document", docError);
      toast.error("ไม่สามารถดาวน์โหลดไฟล์ได้");
    }
  };

  const fetchFileAsBlob = async (fileId) => {
    const token = apiClient.getToken();
    const url = `${apiClient.baseURL}/files/managed/${fileId}/download`;
    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error("File not found");
    return await response.blob();
  };

  const mergeAttachmentsToPdf = async (docs) => {
    setMerging(true);
    try {
      const merged = await PDFDocument.create();
      for (const doc of docs) {
        try {
          const blob = await fetchFileAsBlob(doc.file_id);
          const pdf = await PDFDocument.load(await blob.arrayBuffer(), {
            ignoreEncryption: true,
          });
          const pages = await merged.copyPages(pdf, pdf.getPageIndices());
          pages.forEach((page) => merged.addPage(page));
        } catch (docError) {
          console.warn("Skip non-pdf", docError);
        }
      }
      if (merged.getPageCount() === 0) {
        throw new Error("ไม่มีไฟล์ PDF สำหรับรวม");
      }
      const bytes = await merged.save();
      return new Blob([bytes], { type: "application/pdf" });
    } finally {
      setMerging(false);
    }
  };

  const ensureMergedUrl = async () => {
    if (mergedUrlRef.current) {
      return mergedUrlRef.current;
    }
    setCreatingMerged(true);
    try {
      const pdfLike = attachments.filter((doc) =>
        String(doc.original_name || "").toLowerCase().endsWith(".pdf")
      );
      const candidate = pdfLike.length ? pdfLike : attachments;
      if (!candidate.length) {
        toast.error("ไม่มีไฟล์สำหรับรวม");
        return null;
      }
      const blob = await mergeAttachmentsToPdf(candidate);
      const url = URL.createObjectURL(blob);
      mergedUrlRef.current = url;
      return url;
    } catch (mergeError) {
      console.error("Failed to merge documents", mergeError);
      toast.error(mergeError?.message || "ไม่สามารถรวมไฟล์ได้");
      return null;
    } finally {
      setCreatingMerged(false);
    }
  };

  const handleViewMerged = async () => {
    const url = await ensureMergedUrl();
    if (url) {
      window.open(url, "_blank");
    }
  };

  const handleDownloadMerged = async () => {
    const url = await ensureMergedUrl();
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = `submission_${submission?.submission_number || submissionId}_attachments.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const navigateBackToList = () => {
    if (onBack) {
      onBack();
    } else {
      router.push("/member/dept-review");
    }
    router.refresh();
  };

  const handleRecommend = async () => {
    if (!submission) return;
    const { value: comment } = await Swal.fire({
      title: "ความคิดเห็นเพิ่มเติม (ถ้ามี)",
      input: "textarea",
      inputPlaceholder: "ระบุเหตุผลหรือความคิดเห็นเพิ่มเติม",
      showCancelButton: true,
      confirmButtonText: "ยืนยันเห็นควร",
      cancelButtonText: "ยกเลิก",
      inputValidator: () => null,
    });

    if (comment === undefined) {
      return;
    }

    try {
      await deptHeadSubmissionAPI.recommendSubmission(submission.submission_id, {
        comment: comment?.trim() ? comment.trim() : undefined,
      });
      toast.success("ส่งต่อคำร้องไปยังผู้ดูแลระบบแล้ว");
      navigateBackToList();
    } catch (actionError) {
      console.error("Failed to recommend submission", actionError);
      toast.error(actionError?.message || "ไม่สามารถบันทึกผลการพิจารณาได้");
    }
  };

  const handleReject = async () => {
    if (!submission) return;
    const { value: reason } = await Swal.fire({
      title: "ระบุเหตุผลการไม่เห็นควร",
      input: "textarea",
      inputPlaceholder: "กรอกเหตุผลการไม่เห็นควรพิจารณา",
      showCancelButton: true,
      confirmButtonText: "ยืนยันไม่เห็นควร",
      cancelButtonText: "ยกเลิก",
      inputValidator: (value) => {
        if (!value || !value.trim()) {
          return "กรุณาระบุเหตุผล";
        }
        return null;
      },
    });

    if (reason === undefined) {
      return;
    }

    try {
      await deptHeadSubmissionAPI.rejectSubmission(submission.submission_id, {
        rejection_reason: reason.trim(),
        comment: reason.trim(),
      });
      toast.success("บันทึกผลการไม่เห็นควรแล้ว");
      navigateBackToList();
    } catch (actionError) {
      console.error("Failed to reject submission", actionError);
      toast.error(actionError?.message || "ไม่สามารถบันทึกผลการพิจารณาได้");
    }
  };

  if (loading) {
    return (
      <PageLayout
        title="รายละเอียดคำร้อง"
        subtitle="กำลังโหลดข้อมูลคำร้อง"
        icon={FileText}
      >
        <div className="flex flex-col items-center justify-center py-24 text-gray-500">
          <Loader2 className="animate-spin mb-4" size={32} />
          กำลังโหลดข้อมูล...
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout
        title="รายละเอียดคำร้อง"
        subtitle="ไม่สามารถโหลดข้อมูลได้"
        icon={FileText}
        actions={
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft size={16} /> กลับ
          </button>
        }
      >
        <div className="text-center text-red-600 py-16">{error}</div>
      </PageLayout>
    );
  }

  if (!submission) {
    return null;
  }

  const applicant = getApplicant(submission);
  const comment = submission.comment || submission.Comment || "";
  const statusLabel = submission.status?.status_name || submission.status_name;
  const statusId = submission.status_id;
  const submittedAt =
    submission.submitted_at || submission.SubmittedAt || submission.created_at;

  const metaItems = [
    {
      label: "ปีงบประมาณ",
      value:
        submission.year?.year ||
        submission.year_th ||
        submission.year?.Year ||
        submission.year,
    },
    {
      label: "หมวดทุน",
      value:
        submission.category?.category_name ||
        submission.category_name ||
        submission.Category?.category_name,
    },
    {
      label: "ทุนย่อย",
      value:
        submission.subcategory?.subcategory_name ||
        submission.subcategory_name ||
        submission.Subcategory?.subcategory_name,
    },
  ].filter((item) => item.value);

  const detailContent =
    detailInfo.type === "publication_reward" ? (
      <PublicationRewardSection detail={detailInfo.data} />
    ) : (
      <FundApplicationSection submission={submission} detail={detailInfo.data} />
    );

  return (
    <PageLayout
      title={`รายละเอียดคำร้อง ${submission.submission_number || ""}`.trim()}
      subtitle="ตรวจสอบรายละเอียดและดำเนินการในฐานะหัวหน้าสาขา"
      icon={FileText}
      actions={
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft size={16} /> กลับ
        </button>
      }
    >
      <Card collapsible={false}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge statusId={statusId} fallbackLabel={statusLabel} />
              <span className="text-sm text-gray-500">
                ยื่นเมื่อ {formatDateTime(submittedAt)}
              </span>
            </div>
            <div>
              <p className="text-gray-500 text-sm">ผู้ยื่นคำร้อง</p>
              <p className="text-lg font-semibold text-gray-900">
                {getUserFullName(applicant)}
              </p>
              {applicant?.email ? (
                <p className="text-sm text-gray-500">{applicant.email}</p>
              ) : null}
            </div>
            {comment ? (
              <div>
                <p className="text-gray-500 text-sm mb-1">หมายเหตุจากคำร้อง</p>
                <p className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-gray-700 whitespace-pre-wrap">
                  {comment}
                </p>
              </div>
            ) : null}
          </div>
          <div className="space-y-3">
            {metaItems.map((item) => (
              <div key={item.label} className="bg-gray-50 rounded-lg px-4 py-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  {item.label}
                </p>
                <p className="text-sm font-semibold text-gray-900">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="mt-6 space-y-6">
        {detailContent}
        <SubmissionTeamCard submissionUsers={submissionUsers} />
        <AttachmentsCard
          submission={submission}
          attachments={attachments}
          onView={handleViewDocument}
          onDownload={handleDownloadDocument}
          onViewMerged={handleViewMerged}
          onDownloadMerged={handleDownloadMerged}
          loading={attachmentsLoading}
          merging={merging}
          creatingMerged={creatingMerged}
        />
        <ActionPanel
          onRecommend={handleRecommend}
          onReject={handleReject}
          disabled={creatingMerged || merging}
        />
      </div>
    </PageLayout>
  );
}
