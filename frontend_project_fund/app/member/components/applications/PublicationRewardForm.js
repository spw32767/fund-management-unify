// app/teacher/components/applications/PublicationRewardForm.js
"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Award,
  Upload,
  Users,
  FileText,
  Plus,
  X,
  Save,
  Send,
  AlertCircle,
  Calculator,
  Search,
  Eye,
  Signature,
  ArrowLeft,
  Info,
  Download,
  RefreshCw,
  Trash2,
  Undo2,
  Loader2,
} from "lucide-react";
import PageLayout from "../common/PageLayout";
import SimpleCard from "../common/SimpleCard";
import apiClient, { systemAPI, authAPI, endOfContractAPI } from '../../../lib/api';
import { fundInstallmentAPI } from '../../../lib/fund_installment_api';
import {
  submissionAPI,
  publicationDetailsAPI,
  fileAPI,
  documentAPI,
  publicationRewardAPI,
  publicationFormAPI,
  submissionUsersAPI,
  publicationRewardRatesAPI,
  rewardConfigAPI,
  publicationBudgetAPI
} from '../../../lib/publication_api';
import Swal from 'sweetalert2';
import { notificationsAPI } from '../../../lib/notifications_api';
import { systemConfigAPI } from '../../../lib/system_config_api';
import { getAuthorSubmissionFields } from './PublicationRewardForm.helpers.mjs';

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

const MAX_CURRENCY_AMOUNT = 1_000_000;

const clampCurrencyValue = (rawValue) => {
  if (rawValue === null || rawValue === undefined) {
    return '';
  }

  if (typeof rawValue === 'number') {
    if (!Number.isFinite(rawValue)) {
      return 0;
    }
    const clamped = Math.min(Math.max(rawValue, 0), MAX_CURRENCY_AMOUNT);
    return clamped;
  }

  if (typeof rawValue === 'string') {
    const trimmed = rawValue.trim();
    if (!trimmed) {
      return '';
    }
    const numeric = Number(trimmed);
    if (!Number.isFinite(numeric)) {
      return rawValue;
    }
    const clamped = Math.min(Math.max(numeric, 0), MAX_CURRENCY_AMOUNT);
    return numeric === clamped ? rawValue : clamped.toString();
  }

  return rawValue;
};

const normalizeEndOfContractTerm = (item, index = 0) => {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const content = typeof item.content === 'string' ? item.content.trim() : '';
  if (!content) {
    return null;
  }

  const rawId =
    item.eoc_id ?? item.id ?? item.term_id ?? item.termId ?? item.termID ?? index + 1;
  const parsedId = Number(rawId);
  const resolvedId = Number.isFinite(parsedId) ? parsedId : index + 1;

  const rawOrder = item.display_order ?? item.order ?? item.displayOrder ?? index + 1;
  const parsedOrder = Number(rawOrder);
  const resolvedOrder = Number.isFinite(parsedOrder) ? parsedOrder : index + 1;

  return {
    eoc_id: resolvedId,
    content,
    display_order: resolvedOrder,
  };
};

const normalizeEndOfContractList = (input) => {
  let list = [];
  if (Array.isArray(input)) {
    list = input;
  } else if (input && typeof input === 'object') {
    if (Array.isArray(input.data)) list = input.data;
    else if (Array.isArray(input.items)) list = input.items;
    else if (Array.isArray(input.terms)) list = input.terms;
    else if (Array.isArray(input.end_of_contract)) list = input.end_of_contract;
  }

  return list
    .map((item, index) => normalizeEndOfContractTerm(item, index))
    .filter(Boolean)
    .sort((a, b) => {
      const orderDiff = (a.display_order ?? 0) - (b.display_order ?? 0);
      if (orderDiff !== 0) {
        return orderDiff;
      }
      return (a.eoc_id ?? 0) - (b.eoc_id ?? 0);
    });
};

const buildTermAcknowledgements = (terms, previous = {}) => {
  if (!Array.isArray(terms)) {
    return {};
  }

  const next = {};
  terms.forEach((term, index) => {
    if (!term || typeof term !== 'object') {
      return;
    }

    const key = String(
      term.eoc_id ?? term.id ?? term.term_id ?? term.termId ?? term.termID ?? term.display_order ?? index,
    );
    next[key] = Boolean(previous[key]);
  });

  return next;
};

const normalizeStatusCode = (value) => {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return null;
  switch (normalized) {
    case '3':
    case 'revision':
    case 'needs_more_info':
    case 'need_more_info':
    case 'needs-more-info':
    case 'needs more info':
    case 'returned':
    case 'return':
    case 'resubmit':
    case 'resubmission_requested':
    case 'resubmission-required':
    case 'resubmission required':
    case 'pending_revision':
    case 'pending-revision':
    case 'pending revision':
      return 'needs_more_info';
    case '4':
    case 'draft':
    case 'ร่าง':
      return 'draft';
    case 'approved':
    case 'อนุมัติ':
      return 'approved';
    case 'rejected':
    case 'ปฏิเสธ':
      return 'rejected';
    default:
      return normalized;
  }
};

const EDITABLE_STATUS_CODES = new Set(['draft', 'needs_more_info']);

const parsePublicationDateParts = (value, fallback = {}) => {
  if (!value) {
    return {
      year: fallback.year || '',
      month: fallback.month || '',
    };
  }

  let dateValue = value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return {
        year: fallback.year || '',
        month: fallback.month || '',
      };
    }
    const normalized = trimmed.length === 10 && /\d{4}-\d{2}-\d{2}/.test(trimmed)
      ? `${trimmed}T00:00:00`
      : trimmed;
    dateValue = new Date(normalized);
  }

  if (dateValue instanceof Date && !Number.isNaN(dateValue.getTime())) {
    const year = dateValue.getFullYear().toString();
    const month = String(dateValue.getMonth() + 1).padStart(2, '0');
    return { year, month };
  }

  return {
    year: fallback.year || '',
    month: fallback.month || '',
  };
};

const parseIndexingFlags = (value) => {
  if (!value || typeof value !== 'string') {
    return { isi: false, scopus: false, webOfScience: false, tci: false };
  }
  const normalized = value.toLowerCase();
  return {
    isi: /isi/.test(normalized),
    scopus: /scopus/.test(normalized),
    webOfScience: /web\s*of\s*science/.test(normalized),
    tci: /tci/.test(normalized),
  };
};

const resolveUserNameParts = (user = {}) => {
  const prefixCandidates = [
    user.prefix_name,
    user.prefix,
    user.user_prefix,
    user.user_prefix_name,
    user.userPrefixName,
    user.userPrefix,
    user.user_prefix_th,
    user.prefix_name_th,
    user.prefix_th,
    user.prefixTH,
    user.prefixName,
    user.prefixNameTh,
    user.PrefixName,
    user.PrefixNameTh,
    user.UserPrefix,
    user.UserPrefixName,
    user.academic_prefix,
    user.title,
    user.Title,
    user.Prefix?.name,
    user.Prefix?.Name,
    user.prefix?.name,
    user.prefix?.Name,
    user.user_prefix?.name,
    user.user_prefix?.Name,
  ];

  let prefix = findFirstString(prefixCandidates) || '';

  const firstNameCandidates = [
    user.user_fname,
    user.user_fname_th,
    user.UserFname,
    user.UserFName,
    user.userFname,
    user.userFName,
    user.fname_th,
    user.fname,
    user.Fname,
    user.FnameTh,
    user.first_name_th,
    user.first_name,
    user.FirstName,
    user.FirstNameTh,
    user.firstname,
    user.firstname_th,
    user.thai_first_name,
    user.ThaiFirstName,
    user.first_name_en,
    user.FirstNameEn,
    user.firstName,
    user.firstNameTh,
    user.name_th ? user.name_th.split(' ')[0] : null,
    user.name ? user.name.split(' ')[0] : null,
    user.full_name ? user.full_name.split(' ')[0] : null,
    user.full_name_th ? user.full_name_th.split(' ')[0] : null,
    user.display_name ? user.display_name.split(' ')[0] : null,
    user.DisplayName ? user.DisplayName.split(' ')[0] : null,
  ];

  let firstName = findFirstString(firstNameCandidates) || '';

  const lastNameCandidates = [
    user.user_lname,
    user.user_lname_th,
    user.UserLname,
    user.UserLName,
    user.userLname,
    user.userLName,
    user.lname_th,
    user.lname,
    user.Lname,
    user.LnameTh,
    user.last_name_th,
    user.last_name,
    user.LastName,
    user.LastNameTh,
    user.lastname,
    user.surname,
    user.thai_last_name,
    user.ThaiLastName,
    user.name_th ? user.name_th.split(' ').slice(1).join(' ') : null,
    user.name ? user.name.split(' ').slice(1).join(' ') : null,
    user.full_name_th ? user.full_name_th.split(' ').slice(1).join(' ') : null,
    user.full_name ? user.full_name.split(' ').slice(1).join(' ') : null,
    user.display_name ? user.display_name.split(' ').slice(1).join(' ') : null,
    user.DisplayName ? user.DisplayName.split(' ').slice(1).join(' ') : null,
  ];

  let lastName = findFirstString(lastNameCandidates) || '';

  const displayNameCandidates = [
    user.display_name,
    user.DisplayName,
    user.displayName,
    user.full_name_th,
    user.FullNameTh,
    user.fullname_th,
    user.FullnameTh,
    user.full_name,
    user.FullName,
    user.fullname,
    user.Fullname,
    user.user_fullname,
    user.user_fullname_th,
    user.userFullname,
    user.userFullName,
    user.userFullnameTh,
    user.userFullNameTh,
    user.UserFullname,
    user.UserFullName,
    user.UserFullnameTh,
    user.UserFullNameTh,
    user.name_th,
    user.NameTh,
    user.name,
    user.Name,
    user.username,
    user.Username,
  ];

  let displayName = findFirstString(displayNameCandidates);

  if (!displayName) {
    const combinedFallback = [prefix, firstName, lastName].filter(Boolean).join(' ').trim();
    displayName = combinedFallback || null;
  }

  if (displayName && (!firstName || !lastName)) {
    const segments = displayName.split(/\s+/).filter(Boolean);
    if (!lastName && segments.length > 0) {
      lastName = segments[segments.length - 1] || '';
    }
    if (!firstName) {
      if (segments.length > 1) {
        firstName = segments[segments.length - 2] || '';
      } else if (segments.length === 1) {
        firstName = segments[0] || '';
      }
    }
    if (!prefix && segments.length > 2) {
      prefix = segments.slice(0, Math.max(segments.length - 2, 0)).join(' ');
    }
  }

  const combined = [prefix, firstName, lastName].filter(Boolean).join(' ').trim();
  const finalDisplayName = displayName || combined || firstName || lastName || '';

  return { firstName, lastName, prefix, displayName: finalDisplayName };
};

const buildCoauthorFromSubmissionUser = (entry) => {
  if (!entry) return null;
  const user = entry.user || entry.User || entry;
  const userId = user?.user_id ?? entry?.user_id ?? entry?.UserID ?? null;
  if (!userId) {
    return null;
  }

  const { firstName, lastName, prefix, displayName } = resolveUserNameParts(user);

  const fallbackCombined = [prefix, firstName, lastName].filter(Boolean).join(' ').trim();
  const finalDisplayName = displayName || fallbackCombined || firstName || lastName || '';
  const resolvedFirstName = firstName || finalDisplayName || '';
  const resolvedLastName = lastName && lastName !== resolvedFirstName ? lastName : '';
  const composedFirst = [prefix, resolvedFirstName].filter(Boolean).join(' ').trim();
  const safeFirstName = composedFirst || finalDisplayName || resolvedFirstName;

  return {
    user_id: userId,
    user_fname: safeFirstName,
    user_lname: resolvedLastName,
    email: user?.email ?? entry?.email ?? null,
    display_name: finalDisplayName,
  };
};

const getNormalizedUserId = (entry) => {
  if (!entry) {
    return null;
  }
  const candidates = [
    entry.user_id,
    entry.UserID,
    entry.userId,
    entry.UserId,
    entry.id,
    entry.Id,
  ];
  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined) {
      continue;
    }
    const normalized = String(candidate).trim();
    if (!normalized) {
      continue;
    }
    return normalized;
  }
  return null;
};

const toNumberOrEmpty = (value) => {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const cleaned = value.replace(/,/g, '').trim();
    const num = Number(cleaned);
    return Number.isNaN(num) ? '' : num;
  }

  const num = Number(value);
  return Number.isNaN(num) ? '' : num;
};

const normalizeYesNoValue = (value, defaultValue = 'no') => {
  if (value === null || value === undefined) {
    return defaultValue;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return defaultValue;
    }

    if (['yes', 'y', 'true', '1', 'ได้รับ', 'ได้'].includes(normalized)) {
      return 'yes';
    }

    if (['no', 'n', 'false', '0', 'ไม่ได้รับ', 'ไม่'].includes(normalized)) {
      return 'no';
    }

    return defaultValue;
  }

  if (typeof value === 'boolean') {
    return value ? 'yes' : 'no';
  }

  if (typeof value === 'number') {
    if (value === 1) return 'yes';
    if (value === 0) return 'no';
  }

  return defaultValue;
};

const toSubmissionKey = (value) => {
  if (value === null || value === undefined) {
    return null;
  }
  return String(value);
};

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

const parseNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const parseIntegerOrNull = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const intVal = parseInt(value, 10);
  return Number.isNaN(intVal) ? null : intVal;
};

const formatCurrencyWithPlaceholder = (value, placeholder = '-') => {
  const numeric = parseNumberOrNull(value);
  if (numeric === null) {
    return placeholder;
  }
  return `${formatCurrency(numeric)} บาท`;
};

const normalizePolicyPayload = (policy = {}) => {
  if (!policy || typeof policy !== 'object') {
    return null;
  }

  const overall = policy.overall || {};
  const rule = policy.rule || {};
  const userUsage = policy.user_usage || {};
  const userRemaining = policy.user_remaining || {};

  return {
    overall: {
      subcategory_budget_id: parseIntegerOrNull(overall.subcategory_budget_id),
      allocated_amount: parseNumberOrNull(overall.allocated_amount),
      used_amount: parseNumberOrNull(overall.used_amount),
      remaining_amount: parseNumberOrNull(overall.remaining_amount),
      max_amount_per_year: parseNumberOrNull(overall.max_amount_per_year),
      max_grants: parseIntegerOrNull(overall.max_grants),
      max_amount_per_grant: parseNumberOrNull(overall.max_amount_per_grant),
    },
    rule: {
      subcategory_budget_id: parseIntegerOrNull(rule.subcategory_budget_id),
      fund_description: rule.fund_description || '',
      max_amount_per_grant: parseNumberOrNull(rule.max_amount_per_grant),
    },
    user_usage: {
      total_grants: parseIntegerOrNull(userUsage.total_grants) ?? 0,
      total_amount: parseNumberOrNull(userUsage.total_amount) ?? 0,
      publication_grants: parseIntegerOrNull(userUsage.publication_grants) ?? 0,
      publication_amount: parseNumberOrNull(userUsage.publication_amount) ?? 0,
    },
    user_remaining: {
      grants: parseIntegerOrNull(userRemaining.grants),
      amount: parseNumberOrNull(userRemaining.amount),
    }
  };
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

  const fundTypes = dedupeStringList(doc?.fund_types);
  return fundTypes.length === 0 ? 'all' : 'limited';
};

const findFirstString = (candidates) => {
  if (!Array.isArray(candidates)) return null;
  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }
  return null;
};

const buildFundSummaryFromPayload = (submission = {}, detail = {}) => {
  const subcategoryBudget =
    submission?.SubcategoryBudget ||
    submission?.subcategory_budget ||
    detail?.SubcategoryBudget ||
    detail?.subcategory_budget ||
    {};
  const subcategory =
    submission?.Subcategory ||
    submission?.subcategory ||
    detail?.Subcategory ||
    detail?.subcategory ||
    subcategoryBudget?.Subcategory ||
    subcategoryBudget?.subcategory ||
    {};
  const fund =
    subcategoryBudget?.Fund ||
    subcategoryBudget?.fund ||
    detail?.Fund ||
    detail?.fund ||
    {};

  const nameCandidates = [
    detail?.fund_name,
    detail?.FundName,
    detail?.fund_title,
    detail?.FundTitle,
    detail?.subcategory_name,
    detail?.subcategory_name_th,
    subcategory?.name,
    subcategory?.Name,
    subcategory?.subcategory_name,
    subcategory?.SubcategoryName,
    fund?.fund_name,
    fund?.FundName,
    submission?.fund_name,
    submission?.FundName,
  ];
  const primaryName = findFirstString(nameCandidates);

  const detailCandidates = [
    detail?.fund_description,
    detail?.FundDescription,
    detail?.subcategory_description,
    detail?.SubcategoryDescription,
    subcategory?.description,
    subcategory?.Description,
    subcategory?.detail,
    fund?.description,
    fund?.Description,
    subcategoryBudget?.fund_description,
    subcategoryBudget?.FundDescription,
    subcategoryBudget?.description,
    subcategoryBudget?.Description,
  ];
  const primaryDetail = findFirstString(detailCandidates);

  const combinedSummary = [primaryName, primaryDetail].filter(Boolean).join(' ').trim();

  const description = findFirstString([
    detail?.fund_description,
    detail?.FundDescription,
    detail?.subcategory_description,
    detail?.SubcategoryDescription,
    detail?.subcategory_name,
    detail?.subcategory_name_th,
    subcategoryBudget?.fund_description,
    subcategoryBudget?.FundDescription,
    combinedSummary || null,
  ]);

  if (!primaryName && !primaryDetail && !description) {
    return null;
  }

  return {
    name: primaryName || null,
    detail: primaryDetail || null,
    description: description || primaryDetail || primaryName || null,
  };
};

const formatGrantLimit = (value) => {
  if (value === null || value === undefined) {
    return 'ไม่จำกัด';
  }
  try {
    return `${Number(value).toLocaleString('th-TH')} ครั้ง`;
  } catch (error) {
    return `${value} ครั้ง`;
  }
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

const formatPreviewTimestamp = (timestamp) => {
  if (!timestamp) return '';
  try {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    console.warn('formatPreviewTimestamp failed:', error);
    return '';
  }
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
const getMaxFeeLimit = async (quartile, year = null, preloadedLimits = null) => {
  if (!quartile) return 0;

  const normalizedQuartile = String(quartile).trim().toUpperCase();

  if (preloadedLimits && Object.prototype.hasOwnProperty.call(preloadedLimits, normalizedQuartile)) {
    const cachedValue = preloadedLimits[normalizedQuartile];
    if (cachedValue == null) {
      return 0;
    }
    const numeric = Number(cachedValue);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  try {
    // หา year (พ.ศ.) จาก year_id หรือใช้ปีปัจจุบัน + 543
    const currentYear = new Date().getFullYear() + 543;
    const targetYear = year || currentYear.toString();

    // เรียก API เพื่อดึงวงเงินสูงสุด
    const response = await rewardConfigAPI.lookupMaxAmount(
      targetYear,
      normalizedQuartile
    );

    return response.max_amount || 0;
  } catch (error) {
    // ถ้าไม่พบ config สำหรับ quartile นี้ ให้ return 0
    if (error.message && error.message.includes('Configuration not found')) {
      return 0;
    }
    console.error('Error fetching fee limit:', error);
    return 0;
  }
};

const validateFees = async (journalQuartile, revisionFee, publicationFee, currentYear, feeLimitMap = null) => {
  const errors = [];

  if (journalQuartile) {
    try {
      // ดึงวงเงินสูงสุดจาก API
      const maxLimit = await getMaxFeeLimit(journalQuartile, currentYear, feeLimitMap);

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
const checkFeesLimit = async (revisionFee, publicationFee, quartile, feeLimitMap = null, targetYear = null) => {
  if (!quartile) {
    return {
      isValid: true,
      total: 0,
      maxLimit: 0,
      remaining: 0
    };
  }

  try {
    const maxLimit = await getMaxFeeLimit(quartile, targetYear, feeLimitMap);
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


// =================================================================
// REWARD CALCULATION
// =================================================================

// Mapping for author status and quartile to human-readable descriptions
const AUTHOR_STATUS_SHORT_LABEL_MAP = {
  first_author: 'ผู้แต่งชื่อแรก (First Author)',
  corresponding_author: 'ผู้ประพันธ์บรรณกิจ (Corresponding Author)',
};

const AUTHOR_STATUS_MAP = {
  first_author:
    'เงินรางวัลการตีพิมพ์เผยแพร่ผลงานวิจัยที่ได้รับการตีพิมพ์ในสาขาวิทยาศาสตร์และเทคโนโลยี (กรณีเป็นผู้แต่งชื่อแรก)',
  corresponding_author:
    'เงินรางวัลการตีพิมพ์เผยแพร่ผลงานวิจัยที่ได้รับการตีพิมพ์ในสาขาวิทยาศาสตร์และเทคโนโลยี (กรณีเป็นผู้ประพันธ์บรรณกิจ)',
};

const resolveAuthorStatusShortLabel = (status, label) => {
  if (status && AUTHOR_STATUS_SHORT_LABEL_MAP[status]) {
    return AUTHOR_STATUS_SHORT_LABEL_MAP[status];
  }

  if (typeof label === 'string' && label.trim()) {
    const normalized = label.trim();
    if (/กรณีเป็นผู้แต่งชื่อแรก/.test(normalized) || /first author/i.test(normalized)) {
      return AUTHOR_STATUS_SHORT_LABEL_MAP.first_author;
    }
    if (/กรณีเป็นผู้ประพันธ์บรรณกิจ/.test(normalized) || /corresponding author/i.test(normalized)) {
      return AUTHOR_STATUS_SHORT_LABEL_MAP.corresponding_author;
    }
  }

  return label;
};

const resolveQuartileSuffix = (quartile, overrideDescription = '') => {
  const normalizedOverride = typeof overrideDescription === 'string'
    ? overrideDescription.trim()
    : '';

  if (normalizedOverride) {
    return normalizedOverride;
  }

  if (quartile === null || quartile === undefined) {
    return '';
  }

  const normalized = String(quartile).trim().toUpperCase();
  if (!normalized) {
    return '';
  }

  if (QUARTILE_MAP[normalized]) {
    return QUARTILE_MAP[normalized];
  }

  if (/^Q\d+/.test(normalized)) {
    const numeric = normalized.replace(/^Q/, '') || normalized;
    return `ควอร์ไทล์ (Quartile) ${numeric}`;
  }

  if (normalized === 'T5') {
    return 'ควอร์ไทล์ (Quartile) Top 5%';
  }

  if (normalized === 'T10') {
    return 'ควอร์ไทล์ (Quartile) Top 10%';
  }

  if (normalized === 'TCI') {
    return 'ควอร์ไทล์ (Quartile) TCI';
  }

  return `ควอร์ไทล์ (Quartile) ${normalized}`;
};

const formatReviewerComment = (value) => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed) {
      return value;
    }
  }
  return '-';
};

const QUARTILE_MAP = {
  T5: 'วารสารระดับนานาชาติในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS (ลําดับ 5% แรก)',
  T10: 'วารสารระดับนานาชาติในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS (ลําดับ 10% แรก)',
  Q1: 'วารสารระดับนานาชาติในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS ควอร์ไทล์ 1',
  Q2: 'วารสารระดับนานาชาติในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS ควอร์ไทล์ 2',
  Q3: 'วารสารระดับนานาชาติในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS ควอร์ไทล์ 3',
  Q4: 'วารสารระดับนานาชาติในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS ควอร์ไทล์ 4',
  TCI: 'บทความตีพิมพ์ในวารสารระดับนานาชาติในฐานข้อมูล WOS หรือ ISI หรือ SCOPUS หรือวารสารที่อยู่ในฐานข้อมูล TCI กลุ่มที่ 1 สาขาวิทยาศาสตร์เทคโนโลยี',
};

// Mapping from funding descriptions will be loaded dynamically at runtime

// =================================================================
// FILE UPLOAD COMPONENT
// =================================================================

const FileUpload = ({
  onFileSelect,
  accept,
  multiple = false,
  error,
  label,
  existingFile = null,
  onDownloadExisting,
  onRemoveExisting,
  onRestoreExisting,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const inputId = useMemo(() => {
    if (label) {
      return `file-input-${label}`;
    }
    return `file-input-${Math.random().toString(16).slice(2)}`;
  }, [label]);

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

    const files = Array.from(e.dataTransfer.files || []);
    handleFileSelection(files);
  };

  const handleFileSelection = (files) => {
    if (!files || files.length === 0) {
      setSelectedFiles([]);
      onFileSelect([]);
      return;
    }

    if (multiple) {
      const newFiles = [...selectedFiles, ...files];
      setSelectedFiles(newFiles);
      onFileSelect(newFiles);
    } else {
      const validFiles = files.slice(0, 1);
      setSelectedFiles(validFiles);
      onFileSelect(validFiles);
    }
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files || []);
    handleFileSelection(files);
  };

  const removeFile = (index) => {
    if (multiple) {
      const newFiles = selectedFiles.filter((_, i) => i !== index);
      setSelectedFiles(newFiles);
      onFileSelect(newFiles);
    } else {
      setSelectedFiles([]);
      onFileSelect([]);
    }
  };

  const viewFile = (file) => {
    if (!file) {
      return;
    }
    const url = URL.createObjectURL(file);
    window.open(url, '_blank');
  };

  const triggerFileDialog = () => {
    const input = document.getElementById(inputId);
    if (input) {
      input.click();
    }
  };

  const renderExistingFile = () => {
    if (multiple || !existingFile) {
      return null;
    }

    const pendingReason = existingFile.pendingRemovalReason || existingFile.serverDocumentPendingRemovalReason || null;
    const isPendingReplace = pendingReason === 'replace';
    const isPendingRemove = pendingReason === 'remove';
    const highlightClass = isPendingRemove
      ? 'border-red-200 bg-red-50 text-red-700'
      : isPendingReplace
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : 'border-blue-200 bg-blue-50 text-blue-800';
    const statusMessage = isPendingReplace
      ? 'ไฟล์นี้จะถูกแทนที่เมื่อบันทึก'
      : isPendingRemove
        ? 'ไฟล์นี้จะถูกลบเมื่อบันทึก'
        : 'ไฟล์จากระบบ';

    const fileName = existingFile.original_name || existingFile.name || existingFile.serverFileName || 'ไฟล์จากระบบ';

    return (
      <div className={`flex flex-col gap-3 rounded-lg border ${highlightClass} p-4`}
        role="status"
        aria-live="polite"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <FileText className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">{fileName}</p>
              <p className="text-xs font-medium">{statusMessage}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onDownloadExisting?.(existingFile)}
              className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50"
            >
              <Download className="h-3.5 w-3.5" />
              <span>ดาวน์โหลด</span>
            </button>
            {!isPendingRemove && (
              <button
                type="button"
                onClick={triggerFileDialog}
                className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 transition hover:bg-amber-100"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>แทนที่</span>
              </button>
            )}
            {isPendingRemove ? (
              <button
                type="button"
                onClick={() => onRestoreExisting?.(existingFile)}
                className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
              >
                <Undo2 className="h-3.5 w-3.5" />
                <span>ยกเลิก</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onRemoveExisting?.(existingFile)}
                className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-600 transition hover:bg-red-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>ลบ</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSelectedFile = () => {
    if (multiple || selectedFiles.length === 0) {
      return null;
    }

    const [file] = selectedFiles;

    return (
      <div className="flex flex-col gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <FileText className="mt-0.5 h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-800">{file.name}</p>
              <p className="text-xs text-green-700">{(file.size / 1024 / 1024).toFixed(2)} MB • ไฟล์ใหม่ (รออัปโหลด)</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => viewFile(file)}
              className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>ดูไฟล์</span>
            </button>
            <button
              type="button"
              onClick={() => triggerFileDialog()}
              className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 transition hover:bg-amber-100"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>แทนที่</span>
            </button>
            <button
              type="button"
              onClick={() => removeFile(0)}
              className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-600 transition hover:bg-red-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>ลบไฟล์ใหม่</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDropZone = () => (
    <div
      className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
        isDragging
          ? 'border-blue-400 bg-blue-50'
          : error
            ? 'border-red-300 bg-red-50'
            : 'border-gray-300 hover:border-gray-400'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={triggerFileDialog}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          triggerFileDialog();
        }
      }}
    >
      <Upload className="mx-auto h-6 w-6 text-gray-400 mb-2" />
      <p className="text-sm text-gray-600">
        {multiple
          ? 'คลิกหรือลากไฟล์มาวางที่นี่ (สามารถเลือกได้หลายไฟล์)'
          : 'คลิกหรือลากไฟล์มาวางที่นี่'}
      </p>
      <p className="text-xs text-gray-500 mt-1">{accept || 'PDF, DOC, DOCX, JPG, PNG (ไม่เกิน 10MB)'}</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {(!multiple && selectedFiles.length > 0) ? (
        renderSelectedFile()
      ) : (
        <>
          {renderExistingFile()}
          {renderDropZone()}
        </>
      )}

      {multiple && selectedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">ไฟล์ที่เลือก:</p>
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3"
              >
                <div className="flex items-start gap-3">
                  <FileText className="mt-0.5 h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      viewFile(file);
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>ดูไฟล์</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-600 transition hover:bg-red-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>ลบ</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="mt-1 flex items-center gap-1 text-sm text-red-500">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}

      <input
        id={inputId}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileInput}
        className="hidden"
      />
    </div>
  );
};

// =================================================================
// MAIN COMPONENT START
// =================================================================

export default function PublicationRewardForm({ onNavigate, categoryId, yearId, submissionId: initialSubmissionId = null, readOnly = false, originPage = null }) {
  // =================================================================
  // STATE DECLARATIONS
  // =================================================================
  const router = useRouter();
  const formRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [users, setUsers] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [availableDocumentTypes, setAvailableDocumentTypes] = useState([]);
  const [resolvedSubcategoryName, setResolvedSubcategoryName] = useState(null);
  const [years, setYears] = useState([]);
  const [initialDataReady, setInitialDataReady] = useState(false);
  const [prefilledSubmissionId, setPrefilledSubmissionId] = useState(null);
  const [currentSubmissionId, setCurrentSubmissionId] = useState(initialSubmissionId ?? null);
  const [currentSubmissionStatus, setCurrentSubmissionStatus] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [previewState, setPreviewState] = useState({
    loading: false,
    error: null,
    blobUrl: null,
    signedUrl: null,
    hasPreviewed: false,
    timestamp: null,
  });
  const [previewAcknowledged, setPreviewAcknowledged] = useState(false);
  const serverFileCacheRef = useRef(new Map());
  const previewUrlRef = useRef(null);
  const previewSignatureRef = useRef('');
  const previewSectionRef = useRef(null);
  const policyWarningRef = useRef({ lastShownKey: null });
  const [availableAuthorStatuses, setAvailableAuthorStatuses] = useState([]);
  const [availableQuartiles, setAvailableQuartiles] = useState([]);
  const [quartileConfigs, setQuartileConfigs] = useState({}); // เก็บ config ของแต่ละ quartile
  const [feeError, setFeeError] = useState('');
  const [feeLimits, setFeeLimits] = useState({
    total: 0
  });
  const [enabledYears, setEnabledYears] = useState([]);
  const [enabledPairs, setEnabledPairs] = useState([]);
  const [resolutionError, setResolutionError] = useState('');
  const [rewardRateMap, setRewardRateMap] = useState({});
  const [budgetOptionMap, setBudgetOptionMap] = useState({});
  const [lockedBudgetYearLabel, setLockedBudgetYearLabel] = useState(null);
  const [lockedBudgetYearId, setLockedBudgetYearId] = useState(null);
  const [rewardRateYear, setRewardRateYear] = useState(null);
  const [rewardConfigYear, setRewardConfigYear] = useState(null);
  const [rewardConfigMap, setRewardConfigMap] = useState({});
  const [fallbackRewardRateMap, setFallbackRewardRateMap] = useState({});
  const [preloadedQuartileConfigs, setPreloadedQuartileConfigs] = useState({});
  const [lockedFundSummary, setLockedFundSummary] = useState(null);
  const [, setPolicyContext] = useState(null);

  const userLookupById = useMemo(() => {
    const map = new Map();
    users.forEach((user) => {
      const key = getNormalizedUserId(user);
      if (!key || map.has(key)) {
        return;
      }
      map.set(key, user);
    });
    return map;
  }, [users]);

  const getCoauthorDisplayInfo = useCallback(
    (coauthor) => {
      if (!coauthor) {
        return { name: '', email: '' };
      }

      const combinedName = [coauthor.user_fname, coauthor.user_lname]
        .filter(Boolean)
        .join(' ')
        .trim();

      let name = findFirstString([
        coauthor.display_name,
        combinedName || null,
        coauthor.user_fname,
        coauthor.user_lname,
      ]) || '';

      let email = findFirstString([
        coauthor.email,
        coauthor.user_email,
        coauthor.UserEmail,
      ]) || '';

      const lookupKey = getNormalizedUserId(coauthor);

      if (lookupKey && userLookupById.has(lookupKey)) {
        const user = userLookupById.get(lookupKey);
        if (user) {
          if (!name) {
            const parts = resolveUserNameParts(user);
            const composed = [parts.prefix, parts.firstName, parts.lastName]
              .filter(Boolean)
              .join(' ')
              .trim();
            name = parts.displayName || composed || name;
          }
          if (!email) {
            email =
              findFirstString([
                user.email,
                user.Email,
                user.user_email,
                user.userEmail,
                user.UserEmail,
              ]) || '';
          }
        }
      }

      return {
        name: name || '',
        email: email || '',
      };
    },
    [userLookupById],
  );

  // Form data state
  const normalizedInitialYearId = typeof yearId === 'string'
    ? (Number(yearId) || yearId)
    : yearId;
  const hydratingRef = useRef(false);
  const missingSubmissionRef = useRef(new Set());
  const previousYearRef = useRef(normalizedInitialYearId || null);
  const previousAuthorStatusRef = useRef('');
  const externalFundingsRef = useRef([]);
  const serverDocumentsRef = useRef([]);
  const serverExternalFundingFilesRef = useRef([]);

  const [formData, setFormData] = useState({
    // Basic submission info
    year_id: normalizedInitialYearId || null,  // Initialize with yearId prop
    category_id: categoryId || null,  // Initialize with categoryId prop
    subcategory_id: null,
    subcategory_budget_id: null,
    
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
    author_name_list: '',
    in_isi: false,
    in_scopus: false,
    in_web_of_science: false,
    in_tci: false,
    article_type: '',
    journal_type: '',
    
    // Reward calculation
    reward_amount: 0,
    publication_reward: 0,
    revision_fee: 0,
    publication_fee: 0,
    external_funding_amount: 0,
    total_amount: 0,
    
    // Bank info
    bank_account: '',
    bank_account_name: '',
    bank_name: '',
    phone_number: '',
    signature: '',
    
    // Other info
    university_ranking: '',
    has_university_fund: '',
    university_fund_ref: ''
  });

  // Co-authors and files
  const [coauthors, setCoauthors] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [otherDocuments, setOtherDocuments] = useState([]); // เก็บเฉพาะ Other Documents
  const [externalFundingFiles, setExternalFundingFiles] = useState([]); // เพิ่ม state ใหม่สำหรับ External Funding Files
  const [serverDocuments, setServerDocuments] = useState([]);
  const [serverExternalFundingFiles, setServerExternalFundingFiles] = useState([]);
  const [detachedDocumentIds, setDetachedDocumentIds] = useState([]);
  const [documentReplacements, setDocumentReplacements] = useState({});
  const [reviewComments, setReviewComments] = useState({ admin: null, head: null });
  const [endOfContractTerms, setEndOfContractTerms] = useState([]);
  const [termAcknowledgements, setTermAcknowledgements] = useState({});
  const [termsLoading, setTermsLoading] = useState(false);
  const [termsError, setTermsError] = useState('');

  // External funding sources
  const [externalFundings, setExternalFundings] = useState([])

  const [baseReadOnly, setBaseReadOnly] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);

  const editingExistingSubmission = Boolean(prefilledSubmissionId);
  const selectionLocked = editingExistingSubmission && !isReadOnly;

  const [announcementLock, setAnnouncementLock] = useState({
    main_annoucement: null,
    reward_announcement: null,
  });

  const resetForm = useCallback(() => {
    let defaultYearId = lockedBudgetYearId ?? normalizedInitialYearId ?? null;
    if (defaultYearId == null && Array.isArray(years) && years.length > 0) {
      defaultYearId = years[0]?.year_id ?? null;
    }

    previousYearRef.current = defaultYearId ?? null;
    previousAuthorStatusRef.current = '';
    setPolicyContext(null);
    setResolvedSubcategoryName(null);
    setLockedFundSummary(null);
    setResolutionError('');
    setAvailableQuartiles([]);
    setCurrentSubmissionStatus(null);
    setServerDocuments([]);
    setServerExternalFundingFiles([]);
    setDetachedDocumentIds([]);
    setDocumentReplacements({});
    setReviewComments({ admin: null, head: null });
    externalFundingsRef.current = [];

    setFormData({
      year_id: defaultYearId,
      category_id: categoryId || null,
      subcategory_id: null,
      subcategory_budget_id: null,
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
      author_name_list: '',
      in_isi: false,
      in_scopus: false,
      in_web_of_science: false,
      in_tci: false,
      article_type: '',
      journal_type: '',
      reward_amount: 0,
      publication_reward: 0,
      revision_fee: 0,
      publication_fee: 0,
      external_funding_amount: 0,
      total_amount: 0,
      bank_account: '',
      bank_account_name: '',
      bank_name: '',
      phone_number: '',
      signature: '',
      university_ranking: '',
      has_university_fund: '',
      university_fund_ref: '',
    });

    setCoauthors([]);
    setUploadedFiles({});
    setOtherDocuments([]);
    setExternalFundings([]);
    setExternalFundingFiles([]);
    setErrors({});
    setCurrentSubmissionId(null);
    setPrefilledSubmissionId(null);
    setPreviewAcknowledged(false);
    setTermAcknowledgements(() => buildTermAcknowledgements(endOfContractTerms, {}));
  }, [
    categoryId,
    lockedBudgetYearId,
    normalizedInitialYearId,
    setCoauthors,
    setCurrentSubmissionId,
    setErrors,
    setExternalFundingFiles,
    setExternalFundings,
    setOtherDocuments,
    setPrefilledSubmissionId,
    setPreviewAcknowledged,
    setUploadedFiles,
    years,
    endOfContractTerms,
  ]);

  const computeDocumentRequirements = useCallback(
    (docs) => {
      const sortedDocs = Array.isArray(docs)
        ? docs
            .slice()
            .sort((a, b) => (a?.document_order || 0) - (b?.document_order || 0))
        : [];

      return sortedDocs.filter((doc) => {
        if (!doc || typeof doc !== 'object') {
          return false;
        }

        const fundTypeMode = resolveFundTypeMode(doc);
        if (fundTypeMode === 'inactive') {
          return false;
        }

        if (fundTypeMode === 'all') {
          return true;
        }

        const fundTypes = Array.isArray(doc.fund_types) ? doc.fund_types : [];
        return fundTypes.includes('publication_reward');
      });
    },
    [],
  );

  const loadEndOfContractTerms = useCallback(async () => {
    setTermsLoading(true);
    setTermsError('');
    try {
      const response = await endOfContractAPI.getTerms();
      const list = normalizeEndOfContractList(response);
      setEndOfContractTerms(list);
      setTermAcknowledgements((prev) => buildTermAcknowledgements(list, prev));
    } catch (error) {
      console.error('Failed to load end-of-contract terms:', error);
      const message =
        error?.response?.data?.error ||
        error?.message ||
        'ไม่สามารถโหลดเงื่อนไข/ข้อตกลงได้';
      setTermsError(message);
      setEndOfContractTerms([]);
      setTermAcknowledgements({});
    } finally {
      setTermsLoading(false);
    }
  }, []);
  useEffect(() => {
    loadEndOfContractTerms().catch((error) => {
      console.error('Failed to fetch end-of-contract terms:', error);
    });
  }, [loadEndOfContractTerms]);

  useEffect(() => {
    setTermAcknowledgements((prev) => buildTermAcknowledgements(endOfContractTerms, prev));
  }, [endOfContractTerms]);

  useEffect(() => {
    let ro = false;

    if (readOnly === true) ro = true;

    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const roq = (sp.get('readonly') || '').toLowerCase();
      const mode = (sp.get('mode') || '').toLowerCase();
      if (['1', 'true', 'yes'].includes(roq)) ro = true;
      if (['view', 'detail', 'details', 'readonly'].includes(mode)) ro = true;

      try {
        const s = window.sessionStorage.getItem('fund_form_readonly');
        if (s === '1') ro = true;
        window.sessionStorage.removeItem('fund_form_readonly');
      } catch {}
    }

    setBaseReadOnly(ro);
    setIsReadOnly(ro);
  }, [readOnly]);

  // Helper: resolve subcategory and budget via backend resolver
  const resolveBudgetAndSubcategory = async ({
    category_id,
    year_id,
    author_status,
    journal_quartile,
    optionContext = {},
    fallbackReward = null,
  }) => {
    try {
      const response = await publicationBudgetAPI.resolve({
        category_id,
        year_id,
        author_status,
        journal_quartile
      });
      return response;
    } catch (err) {
      const message = typeof err?.message === 'string' ? err.message.toLowerCase() : '';
      if (message.includes('no overall budget')) {
        const derivedName = findFirstString([
          optionContext?.subcategory_name,
          optionContext?.subcategory_name_th,
          optionContext?.fund_description,
        ]);
        return {
          subcategory_id: optionContext?.subcategory_id ?? optionContext?.subcategoryId ?? null,
          subcategory_budget_id: optionContext?.subcategory_budget_id ?? optionContext?.subcategoryBudgetId ?? null,
          overall_subcategory_budget_id: optionContext?.overall_subcategory_budget_id ?? null,
          reward_amount: optionContext?.reward_amount ?? optionContext?.RewardAmount ?? fallbackReward ?? null,
          policy: optionContext?.policy ?? null,
          subcategory_name: derivedName ?? null,
          fund_description: optionContext?.fund_description ?? null,
        };
      }

      console.error('resolveBudgetAndSubcategory error:', err);
      return null;
    }
  };

  // Helper: get years that have budgets for this category
  const getEnabledYears = async (category_id) => {
    try {
      const resp = await publicationBudgetAPI.getEnabledYears(category_id);
      const list = resp.years || resp.data || [];
      return list
        .map((entry) => {
          const yearId = entry?.year_id ?? entry?.YearID ?? entry?.id ?? entry;
          return yearId == null ? null : String(yearId);
        })
        .filter(Boolean);
    } catch (err) {
      console.error('getEnabledYears error:', err);
      return [];
    }
  };

  // Helper: get valid author status & quartile pairs for year
  const getEnabledAuthorStatusQuartiles = async ({ category_id, year_id, fallbackRateMap = {} }) => {
    try {
      const resp = await publicationBudgetAPI.getValidOptions(category_id, year_id);
      const options = resp.options || resp.data || [];

      const pairs = [];
      const rateMap = {};
      const budgetMap = {};
      const pairKeySet = new Set();

      const pushPair = (status, quartile) => {
        const normalizedStatus = typeof status === 'string' ? status.trim() : '';
        const normalizedQuartile = typeof quartile === 'string' ? quartile.trim() : '';
        if (!normalizedStatus || !normalizedQuartile) {
          return null;
        }
        const normalizedKey = `${normalizedStatus}|${normalizedQuartile}`;
        if (!pairKeySet.has(normalizedKey)) {
          pairKeySet.add(normalizedKey);
          pairs.push({ author_status: normalizedStatus, journal_quartile: normalizedQuartile });
        }
        return normalizedKey;
      };

      options.forEach(opt => {
        if (!opt) return;
        const key = pushPair(opt.author_status, opt.journal_quartile);
        if (!key) return;

        const [, rawQuartileCode] = key.split('|');
        const normalizedQuartileCode = rawQuartileCode ? rawQuartileCode.trim().toUpperCase() : '';

        const rewardAmount = parseNumberOrNull(opt.reward_amount);
        if (rewardAmount !== null) {
          rateMap[key] = rewardAmount;
        }

        const subcategoryBudget =
          opt.subcategory_budget ??
          opt.SubcategoryBudget ??
          null;

        const normalizedQuartileLabel = findFirstString([
          opt.journal_quartile_label,
          opt.journal_quartile_name,
          opt.journal_quartile_display,
          QUARTILE_MAP[normalizedQuartileCode],
        ]) || '';

        const resolvedFundDescription = findFirstString([
          opt.fund_description,
          opt.fundDescription,
          opt.fund_detail,
          opt.FundDescription,
          subcategoryBudget?.fund_description,
          subcategoryBudget?.FundDescription,
          subcategoryBudget?.description,
          subcategoryBudget?.Description,
          normalizedQuartileLabel,
        ]) || '';

        budgetMap[key] = {
          subcategory_id: opt.subcategory_id ?? null,
          subcategory_budget_id: opt.subcategory_budget_id ?? null,
          fund_name: opt.fund_name ?? opt.fund_title ?? null,
          fund_title: opt.fund_title ?? null,
          fund_description: resolvedFundDescription,
          subcategory_name: opt.subcategory_name ?? null,
          subcategory_name_th: opt.subcategory_name_th ?? null,
          subcategory_description: opt.subcategory_description ?? null,
          author_status_label: opt.author_status_label ?? opt.author_status_name ?? opt.author_status_display ?? null,
          journal_quartile_label: normalizedQuartileLabel || null,
          journal_quartile_code: normalizedQuartileCode || null,
          overall_subcategory_budget_id: opt.overall_subcategory_budget_id ?? null,
          max_amount_per_year: parseNumberOrNull(opt.max_amount_per_year),
          max_grants: parseIntegerOrNull(opt.max_grants),
          max_amount_per_grant: parseNumberOrNull(opt.max_amount_per_grant),
        };
      });

      if (fallbackRateMap && Object.keys(fallbackRateMap).length > 0) {
        Object.entries(fallbackRateMap).forEach(([rawKey, rawAmount]) => {
          if (!rawKey) return;
          const [rawStatus, rawQuartile] = rawKey.split('|');
          const normalizedKey = pushPair(rawStatus, rawQuartile);
          if (!normalizedKey) return;

          if (!Object.prototype.hasOwnProperty.call(rateMap, normalizedKey)) {
            const fallbackAmount = parseNumberOrNull(rawAmount);
            if (fallbackAmount !== null) {
              rateMap[normalizedKey] = fallbackAmount;
            }
          }

          if (!Object.prototype.hasOwnProperty.call(budgetMap, normalizedKey)) {
            budgetMap[normalizedKey] = budgetMap[normalizedKey] ?? {};
          }

          const [, fallbackQuartileCodeRaw] = normalizedKey.split('|');
          const fallbackQuartileCode = fallbackQuartileCodeRaw
            ? fallbackQuartileCodeRaw.trim().toUpperCase()
            : '';

          if (fallbackQuartileCode && !budgetMap[normalizedKey].journal_quartile_code) {
            budgetMap[normalizedKey].journal_quartile_code = fallbackQuartileCode;
          }

          if (
            fallbackQuartileCode &&
            !budgetMap[normalizedKey].journal_quartile_label &&
            QUARTILE_MAP[fallbackQuartileCode]
          ) {
            budgetMap[normalizedKey].journal_quartile_label = QUARTILE_MAP[fallbackQuartileCode];
          }
        });
      }

      return { pairs, rateMap, budgetMap };

    } catch (err) {
      console.error('getEnabledAuthorStatusQuartiles error:', err);
      return { pairs: [], rateMap: {}, budgetMap: {} };
    }
  };


  // =================================================================
  // EFFECT HOOKS
  // =================================================================

  useEffect(() => {
    externalFundingsRef.current = externalFundings;
  }, [externalFundings]);

  useEffect(() => {
    serverDocumentsRef.current = serverDocuments;
  }, [serverDocuments]);

  useEffect(() => {
    serverExternalFundingFilesRef.current = serverExternalFundingFiles;
  }, [serverExternalFundingFiles]);

  const attachmentSignature = useMemo(() => {
    const parts = [];

    if (Array.isArray(documentTypes) && documentTypes.length > 0) {
      documentTypes.forEach((docType) => {
        const docId = docType?.id;
        const file = uploadedFiles?.[docId] || uploadedFiles?.[String(docId)];
        if (file) {
          parts.push(`main:${docId}:${file.name}:${file.size}:${file.lastModified ?? ''}`);
        }
      });
    } else {
      Object.entries(uploadedFiles || {}).forEach(([key, file]) => {
        if (file) {
          parts.push(`main:${key}:${file.name}:${file.size}:${file.lastModified ?? ''}`);
        }
      });
    }

    (otherDocuments || []).forEach((file, index) => {
      if (file) {
        parts.push(`other:${index}:${file.name || ''}:${file.size || ''}:${file.lastModified ?? ''}`);
      }
    });

    (externalFundingFiles || []).forEach((doc) => {
      if (doc?.file) {
        const file = doc.file;
        parts.push(`external:${doc.funding_client_id || ''}:${doc.external_fund_id || ''}:${file.name || ''}:${file.size || ''}:${file.lastModified ?? ''}:${doc.timestamp ?? ''}`);
      }
    });

    return parts.join('|');
  }, [documentTypes, uploadedFiles, otherDocuments, externalFundingFiles]);

  const coauthorSignature = useMemo(() => {
    return (coauthors || [])
      .map((coauthor) => `${coauthor.user_id || ''}:${coauthor.user_fname || ''}:${coauthor.user_lname || ''}:${coauthor.display_name || ''}`)
      .join('|');
  }, [coauthors]);

  const externalFundingSignature = useMemo(() => {
    return (externalFundings || [])
      .map((funding) => `${funding.clientId || ''}:${funding.externalFundId ?? ''}:${funding.fundName || ''}:${funding.amount || ''}`)
      .join('|');
  }, [externalFundings]);

  const selectedFundSummary = useMemo(() => {
    const fallbackSummary = lockedFundSummary;

    if (!formData.author_status || !formData.journal_quartile) {
      return fallbackSummary;
    }

    const key = `${formData.author_status}|${formData.journal_quartile}`;
    const option = budgetOptionMap[key] || {};

    const optionName = findFirstString([
      option?.fund_name,
      option?.FundName,
      option?.fund_title,
      option?.FundTitle,
      option?.subcategory_name,
      option?.subcategory_name_th,
      resolvedSubcategoryName,
    ]);

    const optionDetail = findFirstString([
      option?.fund_description,
      option?.FundDescription,
      option?.subcategory_description,
      option?.SubcategoryDescription,
    ]);

    const combinedDescription = findFirstString([
      option?.fund_description,
      resolvedSubcategoryName,
      [optionName, optionDetail].filter(Boolean).join(' ').trim() || null,
    ]);

    if (!optionName && !optionDetail && !combinedDescription) {
      return fallbackSummary;
    }

    return {
      name: optionName || fallbackSummary?.name || null,
      detail: optionDetail || fallbackSummary?.detail || null,
      description: combinedDescription || optionDetail || optionName || fallbackSummary?.description || null,
    };
  }, [
    formData.author_status,
    formData.journal_quartile,
    budgetOptionMap,
    resolvedSubcategoryName,
    lockedFundSummary,
  ]);

  const authorStatusLabelMap = useMemo(() => {
    const labelMap = {};
    if (budgetOptionMap && typeof budgetOptionMap === 'object') {
      Object.entries(budgetOptionMap).forEach(([key, option]) => {
        if (!key) return;
        const [rawStatus] = key.split('|');
        const status = rawStatus ? rawStatus.trim() : '';
        if (!status || labelMap[status]) {
          return;
        }

        const resolvedLabel = resolveAuthorStatusShortLabel(status, findFirstString([
          option?.author_status_label,
          option?.author_status_name,
          option?.author_status_display,
          AUTHOR_STATUS_MAP[status],
          status,
        ]));

        if (resolvedLabel) {
          labelMap[status] = resolvedLabel;
        }
      });
    }

    if (formData.author_status && !labelMap[formData.author_status]) {
      const fallbackLabel = resolveAuthorStatusShortLabel(
        formData.author_status,
        findFirstString([
          AUTHOR_STATUS_MAP[formData.author_status],
          formData.author_status,
        ])
      );

      if (fallbackLabel) {
        labelMap[formData.author_status] = fallbackLabel;
      }
    }

    return labelMap;
  }, [budgetOptionMap, formData.author_status]);

  const authorStatusOptions = useMemo(() => {
    const seen = new Set();
    const options = [];

    const pushOption = (status) => {
      if (!status || seen.has(status)) {
        return;
      }
      seen.add(status);
      const label = resolveAuthorStatusShortLabel(
        status,
        authorStatusLabelMap[status] || AUTHOR_STATUS_MAP[status] || status
      );
      options.push({ value: status, label });
    };

    availableAuthorStatuses.forEach(pushOption);
    if (formData.author_status) {
      pushOption(formData.author_status);
    }

    const editingExistingSubmission = Boolean(prefilledSubmissionId);
    if (!editingExistingSubmission) {
      return options;
    }

    const allowedStatuses = new Set(['first_author', 'corresponding_author']);
    const filteredOptions = options.filter((option) => allowedStatuses.has(option.value));

    if (
      formData.author_status &&
      !allowedStatuses.has(formData.author_status) &&
      !filteredOptions.some((option) => option.value === formData.author_status)
    ) {
      const existingOption = options.find((option) => option.value === formData.author_status);
      if (existingOption) {
        filteredOptions.unshift(existingOption);
      }
    }

    return filteredOptions;
  }, [availableAuthorStatuses, authorStatusLabelMap, formData.author_status, prefilledSubmissionId]);

  const editingNeedsMoreInfoSubmission = Boolean(
    prefilledSubmissionId &&
    currentSubmissionStatus === 'needs_more_info' &&
    !isReadOnly
  );

  const showDraftActions = !editingNeedsMoreInfoSubmission;

  useEffect(() => {
    const editingDraft = prefilledSubmissionId && currentSubmissionStatus === 'draft' && !isReadOnly;
    if (!editingDraft) {
      return;
    }

    if (!selectedFundSummary) {
      return;
    }

    setLockedFundSummary((prev) => {
      if (prev && (prev.name || prev.description || prev.detail)) {
        return prev;
      }
      return selectedFundSummary ? { ...selectedFundSummary } : prev;
    });
  }, [
    prefilledSubmissionId,
    currentSubmissionStatus,
    isReadOnly,
    selectedFundSummary,
  ]);

  const budgetYearText = useMemo(() => {
    const normalizeYearLabel = (value) => {
      if (value === null || value === undefined) {
        return '';
      }
      const raw = String(value).trim();
      if (!raw) {
        return '';
      }
      return /^ปี/.test(raw) ? raw : `ปีงบประมาณ ${raw}`;
    };

    if (lockedBudgetYearLabel) {
      return normalizeYearLabel(lockedBudgetYearLabel);
    }

    if (formData.year_id == null && years.length === 0) {
      return '';
    }

    const targetId = formData.year_id != null ? String(formData.year_id) : null;
    if (targetId) {
      const matched = years.find((entry) => {
        const yearId = entry?.year_id ?? entry?.YearID ?? entry?.id ?? null;
        return yearId != null && String(yearId) === targetId;
      });

      if (matched) {
        return normalizeYearLabel(matched?.year ?? matched?.Year);
      }
    }

    return targetId ? normalizeYearLabel(targetId) : '';
  }, [formData.year_id, years, lockedBudgetYearLabel]);

  const formSignature = useMemo(() => {
    return JSON.stringify({
      author_status: formData.author_status,
      article_title: formData.article_title,
      journal_name: formData.journal_name,
      journal_issue: formData.journal_issue,
      journal_pages: formData.journal_pages,
      journal_month: formData.journal_month,
      journal_year: formData.journal_year,
      journal_quartile: formData.journal_quartile,
      author_name_list: formData.author_name_list,
      total_amount: formData.total_amount,
      revision_fee: formData.revision_fee,
      publication_fee: formData.publication_fee,
      external_funding_amount: formData.external_funding_amount,
      publication_reward: formData.publication_reward,
      signature: formData.signature,
    });
  }, [
    formData.author_status,
    formData.article_title,
    formData.journal_name,
    formData.journal_issue,
    formData.journal_pages,
    formData.journal_month,
    formData.journal_year,
    formData.journal_quartile,
    formData.author_name_list,
    formData.total_amount,
    formData.revision_fee,
    formData.publication_fee,
    formData.external_funding_amount,
    formData.publication_reward,
    formData.signature,
  ]);

  const previewDataSignature = useMemo(() => {
    return [formSignature, coauthorSignature, externalFundingSignature, attachmentSignature].join('||');
  }, [formSignature, coauthorSignature, externalFundingSignature, attachmentSignature]);

  useEffect(() => {
    if (!previewDataSignature) {
      return;
    }

    if (previewSignatureRef.current === '') {
      previewSignatureRef.current = previewDataSignature;
      return;
    }

    if (previewSignatureRef.current !== previewDataSignature) {
      previewSignatureRef.current = previewDataSignature;
      setPreviewState((prev) => {
        if (prev.blobUrl && previewUrlRef.current === prev.blobUrl) {
          try {
            URL.revokeObjectURL(prev.blobUrl);
          } catch (error) {
            console.warn('Failed to revoke preview blob URL:', error);
          }
          previewUrlRef.current = null;
        }
        return {
          loading: false,
          error: null,
          blobUrl: null,
          signedUrl: null,
          hasPreviewed: false,
          timestamp: null,
        };
      });
      setPreviewAcknowledged(false);
    }
  }, [previewDataSignature]);

  // Set category context from navigation
  useEffect(() => {
    if (categoryId) {
      setFormData(prev => ({ ...prev, category_id: categoryId }));
    }
  }, [categoryId]);

  const loadExistingSubmission = useCallback(
    async (targetSubmissionId) => {
      if (!targetSubmissionId) {
        return;
      }

      hydratingRef.current = true;
      try {
        setLoading(true);
        serverFileCacheRef.current.clear();

        const response = await submissionAPI.getById(targetSubmissionId);
        const payload = response?.submission || response;

        if (!payload || !payload.submission_id) {
          throw new Error('ไม่พบข้อมูลคำร้อง');
        }

        setCurrentSubmissionId(payload.submission_id);

        const statusCandidates = [
          payload.status?.code,
          payload.status?.status_code,
          payload.status?.status,
          payload.status_code,
          payload.Status?.Code,
          payload.Status?.status_code,
        ];
        const normalizedStatus = statusCandidates.map(normalizeStatusCode).find(Boolean) || null;
        const allowEditing = normalizedStatus ? EDITABLE_STATUS_CODES.has(normalizedStatus) : true;
        setCurrentSubmissionStatus(normalizedStatus);
        setIsReadOnly(baseReadOnly ? true : !allowEditing);

        const detail = payload.PublicationRewardDetail || payload.publication_reward_detail || {};
        const applicantId = payload.user_id ?? payload.UserID ?? payload.applicant_user_id ?? null;
        const submissionUsers = payload.submission_users || payload.SubmissionUsers || [];

        const normalizedCoauthors = [];
        const seenCoauthors = new Set();
        submissionUsers.forEach((entry) => {
          const normalized = buildCoauthorFromSubmissionUser(entry);
          if (!normalized) return;
          if (applicantId != null && normalized.user_id === applicantId) return;
          if (seenCoauthors.has(normalized.user_id)) return;
          seenCoauthors.add(normalized.user_id);
          normalizedCoauthors.push(normalized);
        });
        setCoauthors(normalizedCoauthors);

        const externalFundsRaw = detail.external_fundings || detail.ExternalFunds || [];
        const normalizedFunds = externalFundsRaw.map((fund, index) => {
          const fundId = fund.external_fund_id ?? fund.ExternalFundID ?? null;
          const fundDocument = fund.document || fund.Document || fund.file || fund.File || {};
          const nestedFile = fundDocument.file || fundDocument.File || {};

          const rawDocumentId =
            fund.document_id ??
            fund.DocumentID ??
            fund.DocumentId ??
            fundDocument.document_id ??
            fundDocument.DocumentID ??
            fundDocument.documentId ??
            fundDocument.Document?.document_id ??
            fundDocument.Document?.DocumentID ??
            null;

          const documentId = rawDocumentId != null ? String(rawDocumentId) : null;

          const documentName = findFirstString([
            fundDocument.original_name,
            fundDocument.original_filename,
            fundDocument.file_name,
            fundDocument.filename,
            fundDocument.document_name,
            fundDocument.DocumentName,
            nestedFile.original_name,
            nestedFile.original_filename,
            nestedFile.file_name,
            nestedFile.filename,
            fund.document_name,
            fund.DocumentName,
          ]);

          const rawFileId =
            fund.file_id ??
            fund.FileID ??
            fundDocument.file_id ??
            fundDocument.FileID ??
            fundDocument.fileId ??
            fundDocument.FileId ??
            nestedFile.file_id ??
            nestedFile.FileID ??
            nestedFile.fileId ??
            nestedFile.FileId ??
            null;

          const documentFileId = rawFileId != null ? String(rawFileId) : null;
          const resolvedFileName = documentName || (documentId ? 'ไฟล์จากระบบ' : null);

          return {
            clientId: `server-${fundId ?? index}`,
            externalFundId: fundId,
            fundName: fund.fund_name ?? fund.FundName ?? '',
            amount: clampCurrencyValue(toNumberOrEmpty(fund.amount ?? fund.Amount ?? '')),
            file: null,
            serverDocumentId: documentId,
            serverFileName: resolvedFileName,
            serverFileId: documentFileId,
            serverDocumentPendingRemovalReason: null,
          };
        });
        setExternalFundings(normalizedFunds);
        externalFundingsRef.current = normalizedFunds;
        setExternalFundingFiles([]);
        setUploadedFiles({});
        setOtherDocuments([]);

        const derivedFundSummary = buildFundSummaryFromPayload(payload, detail);
        setLockedFundSummary(derivedFundSummary);

        const indexingFlags = parseIndexingFlags(detail.indexing ?? detail.Indexing ?? '');

        setFormData((prev) => {
          const { year: resolvedYear, month: resolvedMonth } = parsePublicationDateParts(
            detail.publication_date ?? detail.PublicationDate,
            { year: prev.journal_year, month: prev.journal_month }
          );

          const authorStatus =
            detail.author_type || detail.author_status || payload.author_status || prev.author_status;

          const quartileValue = findFirstString([
            detail.quartile,
            detail.journal_quartile,
            detail.JournalQuartile,
            payload.quartile,
            payload.journal_quartile,
            prev.journal_quartile,
          ]);
          const normalizedQuartile = quartileValue ? quartileValue.toUpperCase() : (prev.journal_quartile || '');

          const nextYearId = parseIntegerOrNull(
            payload.year_id ?? detail.year_id ?? prev.year_id ?? yearId ?? null
          );
          previousYearRef.current = nextYearId;
          previousAuthorStatusRef.current = authorStatus || '';

          const rewardValue = toNumberOrEmpty(
            detail.reward_amount ?? prev.publication_reward ?? prev.reward_amount ?? ''
          );
          const revisionValue = clampCurrencyValue(
            toNumberOrEmpty(detail.revision_fee ?? prev.revision_fee ?? '')
          );
          const publicationValue = clampCurrencyValue(
            toNumberOrEmpty(detail.publication_fee ?? prev.publication_fee ?? '')
          );
          const resolvedExternalAmount = clampCurrencyValue(
            toNumberOrEmpty(detail.external_funding_amount ?? prev.external_funding_amount ?? '')
          );
          const normalizedReward = typeof rewardValue === 'number' ? rewardValue : 0;
          const normalizedRevision = typeof revisionValue === 'number' ? revisionValue : 0;
          const normalizedPublication = typeof publicationValue === 'number' ? publicationValue : 0;
          const normalizedExternal = typeof resolvedExternalAmount === 'number' ? resolvedExternalAmount : 0;

          const calculatedTotal = toNumberOrEmpty(
            detail.total_amount ??
            prev.total_amount ??
            normalizedReward + normalizedRevision + normalizedPublication - normalizedExternal
          );

          return {
            ...prev,
            year_id: nextYearId,
            category_id: payload.category_id ?? prev.category_id ?? categoryId ?? null,
            subcategory_id: payload.subcategory_id ?? detail.subcategory_id ?? prev.subcategory_id,
            subcategory_budget_id:
              payload.subcategory_budget_id ?? detail.subcategory_budget_id ?? prev.subcategory_budget_id,
            author_status: authorStatus || '',
            journal_quartile: normalizedQuartile,
            article_title: detail.paper_title ?? detail.article_title ?? prev.article_title ?? '',
            journal_name: detail.journal_name ?? prev.journal_name ?? '',
            journal_issue: detail.volume_issue ?? prev.journal_issue ?? '',
            journal_pages: detail.page_numbers ?? prev.journal_pages ?? '',
            journal_month: resolvedMonth || prev.journal_month || '',
            journal_year: resolvedYear || prev.journal_year || '',
            journal_url: detail.url ?? prev.journal_url ?? '',
            doi: detail.doi ?? prev.doi ?? '',
            article_online_db: detail.indexing ?? prev.article_online_db ?? '',
            in_isi: indexingFlags.isi,
            in_scopus: indexingFlags.scopus,
            in_web_of_science: indexingFlags.webOfScience,
            in_tci: indexingFlags.tci,
            publication_reward: rewardValue,
            reward_amount: rewardValue,
            revision_fee: revisionValue,
            publication_fee: publicationValue,
            external_funding_amount: resolvedExternalAmount,
            total_amount: calculatedTotal,
            author_name_list: detail.author_name_list ?? prev.author_name_list ?? '',
            signature: detail.signature ?? prev.signature ?? '',
            has_university_fund: normalizeYesNoValue(
              detail.has_university_funding ??
                detail.has_university_fund ??
                payload.has_university_funding ??
                payload.has_university_fund ??
                prev.has_university_fund,
              'no'
            ),
            university_fund_ref:
              detail.funding_references ??
              payload.funding_references ??
              payload.university_fund_ref ??
              prev.university_fund_ref ??
              '',
            university_ranking:
              detail.university_rankings ??
              detail.university_ranking ??
              payload.university_ranking ??
              payload.university_rankings ??
              prev.university_ranking ??
              '',
            phone_number:
              payload.phone_number ??
              payload.contact_phone ??
              prev.phone_number ??
              '',
            bank_account: payload.bank_account ?? prev.bank_account ?? '',
            bank_account_name: payload.bank_account_name ?? prev.bank_account_name ?? '',
            bank_name: payload.bank_name ?? prev.bank_name ?? '',
          };
        });

        if (payload.year_id != null) {
          const enabledKey = String(payload.year_id);
          setEnabledYears((prev) => {
            const list = Array.isArray(prev) ? [...prev] : [];
            if (!list.includes(enabledKey)) {
              list.push(enabledKey);
            }
            return list;
          });
        }

        setTermAcknowledgements(() => buildTermAcknowledgements(endOfContractTerms, {}));

        if (detail.main_annoucement != null || detail.reward_announcement != null) {
          setAnnouncementLock((prev) => ({
            main_annoucement: detail.main_annoucement ?? prev.main_annoucement ?? null,
            reward_announcement: detail.reward_announcement ?? prev.reward_announcement ?? null,
          }));
        }

        const adminComment = findFirstString([
          payload.admin_comment,
          payload.adminComment,
          payload.status?.admin_comment,
          payload.Status?.admin_comment,
        ]);

        const headComment = findFirstString([
          payload.head_comment,
          payload.dept_head_comment,
          payload.department_head_comment,
          payload.status?.head_comment,
          payload.Status?.head_comment,
        ]);

        setReviewComments({
          admin: adminComment || null,
          head: headComment || null,
        });

        setPrefilledSubmissionId(toSubmissionKey(payload.submission_id));

        await refreshSubmissionDocuments(payload.submission_id);
      } catch (error) {
        const statusCode = error?.response?.status ?? error?.status ?? null;

        if (statusCode === 404) {
          resetForm();
          setCurrentSubmissionStatus(null);
          const submissionKey = toSubmissionKey(targetSubmissionId);
          if (submissionKey) {
            missingSubmissionRef.current.add(submissionKey);
          }
          setCurrentSubmissionId(null);
          setPrefilledSubmissionId((prev) => {
            if (!submissionKey) {
              return prev;
            }
            return prev === submissionKey ? prev : submissionKey;
          });
          setIsReadOnly(baseReadOnly);
          Toast.fire({
            icon: 'info',
            title: 'ร่างถูกลบแล้ว',
            text: 'ไม่พบคำร้องที่ต้องการแก้ไข ระบบได้สร้างแบบฟอร์มใหม่ให้คุณแล้ว',
          });
        } else {
          console.error('Failed to load submission for editing:', error);
          const message = error?.message || 'ไม่สามารถโหลดข้อมูลคำร้องได้';
          Toast.fire({
            icon: 'error',
            title: 'ไม่สามารถโหลดคำร้อง',
            text: message,
          });
        }
      } finally {
        setLoading(false);
        setTimeout(() => {
          hydratingRef.current = false;
        }, 0);
      }
    },
    [
      baseReadOnly,
      categoryId,
      resetForm,
      yearId,
      endOfContractTerms,
    ]
  );

  // Load initial data on mount
  useEffect(() => {
    loadInitialData();
  }, [categoryId, yearId, initialSubmissionId]);

  useEffect(() => {
    if (!initialDataReady) {
      return;
    }

    const normalizedInitialId = toSubmissionKey(initialSubmissionId);

    if (normalizedInitialId) {
      if (missingSubmissionRef.current.has(normalizedInitialId)) {
        if (prefilledSubmissionId !== normalizedInitialId) {
          setPrefilledSubmissionId(normalizedInitialId);
        }
        return;
      }

      if (prefilledSubmissionId === normalizedInitialId) {
        return;
      }

      loadExistingSubmission(initialSubmissionId);
      return;
    }

    if (prefilledSubmissionId !== null) {
      setPrefilledSubmissionId(null);
    }
  }, [
    initialDataReady,
    initialSubmissionId,
    loadExistingSubmission,
    prefilledSubmissionId,
  ]);

  useEffect(() => {
    if (!Array.isArray(availableDocumentTypes) || availableDocumentTypes.length === 0) {
      setDocumentTypes([]);
      return;
    }

    const computed = computeDocumentRequirements(availableDocumentTypes);
    setDocumentTypes(computed);
  }, [availableDocumentTypes, computeDocumentRequirements]);

  useEffect(() => {
    if (!formData.subcategory_id && resolvedSubcategoryName) {
      setResolvedSubcategoryName(null);
      return;
    }

    if (!formData.subcategory_id || resolvedSubcategoryName) {
      return;
    }

    const targetId = Number(formData.subcategory_id);
    if (Number.isNaN(targetId)) {
      return;
    }

    const entries = Object.values(budgetOptionMap || {});
    for (const entry of entries) {
      const candidateId =
        entry?.subcategory_id ?? entry?.subcategoryId ?? null;
      if (candidateId != null && Number(candidateId) === targetId) {
        const label = findFirstString([
          entry?.subcategory_name,
          entry?.subcategory_name_th,
          entry?.fund_description,
        ]);
        if (label) {
          setResolvedSubcategoryName(label);
        }
        break;
      }
    }
  }, [budgetOptionMap, formData.subcategory_id, resolvedSubcategoryName]);

  // Reload quartile configs when year changes
  useEffect(() => {
    const loadQuartileConfigs = async () => {
      if (!formData.year_id || years.length === 0) {
        return;
      }

      const yearObj = years.find(y => y.year_id === formData.year_id);
      if (!yearObj) {
        setQuartileConfigs({});
        return;
      }

      const targetYearLabel = String(yearObj.year);

      if (
        rewardConfigYear &&
        String(rewardConfigYear) === targetYearLabel &&
        Object.keys(preloadedQuartileConfigs || {}).length > 0
      ) {
        setQuartileConfigs(preloadedQuartileConfigs);
        return;
      }

      try {
        const configResponse = await rewardConfigAPI.getConfig({
          year: yearObj.year
        });

        if (configResponse && configResponse.data) {
          const configMeta = {};
          const limitMap = {};
          configResponse.data.forEach(config => {
            if (!config) return;
            const quartileKey = config.journal_quartile ?? config.JournalQuartile;
            if (!quartileKey) return;
            const normalizedKey = String(quartileKey).trim().toUpperCase();
            const maxAmountValue = parseNumberOrNull(config.max_amount ?? config.MaxAmount);
            const isActive = Boolean(config.is_active ?? config.IsActive);
            if (isActive && maxAmountValue !== null) {
              limitMap[normalizedKey] = maxAmountValue;
            } else if (!Object.prototype.hasOwnProperty.call(limitMap, normalizedKey)) {
              limitMap[normalizedKey] = null;
            }
            configMeta[normalizedKey] = {
              maxAmount: maxAmountValue,
              isActive,
              description: config.condition_description ?? config.ConditionDescription ?? '',
            };
          });
          setQuartileConfigs(configMeta);
          setPreloadedQuartileConfigs(configMeta);
          setRewardConfigMap(limitMap);
          setRewardConfigYear(targetYearLabel);
        }
      } catch (error) {
        console.error('Error loading quartile configs:', error);
        setQuartileConfigs({});
      }
    };

    loadQuartileConfigs();
  }, [formData.year_id, years, rewardConfigYear, preloadedQuartileConfigs]);

  // Recompute enabled pairs when year changes
  useEffect(() => {
    const recompute = async () => {
      if (!categoryId || !formData.year_id) {
        return;
      }

      const currentYearId = formData.year_id;
      const previousYearId = previousYearRef.current;
      const hydrating = hydratingRef.current;
      const editingDraft = prefilledSubmissionId && currentSubmissionStatus === 'draft' && !isReadOnly;

      try {
        const { pairs, rateMap, budgetMap } = await getEnabledAuthorStatusQuartiles({
          category_id: categoryId,
          year_id: currentYearId,
          fallbackRateMap: fallbackRewardRateMap,
        });

        setEnabledPairs(pairs);
        const combinedRateMap = { ...fallbackRewardRateMap, ...rateMap };
        setRewardRateMap(combinedRateMap);
        setBudgetOptionMap(budgetMap);

        let uniqueStatuses = [...new Set(pairs.map((p) => p.author_status))];
        if (uniqueStatuses.length === 0 && Object.keys(combinedRateMap).length > 0) {
          uniqueStatuses = [...new Set(Object.keys(combinedRateMap).map((key) => key.split('|')[0]))];
        }
        if (hydrating && formData.author_status && !uniqueStatuses.includes(formData.author_status)) {
          uniqueStatuses = [...uniqueStatuses, formData.author_status];
        }
        setAvailableAuthorStatuses(uniqueStatuses);

        const yearChanged = previousYearId !== currentYearId;
        previousYearRef.current = currentYearId;

        if (!hydrating) {
          if (!editingDraft && yearChanged) {
            setAvailableQuartiles([]);
            setFormData((prev) => ({
              ...prev,
              author_status: '',
              journal_quartile: '',
              subcategory_id: null,
              subcategory_budget_id: null,
              publication_reward: 0,
              reward_amount: 0,
            }));
            setPolicyContext(null);
            setResolvedSubcategoryName(null);
          } else if (!editingDraft && !formData.author_status) {
            setAvailableQuartiles([]);
          }
        }

        setResolutionError(editingDraft ? '' : (pairs.length === 0 ? 'ไม่พบทุนสำหรับปี/สถานะ/ควอร์ไทล์ที่เลือก' : ''));
      } catch (error) {
        console.error('Failed to resolve author status/quartile pairs:', error);
        setEnabledPairs([]);
        setRewardRateMap(fallbackRewardRateMap);
        setBudgetOptionMap({});
        setAvailableAuthorStatuses([]);
        if (!hydrating) {
          setAvailableQuartiles([]);
          if (!editingDraft) {
            setFormData((prev) => ({
              ...prev,
              author_status: '',
              journal_quartile: '',
              subcategory_id: null,
              subcategory_budget_id: null,
              publication_reward: 0,
              reward_amount: 0,
            }));
            setPolicyContext(null);
            setResolvedSubcategoryName(null);
          }
        }
        setResolutionError(editingDraft ? '' : 'ไม่สามารถตรวจสอบทุนได้');
      }
    };

    recompute();
  }, [
    categoryId,
    formData.year_id,
    fallbackRewardRateMap,
    prefilledSubmissionId,
    currentSubmissionStatus,
    isReadOnly,
    formData.author_status,
  ]);

  // Update quartile options when author status changes
  useEffect(() => {
    const currentStatus = formData.author_status;
    const hydrating = hydratingRef.current;
    const previousStatus = previousAuthorStatusRef.current;

    if (!currentStatus) {
      setAvailableQuartiles([]);
      if (!hydrating && previousStatus) {
        setFormData((prev) => ({
          ...prev,
          journal_quartile: '',
          subcategory_id: null,
          subcategory_budget_id: null,
          publication_reward: 0,
          reward_amount: 0,
        }));
        setPolicyContext(null);
        setResolvedSubcategoryName(null);
      }
      setResolutionError('');
      previousAuthorStatusRef.current = '';
      return;
    }

    let quartiles = enabledPairs
      .filter((p) => p.author_status === currentStatus)
      .map((p) => p.journal_quartile);
    if (hydrating && formData.journal_quartile) {
      quartiles = Array.from(new Set([...quartiles, formData.journal_quartile]));
    }
    const sorted = sortQuartiles(quartiles);
    setAvailableQuartiles(sorted);

    if (!hydrating && previousStatus !== currentStatus) {
      setFormData((prev) => ({
        ...prev,
        journal_quartile: '',
        subcategory_id: null,
        subcategory_budget_id: null,
        publication_reward: 0,
        reward_amount: 0,
      }));
      setPolicyContext(null);
      setResolvedSubcategoryName(null);
    }

    if (prefilledSubmissionId && currentSubmissionStatus === 'draft' && !isReadOnly) {
      setResolutionError('');
    } else if (sorted.length === 0) {
      setResolutionError('ไม่พบทุนสำหรับปี/สถานะ/ควอร์ไทล์ที่เลือก');
    } else {
      setResolutionError('');
    }

    previousAuthorStatusRef.current = currentStatus;
  }, [
    formData.author_status,
    enabledPairs,
    formData.journal_quartile,
    prefilledSubmissionId,
    currentSubmissionStatus,
    isReadOnly,
  ]);

  // Resolve mapping when author status or quartile changes
  useEffect(() => {
    const resolve = async () => {
      if (formData.author_status && formData.journal_quartile && formData.year_id) {
        try {
          const key = `${formData.author_status}|${formData.journal_quartile}`;
          const optionContext = budgetOptionMap[key] || {};
          const fallbackReward = rewardRateMap[key] ?? 0;
          setPolicyContext(null);
          const result = await resolveBudgetAndSubcategory({
            category_id: categoryId,
            year_id: formData.year_id,
            author_status: formData.author_status,
            journal_quartile: formData.journal_quartile,
            optionContext,
            fallbackReward,
          });
          if (result) {
            const resolvedSubcategoryId = parseIntegerOrNull(result?.subcategory_id ?? optionContext.subcategory_id);
            const resolvedBudgetId = parseIntegerOrNull(result?.subcategory_budget_id ?? optionContext.subcategory_budget_id);
            const resolvedReward = parseNumberOrNull(result?.reward_amount);
            const normalizedPolicy = normalizePolicyPayload(result.policy);
            const resolvedName = findFirstString([
              result?.subcategory_name,
              result?.subcategory_name_th,
              optionContext.subcategory_name,
              optionContext.subcategory_name_th,
              optionContext.fund_description,
            ]);
            setResolvedSubcategoryName(resolvedName);
            setPolicyContext(normalizedPolicy);
          if (!(prefilledSubmissionId && currentSubmissionStatus === 'draft' && !isReadOnly)) {
            setFormData(prev => ({
              ...prev,
              subcategory_id: resolvedSubcategoryId,
              subcategory_budget_id: resolvedBudgetId,
              publication_reward: resolvedReward ?? fallbackReward,
              reward_amount: resolvedReward ?? fallbackReward,
            }));
          }
            const warningMessages = [];
            const userRemainingGrants = normalizedPolicy?.user_remaining?.grants;
            if (userRemainingGrants === 0) {
              warningMessages.push('คุณใช้สิทธิ์จำนวนครั้งครบตามโควตาประจำปีแล้ว');
            }
            const userRemainingAmount = normalizedPolicy?.user_remaining?.amount;
            if (userRemainingAmount !== null && userRemainingAmount !== undefined && userRemainingAmount <= 0) {
              warningMessages.push('คุณใช้วงเงินประจำปีครบแล้ว');
            }

            if (warningMessages.length > 0) {
              const contextKey = [
                formData.year_id ?? 'unknown-year',
                formData.author_status ?? 'unknown-status',
                formData.journal_quartile ?? 'unknown-quartile',
                ...warningMessages
              ].join('|');

              if (policyWarningRef.current.lastShownKey !== contextKey) {
                policyWarningRef.current.lastShownKey = contextKey;

                Swal.fire({
                  icon: 'warning',
                  title: 'คำเตือน',
                  html: warningMessages.map(message => `<div>${message}</div>`).join(''),
                  confirmButtonText: 'ตกลง'
                });
              }
            } else {
              policyWarningRef.current.lastShownKey = null;
            }

            setResolutionError('');
          } else {
          setResolvedSubcategoryName(null);
          if (!(prefilledSubmissionId && currentSubmissionStatus === 'draft' && !isReadOnly)) {
            setFormData(prev => ({
              ...prev,
              subcategory_id: null,
              subcategory_budget_id: null,
              publication_reward: 0,
              reward_amount: 0,
            }));
          }
          if (prefilledSubmissionId && currentSubmissionStatus === 'draft' && !isReadOnly) {
            setResolutionError('');
          } else {
            setResolutionError('ไม่พบทุนสำหรับปี/สถานะ/ควอร์ไทล์ที่เลือก');
          }
          setPolicyContext(null);
          policyWarningRef.current.lastShownKey = null;
          }
        } catch (error) {
          console.error('resolveBudgetAndSubcategory error:', error);
          setResolvedSubcategoryName(null);
          if (!(prefilledSubmissionId && currentSubmissionStatus === 'draft' && !isReadOnly)) {
            setFormData(prev => ({
              ...prev,
              subcategory_id: null,
              subcategory_budget_id: null
            }));
          }
          if (prefilledSubmissionId && currentSubmissionStatus === 'draft' && !isReadOnly) {
            setResolutionError('');
          } else {
            setResolutionError('ไม่สามารถตรวจสอบทุนได้');
          }
          policyWarningRef.current.lastShownKey = null;
          setPolicyContext(null);
        }
      }
    };
    resolve();
  }, [
    formData.author_status,
    formData.journal_quartile,
    formData.year_id,
    categoryId,
    budgetOptionMap,
    rewardRateMap,
    prefilledSubmissionId,
    currentSubmissionStatus,
    isReadOnly,
  ]);

  // Update fee limits when quartile changes
  useEffect(() => {
    const updateFeeLimits = async () => {
      if (formData.journal_quartile) {
        try {
          // หา year (พ.ศ.) จาก year_id
          const yearObj = years.find(y => y.year_id === formData.year_id);
          const targetYear =
            lockedBudgetYearLabel ||
            rewardConfigYear ||
            yearObj?.year ||
            (new Date().getFullYear() + 543).toString();

          const maxLimit = await getMaxFeeLimit(formData.journal_quartile, targetYear, rewardConfigMap);

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
  }, [formData.journal_quartile, formData.year_id, years, lockedBudgetYearLabel, rewardConfigMap, rewardConfigYear]);

  // Calculate total amount when relevant values change
  useEffect(() => {
    const canUseExternal = Boolean(formData.journal_quartile && feeLimits.total > 0);
    const externalTotal = canUseExternal
      ? externalFundings.reduce((sum, funding) => sum + (parseFloat(funding.amount) || 0), 0)
      : 0;

    const totalAmount = (parseFloat(formData.publication_reward) || 0) +
                      (parseFloat(formData.revision_fee) || 0) +
                      (parseFloat(formData.publication_fee) || 0) -
                      externalTotal;

    setFormData(prev => ({
      ...prev,
      external_funding_amount: externalTotal,
      total_amount: totalAmount
    }));
  }, [
    formData.publication_reward,
    formData.revision_fee,
    formData.publication_fee,
    formData.journal_quartile,
    externalFundings,
    feeLimits.total,
  ]);

  const markDocumentForRemoval = useCallback(
    (docId, reason = 'remove', options = {}) => {
      if (docId == null) {
        return;
      }

      const idStr = String(docId);

      setDetachedDocumentIds((prev) => {
        if (prev.includes(idStr)) {
          return prev;
        }
        return [...prev, idStr];
      });

      const updater = (doc) => {
        if (!doc || String(doc.document_id) !== idStr) {
          return doc;
        }
        return {
          ...doc,
          pendingRemoval: true,
          pendingRemovalReason: reason,
        };
      };

      setServerDocuments((prev) => prev.map(updater));
      setServerExternalFundingFiles((prev) => prev.map(updater));

      if (options.fundingClientId) {
        setExternalFundings((prev) =>
          prev.map((funding) =>
            funding.clientId === options.fundingClientId
              ? { ...funding, serverDocumentPendingRemovalReason: reason }
              : funding
          )
        );
      }
    },
    [setDetachedDocumentIds, setServerDocuments, setServerExternalFundingFiles, setExternalFundings]
  );

  useEffect(() => {
    if (hydratingRef.current || !formData.journal_quartile || feeLimits.total > 0) {
      return;
    }

    setFormData((prev) => {
      const next = { ...prev };
      let updated = false;

      const revisionNumeric = parseFloat(prev.revision_fee);
      if (!Number.isNaN(revisionNumeric) && revisionNumeric !== 0) {
        next.revision_fee = '';
        updated = true;
      }

      const publicationNumeric = parseFloat(prev.publication_fee);
      if (!Number.isNaN(publicationNumeric) && publicationNumeric !== 0) {
        next.publication_fee = '';
        updated = true;
      }

      if (!updated) {
        return prev;
      }

      next.external_funding_amount = 0;
      next.total_amount = (parseFloat(prev.publication_reward) || 0);
      return next;
    });

    if (externalFundings.length > 0) {
      externalFundings.forEach((funding) => {
        if (funding?.serverDocumentId) {
          markDocumentForRemoval(funding.serverDocumentId, 'remove', { fundingClientId: funding.clientId });
        }
      });
      setExternalFundings([]);
    }

    if (externalFundingFiles.length > 0) {
      setExternalFundingFiles([]);
    }
  }, [
    formData.journal_quartile,
    feeLimits.total,
    externalFundings,
    externalFundingFiles,
    markDocumentForRemoval,
  ]);

  // Auto-save draft periodically
  // Check fees limit when quartile or fees change
  useEffect(() => {
    const checkFees = async () => {
      if (formData.journal_quartile) {
        const yearObj = years.find(y => y.year_id === formData.year_id);
        const targetYear =
          lockedBudgetYearLabel ||
          rewardConfigYear ||
          yearObj?.year ||
          (new Date().getFullYear() + 543).toString();
        const check = await checkFeesLimit(
          formData.revision_fee,
          formData.publication_fee,
          formData.journal_quartile,
          rewardConfigMap,
          targetYear
        );

        if (!check.isValid && check.maxLimit > 0) {
          setFeeError(`รวมค่าปรับปรุงและค่าตีพิมพ์เกินวงเงินที่กำหนด (ไม่เกิน ${formatCurrency(check.maxLimit)} บาท)`);
        } else {
          setFeeError('');
        }
      }
    };

    checkFees();
  }, [
    formData.journal_quartile,
    formData.revision_fee,
    formData.publication_fee,
    years,
    lockedBudgetYearLabel,
    rewardConfigMap,
    rewardConfigYear,
  ]);

  // Clear fees and external funding when quartile changes to ineligible ones
  useEffect(() => {
    const clearFeesIfNeeded = async () => {
      if (formData.journal_quartile) {
        const yearObj = years.find(y => y.year_id === formData.year_id);
        const targetYear =
          lockedBudgetYearLabel ||
          rewardConfigYear ||
          yearObj?.year ||
          (new Date().getFullYear() + 543).toString();
        const maxLimit = await getMaxFeeLimit(formData.journal_quartile, targetYear, rewardConfigMap);

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
  }, [formData.journal_quartile, formData.year_id, years, lockedBudgetYearLabel, rewardConfigMap, rewardConfigYear]);

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
  // =================================================================
  // DATA LOADING FUNCTIONS
  // =================================================================

  // Load initial data from APIs
  const loadInitialData = async () => {
    try {
      setInitialDataReady(false);
      setLoading(true);
      
      // Get current user data
      let userLoaded = false;
      let currentUserData = null;
      
      // Try to fetch from API first
      try {
        const profileResponse = await authAPI.getProfile();

        if (profileResponse && profileResponse.user) {
          currentUserData = profileResponse.user;
          setCurrentUser(currentUserData);
          userLoaded = true;
        }
      } catch (error) {
        console.warn('Could not fetch profile from API:', error);
      }

      // If API fails, use localStorage
      if (!userLoaded) {
        const storedUser = authAPI.getCurrentUser();
        if (storedUser) {
          currentUserData = storedUser;
          setCurrentUser(storedUser);
        }
      }

      // Load system data
      const [
        yearsResponse,
        usersResponse,
        docTypesResponse,
        currentYearResponse,
        availableRateYearsResponse,
      ] = await Promise.all([
        systemAPI.getYears(),
        publicationFormAPI.getUsers(),
        publicationFormAPI.getDocumentTypes(),
        systemConfigAPI.getCurrentYear().catch((error) => {
          console.warn('Unable to fetch current year from system config:', error);
          return null;
        }),
        publicationRewardRatesAPI.getAvailableYears().catch((error) => {
          console.warn('Unable to fetch publication reward rate years:', error);
          return null;
        }),
      ]);

      // === Lock current system_config to the submission time ===
      try {
        // หลังจากเรียก systemConfigAPI.getWindow()
        const rawWindow = await systemConfigAPI.getWindow();
        const root = rawWindow?.data ?? rawWindow; // รองรับทั้ง 2 รูปแบบ (admin vs window)

        // อ่าน announcement_id ที่ถูกต้องจาก system_config
        setAnnouncementLock({
          main_annoucement: root?.config_id ?? null,
          reward_announcement: root?.config_id ?? null,
        });

      } catch (e) {
        console.warn('Cannot fetch system-config window; main_annoucement/reward_announcement will be null', e);
        setAnnouncementLock({ main_annoucement: null, reward_announcement: null });
      }

      // Normalize year list from response
      const rawYears = Array.isArray(yearsResponse?.years)
        ? yearsResponse.years
        : Array.isArray(yearsResponse?.data)
          ? yearsResponse.data
          : Array.isArray(yearsResponse)
            ? yearsResponse
            : [];

      const normalizedYears = rawYears
        .map((entry) => {
          const yearId = entry?.year_id ?? entry?.YearID ?? entry?.id ?? null;
          const yearLabel = entry?.year ?? entry?.Year ?? null;
          if (yearId == null || yearLabel == null) {
            return null;
          }
          return {
            ...entry,
            year_id: Number.isNaN(Number(yearId)) ? yearId : Number(yearId),
            year: String(yearLabel),
          };
        })
        .filter(Boolean);

      if (normalizedYears.length > 0) {
        setYears(normalizedYears);
      } else {
        setYears([]);
      }

      const sortedYearsDesc = normalizedYears
        .slice()
        .sort((a, b) => Number(String(b.year).replace(/[^0-9]/g, '')) - Number(String(a.year).replace(/[^0-9]/g, '')));

      const systemYearCandidate = [
        currentYearResponse?.current_year,
        currentYearResponse?.data?.current_year,
        currentYearResponse?.year,
        currentYearResponse?.data?.year,
      ].find((value) => value !== null && value !== undefined && value !== '') ?? null;

      let lockedYearEntry = null;
      if (systemYearCandidate != null) {
        const targetLabel = String(systemYearCandidate);
        lockedYearEntry = normalizedYears.find((year) => String(year.year) === targetLabel) ?? null;
      }

      if (!lockedYearEntry && sortedYearsDesc.length > 0) {
        lockedYearEntry = sortedYearsDesc[0];
      }

      const lockedYearLabel = lockedYearEntry ? String(lockedYearEntry.year) : systemYearCandidate ? String(systemYearCandidate) : null;
      setLockedBudgetYearLabel(lockedYearLabel ?? null);
      setLockedBudgetYearId(lockedYearEntry?.year_id ?? null);

      let currentYear = null;

      if (yearId != null) {
        const matchedFromProp = normalizedYears.find((year) => Number(year.year_id) === Number(yearId));
        if (matchedFromProp) {
          currentYear = matchedFromProp;
        }
      }

      if (!currentYear && lockedYearEntry) {
        currentYear = lockedYearEntry;
      }

      if (!currentYear && sortedYearsDesc.length > 0) {
        currentYear = sortedYearsDesc[0];
      }

      if (currentYear && !initialSubmissionId) {
        setFormData((prev) => {
          if (prev.year_id != null && prev.year_id !== '') {
            return prev;
          }
          return { ...prev, year_id: currentYear.year_id };
        });
      }

      // Load enabled years for this category and ensure locked year stays selectable
      if (categoryId) {
        const enabled = await getEnabledYears(categoryId);
        const enabledList = Array.isArray(enabled) ? [...enabled] : [];
        if (lockedYearEntry?.year_id != null) {
          const lockedKey = String(lockedYearEntry.year_id);
          if (!enabledList.includes(lockedKey)) {
            enabledList.push(lockedKey);
          }
        }
        setEnabledYears(enabledList);
      } else {
        setEnabledYears(lockedYearEntry?.year_id != null ? [String(lockedYearEntry.year_id)] : []);
      }

      // Determine prioritized years for reward rate/config lookup
      const availableRateYearsRaw = Array.isArray(availableRateYearsResponse?.years)
        ? availableRateYearsResponse.years
        : Array.isArray(availableRateYearsResponse?.data)
          ? availableRateYearsResponse.data
          : Array.isArray(availableRateYearsResponse)
            ? availableRateYearsResponse
            : [];

      const normalizedRateYears = availableRateYearsRaw
        .map((value) => {
          if (value == null) return null;
          if (typeof value === 'object') {
            const raw = value.year ?? value.Year ?? value.value ?? null;
            return raw == null ? null : String(raw);
          }
          return String(value);
        })
        .filter(Boolean);

      const prioritizedRateYears = [];
      const pushUniqueYear = (candidate) => {
        if (!candidate && candidate !== 0) return;
        const normalized = String(candidate);
        if (!prioritizedRateYears.includes(normalized)) {
          prioritizedRateYears.push(normalized);
        }
      };

      pushUniqueYear(lockedYearLabel);
      normalizedRateYears.forEach(pushUniqueYear);
      pushUniqueYear(new Date().getFullYear() + 543);

      // Fetch reward rates using prioritized years
      let resolvedRateYearLabel = null;
      let resolvedRateMap = {};

      for (const yearLabel of prioritizedRateYears) {
        try {
          const rateResponse = await publicationRewardRatesAPI.getRatesByYear(yearLabel);
          const rateList = rateResponse?.rates || rateResponse?.data || [];
          if (Array.isArray(rateList) && rateList.length > 0) {
            resolvedRateYearLabel = rateResponse?.year ?? yearLabel;
            const map = {};
            rateList.forEach((rate) => {
              const authorStatus = rate?.author_status ?? rate?.AuthorStatus ?? '';
              const quartile = rate?.journal_quartile ?? rate?.JournalQuartile ?? '';
              if (!authorStatus || !quartile) return;
              const key = `${String(authorStatus).trim()}|${String(quartile).trim()}`;
              const amount = parseNumberOrNull(rate?.reward_amount ?? rate?.RewardAmount);
              if (amount !== null) {
                map[key] = amount;
              }
            });
            if (Object.keys(map).length > 0) {
              resolvedRateMap = map;
              break;
            }
          }
        } catch (error) {
          console.warn('Failed to fetch reward rates for year', yearLabel, error);
        }
      }

      if (resolvedRateYearLabel) {
        setRewardRateYear(resolvedRateYearLabel);
        setFallbackRewardRateMap(resolvedRateMap);
      } else {
        setRewardRateYear(null);
        setFallbackRewardRateMap({});
      }

      // Fetch reward configuration for manuscript/page charge limits
      let resolvedConfigYearLabel = null;
      let resolvedConfigMap = {};
      let resolvedQuartileConfigs = {};

      for (const yearLabel of prioritizedRateYears) {
        try {
          const configResponse = await rewardConfigAPI.getConfig({ year: yearLabel });
          const configList = configResponse?.data || configResponse?.configs || configResponse?.reward_config || [];
          if (Array.isArray(configList) && configList.length > 0) {
            const limitMap = {};
            const configMeta = {};
            configList.forEach((configEntry) => {
              if (!configEntry) return;
              const quartile = configEntry.journal_quartile ?? configEntry.JournalQuartile ?? null;
              if (!quartile) return;
              const normalizedQuartile = String(quartile).trim().toUpperCase();
              const isActive = Boolean(configEntry.is_active ?? configEntry.IsActive ?? configEntry.IS_ACTIVE);
              const maxAmountValue = parseNumberOrNull(configEntry.max_amount ?? configEntry.MaxAmount);
              if (isActive && maxAmountValue !== null) {
                limitMap[normalizedQuartile] = maxAmountValue;
              } else if (!Object.prototype.hasOwnProperty.call(limitMap, normalizedQuartile)) {
                limitMap[normalizedQuartile] = null;
              }
              configMeta[normalizedQuartile] = {
                maxAmount: maxAmountValue,
                isActive,
                description: configEntry.condition_description ?? configEntry.ConditionDescription ?? '',
              };
            });

            resolvedConfigYearLabel = yearLabel;
            resolvedConfigMap = limitMap;
            resolvedQuartileConfigs = configMeta;
            break;
          }
        } catch (error) {
          console.warn('Failed to fetch reward config for year', yearLabel, error);
        }
      }

      if (resolvedConfigYearLabel) {
        setRewardConfigYear(resolvedConfigYearLabel);
        setRewardConfigMap(resolvedConfigMap);
        setQuartileConfigs(resolvedQuartileConfigs);
        setPreloadedQuartileConfigs(resolvedQuartileConfigs);
      } else {
        setRewardConfigYear(null);
        setRewardConfigMap({});
        setQuartileConfigs({});
        setPreloadedQuartileConfigs({});
      }

      // Handle users response and filter out current user
      if (usersResponse && usersResponse.users) {
        // Filter out current user from co-author list
        const filteredUsers = usersResponse.users.filter(user => {
          if (currentUserData && currentUserData.user_id) {
            return user.user_id !== currentUserData.user_id;
          }
          return true;
        });
        setUsers(filteredUsers);
      }

      // Handle document types response
      const rawDocTypes = Array.isArray(docTypesResponse?.document_types)
        ? docTypesResponse.document_types
        : Array.isArray(docTypesResponse)
          ? docTypesResponse
          : [];

      if (rawDocTypes.length > 0) {
        const sortedDocTypes = rawDocTypes
          .slice()
          .sort((a, b) => (a?.document_order || 0) - (b?.document_order || 0));

        const relevantDocs = sortedDocTypes.filter((docType) => {
          if (!docType) return false;
          const mode = resolveFundTypeMode(docType);
          if (mode === 'inactive') {
            return false;
          }
          if (mode === 'all') {
            return true;
          }
          const fundTypes = Array.isArray(docType.fund_types) ? docType.fund_types : [];
          return fundTypes.includes('publication_reward');
        });

        if (relevantDocs.length === 0) {
          console.warn('No document types explicitly configured for publication_reward; falling back to legacy list.');
        }

        setDocumentTypes([]);
        setAvailableDocumentTypes(relevantDocs.length > 0 ? relevantDocs : sortedDocTypes);
      } else {
        setAvailableDocumentTypes([]);
        setDocumentTypes([]);
      }

      // Load enabled author status & quartile pairs
      if (categoryId && currentYear) {
        const { pairs, rateMap, budgetMap } = await getEnabledAuthorStatusQuartiles({
          category_id: categoryId,
          year_id: currentYear.year_id,
          fallbackRateMap: resolvedRateMap,
        });
        setEnabledPairs(pairs);
        const combinedRateMap = { ...resolvedRateMap, ...rateMap };
        setRewardRateMap(combinedRateMap);
        setBudgetOptionMap(budgetMap);
        let uniqueStatuses = [...new Set(pairs.map(p => p.author_status))];
        if (uniqueStatuses.length === 0 && Object.keys(combinedRateMap).length > 0) {
          uniqueStatuses = [...new Set(Object.keys(combinedRateMap).map((key) => key.split('|')[0]))];
        }
        setAvailableAuthorStatuses(uniqueStatuses);
        setAvailableQuartiles([]);
      } else {
        setRewardRateMap(resolvedRateMap);
      }

    } catch (error) {
      console.error('Error loading initial data:', error);
      alert('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + error.message);
    } finally {
      setLoading(false);
      setInitialDataReady(true);
    }
  };

  // =================================================================
  // EVENT HANDLERS
  // =================================================================

  const navigationTarget = useMemo(() => {
    if (originPage) {
      return originPage;
    }
    if (initialSubmissionId) {
      return 'applications';
    }
    return 'promotion-fund';
  }, [originPage, initialSubmissionId]);

  const handleGoBack = () => {
    if (onNavigate) {
      onNavigate(navigationTarget);
      return;
    }

    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/member');
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    // สำหรับ checkbox ใช้ค่า checked
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    }

    // ปีงบประมาณต้องเก็บเป็นตัวเลขเพื่อให้เทียบกับรายการได้ถูกต้อง
    else if (name === 'year_id') {
      const numericValue = value === '' ? null : Number(value);
      const resolvedValue =
        numericValue === null || Number.isNaN(numericValue) ? (value === '' ? '' : value) : numericValue;

      setFormData(prev => ({
        ...prev,
        year_id: resolvedValue,
      }));

      setResolutionError('');
      setPolicyContext(null);
    }

    // สำหรับ phone_number ให้ format ตัวเลข
    else if (name === 'phone_number') {
      const formattedPhone = formatPhoneNumber(value);
      setFormData(prev => ({
        ...prev,
        phone_number: formattedPhone
      }));
    }

    // สำหรับ input อื่นๆ รวมถึง author_status และ journal_quartile
    else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
      if (['author_status', 'journal_quartile'].includes(name)) {
        setResolutionError('');
        setPolicyContext(null);
      }
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
    const normalized = buildCoauthorFromSubmissionUser(user);
    if (!normalized) {
      return;
    }

    const targetId = getNormalizedUserId(normalized);
    if (!coauthors.some((c) => getNormalizedUserId(c) === targetId)) {
      setCoauthors(prev => [...prev, normalized]);
    }
  };

  // Handle co-author removal
  const handleRemoveCoauthor = async (index) => {
    const target = coauthors[index];
    const fallbackName = `${target?.user_fname || ''} ${target?.user_lname || ''}`.trim();
    const { name: resolvedDisplayName } = getCoauthorDisplayInfo(target);
    const displayName = (resolvedDisplayName || fallbackName || 'ผู้แต่งร่วม').trim();

    const result = await Swal.fire({
      title: 'ยืนยันการลบผู้แต่งร่วม?',
      text: `ต้องการลบ ${displayName} ออกจากรายชื่อผู้แต่งร่วมหรือไม่?`,
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

  const normalizeSubmissionDocument = (doc) => {
    if (!doc) {
      return null;
    }

    const rawDocumentId =
      doc.document_id ??
      doc.DocumentID ??
      doc.id ??
      doc.Document?.document_id ??
      doc.DocumentID ??
      null;

    if (rawDocumentId == null) {
      return null;
    }

    const resolvedDocumentId = String(rawDocumentId);

    const rawDocumentTypeId =
      doc.document_type_id ??
      doc.DocumentTypeID ??
      doc.document_type?.document_type_id ??
      doc.document_type?.DocumentTypeID ??
      doc.document_type?.id ??
      doc.document_type?.Id ??
      null;

    const documentTypeId = rawDocumentTypeId != null ? parseIntegerOrNull(rawDocumentTypeId) : null;

    const fileInfo = doc.file || doc.File || {};
    const externalFundingIdRaw =
      doc.external_funding_id ??
      doc.ExternalFundingID ??
      doc.external_fund_id ??
      doc.ExternalFundID ??
      fileInfo.external_funding_id ??
      fileInfo.ExternalFundingID ??
      null;

    const externalFundingId = externalFundingIdRaw != null ? parseIntegerOrNull(externalFundingIdRaw) : null;

    const documentTypeName = findFirstString([
      doc.document_type_name,
      doc.DocumentTypeName,
      doc.document_type?.name,
      doc.document_type?.Name,
      documentTypeId != null ? getDocumentTypeName(documentTypeId) : null,
    ]);

    const originalName = findFirstString([
      doc.original_name,
      doc.original_filename,
      doc.file_name,
      doc.filename,
      fileInfo.original_name,
      fileInfo.file_name,
      fileInfo.filename,
    ]);

    const fileIdRaw =
      doc.file_id ??
      doc.FileID ??
      fileInfo.file_id ??
      fileInfo.FileID ??
      null;

    const fileId = fileIdRaw != null ? String(fileIdRaw) : null;

    const fileSize =
      fileInfo.file_size ??
      fileInfo.size ??
      doc.file_size ??
      doc.FileSize ??
      null;

    const resolvedDocumentTypeName =
      documentTypeName ||
      (documentTypeId != null ? getDocumentTypeName(documentTypeId) : null) ||
      (documentTypeId === 12 ? 'เอกสารเบิกจ่ายภายนอก' : null);

    return {
      document_id: resolvedDocumentId,
      document_type_id: documentTypeId,
      document_type_name: resolvedDocumentTypeName,
      original_name: originalName || null,
      file_id: fileId,
      file_size: fileSize ?? null,
      external_funding_id: externalFundingId,
      funding_client_id: null,
      pendingRemoval: false,
      pendingRemovalReason: null,
    };
  };

  const refreshSubmissionDocuments = useCallback(
    async (submissionId) => {
      if (!submissionId) {
        setServerDocuments([]);
        setServerExternalFundingFiles([]);
        setDetachedDocumentIds([]);
        setDocumentReplacements({});
        return;
      }

      try {
        const response = await documentAPI.getSubmissionDocuments(submissionId);
        const documentsPayload = Array.isArray(response?.documents)
          ? response.documents
          : Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response)
              ? response
              : [];

        const normalized = documentsPayload
          .map(normalizeSubmissionDocument)
          .filter((entry) => entry && entry.document_id != null);

        const externalLookup = new Map();
        (externalFundingsRef.current || []).forEach((funding) => {
          if (!funding) return;
          if (funding.externalFundId != null) {
            externalLookup.set(String(funding.externalFundId), funding);
          }
          if (funding.clientId) {
            externalLookup.set(`client:${funding.clientId}`, funding);
          }
          if (funding.serverDocumentId) {
            externalLookup.set(`doc:${funding.serverDocumentId}`, funding);
          }
        });

        const nextGeneralDocs = [];
        const nextExternalDocs = [];

        normalized.forEach((doc) => {
          const isExternalDocument = doc.document_type_id === 12 || doc.external_funding_id != null;
          if (isExternalDocument) {
            let matchedFunding = null;
            if (doc.external_funding_id != null) {
              matchedFunding = externalLookup.get(String(doc.external_funding_id)) || null;
            }
            if (!matchedFunding && doc.document_id) {
              matchedFunding = externalLookup.get(`doc:${doc.document_id}`) || null;
            }
            if (!matchedFunding && doc.external_funding_id == null && doc.document_id) {
              // Fallback to client id mapping if available
              externalLookup.forEach((value, key) => {
                if (!matchedFunding && key.startsWith('client:') && value?.serverDocumentId === doc.document_id) {
                  matchedFunding = value;
                }
              });
            }

            nextExternalDocs.push({
              ...doc,
              funding_client_id: matchedFunding?.clientId ?? null,
            });
          } else {
            nextGeneralDocs.push(doc);
          }
        });

        setServerDocuments(nextGeneralDocs);
        setServerExternalFundingFiles(nextExternalDocs);
        setDetachedDocumentIds([]);
        setDocumentReplacements({});

        if (nextExternalDocs.length > 0 || externalFundingsRef.current.length > 0) {
          setExternalFundings((prev) =>
            prev.map((funding) => {
              const matchedDoc = nextExternalDocs.find((doc) => {
                if (!doc) return false;
                if (funding.externalFundId != null && doc.external_funding_id != null) {
                  return String(funding.externalFundId) === String(doc.external_funding_id);
                }
                if (funding.serverDocumentId) {
                  return String(funding.serverDocumentId) === String(doc.document_id);
                }
                if (doc.funding_client_id && funding.clientId) {
                  return String(doc.funding_client_id) === String(funding.clientId);
                }
                return false;
              });

              if (!matchedDoc) {
                return {
                  ...funding,
                  serverDocumentPendingRemovalReason: null,
                  // Preserve existing metadata when not found
                  serverDocumentId: funding.serverDocumentId && nextExternalDocs.some((doc) => String(doc.document_id) === String(funding.serverDocumentId))
                    ? funding.serverDocumentId
                    : null,
                  serverFileName: funding.serverDocumentId && nextExternalDocs.some((doc) => String(doc.document_id) === String(funding.serverDocumentId))
                    ? funding.serverFileName ?? null
                    : null,
                  serverFileId: funding.serverDocumentId && nextExternalDocs.some((doc) => String(doc.document_id) === String(funding.serverDocumentId))
                    ? funding.serverFileId ?? null
                    : null,
                };
              }

              return {
                ...funding,
                serverDocumentId: matchedDoc.document_id,
                serverFileName: matchedDoc.original_name || matchedDoc.document_type_name || funding.serverFileName || null,
                serverFileId: matchedDoc.file_id ?? null,
                serverDocumentPendingRemovalReason: null,
                file: null,
              };
            })
          );
        }
      } catch (error) {
        console.error('Failed to load submission documents:', error);
      }
    },
    [setServerDocuments, setServerExternalFundingFiles, setDetachedDocumentIds, setDocumentReplacements, setExternalFundings]
  );

  const unmarkDocumentRemoval = useCallback(
    (docId, options = {}) => {
      if (docId == null) {
        return;
      }

      const idStr = String(docId);

      const currentDoc =
        serverDocumentsRef.current.find((doc) => String(doc.document_id) === idStr) ||
        serverExternalFundingFilesRef.current.find((doc) => String(doc.document_id) === idStr);

      if (options.expectedReason && currentDoc?.pendingRemovalReason && currentDoc.pendingRemovalReason !== options.expectedReason) {
        return;
      }

      setDetachedDocumentIds((prev) => prev.filter((id) => id !== idStr));

      const updater = (doc) => {
        if (!doc || String(doc.document_id) !== idStr) {
          return doc;
        }
        return {
          ...doc,
          pendingRemoval: false,
          pendingRemovalReason: null,
        };
      };

      setServerDocuments((prev) => prev.map(updater));
      setServerExternalFundingFiles((prev) => prev.map(updater));

      if (options.fundingClientId) {
        setExternalFundings((prev) =>
          prev.map((funding) =>
            funding.clientId === options.fundingClientId
              ? { ...funding, serverDocumentPendingRemovalReason: null }
              : funding
          )
        );
      }

      setDocumentReplacements((prev) => {
        const entries = Object.entries(prev || {});
        if (entries.length === 0) {
          return prev;
        }
        let changed = false;
        const next = { ...prev };
        entries.forEach(([key, value]) => {
          if (String(value) === idStr) {
            delete next[key];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    },
    [setDetachedDocumentIds, setServerDocuments, setServerExternalFundingFiles, setExternalFundings, setDocumentReplacements]
  );

  const handleDownloadDocument = useCallback(async (doc) => {
    if (!doc?.file_id) {
      Toast.fire({
        icon: 'error',
        title: 'ไม่พบไฟล์สำหรับดาวน์โหลด',
      });
      return;
    }

    try {
      const blob = await fileAPI.downloadFile(doc.file_id);
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = doc.original_name || doc.document_type_name || `document-${doc.document_id}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Failed to download document:', error);
      Toast.fire({
        icon: 'error',
        title: 'ดาวน์โหลดไฟล์ไม่สำเร็จ',
        text: error?.message || 'ไม่สามารถดาวน์โหลดไฟล์ได้',
      });
    }
  }, []);

  const applyExternalFundingServerIds = useCallback(
    (savedExternalFunds, { targetFiles } = {}) => {
      const normalizedFunds = Array.isArray(savedExternalFunds) ? savedExternalFunds : [];
      const filesArray = Array.isArray(targetFiles) ? targetFiles : [];
      const serverIdMap = new Map();

      normalizedFunds.forEach((item) => {
        if (!item) {
          return;
        }

        const serverId =
          item.external_fund_id ??
          item.ExternalFundID ??
          item.externalFundId ??
          item.external_fundID ??
          null;

        if (serverId == null) {
          return;
        }

        const clientKey =
          item.client_id ??
          item.clientId ??
          item.external_fund_client_id ??
          item.externalFundingClientId ??
          item.externalFundingClientID ??
          serverId;

        serverIdMap.set(String(clientKey), serverId);
      });

      if (serverIdMap.size > 0) {
        setExternalFundings((prev) => {
          let changed = false;
          const next = prev.map((funding) => {
            if (!funding) {
              return funding;
            }

            const candidateKeys = [
              funding.clientId,
              funding.externalFundId,
              funding.external_fund_id,
              funding.externalFundingId,
            ].filter((value) => value != null);

            let resolvedId = null;
            for (const key of candidateKeys) {
              const mapped = serverIdMap.get(String(key));
              if (mapped != null) {
                resolvedId = mapped;
                break;
              }
            }

            if (resolvedId && resolvedId !== funding.externalFundId) {
              changed = true;
              return { ...funding, externalFundId: resolvedId };
            }

            return funding;
          });

          return changed ? next : prev;
        });

        setExternalFundingFiles((prev) => {
          let changed = false;
          const next = prev.map((doc) => {
            if (!doc) {
              return doc;
            }

            const candidateKeys = [
              doc.funding_client_id,
              doc.external_fund_id,
              doc.externalFundingId,
              doc.external_funding_id,
            ].filter((value) => value != null);

            for (const key of candidateKeys) {
              const mapped = serverIdMap.get(String(key));
              if (mapped != null && mapped !== doc.external_fund_id) {
                changed = true;
                return { ...doc, external_fund_id: mapped };
              }
            }

            return doc;
          });

          return changed ? next : prev;
        });

        filesArray.forEach((fileData) => {
          if (!fileData || fileData.document_type_id !== 12) {
            return;
          }

          const candidateKeys = [
            fileData.external_funding_client_id,
            fileData.funding_client_id,
            fileData.external_funding_id,
            fileData.external_fund_id,
          ].filter((value) => value != null);

          for (const key of candidateKeys) {
            const mapped = serverIdMap.get(String(key));
            if (mapped != null) {
              fileData.external_funding_id = mapped;
              break;
            }
          }
        });
      } else {
        setExternalFundings((prev) => {
          const shouldReset = prev.some((funding) => funding?.externalFundId);
          if (!shouldReset) {
            return prev;
          }

          return prev.map((funding) =>
            funding?.externalFundId ? { ...funding, externalFundId: null } : funding
          );
        });

        setExternalFundingFiles((prev) => {
          const shouldReset = prev.some((doc) => doc?.external_fund_id);
          if (!shouldReset) {
            return prev;
          }

          return prev.map((doc) =>
            doc?.external_fund_id ? { ...doc, external_fund_id: null } : doc
          );
        });

        filesArray.forEach((fileData) => {
          if (fileData && fileData.document_type_id === 12) {
            fileData.external_funding_id = null;
          }
        });
      }

      return serverIdMap;
    },
    [setExternalFundings, setExternalFundingFiles]
  );

  const syncSubmissionDocuments = useCallback(
    async ({ submissionId, onProgress, filesOverride } = {}) => {
      if (!submissionId) {
        return { detached: 0, uploaded: 0 };
      }

      const filesToUpload = Array.isArray(filesOverride)
        ? filesOverride
        : getAllAttachedFiles();
      const detachIds = [...detachedDocumentIds];
      const pendingExternalUploads = new Map();

      const uploadableFiles = [];
      filesToUpload.forEach((doc) => {
        if (!doc?.file) {
          return;
        }

        uploadableFiles.push(doc);

        if (doc.document_type_id !== 12) {
          return;
        }

        const key =
          doc.external_funding_client_id ??
          doc.funding_client_id ??
          doc.external_fund_id ??
          doc.external_funding_id ??
          null;

        if (key == null) {
          return;
        }

        pendingExternalUploads.set(String(key), doc.file);
      });

      if (!Array.isArray(filesOverride)) {
        (externalFundingFiles || []).forEach((doc) => {
          if (!doc?.funding_client_id || !doc?.file) {
            return;
          }
          pendingExternalUploads.set(String(doc.funding_client_id), doc.file);
        });
      }

      const errors = [];
      let detachedCount = 0;
      if (detachIds.length > 0) {
        for (let index = 0; index < detachIds.length; index += 1) {
          const docId = detachIds[index];
          try {
            await documentAPI.detachDocument(submissionId, docId);
            detachedCount += 1;
            if (onProgress) {
              onProgress({ type: 'detach', completed: detachedCount, totalDetach: detachIds.length });
            }
          } catch (error) {
            const statusCode = error?.response?.status ?? error?.status ?? error?.code ?? null;
            if (statusCode === 404 || statusCode === 410) {
              console.warn('Ignoring missing document during detach:', docId, error);
              detachedCount += 1;
              continue;
            }

            console.error('Failed to detach document:', docId, error);
            const message = `ไม่สามารถลบไฟล์เดิม (ID ${docId}) ได้: ${error?.message || 'ไม่ทราบสาเหตุ'}`;
            errors.push(message);
          }
        }
      }

      let uploadedCount = 0;
      if (uploadableFiles.length > 0) {
        for (let index = 0; index < uploadableFiles.length; index += 1) {
          const fileData = uploadableFiles[index];

          try {
            const uploadResponse = await fileAPI.uploadFile(fileData.file);
            if (!uploadResponse?.file?.file_id) {
              throw new Error('Upload response missing file_id');
            }

            const attachPayload = {
              file_id: uploadResponse.file.file_id,
              document_type_id: fileData.document_type_id,
              description: fileData.description || fileData.document_type_name || fileData.name,
              display_order: index + 1,
            };

            if (fileData.document_type_id === 12 && fileData.external_funding_id) {
              attachPayload.external_funding_id = fileData.external_funding_id;
            }

            await documentAPI.attachDocument(submissionId, attachPayload);
            uploadedCount += 1;
            if (onProgress) {
              onProgress({ type: 'upload', completed: uploadedCount, totalUpload: uploadableFiles.length });
            }
          } catch (error) {
            console.error('Failed to upload or attach document:', fileData, error);
            const friendlyName = fileData?.file?.name || fileData?.document_type_name || 'ไฟล์ไม่ทราบชื่อ';
            const message = `อัปโหลดไฟล์ "${friendlyName}" ไม่สำเร็จ: ${error?.message || 'ไม่ทราบสาเหตุ'}`;
            errors.push(message);
          }
        }
      }

      const hadChanges = detachedCount > 0 || uploadedCount > 0;
      const hadErrors = errors.length > 0;

      if (hadChanges) {
        await refreshSubmissionDocuments(submissionId);
      }

      if (hadErrors) {
        if (pendingExternalUploads.size > 0) {
          setExternalFundings((prev) =>
            prev.map((funding) => {
              if (!funding?.clientId) {
                return funding;
              }
              const pendingFile = pendingExternalUploads.get(funding.clientId);
              if (!pendingFile) {
                return funding;
              }
              return {
                ...funding,
                file: pendingFile,
              };
            })
          );
        }

        const summary = errors.slice(0, 3).join('\n');
        const aggregatedError = new Error(
          errors.length > 1 ? `เกิดข้อผิดพลาดหลายรายการ:\n${summary}` : summary
        );
        aggregatedError.details = errors;
        throw aggregatedError;
      }

      if (hadChanges) {
        setUploadedFiles({});
        setOtherDocuments([]);
        setExternalFundingFiles([]);
        setDocumentReplacements({});
        setDetachedDocumentIds([]);
        setExternalFundings((prev) =>
          prev.map((funding) => ({
            ...funding,
            file: null,
            serverDocumentPendingRemovalReason:
              funding.serverDocumentPendingRemovalReason === 'replace' ||
              funding.serverDocumentPendingRemovalReason === 'remove'
                ? null
                : funding.serverDocumentPendingRemovalReason,
          }))
        );
      }

      return { detached: detachedCount, uploaded: uploadedCount };
    },
    [
      detachedDocumentIds,
      externalFundingFiles,
      getAllAttachedFiles,
      refreshSubmissionDocuments,
      setUploadedFiles,
      setOtherDocuments,
      setExternalFundingFiles,
      setDocumentReplacements,
      setDetachedDocumentIds,
      setExternalFundings,
    ]
  );

  // Handle external funding addition
  const handleAddExternalFunding = () => {
    const clientId = `ext-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const newFunding = {
      clientId,
      externalFundId: null,
      fundName: '',
      amount: '',
      file: null,
      serverDocumentId: null,
      serverFileName: null,
      serverFileId: null,
      serverDocumentPendingRemovalReason: null,
    };
    setExternalFundings(prev => [...prev, newFunding]);
  };

  // Handle external funding removal
  const handleRemoveExternalFunding = (clientId) => {
    const targetFunding = externalFundings.find((funding) => funding.clientId === clientId);

    if (targetFunding?.serverDocumentId) {
      markDocumentForRemoval(targetFunding.serverDocumentId, 'remove', { fundingClientId: clientId });
    }

    setExternalFundingFiles(prev => prev.filter(doc => doc.funding_client_id !== clientId));
    setExternalFundings(prev => prev.filter(f => f.clientId !== clientId));
  };

  // Handle external funding field changes
  const handleExternalFundingChange = (clientId, field, value) => {
    let nextValue = value;
    if (field === 'amount') {
      nextValue = clampCurrencyValue(value);
    }

    setExternalFundings(prev =>
      prev.map(funding =>
        funding.clientId === clientId ? { ...funding, [field]: nextValue } : funding
      )
    );
  };

  // Handle file uploads
  const getFileSignature = useCallback((entry) => {
    if (!entry) {
      return null;
    }

    const fileObject = entry instanceof File ? entry : entry.file instanceof File ? entry.file : null;
    if (!fileObject) {
      return null;
    }

    const { name = '', size = 0, lastModified = 0, type = '' } = fileObject;
    return [name, size, lastModified || '', type].join('::');
  }, []);

  const handleFileUpload = (documentTypeId, files) => {
    const key = documentTypeId;

    if (!files || files.length === 0) {
      if (documentTypeId === 'other') {
        return;
      }

      setUploadedFiles((prev) => {
        if (!prev || !Object.prototype.hasOwnProperty.call(prev, key)) {
          return prev;
        }
        const next = { ...prev };
        delete next[key];
        return next;
      });

      if (documentReplacements?.[key]) {
        unmarkDocumentRemoval(documentReplacements[key], { expectedReason: 'replace' });
      }

      setDocumentReplacements((prev) => {
        if (!prev || !prev[key]) {
          return prev;
        }
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }

    if (documentTypeId === 'other') {
      const incoming = Array.from(files || []).filter(Boolean);
      if (incoming.length === 0) {
        return;
      }

      setOtherDocuments((prev) => {
        const previous = Array.isArray(prev) ? [...prev] : [];
        const seen = new Set(previous.map((item) => getFileSignature(item)).filter(Boolean));
        let changed = false;

        incoming.forEach((item) => {
          const signature = getFileSignature(item);
          if (!signature || seen.has(signature)) {
            return;
          }
          seen.add(signature);
          previous.push(item);
          changed = true;
        });

        return changed ? previous : prev;
      });
      return;
    }

    const [file] = files;

    setUploadedFiles((prev) => ({
      ...prev,
      [key]: file,
    }));

    const numericDocTypeId = parseIntegerOrNull(documentTypeId);
    if (numericDocTypeId != null) {
      const existingServerDoc = serverDocuments.find(
        (doc) => doc.document_type_id === numericDocTypeId && !doc.pendingRemoval
      );

      if (existingServerDoc) {
        markDocumentForRemoval(existingServerDoc.document_id, 'replace');
        setDocumentReplacements((prev) => ({
          ...(prev || {}),
          [key]: existingServerDoc.document_id,
        }));
      }
    }

    if (errors[`file_${documentTypeId}`]) {
      setErrors((prev) => ({ ...prev, [`file_${documentTypeId}`]: '' }));
    }
  };

  // Handle external funding file changes
  const handleExternalFundingFileChange = (clientId, file) => {
    const targetFunding = externalFundings.find((funding) => funding.clientId === clientId);
    if (!targetFunding) {
      console.warn('No external funding entry found for clientId:', clientId);
      return;
    }

    if (!file) {
      setExternalFundingFiles((prev) => prev.filter((doc) => doc.funding_client_id !== clientId));

      if (targetFunding.serverDocumentId && targetFunding.serverDocumentPendingRemovalReason === 'replace') {
        unmarkDocumentRemoval(targetFunding.serverDocumentId, {
          fundingClientId: clientId,
          expectedReason: 'replace',
        });
      }

      setExternalFundings((prev) =>
        prev.map((funding) => {
          if (funding.clientId !== clientId) {
            return funding;
          }
          const next = { ...funding, file: null };
          if (funding.serverDocumentPendingRemovalReason === 'replace') {
            next.serverDocumentPendingRemovalReason = null;
          }
          return next;
        })
      );
      return;
    }

    if (file.type !== 'application/pdf') {
      console.error('Invalid file type for external funding:', file?.type);
      Toast.fire({ icon: 'error', title: 'กรุณาเลือกไฟล์ PDF เท่านั้น' });
      return;
    }

    if (targetFunding.serverDocumentId) {
      markDocumentForRemoval(targetFunding.serverDocumentId, 'replace', { fundingClientId: clientId });
    }

    setExternalFundings((prev) =>
      prev.map((funding) =>
        funding.clientId === clientId
          ? {
              ...funding,
              file,
              serverDocumentPendingRemovalReason: targetFunding.serverDocumentId ? 'replace' : funding.serverDocumentPendingRemovalReason,
            }
          : funding
      )
    );

    setExternalFundingFiles((prev) => {
      const filtered = prev.filter((doc) => doc.funding_client_id !== clientId);
      return [
        ...filtered,
        {
          file,
          funding_client_id: clientId,
          external_fund_id: targetFunding.externalFundId ?? null,
          replaces_document_id: targetFunding.serverDocumentId ?? null,
          description: `เอกสารเบิกจ่ายภายนอก - ${file.name}`,
          timestamp: Date.now(),
        },
      ];
    });

    const errorKey = 'file_12';
    if (errors[errorKey]) {
      setErrors((prev) => ({ ...prev, [errorKey]: '' }));
    }
  };

  const handleClearExternalFundingUpload = (clientId) => {
    handleExternalFundingFileChange(clientId, null);
  };

  const handleRemoveExternalFundingFile = (clientId) => {
    const targetFunding = externalFundings.find((funding) => funding.clientId === clientId);
    if (!targetFunding) {
      return;
    }

    if (targetFunding.serverDocumentId) {
      markDocumentForRemoval(targetFunding.serverDocumentId, 'remove', { fundingClientId: clientId });
    }

    setExternalFundingFiles((prev) => prev.filter((doc) => doc.funding_client_id !== clientId));
    setExternalFundings((prev) =>
      prev.map((funding) =>
        funding.clientId === clientId
          ? {
              ...funding,
              file: null,
              serverDocumentPendingRemovalReason: targetFunding.serverDocumentId ? 'remove' : funding.serverDocumentPendingRemovalReason,
            }
          : funding
      )
    );
  };

  const handleRestoreExternalFundingFile = (clientId) => {
    const targetFunding = externalFundings.find((funding) => funding.clientId === clientId);
    if (!targetFunding?.serverDocumentId) {
      return;
    }

    unmarkDocumentRemoval(targetFunding.serverDocumentId, {
      fundingClientId: clientId,
      expectedReason: 'remove',
    });
  };

  // ฟังก์ชันรวมไฟล์ทั้งหมดเพื่อแสดงผล
  function getAllAttachedFiles() {
    const allFiles = [];
    const processedMain = new Set();

    const resolveDocumentTypeName = (docTypeId) => {
      if (!docTypeId && docTypeId !== 0) return '';
      const doc = Array.isArray(documentTypes)
        ? documentTypes.find((dt) => String(dt.id) === String(docTypeId))
        : null;
      if (doc?.name) {
        return doc.name;
      }
      const numericId = Number(docTypeId);
      return Number.isNaN(numericId) ? '' : getDocumentTypeName(numericId);
    };

    const pushServerDocument = (doc) => {
      if (!doc || doc.pendingRemoval) {
        return;
      }

      const docTypeId = doc.document_type_id != null ? Number(doc.document_type_id) : null;
      const typeName = doc.document_type_name || resolveDocumentTypeName(docTypeId) || 'เอกสาร';
      const sizeValue = doc.file_size != null ? Number(doc.file_size) : 0;

      allFiles.push({
        id: `server-${doc.document_id}`,
        name: doc.original_name || typeName || 'ไฟล์จากระบบ',
        type: typeName,
        size: Number.isFinite(sizeValue) ? sizeValue : 0,
        file: null,
        file_id: doc.file_id ?? null,
        source: 'server',
        canDelete: false,
        document_type_id: docTypeId,
        document_type_name: typeName,
        document_id: doc.document_id,
      });
    };

    const pushServerExternalDocument = (doc) => {
      if (!doc || doc.pendingRemoval) {
        return;
      }

      const typeName = resolveDocumentTypeName(12) || doc.document_type_name || 'เอกสารเบิกจ่ายภายนอก';
      const matchFunding = externalFundings.find((funding) => {
        if (!funding) return false;
        const matchesClient =
          doc.funding_client_id != null &&
          funding.clientId &&
          String(doc.funding_client_id) === String(funding.clientId);
        const matchesExternal =
          doc.external_funding_id != null &&
          funding.externalFundId != null &&
          String(doc.external_funding_id) === String(funding.externalFundId);
        const matchesDocument =
          doc.document_id != null &&
          funding.serverDocumentId != null &&
          String(doc.document_id) === String(funding.serverDocumentId);
        return matchesClient || matchesExternal || matchesDocument;
      });

      const fundLabel = matchFunding?.fundName ? String(matchFunding.fundName).trim() : '';
      const sizeValue = doc.file_size != null ? Number(doc.file_size) : 0;

      allFiles.push({
        id: `server-external-${doc.document_id}`,
        name: doc.original_name || doc.document_type_name || fundLabel || 'ไฟล์จากระบบ',
        type: `${typeName}${fundLabel ? ` - ${fundLabel}` : ''}`,
        size: Number.isFinite(sizeValue) ? sizeValue : 0,
        file: null,
        file_id: doc.file_id ?? null,
        source: 'server',
        canDelete: false,
        document_type_id: 12,
        document_type_name: typeName,
        document_id: doc.document_id,
        external_funding_id: doc.external_funding_id ?? null,
        external_funding_client_id: doc.funding_client_id ?? matchFunding?.clientId ?? null,
      });
    };

    if (Array.isArray(documentTypes) && documentTypes.length > 0) {
      documentTypes.forEach((docType) => {
        if (!docType) return;
        if (docType.name === 'เอกสารอื่นๆ' || Number(docType.id) === 12) {
          return;
        }
        const file = uploadedFiles?.[docType.id] || uploadedFiles?.[String(docType.id)];
        if (file) {
          allFiles.push({
            id: `uploaded-${docType.id}`,
            name: file.name,
            type: docType.name || getDocumentTypeName(docType.id),
            size: file.size,
            file,
            source: 'uploaded',
            canDelete: true,
            document_type_id: Number(docType.id),
            document_type_name: docType.name || getDocumentTypeName(docType.id),
          });
          processedMain.add(String(docType.id));
        }
      });
    }

    Object.entries(uploadedFiles || {}).forEach(([key, file]) => {
      if (!file) return;
      if (processedMain.has(String(key))) return;

      const docName = resolveDocumentTypeName(key) || 'เอกสาร';
      const docId = Number(key);

      allFiles.push({
        id: `uploaded-${key}`,
        name: file.name,
        type: docName,
        size: file.size,
        file,
        source: 'uploaded',
        canDelete: true,
        document_type_id: Number.isNaN(docId) ? null : docId,
        document_type_name: docName,
      });
    });

    (otherDocuments || []).forEach((file, index) => {
      if (!file) return;
      const typeName = resolveDocumentTypeName('other') || 'เอกสารอื่นๆ';
      allFiles.push({
        id: `other-${index}`,
        name: file.name || 'ไม่ระบุชื่อ',
        type: typeName,
        size: file.size || 0,
        file,
        source: 'other',
        canDelete: true,
        index,
        document_type_id: null,
        document_type_name: typeName,
      });
    });

    (serverDocuments || []).forEach((doc) => {
      pushServerDocument(doc);
    });

    (serverExternalFundingFiles || []).forEach((doc) => {
      pushServerExternalDocument(doc);
    });

    (externalFundingFiles || []).forEach((doc) => {
      if (!doc?.file) return;
      const funding = externalFundings.find(f => f.clientId === doc.funding_client_id);
      const typeName = resolveDocumentTypeName(12) || 'เอกสารเบิกจ่ายภายนอก';
      const resolvedExternalId = doc.external_fund_id ?? funding?.externalFundId ?? null;
      allFiles.push({
        id: `external-${doc.funding_client_id}`,
        name: doc.file.name,
        type: `${typeName}${funding?.fundName ? ` - ${funding.fundName}` : ''}`,
        size: doc.file.size,
        file: doc.file,
        source: 'external',
        canDelete: false,
        document_type_id: 12,
        document_type_name: typeName,
        external_funding_client_id: doc.funding_client_id,
        external_funding_id: resolvedExternalId,
      });
    });

    return allFiles;
  }

  const attachedFiles = useMemo(
    () => getAllAttachedFiles(),
    [
      attachmentSignature,
      documentTypes,
      externalFundings,
      serverDocuments,
      serverExternalFundingFiles,
    ]
  );
  const previewUrl = previewState.blobUrl || previewState.signedUrl;

  const downloadServerFileAsFile = useCallback(async ({ fileId, name }) => {
    if (!fileId) {
      throw new Error('ไม่พบไฟล์บนเซิร์ฟเวอร์สำหรับเอกสารนี้');
    }

    const headers = {};
    const token = apiClient.getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${apiClient.baseURL}/files/managed/${fileId}/download`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error('ไม่สามารถดาวน์โหลดไฟล์จากเซิร์ฟเวอร์ได้');
    }

    const blob = await response.blob();
    if (!blob || blob.size === 0) {
      throw new Error('ไม่พบข้อมูลไฟล์บนเซิร์ฟเวอร์');
    }

    const fileName = name || `document-${fileId}.pdf`;
    const file = new File([blob], fileName, { type: blob.type || 'application/pdf' });

    serverFileCacheRef.current.set(String(fileId), file);
    return file;
  }, []);

  const buildPublicationDate = () => {
    if (formData.publication_date) {
      return formData.publication_date;
    }

    const rawYear = (formData.journal_year || '').toString().trim();
    if (!rawYear) {
      return '';
    }

    const rawMonth = (formData.journal_month || '').toString().trim();
    let monthNumber = parseInt(rawMonth, 10);
    if (Number.isNaN(monthNumber) || monthNumber < 1 || monthNumber > 12) {
      monthNumber = 1;
    }

    const monthString = monthNumber.toString().padStart(2, '0');
    return `${rawYear}-${monthString}-01`;
  };

  const generatePreview = async ({ openWindow = false } = {}) => {
    const attachments = attachedFiles;

    if (!attachments || attachments.length === 0) {
      const message = 'กรุณาแนบไฟล์อย่างน้อย 1 ไฟล์ก่อนดูตัวอย่าง';
      setPreviewState((prev) => ({
        ...prev,
        error: message,
        hasPreviewed: false,
        loading: false,
      }));
      setPreviewAcknowledged(false);
      Toast.fire({ icon: 'warning', title: message });
      throw new Error(message);
    }

    setPreviewState((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));

    const resolvedAttachments = [];

    try {
      for (const item of attachments) {
        let file = item.file;

        if (!file && item.file_id) {
          const cacheKey = String(item.file_id);
          file = serverFileCacheRef.current.get(cacheKey);
          if (!file) {
            file = await downloadServerFileAsFile({ fileId: item.file_id, name: item.name });
          }
        }

        if (!file) {
          throw new Error('ไม่พบข้อมูลไฟล์แนบสำหรับเอกสารที่เลือก');
        }

        resolvedAttachments.push({ ...item, file });
      }
    } catch (error) {
      const message = error?.message || 'ไม่สามารถเตรียมไฟล์จากเซิร์ฟเวอร์ได้';
      setPreviewState((prev) => ({
        ...prev,
        loading: false,
        error: message,
        hasPreviewed: false,
      }));
      setPreviewAcknowledged(false);
      Toast.fire({ icon: 'error', title: 'ไม่สามารถสร้างตัวอย่างได้', text: message });
      throw error;
    }

    const stringify = (value, { allowBoolean = false } = {}) => {
      if (value === null || value === undefined) {
        return '';
      }

      if (typeof value === 'number') {
        if (!Number.isFinite(value)) {
          return '';
        }
        return String(value);
      }

      if (typeof value === 'boolean') {
        return allowBoolean ? (value ? 'true' : 'false') : '';
      }

      const str = String(value);
      return str === 'null' || str === 'undefined' ? '' : str;
    };

    const normalizedFormData = {
      author_status: stringify(formData.author_status),
      article_title: stringify(formData.article_title),
      journal_name: stringify(formData.journal_name),
      journal_issue: stringify(formData.journal_issue ?? formData.volume_issue),
      journal_pages: stringify(formData.journal_pages ?? formData.page_numbers),
      journal_month: stringify(formData.journal_month),
      journal_year: stringify(formData.journal_year),
      journal_quartile: stringify(formData.journal_quartile),
      publication_reward: stringify(formData.publication_reward),
      revision_fee: stringify(formData.revision_fee),
      publication_fee: stringify(formData.publication_fee),
      external_funding_amount: stringify(formData.external_funding_amount),
      total_amount: stringify(formData.total_amount),
      author_name_list: stringify(formData.author_name_list),
      signature: stringify(formData.signature),
      publication_date: stringify(buildPublicationDate()),
      doi: stringify(formData.doi),
      volume_issue: stringify(formData.volume_issue ?? formData.journal_issue),
      page_numbers: stringify(formData.page_numbers ?? formData.journal_pages),
      journal_url: stringify(formData.journal_url),
      article_online_db: stringify(formData.article_online_db),
      article_online_date: stringify(formData.article_online_date),
    };

    const resolvedYearId = (() => {
      const value = formData.year_id;
      if (value === null || value === undefined || value === '') {
        return null;
      }
      const numeric = Number(value);
      if (Number.isFinite(numeric)) {
        return numeric;
      }
      return null;
    })();

    const includeExternalFunds = Boolean(formData.journal_quartile && feeLimits.total > 0);

    const payload = {
      year_id: resolvedYearId,
      formData: normalizedFormData,
      applicant: currentUser
        ? {
            prefix_name:
              currentUser.prefix ||
              currentUser.prefix_name ||
              currentUser.title ||
              '',
            user_fname: currentUser.user_fname || currentUser.first_name || '',
            user_lname: currentUser.user_lname || currentUser.last_name || '',
            position_name: currentUser.position?.position_name || currentUser.position_name || '',
            date_of_employment: currentUser.date_of_employment || currentUser.start_date || '',
          }
        : {},
      coauthors: (coauthors || []).map((author, index) => ({
        order: index + 1,
        user_id: author.user_id,
        user_fname: author.user_fname,
        user_lname: author.user_lname,
      })),
      external_fundings: includeExternalFunds
        ? (externalFundings || []).map((funding) => ({
            fund_name: stringify(funding.fundName),
            amount: stringify(funding.amount),
          }))
        : [],
    attachments: resolvedAttachments.map((item, index) => ({
      filename: item.name,
      document_type_id: item.document_type_id ?? null,
      document_type_name: item.document_type_name || item.type || '',
      display_order: index + 1,
    })),
  };

    const formDataPayload = new FormData();
    formDataPayload.append('data', JSON.stringify(payload));

    resolvedAttachments.forEach((item) => {
      if (item?.file) {
        formDataPayload.append('attachments', item.file, item.name || 'attachment.pdf');
      }
    });

    const headers = {};
    const token = apiClient.getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    let previewWindow = null;
    if (openWindow && typeof window !== 'undefined') {
      previewWindow = window.open('', '_blank');
    }

    const readErrorMessage = async (resp, fallbackMessage) => {
      if (!resp) {
        return fallbackMessage;
      }

      const fallback = fallbackMessage || 'ไม่สามารถสร้างตัวอย่างได้';
      const contentType = resp.headers.get('content-type') || '';
      const text = await resp.text().catch(() => '');

      if (contentType.includes('application/json')) {
        try {
          const data = JSON.parse(text || '{}');
          return data?.error || data?.message || fallback;
        } catch (err) {
          return text.trim() || fallback;
        }
      }

      return text.trim() || fallback;
    };

    try {
      const response = await fetch(`${apiClient.baseURL}/publication-summary/preview`, {
        method: 'POST',
        headers,
        body: formDataPayload,
      });

      const contentType = response.headers.get('content-type') || '';

      if (!response.ok) {
        const errorMessage = await readErrorMessage(response, 'ไม่สามารถสร้างตัวอย่างได้');
        throw new Error(errorMessage || 'ไม่สามารถสร้างตัวอย่างได้');
      }

      const isPdfResponse =
        !contentType ||
        contentType.includes('application/pdf') ||
        contentType.includes('application/octet-stream');

      if (!isPdfResponse) {
        const errorMessage = await readErrorMessage(response, 'ไม่สามารถสร้างตัวอย่างได้');
        throw new Error(errorMessage || 'ไม่สามารถสร้างตัวอย่างได้');
      }

      const blob = await response.blob();
      if (!blob || blob.size === 0) {
        throw new Error('ไฟล์ตัวอย่างว่างเปล่า');
      }

      const blobUrl = URL.createObjectURL(blob);

      if (previewUrlRef.current) {
        try {
          URL.revokeObjectURL(previewUrlRef.current);
        } catch (error) {
          console.warn('Failed to revoke previous preview blob URL:', error);
        }
      }

      previewUrlRef.current = blobUrl;

      setPreviewState({
        loading: false,
        error: null,
        blobUrl,
        signedUrl: null,
        hasPreviewed: true,
        timestamp: Date.now(),
      });
      setPreviewAcknowledged(true);

      if (previewWindow) {
        previewWindow.location = blobUrl;
        try {
          previewWindow.focus();
        } catch (err) {
          // ignore focus errors in browsers that disallow it
        }
      } else if (openWindow && typeof window !== 'undefined') {
        window.open(blobUrl, '_blank', 'noopener,noreferrer');
      }

      Toast.fire({ icon: 'success', title: 'สร้างตัวอย่างเอกสารสำเร็จ' });
      return { type: 'blob', url: blobUrl };
    } catch (error) {
      if (previewWindow && !previewWindow.closed) {
        previewWindow.close();
      }

      const message = error?.message || 'ไม่สามารถสร้างตัวอย่างได้';

      setPreviewState((prev) => ({
        ...prev,
        loading: false,
        error: message,
        hasPreviewed: false,
      }));
      setPreviewAcknowledged(false);

      Toast.fire({ icon: 'error', title: 'ไม่สามารถสร้างตัวอย่างได้', text: message });
      throw error;
    }
  };

  // ฟังก์ชันลบไฟล์จาก Attached Files
  const removeAttachedFile = (fileInfo) => {
    if (fileInfo.source === 'uploaded') {
      // Remove from uploadedFiles
      const key = fileInfo.id.replace('uploaded-', '');
      setUploadedFiles(prev => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
    } else if (fileInfo.source === 'other') {
      // Remove from otherDocuments by index
      setOtherDocuments(prev => prev.filter((_, idx) => idx !== fileInfo.index));
    }
    // External files ไม่ลบที่นี่ ให้ลบผ่าน external funding table
  };

  // =================================================================
  // FORM VALIDATION
  // =================================================================

  const cleanLabelText = (text = '') => {
    if (!text) return '';
    return text.replace(/\*/g, '').replace(/\s+/g, ' ').trim();
  };

  const buildDefaultMessage = (rawLabel) => {
    const label = cleanLabelText(rawLabel);
    if (!label) {
      return 'กรุณากรอกข้อมูลให้ครบถ้วน';
    }
    return /เลือก|select/i.test(label) ? `กรุณาเลือก${label}` : `กรุณากรอก${label}`;
  };

  const getFieldLabel = (fieldKey) => {
    const formElement = formRef.current;
    if (formElement) {
      const field = formElement.elements.namedItem(fieldKey);
      if (field) {
        if (field.labels && field.labels.length > 0) {
          return cleanLabelText(field.labels[0].textContent || '');
        }
        if (field.id) {
          const labelElement = formElement.querySelector(`label[for="${field.id}"]`);
          if (labelElement) {
            return cleanLabelText(labelElement.textContent || '');
          }
        }
      }
    }

    const fallbackContainer = document.getElementById(`field-${fieldKey}`);
    if (fallbackContainer) {
      const labelElement = fallbackContainer.querySelector('label');
      if (labelElement) {
        return cleanLabelText(labelElement.textContent || '');
      }
    }

    return cleanLabelText(fieldKey);
  };

  const handleValidationErrors = (errorList = []) => {
    if (!errorList.length) {
      return;
    }

    const errorMap = {};
    const labelList = [];

    errorList.forEach(({ fieldKey, label, message }) => {
      const resolvedLabel = cleanLabelText(label || getFieldLabel(fieldKey));
      const resolvedMessage = message || buildDefaultMessage(resolvedLabel);
      errorMap[fieldKey] = resolvedMessage;
      if (resolvedLabel && !labelList.includes(resolvedLabel)) {
        labelList.push(resolvedLabel);
      }
    });

    setErrors(errorMap);

    Toast.fire({
      icon: 'warning',
      title: labelList.length
        ? `กรุณากรอกข้อมูลให้ครบถ้วน: ${labelList.join(', ')}`
        : 'กรุณากรอกข้อมูลให้ครบถ้วน'
    });

    const firstError = errorList[0];
    if (firstError?.refOrId) {
      const target = document.getElementById(firstError.refOrId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          const focusTarget = target.matches('input, select, textarea, button')
            ? target
            : target.querySelector('input, select, textarea, button, [tabindex]');
          if (focusTarget) {
            focusTarget.focus({ preventScroll: true });
          }
        }, 300);
      }
    }
  };

  const validateRequiredFields = () => {
    const errorList = [];
    const formElement = formRef.current;

    if (formElement) {
      const controls = Array.from(formElement.elements || []);
      controls.forEach((element) => {
        if (!element) return;
        const fieldKey = element.name || element.id;
        if (!fieldKey || element.disabled || element.type === 'hidden') {
          return;
        }

        const isRequired = element.required || element.getAttribute('aria-required') === 'true';
        if (!isRequired) {
          return;
        }

        if (fieldKey === 'journal_quartile' && selectionLocked) {
          return;
        }

        let isValid = true;
        if (typeof element.checkValidity === 'function') {
          isValid = element.checkValidity();
        } else {
          const value = typeof element.value === 'string' ? element.value.trim() : element.value;
          isValid = value !== '' && value != null;
        }

        if (!isValid) {
          const label = getFieldLabel(fieldKey);
          const validity = element.validity;
          let message = '';

          if (validity) {
            if (validity.valueMissing) {
              message = buildDefaultMessage(label);
            } else if (validity.patternMismatch) {
              message = element.dataset.patternMessage || buildDefaultMessage(label);
            } else if (validity.rangeOverflow || validity.rangeUnderflow) {
              message = element.dataset.rangeMessage || buildDefaultMessage(label);
            } else if (validity.tooLong || validity.tooShort) {
              message = element.dataset.lengthMessage || buildDefaultMessage(label);
            } else {
              message = element.validationMessage || buildDefaultMessage(label);
            }
          } else {
            message = buildDefaultMessage(label);
          }

          errorList.push({
            fieldKey,
            label,
            refOrId: element.id || `field-${fieldKey}`,
            message
          });
        }
      });
    }

    if (documentTypes && documentTypes.length > 0) {
      const normalize = (value = '') => value.toLowerCase();
      const hasServerExternal = Array.isArray(serverExternalFundingFiles)
        ? serverExternalFundingFiles.some((doc) => !doc.pendingRemoval)
        : false;
      const hasExternalAttachments = (Array.isArray(externalFundingFiles) && externalFundingFiles.some(file => !!file?.file)) || hasServerExternal;
      const otherTypeIds = Array.isArray(documentTypes)
        ? documentTypes
            .filter((doc) => {
              const identifier = doc?.id ?? doc?.document_type_id;
              if (identifier == null && !doc?.name) {
                return false;
              }
              const labelText = normalize(doc?.name || getDocumentTypeName(identifier));
              return labelText.includes('อื่น') || labelText.includes('other');
            })
            .map((doc) => String(doc?.id ?? doc?.document_type_id))
        : [];
      const hasServerOther = Array.isArray(serverDocuments)
        ? serverDocuments.some((doc) =>
            otherTypeIds.includes(String(doc.document_type_id)) && !doc.pendingRemoval
          )
        : false;
      const hasOtherAttachments = (Array.isArray(otherDocuments) && otherDocuments.length > 0) || hasServerOther;

      documentTypes
        .filter(doc => doc?.required)
        .forEach(doc => {
          const docId = doc.id ?? doc.document_type_id;
          if (!docId) {
            return;
          }

          const hasUploadedFile = Boolean(uploadedFiles?.[docId]);
          const hasServerDocument = Array.isArray(serverDocuments)
            ? serverDocuments.some(
                (serverDoc) =>
                  String(serverDoc.document_type_id) === String(docId) && !serverDoc.pendingRemoval
              )
            : false;
          let hasAttachment = hasUploadedFile;
          if (!hasAttachment) {
            const labelText = normalize(doc.name || '');
            if (labelText.includes('อื่น') || labelText.includes('other')) {
              hasAttachment = hasOtherAttachments;
            } else if (labelText.includes('ภายนอก') || labelText.includes('external')) {
              hasAttachment = hasExternalAttachments;
            } else if (hasServerDocument) {
              hasAttachment = true;
            }
          }

          if (!hasAttachment) {
            const label = doc.name || getDocumentTypeName(docId);
            errorList.push({
              fieldKey: `file_${docId}`,
              label,
              refOrId: `file-upload-${docId}`,
              message: `กรุณาแนบ${label}`
            });
          }
        });
    }

    return {
      isValid: errorList.length === 0,
      errors: errorList
    };
  };

  const validateAdditionalRules = async () => {
    const errorList = [];
    let resolutionMessage = '';
    const lockedDraft = Boolean(prefilledSubmissionId && currentSubmissionStatus === 'draft' && !isReadOnly);

    if (!lockedDraft && !selectionLocked && formData.author_status && formData.journal_quartile) {
      if (!formData.subcategory_id || !formData.subcategory_budget_id) {
        resolutionMessage = resolutionError || 'ไม่พบทุนสำหรับปี/สถานะ/ควอร์ไทล์ที่เลือก';
      } else if (resolutionError && resolutionError.length > 0) {
        resolutionMessage = resolutionError;
      }
    }

    if (resolutionMessage) {
      errorList.push({
        fieldKey: 'journal_quartile',
        label: getFieldLabel('journal_quartile'),
        refOrId: 'journal_quartile',
        message: resolutionMessage
      });
    }

    let feesMessage = '';
    if (formData.journal_quartile) {
      const yearObj = years.find(y => y.year_id === formData.year_id);
      const targetYear =
        lockedBudgetYearLabel ||
        rewardConfigYear ||
        yearObj?.year ||
        (new Date().getFullYear() + 543).toString();
      const feeErrors = await validateFees(
        formData.journal_quartile,
        formData.revision_fee,
        formData.publication_fee,
        targetYear,
        rewardConfigMap
      );
      if (feeErrors.length > 0) {
        feesMessage = feeErrors.join(', ');
        errorList.push({
          fieldKey: 'fees',
          label: 'ค่าปรับปรุงและค่าธรรมเนียมการตีพิมพ์',
          refOrId: 'field-fees_limit',
          message: feesMessage
        });
      }
    }

    setResolutionError(lockedDraft ? '' : resolutionMessage);
    setFeeError(feesMessage);

    return {
      isValid: errorList.length === 0,
      errors: errorList
    };
  };

  // =================================================================
  // DRAFT MANAGEMENT
  // =================================================================

  // Save draft
  const saveDraft = async () => {
    if (saving) {
      return;
    }

    const missingDraftFields = [];
    if (!formData.author_status) {
      missingDraftFields.push({
        fieldKey: 'author_status',
        refOrId: 'author_status',
      });
    }
    if (!formData.journal_quartile) {
      missingDraftFields.push({
        fieldKey: 'journal_quartile',
        refOrId: 'journal_quartile',
      });
    }

    if (missingDraftFields.length > 0) {
      handleValidationErrors(missingDraftFields);
      return;
    }

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

      const optionKey = formData.author_status && formData.journal_quartile
        ? `${formData.author_status}|${formData.journal_quartile}`
        : null;
      const optionContext = optionKey ? budgetOptionMap[optionKey] : null;

      const submissionSubcategoryId = formData.subcategory_id
        ?? optionContext?.subcategory_id
        ?? null;
      const submissionSubcategoryBudgetId = formData.subcategory_budget_id
        ?? optionContext?.subcategory_budget_id
        ?? null;

      let submissionId = currentSubmissionId;

      if (!submissionId) {
        if (!formData.year_id) {
          throw new Error('กรุณาเลือกปีงบประมาณก่อนบันทึกร่าง');
        }

        const createPayload = {
          submission_type: 'publication_reward',
          year_id: formData.year_id,
          contact_phone: formData.phone_number || '',
          bank_account: formData.bank_account || '',
          bank_account_name: formData.bank_account_name || '',
          bank_name: formData.bank_name || '',
        };

        const resolvedCategoryId = formData.category_id || categoryId || null;
        if (resolvedCategoryId) {
          createPayload.category_id = resolvedCategoryId;
        }
        if (submissionSubcategoryId) {
          createPayload.subcategory_id = submissionSubcategoryId;
        }
        if (submissionSubcategoryBudgetId) {
          createPayload.subcategory_budget_id = submissionSubcategoryBudgetId;
        }

        const submissionResponse = await submissionAPI.create(createPayload);
        submissionId = submissionResponse?.submission?.submission_id
          ?? submissionResponse?.submission_id
          ?? null;

        if (!submissionId) {
          throw new Error('ไม่สามารถสร้างร่างคำร้องได้');
        }

        setCurrentSubmissionId(submissionId);
        setPrefilledSubmissionId(toSubmissionKey(submissionId));
        setCurrentSubmissionStatus('draft');
      } else {
        const updatePayload = {};
        const resolvedCategoryId = formData.category_id || categoryId || null;
        if (resolvedCategoryId) {
          updatePayload.category_id = resolvedCategoryId;
        }
        if (submissionSubcategoryId) {
          updatePayload.subcategory_id = submissionSubcategoryId;
        }
        if (submissionSubcategoryBudgetId) {
          updatePayload.subcategory_budget_id = submissionSubcategoryBudgetId;
        }

        updatePayload.contact_phone = formData.phone_number || '';
        updatePayload.bank_account = formData.bank_account || '';
        updatePayload.bank_account_name = formData.bank_account_name || '';
        updatePayload.bank_name = formData.bank_name || '';

        if (Object.keys(updatePayload).length > 0) {
          try {
            await submissionAPI.update(submissionId, updatePayload);
          } catch (updateError) {
            console.warn('Failed to update submission metadata for draft:', updateError);
          }
        }

        setCurrentSubmissionStatus('draft');
      }

      if (!submissionId) {
        throw new Error('ไม่สามารถกำหนดหมายเลขคำร้องได้');
      }

      try {
        await submissionUsersAPI.setCoauthors(submissionId, coauthors);
      } catch (coauthorError) {
        console.warn('Failed to persist co-authors for draft:', coauthorError);
      }

      const publicationDate = formData.journal_year && formData.journal_month
        ? `${formData.journal_year}-${formData.journal_month.padStart(2, '0')}-01`
        : `${new Date().getFullYear()}-01-01`;

      const includeExternalFunds = Boolean(formData.journal_quartile && feeLimits.total > 0);
      const externalFundingData = includeExternalFunds
        ? externalFundings.map(funding => ({
            client_id: funding.clientId || '',
            external_fund_id: funding.externalFundId ?? null,
            fund_name: funding.fundName || '',
            amount: parseFloat(funding.amount) || 0,
          }))
        : [];

      const authorSubmissionFields = getAuthorSubmissionFields(formData);

      const publicationData = {
        article_title: formData.article_title || '',
        journal_name: formData.journal_name || '',
        publication_date: publicationDate,
        publication_type: 'journal',
        journal_quartile: formData.journal_quartile || '',
        impact_factor: parseFloat(formData.impact_factor) || 0,
        doi: formData.doi || '',
        url: formData.journal_url || '',
        page_numbers: formData.journal_pages || '',
        volume_issue: formData.journal_issue || '',
        indexing: [
          formData.in_isi && 'ISI',
          formData.in_scopus && 'Scopus',
          formData.in_web_of_science && 'Web of Science',
          formData.in_tci && 'TCI'
        ].filter(Boolean).join(', ') || '',
        reward_amount: parseFloat(formData.publication_reward) || 0,
        revision_fee: parseFloat(formData.revision_fee) || 0,
        publication_fee: parseFloat(formData.publication_fee) || 0,
        external_funding_amount: includeExternalFunds ? (parseFloat(formData.external_funding_amount) || 0) : 0,
        total_amount: parseFloat(formData.total_amount) || 0,
        external_fundings: externalFundingData,
        author_count: (coauthors?.length || 0) + 1,
        is_corresponding_author: formData.author_status === 'corresponding_author',
        author_status: formData.author_status || '',
        author_type: formData.author_status || '',
        ...authorSubmissionFields,
        bank_account: formData.bank_account || '',
        bank_name: formData.bank_name || '',
        phone_number: formData.phone_number || '',
        has_university_funding: formData.has_university_fund || '',
        university_fund_ref: formData.university_fund_ref || '',
        funding_references: formData.university_fund_ref || '',
        university_rankings: formData.university_ranking || '',
        main_annoucement: announcementLock.main_annoucement ?? null,
        reward_announcement: announcementLock.reward_announcement ?? null,
      };

      const pendingUploads = getAllAttachedFiles();

      const response = await publicationDetailsAPI.add(submissionId, publicationData, {
        mode: 'draft',
        allowIncomplete: true,
      });

      const savedExternalFunds = Array.isArray(response?.external_fundings)
        ? response.external_fundings
        : Array.isArray(response?.data?.external_fundings)
          ? response.data.external_fundings
          : [];

      applyExternalFundingServerIds(savedExternalFunds, { targetFiles: pendingUploads });

      const unresolvedExternalFile = pendingUploads.some(
        (fileData) => fileData.document_type_id === 12 && !fileData.external_funding_id
      );

      if (unresolvedExternalFile) {
        throw new Error('กรุณาบันทึกข้อมูลทุนภายนอกก่อนแนบไฟล์หลักฐาน');
      }

      await syncSubmissionDocuments({
        submissionId,
        onProgress: ({ type, completed, totalDetach, totalUpload }) => {
          if (type === 'detach' && totalDetach) {
            Swal.update({
              title: 'กำลังลบไฟล์เดิม...',
              html: `(${completed}/${totalDetach})`,
            });
          }
          if (type === 'upload' && totalUpload) {
            Swal.update({
              title: 'กำลังอัปโหลดไฟล์...',
              html: `(${completed}/${totalUpload})`,
            });
          }
        },
        filesOverride: pendingUploads,
      });

      Swal.close();
      Toast.fire({
        icon: 'success',
        title: 'บันทึกร่างเรียบร้อยแล้ว',
        html: '<small>ระบบได้บันทึกข้อมูลของคุณบนเซิร์ฟเวอร์</small>'
      });
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

    if (!result.isConfirmed) {
      return;
    }

    if (currentSubmissionId) {
      try {
        await submissionAPI.hardDelete(currentSubmissionId);
      } catch (deleteError) {
        console.error('Failed to permanently delete draft submission:', deleteError);
        const statusCode = deleteError?.response?.status;
        if (statusCode !== 404) {
          const message =
            deleteError?.response?.data?.error ||
            deleteError?.message ||
            'ไม่สามารถลบร่างได้ กรุณาลองใหม่อีกครั้ง';
          Swal.fire({
            icon: 'error',
            title: 'ลบร่างไม่สำเร็จ',
            text: message,
            confirmButtonColor: '#d33',
          });
          return;
        }
      }
      const submissionKey = toSubmissionKey(currentSubmissionId);
      if (submissionKey) {
        missingSubmissionRef.current.add(submissionKey);
        setPrefilledSubmissionId(submissionKey);
      }
      setCurrentSubmissionId(null);
      setCurrentSubmissionStatus(null);
    }

    const resolvedCategoryId = categoryId ?? formData.category_id ?? null;
    const resolvedYearId = yearId ?? formData.year_id ?? null;

    resetForm();

    Toast.fire({
      icon: 'success',
      title: 'ลบร่างเรียบร้อยแล้ว'
    });

    const targetPage = navigationTarget || 'promotion-fund';
    const navigationData = (() => {
      if (targetPage === 'promotion-fund') {
        return {
          originPage: targetPage,
          category_id: resolvedCategoryId,
          year_id: resolvedYearId,
        };
      }
      if (targetPage === 'applications') {
        return { originPage: targetPage };
      }
      if (targetPage) {
        return { originPage: targetPage };
      }
      return undefined;
    })();
    if (onNavigate) {
      onNavigate(targetPage, navigationData);
    } else {
      const fallbackPage = targetPage || 'promotion-fund';
      router.push(`/member?initialPage=${fallbackPage}`);
    }
  };
  // =================================================================
  // SUBMISSION CONFIRMATION
  // =================================================================

// Show submission confirmation dialog
const showSubmissionConfirmation = async () => {
  const publicationDate = formData.journal_month && formData.journal_year 
    ? `${formData.journal_month}/${formData.journal_year}` 
    : '-';

  const currentAttachments = attachedFiles || [];
  const allFilesList = currentAttachments.map((file) => ({
    name: file.name,
    type: file.document_type_name || file.type || 'เอกสาร',
    size: file.size || 0,
  }));

  if (currentAttachments.length === 0) {
    Swal.fire({
      icon: 'warning',
      title: 'ไม่พบเอกสารแนบ',
      text: 'กรุณาแนบไฟล์บทความอย่างน้อย 1 ไฟล์',
      confirmButtonColor: '#3085d6'
    });
    return false;
  }

  const previewAvailable = previewAcknowledged && !!previewUrl;
  let previewViewed = previewAvailable;
  const previewButtonMode = previewAvailable ? 'open' : 'create';
  const previewButtonInitialLabel = previewAvailable ? '👀 ดูอีกครั้ง' : '⚙️ สร้างตัวอย่างเอกสารรวม';
  const previewStatusMarkup = previewAvailable
    ? '<span class="text-green-600">✅ ดูตัวอย่างเอกสารแล้ว</span>'
    : '<span class="text-red-600">⚠️ กรุณาสร้างตัวอย่างเอกสารรวมก่อนส่งคำร้อง</span>';
  const previewButtonInitialClass = previewAvailable
    ? 'px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors'
    : 'px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors';

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

        <div class="bg-blue-50 border border-blue-200 p-3 rounded">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium text-blue-800">📋 เอกสารรวม (PDF)</p>
              <p class="text-xs text-blue-600">ไฟล์ PDF ทั้งหมดรวมเป็นไฟล์เดียว</p>
            </div>
            <button
              id="preview-pdf-btn"
              type="button"
              class="${previewButtonInitialClass}"
              data-mode="${previewButtonMode}"
            >
              ${previewButtonInitialLabel}
            </button>
          </div>
          <div id="preview-status" class="mt-2 text-xs">
            ${previewStatusMarkup}
          </div>
        </div>
          </div>
        </div>

        ${formData.bank_account || formData.bank_name || formData.bank_account_name ? `
          <div class="bg-purple-50 p-4 rounded-lg">
            <h4 class="font-semibold text-purple-700 mb-2">ข้อมูลธนาคาร</h4>
            <div class="space-y-2 text-sm">
              <p><span class="font-medium">เลขบัญชี:</span> ${formData.bank_account || '-'}</p>
              <p><span class="font-medium">ชื่อบัญชี:</span> ${formData.bank_account_name || '-'}</p>
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
          const previewReady = previewViewed || previewAcknowledged;
          if (currentAttachments.length > 0 && !previewReady) {
            Swal.showValidationMessage('กรุณาดูตัวอย่างเอกสารรวมก่อนส่งคำร้อง');
            return false;
          }
          return true;
        },
        didOpen: () => {
          // Add event listener for preview button
          const previewBtn = document.getElementById('preview-pdf-btn');
          const previewStatus = document.getElementById('preview-status');

          if (previewBtn) {
            const mode = previewBtn.getAttribute('data-mode');

            if (mode === 'open') {
              const originalLabel = previewBtn.innerHTML;
              const originalClass = previewBtn.className;

              previewBtn.addEventListener('click', async () => {
                previewBtn.disabled = true;
                previewBtn.innerHTML = '⏳ กำลังเปิด...';
                previewBtn.className = originalClass;

                try {
                  const urlToOpen =
                    previewState?.blobUrl ||
                    previewState?.signedUrl ||
                    previewUrlRef.current ||
                    previewUrl;

                  if (!urlToOpen) {
                    throw new Error('ไม่พบไฟล์ตัวอย่าง');
                  }

                  const openedWindow = window.open(urlToOpen, '_blank', 'noopener,noreferrer');

                  if (!openedWindow) {
                    throw new Error('โปรดอนุญาตให้เบราว์เซอร์เปิดหน้าต่างใหม่เพื่อดูไฟล์');
                  }

                  try {
                    openedWindow.focus();
                  } catch (focusError) {
                    console.warn('Unable to focus preview window:', focusError);
                  }

                  previewViewed = true;
                  setPreviewAcknowledged(true);

                  if (previewStatus) {
                    previewStatus.innerHTML = '<span class="text-green-600">✅ ดูตัวอย่างเอกสารแล้ว</span>';
                  }

                  previewBtn.className = 'px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors';
                  previewBtn.innerHTML = '✅ ดูแล้ว';

                  const validationMessage = document.querySelector('.swal2-validation-message');
                  if (validationMessage) {
                    validationMessage.style.display = 'none';
                  }

                  setPreviewState((prev) => ({
                    ...prev,
                    hasPreviewed: true,
                    blobUrl: prev.blobUrl || (urlToOpen.startsWith('blob:') ? urlToOpen : prev.blobUrl),
                    signedUrl: prev.signedUrl || (!urlToOpen.startsWith('blob:') ? urlToOpen : prev.signedUrl),
                    timestamp: prev.timestamp || new Date().toISOString(),
                  }));

                  if (!previewUrlRef.current && urlToOpen.startsWith('blob:')) {
                    previewUrlRef.current = urlToOpen;
                  }
                } catch (error) {
                  const message = error?.message || 'ไม่สามารถเปิดเอกสารได้';
                  if (previewStatus) {
                    previewStatus.innerHTML = `<span class="text-red-600">❌ ${message}</span>`;
                  }
                  previewBtn.className = originalClass;
                  previewBtn.innerHTML = originalLabel;
                } finally {
                  previewBtn.disabled = false;
                }
              });
            } else {
              previewBtn.addEventListener('click', () => {
                Swal.close();

                setTimeout(() => {
                  const sectionEl = previewSectionRef.current;
                  if (sectionEl && typeof sectionEl.scrollIntoView === 'function') {
                    sectionEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }

                  setTimeout(() => {
                    generatePreview().catch((error) => {
                      console.error('Failed to generate preview after redirect:', error);
                    });
                  }, 150);
                }, 150);
              });
            }
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

  // Validate publication data before sending
  const validatePublicationData = (data) => {
    const errors = [];
    
    // Check required fields
    if (!data.article_title) errors.push('ไม่มีชื่อบทความ');
    if (!data.journal_name) errors.push('ไม่มีชื่อวารสาร');
    if (!data.journal_quartile) errors.push('ไม่มี Quartile');
    if (!data.publication_date) errors.push('ไม่มีวันที่ตีพิมพ์');
    
    // Check date format
    if (data.publication_date && !data.publication_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      errors.push('รูปแบบวันที่ไม่ถูกต้อง (ต้องเป็น YYYY-MM-DD)');
    }
    
    // Check numeric fields
    const numericFields = ['reward_amount', 'revision_fee', 'publication_fee', 'external_funding_amount', 'total_amount'];
    numericFields.forEach(field => {
      if (isNaN(data[field])) {
        errors.push(`${field} ต้องเป็นตัวเลข`);
      }
    });
    
    return errors;
  };
  // Submit application
  const submitApplication = async (event) => {
    if (event?.preventDefault) {
      event.preventDefault();
    }

    if (isSubmitting) {
      return;
    }

    if (!isReadOnly) {
      const pendingAcknowledgements = endOfContractTerms.filter((term, index) => {
        const key = String(
          term.eoc_id ?? term.id ?? term.term_id ?? term.termId ?? term.termID ?? term.display_order ?? index,
        );
        return !termAcknowledgements[key];
      });

      if (pendingAcknowledgements.length > 0) {
        Toast.fire({
          icon: 'warning',
          title: 'กรุณายืนยันข้อตกลงทั้งหมดก่อนส่งคำร้อง'
        });
        return;
      }
    }

    const requiredValidation = validateRequiredFields();
    if (!requiredValidation.isValid) {
      handleValidationErrors(requiredValidation.errors);
      return;
    }

    const additionalValidation = await validateAdditionalRules();
    if (!additionalValidation.isValid) {
      handleValidationErrors(additionalValidation.errors);
      return;
    }

    setErrors({});

    // Show confirmation dialog
    const confirmed = await showSubmissionConfirmation();
    if (!confirmed) {
      return;
    }

    try {
      setIsSubmitting(true);
      setLoading(true);

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
              document_type_id: 11,
              description: doc.description || `เอกสารอื่นๆ ${index + 1}: ${file.name}`
            });
          }
        });
      }

      // 3. Add external funding documents from externalFundingFiles (ใช้ externalFundingFiles)
      if (externalFundingFiles && externalFundingFiles.length > 0) {
        externalFundingFiles.forEach(doc => {
          const funding = externalFundings.find(f => f.clientId === doc.funding_client_id);
          if (doc.file) {
            allFiles.push({
              file: doc.file,
              document_type_id: 12,
              description: `เอกสารเบิกจ่ายภายนอก: ${funding?.fundName || 'ไม่ระบุ'}`,
              external_funding_client_id: doc.funding_client_id,
              external_funding_id: doc.external_fund_id ?? funding?.externalFundId ?? null
            });
          }
        });
      }

      // Create submission if not exists
      if (!submissionId) {
        Swal.update({
          html: 'กำลังสร้างคำร้อง...'
        });

        const optionKey = formData.author_status && formData.journal_quartile
          ? `${formData.author_status}|${formData.journal_quartile}`
          : null;
        const optionContext = optionKey ? budgetOptionMap[optionKey] : null;
        const submissionSubcategoryId = formData.subcategory_id ?? optionContext?.subcategory_id ?? null;
        const submissionSubcategoryBudgetId = formData.subcategory_budget_id ?? optionContext?.subcategory_budget_id ?? null;

        if (!submissionSubcategoryId || !submissionSubcategoryBudgetId) {
          throw new Error('ไม่พบข้อมูลหมวดทุนสำหรับการสร้างคำร้อง');
        }

        const submissionResponse = await submissionAPI.create({
          submission_type: 'publication_reward',
          year_id: formData.year_id,
          category_id: formData.category_id || categoryId,
          subcategory_id: submissionSubcategoryId,        // Dynamic resolved
          subcategory_budget_id: submissionSubcategoryBudgetId,  // Dynamic resolved
          contact_phone: formData.phone_number || '',
          bank_account: formData.bank_account || '',
          bank_account_name: formData.bank_account_name || '',
          bank_name: formData.bank_name || '',
        });
        
        submissionId = submissionResponse.submission.submission_id;
        setCurrentSubmissionId(submissionId);
      }

      // Step 2: Manage Users in Submission
      if (currentUser && (coauthors.length > 0 || formData.author_status)) {
        Swal.update({
          html: 'กำลังจัดการผู้แต่ง...'
        });

        try {
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

          // Try batch API first
          let batchSuccess = false;
          
          try {
            const batchResult = await submissionUsersAPI.addMultipleUsers(submissionId, allUsers);

            if (batchResult.success) {
              batchSuccess = true;
            }
          } catch (batchError) {
            console.warn('Batch API failed, trying individual additions:', batchError);
          }

          // If batch fails, add individually
          if (!batchSuccess) {
            let successCount = 0;
            const errors = [];

            for (let i = 0; i < allUsers.length; i++) {
              const user = allUsers[i];

              try {
                await submissionUsersAPI.addUser(submissionId, user);
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

      // Format publication date
      const publicationDate = formData.journal_year && formData.journal_month 
        ? `${formData.journal_year}-${formData.journal_month.padStart(2, '0')}-01`
        : `${new Date().getFullYear()}-01-01`;

      const includeExternalFunds = Boolean(formData.journal_quartile && feeLimits.total > 0);
      // สร้าง external funding array สำหรับส่งไป backend (ถ้ามี)
      const externalFundingData = includeExternalFunds
        ? externalFundings.map(funding => ({
            client_id: funding.clientId || '',
            external_fund_id: funding.externalFundId ?? null,
            fund_name: funding.fundName || '',
            amount: parseFloat(funding.amount) || 0
          }))
        : [];

      const authorSubmissionFields = getAuthorSubmissionFields(formData);

      const publicationData = {
        // Basic article info
        article_title: formData.article_title || '',
        journal_name: formData.journal_name || '',
        publication_date: publicationDate,
        journal_quartile: formData.journal_quartile || '',
        
        // Optional article details
        publication_type: 'journal',
        impact_factor: formData.impact_factor ? parseFloat(formData.impact_factor) : 0,
        doi: formData.doi || '',
        url: formData.journal_url || '',
        page_numbers: formData.journal_pages || '',
        volume_issue: formData.journal_issue || '',
        
        // Indexing as single string
        indexing: [
          formData.in_isi && 'ISI',
          formData.in_scopus && 'Scopus',
          formData.in_web_of_science && 'Web of Science',
          formData.in_tci && 'TCI'
        ].filter(Boolean).join(', ') || '',
        
        // Financial fields
        reward_amount: parseFloat(formData.publication_reward) || 0,
        revision_fee: parseFloat(formData.revision_fee) || 0,
        publication_fee: parseFloat(formData.publication_fee) || 0,
        external_funding_amount: includeExternalFunds ? (parseFloat(formData.external_funding_amount) || 0) : 0,
        total_amount: parseFloat(formData.total_amount) || 0,

        // External fundings breakdown
        external_fundings: externalFundingData,
        
        // Author info
        author_count: (coauthors?.length || 0) + 1,
        is_corresponding_author: formData.author_status === 'corresponding_author',
        author_status: formData.author_status || '',
        author_type: formData.author_status || '', // เพิ่ม field นี้ด้วย
        ...authorSubmissionFields,

        // Bank info
        bank_account: formData.bank_account || '',
        bank_name: formData.bank_name || '',
        bank_account_name: formData.bank_account_name || '',
        phone_number: formData.phone_number || '',
        
        // Additional info
        has_university_funding: formData.has_university_fund || 'no',
        funding_references: formData.university_fund_ref || '',
        university_rankings: formData.university_ranking || '',
        
        // Announcement info
        announce_reference_number: '',
        main_annoucement: announcementLock.main_annoucement,
        reward_announcement: announcementLock.reward_announcement,
      };

      try {
        // ส่ง publicationData โดยตรง
        const response = await publicationDetailsAPI.add(submissionId, publicationData, {
          mode: 'submit',
        });

        const savedExternalFunds = Array.isArray(response?.external_fundings)
          ? response.external_fundings
          : Array.isArray(response?.data?.external_fundings)
            ? response.data.external_fundings
            : [];

        applyExternalFundingServerIds(savedExternalFunds, { targetFiles: allFiles });

        const unresolvedExternalFile = allFiles.some(
          (fileData) => fileData.document_type_id === 12 && !fileData.external_funding_id
        );

        if (unresolvedExternalFile) {
          throw new Error('กรุณาบันทึกข้อมูลทุนภายนอกก่อนแนบไฟล์หลักฐาน');
        }
      } catch (error) {
        console.error('Failed to save publication details:', error);

        // เพิ่มการ log เพื่อดู error detail
        if (error.response) {
          console.error('Error response status:', error.response.status);
          console.error('Error response data:', error.response.data);
          console.error('Error response headers:', error.response.headers);
        }
        
        let errorMessage = 'เกิดข้อผิดพลาดที่ server';
        
        if (error.response?.status === 400) {
          errorMessage = error.response.data?.message || 'ข้อมูลที่ส่งไปไม่ถูกต้อง';
        } else if (error.response?.status === 500) {
          errorMessage = 'Server error - อาจมีปัญหากับ database หรือ backend logic';
          
          // Log สำหรับ debug
          console.error('=== Debug Info for 500 Error ===');
          console.error('Data that caused error:', publicationData);
          console.error('Data types:', Object.entries(publicationData).map(([k, v]) => ({
            field: k,
            type: typeof v,
            value: v
          })));
        }
        
        Swal.fire({
          icon: 'error',
          title: 'ไม่สามารถบันทึกรายละเอียดบทความได้',
          html: `
            <div class="text-left">
              <p><strong>Error:</strong> ${errorMessage}</p>
              <p class="text-sm text-gray-600 mt-2">Submission ID: ${submissionId}</p>
              <details class="mt-3">
                <summary class="cursor-pointer text-sm text-blue-600">ดูรายละเอียด</summary>
                <pre class="text-xs bg-gray-100 p-2 mt-2 rounded overflow-auto max-h-40">
      ${JSON.stringify(publicationData, null, 2)}
                </pre>
              </details>
            </div>
          `,
          confirmButtonColor: '#ef4444',
          width: '600px'
        });
        return;
      }

      await syncSubmissionDocuments({
        submissionId,
        onProgress: ({ type, completed, totalDetach, totalUpload }) => {
          if (type === 'detach' && totalDetach) {
            Swal.update({ html: `กำลังลบไฟล์เดิม... (${completed}/${totalDetach})` });
          }
          if (type === 'upload' && totalUpload) {
            Swal.update({ html: `กำลังอัปโหลดไฟล์... (${completed}/${totalUpload})` });
          }
        },
        filesOverride: allFiles,
      });

      // Submit the application
      Swal.update({
        html: 'กำลังส่งคำร้อง...'
      });

      const submissionDate = new Date();
      try {
        const installmentNumber = await fundInstallmentAPI.resolveInstallmentNumber({
          yearId: formData.year_id ?? null,
          submissionDate,
        });

        if (installmentNumber != null) {
          try {
            await submissionAPI.update(submissionId, {
              installment_number_at_submit: installmentNumber,
            });
          } catch (installmentUpdateError) {
            console.warn('Failed to update installment_number_at_submit:', installmentUpdateError);
          }
        }
      } catch (installmentError) {
        console.warn('Failed to resolve installment period for submission:', installmentError);
      }

      await submissionAPI.submitSubmission(submissionId);
      try {
        await submissionAPI.mergeSubmissionDocuments(submissionId);
      } catch (mergeError) {
        console.error('Failed to merge submission documents:', mergeError);
      }

      try {
        const submitterDisplayName = (() => {
          if (!currentUser) {
            return '';
          }
          const parts = resolveUserNameParts(currentUser);
          const combined = [parts.prefix, parts.firstName, parts.lastName]
            .filter(Boolean)
            .join(' ')
            .trim();
          return (parts.displayName || combined || '').trim();
        })();

        await notificationsAPI.notifySubmissionSubmitted(submissionId, {
          submitter_name: submitterDisplayName,
        });
      } catch (e) {
        console.warn('notifySubmissionSubmitted failed:', e);
      }

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
      setIsSubmitting(false);
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

  const fallbackAuthorStatusDescription = formData.author_status
    ? authorStatusLabelMap[formData.author_status] || ''
    : '';
  const bannerFundFullName = findFirstString([
    selectedFundSummary?.name,
    lockedFundSummary?.name,
    selectedFundSummary?.description,
    lockedFundSummary?.description,
    formData.author_status ? AUTHOR_STATUS_MAP[formData.author_status] : null,
    fallbackAuthorStatusDescription,
    selectedFundSummary?.detail,
    lockedFundSummary?.detail,
  ]);
  const normalizedFundName = typeof bannerFundFullName === 'string' ? bannerFundFullName.trim() : '';
  const resolvedQuartileDescription = (() => {
    const optionKey =
      formData.author_status && formData.journal_quartile
        ? `${formData.author_status}|${formData.journal_quartile}`
        : null;

    const optionContext = optionKey ? budgetOptionMap[optionKey] : null;

    const candidates = [
      optionContext?.fund_description,
      optionContext?.subcategory_description,
      optionContext?.journal_quartile_label,
      optionContext?.journal_quartile_code ? QUARTILE_MAP[optionContext.journal_quartile_code] : null,
      selectedFundSummary?.detail,
      lockedFundSummary?.detail,
    ];

    for (const candidate of candidates) {
      if (typeof candidate !== 'string') {
        continue;
      }
      const trimmed = candidate.trim();
      if (!trimmed) {
        continue;
      }
      if (normalizedFundName && trimmed === normalizedFundName) {
        continue;
      }
      return trimmed;
    }

    return '';
  })();
  const bannerQuartileSuffix = resolveQuartileSuffix(
    formData.journal_quartile,
    resolvedQuartileDescription
  );
  const bannerPrimaryDescription = bannerFundFullName
    ? `${bannerFundFullName}${bannerQuartileSuffix ? ` ${bannerQuartileSuffix}` : ''}`
    : bannerQuartileSuffix;
  const bannerSecondaryDescription = (() => {
    const candidateValues = [
      selectedFundSummary?.name,
      selectedFundSummary?.description,
      selectedFundSummary?.detail,
    ]
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter((value) => value && value !== bannerFundFullName);

    const firstCandidate = candidateValues.find((value) => value && value !== bannerPrimaryDescription);
    return firstCandidate || '';
  })();
  const shouldShowDraftBanner = Boolean(
    (editingExistingSubmission || lockedFundSummary) && (bannerPrimaryDescription || bannerSecondaryDescription)
  );
  const enforceBudgetYearReadOnly = Boolean(lockedBudgetYearId) || editingExistingSubmission || isReadOnly;
  const disableAuthorStatusSelect = selectionLocked || authorStatusOptions.length === 0;
  const disableQuartileSelect = selectionLocked || availableQuartiles.length === 0;
  const disableJournalNameInput = (availableQuartiles.length === 0 && !editingExistingSubmission);
  const displayResolutionError = selectionLocked ? '' : resolutionError;
  const allowExternalFunding = Boolean(
    formData.journal_quartile && feeLimits.total > 0
  );
  const shouldShowReviewerComments = currentSubmissionStatus === 'needs_more_info';
  const adminCommentDisplay = formatReviewerComment(reviewComments.admin);
  const headCommentDisplay = formatReviewerComment(reviewComments.head);

  return (
    <PageLayout
      title="แบบฟอร์มขอเบิกเงินรางวัลการตีพิมพ์เผยแพร่ผลงานวิจัยที่ได้รับการตีพิมพ์ในสาขาวิทยาศาสตร์และเทคโนโลยี"
      subtitle="แบบฟอร์มสำหรับขอเบิกเงินรางวัลและค่าใช้จ่าย"
      icon={Award}
      actions={(
        <button
          type="button"
          onClick={handleGoBack}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-600 transition-colors hover:bg-gray-50 whitespace-nowrap"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>ย้อนกลับ</span>
        </button>
      )}
      breadcrumbs={[
        { label: "หน้าแรก", href: "/member" },
        { label: "ขอเบิกเงินรางวัลการตีพิมพ์" }
      ]}
    >
      <form ref={formRef} className="space-y-6" noValidate>
        {shouldShowDraftBanner && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 flex-shrink-0 text-blue-500" aria-hidden="true" />
              <div className="space-y-2">
                <p className="font-medium text-blue-900">
                  แบบฟอร์มนี้กำลังใช้ทุน {bannerPrimaryDescription}
                </p>
                {bannerSecondaryDescription && (
                  <p className="text-xs text-blue-700 sm:text-sm">
                    {bannerSecondaryDescription}
                  </p>
                )}
                {selectionLocked && (
                  <p className="text-xs text-blue-700 sm:text-sm">
                    ไม่สามารถเปลี่ยนทุนสำหรับคำร้องได้ กรุณาสร้างคำร้องใหม่หากจำเป็น
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        {shouldShowReviewerComments && (
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-500" aria-hidden="true" />
              <div className="space-y-3">
                <p className="font-semibold text-orange-800">คำแนะนำจากผู้ตรวจสอบ</p>
                <div>
                  <p className="text-xs uppercase tracking-wide text-orange-600">เจ้าหน้าที่</p>
                  <p className="whitespace-pre-wrap text-sm">{adminCommentDisplay}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-orange-600">หัวหน้าภาค/ผู้บังคับบัญชา</p>
                  <p className="whitespace-pre-wrap text-sm">{headCommentDisplay}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        {isReadOnly && (
          <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800">
            ขณะนี้เป็นโหมด <strong>อ่านอย่างเดียว</strong> — ไม่สามารถแก้ไขหรือส่งคำร้องได้
          </div>
        )}
        <fieldset disabled={isReadOnly} aria-disabled={isReadOnly} className="space-y-6">
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
                {currentUser ? `${currentUser.prefix} ${currentUser.user_fname} ${currentUser.user_lname}` : 'กำลังโหลด...'}
              </div>
            </div>

            {/* Budget Year */}
            <div id="field-year_id">
              <label
                htmlFor={enforceBudgetYearReadOnly ? 'year_id_display' : 'year_id'}
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                ปีงบประมาณ (Budget Year) <span className="text-red-500">*</span>
              </label>
              {enforceBudgetYearReadOnly ? (
                <>
                  <input
                    type="hidden"
                    id="year_id"
                    name="year_id"
                    value={formData.year_id ?? ''}
                  />
                  <div
                    id="year_id_display"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700"
                  >
                    {budgetYearText || 'ยังไม่กำหนดปีงบประมาณ'}
                  </div>
                  {errors.year_id && (
                    <p id="error-year_id" className="text-red-500 text-sm mt-1">{errors.year_id}</p>
                  )}
                </>
              ) : (
                <>
                  <select
                    id="year_id"
                    name="year_id"
                    value={formData.year_id || ''}
                    onChange={handleInputChange}
                    disabled={isReadOnly || Boolean(lockedBudgetYearId)}
                    required
                    aria-required="true"
                    aria-invalid={errors.year_id ? 'true' : 'false'}
                    aria-describedby={errors.year_id ? 'error-year_id' : undefined}
                    className={`w-full text-gray-600 px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500 ${
                      errors.year_id ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="" disabled={formData.year_id !== '' && formData.year_id !== null} hidden={formData.year_id !== '' && formData.year_id !== null}>
                      เลือกปีงบประมาณ (Select Budget Year)
                    </option>
                    {years.map(year => {
                      const optionKey = String(year?.year_id ?? year?.YearID ?? year?.id ?? '');
                      const selectedKey = formData.year_id != null ? String(formData.year_id) : null;
                      const lockedKey = lockedBudgetYearId != null ? String(lockedBudgetYearId) : null;
                      const enforceLock = lockedKey && (!selectedKey || selectedKey === lockedKey);
                      const isLockedMismatch = enforceLock && optionKey !== lockedKey;
                      const outsideEnabled = optionKey
                        ? (enabledYears.length > 0 && !enabledYears.includes(optionKey) && optionKey !== selectedKey)
                        : false;
                      const isDisabled = Boolean(isLockedMismatch || outsideEnabled);

                      return (
                        <option
                          key={year.year_id}
                          value={year.year_id}
                          disabled={isDisabled}
                        >
                          ปีงบประมาณ {year.year}
                        </option>
                      );
                    })}
                  </select>
                  {errors.year_id && (
                    <p id="error-year_id" className="text-red-500 text-sm mt-1">{errors.year_id}</p>
                  )}
                </>
              )}
            </div>

            {/* Author Status */}
            <div id="field-author_status">
              <label htmlFor="author_status" className="block text-sm font-medium text-gray-700 mb-2">
                ประเภทผู้ประพันธ์ (Author Type) <span className="text-red-500">*</span>
              </label>
              <select
                id="author_status"
                name="author_status"
                value={formData.author_status}
                onChange={handleInputChange}
                disabled={disableAuthorStatusSelect}
                required
                aria-required="true"
                aria-invalid={errors.author_status ? 'true' : 'false'}
                aria-describedby={errors.author_status ? 'error-author_status' : undefined}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500 ${
                  errors.author_status ? 'border-red-500' : 'border-gray-300'
                } ${disableAuthorStatusSelect ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              >
                <option value="" disabled={formData.author_status !== ''} hidden={formData.author_status !== ''}>
                  เลือกประเภทผู้ประพันธ์ (Select Author Type)
                </option>
                {authorStatusOptions
                  .filter(option => option.value !== 'co_author')
                  .map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
              </select>
              {errors.author_status && (
                <p id="error-author_status" className="text-red-500 text-sm mt-1">{errors.author_status}</p>
              )}
            </div>

            {/* Phone Number */}
            <div id="field-phone_number">
              <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-2">
                เบอร์โทรศัพท์ (Phone Number) <span className="text-red-500">*</span>
              </label>
              <input
                id="phone_number"
                type="tel"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleInputChange}
                onKeyDown={handlePhoneKeyDown}
                placeholder="081-234-5678"
                maxLength="12"
                required
                aria-required="true"
                aria-invalid={errors.phone_number ? 'true' : 'false'}
                aria-describedby={errors.phone_number ? 'error-phone_number' : undefined}
                pattern="\d{3}-\d{3}-\d{4}"
                data-pattern-message="กรุณากรอกเบอร์โทรศัพท์ให้เป็นรูปแบบ XXX-XXX-XXXX"
                inputMode="tel"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500 ${
                  errors.phone_number ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              <p className="text-xs text-gray-500 mt-1">รูปแบบ (Format): XXX-XXX-XXXX</p>
              {errors.phone_number && (
                <p id="error-phone_number" className="text-red-500 text-sm mt-1">{errors.phone_number}</p>
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
              <label htmlFor="article_title" className="block text-sm font-medium text-gray-700 mb-2">
                ชื่อบทความ (Article Title) <span className="text-red-500">*</span>
              </label>
              <input
                id="article_title"
                type="text"
                name="article_title"
                value={formData.article_title}
                onChange={handleInputChange}
                placeholder="กรอกชื่อบทความภาษาอังกฤษ (Enter article title in English)"
                required
                aria-required="true"
                aria-invalid={errors.article_title ? 'true' : 'false'}
                aria-describedby={errors.article_title ? 'error-article_title' : undefined}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500 ${
                  errors.article_title ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.article_title && (
                <p id="error-article_title" className="text-red-500 text-sm mt-1">{errors.article_title}</p>
              )}
            </div>

            <div id="field-author_name_list">
              <label htmlFor="author_name_list" className="block text-sm font-medium text-gray-700 mb-2">
                รายชื่อผู้แต่ง (Author Name List) <span className="text-red-500">*</span>
              </label>
              <textarea
                id="author_name_list"
                name="author_name_list"
                value={formData.author_name_list}
                onChange={handleInputChange}
                rows={3}
                placeholder="กรอกรายชื่อผู้แต่งตามลำดับ (Enter author names in order)"
                required
                aria-required="true"
                aria-invalid={errors.author_name_list ? 'true' : 'false'}
                aria-describedby={errors.author_name_list ? 'error-author_name_list' : undefined}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500 ${
                  errors.author_name_list ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.author_name_list && (
                <p id="error-author_name_list" className="text-red-500 text-sm mt-1">{errors.author_name_list}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Journal Name */}
              <div id="field-journal_name">
                <label htmlFor="journal_name" className="block text-sm font-medium text-gray-700 mb-2">
                  ชื่อวารสาร (Journal Name) <span className="text-red-500">*</span>
                </label>
                <input
                  id="journal_name"
                  type="text"
                  name="journal_name"
                  value={formData.journal_name}
                  onChange={handleInputChange}
                  disabled={disableJournalNameInput}
                  placeholder="ชื่อวารสารที่ตีพิมพ์ (Journal name)"
                  required
                  aria-required="true"
                  aria-invalid={errors.journal_name ? 'true' : 'false'}
                  aria-describedby={errors.journal_name ? 'error-journal_name' : undefined}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500 ${
                    errors.journal_name ? 'border-red-500' : 'border-gray-300'
                  } ${disableJournalNameInput ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                />
                {errors.journal_name && (
                  <p id="error-journal_name" className="text-red-500 text-sm mt-1">{errors.journal_name}</p>
                )}
              </div>

              {/* Quartile */}
              <div id="field-journal_quartile">
                <label htmlFor="journal_quartile" className="block text-sm font-medium text-gray-700 mb-2">
                  ควอร์ไทล์ (Quartile) <span className="text-red-500">*</span>
                </label>
                <select
                  id="journal_quartile"
                  name="journal_quartile"
                  value={formData.journal_quartile}
                  onChange={handleInputChange}
                  disabled={disableQuartileSelect}
                  required={!selectionLocked}
                  aria-required="true"
                  aria-invalid={errors.journal_quartile ? 'true' : 'false'}
                  aria-describedby={[
                    errors.journal_quartile ? 'error-journal_quartile' : null,
                    displayResolutionError ? 'resolution-journal_quartile' : null
                  ].filter(Boolean).join(' ') || undefined}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500 ${
                    errors.journal_quartile ? 'border-red-500' : 'border-gray-300'
                  } ${disableQuartileSelect ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
                  <p id="error-journal_quartile" className="text-red-500 text-sm mt-1">{errors.journal_quartile}</p>
                )}
                {displayResolutionError && (
                  <p id="resolution-journal_quartile" className="text-red-500 text-sm mt-1">{displayResolutionError}</p>
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
                <label htmlFor="journal_month" className="block text-sm font-medium text-gray-700 mb-2">
                  เดือนที่ตีพิมพ์ (Publication Month) <span className="text-red-500">*</span>
                </label>
                <select
                  id="journal_month"
                  name="journal_month"
                  value={formData.journal_month}
                  onChange={handleInputChange}
                  required
                  aria-required="true"
                  aria-invalid={errors.journal_month ? 'true' : 'false'}
                  aria-describedby={errors.journal_month ? 'error-journal_month' : undefined}
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
                  <p id="error-journal_month" className="text-red-500 text-sm mt-1">{errors.journal_month}</p>
                )}
              </div>

              {/* Publication Year */}
              <div id="field-journal_year">
                <label htmlFor="journal_year" className="block text-sm font-medium text-gray-700 mb-2">
                  ปีที่ตีพิมพ์ (Publication Year) <span className="text-red-500">*</span>
                </label>
                <input
                  id="journal_year"
                  type="number"
                  name="journal_year"
                  value={formData.journal_year}
                  onChange={handleInputChange}
                  placeholder={new Date().getFullYear().toString()}
                  min="2000"
                  max={new Date().getFullYear() + 1}
                  required
                  aria-required="true"
                  aria-invalid={errors.journal_year ? 'true' : 'false'}
                  aria-describedby={errors.journal_year ? 'error-journal_year' : undefined}
                  data-range-message={`กรุณากรอกปีระหว่าง 2000-${new Date().getFullYear() + 1}`}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500 ${
                    errors.journal_year ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <p className="text-xs text-gray-500 mt-1">ปี ค.ศ. (A.D.) (2000-{new Date().getFullYear() + 1})</p>
                {errors.journal_year && (
                  <p id="error-journal_year" className="text-red-500 text-sm mt-1">{errors.journal_year}</p>
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
                  const selectedId = e.target.value;
                  if (selectedId) {
                    const user = users.find((candidate) => {
                      const candidateId = getNormalizedUserId(candidate);
                      return candidateId != null && candidateId === selectedId;
                    });
                    if (user) {
                      handleAddCoauthor(user);
                      e.target.value = '';
                    }
                  }
                }}
              >
                <option value="">เลือกผู้ร่วมวิจัย... (Select Co-Author...)</option>
                {users
                  .filter(user => {
                    const normalizedUserId = getNormalizedUserId(user);
                    if (!normalizedUserId) {
                      return false;
                    }

                    if (currentUser) {
                      const currentUserId = getNormalizedUserId(currentUser);
                      if (currentUserId && currentUserId === normalizedUserId) {
                        return false;
                      }
                    }

                    return !coauthors.some((coauthor) => {
                      const coauthorId = getNormalizedUserId(coauthor);
                      return coauthorId && coauthorId === normalizedUserId;
                    });
                  })
                  .map(user => {
                    const normalizedUserId = getNormalizedUserId(user);
                    const nameParts = resolveUserNameParts(user);
                    const fallbackName = `${nameParts.firstName || ''} ${nameParts.lastName || ''}`.trim();
                    const labelName = nameParts.displayName || fallbackName;
                    const optionLabel = labelName || user.user_fname || user.user_lname || 'ไม่ทราบชื่อ';
                    return (
                      <option
                        key={normalizedUserId || `user-${user.user_id}`}
                        value={normalizedUserId || ''}
                      >
                        {optionLabel}{user.email ? ` (${user.email})` : ''}
                      </option>
                    );
                  })}
              </select>
            </div>

            {/* Available co-authors count */}
            <p className="text-xs text-gray-500">
              สามารถเลือกได้ (Available): {users.filter((u) => {
                const normalizedUserId = getNormalizedUserId(u);
                if (!normalizedUserId) {
                  return false;
                }

                if (currentUser) {
                  const currentUserId = getNormalizedUserId(currentUser);
                  if (currentUserId && currentUserId === normalizedUserId) {
                    return false;
                  }
                }

                return !coauthors.some((c) => {
                  const coauthorId = getNormalizedUserId(c);
                  return coauthorId && coauthorId === normalizedUserId;
                });
              }).length} คน (persons)
            </p>

            {/* Selected co-authors list */}
            {coauthors.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ผู้ร่วมวิจัยที่เลือก (Selected Co-researchers) ({coauthors.length} คน/persons)
                </label>
                <div className="space-y-2">
                  {coauthors.map((coauthor, index) => {
                    const { name, email } = getCoauthorDisplayInfo(coauthor);
                    const resolvedName = name || `${coauthor.user_fname || ''} ${coauthor.user_lname || ''}`.trim() || 'ไม่ทราบชื่อ';

                    return (
                      <div
                        key={getNormalizedUserId(coauthor) || coauthor.user_id || `coauthor-${index}`}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-medium text-gray-600">
                            {index + 1}.
                          </span>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {resolvedName}
                            </p>
                            {email && (
                              <p className="text-xs text-gray-500">
                                {email}
                              </p>
                            )}
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
                    );
                  })}
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
                      const rawValue = e.target.value;
                      const newValue = clampCurrencyValue(rawValue);
                      setFormData(prev => ({ ...prev, revision_fee: newValue }));

                      // Validate fees in real-time
                      await validateFeesRealtime(newValue, formData.publication_fee, formData.journal_quartile, feeLimits.total, setFeeError);
                    }}
                    disabled={!formData.journal_quartile || feeLimits.total === 0}
                    min="0"
                    max={MAX_CURRENCY_AMOUNT}
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
                      const rawValue = e.target.value;
                      const newValue = clampCurrencyValue(rawValue);
                      setFormData(prev => ({ ...prev, publication_fee: newValue }));

                      // Validate fees in real-time
                      await validateFeesRealtime(formData.revision_fee, newValue, formData.journal_quartile, feeLimits.total, setFeeError);
                    }}
                    disabled={!formData.journal_quartile || feeLimits.total === 0}
                    min="0"
                    max={MAX_CURRENCY_AMOUNT}
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
                    {!allowExternalFunding ? (
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
                        <tr key={funding.clientId || index} className={index < externalFundings.length - 1 ? 'border-b border-blue-200' : ''}>
                          <td className="border-r border-blue-200 px-3 py-2 text-center text-sm">
                            {index + 1}
                          </td>
                          <td className="border-r border-blue-200 px-3 py-2 text-sm">
                            {(() => {
                              const serverDoc = serverExternalFundingFiles.find(
                                (doc) => {
                                  if (!doc) return false;
                                  if (funding.serverDocumentId) {
                                    if (String(doc.document_id) === String(funding.serverDocumentId)) {
                                      return true;
                                    }
                                  }
                                  if (doc.funding_client_id && funding.clientId) {
                                    if (String(doc.funding_client_id) === String(funding.clientId)) {
                                      return true;
                                    }
                                  }
                                  if (doc.external_funding_id != null && funding.externalFundId != null) {
                                    return String(doc.external_funding_id) === String(funding.externalFundId);
                                  }
                                  return false;
                                }
                              );
                              const uploadInputId = `external-funding-upload-${funding.clientId || index}`;
                              const fundingPendingReason = funding.serverDocumentPendingRemovalReason || null;

                              const previewNewFile = () => {
                                if (!funding.file) {
                                  return;
                                }
                                const objectUrl = URL.createObjectURL(funding.file);
                                const opened = window.open(objectUrl, '_blank', 'noopener,noreferrer');
                                setTimeout(() => {
                                  URL.revokeObjectURL(objectUrl);
                                }, 1500);
                                if (!opened) {
                                  Toast.fire({ icon: 'info', title: 'โปรดอนุญาตให้เบราว์เซอร์เปิดหน้าต่างใหม่เพื่อดูไฟล์' });
                                }
                              };

                              const effectiveDoc = serverDoc
                                ? {
                                    ...serverDoc,
                                    pendingRemoval: serverDoc.pendingRemoval ?? Boolean(fundingPendingReason),
                                    pendingRemovalReason:
                                      serverDoc.pendingRemovalReason ?? fundingPendingReason ?? null,
                                  }
                                : {
                                    document_id: funding.serverDocumentId ?? null,
                                    file_id: funding.serverFileId ?? null,
                                    original_name:
                                      funding.serverFileName || (funding.serverDocumentId ? 'ไฟล์จากระบบ' : null),
                                    document_type_id: 12,
                                    document_type_name: 'เอกสารเบิกจ่ายภายนอก',
                                    pendingRemoval: Boolean(fundingPendingReason && funding.serverDocumentId),
                                    pendingRemovalReason: fundingPendingReason,
                                    funding_client_id: funding.clientId ?? null,
                                  };

                              const hasServerFile = Boolean(
                                effectiveDoc.document_id ||
                                effectiveDoc.file_id ||
                                effectiveDoc.original_name
                              );

                              const pendingReason = effectiveDoc.pendingRemovalReason ?? null;
                              const isPendingReplace = pendingReason === 'replace';
                              const isPendingRemove = pendingReason === 'remove';
                              const highlightClass = isPendingRemove
                                ? 'border-red-200 bg-red-50 text-red-700'
                                : isPendingReplace
                                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                                  : 'border-blue-200 bg-blue-50 text-blue-800';
                              const statusMessage = isPendingReplace
                                ? 'ไฟล์นี้จะถูกแทนที่เมื่อบันทึก'
                                : isPendingRemove
                                  ? 'ไฟล์นี้จะถูกลบเมื่อบันทึก'
                                  : hasServerFile
                                    ? 'ไฟล์จากระบบ'
                                    : 'ยังไม่มีไฟล์จากระบบ';
                              const replaceLabel = funding.file
                                ? 'เปลี่ยนไฟล์'
                                : hasServerFile
                                  ? 'แทนที่ไฟล์'
                                  : 'แนบไฟล์';

                              return (
                                <div className="space-y-3">
                                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="flex-1">
                                      <input
                                        type="text"
                                        value={funding.fundName}
                                        onChange={(e) => handleExternalFundingChange(funding.clientId, 'fundName', e.target.value)}
                                        placeholder="กรอกชื่อทุน (Enter fund name)"
                                        className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                      />
                                      <p className="mt-1 text-xs text-gray-500">
                                        โปรดระบุชื่อแหล่งทุนและแนบไฟล์หลักฐานเป็น PDF
                                      </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <label
                                        htmlFor={uploadInputId}
                                        className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
                                      >
                                        <input
                                          id={uploadInputId}
                                          type="file"
                                          accept=".pdf"
                                          onChange={(e) => handleExternalFundingFileChange(funding.clientId, e.target.files?.[0] || null)}
                                          className="hidden"
                                        />
                                        <Upload className="h-4 w-4" />
                                        <span>{replaceLabel}</span>
                                      </label>
                                      {funding.file && (
                                        <button
                                          type="button"
                                          onClick={() => handleClearExternalFundingUpload(funding.clientId)}
                                          className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-3 py-1.5 text-xs text-gray-600 transition hover:bg-gray-100"
                                        >
                                          ลบไฟล์ใหม่
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveExternalFunding(funding.clientId)}
                                        className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 transition hover:bg-red-100"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                        <span>ลบรายการ</span>
                                      </button>
                                    </div>
                                  </div>

                                  {funding.file && (
                                    <div className="flex flex-col gap-2 rounded border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700 sm:flex-row sm:items-center sm:justify-between">
                                      <div className="flex items-center gap-2">
                                        <FileText className="h-3 w-3" />
                                        <span>{funding.file.name}</span>
                                        <span className="font-semibold text-green-600">ไฟล์ใหม่ (รออัปโหลด)</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={previewNewFile}
                                          className="text-green-600 hover:text-green-800"
                                        >
                                          ดูไฟล์
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleClearExternalFundingUpload(funding.clientId)}
                                          className="text-gray-600 hover:text-gray-800"
                                        >
                                          ยกเลิกไฟล์ใหม่
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {hasServerFile ? (
                                    <div className={`flex flex-col gap-2 rounded border px-3 py-2 text-xs sm:flex-row sm:items-center sm:justify-between ${highlightClass}`}>
                                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                                        <div className="flex items-center gap-2">
                                          <FileText className="h-3.5 w-3.5" />
                                          <span>{effectiveDoc.original_name || effectiveDoc.document_type_name || 'ไฟล์จากระบบ'}</span>
                                        </div>
                                        <span className="text-xs font-medium">{statusMessage}</span>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        {effectiveDoc.file_id ? (
                                          <button
                                            type="button"
                                            onClick={() => handleDownloadDocument(effectiveDoc)}
                                            className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50"
                                          >
                                            <Download className="h-3.5 w-3.5" />
                                            <span>ดาวน์โหลด</span>
                                          </button>
                                        ) : (
                                          <span className="text-xs text-gray-500">ไม่พบไฟล์ในระบบ</span>
                                        )}
                                        {isPendingRemove ? (
                                          <button
                                            type="button"
                                            onClick={() => handleRestoreExternalFundingFile(funding.clientId)}
                                            className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
                                          >
                                            <Undo2 className="h-3.5 w-3.5" />
                                            <span>ยกเลิก</span>
                                          </button>
                                        ) : (
                                          effectiveDoc.document_id && (
                                            <button
                                              type="button"
                                              onClick={() => handleRemoveExternalFundingFile(funding.clientId)}
                                              className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-600 transition hover:bg-red-100"
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
                                              <span>ลบไฟล์เดิม</span>
                                            </button>
                                          )
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="rounded border border-dashed border-gray-300 px-3 py-2 text-xs text-gray-500">
                                      <span>ยังไม่มีไฟล์จากระบบ</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="px-3 py-2">
                          <input
                            type="number"
                            value={funding.amount}
                            onChange={(e) => handleExternalFundingChange(funding.clientId, 'amount', e.target.value)}
                            placeholder="0"
                            min="0"
                            max={MAX_CURRENCY_AMOUNT}
                            disabled={!allowExternalFunding}
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
                  disabled={!allowExternalFunding}
                  className={`flex items-center gap-2 px-5 py-2 rounded-full transition-colors text-sm font-medium ${
                    !allowExternalFunding
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                  title={
                    !allowExternalFunding
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
                  {formatCurrency(
                    allowExternalFunding
                      ? (externalFundings || []).reduce((sum, funding) => sum + (parseFloat(funding?.amount || 0)), 0)
                      : 0
                  )}
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
              <label htmlFor="bank_account" className="block text-sm font-medium text-gray-700 mb-2">
                เลขบัญชีธนาคาร (Bank Account Number) <span className="text-red-500">*</span>
              </label>
              <input
                id="bank_account"
                type="text"
                name="bank_account"
                value={formData.bank_account}
                onChange={handleInputChange}
                placeholder="กรอกเลขบัญชี (Enter account number)"
                maxLength="15"
                inputMode="numeric"
                pattern="\d{10,15}"
                required
                aria-required="true"
                aria-invalid={errors.bank_account ? 'true' : 'false'}
                aria-describedby={errors.bank_account ? 'error-bank_account' : undefined}
                data-pattern-message="เลขบัญชีธนาคารต้องเป็นตัวเลข 10-15 หลัก"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500 ${
                  errors.bank_account ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              <p className="text-xs text-gray-500 mt-1">กรอกเฉพาะตัวเลข 10-15 หลัก (Enter 10-15 digits only)</p>
              {errors.bank_account && (
                <p id="error-bank_account" className="text-red-500 text-sm mt-1">{errors.bank_account}</p>
              )}
            </div>

            {/* Bank Account Name */}
            <div id="field-bank_account_name">
              <label htmlFor="bank_account_name" className="block text-sm font-medium text-gray-700 mb-2">
                ชื่อบัญชีธนาคาร (Account Holder Name) <span className="text-red-500">*</span>
              </label>
              <input
                id="bank_account_name"
                type="text"
                name="bank_account_name"
                value={formData.bank_account_name}
                onChange={handleInputChange}
                placeholder="ชื่อ-นามสกุลเจ้าของบัญชี"
                required
                aria-required="true"
                aria-invalid={errors.bank_account_name ? 'true' : 'false'}
                aria-describedby={errors.bank_account_name ? 'error-bank_account_name' : undefined}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500 ${
                  errors.bank_account_name ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.bank_account_name && (
                <p id="error-bank_account_name" className="text-red-500 text-sm mt-1">{errors.bank_account_name}</p>
              )}
            </div>

            {/* Bank Name */}
            <div id="field-bank_name">
              <label htmlFor="bank_name" className="block text-sm font-medium text-gray-700 mb-2">
                ชื่อธนาคาร (Bank Name) <span className="text-red-500">*</span>
              </label>
              <input
                id="bank_name"
                type="text"
                name="bank_name"
                value={formData.bank_name}
                onChange={handleInputChange}
                placeholder="เช่น ธนาคารกรุงเทพ (e.g. Bangkok Bank)"
                required
                aria-required="true"
                aria-invalid={errors.bank_name ? 'true' : 'false'}
                aria-describedby={errors.bank_name ? 'error-bank_name' : undefined}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500 ${
                  errors.bank_name ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.bank_name && (
                <p id="error-bank_name" className="text-red-500 text-sm mt-1">{errors.bank_name}</p>
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
                    const pendingOtherDocs = (serverDocuments || []).filter(
                      (doc) => doc.document_type_id === parseIntegerOrNull(docType.id)
                    );

                    return (
                      <div key={docType.id} className="border border-gray-200 rounded-lg p-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          เอกสารอื่นๆ (Other Documents) (ถ้ามี/if any)
                        </label>

                        {pendingOtherDocs.length > 0 && (
                          <div className="mb-3 space-y-2">
                            {pendingOtherDocs.map((doc) => {
                              const pendingMessage =
                                doc.pendingRemovalReason === 'replace'
                                  ? 'ไฟล์นี้จะถูกแทนที่เมื่อบันทึก'
                                  : 'ไฟล์นี้จะถูกลบเมื่อบันทึก';
                              return (
                                <div
                                  key={doc.document_id}
                                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3"
                                >
                                  <div>
                                    <p className="text-sm font-medium text-gray-700">
                                      {doc.original_name || doc.document_type_name || 'ไฟล์จากระบบ'}
                                    </p>
                                    <p className={`text-xs mt-1 ${doc.pendingRemoval ? 'text-red-600' : 'text-gray-500'}`}>
                                      {doc.pendingRemoval ? pendingMessage : 'ไฟล์จากระบบ'}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleDownloadDocument(doc)}
                                      className="text-blue-600 hover:text-blue-800"
                                    >
                                      ดาวน์โหลด
                                    </button>
                                    {doc.pendingRemoval ? (
                                      <button
                                        type="button"
                                        onClick={() => unmarkDocumentRemoval(doc.document_id)}
                                        className="text-gray-600 hover:text-gray-800"
                                      >
                                        ยกเลิก
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => markDocumentForRemoval(doc.document_id, 'remove')}
                                        className="text-red-500 hover:text-red-700"
                                      >
                                        ลบ
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

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
                  if (Number(docType.id) === 12) {
                    return (
                      <div key={docType.id} className="border border-gray-200 rounded-lg p-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          เอกสารเบิกจ่ายภายนอก (External Funding Documents)
                        </label>

                        {serverExternalFundingFiles.length > 0 && (
                          <div className="mb-3 space-y-2">
                            {serverExternalFundingFiles.map((doc) => {
                              const pendingMessage =
                                doc.pendingRemovalReason === 'replace'
                                  ? 'ไฟล์นี้จะถูกแทนที่เมื่อบันทึก'
                                  : 'ไฟล์นี้จะถูกลบเมื่อบันทึก';
                              return (
                                <div
                                  key={doc.document_id}
                                  className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-3"
                                >
                                  <div>
                                    <p className="text-sm font-medium text-blue-800">
                                      {doc.original_name || 'ไฟล์จากระบบ'}
                                    </p>
                                    <p className={`text-xs mt-1 ${doc.pendingRemoval ? 'text-red-600' : 'text-blue-600'}`}>
                                      {doc.pendingRemoval ? pendingMessage : 'ไฟล์จากระบบ'}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleDownloadDocument(doc)}
                                      className="text-blue-600 hover:text-blue-800"
                                    >
                                      ดาวน์โหลด
                                    </button>
                                    {doc.pendingRemoval ? (
                                      <button
                                        type="button"
                                        onClick={() => handleRestoreExternalFundingFile(doc.funding_client_id)}
                                        className="text-gray-600 hover:text-gray-800"
                                      >
                                        ยกเลิก
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveExternalFundingFile(doc.funding_client_id)}
                                        className="text-red-500 hover:text-red-700"
                                      >
                                        ลบ
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {externalFundingFiles && externalFundingFiles.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-600">
                              ไฟล์จากตารางทุนภายนอก ({externalFundingFiles.length} ไฟล์):
                            </p>
                            {externalFundingFiles.map((doc) => (
                              <div key={`ext-${doc.funding_client_id}`} className="flex items-center justify-between bg-blue-50 rounded-lg p-2">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-blue-600" />
                                  <div className="flex-1">
                                    <span className="text-sm text-gray-700">{doc.file.name}</span>
                                    <span className="text-xs text-gray-500 ml-2">
                                      {(doc.file.size / 1024 / 1024).toFixed(2)} MB
                                    </span>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const url = URL.createObjectURL(doc.file);
                                      window.open(url, '_blank');
                                    }}
                                    className="text-blue-500 hover:text-blue-700"
                                    title="ดูไฟล์"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setExternalFundingFiles((prev) => prev.filter((file) => file !== doc))}
                                    className="text-red-500 hover:text-red-700"
                                    title="ลบไฟล์"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 bg-gray-50 rounded-lg">
                            <FileText className="mx-auto h-6 w-6 text-gray-400 mb-2" />
                            <p className="text-sm text-gray-500">
                              ไฟล์จะแสดงอัตโนมัติเมื่อแนบในตารางทุนภายนอก
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              (Files will appear automatically when attached in external funding table)
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  }
                  
                  // Regular document types (ไม่เปลี่ยนแปลง)
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

                  const serverDocsForType = (serverDocuments || []).filter(
                    (doc) => doc.document_type_id === parseIntegerOrNull(docType.id)
                  );
                  const primaryServerDoc = serverDocsForType.find((doc) => !doc.pendingRemoval) || serverDocsForType[0] || null;
                  const remainingServerDocs = primaryServerDoc
                    ? serverDocsForType.filter((doc) => doc !== primaryServerDoc)
                    : [];

                  // Regular document types
                  return (
                    <div key={docType.id} id={`file-upload-${docType.id}`} className="border border-gray-200 rounded-lg p-4">
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
                        existingFile={primaryServerDoc}
                        onDownloadExisting={handleDownloadDocument}
                        onRemoveExisting={(doc) => markDocumentForRemoval(doc.document_id, 'remove')}
                        onRestoreExisting={(doc) => unmarkDocumentRemoval(doc.document_id)}
                      />

                      {remainingServerDocs.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {remainingServerDocs.map((doc) => {
                            const pendingReason = doc.pendingRemovalReason || null;
                            const isPendingReplace = pendingReason === 'replace';
                            const isPendingRemove = pendingReason === 'remove';
                            const highlightClass = isPendingRemove
                              ? 'border-red-200 bg-red-50 text-red-700'
                              : isPendingReplace
                                ? 'border-amber-200 bg-amber-50 text-amber-700'
                                : 'border-blue-200 bg-blue-50 text-blue-800';
                            const statusMessage = isPendingReplace
                              ? 'ไฟล์นี้จะถูกแทนที่เมื่อบันทึก'
                              : isPendingRemove
                                ? 'ไฟล์นี้จะถูกลบเมื่อบันทึก'
                                : 'ไฟล์จากระบบ';
                            return (
                              <div
                                key={doc.document_id}
                                className={`flex flex-col gap-3 rounded-lg border ${highlightClass} p-4`}
                              >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                  <div className="flex items-start gap-3">
                                    <FileText className="mt-0.5 h-5 w-5 flex-shrink-0" />
                                    <div>
                                      <p className="text-sm font-medium">
                                        {doc.original_name || doc.document_type_name || 'ไฟล์จากระบบ'}
                                      </p>
                                      <p className="text-xs font-medium">{statusMessage}</p>
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleDownloadDocument(doc)}
                                      className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50"
                                    >
                                      <Download className="h-3.5 w-3.5" />
                                      <span>ดาวน์โหลด</span>
                                    </button>
                                    {isPendingRemove ? (
                                      <button
                                        type="button"
                                        onClick={() => unmarkDocumentRemoval(doc.document_id)}
                                        className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
                                      >
                                        <Undo2 className="h-3.5 w-3.5" />
                                        <span>ยกเลิก</span>
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => markDocumentForRemoval(doc.document_id, 'remove')}
                                        className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-600 transition hover:bg-red-100"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        <span>ลบ</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
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

            <div ref={previewSectionRef} className="border-t border-gray-200 pt-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <button
                  type="button"
                  onClick={() => generatePreview()}
                  disabled={previewState.loading || attachedFiles.length === 0}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {previewState.loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  {previewState.loading ? 'กำลังสร้างตัวอย่าง...' : 'ดูตัวอย่างเอกสารรวม'}
                </button>

                <div className="text-sm text-gray-500">
                  รวมไฟล์ทั้งหมด {attachedFiles.length} ไฟล์
                </div>
              </div>

              {!previewState.loading && attachedFiles.length === 0 && (
                <p className="mt-2 text-sm text-gray-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-gray-400" />
                  กรุณาแนบไฟล์ก่อนดูตัวอย่างเอกสาร
                </p>
              )}

              {previewState.error && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {previewState.error}
                </p>
              )}

              {previewState.hasPreviewed && previewUrl && (
                <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">ดูตัวอย่างล่าสุดเมื่อ {formatPreviewTimestamp(previewState.timestamp) || '—'}</p>
                      <p className="text-xs text-blue-600">สามารถเปิดหรือดาวน์โหลดเอกสารจากลิงก์ด้านล่าง</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (previewUrl) {
                            window.open(previewUrl, '_blank', 'noopener,noreferrer');
                          }
                        }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                      >
                        <Eye className="h-4 w-4" />
                        เปิดอีกครั้ง
                      </button>
                      <a
                        href={previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={previewState.blobUrl ? 'publication_reward_preview.pdf' : undefined}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white text-blue-700 border border-blue-300 hover:bg-blue-100"
                      >
                        ⬇️ ดาวน์โหลด
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {previewState.hasPreviewed && previewUrl && (
                <div className="mt-4">
                  <div className="mb-6">
                    <iframe
                      title="Publication Reward Preview"
                      src={previewUrl}
                      className="w-full h-[85vh] border rounded"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    หากเอกสารไม่แสดงผล กรุณาใช้ปุ่มเปิดหรือดาวน์โหลดด้านบน
                  </p>
                </div>
              )}
            </div>
          </div>
        </SimpleCard>

        {/* =================================================================
        // ADDITIONAL INFORMATION SECTION
        // ================================================================= */}
        <SimpleCard title="ข้อมูลเพิ่มเติม (Additional Information)" icon={FileText}>
          <div className="space-y-4">
            {/* University funding — checkbox under question; inline field when checked */}
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ได้รับการสนับสนุนทุนจากมหาวิทยาลัยขอนแก่นหรือไม่?
              <br />
              <span className="text-xs font-normal text-gray-600">
                (Did you receive funding support from the Khon Kaen University?)
              </span>
            </label>

            <div className="flex flex-wrap items-center gap-4 rounded-lg border border-gray-200 p-4">
              {/* Checkbox */}
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-blue-600"
                  checked={formData.has_university_fund === 'yes'}
                  onChange={(e) =>
                    setFormData(prev => ({
                      ...prev,
                      has_university_fund: e.target.checked ? 'yes' : 'no',
                      // ถ้ายกเลิกติ๊กให้ล้างค่า:
                      university_fund_ref: e.target.checked ? (prev.university_fund_ref || '') : ''
                    }))
                  }
                />
                <span className="text-sm text-gray-700">
                  {formData.has_university_fund === 'yes' ? 'ได้รับ (Yes)' : 'ไม่ได้รับ (No)'}
                </span>
              </label>

              {/* Inline field (same row; จะห่อบรรทัดเมื่อจอแคบ) */}
              {formData.has_university_fund === 'yes' && (
                <div className="flex items-center gap-2 flex-1 min-w-[260px]">
                  <input
                    id="university_fund_ref"
                    type="text"
                    name="university_fund_ref"
                    value={formData.university_fund_ref}
                    onChange={handleInputChange}
                    placeholder="กรอกหมายเลขอ้างอิงทุน (Enter fund reference number)"
                    className="w-full min-w-0 px-4 py-2 rounded-lg border border-gray-300
                              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                              placeholder:text-gray-400"
                  />
                </div>
              )}
            </div>

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

        <SimpleCard title="การยืนยันและลายเซ็น" icon={Signature}>
          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-4">
                ข้าพเจ้าขอรับรองว่า
              </p>
              {termsLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลดเงื่อนไข/ข้อตกลง...
                </div>
              ) : termsError ? (
                <p className="text-sm text-red-600">{termsError}</p>
              ) : endOfContractTerms.length === 0 ? (
                <p className="text-sm text-gray-500">ยังไม่มีเงื่อนไข/ข้อตกลงให้ยืนยัน</p>
              ) : isReadOnly ? (
                <ol className="list-decimal space-y-2 pl-5 text-sm text-gray-700">
                  {endOfContractTerms.map((term) => (
                    <li
                      key={`reward-term-${term.eoc_id}`}
                      className="leading-relaxed whitespace-pre-line"
                    >
                      {term.content}
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="space-y-4">
                  {endOfContractTerms.map((term, index) => {
                    const key = String(
                      term.eoc_id ?? term.id ?? term.term_id ?? term.termId ?? term.termID ?? term.display_order ?? index,
                    );
                    const checked = Boolean(termAcknowledgements[key]);
                    return (
                      <div key={`reward-term-${key}`} className="flex items-start gap-3">
                        <input
                          id={`reward-term-${key}`}
                          type="checkbox"
                          className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                          checked={checked}
                          onChange={(e) =>
                            setTermAcknowledgements((prev) => ({
                              ...prev,
                              [key]: e.target.checked,
                            }))
                          }
                          disabled={isSubmitting}
                          aria-required="true"
                        />
                        <label
                          htmlFor={`reward-term-${key}`}
                          className="text-sm text-gray-700 leading-relaxed whitespace-pre-line"
                        >
                          <span className="font-semibold mr-1">{index + 1}.</span>
                          {term.content}
                        </label>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="signature" className="block text-sm font-medium text-gray-700 mb-2">
                ลงลายมือชื่อ (กรุณาพิมพ์ชื่อเต็ม) <span className="text-red-500">*</span>
              </label>
              <input
                id="signature"
                type="text"
                name="signature"
                value={formData.signature}
                onChange={handleInputChange}
                placeholder="กรอกชื่อ-นามสกุล"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500 ${
                  errors.signature ? 'border-red-500' : 'border-gray-300'
                }`}
                required
                aria-invalid={errors.signature ? 'true' : 'false'}
                aria-required="true"
                aria-describedby={errors.signature ? 'error-signature' : undefined}
              />
              {errors.signature && (
                <p id="error-signature" className="mt-1 text-sm text-red-500">{errors.signature}</p>
              )}
            </div>
          </div>
        </SimpleCard>

        {/* =================================================================
        // ACTION BUTTONS
        // ================================================================= */}
        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
          {showDraftActions && (
            <button
              type="button"
              onClick={deleteDraft}
              className="px-4 py-2 text-red-600 border border-red-300 rounded-md hover:bg-red-50"
            >
              <X className="h-4 w-4 inline mr-2" />
              ลบร่าง
            </button>
          )}

          {showDraftActions && (
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
          )}

          <button
            type="button"
            onClick={submitApplication}
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Send className="h-4 w-4" />
            )}
            {isSubmitting ? 'กำลังส่ง...' : 'ส่งคำร้อง'}
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
                <li>หลังจากส่งคำร้องแล้ว จะไม่สามารถแก้ไขข้อมูลบางส่วนได้</li>
                <li>สามารถบันทึกร่างและกลับมาแก้ไขภายหลังได้</li>
              </ul>
            </div>
          </div>
        </div>
      </fieldset>
      </form>
    </PageLayout>
  );
}

// =================================================================
// EXPORT COMPONENT
// =================================================================