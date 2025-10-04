// app/admin/components/submissions/SubmissionsManagement.js
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { FileText } from 'lucide-react';
import PageLayout from '../common/PageLayout';
import SubmissionTable from './SubmissionTable';
import SubmissionFilters from './SubmissionFilters';
import PublicationSubmissionDetails from './PublicationSubmissionDetails';
import GeneralSubmissionDetails from './GeneralSubmissionDetails';
import { submissionsListingAPI, adminSubmissionAPI, commonAPI } from '../../../lib/admin_submission_api';
import { toast } from 'react-hot-toast';
import systemConfigAPI from '../../../lib/system_config_api';
import { useStatusMap } from '@/app/hooks/useStatusMap';

// ----------- CONFIG -----------
const PAGE_SIZE  = 10;        // how many rows to show at a time

export default function SubmissionsManagement() {
  const { getLabelById } = useStatusMap();
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

  // UI state
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState({
    total_submissions: 0,
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
          year_id: yearId || '',
          sort_by: 'created_at',
          sort_order: 'desc',
        };
        console.log('[FetchAll] /admin/submissions params:', params);

        const res = await submissionsListingAPI.getAdminSubmissions(params);
        if (reqId !== latestReq.current) return; // race protection

        const chunk = res?.submissions || res?.data || [];
        aggregate.push(...chunk);

        // stop if last page or no pagination info
        const totalPages = res?.pagination?.total_pages || 0;
        if (!chunk.length || totalPages <= page || !totalPages) done = true;
        page += 1;

        // safety cap
        if (aggregate.length > 10000) done = true;
      }

      // Client-side hard filter by year (belt & suspenders)
      const Y = String(yearId || '');
      const filteredByYear = Y
        ? aggregate.filter(s => String(s.year_id) === Y || String(s.Year?.year_id) === Y)
        : aggregate;

      console.log('[FetchAll] total fetched:', aggregate.length, 'after year filter:', filteredByYear.length);

      setAllSubmissions(filteredByYear);

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

      // Compute statistics on the client (count by status)
      const countBy = (id) => filteredByYear.filter(r => Number(r.status_id) === id).length;
      setStatistics({
        total_submissions: filteredByYear.length,
        pending_count: countBy(1),
        approved_count: countBy(2),
        rejected_count: countBy(3),
        revision_count: countBy(4),
      });
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
  const filteredAndSorted = useMemo(() => {
    let arr = allSubmissions;

    // filter by dropdowns
    if (filters.category) {
      arr = arr.filter(s => String(s.category_id) === String(filters.category));
    }
    if (filters.subcategory) {
      arr = arr.filter(s => String(s.subcategory_id) === String(filters.subcategory));
    }
    if (filters.status) {
      arr = arr.filter(s => String(s.status_id) === String(filters.status));
    }

    // --- SEARCH across key columns ---
    if (filters.search?.trim()) {
      const q = filters.search.trim().toLowerCase();

      const statusText = (sid) => getLabelById(sid) || '';

      const norm = (v) => (v ?? '').toString().toLowerCase();

      arr = arr.filter(s => {
        // submission_number
        const subno = norm(s.submission_number);

        // category / subcategory names via maps (with row fallbacks)
        const catName =
          s?.Category?.category_name ||
          (s?.category_id != null ? catMap[String(s.category_id)] : undefined) ||
          s?.category_name || '';

        // article title (row detail if present; detailsMap for visible rows; row title fallback)
        const dp = detailsMap[s.submission_id];
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

        // author display (userMap then row)
        const listAuthor =
          (s?.User?.user_fname && s?.User?.user_lname)
            ? `${s.User.user_fname} ${s.User.user_lname}`
            : (s?.User?.email || '');
        const authorFromMap = s?.user_id ? userMap[String(s.user_id)] : '';
        const author = authorFromMap || listAuthor || '';

        // amount as plain and formatted string
        const rawAmt = Number(
          (dpo?.total_amount ?? dpo?.total_reward_amount ?? dpo?.net_amount ??
           dpo?.requested_amount ?? dpo?.approved_amount ??
            ((dpo?.reward_amount || 0) + (dpo?.revision_fee || 0) + (dpo?.publication_fee || 0) - (dpo?.external_funding_amount || 0))) ||
          (s?.approved_amount ?? s?.requested_amount ?? s?.amount ?? 0)
        );
        const amtStr = isFinite(rawAmt) ? rawAmt.toString() : '';
        const amtFmt = isFinite(rawAmt) ? rawAmt.toLocaleString() : '';

        // status
        const statusStr = norm(s.display_status || s.status?.status_name || statusText(s.status_id));

        // date string
        const dateVal = s?.display_date || s?.submitted_at || s?.created_at ||  s?.approved_at || '';
        const dateStr = dateVal ? new Date(dateVal).toLocaleDateString('th-TH') : '';

        const fields = [
          subno,
          norm(catName),
          norm(subName),
          norm(article),
          norm(author),
          amtStr, amtFmt,
          statusStr,
          norm(dateStr),
        ];

        return fields.some(f => f && f.includes(q));
      });
    }

    // sort (client side)
    const order = (filters.sort_order || 'desc').toLowerCase();
    const sortBy = filters.sort_by || 'created_at';

    const val = (s) => {
      switch (sortBy) {
        case 'updated_at': return new Date(s.updated_at || s.update_at || 0).getTime();
        case 'submitted_at': return new Date(s.submitted_at || 0).getTime();
        case 'approved_at': return new Date(s.approved_at || 0).getTime();
        case 'submission_number': return (s.submission_number || '').toString();
        case 'status_id': return Number(s.status_id) || 0;
        case 'created_at':
        default: return new Date(s.created_at || s.create_at || 0).getTime();
      }
    };

    const arrCopy = [...arr].sort((a, b) => {
      const A = val(a), B = val(b);
      if (typeof A === 'string' || typeof B === 'string') {
        return order === 'asc' ? String(A).localeCompare(String(B)) : String(B).localeCompare(String(A));
      }
      return order === 'asc' ? A - B : B - A;
    });

    return arrCopy;
  // include maps and details so search updates when they arrive
  }, [allSubmissions, filters, catMap, subMap, userMap, detailsMap]);

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
    console.log('Year changed to:', yearId);
    setSelectedYear(yearId);
    setCurrentPage(1);
    setCursor(0);
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

  const handleExport = async (format) => {
    try {
      // You can export the currently filtered set
      toast.success(`เตรียมข้อมูล export เรียบร้อย (${filteredAndSorted.length} รายการ)`);
      // TODO: send filtered params or data to your backend exporter if needed
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('ไม่สามารถ export ข้อมูลได้');
    }
  };

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


  const getSelectedYearInfo = () => {
    if (!selectedYear) return { year: 'ทั้งหมด', budget: 0 };
    const y = years.find(y => String(y.year_id) === String(selectedYear));
    return y || { year: selectedYear, budget: 0 };
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
          </div>
        </div>
      </div>

      {/* Statistics (client-side over current year) */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label="คำร้องทั้งหมด" value={statistics.total_submissions} />
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
