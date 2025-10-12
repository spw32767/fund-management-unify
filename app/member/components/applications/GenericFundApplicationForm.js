// app/teacher/components/applications/GenericFundApplicationForm.js
"use client";

import { useState, useEffect, useRef } from "react";
import { FileText, Upload, Save, Send, X, Eye, ArrowLeft, AlertCircle, DollarSign } from "lucide-react";
import Swal from "sweetalert2";
import PageLayout from "../common/PageLayout";
import SimpleCard from "../common/SimpleCard";
import { authAPI, systemAPI, documentTypesAPI } from '../../../lib/api';
import { PDFDocument } from "pdf-lib";

// เพิ่ม apiClient สำหรับเรียก API โดยตรง
import apiClient from '../../../lib/api';
import { submissionAPI, documentAPI, fileAPI} from '../../../lib/member_api';
import { statusService } from '../../../lib/status_service';
import { systemConfigAPI } from '../../../lib/system_config_api';

// Match backend utils.StatusCodeDeptHeadPending for initial submission status
const DEPT_HEAD_PENDING_STATUS_CODE = '5';
const DEPT_HEAD_PENDING_STATUS_NAME_HINT = 'อยู่ระหว่างการพิจารณาจากหัวหน้าสาขา';

const DRAFT_KEY = 'generic_fund_application_draft';
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const buildResolvedStatus = (status) => {
  if (!status || typeof status !== 'object') {
    return null;
  }

  const rawId =
    status.application_status_id ?? status.status_id ?? status.id ?? status.raw?.application_status_id;
  if (rawId == null) {
    return null;
  }

  const numericId = Number(rawId);
  if (Number.isNaN(numericId)) {
    return null;
  }

  const resolvedCode =
    status.status_code != null
      ? String(status.status_code)
      : status.code != null
      ? String(status.code)
      : DEPT_HEAD_PENDING_STATUS_CODE;

  const resolvedName =
    String(status.status_name ?? status.name ?? '').trim() || DEPT_HEAD_PENDING_STATUS_NAME_HINT;

  return {
    id: numericId,
    code: resolvedCode,
    name: resolvedName,
    raw: status,
  };
};

const attemptResolveDeptHeadPendingStatus = (statuses) => {
  if (!Array.isArray(statuses)) {
    return null;
  }

  const normalizedStatuses = statuses.filter((status) => status && typeof status === 'object');
  if (normalizedStatuses.length === 0) {
    return null;
  }

  const normalizedCode = String(DEPT_HEAD_PENDING_STATUS_CODE);
  const normalizedNameHint = DEPT_HEAD_PENDING_STATUS_NAME_HINT.trim().toLowerCase();

  const byCode = normalizedStatuses.find((status) => {
    const statusCode = status.status_code ?? status.code;
    return statusCode != null && String(statusCode) === normalizedCode;
  });
  if (byCode) {
    const resolved = buildResolvedStatus(byCode);
    if (resolved) {
      return resolved;
    }
  }

  const byExactName = normalizedStatuses.find((status) => {
    const statusName = String(status.status_name ?? status.name ?? '').trim().toLowerCase();
    return statusName && statusName === normalizedNameHint;
  });
  if (byExactName) {
    const resolved = buildResolvedStatus(byExactName);
    if (resolved) {
      return resolved;
    }
  }

  const byPartialName = normalizedStatuses.find((status) => {
    const statusName = String(status.status_name ?? status.name ?? '').toLowerCase();
    return statusName.includes('หัวหน้าสาขา');
  });
  if (byPartialName) {
    const resolved = buildResolvedStatus(byPartialName);
    if (resolved) {
      return resolved;
    }
  }

  return null;
};

const resolveDeptHeadPendingStatus = async ({ force = false } = {}) => {
  if (!force) {
    try {
      const cachedStatuses = statusService.getCached();
      const cachedResult = attemptResolveDeptHeadPendingStatus(cachedStatuses);
      if (cachedResult) {
        return cachedResult;
      }
    } catch (error) {
      console.warn('Unable to resolve status from cache', error);
    }
  }

  const fetchAttempts = force ? [{ force: true }] : [{}, { force: true }];
  let lastError = null;

  for (const options of fetchAttempts) {
    try {
      const statuses = await statusService.fetchAll(options);
      const resolved = attemptResolveDeptHeadPendingStatus(statuses);
      if (resolved) {
        return resolved;
      }
    } catch (error) {
      lastError = error;
      console.warn('Unable to fetch application statuses', error);
    }
  }

  const resolutionError = new Error('ไม่พบสถานะสำหรับการพิจารณาของหัวหน้าสาขา');
  if (lastError) {
    resolutionError.cause = lastError;
  }
  throw resolutionError;
};

const resolveFundTypeMode = (doc) => {
  if (!doc || typeof doc !== 'object') return 'inactive';
  if (typeof doc.fund_type_mode === 'string') {
    const trimmed = doc.fund_type_mode.trim();
    if (trimmed) return trimmed;
  }

  if (
    Object.prototype.hasOwnProperty.call(doc, 'fund_types') &&
    doc.fund_types === null
  ) {
    return 'inactive';
  }

  const fundTypes = Array.isArray(doc?.fund_types) ? doc.fund_types : [];
  return fundTypes.length === 0 ? 'all' : 'limited';
};

const dedupeStringList = (items) => {
  const list = Array.isArray(items)
    ? items
    : typeof items === 'string'
    ? [items]
    : [];

  const seen = new Set();
  const result = [];

  list.forEach((value) => {
    if (typeof value !== 'string') return;
    const trimmed = value.trim();
    if (!trimmed) return;
    const lower = trimmed.toLowerCase();
    if (seen.has(lower)) return;
    seen.add(lower);
    result.push(trimmed);
  });

  return result;
};

const buildApplicantDisplayName = (user) => {
  if (!user || typeof user !== 'object') {
    return '';
  }

  const prefix =
    user.prefix ||
    user.prefix_name ||
    user.title ||
    user.user_title ||
    '';

  const firstName = user.user_fname || user.first_name || '';
  const lastName = user.user_lname || user.last_name || '';

  return [prefix, firstName, lastName]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(' ')
    .trim();
};

const saveDraftToLocal = (formData) => {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const payload = {
      formData: {
        project_title: formData?.project_title || '',
        project_description: formData?.project_description || '',
        requested_amount: formData?.requested_amount || '',
        phone: formData?.phone || '',
      },
      savedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + DRAFT_TTL_MS).toISOString(),
    };

    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    return true;
  } catch (error) {
    console.error('Error saving generic fund draft to localStorage:', error);
    return false;
  }
};

const loadDraftFromLocal = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const draftString = window.localStorage.getItem(DRAFT_KEY);
    if (!draftString) {
      return null;
    }

    const draft = JSON.parse(draftString);
    if (draft?.expiresAt && new Date(draft.expiresAt) < new Date()) {
      window.localStorage.removeItem(DRAFT_KEY);
      return null;
    }

    return draft;
  } catch (error) {
    console.error('Error loading generic fund draft from localStorage:', error);
    return null;
  }
};

const deleteDraftFromLocal = () => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch (error) {
    console.error('Error deleting generic fund draft from localStorage:', error);
  }
};

// =================================================================
// FILE UPLOAD COMPONENT
// =================================================================
function FileUpload({ onFileSelect, accept, multiple = false, error, compact = false }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    
    // Filter files by accept type
    const acceptedFiles = files.filter(file => {
      if (accept === ".pdf") return file.type === "application/pdf";
      return true;
    });

    if (acceptedFiles.length !== files.length) {
      Swal.fire({
        icon: 'warning',
        title: 'ไฟล์ไม่ถูกต้อง',
        text: 'กรุณาอัปโหลดเฉพาะไฟล์ PDF',
        confirmButtonColor: '#3085d6'
      });
    }

    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles);
    }
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) {
      return;
    }

    const acceptedFiles = files.filter(file => {
      if (accept === ".pdf") return file.type === "application/pdf";
      return true;
    });

    if (acceptedFiles.length !== files.length) {
      Swal.fire({
        icon: 'warning',
        title: 'ไฟล์ไม่ถูกต้อง',
        text: 'กรุณาอัปโหลดเฉพาะไฟล์ PDF',
        confirmButtonColor: '#3085d6'
      });
    }

    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles);
    }
  };

  return (
    <div className="space-y-1">
      <div
        className={`border-2 border-dashed rounded-lg ${compact ? "p-2" : "p-6"} text-center cursor-pointer transition-colors ${
          isDragging
            ? "border-blue-400 bg-blue-50"
            : error
            ? "border-red-400 bg-red-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload
          className={`mx-auto mb-2 ${compact ? "h-5 w-5" : "h-8 w-8"} ${error ? "text-red-400" : "text-gray-400"}`}
        />
        <p
          className={`${compact ? "text-xs" : "text-sm"} ${error ? "text-red-600" : "text-gray-600"}`}
        >
          {compact ? "แนบไฟล์ (PDF)" : "คลิกหรือลากไฟล์มาวางที่นี่ (เฉพาะไฟล์ PDF)"}
        </p>
        {!compact && (
          <p className="text-xs text-gray-500 mt-1">ขนาดไฟล์สูงสุด 10MB</p>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInput}
          className="hidden"
        />
      </div>
      {error && (
        <p className="text-red-500 text-sm flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}
    </div>
  );
}

// Phone number formatting helper
const formatPhoneNumber = (value) => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
  return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
};

const formatCurrency = (value) => {
  const num = parseFloat(value);
  if (Number.isNaN(num)) {
    return "0.00";
  }
  return num.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatFileSize = (bytes) => {
  if (!bytes && bytes !== 0) return "-";
  if (bytes === 0) return "0 B";
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 2)} ${sizes[i]}`;
};

// =================================================================
// MAIN COMPONENT
// =================================================================
export default function GenericFundApplicationForm({ onNavigate, subcategoryData }) {
  // =================================================================
  // STATE MANAGEMENT
  // =================================================================
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Form data
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    project_title: "",
    project_description: "",
    requested_amount: "",
  });
  
  // Document requirements and uploaded files
  const [documentRequirements, setDocumentRequirements] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [attachmentsPreviewState, setAttachmentsPreviewState] = useState({
    loading: false,
    error: null,
    hasPreviewed: false
  });
  const attachmentsPreviewUrlRef = useRef(null);

  // Current user data
  const [currentUser, setCurrentUser] = useState(null);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [announcementLock, setAnnouncementLock] = useState({
    main_annoucement: null,
    activity_support_announcement: null,
  });
  const [hasDraft, setHasDraft] = useState(false);

  // =================================================================
  // INITIAL DATA LOADING
  // =================================================================
  useEffect(() => {
    loadInitialData();
  }, [subcategoryData]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setErrors({});
      setPendingStatus(null);

      // Load user data and document requirements in parallel
      const [userData, docRequirements, statusInfo] = await Promise.all([
        loadUserData(),
        loadDocumentRequirements(),
        resolveDeptHeadPendingStatus(),
      ]);

      await loadSystemAnnouncements();

      if (typeof window !== 'undefined') {
        const draft = loadDraftFromLocal();
        if (draft?.formData) {
          setFormData(prev => ({
            ...prev,
            ...draft.formData,
          }));
          setHasDraft(true);
        } else {
          setHasDraft(false);
        }
      }

      console.log('Loaded user data:', userData);
      console.log('Loaded document requirements:', docRequirements);
      console.log('Resolved pending status:', statusInfo);

      setPendingStatus(statusInfo);

    } catch (error) {
      console.error('Error loading initial data:', error);
      setErrors({ general: error.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล' });
      setPendingStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = async () => {
    try {
      // Try to get user from API first
      const profileResponse = await authAPI.getProfile();
      if (profileResponse?.user) {
        setCurrentUser(profileResponse.user);
        setFormData(prev => ({
          ...prev,
          name: buildApplicantDisplayName(profileResponse.user)
        }));
        return profileResponse.user;
      }
    } catch (error) {
      console.warn('Could not fetch profile from API:', error);
    }

    // Fallback to localStorage
    const storedUser = authAPI.getCurrentUser();
    if (storedUser) {
      setCurrentUser(storedUser);
      setFormData(prev => ({
        ...prev,
        name: buildApplicantDisplayName(storedUser)
      }));
      return storedUser;
    }

    throw new Error('ไม่สามารถดึงข้อมูลผู้ใช้ได้');
  };

  const loadDocumentRequirements = async () => {
    const normalizePayload = (payload) => {
      if (!payload) return [];
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload.document_types)) return payload.document_types;
      return [];
    };

    const response = await documentTypesAPI.getDocumentTypes({ fund_type: 'fund_application' });
    const rawDocTypes = normalizePayload(response);

    if (!Array.isArray(rawDocTypes) || rawDocTypes.length === 0) {
      console.warn('No document types returned for fund_application.');
      setDocumentRequirements([]);
      return [];
    }

    const sortedDocTypes = rawDocTypes
      .slice()
      .sort((a, b) => (a?.document_order || 0) - (b?.document_order || 0));

    const activeDocs = sortedDocTypes.filter((docType) => {
      if (!docType) return false;
      const mode = resolveFundTypeMode(docType);
      if (mode === 'inactive') {
        return false;
      }
      if (mode === 'all') {
        return true;
      }
      const fundTypes = Array.isArray(docType.fund_types) ? docType.fund_types : [];
      return fundTypes.some((entry) => entry === 'fund_application');
    });

    const finalDocs = activeDocs.length > 0 ? activeDocs : sortedDocTypes.filter((doc) => resolveFundTypeMode(doc) !== 'inactive');

    setDocumentRequirements(finalDocs);
    return finalDocs;
  };

  const loadSystemAnnouncements = async () => {
    try {
      const rawWindow = await systemConfigAPI.getWindow();
      const root = rawWindow?.data ?? rawWindow ?? {};

      const normalized = {
        main_annoucement: root?.main_annoucement ?? null,
        activity_support_announcement: root?.activity_support_announcement ?? null,
      };

      console.log('System announcement snapshot resolved:', normalized);

      setAnnouncementLock(normalized);
      return normalized;
    } catch (error) {
      console.warn('Cannot fetch system-config window for announcements', error);
      const fallback = { main_annoucement: null, activity_support_announcement: null };
      setAnnouncementLock(fallback);
      return fallback;
    }
  };

  // =================================================================
  // FORM HANDLING
  // =================================================================
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  useEffect(() => {
    return () => {
      if (attachmentsPreviewUrlRef.current) {
        try {
          URL.revokeObjectURL(attachmentsPreviewUrlRef.current);
        } catch (error) {
          console.warn('Failed to revoke attachments preview URL on unmount:', error);
        }
      }
    };
  }, []);

  const resetAttachmentsPreview = () => {
    if (attachmentsPreviewUrlRef.current) {
      try {
        URL.revokeObjectURL(attachmentsPreviewUrlRef.current);
      } catch (error) {
        console.warn('Failed to revoke attachments preview URL:', error);
      }
      attachmentsPreviewUrlRef.current = null;
    }

    setAttachmentsPreviewState({
      loading: false,
      error: null,
      hasPreviewed: false
    });
  };

  const handleFileUpload = (documentTypeId, files) => {
    if (files && files.length > 0) {
      const file = files[0];
      
      // Validate file type
      if (file.type !== 'application/pdf') {
        setErrors(prev => ({ 
          ...prev, 
          [`file_${documentTypeId}`]: 'กรุณาอัปโหลดไฟล์ PDF เท่านั้น' 
        }));
        return;
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setErrors(prev => ({ 
          ...prev, 
          [`file_${documentTypeId}`]: 'ขนาดไฟล์ต้องไม่เกิน 10MB' 
        }));
        return;
      }

      setUploadedFiles(prev => ({
        ...prev,
        [documentTypeId]: file
      }));

      resetAttachmentsPreview();

      // Clear error
      if (errors[`file_${documentTypeId}`]) {
        setErrors(prev => ({ ...prev, [`file_${documentTypeId}`]: '' }));
      }
    }
  };

  const handleRemoveFile = (documentTypeId) => {
    setUploadedFiles(prev => {
      const newFiles = { ...prev };
      delete newFiles[documentTypeId];
      return newFiles;
    });

    resetAttachmentsPreview();
  };

  const viewFile = (documentTypeId) => {
    const file = uploadedFiles[documentTypeId];
    if (file) {
      const fileURL = URL.createObjectURL(file);
      const viewer = window.open(fileURL, '_blank', 'noopener,noreferrer');
      if (viewer) {
        viewer.onload = () => {
          try {
            URL.revokeObjectURL(fileURL);
          } catch (error) {
            console.warn('Failed to revoke object URL:', error);
          }
        };
      } else {
        setTimeout(() => {
          try {
            URL.revokeObjectURL(fileURL);
          } catch (error) {
            console.warn('Failed to revoke object URL:', error);
          }
        }, 10000);
      }
    }
  };

  const buildCurrentAttachments = () => (
    documentRequirements
      .filter(docType => uploadedFiles[docType.document_type_id])
      .map(docType => {
        const file = uploadedFiles[docType.document_type_id];
        return {
          id: docType.document_type_id,
          name: file.name,
          size: file.size,
          typeLabel: docType.document_type_name,
          required: docType.required,
          file
        };
      })
  );

  const generateAttachmentsPreview = async ({ openWindow = false, attachments: attachmentsOverride } = {}) => {
    const attachments = attachmentsOverride ?? buildCurrentAttachments();

    if (!attachments || attachments.length === 0) {
      const message = 'กรุณาแนบไฟล์อย่างน้อย 1 ไฟล์ก่อนดูตัวอย่าง';
      setAttachmentsPreviewState({ loading: false, error: message, hasPreviewed: false });
      throw new Error(message);
    }

    setAttachmentsPreviewState({ loading: true, error: null, hasPreviewed: false });

    try {
      const mergedPdf = await PDFDocument.create();

      for (const attachment of attachments) {
        const file = attachment.file;

        if (!file) {
          throw new Error('ไม่พบข้อมูลไฟล์แนบ');
        }

        if (file.type !== 'application/pdf') {
          throw new Error('สามารถรวมได้เฉพาะไฟล์ PDF เท่านั้น');
        }

        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        copiedPages.forEach(page => mergedPdf.addPage(page));
      }

      if (mergedPdf.getPageCount() === 0) {
        throw new Error('ไม่พบหน้าที่จะรวม');
      }

      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([mergedBytes], { type: 'application/pdf' });

      if (attachmentsPreviewUrlRef.current) {
        try {
          URL.revokeObjectURL(attachmentsPreviewUrlRef.current);
        } catch (error) {
          console.warn('Failed to revoke previous attachments preview URL:', error);
        }
      }

      const blobUrl = URL.createObjectURL(blob);
      attachmentsPreviewUrlRef.current = blobUrl;

      setAttachmentsPreviewState({ loading: false, error: null, hasPreviewed: true });

      if (openWindow && typeof window !== 'undefined') {
        const previewWindow = window.open(blobUrl, '_blank', 'noopener,noreferrer');
        if (!previewWindow) {
          setTimeout(() => {
            try {
              URL.revokeObjectURL(blobUrl);
              if (attachmentsPreviewUrlRef.current === blobUrl) {
                attachmentsPreviewUrlRef.current = null;
              }
            } catch (error) {
              console.warn('Failed to revoke attachments preview URL after popup block:', error);
            }
          }, 10000);
        }
      }

      return blobUrl;
    } catch (error) {
      const message = error?.message || 'ไม่สามารถรวมไฟล์แนบได้';
      setAttachmentsPreviewState({ loading: false, error: message, hasPreviewed: false });
      throw new Error(message);
    }
  };

  const showSubmissionConfirmation = async () => {
    const attachments = buildCurrentAttachments();
    let previewViewed = attachmentsPreviewState.hasPreviewed;

    const applicantInfoHTML = `
      <div class="bg-gray-50 p-4 rounded-lg space-y-2">
        <h4 class="font-semibold text-gray-700">ข้อมูลผู้ยื่นขอ</h4>
        <p class="text-sm"><span class="font-medium">ชื่อผู้ยื่น:</span> ${formData.name || '-'}</p>
        <p class="text-sm"><span class="font-medium">เบอร์โทรศัพท์:</span> ${formData.phone || '-'}</p>
      </div>
    `;

    const projectInfoHTML = `
      <div class="bg-blue-50 p-4 rounded-lg space-y-2">
        <h4 class="font-semibold text-blue-700">ข้อมูลโครงการ</h4>
        <p class="text-sm"><span class="font-medium">ชื่อโครงการ:</span> ${formData.project_title || '-'}</p>
        <p class="text-sm leading-relaxed"><span class="font-medium">รายละเอียดโดยย่อ:</span> ${formData.project_description || '-'}</p>
      </div>
    `;

    const amountHTML = `
      <div class="bg-green-50 p-4 rounded-lg space-y-2">
        <h4 class="font-semibold text-green-700">จำนวนเงินที่ขอ</h4>
        <p class="text-sm"><span class="font-medium">จำนวนเงิน:</span> ${formatCurrency(formData.requested_amount || 0)} บาท</p>
      </div>
    `;

    const attachmentsHTML = attachments.length === 0
      ? `
        <div class="bg-yellow-50 p-4 rounded-lg">
          <h4 class="font-semibold text-yellow-700 mb-2">เอกสารแนบ</h4>
          <p class="text-sm text-yellow-800">ไม่มีไฟล์แนบ</p>
        </div>
      `
      : `
        <div class="bg-yellow-50 p-4 rounded-lg space-y-3">
          <div class="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h4 class="font-semibold text-yellow-700">เอกสารแนบ (${attachments.length} ไฟล์)</h4>
              <p class="text-xs text-yellow-800">กรุณาดูตัวอย่างเอกสารรวมก่อนยืนยันส่งคำร้อง</p>
            </div>
            <button
              id="attachments-preview-btn"
              type="button"
              class="${attachmentsPreviewState.hasPreviewed
                ? 'px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors'
                : 'px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors'}"
            >${attachmentsPreviewState.hasPreviewed ? '✅ ดูแล้ว' : '👀 ดูตัวอย่างเอกสารรวม'}</button>
          </div>
          <div class="bg-white border border-yellow-200 rounded-lg overflow-hidden">
            <table class="w-full text-sm">
              <thead class="bg-yellow-100">
                <tr>
                  <th class="px-3 py-2 text-left font-medium text-yellow-800">ประเภทเอกสาร</th>
                  <th class="px-3 py-2 text-left font-medium text-yellow-800">ไฟล์</th>
                </tr>
              </thead>
              <tbody class="divide-y">
                ${attachments.map(item => `
                  <tr>
                    <td class="px-3 py-2 align-top">
                      <div class="font-medium text-gray-800">${item.typeLabel}</div>
                      ${item.required ? '<div class="text-xs text-red-500">เอกสารจำเป็น</div>' : ''}
                    </td>
                    <td class="px-3 py-2 align-top">
                      <div class="font-medium text-gray-800">${item.name}</div>
                      <div class="text-xs text-gray-500">${formatFileSize(item.size)}</div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div id="attachments-preview-status" class="text-xs ${attachmentsPreviewState.hasPreviewed ? 'text-green-700' : 'text-yellow-800'}">
            ${attachmentsPreviewState.hasPreviewed ? '✅ ดูตัวอย่างเอกสารแล้ว' : '⚠️ ยังไม่ได้ดูตัวอย่างเอกสารรวม'}
          </div>
        </div>
      `;

    const summaryHTML = `
      <div class="space-y-4 text-left">
        ${applicantInfoHTML}
        ${projectInfoHTML}
        ${amountHTML}
        ${attachmentsHTML}
      </div>
    `;

    const showDialog = () => {
      return Swal.fire({
        title: 'ตรวจสอบข้อมูลก่อนส่งคำร้อง',
        html: summaryHTML,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'ยืนยันส่งคำร้อง',
        cancelButtonText: 'ยกเลิก',
        width: '640px',
        customClass: {
          htmlContainer: 'text-left'
        },
        preConfirm: () => {
          if (attachments.length > 0 && !previewViewed) {
            Swal.showValidationMessage('กรุณาดูตัวอย่างเอกสารรวมก่อนส่งคำร้อง');
            return false;
          }
          return true;
        },
        didOpen: () => {
          const previewBtn = Swal.getHtmlContainer()?.querySelector('#attachments-preview-btn');
          const previewStatus = Swal.getHtmlContainer()?.querySelector('#attachments-preview-status');

          if (previewBtn) {
            const originalLabel = previewBtn.innerHTML;
            const originalClass = previewBtn.className;

            previewBtn.addEventListener('click', async () => {
              previewBtn.disabled = true;
              previewBtn.innerHTML = '⏳ กำลังรวมไฟล์...';
              previewBtn.className = originalClass;

              try {
                await generateAttachmentsPreview({ openWindow: true, attachments });
                previewViewed = true;

                if (previewStatus) {
                  previewStatus.innerHTML = '<span class="text-green-600">✅ ดูตัวอย่างเอกสารแล้ว</span>';
                  previewStatus.className = 'text-xs text-green-600';
                }

                previewBtn.className = 'px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors';
                previewBtn.innerHTML = '✅ ดูแล้ว';

                const validationMessage = Swal.getHtmlContainer()?.querySelector('.swal2-validation-message');
                if (validationMessage) {
                  validationMessage.style.display = 'none';
                }
              } catch (error) {
                const message = error?.message || 'ไม่สามารถเปิดตัวอย่างได้';
                if (previewStatus) {
                  previewStatus.innerHTML = `<span class="text-red-600">❌ ${message}</span>`;
                  previewStatus.className = 'text-xs text-red-600';
                }
                previewBtn.className = originalClass;
                previewBtn.innerHTML = originalLabel;
              } finally {
                previewBtn.disabled = false;
              }
            });
          }
        }
      });
    };

    const result = await showDialog();
    return result.isConfirmed;
  };

  // =================================================================
  // FORM VALIDATION
  // =================================================================
  const validateForm = () => {
    const newErrors = {};

    // Validate phone format when provided (XXX-XXX-XXXX)
    if (formData.phone.trim()) {
      const phoneRegex = /^\d{3}-\d{3}-\d{4}$/;
      if (!phoneRegex.test(formData.phone)) {
        newErrors.phone = 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง (XXX-XXX-XXXX)';
      }
    }

    if (!formData.requested_amount || isNaN(parseFloat(formData.requested_amount)) || parseFloat(formData.requested_amount) <= 0) {
      newErrors.requested_amount = 'กรุณาระบุจำนวนเงินที่ขอ';
    }

    // Validate required documents
    documentRequirements.forEach(docType => {
      if (docType.required && !uploadedFiles[docType.document_type_id]) {
        newErrors[`file_${docType.document_type_id}`] = `กรุณาแนบ${docType.document_type_name}`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // =================================================================
  // FORM SUBMISSION
  // =================================================================
  const saveDraft = async () => {
    try {
      setSaving(true);
      Swal.fire({
        title: 'กำลังบันทึกร่าง...',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      await new Promise(resolve => setTimeout(resolve, 300));

      const saved = saveDraftToLocal(formData);

      Swal.close();

      if (saved) {
        setHasDraft(true);
        Swal.fire({
          icon: 'success',
          title: 'บันทึกร่างเรียบร้อยแล้ว',
          text: 'ข้อมูลข้อความจะถูกเก็บไว้ชั่วคราว 7 วัน',
          confirmButtonColor: '#3085d6'
        });
      } else {
        throw new Error('ไม่สามารถบันทึกร่างได้');
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      Swal.close();
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: error?.message || 'ไม่สามารถบันทึกร่างได้ โปรดลองอีกครั้ง',
        confirmButtonColor: '#d33'
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteDraft = async () => {
    const result = await Swal.fire({
      title: 'ยืนยันการลบร่าง?',
      text: 'ข้อมูลร่างทั้งหมดจะถูกลบและไม่สามารถกู้คืนได้',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'ลบร่าง',
      cancelButtonText: 'ยกเลิก'
    });

    if (!result.isConfirmed) {
      return;
    }

    deleteDraftFromLocal();
    setFormData(prev => ({
      ...prev,
      phone: '',
      project_title: '',
      project_description: '',
      requested_amount: '',
    }));
    setErrors(prev => ({ ...prev, phone: '', project_title: '', project_description: '', requested_amount: '' }));
    setHasDraft(false);

    Swal.fire({
      icon: 'success',
      title: 'ลบร่างเรียบร้อยแล้ว',
      confirmButtonColor: '#3085d6'
    });
  };

  const submitApplication = async () => {
    if (submitting) {
      return;
    }

    const isValid = validateForm();
    if (!isValid) {
      return;
    }

    const confirmed = await showSubmissionConfirmation();
    if (!confirmed) {
      return;
    }

    try {
      setSubmitting(true);

      let statusForSubmission = pendingStatus;
      if (!statusForSubmission?.id) {
        statusForSubmission = await resolveDeptHeadPendingStatus({ force: true });
        setPendingStatus(statusForSubmission);
      }

      if (!statusForSubmission?.id) {
        throw new Error('ไม่พบสถานะสำหรับการพิจารณาของหัวหน้าสาขา');
      }

      // Step 1: Create submission record
      const submissionPayload = {
        submission_type: 'fund_application',
        year_id: subcategoryData?.year_id,
        status_id: statusForSubmission.id,
      };

      console.log('Creating submission with payload:', submissionPayload, 'resolved status:', statusForSubmission);

      const submissionRes = await submissionAPI.createSubmission(submissionPayload);
      const submissionId = submissionRes?.submission?.submission_id;

      console.log('Submission creation response:', submissionRes);

      // Step 2: Save basic fund details (ใช้ข้อมูลที่มีอยู่)
      if (submissionId) {
        const fundDetailsPayload = {
          project_title: formData.project_title || '',
          project_description: formData.project_description || '',
          requested_amount: parseFloat(formData.requested_amount) || 0,
          subcategory_id: subcategoryData.subcategory_id,
          main_annoucement: announcementLock.main_annoucement,
          activity_support_announcement: announcementLock.activity_support_announcement,
        };

        console.log('Saving fund details payload:', fundDetailsPayload);

        await apiClient.post(`/submissions/${submissionId}/fund-details`, fundDetailsPayload);
      }

      // Step 3: Upload files and attach to submission
      const uploadPromises = Object.entries(uploadedFiles).map(async ([docTypeId, file], index) => {
        const uploadRes = await fileAPI.uploadFile(file);
        const originalName = uploadRes?.file?.original_name ?? file.name ?? '';
        return documentAPI.attachDocument(submissionId, {
          file_id: uploadRes?.file?.file_id,
          document_type_id: parseInt(docTypeId),
          description: file.name,
          display_order: index + 1,
          original_name: originalName
        });
      });
      await Promise.all(uploadPromises);

      // Step 4: Submit the submission
      if (submissionId) {
        console.log('Submitting submission ID:', submissionId);
        await submissionAPI.submitSubmission(submissionId);
      }



      deleteDraftFromLocal();
      setHasDraft(false);

      await Swal.fire({
        icon: 'success',
        title: 'ส่งคำร้องสำเร็จ',
        text: 'ระบบได้บันทึกคำร้องของคุณเรียบร้อยแล้ว',
        confirmButtonColor: '#3085d6'
      });

      // Navigate back to research fund page
      if (onNavigate) {
        onNavigate('research-fund');
      }

    } catch (error) {
      console.error('Error submitting application:', error);
      setErrors({ general: error?.message || 'เกิดข้อผิดพลาดในการส่งคำร้อง' });
      Swal.fire({
        icon: 'error',
        title: 'ส่งคำร้องไม่สำเร็จ',
        text: error?.message || 'เกิดข้อผิดพลาดในการส่งคำร้อง กรุณาลองใหม่อีกครั้ง',
        confirmButtonColor: '#d33'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // =================================================================
  // RENDER FUNCTIONS
  // =================================================================
  const handleBack = () => {
    if (onNavigate) {
      onNavigate('research-fund');
    }
  };

  if (loading) {
    return (
      <PageLayout title="กำลังโหลด..." icon={FileText}>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (errors.general) {
    return (
      <PageLayout title="เกิดข้อผิดพลาด" icon={AlertCircle}>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">เกิดข้อผิดพลาด</h3>
          <p className="text-gray-600 mb-6">{errors.general}</p>
          <div className="flex gap-4">
            <button
              onClick={() => loadInitialData()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              ลองใหม่
            </button>
            <button
              onClick={handleBack}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              กลับ
            </button>
          </div>
        </div>
      </PageLayout>
    );
  }

  const pageTitle = `ยื่นขอ${subcategoryData?.subcategory_name || 'ทุน'}`;
  const pageSubtitle = 'กรุณากรอกข้อมูลให้ครบถ้วนก่อนส่งคำร้องเพื่อเข้าสู่การพิจารณา';
  const breadcrumbs = [
    { label: 'หน้าแรก', href: '/member' },
    { label: 'ทุนวิจัย', href: '/member?tab=research-fund' },
    { label: subcategoryData?.subcategory_name || 'ยื่นคำร้อง' }
  ];
  const pendingStatusName = pendingStatus?.name || 'กำลังโหลดสถานะ...';
  const pendingStatusCode = pendingStatus?.code ?? '—';
  const formattedRequestedAmount = formatCurrency(formData.requested_amount || 0);
  const requiredDocumentCount = documentRequirements.filter((doc) => doc.required).length;

  return (
    <PageLayout
      title={pageTitle}
      subtitle={pageSubtitle}
      icon={FileText}
      actions={(
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-600 transition-colors hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>ย้อนกลับ</span>
        </button>
      )}
      breadcrumbs={breadcrumbs}
    >
      <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>
        {errors.general && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-semibold">ไม่สามารถดำเนินการได้</p>
                <p className="mt-1 leading-relaxed">{errors.general}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-1">
          <div className="space-y-6">
            <SimpleCard
              title="ข้อมูลพื้นฐาน"
              icon={FileText}
              bodyClassName="space-y-6"
            >


              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700" htmlFor="applicant-name">
                    ชื่อผู้ยื่นขอ
                  </label>
                  <input
                    id="applicant-name"
                    type="text"
                    value={formData.name}
                    readOnly
                    className="w-full rounded-lg border border-gray-200 bg-gray-100 px-4 py-2.5 text-gray-700 shadow-sm"
                    placeholder="ชื่อ-นามสกุล"
                  />
                  <p className="text-xs text-gray-500">ระบบจะแสดงคำนำหน้าและชื่อ-นามสกุลจากข้อมูลผู้ใช้โดยอัตโนมัติ</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700" htmlFor="applicant-phone">
                    เบอร์โทรศัพท์
                  </label>
                  <input
                    id="applicant-phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', formatPhoneNumber(e.target.value))}
                    placeholder="081-234-5678"
                    maxLength={12}
                    className={`w-full rounded-lg border px-4 py-2.5 text-gray-700 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                      errors.phone ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-gray-300'
                    }`}
                  />
                  {errors.phone ? (
                    <p className="flex items-center gap-1 text-sm text-red-500">
                      <AlertCircle className="h-4 w-4" />
                      {errors.phone}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500">รูปแบบที่แนะนำ: XXX-XXX-XXXX (ข้อมูลนี้ใช้สำหรับติดต่อกลับเท่านั้น)</p>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-gray-700" htmlFor="project-title">
                    ชื่อโครงการ/กิจกรรม
                  </label>
                  <input
                    id="project-title"
                    type="text"
                    value={formData.project_title}
                    onChange={(e) => handleInputChange('project_title', e.target.value)}
                    placeholder="ระบุชื่อโครงการหรือกิจกรรมที่ต้องการขอรับการสนับสนุน"
                    className={`w-full rounded-lg border px-4 py-2.5 text-gray-700 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                      errors.project_title ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-gray-300'
                    }`}
                  />
                  {errors.project_title ? (
                    <p className="flex items-center gap-1 text-sm text-red-500">
                      <AlertCircle className="h-4 w-4" />
                      {errors.project_title}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500">ข้อมูลนี้จะถูกส่งไปยังระบบในช่อง Project Title</p>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-gray-700" htmlFor="project-description">
                    รายละเอียดโครงการโดยย่อ
                  </label>
                  <textarea
                    id="project-description"
                    value={formData.project_description}
                    onChange={(e) => handleInputChange('project_description', e.target.value)}
                    placeholder="อธิบายวัตถุประสงค์หรือรายละเอียดสำคัญของโครงการ"
                    rows={4}
                    className={`w-full rounded-lg border px-4 py-3 text-gray-700 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                      errors.project_description ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-gray-300'
                    }`}
                  />
                  {errors.project_description ? (
                    <p className="flex items-center gap-1 text-sm text-red-500">
                      <AlertCircle className="h-4 w-4" />
                      {errors.project_description}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500">ใช้สำหรับบันทึกข้อมูลลงในช่อง Project Description</p>
                  )}
                </div>
              </div>
            </SimpleCard>

            <SimpleCard
              title="รวมจำนวนทุนที่ขอ (Total Request Amount)"
              icon={DollarSign}
              bodyClassName="space-y-4"
            >
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_200px] md:items-end">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700" htmlFor="requested-amount">
                    จำนวนเงินที่ขอ (บาท)
                  </label>
                  <input
                    id="requested-amount"
                    type="number"
                    min="0"
                    value={formData.requested_amount}
                    onChange={(e) => handleInputChange('requested_amount', e.target.value)}
                    placeholder="0.00"
                    className={`w-full rounded-lg border bg-gray-50 px-4 py-3 text-2xl font-semibold text-gray-800 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                      errors.requested_amount ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-gray-200'
                    }`}
                  />
                  {errors.requested_amount ? (
                    <p className="flex items-center gap-1 text-sm text-red-500">
                      <AlertCircle className="h-4 w-4" />
                      {errors.requested_amount}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500">กรอกตัวเลขจำนวนเต็มหรือทศนิยมได้ เช่น 50000 หรือ 50000.00</p>
                  )}
                </div>

                <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-center shadow-sm">
                  <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">ยอดคำขอปัจจุบัน</p>
                  <p className="mt-2 text-2xl font-bold text-blue-700">{formattedRequestedAmount} บาท</p>
                </div>
              </div>
            </SimpleCard>

            <SimpleCard
              title="เอกสารแนบ (Attachments)"
              icon={Upload}
              bodyClassName="space-y-4"
            >
              {documentRequirements.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 py-10 text-center text-gray-500">
                  <Upload className="mb-3 h-10 w-10 text-gray-400" />
                  <p className="text-sm font-medium">ไม่มีเอกสารที่ต้องส่งสำหรับทุนนี้</p>
                  <p className="mt-1 text-xs text-gray-400">คุณสามารถส่งคำร้องได้ทันทีเมื่อกรอกข้อมูลครบถ้วน</p>
                </div>
              ) : (
                <>
                  <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="w-16 px-3 py-2 text-center font-medium text-gray-600">ลำดับ</th>
                          <th scope="col" className="px-3 py-2 text-left font-medium text-gray-600">ชื่อเอกสาร</th>
                          <th scope="col" className="px-3 py-2 text-left font-medium text-gray-600">จัดการไฟล์</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {documentRequirements.map((docType, index) => (
                          <tr key={docType.document_type_id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-center text-gray-700">{index + 1}</td>
                            <td className="px-3 py-2 text-gray-700">
                              <div className="flex flex-col">
                                <span className="font-medium text-gray-800">
                                  {docType.document_type_name}
                                  {docType.required && <span className="ml-1 inline-flex items-center text-xs font-semibold text-red-500">*</span>}
                                </span>
                                <span className="text-xs text-gray-500">รองรับเฉพาะไฟล์ PDF ขนาดไม่เกิน 10MB</span>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              {uploadedFiles[docType.document_type_id] ? (
                                <div className="flex items-center justify-between gap-3 rounded-md border border-green-200 bg-green-50 p-3">
                                  <div className="flex min-w-0 items-center gap-3">
                                    <FileText className="h-5 w-5 flex-shrink-0 text-green-600" />
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium text-green-800" title={uploadedFiles[docType.document_type_id].name}>
                                        {uploadedFiles[docType.document_type_id].name}
                                      </p>
                                      <p className="text-xs text-green-700">{formatFileSize(uploadedFiles[docType.document_type_id].size)}</p>
                                    </div>
                                  </div>
                                  <div className="flex flex-shrink-0 items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => viewFile(docType.document_type_id)}
                                      className="inline-flex items-center justify-center rounded-md border border-transparent bg-white px-2 py-1 text-xs font-medium text-blue-600 shadow-sm transition hover:border-blue-100 hover:bg-blue-50"
                                    >
                                      <Eye className="h-4 w-4" />
                                      <span className="ml-1 hidden sm:inline">ดูไฟล์</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveFile(docType.document_type_id)}
                                      className="inline-flex items-center justify-center rounded-md border border-transparent bg-white px-2 py-1 text-xs font-medium text-red-600 shadow-sm transition hover:border-red-100 hover:bg-red-50"
                                    >
                                      <X className="h-4 w-4" />
                                      <span className="ml-1 hidden sm:inline">ลบ</span>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <FileUpload
                                  onFileSelect={(files) => handleFileUpload(docType.document_type_id, files)}
                                  accept=".pdf"
                                  error={errors[`file_${docType.document_type_id}`]}
                                  compact
                                />
                              )}
                              {errors[`file_${docType.document_type_id}`] && (
                                <p className="mt-2 text-xs text-red-500">{errors[`file_${docType.document_type_id}`]}</p>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </SimpleCard>

            <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-800">ดำเนินการกับแบบคำร้อง</p>
                <p className="text-xs text-gray-500">คุณสามารถบันทึกเป็นร่างเพื่อแก้ไขภายหลัง หรือส่งคำร้องเพื่อเข้าสู่การพิจารณา</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={deleteDraft}
                  disabled={!hasDraft || saving || submitting}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg border border-red-300 px-6 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  ลบร่าง
                </button>
                <button
                  type="button"
                  onClick={saveDraft}
                  disabled={saving || submitting}
                  className="w-full sm:flex-1 flex items-center justify-center gap-2 rounded-lg bg-gray-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {saving ? 'กำลังบันทึก...' : 'บันทึกร่าง'}
                </button>
                <button
                  type="button"
                  onClick={submitApplication}
                  disabled={saving || submitting}
                  className="w-full sm:flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {submitting ? 'กำลังส่ง...' : 'ส่งคำร้อง'}
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-5 text-sm text-yellow-800 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="font-semibold">ข้อควรระวังก่อนส่งคำร้อง</p>
                  <ul className="list-inside space-y-1 text-xs leading-relaxed md:list-disc">
                    <li>ตรวจสอบข้อมูลให้ครบถ้วนและถูกต้องก่อนกดส่งคำร้อง</li>
                    <li>ไฟล์แนบต้องเป็นรูปแบบ PDF เท่านั้น และมีขนาดไม่เกิน 10MB ต่อไฟล์</li>
                    <li>หลังจากส่งคำร้องแล้วจะไม่สามารถแก้ไขข้อมูลได้</li>
                    <li>คุณสามารถบันทึกร่างและกลับมาแก้ไขภายหลังได้</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </PageLayout>
  );
}