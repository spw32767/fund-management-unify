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
import { getStatusIdByCode, statusService } from '../../../lib/status_service';

// Match backend utils.StatusCodeDeptHeadPending for initial submission status
const DEPT_HEAD_PENDING_STATUS_CODE = '5';

const resolveDeptHeadPendingStatusId = async () => {
  try {
    const statusId = await getStatusIdByCode(DEPT_HEAD_PENDING_STATUS_CODE);
    if (statusId) {
      return Number(statusId);
    }
  } catch (error) {
    console.warn('Unable to resolve status via code lookup', error);
  }

  try {
    const statuses = await statusService.fetchAll({ force: true });
    const targetStatus = statuses.find((status) => {
      if (!status) return false;

      const codeMatches = String(status.status_code) === DEPT_HEAD_PENDING_STATUS_CODE;
      const nameMatches = status.status_name?.toLowerCase?.().includes('หัวหน้าสาขา');

      return codeMatches || nameMatches;
    });

    if (targetStatus?.application_status_id != null) {
      return Number(targetStatus.application_status_id);
    }
  } catch (error) {
    console.warn('Unable to resolve status via status service cache', error);
  }

  return null;
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
      alert("กรุณาอัปโหลดเฉพาะไฟล์ PDF");
    }
    
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles);
    }
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    onFileSelect(files);
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

      const hasSubcategoryId = Boolean(
        extractSubcategoryId(subcategoryData)
      );
      const hasSubcategoryName = Boolean(
        extractSubcategoryName(subcategoryData)
      );

      // Validate subcategoryData
      if (!hasSubcategoryId && !hasSubcategoryName) {
        throw new Error('ไม่พบข้อมูลทุนที่เลือก');
      }

      // Load user data and document requirements in parallel
      const [userData, docRequirements] = await Promise.all([
        loadUserData(),
        loadDocumentRequirements(subcategoryData)
      ]);

      console.log('Loaded user data:', userData);
      console.log('Loaded document requirements:', docRequirements);

    } catch (error) {
      console.error('Error loading initial data:', error);
      setErrors({ general: error.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล' });
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
          name: `${profileResponse.user.user_fname || ''} ${profileResponse.user.user_lname || ''}`.trim()
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
        name: `${storedUser.user_fname || ''} ${storedUser.user_lname || ''}`.trim()
      }));
      return storedUser;
    }

    throw new Error('ไม่สามารถดึงข้อมูลผู้ใช้ได้');
  };

  const loadDocumentRequirements = async (subcategoryInfo) => {
    const subcategoryName = extractSubcategoryName(subcategoryInfo);
    const normalizedSubcategoryName = subcategoryName?.trim()?.toLowerCase() || null;
    const subcategoryId = extractSubcategoryId(subcategoryInfo);
    const numericSubcategoryId = subcategoryId != null ? Number(subcategoryId) : null;

    const normalizePayload = (payload) => {
      if (!payload) {
        return [];
      }

      if (Array.isArray(payload)) {
        return payload;
      }

      if (Array.isArray(payload.document_types)) {
        return payload.document_types;
      }

      return [];
    };

    const parseSubcategoryIds = (doc) => {
      const rawValue = doc?.subcategory_ids;
      if (Array.isArray(rawValue)) {
        return rawValue;
      }

      if (typeof rawValue === 'string' && rawValue.trim()) {
        try {
          const parsed = JSON.parse(rawValue);
          return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
          console.warn('Failed to parse subcategory_ids JSON:', rawValue, error);
        }
      }

      return [];
    };

    const response = await documentTypesAPI.getDocumentTypes();
    const rawDocTypes = normalizePayload(response);

    if (!Array.isArray(rawDocTypes) || rawDocTypes.length === 0) {
      console.warn('No document types returned from API payload.');
      setDocumentRequirements([]);
      return [];
    }

    const sortedDocTypes = rawDocTypes
      .slice()
      .sort((a, b) => (a?.document_order || 0) - (b?.document_order || 0));

    const fundTypeFiltered = sortedDocTypes.filter((docType) => {
      if (!docType) return false;
      const fundTypes = Array.isArray(docType.fund_types) ? docType.fund_types : [];
      if (fundTypes.length === 0) {
        return false;
      }
      return fundTypes.includes('fund_application');
    });

    if (fundTypeFiltered.length === 0) {
      console.warn('No document types explicitly configured for fund_application; falling back to legacy list.');
      console.log('Legacy document types payload:', sortedDocTypes);
    } else {
      console.log('Filtered fund_application document types:', fundTypeFiltered);
    }

    const candidateDocs = fundTypeFiltered.length > 0 ? fundTypeFiltered : sortedDocTypes;

    const matches = [];
    const seenIds = new Set();
    const resolveIdentifier = (doc) => {
      if (!doc || typeof doc !== 'object') {
        return null;
      }

      if (doc.document_type_id != null) {
        return `doc-${doc.document_type_id}`;
      }

      if (doc.id != null) {
        return `legacy-${doc.id}`;
      }

      if (doc.code) {
        return `code-${doc.code}`;
      }

      return null;
    };
    const addDocs = (docs) => {
      for (const doc of docs) {
        const identifier = resolveIdentifier(doc);
        if (!doc || (identifier && seenIds.has(identifier))) {
          continue;
        }
        if (identifier) {
          seenIds.add(identifier);
        }
        matches.push(doc);
      }
    };

    const universalDocs = candidateDocs.filter((doc) => {
      const names = Array.isArray(doc?.subcategory_names) ? doc.subcategory_names : [];
      const ids = parseSubcategoryIds(doc);
      return names.length === 0 && ids.length === 0;
    });

    if (normalizedSubcategoryName) {
      const nameMatches = candidateDocs.filter((doc) => {
        const names = Array.isArray(doc?.subcategory_names) ? doc.subcategory_names : [];
        return names.some((name) => typeof name === 'string' && name.trim().toLowerCase() === normalizedSubcategoryName);
      });

      if (nameMatches.length > 0) {
        addDocs(nameMatches);
      }
    }

    if (matches.length === 0 && numericSubcategoryId != null) {
      const idMatches = candidateDocs.filter((doc) => {
        const ids = parseSubcategoryIds(doc).map((value) => Number(value));
        return ids.includes(numericSubcategoryId);
      });

      if (idMatches.length > 0) {
        addDocs(idMatches);
      }
    }

    if (matches.length === 0 && universalDocs.length > 0) {
      console.warn('No subcategory-specific document types found; including universal requirements.');
      addDocs(universalDocs);
    } else {
      addDocs(universalDocs);
    }

    setDocumentRequirements(matches);

    if (matches.length === 0) {
      console.warn('No document requirements configured for fund_application with subcategory:', {
        subcategoryName,
        subcategoryId,
      });
    }

    return matches;
  };

  function extractSubcategoryName(data) {
    const candidates = [
      data?.subcategory_name,
      data?.subcategorie_name,
      data?.subcategoryName,
      data?.subcategory?.subcategory_name,
      data?.subcategory?.subcategorie_name,
      data?.subcategory?.subcategoryName,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
    }

    return null;
  }

  function extractSubcategoryId(data) {
    const candidates = [
      data?.subcategory_id,
      data?.subcategoryId,
      data?.subcategory?.subcategory_id,
      data?.subcategory?.subcategoryId,
    ];

    for (const candidate of candidates) {
      const parsed = Number(candidate);
      if (!Number.isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }

    return null;
  }

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

    // Validate basic info
    if (!formData.name.trim()) {
      newErrors.name = 'กรุณากรอกชื่อ';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'กรุณากรอกเบอร์โทรศัพท์';
    } else {
      // Validate phone format (XXX-XXX-XXXX)
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
      
      // Validate basic required fields only
      const basicErrors = {};
      if (!formData.name.trim()) basicErrors.name = 'กรุณากรอกชื่อ';
      if (!formData.phone.trim()) basicErrors.phone = 'กรุณากรอกเบอร์โทรศัพท์';
      
      if (Object.keys(basicErrors).length > 0) {
        setErrors(basicErrors);
        return;
      }

      // TODO: Implement save draft API call
      console.log('Save draft:', {
        subcategory_id: subcategoryData.subcategory_id,
        formData,
        uploadedFiles,
        isDraft: true
      });

      alert('บันทึกร่างสำเร็จ');

    } catch (error) {
      console.error('Error saving draft:', error);
      setErrors({ general: 'เกิดข้อผิดพลาดในการบันทึกร่าง' });
    } finally {
      setSaving(false);
    }
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

      const deptPendingStatusId = await resolveDeptHeadPendingStatusId();
      if (!deptPendingStatusId) {
        throw new Error('ไม่พบสถานะสำหรับการพิจารณาของหัวหน้าสาขา');
      }

      // Step 1: Create submission record
      const submissionRes = await submissionAPI.createSubmission({
        submission_type: 'fund_application',
        year_id: subcategoryData?.year_id,
        status_id: deptPendingStatusId
      });
      const submissionId = submissionRes?.submission?.submission_id;

      // Step 2: Save basic fund details (ใช้ข้อมูลที่มีอยู่)
      if (submissionId) {
        await apiClient.post(`/submissions/${submissionId}/fund-details`, {
          project_title: formData.name,
          project_description: formData.phone,
          requested_amount: parseFloat(formData.requested_amount) || 0,
          subcategory_id: subcategoryData.subcategory_id
        });
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
        await submissionAPI.submitSubmission(submissionId);
      }



      alert('ส่งคำร้องสำเร็จ');

      // Navigate back to research fund page
      if (onNavigate) {
        onNavigate('research-fund');
      }

    } catch (error) {
      console.error('Error submitting application:', error);
      setErrors({ general: error?.message || 'เกิดข้อผิดพลาดในการส่งคำร้อง' });
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

  return (
    <PageLayout title={pageTitle} icon={FileText}>
      {/* Back Button */}
      <div className="mb-6">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>กลับไปหน้าทุนวิจัย</span>
        </button>
      </div>

      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        {/* Basic Applicant Info */}
        <SimpleCard title="ข้อมูลพื้นฐาน" icon={FileText}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ชื่อผู้ยื่นขอ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="ชื่อ-นามสกุล"
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.name}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                เบอร์โทรศัพท์ <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", formatPhoneNumber(e.target.value))}
                placeholder="081-234-5678"
                maxLength={12}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.phone ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.phone && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.phone}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">รูปแบบ: XXX-XXX-XXXX</p>
            </div>
          </div>
        </SimpleCard>

        {/* Request Amount */}
        <SimpleCard title="รวมจำนวนทุนที่ขอ (Total Request Amount)" icon={DollarSign}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              จำนวนเงินที่ขอ
              <br />
              <span className="text-xs font-normal text-gray-500">Request Amount (THB)</span>
            </label>
            <input
              type="number"
              min="0"
              value={formData.requested_amount}
              onChange={(e) => handleInputChange('requested_amount', e.target.value)}
              placeholder="0.00"
              className={`w-full bg-gray-50 rounded-lg p-3 text-2xl font-semibold text-gray-800 border ${errors.requested_amount ? 'border-red-500' : 'border-gray-200'}`}
            />
            {errors.requested_amount && (
              <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.requested_amount}
              </p>
            )}
          </div>
        </SimpleCard>

        {/* File Attachments */}
        <SimpleCard title="เอกสารแนบ" icon={Upload}>
          {documentRequirements.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>ไม่มีเอกสารที่ต้องส่งสำหรับทุนนี้</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm table-fixed">
                <colgroup>
                  <col className="w-12" />
                  <col />
                  <col />
                </colgroup>
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-2 text-center font-medium text-gray-700">ลำดับ</th>
                    <th className="px-2 py-2 text-left font-medium text-gray-700">ชื่อเอกสาร</th>
                    <th className="px-2 py-2 text-left font-medium text-gray-700">แนบไฟล์</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {documentRequirements.map((docType, index) => (
                    <tr key={docType.document_type_id}>
                      <td className="px-2 py-1 text-center text-gray-700">{index + 1}</td>
                      <td className="px-2 py-1 text-gray-700">
                        {docType.document_type_name}
                        {docType.required && <span className="text-red-500 ml-1">*</span>}
                      </td>
                      <td className="px-2 py-1">
                        {uploadedFiles[docType.document_type_id] ? (
                          <div className="flex items-center justify-between bg-green-50 p-2 rounded w-full">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="h-5 w-5 text-green-600 flex-shrink-0" />
                              <span className="text-sm font-medium text-green-800 truncate">
                                {uploadedFiles[docType.document_type_id].name}
                              </span>
                              <span className="text-xs text-green-600 whitespace-nowrap">
                                ({Math.round(uploadedFiles[docType.document_type_id].size / 1024)} KB)
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => viewFile(docType.document_type_id)}
                                className="text-blue-600 hover:text-blue-800 p-1"
                                title="ดูไฟล์"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveFile(docType.document_type_id)}
                                className="text-red-600 hover:text-red-800 p-1"
                                title="ลบไฟล์"
                              >
                                <X className="h-4 w-4" />
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SimpleCard>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
          <button
            type="button"
            onClick={saveDraft}
            disabled={saving || submitting}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? 'กำลังบันทึก...' : 'บันทึกร่าง'}
          </button>
          
          <button
            type="button"
            onClick={submitApplication}
            disabled={saving || submitting}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Send className="h-4 w-4" />
            )}
            {submitting ? 'กำลังส่ง...' : 'ส่งคำร้อง'}
          </button>
        </div>

        {/* Warning Notice */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">ข้อควรระวัง:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>กรุณาตรวจสอบข้อมูลให้ครบถ้วนและถูกต้องก่อนส่งคำร้อง</li>
                <li>เอกสารแนบต้องเป็นไฟล์ PDF เท่านั้น ขนาดไม่เกิน 10MB</li>
                <li>หลังจากส่งคำร้องแล้ว จะไม่สามารถแก้ไขข้อมูลได้</li>
                <li>สามารถบันทึกร่างและกลับมาแก้ไขภายหลังได้</li>
              </ul>
            </div>
          </div>
        </div>
      </form>
    </PageLayout>
  );
}