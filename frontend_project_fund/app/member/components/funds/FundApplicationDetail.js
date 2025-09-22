"use client";

import { useState, useEffect } from "react";
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
import apiClient from "@/app/lib/api";
import PageLayout from "../common/PageLayout";
import Card from "../common/Card";
import StatusBadge from "../common/StatusBadge";
import { formatCurrency } from "@/app/utils/format";

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

export default function FundApplicationDetail({ submissionId, onNavigate }) {
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const detail =
    submission.fund_application_detail || submission.FundApplicationDetail || {};
  const documents =
    submission.documents || submission.submission_documents || [];
  const applicant = getApplicant();

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
      <Card className="mb-6 border-l-4 border-blue-500" collapsible={false}>
        <div className="flex justify-between items-start">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              {getStatusIcon(submission.status_id)}
              <h3 className="text-lg font-semibold">
                สถานะคำร้อง (Submission Status)
              </h3>
              <div className="flex-shrink-0">
                <StatusBadge
                  status={submission.Status?.status_name}
                  statusId={submission.status_id}
                />
              </div>
              <h3 className="text-lg font-semibold w-full">
                ชื่อทุน: {submission?.subcategory_name && ` ${submission.subcategory_name}`}
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-sm">
              <div>
                <span className="text-gray-500">วันที่สร้างคำร้อง (Created Date):</span>
                <span className="ml-2 font-medium">
                  {new Date(submission.created_at).toLocaleDateString("th-TH", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
              {submission.submitted_at && (
                <div>
                  <span className="text-gray-500">วันที่ส่งคำร้อง (Submitted Date):</span>
                  <span className="ml-2 font-medium">
                    {new Date(submission.submitted_at).toLocaleDateString(
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
              {submission.status_id === 2 &&
                (submission.announce_reference_number ||
                  detail.announce_reference_number) && (
                  <div className="md:col-span-3">
                    <span className="text-gray-500">
                      เลขอ้างอิงประกาศ (Announcement Reference):
                    </span>
                    <span className="ml-2 font-medium">
                      {submission.announce_reference_number ||
                        detail.announce_reference_number}
                    </span>
                  </div>
                )}
              {submission.approved_at && (
                <div>
                  <span className="text-gray-500">วันที่อนุมัติ (Approval Date):</span>
                  <span className="ml-2 font-medium">
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
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(detail.requested_amount || 0)}
            </div>
            <div className="text-sm text-gray-500">จำนวนเงินที่ขอ</div>
            {submission.status_id === 2 && detail.approved_amount != null && (
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

      {/* Applicant Info */}
      <Card
        title="ข้อมูลผู้ยื่นคำร้อง (Applicant Details)"
        icon={User}
        collapsible={false}
        className="mb-6"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-500">ชื่อผู้ยื่นคำร้อง (Applicant)</label>
            <p className="font-medium">{getUserFullName(applicant)}</p>
          </div>
          {getUserEmail(applicant) && (
            <div>
              <label className="text-sm text-gray-500">อีเมล (Email)</label>
              <p className="font-medium">{getUserEmail(applicant)}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Documents */}
      <Card title="เอกสารแนบ (Attachments)" icon={FileText} collapsible={false}>
        <div className="space-y-4">
          {documents.length > 0 ? (
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
                  {documents.map((doc, index) => {
                    const fileId = doc.file_id || doc.File?.file_id || doc.file?.file_id;
                    const docName =
                      doc.File?.original_name ||
                      doc.file?.original_name ||
                      doc.original_filename ||
                      doc.file_name ||
                      doc.name ||
                      `เอกสารที่ ${index + 1}`;
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
                            <span className="text-sm text-gray-700">{docName}</span>
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
                              onClick={() => handleDownload(fileId, docName)}
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