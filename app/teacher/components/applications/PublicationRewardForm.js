// app/teacher/components/applications/PublicationRewardForm.js
"use client";

import { useState, useEffect } from "react";
import { Award, Upload, Users, FileText, Plus, X, Save, Send, AlertCircle, Search, Eye, Calculator } from "lucide-react";
import PageLayout from "../common/PageLayout";
import SimpleCard from "../common/SimpleCard";
import { systemAPI, authAPI } from '../../../lib/api';
import { 
  submissionAPI, 
  publicationDetailsAPI, 
  fileAPI, 
  documentAPI, 
  publicationRewardAPI, 
  publicationFormAPI,
  submissionUsersAPI,
  publicationRewardRatesAPI, // เพิ่ม
  rewardConfigAPI // เพิ่ม
} from '../../../lib/publication_api';
import Swal from 'sweetalert2';
import { PDFDocument } from 'pdf-lib';

// =================================================================
// CONFIGURATION & CONSTANTS
// =================================================================

// SweetAlert2 configuration
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  }
});

// Draft storage constants
const DRAFT_KEY = 'publication_reward_draft';

// =================================================================
// UTILITY FUNCTIONS
// =================================================================

// Number formatting utilities
const formatNumber = (value) => {
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
};

const formatCurrency = (value) => {
  const num = formatNumber(value);
  return num.toLocaleString('th-TH');
};

// Phone number formatting
const formatPhoneNumber = (value) => {
  // Extract only digits from input
  const numbers = value.replace(/\D/g, '');
  
  // Build formatted string based on number of digits
  if (numbers.length === 0) return '';
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
  if (numbers.length <= 10) return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
  
  // Max 10 digits
  return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
};

// Bank account formatting
const formatBankAccount = (value) => {
  // Keep only digits
  const cleaned = value.replace(/\D/g, '');
  // Limit to 15 digits
  return cleaned.slice(0, 15);
};

// Quartile sorting order
const getQuartileSortOrder = (quartile) => {
  const orderMap = {
    'T5': 1,    // Top 5%
    'T10': 2,   // Top 10%
    'Q1': 3,    // Quartile 1
    'Q2': 4,    // Quartile 2
    'Q3': 5,    // Quartile 3
    'Q4': 6,    // Quartile 4
    'TCI': 7,   // TCI
    'N/A': 8    // N/A (ถ้ามี)
  };
  
  return orderMap[quartile] || 999; // ถ้าไม่อยู่ใน map ให้ไปอยู่ท้ายสุด
};

// Sort quartiles array
const sortQuartiles = (quartiles) => {
  return [...quartiles].sort((a, b) => {
    return getQuartileSortOrder(a) - getQuartileSortOrder(b);
  });
};

// Get maximum fee limit based on quartile
const getMaxFeeLimit = async (quartile, year = null) => {
  if (!quartile) return 0;
  
  try {
    // หา year (พ.ศ.) จาก year_id หรือใช้ปีปัจจุบัน + 543
    const currentYear = new Date().getFullYear() + 543;
    const targetYear = year || currentYear.toString();
    
    // เรียก API เพื่อดึงวงเงินสูงสุด
    const response = await rewardConfigAPI.lookupMaxAmount(
      targetYear,
      quartile
    );
    
    return response.max_amount || 0;
  } catch (error) {
    // ถ้าไม่พบ config สำหรับ quartile นี้ ให้ return 0
    if (error.message && error.message.includes('Configuration not found')) {
      console.log(`No fee limit config for quartile ${quartile} in year ${year}`);
      return 0;
    }
    console.error('Error fetching fee limit:', error);
    return 0;
  }
};

const validateFees = async (journalQuartile, revisionFee, publicationFee, currentYear) => {
  const errors = [];
  
  if (journalQuartile) {
    try {
      // ดึงวงเงินสูงสุดจาก API
      const maxLimit = await getMaxFeeLimit(journalQuartile, currentYear);
      
      // คำนวณผลรวมของค่าปรับปรุงและค่าตีพิมพ์
      const totalFees = (parseFloat(revisionFee) || 0) + (parseFloat(publicationFee) || 0);
      
      if (totalFees > maxLimit) {
        errors.push(`ค่าปรับปรุงและค่าตีพิมพ์รวมกันเกินวงเงินสูงสุด ${maxLimit.toLocaleString()} บาท`);
      }
    } catch (error) {
      console.error('Error validating fees:', error);
      errors.push('ไม่สามารถตรวจสอบวงเงินได้');
    }
  }
  
  return errors;
};

// Real-time fee validation
const validateFeesRealtime = async (revisionFee, publicationFee, quartile, feeLimitsTotal, setFeeErrorFn) => {
  if (!quartile || feeLimitsTotal === 0) {
    setFeeErrorFn('');
    return true;
  }
  
  const totalFees = (parseFloat(revisionFee) || 0) + (parseFloat(publicationFee) || 0);
  
  if (totalFees > feeLimitsTotal) {
    setFeeErrorFn(`ค่าปรับปรุงและค่าตีพิมพ์รวมกันเกินวงเงินสูงสุด ${feeLimitsTotal.toLocaleString()} บาท`);
    return false;
  }
  
  setFeeErrorFn('');
  return true;
};
// Check if fees are within limit
const checkFeesLimit = async (revisionFee, publicationFee, quartile) => {
  if (!quartile) {
    return {
      isValid: true,
      total: 0,
      maxLimit: 0,
      remaining: 0
    };
  }
  
  try {
    const maxLimit = await getMaxFeeLimit(quartile);
    const total = (parseFloat(revisionFee) || 0) + (parseFloat(publicationFee) || 0);
    
    return {
      isValid: total <= maxLimit,
      total: total,
      maxLimit: maxLimit,
      remaining: maxLimit - total
    };
  } catch (error) {
    console.error('Error checking fees limit:', error);
    return {
      isValid: false,
      total: 0,
      maxLimit: 0,
      remaining: 0
    };
  }
};

// Year validation
const validateYear = (value) => {
  const year = parseInt(value);
  const currentYear = new Date().getFullYear();
  return year >= 2000 && year <= currentYear + 1;
};

// Scroll to first error field
const scrollToFirstError = (errors) => {
  // Define field order priority
  const fieldOrder = [
    // ข้อมูลพื้นฐาน
    'year_id',
    'author_status', 
    'phone_number',
    // ข้อมูลบทความ
    'article_title',
    'journal_name',
    'journal_quartile',
    'journal_month',
    'journal_year',
    // ข้อมูลธนาคาร
    'bank_account',
    'bank_name',
    // ค่าใช้จ่าย
    'fees_limit',
    // เอกสารแนบ
    'file_2',
    'file_3'
  ];
  
  // Find first error field
  const firstErrorField = fieldOrder.find(field => errors[field]);
  
  if (firstErrorField) {
    // Wait for dialog to fully close
    setTimeout(() => {
      // Special handling for file errors
      if (firstErrorField.startsWith('file_')) {
        const element = document.getElementById('file-attachments-section');
        if (element) {
          element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          });
          
          // Optional: Add border highlight
          setTimeout(() => {
            const fileId = firstErrorField.replace('file_', '');
            const fileElement = document.getElementById(`file-upload-${fileId}`);
            if (fileElement) {
              const originalBorder = fileElement.style.border;
              fileElement.style.border = '2px solid #ef4444';
              setTimeout(() => {
                fileElement.style.border = originalBorder;
              }, 3000);
            }
          }, 800);
        }
      } else {
        // Regular form fields
        const element = document.getElementById(`field-${firstErrorField}`);
        if (element) {
          element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          });
          
          // Focus on input after scroll
          setTimeout(() => {
            const input = element.querySelector('input, select, textarea');
            if (input) {
              input.focus();
            }
          }, 800);
        }
      }
    }, 300); // Wait 300ms for dialog animation to complete
  }
};

// Document type mapping
const getDocumentTypeName = (documentTypeId) => {
  const typeMap = {
    1: 'บทความที่ตีพิมพ์',
    2: 'หลักฐานการตีพิมพ์',
    3: 'เอกสารประกอบ',
    11: 'เอกสารอื่นๆ',
    12: 'เอกสารเบิกจ่ายภายนอก'
  };
  
  return typeMap[documentTypeId] || `เอกสารประเภท ${documentTypeId}`;
};

// PDF merging utility
const mergePDFs = async (pdfFiles) => {
  try {
    const mergedPdf = await PDFDocument.create();
    
    for (const file of pdfFiles) {
      if (file.type === 'application/pdf') {
        const pdfBytes = await file.arrayBuffer();
        const pdf = await PDFDocument.load(pdfBytes);
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        pages.forEach((page) => mergedPdf.addPage(page));
      }
    }
    
    const mergedPdfBytes = await mergedPdf.save();
    const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
    return new File([blob], 'merged_documents.pdf', { type: 'application/pdf' });
  } catch (error) {
    console.error('Error merging PDFs:', error);
    throw error;
  }
};

// =================================================================
// DRAFT MANAGEMENT FUNCTIONS
// =================================================================

// Save draft to localStorage
const saveDraftToLocal = (data) => {
  try {
    const draftData = {
      formData: data.formData,
      coauthors: data.coauthors,
      otherDocuments: data.otherDocuments.map(doc => ({
        documentTypeId: doc.documentTypeId,
        description: doc.description,
        fileName: doc.file?.name || null,
        fileSize: doc.file?.size || null,
        fileType: doc.file?.type || null
      })),
      savedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    };
    
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
    return true;
  } catch (error) {
    console.error('Error saving draft to localStorage:', error);
    return false;
  }
};

// Load draft from localStorage
const loadDraftFromLocal = () => {
  try {
    const draftString = localStorage.getItem(DRAFT_KEY);
    if (!draftString) return null;
    
    const draft = JSON.parse(draftString);
    
    // Check if draft has expired
    if (new Date(draft.expiresAt) < new Date()) {
      localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    
    return draft;
  } catch (error) {
    console.error('Error loading draft from localStorage:', error);
    return null;
  }
};

// Delete draft from localStorage
const deleteDraftFromLocal = () => {
  localStorage.removeItem(DRAFT_KEY);
};

// =================================================================
// REWARD CALCULATION
// =================================================================

// Calculate reward based on author status and quartile
const calculateReward = async (authorStatus, quartile, year = null) => {
  if (!authorStatus || !quartile) return 0;
  
  try {
    // หา year (พ.ศ.) จาก year_id หรือใช้ปีปัจจุบัน + 543
    const currentYear = new Date().getFullYear() + 543;
    const targetYear = year || currentYear.toString();
    
    // เรียก API เพื่อดึงเงินรางวัล
    const response = await publicationRewardRatesAPI.lookupRewardAmount(
      targetYear,
      authorStatus,
      quartile
    );
    
    return response.reward_amount || 0;
  } catch (error) {
    console.error('Error calculating reward:', error);
    return 0;
  }
};

// =================================================================
// FILE UPLOAD COMPONENT
// =================================================================

const FileUpload = ({ onFileSelect, accept, multiple = false, error, label }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFileSelection(files);
  };

  const handleFileSelection = (files) => {
    if (multiple) {
      // For multiple files, add to existing list
      const newFiles = [...selectedFiles, ...files];
      setSelectedFiles(newFiles);
      onFileSelect(newFiles);
    } else {
      // For single file
      const validFiles = files.slice(0, 1);
      setSelectedFiles(validFiles);
      onFileSelect(validFiles);
    }
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    handleFileSelection(files);
  };

  const removeFile = (index) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    onFileSelect(newFiles);
  };

  const viewFile = (file) => {
    const url = URL.createObjectURL(file);
    window.open(url, '_blank');
  };

  // Display selected file for single file mode
  if (!multiple && selectedFiles.length > 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-800">{selectedFiles[0].name}</p>
              <p className="text-xs text-green-600">
                {(selectedFiles[0].size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => viewFile(selectedFiles[0])}
              className="text-blue-500 hover:text-blue-700"
              title="ดูไฟล์"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => removeFile(0)}
              className="text-red-500 hover:text-red-700"
              title="ลบไฟล์"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        {error && (
          <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {error}
          </p>
        )}
      </div>
    );
  }

  // File drop zone for multiple files or no files selected
  return (
    <div className="space-y-2">
      <div
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
          isDragging 
            ? 'border-blue-400 bg-blue-50' 
            : error 
            ? 'border-red-300 bg-red-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById(`file-input-${label}`).click()}
      >
        <Upload className="mx-auto h-6 w-6 text-gray-400 mb-2" />
        <p className="text-sm text-gray-600">
          {multiple ? 
            'คลิกหรือลากไฟล์มาวางที่นี่ (สามารถเลือกได้หลายไฟล์)' : 
            'คลิกหรือลากไฟล์มาวางที่นี่'
          }
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {accept || 'PDF, DOC, DOCX, JPG, PNG (ไม่เกิน 10MB)'}
        </p>
        <input
          id={`file-input-${label}`}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInput}
          className="hidden"
        />
      </div>

      {/* Display selected files for multiple selection */}
      {multiple && selectedFiles.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-sm font-medium text-gray-700">ไฟล์ที่เลือก:</p>
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      viewFile(file);
                    }}
                    className="text-blue-500 hover:text-blue-700"
                    title="ดูไฟล์"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                    className="text-red-500 hover:text-red-700"
                    title="ลบไฟล์"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}
    </div>
  );
};

// =================================================================
// MAIN COMPONENT START
// =================================================================

export default function PublicationRewardForm({ onNavigate }) {
  // =================================================================
  // STATE DECLARATIONS
  // =================================================================
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [users, setUsers] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [years, setYears] = useState([]);
  const [currentSubmissionId, setCurrentSubmissionId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [mergedPdfFile, setMergedPdfFile] = useState(null);
  const [availableAuthorStatuses, setAvailableAuthorStatuses] = useState([]);
  const [availableQuartiles, setAvailableQuartiles] = useState([]);
  const [quartileConfigs, setQuartileConfigs] = useState({}); // เก็บ config ของแต่ละ quartile
  const [feeError, setFeeError] = useState('');
  const [feeLimits, setFeeLimits] = useState({
    total: 0
  });

  // Form data state
  const [formData, setFormData] = useState({
    // Basic submission info
    year_id: null,
    
    // Publication details
    author_status: '',
    article_title: '',
    journal_name: '',
    journal_issue: '',
    journal_pages: '',
    journal_month: '',
    journal_year: new Date().getFullYear().toString(),
    journal_url: '',
    doi: '',
    article_online_db: '',
    journal_tier: '',
    journal_quartile: '',
    in_isi: false,
    in_scopus: false,
    in_web_of_science: false,
    in_tci: false,
    article_type: '',
    journal_type: '',
    
    // Reward calculation
    reward_amount: 0,
    revision_fee: 0,
    publication_fee: 0,
    external_funding_amount: 0,
    total_amount: 0, 
    
    // Bank info
    bank_account: '',
    bank_name: '',
    phone_number: '',
    
    // Other info
    university_ranking: '',
    has_university_fund: '',
    university_fund_ref: ''
  });

  // Co-authors and files
  const [coauthors, setCoauthors] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [otherDocuments, setOtherDocuments] = useState([]);

  // External funding sources
  const [externalFundings, setExternalFundings] = useState([]);

  // =================================================================
  // EFFECT HOOKS
  // =================================================================

  // Load initial data on mount
  useEffect(() => {
    loadInitialData();
    checkAndLoadDraft();
  }, []);

  // Reload quartile configs when year changes
  useEffect(() => {
    const loadQuartileConfigs = async () => {
      if (formData.year_id && years.length > 0) {
        const yearObj = years.find(y => y.year_id === formData.year_id);
        if (yearObj) {
          try {
            const configResponse = await rewardConfigAPI.getConfig({ 
              year: yearObj.year 
            });
            
            if (configResponse && configResponse.data) {
              const configMap = {};
              configResponse.data.forEach(config => {
                if (config.is_active) {
                  configMap[config.journal_quartile] = {
                    maxAmount: config.max_amount,
                    isActive: config.is_active,
                    description: config.condition_description
                  };
                }
              });
              setQuartileConfigs(configMap);
            }
          } catch (error) {
            console.error('Error loading quartile configs:', error);
            setQuartileConfigs({});
          }
        }
      }
    };
    
    loadQuartileConfigs();
  }, [formData.year_id, years]);

  // Update fee limits when quartile changes
  useEffect(() => {
    const updateFeeLimits = async () => {
      if (formData.journal_quartile) {
        try {
          // หา year (พ.ศ.) จาก year_id
          const yearObj = years.find(y => y.year_id === formData.year_id);
          const targetYear = yearObj?.year || (new Date().getFullYear() + 543).toString();
          
          const maxLimit = await getMaxFeeLimit(formData.journal_quartile, targetYear);
          
          setFeeLimits({
            total: maxLimit
          });
        } catch (error) {
          // ไม่ต้อง log error ถ้าเป็นเพราะไม่พบ config
          if (!error.message?.includes('not found')) {
            console.error('Error updating fee limits:', error);
          }
          setFeeLimits({
            total: 0
          });
        }
      } else {
        setFeeLimits({
          total: 0
        });
      }
    };
    
    updateFeeLimits();
  }, [formData.journal_quartile, formData.year_id, years]);

  // Calculate total amount when relevant values change
  useEffect(() => {
    const externalTotal = externalFundings.reduce((sum, funding) => 
      sum + (parseFloat(funding.amount) || 0), 0);
    
    const totalAmount = (parseFloat(formData.publication_reward) || 0) + 
                      (parseFloat(formData.revision_fee) || 0) + 
                      (parseFloat(formData.publication_fee) || 0) - 
                      externalTotal;
    
    setFormData(prev => ({
      ...prev,
      external_funding_amount: externalTotal,
      total_amount: totalAmount
    }));
  }, [formData.publication_reward, formData.revision_fee, formData.publication_fee, externalFundings]);

  // Calculate reward when author status or quartile changes
  useEffect(() => {
    const updateReward = async () => {
      if (formData.author_status && formData.journal_quartile) {
        try {
          // หา year (พ.ศ.) จาก year_id
          const yearObj = years.find(y => y.year_id === formData.year_id);
          const targetYear = yearObj?.year || new Date().getFullYear().toString();
          
          const reward = await calculateReward(formData.author_status, formData.journal_quartile, targetYear);
          setFormData(prev => ({ ...prev, publication_reward: reward }));
        } catch (error) {
          console.error('Error calculating reward:', error);
        }
      }
    };
    
    updateReward();
  }, [formData.author_status, formData.journal_quartile, formData.year_id, years]);

  // Auto-save draft periodically
  useEffect(() => {
    const autoSaveTimer = setTimeout(() => {
      if (formData.article_title || formData.journal_name) {
        saveDraftToLocal({
          formData,
          coauthors,
          otherDocuments
        });
        console.log('Auto-saved draft');
      }
    }, 10000); // auto-save every 10 seconds

    return () => clearTimeout(autoSaveTimer);
  }, [formData, coauthors, otherDocuments]);

  // Check fees limit when quartile or fees change
  useEffect(() => {
    const checkFees = async () => {
      if (formData.journal_quartile) {
        const check = await checkFeesLimit(
          formData.revision_fee,
          formData.publication_fee,
          formData.journal_quartile
        );
        
        if (!check.isValid && check.maxLimit > 0) {
          setFeeError(`รวมค่าปรับปรุงและค่าตีพิมพ์เกินวงเงินที่กำหนด (ไม่เกิน ${formatCurrency(check.maxLimit)} บาท)`);
        } else {
          setFeeError('');
        }
      }
    };
    
    checkFees();
  }, [formData.journal_quartile, formData.revision_fee, formData.publication_fee]);

  // Clear fees and external funding when quartile changes to ineligible ones
  useEffect(() => {
    const clearFeesIfNeeded = async () => {
      if (formData.journal_quartile) {
        const maxLimit = await getMaxFeeLimit(formData.journal_quartile);
        
        // If quartile doesn't allow fees
        if (maxLimit === 0) {
          // Clear revision and publication fees
          setFormData(prev => ({
            ...prev,
            revision_fee: 0,
            publication_fee: 0
          }));
          
          // Clear external fundings
          setExternalFundings([]);
          
          // Clear external funding documents from otherDocuments
          setOtherDocuments(prev => 
            prev.filter(doc => doc.type !== 'external_funding')
          );
          
          // Show notification
          if (formData.revision_fee > 0 || formData.publication_fee > 0 || externalFundings.length > 0) {
            Toast.fire({
              icon: 'info',
              title: 'Quartile นี้ไม่สามารถเบิกค่าใช้จ่ายได้',
              text: 'ระบบได้ล้างข้อมูลค่าปรับปรุง ค่าตีพิมพ์ และทุนภายนอกแล้ว'
            });
          }
        }
      }
    };
    
    clearFeesIfNeeded();
  }, [formData.journal_quartile]);

  // =================================================================
  // HELPER FUNCTIONS
  // =================================================================

  // Get file count summary
  const getFileCountByType = () => {
    const counts = {
      main: Object.keys(uploadedFiles).length,
      other: otherDocuments?.length || 0,
      external: externalFundings?.filter(f => f.file).length || 0
    };
    
    const total = counts.main + counts.other + counts.external;
    
    return {
      ...counts,
      total,
      summary: `รวม ${total} ไฟล์ (หลัก: ${counts.main}, อื่นๆ: ${counts.other}, ภายนอก: ${counts.external})`
    };
  };

  // Debug file states (development only)
  const debugFileStates = () => {
    console.group('=== DEBUG FILE STATES ===');
    
    console.log('1. uploadedFiles state:');
    Object.entries(uploadedFiles).forEach(([key, file]) => {
      if (file) {
        console.log(`  ${key}:`, {
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: file.lastModified
        });
      } else {
        console.log(`  ${key}: null/undefined`);
      }
    });
    
    console.log('2. otherDocuments state:');
    if (otherDocuments && otherDocuments.length > 0) {
      otherDocuments.forEach((doc, index) => {
        const file = doc.file || doc;
        if (file) {
          console.log(`  Document ${index}:`, {
            name: file.name,
            type: file.type,
            size: file.size
          });
        } else {
          console.log(`  Document ${index}: invalid file object`, doc);
        }
      });
    } else {
      console.log('  No other documents');
    }
    
    console.log('3. externalFundings state:');
    if (externalFundings && externalFundings.length > 0) {
      externalFundings.forEach((funding, index) => {
        if (funding.file) {
          console.log(`  Funding ${index}:`, {
            name: funding.file.name,
            type: funding.file.type,
            size: funding.file.size,
            fundName: funding.fundName
          });
        } else {
          console.log(`  Funding ${index}: no file attached`, { fundName: funding.fundName });
        }
      });
    } else {
      console.log('  No external fundings');
    }
    
    console.groupEnd();
  };

  // =================================================================
  // DATA LOADING FUNCTIONS
  // =================================================================

  // Load initial data from APIs
  const loadInitialData = async () => {
    try {
      setLoading(true);
      console.log('Starting loadInitialData...');
      
      // Get current user data
      let userLoaded = false;
      let currentUserData = null;
      
      // Try to fetch from API first
      try {
        const profileResponse = await authAPI.getProfile();
        console.log('Full profile response:', profileResponse);
        
        if (profileResponse && profileResponse.user) {
          currentUserData = profileResponse.user;
          setCurrentUser(currentUserData);
          userLoaded = true;
          console.log('Current user from API:', currentUserData);
        }
      } catch (error) {
        console.log('Could not fetch profile from API:', error);
      }
      
      // If API fails, use localStorage
      if (!userLoaded) {
        const storedUser = authAPI.getCurrentUser();
        console.log('Stored user from localStorage:', storedUser);
        if (storedUser) {
          currentUserData = storedUser;
          setCurrentUser(storedUser);
        }
      }

      // Load system data
      const [yearsResponse, usersResponse, docTypesResponse] = await Promise.all([
        systemAPI.getYears(),                                    
        publicationFormAPI.getUsers(),                                  
        publicationFormAPI.getDocumentTypes()                    
      ]);

      console.log('Raw API responses:');
      console.log('Years:', yearsResponse);
      console.log('Users:', usersResponse); 
      console.log('Document Types:', docTypesResponse);

      // Handle years response
      let currentYear = null; // เพิ่มการประกาศตัวแปร
      if (yearsResponse && yearsResponse.years) {
        console.log('Setting years:', yearsResponse.years);
        setYears(yearsResponse.years);
        currentYear = yearsResponse.years.find(y => y.year === '2568'); // กำหนดค่า
        if (currentYear) {
          console.log('Found current year:', currentYear);
          setFormData(prev => ({ ...prev, year_id: currentYear.year_id }));
        }
      }

      // Handle users response and filter out current user
      if (usersResponse && usersResponse.users) {
        console.log('All users before filtering:', usersResponse.users);
        
        // Filter out current user from co-author list
        const filteredUsers = usersResponse.users.filter(user => {
          if (currentUserData && currentUserData.user_id) {
            return user.user_id !== currentUserData.user_id;
          }
          return true;
        });
        
        console.log('Current user ID:', currentUserData?.user_id);
        console.log('Filtered users (without current user):', filteredUsers);
        setUsers(filteredUsers);
      }

      // Handle document types response
      if (docTypesResponse && docTypesResponse.document_types) {
        console.log('Setting document types:', docTypesResponse.document_types);
        setDocumentTypes(docTypesResponse.document_types);
      }

      // Load publication reward rates to get available author statuses and quartiles
      try {
        if (currentYear) {
          const ratesResponse = await publicationRewardRatesAPI.getRatesByYear(currentYear.year);
          
          if (ratesResponse && ratesResponse.rates) {
            // Filter only active rates
            const activeRates = ratesResponse.rates.filter(rate => rate.is_active === true);
            
            // Extract unique author statuses (excluding 'co_author')
            const uniqueStatuses = [...new Set(activeRates
              .map(rate => rate.author_status)
              .filter(status => status !== 'co_author')
            )];
            setAvailableAuthorStatuses(uniqueStatuses);
            console.log('Available author statuses:', uniqueStatuses);
            
            // Extract unique quartiles
            const uniqueQuartiles = [...new Set(activeRates.map(rate => rate.journal_quartile))];
            const sortedQuartiles = sortQuartiles(uniqueQuartiles);
            setAvailableQuartiles(sortedQuartiles);
            console.log('Available quartiles (sorted):', sortedQuartiles);
          }
        }
      } catch (ratesError) {
        console.error('Error loading publication reward rates:', ratesError);
      }

    } catch (error) {
      console.error('Error loading initial data:', error);
      alert('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Check and load draft from localStorage
  const checkAndLoadDraft = async () => {
    const draft = loadDraftFromLocal();
    if (draft) {
      const savedDate = new Date(draft.savedAt).toLocaleString('th-TH');
      
      const result = await Swal.fire({
        title: 'พบข้อมูลที่บันทึกไว้',
        html: `
          <p>พบข้อมูลร่างที่บันทึกไว้เมื่อ ${savedDate}</p>
          <p class="text-lg font-semibold mt-2">ต้องการโหลดข้อมูลนี้หรือไม่?</p>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'โหลดข้อมูล',
        cancelButtonText: 'เริ่มใหม่',
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33'
      });

      if (result.isConfirmed) {
        // Load form data
        setFormData(draft.formData);
        setCoauthors(draft.coauthors || []);
        
        // Show file re-upload notice
        if (draft.otherDocuments.length > 0) {
          const fileList = draft.otherDocuments
            .filter(doc => doc.fileName)
            .map(doc => `• ${doc.fileName} (${(doc.fileSize / 1024 / 1024).toFixed(2)} MB)`)
            .join('<br>');
          
          if (fileList) {
            Swal.fire({
              icon: 'info',
              title: 'กรุณาเลือกไฟล์ใหม่',
              html: `
                <p>ไฟล์ที่เคยเลือกไว้:</p>
                <div class="text-left mt-2 text-sm">${fileList}</div>
                <p class="mt-3 text-sm text-gray-600">เนื่องจากความปลอดภัย กรุณาเลือกไฟล์เหล่านี้อีกครั้ง</p>
              `,
              confirmButtonColor: '#3085d6'
            });
          }
        }
        
        Toast.fire({
          icon: 'success',
          title: 'โหลดข้อมูลร่างเรียบร้อยแล้ว'
        });
      } else {
        deleteDraftFromLocal();
      }
    }
  };

  // =================================================================
  // EVENT HANDLERS
  // =================================================================

  // Handle form input changes
  const handleInputChange = async (e) => {
    const { name, value, type, checked } = e.target;
    
    // สำหรับ checkbox ใช้ค่า checked
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } 
    // สำหรับ author_status คำนวณ reward ใหม่
    else if (name === 'author_status') {
      setLoading(true);
      try {
        const rewardAmount = await calculateReward(value, formData.journal_quartile);
        setFormData(prev => ({
          ...prev,
          author_status: value,
          publication_reward: rewardAmount
        }));
      } catch (error) {
        console.error('Error updating author status:', error);
        Toast.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาดในการคำนวณเงินรางวัล'
        });
      } finally {
        setLoading(false);
      }
    }
    // สำหรับ journal_quartile คำนวณ reward ใหม่
    else if (name === 'journal_quartile') {
      setLoading(true);
      try {
        const rewardAmount = await calculateReward(formData.author_status, value);
        setFormData(prev => ({
          ...prev,
          journal_quartile: value,
          publication_reward: rewardAmount
        }));
      } catch (error) {
        console.error('Error updating quartile:', error);
        Toast.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาดในการคำนวณเงินรางวัล'
        });
      } finally {
        setLoading(false);
      }
    }

    // สำหรับ phone_number ให้ format ตัวเลข
    else if (name === 'phone_number') {
      const formattedPhone = formatPhoneNumber(value);
      setFormData(prev => ({
        ...prev,
        phone_number: formattedPhone
      }));
    }

    // สำหรับ input อื่นๆ
    else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Clear error ถ้ามี
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Handle phone number key press
  const handlePhoneKeyDown = (e) => {
    const { value, selectionStart } = e.target;
    
    // Prevent deleting dash
    if (e.key === 'Backspace' || e.key === 'Delete') {
      const charToDelete = e.key === 'Backspace' ? value[selectionStart - 1] : value[selectionStart];
      if (charToDelete === '-') {
        e.preventDefault();
        
        // Move cursor to skip dash
        if (e.key === 'Backspace' && selectionStart > 0) {
          e.target.setSelectionRange(selectionStart - 2, selectionStart - 2);
        }
      }
    }
    
    // Prevent typing non-digits
    if (!/^\d$/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
    }
  };

  // Handle co-author addition
  const handleAddCoauthor = (user) => {
    if (!coauthors.find(c => c.user_id === user.user_id)) {
      setCoauthors(prev => [...prev, user]);
    }
  };

  // Handle co-author removal
  const handleRemoveCoauthor = async (index) => {
    const result = await Swal.fire({
      title: 'ยืนยันการลบผู้แต่งร่วม?',
      text: `ต้องการลบ ${coauthors[index].user_fname} ${coauthors[index].user_lname} ออกจากรายชื่อผู้แต่งร่วมหรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก'
    });

    if (result.isConfirmed) {
      setCoauthors(prev => prev.filter((_, i) => i !== index));
      
      Toast.fire({
        icon: 'success',
        title: 'ลบผู้แต่งร่วมเรียบร้อยแล้ว'
      });
    }
  };

  // Handle external funding addition
  const handleAddExternalFunding = () => {
    const newFunding = {
      id: Date.now(),
      fundName: '',
      amount: '',
      file: null
    };
    setExternalFundings([...externalFundings, newFunding]);
  };

  // Handle external funding removal
  const handleRemoveExternalFunding = (id) => {
    // Find related file
    const funding = externalFundings.find(f => f.id === id);
    if (funding && funding.file) {
      // Remove file from otherDocuments as well
      setOtherDocuments(prev => prev.filter(doc => 
        !(doc.type === 'external_funding' && doc.external_funding_id === id)
      ));
    }
    
    // Remove funding
    setExternalFundings(externalFundings.filter(f => f.id !== id));
  };

  // Handle external funding field changes
  const handleExternalFundingChange = (id, field, value) => {
    setExternalFundings(externalFundings.map(funding => 
      funding.id === id ? { ...funding, [field]: value } : funding
    ));
  };

  // Handle file uploads
  const handleFileUpload = (documentTypeId, files) => {
    console.log('handleFileUpload called with:', { documentTypeId, files });
    
    if (files && files.length > 0) {
      if (documentTypeId === 'other') {
        // For other documents, store as array
        console.log('Setting other documents:', files);
        setOtherDocuments(files);
      } else {
        // For specific document types, store first file only
        console.log(`Setting uploaded file for type ${documentTypeId}:`, files[0]);
        setUploadedFiles(prev => {
          const updated = {
            ...prev,
            [documentTypeId]: files[0]
          };
          console.log('Updated uploadedFiles state:', updated);
          return updated;
        });
      }

      // Clear error
      if (errors[`file_${documentTypeId}`]) {
        setErrors(prev => ({ ...prev, [`file_${documentTypeId}`]: '' }));
      }
    } else {
      console.log('No files provided to handleFileUpload');
    }
  };

  // Handle external funding file changes
  const handleExternalFundingFileChange = (id, file) => {
    console.log('handleExternalFundingFileChange called with:', { id, file });
    
    if (file && file.type === 'application/pdf') {
      // Update file in funding table
      setExternalFundings(prev => {
        const updated = prev.map(funding => 
          funding.id === id ? { ...funding, file: file } : funding
        );
        console.log('Updated externalFundings:', updated);
        return updated;
      });
      
      // Add to otherDocuments with proper structure
      const externalDoc = {
        file: file,
        documentTypeId: 12, // เอกสารเบิกจ่ายภายนอก
        description: `เอกสารเบิกจ่ายภายนอก - ${file.name}`,
        type: 'external_funding',
        external_funding_id: id
      };
      
      // Update otherDocuments - remove old file for this funding id and add new one
      setOtherDocuments(prev => {
        const filtered = prev.filter(doc => 
          !(doc.type === 'external_funding' && doc.external_funding_id === id)
        );
        return [...filtered, externalDoc];
      });
      
      console.log('External funding file added successfully');
    } else {
      console.error('Invalid file type for external funding:', file?.type);
      alert('กรุณาเลือกไฟล์ PDF เท่านั้น');
    }
  };

  // =================================================================
  // FORM VALIDATION
  // =================================================================

  // Validate form data
  const validateForm = async () => {
    const newErrors = {};
    
    // ข้อมูลพื้นฐาน
    if (!formData.year_id) newErrors.year_id = 'กรุณาเลือกปีงบประมาณ';
    if (!formData.author_status) newErrors.author_status = 'กรุณาเลือกสถานะผู้แต่ง';
    if (!formData.phone_number) newErrors.phone_number = 'กรุณากรอกเบอร์โทรศัพท์';
    
    // ข้อมูลบทความ
    if (!formData.article_title) newErrors.article_title = 'กรุณากรอกชื่อบทความ';
    if (!formData.journal_name) newErrors.journal_name = 'กรุณากรอกชื่อวารสาร';
    if (!formData.journal_quartile) newErrors.journal_quartile = 'กรุณาเลือก Journal Quartile';
    if (!formData.journal_month) newErrors.journal_month = 'กรุณาเลือกเดือนที่ตีพิมพ์';
    if (!formData.journal_year) newErrors.journal_year = 'กรุณากรอกปีที่ตีพิมพ์';
    
    // ข้อมูลธนาคาร
    if (!formData.bank_account) newErrors.bank_account = 'กรุณากรอกเลขบัญชีธนาคาร';
    if (!formData.bank_name) newErrors.bank_name = 'กรุณากรอกชื่อธนาคาร';
    
    // ตรวจสอบรูปแบบ
    if (formData.phone_number && !/^\d{3}-\d{3}-\d{4}$/.test(formData.phone_number)) {
      newErrors.phone_number = 'กรุณากรอกเบอร์โทรศัพท์ให้ถูกรูปแบบ (XXX-XXX-XXXX)';
    }

    if (formData.bank_account && (formData.bank_account.length < 10 || formData.bank_account.length > 15)) {
      newErrors.bank_account = 'เลขบัญชีธนาคารต้องมี 10-15 หลัก';
    }

    if (formData.journal_year && !validateYear(formData.journal_year)) {
      newErrors.journal_year = `กรุณากรอกปีระหว่าง 2000-${new Date().getFullYear() + 1}`;
    }

    // ตรวจสอบเอกสารแนบที่จำเป็น
    // Document type 2: Full reprint (บทความตีพิมพ์)
    if (!uploadedFiles[2]) {
      newErrors.file_2 = 'กรุณาแนบไฟล์บทความตีพิมพ์';
    }
    
    // Document type 3: Scopus-ISI (หลักฐานการจัดอันดับ)
    if (!uploadedFiles[3]) {
      newErrors.file_3 = 'กรุณาแนบไฟล์หลักฐานการจัดอันดับ Scopus-ISI';
    }
    
    // ตรวจสอบวงเงินค่าปรับปรุงและค่าตีพิมพ์
    if (formData.journal_quartile) {
      // หา year (พ.ศ.) จาก year_id
      const yearObj = years.find(y => y.year_id === formData.year_id);
      const targetYear = yearObj?.year || (new Date().getFullYear() + 543).toString();
      
      const feeErrors = await validateFees(
        formData.journal_quartile,
        formData.revision_fee,
        formData.publication_fee,
        targetYear
      );
      if (feeErrors.length > 0) {
        newErrors.fees_limit = feeErrors.join(', ');
      }
    }

    setErrors(newErrors);
    
    // Show error dialog if validation fails
    if (Object.keys(newErrors).length > 0) {
      // จัดกลุ่มข้อผิดพลาดตามหมวดหมู่
      let errorHTML = '<div class="text-left space-y-3">';
      
      // ข้อมูลพื้นฐาน
      const basicErrors = ['year_id', 'author_status', 'phone_number']
        .filter(field => newErrors[field])
        .map(field => `• ${newErrors[field]}`);
      
      if (basicErrors.length > 0) {
        errorHTML += '<div><strong>ข้อมูลพื้นฐาน:</strong><br>' + basicErrors.join('<br>') + '</div>';
      }
      
      // ข้อมูลบทความ
      const articleErrors = ['article_title', 'journal_name', 'journal_quartile', 'journal_month', 'journal_year']
        .filter(field => newErrors[field])
        .map(field => `• ${newErrors[field]}`);
      
      if (articleErrors.length > 0) {
        errorHTML += '<div><strong>ข้อมูลบทความ:</strong><br>' + articleErrors.join('<br>') + '</div>';
      }
      
      // ข้อมูลธนาคาร
      const bankErrors = ['bank_account', 'bank_name']
        .filter(field => newErrors[field])
        .map(field => `• ${newErrors[field]}`);
      
      if (bankErrors.length > 0) {
        errorHTML += '<div><strong>ข้อมูลธนาคาร:</strong><br>' + bankErrors.join('<br>') + '</div>';
      }
      
      // ค่าใช้จ่าย (เพิ่มใหม่)
      const feeErrors = ['fees_limit']
        .filter(field => newErrors[field])
        .map(field => `• ${newErrors[field]}`);
      
      if (feeErrors.length > 0) {
        errorHTML += '<div><strong>ค่าใช้จ่าย:</strong><br>' + feeErrors.join('<br>') + '</div>';
      }
      
      // เอกสารแนบ
      const fileErrors = ['file_2', 'file_3']
        .filter(field => newErrors[field])
        .map(field => `• ${newErrors[field]}`);
      
      if (fileErrors.length > 0) {
        errorHTML += '<div><strong>เอกสารแนบ:</strong><br>' + fileErrors.join('<br>') + '</div>';
      }
      
      errorHTML += '</div>';
      
      Swal.fire({
        icon: 'warning',
        title: 'ข้อมูลไม่ครบถ้วน',
        html: errorHTML,
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'ตกลง',
        width: '600px',
        showClass: {
          popup: 'swal2-show',
          backdrop: 'swal2-backdrop-show'
        },
        hideClass: {
          popup: 'swal2-hide',
          backdrop: 'swal2-backdrop-hide'
        }
      }).then(() => {
        // Scroll to first error after dialog closes
        scrollToFirstError(newErrors);
      });
      
      return false;
    }
    
    return true;
  };

  // =================================================================
  // DRAFT MANAGEMENT
  // =================================================================

  // Save draft
  const saveDraft = async () => {
    try {
      setSaving(true);
      
      // Show loading dialog
      Swal.fire({
        title: 'กำลังบันทึกร่าง...',
        allowOutsideClick: false,
        showConfirmButton: false,
        willOpen: () => {
          Swal.showLoading();
        }
      });

      // Wait briefly for UI update
      await new Promise(resolve => setTimeout(resolve, 500));

      // Save data to localStorage
      const saved = saveDraftToLocal({
        formData,
        coauthors,
        otherDocuments
      });

      Swal.close();

      if (saved) {
        Toast.fire({
          icon: 'success',
          title: 'บันทึกร่างเรียบร้อยแล้ว',
          html: '<small>ข้อมูลจะถูกเก็บไว้ 7 วัน</small>'
        });
      } else {
        throw new Error('ไม่สามารถบันทึกข้อมูลได้');
      }
      
    } catch (error) {
      console.error('Error saving draft:', error);
      Swal.close();
      
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถบันทึกร่างได้ อาจเนื่องจากพื้นที่จัดเก็บเต็ม',
        confirmButtonColor: '#3085d6'
      });
    } finally {
      setSaving(false);
    }
  };

  // Delete draft
  const deleteDraft = async () => {
    const result = await Swal.fire({
      title: 'ยืนยันการลบร่าง?',
      text: 'ข้อมูลที่บันทึกไว้จะถูกลบทั้งหมด',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ลบร่าง',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6'
    });

    if (result.isConfirmed) {
      deleteDraftFromLocal();
      resetForm();
      
      Toast.fire({
        icon: 'success',
        title: 'ลบร่างเรียบร้อยแล้ว'
      });
    }
  };

  // Reset form to initial state
  const resetForm = () => {
    setFormData({
      year_id: years.find(y => y.year === '2568')?.year_id || null,
      author_status: '',
      article_title: '',
      journal_name: '',
      journal_issue: '',
      journal_pages: '',
      journal_month: '',
      journal_year: new Date().getFullYear().toString(),
      journal_url: '',
      doi: '',
      article_online_db: '',
      journal_quartile: '',
      in_isi: false,
      in_scopus: false,
      article_type: '',
      journal_type: '',
      reward_amount: 0,
      revision_fee: 0,
      publication_fee: 0,
      external_funding_amount: 0,
      total_amount: 0,
      bank_account: '',
      bank_name: '',
      phone_number: '',
      university_ranking: '',
      has_university_fund: '',
      university_fund_ref: ''
    });
    setCoauthors([]);
    setUploadedFiles({});
    setOtherDocuments([]);
    setExternalFundings([]);
    setErrors({});
    setCurrentSubmissionId(null);
    deleteDraftFromLocal();
    setMergedPdfFile(null);
  };

  // =================================================================
  // SUBMISSION CONFIRMATION
  // =================================================================

  // Show submission confirmation dialog
  const showSubmissionConfirmation = async () => {
    const publicationDate = formData.journal_month && formData.journal_year 
      ? `${formData.journal_month}/${formData.journal_year}` 
      : '-';

    // Collect all files for display and PDF merging
    const allFiles = [];
    const allFilesList = [];
    
    // Files from uploadedFiles
    Object.entries(uploadedFiles).forEach(([key, file]) => {
      if (file) {
        const docType = documentTypes.find(dt => dt.id == key);
        allFiles.push(file);
        allFilesList.push({
          name: file.name,
          type: docType?.name || 'เอกสาร',
          size: file.size
        });
      }
    });
    
    // Files from otherDocuments
    if (otherDocuments && Array.isArray(otherDocuments) && otherDocuments.length > 0) {
      otherDocuments.forEach(doc => {
        const file = doc.file || doc;
        if (file && (file.name || doc.name)) {
          allFiles.push(file);
          allFilesList.push({
            name: file.name || doc.name,
            type: 'เอกสารอื่นๆ',
            size: file.size || doc.size || 0
          });
        }
      });
    }
    
    // Files from external funding
    externalFundings.forEach(funding => {
      if (funding.file) {
        allFiles.push(funding.file);
        allFilesList.push({
          name: funding.file.name,
          type: 'หลักฐานทุนภายนอก',
          size: funding.file.size
        });
      }
    });

    // Check if files exist
    if (allFiles.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'ไม่พบเอกสารแนบ',
        text: 'กรุณาแนบไฟล์บทความอย่างน้อย 1 ไฟล์',
        confirmButtonColor: '#3085d6'
      });
      return false;
    }

    // Create merged PDF
    let mergedPdfBlob = null;
    let mergedPdfUrl = null;
    let previewViewed = false;

    try {
      // Show loading while merging PDF
      Swal.fire({
        title: 'กำลังเตรียมเอกสาร...',
        html: 'กำลังรวมไฟล์ PDF ทั้งหมด',
        allowOutsideClick: false,
        showConfirmButton: false,
        willOpen: () => {
          Swal.showLoading();
        }
      });

      // Filter PDF files only
      const pdfFiles = allFiles.filter(file => file.type === 'application/pdf');
      
      if (pdfFiles.length > 0) {
        if (pdfFiles.length > 1) {
          // Merge multiple PDFs
          mergedPdfBlob = await mergePDFs(pdfFiles);
          const mergedFile = new File([mergedPdfBlob], 'merged_documents.pdf', { type: 'application/pdf' });
          setMergedPdfFile(mergedFile);
        } else {
          // Use single PDF
          mergedPdfBlob = pdfFiles[0];
          setMergedPdfFile(pdfFiles[0]);
        }
        mergedPdfUrl = URL.createObjectURL(mergedPdfBlob);
      }

      Swal.close();
    } catch (error) {
      console.error('Error creating merged PDF:', error);
      Swal.close();
      setMergedPdfFile(null);
      Swal.fire({
        icon: 'error',
        title: 'ไม่สามารถรวมไฟล์ PDF ได้',
        text: 'กรุณาตรวจสอบไฟล์และลองใหม่อีกครั้ง',
        confirmButtonColor: '#3085d6'
      });
      return false;
    }

    const summaryHTML = `
      <div class="text-left space-y-4">
        <div class="bg-gray-50 p-4 rounded-lg">
          <h4 class="font-semibold text-gray-700 mb-2">ข้อมูลบทความ</h4>
          <div class="space-y-2 text-sm">
            <p><span class="font-medium">ชื่อบทความ:</span> ${formData.article_title || '-'}</p>
            <p><span class="font-medium">วารสาร:</span> ${formData.journal_name || '-'}</p>
            <p><span class="font-medium">Quartile:</span> ${formData.journal_quartile || '-'}</p>
            <p><span class="font-medium">วันที่ตีพิมพ์:</span> ${publicationDate}</p>
            <p><span class="font-medium">DOI:</span> ${formData.doi || '-'}</p>
          </div>
        </div>

        <div class="bg-blue-50 p-4 rounded-lg">
          <h4 class="font-semibold text-blue-700 mb-2">ข้อมูลผู้แต่ง</h4>
          <div class="space-y-2 text-sm">
            <p><span class="font-medium">สถานะผู้แต่ง:</span> ${
              formData.author_status === 'first_author' ? 'ผู้แต่งหลัก' :
              formData.author_status === 'corresponding_author' ? 'Corresponding Author' : '-'
            }</p>
            <p><span class="font-medium">จำนวนผู้แต่งร่วม:</span> ${coauthors.length} คน</p>
            ${coauthors.length > 0 ? `
              <div class="mt-2">
                <span class="font-medium">รายชื่อผู้แต่งร่วม:</span>
                <ul class="ml-4 mt-1">
                  ${coauthors.map(author => `<li>• ${author.user_fname} ${author.user_lname}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
          </div>
        </div>

        <div class="bg-green-50 p-4 rounded-lg">
          <h4 class="font-semibold text-green-700 mb-2">จำนวนเงินที่ขอเบิก</h4>
          <div class="space-y-2 text-sm">
            <p><span class="font-medium">เงินรางวัลการตีพิมพ์:</span> ${formatCurrency(formData.publication_reward || 0)} บาท</p>
            <p><span class="font-medium">ค่าปรับปรุงบทความ:</span> ${formatCurrency(formData.revision_fee || 0)} บาท</p>
            <p><span class="font-medium">ค่าการตีพิมพ์:</span> ${formatCurrency(formData.publication_fee || 0)} บาท</p>
            
            ${(externalFundings && externalFundings.length > 0) ? `
              <div class="mt-3 pt-2 border-t border-green-200">
                <span class="font-medium text-green-800">รายการทุนภายนอก:</span>
                <ul class="ml-4 mt-1 space-y-1">
                  ${externalFundings.map(funding => {
                    const fundName = funding?.fundName || funding?.file?.name || 'ไม่ระบุชื่อทุน';
                    const amount = parseFloat(funding?.amount || 0);
                    return `<li class="text-xs">• ${fundName}: ${formatCurrency(amount)} บาท</li>`;
                  }).join('')}
                </ul>
                <p class="mt-2 text-sm"><span class="font-medium">รวมทุนภายนอก:</span> ${formatCurrency(formData.external_funding_amount || 0)} บาท</p>
              </div>
            ` : ''}
            
            <div class="mt-3 pt-3 border-t-2 border-green-300">
              <div class="bg-white p-3 rounded border">
                <p class="text-base font-bold text-green-800">
                  ยอดสุทธิที่เบิกจากวิทยาลัย: ${formatCurrency(formData.total_amount || 0)} บาท
                </p>
                <div class="text-xs text-gray-600 mt-1">
                  คำนวณจาก: เงินรางวัล + ค่าปรับปรุง + ค่าตีพิมพ์ - ทุนภายนอก
                </div>
                <div class="text-xs text-gray-600">
                  = ${formatCurrency(formData.publication_reward || 0)} + ${formatCurrency(formData.revision_fee || 0)} + ${formatCurrency(formData.publication_fee || 0)} - ${formatCurrency(formData.external_funding_amount || 0)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-yellow-50 p-4 rounded-lg">
          <h4 class="font-semibold text-yellow-700 mb-2">เอกสารแนบ</h4>
          <div class="space-y-3 text-sm">
            <div>
              <p class="font-medium mb-2">ไฟล์ทั้งหมด (${allFilesList.length} ไฟล์):</p>
              <div class="bg-white p-3 rounded border max-h-32 overflow-y-auto">
                <ul class="space-y-1">
                  ${allFilesList.map(file => `
                    <li class="flex justify-between items-center text-xs">
                      <span>📄 ${file.name}</span>
                      <span class="text-gray-500">${(file.size / 1024 / 1024).toFixed(2)} MB</span>
                    </li>
                  `).join('')}
                </ul>
              </div>
            </div>

            ${mergedPdfUrl ? `
              <div class="bg-blue-50 border border-blue-200 p-3 rounded">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="font-medium text-blue-800">📋 เอกสารรวม (PDF)</p>
                    <p class="text-xs text-blue-600">ไฟล์ PDF ทั้งหมดรวมเป็นไฟล์เดียว</p>
                  </div>
                  <button
                    id="preview-pdf-btn"
                    type="button"
                    class="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                  >
                    👀 ดูตัวอย่าง
                  </button>
                </div>
                <div id="preview-status" class="mt-2 text-xs">
                  <span class="text-red-600">⚠️ กรุณาดูตัวอย่างเอกสารก่อนส่งคำร้อง</span>
                </div>
              </div>
            ` : ''}
          </div>
        </div>

        ${formData.bank_account || formData.bank_name ? `
          <div class="bg-purple-50 p-4 rounded-lg">
            <h4 class="font-semibold text-purple-700 mb-2">ข้อมูลธนาคาร</h4>
            <div class="space-y-2 text-sm">
              <p><span class="font-medium">เลขบัญชี:</span> ${formData.bank_account || '-'}</p>
              <p><span class="font-medium">ธนาคาร:</span> ${formData.bank_name || '-'}</p>
            </div>
          </div>
        ` : ''}
      </div>
    `;

    // Show confirmation dialog
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
        width: '700px',
        customClass: {
          htmlContainer: 'text-left'
        },
        // Dynamic validation
        preConfirm: () => {
          if (mergedPdfUrl && !previewViewed) {
            Swal.showValidationMessage('กรุณาดูตัวอย่างเอกสารรวมก่อนส่งคำร้อง');
            return false;
          }
          return true;
        },
        didOpen: () => {
          // Add event listener for preview button
          const previewBtn = document.getElementById('preview-pdf-btn');
          const previewStatus = document.getElementById('preview-status');
          
          if (previewBtn && mergedPdfUrl) {
            previewBtn.addEventListener('click', () => {
              window.open(mergedPdfUrl, '_blank');
              previewViewed = true;
              
              // Update status
              if (previewStatus) {
                previewStatus.innerHTML = '<span class="text-green-600">✅ ดูตัวอย่างเอกสารแล้ว</span>';
              }
              
              // Change button color
              previewBtn.className = 'px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors';
              previewBtn.innerHTML = '✅ ดูแล้ว';
              
              // Hide validation message if visible
              const validationMessage = document.querySelector('.swal2-validation-message');
              if (validationMessage) {
                validationMessage.style.display = 'none';
              }
            });
          }
        },
        willClose: () => {
          // Clean up URL object when dialog closes
          if (mergedPdfUrl) {
            URL.revokeObjectURL(mergedPdfUrl);
          }
        }
      });
    };

    const result = await showDialog();
    return result.isConfirmed;
  };

  // =================================================================
  // MAIN SUBMISSION FUNCTION
  // =================================================================

  // Submit application
  const submitApplication = async () => {
    // Validate form first
    const isValid = await validateForm();

    if (!isValid) {
      return;
    }

    // Show confirmation dialog
    const confirmed = await showSubmissionConfirmation();
    if (!confirmed) {
      return;
    }

    try {
      setLoading(true);

      debugFileStates();

      // Show loading dialog
      Swal.fire({
        title: 'กำลังส่งคำร้อง...',
        html: 'กำลังเตรียมเอกสาร...',
        allowOutsideClick: false,
        showConfirmButton: false,
        willOpen: () => {
          Swal.showLoading();
        }
      });

      let submissionId = currentSubmissionId;
      const allFiles = [];

      // 1. Add main document files (document_type_id 1-10)
      Object.entries(uploadedFiles).forEach(([docTypeId, file]) => {
        if (file) {
          allFiles.push({
            file: file,
            document_type_id: parseInt(docTypeId),
            description: `${file.name} (ประเภท ${docTypeId})`
          });
        }
      });

      // 2. Add other documents (document_type_id = 11)
      if (otherDocuments && otherDocuments.length > 0) {
        otherDocuments.forEach((doc, index) => {
          const file = doc.file || doc;
          if (file) {
            allFiles.push({
              file: file,
              document_type_id: 11, // Other documents
              description: doc.description || `เอกสารอื่นๆ ${index + 1}: ${file.name}`
            });
          }
        });
      }

      // 3. Add external funding documents (document_type_id = 12)
      if (externalFundings && externalFundings.length > 0) {
        externalFundings.forEach((funding, index) => {
          if (funding.file) {
            allFiles.push({
              file: funding.file,
              document_type_id: 12, // External funding documents
              description: `เอกสารเบิกจ่ายภายนอก: ${funding.fundName || `ทุนที่ ${index + 1}`}`,
              external_funding_id: funding.id || null
            });
          }
        });
      }

      // Use merged PDF file if available
      if (mergedPdfFile) {
        allFiles.push({
          file: mergedPdfFile,
          document_type_id: 1, // Main article
          description: 'เอกสารรวม (Merged PDF)'
        });
      }

      console.log(`Total files to upload: ${allFiles.length}`);

      // Create submission if not exists
      if (!submissionId) {
        Swal.update({
          html: 'กำลังสร้างคำร้อง...'
        });

        const submissionResponse = await submissionAPI.create({
          submission_type: 'publication_reward',
          year_id: formData.year_id,
        });
        
        submissionId = submissionResponse.submission.submission_id;
        setCurrentSubmissionId(submissionId);
        console.log('Created submission:', submissionId);
      }

      // Step 2: Manage Users in Submission
      if (currentUser && (coauthors.length > 0 || formData.author_status)) {
        Swal.update({
          html: 'กำลังจัดการผู้แต่ง...'
        });

        try {
          console.log('=== Managing Submission Users via API ===');
          console.log('Current User:', currentUser);
          console.log('Co-authors:', coauthors);
          console.log('Author Status:', formData.author_status);

          // Prepare all users data
          const allUsers = [];

          // 1. Add Main Author if has author_status
          if (formData.author_status) {
            allUsers.push({
              user_id: currentUser.user_id,
              role: formData.author_status, // "first_author" or "corresponding_author"
              order_sequence: 1,
              is_active: true,
              is_primary: true
            });
          }

          // 2. Add Co-authors
          if (coauthors && coauthors.length > 0) {
            coauthors.forEach((coauthor, index) => {
              allUsers.push({
                user_id: coauthor.user_id,
                role: 'coauthor',
                order_sequence: index + 2,
                is_active: false,
                is_primary: false
              });
            });
          }

          console.log('All users to add:', allUsers);

          // Try batch API first
          let batchSuccess = false;
          
          try {
            const batchResult = await submissionUsersAPI.addMultipleUsers(submissionId, allUsers);
            console.log('✅ Batch API successful:', batchResult);
            
            if (batchResult.success) {
              batchSuccess = true;
              console.log('Successfully added users via batch API');
            }
          } catch (batchError) {
            console.log('Batch API failed, trying individual additions:', batchError);
          }

          // If batch fails, add individually
          if (!batchSuccess) {
            console.log('Adding users individually...');
            
            let successCount = 0;
            const errors = [];

            for (let i = 0; i < allUsers.length; i++) {
              const user = allUsers[i];
              
              try {
                console.log(`Adding user ${i + 1}:`, {
                  user_id: user.user_id,
                  role: user.role,
                  is_primary: user.is_primary
                });

                await submissionUsersAPI.addUser(submissionId, user);
                console.log(`✅ Added user ${i + 1} successfully`);
                successCount++;

              } catch (individualError) {
                console.error(`❌ Error adding user ${i + 1}:`, individualError);
                errors.push(`User ${user.user_id}: ${individualError.message}`);
              }
            }

            // Check results
            if (successCount === 0) {
              console.error('Failed to add any users:', errors);
              
              Toast.fire({
                icon: 'error',
                title: 'ไม่สามารถเพิ่มผู้แต่งได้',
                text: `Errors: ${errors.slice(0, 2).join('; ')}${errors.length > 2 ? '...' : ''}`
              });
            } else {
              console.log(`✅ Successfully added ${successCount}/${allUsers.length} users individually`);
              
              if (errors.length > 0) {
                console.warn('Some users failed:', errors);
                Toast.fire({
                  icon: 'warning',
                  title: `เพิ่มผู้แต่งได้ ${successCount}/${allUsers.length} คน`,
                  text: 'มีข้อผิดพลาดบางส่วน'
                });
              } else {
                Toast.fire({
                  icon: 'success',
                  title: `เพิ่มผู้แต่งสำเร็จ ${successCount} คน`
                });
              }
            }
          }

        } catch (error) {
          console.error('❌ Failed to manage submission users:', error);
          
          // Show warning but continue process
          Toast.fire({
            icon: 'warning',
            title: 'จัดการผู้แต่งไม่สมบูรณ์',
            text: `Warning: ${error.message}`
          });
        }
      }

      // Add publication details
      Swal.update({
        html: 'กำลังบันทึกรายละเอียดบทความ...'
      });

      const publicationDate = formData.journal_year && formData.journal_month 
        ? `${formData.journal_year}-${formData.journal_month.padStart(2, '0')}-01`
        : new Date().toISOString().split('T')[0];

      const publicationData = {
        article_title: formData.article_title,
        journal_name: formData.journal_name,
        publication_date: publicationDate,
        publication_type: formData.journal_type || 'journal',
        journal_quartile: formData.journal_quartile,
        impact_factor: parseFloat(formData.impact_factor) || null,
        doi: formData.doi || '',
        url: formData.journal_url || '',
        page_numbers: formData.journal_pages || '',
        volume_issue: formData.journal_issue || '',
        
        // แก้ไข indexing ให้รวมค่าจาก checkboxes
        indexing: [
          formData.in_isi && 'ISI',
          formData.in_scopus && 'Scopus',
          formData.in_web_of_science && 'Web of Science',
          formData.in_tci && 'TCI'
        ].filter(Boolean).join(', '),
        
        // ส่ง checkboxes แยกด้วย (เผื่อ backend ต้องการ)
        in_isi: formData.in_isi || false,
        in_scopus: formData.in_scopus || false,
        in_web_of_science: formData.in_web_of_science || false,
        in_tci: formData.in_tci || false,
        
        // Reward and calculations
        reward_amount: parseFloat(formData.publication_reward) || 0,
        revision_fee: parseFloat(formData.revision_fee) || 0,
        publication_fee: parseFloat(formData.publication_fee) || 0,
        external_funding_amount: parseFloat(formData.external_funding_amount) || 0,
        total_amount: parseFloat(formData.total_amount) || 0,
        
        author_count: coauthors.length + 1,
        is_corresponding_author: formData.author_status === 'corresponding_author',
        author_status: formData.author_status,
        
        // Bank info
        bank_account: formData.bank_account,
        bank_name: formData.bank_name,
        bank_account_name: formData.bank_account_name || '',
        phone_number: formData.phone_number || '',
        
        // Additional info - ใช้ชื่อที่ตรงกับ database
        has_university_funding: formData.has_university_fund || 'no',
        funding_references: formData.university_fund_ref || '',
        university_rankings: formData.university_ranking || '',
        
        // Other
        announce_reference_number: formData.announce_reference_number || ''
      };

        // Debug: ตรวจสอบข้อมูลก่อนส่ง
        console.log('=== DEBUG BEFORE SENDING ===');
        console.log('formData values:');
        console.log('- has_university_fund:', formData.has_university_fund);
        console.log('- university_fund_ref:', formData.university_fund_ref);
        console.log('- university_ranking:', formData.university_ranking);

        console.log('\npublicationData values:');
        console.log('- has_university_funding:', publicationData.has_university_funding);
        console.log('- funding_references:', publicationData.funding_references);
        console.log('- university_rankings:', publicationData.university_rankings);

        console.log('\nFull publicationData:', JSON.stringify(publicationData, null, 2));

        try {
          await publicationDetailsAPI.add(submissionId, publicationData);
          console.log('Publication details saved successfully');
        } catch (error) {
        console.error('Failed to save publication details:', error);
        
        // Show detailed error
        Swal.fire({
          icon: 'error',
          title: 'ไม่สามารถบันทึกรายละเอียดบทความได้',
          text: `Error: ${error.message}`,
          confirmButtonColor: '#ef4444'
        });
        return; // Stop process
      }

      // Upload files
      if (allFiles.length > 0) {
        Swal.update({
          html: `กำลังอัปโหลดไฟล์... (0/${allFiles.length})`
        });

        console.log('Starting file upload process...');

        for (let i = 0; i < allFiles.length; i++) {
          const fileData = allFiles[i];
          
          try {
            console.log(`Uploading file ${i + 1}:`, {
              name: fileData.file.name,
              size: fileData.file.size,
              type: fileData.file.type,
              document_type_id: fileData.document_type_id,
              description: fileData.description
            });

            // Upload file
            const uploadResponse = await fileAPI.uploadFile(fileData.file);
            console.log(`File ${i + 1} upload response:`, uploadResponse);
            
            if (!uploadResponse.success || !uploadResponse.file || !uploadResponse.file.file_id) {
              throw new Error('Upload response missing file_id');
            }

            // Prepare document attachment data
            const attachData = {
              file_id: uploadResponse.file.file_id,
              document_type_id: fileData.document_type_id,
              description: fileData.description,
              display_order: i + 1
            };

            // Add special data for external funding documents
            if (fileData.document_type_id === 12 && fileData.external_funding_id) {
              attachData.external_funding_id = fileData.external_funding_id;
            }

            console.log(`Attaching document ${i + 1}:`, attachData);
            
            const attachResponse = await documentAPI.attachDocument(submissionId, attachData);
            console.log(`Document ${i + 1} attach response:`, attachResponse);

            if (!attachResponse.success) {
              throw new Error(`Failed to attach document: ${attachResponse.message || 'Unknown error'}`);
            }

            // Update progress
            Swal.update({
              html: `กำลังอัปโหลดไฟล์... (${i + 1}/${allFiles.length})`
            });
            
          } catch (error) {
            console.error(`Error processing file ${fileData.file.name}:`, error);
            
            // Show detailed error
            Swal.fire({
              icon: 'error',
              title: 'ไม่สามารถอัปโหลดไฟล์ได้',
              html: `
                <div class="text-left">
                  <p><strong>ไฟล์:</strong> ${fileData.file.name}</p>
                  <p><strong>ประเภท:</strong> ${getDocumentTypeName(fileData.document_type_id)}</p>
                  <p><strong>ข้อผิดพลาด:</strong> ${error.message}</p>
                  <p class="text-sm text-gray-600 mt-2">กรุณาตรวจสอบไฟล์และลองใหม่อีกครั้ง</p>
                </div>
              `,
              confirmButtonColor: '#ef4444'
            });
            throw error; // Stop process
          }
        }

        console.log('All files uploaded and attached successfully');
      } else {
        console.log('No files to upload');
      }

      // Submit the application
      Swal.update({
        html: 'กำลังส่งคำร้อง...'
      });

      await submissionAPI.submitSubmission(submissionId);

      // Delete draft from localStorage
      deleteDraftFromLocal();

      const fileCounts = getFileCountByType();

      // Show success message
      Swal.fire({
        icon: 'success',
        title: 'ส่งคำร้องสำเร็จ!',
        html: `
          <div class="text-left">
            <p><strong>รหัสคำร้อง:</strong> ${submissionId}</p>
            <p><strong>ไฟล์ที่แนบ:</strong> ${fileCounts.summary}</p>
            <div class="mt-2 text-sm text-gray-600">
              <ul class="list-disc list-inside">
                ${fileCounts.main > 0 ? `<li>เอกสารหลัก: ${fileCounts.main} ไฟล์</li>` : ''}
                ${fileCounts.other > 0 ? `<li>เอกสารอื่นๆ: ${fileCounts.other} ไฟล์</li>` : ''}
                ${fileCounts.external > 0 ? `<li>เอกสารเบิกจ่ายภายนอก: ${fileCounts.external} ไฟล์</li>` : ''}
              </ul>
            </div>
            <p class="text-green-600 mt-3">ระบบจะแจ้งผลการพิจารณาผ่านอีเมล</p>
          </div>
        `,
        confirmButtonColor: '#10b981',
        confirmButtonText: 'เรียบร้อย',
        width: '500px'
      }).then(() => {
        resetForm();
        
        if (onNavigate) {
          onNavigate('applications');
        }
      });

    } catch (error) {
      console.error('Error submitting application:', error);
      
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: error.message || 'ไม่สามารถส่งคำร้องได้ กรุณาลองใหม่อีกครั้ง',
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setLoading(false);
    }
  };

  // =================================================================
  // LOADING STATE
  // =================================================================

  if (loading && !years.length) {
    return (
      <PageLayout
        title="แบบฟอร์มขอเบิกเงินรางวัลการตีพิมพ์เผยแพร่ผลงานวิจัยที่ได้รับการตีพิมพ์ในสาขาวิทยาศาสตร์และเทคโนโลยี"
        subtitle="กำลังโหลดข้อมูล..."
        icon={Award}
      >
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </PageLayout>
    );
  }

  // =================================================================
  // MAIN RENDER
  // =================================================================

  return (
    <PageLayout
      title="แบบฟอร์มขอเบิกเงินรางวัลการตีพิมพ์เผยแพร่ผลงานวิจัยที่ได้รับการตีพิมพ์ในสาขาวิทยาศาสตร์และเทคโนโลยี"
      subtitle="สำหรับขอเบิกเงินรางวัลและค่าใช้จ่ายในการตีพิมพ์บทความวิชาการ"
      icon={Award}
      breadcrumbs={[
        { label: "หน้าแรก", href: "/teacher" },
        { label: "ขอเบิกเงินรางวัลการตีพิมพ์" }
      ]}
    >
      <form className="space-y-6">
        {/* =================================================================
        // BASIC INFORMATION SECTION
        // ================================================================= */}
        <SimpleCard title="ข้อมูลพื้นฐาน (Basic Information)" icon={FileText}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Applicant Name - Read Only */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ชื่อผู้ยื่นคำร้อง (Applicant Name)
              </label>
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-md text-gray-800">
                {currentUser ? `${currentUser.position_name} ${currentUser.user_fname} ${currentUser.user_lname}` : 'กำลังโหลด...'}
              </div>
            </div>

            {/* Budget Year */}
            <div id="field-year_id">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ปีงบประมาณ (Budget Year) <span className="text-red-500">*</span>
              </label>
              <select
                name="year_id"
                value={formData.year_id || ''}
                onChange={handleInputChange}
                className={`w-full text-gray-600 px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500 ${
                  errors.year_id ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="" disabled={formData.year_id !== ''} hidden={formData.year_id !== ''}>
                  เลือกปีงบประมาณ (Select Budget Year)
                </option>
                {years.map(year => (
                  <option key={year.year_id} value={year.year_id}>
                    ปีงบประมาณ {year.year}
                  </option>
                ))}
              </select>
              {errors.year_id && (
                <p className="text-red-500 text-sm mt-1">{errors.year_id}</p>
              )}
            </div>

            {/* Author Status */}
            <div id="field-author_status">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                สถานะผู้ยื่น (Author Status) <span className="text-red-500">*</span>
              </label>
              <select
                name="author_status"
                value={formData.author_status}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500 ${
                  errors.author_status ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="" disabled={formData.author_status !== ''} hidden={formData.author_status !== ''}>
                  เลือกสถานะ (Select Status)
                </option>
                {availableAuthorStatuses
                  .filter(status => status !== 'co_author')
                  .map(status => (
                    <option key={status} value={status}>
                      {status === 'first_author' ? 'ผู้แต่งหลัก (First Author)' :
                      status === 'corresponding_author' ? 'ผู้แต่งที่รับผิดชอบบทความ (Corresponding Author)' : status}
                    </option>
                  ))}
              </select>
              {errors.author_status && (
                <p className="text-red-500 text-sm mt-1">{errors.author_status}</p>
              )}
            </div>

            {/* Phone Number */}
            <div id="field-phone_number">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                เบอร์โทรศัพท์ (Phone Number) <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleInputChange}
                onKeyDown={handlePhoneKeyDown}
                placeholder="081-234-5678"
                maxLength="12"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500 ${
                  errors.phone_number ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              <p className="text-xs text-gray-500 mt-1">รูปแบบ (Format): XXX-XXX-XXXX</p>
              {errors.phone_number && (
                <p className="text-red-500 text-sm mt-1">{errors.phone_number}</p>
              )}
            </div>
          </div>
        </SimpleCard>

        {/* =================================================================
        // ARTICLE INFORMATION SECTION
        // ================================================================= */}
        <SimpleCard title="ข้อมูลบทความ (Article Information)" icon={FileText}>
          <div className="space-y-4">
            {/* Article Title */}
            <div id="field-article_title">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ชื่อบทความ (Article Title) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="article_title"
                value={formData.article_title}
                onChange={handleInputChange}
                placeholder="กรอกชื่อบทความภาษาอังกฤษ (Enter article title in English)"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500 ${
                  errors.article_title ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.article_title && (
                <p className="text-red-500 text-sm mt-1">{errors.article_title}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Journal Name */}
              <div id="field-journal_name">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ชื่อวารสาร (Journal Name) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="journal_name"
                  value={formData.journal_name}
                  onChange={handleInputChange}
                  placeholder="ชื่อวารสารที่ตีพิมพ์ (Journal name)"
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500 ${
                    errors.journal_name ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.journal_name && (
                  <p className="text-red-500 text-sm mt-1">{errors.journal_name}</p>
                )}
              </div>

              {/* Quartile */}
              <div id="field-journal_quartile">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ควอร์ไทล์ (Quartile) <span className="text-red-500">*</span>
                </label>
                <select
                  name="journal_quartile"
                  value={formData.journal_quartile}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500 ${
                    errors.journal_quartile ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="" disabled={formData.journal_quartile !== ''} hidden={formData.journal_quartile !== ''}>
                    เลือกควอร์ไทล์ (Select Quartile)
                  </option>
                  {availableQuartiles.map(quartile => {
                    // Check if this quartile allows fees from config
                    const hasConfig = quartileConfigs[quartile];
                    const allowsFees = hasConfig && hasConfig.isActive;
                    
                    return (
                      <option key={quartile} value={quartile}>
                        {quartile === 'T5' ? 'Top 5%' :
                        quartile === 'T10' ? 'Top 10%' :
                        quartile === 'Q1' ? 'Quartile 1' :
                        quartile === 'Q2' ? 'Quartile 2' :
                        quartile === 'Q3' ? 'Quartile 3' :
                        quartile === 'Q4' ? 'Quartile 4' :
                        quartile === 'TCI' ? 'TCI กลุ่มที่ 1 (TCI Group 1)' : quartile}
                        {!allowsFees && ' (ไม่สามารถเบิกค่าใช้จ่าย)'}
                      </option>
                    );
                  })}
                </select>
                {errors.journal_quartile && (
                  <p className="text-red-500 text-sm mt-1">{errors.journal_quartile}</p>
                )}
              </div>

              {/* Volume/Issue */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Volume/Issue
                </label>
                <input
                  type="text"
                  name="journal_issue"
                  value={formData.journal_issue}
                  onChange={handleInputChange}
                  placeholder="เช่น (e.g.) Vol.10, No.2"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Pages */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  หน้า (Pages)
                </label>
                <input
                  type="text"
                  name="journal_pages"
                  value={formData.journal_pages}
                  onChange={handleInputChange}
                  placeholder="เช่น (e.g.) 123-145"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Publication Month */}
              <div id="field-journal_month">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  เดือนที่ตีพิมพ์ (Publication Month) <span className="text-red-500">*</span>
                </label>
                <select
                  name="journal_month"
                  value={formData.journal_month}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500 ${
                    errors.journal_month ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="" disabled={formData.journal_month !== ''} hidden={formData.journal_month !== ''}>
                    เลือกเดือน (Select Month)
                  </option>
                  <option value="01">มกราคม (January)</option>
                  <option value="02">กุมภาพันธ์ (February)</option>
                  <option value="03">มีนาคม (March)</option>
                  <option value="04">เมษายน (April)</option>
                  <option value="05">พฤษภาคม (May)</option>
                  <option value="06">มิถุนายน (June)</option>
                  <option value="07">กรกฎาคม (July)</option>
                  <option value="08">สิงหาคม (August)</option>
                  <option value="09">กันยายน (September)</option>
                  <option value="10">ตุลาคม (October)</option>
                  <option value="11">พฤศจิกายน (November)</option>
                  <option value="12">ธันวาคม (December)</option>
                </select>
                {errors.journal_month && (
                  <p className="text-red-500 text-sm mt-1">{errors.journal_month}</p>
                )}
              </div>

              {/* Publication Year */}
              <div id="field-journal_year">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ปีที่ตีพิมพ์ (Publication Year) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="journal_year"
                  value={formData.journal_year}
                  onChange={handleInputChange}
                  placeholder={new Date().getFullYear().toString()}
                  maxLength="4"
                  inputMode="numeric"
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500 ${
                    errors.journal_year ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <p className="text-xs text-gray-500 mt-1">ปี ค.ศ. (A.D.) (2000-{new Date().getFullYear() + 1})</p>
                {errors.journal_year && (
                  <p className="text-red-500 text-sm mt-1">{errors.journal_year}</p>
                )}
              </div>
            </div>

            {/* DOI */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                DOI (Digital Object Identifier)
              </label>
              <input
                type="text"
                name="doi"
                value={formData.doi}
                onChange={handleInputChange}
                placeholder="เช่น (e.g.) 10.1016/j.example.2023.01.001"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL ของบทความ (Article URL)
              </label>
              <input
                type="url"
                name="journal_url"
                value={formData.journal_url}
                onChange={handleInputChange}
                placeholder="https://..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Database checkboxes - Updated per requirement */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                ฐานข้อมูลที่ปรากฏ (Database Indexed)
              </label>
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="in_isi"
                    checked={formData.in_isi}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  ISI
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="in_web_of_science"
                    checked={formData.in_web_of_science || false}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  Web of Science
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="in_scopus"
                    checked={formData.in_scopus}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  Scopus
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="in_tci"
                    checked={formData.in_tci || false}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  TCI
                </label>
              </div>
            </div>
          </div>
        </SimpleCard>

        {/* =================================================================
        // CO-AUTHORS SECTION
        // ================================================================= */}
        <SimpleCard title="ผู้ร่วมวิจัย (Co-Author)" icon={Users}>
          <div className="space-y-4">
            {/* Co-author selection dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                เพิ่มผู้ร่วมวิจัย (Add Co-Author)
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => {
                  const userId = parseInt(e.target.value);
                  if (userId) {
                    const user = users.find(u => u.user_id === userId);
                    if (user) {
                      handleAddCoauthor(user);
                      e.target.value = ''; // Reset dropdown
                    }
                  }
                }}
              >
                <option value="">เลือกผู้ร่วมวิจัย... (Select Co-Author...)</option>
                {users
                  .filter(user => {
                    // Filter out current user
                    if (currentUser && user.user_id === currentUser.user_id) {
                      return false;
                    }
                    // Filter out already selected co-authors
                    if (coauthors.some(c => c.user_id === user.user_id)) {
                      return false;
                    }
                    return true;
                  })
                  .map(user => (
                    <option 
                      key={user.user_id} 
                      value={user.user_id}
                    >
                      {user.user_fname} {user.user_lname} ({user.email})
                    </option>
                  ))}
              </select>
            </div>

            {/* Available co-authors count */}
            <p className="text-xs text-gray-500">
              สามารถเลือกได้ (Available): {users.filter(u => 
                (!currentUser || u.user_id !== currentUser.user_id) && 
                !coauthors.some(c => c.user_id === u.user_id)
              ).length} คน (persons)
            </p>

            {/* Selected co-authors list */}
            {coauthors.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ผู้ร่วมวิจัยที่เลือก (Selected Co-researchers) ({coauthors.length} คน/persons)
                </label>
                <div className="space-y-2">
                  {coauthors.map((coauthor, index) => (
                    <div
                      key={coauthor.user_id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-gray-600">
                          {index + 1}.
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {coauthor.user_fname} {coauthor.user_lname}
                          </p>
                          <p className="text-xs text-gray-500">
                            {coauthor.email}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCoauthor(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {coauthors.length === 0 && (
              <div className="text-center py-6 text-gray-500">
                <Users className="mx-auto h-8 w-8 mb-2 text-gray-400" />
                <p className="text-sm">ยังไม่มีผู้ร่วมวิจัย (No co-researchers yet)</p>
                <p className="text-xs text-gray-400 mt-1">กรุณาเลือกผู้ร่วมวิจัยจากรายการด้านบน (Please select co-researchers from the list above)</p>
              </div>
            )}
          </div>
        </SimpleCard>

        {/* =================================================================
        // REWARD CALCULATION SECTION
        // ================================================================= */}
        <SimpleCard title="การคำนวณเงินรางวัล (Reward Calculation)" icon={Calculator}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              เงินรางวัล (บาท)
              <br />
              <span className="text-xs font-normal text-gray-500">Reward Amount (Baht)</span>
            </label>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-2xl font-semibold text-gray-800">
                {formatCurrency(formData.publication_reward || 0)}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              คำนวณอัตโนมัติจากสถานะผู้แต่งและ Quartile
              <br />
              (Automatically calculated based on author status and quartile)
            </p>
          </div>
        </SimpleCard>

        {/* =================================================================
        // FEES AND FUNDING SECTION
        // ================================================================= */}
        <SimpleCard title="ค่าปรับปรุงบทความและค่าธรรมเนียมการตีพิมพ์ (Manuscript Editing Fee and Page Charge)" icon={Award}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 divide-x divide-gray-200">
            {/* Left side - Revision fee, Publication fee, and College total */}
            <div className="space-y-6 lg:pr-6">
              {/* Show fee limit info */}
              {formData.journal_quartile && feeLimits.total > 0 && (
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-sm font-medium text-gray-700">
                    วงเงินค่าปรับปรุงและค่าตีพิมพ์รวมกันไม่เกิน (Maximum total for editing and page charge): 
                    <span className="text-blue-700 font-bold ml-1">
                      {formatCurrency(feeLimits.total)} บาท (Baht)
                    </span>
                  </p>
                  {quartileConfigs[formData.journal_quartile]?.description && (
                    <p className="text-xs text-gray-600 mt-1">
                      {quartileConfigs[formData.journal_quartile].description}
                    </p>
                  )}
                </div>
              )}

              {formData.journal_quartile && feeLimits.total === 0 && (
                <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                  <p className="text-sm font-medium text-red-600">
                    ควอร์ไทล์นี้ไม่สามารถเบิกค่าปรับปรุงและค่าตีพิมพ์ได้
                    <br />
                    (This quartile is not eligible for editing fee and page charge reimbursement)
                  </p>
                </div>
              )}

              {/* Revision Fee */}
              <div id="field-fees_limit">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ค่าปรับปรุงบทความ (บาท)
                    <br />
                    <span className="text-xs font-normal text-gray-600">Manuscript Editing Fee (Baht)</span>
                  </label>
                <div className={`bg-gray-50 rounded-lg p-3 ${feeError ? 'border-2 border-red-500' : ''}`}>
                  <input
                    type="number"
                    value={formData.revision_fee || ''}
                    onChange={async (e) => {
                      if (feeLimits.total === 0) {
                        e.preventDefault();
                        return;
                      }
                      const newValue = e.target.value;
                      setFormData(prev => ({ ...prev, revision_fee: newValue }));
                      
                      // Validate fees in real-time
                      await validateFeesRealtime(newValue, formData.publication_fee, formData.journal_quartile, feeLimits.total, setFeeError);
                    }}
                    disabled={!formData.journal_quartile || feeLimits.total === 0}
                    min="0"
                    placeholder="0"
                    className={`text-2xl font-semibold text-gray-800 w-full bg-transparent border-none focus:outline-none ${
                      (!formData.journal_quartile || feeLimits.total === 0) ? 'cursor-not-allowed opacity-50' : ''
                    }`}
                  />
                </div>
              </div>

              {/* Publication Fee */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ค่าธรรมเนียมการตีพิมพ์ (บาท)
                  <br />
                  <span className="text-xs font-normal text-gray-600">Page Charge (Baht)</span>
                </label>
                <div className={`bg-gray-50 rounded-lg p-3 ${feeError ? 'border-2 border-red-500' : ''}`}>
                  <input
                    type="number"
                    value={formData.publication_fee || ''}
                    onChange={async (e) => {
                      if (feeLimits.total === 0) {
                        e.preventDefault();
                        return;
                      }
                      const newValue = e.target.value;
                      setFormData(prev => ({ ...prev, publication_fee: newValue }));
                      
                      // Validate fees in real-time
                      await validateFeesRealtime(formData.revision_fee, newValue, formData.journal_quartile, feeLimits.total, setFeeError);
                    }}
                    disabled={!formData.journal_quartile || feeLimits.total === 0}
                    min="0"
                    placeholder="0"
                    className={`text-2xl font-semibold text-gray-800 w-full bg-transparent border-none focus:outline-none ${
                      (!formData.journal_quartile || feeLimits.total === 0) ? 'cursor-not-allowed opacity-50' : ''
                    }`}
                  />
                </div>
              </div>

              {/* Error message */}
              {(feeError || errors.fees) && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-600 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {feeError || errors.fees}
                  </p>
                  {formData.journal_quartile && feeLimits.total > 0 && (
                    <p className="text-xs text-red-500 mt-1">
                      ใช้ไปแล้ว (Used): {formatCurrency((parseFloat(formData.revision_fee) || 0) + (parseFloat(formData.publication_fee) || 0))} บาท (Baht)
                    </p>
                  )}
                </div>
              )}

              {/* College Total */}
              <div className="mt-8">
                <h4 className="text-base font-medium text-gray-900 mb-3">
                  รวมเบิกจากวิทยาลัยการคอม
                  <br />
                  <span className="text-sm font-normal text-gray-600">Total Reimbursement from CP-KKU</span>
                </h4>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm text-gray-700">จำนวน (Amount)</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {formatCurrency(formData.total_amount || 0)}
                  </span>
                  <span className="text-sm text-gray-700">บาท (Baht)</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  = เงินรางวัล (Reward) ({formatCurrency(formData.publication_reward || 0)}) 
                  + ค่าปรับปรุง (Editing) ({formatCurrency(formData.revision_fee || 0)}) 
                  + ค่าตีพิมพ์ (Page Charge) ({formatCurrency(formData.publication_fee || 0)}) 
                  - ทุนภายนอก (External Funding) ({formatCurrency(formData.external_funding_amount || 0)})
                </div>
              </div>
            </div>

            {/* Right side - External funding table */}
            <div className="lg:pl-6">
              <h4 className="font-medium text-gray-900 mb-4">
                รายการที่มหาวิทยาลัยหรือหน่วยงานภายนอกสนับสนุน
                <br />
                <span className="text-sm font-normal text-gray-600">External Funding Sources</span>
              </h4>
              
              {/* External funding table */}
              <div className="overflow-hidden rounded-lg border border-blue-200">
                <table className="w-full">
                  <thead>
                    <tr className="bg-blue-50">
                      <th className="border-b border-r border-blue-200 px-3 py-2 text-sm font-medium text-gray-700 text-center" style={{width: '60px'}}>
                        ลำดับ
                        <br />
                        <span className="text-xs font-normal">No.</span>
                      </th>
                      <th className="border-b border-r border-blue-200 px-3 py-2 text-sm font-medium text-gray-700 text-center">
                        ชื่อทุน
                        <br />
                        <span className="text-xs font-normal">Fund Name</span>
                      </th>
                      <th className="border-b border-blue-200 px-3 py-2 text-sm font-medium text-gray-700 text-center" style={{width: '120px'}}>
                        จำนวน
                        <br />
                        <span className="text-xs font-normal">Amount</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {(!formData.journal_quartile || feeLimits.total === 0) ? (
                      <tr>
                        <td colSpan="3" className="px-4 py-8 text-center text-gray-500">
                          <div className="text-sm">
                            ไม่สามารถเพิ่มทุนภายนอกได้
                            <br />
                            <span className="text-xs">
                              (External funding not available for this quartile)
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : externalFundings.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="px-4 py-8 text-center text-gray-500">
                          ยังไม่มีข้อมูล (No data)
                        </td>
                      </tr>
                    ) : (
                      externalFundings.map((funding, index) => (
                        <tr key={funding.id} className={index < externalFundings.length - 1 ? 'border-b border-blue-200' : ''}>
                          <td className="border-r border-blue-200 px-3 py-2 text-center text-sm">
                            {index + 1}
                          </td>
                          <td className="border-r border-blue-200 px-3 py-2 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-700">{funding.fundName || funding.file?.name || 'แนบไฟล์หลักฐาน (Attach File)'}</span>
                              <label className="cursor-pointer text-blue-500 hover:text-blue-700">
                                <input
                                  type="file"
                                  accept=".pdf"
                                  onChange={(e) => handleExternalFundingFileChange(funding.id, e.target.files[0])}
                                  className="hidden"
                                />
                                <Upload className="h-4 w-4" />
                              </label>
                              {funding.file && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const url = URL.createObjectURL(funding.file);
                                    window.open(url, '_blank');
                                  }}
                                  className="text-blue-500 hover:text-blue-700"
                                  title="ดูไฟล์ (View file)"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveExternalFunding(funding.id)}
                                className="text-red-500 hover:text-red-700 ml-auto"
                                title="ลบ (Delete)"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={funding.amount}
                              onChange={(e) => handleExternalFundingChange(funding.id, 'amount', e.target.value)}
                              placeholder="0"
                              className="w-full px-2 py-1 border border-gray-300 rounded text-right text-sm focus:outline-none focus:border-blue-500"
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Add row button */}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleAddExternalFunding}
                  disabled={!formData.journal_quartile || feeLimits.total === 0}
                  className={`flex items-center gap-2 px-5 py-2 rounded-full transition-colors text-sm font-medium ${
                    !formData.journal_quartile || feeLimits.total === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                  title={
                    !formData.journal_quartile || feeLimits.total === 0
                      ? 'กรุณาเลือก Quartile ที่สามารถเบิกค่าใช้จ่ายได้ก่อน'
                      : 'เพิ่มรายการทุนภายนอก'
                  }
                >
                  <Plus className="h-4 w-4" />
                  เพิ่ม (Add)
                </button>
              </div>

              {/* External funding total */}
              <div className="mt-4 text-right">
                <span className="text-sm text-gray-700">รวม (Total) </span> 
                <span className="text-xl font-bold text-gray-900">
                  {formatCurrency((externalFundings || []).reduce((sum, funding) => sum + (parseFloat(funding?.amount || 0)), 0))}
                </span>
                <span className="text-sm text-gray-700"> บาท (Baht)</span>
              </div>
            </div>
          </div>
        </SimpleCard>

        {/* =================================================================
        // BANK INFORMATION SECTION
        // ================================================================= */}
        <SimpleCard title="ข้อมูลธนาคาร (Bank Information)" icon={FileText}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bank Account Number */}
            <div id="field-bank_account">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                เลขบัญชีธนาคาร (Bank Account Number) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="bank_account"
                value={formData.bank_account}
                onChange={handleInputChange}
                placeholder="กรอกเลขบัญชี (Enter account number)"
                maxLength="15"
                inputMode="numeric"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500 ${
                  errors.bank_account ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              <p className="text-xs text-gray-500 mt-1">กรอกเฉพาะตัวเลข 10-15 หลัก (Enter 10-15 digits only)</p>
              {errors.bank_account && (
                <p className="text-red-500 text-sm mt-1">{errors.bank_account}</p>
              )}
            </div>

            {/* Bank Name */}
            <div id="field-bank_name">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ชื่อธนาคาร (Bank Name) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="bank_name"
                value={formData.bank_name}
                onChange={handleInputChange}
                placeholder="เช่น ธนาคารกรุงเทพ (e.g. Bangkok Bank)"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500 ${
                  errors.bank_name ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.bank_name && (
                <p className="text-red-500 text-sm mt-1">{errors.bank_name}</p>
              )}
            </div>
          </div>
        </SimpleCard>

        {/* =================================================================
        // FILE ATTACHMENTS SECTION
        // ================================================================= */}
        <SimpleCard title="เอกสารแนบ (File Attachments)" icon={Upload} id="file-attachments-section">
          <div className="space-y-6">
            {/* Document types */}
            {documentTypes && documentTypes.length > 0 ? (
              <>
                {documentTypes.map((docType) => {
                  // Special handling for "Other documents"
                  if (docType.name === 'เอกสารอื่นๆ') {
                    return (
                      <div key={docType.id} className="border border-gray-200 rounded-lg p-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          เอกสารอื่นๆ (Other Documents) (ถ้ามี/if any)
                        </label>
                        
                        <FileUpload
                          onFileSelect={(files) => handleFileUpload('other', files)}
                          accept=".pdf"
                          multiple={true}
                          label="other"
                        />
                      </div>
                    );
                  }
                  
                  // Special handling for "เอกสารเบิกจ่ายภายนอก"
                  if (docType.id === 12) {
                    const externalDocs = otherDocuments.filter(doc => 
                      doc.type === 'external_funding' && doc.documentTypeId === 12
                    );
                    
                    return (
                      <div key={docType.id} className="border border-gray-200 rounded-lg p-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          เอกสารเบิกจ่ายภายนอก (External Funding Documents)
                          {externalDocs.length > 0 && (
                            <span className="ml-2 text-sm text-green-600">
                              ({externalDocs.length} ไฟล์/files)
                            </span>
                          )}
                        </label>
                        
                        {externalDocs.length > 0 ? (
                          <div className="space-y-2">
                            {externalDocs.map((doc, index) => (
                              <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                                <div className="flex items-center gap-3">
                                  <FileText className="h-5 w-5 text-gray-400" />
                                  <div>
                                    <p className="text-sm font-medium text-gray-700">{doc.file.name}</p>
                                    <p className="text-xs text-gray-500">
                                      {(doc.file.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const url = URL.createObjectURL(doc.file);
                                    window.open(url, '_blank');
                                  }}
                                  className="text-blue-500 hover:text-blue-700"
                                  title="ดูไฟล์ (View file)"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-gray-400">
                            <p className="text-sm">
                              ไฟล์จะถูกเพิ่มอัตโนมัติเมื่อแนบในตารางทุนภายนอก
                              <br />
                              <span className="text-xs">(Files will be added automatically when attached in external funding table)</span>
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  }
                  
                  // Regular document types with English translations
                  const getDocumentNameWithEnglish = (docName) => {
                    const translations = {
                      'QS WUR 1-400': 'QS WUR 1-400',
                      'Full reprint (บทความตีพิมพ์)': 'Full reprint (บทความตีพิมพ์/Published Article)',
                      'Scopus-ISI (หลักฐานการจัดอันดับ)': 'Scopus-ISI (หลักฐานการจัดอันดับ/Ranking)',
                      'สำเนาบัญชีธนาคาร': 'สำเนาบัญชีธนาคาร (Bank Account Copy)',
                      'Payment / Exchange rate': 'Payment / Exchange rate',
                      'Page charge Invoice': 'Page charge Invoice',
                      'Page charge Receipt': 'Page charge Receipt',
                      'Manuscript Editor Invoice': 'Manuscript Editor Invoice',
                      'Manuscript Receipt': 'Manuscript Receipt',
                      'Review Response (Special issue)': 'Review Response (Special issue)'
                    };
                    return translations[docName] || docName;
                  };
                  
                  return (
                    <div key={docType.id} id={`file-upload-${docType.id}`} className="border border-gray-200 rounded-lg p-4 transition-all">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {getDocumentNameWithEnglish(docType.name)}
                        {docType.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      
                      <FileUpload
                        onFileSelect={(files) => handleFileUpload(docType.id, files)}
                        accept=".pdf"
                        multiple={false}
                        error={errors[`file_${docType.id}`]}
                        label={`doc_${docType.id}`}
                      />
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <FileText className="mx-auto h-8 w-8 mb-2 text-gray-400" />
                <p className="text-sm">กำลังโหลดประเภทเอกสาร... (Loading document types...)</p>
              </div>
            )}
          </div>
        </SimpleCard>

        {/* =================================================================
        // ADDITIONAL INFORMATION SECTION
        // ================================================================= */}
        <SimpleCard title="ข้อมูลเพิ่มเติม (Additional Information)" icon={FileText}>
          <div className="space-y-4">
            {/* University funding */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ได้รับการสนับสนุนทุนจากมหาวิทยาลัยหรือไม่?
                <br />
                <span className="text-xs font-normal text-gray-600">
                  (Did you receive funding support from the university?)
                </span>
              </label>
              <select
                name="has_university_fund"
                value={formData.has_university_fund}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="no">ไม่ได้รับ (No)</option>
                <option value="yes">ได้รับ (Yes)</option>
              </select>
            </div>

            {/* University fund reference */}
            {formData.has_university_fund === 'yes' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  หมายเลขอ้างอิงทุน (Fund Reference Number)
                </label>
                <input
                  type="text"
                  name="university_fund_ref"
                  value={formData.university_fund_ref}
                  onChange={handleInputChange}
                  placeholder="กรอกหมายเลขอ้างอิงทุน (Enter fund reference number)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
            )}

            {/* University ranking */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                อันดับมหาวิทยาลัย/สถาบัน (University/Institution Ranking) (ถ้ามี/if any)
              </label>
              <input
                type="text"
                name="university_ranking"
                value={formData.university_ranking}
                onChange={handleInputChange}
                placeholder="เช่น (e.g.) QS World University Rankings #500"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </SimpleCard>

        {/* =================================================================
        // ACTION BUTTONS
        // ================================================================= */}
        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
          <button
            type="button"
            onClick={deleteDraft}
            className="px-4 py-2 text-red-600 border border-red-300 rounded-md hover:bg-red-50"
          >
            <X className="h-4 w-4 inline mr-2" />
            ลบร่าง
          </button>

          <button
            type="button"
            onClick={saveDraft}
            disabled={saving || loading}
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
            disabled={loading || saving}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Send className="h-4 w-4" />
            )}
            {loading ? 'กำลังส่ง...' : 'ส่งคำร้อง'}
          </button>
        </div>

        {/* =================================================================
        // WARNING NOTICE
        // ================================================================= */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">ข้อควรระวัง:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>กรุณาตรวจสอบข้อมูลให้ครบถ้วนและถูกต้องก่อนส่งคำร้อง</li>
                <li>เอกสารแนบต้องเป็นไฟล์ PDF เท่านั้น</li>
                <li>เงินรางวัลจะคำนวณอัตโนมัติตามสถานะผู้แต่งและ Quartile ของวารสาร</li>
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

// =================================================================
// EXPORT COMPONENT
// =================================================================