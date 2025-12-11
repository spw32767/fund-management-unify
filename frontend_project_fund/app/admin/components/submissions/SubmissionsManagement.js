// app/admin/components/submissions/SubmissionsManagement.js
'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Download, FileText } from 'lucide-react';
import PageLayout from '../common/PageLayout';
import SubmissionTable from './SubmissionTable';
import SubmissionFilters from './SubmissionFilters';
import PublicationSubmissionDetails from './PublicationSubmissionDetails';
import GeneralSubmissionDetails from './GeneralSubmissionDetails';
import { submissionsListingAPI, adminSubmissionAPI, commonAPI } from '../../../lib/admin_submission_api';
import { toast } from 'react-hot-toast';
import systemConfigAPI from '../../../lib/system_config_api';
import { useStatusMap } from '@/app/hooks/useStatusMap';
import SubmissionExportModal from './SubmissionExportModal';
import { downloadXlsx } from '@/app/admin/utils/xlsxExporter';
import apiClient from '@/app/lib/api';

// ----------- CONFIG -----------
const PAGE_SIZE  = 10;        // how many rows to show at a time
const FETCH_PAGE_LIMIT = 1000; // how many records to request from the API per page when aggregating

const EXPORT_COLUMNS = [
  { key: 'submissionNumber', header: 'เลขที่คำร้อง', width: 18 },
  { key: 'submissionId', header: 'Submission ID', width: 14 },
  { key: 'formType', header: 'ประเภทแบบฟอร์ม', width: 18 },
  { key: 'fiscalYear', header: 'ปีงบประมาณ', width: 14 },
  { key: 'categoryName', header: 'หมวดทุน', width: 22 },
  { key: 'subcategoryName', header: 'ประเภททุน', width: 22 },
  { key: 'fundDescription', header: 'รายละเอียดทุน', width: 26 },
  { key: 'title', header: 'ชื่อโครงการ/บทความ', width: 40 },
  { key: 'paperTitle', header: 'Paper Title', width: 40 },
  { key: 'applicantName', header: 'ชื่อผู้ยื่น', width: 26 },
  { key: 'applicantEmail', header: 'อีเมลผู้ยื่น', width: 28 },
  { key: 'coAuthors', header: 'รายชื่อผู้ร่วม', width: 36 },
  { key: 'requestedAmount', header: 'ยอดขอ (บาท)', width: 16 },
  { key: 'approvedAmount', header: 'ยอดอนุมัติ (บาท)', width: 18 },
  { key: 'netAmount', header: 'ยอดสุทธิ (บาท)', width: 18 },
  { key: 'statusLabel', header: 'สถานะ', width: 18 },
  { key: 'createdAt', header: 'สร้างเมื่อ', width: 20 },
  { key: 'submittedAt', header: 'ยื่นเมื่อ', width: 20 },
  { key: 'approvedAt', header: 'อนุมัติเมื่อ', width: 20 },
  { key: 'adminComment', header: 'หมายเหตุผู้ดูแล', width: 30 },
  { key: 'deptComment', header: 'หมายเหตุหัวหน้าสาขา', width: 30 },
  { key: 'announcementRef', header: 'เลขประกาศ/อ้างอิง', width: 24 },
  { key: 'journalName', header: 'วารสาร / แหล่งตีพิมพ์', width: 28 },
  { key: 'journalVolumeIssue', header: 'Volume/Issue', width: 18 },
  { key: 'journalPages', header: 'page_numbers', width: 18 },
  { key: 'journalIndexing', header: 'ฐานข้อมูล Indexing', width: 22 },
  { key: 'journalQuartile', header: 'Quartile', width: 14 },
  { key: 'publicationDate', header: 'วันที่เผยแพร่', width: 20 },
  { key: 'mergedSubmissionPdf', header: 'Merge submissions PDF', width: 42 },
];

const pickFirst = (...values) => {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return undefined;
};

const toNumberOrNull = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const formatDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(Math.abs(Math.trunc(n))).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const resolveFileURL = (filePath) => {
  if (!filePath) return '';
  if (/^https?:\/\//i.test(filePath)) return filePath;
  const base = apiClient.baseURL.replace(/\/?api\/v1$/, '');
  try {
    return new URL(filePath, base).href;
  } catch {
    return filePath;
  }
};

const extractMergedDocumentMeta = (source) => {
  if (!source || typeof source !== 'object') return null;
  const doc = source.merged_document || source.mergedDocument || source.MergedDocument;
  if (!doc || typeof doc !== 'object') return null;

  const file = doc.file || doc.File;
  const filePath = pickFirst(
    doc.file_path,
    doc.stored_path,
    doc.StoredPath,
    doc.relative_path,
    doc.RelativePath,
    doc.path,
    doc.url,
    doc.FilePath,
    doc.File?.stored_path,
    doc.File?.file_path,
    doc.File?.path,
    file?.stored_path,
    file?.StoredPath,
    file?.file_path,
    file?.path,
    file?.url,
  );

  if (!filePath) return null;

  const displayName = pickFirst(
    doc.display_name,
    doc.DisplayName,
    doc.original_name,
    doc.OriginalName,
    doc.file_name,
    doc.FileName,
    file?.original_name,
    file?.OriginalName,
    file?.file_name,
    file?.FileName,
  );

  return {
    filePath,
    displayName: displayName || 'merged_document.pdf',
  };
};

const getMergedDocumentExportValue = (...sources) => {
  for (const source of sources) {
    const meta = extractMergedDocumentMeta(source);
    if (meta) {
      const url = resolveFileURL(meta.filePath);
      return url;
    }
  }
  return '';
};

const normalizeYearValue = (value) => {
  if (value === undefined || value === null) return '';
  if (typeof value === 'number' || typeof value === 'string') {
    return String(value);
  }
  if (typeof value === 'object') {
    const candidates = [
      value.year,
      value.year_th,
      value.year_en,
      value.fiscal_year,
      value.year_name,
      value.name,
      value.label,
    ];

    for (const candidate of candidates) {
      if (candidate !== undefined && candidate !== null && candidate !== '') {
        return normalizeYearValue(candidate);
      }
    }

    if (value.year && typeof value.year === 'object') {
      return normalizeYearValue(value.year);
    }

    if (value.Year && typeof value.Year === 'object') {
      return normalizeYearValue(value.Year);
    }

    const str = value.toString?.();
    if (str && str !== '[object Object]') {
      return str;
    }
  }
  return '';
};

export default function SubmissionsManagement() {
  const { statuses, isLoading: statusLoading, getLabelById } = useStatusMap();
  // Views
  const [currentView, setCurrentView] = useState('list');
  const [selectedSubmissionId, setSelectedSubmissionId] = useState(null);
  const [selectedFormType, setSelectedFormType] = useState('');

  // Data stores
  const [allSubmissions, setAllSubmissions] = useState([]); // everything for selected year (raw)
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');

  // Filters (client-side only; no year_id here—year lives in selectedYear)
  const [filters, setFilters] = useState({
    category: '',
    subcategory: '',
    status: '',
    search: '',
    sort_by: 'created_at',
    sort_order: 'desc',
  });

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [pendingExportFilters, setPendingExportFilters] = useState({
    category: '',
    subcategory: '',
    status: '',
    search: '',
    sort_by: 'created_at',
    sort_order: 'desc',
  });
  const [exporting, setExporting] = useState(false);
  const [autoExportRequested, setAutoExportRequested] = useState(false);

  // UI state
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState({
    total_submissions: 0,
    dept_head_pending_count: 0,
    pending_count: 0,
    approved_count: 0,
    rejected_count: 0,
    revision_count: 0
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1); // เลขหน้า (เริ่มที่ 1)
  const [cursor, setCursor] = useState(0);           // index เริ่มของหน้า (sync จาก currentPage)
  const latestReq = useRef(0);                       // race token for fetch-all

  // Lookup maps for names/descriptions
  const [catMap, setCatMap] = useState({});
  const [subMap, setSubMap] = useState({});
  const [budgetMap, setBudgetMap] = useState({});
  const [subBudgetDescMap, setSubBudgetDescMap] = useState({});
  const [detailsMap, setDetailsMap] = useState({});
  const [userMap, setUserMap] = useState({});

  // ---------- YEARS ----------
  const fetchYears = async () => {
    try {
      // ดึง "รายการปี" และ "system window" พร้อมกัน
      const [yearsRes, winRaw] = await Promise.all([
        commonAPI.getYears(),
        systemConfigAPI.getWindow(),
      ]);

      const list = yearsRes?.years && Array.isArray(yearsRes.years) ? yearsRes.years : [];
      setYears(list);

      // normalize แล้วดึง current_year
      const win = systemConfigAPI.normalizeWindow(winRaw);
      const cur = win?.current_year ?? null;

      // จับคู่ current_year -> year_id
      let prefer;
      if (cur != null && list.length) {
        // เทียบทั้ง field year และ year_id เผื่อฝั่งหลังบ้านส่งเป็นเลขปี BE หรือ id โดยตรง
        prefer =
          list.find(y => String(y.year) === String(cur)) ||
          list.find(y => String(y.year_id) === String(cur));
      }

      // fallback: is_current > รายการแรก
      if (!prefer && list.length) {
        prefer = list.find(y => y.is_current) || list[0];
      }

      if (!selectedYear && prefer) {
        setSelectedYear(String(prefer.year_id));
      }
    } catch (err) {
      console.error('Error fetching years/current_year:', err);
      toast.error('ไม่สามารถดึงข้อมูลปีงบประมาณ/ปีปัจจุบันได้');
    }
  };

  useEffect(() => { fetchYears(); }, []); // initial only

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const shouldExport = localStorage.getItem('adminAutoExport');
    if (shouldExport) {
      localStorage.removeItem('adminAutoExport');
      setAutoExportRequested(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const focusPending = localStorage.getItem('adminPendingFocus');
    if (!focusPending) return;

    localStorage.removeItem('adminPendingFocus');
    const pendingStatus = statuses.find((s) => {
      const name = String(s?.status_name || s?.name || '').toLowerCase();
      const code = String(s?.status_code || s?.slug || '').toLowerCase();
      return name.includes('pending') || name.includes('รอดำเนินการ') || code.includes('pending');
    });

    const pendingValue = pendingStatus
      ? String(pendingStatus.status_id ?? pendingStatus.id ?? '')
      : '1';

    setFilters((prev) => ({ ...prev, status: pendingValue }));
  }, [statuses]);

  // ---------- FETCH-ALL for selected year (no backend pagination in UI) ----------
  const fetchAllForYear = async (yearId) => {
    setLoading(true);
    const reqId = ++latestReq.current;
    try {
      let page = 1;
      let done = false;
      const aggregate = [];

      while (!done) {
        const params = {
          page,
          limit: FETCH_PAGE_LIMIT,   // ↑ increase backend page size to reduce missing records
          year_id: yearId || '',
          sort_by: 'created_at',
          sort_order: 'desc',
        };

        const res = await submissionsListingAPI.getAdminSubmissions(params);
        if (reqId !== latestReq.current) return; // race protection

        const chunk = res?.submissions || res?.data || [];
        const normalizedChunk = Array.isArray(chunk)
          ? chunk.map((item) => {
              if (item && typeof item === 'object') {
                if (item.merged_document && !item.mergedDocument) {
                  item.mergedDocument = item.merged_document;
                } else if (item.mergedDocument && !item.merged_document) {
                  item.merged_document = item.mergedDocument;
                }
              }
              return item;
            })
          : [];
        aggregate.push(...normalizedChunk);

        // stop if we've clearly reached the last page or exhausted available records
        const paginationRaw = res?.pagination || {};
        const totalPages = paginationRaw.total_pages ?? paginationRaw.totalPages ?? 0;
        const totalItems =
          paginationRaw.total_items ??
          paginationRaw.total ??
          paginationRaw.total_count ??
          paginationRaw.totalCount ??
          0;
        const hasNext =
          typeof paginationRaw.has_next === 'boolean'
            ? paginationRaw.has_next
            : typeof paginationRaw.hasNext === 'boolean'
            ? paginationRaw.hasNext
            : typeof paginationRaw.has_more === 'boolean'
            ? paginationRaw.has_more
            : null;
        const chunkLength = normalizedChunk.length;
        const pageLimit = params.limit ?? FETCH_PAGE_LIMIT;
        const currentPage = paginationRaw.current_page ?? paginationRaw.currentPage ?? page;

        const reachedTotalPages = totalPages ? currentPage >= totalPages : false;
        const reachedTotalItems = totalItems ? aggregate.length >= totalItems : false;
        const shouldContinue =
          chunkLength > 0 &&
          hasNext !== false &&
          !reachedTotalPages &&
          !reachedTotalItems &&
          (hasNext === true || totalPages || totalItems || chunkLength >= pageLimit);

        if (shouldContinue) {
          page += 1;
        } else {
          done = true;
        }

        // safety cap
        if (aggregate.length > 10000) done = true;
      }

      // Client-side hard filter by year (belt & suspenders)
      const Y = String(yearId || '');
      const filteredByYear = Y
        ? aggregate.filter(s => String(s.year_id) === Y || String(s.Year?.year_id) === Y)
        : aggregate;

      // NEW: de-dupe โดยใช้ submission_id/id เป็นคีย์
      const uniqMap = new Map();
      for (const s of filteredByYear) {
        const k = String(s?.submission_id ?? s?.id ?? '');
        if (!k || !uniqMap.has(k)) uniqMap.set(k, s);
      }
      const uniq = Array.from(uniqMap.values());

      setAllSubmissions(uniq);
      // สถิติให้คำนวณจาก uniq เพื่อไม่ให้ “คำร้องทั้งหมด” เพี้ยน
      const countBy = (id) => uniq.filter(r => Number(r.status_id) === id).length;
      setStatistics({
        total_submissions: uniq.length,
        dept_head_pending_count: countBy(5),
        pending_count: countBy(1),
        approved_count: countBy(2),
        rejected_count: countBy(3),
        revision_count: countBy(4),
      });

      // Prime userMap from rows that already include User/applicant on the list rows
      try {
        const initial = {};
        const pickName = (u) => {
          if (!u) return '';
          const display = u.display_name || u.DisplayName || u.full_name || u.FullName || '';
          const first = u.user_fname || u.first_name || u.given_name || u.UserFname || u.FirstName || u.GivenName || u.name_th || u.name || '';
          const last  = u.user_lname || u.last_name || u.family_name || u.UserLname || u.LastName || u.FamilyName || u.surname_th || u.surname || '';
          const email = u.email || u.user_email || u.Email || u.UserEmail || '';
          const username = u.username || u.UserName || '';
          return (display || `${first} ${last}`.trim()).trim() || email || username;
        };
        filteredByYear.forEach(r => {
          const u = r?.User || r?.user || r?.applicant;
          const id = String(r?.user_id || u?.user_id || '');
          const name = pickName(u);
          if (id && name) initial[id] = name;
        });
        if (Object.keys(initial).length) {
          setUserMap(prev => ({ ...initial, ...prev }));
        }
      } catch (e) {
        console.warn('prime userMap failed:', e);
      }

      setCurrentPage(1); // เริ่มที่หน้าแรก
      setCursor(0);

      try {
        const fs = await commonAPI.getFundStructure(); // GET /funds/structure

        const cMap = {}, sMap = {}, bMap = {}, subDescMap = {};
        const categories = fs?.categories || fs?.data?.categories || [];

        categories.forEach(cat => {
          const catId = cat.category_id ?? cat.id;
          const catName = cat.category_name ?? cat.name;
          if (catId != null) cMap[String(catId)] = catName || `หมวดทุน ${catId}`;

          const subs = cat.subcategories || cat.children || [];
          subs.forEach(sc => {
            const sid = sc.subcategory_id ?? sc.id;
            const sname = sc.subcategory_name ?? sc.name;
            if (sid != null) sMap[String(sid)] = sname || `ประเภททุน ${sid}`;

            const budgets = sc.subcategory_budgets || sc.budgets || sc.children || [];
            budgets.forEach(b => {
              const bid  = b.subcategory_budget_id ?? b.id;
              const desc = b.fund_description ?? b.description ?? '';
              if (bid != null) bMap[String(bid)] = desc;
              if (sid != null && !subDescMap[String(sid)] && desc) subDescMap[String(sid)] = desc;
            });
          });
        });

        setCatMap(cMap);
        setSubMap(sMap);
        setBudgetMap(bMap);
        setSubBudgetDescMap(subDescMap);
      } catch (e) {
        console.warn('Failed to load fund structure; will fallback to IDs', e);
      }

    } catch (err) {
      if (reqId === latestReq.current) {
        console.error('Error fetching submissions:', err);
        toast.error('ไม่สามารถดึงข้อมูลคำร้องได้');
      }
    } finally {
      if (reqId === latestReq.current) setLoading(false);
    }
  };

  // ---------- CLIENT FILTER + SORT + SEARCH ----------
  const filterAndSortSubmissions = useCallback(
    (source, activeFilters, options = {}) => {
      if (!Array.isArray(source)) return [];

      const detailLookup = options.details || detailsMap;
      const f = activeFilters || {};
      let arr = source;

      if (f.category) {
        arr = arr.filter((s) => String(s.category_id) === String(f.category));
      }
      if (f.subcategory) {
        arr = arr.filter((s) => String(s.subcategory_id) === String(f.subcategory));
      }
      if (f.status) {
        arr = arr.filter((s) => String(s.status_id) === String(f.status));
      }

      if (f.search?.trim()) {
        const q = f.search.trim().toLowerCase();
        const statusText = (sid) => getLabelById(sid) || '';
        const norm = (v) => (v ?? '').toString().toLowerCase();

        arr = arr.filter((s) => {
          const subno = norm(s.submission_number);
          const catName =
            s?.Category?.category_name ||
            (s?.category_id != null ? catMap[String(s.category_id)] : undefined) ||
            s?.category_name || '';

          const dp = detailLookup?.[s.submission_id];
          const dpo = dp?.details?.data || dp?.data || dp || {};
          const article =
            s?.FundApplicationDetail?.project_title ||
            s?.PublicationRewardDetail?.paper_title ||
            dpo?.project_title ||
            dpo?.paper_title ||
            s?.title || '';

          const subName =
            s?.Subcategory?.subcategory_name ||
            (s?.subcategory_id != null ? subMap[String(s.subcategory_id)] : undefined) ||
            s?.FundApplicationDetail?.Subcategory?.subcategory_name ||
            dpo?.Subcategory?.subcategory_name ||
            s?.subcategory_name || '';

          const listAuthor =
            s?.User?.user_fname && s?.User?.user_lname
              ? `${s.User.user_fname} ${s.User.user_lname}`
              : s?.User?.email || '';
          const authorFromMap = s?.user_id ? userMap[String(s.user_id)] : '';
          const author = authorFromMap || listAuthor || '';

          const rawAmt = Number(
            (dpo?.total_amount ??
              dpo?.total_reward_amount ??
              dpo?.net_amount ??
              dpo?.requested_amount ??
              dpo?.approved_amount ??
              ((dpo?.reward_amount || 0) +
                (dpo?.revision_fee || 0) +
                (dpo?.publication_fee || 0) -
                (dpo?.external_funding_amount || 0))) ||
              (s?.approved_amount ?? s?.requested_amount ?? s?.amount ?? 0)
          );
          const amtStr = Number.isFinite(rawAmt) ? rawAmt.toString() : '';
          const amtFmt = Number.isFinite(rawAmt) ? rawAmt.toLocaleString() : '';

          const statusStr = norm(s.display_status || s.status?.status_name || statusText(s.status_id));

          const dateVal =
            s?.display_date ||
            s?.submitted_at ||
            s?.created_at ||
            s?.admin_approved_at ||
            s?.head_approved_at ||
            '';
          const dateStr = dateVal ? new Date(dateVal).toLocaleDateString('th-TH') : '';

          const fields = [
            subno,
            norm(catName),
            norm(subName),
            norm(article),
            norm(author),
            amtStr,
            amtFmt,
            statusStr,
            norm(dateStr),
          ];

          return fields.some((field) => field && field.includes(q));
        });
      }

      if (options.skipSort) {
        return [...arr];
      }

      const order = (f.sort_order || 'desc').toLowerCase();
      const sortBy = f.sort_by || 'created_at';

      const val = (s) => {
        switch (sortBy) {
          case 'updated_at':
            return new Date(s.updated_at || s.update_at || 0).getTime();
          case 'submitted_at':
            return new Date(s.submitted_at || 0).getTime();
          case 'approved_at':
            return new Date(s.admin_approved_at || s.head_approved_at || 0).getTime();
          case 'submission_number':
            return (s.submission_number || '').toString();
          case 'status_id':
            return Number(s.status_id) || 0;
          case 'created_at':
          default:
            return new Date(s.created_at || s.create_at || 0).getTime();
        }
      };

      const arrCopy = [...arr].sort((a, b) => {
        const A = val(a);
        const B = val(b);
        if (typeof A === 'string' || typeof B === 'string') {
          return order === 'asc'
            ? String(A).localeCompare(String(B))
            : String(B).localeCompare(String(A));
        }
        return order === 'asc' ? A - B : B - A;
      });

      return arrCopy;
    },
    [catMap, subMap, userMap, detailsMap, getLabelById]
  );

  const filteredAndSorted = useMemo(() => {
    return filterAndSortSubmissions(allSubmissions, filters);
  }, [allSubmissions, filters, filterAndSortSubmissions]);

  // ---------- helper: build display name from mixed casing ----------
  const nameFromUser = (u) => {
    if (!u) return '';
    const display =
      u.display_name || u.DisplayName || u.full_name || u.FullName || '';
    const first =
      u.user_fname || u.first_name || u.given_name ||
      u.UserFname || u.FirstName || u.GivenName ||
      u.name_th || u.name || '';
    const last =
      u.user_lname || u.last_name || u.family_name ||
      u.UserLname || u.LastName || u.FamilyName ||
      u.surname_th || u.surname || '';
    const email = u.email || u.user_email || u.Email || u.UserEmail || '';
    const username = u.username || u.UserName || '';
    return (display || `${first} ${last}`.trim()).trim() || email || username;
  };

  const emailFromUser = (u, visited = new Set()) => {
    if (!u || visited.has(u)) return '';

    if (typeof u === 'string') {
      return /@/.test(u) ? u : '';
    }

    if (typeof u !== 'object') return '';

    visited.add(u);

    const directEmail = pickFirst(
      u.email,
      u.user_email,
      u.Email,
      u.UserEmail,
      u.contact_email,
      u.ContactEmail,
      u.primary_email,
      u.PrimaryEmail
    );
    if (directEmail) return directEmail;

    const nestedKeys = [
      'user',
      'User',
      'profile',
      'Profile',
      'contact',
      'Contact',
      'applicant',
      'Applicant'
    ];

    for (const key of nestedKeys) {
      const nestedValue = u[key];
      if (!nestedValue) continue;
      if (Array.isArray(nestedValue)) {
        for (const nested of nestedValue) {
          const nestedEmail = emailFromUser(nested, visited);
          if (nestedEmail) return nestedEmail;
        }
      } else {
        const nestedEmail = emailFromUser(nestedValue, visited);
        if (nestedEmail) return nestedEmail;
      }
    }

    if (typeof u.toJSON === 'function') {
      const json = u.toJSON();
      if (json && json !== u) {
        const jsonEmail = emailFromUser(json, visited);
        if (jsonEmail) return jsonEmail;
      }
    }

    return '';
  };

  const buildExportRow = useCallback(
    (row, detailLookup) => {
      const lookup = detailLookup || detailsMap;
      const detailWrapper = lookup?.[row.submission_id];
      const detailPayload =
        detailWrapper?.details?.data ||
        detailWrapper?.data ||
        detailWrapper?.payload ||
        detailWrapper ||
        {};

      const submissionObj =
        detailWrapper?.submission ||
        detailWrapper?.Submission ||
        detailPayload?.submission ||
        detailPayload?.Submission ||
        row ||
        {};

      const rawType =
        (detailWrapper?.details?.type ||
          detailPayload?.type ||
          row?.form_type ||
          row?.submission_type ||
          submissionObj?.form_type ||
          submissionObj?.submission_type ||
          '')
          .toString()
          .toLowerCase();

      const formTypeLabel = (() => {
        if (!rawType) return '';
        if (rawType === 'publication_reward') return 'Publication Reward';
        if (rawType === 'fund_application') return 'Fund Application';
        return rawType.replace(/_/g, ' ');
      })();

      const categoryName =
        row?.Category?.category_name ||
        submissionObj?.Category?.category_name ||
        detailPayload?.Category?.category_name ||
        (row?.category_id != null
          ? catMap[String(row.category_id)]
          : submissionObj?.category_id != null
          ? catMap[String(submissionObj.category_id)]
          : undefined) ||
        row?.category_name ||
        submissionObj?.category_name ||
        '';

      const subcategoryId = pickFirst(
        row?.subcategory_id,
        submissionObj?.subcategory_id,
        detailPayload?.subcategory_id,
        detailPayload?.Subcategory?.subcategory_id,
        detailPayload?.FundApplicationDetail?.subcategory_id
      );

      const subcategoryName =
        row?.Subcategory?.subcategory_name ||
        submissionObj?.Subcategory?.subcategory_name ||
        detailPayload?.Subcategory?.subcategory_name ||
        detailPayload?.FundApplicationDetail?.Subcategory?.subcategory_name ||
        (subcategoryId != null ? subMap[String(subcategoryId)] : undefined) ||
        row?.subcategory_name ||
        submissionObj?.subcategory_name ||
        '';

      const fundDescription =
        (row?.subcategory_budget_id != null
          ? budgetMap[String(row.subcategory_budget_id)]
          : undefined) ||
        (subcategoryId != null ? subBudgetDescMap[String(subcategoryId)] : undefined) ||
        detailPayload?.fund_description ||
        submissionObj?.fund_description ||
        '';

      const title =
        detailPayload?.project_title ||
        detailPayload?.paper_title ||
        detailPayload?.FundApplicationDetail?.project_title ||
        detailPayload?.PublicationRewardDetail?.paper_title ||
        row?.FundApplicationDetail?.project_title ||
        row?.PublicationRewardDetail?.paper_title ||
        submissionObj?.project_title ||
        submissionObj?.paper_title ||
        row?.title ||
        '';

      const applicantObj =
        detailPayload?.applicant ||
        detailPayload?.user ||
        detailPayload?.User ||
        submissionObj?.applicant ||
        submissionObj?.user ||
        submissionObj?.User ||
        row?.applicant ||
        row?.user ||
        row?.User ||
        null;

      const applicantName =
        (applicantObj && nameFromUser(applicantObj)) ||
        (row?.user_id ? userMap[String(row.user_id)] : '') ||
        '';

      const applicantEmail =
        emailFromUser(applicantObj) ||
        emailFromUser(applicantObj?.User) ||
        emailFromUser(applicantObj?.user) ||
        emailFromUser(detailPayload?.user) ||
        emailFromUser(detailPayload?.User) ||
        emailFromUser(submissionObj?.user) ||
        emailFromUser(submissionObj?.User) ||
        emailFromUser(row?.user) ||
        emailFromUser(row?.User) ||
        emailFromUser(row?.applicant) ||
        row?.User?.email ||
        row?.User?.user_email ||
        row?.user?.email ||
        row?.user?.user_email ||
        row?.applicant?.email ||
        row?.applicant?.user_email ||
        '';

      const coAuthorCandidates =
        detailPayload?.co_authors ||
        detailPayload?.CoAuthors ||
        detailPayload?.coAuthors ||
        detailPayload?.authors ||
        submissionObj?.co_authors ||
        [];

      const coAuthors = (() => {
        if (Array.isArray(coAuthorCandidates)) {
          const mapped = coAuthorCandidates
            .map((person) => {
              if (!person) return '';
              if (typeof person === 'string') return person.trim();
              const name = nameFromUser(person);
              const email = emailFromUser(person);
              if (name && email) return `${name} <${email}>`;
              return name || email || '';
            })
            .filter(Boolean);
          return mapped.join('; ');
        }
        if (typeof coAuthorCandidates === 'string') {
          return coAuthorCandidates;
        }
        return '';
      })();

      const requestedAmount =
        toNumberOrNull(
          pickFirst(
            detailPayload?.requested_amount,
            detailPayload?.total_amount,
            detailPayload?.FundApplicationDetail?.requested_amount,
            detailPayload?.PublicationRewardDetail?.requested_amount,
            submissionObj?.requested_amount,
            row?.requested_amount
          )
        ) ?? undefined;

      const approvedAmount =
        toNumberOrNull(
          pickFirst(
            detailPayload?.approved_amount,
            detailPayload?.total_approved_amount,
            detailPayload?.total_approve_amount,
            detailPayload?.FundApplicationDetail?.approved_amount,
            detailPayload?.PublicationRewardDetail?.approved_amount,
            detailPayload?.PublicationRewardDetail?.total_approve_amount,
            submissionObj?.approved_amount,
            submissionObj?.total_approved_amount,
            submissionObj?.total_approve_amount,
            row?.approved_amount,
            row?.total_approved_amount,
            row?.total_approve_amount
          )
        ) ?? undefined;

      const netAmount =
        toNumberOrNull(
          pickFirst(
            detailPayload?.net_amount,
            detailPayload?.total_reward_amount,
            detailPayload?.total_requested_amount,
            (requestedAmount != null && approvedAmount != null
              ? Math.max(approvedAmount, requestedAmount)
              : null),
            submissionObj?.net_amount,
            row?.net_amount
          )
        ) ?? undefined;

      const statusLabel =
        row?.display_status ||
        row?.status?.status_name ||
        submissionObj?.status?.status_name ||
        getLabelById(row?.status_id) ||
        getLabelById(submissionObj?.status_id) ||
        '';

      const createdAt = formatDateTime(
        pickFirst(row?.created_at, row?.create_at, submissionObj?.created_at)
      );
      const submittedAt = formatDateTime(
        pickFirst(
          row?.submitted_at,
          submissionObj?.submitted_at,
          detailPayload?.submitted_at
        )
      );
      const timestampSources = [
        submissionObj,
        detailPayload,
        detailPayload?.FundApplicationDetail,
        detailPayload?.PublicationRewardDetail,
        row,
      ];

      const readTimestamp = (fieldNames) => {
        for (const source of timestampSources) {
          if (!source || typeof source !== 'object') continue;
          for (const field of fieldNames) {
            const value = source[field];
            if (value !== undefined && value !== null && value !== '') {
              return value;
            }
          }
        }
        return undefined;
      };

      const adminApprovedRaw = readTimestamp([
        'admin_approved_at',
        'adminApprovedAt',
      ]);
      const approvalDateRaw = readTimestamp([
        'approval_date',
        'approvalDate',
        'approved_date',
        'approvedDate',
        'approve_date',
        'approveDate',
      ]);
      const headApprovedRaw = readTimestamp([
        'head_approved_at',
        'headApprovedAt',
      ]);

      const approvedAt = formatDateTime(
        pickFirst(
          adminApprovedRaw,
          approvalDateRaw,
          headApprovedRaw
        )
      );

      const adminComment =
        pickFirst(
          detailPayload?.admin_comment,
          detailPayload?.admin_note,
          submissionObj?.admin_comment,
          submissionObj?.admin_note,
          row?.admin_comment
        ) || '';

      const deptComment =
        pickFirst(
          detailPayload?.dept_head_comment,
          detailPayload?.department_comment,
          detailPayload?.DepartmentComment,
          submissionObj?.dept_head_comment,
          row?.dept_head_comment
        ) || '';

      const announcementRef =
        pickFirst(
          detailPayload?.announcement_reference_number,
          detailPayload?.announcement_number,
          submissionObj?.announcement_reference_number,
          submissionObj?.announcement_number,
          row?.announcement_reference_number
        ) || '';

      const publicationDetail =
        detailPayload?.PublicationRewardDetail || detailPayload?.publication || detailPayload;

      const paperTitle =
        pickFirst(
          publicationDetail?.paper_title,
          detailPayload?.paper_title,
          detailPayload?.FundApplicationDetail?.paper_title,
          detailPayload?.PublicationRewardDetail?.paper_title,
          row?.PublicationRewardDetail?.paper_title,
          submissionObj?.paper_title,
          title
        ) || '';

      const journalName = pickFirst(
        publicationDetail?.journal_name,
        publicationDetail?.journal,
        publicationDetail?.journal_title
      );
      const volume = pickFirst(publicationDetail?.volume, publicationDetail?.volume_no);
      const issue = pickFirst(publicationDetail?.issue, publicationDetail?.issue_no);
      const volumeIssue = pickFirst(
        publicationDetail?.volume_issue,
        volume || issue ? [volume, issue].filter(Boolean).join('/') : null
      );
      const pageStart = pickFirst(
        publicationDetail?.page_start,
        publicationDetail?.pageStart,
        detailPayload?.page_start
      );
      const pageEnd = pickFirst(
        publicationDetail?.page_end,
        publicationDetail?.pageEnd,
        detailPayload?.page_end
      );
      const pages = pickFirst(
        publicationDetail?.page_numbers,
        publicationDetail?.page_range,
        publicationDetail?.pages,
        pageStart || pageEnd ? [pageStart, pageEnd].filter(Boolean).join('-') : null
      );
      const indexing = pickFirst(publicationDetail?.indexing, publicationDetail?.database);
      const quartile = pickFirst(publicationDetail?.quartile, publicationDetail?.quartile_level);

      const publicationRawDate = pickFirst(
        publicationDetail?.publication_date,
        publicationDetail?.published_at,
        publicationDetail?.accept_date
      );
      const publicationDate =
        formatDateTime(publicationRawDate) ||
        pickFirst(
          publicationDetail?.publication_year,
          publicationDetail?.published_year,
          publicationDetail?.publish_year,
          publicationDetail?.year
        ) ||
        '';

      const fiscalYear = pickFirst(
        row?.Year?.year_th,
        row?.Year?.year,
        row?.Year,
        row?.year_th,
        row?.year,
        submissionObj?.Year?.year_th,
        submissionObj?.Year?.year,
        submissionObj?.Year,
        submissionObj?.year_th,
        submissionObj?.year,
        detailPayload?.Year?.year_th,
        detailPayload?.Year?.year,
        detailPayload?.Year,
        detailPayload?.year_th,
        detailPayload?.year
      );

      const yearIdCandidate = pickFirst(
        row?.year_id,
        row?.Year?.year_id,
        submissionObj?.year_id,
        submissionObj?.Year?.year_id,
        detailPayload?.year_id,
        detailPayload?.Year?.year_id,
        selectedYear
      );

      const normalizedFiscalYear = normalizeYearValue(fiscalYear);

      let fiscalYearLabel = normalizedFiscalYear;
      if (!fiscalYearLabel && yearIdCandidate != null) {
        const yearMatch = years.find(
          (item) => String(item?.year_id) === String(yearIdCandidate)
        );
        if (yearMatch) {
          fiscalYearLabel =
            normalizeYearValue(yearMatch) ||
            normalizeYearValue(yearMatch?.year) ||
            String(yearMatch.year ?? yearMatch.year_id);
        }
      }

      if (!fiscalYearLabel && fiscalYear != null && fiscalYear !== '') {
        fiscalYearLabel = String(fiscalYear);
      }

      if (!fiscalYearLabel && yearIdCandidate != null) {
        fiscalYearLabel = String(yearIdCandidate);
      }

      const mergedPdfValue = getMergedDocumentExportValue(row, submissionObj, detailPayload);

      return {
        submissionNumber: row?.submission_number || submissionObj?.submission_number || '',
        submissionId: row?.submission_id || submissionObj?.submission_id || row?.id || '',
        formType: formTypeLabel,
        fiscalYear: fiscalYearLabel,
        categoryName,
        subcategoryName,
        fundDescription,
        title,
        paperTitle,
        applicantName,
        applicantEmail,
        coAuthors,
        requestedAmount,
        approvedAmount,
        netAmount,
        statusLabel,
        createdAt,
        submittedAt,
        approvedAt,
        adminComment,
        deptComment,
        announcementRef,
        journalName: journalName || '',
        journalVolumeIssue: volumeIssue || '',
        journalPages: pages || '',
        journalIndexing: indexing || '',
        journalQuartile: quartile || '',
        publicationDate,
        mergedSubmissionPdf: mergedPdfValue,
      };
    },
    [
      budgetMap,
      catMap,
      subBudgetDescMap,
      subMap,
      userMap,
      detailsMap,
      getLabelById,
      years,
      selectedYear,
    ]
  );

  // When year changes → fetch all for that year; reset window
  useEffect(() => {
    if (currentView === 'list' && selectedYear !== undefined) {
      fetchAllForYear(selectedYear);
    }
  }, [currentView, selectedYear]); // single effect; no duplicate triggers

  // Fetch details for the visible 20 rows (for amount & author fallback)
  useEffect(() => {
    const visible = filteredAndSorted.slice(cursor, cursor + PAGE_SIZE);

    // fetch details for ANY visible row that doesn't have details yet
    const need = visible
      .filter(s => !detailsMap[s.submission_id])
      .map(s => s.submission_id);

    if (!need.length) return;

    let cancelled = false;
    (async () => {
      try {
        const results = await Promise.allSettled(
          need.map(id => adminSubmissionAPI.getSubmissionDetails(id))
        );
        if (cancelled) return;

        const add = {};
        results.forEach((r, i) => {
          if (r.status === 'fulfilled') add[need[i]] = r.value;
        });
        if (Object.keys(add).length) {
          setDetailsMap(prev => ({ ...prev, ...add }));
          try {
            const addUsers = {};
            Object.entries(add).forEach(([submId, dp]) => {
              const dpo =
                dp?.details?.data ||
                dp?.data ||
                dp?.payload ||
                dp || {};

              // ดึง canonical applicant_id ของคำร้องนี้จาก details (ถ้ามี)
              const applicantId =
                dpo?.submission?.user_id ??
                dpo?.Submission?.user_id ??
                dp?.submission?.user_id ??
                dp?.Submission?.user_id ?? null;

              // ดึงข้อมูล user ของเจ้าของ (ถ้ามี object)
              const ownerObj =
                dpo?.submission?.User || dpo?.Submission?.User ||
                dp?.submission?.User || dp?.Submission?.User ||
                dpo?.User || dp?.User || null;

              if (applicantId) {
                const idStr = String(applicantId);
               // prefer ownerObj from submission join; fallback to applicant object if available
                const applicantObj = dpo?.applicant || dp?.applicant || null;
                let name = ownerObj ? nameFromUser(ownerObj) : '';
                if (!name && applicantObj) {
                  name = nameFromUser(applicantObj);
                }
                // map เฉพาะผู้ยื่น (applicant) → ชื่อ
                if (name) {
                  addUsers[idStr] = name;
                }
                // ไม่เติมชื่อจาก submission_users / co-authors / approvers
              }
            });

            if (Object.keys(addUsers).length) {
              setUserMap(prev => ({ ...prev, ...addUsers }));
            }
          } catch (e) {
            console.warn('build addUsers (applicant-only) failed:', e);
          }
        }
      } catch {
        // ignore; leave cells as fallbacks
      }
    })();

    return () => { cancelled = true; };
  }, [cursor, filteredAndSorted, detailsMap]);

  // Dedupe ตาม submission_id/id ป้องกัน key ชนจากการรวมหลายหน้า
  const deduped = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const s of filteredAndSorted) {
      const k = String(s?.submission_id ?? s?.id ?? '');
      if (!k) { out.push(s); continue; } // ถ้าไม่มี id ก็ปล่อยผ่าน (หรือจะทำคีย์คอมโพสิตก็ได้)
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(s);
    }
    return out;
  }, [filteredAndSorted]);

  // หน้า & แบ่งหน้า
  const totalPages = Math.max(1, Math.ceil(deduped.length / PAGE_SIZE));
  useEffect(() => {
    // sync cursor จาก currentPage เสมอ (เพื่อคง prop/JSX อื่น ๆ ที่อ้าง cursor)
    const start = (Math.min(Math.max(1, currentPage), totalPages) - 1) * PAGE_SIZE;
    setCursor(start);
  }, [currentPage, totalPages]);

  // ชุดที่แสดงในหน้านี้ (คงชื่อ windowed เดิม)
  const windowed = useMemo(() => {
    return deduped.slice(cursor, cursor + PAGE_SIZE);
  }, [deduped, cursor]);

  // ---------- Handlers ----------
  const handleYearChange = (yearId) => {
    setSelectedYear(yearId);
    setCurrentPage(1);
    setCursor(0);
    setFilters(prev => ({
      ...prev,
      category: '',
      subcategory: ''
    }));
  };

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
    setCursor(0);
  };

  const handleSearch = (searchTerm) => {
    setFilters(prev => ({ ...prev, search: searchTerm }));
    setCurrentPage(1);
    setCursor(0);
  };

  const handleSort = (column) => {
    const newOrder =
      filters.sort_by === column && filters.sort_order === 'asc'
        ? 'desc'
        : 'asc';
    setFilters(prev => ({ ...prev, sort_by: column, sort_order: newOrder }));
    setCurrentPage(1);
    setCursor(0);
  };

  const handlePrev = () => {
    setCurrentPage(p => Math.max(1, p - 1));
  };

  const handleNext = () => {
    setCurrentPage(p => Math.min(totalPages, p + 1));
  };

  const handleViewSubmission = (submissionId) => {
    // หาแถวที่คลิกจาก allSubmissions (โหลดไว้แล้วทั้งปี)
    const row = allSubmissions.find(
      (s) => String(s.submission_id) === String(submissionId)
    );
    // เผื่อไม่มีใน row ให้ลอง fallback จาก detailsMap ของแถวที่มองเห็น
    const dp = detailsMap[submissionId];
    const formType =
      (row?.form_type || row?.submission_type || dp?.details?.type || '')
        .toString()
        .toLowerCase();

    setSelectedFormType(formType);
    setSelectedSubmissionId(submissionId);
    setCurrentView('details');
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedSubmissionId(null);
    setSelectedFormType('');
    // We already have all data locally; no refetch needed
  };

  const handleOpenExportModal = () => {
    setPendingExportFilters({ ...filters });
    setIsExportModalOpen(true);
  };

  const handleCloseExportModal = () => {
    if (!exporting) {
      setIsExportModalOpen(false);
    }
  };

  const getSelectedYearInfo = useCallback(() => {
    if (!selectedYear) {
      return { year: 'ทั้งหมด', budget: 0, label: 'ทั้งหมด' };
    }

    const match = years.find((y) => String(y.year_id) === String(selectedYear));
    if (match) {
      const labelCandidate = normalizeYearValue(match);
      const label = labelCandidate || String(match.year ?? match.year_id ?? selectedYear);
      return { ...match, label };
    }

    const fallbackLabel = normalizeYearValue(selectedYear) || String(selectedYear);
    return { year: selectedYear, budget: 0, label: fallbackLabel };
  }, [selectedYear, years]);

  const selectedYearLabel = useMemo(() => {
    const info = getSelectedYearInfo();
    return info?.label || (selectedYear ? String(selectedYear) : 'ทั้งหมด');
  }, [getSelectedYearInfo, selectedYear]);

  const handleExportConfirm = useCallback(
    async (selectedFilters) => {
      setIsExportModalOpen(false);
      setExporting(true);

      try {
        const effectiveFilters = {
          ...filters,
          ...selectedFilters,
          sort_by: selectedFilters.sort_by || filters.sort_by,
          sort_order: selectedFilters.sort_order || filters.sort_order,
        };
        setPendingExportFilters(effectiveFilters);

        const rows = filterAndSortSubmissions(allSubmissions, effectiveFilters);
        if (!rows.length) {
          toast.error('ไม่พบข้อมูลตามตัวกรองที่เลือก');
          return;
        }

        const needDetails = rows.filter((s) => !detailsMap[s.submission_id]);
        let fetchedDetails = {};
        if (needDetails.length) {
          const results = await Promise.allSettled(
            needDetails.map((item) =>
              adminSubmissionAPI.getSubmissionDetails(item.submission_id)
            )
          );
          results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
              fetchedDetails[needDetails[index].submission_id] = result.value;
            }
          });

          if (Object.keys(fetchedDetails).length) {
            setDetailsMap((prev) => ({ ...prev, ...fetchedDetails }));
          }
        }

        const detailLookup = { ...detailsMap, ...fetchedDetails };
        const dataset = rows.map((row) => buildExportRow(row, detailLookup));

        const yearInfo = getSelectedYearInfo();
        const timestamp = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
        const filename = `submissions_${yearInfo.year || 'all'}_${timestamp}.xlsx`;
        downloadXlsx(EXPORT_COLUMNS, dataset, {
          sheetName: 'Submissions',
          filename,
        });
        toast.success(`ส่งออก ${dataset.length} รายการเรียบร้อยแล้ว`);
      } catch (error) {
        console.error('Error exporting submissions:', error);
        toast.error('ไม่สามารถ export ข้อมูลได้');
      } finally {
        setExporting(false);
      }
    },
    [
      filters,
      filterAndSortSubmissions,
      allSubmissions,
      detailsMap,
      buildExportRow,
      getSelectedYearInfo,
    ]
  );

  useEffect(() => {
    if (!autoExportRequested || loading) return;

    // แสดงหน้าต่างเลือกตัวกรองให้ผู้ใช้ก่อน ไม่ trigger download อัตโนมัติ
    setIsExportModalOpen(true);
    setAutoExportRequested(false);
  }, [autoExportRequested, loading]);

  // สร้างรายการปุ่มหน้า: [1, '...', 4, 5, 6, '...', total]
  const getPageItems = (current, total) => {
    const delta = 1; // จำนวนเพื่อนบ้านรอบ current
    const range = [];
    const rangeWithDots = [];
    let l;

    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
        range.push(i);
      }
    }

    for (const i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l > 2) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }
    return rangeWithDots;
  };


  // ---------- Views ----------
  if (currentView === 'details' && selectedSubmissionId) {
    const t = (selectedFormType || '').toLowerCase();
    if (t === 'publication_reward') {
      return (
        <PublicationSubmissionDetails
          submissionId={selectedSubmissionId}
          onBack={handleBackToList}
        />
      );
    }
    return (
      <GeneralSubmissionDetails
        submissionId={selectedSubmissionId}
        onBack={handleBackToList}
      />
    );
  }

  // ---------- List View ----------
  return (
    <PageLayout
      title="รายการการขอทุน"
      subtitle="บันทึกข้อมูลคำร้องขอทุนและจัดการคำร้องทั้งหมด"
      icon={FileText}
      breadcrumbs={[
        { label: "หน้าแรก", href: "/admin" },
        { label: "จัดการคำร้อง" }
      ]}
    >
      {/* Year Selector */}
      <div className="mb-6">
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <select
                value={selectedYear}
                onChange={(e) => handleYearChange(e.target.value)}
                className="block w-full sm:w-64 pl-3 pr-10 py-3 text-base border-2 border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg bg-white font-medium"
              >
                <option value="">ทุกปีงบประมาณ</option>
                {years.map((year) => (
                  <option key={year.year_id} value={year.year_id}>
                    ปีงบประมาณ {year.year} {year.is_current ? '(ปีปัจจุบัน)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-4 sm:mt-0">
              <button
                type="button"
                onClick={handleOpenExportModal}
                disabled={loading || exporting}
                className="inline-flex items-center px-4 py-2 rounded-lg border border-indigo-500 text-indigo-600 font-semibold bg-white hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed gap-2"
              >
                <Download className="h-5 w-5" />
                {exporting ? 'กำลังเตรียมไฟล์...' : 'ส่งออกเป็น Excel'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics (client-side over current year) */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5 mb-6">
        <StatCard label="คำร้องทั้งหมด" value={statistics.total_submissions} />
        <StatCard label="อยู่ระหว่างการพิจารณาจากหัวหน้าสาขา" value={statistics.dept_head_pending_count} color="text-amber-600" />
        <StatCard label="อยู่ระหว่างการพิจารณา" value={statistics.pending_count} color="text-yellow-600" />
        <StatCard label="อนุมัติแล้ว" value={statistics.approved_count} color="text-green-600" />
        <StatCard label="ไม่อนุมัติ" value={statistics.rejected_count} color="text-red-600" />
      </div>

      {/* Filters */}
      <div className="bg-white shadow-md rounded-lg border border-gray-200">
        <SubmissionFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onSearch={handleSearch}
          selectedYear={selectedYear}
        />

        {/* Table */}
        <SubmissionTable
          submissions={windowed}
          loading={loading}
          sortBy={filters.sort_by}
          sortOrder={filters.sort_order}
          onSort={handleSort}
          onView={handleViewSubmission}
          catMap={catMap}
          subMap={subMap}
          budgetMap={budgetMap}
          subBudgetDescMap={subBudgetDescMap}
          detailsMap={detailsMap}
          userMap={userMap}
        />

        {/* Simple Prev / Next controls (no page numbers) */}
        {!loading && (
          <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-b-lg">
            <div className="text-sm text-gray-700">
              แสดง <span className="font-medium">{filteredAndSorted.length === 0 ? 0 : cursor + 1}</span>{' '}
              ถึง{' '}
              <span className="font-medium">
                {Math.min(cursor + PAGE_SIZE , filteredAndSorted.length)}
              </span>{' '}
              จาก <span className="font-medium">{filteredAndSorted.length}</span> รายการ
            </div>

            <div className="space-x-2">
              <button
                onClick={handlePrev}
                disabled={cursor <= 0}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ◀ ก่อนหน้า
              </button>
              {/* page numbers with ellipses */}
              {getPageItems(currentPage, totalPages).map((it, idx) =>
                it === '...' ? (
                  <span key={`dots-${idx}`} className="px-2 text-gray-500 select-none">…</span>
                ) : (
                  <button
                    key={`p-${it}`}
                    onClick={() => setCurrentPage(it)}
                    className={
                      it === currentPage
                        ? 'inline-flex items-center px-3 py-2 border border-indigo-600 text-sm font-semibold rounded-md text-white bg-indigo-600'
                        : 'inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50'
                    }
                  >
                    {it}
                  </button>
                )
              )}
              <button
                onClick={handleNext}
                disabled={cursor + PAGE_SIZE  >= filteredAndSorted.length}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ถัดไป ▶
              </button>
            </div>
          </div>
        )}
      </div>

      <SubmissionExportModal
        open={isExportModalOpen}
        onClose={handleCloseExportModal}
        onConfirm={handleExportConfirm}
        initialFilters={pendingExportFilters}
        selectedYear={selectedYear}
        selectedYearLabel={selectedYearLabel}
        statuses={statuses}
        statusLoading={statusLoading}
        isExporting={exporting}
      />
    </PageLayout>
  );
}

// Small presentational helper
function StatCard({ label, value, color = 'text-gray-900' }) {
  return (
    <div className="bg-white overflow-hidden shadow-md rounded-lg border border-gray-200">
      <div className="px-4 py-5 sm:p-6">
        <dt className="text-sm font-medium text-gray-500 truncate">{label}</dt>
        <dd className={`mt-1 text-3xl font-semibold ${color}`}>{value}</dd>
      </div>
    </div>
  );
}