// app/teacher/components/applications/GenericFundApplicationForm.js
"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { FileText, Upload, Save, Send, X, Eye, ArrowLeft, AlertCircle, DollarSign, Download, Info, Loader2 } from "lucide-react";
import Swal from "sweetalert2";
import PageLayout from "../common/PageLayout";
import SimpleCard from "../common/SimpleCard";
import { authAPI, systemAPI, documentTypesAPI } from '../../../lib/api';
import { fundInstallmentAPI } from '../../../lib/fund_installment_api';
import { notificationsAPI } from '../../../lib/notifications_api';
import { PDFDocument } from "pdf-lib";
import { useRouter } from "next/navigation";

// เพิ่ม apiClient สำหรับเรียก API โดยตรง
import apiClient from '../../../lib/api';
import { submissionAPI, documentAPI, fileAPI} from '../../../lib/member_api';
import { teacherAPI } from '../../../lib/teacher_api';
import { statusService } from '../../../lib/status_service';
import { systemConfigAPI } from '../../../lib/system_config_api';

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

// Match backend utils.StatusCodeDeptHeadPending for initial submission status
const DEPT_HEAD_PENDING_STATUS_CODE = '5';
const DEPT_HEAD_PENDING_STATUS_NAME_HINT = 'อยู่ระหว่างการพิจารณาจากหัวหน้าสาขา';

const DRAFT_KEY = 'generic_fund_application_draft';
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const EDITABLE_STATUS_CODES = new Set(['draft', 'needs_more_info']);

const MAX_CURRENCY_AMOUNT = 1_000_000;

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

const clampCurrencyValue = (rawValue) => {
  if (rawValue === null || rawValue === undefined) {
    return '';
  }

  if (typeof rawValue === 'number') {
    if (!Number.isFinite(rawValue)) {
      return 0;
    }
    return Math.min(Math.max(rawValue, 0), MAX_CURRENCY_AMOUNT);
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

const CATEGORY_PAGE_KEYWORDS = {
  'promotion-fund': ['ส่งเสริม', 'promotion', 'เผยแพร่', 'รางวัล', 'กิจกรรม'],
  'research-fund': ['วิจัย', 'research', 'อุดหนุน', 'สนับสนุน', 'ทุนวิจัย'],
};

const resolveCategoryPageFromName = (value) => {
  if (!value) {
    return null;
  }
  const normalized = String(value).toLowerCase();
  if (!normalized) {
    return null;
  }

  if (CATEGORY_PAGE_KEYWORDS['promotion-fund'].some((keyword) => normalized.includes(keyword))) {
    return 'promotion-fund';
  }

  if (CATEGORY_PAGE_KEYWORDS['research-fund'].some((keyword) => normalized.includes(keyword))) {
    return 'research-fund';
  }

  return null;
};

const resolveCategoryPageFromOrigin = (originPage) => {
  if (!originPage) {
    return null;
  }
  if (originPage === 'promotion-fund' || originPage === 'research-fund') {
    return originPage;
  }
  return null;
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
        bank_account: formData?.bank_account || '',
        bank_account_name: formData?.bank_account_name || '',
        bank_name: formData?.bank_name || '',
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
function FileUpload({ onFileSelect, accept, multiple = false, error, compact = false, disabled = false }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    if (disabled) {
      return;
    }
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    if (disabled) {
      return;
    }
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    if (disabled) {
      return;
    }
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    
    // Filter files by accept type
    const acceptedFiles = files.filter(file => {
      if (accept === ".pdf") return file.type === "application/pdf";
      return true;
    });

    if (acceptedFiles.length !== files.length) {
      Toast.fire({
        icon: 'warning',
        title: 'ไฟล์ไม่ถูกต้อง',
        text: 'กรุณาอัปโหลดเฉพาะไฟล์ PDF'
      });
    }

    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles);
    }
  };

  const handleFileInput = (e) => {
    if (disabled) {
      return;
    }
    const files = Array.from(e.target.files);
    if (files.length === 0) {
      return;
    }

    const acceptedFiles = files.filter(file => {
      if (accept === ".pdf") return file.type === "application/pdf";
      return true;
    });

    if (acceptedFiles.length !== files.length) {
      Toast.fire({
        icon: 'warning',
        title: 'ไฟล์ไม่ถูกต้อง',
        text: 'กรุณาอัปโหลดเฉพาะไฟล์ PDF'
      });
    }

    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles);
    }
  };

  return (
    <div className="space-y-1">
      <div
        className={`border-2 border-dashed rounded-lg ${compact ? "p-2" : "p-6"} text-center transition-colors ${
          isDragging
            ? "border-blue-400 bg-blue-50"
            : error
            ? "border-red-400 bg-red-50"
            : "border-gray-300 hover:border-gray-400"
        } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (disabled) {
            return;
          }
          fileInputRef.current?.click();
        }}
        aria-disabled={disabled}
      >
        <Upload
          className={`mx-auto mb-2 ${compact ? "h-5 w-5" : "h-8 w-8"} ${
            disabled ? "text-gray-300" : error ? "text-red-400" : "text-gray-400"
          }`}
        />
        <p
          className={`${compact ? "text-xs" : "text-sm"} ${
            disabled ? "text-gray-400" : error ? "text-red-600" : "text-gray-600"
          }`}
        >
          {compact ? "แนบไฟล์ (PDF)" : "คลิกหรือลากไฟล์มาวางที่นี่ (เฉพาะไฟล์ PDF)"}
        </p>
        {!compact && (
          <p className={`text-xs mt-1 ${disabled ? "text-gray-400" : "text-gray-500"}`}>
            ขนาดไฟล์สูงสุด 10MB
          </p>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled}
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

const parseNumericValue = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    if (typeof value === 'number') {
      if (!Number.isNaN(value)) {
        return value;
      }
      continue;
    }

    if (typeof value === 'string') {
      const normalized = value.replace(/[^0-9.,-]/g, '').replace(/,/g, '');
      if (!normalized) {
        continue;
      }
      const parsed = Number(normalized);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }

  return null;
};

const parseIntegerFromValue = (value) => {
  const numeric = parseNumericValue(value);
  if (numeric === null || Number.isNaN(numeric)) {
    return null;
  }
  const integer = Number.parseInt(numeric, 10);
  return Number.isNaN(integer) ? null : integer;
};

const normalizeBudgetHintEntry = (entry, fallbackOrder = 0) => {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const levelText = entry.level != null ? String(entry.level).trim() : '';
  const description = firstNonEmptyString(
    entry.fund_description,
    entry.fundDescription,
    entry.description,
    entry.level_description,
    entry.levelDescription,
    levelText ? `ระดับ${levelText}` : ''
  );

  const amount = parseNumericValue(
    entry.max_amount_per_grant,
    entry.maxAmountPerGrant,
    entry.MaxAmountPerGrant,
    entry.maximum_amount,
    entry.maximumAmount,
    entry.amount,
    entry.Amount
  );

  const scope = firstNonEmptyString(
    entry.record_scope,
    entry.recordScope,
    entry.scope,
    entry.Scope
  );

  const normalizedScope = scope ? String(scope).trim().toLowerCase() : null;

  const maxAmountPerYear = parseNumericValue(
    entry.max_amount_per_year,
    entry.maxAmountPerYear,
    entry.maximum_amount_per_year,
    entry.maximumAmountPerYear
  );

  const maxGrants = parseIntegerFromValue(
    entry.max_grants,
    entry.maxGrants,
    entry.maximum_grants,
    entry.maximumGrants
  );

  const subcategoryName = firstNonEmptyString(
    entry.subcategory_name,
    entry.subcategoryName,
    entry.SubcategoryName,
    entry.name,
    entry.Name
  );

  const trimmedDescription = typeof description === 'string' ? description.trim() : '';
  const trimmedSubcategoryName =
    typeof subcategoryName === 'string' ? subcategoryName.trim() : '';
  const hasLimitFields = maxAmountPerYear != null || maxGrants != null;
  const amountNumber = amount;

  let resolvedScope = normalizedScope;

  if (!resolvedScope) {
    const looksLikeRuleDescription = /^(\(?\d+[.)]|[\(\[]\d+)/.test(trimmedDescription);
    const looksLikeRuleName = /\s-\s*\(/.test(trimmedSubcategoryName);

    if (hasLimitFields && !looksLikeRuleDescription && !looksLikeRuleName) {
      const amountIsMeaningful = amountNumber != null && Number(amountNumber) > 0;
      if (!amountIsMeaningful || !trimmedDescription) {
        resolvedScope = 'overall';
      }
    }

    if (!resolvedScope && (looksLikeRuleDescription || looksLikeRuleName)) {
      resolvedScope = 'rule';
    }
  }

  if (!resolvedScope && hasLimitFields) {
    resolvedScope = 'overall';
  }

  if (!description && amount == null && maxAmountPerYear == null && maxGrants == null) {
    return null;
  }

  const order = parseNumericValue(
    entry.display_order,
    entry.displayOrder,
    entry.order,
    entry.sequence,
    entry.sort_order,
    entry.SortOrder,
    entry.level_order,
    entry.LevelOrder,
    entry.priority,
    entry.Priority
  );

  const identifier = firstNonEmptyString(
    entry.subcategory_budget_id,
    entry.subcategorie_budget_id,
    entry.subcategoryBudgetId,
    entry.SubcategoryBudgetID,
    entry.budget_id,
    entry.BudgetID,
    entry.id,
    entry.ID
  ) || `hint-${fallbackOrder}`;

  return {
    id: identifier,
    description: description || '',
    amount,
    order: Number.isFinite(order) ? order : fallbackOrder,
    scope: resolvedScope,
    maxAmountPerYear,
    maxGrants,
    subcategoryName: subcategoryName || null,
  };
};

const collectBudgetHintEntries = (collection, { filterSubcategoryId = null, fallbackOrderOffset = 0 } = {}) => {
  if (!Array.isArray(collection)) {
    return [];
  }

  const hints = [];
  const dedupe = new Set();

  collection.forEach((entry, index) => {
    if (filterSubcategoryId != null) {
      const candidates = [
        entry.original_subcategory_id,
        entry.originalSubcategoryId,
        entry.original_subcategorie_id,
        entry.subcategory_id,
        entry.subcategorie_id,
        entry.SubcategoryID,
        entry.original_subcategory,
      ];

      const matches = candidates.some((candidate) => {
        const parsed = parseIntegerFromValue(candidate);
        return parsed != null && parsed === filterSubcategoryId;
      });

      if (!matches) {
        return;
      }
    }

    const normalized = normalizeBudgetHintEntry(entry, fallbackOrderOffset + index);
    if (!normalized) {
      return;
    }

    const dedupeKey = [
      normalized.scope || 'null',
      normalized.description || 'null',
      normalized.amount ?? 'null',
      normalized.maxAmountPerYear ?? 'null',
      normalized.maxGrants ?? 'null',
    ].join(':::');
    if (dedupe.has(dedupeKey)) {
      return;
    }
    dedupe.add(dedupeKey);
    hints.push(normalized);
  });

  return hints;
};

const sortBudgetHints = (entries) => {
  if (!Array.isArray(entries)) {
    return [];
  }

  const resolveScopePriority = (scope) => {
    switch (scope) {
      case 'overall':
        return 0;
      case 'rule':
        return 1;
      default:
        return 2;
    }
  };

  return entries
    .slice()
    .map((entry, index) => ({
      ...entry,
      order: Number.isFinite(entry.order) ? entry.order : index,
    }))
    .sort((a, b) => {
      const scopePriorityA = resolveScopePriority(a.scope);
      const scopePriorityB = resolveScopePriority(b.scope);
      if (scopePriorityA !== scopePriorityB) {
        return scopePriorityA - scopePriorityB;
      }
      if (a.order !== b.order) {
        return a.order - b.order;
      }
      return a.description.localeCompare(b.description, 'th');
    });
};

const extractBudgetHintsFromContext = (context) => {
  if (!context || typeof context !== 'object') {
    return [];
  }

  const collections = [
    context?.subcategory?.subcategory_budgets,
    context?.subcategory?.budgets,
    context?.subcategory?.children,
    context?.subcategory?.rules,
    context?.subcategory_budgets,
    context?.budgets,
    context?.rules,
  ];

  const gathered = [];
  collections.forEach((collection) => {
    const entries = collectBudgetHintEntries(collection, {
      fallbackOrderOffset: gathered.length,
    });
    if (entries.length > 0) {
      gathered.push(...entries);
    }
  });

  if (gathered.length === 0) {
    return [];
  }

  return sortBudgetHints(gathered);
};

const extractBudgetHintsFromResponsePayload = (payload, targetSubcategoryId) => {
  if (!targetSubcategoryId) {
    return [];
  }

  const candidateLists = [
    payload?.subcategories,
    payload?.data?.subcategories,
    payload?.subcategories?.data,
    payload?.data,
    Array.isArray(payload) ? payload : null,
  ];

  let source = [];
  for (const candidate of candidateLists) {
    if (Array.isArray(candidate) && candidate.length > 0) {
      source = candidate;
      break;
    }
  }

  if (!Array.isArray(source) || source.length === 0) {
    return [];
  }

  const hints = collectBudgetHintEntries(source, {
    filterSubcategoryId: targetSubcategoryId,
  });

  return sortBudgetHints(hints);
};

const formatHintAmount = (value) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return null;
  }

  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return null;
  }

  return numeric.toLocaleString('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

const buildBudgetHintDisplay = (hint, { includeAmount = true } = {}) => {
  if (!hint) {
    return '';
  }

  const description = typeof hint.description === 'string'
    ? hint.description.trim()
    : firstNonEmptyString(hint.description);
  const amountText = includeAmount ? formatHintAmount(hint.amount) : null;

  if (description && amountText) {
    return `${description} ${amountText} บาท/ทุน`;
  }

  if (description) {
    return description;
  }

  if (amountText) {
    return `${amountText} บาท/ทุน`;
  }

  return '';
};

const formatGrantCount = (value) => {
  const numeric = parseIntegerFromValue(value);
  if (numeric == null) {
    return null;
  }
  return numeric.toLocaleString('th-TH');
};

const buildBudgetHintDisplayItemsFromEntries = (entries) => {
  if (!Array.isArray(entries) || entries.length === 0) {
    return [];
  }

  const sortedEntries = sortBudgetHints(entries);
  const overallEntries = sortedEntries.filter((entry) => entry.scope === 'overall');
  const ruleEntries = sortedEntries.filter((entry) => entry.scope === 'rule');
  const otherEntries = sortedEntries.filter(
    (entry) => entry.scope !== 'overall' && entry.scope !== 'rule'
  );

  const hasRules = ruleEntries.length > 0;
  const items = [];
  const seenTexts = new Set();

  const addItem = (id, text) => {
    if (!text) {
      return;
    }
    const trimmed = String(text).trim();
    if (!trimmed || seenTexts.has(trimmed)) {
      return;
    }
    seenTexts.add(trimmed);
    items.push({
      id,
      text: trimmed,
    });
  };

  const appendEntries = (sourceEntries, options = {}) => {
    sourceEntries.forEach((entry, index) => {
      if (options.includeAmount === false) {
        const numericAmount = parseNumericValue(entry.amount);
        if (numericAmount == null || Number(numericAmount) === 0) {
          return;
        }
      }
      const text = buildBudgetHintDisplay(entry, {
        includeAmount: options.includeAmount,
      });
      if (text) {
        if (options.includeAmount === false) {
          const normalizedText = String(text).replace(/\s+/g, '');
          if (/^0บาท/.test(normalizedText)) {
            return;
          }
        }
        addItem(`${entry.id || options.fallbackId || 'hint'}-${index}`, text);
      }
    });
  };

  appendEntries(overallEntries, { includeAmount: !hasRules, fallbackId: 'overall' });
  appendEntries(ruleEntries, { includeAmount: true, fallbackId: 'rule' });
  appendEntries(otherEntries, { includeAmount: !hasRules, fallbackId: 'hint' });

  const limitSource =
    overallEntries.find((entry) => entry.maxGrants != null || entry.maxAmountPerYear != null) ||
    overallEntries[0] ||
    sortedEntries.find((entry) => entry.maxGrants != null || entry.maxAmountPerYear != null) ||
    null;

  if (limitSource) {
    const maxGrantsText = formatGrantCount(limitSource.maxGrants);
    if (maxGrantsText) {
      addItem(
        `${limitSource.id || 'max-grants'}`,
        `ขอได้คนละไม่เกิน ${maxGrantsText} เรื่อง/ปีงบประมาณ`
      );
    }

    const maxAmountPerYearText = formatHintAmount(limitSource.maxAmountPerYear);
    if (maxAmountPerYearText) {
      addItem(
        `${limitSource.id || 'max-year'}-per-year`,
        `รวมไม่เกิน ${maxAmountPerYearText} บาท`
      );
    }
  }

  return items;
};

const formatFileSize = (bytes) => {
  if (!bytes && bytes !== 0) return "-";
  if (bytes === 0) return "0 B";
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 2)} ${sizes[i]}`;
};

const normalizePhoneValue = (value) => {
  if (value == null) {
    return '';
  }
  const digits = String(value).replace(/\D/g, '');
  if (!digits) {
    return '';
  }
  return formatPhoneNumber(digits);
};

const normalizeStatusCodeValue = (value) => {
  if (value == null) {
    return null;
  }

  if (typeof value === 'object') {
    if (value.status_code != null) {
      return normalizeStatusCodeValue(value.status_code);
    }
    if (value.code != null) {
      return normalizeStatusCodeValue(value.code);
    }
    if (value.status != null) {
      return normalizeStatusCodeValue(value.status);
    }
    if (value.name != null) {
      return normalizeStatusCodeValue(value.name);
    }
    if (value.status_name != null) {
      return normalizeStatusCodeValue(value.status_name);
    }
  }

  const text = String(value).trim();
  if (!text) {
    return null;
  }

  const normalized = text
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_');

  switch (normalized) {
    case '3':
    case 'revision':
    case 'needs_more_info':
    case 'need_more_info':
    case 'needs_more_information':
    case 'returned':
    case 'return':
    case 'resubmit':
    case 'resubmission_requested':
    case 'resubmission_required':
    case 'pending_revision':
    case 'pending_review_revision':
      return 'needs_more_info';
    case '4':
    case 'draft':
    case 'ร่าง':
      return 'draft';
    default:
      return normalized;
  }
};

const getSubmissionStatusCode = (submission) => {
  if (!submission || typeof submission !== 'object') {
    return null;
  }

  const candidates = [
    submission.status_code,
    submission.application_status_code,
    submission.status,
    submission.application_status,
    submission.submission_status,
    submission.status_name,
    submission.statusName,
    submission.application_status_name,
    submission.status_label,
    submission.status_text,
    submission.statusText,
    submission.status_value,
    submission.Status,
    submission.ApplicationStatus,
    submission.status_id,
    submission.application_status_id,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeStatusCodeValue(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return null;
};

const extractDocumentsFromResponse = (payload) => {
  const candidates = [
    payload?.documents,
    payload?.data?.documents,
    payload?.data?.documents?.data,
    payload?.data?.documents?.items,
    payload?.data?.documents?.results,
    payload?.data?.items,
    payload?.data?.results,
    payload?.data,
    payload?.items,
    payload?.results,
    payload?.documents?.data,
    payload?.documents?.items,
    payload?.documents?.results,
    Array.isArray(payload) ? payload : null,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
};

const normalizeServerDocumentEntry = (document) => {
  if (!document || typeof document !== 'object') {
    return null;
  }

  const documentId =
    document.document_id ??
    document.submission_document_id ??
    document.SubmissionDocumentID ??
    document.id ??
    null;

  const docTypeCandidate =
    document.document_type_id ??
    document.DocumentTypeID ??
    document.doc_type_id ??
    document.document_type?.document_type_id ??
    document.document_type?.id ??
    document.DocumentType?.document_type_id ??
    document.DocumentType?.id ??
    null;

  if (docTypeCandidate == null) {
    return null;
  }

  const numericDocType = Number(docTypeCandidate);
  const documentTypeId = Number.isNaN(numericDocType) ? docTypeCandidate : numericDocType;

  const fileSource = document.file || document.File || document.file_data || document.DocumentFile || {};
  const fileId = document.file_id ?? fileSource.file_id ?? fileSource.id ?? null;
  const originalNameRaw =
    document.original_name ??
    fileSource.original_name ??
    document.file_name ??
    fileSource.file_name ??
    '';
  const fileNameRaw = fileSource.file_name ?? document.file_name ?? originalNameRaw ?? '';
  const fileSize = document.file_size ?? fileSource.file_size ?? null;
  const description = document.description ?? document.DocumentDescription ?? '';

  const original_name = typeof originalNameRaw === 'string' ? originalNameRaw.trim() : '';
  const file_name = typeof fileNameRaw === 'string' ? fileNameRaw.trim() : '';

  return {
    document_id: documentId,
    document_type_id: documentTypeId,
    file_id: fileId,
    original_name: original_name || file_name || '',
    file_name: file_name || original_name || '',
    file_size: Number.isFinite(fileSize) ? fileSize : null,
    description,
    raw: document,
  };
};

const extractUploadedFilePayload = (response) => {
  if (!response) {
    return {};
  }

  const candidates = [
    response.file,
    response?.data?.file,
    response?.data,
  ];

  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object' && (candidate.file_id != null || candidate.id != null)) {
      return candidate;
    }
  }

  const listCandidates = [response.files, response?.data?.files];
  for (const list of listCandidates) {
    if (Array.isArray(list) && list.length > 0) {
      return list[0];
    }
  }

  return typeof response === 'object' ? response : {};
};

const firstNonEmptyString = (...values) => {
  for (const value of values) {
    if (value == null) {
      continue;
    }
    const text = String(value).trim();
    if (text) {
      return text;
    }
  }
  return '';
};

const firstValidNumber = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) {
      return numeric;
    }
  }
  return null;
};

const resolveFundContextIdentifiers = (context) => {
  const safeContext = context || {};

  const yearId = firstValidNumber(
    safeContext.year_id,
    safeContext.YearID,
    safeContext.yearId,
    safeContext?.subcategory?.year_id,
    safeContext?.subcategory?.YearID,
    safeContext?.subcategory?.yearId,
  );

  const categoryId = firstValidNumber(
    safeContext.category_id,
    safeContext.CategoryID,
    safeContext.categoryId,
    safeContext?.subcategory?.category_id,
    safeContext?.subcategory?.CategoryID,
    safeContext?.subcategory?.categoryId,
    safeContext?.subcategory?.category?.category_id,
    safeContext?.subcategory?.category?.CategoryID,
    safeContext?.subcategory?.category?.categoryId,
  );

  const subcategoryId = firstValidNumber(
    safeContext.subcategory_id,
    safeContext.SubcategoryID,
    safeContext.subcategoryId,
    safeContext?.subcategory?.subcategory_id,
    safeContext?.subcategory?.SubcategoryID,
    safeContext?.subcategory?.subcategoryId,
    safeContext?.subcategory?.subcategorie_id,
    safeContext?.subcategory?.id,
  );

  const budgetId = firstValidNumber(
    safeContext.subcategory_budget_id,
    safeContext.SubcategoryBudgetID,
    safeContext.subcategoryBudgetId,
    safeContext?.subcategory?.subcategory_budget_id,
    safeContext?.subcategory?.SubcategoryBudgetID,
    safeContext?.subcategory?.subcategoryBudgetId,
    safeContext?.subcategory?.budget_id,
    safeContext?.subcategory_budget_id,
    safeContext?.subcategory_budget?.subcategory_budget_id,
    safeContext?.subcategory_budget?.SubcategoryBudgetID,
    safeContext?.subcategory_budget?.subcategoryBudgetId,
  );

  return {
    yearId: yearId ?? null,
    categoryId: categoryId ?? null,
    subcategoryId: subcategoryId ?? null,
    budgetId: budgetId ?? null,
  };
};

const pickFirstObject = (...values) => {
  for (const value of values) {
    if (value && typeof value === 'object') {
      return value;
    }
  }
  return null;
};

const cloneFundContext = (context) => {
  if (!context) {
    return null;
  }

  const cloned = { ...context };
  if (context.subcategory && typeof context.subcategory === 'object') {
    cloned.subcategory = { ...context.subcategory };
    if (context.subcategory.category && typeof context.subcategory.category === 'object') {
      cloned.subcategory.category = { ...context.subcategory.category };
    }
  }

  return cloned;
};

const mergeFundContext = (baseContext, incomingContext) => {
  if (!baseContext && !incomingContext) {
    return null;
  }

  const base = cloneFundContext(baseContext) || {};
  const incoming = cloneFundContext(incomingContext);

  if (incoming) {
    Object.assign(base, incoming);

    if (incoming.subcategory) {
      base.subcategory = { ...(base.subcategory || {}), ...incoming.subcategory };

      const incomingCategory = incoming.subcategory.category;
      if (incomingCategory || base.subcategory?.category) {
        base.subcategory.category = {
          ...(base.subcategory?.category || {}),
          ...(incomingCategory || {}),
        };
      }
    }
  }

  return Object.keys(base).length > 0 ? base : null;
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

// =================================================================
// MAIN COMPONENT
// =================================================================
export default function GenericFundApplicationForm({
  onNavigate,
  subcategoryData,
  readOnly = false,
}) {
  const router = useRouter();
  // =================================================================
  // STATE MANAGEMENT
  // =================================================================
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [currentSubmissionId, setCurrentSubmissionId] = useState(
    subcategoryData?.submissionId ?? null
  );
  const [fundContext, setFundContext] = useState(() =>
    mergeFundContext(null, subcategoryData)
  );

  // Form data
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    bank_account: "",
    bank_account_name: "",
    bank_name: "",
    project_title: "",
    project_description: "",
    requested_amount: "",
  });
  
  // Document requirements and uploaded files
  const [documentRequirements, setDocumentRequirements] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [serverDocuments, setServerDocuments] = useState({});
  const [documentsToDetach, setDocumentsToDetach] = useState(() => new Set());
  const [attachmentsPreviewState, setAttachmentsPreviewState] = useState({
    loading: false,
    error: null,
    hasPreviewed: false
  });
  const attachmentsPreviewUrlRef = useRef(null);
  const serverFileCacheRef = useRef(new Map());
  const [budgetHints, setBudgetHints] = useState([]);
  const [budgetHintsLoading, setBudgetHintsLoading] = useState(false);
  const [budgetHintsError, setBudgetHintsError] = useState(null);
  const budgetHintsFetchKeyRef = useRef(null);

  // Current user data
  const [currentUser, setCurrentUser] = useState(null);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [submissionStatusCode, setSubmissionStatusCode] = useState(null);
  const [isEditable, setIsEditable] = useState(true);
  const [forceReadOnly, setForceReadOnly] = useState(false);
  const [isNeedsMoreInfo, setIsNeedsMoreInfo] = useState(false);
  const [reviewerComments, setReviewerComments] = useState({ admin: '', head: '' });
  const [announcementLock, setAnnouncementLock] = useState({
    main_annoucement: null,
    activity_support_announcement: null,
  });
  const [hasDraft, setHasDraft] = useState(false);
  const [categoryPage, setCategoryPage] = useState(() => {
    const originCandidate = resolveCategoryPageFromOrigin(subcategoryData?.originPage);
    if (originCandidate) {
      return originCandidate;
    }
    const nameCandidate = firstNonEmptyString(
      subcategoryData?.category_name,
      subcategoryData?.subcategory?.category?.category_name,
      subcategoryData?.subcategory_name,
    );
    return resolveCategoryPageFromName(nameCandidate);
  });

  useEffect(() => {
    let ro = readOnly === true;

    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const readonlyQuery = (searchParams.get("readonly") || "").toLowerCase();
      const mode = (searchParams.get("mode") || "").toLowerCase();

      if (["1", "true", "yes"].includes(readonlyQuery)) ro = true;
      if (["view", "detail", "details", "readonly"].includes(mode)) ro = true;

      try {
        const sessionValue = window.sessionStorage.getItem("fund_form_readonly");
        if (sessionValue === "1") ro = true;
        window.sessionStorage.removeItem("fund_form_readonly");
      } catch {}
    }

    setForceReadOnly(ro);
  }, [readOnly]);

  useEffect(() => {
    setFundContext((prev) => mergeFundContext(prev, subcategoryData));
  }, [subcategoryData]);

  const originPage = fundContext?.originPage ?? subcategoryData?.originPage ?? null;
  const editingExistingSubmission = useMemo(
    () => Boolean(currentSubmissionId || subcategoryData?.submissionId),
    [currentSubmissionId, subcategoryData?.submissionId]
  );
  const canEdit = isEditable && !forceReadOnly;
  const isReadOnly = !canEdit;
  const navigationTarget = useMemo(() => {
    if (originPage) {
      return originPage;
    }
    if (editingExistingSubmission) {
      return "applications";
    }
    return "research-fund";
  }, [originPage, editingExistingSubmission]);
  const effectiveFundContext = fundContext || subcategoryData || {};
  const resolvedIdentifiers = useMemo(
    () => resolveFundContextIdentifiers(effectiveFundContext),
    [effectiveFundContext]
  );
  const resolvedCategoryId = resolvedIdentifiers?.categoryId ?? null;
  const resolvedSubcategoryId = resolvedIdentifiers?.subcategoryId ?? null;
  const resolvedYearId = resolvedIdentifiers?.yearId ?? null;
  const contextBudgetHints = useMemo(
    () => extractBudgetHintsFromContext(effectiveFundContext),
    [effectiveFundContext]
  );
  const budgetHintDisplayItems = useMemo(
    () => buildBudgetHintDisplayItemsFromEntries(budgetHints || []),
    [budgetHints]
  );

  const budgetHintFundName = useMemo(() => {
    const fallbackFromEntries = (budgetHints || []).find(
      (entry) => entry?.subcategoryName && String(entry.subcategoryName).trim()
    );

    return firstNonEmptyString(
      effectiveFundContext?.subcategory_name,
      effectiveFundContext?.subcategory?.subcategory_name,
      effectiveFundContext?.subcategory?.name,
      subcategoryData?.subcategory_name,
      subcategoryData?.subcategory?.subcategory_name,
      fallbackFromEntries?.subcategoryName
    );
  }, [
    budgetHints,
    effectiveFundContext?.subcategory?.name,
    effectiveFundContext?.subcategory?.subcategory_name,
    effectiveFundContext?.subcategory_name,
    subcategoryData?.subcategory?.subcategory_name,
    subcategoryData?.subcategory_name,
  ]);

  const budgetHintTitle = budgetHintFundName
    ? `เงื่อนไขการขอทุน ${budgetHintFundName}`
    : 'เงื่อนไขการขอทุน';

  // =================================================================
  // INITIAL DATA LOADING
  // =================================================================
  useEffect(() => {
    loadInitialData();
  }, [subcategoryData]);

  useEffect(() => {
    const originCandidate = resolveCategoryPageFromOrigin(originPage);
    if (originCandidate) {
      setCategoryPage(originCandidate);
      return;
    }

    const nameCandidate = firstNonEmptyString(
      fundContext?.category_name,
      fundContext?.subcategory?.category?.category_name,
      fundContext?.subcategory_name,
    );
    const resolved = resolveCategoryPageFromName(nameCandidate);
    if (resolved) {
      setCategoryPage(resolved);
    }
  }, [
    originPage,
    fundContext?.category_name,
    fundContext?.subcategory?.category?.category_name,
    fundContext?.subcategory_name,
  ]);

  useEffect(() => {
    if (contextBudgetHints.length > 0) {
      setBudgetHints((prev) => (prev.length > 0 ? prev : contextBudgetHints));
      setBudgetHintsError(null);
    }
  }, [contextBudgetHints]);

  useEffect(() => {
    if (!resolvedSubcategoryId) {
      budgetHintsFetchKeyRef.current = null;
      if (contextBudgetHints.length === 0) {
        setBudgetHints([]);
      }
      setBudgetHintsLoading(false);
      setBudgetHintsError(null);
      return;
    }

    const fetchKey = `${resolvedCategoryId || 'null'}:${resolvedSubcategoryId}:${resolvedYearId || 'null'}`;
    if (budgetHintsFetchKeyRef.current === fetchKey && budgetHints.length > 0) {
      return;
    }

    budgetHintsFetchKeyRef.current = fetchKey;

    let cancelled = false;

    const loadBudgetHints = async () => {
      setBudgetHintsLoading(true);
      setBudgetHintsError(null);

      try {
        const response = await teacherAPI.getVisibleSubcategories(resolvedCategoryId, resolvedYearId);
        if (cancelled) {
          return;
        }
        const hints = extractBudgetHintsFromResponsePayload(response, resolvedSubcategoryId);
        if (hints.length > 0) {
          setBudgetHints(hints);
        } else if (contextBudgetHints.length === 0) {
          setBudgetHints([]);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        console.warn('Failed to load budget hints for fund application form', error);
        setBudgetHintsError('ไม่สามารถโหลดข้อมูลเงื่อนไขเพิ่มเติมได้');
        if (contextBudgetHints.length === 0) {
          setBudgetHints([]);
        }
      } finally {
        if (!cancelled) {
          setBudgetHintsLoading(false);
        }
      }
    };

    loadBudgetHints();

    return () => {
      cancelled = true;
    };
  }, [
    resolvedCategoryId,
    resolvedSubcategoryId,
    resolvedYearId,
    contextBudgetHints.length,
    budgetHints.length,
  ]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setErrors({});
      setPendingStatus(null);
      setServerDocuments({});
      setUploadedFiles({});
      setDocumentsToDetach(() => new Set());
      setAttachmentsPreviewState({ loading: false, error: null, hasPreviewed: false });
      setSubmissionStatusCode(null);
      setIsEditable(true);
      setIsNeedsMoreInfo(false);
      setReviewerComments({ admin: '', head: '' });
      serverFileCacheRef.current.clear();

      // Load user data and document requirements in parallel
      const [userData, docRequirements, statusInfo] = await Promise.all([
        loadUserData(),
        loadDocumentRequirements(),
        resolveDeptHeadPendingStatus(),
      ]);

      await loadSystemAnnouncements();

      if (subcategoryData?.submissionId) {
        await loadExistingSubmission(subcategoryData.submissionId);
      } else if (typeof window !== 'undefined') {
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

      setPendingStatus(statusInfo);

    } catch (error) {
      console.error('Error loading initial data:', error);
      setErrors({ general: error.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล' });
      setPendingStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshServerDocuments = async (submissionId) => {
    if (!submissionId) {
      setServerDocuments({});
      return {};
    }

    try {
      const response = await documentAPI.getSubmissionDocuments(submissionId);
      const rawDocuments = extractDocumentsFromResponse(response);
      const normalizedDocuments = Array.isArray(rawDocuments)
        ? rawDocuments.map(normalizeServerDocumentEntry).filter(Boolean)
        : [];

      const documentMap = {};
      normalizedDocuments.forEach((doc) => {
        const docTypeKey = doc?.document_type_id ?? doc?.raw?.document_type_id;
        if (docTypeKey == null) {
          return;
        }
        const key = String(docTypeKey);
        documentMap[key] = doc;
      });

      setServerDocuments(documentMap);
      return documentMap;
    } catch (error) {
      console.error('Failed to load submission documents:', error);
      setServerDocuments({});
      return {};
    }
  };

  const loadExistingSubmission = async (submissionId) => {
    try {
      const response = await submissionAPI.getSubmission(submissionId);
      const submission = response?.submission ?? response?.data ?? response;
      if (!submission) {
        return;
      }

      setCurrentSubmissionId(submissionId);

      const statusCode = getSubmissionStatusCode(submission);
      setSubmissionStatusCode(statusCode);
      const editable = !statusCode || EDITABLE_STATUS_CODES.has(statusCode);
      setIsEditable(editable);
      setIsNeedsMoreInfo(statusCode === 'needs_more_info');

      const adminComment = firstNonEmptyString(
        submission.admin_comment,
        submission.AdminComment,
        submission.reviewer_comment
      );
      const headComment = firstNonEmptyString(
        submission.head_comment,
        submission.HeadComment,
        submission.headComment,
        submission.dept_head_comment,
        submission.department_head_comment,
        submission.HeadCommentText
      );
      setReviewerComments({
        admin: adminComment,
        head: headComment,
      });

      const detail =
        submission.fund_application_detail ||
        submission.FundApplicationDetail ||
        submission.fundApplicationDetail ||
        null;

      setFundContext((prev) => {
        const base = mergeFundContext(prev, subcategoryData);
        const working = cloneFundContext(base) || {};

        const resolvedSubcategory = pickFirstObject(
          detail?.subcategory,
          detail?.Subcategory,
          submission.subcategory,
          submission.Subcategory,
          working?.subcategory,
        );
        const resolvedCategory = pickFirstObject(
          resolvedSubcategory?.category,
          resolvedSubcategory?.Category,
          detail?.category,
          detail?.Category,
          submission.category,
          submission.Category,
          working?.subcategory?.category,
        );

        const resolvedCategoryId = firstValidNumber(
          submission.category_id,
          submission.CategoryID,
          detail?.category_id,
          detail?.CategoryID,
          resolvedCategory?.category_id,
          resolvedCategory?.CategoryID,
          working?.category_id,
        );
        if (resolvedCategoryId != null) {
          working.category_id = resolvedCategoryId;
        }

        const resolvedSubcategoryId = firstValidNumber(
          submission.subcategory_id,
          submission.SubcategoryID,
          detail?.subcategory_id,
          detail?.SubcategoryID,
          resolvedSubcategory?.subcategory_id,
          resolvedSubcategory?.SubcategoryID,
          working?.subcategory_id,
        );
        if (resolvedSubcategoryId != null) {
          working.subcategory_id = resolvedSubcategoryId;
        }

        const resolvedBudgetId = firstValidNumber(
          submission.subcategory_budget_id,
          submission.SubcategoryBudgetID,
          detail?.subcategory_budget_id,
          detail?.SubcategoryBudgetID,
          working?.subcategory_budget_id,
        );
        if (resolvedBudgetId != null) {
          working.subcategory_budget_id = resolvedBudgetId;
        }

        const resolvedYearId = firstValidNumber(
          submission.year_id,
          submission.YearID,
          detail?.year_id,
          detail?.YearID,
          working?.year_id,
        );
        if (resolvedYearId != null) {
          working.year_id = resolvedYearId;
        }

        const resolvedCategoryName = firstNonEmptyString(
          submission.category_name,
          submission.CategoryName,
          detail?.category_name,
          detail?.CategoryName,
          resolvedCategory?.category_name,
          resolvedCategory?.CategoryName,
          working?.category_name,
          working?.subcategory?.category?.category_name,
        );
        if (resolvedCategoryName) {
          working.category_name = resolvedCategoryName;
        }

        const resolvedSubcategoryName = firstNonEmptyString(
          submission.subcategory_name,
          submission.SubcategoryName,
          detail?.subcategory_name,
          detail?.SubcategoryName,
          resolvedSubcategory?.subcategory_name,
          resolvedSubcategory?.subcategorie_name,
          working?.subcategory_name,
        );
        if (resolvedSubcategoryName) {
          working.subcategory_name = resolvedSubcategoryName;
        }

        const resolvedFundFullName = firstNonEmptyString(
          resolvedSubcategory?.fund_full_name,
          detail?.fund_full_name,
          working?.subcategory?.fund_full_name,
          resolvedSubcategoryName,
        );

        const resolvedFundName = firstNonEmptyString(
          resolvedSubcategory?.fund_name,
          detail?.fund_name,
          working?.subcategory?.fund_name,
          resolvedFundFullName,
          resolvedSubcategoryName,
        );

        const resolvedFundDescription = firstNonEmptyString(
          detail?.fund_description,
          resolvedSubcategory?.fund_description,
          working?.fund_description,
          working?.subcategory?.fund_description,
        );

        const resolvedSubcategoryDescription = firstNonEmptyString(
          detail?.subcategory_description,
          resolvedSubcategory?.subcategory_description,
          working?.subcategory_description,
          working?.subcategory?.subcategory_description,
        );

        const resolvedFundCondition = firstNonEmptyString(
          detail?.fund_condition,
          resolvedSubcategory?.fund_condition,
          working?.subcategory?.fund_condition,
        );

        const mergedSubcategory = {
          ...(working?.subcategory || {}),
          ...(resolvedSubcategory || {}),
        };

        if (resolvedSubcategoryId != null) {
          mergedSubcategory.subcategory_id = resolvedSubcategoryId;
        }
        if (resolvedSubcategoryName) {
          mergedSubcategory.subcategory_name = resolvedSubcategoryName;
        }
        if (resolvedFundFullName) {
          mergedSubcategory.fund_full_name = resolvedFundFullName;
        }
        if (resolvedFundName) {
          mergedSubcategory.fund_name = resolvedFundName;
        }
        if (resolvedFundDescription) {
          mergedSubcategory.fund_description = resolvedFundDescription;
        }
        if (resolvedSubcategoryDescription) {
          mergedSubcategory.subcategory_description = resolvedSubcategoryDescription;
        }
        if (resolvedFundCondition) {
          mergedSubcategory.fund_condition = resolvedFundCondition;
        }

        const mergedCategory = {
          ...(working?.subcategory?.category || {}),
          ...(resolvedCategory || {}),
        };

        if (resolvedCategoryId != null) {
          mergedCategory.category_id = resolvedCategoryId;
        }
        if (resolvedCategoryName) {
          mergedCategory.category_name = resolvedCategoryName;
        }

        if (Object.keys(mergedCategory).length > 0) {
          mergedSubcategory.category = mergedCategory;
        }

        if (Object.keys(mergedSubcategory).length > 0) {
          working.subcategory = mergedSubcategory;
        }

        if (resolvedFundDescription) {
          working.fund_description = resolvedFundDescription;
        }
        if (resolvedSubcategoryDescription) {
          working.subcategory_description = resolvedSubcategoryDescription;
        }

        return mergeFundContext(working, null);
      });

      const categoryNameCandidate = firstNonEmptyString(
        submission.category_name,
        submission.Category?.CategoryName,
        submission.category?.category_name,
        detail?.subcategory?.category?.category_name,
        detail?.Subcategory?.Category?.CategoryName,
        effectiveFundContext?.category_name,
        effectiveFundContext?.subcategory?.category?.category_name,
      );
      const resolvedCategoryPage = resolveCategoryPageFromName(categoryNameCandidate);
      if (resolvedCategoryPage) {
        setCategoryPage(resolvedCategoryPage);
      }

      const applicantUser =
        submission.applicant_user ||
        submission.user ||
        submission.applicant ||
        submission.Applicant ||
        submission.SubmissionUser ||
        submission.submission_user ||
        null;

      const resolvedName = firstNonEmptyString(
        buildApplicantDisplayName(applicantUser),
        submission.applicant_name,
        submission.applicant_full_name,
        submission.user_name,
        submission.UserName
      );

      const phoneCandidate = firstNonEmptyString(
        detail?.contact_phone,
        detail?.phone_number,
        detail?.phone,
        detail?.contact_number,
        submission.contact_phone,
        submission.phone_number,
        submission.phone,
        submission.user?.phone_number,
        submission.user?.phone
      );
      const normalizedPhone = normalizePhoneValue(phoneCandidate);

      const projectTitle = firstNonEmptyString(
        detail?.project_title,
        detail?.ProjectTitle,
        submission.project_title,
        submission.ProjectTitle
      );

      const bankAccount = firstNonEmptyString(
        submission.bank_account,
        submission.BankAccount,
      );

      const bankAccountName = firstNonEmptyString(
        submission.bank_account_name,
        submission.BankAccountName,
      );

      const bankName = firstNonEmptyString(
        submission.bank_name,
        submission.BankName,
      );

      const projectDescription = firstNonEmptyString(
        detail?.project_description,
        detail?.ProjectDescription,
        submission.project_description,
        submission.ProjectDescription
      );

      const requestedAmountRaw =
        detail?.requested_amount ??
        detail?.RequestedAmount ??
        submission.requested_amount ??
        submission.RequestedAmount ??
        submission.amount ??
        null;
      const requestedAmount =
        requestedAmountRaw != null && requestedAmountRaw !== ''
          ? String(requestedAmountRaw)
          : '';
      const limitedRequestedAmount = clampCurrencyValue(requestedAmount);

      setFormData(prev => ({
        ...prev,
        name: resolvedName || prev.name || '',
        phone: normalizedPhone || prev.phone || '',
        bank_account: bankAccount || prev.bank_account || '',
        bank_account_name: bankAccountName || prev.bank_account_name || '',
        bank_name: bankName || prev.bank_name || '',
        project_title: projectTitle || prev.project_title || '',
        project_description: projectDescription || prev.project_description || '',
        requested_amount: limitedRequestedAmount || prev.requested_amount || '',
      }));

      if (detail) {
        const mainAnn =
          detail.main_annoucement ??
          detail.MainAnnoucement ??
          announcementLock.main_annoucement;
        const supportAnn =
          detail.activity_support_announcement ??
          detail.ActivitySupportAnnouncement ??
          announcementLock.activity_support_announcement;
        setAnnouncementLock({
          main_annoucement: mainAnn,
          activity_support_announcement: supportAnn,
        });
      }

      await refreshServerDocuments(submissionId);
      setDocumentsToDetach(() => new Set());
      setUploadedFiles({});
      resetAttachmentsPreview();

      setHasDraft(true);
    } catch (error) {
      console.error('Failed to load submission draft:', error);
      setErrors(prev => ({
        ...prev,
        general: 'ไม่สามารถโหลดร่างคำร้องได้',
      }));
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
    let nextValue = value;
    if (field === 'requested_amount') {
      nextValue = clampCurrencyValue(value);
    }

    setFormData(prev => ({ ...prev, [field]: nextValue }));

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

  const downloadServerDocumentFile = useCallback(async (documentEntry) => {
    if (!documentEntry?.file_id) {
      throw new Error('ไม่พบไฟล์บนเซิร์ฟเวอร์สำหรับเอกสารนี้');
    }

    const headers = {};
    const token = apiClient.getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${apiClient.baseURL}/files/managed/${documentEntry.file_id}/download`, {
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

    const fileName = documentEntry.original_name || documentEntry.file_name || `document-${documentEntry.file_id}.pdf`;
    const file = new File([blob], fileName, { type: blob.type || 'application/pdf' });

    serverFileCacheRef.current.set(String(documentEntry.file_id), file);
    return file;
  }, []);

  const markServerDocumentForDetach = (documentTypeId) => {
    if (documentTypeId == null) {
      return;
    }

    const key = String(documentTypeId);
    setServerDocuments(prev => {
      const existing = prev?.[key];
      if (!existing) {
        return prev;
      }

      if (existing.document_id != null) {
        setDocumentsToDetach(prevSet => {
          const updated = new Set(prevSet);
          updated.add(existing.document_id);
          return updated;
        });
      }

      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleFileUpload = (documentTypeId, files) => {
    if (isReadOnly || saving || submitting) {
      return;
    }
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

      markServerDocumentForDetach(documentTypeId);

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
    if (isReadOnly || saving || submitting) {
      return;
    }
    setUploadedFiles(prev => {
      if (!prev || prev[documentTypeId] == null) {
        return prev;
      }
      const newFiles = { ...prev };
      delete newFiles[documentTypeId];
      return newFiles;
    });

    const requirement = documentRequirements.find(
      (doc) => String(doc?.document_type_id) === String(documentTypeId)
    );
    if (requirement?.required) {
      setErrors(prev => ({
        ...prev,
        [`file_${requirement.document_type_id}`]: `กรุณาแนบ${requirement.document_type_name}`,
      }));
    }

    resetAttachmentsPreview();
  };

  const handleRemoveServerDocument = (documentTypeId) => {
    if (isReadOnly || saving || submitting) {
      return;
    }

    const key = String(documentTypeId);
    if (!serverDocuments?.[key]) {
      return;
    }

    markServerDocumentForDetach(documentTypeId);

    const requirement = documentRequirements.find(
      (doc) => String(doc?.document_type_id) === key
    );
    if (requirement?.required) {
      setErrors(prev => ({
        ...prev,
        [`file_${requirement.document_type_id}`]: `กรุณาแนบ${requirement.document_type_name}`,
      }));
    }

    resetAttachmentsPreview();
  };

  const handleDownloadServerFile = async (documentTypeId) => {
    const key = String(documentTypeId);
    const documentEntry = serverDocuments?.[key];

    if (!documentEntry) {
      Toast.fire({
        icon: 'warning',
        title: 'ไม่พบไฟล์',
        text: 'ไม่พบไฟล์บนเซิร์ฟเวอร์สำหรับเอกสารนี้',
      });
      return;
    }

    if (!documentEntry.file_id) {
      Toast.fire({
        icon: 'error',
        title: 'ดาวน์โหลดไม่สำเร็จ',
        text: 'ไม่พบข้อมูลไฟล์สำหรับดาวน์โหลด',
      });
      return;
    }

    try {
      const downloadName =
        documentEntry.original_name ||
        documentEntry.file_name ||
        `document-${documentEntry.document_id || documentEntry.file_id}`;
      await apiClient.downloadFile(
        `/files/managed/${documentEntry.file_id}/download`,
        downloadName || 'document.pdf'
      );
    } catch (error) {
      console.error('Failed to download document:', error);
      Toast.fire({
        icon: 'error',
        title: 'ดาวน์โหลดไม่สำเร็จ',
        text: error?.message || 'ไม่สามารถดาวน์โหลดไฟล์ได้',
      });
    }
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
      .map((docType) => {
        const key = String(docType.document_type_id);
        const uploadedFile = uploadedFiles[docType.document_type_id];

        if (uploadedFile) {
          return {
            id: docType.document_type_id,
            name: uploadedFile.name,
            size: uploadedFile.size,
            typeLabel: docType.document_type_name,
            required: docType.required,
            file: uploadedFile,
            source: 'uploaded',
          };
        }

        const serverDoc = serverDocuments?.[key];
        if (serverDoc) {
          const serverSize = Number.isFinite(serverDoc.file_size) ? serverDoc.file_size : 0;
          return {
            id: docType.document_type_id,
            name: serverDoc.original_name || docType.document_type_name,
            size: serverSize,
            typeLabel: docType.document_type_name,
            required: docType.required,
            file: serverDoc.file || null,
            file_id: serverDoc.file_id ?? null,
            document_id: serverDoc.document_id ?? null,
            source: 'server',
          };
        }

        return null;
      })
      .filter(Boolean)
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
      const resolvedAttachments = [];
      for (const attachment of attachments) {
        let file = attachment.file;

        if (!file && attachment.file_id) {
          const cacheKey = String(attachment.file_id);
          file = serverFileCacheRef.current.get(cacheKey);
          if (!file) {
            file = await downloadServerDocumentFile(attachment);
          }

          if (file && attachment.source === 'server' && attachment.id != null) {
            const docKey = String(attachment.id);
            setServerDocuments((prev) => {
              const existing = prev?.[docKey];
              if (!existing) return prev;
              return {
                ...prev,
                [docKey]: { ...existing, file },
              };
            });
          }
        }

        if (!file) {
          throw new Error('ไม่พบข้อมูลไฟล์แนบ');
        }

        resolvedAttachments.push({ ...attachment, file });
      }

      const mergedPdf = await PDFDocument.create();

      for (const attachment of resolvedAttachments) {
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

    const cleanedBankAccount = formData.bank_account.replace(/\s+/g, '');
    if (!cleanedBankAccount) {
      newErrors.bank_account = 'กรุณากรอกเลขบัญชีธนาคาร';
    } else {
      const bankAccountRegex = /^\d{10,15}$/;
      if (!bankAccountRegex.test(cleanedBankAccount)) {
        newErrors.bank_account = 'เลขบัญชีธนาคารต้องเป็นตัวเลข 10-15 หลัก';
      }
    }

    if (!formData.bank_account_name.trim()) {
      newErrors.bank_account_name = 'กรุณาระบุชื่อบัญชีธนาคาร';
    }

    if (!formData.bank_name.trim()) {
      newErrors.bank_name = 'กรุณาระบุชื่อธนาคาร';
    }

    if (!formData.requested_amount || isNaN(parseFloat(formData.requested_amount)) || parseFloat(formData.requested_amount) <= 0) {
      newErrors.requested_amount = 'กรุณาระบุจำนวนเงินที่ขอ';
    }

    // Validate required documents
    documentRequirements.forEach(docType => {
      const key = docType.document_type_id;
      const hasUploaded = Boolean(uploadedFiles[key]);
      const hasServerDocument = Boolean(serverDocuments?.[String(key)]);
      if (docType.required && !hasUploaded && !hasServerDocument) {
        newErrors[`file_${docType.document_type_id}`] = `กรุณาแนบ${docType.document_type_name}`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const syncSubmissionDocuments = async (submissionId) => {
    if (!submissionId) {
      return;
    }

    const detachIds = Array.from(documentsToDetach);
    const uploadEntries = Object.entries(uploadedFiles);

    if (detachIds.length === 0 && uploadEntries.length === 0) {
      return;
    }

    if (detachIds.length > 0) {
      await Promise.all(
        detachIds.map((documentId) =>
          documentAPI.detachDocument(submissionId, documentId)
        )
      );
    }

    if (uploadEntries.length > 0) {
      for (let index = 0; index < uploadEntries.length; index += 1) {
        const [docTypeId, file] = uploadEntries[index];
        if (!file) {
          continue;
        }

        const uploadRes = await fileAPI.uploadFile(file);
        const payload = extractUploadedFilePayload(uploadRes);
        const fileId = payload?.file_id ?? payload?.id;
        if (!fileId) {
          throw new Error('ไม่สามารถอัปโหลดไฟล์ได้');
        }

        const originalName =
          payload?.original_name ??
          payload?.file_name ??
          file.name ??
          `document-${fileId}`;

        const numericDocType = Number(docTypeId);
        const documentTypeIdValue = Number.isNaN(numericDocType)
          ? docTypeId
          : numericDocType;

        await documentAPI.attachDocument(submissionId, {
          file_id: fileId,
          document_type_id: documentTypeIdValue,
          description: file.name,
          display_order: index + 1,
          original_name: originalName,
        });
      }
    }

    await refreshServerDocuments(submissionId);
    setUploadedFiles({});
    setDocumentsToDetach(() => new Set());
    resetAttachmentsPreview();
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

      let submissionId = currentSubmissionId;
      const {
        yearId: contextYearId,
        categoryId: contextCategoryId,
        subcategoryId: contextSubcategoryId,
        budgetId: contextBudgetId,
      } = resolveFundContextIdentifiers(effectiveFundContext);
      if (!submissionId) {
        const payload = {
          submission_type: 'fund_application',
          year_id: contextYearId,
          category_id: contextCategoryId,
          subcategory_id: contextSubcategoryId,
          subcategory_budget_id: contextBudgetId,
          contact_phone: formData.phone || '',
          bank_account: formData.bank_account || '',
          bank_account_name: formData.bank_account_name || '',
          bank_name: formData.bank_name || '',
        };

        const submissionRes = await submissionAPI.createSubmission(payload);
        submissionId = submissionRes?.submission?.submission_id;
        if (!submissionId) {
          throw new Error('ไม่สามารถสร้างร่างคำร้องได้');
        }
        setCurrentSubmissionId(submissionId);
      } else {
        try {
          await submissionAPI.update(submissionId, {
            category_id: contextCategoryId,
            subcategory_id: contextSubcategoryId,
            subcategory_budget_id: contextBudgetId,
            contact_phone: formData.phone || '',
            bank_account: formData.bank_account || '',
            bank_account_name: formData.bank_account_name || '',
            bank_name: formData.bank_name || '',
          });
        } catch (updateError) {
          console.warn('Failed to update submission metadata for draft:', updateError);
        }
      }

      if (!submissionId) {
        throw new Error('ไม่สามารถกำหนดหมายเลขคำร้องได้');
      }

      const fundDetailsPayload = {
        project_title: formData.project_title || '',
        project_description: formData.project_description || '',
        requested_amount: parseFloat(formData.requested_amount) || 0,
        subcategory_id: contextSubcategoryId,
        main_annoucement: announcementLock.main_annoucement,
        activity_support_announcement: announcementLock.activity_support_announcement,
      };

      await apiClient.post(`/submissions/${submissionId}/fund-details`, fundDetailsPayload);

      const hasAttachmentChanges =
        documentsToDetach.size > 0 || Object.keys(uploadedFiles).length > 0;
      if (hasAttachmentChanges) {
        Swal.update({
          title: 'กำลังอัปเดตไฟล์แนบ...',
        });
      }
      await syncSubmissionDocuments(submissionId);

      Swal.close();
      setHasDraft(true);
      Toast.fire({
        icon: 'success',
        title: 'บันทึกร่างเรียบร้อยแล้ว',
        html: '<small>ระบบได้บันทึกร่างคำร้องของคุณบนเซิร์ฟเวอร์แล้ว</small>'
      });
    } catch (error) {
      console.error('Error saving draft:', error);
      Swal.close();
      Toast.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: error?.message || 'ไม่สามารถบันทึกร่างได้ โปรดลองอีกครั้ง'
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

    if (currentSubmissionId) {
      try {
        await submissionAPI.deleteSubmission(currentSubmissionId);
      } catch (deleteError) {
        console.warn('Failed to delete server-side draft:', deleteError);
      }
      setCurrentSubmissionId(null);
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
    setServerDocuments({});
    setUploadedFiles({});
    setDocumentsToDetach(() => new Set());
    setSubmissionStatusCode(null);
    setIsEditable(true);
    setIsNeedsMoreInfo(false);
    setReviewerComments({ admin: '', head: '' });
    resetAttachmentsPreview();
    setHasDraft(false);

    Toast.fire({
      icon: 'success',
      title: 'ลบร่างเรียบร้อยแล้ว'
    });

    const resolvedCategoryPage = resolveCategoryPageFromOrigin(categoryPage);
    const targetPage = navigationTarget || resolvedCategoryPage || 'research-fund';
    const navigationData = (() => {
      if (targetPage === 'promotion-fund' || targetPage === 'research-fund') {
        if (effectiveFundContext && Object.keys(effectiveFundContext).length > 0) {
          return { ...effectiveFundContext, submissionId: null, originPage: targetPage };
        }
        return { originPage: targetPage };
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
      const fallbackPage = targetPage || 'research-fund';
      router.push(`/member?initialPage=${fallbackPage}`);
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

      let submissionId = currentSubmissionId;
      const {
        yearId: contextYearId,
        categoryId: contextCategoryId,
        subcategoryId: contextSubcategoryId,
        budgetId: contextBudgetId,
      } = resolveFundContextIdentifiers(effectiveFundContext);
      if (!submissionId) {
        let statusForSubmission = pendingStatus;
        if (!statusForSubmission?.id) {
          statusForSubmission = await resolveDeptHeadPendingStatus({ force: true });
          setPendingStatus(statusForSubmission);
        }

        // Step 1: Create submission record (server defaults to draft status; status_id retained for backwards compatibility)
        const submissionPayload = {
          submission_type: 'fund_application',
          year_id: contextYearId,
          category_id: contextCategoryId,
          subcategory_id: contextSubcategoryId,
          subcategory_budget_id: contextBudgetId,
          contact_phone: formData.phone || '',
          bank_account: formData.bank_account || '',
          bank_account_name: formData.bank_account_name || '',
          bank_name: formData.bank_name || '',
        };
        if (statusForSubmission?.id) {
          submissionPayload.status_id = statusForSubmission.id;
        }
        const submissionRes = await submissionAPI.createSubmission(submissionPayload);
        submissionId = submissionRes?.submission?.submission_id;
        if (!submissionId) {
          throw new Error('ไม่สามารถสร้างคำร้องได้');
        }
        setCurrentSubmissionId(submissionId);
      } else {
        try {
          await submissionAPI.update(submissionId, {
            category_id: contextCategoryId,
            subcategory_id: contextSubcategoryId,
            subcategory_budget_id: contextBudgetId,
            contact_phone: formData.phone || '',
            bank_account: formData.bank_account || '',
            bank_account_name: formData.bank_account_name || '',
            bank_name: formData.bank_name || '',
          });
        } catch (updateError) {
          console.warn('Failed to update submission metadata before submit:', updateError);
        }
      }

      // Step 2: Save basic fund details (ใช้ข้อมูลที่มีอยู่)
      if (submissionId) {
        const fundDetailsPayload = {
          project_title: formData.project_title || '',
          project_description: formData.project_description || '',
          requested_amount: parseFloat(formData.requested_amount) || 0,
          subcategory_id: contextSubcategoryId,
          main_annoucement: announcementLock.main_annoucement,
          activity_support_announcement: announcementLock.activity_support_announcement,
        };

        await apiClient.post(`/submissions/${submissionId}/fund-details`, fundDetailsPayload);
      }

      // Step 3: Sync attachments with server (detach removed files, upload new ones)
      if (submissionId) {
        const hasAttachmentChanges =
          documentsToDetach.size > 0 || Object.keys(uploadedFiles).length > 0;
        if (hasAttachmentChanges) {
          Swal.update({
            title: 'กำลังอัปเดตไฟล์แนบ...',
          });
        }
        await syncSubmissionDocuments(submissionId);
      }

      // Step 4: Submit the submission
      if (submissionId) {
        const submissionDate = new Date();
        try {
          const installmentNumber = await fundInstallmentAPI.resolveInstallmentNumber({
            yearId: effectiveFundContext?.year_id ?? formData.year_id ?? null,
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
          const submitterDisplayName =
            typeof formData?.name === 'string' ? formData.name.trim() : '';
          await notificationsAPI.notifySubmissionSubmitted(submissionId, {
            submitter_name: submitterDisplayName,
          });
        } catch (notifyError) {
          console.warn('notifySubmissionSubmitted failed:', notifyError);
        }
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
        onNavigate(navigationTarget || 'research-fund');
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
    if (onNavigate && navigationTarget) {
      onNavigate(navigationTarget);
      return;
    }

    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/member");
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

  const fundDisplayName = firstNonEmptyString(
    effectiveFundContext?.subcategory?.fund_full_name,
    effectiveFundContext?.subcategory?.fund_name,
    effectiveFundContext?.subcategory?.subcategory_name,
    effectiveFundContext?.fund_full_name,
    effectiveFundContext?.fund_name,
    effectiveFundContext?.subcategory_name,
  );
  const pageTitle = `ยื่นขอ ${fundDisplayName || 'ทุน'}`;
  const pageSubtitle = 'กรุณากรอกข้อมูลให้ครบถ้วนก่อนส่งคำร้องเพื่อเข้าสู่การพิจารณา';
  const breadcrumbs = [
    { label: 'หน้าแรก', href: '/member' },
    { label: 'ทุนวิจัย', href: '/member?tab=research-fund' },
    { label: fundDisplayName || 'ยื่นคำร้อง' }
  ];
  const pendingStatusName = pendingStatus?.name || 'กำลังโหลดสถานะ...';
  const pendingStatusCode = pendingStatus?.code ?? '—';
  const formattedRequestedAmount = formatCurrency(formData.requested_amount || 0);
  const requiredDocumentCount = documentRequirements.filter((doc) => doc.required).length;
  const bannerPrimaryDescription = firstNonEmptyString(
    effectiveFundContext?.subcategory?.fund_full_name,
    effectiveFundContext?.subcategory?.fund_name,
    effectiveFundContext?.subcategory?.subcategory_name,
    effectiveFundContext?.subcategory_name
  );
  const bannerSecondaryDescription = firstNonEmptyString(
    effectiveFundContext?.subcategory?.fund_description,
    effectiveFundContext?.subcategory?.subcategory_description,
    effectiveFundContext?.subcategory?.fund_condition,
    effectiveFundContext?.fund_description,
    effectiveFundContext?.subcategory_description
  );
  const shouldShowFundBanner = Boolean(bannerPrimaryDescription || bannerSecondaryDescription);
  const showFundBanner = shouldShowFundBanner && !isReadOnly;
  const selectionLocked = Boolean(editingExistingSubmission);
  const shouldShowReviewerComments = isNeedsMoreInfo;
  const adminCommentDisplay = formatReviewerComment(reviewerComments.admin);
  const headCommentDisplay = formatReviewerComment(reviewerComments.head);
  const hasBudgetHints = budgetHintDisplayItems.length > 0;

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

        {isReadOnly && (
          <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800">
            ขณะนี้เป็นโหมด <strong>อ่านอย่างเดียว</strong> — ไม่สามารถแก้ไขหรือส่งคำร้องได้
          </div>
        )}

        {showFundBanner && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 flex-shrink-0 text-blue-500" aria-hidden="true" />
              <div className="space-y-2">
                <p className="font-medium text-blue-900">
                  แบบฟอร์มนี้กำลังใช้ทุน {bannerPrimaryDescription || 'ไม่ทราบชื่อทุน'}
                </p>
                {bannerSecondaryDescription && (
                  <p className="text-xs text-blue-700 sm:text-sm">
                    {bannerSecondaryDescription}
                  </p>
                )}
                {selectionLocked && (
                  <p className="text-xs text-blue-700 sm:text-sm">
                    ไม่สามารถเปลี่ยนทุนสำหรับคำร้องนี้ได้ กรุณาสร้างคำร้องใหม่หากต้องการเลือกทุนอื่น
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
                <div className="space-y-1">
                  <p className="font-semibold text-orange-800">คำร้องต้องการข้อมูลเพิ่มเติม</p>
                  <p className="text-sm text-orange-700">
                    กรุณาตรวจสอบและแก้ไขข้อมูลตามคำแนะนำก่อนส่งคำร้องอีกครั้ง
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-orange-600">ผู้ดูแลระบบ</p>
                  <p className="whitespace-pre-wrap text-sm">{adminCommentDisplay}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-orange-600">หัวหน้าสาขา</p>
                  <p className="whitespace-pre-wrap text-sm">{headCommentDisplay}</p>
                </div>
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
                    disabled={!canEdit}
                    className={`w-full rounded-lg border px-4 py-2.5 text-gray-700 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 ${
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

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700" htmlFor="bank-account">
                    เลขบัญชีธนาคาร
                  </label>
                  <input
                    id="bank-account"
                    type="text"
                    value={formData.bank_account}
                    onChange={(e) => handleInputChange('bank_account', e.target.value.replace(/\D/g, '').slice(0, 15))}
                    placeholder="กรอกเลขบัญชี 10-15 หลัก"
                    maxLength={15}
                    disabled={!canEdit}
                    className={`w-full rounded-lg border px-4 py-2.5 text-gray-700 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 ${
                      errors.bank_account ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-gray-300'
                    }`}
                  />
                  {errors.bank_account ? (
                    <p className="flex items-center gap-1 text-sm text-red-500">
                      <AlertCircle className="h-4 w-4" />
                      {errors.bank_account}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500">กรอกเฉพาะตัวเลข</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700" htmlFor="bank-account-name">
                    ชื่อบัญชีธนาคาร
                  </label>
                  <input
                    id="bank-account-name"
                    type="text"
                    value={formData.bank_account_name}
                    onChange={(e) => handleInputChange('bank_account_name', e.target.value)}
                    placeholder="ชื่อ-นามสกุลเจ้าของบัญชี"
                    disabled={!canEdit}
                    className={`w-full rounded-lg border px-4 py-2.5 text-gray-700 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 ${
                      errors.bank_account_name ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-gray-300'
                    }`}
                  />
                  {errors.bank_account_name ? (
                    <p className="flex items-center gap-1 text-sm text-red-500">
                      <AlertCircle className="h-4 w-4" />
                      {errors.bank_account_name}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500">กรอกชื่อ-นามสกุลตามหน้าสมุดบัญชี</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700" htmlFor="bank-name">
                    ชื่อธนาคาร
                  </label>
                  <input
                    id="bank-name"
                    type="text"
                    value={formData.bank_name}
                    onChange={(e) => handleInputChange('bank_name', e.target.value)}
                    placeholder="เช่น ธนาคารกรุงเทพ"
                    disabled={!canEdit}
                    className={`w-full rounded-lg border px-4 py-2.5 text-gray-700 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 ${
                      errors.bank_name ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-gray-300'
                    }`}
                  />
                  {errors.bank_name ? (
                    <p className="flex items-center gap-1 text-sm text-red-500">
                      <AlertCircle className="h-4 w-4" />
                      {errors.bank_name}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500">ระบุชื่อธนาคารที่ต้องการรับเงิน</p>
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
                    disabled={!canEdit}
                    className={`w-full rounded-lg border px-4 py-2.5 text-gray-700 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 ${
                      errors.project_title ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-gray-300'
                    }`}
                  />
                  {errors.project_title ? (
                    <p className="flex items-center gap-1 text-sm text-red-500">
                      <AlertCircle className="h-4 w-4" />
                      {errors.project_title}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500"></p>
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
                    disabled={!canEdit}
                    className={`w-full rounded-lg border px-4 py-3 text-gray-700 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 ${
                      errors.project_description ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-gray-300'
                    }`}
                  />
                  {errors.project_description ? (
                    <p className="flex items-center gap-1 text-sm text-red-500">
                      <AlertCircle className="h-4 w-4" />
                      {errors.project_description}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500"></p>
                  )}
                </div>
              </div>
            </SimpleCard>

            <SimpleCard
              title="รวมจำนวนทุนที่ขอ (Total Request Amount)"
              icon={DollarSign}
              bodyClassName="space-y-4"
            >
              <div className="grid gap-4 md:grid-cols-2 md:items-start">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700" htmlFor="requested-amount">
                    จำนวนเงินที่ขอ (บาท)
                  </label>
                  <input
                    id="requested-amount"
                    type="number"
                    min="0"
                    max={MAX_CURRENCY_AMOUNT}
                    value={formData.requested_amount}
                    onChange={(e) => handleInputChange('requested_amount', e.target.value)}
                    placeholder="0.00"
                    disabled={!canEdit}
                    className={`w-full rounded-lg border bg-gray-50 px-4 py-3 text-2xl font-semibold text-gray-800 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 ${
                      errors.requested_amount ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-gray-200'
                    }`}
                  />
                  {errors.requested_amount ? (
                    <p className="flex items-center gap-1 text-sm text-red-500">
                      <AlertCircle className="h-4 w-4" />
                      {errors.requested_amount}
                    </p>
                  ) : (
                    <div className="space-y-1 text-xs text-gray-500">
                      <p>กรอกตัวเลขจำนวนเต็มหรือทศนิยมได้ เช่น 50000 หรือ 50000.00</p>
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100">
                      <Info className="h-5 w-5 text-blue-600" aria-hidden="true" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-blue-600">Hint</p>
                        <p className="text-sm font-semibold text-blue-900">{budgetHintTitle}</p>
                      </div>
                      {budgetHintsLoading && !hasBudgetHints ? (
                        <p className="flex items-center gap-2 text-sm text-blue-700">
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                          กำลังโหลดข้อมูลเงื่อนไข...
                        </p>
                      ) : hasBudgetHints ? (
                        <ul className="space-y-2 text-sm text-blue-800">
                          {budgetHintDisplayItems.map((item) => (
                            <li key={item.id} className="flex items-start gap-2">
                              <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-400" aria-hidden="true"></span>
                              <span className="leading-relaxed">{item.text}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-blue-700">ไม่พบข้อมูลเงื่อนไขย่อยของทุนนี้</p>
                      )}
                      {budgetHintsLoading && hasBudgetHints && (
                        <p className="flex items-center gap-2 text-xs text-blue-600">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                          กำลังอัปเดตข้อมูลเงื่อนไข...
                        </p>
                      )}
                      {budgetHintsError && (
                        <p className="text-xs text-blue-600">{budgetHintsError}</p>
                      )}
                    </div>
                  </div>
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
                              {(() => {
                                const docTypeId = docType.document_type_id;
                                const docKey = String(docTypeId);
                                const uploadedFile = uploadedFiles[docTypeId];
                                const serverDoc = serverDocuments?.[docKey];

                                if (uploadedFile) {
                                  return (
                                    <div className="flex items-center justify-between gap-3 rounded-md border border-green-200 bg-green-50 p-3">
                                      <div className="flex min-w-0 items-center gap-3">
                                        <FileText className="h-5 w-5 flex-shrink-0 text-green-600" />
                                        <div className="min-w-0">
                                          <p className="truncate text-sm font-medium text-green-800" title={uploadedFile.name}>
                                            {uploadedFile.name}
                                          </p>
                                          <p className="text-xs text-green-700">{formatFileSize(uploadedFile.size)}</p>
                                          <p className="text-xs text-green-600">ไฟล์ใหม่ที่ยังไม่บันทึก</p>
                                        </div>
                                      </div>
                                      <div className="flex flex-shrink-0 items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => viewFile(docTypeId)}
                                          className="inline-flex items-center justify-center rounded-md border border-transparent bg-white px-2 py-1 text-xs font-medium text-blue-600 shadow-sm transition hover:border-blue-100 hover:bg-blue-50"
                                        >
                                          <Eye className="h-4 w-4" />
                                          <span className="ml-1 hidden sm:inline">ดูไฟล์</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveFile(docTypeId)}
                                          disabled={!canEdit || saving || submitting}
                                          className="inline-flex items-center justify-center rounded-md border border-transparent bg-white px-2 py-1 text-xs font-medium text-red-600 shadow-sm transition hover:border-red-100 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                          <X className="h-4 w-4" />
                                          <span className="ml-1 hidden sm:inline">ลบ</span>
                                        </button>
                                      </div>
                                    </div>
                                  );
                                }

                                if (serverDoc) {
                                  return (
                                    <div className="flex items-center justify-between gap-3 rounded-md border border-blue-200 bg-blue-50 p-3">
                                      <div className="flex min-w-0 items-center gap-3">
                                        <FileText className="h-5 w-5 flex-shrink-0 text-blue-600" />
                                        <div className="min-w-0">
                                          <p className="truncate text-sm font-medium text-blue-900" title={serverDoc.original_name || serverDoc.file_name}>
                                            {serverDoc.original_name || serverDoc.file_name || `ไฟล์ #${serverDoc.document_id || docTypeId}`}
                                          </p>
                                          {serverDoc.file_size != null && (
                                            <p className="text-xs text-blue-700">{formatFileSize(serverDoc.file_size)}</p>
                                          )}
                                          <p className="text-xs text-blue-600">ไฟล์ที่เคยส่งไว้ก่อนหน้า</p>
                                        </div>
                                      </div>
                                      <div className="flex flex-shrink-0 items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => handleDownloadServerFile(docTypeId)}
                                          disabled={!serverDoc.file_id}
                                          className="inline-flex items-center justify-center rounded-md border border-transparent bg-white px-2 py-1 text-xs font-medium text-blue-600 shadow-sm transition hover:border-blue-100 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                          <Download className="h-4 w-4" />
                                          <span className="ml-1 hidden sm:inline">ดาวน์โหลด</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveServerDocument(docTypeId)}
                                          disabled={!canEdit || saving || submitting}
                                          className="inline-flex items-center justify-center rounded-md border border-transparent bg-white px-2 py-1 text-xs font-medium text-red-600 shadow-sm transition hover:border-red-100 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                          <X className="h-4 w-4" />
                                          <span className="ml-1 hidden sm:inline">ลบ</span>
                                        </button>
                                      </div>
                                    </div>
                                  );
                                }

                                return (
                                  <FileUpload
                                    onFileSelect={(files) => handleFileUpload(docTypeId, files)}
                                    accept=".pdf"
                                    error={errors[`file_${docType.document_type_id}`]}
                                    compact
                                    disabled={!canEdit || saving || submitting}
                                  />
                                );
                              })()}
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
                <p className="text-xs text-gray-500">
                  {isNeedsMoreInfo
                    ? 'กรุณาแก้ไขข้อมูลตามคำแนะนำและกดส่งคำร้องอีกครั้ง'
                    : 'คุณสามารถบันทึกเป็นร่างเพื่อแก้ไขภายหลัง หรือส่งคำร้องเพื่อเข้าสู่การพิจารณา'}
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                  {!isNeedsMoreInfo && (
                    <button
                      type="button"
                      onClick={deleteDraft}
                      disabled={!canEdit || !hasDraft || saving || submitting}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg border border-red-300 px-6 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                    <X className="h-4 w-4" />
                    ลบร่าง
                  </button>
                )}
                {!isNeedsMoreInfo && (
                  <button
                    type="button"
                    onClick={saveDraft}
                    disabled={!canEdit || saving || submitting}
                    className="w-full sm:flex-1 flex items-center justify-center gap-2 rounded-lg bg-gray-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {saving ? 'กำลังบันทึก...' : 'บันทึกร่าง'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={submitApplication}
                  disabled={!canEdit || saving || submitting}
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