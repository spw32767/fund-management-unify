"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  ArrowLeft,
  FileText,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Eye,
  Download,
} from "lucide-react";
import { submissionAPI, submissionUsersAPI } from "@/app/lib/member_api";
import apiClient, { announcementAPI } from "@/app/lib/api";
import { PDFDocument } from "pdf-lib";
import PageLayout from "../common/PageLayout";
import Card from "../common/Card";
import StatusBadge from "../common/StatusBadge";
import { formatCurrency } from "@/app/utils/format";
import { useStatusMap } from "@/app/hooks/useStatusMap";
import { toast } from "react-hot-toast";

const statusIconOf = (statusCode) => {
  switch (statusCode) {
    case "approved":
      return CheckCircle;
    case "rejected":
      return XCircle;
    case "revision":
      return AlertCircle;
    case "draft":
      return FileText;
    case "pending":
    default:
      return Clock;
  }
};

const statusIconColor = (statusCode) => {
  switch (statusCode) {
    case "approved":
      return "text-green-600";
    case "rejected":
      return "text-red-600";
    case "revision":
      return "text-orange-600";
    case "draft":
      return "text-gray-500";
    case "pending":
    default:
      return "text-yellow-600";
  }
};

const getColoredStatusIcon = (statusCode) => {
  const Icon = statusIconOf(statusCode);
  const color = statusIconColor(statusCode);
  return function ColoredStatusIcon(props) {
    return <Icon {...props} className={`${props.className || ""} ${color}`} />;
  };
};

export default function FundApplicationDetail({ submissionId, onNavigate }) {
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mainAnnouncementDetail, setMainAnnouncementDetail] = useState(null);
  const [activityAnnouncementDetail, setActivityAnnouncementDetail] = useState(
    null
  );
  const [merging, setMerging] = useState(false);
  const mergedUrlRef = useRef(null);
  const [creatingMerged, setCreatingMerged] = useState(false);
  const { getCodeById } = useStatusMap();

  useEffect(() => {
    if (submissionId) {
      loadSubmissionDetail();
    }
  }, [submissionId]);

  const loadSubmissionDetail = async () => {
    setLoading(true);
    try {
      const response = await submissionAPI.getSubmission(submissionId);
      const submissionData = response.submission || response;

      // Include applicant and related users from API response
      if (response.applicant_user) {
        submissionData.applicant_user = response.applicant_user;
        if (!submissionData.user) {
          submissionData.user = response.applicant_user;
        }
      }

      if (response.submission_users) {
        submissionData.submission_users = response.submission_users;
      } else if (!submissionData.user && submissionData.user_id) {
        // Fallback: fetch users if not provided
        try {
          const usersResponse = await submissionUsersAPI.getUsers(submissionId);
          if (usersResponse && usersResponse.users) {
            submissionData.submission_users = usersResponse.users;
          }
        } catch (err) {
          console.log("Could not load submission users", err);
        }
      }

      setSubmission(submissionData);
    } catch (error) {
      console.error("Error loading submission detail:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (onNavigate) {
      onNavigate("applications");
    }
  };

  const handleView = async (fileId) => {
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
    } catch (error) {
      console.error("Error viewing document:", error);
    }
  };

  const handleDownload = async (fileId, fileName = "document") => {
    try {
      await apiClient.downloadFile(`/files/managed/${fileId}/download`, fileName);
    } catch (error) {
      console.error("Error downloading document:", error);
    }
  };

  const fetchFileAsBlob = async (fileId) => {
    const token = apiClient.getToken();
    const url = `${apiClient.baseURL}/files/managed/${fileId}/download`;
    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      throw new Error("File not found");
    }
    return await response.blob();
  };

  const mergeAttachmentsToPdf = async (list) => {
    const merged = await PDFDocument.create();
    const skipped = [];

    for (const doc of list) {
      const fileId = doc.file_id || doc.File?.file_id || doc.file?.file_id;
      if (!fileId) {
        skipped.push(doc?.original_name || "unknown-file");
        continue;
      }

      try {
        const blob = await fetchFileAsBlob(fileId);
        const source = await PDFDocument.load(await blob.arrayBuffer(), {
          ignoreEncryption: true,
        });
        const pages = await merged.copyPages(source, source.getPageIndices());
        pages.forEach((page) => merged.addPage(page));
      } catch (error) {
        console.warn("merge: skip", error);
        skipped.push(doc?.original_name || `file-${fileId}.pdf`);
      }
    }

    if (merged.getPageCount() === 0) {
      const err = new Error("No PDF pages");
      err.skipped = skipped;
      throw err;
    }

    const bytes = await merged.save();
    const blob = new Blob([bytes], { type: "application/pdf" });

    return { blob, skipped };
  };

  const createMergedUrl = async (documents) => {
    if (!documents.length) {
      toast.error("ไม่พบไฟล์สำหรับรวม");
      return null;
    }

    setCreatingMerged(true);
    setMerging(true);
    try {
      const availableDocs = documents.filter(
        (doc) => doc.file_id || doc.File?.file_id || doc.file?.file_id
      );

      if (!availableDocs.length) {
        toast.error("ไม่พบไฟล์ที่สามารถรวมได้");
        return null;
      }

      const pdfLike = availableDocs.filter((doc) =>
        String(doc.original_name || "").toLowerCase().endsWith(".pdf")
      );
      const list = pdfLike.length ? pdfLike : availableDocs;

      const { blob, skipped } = await mergeAttachmentsToPdf(list);

      if (mergedUrlRef.current) {
        URL.revokeObjectURL(mergedUrlRef.current);
      }

      const url = URL.createObjectURL(blob);
      mergedUrlRef.current = url;

      if (skipped.length) {
        toast(`ข้ามไฟล์ ${skipped.length} รายการที่ไม่สามารถรวมได้`);
      }

      return url;
    } catch (error) {
      console.error("merge failed", error);
      const message = error?.message || "ไม่ทราบสาเหตุ";
      toast.error(`รวมไฟล์ไม่สำเร็จ: ${message}`);
      return null;
    } finally {
      setCreatingMerged(false);
      setMerging(false);
    }
  };

  const handleViewMerged = async (documents) => {
    const url = mergedUrlRef.current || (await createMergedUrl(documents));
    if (url) {
      window.open(url, "_blank");
    }
  };

  const handleDownloadMerged = async (documents, fileName) => {
    const url = mergedUrlRef.current || (await createMergedUrl(documents));
    if (!url) {
      return;
    }

    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const getUserFullName = (user) => {
    if (!user) return "-";
    const name = `${user.user_fname || ""} ${user.user_lname || ""}`.trim();
    return name || "-";
  };

  const getUserEmail = (user) => {
    if (!user) return "";
    return user.email || "";
  };

  const getApplicant = () => {
    const applicant =
      submission?.applicant ||
      submission?.applicant_user ||
      submission?.user ||
      submission?.User;

    if (applicant) return applicant;

    const applicantEntry = submission?.submission_users?.find(
      (u) => u.is_applicant || u.IsApplicant
    );
    return applicantEntry?.user || applicantEntry?.User || null;
  };

  const detail = useMemo(() => {
    return (
      submission?.fund_application_detail ||
      submission?.FundApplicationDetail ||
      submission?.details?.data?.fund_application_detail ||
      submission?.details?.data ||
      {}
    );
  }, [submission]);
  const mainAnnouncementId = detail.main_annoucement || detail.main_announcement;
  const activityAnnouncementId =
    detail.activity_support_announcement || detail.activity_announcement;

  const getFileURL = (filePath) => {
    if (!filePath) return "#";
    if (/^https?:\/\//i.test(filePath)) return filePath;
    const base = apiClient.baseURL.replace(/\/?api\/v1$/, "");
    try {
      return new URL(filePath, base).href;
    } catch {
      return filePath;
    }
  };

  const documents =
    submission?.documents || submission?.submission_documents || [];

  useEffect(() => {
    const hasAnnouncementIds =
      mainAnnouncementId != null || activityAnnouncementId != null;
    if (!hasAnnouncementIds) {
      setMainAnnouncementDetail(null);
      setActivityAnnouncementDetail(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        if (mainAnnouncementId) {
          const response = await announcementAPI.getAnnouncement(
            mainAnnouncementId
          );
          const parsed =
            response?.announcement ||
            response?.data?.announcement ||
            response?.data ||
            response ||
            null;
          if (!cancelled) {
            setMainAnnouncementDetail(parsed);
          }
        } else if (!cancelled) {
          setMainAnnouncementDetail(null);
        }

        if (activityAnnouncementId) {
          const response = await announcementAPI.getAnnouncement(
            activityAnnouncementId
          );
          const parsed =
            response?.announcement ||
            response?.data?.announcement ||
            response?.data ||
            response ||
            null;
          if (!cancelled) {
            setActivityAnnouncementDetail(parsed);
          }
        } else if (!cancelled) {
          setActivityAnnouncementDetail(null);
        }
      } catch (error) {
        console.warn("Unable to load announcement detail", error);
        if (!cancelled) {
          setMainAnnouncementDetail(null);
          setActivityAnnouncementDetail(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mainAnnouncementId, activityAnnouncementId]);

  useEffect(() => {
    return () => {
      if (mergedUrlRef.current) {
        URL.revokeObjectURL(mergedUrlRef.current);
        mergedUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (mergedUrlRef.current) {
      URL.revokeObjectURL(mergedUrlRef.current);
      mergedUrlRef.current = null;
    }
  }, [documents]);

  if (loading) {
    return (
      <PageLayout
        title="รายละเอียดคำร้อง"
        subtitle="กำลังโหลดข้อมูล..."
        icon={FileText}
      >
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!submission) {
    return (
      <PageLayout
        title="ไม่พบข้อมูล"
        subtitle="ไม่พบข้อมูลคำร้องที่ต้องการ"
        icon={AlertCircle}
      >
        <Card collapsible={false}>
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600">ไม่พบข้อมูลคำร้องที่ต้องการ</p>
            <button onClick={handleBack} className="btn btn-primary mt-4">
              กลับไปหน้ารายการ
            </button>
          </div>
        </Card>
      </PageLayout>
    );
  }

  const applicant = getApplicant();

  const statusCode =
    getCodeById(submission.status_id) || submission.Status?.status_code;
  const StatusIcon = getColoredStatusIcon(statusCode);
  const submittedAt = submission.submitted_at || submission.created_at;
  const announceReference =
    submission.announce_reference_number || detail.announce_reference_number;

  return (
    <PageLayout
      title={`คำร้องขอทุน #${submission.submission_number}`}
      subtitle="รายละเอียดคำร้องขอรับทุน"
      icon={FileText}
      actions={
        <button onClick={handleBack} className="btn btn-secondary">
          <ArrowLeft size={20} />
          กลับ
        </button>
      }
      breadcrumbs={[
        { label: "หน้าแรก", href: "/member" },
        { label: "คำร้องของฉัน", href: "#", onClick: handleBack },
        { label: submission.submission_number },
      ]}
    >
      {/* Status Summary */}
      <Card
        icon={StatusIcon}
        collapsible={false}
        headerClassName="items-center"
        title={
          <div className="flex items-center gap-2">
            <span>สถานะคำร้อง (Submission Status)</span>
            <StatusBadge
              statusId={submission.status_id}
              fallbackLabel={submission.Status?.status_name}
            />
          </div>
        }
        className="mb-6"
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            <div className="flex flex-col gap-3 mt-4 text-sm">
              <div className="flex flex-wrap items-start gap-2">
                <span className="text-gray-500 shrink-0 min-w-[80px]">
                  ผู้ขอทุน:
                </span>
                <span className="font-medium break-words flex-1">
                  {getUserFullName(applicant)}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 mt-2">
                <div className="flex items-start gap-2">
                  <span className="text-gray-500 shrink-0">เลขที่คำร้อง:</span>
                  <span className="font-medium">
                    {submission.submission_number || "-"}
                  </span>
                </div>
                {submittedAt && (
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 shrink-0">วันที่ส่งคำร้อง:</span>
                    <span className="font-medium">
                      {new Date(submittedAt).toLocaleDateString("th-TH", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                )}
                {submission.approved_at && (
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 shrink-0">วันที่อนุมัติ:</span>
                    <span className="font-medium">
                      {new Date(submission.approved_at).toLocaleDateString(
                        "th-TH",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )}
                    </span>
                  </div>
                )}
                {announceReference && (
                  <div className="flex items-start gap-2 lg:col-span-2 xl:col-span-3">
                    <span className="text-gray-500 shrink-0">
                      หมายเลขอ้างอิงประกาศผลการพิจารณา:
                    </span>
                    <span className="font-medium break-all">
                      {announceReference}
                    </span>
                  </div>
                )}
                {submission.subcategory_name && (
                  <div className="flex items-start gap-2 lg:col-span-2 xl:col-span-3">
                    <span className="text-gray-500 shrink-0">ชื่อทุน:</span>
                    <span className="font-medium break-words">
                      {submission.subcategory_name}
                    </span>
                  </div>
                )}
                {(mainAnnouncementDetail || mainAnnouncementId) && (
                  <div className="flex items-start gap-2 lg:col-span-2 xl:col-span-3">
                    <span className="text-gray-500 shrink-0">ประกาศหลักเกณฑ์:</span>
                    {mainAnnouncementDetail?.file_path ? (
                      <a
                        href={getFileURL(mainAnnouncementDetail.file_path)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline break-all cursor-pointer pointer-events-auto relative z-10"
                        title={
                          mainAnnouncementDetail?.title ||
                          mainAnnouncementDetail?.file_name ||
                          `#${mainAnnouncementId}`
                        }
                      >
                        {mainAnnouncementDetail?.title ||
                          mainAnnouncementDetail?.file_name ||
                          `#${mainAnnouncementId}`}
                      </a>
                    ) : mainAnnouncementId ? (
                      <span className="font-medium break-all">{`#${mainAnnouncementId}`}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </div>
                )}
                {(activityAnnouncementDetail || activityAnnouncementId) && (
                  <div className="flex items-start gap-2 lg:col-span-2 xl:col-span-3">
                    <span className="text-gray-500 shrink-0">ประกาศสนับสนุนกิจกรรม:</span>
                    {activityAnnouncementDetail?.file_path ? (
                      <a
                        href={getFileURL(activityAnnouncementDetail.file_path)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline break-all cursor-pointer pointer-events-auto relative z-10"
                        title={
                          activityAnnouncementDetail?.title ||
                          activityAnnouncementDetail?.file_name ||
                          `#${activityAnnouncementId}`
                        }
                      >
                        {activityAnnouncementDetail?.title ||
                          activityAnnouncementDetail?.file_name ||
                          `#${activityAnnouncementId}`}
                      </a>
                    ) : activityAnnouncementId ? (
                      <span className="font-medium break-all">{`#${activityAnnouncementId}`}</span>
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
              {formatCurrency(detail.requested_amount || 0)}
            </div>
            <div className="text-sm text-gray-500">จำนวนเงินที่ขอ</div>
            {detail.approved_amount != null && (
              <div className="mt-2">
                <div className="text-lg font-bold text-green-600">
                  {formatCurrency(detail.approved_amount || 0)}
                </div>
                <div className="text-sm text-gray-500">จำนวนเงินที่อนุมัติ</div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Documents */}
      <Card title="เอกสารแนบ (Attachments)" icon={FileText} collapsible={false}>
        <div className="space-y-6">
          {documents.length > 0 ? (
            <div className="space-y-4">
              {documents.map((doc, index) => {
                const fileId = doc.file_id || doc.File?.file_id || doc.file?.file_id;
                const trimmedOriginal =
                  typeof doc.original_name === "string" ? doc.original_name.trim() : "";
                const fileName = trimmedOriginal || "-";
                const downloadName =
                  trimmedOriginal || `document-${fileId ?? index + 1}`;
                const docType = (doc.document_type_name || "").trim() || "ไม่ระบุประเภท";

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
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                              {docType}
                            </span>
                          </div>
                          {fileId ? (
                            <a
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                handleView(fileId);
                              }}
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

          {documents.length > 0 && (
            <div className="flex justify-end gap-3 pt-4 border-t-1 border-gray-300">
              <button
                className="inline-flex items-center gap-1 border border-blue-200 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => handleViewMerged(documents)}
                disabled={documents.length === 0 || merging || creatingMerged}
                title="เปิดดูไฟล์แนบที่ถูกรวมเป็น PDF"
              >
                <Eye size={16} /> ดูไฟล์รวม (PDF)
              </button>
              <button
                className="inline-flex items-center gap-1 border border-green-200 px-3 py-2 text-sm text-green-600 hover:bg-green-50 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() =>
                  handleDownloadMerged(
                    documents,
                    `merged_documents_${
                      submission?.submission_number || submission?.submission_id || ""
                    }.pdf`
                  )
                }
                disabled={documents.length === 0 || merging || creatingMerged}
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