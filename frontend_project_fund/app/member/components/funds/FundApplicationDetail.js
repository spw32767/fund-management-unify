"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
import apiClient, { announcementAPI } from "@/app/lib/api";
import PageLayout from "../common/PageLayout";
import Card from "../common/Card";
import StatusBadge from "../common/StatusBadge";
import { formatCurrency } from "@/app/utils/format";
import { useStatusMap } from "@/app/hooks/useStatusMap";

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
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [mainAnnouncementDetail, setMainAnnouncementDetail] = useState(null);
  const [activityAnnouncementDetail, setActivityAnnouncementDetail] = useState(
    null
  );
  const { getCodeById } = useStatusMap();

  const submissionCacheKey = useMemo(
    () => ["memberSubmission", submissionId ?? null],
    [submissionId]
  );
  const documentsCacheKey = useMemo(
    () => ["memberSubmissionDocs", submissionId ?? null],
    [submissionId]
  );

  const activeRequestsRef = useRef({
    submission: { controller: null, token: null, cacheKey: submissionCacheKey },
    documents: { controller: null, token: null, cacheKey: documentsCacheKey },
  });

  useEffect(() => {
    activeRequestsRef.current.submission.cacheKey = submissionCacheKey;
    activeRequestsRef.current.documents.cacheKey = documentsCacheKey;
  }, [submissionCacheKey, documentsCacheKey]);

  const fetchSubmissionDetail = useCallback(
    async ({ targetSubmissionId, signal }) => {
      if (!targetSubmissionId) return null;

      const url = `${apiClient.baseURL}/submissions/${targetSubmissionId}`;
      return apiClient.makeRequestWithRetry(url, { method: "GET", signal });
    },
    []
  );

  const fetchSubmissionUsers = useCallback(
    async ({ targetSubmissionId, signal }) => {
      if (!targetSubmissionId) return null;
      try {
        const url = `${apiClient.baseURL}/submissions/${targetSubmissionId}/users`;
        const response = await apiClient.makeRequestWithRetry(url, {
          method: "GET",
          signal,
        });
        return response?.users || response?.data?.users || response || [];
      } catch (error) {
        if (error?.name === "AbortError") {
          return null;
        }
        console.log("Could not load submission users", error);
        return null;
      }
    },
    []
  );

  const fetchSubmissionDocuments = useCallback(
    async ({ targetSubmissionId, signal }) => {
      if (!targetSubmissionId) return [];

      const url = `${apiClient.baseURL}/submissions/${targetSubmissionId}/documents`;
      const response = await apiClient.makeRequestWithRetry(url, {
        method: "GET",
        signal,
      });

      return response?.documents || response?.data?.documents || response || [];
    },
    []
  );

  useEffect(() => {
    const submissionController = new AbortController();
    const documentsController = new AbortController();
    const submissionToken = Symbol("submission-request");
    const documentsToken = Symbol("documents-request");

    if (activeRequestsRef.current.submission.controller) {
      activeRequestsRef.current.submission.controller.abort();
    }
    if (activeRequestsRef.current.documents.controller) {
      activeRequestsRef.current.documents.controller.abort();
    }

    activeRequestsRef.current.submission = {
      controller: submissionController,
      token: submissionToken,
      cacheKey: submissionCacheKey,
    };
    activeRequestsRef.current.documents = {
      controller: documentsController,
      token: documentsToken,
      cacheKey: documentsCacheKey,
    };

    setSubmission(null);
    setDocuments([]);
    setLoading(Boolean(submissionId));
    setDocumentsLoading(Boolean(submissionId));

    if (!submissionId) {
      return () => {
        submissionController.abort();
        documentsController.abort();
      };
    }

    (async () => {
      try {
        const response = await fetchSubmissionDetail({
          targetSubmissionId: submissionId,
          signal: submissionController.signal,
        });
        if (!response || submissionController.signal.aborted) {
          return;
        }
        if (activeRequestsRef.current.submission.token !== submissionToken) {
          return;
        }

        let submissionData = response.submission || response;
        const responseId =
          submissionData?.submission_id ??
          submissionData?.id ??
          response?.submission_id ??
          null;
        if (
          responseId != null &&
          String(responseId) !== String(submissionId)
        ) {
          console.warn("Ignored submission response due to mismatched id", {
            expected: submissionId,
            received: responseId,
          });
          return;
        }

        if (response.applicant_user) {
          submissionData.applicant_user = response.applicant_user;
          if (!submissionData.user) {
            submissionData.user = response.applicant_user;
          }
        }

        if (response.submission_users) {
          submissionData.submission_users = response.submission_users;
        } else if (
          (!submissionData.submission_users ||
            submissionData.submission_users.length === 0) &&
          submissionData.user_id
        ) {
          const users = await fetchSubmissionUsers({
            targetSubmissionId: submissionId,
            signal: submissionController.signal,
          });
          if (
            users &&
            !submissionController.signal.aborted &&
            activeRequestsRef.current.submission.token === submissionToken
          ) {
            const normalizedUsers = Array.isArray(users)
              ? users
              : users?.users || [];
            if (Array.isArray(normalizedUsers) && normalizedUsers.length > 0) {
              submissionData.submission_users = normalizedUsers;
            }
          }
        }

        if (
          submissionController.signal.aborted ||
          activeRequestsRef.current.submission.token !== submissionToken
        ) {
          return;
        }

        setSubmission(submissionData);
      } catch (error) {
        if (error?.name === "AbortError") {
          return;
        }
        console.error("Error loading submission detail:", error);
      } finally {
        if (activeRequestsRef.current.submission.token === submissionToken) {
          setLoading(false);
        }
      }
    })();

    (async () => {
      try {
        const response = await fetchSubmissionDocuments({
          targetSubmissionId: submissionId,
          signal: documentsController.signal,
        });
        if (documentsController.signal.aborted) {
          return;
        }
        if (activeRequestsRef.current.documents.token !== documentsToken) {
          return;
        }
        const normalized = Array.isArray(response)
          ? response
          : response?.documents || [];
        setDocuments(Array.isArray(normalized) ? normalized : []);
      } catch (error) {
        if (error?.name === "AbortError") {
          return;
        }
        console.error("Error loading submission documents:", error);
      } finally {
        if (activeRequestsRef.current.documents.token === documentsToken) {
          setDocumentsLoading(false);
        }
      }
    })();

    return () => {
      submissionController.abort();
      documentsController.abort();
    };
  }, [
    submissionId,
    submissionCacheKey,
    documentsCacheKey,
    fetchSubmissionDetail,
    fetchSubmissionDocuments,
    fetchSubmissionUsers,
  ]);

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

  const sortedDocuments = useMemo(() => {
    const list = Array.isArray(documents) ? [...documents] : [];
    return list.sort((a, b) => {
      const orderA = Number(a?.display_order ?? a?.DisplayOrder ?? 0);
      const orderB = Number(b?.display_order ?? b?.DisplayOrder ?? 0);
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      const idA = Number(
        a?.document_id ?? a?.DocumentID ?? a?.id ?? a?.ID ?? 0
      );
      const idB = Number(
        b?.document_id ?? b?.DocumentID ?? b?.id ?? b?.ID ?? 0
      );
      if (!Number.isNaN(idA) && !Number.isNaN(idB) && idA !== idB) {
        return idA - idB;
      }
      return 0;
    });
  }, [documents]);
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
        <div className="space-y-4">
          {documentsLoading ? (
            <div className="py-6 text-center text-sm text-gray-500">
              กำลังโหลดเอกสารแนบ...
            </div>
          ) : sortedDocuments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      No.
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      File Type
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Attached File
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedDocuments.map((doc, index) => {
                    const fileId = doc.file_id || doc.File?.file_id || doc.file?.file_id;
                    const originalName =
                      typeof doc.original_name === "string"
                        ? doc.original_name.trim()
                        : "";
                    const displayName = originalName || "-";
                    const downloadName =
                      originalName || `document-${fileId ?? index + 1}`;
                    const docType =
                      doc.document_type_name && doc.document_type_name.trim() !== ""
                        ? doc.document_type_name
                        : "-";
                    return (
                      <tr key={doc.document_id || fileId || index}>
                        <td className="px-4 py-2 text-sm text-gray-500">{index + 1}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{docType}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center">
                            <FileText className="h-5 w-5 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-700">{displayName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleView(fileId)}
                              className="inline-flex items-center gap-1 px-3 py-1 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md"
                            >
                              <Eye className="h-4 w-4" />
                              ดู
                            </button>
                            <button
                              onClick={() => handleDownload(fileId, downloadName)}
                              className="inline-flex items-center gap-1 px-3 py-1 text-sm text-green-600 bg-green-50 hover:bg-green-100 rounded-md"
                            >
                              <Download className="h-4 w-4" />
                              ดาวน์โหลด
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">ไม่มีเอกสารแนบ</p>
          )}
        </div>
      </Card>
    </PageLayout>
  );
}