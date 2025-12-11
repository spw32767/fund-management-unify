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
import apiClient, { announcementAPI, APIError } from "@/app/lib/api";
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

const getFileURL = (filePath) => {
  if (!filePath) return "#";
  if (typeof filePath === "string" && /^https?:\/\//i.test(filePath)) {
    return filePath;
  }

  const base = (apiClient?.baseURL || "").replace(/\/?api\/v1$/, "");

  try {
    return new URL(filePath, base || (typeof window !== "undefined" ? window.location.origin : undefined)).href;
  } catch (error) {
    return typeof filePath === "string" ? filePath : "#";
  }
};

const firstNonEmpty = (...values) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }
  return null;
};

const extractFirstFilePath = (value) => {
  if (!value || typeof value !== "object") return null;

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
    if (typeof candidate === "string" && candidate.trim() !== "") {
      return candidate.trim();
    }
  }

  const fileCollections = [value.files, value.Files, value.documents, value.Documents];
  for (const collection of fileCollections) {
    if (!Array.isArray(collection)) continue;
    for (const entry of collection) {
      const nested = extractFirstFilePath(entry);
      if (nested) return nested;
      if (typeof entry === "string" && entry.trim() !== "") {
        return entry.trim();
      }
    }
  }

  return null;
};

const normalizeDocumentName = (name) =>
  typeof name === "string" ? name.trim().toLowerCase() : "";

const HIDDEN_MERGED_FORM_NAME = "แบบฟอร์มคำร้องรวม (merged pdf)".toLowerCase();
const HIDDEN_MERGED_FILE_REGEX = /_merged_document(?:_\d+)?\.pdf$/i;
const MERGED_FOLDER_SEGMENT = "merge_submissions";

const getDocumentNameCandidates = (doc) => {
  if (!doc) return [];
  if (typeof doc === "string") return [doc];

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
  if (typeof doc === "string") return [doc];

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
    if (typeof candidate !== "string") return false;
    const normalized = candidate.trim().toLowerCase();
    return (
      !normalized
        ? false
        : normalized.includes(MERGED_FOLDER_SEGMENT) ||
          HIDDEN_MERGED_FILE_REGEX.test(normalized)
    );
  });
};

const toCamelSuffix = (suffix) => {
  if (!suffix) return "";
  const trimmed = suffix.replace(/^_+/, "");
  if (!trimmed) return "";
  return trimmed
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
};

const buildKeyVariants = (base, suffixes) => {
  const variants = new Set();
  const hasUnderscore = base.includes("_");
  const hasCamel = /[A-Z]/.test(base);

  for (const suffix of suffixes) {
    if (hasUnderscore) {
      variants.add(`${base}${suffix}`);
    }

    if (hasCamel || !hasUnderscore) {
      const camelSuffix = toCamelSuffix(suffix);
      variants.add(`${base}${camelSuffix}`);
    }
  }

  return Array.from(variants);
};

const buildAnnouncementFromDetail = (detail, baseNames) => {
  if (!detail || typeof detail !== "object") return null;

  const objectSuffixes = [
    "",
    "_detail",
    "_obj",
    "_object",
    "_document",
    "_file",
    "_info",
    "_data",
    "_record",
  ];

  const objectCandidates = [];
  for (const base of baseNames) {
    const keys = buildKeyVariants(base, objectSuffixes);
    for (const key of keys) {
      const value = detail?.[key];
      if (!value || typeof value !== "object") continue;

      const labelCandidate = firstNonEmpty(
        value.title,
        value.file_name,
        value.announcement_file_name,
        value.name,
        value.label,
        value.document_name,
        value.display_name,
      );
      const filePath = extractFirstFilePath(value);

      if (labelCandidate || filePath) {
        if (filePath && !value.file_path) {
          return { ...value, file_path: filePath };
        }
        return value;
      }
    }
  }

  const pathSuffixes = [
    "_file_path",
    "_document_path",
    "_path",
    "_url",
    "_file_url",
    "_download_url",
    "_document_url",
    "_attachment_path",
    "_attachment_url",
    "_link",
  ];

  const labelSuffixes = [
    "_title",
    "_name",
    "_label",
    "_file_name",
    "_document_name",
    "_file_label",
    "_display_name",
    "_original_name",
    "_file_title",
  ];

  const pathCandidates = [];
  const labelCandidates = [];

  for (const base of baseNames) {
    const pathKeys = buildKeyVariants(base, pathSuffixes);
    for (const key of pathKeys) {
      const value = detail?.[key];
      if (typeof value === "string" && value.trim() !== "") {
        pathCandidates.push(value.trim());
      }
    }

    const labelKeys = buildKeyVariants(base, labelSuffixes);
    for (const key of labelKeys) {
      const value = detail?.[key];
      if (typeof value === "string" && value.trim() !== "") {
        labelCandidates.push(value.trim());
      }
    }
  }

  const filePath = firstNonEmpty(...pathCandidates);
  const label = firstNonEmpty(...labelCandidates);

  if (filePath || label) {
    return {
      title: label || undefined,
      file_name: label || undefined,
      file_path: filePath || undefined,
    };
  }

  return null;
};

const resolveAnnouncementInfo = (value, fallbackLabel) => {
  const fallback =
    typeof fallbackLabel === "string"
      ? fallbackLabel
      : fallbackLabel != null
      ? String(fallbackLabel)
      : null;

  if (!value) {
    return fallback ? { label: fallback, href: null } : null;
  }

  if (typeof value === "object") {
    const label =
      firstNonEmpty(
        value.title,
        value.file_name,
        value.announcement_file_name,
        value.file_name_th,
        value.file_name_en,
        value.name,
        value.announcement_title,
        value.announcement_title_th,
        value.announcement_title_en,
        value.original_name,
        value.label,
        value.title_th,
        value.title_en,
        value.name_th,
        value.name_en,
        value.reference_code,
        value.reference_number,
        value.reference,
        value.code,
        value.id != null ? `#${value.id}` : null,
        value.announcement_id != null ? `#${value.announcement_id}` : null,
        fallback,
      ) || "-";

    const filePath = extractFirstFilePath(value);

    return {
      label,
      href: filePath ? getFileURL(filePath) : null,
    };
  }

  const label = typeof value === "string" && value.trim() !== "" ? value.trim() : String(value);
  return { label, href: null };
};

const sanitizeAnnouncementId = (value) => {
  if (value == null) return null;
  if (typeof value === "object") {
    return sanitizeAnnouncementId(
      value.id ??
        value.announcement_id ??
        value.announcementId ??
        value.announcementID ??
        value.reference_id ??
        value.referenceId ??
        value.AnnouncementID ??
        null,
    );
  }

  const text = String(value).trim();
  if (!text) return null;
  return text.startsWith("#") ? text.slice(1) : text;
};

const deriveAnnouncementId = (...values) => {
  for (const value of values) {
    const id = sanitizeAnnouncementId(value);
    if (id) return id;
  }
  return null;
};

export default function FundApplicationDetail({
  submissionId,
  onNavigate,
  originPage = "applications",
}) {
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
          console.warn("Could not load submission users", err);
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
      onNavigate(originPage || "applications");
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

  const contactPhone = firstNonEmpty(
    submission?.contact_phone,
    submission?.details?.data?.contact_phone,
    detail?.contact_phone,
  );

  const bankAccount = firstNonEmpty(
    submission?.bank_account,
    submission?.details?.data?.bank_account,
    detail?.bank_account,
  );

  const bankName = firstNonEmpty(
    submission?.bank_name,
    submission?.details?.data?.bank_name,
    detail?.bank_name,
  );

  const bankAccountName = firstNonEmpty(
    submission?.bank_account_name,
    submission?.details?.data?.bank_account_name,
    detail?.bank_account_name,
  );

  const mainAnnouncementId = deriveAnnouncementId(
    detail?.main_annoucement_id,
    detail?.main_announcement_id,
    detail?.main_annoucement,
    detail?.main_announcement,
    detail?.main_annoucement_detail?.id,
    detail?.main_annoucement_detail?.announcement_id,
    detail?.main_announcement_detail?.id,
    detail?.main_announcement_detail?.announcement_id,
  );

  const activityAnnouncementId = deriveAnnouncementId(
    detail?.activity_support_announcement_id,
    detail?.activity_announcement_id,
    detail?.activity_support_announcement,
    detail?.activity_announcement,
    detail?.activity_support_announcement_detail?.id,
    detail?.activity_support_announcement_detail?.announcement_id,
    detail?.activity_announcement_detail?.id,
    detail?.activity_announcement_detail?.announcement_id,
  );

  const documents =
    submission?.documents || submission?.submission_documents || [];

  const visibleDocuments = useMemo(() => {
    if (!Array.isArray(documents)) return [];
    return documents.filter((doc) => !isMergedFormDocument(doc));
  }, [documents]);

  const mainAnnouncementFallback = useMemo(
    () =>
      buildAnnouncementFromDetail(detail, [
        "main_annoucement",
        "main_announcement",
        "mainAnnoucement",
        "mainAnnouncement",
      ]),
    [detail],
  );

  const activityAnnouncementFallback = useMemo(
    () =>
      buildAnnouncementFromDetail(detail, [
        "activity_support_announcement",
        "activity_announcement",
        "activitySupportAnnouncement",
        "activityAnnouncement",
      ]),
    [detail],
  );

  useEffect(() => {
    const hasAnnouncementIds =
      Boolean(mainAnnouncementId) || Boolean(activityAnnouncementId);
    if (!hasAnnouncementIds) {
      setMainAnnouncementDetail(null);
      setActivityAnnouncementDetail(null);
      return;
    }

    let cancelled = false;

    const loadAnnouncement = async (id, setter) => {
      if (!id) {
        setter(null);
        return;
      }

      try {
        const response = await announcementAPI.getAnnouncement(id);
        const parsed =
          response?.announcement ||
          response?.data?.announcement ||
          response?.data ||
          response ||
          null;

        if (!cancelled) {
          setter(parsed);
        }
      } catch (error) {
        const isNotFound =
          error instanceof APIError ? error.status === 404 : error?.status === 404;
        if (!isNotFound) {
          console.warn("Unable to load announcement detail", error);
        }
        if (!cancelled) {
          setter(null);
        }
      }
    };

    loadAnnouncement(mainAnnouncementId, setMainAnnouncementDetail);
    loadAnnouncement(activityAnnouncementId, setActivityAnnouncementDetail);

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

  const formatAnnouncementId = (value) => {
    const sanitized = sanitizeAnnouncementId(value);
    if (!sanitized) return null;
    return `#${sanitized}`;
  };

  const mainAnnouncementRaw =
    mainAnnouncementDetail ||
    detail?.main_announcement_detail ||
    detail?.main_annoucement_detail ||
    mainAnnouncementFallback ||
    detail?.main_announcement ||
    detail?.main_annoucement ||
    null;

  const activityAnnouncementRaw =
    activityAnnouncementDetail ||
    detail?.activity_support_announcement_detail ||
    detail?.activity_announcement_detail ||
    activityAnnouncementFallback ||
    detail?.activity_support_announcement_obj ||
    detail?.activity_support_announcement ||
    detail?.activity_announcement ||
    null;

  const mainAnnouncement = resolveAnnouncementInfo(
    mainAnnouncementRaw,
    formatAnnouncementId(mainAnnouncementId),
  );

  const activityAnnouncement = resolveAnnouncementInfo(
    activityAnnouncementRaw,
    formatAnnouncementId(activityAnnouncementId),
  );

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
  const originLabel = originPage === "received-funds" ? "ทุนที่เคยได้รับ" : "คำร้องของฉัน";
  
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
        { label: originLabel, href: "#", onClick: handleBack },
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
                <div className="flex items-start gap-2">
                  <span className="text-gray-500 shrink-0">เบอร์ติดต่อ:</span>
                  <span className="font-medium break-words">
                    {contactPhone || "-"}
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
                {(submission.admin_approved_at || submission.head_approved_at) && (
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 shrink-0">วันที่อนุมัติ:</span>
                    <span className="font-medium">
                      {new Date(submission.admin_approved_at || submission.head_approved_at).toLocaleDateString(
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
                <div className="flex items-start gap-2 lg:col-span-2 xl:col-span-3">
                  <span className="text-gray-500 shrink-0">ข้อมูลธนาคาร:</span>
                  <div className="flex flex-col text-sm font-medium text-gray-700">
                    <span>
                      เลขที่บัญชี: <span className="font-semibold">{bankAccount || "-"}</span>
                    </span>
                    <span>
                      ชื่อบัญชี: <span className="font-semibold">{bankAccountName || "-"}</span>
                    </span>
                    <span>
                      ธนาคาร: <span className="font-semibold">{bankName || "-"}</span>
                    </span>
                  </div>
                </div>
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
                {mainAnnouncement && (
                  <div className="flex items-start gap-2 lg:col-span-2 xl:col-span-3">
                    <span className="text-gray-500 shrink-0">ประกาศหลักเกณฑ์:</span>
                    {mainAnnouncement.href ? (
                      <a
                        href={mainAnnouncement.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline break-all cursor-pointer pointer-events-auto relative z-10"
                        title={mainAnnouncement.label}
                      >
                        {mainAnnouncement.label}
                      </a>
                    ) : (
                      <span className="text-gray-400">
                        {mainAnnouncement.label || "-"}
                      </span>
                    )}
                  </div>
                )}
                {activityAnnouncement && (
                  <div className="flex items-start gap-2 lg:col-span-2 xl:col-span-3">
                    <span className="text-gray-500 shrink-0">ประกาศสนับสนุนกิจกรรม:</span>
                    {activityAnnouncement.href ? (
                      <a
                        href={activityAnnouncement.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline break-all cursor-pointer pointer-events-auto relative z-10"
                        title={activityAnnouncement.label}
                      >
                        {activityAnnouncement.label}
                      </a>
                    ) : (
                      <span className="text-gray-400">
                        {activityAnnouncement.label || "-"}
                      </span>
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
          {visibleDocuments.length > 0 ? (
            <div className="space-y-4">
              {visibleDocuments.map((doc, index) => {
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

          {visibleDocuments.length > 0 && (
            <div className="flex justify-end gap-3 pt-4 border-t-1 border-gray-300">
              <button
                className="inline-flex items-center gap-1 border border-blue-200 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => handleViewMerged(visibleDocuments)}
                disabled={visibleDocuments.length === 0 || merging || creatingMerged}
                title="เปิดดูไฟล์แนบที่ถูกรวมเป็น PDF"
              >
                <Eye size={16} /> ดูไฟล์รวม (PDF)
              </button>
              <button
                className="inline-flex items-center gap-1 border border-green-200 px-3 py-2 text-sm text-green-600 hover:bg-green-50 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() =>
                  handleDownloadMerged(
                    visibleDocuments,
                    `merged_documents_${
                      submission?.submission_number || submission?.submission_id || ""
                    }.pdf`
                  )
                }
                disabled={visibleDocuments.length === 0 || merging || creatingMerged}
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