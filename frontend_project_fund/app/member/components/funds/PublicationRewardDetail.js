"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { toast } from "react-hot-toast";
import { PDFDocument } from "pdf-lib";
import {
  ArrowLeft,
  FileText,
  Calendar,
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
  Edit,
  Trash2,
  Users,
  Link,
  Hash,
  Building,
  FileCheck,
} from "lucide-react";
import { submissionAPI, submissionUsersAPI } from "@/app/lib/member_api";
import apiClient, { announcementAPI } from "@/app/lib/api";
import PageLayout from "../common/PageLayout";
import Card from "../common/Card";
import StatusBadge from "../common/StatusBadge";
import { formatCurrency } from "@/app/utils/format";
import { useStatusMap } from "@/app/hooks/useStatusMap";

const getStatusIcon = (statusCode) => {
  switch (statusCode) {
    case "approved":
      return CheckCircle;
    case "rejected":
      return XCircle;
    case "revision":
      return AlertCircle;
    case "draft":
      return Clock;
    default:
      return Clock;
  }
};

const getStatusIconColor = (statusCode) => {
  switch (statusCode) {
    case "approved":
      return "text-green-600";
    case "rejected":
      return "text-red-600";
    case "revision":
      return "text-orange-600";
    case "draft":
      return "text-gray-600";
    default:
      return "text-yellow-600";
  }
};

const getColoredStatusIcon = (statusCode) => {
  const Icon = getStatusIcon(statusCode);
  const color = getStatusIconColor(statusCode);

  return function ColoredStatusIcon(props) {
    return <Icon {...props} className={`${props.className || ""} ${color}`} />;
  };
};

const renderStatusIcon = (statusCode, className = "") => {
  const Icon = getStatusIcon(statusCode);
  if (!Icon) return null;
  return <Icon className={className} />;
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date?.getTime?.())) return "-";
  return date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const firstNonEmpty = (...vals) => {
  for (const v of vals) {
    if (typeof v === "string" && v.trim() !== "") {
      return v.trim();
    }
  }
  return null;
};

const getSubcategoryName = (submission, pubDetail) => {
  const fromDetail = firstNonEmpty(
    pubDetail?.subcategory_name_th,
    pubDetail?.subcategory_name,
    pubDetail?.fund_subcategory_name,
    pubDetail?.subcategory_label,
    pubDetail?.fund_subcategory_label,
  );
  if (fromDetail) return fromDetail;

  const fromSubmissionFlat = firstNonEmpty(
    submission?.subcategory_name_th,
    submission?.subcategory_name,
    submission?.fund_subcategory_name,
    submission?.subcategory_label,
    submission?.fund_subcategory_label,
  );
  if (fromSubmissionFlat) return fromSubmissionFlat;

  const subcatObj =
    submission?.subcategory ||
    submission?.fund_subcategory ||
    submission?.Subcategory ||
    submission?.FundSubcategory ||
    submission?.fundSubcategory;

  const fromObj = firstNonEmpty(
    subcatObj?.name_th,
    subcatObj?.title_th,
    subcatObj?.label_th,
    subcatObj?.name_en,
    subcatObj?.title_en,
    subcatObj?.label_en,
    subcatObj?.name,
    subcatObj?.title,
    subcatObj?.label,
  );

  return fromObj || "-";
};

const getFileURL = (filePath) => {
  if (!filePath) return "#";
  if (/^https?:\/\//i.test(filePath)) return filePath;

  const base = (apiClient?.baseURL || "").replace(/\/?api\/v1$/, "");

  try {
    return new URL(filePath, base || (typeof window !== "undefined" ? window.location.origin : undefined)).href;
  } catch (error) {
    return filePath;
  }
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
        value.file_name_th,
        value.file_name_en,
        value.name,
        value.announcement_title,
        value.original_name,
        value.label,
        value.title_th,
        value.title_en,
        value.name_th,
        value.name_en,
        value.reference_code,
        value.reference_number,
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

export default function PublicationRewardDetail({
  submissionId,
  onNavigate,
  originPage = "applications",
}) {
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("details");
  const [mainAnnouncementDetail, setMainAnnouncementDetail] = useState(null);
  const [rewardAnnouncementDetail, setRewardAnnouncementDetail] = useState(null);
  const [merging, setMerging] = useState(false);
  const { getLabelById, getCodeById } = useStatusMap();
  const mergedUrlRef = useRef(null);
  // documents may come from different property names depending on the API response
  const documents =
    submission?.documents || submission?.submission_documents || [];

  const visibleDocuments = useMemo(() => {
    if (!Array.isArray(documents)) return [];
    return documents.filter((doc) => !isMergedFormDocument(doc));
  }, [documents]);

  const cleanupMergedUrl = () => {
    if (mergedUrlRef.current) {
      URL.revokeObjectURL(mergedUrlRef.current);
      mergedUrlRef.current = null;
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

    return response.blob();
  };

  const mergeAttachmentsToPdf = async (list) => {
    const merged = await PDFDocument.create();
    const skipped = [];

    for (const doc of list) {
      const fileId =
        doc?.file_id ?? doc?.File?.file_id ?? doc?.file?.file_id ?? doc?.id;

      if (!fileId) {
        skipped.push(doc?.original_name || "ไม่พบข้อมูลไฟล์");
        continue;
      }

      try {
        const blob = await fetchFileAsBlob(fileId);
        const src = await PDFDocument.load(await blob.arrayBuffer(), {
          ignoreEncryption: true,
        });
        const pages = await merged.copyPages(src, src.getPageIndices());
        pages.forEach((page) => merged.addPage(page));
      } catch (error) {
        console.warn("merge: skip", doc?.original_name || fileId, error);
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

  const getUserFullName = (user) => {
    if (!user) return "-";

    const firstName =
      user.user_fname ||
      user.first_name ||
      user.full_name?.split(" ")[0] ||
      user.fullname?.split(" ")[0] ||
      user.name?.split(" ")[0] ||
      "";
    const lastName =
      user.user_lname ||
      user.last_name ||
      user.full_name?.split(" ").slice(1).join(" ") ||
      user.fullname?.split(" ").slice(1).join(" ") ||
      user.name?.split(" ").slice(1).join(" ") ||
      "";

    const fullName = (user.full_name || user.fullname || `${firstName} ${lastName}`).trim();

    
    return fullName || "-";
  };

  const getUserEmail = (user) => {
    if (!user) return "";
    return user.email || "";
  };

  // Helper to get applicant data
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
  // Helper to get co-authors sorted by display_order and excluding applicant
  const getCoAuthors = () => {
    if (!submission?.submission_users) return [];
    const applicantId =
      submission?.applicant_user_id ||
      getApplicant()?.user_id ||
      getApplicant()?.UserID ||
      getApplicant()?.id;
    return submission.submission_users
      .filter((u) => {
        const isApplicant = u.is_applicant || u.IsApplicant;
        if (isApplicant) return false;
        const userData = u.user || u.User;
        const uid =
          userData?.user_id ||
          userData?.id ||
          u.user_id ||
          u.UserID;
        return uid !== applicantId;
      })
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  };

  useEffect(() => {
    if (submissionId) {
      loadSubmissionDetail();
    }
  }, [submissionId]);

  useEffect(() => {
    if (!submission) {
      setMainAnnouncementDetail(null);
      setRewardAnnouncementDetail(null);
      return;
    }

    const detail =
      submission?.PublicationRewardDetail ||
      submission?.publication_reward_detail ||
      submission?.details?.data?.publication_reward_detail ||
      submission?.details?.data ||
      null;

    if (!detail) {
      setMainAnnouncementDetail(null);
      setRewardAnnouncementDetail(null);
      return;
    }

    const mainId = deriveAnnouncementId(
      detail?.main_annoucement_id,
      detail?.main_announcement_id,
      detail?.main_annoucement,
      detail?.main_announcement,
      detail?.main_annoucement_detail?.id,
      detail?.main_annoucement_detail?.announcement_id,
      detail?.main_announcement_detail?.id,
      detail?.main_announcement_detail?.announcement_id,
    );
    const rewardId = deriveAnnouncementId(
      detail?.reward_announcement_id,
      detail?.reward_announcement,
      detail?.reward_announcement_detail?.id,
      detail?.reward_announcement_detail?.announcement_id,
      detail?.reward_announcement_obj?.id,
      detail?.reward_announcement_obj?.announcement_id,
    );

    if (!mainId && !rewardId) {
      setMainAnnouncementDetail(null);
      setRewardAnnouncementDetail(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        if (mainId) {
          const response = await announcementAPI.getAnnouncement(mainId);
          if (!cancelled) {
            const parsed =
              response?.announcement ||
              response?.data?.announcement ||
              response?.data ||
              response ||
              null;
            setMainAnnouncementDetail(parsed || null);
          }
        } else if (!cancelled) {
          setMainAnnouncementDetail(null);
        }

        if (rewardId) {
          const response = await announcementAPI.getAnnouncement(rewardId);
          if (!cancelled) {
            const parsed =
              response?.announcement ||
              response?.data?.announcement ||
              response?.data ||
              response ||
              null;
            setRewardAnnouncementDetail(parsed || null);
          }
        } else if (!cancelled) {
          setRewardAnnouncementDetail(null);
        }
      } catch (error) {
        console.warn("Unable to load announcement detail", error);
        if (!cancelled) {
          setMainAnnouncementDetail(null);
          setRewardAnnouncementDetail(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [submission]);

  useEffect(() => {
    return () => cleanupMergedUrl();
  }, []);

  useEffect(() => {
    cleanupMergedUrl();
  }, [submissionId]);

  const loadSubmissionDetail = async () => {
    setLoading(true);
    try {
      // โหลด submission detail
      const response = await submissionAPI.getSubmission(submissionId);

       // เริ่มจากข้อมูล submission พื้นฐาน
      let submissionData = response.submission || response;

      // แนบข้อมูลผู้ยื่นคำร้องจาก response หากมี
      const applicant =
        response.applicant ||
        response.applicant_user ||
        submissionData.user ||
        submissionData.User;
      if (applicant) {
        submissionData.applicant = applicant;
        submissionData.user = applicant;
      }
      if (response.applicant_user_id) {
        submissionData.applicant_user_id = response.applicant_user_id;
      }
      
      // นำข้อมูล submission_users จาก response ถ้ามีมาใช้ก่อน
      if (response.submission_users && response.submission_users.length > 0) {
        submissionData.submission_users = response.submission_users;
      }
      
      // ถ้าผู้แต่งที่ได้มายังไม่มีข้อมูล User ให้โหลดแยก
      const needsUserData =
        !submissionData.submission_users ||
        submissionData.submission_users.some((u) => {
          const ud = u.User || u.user;
          if (!ud) return true;
          const idValid = ud.user_id && ud.user_id !== 0;
          const hasName =
            ud.user_fname ||
            ud.user_lname ||
            ud.first_name ||
            ud.last_name ||
            ud.full_name ||
            ud.fullname ||
            ud.name;
          return !idValid || !hasName;
        });

      if (needsUserData) {
        try {
          const usersResponse = await submissionUsersAPI.getUsers(submissionId);
          if (usersResponse && usersResponse.users) {
            submissionData.submission_users = usersResponse.users;
          }
        } catch (error) {
          console.warn('Could not load submission users separately', error);
        }
      }
      
      setSubmission(submissionData);
    } catch (error) {
      console.error('Error loading submission detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (onNavigate) {
      onNavigate(originPage || 'applications');
    }
  };

  const handleEdit = () => {
    // Navigate to edit form
    if (onNavigate) {
      onNavigate('publication-reward-form', { submissionId }, { mode: 'edit' });
    }
  };

  const handleView = async (fileId) => {
    try {
      const token = apiClient.getToken();
      const url = `${apiClient.baseURL}/files/managed/${fileId}/download`;
      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('File not found');
      const blob = await response.blob();
      const fileURL = window.URL.createObjectURL(blob);
      window.open(fileURL, '_blank');
      window.URL.revokeObjectURL(fileURL);
    } catch (error) {
      console.error('Error viewing document:', error);
    }
  };

  const handleDownload = async (fileId, fileName = 'document') => {
    try {
      await apiClient.downloadFile(`/files/managed/${fileId}/download`, fileName);
    } catch (error) {
      console.error('Error downloading document:', error);
    }
  };

  const createMergedUrl = async () => {
    if (!visibleDocuments.length) {
      return null;
    }

    setMerging(true);

    try {
      const pdfCandidates = visibleDocuments.filter((doc) => {
        const name = (doc?.original_name || '').toLowerCase();
        return name.endsWith('.pdf');
      });

      const workingList = (pdfCandidates.length ? pdfCandidates : visibleDocuments).filter(
        (doc) =>
          (doc?.file_id ?? doc?.File?.file_id ?? doc?.file?.file_id ?? doc?.id) != null,
      );

      if (!workingList.length) {
        throw new Error('ไม่มีไฟล์ที่สามารถรวมได้');
      }

      const { blob, skipped } = await mergeAttachmentsToPdf(workingList);
      cleanupMergedUrl();
      const url = URL.createObjectURL(blob);
      mergedUrlRef.current = url;

      if (skipped.length) {
        toast((t) => <span>ข้ามไฟล์ที่ไม่ใช่/เสียหาย {skipped.length} รายการ</span>);
      }

      return url;
    } catch (error) {
      console.error('merge failed', error);
      toast.error(`รวมไฟล์ไม่สำเร็จ: ${error?.message || 'ไม่ทราบสาเหตุ'}`);
      return null;
    } finally {
      setMerging(false);
    }
  };

  const handleViewMerged = async () => {
    const url = mergedUrlRef.current || (await createMergedUrl());
    if (url) {
      window.open(url, '_blank');
    }
  };

  const handleDownloadMerged = async () => {
    const url = mergedUrlRef.current || (await createMergedUrl());
    if (!url) return;

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `merged_documents_${
      submission?.submission_number || submission?.submission_id || ''
    }.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  if (loading) {
    return (
      <PageLayout
        title="รายละเอียดคำร้อง (Submission Details)"
        subtitle="กำลังโหลดข้อมูล... (Loading...)"
        icon={FileText}
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
      <PageLayout
        title="ไม่พบข้อมูล (Data Not Found)"
        subtitle="ไม่พบข้อมูลคำร้องที่ต้องการ (Requested submission not found)"
        icon={AlertCircle}
      >
        <Card collapsible={false}>
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600">ไม่พบข้อมูลคำร้องที่ต้องการ (Requested submission not found)</p>
            <button onClick={handleBack} className="btn btn-primary mt-4">
              กลับไปหน้ารายการ (Back to list)
            </button>
          </div>
        </Card>
      </PageLayout>
    );
  }

  // Extract publication details
  const pubDetail =
    submission.PublicationRewardDetail ||
    submission.publication_reward_detail ||
    {};

  const detail = useMemo(
    () =>
      submission?.publication_reward_detail ||
      submission?.PublicationRewardDetail ||
      submission?.details?.data?.publication_reward_detail ||
      submission?.details?.data ||
      {},
    [submission],
  );

  // Approved amounts may come from different fields depending on API version
  const toNumber = (val) =>
    val !== undefined && val !== null ? Number(val) : null;

  const approvedReward = toNumber(
    pubDetail?.reward_approve_amount ?? pubDetail?.reward_approved_amount,
  );
  const approvedRevision = toNumber(
    pubDetail?.revision_fee_approve_amount ??
      pubDetail?.revision_fee_approved_amount,
  );
  const approvedPublication = toNumber(
    pubDetail?.publication_fee_approve_amount ??
      pubDetail?.publication_fee_approved_amount,
  );

  const approvedTotalRaw =
    pubDetail?.total_approve_amount ??
    pubDetail?.approved_amount ??
    submission.approved_amount ??
    (approvedReward ?? 0) +
      (approvedRevision ?? 0) +
      (approvedPublication ?? 0);

  const approvedTotal = toNumber(approvedTotalRaw);

  const showApprovedColumn =
    submission.status_id === 2 &&
    approvedTotal !== null &&
    !Number.isNaN(approvedTotal);

  const applicant = getApplicant();

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

  const statusCode =
    getCodeById(submission.status_id) ||
    submission.Status?.status_code ||
    submission.status?.status_code;

  const statusName =
    getLabelById(submission.status_id) ||
    submission.Status?.status_name ||
    submission.status?.status_name;

  const subcategoryDisplay = getSubcategoryName(submission, pubDetail);

  const submittedAt =
    submission.submitted_at ??
    pubDetail.submitted_at ??
    submission.submitted_date ??
    null;

  const approvedAt =
    submission.admin_approved_at ??
    submission.head_approved_at ??
    pubDetail.approval_date ??
    submission.approval_date ??
    null;

  const mainAnnouncementId = deriveAnnouncementId(
    pubDetail?.main_annoucement_id,
    pubDetail?.main_announcement_id,
    pubDetail?.main_annoucement,
    pubDetail?.main_announcement,
    pubDetail?.main_annoucement_detail?.id,
    pubDetail?.main_annoucement_detail?.announcement_id,
    pubDetail?.main_announcement_detail?.id,
    pubDetail?.main_announcement_detail?.announcement_id,
  );

  const rewardAnnouncementId = deriveAnnouncementId(
    pubDetail?.reward_announcement_id,
    pubDetail?.reward_announcement,
    pubDetail?.reward_announcement_detail?.id,
    pubDetail?.reward_announcement_detail?.announcement_id,
    pubDetail?.reward_announcement_obj?.id,
    pubDetail?.reward_announcement_obj?.announcement_id,
  );

  const formatAnnouncementId = (value) => {
    const sanitized = sanitizeAnnouncementId(value);
    if (!sanitized) return null;
    return `#${sanitized}`;
  };

  const mainAnnouncementRaw =
    mainAnnouncementDetail ??
    pubDetail?.main_announcement_detail ??
    pubDetail?.main_annoucement_detail ??
    pubDetail?.main_announcement ??
    pubDetail?.main_annoucement ??
    null;

  const rewardAnnouncementRaw =
    rewardAnnouncementDetail ??
    pubDetail?.reward_announcement_detail ??
    pubDetail?.reward_announcement_obj ??
    pubDetail?.reward_announcement ??
    null;

  const mainAnnouncement = resolveAnnouncementInfo(
    mainAnnouncementRaw,
    formatAnnouncementId(mainAnnouncementId),
  );

  const rewardAnnouncement = resolveAnnouncementInfo(
    rewardAnnouncementRaw,
    formatAnnouncementId(rewardAnnouncementId),
  );

  const announceReference =
    pubDetail?.announce_reference_number ??
    submission.announce_reference_number ??
    null;

  const originLabel = originPage === 'received-funds' ? 'ทุนที่เคยได้รับ' : 'คำร้องของฉัน';


  return (
    <PageLayout
      title={`เงินรางวัลตีพิมพ์ #${submission.submission_number}`}
      subtitle="รายละเอียดคำร้องขอเงินรางวัลการตีพิมพ์ผลงานวิชาการ"
      icon={Award}
      actions={
        <div className="flex gap-2">
          <button onClick={handleBack} className="btn btn-secondary">
            <ArrowLeft size={20} />
            กลับ (Back)
          </button>
          {submission.status_id === 5 && ( // Draft status
            <button onClick={handleEdit} className="btn btn-primary">
              <Edit size={20} />
              แก้ไข (Edit)
            </button>
          )}
        </div>
      }
      breadcrumbs={[
        { label: "หน้าแรก", href: "/member" },
        { label: originLabel, href: "#", onClick: handleBack },
        { label: submission.submission_number }
      ]}
    >
      {/* Status Summary Card */}
      <Card
        icon={getColoredStatusIcon(statusCode)}
        collapsible={false}
        headerClassName="items-center"
        className="mb-6"
        title={
          <span className="flex items-center gap-2">
            <span>สถานะคำร้อง (Submission Status)</span>
            <StatusBadge
              statusId={submission.status_id}
              fallbackLabel={statusName}
            />
          </span>
        }
      >
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="flex-1">
            <div className="flex flex-col gap-3 mt-4 text-sm">
              <div className="flex flex-wrap items-start gap-2">
                <span className="text-gray-500 shrink-0 min-w-[80px]">ชื่อทุน:</span>
                <span className="font-bold text-gray-700 break-words flex-1">
                  {subcategoryDisplay}
                </span>
              </div>
              <div className="flex flex-wrap items-start gap-2">
                <span className="text-gray-500 shrink-0 min-w-[80px]">ผู้ขอทุน:</span>
                <span className="font-bold text-gray-700 break-words flex-1">
                  {getUserFullName(applicant)}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 mt-2">
                <div className="flex items-start gap-2">
                  <span className="text-gray-500 shrink-0">เบอร์ติดต่อ:</span>
                  <span className="font-medium break-words">{contactPhone || '-'}</span>
                </div>
                {submission.created_at && (
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 shrink-0">วันที่สร้างคำร้อง:</span>
                    <span className="font-medium">
                      {formatDate(submission.created_at)}
                    </span>
                  </div>
                )}
                {submittedAt && (
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 shrink-0">วันที่ส่งคำร้อง:</span>
                    <span className="font-medium">{formatDate(submittedAt)}</span>
                  </div>
                )}
                {approvedAt && (
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 shrink-0">วันที่อนุมัติ:</span>
                    <span className="font-medium">{formatDate(approvedAt)}</span>
                  </div>
                )}
                {announceReference && (
                  <div className="flex items-start gap-2 lg:col-span-3">
                    <span className="text-gray-500 shrink-0">หมายเลขอ้างอิงประกาศผลการพิจารณา:</span>
                    <span className="font-medium break-all">{announceReference}</span>
                  </div>
                )}
                {mainAnnouncement && (
                  <div className="flex items-start gap-2 lg:col-span-3">
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
                      <span className="text-gray-400">{mainAnnouncement.label || "-"}</span>
                    )}
                  </div>
                )}
                {rewardAnnouncement && (
                  <div className="flex items-start gap-2 lg:col-span-3">
                    <span className="text-gray-500 shrink-0">ประกาศเงินรางวัล:</span>
                    {rewardAnnouncement.href ? (
                      <a
                        href={rewardAnnouncement.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline break-all cursor-pointer pointer-events-auto relative z-10"
                        title={rewardAnnouncement.label}
                      >
                        {rewardAnnouncement.label}
                      </a>
                    ) : (
                      <span className="text-gray-400">{rewardAnnouncement.label || "-"}</span>
                    )}
                  </div>
                )}
                <div className="flex items-start gap-2 lg:col-span-3">
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
              </div>
            </div>
          </div>
          <div className="text-right lg:text-right min-w-[200px]">
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
            รายละเอียดบทความ (Article Details)
          </button>
          <button
            onClick={() => setActiveTab('authors')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'authors'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            ผู้แต่งร่วม (Co-Authors)
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'documents'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            เอกสารแนบ (Attachments)
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            ประวัติการดำเนินการ (Status History)
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Publication Information */}
          <Card title="ข้อมูลบทความ (Article Information)" icon={BookOpen} collapsible={false}>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">ชื่อบทความ (Article Title)</label>
                <p className="font-medium">{pubDetail.paper_title || '-'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">ชื่อวารสาร (Journal Name)</label>
                <p className="font-medium">{pubDetail.journal_name || '-'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">Volume/Issue</label>
                  <p className="font-medium">{pubDetail.volume_issue || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">หน้า (Pages)</label>
                  <p className="font-medium">{pubDetail.page_numbers || '-'}</p>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-500">วันที่ตีพิมพ์ (Publication Date)</label>
                <p className="font-medium">
                  {pubDetail.publication_date 
                    ? new Date(pubDetail.publication_date).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : '-'}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-500">DOI (Digital Object Identifier)</label>
                <p className="font-medium">
                  {pubDetail.doi ? (
                    <a href={`https://doi.org/${pubDetail.doi}`} 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="text-blue-600 hover:underline flex items-center gap-1">
                      {pubDetail.doi}
                      <Link size={14} />
                    </a>
                  ) : '-'}
                </p>
              </div>
            </div>
          </Card>

          {/* Journal Quality */}
          <Card title="ข้อมูลวารสาร (Journal Information)" icon={Award} collapsible={false}>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">ควอร์ไทล์ (Quartile)</label>
                <div className="mt-1">
                  <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium
                    ${pubDetail.quartile === 'Q1' ? 'bg-green-100 text-green-800' :
                      pubDetail.quartile === 'Q2' ? 'bg-blue-100 text-blue-800' :
                      pubDetail.quartile === 'Q3' ? 'bg-yellow-100 text-yellow-800' :
                      pubDetail.quartile === 'Q4' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800'}`}>
                    {pubDetail.quartile || 'N/A'}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-500">Impact Factor</label>
                <p className="font-medium text-lg">{pubDetail.impact_factor || '-'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">ฐานข้อมูลที่ปรากฏ (Database Indexed)</label>
                <p className="font-medium">{pubDetail.indexing || '-'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">ประเภทการตีพิมพ์ (Publication Type)</label>
                <p className="font-medium">{pubDetail.publication_type || 'journal'}</p>
              </div>
            </div>
          </Card>

          {/* Financial Information */}
          <Card title="ข้อมูลการเงิน (Financial Information)" icon={DollarSign} collapsible={false}>
            <div className="space-y-4">
              {/* Column headers */}
              <div
                className={`grid ${showApprovedColumn ? "grid-cols-3" : "grid-cols-2"} pb-2 border-b text-sm text-gray-600`}
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

              {/* Requested reward */}
              <div className={`grid ${showApprovedColumn ? "grid-cols-3" : "grid-cols-2"} items-center`}>
                <label className="block text-sm font-medium text-gray-700">
                  เงินรางวัลที่ขอ
                  <br />
                  <span className="text-xs font-normal text-gray-600">Requested Reward Amount</span>
                </label>
                <span className="text-right font-semibold">
                  {formatCurrency(pubDetail.reward_amount || 0)}
                </span>
                {showApprovedColumn && (
                  <span className="text-right font-semibold">
                    {approvedReward !== null ? formatCurrency(approvedReward) : "-"}
                  </span>
                )}
              </div>

              {/* Revision fee */}
              {pubDetail.revision_fee > 0 && (
                <div className={`grid ${showApprovedColumn ? "grid-cols-3" : "grid-cols-2"} items-center`}>
                  <label className="block text-sm font-medium text-gray-700">
                    ค่าปรับปรุงบทความ
                    <br />
                    <span className="text-xs font-normal text-gray-600">Manuscript Editing Fee (Baht)</span>
                  </label>
                  <span className="text-right">{formatCurrency(pubDetail.revision_fee)}</span>
                  {showApprovedColumn && (
                    <span className="text-right">
                      {approvedRevision !== null ? formatCurrency(approvedRevision) : "-"}
                    </span>
                  )}
                </div>
              )}

              {/* Publication fee */}
              {pubDetail.publication_fee > 0 && (
                <div className={`grid ${showApprovedColumn ? "grid-cols-3" : "grid-cols-2"} items-center`}>
                  <label className="block text-sm font-medium text-gray-700">
                    ค่าธรรมเนียมการตีพิมพ์
                    <br />
                    <span className="text-xs font-normal text-gray-600">Page Charge</span>
                  </label>
                  <span className="text-right">{formatCurrency(pubDetail.publication_fee)}</span>
                  {showApprovedColumn && (
                    <span className="text-right">
                      {approvedPublication !== null ? formatCurrency(approvedPublication) : "-"}
                    </span>
                  )}
                </div>
              )}

              {/* External funding */}
              {pubDetail.external_funding_amount > 0 && (
                <div className={`grid ${showApprovedColumn ? "grid-cols-3" : "grid-cols-2"} items-center`}>
                  <label className="block text-sm font-medium text-gray-700">
                    เงินสนับสนุนจากภายนอก
                    <br />
                    <span className="text-xs font-normal text-gray-600">External Funding Sources</span>
                  </label>
                  <span className="text-right text-red-600">
                    {formatCurrency(-pubDetail.external_funding_amount)}
                  </span>
                  {showApprovedColumn && <span></span>}
                </div>
              )}

              {/* Total */}
              <div
                className={`grid ${showApprovedColumn ? "grid-cols-3" : "grid-cols-2"} items-center pt-2 border-t`}
              >
                <label className="block font-medium text-gray-700">
                  รวมเบิกจากวิทยาลัยการคอม
                  <br />
                  <span className="text-xs font-normal text-gray-600">Total Reimbursement from CP-KKU</span>
                </label>
                <span className="text-right font-bold text-blue-600">
                  {formatCurrency(pubDetail.total_amount || pubDetail.reward_amount || 0)}
                </span>
                {showApprovedColumn && (
                  <span className="text-right font-bold text-green-600">
                    {formatCurrency(approvedTotal)}
                  </span>
                )}
              </div>
            </div>
          </Card>

          {/* Additional Information */}
          <Card title="ข้อมูลเพิ่มเติม (Additional Information)" icon={FileCheck} collapsible={false}>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">สถานะผู้ยื่น (Author Status)</label>
                <p className="font-medium">
                  {pubDetail.author_type === 'first_author' ? 'ผู้แต่งหลัก (First Author)' :
                   pubDetail.author_type === 'corresponding_author' ? 'ผู้แต่งที่รับผิดชอบบทความ (Corresponding Author)' :
                   pubDetail.author_type === 'coauthor' ? 'ผู้แต่งร่วม (Co-Author)' : '-'}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-500">จำนวนผู้แต่ง (Number of Authors)</label>
                <p className="font-medium">{pubDetail.author_count || 1} คน</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">ได้รับทุนสนับสนุนจากมหาวิทยาลัย (Receive funding support from the university)</label>
                <p className="font-medium">
                  {pubDetail.has_university_funding === 'yes' ? 'ใช่' : 'ไม่ใช่'}
                </p>
              </div>
              {pubDetail.funding_references && (
                <div>
                  <label className="text-sm text-gray-500">หมายเลขอ้างอิงทุน (Fund Reference Number)</label>
                  <p className="font-medium">{pubDetail.funding_references}</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

        {/* Authors Tab */}
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
                      <div className="font-medium text-gray-900">
                        {getUserFullName(getApplicant())}
                      </div>
                      <div className="text-sm text-gray-500">
                        {getUserEmail(getApplicant())}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Co-authors */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  รายชื่อผู้แต่งร่วม (Co-Authors) {getCoAuthors().length > 0 && `(${getCoAuthors().length} คน)`}
                </h4>

                {getCoAuthors().length > 0 ? (
                  <div className="space-y-2">
                    {getCoAuthors().map((submissionUser, index) => {
                      const userData = submissionUser.user || submissionUser.User;
                      
                      return (
                        <div key={submissionUser.user_id || index} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-500 w-8">
                              {index + 1}.
                            </span>
                            <div className="flex-1 ml-3">
                              <div className="font-medium text-gray-900">
                                {getUserFullName(userData)}
                              </div>
                              <div className="text-sm text-gray-500">
                                {getUserEmail(userData)}
                              </div>
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
          <div className="space-y-6">
            {visibleDocuments.length > 0 ? (
              <div className="space-y-4">
                {visibleDocuments.map((doc, index) => {
                  const fileId =
                    doc?.file_id ?? doc?.File?.file_id ?? doc?.file?.file_id ?? doc?.id;
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
                            <span className="text-gray-600 font-semibold text-sm">{index + 1}</span>
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
                              <span className="font-medium text-gray-400 truncate" title={fileName}>
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
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  className="inline-flex items-center gap-1 border border-blue-200 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleViewMerged}
                  disabled={visibleDocuments.length === 0 || merging}
                  title="เปิดดูไฟล์แนบที่ถูกรวมเป็น PDF"
                >
                  <Eye size={16} /> ดูไฟล์รวม (PDF)
                </button>
                <button
                  className="inline-flex items-center gap-1 border border-green-200 px-3 py-2 text-sm text-green-600 hover:bg-green-50 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleDownloadMerged}
                  disabled={visibleDocuments.length === 0 || merging}
                  title="ดาวน์โหลดไฟล์แนบที่ถูกรวมเป็น PDF เดียว"
                >
                  <Download size={16} /> ดาวน์โหลดไฟล์รวม
                </button>
              </div>
            )}
          </div>
        </Card>
      )}

      {activeTab === 'history' && (
        <Card title="ประวัติการดำเนินการ (Status History)" icon={Clock} collapsible={false}>
          <div className="space-y-4">
            <div className="flow-root">
              {/* Using positive margin to ensure the timeline container grows with content */}
              <ul className="mb-8">
                {/* Created */}
                <li>
                  <div className="relative pb-8">
                    <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"></span>
                    <div className="relative flex space-x-3">
                      <div>
                        <span className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                          <FileText className="h-4 w-4 text-white" />
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">
                          สร้างคำร้อง
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(submission.created_at).toLocaleString('th-TH')}
                        </p>
                      </div>
                    </div>
                  </div>
                </li>

                {/* Submitted */}
                {submission.submitted_at && (
                  <li>
                    <div className="relative pb-8">
                      <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"></span>
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center">
                            <CheckCircle className="h-4 w-4 text-white" />
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">
                            ส่งคำร้อง
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(submission.submitted_at).toLocaleString('th-TH')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </li>
                )}

                {/* Status updates after submission */}
                {submission.status_id !== 1 && submission.status_id !== 5 && (
                  <li>
                    <div className="relative">
                      <div className="relative flex space-x-3">
                        <div>
                          <span className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            submission.status_id === 2
                              ? 'bg-green-500'
                              : submission.status_id === 3
                              ? 'bg-red-500'
                              : 'bg-orange-500'
                          }`}>
                            {renderStatusIcon(statusCode, "h-4 w-4 text-white")}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">
                            {getLabelById(submission.status_id) || submission.Status?.status_name || 'ไม่ทราบสถานะ'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(approvedAt || submission.updated_at).toLocaleString('th-TH')}
                          </p>
                          {submission.admin_comment && submission.status_id === 2 && (
                            <p className="text-sm text-gray-600 mt-1">
                              หมายเหตุ: {submission.admin_comment}
                            </p>
                          )}
                          {(submission.admin_rejection_reason || submission.head_rejection_reason || pubDetail.reject_reason) &&
                            submission.status_id === 3 && (
                              <p className="text-sm text-gray-600 mt-1">
                                เหตุผลที่ไม่อนุมัติ: {submission.admin_rejection_reason ||
                                  submission.head_rejection_reason ||
                                  pubDetail.reject_reason}
                              </p>
                            )}
                        </div>
                      </div>
                    </div>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </Card>
      )}
    </PageLayout>
  );
}